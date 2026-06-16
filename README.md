<p align="center">
  <img src="apps/web/src/assets/authentication/Logo.png" alt="BeYou logo" width="160" />
</p>

<h1 align="center">BeYou — Frontend</h1>

<p align="center">
  A gamified personal-productivity app for habits, goals, routines, tasks, and categories.<br>
  One TypeScript codebase, two clients: a React web app and an Expo mobile app.
</p>

<p align="center">
  <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D20-3c873a" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6" />
  <img alt="Turborepo" src="https://img.shields.io/badge/monorepo-Turborepo-ef4444" />
  <img alt="Web" src="https://img.shields.io/badge/web-React%2018%20%2B%20Vite-646cff" />
  <img alt="Mobile" src="https://img.shields.io/badge/mobile-Expo%20SDK%2056-000020" />
</p>

---

BeYou helps people build better days. You define **categories** of life, attach **habits**, **goals**,
**tasks**, and daily **routines**, then check them off — earning XP, leveling up, and keeping streaks
alive. The app is bilingual (English / Portuguese), ships nine themes, and can draft a whole routine
for you with AI.

This repository is the **frontend monorepo**. It contains both user-facing clients and the shared
TypeScript core they have in common. The Spring Boot API lives in a separate `Beyou-backend-spring`
repository.

## Highlights

- **Two clients, one core** — a Vite + React web app and an Expo + React Native mobile app share the
  same domain types, Redux state, API repositories, validation schemas, themes, and translations.
- **Transport-agnostic API layer** — `@beyou/api` defines an `HttpClient` interface; the web injects
  an axios adapter and mobile a `fetch` adapter, so business logic never knows which client it runs in.
- **Gamification built in** — XP, per-habit levels, streaks, level-up and streak-milestone
  celebrations, and floating `+XP` feedback on check-in.
- **AI routine generation** — describe your day in plain language and preview a full draft (categories,
  habits, tasks, schedule) before confirming.
- **Theming & i18n as data** — 9 themes expressed as design tokens and `en`/`pt` resources, shared
  across both apps.
- **Type-safe backend contract** — backend types are generated from the OpenAPI spec and guarded
  against drift in CI.

## Repository structure

A [Turborepo](https://turbo.build/) driven by npm workspaces. Shared packages are consumed
**source-first** (no build step) via Vite and Metro path aliases — only the web app actually builds.

```
beyou-app/
├── apps/
│   ├── web/        @beyou/web      React 18 + Vite 5 + Tailwind 3 (dev on :3000)
│   └── mobile/     @beyou/mobile   Expo SDK 56 + React Native 0.85 + Expo Router + NativeWind
└── packages/
    ├── types/      @beyou/types        Shared domain types (habit, goal, routine, task, …)
    ├── theme/      @beyou/theme         9 themes as design tokens
    ├── i18n/       @beyou/i18n          English + Portuguese translation resources
    ├── state/      @beyou/state         Redux Toolkit slices + root reducer
    ├── api/        @beyou/api           Transport-agnostic HTTP client + API repositories
    ├── validation/ @beyou/validation    Zod schemas for every form
    └── contracts/  @beyou/contracts     Backend types generated from OpenAPI (drift-gated)
```

| Package | Responsibility |
|---------|----------------|
| `@beyou/types` | Plain TypeScript types for every domain entity and DTO. |
| `@beyou/theme` | The nine themes (beYou, beYouDark, Sunset, Amethyst, Midnight, Cyberpunk, Mocha, Polar, Late Latte) as colour tokens. |
| `@beyou/i18n` | `en` / `pt` translation bundles used by both clients. |
| `@beyou/state` | Redux Toolkit slices (categories, habits, goals, routines, tasks, profile, celebrations…) and the shared root reducer. |
| `@beyou/api` | The `HttpClient` interface and all API repositories. Adapters are supplied by each app at startup. |
| `@beyou/validation` | Zod schemas (auth, habit, goal, task, routine, profile, AI routine) reused by both web and mobile forms. |
| `@beyou/contracts` | TypeScript types generated from the backend's OpenAPI 3.1 spec, with a CI drift gate. |

## Tech stack

| Area | Web (`@beyou/web`) | Mobile (`@beyou/mobile`) |
|------|--------------------|--------------------------|
| Framework | React 18, Vite 5 | React 19, React Native 0.85, Expo SDK 56 |
| Routing | react-router-dom v6 | Expo Router |
| Styling | Tailwind CSS 3 + tailwind-merge | NativeWind v4 |
| State | Redux Toolkit + redux-persist | Redux Toolkit |
| Forms | react-hook-form + Zod | react-hook-form + Zod |
| HTTP | axios adapter | `fetch` adapter |
| Tests | Vitest + Testing Library | Jest (`jest-expo`) + Testing Library |

## Prerequisites

- **Node.js ≥ 20** and **npm 11.9.0** (the repo pins `packageManager`).
- For mobile: the **Expo** toolchain (installed via the workspace) plus the
  [Expo Go](https://expo.dev/go) app or an Android/iOS simulator.
- The **BeYou backend** running locally (or reachable on your network) at
  `http://localhost:8099/api/v1`. See the `Beyou-backend-spring` repo.

## Getting started

```bash
# 1. Clone and install (a single install at the root covers every workspace)
git clone https://github.com/AndDev741/Beyou-Frontend.git
cd Beyou-Frontend
npm install

# 2. Configure the web app's environment
cp apps/web/.env.example apps/web/.env
```

`apps/web/.env`:

```ini
VITE_API_URL=http://localhost:8099   # backend base (the /api/v1 suffix is added per request)
VITE_APP_URL=http://localhost:3000   # this app's own URL (used by the Google OAuth flow)
# VITE_GOOGLE_CLIENT_ID=...          # required only for Google sign-in
```

> [!NOTE]
> The mobile app reads `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:8099/api/v1`).
> When testing on a physical device, point it at your machine's LAN address rather than
> `localhost`.

### Run the web app

```bash
npm run web          # Vite dev server on http://localhost:3000
```

### Run the mobile app

```bash
npm --workspace @beyou/mobile run start     # Expo dev server (scan the QR with Expo Go)
npm --workspace @beyou/mobile run android   # open on Android
npm --workspace @beyou/mobile run ios       # open on iOS
```

## Common commands

Root scripts run across the whole monorepo through Turborepo:

| Command | What it does |
|---------|--------------|
| `npm run build` | Build every buildable workspace (the web app's production bundle). |
| `npm test` | Run all test suites (web + packages via Vitest, mobile via Jest). |
| `npm run typecheck` | Type-check every workspace. |
| `npm run lint` | Lint every workspace. |
| `npm run web` | Start the web dev server. |

Per-workspace scripts are available too, e.g.:

```bash
npm --workspace @beyou/web run build         # production web build
npm --workspace @beyou/web run test:watch    # watch-mode web tests
npm --workspace @beyou/contracts run check   # backend contract drift gate
```

## How the apps share code

```
              ┌─────────────────────────────────────────────┐
              │  packages/  (source-first, no build step)    │
              │  types · theme · i18n · state · validation   │
              │  api (HttpClient interface + repositories)   │
              └───────────────┬──────────────┬───────────────┘
                              │              │
            axios adapter ────┤              ├──── fetch adapter
                              │              │
                     ┌────────▼─────┐  ┌─────▼────────┐
                     │  apps/web    │  │ apps/mobile  │
                     │  React 18    │  │  Expo / RN   │
                     └──────────────┘  └──────────────┘
```

`@beyou/api` exposes `setHttpClient()`; each app registers its adapter at startup, so repository code
(`getHabits`, `createGoal`, `checkItem`, …) stays identical across platforms. The backend wire contract
is generated into `@beyou/contracts` from OpenAPI and verified by `npm --workspace @beyou/contracts run check`.

## Testing & CI

- **Web & packages** use [Vitest](https://vitest.dev/) with Testing Library.
- **Mobile** uses [Jest](https://jestjs.io/) via `jest-expo` and Testing Library for React Native.
- **GitHub Actions** (`.github/workflows/`) run on every push and PR to `main`:
  typecheck → build → test → contract drift check → dependency audit, plus a weekly
  **CodeQL** security scan.

```bash
npm test                                    # everything
npm --workspace @beyou/web run test         # web only
npm --workspace @beyou/mobile run test      # mobile only
```

> [!IMPORTANT]
> **Mobile contributors:** this workspace intentionally ships two React versions side by side —
> React 19 for `apps/mobile` (an Expo SDK 56 requirement) and React 18 for the web app. The root
> `package.json` `overrides` and `apps/mobile/metro.config.js` keep them isolated. **Do not run
> `npm dedupe`** — it collapses the two installs and breaks the mobile bundler. See
> [`apps/mobile/AGENTS.md`](apps/mobile/AGENTS.md) for the full rationale and the Expo Router /
> NativeWind conventions.

## Related repositories

| Repo | Purpose |
|------|---------|
| `Beyou-backend-spring` | Spring Boot API (PostgreSQL, JWT + Google OAuth, AI routine generation) on port `8099`. |
| `Beyou-e2e-tests` | Playwright end-to-end suite driving the full stack. |
| `Beyou-dev-env` | Docker Compose orchestration for local development. |
| `Beyou-arch-design` | OpenAPI specs and architecture / design documentation. |
