import { html } from 'lit-html';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { isCodecSupported } from '@/infrastructure/parsing/utils/codec-support';
import { formatBitrate } from '@/ui/shared/format';

const renderSourcedValue = (sourcedData) => {
    if (
        typeof sourcedData === 'object' &&
        sourcedData !== null &&
        'source' in sourcedData
    ) {
        return html`${sourcedData.value}${sourcedData.source === 'segment'
            ? html`<span
                  class="ml-1 text-cyan-400 ${tooltipTriggerClasses}"
                  data-tooltip="This value was derived by inspecting a media segment, not from the manifest."
                  >🔬</span
              >`
            : ''}`;
    }
    return sourcedData;
};

const renderCodecInfo = (codecInfo) => {
    const supportedIcon = codecInfo.supported
        ? html`<svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 text-green-400 inline-block ml-2 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
              title="Parser support available"
          >
              <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
              />
          </svg>`
        : html`<svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 text-red-400 inline-block ml-2 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
              title="Parser support not implemented"
          >
              <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"
              />
          </svg>`;

    return html`<div class="flex items-center">
        ${renderSourcedValue(codecInfo)}${supportedIcon}
    </div>`;
};

export const statCardTemplate = (
    label,
    value,
    tooltipText,
    isoRef,
    customClasses = ''
) => {
    if (
        value === null ||
        value === undefined ||
        (typeof value === 'object' && value.value === null) ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
    )
        return '';
    const testId = `stat-card-${label.toLowerCase().replace(/[\s/]+/g, '-')}`;
    return html`
        <div
            data-testid="${testId}"
            class="bg-gray-800 p-3 rounded-lg border border-gray-700 ${customClasses}"
        >
            <dt
                class="text-xs font-medium text-gray-400 ${tooltipTriggerClasses}"
                data-tooltip="${tooltipText}"
                data-iso="${isoRef}"
            >
                ${label}
            </dt>
            <dd
                class="text-base text-left font-mono text-white mt-1 break-words"
            >
                ${renderSourcedValue(value)}
            </dd>
        </div>
    `;
};

export const listCardTemplate = ({ label, items, tooltip, isoRef = null }) => {
    if (!items || items.length === 0) return '';
    return html`
        <div class="bg-gray-800 p-3 rounded-lg border border-gray-700">
            <dt
                class="text-xs font-medium text-gray-400 ${tooltipTriggerClasses}"
                data-tooltip="${tooltip}"
                data-iso="${isoRef || ''}"
            >
                ${label}
            </dt>
            <dd class="text-sm text-left font-mono text-white mt-2 space-y-1">
                ${items.map(
                    (item) =>
                        html`<div class="bg-gray-900/50 p-1 rounded">
                            ${renderSourcedValue(item)}
                        </div>`
                )}
            </dd>
        </div>
    `;
};

export const trackTableTemplate = (tracks, type) => {
    if (!tracks || tracks.length === 0) return '';
    let headers;
    let rows;

    if (type === 'video') {
        headers = [
            { text: 'ID' },
            { text: 'Bitrate' },
            { text: 'Resolution' },
            { text: 'Codecs' },
            {
                text: 'Roles',
                tooltip:
                    'Describes the purpose of a track (e.g., "main", "alternate", "commentary"). Often not specified if only one main track exists.',
            },
            {
                text: 'Dependencies',
                tooltip:
                    'For Scalable or Multi-view Video Coding (SVC/MVC). This is an advanced feature and is not commonly used.',
            },
        ];
        rows = tracks.map((track) => {
            // Defensive normalization to handle both summary objects and raw Representation IR
            let resolutions = track.resolutions;
            if (!resolutions && track.width && track.height) {
                resolutions =
                    track.width.value && track.height.value
                        ? [
                              {
                                  value: `${track.width.value}x${track.height.value}`,
                                  source: track.width.source,
                              },
                          ]
                        : [];
            } else if (!resolutions) {
                resolutions = [];
            }

            let codecs = track.codecs;
            if (codecs && !Array.isArray(codecs)) {
                codecs = codecs.value
                    ? [
                          {
                              value: codecs.value,
                              source: codecs.source,
                              supported: isCodecSupported(codecs.value),
                          },
                      ]
                    : [];
            } else if (!codecs) {
                codecs = [];
            }

            return html`
                <tr>
                    <td class="p-2 font-mono">${track.id}</td>
                    <td class="p-2 font-mono">
                        ${track.bitrateRange || formatBitrate(track.bandwidth)}
                    </td>
                    <td class="p-2 font-mono">
                        ${resolutions.length > 0
                            ? resolutions.map(
                                  (res, i) =>
                                      html`${i > 0
                                          ? ', '
                                          : ''}${renderSourcedValue(res)}`
                              )
                            : 'N/A'}
                    </td>
                    <td class="p-2 font-mono">
                        ${codecs.map((codec) => renderCodecInfo(codec)) ||
                        'N/A'}
                    </td>
                    <td class="p-2 font-mono">
                        ${track.roles?.join(', ') || 'N/A'}
                    </td>
                    <td class="p-2 font-mono">
                        ${track.dependencyId || 'N/A'}
                    </td>
                </tr>
            `;
        });
    } else if (type === 'audio') {
        headers = [
            { text: 'ID' },
            { text: 'Language' },
            { text: 'Codecs' },
            { text: 'Channels' },
            {
                text: 'Roles',
                tooltip:
                    'Describes the purpose of a track (e.g., "main", "alternate", "commentary").',
            },
        ];
        rows = tracks.map((track) => {
            // Defensive normalization
            let codecs = track.codecs;
            if (codecs && !Array.isArray(codecs)) {
                codecs = codecs.value
                    ? [
                          {
                              value: codecs.value,
                              source: codecs.source,
                              supported: isCodecSupported(codecs.value),
                          },
                      ]
                    : [];
            } else if (!codecs) {
                codecs = [];
            }

            return html`
                <tr>
                    <td class="p-2 font-mono">${track.id}</td>
                    <td class="p-2 font-mono">${track.lang || 'N/A'}</td>
                    <td class="p-2 font-mono">
                        ${codecs.map((codec) => renderCodecInfo(codec)) ||
                        'N/A'}
                    </td>
                    <td class="p-2 font-mono">${track.channels || 'N/A'}</td>
                    <td class="p-2 font-mono">
                        ${track.roles?.join(', ') || 'N/A'}
                    </td>
                </tr>
            `;
        });
    } else {
        // text
        headers = [
            { text: 'ID' },
            { text: 'Language' },
            { text: 'Format' },
            {
                text: 'Roles',
                tooltip:
                    'Describes the purpose of a track (e.g., "caption", "subtitle", "forced").',
            },
        ];
        rows = tracks.map((track) => {
            // Defensive normalization
            let codecsOrMimeTypes = track.codecsOrMimeTypes;
            if (codecsOrMimeTypes === undefined) {
                const value = track.codecs?.value || track.mimeType;
                codecsOrMimeTypes = value
                    ? [
                          {
                              value: value,
                              source: 'manifest',
                              supported: isCodecSupported(value),
                          },
                      ]
                    : [];
            }

            return html`
                <tr>
                    <td class="p-2 font-mono">${track.id}</td>
                    <td class="p-2 font-mono">${track.lang || 'N/A'}</td>
                    <td class="p-2 font-mono">
                        ${codecsOrMimeTypes.map((item) =>
                            renderCodecInfo(item)
                        ) || 'N/A'}
                    </td>
                    <td class="p-2 font-mono">
                        ${track.roles?.join(', ') || 'N/A'}
                    </td>
                </tr>
            `;
        });
    }

    return html`
        <div
            class="bg-gray-900/50 rounded border border-gray-700/50 overflow-x-auto"
        >
            <table class="w-full text-left text-xs min-w-[600px]">
                <thead class="bg-gray-800/50">
                    <tr>
                        ${headers.map(
                            (h) =>
                                html`<th
                                    class="p-2 font-semibold text-gray-400 ${h.tooltip
                                        ? tooltipTriggerClasses
                                        : ''}"
                                    data-tooltip="${h.tooltip || ''}"
                                >
                                    ${h.text}
                                </th>`
                        )}
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-700/50">
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
};
