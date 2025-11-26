import { html } from 'lit-html';
import { eventBus } from '@/application/event-bus';
import { toggleDropdown, closeDropdown } from '@/ui/services/dropdownService';
import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';
import { connectedTabBar } from '@/ui/components/tabs';

// Local state to manage tabs inside the dropdown
// We use a closure to keep state between renders of the same dropdown instance
let activeCategory = 'variants'; // variants | audio | subtitles

const itemCard = (item, activeId, onClick) => {
    const isActive = item.id === activeId;
    const containerClass = isActive
        ? 'bg-blue-600 text-white shadow-md'
        : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white';

    return html`
        <button
            @click=${onClick}
            class="flex flex-col p-3 rounded-lg border border-white/5 transition-all duration-150 text-left group w-full ${containerClass}"
        >
            <div class="flex justify-between items-start w-full">
                <span
                    class="font-bold text-xs uppercase tracking-wider opacity-80"
                    >${item.label}</span
                >
                ${isActive ? html`<span>${icons.checkCircle}</span>` : ''}
            </div>

            <div class="mt-2 flex flex-wrap gap-1">
                ${item.badges.map(
                    (b) => html`
                        <span
                            class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20 border border-white/10 ${isActive
                                ? 'text-blue-100'
                                : 'text-slate-400'}"
                        >
                            ${b}
                        </span>
                    `
                )}
            </div>
        </button>
    `;
};

const hlsDropdownContent = (stream) => {
    const { activeMediaPlaylistId } = stream;
    const manifest = stream.manifest;

    // 1. Extract Data
    const variants = (manifest.variants || []).map((v, i) => ({
        id: v.stableId || v.id || `v-${i}`,
        label: v.attributes.RESOLUTION || `Variant ${i + 1}`,
        badges: [
            formatBitrate(v.attributes.BANDWIDTH),
            (v.attributes.CODECS || '').split('.')[0],
        ],
        group: 'variants',
    }));

    const mediaGroups = (manifest.media || []).reduce(
        (acc, m, i) => {
            const type = m.value.TYPE;
            const group = m.value['GROUP-ID'];
            const id = m.value.URI || `media-${type}-${i}`;
            const label = m.value.NAME || m.value.LANGUAGE || `${type} ${i}`;

            const item = {
                id,
                label,
                badges: [m.value.LANGUAGE || 'UND', group],
                group:
                    type === 'AUDIO'
                        ? 'audio'
                        : type === 'SUBTITLES'
                          ? 'subtitles'
                          : 'other',
            };

            if (!acc[item.group]) acc[item.group] = [];
            acc[item.group].push(item);
            return acc;
        },
        { audio: [], subtitles: [] }
    );

    // 2. Render Logic
    const tabs = [
        { key: 'variants', label: 'Variants', count: variants.length },
        { key: 'audio', label: 'Audio', count: mediaGroups.audio.length },
        {
            key: 'subtitles',
            label: 'Subs',
            count: mediaGroups.subtitles.length,
        },
    ].filter((t) => t.count > 0);

    const items =
        activeCategory === 'variants'
            ? variants
            : activeCategory === 'audio'
              ? mediaGroups.audio
              : mediaGroups.subtitles;

    const handleTabClick = (key) => {
        activeCategory = key;
        // Re-render the dropdown content by updating the container
        // Since we are inside the toggleDropdown callback, we can't easily trigger a re-render
        // from here without a state update or forcing the shell update.
        // TRICK: We dispatch a dummy event or use a local state manager if we had one for this.
        // For simplicity in this architecture: Close and reopen? No, jarring.
        // Better: The `toggleDropdown` utility re-renders on store changes.
        // We can piggyback on a UI store "dummy" update or just manipulate the DOM directly?
        // Best: Make `activeCategory` part of `uiStore` or a component.
        // Let's use DOM manipulation for instant response in this isolated component context.
        const container = document.getElementById('hls-dropdown-container');
        if (container) {
            // Re-render the content into the container
            import('lit-html').then(({ render }) => {
                render(hlsDropdownContent(stream), container);
            });
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
            id="hls-dropdown-container"
            class="dropdown-panel bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-[28rem] flex flex-col max-h-[60vh] ring-1 ring-black/50"
        >
            <!-- Header & Master Switch -->
            <div class="p-4 border-b border-white/5">
                <button
                    @click=${() => handleSelect('master')}
                    class="w-full flex items-center justify-between p-3 rounded-lg border ${activeMediaPlaylistId ===
                    'master'
                        ? 'bg-purple-600 border-purple-500 text-white shadow-lg'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}"
                >
                    <div class="flex items-center gap-3">
                        <span class="p-1.5 rounded-md bg-black/20"
                            >${icons.list}</span
                        >
                        <div class="text-left">
                            <div
                                class="font-bold text-xs uppercase tracking-wider"
                            >
                                Master Playlist
                            </div>
                            <div class="text-[10px] opacity-70 font-mono">
                                Contains all variants
                            </div>
                        </div>
                    </div>
                    ${activeMediaPlaylistId === 'master'
                        ? html`<span>${icons.checkCircle}</span>`
                        : ''}
                </button>
            </div>

            <!-- Tabs -->
            <div class="px-4 pt-2 pb-0 border-b border-white/5 bg-white/[0.02]">
                ${connectedTabBar(tabs, activeCategory, handleTabClick)}
            </div>

            <!-- Grid -->
            <div
                class="p-3 overflow-y-auto custom-scrollbar grow bg-slate-950/30"
            >
                <div class="grid grid-cols-2 gap-2">
                    ${items.map((item) =>
                        itemCard(item, activeMediaPlaylistId, () =>
                            handleSelect(item.id)
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
    const label =
        stream.activeMediaPlaylistId &&
        stream.activeMediaPlaylistId !== 'master'
            ? 'Media Playlist'
            : 'Master Playlist';

    const subLabel =
        stream.activeMediaPlaylistId === 'master'
            ? 'All Variants'
            : 'Selected Rendition';

    return html`
        <div class="relative w-full px-3 pb-4">
            <button
                @click=${(e) =>
                    toggleDropdown(
                        e.currentTarget,
                        () => hlsDropdownContent(stream),
                        e
                    )}
                class="w-full bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 hover:border-slate-600 rounded-xl p-3 transition-all text-left group"
            >
                <div class="flex items-center justify-between">
                    <div>
                        <div
                            class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5 group-hover:text-purple-300 transition-colors"
                        >
                            ${label}
                        </div>
                        <div
                            class="font-semibold text-slate-300 text-sm group-hover:text-white truncate"
                        >
                            ${subLabel}
                        </div>
                    </div>
                    <div
                        class="text-slate-500 group-hover:text-white transition-colors"
                    >
                        ${icons.chevronDown}
                    </div>
                </div>
            </button>
        </div>
    `;
};
