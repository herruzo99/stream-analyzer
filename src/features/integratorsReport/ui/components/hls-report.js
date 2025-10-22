import { html } from 'lit-html';
import {
    statCardTemplate,
    listCardTemplate,
    sectionTemplate,
} from './shared.js';

export const hlsReportTemplate = (viewModel) => {
    const { network, timing, security, integration } = viewModel;

    const networkContent = html`
        ${listCardTemplate({
            label: 'Manifest/Playlist Hostnames',
            items: network.manifestHostnames,
            tooltip:
                'All servers that will be contacted to fetch manifest or playlist files. Required for firewall rules.',
        })}
        ${listCardTemplate({
            label: 'Media Segment Hostnames',
            items: network.mediaSegmentHostnames,
            tooltip:
                'All servers from which media segments will be fetched. This can differ from manifest hostnames.',
        })}
        ${listCardTemplate({
            label: 'Key/License Hostnames',
            items: network.keyLicenseHostnames,
            tooltip:
                'All servers contacted for decryption keys. These are high-priority endpoints for network configuration.',
        })}
        ${statCardTemplate({
            label: 'Avg. Segment Request Rate',
            value: network.avgSegmentRequestRate
                ? `1 every ${network.avgSegmentRequestRate.toFixed(2)}s`
                : 'N/A',
            tooltip:
                'The average frequency of media segment requests from the client.',
        })}
        ${statCardTemplate({
            label: 'Avg. Segment Size',
            value: network.avgSegmentSize
                ? `${(network.avgSegmentSize / 1024).toFixed(2)} KB`
                : 'N/A',
            tooltip:
                'The average size of each media segment, useful for estimating network load.',
        })}
        ${network.contentSteering
            ? statCardTemplate({
                  label: 'Content Steering Server',
                  value: network.contentSteering.serverUri,
                  tooltip:
                      'The URI of the Content Steering manifest for server-side CDN redundancy and load balancing.',
                  isoRef: 'HLS: 4.4.6.6',
              })
            : ''}
    `;

    const timingContent = timing
        ? html`
              ${statCardTemplate({
                  label: 'Recommended Polling Interval',
                  value: timing.pollingInterval
                      ? `${timing.pollingInterval}s`
                      : 'N/A',
                  tooltip:
                      'The safe interval for a client to reload the manifest for updates without overloading the server.',
                  isoRef: 'HLS: 6.3.4',
              })}
              ${statCardTemplate({
                  label: 'DVR / Time-Shift Window',
                  value: timing.dvrWindow
                      ? `${timing.dvrWindow.toFixed(2)}s`
                      : 'N/A',
                  tooltip:
                      'The available duration for seeking backward in the live stream.',
              })}
              ${statCardTemplate({
                  label: 'Low-Latency Mode',
                  value: timing.lowLatency.active
                      ? `Yes (${timing.lowLatency.mechanism})`
                      : 'No',
                  isCode: false,
                  tooltip:
                      'Indicates if low-latency streaming features are active, requiring a different player configuration.',
              })}
              ${timing.lowLatency.active
                  ? statCardTemplate({
                        label: 'Target Latency',
                        value: timing.targetLatency
                            ? `${timing.targetLatency}s`
                            : 'Not Specified',
                        tooltip:
                            'The server-advertised target latency (PART-HOLD-BACK), providing a concrete goal for player tuning.',
                        isoRef: 'HLS: 4.4.3.8',
                    })
                  : ''}
              ${timing.lowLatency.active
                  ? statCardTemplate({
                        label: 'Part Target Duration',
                        value: timing.partTargetDuration
                            ? `${timing.partTargetDuration}s`
                            : 'N/A',
                        tooltip:
                            'The target duration for Low-Latency HLS Partial Segments.',
                        isoRef: 'HLS: 4.4.3.7',
                    })
                  : ''}
              ${timing.lowLatency.active
                  ? statCardTemplate({
                        label: 'Blocking Request Support',
                        value: timing.blockingRequestSupport ? 'Yes' : 'No',
                        isCode: false,
                        tooltip:
                            'Indicates if the server supports blocking playlist reloads, allowing for more efficient updates.',
                        isoRef: 'HLS: 4.4.3.8',
                    })
                  : ''}
          `
        : html`<div class="col-span-full text-sm text-gray-400">
              Timing report is only applicable for Live streams.
          </div>`;

    const securityContent = html`
        ${statCardTemplate({
            label: 'Encryption Status',
            value: security.isEncrypted ? 'Yes' : 'No',
            isCode: false,
            tooltip:
                'Indicates if the stream is encrypted and requires a decryption pipeline.',
        })}
        ${listCardTemplate({
            label: 'DRM Systems (KEYFORMAT)',
            items: security.drmSystems.map((s) => s.name),
            tooltip:
                'Detected DRM systems and their unique schemeIdUris, needed for EME APIs.',
            isoRef: 'HLS: 4.4.4.4',
        })}
        ${listCardTemplate({
            label: 'License Server URL(s)',
            items: security.licenseServerUrls,
            tooltip: 'License server URLs provided by the user.',
        })}
        ${listCardTemplate({
            label: 'Key IDs (KEYID)',
            items: security.defaultKIDs,
            tooltip:
                'The Key IDs found in the manifest, crucial for debugging decryption. Note: KEYID is not part of the HLS RFC but is common practice.',
            isoRef: 'Vendor-Specific',
        })}
        ${statCardTemplate({
            label: 'HLS Encryption Method',
            value: security.hlsEncryptionMethod,
            tooltip:
                'The specific encryption method used (e.g., SAMPLE-AES, AES-128).',
            isoRef: 'HLS: 4.3.2.4',
        })}
    `;

    const integrationContent = html`
        ${statCardTemplate({
            label: 'Required HLS Version',
            value: integration.requiredHlsVersion,
            tooltip:
                'The minimum HLS version required to support all features in the manifest.',
            isoRef: 'HLS: 4.3.1.2',
        })}
        ${statCardTemplate({
            label: 'Segment Container Format',
            value: integration.segmentContainerFormat,
            tooltip:
                'The container format of media segments (e.g., ISOBMFF, MPEG-2 TS).',
        })}
        ${statCardTemplate({
            label: 'Trick Play Support',
            value: integration.trickPlaySupport ? 'Yes' : 'No',
            isCode: false,
            tooltip:
                'Indicates if dedicated I-Frame playlists are available for fast-forward/rewind.',
            isoRef: 'HLS: 4.3.4.3',
        })}
        ${listCardTemplate({
            label: 'Subtitle Formats',
            items: integration.subtitleFormats,
            tooltip:
                'The specific formats used for subtitles or captions (e.g., WebVTT, IMSC1).',
        })}
        ${listCardTemplate({
            label: 'Required Codecs',
            items: integration.requiredCodecs,
            tooltip:
                'A consolidated list of all unique codecs the player must support.',
        })}
    `;

    return html`
        <div class="space-y-8">
            ${sectionTemplate('Network & Delivery Profile', networkContent)}
            ${sectionTemplate('Timing & Update Strategy (Live)', timingContent)}
            ${sectionTemplate('Security & Encryption', securityContent)}
            ${sectionTemplate(
                'Player Integration Requirements',
                integrationContent
            )}
        </div>
    `;
};