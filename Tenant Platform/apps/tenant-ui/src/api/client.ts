import axios, { AxiosError } from 'axios';
import type { ApiResponse } from '@/types';
import { useAuthStore } from '@/store';

const API_BASE_URL = '/tenant';

// Create axios instance
export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('tenant_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiResponse>) => {
        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
            window.location.href = '/login';
        }

        // Handle password reset required
        if (error.response?.data?.message === 'Password reset required') {
            window.location.href = '/reset-password';
        }

        return Promise.reject(error);
    }
);

// Helper to extract error message
export function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as ApiResponse | undefined;
        if (data?.errors && data.errors.length > 0) {
            return data.errors.map((e) => e.message).join(', ');
        }
        return data?.message || error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'An unexpected error occurred';
}
