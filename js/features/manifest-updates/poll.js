import { parseManifest as parseDashManifest } from '../../protocols/dash/parser.js';
import { analysisState } from '../../core/state.js';
import { diffManifest } from './diff.js';
import xmlFormatter from 'xml-formatter';

let manifestUpdateInterval = null;

/**
 * @param {import('../../core/state.js').Stream} stream
 * @param {() => void} onUpdate - A callback function to execute when a new manifest is processed.
 * */
export function startManifestUpdatePolling(stream, onUpdate) {
    if (manifestUpdateInterval) {
        clearInterval(manifestUpdateInterval);
    }

    const updatePeriodSeconds = stream.manifest.minimumUpdatePeriod;
    if (!updatePeriodSeconds) return;

    const updatePeriodMs = updatePeriodSeconds * 1000;
    const pollInterval = Math.max(updatePeriodMs, 2000); // Poll no more than every 2 seconds

    let originalManifestString = stream.rawManifest;

    manifestUpdateInterval = setInterval(async () => {
        try {
            const response = await fetch(stream.originalUrl);
            if (!response.ok) return;
            const newManifestString = await response.text();

            if (newManifestString !== originalManifestString) {
                const { manifest: newManifest } = await parseDashManifest(
                    newManifestString,
                    stream.baseUrl
                );
                const oldManifestForDiff = originalManifestString;

                stream.manifest = newManifest;
                stream.rawManifest = newManifestString;
                originalManifestString = newManifestString;

                const formattingOptions = {
                    indentation: '  ',
                    lineSeparator: '\n',
                };
                const formattedOldManifest = xmlFormatter(
                    oldManifestForDiff,
                    formattingOptions
                );
                const formattedNewManifest = xmlFormatter(
                    newManifestString,
                    formattingOptions
                );

                const diffHtml = diffManifest(
                    formattedOldManifest,
                    formattedNewManifest
                );

                analysisState.manifestUpdates.unshift({
                    timestamp: new Date().toLocaleTimeString(),
                    diffHtml,
                });

                if (analysisState.manifestUpdates.length > 20) {
                    analysisState.manifestUpdates.pop();
                }

                // Notify the caller that an update has occurred.
                if (onUpdate) {
                    onUpdate();
                }
            }
        } catch (e) {
            console.error('[MANIFEST-POLL] Error fetching update:', e);
        }
    }, pollInterval);
}

export function stopManifestUpdatePolling() {
    if (manifestUpdateInterval) {
        clearInterval(manifestUpdateInterval);
        manifestUpdateInterval = null;
    }
}