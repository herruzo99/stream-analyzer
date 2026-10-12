import * as icons from '@/ui/icons';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { html } from 'lit-html';

/** Pinned detail for the selected tile, rendered into #contextual-sidebar. */
export const featureDetailTemplate = (feature) => {
    if (!feature) {
        return html`
            <div class="flex flex-col h-full min-h-0 bg-[#06090f]">
                <div class="shrink-0 px-4 py-3 border-b border-white/5">
                    <p class="mono text-[10px] text-slate-500">
                        feature detail
                    </p>
                </div>
                <div class="p-4">
                    <p class="mono text-[11px] text-slate-600 leading-relaxed">
                        select a tile to inspect its detection evidence.
                    </p>
                </div>
            </div>
        `;
    }

    const isUsed = feature.used === true;
    const complexity = Math.min(
        5,
        Math.max(1, Number(feature.complexityScore) || 1)
    );
    const details =
        typeof feature.details === 'string'
            ? feature.details
            : 'Not detected in manifest.';

    const handleCopy = () => {
        copyTextToClipboard(
            `${feature.name || 'feature'}\n${feature.isoRef || ''}\n\n${details}`,
            'evidence copied'
        );
    };

    return html`
        <div class="flex flex-col h-full min-h-0 bg-[#06090f]">
            <div class="shrink-0 px-4 py-3 border-b border-white/5">
                <p class="mono text-[10px] text-slate-500">feature detail</p>
                <p
                    class="mono text-[10px] mt-0.5 ${isUsed ? 'text-emerald-300/80' : 'text-slate-600'}"
                >
                    ${isUsed ? 'detected' : 'not detected'}
                </p>
            </div>
            <div class="grow min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4">
                <div>
                    <p class="text-[15px] font-medium text-slate-100 leading-snug">
                        ${feature.name || 'unnamed feature'}
                    </p>
                    ${feature.isoRef
                        ? html`<p class="mono text-[11px] text-slate-500 mt-1">
                              ${feature.isoRef}
                          </p>`
                        : ''}
                </div>

                ${feature.desc
                    ? html`<p class="text-[13px] text-slate-400 leading-relaxed">
                          ${feature.desc}
                      </p>`
                    : ''}

                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <p class="mono text-[10px] text-slate-500">
                            detection evidence
                        </p>
                        <button
                            @click=${handleCopy}
                            class="p-1.5 rounded-md text-slate-500 hover:text-slate-100 hover:bg-white/5 transition-colors"
                            title="Copy evidence"
                            aria-label="Copy evidence"
                        >
                            ${icons.clipboardCopy}
                        </button>
                    </div>
                    <div
                        class="rounded-md bg-white/[0.02] border border-white/5 p-2.5 font-mono text-[11px] leading-relaxed text-slate-200 break-words"
                    >
                        ${details}
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <p class="mono text-[10px] text-slate-600">
                        complexity ${complexity}/5
                    </p>
                    <span class="flex gap-0.5" aria-hidden="true">
                        ${Array(5)
                            .fill(0)
                            .map(
                                (_, i) => html`
                                    <span
                                        class="w-1 h-2 rounded-full ${i < complexity
                                            ? 'bg-emerald-400'
                                            : 'bg-white/10'}"
                                    ></span>
                                `
                            )}
                    </span>
                </div>
            </div>
        </div>
    `;
};
