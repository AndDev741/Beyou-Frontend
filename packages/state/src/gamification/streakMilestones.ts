/**
 * Streak (constance) day counts that trigger a celebration when crossed.
 * Shared by web (useUiRefresh) and mobile so both platforms celebrate the same
 * milestones. Previously a literal inside apps/web/src/hooks/useUiRefresh.tsx.
 */
export const STREAK_MILESTONES = [7, 14, 21, 30, 60, 90, 100] as const;
