import { html, render } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import * as icons from '@/ui/icons';
import { scte35DetailsTemplate } from '@/ui/shared/scte35-details';
import { statCardTemplate } from '@/features/summary/ui/components/shared';
import { connectedTabBar } from '@/ui/components/tabs';
import { tooltipTriggerClasses } from '@/ui/shared/constants';

let container = null;
let analysisUnsubscribe = null;
const activeTabs = new Map();

const trackingEventsTableTemplate = (trackingUrls) => {
    if (!trackingUrls || trackingUrls.size === 0) {
        return html`<p class="text-xs text-slate-500 italic">
            No tracking events found.
        </p>`;
    }
    const events = Array.from(trackingUrls.entries());
    return html`
        <div
            class="bg-slate-900/50 rounded border border-slate-700/50 overflow-hidden"
        >
            <table class="w-full text-left text-xs table-auto">
                <thead class="bg-slate-800/50">
                    <tr>
                        <th class="p-2 font-semibold text-slate-400 w-1/4">
                            Event Type
                        </th>
                        <th class="p-2 font-semibold text-slate-400">
                            Tracking URL(s)
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-700/50">
                    ${events.map(
                        ([event, urls]) => html`
                            <tr class="hover:bg-slate-700/50">
                                <td
                                    class="p-2 font-medium text-slate-300 align-top"
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

const adCreativeCardTemplate = (creative) => html`
    <div class="bg-slate-800 rounded-lg border border-slate-700">
        <div class="p-3 border-b border-slate-700">
            <h5 class="font-bold text-slate-200">
                Creative ID:
                <span class="font-mono">${creative.id || 'N/A'}</span>
            </h5>
            <div class="text-xs text-slate-400 font-mono mt-1">
                Sequence: ${creative.sequence} | Duration:
                ${creative.duration.toFixed(2)}s
            </div>
        </div>
        <div class="p-3 space-y-3">
            <div>
                <h6
                    class="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-2"
                >
                    ${icons.fileText} Media File
                </h6>
                <p class="text-xs font-mono text-cyan-400 break-all">
                    ${creative.mediaFileUrl || 'Not specified'}
                </p>
            </div>
            <div>
                <h6
                    class="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-2"
                >
                    ${icons.network} VAST Tracking Events
                </h6>
                ${trackingEventsTableTemplate(creative.trackingUrls)}
            </div>
        </div>
    </div>
`;

const adAvailCardTemplate = (avail) => {
    const tabs = [
        { key: 'creatives', label: `Creatives (${avail.creatives.length})` },
        { key: 'scte35', label: 'SCTE-35 Signal' },
    ];
    if (!activeTabs.has(avail.id)) {
        activeTabs.set(avail.id, 'creatives');
    }
    const activeTab = activeTabs.get(avail.id);
    const onTabClick = (tabKey) => {
        activeTabs.set(avail.id, tabKey);
        renderAdvertisingReport();
    };

    let contentTemplate;
    if (activeTab === 'creatives') {
        const noCreativesMessage = avail.adManifestUrl
            ? html`<div
                  class="text-center p-6 bg-slate-900/50 rounded-lg border border-dashed border-slate-700"
              >
                  <p class="text-sm text-yellow-300 italic">
                      Could not resolve ad creatives from the VAST manifest.
                  </p>
                  <p class="text-xs text-slate-400 mt-2">
                      This could be due to an empty VAST response, a network
                      error, or an unsupported ad format.
                  </p>
              </div>`
            : html`<div
                  class="text-center p-6 bg-slate-900/50 rounded-lg border border-dashed border-slate-700"
              >
                  <p class="text-sm text-slate-400 italic">
                      This is a server-stitched ad period.
                  </p>
                  <p class="text-xs text-slate-400 mt-2">
                      Ad creatives are part of the main media stream and not
                      from a separate VAST file.
                  </p>
              </div>`;
        contentTemplate =
            avail.creatives.length > 0
                ? html`<div class="space-y-4">
                      ${avail.creatives.map(adCreativeCardTemplate)}
                  </div>`
                : noCreativesMessage;
    } else {
        contentTemplate = scte35DetailsTemplate(avail.scte35Signal);
    }

    return html`
        <div class="bg-slate-900 rounded-lg border border-slate-700">
            <header class="p-4 border-b border-slate-700">
                <div class="flex flex-wrap justify-between items-center gap-2">
                    <h4 class="text-lg font-bold text-slate-100 truncate">
                        Ad Avail: ${avail.id}
                    </h4>
                    <span
                        class="text-sm font-mono px-3 py-1 rounded-full ${tooltipTriggerClasses}"
                        data-tooltip="Total duration of this ad break"
                        >${avail.duration.toFixed(2)}s</span
                    >
                </div>
                <p
                    class="text-xs text-slate-400 font-mono mt-1 ${tooltipTriggerClasses}"
                    data-tooltip="Start time on the media timeline"
                >
                    Start Time: ${avail.startTime.toFixed(2)}s
                </p>
            </header>
            <div class="p-4">
                <div class="mb-4">
                    ${connectedTabBar(tabs, activeTab, onTabClick)}
                </div>
                <div class="bg-slate-900 p-4 rounded-b-lg">
                    ${contentTemplate}
                </div>
            </div>
        </div>
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
                    <div class="text-slate-500 mx-auto">${icons.film}</div>
                    <h3 class="mt-2 text-lg font-medium text-slate-300">
                        No Ad Avails Detected
                    </h3>
                    <p class="mt-1 text-sm text-slate-500">
                        This stream does not appear to contain any SCTE-35
                        signals or ad insertion periods.
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
    const totalAdDuration = sortedAvails.reduce((sum, a) => sum + a.duration, 0);

    const summarySection = html`
        <div class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
            ${statCardTemplate({
                label: 'Total Ad Avails',
                value: sortedAvails.length,
                tooltip: 'The total number of ad insertion opportunities detected.',
                icon: icons.advertising,
            })}
            ${statCardTemplate({
                label: 'Total Ad Duration',
                value: `${totalAdDuration.toFixed(2)}s`,
                tooltip: 'The combined duration of all detected ad avails.',
                icon: icons.timer,
            })}
        </div>
    `;

    const template = html`
        <div class="space-y-8">
            <div>
                <h3 class="text-xl font-bold mb-4">Advertising Summary</h3>
                ${summarySection}
            </div>
            <div>
                <h3 class="text-xl font-bold mb-4">Ad Avail Details</h3>
                <div class="space-y-4">${sortedAvails.map(adAvailCardTemplate)}</div>
            </div>
        </div>
    `;
    render(template, container);
}

export const advertisingView = {
    mount(containerElement) {
        container = containerElement;
        activeTabs.clear();
        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = useAnalysisStore.subscribe(renderAdvertisingReport);
        renderAdvertisingReport();
    },
    unmount() {
        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = null;
        activeTabs.clear();
        if (container) render(html``, container);
        container = null;
    },
};