import { html } from 'lit-html';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import * as icons from '@/ui/icons';

const configSection = (title, icon, content) => html`
    <section class="mb-8 animate-fadeIn">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
            <span class="text-blue-500">${icon}</span> ${title}
        </h3>
        ${content}
    </section>
`;

const drmToggle = (systemName, detected, isConfigured, onClick) => html`
    <div 
        @click=${onClick}
        class="flex items-center justify-between p-4 rounded-t-xl border-t border-x transition-all cursor-pointer select-none ${
            isConfigured 
                ? 'bg-blue-900/10 border-blue-500/30' 
                : 'bg-slate-900 border-slate-800 hover:bg-slate-800/80'
        } ${!isConfigured ? 'rounded-b-xl border-b' : ''}"
    >
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-400 border border-slate-700 shadow-inner">
                ${systemName[0]}
            </div>
            <div>
                <div class="font-bold text-slate-200 text-sm">${systemName}</div>
                <div class="text-[10px] ${detected ? 'text-emerald-400' : 'text-slate-500'}">
                    ${detected ? 'Signal Detected' : 'Not Detected'}
                </div>
            </div>
        </div>
        <div class="relative w-10 h-5 bg-slate-800 rounded-full border border-slate-700 transition-colors ${isConfigured ? 'bg-blue-600 border-blue-500' : ''}">
            <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isConfigured ? 'translate-x-5' : 'translate-x-0'}"></div>
        </div>
    </div>
`;

const headerInputRow = (header, index, inputId, isDrm) => {
    const update = isDrm ? analysisActions.updateDrmAuthParam : analysisActions.updateAuthParam;
    const remove = isDrm ? analysisActions.removeDrmAuthParam : analysisActions.removeAuthParam;

    return html`
        <div class="flex gap-2 mb-2 group animate-scaleIn">
            <input 
                type="text" 
                placeholder="Header-Name" 
                class="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded px-3 py-2 font-mono w-1/3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                .value=${header.key}
                @input=${(e) => update(inputId, 'headers', header.id, 'key', e.target.value)}
            />
            <input 
                type="text" 
                placeholder="Value" 
                class="bg-slate-900 border border-slate-700 text-emerald-300 text-xs rounded px-3 py-2 font-mono flex-1 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                .value=${header.value}
                @input=${(e) => update(inputId, 'headers', header.id, 'value', e.target.value)}
            />
            <button 
                @click=${() => remove(inputId, 'headers', header.id)}
                class="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/10 rounded transition-colors opacity-50 group-hover:opacity-100"
            >
                ${icons.xCircle}
            </button>
        </div>
    `;
};

export const inspectorPanelTemplate = () => {
    const { streamInputs, activeStreamInputId } = useAnalysisStore.getState();
    const activeInput = streamInputs.find(i => i.id === activeStreamInputId);

    if (!activeInput) return html``;

    const detectedDrm = activeInput.detectedDrm || [];
    
    // Identity Section
    const identityContent = html`
        <div class="grid grid-cols-1 gap-4">
            <div class="relative">
                <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Friendly Name</label>
                <input 
                    type="text" 
                    class="w-full bg-slate-900 text-white text-sm border border-slate-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    .value=${activeInput.name || ''}
                    @input=${(e) => analysisActions.updateStreamInput(activeInput.id, 'name', e.target.value)}
                    placeholder="e.g. Production Stream A"
                />
            </div>
            <div class="relative opacity-60">
                <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Source URL</label>
                <input 
                    type="text" 
                    readonly
                    class="w-full bg-slate-900 text-slate-400 text-xs font-mono border border-slate-800 rounded-lg px-4 py-3 select-all"
                    .value=${activeInput.url}
                />
            </div>
        </div>
    `;

    // Network Section
    const networkContent = html`
        <div class="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
            <div class="flex justify-between items-center mb-4">
                <span class="text-xs font-medium text-slate-300">Custom Headers</span>
                <button 
                    @click=${() => analysisActions.addAuthParam(activeInput.id, 'headers')}
                    class="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider flex items-center gap-1"
                >
                    ${icons.plusCircle} Add
                </button>
            </div>
            <div class="space-y-1">
                ${activeInput.auth.headers.length > 0 
                    ? activeInput.auth.headers.map((h, i) => headerInputRow(h, i, activeInput.id, false))
                    : html`<div class="text-center py-4 text-slate-600 text-xs italic border border-dashed border-slate-700 rounded-lg">No headers configured</div>`
                }
            </div>
        </div>
    `;

    // DRM Section
    const drmContent = html`
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            ${['Widevine', 'PlayReady', 'FairPlay'].map(sys => {
                const keySys = sys === 'Widevine' ? 'com.widevine.alpha' : sys === 'PlayReady' ? 'com.microsoft.playready' : 'com.apple.fps';
                
                // Logic to handle simple string vs object structure for URLs
                const currentUrl = typeof activeInput.drmAuth.licenseServerUrl === 'string' 
                    ? activeInput.drmAuth.licenseServerUrl 
                    : activeInput.drmAuth.licenseServerUrl?.[keySys];

                // Logic for Certificate (object structure preferred)
                const certsObj = activeInput.drmAuth.serverCertificate && typeof activeInput.drmAuth.serverCertificate === 'object' && !(activeInput.drmAuth.serverCertificate instanceof ArrayBuffer)
                    ? activeInput.drmAuth.serverCertificate
                    : {}; // Fallback if simple value (legacy/single)
                
                const currentCert = certsObj[keySys];
                
                const toggleConfig = () => {
                    const newUrlObj = typeof activeInput.drmAuth.licenseServerUrl === 'object' 
                        ? { ...activeInput.drmAuth.licenseServerUrl } 
                        : {};
                    
                    if (currentUrl) {
                        delete newUrlObj[keySys]; // Disable
                    } else {
                        newUrlObj[keySys] = 'https://'; // Enable with placeholder
                    }
                    analysisActions.updateStreamInput(activeInput.id, 'drmAuth', { ...activeInput.drmAuth, licenseServerUrl: newUrlObj });
                };

                const handleCertUpload = (e) => {
                    if (e.target.files.length > 0) {
                        const file = e.target.files[0];
                        const newCerts = { ...certsObj, [keySys]: file };
                        analysisActions.updateStreamInput(activeInput.id, 'drmAuth', { ...activeInput.drmAuth, serverCertificate: newCerts });
                    }
                    e.target.value = ''; // Reset input
                };
                
                const handleCertUrlInput = (e) => {
                    const val = e.target.value.trim();
                    const newCerts = { ...certsObj, [keySys]: val || null };
                    // If empty string, removing the key effectively
                    if (!val) delete newCerts[keySys];
                    analysisActions.updateStreamInput(activeInput.id, 'drmAuth', { ...activeInput.drmAuth, serverCertificate: newCerts });
                };

                const removeCert = () => {
                    const newCerts = { ...certsObj };
                    delete newCerts[keySys];
                    analysisActions.updateStreamInput(activeInput.id, 'drmAuth', { ...activeInput.drmAuth, serverCertificate: newCerts });
                };

                const isCertFile = currentCert && typeof currentCert === 'object';
                const isCertString = typeof currentCert === 'string';

                return html`
                    <div class="rounded-xl shadow-sm transition-all duration-300 ${currentUrl ? 'bg-slate-800/50 border border-blue-500/30' : 'opacity-100'}">
                        
                        ${drmToggle(sys, detectedDrm.includes(sys), !!currentUrl, toggleConfig)}
                        
                        ${currentUrl ? html`
                            <div class="p-4 border-x border-b border-blue-500/30 bg-slate-900/50 rounded-b-xl space-y-4 animate-fadeIn">
                                
                                <!-- License URL -->
                                <div>
                                    <label class="text-[10px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">License Server URL</label>
                                    <div class="relative">
                                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-600">
                                            ${icons.link}
                                        </div>
                                        <input 
                                            type="text"
                                            class="w-full bg-slate-950 text-white text-xs border border-slate-700 rounded-lg py-2.5 pl-9 pr-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors font-mono"
                                            .value=${currentUrl === 'https://' ? '' : currentUrl}
                                            placeholder="https://license.example.com..."
                                            @input=${(e) => {
                                                const newUrlObj = typeof activeInput.drmAuth.licenseServerUrl === 'object' ? { ...activeInput.drmAuth.licenseServerUrl } : {};
                                                newUrlObj[keySys] = e.target.value;
                                                analysisActions.updateStreamInput(activeInput.id, 'drmAuth', { ...activeInput.drmAuth, licenseServerUrl: newUrlObj });
                                            }}
                                        />
                                    </div>
                                </div>

                                <!-- Certificate: File or URL -->
                                <div>
                                    <label class="text-[10px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">
                                        Server Certificate
                                        ${sys === 'FairPlay' ? html`<span class="text-red-400 ml-1">* Required</span>` : ''}
                                    </label>
                                    
                                    ${isCertFile
                                        ? html`
                                            <div class="flex items-center justify-between bg-emerald-900/10 border border-emerald-500/30 rounded-lg p-2 animate-scaleIn">
                                                <div class="flex items-center gap-2 text-emerald-400">
                                                    ${icons.checkCircle}
                                                    <span class="text-xs font-mono truncate max-w-[150px]">
                                                        ${currentCert.name || 'Certificate Loaded'}
                                                    </span>
                                                </div>
                                                <button 
                                                    @click=${removeCert}
                                                    class="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-900/20 transition-colors"
                                                    title="Remove Certificate"
                                                >
                                                    ${icons.xCircle}
                                                </button>
                                            </div>
                                        ` 
                                        : html`
                                            <div class="relative flex items-center group">
                                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-600">
                                                    ${icons.shield}
                                                </div>
                                                <input 
                                                    type="text"
                                                    class="w-full bg-slate-950 text-white text-xs border border-slate-700 rounded-lg py-2.5 pl-9 pr-10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors font-mono"
                                                    .value=${isCertString ? currentCert : ''}
                                                    placeholder="https://... or upload .cer"
                                                    @input=${handleCertUrlInput}
                                                />
                                                <label class="absolute inset-y-1 right-1 flex items-center cursor-pointer">
                                                    <input type="file" class="hidden" @change=${handleCertUpload} />
                                                    <div class="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition-colors border border-slate-700" title="Upload Certificate File">
                                                        ${icons.upload}
                                                    </div>
                                                </label>
                                            </div>
                                        `
                                    }
                                </div>

                            </div>
                        ` : ''}
                    </div>
                `;
            })}
        </div>
        
        <!-- Additional Global Headers -->
        <div class="mt-6 pt-6 border-t border-slate-800">
            <div class="bg-slate-800/30 rounded-xl p-4 border border-slate-800">
                <div class="flex justify-between items-center mb-4">
                    <div class="flex items-center gap-2 text-slate-400">
                        ${icons.settings}
                        <span class="text-xs font-bold uppercase tracking-wider">Global License Headers</span>
                    </div>
                    <button 
                        @click=${() => analysisActions.addDrmAuthParam(activeInput.id, 'headers')}
                        class="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider flex items-center gap-1"
                    >
                        ${icons.plusCircle} Add Header
                    </button>
                </div>
                <div class="space-y-1">
                    ${activeInput.drmAuth.headers.length > 0 
                        ? activeInput.drmAuth.headers.map((h, i) => headerInputRow(h, i, activeInput.id, true))
                        : html`<div class="text-center py-3 text-slate-600 text-xs italic">No global license headers.</div>`
                    }
                </div>
            </div>
        </div>
    `;

    return html`
        <div class="h-full overflow-y-auto custom-scrollbar p-8">
            <div class="max-w-4xl mx-auto">
                ${configSection('Stream Identity', icons.tag, identityContent)}
                ${configSection('Network Request', icons.network, networkContent)}
                ${configSection('Content Protection', icons.lockClosed, drmContent)}
            </div>
        </div>
    `;
};