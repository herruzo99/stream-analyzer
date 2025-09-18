import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { createInfoTooltip } from '../ui.js';
import { getDrmSystemName } from '../helpers/drm-helper.js';

/**
 * @typedef {object} FeatureCheckResult
 * @property {boolean} used
 * @property {string} details - A detailed string, can include simple HTML.
 */

/**
 * @typedef {object} Feature
 * @property {string} name
 * @property {'Core Streaming' | 'Timeline & Segment Management' | 'Live & Dynamic' | 'Advanced Content' | 'Client Guidance & Optimization' | 'Accessibility & Metadata'} category
 * @property {string} desc
 * @property {string} isoRef
 * @property {(mpd: Element) => FeatureCheckResult} check
 */

/** @type {Feature[]} */
const features = [
    // --- Core Streaming Features ---
    {
        name: 'Presentation Type',
        category: 'Core Streaming',
        desc: 'Defines if the stream is live (`dynamic`) or on-demand (`static`). This is the most fundamental property of a manifest.',
        isoRef: 'Clause 5.3.1.2',
        check: (mpd) => ({
            used: true,
            details: `<code>${mpd.getAttribute('type')}</code>`,
        }),
    },
    {
        name: 'Multi-Period Content',
        category: 'Core Streaming',
        desc: 'The presentation is split into multiple, independent periods. Commonly used for Server-Side Ad Insertion (SSAI) or chaptering.',
        isoRef: 'Clause 5.3.2',
        check: (mpd) => {
            const periods = mpd.querySelectorAll('Period');
            const used = periods.length > 1;
            const details = used
                ? `${periods.length} Periods found.`
                : 'Single Period manifest.';
            return { used, details };
        },
    },
    {
        name: 'Content Protection (DRM)',
        category: 'Core Streaming',
        desc: 'Indicates that the content is encrypted using one or more DRM schemes like Widevine, PlayReady, or FairPlay.',
        isoRef: 'Clause 5.8.4.1',
        check: (mpd) => {
            const p = Array.from(mpd.querySelectorAll('ContentProtection'));
            if (p.length === 0)
                return {
                    used: false,
                    details: 'No encryption descriptors found.',
                };
            const schemes = [
                ...new Set(
                    p.map((cp) =>
                        getDrmSystemName(cp.getAttribute('schemeIdUri'))
                    )
                ),
            ];
            return {
                used: true,
                details: `Systems: <b>${schemes.join(', ')}</b>`,
            };
        },
    },
    {
        name: 'CMAF Compatibility',
        category: 'Core Streaming',
        desc: 'Content is structured according to the Common Media Application Format (CMAF), enhancing compatibility across players.',
        isoRef: 'Clause 8.12',
        check: (mpd) => {
            const p = (mpd.getAttribute('profiles') || '').includes('cmaf');
            const b = Array.from(
                mpd.querySelectorAll(
                    'AdaptationSet[containerProfiles~="cmfc"], AdaptationSet[containerProfiles~="cmf2"]'
                )
            );
            if (!p && b.length === 0)
                return {
                    used: false,
                    details: 'No CMAF profiles or brands detected.',
                };
            const details = [];
            if (p) details.push('MPD declares a CMAF profile.');
            if (b.length > 0)
                details.push(
                    `CMAF brands found in ${b.length} AdaptationSet(s).`
                );
            return { used: true, details: details.join(' ') };
        },
    },

    // --- Timeline & Segment Management ---
    {
        name: 'Segment Templates',
        category: 'Timeline & Segment Management',
        desc: 'Segment URLs are generated using a template, typically with $Number$ or $Time$ placeholders.',
        isoRef: 'Clause 5.3.9.4',
        check: (mpd) => ({
            used: !!mpd.querySelector('SegmentTemplate'),
            details: 'Uses templates for segment URL generation.',
        }),
    },
    {
        name: 'Segment Timeline',
        category: 'Timeline & Segment Management',
        desc: 'Provides explicit timing and duration for each segment via <S> elements, allowing for variable segment sizes.',
        isoRef: 'Clause 5.3.9.6',
        check: (mpd) => ({
            used: !!mpd.querySelector('SegmentTimeline'),
            details: 'Provides explicit segment timing.',
        }),
    },
    {
        name: 'Segment List',
        category: 'Timeline & Segment Management',
        desc: 'Segment URLs are listed explicitly in the manifest. Common for VOD content.',
        isoRef: 'Clause 5.3.9.3',
        check: (mpd) => ({
            used: !!mpd.querySelector('SegmentList'),
            details: 'Provides an explicit list of segment URLs.',
        }),
    },

    // --- Live & Dynamic Features ---
    {
        name: 'Low Latency Streaming',
        category: 'Live & Dynamic',
        desc: 'The manifest includes features for low-latency playback, like chunked transfer hints and latency targets.',
        isoRef: 'Annex K.3.2',
        check: (mpd) => {
            if (mpd.getAttribute('type') !== 'dynamic')
                return {
                    used: false,
                    details: 'Not a dynamic (live) manifest.',
                };
            const hasLatency = !!mpd.querySelector(
                'ServiceDescription Latency'
            );
            const hasChunkHint = !!mpd.querySelector(
                'SegmentTemplate[availabilityTimeComplete="false"]'
            );
            if (!hasLatency && !hasChunkHint)
                return {
                    used: false,
                    details: 'No specific low-latency signals found.',
                };
            const details = [];
            if (hasLatency)
                details.push('<code>&lt;Latency&gt;</code> target defined.');
            if (hasChunkHint) details.push('Chunked transfer hint present.');
            return { used: true, details: details.join(' ') };
        },
    },
    {
        name: 'MPD Patch Updates',
        category: 'Live & Dynamic',
        desc: 'Allows efficient manifest updates by sending only the changed parts of the MPD.',
        isoRef: 'Clause 5.15',
        check: (mpd) => {
            const p = mpd.querySelector('PatchLocation');
            return {
                used: !!p,
                details: p
                    ? `Patch location: <code>${p.textContent.trim()}</code>`
                    : 'Uses full MPD reloads.',
            };
        },
    },
    {
        name: 'UTC Timing Source',
        category: 'Live & Dynamic',
        desc: 'Provides a source for clients to synchronize their wall-clock time, crucial for live playback.',
        isoRef: 'Clause 5.8.4.11',
        check: (mpd) => {
            const u = Array.from(mpd.querySelectorAll('UTCTiming'));
            if (u.length === 0)
                return {
                    used: false,
                    details: 'No clock synchronization source provided.',
                };
            const schemes = [
                ...new Set(
                    u.map(
                        (el) =>
                            `<code>${el.getAttribute('schemeIdUri').split(':').pop()}</code>`
                    )
                ),
            ];
            return { used: true, details: `Schemes: ${schemes.join(', ')}` };
        },
    },

    // --- Advanced Content Features ---
    {
        name: 'Dependent Representations (SVC/MVC)',
        category: 'Advanced Content',
        desc: 'Uses Representations that depend on others for decoding, enabling scalable video coding (SVC) or multi-view coding (MVC).',
        isoRef: 'Clause 5.3.5.2',
        check: (mpd) => {
            const d = mpd.querySelectorAll('Representation[dependencyId]');
            return {
                used: d.length > 0,
                details:
                    d.length > 0
                        ? `${d.length} dependent Representation(s) found.`
                        : 'All Representations are self-contained.',
            };
        },
    },
    {
        name: 'Trick Mode Tracks',
        category: 'Advanced Content',
        desc: 'Provides special, low-framerate or I-Frame only tracks to enable efficient fast-forward and rewind.',
        isoRef: 'Clause 5.3.6',
        check: (mpd) => {
            const s = mpd.querySelector('SubRepresentation[maxPlayoutRate]');
            const r = mpd.querySelector('AdaptationSet Role[value="trick"]');
            if (!s && !r)
                return {
                    used: false,
                    details: 'No explicit trick mode signals found.',
                };
            const details = [];
            if (s)
                details.push(
                    '<code>&lt;SubRepresentation&gt;</code> with <code>@maxPlayoutRate</code>'
                );
            if (r) details.push('<code>Role="trick"</code>');
            return {
                used: true,
                details: `Detected via: ${details.join(', ')}`,
            };
        },
    },

    // --- Accessibility & Metadata ---
    {
        name: 'Subtitles & Captions',
        category: 'Accessibility & Metadata',
        desc: 'Provides text-based tracks for subtitles, closed captions, or other timed text information.',
        isoRef: 'Clause 5.3.3',
        check: (mpd) => {
            const t = Array.from(
                mpd.querySelectorAll(
                    'AdaptationSet[contentType="text"], AdaptationSet[mimeType^="application"]'
                )
            );
            if (t.length === 0)
                return {
                    used: false,
                    details: 'No text or application AdaptationSets found.',
                };
            const languages = [
                ...new Set(
                    t.map((as) => as.getAttribute('lang')).filter(Boolean)
                ),
            ];
            return {
                used: true,
                details: `Found ${t.length} track(s). ${languages.length > 0 ? `Languages: <b>${languages.join(', ')}</b>` : ''}`,
            };
        },
    },
    {
        name: 'Role Descriptors',
        category: 'Accessibility & Metadata',
        desc: 'Uses <Role> descriptors to semantically describe the purpose of a track (e.g., main, alternate, commentary, dub).',
        isoRef: 'Clause 5.8.4.2',
        check: (mpd) => {
            const r = Array.from(mpd.querySelectorAll('Role'));
            if (r.length === 0)
                return { used: false, details: 'No roles specified.' };
            const roles = [
                ...new Set(
                    r.map(
                        (role) => `<code>${role.getAttribute('value')}</code>`
                    )
                ),
            ];
            return { used: true, details: `Roles found: ${roles.join(', ')}` };
        },
    },
];

const featureRowTemplate = (feature, mpd) => {
    const result = feature.check(mpd);

    const statusIcon = result.used
        ? html`<span class="text-green-400 font-bold text-lg" title="Used"
              >✔</span
          >`
        : html`<span class="text-gray-500 font-bold text-lg" title="Not Used"
              >—</span
          >`;

    return html`
        <tr class="border-b border-gray-700 last:border-b-0">
            <td class="p-3 text-center w-20">${statusIcon}</td>
            <td class="p-3 font-semibold text-gray-200">
                ${feature.name}
                ${createInfoTooltip(feature.desc, feature.isoRef)}
            </td>
            <td class="p-3 text-sm text-gray-300 font-mono">
                ${unsafeHTML(result.details)}
            </td>
            <td class="p-3 text-xs text-gray-500 font-mono w-40 text-right">
                ${feature.isoRef}
            </td>
        </tr>
    `;
};

const categoryTemplate = (category, categoryFeatures, mpd) => html`
    <div class="mt-8">
        <h4 class="text-lg font-semibold text-gray-300 mb-3">${category}</h4>
        <div
            class="bg-gray-800 rounded-lg overflow-hidden border border-gray-700"
        >
            <table class="w-full text-left">
                <thead class="bg-gray-900/50">
                    <tr>
                        <th
                            class="p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center"
                        >
                            Status
                        </th>
                        <th
                            class="p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                        >
                            Feature
                        </th>
                        <th
                            class="p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                        >
                            Details
                        </th>
                        <th
                            class="p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right"
                        >
                            Spec Ref.
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-700">
                    ${categoryFeatures.map((feature) =>
                        featureRowTemplate(feature, mpd)
                    )}
                </tbody>
            </table>
        </div>
    </div>
`;

export function getFeaturesAnalysisTemplate(mpd) {
    if (!mpd) return html`<p class="warn">No MPD loaded to display.</p>`;

    const groupedFeatures = features.reduce((acc, feature) => {
        if (!acc[feature.category]) {
            acc[feature.category] = [];
        }
        acc[feature.category].push(feature);
        return acc;
    }, {});

    return html`
        <h3 class="text-xl font-bold mb-2">Feature Usage Analysis</h3>
        <p class="text-sm text-gray-400 mb-4">
            A breakdown of key features detected in the manifest and their
            implementation details.
        </p>
        ${Object.entries(groupedFeatures).map(([category, features]) =>
            categoryTemplate(category, features, mpd)
        )}
        <div class="dev-watermark">Features v4.1</div>
    `;
}
