import { html } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { hlsContextSwitcherTemplate } from './hls-context-switcher.js';
import { streamContextSwitcherTemplate } from './stream-context-switcher.js';

/**
 * Renders the combined context switching area for the sidebar.
 * Handles visibility logic for HLS specific controls based on the active view.
 */
export function renderContextSwitcher() {
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const { activeTab } = useUiStore.getState();
    const activeStream = streams.find((s) => s.id === activeStreamId);

    const streamSwitcher =
        streams.length > 0
            ? streamContextSwitcherTemplate(streams, activeStreamId)
            : html``;

    const hlsSwitcher =
        activeTab !== 'summary' && // Global summary uses Master Playlist
        activeTab !== 'explorer' && // Segment Explorer manages its own reps
        activeStream &&
        activeStream.protocol === 'hls' &&
        activeStream.manifest?.isMaster
            ? hlsContextSwitcherTemplate(activeStream)
            : null;

    // If both are present, we stack them. The stream switcher has bottom padding.
    // The HLS switcher sits below it.
    return html`
        <div class="flex flex-col">
            ${streamSwitcher}
            ${hlsSwitcher
                ? html`
                      <div class="px-3 pb-2 -mt-1 relative z-10">
                          ${hlsSwitcher}
                      </div>
                  `
                : ''}
        </div>
    `;
}
