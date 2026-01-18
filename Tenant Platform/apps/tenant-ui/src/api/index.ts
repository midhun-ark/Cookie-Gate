import { api } from './client';
import type {
    ApiResponse,
    LoginResponse,
    TenantUser,
    Tenant,
    WebsiteWithStats,
    Website,
    CanActivateResult,
    WebsiteNotice,
    NoticeTranslation,
    Purpose,
    BannerCustomization,
    AuditLog,
    SupportedLanguage,
    PaginationInfo,
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

// ==================== NOTICES ====================

export const noticeApi = {
    get: async (websiteId: string): Promise<WebsiteNotice | null> => {
        const response = await api.get<ApiResponse<WebsiteNotice | null>>(
            `/websites/${websiteId}/notices`
        );
        return response.data.data ?? null;
    },

    create: async (
        websiteId: string,
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
            `/websites/${websiteId}/notices`,
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

    autoTranslate: async (
        websiteId: string,
        targetLang: string
    ): Promise<NoticeTranslation> => {
        const response = await api.post<ApiResponse<NoticeTranslation>>(
            `/websites/${websiteId}/notices/auto-translate`,
            { targetLang }
        );
        return response.data.data!;
    },

    autoTranslateBatch: async (
        websiteId: string,
        targetLangs: string[]
    ): Promise<NoticeTranslation[]> => {
        const response = await api.post<ApiResponse<NoticeTranslation[]>>(
            `/websites/${websiteId}/notices/auto-translate-batch`,
            { targetLangs }
        );
        return response.data.data!;
    },
};

// ==================== PURPOSES ====================

export const purposeApi = {
    list: async (websiteId: string): Promise<Purpose[]> => {
        const response = await api.get<ApiResponse<Purpose[]>>(`/websites/${websiteId}/purposes`);
        return response.data.data!;
    },

    get: async (purposeId: string): Promise<Purpose> => {
        const response = await api.get<ApiResponse<Purpose>>(`/purposes/${purposeId}`);
        return response.data.data!;
    },

    create: async (
        websiteId: string,
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
            `/websites/${websiteId}/purposes`,
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
        websiteId: string,
        orders: Array<{ id: string; displayOrder: number }>
    ): Promise<void> => {
        await api.post(`/websites/${websiteId}/purposes/reorder`, { orders });
    },
};

// ==================== BANNER ====================

export const bannerApi = {
    get: async (websiteId: string): Promise<BannerCustomization> => {
        const response = await api.get<ApiResponse<BannerCustomization>>(
            `/websites/${websiteId}/banner`
        );
        return response.data.data!;
    },

    save: async (websiteId: string, data: BannerCustomization): Promise<BannerCustomization> => {
        const response = await api.post<ApiResponse<BannerCustomization>>(
            `/websites/${websiteId}/banner`,
            data
        );
        return response.data.data!;
    },

    update: async (
        websiteId: string,
        data: Partial<BannerCustomization>
    ): Promise<BannerCustomization> => {
        const response = await api.patch<ApiResponse<BannerCustomization>>(
            `/websites/${websiteId}/banner`,
            data
        );
        return response.data.data!;
    },

    reset: async (websiteId: string): Promise<BannerCustomization> => {
        const response = await api.post<ApiResponse<BannerCustomization>>(
            `/websites/${websiteId}/banner/reset`
        );
        return response.data.data!;
    },

    getPreviewUrl: (websiteId: string): string => {
        return `/tenant/websites/${websiteId}/banner/preview`;
    },

    // Translation methods
    getTranslations: async (websiteId: string): Promise<Array<{
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
        }>>>(`/websites/${websiteId}/banner/translations`);
        return response.data.data!;
    },

    saveTranslations: async (
        websiteId: string,
        translations: Array<{
            languageCode: string;
            headlineText: string;
            descriptionText: string;
            acceptButtonText: string;
            rejectButtonText: string;
            preferencesButtonText: string;
        }>
    ): Promise<void> => {
        await api.post(`/websites/${websiteId}/banner/translations`, { translations });
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

export * from './translation';
