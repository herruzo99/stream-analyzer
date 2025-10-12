import { html } from 'lit-html';
import { segmentRowTemplate } from '@/ui/components/segment-row';
import { eventBus } from '@/application/event-bus';
import '@/ui/components/virtualized-list'; // Import the custom element

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

const renderVariant = (stream, variant, variantUri) => {
    const variantState = stream.hlsVariantState.get(variantUri);
    if (!variantState) return html``;

    const { segments: rawSegments, error, isLoading, isExpanded, freshSegmentUrls } = variantState;
    let pdtAnchorTime = 0;
    let cumulativeDuration = 0;
    const allSegments = (Array.isArray(rawSegments) ? rawSegments : []).map(
        (seg, index) => {
            if (/** @type {any} */ (seg).dateTime) {
                pdtAnchorTime = new Date(/** @type {any} */ (seg).dateTime).getTime();
                cumulativeDuration = 0;
            }
            const startTimeUTC = pdtAnchorTime + cumulativeDuration * 1000;
            const endTimeUTC = startTimeUTC + /** @type {any} */ (seg).duration * 1000;
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

    const onToggleExpand = (e) => {
        e.preventDefault();
        eventBus.dispatch('hls-explorer:toggle-variant', { streamId: stream.id, variantUri });
    };

    const rowRenderer = (seg) => {
        const isFresh = freshSegmentUrls.has(/** @type {any} */ (seg).resolvedUrl);
        return segmentRowTemplate(seg, isFresh, stream.manifest.segmentFormat);
    };

    let content;
    if (isLoading) {
        content = html`<div class="p-4 text-center text-gray-400">Loading segments...</div>`;
    } else if (error) {
        content = html`<div class="p-4 text-red-400">Error: ${error}</div>`;
    } else if (allSegments.length === 0 && isExpanded) {
        content = html`<div class="p-4 text-center text-gray-400">No segments found in this playlist.</div>`;
    } else if (isExpanded) {
        content = html`<div class="overflow-x-auto relative text-sm">
            <div class="sticky top-0 bg-gray-900 z-10 hidden md:grid md:grid-cols-[32px_minmax(160px,1fr)_128px_96px_minmax(200px,2fr)] font-semibold text-gray-400 text-xs">
                <div class="px-3 py-2 border-b border-r border-gray-700"></div>
                <div class="px-3 py-2 border-b border-r border-gray-700">Status / Type</div>
                <div class="px-3 py-2 border-b border-r border-gray-700">Timing (s)</div>
                <div class="px-3 py-2 border-b border-r border-gray-700">Flags</div>
                <div class="px-3 py-2 border-b border-gray-700">URL & Actions</div>
            </div>
            <virtualized-list
                .items=${allSegments}
                .rowTemplate=${rowRenderer}
                .rowHeight=${96}
                class="md:h-auto"
                style="height: ${Math.min(allSegments.length * 96, 400)}px; min-height: 80px;"
            ></virtualized-list>
        </div>`;
    }

    return html`
        <style>
            details.details-animated > summary { list-style: none; }
            details.details-animated > summary::-webkit-details-marker { display: none; }
            details.details-animated[open] .chevron { transform: rotate(90deg); }
        </style>
        <details class="bg-gray-800 rounded-lg border border-gray-700 details-animated" ?open=${isExpanded}>
            <summary @click=${onToggleExpand} class="flex items-center p-2 bg-gray-900/50 cursor-pointer list-none">
                <div class="flex-grow font-semibold text-gray-200">${variant.title}</div>
                <svg class="chevron w-5 h-5 text-gray-400 transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
            </summary>
            ${isExpanded ? html`<div class="border-t border-gray-700">${content}</div>` : ''}
        </details>
    `;
};

export function getHlsExplorerTemplate(stream) {
    if (stream.manifest.isMaster) {
        const groupedPlaylists = { VIDEO: [], AUDIO: [], SUBTITLES: [] };

        for (const uri of stream.hlsVariantState.keys()) {
            const variant = (stream.manifest.variants || []).find((v) => v.resolvedUri === uri);
            const serialized = /** @type {any} */ (stream.manifest.serializedManifest);
            const media = serialized?.media?.find((m) => m.URI && new URL(m.URI, stream.baseUrl).href === uri) || null;

            if (variant) {
                groupedPlaylists.VIDEO.push({
                    title: `Variant Stream (BW: ${(variant.attributes.BANDWIDTH / 1000).toFixed(0)}k, Res: ${variant.attributes.RESOLUTION || 'N/A'})`,
                    uri,
                });
            } else if (media) {
                const type = media.TYPE || 'UNKNOWN';
                if (!groupedPlaylists[type]) groupedPlaylists[type] = [];
                groupedPlaylists[type].push({
                    title: `${media.NAME || media.LANGUAGE || 'Rendition'} (${media.LANGUAGE || 'N/A'})`,
                    uri,
                });
            }
        }

        const groupTemplate = (title, items) => {
            if (items.length === 0) return '';
            return html`<div class="mt-4">
                <h4 class="text-md font-semibold text-gray-400 mb-2">${title}</h4>
                <div class="space-y-1">${items.map((item) => renderVariant(stream, item, item.uri))}</div>
            </div>`;
        };

        return html`<div>
            ${groupTemplate('Variant Streams', groupedPlaylists.VIDEO)}
            ${groupTemplate('Audio Renditions', groupedPlaylists.AUDIO)}
            ${groupTemplate('Subtitle Renditions', groupedPlaylists.SUBTITLES)}
        </div>`;
    } else {
        const mediaVariant = { title: 'Media Playlist Segments', uri: stream.originalUrl };
        return renderVariant(stream, mediaVariant, mediaVariant.uri);
    }
}