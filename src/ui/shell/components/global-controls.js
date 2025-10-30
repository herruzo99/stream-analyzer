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

const controlButtonTemplate = (onClick, testId, classes, icon, label, disabled = false, title = '') => html`
    <button
        @click=${onClick}
        data-testid=${testId}
        class="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${classes}"
        ?disabled=${disabled}
        title=${title}
    >
        ${icon}
        <span class="inline">${label}</span>
    </button>
`;

const pollingButtonTemplate = () => {
    const { streams } = useAnalysisStore.getState();
    const liveStreams = streams.filter((s) => s.manifest?.type === 'dynamic');

    if (liveStreams.length === 0) return html``;

    const isAnyPolling = liveStreams.some((s) => s.isPolling);
    const wasStoppedByInactivity = liveStreams.some((s) => s.wasStoppedByInactivity);

    const buttonClass = isAnyPolling
        ? 'text-red-200 bg-red-600/20 hover:bg-red-600/40'
        : 'text-green-200 bg-green-600/20 hover:bg-green-600/40';
    const icon = isAnyPolling ? icons.pause : icons.play;
    const label = isAnyPolling ? 'Pause Updates' : 'Resume Updates';
    const title = isAnyPolling ? 'Pause automatic manifest polling' : 'Resume automatic manifest polling';

    const inactivityIcon =
        wasStoppedByInactivity && !isAnyPolling
            ? html`<span
                  class="ml-auto ${tooltipTriggerClasses}"
                  data-tooltip="Polling was automatically paused due to background inactivity."
                  >${icons.moon}</span
              >`
            : '';

    return controlButtonTemplate(togglePlayerAndPolling, 'polling-btn', buttonClass, icon, label, false, title);
};

const forcePollButtonTemplate = () => {
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const activeStream = streams.find((s) => s.id === activeStreamId);

    if (!activeStream || activeStream.manifest?.type !== 'dynamic') return html``;

    const canReload = !!activeStream.originalUrl;
    const title = canReload
        ? 'Manually poll the manifest from its source URL'
        : 'Cannot poll a manifest loaded from a local file';

    return controlButtonTemplate(
        () => reloadStream(activeStream),
        'force-poll-btn',
        'text-gray-300 bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed',
        icons.updates,
        'Force Poll',
        !canReload,
        title
    );
};

export const globalControlsTemplate = () => {
    const { streams } = useAnalysisStore.getState();
    if (streams.length === 0) return html``;

    return html`
        <div id="memory-monitor-container" class="border-t border-gray-700/50 pt-3">
            <memory-monitor></memory-monitor>
        </div>
        <div class="space-y-2 border-t border-gray-700/50 pt-3">
            ${controlButtonTemplate(
                handleRestartAnalysis,
                'new-analysis-btn',
                'text-white bg-blue-600 hover:bg-blue-700 col-span-2',
                icons.newAnalysis,
                'Restart Analysis',
                false,
                'Return to the input screen with the current streams'
            )}
            <div class="grid grid-cols-2 gap-2">
                ${pollingButtonTemplate()}
                ${forcePollButtonTemplate()}
                ${controlButtonTemplate(
                    copyShareUrlToClipboard,
                    'share-analysis-btn',
                    'text-gray-300 bg-gray-700/50 hover:bg-gray-700',
                    icons.share,
                    'Share',
                    false,
                    'Copy a shareable URL to the clipboard'
                )}
                ${controlButtonTemplate(
                    copyDebugInfoToClipboard,
                    'copy-debug-btn',
                    'text-gray-300 bg-gray-700/50 hover:bg-gray-700',
                    icons.debug,
                    'Debug',
                    false,
                    'Copy distilled debug info to the clipboard'
                )}
            </div>
        </div>
    `;
};