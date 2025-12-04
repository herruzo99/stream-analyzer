import { emeInterceptor } from '@/features/drm/domain/eme-interceptor.js';
import { appLog } from '@/shared/utils/debug';
import { startApp } from './boot.js';

// Initialize EME Interceptor immediately, before any other code runs
// or libraries (like Shaka) have a chance to cache the native API.
try {
    emeInterceptor.initialize();
    appLog('Main', 'info', 'EME Interceptor initialized early.');
} catch (e) {
    appLog('Main', 'error', 'Failed to initialize EME Interceptor:', e);
}

document.addEventListener('DOMContentLoaded', startApp);