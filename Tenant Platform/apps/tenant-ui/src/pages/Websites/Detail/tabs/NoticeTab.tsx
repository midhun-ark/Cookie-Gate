import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, AlertCircle, CheckCircle, Globe, Building2, FileText, Shield } from 'lucide-react';
import { noticeApi } from '@/api';
import { useLanguages } from '@/hooks';
import { getErrorMessage } from '@/api/client';

export function NoticeTab({ websiteId, onSave }: { websiteId: string; onSave?: () => void }) {
    const queryClient = useQueryClient();
    const [selectedLang, setSelectedLang] = useState('en');
    const [dpoEmail, setDpoEmail] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState('');


    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = !dpoEmail || dpoEmail.trim() === '' || emailRegex.test(dpoEmail);

    const { data: notice, isLoading: isLoadingNotice } = useQuery({
        queryKey: ['notice', websiteId],
        queryFn: () => noticeApi.get(websiteId),
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
            onSave?.();
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



    const currentData = formData[selectedLang] || defaultForm;

    if (isLoadingNotice) {
        return <div className="p-8 text-center flex justify-center"><div className="spinner w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    const activeCodes = languages?.filter(l => l.isActive).map(l => l.code) || [];
    const distinctCodes = Array.from(new Set(['en', ...activeCodes, ...Object.keys(formData)]));
    const sortedLanguages = distinctCodes.sort((a, b) => a === 'en' ? -1 : b === 'en' ? 1 : 0);

    // Validation for mandatory fields
    const enData = formData['en'] || defaultForm;
    const isFormValid = isEmailValid && dpoEmail.trim() !== '' && enData.policyUrl.trim() !== '' && enData.rightsDescription.trim() !== '' && enData.withdrawalInstruction.trim() !== '' && enData.complaintInstruction.trim() !== '';

    return (
        <div style={{ paddingBottom: '40px' }}>
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
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>DPO/Grievance Officer Email <span style={{ color: '#ef4444' }}>*</span></label>
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
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Cookie Policy Link <span style={{ color: '#ef4444' }}>*</span></label>
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
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>User Rights Description <span style={{ color: '#ef4444' }}>*</span></label>
                                <textarea
                                    value={currentData.rightsDescription}
                                    onChange={(e) => handleInputChange('rightsDescription', e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', minHeight: '70px', resize: 'vertical', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Withdrawal Instructions <span style={{ color: '#ef4444' }}>*</span></label>
                                <textarea
                                    value={currentData.withdrawalInstruction}
                                    onChange={(e) => handleInputChange('withdrawalInstruction', e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', minHeight: '70px', resize: 'vertical', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Complaint Instructions <span style={{ color: '#ef4444' }}>*</span></label>
                                <textarea
                                    value={currentData.complaintInstruction}
                                    onChange={(e) => handleInputChange('complaintInstruction', e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', minHeight: '70px', resize: 'vertical', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* SAVE BUTTON and Messages */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                        {error && <span style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle style={{ width: '12px', height: '12px' }} /> {error}</span>}
                        {saveSuccess && <span style={{ fontSize: '12px', color: '#16a34a', background: '#f0fdf4', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle style={{ width: '12px', height: '12px' }} /> Saved</span>}
                        <button
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending || !isFormValid}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 24px', fontSize: '13px', fontWeight: 600, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: saveMutation.isPending || !isFormValid ? 0.6 : 1, boxShadow: '0 1px 3px rgba(79, 70, 229, 0.3)' }}
                        >
                            <Save style={{ width: '14px', height: '14px' }} /> Save Changes
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
