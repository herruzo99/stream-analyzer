import { html, render } from 'lit-html';
import { dom } from '../../core/dom.js';
import { useStore } from '../../core/store.js';
import { exampleStreams } from '../../data/example-streams.js';
import {
    getHistory,
    getPresets,
    savePreset,
    deleteHistoryItem,
    deletePreset,
    fetchStreamMetadata,
} from '../../shared/utils/stream-storage.js';
import { showToast } from './toast.js';

// Module-level state for the stream inputs
let streamInputIds = [];

const getBadge = (text, colorClasses) => {
    if (!text) return '';
    return html`<span
        class="text-xs font-semibold px-2 py-0.5 rounded-full ${colorClasses}"
        >${text.toUpperCase()}</span
    >`;
};

const renderStreamListItem = (stream, isPreset) => {
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
            renderStreamInputs(); // Re-render the dropdown
        }
    };

    return html`<li
        class="group px-3 py-2 hover:bg-gray-700 cursor-pointer flex justify-between items-center"
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

// Top-level section (Recent, Saved)
const renderDropdownSection = (title, items, isPreset = false) => {
    if (!items || items.length === 0) return '';
    return html`<div>
        <h4
            class="font-bold text-gray-200 text-xs tracking-wider uppercase px-3 pt-3 pb-2 sticky top-0 bg-gray-900 z-10 border-b border-gray-800/50"
        >
            ${title}
        </h4>
        <ul class="divide-y divide-gray-700/50">
            ${items.map((item) => renderStreamListItem(item, isPreset))}
        </ul>
    </div>`;
};

// Sub-section for examples (Live, VOD)
const renderExampleCategory = (title, items) => {
    if (!items || items.length === 0) return '';
    return html`<div>
        <h5 class="font-medium text-gray-400 px-3 pt-2 pb-1">${title}</h5>
        <ul class="divide-y divide-gray-700/50">
            ${items.map((item) => renderStreamListItem(item, false))}
        </ul>
    </div>`;
};

const streamInputTemplate = (streamId, isFirstStream, history, presets) => {
    // --- Data Filtering and Grouping Logic ---
    const validHistory = history.filter((item) => item.name && item.url);
    const validPresets = presets.filter((item) => item.name && item.url);
    const presetUrls = new Set(validPresets.map((p) => p.url));

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

    const removeHandler = (e) => {
        const groupEl = /** @type {HTMLElement} */ (e.target).closest(
            '.stream-input-group'
        );
        if (groupEl) {
            const idToRemove = parseInt(
                /** @type {HTMLElement} */ (groupEl).dataset.id
            );
            streamInputIds = streamInputIds.filter((id) => id !== idToRemove);
            renderStreamInputs();
        }
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

    const toggleDropdown = (groupEl, show) => {
        const dropdown = groupEl.querySelector('.preset-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('hidden', !show);
        }
    };

    const handleFocusIn = (e) => {
        toggleDropdown(
            /** @type {HTMLElement} */ (e.currentTarget).closest(
                '.stream-input-group'
            ),
            true
        );
    };

    let hideTimeout;
    const handleFocusOut = (e) => {
        const groupEl = /** @type {HTMLElement} */ (e.currentTarget).closest(
            '.stream-input-group'
        );
        // Delay hiding to allow clicks inside the dropdown
        hideTimeout = setTimeout(() => {
            toggleDropdown(groupEl, false);
        }, 150);
    };

    // Need to clear the timeout if we focus back into the component
    const handleDropdownFocusIn = () => clearTimeout(hideTimeout);

    return html` <div
        data-testid="stream-input-group"
        class="stream-input-group ${!isFirstStream
            ? 'border-t border-gray-700 pt-6 mt-6'
            : ''}"
        data-id="${streamId}"
    >
        <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold text-gray-300">
                Stream ${streamInputIds.indexOf(streamId) + 1}
            </h3>
            ${!isFirstStream
                ? html`<button
                      class="remove-stream-btn text-red-400 hover:text-red-600 font-bold text-sm"
                      @click=${removeHandler}
                  >
                      &times; Remove
                  </button>`
                : ''}
        </div>
        <div class="space-y-4">
            <!-- URL Input and Dropdown Container -->
            <div
                class="relative"
                @focusin=${handleFocusIn}
                @focusout=${handleFocusOut}
            >
                <div class="flex flex-col md:flex-row items-center gap-4">
                    <input
                        type="url"
                        id="url-${streamId}"
                        class="input-url w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter Manifest URL or click to see presets..."
                        .value=${isFirstStream && validHistory.length > 0
                            ? validHistory[0].url
                            : ''}
                        @input=${handleUrlInput}
                        autocomplete="off"
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

                <!-- Dropdown Menu -->
                <div
                    class="preset-dropdown hidden absolute top-full left-0 right-0 mt-2 z-30 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto"
                    @focusin=${handleDropdownFocusIn}
                >
                    ${renderDropdownSection('Saved', validPresets, true)}
                    ${renderDropdownSection('Recent', validHistory, false)}
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
                                                        items
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
        // Hide dropdown
        const dropdown = group.querySelector('.preset-dropdown');
        if (dropdown) dropdown.classList.add('hidden');
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
    // Hide dropdown
    const dropdown = group.querySelector('.preset-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
};

const handleSavePreset = async (e) => {
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
        showToast({
            message:
                'Please provide both a URL and a custom name to save a preset.',
            type: 'warn',
        });
        return;
    }

    button.disabled = true;
    button.textContent = 'Saving...';

    try {
        const { protocol, type } = await fetchStreamMetadata(url);
        savePreset({
            name,
            url,
            protocol,
            type: type,
        });
        nameInput.value = '';
    } catch (err) {
        // Error toast is handled by fetchStreamMetadata
        console.error('Failed to save preset:', err);
    } finally {
        // This block guarantees the UI is reset, fixing the bug.
        renderStreamInputs();
    }
};

/**
 * Adds a new stream input to the state. Does not render.
 */
export function addStreamInput() {
    const currentCounter = useStore.getState().streamIdCounter;
    streamInputIds.push(currentCounter);
    useStore.setState({ streamIdCounter: currentCounter + 1 });
}

/**
 * Renders the entire list of stream inputs based on the current state.
 */
export function renderStreamInputs() {
    const history = getHistory();
    const presets = getPresets();

    const fullTemplate = html`${streamInputIds.map((id, index) =>
        streamInputTemplate(id, index === 0, history, presets)
    )}`;
    render(fullTemplate, dom.streamInputs);

    // Update the main analysis button text
    dom.analyzeBtn.textContent =
        streamInputIds.length > 1 ? 'Analyze & Compare' : 'Analyze';
}

/**
 * Resets the stream input state to a single input and renders it.
 */
export function resetAndRenderAllStreamInputs() {
    useStore.setState({ streamIdCounter: 0 });
    streamInputIds = [];
    addStreamInput();
    renderStreamInputs();
}
