import { describe, it, expect } from 'vitest';
import { resetPasswordSchema } from './authSchemas';

const t = ((key: string) => key) as any;

describe('resetPasswordSchema', () => {
    const schema = resetPasswordSchema(t);

    it('should pass when passwords match and meet strength requirements', () => {
        const result = schema.safeParse({
            password: 'StrongPass123!',
            confirmPassword: 'StrongPass123!'
        });
        expect(result.success).toBe(true);
    });

    it('should fail with PasswordMismatch when passwords do not match', () => {
        const result = schema.safeParse({
            password: 'StrongPass123!',
            confirmPassword: 'DifferentPass456!'
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            const confirmError = result.error.issues.find(
                (issue) => issue.path.includes('confirmPassword') && issue.message === 'PasswordMismatch'
            );
            expect(confirmError).toBeDefined();
        }
    });

    it('should fail when passwords are empty', () => {
        const result = schema.safeParse({
            password: '',
            confirmPassword: ''
        });
        expect(result.success).toBe(false);
    });
});
