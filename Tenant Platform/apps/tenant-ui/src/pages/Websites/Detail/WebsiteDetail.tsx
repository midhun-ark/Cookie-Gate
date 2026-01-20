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
    ExternalLink,
    Plus,
    Edit,
    Trash2,
    History,
    ChevronDown,
    Archive
} from 'lucide-react';
import { websiteApi, versionApi } from '@/api';
import { getErrorMessage } from '@/api/client';
import { NoticeTab } from './tabs/NoticeTab';
import { PurposesTab } from './tabs/PurposesTab';
import { BannerTab } from './tabs/BannerTab';
import { InstallTab } from './tabs/InstallTab';
import { TranslationsTab } from './tabs/TranslationsTab';
import { ConfirmModal } from '@/components';
import './WebsiteDetail.css';

type TabId = 'notice' | 'purposes' | 'banner' | 'translations' | 'install';

export function WebsiteDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabId>('banner');
    const [activateError, setActivateError] = useState('');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const [showVersionHistory, setShowVersionHistory] = useState(false);

    const handleSave = () => {
        setLastSaved(new Date());
        queryClient.invalidateQueries({ queryKey: ['website', id, 'can-activate'] });
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

    // Fetch all versions to determine the working version (latest)
    const { data: versions, isLoading: isLoadingVersions } = useQuery({
        queryKey: ['website', id, 'versions'],
        queryFn: () => versionApi.list(id!),
        enabled: !!id && !!website,
    });

    // Use the latest version (Draft or Active) as the working version
    // The API sorts by version number DESC, so the first one is the latest
    const workingVersion = versions?.[0];

    // Check if ANY draft version exists - this determines button visibility
    // Since initial versions are now created as DRAFT, this handles all cases
    const hasDraftVersion = versions?.some(v => v.status === 'DRAFT') ?? false;

    const createVersionMutation = useMutation({
        mutationFn: () => versionApi.create(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['website', id] });
            queryClient.invalidateQueries({ queryKey: ['website', id, 'versions'] });
            // Switch to notice tab to encourage reviewing settings
            setActiveTab('notice');
        },
        onError: (err) => {
            setActivateError(getErrorMessage(err));
            setTimeout(() => setActivateError(''), 5000);
        }
    });

    const activateMutation = useMutation({
        mutationFn: () => {
            // Find the draft version to activate
            const draftVersion = versions?.find(v => v.status === 'DRAFT');
            if (!draftVersion) throw new Error('No draft version to activate');
            return versionApi.activate(id!, draftVersion.id);
        },
        onSuccess: () => {
            setActivateError('');
            queryClient.invalidateQueries({ queryKey: ['website', id] });
            queryClient.invalidateQueries({ queryKey: ['website', id, 'can-activate'] });
            queryClient.invalidateQueries({ queryKey: ['website', id, 'versions'] });
        },
        onError: (err) => {
            setActivateError(getErrorMessage(err));
            setTimeout(() => setActivateError(''), 5000);
            queryClient.invalidateQueries({ queryKey: ['website', id, 'can-activate'] });
        }
    });

    // Archive (discard) the current draft version
    const archiveMutation = useMutation({
        mutationFn: () => {
            const draftVersion = versions?.find(v => v.status === 'DRAFT');
            if (!draftVersion) throw new Error('No draft version to archive');
            return versionApi.archive(draftVersion.id);
        },
        onSuccess: () => {
            setActivateError('');
            setShowDiscardConfirm(false);
            queryClient.invalidateQueries({ queryKey: ['website', id] });
            queryClient.invalidateQueries({ queryKey: ['website', id, 'versions'] });
        },
        onError: (err) => {
            setActivateError(getErrorMessage(err));
            setShowDiscardConfirm(false);
            setTimeout(() => setActivateError(''), 5000);
        }
    });

    if (isLoading || isLoadingVersions) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (!website || !workingVersion) {
        return (
            <div className="container py-8">
                <div className="alert alert-error">{!website ? 'Website not found' : 'No version found'}</div>
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
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    gap: '16px'
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
                                {/* Version Dropdown */}
                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setShowVersionHistory(!showVersionHistory)}
                                        style={{
                                            fontSize: '10px',
                                            color: '#6b7280',
                                            background: workingVersion.status === 'DRAFT' ? '#fef3c7' : '#f3f4f6',
                                            padding: '3px 8px',
                                            borderRadius: '12px',
                                            border: workingVersion.status === 'DRAFT' ? '1px solid #fcd34d' : 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        v{workingVersion.versionNumber}
                                        <span style={{
                                            fontSize: '8px',
                                            fontWeight: 600,
                                            color: workingVersion.status === 'DRAFT' ? '#92400e' : '#166534',
                                            textTransform: 'uppercase'
                                        }}>
                                            {workingVersion.status}
                                        </span>
                                        <ChevronDown size={10} style={{ transform: showVersionHistory ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                    </button>
                                    {showVersionHistory && (
                                        <>
                                            {/* Backdrop */}
                                            <div
                                                onClick={() => setShowVersionHistory(false)}
                                                style={{
                                                    position: 'fixed',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    zIndex: 99
                                                }}
                                            />
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    marginTop: '8px',
                                                    background: '#fff',
                                                    borderRadius: '12px',
                                                    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                                                    border: '1px solid #e5e7eb',
                                                    minWidth: '280px',
                                                    zIndex: 100,
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <History size={14} color="#6b7280" />
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Version History</span>
                                                </div>
                                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                                    {versions?.map((v) => (
                                                        <div
                                                            key={v.id}
                                                            style={{
                                                                padding: '12px 16px',
                                                                borderBottom: '1px solid #f3f4f6',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                background: v.id === workingVersion.id ? '#f0f9ff' : 'transparent',
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>
                                                                    v{v.versionNumber}
                                                                </span>
                                                                <span style={{
                                                                    fontSize: '9px',
                                                                    fontWeight: 600,
                                                                    padding: '2px 6px',
                                                                    borderRadius: '8px',
                                                                    background: v.status === 'ACTIVE' ? '#dcfce7' : v.status === 'DRAFT' ? '#fef3c7' : '#f3f4f6',
                                                                    color: v.status === 'ACTIVE' ? '#166534' : v.status === 'DRAFT' ? '#92400e' : '#6b7280',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '3px'
                                                                }}>
                                                                    {v.status === 'ACTIVE' && <CheckCircle size={8} />}
                                                                    {v.status === 'DRAFT' && <Edit size={8} />}
                                                                    {v.status === 'ARCHIVED' && <Archive size={8} />}
                                                                    {v.status}
                                                                </span>
                                                            </div>
                                                            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                                                {new Date(v.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px' }}>
                                ID: {website.id.slice(0, 8)} • {hasDraftVersion ? 'Editing Draft' : workingVersion.status}
                            </div>
                        </div>
                    </div>

                    {/* Center: Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                        {/* Show Activate and Discard buttons if a draft version exists */}
                        {hasDraftVersion && (
                            <>
                                <button
                                    disabled={!canActivate?.canActivate || activateMutation.isPending}
                                    onClick={() => activateMutation.mutate()}
                                    title={!canActivate?.canActivate ? canActivate?.reasons.join('\n') : 'Activate Consent Management'}
                                    style={{
                                        background: '#667eea',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '8px 16px',
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
                                    Activate Version
                                </button>
                                <button
                                    disabled={archiveMutation.isPending}
                                    onClick={() => setShowDiscardConfirm(true)}
                                    title="Discard this draft version"
                                    style={{
                                        background: '#fef2f2',
                                        color: '#dc2626',
                                        border: '1px solid #fecaca',
                                        borderRadius: '8px',
                                        padding: '8px 16px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        flexShrink: 0
                                    }}
                                >
                                    <Trash2 size={14} />
                                    Discard Draft
                                </button>
                            </>
                        )}

                        {/* Show Create New Version button if website is ACTIVE and no draft exists */}
                        {website.status === 'ACTIVE' && !hasDraftVersion && (
                            <button
                                disabled={createVersionMutation.isPending}
                                onClick={() => createVersionMutation.mutate()}
                                style={{
                                    background: '#f3f4f6',
                                    color: '#374151',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    flexShrink: 0
                                }}
                            >
                                {createVersionMutation.isPending ? (
                                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                ) : (
                                    <Plus size={14} />
                                )}
                                Create New Version
                            </button>
                        )}
                    </div>

                    {/* Right: Changes Live Indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                        {/* Small Create Version Button - Disabled when draft exists */}
                        <button
                            disabled={createVersionMutation.isPending || hasDraftVersion}
                            onClick={() => createVersionMutation.mutate()}
                            title={hasDraftVersion ? "Activate or discard current draft first" : "Create a new draft version"}
                            style={{
                                background: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                borderRadius: '20px',
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: hasDraftVersion ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                opacity: (createVersionMutation.isPending || hasDraftVersion) ? 0.4 : 1
                            }}
                        >
                            {createVersionMutation.isPending ? (
                                <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                                <Plus size={10} />
                            )}
                            Create Version
                        </button>
                        {website.status === 'ACTIVE' ? (
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
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fffbeb', padding: '4px 10px', borderRadius: '20px', border: '1px solid #fcd34d' }}>
                                <Edit size={10} className="text-amber-700" />
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#b45309' }}>Editing Draft</span>
                            </div>
                        )}
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
            </div>

            {
                activateError && (
                    <div className="alert alert-error mb-6">
                        <AlertTriangle size={18} />
                        {activateError}
                    </div>
                )
            }

            {/* Validation Warnings */}
            {
                website.status === 'DRAFT' && canActivate && !canActivate.canActivate && (
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
                )
            }

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
                    {activeTab === 'notice' && <NoticeTab versionId={workingVersion.id} onSave={handleSave} isReadOnly={workingVersion.status !== 'DRAFT'} />}
                    {activeTab === 'purposes' && <PurposesTab versionId={workingVersion.id} onSave={handleSave} isReadOnly={workingVersion.status !== 'DRAFT'} />}
                    {activeTab === 'banner' && <BannerTab versionId={workingVersion.id} onSave={handleSave} isReadOnly={workingVersion.status !== 'DRAFT'} />}
                    {activeTab === 'translations' && <TranslationsTab versionId={workingVersion.id} websiteId={website.id} onSave={handleSave} isReadOnly={workingVersion.status !== 'DRAFT'} />}
                    {activeTab === 'install' && <InstallTab website={website} />}
                </div>
            </div>

            {/* Discard Draft Confirmation Modal */}
            <ConfirmModal
                isOpen={showDiscardConfirm}
                title="Discard Draft Version?"
                message="This will permanently archive your draft changes. The current active version will remain unchanged. This action cannot be undone."
                confirmText="Discard Draft"
                cancelText="Keep Draft"
                onConfirm={() => archiveMutation.mutate()}
                onCancel={() => setShowDiscardConfirm(false)}
                isLoading={archiveMutation.isPending}
                variant="danger"
            />
        </div >
    );
}
