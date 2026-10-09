import { eventBus } from '@/application/event-bus';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { EVENTS } from '@/types/events';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const configSection = (title, icon, content) => html`
    <section class="mb-8 animate-fadeIn">
        <h3
            class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 pb-2"
        >
            <span class="text-blue-400">${icon}</span> ${title}
        </h3>
        ${content}
    </section>
`;

const drmToggle = (systemName, detected, isConfigured, onClick) => html`
    <div
        @click=${onClick}
        class="flex items-center justify-between p-4 rounded-t-xl transition-all cursor-pointer select-none ${isConfigured
        ? 'bg-slate-700 shadow-md'
        : 'bg-slate-800 hover:bg-slate-800'} ${!isConfigured
            ? 'rounded-b-xl'
            : ''}"
    >
        <div class="flex items-center gap-3">
            <div
                class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-400 shadow-inner"
            >
                ${systemName[0]}
            </div>
            <div>
                <div class="font-bold text-slate-100 text-sm">
                    ${systemName}
                </div>
                <div
                    class="text-[10px] ${detected
        ? 'text-emerald-400'
        : 'text-slate-400'}"
                >
                    ${detected ? 'Signal Detected' : 'Not Detected'}
                </div>
            </div>
        </div>
        <div
            class="relative w-10 h-5 bg-slate-800 rounded-full transition-colors ${isConfigured
        ? 'bg-[#60a5fa]'
        : ''}"
        >
            <div
                class="absolute top-0.5 left-0.5 w-4 h-4 bg-slate-200 rounded-full shadow-sm transition-transform ${isConfigured
        ? 'translate-x-5'
        : 'translate-x-0'}"
            ></div>
        </div>
    </div>
`;

const headerInputRow = (header, index, inputId, isDrm) => {
    const update = isDrm
        ? analysisActions.updateDrmAuthParam
        : analysisActions.updateAuthParam;
    const remove = isDrm
        ? analysisActions.removeDrmAuthParam
        : analysisActions.removeAuthParam;

    return html`
        <div class="flex flex-col md:flex-row gap-2 mb-2 group animate-scaleIn">
            <input
                type="text"
                placeholder="Header-Name"
                class="bg-slate-800 text-slate-100 text-xs rounded px-3 py-2 font-mono w-full md:w-1/3 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                .value=${header.key}
                @input=${(e) =>
            update(
                inputId,
                'headers',
                header.id,
                'key',
                e.target.value
            )}
            />
            <div class="flex gap-2 flex-1">
                <input
                    type="text"
                    placeholder="Value"
                    class="bg-slate-800 text-emerald-400 text-xs rounded px-3 py-2 font-mono flex-1 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                    .value=${header.value}
                    @input=${(e) =>
            update(
                inputId,
                'headers',
                header.id,
                'value',
                e.target.value
            )}
                />
                <button
                    @click=${() => remove(inputId, 'headers', header.id)}
                    class="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors opacity-100 md:opacity-50 md:group-hover:opacity-100"
                >
                    ${icons.xCircle}
                </button>
            </div>
        </div>
    `;
};

export const inspectorPanelTemplate = () => {
    const { streamInputs, activeStreamInputId } = useAnalysisStore.getState();
    const { presets, presetSaveStatus } = useUiStore.getState();
    const activeInput = streamInputs.find((i) => i.id === activeStreamInputId);

    if (!activeInput) return html``;

    const detectedDrm = activeInput.detectedDrm || [];
    const isKnownPreset = presets.some((p) => p.url === activeInput.url);

    // Port: no themes in 1.2.0; solid styling throughout.
    const isSolid = true;

    // --- Header Actions Logic ---
    const handleSavePreset = () => {
        const nameToSave =
            activeInput.name || new URL(activeInput.url).hostname;
        eventBus.dispatch(EVENTS.UI.SAVE_PRESET_REQUESTED, {
            name: nameToSave,
            url: activeInput.url,
            isPreset: isKnownPreset,
        });
    };

    let saveBtnText = isKnownPreset ? 'Update Preset' : 'Save as Preset';
    let saveBtnIcon = icons.save;
    let saveBtnClass =
        'bg-slate-800 hover:bg-slate-800 text-slate-400';

    if (presetSaveStatus === 'saving') {
        saveBtnText = 'Saving...';
        saveBtnIcon = icons.spinner;
    } else if (presetSaveStatus === 'saved') {
        saveBtnText = 'Saved!';
        saveBtnIcon = icons.checkCircle;
        saveBtnClass =
            'bg-slate-800 text-emerald-400';
    } else if (presetSaveStatus === 'error') {
        saveBtnText = 'Error';
        saveBtnIcon = icons.alertTriangle;
        saveBtnClass =
            'bg-slate-800 text-red-400';
    }

    const headerActions = html`
        <div class="flex justify-between items-center mb-8">
            <h2
                class="text-2xl font-bold text-slate-100 flex items-center gap-3 tracking-tight"
            >
                ${icons.settings} Configuration
            </h2>
            <button
                @click=${handleSavePreset}
                ?disabled=${presetSaveStatus === 'saving'}
                class="flex items-center gap-2 px-4 py-2 ${isSolid ? 'rounded-md border border-slate-800' : 'rounded-xl shadow-lg'} text-xs font-bold transition-all ${saveBtnClass}"
            >
                ${saveBtnIcon} ${saveBtnText}
            </button>
        </div>
    `;

    // Identity Section
    const identityContent = html`
        <div class="grid grid-cols-1 gap-6">
            <div class="relative group">
                <label
                    class="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-wider"
                    >Friendly Name</label
                >
                <input
                    type="text"
                    class="w-full bg-slate-800 text-slate-100 text-sm ${isSolid ? 'rounded-none border-b border-slate-800 focus:border-blue-500' : 'rounded-xl shadow-inner backdrop-blur-sm focus:ring-1 focus:ring-blue-500'} px-4 py-3 outline-none transition-all"
                    .value=${activeInput.name || ''}
                    @input=${(e) =>
            analysisActions.updateStreamInput(
                activeInput.id,
                'name',
                e.target.value
            )}
                    placeholder="e.g. Production Stream A"
                />
            </div>
            <div class="relative group">
                <label
                    class="text-[10px] font-bold text-slate-400 uppercase mb-2 block flex justify-between tracking-wider"
                >
                    Source URL
                    ${activeInput.isTier0AnalysisLoading
            ? html`<span
                              class="text-blue-400 animate-pulse flex items-center gap-1"
                              >${icons.spinner} Analyzing...</span
                          >`
            : ''}
                </label>
                <input
                    type="text"
                    class="w-full bg-slate-800 text-amber-400 text-xs font-mono ${isSolid ? 'rounded-none border-b border-slate-800 focus:border-amber-500' : 'rounded-xl shadow-inner backdrop-blur-sm focus:ring-1 focus:ring-amber-500'} px-4 py-3 transition-all"
                    .value=${activeInput.url}
                    @input=${(e) =>
            analysisActions.updateStreamInput(
                activeInput.id,
                'url',
                e.target.value
            )}
                />
            </div>
        </div>
    `;

    // Network Section
    const networkContent = html`
        <div
            class="${isSolid ? 'bg-slate-800 border border-slate-800 p-6' : 'bg-slate-800 rounded-[2rem] p-6 backdrop-blur-xl shadow-xl'}"
        >
            <div class="flex justify-between items-center mb-6">
                <span
                    class="text-sm font-bold text-slate-400"
                    >Custom Headers</span
                >
                <button
                    @click=${() =>
            analysisActions.addAuthParam(activeInput.id, 'headers')}
                    class="text-[10px] font-bold text-blue-400 hover:text-[#60a5fa] uppercase tracking-wider flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-700 transition-colors"
                >
                    ${icons.plusCircle} Add
                </button>
            </div>
            <div class="space-y-2">
                ${activeInput.auth.headers.length > 0
            ? activeInput.auth.headers.map((h, i) =>
                headerInputRow(h, i, activeInput.id, false)
            )
            : html`<div
                          class="text-center py-6 text-slate-400 text-xs italic ${isSolid ? 'border border-dashed border-slate-800' : 'rounded-xl bg-slate-800'}"
                      >
                          No headers configured
                      </div>`}
            </div>
        </div>
    `;

    // DRM Section
    const drmContent = html`
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            ${['Widevine', 'PlayReady', 'FairPlay'].map((sys) => {
        const keySys =
            sys === 'Widevine'
                ? 'com.widevine.alpha'
                : sys === 'PlayReady'
                    ? 'com.microsoft.playready'
                    : 'com.apple.fps';

        // Logic to handle simple string vs object structure for URLs
        const currentUrl =
            typeof activeInput.drmAuth.licenseServerUrl === 'string'
                ? activeInput.drmAuth.licenseServerUrl
                : activeInput.drmAuth.licenseServerUrl?.[keySys];

        // Logic for Certificate (object structure preferred)
        const certsObj =
            activeInput.drmAuth.serverCertificate &&
                typeof activeInput.drmAuth.serverCertificate === 'object' &&
                !(
                    activeInput.drmAuth.serverCertificate instanceof
                    ArrayBuffer
                )
                ? activeInput.drmAuth.serverCertificate
                : {}; // Fallback if simple value (legacy/single)

        const currentCert = certsObj[keySys];

        const toggleConfig = () => {
            const newUrlObj =
                typeof activeInput.drmAuth.licenseServerUrl === 'object'
                    ? { ...activeInput.drmAuth.licenseServerUrl }
                    : {};

            if (currentUrl) {
                delete newUrlObj[keySys]; // Disable
            } else {
                newUrlObj[keySys] = 'https://'; // Enable with placeholder
            }
            analysisActions.updateStreamInput(
                activeInput.id,
                'drmAuth',
                { ...activeInput.drmAuth, licenseServerUrl: newUrlObj }
            );
        };

        const handleCertUpload = (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const newCerts = { ...certsObj, [keySys]: file };
                analysisActions.updateStreamInput(
                    activeInput.id,
                    'drmAuth',
                    {
                        ...activeInput.drmAuth,
                        serverCertificate: newCerts,
                    }
                );
            }
            e.target.value = ''; // Reset input
        };

        const handleCertUrlInput = (e) => {
            const val = e.target.value.trim();
            const newCerts = { ...certsObj, [keySys]: val || null };
            // If empty string, removing the key effectively
            if (!val) delete newCerts[keySys];
            analysisActions.updateStreamInput(
                activeInput.id,
                'drmAuth',
                { ...activeInput.drmAuth, serverCertificate: newCerts }
            );
        };

        const removeCert = () => {
            const newCerts = { ...certsObj };
            delete newCerts[keySys];
            analysisActions.updateStreamInput(
                activeInput.id,
                'drmAuth',
                { ...activeInput.drmAuth, serverCertificate: newCerts }
            );
        };

        const isCertFile =
            currentCert && typeof currentCert === 'object';
        const isCertString = typeof currentCert === 'string';

        return html`
                    <div
                        class="transition-all duration-500 overflow-hidden ${currentUrl
                ? (isSolid ? 'bg-slate-800 border border-blue-500' : 'bg-slate-800 backdrop-blur-xl ring-1 ring-[#3b82f6] shadow-[0_0_30px_#3b82f6] rounded-[2rem]')
                : (isSolid ? 'bg-slate-800 border border-slate-800' : 'bg-slate-800 backdrop-blur-sm hover:bg-slate-800 rounded-[2rem]')}"
                    >
                        ${drmToggle(
                    sys,
                    detectedDrm.includes(sys),
                    !!currentUrl,
                    toggleConfig
                )}
                        ${currentUrl
                ? html`
                                  <div
                                      class="p-6 bg-slate-800 space-y-6 animate-fadeIn"
                                  >
                                      <!-- License URL -->
                                      <div>
                                          <label
                                              class="text-[10px] font-bold text-slate-400 mb-2 block uppercase tracking-wider"
                                              >License Server URL</label
                                          >
                                          <div class="relative group">
                                              <div
                                                  class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors"
                                              >
                                                  ${icons.link}
                                              </div>
                                              <input
                                                  type="text"
                                                  class="w-full bg-slate-800 text-slate-100 text-xs py-3 pl-9 pr-3 transition-all font-mono ${isSolid ? 'rounded-none border-b border-slate-800 focus:border-blue-500' : 'rounded-xl shadow-inner focus:ring-1 focus:ring-blue-500'}"
                                                  .value=${currentUrl ===
                        'https://'
                        ? ''
                        : currentUrl}
                                                  placeholder="https://license.example.com..."
                                                  @input=${(e) => {
                        const newUrlObj =
                            typeof activeInput
                                .drmAuth
                                .licenseServerUrl ===
                                'object'
                                ? {
                                    ...activeInput
                                        .drmAuth
                                        .licenseServerUrl,
                                }
                                : {};
                        newUrlObj[keySys] =
                            e.target.value;
                        analysisActions.updateStreamInput(
                            activeInput.id,
                            'drmAuth',
                            {
                                ...activeInput.drmAuth,
                                licenseServerUrl:
                                    newUrlObj,
                            }
                        );
                    }}
                                              />
                                          </div>
                                      </div>

                                      <!-- Certificate: File or URL -->
                                      <div>
                                          <label
                                              class="text-[10px] font-bold text-slate-400 mb-2 block uppercase tracking-wider"
                                          >
                                              Server Certificate
                                              ${sys === 'FairPlay'
                        ? html`<span
                                                        class="text-red-400 ml-1"
                                                        >* Required</span
                                                    >`
                        : ''}
                                          </label>

                                          ${isCertFile
                        ? html`
                                                    <div
                                                        class="flex items-center justify-between bg-slate-800 rounded-xl p-3 animate-scaleIn"
                                                    >
                                                        <div
                                                            class="flex items-center gap-3 text-emerald-400"
                                                        >
                                                            ${icons.checkCircle}
                                                            <span
                                                                class="text-xs font-mono truncate max-w-[150px]"
                                                            >
                                                                ${currentCert.name ||
                            'Certificate Loaded'}
                                                            </span>
                                                        </div>
                                                        <button
                                                            @click=${removeCert}
                                                            class="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                                                            title="Remove Certificate"
                                                        >
                                                            ${icons.xCircle}
                                                        </button>
                                                    </div>
                                                `
                        : html`
                                                    <div
                                                        class="relative flex items-center group"
                                                    >
                                                        <div
                                                            class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors"
                                                        >
                                                            ${icons.shield}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            class="w-full bg-slate-800 text-slate-100 text-xs py-3 pl-9 pr-10 transition-all font-mono ${isSolid ? 'rounded-none border-b border-slate-800 focus:border-blue-500' : 'rounded-xl shadow-inner focus:ring-1 focus:ring-blue-500'}"
                                                            .value=${isCertString
                                ? currentCert
                                : ''}
                                                            placeholder="https://... or upload .cer"
                                                            @input=${handleCertUrlInput}
                                                        />
                                                        <label
                                                            class="absolute inset-y-1 right-1 flex items-center cursor-pointer"
                                                        
                                                                    type="file"
                                                                    class="hidden"
                                                                    @change=${handleCertUpload}
                                                                />
                                                                <div
                                                                    class="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                                                                    title="Upload Certificate File"
                                                                >
                                                                ${icons.upload}
                                                            </div>
                                                        </label>
                                                    </div>
                                                `}
                                      </div>
                                  </div>
                              `
                : ''}
                    </div>
                `;
    })}
        </div>

        <!-- Additional Global Headers -->
        <div class="mt-8 pt-8">
            <div
                class="${isSolid ? 'bg-slate-800 border border-slate-800 p-6' : 'bg-slate-800 rounded-[2rem] p-6 backdrop-blur-xl shadow-xl'}"
            >
                <div class="flex justify-between items-center mb-6">
                    <div
                        class="flex items-center gap-2 text-slate-400"
                    >
                        ${icons.settings}
                        <span class="text-xs font-bold uppercase tracking-wider"
                            >Global License Headers</span
                        >
                    </div>
                    <button
                        @click=${() =>
            analysisActions.addDrmAuthParam(
                activeInput.id,
                'headers'
            )}
                        class="text-[10px] font-bold text-blue-400 hover:text-[#60a5fa] uppercase tracking-wider flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                        ${icons.plusCircle} Add Header
                    </button>
                </div>
                <div class="space-y-2">
                    ${activeInput.drmAuth.headers.length > 0
            ? activeInput.drmAuth.headers.map((h, i) =>
                headerInputRow(h, i, activeInput.id, true)
            )
            : html`<div
                              class="text-center py-6 text-slate-400 text-xs italic ${isSolid ? 'border border-dashed border-slate-800' : 'rounded-xl bg-slate-800'}"
                          >
                              No global license headers.
                          </div>`}
                </div>
            </div>
        </div>
    `;

    return html`
        <div class="h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
            <div class="max-w-5xl mx-auto pb-20">
                ${headerActions}
                ${configSection('Stream Identity', icons.tag, identityContent)}
                ${configSection(
        'Network Request',
        icons.network,
        networkContent
    )}
                ${configSection(
        'Content Protection',
        icons.lockClosed,
        drmContent
    )}
            </div>
        </div>
    `;
};
