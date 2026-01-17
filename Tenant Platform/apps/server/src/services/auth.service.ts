import bcrypt from 'bcrypt';
import { userRepository, auditRepository } from '../repositories';
import { TenantUserSafe, AuthContext, Tenant } from '../types';
import { LoginInput, ForceResetPasswordInput, ResetPasswordInput } from '../validators';

/**
 * Authentication Service for Tenant Admin users.
 * Handles login, password reset, and session management.
 */
export const authService = {
    /**
     * Authenticate a tenant admin user
     */
    async login(
        input: LoginInput,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<{
        user: TenantUserSafe;
        tenant: Tenant;
    }> {
        const user = await userRepository.findByEmail(input.email);

        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Check if tenant is active
        const tenant = await userRepository.getTenant(user.tenantId);
        if (!tenant) {
            throw new Error('Tenant account is not active');
        }

        // Verify password
        const isValid = await bcrypt.compare(input.password, user.passwordHash);
        if (!isValid) {
            throw new Error('Invalid email or password');
        }

        // Log successful login
        await auditRepository.create(
            user.tenantId,
            user.id,
            'AUTH_LOGIN',
            {
                resourceType: 'user',
                resourceId: user.id,
                metadata: { email: user.email },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );

        // Return safe user (without password hash)
        return {
            user: {
                id: user.id,
                tenantId: user.tenantId,
                email: user.email,
                mustResetPassword: user.mustResetPassword,
                status: user.status,
                createdAt: user.createdAt,
            },
            tenant,
        };
    },

    /**
     * Force password reset (on first login)
     */
    async forceResetPassword(
        userId: string,
        tenantId: string,
        input: ForceResetPasswordInput,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<TenantUserSafe> {
        const user = await userRepository.findById(userId);

        if (!user || user.tenantId !== tenantId) {
            throw new Error('User not found');
        }

        if (!user.mustResetPassword) {
            throw new Error('Password reset is not required');
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(input.newPassword, salt);

        // Update password and clear must_reset_password flag
        await userRepository.updatePassword(userId, passwordHash);

        // Log password reset
        await auditRepository.create(
            tenantId,
            userId,
            'AUTH_PASSWORD_RESET',
            {
                resourceType: 'user',
                resourceId: userId,
                metadata: { type: 'force_reset' },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );

        // Return updated user
        const updatedUser = await userRepository.findByIdSafe(userId);
        if (!updatedUser) {
            throw new Error('Failed to retrieve updated user');
        }

        return updatedUser;
    },

    /**
     * Voluntary password reset (already logged in)
     */
    async resetPassword(
        userId: string,
        tenantId: string,
        input: ResetPasswordInput,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<void> {
        const user = await userRepository.findById(userId);

        if (!user || user.tenantId !== tenantId) {
            throw new Error('User not found');
        }

        // Verify current password
        const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!isValid) {
            throw new Error('Current password is incorrect');
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(input.newPassword, salt);

        // Update password
        await userRepository.updatePassword(userId, passwordHash);

        // Log password reset
        await auditRepository.create(
            tenantId,
            userId,
            'AUTH_PASSWORD_CHANGE',
            {
                resourceType: 'user',
                resourceId: userId,
                metadata: { type: 'voluntary' },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );
    },

    /**
     * Logout (just for audit logging)
     */
    async logout(
        userId: string,
        tenantId: string,
        requestInfo: { ipAddress?: string; userAgent?: string }
    ): Promise<void> {
        await auditRepository.create(
            tenantId,
            userId,
            'AUTH_LOGOUT',
            {
                resourceType: 'user',
                resourceId: userId,
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
            }
        );
    },

    /**
     * Get user context (for middleware)
     */
    async getUserContext(userId: string): Promise<AuthContext | null> {
        const user = await userRepository.findByIdSafe(userId);
        if (!user) return null;

        const tenant = await userRepository.getTenant(user.tenantId);
        if (!tenant) return null;

        return { user, tenant };
    },
};
