# Beyou Frontend

[![CI](https://github.com/AndDev741/Beyou-Frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/AndDev741/Beyou-Frontend/actions/workflows/ci.yml)
[![CodeQL](https://github.com/AndDev741/Beyou-Frontend/actions/workflows/codeql.yml/badge.svg)](https://github.com/AndDev741/Beyou-Frontend/actions/workflows/codeql.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

User-facing web app for Beyou — a personal productivity app for habits, goals, routines, tasks, and categories with built-in gamification.

## Stack

- **React 18** + **TypeScript** + **Vite**
- **Redux Toolkit** + **redux-persist** for state
- **react-hook-form** + **Zod** for forms and validation
- **Tailwind CSS 3** with 9 themes via CSS custom properties
- **i18next** — bilingual (English / Portuguese)
- **Vitest** + **@testing-library/react** for tests

## Quick start

```bash
npm install
npm run dev      # dev server on port 3000
npm run test     # run all tests
npm run build    # production build
```

Configure backend URL in `.env` via `VITE_API_URL` (defaults to `http://localhost:8099`).

## License

Apache License 2.0 — see [LICENSE](LICENSE).
