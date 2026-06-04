import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastContainer } from "react-toastify";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { useSilentRefresh } from "./hooks/useSilentRefresh";

// Route-level code splitting: each page is its own chunk, so the boot bundle
// stays small. The auth pages don't touch the icon registry, which keeps the
// heavy icons/emoji chunks out of the unauthenticated first load entirely —
// they're fetched (then cached) when the first authenticated page mounts.
const Login = lazy(() => import("./pages/authentication/login/login"));
const Register = lazy(() => import("./pages/authentication/register/register"));
const ForgotPassword = lazy(() => import("./pages/authentication/forgot/forgot"));
const ResetPassword = lazy(() => import("./pages/authentication/reset/reset"));
const VerifyEmail = lazy(() => import("./pages/authentication/verify/verify"));
const Dashboard = lazy(() => import("./pages/dashboard/dashboard"));
const Categories = lazy(() => import("./pages/categories/categories"));
const Habits = lazy(() => import("./pages/habits/habits"));
const Goals = lazy(() => import("./pages/goals/goals"));
const Tasks = lazy(() => import("./pages/tasks/Tasks"));
const Routine = lazy(() => import("./pages/routines/routine"));
const Configuration = lazy(() => import("./pages/configuration/Configuration"));

/** Full-screen spinner shared by the auth boot check and lazy route loads. */
function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center text-secondary">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </div>
  );
}

function AppContent() {
  const authState = useSilentRefresh();

  if (authState === "checking") {
    return <FullScreenSpinner />;
  }

  return (
    <>
      <Suspense fallback={<FullScreenSpinner />}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/verify" element={<VerifyEmail />} />
          <Route element={<ProtectedRoute authState={authState} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/routines" element={<Routine />} />
            <Route path="/configuration" element={<Configuration />} />
          </Route>
        </Routes>
      </Suspense>
      <ToastContainer
        position="bottom-center"
        autoClose={5000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        draggable
        className="beyou-toast-container"
        toastClassName="beyou-toast"
        progressClassName="beyou-toast-progress"
      />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <div className="font-mainFont bg-background">
            <AppContent />
          </div>
        </ErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
