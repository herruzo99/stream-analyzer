// js/types/globals.d.ts

// This file is for declaring types for global variables and properties
// that are not part of the standard library or imported modules.
// This is common when using scripts loaded from a CDN.

interface Window {
    // Functions defined in index.html for on-demand script loading
    loadGoogleAnalytics: () => void;
    loadSentry: () => void;
    loadClarity: () => void;
    gaLoaded?: boolean;
    sentryLoaded?: boolean;
    clarityLoaded?: boolean;

    // The CookieConsent library object
    CookieConsent: any;

    // The Sentry SDK object
    Sentry?: {
        captureException: (
            error: any,
            context?: { extra: Record<string, any> }
        ) => void;
    };

    // Google Analytics dataLayer
    dataLayer: any[];

    // Injected by post-build script
    ASSET_PATHS: {
        worker: string;
    };
    PROD_HOSTNAME: string;
}
