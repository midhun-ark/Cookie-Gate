import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, websiteApi } from '@/api';
import { BarChart3, Users, PieChart, CheckCircle2, Filter } from 'lucide-react';
import './Analytics.css';

export function AnalyticsPage() {
    const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>('');

    // Fetch websites for filter
    const { data: websites } = useQuery({
        queryKey: ['websites'],
        queryFn: websiteApi.list,
    });

    // Fetch stats
    const { data: stats, isLoading } = useQuery({
        queryKey: ['analytics-stats', selectedWebsiteId],
        queryFn: () => analyticsApi.getStats(selectedWebsiteId || undefined),
    });

    return (
        <div className="analytics-page">
            <header className="page-header">
                <div>
                    <h1>Analytics</h1>
                    <p>Consent performance and user engagement insights.</p>
                </div>
                <div className="filter-controls">
                    <Filter size={16} />
                    <select
                        value={selectedWebsiteId}
                        onChange={(e) => setSelectedWebsiteId(e.target.value)}
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

            {isLoading ? (
                <div className="loading-state">Loading analytics...</div>
            ) : (
                <div className="analytics-grid">
                    {/* Summary Cards */}
                    <div className="stat-card">
                        <div className="stat-icon bg-blue">
                            <Users size={20} />
                        </div>
                        <div className="stat-content">
                            <h3>Total Sessions</h3>
                            <div className="stat-value">{stats?.totalConsents || 0}</div>
                            <div className="stat-subtext">Total consent interactions</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon bg-green">
                            <CheckCircle2 size={20} />
                        </div>
                        <div className="stat-content">
                            <h3>Accepted</h3>
                            <div className="stat-value">{stats?.acceptedConsents || 0}</div>
                            <div className="stat-subtext">Users who accepted tracking</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon bg-purple">
                            <PieChart size={20} />
                        </div>
                        <div className="stat-content">
                            <h3>Opt-in Rate</h3>
                            <div className="stat-value">
                                {stats?.optInRate ? Math.round(stats.optInRate) : 0}%
                            </div>
                            <div className="stat-subtext">Percentage of allowed tracking</div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="chart-card full-width">
                        <div className="card-header">
                            <h3><BarChart3 size={18} /> Daily Consents (Last 7 Days)</h3>
                        </div>
                        <div className="chart-container">
                            {stats?.dailyTrend && stats.dailyTrend.length > 0 ? (
                                <div className="bar-chart">
                                    {stats.dailyTrend.map((day) => {
                                        const maxCount = Math.max(...stats.dailyTrend.map(d => parseInt(d.count)));
                                        const height = maxCount > 0 ? (parseInt(day.count) / maxCount) * 100 : 0;

                                        return (
                                            <div key={day.date} className="bar-column">
                                                <div
                                                    className="bar-fill"
                                                    style={{ height: `${height}%` }}
                                                    title={`${day.count} consents`}
                                                ></div>
                                                <div className="bar-label">
                                                    {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="empty-chart">No daily data available</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
