import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    FileText,
    Download,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { auditApi, type AuditFilters } from '@/api';
import './AuditLogs.css';

export function AuditLogsPage() {
    const [filters, setFilters] = useState<AuditFilters>({
        page: 1,
        limit: 20,
    });

    const { data: logsData, isLoading } = useQuery({
        queryKey: ['audit-logs', filters],
        queryFn: () => auditApi.list(filters),
    });

    const { data: filterOptions } = useQuery({
        queryKey: ['audit-log-filters'],
        queryFn: auditApi.getFilters,
    });

    const handlePageChange = (newPage: number) => {
        setFilters((prev) => ({ ...prev, page: newPage }));
    };

    const handleExport = () => {
        window.open(auditApi.exportUrl(filters), '_blank');
    };

    return (
        <div className="audit-logs-page">
            <div className="container">
                {/* Header */}
                <div className="page-header">
                    <div>
                        <h1>Audit Logs</h1>
                        <p className="text-gray-500">
                            Review all configuration changes for compliance
                        </p>
                    </div>
                    <button className="btn btn-secondary" onClick={handleExport}>
                        <Download size={18} />
                        Export CSV
                    </button>
                </div>

                {/* Filters */}
                <div className="filters-bar card">
                    <div className="filters-group">
                        <div className="filter-item">
                            <label className="form-label">Action</label>
                            <select
                                className="form-input form-select"
                                value={filters.action || ''}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        action: e.target.value || undefined,
                                        page: 1,
                                    }))
                                }
                            >
                                <option value="">All Actions</option>
                                {filterOptions?.actions.map((action) => (
                                    <option key={action} value={action}>
                                        {formatAction(action)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-item">
                            <label className="form-label">Resource Type</label>
                            <select
                                className="form-input form-select"
                                value={filters.resourceType || ''}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        resourceType: e.target.value || undefined,
                                        page: 1,
                                    }))
                                }
                            >
                                <option value="">All Types</option>
                                {filterOptions?.resourceTypes.map((type) => (
                                    <option key={type} value={type}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-item">
                            <label className="form-label">Start Date</label>
                            <input
                                type="date"
                                className="form-input"
                                value={filters.startDate || ''}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        startDate: e.target.value || undefined,
                                        page: 1,
                                    }))
                                }
                            />
                        </div>

                        <div className="filter-item">
                            <label className="form-label">End Date</label>
                            <input
                                type="date"
                                className="form-input"
                                value={filters.endDate || ''}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        endDate: e.target.value || undefined,
                                        page: 1,
                                    }))
                                }
                            />
                        </div>
                    </div>

                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                            setFilters({ page: 1, limit: 20 })
                        }
                    >
                        Clear Filters
                    </button>
                </div>

                {/* Logs Table */}
                <div className="card">
                    <div className="table-container">
                        {isLoading ? (
                            <div className="loading-container">
                                <div className="spinner"></div>
                            </div>
                        ) : logsData && logsData.items.length > 0 ? (
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Actor</th>
                                        <th>Action</th>
                                        <th>Resource</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logsData.items.map((log) => (
                                        <tr key={log.id}>
                                            <td className="timestamp-cell">
                                                {new Date(log.createdAt).toLocaleString()}
                                            </td>
                                            <td>
                                                <div className="actor-cell">
                                                    <span className="actor-email">{log.actorEmail}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="action-badge">
                                                    {formatAction(log.action)}
                                                </span>
                                            </td>
                                            <td>
                                                {log.resourceType && (
                                                    <span className="resource-type">
                                                        {log.resourceType}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <code className="metadata-preview">
                                                    {JSON.stringify(log.metadata).slice(0, 50)}
                                                    {JSON.stringify(log.metadata).length > 50 && '...'}
                                                </code>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="empty-state">
                                <FileText size={48} className="empty-state-icon" />
                                <h3 className="empty-state-title">No audit logs found</h3>
                                <p className="empty-state-description">
                                    No logs match your current filters
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {logsData && logsData.pagination.totalPages > 1 && (
                        <div className="pagination">
                            <button
                                className="btn btn-ghost btn-sm"
                                disabled={filters.page === 1}
                                onClick={() => handlePageChange((filters.page || 1) - 1)}
                            >
                                <ChevronLeft size={16} />
                                Previous
                            </button>
                            <span className="pagination-info">
                                Page {logsData.pagination.page} of {logsData.pagination.totalPages}
                            </span>
                            <button
                                className="btn btn-ghost btn-sm"
                                disabled={filters.page === logsData.pagination.totalPages}
                                onClick={() => handlePageChange((filters.page || 1) + 1)}
                            >
                                Next
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function formatAction(action: string): string {
    return action
        .split('_')
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
}
