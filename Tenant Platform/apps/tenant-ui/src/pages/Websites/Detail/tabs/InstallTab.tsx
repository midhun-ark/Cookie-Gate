import { Copy, Terminal, CheckCircle, ExternalLink, Code, AlertTriangle, Shield } from 'lucide-react';
import type { Website } from '@/types';
import { useState } from 'react';

export function InstallTab({ website }: { website: Website }) {
    const [copied, setCopied] = useState<string | null>(null);

    const SCRIPT_URL = import.meta.env.DEV
        ? 'http://localhost:3001/public/loader.js'
        : 'https://cdn.complyark.com/loader.js';

    // Simple, correct loader snippet
    const loaderSnippet = `<script src="${SCRIPT_URL}?id=${website.id}"></script>`;

    // Example: External script blocking
    const externalScriptExample = `<!-- ❌ BEFORE: Runs immediately, collects data before consent -->
<script src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>

<!-- ✅ AFTER: Blocked until user consents to "analytics" purpose -->
<script type="text/plain" data-purpose="analytics" src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>`;

    // Example: Inline script blocking
    const inlineScriptExample = `<!-- ❌ BEFORE: Executes immediately -->
<script>
  fbq('init', 'PIXEL_ID');
  fbq('track', 'PageView');
</script>

<!-- ✅ AFTER: Blocked until user consents to "marketing" -->
<script type="text/plain" data-purpose="marketing">
  fbq('init', 'PIXEL_ID');
  fbq('track', 'PageView');
</script>`;

    // Example: Tracking pixel blocking
    const pixelExample = `<!-- ❌ BEFORE: Fires immediately -->
<img src="https://tracking.example.com/pixel.gif" />

<!-- ✅ AFTER: Blocked until consented -->
<img data-src="https://tracking.example.com/pixel.gif" data-purpose="marketing" />`;

    // Example: Iframe blocking
    const iframeExample = `<!-- ❌ BEFORE: Loads immediately -->
<iframe src="https://www.youtube.com/embed/VIDEO_ID"></iframe>

<!-- ✅ AFTER: Blocked until consented -->
<iframe data-src="https://www.youtube.com/embed/VIDEO_ID" data-purpose="marketing"></iframe>`;

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div style={{ maxWidth: '800px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>Installation Guide</h2>
                <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                    Add the ComplyArk loader to your website and mark your scripts for consent management.
                </p>
            </div>

            {/* Step 1: Add Loader */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600 }}>1</div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>Add the Loader Script</h3>
                </div>
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px', marginLeft: '38px' }}>
                    Add this script to your website's <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>&lt;head&gt;</code> tag, before any other scripts.
                </p>
                <CodeBlock code={loaderSnippet} language="html" copied={copied === 'loader'} onCopy={() => handleCopy(loaderSnippet, 'loader')} />
            </div>

            {/* Step 2: Mark Your Scripts */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600 }}>2</div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>Mark Your Scripts for Blocking</h3>
                </div>
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px', marginLeft: '38px' }}>
                    Modify your tracking scripts to use <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>type="text/plain"</code> and add a <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>data-purpose</code> attribute.
                </p>

                {/* Important Notice */}
                <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px', marginLeft: '38px', display: 'flex', gap: '12px' }}>
                    <AlertTriangle style={{ width: '18px', height: '18px', color: '#d97706', flexShrink: 0, marginTop: '1px' }} />
                    <div>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#92400e', margin: 0 }}>Critical: Use Exact Purpose Tags</p>
                        <p style={{ fontSize: '12px', color: '#92400e', margin: '4px 0 0', opacity: 0.9 }}>
                            The <code style={{ background: 'rgba(0,0,0,0.1)', padding: '1px 4px', borderRadius: '3px' }}>data-purpose</code> value must exactly match a Purpose Tag defined in the Purposes tab. Scripts with unknown purposes are blocked forever.
                        </p>
                    </div>
                </div>

                {/* Examples */}
                <div style={{ marginLeft: '38px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>External Scripts (e.g., Google Analytics)</div>
                        <CodeBlock code={externalScriptExample} language="html" copied={copied === 'external'} onCopy={() => handleCopy(externalScriptExample, 'external')} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Inline Scripts (e.g., Facebook Pixel)</div>
                        <CodeBlock code={inlineScriptExample} language="html" copied={copied === 'inline'} onCopy={() => handleCopy(inlineScriptExample, 'inline')} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Tracking Pixels</div>
                        <CodeBlock code={pixelExample} language="html" copied={copied === 'pixel'} onCopy={() => handleCopy(pixelExample, 'pixel')} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Iframes (e.g., YouTube, Social Embeds)</div>
                        <CodeBlock code={iframeExample} language="html" copied={copied === 'iframe'} onCopy={() => handleCopy(iframeExample, 'iframe')} />
                    </div>
                </div>
            </div>

            {/* Step 3: JavaScript API */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600 }}>3</div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>JavaScript API (Optional)</h3>
                </div>
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px', marginLeft: '38px' }}>
                    Use the ComplyArk API to programmatically manage consent.
                </p>
                <CodeBlock
                    code={`// Open settings panel
ComplyArk.openSettings();

// Check if a purpose has consent
if (ComplyArk.hasConsent('analytics')) {
    // Run analytics code
}

// Get all consent decisions
const consent = ComplyArk.getConsent();
// { analytics: true, marketing: false, ... }

// Withdraw consent (re-shows banner)
ComplyArk.withdrawConsent();`}
                    language="javascript"
                    copied={copied === 'api'}
                    onCopy={() => handleCopy('ComplyArk.openSettings();\nComplyArk.hasConsent("analytics");\nComplyArk.getConsent();\nComplyArk.withdrawConsent();', 'api')}
                />
            </div>

            {/* Verification Status */}
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield style={{ width: '16px', height: '16px', color: '#4f46e5' }} />
                    Verification Status
                </h3>
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
                                ? 'The consent banner should be visible on your website.'
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
            <div style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Website ID</span>
                    <code style={{ fontSize: '11px', fontFamily: 'monospace', color: '#374151', background: '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>{website.id}</code>
                </div>
            </div>
        </div>
    );
}

// Code Block Component
function CodeBlock({ code, language, copied, onCopy }: { code: string; language: string; copied: boolean; onCopy: () => void }) {
    return (
        <div style={{ background: '#1e1e1e', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#2d2d2d', borderBottom: '1px solid #3e3e3e' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '12px' }}>
                    <Terminal style={{ width: '14px', height: '14px' }} />
                    <span>{language.toUpperCase()}</span>
                </div>
                <button
                    onClick={onCopy}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', fontSize: '11px', background: copied ? '#22c55e' : '#3e3e3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'background 0.2s' }}
                >
                    {copied ? (
                        <><CheckCircle style={{ width: '12px', height: '12px' }} /> Copied!</>
                    ) : (
                        <><Copy style={{ width: '12px', height: '12px' }} /> Copy</>
                    )}
                </button>
            </div>
            <div style={{ padding: '16px', overflowX: 'auto' }}>
                <pre style={{ margin: 0, fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '12px', lineHeight: 1.6, color: '#d4d4d4', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {code}
                </pre>
            </div>
        </div>
    );
}
