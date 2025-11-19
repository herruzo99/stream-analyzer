import { html } from 'lit-html';
import { eventBus } from '@/application/event-bus';
import { toggleDropdown, closeDropdown } from '@/ui/services/dropdownService';
import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';

const getBadge = (text, colorClasses) => html`
    <span class="text-xs font-semibold px-2 py-1 rounded-full ${colorClasses}"
        >${text}</span
    >
`;

const renderHlsContextCard = (item, activeId) => {
    const isActive = item.id === activeId;
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
            data-id="${item.id}"
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

const renderHlsContextGroup = (title, items, activeId) => {
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
                ${items.map((item) => renderHlsContextCard(item, activeId))}
            </div>
        </section>
    `;
};

const getCanonicalPlaylistItems = (stream) => {
    const allItems = stream.manifest.periods
        .flatMap((p) => p.adaptationSets)
        .flatMap((as) => as.representations.map((rep) => ({ rep, as })));

    const variants = allItems
        .filter(
            ({ as }) =>
                as.contentType === 'video' &&
                as.roles.every((r) => r.value !== 'trick')
        )
        .map(({ rep, as }) => ({
            id: rep.id,
            url: rep.__variantUri,
            label: 'Variant Stream',
            type: 'variant',
            data: { rep, as },
            badges: [
                {
                    text: `${formatBitrate(rep.bandwidth)}`,
                    classes: 'bg-blue-800 text-blue-200',
                },
                {
                    text: `${rep.width?.value || 'N/A'}x${
                        rep.height?.value || 'N/A'
                    }`,
                    classes: 'bg-gray-600 text-gray-300',
                },
                {
                    text: (rep.codecs[0]?.value || 'N/A').split('.')[0],
                    classes: 'bg-gray-600 text-gray-300',
                },
            ],
        }));

    const iFrameReps = allItems
        .filter(({ as }) => as.roles.some((r) => r.value === 'trick'))
        .map(({ rep, as }) => ({
            id: rep.id,
            url: rep.__variantUri,
            label: `I-Frame Stream`,
            type: 'iframe',
            data: { rep, as },
            badges: [
                {
                    text: `${formatBitrate(rep.bandwidth)}`,
                    classes: 'bg-orange-800 text-orange-200',
                },
                {
                    text: `${rep.width?.value || 'N/A'}x${
                        rep.height?.value || 'N/A'
                    }`,
                    classes: 'bg-gray-600 text-gray-300',
                },
            ],
        }));

    const audioRenditions = allItems
        .filter(({ as }) => as.contentType === 'audio')
        .map(({ rep, as }) => ({
            id: rep.id,
            url: rep.__variantUri,
            label: `Audio: ${rep.lang || as.lang || rep.id}`,
            type: 'audio',
            data: { rep, as },
            badges: [
                {
                    text: rep.lang || as.lang || 'UND',
                    classes: 'bg-purple-800 text-purple-200',
                },
                {
                    text: as.channels ? `${as.channels} ch` : 'N/A',
                    classes: 'bg-gray-600 text-gray-300',
                },
                ...(rep.serializedManifest.value?.DEFAULT === 'YES'
                    ? [
                          {
                              text: 'DEFAULT',
                              classes: 'bg-green-800 text-green-200',
                          },
                      ]
                    : []),
            ],
        }));

    const subtitleRenditions = allItems
        .filter(
            ({ as }) =>
                as.contentType === 'text' || as.contentType === 'subtitles'
        )
        .map(({ rep, as }) => ({
            id: rep.id,
            url: rep.__variantUri,
            label: `Subtitles: ${rep.lang || as.lang || rep.id}`,
            type: 'subtitles',
            data: { rep, as },
            badges: [
                {
                    text: rep.lang || as.lang || 'UND',
                    classes: 'bg-teal-800 text-teal-200',
                },
                ...(rep.serializedManifest.value?.DEFAULT === 'YES'
                    ? [
                          {
                              text: 'DEFAULT',
                              classes: 'bg-green-800 text-green-200',
                          },
                      ]
                    : []),
                ...(as.forced
                    ? [
                          {
                              text: 'FORCED',
                              classes: 'bg-yellow-800 text-yellow-200',
                          },
                      ]
                    : []),
            ],
        }));

    return { variants, iFrameReps, audioRenditions, subtitleRenditions };
};

const getActiveHlsContextLabel = (stream) => {
    const { activeMediaPlaylistId } = stream;
    if (!activeMediaPlaylistId || activeMediaPlaylistId === 'master') {
        return 'Master Playlist';
    }

    const { variants, iFrameReps, audioRenditions, subtitleRenditions } =
        getCanonicalPlaylistItems(stream);
    const allItems = [
        ...variants,
        ...iFrameReps,
        ...audioRenditions,
        ...subtitleRenditions,
    ];

    const activeItem = allItems.find(
        (item) => item.id === activeMediaPlaylistId
    );

    if (activeItem) {
        if (activeItem.type === 'variant') {
            const { rep } = activeItem.data;
            const bw = formatBitrate(rep.bandwidth);
            const res = `${rep.width?.value || 'N/A'}x${
                rep.height?.value || 'N/A'
            }`;
            return `Variant (${bw}, ${res})`;
        }
        if (activeItem.type === 'iframe') {
            const { rep } = activeItem.data;
            return `I-Frame: ${rep.width?.value || 'N/A'}x${
                rep.height?.value || 'N/A'
            }`;
        }
        if (activeItem.type === 'audio') {
            const { rep, as } = activeItem.data;
            return `Audio: ${rep.lang || as.lang || rep.id}`;
        }
        if (activeItem.type === 'subtitles') {
            const { rep, as } = activeItem.data;
            return `Subtitles: ${rep.lang || as.lang || rep.id}`;
        }
    }

    return 'Select View...';
};

export const hlsContextSwitcherTemplate = (stream) => {
    if (stream.protocol !== 'hls' || !stream.manifest?.isMaster) {
        return html``;
    }

    const handleSelect = (e) => {
        const item = e.target.closest('[data-id]');
        if (!item) return;

        const variantId = item.dataset.id;
        eventBus.dispatch('hls:media-playlist-activate', {
            streamId: stream.id,
            variantId,
        });
        closeDropdown();
    };

    const { variants, iFrameReps, audioRenditions, subtitleRenditions } =
        getCanonicalPlaylistItems(stream);

    const masterItem = {
        id: 'master',
        label: 'Master Playlist',
        badges: [{ text: 'MASTER', classes: 'bg-gray-600 text-gray-300' }],
    };

    const activeId = stream.activeMediaPlaylistId || 'master';

    const panelTemplate = () => html`
        <div
            class="dropdown-panel bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-[60vh] w-full min-w-[40rem] max-w-5xl overflow-y-auto"
            @click=${handleSelect}
        >
            ${renderHlsContextGroup('Master', [masterItem], activeId)}
            ${renderHlsContextGroup('Variant Streams', variants, activeId)}
            ${renderHlsContextGroup('I-Frame Playlists', iFrameReps, activeId)}
            ${renderHlsContextGroup(
                'Audio Renditions',
                audioRenditions,
                activeId
            )}
            ${renderHlsContextGroup(
                'Subtitle Renditions',
                subtitleRenditions,
                activeId
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
