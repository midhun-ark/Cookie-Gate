import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../api/client';
import { Plus, PauseCircle, PlayCircle, UserPlus, Mail, CheckCircle, X, RefreshCw, Clock } from 'lucide-react';

interface Tenant {
    id: string;
    name: string;
    status: 'ACTIVE' | 'SUSPENDED';
    created_at: string;
}

interface TenantAdmin {
    id: string;
    email: string;
    status: string;
    created_at: string;
    invitation_sent_at?: string;
    last_invitation_sent_at?: string;
    invitation_count?: number;
}

export function Tenants() {
    const queryClient = useQueryClient();
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');

    // Modal state for issuing tenant admin access
    const [issuingForTenant, setIssuingForTenant] = useState<Tenant | null>(null);
    const [adminEmail, setAdminEmail] = useState('');
    const [issueError, setIssueError] = useState('');
    const [issueSuccess, setIssueSuccess] = useState('');

    // Fetch tenants
    const { data: tenants, isLoading } = useQuery({
        queryKey: ['tenants'],
        queryFn: async () => {
            const res = await client.get('/tenants');
            return res.data.tenants as Tenant[];
        }
    });

    // Fetch tenant admin statuses (batch)
    const { data: tenantAdmins } = useQuery({
        queryKey: ['tenant-admins', tenants?.map(t => t.id)],
        queryFn: async () => {
            if (!tenants || tenants.length === 0) return {};
            const res = await client.post('/tenant-admins/batch-status', {
                tenantIds: tenants.map(t => t.id)
            });
            return res.data.admins as Record<string, TenantAdmin>;
        },
        enabled: !!tenants && tenants.length > 0
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

    // Issue Tenant Admin Access mutation
    const issueMutation = useMutation({
        mutationFn: async ({ tenantId, email }: { tenantId: string; email: string }) => {
            const res = await client.post('/tenant-admins/issue', { tenantId, email });
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tenant-admins'] });
            setIssueSuccess(data.message || 'Tenant admin access issued successfully!');
            setAdminEmail('');
            setTimeout(() => {
                setIssuingForTenant(null);
                setIssueSuccess('');
            }, 3000);
        },
        onError: (err: any) => {
            setIssueError(err.response?.data?.message || 'Failed to issue tenant admin access');
        }
    });

    // Resend invitation mutation
    const resendMutation = useMutation({
        mutationFn: async (tenantUserId: string) => {
            const res = await client.post(`/tenant-admins/resend/${tenantUserId}`);
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tenant-admins'] });

            if (data.emailSent) {
                alert(`✅ Email SENT Successfully!\n\n[Dev Mode Info]\nSince you are in Dev Mode, here is the password copy:\n\n${data.temporaryPassword}`);
            } else if (data.temporaryPassword) {
                alert(`⚠️ Email Delivery Failed.\n\nBut here is the generated password so you can proceed:\n\n${data.temporaryPassword}`);
            } else {
                alert(data.message || 'Invitation resent successfully.');
            }
        }
    });

    // Reset modal state when closing
    const closeModal = () => {
        setIssuingForTenant(null);
        setAdminEmail('');
        setIssueError('');
        setIssueSuccess('');
    };

    const handleIssueAccess = () => {
        if (!issuingForTenant || !adminEmail) return;
        setIssueError('');
        issueMutation.mutate({ tenantId: issuingForTenant.id, email: adminEmail });
    };

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
                        <th>Tenant Admin</th>
                        <th>Created At</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {tenants?.map((tenant) => {
                        const hasAdmin = tenantAdmins && tenantAdmins[tenant.id];

                        return (
                            <tr key={tenant.id}>
                                <td>{tenant.name}</td>
                                <td>
                                    <span className={`status-badge status-${tenant.status.toLowerCase()}`}>
                                        {tenant.status}
                                    </span>
                                </td>
                                <td>
                                    {hasAdmin ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
                                                <CheckCircle size={14} />
                                                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                                    {tenantAdmins[tenant.id].email}
                                                </span>
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                <Clock size={12} />
                                                Invited: {tenantAdmins[tenant.id].last_invitation_sent_at
                                                    ? new Date(tenantAdmins[tenant.id].last_invitation_sent_at!).toLocaleString()
                                                    : 'N/A'}
                                                {tenantAdmins[tenant.id].invitation_count && (tenantAdmins[tenant.id].invitation_count ?? 0) > 1 && (
                                                    <span style={{ marginLeft: '0.25rem', padding: '0.1rem 0.3rem', background: 'var(--bg-card)', borderRadius: '0.25rem' }}>
                                                        ×{tenantAdmins[tenant.id].invitation_count}
                                                    </span>
                                                )}
                                            </span>
                                            {/* Resend Invitation Button */}
                                            {tenant.status === 'ACTIVE' && (
                                                <button
                                                    className="action-btn"
                                                    onClick={() => {
                                                        if (confirm('Resend invitation? This will generate a new password and send a new email.')) {
                                                            resendMutation.mutate(tenantAdmins[tenant.id].id);
                                                        }
                                                    }}
                                                    disabled={resendMutation.isPending}
                                                    title="Resend Invitation"
                                                    style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', marginTop: '0.25rem' }}
                                                >
                                                    <RefreshCw size={12} style={{ marginRight: '0.25rem' }} />
                                                    {resendMutation.isPending ? 'Sending...' : 'Resend Invite'}
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                            No admin assigned
                                        </span>
                                    )}
                                </td>
                                <td>{new Date(tenant.created_at).toLocaleDateString()}</td>
                                <td style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {/* Create Tenant Admin - Only show for ACTIVE tenants without admin */}
                                    {tenant.status === 'ACTIVE' && !hasAdmin && (
                                        <button
                                            className="action-btn"
                                            onClick={() => setIssuingForTenant(tenant)}
                                            title="Create Tenant Admin"
                                            style={{ background: 'var(--primary)', color: 'white' }}
                                        >
                                            <UserPlus size={14} /> Create Admin
                                        </button>
                                    )}

                                    {/* Suspend / Reactivate */}
                                    {tenant.status === 'ACTIVE' ? (
                                        <button
                                            className="action-btn danger"
                                            onClick={() => {
                                                if (confirm('Suspend this tenant?')) suspendMutation.mutate(tenant.id);
                                            }}
                                            title="Suspend Tenant"
                                        >
                                            <PauseCircle size={14} /> Suspend
                                        </button>
                                    ) : (
                                        <button
                                            className="action-btn"
                                            onClick={() => reactivateMutation.mutate(tenant.id)}
                                            title="Reactivate Tenant"
                                        >
                                            <PlayCircle size={14} /> Reactivate
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Issue Tenant Admin Modal */}
            {issuingForTenant && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>
                                <UserPlus size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                                Issue Tenant Admin Access
                            </h3>
                            <button className="modal-close" onClick={closeModal}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                                Create a tenant admin for <strong>{issuingForTenant.name}</strong>.
                                A temporary password will be generated and sent via email.
                            </p>

                            <div className="form-group">
                                <label>Tenant Admin Email</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={16} style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--text-muted)'
                                    }} />
                                    <input
                                        type="email"
                                        placeholder="admin@company.com"
                                        value={adminEmail}
                                        onChange={e => { setAdminEmail(e.target.value); setIssueError(''); }}
                                        style={{ paddingLeft: '36px' }}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {issueError && (
                                <div className="error-msg" style={{ marginTop: '1rem' }}>
                                    {issueError}
                                </div>
                            )}

                            {issueSuccess && (
                                <div style={{
                                    marginTop: '1rem',
                                    padding: '0.75rem',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    border: '1px solid var(--success)',
                                    borderRadius: '0.375rem',
                                    color: 'var(--success)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <CheckCircle size={16} />
                                    {issueSuccess}
                                </div>
                            )}

                            <div style={{
                                marginTop: '1rem',
                                padding: '0.75rem',
                                background: 'rgba(234, 179, 8, 0.1)',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)'
                            }}>
                                <strong>Note:</strong> Only one admin per tenant is allowed.
                                This action will be logged to the audit trail.
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="action-btn" onClick={closeModal}>
                                Cancel
                            </button>
                            <button
                                className="primary-btn"
                                onClick={handleIssueAccess}
                                disabled={issueMutation.isPending || !adminEmail || !!issueSuccess}
                            >
                                {issueMutation.isPending ? 'Issuing...' : 'Issue Access'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
