import { AdCreative } from '@/features/advertising/domain/AdCreative';
import { fetchWithRetry } from '@/infrastructure/http/fetch';
import { parseVast } from '@/infrastructure/parsing/ads/vast-parser';
import { parseVmap } from '@/infrastructure/parsing/ads/vmap-parser';

const COMMON_AD_FILENAMES = [
    'vast.xml',
    'manifest.xml',
    'master.vmap',
    'index.vmap',
    'ads.xml',
    'ad.xml',
];
const AD_WORKER_LIMITS = Object.freeze({ avails: 100, nestedDocuments: 20 });

function safeExternalUrl(value) {
    const url = new URL(value);
    if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password
    )
        throw new TypeError('Unsupported external advertising URL.');
    return url.href;
}

async function resolveUrl(url, signal) {
    try {
        const response = await fetchWithRetry(safeExternalUrl(url), {
            signal,
            credentials: 'omit',
        });
        if (!response.ok) return null;
        return await response.text();
    } catch (e) {
        console.warn(`[AdWorker] Fetch failed: ${url}`, e);
        return null;
    }
}

/**
 * Parses VAST XML and returns creatives.
 */
function processVastXml(xml) {
    const parsed = parseVast(xml);
    const creatives = [];

    if (parsed.ads) {
        parsed.ads.forEach((ad) => {
            ad.creatives.forEach((c) => {
                creatives.push(
                    new AdCreative({
                        id: c.id,
                        sequence: c.sequence,
                        duration: c.duration,
                        mediaFileUrl: c.mediaFileUrl,
                        trackingUrls: c.trackingUrls,
                    })
                );
            });
        });
    }
    return creatives;
}

async function resolveSingleAvail(adAvail, signal) {
    if (!adAvail.adManifestUrl) {
        return adAvail;
    }

    let urlsToTry = [safeExternalUrl(adAvail.adManifestUrl)];

    // Heuristic for directories
    if (adAvail.adManifestUrl.endsWith('/')) {
        urlsToTry = COMMON_AD_FILENAMES.map(
            (filename) => new URL(filename, adAvail.adManifestUrl).href
        );
    }

    for (const url of urlsToTry) {
        const xmlContent = await resolveUrl(url, signal);
        if (!xmlContent) continue;

        const isVmap =
            xmlContent.includes('<vmap:VMAP') || xmlContent.includes('<VMAP');

        if (isVmap) {
            const vmapData = parseVmap(xmlContent);
            adAvail.vmapInfo = {
                version: vmapData.version,
                breakCount: vmapData.breaks.length,
            };
            adAvail.adManifestUrl = url; // Valid VMAP found

            // Resolve internals
            const allCreatives = [];
            for (const br of vmapData.breaks.slice(
                0,
                AD_WORKER_LIMITS.nestedDocuments
            )) {
                // Only fetch if it's a VAST URI
                if (br.adTagUri) {
                    const vastXml = await resolveUrl(br.adTagUri, signal);
                    if (vastXml) {
                        const vastCreatives = processVastXml(vastXml);
                        allCreatives.push(...vastCreatives);
                    }
                }
                // TODO: Handle embedded VASTData
            }
            adAvail.creatives = allCreatives;
            return adAvail;
        } else {
            // Assume VAST
            const creatives = processVastXml(xmlContent);
            if (creatives.length > 0 || xmlContent.includes('<VAST')) {
                adAvail.adManifestUrl = url;
                adAvail.creatives = creatives;
                return adAvail;
            }
        }
    }

    // Failed to resolve
    return adAvail;
}

export async function resolveAdAvailsInWorker(adAvails, options = {}) {
    if (!adAvails || adAvails.length === 0) return [];
    const promises = adAvails
        .slice(0, AD_WORKER_LIMITS.avails)
        .map((avail) => resolveSingleAvail(avail, options.signal));
    return Promise.all(promises);
}
