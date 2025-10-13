import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { eventBus } from '@/application/event-bus';
import { segmentTableTemplate } from '@/ui/components/segment-table';

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

const renderHlsRepresentation = (stream, representationInfo) => {
    const { title, uri } = representationInfo;
    const variantState = stream.hlsVariantState.get(uri);

    if (!variantState) return html``;

    const { segments: rawSegments, error, isLoading, freshSegmentUrls } =
        variantState;

    let pdtAnchorTime = 0;
    let cumulativeDuration = 0;
    const allSegments = (Array.isArray(rawSegments) ? rawSegments : []).map(
        (seg, index) => {
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
                resolvedUrl: /** @type {any} */ (seg).resolvedUrl,
                template: /** @type {any} */ (seg).uri,
                time: segmentTime * 90000,
                duration: /** @type {any} */ (seg).duration * 90000,
                timescale: 90000,
                gap: /** @type {any} */ (seg).gap || false,
                startTimeUTC: startTimeUTC || 0,
                endTimeUTC: endTimeUTC || 0,
                flags: /** @type {any} */ (seg).flags || [],
            };
        }
    );

    const onLoadClick = () => {
        eventBus.dispatch('hls-explorer:load-segments', {
            streamId: stream.id,
            variantUri: uri,
        });
    };

    return segmentTableTemplate({
        id: uri.replace(/[^a-zA-Z0-9]/g, '-'),
        title: title,
        segments: allSegments,
        freshSegmentUrls,
        segmentFormat: stream.manifest.segmentFormat,
        isLoading,
        error,
        onLoadClick,
    });
};

export function getHlsExplorerTemplate(stream) {
    const groupTemplate = (title, items) => {
        if (items.length === 0) return '';
        return html`
            <div class="mt-4">
                <h4 class="text-md font-semibold text-gray-400 mb-2">
                    ${title}
                </h4>
                <div class="space-y-4">
                    ${items.map((item) => renderHlsRepresentation(stream, item))}
                </div>
            </div>
        `;
    };

    if (stream.manifest.isMaster) {
        const groupedPlaylists = { VIDEO: [], AUDIO: [], SUBTITLES: [] };

        for (const uri of stream.hlsVariantState.keys()) {
            const variant = (stream.manifest.variants || []).find(
                (v) => v.resolvedUri === uri
            );
            const serialized =
                /** @type {any} */ (stream.manifest.serializedManifest);
            const media =
                (serialized?.media || []).find(
                    (m) => m.URI && new URL(m.URI, stream.baseUrl).href === uri
                ) || null;

            if (variant) {
                groupedPlaylists.VIDEO.push({
                    title: `Variant Stream (BW: ${(
                        variant.attributes.BANDWIDTH / 1000
                    ).toFixed(0)}k, Res: ${
                        variant.attributes.RESOLUTION || 'N/A'
                    })`,
                    uri,
                });
            } else if (media) {
                const type = media.TYPE || 'UNKNOWN';
                if (!groupedPlaylists[type]) groupedPlaylists[type] = [];
                groupedPlaylists[type].push({
                    title: `${media.TYPE}: ${
                        media.NAME || media.LANGUAGE || 'Rendition'
                    } (${media.LANGUAGE || 'N/A'})`,
                    uri,
                });
            }
        }

        return html`
            <div>
                ${groupTemplate('Variant Streams', groupedPlaylists.VIDEO)}
                ${groupTemplate('Audio Renditions', groupedPlaylists.AUDIO)}
                ${groupTemplate(
                    'Subtitle Renditions',
                    groupedPlaylists.SUBTITLES
                )}
            </div>
        `;
    } else {
        // Media playlist directly
        const mediaVariant = {
            title: 'Media Playlist Segments',
            uri: stream.originalUrl,
        };
        return renderHlsRepresentation(stream, mediaVariant);
    }
}