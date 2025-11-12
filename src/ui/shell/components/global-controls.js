import { html } from 'lit-html';
import { copyShareUrlToClipboard } from '@/ui/services/shareService';
import { copyDebugInfoToClipboard } from '@/ui/services/debugService';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { getLastUsedStreams } from '@/infrastructure/persistence/streamStorage';
import {
    reloadStream,
    toggleAllPolling,
} from '@/ui/services/streamActionsService';
import { toggleDropdown } from '@/ui/services/dropdownService';
import { pollingDropdownPanelTemplate } from './polling-dropdown-panel.js';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import * as icons from '@/ui/icons';
import { resetApplicationState } from '@/application/use_cases/resetApplicationState';
import '@/features/memoryMonitor/ui/index';
import { isDebugMode } from '@/shared/utils/env';
import { usePlayerStore } from '@/state/playerStore.js';
import { playerService } from '@/features/playerSimulation/application/playerService.js';
import { notificationSettingsPanelTemplate } from '@/features/notifications/ui/components/notification-settings-panel.js';
import { useNotificationStore } from '@/state/notificationStore';

function handleRestartAnalysis() {
    resetApplicationState();
    const lastUsed = getLastUsedStreams();
    if (lastUsed && lastUsed.length > 0) {
        analysisActions.setStreamInputs(lastUsed);
    }
}

const handleStopAndResetPlayer = () => {
    playerService.destroy();
};

export const globalControlsTemplate = () => {
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const { isPipUnmount } = usePlayerStore.getState();
    if (streams.length === 0) return html``;
    const activeStream = streams.find((s) => s.id === activeStreamId);

    const buttonBaseClasses =
        'flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition-colors';

    const liveStreams = streams.filter((s) => s.manifest?.type === 'dynamic');
    const isPollingVisible = liveStreams.length > 0;
    const isAnyPolling = liveStreams.some((s) => s.isPolling);
    const wasStoppedByInactivity = liveStreams.some(
        (s) => s.wasStoppedByInactivity
    );

    const pollingContainerClass = isAnyPolling
        ? 'text-cyan-200 bg-cyan-600/20 ring-1 ring-cyan-500 animate-pulse'
        : 'text-gray-300 bg-gray-700/50 ring-1 ring-gray-600';

    const pollingIcon = isAnyPolling ? icons.play : icons.pause;
    const pollingLabel = isAnyPolling ? 'Polling Active' : 'Polling Paused';
    const pollingTitle = 'Manage live stream polling';

    const inactivityIcon =
        wasStoppedByInactivity && !isAnyPolling
            ? html`<span
                  class="ml-auto ${tooltipTriggerClasses}"
                  data-tooltip="Polling was automatically paused due to background inactivity."
                  >${icons.moon}</span
              >`
            : '';

    const isForcePollVisible =
        activeStream && activeStream.manifest?.type === 'dynamic';
    const canReload = !!activeStream?.originalUrl;
    const forcePollTitle = canReload
        ? 'Manually poll the manifest from its source URL'
        : 'Cannot poll a manifest loaded from a local file';

    const pollingSplitButton = html`
        <div class="flex w-full rounded-md ${pollingContainerClass}">
            <button
                @click=${toggleAllPolling}
                class="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold grow transition-colors rounded-l-md hover:bg-white/10"
                title=${isAnyPolling
                    ? 'Pause All Polling'
                    : 'Resume All Polling'}
            >
                ${pollingIcon}
                <span class="inline">${pollingLabel}</span>
                ${inactivityIcon}
            </button>
            <div
                class="w-px ${isAnyPolling
                    ? 'bg-cyan-500/50'
                    : 'bg-gray-600'}"
            ></div>
            <button
                @click=${(e) => {
                    const container = e.currentTarget.parentElement;
                    toggleDropdown(
                        container,
                        () => pollingDropdownPanelTemplate(),
                        e
                    );
                }}
                class="px-2 py-2 text-xs font-semibold transition-colors rounded-r-md hover:bg-white/10"
                title="Advanced polling options"
            >
                ${icons.chevronDown}
            </button>
        </div>
    `;

    const { permission } = useNotificationStore.getState();
    const notificationIndicator =
        permission === 'denied'
            ? html`<span
                  class="absolute -top-1 -right-1 flex h-3 w-3"
                  title="Notifications are blocked by your browser."
              >
                  <span
                      class="relative inline-flex rounded-full h-3 w-3 bg-red-500"
                  ></span>
              </span>`
            : '';

    return html`
        <div class="space-y-2 border-t border-gray-700/50">
            ${isPipUnmount
                ? html`<button
                      @click=${handleStopAndResetPlayer}
                      class="${buttonBaseClasses} w-full text-red-200 bg-red-800 hover:bg-red-700"
                      title="Stop background player and clear its state"
                  >
                      ${icons.xCircle}
                      <span class="inline">Stop & Reset Player</span>
                  </button>`
                : ''}
            ${isPollingVisible ? pollingSplitButton : ''}
            ${isForcePollVisible
                ? html`<button
                      @click=${() => reloadStream(activeStream)}
                      data-testid="force-poll-btn"
                      class="${buttonBaseClasses} w-full text-gray-300 bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      ?disabled=${!canReload}
                      title=${forcePollTitle}
                  >
                      ${icons.updates}
                      <span class="inline">Force Poll</span>
                  </button>`
                : ''}

            <div class="flex items-center gap-2">
                <button
                    @click=${handleRestartAnalysis}
                    data-testid="new-analysis-btn"
                    class="${buttonBaseClasses} w-full text-white bg-blue-600 hover:bg-blue-700"
                    title="Return to the input screen with the current streams"
                >
                    ${icons.newAnalysis}
                    <span class="inline">New Analysis</span>
                </button>
                <button
                    @click=${(e) =>
                        toggleDropdown(
                            e.currentTarget,
                            notificationSettingsPanelTemplate,
                            e
                        )}
                    class="${buttonBaseClasses} relative text-gray-300 bg-gray-700/50 hover:bg-gray-700"
                    title="Notification Settings"
                >
                    ${icons.settings} ${notificationIndicator}
                </button>
            </div>

            <div
                class="grid ${isDebugMode ? 'grid-cols-2' : 'grid-cols-1'} gap-2"
            >
                <button
                    @click=${copyShareUrlToClipboard}
                    data-testid="share-analysis-btn"
                    class="${buttonBaseClasses} text-gray-300 bg-gray-700/50 hover:bg-gray-700"
                    title="Copy a shareable URL to the clipboard"
                >
                    ${icons.share}
                    <span class="inline">Share</span>
                </button>
                ${isDebugMode
                    ? html`<button
                          @click=${copyDebugInfoToClipboard}
                          data-testid="copy-debug-btn"
                          class="${buttonBaseClasses} text-gray-300 bg-gray-700/50 hover:bg-gray-700"
                          title="Copy distilled debug info to the clipboard"
                      >
                          ${icons.debug}
                          <span class="inline">Copy Debug Info</span>
                      </button>`
                    : ''}
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