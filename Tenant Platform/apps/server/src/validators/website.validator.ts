import { z } from 'zod';

/**
 * Website-related validation schemas
 */

// Domain validation regex
const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

// Create website
export const createWebsiteSchema = z.object({
    domain: z
        .string()
        .min(1, 'Domain is required')
        .regex(domainRegex, 'Invalid domain format')
        .transform((val) => val.toLowerCase().trim()),
});

// Update website status
export const updateWebsiteStatusSchema = z.object({
    status: z.enum(['DRAFT', 'ACTIVE', 'DISABLED'], {
        errorMap: () => ({ message: 'Status must be DRAFT, ACTIVE, or DISABLED' }),
    }),
});

// Website ID param
export const websiteIdParamSchema = z.object({
    id: z.string().uuid('Invalid website ID format'),
});

export type CreateWebsiteInput = z.infer<typeof createWebsiteSchema>;
export type UpdateWebsiteStatusInput = z.infer<typeof updateWebsiteStatusSchema>;
export type WebsiteIdParam = z.infer<typeof websiteIdParamSchema>;
