import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, RotateCcw, Monitor, Smartphone, CheckCircle } from 'lucide-react';
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
                // If 404, return default
                if (err.response?.status === 404) return DEFAULT_BANNER;
                throw err;
            }
        }
    });

    useEffect(() => {
        if (serverConfig) {
            setConfig(serverConfig);
        }
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
        onSuccess: (data) => {
            setConfig(data);
            setIsDirty(false);
        }
    });

    const handleChange = (key: keyof BannerCustomization, value: string) => {
        setConfig(prev => ({ ...prev, [key]: value }));
        setIsDirty(true);
        setSaveSuccess(false);
    };

    if (isLoading) return <div className="p-12 text-center"><div className="spinner"></div></div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Editor Column */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="tab-title">Banner Appearance</h2>
                        <p className="tab-description">Customize how the consent banner looks on your site.</p>
                    </div>
                </div>

                {error && <div className="alert alert-error">{error}</div>}
                {saveSuccess && (
                    <div className="alert alert-success animate-fade-in">
                        <CheckCircle size={16} /> Settings saved!
                    </div>
                )}

                <div className="settings-card">
                    {/* Layout & Position */}
                    <div className="settings-section">
                        <h3 className="section-title">Layout & Position</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                                <label className="form-label">Layout Style</label>
                                <select
                                    className="form-input form-select"
                                    value={config.layout}
                                    onChange={(e) => handleChange('layout', e.target.value as any)}
                                >
                                    <option value="banner">Bar</option>
                                    <option value="modal">Center Modal</option>
                                    <option value="popup">Floating Popup</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Position</label>
                                <select
                                    className="form-input form-select"
                                    value={config.position}
                                    onChange={(e) => handleChange('position', e.target.value as any)}
                                    disabled={config.layout === 'modal'}
                                >
                                    <option value="bottom">Bottom</option>
                                    <option value="top">Top</option>
                                    <option value="center" disabled>Center (Modal only)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Colors */}
                    <div className="settings-section">
                        <h3 className="section-title">Colors</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <ColorInput
                                label="Background"
                                value={config.backgroundColor}
                                onChange={(v) => handleChange('backgroundColor', v)}
                            />
                            <ColorInput
                                label="Text Color"
                                value={config.textColor}
                                onChange={(v) => handleChange('textColor', v)}
                            />
                            <ColorInput
                                label="Primary Button"
                                value={config.acceptButtonColor}
                                onChange={(v) => handleChange('acceptButtonColor', v)}
                            />
                            <ColorInput
                                label="Secondary Button"
                                value={config.rejectButtonColor}
                                onChange={(v) => handleChange('rejectButtonColor', v)}
                            />
                        </div>
                    </div>

                    {/* Text content */}
                    <div className="settings-section">
                        <h3 className="section-title">Button Labels</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="form-group">
                                <label className="form-label">Accept Button</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={config.acceptButtonText}
                                    onChange={(e) => handleChange('acceptButtonText', e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="form-label">Reject Button</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={config.rejectButtonText}
                                        onChange={(e) => handleChange('rejectButtonText', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Preferences</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={config.customizeButtonText}
                                        onChange={(e) => handleChange('customizeButtonText', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                    <button
                        className="btn btn-ghost text-gray-500 hover:text-red-500"
                        onClick={() => {
                            if (confirm('Reset all styles to default?')) resetMutation.mutate();
                        }}
                    >
                        <RotateCcw size={16} /> Reset
                    </button>
                    <button
                        className="btn btn-primary"
                        disabled={!isDirty || saveMutation.isPending}
                        onClick={() => saveMutation.mutate()}
                    >
                        {saveMutation.isPending ? <div className="spinner w-4 h-4" /> : <Save size={18} />}
                        Save Changes
                    </button>
                </div>
            </div>

            {/* Preview Column */}
            <div className="sticky top-6">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-700">Live Preview</h3>
                    <div className="bg-gray-100 p-1 rounded-lg flex">
                        <button
                            className={`p-1.5 rounded ${previewMode === 'desktop' ? 'bg-white shadow' : 'text-gray-500'}`}
                            onClick={() => setPreviewMode('desktop')}
                        >
                            <Monitor size={18} />
                        </button>
                        <button
                            className={`p-1.5 rounded ${previewMode === 'mobile' ? 'bg-white shadow' : 'text-gray-500'}`}
                            onClick={() => setPreviewMode('mobile')}
                        >
                            <Smartphone size={18} />
                        </button>
                    </div>
                </div>

                <div className={`
                    border-4 border-gray-800 rounded-xl overflow-hidden bg-gray-100 relative transition-all duration-300
                    ${previewMode === 'mobile' ? 'w-[320px] h-[600px] mx-auto' : 'w-full h-[500px]'}
                `}>
                    {/* Simulated webpage content */}
                    <div className="absolute inset-0 p-8 opacity-20 pointer-events-none">
                        <div className="h-8 bg-gray-400 w-1/3 mb-8 rounded"></div>
                        <div className="h-4 bg-gray-400 w-full mb-4 rounded"></div>
                        <div className="h-4 bg-gray-400 w-full mb-4 rounded"></div>
                        <div className="h-4 bg-gray-400 w-2/3 mb-4 rounded"></div>
                        <div className="grid grid-cols-3 gap-4 mt-8">
                            <div className="h-32 bg-gray-300 rounded"></div>
                            <div className="h-32 bg-gray-300 rounded"></div>
                            <div className="h-32 bg-gray-300 rounded"></div>
                        </div>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 pointer-events-none">
                        {/* THE ACTUAL BANNER PREVIEW COMPONENT */}
                        <div
                            className={`pointer-events-auto p-6 shadow-xl transition-all
                                ${config.layout === 'modal' ? 'absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 w-[90%] max-w-md rounded-lg' : ''}
                                ${config.layout === 'popup' ? 'absolute bottom-4 left-4 w-[300px] rounded-lg' : ''}
                                ${config.layout === 'banner' ? (config.position === 'top' ? 'absolute top-0 bottom-auto w-full' : 'absolute bottom-0 w-full') : ''}
                            `}
                            style={{
                                backgroundColor: config.backgroundColor,
                                color: config.textColor,
                            }}
                        >
                            <h4 className="font-bold text-lg mb-2">We use cookies</h4>
                            <p className="text-sm mb-4 opacity-90">
                                This website uses cookies to ensure you get the best experience on our website.
                            </p>
                            <div className={`flex gap-3 ${config.layout === 'banner' ? 'justify-end' : 'flex-col'}`}>
                                <button
                                    className="px-4 py-2 rounded font-medium text-sm border"
                                    style={{ borderColor: config.textColor, color: config.textColor }}
                                >
                                    {config.customizeButtonText}
                                </button>
                                <button
                                    className="px-4 py-2 rounded font-medium text-sm"
                                    style={{ backgroundColor: config.rejectButtonColor, color: '#333' }}
                                >
                                    {config.rejectButtonText}
                                </button>
                                <button
                                    className="px-4 py-2 rounded font-medium text-sm shadow-sm"
                                    style={{ backgroundColor: config.acceptButtonColor, color: '#fff' }}
                                >
                                    {config.acceptButtonText}
                                </button>
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
        <div className="form-group">
            <label className="form-label">{label}</label>
            <div className="flex gap-2 items-center">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-10 w-12 p-1 rounded border border-gray-300 cursor-pointer"
                />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="form-input font-mono uppercase"
                    maxLength={7}
                />
            </div>
        </div>
    );
}
