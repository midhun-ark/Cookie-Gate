import { ChevronDown, Globe } from 'lucide-react';
import type { SupportedLanguage } from '@/types';

interface LanguageSelectorProps {
    selectedLang: string;
    onSelect: (lang: string) => void;
    languages?: SupportedLanguage[];
    disabled?: boolean;
}

export function LanguageSelector({
    selectedLang,
    onSelect,
    languages = [],
    disabled = false,
}: LanguageSelectorProps) {


    return (
        <div className="relative inline-block w-64">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <Globe size={16} />
                </div>
                <select
                    value={selectedLang}
                    onChange={(e) => onSelect(e.target.value)}
                    disabled={disabled}
                    className="appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pl-10 pr-10 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:text-gray-400 transition-colors cursor-pointer"
                >
                    {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                            {lang.name} ({lang.nativeName})
                        </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500">
                    <ChevronDown size={16} />
                </div>
            </div>
        </div>
    );
}
