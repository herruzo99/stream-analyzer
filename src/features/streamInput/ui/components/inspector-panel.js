import { html } from 'lit-html';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { eventBus } from '@/application/event-bus';
import { showToast } from '@/ui/components/toast';
import { getPresets } from '@/infrastructure/persistence/streamStorage';
import * as icons from '@/ui/icons';
import { useUiStore, uiActions } from '@/state/uiStore';
import { exampleStreams } from '@/data/example-streams';
import { connectedTabBar } from '@/ui/components/tabs';

const authParamRowTemplate = (param, inputId, type, isDrm) => {
    const updateAction = isDrm ? analysisActions.updateDrmAuthParam : analysisActions.updateAuthParam;
    const removeAction = isDrm ? analysisActions.removeDrmAuthParam : analysisActions.removeAuthParam;

    return html`
        <div class="flex items-center gap-2">
            <input
                type="text"
                class="bg-slate-700 text-white rounded px-2 py-1.5 text-sm w-full border border-slate-600"
                placeholder="Key"
                .value=${param.key}
                @input=${(e) => updateAction(inputId, type, param.id, 'key', e.target.value)}
            />
            <input
                type="text"
                class="bg-slate-700 text-white rounded px-2 py-1.5 text-sm w-full border border-slate-600"
                placeholder="Value"
                .value=${param.value}
                @input=${(e) => updateAction(inputId, type, param.id, 'value', e.target.value)}
            />
            <button
                type="button"
                @click=${() => removeAction(inputId, type, param.id)}
                class="text-red-400 hover:text-red-300 p-1 shrink-0"
            >
                ${icons.xCircle}
            </button>
        </div>
    `;
};

const authSectionTemplate = (title, type, params, inputId, isDrm) => {
    const addAction = isDrm ? analysisActions.addDrmAuthParam : analysisActions.addAuthParam;
    return html`
        <div>
            <div class="flex justify-between items-center mb-2">
                <h5 class="font-semibold text-slate-300 text-sm">${title}</h5>
                <button type="button" @click=${() => addAction(inputId, type)} class="text-xs text-blue-400 hover:text-blue-300 font-bold">
                    + Add
                </button>
            </div>
            <div class="space-y-2">
                ${params.length > 0
                    ? params.map((p) => authParamRowTemplate(p, inputId, type, isDrm))
                    : html`<p class="text-xs text-slate-500 italic">No ${title.toLowerCase()} configured.</p>`}
            </div>
        </div>
    `;
};

const streamAuthSettingsTemplate = (inputId, auth) => html`
    <div class="space-y-4">${authSectionTemplate('Request Headers', 'headers', auth.headers, inputId, false)}</div>
`;

const drmAuthSettingsTemplate = (inputId, drmAuth) => {
    const cert = drmAuth.serverCertificate;
    const certIsFile = cert instanceof File;
    const certIsFileStub = certIsFile && cert.size === 0;
    const certUrlValue = !certIsFile ? cert || '' : '';
    let certFileLabel = 'Upload .der';
    let certFileClasses = 'bg-slate-600 hover:bg-slate-700';

    if (certIsFileStub) {
        certFileLabel = `RE-SELECT: ${cert.name}`;
        certFileClasses = 'bg-yellow-600 hover:bg-yellow-700 text-yellow-900 animate-pulse';
    } else if (certIsFile) {
        certFileLabel = cert.name;
        certFileClasses = 'bg-green-600 text-white';
    }

    return html`
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-slate-400 mb-1">License Server URL</label>
                <input
                    type="url"
                    class="bg-slate-800 text-white rounded px-2 py-1.5 text-sm w-full border border-slate-600"
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
                <label class="block text-sm font-medium text-slate-400 mb-1">Service Certificate</label>
                <div class="flex items-center gap-2">
                    <input
                        type="url"
                        class="bg-slate-800 text-white rounded px-2 py-1.5 text-sm w-full border border-slate-600"
                        placeholder="Enter URL..."
                        .value=${certUrlValue}
                        ?disabled=${certIsFile}
                        @input=${(e) =>
                            analysisActions.updateStreamInput(inputId, 'drmAuth', {
                                ...drmAuth,
                                serverCertificate: e.target.value,
                            })}
                    />
                    <label
                        for="cert-file-${inputId}"
                        class="shrink-0 cursor-pointer ${certFileClasses} text-white font-bold py-2 px-3 rounded-md text-center text-xs truncate"
                    >${certFileLabel}</label>
                    <input type="file" id="cert-file-${inputId}" class="hidden" accept=".der" @change=${(e) =>
                        analysisActions.updateStreamInput(inputId, 'drmAuth', {
                            ...drmAuth,
                            serverCertificate: e.target.files[0],
                        })}/>
                </div>
            </div>
            ${authSectionTemplate('License Request Headers', 'headers', drmAuth.headers, inputId, true)}
        </div>
    `;
};

export const inspectorPanelTemplate = () => {
    const { streamInputs, activeStreamInputId } = useAnalysisStore.getState();
    const { streamInputActiveMobileTab } = useUiStore.getState();
    const activeInput = streamInputs.find((i) => i.id === activeStreamInputId);

    if (!activeInput) {
        return html`
            <div class="flex flex-col h-full items-center justify-center text-center text-slate-500 p-6">
                ${icons.fileScan}
                <p class="mt-2 font-semibold">No Stream Selected</p>
                <p class="text-sm">Select a stream from the workspace to configure its properties.</p>
            </div>
        `;
    }

    const presets = getPresets();
    const isPreset = presets.some((p) => p.url === activeInput.url);
    const isExample = exampleStreams.some((s) => s.url === activeInput.url);

    const handleSavePreset = (e) => {
        const button = e.target;
        if (!activeInput.name || !activeInput.url) {
            showToast({ message: 'URL and a custom name are required to save or update a preset.', type: 'warn' });
            return;
        }
        eventBus.dispatch('ui:save-preset-requested', {
            name: activeInput.name,
            url: activeInput.url,
            button,
            isPreset,
        });
    };

    let saveButtonLabel = 'Save as Preset';
    let saveButtonDisabled = !activeInput.url || !activeInput.name;

    if (isExample) {
        saveButtonLabel = 'Cannot Save Example';
        saveButtonDisabled = true;
    } else if (isPreset) {
        saveButtonLabel = 'Update Preset';
    }

    const tabs = [
        { key: 'stream', label: 'Stream Auth' },
        { key: 'drm', label: 'DRM Settings' },
    ];
    
    // Default to 'stream' if the mobile tab isn't relevant to the inspector
    const activeTabKey = ['stream', 'drm'].includes(streamInputActiveMobileTab)
        ? streamInputActiveMobileTab
        : 'stream';

    return html`
        <div class="flex flex-col h-full">
            <div class="p-3 border-b border-slate-700">
                <h3 class="text-lg font-bold text-white">Inspector</h3>
            </div>
            <div class="grow overflow-y-auto p-4 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-400 mb-1">Stream Name</label>
                    <input
                        type="text"
                        class="bg-slate-800 text-white rounded px-2 py-1.5 text-sm w-full border border-slate-600"
                        placeholder="e.g., 'My Test Stream'"
                        .value=${activeInput.name}
                        @input=${(e) => analysisActions.updateStreamInput(activeInput.id, 'name', e.target.value)}
                    />
                </div>

                ${connectedTabBar(tabs, activeTabKey, uiActions.setStreamInputActiveMobileTab)}

                <div class="pt-4 bg-slate-900 p-4">
                    ${activeTabKey === 'drm'
                        ? drmAuthSettingsTemplate(activeInput.id, activeInput.drmAuth)
                        : streamAuthSettingsTemplate(activeInput.id, activeInput.auth)
                    }
                </div>
            </div>
            <div class="p-4 border-t border-slate-700 shrink-0">
                <button
                    class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-md disabled:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    @click=${handleSavePreset}
                    ?disabled=${saveButtonDisabled}
                >
                    ${saveButtonLabel}
                </button>
            </div>
        </div>
    `;
};