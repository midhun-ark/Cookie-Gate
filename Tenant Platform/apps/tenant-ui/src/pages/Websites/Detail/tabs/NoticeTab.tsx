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
    const [isBatchTranslating, setIsBatchTranslating] = useState(false);
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

    // Form state
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

    // Initialize form data when notice loads
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
                // These are now managed via "Purposes" tab, so we send empty or existing?
                // For now, sending empty arrays to clear them from notice_translations if they existed.
                // The actual display will come from Purposes table.
                dataCategories: [],
                processingPurposes: [],
                rightsDescription: data.rightsDescription,
                withdrawalInstruction: data.withdrawalInstruction,
                complaintInstruction: data.complaintInstruction
            }));

            if (notice) {
                await noticeApi.updateTranslations(notice.id, translations, dpoEmail);
            } else {
                await noticeApi.create(websiteId, {
                    dpoEmail,
                    translations
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notice', websiteId] });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        },
        onError: (err) => {
            setError(getErrorMessage(err));
        }
    });

    const handleInputChange = (field: keyof NoticeFormData, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [selectedLang]: {
                ...prev[selectedLang] || defaultForm,
                [field]: value,
            },
        }));
        setSaveSuccess(false);
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

    const handleBatchTranslate = async () => {
        if (!languages) return;
        setIsBatchTranslating(true);
        setError('');
        try {
            // Translate to all supported languages that are not 'en'
            // Or just all languages not currently in formData? 
            // Better to translate all active languages except En.
            const targetLangs = languages
                .filter(l => l.code !== 'en' && l.isActive)
                .map(l => l.code);

            if (targetLangs.length === 0) {
                setError("No other languages available to translate.");
                return;
            }

            const results = await noticeApi.autoTranslateBatch(websiteId, targetLangs);

            // Update local state
            setFormData(prev => {
                const next = { ...prev };
                results.forEach(t => {
                    next[t.languageCode] = {
                        title: t.title,
                        description: t.description,
                        policyUrl: t.policyUrl || '',
                        rightsDescription: t.rightsDescription || '',
                        withdrawalInstruction: t.withdrawalInstruction || '',
                        complaintInstruction: t.complaintInstruction || '',
                    };
                });
                return next;
            });

            queryClient.invalidateQueries({ queryKey: ['notice', websiteId] });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsBatchTranslating(false);
        }
    };

    const currentData = formData[selectedLang] || defaultForm;

    // Map current form data (or default) for the PREVIEW language
    const previewData = formData[previewLang] || defaultForm;
    const previewTranslation: Partial<NoticeTranslation> = {
        languageCode: previewLang,
        title: previewData.title,
        description: previewData.description,
        policyUrl: previewData.policyUrl,
        dataCategories: [],
        processingPurposes: purposes
            ? purposes
                .filter(p => p.status === 'ACTIVE')
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map(p => {
                    // Try to find translation for previewLang, fall back to EN, then to first available
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

    // Use all active languages for the dropdown, ensuring 'en' is first
    const activeCodes = languages?.filter(l => l.isActive).map(l => l.code) || [];
    const distinctCodes = Array.from(new Set(['en', ...activeCodes, ...Object.keys(formData)]));
    const sortedLanguages = distinctCodes.sort((a, b) => a === 'en' ? -1 : b === 'en' ? 1 : 0);

    return (
        <div className="h-full max-w-5xl mx-auto pb-24 relative">
            {/* Top Language Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 sticky top-0 z-20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-700">
                        <Globe className="w-5 h-5 text-indigo-600" />
                        <span className="font-semibold text-sm">Editing Language:</span>
                    </div>

                    <div className="relative group">
                        <select
                            value={selectedLang}
                            onChange={(e) => setSelectedLang(e.target.value)}
                            className="form-select pl-4 pr-10 py-2 rounded-lg border-gray-300 bg-gray-50 hover:bg-white transition-colors cursor-pointer text-sm font-medium min-w-[140px] focus:ring-2 focus:ring-indigo-500"
                        >
                            {sortedLanguages.map(lang => (
                                <option key={lang} value={lang}>
                                    {languages?.find(l => l.code === lang)?.name || lang}
                                </option>
                            ))}
                        </select>
                    </div>

                    {Object.keys(formData).length < (languages?.filter(l => l.isActive).length || 0) && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                            {Object.keys(formData).length} / {languages?.filter(l => l.isActive).length} Active
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Auto-Translate Action */}
                    {selectedLang !== 'en' && (
                        <button
                            className="btn btn-secondary btn-sm flex items-center gap-2"
                            onClick={handleAutoTranslate}
                            disabled={isTranslating}
                        >
                            <Wand2 size={14} className={isTranslating ? "animate-spin" : ""} />
                            {isTranslating ? 'Translating...' : `Auto-Fill from English`}
                        </button>
                    )}

                    {/* Batch Add Missing */}
                    {notice && (!notice.translations || notice.translations.length < (languages?.filter(l => l.isActive).length || 0)) && (
                        <button
                            onClick={handleBatchTranslate}
                            disabled={isBatchTranslating}
                            className="btn btn-secondary btn-sm flex items-center gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        >
                            {isBatchTranslating ? (
                                <div className="spinner w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Globe size={14} />
                            )}
                            <span className="text-xs font-medium">Add Missing Languages</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-6">

                {/* 1. Organization Contact */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900">Organization Contact</h3>
                            <p className="text-xs text-gray-500">Contact details for DPDPA compliance queries.</p>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="max-w-xl">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">DPO / Grievance Officer Email <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={dpoEmail}
                                    onChange={e => setDpoEmail(e.target.value)}
                                    className="form-input w-full pl-4 pr-4 py-2.5 rounded-lg border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                                    placeholder="privacy@yourcompany.com"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                                <AlertCircle size={12} />
                                Required for legal compliance.
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Notice Content */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                            <FileText className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900">Notice Content ({selectedLang.toUpperCase()})</h3>
                            <p className="text-xs text-gray-500">Core content of your privacy notice.</p>
                        </div>
                    </div>
                    <div className="p-6 grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Notice Title <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                className="form-input w-full text-lg font-medium"
                                value={currentData.title}
                                onChange={(e) => handleInputChange('title', e.target.value)}
                                placeholder="e.g. Privacy Notice"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Main Description <span className="text-red-500">*</span></label>
                            <textarea
                                className="form-textarea w-full"
                                rows={4}
                                value={currentData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                placeholder="Explain how you use cookies and data..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Policy Link</label>
                            <div className="flex rounded-md shadow-sm">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">https://</span>
                                <input
                                    type="text"
                                    className="form-input w-full rounded-none rounded-r-md"
                                    value={currentData.policyUrl?.replace(/^https?:\/\//, '') || ''}
                                    onChange={(e) => handleInputChange('policyUrl', 'https://' + e.target.value.replace(/^https?:\/\//, ''))}
                                    placeholder="example.com/privacy-policy"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Rights & Redressal */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-lg">
                            <Shield className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900">User Rights & Redressal ({selectedLang.toUpperCase()})</h3>
                            <p className="text-xs text-gray-500">Mandatory DPDPA disclosures regarding user rights.</p>
                        </div>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">User Rights Description</label>
                            <textarea
                                className="form-input w-full min-h-[80px]"
                                value={currentData.rightsDescription}
                                onChange={(e) => handleInputChange('rightsDescription', e.target.value)}
                            />
                            <p className="text-xs text-gray-400 mt-1">Explain rights to access, correction, erasure, and grievance redressal.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Withdrawal Instructions</label>
                                <textarea
                                    className="form-input w-full min-h-[100px]"
                                    value={currentData.withdrawalInstruction}
                                    onChange={(e) => handleInputChange('withdrawalInstruction', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Complaint Instructions</label>
                                <textarea
                                    className="form-input w-full min-h-[100px]"
                                    value={currentData.complaintInstruction}
                                    onChange={(e) => handleInputChange('complaintInstruction', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-8 py-4 z-30 shadow-lg-up">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {error && <span className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100 flex items-center gap-1"><AlertCircle size={14} /> {error}</span>}
                        {saveSuccess && <span className="text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-100 flex items-center gap-1"><CheckCircle size={14} /> Saved successfully</span>}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            className="btn btn-white border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => {
                                setPreviewLang(selectedLang);
                                setShowPreview(true);
                            }}
                        >
                            <Eye size={18} />
                            Preview
                        </button>
                        <button
                            className="btn btn-primary flex items-center gap-2 shadow-lg shadow-indigo-200 px-6"
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending}
                        >
                            {saveMutation.isPending ? <div className="spinner w-4 h-4 border-2 border-white"></div> : <Save size={18} />}
                            Save Configuration
                        </button>
                    </div>
                </div>
            </div>

            {showPreview && (
                <div className="modal-overlay fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
                    <div className="modal bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="modal-header px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div className="flex items-center gap-4">
                                <h3 className="modal-title font-bold text-lg text-gray-900">Notice Preview</h3>
                                <select
                                    value={previewLang}
                                    onChange={(e) => setPreviewLang(e.target.value)}
                                    className="form-select pl-3 pr-8 py-1.5 rounded-lg border-gray-300 bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
                                    onClick={e => e.stopPropagation()}
                                >
                                    {sortedLanguages.map(lang => (
                                        <option key={lang} value={lang}>
                                            {languages?.find(l => l.code === lang)?.name || lang}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowPreview(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body p-8 overflow-y-auto bg-gray-100/50 flex justify-center">
                            <NoticePreview
                                translation={previewTranslation}
                                dpoEmail={dpoEmail}
                                showLanguageBadge={true}
                            />
                        </div>
                        <div className="modal-footer px-6 py-4 border-t border-gray-100 flex justify-end">
                            <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>Close Preview</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
