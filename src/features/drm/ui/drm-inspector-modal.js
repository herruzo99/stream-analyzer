import { html, render } from 'lit-html';
import { eventBus } from '@/application/event-bus';
import { parsePsshString } from '../domain/pssh-parser';
import * as icons from '@/ui/icons';

class DrmInspectorModal extends HTMLElement {
    constructor() {
        super();
        this.isOpen = false;
        this.psshInput = '';
        this.parsedData = null;
        this.error = null;
        this.unsubscribe = null;
    }

    connectedCallback() {
        this.render();
        document.addEventListener(
            'keydown',
            this.handleGlobalKeydown.bind(this)
        );
        this.unsubscribe = eventBus.subscribe(
            'ui:drm-inspector:open',
            (data) => {
                this.open(data?.pssh);
            }
        );
    }

    disconnectedCallback() {
        document.removeEventListener(
            'keydown',
            this.handleGlobalKeydown.bind(this)
        );
        if (this.unsubscribe) this.unsubscribe();
    }

    handleGlobalKeydown(e) {
        if (this.isOpen && e.key === 'Escape') {
            this.close();
        }
    }

    open(pssh = '') {
        this.isOpen = true;
        this.psshInput = pssh;
        this.error = null;
        this.parsedData = null;
        if (this.psshInput) {
            this.parse();
        }
        this.render();
        requestAnimationFrame(() => {
            const input = this.querySelector('textarea');
            if (input) input.focus();
        });
    }

    close() {
        this.isOpen = false;
        this.render();
    }

    handleInput(e) {
        this.psshInput = e.target.value;
        this.error = null;
        this.render();
    }

    parse() {
        if (!this.psshInput.trim()) return;
        try {
            this.parsedData = parsePsshString(this.psshInput.trim());
            this.error = null;
        } catch (e) {
            this.parsedData = null;
            this.error = e.message;
        }
        this.render();
    }

    render() {
        if (!this.isOpen) {
            this.style.display = 'none';
            return;
        }
        this.style.display = 'block';

        const template = html`
            <div
                class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            >
                <div
                    class="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    @click=${() => this.close()}
                ></div>

                <div
                    class="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[90vh]"
                >
                    <!-- Header -->
                    <div
                        class="flex items-center justify-between p-4 border-b border-slate-700 shrink-0"
                    >
                        <div class="flex items-center gap-2 text-slate-100">
                            <span class="text-indigo-400"
                                >${icons.shieldCheck}</span
                            >
                            <h2 class="text-lg font-semibold">DRM Inspector</h2>
                        </div>
                        <button
                            @click=${() => this.close()}
                            class="text-slate-400 hover:text-white transition-colors p-1"
                        >
                            ${icons.xCircle}
                        </button>
                    </div>

                    <!-- Content -->
                    <div class="p-6 overflow-y-auto grow">
                        <!-- Input Section -->
                        <div class="mb-6">
                            <label
                                class="block text-sm font-medium text-slate-300 mb-2"
                            >
                                PSSH Data (Base64)
                            </label>
                            <div class="relative">
                                <textarea
                                    class="w-full h-24 bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-300 font-mono text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                                    placeholder="Paste PSSH string here..."
                                    .value=${this.psshInput}
                                    @input=${(e) => this.handleInput(e)}
                                ></textarea>
                                <button
                                    @click=${() => this.parse()}
                                    class="absolute bottom-3 right-3 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-md transition-colors shadow-sm"
                                >
                                    Decode
                                </button>
                            </div>
                            ${this.error
                                ? html`
                                      <div
                                          class="mt-2 text-red-400 text-sm flex items-center gap-1"
                                      >
                                          ${icons.alertTriangle}
                                          <span>${this.error}</span>
                                      </div>
                                  `
                                : ''}
                        </div>

                        <!-- Results Section -->
                        ${this.parsedData ? this.renderResults() : ''}
                    </div>
                </div>
            </div>
        `;

        render(template, this);
    }

    renderResults() {
        const {
            systemName,
            systemId,
            version,
            keyIds,
            dataSize,
            dataHex,
            licenseUrl,
        } = this.parsedData;

        return html`
            <div
                class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
            >
                <!-- System Info -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                        class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"
                    >
                        <div
                            class="text-xs text-slate-400 uppercase tracking-wider mb-1"
                        >
                            DRM System
                        </div>
                        <div
                            class="text-lg font-medium text-white flex items-center gap-2"
                        >
                            ${systemName}
                        </div>
                        <div class="text-xs text-slate-500 font-mono mt-1">
                            ${systemId}
                        </div>
                    </div>
                    <div
                        class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"
                    >
                        <div
                            class="text-xs text-slate-400 uppercase tracking-wider mb-1"
                        >
                            Box Details
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <div class="text-slate-500 text-xs">
                                    Version
                                </div>
                                <div class="text-slate-200 font-mono">
                                    ${version}
                                </div>
                            </div>
                            <div>
                                <div class="text-slate-500 text-xs">
                                    Data Size
                                </div>
                                <div class="text-slate-200 font-mono">
                                    ${dataSize} bytes
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Key IDs -->
                ${keyIds && keyIds.length > 0
                    ? html`
                          <div>
                              <h3
                                  class="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2"
                              >
                                  ${icons.key} Key IDs (${keyIds.length})
                              </h3>
                              <div
                                  class="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden"
                              >
                                  ${keyIds.map(
                                      (kid) => html`
                                          <div
                                              class="px-4 py-2 font-mono text-sm text-indigo-300 border-b border-slate-800 last:border-0 hover:bg-slate-900/50"
                                          >
                                              ${kid}
                                          </div>
                                      `
                                  )}
                              </div>
                          </div>
                      `
                    : html`
                          <div class="text-slate-500 text-sm italic">
                              No Key IDs found in PSSH header (v0 box or
                              implicit).
                          </div>
                      `}

                <!-- License URL (Widevine) -->
                ${licenseUrl
                    ? html`
                          <div>
                              <h3
                                  class="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2"
                              >
                                  ${icons.link} License Server URL
                              </h3>
                              <div
                                  class="bg-slate-950 rounded-lg border border-slate-800 p-3 font-mono text-sm text-green-400 break-all"
                              >
                                  ${licenseUrl}
                              </div>
                          </div>
                      `
                    : ''}

                <!-- Raw Data -->
                <div>
                    <h3
                        class="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2"
                    >
                        ${icons.binary} Raw Data Payload
                    </h3>
                    <div
                        class="bg-slate-950 rounded-lg border border-slate-800 p-3 font-mono text-xs text-slate-400 break-all max-h-40 overflow-y-auto"
                    >
                        ${dataHex}
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('drm-inspector-modal', DrmInspectorModal);
