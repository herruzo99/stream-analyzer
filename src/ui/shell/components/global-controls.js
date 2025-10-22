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

function handleRestartAnalysis() {
    // This performs a full reset and then repopulates the input form
    // for a convenient re-run or modification of the last analysis.
    resetApplicationState();
    const lastUsed = getLastUsedStreams();
    if (lastUsed && lastUsed.length > 0) {
        analysisActions.setStreamInputs(lastUsed);
    }
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

const forcePollButtonTemplate = () => {
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const activeStream = streams.find((s) => s.id === activeStreamId);

    if (!activeStream || activeStream.manifest?.type !== 'dynamic') {
        return html``;
    }

    const canReload = !!activeStream.originalUrl;

    return html`<button
        @click=${() => reloadStream(activeStream)}
        ?disabled=${!canReload}
        class="w-full flex items-center justify-start gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors text-gray-300 bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        title=${canReload
            ? 'Manually poll the manifest from its source URL'
            : 'Cannot poll a manifest loaded from a local file'}
    >
        ${icons.updates}
        <span class="inline">Force Poll</span>
    </button>`;
};

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
        @click=${togglePlayerAndPolling}
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
            ${controlButtonTemplate(
                handleRestartAnalysis,
                'new-analysis-btn',
                'text-white bg-blue-600 hover:bg-blue-700',
                icons.newAnalysis,
                'Restart Analysis'
            )}
            ${pollingButtonTemplate()} ${forcePollButtonTemplate()}
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
        </div>
    `;
};