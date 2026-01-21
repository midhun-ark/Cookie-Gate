import { api } from './client';
import type {
    ApiResponse,
    LoginResponse,
    TenantUser,
    Tenant,
    WebsiteWithStats,
    Website,
    CanActivateResult,
    WebsiteVersion,
    WebsiteNotice,
    Purpose,
    BannerCustomization,
    AuditLog,
    SupportedLanguage,
    PaginationInfo,
    ConsentLog,
    AnalyticsStats,
} from '@/types';

// ==================== AUTH ====================

export const authApi = {
    login: async (email: string, password: string): Promise<LoginResponse> => {
        const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', {
            email,
            password,
        });
        return response.data.data!;
    },

    logout: async (): Promise<void> => {
        await api.post('/auth/logout');
    },

    forceResetPassword: async (
        newPassword: string,
        confirmPassword: string
    ): Promise<{ user: TenantUser; token: string }> => {
        const response = await api.post<ApiResponse<{ user: TenantUser; token: string }>>(
            '/auth/force-reset-password',
            { newPassword, confirmPassword }
        );
        return response.data.data!;
    },

    resetPassword: async (
        currentPassword: string,
        newPassword: string,
        confirmPassword: string
    ): Promise<void> => {
        await api.post('/auth/reset-password', {
            currentPassword,
            newPassword,
            confirmPassword,
        });
    },

    getMe: async (): Promise<{ user: TenantUser; tenant: Tenant }> => {
        const response = await api.get<ApiResponse<{ user: TenantUser; tenant: Tenant }>>('/auth/me');
        return response.data.data!;
    },
};

// ==================== WEBSITES ====================

export const websiteApi = {
    list: async (): Promise<WebsiteWithStats[]> => {
        const response = await api.get<ApiResponse<WebsiteWithStats[]>>('/websites');
        return response.data.data!;
    },

    get: async (id: string): Promise<Website> => {
        const response = await api.get<ApiResponse<Website>>(`/websites/${id}`);
        return response.data.data!;
    },

    create: async (domain: string): Promise<Website> => {
        const response = await api.post<ApiResponse<Website>>('/websites', { domain });
        return response.data.data!;
    },

    updateStatus: async (id: string, status: string): Promise<Website> => {
        const response = await api.patch<ApiResponse<Website>>(`/websites/${id}`, { status });
        return response.data.data!;
    },

    canActivate: async (id: string): Promise<CanActivateResult> => {
        const response = await api.get<ApiResponse<CanActivateResult>>(`/websites/${id}/can-activate`);
        return response.data.data!;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/websites/${id}`);
    },
};

// ==================== VERSIONS ====================

export const versionApi = {
    list: async (websiteId: string): Promise<WebsiteVersion[]> => {
        const response = await api.get<ApiResponse<WebsiteVersion[]>>(`/websites/${websiteId}/versions`);
        return response.data.data!;
    },

    get: async (websiteId: string, versionId: string): Promise<WebsiteVersion> => {
        const response = await api.get<ApiResponse<WebsiteVersion>>(`/websites/${websiteId}/versions/${versionId}`);
        return response.data.data!;
    },

    getActive: async (websiteId: string): Promise<WebsiteVersion | null> => {
        const response = await api.get<ApiResponse<WebsiteVersion | null>>(`/websites/${websiteId}/versions/active`);
        return response.data.data ?? null;
    },

    create: async (websiteId: string, versionName?: string): Promise<WebsiteVersion> => {
        const response = await api.post<ApiResponse<WebsiteVersion>>(`/websites/${websiteId}/versions`, { versionName });
        return response.data.data!;
    },

    updateName: async (websiteId: string, versionId: string, versionName: string): Promise<WebsiteVersion> => {
        const response = await api.patch<ApiResponse<WebsiteVersion>>(`/websites/${websiteId}/versions/${versionId}`, { versionName });
        return response.data.data!;
    },

    activate: async (_websiteId: string, versionId: string): Promise<WebsiteVersion> => {
        const response = await api.post<ApiResponse<WebsiteVersion>>(`/versions/${versionId}/activate`);
        return response.data.data!;
    },

    archive: async (versionId: string): Promise<WebsiteVersion> => {
        const response = await api.post<ApiResponse<WebsiteVersion>>(`/versions/${versionId}/archive`);
        return response.data.data!;
    },
};

// ==================== NOTICES ====================

export const noticeApi = {
    get: async (versionId: string): Promise<WebsiteNotice | null> => {
        const response = await api.get<ApiResponse<WebsiteNotice | null>>(
            `/versions/${versionId}/notices`
        );
        return response.data.data ?? null;
    },

    create: async (
        versionId: string,
        data: {
            dpoEmail?: string;
            translations: Array<{
                languageCode: string;
                title: string;
                description: string;
                policyUrl?: string;
                dataCategories?: string[];
                processingPurposes?: string[];
                rightsDescription?: string;
                withdrawalInstruction?: string;
                complaintInstruction?: string;
            }>
        }
    ): Promise<WebsiteNotice> => {
        const response = await api.post<ApiResponse<WebsiteNotice>>(
            `/versions/${versionId}/notices`,
            data
        );
        return response.data.data!;
    },

    updateTranslations: async (
        noticeId: string,
        translations: Array<{
            languageCode: string;
            title: string;
            description: string;
            policyUrl?: string;
            dataCategories?: string[];
            processingPurposes?: string[];
            rightsDescription?: string;
            withdrawalInstruction?: string;
            complaintInstruction?: string;
        }>,
        dpoEmail?: string
    ): Promise<void> => {
        await api.patch(`/notices/${noticeId}/translations`, { translations, dpoEmail });
    },
};

// ==================== PURPOSES ====================

export const purposeApi = {
    list: async (versionId: string): Promise<Purpose[]> => {
        const response = await api.get<ApiResponse<Purpose[]>>(`/versions/${versionId}/purposes`);
        return response.data.data!;
    },

    get: async (purposeId: string): Promise<Purpose> => {
        const response = await api.get<ApiResponse<Purpose>>(`/purposes/${purposeId}`);
        return response.data.data!;
    },

    create: async (
        versionId: string,
        data: {
            isEssential: boolean;
            tag: string;
            displayOrder: number;
            translations: Array<{
                languageCode: string;
                name: string;
                description: string;
            }>;
        }
    ): Promise<Purpose> => {
        const response = await api.post<ApiResponse<Purpose>>(
            `/versions/${versionId}/purposes`,
            data
        );
        return response.data.data!;
    },

    update: async (
        purposeId: string,
        data: {
            isEssential?: boolean;
            status?: string;
            displayOrder?: number;
        }
    ): Promise<Purpose> => {
        const response = await api.patch<ApiResponse<Purpose>>(`/purposes/${purposeId}`, data);
        return response.data.data!;
    },

    updateTranslations: async (
        purposeId: string,
        translations: Array<{
            languageCode: string;
            name: string;
            description: string;
        }>
    ): Promise<void> => {
        await api.patch(`/purposes/${purposeId}/translations`, { translations });
    },

    delete: async (purposeId: string): Promise<void> => {
        await api.delete(`/purposes/${purposeId}`);
    },

    reorder: async (
        versionId: string,
        orders: Array<{ id: string; displayOrder: number }>
    ): Promise<void> => {
        await api.post(`/versions/${versionId}/purposes/reorder`, { orders });
    },
};

// ==================== BANNER ====================

export const bannerApi = {
    get: async (versionId: string): Promise<BannerCustomization> => {
        const response = await api.get<ApiResponse<BannerCustomization>>(
            `/versions/${versionId}/banner`
        );
        return response.data.data!;
    },

    save: async (versionId: string, data: BannerCustomization): Promise<BannerCustomization> => {
        const response = await api.post<ApiResponse<BannerCustomization>>(
            `/versions/${versionId}/banner`,
            data
        );
        return response.data.data!;
    },

    update: async (
        versionId: string,
        data: Partial<BannerCustomization>
    ): Promise<BannerCustomization> => {
        const response = await api.patch<ApiResponse<BannerCustomization>>(
            `/versions/${versionId}/banner`,
            data
        );
        return response.data.data!;
    },

    reset: async (versionId: string): Promise<BannerCustomization> => {
        const response = await api.post<ApiResponse<BannerCustomization>>(
            `/versions/${versionId}/banner/reset`
        );
        return response.data.data!;
    },

    getPreviewUrl: (versionId: string): string => {
        return `/tenant/versions/${versionId}/banner/preview`;
    },

    // Translation methods
    getTranslations: async (versionId: string): Promise<Array<{
        languageCode: string;
        headlineText: string;
        descriptionText: string;
        acceptButtonText: string;
        rejectButtonText: string;
        preferencesButtonText: string;
    }>> => {
        const response = await api.get<ApiResponse<Array<{
            languageCode: string;
            headlineText: string;
            descriptionText: string;
            acceptButtonText: string;
            rejectButtonText: string;
            preferencesButtonText: string;
        }>>>(`/versions/${versionId}/banner/translations`);
        return response.data.data!;
    },

    saveTranslations: async (
        versionId: string,
        translations: Array<{
            languageCode: string;
            headlineText: string;
            descriptionText: string;
            acceptButtonText: string;
            rejectButtonText: string;
            preferencesButtonText: string;
        }>
    ): Promise<void> => {
        await api.post(`/versions/${versionId}/banner/translations`, { translations });
    },
};

// ==================== AUDIT ====================

export interface AuditFilters {
    page?: number;
    limit?: number;
    action?: string;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
}

export const auditApi = {
    list: async (
        filters: AuditFilters = {}
    ): Promise<{ items: AuditLog[]; pagination: PaginationInfo }> => {
        const params = new URLSearchParams();
        if (filters.page) params.append('page', String(filters.page));
        if (filters.limit) params.append('limit', String(filters.limit));
        if (filters.action) params.append('action', filters.action);
        if (filters.resourceType) params.append('resourceType', filters.resourceType);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);

        const response = await api.get<
            ApiResponse<AuditLog[]> & { pagination: PaginationInfo }
        >(`/audit-logs?${params}`);
        return {
            items: response.data.data!,
            pagination: response.data.pagination!,
        };
    },

    getFilters: async (): Promise<{ actions: string[]; resourceTypes: string[] }> => {
        const response = await api.get<
            ApiResponse<{ actions: string[]; resourceTypes: string[] }>
        >('/audit-logs/filters');
        return response.data.data!;
    },

    exportUrl: (filters: AuditFilters = {}): string => {
        const params = new URLSearchParams();
        if (filters.action) params.append('action', filters.action);
        if (filters.resourceType) params.append('resourceType', filters.resourceType);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        return `/tenant/audit-logs/export?${params}`;
    },
};

// ==================== LANGUAGES ====================

export const languageApi = {
    list: async (): Promise<SupportedLanguage[]> => {
        const response = await api.get<ApiResponse<SupportedLanguage[]>>('/languages');
        return response.data.data!;
    },
};

// ==================== ANALYTICS ====================

export const analyticsApi = {
    getConsentLogs: async (
        websiteId?: string,
        page: number = 1,
        limit: number = 10
    ): Promise<{ items: ConsentLog[]; pagination: PaginationInfo }> => {
        const params = new URLSearchParams();
        if (websiteId) params.append('websiteId', websiteId);
        params.append('page', String(page));
        params.append('limit', String(limit));

        const response = await api.get<ApiResponse<ConsentLog[]> & { pagination: PaginationInfo }>(
            `/analytics/consent-logs?${params.toString()}`
        );
        return {
            items: response.data.data!,
            pagination: response.data.pagination!,
        };
    },

    getStats: async (websiteId?: string): Promise<AnalyticsStats> => {
        const params = new URLSearchParams();
        if (websiteId) params.append('websiteId', websiteId);

        const response = await api.get<ApiResponse<AnalyticsStats>>(
            `/analytics/stats?${params.toString()}`
        );
        return response.data.data!;
    },
};

// ==================== PRIVACY TEAM ====================

import type {
    PrivacyTeamMember,
    CreateTeamMemberInput,
    UpdateTeamMemberInput,
    DataPrincipalRequest,
    DPRCommunication,
    DPRAuditEntry,
    SlaConfiguration,
    DPRListFilters,
    RespondInput,
} from '@/types';

export const privacyTeamApi = {
    list: async (): Promise<PrivacyTeamMember[]> => {
        const response = await api.get<ApiResponse<PrivacyTeamMember[]>>('/privacy-team');
        return response.data.data!;
    },

    listActive: async (): Promise<PrivacyTeamMember[]> => {
        const response = await api.get<ApiResponse<PrivacyTeamMember[]>>('/privacy-team/active');
        return response.data.data!;
    },

    get: async (id: string): Promise<PrivacyTeamMember> => {
        const response = await api.get<ApiResponse<PrivacyTeamMember>>(`/privacy-team/${id}`);
        return response.data.data!;
    },

    create: async (data: CreateTeamMemberInput): Promise<PrivacyTeamMember> => {
        const response = await api.post<ApiResponse<PrivacyTeamMember>>('/privacy-team', data);
        return response.data.data!;
    },

    update: async (id: string, data: UpdateTeamMemberInput): Promise<PrivacyTeamMember> => {
        const response = await api.put<ApiResponse<PrivacyTeamMember>>(`/privacy-team/${id}`, data);
        return response.data.data!;
    },

    toggleStatus: async (id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<PrivacyTeamMember> => {
        const response = await api.patch<ApiResponse<PrivacyTeamMember>>(`/privacy-team/${id}/status`, { status });
        return response.data.data!;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/privacy-team/${id}`);
    },
};

// ==================== DATA PRINCIPAL REQUESTS ====================

export const dprApi = {
    list: async (filters?: DPRListFilters): Promise<DataPrincipalRequest[]> => {
        const params = new URLSearchParams();
        if (filters?.requestType) params.append('requestType', filters.requestType);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
        if (filters?.slaState) params.append('slaState', filters.slaState);

        const response = await api.get<ApiResponse<DataPrincipalRequest[]>>(
            `/data-principal-requests?${params.toString()}`
        );
        return response.data.data!;
    },

    get: async (id: string): Promise<DataPrincipalRequest> => {
        const response = await api.get<ApiResponse<DataPrincipalRequest>>(`/data-principal-requests/${id}`);
        return response.data.data!;
    },

    getCommunications: async (id: string): Promise<DPRCommunication[]> => {
        const response = await api.get<ApiResponse<DPRCommunication[]>>(`/data-principal-requests/${id}/communications`);
        return response.data.data!;
    },

    getAuditLog: async (id: string): Promise<DPRAuditEntry[]> => {
        const response = await api.get<ApiResponse<DPRAuditEntry[]>>(`/data-principal-requests/${id}/audit`);
        return response.data.data!;
    },

    getSlaConfig: async (): Promise<SlaConfiguration> => {
        const response = await api.get<ApiResponse<SlaConfiguration>>('/data-principal-requests/sla-config');
        return response.data.data!;
    },

    updateSlaConfig: async (data: Partial<SlaConfiguration>): Promise<SlaConfiguration> => {
        const response = await api.put<ApiResponse<SlaConfiguration>>('/data-principal-requests/sla-config', data);
        return response.data.data!;
    },

    assign: async (id: string, assignedTo: string | null): Promise<DataPrincipalRequest> => {
        const response = await api.put<ApiResponse<DataPrincipalRequest>>(`/data-principal-requests/${id}/assign`, { assignedTo });
        return response.data.data!;
    },

    updateSla: async (id: string, slaDays: number): Promise<DataPrincipalRequest> => {
        const response = await api.put<ApiResponse<DataPrincipalRequest>>(`/data-principal-requests/${id}/sla`, { slaDays });
        return response.data.data!;
    },

    startWork: async (id: string): Promise<DataPrincipalRequest> => {
        const response = await api.post<ApiResponse<DataPrincipalRequest>>(`/data-principal-requests/${id}/start`);
        return response.data.data!;
    },

    respond: async (id: string, data: RespondInput): Promise<DataPrincipalRequest> => {
        const response = await api.post<ApiResponse<DataPrincipalRequest>>(`/data-principal-requests/${id}/respond`, data);
        return response.data.data!;
    },

    close: async (id: string): Promise<DataPrincipalRequest> => {
        const response = await api.post<ApiResponse<DataPrincipalRequest>>(`/data-principal-requests/${id}/close`);
        return response.data.data!;
    },
};

export * from './translation';

