import { html } from 'lit-html';
import { eventBus } from '@/application/event-bus';
import { useAnalysisStore } from '@/state/analysisStore';
import { closeModal } from '@/ui/services/modalService';
import {
    getHistory,
    getPresets,
    deleteHistoryItem,
    deletePreset,
} from '@/infrastructure/persistence/streamStorage';
import { exampleStreams } from '@/data/example-streams';

let activeTab = 'presets';
let searchTerm = '';
let rerenderCallback = () => {};

const getBadge = (text, colorClasses) => {
    if (!text) return '';
    return html`<span
        class="text-xs font-semibold px-2 py-0.5 rounded-full ${colorClasses}"
        >${text.toUpperCase()}</span
    >`;
};

const renderStreamListItem = (stream, isPreset) => {
    const { activeStreamInputId } = useAnalysisStore.getState();

    const protocolBadge =
        stream.protocol === 'dash'
            ? getBadge('DASH', 'bg-blue-800 text-blue-200')
            : stream.protocol === 'hls'
              ? getBadge('HLS', 'bg-purple-800 text-purple-200')
              : '';
    const typeBadge =
        stream.type === 'live'
            ? getBadge('LIVE', 'bg-red-800 text-red-200')
            : stream.type === 'vod'
              ? getBadge('VOD', 'bg-green-800 text-green-200')
              : '';

    const handleSelect = () => {
        eventBus.dispatch('ui:stream-input:populate-from-preset', {
            id: activeStreamInputId,
            preset: stream,
        });
        closeModal();
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete "${stream.name}"?`)) {
            if (isPreset) {
                deletePreset(stream.url);
            } else {
                deleteHistoryItem(stream.url);
            }
            rerenderCallback();
        }
    };

    return html`
        <li class="group" @click=${handleSelect}>
            <div
                class="p-3 hover:bg-gray-700 cursor-pointer flex justify-between items-center"
            >
                <div class="flex flex-col min-w-0">
                    <span
                        class="font-semibold text-gray-200 truncate"
                        title="${stream.name}"
                        >${stream.name}</span
                    >
                    <span
                        class="text-xs text-gray-400 font-mono truncate"
                        title="${stream.url}"
                        >${stream.url}</span
                    >
                </div>
                <div class="shrink-0 flex items-center gap-2 ml-4">
                    ${protocolBadge} ${typeBadge}
                    ${isPreset || !isPreset
                        ? html`
                              <button
                                  @click=${handleDelete}
                                  class="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-800 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Delete item"
                              >
                                  <span class="text-xl">&times;</span>
                              </button>
                          `
                        : ''}
                </div>
            </div>
        </li>
    `;
};

const renderListSection = (title, items, isPreset) => {
    if (items.length === 0) {
        return html`<p class="text-center text-sm text-gray-500 p-8">
            No ${title.toLowerCase()} found.
        </p>`;
    }
    return html`
        <ul class="divide-y divide-gray-700/50">
            ${items.map((item) => renderStreamListItem(item, isPreset))}
        </ul>
    `;
};

const renderExampleSection = () => {
    const filteredExamples = exampleStreams.filter(
        (s) =>
            s.name.toLowerCase().includes(searchTerm) ||
            s.url.toLowerCase().includes(searchTerm) ||
            s.protocol.toLowerCase().includes(searchTerm)
    );
    const grouped = filteredExamples.reduce((acc, stream) => {
        const key = `${stream.protocol.toUpperCase()} - ${stream.type.toUpperCase()}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(stream);
        return acc;
    }, {});

    return html`
        <div class="space-y-4">
            ${Object.entries(grouped).map(
                ([groupName, items]) => html`
                    <div>
                        <h4
                            class="font-bold text-gray-400 text-sm tracking-wider uppercase px-3 pt-3 pb-2 sticky top-0 bg-gray-800 z-10"
                        >
                            ${groupName}
                        </h4>
                        <ul class="divide-y divide-gray-700/50">
                            ${items.map((item) =>
                                renderStreamListItem(item, false)
                            )}
                        </ul>
                    </div>
                `
            )}
        </div>
    `;
};

export const streamLibraryModalTemplate = (rerender) => {
    rerenderCallback = rerender;
    const lowerSearch = searchTerm.toLowerCase();

    let content;
    if (activeTab === 'presets') {
        const presets = getPresets().filter(
            (s) =>
                s.name.toLowerCase().includes(lowerSearch) ||
                s.url.toLowerCase().includes(lowerSearch)
        );
        content = renderListSection('Saved Presets', presets, true);
    } else if (activeTab === 'history') {
        const history = getHistory().filter(
            (s) =>
                s.name.toLowerCase().includes(lowerSearch) ||
                s.url.toLowerCase().includes(lowerSearch)
        );
        content = renderListSection('Recent Streams', history, false);
    } else {
        content = renderExampleSection();
    }

    const tabButton = (key, label) => html`
        <button
            @click=${() => {
                activeTab = key;
                rerender();
            }}
            class="px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${activeTab ===
            key
                ? 'bg-gray-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700/50'}"
        >
            ${label}
        </button>
    `;

    return html`
        <div class="flex flex-col h-full max-h-[80vh]">
            <div class="p-4 border-b border-gray-700 space-y-3 shrink-0">
                <input
                    type="search"
                    placeholder="Search streams..."
                    .value=${searchTerm}
                    @input=${(e) => {
                        searchTerm = e.target.value;
                        rerender();
                    }}
                    class="w-full bg-gray-900 text-white rounded-md p-2 border border-gray-600 focus:ring-1 focus:ring-blue-500"
                />
                <div class="border-b border-gray-700">
                    <nav class="-mb-px flex space-x-2" aria-label="Tabs">
                        ${tabButton('presets', 'Presets')}
                        ${tabButton('history', 'History')}
                        ${tabButton('examples', 'Examples')}
                    </nav>
                </div>
            </div>
            <div class="grow overflow-y-auto">${content}</div>
        </div>
    `;
};
