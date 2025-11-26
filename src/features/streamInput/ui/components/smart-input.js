import { html, render } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { analysisActions } from '@/state/analysisStore';
import { uiActions } from '@/state/uiStore';
import { showToast } from '@/ui/components/toast';
import * as icons from '@/ui/icons';

/**
 * Pure domain logic for input validation and parsing.
 * Separated from the UI component for stability and testability.
 */
class InputValidator {
    static detectProtocol(value) {
        if (!value || typeof value !== 'string') return null;
        const v = value.trim();
        // Check for specific file extensions or manifest markers
        if (v.includes('.m3u8') || v.includes('#EXTM3U')) return 'HLS';
        if (v.includes('.mpd') || v.includes('<MPD')) return 'DASH';
        if (v.includes('.ism')) return 'MSS';
        // Generic fallback for HTTP urls that might be manifests
        if (v.startsWith('http://') || v.startsWith('https://')) return 'HTTP';
        return null;
    }

    static parseBatchInput(text) {
        if (!text) return [];
        // Split by newlines, commas, or spaces, and filter for valid URLs
        return text
            .split(/[\n,\s]+/)
            .map(s => s.trim())
            .filter(s => s.startsWith('http://') || s.startsWith('https://'));
    }

    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
}

export class SmartInputComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // --- Reactive State ---
        this.state = {
            inputValue: '',
            batchUrls: [],
            detectedProtocol: null,
            isFocused: false,
            isDragOver: false,
            viewMode: 'default', // 'default' | 'batch'
        };

        // --- Props ---
        this.mode = 'analyze'; // 'analyze' (resets session) | 'add' (appends)
        this.variant = 'hero'; // 'hero' | 'widget'

        // --- Bindings ---
        this.handleInput = this.handleInput.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handlePaste = this.handlePaste.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.handleDragOver = this.handleDragOver.bind(this);
        this.handleDragLeave = this.handleDragLeave.bind(this);
        this.triggerFileInput = this.triggerFileInput.bind(this);
        this.triggerBatchPaste = this.triggerBatchPaste.bind(this);
    }

    static get observedAttributes() {
        return ['mode', 'variant'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            if (name === 'mode') this.mode = newValue;
            if (name === 'variant') this.variant = newValue;
            this.render();
        }
    }

    connectedCallback() {
        this.mode = this.getAttribute('mode') || 'analyze';
        this.variant = this.getAttribute('variant') || 'hero';
        this.render();
    }

    /**
     * Centralized state updater. Merges updates and triggers a render.
     * @param {Partial<typeof this.state>} updates 
     */
    setState(updates) {
        this.state = { ...this.state, ...updates };
        this.render();
    }

    // --- Event Handlers ---

    handleInput(e) {
        const value = e.target.value;
        this.setState({
            inputValue: value,
            detectedProtocol: InputValidator.detectProtocol(value)
        });
    }

    handlePaste(e) {
        // Use standard Clipboard API
        const pasteData = e.clipboardData?.getData('text');
        if (!pasteData) return;

        const urls = InputValidator.parseBatchInput(pasteData);

        if (urls.length > 1) {
            e.preventDefault();
            this.setState({
                batchUrls: urls,
                viewMode: 'batch',
                inputValue: '' // Clear single input
            });
            showToast({ message: `Detected ${urls.length} streams from clipboard!`, type: 'info' });
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Enter') {
            this.submitSingleUrl();
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!this.state.isDragOver) this.setState({ isDragOver: true });
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.setState({ isDragOver: false });
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.setState({ isDragOver: false });

        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            this.processFile(files[0]);
        } else {
            const text = e.dataTransfer?.getData('text');
            if (text) {
                const urls = InputValidator.parseBatchInput(text);
                if (urls.length > 1) {
                    this.setState({ batchUrls: urls, viewMode: 'batch', inputValue: '' });
                } else if (urls.length === 1) {
                    this.setState({ inputValue: urls[0], detectedProtocol: InputValidator.detectProtocol(urls[0]) });
                }
            }
        }
    }

    // --- Actions ---

    triggerFileInput() {
        const fileInput = this.shadowRoot.getElementById('hidden-file-input');
        if (fileInput) fileInput.click();
    }

    triggerBatchPaste() {
        const input = this.shadowRoot.getElementById('main-input');
        if (input) {
            input.focus();
            showToast({ message: 'Paste your list of URLs now (Ctrl+V)', type: 'info' });
        }
    }

    processFile(file) {
        const isManifest = file.name.endsWith('.mpd') || file.name.endsWith('.m3u8');
        if (isManifest) {
            const url = URL.createObjectURL(file);
            analysisActions.addStreamInputFromPreset({ url, name: file.name });
            showToast({ message: `Loaded ${file.name}`, type: 'pass' });
        } else {
            // Delegate segment analysis
            const eventBus = require('@/application/event-bus').eventBus;
            eventBus.dispatch('ui:segment-analysis-requested', { files: [file] });
        }
    }

    submitSingleUrl() {
        const url = this.state.inputValue.trim();
        if (!url) return;

        if (InputValidator.isValidUrl(url)) {
            analysisActions.addStreamInputFromPreset({ url });
            uiActions.setLoadedWorkspaceName(null);
            this.setState({ inputValue: '', detectedProtocol: null });
            showToast({ message: 'Stream added to session', type: 'pass' });
        } else {
            showToast({ message: 'Invalid URL format', type: 'fail' });
        }
    }

    submitBatch() {
        this.state.batchUrls.forEach(url => analysisActions.addStreamInputFromPreset({ url }));
        this.setState({ batchUrls: [], viewMode: 'default' });
        showToast({ message: `${this.state.batchUrls.length} streams added`, type: 'pass' });
    }

    resetBatch() {
        this.setState({ batchUrls: [], viewMode: 'default' });
    }

    // --- Renderers ---

    renderStyles() {
        return html`
            <link rel="stylesheet" href="/assets/main.css" />
            <style>
                :host { display: block; width: 100%; font-family: var(--font-sans); }
                
                /* Local utility classes for shadow DOM */
                .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
                .animate-scale-in { animation: scaleIn 0.2s ease-out forwards; }
                
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

                /* Custom Scrollbar for the batch list */
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(30, 41, 59, 0.5); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
                
                .interactive-footer-btn {
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                }
                .interactive-footer-btn:hover { color: #60a5fa; }
                .interactive-footer-btn:active { transform: scale(0.98); }
            </style>
        `;
    }

    renderBatchMode() {
        return html`
            <div class="bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl animate-scale-in w-full">
                <div class="flex justify-between items-center mb-3 border-b border-slate-800 pb-2">
                    <h3 class="text-sm font-bold text-blue-400 flex items-center gap-2 uppercase tracking-wider">
                        ${icons.layers} Batch Import
                        <span class="bg-blue-900/30 text-blue-200 px-2 py-0.5 rounded text-xs border border-blue-500/30">${this.state.batchUrls.length}</span>
                    </h3>
                    <button @click=${() => this.resetBatch()} class="text-slate-400 hover:text-white transition-colors">
                        ${icons.xCircle}
                    </button>
                </div>
                
                <div class="max-h-48 overflow-y-auto custom-scrollbar bg-black/20 rounded-lg p-2 mb-4 space-y-1 border border-white/5">
                    ${this.state.batchUrls.map((url, i) => html`
                        <div class="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-white/5 text-xs font-mono text-slate-300 transition-colors group">
                            <span class="opacity-40 w-4 text-right select-none">${i + 1}.</span>
                            <span class="truncate select-all text-slate-200">${url}</span>
                        </div>
                    `)}
                </div>

                <div class="flex gap-3">
                    <button 
                        @click=${() => this.resetBatch()}
                        class="flex-1 py-2.5 rounded-xl font-bold text-xs bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors border border-slate-700"
                    >
                        Discard
                    </button>
                    <button 
                        @click=${() => this.submitBatch()}
                        class="flex-[2] py-2.5 rounded-xl font-bold text-xs bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        ${icons.plusCircle} Import All
                    </button>
                </div>
            </div>
        `;
    }

    renderInput() {
        const { inputValue, detectedProtocol, isFocused, isDragOver } = this.state;
        
        const containerClass = `relative transition-transform duration-200 ${isDragOver ? 'scale-[1.02]' : ''}`;
        const wrapperClass = `
            flex items-center gap-3 bg-slate-800/80 backdrop-blur-xl border rounded-2xl p-2 shadow-2xl 
            transition-all duration-300
            ${isFocused || isDragOver ? 'border-blue-500/50 ring-4 ring-blue-500/10' : 'border-slate-700 hover:border-slate-600'}
        `;

        const badgeColor = detectedProtocol === 'HLS' ? 'text-purple-400 bg-purple-400/10 border-purple-400/20' : 
                           detectedProtocol === 'DASH' ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' : 
                           'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';

        return html`
            <div 
                class="${containerClass}"
                @dragover=${this.handleDragOver}
                @dragleave=${this.handleDragLeave}
                @drop=${this.handleDrop}
            >
                <!-- Drop Overlay -->
                ${isDragOver ? html`
                    <div class="absolute inset-0 z-50 bg-blue-600/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center text-white font-bold animate-fade-in pointer-events-none border-2 border-white/20">
                        <div class="scale-150 mb-2 animate-bounce">${icons.upload}</div>
                        <span>Drop to Analyze</span>
                    </div>
                ` : ''}

                <div class="${wrapperClass}">
                    <!-- Protocol Indicator -->
                    <div class="pl-2 shrink-0 w-16 flex justify-center transition-all duration-300">
                        ${detectedProtocol 
                            ? html`<span class="text-[10px] font-black px-2 py-1 rounded border uppercase tracking-wider ${badgeColor} animate-scale-in">${detectedProtocol}</span>`
                            : html`<span class="text-slate-500 scale-110">${icons.link}</span>`
                        }
                    </div>

                    <!-- Main Input -->
                    <input
                        id="main-input"
                        type="text"
                        class="flex-1 bg-transparent border-none text-lg text-white placeholder-slate-500 focus:ring-0 h-12 font-medium w-full min-w-0 outline-none"
                        placeholder="Paste URL, Drop File, or Paste List..."
                        .value=${inputValue}
                        @input=${this.handleInput}
                        @paste=${this.handlePaste}
                        @keydown=${this.handleKeyDown}
                        @focus=${() => this.setState({ isFocused: true })}
                        @blur=${() => this.setState({ isFocused: false })}
                        autocomplete="off"
                    />

                    <!-- Hidden File Input -->
                    <input 
                        id="hidden-file-input"
                        type="file" 
                        class="hidden" 
                        @change=${(e) => this.processFile(e.target.files[0])} 
                    />

                    <!-- Visual File Trigger -->
                    <button 
                        @click=${this.triggerFileInput}
                        class="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer transition-colors" 
                        title="Upload File"
                    >
                        ${icons.folder}
                    </button>

                    <!-- Analyze Button -->
                    <button
                        @click=${() => this.submitSingleUrl()}
                        class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                        ?disabled=${!inputValue.trim()}
                    >
                        ${icons.searchCode}
                        <span class="hidden sm:inline">Analyze</span>
                    </button>
                </div>
                
                <!-- Interactive Footer Actions -->
                <div class="mt-4 flex justify-center gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-500 select-none">
                    <button 
                        @click=${this.triggerBatchPaste}
                        class="interactive-footer-btn"
                        title="Paste a list of URLs to import multiple streams at once"
                    >
                        ${icons.copy} Batch Paste
                    </button>
                    <button 
                        @click=${this.triggerFileInput}
                        class="interactive-footer-btn"
                        title="Browse for manifest files"
                    >
                        ${icons.upload} Drag & Drop
                    </button>
                </div>
            </div>
        `;
    }

    render() {
        const content = this.state.viewMode === 'batch' 
            ? this.renderBatchMode() 
            : this.renderInput();

        render(html`${this.renderStyles()} ${content}`, this.shadowRoot);
    }
}

if (!customElements.get('smart-input-component')) {
    customElements.define('smart-input-component', SmartInputComponent);
}