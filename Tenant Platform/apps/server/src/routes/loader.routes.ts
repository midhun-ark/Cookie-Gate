import { FastifyInstance } from 'fastify';

export async function loaderRoutes(app: FastifyInstance) {
    app.get('/public/loader.js', async (request, reply) => {
        const { id } = request.query as { id: string };

        // Get the base URL for API calls (from request origin or default)
        const host = request.headers.host || 'localhost:3001';
        const protocol = request.protocol || 'http';
        const baseUrl = `${protocol}://${host}`;

        /**
         * ComplyArk Loader - Multi-Language Runtime Implementation
         * 
         * This loader script is injected into third-party websites to:
         * 1. Fetch website configuration from the runtime API
         * 2. Detect/resolve user's preferred language
         * 3. Render consent banner and settings in the correct language
         * 4. Save consent with language preference
         * 
         * STRICT RULES ENFORCED:
         * - Language selection is END-USER driven
         * - No hardcoded notice text or purpose labels
         * - English MUST always exist (fail-safe)
         * - Fail closed if translations are missing
         * - No backend writes from loader
         */

        const scriptContent = `
(function() {
    'use strict';

    // ============================================================================
    // CONSTANTS & STORAGE KEYS
    // ============================================================================
    
    var CONSENT_KEY = '__complyark_consent__';       // Stores user consent preferences
    var LANGUAGE_KEY = '__complyark_user_lang__';    // Stores selected language
    var SITE_ID = "${id || ''}";                     // Website ID from script parameter
    var API_BASE = "${baseUrl}";                     // Base URL for API calls
    
    console.log('[ComplyArk] Initializing multi-language loader...');
    console.log('[ComplyArk] Site ID:', SITE_ID);

    // ============================================================================
    // GUARD: Prevent duplicate initialization
    // ============================================================================
    
    if (document.getElementById('complyark-banner') || window.__complyarkInitialized) {
        console.log('[ComplyArk] Already initialized, skipping.');
        return;
    }
    window.__complyarkInitialized = true;

    // ============================================================================
    // GUARD: Site ID is required
    // ============================================================================
    
    if (!SITE_ID) {
        console.error('[ComplyArk] No site_id provided. Banner will not be shown.');
        return;
    }

    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================
    
    var state = {
        config: null,              // Runtime config from API
        resolvedLanguage: 'en',    // Resolved language code
        purposes: {},              // Purpose consent state { purposeId: boolean }
        bannerElement: null,       // Reference to banner DOM element
        settingsElement: null      // Reference to settings panel DOM element
    };

    // ============================================================================
    // LANGUAGE RESOLUTION
    // Language selection is END-USER driven. Resolution order:
    // 1. Previously selected language (localStorage)
    // 2. Browser language (navigator.language)
    // 3. defaultLanguage from config
    // 4. English ("en") - mandatory fallback
    // ============================================================================

    function resolveLanguage(config) {
        var supportedLanguages = config.supportedLanguages || ['en'];
        var defaultLanguage = config.defaultLanguage || 'en';

        console.log('[ComplyArk] Supported languages:', supportedLanguages);

        // 1. Check localStorage for previously selected language
        var storedLang = null;
        try {
            storedLang = localStorage.getItem(LANGUAGE_KEY);
        } catch (e) {
            console.warn('[ComplyArk] Cannot access localStorage:', e);
        }

        if (storedLang && supportedLanguages.indexOf(storedLang) !== -1) {
            console.log('[ComplyArk] Using stored language:', storedLang);
            return storedLang;
        }

        // 2. Check browser language (navigator.language returns e.g., "en-US", we need "en")
        var browserLang = navigator.language || navigator.userLanguage || '';
        var shortLang = browserLang.split('-')[0].toLowerCase();

        if (shortLang && supportedLanguages.indexOf(shortLang) !== -1) {
            console.log('[ComplyArk] Using browser language:', shortLang);
            persistLanguage(shortLang);
            return shortLang;
        }

        // 3. Use default language from config
        if (supportedLanguages.indexOf(defaultLanguage) !== -1) {
            console.log('[ComplyArk] Using default language:', defaultLanguage);
            persistLanguage(defaultLanguage);
            return defaultLanguage;
        }

        // 4. Fallback to English (always mandatory)
        console.log('[ComplyArk] Falling back to English');
        persistLanguage('en');
        return 'en';
    }

    function persistLanguage(langCode) {
        try {
            localStorage.setItem(LANGUAGE_KEY, langCode);
        } catch (e) {
            console.warn('[ComplyArk] Cannot persist language to localStorage:', e);
        }
    }

    // ============================================================================
    // TRANSLATION HELPERS
    // Get translated text with English fallback. Never display untranslated content.
    // ============================================================================

    function getNoticeTranslation(noticeData, langCode) {
        // Try resolved language first
        if (noticeData[langCode]) {
            return noticeData[langCode];
        }
        // Fallback to English (required to exist)
        if (noticeData['en']) {
            console.warn('[ComplyArk] Notice translation missing for ' + langCode + ', using English');
            return noticeData['en'];
        }
        // This should never happen if API validation is correct
        console.error('[ComplyArk] No English notice translation found!');
        return null;
    }

    function getPurposeTranslation(labels, langCode) {
        // Try resolved language first
        if (labels[langCode]) {
            return labels[langCode];
        }
        // Fallback to English (required for essential purposes)
        if (labels['en']) {
            console.warn('[ComplyArk] Purpose translation missing for ' + langCode + ', using English');
            return labels['en'];
        }
        // This should never happen if API validation is correct
        console.error('[ComplyArk] No English purpose translation found!');
        return null;
    }

    // ============================================================================
    // CONSENT MANAGEMENT
    // ============================================================================

    function loadExistingConsent() {
        try {
            var stored = localStorage.getItem(CONSENT_KEY);
            if (stored) {
                var consent = JSON.parse(stored);
                console.log('[ComplyArk] Loaded existing consent:', consent);
                return consent;
            }
        } catch (e) {
            console.warn('[ComplyArk] Cannot load consent from localStorage:', e);
        }
        return null;
    }

    function saveConsent(purposes) {
        var consent = {
            purposes: purposes,
            language: state.resolvedLanguage,
            timestamp: Date.now()
        };

        try {
            localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
            console.log('[ComplyArk] Consent saved:', consent);
        } catch (e) {
            console.error('[ComplyArk] Cannot save consent to localStorage:', e);
        }

        // Dispatch custom event for external listeners
        try {
            window.dispatchEvent(new CustomEvent('complyark:consent', { detail: consent }));
        } catch (e) {
            // IE11 fallback
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent('complyark:consent', true, true, consent);
            window.dispatchEvent(event);
        }

        return consent;
    }

    // ============================================================================
    // UI RENDERING - BANNER
    // ============================================================================

    function createBanner() {
        var config = state.config;
        var lang = state.resolvedLanguage;
        var notice = getNoticeTranslation(config.notice, lang);
        var banner = config.banner;

        if (!notice) {
            console.error('[ComplyArk] Cannot render banner - no notice translation available');
            return null;
        }

        // Create banner container
        var bannerEl = document.createElement('div');
        bannerEl.id = 'complyark-banner';
        bannerEl.setAttribute('role', 'dialog');
        bannerEl.setAttribute('aria-label', 'Cookie consent');
        bannerEl.setAttribute('aria-modal', 'true');

        // Banner positioning styles
        var positionStyles = {
            bottom: 'bottom: 20px; left: 50%; transform: translateX(-50%);',
            top: 'top: 20px; left: 50%; transform: translateX(-50%);',
            center: 'top: 50%; left: 50%; transform: translate(-50%, -50%);'
        };

        var layoutStyles = {
            banner: 'width: 90%; max-width: 720px;',
            modal: 'width: 90%; max-width: 500px; min-height: 200px;',
            popup: 'width: 350px; right: 20px; left: auto; transform: none;'
        };

        bannerEl.style.cssText = 
            'position: fixed; ' +
            positionStyles[banner.position] +
            layoutStyles[banner.layout] +
            'background-color: ' + banner.backgroundColor + '; ' +
            'color: ' + banner.textColor + '; ' +
            'border-radius: 12px; ' +
            'box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15); ' +
            'padding: 1.5rem; ' +
            'font-family: ' + banner.fontFamily + '; ' +
            'font-size: ' + banner.fontSize + '; ' +
            'z-index: 999999; ' +
            'border: 1px solid rgba(0, 0, 0, 0.1);';

        // Banner HTML content
        bannerEl.innerHTML = 
            '<div style="margin-bottom: 1rem;">' +
                '<h3 style="margin: 0 0 0.5rem 0; font-weight: 600; font-size: 1.1em;">' + 
                    escapeHtml(notice.title) + 
                '</h3>' +
                '<p style="margin: 0; line-height: 1.5; opacity: 0.9;">' + 
                    escapeHtml(notice.description) + 
                '</p>' +
            '</div>' +
            '<div style="display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: flex-end;">' +
                '<button id="complyark-settings-btn" style="' +
                    'padding: 0.6rem 1.2rem; ' +
                    'border-radius: 6px; ' +
                    'border: 1px solid ' + banner.secondaryColor + '; ' +
                    'background: transparent; ' +
                    'color: ' + banner.textColor + '; ' +
                    'cursor: pointer; ' +
                    'font-size: 0.9em; ' +
                    'transition: all 0.2s;' +
                '">' + escapeHtml(banner.customizeButtonText) + '</button>' +
                '<button id="complyark-reject-btn" style="' +
                    'padding: 0.6rem 1.2rem; ' +
                    'border-radius: 6px; ' +
                    'border: none; ' +
                    'background: ' + banner.rejectButtonColor + '; ' +
                    'color: white; ' +
                    'cursor: pointer; ' +
                    'font-size: 0.9em; ' +
                    'transition: all 0.2s;' +
                '">' + escapeHtml(banner.rejectButtonText) + '</button>' +
                '<button id="complyark-accept-btn" style="' +
                    'padding: 0.6rem 1.2rem; ' +
                    'border-radius: 6px; ' +
                    'border: none; ' +
                    'background: ' + banner.acceptButtonColor + '; ' +
                    'color: white; ' +
                    'cursor: pointer; ' +
                    'font-size: 0.9em; ' +
                    'font-weight: 500; ' +
                    'transition: all 0.2s;' +
                '">' + escapeHtml(banner.acceptButtonText) + '</button>' +
            '</div>';

        return bannerEl;
    }

    function showBanner() {
        if (state.bannerElement) {
            state.bannerElement.style.display = 'block';
            return;
        }

        var banner = createBanner();
        if (!banner) return;

        state.bannerElement = banner;
        document.body.appendChild(banner);

        // Attach event handlers
        document.getElementById('complyark-accept-btn').onclick = handleAcceptAll;
        document.getElementById('complyark-reject-btn').onclick = handleRejectAll;
        document.getElementById('complyark-settings-btn').onclick = showSettings;

        console.log('[ComplyArk] Banner displayed');
    }

    function hideBanner() {
        if (state.bannerElement) {
            state.bannerElement.style.display = 'none';
        }
    }

    // ============================================================================
    // UI RENDERING - SETTINGS PANEL
    // ============================================================================

    function createSettingsPanel() {
        var config = state.config;
        var lang = state.resolvedLanguage;
        var notice = getNoticeTranslation(config.notice, lang);
        var banner = config.banner;

        if (!notice) {
            console.error('[ComplyArk] Cannot render settings - no notice translation available');
            return null;
        }

        // Create settings overlay
        var overlay = document.createElement('div');
        overlay.id = 'complyark-settings';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-label', 'Cookie preferences');
        overlay.setAttribute('aria-modal', 'true');

        overlay.style.cssText = 
            'position: fixed; ' +
            'top: 0; left: 0; right: 0; bottom: 0; ' +
            'background: rgba(0, 0, 0, 0.5); ' +
            'display: flex; ' +
            'align-items: center; ' +
            'justify-content: center; ' +
            'z-index: 1000000; ' +
            'font-family: ' + banner.fontFamily + ';';

        // Build purpose list HTML
        var purposesHtml = '';
        config.purposes.forEach(function(purpose) {
            var trans = getPurposeTranslation(purpose.labels, lang);
            if (!trans) return;

            var isChecked = state.purposes[purpose.key] !== false;
            var isDisabled = purpose.required;

            if (purpose.required) {
                // Required purposes are always ON
                state.purposes[purpose.key] = true;
                isChecked = true;
            }

            purposesHtml += 
                '<div style="padding: 1rem 0; border-bottom: 1px solid rgba(0,0,0,0.1);">' +
                    '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                        '<div style="flex: 1; padding-right: 1rem;">' +
                            '<div style="font-weight: 500; margin-bottom: 0.25rem;">' + 
                                escapeHtml(trans.title) + 
                                (purpose.required ? ' <span style="font-size: 0.8em; color: ' + banner.primaryColor + ';">(Required)</span>' : '') +
                            '</div>' +
                            '<div style="font-size: 0.875em; opacity: 0.8;">' + 
                                escapeHtml(trans.description) + 
                            '</div>' +
                        '</div>' +
                        '<label style="position: relative; display: inline-block; width: 48px; height: 26px; flex-shrink: 0;">' +
                            '<input type="checkbox" ' +
                                'data-purpose="' + purpose.key + '" ' +
                                (isChecked ? 'checked ' : '') +
                                (isDisabled ? 'disabled ' : '') +
                                'style="opacity: 0; width: 0; height: 0;"' +
                            '>' +
                            '<span style="' +
                                'position: absolute; cursor: ' + (isDisabled ? 'not-allowed' : 'pointer') + '; ' +
                                'top: 0; left: 0; right: 0; bottom: 0; ' +
                                'background-color: ' + (isChecked ? banner.primaryColor : '#ccc') + '; ' +
                                (isDisabled ? 'opacity: 0.6; ' : '') +
                                'transition: 0.3s; border-radius: 26px;' +
                            '"></span>' +
                            '<span style="' +
                                'position: absolute; height: 20px; width: 20px; ' +
                                'left: ' + (isChecked ? '25px' : '3px') + '; bottom: 3px; ' +
                                'background-color: white; transition: 0.3s; border-radius: 50%;' +
                            '"></span>' +
                        '</label>' +
                    '</div>' +
                '</div>';
        });

        // Language selector HTML  
        var languageSelectorHtml = '';
        if (config.supportedLanguages && config.supportedLanguages.length > 1) {
            var langOptions = '';
            config.supportedLanguages.forEach(function(langCode) {
                var langName = getLanguageName(langCode);
                langOptions += '<option value="' + langCode + '"' + 
                    (langCode === lang ? ' selected' : '') + '>' + 
                    langName + '</option>';
            });

            languageSelectorHtml = 
                '<div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(0,0,0,0.1);">' +
                    '<label style="display: flex; align-items: center; gap: 0.75rem;">' +
                        '<span style="font-weight: 500;">Language:</span>' +
                        '<select id="complyark-lang-select" style="' +
                            'padding: 0.4rem 0.8rem; ' +
                            'border: 1px solid ' + banner.secondaryColor + '; ' +
                            'border-radius: 4px; ' +
                            'background: white; ' +
                            'font-size: 0.9em; ' +
                            'cursor: pointer;' +
                        '">' + langOptions + '</select>' +
                    '</label>' +
                '</div>';
        }

        // Build settings panel
        overlay.innerHTML = 
            '<div style="' +
                'background: ' + banner.backgroundColor + '; ' +
                'color: ' + banner.textColor + '; ' +
                'border-radius: 12px; ' +
                'max-width: 600px; ' +
                'width: 90%; ' +
                'max-height: 80vh; ' +
                'overflow-y: auto; ' +
                'box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);' +
            '">' +
                '<div style="padding: 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.1);">' +
                    '<div style="display: flex; justify-content: space-between; align-items: flex-start;">' +
                        '<h2 style="margin: 0 0 0.75rem 0; font-weight: 600; font-size: 1.25em;">' + 
                            escapeHtml(notice.title) + 
                        '</h2>' +
                        '<button id="complyark-close-settings" style="' +
                            'background: none; border: none; cursor: pointer; font-size: 1.5em; ' +
                            'line-height: 1; padding: 0; color: ' + banner.textColor + '; opacity: 0.6;' +
                        '">&times;</button>' +
                    '</div>' +
                    '<p style="margin: 0; line-height: 1.5; opacity: 0.9;">' + 
                        escapeHtml(notice.description) + 
                    '</p>' +
                '</div>' +
                '<div style="padding: 1.5rem;">' +
                    languageSelectorHtml +
                    '<h3 style="margin: 0 0 0.75rem 0; font-weight: 600; font-size: 1em;">Manage Consent Preferences</h3>' +
                    purposesHtml +
                '</div>' +
                '<div style="padding: 1.5rem; border-top: 1px solid rgba(0,0,0,0.1); display: flex; gap: 0.75rem; justify-content: flex-end;">' +
                    '<button id="complyark-reject-all-settings" style="' +
                        'padding: 0.6rem 1.2rem; border-radius: 6px; ' +
                        'border: none; background: ' + banner.rejectButtonColor + '; ' +
                        'color: white; cursor: pointer; font-size: 0.9em;' +
                    '">' + escapeHtml(banner.rejectButtonText) + '</button>' +
                    '<button id="complyark-save-settings" style="' +
                        'padding: 0.6rem 1.2rem; border-radius: 6px; ' +
                        'border: none; background: ' + banner.acceptButtonColor + '; ' +
                        'color: white; cursor: pointer; font-size: 0.9em; font-weight: 500;' +
                    '">Save Preferences</button>' +
                '</div>' +
            '</div>';

        return overlay;
    }

    function showSettings() {
        hideBanner();

        if (state.settingsElement) {
            document.body.removeChild(state.settingsElement);
        }

        var settings = createSettingsPanel();
        if (!settings) return;

        state.settingsElement = settings;
        document.body.appendChild(settings);

        // Attach event handlers
        document.getElementById('complyark-close-settings').onclick = function() {
            hideSettings();
            showBanner();
        };

        document.getElementById('complyark-reject-all-settings').onclick = function() {
            handleRejectAll();
            hideSettings();
        };

        document.getElementById('complyark-save-settings').onclick = handleSaveSettings;

        // Language selector handler
        var langSelect = document.getElementById('complyark-lang-select');
        if (langSelect) {
            langSelect.onchange = function() {
                var newLang = this.value;
                console.log('[ComplyArk] Language changed to:', newLang);
                persistLanguage(newLang);
                state.resolvedLanguage = newLang;
                // Re-render settings with new language
                hideSettings();
                showSettings();
            };
        }

        // Toggle switches functionality
        var toggles = settings.querySelectorAll('input[data-purpose]');
        for (var i = 0; i < toggles.length; i++) {
            (function(toggle) {
                toggle.onchange = function() {
                    var purposeKey = this.getAttribute('data-purpose');
                    state.purposes[purposeKey] = this.checked;
                    // Update visual state
                    var slider = this.nextElementSibling;
                    var knob = slider.nextElementSibling;
                    slider.style.backgroundColor = this.checked ? state.config.banner.primaryColor : '#ccc';
                    knob.style.left = this.checked ? '25px' : '3px';
                };
            })(toggles[i]);
        }

        console.log('[ComplyArk] Settings panel displayed');
    }

    function hideSettings() {
        if (state.settingsElement && state.settingsElement.parentNode) {
            document.body.removeChild(state.settingsElement);
            state.settingsElement = null;
        }
    }

    // ============================================================================
    // CONSENT HANDLERS
    // ============================================================================

    function handleAcceptAll() {
        console.log('[ComplyArk] Accept All clicked');
        var consent = {};
        state.config.purposes.forEach(function(purpose) {
            consent[purpose.key] = true;
        });
        state.purposes = consent;
        saveConsent(consent);
        hideBanner();
        hideSettings();
    }

    function handleRejectAll() {
        console.log('[ComplyArk] Reject All clicked');
        var consent = {};
        state.config.purposes.forEach(function(purpose) {
            // Essential purposes cannot be rejected
            consent[purpose.key] = purpose.required;
        });
        state.purposes = consent;
        saveConsent(consent);
        hideBanner();
        hideSettings();
    }

    function handleSaveSettings() {
        console.log('[ComplyArk] Save Settings clicked');
        // Collect toggle states
        var settings = state.settingsElement;
        if (!settings) return;

        var toggles = settings.querySelectorAll('input[data-purpose]');
        var consent = {};
        
        for (var i = 0; i < toggles.length; i++) {
            var purposeKey = toggles[i].getAttribute('data-purpose');
            consent[purposeKey] = toggles[i].checked;
        }

        state.purposes = consent;
        saveConsent(consent);
        hideSettings();
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getLanguageName(code) {
        var names = {
            'en': 'English',
            'hi': 'हिन्दी (Hindi)',
            'ml': 'മലയാളം (Malayalam)',
            'ta': 'தமிழ் (Tamil)',
            'te': 'తెలుగు (Telugu)',
            'bn': 'বাংলা (Bengali)',
            'gu': 'ગુજરાતી (Gujarati)',
            'kn': 'ಕನ್ನಡ (Kannada)',
            'mr': 'मराठी (Marathi)',
            'pa': 'ਪੰਜਾਬੀ (Punjabi)',
            'or': 'ଓଡ଼ିଆ (Odia)',
            'as': 'অসমীয়া (Assamese)',
            'ur': 'اردو (Urdu)'
        };
        return names[code] || code.toUpperCase();
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    function init() {
        console.log('[ComplyArk] Fetching runtime config...');

        // Check for existing consent first
        var existingConsent = loadExistingConsent();
        if (existingConsent && existingConsent.purposes) {
            console.log('[ComplyArk] User has already provided consent, skipping banner');
            state.purposes = existingConsent.purposes;
            
            // Dispatch consent event for page scripts
            try {
                window.dispatchEvent(new CustomEvent('complyark:consent', { detail: existingConsent }));
            } catch (e) {
                var event = document.createEvent('CustomEvent');
                event.initCustomEvent('complyark:consent', true, true, existingConsent);
                window.dispatchEvent(event);
            }
            return;
        }

        // Fetch runtime config from API
        var xhr = new XMLHttpRequest();
        xhr.open('GET', API_BASE + '/runtime/websites/' + SITE_ID, true);

        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var config = JSON.parse(xhr.responseText);
                    
                    // Validate config has required fields
                    if (!config.notice || !config.notice['en']) {
                        console.error('[ComplyArk] FAIL CLOSED: English notice missing');
                        return;
                    }

                    if (!config.purposes || config.purposes.length === 0) {
                        console.error('[ComplyArk] FAIL CLOSED: No purposes defined');
                        return;
                    }

                    // Validate all purposes have English labels
                    for (var i = 0; i < config.purposes.length; i++) {
                        if (!config.purposes[i].labels || !config.purposes[i].labels['en']) {
                            console.error('[ComplyArk] FAIL CLOSED: Purpose missing English label');
                            return;
                        }
                    }

                    console.log('[ComplyArk] Config loaded successfully');
                    state.config = config;

                    // Resolve user's language preference
                    state.resolvedLanguage = resolveLanguage(config);
                    console.log('[ComplyArk] Resolved language:', state.resolvedLanguage);

                    // Initialize purpose states (defaults for new users)
                    config.purposes.forEach(function(purpose) {
                        // Required purposes default to ON, optional to OFF
                        state.purposes[purpose.key] = purpose.required;
                    });

                    // Show the banner
                    showBanner();

                } catch (e) {
                    console.error('[ComplyArk] FAIL CLOSED: Cannot parse config', e);
                }
            } else if (xhr.status === 404) {
                console.error('[ComplyArk] FAIL CLOSED: Website not found or not active');
            } else {
                console.error('[ComplyArk] FAIL CLOSED: Config fetch failed with status', xhr.status);
            }
        };

        xhr.onerror = function() {
            console.error('[ComplyArk] FAIL CLOSED: Network error fetching config');
        };

        xhr.send();
    }

    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
`;

        reply
            .type('application/javascript')
            .header('Cache-Control', 'public, max-age=300')
            .send(scriptContent);
    });
}
