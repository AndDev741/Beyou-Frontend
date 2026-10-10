import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { saveStudySetup } from '@beyou/api/notebook';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import type { StudyScope, StudyScopeOption, StudySetup } from '@beyou/types/notebook/notebook';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { notify } from '../../notify';

export const SCOPE_KEYS: Record<StudyScope, { title: string; detail: string }> = {
  PAGE: { title: 'NotebookScopePage', detail: 'NotebookScopePageDetail' },
  SUBTREE: { title: 'NotebookScopeSubtree', detail: 'NotebookScopeSubtreeDetail' },
  TOPIC: { title: 'NotebookScopeTopic', detail: 'NotebookScopeTopicDetail' },
};

/**
 * The study room's setup, as on the web: what the person wants out of this page, and whose notes
 * the AI reads. Shown before the first question and from "Edit setup"; sources are added from
 * their own tab.
 */
export default function StudySetupForm({
  pageId,
  setup,
  scopes,
  firstTime,
  onSaved,
  onCancel,
}: {
  pageId: string;
  setup: StudySetup;
  scopes: StudyScopeOption[];
  firstTime: boolean;
  onSaved: (setup: StudySetup) => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const [goal, setGoal] = useState(setup.goal ?? '');
  const [scope, setScope] = useState<StudyScope>(setup.scope);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const response = await saveStudySetup(pageId, { goal: goal.trim(), scope }, t);
    setSaving(false);
    if (!response.success) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    onSaved(response.success);
  };

  return (
    <View className="gap-4" testID="study-setup">
      <View className="gap-1">
        <Text accessibilityRole="header" className="text-[18px] font-bold text-text">
          {t('NotebookSetupTitle')}
        </Text>
        <Text className="text-[13px] leading-[18px] text-text-2">{t('NotebookSetupIntro')}</Text>
      </View>

      <View className="gap-1.5">
        <Text className="text-[13px] font-semibold text-text">{t('NotebookSetupGoal')}</Text>
        <Input
          value={goal}
          onChangeText={setGoal}
          maxLength={300}
          placeholder={t('NotebookSetupGoalPlaceholder')}
          accessibilityLabel={t('NotebookSetupGoal')}
          testID="study-setup-goal"
        />
        <Text className="text-[12px] text-text-2">{t('NotebookSetupGoalHint')}</Text>
      </View>

      <View className="gap-2" accessibilityRole="radiogroup">
        <Text className="text-[13px] font-semibold text-text">{t('NotebookSetupScope')}</Text>
        {scopes.map((option) => {
          const chosen = scope === option.scope;
          return (
            <Pressable
              key={option.scope}
              onPress={() => setScope(option.scope)}
              accessibilityRole="radio"
              accessibilityState={{ checked: chosen }}
              className={`gap-0.5 rounded-xl border px-3 py-2.5 ${chosen ? 'border-accent bg-accent-soft' : 'border-border bg-surface'}`}
              testID={`study-setup-scope-${option.scope}`}
            >
              <Text className="text-[14px] font-semibold text-text">{t(SCOPE_KEYS[option.scope].title)}</Text>
              <Text className="text-[12px] text-text-2">{t(SCOPE_KEYS[option.scope].detail)}</Text>
              <Text className="font-mono text-[11px] text-text-2">
                {t('NotebookSetupScopeCount', { count: option.pages, words: option.words.toLocaleString() })}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row justify-end gap-2">
        {onCancel ? <Button text={t('Cancel')} mode="ghost" size="auto" onPress={onCancel} /> : null}
        <Button
          text={firstTime ? t('NotebookSetupStart') : t('NotebookSetupSave')}
          mode="primary"
          size="auto"
          submitting={saving}
          onPress={() => void save()}
          testID="study-setup-save"
        />
      </View>
    </View>
  );
}
