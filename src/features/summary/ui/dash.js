import { html } from 'lit-html';
import { cmafValidationSummaryTemplate } from './components/cmaf.js';
import { dashComplianceSummaryTemplate } from './components/dash-compliance.js';
import { dashStructureTemplate } from './components/dash-structure.js';
import { statCardTemplate, listCardTemplate } from './components/shared.js';
import { useAnalysisStore } from '@/state/analysisStore';
import { findChildrenRecursive, getAttr } from '@/infrastructure/parsing/dash/recursive-parser';

const programInfoTemplate = (stream) => {
    const programInfo = stream.manifest.programInformations?.[0];
    if (!programInfo || (!programInfo.title && !programInfo.source && !programInfo.copyright)) {
        return '';
    }

    return html`
        <div class="mb-8 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
            <h3 class="text-xl font-bold mb-3">Program Information</h3>
            <dl class="grid gap-x-4 gap-y-2 grid-cols-[auto_1fr] text-sm">
                ${programInfo.title ? html`<dt class="text-zinc-400 font-semibold">Title:</dt><dd class="text-zinc-200">${programInfo.title}</dd>` : ''}
                ${programInfo.source ? html`<dt class="text-zinc-400 font-semibold">Source:</dt><dd class="text-zinc-200">${programInfo.source}</dd>` : ''}
                ${programInfo.copyright ? html`<dt class="text-zinc-400 font-semibold">Copyright:</dt><dd class="text-zinc-200">${programInfo.copyright}</dd>` : ''}
            </dl>
        </div>
    `;
};

export function getDashSummaryTemplate(stream) {
    const summary = stream.manifest.summary;
    const isLive = stream.manifest.type === 'dynamic';
    const utcTimingEl = findChildrenRecursive(stream.manifest.serializedManifest, 'UTCTiming')[0];
    const utcTimingValue = utcTimingEl ? `${getAttr(utcTimingEl, 'schemeIdUri')?.split(':').pop()} @ ${getAttr(utcTimingEl, 'value')}` : null;

    return html`
        <div class="space-y-8">
            ${programInfoTemplate(stream)}
            <div>
                <h3 class="text-xl font-bold mb-4">General Properties</h3>
                <dl class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                    ${statCardTemplate({
                        label: 'Stream Type',
                        value: summary.general.streamType,
                        tooltip: 'Indicates if the stream is live or on-demand.',
                        isoRef: 'DASH: 5.3.1.2',
                        customClasses: `border-l-4 ${isLive ? 'border-danger' : 'border-info'}`,
                    })}
                    ${statCardTemplate({
                        label: 'Container Format',
                        value: summary.general.segmentFormat,
                        tooltip: 'The container format for media segments.',
                        isoRef: 'DASH: 5.3.7',
                    })}
                    ${statCardTemplate({
                        label: 'Media Duration',
                        value: summary.general.duration ? `${summary.general.duration.toFixed(2)}s` : null,
                        tooltip: 'The total duration of the content.',
                        isoRef: 'DASH: 5.3.1.2',
                    })}
                    ${statCardTemplate({
                        label: 'Max Segment Duration',
                        value: summary.dash.maxSegmentDuration ? `${summary.dash.maxSegmentDuration.toFixed(2)}s` : null,
                        tooltip: 'The maximum duration of any segment in the presentation.',
                        isoRef: 'DASH: 5.3.1.2',
                    })}
                    ${isLive ? statCardTemplate({
                        label: 'DVR Window',
                        value: summary.dash.timeShiftBufferDepth ? `${summary.dash.timeShiftBufferDepth.toFixed(2)}s` : null,
                        tooltip: 'The duration of the time-shifting buffer (DVR window).',
                        isoRef: 'DASH: 5.3.1.2',
                    }) : ''}
                    ${isLive ? statCardTemplate({
                        label: 'Min Update Period',
                        value: summary.dash.minimumUpdatePeriod ? `${summary.dash.minimumUpdatePeriod.toFixed(2)}s` : null,
                        tooltip: 'Minimum time a client should wait before requesting an updated MPD.',
                        isoRef: 'DASH: 5.3.1.2',
                    }) : ''}
                    ${isLive ? statCardTemplate({
                        label: 'UTC Timing Source',
                        value: utcTimingValue,
                        tooltip: 'Provides a clock synchronization source for clients.',
                        isoRef: 'DASH: 5.8.4.11',
                    }) : ''}
                </dl>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                ${dashComplianceSummaryTemplate(stream)}
                ${cmafValidationSummaryTemplate(stream)}
            </div>

            ${dashStructureTemplate(summary)}
        </div>
    `;
}