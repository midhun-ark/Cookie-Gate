import { api } from './client';

export const translationApi = {
    translate: async (text: string, sourceLang: string, targetLang: string) => {
        // api baseURL is already '/tenant', so we request '/translate'
        const { data } = await api.post('/translate', { text, sourceLang, targetLang });
        return data.translation;
    }
};
