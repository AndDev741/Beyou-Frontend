# Running the BeYou Mobile App

Expo SDK 56 · React Native 0.85.3 · Android package `com.beyou.mobile`

Navigation: **Expo Router** (file-based, entry `expo-router/entry` in `package.json`;
routes live under `app/` — `app/_layout.tsx` is the root layout, `(auth)/` and `(app)/`
are the route groups). Styling: **NativeWind v4** (Tailwind classes in RN, themed at
runtime via CSS variables — see `src/theme/ThemeProvider.tsx`). The run commands below
are unchanged by either — `npx expo start` still does everything.

---

## 0. Backend must be reachable

The mobile app reads the backend URL from `EXPO_PUBLIC_API_URL`.

**`localhost` does not point at your machine from inside a device or emulator.**
Create (or edit) `apps/mobile/.env` and set the real address before starting Expo:

```
# Physical device — use your machine's LAN IP
EXPO_PUBLIC_API_URL=http://192.168.1.164:8099/api/v1

# Standard Android AVD — the emulator maps 10.0.2.2 to the host machine
EXPO_PUBLIC_API_URL=http://10.0.2.2:8099/api/v1
```

Find your LAN IP with `ip addr show` (Linux/macOS) or `ipconfig` (Windows).

### Starting the backend

**Option A — Docker Compose (Postgres + backend together, recommended):**

```bash
cd Beyou-dev-env
./scripts/up-dev.sh
```

This starts Postgres on port 5490 and the Spring Boot backend on port 8099.

**Option B — bare Maven (needs Postgres already running on port 5490):**

Copy the required env vars from `Beyou-backend-spring/envExample`, then:

```bash
cd Beyou-backend-spring
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

> There is no `./mvnw` wrapper in this repo — use the globally installed `mvn`.

Wait for the log line `Started BeYouApplication` before launching the app.

---

## 1. Expo Go (fastest — recommended for daily dev)

```bash
cd apps/mobile
npx expo start
```

- Press **`a`** to open on a connected Android emulator.
- Scan the QR code with the **Expo Go** app (Play Store) on a physical device.
- Hot reload is active on every save.

`expo-secure-store` works inside Expo Go, so the token persistence flow is fully testable this way.

> **Do not run `npm dedupe`** at the workspace root. The monorepo intentionally keeps
> React 19 inside `apps/mobile/node_modules` and React 18 at the root. See `AGENTS.md`
> for details.

---

## 2. Android emulator (Android Studio AVD)

Have an AVD running in Android Studio (or started via `emulator -avd <name>`), then:

```bash
cd apps/mobile
npm run android
```

This maps to `expo start --android`. The first run is slower while Metro builds and installs the app on the emulator.

---

## 3. EAS dev build (closest to production — for later)

Use this when you need to test native modules that are not supported in Expo Go, or to produce an installable `.apk` for the team.

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile development
```

Install the resulting `.apk` on a device or emulator, then start the dev server:

```bash
cd apps/mobile
npx expo start --dev-client
```

The Android package `com.beyou.mobile` is already configured in `app.json`.

---

## Manual verification checklist

Run this once with the backend up and a device/emulator connected via `npx expo start`.

1. **Cold launch** — App opens. After a brief bootstrap (no stored token found), the **Login screen** is displayed.

2. **Register a new user** — Tap "Register", fill in the form, submit. The app shows a "verify your email" message and does not proceed to the authenticated area.

3. **Verify the email address** — Two options:
   - **Real email**: open the verification link from the inbox in any browser.
   - **Local dev shortcut** (no mail server needed): run this in Postgres:
     ```sql
     UPDATE users SET email_verified = true WHERE email = '<your-test-email>';
     ```
     Connect to Postgres with: `psql -h localhost -p 5490 -U postgres -d beyou`

4. **Log in** — Enter the credentials. The app lands on the authenticated placeholder screen showing your profile name.

5. **Persistence after kill** — Fully close the app (swipe away from recents) and reopen it. The app should boot straight into the authenticated view — no login prompt — because the refresh token is retrieved from `expo-secure-store` and a silent refresh is performed.

6. **Logout** — Tap the logout control. The app returns to the Login screen. Logging in again with the same credentials works normally.

> This is a **manual gate**. The automated unit and integration tests live in the
> `__tests__/` directory (root-layout, login, register) and alongside the `src/` tree,
> and are run with `npm test` inside `apps/mobile`.
>
> **Test files must NOT live under `app/`** — Expo Router builds its route table with
> `require.context('./app')`, which would pull `*.test.tsx` into the production bundle and
> break `npx expo export`. Keep route tests in `__tests__/`.
