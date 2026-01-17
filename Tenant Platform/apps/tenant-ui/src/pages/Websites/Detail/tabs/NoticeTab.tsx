import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';
import { noticeApi, languageApi } from '@/api';
import { getErrorMessage } from '@/api/client';

export function NoticeTab({ websiteId }: { websiteId: string }) {
    const queryClient = useQueryClient();
    const [selectedLang, setSelectedLang] = useState('en');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState('');

    const { data: notice, isLoading: isLoadingNotice } = useQuery({
        queryKey: ['notice', websiteId],
        queryFn: () => noticeApi.get(websiteId),
    });

    const { data: languages } = useQuery({
        queryKey: ['languages'],
        queryFn: languageApi.list,
    });

    // Form state
    const [formData, setFormData] = useState<{
        [lang: string]: { title: string; description: string; policyUrl: string }
    }>({});

    // Initialize form data when notice loads
    if (notice && Object.keys(formData).length === 0) {
        const initialData: typeof formData = {};
        notice.translations.forEach((t) => {
            initialData[t.languageCode] = {
                title: t.title,
                description: t.description,
                policyUrl: t.policyUrl || '',
            };
        });
        setFormData(initialData);
    }

    const saveMutation = useMutation({
        mutationFn: async () => {
            // If notice exists, update translations. Else create notice.
            const translations = Object.entries(formData).map(([code, data]) => ({
                languageCode: code,
                ...data
            }));

            if (notice) {
                await noticeApi.updateTranslations(notice.id, translations);
            } else {
                await noticeApi.create(websiteId, translations);
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

    const handleInputChange = (field: 'title' | 'description' | 'policyUrl', value: string) => {
        setFormData((prev) => ({
            ...prev,
            [selectedLang]: {
                ...prev[selectedLang] || { title: '', description: '', policyUrl: '' },
                [field]: value,
            },
        }));
        setSaveSuccess(false);
    };

    const currentData = formData[selectedLang] || { title: '', description: '', policyUrl: '' };

    if (isLoadingNotice) {
        return <div className="p-8 text-center"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="tab-header">
                <h2 className="tab-title">Cookie Consent Notice</h2>
                <p className="tab-description">
                    Configure the text displayed in your consent banner. You must provide an English translation.
                </p>
            </div>

            <div className="settings-card">
                <div className="flex gap-4 mb-6 border-b border-gray-100 pb-4">
                    {languages?.map((lang) => (
                        <button
                            key={lang.code}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedLang === lang.code
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            onClick={() => setSelectedLang(lang.code)}
                        >
                            {lang.name}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="alert alert-error mb-4">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {saveSuccess && (
                    <div className="alert alert-success mb-4">
                        <CheckCircle size={16} />
                        Changes saved successfully
                    </div>
                )}

                <div className="space-y-4">
                    <div className="form-group">
                        <label className="form-label">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g., We use cookies"
                            value={currentData.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            className="form-input"
                            rows={4}
                            placeholder="e.g., We use cookies to improve your experience..."
                            value={currentData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                        />
                        <p className="form-helper">
                            Explain clearly why you are collecting data.
                        </p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Privacy Policy URL</label>
                        <input
                            type="url"
                            className="form-input"
                            placeholder="https://example.com/privacy"
                            value={currentData.policyUrl}
                            onChange={(e) => handleInputChange('policyUrl', e.target.value)}
                        />
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            className="btn btn-primary"
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending}
                        >
                            {saveMutation.isPending ? (
                                <div className="spinner w-4 h-4 border-2"></div>
                            ) : (
                                <Save size={18} />
                            )}
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
