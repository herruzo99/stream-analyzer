import { html } from 'lit-html';
import {
    reloadStream,
    toggleStreamPolling,
} from '../../services/streamActionsService.js';

export const manifestHeaderTemplate = (stream) => {
    const isDynamic = stream.manifest.type === 'dynamic';
    const isPolling = stream.isPolling;

    const pollingButton = isDynamic
        ? html`
              <button
                  @click=${() => toggleStreamPolling(stream)}
                  class="font-bold text-xs py-1 px-3 rounded-md transition-colors text-white ${isPolling
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'}"
              >
                  ${isPolling ? 'Stop Polling' : 'Start Polling'}
              </button>
          `
        : '';

    return html`
        <div class="flex justify-between items-center mb-2">
            <h3 class="text-xl font-bold">Interactive Manifest</h3>
            <div class="flex items-center gap-2">
                ${pollingButton}
                <button
                    @click=${() => reloadStream(stream)}
                    class="bg-gray-600 hover:bg-gray-700 text-white font-bold text-xs py-1 px-3 rounded-md transition-colors"
                >
                    Reload
                </button>
            </div>
        </div>
    `;
};
