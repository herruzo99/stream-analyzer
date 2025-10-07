import { html } from 'lit-html';
import { statCardTemplate, listCardTemplate, sectionTemplate } from './shared.js';

export const dashReportTemplate = (viewModel) => {
    const { network, timing, security, integration } = viewModel;

    const networkContent = html`
        ${listCardTemplate({
            label: 'Manifest/Playlist Hostnames',
            items: network.manifestHostnames,
            tooltip: 'All servers that will be contacted to fetch manifest or playlist files. Required for firewall rules.',
        })}
        ${listCardTemplate({
            label: 'Media Segment Hostnames',
            items: network.mediaSegmentHostnames,
            tooltip: 'All servers from which media segments will be fetched. This can differ from manifest hostnames.',
        })}
        ${statCardTemplate({
            label: 'Avg. Segment Request Rate',
            value: network.avgSegmentRequestRate ? `1 every ${network.avgSegmentRequestRate.toFixed(2)}s` : 'N/A',
            tooltip: 'The average frequency of media segment requests from the client.',
        })}
        ${statCardTemplate({
            label: 'Avg. Segment Size',
            value: network.avgSegmentSize ? `${(network.avgSegmentSize / 1024).toFixed(2)} KB` : 'N/A',
            tooltip: 'The average size of each media segment, useful for estimating network load.',
        })}
    `;

    const timingContent = timing ? html`
        ${statCardTemplate({
            label: 'Recommended Polling Interval',
            value: timing.pollingInterval ? `${timing.pollingInterval}s` : 'N/A',
            tooltip: 'The safe interval for a client to reload the manifest for updates without overloading the server.',
            isoRef: 'DASH: 5.3.1.2',
        })}
        ${statCardTemplate({
            label: 'DVR / Time-Shift Window',
            value: timing.dvrWindow ? `${timing.dvrWindow}s` : 'N/A',
            tooltip: 'The available duration for seeking backward in the live stream.',
            isoRef: 'DASH: 5.3.1.2',
        })}
        ${statCardTemplate({
            label: 'Low-Latency Mode',
            value: timing.lowLatency.active ? `Yes (${timing.lowLatency.mechanism})` : 'No',
            isCode: false,
            tooltip: 'Indicates if low-latency streaming features are active, requiring a different player configuration.',
        })}
        ${timing.lowLatency.active ? statCardTemplate({
            label: 'Target Latency',
            value: timing.targetLatency ? `${timing.targetLatency / 1000}s` : 'Not Specified',
            tooltip: 'The service provider-advertised target latency, providing a concrete goal for player tuning.',
            isoRef: 'DASH: Annex K.3.2',
        }) : ''}
        ${timing.lowLatency.active ? statCardTemplate({
            label: 'Chunk Duration',
            value: timing.chunkDuration ? `${timing.chunkDuration}s` : 'N/A',
            tooltip: 'The maximum duration of a low-latency sub-segment (chunk).',
            isoRef: 'DASH: 5.3.1.2',
        }) : ''}
    ` : html`<div class="col-span-full text-sm text-gray-400">Timing report is only applicable for Live streams.</div>`;

    const securityContent = html`
        ${statCardTemplate({
            label: 'Encryption Status',
            value: security.isEncrypted ? 'Yes' : 'No',
            isCode: false,
            tooltip: 'Indicates if the stream is encrypted and requires a decryption pipeline.',
        })}
        ${listCardTemplate({
            label: 'DRM Systems',
            items: security.drmSystems.map(s => `${s.name} (${s.uuid})`),
            tooltip: 'Detected DRM systems and their unique schemeIdUris, needed for EME APIs.',
            isoRef: 'DASH: 5.8.4.1',
        })}
        ${listCardTemplate({
            label: 'Default Key IDs (KIDs)',
            items: security.defaultKIDs,
            tooltip: 'The default Key IDs found in the manifest, crucial for debugging decryption.',
            isoRef: 'ISO/IEC 23001-7',
        })}
        ${listCardTemplate({
            label: 'EME Robustness Levels',
            items: security.emeRobustnessLevels,
            tooltip: 'Required EME robustness levels for playback (e.g., for hardware vs. software DRM).',
            isoRef: 'DASH: 5.8.4.1.4',
        })}
    `;
    
    const integrationContent = html`
        ${statCardTemplate({
            label: 'Required DASH Profiles',
            value: integration.requiredDashProfiles,
            tooltip: 'The DASH profiles the player must support to be compatible.',
            isoRef: 'DASH: 8.1',
        })}
        ${statCardTemplate({
            label: 'Segment Container Format',
            value: integration.segmentContainerFormat,
            tooltip: 'The container format of media segments (e.g., ISOBMFF, MPEG-2 TS).',
        })}
        ${statCardTemplate({
            label: 'Segment Alignment',
            value: integration.segmentAlignment ? 'Yes' : 'No',
            isCode: false,
            tooltip: 'Indicates if segments are aligned across Representations, simplifying ABR switching.',
            isoRef: 'DASH: 5.3.3.2',
        })}
        ${statCardTemplate({
            label: 'Trick Play Support',
            value: integration.trickPlaySupport ? 'Yes' : 'No',
            isCode: false,
            tooltip: 'Indicates if dedicated I-Frame tracks are available for fast-forward/rewind.',
            isoRef: 'DASH: 5.3.6',
        })}
        ${listCardTemplate({
            label: 'Subtitle Formats',
            items: integration.subtitleFormats,
            tooltip: 'The specific formats used for subtitles or captions (e.g., WebVTT, IMSC1).',
        })}
        ${listCardTemplate({
            label: 'Required Codecs',
            items: integration.requiredCodecs,
            tooltip: 'A consolidated list of all unique codecs the player must support.',
        })}
    `;

    return html`
        <div class="space-y-8">
            ${sectionTemplate('Network & Delivery Profile', networkContent)}
            ${sectionTemplate('Timing & Update Strategy (Live)', timingContent)}
            ${sectionTemplate('Security & Encryption', securityContent)}
            ${sectionTemplate('Player Integration Requirements', integrationContent)}
        </div>
    `;
};