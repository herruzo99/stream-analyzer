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
        'w-24 bg-[#06090f] text-slate-200 mono text-[12px] px-2.5 py-1.5 rounded-md border border-white/10 focus:outline-none focus:border-emerald-400/60 transition-colors placeholder:text-slate-600';

    return html`
        <form @submit=${handleSubmit} class="p-4 w-64">
            <div class="flex items-center justify-between mb-4">
                <p class="mono text-[10px] text-slate-500">time filter</p>
                <button
                    type="button"
                    @click=${() => closeDropdown()}
                    aria-label="Close time filter"
                    class="p-1 rounded text-slate-500 hover:text-slate-100 hover:bg-white/10 transition-colors"
                >
                    ${icons.x}
                </button>
            </div>

            <div class="space-y-3">
                <div class="flex flex-col gap-1">
                    <label class="mono text-[10px] text-slate-600"
                        >start (s)</label
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
                    <label class="mono text-[10px] text-slate-600"
                        >end (s)</label
                    >
                    <input
                        type="number"
                        name="end"
                        .value=${end || ''}
                        class="${inputClasses}"
                        placeholder="duration"
                        step="0.01"
                    />
                </div>
            </div>

            <div
                class="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-white/5"
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
                    class="px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
                >
                    Reset
                </button>
                <button
                    type="submit"
                    class="px-3 py-1.5 rounded-md bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-[12px] font-medium transition-colors"
                >
                    Apply
                </button>
            </div>
        </form>
    `;
};
