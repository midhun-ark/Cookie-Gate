
interface TranslationRequest {
    inputs: string;
}

interface TranslationResponse {
    translation_text: string;
}

export class TranslationService {
    private readonly apiUrl: string;
    private readonly apiToken: string;

    constructor() {
        this.apiUrl = process.env.HF_TRANSLATION_API_URL || 'https://api-inference.huggingface.co/models/Helsinki-NLP/opus-mt-en-';
        this.apiToken = process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY || '';
    }

    private getIndicTrans2LangCode(code: string): string {
        const mapping: Record<string, string> = {
            'en': 'eng_Latn',
            'as': 'asm_Beng',
            'bn': 'ben_Beng',
            'brx': 'brx_Deva',
            'doi': 'doi_Deva',
            'gu': 'guj_Gujr',
            'hi': 'hin_Deva',
            'kn': 'kan_Knda',
            'ks': 'kas_Arab', // Defaulting to Arabic script for Kashmiri. Alternatively kas_Deva
            'kok': 'gom_Deva', // Konkani (Goan)
            'mai': 'mai_Deva',
            'ml': 'mal_Mlym',
            'mni': 'mni_Beng', // Manipuri in Bengali script is common (or mni_Mtei)
            'mr': 'mar_Deva',
            'ne': 'npi_Deva',
            'or': 'ory_Orya',
            'pa': 'pan_Guru',
            'sa': 'san_Deva',
            'sat': 'sat_Olck', // Santhali in Ol Chiki
            'sd': 'snd_Arab', // Sindhi in Arabic script
            'ta': 'tam_Taml',
            'te': 'tel_Telu',
            'ur': 'urd_Arab'
        };
        return mapping[code] || code;
    }

    async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
        if (!this.apiToken) {
            throw new Error('Translation service is not configured (missing API token)');
        }

        const isCustomEndpoint = !this.apiUrl.includes('models/Helsinki-NLP');

        let modelUrl = this.apiUrl;
        let payload: any = { inputs: text };

        if (isCustomEndpoint) {
            // Custom endpoint Logic (Verified via probe)
            // Path: /translate
            // Payload: { text, source_lang, target_lang }

            // Ensure we don't double slash if apiUrl ends with /
            const baseUrl = this.apiUrl.endsWith('/') ? this.apiUrl.slice(0, -1) : this.apiUrl;
            modelUrl = `${baseUrl}/translate`;

            payload = {
                text: text,
                source_lang: this.getIndicTrans2LangCode(sourceLang),
                target_lang: this.getIndicTrans2LangCode(targetLang)
            };
        } else {
            // Standard Helsinki-NLP type endpoint
            if (this.apiUrl.includes('models/Helsinki-NLP') || this.apiUrl.endsWith('-')) {
                modelUrl = `${this.apiUrl}${targetLang}`;
            }
        }

        try {
            const response = await fetch(modelUrl, {
                headers: {
                    Authorization: `Bearer ${this.apiToken}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                // 405 Method Not Allowed often means wrong path. 
                // If it's a Gradio space, we might need to wrap in { data: [...] } and post to /api/predict
                // But for now, let's try this standard inference payload structure.
                throw new Error(`Translation API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json() as any;

            // Handle Verified Custom Response: { "translated_text": "..." }
            if (result.translated_text) return result.translated_text;

            // Handle Standard HF: [{ translation_text: "..." }]
            if (Array.isArray(result) && result.length > 0) {
                // Check for various keys
                if (result[0].translation_text) return result[0].translation_text;
                if (result[0].generated_text) return result[0].generated_text;
                // If it returns just the string (some custom APIs)
                if (typeof result[0] === 'string') return result[0];
            } else if (result.generated_text) {
                return result.generated_text;
            } else if (Array.isArray(result.data)) {
                // Gradio response format
                return result.data[0];
            }

            throw new Error('Invalid response format from translation API');

        } catch (error) {
            console.error("Translation failed:", error);
            throw error;
        }
    }
}

export const translationService = new TranslationService();
