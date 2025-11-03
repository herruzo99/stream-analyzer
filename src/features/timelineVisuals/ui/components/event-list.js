import { html } from 'lit-html';
import { eventBus } from '@/application/event-bus';

const eventRowTemplate = (event) => {
    let detailsTemplate = html`${event.details}`;
    if (event.scte35) {
        detailsTemplate = html`<button
            @click=${() =>
                eventBus.dispatch('ui:show-scte35-details', {
                    scte35: event.scte35,
                    startTime: event.time,
                })}
            class="text-cyan-400 hover:underline"
        >
            ${event.details} (Click for details)
        </button>`;
    }

    return html`
        <tr class="hover:bg-slate-700/50">
            <td class="p-2 border-t border-slate-700 font-mono text-slate-400">
                ${event.time.toFixed(3)}s
            </td>
            <td class="p-2 border-t border-slate-700">
                <span
                    class="px-2 py-0.5 rounded-full font-semibold"
                    style="background-color: ${event.color}40; color: ${event.color};"
                    >${event.type.toUpperCase()}</span
                >
            </td>
            <td class="p-2 border-t border-slate-700 text-slate-300">
                ${detailsTemplate}
            </td>
        </tr>
    `;
};

export const eventListTemplate = (events) => {
    if (!events || events.length === 0) {
        return html`<div class="text-sm text-slate-500 italic text-center p-4">
            No timed events found in this stream.
        </div>`;
    }

    const sortedEvents = [...events].sort((a, b) => a.time - b.time);

    return html`
        <div
            class="bg-slate-900/50 rounded border border-slate-700/50 overflow-hidden"
        >
            <table class="w-full text-left text-xs table-auto">
                <thead class="bg-slate-800/50">
                    <tr>
                        <th class="p-2 font-semibold text-slate-400 w-24">
                            Time
                        </th>
                        <th class="p-2 font-semibold text-slate-400 w-32">
                            Type
                        </th>
                        <th class="p-2 font-semibold text-slate-400">
                            Details
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedEvents.map(eventRowTemplate)}
                </tbody>
            </table>
        </div>
    `;
};
