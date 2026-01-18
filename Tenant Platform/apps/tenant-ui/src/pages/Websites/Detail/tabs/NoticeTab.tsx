import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, AlertCircle, CheckCircle, Wand2, Eye, X, Globe, Building2, FileText, Shield } from 'lucide-react';
import { noticeApi, purposeApi } from '@/api';
import { useLanguages } from '@/hooks';
import { NoticePreview } from '@/components';
import { getErrorMessage } from '@/api/client';
import { NoticeTranslation } from '@/types';

export function NoticeTab({ websiteId }: { websiteId: string }) {
    const queryClient = useQueryClient();
    const [selectedLang, setSelectedLang] = useState('en');
    const [dpoEmail, setDpoEmail] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = !dpoEmail || dpoEmail.trim() === '' || emailRegex.test(dpoEmail);

    const [showPreview, setShowPreview] = useState(false);
    const [previewLang, setPreviewLang] = useState('en');

    const { data: notice, isLoading: isLoadingNotice } = useQuery({
        queryKey: ['notice', websiteId],
        queryFn: () => noticeApi.get(websiteId),
    });

    const { data: purposes } = useQuery({
        queryKey: ['purposes', websiteId],
        queryFn: () => purposeApi.list(websiteId),
    });

    const { languages } = useLanguages();

    interface NoticeFormData {
        title: string;
        description: string;
        policyUrl: string;
        rightsDescription: string;
        withdrawalInstruction: string;
        complaintInstruction: string;
    }

    const defaultForm: NoticeFormData = {
        title: 'Privacy Notice',
        description: 'We use cookies to improve your experience and analyze web traffic.',
        policyUrl: '',
        rightsDescription: 'You have the right to access, correct, erase your data, and nominate a representative.',
        withdrawalInstruction: 'You can withdraw consent anytime via Account Settings.',
        complaintInstruction: 'Unresolved? You may complain to the Data Protection Board.'
    };

    const [formData, setFormData] = useState<{ [lang: string]: NoticeFormData }>({});

    useEffect(() => {
        if (notice) {
            setDpoEmail(notice.dpoEmail || '');
            const initialData: typeof formData = {};
            notice.translations.forEach((t) => {
                initialData[t.languageCode] = {
                    title: t.title,
                    description: t.description,
                    policyUrl: t.policyUrl || '',
                    rightsDescription: t.rightsDescription || defaultForm.rightsDescription,
                    withdrawalInstruction: t.withdrawalInstruction || defaultForm.withdrawalInstruction,
                    complaintInstruction: t.complaintInstruction || defaultForm.complaintInstruction,
                };
            });
            setFormData(initialData);
        } else if (!isLoadingNotice && notice === null && Object.keys(formData).length === 0) {
            setFormData({ en: defaultForm });
        }
    }, [notice, isLoadingNotice]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const translations = Object.entries(formData).map(([code, data]) => ({
                languageCode: code,
                title: data.title,
                description: data.description,
                policyUrl: data.policyUrl || undefined,
                dataCategories: [],
                processingPurposes: [],
                rightsDescription: data.rightsDescription,
                withdrawalInstruction: data.withdrawalInstruction,
                complaintInstruction: data.complaintInstruction
            }));

            if (notice) {
                await noticeApi.updateTranslations(notice.id, translations, dpoEmail);
            } else {
                await noticeApi.create(websiteId, { dpoEmail, translations });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notice', websiteId] });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        },
        onError: (err) => setError(getErrorMessage(err)),
    });

    const handleInputChange = (field: keyof NoticeFormData, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [selectedLang]: { ...prev[selectedLang] || defaultForm, [field]: value },
        }));
        setSaveSuccess(false);
        if (error) setError('');
    };

    const handleAutoTranslate = async () => {
        setIsTranslating(true);
        setError('');
        try {
            const t = await noticeApi.autoTranslate(websiteId, selectedLang);
            setFormData(prev => ({
                ...prev,
                [selectedLang]: {
                    title: t.title,
                    description: t.description,
                    policyUrl: t.policyUrl || prev[selectedLang]?.policyUrl || '',
                    rightsDescription: t.rightsDescription || '',
                    withdrawalInstruction: t.withdrawalInstruction || '',
                    complaintInstruction: t.complaintInstruction || '',
                }
            }));
            queryClient.invalidateQueries({ queryKey: ['notice', websiteId] });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsTranslating(false);
        }
    };

    const currentData = formData[selectedLang] || defaultForm;
    const previewData = formData[previewLang] || defaultForm;
    const previewTranslation: Partial<NoticeTranslation> = {
        languageCode: previewLang,
        title: previewData.title,
        description: previewData.description,
        policyUrl: previewData.policyUrl,
        dataCategories: [],
        processingPurposes: purposes
            ? purposes.filter(p => p.status === 'ACTIVE').sort((a, b) => a.displayOrder - b.displayOrder)
                .map(p => {
                    const trans = p.translations.find(t => t.languageCode === previewLang) || p.translations.find(t => t.languageCode === 'en');
                    return trans?.name || 'Unnamed Purpose';
                })
            : [],
        rightsDescription: previewData.rightsDescription,
        withdrawalInstruction: previewData.withdrawalInstruction,
        complaintInstruction: previewData.complaintInstruction
    };

    if (isLoadingNotice) {
        return <div className="p-8 text-center flex justify-center"><div className="spinner w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    const activeCodes = languages?.filter(l => l.isActive).map(l => l.code) || [];
    const distinctCodes = Array.from(new Set(['en', ...activeCodes, ...Object.keys(formData)]));
    const sortedLanguages = distinctCodes.sort((a, b) => a === 'en' ? -1 : b === 'en' ? 1 : 0);

    return (
        <div style={{ paddingBottom: '80px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>Notice Editor</h2>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Configure your DPDPA-compliant privacy notice.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f9fafb', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <Globe style={{ width: '16px', height: '16px', color: '#4f46e5' }} />
                        <select
                            value={selectedLang}
                            onChange={(e) => setSelectedLang(e.target.value)}
                            style={{ background: 'transparent', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer', outline: 'none' }}
                        >
                            {sortedLanguages.map(lang => (
                                <option key={lang} value={lang}>{languages?.find(l => l.code === lang)?.name || lang}</option>
                            ))}
                        </select>
                    </div>
                    {selectedLang !== 'en' && (
                        <button
                            onClick={handleAutoTranslate}
                            disabled={isTranslating}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}
                        >
                            <Wand2 style={{ width: '12px', height: '12px' }} />
                            {isTranslating ? 'Translating...' : 'Auto-Fill'}
                        </button>
                    )}
                </div>
            </div>

            {/* Two Column Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                {/* LEFT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Organization Contact Card */}
                    <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: '#f9fafb', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: '#dbeafe', padding: '6px', borderRadius: '6px' }}>
                                <Building2 style={{ width: '14px', height: '14px', color: '#2563eb' }} />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Organization Contact</span>
                        </div>
                        <div style={{ padding: '16px' }}>
                            <div style={{ marginBottom: '0' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>DPO Email</label>
                                <input
                                    type="email"
                                    value={dpoEmail}
                                    onChange={e => { setDpoEmail(e.target.value); if (error) setError(''); }}
                                    placeholder="privacy@yourcompany.com"
                                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: `1px solid ${!isEmailValid ? '#fca5a5' : '#d1d5db'}`, borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                                />
                                {!isEmailValid && (
                                    <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <AlertCircle style={{ width: '10px', height: '10px' }} /> Invalid email
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Notice Content Card */}
                    <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: '#f9fafb', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: '#e0e7ff', padding: '6px', borderRadius: '6px' }}>
                                <FileText style={{ width: '14px', height: '14px', color: '#4f46e5' }} />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Notice Content</span>
                        </div>
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Notice Title <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="text"
                                    value={currentData.title}
                                    onChange={(e) => handleInputChange('title', e.target.value)}
                                    placeholder="Privacy Notice"
                                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Main Description <span style={{ color: '#ef4444' }}>*</span></label>
                                <textarea
                                    value={currentData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    placeholder="We use cookies to improve your experience..."
                                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Full Policy Link</label>
                                <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden' }}>
                                    <span style={{ padding: '8px 10px', background: '#f9fafb', fontSize: '12px', color: '#6b7280', borderRight: '1px solid #e5e7eb' }}>https://</span>
                                    <input
                                        type="text"
                                        value={currentData.policyUrl?.replace(/^https?:\/\//, '') || ''}
                                        onChange={(e) => handleInputChange('policyUrl', 'https://' + e.target.value.replace(/^https?:\/\//, ''))}
                                        placeholder="example.com/privacy"
                                        style={{ flex: 1, padding: '8px 12px', fontSize: '13px', border: 'none', outline: 'none', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* User Rights Card */}
                    <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: '#f9fafb', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: '#dcfce7', padding: '6px', borderRadius: '6px' }}>
                                <Shield style={{ width: '14px', height: '14px', color: '#16a34a' }} />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>User Rights & Redressal</span>
                        </div>
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>User Rights Description</label>
                                <textarea
                                    value={currentData.rightsDescription}
                                    onChange={(e) => handleInputChange('rightsDescription', e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', minHeight: '70px', resize: 'vertical', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Withdrawal Instructions</label>
                                <textarea
                                    value={currentData.withdrawalInstruction}
                                    onChange={(e) => handleInputChange('withdrawalInstruction', e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', minHeight: '70px', resize: 'vertical', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Complaint Instructions</label>
                                <textarea
                                    value={currentData.complaintInstruction}
                                    onChange={(e) => handleInputChange('complaintInstruction', e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', minHeight: '70px', resize: 'vertical', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Action Bar */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e5e7eb', padding: '12px 24px', zIndex: 30, boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {error && <span style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle style={{ width: '12px', height: '12px' }} /> {error}</span>}
                        {saveSuccess && <span style={{ fontSize: '12px', color: '#16a34a', background: '#f0fdf4', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle style={{ width: '12px', height: '12px' }} /> Saved</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            onClick={() => { setPreviewLang(selectedLang); setShowPreview(true); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '13px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', color: '#374151' }}
                        >
                            <Eye style={{ width: '14px', height: '14px' }} /> Preview
                        </button>
                        <button
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending || !isEmailValid}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: saveMutation.isPending || !isEmailValid ? 0.6 : 1, boxShadow: '0 1px 3px rgba(79, 70, 229, 0.3)' }}
                        >
                            <Save style={{ width: '14px', height: '14px' }} /> Save
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {showPreview && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowPreview(false)}>
                    <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '700px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Notice Preview</h3>
                                <select
                                    value={previewLang}
                                    onChange={(e) => setPreviewLang(e.target.value)}
                                    style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    {sortedLanguages.map(lang => (
                                        <option key={lang} value={lang}>{languages?.find(l => l.code === lang)?.name || lang}</option>
                                    ))}
                                </select>
                            </div>
                            <button onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                                <X style={{ width: '20px', height: '20px' }} />
                            </button>
                        </div>
                        <div style={{ padding: '24px', overflowY: 'auto', background: '#f3f4f6', display: 'flex', justifyContent: 'center' }}>
                            <NoticePreview translation={previewTranslation} dpoEmail={dpoEmail} showLanguageBadge={true} />
                        </div>
                        <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowPreview(false)} style={{ padding: '6px 14px', fontSize: '13px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
