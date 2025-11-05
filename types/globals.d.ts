

declare interface Window {
    shaka: any;

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

// Add Picture-in-Picture API definitions
interface HTMLMediaElement {
    requestPictureInPicture(): Promise<PictureInPictureWindow>;
}

interface Document {
    readonly pictureInPictureEnabled: boolean;
    readonly pictureInPictureElement: HTMLVideoElement | null;
    exitPictureInPicture(): Promise<void>;
}

interface PictureInPictureWindow extends EventTarget {
    readonly width: number;
    readonly height: number;
    onresize: ((this: PictureInPictureWindow, ev: Event) => any) | null;
}