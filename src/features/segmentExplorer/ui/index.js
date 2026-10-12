import { useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import { html, render } from 'lit-html';
import { explorerToolbarTemplate } from './components/explorer-toolbar.js';
import { segmentBottomPanelTemplate } from './components/segment-bottom-panel.js';
import { timelineGridTemplate } from './components/timeline-grid.js';
import { createSegmentExplorerViewModel } from './view-model.js';
import { eventBus } from '@/application/event-bus';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';
import { showToast } from '@/ui/components/toast';

class SegmentExplorerView {
    // Port note: was `extends BaseView` (never committed). Plain class
    // with inlined mount/unmount/subscribe; shell-slot padding calls had
    // no 1.2.0 equivalent (dropped).
    constructor() {
        this.hasContextualSidebar = false;
        this._boundKeyDownHandler = null;
        this._unsubs = [];
        this.container = null;
        this.stream = null;
    }

    subscribe(store, listener) {
        const unsubscribe = store.subscribe(listener);
        this._unsubs.push(unsubscribe);
        return unsubscribe;
    }

    /**
     * @param {HTMLElement} containerElement
     * @param {{ stream?: any }} [args]
     */
    mount(containerElement, { stream } = {}) {
        this.container = containerElement;
        this.stream = stream || null;
        this.onMount();
    }

    unmount() {
        this.onUnmount();
        for (const unsubscribe of this._unsubs.splice(0)) {
            try {
                unsubscribe();
            } catch {
                /* ignore late unsubscribe errors */
            }
        }
        if (this.container) render(html``, this.container);
        this.container = null;
        this.stream = null;
    }

    onMount() {
        // 2. Event Listeners
        this._boundKeyDownHandler = this._handleGlobalKeyDown.bind(this);
        document.addEventListener('keydown', this._boundKeyDownHandler);

        // 3. Store Subscriptions
        // Analysis Store: Subscribe to all relevant changes
        this.subscribe(useAnalysisStore, () => this.render());

        // Segment Cache: Re-render on cache updates (loading states)
        this.subscribe(useSegmentCacheStore, () => this.render());

        // UI Store: Selective Subscription
        this.subscribe(useUiStore, (state, prevState) => {
            if (
                state.activeStreamId !== prevState.activeStreamId ||
                state.segmentExplorerActiveTab !== prevState.segmentExplorerActiveTab ||
                state.segmentExplorerSelectedSegment !== prevState.segmentExplorerSelectedSegment ||
                state.segmentMatrixClickMode !== prevState.segmentMatrixClickMode
            ) {
                this.render();
            }
        });

        // 4. Initial Render
        this.render();
    }

    onUnmount() {
        if (this._boundKeyDownHandler) {
            document.removeEventListener('keydown', this._boundKeyDownHandler);
            this._boundKeyDownHandler = null;
        }
        // BaseView automatically clears subscriptions and resets shell slots
    }

    render() {
        if (!this.container) return;

        const { streams, activeStreamId, segmentsForCompare } = useAnalysisStore.getState();
        const uiState = useUiStore.getState();
        const stream = streams.find((s) => s.id === activeStreamId) ?? streams[0];

        // --- EMPTY STATE ---
        if (!stream || !stream.manifest) {
            render(
                html`
                    <div class="flex flex-col items-center justify-center h-full p-8 text-center">
                        <p class="text-[15px] font-medium text-slate-200 mb-1">
                            No stream loaded.
                        </p>
                        <p class="mono text-[11px] text-slate-600">
                            Analyze a manifest to explore its segments.
                        </p>
                    </div>
                `,
                this.container
            );
            return;
        }

        // --- ACTIVE STATE ---

        // 1. Toolbar (in-flow; 1.2.0 has no topBar slot)
        const toolbarPanel = explorerToolbarTemplate();

        // 2. Bottom Panel (in-flow)
        const bottomPanel = segmentBottomPanelTemplate(stream);

        // 3. Main Content (Timeline Grid)
        let content;
        try {
            const viewModel = createSegmentExplorerViewModel(stream, uiState);
            content = timelineGridTemplate(
                viewModel,
                stream.id,
                stream.manifest?.segmentFormat || 'unknown',
                uiState,
                segmentsForCompare
            );
        } catch (err) {
            console.error('Segment Explorer Render Error:', err);
            content = html`
                <div class="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                    <p class="text-[15px] font-medium text-slate-200 mb-1">Timeline unavailable.</p>
                    <p class="mono text-[11px] text-slate-600 max-w-md break-words">${err.message}</p>
                </div>
            `;
        }

        const template = html`
            <div class="w-full h-full flex flex-col min-h-0 bg-[#06090f]">
                 <div class="shrink-0 px-4 pt-3">${toolbarPanel}</div>
                 <div class="grow w-full relative rounded-md border border-white/5 bg-[#0b111c] overflow-hidden flex flex-col min-h-0 mx-4 mt-3" style="width: auto;">
                     <div class="grow min-h-0 relative w-full">
                        ${content}
                     </div>
                 </div>
                 ${bottomPanel
                    ? html`<div class="shrink-0 max-h-[36%] overflow-y-auto custom-scrollbar min-h-0 mx-4 mb-4 mt-2 rounded-md border border-white/5 bg-[#0b111c]">
                        ${bottomPanel}
                     </div>`
                    : ''}
            </div>
        `;

        render(template, this.container);
    }

    _triggerFetch(uniqueId, resolvedUrl, number, streamId, format, setCache) {
        const { contentType } = inferMediaInfoFromExtension(resolvedUrl);
        let formatHint = format === 'unknown' ? null : format;

        if (contentType === 'text') {
            const urlLower = resolvedUrl.toLowerCase();
            if (
                urlLower.endsWith('.ttml') ||
                urlLower.endsWith('.dfxp') ||
                urlLower.endsWith('.xml') ||
                urlLower.includes('ttml+xml')
            ) {
                formatHint = 'ttml';
            } else {
                formatHint = 'vtt';
            }
        }

        setCache(uniqueId, { status: -1, data: null, parsedData: null });
        eventBus.dispatch('segment:fetch', {
            uniqueId: uniqueId,
            streamId,
            format: formatHint,
            context: {},
        });

        const label = typeof number === 'number' ? `#${number}` : 'Index';
        showToast({ message: `Fetching Segment ${label}...`, type: 'info' });
    }

    _handleGlobalKeyDown(e) {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key))
            return;

        // Ignore if focus is in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        const { activeStreamId, streams } = useAnalysisStore.getState();
        const stream = streams.find((s) => s.id === activeStreamId) ?? streams[0];
        if (!stream) return;

        const uiState = useUiStore.getState();
        const selectedItem = uiState.segmentExplorerSelectedSegment;

        if (!selectedItem) return; // Only navigate if something is selected

        const viewModel = createSegmentExplorerViewModel(stream, uiState);
        const tracks = viewModel.tracks;

        // Find current track and segment indices
        const trackIndex = tracks.findIndex((t) => t.id === selectedItem.repId);
        if (trackIndex === -1) return;

        const track = tracks[trackIndex];
        const segmentIndex = track.segments.findIndex(
            (s) => s.uniqueId === selectedItem.uniqueId
        );

        let newTrackIndex = trackIndex;
        let newSegmentIndex = segmentIndex;

        const targetTime =
            selectedItem.start !== undefined
                ? selectedItem.start
                : selectedItem.time;
        const isTargetSeconds = selectedItem.start !== undefined;

        if (e.key === 'ArrowLeft') {
            if (segmentIndex > 0) {
                newSegmentIndex = segmentIndex - 1;
            }
        } else if (e.key === 'ArrowRight') {
            if (segmentIndex !== -1 && segmentIndex < track.segments.length - 1) {
                newSegmentIndex = segmentIndex + 1;
            } else if (segmentIndex === -1 && track.segments.length > 0) {
                newSegmentIndex = 0;
            }
        } else if (e.key === 'ArrowUp') {
            if (trackIndex > 0) {
                newTrackIndex = trackIndex - 1;
            }
        } else if (e.key === 'ArrowDown') {
            if (trackIndex < tracks.length - 1) {
                newTrackIndex = trackIndex + 1;
            }
        }

        if (newTrackIndex !== trackIndex || newSegmentIndex !== segmentIndex) {
            e.preventDefault();

            const newTrack = tracks[newTrackIndex];
            let newSegment = null;

            if (newTrackIndex !== trackIndex) {
                // Vertical navigation: Find closest segment by time
                if (segmentIndex === -1) {
                    // Try to select Init of new track
                    if (newTrack.initSegment) {
                        newSegment = {
                            ...newTrack.initSegment,
                            repId: newTrack.id,
                        };
                    } else if (newTrack.segments.length > 0) {
                        newSegment = {
                            ...newTrack.segments[0],
                            repId: newTrack.id,
                        };
                    }
                } else {
                    // Find segment covering targetTime
                    if (isTargetSeconds) {
                        newSegment = newTrack.segments.find(
                            (s) => s.start <= targetTime && s.end > targetTime
                        );

                        if (!newSegment) {
                            // Find closest start time
                            let minDiff = Infinity;
                            let closest = null;
                            for (const s of newTrack.segments) {
                                const diff = Math.abs(s.start - targetTime);
                                if (diff < minDiff) {
                                    minDiff = diff;
                                    closest = s;
                                }
                            }
                            newSegment = closest;
                        }
                    } else {
                        // Fallback to raw time
                        newSegment = newTrack.segments.find(
                            (s) =>
                                s.time <= targetTime &&
                                s.time + s.duration > targetTime
                        );
                    }

                    if (newSegment) {
                        newSegment = { ...newSegment, repId: newTrack.id };
                    }
                }
            } else {
                // Horizontal navigation
                if (
                    newSegmentIndex >= 0 &&
                    newSegmentIndex < newTrack.segments.length
                ) {
                    newSegment = {
                        ...newTrack.segments[newSegmentIndex],
                        repId: newTrack.id,
                    };
                }
            }

            if (newSegment) {
                uiActions.setSegmentExplorerSelectedSegment(newSegment);

                // Auto-fetch logic
                const entry = useSegmentCacheStore
                    .getState()
                    .get(newSegment.uniqueId);
                const isLoaded = entry && entry.status === 200 && entry.data;
                const isLoading = entry && entry.status === -1;

                if (!isLoaded && !isLoading) {
                    this._triggerFetch(
                        newSegment.uniqueId,
                        newSegment.resolvedUrl,
                        newSegment.number,
                        stream.id,
                        stream.manifest.segmentFormat,
                        useSegmentCacheStore.getState().set
                    );
                }
            }
        }
    }
}

export const segmentExplorerView = new SegmentExplorerView();
