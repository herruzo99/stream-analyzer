import { parseManifest as parseDashManifest } from '@/infrastructure/parsing/dash/parser.js';
import { parseManifest as parseHlsManifest } from '@/infrastructure/parsing/hls/index.js';
import { runChecks } from '@/features/compliance/domain/engine.js';
import { applyXmlPatch } from '@/infrastructure/parsing/dash/patch.js';
import { applyDeltaUpdate } from '@/infrastructure/parsing/hls/delta-updater.js';
import { adaptHlsToIr } from '@/infrastructure/parsing/hls/adapter.js';

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
        newManifestString,
        oldRawManifest,
        patchString,
        baseUrl,
        hlsDefinedVariables,
        oldManifestObjectForDelta,
    } = payload;

    let finalManifestString = newManifestString;
    if (typeof patchString === 'string' && patchString) {
        finalManifestString = applyXmlPatch(oldRawManifest, patchString);
    }

    if (typeof finalManifestString !== 'string') {
        throw new TypeError(
            `[LiveUpdateHandler] Invalid manifest content received for stream ${streamId}. Expected a string, but got ${typeof finalManifestString}.`
        );
    }

    const protocol = detectProtocol(finalManifestString);
    let newManifestObject;
    let newSerializedObject;

    if (protocol === 'dash') {
        const { manifest, serializedManifest } = await parseDashManifest(
            finalManifestString,
            baseUrl
        );
        newManifestObject = manifest;
        newSerializedObject = serializedManifest;
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
            newManifestObject = adaptHlsToIr(resolvedParsedHls);
            newSerializedObject = newManifestObject.serializedManifest;
            // The raw string for diffing must be updated to the full, resolved manifest string
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
        protocol === 'hls' ? newManifestObject : newSerializedObject;
    const complianceResults = runChecks(manifestObjectForChecks, protocol);

    newManifestObject.serializedManifest = newSerializedObject;

    return {
        streamId,
        newManifestObject,
        newManifestString: finalManifestString,
        oldRawManifest,
        complianceResults,
        serializedManifest: newSerializedObject,
    };
}