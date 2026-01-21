/**
 * Data Principal Requests Repository
 * 
 * Database operations for DPR requests, OTP, communications, and audit
 */

import { query, withTransaction } from '../db';
import { PoolClient } from 'pg';

// ============================================================================
// TYPES
// ============================================================================

export type DPRRequestType = 'ACCESS' | 'CORRECTION' | 'ERASURE' | 'NOMINATION' | 'GRIEVANCE';
export type DPRStatus = 'SUBMITTED' | 'WORK_IN_PROGRESS' | 'RESPONDED' | 'RESOLVED';
export type DPROutcome = 'FULFILLED' | 'PARTIALLY_FULFILLED' | 'REJECTED';

export interface DataPrincipalRequest {
    id: string;
    tenantId: string;
    websiteId: string;
    requestNumber: string;
    requestType: DPRRequestType;
    dataPrincipalEmail: string;
    submissionLanguage: string;
    status: DPRStatus;
    responseOutcome: DPROutcome | null;
    assignedTo: string | null;
    slaDueDate: Date;
    slaDays: number;
    originalPayload: Record<string, any>;
    responseReason: string | null;
    responseAttachments: Array<{ name: string; url: string }>;
    respondedAt: Date | null;
    closedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface DPRWithAssignee extends DataPrincipalRequest {
    assigneeName?: string;
    assigneeEmail?: string;
    websiteDomain?: string;
}

export interface OtpVerification {
    id: string;
    tenantId: string;
    websiteId: string;
    email: string;
    otpCode: string;
    requestType: DPRRequestType;
    requestPayload: Record<string, any>;
    expiresAt: Date;
    verifiedAt: Date | null;
    createdAt: Date;
}

export interface DPRCommunication {
    id: string;
    requestId: string;
    direction: 'INCOMING' | 'OUTGOING';
    subject: string;
    body: string;
    attachments: Array<{ name: string; url: string }>;
    sentAt: Date;
    messageId: string | null;
    createdAt: Date;
}

export interface DPRAuditEntry {
    id: string;
    requestId: string;
    actorId: string | null;
    actorEmail: string;
    action: string;
    previousValue: Record<string, any> | null;
    newValue: Record<string, any> | null;
    ipAddress: string | null;
    createdAt: Date;
}

export interface ListDPRFilters {
    tenantId: string;
    requestType?: DPRRequestType;
    status?: DPRStatus;
    assignedTo?: string;
    submissionLanguage?: string;
    slaState?: 'NORMAL' | 'WARNING' | 'BREACHED';
    warningThresholdDays?: number;
}

// ============================================================================
// OTP REPOSITORY
// ============================================================================

export const otpRepository = {
    async create(input: {
        tenantId: string;
        websiteId: string;
        email: string;
        otpCode: string;
        requestType: DPRRequestType;
        requestPayload: Record<string, any>;
        expiresAt: Date;
    }): Promise<OtpVerification> {
        const result = await query<OtpVerification>(
            `INSERT INTO dpr_otp_verifications 
             (tenant_id, website_id, email, otp_code, request_type, request_payload, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING 
                id, tenant_id as "tenantId", website_id as "websiteId", email,
                otp_code as "otpCode", request_type as "requestType", 
                request_payload as "requestPayload", expires_at as "expiresAt",
                verified_at as "verifiedAt", created_at as "createdAt"`,
            [input.tenantId, input.websiteId, input.email, input.otpCode,
            input.requestType, JSON.stringify(input.requestPayload), input.expiresAt]
        );
        return result.rows[0];
    },

    async findValidOtp(email: string, otpCode: string): Promise<OtpVerification | null> {
        const result = await query<OtpVerification>(
            `SELECT 
                id, tenant_id as "tenantId", website_id as "websiteId", email,
                otp_code as "otpCode", request_type as "requestType", 
                request_payload as "requestPayload", expires_at as "expiresAt",
                verified_at as "verifiedAt", created_at as "createdAt"
             FROM dpr_otp_verifications
             WHERE email = $1 AND otp_code = $2 AND expires_at > NOW() AND verified_at IS NULL
             ORDER BY created_at DESC
             LIMIT 1`,
            [email, otpCode]
        );
        return result.rows[0] || null;
    },

    async markVerified(id: string): Promise<void> {
        await query(
            'UPDATE dpr_otp_verifications SET verified_at = NOW() WHERE id = $1',
            [id]
        );
    },

    async deleteExpired(): Promise<number> {
        const result = await query(
            'DELETE FROM dpr_otp_verifications WHERE expires_at < NOW()',
            []
        );
        return result.rowCount ?? 0;
    },
};

// ============================================================================
// DPR REPOSITORY
// ============================================================================

export const dprRepository = {
    /**
     * Generate a unique request number
     */
    async generateRequestNumber(tenantId: string): Promise<string> {
        const year = new Date().getFullYear();
        const result = await query<{ count: string }>(
            `SELECT COUNT(*) as count FROM data_principal_requests 
             WHERE tenant_id = $1 AND EXTRACT(YEAR FROM created_at) = $2`,
            [tenantId, year]
        );
        const count = parseInt(result.rows[0].count, 10) + 1;
        return `DPR-${year}-${count.toString().padStart(4, '0')}`;
    },

    /**
     * Create a new request
     */
    async create(input: {
        tenantId: string;
        websiteId: string;
        requestNumber: string;
        requestType: DPRRequestType;
        dataPrincipalEmail: string;
        submissionLanguage: string;
        slaDueDate: Date;
        slaDays: number;
        originalPayload: Record<string, any>;
    }): Promise<DataPrincipalRequest> {
        const result = await query<DataPrincipalRequest>(
            `INSERT INTO data_principal_requests 
             (tenant_id, website_id, request_number, request_type, data_principal_email,
              submission_language, sla_due_date, sla_days, original_payload)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING 
                id, tenant_id as "tenantId", website_id as "websiteId",
                request_number as "requestNumber", request_type as "requestType",
                data_principal_email as "dataPrincipalEmail", submission_language as "submissionLanguage",
                status, response_outcome as "responseOutcome", assigned_to as "assignedTo",
                sla_due_date as "slaDueDate", sla_days as "slaDays",
                original_payload as "originalPayload", response_reason as "responseReason",
                response_attachments as "responseAttachments",
                responded_at as "respondedAt", closed_at as "closedAt",
                created_at as "createdAt", updated_at as "updatedAt"`,
            [input.tenantId, input.websiteId, input.requestNumber, input.requestType,
            input.dataPrincipalEmail, input.submissionLanguage, input.slaDueDate,
            input.slaDays, JSON.stringify(input.originalPayload)]
        );
        return result.rows[0];
    },

    /**
     * List requests with filters
     */
    async list(filters: ListDPRFilters): Promise<DPRWithAssignee[]> {
        let whereClause = 'dpr.tenant_id = $1';
        const params: any[] = [filters.tenantId];
        let paramIndex = 2;

        if (filters.requestType) {
            whereClause += ` AND dpr.request_type = $${paramIndex++}`;
            params.push(filters.requestType);
        }

        if (filters.status) {
            whereClause += ` AND dpr.status = $${paramIndex++}`;
            params.push(filters.status);
        }

        if (filters.assignedTo) {
            whereClause += ` AND dpr.assigned_to = $${paramIndex++}`;
            params.push(filters.assignedTo);
        }

        if (filters.submissionLanguage) {
            whereClause += ` AND dpr.submission_language = $${paramIndex++}`;
            params.push(filters.submissionLanguage);
        }

        // SLA state filtering
        if (filters.slaState) {
            const warningDays = filters.warningThresholdDays ?? 5;
            if (filters.slaState === 'BREACHED') {
                whereClause += ` AND dpr.sla_due_date < NOW() AND dpr.status NOT IN ('RESPONDED', 'RESOLVED')`;
            } else if (filters.slaState === 'WARNING') {
                whereClause += ` AND dpr.sla_due_date >= NOW() AND dpr.sla_due_date <= NOW() + INTERVAL '${warningDays} days' AND dpr.status NOT IN ('RESPONDED', 'RESOLVED')`;
            } else { // NORMAL
                whereClause += ` AND dpr.sla_due_date > NOW() + INTERVAL '${warningDays} days' AND dpr.status NOT IN ('RESPONDED', 'RESOLVED')`;
            }
        }

        const result = await query<DPRWithAssignee>(
            `SELECT 
                dpr.id, dpr.tenant_id as "tenantId", dpr.website_id as "websiteId",
                dpr.request_number as "requestNumber", dpr.request_type as "requestType",
                dpr.data_principal_email as "dataPrincipalEmail", 
                dpr.submission_language as "submissionLanguage",
                dpr.status, dpr.response_outcome as "responseOutcome", 
                dpr.assigned_to as "assignedTo",
                dpr.sla_due_date as "slaDueDate", dpr.sla_days as "slaDays",
                dpr.original_payload as "originalPayload", 
                dpr.response_reason as "responseReason",
                dpr.response_attachments as "responseAttachments",
                dpr.responded_at as "respondedAt", dpr.closed_at as "closedAt",
                dpr.created_at as "createdAt", dpr.updated_at as "updatedAt",
                ptm.full_name as "assigneeName", ptm.email as "assigneeEmail",
                w.domain as "websiteDomain"
             FROM data_principal_requests dpr
             LEFT JOIN privacy_team_members ptm ON dpr.assigned_to = ptm.id
             LEFT JOIN websites w ON dpr.website_id = w.id
             WHERE ${whereClause}
             ORDER BY dpr.sla_due_date ASC`,
            params
        );
        return result.rows;
    },

    /**
     * Find by ID
     */
    async findById(id: string, tenantId: string): Promise<DPRWithAssignee | null> {
        const result = await query<DPRWithAssignee>(
            `SELECT 
                dpr.id, dpr.tenant_id as "tenantId", dpr.website_id as "websiteId",
                dpr.request_number as "requestNumber", dpr.request_type as "requestType",
                dpr.data_principal_email as "dataPrincipalEmail", 
                dpr.submission_language as "submissionLanguage",
                dpr.status, dpr.response_outcome as "responseOutcome", 
                dpr.assigned_to as "assignedTo",
                dpr.sla_due_date as "slaDueDate", dpr.sla_days as "slaDays",
                dpr.original_payload as "originalPayload", 
                dpr.response_reason as "responseReason",
                dpr.response_attachments as "responseAttachments",
                dpr.responded_at as "respondedAt", dpr.closed_at as "closedAt",
                dpr.created_at as "createdAt", dpr.updated_at as "updatedAt",
                ptm.full_name as "assigneeName", ptm.email as "assigneeEmail",
                w.domain as "websiteDomain"
             FROM data_principal_requests dpr
             LEFT JOIN privacy_team_members ptm ON dpr.assigned_to = ptm.id
             LEFT JOIN websites w ON dpr.website_id = w.id
             WHERE dpr.id = $1 AND dpr.tenant_id = $2`,
            [id, tenantId]
        );
        return result.rows[0] || null;
    },

    /**
     * Update assignment
     */
    async updateAssignment(id: string, tenantId: string, assignedTo: string | null): Promise<DataPrincipalRequest | null> {
        const result = await query<DataPrincipalRequest>(
            `UPDATE data_principal_requests
             SET assigned_to = $3, updated_at = NOW()
             WHERE id = $1 AND tenant_id = $2
             RETURNING id, status`,
            [id, tenantId, assignedTo]
        );
        return result.rows[0] || null;
    },

    /**
     * Update SLA
     */
    async updateSla(id: string, tenantId: string, slaDays: number, slaDueDate: Date): Promise<DataPrincipalRequest | null> {
        const result = await query<DataPrincipalRequest>(
            `UPDATE data_principal_requests
             SET sla_days = $3, sla_due_date = $4, updated_at = NOW()
             WHERE id = $1 AND tenant_id = $2
             RETURNING id, status`,
            [id, tenantId, slaDays, slaDueDate]
        );
        return result.rows[0] || null;
    },

    /**
     * Update status to Work in Progress
     */
    async startWork(id: string, tenantId: string): Promise<DataPrincipalRequest | null> {
        const result = await query<DataPrincipalRequest>(
            `UPDATE data_principal_requests
             SET status = 'WORK_IN_PROGRESS', updated_at = NOW()
             WHERE id = $1 AND tenant_id = $2 AND status = 'SUBMITTED'
             RETURNING id, status, data_principal_email as "dataPrincipalEmail",
                       request_type as "requestType", request_number as "requestNumber"`,
            [id, tenantId]
        );
        return result.rows[0] || null;
    },

    /**
     * Respond to request
     */
    async respond(id: string, tenantId: string, outcome: DPROutcome, reason: string, attachments?: any[]): Promise<DataPrincipalRequest | null> {
        const result = await query<DataPrincipalRequest>(
            `UPDATE data_principal_requests
             SET status = 'RESPONDED', response_outcome = $3, response_reason = $4,
                 response_attachments = $5, responded_at = NOW(), updated_at = NOW()
             WHERE id = $1 AND tenant_id = $2 AND status = 'WORK_IN_PROGRESS'
             RETURNING id, status, response_outcome as "responseOutcome",
                       data_principal_email as "dataPrincipalEmail",
                       request_type as "requestType", request_number as "requestNumber"`,
            [id, tenantId, outcome, reason, JSON.stringify(attachments || [])]
        );
        return result.rows[0] || null;
    },

    /**
     * Close request
     */
    async close(id: string, tenantId: string): Promise<DataPrincipalRequest | null> {
        const result = await query<DataPrincipalRequest>(
            `UPDATE data_principal_requests
             SET status = 'RESOLVED', closed_at = NOW(), updated_at = NOW()
             WHERE id = $1 AND tenant_id = $2 
               AND status = 'RESPONDED' 
               AND response_outcome IN ('FULFILLED', 'PARTIALLY_FULFILLED')
             RETURNING id, status`,
            [id, tenantId]
        );
        return result.rows[0] || null;
    },
};

// ============================================================================
// COMMUNICATION REPOSITORY
// ============================================================================

export const dprCommunicationRepository = {
    async create(input: {
        requestId: string;
        direction: 'INCOMING' | 'OUTGOING';
        subject: string;
        body: string;
        attachments?: any[];
        sentAt: Date;
        messageId?: string;
    }): Promise<DPRCommunication> {
        const result = await query<DPRCommunication>(
            `INSERT INTO dpr_communications 
             (request_id, direction, subject, body, attachments, sent_at, message_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING 
                id, request_id as "requestId", direction, subject, body,
                attachments, sent_at as "sentAt", message_id as "messageId",
                created_at as "createdAt"`,
            [input.requestId, input.direction, input.subject, input.body,
            JSON.stringify(input.attachments || []), input.sentAt, input.messageId]
        );
        return result.rows[0];
    },

    async findByRequest(requestId: string): Promise<DPRCommunication[]> {
        const result = await query<DPRCommunication>(
            `SELECT 
                id, request_id as "requestId", direction, subject, body,
                attachments, sent_at as "sentAt", message_id as "messageId",
                created_at as "createdAt"
             FROM dpr_communications
             WHERE request_id = $1
             ORDER BY sent_at ASC`,
            [requestId]
        );
        return result.rows;
    },
};

// ============================================================================
// AUDIT REPOSITORY
// ============================================================================

export const dprAuditRepository = {
    async create(input: {
        requestId: string;
        actorId?: string;
        actorEmail: string;
        action: string;
        previousValue?: Record<string, any>;
        newValue?: Record<string, any>;
        ipAddress?: string;
    }): Promise<DPRAuditEntry> {
        const result = await query<DPRAuditEntry>(
            `INSERT INTO dpr_audit_entries 
             (request_id, actor_id, actor_email, action, previous_value, new_value, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING 
                id, request_id as "requestId", actor_id as "actorId",
                actor_email as "actorEmail", action,
                previous_value as "previousValue", new_value as "newValue",
                ip_address as "ipAddress", created_at as "createdAt"`,
            [input.requestId, input.actorId, input.actorEmail, input.action,
            input.previousValue ? JSON.stringify(input.previousValue) : null,
            input.newValue ? JSON.stringify(input.newValue) : null,
            input.ipAddress]
        );
        return result.rows[0];
    },

    async findByRequest(requestId: string): Promise<DPRAuditEntry[]> {
        const result = await query<DPRAuditEntry>(
            `SELECT 
                id, request_id as "requestId", actor_id as "actorId",
                actor_email as "actorEmail", action,
                previous_value as "previousValue", new_value as "newValue",
                ip_address as "ipAddress", created_at as "createdAt"
             FROM dpr_audit_entries
             WHERE request_id = $1
             ORDER BY created_at ASC`,
            [requestId]
        );
        return result.rows;
    },
};

// ============================================================================
// SLA CONFIGURATION REPOSITORY
// ============================================================================

export interface SlaConfiguration {
    id: string;
    tenantId: string;
    defaultSlaDays: number;
    nominationSlaDays: number;
    warningThresholdDays: number;
}

export const slaConfigRepository = {
    async getOrCreate(tenantId: string): Promise<SlaConfiguration> {
        // Try to get existing
        let result = await query<SlaConfiguration>(
            `SELECT 
                id, tenant_id as "tenantId", default_sla_days as "defaultSlaDays",
                nomination_sla_days as "nominationSlaDays", 
                warning_threshold_days as "warningThresholdDays"
             FROM sla_configurations
             WHERE tenant_id = $1`,
            [tenantId]
        );

        if (result.rows[0]) {
            return result.rows[0];
        }

        // Create default
        result = await query<SlaConfiguration>(
            `INSERT INTO sla_configurations (tenant_id)
             VALUES ($1)
             RETURNING 
                id, tenant_id as "tenantId", default_sla_days as "defaultSlaDays",
                nomination_sla_days as "nominationSlaDays", 
                warning_threshold_days as "warningThresholdDays"`,
            [tenantId]
        );
        return result.rows[0];
    },

    async update(tenantId: string, input: Partial<Omit<SlaConfiguration, 'id' | 'tenantId'>>): Promise<SlaConfiguration> {
        const result = await query<SlaConfiguration>(
            `UPDATE sla_configurations
             SET 
                default_sla_days = COALESCE($2, default_sla_days),
                nomination_sla_days = COALESCE($3, nomination_sla_days),
                warning_threshold_days = COALESCE($4, warning_threshold_days),
                updated_at = NOW()
             WHERE tenant_id = $1
             RETURNING 
                id, tenant_id as "tenantId", default_sla_days as "defaultSlaDays",
                nomination_sla_days as "nominationSlaDays", 
                warning_threshold_days as "warningThresholdDays"`,
            [tenantId, input.defaultSlaDays, input.nominationSlaDays, input.warningThresholdDays]
        );
        return result.rows[0];
    },
};
