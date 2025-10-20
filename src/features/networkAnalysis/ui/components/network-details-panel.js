import { html } from 'lit-html';

const headerTableTemplate = (headers) => {
    if (Object.keys(headers).length === 0) {
        return html`<p class="text-xs text-gray-500 italic">No headers.</p>`;
    }
    return html`
        <table class="w-full text-left text-xs table-auto">
            <tbody>
                ${Object.entries(headers).map(
                    ([key, value]) => html`
                        <tr class="border-b border-gray-700/50">
                            <td
                                class="p-2 font-semibold text-gray-400 align-top w-1/3"
                            >
                                ${key}
                            </td>
                            <td class="p-2 font-mono text-gray-300 break-all">
                                ${value}
                            </td>
                        </tr>
                    `
                )}
            </tbody>
        </table>
    `;
};

export const networkDetailsPanelTemplate = (event) => {
    if (!event) {
        return html`
            <div
                class="h-full flex items-center justify-center text-center text-gray-500"
            >
                <p>Select a request from the table to view its details.</p>
            </div>
        `;
    }

    return html`
        <div
            class="flex flex-col h-full bg-gray-900 border border-gray-700 rounded-lg"
        >
            <div class="p-3 border-b border-gray-700">
                <h4 class="font-bold text-gray-200">Request Details</h4>
            </div>
            <div class="grow overflow-y-auto">
                <details class="details-animated" open>
                    <summary
                        class="font-semibold text-gray-300 p-3 cursor-pointer hover:bg-gray-800/50 border-b border-gray-700"
                    >
                        General
                    </summary>
                    <div class="p-2">
                        <table class="w-full text-left text-xs table-auto">
                            <tbody>
                                <tr class="border-b border-gray-700/50">
                                    <td
                                        class="p-2 font-semibold text-gray-400 w-1/3"
                                    >
                                        Request URL
                                    </td>
                                    <td
                                        class="p-2 font-mono text-cyan-400 break-all"
                                    >
                                        ${event.url}
                                    </td>
                                </tr>
                                <tr class="border-b border-gray-700/50">
                                    <td class="p-2 font-semibold text-gray-400">
                                        Request Method
                                    </td>
                                    <td class="p-2 font-mono">
                                        ${event.request.method}
                                    </td>
                                </tr>
                                <tr class="border-b border-gray-700/50">
                                    <td class="p-2 font-semibold text-gray-400">
                                        Status Code
                                    </td>
                                    <td class="p-2 font-mono">
                                        ${event.response.status}
                                        ${event.response.statusText}
                                    </td>
                                </tr>
                                <tr class="border-b border-gray-700/50">
                                    <td class="p-2 font-semibold text-gray-400">
                                        Total Time
                                    </td>
                                    <td class="p-2 font-mono">
                                        ${event.timing.duration.toFixed(2)} ms
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </details>
                <details class="details-animated" open>
                    <summary
                        class="font-semibold text-gray-300 p-3 cursor-pointer hover:bg-gray-800/50 border-b border-gray-700"
                    >
                        Response Headers
                    </summary>
                    <div class="p-2">
                        ${headerTableTemplate(event.response.headers)}
                    </div>
                </details>
                <details class="details-animated" open>
                    <summary
                        class="font-semibold text-gray-300 p-3 cursor-pointer hover:bg-gray-800/50 border-b border-gray-700"
                    >
                        Request Headers
                    </summary>
                    <div class="p-2">
                        ${headerTableTemplate(event.request.headers)}
                    </div>
                </details>
            </div>
        </div>
    `;
};
