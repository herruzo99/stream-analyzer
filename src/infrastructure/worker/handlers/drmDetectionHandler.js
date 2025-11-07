import { fetchWithAuth } from '../http.js';
import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm.js';
import { debugLog } from '@/shared/utils/debug';

/**
 * Parses attributes from an HLS tag line.
 * @param {string} line The line containing attributes.
 * @returns {Record<string, string>} A map of attribute keys to values.
 */
function parseHlsAttributes(line) {
    /** @type {Record<string, string>} */
    const attributes = {};
    const regex = /([A-Z0-9-]+)=("[^"]*"|[^,]+)/g;
    let match;

    while ((match = regex.exec(line)) !== null) {
        const key = match[1];
        let value = match[2];

        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
        }
        attributes[key] = value;
    }
    return attributes;
}

/**
 * Scans a manifest string for DRM information.
 * @param {string} manifestString The manifest content.
 * @returns {Set<string>} A set of detected DRM system names.
 */
function scanForDrm(manifestString) {
    const detectedSystems = new Set();

    // DASH: Look for <ContentProtection> elements and their schemeIdUri
    const dashRegex = /<ContentProtection[^>]*schemeIdUri="([^"]+)"/gi;
    let match;
    while ((match = dashRegex.exec(manifestString)) !== null) {
        const systemName = getDrmSystemName(match[1]);
        if (systemName && systemName !== 'Unknown Scheme') {
            detectedSystems.add(systemName);
        }
    }

    // HLS: Look for #EXT-X-KEY and #EXT-X-SESSION-KEY tags
    const hlsLines = manifestString.split('\n');
    for (const line of hlsLines) {
        const trimmedLine = line.trim();
        if (
            trimmedLine.startsWith('#EXT-X-KEY') ||
            trimmedLine.startsWith('#EXT-X-SESSION-KEY')
        ) {
            const attributes = parseHlsAttributes(trimmedLine);
            const method = attributes.METHOD;
            const keyFormat = attributes.KEYFORMAT;

            if (method && method !== 'NONE') {
                if (keyFormat) {
                    const systemName = getDrmSystemName(keyFormat);
                    if (systemName && systemName !== 'Unknown Scheme') {
                        detectedSystems.add(systemName);
                    }
                } else if (method === 'SAMPLE-AES') {
                    detectedSystems.add('FairPlay');
                } else if (method === 'AES-128') {
                    detectedSystems.add('AES-128');
                }
            }
        }
    }

    return detectedSystems;
}

/**
 * Fetches a manifest and performs a lightweight scan to detect DRM systems.
 * If the initial manifest is an HLS master, it will fetch the first media playlist for a deeper scan.
 * @param {object} payload
 * @param {string} payload.url - The manifest URL.
 * @param {import('@/types').AuthInfo} [payload.auth] - Optional authentication info.
 * @param {AbortSignal} signal - An AbortSignal to cancel the fetch.
 * @returns {Promise<string[]>} A promise that resolves to an array of detected DRM system names.
 */
export async function handleGetStreamDrmInfo({ url, auth }, signal) {
    debugLog(
        'drmDetectionHandler',
        `Stage 1: Fetching initial manifest for DRM detection: ${url}`
    );
    try {
        const response = await fetchWithAuth(url, auth, null, {}, null, signal);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);

        const manifestString = await response.text();
        const detectedSystems = scanForDrm(manifestString);

        // If no DRM is found and it's an HLS master playlist, we need to dig deeper.
        if (
            detectedSystems.size === 0 &&
            manifestString.includes('#EXT-X-STREAM-INF')
        ) {
            debugLog(
                'drmDetectionHandler',
                'Stage 2: HLS master detected, scanning first media playlist.'
            );
            const hlsLines = manifestString.split('\n');
            let firstVariantUri = null;

            for (let i = 0; i < hlsLines.length; i++) {
                if (hlsLines[i].startsWith('#EXT-X-STREAM-INF')) {
                    // The URI is on the next non-empty line.
                    for (let j = i + 1; j < hlsLines.length; j++) {
                        const nextLine = hlsLines[j].trim();
                        if (nextLine && !nextLine.startsWith('#')) {
                            firstVariantUri = nextLine;
                            break;
                        }
                    }
                }
                if (firstVariantUri) break;
            }

            if (firstVariantUri) {
                const mediaPlaylistUrl = new URL(firstVariantUri, response.url)
                    .href;
                debugLog(
                    'drmDetectionHandler',
                    `Stage 3: Fetching media playlist: ${mediaPlaylistUrl}`
                );
                const mediaResponse = await fetchWithAuth(
                    mediaPlaylistUrl,
                    auth,
                    null,
                    {},
                    null,
                    signal
                );
                if (mediaResponse.ok) {
                    const mediaPlaylistString = await mediaResponse.text();
                    const mediaDrmSystems = scanForDrm(mediaPlaylistString);
                    mediaDrmSystems.forEach((system) =>
                        detectedSystems.add(system)
                    );
                }
            }
        }

        const result = Array.from(detectedSystems);
        debugLog(
            'drmDetectionHandler',
            `Detection complete for ${url}. Systems found:`,
            result
        );
        return result;
    } catch (error) {
        if (error.name === 'AbortError') {
            debugLog('drmDetectionHandler', 'DRM detection aborted.');
            return [];
        }
        console.error(`Error during DRM detection for ${url}:`, error);
        return [];
    }
}
