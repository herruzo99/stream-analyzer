import shakaModule from 'shaka-player/dist/shaka-player.ui.js';
import { shakaNetworkPlugin } from './shaka-network-plugin.js';
import { debugLog } from '@/shared/utils/debug';

let shakaSingleton = null;

/**
 * Asynchronously loads and configures the Shaka Player library.
 * Ensures the network plugin is registered exactly once.
 * Returns a promise that resolves to the configured shaka object.
 * @returns {Promise<shaka>}
 */
export async function getShaka() {
    if (shakaSingleton) {
        return shakaSingleton;
    }

    // The UMD module's default export contains the shaka namespace.
    const shaka = shakaModule;

    if (!shaka) {
        throw new Error('Shaka Player library failed to load as an ES module.');
    }

    debugLog(
        'shaka-canonical',
        'Registering unified network plugin on canonical shaka object.'
    );
    shaka.net.NetworkingEngine.registerScheme('http', shakaNetworkPlugin);
    shaka.net.NetworkingEngine.registerScheme('https', shakaNetworkPlugin);

    shakaSingleton = shaka;
    return shakaSingleton;
}
