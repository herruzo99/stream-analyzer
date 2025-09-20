import { parseManifest as parseDashManifest } from '../protocols/dash/parser.js';
import { parseManifest as parseHlsManifest } from '../protocols/hls/parser.js';
import { diffManifest } from '../features/manifest-updates/diff.js';
import xmlFormatter from 'xml-formatter';
import { eventBus } from '../core/event-bus.js';
import { analysisState } from '../core/state.js';

/**
 * @typedef {object} StreamInput
 * @property {number} id
 * @property {string} url
 * @property {File} [file]
 */

async function analyzeStreams(inputs) {
    eventBus.dispatch('analysis:started');

    const promises = inputs.map(async (input) => {
        let manifestString = '',
            name = `Stream ${input.id + 1}`,
            originalUrl = '',
            baseUrl = '',
            protocol = 'unknown';
        try {
            if (input.url) {
                originalUrl = input.url;
                name = new URL(originalUrl).hostname;
                baseUrl = new URL(originalUrl, window.location.href).href;
                if (originalUrl.toLowerCase().includes('.m3u8'))
                    protocol = 'hls';
                else protocol = 'dash';
                eventBus.dispatch('ui:show-status', {
                    message: `Fetching ${name}...`,
                    type: 'info',
                });
                const response = await fetch(originalUrl);
                if (!response.ok)
                    throw new Error(`HTTP Error ${response.status}`);
                manifestString = await response.text();
            } else if (input.file) {
                const file = input.file;
                name = file.name;
                baseUrl = window.location.href;
                if (name.toLowerCase().includes('.m3u8')) protocol = 'hls';
                else protocol = 'dash';
                eventBus.dispatch('ui:show-status', {
                    message: `Reading ${name}...`,
                    type: 'info',
                });
                manifestString = await file.text();
            } else {
                return null;
            }
            eventBus.dispatch('ui:show-status', {
                message: `Parsing (${protocol.toUpperCase()}) for ${name}...`,
                type: 'info',
            });
            let parseResult;
            if (protocol === 'hls') {
                parseResult = await parseHlsManifest(manifestString, baseUrl);
            } else {
                parseResult = await parseDashManifest(manifestString, baseUrl);
            }
            const { manifest, baseUrl: newBaseUrl } = parseResult;
            baseUrl = newBaseUrl;

            const streamObject = {
                id: input.id,
                name,
                originalUrl,
                baseUrl,
                protocol,
                manifest,
                rawManifest: manifestString,
                mediaPlaylists: new Map(),
                activeMediaPlaylistUrl: null,
            };

            // Correctly initialize master playlist cache at creation time
            if (protocol === 'hls') {
                streamObject.mediaPlaylists.set('master', {
                    manifest: manifest,
                    rawManifest: manifestString,
                    lastFetched: new Date(),
                });
            }

            return streamObject;
        } catch (error) {
            const errorMessage = `Failed to process stream ${
                input.id + 1
            } (${name}): ${error.message}`;
            eventBus.dispatch('analysis:error', {
                message: errorMessage,
                error,
            });
            throw error;
        }
    });

    try {
        const results = (await Promise.all(promises)).filter(Boolean);
        if (results.length === 0) {
            eventBus.dispatch('analysis:completed', {
                streams: [],
                message: 'No valid streams to analyze.',
                status: 'warn',
            });
            return;
        }
        results.sort((a, b) => a.id - b.id);
        const manifestUpdates = [];
        const activeStream = results[0];
        const isSingleDynamicStream =
            results.length === 1 && activeStream.manifest.type === 'dynamic';
        if (isSingleDynamicStream) {
            const formattingOptions = {
                indentation: '  ',
                lineSeparator: '\n',
            };
            const formattedInitial =
                activeStream.protocol === 'dash'
                    ? xmlFormatter(activeStream.rawManifest, formattingOptions)
                    : activeStream.rawManifest;
            const initialDiffHtml = diffManifest('', formattedInitial);
            manifestUpdates.push({
                timestamp: new Date().toLocaleTimeString(),
                diffHtml: initialDiffHtml,
            });
        }
        eventBus.dispatch('state:analysis-complete', {
            streams: results,
            manifestUpdates: manifestUpdates,
            isPollingActive: isSingleDynamicStream,
        });
    } catch (error) {
        eventBus.dispatch('analysis:failed');
    }
}

async function activateHlsMediaPlaylist({ streamId, url }) {
    const stream = analysisState.streams.find((s) => s.id === streamId);
    if (!stream) return;

    if (url === 'master') {
        const master = stream.mediaPlaylists.get('master');
        if (master) {
            eventBus.dispatch('state:stream-updated', {
                streamId,
                updatedStreamData: {
                    manifest: master.manifest,
                    rawManifest: master.rawManifest,
                    activeMediaPlaylistUrl: null,
                },
            });
        }
        return;
    }

    if (stream.mediaPlaylists.has(url)) {
        const mediaPlaylist = stream.mediaPlaylists.get(url);
        eventBus.dispatch('state:stream-updated', {
            streamId,
            updatedStreamData: {
                manifest: mediaPlaylist.manifest,
                rawManifest: mediaPlaylist.rawManifest,
                activeMediaPlaylistUrl: url,
            },
        });
    } else {
        eventBus.dispatch('ui:show-status', {
            message: `Fetching HLS media playlist: ${url}`,
            type: 'info',
        });
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            const manifestString = await response.text();
            const { manifest } = await parseHlsManifest(manifestString, url);

            const newPlaylists = new Map(stream.mediaPlaylists);
            newPlaylists.set(url, {
                manifest,
                rawManifest: manifestString,
                lastFetched: new Date(),
            });

            eventBus.dispatch('state:stream-updated', {
                streamId,
                updatedStreamData: {
                    mediaPlaylists: newPlaylists,
                    manifest,
                    rawManifest: manifestString,
                    activeMediaPlaylistUrl: url,
                },
            });
            eventBus.dispatch('ui:show-status', {
                message: 'Media playlist loaded.',
                type: 'pass',
            });
        } catch (e) {
            console.error('Failed to fetch or parse media playlist:', e);
            eventBus.dispatch('ui:show-status', {
                message: `Failed to load media playlist: ${e.message}`,
                type: 'fail',
            });
        }
    }
}

// Service setup
eventBus.subscribe('analysis:request', ({ inputs }) => analyzeStreams(inputs));
eventBus.subscribe('hls:media-playlist-activate', activateHlsMediaPlaylist);