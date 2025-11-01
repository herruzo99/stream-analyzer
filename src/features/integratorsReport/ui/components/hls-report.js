import { html } from 'lit-html';
import {
    statCardTemplate,
    listCardTemplate,
} from '../../../summary/ui/components/shared.js';
import * as icons from '@/ui/icons';
import { isCodecSupported } from '@/infrastructure/parsing/utils/codec-support';

const getStatusColorClass = (status) => {
    switch (status) {
        case 'pass':
            return 'text-green-400';
        case 'fail':
            return 'text-red-400';
        case 'info':
            return 'text-blue-400';
        default:
            return 'text-white';
    }
};

const requirementItem = ({
    icon,
    label,
    value,
    status,
    tooltip = '',
    isoRef = '',
}) => {
    const statusIcon = {
        pass: icons.checkCircle,
        fail: icons.xCircleRed,
        info: icons.informationCircle,
    }[status];

    return html`
        <div
            class="flex items-center justify-between p-3 border-b border-slate-800 last:border-b-0"
            data-tooltip=${tooltip}
            data-iso=${isoRef}
        >
            <div class="flex items-center gap-3">
                <span class="text-slate-300">${icon}</span>
                <span class="font-semibold text-slate-300">${label}</span>
            </div>
            <div class="flex items-center gap-2 font-mono text-sm">
                <span class="font-semibold text-white">${value}</span>
                <span class="w-5 h-5 ${getStatusColorClass(status)}"
                    >${statusIcon}</span
                >
            </div>
        </div>
    `;
};

const codecChecklist = (codecs) => {
    if (!codecs || codecs.length === 0) {
        return html`<p class="text-sm text-slate-500 px-4 py-2">
            No codecs specified.
        </p>`;
    }
    return html`
        <div class="divide-y divide-slate-800">
            ${codecs.map((codec) => {
                const isSupported = isCodecSupported(codec);
                return requirementItem({
                    icon: icons.clapperboard,
                    label: 'Codec',
                    value: codec,
                    status: isSupported ? 'pass' : 'fail',
                    tooltip: isSupported
                        ? `Codec "${codec}" is supported by internal parsers.`
                        : `Codec "${codec}" is not supported by internal parsers. Playback may fail.`,
                });
            })}
        </div>
    `;
};

export const hlsReportTemplate = (viewModel) => {
    const { network, timing, security, integration } = viewModel;

    const securityCard = html`
        <div class="bg-slate-900 rounded-lg border border-slate-700">
            <h4
                class="font-bold text-lg p-3 border-b border-slate-700 text-slate-100 flex items-center gap-2"
            >
                ${security.isEncrypted ? icons.lockClosed : icons.lockOpen}
                Security & Encryption
            </h4>
            <div class="divide-y divide-slate-800">
                ${requirementItem({
                    icon: icons.shieldCheck,
                    label: 'Encrypted',
                    value: security.isEncrypted ? 'Yes' : 'No',
                    status: security.isEncrypted ? 'fail' : 'pass',
                    tooltip:
                        'Indicates if the stream is encrypted and requires a decryption pipeline.',
                })}
                ${security.isEncrypted
                    ? html`
                          <div class="p-3">
                              ${statCardTemplate({
                                  label: 'HLS Encryption Method',
                                  value: security.hlsEncryptionMethod,
                                  tooltip:
                                      'The specific HLS encryption method used (e.g., SAMPLE-AES, AES-128).',
                                  isoRef: 'HLS: 4.3.2.4',
                                  icon: icons.key,
                              })}
                          </div>
                          <div class="p-3">
                              ${listCardTemplate({
                                  label: 'DRM Systems (KEYFORMAT)',
                                  items: security.drmSystems.map((s) => s.name),
                                  tooltip:
                                      'Detected DRM systems and their unique schemeIdUris, needed for EME APIs.',
                                  isoRef: 'HLS: 4.4.4.4',
                                  icon: icons.key,
                              })}
                          </div>
                      `
                    : ''}
            </div>
        </div>
    `;

    const supportCard = html`
        <div class="bg-slate-900 rounded-lg border border-slate-700">
            <h4
                class="font-bold text-lg p-3 border-b border-slate-700 text-slate-100 flex items-center gap-2"
            >
                ${icons.puzzle} Codec & Version Support
            </h4>
            <div class="p-3">
                <h5 class="font-semibold text-slate-300 text-sm mb-2">
                    Required Codecs
                </h5>
                ${codecChecklist(integration.requiredCodecs)}
            </div>
            <div class="p-3 border-t border-slate-800">
                ${requirementItem({
                    icon: icons.fileText,
                    label: 'Required HLS Version',
                    value: `v${integration.requiredHlsVersion}`,
                    status: 'info',
                    tooltip:
                        'The minimum HLS protocol version the player must support.',
                    isoRef: 'HLS: 4.3.1.2',
                })}
            </div>
        </div>
    `;

    const networkCard = html`
        <div class="bg-slate-900 rounded-lg border border-slate-700">
            <h4
                class="font-bold text-lg p-3 border-b border-slate-700 text-slate-100 flex items-center gap-2"
            >
                ${icons.network} Network & Delivery
            </h4>
            <div class="p-3 space-y-4">
                ${listCardTemplate({
                    label: 'Manifest/Playlist Hostnames',
                    items: network.manifestHostnames,
                    icon: icons.server,
                })}
                ${listCardTemplate({
                    label: 'Media Segment Hostnames',
                    items: network.mediaSegmentHostnames,
                    icon: icons.server,
                })}
                ${listCardTemplate({
                    label: 'Key/License Hostnames',
                    items: network.keyLicenseHostnames,
                    icon: icons.key,
                })}
            </div>
        </div>
    `;

    const timingCard = timing
        ? html` <div class="bg-slate-900 rounded-lg border border-slate-700">
              <h4
                  class="font-bold text-lg p-3 border-b border-slate-700 text-slate-100 flex items-center gap-2"
              >
                  ${icons.timer} Timing & Update Strategy (Live)
              </h4>
              <div class="p-3 space-y-4">
                  ${statCardTemplate({
                      label: 'Recommended Polling Interval',
                      value: timing.pollingInterval
                          ? `${timing.pollingInterval.toFixed(2)}s`
                          : 'N/A',
                      isoRef: 'HLS: 6.3.4',
                      icon: icons.updates,
                  })}
                  ${statCardTemplate({
                      label: 'Low-Latency Mode',
                      value: timing.lowLatency.active ? 'Yes' : 'No',
                      icon: icons.rabbit,
                      iconBgClass: timing.lowLatency.active
                          ? 'bg-blue-900/30 text-blue-300'
                          : 'bg-slate-800 text-slate-400',
                  })}
                  ${timing.lowLatency.active
                      ? statCardTemplate({
                            label: 'Target Latency (Part Hold Back)',
                            value: timing.targetLatency
                                ? `${timing.targetLatency}s`
                                : 'Not Specified',
                            isoRef: 'HLS: 4.4.3.8',
                            icon: icons.target,
                        })
                      : ''}
              </div>
          </div>`
        : html``;

    return html`
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div class="lg:col-span-2 space-y-6">
                ${securityCard} ${supportCard}
            </div>
            <div class="space-y-6">${networkCard} ${timingCard}</div>
        </div>
    `;
};
