// Polyfill crypto.getRandomValues FIRST — the shared `uuid` package (used by the
// AI routine materialize flow) needs it, and React Native/Hermes doesn't provide it.
import 'react-native-get-random-values';
import '../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { neutrals } from '@beyou/theme';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Stack, useRouter, useSegments } from 'expo-router';
import '../src/i18n';
import { fetch as expoFetch } from 'expo/fetch';
import { createReportingLogger, setAgentStreamConfig, setHttpClient, setLogger } from '@beyou/api';
import { store, type RootState, type AppDispatch } from '../src/store';
import { nativeHttpClient, setAccessToken, setRefreshHandler, setOnUnauthenticated, getApiBaseUrl, getAccessToken, refreshAccessToken } from '../src/lib/nativeHttpClient';
import { registerFeedbackNativeUploader } from '../src/lib/feedbackUploader';
import { refreshRequest } from '../src/auth/authApi';
import * as secureStore from '../src/auth/secureStore';
import { bootstrap, logout } from '../src/auth/authSlice';
import { nextAuthRoute } from '../src/auth/authRedirect';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ThemeSync from '../src/theme/ThemeSync';
import LanguageSync from '../src/i18n/LanguageSync';
import ViewFiltersSync from '../src/viewFilters/ViewFiltersSync';
import { TutorialProvider } from '../src/tutorial/TutorialProvider';
import TutorialSync from '../src/tutorial/TutorialSync';
import ErrorBoundary from '../src/ui/ErrorBoundary';
import { initTelemetry, reportHandledFailure } from '../src/lib/telemetry';
import { PostHogProvider } from 'posthog-react-native';
import { initAnalytics } from '../src/lib/analytics';
import AnalyticsSync from '../src/lib/AnalyticsSync';
import { BeyouToastHost } from '../src/ui/BeyouToast';
import PomodoroOwner from '../src/focus/PomodoroOwner';

// Error reporting comes up before any app wiring so a crash *during* the setup
// below is still captured. No-ops when EXPO_PUBLIC_SENTRY_DSN is unset.
// NOTE: end-to-end delivery is unverified on a real device — see telemetry.ts.
// Deliberately NOT the very first statement in the module (upstream #5508 saw
// events dropped in that position), and deliberately NOT using `Sentry.wrap()`:
// on RN 0.85 / React 19.2 the wrapper remounts the whole tree on every save and
// breaks Fast Refresh (upstream #6514, still open). `wrap` only adds touch
// breadcrumbs and profiling, both of which are off here anyway.
initTelemetry();

// Product analytics (PostHog). Same posture: no EXPO_PUBLIC_POSTHOG_KEY, no
// client, no provider below, and @beyou/api's analytics seam stays a no-op.
const posthog = initAnalytics();

setHttpClient(nativeHttpClient);
// The shared API client handles every failure itself, so a 500 or an unreachable
// host never reaches ErrorBoundary or the SDK's global handler. This keeps the
// console output intact and additionally forwards the failures that indicate a
// real defect — 5xx, transport failures, and anything that is not a recognisable
// API error — to the collector. 4xx stay console-only: those are the server
// rejecting a request on purpose. See @beyou/api's errorReporting.ts.
setLogger(
  createReportingLogger(
    { error: (...a: unknown[]) => console.error(...a) },
    reportHandledFailure,
  ),
);
// Feedback images are `file://` uris — RN's FormData cannot carry them, so the
// shared uploader needs the expo-file-system transport registered up front.
registerFeedbackNativeUploader();
// SSE streaming needs expo/fetch — RN's global fetch buffers the whole body.
// Borrows the same base URL, fresh access token, and single-flight refresh.
setAgentStreamConfig({
  baseUrl: getApiBaseUrl(),
  getHeaders: (): Record<string, string> => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
  refreshAuth: refreshAccessToken,
  fetchImpl: expoFetch as unknown as typeof fetch,
});
setRefreshHandler(async () => {
  const stored = await secureStore.getRefreshToken();
  if (!stored) return false;
  try {
    const { accessToken, refreshToken } = await refreshRequest(stored);
    await secureStore.setRefreshToken(refreshToken);
    setAccessToken(accessToken);
    return true;
  } catch {
    await secureStore.clearRefreshToken();
    return false;
  }
});

function Gate() {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector((s: RootState) => s.auth.status);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    setOnUnauthenticated(() => {
      dispatch(logout());
    });
    dispatch(bootstrap());
  }, [dispatch]);

  useEffect(() => {
    const target = nextAuthRoute(status, segments);
    if (target) router.replace(target);
  }, [status, segments, router]);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      {/* Finishes, reports and alerts for a running cycle wherever the person is — on the focus
          screen or off it. Renders nothing. */}
      <PomodoroOwner />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

// The native splash stays up until the typeface loads. Without this it leaves as
// soon as the RN view mounts, and a white screen with a spinner appeared between
// the mark and the app — three screens for one launch.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* already hidden, or a platform with no splash: nothing to do */
});

export default function RootLayout() {
  // Geist is the brand typeface; until it loads, rendering text in the system font
  // would cause a visible layout jump at boot.
  const systemScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Geist: require('../assets/fonts/Geist-Regular.ttf'),
    GeistMedium: require('../assets/fonts/Geist-Medium.ttf'),
    GeistSemiBold: require('../assets/fonts/Geist-SemiBold.ttf'),
    GeistBold: require('../assets/fonts/Geist-Bold.ttf'),
    GeistMono: require('../assets/fonts/GeistMono-Medium.ttf'),
    GeistMonoSemiBold: require('../assets/fonts/GeistMono-SemiBold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  // While the font loads the screen is the SAME tone as the splash — the system
  // one, which is what the native splash used (the account theme only arrives
  // with the profile). Returning `null` here left a black frame between the mark
  // and the app. The colours come from the token source, not from a literal:
  // `app.json` still repeats them because a config file cannot import.
  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: neutrals[systemScheme === 'dark' ? 'dark' : 'light'].bg,
        }}
      />
    );
  }

  const tree = (
    <Provider store={store}>
      <TutorialProvider>
        <SafeAreaProvider>
          <BeyouThemeProvider>
            <ThemeSync />
            <LanguageSync />
            <ViewFiltersSync />
            <TutorialSync />
            <AnalyticsSync />
            <ErrorBoundary>
              <Gate />
            </ErrorBoundary>
            <BeyouToastHost />
          </BeyouThemeProvider>
        </SafeAreaProvider>
      </TutorialProvider>
    </Provider>
  );

  // Screen views ride expo-router's react-navigation container; touch capture
  // records the element hierarchy and ph-label/testID identifiers, NOT text
  // content — user-written content (habit names etc.) stays on the device,
  // the same no-PII line the web app draws with mask_all_text.
  return posthog ? (
    <PostHogProvider
      client={posthog}
      autocapture={{ captureScreens: true, captureTouches: true }}
    >
      {tree}
    </PostHogProvider>
  ) : (
    tree
  );
}
