import { html, render } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { hlsContextSwitcherTemplate } from './hls-context-switcher.js';
import { streamContextSwitcherTemplate } from './stream-context-switcher.js';

export function renderContextSwitcher(dom) {
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const activeStream = streams.find((s) => s.id === activeStreamId);

    const hasMultipleStreams = streams.length > 1;
    const isSingleHlsMaster =
        streams.length === 1 &&
        streams[0].protocol === 'hls' &&
        streams[0].manifest?.isMaster;

    const wrapperShouldBeVisible = hasMultipleStreams || isSingleHlsMaster;
    dom.contextSwitcherWrapper.classList.toggle(
        'hidden',
        !wrapperShouldBeVisible
    );
    dom.contextSwitcherWrapper.classList.toggle('flex', wrapperShouldBeVisible);

    const switcherContainer =
        dom.contextSwitcherWrapper.querySelector('#switcher-container');
    if (!switcherContainer) return;

    // Conditionally render both switchers into the main container
    const mainSwitcherTemplate = hasMultipleStreams
        ? streamContextSwitcherTemplate(streams, activeStreamId)
        : html``;
    const hlsSwitcherTemplateContent = activeStream
        ? hlsContextSwitcherTemplate(activeStream)
        : html``;

    render(
        html`${mainSwitcherTemplate}${hlsSwitcherTemplateContent}`,
        switcherContainer
    );
}