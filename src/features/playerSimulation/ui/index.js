import { html, render } from 'lit-html';
import { playerService } from '../application/playerService.js';
import { bufferGraphTemplate } from './components/buffer-graph.js';
import { useAnalysisStore } from '@/state/analysisStore';
import { eventBus } from '@/application/event-bus';
import 'shaka-player/dist/controls.css';

let container = null;
let videoEl = null;
let videoContainer = null;
let qualityLevelsContainer = null;
let audioTracksContainer = null;
let bufferGraphContainer = null;
let subscriptions = [];
let animationFrameId = null;

function updateBufferGraph() {
    if (!playerService.isInitialized || !bufferGraphContainer || !videoEl) {
        return;
    }
    // Corrected: Pass the native video element's `buffered` property
    render(
        bufferGraphTemplate(
            videoEl.buffered,
            videoEl.duration,
            videoEl.currentTime
        ),
        bufferGraphContainer
    );
    animationFrameId = requestAnimationFrame(updateBufferGraph);
}

function updateTrackSelectors() {
    if (!playerService.isInitialized) return;
    const player = playerService.getPlayer();

    // --- Quality Levels ---
    const videoTracks = player
        .getVariantTracks()
        .filter((t) => t.type === 'variant');
    const qualityTemplate = html`
        <h4 class="font-bold mb-2">Quality Levels</h4>
        <div class="flex flex-wrap gap-2">
            <button
                @click=${() => {
                    player.configure({ abr: { enabled: true } });
                    updateTrackSelectors();
                }}
                class="px-3 py-1 text-sm rounded ${!player.getConfiguration()
                    .abr.enabled
                    ? 'bg-gray-600'
                    : 'bg-blue-600'}"
            >
                Auto
            </button>
            ${videoTracks.map(
                (track) => html`
                    <button
                        @click=${() => {
                            player.configure({ abr: { enabled: false } });
                            player.selectVariantTrack(track, true);
                            updateTrackSelectors();
                        }}
                        class="px-3 py-1 text-sm rounded ${track.active &&
                        !player.getConfiguration().abr.enabled
                            ? 'bg-blue-600'
                            : 'bg-gray-600'}"
                    >
                        ${track.height}p
                        (${(track.bandwidth / 1000).toFixed(0)}k)
                    </button>
                `
            )}
        </div>
    `;
    render(qualityTemplate, qualityLevelsContainer);

    // --- Audio Tracks ---
    const audioTracks = player
        .getVariantTracks()
        .filter((t) => t.type === 'variant' && t.audioCodec);
    const audioTemplate = html`
        <h4 class="font-bold mb-2 mt-4">Audio Tracks</h4>
        <div class="flex flex-wrap gap-2">
            ${audioTracks.map(
                (track) => html`
                    <button
                        @click=${() => {
                            player.selectVariantTrack(track, true);
                            updateTrackSelectors();
                        }}
                        class="px-3 py-1 text-sm rounded ${track.active
                            ? 'bg-blue-600'
                            : 'bg-gray-600'}"
                    >
                        ${track.language} (${track.label || 'default'})
                    </button>
                `
            )}
        </div>
    `;
    render(audioTemplate, audioTracksContainer);
}

function renderPlayerView() {
    if (!container) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);

    const template = html`
        <div class="space-y-6">
            <div
                id="video-container-element"
                data-shaka-player-container
                class="w-full max-w-4xl mx-auto bg-black aspect-video relative"
            >
                <video
                    id="player-video-element"
                    data-shaka-player
                    autoplay
                    class="w-full h-full"
                ></video>
            </div>

            <div
                id="buffer-graph-container-element"
                class="w-full max-w-4xl mx-auto"
            ></div>

            <div class="w-full max-w-4xl mx-auto bg-gray-800 p-4 rounded-lg">
                <div id="quality-levels-container-element"></div>
                <div id="audio-tracks-container-element"></div>
            </div>
        </div>
    `;
    render(template, container);

    videoEl = container.querySelector('#player-video-element');
    videoContainer = container.querySelector('#video-container-element');
    qualityLevelsContainer = container.querySelector(
        '#quality-levels-container-element'
    );
    audioTracksContainer = container.querySelector(
        '#audio-tracks-container-element'
    );
    bufferGraphContainer = container.querySelector(
        '#buffer-graph-container-element'
    );

    if (!stream?.originalUrl) {
        render(
            html`<p class="text-yellow-400">
                Player simulation requires a stream with a valid URL.
            </p>`,
            container
        );
        return;
    }

    playerService.initialize(videoEl, videoContainer);
    playerService.load(stream.originalUrl);
}

export const playerView = {
    mount(containerElement, { stream }) {
        container = containerElement;

        // Clean up any previous subscriptions
        subscriptions.forEach((unsub) => unsub());
        subscriptions = [];

        // Set up new subscriptions
        subscriptions.push(
            eventBus.subscribe('player:manifest-loaded', () => {
                updateTrackSelectors();
                updateBufferGraph();
            })
        );
        subscriptions.push(
            eventBus.subscribe('player:adaptation', updateTrackSelectors)
        );
        subscriptions.push(
            eventBus.subscribe('player:tracks-changed', updateTrackSelectors)
        );

        renderPlayerView();
    },

    unmount() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        playerService.destroy();
        subscriptions.forEach((unsub) => unsub());
        subscriptions = [];
        if (container) {
            render(html``, container);
        }

        container = null;
        videoEl = null;
        videoContainer = null;
        qualityLevelsContainer = null;
        audioTracksContainer = null;
        bufferGraphContainer = null;
        animationFrameId = null;
    },
};
