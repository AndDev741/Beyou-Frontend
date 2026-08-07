import { Folder } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import getCategories from '@beyou/api/categories/getCategories';
import deleteCategory from '@beyou/api/categories/deleteCategory';
import { getFriendlyErrorMessage } from '@beyou/api/apiError';
import { enterCategories } from '@beyou/state/category/categoriesSlice';
import { sortCategories } from '@beyou/state';
import type category from '@beyou/types/category/categoryType';
import CategoryCard from '../../src/ui/categories/CategoryCard';
import CategoryForm from '../../src/ui/categories/CategoryForm';
import CategoriesSortSheet from '../../src/ui/categories/CategoriesSortSheet';
import { notify } from '../../src/notify';
import { useBeyouTheme } from '../../src/theme/ThemeProvider';
import type { RootState, AppDispatch } from '../../src/store';
import { useCategoriesTutorial } from '../../src/tutorial/hooks/useCategoriesTutorial';
import { useTutorialTarget } from '../../src/tutorial/useTutorialTarget';
import { useSpotlightSlot } from '../../src/tutorial/TutorialOverlaySlot';
import EmptyState from '../../src/ui/EmptyState';

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

  const cat = useCategoriesTutorial();
  // Rendered by the (app) layout so the overlay spans the window — target
  // rects come from measureInWindow, and the bottom bar is outside this screen.
  useSpotlightSlot(cat);
  const createRef = useTutorialTarget('category-create');
  const firstCardRef = useTutorialTarget('category-first');

  const sortedCategories = useMemo(() => sortCategories(categories, sortBy), [categories, sortBy]);

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

  const handleDelete = useCallback(
    (target: category) => {
      Alert.alert(t('DeleteCategory'), t('ConfirmDeleteOfCategoryPhrase'), [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            const res = await deleteCategory(target.id, t);
            if (res.error) notify.error(getFriendlyErrorMessage(t, res.error));
            else {
              notify.success(t('deleted successfully'));
              await load();
            }
          },
        },
      ]);
    },
    [t, load],
  );

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: 48 }}>
      <View className="flex-row items-center justify-between px-4 pb-3">
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            testID="back-button"
          >
            <Ionicons name="chevron-back" size={26} color={theme.primary} />
          </Pressable>
          <Text className="text-accent text-2xl font-bold">{t('Categories')}</Text>
        </View>
        <Pressable
          ref={createRef}
          onPress={() => setForm({ visible: true, mode: 'create', category: null })}
          accessibilityRole="button"
          accessibilityLabel={t('CreateCategory')}
          testID="create-category"
          className="h-10 w-10 items-center justify-center rounded-full bg-accent"
        >
          <Ionicons name="add" size={26} color={theme.background} />
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={sortedCategories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12 }}
          ListHeaderComponent={categories.length > 0 ? <View className="mb-1"><CategoriesSortSheet /></View> : null}
          renderItem={({ item, index }) => (
            <CategoryCard
              category={item}
              onEdit={(c) => setForm({ visible: true, mode: 'edit', category: c })}
              onDelete={handleDelete}
              viewRef={index === 0 ? firstCardRef : undefined}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<Folder size={20} color={theme.accent} />}
              title={t('0CategoriesTitle')}
              description={t('0CategoriesMessage')}
              actionLabel={t('CreateCategory')}
              onAction={() => setForm({ visible: true, mode: 'create', category: null })}
              testID="empty-create-category"
            />
          }
        />
      )}

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
