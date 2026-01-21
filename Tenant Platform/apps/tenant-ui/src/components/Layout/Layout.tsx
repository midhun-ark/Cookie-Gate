import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Globe,
    FileText,
    LogOut,
    Menu,
    X,
    Cookie,
    PieChart,
    Activity,
    ClipboardList,
    Users,
} from 'lucide-react';
import { useAuthStore, useUIStore } from '@/store';
import { authApi } from '@/api';
import './Layout.css';

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/websites', icon: Globe, label: 'Cookie Banner' },
    { path: '/analytics', icon: PieChart, label: 'Analytics' },
    { path: '/consent-logs', icon: Activity, label: 'Consent Logs' },
    { path: '/audit-logs', icon: FileText, label: 'Audit Logs' },
    { path: '/data-principal-requests', icon: ClipboardList, label: 'Data Principal Requests' },
    { path: '/privacy-team', icon: Users, label: 'Privacy Team' },
];

export function Layout() {
    const navigate = useNavigate();
    const { user, tenant, logout } = useAuthStore();
    const { sidebarOpen, toggleSidebar } = useUIStore();

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } catch {
            // Ignore logout errors
        }
        logout();
        navigate('/login');
    };

    return (
        <div className="layout">
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <Cookie size={28} />
                        <span className="logo-text">ComplyArk</span>
                    </div>
                    <button className="sidebar-toggle" onClick={toggleSidebar}>
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            end={item.path === '/'}
                        >
                            <item.icon size={20} />
                            <span className="nav-label">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            {user?.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-details">
                            <div className="user-email">{user?.email}</div>
                            <div className="tenant-name">{tenant?.name}</div>
                        </div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
