import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { closeDropdown } from '@/ui/services/dropdownService';
import { html } from 'lit-html';

export const timeFilterTemplate = () => {
    const { segmentExplorerTimeFilter } = useUiStore.getState();
    const { start, end } = segmentExplorerTimeFilter || {};

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const startTime = formData.get('start');
        const endTime = formData.get('end');

        uiActions.setSegmentExplorerTimeFilter({
            start:
                startTime && typeof startTime === 'string'
                    ? parseFloat(startTime)
                    : null,
            end:
                endTime && typeof endTime === 'string'
                    ? parseFloat(endTime)
                    : null,
        });

        closeDropdown();
    };

    const inputClasses =
        'w-24 bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded border border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all';

    return html`
        <form @submit=${handleSubmit} class="p-4 w-64">
            <div class="flex items-center justify-between mb-4">
                <h3
                    class="text-xs font-bold text-slate-400 uppercase tracking-wider"
                >
                    Time Filter
                </h3>
                <button
                    type="button"
                    @click=${() => closeDropdown()}
                    class="text-slate-400 hover:text-slate-200"
                >
                    ${icons.x}
                </button>
            </div>

            <div class="space-y-3">
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] text-slate-400"
                        >Start Time (s)</label
                    >
                    <input
                        type="number"
                        name="start"
                        .value=${start || ''}
                        class="${inputClasses}"
                        placeholder="0.00"
                        step="0.01"
                    />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] text-slate-400"
                        >End Time (s)</label
                    >
                    <input
                        type="number"
                        name="end"
                        .value=${end || ''}
                        class="${inputClasses}"
                        placeholder="Duration"
                        step="0.01"
                    />
                </div>
            </div>

            <div
                class="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-800"
            >
                <button
                    type="button"
                    @click=${() => {
                        uiActions.setSegmentExplorerTimeFilter({
                            start: null,
                            end: null,
                        });
                        closeDropdown();
                    }}
                    class="px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 transition-colors"
                >
                    Reset
                </button>
                <button
                    type="submit"
                    class="px-3 py-2 rounded-lg bg-blue-500 hover:bg-[#60a5fa] text-white text-xs font-bold shadow-[0_0_15px_#3b82f6] transition-all hover:scale-[1.02]"
                >
                    Apply Filter
                </button>
            </div>
        </form>
    `;
};
