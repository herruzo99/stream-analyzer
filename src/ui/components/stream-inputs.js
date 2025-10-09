import { html, render } from 'lit-html';
import {
    useAnalysisStore,
    analysisActions,
} from '@/state/analysisStore';
import { exampleStreams } from '@/data/example-streams';
import {
    getHistory,
    getPresets,
    deleteHistoryItem,
    deletePreset,
} from '@/infrastructure/persistence/streamStorage';
import { eventBus } from '@/application/event-bus';
import { showToast } from './toast.js';

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

        // Also clear the file input imperatively for immediate UI feedback
        const fileInput = /** @type {HTMLInputElement} */ (
            group.querySelector('.input-file')
        );
        if (fileInput) fileInput.value = '';
    }
    const dropdown = group.querySelector('.preset-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
};

const renderStreamListItem = (stream, isPreset, presets) => {
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
            // For a non-critical UI element like a dropdown, imperatively re-rendering
            // the parent group is acceptable to avoid a full app re-render.
            const group = e.target.closest('.stream-input-group');
            if (group) {
                const newHistory = getHistory();
                const newPresets = getPresets();
                const input = useAnalysisStore
                    .getState()
                    .streamInputs.find(
                        (i) =>
                            i.id ===
                            parseInt(
                                /** @type {HTMLElement} */ (group).dataset.id,
                                10
                            )
                    );
                const isOnly =
                    useAnalysisStore.getState().streamInputs.length == 1;

                const newTemplate = streamInputTemplate(
                    input,
                    isOnly,
                    newHistory,
                    newPresets
                );
                render(newTemplate, group);
            }
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

const renderDropdownSection = (title, items, isPreset = false, presets) => {
    if (!items || items.length === 0) return '';
    return html`<div>
        <h4
            class="font-bold text-gray-200 text-xs tracking-wider uppercase px-3 pt-3 pb-2 sticky top-0 bg-gray-900 z-10 border-b border-gray-800/50"
        >
            ${title}
        </h4>
        <ul class="divide-y divide-gray-700/50">
            ${items.map((item) =>
                renderStreamListItem(item, isPreset, presets)
            )}
        </ul>
    </div>`;
};

const renderExampleCategory = (title, items, presets) => {
    if (!items || items.length === 0) return '';
    return html`<div>
        <h5 class="font-medium text-gray-400 px-3 pt-2 pb-1">${title}</h5>
        <ul class="divide-y divide-gray-700/50">
            ${items.map((item) => renderStreamListItem(item, false, presets))}
        </ul>
    </div>`;
};

const streamInputTemplate = (input, isOnlyStream, history, presets) => {
    const { streamInputs } = useAnalysisStore.getState();
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
        // Dispatch to the use case via event bus
        eventBus.dispatch('ui:save-preset-requested', { name, url, button });
    };

    const toggleDropdown = (groupEl, show) => {
        const dropdown = groupEl.querySelector('.preset-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('hidden', !show);
        }
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
        const groupEl = /** @type {HTMLElement} */ (
            e.currentTarget
        ).closest('.stream-input-group');
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
                Stream ${streamInputs.findIndex((i) => i.id === input.id) + 1}
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
                    ${renderDropdownSection('Saved', presets, true, presets)}
                    ${renderDropdownSection('Recent', history, false, presets)}
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
                                                        presets
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

export function getStreamInputsTemplate() {
    const { streamInputs } = useAnalysisStore.getState();
    const history = getHistory();
    const presets = getPresets();
    return html`${streamInputs.map((input, index) =>
        streamInputTemplate(input, streamInputs.length == 1, history, presets)
    )}`;
}