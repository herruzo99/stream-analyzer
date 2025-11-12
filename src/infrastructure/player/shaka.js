import { shakaNetworkPlugin } from './shaka-network-plugin.js';
import { appLog } from '@/shared/utils/debug';
import shaka from 'shaka-player/dist/shaka-player.ui.js';

let shakaSingleton = null;

/**
 * Initializes and configures the Shaka Player library singleton.
 * This function should be called once at application boot.
 * @returns {Promise<any>}
 */
async function initializeShaka() {
    if (shakaSingleton) {
        return shakaSingleton;
    }

    if (!shaka) {
        throw new Error('Shaka Player module failed to import correctly.');
    }

    appLog(
        'shaka-canonical',
        'info',
        'Shaka Player module imported. Initializing singleton.'
    );

    // Configure Shaka Player networking
    shaka.net.NetworkingEngine.registerScheme('http', shakaNetworkPlugin);
    shaka.net.NetworkingEngine.registerScheme('https', shakaNetworkPlugin);

    shakaSingleton = shaka;
    return shakaSingleton;
}

/**
 * A singleton accessor for the initialized Shaka Player library.
 * It ensures that Shaka is initialized before it's used.
 * @returns {Promise<any>}
 */
export async function getShaka() {
    if (!shakaSingleton) {
        return initializeShaka();
    }
    return Promise.resolve(shakaSingleton);
}