import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { featureTileTemplate } from './feature-tile.js';

const CATEGORY_ICONS = {
    'Core Streaming': icons.server,
    'Timeline & Segment Management': icons.timeline,
    'Live & Dynamic': icons.activity,
    'Advanced Content': icons.puzzle,
    'Client Guidance & Optimization': icons.slidersHorizontal,
    'Accessibility & Metadata': icons.fileText,
};

export const featureMatrixTemplate = (groupedFeatures) => {
    return html`
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            ${Object.entries(groupedFeatures).map(([category, features]) => {
                const activeCount = features.filter((f) => f.used).length;
                const totalCount = features.length;
                const categoryIcon = CATEGORY_ICONS[category] || icons.tag;

                // Calculate category health/activity
                const activityPercent = (activeCount / totalCount) * 100;
                let barColor = 'bg-slate-700';
                if (activeCount > 0) barColor = 'bg-blue-500';
                if (activeCount === totalCount) barColor = 'bg-emerald-500';

                return html`
                    <div
                        class="bg-slate-900/50 rounded-xl border border-slate-800/50 flex flex-col overflow-hidden shadow-sm hover:border-slate-700 transition-colors"
                    >
                        <!-- Category Header -->
                        <div
                            class="p-4 border-b border-slate-800/50 bg-slate-800/20 flex items-center justify-between"
                        >
                            <div
                                class="flex items-center gap-2.5 text-sm font-bold text-slate-200"
                            >
                                <span class="text-slate-500 scale-90"
                                    >${categoryIcon}</span
                                >
                                ${category}
                            </div>
                            <span
                                class="text-[10px] font-bold font-mono bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-full"
                            >
                                ${activeCount}/${totalCount}
                            </span>
                        </div>

                        <!-- Progress Line -->
                        <div class="h-0.5 w-full bg-slate-800/50">
                            <div
                                class="h-full ${barColor} transition-all duration-500 shadow-[0_0_10px_currentColor]"
                                style="width: ${activityPercent}%"
                            ></div>
                        </div>

                        <!-- Grid -->
                        <div
                            class="p-4 grid grid-cols-2 gap-3 grow content-start"
                        >
                            ${features.map((feature) =>
                                featureTileTemplate(feature)
                            )}
                        </div>
                    </div>
                `;
            })}
        </div>
    `;
};
