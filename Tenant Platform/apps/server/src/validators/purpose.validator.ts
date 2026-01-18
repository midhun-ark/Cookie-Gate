import { z } from 'zod';

/**
 * Purpose-related validation schemas
 * DPDPA Compliance: Purposes must be specific and clear
 */

// Language code validation (ISO 639-1)
const languageCodeSchema = z
    .string()
    .min(2)
    .max(10)
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid language code format');

// Purpose translation
export const purposeTranslationSchema = z.object({
    languageCode: languageCodeSchema,
    name: z
        .string()
        .min(3, 'Purpose name must be at least 3 characters')
        .max(255, 'Purpose name must not exceed 255 characters'),
    description: z
        .string()
        .max(2000, 'Description must not exceed 2000 characters')
        .optional()
        .or(z.literal('')),
});

// Create purpose
export const createPurposeSchema = z.object({
    isEssential: z.boolean().default(false),
    tag: z
        .string()
        .min(1)
        .max(50)
        .regex(/^[a-z0-9_]+$/, 'Tag must be lowercase, numbers, and underscores only'),
    displayOrder: z.number().int().min(0).default(0),
    translations: z
        .array(purposeTranslationSchema)
        .min(1, 'At least one translation is required')
        .refine(
            (translations) => translations.some((t) => t.languageCode === 'en'),
            { message: 'English (en) translation is mandatory' }
        ),
});

// Update purpose
export const updatePurposeSchema = z.object({
    isEssential: z.boolean().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    displayOrder: z.number().int().min(0).optional(),
}).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
);

// Update purpose translation
export const updatePurposeTranslationSchema = z.object({
    translations: z.array(purposeTranslationSchema).min(1),
});

// Purpose ID param
export const purposeIdParamSchema = z.object({
    purposeId: z.string().uuid('Invalid purpose ID format'),
});

export type PurposeTranslationInput = z.infer<typeof purposeTranslationSchema>;
export type CreatePurposeInput = z.infer<typeof createPurposeSchema>;
export type UpdatePurposeInput = z.infer<typeof updatePurposeSchema>;
export type UpdatePurposeTranslationInput = z.infer<typeof updatePurposeTranslationSchema>;
export type PurposeIdParam = z.infer<typeof purposeIdParamSchema>;
