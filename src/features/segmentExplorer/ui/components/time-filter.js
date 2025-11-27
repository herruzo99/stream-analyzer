import { eventBus } from '@/application/event-bus';
import * as icons from '@/ui/icons';
import { closeDropdown } from '@/ui/services/dropdownService';
import { html } from 'lit-html';

// Helper to format Date objects for datetime-local input
const toDateTimeLocal = (date) => {
    if (!date) return '';
    try {
        const adjustedDate = new Date(
            date.getTime() - date.getTimezoneOffset() * 60000
        );
        return adjustedDate.toISOString().slice(0, 19);
    } catch (_e) {
        return '';
    }
};

const parseTimeInputToSeconds = (timeStr) => {
    if (!timeStr) return null;
    if (!isNaN(Number(timeStr))) return parseFloat(timeStr);
    const parts = timeStr.split(':').map(parseFloat).reverse();
    if (parts.some(isNaN)) return null;
    let seconds = 0;
    if (parts[0] !== undefined) seconds += parts[0];
    if (parts[1] !== undefined) seconds += parts[1] * 60;
    if (parts[2] !== undefined) seconds += parts[2] * 3600;
    return seconds;
};

export const timeFilterTemplate = ({
    minTime,
    maxTime,
    currentTargetTime,
    isLive,
    duration,
}) => {
    const applyTarget = (target) => {
        eventBus.dispatch('ui:segment-explorer:time-target-set', { target });
        closeDropdown();
    };

    const clearTarget = () => {
        eventBus.dispatch('ui:segment-explorer:time-target-cleared');
        closeDropdown();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const targetStr = String(form.get('target'));
        if (targetStr) {
            if (isLive) {
                applyTarget(new Date(targetStr));
            } else {
                const seconds = parseTimeInputToSeconds(targetStr);
                if (seconds !== null && seconds >= 0) {
                    const targetDate = new Date(seconds * 1000);
                    applyTarget(targetDate);
                }
            }
        }
    };

    const inputClass =
        'w-full bg-slate-950 text-white rounded-lg p-2.5 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-sm tracking-wide transition-all';

    const liveTemplate = html`
        <div class="space-y-3">
            <div
                class="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
            >
                <label
                    for="time-filter-target"
                    class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2"
                >
                    Jump to Date (Local Time)
                </label>
                <input
                    type="datetime-local"
                    id="time-filter-target"
                    name="target"
                    class="${inputClass}"
                    .value=${toDateTimeLocal(currentTargetTime)}
                    min=${toDateTimeLocal(minTime)}
                    max=${toDateTimeLocal(maxTime)}
                    step="1"
                />
            </div>
            <div
                class="flex items-center gap-2 text-[10px] text-slate-500 px-1"
            >
                ${icons.history}
                <span
                    >Window: ${minTime?.toLocaleTimeString()} —
                    ${maxTime?.toLocaleTimeString()}</span
                >
            </div>
        </div>
    `;

    const vodTemplate = html`
        <div class="space-y-3">
            <div
                class="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
            >
                <label
                    for="time-filter-target"
                    class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2"
                >
                    Jump to Offset
                </label>
                <div class="relative">
                    <input
                        type="text"
                        id="time-filter-target"
                        name="target"
                        class="${inputClass} pl-9"
                        placeholder="e.g. 120 or 01:30:05"
                        .value=${currentTargetTime
                            ? (currentTargetTime.getTime() / 1000).toFixed(0)
                            : ''}
                        autocomplete="off"
                    />
                    <div
                        class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                    >
                        ${icons.timer}
                    </div>
                </div>
            </div>
            <div
                class="flex items-center gap-2 text-[10px] text-slate-500 px-1"
            >
                ${icons.film}
                <span>Duration: ${duration?.toFixed(2)}s</span>
            </div>
        </div>
    `;

    return html`
        <form
            @submit=${handleSubmit}
            class="dropdown-panel bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-80 p-4 ring-1 ring-black/50"
        >
            <div
                class="flex items-center gap-2 pb-3 mb-2 border-b border-white/5"
            >
                <div class="p-1.5 bg-purple-500/10 rounded text-purple-400">
                    ${icons.calendar}
                </div>
                <h4 class="font-bold text-white text-sm tracking-wide">
                    Time Travel
                </h4>
            </div>

            ${isLive ? liveTemplate : vodTemplate}

            <div
                class="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/5"
            >
                <button
                    type="button"
                    @click=${clearTarget}
                    class="px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors"
                >
                    Reset
                </button>
                <button
                    type="submit"
                    class="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02]"
                >
                    Go to Time
                </button>
            </div>
        </form>
    `;
};
