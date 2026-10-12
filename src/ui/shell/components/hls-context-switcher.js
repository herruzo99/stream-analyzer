import { eventBus } from '@/application/event-bus';
import { useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { closeDropdown, toggleDropdown } from '@/ui/services/dropdownService';
import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';

// State map to track active tabs per stream
const stateMap = new Map();

const getLocalState = (streamId) => {
    if (!stateMap.has(streamId)) {
        stateMap.set(streamId, {
            activeCategory: 'variants', // variants | audio | video | subtitles | closed-captions
            dropdownHandle: null,
        });
    }
    return stateMap.get(streamId);
};

const renderBadge = (text) => html`
    <span
        class="mono text-[10px] px-1.5 py-px rounded border bg-white/5 text-slate-500 border-white/10"
    >
        ${text}
    </span>
`;

const renderItemRow = (item, isActive, onClick) => html`
    <button
        @click=${onClick}
        aria-current=${isActive ? 'true' : 'false'}
        class="w-full flex items-center justify-between px-2.5 py-2 rounded-md border transition-colors ${isActive
            ? 'bg-transparent border-emerald-500/30'
            : 'bg-transparent border-transparent hover:bg-white/5'}"
    >
        <span class="flex items-center gap-3 min-w-0">
            <span
                class="w-0.5 self-stretch rounded-full shrink-0 ${isActive
                    ? 'bg-emerald-400'
                    : 'bg-white/10'}"
            ></span>
            <span class="flex flex-col items-start min-w-0">
                <span
                    class="text-[13px] font-medium truncate w-full text-left text-slate-200"
                >
                    ${item.label}
                </span>
                <span class="flex flex-wrap gap-1 mt-1">
                    ${item.badges.map((b) => renderBadge(b.text))}
                </span>
            </span>
        </span>
        ${isActive
            ? html`<span class="text-emerald-300 shrink-0"
                  >${icons.checkCircle}</span
              >`
            : ''}
    </button>
`;

const hlsDropdownContent = (stream) => {
    const { activeMediaPlaylistId } = stream;
    const manifest = stream.manifest;
    const state = getLocalState(stream.id);

    // 1. Extract Data from structured IR
    const allAdaptationSets = manifest.periods?.[0]?.adaptationSets || [];

    const variants = allAdaptationSets
        .filter(
            (as) =>
                as.contentType === 'video' &&
                !(as.roles || []).some((r) => r.value === 'trick')
        )
        .flatMap((as) => as.representations)
        .map((rep) => {
            const resolution = rep.height?.value
                ? `${rep.height.value}p`
                : 'N/A';
            const bitrate = formatBitrate(rep.bandwidth);
            const codecs = (rep.codecs?.[0]?.value || '').split('.')[0];
            return {
                id: rep.id,
                label: rep.id,
                badges: [
                    { text: resolution },
                    { text: bitrate },
                    { text: codecs },
                ],
                group: 'variants',
            };
        });

    const mediaGroups = allAdaptationSets
        .filter((as) => as.contentType !== 'video')
        .reduce(
            (acc, as) => {
                const type = as.contentType; // 'audio', 'subtitles'
                if (!acc[type]) acc[type] = [];

                as.representations.forEach((rep) => {
                    const group =
                        as.id.split('-').slice(1).join('-') || 'default';
                    acc[type].push({
                        id: rep.id,
                        label: rep.label,
                        badges: [
                            { text: rep.lang || 'UND' },
                            { text: rep.format || 'FMT' },
                            { text: group },
                        ],
                        group: type,
                    });
                });
                return acc;
            },
            { audio: [], subtitles: [], 'closed-captions': [], video: [] }
        );

    // 2. Render Logic
    const tabs = [
        { key: 'variants', label: 'Variants', count: variants.length },
        { key: 'audio', label: 'Audio', count: mediaGroups.audio.length },
        { key: 'video', label: 'Video', count: mediaGroups.video.length },
        {
            key: 'subtitles',
            label: 'Subs',
            count: mediaGroups.subtitles.length,
        },
        {
            key: 'closed-captions',
            label: 'CC',
            count: mediaGroups['closed-captions'].length,
        },
    ].filter((t) => t.count > 0);

    const items =
        state.activeCategory === 'variants'
            ? variants
            : mediaGroups[state.activeCategory] || [];

    const handleTabClick = (key) => {
        state.activeCategory = key;
        if (state.dropdownHandle) {
            state.dropdownHandle.update();
        }
    };

    const handleSelect = (id) => {
        eventBus.dispatch('hls:media-playlist-activate', {
            streamId: stream.id,
            variantId: id === 'master' ? 'master' : id,
        });
        closeDropdown();
    };

    return html`
        <div
            class="dropdown-panel border border-white/10 bg-[#0b111c] rounded-md w-80 sm:w-96 flex flex-col max-h-[70vh] overflow-hidden"
        >
            <div
                class="px-4 py-3 border-b border-white/5 flex items-center justify-between"
            >
                <span class="mono text-[11px] font-medium text-slate-400"
                    >Track selection</span
                >
            </div>

            <div class="p-3 border-b border-white/5">
                <button
                    @click=${() => handleSelect('master')}
                    aria-current=${activeMediaPlaylistId === 'master'
                        ? 'true'
                        : 'false'}
                    class="w-full flex items-center justify-between px-3 py-2.5 rounded-md border transition-colors ${activeMediaPlaylistId ===
                        'master'
                        ? 'bg-transparent border-emerald-500/30'
                        : 'bg-transparent border-white/5 hover:border-white/15'}"
                >
                    <span class="flex items-center gap-3">
                        <span
                            class="text-slate-500"
                        >
                            ${icons.list}
                        </span>
                        <span class="text-left">
                            <span
                                class="block font-medium text-sm text-slate-100"
                            >
                                Master playlist
                            </span>
                            <span
                                class="mono block text-[10px] text-slate-600 mt-0.5"
                            >
                                all variants and renditions
                            </span>
                        </span>
                    </span>
                    ${activeMediaPlaylistId === 'master'
                        ? html`<span class="text-emerald-300"
                              >${icons.checkCircle}</span
                          >`
                        : ''}
                </button>
            </div>

            <div class="px-3 pt-3">
                <div
                    class="flex gap-1 p-1 bg-black/30 rounded-md border border-white/5 overflow-x-auto custom-scrollbar"
                    role="tablist"
                >
                    ${tabs.map(
                        (tab) => html`
                            <button
                                role="tab"
                                aria-selected=${state.activeCategory ===
                                tab.key}
                                @click=${() => handleTabClick(tab.key)}
                                class="flex-1 px-3 py-1.5 rounded mono text-[11px] transition-colors whitespace-nowrap ${state.activeCategory ===
                                tab.key
                                ? 'bg-white/10 text-slate-100'
                                : 'text-slate-500 hover:text-slate-200'}"
                            >
                                ${tab.label.toLowerCase()}
                                <span class="text-slate-600"
                                    >${tab.count}</span
                                >
                            </button>
                        `
                    )}
                </div>
            </div>

            <div class="p-2 overflow-y-auto custom-scrollbar grow">
                <div class="flex flex-col">
                    ${items.map((item) =>
                        renderItemRow(
                            item,
                            stream.activeMediaPlaylistUrl === item.id ||
                                stream.activeMediaPlaylistId === item.id,
                            () => handleSelect(item.id)
                        )
                    )}
                </div>
                ${items.length === 0
                    ? html`<p
                          class="mono text-center p-6 text-slate-600 text-[11px]"
                      >
                          No items in this category.
                      </p>`
                    : ''}
            </div>
        </div>
    `;
};

export const hlsContextSwitcherTemplate = (stream) => {
    const { isGlobalNavCompact } = useUiStore.getState();
    const isMasterSelected = !stream.activeMediaPlaylistId || stream.activeMediaPlaylistId === 'master';
    const state = getLocalState(stream.id);

    let mainLabel = 'Master playlist';
    let subLabel = 'All variants';

    if (!isMasterSelected) {
        const activeVariant = (stream.manifest?.variants || []).find(
            (v) =>
                v.stableId === stream.activeMediaPlaylistId ||
                v.id === stream.activeMediaPlaylistId ||
                v.uri === stream.activeMediaPlaylistId
        );

        if (activeVariant) {
            mainLabel = activeVariant.stableId || activeVariant.id || 'Variant';
            const attrs = activeVariant.attributes || {};
            subLabel = attrs.RESOLUTION
                ? `${attrs.RESOLUTION} • ${formatBitrate(attrs.BANDWIDTH)}`
                : formatBitrate(attrs.BANDWIDTH) || 'variant';
        } else {
            const media = (stream.manifest?.media || []).find(
                (m) => m?.value?.URI === stream.activeMediaPlaylistId
            );
            if (media?.value) {
                mainLabel =
                    media.value.NAME || media.value.LANGUAGE || 'Rendition';
                subLabel = `${media.value.TYPE || 'track'} • ${media.value['GROUP-ID'] || 'default'}`;
            } else if (stream.activeMediaPlaylistId) {
                mainLabel = String(stream.activeMediaPlaylistId).slice(0, 40);
                subLabel = 'Selected track';
            } else {
                mainLabel = 'Master playlist';
                subLabel = 'All variants';
            }
        }
    }

    const openMenu = (e) => {
        const handle = toggleDropdown(
            e.currentTarget,
            () => hlsDropdownContent(stream),
            e
        );
        if (handle) {
            state.dropdownHandle = handle;
        }
    };

    // Compact Mode Trigger
    if (isGlobalNavCompact) {
        return html`
            <div class="w-full px-2 py-3 flex justify-center">
                <button
                    @click=${openMenu}
                    class="w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md flex items-center justify-center transition-colors relative"
                    title="${mainLabel} — ${subLabel} (change track)"
                    aria-label="Change track (currently ${mainLabel})"
                >
                    <span class="text-slate-400">
                        ${icons.settings}
                    </span>
                    ${!isMasterSelected
                        ? html`<span
                              class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400"
                          ></span>`
                        : ''}
                </button>
            </div>
        `;
    }

    return html`
        <div class="w-full px-3 py-3">
            <button
                @click=${openMenu}
                class="w-full bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 rounded-md p-3 transition-colors text-left"
                aria-label="Change track (currently ${mainLabel})"
            >
                <div class="flex items-center justify-between gap-2">
                    <div class="min-w-0 grow">
                        <p
                            class="mono text-[10px] text-slate-500 mb-1"
                        >
                            track
                        </p>
                        <p
                            class="font-medium text-slate-100 text-sm truncate"
                            title="${mainLabel}"
                        >
                            ${mainLabel}
                        </p>
                        <p
                            class="mono text-[10px] text-slate-600 truncate mt-1 flex items-center gap-1.5"
                        >
                            <span>hls</span>
                            <span class="text-slate-700">·</span>
                            <span class="truncate">${subLabel.toLowerCase()}</span>
                        </p>
                    </div>
                    <span class="text-slate-500 shrink-0 pl-2"
                        >${icons.chevronDown}</span
                    >
                </div>
            </button>
        </div>
    `;
};
