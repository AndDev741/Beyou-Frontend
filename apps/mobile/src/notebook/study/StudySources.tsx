import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';
import { AlignLeft, Link2, Search, Trash2 } from 'lucide-react-native';
import { addLinkSource, addTextSource, deleteSource, discoverSources, getSources, setSourceEnabled } from '@beyou/api/notebook';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { MAX_SOURCE_PDF_BYTES, type DiscoveredSource, type NotebookSource } from '@beyou/types/notebook/notebook';
import BottomSheet from '../../ui/BottomSheet';
import Button from '../../ui/Button';
import DeleteModal from '../../ui/DeleteModal';
import Input from '../../ui/Input';
import { uploadFile } from '../../lib/uploadFile';
import { notify } from '../../notify';
import { useBeyouTheme } from '../../theme/ThemeProvider';

/** How often the list is read again while a source is still being read on the server. */
const POLL_MS = 3000;

type Adding = 'link' | 'text' | 'discover' | null;

/**
 * What the study AI may quote for this page on the phone: "Find sources for me" (a web search
 * the server opens and checks), a link, a PDF from the phone, or pasted text. Each source of this
 * page has a switch for whether answers use it; sources added to a page above are read here too
 * and listed under it. The server reads a source in the background, so the list is read again
 * every few seconds while one is still being read.
 */
export default function StudySources({
  pageId,
  initialSources,
  discovery,
  onChanged,
}: {
  pageId: string;
  initialSources: NotebookSource[];
  /** Whether the server has a web search for "find sources for me". */
  discovery: boolean;
  onChanged: (sources: NotebookSource[]) => void;
}) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [sources, setSources] = useState<NotebookSource[]>(initialSources);
  const [adding, setAdding] = useState<Adding>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<NotebookSource | null>(null);

  const reading = sources.some((source) => source.status === 'PENDING' || source.status === 'READING');

  const reload = async () => {
    const response = await getSources(pageId, t);
    if (response.success) {
      setSources(response.success);
      onChanged(response.success);
    }
  };

  useEffect(() => {
    if (!reading) return;
    const id = setInterval(() => void reload(), POLL_MS);
    return () => clearInterval(id);
  }, [reading]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickPdf = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets?.[0]) return;
    const file = picked.assets[0];
    if (file.size && file.size > MAX_SOURCE_PDF_BYTES) {
      notify.error(t('NotebookStudyPdfTooLarge'));
      return;
    }
    setUploading(true);
    const response = await uploadFile<NotebookSource>(`/notebook/pages/${pageId}/sources/pdf`, file.uri, 'application/pdf', file.name);
    setUploading(false);
    if (response.error) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    await reload();
  };

  const toggle = async (source: NotebookSource) => {
    setSources((current) => current.map((s) => (s.id === source.id ? { ...s, enabled: !s.enabled } : s)));
    const response = await setSourceEnabled(source.id, !source.enabled, t);
    if (!response.success) notify.error(getFriendlyErrorMessage(t, response.error));
    await reload();
  };

  const remove = async () => {
    if (!removing) return;
    const response = await deleteSource(removing.id, t);
    setRemoving(null);
    if (response.error) notify.error(getFriendlyErrorMessage(t, response.error));
    await reload();
  };

  const own = sources.filter((source) => !source.inherited);
  const inherited = sources.filter((source) => source.inherited);

  return (
    // The sheets render inside this ScrollView, and the responder walks the React tree: without
    // "handled" the first tap on a sheet's button only closes the keyboard.
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 10 }} keyboardShouldPersistTaps="handled" testID="study-sources">
      {discovery ? (
        <Button
          text={t('NotebookDiscoverTitle')}
          mode="tonal"
          size="block"
          icon={<Search size={17} color={theme.accent} />}
          onPress={() => setAdding('discover')}
          testID="study-discover"
        />
      ) : null}
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button text={`+ ${t('NotebookStudyAddLink')}`} mode="default" size="block" onPress={() => setAdding('link')} testID="study-add-link" />
        </View>
        <View className="flex-1">
          <Button
            text={`+ ${t('NotebookStudyAddPdf')}`}
            mode="default"
            size="block"
            submitting={uploading}
            onPress={() => void pickPdf()}
            testID="study-add-pdf"
          />
        </View>
        <View className="flex-1">
          <Button text={`+ ${t('NotebookStudyAddText')}`} mode="default" size="block" onPress={() => setAdding('text')} testID="study-add-text" />
        </View>
      </View>

      {own.length === 0 && inherited.length === 0 ? (
        <Text className="py-2 text-center text-[13px] leading-[18px] text-text-2" testID="study-sources-empty">
          {t('NotebookMobileSourcesEmpty')}
        </Text>
      ) : null}

      {own.length > 0 ? (
        <View className="overflow-hidden rounded-[14px] border border-border bg-surface">
          {own.map((source, index) => (
            <SourceRow
              key={source.id}
              source={source}
              first={index === 0}
              onToggle={() => void toggle(source)}
              onRemove={() => setRemoving(source)}
            />
          ))}
        </View>
      ) : null}

      {inherited.length > 0 ? (
        <View className="gap-2">
          <Text className="pt-1.5 font-mono text-[11px] tracking-wide text-text-2">
            {t('NotebookMobileSourcesInherited').toUpperCase()}
          </Text>
          <View className="overflow-hidden rounded-[14px] border border-border bg-surface">
            {inherited.map((source, index) => (
              <SourceRow key={source.id} source={source} first={index === 0} />
            ))}
          </View>
        </View>
      ) : null}

      <LinkSheet pageId={pageId} visible={adding === 'link'} onClose={() => setAdding(null)} onAdded={() => void reload()} />
      <TextSheet pageId={pageId} visible={adding === 'text'} onClose={() => setAdding(null)} onAdded={() => void reload()} />
      <DiscoverSheet pageId={pageId} visible={adding === 'discover'} onClose={() => setAdding(null)} onAdded={() => void reload()} />
      <DeleteModal
        visible={removing !== null}
        deletePhrase={t('NotebookStudyDeleteSource', { title: removing?.title ?? '' })}
        name={removing?.title ?? ''}
        onCancel={() => setRemoving(null)}
        onConfirm={() => void remove()}
        testID="study-source-delete"
      />
    </ScrollView>
  );
}

function SourceRow({
  source,
  first,
  onToggle,
  onRemove,
}: {
  source: NotebookSource;
  first: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const reading = source.status === 'PENDING' || source.status === 'READING';
  const detail = source.status === 'FAILED'
    ? t('NotebookStudySourceFailed')
    : reading
      ? source.progress > 0 ? t('NotebookStudyReadingPercent', { percent: Math.round(source.progress) }) : t('NotebookStudyReading')
      : [
          source.url ? hostOf(source.url) : null,
          source.pageCount ? t('NotebookStudySourcePages', { count: source.pageCount }) : null,
          source.inherited && source.pageTitle ? t('NotebookStudySourceInherited', { page: source.pageTitle }) : null,
        ].filter(Boolean).join(' · ');

  return (
    <View className={`flex-row items-center gap-3 px-3 py-3 ${first ? '' : 'border-t border-border'}`} testID="study-source">
      <View
        className={`h-[34px] w-[34px] items-center justify-center rounded-[9px] ${
          source.kind === 'PDF' ? 'bg-danger/10' : source.kind === 'LINK' ? 'bg-accent-soft' : 'bg-surface-2'
        }`}
      >
        {source.kind === 'PDF' ? (
          <Text className="font-mono-semibold text-[10px] text-danger">PDF</Text>
        ) : source.kind === 'LINK' ? (
          <Link2 size={16} color={theme.accent} />
        ) : (
          <AlignLeft size={16} color={theme.text2} />
        )}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[14px] font-semibold text-text" numberOfLines={1}>{source.title}</Text>
        <View className="flex-row items-center gap-1.5">
          {reading ? <ActivityIndicator size="small" color={theme.text3} /> : null}
          <Text className={`text-[12px] ${source.status === 'FAILED' ? 'text-danger' : 'text-text-2'}`} numberOfLines={1}>
            {detail}
          </Text>
        </View>
      </View>
      {onRemove ? (
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={t('NotebookStudyDeleteSource', { title: source.title })}
          className="h-11 w-9 items-center justify-center"
          testID="study-source-remove"
        >
          <Trash2 size={16} color={theme.text3} />
        </Pressable>
      ) : null}
      {onToggle ? (
        <Switch
          value={source.enabled}
          onValueChange={onToggle}
          accessibilityLabel={t('NotebookStudyUseSource', { title: source.title })}
          trackColor={{ true: theme.accent, false: theme.border }}
          testID="study-source-toggle"
        />
      ) : null}
    </View>
  );
}

function hostOf(url: string): string {
  const match = /^https?:\/\/([^/]+)/i.exec(url);
  return match ? match[1].replace(/^www\./, '') : url;
}

function LinkSheet({ pageId, visible, onClose, onAdded }: { pageId: string; visible: boolean; onClose: () => void; onAdded: () => void }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (visible) setUrl('');
  }, [visible]);

  const add = async () => {
    const address = url.trim();
    if (!address || busy) return;
    setBusy(true);
    const response = await addLinkSource(pageId, /^https?:\/\//i.test(address) ? address : `https://${address}`, t);
    setBusy(false);
    if (!response.success) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    onClose();
    onAdded();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} dismissable={!busy}>
      <View className="gap-3" testID="study-link-sheet">
        <Text accessibilityRole="header" className="text-[17px] font-bold text-text">{t('NotebookStudyLinkLabel')}</Text>
        <Input
          value={url}
          onChangeText={setUrl}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://"
          accessibilityLabel={t('NotebookStudyLinkLabel')}
          testID="study-link-input"
        />
        <Text className="text-[12px] text-text-2">{t('NotebookStudyLinkHint')}</Text>
        <Button text={t('NotebookStudyAddSourceSubmit')} mode="primary" size="block" submitting={busy} disabled={!url.trim()} onPress={() => void add()} testID="study-link-save" />
      </View>
    </BottomSheet>
  );
}

function TextSheet({ pageId, visible, onClose, onAdded }: { pageId: string; visible: boolean; onClose: () => void; onAdded: () => void }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (visible) {
      setTitle('');
      setText('');
    }
  }, [visible]);

  const add = async () => {
    if (!title.trim() || !text.trim() || busy) return;
    setBusy(true);
    const response = await addTextSource(pageId, title.trim(), text, t);
    setBusy(false);
    if (!response.success) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    onClose();
    onAdded();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} dismissable={!busy}>
      <View className="gap-3" testID="study-text-sheet">
        <Text accessibilityRole="header" className="text-[17px] font-bold text-text">{t('NotebookStudyAddText')}</Text>
        <Input value={title} onChangeText={setTitle} autoFocus maxLength={255} placeholder={t('NotebookStudyTextTitleLabel')} accessibilityLabel={t('NotebookStudyTextTitleLabel')} testID="study-text-title" />
        <Input value={text} onChangeText={setText} multiline placeholder={t('NotebookStudyTextLabel')} accessibilityLabel={t('NotebookStudyTextLabel')} testID="study-text-body" />
        <Button text={t('NotebookStudyAddSourceSubmit')} mode="primary" size="block" submitting={busy} disabled={!title.trim() || !text.trim()} onPress={() => void add()} testID="study-text-save" />
      </View>
    </BottomSheet>
  );
}

/**
 * "Find sources for me": what the sources should cover, a web search the server opens and checks,
 * and the ones found, all picked to start with, added as links.
 */
function DiscoverSheet({ pageId, visible, onClose, onAdded }: { pageId: string; visible: boolean; onClose: () => void; onAdded: () => void }) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [description, setDescription] = useState('');
  const [found, setFound] = useState<DiscoveredSource[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (visible) {
      setDescription('');
      setFound(null);
      setPicked(new Set());
    }
  }, [visible]);

  const search = async () => {
    if (!description.trim() || searching) return;
    setSearching(true);
    const response = await discoverSources(pageId, description.trim(), t);
    setSearching(false);
    if (!response.success) {
      notify.error(getFriendlyErrorMessage(t, response.error));
      return;
    }
    setFound(response.success.sources);
    setPicked(new Set(response.success.sources.map((s) => s.url)));
  };

  const add = async () => {
    if (!found || adding) return;
    setAdding(true);
    const chosen = found.filter((s) => picked.has(s.url));
    const results = await Promise.all(chosen.map((s) => addLinkSource(pageId, s.url, t)));
    setAdding(false);
    const added = results.filter((r) => r.success).length;
    if (added > 0) notify.success(t('NotebookDiscoverAdded', { count: added }));
    if (added < chosen.length) notify.error(t('NotebookDiscoverSomeFailed'));
    onClose();
    onAdded();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} dismissable={!searching && !adding}>
      <View className="gap-3" style={{ flexShrink: 1 }} testID="study-discover-sheet">
        <Text accessibilityRole="header" className="text-[17px] font-bold text-text">{t('NotebookDiscoverTitle')}</Text>
        <Input
          value={description}
          onChangeText={setDescription}
          autoFocus
          maxLength={500}
          placeholder={t('NotebookDiscoverPlaceholder')}
          accessibilityLabel={t('NotebookDiscoverWhat')}
          returnKeyType="search"
          onSubmitEditing={() => void search()}
          testID="study-discover-input"
        />
        {found === null ? (
          <Button
            text={searching ? t('NotebookDiscoverSearching') : t('NotebookDiscoverFind')}
            mode="primary"
            size="block"
            submitting={searching}
            disabled={!description.trim()}
            onPress={() => void search()}
            testID="study-discover-find"
          />
        ) : found.length === 0 ? (
          <Text className="text-[13px] text-text-2" testID="study-discover-none">{t('NotebookDiscoverNone')}</Text>
        ) : (
          <>
            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 6 }}>
              {found.map((source) => {
                const on = picked.has(source.url);
                return (
                  <Pressable
                    key={source.url}
                    onPress={() =>
                      setPicked((current) => {
                        const next = new Set(current);
                        if (next.has(source.url)) next.delete(source.url);
                        else next.add(source.url);
                        return next;
                      })
                    }
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    className={`gap-0.5 rounded-xl border px-3 py-2.5 ${on ? 'border-accent bg-accent-soft' : 'border-border bg-surface'}`}
                    testID="study-discover-result"
                  >
                    <Text className="text-[14px] font-semibold text-text" numberOfLines={2}>{source.title}</Text>
                    <Text className="text-[12px] text-text-2" numberOfLines={1}>{source.domain}</Text>
                    <Text className="text-[12.5px] leading-[17px] text-text-2" numberOfLines={3}>{source.summary}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Button
              text={adding ? t('NotebookDiscoverAdding') : t('NotebookDiscoverAdd', { count: picked.size })}
              mode="primary"
              size="block"
              submitting={adding}
              disabled={picked.size === 0}
              icon={adding ? undefined : <Search size={15} color={theme.onAccent} />}
              onPress={() => void add()}
              testID="study-discover-add"
            />
          </>
        )}
      </View>
    </BottomSheet>
  );
}
