import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import getFeedbackAdminCounts from "@beyou/api/feedback/getFeedbackAdminCounts";

type AdminCheck = "checking" | "allowed" | "denied";

/**
 * Route gate for the admin console. Nests INSIDE `ProtectedRoute`, so the
 * signed-in check has already run by the time this mounts.
 *
 * This gate is ergonomics, not security. It secures nothing: every byte the
 * console displays comes from `/feedback/admin/**`, which the backend gates on
 * ROLE_ADMIN. That server rule is the actual boundary — a non-admin who edits
 * this component out still gets refused by the API. All this does is spare a
 * non-admin an interface full of failed requests.
 *
 * The check asks the server rather than reading a client-side claim: the
 * profile payload carries no role, and a role the client could read is a role
 * the client could lie about. `counts` is the cheapest admin-gated read there
 * is, and the console needs it anyway.
 *
 * Any failure — refusal, network, timeout — reads as "not allowed here". An
 * admin who hit a transient failure gets in on a reload; the alternative is
 * rendering a console that cannot load anything.
 *
 * Loaded lazily from App.tsx so this module and its admin API import stay out
 * of the bundle an ordinary user downloads.
 */
function AdminRoute() {
    const { t } = useTranslation();
    const [check, setCheck] = useState<AdminCheck>("checking");

    useEffect(() => {
        let isActive = true;

        const probe = async () => {
            const result = await getFeedbackAdminCounts(t);
            if (!isActive) return;
            setCheck(result.success ? "allowed" : "denied");
        };

        void probe();

        return () => {
            isActive = false;
        };
    }, [t]);

    if (check === "checking") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-border border-t-transparent" />
            </div>
        );
    }

    if (check === "denied") {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}

export default AdminRoute;
