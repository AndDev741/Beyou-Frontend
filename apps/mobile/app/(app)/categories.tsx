import { ChevronLeft, Folder, Plus, Search } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';

import getCategories from '@beyou/api/categories/getCategories';
import deleteCategory from '@beyou/api/categories/deleteCategory';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { enterCategories } from '@beyou/state/category/categoriesSlice';
import { setViewSort, sortCategories } from '@beyou/state';
import type category from '@beyou/types/category/categoryType';
import CategoryCard from '../../src/ui/categories/CategoryCard';
import CategoryForm from '../../src/ui/categories/CategoryForm';
import { notify } from '../../src/notify';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import type { RootState, AppDispatch } from '../../src/store';
import { useCategoriesTutorial } from '../../src/tutorial/hooks/useCategoriesTutorial';
import { useTutorialTarget } from '../../src/tutorial/useTutorialTarget';
import { useSpotlightSlot } from '../../src/tutorial/TutorialOverlaySlot';
import DeleteModal from '../../src/ui/DeleteModal';
import EmptyState from '../../src/ui/EmptyState';
import ListToolbar from '../../src/ui/ListToolbar';
import SelectField from '../../src/ui/SelectField';
import { CATEGORY_SORT_OPTIONS } from '../../src/ui/sortOptions';

type FormState = { visible: boolean; mode: 'create' | 'edit'; category: category | null };
const CLOSED: FormState = { visible: false, mode: 'create', category: null };

/**
 * Categories section screen: self-fetches categories, lists them as cards, and
 * opens the CategoryForm modal for create/edit/delete. Mirrors the Habits screen
 * on the shared @beyou/api + @beyou/state category layer (categories carry xp/level).
 */
export default function CategoriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useBeyouTheme();

  const categories = useSelector((s: RootState) => s.categories.categories);
  const sortBy = useSelector((s: RootState) => s.viewFilters.categories);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(CLOSED);
  const [search, setSearch] = useState('');

  const cat = useCategoriesTutorial();
  // Rendered by the (app) layout so the overlay spans the window — target
  // rects come from measureInWindow, and the bottom bar is outside this screen.
  useSpotlightSlot(cat);
  const createRef = useTutorialTarget('category-create');
  const firstCardRef = useTutorialTarget('category-first');

  const sortedCategories = useMemo(() => sortCategories(categories, sortBy), [categories, sortBy]);

  const visibleCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sortedCategories;
    return sortedCategories.filter(
      (category) =>
        category.name?.toLowerCase().includes(term) ||
        (category.description ?? '').toLowerCase().includes(term),
    );
  }, [sortedCategories, search]);

  const sortOptions = useMemo(
    () => CATEGORY_SORT_OPTIONS.map((option) => ({ value: option.value, label: t(option.key) })),
    [t],
  );

  const load = useCallback(async () => {
    const c = await getCategories(t);
    if (c.success) dispatch(enterCategories(c.success));
  }, [dispatch, t]);

  useEffect(() => {
    let active = true;
    (async () => {
      await load();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [load]);

  // Delete uses the system modal: the native Alert carries no theme, no typography
  // and no item name, and brings the platform's button order.
  const [deleteTarget, setDeleteTarget] = useState<category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteCategory(deleteTarget.id, t);
    setDeleting(false);
    if (res.error) {
      notify.error(getFriendlyErrorMessage(t, res.error));
      return;
    }
    setDeleteTarget(null);
    notify.success(t('deleted successfully'));
    await load();
  }, [deleteTarget, load, t]);

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: 48 }}>
      <View className="flex-row items-center justify-between px-4 pb-3">
        <View className="min-w-0 flex-row items-center gap-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            testID="back-button"
          >
            <ChevronLeft size={24} color={theme.text2} />
          </Pressable>
          <View className="min-w-0">
            <Text accessibilityRole="header" className="text-[22px] font-semibold text-text">
              {t('YourCategories')}
            </Text>
            <Text className="text-[12.5px] text-text-3" numberOfLines={1}>
              {`${categories.length} ${t('Categories')}`}
            </Text>
          </View>
        </View>
        <Pressable
          ref={createRef}
          onPress={() => setForm({ visible: true, mode: 'create', category: null })}
          accessibilityRole="button"
          accessibilityLabel={t('CreateCategory')}
          testID="create-category"
          className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent active:opacity-80"
        >
          <Plus size={22} color={theme.onAccent} />
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={visibleCategories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 40, gap: 12 }}
          ListHeaderComponent={
            categories.length > 0 ? (
              <ListToolbar
                search={search}
                onSearchChange={setSearch}
                searchLabel={t('CategorySearchPlaceholder')}
                testID="categories-toolbar"
              >
                <SelectField
                  label={t('Sort by')}
                  value={sortBy}
                  options={sortOptions}
                  onChange={(value) => dispatch(setViewSort({ view: 'categories', sortBy: value }))}
                  testID="categories-sort"
                  className="flex-1"
                />
              </ListToolbar>
            ) : null
          }
          renderItem={({ item, index }) => (
            <CategoryCard
              category={item}
              onEdit={(c) => setForm({ visible: true, mode: 'edit', category: c })}
              onDelete={setDeleteTarget}
              viewRef={index === 0 ? firstCardRef : undefined}
            />
          )}
          ListEmptyComponent={
            search.trim() ? (
              <EmptyState
                icon={<Search size={20} color={theme.accent} />}
                title={t('NoResultsTitle')}
                description={t('NoResultsDescription')}
                actionLabel={t('ClearFilters')}
                onAction={() => setSearch('')}
                variant="ghost"
                testID="categories-no-results"
              />
            ) : (
              <EmptyState
                icon={<Folder size={20} color={theme.accent} />}
                title={t('0CategoriesTitle')}
                description={t('0CategoriesMessage')}
                actionLabel={t('CreateCategory')}
                onAction={() => setForm({ visible: true, mode: 'create', category: null })}
                testID="empty-create-category"
              />
            )
          }
        />
      )}

      <DeleteModal
        visible={deleteTarget !== null}
        deletePhrase={t('ConfirmDeleteOfCategoryPhrase')}
        name={deleteTarget?.name ?? ''}
        pending={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <CategoryForm
        visible={form.visible}
        mode={form.mode}
        category={form.category}
        onClose={() => setForm(CLOSED)}
        onSaved={load}
      />
    </View>
  );
}
