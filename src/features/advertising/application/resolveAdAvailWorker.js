import { AdCreative } from '@/features/advertising/domain/AdCreative';
import { fetchWithRetry } from '@/infrastructure/http/fetch';
import { parseVast } from '@/infrastructure/parsing/ads/vast-parser';

/**
 * A list of common filenames for VAST or VMAP manifests.
 * This is used as a heuristic to discover the ad manifest when a directory URL is provided.
 * @type {string[]}
 */
const COMMON_VAST_FILENAMES = [
    'vast.xml',
    'manifest.xml',
    'master.vmap',
    'index.vmap',
    'vast.vmap',
    'ad.xml',
    'ads.xml',
];

/**
 * Takes an AdAvail, fetches its VAST manifest if a URL is present,
 * parses it, and returns an enriched AdAvail with creative information.
 * This function runs inside the web worker.
 * @param {import('@/types').AdAvail} adAvail The ad avail to process.
 * @returns {Promise<import('@/types').AdAvail>}
 */
async function resolveSingleAvail(adAvail) {
    if (!adAvail.adManifestUrl) {
        return adAvail; // Cannot resolve without a URL.
    }

    let urlsToTry = [adAvail.adManifestUrl];

    // --- NEW DISCOVERY HEURISTIC ---
    // If the provided URL is a directory, attempt to find common manifest filenames within it.
    if (adAvail.adManifestUrl.endsWith('/')) {
        urlsToTry = COMMON_VAST_FILENAMES.map(
            (filename) => new URL(filename, adAvail.adManifestUrl).href
        );
    }
    // --- END HEURISTIC ---

    for (const url of urlsToTry) {
        try {
            const response = await fetchWithRetry(url);
            if (!response.ok) {
                // This is not a fatal error for the entire process, just for this specific URL attempt.
                // We let the loop continue to try the next potential filename.
                continue;
            }

            // --- SUCCESS ---
            // If we receive a successful response, we assume this is the correct ad manifest.
            const vastXml = await response.text();
            const parsedVast = parseVast(vastXml);

            const allCreatives =
                parsedVast.ads.length > 0
                    ? parsedVast.ads.flatMap((ad) =>
                          ad.creatives.map(
                              (c) =>
                                  new AdCreative({
                                      id: c.id,
                                      sequence: c.sequence,
                                      duration: c.duration,
                                      mediaFileUrl: c.mediaFileUrl,
                                      trackingUrls: c.trackingUrls,
                                  })
                          )
                      )
                    : [];

            // Update the adAvail object with the successfully discovered URL and creatives.
            adAvail.adManifestUrl = url;
            adAvail.creatives = allCreatives;
            return adAvail; // Exit successfully after the first successful fetch and parse.
        } catch (e) {
            // Log network errors but continue trying other potential URLs.
            console.warn(
                `[AdResolver] Attempt to fetch VAST from ${url} failed: ${e.message}`
            );
        }
    }

    // If the loop completes without a successful return, all attempts have failed.
    console.warn(
        `[AdResolver] All attempts to discover and parse VAST from base URL ${adAvail.adManifestUrl} failed. The ad avail will be shown without creative details.`
    );
    return adAvail; // Return the original avail on total failure.
}

/**
 * Processes a list of AdAvail objects, resolving their VAST creatives.
 * @param {import('@/types').AdAvail[]} adAvails An array of ad avails.
 * @returns {Promise<import('@/types').AdAvail[]>} A promise that resolves to an array of enriched ad avails.
 */
export async function resolveAdAvailsInWorker(adAvails) {
    if (!adAvails || adAvails.length === 0) {
        return [];
    }
    const resolutionPromises = adAvails.map(resolveSingleAvail);
    return Promise.all(resolutionPromises);
}
