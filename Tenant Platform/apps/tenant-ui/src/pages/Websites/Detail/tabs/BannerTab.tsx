import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, RotateCcw, Monitor, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import { bannerApi } from '@/api';
import { getErrorMessage } from '@/api/client';
import type { BannerCustomization } from '@/types';

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

export function BannerTab({ websiteId }: { websiteId: string }) {
    const queryClient = useQueryClient();
    const [config, setConfig] = useState<BannerCustomization>(DEFAULT_BANNER);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [isDirty, setIsDirty] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState('');

    const { data: serverConfig, isLoading } = useQuery({
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

    useEffect(() => {
        if (serverConfig) setConfig(serverConfig);
    }, [serverConfig]);

    const saveMutation = useMutation({
        mutationFn: () => bannerApi.save(websiteId, config),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['banner', websiteId] });
            setIsDirty(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        },
        onError: (err) => setError(getErrorMessage(err)),
    });

    const resetMutation = useMutation({
        mutationFn: () => bannerApi.reset(websiteId),
        onSuccess: (data) => { setConfig(data); setIsDirty(false); }
    });

    const handleChange = (key: keyof BannerCustomization, value: string) => {
        setConfig(prev => ({ ...prev, [key]: value }));
        setIsDirty(true);
        setSaveSuccess(false);
    };

    if (isLoading) return <div style={{ padding: '32px', textAlign: 'center' }}><div className="spinner"></div></div>;

    const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' };
    const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '6px' };

    return (
        <div style={{ paddingBottom: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>Banner Appearance</h2>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Customize your consent banner design.</p>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                        {/* Column 1 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Layout & Position */}
                            <div>
                                <h3 style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Layout & Position</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <label style={labelStyle}>Layout Style</label>
                                        <select value={config.layout} onChange={(e) => handleChange('layout', e.target.value)} style={inputStyle as any}>
                                            <option value="banner">Bar (Top/Bottom)</option>
                                            <option value="modal">Center Modal</option>
                                            <option value="popup">Floating Popup</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Position</label>
                                        <select value={config.position} onChange={(e) => handleChange('position', e.target.value)} disabled={config.layout === 'modal'} style={{ ...inputStyle, background: config.layout === 'modal' ? '#f9fafb' : '#fff' } as any}>
                                            <option value="bottom">Bottom</option>
                                            <option value="top">Top</option>
                                            <option value="center">Center</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Theme Colors */}
                            <div>
                                <h3 style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Theme Colors</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <ColorInput label="Background" value={config.backgroundColor} onChange={(v) => handleChange('backgroundColor', v)} />
                                    <ColorInput label="Text Color" value={config.textColor} onChange={(v) => handleChange('textColor', v)} />
                                    <ColorInput label="Primary Button" value={config.acceptButtonColor} onChange={(v) => handleChange('acceptButtonColor', v)} />
                                    <ColorInput label="Secondary Button" value={config.rejectButtonColor} onChange={(v) => handleChange('rejectButtonColor', v)} />
                                </div>
                            </div>
                        </div>

                        {/* Column 2 */}
                        <div>
                            <h3 style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Button Labels</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Accept Button</label>
                                    <input type="text" value={config.acceptButtonText} onChange={(e) => handleChange('acceptButtonText', e.target.value)} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Reject Button</label>
                                    <input type="text" value={config.rejectButtonText} onChange={(e) => handleChange('rejectButtonText', e.target.value)} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Preferences Button</label>
                                    <input type="text" value={config.customizeButtonText} onChange={(e) => handleChange('customizeButtonText', e.target.value)} style={inputStyle} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', marginTop: '20px', borderTop: '1px solid #f3f4f6' }}>
                        <button onClick={() => { if (confirm('Reset all styles to default?')) resetMutation.mutate(); }} style={{ fontSize: '12px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <RotateCcw style={{ width: '12px', height: '12px' }} /> Reset
                        </button>
                        <button onClick={() => saveMutation.mutate()} disabled={!isDirty || saveMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: !isDirty || saveMutation.isPending ? 0.6 : 1, boxShadow: '0 1px 3px rgba(79, 70, 229, 0.3)' }}>
                            <Save style={{ width: '14px', height: '14px' }} /> Save Changes
                        </button>
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
                                <h4 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>We use cookies</h4>
                                <p style={{ fontSize: '9px', marginBottom: '10px', opacity: 0.9, lineHeight: 1.4 }}>This website uses cookies for the best experience.</p>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: config.layout === 'banner' ? 'flex-end' : 'flex-start', flexDirection: config.layout === 'banner' ? 'row' : 'column' }}>
                                    <button style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '9px', border: `1px solid ${config.textColor}`, background: 'transparent', color: config.textColor }}>{config.customizeButtonText}</button>
                                    <button style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '9px', border: 'none', background: config.rejectButtonColor, color: '#333' }}>{config.rejectButtonText}</button>
                                    <button style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '9px', border: 'none', background: config.acceptButtonColor, color: '#fff' }}>{config.acceptButtonText}</button>
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
