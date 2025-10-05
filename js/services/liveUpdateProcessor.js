import { useStore } from '../core/store.js';
import { eventBus } from '../core/event-bus.js';
import { generateFeatureAnalysis } from '../engines/feature-analysis/analyzer.js';
import { parseAllSegmentUrls as parseDashSegments } from '../protocols/manifest/dash/segment-parser.js';
import { diffManifest } from '../shared/utils/diff.js';
import xmlFormatter from 'xml-formatter';

/**
 * A more specific stream type where the protocol is guaranteed to be 'dash' or 'hls'.
 * @typedef {import('../core/types.js').Stream & { protocol: 'dash' | 'hls' }} KnownProtocolStream
 */

/**
 * Compares two sets of compliance results to see if any new issues have appeared.
 * @param {import('../core/types.js').ComplianceResult[]} oldResults
 * @param {import('../core/types.js').ComplianceResult[]} newResults
 * @returns {boolean}
 */
function checkForNewIssues(oldResults, newResults) {
    if (!Array.isArray(newResults)) return false; // Defensive guard
    if (!oldResults) {
        // If there were no old results, any new issue is considered "new".
        return newResults.some(
            (res) => res.status === 'fail' || res.status === 'warn'
        );
    }

    const oldIssueIds = new Set(
        oldResults
            .filter((r) => r.status === 'fail' || r.status === 'warn')
            .map((r) => r.id)
    );

    return newResults.some(
        (r) =>
            (r.status === 'fail' || r.status === 'warn') &&
            !oldIssueIds.has(r.id)
    );
}

/**
 * Updates the core properties of a stream object with new manifest data.
 * @param {import('../core/types.js').Stream} stream The stream to update.
 * @param {string} newManifestString The raw string of the new manifest.
 * @param {import('../core/types.js').Manifest} newManifestObject The new manifest IR.
 */
function _updateStreamProperties(stream, newManifestString, newManifestObject) {
    stream.rawManifest = newManifestString;
    stream.manifest = newManifestObject;
    stream.featureAnalysis.manifestCount++;
}

/**
 * Re-runs feature analysis and updates the stream's feature analysis results.
 * @param {KnownProtocolStream} stream The stream to update.
 */
function _updateFeatureAnalysis(stream) {
    // Note: The manifest object on the stream has already been updated.
    const newAnalysisResults = generateFeatureAnalysis(
        stream.manifest,
        stream.protocol,
        stream.manifest.serializedManifest // DASH needs the serialized object
    );

    Object.entries(newAnalysisResults).forEach(([name, result]) => {
        const existing = stream.featureAnalysis.results.get(name);
        if (result.used && (!existing || !existing.used)) {
            stream.featureAnalysis.results.set(name, {
                used: true,
                details: result.details,
            });
        } else if (!existing) {
            stream.featureAnalysis.results.set(name, {
                used: result.used,
                details: result.details,
            });
        }
    });
}

/**
 * Generates a diff of the manifest update and prepends it to the update list.
 * @param {KnownProtocolStream} stream The stream to update.
 * @param {string} oldManifestString The raw string of the previous manifest.
 * @param {string} newManifestString The raw string of the new manifest.
 * @param {import('../core/types.js').ComplianceResult[]} complianceResults The new compliance results.
 * @param {object} serializedManifest The pristine serialized manifest object for this update.
 */
function _updateManifestDiff(
    stream,
    oldManifestString,
    newManifestString,
    complianceResults,
    serializedManifest
) {
    let formattedOld = oldManifestString;
    let formattedNew = newManifestString;

    if (stream.protocol === 'dash') {
        formattedOld = xmlFormatter(oldManifestString, {
            indentation: '  ',
            lineSeparator: '\n',
        });
        formattedNew = xmlFormatter(newManifestString, {
            indentation: '  ',
            lineSeparator: '\n',
        });
    }

    const diffHtml = diffManifest(formattedOld, formattedNew, stream.protocol);

    const previousResults = stream.manifestUpdates[0]?.complianceResults;
    const hasNewIssues = checkForNewIssues(previousResults, complianceResults);

    const newUpdate = {
        timestamp: new Date().toLocaleTimeString(),
        diffHtml,
        rawManifest: newManifestString,
        complianceResults,
        hasNewIssues,
        serializedManifest,
    };
    stream.manifestUpdates.unshift(newUpdate);

    if (stream.manifestUpdates.length > 20) {
        stream.manifestUpdates.pop();
    }
}

/**
 * Updates the segment list for a DASH stream's representations across all periods.
 * @param {KnownProtocolStream} stream The stream to update.
 */
function _updateDashSegmentState(stream) {
    const newSegmentsByCompositeKey = parseDashSegments(
        stream.manifest.serializedManifest,
        stream.baseUrl
    );

    Object.entries(newSegmentsByCompositeKey).forEach(
        ([compositeKey, newSegments]) => {
            const repState = stream.dashRepresentationState.get(compositeKey);
            if (repState) {
                const existingSegmentUrls = new Set(
                    repState.segments.map((s) => s.resolvedUrl)
                );
                newSegments.forEach((newSeg) => {
                    if (!existingSegmentUrls.has(newSeg.resolvedUrl)) {
                        repState.segments.push(newSeg);
                    }
                });
                repState.freshSegmentUrls = new Set(
                    newSegments.map((s) => s.resolvedUrl)
                );
            }
        }
    );
}

/**
 * Updates the segment list for an HLS media playlist.
 * @param {KnownProtocolStream} stream The stream to update.
 */
function _updateHlsSegmentState(stream) {
    if (stream.manifest.serializedManifest.isMaster) {
        return;
    }

    const variant = stream.hlsVariantState.get(stream.originalUrl);
    if (variant) {
        const latestParsed = stream.manifest.serializedManifest;
        variant.segments = latestParsed.segments || [];
        variant.freshSegmentUrls = new Set(
            variant.segments.map((s) => s.resolvedUrl)
        );
    }
}

/**
 * The main handler for processing a live manifest update.
 * @param {object} updateData The event data from `livestream:manifest-updated`.
 */
function processLiveUpdate(updateData) {
    const {
        streamId,
        newManifestString,
        newManifestObject,
        oldManifestString,
        complianceResults,
        serializedManifest, // Extract the new pristine manifest object
    } = updateData;
    const streamIndex = useStore
        .getState()
        .streams.findIndex((s) => s.id === streamId);
    if (streamIndex === -1) return;

    // Use structuredClone for a robust, deep copy of the stream state.
    const stream = structuredClone(useStore.getState().streams[streamIndex]);

    // Add type guard to satisfy TypeScript compiler and prevent runtime errors.
    if (stream.protocol === 'unknown') return;

    // After the guard, TypeScript knows 'stream' now conforms to 'KnownProtocolStream'.
    // We use an explicit cast to ensure the compiler understands this for subsequent function calls.
    const knownProtocolStream = /** @type {KnownProtocolStream} */ (stream);

    _updateStreamProperties(stream, newManifestString, newManifestObject);
    _updateFeatureAnalysis(knownProtocolStream);
    _updateManifestDiff(
        knownProtocolStream,
        oldManifestString,
        newManifestString,
        complianceResults,
        serializedManifest // Pass the pristine object
    );

    if (knownProtocolStream.protocol === 'dash') {
        _updateDashSegmentState(knownProtocolStream);
    } else if (knownProtocolStream.protocol === 'hls') {
        _updateHlsSegmentState(knownProtocolStream);
    }

    // Update the stream in the store
    useStore.setState((state) => ({
        streams: state.streams.map((s, index) =>
            index === streamIndex ? stream : s
        ),
    }));

    // Notify the UI that data for this stream has been refreshed.
    eventBus.dispatch('stream:data-updated', { streamId });
}

/**
 * Initializes the service by subscribing to the live manifest update event.
 */
export function initializeLiveUpdateProcessor() {
    eventBus.subscribe('livestream:manifest-updated', processLiveUpdate);
}
