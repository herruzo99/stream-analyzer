import { html } from 'lit-html';
import { copyShareUrlToClipboard } from '@/ui/services/shareService';
import { copyDebugInfoToClipboard } from '@/ui/services/debugService';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { getLastUsedStreams } from '@/infrastructure/persistence/streamStorage';
import {
    togglePlayerAndPolling,
    reloadStream,
} from '@/ui/services/streamActionsService';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import * as icons from '@/ui/icons';
import { resetApplicationState } from '@/application/use_cases/resetApplicationState';
import '@/features/memoryMonitor/ui/index';

function handleRestartAnalysis() {
    resetApplicationState();
    const lastUsed = getLastUsedStreams();
    if (lastUsed && lastUsed.length > 0) {
        analysisActions.setStreamInputs(lastUsed);
    }
}

export const globalControlsTemplate = () => {
    const { streams, activeStreamId } = useAnalysisStore.getState();
    if (streams.length === 0) return html``;
    const activeStream = streams.find((s) => s.id === activeStreamId);

    // --- Button Base Classes for consistency ---
    const buttonBaseClasses =
        'flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition-colors';

    // --- Polling Button Logic ---
    const liveStreams = streams.filter((s) => s.manifest?.type === 'dynamic');
    const isPollingVisible = liveStreams.length > 0;
    const isAnyPolling = liveStreams.some((s) => s.isPolling);
    const wasStoppedByInactivity = liveStreams.some(
        (s) => s.wasStoppedByInactivity
    );

    const pollingButtonClass = isAnyPolling
        ? 'text-red-200 bg-red-600/20 hover:bg-red-600/40'
        : 'text-green-200 bg-green-600/20 hover:bg-green-600/40';
    const pollingIcon = isAnyPolling ? icons.pause : icons.play;
    const pollingLabel = isAnyPolling ? 'Pause Updates' : 'Resume Updates';
    const pollingTitle = isAnyPolling
        ? 'Pause automatic manifest polling'
        : 'Resume automatic manifest polling';
    const inactivityIcon =
        wasStoppedByInactivity && !isAnyPolling
            ? html`<span
                  class="ml-auto ${tooltipTriggerClasses}"
                  data-tooltip="Polling was automatically paused due to background inactivity."
                  >${icons.moon}</span
              >`
            : '';

    // --- Force Poll Button Logic ---
    const isForcePollVisible =
        activeStream && activeStream.manifest?.type === 'dynamic';
    const canReload = !!activeStream?.originalUrl;
    const forcePollTitle = canReload
        ? 'Manually poll the manifest from its source URL'
        : 'Cannot poll a manifest loaded from a local file';

    return html`
        <div class="space-y-2 border-t border-gray-700/50 pt-3">
            <button
                @click=${handleRestartAnalysis}
                data-testid="new-analysis-btn"
                class="${buttonBaseClasses} w-full text-white bg-blue-600 hover:bg-blue-700"
                title="Return to the input screen with the current streams"
            >
                ${icons.newAnalysis}
                <span class="inline">Restart Analysis</span>
            </button>
            <div class="grid grid-cols-2 gap-2">
                ${isPollingVisible
                    ? html`<button
                          @click=${togglePlayerAndPolling}
                          data-testid="polling-btn"
                          class="${buttonBaseClasses} ${pollingButtonClass}"
                          title=${pollingTitle}
                      >
                          ${pollingIcon}
                          <span class="inline">${pollingLabel}</span>
                          ${inactivityIcon}
                      </button>`
                    : ''}
                ${isForcePollVisible
                    ? html`<button
                          @click=${() => reloadStream(activeStream)}
                          data-testid="force-poll-btn"
                          class="${buttonBaseClasses} text-gray-300 bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          ?disabled=${!canReload}
                          title=${forcePollTitle}
                      >
                          ${icons.updates}
                          <span class="inline">Force Poll</span>
                      </button>`
                    : ''}
                <button
                    @click=${copyShareUrlToClipboard}
                    data-testid="share-analysis-btn"
                    class="${buttonBaseClasses} text-gray-300 bg-gray-700/50 hover:bg-gray-700"
                    title="Copy a shareable URL to the clipboard"
                >
                    ${icons.share}
                    <span class="inline">Share</span>
                </button>
                <button
                    @click=${copyDebugInfoToClipboard}
                    data-testid="copy-debug-btn"
                    class="${buttonBaseClasses} text-gray-300 bg-gray-700/50 hover:bg-gray-700"
                    title="Copy distilled debug info to the clipboard"
                >
                    ${icons.debug}
                    <span class="inline">Debug</span>
                </button>
            </div>
        </div>
        <div
            id="memory-monitor-container"
            class="border-t border-gray-700/50 pt-3"
        >
            <memory-monitor></memory-monitor>
        </div>
    `;
};
