import { useState } from 'react';
import { View, Text } from 'react-native';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react-native';
import type category from '@beyou/types/category/categoryType';
import BeyouIcon from '../BeyouIcon';
import Chip from '../Chip';
import IconButton from '../IconButton';
import IconTile from '../IconTile';
import { useBeyouTheme } from '../../theme/ThemeProvider';

interface CategoryCardProps {
  category: category;
  onEdit: (category: category) => void;
  onDelete: (category: category) => void;
  /** Alvo do tutorial — só o primeiro cartão recebe (`category-first`). */
  viewRef?: RefObject<View | null>;
}

/** Nomes de um mapa `{id: nome}` vindo do backend. */
const namesOf = (source?: Record<string, string> | Map<string, string>): string[] => {
  if (!source) return [];
  return source instanceof Map ? [...source.values()] : Object.values(source);
};

/**
 * Cartão de categoria — o compacto do mockup, espelho do `categoryBox`.
 * Fechado mostra ícone, nome, ações, descrição e a barra de XP; expandir
 * revela onde a categoria é usada (hábitos, tarefas, metas).
 *
 * Editar e excluir ficam à esquerda do chevron. Na web aparecem no hover; aqui
 * ficam sempre visíveis, como na própria web abaixo de `md`.
 */
export default function CategoryCard({ category, onEdit, onDelete, viewRef }: CategoryCardProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [expanded, setExpanded] = useState(false);

  const usedIn = [
    { label: t('Habits'), names: namesOf(category.habits) },
    { label: t('Tasks'), names: namesOf(category.tasks) },
    { label: t('Goals'), names: namesOf(category.goals) },
  ].filter((group) => group.names.length > 0);

  const xpPct =
    category.nextLevelXp > 0
      ? Math.min(100, Math.round((category.xp / category.nextLevelXp) * 100))
      : 0;

  return (
    <View ref={viewRef} className="rounded-card border border-border bg-surface p-4">
      <View className="flex-row items-center gap-2.5" testID={`category-card-${category.id}`}>
        <IconTile size={34}>
          <BeyouIcon id={category.iconId} size={18} showFallback />
        </IconTile>
        <Text
          className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-text"
          numberOfLines={1}
        >
          {category.name}
        </Text>

        <IconButton
          label={t('Edit')}
          onPress={() => onEdit(category)}
          testID={`category-edit-${category.id}`}
        >
          <Pencil size={15} color={theme.text3} />
        </IconButton>
        <IconButton
          label={t('Delete')}
          tone="danger"
          onPress={() => onDelete(category)}
          testID={`category-delete-${category.id}`}
        >
          <Trash2 size={15} color={theme.text3} />
        </IconButton>
        {/* O chevron fica sempre visível — é o que avisa que o cartão expande
            para mostrar onde a categoria é usada. */}
        <IconButton
          label={expanded ? t('Collapse') : t('Expand')}
          onPress={() => setExpanded((open) => !open)}
          testID={`category-expand-${category.id}`}
        >
          {expanded ? (
            <ChevronUp size={18} color={theme.text3} />
          ) : (
            <ChevronDown size={18} color={theme.text3} />
          )}
        </IconButton>
      </View>

      {category.description ? (
        <Text className="mt-2.5 text-[12px] leading-snug text-text-3" numberOfLines={2}>
          {category.description}
        </Text>
      ) : null}

      {expanded ? (
        usedIn.length > 0 ? (
          <View className="mt-2.5 gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
              {t('Using in')}
            </Text>
            {usedIn.map((group) => (
              <View key={group.label}>
                <Text className="mb-1 text-xs font-semibold text-text-2">{group.label}</Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {group.names.map((usedName) => (
                    <Chip key={usedName} size="sm">
                      {usedName}
                    </Chip>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text className="mt-2.5 text-sm text-text-3">
            {t('Add this category in a habit, task or goal!')}
          </Text>
        )
      ) : null}

      {/* Categoria acumula o XP dos hábitos: nível e progresso, sem sequência. */}
      <View className="mt-3">
        <View className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <View className="h-full rounded-full bg-accent" style={{ width: `${xpPct}%` }} />
        </View>
        <View className="mt-1 flex-row items-center justify-between">
          <Text className="font-mono-semibold text-[11px] text-text-2">LV {category.level}</Text>
          <Text className="font-mono text-[11px] text-text-3">
            {category.xp}/{category.nextLevelXp}
          </Text>
        </View>
      </View>
    </View>
  );
}
