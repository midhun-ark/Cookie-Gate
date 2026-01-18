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
import './WebsiteDetail.css';

type TabId = 'notice' | 'purposes' | 'banner' | 'install';

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
        { id: 'install', label: 'Install', icon: Code },
    ];

    return (
        <div className="website-detail-page">
            <div className="container">
                {/* Header */}
                <div className="page-header">
                    <div className="flex items-center gap-4">
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => navigate('/websites')}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold">{website.domain}</h1>
                                <StatusBadge status={website.status} />
                            </div>
                            <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                <Globe size={14} />
                                {website.id}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {website.status === 'DRAFT' && (
                            <span
                                title={
                                    !canActivate?.canActivate
                                        ? canActivate?.reasons.join('\n')
                                        : 'Activate Consent Management'
                                }
                            >
                                <button
                                    className="btn btn-primary"
                                    disabled={!canActivate?.canActivate || activateMutation.isPending}
                                    onClick={() => activateMutation.mutate()}
                                >
                                    {activateMutation.isPending ? (
                                        <Loader2 className="animate-spin" size={18} />
                                    ) : (
                                        <Play size={18} />
                                    )}
                                    Activate
                                </button>
                            </span>
                        )}
                    </div>
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
                        {activeTab === 'install' && <InstallTab website={website} />}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config = {
        ACTIVE: { className: 'badge-success', icon: CheckCircle, label: 'Active' },
        DRAFT: { className: 'badge-warning', icon: AlertTriangle, label: 'Draft' },
        DISABLED: { className: 'badge-gray', icon: AlertTriangle, label: 'Disabled' },
    }[status] || { className: 'badge-gray', icon: AlertTriangle, label: status };

    const Icon = config.icon;

    return (
        <span className={`badge ${config.className} flex items-center gap-1.5`}>
            <Icon size={12} />
            {config.label}
        </span>
    );
}
