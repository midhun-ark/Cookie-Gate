import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Tenants } from './pages/Tenants';
import { Rules } from './pages/Rules';
import { AuditLogs } from './pages/AuditLogs';
import { Shield, Users, LogOut, Activity } from 'lucide-react';
import './index.css'; // Ensure we use the default CSS or custom ones

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function Layout({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Tenants', path: '/tenants', icon: Users },
    { label: 'Global Rules', path: '/rules', icon: Shield },
    { label: 'Audit Logs', path: '/audit-logs', icon: Activity },
  ];

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div className="brand">
          <Shield className="logo-icon" />
          <span>ComplyArk</span>
        </div>
        <div className="nav-links">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="user-info">
          <div className="user-email">{user?.email}</div>
          <button onClick={logout} className="logout-btn">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>
      <main className="content">
        {children}
      </main>
    </div>
  );
}

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/tenants" />} />
      <Route path="/tenants" element={
        <ProtectedRoute>
          <Layout><Tenants /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/rules" element={
        <ProtectedRoute>
          <Layout><Rules /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/audit-logs" element={
        <ProtectedRoute>
          <Layout><AuditLogs /></Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
