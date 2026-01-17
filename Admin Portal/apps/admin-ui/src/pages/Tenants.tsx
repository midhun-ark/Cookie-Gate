import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../api/client';
import { Plus, PauseCircle, PlayCircle } from 'lucide-react';

interface Tenant {
    id: string;
    name: string;
    status: 'ACTIVE' | 'SUSPENDED';
    created_at: string;
}

export function Tenants() {
    const queryClient = useQueryClient();
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');

    const { data: tenants, isLoading } = useQuery({
        queryKey: ['tenants'],
        queryFn: async () => {
            const res = await client.get('/tenants');
            return res.data.tenants as Tenant[];
        }
    });

    const createMutation = useMutation({
        mutationFn: async (name: string) => {
            await client.post('/tenants', { name });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tenants'] });
            setIsCreating(false);
            setNewName('');
        }
    });

    const suspendMutation = useMutation({
        mutationFn: async (id: string) => {
            await client.post(`/tenants/${id}/suspend`);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] })
    });

    const reactivateMutation = useMutation({
        mutationFn: async (id: string) => {
            await client.post(`/tenants/${id}/reactivate`);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] })
    });

    if (isLoading) return <div>Loading tenants...</div>;

    return (
        <div>
            <div className="page-header">
                <h2>Tenant Governance</h2>
                <button className="primary-btn" onClick={() => setIsCreating(!isCreating)}>
                    <Plus size={16} style={{ marginBottom: -2, marginRight: 4 }} />
                    New Tenant
                </button>
            </div>

            {isCreating && (
                <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                    <h3>Create Tenant</h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Details</label>
                            <input
                                placeholder="Tenant Name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                        </div>
                        <button
                            className="primary-btn"
                            onClick={() => createMutation.mutate(newName)}
                            disabled={createMutation.isPending || !newName}
                        >
                            {createMutation.isPending ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </div>
            )}

            <table className="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Created At</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {tenants?.map((tenant) => (
                        <tr key={tenant.id}>
                            <td>{tenant.name}</td>
                            <td>
                                <span className={`status-badge status-${tenant.status.toLowerCase()}`}>
                                    {tenant.status}
                                </span>
                            </td>
                            <td>{new Date(tenant.created_at).toLocaleDateString()}</td>
                            <td>
                                {tenant.status === 'ACTIVE' ? (
                                    <button
                                        className="action-btn danger"
                                        onClick={() => {
                                            if (confirm('Suspend this tenant?')) suspendMutation.mutate(tenant.id);
                                        }}
                                        title="Suspend Tenant"
                                    >
                                        <PauseCircle size={16} /> Suspend
                                    </button>
                                ) : (
                                    <button
                                        className="action-btn"
                                        onClick={() => reactivateMutation.mutate(tenant.id)}
                                        title="Reactivate Tenant"
                                    >
                                        <PlayCircle size={16} /> Reactivate
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
