import { html } from 'lit-html';
import { eventBus } from '@/application/event-bus';
import { toggleDropdown, closeDropdown } from '@/ui/services/dropdownService';
import * as icons from '@/ui/icons';

const getBadge = (text, colorClasses) => html`
    <span class="text-xs font-semibold px-2 py-1 rounded-full ${colorClasses}"
        >${text}</span
    >
`;

const renderHlsContextCard = (item, activeUrl) => {
    const isActive = item.url === activeUrl;
    const activeClasses = 'bg-blue-800 border-blue-600 ring-2 ring-blue-500';
    const baseClasses =
        'bg-gray-900/50 p-3 rounded-lg border border-gray-700 cursor-pointer transition-all duration-150 ease-in-out flex flex-col items-start';
    const hoverClasses =
        'hover:bg-gray-700 hover:border-gray-500 hover:scale-[1.03]';

    return html`
        <div
            class="${baseClasses} ${hoverClasses} ${isActive
                ? activeClasses
                : ''}"
            data-url="${item.url}"
        >
            <span class="font-semibold text-gray-200 truncate"
                >${item.label}</span
            >
            <div class="shrink-0 flex flex-wrap items-center gap-2 mt-2">
                ${item.badges.map((b) => getBadge(b.text, b.classes))}
            </div>
        </div>
    `;
};

const renderHlsContextGroup = (title, items, activeUrl) => {
    if (!items || items.length === 0) return '';
    return html`
        <section class="p-3">
            <h4
                class="font-bold text-gray-400 text-sm tracking-wider uppercase px-1 pb-2 mb-2 border-b border-gray-700"
            >
                ${title}
            </h4>
            <div
                class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2"
            >
                ${items.map((item) => renderHlsContextCard(item, activeUrl))}
            </div>
        </section>
    `;
};

const getActiveHlsContextLabel = (stream) => {
    const { activeMediaPlaylistUrl } = stream;
    if (!activeMediaPlaylistUrl || activeMediaPlaylistUrl === 'master') {
        return 'Master Playlist';
    }

    const allVariants = stream.manifest.variants || [];
    const allRenditions =
        stream.manifest.periods[0]?.adaptationSets.filter(
            (as) => as.contentType !== 'video'
        ) || [];
    const iFramePlaylists =
        stream.manifest.periods[0]?.adaptationSets.find((as) =>
            as.roles.some((r) => r.value === 'trick')
        ) || { representations: [] };

    const activeVariant = allVariants.find(
        (v) => v.resolvedUri === activeMediaPlaylistUrl
    );
    if (activeVariant) {
        const bw = (activeVariant.attributes.BANDWIDTH / 1000).toFixed(0);
        const res = activeVariant.attributes.RESOLUTION;
        return `Variant (${bw}k, ${res})`;
    }

    const activeRendition = allRenditions.find(
        (r) =>
            r.representations[0]?.serializedManifest.resolvedUri ===
            activeMediaPlaylistUrl
    );
    if (activeRendition) {
        return `${activeRendition.contentType.toUpperCase()}: ${
            activeRendition.lang || activeRendition.id
        }`;
    }

    const activeIFrame = iFramePlaylists.representations.find(
        (r) => r.serializedManifest.resolvedUri === activeMediaPlaylistUrl
    );
    if (activeIFrame) {
        return `I-Frame: ${activeIFrame.width.value}x${activeIFrame.height.value}`;
    }

    return 'Select View...';
};

export const hlsContextSwitcherTemplate = (stream) => {
    if (stream.protocol !== 'hls' || !stream.manifest?.isMaster) {
        return html``;
    }

    const handleSelect = (e) => {
        const item = e.target.closest('[data-url]');
        if (!item) return;

        const url = item.dataset.url;
        eventBus.dispatch('hls:media-playlist-activate', {
            streamId: stream.id,
            url,
        });
        closeDropdown();
    };

    const variants = (stream.manifest.variants || []).map((v) => ({
        url: v.resolvedUri,
        label: `Variant Stream`,
        badges: [
            {
                text: `${(v.attributes.BANDWIDTH / 1000).toFixed(0)}k`,
                classes: 'bg-blue-800 text-blue-200',
            },
            {
                text: v.attributes.RESOLUTION || 'N/A',
                classes: 'bg-gray-600 text-gray-300',
            },
            {
                text: v.attributes.CODECS?.split(',')[0] || 'N/A',
                classes: 'bg-gray-600 text-gray-300',
            },
        ],
    }));

    const iFrameReps =
        stream.manifest.periods[0]?.adaptationSets
            .find((as) => as.roles.some((r) => r.value === 'trick'))
            ?.representations.map((r) => ({
                url: r.serializedManifest.resolvedUri,
                label: `I-Frame Stream`,
                badges: [
                    {
                        text: `${(r.bandwidth / 1000).toFixed(0)}k`,
                        classes: 'bg-orange-800 text-orange-200',
                    },
                    {
                        text: `${r.width.value}x${r.height.value}`,
                        classes: 'bg-gray-600 text-gray-300',
                    },
                ],
            })) || [];

    const audioRenditions = (stream.manifest.periods[0]?.adaptationSets || [])
        .filter((as) => as.contentType === 'audio')
        .map((r) => ({
            url: r.representations[0]?.serializedManifest.resolvedUri,
            label: `Audio: ${r.lang || r.id}`,
            badges: [
                {
                    text: r.lang || 'UND',
                    classes: 'bg-purple-800 text-purple-200',
                },
                {
                    text: r.channels ? `${r.channels} ch` : 'N/A',
                    classes: 'bg-gray-600 text-gray-300',
                },
                ...(r.serializedManifest.DEFAULT === 'YES'
                    ? [
                          {
                              text: 'DEFAULT',
                              classes: 'bg-green-800 text-green-200',
                          },
                      ]
                    : []),
            ],
        }));

    const subtitleRenditions = (
        stream.manifest.periods[0]?.adaptationSets || []
    )
        .filter(
            (as) => as.contentType === 'text' || as.contentType === 'subtitles'
        )
        .map((r) => ({
            url: r.representations[0]?.serializedManifest.resolvedUri,
            label: `Subtitles: ${r.lang || r.id}`,
            badges: [
                {
                    text: r.lang || 'UND',
                    classes: 'bg-teal-800 text-teal-200',
                },
                ...(r.serializedManifest.DEFAULT === 'YES'
                    ? [
                          {
                              text: 'DEFAULT',
                              classes: 'bg-green-800 text-green-200',
                          },
                      ]
                    : []),
                ...(r.forced
                    ? [
                          {
                              text: 'FORCED',
                              classes: 'bg-yellow-800 text-yellow-200',
                          },
                      ]
                    : []),
            ],
        }));

    const masterItem = {
        url: 'master',
        label: 'Master Playlist',
        badges: [{ text: 'MASTER', classes: 'bg-gray-600 text-gray-300' }],
    };

    const activeUrl = stream.activeMediaPlaylistUrl || 'master';

    const panelTemplate = () => html`
        <div
            class="dropdown-panel bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-[60vh] w-full min-w-[40rem] max-w-5xl overflow-y-auto"
            @click=${handleSelect}
        >
            ${renderHlsContextGroup('Master', [masterItem], activeUrl)}
            ${renderHlsContextGroup('Variant Streams', variants, activeUrl)}
            ${renderHlsContextGroup(
                'I-Frame Playlists',
                iFrameReps,
                activeUrl
            )}
            ${renderHlsContextGroup(
                'Audio Renditions',
                audioRenditions,
                activeUrl
            )}
            ${renderHlsContextGroup(
                'Subtitle Renditions',
                subtitleRenditions,
                activeUrl
            )}
        </div>
    `;

    return html`
        <div class="relative w-full overflow-hidden">
            <button
                @click=${(e) =>
                    toggleDropdown(e.currentTarget, panelTemplate, e)}
                class="bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-md p-2 w-full text-left flex items-center justify-between transition-colors"
            >
                <span class="truncate min-w-0"
                    >${getActiveHlsContextLabel(stream)}</span
                >
                <span class="text-gray-400 shrink-0">${icons.chevronDown}</span>
            </button>
        </div>
    `;
};