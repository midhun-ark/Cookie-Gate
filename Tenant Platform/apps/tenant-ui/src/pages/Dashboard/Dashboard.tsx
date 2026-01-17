import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    Globe,
    FileText,
    Shield,
    CheckCircle,
    AlertCircle,
    ArrowRight,
    Plus,
} from 'lucide-react';
import { websiteApi } from '@/api';
import { useAuthStore } from '@/store';
import './Dashboard.css';

export function DashboardPage() {
    const { tenant } = useAuthStore();

    const { data: websites, isLoading } = useQuery({
        queryKey: ['websites'],
        queryFn: websiteApi.list,
    });

    // Calculate stats
    const stats = {
        total: websites?.length || 0,
        active: websites?.filter((w) => w.status === 'ACTIVE').length || 0,
        draft: websites?.filter((w) => w.status === 'DRAFT').length || 0,
        needsAttention: websites?.filter(
            (w) => w.status === 'DRAFT' && (!w.hasNotice || w.purposeCount === 0)
        ).length || 0,
    };

    return (
        <div className="dashboard">
            <div className="container">
                {/* Header */}
                <div className="dashboard-header">
                    <div>
                        <h1 className="dashboard-title">Welcome back!</h1>
                        <p className="dashboard-subtitle">
                            Manage cookie consent for {tenant?.name}
                        </p>
                    </div>
                    <Link to="/websites" className="btn btn-primary">
                        <Plus size={18} />
                        Add Website
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon stat-icon-primary">
                            <Globe size={24} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.total}</div>
                            <div className="stat-label">Total Websites</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon stat-icon-success">
                            <CheckCircle size={24} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.active}</div>
                            <div className="stat-label">Active</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon stat-icon-warning">
                            <FileText size={24} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.draft}</div>
                            <div className="stat-label">Draft</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon stat-icon-error">
                            <AlertCircle size={24} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.needsAttention}</div>
                            <div className="stat-label">Needs Attention</div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions & Recent Websites */}
                <div className="dashboard-grid">
                    {/* Quick Actions */}
                    <div className="card">
                        <div className="card-header">
                            <h2>Quick Actions</h2>
                        </div>
                        <div className="card-body">
                            <div className="quick-actions">
                                <Link to="/websites" className="quick-action">
                                    <div className="quick-action-icon">
                                        <Plus size={20} />
                                    </div>
                                    <div className="quick-action-content">
                                        <div className="quick-action-title">Add New Website</div>
                                        <div className="quick-action-description">
                                            Register a new domain for consent management
                                        </div>
                                    </div>
                                    <ArrowRight size={18} className="quick-action-arrow" />
                                </Link>

                                <Link to="/audit-logs" className="quick-action">
                                    <div className="quick-action-icon">
                                        <FileText size={20} />
                                    </div>
                                    <div className="quick-action-content">
                                        <div className="quick-action-title">View Audit Logs</div>
                                        <div className="quick-action-description">
                                            Review all configuration changes for compliance
                                        </div>
                                    </div>
                                    <ArrowRight size={18} className="quick-action-arrow" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Recent Websites */}
                    <div className="card">
                        <div className="card-header">
                            <h2>Recent Websites</h2>
                            <Link to="/websites" className="text-primary text-sm">
                                View all
                            </Link>
                        </div>
                        <div className="card-body">
                            {isLoading ? (
                                <div className="flex justify-center">
                                    <div className="spinner"></div>
                                </div>
                            ) : websites && websites.length > 0 ? (
                                <div className="website-list">
                                    {websites.slice(0, 5).map((website) => (
                                        <Link
                                            key={website.id}
                                            to={`/websites/${website.id}`}
                                            className="website-list-item"
                                        >
                                            <div className="website-info">
                                                <Globe size={18} className="text-gray-400" />
                                                <span className="website-domain">{website.domain}</span>
                                            </div>
                                            <StatusBadge status={website.status} />
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <Globe size={40} className="empty-state-icon" />
                                    <p className="empty-state-title">No websites yet</p>
                                    <p className="empty-state-description">
                                        Add your first website to get started
                                    </p>
                                    <Link to="/websites" className="btn btn-primary btn-sm mt-4">
                                        <Plus size={16} />
                                        Add Website
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* DPDPA Compliance Info */}
                <div className="compliance-banner">
                    <Shield size={24} />
                    <div className="compliance-content">
                        <h3>DPDPA Compliance</h3>
                        <p>
                            Your consent management is aligned with India's Digital Personal Data Protection Act.
                            All configurations enforce equal prominence for consent options and comprehensive audit logging.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config = {
        ACTIVE: { className: 'badge-success', label: 'Active' },
        DRAFT: { className: 'badge-warning', label: 'Draft' },
        DISABLED: { className: 'badge-gray', label: 'Disabled' },
    }[status] || { className: 'badge-gray', label: status };

    return <span className={`badge ${config.className}`}>{config.label}</span>;
}
