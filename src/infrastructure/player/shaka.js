import { appLog } from '@/shared/utils/debug';
import { shakaNetworkPlugin } from './shaka-network-plugin.js';

let shakaSingleton = null;
let shakaInitialization = null;

/**
 * Initializes and configures the Shaka Player library singleton.
 * This function should be called once at application boot.
 * @returns {Promise<any>}
 */
async function initializeShaka() {
    if (shakaSingleton) {
        return shakaSingleton;
    }

    if (!shakaInitialization) {
        shakaInitialization = (async () => {
            const module = await import(
                'shaka-player/dist/shaka-player.ui.js'
            );
            /** @type {any} */
            const shaka = module.default ?? module;
            if (!shaka) {
                throw new Error(
                    'Shaka Player module failed to import correctly.'
                );
            }

            appLog(
                'shaka-canonical',
                'info',
                'Shaka Player module imported. Initializing singleton.'
            );

            // Configure Shaka Player networking only when a media workflow
            // first requests the player engine.
            shaka.net.NetworkingEngine.registerScheme(
                'http',
                shakaNetworkPlugin
            );
            shaka.net.NetworkingEngine.registerScheme(
                'https',
                shakaNetworkPlugin
            );

            shakaSingleton = shaka;
            return shakaSingleton;
        })().catch((error) => {
            shakaInitialization = null;
            throw error;
        });
    }

    return shakaInitialization;
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
