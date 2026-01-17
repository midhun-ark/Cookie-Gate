import { Copy, Terminal } from 'lucide-react';
import type { Website } from '@/types';
import { useState } from 'react';

export function InstallTab({ website }: { website: Website }) {
    const [copied, setCopied] = useState(false);

    // This would ideally come from an environment variable or config
    const SCRIPT_URL = 'https://cdn.complyark.com/loader.js';

    // The snippet
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
        <div>
            <div className="tab-header">
                <h2 className="tab-title">Install Integration</h2>
                <p className="tab-description">
                    Add the following code to your website's <code>&lt;head&gt;</code> tag to enable the consent banner.
                </p>
            </div>

            <div className="card p-0 overflow-hidden bg-[#1e1e1e] text-white">
                <div className="flex justify-between items-center p-3 bg-[#2d2d2d] border-b border-[#3e3e3e]">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Terminal size={14} />
                        <span>HTML Snippet</span>
                    </div>
                    <button
                        className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white transition-colors"
                        onClick={handleCopy}
                    >
                        {copied ? (
                            <>Copied!</>
                        ) : (
                            <><Copy size={12} /> Copy Code</>
                        )}
                    </button>
                </div>
                <div className="p-4 overflow-x-auto">
                    <pre className="font-mono text-sm leading-relaxed text-[#d4d4d4]">
                        {snippet}
                    </pre>
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-lg font-semibold mb-3">Verification</h3>
                <div className="card bg-gray-50 flex items-center justify-between">
                    <div>
                        <p className="font-medium text-gray-900">Status: {website.status === 'ACTIVE' ? 'Live' : 'Waiting for setup'}</p>
                        <p className="text-sm text-gray-500 mt-1">
                            {website.status === 'ACTIVE'
                                ? 'The banner should be visible on your website.'
                                : 'Complete the setup in the other tabs and click "Activate" to go live.'}
                        </p>
                    </div>
                    {website.status === 'ACTIVE' && (
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    )}
                </div>
            </div>
        </div>
    );
}
