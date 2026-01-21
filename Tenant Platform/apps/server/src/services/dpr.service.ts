/**
 * Data Principal Requests Service
 * 
 * Business logic for DPR handling including:
 * - OTP-based intake flow
 * - Status state machine
 * - SLA calculations
 * - Email notifications
 */

import {
    dprRepository,
    otpRepository,
    dprCommunicationRepository,
    dprAuditRepository,
    slaConfigRepository,
    DPRRequestType,
    DPRStatus,
    DPROutcome,
    DataPrincipalRequest,
    DPRWithAssignee,
    ListDPRFilters,
    OtpVerification,
} from '../repositories/dpr.repository';
import {
    sendOtpEmail,
    sendAcknowledgementEmail,
    sendResponseEmail,
    generateOtp,
} from './email.service';
import { query } from '../db';

// ============================================================================
// INTAKE SERVICE (Public - no auth)
// ============================================================================

export const dprIntakeService = {
    /**
     * Send OTP for request verification
     */
    async sendOtp(input: {
        websiteId: string;
        email: string;
        requestType: DPRRequestType;
        requestPayload: Record<string, any>;
        submissionLanguage?: string;
    }): Promise<{ success: boolean; message: string }> {
        // Get website and tenant info
        const websiteResult = await query<{ tenantId: string; domain: string; status: string }>(
            `SELECT tenant_id as "tenantId", domain, status FROM websites WHERE id = $1`,
            [input.websiteId]
        );

        if (!websiteResult.rows[0]) {
            throw new Error('Website not found');
        }

        const website = websiteResult.rows[0];
        if (website.status !== 'ACTIVE') {
            throw new Error('Website is not active');
        }

        // Generate OTP
        const otp = generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP
        await otpRepository.create({
            tenantId: website.tenantId,
            websiteId: input.websiteId,
            email: input.email,
            otpCode: otp,
            requestType: input.requestType,
            requestPayload: {
                ...input.requestPayload,
                submissionLanguage: input.submissionLanguage || 'en',
            },
            expiresAt,
        });

        // Send OTP email
        await sendOtpEmail({
            email: input.email,
            otp,
            requestType: input.requestType,
            websiteDomain: website.domain,
        });

        return {
            success: true,
            message: 'OTP sent to your email address',
        };
    },

    /**
     * Verify OTP and create request
     */
    async verifyOtpAndCreateRequest(
        email: string,
        otpCode: string
    ): Promise<{ success: boolean; requestId: string; requestNumber: string }> {
        // Find valid OTP
        const otp = await otpRepository.findValidOtp(email, otpCode);
        if (!otp) {
            throw new Error('Invalid or expired OTP');
        }

        // Get SLA configuration
        const slaConfig = await slaConfigRepository.getOrCreate(otp.tenantId);
        const slaDays = otp.requestType === 'NOMINATION'
            ? slaConfig.nominationSlaDays
            : slaConfig.defaultSlaDays;
        const slaDueDate = new Date(Date.now() + slaDays * 24 * 60 * 60 * 1000);

        // Generate request number
        const requestNumber = await dprRepository.generateRequestNumber(otp.tenantId);

        // Create request
        const request = await dprRepository.create({
            tenantId: otp.tenantId,
            websiteId: otp.websiteId,
            requestNumber,
            requestType: otp.requestType,
            dataPrincipalEmail: email,
            submissionLanguage: otp.requestPayload.submissionLanguage || 'en',
            slaDueDate,
            slaDays,
            originalPayload: otp.requestPayload,
        });

        // Mark OTP as verified
        await otpRepository.markVerified(otp.id);

        // Log audit
        await dprAuditRepository.create({
            requestId: request.id,
            actorEmail: email,
            action: 'REQUEST_SUBMITTED',
            newValue: {
                requestNumber,
                requestType: otp.requestType,
                slaDueDate,
                slaDays,
            },
        });

        return {
            success: true,
            requestId: request.id,
            requestNumber,
        };
    },

    /**
     * Get public status of a request (for data principal)
     */
    async getPublicStatus(requestId: string): Promise<{
        requestNumber: string;
        status: DPRStatus;
        responseOutcome?: DPROutcome;
        createdAt: Date;
    } | null> {
        const result = await query<{
            requestNumber: string;
            status: DPRStatus;
            responseOutcome: DPROutcome | null;
            createdAt: Date;
        }>(
            `SELECT 
                request_number as "requestNumber", status, 
                response_outcome as "responseOutcome", created_at as "createdAt"
             FROM data_principal_requests
             WHERE id = $1`,
            [requestId]
        );
        const row = result.rows[0];
        if (!row) return null;

        return {
            requestNumber: row.requestNumber,
            status: row.status,
            responseOutcome: row.responseOutcome ?? undefined,
            createdAt: row.createdAt,
        };
    },
};

// ============================================================================
// DPR ADMIN SERVICE (Authenticated)
// ============================================================================

export const dprService = {
    /**
     * List requests with filters
     */
    async listRequests(filters: ListDPRFilters): Promise<DPRWithAssignee[]> {
        // Get SLA config for warning threshold
        const slaConfig = await slaConfigRepository.getOrCreate(filters.tenantId);
        return dprRepository.list({
            ...filters,
            warningThresholdDays: slaConfig.warningThresholdDays,
        });
    },

    /**
     * Get request by ID
     */
    async getRequest(id: string, tenantId: string): Promise<DPRWithAssignee | null> {
        return dprRepository.findById(id, tenantId);
    },

    /**
     * Get request communications
     */
    async getCommunications(requestId: string, tenantId: string) {
        // Verify request belongs to tenant
        const request = await dprRepository.findById(requestId, tenantId);
        if (!request) {
            throw new Error('Request not found');
        }
        return dprCommunicationRepository.findByRequest(requestId);
    },

    /**
     * Get request audit log
     */
    async getAuditLog(requestId: string, tenantId: string) {
        // Verify request belongs to tenant
        const request = await dprRepository.findById(requestId, tenantId);
        if (!request) {
            throw new Error('Request not found');
        }
        return dprAuditRepository.findByRequest(requestId);
    },

    /**
     * Assign request to team member
     */
    async assignRequest(
        id: string,
        tenantId: string,
        assignedTo: string | null,
        actorId: string,
        actorEmail: string,
        ipAddress?: string
    ): Promise<DataPrincipalRequest> {
        const existing = await dprRepository.findById(id, tenantId);
        if (!existing) {
            throw new Error('Request not found');
        }

        // Cannot modify rejected/resolved requests
        if (existing.status === 'RESOLVED' ||
            (existing.status === 'RESPONDED' && existing.responseOutcome === 'REJECTED')) {
            throw new Error('Cannot modify closed or rejected requests');
        }

        const updated = await dprRepository.updateAssignment(id, tenantId, assignedTo);
        if (!updated) {
            throw new Error('Failed to update assignment');
        }

        // Log audit
        await dprAuditRepository.create({
            requestId: id,
            actorId,
            actorEmail,
            action: 'ASSIGNMENT_CHANGED',
            previousValue: { assignedTo: existing.assignedTo },
            newValue: { assignedTo },
            ipAddress,
        });

        return updated;
    },

    /**
     * Update SLA for request
     */
    async updateSla(
        id: string,
        tenantId: string,
        slaDays: number,
        actorId: string,
        actorEmail: string,
        ipAddress?: string
    ): Promise<DataPrincipalRequest> {
        const existing = await dprRepository.findById(id, tenantId);
        if (!existing) {
            throw new Error('Request not found');
        }

        // Cannot modify rejected/resolved requests
        if (existing.status === 'RESOLVED' ||
            (existing.status === 'RESPONDED' && existing.responseOutcome === 'REJECTED')) {
            throw new Error('Cannot modify closed or rejected requests');
        }

        // Calculate new due date from original submission
        const slaDueDate = new Date(existing.createdAt);
        slaDueDate.setDate(slaDueDate.getDate() + slaDays);

        const updated = await dprRepository.updateSla(id, tenantId, slaDays, slaDueDate);
        if (!updated) {
            throw new Error('Failed to update SLA');
        }

        // Log audit
        await dprAuditRepository.create({
            requestId: id,
            actorId,
            actorEmail,
            action: 'SLA_UPDATED',
            previousValue: { slaDays: existing.slaDays, slaDueDate: existing.slaDueDate },
            newValue: { slaDays, slaDueDate },
            ipAddress,
        });

        return updated;
    },

    /**
     * Start work on request (SUBMITTED -> WORK_IN_PROGRESS)
     */
    async startWork(
        id: string,
        tenantId: string,
        actorId: string,
        actorEmail: string,
        ipAddress?: string
    ): Promise<DataPrincipalRequest> {
        const existing = await dprRepository.findById(id, tenantId);
        if (!existing) {
            throw new Error('Request not found');
        }

        if (existing.status !== 'SUBMITTED') {
            throw new Error('Can only start work on submitted requests');
        }

        const updated = await dprRepository.startWork(id, tenantId);
        if (!updated) {
            throw new Error('Failed to start work');
        }

        // Send acknowledgement email
        await sendAcknowledgementEmail({
            email: existing.dataPrincipalEmail,
            requestId: existing.id,
            requestNumber: existing.requestNumber,
            requestType: existing.requestType,
            websiteDomain: existing.websiteDomain || '',
        });

        // Log communication
        await dprCommunicationRepository.create({
            requestId: id,
            direction: 'OUTGOING',
            subject: `Request Acknowledged - ${existing.requestNumber}`,
            body: `Your ${existing.requestType} request has been acknowledged and is now being processed.`,
            sentAt: new Date(),
        });

        // Log audit
        await dprAuditRepository.create({
            requestId: id,
            actorId,
            actorEmail,
            action: 'STATUS_CHANGED',
            previousValue: { status: 'SUBMITTED' },
            newValue: { status: 'WORK_IN_PROGRESS' },
            ipAddress,
        });

        return updated;
    },

    /**
     * Respond to request (WORK_IN_PROGRESS -> RESPONDED)
     */
    async respond(
        id: string,
        tenantId: string,
        outcome: DPROutcome,
        reason: string,
        attachments: any[],
        actorId: string,
        actorEmail: string,
        ipAddress?: string
    ): Promise<DataPrincipalRequest> {
        const existing = await dprRepository.findById(id, tenantId);
        if (!existing) {
            throw new Error('Request not found');
        }

        if (existing.status !== 'WORK_IN_PROGRESS') {
            throw new Error('Can only respond to requests in progress');
        }

        const updated = await dprRepository.respond(id, tenantId, outcome, reason, attachments);
        if (!updated) {
            throw new Error('Failed to respond');
        }

        // Send response email
        await sendResponseEmail({
            email: existing.dataPrincipalEmail,
            requestNumber: existing.requestNumber,
            requestType: existing.requestType,
            outcome,
            reason,
            websiteDomain: existing.websiteDomain || '',
        });

        // Log communication
        await dprCommunicationRepository.create({
            requestId: id,
            direction: 'OUTGOING',
            subject: `Request Response - ${existing.requestNumber}`,
            body: reason,
            attachments,
            sentAt: new Date(),
        });

        // Log audit
        await dprAuditRepository.create({
            requestId: id,
            actorId,
            actorEmail,
            action: 'REQUEST_RESPONDED',
            previousValue: { status: 'WORK_IN_PROGRESS' },
            newValue: { status: 'RESPONDED', outcome, reason },
            ipAddress,
        });

        return updated;
    },

    /**
     * Close request (RESPONDED -> RESOLVED)
     * Only for FULFILLED or PARTIALLY_FULFILLED outcomes
     */
    async closeRequest(
        id: string,
        tenantId: string,
        actorId: string,
        actorEmail: string,
        ipAddress?: string
    ): Promise<DataPrincipalRequest> {
        const existing = await dprRepository.findById(id, tenantId);
        if (!existing) {
            throw new Error('Request not found');
        }

        if (existing.status !== 'RESPONDED') {
            throw new Error('Can only close responded requests');
        }

        if (existing.responseOutcome === 'REJECTED') {
            throw new Error('Rejected requests cannot be closed - they are already terminal');
        }

        const updated = await dprRepository.close(id, tenantId);
        if (!updated) {
            throw new Error('Failed to close request');
        }

        // Log audit
        await dprAuditRepository.create({
            requestId: id,
            actorId,
            actorEmail,
            action: 'REQUEST_CLOSED',
            previousValue: { status: 'RESPONDED' },
            newValue: { status: 'RESOLVED' },
            ipAddress,
        });

        return updated;
    },

    /**
     * Get SLA configuration
     */
    async getSlaConfig(tenantId: string) {
        return slaConfigRepository.getOrCreate(tenantId);
    },

    /**
     * Update SLA configuration
     */
    async updateSlaConfig(
        tenantId: string,
        input: {
            defaultSlaDays?: number;
            nominationSlaDays?: number;
            warningThresholdDays?: number;
        },
        actorId: string,
        actorEmail: string
    ) {
        return slaConfigRepository.update(tenantId, input);
    },

    /**
     * Calculate SLA state for a request
     */
    getSlaState(
        slaDueDate: Date,
        status: DPRStatus,
        warningThresholdDays: number = 5
    ): 'NORMAL' | 'WARNING' | 'BREACHED' {
        // Completed requests don't have SLA state
        if (status === 'RESPONDED' || status === 'RESOLVED') {
            return 'NORMAL';
        }

        const now = new Date();
        const dueDate = new Date(slaDueDate);
        const warningDate = new Date(dueDate);
        warningDate.setDate(warningDate.getDate() - warningThresholdDays);

        if (now > dueDate) {
            return 'BREACHED';
        } else if (now >= warningDate) {
            return 'WARNING';
        }
        return 'NORMAL';
    },
};
