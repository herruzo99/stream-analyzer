import { html } from 'lit-html';
import { eventBus } from '@/application/event-bus';
import { renderAdAvails } from '../shared/ad-renderer.js';

const renderRandomAccessPoints = (
    points,
    presentationDuration,
    mediaTimelineOffset
) => {
    if (!points || points.length === 0) return '';
    return points.map((point) => {
        const left =
            ((point.time - mediaTimelineOffset) / presentationDuration) * 100;
        if (left < 0 || left > 100) return '';
        return html`<div
            class="absolute top-1/2 -mt-1.5 w-3 h-3 bg-cyan-400 border border-cyan-200 transform rotate-45 z-20"
            style="left: calc(${left}% - 6px);"
            data-tooltip="Random Access Point (Sync Sample)
Time: ${point.time.toFixed(3)}s
MOOF Offset: ${point.moofOffset}"
        ></div>`;
    });
};

const renderEvents = (
    events,
    totalDuration,
    timelineStart = 0,
    adAvails = []
) => {
    if (!events || events.length === 0) return '';

    // Filter out SCTE-35 events that are already visualized as part of a resolved AdAvail
    const adAvailIds = new Set((adAvails || []).map((a) => a.id));
    const filteredEvents = events.filter(
        (e) =>
            !e.scte35 ||
            !adAvailIds.has(String(e.scte35.splice_command.splice_event_id))
    );

    return filteredEvents.map((event) => {
        const startTime = event.startTime;
        const duration = event.duration;

        const left = ((startTime - timelineStart) / totalDuration) * 100;
        const width = (duration / totalDuration) * 100;

        if (left < 0 || left > 100) return '';

        let tooltipContent;
        let eventClasses = 'bg-yellow-500/50 border-l-2 border-yellow-400';
        let clickHandler = () => {};

        if (event.scte35 && !event.scte35.error) {
            const cmd = event.scte35.splice_command;
            const desc = event.scte35.descriptors?.[0];
            eventClasses =
                'bg-purple-500/60 border-l-4 border-purple-400 cursor-pointer hover:ring-2 hover:ring-purple-300';
            let details = '';
            if (cmd.type === 'Splice Insert' && cmd.break_duration) {
                details = `Break Duration: ${(
                    cmd.break_duration.duration / 90000
                ).toFixed(3)}s`;
            } else if (cmd.type === 'Time Signal' && desc) {
                details = `Type: ${
                    desc.segmentation_type_id
                }\nUPID: ${desc.segmentation_upid || 'N/A'}`;
            }

            tooltipContent = `SCTE-35: ${cmd.type}\nTime: ${startTime.toFixed(
                3
            )}s\n${details}\n(Click for full details)`;
            clickHandler = () =>
                eventBus.dispatch('ui:show-scte35-details', {
                    scte35: event.scte35,
                    startTime,
                });
        } else {
            tooltipContent = `Event: ${event.message}\nTime: ${startTime.toFixed(
                2
            )}s\nDuration: ${duration.toFixed(2)}s`;
        }

        return html`<div
            class="absolute top-0 h-full ${eventClasses} z-10"
            style="left: ${left}%; width: ${Math.max(0.2, width)}%;"
            data-tooltip="${tooltipContent}"
            @click=${clickHandler}
        ></div>`;
    });
};

const dashAbrLadderTemplate = (representations) => {
    if (representations.length === 0) return '';

    const reps = [...representations].sort((a, b) => a.bandwidth - b.bandwidth);
    const maxBw = Math.max(...reps.map((r) => r.bandwidth || 0));

    return html`
        <div class="bg-gray-900 p-4 rounded-md mt-4">
            <div class="space-y-2">
                ${reps.map((rep) => {
                    const widthPercentage =
                        ((rep.bandwidth || 0) / maxBw) * 100;
                    return html` <div class="flex items-center">
                        <div
                            class="w-28 text-xs text-gray-400 font-mono shrink-0"
                            title="Resolution: ${rep.resolution}"
                        >
                            ID: ${rep.id}
                        </div>
                        <div class="w-full bg-gray-700 rounded-full h-5">
                            <div
                                class="bg-blue-600 h-5 rounded-full text-xs font-medium text-blue-100 text-center p-0.5 leading-none"
                                style="width: ${widthPercentage}%"
                            >
                                ${rep.bandwidth
                                    ? (rep.bandwidth / 1000).toFixed(0) +
                                      ' kbps'
                                    : 'N/A'}
                            </div>
                        </div>
                    </div>`;
                })}
            </div>
        </div>
    `;
};

const timelineGridTemplate = (switchingSet) => {
    const { presentationDuration, mediaDuration, representations } =
        switchingSet;
    if (presentationDuration === 0)
        return html`<p class="text-gray-400 text-sm">
            Cannot render timeline: Total duration is zero or unknown.
        </p>`;

    const allEvents = representations.flatMap((r) => r.events || []);
    const allFragments = representations.flatMap((r) => r.fragments || []);
    const utcTimes = allFragments.map((f) => f.startTimeUTC).filter((t) => t);
    const hasUtcTimes = utcTimes.length > 0;
    const minUtcTime = hasUtcTimes ? Math.min(...utcTimes) : 0;
    const maxUtcTime = hasUtcTimes ? Math.max(...utcTimes) : 0;

    const mediaTimelineOffset = representations[0]?.mediaTimelineOffset || 0;

    return html`
        <div class="mt-8">
            <h4 class="text-lg font-bold">Switching Set: ${switchingSet.id}</h4>
            <div class="bg-gray-900 rounded-lg p-4 mt-2 relative">
                ${renderAdAvails(
                    switchingSet.adAvails,
                    presentationDuration,
                    mediaTimelineOffset
                )}
                ${renderEvents(
                    allEvents,
                    presentationDuration,
                    0,
                    switchingSet.adAvails
                )}
                ${representations.map(
                    (rep) => html`
                        <div class="flex items-center mb-1 relative">
                            <div
                                class="w-32 text-xs text-gray-400 font-mono shrink-0 pr-2 text-right"
                                title="Resolution: ${rep.resolution}"
                            >
                                Rep ID: ${rep.id}
                            </div>
                            <div
                                class="w-full h-8 bg-gray-700/50 rounded flex items-center relative"
                            >
                                ${renderRandomAccessPoints(
                                    rep.randomAccessPoints,
                                    presentationDuration,
                                    mediaTimelineOffset
                                )}
                                ${rep.fragments
                                    ? rep.fragments.map((frag) => {
                                          const hasChunks =
                                              frag.chunks &&
                                              frag.chunks.length > 0;
                                          return html`
                                              <div
                                                  class="h-full bg-gray-600 border-r border-gray-800 relative flex"
                                                  style="width: ${(frag.duration /
                                                      presentationDuration) *
                                                  100}%;"
                                                  data-tooltip="Segment #${frag.number}
Presentation Time: ${frag.presentationStartTime.toFixed(2)}s - ${(
                                                      frag.presentationStartTime +
                                                      frag.duration
                                                  ).toFixed(2)}s
Media Time: ${frag.mediaStartTime.toFixed(2)}s
Duration: ${frag.duration.toFixed(2)}s"
                                              >
                                                  ${hasChunks
                                                      ? frag.chunks.map(
                                                            (chunk) => html`
                                                                <div
                                                                    class="h-full bg-blue-500/40 border-r border-blue-900/50"
                                                                    style="width: ${(chunk.duration /
                                                                        frag.duration) *
                                                                    100}%"
                                                                    data-tooltip="${chunk.tooltip}"
                                                                ></div>
                                                            `
                                                        )
                                                      : ''}
                                              </div>
                                          `;
                                      })
                                    : html`<div
                                          class="w-full h-full bg-red-900/50 text-red-300 text-xs flex items-center justify-center p-2"
                                      >
                                          ${rep.error}
                                      </div>`}
                            </div>
                        </div>
                    `
                )}
            </div>
            <div
                class="text-xs text-gray-400 mt-2 flex justify-between font-semibold"
            >
                <span>0.00s</span>
                <span>Presentation Time</span>
                <span>${presentationDuration.toFixed(2)}s</span>
            </div>
            ${mediaTimelineOffset > 0
                ? html`<div
                      class="text-xs text-gray-500 mt-1 flex justify-between"
                  >
                      <span>${mediaTimelineOffset.toFixed(2)}s</span>
                      <span>Media Time</span>
                      <span
                          >${(mediaTimelineOffset + mediaDuration).toFixed(
                              2
                          )}s</span
                      >
                  </div>`
                : ''}
            ${hasUtcTimes
                ? html`<div
                      class="text-xs text-gray-500 mt-1 flex justify-between"
                  >
                      <span>${new Date(minUtcTime).toLocaleTimeString()}</span>
                      <span>Wall-Clock Time (UTC)</span>
                      <span>${new Date(maxUtcTime).toLocaleTimeString()}</span>
                  </div>`
                : ''}
            ${dashAbrLadderTemplate(representations)}
        </div>
    `;
};

export function dashTimelineTemplate(timelineViewModel) {
    if (!timelineViewModel) {
        return html`<div class="text-center py-8 text-gray-400">
            Loading timeline data...
        </div>`;
    }
    if (timelineViewModel.length === 0) {
        return html`<div class="text-center py-8 text-gray-400">
            No video switching sets with segment indexes found to build
            timeline.
        </div>`;
    }

    return html`
        <h3 class="text-xl font-bold mb-4">
            CMAF Timeline & Fragment Alignment
        </h3>
        ${timelineViewModel.map(timelineGridTemplate)}
    `;
}
