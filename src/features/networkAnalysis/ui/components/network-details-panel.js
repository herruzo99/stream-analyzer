import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';
import { extractCmcdData } from '../../domain/cmcd-validator.js'; // Import the validator
import { cmcdPanelTemplate } from './cmcd-panel.js'; // Import the UI
import { headerDetailsTemplate } from './header-details.js';
import { responseViewerTemplate } from './response-viewer.js';

const detailItem = (label, value, isMono = false) => html`
    <div
        class="flex justify-between py-2 border-b border-slate-800 last:border-0 hover:bg-slate-800/30 px-2 transition-colors rounded"
    >
        <span class="text-slate-500 font-medium">${label}</span>
        <span
            class="text-slate-200 ${isMono
                ? 'font-mono text-xs'
                : 'text-sm'} text-right truncate max-w-[200px]"
            title="${String(value)}"
        >
            ${value}
        </span>
    </div>
`;

const breakdownBar = (label, valueMs, totalMs, colorClass) => {
    if (!valueMs || valueMs <= 0) return '';
    const percent = totalMs > 0 ? (valueMs / totalMs) * 100 : 0;
    return html`
        <div class="mb-2 last:mb-0">
            <div class="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>${label}</span>
                <span class="text-slate-300 font-mono"
                    >${valueMs.toFixed(1)}ms</span
                >
            </div>
            <div class="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                    class="h-full ${colorClass} rounded-full"
                    style="width: ${percent}%"
                ></div>
            </div>
        </div>
    `;
};

const auditFindingsTemplate = (issues) => {
    if (!issues || issues.length === 0) return '';
    return html`
        <section class="mb-4">
            <h5
                class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"
            >
                ${icons.shieldCheck} Audit Findings
            </h5>
            <div class="space-y-2">
                ${issues.map(
                    (issue) => html`
                        <div
                            class="p-2 rounded border text-xs flex gap-2 items-start ${issue.level ===
                            'error'
                                ? 'bg-red-900/20 border-red-500/30 text-red-200'
                                : 'bg-amber-900/20 border-amber-500/30 text-amber-200'}"
                        >
                            <span class="shrink-0 mt-0.5"
                                >${issue.level === 'error'
                                    ? icons.xCircle
                                    : icons.alertTriangle}</span
                            >
                            <div>
                                <span class="font-bold block mb-0.5"
                                    >${issue.message}</span
                                >
                                ${issue.header
                                    ? html`<code
                                          class="text-[10px] bg-black/30 px-1 rounded"
                                          >${issue.header}</code
                                      >`
                                    : ''}
                            </div>
                        </div>
                    `
                )}
            </div>
        </section>
    `;
};

export const networkDetailsPanelTemplate = (event) => {
    if (!event) {
        return html`
            <div
                class="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6 bg-slate-900 border border-slate-700 rounded-lg"
            >
                <div class="p-4 bg-slate-800 rounded-full mb-3">
                    ${icons.search}
                </div>
                <p class="font-semibold text-slate-300">Select a Request</p>
                <p class="text-xs mt-1">
                    Click any row in the waterfall to inspect headers, timing,
                    and response bodies.
                </p>
            </div>
        `;
    }

    const breakdown = event.timing.breakdown || { ttfb: 0, download: 0 };
    const totalTime = event.timing.duration;
    const issues = event.auditIssues || [];
    const issueHeaderKeys = new Set(
        issues.map((i) => i.header).filter(Boolean)
    );
    const hasDetailedTiming = Object.values(breakdown).some((v) => v > 0);

    // --- Extract CMCD ---
    const cmcdData = extractCmcdData(event);

    return html`
        <div
            class="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-xl"
        >
            <div class="p-4 border-b border-slate-800 bg-slate-900/50">
                <h4
                    class="font-bold text-white text-sm flex items-center gap-2 break-all"
                >
                    <span class="text-blue-400">${icons.network}</span>
                    <span class="truncate"
                        >${new URL(event.url).pathname.split('/').pop() ||
                        event.url}</span
                    >
                </h4>
                <a
                    href="${event.url}"
                    target="_blank"
                    class="text-[10px] text-blue-400 hover:underline mt-1 block truncate font-mono"
                    >${event.url}</a
                >
            </div>

            <div class="grow overflow-y-auto custom-scrollbar">
                <div class="p-4 space-y-6">
                    ${auditFindingsTemplate(issues)}

                    <!-- Overview -->
                    <section>
                        <h5
                            class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
                        >
                            Overview
                        </h5>
                        <div
                            class="bg-slate-950/30 rounded-lg border border-slate-800 p-1"
                        >
                            ${detailItem(
                                'Status',
                                `${event.response.status} ${event.response.statusText}`,
                                true
                            )}
                            ${detailItem('Method', event.request.method, true)}
                            ${detailItem('Type', event.resourceType)}
                            ${detailItem(
                                'Size',
                                `${event.response.contentLength} bytes`,
                                true
                            )}
                            ${event.throughput
                                ? detailItem(
                                      'Throughput',
                                      formatBitrate(event.throughput),
                                      true
                                  )
                                : ''}
                        </div>
                    </section>

                    <!-- CMCD Panel (New) -->
                    ${cmcdPanelTemplate(cmcdData)}

                    <!-- Response Body -->
                    <section>
                        <h5
                            class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
                        >
                            Response Body
                        </h5>
                        <div
                            class="bg-slate-950/30 rounded-lg border border-slate-800 p-2 min-h-[200px]"
                        >
                            ${responseViewerTemplate(event)}
                        </div>
                    </section>

                    <!-- Headers -->
                    <details class="group">
                        <summary
                            class="list-none flex items-center justify-between cursor-pointer py-2 border-b border-slate-800"
                        >
                            <h5
                                class="text-xs font-bold text-slate-500 uppercase tracking-wider"
                            >
                                Response Headers
                            </h5>
                            <span
                                class="text-slate-500 group-open:rotate-180 transition-transform"
                                >${icons.chevronDown}</span
                            >
                        </summary>
                        <div class="pt-2">
                            ${headerDetailsTemplate(
                                event.response.headers,
                                issueHeaderKeys
                            )}
                        </div>
                    </details>

                    <details class="group">
                        <summary
                            class="list-none flex items-center justify-between cursor-pointer py-2 border-b border-slate-800"
                        >
                            <h5
                                class="text-xs font-bold text-slate-500 uppercase tracking-wider"
                            >
                                Request Headers
                            </h5>
                            <span
                                class="text-slate-500 group-open:rotate-180 transition-transform"
                                >${icons.chevronDown}</span
                            >
                        </summary>
                        <div class="pt-2">
                            ${headerDetailsTemplate(event.request.headers)}
                        </div>
                    </details>

                    <!-- Timing -->
                    <section>
                        <h5
                            class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
                        >
                            Timing (${totalTime.toFixed(1)}ms)
                        </h5>
                        <div
                            class="bg-slate-950/30 rounded-lg border border-slate-800 p-3"
                        >
                            ${hasDetailedTiming
                                ? html`
                                      ${breakdownBar(
                                          'Redirect',
                                          breakdown.redirect,
                                          totalTime,
                                          'bg-yellow-500'
                                      )}
                                      ${breakdownBar(
                                          'DNS Lookup',
                                          breakdown.dns,
                                          totalTime,
                                          'bg-cyan-500'
                                      )}
                                      ${breakdownBar(
                                          'TCP Connect',
                                          breakdown.tcp,
                                          totalTime,
                                          'bg-orange-500'
                                      )}
                                      ${breakdownBar(
                                          'TLS Handshake',
                                          breakdown.tls,
                                          totalTime,
                                          'bg-pink-500'
                                      )}
                                      ${breakdownBar(
                                          'Waiting (TTFB)',
                                          breakdown.ttfb,
                                          totalTime,
                                          'bg-purple-500'
                                      )}
                                      ${breakdownBar(
                                          'Content Download',
                                          breakdown.download,
                                          totalTime,
                                          'bg-blue-500'
                                      )}
                                  `
                                : html`
                                      ${breakdownBar(
                                          'Total Duration',
                                          totalTime,
                                          totalTime,
                                          'bg-slate-600'
                                      )}
                                      <p
                                          class="text-[9px] text-slate-500 mt-2 italic text-center"
                                      >
                                          Detailed timing unavailable.
                                      </p>
                                  `}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    `;
};
