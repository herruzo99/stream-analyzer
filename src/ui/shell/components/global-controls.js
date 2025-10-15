import { html } from 'lit-html';
import { copyShareUrlToClipboard } from '@/ui/services/shareService';
import { copyDebugInfoToClipboard } from '@/ui/services/debugService';
import { stopAllMonitoring } from '@/application/services/primaryStreamMonitorService';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { toggleAllLiveStreamsPolling } from '@/application/services/streamActionsService';
import { tooltipTriggerClasses } from '@/ui/shared/constants';

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
    const icon = isAnyPolling
        ? html`<svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
          >
              <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
              />
          </svg>`
        : html`<svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
          >
              <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clip-rule="evenodd"
              />
          </svg>`;
    const label = isAnyPolling ? 'Pause All Updates' : 'Resume All Updates';

    const inactivityIcon =
        wasStoppedByInactivity && !isAnyPolling
            ? html`<span
                  class="ml-auto ${tooltipTriggerClasses}"
                  data-tooltip="Polling was automatically paused due to background inactivity."
                  ><svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5 text-yellow-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                  >
                      <path
                          d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
                      /></svg
              ></span>`
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

    const shareIcon = html`<svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
    >
        <path
            d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"
        />
    </svg>`;
    const debugIcon = html`<svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
    >
        <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clip-rule="evenodd"
        />
    </svg>`;
    const newIcon = html`<svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
    >
        <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
            clip-rule="evenodd"
        />
    </svg>`;

    return html`
        <div class="space-y-2">
            ${pollingButtonTemplate()}
            ${controlButtonTemplate(
                copyShareUrlToClipboard,
                'share-analysis-btn',
                'text-gray-300 bg-gray-700/50 hover:bg-gray-700',
                shareIcon,
                'Share Analysis'
            )}
            ${controlButtonTemplate(
                copyDebugInfoToClipboard,
                'copy-debug-btn',
                'text-yellow-200 bg-yellow-600/20 hover:bg-yellow-600/40',
                debugIcon,
                'Copy Debug Info'
            )}
            ${controlButtonTemplate(
                handleNewAnalysis,
                'new-analysis-btn',
                'text-white bg-blue-600 hover:bg-blue-700',
                newIcon,
                'New Analysis'
            )}
        </div>
    `;
};
