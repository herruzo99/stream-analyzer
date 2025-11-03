import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { eventBus } from '@/application/event-bus';
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
    const { title, uri, isMuxed } = renditionInfo;
    const { segmentExplorerSortOrder, segmentExplorerTargetTime } =
        useUiStore.getState();

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

    const variantState = stream.hlsVariantState.get(uri);
    if (!variantState) return html``;

    const {
        segments: rawSegments,
        error,
        isLoading,
        currentSegmentUrls,
        newlyAddedSegmentUrls,
    } = variantState;

    const segments = rawSegments || [];

    let pdtAnchorTime = 0;
    let cumulativeDuration = 0;
    const allSegments = segments.map((seg, index) => {
        if (/** @type {any} */ (seg).dateTime) {
            pdtAnchorTime = new Date(
                /** @type {any} */ (seg).dateTime
            ).getTime();
            cumulativeDuration = 0;
        }
        const startTimeUTC = pdtAnchorTime + cumulativeDuration * 1000;
        const endTimeUTC =
            startTimeUTC + /** @type {any} */ (seg).duration * 1000;
        const segmentTime = cumulativeDuration;
        cumulativeDuration += /** @type {any} */ (seg).duration;
        return {
            repId: 'hls-media',
            type: /** @type {any} */ (seg).type || 'Media',
            number: (stream.manifest.mediaSequence || 0) + index,
            uniqueId: /** @type {any} */ (seg).uniqueId,
            resolvedUrl: /** @type {any} */ (seg).resolvedUrl,
            template: /** @type {any} */ (seg).uri,
            time: segmentTime * 90000,
            duration: /** @type {any} */ (seg).duration * 90000,
            timescale: 90000,
            gap: /** @type {any} */ (seg).gap || false,
            startTimeUTC: startTimeUTC || 0,
            endTimeUTC: endTimeUTC || 0,
            flags: /** @type {any} */ (seg).flags || [],
            encryptionInfo: /** @type {any} */ (seg).encryptionInfo,
        };
    });

    let processedSegments = [...allSegments];

    if (segmentExplorerTargetTime) {
        // This logic is now handled inside segment-table and segment-row
    }

    processedSegments.sort((a, b) => {
        const order = segmentExplorerSortOrder === 'asc' ? 1 : -1;
        return (a.number - b.number) * order;
    });

    return segmentTableTemplate({
        id: uri.replace(/[^a-zA-Z0-9]/g, '-'),
        rawId: uri,
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
            itemsToRender = (stream.manifest.variants || []).map((v) => ({
                title: `Variant Stream (BW: ${formatBitrate(
                    v.attributes.BANDWIDTH
                )}, Res: ${v.attributes.RESOLUTION || 'N/A'})`,
                uri: v.resolvedUri,
                isMuxed: false,
            }));
        } else {
            // Audio or Text
            itemsToRender = (stream.manifest.periods[0]?.adaptationSets || [])
                .filter((as) => as.contentType === contentType)
                .map((r) => {
                    const resolvedUri =
                        r.representations[0]?.serializedManifest.resolvedUri;
                    return {
                        title: `${contentType.toUpperCase()}: ${
                            r.lang || r.id
                        } (${r.representations[0]?.serializedManifest.NAME})`,
                        uri: resolvedUri,
                        isMuxed: !resolvedUri,
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
            uri: stream.originalUrl,
            isMuxed: false,
        };
        return renderHlsRendition(stream, mediaVariant, contentType);
    }
}
