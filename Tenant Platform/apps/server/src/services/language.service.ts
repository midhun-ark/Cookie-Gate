import { languageRepository } from '../repositories';
import { SupportedLanguage } from '../types';

/**
 * Language Service.
 * Handles supported languages for translations.
 */
export const languageService = {
    /**
     * Get all supported languages
     */
    async getAll(): Promise<SupportedLanguage[]> {
        return languageRepository.findAll();
    },

    /**
     * Get language by code
     */
    async getByCode(code: string): Promise<SupportedLanguage | null> {
        return languageRepository.findByCode(code);
    },

    /**
     * Validate language code
     */
    async isValid(code: string): Promise<boolean> {
        return languageRepository.isValidLanguageCode(code);
    },

    /**
     * Get language name for code
     */
    async getLanguageName(code: string): Promise<string> {
        const language = await languageRepository.findByCode(code);
        return language?.name || code;
    },
};
