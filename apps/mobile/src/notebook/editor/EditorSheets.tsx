import { useEffect, useState, type ComponentType } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  SquareCode,
} from 'lucide-react-native';
import { blockPlainText, type ConflictChoice, type MergeResult } from '@beyou/state';
import BottomSheet from '../../ui/BottomSheet';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import SegmentedControl from '../../ui/SegmentedControl';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { BlockChoice } from './editorBridge';

type IconType = ComponentType<{ size?: number; color?: string }>;

const CHOICES: { block: BlockChoice; label: string; Icon: IconType }[] = [
  { block: 'paragraph', label: 'NotebookMobileBlockText', Icon: Pilcrow },
  { block: 'heading1', label: 'NotebookMobileBlockHeading1', Icon: Heading1 },
  { block: 'heading2', label: 'NotebookMobileBlockHeading2', Icon: Heading2 },
  { block: 'heading3', label: 'NotebookMobileBlockHeading3', Icon: Heading3 },
  { block: 'bulletListItem', label: 'NotebookMobileBlockBullets', Icon: List },
  { block: 'numberedListItem', label: 'NotebookMobileBlockNumbers', Icon: ListOrdered },
  { block: 'checkListItem', label: 'NotebookMobileBlockChecklist', Icon: ListChecks },
  { block: 'quote', label: 'NotebookMobileBlockQuote', Icon: Quote },
  { block: 'codeBlock', label: 'NotebookMobileBlockCode', Icon: SquareCode },
  { block: 'divider', label: 'NotebookMobileBlockDivider', Icon: Minus },
];

/**
 * The blocks the editor makes from the toolbar. "+" puts a new one under the cursor; "Aa" turns
 * the block the cursor is in into another kind, so a divider, which holds no text, is not offered.
 */
export function BlockSheet({
  mode,
  current,
  onPick,
  onClose,
}: {
  mode: 'insert' | 'turnInto' | null;
  current: BlockChoice | 'other';
  onPick: (block: BlockChoice) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const choices = mode === 'turnInto' ? CHOICES.filter((choice) => choice.block !== 'divider') : CHOICES.slice(1);
  return (
    <BottomSheet visible={mode !== null} onClose={onClose}>
      <Text accessibilityRole="header" className="mb-2 text-[17px] font-bold text-text">
        {t(mode === 'turnInto' ? 'NotebookMobileEditorTurnInto' : 'NotebookMobileEditorInsert')}
      </Text>
      <ScrollView keyboardShouldPersistTaps="always">
        {choices.map(({ block, label, Icon }) => {
          const selected = mode === 'turnInto' && current === block;
          return (
            <Pressable
              key={block}
              onPress={() => onPick(block)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={`min-h-12 flex-row items-center gap-3 rounded-xl px-2 ${selected ? 'bg-accent-soft' : 'active:bg-surface-2'}`}
              testID={`editor-block-${block}`}
            >
              <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-surface-2">
                <Icon size={18} color={selected ? theme.accent : theme.text} />
              </View>
              <Text className={`text-[15px] ${selected ? 'font-semibold text-accent' : 'text-text'}`}>{t(label)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

/** An address for the selected text, or for a new link; empty takes the link off. */
export function LinkSheet({
  visible,
  current,
  onSave,
  onClose,
}: {
  visible: boolean;
  current: string | null;
  onSave: (url: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(current ?? '');
  useEffect(() => {
    if (visible) setUrl(current ?? '');
  }, [visible, current]);
  const address = url.trim();
  const valid = address === '' || /^(https?:\/\/|mailto:)\S+$/i.test(withScheme(address));
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-[17px] font-bold text-text">
          {t('NotebookMobileEditorLink')}
        </Text>
        <Input
          value={url}
          onChangeText={setUrl}
          placeholder="https://"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          autoFocus
          accessibilityLabel={t('NotebookMobileEditorLinkAddress')}
          error={valid ? undefined : t('NotebookMobileEditorLinkInvalid')}
          testID="editor-link-input"
        />
        <View className="flex-row gap-2">
          {current ? (
            <Button text={t('NotebookMobileEditorLinkRemove')} mode="danger" size="auto" onPress={() => onSave('')} testID="editor-link-remove" />
          ) : null}
          <View className="flex-1" />
          <Button
            text={t('NotebookSave')}
            mode="primary"
            size="auto"
            disabled={!valid || address === ''}
            onPress={() => onSave(withScheme(address))}
            testID="editor-link-save"
          />
        </View>
      </View>
    </BottomSheet>
  );
}

/** "beyouweb.com" reads as a site, not a path inside the editor. */
function withScheme(address: string): string {
  return /^[a-z][a-z0-9+.-]*:/i.test(address) ? address : `https://${address}`;
}

/**
 * Blocks changed both here and somewhere else since the editor last saved. Everything else is
 * already merged; nothing here is saved over the other side until the person picks. One block
 * gets the three choices as buttons; more get one choice each and a single Apply.
 */
export function ConflictSheet({
  conflict,
  onResolve,
}: {
  conflict: MergeResult | null;
  onResolve: (choices: Record<string, ConflictChoice>) => void;
}) {
  const { t } = useTranslation();
  const [choices, setChoices] = useState<Record<string, ConflictChoice>>({});
  useEffect(() => setChoices({}), [conflict]);
  if (!conflict) return null;
  const single = conflict.conflicts.length === 1 ? conflict.conflicts[0] : null;
  // Closing the sheet keeps both versions: the one choice that loses nothing.
  const keepAll = () => onResolve(Object.fromEntries(conflict.conflicts.map((c) => [c.id, 'both' as const])));

  return (
    <BottomSheet visible onClose={keepAll}>
      <View className="gap-3" testID="conflict-sheet">
        <View className="gap-1.5">
          <Text accessibilityRole="header" className="text-[19px] font-bold text-text">
            {t('NotebookConflictTitle')}
          </Text>
          <Text className="text-[14px] leading-5 text-text-2">{t('NotebookConflictIntro')}</Text>
        </View>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 12 }}>
          {conflict.conflicts.map((item) => (
            <View key={item.id} className="gap-2">
              <View className="overflow-hidden rounded-[14px] border border-border">
                <Side label={t('NotebookConflictHere')} text={item.mine ? blockPlainText(item.mine) : null} tone="here" />
                <Side label={t('NotebookConflictThere')} text={item.theirs ? blockPlainText(item.theirs) : null} tone="there" />
              </View>
              {single ? null : (
                <SegmentedControl<ConflictChoice>
                  label={t('NotebookConflictTitle')}
                  size="sm"
                  options={[
                    { value: 'both', label: t('NotebookConflictKeepBoth') },
                    { value: 'mine', label: t('NotebookConflictKeepMine') },
                    { value: 'theirs', label: t('NotebookConflictKeepTheirs') },
                  ]}
                  value={choices[item.id] ?? 'both'}
                  onChange={(choice) => setChoices((all) => ({ ...all, [item.id]: choice }))}
                />
              )}
            </View>
          ))}
        </ScrollView>
        {single ? (
          <View className="gap-2">
            <Button text={t('NotebookConflictKeepBoth')} mode="primary" size="block" onPress={() => onResolve({ [single.id]: 'both' })} testID="conflict-both" />
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button text={t('NotebookConflictKeepMine')} mode="default" size="block" onPress={() => onResolve({ [single.id]: 'mine' })} testID="conflict-mine" />
              </View>
              <View className="flex-1">
                <Button text={t('NotebookConflictKeepTheirs')} mode="default" size="block" onPress={() => onResolve({ [single.id]: 'theirs' })} testID="conflict-theirs" />
              </View>
            </View>
          </View>
        ) : (
          <Button
            text={t('NotebookConflictApply')}
            mode="primary"
            size="block"
            onPress={() => onResolve(Object.fromEntries(conflict.conflicts.map((c) => [c.id, choices[c.id] ?? 'both'])))}
            testID="conflict-apply"
          />
        )}
      </View>
    </BottomSheet>
  );
}

function Side({ label, text, tone }: { label: string; text: string | null; tone: 'here' | 'there' }) {
  const { t } = useTranslation();
  return (
    <View className={`gap-1 px-3 py-2.5 ${tone === 'there' ? 'bg-bg' : 'border-b border-border'}`}>
      <Text className={`font-mono text-[11px] tracking-wide ${tone === 'here' ? 'text-accent' : 'text-text-2'}`}>
        {label.toUpperCase()}
      </Text>
      <Text className="text-[14px] leading-5 text-text" numberOfLines={6}>
        {text === null ? t('NotebookConflictRemoved') : text || '·'}
      </Text>
    </View>
  );
}
