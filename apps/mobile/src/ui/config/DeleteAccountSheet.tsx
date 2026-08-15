import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import requestAccountDeletionCode from '@beyou/api/user/requestAccountDeletionCode';
import deleteAccount from '@beyou/api/user/deleteAccount';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import Button from '../Button';
import Input from '../Input';
import { notify } from '../../notify';
import { logout } from '../../auth/authSlice';
import type { AppDispatch, RootState } from '../../store';

type Step = 'confirm' | 'code' | 'goodbye';

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
  const [step, setStep] = useState<Step>('confirm');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);

  // Every opening starts at the beginning: a half-finished deletion is not a state
  // to come back to.
  useEffect(() => {
    if (visible) {
      setStep('confirm');
      setCode('');
      setPending(false);
    }
  }, [visible]);

  // The `!visible` null-gate is what keeps RN's Modal out of the tree in tests.
  if (!visible) return null;

  const askForCode = async (resending = false) => {
    setPending(true);
    const response = await requestAccountDeletionCode();
    setPending(false);
    if (response.error) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    if (resending) {
      notify.success(t('DeleteAccountCodeSent'));
    }
    setStep('code');
  };

  const confirmDeletion = async () => {
    setPending(true);
    const response = await deleteAccount(code.trim());
    if (response.error) {
      setPending(false);
      notify.error(getFriendlyErrorMessage(t, response.error));
      setStep('code');
      return;
    }
    notify.success(t('DeleteAccountDone'));
    // The account is gone; logout resets every slice and sends the app back to the
    // login screen, which is exactly the state this should end in.
    dispatch(logout());
    onClose();
  };

  const isCodeComplete = /^\d{6}$/.test(code.trim());

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} testID="delete-account-sheet">
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
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
              <View className="mt-4 flex-row justify-end gap-2">
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
                {t('DeleteAccountStep2Body', { email: email ?? '' })}
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

              <View className="mt-4 flex-row justify-end gap-2">
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
              <View className="mt-4 flex-row justify-end gap-2">
                <Button text={t('Cancel')} mode="ghost" size="auto" onPress={onClose} />
                <Button
                  text={t('DeleteAccountFinalConfirm')}
                  mode="danger"
                  size="auto"
                  submitting={pending}
                  disabled={pending}
                  onPress={() => void confirmDeletion()}
                  testID="delete-account-final"
                />
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
