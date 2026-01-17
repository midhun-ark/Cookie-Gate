import { z } from 'zod';

/**
 * Audit log query validation schemas
 */

// Pagination
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Audit log filters
export const auditLogFiltersSchema = z.object({
    action: z.string().optional(),
    resourceType: z.string().optional(),
    resourceId: z.string().uuid().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
}).merge(paginationSchema);

export type PaginationInput = z.infer<typeof paginationSchema>;
export type AuditLogFiltersInput = z.infer<typeof auditLogFiltersSchema>;
