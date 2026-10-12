import { formatDuration } from '@/features/timeline/ui/utils';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { adaptationSetCardTemplate } from './adaptation-set-card.js';

export const periodCardTemplate = (period, index, stream) => {
    const durationStr =
        period.duration !== null ? formatDuration(period.duration) : 'Unknown';
    const startStr =
        period.start !== undefined ? formatDuration(period.start) : '0s';
    const asCount = period.adaptationSets.length;

    return html`
        <div class="relative z-10">
            <!-- Period Marker -->
            <div
                class="absolute -left-[21px] top-0 flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border-2 border-emerald-400/25 z-20"
            >
                <span class="text-xs font-bold text-emerald-200"
                    >${index + 1}</span
                >
            </div>

            <div
                class="bg-white/5 rounded-r-xl border-y border-r border-white/10 ml-6 overflow-hidden"
            >
                <!-- Header -->
                <div
                    class="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center justify-between"
                >
                    <div>
                        <h3
                            class="text-base font-bold text-white flex items-center gap-2"
                        >
                            <span class="text-slate-400 text-sm"
                                >Period ID:</span
                            >
                            <span class="font-mono text-emerald-200"
                                >${period.id || index}</span
                            >
                        </h3>
                        <div
                            class="flex gap-4 mt-1 text-xs text-slate-400 font-mono r"
                        >
                            <span class="flex items-center gap-1">
                                ${icons.timer} Start: ${startStr}
                            </span>
                            <span class="flex items-center gap-1">
                                ${icons.clock} Dur: ${durationStr}
                            </span>
                        </div>
                    </div>
                    <span
                        class="px-3 py-1.5 rounded bg-white/5 text-xs font-semibold text-slate-300 border border-slate-600/50"
                    >
                        ${asCount} Adaptation Sets
                    </span>
                </div>

                <!-- Content (Grid of AS) -->
                <div class="p-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                    ${period.adaptationSets.map((as) =>
                        adaptationSetCardTemplate(as, stream, period)
                    )}
                </div>
            </div>
        </div>
    `;
};
