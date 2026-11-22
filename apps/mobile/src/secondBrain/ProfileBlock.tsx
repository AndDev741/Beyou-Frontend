import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react-native';
import { SECOND_BRAIN_FACT_TITLE, secondBrainFactOriginLabel } from '@beyou/state';
import {
  SECOND_BRAIN_FACT_KINDS,
  SECOND_BRAIN_FACT_LIMIT,
  SECOND_BRAIN_FACT_TEXT_MAX,
  type SecondBrainFact,
  type SecondBrainFactInput,
  type SecondBrainFactKind,
} from '@beyou/types/secondBrain/secondBrain';
import GhostAdd from '../ui/GhostAdd';
import IconButton from '../ui/IconButton';
import { useBeyouTheme } from '../theme/ThemeProvider';
import Block from './Block';
import LineForm from './LineForm';

type ProfileBlockProps = {
  facts: SecondBrainFact[];
  /** Each resolves true when the server kept the change. On false the caller has toasted. */
  onCreate: (input: SecondBrainFactInput) => Promise<boolean>;
  onEdit: (id: string, input: SecondBrainFactInput) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};

/** Which line is being written: a new one under a heading, or an existing one. */
type Editing = { mode: 'new'; kind: SecondBrainFactKind } | { mode: 'edit'; fact: SecondBrainFact };

/**
 * Where a line came from, under it: an answer, the assistant, the old note. A line the
 * person typed says nothing, since that is what a profile line is by default.
 */
function FactOrigin({ origin }: { origin: SecondBrainFact['origin'] }) {
  const { t } = useTranslation();
  const key = secondBrainFactOriginLabel(origin);
  if (!key) return null;
  return (
    <Text className="mt-0.5 text-[11.5px] text-text-3" testID="second-brain-fact-origin">
      {t(key)}
    </Text>
  );
}

/**
 * The general layer: the few lines every conversation starts from.
 *
 * It is short by design. These lines go out with every chat, so each one costs something on
 * every message, and a profile that tries to hold everything stops being read. The server
 * caps it; the count in the corner shows how much room is left.
 */
export default function ProfileBlock({ facts, onCreate, onEdit, onDelete }: ProfileBlockProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const full = facts.length >= SECOND_BRAIN_FACT_LIMIT;

  const remove = async (id: string) => {
    setRemoving(id);
    await onDelete(id);
    setRemoving(null);
  };

  return (
    <Block
      title={t('SecondBrainProfileTitle')}
      hint={t('SecondBrainProfileHint')}
      testID="second-brain-profile"
      action={
        <Text className="font-mono text-xs text-text-2" testID="second-brain-fact-count">
          {facts.length}/{SECOND_BRAIN_FACT_LIMIT}
        </Text>
      }
    >
      <View className="gap-5">
        {SECOND_BRAIN_FACT_KINDS.map((kind) => {
          const lines = facts.filter((fact) => fact.kind === kind);
          const adding = editing?.mode === 'new' && editing.kind === kind;
          return (
            <View key={kind} testID={`second-brain-facts-${kind}`}>
              <Text accessibilityRole="header" className="text-[13px] font-semibold text-text-2">
                {t(SECOND_BRAIN_FACT_TITLE[kind])}
              </Text>

              {lines.length === 0 && !adding ? (
                <Text className="mt-2 text-[13px] text-text-3">{t('SecondBrainFactEmpty')}</Text>
              ) : null}

              {lines.length > 0 ? (
                <View className="mt-1.5">
                  {lines.map((fact) =>
                    editing?.mode === 'edit' && editing.fact.id === fact.id ? (
                      <View key={fact.id} className="py-1.5">
                        <LineForm
                          initial={fact.text}
                          label={t('SecondBrainFactEditLabel')}
                          maxLength={SECOND_BRAIN_FACT_TEXT_MAX}
                          formTestID="second-brain-fact-form"
                          inputTestID="second-brain-fact-input"
                          saveTestID="second-brain-fact-save"
                          cancelTestID="second-brain-fact-cancel"
                          onCancel={() => setEditing(null)}
                          onSave={async (text) => {
                            const ok = await onEdit(fact.id, { kind: fact.kind, text });
                            if (ok) setEditing(null);
                            return ok;
                          }}
                        />
                      </View>
                    ) : (
                      <View key={fact.id} className="flex-row items-start gap-1 py-1.5" testID="second-brain-fact">
                        <View className="min-w-0 flex-1 pt-1">
                          <Text className="text-sm leading-5 text-text">{fact.text}</Text>
                          <FactOrigin origin={fact.origin} />
                        </View>
                        <IconButton
                          label={t('Edit')}
                          onPress={() => setEditing({ mode: 'edit', fact })}
                          testID={`second-brain-fact-edit-${fact.id}`}
                        >
                          <Pencil size={15} color={theme.text3} />
                        </IconButton>
                        <IconButton
                          label={t('Delete')}
                          tone="danger"
                          disabled={removing === fact.id}
                          onPress={() => void remove(fact.id)}
                          testID={`second-brain-fact-delete-${fact.id}`}
                        >
                          <Trash2 size={15} color={theme.text3} />
                        </IconButton>
                      </View>
                    ),
                  )}
                </View>
              ) : null}

              {adding ? (
                <View className="mt-2">
                  <LineForm
                    initial=""
                    label={t('SecondBrainFactNewLabel')}
                    maxLength={SECOND_BRAIN_FACT_TEXT_MAX}
                    formTestID="second-brain-fact-form"
                    inputTestID="second-brain-fact-input"
                    saveTestID="second-brain-fact-save"
                    cancelTestID="second-brain-fact-cancel"
                    onCancel={() => setEditing(null)}
                    onSave={async (text) => {
                      const ok = await onCreate({ kind, text });
                      if (ok) setEditing(null);
                      return ok;
                    }}
                  />
                </View>
              ) : !full ? (
                <GhostAdd
                  label={t('SecondBrainFactAdd')}
                  onPress={() => setEditing({ mode: 'new', kind })}
                  className="mt-2"
                  testID={`second-brain-fact-add-${kind}`}
                />
              ) : null}
            </View>
          );
        })}
      </View>
      {full ? (
        <Text className="mt-5 text-[13px] leading-[18px] text-text-2" testID="second-brain-fact-limit">
          {t('SECOND_BRAIN_FACT_LIMIT_REACHED')}
        </Text>
      ) : null}
    </Block>
  );
}
