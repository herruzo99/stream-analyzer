import { html, render } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { dashTimelineTemplate } from './dash/index.js';
import { hlsTimelineTemplate } from './hls/index.js';
import { connectedTabBar } from '@/ui/components/tabs.js';
import { usePlayerStore } from '@/state/playerStore.js';


let container = null;
let analysisUnsubscribe = null;
let uiUnsubscribe = null;
let playerUnsubscribe = null;

function renderTimelineView() {
    if (!container) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const { timelineActiveTab } = useUiStore.getState();
    const { currentStats } = usePlayerStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);

    if (!stream) {
        timelineView.unmount();
        return;
    }

    let viewContent;
    const tabs = [{ key: 'overview', label: 'General' }];

    if (stream.protocol === 'dash') {
        tabs.push({ key: 'cascade', label: 'Drilldown' });
        viewContent = dashTimelineTemplate(stream, currentStats?.playheadTime);
    } else if (stream.protocol === 'hls') {
        if (stream.manifest?.isMaster) {
            tabs.push({ key: 'cascade', label: 'Drilldown' });
        }
        viewContent = hlsTimelineTemplate(stream, currentStats?.playheadTime);
    } else {
        viewContent = html`<p class="text-yellow-400">
            Timeline view is not supported for this stream type.
        </p>`;
    }

    const template = html`
        <div class="flex flex-col h-full">
            <div class="shrink-0">
                ${connectedTabBar(
        tabs,
        timelineActiveTab,
        uiActions.setTimelineActiveTab
    )}
            </div>
            <div class="grow min-h-0 overflow-auto pt-4">${viewContent}</div>
        </div>
    `;

    render(template, container);
}

export const timelineView = {
    mount(containerElement) {
        container = containerElement;
        if (analysisUnsubscribe) analysisUnsubscribe();
        if (uiUnsubscribe) uiUnsubscribe();
        if (playerUnsubscribe) playerUnsubscribe();

        analysisUnsubscribe = useAnalysisStore.subscribe(renderTimelineView);
        uiUnsubscribe = useUiStore.subscribe(renderTimelineView);
        playerUnsubscribe = usePlayerStore.subscribe(renderTimelineView);
        renderTimelineView();
    },
    unmount() {
        if (analysisUnsubscribe) analysisUnsubscribe();
        if (uiUnsubscribe) uiUnsubscribe();
        if (playerUnsubscribe) playerUnsubscribe();
        analysisUnsubscribe = null;
        uiUnsubscribe = null;
        playerUnsubscribe = null;
        if (container) render(html``, container);
        container = null;
    },
};
