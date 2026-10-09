import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Bold,
  Code,
  ListIndentDecrease,
  ListIndentIncrease,
  Italic,
  KeyboardOff,
  Link,
  List,
  ListChecks,
  Plus,
  Undo2,
} from 'lucide-react-native';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import type { BlockChoice, EditorCommand, EditorFormat } from './editorBridge';

type Props = {
  format: EditorFormat;
  onCommand: (command: EditorCommand) => void;
  onInsert: () => void;
  onTurnInto: () => void;
  onLink: () => void;
};

/**
 * The formatting row under the editor, above the keyboard. Its taps go to the editor as commands;
 * the buttons that apply where the cursor sits are lit from what the editor reports.
 */
export default function EditorToolbar({ format, onCommand, onInsert, onTurnInto, onLink }: Props) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const tint = (on: boolean) => (on ? theme.accent : theme.text);
  const toggleBlock = (block: BlockChoice) => onCommand({ kind: 'turnInto', block });

  return (
    <View className="flex-row items-center border-t border-border bg-surface px-2 py-1.5" testID="editor-toolbar">
      <Pressable
        onPress={onInsert}
        accessibilityRole="button"
        accessibilityLabel={t('NotebookMobileEditorInsert')}
        className="mr-1 h-10 w-11 items-center justify-center rounded-[10px] bg-accent"
        testID="editor-insert"
      >
        <Plus size={18} color={theme.onAccent} />
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" className="flex-1">
        <ToolButton label={t('NotebookMobileEditorTurnInto')} onPress={onTurnInto} testID="editor-turn-into">
          <Text style={{ color: theme.text, fontFamily: 'GeistSemiBold', fontSize: 15 }}>Aa</Text>
        </ToolButton>
        <ToolButton label={t('NotebookMobileEditorBold')} active={format.styles.bold} onPress={() => onCommand({ kind: 'style', style: 'bold' })} testID="editor-bold">
          <Bold size={18} color={tint(format.styles.bold)} />
        </ToolButton>
        <ToolButton label={t('NotebookMobileEditorItalic')} active={format.styles.italic} onPress={() => onCommand({ kind: 'style', style: 'italic' })} testID="editor-italic">
          <Italic size={18} color={tint(format.styles.italic)} />
        </ToolButton>
        <ToolButton label={t('NotebookMobileEditorLink')} active={!!format.link} onPress={onLink} testID="editor-link">
          <Link size={18} color={tint(!!format.link)} />
        </ToolButton>
        <ToolButton label={t('NotebookMobileEditorList')} active={format.block === 'bulletListItem'} onPress={() => toggleBlock('bulletListItem')} testID="editor-list">
          <List size={18} color={tint(format.block === 'bulletListItem')} />
        </ToolButton>
        <ToolButton label={t('NotebookMobileEditorChecklist')} active={format.block === 'checkListItem'} onPress={() => toggleBlock('checkListItem')} testID="editor-checklist">
          <ListChecks size={18} color={tint(format.block === 'checkListItem')} />
        </ToolButton>
        <ToolButton label={t('NotebookMobileEditorCode')} active={format.styles.code} onPress={() => onCommand({ kind: 'style', style: 'code' })} testID="editor-code">
          <Code size={18} color={tint(format.styles.code)} />
        </ToolButton>
        {format.canIndent ? (
          <ToolButton label={t('NotebookMobileEditorIndent')} onPress={() => onCommand({ kind: 'indent' })} testID="editor-indent">
            <ListIndentIncrease size={18} color={theme.text} />
          </ToolButton>
        ) : null}
        {format.canOutdent ? (
          <ToolButton label={t('NotebookMobileEditorOutdent')} onPress={() => onCommand({ kind: 'outdent' })} testID="editor-outdent">
            <ListIndentDecrease size={18} color={theme.text} />
          </ToolButton>
        ) : null}
        <ToolButton label={t('NotebookMobileEditorUndo')} onPress={() => onCommand({ kind: 'undo' })} testID="editor-undo">
          <Undo2 size={18} color={theme.text} />
        </ToolButton>
      </ScrollView>
      <ToolButton label={t('NotebookMobileEditorHideKeyboard')} onPress={() => onCommand({ kind: 'dismiss' })} testID="editor-dismiss">
        <KeyboardOff size={18} color={theme.text2} />
      </ToolButton>
    </View>
  );
}

function ToolButton({
  label,
  active = false,
  onPress,
  children,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  children: ReactNode;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      className={`h-10 w-10 items-center justify-center rounded-[10px] ${active ? 'bg-accent-soft' : ''}`}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}
