declare module 'shaka-player/dist/shaka-player.compiled.js' {
    export = shaka;
}

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

    // The shaka player global object, for reference in legacy code or debugging
    shaka: typeof import('shaka-player/dist/shaka-player.compiled');
}