import * as icons from '@/ui/icons';
import { uiActions, useUiStore } from '@/state/uiStore';
import { html } from 'lit-html';
import { featureSlug } from './feature-slug.js';

const CATEGORY_ICONS = {
    'Core Streaming': icons.server,
    'Timeline & Segment Management': icons.timeline,
    'Live & Dynamic': icons.activity,
    'Advanced Content': icons.puzzle,
    'Client Guidance & Optimization': icons.slidersHorizontal,
    'Accessibility & Metadata': icons.fileText,
};

export const featureMatrixTemplate = (groupedFeatures) => {
    const { featuresSelectedId } = useUiStore.getState();

    return html`
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            ${Object.entries(groupedFeatures).map(([category, features]) => {
                const list = Array.isArray(features) ? features : [];
                const activeCount = list.filter((f) => f.used).length;
                const totalCount = list.length;
                const categoryIcon = CATEGORY_ICONS[category] || icons.tag;
                const pct =
                    totalCount > 0
                        ? Math.round((activeCount / totalCount) * 100)
                        : 0;

                return html`
                    <div
                        class="flex flex-col overflow-hidden rounded-md border border-white/5 bg-[#0b111c]"
                    >
                        <div
                            class="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-3"
                        >
                            <div
                                class="flex items-center gap-2 text-[13px] font-medium text-slate-200 min-w-0"
                            >
                                <span class="text-slate-600 shrink-0"
                                    >${categoryIcon}</span
                                >
                                <span class="truncate">${category}</span>
                            </div>
                            <span
                                class="mono text-[10px] text-slate-500 shrink-0"
                            >
                                ${activeCount}/${totalCount}
                            </span>
                        </div>

                        <div class="h-0.5 w-full bg-white/5">
                            <div
                                class="h-full ${activeCount > 0 ? 'bg-emerald-400' : 'bg-white/10'}"
                                style="width: ${pct}%"
                            ></div>
                        </div>

                        <div
                            class="p-3 grid grid-cols-2 gap-1.5 grow content-start"
                        >
                            ${list.map((feature) => {
                                const slug = featureSlug(feature);
                                const selected = featuresSelectedId === slug;
                                const isUsed = feature.used === true;
                                return html`
                                    <button
                                        @click=${() =>
                                            uiActions.setFeaturesSelectedId(
                                                selected ? null : slug
                                            )}
                                        aria-pressed=${selected}
                                        title="${feature.name || 'feature'} — ${isUsed ? 'detected' : 'not detected'}"
                                        class="text-left rounded-md border px-3 py-2.5 transition-colors flex items-center gap-2 min-w-0 ${selected
                                            ? 'border-emerald-400/40 bg-emerald-500/[0.06]'
                                            : isUsed
                                              ? 'border-white/10 bg-white/[0.02] hover:border-white/25'
                                              : 'border-white/5 hover:border-white/15'}"
                                    >
                                        <span
                                            class="${isUsed ? 'text-emerald-300' : 'text-slate-700'} shrink-0"
                                            >${isUsed ? icons.checkCircle : icons.circle}</span
                                        >
                                        <span class="min-w-0">
                                            <span
                                                class="block text-[13px] ${isUsed ? 'text-slate-200' : 'text-slate-500'} truncate"
                                                >${feature.name || 'unnamed'}</span
                                            >
                                            <span
                                                class="mono block text-[10px] text-slate-600 truncate"
                                                >${feature.isoRef || ''}</span
                                            >
                                        </span>
                                    </button>
                                `;
                            })}
                        </div>
                    </div>
                `;
            })}
        </div>
    `;
};
