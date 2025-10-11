import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { copyTextToClipboard } from '@/ui/shared/clipboard';

export function navigateManifestUpdates(direction) {
    const { activeStreamId } = useAnalysisStore.getState();
    analysisActions.navigateManifestUpdate(activeStreamId, direction);
}

export const manifestUpdatesTemplate = (stream) => {
    if (!stream) {
        return html`<p class="warn">No active stream to monitor.</p>`;
    }

    // If an HLS media playlist is active, show its initial state and a message.
    if (stream.protocol === 'hls' && stream.activeMediaPlaylistUrl) {
        const mediaPlaylist = stream.mediaPlaylists.get(
            stream.activeMediaPlaylistUrl
        );
        if (!mediaPlaylist) {
            return html`<p class="info">Loading media playlist...</p>`;
        }
        return html`
            <div
                class="bg-yellow-900/30 border border-yellow-700 text-yellow-200 text-sm p-4 rounded-lg mb-4"
            >
                <p class="font-bold">Displaying Initial Media Playlist</p>
                <p>
                    Live manifest updates are currently displayed for the Master
                    Playlist only. Select "Master Playlist" from the HLS View
                    dropdown to see live updates.
                </p>
            </div>
            <div
                class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
            >
                ${mediaPlaylist.rawManifest
                    .split('\n')
                    .map((line) => html`<div>${line}</div>`)}
            </div>
        `;
    }

    if (stream.manifest.type !== 'dynamic') {
        return html`<p class="info">
            This is a VOD/static manifest. No updates are expected.
        </p>`;
    }

    const { manifestUpdates, activeManifestUpdateIndex } = stream;
    const updateCount = manifestUpdates.length;

    if (updateCount === 0) {
        return html`<div id="mpd-updates-content">
            <p class="info">Awaiting first manifest update...</p>
        </div>`;
    }

    const currentIndex = updateCount - activeManifestUpdateIndex;
    const currentUpdate = manifestUpdates[activeManifestUpdateIndex];
    const lines = currentUpdate.diffHtml.split('\n');
    const updateLabel =
        activeManifestUpdateIndex === manifestUpdates.length - 1
            ? 'Initial Manifest loaded:'
            : 'Update received at:';

    const handleCopyClick = () => {
        if (currentUpdate) {
            copyTextToClipboard(
                currentUpdate.rawManifest,
                'Manifest version copied to clipboard!'
            );
        }
    };

    const currentDisplay = html` <div class="text-sm text-gray-400 mb-2">
            ${updateLabel}
            <span class="font-semibold text-gray-200"
                >${currentUpdate.timestamp}</span
            >
        </div>
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            ${lines.map(
                (line, i) => html`
                    <div class="flex">
                        <span
                            class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-10"
                            >${i + 1}</span
                        >
                        <span class="flex-grow whitespace-pre-wrap break-all"
                            >${unsafeHTML(line)}</span
                        >
                    </div>
                `
            )}
        </div>`;

    return html` <div id="mpd-updates-content">
        <div
            class="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-2 sm:space-y-0"
        >
            <button
                @click=${handleCopyClick}
                class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-3 rounded-md transition-colors"
            >
                Copy This Version
            </button>
            <div class="flex items-center space-x-2">
                <button
                    id="prev-manifest-btn"
                    class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                    title="Previous Update (Right Arrow)"
                    ?disabled=${activeManifestUpdateIndex >= updateCount - 1}
                    @click=${() => navigateManifestUpdates(1)}
                >
                    &lt;
                </button>
                <span
                    id="manifest-index-display"
                    class="text-gray-400 font-semibold w-16 text-center"
                    >${currentIndex}/${updateCount}</span
                >
                <button
                    id="next-manifest-btn"
                    class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                    title="Next Update (Left Arrow)"
                    ?disabled=${activeManifestUpdateIndex <= 0}
                    @click=${() => navigateManifestUpdates(-1)}
                >
                    &gt;
                </button>
            </div>
        </div>
        <div id="current-manifest-update" class="manifest-update-entry">
            ${currentDisplay}
        </div>
    </div>`;
};