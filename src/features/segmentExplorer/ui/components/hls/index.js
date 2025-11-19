import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { segmentTableTemplate } from '../../components/segment-table.js';
import { useUiStore } from '@/state/uiStore';
import { formatBitrate } from '@/ui/shared/format';

let liveSegmentHighlighterInterval = null;

export function startLiveSegmentHighlighter(container, stream) {
    stopLiveSegmentHighlighter();

    const updateHighlights = () => {
        if (!container || container.offsetParent === null) {
            stopLiveSegmentHighlighter();
            return;
        }

        const now = Date.now();
        const liveClass = 'bg-green-700/50';
        const staleClass = 'text-gray-500',
            opacityClass = 'opacity-50';

        const rows = container.querySelectorAll('.segment-row');
        rows.forEach((row) => {
            const tr = /** @type {HTMLElement} */ (row);
            const startTime = parseInt(tr.dataset.startTime, 10);
            const endTime = parseInt(tr.dataset.endTime, 10);

            tr.classList.remove(liveClass, staleClass, opacityClass);
            if (!startTime || !endTime) return;

            if (now >= startTime && now < endTime) {
                tr.classList.add(liveClass);
            } else if (now > endTime + 30000) {
                tr.classList.add(staleClass, opacityClass);
            }
        });
    };

    liveSegmentHighlighterInterval = setInterval(updateHighlights, 1000);
}

export function stopLiveSegmentHighlighter() {
    if (liveSegmentHighlighterInterval) {
        clearInterval(liveSegmentHighlighterInterval);
        liveSegmentHighlighterInterval = null;
    }
}

const renderHlsRendition = (stream, renditionInfo, contentType) => {
    const { title, id: variantId, isMuxed } = renditionInfo;
    const { segmentExplorerSortOrder } = useUiStore.getState();

    if (isMuxed) {
        return html`
            <div class="bg-gray-800 rounded-lg border border-gray-700 mt-2">
                <div
                    class="flex items-center p-2 bg-gray-900/50 border-b border-gray-700"
                >
                    <div class="grow flex items-center gap-2">
                        <span class="font-semibold text-gray-200"
                            >${unsafeHTML(title)}</span
                        >
                        <span
                            class="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-600 text-gray-300"
                            >MUXED</span
                        >
                    </div>
                </div>
                <div class="p-4 text-center text-gray-400 text-sm">
                    This audio track is muxed with the video streams and does
                    not have a separate playlist.
                </div>
            </div>
        `;
    }

    const variantState = stream.hlsVariantState.get(variantId);
    if (!variantState) return html``;

    const {
        segments: rawSegments,
        error,
        isLoading,
        currentSegmentUrls,
        newlyAddedSegmentUrls,
    } = variantState;

    const segments = rawSegments || [];
    const mediaPlaylist = stream.mediaPlaylists.get(variantId);
    const mediaSequence = mediaPlaylist?.manifest?.mediaSequence || 0;

    let pdtAnchorTime = 0;
    let pdtMediaTime = 0;

    const allSegments = segments.map((seg, index) => {
        const segmentTime = seg.time || 0;
        const segmentDuration = seg.duration || 0;
        const timescale = seg.timescale || 90000;

        if (seg.dateTime) {
            pdtAnchorTime = new Date(seg.dateTime).getTime();
            pdtMediaTime = segmentTime; // This is now in timescale units
        }

        let startTimeUTC = 0;
        if (pdtAnchorTime > 0) {
            const timeDeltaInSeconds = (segmentTime - pdtMediaTime) / timescale;
            startTimeUTC = pdtAnchorTime + timeDeltaInSeconds * 1000;
        }

        const segmentDurationInSeconds = segmentDuration / timescale;
        const endTimeUTC =
            startTimeUTC > 0
                ? startTimeUTC + segmentDurationInSeconds * 1000
                : 0;

        return {
            ...seg,
            repId: variantId,
            number: mediaSequence + index,
            time: segmentTime,
            duration: segmentDuration,
            timescale: timescale,
            startTimeUTC: startTimeUTC || 0,
            endTimeUTC: endTimeUTC || 0,
        };
    });

    let processedSegments = [...allSegments];

    processedSegments.sort((a, b) => {
        const order = segmentExplorerSortOrder === 'asc' ? 1 : -1;
        return (a.number - b.number) * order;
    });

    return segmentTableTemplate({
        id: variantId.replace(/[^a-zA-Z0-9]/g, '-'),
        rawId: variantId,
        title: title,
        contentType: contentType,
        segments: processedSegments,
        stream: stream,
        currentSegmentUrls,
        newlyAddedSegmentUrls,
        segmentFormat: stream.manifest.segmentFormat,
        isLoading,
        error,
    });
};

export function getHlsExplorerForType(stream, contentType) {
    if (stream.manifest.isMaster) {
        let itemsToRender = [];
        if (contentType === 'video') {
            const allVideoReps = stream.manifest.periods[0].adaptationSets
                .filter((as) => as.contentType === 'video')
                .flatMap((as) =>
                    as.representations.map((rep) => ({ rep, as }))
                );

            itemsToRender = allVideoReps.map(({ rep, as }) => ({
                title: `Variant Stream (BW: ${formatBitrate(
                    rep.bandwidth
                )}, Res: ${rep.width.value}x${rep.height.value || 'N/A'})`,
                id: rep.id,
                isMuxed: false,
            }));
        } else {
            // Audio or Text
            itemsToRender = (stream.manifest.periods[0]?.adaptationSets || [])
                .filter((as) => as.contentType === contentType)
                .map((r) => {
                    const rep = r.representations[0];
                    return {
                        title: `${contentType.toUpperCase()}: ${r.lang || r.id
                            } (${rep.serializedManifest.NAME})`,
                        id: rep.id,
                        isMuxed: !rep.serializedManifest.resolvedUri,
                    };
                });
        }

        if (itemsToRender.length === 0) {
            return html`<div class="p-4 text-center text-gray-400 text-sm">
                No ${contentType} tracks found in the manifest.
            </div>`;
        }

        return html` <div class="space-y-4">
            ${itemsToRender.map((item) =>
            renderHlsRendition(stream, item, contentType)
        )}
        </div>`;
    } else {
        // Media playlist directly
        const mediaVariant = {
            title: 'Media Playlist Segments',
            id: stream.originalUrl,
            isMuxed: false,
        };
        return renderHlsRendition(stream, mediaVariant, contentType);
    }
}
