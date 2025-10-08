/**
 * @typedef {object} OnChangePayload
 * @property {string[]} acceptedCategories
 * @property {string[]} rejectedCategories
 * @property {object} SCRIPT
 */

/**
 * Initializes the CookieConsent.js library with categories for analytics and error reporting.
 * It handles the conditional loading of tracking scripts based on user consent and the application's hostname.
 *
 * This function relies on loader functions (`loadGoogleAnalytics`, `loadSentry`, `loadClarity`)
 * being globally available, as defined in `index.html`.
 */
export function initializeConsentManager() {
    /** @type {any} */
    const CookieConsent = window.CookieConsent;

    if (!CookieConsent) {
        console.error('CookieConsent library not found.');
        return;
    }

    CookieConsent.run({
        // The language configuration is mandatory.
        language: {
            default: 'en',
            translations: {
                en: {
                    consentModal: {
                        title: 'This website uses cookies',
                        description:
                            'We use cookies and similar tracking technologies to understand how you use our tool and to improve your experience. This includes analytics to measure usage and error reporting to help us find and fix bugs.',
                        acceptAllBtn: 'Accept all',
                        acceptNecessaryBtn: 'Reject all',
                        showPreferencesBtn: 'Manage preferences',
                    },
                    preferencesModal: {
                        title: 'Manage consent preferences',
                        acceptAllBtn: 'Accept all',
                        acceptNecessaryBtn: 'Reject all',
                        savePreferencesBtn: 'Save preferences',
                        sections: [
                            {
                                title: 'Cookie Usage',
                                description:
                                    'This tool uses cookies to enhance functionality and to analyze site performance. You can choose whether to allow non-essential cookies below.',
                            },
                            {
                                title: 'Strictly Necessary Cookies',
                                description:
                                    'These cookies are essential for the website to function and cannot be switched off in our systems. They do not store any personally identifiable information.',
                                linkedCategory: 'necessary',
                                readOnly: true,
                            },
                            {
                                title: 'Performance & Analytics Cookies',
                                description:
                                    'These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. This helps us understand which features are most popular and how users move around the site.',
                                linkedCategory: 'analytics',
                            },
                            {
                                title: 'Error Reporting Cookies',
                                description:
                                    'These cookies help us detect and fix bugs by reporting errors that occur during your session. This data is used to improve the stability and reliability of the application.',
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
                    cookies: [{ name: /^_ga/ }],
                },
            },
            error_reporting: {
                enabled: false,
            },
        },

        /**
         * This callback function is executed whenever the user's consent choices change.
         * @param {OnChangePayload} payload
         */
        onChange: ({ acceptedCategories }) => {
            // Only run tracking scripts on the production domain
            if (window.location.hostname !== 'stream-analyzer.herruzo.dev') {
                return;
            }

            if (acceptedCategories.includes('analytics')) {
                // These functions are defined globally in index.html
                window.loadGoogleAnalytics();
                window.loadClarity();
            }

            if (acceptedCategories.includes('error_reporting')) {
                window.loadSentry();
            }
        },
    });
}
