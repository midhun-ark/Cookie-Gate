import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, GripVertical, AlertCircle, Plus, X, Globe } from 'lucide-react';
import { purposeApi, languageApi } from '@/api';
import { getErrorMessage } from '@/api/client';
import type { Purpose, SupportedLanguage } from '@/types';

interface Translation {
    languageCode: string;
    name: string;
    description: string;
}

export function PurposesTab({ websiteId }: { websiteId: string }) {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewLang, setViewLang] = useState('en');

    const { data: purposes, isLoading } = useQuery({
        queryKey: ['purposes', websiteId],
        queryFn: () => purposeApi.list(websiteId),
    });

    const { data: languages = [] } = useQuery({
        queryKey: ['languages'],
        queryFn: languageApi.list
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
                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Manage data processing purposes with multi-language support.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Language Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f3f4f6', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        <Globe style={{ width: '14px', height: '14px', color: '#6b7280' }} />
                        <select
                            value={viewLang}
                            onChange={(e) => setViewLang(e.target.value)}
                            style={{ fontSize: '12px', border: 'none', background: 'transparent', cursor: 'pointer', outline: 'none', color: '#374151', fontWeight: 500 }}
                        >
                            {languages.map((l: SupportedLanguage) => (
                                <option key={l.code} value={l.code}>{l.name}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={() => { setEditingId(null); setIsModalOpen(true); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '13px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(79, 70, 229, 0.3)' }}
                    >
                        <Plus style={{ width: '14px', height: '14px' }} /> Add Purpose
                    </button>
                </div>
            </div>

            {/* Purpose List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {purposes && purposes.length > 0 ? (
                    purposes.sort((a, b) => a.displayOrder - b.displayOrder).map((purpose) => {
                        const langCount = purpose.translations?.length || 0;
                        const trans = getTranslation(purpose, viewLang);
                        const hasTrans = !!purpose.translations?.find(t => t.languageCode === viewLang);
                        return (
                            <div
                                key={purpose.id}
                                style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <GripVertical style={{ width: '16px', height: '16px', color: '#9ca3af', cursor: 'move' }} />
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                                                {trans?.name || 'Unnamed Purpose'}
                                            </span>
                                            {!hasTrans && viewLang !== 'en' && (
                                                <span style={{ fontSize: '9px', background: '#fef3c7', color: '#d97706', padding: '1px 5px', borderRadius: '3px' }}>EN fallback</span>
                                            )}
                                            <span style={{ fontSize: '10px', fontFamily: 'monospace', background: '#f3f4f6', color: '#6b7280', padding: '2px 6px', borderRadius: '4px' }}>{purpose.tag}</span>
                                            {purpose.isEssential && (
                                                <span style={{ fontSize: '10px', background: '#f3f4f6', color: '#6b7280', padding: '2px 6px', borderRadius: '4px' }}>Essential</span>
                                            )}
                                            <span style={{ fontSize: '10px', background: purpose.status === 'ACTIVE' ? '#dcfce7' : '#fef3c7', color: purpose.status === 'ACTIVE' ? '#16a34a' : '#d97706', padding: '2px 6px', borderRadius: '4px' }}>
                                                {purpose.status}
                                            </span>
                                            {langCount > 1 && (
                                                <span style={{ fontSize: '10px', background: '#e0e7ff', color: '#4f46e5', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                    <Globe style={{ width: '10px', height: '10px' }} /> {langCount} langs
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {trans?.description}
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
                        );
                    })
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
                    <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '500px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
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
    const [selectedLang, setSelectedLang] = useState('en');
    const [translations, setTranslations] = useState<Translation[]>([]);

    const { data: languages = [] } = useQuery({
        queryKey: ['languages'],
        queryFn: languageApi.list
    });

    // Initialize translations from purpose
    useEffect(() => {
        if (purpose?.translations) {
            // Map to local Translation type and ensure English is always first
            let trans: Translation[] = purpose.translations.map(t => ({
                languageCode: t.languageCode,
                name: t.name,
                description: t.description
            }));
            if (!trans.find(t => t.languageCode === 'en')) {
                trans = [{ languageCode: 'en', name: '', description: '' }, ...trans];
            }
            setTranslations(trans);
        } else {
            setTranslations([{ languageCode: 'en', name: '', description: '' }]);
        }
    }, [purpose]);

    const getCurrentTranslation = (): Translation => {
        return translations.find(t => t.languageCode === selectedLang) || { languageCode: selectedLang, name: '', description: '' };
    };

    const handleTranslationChange = (field: 'name' | 'description', value: string) => {
        setTranslations(prev => {
            const idx = prev.findIndex(t => t.languageCode === selectedLang);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], [field]: value };
                return updated;
            }
            return [...prev, { languageCode: selectedLang, name: '', description: '', [field]: value }];
        });
        if (field === 'name' && selectedLang === 'en' && !isEditing && !tag) {
            setTag(value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
        }
    };

    const addLanguage = (code: string) => {
        if (!translations.find(t => t.languageCode === code)) {
            setTranslations(prev => [...prev, { languageCode: code, name: '', description: '' }]);
        }
        setSelectedLang(code);
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const validTranslations = translations.filter(t => t.languageCode === 'en' || (t.name && t.description));
            if (isEditing) {
                await purposeApi.update(purpose.id, { isEssential });
                await purposeApi.updateTranslations(purpose.id, validTranslations);
            } else {
                await purposeApi.create(websiteId, { isEssential, tag, displayOrder: 0, translations: validTranslations });
            }
        },
        onSuccess,
        onError: (err) => setError(getErrorMessage(err)),
    });

    const currentTrans = getCurrentTranslation();
    const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' };
    const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '6px' };
    const enName = translations.find(t => t.languageCode === 'en')?.name || '';
    const canSave = enName && tag;

    return (
        <div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {error && (
                    <div style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle style={{ width: '14px', height: '14px' }} /> {error}
                    </div>
                )}

                {/* Language Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f9fafb', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <Globe style={{ width: '14px', height: '14px', color: '#4f46e5' }} />
                    <select
                        value={selectedLang}
                        onChange={(e) => { addLanguage(e.target.value); setSelectedLang(e.target.value); }}
                        style={{ fontSize: '13px', fontWeight: 500, background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', color: '#374151', flex: 1 }}
                    >
                        {languages.map((l: SupportedLanguage) => (
                            <option key={l.code} value={l.code}>{l.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={labelStyle}>Purpose Name {selectedLang === 'en' && <span style={{ color: '#dc2626' }}>*</span>}</label>
                    <input
                        type="text"
                        value={currentTrans.name}
                        onChange={(e) => handleTranslationChange('name', e.target.value)}
                        placeholder={selectedLang === 'en' ? 'e.g. Analytics' : `Translation for ${selectedLang.toUpperCase()}...`}
                        style={inputStyle}
                    />
                </div>
                <div>
                    <label style={labelStyle}>Data Category Info</label>
                    <textarea
                        value={currentTrans.description}
                        onChange={(e) => handleTranslationChange('description', e.target.value)}
                        placeholder="Briefly describe what data is collected..."
                        style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                    />
                </div>

                {selectedLang === 'en' && (
                    <div>
                        <label style={labelStyle}>Tag ID <span style={{ color: '#dc2626' }}>*</span></label>
                        <input
                            type="text"
                            value={tag}
                            onChange={(e) => setTag(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            disabled={isEditing}
                            placeholder="unique_tag_id"
                            style={{ ...inputStyle, fontFamily: 'monospace', background: isEditing ? '#f9fafb' : '#fff', color: isEditing ? '#9ca3af' : '#111827' }}
                        />
                    </div>
                )}

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
                        onClick={() => saveMutation.mutate(undefined, { onSuccess: () => { setTranslations([{ languageCode: 'en', name: '', description: '' }]); setTag(''); setIsEssential(false); setSelectedLang('en'); queryClient.invalidateQueries({ queryKey: ['purposes', websiteId] }); } })}
                        disabled={saveMutation.isPending || !canSave}
                        style={{ flex: 1, padding: '8px', fontSize: '13px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', color: '#374151', opacity: saveMutation.isPending || !canSave ? 0.5 : 1 }}
                    >
                        Save & Add Another
                    </button>
                )}
                <button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || !canSave}
                    style={{ flex: 1, padding: '8px', fontSize: '13px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: saveMutation.isPending || !canSave ? 0.5 : 1 }}
                >
                    {saveMutation.isPending ? 'Saving...' : (isEditing ? 'Update' : 'Save')}
                </button>
            </div>
        </div>
    );
}

function getTranslation(purpose: Purpose, lang: string) {
    return purpose.translations?.find((t) => t.languageCode === lang) || purpose.translations?.[0];
}
