import { html } from 'lit-html';
import { deliveryInfoTemplate } from './components/delivery.js';
import { hlsComplianceSummaryTemplate } from './components/hls-compliance.js';
import { hlsStructureTemplate } from './components/hls-structure.js';
import { hlsMediaPlaylistTemplate } from './components/hls-media-playlist.js';
import { statCardTemplate, listCardTemplate } from './components/shared.js';

export function getHlsSummaryTemplate(stream) {
    // The stream object passed here now has its `manifest` property pointing
    // to the currently active context (master or media playlist).
    const summary = stream.manifest.summary;
    const isLive = stream.manifest.type === 'dynamic';

    return html`
        <div class="space-y-8">
            <!-- General Section -->
            <div>
                <h3 class="text-xl font-bold mb-4">General Properties</h3>
                <dl
                    class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                >
                    ${statCardTemplate(
                        'Stream Type',
                        summary.general.streamType,
                        'Indicates if the stream is live (EVENT) or on-demand (VOD).',
                        'HLS: 4.3.3.5',
                        `border-l-4 ${
                            summary.general.streamTypeColor === 'text-red-400'
                                ? 'border-red-500'
                                : 'border-blue-500'
                        }`
                    )}
                    ${statCardTemplate(
                        'HLS Version',
                        summary.hls.version,
                        'Indicates the compatibility version of the Playlist file.',
                        'HLS: 4.3.1.2'
                    )}
                    ${statCardTemplate(
                        'Container Format',
                        summary.general.segmentFormat,
                        'The container format for media segments.',
                        'HLS: 4.3.2.5'
                    )}
                    ${statCardTemplate(
                          'Media Duration',
                          summary.general.duration
                              ? `${summary.general.duration.toFixed(2)}s`
                              : null,
                          'The total duration of the content.',
                          'HLS: 4.3.3.5'
                    )}
                    ${statCardTemplate(
                        'Target Duration',
                        summary.hls.targetDuration
                            ? `${summary.hls.targetDuration}s`
                            : null,
                        'The maximum Media Segment duration.',
                        'HLS: 4.3.3.1'
                    )}
                    ${isLive
                        ? statCardTemplate(
                              'DVR Window',
                              summary.hls.dvrWindow ? `${summary.hls.dvrWindow.toFixed(2)}s` : null,
                              'The available duration for seeking backward in the live stream, estimated from segment durations.',
                              'HLS: 6.3.3'
                          )
                        : ''}
                </dl>
            </div>

            <!-- Low Latency Section -->
            <div>
                <h3 class="text-xl font-bold mb-4">Low-Latency Status</h3>
                <dl
                    class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                >
                    ${statCardTemplate(
                        'Low-Latency HLS',
                        summary.lowLatency.isLowLatency,
                        'Indicates if Low-Latency HLS features like PARTs and Preload Hints are in use.',
                        'HLS 2nd Ed: Appx. B'
                    )}
                    ${statCardTemplate(
                        'Part Target',
                        summary.lowLatency.partTargetDuration
                            ? `${summary.lowLatency.partTargetDuration}s`
                            : null,
                        'Target duration for LL-HLS Partial Segments.',
                        'HLS 2nd Ed: 4.4.3.7'
                    )}
                    ${statCardTemplate(
                        'Part Hold Back',
                        summary.lowLatency.partHoldBack
                            ? `${summary.lowLatency.partHoldBack}s`
                            : null,
                        'Server-recommended distance from the live edge for LL-HLS.',
                        'HLS 2nd Ed: 4.4.3.8'
                    )}
                    ${statCardTemplate(
                        'Can Block Reload',
                        summary.lowLatency.isLowLatency
                            ? summary.lowLatency.canBlockReload
                            : null,
                        'Indicates server support for blocking playlist reload requests for LL-HLS.',
                        'HLS 2nd Ed: 4.4.3.8'
                    )}
                </dl>
            </div>

            <!-- Compliance Section -->
            <div>${hlsComplianceSummaryTemplate(stream)}</div>

            <!-- Content & Security Section -->
            <div>
                <h3 class="text-xl font-bold mb-4">Content & Security</h3>
                <dl
                    class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                >
                    ${statCardTemplate(
                        'I-Frame Playlists',
                        summary.hls.iFramePlaylists > 0 ? summary.hls.iFramePlaylists : 0,
                        'Number of I-Frame only playlists for trick-play modes.',
                        'HLS: 4.3.4.3'
                    )}
                    ${statCardTemplate(
                        'Media Playlists',
                        summary.content.mediaPlaylists,
                        'Number of variant stream media playlists.',
                        'HLS: 4.3.4.2'
                    )}
                    ${statCardTemplate(
                        'Encryption',
                        summary.security.isEncrypted,
                        'Indicates if the stream uses encryption.',
                        'HLS: 4.3.2.4'
                    )}
                    ${statCardTemplate(
                        'HLS Encryption Method',
                        summary.security.hlsEncryptionMethod,
                        'The specific HLS encryption method used (AES-128 or SAMPLE-AES).',
                        'HLS: 4.3.2.4'
                    )}
                    ${listCardTemplate({
                        label: 'Key IDs (KIDs)',
                        items: summary.security.kids,
                        tooltip:
                            'Key IDs found in the manifest, crucial for debugging decryption.',
                    })}
                </dl>
            </div>

            <!-- Media Playlist Details (if applicable) -->
            ${hlsMediaPlaylistTemplate(summary)}

            <!-- Stream Structure -->
            ${hlsStructureTemplate(summary)}

            <!-- Delivery Info (Steering) -->
            ${deliveryInfoTemplate(stream)}
        </div>
    `;
}