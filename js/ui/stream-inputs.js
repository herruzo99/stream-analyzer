import { html, render } from 'lit-html';
import { dom, analysisState } from '../core/state.js';
import { exampleStreams } from '../data/example-streams.js';

const HISTORY_KEY = 'dash_analyzer_history';
const PRESETS_KEY = 'dash_analyzer_presets';
const MAX_PRESETS = 50;

const getBadge = (text, colorClasses) => {
    if (!text) return '';
    return html`<span
        class="text-xs font-semibold px-2 py-0.5 rounded-full ${colorClasses}"
        >${text.toUpperCase()}</span
    >`;
};

const streamInputTemplate = (streamId, isFirstStream, history, presets) => {
    // --- Data Filtering and Grouping Logic ---
    const validHistory = history.filter((item) => item.name && item.url);
    const validPresets = presets.filter((item) => item.name && item.url);
    const presetUrls = new Set(validPresets.map((p) => p.url));

    const groupedExamples = exampleStreams.reduce(
        (acc, stream) => {
            const { protocol, type } = stream;
            if (!acc[protocol]) acc[protocol] = { live: [], vod: [] };
            acc[protocol][type].push(stream);
            return acc;
        },
        { dash: { live: [], vod: [] }, hls: { live: [], vod: [] } }
    );

    const groupedPresets = validPresets.reduce(
        (acc, stream) => {
            const type = stream.type || 'vod'; // Default unknown types to VOD
            if (!acc[type]) acc[type] = [];
            acc[type].push(stream);
            return acc;
        },
        { live: [], vod: [] }
    );

    // --- Template Helpers ---
    const renderStreamListItem = (stream) => {
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

        return html`<li
            class="px-3 py-2 hover:bg-gray-700 cursor-pointer flex justify-between items-center"
            data-url="${stream.url}"
            data-name="${stream.name}"
            @click=${handleDropdownItemClick}
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
            <div class="flex-shrink-0 flex gap-2 ml-4">
                ${protocolBadge} ${typeBadge}
            </div>
        </li>`;
    };

    const renderCollapsibleSection = (title, items, isOpen = false) => {
        if (!items || items.length === 0) return '';
        return html`<details ?open=${isOpen}>
            <summary class="font-semibold text-gray-300 cursor-pointer">
                ${title}
            </summary>
            <div class="mt-2">
                <ul
                    class="divide-y divide-gray-700/50 max-h-60 overflow-y-auto"
                >
                    ${items.map(renderStreamListItem)}
                </ul>
            </div>
        </details>`;
    };

    const removeHandler = (e) => {
        /** @type {HTMLElement} */ (e.target)
            .closest('.stream-input-group')
            .remove();
    };

    const handleUrlInput = (e) => {
        const input = /** @type {HTMLInputElement} */ (e.target);
        const group = input.closest('.stream-input-group');
        const saveButton = /** @type {HTMLButtonElement} */ (
            group.querySelector('.save-preset-btn')
        );
        const url = input.value.trim();
        saveButton.disabled = presetUrls.has(url) || url === '';
    };

    return html` <div
        class="stream-input-group ${streamId > 0
            ? 'border-t border-gray-700 pt-6 mt-6'
            : ''}"
        data-id="${streamId}"
    >
        <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold text-gray-300">
                Stream ${streamId + 1}
            </h3>
            ${streamId > 0
                ? html`<button
                      class="remove-stream-btn text-red-400 hover:text-red-600 font-bold text-sm"
                      @click=${removeHandler}
                  >
                      &times; Remove
                  </button>`
                : ''}
        </div>
        <div class="space-y-4">
            <!-- URL and File Inputs -->
            <div class="flex flex-col md:flex-row items-center gap-4">
                <input
                    type="url"
                    id="url-${streamId}"
                    class="input-url w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Manifest URL (.mpd, .m3u8)..."
                    .value=${isFirstStream && validHistory.length > 0
                        ? validHistory[0].url
                        : ''}
                    @input=${handleUrlInput}
                />
                <label
                    for="file-${streamId}"
                    class="block w-full md:w-auto cursor-pointer bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md text-center flex-shrink-0"
                    >Upload File</label
                >
                <input
                    type="file"
                    id="file-${streamId}"
                    class="input-file hidden"
                    accept=".mpd, .xml, .m3u8"
                    @change=${handleFileChange}
                />
            </div>

            <!-- Collapsible Tree View -->
            <div
                class="bg-gray-900/50 border border-gray-700 rounded-lg p-3 space-y-3"
            >
                ${validHistory.length > 0
                    ? html`<div>
                          <h4
                              class="font-semibold text-gray-300 px-3 py-2 bg-gray-700/50 rounded-md"
                          >
                              Recent
                          </h4>
                          <ul
                              class="divide-y divide-gray-700/50 max-h-48 overflow-y-auto mt-2"
                          >
                              ${validHistory.map(renderStreamListItem)}
                          </ul>
                      </div>`
                    : ''}
                ${validPresets.length > 0
                    ? html`<details
                          class="pt-2 border-t border-gray-700"
                          open
                      >
                          <summary
                              class="font-semibold text-gray-300 cursor-pointer"
                          >
                              Saved
                          </summary>
                          <div class="mt-2 space-y-2">
                              ${renderCollapsibleSection(
                                  'Live',
                                  groupedPresets.live
                              )}
                              ${renderCollapsibleSection(
                                  'VOD',
                                  groupedPresets.vod
                              )}
                          </div>
                      </details>`
                    : ''}

                <details class="pt-2 border-t border-gray-700">
                    <summary
                        class="font-semibold text-gray-300 cursor-pointer"
                    >
                        Examples
                    </summary>
                    <div class="mt-2 space-y-2">
                        <details>
                            <summary
                                class="font-semibold text-gray-300 cursor-pointer"
                            >
                                DASH
                            </summary>
                            <div class="mt-2 space-y-2">
                                ${renderCollapsibleSection(
                                    'Live',
                                    groupedExamples.dash.live
                                )}
                                ${renderCollapsibleSection(
                                    'VOD',
                                    groupedExamples.dash.vod
                                )}
                            </div>
                        </details>
                        <details>
                            <summary
                                class="font-semibold text-gray-300 cursor-pointer"
                            >
                                HLS
                            </summary>
                            <div class="mt-2 space-y-2">
                                ${renderCollapsibleSection(
                                    'Live',
                                    groupedExamples.hls.live
                                )}
                                ${renderCollapsibleSection(
                                    'VOD',
                                    groupedExamples.hls.vod
                                )}
                            </div>
                        </details>
                    </div>
                </details>
            </div>

            <!-- Save Preset Input -->
            <div
                class="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-gray-700"
            >
                <input
                    type="text"
                    id="name-${streamId}"
                    class="input-name w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600"
                    placeholder="Enter a custom name to save this URL"
                />
                <button
                    class="save-preset-btn w-full sm:w-auto flex-shrink-0 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    @click=${handleSavePreset}
                    ?disabled=${presetUrls.has(
                        isFirstStream && validHistory.length > 0
                            ? validHistory[0].url
                            : ''
                    )}
                >
                    Save as Preset
                </button>
            </div>
        </div>
    </div>`;
};

const handleFileChange = (e) => {
    const fileInput = /** @type {HTMLInputElement} */ (e.target);
    const group = fileInput.closest('.stream-input-group');
    if (fileInput.files[0]) {
        /** @type {HTMLInputElement} */ (
            group.querySelector('.input-url')
        ).value = '';
    }
};

const handleDropdownItemClick = (e) => {
    const item = /** @type {HTMLElement} */ (e.currentTarget);
    const group = item.closest('.stream-input-group');
    const urlInput = /** @type {HTMLInputElement} */ (
        group.querySelector('.input-url')
    );
    if (item.dataset.url) {
        urlInput.value = item.dataset.url;
        /** @type {HTMLInputElement} */ (
            group.querySelector('.input-name')
        ).value = item.dataset.name || '';
        /** @type {HTMLInputElement} */ (
            group.querySelector('.input-file')
        ).value = '';
        // Manually trigger the input event to update the save button state
        urlInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
};

const handleSavePreset = (e) => {
    const button = /** @type {HTMLButtonElement} */ (e.target);
    const group = button.closest('.stream-input-group');
    const nameInput = /** @type {HTMLInputElement} */ (
        group.querySelector('.input-name')
    );
    const urlInput = /** @type {HTMLInputElement} */ (
        group.querySelector('.input-url')
    );

    const name = nameInput.value.trim();
    const url = urlInput.value.trim();

    if (!name || !url) {
        alert('Please provide both a URL and a custom name to save a preset.');
        return;
    }

    let presets = /** @type {Array<object>} */ (
        JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]')
    );
    presets = presets.filter((item) => item.url !== url); // Remove old entry

    const protocol = url.includes('.m3u8') ? 'hls' : 'dash';
    presets.unshift({ name, url, protocol, type: null }); // Add new entry

    if (presets.length > MAX_PRESETS) {
        presets.length = MAX_PRESETS;
    }

    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    nameInput.value = '';
    alert(`Preset "${name}" saved!`);

    // Force a re-render of the input groups to show the new preset
    dom.streamInputs.innerHTML = '';
    analysisState.streamIdCounter = 0;
    addStreamInput();
};

export function addStreamInput() {
    const streamId = analysisState.streamIdCounter++;
    const isFirstStream = streamId === 0;
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    const presets = JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]');

    const container = document.createElement('div');
    render(
        streamInputTemplate(streamId, isFirstStream, history, presets),
        container
    );
    dom.streamInputs.appendChild(container.firstElementChild);
}