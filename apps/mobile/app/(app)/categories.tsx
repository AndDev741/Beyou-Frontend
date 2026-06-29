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
import SpotlightOverlay from '../../src/ui/tutorial/SpotlightOverlay';

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
    <View className="flex-1 bg-background" style={{ paddingTop: 48 }}>
      <View className="flex-row items-center justify-between px-4 pb-3">
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            testID="back-button"
          >
            <Ionicons name="chevron-back" size={26} color={theme.primary} />
          </Pressable>
          <Text className="text-primary text-2xl font-bold">{t('Categories')}</Text>
        </View>
        <Pressable
          ref={createRef}
          onPress={() => setForm({ visible: true, mode: 'create', category: null })}
          accessibilityRole="button"
          accessibilityLabel={t('CreateCategory')}
          testID="create-category"
          className="h-10 w-10 items-center justify-center rounded-full bg-primary"
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
            <View className="mt-20 items-center gap-3 px-8">
              <Text className="text-5xl">🗂️</Text>
              <Text className="text-description text-center text-base">{t('NoCategories')}</Text>
              <Pressable
                onPress={() => setForm({ visible: true, mode: 'create', category: null })}
                accessibilityRole="button"
                testID="empty-create-category"
                className="rounded-full bg-primary px-5 py-2.5"
              >
                <Text style={{ color: theme.background }} className="font-semibold">{t('CreateCategory')}</Text>
              </Pressable>
            </View>
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

      {cat.active ? (
        <SpotlightOverlay
          step={cat.steps[cat.stepIndex]}
          stepIndex={cat.stepIndex}
          stepCount={cat.steps.length}
          onNext={cat.next}
          onPrev={cat.prev}
          onSkip={cat.skip}
        />
      ) : null}
    </View>
  );
}
