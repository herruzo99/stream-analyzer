import { html, render } from 'lit-html';
import { dom, analysisState } from '../core/state.js';
import { exampleStreams } from '../data/example-streams.js';

const streamInputTemplate = (
    streamId,
    isFirstStream,
    urlHistory,
    exampleStreams
) => {
    const exampleOptions = exampleStreams.map(
        (stream) => html`<option value="${stream.url}">${stream.name}</option>`
    );
    const historyOptions = urlHistory.map((url) => {
        try {
            return html`<option value="${url}">
                ${new URL(url).hostname}
            </option>`;
        } catch (_e) {
            return html`<option value="${url}">${url}</option>`;
        }
    });

    const removeHandler = (e) => {
        /** @type {HTMLElement} */ (e.target)
            .closest('.stream-input-group')
            .remove();
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
        <div class="space-y-3">
            <div class="flex flex-col sm:flex-row items-center gap-4">
                <input
                    type="url"
                    id="url-${streamId}"
                    class="input-url w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Manifest URL (.mpd, .m3u8)..."
                    .value=${isFirstStream && urlHistory.length > 0
                        ? urlHistory[0]
                        : ''}
                />
                <span class="text-gray-500">OR</span>
                <label
                    for="file-${streamId}"
                    class="block w-full sm:w-auto cursor-pointer bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md text-center flex-shrink-0"
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
            <div class="flex flex-col sm:flex-row items-center gap-4">
                <select
                    class="examples-dropdown w-full bg-gray-700 text-white rounded-md border-gray-600 p-2 text-sm"
                    @change=${handleDropdownChange}
                >
                    <option value="">
                        -- Select from Examples or History --
                    </option>
                    <optgroup label="Examples">${exampleOptions}</optgroup>
                    ${historyOptions.length > 0
                        ? html`<optgroup label="History">
                              ${historyOptions}
                          </optgroup>`
                        : ''}
                </select>
                <p
                    class="file-name-display text-xs text-gray-500 h-4 w-full sm:w-auto flex-shrink-0"
                ></p>
            </div>
        </div>
    </div>`;
};

const handleFileChange = (e) => {
    const fileInput = /** @type {HTMLInputElement} */ (e.target);
    const group = fileInput.closest('.stream-input-group');
    const file = fileInput.files[0];
    if (file) {
        group.querySelector('.file-name-display').textContent = `Selected: ${
            file.name
        }`;
        /** @type {HTMLInputElement} */ (
            group.querySelector('.input-url')
        ).value = '';
        /** @type {HTMLSelectElement} */ (
            group.querySelector('.examples-dropdown')
        ).value = '';
    }
};

const handleDropdownChange = (e) => {
    const dropdown = /** @type {HTMLSelectElement} */ (e.target);
    const group = dropdown.closest('.stream-input-group');
    if (dropdown.value) {
        /** @type {HTMLInputElement} */ (
            group.querySelector('.input-url')
        ).value = dropdown.value;
        /** @type {HTMLInputElement} */ (
            group.querySelector('.input-file')
        ).value = '';
        group.querySelector('.file-name-display').textContent = '';
    }
};

export function addStreamInput() {
    const streamId = analysisState.streamIdCounter++;
    const isFirstStream = streamId === 0;
    const urlHistory = JSON.parse(
        localStorage.getItem('dash_analyzer_history') || '[]'
    );

    const container = document.createElement('div');
    render(
        streamInputTemplate(
            streamId,
            isFirstStream,
            urlHistory,
            exampleStreams
        ),
        container
    );
    dom.streamInputs.appendChild(container.firstElementChild);
}