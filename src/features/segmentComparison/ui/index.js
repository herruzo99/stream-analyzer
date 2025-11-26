import { html, render } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { createComparisonModel } from '../domain/comparisonEngine.js';
import { comparisonLayoutTemplate } from './components/comparison-layout.js';
import * as icons from '@/ui/icons';

let container = null;
let unsubs = [];

function resolveSegmentData(meta) {
    const { streams } = useAnalysisStore.getState();
    const { get } = useSegmentCacheStore.getState();

    const cacheEntry = get(meta.segmentUniqueId);
    if (!cacheEntry || !cacheEntry.parsedData) return null;

    // Resolve stream even if it's not the currently active one
    const stream = streams.find((s) => s.id === meta.streamId);
    if (!stream) return null;

    // Find segment metadata in stream state for numbering/timing info
    // Simplified lookup: check dash/hls states
    let segmentMeta = null;
    const findSeg = (map) => {
        for (const state of map.values()) {
            const s = state.segments.find(
                (seg) => seg.uniqueId === meta.segmentUniqueId
            );
            if (s) return s;
        }
    };

    if (stream.protocol === 'dash')
        segmentMeta = findSeg(stream.dashRepresentationState);
    else if (stream.protocol === 'hls')
        segmentMeta = findSeg(stream.hlsVariantState);
    // Fallback for init segments or local files where deep lookup might fail
    if (!segmentMeta)
        segmentMeta = { number: '?', uniqueId: meta.segmentUniqueId };

    return {
        ...cacheEntry.parsedData,
        stream,
        segment: segmentMeta,
    };
}

function renderView() {
    if (!container) return;

    const { segmentsForCompare } = useAnalysisStore.getState();
    // Use persistent UI state instead of local vars
    const { segmentComparisonSelection } = useUiStore.getState();
    let { idA, idB } = segmentComparisonSelection;

    if (segmentsForCompare.length === 0) {
        render(
            html`
                <div
                    class="flex flex-col items-center justify-center h-full text-slate-500 bg-slate-950"
                >
                    <div
                        class="p-6 bg-slate-900 rounded-full border border-slate-800 shadow-xl mb-4"
                    >
                        ${icons.list}
                    </div>
                    <h3 class="text-lg font-bold text-slate-300">
                        Comparison Queue Empty
                    </h3>
                    <p class="text-sm mt-2 max-w-md text-center">
                        Go to the
                        <strong class="text-blue-400">Segment Explorer</strong>
                        and select segments (click or check) to add them to this
                        comparison workspace.
                    </p>
                </div>
            `,
            container
        );
        return;
    }

    // Resolve all available segments
    const availableSegments = segmentsForCompare
        .map(resolveSegmentData)
        .filter(Boolean);

    // Default selection logic if state is null or invalid
    const validId = (id) =>
        availableSegments.some((s) => s.segment.uniqueId === id);

    if (!idA || !validId(idA)) {
        idA = availableSegments[0]?.segment.uniqueId;
        // Update store to keep sync (defer to avoid render loop)
        if (idA)
            setTimeout(
                () => uiActions.setSegmentComparisonSelection({ idA }),
                0
            );
    }

    if ((!idB || !validId(idB)) && availableSegments.length > 1) {
        // Pick the second available one that isn't A, if possible
        const candidate =
            availableSegments.find((s) => s.segment.uniqueId !== idA) ||
            availableSegments[1];
        idB = candidate?.segment.uniqueId;
        if (idB)
            setTimeout(
                () => uiActions.setSegmentComparisonSelection({ idB }),
                0
            );
    }

    const segmentA = availableSegments.find((s) => s.segment.uniqueId === idA);
    const segmentB = availableSegments.find((s) => s.segment.uniqueId === idB);

    let structuralDiff = [];
    if (segmentA && segmentB) {
        // Re-use the domain logic
        try {
            const model = createComparisonModel([segmentA, segmentB]);
            structuralDiff = model.structuralDiff;
        } catch (e) {
            console.error('Comparison generation failed:', e);
        }
    }

    const layout = comparisonLayoutTemplate({
        availableSegments,
        segmentA,
        segmentB,
        structuralDiff,
        onSelectA: (seg) =>
            uiActions.setSegmentComparisonSelection({
                idA: seg.segment.uniqueId,
            }),
        onSelectB: (seg) =>
            uiActions.setSegmentComparisonSelection({
                idB: seg.segment.uniqueId,
            }),
    });

    render(layout, container);
}

export const segmentComparisonView = {
    mount(el) {
        container = el;
        unsubs.push(useAnalysisStore.subscribe(renderView));
        unsubs.push(useSegmentCacheStore.subscribe(renderView));
        unsubs.push(useUiStore.subscribe(renderView));
        renderView();
    },
    unmount() {
        unsubs.forEach((u) => u());
        unsubs = [];
        if (container) render(html``, container);
        container = null;
    },
};
