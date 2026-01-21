import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, User, Clock, Send, CheckCircle, History
} from 'lucide-react';
import { dprApi, privacyTeamApi } from '@/api';
import type { DPROutcome } from '@/types';
import './DataPrincipalRequests.css';

const STATUS_ACTIONS: Record<string, { label: string; next: string }> = {
    SUBMITTED: { label: 'Start Work', next: 'startWork' },
    WORK_IN_PROGRESS: { label: 'Respond', next: 'respond' },
    RESPONDED: { label: 'Close Request', next: 'close' },
};

export function DataPrincipalRequestDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [showRespondModal, setShowRespondModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'audit'>('details');

    const { data: request, isLoading } = useQuery({
        queryKey: ['dpr-request', id],
        queryFn: () => dprApi.get(id!),
        enabled: !!id,
    });

    const { data: communications } = useQuery({
        queryKey: ['dpr-communications', id],
        queryFn: () => dprApi.getCommunications(id!),
        enabled: !!id && activeTab === 'timeline',
    });

    const { data: auditLog } = useQuery({
        queryKey: ['dpr-audit', id],
        queryFn: () => dprApi.getAuditLog(id!),
        enabled: !!id && activeTab === 'audit',
    });

    const { data: teamMembers } = useQuery({
        queryKey: ['privacy-team-active'],
        queryFn: privacyTeamApi.listActive,
    });

    const startWorkMutation = useMutation({
        mutationFn: () => dprApi.startWork(id!),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dpr-request', id] }),
    });

    const respondMutation = useMutation({
        mutationFn: ({ outcome, reason }: { outcome: DPROutcome; reason: string }) =>
            dprApi.respond(id!, { outcome, reason }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dpr-request', id] });
            setShowRespondModal(false);
        },
    });

    const closeMutation = useMutation({
        mutationFn: () => dprApi.close(id!),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dpr-request', id] }),
    });

    const assignMutation = useMutation({
        mutationFn: (assignedTo: string | null) => dprApi.assign(id!, assignedTo),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dpr-request', id] });
            setShowAssignModal(false);
        },
    });

    const handleAction = () => {
        if (!request) return;
        if (request.status === 'SUBMITTED') {
            startWorkMutation.mutate();
        } else if (request.status === 'WORK_IN_PROGRESS') {
            setShowRespondModal(true);
        } else if (request.status === 'RESPONDED') {
            closeMutation.mutate();
        }
    };

    const handleRespond = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const outcome = (form.elements.namedItem('outcome') as HTMLSelectElement).value as DPROutcome;
        const reason = (form.elements.namedItem('reason') as HTMLTextAreaElement).value;
        respondMutation.mutate({ outcome, reason });
    };

    if (isLoading) {
        return <div className="loading-container"><div className="spinner"></div></div>;
    }

    if (!request) {
        return <div className="error-state">Request not found</div>;
    }

    const slaDate = new Date(request.slaDueDate);
    const daysRemaining = Math.ceil((slaDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return (
        <div className="dpr-detail-page">
            <div className="container">
                <button className="btn btn-ghost back-btn" onClick={() => navigate('/data-principal-requests')}>
                    <ArrowLeft size={18} />
                    Back to Requests
                </button>

                <div className="detail-header">
                    <div className="header-info">
                        <h1>{request.requestNumber}</h1>
                        <span className="type-badge">{request.requestType}</span>
                        <span className={`status-badge status-${request.status.toLowerCase().replace('_', '-')}`}>
                            {request.status.replace('_', ' ')}
                        </span>
                    </div>
                    <div className="header-actions">
                        {STATUS_ACTIONS[request.status] && (
                            <button
                                className="btn btn-primary"
                                onClick={handleAction}
                                disabled={startWorkMutation.isPending || closeMutation.isPending}
                            >
                                {STATUS_ACTIONS[request.status].label}
                            </button>
                        )}
                    </div>
                </div>

                <div className="detail-grid">
                    {/* Left Column - Main Info */}
                    <div className="detail-main">
                        <div className="tabs">
                            <button
                                className={`tab ${activeTab === 'details' ? 'active' : ''}`}
                                onClick={() => setActiveTab('details')}
                            >
                                Details
                            </button>
                            <button
                                className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
                                onClick={() => setActiveTab('timeline')}
                            >
                                <Send size={16} /> Communications
                            </button>
                            <button
                                className={`tab ${activeTab === 'audit' ? 'active' : ''}`}
                                onClick={() => setActiveTab('audit')}
                            >
                                <History size={16} /> Audit Log
                            </button>
                        </div>

                        <div className="tab-content card">
                            {activeTab === 'details' && (
                                <div className="details-content">
                                    <div className="detail-row">
                                        <label>Data Principal Email</label>
                                        <span>{request.dataPrincipalEmail}</span>
                                    </div>
                                    <div className="detail-row">
                                        <label>Request Type</label>
                                        <span>{request.requestType}</span>
                                    </div>
                                    <div className="detail-row">
                                        <label>Submitted</label>
                                        <span>{new Date(request.createdAt).toLocaleString()}</span>
                                    </div>
                                    {request.originalPayload?.description && (
                                        <div className="detail-row full-width">
                                            <label>Description</label>
                                            <p className="description-text">{request.originalPayload.description}</p>
                                        </div>
                                    )}
                                    {request.responseReason && (
                                        <div className="detail-row full-width">
                                            <label>Response</label>
                                            <div className="response-box">
                                                <span className={`outcome-badge outcome-${request.responseOutcome?.toLowerCase()}`}>
                                                    {request.responseOutcome}
                                                </span>
                                                <p>{request.responseReason}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'timeline' && (
                                <div className="timeline-content">
                                    {communications && communications.length > 0 ? (
                                        <div className="timeline">
                                            {communications.map((comm) => (
                                                <div key={comm.id} className={`timeline-item ${comm.direction.toLowerCase()}`}>
                                                    <div className="timeline-marker" />
                                                    <div className="timeline-card">
                                                        <div className="timeline-header">
                                                            <span className="direction-badge">{comm.direction}</span>
                                                            <span className="time">{new Date(comm.sentAt).toLocaleString()}</span>
                                                        </div>
                                                        <strong>{comm.subject}</strong>
                                                        <p>{comm.body}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="empty-tab">No communications yet</p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'audit' && (
                                <div className="audit-content">
                                    {auditLog && auditLog.length > 0 ? (
                                        <table className="audit-table">
                                            <thead>
                                                <tr>
                                                    <th>Time</th>
                                                    <th>Action</th>
                                                    <th>By</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {auditLog.map((entry) => (
                                                    <tr key={entry.id}>
                                                        <td>{new Date(entry.createdAt).toLocaleString()}</td>
                                                        <td>{entry.action.replace(/_/g, ' ')}</td>
                                                        <td>{entry.actorEmail}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p className="empty-tab">No audit entries</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Sidebar */}
                    <div className="detail-sidebar">
                        <div className="card sidebar-card">
                            <h3>SLA</h3>
                            <div className={`sla-display sla-${request.slaState.toLowerCase()}`}>
                                <Clock size={24} />
                                <span className="sla-days">{daysRemaining}</span>
                                <span className="sla-label">days remaining</span>
                            </div>
                            <p className="sla-due">Due: {slaDate.toLocaleDateString()}</p>
                        </div>

                        <div className="card sidebar-card">
                            <h3>Assigned To</h3>
                            {request.assigneeName ? (
                                <div className="assignee-display">
                                    <User size={20} />
                                    <span>{request.assigneeName}</span>
                                </div>
                            ) : (
                                <p className="unassigned">Not assigned</p>
                            )}
                            <button className="btn btn-secondary btn-sm" onClick={() => setShowAssignModal(true)}>
                                {request.assignedTo ? 'Reassign' : 'Assign'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Respond Modal */}
                {showRespondModal && (
                    <div className="modal-overlay" onClick={() => setShowRespondModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Respond to Request</h2>
                            </div>
                            <form onSubmit={handleRespond}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Outcome *</label>
                                        <select name="outcome" className="form-input form-select" required>
                                            <option value="FULFILLED">Fulfilled</option>
                                            <option value="PARTIALLY_FULFILLED">Partially Fulfilled</option>
                                            <option value="REJECTED">Rejected</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Response / Reason *</label>
                                        <textarea
                                            name="reason"
                                            className="form-input"
                                            rows={4}
                                            required
                                            placeholder="Provide details about your response..."
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowRespondModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={respondMutation.isPending}>
                                        {respondMutation.isPending ? 'Sending...' : 'Send Response'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Assign Modal */}
                {showAssignModal && (
                    <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Assign Request</h2>
                            </div>
                            <div className="modal-body">
                                <div className="team-list">
                                    <button
                                        className="team-option"
                                        onClick={() => assignMutation.mutate(null)}
                                    >
                                        <User size={20} />
                                        <span>Unassigned</span>
                                    </button>
                                    {teamMembers?.map((member) => (
                                        <button
                                            key={member.id}
                                            className={`team-option ${request.assignedTo === member.id ? 'selected' : ''}`}
                                            onClick={() => assignMutation.mutate(member.id)}
                                        >
                                            <User size={20} />
                                            <span>{member.fullName}</span>
                                            {request.assignedTo === member.id && <CheckCircle size={16} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
