import { html, render } from 'lit-html';
import { useStore, storeActions } from '../../app/store.js';
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

const getBadge = (text, colorClasses) => {
    if (!text) return '';
    return html`<span
        class="text-xs font-semibold px-2 py-0.5 rounded-full ${colorClasses}"
        >${text.toUpperCase()}</span
    >`;
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
            // Re-render via store change is not ideal here as it re-renders EVERYTHING.
            // For this specific, non-state-critical dropdown, a local re-render is acceptable.
            const group = e.target.closest('.stream-input-group');
            if (group) {
                const newHistory = getHistory();
                const newPresets = getPresets();
                const id = parseInt(group.dataset.id, 10);
                const isFirst =
                    useStore
                        .getState()
                        .streamInputIds.indexOf(
                            parseInt(group.dataset.id, 10)
                        ) === 0;
                const newTemplate = streamInputTemplate(
                    id,
                    isFirst,
                    newHistory,
                    newPresets
                );
                const tempDiv = document.createElement('div');
                document.body.appendChild(tempDiv);
                render(newTemplate, tempDiv);
                const newGroup = tempDiv.querySelector('.stream-input-group');
                group.parentElement.replaceChild(newGroup, group);
                document.body.removeChild(tempDiv);
            }
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

const handleFileChange = (e) => {
    const fileInput = /** @type {HTMLInputElement} */ (e.target);
    const group = fileInput.closest('.stream-input-group');
    if (fileInput.files[0]) {
        /** @type {HTMLInputElement} */ (
            group.querySelector('.input-url')
        ).value = '';
        const dropdown = group.querySelector('.preset-dropdown');
        if (dropdown) dropdown.classList.add('hidden');
    }
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
        savePreset({ name, url, protocol, type });
        nameInput.value = '';
        button.textContent = 'Saved!';
    } catch (err) {
        console.error('Failed to save preset:', err);
        button.textContent = 'Save as Preset';
        button.disabled = false;
    }
};

const streamInputTemplate = (streamId, isFirstStream, history, presets) => {
    const { streamInputIds } = useStore.getState();
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

    const removeHandler = (e) => {
        const groupEl = /** @type {HTMLElement} */ (e.target).closest(
            '.stream-input-group'
        );
        if (groupEl) {
            const idToRemove = parseInt(
                /** @type {HTMLElement} */ (groupEl).dataset.id
            );
            storeActions.removeStreamInputId(idToRemove);
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
        saveButton.textContent = 'Save as Preset';
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
        hideTimeout = setTimeout(() => {
            toggleDropdown(groupEl, false);
        }, 150);
    };
    const handleDropdownFocusIn = () => clearTimeout(hideTimeout);

    return html`<div
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
                        .value=${isFirstStream && history.length > 0
                            ? history[0].url
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
                    id="name-${streamId}"
                    class="input-name w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600"
                    placeholder="Enter a custom name to save this URL"
                />
                <button
                    class="save-preset-btn w-full sm:w-auto flex-shrink-0 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    @click=${handleSavePreset}
                    ?disabled=${presetUrls.has(
                        isFirstStream && history.length > 0
                            ? history[0].url
                            : ''
                    )}
                >
                    Save as Preset
                </button>
            </div>
        </div>
    </div>`;
};

export function getStreamInputsTemplate() {
    const { streamInputIds } = useStore.getState();
    const history = getHistory();
    const presets = getPresets();
    return html`${streamInputIds.map((id, index) =>
        streamInputTemplate(id, index === 0, history, presets)
    )}`;
}

export function addStreamInput() {
    storeActions.addStreamInputId();
}

export function resetAndRenderAllStreamInputs() {
    storeActions.resetStreamInputIds();
}
