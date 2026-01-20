import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Languages, CheckCircle, AlertCircle, Loader2, Globe, Sparkles, ChevronDown, Eye, Monitor } from 'lucide-react';
import { languageApi, bannerApi, noticeApi, purposeApi, websiteApi } from '@/api';
import { api } from '@/api/client';
import type { SupportedLanguage, Purpose } from '@/types';

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

export function TranslationsTab({ versionId, websiteId, onSave }: { versionId: string; websiteId: string; onSave?: () => void }) {
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
        queryKey: ['bannerTranslations', versionId],
        queryFn: () => bannerApi.getTranslations(versionId)
    });

    // Fetch website data for domain
    const { data: website } = useQuery({
        queryKey: ['website', websiteId],
        queryFn: () => websiteApi.get(websiteId)
    });

    // Fetch notice data for Settings Panel Preview
    const { data: notice } = useQuery({
        queryKey: ['notice', versionId],
        queryFn: () => noticeApi.get(versionId)
    });

    // Fetch purposes data for Settings Panel Preview
    const { data: purposes = [] } = useQuery({
        queryKey: ['purposes', versionId],
        queryFn: () => purposeApi.list(versionId)
    });

    // Fetch banner config for colors
    const { data: bannerConfig } = useQuery({
        queryKey: ['banner', versionId],
        queryFn: () => bannerApi.get(versionId)
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
            queryClient.invalidateQueries({ queryKey: ['notice', versionId] });
            queryClient.invalidateQueries({ queryKey: ['purposes', versionId] });
            queryClient.invalidateQueries({ queryKey: ['bannerTranslations', versionId] });
            onSave?.();
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

                <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', borderRadius: '12px', padding: '20px', position: 'relative', minHeight: bannerConfig?.layout === 'modal' ? '280px' : '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308' }} />
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} />
                        <div style={{ flex: 1, marginLeft: '12px', background: '#475569', borderRadius: '4px', padding: '6px 12px' }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>https://{website?.domain || 'yourwebsite.com'}</span>
                        </div>
                    </div>
                    {/* Page content placeholder - adjusts based on position */}
                    {bannerConfig?.position === 'top' && <div style={{ height: '80px' }} />}
                    <div style={{ background: '#64748b', borderRadius: '6px', height: '40px', marginBottom: '12px', opacity: 0.3 }} />
                    <div style={{ background: '#64748b', borderRadius: '6px', height: '24px', width: '70%', marginBottom: '8px', opacity: 0.2 }} />
                    <div style={{ background: '#64748b', borderRadius: '6px', height: '24px', width: '50%', marginBottom: bannerConfig?.position === 'bottom' ? '80px' : '20px', opacity: 0.2 }} />
                    {bannerConfig?.position === 'center' && <div style={{ height: '20px' }} />}

                    {/* Banner/Modal/Popup based on layout and position */}
                    {(() => {
                        const pos = bannerConfig?.position || 'bottom';
                        const layout = bannerConfig?.layout || 'banner';
                        const isPopup = layout === 'popup';
                        const isModal = layout === 'modal';
                        const isCenter = pos === 'center';
                        const isTop = pos === 'top';

                        const positionStyles: React.CSSProperties = {
                            position: 'absolute',
                            left: isPopup ? 'auto' : (isCenter && isModal ? '50%' : '0'),
                            right: isPopup ? '10px' : (isCenter && isModal ? 'auto' : '0'),
                            top: isTop ? '50px' : (isCenter ? '50%' : 'auto'),
                            bottom: (!isTop && !isCenter) ? '0' : 'auto',
                            transform: isCenter ? (isModal ? 'translate(-50%, -50%)' : 'translateY(-50%)') : 'none',
                            width: isPopup ? '260px' : (isCenter && isModal ? '85%' : 'auto'),
                            maxWidth: isModal ? '360px' : 'none',
                            background: bannerConfig?.backgroundColor || '#fff',
                            borderRadius: isModal || isPopup ? '12px' : (isTop ? '0 0 12px 12px' : '12px 12px 0 0'),
                            padding: '14px 18px',
                            boxShadow: isTop ? '0 4px 16px rgba(0,0,0,0.12)' : '0 -4px 16px rgba(0,0,0,0.12)',
                            zIndex: 10
                        };

                        return (
                            <div style={positionStyles}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <div style={{ fontWeight: 600, fontSize: '13px', color: bannerConfig?.textColor || '#111827' }}>{currentPreviewTranslation.headlineText}</div>
                                    <span style={{ fontSize: '10px', color: bannerConfig?.primaryColor || '#4f46e5', background: (bannerConfig?.primaryColor || '#4f46e5') + '15', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <Globe style={{ width: '10px', height: '10px' }} />
                                        {previewLanguages.find((l: SupportedLanguage) => l.code === previewLang)?.name || 'English'}
                                    </span>
                                </div>
                                <p style={{ fontSize: '11px', color: bannerConfig?.textColor ? bannerConfig.textColor + 'cc' : '#6b7280', marginBottom: '10px', lineHeight: 1.4 }}>{currentPreviewTranslation.descriptionText}</p>
                                <div style={{ display: 'flex', gap: '6px', flexDirection: isPopup ? 'column' : 'row' }}>
                                    <button style={{ flex: isPopup ? 'none' : 1, padding: '8px 12px', fontSize: '11px', fontWeight: 600, background: bannerConfig?.acceptButtonColor || '#4f46e5', color: '#fff', border: 'none', borderRadius: '5px' }}>{currentPreviewTranslation.acceptButtonText}</button>
                                    <button style={{ flex: isPopup ? 'none' : 1, padding: '8px 12px', fontSize: '11px', fontWeight: 600, background: bannerConfig?.rejectButtonColor || '#4f46e5', color: '#fff', border: 'none', borderRadius: '5px' }}>{currentPreviewTranslation.rejectButtonText}</button>
                                    <button style={{ flex: 'none', padding: '8px 12px', fontSize: '11px', fontWeight: 500, background: 'transparent', color: bannerConfig?.primaryColor || '#4f46e5', border: '1px solid ' + (bannerConfig?.primaryColor || '#4f46e5'), borderRadius: '5px' }}>{currentPreviewTranslation.preferencesButtonText}</button>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '12px', textAlign: 'center' }}>
                    <Monitor style={{ width: '12px', height: '12px', display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                    Preview of the banner after installing the script on your website
                </p>
            </div>

            {/* Settings Panel Preview Section */}
            <div style={{ marginTop: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '8px', borderRadius: '8px' }}>
                            <Languages style={{ width: '16px', height: '16px', color: '#fff' }} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>Settings Panel Preview</h3>
                            <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>How the preferences modal will appear</p>
                        </div>
                    </div>
                </div>

                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    {/* Modal Header */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.3em' }}>🍪</span>
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>{currentPreviewTranslation.headlineText}</h4>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '12px', color: '#4f46e5', background: '#eef2ff', padding: '4px 10px', borderRadius: '6px' }}>
                                {previewLanguages.find((l: SupportedLanguage) => l.code === previewLang)?.name || 'English'}
                            </span>
                            <span style={{ fontSize: '20px', color: '#9ca3af', cursor: 'pointer' }}>×</span>
                        </div>
                    </div>

                    {/* Modal Content */}
                    <div style={{ padding: '16px 20px' }}>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px', lineHeight: 1.5 }}>
                            {currentPreviewTranslation.descriptionText}
                        </p>

                        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af', marginBottom: '12px' }}>
                            CONSENT PREFERENCES
                        </div>

                        {/* Dynamic Purpose Cards */}
                        {purposes.length > 0 ? purposes.map((purpose: Purpose, index: number) => {
                            const purposeTrans = purpose.translations?.find((t: any) => t.languageCode === previewLang)
                                || purpose.translations?.find((t: any) => t.languageCode === 'en')
                                || purpose.translations?.[0];
                            const purposeIcons: Record<string, string> = { 'analytics': '📊', 'marketing': '📢', 'social': '🔗', 'functional': '⚙️', 'essential': '🔒' };
                            const icon = purposeIcons[purpose.tag] || '🍪';
                            return (
                                <div key={purpose.id} style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px', marginBottom: '8px', border: '1px solid #f3f4f6' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', color: '#111827' }}>
                                                <span>{icon}</span> {purposeTrans?.name || purpose.tag}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{purposeTrans?.description || ''}</div>
                                        </div>
                                        <div style={{ width: '40px', height: '22px', borderRadius: '11px', background: index === 0 ? '#4f46e5' : '#d1d5db' }}></div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic', padding: '12px', textAlign: 'center' }}>No purposes configured yet.</div>
                        )}

                        {/* Organization Contact & Rights Grid - from Notice */}
                        {(notice?.dpoEmail || notice?.translations?.some((t: any) => t.rightsDescription)) && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                                {notice?.dpoEmail && (
                                    <div>
                                        <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span>📧</span> ORGANIZATION CONTACT
                                        </div>
                                        <div style={{ background: 'rgba(59, 130, 246, 0.08)', borderRadius: '6px', padding: '10px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 500, color: '#374151' }}>DPO/Grievance Officer:</div>
                                            <div style={{ fontSize: '11px', color: '#2563eb' }}>{notice.dpoEmail}</div>
                                        </div>
                                    </div>
                                )}
                                {(() => {
                                    const noticeTrans = notice?.translations?.find((t: any) => t.languageCode === previewLang)
                                        || notice?.translations?.find((t: any) => t.languageCode === 'en');
                                    return noticeTrans?.rightsDescription ? (
                                        <div>
                                            <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span>⚖️</span> YOUR RIGHTS
                                            </div>
                                            <div style={{ background: '#f9fafb', borderRadius: '6px', padding: '10px', border: '1px solid #f3f4f6' }}>
                                                <div style={{ fontSize: '11px', color: '#374151', lineHeight: 1.4 }}>{noticeTrans.rightsDescription}</div>
                                            </div>
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                        )}
                    </div>

                    {/* Modal Footer - Using banner colors and translations */}
                    <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', background: '#f9fafb', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 500, background: bannerConfig?.rejectButtonColor || '#dc2626', color: '#fff', border: 'none', borderRadius: '6px' }}>{currentPreviewTranslation.rejectButtonText}</button>
                        <button style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 600, background: bannerConfig?.acceptButtonColor || '#16a34a', color: '#fff', border: 'none', borderRadius: '6px' }}>{currentPreviewTranslation.acceptButtonText?.replace('Accept All', 'Save Preferences') || 'Save Preferences'}</button>
                    </div>
                </div>
            </div>

            <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '12px', textAlign: 'center' }}>
                <Languages style={{ width: '12px', height: '12px', display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Preview of the settings panel when users click "{currentPreviewTranslation.preferencesButtonText}"
            </p>
        </div>
    );
}
