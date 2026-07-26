import React from "react";
import { logger } from "../../utils/logger";

type ReportControlGuardProps = { children: React.ReactNode };
type ReportControlGuardState = { failed: boolean };

/**
 * The report control is a nicety bolted onto an error screen. If it cannot
 * render — a broken chunk, a failed dynamic import, a bug of its own — the
 * error screen and its reload control still have to work. Without this guard a
 * throwing report control on the crash path would take out the only escape
 * hatch the user has left.
 */
export default class ReportControlGuard extends React.Component<
    ReportControlGuardProps,
    ReportControlGuardState
> {
    constructor(props: ReportControlGuardProps) {
        super(props);
        this.state = { failed: false };
    }

    static getDerivedStateFromError(): ReportControlGuardState {
        return { failed: true };
    }

    componentDidCatch(error: Error): void {
        logger.error("Error report control failed to render:", error);
    }

    render() {
        return this.state.failed ? null : this.props.children;
    }
}
