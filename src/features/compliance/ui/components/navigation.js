import { analysisActions } from '@/state/analysisStore';
import { html } from 'lit-html';

export const navigationTemplate = (stream) => {
    if (stream.manifest.type !== 'dynamic') return html``;

    const { manifestUpdates, activeManifestUpdateId } = stream;
    const activeManifestUpdateIndex = manifestUpdates.findIndex(
        (u) => u.id === activeManifestUpdateId
    );

    // If for some reason the ID isn't found, render nothing to prevent errors.
    if (activeManifestUpdateIndex === -1) return html``;

    const updateCount = manifestUpdates.length;
    const hasNewIssues =
        manifestUpdates[0]?.hasNewIssues && activeManifestUpdateIndex > 0;

    return html`
        <div
            class="flex items-center space-x-3 bg-slate-800 backdrop-blur-md p-1.5 rounded-xl border border-slate-800"
        >
            <button
                @click=${() =>
                    analysisActions.navigateManifestUpdate(stream.id, 1)}
                ?disabled=${activeManifestUpdateIndex >= updateCount - 1}
                class="px-4 py-2 rounded-lg font-bold transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 hover:shadow-[0_0_10px_#3b82f6] active:scale-95 text-slate-200"
                title="Previous Update (Right Arrow)"
            >
                &lt;
            </button>
            <span
                class="font-bold w-28 text-center text-xs uppercase tracking-wider opacity-70"
                style="color: #94a3b8"
                >Update
                ${updateCount - activeManifestUpdateIndex}/${updateCount}</span
            >
            <button
                @click=${() =>
                    analysisActions.navigateManifestUpdate(stream.id, -1)}
                ?disabled=${activeManifestUpdateIndex <= 0}
                class="relative px-4 py-2 rounded-lg font-bold transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 hover:shadow-[0_0_10px_#3b82f6] active:scale-95 text-slate-200"
                title="Next Update (Left Arrow)"
            >
                &gt;
                ${hasNewIssues
                    ? html`<span class="absolute -top-1 -right-1 flex h-3 w-3">
                          <span
                              class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                              style="background-color: #ef4444"
                          ></span>
                          <span
                              class="relative inline-flex rounded-full h-3 w-3 shadow-[0_0_10px_#ef4444]"
                              style="background-color: #ef4444"
                          ></span>
                      </span>`
                    : ''}
            </button>
        </div>
    `;
};
