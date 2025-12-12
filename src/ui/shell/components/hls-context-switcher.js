import { eventBus } from '@/application/event-bus';
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
        default: 'bg-slate-700/50 text-slate-300 border-slate-600/50',
        blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        purple: 'bg-purple-500/20 text-purple-200 border-purple-500/30',
        green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10',
        yellow: 'bg-amber-500/10 text-amber-400 border-amber-500/10',
    };
    return html`
        <span
            class="text-[10px] font-mono px-1.5 py-0.5 rounded border ${colors[type] || colors.default}"
        >
            ${text}
        </span>
    `;
};

const renderItemRow = (item, isActive, onClick) => {
    return html`
        <button
            @click=${onClick}
            class="w-full flex items-center justify-between p-2 rounded-lg transition-all group ${isActive
            ? 'bg-blue-600/20 border border-blue-500/50'
            : 'hover:bg-white/5 border border-transparent'}"
        >
            <div class="flex items-center gap-3 min-w-0">
                <div
                    class="w-1 h-8 rounded-full ${isActive
            ? 'bg-blue-500'
            : 'bg-slate-700 group-hover:bg-slate-600'}"
                ></div>
                <div class="flex flex-col items-start min-w-0">
                    <div
                        class="text-sm font-medium truncate w-full text-left ${isActive
            ? 'text-blue-100'
            : 'text-slate-200 group-hover:text-white'}"
                    >
                        ${item.label}
                    </div>
                    <div class="flex gap-1 mt-1">
                        ${item.badges.map((b) => renderBadge(b.text, b.color))}
                    </div>
                </div>
            </div>
            ${isActive
            ? html`<span class="text-blue-400">${icons.checkCircle}</span>`
            : ''}
        </button>
    `;
};

const hlsDropdownContent = (stream) => {
    const { activeMediaPlaylistId } = stream;
    const manifest = stream.manifest;
    const state = getLocalState(stream.id);

    // 1. Extract Data from structured IR
    const allAdaptationSets = manifest.periods?.[0]?.adaptationSets || [];

    const variants = allAdaptationSets
        .filter(as => as.contentType === 'video' && !(as.roles || []).some(r => r.value === 'trick'))
        .flatMap(as => as.representations)
        .map(rep => {
            const resolution = rep.height?.value ? `${rep.height.value}p` : 'N/A';
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
        .filter(as => as.contentType !== 'video')
        .reduce((acc, as) => {
            const type = as.contentType; // 'audio', 'subtitles'
            if (!acc[type]) acc[type] = [];

            as.representations.forEach(rep => {
                const group = as.id.split('-').slice(1).join('-') || 'default';
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
        }, { audio: [], subtitles: [], 'closed-captions': [], video: [] });

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
            class="dropdown-panel bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl w-[32rem] flex flex-col h-[500px] ring-1 ring-black/50 overflow-hidden"
        >
            <!-- Header -->
            <div
                class="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between"
            >
                <div class="flex items-center gap-2 text-slate-400">
                    ${icons.settings}
                    <span
                        class="text-xs font-bold uppercase tracking-widest opacity-80"
                        >Stream Context</span
                    >
                </div>
            </div>

            <!-- Master Switch -->
            <div class="p-3 border-b border-white/5">
                <button
                    @click=${() => handleSelect('master')}
                    class="w-full flex items-center justify-between p-3 rounded-xl border transition-all group ${activeMediaPlaylistId ===
            'master'
            ? 'bg-purple-500/10 border-purple-500/50 text-purple-100'
            : 'bg-slate-800/50 border-white/5 hover:bg-slate-800 hover:border-white/10 text-slate-300'}"
                >
                    <div class="flex items-center gap-3">
                        <div
                            class="p-2 rounded-lg ${activeMediaPlaylistId ===
            'master'
            ? 'bg-purple-500/20 text-purple-300'
            : 'bg-slate-700/50 text-slate-400'}"
                        >
                            ${icons.list}
                        </div>
                        <div class="text-left">
                            <div class="font-bold text-sm">Master Playlist</div>
                            <div class="text-[10px] opacity-70 font-mono">
                                Contains all variants & renditions
                            </div>
                        </div>
                    </div>
                    ${activeMediaPlaylistId === 'master'
            ? html`<span class="text-purple-400"
                              >${icons.checkCircle}</span
                          >`
            : ''}
                </button>
            </div>

            <!-- Tabs -->
            <div class="px-3 pt-3 pb-0">
                <div class="flex gap-1 p-1 bg-black/20 rounded-lg overflow-x-auto custom-scrollbar">
                    ${tabs.map(
                (tab) => html`
                            <button
                                @click=${() => handleTabClick(tab.key)}
                                class="flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${state.activeCategory ===
                        tab.key
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}"
                            >
                                ${tab.label}
                                <span
                                    class="ml-1.5 opacity-50 text-[10px] bg-black/20 px-1 rounded-full"
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
                    stream.activeMediaPlaylistUrl === item.id || stream.activeMediaPlaylistId === item.id, // Fallback check
                    () => handleSelect(item.id)
                )
            )}
                </div>
                ${items.length === 0
            ? html`<div
                          class="text-center p-8 text-slate-500 italic text-xs"
                      >
                          No items in this category.
                      </div>`
            : ''}
            </div>
        </div>
    `;
};

export const hlsContextSwitcherTemplate = (stream) => {
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

    return html`
        <div class="relative w-full px-3 pb-4">
            <button
                @click=${(e) => {
            const handle = toggleDropdown(
                e.currentTarget,
                () => hlsDropdownContent(stream),
                e
            );
            // Store handle if returned (it might be undefined if closing)
            if (handle) {
                state.dropdownHandle = handle;
            }
        }}
                class="w-full bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 hover:border-slate-600 rounded-xl p-3 transition-all text-left group"
            >
                <div class="flex items-center justify-between">
                    <div class="min-w-0">
                        <div
                            class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5 group-hover:text-purple-300 transition-colors"
                        >
                            Active Context
                        </div>
                        <div
                            class="font-semibold text-slate-300 text-sm group-hover:text-white truncate"
                            title="${mainLabel}"
                        >
                            ${mainLabel}
                        </div>
                        <div
                            class="text-[10px] text-slate-500 font-mono truncate opacity-70 mt-0.5"
                        >
                            ${subLabel}
                        </div>
                    </div>
                    <div
                        class="text-slate-500 group-hover:text-white transition-colors pl-2"
                    >
                        ${icons.chevronDown}
                    </div>
                </div>
            </button>
        </div>
    `;
};