import { html } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { hlsContextSwitcherTemplate } from './hls-context-switcher.js';
import { streamContextSwitcherTemplate } from './stream-context-switcher.js';

export function renderContextSwitcher() {
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const { activeTab } = useUiStore.getState();
    const activeStream = streams.find((s) => s.id === activeStreamId);

    // Define a list of views that are global or manage their own stream context,
    // making the global stream selector redundant or confusing.
    const CONTEXT_UNAWARE_VIEWS = [
        'comparison',
        'multi-player',
        'network',
        'segment-comparison',
    ];

    const showSwitchers = !CONTEXT_UNAWARE_VIEWS.includes(activeTab);

    const streamSwitcher =
        showSwitchers && streams.length > 1
            ? streamContextSwitcherTemplate(streams, activeStreamId)
            : html``;

    const hlsSwitcher =
        showSwitchers &&
        activeTab !== 'explorer' && // Do not show in Segment Explorer
        activeStream &&
        activeStream.protocol === 'hls' &&
        activeStream.manifest?.isMaster
            ? hlsContextSwitcherTemplate(activeStream)
            : html``;

    return html`${streamSwitcher} ${hlsSwitcher}`;
}