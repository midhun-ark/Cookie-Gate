import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { privacyTeamApi } from '@/api';
import type { PrivacyTeamMember, TeamMemberRole } from '@/types';
import './PrivacyTeam.css';

export function PrivacyTeamPage() {
    const [showModal, setShowModal] = useState(false);
    const [editingMember, setEditingMember] = useState<PrivacyTeamMember | null>(null);
    const queryClient = useQueryClient();

    const { data: members, isLoading } = useQuery({
        queryKey: ['privacy-team'],
        queryFn: privacyTeamApi.list,
    });

    const createMutation = useMutation({
        mutationFn: privacyTeamApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['privacy-team'] });
            setShowModal(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<PrivacyTeamMember> }) =>
            privacyTeamApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['privacy-team'] });
            setEditingMember(null);
            setShowModal(false);
        },
    });

    const toggleMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
            privacyTeamApi.toggleStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['privacy-team'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: privacyTeamApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['privacy-team'] });
        },
    });

    const handleOpenModal = (member?: PrivacyTeamMember) => {
        setEditingMember(member || null);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setEditingMember(null);
        setShowModal(false);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = {
            fullName: (form.elements.namedItem('fullName') as HTMLInputElement).value,
            email: (form.elements.namedItem('email') as HTMLInputElement).value,
            role: (form.elements.namedItem('role') as HTMLSelectElement).value as TeamMemberRole,
        };

        if (editingMember) {
            updateMutation.mutate({ id: editingMember.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleToggle = (member: PrivacyTeamMember) => {
        const newStatus = member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        toggleMutation.mutate({ id: member.id, status: newStatus });
    };

    const handleDelete = (member: PrivacyTeamMember) => {
        if (confirm(`Delete team member "${member.fullName}"?`)) {
            deleteMutation.mutate(member.id);
        }
    };

    return (
        <div className="privacy-team-page">
            <div className="container">
                <div className="page-header">
                    <div>
                        <h1>Privacy Team</h1>
                        <p className="text-gray-500">Manage team members for request handling</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        <Plus size={18} />
                        Add Member
                    </button>
                </div>

                <div className="card">
                    {isLoading ? (
                        <div className="loading-container">
                            <div className="spinner"></div>
                        </div>
                    ) : members && members.length > 0 ? (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((member) => (
                                    <tr key={member.id}>
                                        <td className="font-medium">{member.fullName}</td>
                                        <td>{member.email}</td>
                                        <td>
                                            <span className={`role-badge role-${member.role.toLowerCase()}`}>
                                                {member.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge status-${member.status.toLowerCase()}`}>
                                                {member.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="btn btn-ghost btn-icon"
                                                    onClick={() => handleToggle(member)}
                                                    title={member.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                                >
                                                    {member.status === 'ACTIVE' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-icon"
                                                    onClick={() => handleOpenModal(member)}
                                                    title="Edit"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-icon btn-danger"
                                                    onClick={() => handleDelete(member)}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="empty-state">
                            <Users size={48} className="empty-state-icon" />
                            <h3 className="empty-state-title">No team members</h3>
                            <p className="empty-state-description">
                                Add team members to handle data principal requests
                            </p>
                            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                                <Plus size={18} />
                                Add First Member
                            </button>
                        </div>
                    )}
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={handleCloseModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>{editingMember ? 'Edit Team Member' : 'Add Team Member'}</h2>
                                <button className="btn btn-ghost btn-icon" onClick={handleCloseModal}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Full Name *</label>
                                        <input
                                            type="text"
                                            name="fullName"
                                            className="form-input"
                                            defaultValue={editingMember?.fullName}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Email *</label>
                                        <input
                                            type="email"
                                            name="email"
                                            className="form-input"
                                            defaultValue={editingMember?.email}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Role *</label>
                                        <select
                                            name="role"
                                            className="form-input form-select"
                                            defaultValue={editingMember?.role || 'STAFF'}
                                            required
                                        >
                                            <option value="STAFF">Staff</option>
                                            <option value="ADMIN">Admin</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-ghost" onClick={handleCloseModal}>
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={createMutation.isPending || updateMutation.isPending}
                                    >
                                        {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
