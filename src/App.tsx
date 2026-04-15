import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/authentication/login/login";
import Register from "./pages/authentication/register/register";
import ForgotPassword from "./pages/authentication/forgot/forgot";
import ResetPassword from "./pages/authentication/reset/reset";
import VerifyEmail from "./pages/authentication/verify/verify";
import Dashboard from "./pages/dashboard/dashboard";
import Categories from "./pages/categories/categories";
import Habits from "./pages/habits/habits";
import Goals from "./pages/goals/goals";
import Tasks from "./pages/tasks/Tasks";
import Routine from "./pages/routines/routine";
import Configuration from "./pages/configuration/Configuration";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastContainer } from "react-toastify";
import ErrorBoundary from "./components/ErrorBoundary";
import { useSilentRefresh } from "./hooks/useSilentRefresh";

function AppContent() {
  const authState = useSilentRefresh();

  if (authState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center text-secondary">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/verify" element={<VerifyEmail />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/routines" element={<Routine />} />
        <Route path="/configuration" element={<Configuration />} />
      </Routes>
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
