import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';

class DrmInspectorModal extends HTMLElement {
    // Port note: was `extends BaseModal` (never committed). The base only
    // provided render() + mount bridging, inlined here (same pattern as
    // the DASH timing calculator port).
    constructor() {
        super();
        this.title = 'DRM Inspector';
        this.size = 'lg';
        this.psshData = '';
        this.parsedSystem = null;
        this.error = null;
    }

    connectedCallback() {
        this.onMount();
    }

    disconnectedCallback() {
        this.onUnmount();
    }

    onUnmount() {
        // Nothing persistent to release (parse-on-demand only).
    }

    render() {
        render(this.renderContent(), this);
    }

    onMount() {
        // Initialize with data passed via modal content if any
        if (this._data && this._data.pssh) {
            this.psshData = this._data.pssh;
            this.parsePssh();
        }
    }

    // BaseModal calls this to set data from modal service
    set data(val) {
        this._data = val;
        this.onMount(); // Trigger mount logic again if data changes
        this.render();
    }

    parsePssh() {
        this.error = null;
        this.parsedSystem = null;
        try {
            const cleanPssh = this.psshData.replace(/\s/g, '');
            if (!cleanPssh) return;

            // Basic heuristic for demo purposes (real parser would be in domain logic)
            if (cleanPssh.length < 20) throw new Error("Invalid PSSH length");

            // Mock parsing logic based on common system IDs
            let sys = 'Unknown';
            if (cleanPssh.includes('edef8ba9')) sys = 'Widevine';
            if (cleanPssh.includes('9a04f079')) sys = 'PlayReady';
            if (cleanPssh.includes('94ce86fb')) sys = 'FairPlay';

            this.parsedSystem = {
                systemName: sys,
                dataLength: cleanPssh.length,
                keyIds: ['Mock-Key-ID-1', 'Mock-Key-ID-2'],
                raw: cleanPssh
            };
        } catch (e) {
            this.error = "Failed to parse PSSH data: " + e.message;
        }
        this.render();
    }

    renderContent() {
        return html`
            <div class="p-6 space-y-6">
                 <!-- Input Section -->
                <div class="space-y-2">
                    <label class="text-xs font-bold r text-slate-400">
                        Base64 PSSH Data
                    </label>
                    <div class="relative group">
                        <textarea
                            class="w-full h-32 bg-white/5 text-slate-100 font-mono text-xs p-4 rounded-md border border-white/10 focus:border-emerald-400/25 focus:ring-emerald-400/25 outline-none resize-none transition-all placeholder-slate-400/50"
                            placeholder="Paste PSSH data here..."
                            .value=${this.psshData}
                            @input=${(e) => { this.psshData = e.target.value; }}
                        ></textarea>
                        <div class="absolute bottom-3 right-3 flex gap-2">
                            <button 
                                @click=${() => { this.psshData = ''; this.render(); }}
                                class="p-1.5 rounded-md text-slate-400 hover:bg-white/10 transition-colors"
                                title="Clear"
                            >
                                ${icons.trash}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Action -->
                <div class="flex justify-end">
                    <button
                        @click=${() => this.parsePssh()}
                        class="px-6 py-2 bg-emerald-500/10 hover:bg-emerald-500/10 text-emerald-200 hover:text-white rounded-md font-bold text-sm transition-all border border-emerald-400/25 hover:border-transparent flex items-center gap-2"
                    >
                        ${icons.search} Decode PSSH
                    </button>
                </div>

                <!-- Results -->
                ${this.parsedSystem ? html`
                    <div class="space-y-4">
                        <div class="flex items-center gap-2 mb-2">
                            <div class="h-px bg-white/5 grow"></div>
                            <span class="text-[10px] font-bold text-slate-400">Analysis Results</span>
                            <div class="h-px bg-white/5 grow"></div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="p-4 rounded-md bg-white/5 border border-white/10">
                                <div class="text-[10px] text-slate-400 r mb-1">System</div>
                                <div class="text-lg font-bold text-slate-100 flex items-center gap-2">
                                    ${icons.shieldCheck} ${this.parsedSystem.systemName}
                                </div>
                            </div>
                            <div class="p-4 rounded-md bg-white/5 border border-white/10">
                                <div class="text-[10px] text-slate-400 r mb-1">Data Size</div>
                                <div class="text-lg font-mono font-bold text-slate-100">
                                    ${this.parsedSystem.dataLength} bytes
                                </div>
                            </div>
                        </div>

                        <div class="p-4 rounded-md bg-white/5 border border-white/10">
                            <div class="text-[10px] text-slate-400 r mb-2">Extracted Key IDs</div>
                            <div class="space-y-1">
                                ${this.parsedSystem.keyIds.map(kid => html`
                                    <div class="font-mono text-xs text-slate-300 bg-white/5 px-2 py-1 rounded select-all cursor-text">
                                        ${kid}
                                    </div>
                                `)}
                            </div>
                        </div>
                    </div>
                ` : ''}

                ${this.error ? html`
                    <div class="p-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3 animate-shake">
                        ${icons.alertTriangle} ${this.error}
                    </div>
                ` : ''}
            </div>
        `;
    }
}

customElements.define('drm-inspector-modal', DrmInspectorModal);
