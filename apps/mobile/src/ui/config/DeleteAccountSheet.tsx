import { useState } from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import requestAccountDeletionCode from '@beyou/api/user/requestAccountDeletionCode';
import deleteAccount from '@beyou/api/user/deleteAccount';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import Button from '../Button';
import Input from '../Input';
import { useKeyboardLift } from '../keyboard';
import { notify } from '../../notify';
import { logout } from '../../auth/authSlice';
import type { AppDispatch, RootState } from '../../store';

type Step = 'confirm' | 'code' | 'goodbye';

/**
 * The four refusals that mean the account is still there and the code was the problem.
 *
 * Three outcome classes, not two. These four say the code was wrong. FAILED_BUT_INTACT
 * says the deletion itself rolled back. Anything else — a dropped connection, a request
 * the OS killed when the app went to the background — says nothing about whether the
 * deletion happened, so the app has to assume it did.
 */
const CODE_ERROR_KEYS = new Set([
  'DELETION_CODE_INVALID',
  'DELETION_CODE_EXPIRED',
  'DELETION_CODE_TOO_MANY_ATTEMPTS',
  'DELETION_CODE_TOO_MANY_REQUESTS',
]);

/**
 * The deletion ran and rolled back: the account exists, the code was not spent, and
 * the session is still good, because the backend revokes the refresh token only after
 * a delete that actually happened. Leaving here would be worse on a phone than on the
 * web — `leave()` dispatches logout, which revokes that refresh token server-side, so
 * the app would sign someone out of an account that is perfectly alive.
 */
const FAILED_BUT_INTACT = 'ACCOUNT_DELETE_FAILED';

interface DeleteAccountSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Deleting an account, in three deliberate steps — mirror of the web modal: say it
 * out loud, prove the inbox is yours, then say goodbye.
 *
 * The code is only spent on the last press. No endpoint checks a code without also
 * deleting the account (one that did would be a free oracle for guessing), so a
 * wrong code surfaces at the end and drops back to the code step with the reason.
 */
export default function DeleteAccountSheet({ visible, onClose }: DeleteAccountSheetProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const email = useSelector((s: RootState) => s.perfil.email);
  // The code step's field is the one the keyboard is for. A Modal is its own
  // window and Android stopped resizing it under the edge-to-edge layout. See
  // `useKeyboardLift`.
  const { lift, onLayout } = useKeyboardLift();
  const [step, setStep] = useState<Step>('confirm');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);

  // The `!visible` null-gate is what keeps RN's Modal out of the tree in tests.
  // Reopening starts from the beginning because DangerZoneSection mounts this only
  // while it is open, so there is no previous state left to come back to.
  if (!visible) return null;

  const askForCode = async (resending = false) => {
    setPending(true);
    // A new code supersedes the old one server-side, so the digits still in the field
    // no longer work — and leaving them there lets someone walk all the way to the
    // irreversible button before finding that out.
    if (resending) {
      setCode('');
    }
    const response = await requestAccountDeletionCode();
    setPending(false);
    if (response.error) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      // The cooldown means a code went out moments ago and is in the inbox right now.
      // Stopping here would leave the user holding a working code with nowhere to
      // type it — the likeliest way to hit this is closing the sheet to go read the
      // email and coming straight back.
      if (response.error.errorKey === 'DELETION_CODE_TOO_MANY_REQUESTS') {
        setStep('code');
      }
      return;
    }
    if (resending) {
      notify.success(t('DeleteAccountCodeSent'));
    }
    setStep('code');
  };

  const leave = async () => {
    // Awaited, not fired and forgotten: logout clears the refresh token from secure
    // store, the tutorial phase and the AI wizard's progress before it resets the
    // slices. Closing the sheet first races the navigation against that teardown, and
    // a rejected thunk would leave the app authenticated against an account that no
    // longer exists.
    await dispatch(logout());
    onClose();
  };

  const confirmDeletion = async () => {
    setPending(true);
    const response = await deleteAccount(code.trim());
    if (response.error) {
      const errorKey = response.error.errorKey ?? '';

      if (errorKey === FAILED_BUT_INTACT) {
        // Stay on the goodbye step: the code is still live, so pressing the button
        // again is the whole recovery.
        setPending(false);
        notify.error(getFriendlyErrorMessage(t, response.error));
        return;
      }

      if (CODE_ERROR_KEYS.has(errorKey)) {
        setPending(false);
        notify.error(getFriendlyErrorMessage(t, response.error));
        setStep('code');
        return;
      }
      // Not about the code, so the account may already be gone — the response can be
      // lost on the way back from a server that already committed. Asking the user to
      // type the code again would be asking them to delete an account that no longer
      // exists, on a device still holding its data.
      notify.error(t('DeleteAccountUnclear'));
      await leave();
      return;
    }
    notify.success(t('DeleteAccountDone'));
    // The account is gone; logout resets every slice and sends the app back to the
    // login screen, which is exactly the state this should end in.
    await leave();
  };

  const isCodeComplete = /^\d{6}$/.test(code.trim());

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      // Android's hardware back, while the irreversible request is out. It does not
      // cancel anything, so honouring it would only hide a deletion that carries on.
      onRequestClose={pending ? () => {} : onClose}
      testID="delete-account-sheet"
    >
      {/* Centred, so giving up the bottom re-centres the dialog in what is left
          above the keyboard, with the six-digit field and Continue inside it. */}
      <View
        className="flex-1 items-center justify-center px-6"
        onLayout={onLayout}
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', paddingBottom: lift }}
        testID="delete-account-keyboard-avoider"
      >
        <View className="w-full max-w-[420px] rounded-card border border-border bg-surface p-5">
          {step === 'confirm' ? (
            <>
              <Text accessibilityRole="header" className="text-[15px] font-semibold text-text">
                {t('DeleteAccountStep1Title')}
              </Text>
              <Text className="mt-1.5 text-[12.5px] leading-snug text-text-2">
                {t('DeleteAccountStep1Body')}
              </Text>
              {/* Both labels fit beside each other on a normal phone, and wrap
                  keeps the narrow ones honest: the second button drops to its own
                  line instead of shoving Cancel past the left edge. */}
              <View className="mt-4 flex-row flex-wrap justify-end gap-2">
                <Button text={t('Cancel')} mode="ghost" size="auto" onPress={onClose} />
                <Button
                  text={t('DeleteAccountStep1Confirm')}
                  mode="danger"
                  size="auto"
                  disabled={pending}
                  onPress={() => void askForCode()}
                  testID="delete-account-continue"
                />
              </View>
            </>
          ) : null}

          {step === 'code' ? (
            <>
              <Text accessibilityRole="header" className="text-[15px] font-semibold text-text">
                {t('DeleteAccountStep2Title')}
              </Text>
              <Text className="mt-1.5 text-[12.5px] leading-snug text-text-2">
                {/* perfil.email is filled by the dashboard's loader, not by auth
                    bootstrap, so a route straight to configuration can reach here with
                    nothing — and this sentence is the only place the user is told which
                    inbox to open. */}
                {email
                  ? t('DeleteAccountStep2Body', { email })
                  : t('DeleteAccountStep2BodyNoEmail')}
              </Text>

              <View className="mt-4">
                <Input
                  label={t('DeleteAccountCodeLabel')}
                  value={code}
                  onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="numeric"
                  compact
                  accessibilityLabel={t('DeleteAccountCodeLabel')}
                  testID="delete-account-code"
                />
              </View>

              <Pressable
                onPress={() => void askForCode(true)}
                disabled={pending}
                accessibilityRole="button"
                testID="delete-account-resend"
                className="mt-2 self-start"
              >
                <Text className="text-[12px] font-semibold text-accent">{t('DeleteAccountResend')}</Text>
              </Pressable>

              {/* Wrap for the same reason as step 1: overflow here would take
                  Cancel off the screen, not the button that caused it. */}
              <View className="mt-4 flex-row flex-wrap justify-end gap-2">
                <Button text={t('Cancel')} mode="ghost" size="auto" onPress={onClose} />
                <Button
                  text={t('Continue')}
                  mode="danger"
                  size="auto"
                  disabled={!isCodeComplete || pending}
                  onPress={() => setStep('goodbye')}
                  testID="delete-account-code-continue"
                />
              </View>
            </>
          ) : null}

          {step === 'goodbye' ? (
            <>
              <View className="items-center">
                <Text className="text-[34px]">🥺</Text>
                <Text accessibilityRole="header" className="mt-1 text-[15px] font-semibold text-text">
                  {t('DeleteAccountStep3Title')}
                </Text>
                <Text className="mt-1.5 text-center text-[12.5px] leading-snug text-text-2">
                  {t('DeleteAccountStep3Body')}
                </Text>
              </View>
              {/* Stacked, unlike the two steps before it. This label is a whole
                  sentence, so side by side it grew past the dialog and pushed
                  Cancel off the left edge of the screen: on a phone the way out
                  was the part that went missing. Full width also puts the quiet
                  action under the thumb, below the irreversible one. */}
              <View className="mt-4 gap-2">
                <Button
                  text={t('DeleteAccountFinalConfirm')}
                  mode="danger"
                  size="block"
                  submitting={pending}
                  disabled={pending}
                  onPress={() => void confirmDeletion()}
                  testID="delete-account-final"
                />
                <Button
                  text={t('Cancel')}
                  mode="ghost"
                  size="block"
                  disabled={pending}
                  onPress={onClose}
                  testID="delete-account-final-cancel"
                />
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
