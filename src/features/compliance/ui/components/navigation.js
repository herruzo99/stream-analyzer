import { analysisActions } from '@/state/analysisStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

export const navigationTemplate = (stream) => {
    if (!stream || stream.manifest?.type !== 'dynamic') return html``;

    const manifestUpdates = Array.isArray(stream.manifestUpdates)
        ? stream.manifestUpdates
        : [];
    if (manifestUpdates.length === 0) return html``;

    const { activeManifestUpdateId } = stream;
    let activeManifestUpdateIndex = manifestUpdates.findIndex(
        (u) => u.id === activeManifestUpdateId
    );
    if (activeManifestUpdateIndex === -1) activeManifestUpdateIndex = 0;

    const updateCount = manifestUpdates.length;
    const showing = updateCount - activeManifestUpdateIndex;
    const hasNewIssues = manifestUpdates.some((u) => u?.hasNewIssues);
    const go = (dir) => analysisActions.navigateManifestUpdate(stream.id, dir);

    const stepBtn =
        'px-2.5 py-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed';

    return html`
        <div
            class="flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.02] px-1.5 py-1"
            role="group"
            aria-label="Manifest updates (${showing} of ${updateCount} shown)"
        >
            <button
                @click=${() => go(1)}
                ?disabled=${activeManifestUpdateIndex >= updateCount - 1}
                class="${stepBtn}"
                title="Older update"
                aria-label="Older update"
            >
                ${icons.arrowLeft}
            </button>
            <span class="mono text-[10px] text-slate-500 whitespace-nowrap">
                update ${showing}/${updateCount}
            </span>
            <button
                @click=${() => go(-1)}
                ?disabled=${activeManifestUpdateIndex <= 0}
                class="${stepBtn} relative"
                title="Newer update"
                aria-label="Newer update"
            >
                ${icons.arrowRight}
                ${hasNewIssues && activeManifestUpdateIndex > 0
                    ? html`<span
                          class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500"
                          title="Newer updates contain new issues"
                      ></span>`
                    : ''}
            </button>
        </div>
    `;
};
