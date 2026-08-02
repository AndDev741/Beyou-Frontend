import { Navigate, Outlet } from "react-router-dom";
import axios from "../services/axiosConfig";
import type { AuthBootState } from "../hooks/useSilentRefresh";
import AgentWidget from "./agent/AgentWidget";
import BottomNav from "./dashboard/BottomNav";
import Sidebar from "./shell/Sidebar";

type Props = {
    authState: AuthBootState;
};

/**
 * Signed-in gate for every app route. The admin console needs a second,
 * narrower gate on top of this one: see `AdminRoute.tsx`, which nests inside
 * this route and lives in its own module so admin code stays out of the bundle
 * ordinary users download.
 *
 * `authState` is a one-shot boot check — it never updates after login.
 * Check the runtime axios token too: handleLogin sets it before navigating
 * to /dashboard, so a fresh ProtectedRoute mount sees the new credential.
 */
function ProtectedRoute({ authState }: Props) {
    const hasRuntimeToken = Boolean(axios.defaults.headers.common.Authorization);
    if (authState !== "authenticated" && !hasRuntimeToken) {
        return <Navigate to="/" replace />;
    }
    return (
        // A shell é montada UMA vez para toda rota autenticada: sidebar no
        // desktop, barra inferior no mobile. As páginas não renderizam mais
        // cabeçalho próprio, e a bolha de feedback virou item da sidebar —
        // só o balão do assistente continua flutuando.
        <div className="flex min-h-screen bg-bg">
            <Sidebar />
            <div className="min-w-0 flex-1">
                <Outlet />
                {/* `BottomNav` é fixed e cobriria o fim da página. O espaçador
                    mora aqui junto da barra: escrito uma vez, nenhuma página
                    precisa saber que a barra existe. */}
                <div className="h-20 lg:hidden" aria-hidden="true" data-testid="bottom-nav-spacer" />
            </div>
            <BottomNav />
            <AgentWidget />
        </div>
    );
}

export default ProtectedRoute;
