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

const renderBadge = (text, type = 'default') => {
    const colors = {
        default:
            'bg-slate-800 text-slate-400 border-slate-800/40',
        blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_8px_#3b82f6]/20',
        purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.2)]',
        green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        yellow: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };
    return html`
        <span
            class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border transition-all duration-300 ${colors[
        type
        ] || colors.default}"
        >
            ${text}
        </span>
    `;
};

const renderItemRow = (item, isActive, onClick, isGlass) => {
    const radiusClass = isGlass ? 'rounded-xl' : 'rounded-sm';
    return html`
        <button
            @click=${onClick}
            class="w-full flex items-center justify-between p-2.5 ${radiusClass} transition-all duration-300 group ${isActive
            ? 'bg-slate-800 border border-blue-500/40 shadow-lg'
            : 'hover:bg-slate-800 border border-transparent hover:border-slate-800/30'}"
        >
            <div class="flex items-center gap-4 min-w-0">
                <div
                    class="w-1 h-8 rounded-full transition-all duration-300 ${isActive
            ? 'bg-gradient-to-b from-blue-500 to-[#60a5fa] shadow-[0_0_12px_#3b82f6] scale-y-110'
            : 'bg-slate-800 group-hover:bg-slate-400'}"
                ></div>
                <div class="flex flex-col items-start min-w-0">
                    <div
                        class="text-sm font-semibold truncate w-full text-left transition-colors ${isActive
            ? 'text-slate-100'
            : 'text-slate-100/80 group-hover:text-slate-100'}"
                    >
                        ${item.label}
                    </div>
                    <div class="flex flex-wrap gap-1.5 mt-1.5">
                        ${item.badges.map((b) => renderBadge(b.text, b.color))}
                    </div>
                </div>
            </div>
            ${isActive
            ? html`<span
                      class="text-blue-400 drop-shadow-[0_0_8px_#3b82f6]"
                      >${icons.checkCircle}</span
                  >`
            : ''}
        </button>
    `;
};

const hlsDropdownContent = (stream, isGlass) => {
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
                    { text: resolution, color: 'blue' },
                    { text: bitrate, color: 'green' },
                    { text: codecs, color: 'default' },
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
                            { text: rep.lang || 'UND', color: 'purple' },
                            { text: rep.format || 'FMT', color: 'yellow' },
                            { text: group, color: 'default' },
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

    const panelClass = isGlass
        ? "bg-slate-800/95 backdrop-blur-3xl border-slate-800/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] ring-1 ring-white/10"
        : "bg-slate-800 border-slate-800 rounded-sm shadow-xl";

    const headerClass = isGlass
        ? "bg-slate-800 border-slate-800/20"
        : "bg-slate-800 border-slate-800";

    const masterSwitchClass = isGlass
        ? "bg-slate-800 border-slate-800/20"
        : "bg-slate-800 border-slate-800";

    return html`
        <div
            class="dropdown-panel border w-[32rem] flex flex-col h-[520px] overflow-hidden ${panelClass}"
        >
            <!-- Header -->
            <div
                class="px-5 py-4 border-b flex items-center justify-between ${headerClass}"
            >
                <div
                    class="flex items-center gap-3 text-slate-400"
                >
                    <span
                        class="text-purple-300 drop-shadow-[0_0_8px_#a855f7]"
                        >${icons.settings}</span
                    >
                    <span
                        class="text-xs font-extrabold uppercase tracking-[0.15em] opacity-80"
                        >Stream Context</span
                    >
                </div>
            </div>

            <!-- Master Switch -->
            <div
                class="p-4 border-b ${masterSwitchClass}"
            >
                <button
                    @click=${() => handleSelect('master')}
                    class="w-full flex items-center justify-between p-4 ${isGlass ? 'rounded-2xl' : 'rounded-sm'} border transition-all duration-500 group relative overflow-hidden ${activeMediaPlaylistId ===
            'master'
            ? 'bg-purple-500/10 border-purple-500/40 text-purple-300 shadow-lg'
            : 'bg-slate-800/50 border-slate-800/30 hover:bg-slate-800 hover:border-purple-500/30 text-slate-100'}"
                >
                    <div class="flex items-center gap-4 relative z-10">
                        <div
                            class="p-2.5 rounded-xl transition-all duration-500 ${activeMediaPlaylistId ===
            'master'
            ? 'bg-purple-500/20 text-purple-300 shadow-[0_0_15px_#a855f7]'
            : 'bg-slate-800 text-slate-400 group-hover:bg-slate-800'}"
                        >
                            ${icons.list}
                        </div>
                        <div class="text-left">
                            <div class="font-extrabold text-sm tracking-tight">
                                Master Playlist
                            </div>
                            <div
                                class="text-[10px] opacity-60 font-mono mt-0.5"
                            >
                                Contains all variants & renditions
                            </div>
                        </div>
                    </div>
                    ${activeMediaPlaylistId === 'master'
            ? html`<span
                              class="text-purple-300 drop-shadow-[0_0_8px_#a855f7]"
                              >${icons.checkCircle}</span
                          >`
            : ''}
                </button>
            </div>

            <!-- Tabs -->
            <div class="px-4 pt-4 pb-0">
                <div
                    class="flex gap-1.5 p-1.5 ${isGlass ? 'bg-slate-800 rounded-xl' : 'bg-slate-800 rounded-sm'} border border-slate-800/20 overflow-x-auto custom-scrollbar"
                >
                    ${tabs.map(
                (tab) => html`
                            <button
                                @click=${() => handleTabClick(tab.key)}
                                class="flex-1 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${state.activeCategory ===
                        tab.key
                        ? 'bg-slate-800 text-slate-100 shadow-md border border-white/10'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'}"
                            >
                                ${tab.label}
                                <span
                                    class="ml-2 opacity-50 text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded-md border border-white/5"
                                    >${tab.count}</span
                                >
                            </button>
                        `
            )}
                </div>
            </div>

            <!-- List -->
            <div class="p-3 overflow-y-auto custom-scrollbar grow">
                <div class="flex flex-col gap-1">
                    ${items.map((item) =>
                renderItemRow(
                    item,
                    stream.activeMediaPlaylistUrl === item.id ||
                    stream.activeMediaPlaylistId === item.id, // Fallback check
                    () => handleSelect(item.id),
                    isGlass
                )
            )}
                </div>
                ${items.length === 0
            ? html`<div
                          class="text-center p-8 text-slate-400 italic text-xs"
                      >
                          No items in this category.
                      </div>`
            : ''}
            </div>
        </div>
    `;
};

export const hlsContextSwitcherTemplate = (stream) => {
    const { shell, isGlobalNavCompact } = useUiStore.getState();
    const isGlass = shell.config.activeThemeId.includes('glass');
    const isMasterSelected = stream.activeMediaPlaylistId === 'master';
    const state = getLocalState(stream.id);

    let mainLabel = 'Master Playlist';
    let subLabel = 'All Variants';

    if (!isMasterSelected) {
        const activeVariant = (stream.manifest?.variants || []).find(
            (v) =>
                v.stableId === stream.activeMediaPlaylistId ||
                v.id === stream.activeMediaPlaylistId ||
                v.uri === stream.activeMediaPlaylistId
        );

        if (activeVariant) {
            mainLabel = activeVariant.stableId || activeVariant.id || 'Variant';
            subLabel = activeVariant.attributes.RESOLUTION
                ? `${activeVariant.attributes.RESOLUTION} • ${formatBitrate(
                    activeVariant.attributes.BANDWIDTH
                )}`
                : formatBitrate(activeVariant.attributes.BANDWIDTH);
        } else {
            const media = (stream.manifest?.media || []).find(
                (m) => m.value.URI === stream.activeMediaPlaylistId
            );
            if (media) {
                mainLabel =
                    media.value.NAME || media.value.LANGUAGE || 'Rendition';
                subLabel = `${media.value.TYPE} • ${media.value['GROUP-ID']}`;
            } else {
                mainLabel = stream.activeMediaPlaylistId;
                subLabel = 'Selected Track';
            }
        }
    }

    // Compact Mode Trigger
    if (isGlobalNavCompact) {
        return html`
            <div class="relative w-full px-2 pb-4 flex justify-center">
                <button
                    @click=${(e) => {
                const handle = toggleDropdown(
                    e.currentTarget,
                    () => hlsDropdownContent(stream, isGlass),
                    e
                );
                if (handle) {
                    state.dropdownHandle = handle;
                }
            }}
                    class="w-10 h-10 ${isGlass ? 'bg-slate-800 hover:bg-slate-800 rounded-xl' : 'bg-slate-800 rounded-sm'} border border-slate-800/30 hover:border-purple-500/40 flex items-center justify-center transition-all duration-300 group shadow-lg relative overflow-hidden"
                    data-tooltip="${mainLabel} - ${subLabel}"
                    data-tooltip-placement="right"
                >
                    <div
                        class="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                    ></div>

                    <span class="text-slate-400 group-hover:text-purple-300 transition-colors relative z-10 scale-75">
                         ${icons.settings}
                    </span>
                    
                     ${!isMasterSelected ? html`<div class="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 ring-1 ring-slate-800 z-20"></div>` : ''}
                </button>
            </div>
        `;
    }

    return html`
        <div class="relative w-full px-4 pb-4">
            <button
                @click=${(e) => {
            const handle = toggleDropdown(
                e.currentTarget,
                () => hlsDropdownContent(stream, isGlass),
                e
            );
            // Store handle if returned (it might be undefined if closing)
            if (handle) {
                state.dropdownHandle = handle;
            }
        }}
                class="w-full ${isGlass ? 'bg-slate-800 hover:bg-slate-800 rounded-2xl' : 'bg-slate-800 rounded-sm'} border border-slate-800/30 hover:border-purple-500/40 p-4 transition-all duration-500 text-left group shadow-lg relative overflow-hidden"
            >
                <!-- Hover Glow -->
                <div
                    class="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                ></div>

                <div class="flex items-center justify-between relative z-10">
                    <div class="min-w-0">
                        <div
                            class="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400/70 mb-1.5 group-hover:text-purple-300 transition-colors flex items-center gap-2"
                        >
                            <span
                                class="bg-purple-500/20 p-1 rounded-sm"
                                >${icons.settings}</span
                            >
                            <span>Active Context</span>
                        </div>
                        <div
                            class="font-extrabold text-slate-100 text-sm group-hover:text-slate-100 truncate tracking-tight"
                            data-tooltip="${mainLabel}"
                        >
                            ${mainLabel}
                        </div>
                        <div
                            class="text-[10px] text-slate-400 font-mono truncate opacity-60 mt-1.5 flex items-center gap-2"
                        >
                            <span
                                class="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-800/20 font-bold tracking-wider"
                                >HLS</span
                            >
                            <span class="opacity-50">•</span>
                            <span class="truncate">${subLabel}</span>
                        </div>
                    </div>
                    <div
                        class="text-slate-400 group-hover:text-purple-300 transition-all duration-300 pl-3 group-hover:translate-y-0.5"
                    >
                        ${icons.chevronDown}
                    </div>
                </div>
            </button>
        </div>
    `;
};
