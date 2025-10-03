import { html } from 'lit-html';
import { eventBus } from '../../core/event-bus.js';
import { useStore, storeActions } from '../../core/store.js';

const reloadHandler = (stream) => {
    const urlToReload = stream.activeMediaPlaylistUrl || stream.originalUrl;
    if (!stream || !urlToReload || !stream.originalUrl) {
        eventBus.dispatch('ui:show-status', {
            message: 'Cannot reload a manifest from a local file.',
            type: 'warn',
            duration: 4000,
        });
        return;
    }

    eventBus.dispatch('ui:show-status', {
        message: `Reloading manifest for ${stream.name}...`,
        type: 'info',
        duration: 2000,
    });

    if (stream.protocol === 'hls' && stream.activeMediaPlaylistUrl) {
        eventBus.dispatch('hls:media-playlist-reload', {
            streamId: stream.id,
            url: stream.activeMediaPlaylistUrl,
        });
    } else {
        eventBus.dispatch('manifest:force-reload', { streamId: stream.id });
    }
};

const togglePollingState = (stream) => {
    if (stream) {
        storeActions.updateStream(stream.id, {
            isPolling: !stream.isPolling,
        });
    }
};

export const manifestHeaderTemplate = (stream) => {
    const isDynamic = stream.manifest.type === 'dynamic';
    const isPolling = stream.isPolling;

    const pollingButton = isDynamic
        ? html`
              <button
                  @click=${() => togglePollingState(stream)}
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
                    @click=${() => reloadHandler(stream)}
                    class="bg-gray-600 hover:bg-gray-700 text-white font-bold text-xs py-1 px-3 rounded-md transition-colors"
                >
                    Reload
                </button>
            </div>
        </div>
    `;
};
