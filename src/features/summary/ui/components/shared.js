import { html } from 'lit-html';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { isCodecSupported } from '@/infrastructure/parsing/utils/codec-support';
import { formatBitrate } from '@/ui/shared/format';
import * as icons from '@/ui/icons';

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

    if (typeof sourcedData === 'boolean') {
        return sourcedData
            ? html`<span class="text-green-400 font-semibold">Yes</span>`
            : html`<span class="text-gray-400">No</span>`;
    }

    if (
        sourcedData === null ||
        sourcedData === undefined ||
        sourcedData === ''
    ) {
        return html`<span class="text-gray-500">N/A</span>`;
    }

    return sourcedData;
};

const renderCodecInfo = (codecInfo) => {
    const supportedIcon = codecInfo.supported
        ? html`<span class="inline-block ml-2 shrink-0"
              >${icons.checkCircle}</span
          >`
        : html`<span class="inline-block ml-2 shrink-0"
              >${icons.xCircle}</span
          >`;

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
    const testId = `stat-card-${label.toLowerCase().replace(/[\s/]+/g, '-')}`;

    // The card is now always rendered. The renderSourcedValue function handles the display logic for different value types.
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
            { text: 'Declared Bitrate' },
            { text: 'Bandwidth Model' },
            { text: 'Resolution' },
            { text: 'Codecs' },
            { text: 'Roles' },
            { text: 'Relationships' },
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

            const extendedBw = track.extendedBandwidth;
            const bandwidthModelCell = extendedBw
                ? html` <div class="flex items-center">
                      <span class="font-semibold text-yellow-300">VBR</span>
                      <span
                          class="${tooltipTriggerClasses} ml-2 text-cyan-400 cursor-help"
                          data-tooltip="VBR Model Pairs: ${extendedBw.modelPairs
                              .map(
                                  (p) =>
                                      `[${p.bufferTime}s: ${formatBitrate(p.bandwidth)}]`
                              )
                              .join(', ')}"
                      >
                          &#9432;
                      </span>
                  </div>`
                : html`<span class="text-gray-400">CBR</span>`;

            const relationshipsCell = html`
                <div class="flex items-center gap-2">
                    ${track.dependencyId
                        ? html`<span
                              class="bg-red-800 text-red-200 px-2 py-0.5 rounded-full text-xs ${tooltipTriggerClasses}"
                              data-tooltip="Depends on Rep(s): ${track.dependencyId}"
                              data-iso="DASH: 5.3.5.2"
                              >Dep</span
                          >`
                        : ''}
                    ${track.associationId
                        ? html`<span
                              class="bg-purple-800 text-purple-200 px-2 py-0.5 rounded-full text-xs ${tooltipTriggerClasses}"
                              data-tooltip="Associated with Rep(s): ${track.associationId}"
                              data-iso="DASH: 5.3.5.2"
                              >Assoc</span
                          >`
                        : ''}
                    ${track.mediaStreamStructureId
                        ? html`<span
                              class="bg-teal-800 text-teal-200 px-2 py-0.5 rounded-full text-xs ${tooltipTriggerClasses}"
                              data-tooltip="Shares structure with Rep(s): ${track.mediaStreamStructureId}"
                              data-iso="DASH: 5.3.5.2"
                              >Struct</span
                          >`
                        : ''}
                </div>
            `;

            return html`
                <tr>
                    <td class="p-2 font-mono">${track.id}</td>
                    <td class="p-2 font-mono">
                        ${track.bitrateRange || formatBitrate(track.bandwidth)}
                    </td>
                    <td class="p-2 font-mono">${bandwidthModelCell}</td>
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
                    <td class="p-2 font-mono">${relationshipsCell}</td>
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
