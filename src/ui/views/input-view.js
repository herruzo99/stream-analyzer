import { html } from 'lit-html';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { exampleStreams } from '@/data/example-streams';
import {
    getHistory,
    getPresets,
    deleteHistoryItem,
    deletePreset,
} from '@/infrastructure/persistence/streamStorage';
import { eventBus } from '@/application/event-bus';
import { showToast } from '@/ui/components/toast';
import { openModalWithContent } from '@/ui/services/modalService';
import { startAnalysisUseCase } from '@/application/useCases/startAnalysis';
import { container } from '@/application/container';

const getBadge = (text, colorClasses) => {
    if (!text) return '';
    return html`<span
        class="text-xs font-semibold px-2 py-0.5 rounded-full ${colorClasses}"
        >${text.toUpperCase()}</span
    >`;
};

const handleDropdownItemSelect = (e) => {
    const item = /** @type {HTMLElement} */ (e.currentTarget);
    const group = /** @type {HTMLElement} */ (
        item.closest('.stream-input-group')
    );
    const inputId = parseInt(group.dataset.id, 10);

    if (item.dataset.url) {
        analysisActions.populateStreamInput(
            inputId,
            item.dataset.url,
            item.dataset.name || ''
        );
        const fileInput = /** @type {HTMLInputElement} */ (
            group.querySelector('.input-file')
        );
        if (fileInput) fileInput.value = '';
    }
    const dropdown = group.querySelector('.preset-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
};

const renderStreamListItem = (stream, isPreset, presets, rerenderCallback) => {
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

    const handleDelete = (e) => {
        e.preventDefault();
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

    return html`<li
        class="group px-3 py-2 hover:bg-gray-700 cursor-pointer flex justify-between items-center"
        data-url="${stream.url}"
        data-name="${stream.name}"
        @mousedown=${handleDropdownItemSelect}
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
        <div class="flex-shrink-0 flex items-center gap-2 ml-4">
            ${protocolBadge} ${typeBadge}
            <button
                @click=${handleDelete}
                class="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-800 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete item"
            >
                <span class="text-xl">&times;</span>
            </button>
        </div>
    </li>`;
};

const renderDropdownSection = (
    title,
    items,
    isPreset = false,
    presets,
    rerenderCallback
) => {
    if (!items || items.length === 0) return '';
    return html`<div>
        <h4
            class="font-bold text-gray-200 text-xs tracking-wider uppercase px-3 pt-3 pb-2 sticky top-0 bg-gray-900 z-10 border-b border-gray-800/50"
        >
            ${title}
        </h4>
        <ul class="divide-y divide-gray-700/50">
            ${items.map((item) =>
                renderStreamListItem(item, isPreset, presets, rerenderCallback)
            )}
        </ul>
    </div>`;
};

const renderExampleCategory = (title, items, presets, rerenderCallback) => {
    if (!items || items.length === 0) return '';
    return html`<div>
        <h5 class="font-medium text-gray-400 px-3 pt-2 pb-1">${title}</h5>
        <ul class="divide-y divide-gray-700/50">
            ${items.map((item) =>
                renderStreamListItem(item, false, presets, rerenderCallback)
            )}
        </ul>
    </div>`;
};

const streamInputTemplate = (input, isOnlyStream, rerenderCallback) => {
    const history = getHistory();
    const presets = getPresets();
    const presetUrls = new Set(presets.map((p) => p.url));
    const groupedExamples = exampleStreams.reduce(
        (acc, stream) => {
            const { protocol, type } = stream;
            if (!acc[protocol]) acc[protocol] = {};
            if (!acc[protocol][type]) acc[protocol][type] = [];
            acc[protocol][type].push(stream);
            return acc;
        },
        { dash: {}, hls: {} }
    );

    const handleSavePreset = (e) => {
        const button = /** @type {HTMLButtonElement} */ (e.target);
        const url = input.url.trim();
        const name = input.name.trim();

        if (!name || !url) {
            showToast({
                message:
                    'Please provide both a URL and a custom name to save a preset.',
                type: 'warn',
            });
            return;
        }
        eventBus.dispatch('ui:save-preset-requested', { name, url, button });
    };

    const toggleDropdown = (groupEl, show) => {
        const dropdown = groupEl.querySelector('.preset-dropdown');
        if (dropdown) dropdown.classList.toggle('hidden', !show);
    };

    let hideTimeout;
    const handleFocusIn = (e) =>
        toggleDropdown(
            /** @type {HTMLElement} */ (e.currentTarget).closest(
                '.stream-input-group'
            ),
            true
        );
    const handleFocusOut = (e) => {
        const groupEl = /** @type {HTMLElement} */ (e.currentTarget).closest(
            '.stream-input-group'
        );
        hideTimeout = setTimeout(() => toggleDropdown(groupEl, false), 150);
    };
    const handleDropdownFocusIn = () => clearTimeout(hideTimeout);

    return html`<div
        data-testid="stream-input-group"
        class="stream-input-group ${input.id > 1
            ? 'border-t border-gray-700 pt-6 mt-6'
            : ''}"
        data-id="${input.id}"
    >
        <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold text-gray-300">
                Stream ${useAnalysisStore
                    .getState()
                    .streamInputs.findIndex((i) => i.id === input.id) + 1}
            </h3>
            ${!isOnlyStream
                ? html`<button
                      class="remove-stream-btn text-red-400 hover:text-red-600 font-bold text-sm"
                      @click=${() => analysisActions.removeStreamInput(input.id)}
                  >
                      &times; Remove
                  </button>`
                : ''}
        </div>
        <div class="space-y-4">
            <div
                class="relative"
                @focusin=${handleFocusIn}
                @focusout=${handleFocusOut}
            >
                <div class="flex flex-col md:flex-row items-center gap-4">
                    <input
                        type="url"
                        class="input-url w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter Manifest URL or click to see presets..."
                        .value=${input.url}
                        @input=${(e) =>
                            analysisActions.updateStreamInput(
                                input.id,
                                'url',
                                e.target.value
                            )}
                        autocomplete="off"
                    />
                    <label
                        for="file-${input.id}"
                        class="block w-full md:w-auto cursor-pointer bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md text-center flex-shrink-0"
                        >Upload File</label
                    >
                    <input
                        type="file"
                        id="file-${input.id}"
                        class="input-file hidden"
                        accept=".mpd, .xml, .m3u8"
                        @change=${(e) => {
                            analysisActions.updateStreamInput(
                                input.id,
                                'file',
                                e.target.files[0]
                            );
                            analysisActions.updateStreamInput(
                                input.id,
                                'url',
                                ''
                            );
                        }}
                    />
                </div>
                <div
                    class="preset-dropdown hidden absolute top-full left-0 right-0 mt-2 z-30 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto"
                    @focusin=${handleDropdownFocusIn}
                >
                    ${renderDropdownSection(
                        'Saved',
                        presets,
                        true,
                        presets,
                        rerenderCallback
                    )}
                    ${renderDropdownSection(
                        'Recent',
                        history,
                        false,
                        presets,
                        rerenderCallback
                    )}
                    <div>
                        <h4
                            class="font-bold text-gray-200 text-xs tracking-wider uppercase px-3 pt-3 pb-2 sticky top-0 bg-gray-900 z-10 border-b border-gray-800/50"
                        >
                            Examples
                        </h4>
                        <div class="p-2">
                            ${Object.entries(groupedExamples).map(
                                ([protocol, types]) => html`
                                    <div class="mt-2">
                                        <h5
                                            class="font-semibold text-gray-300 text-sm px-3 py-2 bg-gray-900/50 rounded-t-md"
                                        >
                                            ${protocol.toUpperCase()}
                                        </h5>
                                        <div
                                            class="border border-t-0 border-gray-700/50 rounded-b-md"
                                        >
                                            ${Object.entries(types).map(
                                                ([type, items]) =>
                                                    renderExampleCategory(
                                                        `${type
                                                            .charAt(0)
                                                            .toUpperCase()}${type.slice(
                                                            1
                                                        )}`,
                                                        items,
                                                        presets,
                                                        rerenderCallback
                                                    )
                                            )}
                                        </div>
                                    </div>
                                `
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div
                class="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-gray-700"
            >
                <input
                    type="text"
                    class="input-name w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600"
                    placeholder="Enter a custom name to save this URL"
                    .value=${input.name}
                    @input=${(e) =>
                        analysisActions.updateStreamInput(
                            input.id,
                            'name',
                            e.target.value
                        )}
                />
                <button
                    class="save-preset-btn w-full sm:w-auto flex-shrink-0 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    @click=${handleSavePreset}
                    ?disabled=${presetUrls.has(input.url) || !input.url}
                >
                    Save as Preset
                </button>
            </div>
        </div>
    </div>`;
};

const getStreamInputsTemplate = (rerenderCallback) => {
    const { streamInputs } = useAnalysisStore.getState();
    return html`${streamInputs.map((input) =>
        streamInputTemplate(input, streamInputs.length === 1, rerenderCallback)
    )}`;
};

export const inputViewTemplate = (rerenderCallback) => {
    const { streamInputs } = useAnalysisStore.getState();

    const handleAnalysis = () => {
        startAnalysisUseCase({ inputs: streamInputs }, container.services);
    };

    const showAboutModal = (e) => {
        e.preventDefault();
        openModalWithContent({
            title: 'About Stream Analyzer',
            url: '',
            content: { type: 'about', data: {} },
        });
    };

    return html`<div
        class="bg-gray-800 p-6 rounded-lg shadow-2xl w-full max-w-3xl"
    >
        <div class="flex items-center gap-4 mb-6">
            <div>
                <h1 class="text-3xl sm:text-4xl font-bold text-white">
                    Stream Analyzer
                </h1>
                <p class="text-gray-400 mt-2 text-sm sm:text-base">
                    Analyze and compare DASH & HLS streams against industry
                    standards.
                </p>
            </div>
            <button
                id="about-btn"
                title="About this application"
                class="text-gray-500 hover:text-white transition-colors ml-auto"
                @click=${showAboutModal}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            </button>
        </div>
        <div id="stream-inputs" class="space-y-6">
            ${getStreamInputsTemplate(rerenderCallback)}
        </div>
        <div class="flex flex-col sm:flex-row gap-4 mt-6">
            <button
                id="clear-all-btn"
                data-testid="clear-all-btn"
                class="w-full sm:w-auto flex-grow bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                @click=${() => analysisActions.clearAllStreamInputs()}
            >
                Clear All
            </button>
            <button
                id="add-stream-btn"
                data-testid="add-stream-btn"
                class="w-full sm:w-auto flex-grow bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                @click=${() => analysisActions.addStreamInput()}
            >
                Add Another Stream
            </button>
            <button
                id="analyze-btn"
                data-testid="analyze-btn"
                class="w-full sm:w-auto flex-grow bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                @click=${handleAnalysis}
            >
                ${streamInputs.length > 1
                    ? 'Analyze & Compare'
                    : 'Analyze'}
            </button>
        </div>
    </div>`;
};