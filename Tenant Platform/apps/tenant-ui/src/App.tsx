import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store';

// Layout
import { Layout } from '@/components/Layout';

// Pages
import { LoginPage } from '@/pages/Login';
import { ResetPasswordPage } from '@/pages/ResetPassword';
import { DashboardPage } from '@/pages/Dashboard';
import { WebsitesPage } from '@/pages/Websites';
import { AuditLogsPage } from '@/pages/AuditLogs';

// Auth Guard Component
function RequireAuth({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Redirect to password reset if required
    if (user?.mustResetPassword && window.location.pathname !== '/reset-password') {
        return <Navigate to="/reset-password" replace />;
    }

    return <>{children}</>;
}

function App() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected Routes */}
            <Route
                path="/"
                element={
                    <RequireAuth>
                        <Layout />
                    </RequireAuth>
                }
            >
                <Route index element={<DashboardPage />} />
                <Route path="websites" element={<WebsitesPage />} />
                <Route path="websites/:id" element={<WebsiteDetailPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

// Placeholder for Website Detail Page (would be a full component)
function WebsiteDetailPage() {
    return (
        <div className="container" style={{ padding: '2rem 0' }}>
            <div className="card">
                <div className="card-header">
                    <h2>Website Configuration</h2>
                </div>
                <div className="card-body">
                    <p className="text-gray-500">
                        Website detail page with tabs for Notice, Purposes, Banner, and Preview.
                        This would include full multi-language editor functionality.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default App;
