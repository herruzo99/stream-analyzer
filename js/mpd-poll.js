import { parseMpd } from './api/dash-parser.js';
import { renderSingleStreamTabs } from './ui.js';
import { analysisState } from './state.js';
import { diffMpd } from './api/mpd-diff.js';
import xmlFormatter from 'xml-formatter';

let mpdUpdateInterval = null;

/** @param {import('./state.js').Stream} stream */
export function startMpdUpdatePolling(stream) {
    if (mpdUpdateInterval) {
        clearInterval(mpdUpdateInterval);
    }

    const updatePeriodAttr = stream.mpd.getAttribute('minimumUpdatePeriod');
    if (!updatePeriodAttr) return;

    const updatePeriod = parseDuration(updatePeriodAttr) * 1000;
    const pollInterval = Math.max(updatePeriod, 2000); // Poll no more than every 2 seconds

    // Use the raw XML from the state as the ground truth for the original MPD.
    let originalMpdString = stream.rawXml;

    mpdUpdateInterval = setInterval(async () => {
        try {
            const response = await fetch(stream.originalUrl);
            if (!response.ok) return;
            const newMpdString = await response.text();

            if (newMpdString !== originalMpdString) {
                const { mpd: newMpd } = await parseMpd(
                    newMpdString,
                    stream.baseUrl
                );
                const oldMpdForDiff = originalMpdString;

                // Update the stream state with the new parsed MPD and the new raw XML.
                stream.mpd = newMpd;
                stream.rawXml = newMpdString;
                originalMpdString = newMpdString;

                // Pretty print XML before diffing to ensure a clean, format-independent comparison
                const formattingOptions = {
                    indentation: '  ',
                    lineSeparator: '\n',
                };
                const formattedOldMpd = xmlFormatter(
                    oldMpdForDiff,
                    formattingOptions
                );
                const formattedNewMpd = xmlFormatter(
                    newMpdString,
                    formattingOptions
                );

                const diffHtml = diffMpd(formattedOldMpd, formattedNewMpd);

                analysisState.mpdUpdates.unshift({
                    timestamp: new Date().toLocaleTimeString(),
                    diffHtml,
                });

                // Limit to 20 historical MPD updates
                if (analysisState.mpdUpdates.length > 20) {
                    analysisState.mpdUpdates.pop();
                }

                // If the active tab is one that depends on MPD data, re-render it
                const activeTab = document.querySelector('.tab-active');
                if (
                    activeTab &&
                    [
                        'summary',
                        'timeline-visuals',
                        'features',
                        'compliance',
                        'explorer',
                        'updates',
                    ].includes(
                        /** @type {HTMLElement} */ (activeTab).dataset.tab
                    )
                ) {
                    renderSingleStreamTabs(stream.id);
                }
            }
        } catch (e) {
            console.error('[MPD-POLL] Error fetching update:', e);
        }
    }, pollInterval);
}

export function stopMpdUpdatePolling() {
    if (mpdUpdateInterval) {
        clearInterval(mpdUpdateInterval);
        mpdUpdateInterval = null;
    }
}

/**
 * Parses an ISO 8601 duration string into seconds.
 * @param {string} durationStr
 * @returns {number}
 */
function parseDuration(durationStr) {
    if (!durationStr) return 0;
    const match = durationStr.match(
        /PT(?:(\d+\.?\d*)H)?(?:(\d+\.?\d*)M)?(?:(\d+\.?\d*)S)?/
    );
    if (!match) return 0;
    const hours = parseFloat(match[1] || '0');
    const minutes = parseFloat(match[2] || '0');
    const seconds = parseFloat(match[3] || '0');
    return hours * 3600 + minutes * 60 + seconds;
}