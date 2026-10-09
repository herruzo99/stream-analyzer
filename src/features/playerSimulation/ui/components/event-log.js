import { html } from 'lit-html';

export const eventLogTemplate = (events) => {
    if (!events || events.length === 0) {
        return html`
            <div
                class="h-full flex flex-col items-center justify-center text-slate-400 italic text-sm border-2 border-dashed border-slate-800 rounded-lg p-6"
            >
                <p>No player events logged yet.</p>
            </div>
        `;
    }

    const typeClasses = {
        adaptation: 'bg-blue-500 text-white',
        buffering: 'bg-amber-500 text-white',
        seek: 'bg-purple-500 text-white',
        error: 'bg-red-500 text-white',
        stall: 'bg-red-500 text-white',
        lifecycle:
            'bg-slate-800 text-slate-400',
        interaction: 'bg-teal-500 text-white',
        metadata:
            'bg-slate-800 text-slate-100',
        default:
            'bg-slate-800 text-slate-400',
    };

    // ARCHITECTURAL FIX:
    // The outer container now uses `flex flex-col h-full overflow-hidden` to strictly constrain height.
    // The table header is static, and the table body container handles the scrolling.
    return html`
        <div
            class="bg-slate-800 rounded-lg border border-slate-800 h-full flex flex-col overflow-hidden"
        >
            <!-- Header -->
            <div
                class="bg-slate-800 backdrop-blur-sm border-b border-slate-800 shrink-0 z-10"
            >
                <table class="w-full text-left text-xs">
                    <thead>
                        <tr>
                            <th
                                class="p-2 font-semibold text-slate-400 w-24"
                            >
                                Time
                            </th>
                            <th
                                class="p-2 font-semibold text-slate-400 w-28"
                            >
                                Type
                            </th>
                            <th
                                class="p-2 font-semibold text-slate-400"
                            >
                                Details
                            </th>
                        </tr>
                    </thead>
                </table>
            </div>

            <!-- Scrollable Body -->
            <div class="grow overflow-y-auto custom-scrollbar">
                <table class="w-full text-left text-xs">
                    <tbody class="divide-y divide-slate-800">
                        ${[...events].reverse().map(
                            (event) => html`
                                <tr
                                    class="hover:bg-slate-800"
                                >
                                    <td
                                        class="p-2 font-mono text-slate-400 align-top w-24"
                                    >
                                        ${event.timestamp}
                                    </td>
                                    <td class="p-2 align-top w-28">
                                        <span
                                            class="px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase tracking-wider ${typeClasses[
                                                event.type
                                            ] || typeClasses.default}"
                                            >${event.type}</span
                                        >
                                    </td>
                                    <td
                                        class="p-2 font-mono text-slate-100 align-top break-words"
                                    >
                                        ${event.details}
                                    </td>
                                </tr>
                            `
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};
