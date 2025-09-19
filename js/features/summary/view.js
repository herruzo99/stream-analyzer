import { html } from 'lit-html';
import { tooltipTriggerClasses } from '../../shared/constants.js';
import { getDrmSystemName } from '../../shared/utils/drm.js';

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
    ];
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
                        'Clause 5.3.1.2, Table 3'
                    )}
                    ${statCardTemplate(
                        'Profiles',
                        (manifest.profiles || '').replace(
                            /urn:mpeg:dash:profile:/g,
                            ' '
                        ),
                        'Indicates the set of features used in the manifest.',
                        'Clause 8.1'
                    )}
                    ${statCardTemplate(
                        'Min Buffer Time',
                        manifest.minBufferTime ? `${manifest.minBufferTime}s` : 'N/A',
                        'The minimum buffer time a client should maintain.',
                        'Clause 5.3.1.2, Table 3'
                    )}
                    ${manifest.type === 'dynamic'
                        ? html`
                              ${statCardTemplate(
                                  'Publish Time',
                                  manifest.publishTime?.toLocaleString(),
                                  'The time this manifest version was generated.',
                                  'Clause 5.3.1.2, Table 3'
                              )}
                              ${statCardTemplate(
                                  'Availability Start Time',
                                  manifest.availabilityStartTime?.toLocaleString(),
                                  'The anchor time for the presentation.',
                                  'Clause 5.3.1.2, Table 3'
                              )}
                              ${statCardTemplate(
                                  'Update Period',
                                  manifest.minimumUpdatePeriod
                                      ? `${manifest.minimumUpdatePeriod}s`
                                      : 'N/A',
                                  'How often a client should check for a new manifest.',
                                  'Clause 5.3.1.2, Table 3'
                              )}
                              ${statCardTemplate(
                                  'Time Shift Buffer Depth',
                                  manifest.timeShiftBufferDepth
                                      ? `${manifest.timeShiftBufferDepth}s`
                                      : 'N/A',
                                  'The duration of the seekable live window.',
                                  'Clause 5.3.1.2, Table 3'
                              )}
                          `
                        : html`
                              ${statCardTemplate(
                                  'Media Duration',
                                  manifest.duration ? `${manifest.duration}s` : 'N/A',
                                  'The total duration of the content.',
                                  'Clause 5.3.1.2, Table 3'
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
                        'A Period represents a segment of content.',
                        'Clause 5.3.2'
                    )}
                    ${statCardTemplate(
                        'Video Tracks',
                        videoSets.length,
                        'Number of distinct video Adaptation Sets.',
                        'Clause 5.3.3'
                    )}
                    ${statCardTemplate(
                        'Audio Tracks',
                        audioSets.length,
                        'Number of distinct audio Adaptation Sets.',
                        'Clause 5.3.3'
                    )}
                    ${statCardTemplate(
                        'Subtitle/Text Tracks',
                        textSets.length,
                        'Number of distinct subtitle or text Adaptation Sets.',
                        'Clause 5.3.3'
                    )}
                    ${statCardTemplate(
                        'Content Protection',
                        protectionText,
                        'Detected DRM Systems.',
                        'Clause 5.8.4.1'
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
                              'Clause 5.3.5.2, Table 9'
                          )}
                          ${statCardTemplate(
                              'Resolutions',
                              resolutions.join(', '),
                              'Unique video resolutions available.',
                              'Clause 5.3.7.2, Table 14'
                          )}
                          ${statCardTemplate(
                              'Video Codecs',
                              videoCodecs.join(', '),
                              'Unique video codecs declared.',
                              'Clause 5.3.7.2, Table 14'
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
                              'Clause 5.3.3.2, Table 5'
                          )}
                          ${statCardTemplate(
                              'Audio Codecs',
                              audioCodecs.join(', '),
                              'Unique audio codecs declared.',
                              'Clause 5.3.7.2, Table 14'
                          )}
                      </dl>
                  </div>`
                : ''}
        </div>
        <div class="dev-watermark">Summary v5.0</div>
    `;
}