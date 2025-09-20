import { html } from 'lit-html';
import { tooltipTriggerClasses } from '../../shared/constants.js';

const statCardTemplate = (label, value, tooltipText, isoRef) => {
    if (
        value === null ||
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
    )
        return '';
    return html` <div
        class="bg-gray-800 p-4 rounded-lg border border-gray-700"
    >
        <dt
            class="text-sm font-medium text-gray-400 ${tooltipTriggerClasses}"
            data-tooltip="${tooltipText}"
            data-iso="${isoRef}"
        >
            ${label}
        </dt>
        <dd class="text-lg text-left font-mono text-white mt-1 break-words">
            ${value}
        </dd>
    </div>`;
};

const formatBitrate = (bps) => {
    if (!bps || isNaN(bps)) return 'N/A';
    if (bps >= 1000000) return `${(bps / 1000000).toFixed(2)} Mbps`;
    return `${(bps / 1000).toFixed(0)} kbps`;
};

export function getGlobalSummaryTemplate(manifest) {
    if (!manifest) return html`<p class="warn">No manifest data to display.</p>`;

    const videoSets = manifest.periods.flatMap((p) =>
        p.adaptationSets.filter((as) => as.contentType === 'video')
    );
    const audioSets = manifest.periods.flatMap((p) =>
        p.adaptationSets.filter((as) => as.contentType === 'audio')
    );
    const textSets = manifest.periods.flatMap((p) =>
        p.adaptationSets.filter(
            (as) =>
                as.contentType === 'text' || as.contentType === 'application'
        )
    );
    const protectionSchemes = [
        ...new Set(
            manifest.periods
                .flatMap((p) => p.adaptationSets)
                .flatMap((as) => as.contentProtection)
                .map((cp) => cp.system)
        ),
    ];
    const protectionText =
        protectionSchemes.length > 0
            ? `Yes (${protectionSchemes.join(', ')})`
            : 'No';

    const allVideoReps = videoSets.flatMap((as) => as.representations);
    const bandwidths = allVideoReps.map((r) => r.bandwidth).filter(Boolean);
    const resolutions = [
        ...new Set(allVideoReps.map((r) => `${r.width}x${r.height}`)),
    ].filter((r) => r !== 'nullxnull');
    const videoCodecs = [
        ...new Set(allVideoReps.map((r) => r.codecs)),
    ].filter(Boolean);

    const languages = [...new Set(audioSets.map((as) => as.lang))].filter(
        Boolean
    );
    const audioCodecs = [
        ...new Set(audioSets.flatMap((as) => as.representations).map((r) => r.codecs)),
    ].filter(Boolean);

    return html`
        <div class="space-y-8">
            <div>
                <h3 class="text-xl font-bold mb-4">Manifest Properties</h3>
                <dl
                    class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                    ${statCardTemplate(
                        'Presentation Type',
                        manifest.type,
                        'Defines if the stream is live (`dynamic`) or on-demand (`static`).',
                        'DASH: 5.3.1.2 / HLS: 4.3.3.5'
                    )}
                    ${statCardTemplate(
                        'Profiles / Version',
                        manifest.profiles,
                        'Indicates the set of features used in the manifest.',
                        'DASH: 8.1 / HLS: 4.3.1.2'
                    )}
                    ${statCardTemplate(
                        'Min Buffer Time / Target Duration',
                        manifest.minBufferTime ? `${manifest.minBufferTime}s` : 'N/A',
                        'The minimum buffer a client should maintain (DASH) or the max segment duration (HLS).',
                        'DASH: 5.3.1.2 / HLS: 4.3.3.1'
                    )}
                    ${manifest.type === 'dynamic'
                        ? html`
                              ${statCardTemplate(
                                  'Publish Time',
                                  manifest.publishTime?.toLocaleString(),
                                  'The time this manifest version was generated.',
                                  'DASH: 5.3.1.2'
                              )}
                              ${statCardTemplate(
                                  'Availability Start Time',
                                  manifest.availabilityStartTime?.toLocaleString(),
                                  'The anchor time for the presentation.',
                                  'DASH: 5.3.1.2'
                              )}
                              ${statCardTemplate(
                                  'Update Period',
                                  manifest.minimumUpdatePeriod
                                      ? `${manifest.minimumUpdatePeriod}s`
                                      : 'N/A',
                                  'How often a client should check for a new manifest.',
                                  'DASH: 5.3.1.2'
                              )}
                              ${statCardTemplate(
                                  'Time Shift Buffer Depth',
                                  manifest.timeShiftBufferDepth
                                      ? `${manifest.timeShiftBufferDepth}s`
                                      : 'N/A',
                                  'The duration of the seekable live window.',
                                  'DASH: 5.3.1.2'
                              )}
                          `
                        : html`
                              ${statCardTemplate(
                                  'Media Duration',
                                  manifest.duration ? `${manifest.duration.toFixed(2)}s` : 'N/A',
                                  'The total duration of the content.',
                                  'DASH: 5.3.1.2'
                              )}
                          `}
                </dl>
            </div>

            <div>
                <h3 class="text-xl font-bold mb-4">Content Overview</h3>
                <dl
                    class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                    ${statCardTemplate(
                        'Periods',
                        manifest.periods.length,
                        'A Period represents a segment of content (DASH). HLS is treated as a single period.',
                        'DASH: 5.3.2'
                    )}
                    ${statCardTemplate(
                        'Video Tracks / Variants',
                        videoSets.length,
                        'Number of distinct video tracks or variants.',
                        'DASH: 5.3.3 / HLS: 4.3.4.2'
                    )}
                    ${statCardTemplate(
                        'Audio Tracks / Renditions',
                        audioSets.length,
                        'Number of distinct audio tracks or renditions.',
                        'DASH: 5.3.3 / HLS: 4.3.4.1'
                    )}
                    ${statCardTemplate(
                        'Subtitle/Text Tracks',
                        textSets.length,
                        'Number of distinct subtitle or text tracks.',
                        'DASH: 5.3.3 / HLS: 4.3.4.1'
                    )}
                    ${statCardTemplate(
                        'Content Protection',
                        protectionText,
                        'Detected DRM Systems or encryption methods.',
                        'DASH: 5.8.4.1 / HLS: 4.3.2.4'
                    )}
                </dl>
            </div>

            ${videoSets.length > 0
                ? html` <div>
                      <h3 class="text-xl font-bold mb-4">Video Details</h3>
                      <dl
                          class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                      >
                          ${statCardTemplate(
                              'Bitrate Range',
                              bandwidths.length > 0
                                  ? `${formatBitrate(Math.min(...bandwidths))} - ${formatBitrate(Math.max(...bandwidths))}`
                                  : 'N/A',
                              'The minimum and maximum bitrates for video.',
                              'DASH: 5.3.5.2 / HLS: 4.3.4.2'
                          )}
                          ${statCardTemplate(
                              'Resolutions',
                              resolutions.join(', '),
                              'Unique video resolutions available.',
                              'DASH: 5.3.7.2 / HLS: 4.3.4.2'
                          )}
                          ${statCardTemplate(
                              'Video Codecs',
                              videoCodecs.join(', '),
                              'Unique video codecs declared.',
                              'DASH: 5.3.7.2 / HLS: 4.3.4.2'
                          )}
                      </dl>
                  </div>`
                : ''}
            ${audioSets.length > 0
                ? html` <div>
                      <h3 class="text-xl font-bold mb-4">Audio Details</h3>
                      <dl
                          class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                      >
                          ${statCardTemplate(
                              'Languages',
                              languages.join(', ') || 'Not Specified',
                              'Languages declared for audio tracks.',
                              'DASH: 5.3.3.2 / HLS: 4.3.4.1'
                          )}
                          ${statCardTemplate(
                              'Audio Codecs',
                              audioCodecs.join(', '),
                              'Unique audio codecs declared.',
                              'DASH: 5.3.7.2 / HLS: 4.3.4.2'
                          )}
                      </dl>
                  </div>`
                : ''}
        </div>
    `;
}