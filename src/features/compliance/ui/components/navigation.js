import { html } from 'lit-html';
import { analysisActions } from '@/state/analysisStore.js';

export const navigationTemplate = (stream) => {
    if (stream.manifest.type !== 'dynamic') return html``;

    const { manifestUpdates, activeManifestUpdateIndex } = stream;
    const updateCount = manifestUpdates.length;
    const hasNewIssues =
        manifestUpdates[0]?.hasNewIssues && activeManifestUpdateIndex > 0;

    return html`
        <div class="flex items-center space-x-2">
            <button
                @click=${() =>
                    analysisActions.navigateManifestUpdate(stream.id, 1)}
                ?disabled=${activeManifestUpdateIndex >= updateCount - 1}
                class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                title="Previous Update (Right Arrow)"
            >
                &lt;
            </button>
            <span class="text-gray-400 font-semibold w-24 text-center"
                >Update
                ${updateCount - activeManifestUpdateIndex}/${updateCount}</span
            >
            <button
                @click=${() =>
                    analysisActions.navigateManifestUpdate(stream.id, -1)}
                ?disabled=${activeManifestUpdateIndex <= 0}
                class="relative px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                title="Next Update (Left Arrow)"
            >
                &gt;
                ${hasNewIssues
                    ? html`<span class="absolute -top-1 -right-1 flex h-3 w-3">
                          <span
                              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
                          ></span>
                          <span
                              class="relative inline-flex rounded-full h-3 w-3 bg-red-500"
                          ></span>
                      </span>`
                    : ''}
            </button>
        </div>
    `;
};
