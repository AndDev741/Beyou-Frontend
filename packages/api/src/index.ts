// HttpClient infrastructure
export * from './httpClient';

// Logger
export * from './logger';

// Product analytics — host app injects its platform SDK (PostHog) here
export * from './analytics';

// Error handling
export * from './apiError';

// Error reporting — which handled failures deserve a telemetry issue
export * from './errorReporting';

// Utilities
export * from './utils/experienceToEnum';

// AI agent chats
export * from './agent/agentChats';
export * from './agent/agentStream';

// Check-day history
export { default as getCheckHistory } from './checkHistory/getCheckHistory';

// Categories
export { default as createCategory } from './categories/createCategory';
export { default as deleteCategory } from './categories/deleteCategory';
export { default as editCategory } from './categories/editCategory';
export { default as getCategories } from './categories/getCategories';

// Feedback
export { default as buildFeedbackContext } from './feedback/feedbackContext';
export * from './feedback/feedbackContext';
export { default as createFeedback } from './feedback/createFeedback';
export * from './feedback/feedbackTypes';
export * from './feedback/nativeUploader';
export { default as submitFeedback } from './feedback/submitFeedback';
export { default as uploadFeedbackAttachment } from './feedback/uploadFeedbackAttachment';

// Feedback — admin triage (ROLE_ADMIN). The web admin console imports these by
// deep path so they stay out of any bundle that only submits feedback.
export { default as createFeedbackReply } from './feedback/createFeedbackReply';
export { default as getFeedbackAdminCounts } from './feedback/getFeedbackAdminCounts';
export { default as getFeedbackAdminItem } from './feedback/getFeedbackAdminItem';
export { default as listFeedbackAdminItems } from './feedback/listFeedbackAdminItems';
export { default as updateFeedbackStatus } from './feedback/updateFeedbackStatus';

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
export { default as getXpHistory } from './xp/getXpHistory';
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

// User
export { default as deleteAccount } from './user/deleteAccount';
export { default as editUser } from './user/editUser';
export { default as exportUserData } from './user/exportUserData';
export { default as getProfile } from './user/getProfile';
export { default as requestAccountDeletionCode } from './user/requestAccountDeletionCode';
export { default as uploadUserPhoto } from './user/uploadUserPhoto';
export { default as deleteUserPhoto } from './user/deleteUserPhoto';
