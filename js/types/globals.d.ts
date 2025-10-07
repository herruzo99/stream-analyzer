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

    // Google Analytics dataLayer
    dataLayer: any[];
}
