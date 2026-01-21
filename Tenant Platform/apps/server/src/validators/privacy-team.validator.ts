/**
 * Privacy Team Validators
 * 
 * Input validation for privacy team endpoints
 */

import { z } from 'zod';

export const createTeamMemberSchema = z.object({
    fullName: z.string().min(2, 'Name must be at least 2 characters').max(255),
    email: z.string().email('Invalid email format').max(255),
    role: z.enum(['ADMIN', 'STAFF'], { errorMap: () => ({ message: 'Role must be ADMIN or STAFF' }) }),
});

export const updateTeamMemberSchema = z.object({
    fullName: z.string().min(2, 'Name must be at least 2 characters').max(255).optional(),
    email: z.string().email('Invalid email format').max(255).optional(),
    role: z.enum(['ADMIN', 'STAFF']).optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
});

export const updateStatusSchema = z.object({
    status: z.enum(['ACTIVE', 'INACTIVE'], { errorMap: () => ({ message: 'Status must be ACTIVE or INACTIVE' }) }),
});

export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
