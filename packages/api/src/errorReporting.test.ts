import { describe, it, expect, vi } from 'vitest';
import { ApiError } from './httpClient';
import { isReportableFailure, createReportingLogger } from './errorReporting';

/**
 * The classifier that decides which handled API failures are worth an issue in
 * the error collector.
 *
 * Every API function in this package funnels its catch block through
 * `getLogger().error(...)`, so without a filter the collector would receive one
 * issue per rejected form submit, per expired session, per rate limit — all of
 * them the server behaving correctly. These tests pin the boundary.
 */
describe('isReportableFailure', () => {
    it('reports a 5xx — the server failed to do something it accepted', () => {
        expect(isReportableFailure(new ApiError(500, { errorKey: 'INTERNAL' }))).toBe(true);
        expect(isReportableFailure(new ApiError(502))).toBe(true);
        expect(isReportableFailure(new ApiError(503))).toBe(true);
        expect(isReportableFailure(new ApiError(504))).toBe(true);
    });

    it('reports a transport failure, where no response was ever received', () => {
        // Both adapters normalise "no response" to status 0: DNS failure,
        // connection refused, CORS rejection, or the mobile client's own timeout.
        expect(isReportableFailure(new ApiError(0, undefined, 'Network request failed'))).toBe(true);
        expect(isReportableFailure(new ApiError(0, undefined, 'Request timed out after 20000ms'))).toBe(true);
    });

    it('does NOT report a 4xx — the server correctly rejected the request', () => {
        expect(isReportableFailure(new ApiError(400, { errorKey: 'ValidationError' }))).toBe(false);
        // Silent refresh probing an expired session.
        expect(isReportableFailure(new ApiError(401, undefined, 'Unauthorized'))).toBe(false);
        expect(isReportableFailure(new ApiError(403))).toBe(false);
        // e.g. FEEDBACK_NOT_FOUND.
        expect(isReportableFailure(new ApiError(404, { errorKey: 'FEEDBACK_NOT_FOUND' }))).toBe(false);
        expect(isReportableFailure(new ApiError(409))).toBe(false);
        expect(isReportableFailure(new ApiError(422))).toBe(false);
        // RATE_LIMIT_EXCEEDED — expected, already surfaced to the user as a toast.
        expect(isReportableFailure(new ApiError(429, { errorKey: 'RATE_LIMIT_EXCEEDED' }))).toBe(false);
        expect(isReportableFailure(new ApiError(499))).toBe(false);
    });

    it('reports anything that is not a recognisable API failure at all', () => {
        // A bug in our own code — a mapper blowing up, a malformed SSE frame.
        expect(isReportableFailure(new TypeError('x is not a function'))).toBe(true);
        expect(isReportableFailure(new Error('boom'))).toBe(true);
        // agentStream logs contract violations as plain strings.
        expect(isReportableFailure('agentStream: malformed done event')).toBe(true);
        expect(isReportableFailure(undefined)).toBe(true);
    });
});

describe('createReportingLogger', () => {
    const build = () => {
        const consoleError = vi.fn();
        const report = vi.fn();
        const logger = createReportingLogger({ error: consoleError }, report);
        return { logger, consoleError, report };
    };

    it('reports a 5xx failure', () => {
        const { logger, report } = build();
        const failure = new ApiError(500, { errorKey: 'INTERNAL' });

        logger.error(failure);

        expect(report).toHaveBeenCalledTimes(1);
        expect(report).toHaveBeenCalledWith(failure);
    });

    it('does not report a 4xx failure', () => {
        const { logger, report } = build();

        logger.error(new ApiError(400, { errorKey: 'ValidationError' }));

        expect(report).not.toHaveBeenCalled();
    });

    it('reports a network failure that never received a response', () => {
        const { logger, report } = build();

        logger.error(new ApiError(0, undefined, 'Network request failed'));

        expect(report).toHaveBeenCalledTimes(1);
    });

    it('still writes to the console for every failure class', () => {
        const { logger, consoleError } = build();

        logger.error(new ApiError(500));
        logger.error(new ApiError(400));
        logger.error(new ApiError(0, undefined, 'Network request failed'));
        logger.error(new TypeError('boom'));

        // Losing local console visibility would be a regression, so the console
        // leg is unconditional — it does not depend on the filter or on a DSN.
        expect(consoleError).toHaveBeenCalledTimes(4);
    });

    it('forwards every argument to the console, unchanged', () => {
        const { logger, consoleError } = build();
        const failure = new ApiError(500);

        logger.error('context', failure, { extra: true });

        expect(consoleError).toHaveBeenCalledWith('context', failure, { extra: true });
    });

    it('classifies on the first Error-like argument rather than a leading label', () => {
        const { logger, report } = build();
        const rejected = new ApiError(400, { errorKey: 'ValidationError' });

        logger.error('createHabit failed:', rejected);

        // The label must not make an expected 4xx look unrecognisable.
        expect(report).not.toHaveBeenCalled();
    });

    it('keeps logging when reporting throws, so telemetry cannot break the app', () => {
        const consoleError = vi.fn();
        const logger = createReportingLogger({ error: consoleError }, () => {
            throw new Error('transport exploded');
        });

        expect(() => logger.error(new ApiError(500))).not.toThrow();
        expect(consoleError).toHaveBeenCalledTimes(1);
    });
});
