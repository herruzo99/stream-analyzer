import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { featureTileTemplate } from './feature-tile.js';
import { styleMap } from 'lit-html/directives/style-map.js';

const CATEGORY_ICONS = {
    'Core Streaming': icons.server,
    'Timeline & Segment Management': icons.timeline,
    'Live & Dynamic': icons.activity,
    'Advanced Content': icons.puzzle,
    'Client Guidance & Optimization': icons.slidersHorizontal,
    'Accessibility & Metadata': icons.fileText,
};

const layoutCardStyles = {
    
    borderRadius: '0.75rem',
    boxShadow: '0 8px 30px rgb(0 0 0 / 0.35)',
    backdropFilter: 'blur(12px)',
    background: '#1e293b',
};

export const featureMatrixTemplate = (groupedFeatures, categoryStats = {}) => {
    return html`
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3" style="gap: 0.75rem">
            ${Object.entries(groupedFeatures).map(([category, features]) => {
        // Use global stats if available, otherwise fall back to view-only counts
        const stats = categoryStats[category] || {
            used: features.filter((f) => f.used).length,
            total: features.length
        };

        const activeCount = stats.used;
        const totalCount = stats.total;
        const categoryIcon = CATEGORY_ICONS[category] || icons.tag;

        // Calculate category health/activity
        const activityPercent = (activeCount / totalCount) * 100;
        let barColor = 'bg-slate-900/50';
        // Check activeCount against totalCount correctly for color status
        if (activeCount > 0) barColor = 'bg-blue-500';
        if (activeCount === totalCount && totalCount > 0)
            barColor = 'bg-emerald-500';

        return html`
                    <div
                        class="flex flex-col overflow-hidden transition-all duration-300 group hover:border-slate-800 hover:shadow-md"
                        style=${styleMap(layoutCardStyles)}
                    >
                        <!-- Category Header -->
                        <div
                            class="p-4 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between"
                        >
                            <div
                                class="flex items-center gap-2.5 text-sm font-bold text-slate-200"
                            >
                                <span
                                    class="text-slate-400 scale-90"
                                    >${categoryIcon}</span
                                >
                                ${category}
                            </div>
                            <span
                                class="text-[10px] font-bold font-mono bg-slate-900 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full shadow-inner"
                            >
                                ${activeCount}/${totalCount}
                            </span>
                        </div>

                        <!-- Progress Line -->
                        <div
                            class="h-0.5 w-full bg-slate-900/50"
                        >
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
