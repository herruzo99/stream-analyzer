import { eventBus } from '@/application/event-bus';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { EVENTS } from '@/types/events';
import { showToast } from '@/ui/components/toast';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';

class InputLogic {
    static detectProtocol(value) {
        if (!value || typeof value !== 'string') return null;
        const v = value.trim();
        if (v.includes('.m3u8') || v.includes('#EXTM3U')) return 'HLS';
        if (v.includes('.mpd') || v.includes('<MPD')) return 'DASH';
        if (v.includes('.ism')) return 'MSS';
        if (v.startsWith('http://') || v.startsWith('https://')) return 'HTTP';
        return null;
    }

    static parseBatch(text) {
        if (!text) return [];
        return text
            .split(/[\n,\s]+/)
            .map((s) => s.trim())
            .filter((s) => s.startsWith('http://') || s.startsWith('https://'));
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
        this.state = {
            value: '',
            protocol: null,
            isDragActive: false,
            isFocused: false,
            viewMode: 'single',
            batchList: [],
        };
        // ... (bindings skipped for brevity, assumed unchanged)
        this.handleInput = this.handleInput.bind(this);
        this.handlePaste = this.handlePaste.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleDragEnter = this.handleDragEnter.bind(this);
        this.handleDragLeave = this.handleDragLeave.bind(this);
        this.handleDragOver = this.handleDragOver.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.openFileDialog = this.openFileDialog.bind(this);
        this.focus = this.focus.bind(this);
    }

    focus() {
        const input = this.querySelector('input');
        if (input) input.focus();
    }

    connectedCallback() {
        this.mode = this.getAttribute('mode') || 'analyze';
        this.variant = this.getAttribute('variant') || 'hero';
        this.render();
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.render();
    }

    handleInput(e) {
        const val = e.target.value;
        const proto = InputLogic.detectProtocol(val);
        this.setState({ value: val, protocol: proto });
    }

    handlePaste(e) {
        const paste = e.clipboardData?.getData('text');
        if (!paste) return;
        const urls = InputLogic.parseBatch(paste);
        if (urls.length > 1) {
            e.preventDefault();
            this.setState({
                viewMode: 'batch',
                batchList: urls,
                value: '',
                protocol: null,
            });
            showToast({
                message: `Batch mode active: ${urls.length} URLs detected.`,
                type: 'info',
            });
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.submit();
        }
    }

    handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        this.setState({ isDragActive: true });
    }
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!this.contains(e.relatedTarget))
            this.setState({ isDragActive: false });
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.setState({ isDragActive: false });
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) this.processFile(files[0]);
        else {
            const text = e.dataTransfer?.getData('text');
            if (text) {
                const urls = InputLogic.parseBatch(text);
                if (urls.length > 1)
                    this.setState({ viewMode: 'batch', batchList: urls });
                else if (urls.length === 1)
                    this.setState({
                        value: urls[0],
                        protocol: InputLogic.detectProtocol(urls[0]),
                    });
            }
        }
    }

    openFileDialog() {
        const input = /** @type {HTMLInputElement} */ (
            this.querySelector('#hidden-file')
        );
        if (input) input.click();
    }

    processFile(file) {
        const lowerName = file.name.toLowerCase();
        const isManifest =
            lowerName.endsWith('.mpd') || lowerName.endsWith('.m3u8');
        // New: Check for playable video containers
        const isVideoFile =
            lowerName.endsWith('.mp4') ||
            lowerName.endsWith('.webm') ||
            lowerName.endsWith('.mkv') ||
            lowerName.endsWith('.mov');

        if (isManifest || isVideoFile) {
            const blobUrl = URL.createObjectURL(file);

            if (this.mode === 'add') {
                analysisActions.addStreamInputFromPreset({
                    url: blobUrl,
                    name: file.name,
                });
                showToast({ message: 'Added to session queue.', type: 'pass' });
            } else {
                // Direct Analyze
                analysisActions.setStreamInputs([
                    { url: blobUrl, name: file.name },
                ]);
                const { streamInputs } = useAnalysisStore.getState();
                eventBus.dispatch(EVENTS.UI.STREAM_ANALYSIS_REQUESTED, {
                    inputs: streamInputs,
                });
            }

            showToast({
                message: `Loaded local file: ${file.name}`,
                type: 'pass',
            });
        } else {
            // Treat as raw segment/binary for inspection
            eventBus.dispatch(EVENTS.UI.SEGMENT_ANALYSIS_REQUESTED, {
                files: [file],
            });
        }
    }

    submit() {
        if (this.state.viewMode === 'batch') {
            this.state.batchList.forEach((url) =>
                analysisActions.addStreamInputFromPreset({ url })
            );
            showToast({
                message: `Queued ${this.state.batchList.length} streams.`,
                type: 'pass',
            });
            this.setState({ viewMode: 'single', batchList: [] });
            return;
        }

        const url = this.state.value.trim();
        if (!url) return;

        if (InputLogic.isValidUrl(url)) {
            if (this.mode === 'add') {
                analysisActions.addStreamInputFromPreset({ url });
                showToast({ message: 'Stream added to queue.', type: 'pass' });
            } else {
                analysisActions.addStreamInputFromPreset({ url });
                if (this.variant === 'hero') {
                    analysisActions.setStreamInputs([{ url }]);
                    const freshInputs =
                        useAnalysisStore.getState().streamInputs;
                    eventBus.dispatch(EVENTS.UI.STREAM_ANALYSIS_REQUESTED, {
                        inputs: freshInputs,
                    });
                } else {
                    showToast({ message: 'Stream added.', type: 'pass' });
                }
            }
            this.setState({ value: '', protocol: null });
        } else {
            showToast({ message: 'Invalid URL format.', type: 'fail' });
        }
    }

    renderBatchEditor() {
        return html`
            <div
                class="w-full bg-slate-800 rounded-xl shadow-2xl overflow-hidden animate-scaleIn"
            >
                <div
                    class="p-3 flex justify-between items-center bg-slate-800"
                >
                    <div
                        class="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider"
                    >
                        ${icons.layers} Batch Import
                        (${this.state.batchList.length})
                    </div>
                    <button
                        @click=${() =>
                this.setState({
                    viewMode: 'single',
                    batchList: [],
                })}
                        class="text-slate-400 hover:text-slate-100 transition-colors"
                    >
                        ${icons.xCircle}
                    </button>
                </div>
                <div
                    class="max-h-48 overflow-y-auto custom-scrollbar p-2 space-y-1 bg-slate-900"
                >
                    ${this.state.batchList.map(
                    (url, i) => html`
                            <div
                                class="flex items-center gap-3 px-3 py-2 rounded bg-slate-800 text-xs text-slate-100 font-mono truncate"
                            >
                                <span
                                    class="text-slate-400 w-4 text-right select-none"
                                    >${i + 1}.</span
                                >
                                <span class="truncate">${url}</span>
                            </div>
                        `
                )}
                </div>
                <div
                    class="p-3 bg-slate-800 flex gap-3"
                >
                    <button
                        @click=${() =>
                this.setState({
                    viewMode: 'single',
                    batchList: [],
                })}
                        class="flex-1 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        @click=${() => this.submit()}
                        class="flex-[2] py-2 rounded-lg text-xs font-bold bg-[#60a5fa] text-slate-100 hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all"
                    >
                        Import All
                    </button>
                </div>
            </div>
        `;
    }

    renderSingleInput() {
        const { value, protocol, isDragActive, isFocused } = this.state;
        const containerClass = `relative w-full transition-all duration-500 ${isDragActive || isFocused ? 'scale-[1.02]' : ''}`;

        // --- Neo-Glass Pill Styles ---
        const isHero = this.variant === 'hero';
        const wrapperClass = `
            flex items-center gap-0 
            ${isHero ? 'rounded-full h-16' : 'rounded-xl h-12'} 
            bg-slate-800 backdrop-blur-2xl 
            transition-all duration-300 overflow-hidden
            shadow-[0_10px_40px_rgba(0,0,0,0.3)]
            ${isFocused || isDragActive
                ? 'shadow-[0_0_30px_#3b82f6] ring-2 ring-[#3b82f6]'
                : 'hover:ring-1 hover:ring-[#60a5fa]'}
        `;
        const badgeColor =
            protocol === 'HLS'
                ? 'text-purple-300 bg-slate-700 shadow-[0_0_10px_#a855f7]'
                : protocol === 'DASH'
                    ? 'text-blue-400 bg-slate-700 shadow-[0_0_10px_#3b82f6]'
                    : 'text-slate-400';

        return html`
            <div
                class="${containerClass}"
                @dragenter=${this.handleDragEnter}
                @dragover=${this.handleDragOver}
                @dragleave=${this.handleDragLeave}
                @drop=${this.handleDrop}
            >
                <!-- Drag Overlay -->
                <div
                    class="absolute inset-0 z-50 rounded-2xl border-2 border-dashed border-blue-500 bg-slate-800 backdrop-blur-xl flex flex-col items-center justify-center text-blue-400 font-bold transition-all duration-300 ${isDragActive
                ? 'opacity-100 pointer-events-auto scale-100'
                : 'opacity-0 pointer-events-none scale-95'}"
                >
                    <div
                        class="scale-150 mb-3 animate-bounce drop-shadow-[0_0_10px_#3b82f6]"
                    >
                        ${icons.upload}
                    </div>
                    <span class="text-lg">Drop Manifest or Media File</span>
                </div>

                <div class="${wrapperClass}">
                    <div
                        class="pl-4 pr-3 shrink-0 flex justify-center min-w-[3.5rem]"
                    >
                        ${protocol
                ? html`<span
                                  class="text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider animate-scaleIn ${badgeColor}"
                                  >${protocol}</span
                              >`
                : html`<span
                                  class="text-slate-400 transition-colors group-hover:text-slate-400"
                                  >${icons.link}</span
                              >`}
                    </div>
                    <input
                        type="text"
                        class="flex-1 bg-transparent border-none text-slate-200 placeholder-slate-300 focus:ring-0 h-full w-full min-w-0 px-0 text-base font-medium font-mono"
                        placeholder="Paste URL, drop file (.mpd, .m3u8, .mp4), or paste list..."
                        .value=${value}
                        @input=${this.handleInput}
                        @focus=${() => this.setState({ isFocused: true })}
                        @blur=${() => this.setState({ isFocused: false })}
                        @paste=${this.handlePaste}
                        @keydown=${this.handleKeyDown}
                        autocomplete="off"
                        spellcheck="false"
                    />

                    <div
                        class="flex items-center h-full bg-slate-200/5 pl-2"
                    >
                        <button
                            @click=${this.openFileDialog}
                            class="p-2.5 text-slate-400 hover:text-slate-100 hover:bg-slate-100/10 rounded-xl transition-colors"
                            title="Upload Local File"
                        >
                            ${icons.folder}
                        </button>
                        <button
                            @click=${() => this.submit()}
                            class="${isHero ? 'rounded-full px-8 mr-1.5' : 'rounded-lg px-6 mr-1'} h-[85%] bg-gradient-to-r from-blue-500 to-[#60a5fa] hover:to-purple-500 text-slate-100 text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_#3b82f6] hover:shadow-[0_0_30px_#3b82f6] transition-all flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none disabled:grayscale"
                            ?disabled=${!value.trim()}
                        >
                            ${this.mode === 'add'
                ? icons.plusCircle
                : icons.searchCode}
                            <span class="hidden sm:inline"
                                >${this.mode === 'add'
                ? 'Add'
                : 'Analyze'}</span
                            >
                        </button>
                    </div>
                </div>
                <input
                    type="file"
                    id="hidden-file"
                    class="hidden"
                    @change=${(e) => this.processFile(e.target.files[0])}
                />
            </div>
            ${this.variant === 'hero'
                ? html`
                      <div
                          class="mt-4 pb-2 flex justify-center gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-400 select-none animate-fadeIn delay-100"
                      >
                          <span
                              class="flex items-center gap-2 cursor-help hover:text-blue-400 transition-colors"
                              title="Paste multiple URLs separated by newlines"
                              >${icons.layers} Batch Paste</span
                          >
                          <span
                              class="flex items-center gap-2 cursor-help hover:text-blue-400 transition-colors"
                              title="Drop .mpd, .m3u8, .mp4 files"
                              >${icons.fileScan} Drag & Drop</span
                          >
                      </div>
                  `
                : ''}
        `;
    }

    render() {
        const content =
            this.state.viewMode === 'batch'
                ? this.renderBatchEditor()
                : this.renderSingleInput();
        render(content, this);
    }
}

if (!customElements.get('smart-input-component')) {
    customElements.define('smart-input-component', SmartInputComponent);
}
