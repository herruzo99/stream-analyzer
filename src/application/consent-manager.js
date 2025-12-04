/**
 * @typedef {object} OnChangePayload
 * @property {string[]} acceptedCategories
 * @property {string[]} rejectedCategories
 * @property {object} SCRIPT
 */

/**
 * Initializes the CookieConsent.js library with categories for analytics, marketing, and error reporting.
 * Implements Google Consent Mode v2 "Advanced Mode" logic.
 */
export function initializeConsentManager() {
    /** @type {any} */
    const CookieConsent = window.CookieConsent;

    if (!CookieConsent) {
        console.error('CookieConsent library not found.');
        return;
    }

    /**
     * Updates Google Consent Mode state based on selected categories.
     * @param {string[]} categories
     */
    const updateGtagConsent = (categories) => {
        const cats = categories || [];
        // Only run logic if we are in a live environment (optional check, but good practice)
        // The gtag function itself is shimmed in index.html so this won't crash in dev.
        if (typeof window.gtag === 'function') {
            const consentUpdate = {
                analytics_storage: cats.includes('analytics')
                    ? 'granted'
                    : 'denied',
                ad_storage: cats.includes('marketing') ? 'granted' : 'denied',
                ad_user_data: cats.includes('marketing') ? 'granted' : 'denied',
                ad_personalization: cats.includes('marketing')
                    ? 'granted'
                    : 'denied',
            };
            window.gtag('consent', 'update', consentUpdate);
            console.debug(
                '[Consent] Updated Google Consent Mode:',
                consentUpdate
            );
        }
    };

    /**
     * Loads non-Google scripts that require explicit blocking (Basic Mode).
     * @param {string[]} acceptedCategories
     */
    const loadBlockingTrackers = (acceptedCategories) => {
        const cats = acceptedCategories || [];
        // Only run tracking scripts on the production domain
        if (window.location.hostname !== window.PROD_HOSTNAME) {
            return;
        }

        if (cats.includes('analytics')) {
            window.loadClarity();
        }

        if (cats.includes('error_reporting')) {
            window.loadSentry();
        }
    };

    CookieConsent.run({
        language: {
            default: 'en',
            translations: {
                en: {
                    consentModal: {
                        title: 'Privacy & Cookies',
                        description:
                            'We use cookies to improve your experience. Some are necessary for the site to work, while others help us understand how you use it and serve relevant content.',
                        acceptAllBtn: 'Accept All',
                        acceptNecessaryBtn: 'Reject Non-Essential',
                        showPreferencesBtn: 'Manage Preferences',
                    },
                    preferencesModal: {
                        title: 'Consent Preferences',
                        acceptAllBtn: 'Accept All',
                        acceptNecessaryBtn: 'Reject All',
                        savePreferencesBtn: 'Save Choices',
                        sections: [
                            {
                                title: 'Usage',
                                description:
                                    'Configure which cookies and trackers you allow.',
                            },
                            {
                                title: 'Strictly Necessary',
                                description:
                                    'Essential for the website to function. These cannot be disabled.',
                                linkedCategory: 'necessary',
                                readOnly: true,
                            },
                            {
                                title: 'Performance & Analytics',
                                description:
                                    'Helps us understand how visitors interact with the website.',
                                linkedCategory: 'analytics',
                            },
                            {
                                title: 'Marketing & Advertisement',
                                description:
                                    'Used to deliver relevant ads and track ad performance.',
                                linkedCategory: 'marketing',
                            },
                            {
                                title: 'Error Reporting',
                                description:
                                    'Helps us identify and fix bugs in real-time.',
                                linkedCategory: 'error_reporting',
                            },
                        ],
                    },
                },
            },
        },

        categories: {
            necessary: {
                enabled: true,
                readOnly: true,
            },
            analytics: {
                enabled: false,
                autoClear: {
                    cookies: [{ name: /^_ga/ }, { name: /^_gid/ }],
                },
            },
            marketing: {
                enabled: false,
                autoClear: {
                    cookies: [{ name: /^_gcl/ }],
                },
            },
            error_reporting: {
                enabled: false,
            },
        },

        // Updated to use getUserPreferences() to ensure we always get the valid array
        onConsent: () => {
            const prefs = CookieConsent.getUserPreferences();
            const categories = prefs.accepted_categories || [];
            updateGtagConsent(categories);
            loadBlockingTrackers(categories);
        },

        onChange: () => {
            const prefs = CookieConsent.getUserPreferences();
            const categories = prefs.accepted_categories || [];
            updateGtagConsent(categories);
        },
    });
}
