import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TenantUser, Tenant } from '@/types';

interface AuthState {
    user: TenantUser | null;
    tenant: Tenant | null;
    token: string | null;
    isAuthenticated: boolean;

    // Actions
    setAuth: (user: TenantUser, tenant: Tenant, token: string) => void;
    updateUser: (user: TenantUser) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            tenant: null,
            token: null,
            isAuthenticated: false,

            setAuth: (user, tenant, token) => {
                localStorage.setItem('tenant_token', token);
                set({
                    user,
                    tenant,
                    token,
                    isAuthenticated: true,
                });
            },

            updateUser: (user) => {
                set({ user });
            },

            logout: () => {
                localStorage.removeItem('tenant_token');
                set({
                    user: null,
                    tenant: null,
                    token: null,
                    isAuthenticated: false,
                });
            },
        }),
        {
            name: 'tenant-auth',
            partialize: (state) => ({
                user: state.user,
                tenant: state.tenant,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);

// UI State Store
interface UIState {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    sidebarOpen: true,
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
