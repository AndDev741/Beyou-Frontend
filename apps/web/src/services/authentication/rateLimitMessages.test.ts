import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError, RATE_LIMIT_ERROR_KEY } from '@beyou/api';
import type { NavigateFunction } from 'react-router-dom';
import type { Dispatch, UnknownAction } from '@reduxjs/toolkit';

vi.mock('./request/loginRequest', () => ({ default: vi.fn() }));
vi.mock('./request/registerRequest', () => ({ default: vi.fn() }));
vi.mock('../user/hydratePerfil', () => ({ hydratePerfil: vi.fn() }));

import loginRequest from './request/loginRequest';
import registerRequest from './request/registerRequest';
import handleLogin from './useLogin';
import handleRegister from './handleRegister';

/**
 * The auth screens collapse every failure into one refusal, which is right for a
 * wrong password and wrong for a throttle: the login bucket is 5 attempts per 15
 * minutes, so a user who mistyped a few times was then told their correct password
 * was wrong, and went back to retyping it until the bucket was gone. Registration
 * was worse — an unrecognised key fell through to "email already in use", a false
 * claim about the visitor's own account.
 *
 * Identity is never revealed by this: the bucket is keyed by address and answers the
 * same whether or not the account exists. The per-account lockout, which IS an
 * oracle if named, still answers exactly like a wrong password and is untouched.
 */

// Identity t, so an assertion names the key that reached it.
const t = ((key: string) => key) as never;

// handleLogin/handleRegister only reach these on the success path, which no test
// here takes. Cast rather than build real ones: vi.fn() satisfies neither
// NavigateFunction (overloaded) nor Dispatch, and vitest does not typecheck.
const navigate = vi.fn() as unknown as NavigateFunction;
const dispatch = vi.fn() as unknown as Dispatch<UnknownAction>;

const loginMock = loginRequest as unknown as ReturnType<typeof vi.fn>;
const registerMock = registerRequest as unknown as ReturnType<typeof vi.fn>;

describe('a throttled sign-in says so', () => {
    beforeEach(() => {
        loginMock.mockReset();
        registerMock.mockReset();
    });

    it('login reports the rate limit instead of a wrong password', async () => {
        loginMock.mockResolvedValue({ error: RATE_LIMIT_ERROR_KEY });

        const message = await handleLogin('a@b.com', 'pw', t, dispatch, navigate);

        expect(message).toBe(RATE_LIMIT_ERROR_KEY);
        expect(message).not.toBe('WrongPassOrEmailError');
    });

    it('login still answers a genuinely bad credential with the shared refusal', async () => {
        loginMock.mockResolvedValue({ error: ' ' });

        expect(await handleLogin('a@b.com', 'pw', t, dispatch, navigate))
            .toBe('WrongPassOrEmailError');
    });

    it('register reports the rate limit instead of claiming the email is taken', async () => {
        registerMock.mockResolvedValue({ error: RATE_LIMIT_ERROR_KEY });

        const message = await handleRegister('n', 'a@b.com', 'pw', t, dispatch, navigate);

        expect(message).toBe(RATE_LIMIT_ERROR_KEY);
        expect(message).not.toBe('EmailInUseError');
    });

    it('register still reports a real duplicate email as one', async () => {
        registerMock.mockResolvedValue({ error: 'EMAIL_ALREADY_IN_USE' });

        expect(await handleRegister('n', 'a@b.com', 'pw', t, dispatch, navigate))
            .toBe('EmailInUseError');
    });
});

describe('isRateLimited recognises both error shapes in the codebase', () => {
    it('matches the ApiError the shared client throws', async () => {
        const { isRateLimited } = await import('@beyou/api');
        expect(isRateLimited(new ApiError(429, { errorKey: RATE_LIMIT_ERROR_KEY }))).toBe(true);
        expect(isRateLimited(new ApiError(401, {}))).toBe(false);
    });

    it('matches the raw axios error the web auth requests catch', async () => {
        const { isRateLimited } = await import('@beyou/api');
        expect(isRateLimited({ response: { status: 429 } })).toBe(true);
        expect(isRateLimited({ response: { status: 403 } })).toBe(false);
        expect(isRateLimited(new Error('offline'))).toBe(false);
        expect(isRateLimited(undefined)).toBe(false);
    });
});
