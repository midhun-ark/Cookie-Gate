import { Copy, Terminal, CheckCircle, ExternalLink, Code } from 'lucide-react';
import type { Website } from '@/types';
import { useState } from 'react';

export function InstallTab({ website }: { website: Website }) {
    const [copied, setCopied] = useState(false);

    const SCRIPT_URL = import.meta.env.DEV
        ? 'http://localhost:3001/public/loader.js'
        : 'https://cdn.complyark.com/loader.js';

    const snippet = `<script>
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  '${SCRIPT_URL}?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','${website.id}');
</script>`;

    const handleCopy = () => {
        navigator.clipboard.writeText(snippet);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{ maxWidth: '700px' }}>
            {/* Header */}
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>Install Integration</h2>
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    Add the following code to your website's <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>&lt;head&gt;</code> tag to enable the consent banner.
                </p>
            </div>

            {/* Code Snippet Card */}
            <div style={{ background: '#1e1e1e', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#2d2d2d', borderBottom: '1px solid #3e3e3e' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '12px' }}>
                        <Terminal style={{ width: '14px', height: '14px' }} />
                        <span>HTML Snippet</span>
                    </div>
                    <button
                        onClick={handleCopy}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', fontSize: '11px', background: copied ? '#22c55e' : '#3e3e3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'background 0.2s' }}
                    >
                        {copied ? (
                            <><CheckCircle style={{ width: '12px', height: '12px' }} /> Copied!</>
                        ) : (
                            <><Copy style={{ width: '12px', height: '12px' }} /> Copy Code</>
                        )}
                    </button>
                </div>
                <div style={{ padding: '16px', overflowX: 'auto' }}>
                    <pre style={{ margin: 0, fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '12px', lineHeight: 1.6, color: '#d4d4d4' }}>
                        {snippet}
                    </pre>
                </div>
            </div>

            {/* Instructions */}
            <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Code style={{ width: '16px', height: '16px', color: '#4f46e5' }} />
                    Installation Steps
                </h3>
                <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#374151', lineHeight: 1.8 }}>
                        <li>Copy the code snippet above</li>
                        <li>Paste it inside the <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: '3px', fontSize: '11px' }}>&lt;head&gt;</code> section of your HTML</li>
                        <li>Place it before any other scripts for best performance</li>
                        <li>Deploy your changes to production</li>
                    </ol>
                </div>
            </div>

            {/* Verification Status */}
            <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>Verification Status</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: website.status === 'ACTIVE' ? '#f0fdf4' : '#f9fafb', borderRadius: '10px', border: `1px solid ${website.status === 'ACTIVE' ? '#bbf7d0' : '#e5e7eb'}`, padding: '16px 20px' }}>
                    <div>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Status:
                            <span style={{ color: website.status === 'ACTIVE' ? '#16a34a' : '#d97706' }}>
                                {website.status === 'ACTIVE' ? 'Live' : 'Waiting for setup'}
                            </span>
                        </p>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                            {website.status === 'ACTIVE'
                                ? 'The banner should be visible on your website.'
                                : 'Complete the setup in the other tabs and click "Activate" to go live.'}
                        </p>
                    </div>
                    {website.status === 'ACTIVE' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.2)' }}></div>
                            <a
                                href={`https://${website.domain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '12px', color: '#4f46e5', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                Visit Site <ExternalLink style={{ width: '12px', height: '12px' }} />
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Website ID Info */}
            <div style={{ marginTop: '20px', padding: '12px 16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Website ID</span>
                    <code style={{ fontSize: '11px', fontFamily: 'monospace', color: '#374151', background: '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>{website.id}</code>
                </div>
            </div>
        </div>
    );
}
