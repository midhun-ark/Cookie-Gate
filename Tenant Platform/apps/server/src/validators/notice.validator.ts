import { z } from 'zod';

/**
 * Notice-related validation schemas
 * DPDPA Compliance: Notices must be clear and reference purposes
 */

// Language code validation (ISO 639-1)
const languageCodeSchema = z
    .string()
    .min(2)
    .max(10)
    .regex(/^[a-z]{2,3}([-_][a-zA-Z0-9]+)?$/, 'Invalid language code format');

// Notice translation
export const noticeTranslationSchema = z.object({
    languageCode: languageCodeSchema,
    title: z
        .string()
        .min(10, 'Title must be at least 10 characters')
        .max(500, 'Title must not exceed 500 characters'),
    description: z
        .string()
        .min(50, 'Description must be at least 50 characters for DPDPA compliance')
        .max(5000, 'Description must not exceed 5000 characters'),
    policyUrl: z
        .string()
        .url('Invalid URL format')
        .optional()
        .nullable(),
    // DPDPA Fields
    dataCategories: z.array(z.string()).default([]),
    processingPurposes: z.array(z.string()).default([]),
    rightsDescription: z.string().optional(),
    withdrawalInstruction: z.string().optional(),
    complaintInstruction: z.string().optional(),
});

// Create notice with initial translation
export const createNoticeSchema = z.object({
    dpoEmail: z.string().email('Invalid email format').optional(),
    translations: z
        .array(noticeTranslationSchema)
        .min(1, 'At least one translation is required')
        .refine(
            (translations) => translations.some((t) => t.languageCode === 'en'),
            { message: 'English (en) translation is mandatory for DPDPA compliance' }
        ),
});

// Update notice translation
export const updateNoticeTranslationSchema = noticeTranslationSchema;

// Batch update translations
export const batchUpdateTranslationsSchema = z.object({
    dpoEmail: z.string().email('Invalid email format').optional(),
    translations: z.array(noticeTranslationSchema).min(1),
});

// Auto translate
export const autoTranslateNoticeSchema = z.object({
    targetLang: languageCodeSchema,
});

// Batch Auto translate
export const batchAutoTranslateNoticeSchema = z.object({
    targetLangs: z.array(languageCodeSchema).min(1),
});

// Notice ID param
export const noticeIdParamSchema = z.object({
    noticeId: z.string().uuid('Invalid notice ID format'),
});

export type NoticeTranslationInput = z.infer<typeof noticeTranslationSchema>;
export type CreateNoticeInput = z.infer<typeof createNoticeSchema>;
export type UpdateNoticeTranslationInput = z.infer<typeof updateNoticeTranslationSchema>;
export type BatchUpdateTranslationsInput = z.infer<typeof batchUpdateTranslationsSchema>;
export type NoticeIdParam = z.infer<typeof noticeIdParamSchema>;
