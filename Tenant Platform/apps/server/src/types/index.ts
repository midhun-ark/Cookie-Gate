/**
 * Core entity types for the Tenant Platform
 */

// ==================== User Types ====================

export interface TenantUser {
    id: string;
    tenantId: string;
    email: string;
    passwordHash: string;
    mustResetPassword: boolean;
    status: 'ACTIVE' | 'SUSPENDED';
    createdAt: Date;
}

export interface TenantUserSafe {
    id: string;
    tenantId: string;
    email: string;
    mustResetPassword: boolean;
    status: 'ACTIVE' | 'SUSPENDED';
    createdAt: Date;
}

export interface Tenant {
    id: string;
    name: string;
    status: 'ACTIVE' | 'SUSPENDED';
    createdAt: Date;
    suspendedAt?: Date;
}

// ==================== Website Types ====================

export type WebsiteStatus = 'DRAFT' | 'ACTIVE' | 'DISABLED';

export interface Website {
    id: string;
    tenantId: string;
    domain: string;
    status: WebsiteStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface WebsiteWithStats extends Website {
    hasNotice: boolean;
    purposeCount: number;
    hasEnglishNotice: boolean;
    hasBanner: boolean;
}

// ==================== Notice Types ====================

export interface WebsiteNotice {
    id: string;
    websiteId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface NoticeTranslation {
    id: string;
    websiteNoticeId: string;
    languageCode: string;
    title: string;
    description: string;
    policyUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface WebsiteNoticeWithTranslations extends WebsiteNotice {
    translations: NoticeTranslation[];
}

// ==================== Purpose Types ====================

export type PurposeStatus = 'ACTIVE' | 'INACTIVE';

export interface Purpose {
    id: string;
    websiteId: string;
    isEssential: boolean;
    status: PurposeStatus;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface PurposeTranslation {
    id: string;
    purposeId: string;
    languageCode: string;
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PurposeWithTranslations extends Purpose {
    translations: PurposeTranslation[];
}

// ==================== Banner Types ====================

export type BannerPosition = 'bottom' | 'top' | 'center';
export type BannerLayout = 'banner' | 'modal' | 'popup';

export interface BannerCustomization {
    id: string;
    websiteId: string;
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
    createdAt: Date;
    updatedAt: Date;
}

// ==================== Audit Types ====================

export interface TenantAuditLog {
    id: string;
    tenantId: string;
    actorId: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    metadata: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}

export interface TenantAuditLogWithActor extends TenantAuditLog {
    actorEmail: string;
}

// ==================== Language Types ====================

export interface SupportedLanguage {
    code: string;
    name: string;
    nativeName: string;
    isRtl: boolean;
    isActive: boolean;
    createdAt: Date;
}

// ==================== Auth Types ====================

export interface JWTPayload {
    userId: string;
    tenantId: string;
    email: string;
    mustResetPassword: boolean;
}

export interface AuthContext {
    user: TenantUserSafe;
    tenant: Tenant;
}

// ==================== API Response Types ====================

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: Array<{ field?: string; message: string }>;
}

export interface PaginatedResponse<T> {
    items: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
