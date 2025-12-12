import { appLog } from '../../../shared/utils/debug.js';
import { getDrmSystemName } from '../../parsing/utils/drm.js';
import { fetchWithAuth } from '../http.js';

/**
 * Parses attributes from an HLS tag line.
 */
function parseHlsAttributes(line) {
    const attributes = {};
    // Security Fix: Hardened Regex for HLS Attributes (DoS protection)
    const regex = /([A-Z0-9-]+)=(?:"([^"]*)"|([^",\s]+))/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
        const key = match[1];
        const value = match[2] !== undefined ? match[2] : match[3];
        attributes[key] = value;
    }
    return attributes;
}

function analyzeContent(manifestString, finalUrl) {
    const trimmed = manifestString.trim();

    let protocol = 'Unknown';
    let type = 'Unknown';
    let isEncrypted = false;
    let detectedDrm = new Set();
    let isLowLatency = false;

    // --- Protocol Detection ---
    if (trimmed.startsWith('#EXTM3U')) {
        protocol = 'HLS';
    } else if (/<MPD/i.test(trimmed)) {
        protocol = 'DASH';
    } else if (finalUrl.includes('.m3u8')) {
        protocol = 'HLS';
    } else if (finalUrl.includes('.mpd')) {
        protocol = 'DASH';
    }

    if (protocol === 'HLS') {
        const lines = trimmed.split('\n');
        let hasEndList = false;
        let isMaster = false;

        for (const line of lines) {
            const t = line.trim();
            if (t.startsWith('#EXT-X-KEY')) {
                const attrs = parseHlsAttributes(t);
                if (attrs.METHOD && attrs.METHOD !== 'NONE') {
                    isEncrypted = true;
                    if (attrs.KEYFORMAT) {
                        detectedDrm.add(getDrmSystemName(attrs.KEYFORMAT));
                    } else if (
                        attrs.METHOD === 'SAMPLE-AES' &&
                        attrs.URI &&
                        attrs.URI.startsWith('skd://')
                    ) {
                        detectedDrm.add('FairPlay');
                    } else {
                        detectedDrm.add(attrs.METHOD); // e.g. AES-128
                    }
                }
            }
            if (t.startsWith('#EXT-X-PLAYLIST-TYPE:VOD')) {
                type = 'VOD';
            }
            if (t.startsWith('#EXT-X-PLAYLIST-TYPE:EVENT')) {
                type = 'LIVE';
            }
            if (t.startsWith('#EXT-X-ENDLIST')) hasEndList = true;
            if (t.startsWith('#EXT-X-STREAM-INF')) isMaster = true;

            // Low Latency Checks
            if (
                t.startsWith('#EXT-X-PART-INF') ||
                t.startsWith('#EXT-X-SERVER-CONTROL')
            ) {
                isLowLatency = true;
            }
        }

        // Determine Type
        if (type === 'Unknown') {
            if (hasEndList) {
                type = 'VOD';
            } else if (!isMaster) {
                // Media playlist without EndList is implicitly LIVE
                type = 'LIVE';
            } else {
                // Master playlist without explicit type: inconclusive without probing variant
                type = 'Unknown';
            }
        }
    } else if (protocol === 'DASH') {
        // --- Improved Regex for DASH Type ---
        // Explicitly looks for type="dynamic" or type="static" to avoid matching
        // other attributes like xlink:type="simple"
        const dynamicMatch = trimmed.match(/type\s*=\s*["']dynamic["']/i);
        const staticMatch = trimmed.match(/type\s*=\s*["']static["']/i);

        if (dynamicMatch) {
            type = 'LIVE';
        } else if (staticMatch) {
            type = 'VOD';
        }

        // Fallback: If no type is present, ISO 23009-1 defaults to 'static' (VOD).
        if (type === 'Unknown') {
            type = 'VOD';
        }

        const durationMatch = trimmed.match(
            /mediaPresentationDuration\s*=\s*["']([^"']+)["']/
        );
        if (durationMatch) {
            // Basic ISO duration presence check
        }

        // DRM
        const cpMatches = trimmed.matchAll(
            /<ContentProtection[^>]*schemeIdUri\s*=\s*["']([^"']+)["']/gi
        );
        for (const m of cpMatches) {
            const sys = getDrmSystemName(m[1]);
            if (sys !== 'Unknown Scheme') {
                isEncrypted = true;
                detectedDrm.add(sys);
            }
        }

        // Low Latency
        if (
            trimmed.includes('ServiceDescription') &&
            trimmed.includes('Latency')
        ) {
            isLowLatency = true;
        }
        if (trimmed.includes('availabilityTimeComplete="false"')) {
            isLowLatency = true;
        }
    }

    return {
        protocol,
        type,
        isEncrypted,
        detectedDrm: Array.from(detectedDrm),
        isLowLatency,
    };
}

/**
 * Extracts the first URI from a Master Playlist to probe for details.
 */
function getFirstVariantUri(manifestString) {
    const lines = manifestString.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('#EXT-X-STREAM-INF')) {
            // The URI is on the next non-empty, non-comment line
            for (let j = i + 1; j < lines.length; j++) {
                const nextLine = lines[j].trim();
                if (nextLine && !nextLine.startsWith('#')) {
                    return nextLine;
                }
            }
        }
    }
    return null;
}

export async function handleTier0Analysis({ url, auth }, signal) {
    try {
        const startTime = performance.now();
        const response = await fetchWithAuth(
            url,
            auth,
            null,
            {},
            null,
            signal,
            {},
            'GET'
        );

        const result = {
            status: response.status,
            protocol: 'Unknown',
            type: 'Unknown',
            isEncrypted: false,
            detectedDrm: [],
            isLowLatency: false,
            server: response.headers['server'] || undefined,
        };

        if (response.ok) {
            const text = await response.text();
            const analysis = analyzeContent(text, response.url);
            Object.assign(result, analysis);

            // --- HLS Master Playlist Probing ---
            // If it's HLS and type is still Unknown (likely Master Playlist), fetch the first variant
            if (result.protocol === 'HLS' && result.type === 'Unknown') {
                const variantUriRaw = getFirstVariantUri(text);
                if (variantUriRaw) {
                    try {
                        // Robust relative URL resolution
                        const variantUrl = new URL(variantUriRaw, response.url)
                            .href;
                        appLog(
                            'Tier0Handler',
                            'info',
                            `Probing HLS Variant for type detection: ${variantUrl}`
                        );

                        const varResponse = await fetchWithAuth(
                            variantUrl,
                            auth,
                            null,
                            {},
                            null,
                            signal,
                            {},
                            'GET'
                        );
                        if (varResponse.ok) {
                            const varText = await varResponse.text();
                            const varAnalysis = analyzeContent(
                                varText,
                                variantUrl
                            );

                            // We only care about the type and maybe encryption if missed
                            if (varAnalysis.type !== 'Unknown') {
                                result.type = varAnalysis.type;
                            }
                            if (varAnalysis.isLowLatency)
                                result.isLowLatency = true;
                            if (varAnalysis.isEncrypted)
                                result.isEncrypted = true;
                            varAnalysis.detectedDrm.forEach((d) => {
                                if (!result.detectedDrm.includes(d))
                                    result.detectedDrm.push(d);
                            });
                        }
                    } catch (probeError) {
                        appLog(
                            'Tier0Handler',
                            'warn',
                            'Failed to probe HLS variant',
                            probeError
                        );
                    }
                }
            }
        }

        appLog(
            'Tier0Handler',
            'info',
            `Tier 0 complete in ${(performance.now() - startTime).toFixed(1)}ms`,
            result
        );
        return result;
    } catch (e) {
        appLog('Tier0Handler', 'error', `Tier 0 failed for ${url}`, e);
        return {
            status: 0, // Network error
            protocol: 'Unknown',
            type: 'Unknown',
            isEncrypted: false,
            detectedDrm: [],
            isLowLatency: false,
            error: e.message,
        };
    }
}
