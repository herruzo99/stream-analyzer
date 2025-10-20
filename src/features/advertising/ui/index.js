import { html, render } from 'lit-html';
import { scte35DetailsTemplate } from '@/ui/shared/scte35-details';
import * as icons from '@/ui/icons';
import { useAnalysisStore } from '@/state/analysisStore';

let container = null;
let analysisUnsubscribe = null;

const trackingEventsTableTemplate = (trackingUrls) => {
    if (!trackingUrls || trackingUrls.size === 0) {
        return html`<p class="text-xs text-gray-500 italic">
            No tracking events found.
        </p>`;
    }

    const events = Array.from(trackingUrls.entries());

    return html`
        <div
            class="bg-gray-900/50 rounded border border-gray-700/50 overflow-hidden"
        >
            <table class="w-full text-left text-xs table-auto">
                <thead class="bg-gray-800/50">
                    <tr>
                        <th class="p-2 font-semibold text-gray-400 w-1/4">
                            Event Type
                        </th>
                        <th class="p-2 font-semibold text-gray-400">
                            Tracking URL(s)
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-700/50">
                    ${events.map(
                        ([event, urls]) => html`
                            <tr class="hover:bg-gray-700/50">
                                <td
                                    class="p-2 font-medium text-gray-300 align-top"
                                >
                                    ${event}
                                </td>
                                <td
                                    class="p-2 font-mono text-cyan-400 space-y-1"
                                >
                                    ${urls.map(
                                        (url) =>
                                            html`<div class="break-all">
                                                ${url}
                                            </div>`
                                    )}
                                </td>
                            </tr>
                        `
                    )}
                </tbody>
            </table>
        </div>
    `;
};

const adCreativeTemplate = (creative) => {
    return html`
        <div class="bg-gray-800 rounded-lg border border-gray-700">
            <div class="p-3 border-b border-gray-700">
                <h5 class="font-bold text-gray-200">
                    Creative ID:
                    <span class="font-mono">${creative.id || 'N/A'}</span>
                </h5>
                <div class="text-xs text-gray-400 font-mono mt-1">
                    Sequence: ${creative.sequence} | Duration:
                    ${creative.duration.toFixed(2)}s
                </div>
            </div>
            <div class="p-3 space-y-3">
                <div>
                    <h6 class="text-xs font-semibold text-gray-400 mb-1">
                        Media File
                    </h6>
                    <p class="text-xs font-mono text-cyan-400 break-all">
                        ${creative.mediaFileUrl || 'Not specified'}
                    </p>
                </div>
                <div>
                    <h6 class="text-xs font-semibold text-gray-400 mb-1">
                        VAST Tracking Events
                    </h6>
                    ${trackingEventsTableTemplate(creative.trackingUrls)}
                </div>
            </div>
        </div>
    `;
};

const adAvailTemplate = (avail) => {
    return html`
        <details
            class="bg-gray-800/50 rounded-lg border border-gray-700 details-animated"
            open
        >
            <summary
                class="font-bold text-lg p-3 cursor-pointer hover:bg-gray-700/50"
            >
                Ad Avail: ${avail.id}
                <span class="font-normal font-mono text-sm text-gray-400">
                    (Start: ${avail.startTime.toFixed(2)}s, Duration:
                    ${avail.duration.toFixed(2)}s)
                </span>
            </summary>
            <div class="p-4 border-t border-gray-700 space-y-4">
                <div>
                    <h4 class="text-md font-semibold text-gray-300 mb-2">
                        SCTE-35 Signal Details
                    </h4>
                    <div class="pl-4">
                        ${scte35DetailsTemplate(avail.scte35Signal)}
                    </div>
                </div>
                <div>
                    <h4 class="text-md font-semibold text-gray-300 mb-2">
                        Ad Creatives (${avail.creatives.length})
                    </h4>
                    <div class="pl-4 space-y-4">
                        ${avail.creatives.length > 0
                            ? avail.creatives.map(adCreativeTemplate)
                            : html`<p class="text-sm text-gray-500 italic">
                                  No creatives found in VAST response.
                              </p>`}
                    </div>
                </div>
            </div>
        </details>
    `;
};

function renderAdvertisingReport() {
    if (!container) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);

    if (!stream || !stream.adAvails || stream.adAvails.length === 0) {
        render(
            html`
                <div class="text-center py-12">
                    ${icons.film}
                    <h3 class="mt-2 text-lg font-medium text-gray-300">
                        No Ad Avails Detected
                    </h3>
                    <p class="mt-1 text-sm text-gray-500">
                        This stream does not contain any SCTE-35 signals with
                        resolvable VAST ad manifests.
                    </p>
                </div>
            `,
            container
        );
        return;
    }

    const sortedAvails = [...stream.adAvails].sort(
        (a, b) => a.startTime - b.startTime
    );
    const template = html`
        <div class="space-y-4">
            <h3 class="text-xl font-bold">Advertising Report</h3>
            <p class="text-sm text-gray-400">
                A summary of SCTE-35 signaled ad avails and the creatives
                resolved from their VAST manifests.
            </p>
            ${sortedAvails.map(adAvailTemplate)}
        </div>
    `;
    render(template, container);
}

export const advertisingView = {
    mount(containerElement) {
        container = containerElement;

        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = useAnalysisStore.subscribe(
            renderAdvertisingReport
        );

        renderAdvertisingReport();
    },
    unmount() {
        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = null;
        if (container) render(html``, container);
        container = null;
    },
};
