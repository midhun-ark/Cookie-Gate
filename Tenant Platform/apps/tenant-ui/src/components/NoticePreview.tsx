import React from 'react';
import { ShieldCheck, Mail } from 'lucide-react';
import { NoticeTranslation } from '@/types';

interface NoticePreviewProps {
    translation: Partial<NoticeTranslation>;
    dpoEmail?: string;
    showLanguageBadge?: boolean;
}

export const NoticePreview: React.FC<NoticePreviewProps> = ({
    translation,
    dpoEmail = 'privacy@example.com',
    showLanguageBadge = true
}) => {
    const {
        title = 'Privacy Notice',
        description = 'We use cookies to improve your experience.',
        dataCategories = [],
        processingPurposes = [],
        rightsDescription = 'You have the right to access, correct, erase your data, and nominate a representative.',
        withdrawalInstruction = 'You can withdraw consent anytime via Account Settings.',
        complaintInstruction = 'Unresolved? You may complain to the Data Protection Board.'
    } = translation;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-2xl mx-auto font-sans text-gray-800">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">{title}</h2>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">DPDPA COMPLIANT • VERSION 1.0</p>
                </div>
                {showLanguageBadge && translation.languageCode && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded uppercase">
                        {translation.languageCode}
                    </span>
                )}
            </div>

            <div className="p-6 space-y-8">
                {/* Description */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">How We Use Your Personal Data</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
                </div>

                {/* Data & Purposes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* We Collect */}
                    <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">We Collect</h4>
                        {dataCategories.length > 0 ? (
                            <ul className="space-y-2">
                                {dataCategories.map((item, idx) => (
                                    <li key={idx} className="flex items-center text-sm text-gray-700">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-400 italic">No categories specified</p>
                        )}
                    </div>

                    {/* To Enable */}
                    <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">To Enable</h4>
                        {processingPurposes.length > 0 ? (
                            <ul className="space-y-2">
                                {processingPurposes.map((item, idx) => (
                                    <li key={idx} className="flex items-center text-sm text-gray-700">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-400 italic">No purposes specified</p>
                        )}
                    </div>
                </div>

                {/* Rights */}
                <div className="rounded-lg border border-gray-100 p-5 flex items-start space-x-3">
                    <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-gray-700 mb-1">YOUR RIGHTS</h4>
                        <p className="text-sm text-gray-600">{rightsDescription}</p>
                    </div>
                </div>

                {/* Withdrawal & Contact */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                    <div className="flex items-start space-x-2 text-sm text-gray-600">
                        <span className="text-green-500 font-bold">✓</span>
                        <p>{withdrawalInstruction}</p>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>Questions? Contact our Grievance Officer at</span>
                        <a href={`mailto:${dpoEmail}`} className="text-blue-600 hover:underline font-medium">{dpoEmail}</a>
                    </div>

                    <div className="text-sm text-gray-500">
                        {complaintInstruction}
                    </div>
                </div>
            </div>

            {/* Footer Buttons Preview */}
            <div className="bg-gray-50 p-4 flex justify-end space-x-3 border-t border-gray-100">
                <button className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 shadow-sm" disabled>
                    Manage Options
                </button>
                <button className="px-4 py-2 bg-indigo-600 rounded text-sm font-medium text-white shadow-sm" disabled>
                    Accept All
                </button>
            </div>
        </div>
    );
};
