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

// Notice
export interface NoticeTranslation {
    id: string;
    websiteNoticeId: string;
    languageCode: string;
    title: string;
    description: string;
    policyUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export interface WebsiteNotice {
    id: string;
    websiteId: string;
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
    websiteId: string;
    isEssential: boolean;
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

// API Response
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: Array<{ field?: string; message: string }>;
    pagination?: PaginationInfo;
}
