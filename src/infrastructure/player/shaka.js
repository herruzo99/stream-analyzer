import { shakaNetworkPlugin } from './shaka-network-plugin.js';
import { debugLog } from '@/shared/utils/debug';

let shakaSingleton = null;
let shakaInitializationPromise = null;

/**
 * Asynchronously loads and configures the Shaka Player library.
 * This function is now idempotent and robustly handles the UMD module's asynchronous
 * attachment to the window object by polling.
 * @returns {Promise<any>}
 */
export function getShaka() {
    if (shakaSingleton) {
        return Promise.resolve(shakaSingleton);
    }

    if (shakaInitializationPromise) {
        return shakaInitializationPromise;
    }

    shakaInitializationPromise = new Promise((resolve, reject) => {
        const startTime = Date.now();
        const timeout = 5000; // 5 seconds

        const checkShaka = () => {
            const shaka = window.shaka;

            if (shaka && shaka.ui) {
                debugLog(
                    'shaka-canonical',
                    'Shaka and Shaka UI are attached to window. Initializing singleton.'
                );

                shaka.net.NetworkingEngine.registerScheme(
                    'http',
                    shakaNetworkPlugin
                );
                shaka.net.NetworkingEngine.registerScheme(
                    'https',
                    shakaNetworkPlugin
                );

                shakaSingleton = shaka;
                resolve(shakaSingleton);
            } else if (Date.now() - startTime > timeout) {
                reject(
                    new Error(
                        'Shaka Player library failed to attach to the window object within the timeout period.'
                    )
                );
            } else {
                setTimeout(checkShaka, 30); // Poll every 30ms
            }
        };

        checkShaka();
    });

    return shakaInitializationPromise;
}