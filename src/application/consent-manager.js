import { appLog } from '@/shared/utils/debug';

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
        appLog(
            'ConsentManager',
            'error',
            'CookieConsent library not found in window scope.'
        );
        return;
    }

    // Expose a debug helper to clear consent for testing
    window.resetConsent = () => {
        CookieConsent.reset(true);
        appLog('ConsentManager', 'warn', 'Consent reset. Reloading page...');
        window.location.reload();
    };
    appLog(
        'ConsentManager',
        'info',
        'Library found. Use window.resetConsent() to clear preferences.'
    );

    /**
     * Updates Google Consent Mode state based on selected categories.
     * @param {string[]} categories
     */
    const updateGtagConsent = (categories) => {
        const cats = categories || [];
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
            appLog(
                'ConsentManager',
                'info',
                'Updated Google Consent Mode',
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

        // Only run tracking scripts if the hostname matches the build configuration.
        if (window.location.hostname !== window.PROD_HOSTNAME) {
            appLog(
                'ConsentManager',
                'warn',
                `Hostname mismatch (${window.location.hostname} vs ${window.PROD_HOSTNAME}). Tracking disabled.`
            );
            return;
        }

        appLog(
            'ConsentManager',
            'info',
            'Evaluating trackers for categories:',
            cats
        );

        // --- Clarity (Analytics) ---
        if (cats.includes('analytics')) {
            if (typeof window.loadClarity === 'function') {
                appLog(
                    'ConsentManager',
                    'info',
                    'Permission granted: Loading Clarity.'
                );
                window.loadClarity();
            } else {
                appLog(
                    'ConsentManager',
                    'error',
                    'window.loadClarity is missing from index.html.'
                );
            }
        } else {
            appLog(
                'ConsentManager',
                'log',
                'Skipping Clarity (Category "analytics" not accepted).'
            );
        }

        // --- Sentry (Error Reporting) ---
        if (cats.includes('error_reporting')) {
            if (typeof window.loadSentry === 'function') {
                appLog(
                    'ConsentManager',
                    'info',
                    'Permission granted: Loading Sentry.'
                );
                window.loadSentry();
            } else {
                appLog(
                    'ConsentManager',
                    'error',
                    'window.loadSentry is missing from index.html.'
                );
            }
        } else {
            appLog(
                'ConsentManager',
                'log',
                'Skipping Sentry (Category "error_reporting" not accepted).'
            );
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

        onConsent: () => {
            const prefs = CookieConsent.getUserPreferences();
            // Fix: Use camelCase 'acceptedCategories' for CookieConsent v3
            const categories = prefs.acceptedCategories || [];
            appLog(
                'ConsentManager',
                'info',
                'onConsent fired. Categories:',
                categories
            );
            updateGtagConsent(categories);
            loadBlockingTrackers(categories);
        },

        onChange: () => {
            const prefs = CookieConsent.getUserPreferences();
            // Fix: Use camelCase 'acceptedCategories' for CookieConsent v3
            const categories = prefs.acceptedCategories || [];
            appLog(
                'ConsentManager',
                'info',
                'onChange fired. New Categories:',
                categories
            );
            updateGtagConsent(categories);
            loadBlockingTrackers(categories);
        },
    });
}
