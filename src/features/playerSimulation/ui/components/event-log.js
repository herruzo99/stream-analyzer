import { html } from 'lit-html';

export const eventLogTemplate = (events) => {
    if (!events || events.length === 0) {
        return html`<div class="text-sm text-gray-500 italic">
            No player events have been logged yet.
        </div>`;
    }

    const typeClasses = {
        adaptation: 'bg-blue-800 text-blue-200',
        buffering: 'bg-yellow-800 text-yellow-200',
        seek: 'bg-purple-800 text-purple-200',
        error: 'bg-red-800 text-red-200',
        stall: 'bg-orange-800 text-orange-200',
        default: 'bg-gray-700 text-gray-200',
    };

    return html`
        <div
            class="bg-gray-900/50 rounded-lg border border-gray-700/50 h-full overflow-y-auto"
        >
            <table class="w-full text-left text-xs">
                <thead class="bg-gray-800/50 sticky top-0">
                    <tr>
                        <th class="p-2 font-semibold text-gray-400 w-24">
                            Time
                        </th>
                        <th class="p-2 font-semibold text-gray-400 w-28">
                            Type
                        </th>
                        <th class="p-2 font-semibold text-gray-400">Details</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-700/50">
                    ${events.map(
                        (event) => html`
                            <tr class="hover:bg-gray-700/50">
                                <td
                                    class="p-2 font-mono text-gray-400 align-top"
                                >
                                    ${event.timestamp}
                                </td>
                                <td class="p-2 align-top">
                                    <span
                                        class="px-2 py-0.5 rounded-full font-semibold ${typeClasses[
                                            event.type
                                        ] || typeClasses.default}"
                                        >${event.type.toUpperCase()}</span
                                    >
                                </td>
                                <td
                                    class="p-2 font-mono text-gray-300 align-top"
                                >
                                    ${event.details}
                                </td>
                            </tr>
                        `
                    )}
                </tbody>
            </table>
        </div>
    `;
};
