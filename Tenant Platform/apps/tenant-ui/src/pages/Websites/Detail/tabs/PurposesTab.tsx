import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus,
    Trash2,
    GripVertical,
    AlertCircle,
} from 'lucide-react';
import { purposeApi, languageApi } from '@/api';
import { getErrorMessage } from '@/api/client';
import type { Purpose } from '@/types';

export function PurposesTab({ websiteId }: { websiteId: string }) {
    const queryClient = useQueryClient();
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const { data: purposes, isLoading } = useQuery({
        queryKey: ['purposes', websiteId],
        queryFn: () => purposeApi.list(websiteId),
    });

    const deleteMutation = useMutation({
        mutationFn: purposeApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purposes', websiteId] });
        },
    });

    if (isLoading) {
        return <div className="p-8 text-center"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="tab-header flex justify-between items-start">
                <div>
                    <h2 className="tab-title">Consent Purposes</h2>
                    <p className="tab-description">
                        Define the categories of data collection. "Essential" is required and cannot be rejected by users.
                    </p>
                </div>
                {!showAddForm && !editingId && (
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowAddForm(true)}
                    >
                        <Plus size={18} />
                        Add Purpose
                    </button>
                )}
            </div>

            {(showAddForm || editingId) && (
                <PurposeForm
                    websiteId={websiteId}
                    purpose={purposes?.find((p) => p.id === editingId)}
                    onCancel={() => {
                        setShowAddForm(false);
                        setEditingId(null);
                    }}
                    onSuccess={() => {
                        setShowAddForm(false);
                        setEditingId(null);
                        queryClient.invalidateQueries({ queryKey: ['purposes', websiteId] });
                    }}
                />
            )}

            {!showAddForm && !editingId && (
                <div className="space-y-3">
                    {purposes && purposes.length > 0 ? (
                        purposes
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                            .map((purpose) => (
                                <div
                                    key={purpose.id}
                                    className="card p-4 flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="cursor-move text-gray-400 hover:text-gray-600">
                                            <GripVertical size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-gray-900">
                                                    {getTranslation(purpose, 'en')?.name || 'Unnamed Purpose'}
                                                </h3>
                                                {purpose.isEssential && (
                                                    <span className="badge badge-gray text-xs">Essential</span>
                                                )}
                                                <span className={`badge ${purpose.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'} text-xs`}>
                                                    {purpose.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {getTranslation(purpose, 'en')?.description || 'No description'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => setEditingId(purpose.id)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-sm text-error hover:bg-red-50"
                                            onClick={() => {
                                                if (confirm('Are you sure you want to delete this purpose?')) {
                                                    deleteMutation.mutate(purpose.id);
                                                }
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                    ) : (
                        <div className="empty-state card">
                            <p className="text-gray-500">No purposes defined yet.</p>
                            <button
                                className="btn btn-ghost btn-sm mt-2"
                                onClick={() => setShowAddForm(true)}
                            >
                                <Plus size={16} /> Add your first purpose
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function PurposeForm({
    websiteId,
    purpose,
    onCancel,
    onSuccess,
}: {
    websiteId: string;
    purpose?: Purpose;
    onCancel: () => void;
    onSuccess: () => void;
}) {
    const isEditing = !!purpose;
    const [selectedLang, setSelectedLang] = useState('en');
    const [isEssential, setIsEssential] = useState(purpose?.isEssential || false);
    const [error, setError] = useState('');

    const { data: languages } = useQuery({
        queryKey: ['languages'],
        queryFn: languageApi.list,
    });

    const [translations, setTranslations] = useState<{
        [lang: string]: { name: string; description: string }
    }>(() => {
        if (!purpose) return { en: { name: '', description: '' } };
        const map: any = {};
        purpose.translations.forEach((t) => {
            map[t.languageCode] = { name: t.name, description: t.description };
        });
        return map;
    });

    const currentTrans = translations[selectedLang] || { name: '', description: '' };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const transList = Object.entries(translations).map(([code, t]) => ({
                languageCode: code,
                ...t,
            }));

            if (isEditing) {
                // Update settings
                await purposeApi.update(purpose.id, { isEssential });
                // Update translations
                await purposeApi.updateTranslations(purpose.id, transList);
            } else {
                // Create
                await purposeApi.create(websiteId, {
                    isEssential,
                    displayOrder: 0,
                    translations: transList,
                });
            }
        },
        onSuccess,
        onError: (err) => setError(getErrorMessage(err)),
    });

    const handleTransChange = (field: 'name' | 'description', val: string) => {
        setTranslations((prev) => ({
            ...prev,
            [selectedLang]: {
                ...prev[selectedLang] || { name: '', description: '' },
                [field]: val,
            },
        }));
    };

    return (
        <div className="card p-6 border-primary border-2">
            <h3 className="text-lg font-bold mb-4">
                {isEditing ? 'Edit Purpose' : 'Add New Purpose'}
            </h3>

            {error && (
                <div className="alert alert-error mb-4">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isEssential}
                        onChange={(e) => setIsEssential(e.target.checked)}
                        className="checkbox"
                    />
                    <span className="font-medium">Strictly Necessary (Essential)</span>
                </label>
                <p className="text-sm text-gray-500 mt-1 pl-6">
                    Essential cookies cannot be disabled by the user.
                </p>
            </div>

            <div className="mb-4 border-b border-gray-100 pb-2">
                <div className="flex gap-2">
                    {languages?.map((lang) => (
                        <button
                            key={lang.code}
                            type="button"
                            className={`px-3 py-1 text-sm rounded ${selectedLang === lang.code
                                ? 'bg-gray-800 text-white'
                                : 'bg-gray-100 text-gray-600'
                                }`}
                            onClick={() => setSelectedLang(lang.code)}
                        >
                            {lang.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div className="form-group">
                    <label className="form-label">Name ({selectedLang})</label>
                    <input
                        type="text"
                        className="form-input"
                        value={currentTrans.name}
                        onChange={(e) => handleTransChange('name', e.target.value)}
                        placeholder={isEssential ? "Strictly Necessary" : "Marketing"}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Description ({selectedLang})</label>
                    <textarea
                        className="form-input"
                        rows={3}
                        value={currentTrans.description}
                        onChange={(e) => handleTransChange('description', e.target.value)}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
                <button
                    className="btn btn-secondary"
                    onClick={onCancel}
                    disabled={saveMutation.isPending}
                >
                    Cancel
                </button>
                <button
                    className="btn btn-primary"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                >
                    {saveMutation.isPending ? 'Saving...' : 'Save Purpose'}
                </button>
            </div>
        </div>
    );
}

function getTranslation(purpose: Purpose, lang: string) {
    return (
        purpose.translations.find((t) => t.languageCode === lang) ||
        purpose.translations[0]
    );
}
