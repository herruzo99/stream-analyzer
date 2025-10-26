import { parseManifest as parseDashManifest } from '@/infrastructure/parsing/dash/parser';
import { parseManifest as parseHlsManifest } from '@/infrastructure/parsing/hls/index';
import { runChecks } from '@/features/compliance/domain/engine';
import { applyXmlPatch } from '@/infrastructure/parsing/dash/patch';
import { applyDeltaUpdate } from '@/infrastructure/parsing/hls/delta-updater';
import { adaptHlsToIr } from '@/infrastructure/parsing/hls/adapter';
import { diffManifest } from '@/ui/shared/diff';
import xmlFormatter from 'xml-formatter';
import { fetchWithAuth } from '../http.js';
import { parseAllSegmentUrls as parseDashSegments } from '@/infrastructure/parsing/dash/segment-parser';

function detectProtocol(manifestString) {
    if (typeof manifestString !== 'string') return 'dash'; // Failsafe
    const trimmed = manifestString.trim();
    if (trimmed.startsWith('#EXTM3U')) return 'hls';
    if (/<MPD/i.test(trimmed)) return 'dash';
    return 'dash';
}

export async function handleParseLiveUpdate(payload) {
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

    const response = await fetchWithAuth(url, auth, 'manifest', streamId);
    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status} fetching live update for ${url}`
        );
    }
    const newManifestString = await response.text();

    if (newManifestString === oldRawManifest) {
        return null; // Signal that no update is needed
    }

    let finalManifestString = newManifestString;
    // Patch logic would need to be handled differently now; assuming full manifest updates for now.

    const detectedProtocol = protocol || detectProtocol(finalManifestString);
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

        // Re-parse segments and create the state update object for the main thread
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
                    freshSegmentUrls: allSegments.map((s) => s.uniqueId), // Will be converted to Set in store
                    diagnostics: data.diagnostics,
                },
            ]);
        }
    } else {
        // HLS Path
        if (finalManifestString.includes('#EXT-X-SKIP')) {
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

    newManifestObject.serializedManifest = newSerializedObject;

    let formattedOld = oldRawManifest;
    let formattedNew = finalManifestString;

    if (detectedProtocol === 'dash') {
        formattedOld = xmlFormatter(oldRawManifest || '', {
            indentation: '  ',
        });
        formattedNew = xmlFormatter(finalManifestString || '', {
            indentation: '  ',
        });
    }
    const diffHtml = diffManifest(formattedOld, formattedNew, detectedProtocol);

    return {
        streamId,
        newManifestObject,
        newManifestString: finalManifestString,
        oldRawManifest,
        complianceResults,
        serializedManifest: newSerializedObject,
        diffHtml,
        dashRepresentationState: dashRepStateForUpdate, // Include DASH state in the update
    };
}
