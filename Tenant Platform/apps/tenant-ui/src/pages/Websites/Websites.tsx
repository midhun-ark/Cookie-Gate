import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Globe,
    Plus,
    Search,
    Check,
    X,
    Settings,
} from 'lucide-react';
import { websiteApi } from '@/api';
import { getErrorMessage } from '@/api/client';
import type { WebsiteWithStats } from '@/types';
import './Websites.css';

export function WebsitesPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newDomain, setNewDomain] = useState('');
    const [error, setError] = useState('');

    const { data: websites, isLoading } = useQuery({
        queryKey: ['websites'],
        queryFn: websiteApi.list,
    });

    const createMutation = useMutation({
        mutationFn: (domain: string) => websiteApi.create(domain),
        onSuccess: (website) => {
            queryClient.invalidateQueries({ queryKey: ['websites'] });
            setShowAddModal(false);
            setNewDomain('');
            navigate(`/websites/${website.id}`);
        },
        onError: (err) => {
            setError(getErrorMessage(err));
        },
    });

    const filteredWebsites = websites?.filter((w) =>
        w.domain.toLowerCase().includes(search.toLowerCase())
    );

    const handleAddWebsite = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        createMutation.mutate(newDomain);
    };

    return (
        <div className="websites-page">
            <div className="container">
                {/* Header */}
                <div className="page-header">
                    <div>
                        <h1>Websites</h1>
                        <p className="text-gray-500">
                            Manage cookie consent configuration for your websites
                        </p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowAddModal(true)}
                    >
                        <Plus size={18} />
                        Add Website
                    </button>
                </div>

                {/* Search */}
                <div className="search-bar">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        className="form-input search-input"
                        placeholder="Search websites..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Websites Grid */}
                {isLoading ? (
                    <div className="loading-container">
                        <div className="spinner"></div>
                    </div>
                ) : filteredWebsites && filteredWebsites.length > 0 ? (
                    <div className="websites-grid">
                        {filteredWebsites.map((website) => (
                            <WebsiteCard
                                key={website.id}
                                website={website}
                                onNavigate={() => navigate(`/websites/${website.id}`)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="empty-state card">
                        <Globe size={48} className="empty-state-icon" />
                        <h3 className="empty-state-title">No websites found</h3>
                        <p className="empty-state-description">
                            {search
                                ? 'Try adjusting your search'
                                : 'Add your first website to get started with consent management'}
                        </p>
                        {!search && (
                            <button
                                className="btn btn-primary mt-6"
                                onClick={() => setShowAddModal(true)}
                            >
                                <Plus size={18} />
                                Add Website
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Add Website Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Add Website</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowAddModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddWebsite}>
                            <div className="modal-body">
                                {error && (
                                    <div className="alert alert-error mb-4">{error}</div>
                                )}
                                <div className="form-group">
                                    <label className="form-label" htmlFor="domain">
                                        Domain
                                    </label>
                                    <input
                                        id="domain"
                                        type="text"
                                        className="form-input"
                                        placeholder="example.com"
                                        value={newDomain}
                                        onChange={(e) => setNewDomain(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                    <p className="form-helper">
                                        Enter the domain without http:// or https://
                                    </p>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowAddModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={createMutation.isPending}
                                >
                                    {createMutation.isPending ? 'Adding...' : 'Add Website'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function WebsiteCard({
    website,
    onNavigate,
}: {
    website: WebsiteWithStats;
    onNavigate: () => void;
}) {
    const statusConfig = {
        ACTIVE: { color: 'success', label: 'Active' },
        DRAFT: { color: 'warning', label: 'Draft' },
        DISABLED: { color: 'gray', label: 'Disabled' },
    }[website.status] || { color: 'gray', label: website.status };

    const completionItems = [
        { label: 'Notice', done: website.hasNotice },
        { label: 'English Translation', done: website.hasEnglishNotice },
        { label: 'Purposes', done: website.purposeCount > 0 },
        { label: 'Banner', done: website.hasBanner },
    ];

    const completedCount = completionItems.filter((i) => i.done).length;
    const completionPercent = (completedCount / completionItems.length) * 100;

    return (
        <div className="website-card card" onClick={onNavigate}>
            <div className="website-card-header">
                <div className="website-domain-badge">
                    <Globe size={18} />
                    <span>{website.domain}</span>
                </div>
                <span className={`badge badge-${statusConfig.color}`}>
                    {statusConfig.label}
                </span>
            </div>

            <div className="website-card-body">
                <div className="completion-section">
                    <div className="completion-header">
                        <span className="completion-label">Configuration</span>
                        <span className="completion-value">
                            {completedCount}/{completionItems.length}
                        </span>
                    </div>
                    <div className="completion-bar">
                        <div
                            className="completion-fill"
                            style={{ width: `${completionPercent}%` }}
                        />
                    </div>
                </div>

                <div className="completion-checklist">
                    {completionItems.map((item) => (
                        <div
                            key={item.label}
                            className={`checklist-item ${item.done ? 'done' : ''}`}
                        >
                            {item.done ? (
                                <Check size={14} className="text-success" />
                            ) : (
                                <X size={14} className="text-gray-400" />
                            )}
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="website-card-footer">
                <button className="btn btn-secondary btn-sm">
                    <Settings size={14} />
                    Configure
                </button>
            </div>
        </div>
    );
}
