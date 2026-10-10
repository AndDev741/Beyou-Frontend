/**
 * What the chat does with each assistant tool, shared by web and mobile.
 *
 * Both apps used to carry their own copy of these lists, matching only because every new tool was
 * added twice by hand. The data lives here; each app keeps nothing but the icon it draws for a
 * destination, since lucide ships a different package per platform.
 */

/**
 * READ tools: they become a quiet chip ("Routines read"), which is all anyone needs to know about
 * them. Everything else writes something, and a write becomes a card with a link to check what
 * the agent did.
 */
export const READ_TOOLS: ReadonlySet<string> = new Set([
  'getUserHabits',
  'getUserCategories',
  'getUserTasks',
  'getUserGoals',
  'getUserRoutines',
  'getTodayRoutine',
  'getUserSchedules',
  'getUserConfiguration',
  // getItemMicroTasks materialises pinned names as it reads, so it is not a pure get. It is a
  // chip anyway: nothing the person asked for changed, and "your micro-tasks, re-pinned" is not
  // a sentence anyone wants in a chat transcript.
  'getItemMicroTasks',
  'getFocusDay',
  'getUserMoodHistory',
  'listStudyTopics',
  'getStudyPlanForToday',
  'getStudyBoard',
]);

/**
 * Names that mention TWO entities (`addTaskToRoutineSection`) would match the wrong pattern
 * first; what you want to check in those cases is the routine. `updateGlobalContext` and
 * `updateChatContext` stay out on purpose: the agent's memory has no screen to "see", so they
 * become a chip.
 */
export const ROUTINE_ITEM_TOOLS: ReadonlySet<string> = new Set([
  'addTaskToRoutineSection',
  'addHabitToRoutineSection',
  'removeRoutineItem',
]);

/**
 * The same trap, worse: every micro-task tool has "Task" in its name and none of them has
 * anything to do with the tasks page. `/Task/` matched them all and sent people to /tasks to look
 * for something that was never going to be there. Listed by name rather than fixed with a
 * cleverer pattern, because a name is what the next tool will also be added as.
 */
export const FOCUS_TOOLS: ReadonlySet<string> = new Set([
  'addMicroTask',
  'toggleMicroTask',
  'pinMicroTask',
  'deleteMicroTask',
  'reorderMicroTasks',
]);

/** The screens a write card can link to. Each app maps these to its own icon. */
export type ToolDestinationKey =
  | 'habits'
  | 'categories'
  | 'tasks'
  | 'goals'
  | 'routines'
  | 'mood'
  | 'notebook'
  | 'configuration'
  | 'focus';

/** Where a write tool points: route and link label. */
export type ToolDestination = { key: ToolDestinationKey; route: string; labelKey: string };

const SCREENS: Record<ToolDestinationKey, ToolDestination> = {
  habits: { key: 'habits', route: '/habits', labelKey: 'Habits' },
  categories: { key: 'categories', route: '/categories', labelKey: 'Categories' },
  tasks: { key: 'tasks', route: '/tasks', labelKey: 'Tasks' },
  goals: { key: 'goals', route: '/goals', labelKey: 'Goals' },
  routines: { key: 'routines', route: '/routines', labelKey: 'Routines' },
  mood: { key: 'mood', route: '/mood', labelKey: 'Mood' },
  notebook: { key: 'notebook', route: '/notebook', labelKey: 'Notebook' },
  configuration: { key: 'configuration', route: '/configuration', labelKey: 'Config' },
  focus: { key: 'focus', route: '/focus', labelKey: 'FocusTitle' },
};

/** First match wins, so the order is part of the rule. */
const BY_NAME: { match: RegExp; key: ToolDestinationKey }[] = [
  { match: /Habit/, key: 'habits' },
  { match: /Category/, key: 'categories' },
  { match: /Task/, key: 'tasks' },
  { match: /Goal/, key: 'goals' },
  { match: /Routine|Schedule/, key: 'routines' },
  { match: /Mood/, key: 'mood' },
  { match: /Study/, key: 'notebook' },
  { match: /Configuration/, key: 'configuration' },
];

/** The screen a write tool's card links to, or null for a read or a tool with no screen. */
export function toolDestination(tool: string | undefined): ToolDestination | null {
  if (!tool) return null;
  // A read has nothing to go and look at. The renderers already send reads down the chip path;
  // this keeps the function honest on its own, because `getItemMicroTasks` matches /Task/ and
  // would otherwise answer "/tasks" to anyone who asked it directly.
  if (READ_TOOLS.has(tool)) return null;
  if (FOCUS_TOOLS.has(tool)) return SCREENS.focus;
  if (ROUTINE_ITEM_TOOLS.has(tool)) return SCREENS.routines;
  const found = BY_NAME.find(({ match }) => match.test(tool));
  return found ? SCREENS[found.key] : null;
}

/** Whether the chat shows this tool as a quiet chip rather than a card. */
export function isReadTool(tool: string | undefined): boolean {
  return !!tool && READ_TOOLS.has(tool);
}

/** Every tool name the apps state an opinion about, for the label guard in the web i18n test. */
export const KNOWN_TOOLS: readonly string[] = [...READ_TOOLS, ...ROUTINE_ITEM_TOOLS, ...FOCUS_TOOLS];
