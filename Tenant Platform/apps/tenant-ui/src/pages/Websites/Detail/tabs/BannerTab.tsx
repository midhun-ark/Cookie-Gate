import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, RotateCcw, Monitor, Smartphone, CheckCircle, AlertCircle, Globe } from 'lucide-react';
import { bannerApi, languageApi } from '@/api';
import { getErrorMessage } from '@/api/client';
import type { BannerCustomization, SupportedLanguage } from '@/types';

interface BannerTranslation {
    languageCode: string;
    headlineText: string;
    descriptionText: string;
    acceptButtonText: string;
    rejectButtonText: string;
    preferencesButtonText: string;
}

const DEFAULT_BANNER: BannerCustomization = {
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    acceptButtonColor: '#000000',
    rejectButtonColor: '#f3f4f6',
    acceptButtonText: 'Accept All',
    rejectButtonText: 'Reject All',
    customizeButtonText: 'Customize',
    position: 'bottom',
    layout: 'banner',
    fontFamily: 'Inter, sans-serif'
};

const DEFAULT_TRANSLATION: Omit<BannerTranslation, 'languageCode'> = {
    headlineText: 'We use cookies',
    descriptionText: 'This website uses cookies to ensure you get the best experience.',
    acceptButtonText: 'Accept All',
    rejectButtonText: 'Reject All',
    preferencesButtonText: 'Settings',
};

export function BannerTab({ websiteId }: { websiteId: string }) {
    const queryClient = useQueryClient();
    const [config, setConfig] = useState<BannerCustomization>(DEFAULT_BANNER);
    const [translations, setTranslations] = useState<BannerTranslation[]>([]);
    const [selectedLang, setSelectedLang] = useState('en');
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [isDirty, setIsDirty] = useState(false);
    const [isTextDirty, setIsTextDirty] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState('');

    // Fetch styles
    const { data: serverConfig, isLoading: loadingStyles } = useQuery({
        queryKey: ['banner', websiteId],
        queryFn: async () => {
            try {
                return await bannerApi.get(websiteId);
            } catch (err: any) {
                if (err.response?.status === 404) return DEFAULT_BANNER;
                throw err;
            }
        }
    });

    // Fetch translations
    const { data: serverTranslations, isLoading: loadingTranslations } = useQuery({
        queryKey: ['bannerTranslations', websiteId],
        queryFn: () => bannerApi.getTranslations(websiteId)
    });

    // Fetch languages
    const { data: languages = [] } = useQuery({
        queryKey: ['languages'],
        queryFn: languageApi.list
    });

    useEffect(() => {
        if (serverConfig) setConfig(serverConfig);
    }, [serverConfig]);

    useEffect(() => {
        if (serverTranslations) {
            // Ensure English is always present
            let trans = [...serverTranslations];
            if (!trans.find(t => t.languageCode === 'en')) {
                trans = [{ languageCode: 'en', ...DEFAULT_TRANSLATION }, ...trans];
            }
            setTranslations(trans);
        }
    }, [serverTranslations]);

    // Save styles mutation
    const saveStyleMutation = useMutation({
        mutationFn: () => bannerApi.save(websiteId, config),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['banner', websiteId] });
            setIsDirty(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        },
        onError: (err) => setError(getErrorMessage(err)),
    });

    // Save translations mutation
    const saveTranslationMutation = useMutation({
        mutationFn: () => bannerApi.saveTranslations(websiteId, translations),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bannerTranslations', websiteId] });
            setIsTextDirty(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        },
        onError: (err) => setError(getErrorMessage(err)),
    });

    const resetMutation = useMutation({
        mutationFn: () => bannerApi.reset(websiteId),
        onSuccess: (data) => { setConfig(data); setIsDirty(false); }
    });

    const handleStyleChange = (key: keyof BannerCustomization, value: string) => {
        setConfig(prev => ({ ...prev, [key]: value }));
        setIsDirty(true);
        setSaveSuccess(false);
    };

    const handleTextChange = (key: keyof Omit<BannerTranslation, 'languageCode'>, value: string) => {
        setTranslations(prev => {
            const idx = prev.findIndex(t => t.languageCode === selectedLang);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], [key]: value };
                return updated;
            } else {
                return [...prev, { ...DEFAULT_TRANSLATION, languageCode: selectedLang, [key]: value }];
            }
        });
        setIsTextDirty(true);
        setSaveSuccess(false);
    };

    const getCurrentTranslation = (): BannerTranslation => {
        return translations.find(t => t.languageCode === selectedLang) || {
            languageCode: selectedLang,
            ...DEFAULT_TRANSLATION
        };
    };

    const addLanguage = (code: string) => {
        if (!translations.find(t => t.languageCode === code)) {
            setTranslations(prev => [...prev, { languageCode: code, ...DEFAULT_TRANSLATION }]);
            setIsTextDirty(true);
        }
        setSelectedLang(code);
    };

    const isLoading = loadingStyles || loadingTranslations;
    if (isLoading) return <div style={{ padding: '32px', textAlign: 'center' }}><div className="spinner"></div></div>;

    const currentText = getCurrentTranslation();
    const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' };
    const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '6px' };

    return (
        <div style={{ paddingBottom: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>Banner Settings</h2>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Customize appearance and text for each language.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {error && <span style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle style={{ width: '12px', height: '12px' }} /> {error}</span>}
                    {saveSuccess && <span style={{ fontSize: '12px', color: '#16a34a', background: '#f0fdf4', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle style={{ width: '12px', height: '12px' }} /> Saved</span>}
                </div>
            </div>

            {/* Two Column Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px' }}>

                {/* LEFT: Editor Card */}
                <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>

                    {/* Styles Section */}
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ background: '#4f46e5', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '10px' }}>GLOBAL</span>
                            Appearance
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            {/* Layout */}
                            <div>
                                <label style={labelStyle}>Layout Style</label>
                                <select value={config.layout} onChange={(e) => handleStyleChange('layout', e.target.value)} style={inputStyle as any}>
                                    <option value="banner">Bar (Top/Bottom)</option>
                                    <option value="modal">Center Modal</option>
                                    <option value="popup">Floating Popup</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Position</label>
                                <select value={config.position} onChange={(e) => handleStyleChange('position', e.target.value)} disabled={config.layout === 'modal'} style={{ ...inputStyle, background: config.layout === 'modal' ? '#f9fafb' : '#fff' } as any}>
                                    <option value="bottom">Bottom</option>
                                    <option value="top">Top</option>
                                    <option value="center">Center</option>
                                </select>
                            </div>
                            {/* Colors */}
                            <ColorInput label="Background" value={config.backgroundColor} onChange={(v) => handleStyleChange('backgroundColor', v)} />
                            <ColorInput label="Text Color" value={config.textColor} onChange={(v) => handleStyleChange('textColor', v)} />
                            <ColorInput label="Primary Button" value={config.acceptButtonColor} onChange={(v) => handleStyleChange('acceptButtonColor', v)} />
                            <ColorInput label="Secondary Button" value={config.rejectButtonColor} onChange={(v) => handleStyleChange('rejectButtonColor', v)} />
                        </div>
                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => saveStyleMutation.mutate()} disabled={!isDirty || saveStyleMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: !isDirty || saveStyleMutation.isPending ? 0.6 : 1 }}>
                                <Save style={{ width: '12px', height: '12px' }} /> Save Styles
                            </button>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid #e5e7eb', marginBottom: '20px' }}></div>

                    {/* Text Section with Language Selector */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Globe style={{ width: '14px', height: '14px', color: '#4f46e5' }} />
                                Banner Text
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f9fafb', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                <Globe style={{ width: '14px', height: '14px', color: '#4f46e5' }} />
                                <select
                                    value={selectedLang}
                                    onChange={(e) => { addLanguage(e.target.value); setSelectedLang(e.target.value); }}
                                    style={{ fontSize: '13px', fontWeight: 500, background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', color: '#374151' }}
                                >
                                    {languages.map((l: SupportedLanguage) => (
                                        <option key={l.code} value={l.code}>{l.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Text Fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={labelStyle}>Headline</label>
                                <input type="text" value={currentText.headlineText} onChange={(e) => handleTextChange('headlineText', e.target.value)} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Description</label>
                                <textarea value={currentText.descriptionText} onChange={(e) => handleTextChange('descriptionText', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Accept Button</label>
                                    <input type="text" value={currentText.acceptButtonText} onChange={(e) => handleTextChange('acceptButtonText', e.target.value)} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Reject Button</label>
                                    <input type="text" value={currentText.rejectButtonText} onChange={(e) => handleTextChange('rejectButtonText', e.target.value)} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Settings Button</label>
                                    <input type="text" value={currentText.preferencesButtonText} onChange={(e) => handleTextChange('preferencesButtonText', e.target.value)} style={inputStyle} />
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button onClick={() => { if (confirm('Reset styles to default?')) resetMutation.mutate(); }} style={{ fontSize: '12px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <RotateCcw style={{ width: '12px', height: '12px' }} /> Reset Styles
                            </button>
                            <button onClick={() => saveTranslationMutation.mutate()} disabled={!isTextDirty || saveTranslationMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: !isTextDirty || saveTranslationMutation.isPending ? 0.6 : 1 }}>
                                <Save style={{ width: '12px', height: '12px' }} /> Save Text
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Preview */}
                <div style={{ position: 'sticky', top: '16px', alignSelf: 'start' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></div>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Preview</span>
                        </div>
                        <div style={{ display: 'flex', background: '#f3f4f6', padding: '2px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                            <button onClick={() => setPreviewMode('desktop')} style={{ padding: '4px', borderRadius: '4px', background: previewMode === 'desktop' ? '#fff' : 'transparent', border: 'none', cursor: 'pointer', color: previewMode === 'desktop' ? '#4f46e5' : '#9ca3af', boxShadow: previewMode === 'desktop' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}>
                                <Monitor style={{ width: '14px', height: '14px' }} />
                            </button>
                            <button onClick={() => setPreviewMode('mobile')} style={{ padding: '4px', borderRadius: '4px', background: previewMode === 'mobile' ? '#fff' : 'transparent', border: 'none', cursor: 'pointer', color: previewMode === 'mobile' ? '#4f46e5' : '#9ca3af', boxShadow: previewMode === 'mobile' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}>
                                <Smartphone style={{ width: '14px', height: '14px' }} />
                            </button>
                        </div>
                    </div>

                    <div style={{ border: '5px solid #1f2937', borderRadius: '16px', overflow: 'hidden', background: '#f3f4f6', position: 'relative', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', width: previewMode === 'mobile' ? '220px' : '100%', height: previewMode === 'mobile' ? '380px' : '280px', margin: previewMode === 'mobile' ? '0 auto' : '0', transition: 'all 0.3s' }}>
                        {/* Simulated page */}
                        <div style={{ position: 'absolute', inset: 0, padding: '16px', opacity: 0.2, pointerEvents: 'none' }}>
                            <div style={{ height: '12px', background: '#9ca3af', width: '30%', marginBottom: '12px', borderRadius: '4px' }}></div>
                            <div style={{ height: '8px', background: '#9ca3af', width: '100%', marginBottom: '8px', borderRadius: '4px' }}></div>
                            <div style={{ height: '8px', background: '#9ca3af', width: '100%', marginBottom: '8px', borderRadius: '4px' }}></div>
                            <div style={{ height: '8px', background: '#9ca3af', width: '60%', borderRadius: '4px' }}></div>
                        </div>

                        {/* Banner */}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: config.layout === 'modal' ? 'center' : config.position === 'top' ? 'flex-start' : 'flex-end', justifyContent: 'center', padding: config.layout === 'popup' ? '12px' : '0' }}>
                            <div style={{
                                background: config.backgroundColor,
                                color: config.textColor,
                                padding: '12px',
                                boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
                                width: config.layout === 'banner' ? '100%' : config.layout === 'popup' ? '180px' : '85%',
                                borderRadius: config.layout === 'banner' ? '0' : '8px',
                                ...(config.layout === 'popup' ? { marginLeft: 0, marginRight: 'auto' } : {})
                            }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>{currentText.headlineText}</h4>
                                <p style={{ fontSize: '9px', marginBottom: '10px', opacity: 0.9, lineHeight: 1.4 }}>{currentText.descriptionText}</p>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: config.layout === 'banner' ? 'flex-end' : 'flex-start', flexDirection: config.layout === 'banner' ? 'row' : 'column' }}>
                                    <button style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '9px', border: `1px solid ${config.textColor}`, background: 'transparent', color: config.textColor }}>{currentText.preferencesButtonText}</button>
                                    <button style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '9px', border: 'none', background: config.rejectButtonColor, color: '#333' }}>{currentText.rejectButtonText}</button>
                                    <button style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '9px', border: 'none', background: config.acceptButtonColor, color: '#fff' }}>{currentText.acceptButtonText}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ColorInput({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151' }}>{label}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', padding: '4px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <div style={{ position: 'relative' }}>
                    <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '24px', height: '20px' }} />
                    <div style={{ width: '24px', height: '20px', borderRadius: '4px', border: '1px solid #e5e7eb', background: value }}></div>
                </div>
                <input type="text" value={value} onChange={(e) => onChange(e.target.value)} maxLength={7} style={{ width: '60px', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', border: 'none', outline: 'none', color: '#6b7280', background: 'transparent' }} />
            </div>
        </div>
    );
}
