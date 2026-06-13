import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger — dev-gated logging', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    describe('when DEV = true (default in vitest)', () => {
        it('logger.log calls console.log', async () => {
            const { logger } = await import('./logger');
            const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

            logger.log('test message');
            expect(spy).toHaveBeenCalledWith('test message');
        });

        it('logger.warn calls console.warn', async () => {
            const { logger } = await import('./logger');
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            logger.warn('warn message');
            expect(spy).toHaveBeenCalledWith('warn message');
        });

        it('logger.error calls console.error', async () => {
            const { logger } = await import('./logger');
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

            logger.error('error message');
            expect(spy).toHaveBeenCalledWith('error message');
        });
    });

    describe('when DEV = false', () => {
        it('logger.log does NOT call console.log', async () => {
            vi.stubEnv('DEV', false as unknown as string);

            const { logger } = await import('./logger');
            const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

            logger.log('should not appear');
            expect(spy).not.toHaveBeenCalled();
        });

        it('logger.warn does NOT call console.warn', async () => {
            vi.stubEnv('DEV', false as unknown as string);

            const { logger } = await import('./logger');
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            logger.warn('should not appear');
            expect(spy).not.toHaveBeenCalled();
        });

        it('logger.error still calls console.error', async () => {
            vi.stubEnv('DEV', false as unknown as string);

            const { logger } = await import('./logger');
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

            logger.error('error always appears');
            expect(spy).toHaveBeenCalledWith('error always appears');
        });
    });
});
