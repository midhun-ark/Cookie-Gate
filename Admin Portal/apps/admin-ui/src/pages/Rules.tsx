import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../api/client';
import { CheckCircle } from 'lucide-react';

interface GlobalRule {
    id: string;
    version: number;
    rules_json: any;
    is_active: boolean;
    created_at: string;
}

export function Rules() {
    const queryClient = useQueryClient();
    const [jsonInput, setJsonInput] = useState('{\n  "region": "EU",\n  "retention_days": 365\n}');
    const [error, setError] = useState('');

    const { data: versions, isLoading } = useQuery({
        queryKey: ['rules'],
        queryFn: async () => {
            const res = await client.get('/rules');
            return res.data.versions as GlobalRule[];
        }
    });

    const createMutation = useMutation({
        mutationFn: async (json: any) => {
            await client.post('/rules', json);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rules'] });
            setJsonInput('{\n  \n}');
        },
        onError: (err: any) => setError(err.response?.data?.message || 'Failed to create rule')
    });

    const activateMutation = useMutation({
        mutationFn: async (id: string) => {
            await client.post(`/rules/${id}/activate`);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rules'] })
    });

    const handleCreate = () => {
        try {
            setError('');
            const parsed = JSON.parse(jsonInput);
            createMutation.mutate(parsed);
        } catch (e) {
            setError('Invalid JSON format');
        }
    };

    if (isLoading) return <div>Loading rules...</div>;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

            {/* Creation Column */}
            <div>
                <div className="page-header">
                    <h2>New Rule Version</h2>
                </div>
                <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                    <div className="form-group">
                        <label>Rules JSON (Immutable)</label>
                        <textarea
                            rows={15}
                            value={jsonInput}
                            onChange={e => setJsonInput(e.target.value)}
                            style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                        />
                    </div>
                    {error && <div className="error-msg">{error}</div>}
                    <button
                        className="primary-btn full-width"
                        onClick={handleCreate}
                        disabled={createMutation.isPending}
                    >
                        {createMutation.isPending ? 'Creating v...' : 'createRules(json)'}
                    </button>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                        Note: Creating a rule does not activate it. Use the list on the right to activate.
                    </p>
                </div>
            </div>

            {/* History Column */}
            <div>
                <div className="page-header">
                    <h2>Version History</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {versions?.map((rule) => (
                        <div
                            key={rule.id}
                            style={{
                                background: 'var(--bg-card)',
                                padding: '1rem',
                                borderRadius: '0.5rem',
                                border: `1px solid ${rule.is_active ? 'var(--success)' : 'var(--border)'}`,
                                position: 'relative'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 'bold' }}>v{rule.version}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {new Date(rule.created_at).toLocaleString()}
                                </span>
                            </div>

                            <pre style={{
                                background: 'rgba(0,0,0,0.3)',
                                padding: '0.5rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                overflowX: 'auto'
                            }}>
                                {JSON.stringify(rule.rules_json, null, 2)}
                            </pre>

                            <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                                {rule.is_active ? (
                                    <span className="status-badge status-active" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <CheckCircle size={12} /> Active
                                    </span>
                                ) : (
                                    <button
                                        className="action-btn"
                                        onClick={() => {
                                            if (confirm(`Activate version ${rule.version}? This will disable the current active rule.`)) {
                                                activateMutation.mutate(rule.id);
                                            }
                                        }}
                                    >
                                        Activate
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
