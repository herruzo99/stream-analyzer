import { html } from 'lit-html';
import { createInfoTooltip } from '../ui.js';
import { getDrmSystemName } from '../helpers/drm-helper.js';

const rowTemplate = (label, value, tooltipText, isoRef) => {
    if (
        value === null ||
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
    )
        return '';
    return html` <div
        class="py-2 flex justify-between border-b border-gray-700 items-center flex-wrap"
    >
        <dt class="text-sm font-medium text-gray-400">
            ${label}${createInfoTooltip(tooltipText, isoRef)}
        </dt>
        <dd class="text-sm text-right font-mono text-white">${value}</dd>
    </div>`;
};

const formatBitrate = (bps) => {
    if (!bps || isNaN(bps)) return 'N/A';
    if (bps >= 1000000) return `${(bps / 1000000).toFixed(2)} Mbps`;
    return `${(bps / 1000).toFixed(0)} kbps`;
};

export function getGlobalSummaryTemplate(mpd) {
    if (!mpd) return html`<p class="warn">No MPD data to display.</p>`;

    const getAttr = (el, attr, defaultVal = 'N/A') =>
        el.getAttribute(attr) || defaultVal;

    const videoSets = Array.from(
        mpd.querySelectorAll(
            'AdaptationSet[contentType="video"], AdaptationSet[mimeType^="video"]'
        )
    );
    const audioSets = Array.from(
        mpd.querySelectorAll(
            'AdaptationSet[contentType="audio"], AdaptationSet[mimeType^="audio"]'
        )
    );
    const textSets = Array.from(
        mpd.querySelectorAll(
            'AdaptationSet[contentType="text"], AdaptationSet[contentType="application"], AdaptationSet[mimeType^="text"], AdaptationSet[mimeType^="application"]'
        )
    );
    const protectionSchemes = [
        ...new Set(
            Array.from(mpd.querySelectorAll('ContentProtection')).map((cp) =>
                getDrmSystemName(cp.getAttribute('schemeIdUri'))
            )
        ),
    ];
    const protectionText =
        protectionSchemes.length > 0
            ? `Yes (${protectionSchemes.join(', ')})`
            : 'No';

    const allVideoReps = videoSets.flatMap((as) =>
        Array.from(as.querySelectorAll('Representation'))
    );
    const bandwidths = allVideoReps
        .map((r) => parseInt(r.getAttribute('bandwidth')))
        .filter(Boolean);
    const resolutions = [
        ...new Set(
            allVideoReps.map((r) => {
                const as = r.closest('AdaptationSet');
                const width =
                    r.getAttribute('width') || as.getAttribute('width');
                const height =
                    r.getAttribute('height') || as.getAttribute('height');
                return `${width}x${height}`;
            })
        ),
    ];
    const videoCodecs = [
        ...new Set(
            allVideoReps.map(
                (r) =>
                    r.getAttribute('codecs') ||
                    r.closest('AdaptationSet').getAttribute('codecs')
            )
        ),
    ].filter(Boolean);

    const allAudioReps = audioSets.flatMap((as) =>
        Array.from(as.querySelectorAll('Representation'))
    );
    const languages = [
        ...new Set(audioSets.map((as) => as.getAttribute('lang'))),
    ].filter(Boolean);
    const audioCodecs = [
        ...new Set(
            allAudioReps.map(
                (r) =>
                    r.getAttribute('codecs') ||
                    r.closest('AdaptationSet').getAttribute('codecs')
            )
        ),
    ].filter(Boolean);
    const channelConfigs = [
        ...new Set(
            audioSets.map((as) =>
                as
                    .querySelector('AudioChannelConfiguration')
                    ?.getAttribute('value')
            )
        ),
    ].filter(Boolean);

    return html`
        <h3 class="text-xl font-bold mb-4">Manifest Properties</h3>
        <dl>
            ${rowTemplate(
                'Presentation Type',
                getAttr(mpd, 'type'),
                'Defines if the stream is live (`dynamic`) or on-demand (`static`).',
                'Clause 5.3.1.2, Table 3'
            )}
            ${rowTemplate(
                'Profiles',
                getAttr(mpd, 'profiles').replace(
                    /urn:mpeg:dash:profile:/g,
                    ' '
                ),
                'Indicates the set of features used in the manifest.',
                'Clause 8.1'
            )}
            ${rowTemplate(
                'Min Buffer Time',
                getAttr(mpd, 'minBufferTime'),
                'The minimum buffer time a client should maintain.',
                'Clause 5.3.1.2, Table 3'
            )}
            ${getAttr(mpd, 'type') === 'dynamic'
                ? html`
                      ${rowTemplate(
                          'Publish Time',
                          new Date(
                              getAttr(mpd, 'publishTime')
                          ).toLocaleString(),
                          'The time this MPD version was generated.',
                          'Clause 5.3.1.2, Table 3'
                      )}
                      ${rowTemplate(
                          'Availability Start Time',
                          new Date(
                              getAttr(mpd, 'availabilityStartTime')
                          ).toLocaleString(),
                          'The anchor time for the presentation.',
                          'Clause 5.3.1.2, Table 3'
                      )}
                      ${rowTemplate(
                          'Update Period',
                          getAttr(mpd, 'minimumUpdatePeriod'),
                          'How often a client should check for a new MPD.',
                          'Clause 5.3.1.2, Table 3'
                      )}
                      ${rowTemplate(
                          'Time Shift Buffer Depth',
                          getAttr(mpd, 'timeShiftBufferDepth'),
                          'The duration of the seekable live window.',
                          'Clause 5.3.1.2, Table 3'
                      )}
                  `
                : html`
                      ${rowTemplate(
                          'Media Duration',
                          getAttr(mpd, 'mediaPresentationDuration'),
                          'The total duration of the content.',
                          'Clause 5.3.1.2, Table 3'
                      )}
                  `}
        </dl>

        <h3 class="text-xl font-bold mt-6 mb-4">Content Overview</h3>
        <dl>
            ${rowTemplate(
                'Periods',
                mpd.querySelectorAll('Period').length,
                'A Period represents a segment of content.',
                'Clause 5.3.2'
            )}
            ${rowTemplate(
                'Video Tracks',
                videoSets.length,
                'Number of distinct video Adaptation Sets.',
                'Clause 5.3.3'
            )}
            ${rowTemplate(
                'Audio Tracks',
                audioSets.length,
                'Number of distinct audio Adaptation Sets.',
                'Clause 5.3.3'
            )}
            ${rowTemplate(
                'Subtitle/Text Tracks',
                textSets.length,
                'Number of distinct subtitle or text Adaptation Sets.',
                'Clause 5.3.3'
            )}
            ${rowTemplate(
                'Content Protection',
                protectionText,
                'Detected DRM Systems.',
                'Clause 5.8.4.1'
            )}
        </dl>

        ${videoSets.length > 0
            ? html` <h3 class="text-xl font-bold mt-6 mb-4">Video Details</h3>
                  <dl>
                      ${rowTemplate(
                          'Bitrate Range',
                          bandwidths.length > 0
                              ? `${formatBitrate(Math.min(...bandwidths))} - ${formatBitrate(Math.max(...bandwidths))}`
                              : 'N/A',
                          'The minimum and maximum bitrates for video.',
                          'Clause 5.3.5.2, Table 9'
                      )}
                      ${rowTemplate(
                          'Resolutions',
                          resolutions.join(', '),
                          'Unique video resolutions available.',
                          'Clause 5.3.7.2, Table 14'
                      )}
                      ${rowTemplate(
                          'Video Codecs',
                          videoCodecs.join(', '),
                          'Unique video codecs declared.',
                          'Clause 5.3.7.2, Table 14'
                      )}
                  </dl>`
            : ''}
        ${audioSets.length > 0
            ? html` <h3 class="text-xl font-bold mt-6 mb-4">Audio Details</h3>
                  <dl>
                      ${rowTemplate(
                          'Languages',
                          languages.join(', ') || 'Not Specified',
                          'Languages declared for audio tracks.',
                          'Clause 5.3.3.2, Table 5'
                      )}
                      ${rowTemplate(
                          'Audio Codecs',
                          audioCodecs.join(', '),
                          'Unique audio codecs declared.',
                          'Clause 5.3.7.2, Table 14'
                      )}
                      ${rowTemplate(
                          'Channel Configurations',
                          channelConfigs.map((c) => `${c} channels`).join(', '),
                          'Audio channel layouts (e.g., 2 for stereo).',
                          'Clause 5.8.5.4'
                      )}
                  </dl>`
            : ''}

        <div class="dev-watermark">Summary v3.0</div>
    `;
}
