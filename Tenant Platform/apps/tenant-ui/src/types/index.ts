/**
 * Types for the Tenant Platform UI
 */

// User & Auth
export interface TenantUser {
    id: string;
    tenantId: string;
    email: string;
    mustResetPassword: boolean;
    status: 'ACTIVE' | 'SUSPENDED';
    createdAt: string;
}

export interface Tenant {
    id: string;
    name: string;
    status: 'ACTIVE' | 'SUSPENDED';
    createdAt: string;
}

export interface LoginResponse {
    user: TenantUser;
    tenant: Tenant;
    token: string;
    mustResetPassword: boolean;
}

// Website
export type WebsiteStatus = 'DRAFT' | 'ACTIVE' | 'DISABLED';

export interface Website {
    id: string;
    tenantId: string;
    domain: string;
    status: WebsiteStatus;
    createdAt: string;
    updatedAt: string;
}

export interface WebsiteWithStats extends Website {
    hasNotice: boolean;
    purposeCount: number;
    hasEnglishNotice: boolean;
    hasBanner: boolean;
}

export interface CanActivateResult {
    canActivate: boolean;
    reasons: string[];
}

// Website Version
export type VersionStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface WebsiteVersion {
    id: string;
    websiteId: string;
    versionNumber: number;
    versionName: string;
    status: VersionStatus;
    createdAt: string;
    updatedAt: string;
}

// Notice
export interface NoticeTranslation {
    id: string;
    websiteNoticeId: string;
    languageCode: string;
    title: string;
    description: string;
    policyUrl?: string;
    // DPDPA Fields
    dataCategories?: string[];
    processingPurposes?: string[];
    rightsDescription?: string;
    withdrawalInstruction?: string;
    complaintInstruction?: string;
    createdAt: string;
    updatedAt: string;
}

export interface WebsiteNotice {
    id: string;
    versionId: string;
    dpoEmail?: string;
    createdAt: string;
    updatedAt: string;
    translations: NoticeTranslation[];
}

// Purpose
export type PurposeStatus = 'ACTIVE' | 'INACTIVE';

export interface PurposeTranslation {
    id: string;
    purposeId: string;
    languageCode: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
}

export interface Purpose {
    id: string;
    versionId: string;
    isEssential: boolean;
    tag: string;
    status: PurposeStatus;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
    translations: PurposeTranslation[];
}

// Banner
export type BannerPosition = 'bottom' | 'top' | 'center';
export type BannerLayout = 'banner' | 'modal' | 'popup';

export interface BannerCustomization {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    acceptButtonColor: string;
    rejectButtonColor: string;
    acceptButtonText: string;
    rejectButtonText: string;
    customizeButtonText: string;
    position: BannerPosition;
    layout: BannerLayout;
    fontFamily?: string;
    fontSize?: string;
    focusOutlineColor?: string;
}

// Audit
export interface AuditLog {
    id: string;
    tenantId: string;
    actorId: string;
    actorEmail: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    metadata: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
}

export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

// Language
export interface SupportedLanguage {
    code: string;
    name: string;
    nativeName: string;
    isRtl: boolean;
    isActive: boolean;
}

// Analytics
export interface ConsentLog {
    id: string;
    anonymousId: string;
    preferences: Record<string, boolean>;
    ipAddress?: string;
    userAgent?: string;
    countryCode?: string;
    createdAt: string;
}

export interface AnalyticsStats {
    totalConsents: number;
    acceptedConsents: number;
    optInRate: number;
    dailyTrend: Array<{
        date: string;
        count: string;
    }>;
}

// API Response
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: Array<{ field?: string; message: string }>;
    pagination?: PaginationInfo;
}

// ============================================================================
// Privacy Team
// ============================================================================

export type TeamMemberRole = 'ADMIN' | 'STAFF';
export type TeamMemberStatus = 'ACTIVE' | 'INACTIVE';

export interface PrivacyTeamMember {
    id: string;
    tenantId: string;
    fullName: string;
    email: string;
    role: TeamMemberRole;
    status: TeamMemberStatus;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTeamMemberInput {
    fullName: string;
    email: string;
    role: TeamMemberRole;
}

export interface UpdateTeamMemberInput {
    fullName?: string;
    email?: string;
    role?: TeamMemberRole;
}

// ============================================================================
// Data Principal Requests
// ============================================================================

export type DPRRequestType = 'ACCESS' | 'CORRECTION' | 'ERASURE' | 'NOMINATION' | 'GRIEVANCE';
export type DPRStatus = 'SUBMITTED' | 'WORK_IN_PROGRESS' | 'RESPONDED' | 'RESOLVED';
export type DPROutcome = 'FULFILLED' | 'PARTIALLY_FULFILLED' | 'REJECTED';
export type DPRSlaState = 'NORMAL' | 'WARNING' | 'BREACHED';

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
    assigneeName?: string;
    assigneeEmail?: string;
    websiteDomain?: string;
    slaDueDate: string;
    slaDays: number;
    slaState: DPRSlaState;
    originalPayload: Record<string, any>;
    responseReason: string | null;
    responseAttachments: Array<{ name: string; url: string }>;
    respondedAt: string | null;
    closedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface DPRCommunication {
    id: string;
    requestId: string;
    direction: 'INCOMING' | 'OUTGOING';
    subject: string;
    body: string;
    attachments: Array<{ name: string; url: string }>;
    sentAt: string;
    createdAt: string;
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
    createdAt: string;
}

export interface SlaConfiguration {
    id: string;
    tenantId: string;
    defaultSlaDays: number;
    nominationSlaDays: number;
    warningThresholdDays: number;
}

export interface DPRListFilters {
    requestType?: DPRRequestType;
    status?: DPRStatus;
    assignedTo?: string;
    slaState?: DPRSlaState;
}

export interface RespondInput {
    outcome: DPROutcome;
    reason: string;
    attachments?: Array<{ name: string; url: string }>;
}

