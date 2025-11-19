import { html } from 'lit-html';
import { adaptationSetCardTemplate } from './adaptation-set-card.js';
import * as icons from '@/ui/icons';
import {
    getInheritedElement,
    findChildren,
} from '../../../../../infrastructure/parsing/utils/recursive-parser.js';

/**
 * Renders a single, compact metric for the timing grid.
 * @param {object} metric - The metric object to render.
 * @returns {import('lit-html').TemplateResult | string}
 */
const metricTemplate = (metric) => {
    if (
        metric.value === 'N/A' ||
        metric.value === null ||
        metric.value === undefined
    )
        return '';
    return html`
        <div
            class="flex items-baseline justify-between gap-2 bg-slate-900/50 px-2 py-1 rounded border border-slate-700/50"
        >
            <dt
                class="text-xs text-slate-400 font-semibold truncate"
                title=${metric.name}
            >
                ${metric.name}
            </dt>
            <dd
                class="text-xs font-mono text-white truncate ${metric.color ||
                ''}"
                title=${String(metric.value)}
            >
                ${metric.value}
            </dd>
        </div>
    `;
};

export const periodCardTemplate = (period, index, stream) => {
    const periodDuration =
        period.duration !== null
            ? `${period.duration.toFixed(3)}s`
            : 'Until next period';

    // --- Inferred Metrics Calculation ---
    const { manifest } = stream;
    const { periods } = manifest;
    const nextPeriod = periods[index + 1];

    const periodEndTime =
        period.duration !== null ? period.start + period.duration : null;

    let gapInfo = 'N/A';
    let overlaps = false;
    let gapColor = '';
    if (nextPeriod && periodEndTime !== null) {
        const gap = nextPeriod.start - periodEndTime;
        if (Math.abs(gap) > 0.001) {
            gapColor = gap > 0 ? 'text-yellow-400' : 'text-red-400';
        }
        gapInfo = `${gap.toFixed(3)}s`;
        overlaps = gap < 0;
    } else if (nextPeriod) {
        gapInfo = 'None (Continuous)';
    }

    let percentOfTotal = 'N/A';
    if (period.duration && manifest.duration > 0) {
        percentOfTotal = `${(
            (period.duration / manifest.duration) *
            100
        ).toFixed(1)}%`;
    }

    const usesTimeline = period.adaptationSets.some((as) =>
        (as.representations || []).some(
            (rep) =>
                findChildren(
                    getInheritedElement('SegmentTemplate', [
                        rep.serializedManifest,
                        as.serializedManifest,
                        period.serializedManifest,
                    ]),
                    'SegmentTimeline'
                ).length > 0
        )
    );

    // --- End Inferred Metrics Calculation ---

    const timingMetrics = [
        { name: 'Gap to Next', value: gapInfo, color: gapColor },
        {
            name: 'Overlaps Next',
            value: overlaps ? 'Yes' : 'No',
            color: overlaps ? 'text-red-400' : '',
        },
        { name: 'Uses SegmentTimeline', value: usesTimeline ? 'Yes' : 'No' },
        { name: 'Share of Total', value: percentOfTotal },
    ].filter((m) => m.value !== 'N/A' && m.value !== 'No');

    return html`
        <details
            class="bg-slate-800/50 rounded-lg border border-slate-700 details-animated"
            open
        >
            <summary
                class="flex items-center gap-4 p-3 cursor-pointer list-none hover:bg-slate-700/50 rounded-t-lg"
            >
                <span
                    class="text-slate-400 group-open:rotate-90 transition-transform"
                    >${icons.chevronDown}</span
                >
                <span class="text-blue-400">${icons.folder}</span>
                <div class="font-semibold text-slate-200">
                    Period ${period.id || index}
                </div>
                <div class="flex items-center gap-4 text-xs font-mono ml-auto">
                    <span
                        class="flex items-center gap-1.5 text-slate-300"
                        title="Period Start Time"
                        ><span class="text-slate-500">${icons.timer}</span
                        >Start: ${period.start.toFixed(3)}s</span
                    >
                    <span
                        class="flex items-center gap-1.5 text-slate-300"
                        title="Period Duration"
                        ><span class="text-slate-500">${icons.clock}</span
                        >Duration: ${periodDuration}</span
                    >
                </div>
            </summary>
            <div class="border-t border-slate-700 p-2 space-y-3">
                ${timingMetrics.length > 0
                    ? html`
                          <div
                              class="bg-slate-900/50 rounded p-3 border border-slate-600"
                          >
                              <h4
                                  class="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-2"
                              >
                                  ${icons.calculator}
                                  <span>Inferred Period Timing</span>
                              </h4>
                              <dl
                                  class="grid gap-2 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]"
                              >
                                  ${timingMetrics.map(metricTemplate)}
                              </dl>
                          </div>
                      `
                    : ''}

                <!-- Adaptation Sets -->
                <div class="space-y-2">
                    <h4
                        class="text-xs font-semibold text-slate-300 flex items-center gap-2 px-1"
                    >
                        ${icons.layers}
                        <span>Adaptation Sets</span>
                    </h4>
                    ${period.adaptationSets.map((as) =>
                        adaptationSetCardTemplate(as, stream, period)
                    )}
                </div>
            </div>
        </details>
    `;
};
