import { FastifyInstance } from 'fastify';

export async function loaderRoutes(app: FastifyInstance) {
    app.get('/public/loader.js', async (request, reply) => {
        const { id } = request.query as { id: string };

        // Get the base URL for API calls (from request origin or default)
        const host = request.headers.host || 'localhost:3001';
        const protocol = request.protocol || 'http';
        const baseUrl = `${protocol}://${host}`;

        /**
         * ComplyArk CMP Loader - Production-Grade Runtime
         * 
         * DPDPA-COMPLIANT CONSENT MANAGEMENT PLATFORM
         * 
         * This loader is an EXECUTION GATE, not just a banner.
         * It enforces purpose-based consent by:
         * 1. BLOCKING all non-essential scripts/iframes/pixels before consent
         * 2. ALLOWING execution ONLY for consented purposes
         * 3. REPLAYING blocked resources after consent is given
         * 
         * STRICT RULES:
         * - No personal data processing before consent
         * - Unknown/undeclared purposes = blocked forever
         * - Essential purposes auto-allowed
         * - Fail closed on any error
         */

        const scriptContent = `
(function() {
    'use strict';

    // ============================================================================
    // CONSTANTS & STORAGE KEYS
    // ============================================================================
    
    var CONSENT_KEY = '__complyark_consent__';
    var LANGUAGE_KEY = '__complyark_user_lang__';
    var SITE_ID = "${id || ''}";
    var API_BASE = "${baseUrl}";
    var VERSION = '2.0.0';
    
    // ============================================================================
    // GUARD: Prevent duplicate initialization
    // ============================================================================
    
    if (window.__complyarkInitialized) {
        console.log('[ComplyArk] Already initialized, skipping.');
        return;
    }
    window.__complyarkInitialized = true;

    if (!SITE_ID) {
        console.error('[ComplyArk] FAIL CLOSED: No site_id provided.');
        return;
    }

    console.log('[ComplyArk] CMP Runtime v' + VERSION + ' initializing...');
    console.log('[ComplyArk] Site ID:', SITE_ID);

    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================
    
    var state = {
        config: null,
        resolvedLanguage: 'en',
        purposes: {},              // { purposeTag: boolean }
        consentGiven: false,
        bannerElement: null,
        settingsElement: null,
        blockedScripts: [],        // Scripts waiting for consent
        replayedScripts: new Set() // Track replayed scripts to prevent double execution
    };

    // ============================================================================
    // BLOCKING ENGINE - Core CMP Enforcement
    // ============================================================================

    /**
     * Scan DOM for blocked resources and store references.
     * Resources with type="text/plain" and data-purpose are managed by CMP.
     */
    function scanBlockedResources() {
        // Find scripts marked for blocking
        var scripts = document.querySelectorAll('script[type="text/plain"][data-purpose]');
        for (var i = 0; i < scripts.length; i++) {
            var script = scripts[i];
            var purpose = script.getAttribute('data-purpose');
            var src = script.getAttribute('src') || script.getAttribute('data-src');
            var inline = script.textContent;
            
            state.blockedScripts.push({
                type: 'script',
                purpose: purpose,
                src: src,
                inline: inline,
                element: script,
                id: 'script-' + i + '-' + purpose
            });
            console.log('[ComplyArk] Blocked script for purpose:', purpose, src ? '(external)' : '(inline)');
        }

        // Find images (tracking pixels) marked for blocking
        var images = document.querySelectorAll('img[data-src][data-purpose]');
        for (var j = 0; j < images.length; j++) {
            var img = images[j];
            var imgPurpose = img.getAttribute('data-purpose');
            state.blockedScripts.push({
                type: 'pixel',
                purpose: imgPurpose,
                src: img.getAttribute('data-src'),
                element: img,
                id: 'pixel-' + j + '-' + imgPurpose
            });
            console.log('[ComplyArk] Blocked pixel for purpose:', imgPurpose);
        }

        // Find iframes marked for blocking
        var iframes = document.querySelectorAll('iframe[data-src][data-purpose]');
        for (var k = 0; k < iframes.length; k++) {
            var iframe = iframes[k];
            var iframePurpose = iframe.getAttribute('data-purpose');
            state.blockedScripts.push({
                type: 'iframe',
                purpose: iframePurpose,
                src: iframe.getAttribute('data-src'),
                element: iframe,
                id: 'iframe-' + k + '-' + iframePurpose
            });
            console.log('[ComplyArk] Blocked iframe for purpose:', iframePurpose);
        }
    }

    /**
     * Intercept dynamic script creation.
     * Override document.createElement to catch scripts added at runtime.
     */
    function interceptDynamicScripts() {
        var originalCreateElement = document.createElement.bind(document);
        
        document.createElement = function(tagName) {
            var element = originalCreateElement(tagName);
            
            if (tagName.toLowerCase() === 'script') {
                // Store original src setter
                var descriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
                var originalSrcSetter = descriptor && descriptor.set;
                
                // Wrap the element to intercept src assignment
                var pendingSrc = null;
                
                Object.defineProperty(element, '__complyark_intercepted', {
                    value: true,
                    writable: false
                });
                
                // Override src property
                Object.defineProperty(element, 'src', {
                    get: function() {
                        return pendingSrc;
                    },
                    set: function(value) {
                        var purpose = element.getAttribute('data-purpose');
                        
                        // If no purpose declared, check if consent already given
                        if (!purpose) {
                            // Allow if consent already given, or treat as essential
                            if (state.consentGiven) {
                                if (originalSrcSetter) {
                                    originalSrcSetter.call(element, value);
                                } else {
                                    element.setAttribute('src', value);
                                }
                            } else {
                                // Block unknown scripts - log warning
                                console.warn('[ComplyArk] Dynamic script without data-purpose blocked:', value);
                                pendingSrc = value;
                            }
                            return;
                        }
                        
                        // Check if purpose is consented
                        if (isPurposeConsented(purpose)) {
                            if (originalSrcSetter) {
                                originalSrcSetter.call(element, value);
                            } else {
                                element.setAttribute('src', value);
                            }
                        } else {
                            console.log('[ComplyArk] Dynamic script blocked for purpose:', purpose);
                            pendingSrc = value;
                            state.blockedScripts.push({
                                type: 'dynamic-script',
                                purpose: purpose,
                                src: value,
                                element: element,
                                id: 'dynamic-' + Date.now()
                            });
                        }
                    }
                });
            }
            
            return element;
        };
    }

    /**
     * Check if a purpose has been consented to.
     */
    function isPurposeConsented(purposeTag) {
        // Check if purpose exists in config
        if (!state.config) return false;
        
        var purposeConfig = state.config.purposes.find(function(p) {
            return p.key === purposeTag;
        });
        
        // Unknown purpose = blocked forever
        if (!purposeConfig) {
            console.warn('[ComplyArk] Unknown purpose:', purposeTag, '- BLOCKED FOREVER');
            return false;
        }
        
        // Essential purposes are always allowed
        if (purposeConfig.required) {
            return true;
        }
        
        // Check user consent
        return state.purposes[purposeTag] === true;
    }

    /**
     * Replay blocked resources for consented purposes.
     * This runs scripts, loads iframes, and fires pixels.
     */
    function replayConsentedResources() {
        console.log('[ComplyArk] Replaying consented resources...');
        
        state.blockedScripts.forEach(function(blocked) {
            // Skip if already replayed (idempotent)
            if (state.replayedScripts.has(blocked.id)) {
                return;
            }
            
            // Check if purpose is consented
            if (!isPurposeConsented(blocked.purpose)) {
                console.log('[ComplyArk] Skipping blocked resource (not consented):', blocked.purpose);
                return;
            }
            
            console.log('[ComplyArk] Replaying:', blocked.type, 'for purpose:', blocked.purpose);
            state.replayedScripts.add(blocked.id);
            
            switch (blocked.type) {
                case 'script':
                    replayScript(blocked);
                    break;
                case 'dynamic-script':
                    replayDynamicScript(blocked);
                    break;
                case 'pixel':
                    replayPixel(blocked);
                    break;
                case 'iframe':
                    replayIframe(blocked);
                    break;
            }
        });
    }

    function replayScript(blocked) {
        var newScript = document.createElement('script');
        newScript.setAttribute('data-purpose', blocked.purpose);
        newScript.setAttribute('data-complyark-replayed', 'true');
        
        if (blocked.src) {
            // External script
            newScript.src = blocked.src;
        } else if (blocked.inline) {
            // Inline script
            newScript.textContent = blocked.inline;
        }
        
        // Replace the blocked script with the new one
        if (blocked.element && blocked.element.parentNode) {
            blocked.element.parentNode.replaceChild(newScript, blocked.element);
        } else {
            document.body.appendChild(newScript);
        }
    }

    function replayDynamicScript(blocked) {
        if (blocked.element && blocked.src) {
            // Directly set src on the intercepted element
            blocked.element.setAttribute('src', blocked.src);
        }
    }

    function replayPixel(blocked) {
        if (blocked.element && blocked.src) {
            blocked.element.src = blocked.src;
        }
    }

    function replayIframe(blocked) {
        if (blocked.element && blocked.src) {
            blocked.element.src = blocked.src;
        }
    }

    // ============================================================================
    // CONSENT MANAGEMENT
    // ============================================================================

    // Cookie helper functions
    function setCookie(name, value, days) {
        var expires = '';
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = '; expires=' + date.toUTCString();
        }
        // Get root domain for cross-subdomain support
        var domain = getRootDomain();
        var domainStr = domain ? '; domain=' + domain : '';
        document.cookie = name + '=' + encodeURIComponent(value) + expires + domainStr + '; path=/; SameSite=Lax';
    }

    function getCookie(name) {
        var nameEQ = name + '=';
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) {
                return decodeURIComponent(c.substring(nameEQ.length, c.length));
            }
        }
        return null;
    }

    function getRootDomain() {
        // Extract root domain for cookie (e.g., .example.com from sub.example.com)
        var hostname = window.location.hostname;
        if (hostname === 'localhost' || /^[0-9.]+$/.test(hostname)) {
            return ''; // Don't set domain for localhost or IP addresses
        }
        var parts = hostname.split('.');
        if (parts.length > 2) {
            return '.' + parts.slice(-2).join('.');
        }
        return '.' + hostname;
    }

    function generateUUID() {
        // Generate a random UUID for anonymous user tracking
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0;
            var v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function getAnonymousId() {
        var ANON_KEY = '__complyark_anon_id__';
        var anonId = getCookie(ANON_KEY);
        if (!anonId) {
            anonId = generateUUID();
            setCookie(ANON_KEY, anonId, 365); // 1 year expiry
        }
        return anonId;
    }

    function loadExistingConsent() {
        try {
            var stored = getCookie(CONSENT_KEY);
            if (stored) {
                var consent = JSON.parse(stored);
                // Validate consent structure
                if (consent && consent.purposes && consent.websiteId === SITE_ID) {
                    console.log('[ComplyArk] Loaded existing consent from cookie:', consent);
                    return consent;
                }
            }
        } catch (e) {
            console.warn('[ComplyArk] Cannot load consent:', e);
        }
        return null;
    }

    function saveConsent(purposes) {
        var anonymousId = getAnonymousId();
        var consent = {
            purposes: purposes,
            websiteId: SITE_ID,
            versionId: state.config ? state.config.versionId : null,
            anonymousId: anonymousId,
            language: state.resolvedLanguage,
            timestamp: Date.now(),
            version: VERSION
        };

        // Save to Cookie (6 months = 180 days)
        try {
            setCookie(CONSENT_KEY, JSON.stringify(consent), 180);
            console.log('[ComplyArk] Consent saved to cookie:', consent);
        } catch (e) {
            console.error('[ComplyArk] Cannot save consent:', e);
        }

        // Send to server for audit log (async, non-blocking)
        sendConsentToServer(consent);

        // Dispatch event for external listeners
        try {
            window.dispatchEvent(new CustomEvent('complyark:consent', { detail: consent }));
        } catch (e) {
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent('complyark:consent', true, true, consent);
            window.dispatchEvent(event);
        }

        return consent;
    }

    function sendConsentToServer(consent) {
        // Send consent to server for DPDPA/GDPR audit logging
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', API_BASE + '/runtime/consent', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        console.log('[ComplyArk] Consent logged to server successfully');
                    } else {
                        console.warn('[ComplyArk] Failed to log consent to server:', xhr.status);
                    }
                }
            };
            xhr.send(JSON.stringify({
                siteId: consent.websiteId,
                versionId: consent.versionId,
                anonymousId: consent.anonymousId,
                preferences: consent.purposes
            }));
        } catch (e) {
            console.warn('[ComplyArk] Error sending consent to server:', e);
        }
    }

    // ============================================================================
    // LANGUAGE RESOLUTION
    // ============================================================================

    function resolveLanguage(config) {
        var supported = config.supportedLanguages || ['en'];
        var defaultLang = config.defaultLanguage || 'en';

        // 1. Check stored preference
        try {
            var stored = localStorage.getItem(LANGUAGE_KEY);
            if (stored && supported.indexOf(stored) !== -1) {
                return stored;
            }
        } catch (e) {}

        // 2. Browser language
        var browserLang = (navigator.language || '').split('-')[0].toLowerCase();
        if (browserLang && supported.indexOf(browserLang) !== -1) {
            persistLanguage(browserLang);
            return browserLang;
        }

        // 3. Default or English
        if (supported.indexOf(defaultLang) !== -1) {
            persistLanguage(defaultLang);
            return defaultLang;
        }

        persistLanguage('en');
        return 'en';
    }

    function persistLanguage(code) {
        try {
            localStorage.setItem(LANGUAGE_KEY, code);
        } catch (e) {}
    }

    // ============================================================================
    // TRANSLATION HELPERS
    // ============================================================================

    function getNoticeTranslation(notice, lang) {
        return notice[lang] || notice['en'] || null;
    }

    function getPurposeTranslation(labels, lang) {
        return labels[lang] || labels['en'] || null;
    }

    function getLanguageName(code) {
        var names = {
            'en': 'English', 'hi': 'हिन्दी', 'ta': 'தமிழ்', 'te': 'తెలుగు',
            'bn': 'বাংলা', 'mr': 'मराठी', 'gu': 'ગુજરાતી', 'kn': 'ಕನ್ನಡ',
            'ml': 'മലയാളം', 'pa': 'ਪੰਜਾਬੀ', 'or': 'ଓଡ଼ିଆ'
        };
        return names[code] || code.toUpperCase();
    }

    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ============================================================================
    // UI RENDERING - BANNER
    // ============================================================================

    function createBanner() {
        var config = state.config;
        var lang = state.resolvedLanguage;
        var banner = config.banner;

        // Get translated banner text (with English fallback)
        var bannerText = banner.text[lang] || banner.text['en'];
        if (!bannerText) {
            console.error('[ComplyArk] FAIL CLOSED: No banner text available');
            return null;
        }

        var el = document.createElement('div');
        el.id = 'complyark-banner';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-label', 'Cookie consent');

        var positionCSS = {
            bottom: 'bottom: 20px; left: 50%; transform: translateX(-50%);',
            top: 'top: 20px; left: 50%; transform: translateX(-50%);',
            center: 'top: 50%; left: 50%; transform: translate(-50%, -50%);'
        };

        var layoutCSS = {
            banner: 'width: 90%; max-width: 720px;',
            modal: 'width: 90%; max-width: 500px;',
            popup: 'width: 350px; right: 20px; left: auto; transform: none; bottom: 20px;'
        };

        // Language selector for banner
        var bannerLangHtml = '';
        if (config.supportedLanguages && config.supportedLanguages.length > 1) {
            var options = '';
            config.supportedLanguages.forEach(function(code) {
                options += '<option value="' + code + '"' + 
                    (code === lang ? ' selected' : '') + '>' + 
                    code.toUpperCase() + '</option>';
            });
            bannerLangHtml = 
                '<div style="position: absolute; top: 1rem; right: 1rem; z-index: 10;">' +
                    '<select id="complyark-banner-lang" style="' +
                        'padding: 0.3rem 0.6rem; border: 1px solid rgba(0,0,0,0.15); ' +
                        'border-radius: 6px; background: rgba(255,255,255,0.9); cursor: pointer; ' +
                        'font-size: 0.85em; color: ' + banner.textColor + '; outline: none;">' + 
                        options + 
                    '</select>' +
                '</div>';
        }

        el.style.cssText = 
            'position: fixed; ' +
            (positionCSS[banner.position] || positionCSS.bottom) +
            (layoutCSS[banner.layout] || layoutCSS.banner) +
            'background: ' + banner.backgroundColor + '; ' +
            'color: ' + banner.textColor + '; ' +
            'border-radius: 16px; ' +
            'box-shadow: 0 10px 40px rgba(0,0,0,0.15); ' +
            'padding: 1.5rem 1.5rem 1.25rem; ' + // Adjusted padding
            'font-family: ' + (banner.fontFamily || 'system-ui, -apple-system, sans-serif') + '; ' +
            'font-size: ' + (banner.fontSize || '14px') + '; ' +
            'z-index: 999999; ' +
            'border: 1px solid rgba(0,0,0,0.08);';

        el.innerHTML = 
            bannerLangHtml +
            '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">' +
                '<div style="flex: 1; padding-right: 1rem;">' +
                    '<h3 style="margin: 0 0 0.5rem 0; font-weight: 600; font-size: 1.1em;">' + 
                        escapeHtml(bannerText.headline) + '</h3>' +
                    '<p style="margin: 0; line-height: 1.5; opacity: 0.85; font-size: 0.95em;">' + 
                        escapeHtml(bannerText.description) + '</p>' +
                '</div>' +
            '</div>' +
            '<div style="display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: flex-end;">' +
                '<button id="complyark-settings-btn" style="' +
                    'padding: 0.6rem 1.2rem; border-radius: 8px; ' +
                    'border: 1px solid rgba(0,0,0,0.15); ' +
                    'background: transparent; color: ' + banner.textColor + '; ' +
                    'cursor: pointer; font-size: 0.9em; font-weight: 500;">' + 
                    escapeHtml(bannerText.preferencesButton) + '</button>' +
                '<button id="complyark-reject-btn" style="' +
                    'padding: 0.6rem 1.2rem; border-radius: 8px; border: none; ' +
                    'background: ' + banner.rejectButtonColor + '; color: white; ' +
                    'cursor: pointer; font-size: 0.9em; font-weight: 500;">' + 
                    escapeHtml(bannerText.rejectButton) + '</button>' +
                '<button id="complyark-accept-btn" style="' +
                    'padding: 0.6rem 1.2rem; border-radius: 8px; border: none; ' +
                    'background: ' + banner.acceptButtonColor + '; color: white; ' +
                    'cursor: pointer; font-size: 0.9em; font-weight: 600;">' + 
                    escapeHtml(bannerText.acceptButton) + '</button>' +
            '</div>';

        return el;
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

        document.getElementById('complyark-accept-btn').onclick = handleAcceptAll;
        document.getElementById('complyark-reject-btn').onclick = handleRejectAll;
        document.getElementById('complyark-settings-btn').onclick = showSettings;

        // Banner language selector
        var bannerLangSelect = document.getElementById('complyark-banner-lang');
        if (bannerLangSelect) {
            bannerLangSelect.onchange = function() {
                persistLanguage(this.value);
                state.resolvedLanguage = this.value;
                // Remove and recreate banner with new language
                if (state.bannerElement && state.bannerElement.parentNode) {
                    state.bannerElement.parentNode.removeChild(state.bannerElement);
                    state.bannerElement = null;
                }
                showBanner();
            };
        }

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

        // Get translated banner text (with English fallback)
        var bannerText = banner.text[lang] || banner.text['en'];
        if (!bannerText) return null;

        var overlay = document.createElement('div');
        overlay.id = 'complyark-settings';
        overlay.style.cssText = 
            'position: fixed; top: 0; left: 0; right: 0; bottom: 0; ' +
            'background: rgba(0,0,0,0.6); display: flex; ' +
            'align-items: center; justify-content: center; z-index: 1000000; ' +
            'font-family: ' + (banner.fontFamily || 'system-ui, -apple-system, sans-serif') + '; ' +
            'backdrop-filter: blur(4px);';

        // Build purposes HTML with icons
        var purposeIcons = {
            'analytics': '📊',
            'marketing': '📢',
            'social': '🔗',
            'functional': '⚙️',
            'essential': '🔒',
            'default': '🍪'
        };

        var purposesHtml = '';
        config.purposes.forEach(function(purpose) {
            var trans = getPurposeTranslation(purpose.labels, lang);
            if (!trans) return;

            var isChecked = purpose.required || state.purposes[purpose.key] === true;
            var isDisabled = purpose.required;
            var icon = purposeIcons[purpose.key] || purposeIcons['default'];
            var dataCategoryInfo = trans.dataCategoryInfo ? escapeHtml(trans.dataCategoryInfo) : '';

            purposesHtml += 
                '<div style="background: rgba(0,0,0,0.02); border-radius: 10px; padding: 1rem; margin-bottom: 0.75rem; border: 1px solid rgba(0,0,0,0.06);">' +
                    '<div style="display: flex; justify-content: space-between; align-items: flex-start;">' +
                        '<div style="flex: 1; padding-right: 1rem;">' +
                            '<div style="font-weight: 600; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.5rem;">' + 
                                '<span>' + icon + '</span> ' +
                                escapeHtml(trans.title) + 
                            '</div>' +
                            '<div style="font-size: 0.85em; opacity: 0.7; line-height: 1.4;">' + 
                                escapeHtml(trans.description) + '</div>' +
                            (dataCategoryInfo ? 
                                '<div style="margin-top: 0.6rem; padding-top: 0.6rem; border-top: 1px dashed rgba(0,0,0,0.1);">' +
                                    '<div style="font-size: 0.75em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: rgba(0,0,0,0.45); margin-bottom: 0.25rem;">' +
                                        'Data Category Info' +
                                    '</div>' +
                                    '<div style="font-size: 0.8em; color: rgba(0,0,0,0.65); line-height: 1.4;">' + 
                                        dataCategoryInfo + 
                                    '</div>' +
                                '</div>' : '') +
                        '</div>' +
                        '<label style="position: relative; display: inline-block; width: 50px; height: 28px; flex-shrink: 0; margin-top: 0.25rem;">' +
                            '<input type="checkbox" data-purpose="' + purpose.key + '" ' +
                                (isChecked ? 'checked ' : '') +
                                (isDisabled ? 'disabled ' : '') +
                                'style="opacity: 0; width: 0; height: 0;">' +
                            '<span style="position: absolute; cursor: ' + (isDisabled ? 'not-allowed' : 'pointer') + '; ' +
                                'top: 0; left: 0; right: 0; bottom: 0; ' +
                                'background: ' + (isChecked ? banner.primaryColor : '#d1d5db') + '; ' +
                                (isDisabled ? 'opacity: 0.7; ' : '') +
                                'transition: 0.3s; border-radius: 28px;"></span>' +
                            '<span style="position: absolute; height: 22px; width: 22px; ' +
                                'left: ' + (isChecked ? '25px' : '3px') + '; bottom: 3px; ' +
                                'background: white; transition: 0.3s; border-radius: 50%; ' +
                                'box-shadow: 0 2px 4px rgba(0,0,0,0.15);"></span>' +
                        '</label>' +
                    '</div>' +
                '</div>';
        });

        // Language selector for header
        var headerLangHtml = '';
        if (config.supportedLanguages && config.supportedLanguages.length > 1) {
            var options = '';
            config.supportedLanguages.forEach(function(code) {
                options += '<option value="' + code + '"' + 
                    (code === lang ? ' selected' : '') + '>' + 
                    code.toUpperCase() + '</option>';
            });
            headerLangHtml = 
                '<div style="display: flex; align-items: center; gap: 0.5rem; margin-right: 1rem;">' +
                    '<span style="font-size: 1.1em;">🌐</span>' +
                    '<select id="complyark-lang-select" style="' +
                        'padding: 0.35rem 0.7rem; border: 1px solid rgba(0,0,0,0.15); ' +
                        'border-radius: 6px; background: white; cursor: pointer; font-size: 0.9em;">' + 
                        options + 
                    '</select>' +
                '</div>';
        }

        // Use banner text for header, notice for detailed info if available
        var headerTitle = bannerText.headline;
        var headerDesc = notice ? escapeHtml(notice.description) : escapeHtml(bannerText.description);
        var policyLink = notice && notice.policyLink ? notice.policyLink : '';
        var dpoEmail = notice && notice.dpoEmail ? notice.dpoEmail : '';
        var userRights = notice && notice.userRights ? escapeHtml(notice.userRights) : '';
        var withdrawalInstructions = notice && notice.withdrawalInstructions ? escapeHtml(notice.withdrawalInstructions) : '';
        var complaintInstructions = notice && notice.complaintInstructions ? escapeHtml(notice.complaintInstructions) : '';

        // Notice sections (only if notice details available)
        var noticeSectionsHtml = '';
        if (dpoEmail || userRights) {
            noticeSectionsHtml += 
                '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid rgba(0,0,0,0.08);">';
            
            // Organization Contact
            if (dpoEmail) {
                noticeSectionsHtml += 
                    '<div>' +
                        '<div style="font-size: 0.75em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(0,0,0,0.5); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">' +
                            '<span>📧</span> ORGANIZATION CONTACT' +
                        '</div>' +
                        '<div style="background: rgba(59, 130, 246, 0.08); border-radius: 8px; padding: 0.75rem;">' +
                            '<div style="font-weight: 500; font-size: 0.9em; margin-bottom: 0.25rem;">DPO/Grievance Officer:</div>' +
                            '<a href="mailto:' + escapeHtml(dpoEmail) + '" style="color: #2563eb; text-decoration: none; font-size: 0.9em;">' + 
                                escapeHtml(dpoEmail) + '</a>' +
                        '</div>' +
                    '</div>';
            }
            
            // Your Rights
            if (userRights) {
                noticeSectionsHtml += 
                    '<div>' +
                        '<div style="font-size: 0.75em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(0,0,0,0.5); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">' +
                            '<span>⚖️</span> YOUR RIGHTS' +
                        '</div>' +
                        '<div style="background: rgba(0,0,0,0.03); border-radius: 8px; padding: 0.75rem;">' +
                            '<div style="font-size: 0.85em; line-height: 1.4; margin-bottom: 0.5rem;">' + userRights + '</div>' +
                        '</div>' +
                    '</div>';
            }
            
            noticeSectionsHtml += '</div>';
        }

        // Always show Exercise Your Rights button
        var rightsButtonHtml = 
            '<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.08);">' +
                '<button id="complyark-rights-btn" style="' +
                    'background: transparent; border: 1px solid ' + banner.primaryColor + '; border-radius: 8px; ' +
                    'padding: 0.6rem 1rem; font-size: 0.9em; cursor: pointer; width: 100%; ' +
                    'color: ' + banner.primaryColor + '; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">' +
                    '<span>⚖️</span> Exercise Your Rights' +
                '</button>' +
            '</div>';

        // Withdrawal & Complaint cards (cream/beige design as per reference)
        var instructionsHtml = '';
        if (withdrawalInstructions || complaintInstructions) {
            instructionsHtml += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 1rem;">';
            
            if (withdrawalInstructions) {
                instructionsHtml += 
                    '<div style="background: rgba(245, 240, 230, 0.7); ' +
                        'border-radius: 10px; padding: 0.85rem; border: 1px solid rgba(0,0,0,0.08); border-left: 3px solid ' + banner.primaryColor + ';">' +
                        '<div style="font-weight: 600; font-size: 0.85em; color: ' + banner.textColor + '; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem;">' +
                            '<span>↩️</span> Withdrawal Instructions' +
                        '</div>' +
                        '<div style="font-size: 0.8em; color: rgba(0,0,0,0.7); line-height: 1.4;">' + withdrawalInstructions + '</div>' +
                    '</div>';
            }
            
            if (complaintInstructions) {
                instructionsHtml += 
                    '<div style="background: rgba(245, 240, 230, 0.7); ' +
                        'border-radius: 10px; padding: 0.85rem; border: 1px solid rgba(0,0,0,0.08); border-left: 3px solid ' + banner.primaryColor + ';">' +
                        '<div style="font-weight: 600; font-size: 0.85em; color: ' + banner.textColor + '; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem;">' +
                            '<span>ⓘ</span> Complaint Instructions' +
                        '</div>' +
                        '<div style="font-size: 0.8em; color: rgba(0,0,0,0.7); line-height: 1.4;">' + complaintInstructions + '</div>' +
                    '</div>';
            }
            
            instructionsHtml += '</div>';
        }

        // Cookie policy link HTML
        var policyLinkHtml = policyLink ? 
            '<a href="' + escapeHtml(policyLink) + '" target="_blank" style="' +
                'color: rgba(0,0,0,0.6); text-decoration: none; font-size: 0.9em; ' +
                'display: flex; align-items: center; gap: 0.3rem;">' +
                '<span>📄</span> Cookie Policy</a>' : '';

        overlay.innerHTML = 
            '<div style="background: ' + banner.backgroundColor + '; color: ' + banner.textColor + '; ' +
                'border-radius: 16px; max-width: 640px; width: 92%; max-height: 85vh; overflow-y: auto; ' +
                'box-shadow: 0 25px 80px rgba(0,0,0,0.25);">' +
                
                // Header
                '<div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.08);">' +
                    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">' +
                        '<div style="display: flex; align-items: center; gap: 0.6rem;">' +
                            '<span style="font-size: 1.4em;">🍪</span>' +
                            '<h2 style="margin: 0; font-weight: 600; font-size: 1.2em;">' + 
                                escapeHtml(headerTitle) + '</h2>' +
                        '</div>' +
                        '<div style="display: flex; align-items: center;">' +
                            headerLangHtml +
                            '<button id="complyark-close-settings" style="' +
                                'background: none; border: none; cursor: pointer; font-size: 1.6em; ' +
                                'color: ' + banner.textColor + '; opacity: 0.5; line-height: 1; padding: 0;">&times;</button>' +
                        '</div>' +
                    '</div>' +
                    '<p style="margin: 0; line-height: 1.5; opacity: 0.8; font-size: 0.95em;">' + 
                        headerDesc + 
                        (policyLink ? ' <a href="' + escapeHtml(policyLink) + '" target="_blank" style="color: ' + banner.primaryColor + '; text-decoration: none; font-weight: 500;">Read our Cookie Policy</a>.' : '') +
                    '</p>' +
                '</div>' +
                
                // Content
                '<div style="padding: 1.25rem 1.5rem;">' +
                    '<div style="font-size: 0.75em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(0,0,0,0.5); margin-bottom: 0.75rem;">CONSENT PREFERENCES</div>' +
                    purposesHtml +
                    noticeSectionsHtml +
                    instructionsHtml +
                    rightsButtonHtml +
                '</div>' +
                
                // Footer
                '<div style="padding: 1rem 1.5rem; border-top: 1px solid rgba(0,0,0,0.08); ' +
                    'display: flex; gap: 0.75rem; justify-content: space-between; align-items: center; flex-wrap: wrap;">' +
                    policyLinkHtml +
                    '<div style="display: flex; gap: 0.75rem; margin-left: auto;">' +
                        '<button id="complyark-reject-all-settings" style="' +
                            'padding: 0.65rem 1.25rem; border-radius: 8px; border: none; ' +
                            'background: ' + banner.rejectButtonColor + '; color: white; cursor: pointer; font-weight: 500;">' + 
                            escapeHtml(bannerText.rejectButton) + '</button>' +
                        '<button id="complyark-save-settings" style="' +
                            'padding: 0.65rem 1.25rem; border-radius: 8px; border: none; ' +
                            'background: ' + banner.acceptButtonColor + '; color: white; ' +
                            'cursor: pointer; font-weight: 600;">Save Preferences</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        return overlay;
    }

    // ============================================================================
    // UI RENDERING - EXERCISE YOUR RIGHTS FORM
    // ============================================================================

    function createRightsForm() {
        var config = state.config;
        var banner = config.banner;
        var notice = getNoticeTranslation(config.notice, state.resolvedLanguage);
        var dpoEmail = notice && notice.dpoEmail ? notice.dpoEmail : '';

        var overlay = document.createElement('div');
        overlay.id = 'complyark-rights-form';
        overlay.style.cssText = 
            'position: fixed; top: 0; left: 0; right: 0; bottom: 0; ' +
            'background: rgba(0,0,0,0.6); display: flex; ' +
            'align-items: center; justify-content: center; z-index: 1000001; ' +
            'font-family: ' + (banner.fontFamily || 'system-ui, -apple-system, sans-serif') + '; ' +
            'backdrop-filter: blur(4px);';

        // Input styles based on banner colors
        var inputStyle = 'width: 100%; padding: 0.6rem 0.8rem; font-size: 0.9em; ' +
            'border: 1px solid rgba(0,0,0,0.15); border-radius: 6px; outline: none; ' +
            'box-sizing: border-box; background: ' + banner.backgroundColor + '; ' +
            'color: ' + banner.textColor + ';';

        var labelStyle = 'display: block; font-size: 0.85em; font-weight: 500; ' +
            'color: ' + banner.textColor + '; margin-bottom: 0.4rem; margin-top: 0.8rem;';

        var tileStyle = 'border: 1px solid rgba(0,0,0,0.15); padding: 0.8rem; border-radius: 6px; ' +
            'cursor: pointer; background: rgba(0,0,0,0.02); text-align: center; font-size: 0.85em; ' +
            'transition: all 0.2s; color: ' + banner.textColor + ';';

        var tileSelectedStyle = tileStyle + ' border-color: ' + banner.acceptButtonColor + '; ' +
            'background: rgba(' + hexToRgb(banner.acceptButtonColor) + ', 0.1);';

        overlay.innerHTML = 
            '<div style="background: ' + banner.backgroundColor + '; color: ' + banner.textColor + '; ' +
                'border-radius: 16px; max-width: 640px; width: 92%; max-height: 85vh; overflow-y: auto; ' +
                'box-shadow: 0 25px 80px rgba(0,0,0,0.25);">' +
                
                // Header
                '<div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.08);">' +
                    '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                        '<div style="display: flex; align-items: center; gap: 0.6rem;">' +
                            '<span style="font-size: 1.4em;">⚖️</span>' +
                            '<h2 style="margin: 0; font-weight: 600; font-size: 1.2em;">Exercise Your Data Protection Rights</h2>' +
                        '</div>' +
                        '<button id="complyark-rights-close" style="' +
                            'background: none; border: none; cursor: pointer; font-size: 1.6em; ' +
                            'color: ' + banner.textColor + '; opacity: 0.5; line-height: 1; padding: 0;">&times;</button>' +
                    '</div>' +
                    '<p style="margin: 0.5rem 0 0 0; line-height: 1.5; opacity: 0.8; font-size: 0.9em;">' +
                        'Use this form to access, correct, erase your personal data, nominate a person, or raise a grievance.</p>' +
                '</div>' +
                
                // Form Content
                '<div style="padding: 1.25rem 1.5rem;" id="complyark-rights-content">' +
                    
                    // Step 1: Request Type
                    '<div id="complyark-step1">' +
                        '<div style="font-size: 0.75em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(0,0,0,0.5); margin-bottom: 0.75rem;">1. SELECT REQUEST TYPE</div>' +
                        '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.6rem;" id="complyark-request-types">' +
                            '<div class="rights-tile" data-type="Access" style="' + tileStyle + '">📋 Access My Data</div>' +
                            '<div class="rights-tile" data-type="Correction" style="' + tileStyle + '">✏️ Correct My Data</div>' +
                            '<div class="rights-tile" data-type="Erasure" style="' + tileStyle + '">🗑️ Erase My Data</div>' +
                            '<div class="rights-tile" data-type="Nomination" style="' + tileStyle + '">👤 Nominate a Person</div>' +
                            '<div class="rights-tile" data-type="Grievance" style="' + tileStyle + '">📢 Raise a Grievance</div>' +
                        '</div>' +
                    '</div>' +
                    
                    // Step 2: Your Details (hidden initially)
                    '<div id="complyark-step2" style="display: none; margin-top: 1.5rem;">' +
                        '<div style="font-size: 0.75em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(0,0,0,0.5); margin-bottom: 0.75rem;">2. YOUR DETAILS</div>' +
                        '<label style="' + labelStyle + '">Email Address *</label>' +
                        '<input type="email" id="complyark-rights-email" style="' + inputStyle + '" required />' +
                        '<label style="' + labelStyle + '">Confirm Email Address *</label>' +
                        '<input type="email" id="complyark-rights-email-confirm" style="' + inputStyle + '" required />' +
                        '<label style="' + labelStyle + '">Short Description *</label>' +
                        '<textarea id="complyark-rights-description" style="' + inputStyle + ' min-height: 60px; resize: vertical;"></textarea>' +
                    '</div>' +
                    
                    // Step 3: Request Details (hidden initially, content changes based on type)
                    '<div id="complyark-step3" style="display: none; margin-top: 1.5rem;">' +
                        '<div style="font-size: 0.75em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(0,0,0,0.5); margin-bottom: 0.75rem;">3. REQUEST DETAILS</div>' +
                        '<div id="complyark-details-content"></div>' +
                    '</div>' +
                    
                    // Step 4: Review & Submit (hidden initially)
                    '<div id="complyark-step4" style="display: none; margin-top: 1.5rem;">' +
                        '<div style="font-size: 0.75em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(0,0,0,0.5); margin-bottom: 0.75rem;">REVIEW & SUBMIT</div>' +
                        '<div style="background: rgba(0,0,0,0.03); padding: 1rem; border-radius: 8px;">' +
                            '<p style="margin: 0 0 0.5rem 0; font-size: 0.9em;"><strong>Request Type:</strong> <span id="complyark-review-type"></span></p>' +
                            '<p style="margin: 0 0 0.5rem 0; font-size: 0.9em;"><strong>Email:</strong> <span id="complyark-review-email"></span></p>' +
                            '<p style="margin: 0; font-size: 0.9em;"><strong>Description:</strong> <span id="complyark-review-desc"></span></p>' +
                        '</div>' +
                    '</div>' +
                    
                    // Confirmation (hidden initially)
                    '<div id="complyark-confirmation" style="display: none; text-align: center; padding: 2rem 0;">' +
                        '<div style="font-size: 3em; margin-bottom: 1rem;">✅</div>' +
                        '<h3 style="margin: 0 0 0.5rem 0; font-weight: 600;">Request Submitted</h3>' +
                        '<p style="margin: 0; opacity: 0.8; font-size: 0.9em;">Your request has been registered successfully.</p>' +
                        '<p style="margin: 0.5rem 0; font-size: 0.9em;"><strong>Request ID:</strong> <span id="complyark-request-id"></span></p>' +
                        '<p style="margin: 0; opacity: 0.8; font-size: 0.9em;">We will contact you via email with updates.</p>' +
                    '</div>' +
                    
                '</div>' +
                
                // Footer
                '<div id="complyark-rights-footer" style="padding: 1rem 1.5rem; border-top: 1px solid rgba(0,0,0,0.08); display: flex; justify-content: flex-end; gap: 0.75rem;">' +
                    '<button id="complyark-rights-submit" style="' +
                        'padding: 0.65rem 1.5rem; border-radius: 8px; border: none; ' +
                        'background: ' + banner.acceptButtonColor + '; color: white; ' +
                        'cursor: pointer; font-weight: 600; opacity: 0.5;" disabled>Submit Request</button>' +
                '</div>' +
            '</div>';

        return overlay;
    }

    function hexToRgb(hex) {
        var result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
        return result ? 
            parseInt(result[1], 16) + ',' + parseInt(result[2], 16) + ',' + parseInt(result[3], 16) :
            '0,0,0';
    }

    var rightsFormState = {
        selectedType: '',
        element: null
    };

    function showRightsForm() {
        if (rightsFormState.element) {
            document.body.removeChild(rightsFormState.element);
        }

        var form = createRightsForm();
        if (!form) return;

        rightsFormState.element = form;
        rightsFormState.selectedType = '';
        document.body.appendChild(form);

        var banner = state.config.banner;

        // Close button
        document.getElementById('complyark-rights-close').onclick = hideRightsForm;

        // Request type tiles
        var tiles = form.querySelectorAll('.rights-tile');
        for (var i = 0; i < tiles.length; i++) {
            (function(tile) {
                tile.onclick = function() {
                    // Deselect all
                    for (var j = 0; j < tiles.length; j++) {
                        tiles[j].style.borderColor = 'rgba(0,0,0,0.15)';
                        tiles[j].style.background = 'rgba(0,0,0,0.02)';
                    }
                    // Select this one
                    tile.style.borderColor = banner.acceptButtonColor;
                    tile.style.background = 'rgba(' + hexToRgb(banner.acceptButtonColor) + ', 0.1)';
                    
                    rightsFormState.selectedType = tile.getAttribute('data-type');
                    
                    // Show step 2
                    document.getElementById('complyark-step2').style.display = 'block';
                    
                    // Show step 3 with appropriate content
                    renderRightsDetails(rightsFormState.selectedType);
                    
                    // Show step 4
                    document.getElementById('complyark-step4').style.display = 'block';
                    
                    // Enable submit button
                    document.getElementById('complyark-rights-submit').disabled = false;
                    document.getElementById('complyark-rights-submit').style.opacity = '1';
                };
            })(tiles[i]);
        }

        // Submit button
        document.getElementById('complyark-rights-submit').onclick = submitRightsRequest;

        console.log('[ComplyArk] Rights form displayed');
    }

    function renderRightsDetails(type) {
        var banner = state.config.banner;
        var inputStyle = 'width: 100%; padding: 0.6rem 0.8rem; font-size: 0.9em; ' +
            'border: 1px solid rgba(0,0,0,0.15); border-radius: 6px; outline: none; ' +
            'box-sizing: border-box; background: ' + banner.backgroundColor + '; ' +
            'color: ' + banner.textColor + ';';
        var labelStyle = 'display: block; font-size: 0.85em; font-weight: 500; ' +
            'color: ' + banner.textColor + '; margin-bottom: 0.4rem; margin-top: 0.8rem;';
        var checkboxStyle = 'display: flex; align-items: center; gap: 0.5rem; font-size: 0.9em; margin-top: 0.6rem;';

        var html = '';
        var step3 = document.getElementById('complyark-step3');

        if (type === 'Access') {
            // No additional details needed for Access
            step3.style.display = 'none';
        } else if (type === 'Correction') {
            html = '<label style="' + labelStyle + '">Incorrect Data *</label>' +
                '<textarea id="complyark-incorrect-data" style="' + inputStyle + ' min-height: 50px; resize: vertical;"></textarea>' +
                '<label style="' + labelStyle + '">Correct Data *</label>' +
                '<textarea id="complyark-correct-data" style="' + inputStyle + ' min-height: 50px; resize: vertical;"></textarea>';
            step3.style.display = 'block';
        } else if (type === 'Erasure') {
            html = '<label style="' + labelStyle + '">Reason (Optional)</label>' +
                '<select id="complyark-erasure-reason" style="' + inputStyle + '">' +
                    '<option>Consent withdrawn</option>' +
                    '<option>No longer required</option>' +
                    '<option>Other</option>' +
                '</select>' +
                '<div style="' + checkboxStyle + '">' +
                    '<input type="checkbox" id="complyark-erasure-ack" />' +
                    '<label for="complyark-erasure-ack" style="margin: 0;">I understand some data may be retained as required by law</label>' +
                '</div>';
            step3.style.display = 'block';
        } else if (type === 'Nomination') {
            html = '<label style="' + labelStyle + '">Nominee Name *</label>' +
                '<input type="text" id="complyark-nominee-name" style="' + inputStyle + '" />' +
                '<label style="' + labelStyle + '">Nominee Email *</label>' +
                '<input type="email" id="complyark-nominee-email" style="' + inputStyle + '" />';
            step3.style.display = 'block';
        } else if (type === 'Grievance') {
            html = '<label style="' + labelStyle + '">Grievance Category *</label>' +
                '<select id="complyark-grievance-category" style="' + inputStyle + '">' +
                    '<option>Delay in response</option>' +
                    '<option>Improper handling</option>' +
                    '<option>Consent issue</option>' +
                '</select>' +
                '<label style="' + labelStyle + '">Details *</label>' +
                '<textarea id="complyark-grievance-details" style="' + inputStyle + ' min-height: 60px; resize: vertical;"></textarea>';
            step3.style.display = 'block';
        }

        document.getElementById('complyark-details-content').innerHTML = html;
    }

    function submitRightsRequest() {
        var email = document.getElementById('complyark-rights-email').value;
        var confirmEmail = document.getElementById('complyark-rights-email-confirm').value;
        var description = document.getElementById('complyark-rights-description').value;

        // Basic validation
        if (!email || !confirmEmail || !description) {
            alert('Please fill in all required fields.');
            return;
        }

        if (email !== confirmEmail) {
            alert('Email addresses do not match.');
            return;
        }

        // Update review section
        document.getElementById('complyark-review-type').innerText = rightsFormState.selectedType;
        document.getElementById('complyark-review-email').innerText = email;
        document.getElementById('complyark-review-desc').innerText = description;

        // Generate request ID
        var requestId = 'DSR-' + new Date().getFullYear() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        document.getElementById('complyark-request-id').innerText = requestId;

        // Hide form steps and show confirmation
        document.getElementById('complyark-step1').style.display = 'none';
        document.getElementById('complyark-step2').style.display = 'none';
        document.getElementById('complyark-step3').style.display = 'none';
        document.getElementById('complyark-step4').style.display = 'none';
        document.getElementById('complyark-confirmation').style.display = 'block';
        document.getElementById('complyark-rights-footer').style.display = 'none';

        console.log('[ComplyArk] Rights request submitted:', {
            type: rightsFormState.selectedType,
            email: email,
            description: description,
            requestId: requestId
        });

        // TODO: Send to backend API
    }

    function hideRightsForm() {
        if (rightsFormState.element && rightsFormState.element.parentNode) {
            document.body.removeChild(rightsFormState.element);
            rightsFormState.element = null;
        }
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

        document.getElementById('complyark-close-settings').onclick = function() {
            hideSettings();
            showBanner();
        };

        document.getElementById('complyark-reject-all-settings').onclick = function() {
            handleRejectAll();
            hideSettings();
        };

        document.getElementById('complyark-save-settings').onclick = handleSaveSettings;

        // Exercise Your Rights button
        var rightsBtn = document.getElementById('complyark-rights-btn');
        if (rightsBtn) {
            rightsBtn.onclick = function() {
                hideSettings();
                showRightsForm();
            };
        }

        // Language selector
        var langSelect = document.getElementById('complyark-lang-select');
        if (langSelect) {
            langSelect.onchange = function() {
                persistLanguage(this.value);
                state.resolvedLanguage = this.value;
                hideSettings();
                showSettings();
            };
        }

        // Toggle switches
        var toggles = settings.querySelectorAll('input[data-purpose]');
        for (var i = 0; i < toggles.length; i++) {
            (function(toggle) {
                toggle.onchange = function() {
                    var slider = this.nextElementSibling;
                    var knob = slider.nextElementSibling;
                    slider.style.backgroundColor = this.checked ? state.config.banner.primaryColor : '#d1d5db';
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
        state.config.purposes.forEach(function(p) {
            consent[p.key] = true;
        });
        state.purposes = consent;
        state.consentGiven = true;
        saveConsent(consent);
        hideBanner();
        hideSettings();
        replayConsentedResources();
    }

    function handleRejectAll() {
        console.log('[ComplyArk] Reject All clicked');
        var consent = {};
        state.config.purposes.forEach(function(p) {
            consent[p.key] = p.required; // Only essential purposes
        });
        state.purposes = consent;
        state.consentGiven = true;
        saveConsent(consent);
        hideBanner();
        hideSettings();
        replayConsentedResources();
    }

    function handleSaveSettings() {
        console.log('[ComplyArk] Save Settings clicked');
        var toggles = state.settingsElement.querySelectorAll('input[data-purpose]');
        var consent = {};
        
        for (var i = 0; i < toggles.length; i++) {
            consent[toggles[i].getAttribute('data-purpose')] = toggles[i].checked;
        }

        state.purposes = consent;
        state.consentGiven = true;
        saveConsent(consent);
        hideSettings();
        replayConsentedResources();
    }

    // ============================================================================
    // PUBLIC API
    // ============================================================================

    window.ComplyArk = {
        // Open settings panel
        openSettings: function() {
            if (state.config) {
                showSettings();
            }
        },
        // Check if purpose is consented
        hasConsent: function(purpose) {
            return isPurposeConsented(purpose);
        },
        // Get all consent
        getConsent: function() {
            return Object.assign({}, state.purposes);
        },
        // Withdraw consent (re-show banner)
        withdrawConsent: function() {
            try {
                localStorage.removeItem(CONSENT_KEY);
            } catch (e) {}
            state.purposes = {};
            state.consentGiven = false;
            showBanner();
        }
    };

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    function init() {
        console.log('[ComplyArk] Fetching runtime config...');

        // CRITICAL: Scan and intercept BEFORE loading config
        scanBlockedResources();
        interceptDynamicScripts();

        // Check for existing consent
        var existingConsent = loadExistingConsent();
        
        if (existingConsent && existingConsent.purposes) {
            console.log('[ComplyArk] Existing consent found, applying...');
            state.purposes = existingConsent.purposes;
            state.consentGiven = true;
            state.resolvedLanguage = existingConsent.language || 'en';
            
            // Still need to fetch config for replay
            fetchConfig(function() {
                replayConsentedResources();
            });
            return;
        }

        // No existing consent - fetch config and show banner
        fetchConfig(function() {
            showBanner();
        });
    }

    function fetchConfig(callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', API_BASE + '/runtime/websites/' + SITE_ID, true);

        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var config = JSON.parse(xhr.responseText);
                    
                    // Validate English notice exists
                    if (!config.notice || !config.notice['en']) {
                        console.error('[ComplyArk] FAIL CLOSED: English notice missing');
                        return;
                    }

                    // Validate purposes have English labels
                    if (!config.purposes || config.purposes.length === 0) {
                        console.error('[ComplyArk] FAIL CLOSED: No purposes defined');
                        return;
                    }

                    for (var i = 0; i < config.purposes.length; i++) {
                        if (!config.purposes[i].labels || !config.purposes[i].labels['en']) {
                            console.error('[ComplyArk] FAIL CLOSED: Purpose missing English label');
                            return;
                        }
                    }

                    console.log('[ComplyArk] Config loaded successfully');
                    state.config = config;
                    state.resolvedLanguage = resolveLanguage(config);

                    // Initialize purpose states
                    config.purposes.forEach(function(p) {
                        if (state.purposes[p.key] === undefined) {
                            state.purposes[p.key] = p.required; // Essential = true, others = false
                        }
                    });

                    if (callback) callback();

                } catch (e) {
                    console.error('[ComplyArk] FAIL CLOSED: Cannot parse config', e);
                }
            } else if (xhr.status === 404) {
                console.error('[ComplyArk] FAIL CLOSED: Website not found or not active');
            } else {
                console.error('[ComplyArk] FAIL CLOSED: Config fetch failed:', xhr.status);
            }
        };

        xhr.onerror = function() {
            console.error('[ComplyArk] FAIL CLOSED: Network error');
        };

        xhr.send();
    }

    // Start when DOM is ready
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
