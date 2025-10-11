import { html } from 'lit-html';
import { eventBus } from '@/application/event-bus';

const getBadge = (text, colorClasses) => html`
    <span
        class="text-xs font-semibold px-2 py-1 rounded-full ${colorClasses}"
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
            <div class="flex-shrink-0 flex flex-wrap items-center gap-2 mt-2">
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
            <div class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
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

    return 'Select View...';
};

export const hlsContextSwitcherTemplate = (stream) => {
    if (stream.protocol !== 'hls' || !stream.manifest?.isMaster) {
        return html``;
    }

    const toggleDropdown = (e) => {
        const switcher = e.currentTarget.closest(
            '[data-hls-switcher-container]'
        );
        const panel = switcher.querySelector('[data-hls-dropdown-panel]');
        
        const isHidden = panel.classList.contains('pointer-events-none');

        if (isHidden) {
            // Temporarily remove transform to get accurate width, but keep it invisible
            panel.classList.remove('scale-95');
            const panelWidth = panel.offsetWidth;
            const parentRect = switcher.getBoundingClientRect();
            panel.classList.add('scale-95'); // Restore for animation

            // Reset alignment classes before making a decision
            panel.classList.remove('left-0', 'right-0', 'origin-top-left', 'origin-top-right');
            
            // Decide on alignment: if right-aligning it would push the left edge off-screen, then left-align instead.
            if (parentRect.right - panelWidth < 0) {
                panel.classList.add('left-0', 'origin-top-left');
            } else {
                // Default to right alignment.
                panel.classList.add('right-0', 'origin-top-right');
            }
            
            // Animate into view
            panel.classList.remove('opacity-0', 'scale-95', '-translate-y-2.5', 'pointer-events-none');
        } else {
            // Hide it
            panel.classList.add('opacity-0', 'scale-95', '-translate-y-2.5', 'pointer-events-none');
        }
    };

    const handleSelect = (e) => {
        const item = e.target.closest('[data-url]');
        if (!item) return;

        const url = item.dataset.url;
        eventBus.dispatch('hls:media-playlist-activate', {
            streamId: stream.id,
            url,
        });

        const panel = e.currentTarget.closest('[data-hls-dropdown-panel]');
        panel.classList.add('opacity-0', 'scale-95', '-translate-y-2.5', 'pointer-events-none');
    };

    const variants = (stream.manifest.variants || []).map((v) => ({
        url: v.resolvedUri,
        label: `Variant Stream`, // Removed from card, kept for potential future use
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

    const audioRenditions = (
        stream.manifest.periods[0]?.adaptationSets || []
    )
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

    return html`
        <div class="relative w-full" data-hls-switcher-container>
            <button
                @click=${toggleDropdown}
                class="bg-gray-700 text-white rounded-md border-gray-600 p-2 w-full text-left flex items-center justify-between"
            >
                <span class="truncate"
                    >${getActiveHlsContextLabel(stream)}</span
                >
                <svg
                    class="w-5 h-5 ml-2 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fill-rule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                    />
                </svg>
            </button>
            <div
                class="transition-all ease-out duration-200 absolute top-full mt-2 z-30 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-[60vh] w-full min-w-[40rem] max-w-5xl overflow-y-auto opacity-0 scale-95 -translate-y-2.5 pointer-events-none"
                data-hls-dropdown-panel
                @click=${handleSelect}
            >
                ${renderHlsContextGroup('Master', [masterItem], activeUrl)}
                ${renderHlsContextGroup(
                    'Variant Streams',
                    variants,
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
        </div>
    `;
};