import { useQuery } from '@tanstack/react-query';
import { client } from '../api/client';

interface AuditLog {
    id: string;
    actor_id: string;
    action: string;
    metadata: any;
    created_at: string;
}

export function AuditLogs() {
    const { data: logs, isLoading } = useQuery({
        queryKey: ['audit-logs'],
        queryFn: async () => {
            const res = await client.get('/audit-logs');
            return res.data.logs as AuditLog[];
        }
    });

    if (isLoading) return <div>Loading logs...</div>;

    return (
        <div>
            <div className="page-header">
                <h2>Audit Logs (Immutable)</h2>
            </div>

            <table className="data-table">
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>Action</th>
                        <th>Actor ID</th>
                        <th>Metadata</th>
                    </tr>
                </thead>
                <tbody>
                    {logs?.map((log) => (
                        <tr key={log.id}>
                            <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                                {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td>
                                <span style={{
                                    fontWeight: 600,
                                    color: log.action.includes('FAILURE') ? 'var(--danger)' : 'var(--primary)'
                                }}>
                                    {log.action}
                                </span>
                            </td>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{log.actor_id}</td>
                            <td>
                                <pre style={{
                                    margin: 0,
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                    maxWidth: '400px',
                                    overflowX: 'auto'
                                }}>
                                    {JSON.stringify(log.metadata)}
                                </pre>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
