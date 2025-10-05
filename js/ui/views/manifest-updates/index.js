import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { useStore, storeActions } from '../../../core/store.js';

export function navigateManifestUpdates(direction) {
    const { activeStreamId } = useStore.getState();
    storeActions.navigateManifestUpdate(activeStreamId, direction);
}

export const manifestUpdatesTemplate = (stream) => {
    if (!stream) {
        return html`<p class="warn">No active stream to monitor.</p>`;
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
            class="flex flex-col sm:flex-row justify-end items-center mb-4 space-y-2 sm:space-y-0"
        >
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
