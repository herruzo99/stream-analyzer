import { analysisState } from '../core/state.js';
import { eventBus } from '../core/event-bus.js';
import { generateFeatureAnalysis } from '../engines/feature-analysis/analyzer.js';
import { parseAllSegmentUrls as parseDashSegments } from '../protocols/manifest/dash/segment-parser.js';
import { diffManifest } from '../shared/utils/diff.js';
import xmlFormatter from 'xml-formatter';

/**
 * A more specific stream type where the protocol is guaranteed to be 'dash' or 'hls'.
 * @typedef {import('../core/state.js').Stream & { protocol: 'dash' | 'hls' }} KnownProtocolStream
 */

/**
 * Updates the core properties of a stream object with new manifest data.
 * @param {import('../core/state.js').Stream} stream The stream to update.
 * @param {string} newManifestString The raw string of the new manifest.
 * @param {import('../core/state.js').Manifest} newManifestObject The new manifest IR.
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
        stream.manifest.rawElement // DASH needs the serialized object
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
 */
function _updateManifestDiff(stream, oldManifestString, newManifestString) {
    let formattedOld = oldManifestString;
    let formattedNew = newManifestString;

    if (stream.protocol === 'dash') {
        const formattingOptions = {
            indentation: '  ',
            lineSeparator: '\n',
        };
        formattedOld = xmlFormatter(oldManifestString, formattingOptions);
        formattedNew = xmlFormatter(newManifestString, formattingOptions);
    }

    const diffHtml = diffManifest(formattedOld, formattedNew, stream.protocol);
    const newUpdate = {
        timestamp: new Date().toLocaleTimeString(),
        diffHtml,
        rawManifest: newManifestString,
    };
    stream.manifestUpdates.unshift(newUpdate);

    if (stream.manifestUpdates.length > 20) {
        stream.manifestUpdates.pop();
    }
}

/**
 * Updates the segment list for a DASH stream's representations.
 * @param {KnownProtocolStream} stream The stream to update.
 */
function _updateDashSegmentState(stream) {
    const newSegmentsByRep = parseDashSegments(
        stream.manifest.rawElement,
        stream.baseUrl
    );
    Object.entries(newSegmentsByRep).forEach(([repId, newSegments]) => {
        const repState = stream.dashRepresentationState.get(repId);
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
    });
}

/**
 * Updates the segment list for an HLS media playlist.
 * @param {KnownProtocolStream} stream The stream to update.
 */
function _updateHlsSegmentState(stream) {
    // This logic only applies to media playlists, not master playlists.
    if (stream.manifest.rawElement.isMaster) {
        return;
    }

    const variant = stream.hlsVariantState.get(stream.originalUrl);
    if (variant) {
        const latestParsed = stream.manifest.rawElement;
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
    const { streamId, newManifestString, newManifestObject, oldManifestString } =
        updateData;
    const streamIndex = analysisState.streams.findIndex((s) => s.id === streamId);
    if (streamIndex === -1) return;

    const stream = analysisState.streams[streamIndex];

    // Add type guard to satisfy TypeScript compiler and prevent runtime errors.
    if (stream.protocol === 'unknown') return;

    // After the guard, TypeScript knows 'stream' now conforms to 'KnownProtocolStream'.
    // We use an explicit cast to ensure the compiler understands this for subsequent function calls.
    const knownProtocolStream = /** @type {KnownProtocolStream} */ (stream);

    _updateStreamProperties(stream, newManifestString, newManifestObject);
    _updateFeatureAnalysis(knownProtocolStream);
    _updateManifestDiff(knownProtocolStream, oldManifestString, newManifestString);

    if (knownProtocolStream.protocol === 'dash') {
        _updateDashSegmentState(knownProtocolStream);
    } else if (knownProtocolStream.protocol === 'hls') {
        _updateHlsSegmentState(knownProtocolStream);
    }

    // Notify the UI that data for this stream has been refreshed.
    eventBus.dispatch('stream:data-updated', { streamId });
}

/**
 * Initializes the service by subscribing to the live manifest update event.
 */
export function initializeLiveUpdateProcessor() {
    eventBus.subscribe('livestream:manifest-updated', processLiveUpdate);
}