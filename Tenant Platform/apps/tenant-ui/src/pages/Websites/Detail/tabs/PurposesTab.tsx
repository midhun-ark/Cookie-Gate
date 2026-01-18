import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, GripVertical, AlertCircle, Plus, X } from 'lucide-react';
import { purposeApi } from '@/api';
import { getErrorMessage } from '@/api/client';
import type { Purpose } from '@/types';

export function PurposesTab({ websiteId }: { websiteId: string }) {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const { data: purposes, isLoading } = useQuery({
        queryKey: ['purposes', websiteId],
        queryFn: () => purposeApi.list(websiteId),
    });

    const deleteMutation = useMutation({
        mutationFn: purposeApi.delete,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purposes', websiteId] }),
    });

    const handleEdit = (id: string) => { setEditingId(id); setIsModalOpen(true); };
    const handleCloseModal = () => { setIsModalOpen(false); setEditingId(null); };

    if (isLoading) return <div style={{ padding: '32px', textAlign: 'center' }}><div className="spinner"></div></div>;

    return (
        <div style={{ maxWidth: '700px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>Configured Purposes</h2>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Manage the data processing purposes for this website.</p>
                </div>
                <button
                    onClick={() => { setEditingId(null); setIsModalOpen(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '13px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(79, 70, 229, 0.3)' }}
                >
                    <Plus style={{ width: '14px', height: '14px' }} /> Add Purpose
                </button>
            </div>

            {/* Purpose List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {purposes && purposes.length > 0 ? (
                    purposes.sort((a, b) => a.displayOrder - b.displayOrder).map((purpose) => (
                        <div
                            key={purpose.id}
                            style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'border-color 0.2s' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <GripVertical style={{ width: '16px', height: '16px', color: '#9ca3af', cursor: 'move' }} />
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                                            {getTranslation(purpose, 'en')?.name || 'Unnamed Purpose'}
                                        </span>
                                        <span style={{ fontSize: '10px', fontFamily: 'monospace', background: '#f3f4f6', color: '#6b7280', padding: '2px 6px', borderRadius: '4px' }}>{purpose.tag}</span>
                                        {purpose.isEssential && (
                                            <span style={{ fontSize: '10px', background: '#f3f4f6', color: '#6b7280', padding: '2px 6px', borderRadius: '4px' }}>Essential</span>
                                        )}
                                        <span style={{ fontSize: '10px', background: purpose.status === 'ACTIVE' ? '#dcfce7' : '#fef3c7', color: purpose.status === 'ACTIVE' ? '#16a34a' : '#d97706', padding: '2px 6px', borderRadius: '4px' }}>
                                            {purpose.status}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {getTranslation(purpose, 'en')?.description}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    onClick={() => handleEdit(purpose.id)}
                                    style={{ padding: '6px 10px', fontSize: '12px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px', cursor: 'pointer', color: '#374151' }}
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => { if (confirm('Delete this purpose?')) deleteMutation.mutate(purpose.id); }}
                                    style={{ padding: '6px 8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer', color: '#dc2626' }}
                                >
                                    <Trash2 style={{ width: '14px', height: '14px' }} />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ background: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db', padding: '40px', textAlign: 'center' }}>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>No purposes defined yet.</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', color: '#374151' }}
                        >
                            <Plus style={{ width: '12px', height: '12px' }} /> Add Your First Purpose
                        </button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={handleCloseModal}>
                    <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '420px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: '#111827' }}>{editingId ? 'Edit Purpose' : 'Add New Purpose'}</h3>
                            <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                                <X style={{ width: '20px', height: '20px' }} />
                            </button>
                        </div>
                        <PurposeForm
                            websiteId={websiteId}
                            purpose={purposes?.find((p) => p.id === editingId)}
                            key={editingId || 'new'}
                            onCancel={handleCloseModal}
                            onSuccess={() => { handleCloseModal(); queryClient.invalidateQueries({ queryKey: ['purposes', websiteId] }); }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function PurposeForm({ websiteId, purpose, onCancel, onSuccess }: { websiteId: string; purpose?: Purpose; onCancel: () => void; onSuccess: () => void; }) {
    const queryClient = useQueryClient();
    const isEditing = !!purpose;
    const [isEssential, setIsEssential] = useState(purpose?.isEssential || false);
    const [tag, setTag] = useState(purpose?.tag || '');
    const [error, setError] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useState(() => {
        if (purpose) {
            const en = purpose.translations.find(t => t.languageCode === 'en');
            setName(en?.name || '');
            setDescription(en?.description || '');
        }
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const transList = [{ languageCode: 'en', name, description }];
            if (isEditing) {
                await purposeApi.update(purpose.id, { isEssential });
                await purposeApi.updateTranslations(purpose.id, transList);
            } else {
                await purposeApi.create(websiteId, { isEssential, tag, displayOrder: 0, translations: transList });
            }
        },
        onSuccess,
        onError: (err) => setError(getErrorMessage(err)),
    });

    const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' };
    const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '6px' };

    return (
        <div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {error && (
                    <div style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle style={{ width: '14px', height: '14px' }} /> {error}
                    </div>
                )}
                <div>
                    <label style={labelStyle}>Purpose Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); if (!isEditing && !tag) setTag(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')); }}
                        placeholder="e.g. Analytics"
                        style={inputStyle}
                    />
                </div>
                <div>
                    <label style={labelStyle}>Data Category Info</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Briefly describe what data is collected..."
                        style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
                    />
                </div>
                <div>
                    <label style={labelStyle}>Tag ID</label>
                    <input
                        type="text"
                        value={tag}
                        onChange={(e) => setTag(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        disabled={isEditing}
                        placeholder="unique_tag_id"
                        style={{ ...inputStyle, fontFamily: 'monospace', background: isEditing ? '#f9fafb' : '#fff', color: isEditing ? '#9ca3af' : '#111827' }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#374151' }}>Strictly Necessary</span>
                    <label style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={isEssential}
                            onChange={(e) => setIsEssential(e.target.checked)}
                            disabled={isEditing && purpose?.isEssential}
                            style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{ position: 'absolute', inset: 0, background: isEssential ? '#4f46e5' : '#d1d5db', borderRadius: '20px', transition: 'background 0.2s' }}></span>
                        <span style={{ position: 'absolute', top: '2px', left: isEssential ? '18px' : '2px', width: '16px', height: '16px', background: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}></span>
                    </label>
                </div>
            </div>
            <div style={{ padding: '14px 20px', background: '#f9fafb', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '10px' }}>
                {isEditing ? (
                    <button onClick={onCancel} style={{ flex: 1, padding: '8px', fontSize: '13px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', color: '#374151' }}>Cancel</button>
                ) : (
                    <button
                        onClick={() => saveMutation.mutate(undefined, { onSuccess: () => { setName(''); setTag(''); setDescription(''); setIsEssential(false); queryClient.invalidateQueries({ queryKey: ['purposes', websiteId] }); } })}
                        disabled={saveMutation.isPending || !name || !tag}
                        style={{ flex: 1, padding: '8px', fontSize: '13px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', color: '#374151', opacity: saveMutation.isPending || !name || !tag ? 0.5 : 1 }}
                    >
                        Save & Add Another
                    </button>
                )}
                <button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || !name || !tag}
                    style={{ flex: 1, padding: '8px', fontSize: '13px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: saveMutation.isPending || !name || !tag ? 0.5 : 1 }}
                >
                    {saveMutation.isPending ? 'Saving...' : (isEditing ? 'Update' : 'Save')}
                </button>
            </div>
        </div>
    );
}

function getTranslation(purpose: Purpose, lang: string) {
    return purpose.translations.find((t) => t.languageCode === lang) || purpose.translations[0];
}
