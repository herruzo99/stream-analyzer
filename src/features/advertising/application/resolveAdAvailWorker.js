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

async function resolveUrl(url) {
    try {
        const response = await fetchWithRetry(url);
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

async function resolveSingleAvail(adAvail) {
    if (!adAvail.adManifestUrl) {
        return adAvail;
    }

    let urlsToTry = [adAvail.adManifestUrl];

    // Heuristic for directories
    if (adAvail.adManifestUrl.endsWith('/')) {
        urlsToTry = COMMON_AD_FILENAMES.map(
            (filename) => new URL(filename, adAvail.adManifestUrl).href
        );
    }

    for (const url of urlsToTry) {
        const xmlContent = await resolveUrl(url);
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
            for (const br of vmapData.breaks) {
                // Only fetch if it's a VAST URI
                if (br.adTagUri) {
                    const vastXml = await resolveUrl(br.adTagUri);
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

export async function resolveAdAvailsInWorker(adAvails) {
    if (!adAvails || adAvails.length === 0) return [];
    const promises = adAvails.map(resolveSingleAvail);
    return Promise.all(promises);
}
