import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to inject admin ID
client.interceptors.request.use((config) => {
    const adminStr = localStorage.getItem('complyark_admin_context');
    if (adminStr) {
        try {
            const admin = JSON.parse(adminStr);
            if (admin?.id) {
                config.headers['x-admin-id'] = admin.id;
            }
        } catch (e) {
            // Invalid JSON, ignore
        }
    }
    return config;
});
