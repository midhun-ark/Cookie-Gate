import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Globe,
    FileText,
    List,
    Layout,
    Code,
    Languages,
    CheckCircle,
    AlertTriangle,
    Play,
    Loader2
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
    const [activeTab, setActiveTab] = useState<TabId>('purposes');
    const [activateError, setActivateError] = useState('');

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
            queryClient.invalidateQueries({ queryKey: ['website', id] });
        },
        onError: (err) => {
            setActivateError(getErrorMessage(err));
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
        { id: 'purposes', label: 'Purposes', icon: List },
        { id: 'notice', label: 'Notice', icon: FileText },
        { id: 'banner', label: 'Banner', icon: Layout },
        { id: 'translations', label: 'Translations', icon: Languages },
        { id: 'install', label: 'Install', icon: Code },
    ];

    return (
        <div className="website-detail-page">
            <div className="container">
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '16px',
                    padding: '24px 28px',
                    marginTop: '24px',
                    marginBottom: '24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.25)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button
                            onClick={() => navigate('/websites')}
                            style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backdropFilter: 'blur(4px)'
                            }}
                        >
                            <ArrowLeft size={20} style={{ color: '#fff' }} />
                        </button>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            padding: '14px',
                            borderRadius: '14px',
                            backdropFilter: 'blur(8px)'
                        }}>
                            <Globe size={28} style={{ color: '#fff' }} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#fff', margin: 0 }}>{website.domain}</h1>
                                <span style={{
                                    background: website.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(251, 191, 36, 0.9)',
                                    color: '#fff',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <CheckCircle size={12} />
                                    {website.status === 'ACTIVE' ? 'Active' : website.status}
                                </span>
                            </div>
                            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '6px' }}>
                                Website ID: {website.id.slice(0, 8)}
                            </div>
                        </div>
                    </div>

                    {website.status === 'DRAFT' && (
                        <button
                            disabled={!canActivate?.canActivate || activateMutation.isPending}
                            onClick={() => activateMutation.mutate()}
                            title={!canActivate?.canActivate ? canActivate?.reasons.join('\n') : 'Activate Consent Management'}
                            style={{
                                background: 'rgba(255, 255, 255, 0.95)',
                                color: '#764ba2',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '12px 24px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: canActivate?.canActivate ? 'pointer' : 'not-allowed',
                                opacity: canActivate?.canActivate ? 1 : 0.6,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                            }}
                        >
                            {activateMutation.isPending ? (
                                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                                <Play size={16} />
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
                    <div className="alert alert-warning mb-6">
                        <div className="font-semibold mb-1 flex items-center gap-2">
                            <AlertTriangle size={16} />
                            Setup incomplete
                        </div>
                        <ul className="list-disc list-inside text-sm">
                            {canActivate.reasons.map((reason, i) => (
                                <li key={i}>{reason}</li>
                            ))}
                        </ul>
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
                        {activeTab === 'notice' && <NoticeTab websiteId={website.id} />}
                        {activeTab === 'purposes' && <PurposesTab websiteId={website.id} />}
                        {activeTab === 'banner' && <BannerTab websiteId={website.id} />}
                        {activeTab === 'translations' && <TranslationsTab websiteId={website.id} />}
                        {activeTab === 'install' && <InstallTab website={website} />}
                    </div>
                </div>
            </div>
        </div>
    );
}
