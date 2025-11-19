import { html } from 'lit-html';
import { representationCardTemplate } from './representation-card.js';
import * as icons from '@/ui/icons';
import {
    getInheritedElement,
    getAttr,
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
        metric.value === undefined ||
        metric.value === false
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
                ${metric.value === true ? 'Yes' : metric.value}
            </dd>
        </div>
    `;
};

const getIconForType = (type) => {
    switch (type) {
        case 'video':
            return icons.clapperboard;
        case 'audio':
            return icons.audioLines;
        case 'text':
            return icons.fileText;
        default:
            return icons.puzzle;
    }
};

export const adaptationSetCardTemplate = (as, stream, period) => {
    // --- Data Extraction Logic ---
    const hierarchy = [as.serializedManifest, period.serializedManifest];
    const templateEl = getInheritedElement('SegmentTemplate', hierarchy);

    let segmentInfo = {};
    if (templateEl) {
        const timescale = getAttr(templateEl, 'timescale');
        const duration = getAttr(templateEl, 'duration');
        segmentInfo = {
            timescale: timescale,
            duration: duration,
            startNumber: getAttr(templateEl, 'startNumber'),
            pto: getAttr(templateEl, 'presentationTimeOffset'),
            ato: getAttr(templateEl, 'availabilityTimeOffset'),
            usesTimeline:
                findChildren(templateEl, 'SegmentTimeline').length > 0,
            calculatedDuration:
                timescale && duration
                    ? `${(duration / timescale).toFixed(3)}s`
                    : 'N/A',
        };
    }

    const timingMetrics = [
        { name: 'Timescale', value: segmentInfo.timescale },
        { name: 'Segment Duration', value: segmentInfo.calculatedDuration },
        { name: 'Uses Timeline', value: segmentInfo.usesTimeline },
        {
            name: 'Segment Alignment',
            value:
                getAttr(as.serializedManifest, 'segmentAlignment') === 'true',
        },
        {
            name: 'Subsegment Alignment',
            value:
                getAttr(as.serializedManifest, 'subsegmentAlignment') ===
                'true',
        },
        {
            name: 'Bitstream Switching',
            value:
                getAttr(as.serializedManifest, 'bitstreamSwitching') === 'true',
        },
        {
            name: 'Start w/ SAP',
            value: getAttr(as.serializedManifest, 'startWithSAP'),
        },
        { name: 'Start Number', value: segmentInfo.startNumber },
        { name: 'Pres. Time Offset', value: segmentInfo.pto },
        { name: 'Avail. Time Offset', value: segmentInfo.ato },
    ].filter(
        (m) =>
            m.value !== 'N/A' &&
            m.value !== null &&
            m.value !== undefined &&
            m.value !== false
    );
    // --- End Data Extraction ---

    return html`
        <details
            class="bg-slate-900/50 rounded-lg border border-slate-700/50 details-animated"
            open
        >
            <summary
                class="flex items-center gap-3 p-2 cursor-pointer list-none hover:bg-slate-800/50 rounded-t-lg"
            >
                <span
                    class="text-slate-500 group-open:rotate-90 transition-transform"
                    >${icons.chevronDown}</span
                >
                <span class="text-teal-400"
                    >${getIconForType(as.contentType)}</span
                >
                <div class="font-semibold text-slate-300 text-sm">
                    AdaptationSet ${as.id || ''}
                    <span class="ml-2 font-mono text-xs text-slate-500"
                        >(Lang: ${as.lang || 'und'}, Type:
                        ${as.contentType || 'N/A'})</span
                    >
                </div>
            </summary>
            <div class="border-t border-slate-700/50 p-2 space-y-3">
                ${timingMetrics.length > 0
                    ? html`
                          <div
                              class="bg-slate-950/50 rounded p-3 border border-slate-600/50"
                          >
                              <h4
                                  class="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-2"
                              >
                                  ${icons.timer}
                                  <span>Timing & Segmentation Attributes</span>
                              </h4>
                              <dl
                                  class="grid gap-2 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]"
                              >
                                  ${timingMetrics.map(metricTemplate)}
                              </dl>
                          </div>
                      `
                    : ''}

                <!-- Representations -->
                <div class="space-y-2">
                    <h4
                        class="text-xs font-semibold text-slate-300 flex items-center gap-2 px-1"
                    >
                        ${icons.layers}
                        <span
                            >Representations
                            (${as.representations?.length || 0})</span
                        >
                    </h4>
                    ${as.representations.map((rep) =>
                        representationCardTemplate(rep, as, stream, period)
                    )}
                </div>
            </div>
        </details>
    `;
};
