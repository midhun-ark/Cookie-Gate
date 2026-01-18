import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Languages, CheckCircle, AlertCircle, Loader2, Globe, Sparkles, ChevronDown, Eye, Monitor } from 'lucide-react';
import { languageApi, bannerApi } from '@/api';
import { api } from '@/api/client';
import type { SupportedLanguage } from '@/types';

interface TranslationResult {
    notice: { translated: boolean; languages: string[] };
    purposes: { translated: number; languages: string[] };
    banner: { translated: boolean; languages: string[] };
}

interface BannerTranslation {
    languageCode: string;
    headlineText: string;
    descriptionText: string;
    acceptButtonText: string;
    rejectButtonText: string;
    preferencesButtonText: string;
}

export function TranslationsTab({ websiteId }: { websiteId: string }) {
    const queryClient = useQueryClient();
    const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
    const [success, setSuccess] = useState<TranslationResult | null>(null);
    const [error, setError] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const [previewLang, setPreviewLang] = useState('en');

    const { data: languages = [], isLoading: loadingLanguages } = useQuery({
        queryKey: ['languages'],
        queryFn: languageApi.list
    });

    const { data: bannerTranslations = [] } = useQuery({
        queryKey: ['bannerTranslations', websiteId],
        queryFn: () => bannerApi.getTranslations(websiteId)
    });

    // Select all languages by default when languages are loaded
    useEffect(() => {
        if (languages.length > 0 && selectedLangs.length === 0) {
            const allCodes = languages.filter((l: SupportedLanguage) => l.code !== 'en').map((l: SupportedLanguage) => l.code);
            setSelectedLangs(allCodes);
        }
    }, [languages]);

    const translateMutation = useMutation({
        mutationFn: async () => {
            const response = await api.post<{ success: boolean; data: TranslationResult }>(
                `/websites/${websiteId}/translate-all`,
                { targetLangs: selectedLangs }
            );
            return response.data.data;
        },
        onSuccess: (data) => {
            setSuccess(data);
            setError('');
            queryClient.invalidateQueries({ queryKey: ['notice', websiteId] });
            queryClient.invalidateQueries({ queryKey: ['purposes', websiteId] });
            queryClient.invalidateQueries({ queryKey: ['bannerTranslations', websiteId] });
        },
        onError: (err: any) => {
            setError(err.response?.data?.message || err.message || 'Translation failed');
            setSuccess(null);
        }
    });

    const toggleLanguage = (code: string) => {
        if (code === 'en') return;
        setSelectedLangs(prev => prev.includes(code) ? prev.filter(l => l !== code) : [...prev, code]);
        setSuccess(null);
    };

    const selectAll = () => {
        const allCodes = languages.filter((l: SupportedLanguage) => l.code !== 'en').map((l: SupportedLanguage) => l.code);
        setSelectedLangs(allCodes);
        setSuccess(null);
    };

    const clearSelection = () => {
        setSelectedLangs([]);
        setSuccess(null);
    };

    if (loadingLanguages) {
        return <div style={{ padding: '32px', textAlign: 'center' }}><div className="spinner"></div></div>;
    }

    const availableLanguages = languages.filter((l: SupportedLanguage) => l.code !== 'en');
    const currentPreviewTranslation = bannerTranslations.find((t: BannerTranslation) => t.languageCode === previewLang)
        || bannerTranslations.find((t: BannerTranslation) => t.languageCode === 'en')
        || { headlineText: 'Cookie Consent', descriptionText: 'We use cookies to enhance your experience.', acceptButtonText: 'Accept All', rejectButtonText: 'Reject All', preferencesButtonText: 'Preferences' };
    const translatedLangs = bannerTranslations.map((t: BannerTranslation) => t.languageCode);
    const previewLanguages = languages.filter((l: SupportedLanguage) => translatedLangs.includes(l.code));

    return (
        <div style={{ maxWidth: '700px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', padding: '10px', borderRadius: '10px' }}>
                        <Languages style={{ width: '20px', height: '20px', color: '#fff' }} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>Translations</h2>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Generate translations for all content at once.</p>
                    </div>
                </div>
            </div>

            {/* Language Selection Card */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <button onClick={() => setIsExpanded(!isExpanded)} style={{ width: '100%', padding: '16px 20px', background: '#f9fafb', border: 'none', borderBottom: isExpanded ? '1px solid #f3f4f6' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Globe style={{ width: '16px', height: '16px', color: '#4f46e5' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Target Languages</span>
                        <span style={{ fontSize: '12px', color: '#6b7280', background: '#e5e7eb', padding: '2px 8px', borderRadius: '10px' }}>{selectedLangs.length} selected</span>
                    </div>
                    <ChevronDown style={{ width: '16px', height: '16px', color: '#6b7280', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </button>

                {isExpanded && (
                    <div style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '12px' }}>
                            <button onClick={selectAll} style={{ fontSize: '11px', color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Select All</button>
                            <button onClick={clearSelection} style={{ fontSize: '11px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Clear</button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f0fdf4', borderRadius: '6px', marginBottom: '16px' }}>
                            <CheckCircle style={{ width: '14px', height: '14px', color: '#16a34a' }} />
                            <span style={{ fontSize: '12px', color: '#16a34a' }}>English is the source language.</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                            {availableLanguages.map((lang: SupportedLanguage) => {
                                const isSelected = selectedLangs.includes(lang.code);
                                return (
                                    <button key={lang.code} onClick={() => toggleLanguage(lang.code)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: isSelected ? '#eef2ff' : '#fff', border: `1px solid ${isSelected ? '#4f46e5' : '#e5e7eb'}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}>
                                        <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: `2px solid ${isSelected ? '#4f46e5' : '#d1d5db'}`, background: isSelected ? '#4f46e5' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {isSelected && <CheckCircle style={{ width: '12px', height: '12px', color: '#fff' }} />}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{lang.name}</div>
                                            <div style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'monospace' }}>{lang.code}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div style={{ padding: '16px 20px', borderTop: '1px solid #f3f4f6', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{selectedLangs.length} language{selectedLangs.length !== 1 ? 's' : ''} selected</span>
                    <button onClick={() => translateMutation.mutate()} disabled={selectedLangs.length === 0 || translateMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: selectedLangs.length === 0 || translateMutation.isPending ? 0.6 : 1, boxShadow: '0 2px 4px rgba(79, 70, 229, 0.3)' }}>
                        {translateMutation.isPending ? <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />Translating...</> : <><Sparkles style={{ width: '16px', height: '16px' }} />Generate Translations</>}
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ marginTop: '16px', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                    <span style={{ fontSize: '13px', color: '#dc2626' }}>{error}</span>
                </div>
            )}

            {success && (
                <div style={{ marginTop: '16px', padding: '16px 20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <CheckCircle style={{ width: '18px', height: '18px', color: '#16a34a' }} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#16a34a' }}>Translation Complete!</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#374151' }}>
                        Notice: {success.notice.translated ? `${success.notice.languages.length} languages` : 'Not translated'} •
                        Purposes: {success.purposes.translated > 0 ? `${success.purposes.translated} translated` : 'None'} •
                        Banner: {success.banner.translated ? `${success.banner.languages.length} languages` : 'Not translated'}
                    </div>
                </div>
            )}

            {/* Banner Preview Section */}
            <div style={{ marginTop: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', padding: '8px', borderRadius: '8px' }}>
                            <Eye style={{ width: '16px', height: '16px', color: '#fff' }} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>Banner Preview</h3>
                            <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>How users will see the consent banner</p>
                        </div>
                    </div>
                    <select value={previewLang} onChange={(e) => setPreviewLang(e.target.value)} style={{ padding: '8px 32px 8px 12px', fontSize: '13px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
                        {previewLanguages.length > 0 ? previewLanguages.map((lang: SupportedLanguage) => <option key={lang.code} value={lang.code}>{lang.name}</option>) : <option value="en">English</option>}
                    </select>
                </div>

                <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', borderRadius: '12px', padding: '20px', position: 'relative', minHeight: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308' }} />
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} />
                        <div style={{ flex: 1, marginLeft: '12px', background: '#475569', borderRadius: '4px', padding: '6px 12px' }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>https://yourwebsite.com</span>
                        </div>
                    </div>
                    <div style={{ background: '#64748b', borderRadius: '6px', height: '40px', marginBottom: '12px', opacity: 0.3 }} />
                    <div style={{ background: '#64748b', borderRadius: '6px', height: '24px', width: '70%', marginBottom: '8px', opacity: 0.2 }} />
                    <div style={{ background: '#64748b', borderRadius: '6px', height: '24px', width: '50%', marginBottom: '50px', opacity: 0.2 }} />

                    <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: '#fff', borderRadius: '0 0 12px 12px', padding: '16px 20px', boxShadow: '0 -4px 20px rgba(0,0,0,0.15)' }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827', marginBottom: '6px' }}>{currentPreviewTranslation.headlineText}</div>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', lineHeight: 1.5 }}>{currentPreviewTranslation.descriptionText}</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button style={{ flex: 1, padding: '10px 16px', fontSize: '12px', fontWeight: 600, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px' }}>{currentPreviewTranslation.acceptButtonText}</button>
                            <button style={{ flex: 1, padding: '10px 16px', fontSize: '12px', fontWeight: 600, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px' }}>{currentPreviewTranslation.rejectButtonText}</button>
                            <button style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, background: 'transparent', color: '#4f46e5', border: '1px solid #4f46e5', borderRadius: '6px' }}>{currentPreviewTranslation.preferencesButtonText}</button>
                        </div>
                    </div>
                </div>

                <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '12px', textAlign: 'center' }}>
                    <Monitor style={{ width: '12px', height: '12px', display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                    Preview of the banner after installing the script on your website
                </p>
            </div>
        </div>
    );
}
