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
    currentTimeFilter,
    isLive,
}) => {
    const applyFilter = (start, end) => {
        eventBus.dispatch('ui:segment-explorer:time-filter-applied', {
            start,
            end,
        });
        closeDropdown();
    };

    const handleQuickRange = (seconds) => {
        const now = new Date();
        const start = new Date(now.getTime() - seconds * 1000);
        applyFilter(start, now);
    };

    const handleJumpTo = (position) => {
        if (position === 'live' && maxTime) {
            const start = new Date(maxTime.getTime() - 60000); // Default 1 minute window
            applyFilter(start, maxTime);
        } else if (position === 'start' && minTime) {
            const end = new Date(minTime.getTime() + 60000);
            applyFilter(minTime, end);
        } else if (position === 'end' && maxTime) {
            const start = new Date(maxTime.getTime() - 60000);
            applyFilter(start, maxTime);
        }
    };

    const handleNavigate = (direction) => {
        const currentStart = currentTimeFilter.start || maxTime || new Date();
        const currentEnd = currentTimeFilter.end || maxTime || new Date();
        const windowSize = currentEnd.getTime() - currentStart.getTime();
        const step = windowSize > 0 ? windowSize : 60000; // Default to 60s step
        const newStart = new Date(currentStart.getTime() + step * direction);
        const newEnd = new Date(currentEnd.getTime() + step * direction);
        applyFilter(newStart, newEnd);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const form = /** @type {HTMLFormElement} */ (e.target);
        const startStr = /** @type {string} */ (
            new FormData(form).get('start')
        );
        const endStr = /** @type {string} */ (new FormData(form).get('end'));
        applyFilter(
            startStr ? new Date(startStr) : null,
            endStr ? new Date(endStr) : null
        );
    };

    const liveShortcuts = html`
        <div class="flex gap-2">
            ${shortcutButton('Last 1 Min', icons.viewfinder, () =>
                handleQuickRange(60)
            )}
            ${shortcutButton('Last 5 Mins', icons.viewfinder, () =>
                handleQuickRange(300)
            )}
        </div>
    `;

    const vodShortcuts = html`
        <div class="flex gap-2">
            ${shortcutButton('First 1 Min', icons.viewfinder, () =>
                handleJumpTo('start')
            )}
            ${shortcutButton('Last 1 Min', icons.viewfinder, () =>
                handleJumpTo('end')
            )}
        </div>
    `;

    return html`
        <form
            @submit=${handleSubmit}
            class="dropdown-panel bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-80 p-4 space-y-4"
        >
            <h4 class="font-bold text-gray-200 flex items-center gap-2">
                ${icons.calendar} Time Range Filter
            </h4>

            <!-- Shortcuts -->
            <div class="space-y-3 pt-2">
                <h5 class="text-xs font-semibold text-gray-400">Shortcuts</h5>
                ${isLive ? liveShortcuts : vodShortcuts}
                <div class="flex gap-2">
                    ${shortcutButton('Full Range', icons.viewfinder, () =>
                        applyFilter(null, null)
                    )}
                </div>
            </div>

            <!-- Custom Range -->
            <div class="space-y-3 pt-3 border-t border-gray-700">
                <h5 class="text-xs font-semibold text-gray-400">
                    Custom Range
                </h5>
                <div>
                    <label
                        for="time-filter-start"
                        class="block text-sm font-medium text-gray-400"
                        >Start Time (Local)</label
                    >
                    <input
                        type="datetime-local"
                        id="time-filter-start"
                        name="start"
                        class="mt-1 w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-blue-500"
                        .value=${toDateTimeLocal(currentTimeFilter.start)}
                        min=${toDateTimeLocal(minTime)}
                        max=${toDateTimeLocal(maxTime)}
                        step="1"
                    />
                </div>
                <div>
                    <label
                        for="time-filter-end"
                        class="block text-sm font-medium text-gray-400"
                        >End Time (Local)</label
                    >
                    <input
                        type="datetime-local"
                        id="time-filter-end"
                        name="end"
                        class="mt-1 w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-blue-500"
                        .value=${toDateTimeLocal(currentTimeFilter.end)}
                        min=${toDateTimeLocal(minTime)}
                        max=${toDateTimeLocal(maxTime)}
                        step="1"
                    />
                </div>
            </div>

            <!-- Navigation -->
            <div
                class="flex items-center justify-center gap-2 pt-2 border-t border-gray-700"
            >
                ${shortcutButton('Previous Window', icons.arrowLeft, () =>
                    handleNavigate(-1)
                )}
                <button
                    type="submit"
                    class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md text-sm"
                >
                    Apply
                </button>
                ${shortcutButton('Next Window', icons.arrowRight, () =>
                    handleNavigate(1)
                )}
            </div>
        </form>
    `;
};
