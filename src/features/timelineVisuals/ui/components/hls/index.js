import { html } from 'lit-html';
import { eventBus } from '@/application/event-bus';
import { renderAdAvails } from '../shared/ad-renderer.js';

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
            !adAvailIds.has(e.scte35.descriptors?.[0]?.segmentation_event_id)
    );

    return filteredEvents.map((event) => {
        const left = (event.startTime / totalDuration) * 100;
        const width = (event.duration / totalDuration) * 100;
        const isInterstitial = event.message
            .toLowerCase()
            .includes('interstitial');

        let eventClasses = isInterstitial
            ? 'bg-purple-500/60 border-l-4 border-purple-400'
            : 'bg-yellow-500/50 border-l-2 border-yellow-400';

        let tooltipContent;
        let clickHandler = () => {};

        if (event.scte35 && !event.scte35.error) {
            const cmd = event.scte35.splice_command;
            const desc = event.scte35.descriptors?.[0];
            eventClasses =
                'bg-purple-500/60 border-l-4 border-purple-400 cursor-pointer hover:ring-2 hover:ring-purple-300';

            let details = `Cue: ${event.cue || 'N/A'}`;
            if (cmd.type === 'Splice Insert' && cmd.break_duration) {
                details = `Break Duration: ${(
                    cmd.break_duration.duration / 90000
                ).toFixed(3)}s`;
            } else if (cmd.type === 'Time Signal' && desc) {
                details = `Type: ${
                    desc.segmentation_type_id
                }\nUPID: ${desc.segmentation_upid || 'N/A'}`;
            }

            tooltipContent = `SCTE-35: ${cmd.type}\nStart: ${event.startTime.toFixed(
                3
            )}s\n${details}\n(Click for full details)`;
            clickHandler = () =>
                eventBus.dispatch('ui:show-scte35-details', {
                    scte35: event.scte35,
                    startTime: event.startTime,
                });
        } else {
            const title = isInterstitial
                ? `Interstitial Ad: ${event.message}`
                : event.message;

            tooltipContent = `${title}\nStart: ${event.startTime.toFixed(
                2
            )}s\nDuration: ${event.duration.toFixed(2)}s${
                event.cue ? `\nCue: ${event.cue}` : ''
            }`;
        }

        return html`<div
            class="absolute top-0 bottom-0 ${eventClasses}"
            style="left: ${left}%; width: ${width}%;"
            data-tooltip="${tooltipContent}"
            @click=${clickHandler}
        ></div>`;
    });
};

const hlsAbrLadderTemplate = (manifest) => {
    const videoReps = manifest.periods
        .flatMap((p) => p.adaptationSets)
        .filter((as) => as.contentType === 'video')
        .flatMap((as) => as.representations)
        .sort((a, b) => a.bandwidth - b.bandwidth);

    if (videoReps.length === 0) return html``;

    const maxBw = Math.max(...videoReps.map((r) => r.bandwidth));

    const repTemplate = videoReps.map((rep) => {
        const bw = rep.bandwidth;
        const widthPercentage = (bw / maxBw) * 100;
        const resolutionText =
            rep.width?.value && rep.height?.value
                ? `${rep.width.value}x${rep.height.value}`
                : 'Audio Only';
        const codecs = rep.codecs?.value || 'N/A';

        return html`
            <div class="flex items-center" title="Codecs: ${codecs}">
                <div class="w-28 text-xs text-gray-400 font-mono shrink-0">
                    ${resolutionText}
                </div>
                <div class="w-full bg-gray-700 rounded-full h-5">
                    <div
                        class="bg-blue-600 h-5 rounded-full text-xs font-medium text-blue-100 text-center p-0.5 leading-none"
                        style="width: ${widthPercentage}%"
                    >
                        ${(bw / 1000).toFixed(0)} kbps
                    </div>
                </div>
            </div>
        `;
    });

    return html`
        <div class="mt-6">
            <h4 class="text-lg font-bold">ABR Bitrate Ladder</h4>
            <div class="bg-gray-900 p-4 rounded-md mt-4 space-y-2">
                ${repTemplate}
            </div>
        </div>
    `;
};

const masterPlaylistSummaryTemplate = (manifest) => {
    const { periods } = manifest;
    const adaptationSets = periods.flatMap((p) => p.adaptationSets);
    const videoVariants = adaptationSets
        .filter((as) => as.contentType === 'video')
        .reduce((sum, as) => sum + as.representations.length, 0);
    const audioRenditions = adaptationSets.filter(
        (as) => as.contentType === 'audio'
    ).length;
    const subtitleRenditions = adaptationSets.filter(
        (as) => as.contentType === 'text' || as.contentType === 'application'
    ).length;

    const statCard = (label, value) => html`
        <div class="bg-gray-900 p-3 rounded-lg border border-gray-700">
            <dt class="text-sm font-medium text-gray-400">${label}</dt>
            <dd class="text-lg font-mono text-white mt-1">${value}</dd>
        </div>
    `;

    return html`
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            ${statCard('Variant Streams', videoVariants)}
            ${statCard('Audio Renditions', audioRenditions)}
            ${statCard('Subtitle Renditions', subtitleRenditions)}
        </div>
    `;
};

const vodTimelineTemplate = (manifest) => {
    const segments = manifest.segments || [];
    const totalDuration = manifest.duration;

    if (totalDuration === 0 || segments.length === 0)
        return html`<p class="info">
            No segments found or total duration is zero.
        </p>`;

    const gridTemplateColumns = segments
        .map((s) => `${(s.duration / totalDuration) * 100}%`)
        .join(' ');

    const timelineSegments = segments.map((seg, index) => {
        const isDiscontinuity = seg.discontinuity;
        const tooltipContent = `Segment #${
            (manifest.mediaSequence || 0) + index
        }\nDuration: ${seg.duration.toFixed(3)}s${
            isDiscontinuity ? '\n(Discontinuity)' : ''
        }${
            seg.dateTime ? `\nPDT: ${new Date(seg.dateTime).toISOString()}` : ''
        }`;

        return html`
            <div
                class="bg-gray-700 rounded h-10 border-r-2 ${isDiscontinuity
                    ? 'border-l-4 border-l-yellow-400'
                    : 'border-gray-900'} last:border-r-0"
                data-tooltip="${tooltipContent}"
            ></div>
        `;
    });

    return html`
        <h3 class="text-xl font-bold mb-4">Timeline Visualization</h3>
        <div class="bg-gray-900 rounded-lg p-2 relative">
            <div
                class="grid grid-flow-col auto-cols-fr"
                style="grid-template-columns: ${gridTemplateColumns}"
            >
                ${timelineSegments}
            </div>
            ${renderAdAvails(manifest.adAvails, totalDuration)}
            ${renderEvents(
                manifest.events,
                totalDuration,
                0,
                manifest.adAvails
            )}
        </div>
        <div class="text-xs text-gray-400 mt-2 text-right">
            Total Duration: ${totalDuration.toFixed(2)}s
        </div>
    `;
};

const liveTimelineTemplate = (manifest) => {
    const segments = manifest.segments || [];
    const targetDuration = manifest.targetDuration || 10;
    const liveWindowSegments = segments.slice(-3 * targetDuration); // Show roughly 3x target duration
    const windowDuration = liveWindowSegments.reduce(
        (sum, seg) => sum + seg.duration,
        0
    );

    const partHoldBack = manifest.serverControl?.['PART-HOLD-BACK'];
    const holdBackPosition =
        partHoldBack != null && windowDuration > 0
            ? 100 - (partHoldBack / windowDuration) * 100
            : null;

    const preloadHint = manifest.preloadHints?.find((h) => h.TYPE === 'PART');
    const preloadDuration = preloadHint?.DURATION || 0;
    const preloadWidth = (preloadDuration / windowDuration) * 100;

    return html`
        <h3 class="text-xl font-bold mb-4">Live Timeline Visualization</h3>
        <div class="bg-gray-900 rounded-lg p-4 text-center">
            <div
                class="flex items-center justify-between text-sm text-gray-400 mb-2"
            >
                <span
                    >Segments in Playlist:
                    <strong>${segments.length}</strong></span
                >
                <span
                    >Target Duration: <strong>${targetDuration}s</strong></span
                >
                <span
                    >Current Window Duration:
                    <strong>${windowDuration.toFixed(2)}s</strong></span
                >
            </div>
            <div class="bg-gray-800 p-2 rounded relative">
                <div
                    class="grid grid-flow-col auto-cols-fr h-10"
                    style="grid-template-columns: ${liveWindowSegments
                        .map((s) => `${(s.duration / windowDuration) * 100}%`)
                        .join(' ')}"
                >
                    ${liveWindowSegments.map(
                        (seg, i) =>
                            html`<div
                                class="bg-gray-700/50 border-r border-gray-900 flex"
                                data-tooltip="Segment Duration: ${seg.duration.toFixed(
                                    2
                                )}s"
                            >
                                ${seg.parts.map(
                                    (part) => html`
                                        <div
                                            class="h-full bg-blue-800/60 border-r border-gray-700"
                                            style="width: ${(part.DURATION /
                                                seg.duration) *
                                            100}%"
                                            data-tooltip="Partial Segment
Duration: ${part.DURATION.toFixed(3)}s
Independent: ${part.INDEPENDENT === 'YES' ? 'Yes' : 'No'}"
                                        ></div>
                                    `
                                )}
                            </div>`
                    )}
                </div>
                ${renderAdAvails(manifest.adAvails, windowDuration)}
                ${renderEvents(
                    manifest.events,
                    windowDuration,
                    0,
                    manifest.adAvails
                )}
                ${preloadHint
                    ? html`
                          <div
                              class="absolute top-0 right-0 h-full bg-blue-500/20 border-l-2 border-dashed border-blue-400"
                              style="width: ${preloadWidth}%; transform: translateX(100%);"
                              data-tooltip="Preload Hint: ${preloadHint.URI}
Duration: ${preloadDuration}s"
                          ></div>
                      `
                    : ''}
                ${holdBackPosition !== null
                    ? html`<div
                          class="absolute top-0 bottom-0 w-0.5 bg-cyan-400"
                          style="left: ${holdBackPosition}%;"
                          data-tooltip="Server Recommended Playback Position (PART-HOLD-BACK: ${partHoldBack}s)"
                      ></div>`
                    : ''}
                <div
                    class="absolute right-0 top-0 bottom-0 w-1 bg-red-500 rounded-full"
                    data-tooltip="Approximate Live Edge"
                ></div>
            </div>
        </div>
    `;
};

export function hlsTimelineTemplate(manifest) {
    if (manifest.isMaster) {
        return html`
            <h3 class="text-xl font-bold mb-4">HLS Master Playlist</h3>
            <p class="text-sm text-gray-400 mb-4">
                A master playlist defines available variants but does not have a
                monolithic timeline.
            </p>
            ${masterPlaylistSummaryTemplate(manifest)}
            ${hlsAbrLadderTemplate(manifest)}
        `;
    }

    if (manifest.type === 'dynamic') {
        return liveTimelineTemplate(manifest);
    }

    // Fallback to VOD Media Playlist
    return vodTimelineTemplate(manifest);
}
