import { html } from 'lit-html';
import * as icons from '@/ui/icons';
import { headerDetailsTemplate } from './header-details.js';

export const networkDetailsPanelTemplate = (event) => {
    if (!event) {
        return html`
            <div
                class="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6 border-2 border-dashed border-slate-700 rounded-lg"
            >
                ${icons.searchCode}
                <p class="mt-2 font-semibold">No Request Selected</p>
                <p class="text-sm">
                    Select a request from the waterfall to view its details.
                </p>
            </div>
        `;
    }

    return html`
        <div
            class="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-lg"
        >
            <div class="p-3 border-b border-slate-700">
                <h4 class="font-bold text-slate-200">Request Details</h4>
            </div>
            <div class="grow overflow-y-auto p-3 space-y-4">
                <details class="details-animated" open>
                    <summary
                        class="font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50"
                    >
                        General
                    </summary>
                    <div class="p-2">
                        <table class="w-full text-left text-xs table-auto">
                            <tbody class="divide-y divide-slate-700/50">
                                <tr class="border-b border-slate-700/50">
                                    <td
                                        class="p-2 font-semibold text-slate-400 w-1/3"
                                    >
                                        Request URL
                                    </td>
                                    <td
                                        class="p-2 font-mono text-cyan-400 break-all"
                                    >
                                        ${event.url}
                                    </td>
                                </tr>
                                <tr class="border-b border-slate-700/50">
                                    <td class="p-2 font-semibold text-slate-400">
                                        Method
                                    </td>
                                    <td class="p-2 font-mono">
                                        ${event.request.method}
                                    </td>
                                </tr>
                                <tr class="border-b border-slate-700/50">
                                    <td class="p-2 font-semibold text-slate-400">
                                        Status Code
                                    </td>
                                    <td class="p-2 font-mono">
                                        ${event.response.status}
                                        ${event.response.statusText}
                                    </td>
                                </tr>
                                <tr class="border-b border-slate-700/50">
                                    <td class="p-2 font-semibold text-slate-400">
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
                        class="font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50"
                    >
                        Response Headers
                    </summary>
                    <div class="p-2">
                        ${headerDetailsTemplate(event.response.headers)}
                    </div>
                </details>
                <details class="details-animated" open>
                    <summary
                        class="font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/50"
                    >
                        Request Headers
                    </summary>
                    <div class="p-2">
                        ${headerDetailsTemplate(event.request.headers)}
                    </div>
                </details>
            </div>
        </div>
    `;
};