import { z } from 'zod';

/**
 * Banner customization validation schemas
 * DPDPA Compliance: Dark pattern prevention enforced
 */

// Hex color validation
const hexColorSchema = z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color (e.g., #FFFFFF)');

// Base banner customization schema (without dark pattern validation)
const bannerBaseSchema = z.object({
    // Colors
    primaryColor: hexColorSchema.default('#0066CC'),
    secondaryColor: hexColorSchema.default('#666666'),
    backgroundColor: hexColorSchema.default('#FFFFFF'),
    textColor: hexColorSchema.default('#333333'),

    // Button Configuration
    acceptButtonColor: hexColorSchema.default('#0066CC'),
    rejectButtonColor: hexColorSchema.default('#0066CC'),
    acceptButtonText: z.string().min(2).max(100).default('Accept All'),
    rejectButtonText: z.string().min(2).max(100).default('Reject All'),
    customizeButtonText: z.string().min(2).max(100).default('Customize'),

    // Layout
    position: z.enum(['bottom', 'top', 'center']).default('bottom'),
    layout: z.enum(['banner', 'modal', 'popup']).default('banner'),

    // Typography
    fontFamily: z.string().max(100).optional(),
    fontSize: z.string().regex(/^\d+px$/, 'Font size must be in px format').optional(),

    // Accessibility
    focusOutlineColor: hexColorSchema.optional(),
});

// Dark pattern validation refinement
function validateDarkPatterns(data: z.infer<typeof bannerBaseSchema>, ctx: z.RefinementCtx) {
    // DPDPA Dark Pattern Prevention: Accept and Reject buttons must have equal prominence
    if (data.acceptButtonColor !== data.rejectButtonColor) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'DPDPA Compliance: Accept and Reject buttons must have the same color for equal prominence',
            path: ['rejectButtonColor'],
        });
    }

    // Button text length should be similar (within 50% difference)
    const acceptLen = data.acceptButtonText.length;
    const rejectLen = data.rejectButtonText.length;
    const diff = Math.abs(acceptLen - rejectLen);
    const avgLen = (acceptLen + rejectLen) / 2;

    if (diff / avgLen > 0.5) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'DPDPA Compliance: Accept and Reject button text should be similar in length',
            path: ['rejectButtonText'],
        });
    }
}

// Banner customization schema with dark pattern prevention
export const bannerCustomizationSchema = bannerBaseSchema.superRefine(validateDarkPatterns);

// Update banner customization (partial) - no dark pattern validation for partial updates
export const updateBannerCustomizationSchema = bannerBaseSchema.partial();

export type BannerCustomizationInput = z.infer<typeof bannerCustomizationSchema>;
export type UpdateBannerCustomizationInput = z.infer<typeof updateBannerCustomizationSchema>;
