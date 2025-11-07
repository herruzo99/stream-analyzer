import { html } from 'lit-html';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { eventBus } from '@/application/event-bus';
import { showToast } from '@/ui/components/toast';
import {
    getPresets,
    prepareForStorage,
} from '@/infrastructure/persistence/streamStorage';
import * as icons from '@/ui/icons';
import { useUiStore, uiActions } from '@/state/uiStore';
import { exampleStreams } from '@/data/example-streams';
import { connectedTabBar } from '@/ui/components/tabs';
import { schemeIdUriToKeySystem } from '@/infrastructure/parsing/utils/drm';

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
                class="bg-slate-700 text-white rounded px-2 py-1.5 text-sm w-full border border-slate-600"
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
                class="bg-slate-700 text-white rounded px-2 py-1.5 text-sm w-full border border-slate-600"
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
                class="text-red-400 hover:text-red-300 p-1 shrink-0"
            >
                ${icons.xCircle}
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
                <h5 class="font-semibold text-slate-300 text-sm">${title}</h5>
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
                    : html`<p class="text-xs text-slate-500 italic">
                          No ${title.toLowerCase()} configured.
                      </p>`}
            </div>
        </div>
    `;
};

const streamAuthSettingsTemplate = (inputId, auth) => html`
    <div class="space-y-4">
        ${authSectionTemplate(
            'Request Headers',
            'headers',
            auth.headers,
            inputId,
            false
        )}
    </div>
`;

const drmAuthSettingsTemplate = (inputId, drmAuth, detectedDrm, showAll) => {
    const cert = drmAuth.serverCertificate;
    const isFile = cert instanceof File;
    const isFileStub = isFile && cert.size === 0;
    const certUrlValue = !isFile ? cert || '' : '';
    let certFileLabel = 'Upload .der';
    let certFileClasses = 'bg-slate-600 hover:bg-slate-700';

    if (isFileStub) {
        certFileLabel = `RE-SELECT: ${cert.name}`;
        certFileClasses =
            'bg-yellow-600 hover:bg-yellow-700 text-yellow-900 animate-pulse';
    } else if (isFile) {
        certFileLabel = cert.name;
        certFileClasses = 'bg-green-600 text-white';
    }

    const handleLicenseUrlInput = (keySystem, value) => {
        let newLicenseServerUrl;
        if (typeof drmAuth.licenseServerUrl === 'string') {
            newLicenseServerUrl = { [keySystem]: value };
        } else {
            newLicenseServerUrl = {
                ...drmAuth.licenseServerUrl,
                [keySystem]: value,
            };
        }

        analysisActions.updateStreamInput(inputId, 'drmAuth', {
            ...drmAuth,
            licenseServerUrl: newLicenseServerUrl,
        });
    };

    const licenseUrlFor = (keySystem) => {
        if (typeof drmAuth.licenseServerUrl === 'string') {
            return drmAuth.licenseServerUrl;
        }
        return drmAuth.licenseServerUrl?.[keySystem] || '';
    };

    const licenseServerInput = (label, keySystem) => html`
        <div>
            <label class="block text-sm font-medium text-slate-400 mb-1"
                >${label}</label
            >
            <input
                type="url"
                class="bg-slate-800 text-white rounded px-2 py-1.5 text-sm w-full border border-slate-600"
                placeholder="Leave blank for auto-discovery"
                .value=${licenseUrlFor(keySystem)}
                @input=${(e) =>
                    handleLicenseUrlInput(keySystem, e.target.value)}
            />
        </div>
    `;

    const showWidevine = showAll || detectedDrm?.includes('Widevine');
    const showPlayReady = showAll || detectedDrm?.includes('PlayReady');
    const showFairPlay = showAll || detectedDrm?.includes('FairPlay');

    if (!showWidevine && !showPlayReady && !showFairPlay) {
        return html`
            <div class="text-center p-4 bg-slate-800/50 rounded-md">
                <div class="text-green-400 mx-auto w-8 h-8">
                    ${icons.shieldCheck}
                </div>
                <p class="text-sm font-semibold text-slate-300 mt-2">
                    No DRM Detected
                </p>
                <p class="text-xs text-slate-400 mt-1">
                    This appears to be a clear, unencrypted stream.
                </p>
                <button
                    @click=${() => uiActions.toggleShowAllDrmFields()}
                    class="text-xs text-blue-400 hover:underline mt-2"
                >
                    Manual Override
                </button>
            </div>
        `;
    }

    return html`
        <div class="space-y-4">
            ${showWidevine
                ? licenseServerInput(
                      'Widevine License URL',
                      'com.widevine.alpha'
                  )
                : ''}
            ${showPlayReady
                ? licenseServerInput(
                      'PlayReady License URL',
                      'com.microsoft.playready'
                  )
                : ''}
            ${showFairPlay
                ? html` ${licenseServerInput(
                          'FairPlay License URL',
                          'com.apple.fps'
                      )}
                      <div>
                          <label
                              class="block text-sm font-medium text-slate-400 mb-1"
                              >FairPlay Certificate</label
                          >
                          <div class="flex items-center gap-2">
                              <input
                                  type="url"
                                  class="bg-slate-800 text-white rounded px-2 py-1.5 text-sm w-full border border-slate-600"
                                  placeholder="Enter URL..."
                                  .value=${certUrlValue}
                                  ?disabled=${isFile}
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
                                  class="shrink-0 cursor-pointer ${certFileClasses} text-white font-bold py-2 px-3 rounded-md text-center text-xs truncate"
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
                                              serverCertificate:
                                                  e.target.files[0],
                                          }
                                      )}
                              />
                          </div>
                      </div>`
                : ''}
            ${authSectionTemplate(
                'License Request Headers',
                'headers',
                drmAuth.headers,
                inputId,
                true
            )}
            ${!showAll
                ? html`<button
                      @click=${() => uiActions.toggleShowAllDrmFields()}
                      class="text-xs text-blue-400 hover:underline mt-2"
                  >
                      Show All / Manual Override
                  </button>`
                : ''}
        </div>
    `;
};

export const inspectorPanelTemplate = () => {
    const { streamInputs, activeStreamInputId } = useAnalysisStore.getState();
    const { streamInputActiveMobileTab, showAllDrmFields } =
        useUiStore.getState();
    const activeInput = streamInputs.find((i) => i.id === activeStreamInputId);

    if (!activeInput) {
        return html`
            <div
                class="flex flex-col h-full items-center justify-center text-center text-slate-500 p-6"
            >
                ${icons.fileScan}
                <p class="mt-2 font-semibold">No Stream Selected</p>
                <p class="text-sm">
                    Select a stream from the workspace to configure its
                    properties.
                </p>
            </div>
        `;
    }

    const { detectedDrm, isDrmInfoLoading } = activeInput;

    const presets = getPresets();
    const savedPreset = presets.find((p) => p.url === activeInput.url);
    const isPreset = !!savedPreset;
    const isExample = exampleStreams.some((s) => s.url === activeInput.url);

    let isPresetModified = false;
    if (isPreset) {
        isPresetModified =
            JSON.stringify(prepareForStorage(activeInput)) !==
            JSON.stringify(prepareForStorage(savedPreset));
    }

    const handleSavePreset = (e) => {
        const button = e.target;
        if (!activeInput.name || !activeInput.url) {
            showToast({
                message:
                    'URL and a custom name are required to save or update a preset.',
                type: 'warn',
            });
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
    let saveButtonDisabled = !activeInput.url || !activeInput.name || isExample;
    if (isPreset) {
        saveButtonLabel = 'Update Preset';
        saveButtonDisabled = !isPresetModified;
    }

    let drmTabIndicator = null;
    if (isDrmInfoLoading) {
        drmTabIndicator = icons.spinner;
    } else if (detectedDrm && detectedDrm.length > 0) {
        drmTabIndicator = html`<span class="text-yellow-400"
            >${icons.lockClosed}</span
        >`;
    }

    const tabs = [
        { key: 'stream', label: 'Stream Auth' },
        { key: 'drm', label: 'DRM Settings', indicator: drmTabIndicator },
    ];

    const activeTabKey = ['stream', 'drm'].includes(streamInputActiveMobileTab)
        ? streamInputActiveMobileTab
        : 'stream';

    let drmContent;
    if (isDrmInfoLoading) {
        drmContent = html`<div
            class="flex items-center justify-center p-8 text-slate-400"
        >
            <span class="animate-spin mr-2">${icons.spinner}</span>
            <span>Detecting DRM...</span>
        </div>`;
    } else {
        drmContent = drmAuthSettingsTemplate(
            activeInput.id,
            activeInput.drmAuth,
            detectedDrm,
            showAllDrmFields
        );
    }

    return html`
        <div class="flex flex-col h-full">
            <div class="p-3 border-b border-slate-700">
                <h3 class="text-lg font-bold text-white">Inspector</h3>
            </div>
            <div class="grow overflow-y-auto p-4 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-400 mb-1"
                        >Stream Name</label
                    >
                    <input
                        type="text"
                        class="bg-slate-800 text-white rounded px-2 py-1.5 text-sm w-full border border-slate-600"
                        placeholder="e.g., 'My Test Stream'"
                        .value=${activeInput.name}
                        @input=${(e) =>
                            analysisActions.updateStreamInput(
                                activeInput.id,
                                'name',
                                e.target.value
                            )}
                    />
                </div>

                ${connectedTabBar(
                    tabs,
                    activeTabKey,
                    uiActions.setStreamInputActiveMobileTab
                )}

                <div class="pt-4 bg-slate-900 p-4 rounded-b-lg">
                    ${activeTabKey === 'drm'
                        ? drmContent
                        : streamAuthSettingsTemplate(
                              activeInput.id,
                              activeInput.auth
                          )}
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
