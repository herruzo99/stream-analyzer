import { html } from 'lit-html';
import { tooltipTriggerClasses } from '../../../shared/constants.js';
import { deliveryInfoTemplate } from './components/delivery.js';

const statCardTemplate = (
    label,
    value,
    tooltipText,
    isoRef,
    customClasses = ''
) => {
    if (
        value === null ||
        value === undefined ||
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
                ${value}
            </dd>
        </div>
    `;
};

const trackTableTemplate = (tracks, type) => {
    if (!tracks || tracks.length === 0) return '';
    let headers;
    let rows;

    const formatBitrate = (bps) => {
        if (typeof bps === 'string' && bps.includes('bps')) return bps; // Already formatted
        if (!bps || isNaN(bps)) return 'N/A';
        if (bps >= 1000000) return `${(bps / 1000000).toFixed(2)} Mbps`;
        return `${(bps / 1000).toFixed(0)} kbps`;
    };

    if (type === 'video') {
        headers = ['ID', 'Bitrate', 'Resolution', 'Codecs', 'Scan Type', 'SAR'];
        rows = tracks.map(
            (track) => html`
                <tr>
                    <td class="p-2 font-mono">${track.id}</td>
                    <td class="p-2 font-mono">
                        ${track.bitrateRange || formatBitrate(track.bandwidth)}
                    </td>
                    <td class="p-2 font-mono">
                        ${track.resolutions?.join(', ') ||
                        `${track.width}x${track.height}`}
                    </td>
                    <td class="p-2 font-mono">
                        ${track.codecs?.join
                            ? track.codecs.join(', ')
                            : track.codecs || 'N/A'}
                    </td>
                    <td class="p-2 font-mono">${track.scanType || 'N/A'}</td>
                    <td class="p-2 font-mono">${track.sar || 'N/A'}</td>
                </tr>
            `
        );
    } else if (type === 'audio') {
        headers = ['ID', 'Bitrate', 'Codecs', 'Channels', 'Sample Rate'];
        rows = tracks.map(
            (track) => html`
                <tr>
                    <td class="p-2 font-mono">${track.id}</td>
                    <td class="p-2 font-mono">
                        ${track.bitrateRange || formatBitrate(track.bandwidth)}
                    </td>
                    <td class="p-2 font-mono">
                        ${track.codecs?.join
                            ? track.codecs.join(', ')
                            : track.codecs || 'N/A'}
                    </td>
                    <td class="p-2 font-mono">
                        ${track.channels?.join(', ') ||
                        track.audioChannelConfigurations
                            ?.map((c) => c.value)
                            .join(', ') ||
                        'N/A'}
                    </td>
                    <td class="p-2 font-mono">
                        ${track.audioSamplingRate || 'N/A'}
                    </td>
                </tr>
            `
        );
    } else {
        // text
        headers = ['ID', 'Bitrate', 'Format'];
        rows = tracks.map(
            (track) => html`
                <tr>
                    <td class="p-2 font-mono">${track.id}</td>
                    <td class="p-2 font-mono">
                        ${track.bitrateRange || formatBitrate(track.bandwidth)}
                    </td>
                    <td class="p-2 font-mono">
                        ${track.codecsOrMimeTypes?.join(', ') ||
                        track.codecs ||
                        track.mimeType ||
                        'N/A'}
                    </td>
                </tr>
            `
        );
    }

    return html`
        <div
            class="bg-gray-900/50 rounded border border-gray-700/50 overflow-x-auto"
        >
            <table class="w-full text-left text-xs">
                <thead class="bg-gray-800/50">
                    <tr>
                        ${headers.map(
                            (h) =>
                                html`<th
                                    class="p-2 font-semibold text-gray-400"
                                >
                                    ${h}
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

const adaptationSetTemplate = (as, type) => {
    const roles = as.roles.map((r) => r.value).join(', ');
    const title = `${
        type.charAt(0).toUpperCase() + type.slice(1)
    } AdaptationSet`;

    return html`
        <div class="space-y-2">
            <h5 class="font-semibold text-gray-300">
                ${title}:
                <span class="font-mono text-sm">${as.id || 'N/A'}</span>
                ${as.lang
                    ? html` <span class="text-sm font-normal"
                          >(Lang: ${as.lang})</span
                      >`
                    : ''}
                ${roles
                    ? html` <span class="text-sm font-normal"
                          >(Roles: ${roles})</span
                      >`
                    : ''}
            </h5>
            <div class="pl-4">
                ${trackTableTemplate(as.representations, type)}
            </div>
        </div>
    `;
};

const periodTemplate = (period, index) => html`
    <details class="bg-gray-800 rounded-lg border border-gray-700" open>
        <summary
            class="font-bold text-lg p-3 cursor-pointer hover:bg-gray-700/50"
        >
            Period ${index + 1}
            <span class="font-normal font-mono text-sm text-gray-400"
                >(ID: ${period.id || 'N/A'}, Start: ${period.start}s, Duration:
                ${period.duration ? period.duration + 's' : 'N/A'})</span
            >
        </summary>
        <div class="p-4 border-t border-gray-700 space-y-4">
            ${period.videoTracks.length > 0
                ? period.videoTracks.map((as) =>
                      adaptationSetTemplate(as, 'video')
                  )
                : html`<p class="text-xs text-gray-500">
                      No video Adaptation Sets in this period.
                  </p>`}
            ${period.audioTracks.length > 0
                ? period.audioTracks.map((as) =>
                      adaptationSetTemplate(as, 'audio')
                  )
                : ''}
            ${period.textTracks.length > 0
                ? period.textTracks.map((as) =>
                      adaptationSetTemplate(as, 'text')
                  )
                : ''}
        </div>
    </details>
`;

const protocolSectionTemplate = (summary) => {
    if (summary.dash) {
        return html`
            <h4 class="text-lg font-bold mb-3 mt-6">DASH Properties</h4>
            <dl
                class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
            >
                ${statCardTemplate(
                    'Min Buffer Time',
                    `${summary.dash.minBufferTime}s`,
                    'Minimum client buffer time.',
                    'DASH: 5.3.1.2'
                )}
                ${summary.general.streamType.startsWith('Live')
                    ? html`
                          ${statCardTemplate(
                              'Update Period',
                              `${summary.dash.minimumUpdatePeriod}s`,
                              'How often a client should check for a new manifest.',
                              'DASH: 5.3.1.2'
                          )}
                          ${statCardTemplate(
                              'Live Window (DVR)',
                              `${summary.dash.timeShiftBufferDepth}s`,
                              'The duration of the seekable live window.',
                              'DASH: 5.3.1.2'
                          )}
                          ${statCardTemplate(
                              'Availability Start',
                              summary.dash.availabilityStartTime?.toLocaleString(),
                              'The anchor time for the presentation.',
                              'DASH: 5.3.1.2'
                          )}
                          ${statCardTemplate(
                              'Publish Time',
                              summary.dash.publishTime?.toLocaleString(),
                              'The time this manifest version was generated.',
                              'DASH: 5.3.1.2'
                          )}
                      `
                    : ''}
            </dl>
        `;
    }
    if (summary.hls) {
        return html`
            <h4 class="text-lg font-bold mb-3 mt-6">HLS Properties</h4>
            <dl
                class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
            >
                ${statCardTemplate(
                    'HLS Version',
                    summary.hls.version,
                    'Indicates the compatibility version of the Playlist file.',
                    'HLS: 4.3.1.2'
                )}
                ${statCardTemplate(
                    'Target Duration',
                    summary.hls.targetDuration
                        ? `${summary.hls.targetDuration}s`
                        : null,
                    'The maximum Media Segment duration.',
                    'HLS: 4.3.3.1'
                )}
                ${statCardTemplate(
                    'I-Frame Playlists',
                    summary.hls.iFramePlaylists,
                    'Number of I-Frame only playlists for trick-play modes.',
                    'HLS: 4.3.4.3'
                )}
                ${statCardTemplate(
                    'Media Playlists',
                    summary.content.mediaPlaylists,
                    'Number of variant stream media playlists.',
                    'HLS: 4.3.4.2'
                )}
            </dl>
        `;
    }
    return '';
};

const profilesCardTemplate = (stream) => {
    const { manifest, protocol } = stream;
    const summary = manifest.summary;
    const profileString =
        (protocol === 'dash' ? summary.dash.profiles : summary.hls.version) ||
        '';
    const profiles =
        protocol === 'dash'
            ? profileString.split(',').map((p) => p.trim())
            : [`Version ${profileString}`];
    const supportedKeywords = ['isoff', 'mp2t', 'isobmff', 'ts'];
    let overallSupported = true;

    const profileDetails = profiles.map((profile) => {
        let isProfileSupported = false;
        let explanation =
            'This profile is not explicitly supported or its constraints are not validated by this tool.';

        if (protocol === 'dash') {
            isProfileSupported = supportedKeywords.some((keyword) =>
                profile.toLowerCase().includes(keyword)
            );
            if (isProfileSupported) {
                explanation =
                    'This is a standard MPEG-DASH profile based on a supported container format (ISOBMFF or MPEG-2 TS).';
                if (
                    profile.toLowerCase().includes('hbbtv') ||
                    profile.toLowerCase().includes('dash-if')
                ) {
                    isProfileSupported = false; // Mark as partial
                    explanation =
                        'This is a known extension profile. While the base format is supported, HbbTV or DASH-IF specific rules are not validated.';
                }
            }
        } else if (protocol === 'hls') {
            isProfileSupported =
                summary.general.segmentFormat === 'ISOBMFF' ||
                summary.general.segmentFormat === 'TS';
            explanation = `HLS support is determined by segment format. This stream uses ${summary.general.segmentFormat} segments, which are fully supported for analysis.`;
        }

        if (!isProfileSupported) {
            overallSupported = false;
        }

        return { profile, isSupported: isProfileSupported, explanation };
    });

    if (protocol === 'hls') {
        overallSupported = profileDetails[0]?.isSupported ?? false;
    }

    const overallIcon = overallSupported
        ? html`<svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
          >
              <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
          </svg>`
        : html`<svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
          >
              <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
          </svg>`;

    const overallStatusText = overallSupported
        ? 'Supported'
        : 'Partial/Unsupported';
    const overallStatusColor = overallSupported
        ? 'text-green-400'
        : 'text-yellow-400';
    const overallExplanation = overallSupported
        ? 'All declared profiles and formats are supported for analysis.'
        : 'One or more declared profiles have constraints that are not validated by this tool. Base stream analysis should still be accurate.';

    return html`
        <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <dt
                class="flex justify-between items-center text-sm font-medium text-gray-400 ${tooltipTriggerClasses}"
                data-tooltip="Indicates the set of features used in the manifest."
                data-iso="DASH: 8.1 / HLS: 4.3.1.2"
            >
                Declared Profiles / Version
                <div
                    class="flex items-center gap-2 ${tooltipTriggerClasses}"
                    data-tooltip="${overallExplanation}"
                >
                    ${overallIcon}
                    <span class="text-sm font-semibold ${overallStatusColor}"
                        >${overallStatusText}</span
                    >
                </div>
            </dt>
            <dd class="text-base text-left font-mono text-white mt-2 space-y-2">
                ${profileDetails.map(
                    (item) =>
                        html` <div
                            class="flex items-center gap-2 text-xs p-1 bg-gray-900/50 rounded"
                        >
                            <span
                                class="flex-shrink-0 ${tooltipTriggerClasses}"
                                data-tooltip="${item.explanation}"
                            >
                                ${item.isSupported
                                    ? html`<svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          class="h-4 w-4 text-green-400"
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                      >
                                          <path
                                              fill-rule="evenodd"
                                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                              clip-rule="evenodd"
                                          />
                                      </svg>`
                                    : html`<svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          class="h-4 w-4 text-yellow-400"
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                      >
                                          <path
                                              fill-rule="evenodd"
                                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                              clip-rule="evenodd"
                                          />
                                      </svg>`}
                            </span>
                            <span class="break-all">${item.profile}</span>
                        </div>`
                )}
            </dd>
        </div>
    `;
};

export function getGlobalSummaryTemplate(stream) {
    const { manifest } = stream;
    if (!manifest || !manifest.summary)
        return html`<p class="warn">No manifest summary data to display.</p>`;

    const summary = manifest.summary;
    const mediaPlaylistDetails = summary.hls?.mediaPlaylistDetails;

    const streamStructureTemplate = () => {
        if (stream.protocol === 'hls') {
            return html`
                ${summary.videoTracks.length > 0
                    ? html`<div>
                          <h4 class="text-lg font-bold mb-2">Video Tracks</h4>
                          ${trackTableTemplate(summary.videoTracks, 'video')}
                      </div>`
                    : ''}
                ${summary.audioTracks.length > 0
                    ? html`<div>
                          <h4 class="text-lg font-bold mb-2 mt-4">
                              Audio Renditions
                          </h4>
                          ${trackTableTemplate(summary.audioTracks, 'audio')}
                      </div>`
                    : ''}
                ${summary.textTracks.length > 0
                    ? html`<div>
                          <h4 class="text-lg font-bold mb-2 mt-4">
                              Text Renditions
                          </h4>
                          ${trackTableTemplate(summary.textTracks, 'text')}
                      </div>`
                    : ''}
            `;
        }
        // DASH protocol
        return summary.content.periods.length > 0
            ? html`
                  <div class="space-y-4">
                      ${summary.content.periods.map((p, i) =>
                          periodTemplate(p, i)
                      )}
                  </div>
              `
            : '';
    };

    return html`
        <div class="space-y-8">
            <!-- General Section -->
            <div>
                <h3 class="text-xl font-bold mb-4">General Properties</h3>
                <dl
                    class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                >
                    <div
                        class="bg-gray-800 p-4 rounded-lg border border-gray-700"
                    >
                        <dt
                            class="text-sm font-medium text-gray-400 ${tooltipTriggerClasses}"
                            data-tooltip="Indicates if the stream is live or on-demand."
                            data-iso="DASH: 5.3.1.2 / HLS: 4.3.3.5"
                        >
                            Stream Type
                        </dt>
                        <dd
                            class="text-lg font-semibold mt-1 break-words ${summary
                                .general.streamTypeColor}"
                        >
                            ${summary.general.streamType}
                        </dd>
                    </div>
                    ${statCardTemplate(
                        'Protocol',
                        summary.general.protocol,
                        'The streaming protocol detected for this manifest.',
                        'N/A'
                    )}
                    ${statCardTemplate(
                        'Container Format',
                        summary.general.segmentFormat,
                        'The container format used for media segments (e.g., ISOBMFF or MPEG-2 TS).',
                        'DASH: 5.3.7 / HLS: 4.3.2.5'
                    )}
                    ${statCardTemplate(
                        'Media Duration',
                        summary.general.duration
                            ? `${summary.general.duration.toFixed(2)}s`
                            : null,
                        'The total duration of the content.',
                        'DASH: 5.3.1.2'
                    )}
                </dl>
                ${protocolSectionTemplate(summary)}
            </div>
            <!-- Metadata Section -->
            <div>
                <h3 class="text-xl font-bold mb-4">Metadata & Delivery</h3>
                <dl
                    class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                >
                    ${statCardTemplate(
                        'Title',
                        summary.general.title,
                        'The title of the program.',
                        'DASH: 5.3.4'
                    )}
                    ${statCardTemplate(
                        'Segmenting Strategy',
                        summary.general.segmenting,
                        'The method used to define segment URLs and timing.',
                        'DASH: 5.3.9'
                    )}
                    ${profilesCardTemplate(stream)}
                    ${statCardTemplate(
                        'Alt. Locations',
                        summary.general.locations.length,
                        'Number of alternative manifest URLs provided.',
                        'DASH: 5.3.1.2'
                    )}
                </dl>
            </div>
            <!-- Low Latency Section -->
            ${summary.lowLatency?.isLowLatency
                ? html`
                      <div>
                          <h3 class="text-xl font-bold mb-4">
                              Low-Latency Status
                          </h3>
                          <dl
                              class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                          >
                              ${statCardTemplate(
                                  'Target Latency',
                                  summary.lowLatency.targetLatency
                                      ? `${summary.lowLatency.targetLatency}ms`
                                      : null,
                                  'The target latency for LL-DASH.',
                                  'DASH: K.3.2'
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
                                  summary.lowLatency.canBlockReload
                                      ? 'Yes'
                                      : null,
                                  'Indicates server support for blocking playlist reload requests for LL-HLS.',
                                  'HLS 2nd Ed: 4.4.3.8'
                              )}
                          </dl>
                      </div>
                  `
                : ''}
            <!-- Content Section -->
            <div>
                <h3 class="text-xl font-bold mb-4">Content & Security</h3>
                <dl
                    class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                >
                    ${statCardTemplate(
                        'Total Periods',
                        summary.content.totalPeriods,
                        'Number of distinct content periods. HLS is always 1.',
                        'DASH: 5.3.2'
                    )}
                    ${statCardTemplate(
                        'Total Video Tracks',
                        summary.content.totalVideoTracks,
                        'Total number of distinct video tracks or variants across all periods.',
                        'DASH: 5.3.3 / HLS: 4.3.4.2'
                    )}
                    ${statCardTemplate(
                        'Total Audio Tracks',
                        summary.content.totalAudioTracks,
                        'Total number of distinct audio tracks or renditions across all periods.',
                        'DASH: 5.3.3 / HLS: 4.3.4.1'
                    )}
                    ${statCardTemplate(
                        'Total Text Tracks',
                        summary.content.totalTextTracks,
                        'Total number of distinct subtitle or text tracks across all periods.',
                        'DASH: 5.3.3 / HLS: 4.3.4.1'
                    )}
                    ${summary.security
                        ? statCardTemplate(
                              'Encryption',
                              summary.security.isEncrypted
                                  ? summary.security.systems.join(', ')
                                  : 'No',
                              'Detected DRM Systems or encryption methods.',
                              'DASH: 5.8.4.1 / HLS: 4.3.2.4'
                          )
                        : ''}
                    ${summary.security?.kids.length > 0
                        ? statCardTemplate(
                              'Key IDs (KIDs)',
                              summary.security.kids.join(', '),
                              'Key IDs found in the manifest.',
                              'ISO/IEC 23001-7'
                          )
                        : ''}
                </dl>
            </div>

            <!-- Media Playlist Details Section (HLS Only) -->
            ${mediaPlaylistDetails
                ? html`
                      <div>
                          <h3 class="text-xl font-bold mb-4">
                              Media Playlist Details
                          </h3>
                          <dl
                              class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                          >
                              ${statCardTemplate(
                                  'Segment Count',
                                  mediaPlaylistDetails.segmentCount,
                                  'Total number of media segments in this playlist.',
                                  'HLS: 4.3.2.1'
                              )}
                              ${statCardTemplate(
                                  'Avg. Segment Duration',
                                  mediaPlaylistDetails.averageSegmentDuration?.toFixed(
                                      2
                                  ) + 's',
                                  'The average duration of all segments.',
                                  'HLS: 4.3.2.1'
                              )}
                              ${statCardTemplate(
                                  'Discontinuities Present',
                                  mediaPlaylistDetails.hasDiscontinuity
                                      ? 'Yes'
                                      : 'No',
                                  'Indicates if the playlist contains discontinuity tags, often used for ad insertion.',
                                  'HLS: 4.3.2.3'
                              )}
                              ${statCardTemplate(
                                  'I-Frame Only',
                                  mediaPlaylistDetails.isIFrameOnly
                                      ? 'Yes'
                                      : 'No',
                                  'Indicates if all segments in this playlist are I-Frame only.',
                                  'HLS: 4.3.3.6'
                              )}
                          </dl>
                      </div>
                  `
                : ''}

            <!-- Hierarchical Track Details -->
            <div>
                <h3 class="text-xl font-bold mb-4">Stream Structure</h3>
                <div class="space-y-4">${streamStructureTemplate()}</div>
            </div>
            ${stream.protocol === 'hls' ? deliveryInfoTemplate(stream) : ''}
        </div>
    `;
}
