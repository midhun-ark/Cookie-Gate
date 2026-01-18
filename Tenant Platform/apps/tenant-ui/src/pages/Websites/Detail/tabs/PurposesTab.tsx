import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Trash2,
    GripVertical,
    AlertCircle,
} from 'lucide-react';
import { purposeApi } from '@/api';
import { getErrorMessage } from '@/api/client';
import type { Purpose } from '@/types';

const COMMON_PURPOSES = [
    { label: 'Necessary', value: 'strictly_necessary', desc: 'Required for the website to function properly.' },
    { label: 'Functional', value: 'functional', desc: 'Help website to perform certain functionalities like sharing the content on social media platforms.' },
    { label: 'Analytics', value: 'analytics', desc: 'Understand how visitors interact with the website.' },
    { label: 'Performance', value: 'performance', desc: 'Analyze the key performance indexes to deliver better user experience.' },
    { label: 'Advertisement', value: 'advertisement', desc: 'Provide visitors with relevant ads and marketing campaigns.' },
];

export function PurposesTab({ websiteId }: { websiteId: string }) {
    const queryClient = useQueryClient();
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
        <div className="flex gap-6 items-start">
            {/* Left Column - List */}
            <div className="flex-1 space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="tab-title mb-0">Configured Purposes</h2>
                    <span className="text-sm text-gray-500">{purposes?.length || 0} active</span>
                </div>

                <div className="space-y-3">
                    {purposes && purposes.length > 0 ? (
                        purposes
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                            .map((purpose) => (
                                <div
                                    key={purpose.id}
                                    className={`card p-4 flex items-center justify-between group transition-all ${editingId === purpose.id ? 'ring-2 ring-primary bg-primary/5' : ''}`}
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
                                                <span className="badge badge-gray text-xs font-mono">{purpose.tag}</span>
                                                {purpose.isEssential && (
                                                    <span className="badge badge-gray text-xs">Essential</span>
                                                )}
                                                <span className={`badge ${purpose.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'} text-xs`}>
                                                    {purpose.status}
                                                </span>
                                            </div>
                                            {/* Description field removed from viewing as well if desired, or kept for legacy. Keeping simple view. */}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => setEditingId(editingId === purpose.id ? null : purpose.id)}
                                        >
                                            {editingId === purpose.id ? 'Cancel Edit' : 'Edit'}
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
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column - Editor */}
            <div className="w-[400px] shrink-0 sticky top-4">
                <PurposeForm
                    websiteId={websiteId}
                    purpose={purposes?.find((p) => p.id === editingId)}
                    key={editingId || 'new'} // Force re-mount on switch
                    onCancel={() => setEditingId(null)}
                    onSuccess={() => {
                        setEditingId(null);
                        queryClient.invalidateQueries({ queryKey: ['purposes', websiteId] });
                    }}
                />
            </div>
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
    const queryClient = useQueryClient();
    const isEditing = !!purpose;
    const [isEssential, setIsEssential] = useState(purpose?.isEssential || false);
    const [tag, setTag] = useState(purpose?.tag || '');
    const [error, setError] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // Load initial state if editing
    useState(() => {
        if (purpose) {
            const en = purpose.translations.find(t => t.languageCode === 'en');
            setName(en?.name || '');
            setDescription(en?.description || '');
        }
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const transList = [{ languageCode: 'en', name, description }];

            if (isEditing) {
                // Update settings
                await purposeApi.update(purpose.id, { isEssential });
                // Update translations
                await purposeApi.updateTranslations(purpose.id, transList);
            } else {
                // Create
                await purposeApi.create(websiteId, {
                    isEssential,
                    tag,
                    displayOrder: 0,
                    translations: transList,
                });
            }
        },
        onSuccess,
        onError: (err) => setError(getErrorMessage(err)),
    });

    const handleQuickSelect = (p: typeof COMMON_PURPOSES[0]) => {
        setName(p.label);
        setTag(p.value);
        setDescription(p.desc);
        setIsEssential(p.value === 'strictly_necessary');
    };

    return (
        <div className="card p-0 border-gray-200 shadow-lg relative overflow-hidden bg-white rounded-xl">
            {isEditing && (
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/80 backdrop-blur-sm"></div>
            )}

            <div className="p-8 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900 flex justify-between items-center">
                    {isEditing ? 'Edit Purpose' : 'Add New Purpose'}
                    {isEditing && (
                        <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/20">
                            Editing
                        </span>
                    )}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                    {isEditing ? 'Modify the details of the selected purpose.' : 'Define a new data processing purpose for your website.'}
                </p>
            </div>

            <div className="p-6 space-y-6">
                {error && (
                    <div className="alert alert-error mb-4 shadow-sm border border-red-100">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                {/* Quick Select Chips */}
                {!isEditing && (
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            Start with a Template
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {COMMON_PURPOSES.map(cp => (
                                <button
                                    key={cp.value}
                                    onClick={() => handleQuickSelect(cp)}
                                    className={`group px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200 flex flex-col items-start gap-1 min-w-[100px] hover:-translate-y-0.5
                                        ${tag === cp.value
                                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary'
                                        }`}
                                >
                                    <span className="font-bold text-sm">{cp.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-5">
                    <div className="form-group">
                        <label className="form-label text-gray-700 font-medium">Purpose Name</label>
                        <div className="relative group">
                            <input
                                type="text"
                                className="form-input pl-3 transition-all group-hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (!isEditing && !tag) {
                                        setTag(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
                                    }
                                }}
                                placeholder="e.g. Analytics"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label text-gray-700 font-medium">Description (Data Category)</label>
                        <textarea
                            className="form-input transition-all min-h-[80px] hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10 resize-none py-2"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Briefly describe what data is collected and why..."
                        />
                    </div>

                    <div className="form-group ">
                        <label className="form-label text-gray-700 font-medium flex items-center justify-between">
                            Tag ID
                            <span className="text-[10px] text-gray-400 font-mono tracking-wider ml-2 bg-gray-100 px-1.5 py-0.5 rounded">SYSTEM ID</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                className={`form-input font-mono text-sm pl-8 bg-gray-50/50 ${isEditing ? 'text-gray-500' : ''}`}
                                value={tag}
                                onChange={(e) => setTag(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                disabled={isEditing}
                            />
                            <span className="absolute left-3 top-2.5 text-gray-400 font-bold select-none">#</span>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between group hover:border-primary/20 transition-colors">
                        <div className="flex-1 pr-4">
                            <div className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors">Strictly Necessary</div>
                            <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                                Essential cookies that cannot be rejected by users.
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isEssential}
                                onChange={(e) => setIsEssential(e.target.checked)}
                                disabled={isEditing && purpose?.isEssential}
                                className="hidden"
                            />
                            <div className={`w-11 h-6 bg-gray-200 rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isEssential ? 'bg-primary after:translate-x-full after:border-white' : ''}`}></div>
                        </label>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-gray-50/80 border-t border-gray-100 flex gap-3 backdrop-blur-sm sticky bottom-0">
                {isEditing && (
                    <button
                        className="btn bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm flex-1 font-medium"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                )}
                {!isEditing && (
                    <button
                        className="btn bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm flex-1 font-medium whitespace-nowrap"
                        onClick={() => {
                            saveMutation.mutate(undefined, {
                                onSuccess: () => {
                                    setName('');
                                    setTag('');
                                    setDescription('');
                                    setIsEssential(false);
                                    queryClient.invalidateQueries({ queryKey: ['purposes', websiteId] });
                                }
                            });
                        }}
                        disabled={saveMutation.isPending || !name || !tag}
                    >
                        Save & Add Another
                    </button>
                )}
                <button
                    className="btn btn-primary shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-all flex-1 font-medium"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || !name || !tag}
                >
                    {saveMutation.isPending ? 'Saving...' : (isEditing ? 'Update Purpose' : 'Save Purpose')}
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
