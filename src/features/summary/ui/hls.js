import { html } from 'lit-html';
import { deliveryInfoTemplate } from './components/delivery.js';
import { hlsComplianceSummaryTemplate } from './components/hls-compliance.js';
import { hlsStructureTemplate } from './components/hls-structure.js';
import { hlsMediaPlaylistTemplate } from './components/hls-media-playlist.js';
import { statCardTemplate, listCardTemplate } from './components/shared.js';

export function getHlsSummaryTemplate(stream) {
    const summary = stream.manifest.summary;
    const isLive = stream.manifest.type === 'dynamic';

    if (!summary) {
        return html`<div class="text-warning p-4 text-center">
            <p class="font-bold">Summary data is incomplete for this view.</p>
        </div>`;
    }

    return html`
        <div class="space-y-8">
            <div>
                <h3 class="text-xl font-bold mb-4">General Properties</h3>
                <dl class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                    ${statCardTemplate({
                        label: 'Stream Type',
                        value: summary.general.streamType,
                        tooltip: 'Indicates if the stream is live (EVENT) or on-demand (VOD).',
                        isoRef: 'HLS: 4.3.3.5',
                        customClasses: `border-l-4 ${isLive ? 'border-danger' : 'border-info'}`,
                    })}
                    ${statCardTemplate({
                        label: 'HLS Version',
                        value: summary.hls.version,
                        tooltip: 'Indicates the compatibility version of the Playlist file.',
                        isoRef: 'HLS: 4.3.1.2',
                    })}
                    ${statCardTemplate({
                        label: 'Container Format',
                        value: summary.general.segmentFormat,
                        tooltip: 'The container format for media segments.',
                        isoRef: 'HLS: 4.3.2.5',
                    })}
                    ${statCardTemplate({
                        label: 'Media Duration',
                        value: summary.general.duration ? `${summary.general.duration.toFixed(2)}s` : null,
                        tooltip: 'The total duration of the content.',
                        isoRef: 'HLS: 4.3.3.5',
                    })}
                    ${statCardTemplate({
                        label: 'Target Duration',
                        value: summary.hls.targetDuration ? `${summary.hls.targetDuration}s` : null,
                        tooltip: 'The maximum Media Segment duration.',
                        isoRef: 'HLS: 4.3.3.1',
                    })}
                    ${isLive ? statCardTemplate({
                        label: 'DVR Window',
                        value: summary.hls.dvrWindow ? `${summary.hls.dvrWindow.toFixed(2)}s` : null,
                        tooltip: 'The available duration for seeking backward in the live stream, estimated from segment durations.',
                        isoRef: 'HLS: 6.3.3',
                    }) : ''}
                </dl>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                ${hlsComplianceSummaryTemplate(stream)}
                <div>
                    <h3 class="text-xl font-bold mb-4">Content & Security</h3>
                    <dl class="grid gap-4 grid-cols-1">
                        ${statCardTemplate({
                            label: 'I-Frame Playlists',
                            value: summary.hls.iFramePlaylists > 0 ? summary.hls.iFramePlaylists : 0,
                            tooltip: 'Number of I-Frame only playlists for trick-play modes.',
                            isoRef: 'HLS: 4.3.4.3',
                        })}
                        ${statCardTemplate({
                            label: 'Encryption',
                            value: summary.security.isEncrypted,
                            tooltip: 'Indicates if the stream uses encryption.',
                            isoRef: 'HLS: 4.3.2.4',
                        })}
                        ${statCardTemplate({
                            label: 'HLS Encryption Method',
                            value: summary.security.hlsEncryptionMethod,
                            tooltip: 'The specific HLS encryption method used (AES-128 or SAMPLE-AES).',
                            isoRef: 'HLS: 4.3.2.4',
                        })}
                    </dl>
                </div>
            </div>
            
            ${hlsMediaPlaylistTemplate(summary)} ${hlsStructureTemplate(summary)} ${deliveryInfoTemplate(stream)}
        </div>
    `;
}