import { html } from 'lit-html';
import { copyShareUrlToClipboard } from '@/ui/services/shareService';
import { copyDebugInfoToClipboard } from '@/ui/services/debugService';
import { stopAllMonitoring } from '@/application/services/primaryStreamMonitorService';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { toggleAllLiveStreamsPolling } from '@/application/services/streamActionsService';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import * as icons from '@/ui/icons';

function handleNewAnalysis() {
    stopAllMonitoring();
    useSegmentCacheStore.getState().clear();
    analysisActions.startAnalysis();
}

const controlButtonTemplate = (onClick, testId, classes, icon, label) => html`
    <button
        @click=${onClick}
        data-testid=${testId}
        class="w-full flex items-center justify-start gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${classes}"
    >
        ${icon}
        <span class="inline">${label}</span>
    </button>
`;

const pollingButtonTemplate = () => {
    const { streams } = useAnalysisStore.getState();
    const liveStreams = streams.filter((s) => s.manifest?.type === 'dynamic');

    if (liveStreams.length === 0) {
        return html``;
    }

    const isAnyPolling = liveStreams.some((s) => s.isPolling);
    const wasStoppedByInactivity = liveStreams.some(
        (s) => s.wasStoppedByInactivity
    );

    const buttonClass = isAnyPolling
        ? 'text-red-200 bg-red-600/20 hover:bg-red-600/40'
        : 'text-green-200 bg-green-600/20 hover:bg-green-600/40';
    const icon = isAnyPolling ? icons.pause : icons.play;
    const label = isAnyPolling ? 'Pause All Updates' : 'Resume All Updates';

    const inactivityIcon =
        wasStoppedByInactivity && !isAnyPolling
            ? html`<span
                  class="ml-auto ${tooltipTriggerClasses}"
                  data-tooltip="Polling was automatically paused due to background inactivity."
                  >${icons.moon}</span
              >`
            : '';

    return html`<button
        @click=${toggleAllLiveStreamsPolling}
        class="w-full flex items-center justify-start gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${buttonClass}"
    >
        ${icon}
        <span class="inline">${label}</span>
        ${inactivityIcon}
    </button>`;
};

/**
 * Renders the global controls for the results view footer.
 * @returns {import('lit-html').TemplateResult}
 */
export const globalControlsTemplate = () => {
    const { streams } = useAnalysisStore.getState();
    if (streams.length === 0) return html``;

    return html`
        <div class="space-y-2">
            ${pollingButtonTemplate()}
            ${controlButtonTemplate(
                copyShareUrlToClipboard,
                'share-analysis-btn',
                'text-gray-300 bg-gray-700/50 hover:bg-gray-700',
                icons.share,
                'Share Analysis'
            )}
            ${controlButtonTemplate(
                copyDebugInfoToClipboard,
                'copy-debug-btn',
                'text-yellow-200 bg-yellow-600/20 hover:bg-yellow-600/40',
                icons.debug,
                'Copy Debug Info'
            )}
            ${controlButtonTemplate(
                handleNewAnalysis,
                'new-analysis-btn',
                'text-white bg-blue-600 hover:bg-blue-700',
                icons.newAnalysis,
                'New Analysis'
            )}
        </div>
    `;
};