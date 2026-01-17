import { describe, it, expect } from '@jest/globals';
import {
    loginSchema,
    forceResetPasswordSchema,
    resetPasswordSchema
} from '../validators/auth.validator';

describe('Auth Validators', () => {
    describe('loginSchema', () => {
        it('should validate correct login input', () => {
            const result = loginSchema.safeParse({
                email: 'test@example.com',
                password: 'password123',
            });
            expect(result.success).toBe(true);
        });

        it('should reject invalid email', () => {
            const result = loginSchema.safeParse({
                email: 'invalid-email',
                password: 'password123',
            });
            expect(result.success).toBe(false);
        });

        it('should reject empty password', () => {
            const result = loginSchema.safeParse({
                email: 'test@example.com',
                password: '',
            });
            expect(result.success).toBe(false);
        });
    });

    describe('forceResetPasswordSchema', () => {
        it('should validate strong password', () => {
            const result = forceResetPasswordSchema.safeParse({
                newPassword: 'SecureP@ss123',
                confirmPassword: 'SecureP@ss123',
            });
            expect(result.success).toBe(true);
        });

        it('should reject weak password', () => {
            const result = forceResetPasswordSchema.safeParse({
                newPassword: 'weak',
                confirmPassword: 'weak',
            });
            expect(result.success).toBe(false);
        });

        it('should reject mismatched passwords', () => {
            const result = forceResetPasswordSchema.safeParse({
                newPassword: 'SecureP@ss123',
                confirmPassword: 'DifferentP@ss123',
            });
            expect(result.success).toBe(false);
        });

        it('should reject password without uppercase', () => {
            const result = forceResetPasswordSchema.safeParse({
                newPassword: 'securep@ss123',
                confirmPassword: 'securep@ss123',
            });
            expect(result.success).toBe(false);
        });

        it('should reject password without special character', () => {
            const result = forceResetPasswordSchema.safeParse({
                newPassword: 'SecurePass123',
                confirmPassword: 'SecurePass123',
            });
            expect(result.success).toBe(false);
        });
    });
});
