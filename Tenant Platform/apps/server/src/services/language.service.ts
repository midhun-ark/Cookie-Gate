
import { SupportedLanguage } from '../types';

/**
 * Language Service.
 * Handles supported languages for translations.
 */
const now = new Date();
const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
    { code: 'en', name: 'English', nativeName: 'English', isRtl: false, isActive: true, createdAt: now },
    { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', isRtl: false, isActive: true, createdAt: now },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', isRtl: false, isActive: true, createdAt: now },
    { code: 'brx', name: 'Bodo', nativeName: 'बर\'', isRtl: false, isActive: true, createdAt: now },
    { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', isRtl: false, isActive: true, createdAt: now },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', isRtl: false, isActive: true, createdAt: now },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', isRtl: false, isActive: true, createdAt: now },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', isRtl: false, isActive: true, createdAt: now },
    { code: 'ks', name: 'Kashmiri', nativeName: 'कश्मीरी / كشميري', isRtl: true, isActive: true, createdAt: now },
    { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', isRtl: false, isActive: true, createdAt: now },
    { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', isRtl: false, isActive: true, createdAt: now },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', isRtl: false, isActive: true, createdAt: now },
    { code: 'mni', name: 'Manipuri', nativeName: 'মৈতৈলোন্', isRtl: false, isActive: true, createdAt: now },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी', isRtl: false, isActive: true, createdAt: now },
    { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', isRtl: false, isActive: true, createdAt: now },
    { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', isRtl: false, isActive: true, createdAt: now },
    { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', isRtl: false, isActive: true, createdAt: now },
    { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', isRtl: false, isActive: true, createdAt: now },
    { code: 'sat', name: 'Santhali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', isRtl: false, isActive: true, createdAt: now },
    { code: 'sd', name: 'Sindhi', nativeName: 'सिन्धी / سنڌي', isRtl: true, isActive: true, createdAt: now },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', isRtl: false, isActive: true, createdAt: now },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', isRtl: false, isActive: true, createdAt: now },
    { code: 'ur', name: 'Urdu', nativeName: 'اُردُو', isRtl: true, isActive: true, createdAt: now },
].sort((a, b) => (a.code === 'en' ? -1 : a.name.localeCompare(b.name)));

export const languageService = {
    /**
     * Get all supported languages
     */
    async getAll(): Promise<SupportedLanguage[]> {
        return SUPPORTED_LANGUAGES;
    },

    /**
     * Get language by code
     */
    async getByCode(code: string): Promise<SupportedLanguage | null> {
        return SUPPORTED_LANGUAGES.find((l) => l.code === code) || null;
    },

    /**
     * Validate language code
     */
    async isValid(code: string): Promise<boolean> {
        return SUPPORTED_LANGUAGES.some((l) => l.code === code);
    },

    /**
     * Get language name for code
     */
    async getLanguageName(code: string): Promise<string> {
        const language = SUPPORTED_LANGUAGES.find((l) => l.code === code);
        return language?.name || code;
    },
};
