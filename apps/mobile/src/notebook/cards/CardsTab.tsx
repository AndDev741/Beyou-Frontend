import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronRight, Layers, Plus, Sparkles } from 'lucide-react-native';
import { createCard, deleteCard, generateCards, getPageCards, updateCard } from '@beyou/api/notebook';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { MAX_CARD_SIDE_LENGTH, type Flashcard } from '@beyou/types/notebook/notebook';
import BottomSheet from '../../ui/BottomSheet';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import DeleteModal from '../../ui/DeleteModal';
import EmptyState from '../../ui/EmptyState';
import Input from '../../ui/Input';
import useTodayInZone from '../../ui/useTodayInZone';
import { notify } from '../../notify';
import { useBeyouTheme } from '../../theme/ThemeProvider';

/**
 * A page's flashcards on the phone, the web's cards block as a tab: how many are due today with
 * the review a tap away, "Draft with AI" (the study AI reads the page and its sources and saves
 * what it writes), "Write one", and the deck. Each card shows its question; the answer opens
 * under it on a tap, the way a card is read, with Edit and Delete there.
 *
 * `cardsTotal` is the page's count as the store has it: the assistant can draft cards from the
 * chat, and a new count reads the deck again.
 */
export default function CardsTab({
  pageId,
  cardsTotal,
  onChanged,
}: {
  pageId: string;
  cardsTotal: number;
  /** The deck changed: the screen reads the page again, so its counts follow. */
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useBeyouTheme();
  const today = useTodayInZone();
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Flashcard | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Flashcard | null>(null);
  const [drafting, setDrafting] = useState(false);

  const load = useCallback(async () => {
    const response = await getPageCards(pageId, t);
    if (response.success) setCards(response.success);
    else notify.error(getFriendlyErrorMessage(t, response.error));
  }, [pageId, t]);

  useEffect(() => {
    void load();
  }, [load, cardsTotal]);

  const changed = async () => {
    await load();
    onChanged();
  };

  const draft = async () => {
    if (drafting) return;
    setDrafting(true);
    const response = await generateCards(pageId, { count: 5 }, t);
    setDrafting(false);
    if (!response.success) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    notify.success(t('NotebookCardsDrafted', { count: response.success.length }));
    await changed();
  };

  const remove = async () => {
    if (!deleting) return;
    const response = await deleteCard(deleting.id, t);
    if (response.error) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    setDeleting(null);
    await changed();
  };

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!cards) {
    return (
      <View className="items-center py-8">
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  const due = cards.filter((card) => card.dueOn <= today).length;

  return (
    <View className="gap-2.5" testID="notebook-cards">
      {cards.length > 0 ? (
        <Card className="flex-row items-center gap-3" testID="notebook-cards-summary">
          <View className="min-w-0 flex-1">
            <Text className="text-[16px] font-bold text-text">
              {due > 0 ? t('NotebookMobileCardsDueToday', { count: due }) : t('NotebookMobileCardsNoneDue')}
            </Text>
            <Text className="text-[12.5px] text-text-2">{t('NotebookMobileCardsOnPage', { count: cards.length })}</Text>
          </View>
          {due > 0 ? (
            <Button
              text={t('NotebookMobileReview')}
              mode="primary"
              size="auto"
              onPress={() => router.push({ pathname: '/notebook-review', params: { scope: pageId } })}
              testID="notebook-cards-review"
            />
          ) : null}
        </Card>
      ) : null}

      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            text={drafting ? t('NotebookCardsDrafting') : t('NotebookCardsDraftAi')}
            mode="tonal"
            size="block"
            submitting={drafting}
            icon={<Sparkles size={15} color={theme.accent} />}
            onPress={() => void draft()}
            testID="notebook-cards-draft"
          />
        </View>
        <View className="flex-1">
          <Button
            text={t('NotebookCardsWrite')}
            mode="default"
            size="block"
            icon={<Plus size={15} color={theme.text} />}
            onPress={() => setEditing('new')}
            testID="notebook-cards-write"
          />
        </View>
      </View>

      {cards.length === 0 ? (
        <EmptyState
          icon={<Layers size={22} color={theme.xp} />}
          title={t('NotebookMobileCardsEmptyTitle')}
          description={t('NotebookMobileCardsEmptyBody')}
          testID="notebook-cards-empty"
        />
      ) : (
        <View className="overflow-hidden rounded-card border border-border bg-surface">
          {cards.map((card, index) => {
            const shown = open.has(card.id);
            return (
              <View key={card.id} className={`${index > 0 ? 'border-t border-surface-2' : ''} ${shown ? 'bg-bg' : ''}`}>
                <Pressable
                  onPress={() => toggle(card.id)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: shown }}
                  className="min-h-[52px] flex-row items-start gap-2 px-3.5 py-2.5"
                  testID="notebook-card"
                >
                  <View className="mt-0.5">
                    {shown ? <ChevronDown size={15} color={theme.text3} /> : <ChevronRight size={15} color={theme.text3} />}
                  </View>
                  <Text className="flex-1 font-medium text-[14px] leading-5 text-text">{card.front}</Text>
                </Pressable>
                {shown ? (
                  <View className="gap-2 pb-3 pl-9 pr-3.5" testID="notebook-card-back">
                    <Text className="text-[14px] leading-5 text-text-2">{card.back}</Text>
                    <View className="flex-row gap-1.5">
                      <Button text={t('Edit')} mode="default" size="auto" onPress={() => setEditing(card)} testID="notebook-card-edit" />
                      <Button text={t('Delete')} mode="ghost" size="auto" onPress={() => setDeleting(card)} testID="notebook-card-delete" />
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      <CardSheet
        pageId={pageId}
        card={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void changed();
        }}
      />
      <DeleteModal
        visible={deleting !== null}
        deletePhrase={t('NotebookCardDelete')}
        name={deleting?.front ?? ''}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void remove()}
        testID="notebook-card-delete-modal"
      />
    </View>
  );
}

/** A card written or changed: the question and the answer, each up to the server's limit. */
function CardSheet({
  pageId,
  card,
  onClose,
  onSaved,
}: {
  pageId: string;
  card: Flashcard | 'new' | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [busy, setBusy] = useState(false);
  const existing = card && card !== 'new' ? card : null;

  useEffect(() => {
    setFront(existing?.front ?? '');
    setBack(existing?.back ?? '');
  }, [card]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!front.trim() || !back.trim() || busy) return;
    setBusy(true);
    const response = existing
      ? await updateCard(existing.id, { front: front.trim(), back: back.trim() }, t)
      : await createCard(pageId, { front: front.trim(), back: back.trim() }, t);
    setBusy(false);
    if (!response.success) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    onSaved();
  };

  return (
    <BottomSheet visible={card !== null} onClose={onClose} dismissable={!busy}>
      <View className="gap-3" testID="card-sheet">
        <Text accessibilityRole="header" className="text-[17px] font-bold text-text">
          {existing ? t('NotebookCardEdit') : t('NotebookMobileNewCard')}
        </Text>
        <Input
          value={front}
          onChangeText={setFront}
          multiline
          autoFocus
          maxLength={MAX_CARD_SIDE_LENGTH}
          placeholder={t('NotebookCardFront')}
          accessibilityLabel={t('NotebookCardFront')}
          testID="card-front"
        />
        <Input
          value={back}
          onChangeText={setBack}
          multiline
          maxLength={MAX_CARD_SIDE_LENGTH}
          placeholder={t('NotebookCardBack')}
          accessibilityLabel={t('NotebookCardBack')}
          testID="card-back"
        />
        <Button
          text={existing ? t('NotebookSave') : t('NotebookCardsAdd')}
          mode="primary"
          size="block"
          submitting={busy}
          disabled={!front.trim() || !back.trim()}
          onPress={() => void save()}
          testID="card-save"
        />
      </View>
    </BottomSheet>
  );
}
