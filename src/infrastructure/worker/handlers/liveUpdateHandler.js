import { parseManifest as parseDashManifest } from '@/infrastructure/parsing/dash/parser';
import { parseManifest as parseHlsManifest } from '@/infrastructure/parsing/hls/index';
import { runChecks } from '@/features/compliance/domain/engine';
import { applyDeltaUpdate } from '@/infrastructure/parsing/hls/delta-updater';
import { adaptHlsToIr } from '@/infrastructure/parsing/hls/adapter';
import { diffManifest } from '@/ui/shared/diff';
import xmlFormatter from 'xml-formatter';
import { fetchWithAuth } from '../http.js';
import { parseAllSegmentUrls as parseDashSegments } from '@/infrastructure/parsing/dash/segment-parser';
import { debugLog } from '@/shared/utils/debug';

function detectProtocol(manifestString) {
    if (typeof manifestString !== 'string') return 'dash'; // Failsafe
    const trimmed = manifestString.trim();
    if (trimmed.startsWith('#EXTM3U')) return 'hls';
    if (/<MPD/i.test(trimmed)) return 'dash';
    return 'dash';
}

export async function handleParseLiveUpdate(payload, signal) {
    const {
        streamId,
        url,
        oldRawManifest,
        protocol,
        baseUrl,
        auth,
        hlsDefinedVariables,
        oldManifestObjectForDelta,
    } = payload;

    debugLog('LiveUpdateHandler', `Fetching live update for ${url}`);
    const response = await fetchWithAuth(url, auth, null, {}, null, signal);
    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status} fetching live update for ${url}`
        );
    }
    const newManifestString = await response.text();
    debugLog('LiveUpdateHandler', `Fetched new manifest content (length: ${newManifestString.length}).`);
    const detectedProtocol = protocol || detectProtocol(newManifestString);

    let formattedOld = oldRawManifest;
    let formattedNew = newManifestString;

    if (detectedProtocol === 'dash') {
        const formatOptions = { indentation: '  ', lineSeparator: '\n' };
        formattedOld = xmlFormatter(oldRawManifest || '', formatOptions);
        formattedNew = xmlFormatter(newManifestString || '', formatOptions);
        debugLog('LiveUpdateHandler', `Normalized old and new DASH manifests.`);
    }

    if (formattedOld === formattedNew) {
        debugLog('LiveUpdateHandler', 'Normalized manifests are identical. No changes detected. Returning null.');
        // For debugging, log the strings if they seem short
        if (formattedNew.length < 200) {
            console.log("Old manifest:\n", formattedOld);
            console.log("New manifest:\n", formattedNew);
        }
        return null;
    }

    debugLog('LiveUpdateHandler', 'Manifests differ. Proceeding with analysis.');
    const diffHtml = diffManifest(formattedOld, formattedNew, detectedProtocol);

    let finalManifestString = newManifestString;
    let newManifestObject;
    let newSerializedObject;
    let dashRepStateForUpdate = null;

    if (detectedProtocol === 'dash') {
        const { manifest, serializedManifest } = await parseDashManifest(
            finalManifestString,
            baseUrl
        );
        newManifestObject = manifest;
        newSerializedObject = serializedManifest;

        const segmentsByCompositeKey = await parseDashSegments(
            newSerializedObject,
            baseUrl
        );
        dashRepStateForUpdate = [];
        for (const [key, data] of Object.entries(segmentsByCompositeKey)) {
            const allSegments = [
                data.initSegment,
                ...(data.segments || []),
            ].filter(Boolean);
            dashRepStateForUpdate.push([
                key,
                {
                    segments: allSegments,
                    freshSegmentUrls: allSegments.map((s) => s.uniqueId),
                    diagnostics: data.diagnostics,
                },
            ]);
        }
        debugLog('LiveUpdateHandler', `Reparsed DASH segments for ${dashRepStateForUpdate.length} representations.`);
    } else {
        if (finalManifestString.includes('#EXT-X-SKIP')) {
            debugLog('LiveUpdateHandler', `Detected HLS Delta Update.`);
            const { manifest: deltaIr } = await parseHlsManifest(
                finalManifestString,
                baseUrl,
                hlsDefinedVariables
            );
            const resolvedParsedHls = applyDeltaUpdate(
                oldManifestObjectForDelta,
                deltaIr.serializedManifest
            );
            newManifestObject = await adaptHlsToIr(resolvedParsedHls);
            newSerializedObject = newManifestObject.serializedManifest;
            finalManifestString = /** @type {{raw: string}} */ (
                newSerializedObject
            ).raw;
        } else {
            const { manifest } = await parseHlsManifest(
                finalManifestString,
                baseUrl,
                hlsDefinedVariables
            );
            newManifestObject = manifest;
            newSerializedObject = manifest.serializedManifest;
        }
    }

    const manifestObjectForChecks =
        detectedProtocol === 'hls' ? newManifestObject : newSerializedObject;
    const complianceResults = runChecks(
        manifestObjectForChecks,
        detectedProtocol
    );
    debugLog('LiveUpdateHandler', `Ran ${complianceResults.length} compliance checks.`);

    newManifestObject.serializedManifest = newSerializedObject;
    
    const result = {
        streamId,
        newManifestObject,
        newManifestString: finalManifestString,
        oldRawManifest,
        complianceResults,
        serializedManifest: newSerializedObject,
        diffHtml,
        dashRepresentationState: dashRepStateForUpdate,
    };
    debugLog('LiveUpdateHandler', 'Successfully generated update package.', result);
    return result;
}