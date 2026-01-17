import React, { createContext, useContext, useState, useEffect } from 'react';
import { client } from '../api/client';

interface AdminUser {
    id: string;
    email: string;
}

interface AuthContextType {
    user: AdminUser | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AdminUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('complyark_admin_context');
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch (e) {
                localStorage.removeItem('complyark_admin_context');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        // Phase 1: Direct call. In production, this would be a real auth token exchange.
        const res = await client.post('/auth/login', { email, password });
        if (res.data.success && res.data.admin) {
            const adminData = res.data.admin;
            // Normalize: the API might return { adminId, email } or { id, email }
            // Let's ensure we store 'id' for the header interceptor
            const userObj = {
                id: adminData.adminId || adminData.id,
                email: adminData.email
            };
            setUser(userObj);
            localStorage.setItem('complyark_admin_context', JSON.stringify(userObj));
        } else {
            throw new Error('Login failed');
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('complyark_admin_context');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
