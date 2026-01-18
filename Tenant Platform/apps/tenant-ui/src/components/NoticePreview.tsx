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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden max-w-xl mx-auto font-sans text-gray-800">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-start">
                <div>
                    <h2 className="text-base font-bold text-gray-900 mb-0.5">{title}</h2>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">DPDPA Compliant</p>
                </div>
                {showLanguageBadge && translation.languageCode && (
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded uppercase">
                        {translation.languageCode}
                    </span>
                )}
            </div>

            <div className="px-5 py-4 space-y-5">
                {/* Description */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1.5">How We Use Your Personal Data</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
                </div>

                {/* Data & Purposes Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {/* We Collect */}
                    <div className="bg-gray-50 rounded-md p-3 border border-gray-100">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">We Collect</h4>
                        {dataCategories.length > 0 ? (
                            <ul className="space-y-1">
                                {dataCategories.map((item, idx) => (
                                    <li key={idx} className="flex items-center text-xs text-gray-600">
                                        <span className="w-1 h-1 bg-gray-400 rounded-full mr-1.5"></span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-gray-400 italic">No categories specified</p>
                        )}
                    </div>

                    {/* To Enable */}
                    <div className="bg-gray-50 rounded-md p-3 border border-gray-100">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">To Enable</h4>
                        {processingPurposes.length > 0 ? (
                            <ul className="space-y-1">
                                {processingPurposes.map((item, idx) => (
                                    <li key={idx} className="flex items-center text-xs text-gray-600">
                                        <span className="w-1 h-1 bg-gray-400 rounded-full mr-1.5"></span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-gray-400 italic">No purposes specified</p>
                        )}
                    </div>
                </div>

                {/* Rights */}
                <div className="rounded-md border border-gray-100 p-3 flex items-start space-x-2">
                    <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-xs font-bold text-gray-700 mb-0.5">Your Rights</h4>
                        <p className="text-xs text-gray-600">{rightsDescription}</p>
                    </div>
                </div>

                {/* Withdrawal & Contact */}
                <div className="space-y-2 pt-3 border-t border-gray-100">
                    <div className="flex items-start space-x-1.5 text-xs text-gray-600">
                        <span className="text-green-500 font-bold">✓</span>
                        <p>{withdrawalInstruction}</p>
                    </div>

                    <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span>DPO Contact:</span>
                        <a href={`mailto:${dpoEmail}`} className="text-blue-600 hover:underline font-medium">{dpoEmail}</a>
                    </div>

                    <div className="text-xs text-gray-500">
                        {complaintInstruction}
                    </div>
                </div>
            </div>

            {/* Footer Buttons Preview */}
            <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-2 border-t border-gray-100">
                <button className="px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-600" disabled>
                    Manage
                </button>
                <button className="px-3 py-1.5 bg-indigo-600 rounded text-xs font-medium text-white" disabled>
                    Accept All
                </button>
            </div>

            <div className="px-4 py-2 text-center">
                <a href="#" className="text-[10px] text-indigo-600 hover:underline">Read Full Policy</a>
            </div>
        </div>
    );
};
