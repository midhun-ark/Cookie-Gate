import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, websiteApi } from '@/api';
import { ConsentLog } from '@/types';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import './ConsentLogs.css';

export function ConsentLogsPage() {
    const [page, setPage] = useState(1);
    const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>('');

    // Fetch websites for filter
    const { data: websites } = useQuery({
        queryKey: ['websites'],
        queryFn: websiteApi.list,
    });

    // Fetch logs
    const { data: logsData, isLoading } = useQuery({
        queryKey: ['consent-logs', page, selectedWebsiteId],
        queryFn: () => analyticsApi.getConsentLogs(selectedWebsiteId || undefined, page, 10),
    });

    const handleWebsiteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedWebsiteId(e.target.value);
        setPage(1);
    };

    return (
        <div className="consent-logs-page">
            <header className="page-header">
                <div>
                    <h1>Consent Logs</h1>
                    <p>Audit trail of user consent actions across your websites.</p>
                </div>
                <div className="filter-controls">
                    <Filter size={16} />
                    <select
                        value={selectedWebsiteId}
                        onChange={handleWebsiteChange}
                        className="website-select"
                    >
                        <option value="">All Websites</option>
                        {websites?.map((site) => (
                            <option key={site.id} value={site.id}>
                                {site.domain}
                            </option>
                        ))}
                    </select>
                </div>
            </header>

            <div className="logs-container card">
                {isLoading ? (
                    <div className="loading-state">Loading logs...</div>
                ) : logsData?.items.length === 0 ? (
                    <div className="empty-state">No consent logs found.</div>
                ) : (
                    <>
                        <div className="table-responsive">
                            <table className="logs-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>User ID (Anonymous)</th>
                                        <th>Website</th>
                                        <th>Country</th>
                                        <th>Preferences</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logsData?.items.map((log: ConsentLog & { websiteDomain?: string }) => (
                                        <tr key={log.id}>
                                            <td>{new Date(log.createdAt).toLocaleString()}</td>
                                            <td className="monospace" title={log.anonymousId}>
                                                {log.anonymousId.substring(0, 8)}...
                                            </td>
                                            <td>{log['websiteDomain'] || '-'}</td>
                                            <td>{log.countryCode || 'Unknown'}</td>
                                            <td>
                                                <div className="preferences-tags">
                                                    {Object.entries(log.preferences).map(([key, value]) => (
                                                        <span
                                                            key={key}
                                                            className={`pref-tag ${value ? 'accepted' : 'rejected'}`}
                                                        >
                                                            {key}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {logsData?.pagination && (
                            <div className="pagination">
                                <span>
                                    Page {logsData.pagination.page} of {logsData.pagination.totalPages}
                                </span>
                                <div className="pagination-buttons">
                                    <button
                                        disabled={page === 1}
                                        onClick={() => setPage(p => p - 1)}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button
                                        disabled={page === logsData.pagination.totalPages}
                                        onClick={() => setPage(p => p + 1)}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
