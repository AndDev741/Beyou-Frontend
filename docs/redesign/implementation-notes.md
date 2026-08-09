# Redesign — implementation notes for review

A record of what was done beyond the plan, what is still pending and which questions need a
decision. A companion to the [plan](implementation-plan.md); the order follows the plan's
phases.

---

## Findings worth reviewing before the merge

### 1. Pre-existing bug: opacity variants generated no CSS

A colour declared in Tailwind as `var(--x)` makes **Tailwind v3 drop the slash modifier**.
`bg-primary/10`, `border-primary/20` and company never emitted a single rule — the element was
left with no background and no border, silently. That was already the case before the redesign,
in dozens of places.

Fixed by emitting every token in raw channels as well (`--accent-rgb: 29 107 243`) and declaring
the colours as `rgb(var(--accent-rgb) / <alpha-value>)`. The hex is still emitted for plain CSS
and for the React Native theme object.

**To check:** the same holds for NativeWind on mobile. There the colours are still plain
`var(--x)`, so `bg-accent/10` in the native app probably does not work either. I did not touch
it because NativeWind resolves variables on its own and the swap needs a test on a device.

### 1b. Fixed white text on top of the accent

In the dark theme the accent is light (`#5C9DFF`), so every `text-white` on top of it was
unreadable. That was 20 occurrences on the web and six `ON_PRIMARY = '#FFFFFF'` constants on
mobile; all of them moved to `on-accent`, which is the correct per-theme pair.

**Careful on mobile:** `style={{ color: 'var(--x)' }}` does NOT work in React Native — only
`className` goes through NativeWind. The importance/difficulty scale, which was a raw hex in an
inline style, became a class (`bg-accent`, `bg-flame`, …) because of that.

### 2. Expo's `userInterfaceStyle` was pinned to `light`

With that, `useColorScheme()` would answer light forever and "system" mode would never go dark
in the native app. Changed to `automatic` in `app.json`.

### 3. The data dependencies still stand

Nothing changed since the audit: the weekly bars in Better/Worst area, the per-habit streak
record, the check-in total and the heatmap are all still without data in the API. The components
that would display them were written to **degrade without the data** (they hide the element),
not to invent a number.

Two concrete decisions in the widgets, both commented in the code:

- **Streak strip** (Streak widget): with no daily history, the 28-day strip highlights only the
  CURRENT run — which is real data — and leaves the rest neutral, with a legend saying so. A
  dimmed square does not mean "I failed", it means "we do not know"; the legend exists so nobody
  reads it wrong.
- **Better/Worst area**: they ship without the mockup's weekly bars. They show icon, name, level
  and the level's XP bar, which is what the API returns.

---

## Decisions taken during implementation

| Decision | Why |
|---|---|
| `background` (the old alias) points at `--surface` | 110 of the 136 uses were card/input/modal; the page background became an explicit `bg-bg` on the body, on the App wrapper and on the pages |
| The theme preference is a `"<mode>:<pack>"` string | The backend stores `themeInUse` as free text; this way mode and accent travel together with no schema migration |
| An unknown mode falls back to `system:beyou` | No account can be left with no theme when an old mode stops existing |
| The border sweep ran on a per-line heuristic | A line with a ternary = a selection state (stays on the accent); a line without = a neutral divider (becomes `border-border`). Afterwards I went through the cards and inputs that had a ternary on the same line by hand |
| The collapsed sidebar's label goes to `sr-only` | The e2e suite finds the links by accessible name; drop it from the DOM and the suite breaks |
| Every Geist weight is a family of its own on mobile | RN does not synthesize weight from a single file |

---

## Pending

### Not implemented in this round

- **Streak heatmap** (plan PR 5.3): depends on a history endpoint.
- **Expanded screens** (a habit, task or goal opened in detail, with stat tiles and a heatmap)
  do not exist: the card expands in place, as before.
- **Expo app**: it received tokens, typography, the brand, primitives and the new shell (the
  5-target bar, the assistant sheet), but the SCREENS themselves (habits, tasks, goals,
  categories, routines, configuration) still carry the old layout. This round's page-by-page
  review covered the web only.
- **Onboarding and tutorial**: they inherited tokens and components, but the designed reskin
  (scrim + accent ring on the spotlight, wizard with a selection Ring) was not done.
- **Feedback admin**: tokens only; the StatTiles and the mockup's list/detail split did not land.
- **The Routines page's snapshot mode and the habit/task picker**: they inherited tokens, but the
  context strip, the dedicated empty state and the multi-select search modal drawn in v1.19 were
  not implemented.

### Debt left on purpose

- The **aliases of the 8 old tokens are still emitted**. The cleanup phase (plan PR 7.1) has not
  run yet; until it does, new code can use an old name without noticing.
- `apps/web/src/components/ActionButton.tsx` references colours that do not exist in the theme
  (`primary-foreground`, `destructive`, `accent-foreground`) — it is a shadcn leftover with a
  single importer. I did not touch it: it deserves a decision on whether it goes.
- The Vite cache (`apps/web/node_modules/.vite`) holds root-owned files from some container run,
  and the dev server will not come up because of it. I validated everything through
  `npm run build` + a static server. It needs a `sudo rm -rf` from outside here.

---

### What e2e has to adapt (Beyou-e2e-tests repo, outside this PR)

The create form left the card area and became a modal in the four listings. That changes the
path, not the names:

1. `HabitFormPage.expectCreateFormVisible()` after `habits.goto()` fails — the form only exists
   once the modal is open. A click before it is enough:
   `authedPage.getByTestId("create-habit").click()`. Title, fields, radios and the submit button
   keep the same names.
2. `submitCreate()` now closes the modal on save (it used to leave an empty form on screen).
3. `HabitsPage.cardOf()` was already broken before this round: it looks for
   `ancestor::div[contains(@class,'border-primary')]` and the new card uses `border-border`.
   Suggestion: `ancestor::div[contains(@class,'rounded-card')][1]`.
4. `profile-persistence.spec.ts`: "Sunset" now resolves to `#E45A0B` (see above).
5. `tutorial.spec.ts` passes unchanged — the anchors moved onto the create buttons and the steps
   stay valid.

### Questions I want reviewed

1. **The login brand panel in the dark theme** uses `bg-accent`, which in dark is the light blue
   — it becomes a very luminous area next to a dark card. The text contrast is correct
   (`on-accent` is the navy), but perhaps the design calls for a deep accent in that particular
   panel. This needs a designer's eye.
2. **The border sweep's heuristic.** The "a line with a ternary = selection" rule was right most
   of the time, and I reviewed cards and inputs by hand, but the less obvious screens are worth a
   look (schedule routine, icon picker, AI wizard).
3. **The Balance radar moved off chart.js to SVG.** It gained theme and accent-pack support for
   free (canvas cannot resolve a CSS var) and took a dependency off the dashboard's path, but it
   lost the library's native tooltip. If the tooltip is missed, it can be reimplemented on top of
   the SVG.
4. **`CategoryForm` kept a `<select>` for experience** while the habit form became segmented.
   Swapping it is a logic change (the select returns a string, the segmented returns a number),
   so I stopped — it is a one-line follow-up if you want them matched.
5. **The geometry of the bar's centre button on Android.** The disc is absolutely positioned and
   14px of it sticks out of the parent; touch behaviour outside the parent on Android deserves a
   test on a device.

## Logged-in visual review (2026-08-03)

With a valid credential against the dev stack, I reviewed the rendered pages. Findings fixed in
the same pass:

- **"+1490 XP earned today"** on the Today widget: it was reading `perfil.xp`, which is the
  lifetime total. It now sums today's routine checks.
- **The routine card's day chips did not light up**: the backend stores `"Monday"` and the
  comparison was against `"MONDAY"`.
- **The Routines header** was three loose blocks and the picker showed the last five rolling
  days; it became a single card with the week from Monday to Sunday.
- **The profile in Configuration** had an 18px label and the photo's `alt` leaked out of the
  circle ("erfil" on screen).
- **Routines on mobile**: the week broke into two rows and the actions squeezed the routine's
  name.

A reminder that cost me time: in this project `sm` is **350px**, not 640 — the useful phone
breakpoint is `md` (712px).

## A phone pass over Routines (2026-08-03)

- **The day count is measured, not fixed.** The picker reads the row's width and shows 3 to 7
  boxes depending on the device (5 at 360px, 6 at 390px, 7 from ~430px). That let `overflow-x-auto`
  go — it was what clipped the calendar popover.
- **"More dates" became a column** (icon above the label) so it takes the width of one box
  instead of a wide pill.
- **The create button collapses to a "+" disc** below `md`. The label stays in the DOM as
  `sr-only`, so the accessible name is still "Create routine" — that is how e2e finds the button.
- **The routine card on a phone**: name, cadence, day chips and one bar. Two identical bars
  stacked never said which one mattered now; the one shown is the day's when the routine runs
  today, and the level's when it does not. The actions only appear on opening through the title.
- **The expanded interior left the old look**: it used a native checkbox, a green fill and the
  class `bg-ligthGray/40` (a token that no longer exists). It now uses the same check ring as the
  day's routine.

## The routine form and the assistant bubble (2026-08-03)

- **The assistant bubble ate the end of the page on desktop.** `ProtectedRoute`'s spacer was
  `h-20 lg:hidden` — it only existed for the mobile bottom bar. On desktop the bubble is
  `fixed bottom-6` and it fell over the last card; with a routine expanded, over the bottom edge
  and the last row. It became `h-20 lg:h-24`.
- **Create/edit routine** got the mockup's design (Type · Name · Sections · footer). The
  two-illustration fork was removed: it asked for a choice between "daily" and a format that does
  not exist. The type is now a field, with "as a list" disabled and visible.
- **`SectionsEditor`** became the owner of the section list; create and edit each kept a copy of
  the same drag-and-drop tree.
- **The icon picker (`iconsBoxSmall`)** had a fixed width (45vw / 160px / 12rem) and a 90px
  search field that cut the placeholder. It now follows the form's width. Also used in the quick
  create modals for habit and task.
- **Schedule** became the mockup's row of seven squares, with the shortcuts (Mon–Fri, weekend,
  every week) as pills and the day conflict resolved in a strip with "Free the day" instead of a
  hover tooltip.
- **Not implemented from the mockup:** the "Prefer specific dates?" link. The schedule model is
  day-of-week only (`schedule.days`); one-off dates need backend work. It joins the data
  dependencies list.
- **`addRoutineButton.tsx` was orphaned** (no importers) once create became a modal, and it still
  carries the `routine-add-button` anchor. I did not delete it because it is outside what was
  asked; a candidate for the cleanup phase.

## The habit/task picker (2026-08-04)

It replaced the two horizontal scroll rows and the two time fields that came BEFORE picking an
item. The new picker has search, a Habits/Tasks toggle, multi-select with the ring, an "already
in the section" state and a count on the button.

- **Times suggested in sequence** (`suggestSlots`, exported and covered by a test): they resume
  from the end of the section's last item and split what is left of the window between the chosen
  items; with no end time on the section, 15 minutes per item. The suggestion never lands outside
  the section, so `getItemTimeErrorKeys` passes by construction — before, the user typed two times
  and found out about the error afterwards.
- **Not implemented from the mockup:** quick create "asks only for name and icon". Today
  `habitCreateSchema` requires importance, difficulty, an icon **and at least one category** — and
  a category has no reasonable default to pick on the user's behalf. Trimming the form means
  deciding what the account gets by omission (product), so the quick create modals stay complete.
- `HabitOrTaskGroup.tsx` was the old row's card and went with it.

**Environment note:** the dev server container (`beyou-dev-env-frontend-1`) served a stale
`packages/i18n` bundle for a while — new keys showed up raw on screen even though they were
already in the file inside the container. A `docker restart` of the service fixed it; worth
remembering before hunting an i18n bug that does not exist.

## Fine adjustments (2026-08-04)

- **A ghost scrollbar.** Every authenticated page measured `min-h-screen` and the shell added the
  80/96px spacer — the document was always `100vh + spacer`, and even an empty page scrolled. The
  pages under the shell now measure `calc(100vh - spacer)`; login, boot and error stay
  `min-h-screen` because they have no shell.
- **The expand chevron on mobile.** The routine card and the form's section header hide the
  actions until opened, but nothing said they expanded. The chevron arrived next to the name (only
  below `md`, rotating 180° when open). The snapshot card already had its own.

## Collapsible dashboard sections + menu (2026-08-04)

- **"Today" becomes "Dashboard"** in the sidebar and the bottom bar. A new key
  (`NavDashboard`): the old "Today" is still used on the day chips, the Today widget and the
  tutorial's titles — touching it would break e2e.
- **The day's routine sections collapse** through a chevron, with the state saved in localStorage
  per day (`beyou-routine-collapsed` → `{ date: [ids] }`). A collapsed section shows icon, name,
  time and the day's XP chip — someone who finished the section buys back its space. Tomorrow it
  opens again. Covered by 3 tests (collapse persists, starts collapsed, is per day).

## Categories (2026-08-04)

- **Actions at the top of the card.** Edit and delete left the footer (they only showed when
  expanded, separated by a `border-t`) and moved to the header, left of the chevron:
  `md:opacity-0` revealed on `group-hover`/`group-focus-within` on desktop and always visible on
  a phone. Verified with a real hover: 0 → 1 and back to 0 on leaving.
- **"Used in" above the level bar.** The bordered footer that made the expanded content end
  clipped is gone; the expanded card ends on its own XP bar.
- **Isolated expansion.** The grid stretched the neighbouring cards to the expanded one's height
  (the default `items-stretch`), so the whole row "grew along" with one click. `items-start` on
  the grid: only the clicked card changes (measured: 165 → 261px when open, the neighbour steady
  at 165px).

## Goals (2026-08-04)

- **The form in the mockup's design** (create and edit): Name, Description, Motivation, Icon,
  Target + Unit (with the note that progress starts at 0 and rises through the stepper), Period
  (start/end side by side), Deadline as a segmented control and Categories, footer
  Cancel/Save goal. "Current progress" and "status" left the form: on edit they preserve the real
  value, on create they start at zero. The modal went from `max-w-4xl` to `max-w-xl` and got a
  title of its own (the title used to live inside the form).
- **The Delete button**: it was already wired to DeleteModal in the code — verified live end to
  end (create a throwaway goal → Delete → confirm → it leaves the grid). Whoever saw a dead
  button was on a stale bundle in the dev container, the same symptom as the raw i18n keys.
- **Module `t` vs the hook**: `goals.tsx` used `import { t } from "i18next"`, which works in the
  app but returns `undefined` in unit tests (i18n is only initialized during the app's boot). It
  moved to `useTranslation()` — identical in the app and testable. Worth checking other pages
  with the same pattern.

## Categories — the compact card and the form (2026-08-04)

- **The card in the mockup's design**: icon, name, actions at the top (hover on desktop, always
  on a phone), description and an XP bar with LV. The mockup has neither expansion nor "used in",
  so the expansion added in the previous round is gone — the card was 165–261px and became a
  fixed 152px.
- **The form**: Name, Description, Icon (the same compact picker) and, on create only,
  Experience as a segmented control with the note "adjusts the category's XP curve". Edit does
  not show experience — `editCategory` does not accept the field. The modal is `max-w-xl` with a
  title of its own.
- `CategoryForm`'s `onCreated` is still alive for the category selector's quick create
  (ChooseCategories), which also uses the form.

## A new delete modal + the category chevron (2026-08-04)

- **DeleteModal in the mockup's design** (shared by the four domains): the question as a
  left-aligned title, the item in quotes in the body ("X" and everything linked to it will be
  removed) and the actions on the right — Cancel (ghost) before Delete (destructive). The generic
  body replaces the underlined name that used to be there; we do not invent counts (the mockup
  cited "32 check-ins", data the API does not return per domain).
- **The category chevron is back**: the compact card got an always-visible chevron; open, it
  reveals "used in" (habits/tasks/goals as chips) or the hint to add the category somewhere.
  Closed, it is still the mockup's card.

## Habits, tasks and the category selector (2026-08-04)

- **The habit and task forms in the mockup's design**, the same skeleton as the other libraries:
  field by field in a column, importance/difficulty as segmented controls (1..4, the values the
  backend validates), experience segmented on create only, the icon through the compact picker
  and the footer Cancel/Save habit (or task). The task got the "single completion" switch with a
  note. Modals at `max-w-xl`.
- **The category selector became the mockup's catrow**: chips of icon + name (selected = a soft
  accent) and "New category" as a dashed chip in the row itself — it used to be a title with an
  add button above, which duplicated the "Categories" label on the goal form.
- **e2e has to follow** (separate repo): the habit and task forms' submit went from
  "Create"/"Edit" to "Save habit"/"Save task"; the importance/difficulty/experience radios keep
  the same names (the segmented control uses role=radio); a category is now a `role=checkbox`
  carrying the category's name.

## Actions at the top and isolated expansion (2026-08-04)

The same treatment as Categories, applied to the habit, task and routine cards:

- **Edit/delete at the top**, left of the chevron, revealed on hover (`md:group-hover`) and
  always visible on a phone. On the routine card, Schedule stays permanently in view — it is the
  main action.
- **The task lost its chevron.** Importance and difficulty already showed on the closed card;
  expanding only revealed the actions, which now live at the top. With no hidden content, the
  control had no purpose.
- **`items-start` on the habit, task and goal grids.** Without it the row stretches the cards to
  the expanded one's height and it looks like the whole line opened together — the same bug
  Categories had. Measured on Habits: expanded 197 → 457px, the neighbours steady at 197.
- Routines was already a single-column list, so there was nothing to fix in its expansion; only
  the actions' hover landed there.

## Deleting a routine and the "+" on a phone (2026-08-04)

- **The routine moved onto the shared DeleteModal.** It was the only entity with an inline
  confirmation (a "Confirm deletion? Yes / No" strip inside the card's header, which pushed the
  other actions around). The modal gained a `routine` mode; since there is no per-id edit slice
  to clear in that case, the switch does nothing and the list refreshes through `enterRoutines`.
- **Create becomes just the "+" on a phone in all five listings.** Only Routines had
  `collapseLabel`; Habits, Tasks, Categories and Goals showed the whole button and ate the
  header's width. Measured: 40×40px at 390px and 142px with the label at 1440px. Feedback's
  submit was left as it was — it is a form button, not a listing's create.

## The goal card (2026-08-04)

- **The percentage ring was removed** from the top right corner: the stepper's bar already shows
  the same progress, and the ring was occupying exactly the actions' corner. Edit/delete (hover
  on desktop, always on a phone) and the chevron moved in there.
- **Closed**: icon, name, description, category, stepper and a footer with the deadline + the
  cut-off date. **Open**: motivation, status and the full period.
- **"Complete" only once the target is met** — and at that point the `+` leaves the stage, since
  what is left to do is complete it (that is what pays the XP). A target of 0 never counts as
  met.
- **A completed goal** trades the stepper for **Undo** and shows the date + the XP earned
  (`Undo`/`Desfazer`, `+N XP earned`/`ganhos`).
- Tests: the two division-by-zero cases moved to reading the stepper's counter (the ring no
  longer exists) and three new ones arrived — Complete only at target, Undo on a completed goal,
  and expansion revealing the motivation.

## The Configuration page (2026-08-06)

- **Cards with no icon tile and no description** — the mockup has only the title. Four accent
  icons competing with each other pushed the content down.
- **The drawing's grid**: profile + preferences on the left, appearance + widgets on the right.
  The right column used to hold only the widgets. On a phone it stacks in a column.
- **Profile**: the photo and "Change photo" on one row at the top, full-width fields, "Save
  profile" on the right. The photo took 30% of the width and squeezed the inputs.
- **No card inside a card**: the preference blocks lost their own surface and the typography fell
  back to the label grammar (there were 18–20px titles inside a card whose title is 15px).
- **Language** became the system's segmented control (it was two 24px EN/PT squares); each
  block's "Save" became tonal, on the right.
- **The widgets' drop zone** went quiet: a lowered background and a thin dashed line in place of
  the 2px frame over a surface.

### A second pass over Configuration (2026-08-06)

- **Widgets became a compact list** (handle, position, icon, name, ×) with "+ name" chips for the
  available ones. It used to be two dashed zones with the widgets actually rendered: impossible
  to reorder on a phone and it never showed the order. Every change writes itself
  (`editUser({ widgetsId })`).
- **An Account section with Logout** — the button used to live in `header.tsx`, deleted when the
  sidebar was born; **since then there was no way to log out through the interface**. It purges
  redux-persist before the redirect.
- **Foldable boxes on a phone**: every section opens on tap (the profile starts open); on desktop
  the two columns stay open.
- **The mockup's order**: profile, widgets and account on the left; appearance and preferences on
  the right.
- **Save only on the profile**: streak and routine settings moved to writing on click, as theme
  and language already did. RoutineSettings' save-button tests became automatic-save tests.

### The phone menu in Configuration (2026-08-07)

- The boxes became the mockup's menu: an accent tile with an icon, the name and the chevron on
  the side. The profile shows an avatar, the name and "level N · xp/next XP" instead of the word
  "Profile".
- **Order per breakpoint without duplicating markup**: the columns use `display: contents` below
  `lg`, so the sections become direct children of the flex container and the phone's order
  (profile, appearance, preferences, widgets, log out) comes out of `order-*` classes. On desktop
  the columns are columns again.
- **Account became the red "Log out" row**, with no e-mail — it is already in the profile form.

## The Feedback page (2026-08-07)

- **The subject became a segmented control of three** (the icon only on the chosen option). As
  loose pills the three options looked like filters that stack, when they are exclusive.
- **Images got a drop zone**; attachments became chips with the file name. The 96px thumbnail
  grid pushed submit off screen on a phone with two or three screenshots.
- **The form inside a card**, labels in the system's grammar and a one-line footer: "prefer
  e-mail?" on the left, submit on the right (on a phone submit takes the width and the e-mail
  drops below).
- The long intro became the **header's subtitle**.
- Tests adjusted: the intro is now the subtitle, the image input is found by `aria-label` and the
  attachments are chips, not `img[alt]`.

## The Assistant panel (2026-08-07)

- **Desktop: a full-height side panel** flush to the right, in place of the 440px popover
  floating in the corner. Expanded is still the central overlay with the history column.
- **Phone: an 86% sheet** anchored at the bottom, rounded at the top (measured 726 of 844px), in
  place of full screen.
- **The header separates identity from context**: "AI Assistant" fixed and the conversation's
  subject in mono below. The title used to be the chat's name, which the agent renames on its
  own.
- **Tools became quiet chips** (mono, a light outline) instead of boxes with an accent
  background.
- **Suggestions above the input**, in a scrollable row, whenever there is a conversation — they
  only existed in the empty state before.
- **Adjustments along the way**: the panel from 420 → 520px, the sheet from 86% → 92%, and
  **full-screen mode was removed** along with the history column that only existed in it (the
  history is still on the header's button). The suggestions went back to wrapping, limited to two
  — in a scrollable row the third one was clipped at the panel's edge.
- **Not implemented from the mockup:** the created-entity cards with a "view" link. `agentSegment`
  only carries `tool`, `error` and `domains` — neither the entity's id nor its name arrives. It
  needs backend work; it joins the data dependencies list.

## The admin feedback console (2026-08-07)

- **The counts became StatTiles**; the filters became two compact selects on one row, with the
  label inside the "all" option.
- **List and detail split the screen** (`lg:grid-cols-2`): opening an item does not push the list
  out. On a phone the detail drops below; on desktop it stays `sticky` while the list scrolls.
- **A scannable row**: an icon per category, the title on one line, author and date in mono,
  status as a pill on the right. The e-mail left the list — it lives in the detail, where the
  reply is written (the test moved to reading the name).
- **Semantic status colours**: `FEEDBACK_STATUS_BADGE_CLASSES` still used `text-primary` and
  `border-description`, aliases of the old model.
- The captured context became mono key/value rows, as in the mockup.

## Empty states, notifications and celebration (2026-08-07)

### EmptyState

- `emoji` became `icon: ReactNode`: an IconTile with the entity's icon (`Folder`, `Repeat`,
  `ListChecks`, `CalendarDays`, `Trophy`, `LayoutGrid`, `History`), the same ones as the sidebar.
  An emoji does not scale with the theme and has no stroke weight; the empty state is part of the
  system, not a sticker.
- It gained `onAction` (for empty states that open a modal instead of navigating),
  `secondaryLabel`/`onSecondary` and `variant="ghost"`.
- **A search with no result uses `ghost`**: the title "Nothing found", one line of help and
  "Clear filters" with no primary-button weight — there is nothing to create there. The four
  listings started passing `onClearFilters` (the categories one clears only the search, its only
  filter).
- **Routines got the two empty states it was missing**: on the page, "No routines yet" with
  "Create routine" (opens the modal, through `onAction`) and the secondary "or ask the Assistant",
  which fires `openAgentPanel()`; on the dashboard, the CTA became "Schedule routine" instead of
  the generic "Routines".
- `SnapshotEmptyState` stopped having markup of its own and went through the shared component.

### NOTIFY

- `lib/notify.tsx` is the single shell. The `App`'s `ToastContainer` receives
  `icon={ToastTypeIcon}` and `closeButton={ToastCloseButton}`, so **the old `toast.*` calls
  inherit the new design without migrating call by call**; `notify.*` exists for when there is an
  entity icon or a subtitle.
- Position: `top-right` on desktop and `top-center` on a phone (`useIsDesktop`), at most
  `limit={3}`. `closeOnClick` is gone: with an explicit ×, closing by accident while trying to
  read is worse than one extra click.
- The dashboard's check-in started sending **the habit's own icon** with its name in the title
  and the motivational phrase in the subtitle. It used to be a generic green check with the
  phrase loose, and the position changed through a hand-written media query.
- CSS: `react-toastify` v11 extends through its own tokens (`--toastify-toast-width`,
  `-padding`, `-bd-radius`, `-shadow`), so the block in `index.css` sets the variables on the
  container instead of duelling over specificity. Two exceptions need two classes:
  `.Toastify__toast.beyou-toast` for the background (its light theme paints white and comes later
  in the cascade) and the `@media (max-width: 480px)` block, which turned the notification into a
  strip glued to the top with square corners.
- The timer: 2px, no track (`--wrp` with a height of 2px and an invisible `--bg`), in the tone's
  colour.

### Celebration

- The 96px bubble with "LV 3" inside became **the system ring, filled, with the level number in
  the centre** — the same piece as the check-in and the brand. A streak milestone uses the same
  ring with the flame and the day count.
- It gained "Continue". The automatic close at 4s stays: the button is a way out, not the only
  one.

## A dismissable invitation and the phone bar (2026-08-07)

- **The widgets invitation closes for good**: `useDismissed(key)` keeps the dismissal in
  `localStorage` under `beyou-dismissed:<key>`. A screen preference is not account data — it is
  not worth a round trip to the backend, and `perfil` is not even persisted. The × lives in
  `EmptyState` (`onDismiss`), so any other invitation can use it.
- **"More" stopped covering the shortcuts**: the panel and the bar share the same fixed
  container, stacked; the scrim sits behind both. The bar is the orientation for where you are,
  and having it vanish along was disorienting. It arrived with a handle at the top, the icon in a
  tile and the trigger toggling (and lit while open).
- **A taller Assistant**: `-mt-6` → `-mt-8`, with a blurred halo behind it. It is the only target
  on the bar that is not navigation, and the drawing has to say so.
- **Not followed from the mockup**: the sheet's "Profile" tile. The web has no profile route — it
  is a section of the configuration. It would land as a dead link.

## Expo: carrying the redesign to mobile (2026-08-07)

The native app had only the redesign's foundation (tokens, typography, brand, primitives,
authentication and the shell). The screens were still from the previous model. This round took
the web's design to them, screen by screen.

### What changed as a rule, not just as pixels

- **Hover does not exist on touch.** Where the web reveals edit/delete on hover, mobile leaves
  them ALWAYS visible — which is what the web itself does below `md`. It holds for habit, task,
  category and goal.
- **The native Alert left every deletion.** It carries no theme, no typography and not the item's
  name, and the button order belongs to the platform. Mobile's `DeleteModal` is the same design as
  the web's. Only the "day already scheduled" Alert in `ScheduleSheet` remains, and that is not a
  deletion.
- **The bottom bar cannot vanish.** The "More" panel was a `Modal` — another window, which
  covered the shortcuts. It is now a sibling of the bar, anchored at `bottom: '100%'`, with the
  scrim behind both.
- **Local persistence uses `expo-secure-store`.** The same call as `viewFiltersStore`: it is the
  native dependency already installed, and bringing in AsyncStorage would force a rebuild. It
  holds for the dismissed widgets invitation and for the per-day collapsed sections. Since the
  read is asynchronous, `useDismissed` starts DISMISSED and only opens up after reading — the
  other way round, a dismissed invitation would blink on every launch.
- **No blur in RN.** The assistant's halo is two translucent discs.
- **No `<select>`.** `SelectField` is a control with the inputs' shell that opens a sheet — more
  comfortable than a wheel picker over a list of thirteen sort options.

### New pieces on the native side

`EmptyState`, `DeleteModal`, `SelectField`, `ListToolbar`, `AttributeChip`, `BeyouToast` (+ the
host that reads the inset from inside SafeAreaProvider), `form/FormModal`, `form/FormField`,
`ProfileHeaderRow`, `useDismissed`, `lib/dismissedStore`, `lib/collapsedSections`,
`ui/sortOptions` and the copy of `routineMetrics`.

`routineMetrics` is a literal copy of the web's: pure logic over the shared types, living in both
apps until somebody moves it into a package. Touch one, touch the other.

### What was left out

- The "Profile" tile in the "More" sheet (neither web nor mobile has a profile route — it is a
  section of the configuration).
- `RoutineBuilder` and `SectionCard` are still in the previous design; only the section's item
  picker was aligned.
- The admin feedback console does not exist on mobile.

## Web ⟷ mobile parity, screen by screen (2026-08-08)

A pass comparing the web at 390px (agent-browser) with the app on the emulator, page by page.
What only showed up once the two sat side by side:

- **The cards' chevron did not render.** `transform: rotate` in the `style` of a
  `lucide-react-native` icon makes the SVG vanish — `react-native-svg` does not accept the
  transform there. Where the web rotates a chevron, mobile now SWAPS the icon
  (`ChevronRight`/`ChevronUp`). It held for configuration, the day's section and the routine card.
- **This build's Hermes has no `Intl.PluralRules`.** Without it i18next cannot find
  `_one`/`_other` and falls back to the base key — which in several cases is just the label, so
  "1 rotina" became "Rotinas". `src/lib/pluralRulesPolyfill.ts` covers both languages (en: one
  only for 1; pt: one for 0 and 1, as CLDR has it) and is installed before init. Cardinal only:
  nothing in the app uses ordinal.
- **`Button` swallowed `className`.** It fell into `...rest` and the spread replaced the computed
  className, so anyone passing a width lost the background along with it. Silent and easy to
  repeat; it is now destructured and merged.
- **A resting action icon is `text-3` in both tones.** The red bin on mobile was shouting; on the
  web the destructive tone only appears on hover, and here only in the touch's background.
- **Screens that were still on the old model**: profile (fields with no labels, a centred save),
  language (the little EN|PT box), routines (four big numbers + a sort pill the web does not have)
  and the dashboard's header (an avatar + a level ring inside a card). All of them moved to the
  web's design.
- **Two things missing on both sides**: goals with no status filter on mobile, and the agent's
  created-entity card with no equivalent on the web. The card was PORTED TO THE WEB — mobile had
  already solved what I had noted as unfeasible, deriving the destination from the tool's name
  instead of the entity's id.

### Differences kept on purpose

- Mobile has a back chevron in the screens' header; the web does not need one (a sidebar on
  desktop, a bar on a phone).
- The icon picker is an inline grid on the web and a sheet on mobile — a six-column grid inside a
  scrollable form is not the touch pattern.
- The assistant's button went higher on the web (`-mt-8` → `-mt-11`) and lower on native
  (`top: -18` → `-12`), as requested.

## Mobile colour tokens: the shape matters (2026-08-08)

`bg-success` painted nothing in the native app — the completed goal's bar was left with only its
track, and the "Completed" chip came out with no background. `bg-flame` and `bg-accent`, in the
same file and on the same line, painted fine.

The cause was the token's shape in mobile's `tailwind.config.js`: `var(--x)` instead of
`rgb(var(--x-rgb) / <alpha-value>)`. Without the raw channels Tailwind v3 emits no slash classes,
and the element is left WITH NO BACKGROUND — which is literally what the comment in `cssVars.ts`
already warned about, and why `themeToVars` publishes every colour twice. The web already used the
channel shape; mobile had been left behind.

Mobile's config now mirrors the web's. That fixes, in one go, all 49 slash classes that existed in
the app (`bg-accent/10`, `bg-danger/10`, `border-border/40`, …) and silently painted nothing.

The lesson for the next colour born here: a new token goes into BOTH configs in the channel shape,
or its opacity variant dies quietly.

## The dashboard's widgets on native (2026-08-08)

The seven native widgets were still in the old design: a big centred title, a full-width stack,
and content that matched nothing on the web. They are now a mirror of `baseDiv`: a 12.5px header
in `text-2` with the icon on the left, `px-[18px] py-4`, and the data below.

What changed per widget:

- **Streak** — the number in mono, "days in a row · best: N" and the last 28 days as a strip in
  two rows of 14.
- **Today** (daily progress) — a 108px ring with the percentage and "of the day", and beside it
  what that means: items completed and **the day's XP** (from `getRoutineStats`, not `perfil.xp`,
  which is the account's lifetime total).
- **Better / Worst area** — a coloured tile with the category's icon, the name,
  `LV n · xp/next XP` in mono and the level's bar (green / flame).
- **Level** — the thin bar with `xp` and `nextLevelXp` in mono at the ends. No gradient: in RN
  that would need an svg library just for an 8px ramp.
- **Fast tips** — a lightbulb tile, the tip, and the footer "tip N of 8".
- **Life balance** — the same radar as the web (a two-ring mesh, the series in a translucent
  accent, labels outside with the anchor depending on the side).

And the widgets became a **carousel with page dots**, the way the web does it on a phone: stacked,
every new widget pushed the routine and the goals further down.

Two details that only showed up on the device:

- The streak strip came out **empty**. A percentage width plus `aspect-square` gives a square no
  height in RN. The side now comes from the strip's `onLayout` — and is rounded DOWN to the
  physical pixel, because with a fractional value RN rounds every square up, the row overflows the
  width and the 14th drops to the line below (it was 13 per row).
- I tried making the short cards grow to the track's height with `flex-1`; `flex-1` brings
  `flex-basis: 0%` and, with an auto-height parent, the card collapsed to nothing. It stayed as on
  the web: the track has the height of the tallest slide (the radar) and the short ones leave a gap
  below.

The carousel measures the width in `onLayout` instead of using `Dimensions`: the block lives
inside the dashboard's padding, so the full screen would give a slide that is too wide. That makes
the measurement mandatory in the test — `DashboardWidgets.test.tsx` fires the `layout` event after
mounting.

## Authentication on native (2026-08-09)

The five auth screens belonged to another app: big "Login | Register" tabs at the top, a 30px
greeting, unlabelled 56px fields, fixed-width buttons, an EN|PT picker and the brand at the FOOT
of the screen.

Now there is `src/ui/auth/AuthShell.tsx`, a mirror of the mobile branch of the web's `AuthShell`:
the brand at the top (the symbol in the accent, the wordmark in the text colour), a centred 360px
column anchored to the top, and the one-line footer that leads to the sibling screen. Login,
register, recovery, reset and verify all went through it.

What came along:

- `Input` gained `label` — the 12.5px label above the field, which is the system's default. On the
  auth screens the fields use `compact` (42px), as on the web.
- `src/ui/auth/FormNotice.tsx`, a mirror of the web's. Every screen used to draw its own notice: a
  double-bordered box on register, a centred 48px icon on recovery, a loose paragraph on login.
  Same notice, three shapes.
- The Google button became full width at 44px with the "or" divider above, as on the web — and the
  divider lives in the button's component, also as on the web.
- The CTAs became `size="auto" className="w-full"`: full width instead of a fixed 250px.

Three deliberate removals:

- **The Login|Register tabs** (`AuthTabs`) — the web switches screens through a footer link. Two
  24px tabs at the top pushed the form below the fold.
- **The language picker** (`LanguageToggle`) — before an account exists the app follows the device
  (`src/i18n.ts` reads `getLocales()`), as the web follows the browser. Switching language is
  something a logged-in user does, in Configuration.
- **`MobileBrand`** at the foot — the brand is the shell's header now.

One conscious departure from the web: on recovery, reset and verify the title DOES show on native,
even though on the web it is `sr-only` at this width. A browser has an address bar to say where you
are; the app does not, and "an e-mail field under the logo" does not say what the screen is for.
Login and register stay title-less, as on the web.

## Routines: the two surfaces meeting in the middle (2026-08-09)

Not every difference between web and native was the web being right. In this pass two screens went
each way.

**Native followed the web on two:**

- **Schedule** was seven full-width rows, one per day — the week did not fit in a glance and the
  panel took more than half the screen. It is now the row of seven squares from the web's modal,
  with the group chips (Mon to Fri / Weekend / Every week) and the actions in the footer. The day
  another routine already holds is marked on the square itself and gains a row with "Replace day",
  instead of the system's `Alert.alert`: the decision happens where it is written whose day it is.
- **Create / edit routine** was a tall card per section with three text links below ("Edit ·
  Assign habits and tasks (3) · Delete") and the list always open — three sections did not fit on
  screen. It is now the web's form: Type (segmented, with "As a list" dimmed instead of hidden),
  Name, and the sections as closed rows with an icon, the name, the pair of time chips, favourite,
  edit and delete. Open, a section shows its items as pills with × and the invitation "Add habit or
  task".

  Two differences kept on purpose: the order arrows live INSIDE the open section (in the header
  they would be five targets on a 390px row, and the header is what needs to match the web's); and
  the routine's ICON field is gone, because the web never had one and nothing in the interface
  draws that icon.

  This retired the type-choice screen (`RoutineTypePicker`), which opened creation with two
  illustrations before the first field.

  The SECTION sheet came along, in the same modal as the web's: a name with the placeholder "Calm
  morning", the two times side by side, an icon and — on create only — the **"Your favourite
  sections"** list with a Use button, which was missing entirely on native. The library is every
  favourited section of ANY routine (the routines slice flattened, the same source as the web), and
  the copy comes out with a new id on the section and on the groups: carrying the source id over
  would make an edit write on top of it.

**The web followed native on two** (the native design was better, and the user picked it):

- **The historical view** had three medals (Sections / Completed / Progress), a percentage bar, the
  date repeated in a chip and a chevron to open it. A lot of frame to say "2 of 10". It is now
  native's summary strip (Completed · Skipped · XP earned) and one card per section, all open. As a
  bonus, the list started walking the STRUCTURE and finding each item's check by `originalGroupId`
  — duplicating a habit across sections with the same name becomes impossible by construction, and
  an item with no check still shows.
- **The expanded routine** on the routines page had a section header with a 32px tile and
  single-line rows, with no time on a phone and no skip. It now uses the same design as the
  dashboard's routine and native's: a one-line header (a loose icon, a 12.5px name, the time in
  mono) and the item's row breaking into two on a phone, with the time chip and the skip button.
  **Skip started existing there** — only the dashboard's routine had it before, and the same item on
  the routines page had no way out.

## Picking items for a section: both screens on one model (2026-08-09)

Each did half the job. The web let you tick several, but the times only showed up AFTERWARDS, in
the section's list — fixing one was another trip. Native had the tray with editable times, but the
item arrived with no time at all, and it still asked for a second tap on an "Add (N)" button.

Now both do the same: **one tap sends the item to the tray with a suggested time, the time can
still be adjusted there, and only on confirming does the tray become the section.** On the web the
tray opens with whatever the section already has, so an old item's time can be fixed in the same
pass.

The time calculation (`suggestSlots`) left the web's component and moved to
`packages/state/src/routine/suggestSlots.ts` — both screens use the same one.

One rule changed along with it: splitting what is left of the window only makes sense when you
know HOW MANY items arrive at once. Picking one at a time, dividing by 1 gave the whole window to
the first and left zero for the next. A single item now takes the default 15-minute slice, capped
at what remains; the equal split still holds for `count > 1`.

### What you pick no longer gets lost

After the model changed, the worst kind of bug showed up: add five items, leave, and nothing
happened. Two causes, both fixed:

- The sheet's panel did not shrink (only the middle had `flexShrink`), so it sat at the content's
  size and the footer — with the done button — dropped OFF screen. Nobody presses a button they
  cannot see.
- Closing through the backdrop or the system back discarded everything. Closing now SAVES: what
  you pick there only touches the routine's working copy, and what really writes is the routine's
  button — discarding in silence was just a trap. The sheet's "Cancel" goes with it: there was
  nothing to cancel.

On the web the tray's row also stacked (name on top, times below, as on native): on a single row,
name + two time fields + remove did not fit the modal's 448px and the name was left with one
letter.

### One cap per sheet

Putting the 85% cap on the `KeyboardAvoidingView` made the percentages start counting — and then
the `max-h-[70%]` that `SelectField` was still passing to the panel became 70% OF 85%: the options
sheet shrank, detached from the bottom and showed the screen behind it. `maxHeight` left
`BottomSheet`; there is one cap now, the container's, for every sheet.

Along with it: the options list grows by default (`flexGrow: 1` is factory-set on `ScrollView`), so
the sheet stretched to the cap even with four options and left a white gap below the last one. It
shrinks now — the sheet has the options' height, and only scrolls when they do not fit.

## Two finishing fixes (2026-08-09)

- **A duplicate chevron on the web's routine card.** On a phone the actions row only appears with
  the card open — and that is exactly when the title's chevron is visible too. Two buttons, one
  function, one below the other. The row's became `hidden md:flex`; on desktop, where the row is
  always in view and the title's is gone, it is still the only one.
- **A misaligned section chevron (web and native).** It lived inside the name's column, so it stuck
  to the first line while the star, pencil and bin centred on the two-line block (name + time
  chips). It moved out into the row, where `items-center` centres it along with the rest.
- **The section sheet asking for a scroll to find Save.** The footer left the scroller and the
  favourites list got a cap of its own (three rows). And the panel's 85% cap moved to the
  `KeyboardAvoidingView`: a percentage only resolves against a parent with a definite height, and
  the view sized itself by its content — the panel's `max-h-[85%]` counted for nothing, and the
  middle shrank when it did not need to.

## Configuration: widgets and the theme's sentence (2026-08-09)

Native's widget picker was the last Configuration section outside the web's design: rows of plain
names with three loose controls on the right, and a Save button at the end. It is now the web's
list — position in mono, the widget's icon, the name, and the × to remove; the ones left over
become "+ name" chips. **And every change persists by itself**: Save no longer exists, same as the
web.

The web's drag handle is still a pair of arrows here (dragging does not exist on native, see
AGENTS.md), and because of that the help text got a key of its own (`WidgetsHintMobile`) — the
web's talks about dragging by the handle.

Elsewhere, the `ThemeHint` caption ("Two bases made with care…") left the theme picker on both
screens, and the key with it.

## The native app's launch (2026-08-09)

Before the first frame the Expo placeholder appeared — a grey grid with concentric circles,
stretched as `windowBackground`. `app.json` had no splash configured at all, so prebuild generated
the default.

The splash is now the brand, centred, over the theme's background: `#F5F7FA` in light and
`#0E1218` in dark (the system's — the user's theme only arrives after the profile).

The MARK only, no wordmark: on Android 12+ the splash icon is masked into a circle, and a vertical
lockup would be cut through the middle of the word. The mark is already a circle and lands
perfectly in the mask.

And the splash now HOLDS until the typography loads (`preventAutoHideAsync` + `hideAsync`). It used
to leave as soon as the RN view mounted and three screens appeared at launch: mark → white with a
spinner → app. The font gate also paints the splash's own tone instead of returning `null`, which
left a black frame in the middle.

## Verification done

- `npx tsc --noEmit` clean on both apps.
- The web suite and the mobile suite green on every commit (the counts vary as tests were updated
  alongside deliberate changes).
- The web's `npm run build` producing a bundle, and the login screen checked by screenshot against
  the mockup's Login section.
- **`profile-persistence.spec.ts` will fail and needs updating** (Beyou-e2e-tests repo, outside
  this PR): it seeds `theme: "Sunset"` and asserts `--primary` becomes `#FB923C`. Under the new
  model, "Sunset" migrates to `light:sunset` and the accent becomes **`#E45A0B`** — the pack's value
  in the mockup. The assertion needs the new value; the behaviour under test (a saved theme survives
  a reload) is still valid.
- **I did not run the e2e suite** (`Beyou-e2e-tests`): it needs the full stack up (the backend on
  the e2e profile + the `beyou_e2e` Postgres). That is the next verification step, and the risk sits
  in navigation's by-text selectors.
