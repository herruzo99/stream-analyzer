import { emeInterceptor } from '@/features/drm/domain/eme-interceptor.js';
import { appLog } from '@/shared/utils/debug';

// Initialize EME Interceptor immediately, before any other code runs
// or libraries (like Shaka) have a chance to cache the native API.
try {
    emeInterceptor.initialize();
    appLog('Main', 'info', 'EME Interceptor initialized early.');
} catch (e) {
    appLog('Main', 'error', 'Failed to initialize EME Interceptor:', e);
}

document.addEventListener('DOMContentLoaded', async () => {
    // Keep the landing entrypoint small and defer feature engines until the
    // document is interactive. The boot module remains same-origin and is
    // emitted as a production ESM chunk.
    const { startApp } = await import('./boot.js');
    await startApp();
});
