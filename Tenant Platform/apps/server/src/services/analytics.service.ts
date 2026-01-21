import { query } from '../db';

export const analyticsService = {
    /**
     * Get paginated consent logs for a tenant (optionally filtered by website)
     */
    async getConsentLogs(
        tenantId: string,
        websiteId?: string,
        page: number = 1,
        limit: number = 10
    ) {
        const offset = (page - 1) * limit;
        const params: any[] = [tenantId];
        let whereClause = `w.tenant_id = $1`;

        if (websiteId) {
            params.push(websiteId);
            whereClause += ` AND cl.website_id = $2`;
        }

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) 
             FROM consent_logs cl
             JOIN websites w ON cl.website_id = w.id
             WHERE ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count, 10);

        // Get logs
        const result = await query(
            `SELECT 
                cl.id,
                cl.anonymous_id as "anonymousId",
                cl.preferences,
                cl.user_agent as "userAgent",
                cl.ip_address as "ipAddress",
                cl.country_code as "countryCode",
                cl.created_at as "createdAt",
                w.domain as "websiteDomain"
             FROM consent_logs cl
             JOIN websites w ON cl.website_id = w.id
             WHERE ${whereClause}
             ORDER BY cl.created_at DESC
             LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, limit, offset]
        );

        return {
            items: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },

    /**
     * Get aggregate stats for a tenant (optionally filtered by website)
     */
    async getStats(tenantId: string, websiteId?: string) {
        const params: any[] = [tenantId];
        let whereClause = `w.tenant_id = $1`;

        if (websiteId) {
            params.push(websiteId);
            whereClause += ` AND cl.website_id = $2`;
        }

        // Total consents
        const totalResult = await query(
            `SELECT COUNT(*) 
             FROM consent_logs cl
             JOIN websites w ON cl.website_id = w.id
             WHERE ${whereClause}`,
            params
        );
        const totalConsents = parseInt(totalResult.rows[0].count, 10);

        // Consent rate
        const acceptedResult = await query(
            `SELECT COUNT(*) 
             FROM consent_logs cl
             JOIN websites w ON cl.website_id = w.id
             WHERE ${whereClause} 
             AND cl.preferences::text != '{"essential":true}'`,
            params
        );
        const acceptedConsents = parseInt(acceptedResult.rows[0].count, 10);

        // Daily trend (Last 7 days)
        const trendResult = await query(
            `SELECT 
                DATE(cl.created_at) as date,
                COUNT(*) as count
             FROM consent_logs cl
             JOIN websites w ON cl.website_id = w.id
             WHERE ${whereClause}
             AND cl.created_at >= NOW() - INTERVAL '7 days'
             GROUP BY DATE(cl.created_at)
             ORDER BY date ASC`,
            params
        );

        return {
            totalConsents,
            acceptedConsents,
            optInRate: totalConsents > 0 ? (acceptedConsents / totalConsents) * 100 : 0,
            dailyTrend: trendResult.rows,
        };
    }
};
