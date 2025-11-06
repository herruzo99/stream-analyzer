import { html } from 'lit-html';
import { cmafValidationSummaryTemplate } from './components/cmaf.js';
import { dashComplianceSummaryTemplate } from './components/dash-compliance.js';
import { dashStructureTemplate } from './components/dash-structure.js';
import { statCardTemplate } from './components/shared.js';
import {
    findChildrenRecursive,
    getAttr,
} from '@/infrastructure/parsing/dash/recursive-parser';
import * as icons from '@/ui/icons';
import { streamHeaderTemplate } from './components/stream-header.js';
import '@/features/comparison/ui/components/abr-ladder-chart.js';

const programInfoTemplate = (stream) => {
    const programInfo = stream.manifest.programInformations?.[0];
    if (
        !programInfo ||
        (!programInfo.title && !programInfo.source && !programInfo.copyright)
    ) {
        return '';
    }

    return html`
        <div>
            <h3 class="text-xl font-bold mb-4 text-slate-100">
                Program Information
            </h3>
            <div
                class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]"
            >
                ${statCardTemplate({
                    label: 'Title',
                    value: programInfo.title,
                    icon: icons.film,
                })}
                ${statCardTemplate({
                    label: 'Source',
                    value: programInfo.source,
                    icon: icons.server,
                })}
            </div>
        </div>
    `;
};

export function getDashSummaryTemplate(stream) {
    const summary = stream.manifest.summary;
    const isLive = stream.manifest.type === 'dynamic';
    const utcTimingEl = findChildrenRecursive(
        stream.manifest.serializedManifest,
        'UTCTiming'
    )[0];
    const utcTimingValue = utcTimingEl
        ? `${getAttr(utcTimingEl, 'schemeIdUri')?.split(':').pop()} @ ${getAttr(
              utcTimingEl,
              'value'
          )}`
        : null;

    const allVideoReps = stream.manifest.periods
        .flatMap((p) => p.adaptationSets)
        .filter((as) => as.contentType === 'video')
        .flatMap((as) => as.representations);

    const abrLadderData = [
        {
            name: stream.name,
            tracks: allVideoReps
                .map((rep) => ({
                    width: rep.width.value,
                    height: rep.height.value,
                    bandwidth: rep.bandwidth,
                }))
                .filter((t) => t.width && t.height && t.bandwidth),
        },
    ];

    return html`
        <div class="space-y-8">
            ${streamHeaderTemplate(stream)} ${programInfoTemplate(stream)}
            <div>
                <h3 class="text-xl font-bold mb-4 text-slate-100">
                    General Properties
                </h3>
                <dl
                    class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]"
                >
                    ${statCardTemplate({
                        label: 'Stream Type',
                        value: summary.general.streamType,
                        tooltip:
                            'Indicates if the stream is live or on-demand.',
                        isoRef: 'DASH: 5.3.1.2',
                        customClasses: `border-l-4 ${
                            isLive ? 'border-danger' : 'border-info'
                        }`,
                        icon: isLive ? icons.play : icons.fileText,
                        iconBgClass: isLive
                            ? 'bg-red-900/30 text-red-300'
                            : 'bg-blue-900/30 text-blue-300',
                    })}
                    ${statCardTemplate({
                        label: 'Container Format',
                        value: summary.general.segmentFormat,
                        tooltip: 'The container format for media segments.',
                        isoRef: 'DASH: 5.3.7',
                        icon: icons.box,
                    })}
                    ${statCardTemplate({
                        label: 'Media Duration',
                        value: summary.general.duration
                            ? `${summary.general.duration.toFixed(2)}s`
                            : null,
                        tooltip: 'The total duration of the content.',
                        isoRef: 'DASH: 5.3.1.2',
                        icon: icons.timer,
                    })}
                    ${statCardTemplate({
                        label: 'Max Segment Duration',
                        value: summary.dash.maxSegmentDuration
                            ? `${summary.dash.maxSegmentDuration.toFixed(2)}s`
                            : null,
                        tooltip:
                            'The maximum duration of any segment in the presentation.',
                        isoRef: 'DASH: 5.3.1.2',
                        icon: icons.timer,
                    })}
                    ${isLive
                        ? statCardTemplate({
                              label: 'DVR Window',
                              value: summary.dash.timeShiftBufferDepth
                                  ? `${summary.dash.timeShiftBufferDepth.toFixed(
                                        2
                                    )}s`
                                  : null,
                              tooltip:
                                  'The duration of the time-shifting buffer (DVR window).',
                              isoRef: 'DASH: 5.3.1.2',
                              icon: icons.history,
                          })
                        : ''}
                    ${isLive
                        ? statCardTemplate({
                              label: 'Min Update Period',
                              value: summary.dash.minimumUpdatePeriod
                                  ? `${summary.dash.minimumUpdatePeriod.toFixed(
                                        2
                                    )}s`
                                  : null,
                              tooltip:
                                  'Minimum time a client should wait before requesting an updated MPD.',
                              isoRef: 'DASH: 5.3.1.2',
                              icon: icons.updates,
                          })
                        : ''}
                    ${isLive
                        ? statCardTemplate({
                              label: 'UTC Timing Source',
                              value: utcTimingValue,
                              tooltip:
                                  'Provides a clock synchronization source for clients.',
                              isoRef: 'DASH: 5.8.4.11',
                              icon: icons.clock,
                          })
                        : ''}
                </dl>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                ${dashComplianceSummaryTemplate(stream)}
                ${cmafValidationSummaryTemplate(stream)}
                <div class="md:col-span-2">
                    <h3 class="text-xl font-bold mb-4 text-slate-100">
                        ABR Bitrate Ladder
                    </h3>
                    <div
                        class="bg-slate-800 p-4 rounded-lg border border-slate-700 h-80"
                    >
                        <abr-ladder-chart
                            .data=${abrLadderData}
                        ></abr-ladder-chart>
                    </div>
                </div>
            </div>

            ${dashStructureTemplate(summary)}
        </div>
    `;
}