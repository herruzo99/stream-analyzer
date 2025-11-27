import { useNetworkStore } from '@/state/networkStore';
import '@/ui/components/virtualized-list';
import { html } from 'lit-html';
import { waterfallRowTemplate } from './waterfall-row.js';

export const waterfallChartTemplate = (waterfallData) => {
    const { selectedEventId } = useNetworkStore.getState();

    if (waterfallData.length === 0) {
        return html`
            <div
                class="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/30 rounded-lg border border-slate-800 border-dashed"
            >
                <div class="opacity-50 scale-150 mb-4">📡</div>
                <p class="text-sm font-medium">No requests logged.</p>
                <p class="text-xs opacity-70 mt-1">
                    Check your filters or start playback.
                </p>
            </div>
        `;
    }

    return html`
        <div
            class="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-inner relative"
        >
            <!-- Header -->
            <div
                class="flex items-center bg-slate-950 border-b border-slate-800 h-9 text-xs font-bold text-slate-400 uppercase tracking-wider select-none shrink-0 z-10"
            >
                <div class="w-[250px] px-3 border-r border-slate-800/50">
                    Name
                </div>
                <div
                    class="w-[60px] px-2 text-center border-r border-slate-800/50"
                >
                    Stat
                </div>
                <div
                    class="w-[80px] px-2 text-center border-r border-slate-800/50"
                >
                    Type
                </div>
                <div
                    class="w-[80px] px-2 text-right border-r border-slate-800/50"
                >
                    Size
                </div>
                <div class="grow px-3">Waterfall</div>
            </div>

            <!-- Virtual List Container -->
            <!-- 
                CRITICAL FIX: 
                1. 'grow relative' makes this div fill the remaining height.
                2. The child 'virtualized-list' uses 'absolute inset-0' to exactly match this parent's dimensions.
                3. This forces the virtual-list's internal 'overflow-y-auto' to trigger when content exceeds height.
            -->
            <div class="grow relative w-full min-h-0 bg-slate-900">
                <virtualized-list
                    class="absolute inset-0 w-full h-full"
                    .items=${waterfallData}
                    .rowTemplate=${(item) =>
                        waterfallRowTemplate(item, item.id === selectedEventId)}
                    .rowHeight=${32}
                    .itemId=${(item) => item.id}
                ></virtualized-list>
            </div>
        </div>
    `;
};
