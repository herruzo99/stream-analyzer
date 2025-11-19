import { html } from 'lit-html';
import { timingInfoTemplate } from './timing-info.js';
import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';
import {
    getInheritedElement,
    getAttr,
    findChildren,
} from '../../../../../infrastructure/parsing/utils/recursive-parser.js';

const infoItem = (label, value, valueClass = 'text-slate-200') => {
    if (value === undefined || value === null || value === '') return '';
    return html`
        <div
            class="flex items-baseline gap-x-2 min-w-0"
            title="${label}: ${value}"
        >
            <span class="text-slate-400 font-medium shrink-0">${label}:</span>
            <span class="font-mono ${valueClass} truncate">${value}</span>
        </div>
    `;
};

export const representationCardTemplate = (rep, as, stream, period) => {
    const hierarchy = [
        rep.serializedManifest,
        as.serializedManifest,
        period.serializedManifest,
    ];

    let segmentInfo = { type: 'unknown' };
    const templateEl = getInheritedElement('SegmentTemplate', hierarchy);
    const listEl = getInheritedElement('SegmentList', hierarchy);
    const baseEl = getInheritedElement('SegmentBase', hierarchy);
    const baseUrlEl = findChildren(rep.serializedManifest, 'BaseURL')[0];

    if (templateEl) {
        const timescale = getAttr(templateEl, 'timescale');
        const duration = getAttr(templateEl, 'duration');
        segmentInfo = {
            type: 'SegmentTemplate',
            template: getAttr(templateEl, 'media'),
            duration: duration,
            timescale: timescale,
            startNumber: getAttr(templateEl, 'startNumber'),
            pto: getAttr(templateEl, 'presentationTimeOffset'),
            ato: getAttr(templateEl, 'availabilityTimeOffset'),
            usesTimeline:
                findChildren(templateEl, 'SegmentTimeline').length > 0,
            calculatedDuration:
                timescale && duration
                    ? `${(duration / timescale).toFixed(3)}s`
                    : 'N/A',
            initialization: getAttr(templateEl, 'initialization')
                ? { template: getAttr(templateEl, 'initialization') }
                : null,
        };
    } else if (listEl) {
        const initEl = findChildren(listEl, 'Initialization')[0];
        segmentInfo = {
            type: 'SegmentList',
            duration: getAttr(listEl, 'duration'),
            timescale: getAttr(listEl, 'timescale'),
            segmentURLs: findChildren(listEl, 'SegmentURL').map((el) => ({
                media: getAttr(el, 'media'),
                mediaRange: getAttr(el, 'mediaRange'),
            })),
            initialization: initEl
                ? {
                      url: getAttr(initEl, 'sourceURL'),
                      range: getAttr(initEl, 'range'),
                  }
                : null,
        };
    } else if (baseEl) {
        const initEl = findChildren(baseEl, 'Initialization')[0];
        segmentInfo = {
            type: 'SegmentBase',
            timescale: getAttr(baseEl, 'timescale'),
            indexRange: getAttr(baseEl, 'indexRange'),
            initialization: initEl ? { range: getAttr(initEl, 'range') } : null,
            inferredDuration: period.duration || stream.manifest.duration,
        };
    } else if (baseUrlEl) {
        segmentInfo = {
            type: 'BaseURL',
            url: baseUrlEl['#text'],
            inferredDuration: period.duration || stream.manifest.duration,
        };
    }

    const resolutionText =
        rep.width?.value && rep.height?.value
            ? `${rep.width.value}x${rep.height.value}`
            : '';

    return html`
        <details
            class="bg-slate-800/80 rounded-lg border border-slate-600/80 details-animated"
            open
        >
            <summary
                class="flex items-center gap-4 p-2 cursor-pointer list-none hover:bg-slate-700/80"
            >
                <span
                    class="text-slate-500 group-open:rotate-90 transition-transform"
                    >${icons.chevronDown}</span
                >
                <span class="text-slate-400 shrink-0">${icons.binary}</span>
                <div class="font-semibold text-slate-300 text-xs shrink-0">
                    ID: ${rep.id}
                </div>
                <div
                    class="flex items-baseline gap-x-4 gap-y-1 text-xs ml-auto shrink min-w-0"
                >
                    ${infoItem('Bitrate', formatBitrate(rep.bandwidth))}
                    ${infoItem('Resolution', resolutionText)}
                    <span
                        class="text-xs font-semibold px-2 py-1 rounded-full bg-amber-800 text-amber-200 shrink-0"
                        >${segmentInfo.type}</span
                    >
                </div>
            </summary>

            <div class="border-t border-slate-600/80 p-3">
                ${timingInfoTemplate(segmentInfo)}
            </div>
        </details>
    `;
};
