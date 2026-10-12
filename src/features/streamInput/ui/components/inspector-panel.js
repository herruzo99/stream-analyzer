import { eventBus } from '@/application/event-bus';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { EVENTS } from '@/types/events';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const configSection = (title, icon, content) => html`
    <section class="mb-6">
        <h3
            class="mono text-xs font-medium text-slate-400 mb-3 flex items-center gap-2"
        >
            <span class="text-slate-500">${icon}</span> ${title}
        </h3>
        ${content}
    </section>
`;

const drmToggle = (systemName, detected, isConfigured, onClick) => html`
    <button
        @click=${onClick}
        aria-pressed=${isConfigured}
        class="w-full flex items-center justify-between px-3 py-2.5 rounded-md border transition-colors cursor-pointer select-none text-left ${isConfigured
            ? 'bg-emerald-500/5 border-emerald-500/30'
            : 'bg-transparent border-white/5 hover:border-white/15'}"
    >
        <span class="flex items-center gap-2.5 min-w-0">
            <span
                class="mono text-[11px] font-bold text-slate-300 shrink-0"
            >
                ${systemName}
            </span>
            <span
                class="mono text-[10px] ${detected
                    ? 'text-emerald-300'
                    : 'text-slate-600'}"
            >
                ${detected ? 'signal detected' : 'not detected'}
            </span>
        </span>
        <span
            class="relative w-9 h-5 rounded-full transition-colors shrink-0 ${isConfigured
                ? 'bg-emerald-400'
                : 'bg-white/10'}"
        >
            <span
                class="absolute top-0.5 left-0.5 w-4 h-4 bg-slate-950 rounded-full transition-transform ${isConfigured
                    ? 'translate-x-4'
                    : 'translate-x-0'}"
            ></span>
        </span>
    </button>
`;

const headerInputRow = (header, index, inputId, isDrm) => {
    const update = isDrm
        ? analysisActions.updateDrmAuthParam
        : analysisActions.updateAuthParam;
    const remove = isDrm
        ? analysisActions.removeDrmAuthParam
        : analysisActions.removeAuthParam;

    return html`
        <div class="flex flex-col md:flex-row gap-2 mb-2 group">
            <input
                type="text"
                placeholder="header-name"
                aria-label="Header name"
                class="bg-[#06090f] border border-white/10 text-slate-100 text-xs rounded-md px-3 py-2 font-mono w-full md:w-1/3 focus:border-emerald-400/60 outline-none transition-colors"
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
                    placeholder="value"
                    aria-label="Header value"
                    class="bg-[#06090f] border border-white/10 text-slate-200 text-xs rounded-md px-3 py-2 font-mono flex-1 focus:border-emerald-400/60 outline-none transition-colors"
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
                    class="p-2 text-slate-600 hover:text-red-300 rounded transition-colors"
                    title="Remove header"
                    aria-label="Remove header"
                >
                    ${icons.x}
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

    const detectedDrm = activeInput?.detectedDrm || [];
    const isKnownPreset = presets.some((p) => p.url === activeInput?.url);


    const inputHostname = (() => {
        try {
            return new URL(activeInput.url).hostname || 'Local source';
        } catch {
            return 'Local source';
        }
    })();

    // --- Header Actions Logic ---
    const handleSavePreset = () => {
        const nameToSave = activeInput.name || inputHostname;
        eventBus.dispatch(EVENTS.UI.SAVE_PRESET_REQUESTED, {
            name: nameToSave,
            url: activeInput.url,
            isPreset: isKnownPreset,
        });
    };

    let saveBtnText = isKnownPreset ? 'Update preset' : 'Save as preset';
    let saveBtnIcon = icons.save;
    let saveBtnClass = 'text-slate-400 hover:text-slate-100';

    if (presetSaveStatus === 'saving') {
        saveBtnText = 'Saving...';
        saveBtnIcon = icons.spinner;
    } else if (presetSaveStatus === 'saved') {
        saveBtnText = 'Saved';
        saveBtnIcon = icons.checkCircle;
        saveBtnClass = 'text-emerald-300';
    } else if (presetSaveStatus === 'error') {
        saveBtnText = 'Error saving';
        saveBtnIcon = icons.alertTriangle;
        saveBtnClass = 'text-red-300';
    }

    const headerActions = html`
        <div class="flex justify-between items-center gap-3 mb-6">
            <h2 class="mono text-sm font-medium text-slate-200">
                Configure
            </h2>
            <button
                @click=${handleSavePreset}
                ?disabled=${presetSaveStatus === 'saving'}
                class="flex items-center gap-2 px-3 py-2 rounded-md border border-white/10 text-xs font-medium transition-colors ${saveBtnClass} hover:border-white/25 disabled:opacity-50"
            >
                ${saveBtnIcon} ${saveBtnText}
            </button>
        </div>
    `;

    // Identity Section
    const identityContent = html`
        <div class="grid grid-cols-1 gap-4">
            <div class="relative group">
                <label
                    class="mono text-[11px] font-medium text-slate-500 mb-1.5 block"
                    >Friendly name</label
                >
                <input
                    type="text"
                    class="w-full bg-[#06090f] border border-white/10 rounded-md text-slate-100 text-sm focus:border-emerald-400/60 px-3 py-2.5 outline-none transition-colors"
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
                    class="mono text-[11px] font-medium text-slate-500 mb-1.5 flex justify-between"
                >
                    Source URL
                    ${activeInput.isTier0AnalysisLoading
            ? html`<span
                              class="mono text-[10px] text-slate-500 flex items-center gap-1"
                              >${icons.spinner} probing...</span
                          >`
            : ''}
                </label>
                <input
                    type="url"
                    inputmode="url"
                    class="w-full bg-[#06090f] border border-white/10 rounded-md text-slate-200 text-[13px] font-mono focus:border-emerald-400/60 px-3 py-2.5 transition-colors"
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
        <div class="bg-[#0b111c] border border-white/5 rounded-lg p-4">
            <div class="flex justify-between items-center mb-3">
                <span class="mono text-xs font-medium text-slate-300"
                    >Custom headers</span
                >
                <button
                    @click=${() =>
            analysisActions.addAuthParam(activeInput.id, 'headers')}
                    class="mono text-[11px] font-medium text-slate-400 hover:text-emerald-300 flex items-center gap-1 px-2 py-1 rounded transition-colors"
                >
                    ${icons.plusCircle} Add header
                </button>
            </div>
            <div class="space-y-2">
                ${activeInput.auth.headers.length > 0
            ? activeInput.auth.headers.map((h, i) =>
                headerInputRow(h, i, activeInput.id, false)
            )
            : html`<div
                          class="mono text-center py-4 text-slate-600 text-[11px] border border-dashed border-white/10 rounded-md"
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
                        class="rounded-md border overflow-hidden transition-colors ${currentUrl
                            ? 'bg-[#0b111c] border-emerald-500/25'
                            : 'bg-transparent border-white/5'}"
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
                                      class="p-4 space-y-4 border-t border-white/5"
                                  >
                                      <!-- License URL -->
                                      <div>
                                          <label
                                              class="mono text-[11px] font-medium text-slate-500 mb-1.5 block"
                                              >License server URL</label
                                          >
                                          <div class="relative group">
                                              <div
                                                  class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-600 group-focus-within:text-emerald-300 transition-colors"
                                              >
                                                  ${icons.link}
                                              </div>
                                              <input
                                                  type="url"
                                                  inputmode="url"
                                                  class="w-full bg-[#06090f] border border-white/10 rounded-md text-slate-200 text-xs py-2.5 pl-9 pr-3 transition-colors font-mono focus:border-emerald-400/60 outline-none"
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
                                              class="mono text-[11px] font-medium text-slate-500 mb-1.5 block"
                                          >
                                              Server certificate
                                              ${sys === 'FairPlay'
                        ? html`<span
                                                        class="text-red-300 ml-1"
                                                        >* required</span
                                                    >`
                        : ''}
                                          </label>

                                          ${isCertFile
                        ? html`
                                                    <div
                                                        class="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 rounded-md px-3 py-2"
                                                    >
                                                        <div
                                                            class="flex items-center gap-2.5 text-emerald-300"
                                                        >
                                                            ${icons.checkCircle}
                                                            <span
                                                                class="text-xs font-mono truncate max-w-[150px]"
                                                            >
                                                                ${currentCert.name ||
                            'Certificate loaded'}
                                                            </span>
                                                        </div>
                                                        <button
                                                            @click=${removeCert}
                                                            class="text-slate-500 hover:text-red-300 p-1.5 rounded transition-colors"
                                                            title="Remove certificate"
                                                            aria-label="Remove certificate"
                                                        >
                                                            ${icons.x}
                                                        </button>
                                                    </div>
                                                `
                        : html`
                                                    <div
                                                        class="relative flex items-center group"
                                                    >
                                                        <div
                                                            class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-600 group-focus-within:text-emerald-300 transition-colors"
                                                        >
                                                            ${icons.shield}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            class="w-full bg-[#06090f] border border-white/10 rounded-md text-slate-200 text-xs py-2.5 pl-9 pr-10 transition-colors font-mono focus:border-emerald-400/60 outline-none"
                                                            .value=${isCertString
                                ? currentCert
                                : ''}
                                                            placeholder="https://... or upload .cer"
                                                            @input=${handleCertUrlInput}
                                                        />
                                                        <label
                                                            class="absolute inset-y-1 right-1 flex items-center cursor-pointer"
                                                            title="Upload certificate file"
                                                        >
                                                            <input
                                                                type="file"
                                                                accept=".cer,.crt,.der,.pem"
                                                                class="hidden"
                                                                @change=${handleCertUpload}
                                                            />
                                                            <span
                                                                class="p-2 rounded text-slate-500 hover:text-emerald-300 transition-colors"
                                                            >
                                                                ${icons.upload}
                                                            </span>
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
        <div class="mt-6">
            <div class="bg-[#0b111c] border border-white/5 rounded-lg p-4">
                <div class="flex justify-between items-center mb-3">
                    <span class="mono text-xs font-medium text-slate-300"
                        >Global license headers</span
                    >
                    <button
                        @click=${() =>
            analysisActions.addDrmAuthParam(
                activeInput.id,
                'headers'
            )}
                        class="mono text-[11px] font-medium text-slate-400 hover:text-emerald-300 flex items-center gap-1 px-2 py-1 rounded transition-colors"
                    >
                        ${icons.plusCircle} Add header
                    </button>
                </div>
                <div class="space-y-2">
                    ${activeInput.drmAuth.headers.length > 0
            ? activeInput.drmAuth.headers.map((h, i) =>
                headerInputRow(h, i, activeInput.id, true)
            )
            : html`<div
                              class="mono text-center py-4 text-slate-600 text-[11px] border border-dashed border-white/10 rounded-md"
                          >
                              No global license headers.
                          </div>`}
                </div>
            </div>
        </div>
    `;

    return html`
        <div class="h-full overflow-y-auto custom-scrollbar p-4 md:p-6">
            <div class="max-w-3xl mx-auto pb-8">
                ${headerActions}
                ${configSection('Stream identity', icons.tag, identityContent)}
                ${configSection(
        'Network request',
        icons.network,
        networkContent
    )}
                ${configSection(
        'Content protection',
        icons.lockClosed,
        drmContent
    )}
            </div>
        </div>
    `;
};
