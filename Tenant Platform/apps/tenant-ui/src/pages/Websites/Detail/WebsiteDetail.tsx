import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    FileText,
    List,
    Layout,
    Code,
    Languages,
    CheckCircle,
    AlertTriangle,
    Play,
    Loader2,
    Clock,
    ExternalLink
} from 'lucide-react';
import { websiteApi } from '@/api';
import { getErrorMessage } from '@/api/client';
import { NoticeTab } from './tabs/NoticeTab';
import { PurposesTab } from './tabs/PurposesTab';
import { BannerTab } from './tabs/BannerTab';
import { InstallTab } from './tabs/InstallTab';
import { TranslationsTab } from './tabs/TranslationsTab';
import './WebsiteDetail.css';

type TabId = 'notice' | 'purposes' | 'banner' | 'translations' | 'install';

export function WebsiteDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabId>('banner');
    const [activateError, setActivateError] = useState('');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const handleSave = () => {
        setLastSaved(new Date());
    };

    const { data: website, isLoading } = useQuery({
        queryKey: ['website', id],
        queryFn: () => websiteApi.get(id!),
        enabled: !!id,
    });

    const { data: canActivate } = useQuery({
        queryKey: ['website', id, 'can-activate'],
        queryFn: () => websiteApi.canActivate(id!),
        enabled: !!id,
    });

    const activateMutation = useMutation({
        mutationFn: () => websiteApi.updateStatus(id!, 'ACTIVE'),
        onSuccess: () => {
            setActivateError('');
            queryClient.invalidateQueries({ queryKey: ['website', id] });
            queryClient.invalidateQueries({ queryKey: ['website', id, 'can-activate'] });
        },
        onError: (err) => {
            setActivateError(getErrorMessage(err));
            // Auto-clear error after 5 seconds
            setTimeout(() => setActivateError(''), 5000);
            // Refresh can-activate status
            queryClient.invalidateQueries({ queryKey: ['website', id, 'can-activate'] });
        }
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (!website) {
        return (
            <div className="container py-8">
                <div className="alert alert-error">Website not found</div>
                <button
                    className="btn btn-ghost mt-4"
                    onClick={() => navigate('/websites')}
                >
                    <ArrowLeft size={16} /> Back to Websites
                </button>
            </div>
        );
    }

    const tabs = [
        { id: 'banner', label: 'Banner', icon: Layout },
        { id: 'notice', label: 'Notice', icon: FileText },
        { id: 'purposes', label: 'Consent', icon: List },
        { id: 'translations', label: 'Translations', icon: Languages },
        { id: 'install', label: 'Install', icon: Code },
    ];

    return (
        <div className="website-detail-page">
            <div className="container">
                {/* Header - Minimal & Clean */}
                <div style={{
                    borderBottom: '1px solid #e5e7eb',
                    padding: '16px 0',
                    marginTop: '16px',
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    {/* Left: Site Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1f2937', margin: 0 }}>{website.domain}</h1>
                                <span style={{
                                    background: website.status === 'ACTIVE' ? '#22c55e' : '#fbbf24',
                                    color: '#fff',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                }}>
                                    <CheckCircle size={10} />
                                    {website.status === 'ACTIVE' ? 'Active' : website.status}
                                </span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px' }}>
                                ID: {website.id.slice(0, 8)}
                            </div>
                        </div>
                    </div>

                    {/* Right: Changes Live Indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', padding: '4px 10px', borderRadius: '20px', border: '1px solid #bbf7d0' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></div>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#166534' }}>Changes are live</span>
                            {lastSaved && (
                                <span style={{ fontSize: '10px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <Clock size={10} />
                                    {lastSaved.toLocaleTimeString()}
                                </span>
                            )}
                        </div>
                        <a
                            href={`http://localhost:3001/runtime/websites/${website.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '11px', color: '#166534', background: '#f0fdf4', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', border: '1px solid #bbf7d0' }}
                        >
                            <ExternalLink size={10} /> Live
                        </a>
                    </div>
                </div>

                {website.status === 'DRAFT' && (
                    <button
                        disabled={!canActivate?.canActivate || activateMutation.isPending}
                        onClick={() => activateMutation.mutate()}
                        title={!canActivate?.canActivate ? canActivate?.reasons.join('\n') : 'Activate Consent Management'}
                        style={{
                            background: '#667eea',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 20px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: canActivate?.canActivate ? 'pointer' : 'not-allowed',
                            opacity: canActivate?.canActivate ? 1 : 0.6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexShrink: 0
                        }}
                    >
                        {activateMutation.isPending ? (
                            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                            <Play size={14} />
                        )}
                        Activate
                    </button>
                )}
            </div>

            {activateError && (
                <div className="alert alert-error mb-6">
                    <AlertTriangle size={18} />
                    {activateError}
                </div>
            )}

            {/* Validation Warnings */}
            {website.status === 'DRAFT' && canActivate && !canActivate.canActivate && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(245, 158, 11, 0.08) 100%)',
                    border: '1px solid rgba(251, 191, 36, 0.35)',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 12px rgba(251, 191, 36, 0.1)'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        borderRadius: '10px',
                        padding: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                    }}>
                        <AlertTriangle size={20} style={{ color: '#fff' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{
                            fontSize: '15px',
                            fontWeight: 600,
                            color: '#b45309',
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            Setup Incomplete
                        </div>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                        }}>
                            {canActivate.reasons.map((reason, i) => (
                                <div
                                    key={i}
                                    style={{
                                        fontSize: '13px',
                                        color: '#92400e',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <span style={{
                                        width: '5px',
                                        height: '5px',
                                        borderRadius: '50%',
                                        background: '#d97706',
                                        flexShrink: 0
                                    }} />
                                    {reason}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="detail-layout">
                {/* Sidebar Tabs */}
                <div className="detail-sidebar card">
                    <div className="tabs-vertical">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id as TabId)}
                                >
                                    <Icon size={18} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <div className="detail-content">
                    {activeTab === 'notice' && <NoticeTab websiteId={website.id} onSave={handleSave} />}
                    {activeTab === 'purposes' && <PurposesTab websiteId={website.id} onSave={handleSave} />}
                    {activeTab === 'banner' && <BannerTab websiteId={website.id} onSave={handleSave} />}
                    {activeTab === 'translations' && <TranslationsTab websiteId={website.id} onSave={handleSave} />}
                    {activeTab === 'install' && <InstallTab website={website} />}
                </div>
            </div>
        </div>
    );
}
