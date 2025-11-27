import { emeInterceptor } from '@/features/drm/domain/eme-interceptor.js';
import { startApp } from './boot.js';

// Initialize EME Interceptor immediately, before any other code runs
// or libraries (like Shaka) have a chance to cache the native API.
try {
    emeInterceptor.initialize();
    console.debug('[Main] EME Interceptor initialized early.');
} catch (e) {
    console.error('[Main] Failed to initialize EME Interceptor:', e);
}

document.addEventListener('DOMContentLoaded', startApp);
