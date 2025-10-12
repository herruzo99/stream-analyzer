import { html } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { hlsContextSwitcherTemplate } from './hls-context-switcher.js';
import { streamContextSwitcherTemplate } from './stream-context-switcher.js';

export function renderContextSwitcher() {
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const activeStream = streams.find((s) => s.id === activeStreamId);

    const streamSwitcher =
        streams.length > 1
            ? streamContextSwitcherTemplate(streams, activeStreamId)
            : html``;

    const hlsSwitcher =
        activeStream &&
        activeStream.protocol === 'hls' &&
        activeStream.manifest?.isMaster
            ? hlsContextSwitcherTemplate(activeStream)
            : html``;

    // The switchers are now rendered inside a flex container in `app-shell.js`
    return html`${streamSwitcher} ${hlsSwitcher}`;
}