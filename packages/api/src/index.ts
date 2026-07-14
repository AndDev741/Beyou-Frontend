// HttpClient infrastructure
export * from './httpClient';

// Logger
export * from './logger';

// Error handling
export * from './apiError';

// Utilities
export * from './utils/experienceToEnum';

// AI agent chats
export * from './agent/agentChats';
export * from './agent/agentStream';

// Categories
export { default as createCategory } from './categories/createCategory';
export { default as deleteCategory } from './categories/deleteCategory';
export { default as editCategory } from './categories/editCategory';
export { default as getCategories } from './categories/getCategories';

// Goals
export { default as createGoal } from './goals/createGoal';
export { default as decreaseCurrentValue } from './goals/decreaseCurrentValue';
export { default as deleteGoal } from './goals/deleteGoal';
export { default as editGoal } from './goals/editGoal';
export { default as getGoals } from './goals/getGoals';
export { default as increaseCurrentValue } from './goals/increaseCurrentValue';
export { default as markGoalAsComplete } from './goals/markGoalAsComplete';

// Habits
export { default as createHabit } from './habits/createHabit';
export { default as deleteHabit } from './habits/deleteHabit';
export { default as editHabit } from './habits/editHabit';
export { default as getHabits } from './habits/getHabits';

// Routine
export { default as checkRoutine } from './routine/checkItem';
export { default as createRoutine } from './routine/createRoutine';
export { default as deleteRoutine } from './routine/deleteRoutine';
export { default as editRoutine } from './routine/editRoutine';
export { default as getRoutines } from './routine/getRoutines';
export { default as getTodayRoutine } from './routine/getTodayRoutine';
export { buildRoutinePayload } from './routine/routinePayload';
export { default as skipRoutine } from './routine/skipItem';
export * from './routine/snapshot';

// Schedule
export { default as createSchedule } from './schedule/createSchedule';
export { default as editSchedule } from './schedule/editSchedule';
export { default as getSchedules } from './schedule/getSchedules';

// Tasks
export { default as createTask } from './tasks/createTask';
export { default as deleteTask } from './tasks/deleteTask';
export { default as editTask } from './tasks/editTask';
export { default as getTasks } from './tasks/getTasks';

// AI
export * from './ai/draftMapping';
export { default as generateRoutine } from './ai/generateRoutine';
export { default as materializeRoutine } from './ai/materializeRoutine';
export * from './ai/sortDraft';

// User
export { default as editUser } from './user/editUser';
export { default as getProfile } from './user/getProfile';
export { default as uploadUserPhoto } from './user/uploadUserPhoto';
