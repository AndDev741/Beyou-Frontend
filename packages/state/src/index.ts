// rootReducer + RootState
export { default as rootReducer } from './rootReducer';
export type { RootState } from './rootReducer';

// authentication
export { successRegisterEnter } from './authentication/registerSlice';

// user / perfil
// `nameEnter` collides with category's `nameEnter`, so it is aliased here as
// `perfilNameEnter`. Existing consumers import the unaliased `nameEnter` via the
// deep path @beyou/state/user/perfilSlice; the alias keeps the barrel namespace clean.
export {
  hydratePerfil,
  nameEnter as perfilNameEnter,
  emailEnter,
  phraseEnter,
  phraseAuthorEnter,
  constanceEnter,
  photoEnter,
  isGoogleAccountEnter,
  checkedItemsInScheduledRoutineEnter,
  totalItemsInScheduledRoutineEnter,
  widgetsIdInUseEnter,
  themeInUseEnter,
  xpEnter,
  levelEnter,
  nextLevelXpEnter,
  actualLevelXpEnter,
  maxConstanceEnter,
  alreadyIncreaseConstanceTodayEnter,
  languageInUserEnter,
  tutorialCompletedEnter,
  timezoneEnter,
  xpDecayStrategyEnter,
} from './user/perfilSlice';

// category
export { enterCategories, updateCategorie, refreshCategorie } from './category/categoriesSlice';
// editCategorySlice: editModeEnter and nameEnter collide — import via deep path @beyou/state/category/editCategorySlice
export { idEnter, descriptionEnter, iconEnter } from './category/editCategorySlice';

// celebration
export type { Celebration } from './celebration/celebrationSlice';
export { celebrationPushed, celebrationShifted } from './celebration/celebrationSlice';

// gamification
export { STREAK_MILESTONES } from './gamification/streakMilestones';
export { applyRefreshUi } from './user/refreshUiThunk';
export type { ApplyRefreshUiOptions, PreviousProgress } from './user/refreshUiThunk';

// dashboard helpers (pure, platform-agnostic)
export { getGreetingKey, calculateLevelProgress } from './dashboard/helpers';
export type { GreetingKey } from './dashboard/helpers';

// dashboard widgets (ids shared by web + mobile)
export { WIDGET_IDS, BIG_WIDGETS } from './dashboard/widgets';
export type { WidgetId } from './dashboard/widgets';

// errorHandler
export { defaultErrorEnter } from './errorHandler/errorHandlerSlice';

// goals
export { enterGoals, updateGoal } from './goal/goalsSlice';
// editGoalSlice: editModeEnter, editDescriptionEnter, editIconIdEnter collide — import via deep path @beyou/state/goal/editGoalSlice
export {
  editGoalIdEnter,
  editTitleEnter,
  editTargetValueEnter,
  editUnitEnter,
  editCurrentValueEnter,
  editCompleteEnter,
  editCategoryEnter,
  editMotivationEnter,
  editStartDateEnter,
  editEndDateEnter,
  editXpRewardEnter,
  editStatusEnter,
  editTermEnter,
} from './goal/editGoalSlice';

// habits
export { enterHabits } from './habit/habitsSlice';
// editHabitSlice: editModeEnter, editIdEnter, editNameEnter, editDescriptionEnter, editIconIdEnter,
//   editImportanceEnter, editDificultyEnter, editCaegoriesIdEnter collide — import via deep path @beyou/state/habit/editHabitSlice
export { editMotivationalPhraseEnter } from './habit/editHabitSlice';

// routines
export { enterRoutines } from './routine/routinesSlice';
export { enterTodayRoutine, refreshItemGroup } from './routine/todayRoutineSlice';
export {
  enterSnapshot,
  enterSnapshots,
  clearSnapshot,
  enterSnapshotDates,
  setSelectedDate,
  setSnapshotLoading,
  updateSnapshotCheck,
} from './routine/snapshotSlice';
// editRoutineSlice: editModeEnter collides — import via deep path @beyou/state/routine/editRoutineSlice
export { routineEnter } from './routine/editRoutineSlice';

// tasks
export { enterTasks } from './task/tasksSlice';
// editTaskSlice: editModeEnter, editIdEnter, editNameEnter, editDescriptionEnter, editIconIdEnter,
//   editImportanceEnter, editDificultyEnter, editCaegoriesIdEnter collide — import via deep path @beyou/state/task/editTaskSlice
export { editOneTimeTaskEnter } from './task/editTaskSlice';

// viewFilters
export type { ViewSortKey } from './viewFilters/viewFiltersSlice';
export { setViewSort } from './viewFilters/viewFiltersSlice';
export { sortHabits, HABIT_SORT_KEYS } from './viewFilters/sortHabits';
export type { HabitSortKey } from './viewFilters/sortHabits';
export { sortRoutines, ROUTINE_SORT_KEYS } from './viewFilters/sortRoutines';
export type { RoutineSortKey } from './viewFilters/sortRoutines';
export { sortGoals, GOAL_SORT_KEYS } from './viewFilters/sortGoals';
export type { GoalSortKey } from './viewFilters/sortGoals';
export { sortCategories, CATEGORY_SORT_KEYS } from './viewFilters/sortCategories';
export type { CategorySortKey } from './viewFilters/sortCategories';
export { sortTasks, TASK_SORT_KEYS } from './viewFilters/sortTasks';
export type { TaskSortKey } from './viewFilters/sortTasks';
export { getRoutineStats, countItemsInRoutine } from './routine/routineMetrics';
export type { RoutineStats } from './routine/routineMetrics';
