import { html } from 'lit-html';
import { eventBus } from '@/application/event-bus';
import { closeDropdown } from '@/ui/services/dropdownService';
import * as icons from '@/ui/icons';

// Helper to format Date objects for datetime-local input
const toDateTimeLocal = (date) => {
    if (!date) return '';
    try {
        const adjustedDate = new Date(
            date.getTime() - date.getTimezoneOffset() * 60000
        );
        return adjustedDate.toISOString().slice(0, 19);
    } catch (e) {
        return '';
    }
};

const shortcutButton = (label, icon, onClick) => html`
    <button
        type="button"
        @click=${onClick}
        class="flex-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold flex items-center justify-center gap-1.5 px-2 py-2 rounded-md transition-colors"
    >
        ${icon}
        <span>${label}</span>
    </button>
`;

export const timeFilterTemplate = ({
    minTime,
    maxTime,
    currentTargetTime,
    isLive,
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
        const form = /** @type {HTMLFormElement} */ (e.target);
        const targetStr = /** @type {string} */ (
            new FormData(form).get('target')
        );
        if (targetStr) {
            applyTarget(new Date(targetStr));
        }
    };

    return html`
        <form
            @submit=${handleSubmit}
            class="dropdown-panel bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-80 p-4 space-y-4"
        >
            <h4 class="font-bold text-gray-200 flex items-center gap-2">
                ${icons.calendar} Time Locator
            </h4>

            <div class="space-y-3 pt-2">
                <div>
                    <label
                        for="time-filter-target"
                        class="block text-sm font-medium text-gray-400"
                        >Jump to Time (Local)</label
                    >
                    <input
                        type="datetime-local"
                        id="time-filter-target"
                        name="target"
                        class="mt-1 w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-blue-500"
                        .value=${toDateTimeLocal(currentTargetTime)}
                        min=${toDateTimeLocal(minTime)}
                        max=${toDateTimeLocal(maxTime)}
                        step="1"
                    />
                    <div class="text-xs text-gray-500 mt-1 text-center">
                        Available: ${minTime?.toLocaleTimeString() ?? 'N/A'} -
                        ${maxTime?.toLocaleTimeString() ?? 'N/A'}
                    </div>
                </div>
            </div>

            <div
                class="flex items-center justify-center gap-2 pt-2 border-t border-gray-700"
            >
                <button
                    type="submit"
                    class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md text-sm"
                >
                    Find
                </button>
                <button
                    type="button"
                    @click=${clearTarget}
                    class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-3 rounded-md text-sm"
                >
                    Clear
                </button>
            </div>
        </form>
    `;
};
