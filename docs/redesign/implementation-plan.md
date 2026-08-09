# Beyou redesign — implementation plan

Execution plan for the approved visual redesign. The reference drawing is the mockup
(`beyou-redesign-mockup.html`, published as an artifact); the tracking card is
["Pensar em uma logo melhor e atualizar app background e web favicon"](https://app.notion.com/p/3962c12010f08010b806fa2ad2532ba4).

This document is the spec for whoever implements it. Every PR below is self-contained: it
states the goal, the files, the guards that must not break and how to verify.

---

## Assumed decisions

Three decisions were open. The plan assumes the answers below; where an answer changes the
work, it is noted on the matching PR.

| Decision | Assumed | If it changes |
|---|---|---|
| Theme model | The 9 themes become 2 bases (light/dark) + accent packs | Only PR 1.2 changes shape |
| Mobile sequencing | Paired by domain: web and mobile of the same page back to back | Reorders phase 6, nothing else |
| Surfaces with no mockup | Everything is settled in the mockup (v1.19: 100% coverage) | — |

Open design questions: **all resolved in mockup v1.19 (2026-08-02)** — snapshot and item
picker (6.2), the cards of the 3 widgets with a chart-colour spec (6.1), loading states (3.2),
Expo auth + the assistant sheet (4.4/6.8), "Open in the app" on the reset/verify cards. No PR
is blocked on design.

---

## Data dependencies

The design is settled, but four of its details show information the API does not return today.
None of them blocks the redesign: they are backend additions that can land later, as long as
the component is written to degrade without the data (hide the element, do not break).

| What the mockup shows | Where | State today | Way out |
|---|---|---|---|
| Weekly bars in Better area and Worst area | PR 6.1 | There is no per-category daily XP. The current widget only shows icon, name, level and an XP bar — no chart at all | An endpoint for a weekly per-category series, or ship the card without the bars in v1 |
| "best: 9" (the habit's streak record) | PR 6.3, expanded habit | `HabitResponseDTO` returns only `constance`. `maxConstance` exists, but belongs to the **user**, not the habit | A new field on the habit DTO |
| "Check-ins 32 since Jun 12" | PR 6.3, expanded habit | Neither the total nor the first check-in's date exists on the DTO | Two new fields on the habit DTO |
| A 16-week heatmap | PR 5.3 | No daily completion history is exposed | A history endpoint (it was already off the critical path) |

What **does** exist and can be used freely: the user's `maxConstance` (backend
`UserResponseDTO` and `RefreshUserDTO` → frontend `UserType` and `perfilSlice`), so the
"best: 21" on the Streak widget and on the profile is covered. And the decayed XP of a late
check that snapshot mode shows is real: the XP decay strategy exists and is configurable in
Configuration.

---

## Guards — they hold for every PR

1. **Navigation labels do not change.** The e2e suite uses 68 selectors by text/role against
   2 by testId. `Routines`, `Habits`, `Config`, `Categories`, `Next`, `Continue`, `Skip`,
   `Get Started` and the page headings have to survive. If a text must change, add a
   `data-testid` **first** and update the spec in the same PR.
2. **Tutorial anchors travel along.** `data-tutorial-id` (`dashboard-shortcuts`,
   `shortcut-*`, `dashboard-routine-today`, `dashboard-profile`, `habits-grid`,
   `categories-grid`, `routine-*`, `agent-fab`, `feedback-fab`) has to keep mounting on some
   visible element. Break the anchor and you break `tutorial.spec.ts`.
3. **No hardcoded hex.** Today that is 24 occurrences on the web (8 in `themes.css`) and 23
   on mobile. That number does not go up. Colour comes from a token.
4. **No Tailwind `dark:`.** Nothing in the app adds the `.dark` class — the 14 current
   occurrences are dead code and PR 1.4 removes them. The theme resolves through CSS vars at
   runtime in `ThemeProvider`, not through a class variant.
5. **Text in `en` and `pt`.** New keys go into both files
   (`packages/i18n/src/{en,pt}/translation.json`). `translationKeys.test.ts` covers parity.
6. **`prefers-reduced-motion` respected** in any new animation.
7. **Minimum verification per PR:** `npm run test` at the root (turbo runs web + mobile) and
   `npm run typecheck`. PRs in phases 4 and 6 also run the e2e suite against the e2e stack.

---

## Phase 1 — Foundation

### PR 1.1 — The token layer

**Goal:** the whole app moves onto the new palette without a single component being touched.

The current model has 8 tokens; the new one has 13, and the semantics change (today
`secondary` is the text colour and neither `surface` nor `border` exists). The bridge is to
keep the 8 old names as **aliases** of the new ones. Since a component on its own cannot know
whether `bg-background` meant card or page, the alias picks the dominant case:

| Old token | Becomes | Why |
|---|---|---|
| `background` | `--surface` | 110 of the 136 uses are a card, an input or a modal |
| `secondary` | `--text` | it is the main text colour today |
| `description` | `--text-2` | |
| `placeholder` | `--text-3` | |
| `icon` | `--text-2` | |
| `primary` | `--accent` | |
| `success` | `--success` | |
| `error` | `--danger` | |

The page background (`--bg`) starts being applied explicitly on the `body`
(`apps/web/src/index.css`) and on the `App.tsx` wrapper, which use `bg-background` today —
those are the 26 uses in `pages/` that need a manual review in this PR.

**Files:**
- `packages/theme/src/theme.ts` — the `Theme` interface with the 13 new fields; the 8 old ones
  stay on the type, marked `@deprecated`, for the 219 `theme.*` uses in JS.
- `packages/theme/src/listOfThemes.ts` — the two bases (`beYou`, `beYouDark`) gain the new
  fields; the other 7 themes get provisional derived values (the definitive model is PR 1.2).
- `apps/web/src/context/ThemeContext.tsx` — the `root.style.setProperty` block starts emitting
  the 13 tokens **and** the 8 aliases.
- `apps/web/src/themes.css` — the same variables on `:root` (a fallback before JS runs).
- `apps/mobile/src/theme/ThemeProvider.tsx` — `themeToVars` emits the 13 + aliases.
- `apps/web/tailwind.config.js` and `apps/mobile/tailwind.config.js` — new colours, a radius
  scale (`frame: 24px`, `card: 16px`, `control: 10px`) and the old names kept.
- `apps/web/src/components/widgets/utils/chartColors.ts` — starts reading the new tokens.
  Canvas cannot resolve a CSS var: the widget keeps reading a concrete colour off the `theme`
  object.
- `apps/web/src/components/habits/utils/useColors.tsx` — the 4 hex values go.

**Definition of done:** the diff touches no file under `components/` beyond the two colour
consumers named above. If it did, the alias is wrong. A screenshot of the dashboard and of
Habits in both themes, web and Expo, attached to the PR.

### PR 1.2 — Bases + accent packs

**Goal:** trade the 9 themes for 2 bases + packs, without orphaning any user.

`themeInUse` is a string persisted in the backend (`UserType`, `perfilSlice`). Every old mode
needs a destination:

| Saved mode | Becomes |
|---|---|
| beYou | light base + Beyou pack |
| beYouDark | dark base + Beyou pack |
| Sunset | light base + Sunset pack |
| Amethyst | light base + Amethyst pack |
| Midnight, Polar | dark base + Beyou pack |
| Cyberpunk | dark base + Cyber pack |
| Mocha | light base + Sunset pack |
| Late Latte | dark base + Sunset pack (it is a DARK theme: bg #2c1e1e) |
| unknown | base from the OS preference + Beyou pack |

**Files:** `packages/theme/src/listOfThemes.ts` (bases + `accentPacks`),
`apps/web/src/services/user/hydratePerfil.ts` (the fallback when reading the profile),
`apps/web/src/components/configuration/ThemeSelector.tsx`,
`apps/web/src/components/authentication/ThemeSelectorInline.tsx`,
`apps/mobile/src/ui/ThemeSelector.tsx`, `apps/mobile/src/theme/ThemeSync.tsx`,
the theme names in `packages/i18n`.

**Guard:** `ThemeContext.test.tsx` covers the account → localStorage → OS precedence. The four
cases keep passing, plus a new one: an unknown mode falls back.

**If the decision changes** (keep the 9 themes): this PR becomes "express the 9 themes in the
13 tokens" and the migration map goes away.

### PR 1.3 — Geist typography

**Goal:** Geist in the interface, Geist Mono on numbers, XP and times.

Today the web loads Inter from Google's CDN (`apps/web/index.html`) and uses
`fontFamily.mainFont` through the `font-mainFont` class in `App.tsx`.

**Files:**
- `apps/web/public/fonts/` — self-hosted woff2 (avoids the third-party dependency and the
  CDN's FOUT).
- `apps/web/index.html` — the Google `<link>` goes, a `<link rel="preload">` of the critical
  weight arrives.
- `apps/web/src/index.css` — `@font-face` with `font-display: swap`.
- `apps/web/tailwind.config.js` — `sans: Geist`, `mono: Geist Mono`; `mainFont` becomes an
  alias of `sans` so `App.tsx` does not break right away.
- `apps/mobile/` — fonts in `assets/fonts/`, `useFonts` in `app/_layout.tsx` with a splash gate
  until they load, `fontFamily` in `tailwind.config.js`.

**Guard:** tabular numbers. Wherever there is XP, a level, a count or a time, the class is
`font-mono`.

### PR 1.4 — Surfaces instead of borders

**Goal:** kill the blue border, the most dated trait of the current look.

That is 204 occurrences of `border-primary` on the web and 134 on mobile. Most are a neutral
divider and become `border-border`; only the selection states stay on the accent (active
option, ticked chip, focused input). The PR also normalizes the radius to a one-family-per-layer
scale (card 16, control 10, frame 24, pill full) — today `rounded-md`, `lg`, `xl`, `2xl` and
`[20px]` coexist with no criterion — and removes the 14 dead `dark:` variants.

**Guard:** it is a large but mechanical sweep. Review the diff looking for the cases where the
blue border was deliberate; they are few and the mockup shows which.

---

## Phase 2 — Brand (parallel to phase 1)

### PR 2.1 — The brand on the web

The symbol: a ring at 83% with the gap to the north-east and the check pointing at the gap. The
16px variant has a thicker stroke (`r=23`, `stroke-width=11`) because a stroke of 8 disappears
at that size.

`apps/web/public/favicon.svg`, `apps/web/index.html` (`theme-color`),
`apps/web/src/components/authentication/logo.tsx`,
`apps/web/src/components/authentication/MobileBrand.tsx`. The wordmark unified in lowercase:
"beyou" — today the app alternates between "Be you" and "Beyou", translations included.

### PR 2.2 — The brand on Expo

`apps/mobile/src/ui/Logo.tsx`, `apps/mobile/src/ui/MobileBrand.tsx`,
`apps/mobile/assets/{icon,splash-icon,android-icon-foreground,android-icon-background,android-icon-monochrome}.png`,
and the adaptive icon's `backgroundColor` in `app.json` (today `#0082E1`).

**Careful:** the Android icon is adaptive — the mark has to fit inside the safe area (66% of
the canvas), or the launcher crops the ring.

---

## Phase 3 — Components

The mockup has an inventory section; that section is the contract. One component per piece, and
the same piece everywhere.

### PR 3.1 — Web primitives

- **Ring** — a single component for the logo, the check-in, the level ring and the day's
  progress (`size`, `progress`, `state`, `showCheck`). If they drift apart, the brand's
  signature breaks. It absorbs today's `progressRing.tsx`.
- **Chip** — variants `flame`, `xp`, `time`, `cat`, `ok`, plus an `sm` size. `time` and `xp` in
  mono.
- **Card / Surface** — the end of `bg-background + border-primary` copied around.
- **IconTile** (the tile behind a habit's icon) and **IconButton** (the quiet edit and delete
  actions).
- **Button** — refactor the mockup's 4 modes (primary, tonal, ghost, danger) with drawn states,
  and kill the fixed `w-[250px]` / `w-[120px]` widths. There are 42 importers: the component
  keeps its current API (`text`, `size`, `mode`) and gains the new modes, so the sweep can be
  incremental.
- **Skeleton** — the mockup's loading decision (the "Loading" atom): the skeleton mirrors the
  card it replaces, a 1.6s shimmer switched off under `prefers-reduced-motion`; a centred
  spinner **only** on the boot's auth gate.

### PR 3.2 — Web composites

**PageHeader**, **Toolbar** (search + sort + filter, rebuilt in every listing today),
**SegmentedControl** (importance, difficulty, experience, mode), **Stepper** (goal progress),
**StatTile**, **XpBar** + **LevelChip**, **OptionCard**, **GhostAdd**.
`Modal` and `EmptyState` already exist and only align with the system — `Modal` already has
focus handling, Escape and `aria-labelledby`; do not regress that.

Loading states: settled — use the `Skeleton` primitive from PR 3.1 on the five web pages with a
loading gate (and on mobile, in 3.3).

### PR 3.3 — The mobile mirror

The same pieces in React Native (`apps/mobile/src/ui/`). A component cannot be shared between
DOM and RN; what is shared is the token. Keep names and props identical to the web's so the
next developer does not have to learn two vocabularies.

---

## Phase 4 — Shell and navigation

### PR 4.1 — Web sidebar

A collapsible sidebar in the confirmed order: Today, Categories, Habits, Tasks, Routines,
Goals; in the footer, **Feedback** (decision v1.16: its own item, above Configuration) and
Configuration, next to the user. It replaces the blue bar (`components/header.tsx`) and the
shortcut column (`components/dashboard/shortcuts.tsx`).

The menu item replaces the floating `FeedbackLauncher` — the feedback bubble dies in this PR
(only the assistant's bubble keeps floating). The tutorial's `feedback-fab` anchor moves from
the launcher to the sidebar item.

**Expected label collision:** the mockup spells "Configuration" out and the e2e suite selects
"Config" by text — apply the procedure from guard #1 (testId first + spec in the same PR).

**Twelve files render `<Header>` today** — 7 app pages, 4 auth pages and the admin. The app
pages stop rendering a header of their own: the shell is mounted once, in `ProtectedRoute.tsx`,
which already mounts `BottomNav`, `AgentWidget` and `FeedbackLauncher`. The auth pages keep
their own header.

**Critical guard:** `data-tutorial-id="dashboard-shortcuts"` and the six `shortcut-*` live in
`shortcuts.tsx` today. They need to mount on the new sidebar, or the tutorial and
`tutorial.spec.ts` break. Run `tutorial.spec.ts` in this PR.

### PR 4.2 — The web's responsive bottom nav

From 6 items to 5, with the Assistant in the centre and a "More" sheet for Tasks, Goals,
Categories, Profile, Configuration and **Feedback** (6 tiles, v1.16).
`components/dashboard/BottomNav.tsx`. `getByRole("link", { name: ... })` has to keep finding
the items that left the bar — they move into the sheet, so the spec may need one extra step to
open it.

### PR 4.3 — Expo's bottom nav

The same change in `apps/mobile/src/ui/dashboard/BottomNav.tsx` and `app/(app)/_layout.tsx`.

### PR 4.4 — The assistant panel

The floating bubble becomes a full-height side panel on the web and a near-full-screen sheet on
mobile. A header with the conversation's subject in mono, history, new conversation, expand and
close. Executed tools become quiet chips; created or changed entities become cards with an icon
and a "view" link.

**A product requirement, not negotiable:** the bubble exists on every authenticated page, web
and mobile, and it is the only way into the agent. There is no page and no navigation tab for
it.

The mobile sheet is drawn in the mockup (v1.19): 86% of the screen, opened by the centre
button.

---

## Phase 5 — Game moments

### PR 5.1 (web) and 5.2 (mobile)

`XpFloat` (the chip floats for 1.2s and goes), `CelebrationOverlay` (level-ups and streak
milestones at 7, 14, 21, 30, 60, 90 and 100), `RoutineCompleteSummary` (items, the day's XP,
streak) and the check-in ring's four states: to do, hover, done, skipped.

**Note from the review:** the "skipped" state's contrast was fixed in mockup v1.19 (`text-3`
border, `text-2` icon); implement it with those tokens and check both themes.

A snapshot check-in (a past day) does **not** fire a celebration — `useUiRefresh` already
receives `skipCelebrations`. Do not regress that.

### PR 5.3 — Streak heatmap

A new feature; it needs a check-in history endpoint (see "Data dependencies"). Off the critical
path: it only lands after aligning with the backend.

---

## Phase 6 — Pages

One PR per domain, web and mobile back to back so the design decision does not go cold between
the two platforms.

| PR | Page | Note |
|---|---|---|
| 6.1 | Dashboard / Today | Widgets complete in the mockup, with a chart-colour spec for chartColors.ts. **The weekly bars in Better/Worst area depend on data that does not exist** — see "Data dependencies" |
| 6.2 | Routines | Snapshot mode and TaskAndHabitSelector drawn (v1.19) |
| 6.3 | Habits | The library separated from the form; the description sits on the card. **The expanded habit asks for the best streak and the check-in total, which `HabitResponseDTO` does not return** |
| 6.4 | Tasks | Habits' skeleton with no XP and no streak |
| 6.5 | Goals | A stepper on the card; "Complete" only once the target is met; the editor has no current-progress field |
| 6.6 | Categories | |
| 6.7 | Configuration | Grouped sections; the widget list becomes drag-to-reorder |
| 6.8 | Authentication | Log in, create account, forgot, reset, verify; the Expo phone drawn; "Open in the app" on reset/verify |
| 6.9 | Feedback and admin | The admin is a `ROLE_ADMIN` route; test with a real admin account |
| 6.10 | Onboarding and tutorial | A reskin, no structural redesign — that is 7.4k lines tested end to end |

Every page PR: removes whatever old token is left in that scope, trades the ad-hoc cards for
the phase 3 components, and runs the domain's e2e spec.

---

## Phase 7 — Cleanup

- Remove the 8 token aliases; from here on only the 13 exist.
- Delete `components/header.tsx` and `components/dashboard/shortcuts.tsx`.
- Remove `mainFont` from Tailwind and the class from `App.tsx`.
- Update `CLAUDE.md`: the design-system section talks about 9 themes and about
  "never hardcode `#0082E1`, use `var(--primary)`" — both sentences age out in this redesign.

---

## Order and dependencies

```
1.1 tokens ─┬─ 1.2 packs ──┐
            ├─ 1.3 Geist ──┤
            └─ 1.4 borders ┴─→ 3.1 → 3.2 → 3.3 → 4.1 → 4.2 → 4.3 → 4.4 → 5.x → 6.x → 7
2.1 / 2.2 brand ─ parallel, no dependency
```

Phase 1 is the only real bottleneck: nothing from 3 onwards makes sense before the tokens
exist. 2.1 and 2.2 can ship at any point.
