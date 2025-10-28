import { html } from 'lit-html';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { eventBus } from '@/application/event-bus';
import { showToast } from '@/ui/components/toast';
import { openModalWithContent } from '@/ui/services/modalService';
import * as icons from '@/ui/icons';
import { tooltipTriggerClasses } from '../shared/constants.js';
import { getPresets } from '@/infrastructure/persistence/streamStorage';

// --- Local State for this View ---
let activeTab = 'streams';
const inputTabs = new Map(); // Map<inputId, 'stream' | 'drm'>

const authParamRowTemplate = (param, inputId, type, isDrm) => {
    const updateAction = isDrm
        ? analysisActions.updateDrmAuthParam
        : analysisActions.updateAuthParam;
    const removeAction = isDrm
        ? analysisActions.removeDrmAuthParam
        : analysisActions.removeAuthParam;

    return html`
        <div class="flex items-center gap-2">
            <input
                type="text"
                class="input-field"
                placeholder="Key"
                .value=${param.key}
                @input=${(e) =>
                    updateAction(
                        inputId,
                        type,
                        param.id,
                        'key',
                        e.target.value
                    )}
            />
            <input
                type="text"
                class="input-field"
                placeholder="Value"
                .value=${param.value}
                @input=${(e) =>
                    updateAction(
                        inputId,
                        type,
                        param.id,
                        'value',
                        e.target.value
                    )}
            />
            <button
                type="button"
                @click=${() => removeAction(inputId, type, param.id)}
                class="text-red-400 hover:text-red-300 p-1 shrink-0 text-2xl font-bold"
            >
                &times;
            </button>
        </div>
    `;
};

const authSectionTemplate = (title, type, params, inputId, isDrm) => {
    const addAction = isDrm
        ? analysisActions.addDrmAuthParam
        : analysisActions.addAuthParam;
    return html`
        <div>
            <div class="flex justify-between items-center mb-2">
                <h5 class="font-semibold text-gray-300 text-sm">${title}</h5>
                <button
                    type="button"
                    @click=${() => addAction(inputId, type)}
                    class="text-xs text-blue-400 hover:text-blue-300 font-bold"
                >
                    + Add
                </button>
            </div>
            <div class="space-y-2">
                ${params.length > 0
                    ? params.map((p) =>
                          authParamRowTemplate(p, inputId, type, isDrm)
                      )
                    : html`<p class="text-xs text-gray-500 italic">
                          No ${title.toLowerCase()} configured.
                      </p>`}
            </div>
        </div>
    `;
};

const streamAuthSettingsTemplate = (inputId, auth) => html`
    <div class="space-y-4">
        ${authSectionTemplate(
            'Manifest Request Headers',
            'headers',
            auth.headers,
            inputId,
            false
        )}
        ${authSectionTemplate(
            'Manifest Query Parameters',
            'queryParams',
            auth.queryParams,
            inputId,
            false
        )}
    </div>
`;

const drmAuthSettingsTemplate = (inputId, drmAuth) => {
    const cert = drmAuth.serverCertificate;
    const certIsFile = cert instanceof File;
    const certIsFileStub = certIsFile && cert.size === 0;
    const certUrlValue = !certIsFile ? cert || '' : '';
    let certFileLabel = 'Upload .der';
    let certFileClasses = 'bg-gray-600 hover:bg-gray-700';

    if (certIsFileStub) {
        certFileLabel = `RE-SELECT: ${cert.name}`;
        certFileClasses =
            'bg-yellow-600 hover:bg-yellow-700 text-yellow-900 animate-pulse';
    } else if (certIsFile) {
        certFileLabel = cert.name;
        certFileClasses = 'bg-green-600 text-white';
    }

    return html`
        <div class="space-y-4">
            <div>
                <label for="license-url-${inputId}" class="input-label">
                    License Server URL
                    <span
                        class="ml-1 text-cyan-400 ${tooltipTriggerClasses}"
                        data-tooltip="Provide a license server URL to override any found in the manifest. Leave blank to let the player attempt auto-discovery."
                        >?</span
                    >
                </label>
                <input
                    type="url"
                    id="license-url-${inputId}"
                    class="input-field"
                    placeholder="Leave blank for auto-discovery"
                    .value=${drmAuth.licenseServerUrl}
                    @input=${(e) =>
                        analysisActions.updateStreamInput(inputId, 'drmAuth', {
                            ...drmAuth,
                            licenseServerUrl: e.target.value,
                        })}
                />
            </div>
            <div>
                <label for="cert-url-${inputId}" class="input-label">
                    Service Certificate
                    <span
                        class="ml-1 text-cyan-400 ${tooltipTriggerClasses}"
                        data-tooltip="URL to the DRM service certificate (.der) or upload the file directly. Required for client authentication with some Widevine servers."
                        >?</span
                    >
                </label>
                <div class="flex items-center gap-2">
                    <input
                        type="url"
                        id="cert-url-${inputId}"
                        class="input-field"
                        placeholder="Enter URL..."
                        .value=${certUrlValue}
                        ?disabled=${certIsFile}
                        @input=${(e) =>
                            analysisActions.updateStreamInput(
                                inputId,
                                'drmAuth',
                                {
                                    ...drmAuth,
                                    serverCertificate: e.target.value,
                                }
                            )}
                    />
                    <label
                        for="cert-file-${inputId}"
                        class="shrink-0 cursor-pointer ${certFileClasses} text-white font-bold py-2 px-3 rounded-md text-center text-sm truncate"
                        >${certFileLabel}</label
                    >
                    <input
                        type="file"
                        id="cert-file-${inputId}"
                        class="hidden"
                        accept=".der"
                        @change=${(e) =>
                            analysisActions.updateStreamInput(
                                inputId,
                                'drmAuth',
                                {
                                    ...drmAuth,
                                    serverCertificate: e.target.files[0],
                                }
                            )}
                    />
                </div>
            </div>
            ${authSectionTemplate(
                'License Request Headers',
                'headers',
                drmAuth.headers,
                inputId,
                true
            )}
            ${authSectionTemplate(
                'License Request Query Parameters',
                'queryParams',
                drmAuth.queryParams,
                inputId,
                true
            )}
        </div>
    `;
};

const streamInputTemplate = (input, rerenderCallback) => {
    const handleSavePreset = (e) => {
        const button = /** @type {HTMLButtonElement} */ (e.target);
        const url = input.url.trim();
        const name = input.name.trim();

        if (!name || !url) {
            showToast({
                message: 'URL and a custom name are required to save a preset.',
                type: 'warn',
            });
            return;
        }
        eventBus.dispatch('ui:save-preset-requested', { name, url, button });
    };

    const currentInputTab = inputTabs.get(input.id) || 'stream';
    const setInputTab = (tabName) => {
        inputTabs.set(input.id, tabName);
        rerenderCallback();
    };

    const isPreset = getPresets().some((p) => p.url === input.url);

    return html`
        <div class="space-y-4">
            <div class="relative">
                <input
                    type="url"
                    class="input-field w-full"
                    placeholder="Enter Manifest URL..."
                    .value=${input.url}
                    @input=${(e) =>
                        analysisActions.updateStreamInput(
                            input.id,
                            'url',
                            e.target.value
                        )}
                    autocomplete="off"
                />
            </div>
            <div class="mt-4">
                <div class="border-b border-gray-700">
                    <nav class="-mb-px flex space-x-4" aria-label="Tabs">
                        <button
                            @click=${() => setInputTab('stream')}
                            class="tab-button ${currentInputTab === 'stream'
                                ? 'active'
                                : ''}"
                        >
                            Stream Auth
                        </button>
                        <button
                            @click=${() => setInputTab('drm')}
                            class="tab-button ${currentInputTab === 'drm'
                                ? 'active'
                                : ''}"
                        >
                            DRM & Encryption
                        </button>
                    </nav>
                </div>
                <div
                    class="mt-3 p-4 bg-gray-900/50 rounded-lg min-h-[380px] overflow-y-auto"
                >
                    ${currentInputTab === 'stream'
                        ? streamAuthSettingsTemplate(input.id, input.auth)
                        : drmAuthSettingsTemplate(input.id, input.drmAuth)}
                </div>
            </div>
            <div
                class="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-gray-700"
            >
                <input
                    type="text"
                    class="input-field w-full"
                    placeholder="Custom name (to save as preset)"
                    .value=${input.name}
                    @input=${(e) =>
                        analysisActions.updateStreamInput(
                            input.id,
                            'name',
                            e.target.value
                        )}
                />
                <button
                    class="action-button-secondary w-full sm:w-auto"
                    @click=${handleSavePreset}
                    ?disabled=${isPreset || !input.url}
                >
                    ${isPreset ? 'Saved' : 'Save as Preset'}
                </button>
            </div>
        </div>
    `;
};

const segmentInputTemplate = (rerenderCallback) => {
    // ... (This part is unchanged as it's a separate tab)
    return html` ... `;
};

export const inputViewTemplate = (rerenderCallback) => {
    const { streamInputs, activeStreamInputId } = useAnalysisStore.getState();

    const handleStreamAnalysis = () =>
        eventBus.dispatch('ui:stream-analysis-requested', {
            inputs: streamInputs,
        });
    const handleSegmentAnalysis = () =>
        eventBus.dispatch('ui:segment-analysis-requested', {
            files: [] /* Replace with state */,
        });
    const showAboutModal = (e) => {
        e.preventDefault();
        openModalWithContent({
            title: 'About Stream Analyzer',
            url: '',
            content: { type: 'about', data: {} },
        });
    };
    const showLibraryModal = (e) => {
        e.preventDefault();
        openModalWithContent({
            title: 'Stream Library',
            url: '',
            content: { type: 'streamLibrary', data: {} },
        });
    };

    const setMainTab = (tabName) => {
        activeTab = tabName;
        rerenderCallback();
    };

    const activeInput = streamInputs.find((i) => i.id === activeStreamInputId);

    return html`
        <style>
            .input-field {
                width: 100%;
                background-color: #374151;
                color: white;
                border-radius: 0.375rem;
                padding: 0.5rem;
                border: 1px solid #4b5563;
            }
            .input-label {
                display: block;
                font-size: 0.875rem;
                font-weight: 500;
                color: #d1d5db;
                margin-bottom: 0.25rem;
            }
            .action-button-primary {
                background-color: #2563eb;
                color: white;
                font-weight: 700;
                padding: 0.75rem 1rem;
                border-radius: 0.375rem;
                transition: background-color 0.2s;
            }
            .action-button-primary:hover {
                background-color: #1d4ed8;
            }
            .action-button-secondary {
                background-color: #047857;
                color: white;
                font-weight: 700;
                padding: 0.5rem 1rem;
                border-radius: 0.375rem;
                transition: background-color 0.2s;
            }
            .action-button-secondary:hover {
                background-color: #065f46;
            }
            .action-button-secondary:disabled {
                background-color: #4b5563;
                opacity: 0.5;
                cursor: not-allowed;
            }
            .tab-button {
                border-bottom-width: 2px;
            }
            .tab-button.active {
                border-color: #3b82f6;
                color: white;
            }
            .tab-button:not(.active) {
                border-color: transparent;
                color: #9ca3af;
            }
            .tab-button:not(.active):hover {
                color: #e5e7eb;
            }
        </style>
        <div class="w-full max-w-3xl animate-fadeIn">
            <header class="flex items-start justify-between gap-4 mb-6">
                <div>
                    <h1 class="text-3xl sm:text-4xl font-bold text-white">
                        Stream Analyzer
                    </h1>
                    <p class="text-gray-400 mt-2 text-sm sm:text-base">
                        An advanced, in-browser tool for analyzing DASH & HLS
                        streams.
                    </p>
                </div>
                <button
                    @click=${showAboutModal}
                    title="About this application"
                    class="text-gray-500 hover:text-white transition-colors shrink-0"
                >
                    ${icons.informationCircle}
                </button>
            </header>

            <div class="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-2xl">
                <div
                    class="border-b border-gray-700 flex flex-wrap items-center justify-between gap-4"
                >
                    <nav class="-mb-px flex space-x-4" aria-label="Input Tabs">
                        ${streamInputs.map(
                            (input, index) => html`
                                <button
                                    @click=${() =>
                                        analysisActions.setActiveStreamInputId(
                                            input.id
                                        )}
                                    class="flex items-center gap-2 py-3 px-1 text-sm font-medium ${input.id ===
                                    activeStreamInputId
                                        ? 'border-blue-500 text-white'
                                        : 'border-transparent text-gray-400 hover:text-gray-200'} border-b-2"
                                >
                                    <span
                                        >${input.name ||
                                        `Stream ${index + 1}`}</span
                                    >
                                    ${streamInputs.length > 1
                                        ? html`<button
                                              @click=${(e) => {
                                                  e.stopPropagation();
                                                  analysisActions.removeStreamInput(
                                                      input.id
                                                  );
                                              }}
                                              class="text-gray-500 hover:text-red-400"
                                          >
                                              &times;
                                          </button>`
                                        : ''}
                                </button>
                            `
                        )}
                        <button
                            @click=${() => analysisActions.addStreamInput()}
                            class="py-3 px-2 text-gray-400 hover:text-white"
                            title="Add new stream input"
                        >
                            ${icons.plusCircle}
                        </button>
                    </nav>
                    <button
                        @click=${showLibraryModal}
                        class="text-sm font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-2"
                    >
                        <svg
                            class="w-5 h-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"
                            ></path>
                        </svg>
                        Stream Library
                    </button>
                </div>

                <div class="pt-6">
                    ${activeInput
                        ? streamInputTemplate(activeInput, rerenderCallback)
                        : html`<p class="text-gray-500">
                              No stream selected.
                          </p>`}
                </div>

                <div
                    class="flex flex-col sm:flex-row gap-4 mt-6 pt-6 border-t border-gray-700"
                >
                    <button
                        @click=${() =>
                            analysisActions.clearAllStreamInputs()}
                        class="w-full sm:w-auto grow bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                    >
                        Clear All
                    </button>
                    <button
                        @click=${handleStreamAnalysis}
                        class="action-button-primary w-full sm:w-auto grow"
                    >
                        ${streamInputs.length > 1
                            ? 'Analyze & Compare'
                            : 'Analyze Stream'}
                    </button>
                </div>
            </div>
        </div>
    `;
};