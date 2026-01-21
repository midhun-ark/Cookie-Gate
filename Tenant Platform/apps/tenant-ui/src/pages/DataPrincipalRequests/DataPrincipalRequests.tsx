import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Clock, CheckCircle, Filter, User } from 'lucide-react';
import { dprApi, privacyTeamApi } from '@/api';
import type { DPRListFilters, DPRRequestType, DPRStatus, DPRSlaState } from '@/types';
import './DataPrincipalRequests.css';

const REQUEST_TYPE_LABELS: Record<DPRRequestType, string> = {
    ACCESS: 'Access Data',
    CORRECTION: 'Correct Data',
    ERASURE: 'Erase Data',
    NOMINATION: 'Nominate Person',
    GRIEVANCE: 'Grievance',
};

const STATUS_CONFIG: Record<DPRStatus, { label: string; color: string; icon: typeof Clock }> = {
    SUBMITTED: { label: 'Submitted', color: '#6366f1', icon: Clock },
    WORK_IN_PROGRESS: { label: 'In Progress', color: '#f59e0b', icon: Clock },
    RESPONDED: { label: 'Responded', color: '#22c55e', icon: CheckCircle },
    RESOLVED: { label: 'Resolved', color: '#64748b', icon: CheckCircle },
};

const SLA_CONFIG: Record<DPRSlaState, { label: string; color: string }> = {
    NORMAL: { label: 'On Track', color: '#22c55e' },
    WARNING: { label: 'At Risk', color: '#f59e0b' },
    BREACHED: { label: 'SLA Breach', color: '#ef4444' },
};

export function DataPrincipalRequestsPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState<DPRListFilters>({});
    const [showFilters, setShowFilters] = useState(false);

    const { data: requests, isLoading } = useQuery({
        queryKey: ['dpr-requests', filters],
        queryFn: () => dprApi.list(filters),
    });

    const { data: teamMembers } = useQuery({
        queryKey: ['privacy-team-active'],
        queryFn: privacyTeamApi.listActive,
    });

    const handleRowClick = (id: string) => {
        navigate(`/data-principal-requests/${id}`);
    };

    const clearFilters = () => {
        setFilters({});
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    return (
        <div className="dpr-page">
            <div className="container">
                <div className="page-header">
                    <div>
                        <h1>Data Principal Requests</h1>
                        <p className="text-gray-500">Manage and respond to DPDPA requests</p>
                    </div>
                    <button
                        className={`btn ${showFilters || activeFilterCount > 0 ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter size={18} />
                        Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                    </button>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="filters-bar card">
                        <div className="filters-group">
                            <div className="filter-item">
                                <label className="form-label">Request Type</label>
                                <select
                                    className="form-input form-select"
                                    value={filters.requestType || ''}
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            requestType: (e.target.value || undefined) as DPRRequestType | undefined,
                                        }))
                                    }
                                >
                                    <option value="">All Types</option>
                                    {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-item">
                                <label className="form-label">Status</label>
                                <select
                                    className="form-input form-select"
                                    value={filters.status || ''}
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            status: (e.target.value || undefined) as DPRStatus | undefined,
                                        }))
                                    }
                                >
                                    <option value="">All Statuses</option>
                                    {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-item">
                                <label className="form-label">Assigned To</label>
                                <select
                                    className="form-input form-select"
                                    value={filters.assignedTo || ''}
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            assignedTo: e.target.value || undefined,
                                        }))
                                    }
                                >
                                    <option value="">All Members</option>
                                    {teamMembers?.map((member) => (
                                        <option key={member.id} value={member.id}>{member.fullName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-item">
                                <label className="form-label">SLA Status</label>
                                <select
                                    className="form-input form-select"
                                    value={filters.slaState || ''}
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            slaState: (e.target.value || undefined) as DPRSlaState | undefined,
                                        }))
                                    }
                                >
                                    <option value="">All</option>
                                    {Object.entries(SLA_CONFIG).map(([value, { label }]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                            Clear Filters
                        </button>
                    </div>
                )}

                {/* Requests Table */}
                <div className="card">
                    {isLoading ? (
                        <div className="loading-container">
                            <div className="spinner"></div>
                        </div>
                    ) : requests && requests.length > 0 ? (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Request #</th>
                                    <th>Type</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>SLA</th>
                                    <th>Assigned</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((req) => (
                                    <tr key={req.id} onClick={() => handleRowClick(req.id)} className="clickable-row">
                                        <td className="font-medium">{req.requestNumber}</td>
                                        <td>
                                            <span className="type-badge">
                                                {REQUEST_TYPE_LABELS[req.requestType]}
                                            </span>
                                        </td>
                                        <td className="email-cell">{req.dataPrincipalEmail}</td>
                                        <td>
                                            <span
                                                className="status-badge"
                                                style={{ background: `${STATUS_CONFIG[req.status].color}20`, color: STATUS_CONFIG[req.status].color }}
                                            >
                                                {STATUS_CONFIG[req.status].label}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className="sla-badge"
                                                style={{ background: `${SLA_CONFIG[req.slaState].color}20`, color: SLA_CONFIG[req.slaState].color }}
                                            >
                                                {SLA_CONFIG[req.slaState].label}
                                            </span>
                                        </td>
                                        <td>
                                            {req.assigneeName ? (
                                                <span className="assignee">
                                                    <User size={14} />
                                                    {req.assigneeName}
                                                </span>
                                            ) : (
                                                <span className="unassigned">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="date-cell">{formatDate(req.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="empty-state">
                            <ClipboardList size={48} className="empty-state-icon" />
                            <h3 className="empty-state-title">No requests found</h3>
                            <p className="empty-state-description">
                                {activeFilterCount > 0
                                    ? 'No requests match your filters'
                                    : 'Requests submitted via cookie banner will appear here'}
                            </p>
                            {activeFilterCount > 0 && (
                                <button className="btn btn-secondary" onClick={clearFilters}>
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
