/**
 * DPR Validators
 * 
 * Input validation for Data Principal Request endpoints
 */

import { z } from 'zod';

// Request types enum
export const requestTypeSchema = z.enum(['ACCESS', 'CORRECTION', 'ERASURE', 'NOMINATION', 'GRIEVANCE']);

// Outcome enum
export const outcomeSchema = z.enum(['FULFILLED', 'PARTIALLY_FULFILLED', 'REJECTED']);

// Send OTP (public)
export const sendOtpSchema = z.object({
    websiteId: z.string().uuid('Invalid website ID'),
    email: z.string().email('Invalid email format'),
    requestType: requestTypeSchema,
    requestPayload: z.object({
        description: z.string().min(10, 'Description must be at least 10 characters'),
        // Nomination-specific fields
        nomineeName: z.string().optional(),
        nomineeEmail: z.string().email().optional(),
        nomineeRelationship: z.string().optional(),
        // Correction-specific fields
        incorrectData: z.string().optional(),
        correctData: z.string().optional(),
        // Erasure-specific fields
        erasureReason: z.string().optional(),
        // Grievance-specific fields
        grievanceCategory: z.string().optional(),
        grievanceDetails: z.string().optional(),
    }).passthrough(),
    submissionLanguage: z.string().length(2).optional(),
});

// Verify OTP (public)
export const verifyOtpSchema = z.object({
    email: z.string().email('Invalid email format'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
});

// Assign request
export const assignRequestSchema = z.object({
    assignedTo: z.string().uuid('Invalid team member ID').nullable(),
});

// Update SLA
export const updateSlaSchema = z.object({
    slaDays: z.number().int().min(1).max(365),
});

// Respond to request
export const respondSchema = z.object({
    outcome: outcomeSchema,
    reason: z.string().min(10, 'Response reason must be at least 10 characters').max(5000),
    attachments: z.array(z.object({
        name: z.string(),
        url: z.string().url(),
    })).optional().default([]),
});

// List filters
export const listFiltersSchema = z.object({
    requestType: requestTypeSchema.optional(),
    status: z.enum(['SUBMITTED', 'WORK_IN_PROGRESS', 'RESPONDED', 'RESOLVED']).optional(),
    assignedTo: z.string().uuid().optional(),
    submissionLanguage: z.string().optional(),
    slaState: z.enum(['NORMAL', 'WARNING', 'BREACHED']).optional(),
});

// SLA config update
export const updateSlaConfigSchema = z.object({
    defaultSlaDays: z.number().int().min(1).max(365).optional(),
    nominationSlaDays: z.number().int().min(1).max(365).optional(),
    warningThresholdDays: z.number().int().min(1).max(30).optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
});

// Type exports
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type AssignRequestInput = z.infer<typeof assignRequestSchema>;
export type UpdateSlaInput = z.infer<typeof updateSlaSchema>;
export type RespondInput = z.infer<typeof respondSchema>;
export type ListFiltersInput = z.infer<typeof listFiltersSchema>;
export type UpdateSlaConfigInput = z.infer<typeof updateSlaConfigSchema>;
