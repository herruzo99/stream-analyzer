import { html, render } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import * as icons from '@/ui/icons';
import { scte35DetailsTemplate } from '@/ui/shared/scte35-details';
import { statCardTemplate } from '@/features/summary/ui/components/shared';
import { connectedTabBar } from '@/ui/components/tabs';
import { copyTextToClipboard } from '@/ui/shared/clipboard';

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
    <details class="bg-slate-800 rounded-lg border border-slate-700 group">
        <summary
            class="flex items-center p-3 cursor-pointer list-none hover:bg-slate-700/50 rounded-t-lg"
        >
            <span
                class="text-slate-400 group-open:rotate-90 transition-transform"
                >${icons.chevronDown}</span
            >
            <span class="font-bold text-slate-200 ml-2"
                >Creative:
                <span class="font-mono">${creative.id || 'N/A'}</span></span
            >
            <span class="ml-auto text-xs font-mono text-slate-400"
                >Seq: ${creative.sequence} | Dur:
                ${creative.duration.toFixed(2)}s</span
            >
        </summary>
        <div class="p-4 border-t border-slate-700 space-y-4">
            <div>
                <h6
                    class="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-2"
                >
                    ${icons.fileText} Media File
                </h6>
                <p
                    class="text-xs font-mono text-cyan-400 break-all bg-slate-900/50 p-2 rounded"
                >
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
    </details>
`;

const unconfirmedInbandTemplate = () => html`
    <div
        class="bg-slate-900 rounded-lg border-l-4 border-purple-500 text-center p-6 border border-dashed border-slate-700"
    >
        <div class="text-purple-400 mx-auto w-10 h-10 animate-pulse">
            ${icons.searchCode}
        </div>
        <p class="text-sm font-semibold text-purple-300 mt-2">
            In-Band Ad Signals Detected
        </p>
        <p class="text-xs text-slate-400 mt-2">
            The manifest declares in-band SCTE-35 event streams. Play the
            content or load individual segments in the explorer to discover
            specific ad avails as they appear.
        </p>
    </div>
`;

const adAvailCardTemplate = (avail) => {
    if (avail.id === 'unconfirmed-inband-scte35') {
        return unconfirmedInbandTemplate();
    }

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

    const isCsai = !!avail.adManifestUrl;
    const typeLabel = isCsai
        ? 'Client-Side Ad Avail'
        : 'Server-Side Ad Break / Signal';
    const typeIcon = isCsai ? icons.advertising : icons.server;
    const typeColor = isCsai ? 'border-blue-500' : 'border-purple-500';

    const handleCopyVastUrl = (e) => {
        e.stopPropagation();
        copyTextToClipboard(avail.adManifestUrl, 'VAST URL copied!');
    };

    const noCreativesMessage = avail.adManifestUrl
        ? html`<div
              class="text-center p-6 bg-slate-800 rounded-lg border border-dashed border-slate-700"
          >
              <div class="text-yellow-400 mx-auto w-10 h-10">
                  ${icons.searchCode}
              </div>
              <p class="text-sm font-semibold text-yellow-300 mt-2">
                  Could Not Resolve Ad Creatives
              </p>
              <p class="text-xs text-slate-400 mt-2">
                  The VAST manifest at
                  <code class="bg-slate-700/50 px-1 rounded"
                      >${new URL(avail.adManifestUrl).hostname}</code
                  >
                  was fetched, but it either contained no compatible creatives
                  or was empty.
              </p>
          </div>`
        : html`<div
              class="text-center p-6 bg-slate-800 rounded-lg border border-dashed border-slate-700"
          >
              <div class="text-slate-400 mx-auto w-10 h-10">
                  ${icons.server}
              </div>
              <p class="text-sm font-semibold text-slate-300 mt-2">
                  Server-Side Ad Period or Timed Signal
              </p>
              <p class="text-xs text-slate-400 mt-2">
                  This ad avail was signaled in the manifest (e.g., via
                  SCTE-35), but does not point to a client-side VAST URL. Ads
                  are likely stitched into the main content by the server.
              </p>
          </div>`;

    let contentTemplate;
    if (activeTab === 'creatives') {
        contentTemplate =
            avail.creatives.length > 0
                ? html`<div class="space-y-2">
                      ${avail.creatives.map(adCreativeCardTemplate)}
                  </div>`
                : noCreativesMessage;
    } else {
        contentTemplate = scte35DetailsTemplate(avail.scte35Signal);
    }

    return html`
        <div class="bg-slate-900 rounded-lg border-l-4 ${typeColor}">
            <header class="p-4 border-b border-slate-700">
                <div class="flex flex-wrap justify-between items-start gap-2">
                    <h4
                        class="text-lg font-bold text-slate-100 flex items-center gap-3"
                    >
                        ${typeIcon}
                        <span>${typeLabel}</span>
                    </h4>
                    <span
                        class="text-sm font-mono px-3 py-1 bg-slate-800 text-slate-300 rounded-full"
                        >ID: ${avail.id}</span
                    >
                </div>
                ${isCsai
                    ? html`
                          <div
                              class="mt-3 text-xs font-mono text-cyan-400 bg-slate-800/50 p-2 rounded flex items-center gap-2"
                          >
                              <span
                                  class="text-slate-400 shrink-0 font-sans font-semibold"
                                  >VAST URL:</span
                              >
                              <span
                                  class="truncate"
                                  title=${avail.adManifestUrl}
                                  >${avail.adManifestUrl}</span
                              >
                              <button
                                  @click=${handleCopyVastUrl}
                                  class="text-slate-400 hover:text-white shrink-0"
                              >
                                  ${icons.clipboardCopy}
                              </button>
                          </div>
                      `
                    : ''}
                <div class="grid grid-cols-2 gap-4 mt-4">
                    ${statCardTemplate({
                        label: 'Start Time',
                        value:
                            avail.startTime !== undefined
                                ? `${avail.startTime.toFixed(2)}s`
                                : 'N/A',
                        icon: icons.timer,
                    })}
                    ${statCardTemplate({
                        label: 'Duration',
                        value:
                            avail.duration !== undefined
                                ? `${avail.duration.toFixed(2)}s`
                                : 'N/A',
                        icon: icons.clock,
                    })}
                </div>
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
                    <div class="text-slate-500 mx-auto w-12 h-12">
                        ${icons.film}
                    </div>
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
    const confirmedAvails = sortedAvails.filter(
        (a) => a.id !== 'unconfirmed-inband-scte35'
    );

    const totalAdDuration = confirmedAvails.reduce(
        (sum, a) => sum + a.duration,
        0
    );

    const summarySection = html`
        <div class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
            ${statCardTemplate({
                label: 'Total Ad Avails',
                value: confirmedAvails.length,
                tooltip:
                    'The total number of ad insertion opportunities detected.',
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
                <div class="space-y-4">
                    ${sortedAvails.map(adAvailCardTemplate)}
                </div>
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
        analysisUnsubscribe = useAnalysisStore.subscribe(
            renderAdvertisingReport
        );
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
