import { eventBus } from '@/application/event-bus';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { uiActions } from '@/state/uiStore';
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
        this.openFileDialog = this.openFileDialog.bind(this);
    }

    focus(options) {
        const input = this.querySelector('input');
        if (input) input.focus(options);
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
            const valid = this.state.batchList.filter((url) =>
                InputLogic.isValidUrl(url)
            );
            const skipped = this.state.batchList.length - valid.length;
            if (valid.length === 0) {
                showToast({
                    message:
                        'Nothing valid to import. Fix or remove the flagged rows.',
                    type: 'fail',
                });
                return;
            }
            valid.forEach((url) =>
                analysisActions.addStreamInputFromPreset({ url })
            );
            showToast({
                message:
                    `Queued ${valid.length} stream${valid.length === 1 ? '' : 's'}` +
                    (skipped > 0
                        ? `, skipped ${skipped} invalid.`
                        : '.'),
                type: skipped > 0 ? 'warn' : 'pass',
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
            } else if (this.variant === 'hero') {
                analysisActions.setStreamInputs([{ url }]);
                const freshInputs = useAnalysisStore.getState().streamInputs;
                eventBus.dispatch(EVENTS.UI.STREAM_ANALYSIS_REQUESTED, {
                    inputs: freshInputs,
                });
            } else {
                showToast({ message: 'Stream added.', type: 'pass' });
            }
            this.setState({ value: '', protocol: null });
        } else {
            showToast({
                message:
                    'That URL did not parse. Paste a full https manifest URL, or try an example below.',
                type: 'fail',
            });
        }
    }

    renderBatchEditor() {
        return html`
            <div
                class="w-full rounded-md border border-[#1a2636] bg-[#0b111c] overflow-hidden"
            >
                <div
                    class="p-3 flex justify-between items-center border-b border-white/5"
                >
                    <div
                        class="flex items-center gap-2 text-slate-200 font-semibold text-[13px]"
                    >
                        ${icons.layers} Batch import
                        <span class="mono text-[11px] text-slate-500"
                            >${this.state.batchList.length} URLs</span
                        >
                    </div>
                    <button
                        @click=${() =>
                this.setState({
                    viewMode: 'single',
                    batchList: [],
                })}
                        class="text-slate-500 hover:text-slate-100 transition-colors p-1 rounded-md focus-visible:outline-2 focus-visible:outline-emerald-400"
                        aria-label="Cancel batch import"
                    >
                        ${icons.xCircle}
                    </button>
                </div>
                <div
                    class="max-h-48 overflow-y-auto custom-scrollbar p-2 space-y-1"
                >
                    ${this.state.batchList.map(
                    (url, i) => {
                        const valid = InputLogic.isValidUrl(url);
                        return html`
                            <div
                                class="flex items-center gap-2 px-2 py-1.5 rounded-md ${valid ? '' : 'border border-red-400/30'}"
                            >
                                <span
                                    class="mono text-slate-500 w-5 shrink-0 text-right text-[11px] select-none"
                                    >${i + 1}</span
                                >
                                <span
                                    class="truncate grow font-mono text-xs ${valid ? 'text-slate-200' : 'text-red-300'}"
                                    title="${url}"
                                    >${url}</span
                                >
                                ${valid
                                    ? ''
                                    : html`<span
                                          class="shrink-0 text-[10px] font-bold text-red-300"
                                          >check this one</span
                                      >`}
                                <button
                                    @click=${() => this.removeBatchUrl(i)}
                                    class="shrink-0 p-1 text-slate-500 hover:text-red-300 rounded transition-colors"
                                    title="Remove this URL"
                                    aria-label="Remove URL ${i + 1}"
                                >
                                    ${icons.x}
                                </button>
                            </div>
                        `;
                    }
                )}
                </div>
                <div class="p-3 border-t border-white/5 flex gap-2">
                    <button
                        @click=${() =>
                this.setState({
                    viewMode: 'single',
                    batchList: [],
                })}
                        class="flex-1 py-2 rounded-md text-[13px] font-semibold text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    ${(() => {
                        const validCount = this.state.batchList.filter(
                            (url) => InputLogic.isValidUrl(url)
                        ).length;
                        const empty = this.state.batchList.length === 0;
                        return html`
                            <button
                                @click=${() => this.submit()}
                                ?disabled=${validCount === 0}
                                title=${empty
                                    ? 'Nothing to import'
                                    : validCount <
                                        this.state.batchList.length
                                      ? 'Imports the valid rows, skips the flagged ones'
                                      : 'Import every row'}
                                class="flex-[2] py-2 rounded-md text-[13px] font-bold bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                ${empty
                                    ? 'Nothing to import'
                                    : validCount <
                                        this.state.batchList.length
                                      ? `Import ${validCount} valid`
                                      : 'Import all'}
                            </button>
                        `;
                    })()}
                </div>
            </div>
        `;
    }

    removeBatchUrl(index) {
        this.setState({
            batchList: this.state.batchList.filter((_, i) => i !== index),
        });
    }

    _openExamples() {
        uiActions.setStreamLibraryTab('examples');
        uiActions.setLibraryModalOpen(true);
    }

    renderSingleInput() {
        const { value, protocol, isDragActive, isFocused } = this.state;
        // --- Workbench field: flat, square-ish, honest. ---
        const isHero = this.variant === 'hero';
        const wrapperClass = `
            flex items-center gap-0
            ${isHero ? 'rounded-md min-h-[3.5rem]' : 'rounded-md h-12'}
            bg-[#06090f] border border-[#263449]
            transition-colors duration-150 overflow-hidden
            ${isFocused || isDragActive ? 'border-emerald-400/60' : 'hover:border-[#35496a]'}
        `;
        const badgeColor = protocol
            ? 'text-emerald-200 bg-emerald-500/10 border border-emerald-400/25'
            : 'text-slate-400';

        return html`
            <div
                class="relative w-full"
                @dragenter=${this.handleDragEnter}
                @dragover=${this.handleDragOver}
                @dragleave=${this.handleDragLeave}
                @drop=${this.handleDrop}
            >
                <!-- Drag Overlay -->
                <div
                    class="absolute inset-0 z-50 rounded-md border border-dashed border-emerald-400/60 bg-[#06090f]/95 flex items-center justify-center gap-3 text-emerald-300 font-semibold text-sm ${isDragActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}"
                >
                    ${icons.upload}
                    <span>Drop a manifest or media file</span>
                </div>

                <div class="${wrapperClass}">
                    <div
                        class="pl-3 pr-2 shrink-0 flex justify-center min-w-[3rem]"
                    >
                        ${protocol
                ? html`<span
                                  class="mono text-[10px] font-bold px-2 py-1 rounded ${badgeColor}"
                                  >${protocol}</span
                              >`
                : html`<span class="text-slate-500">${icons.link}</span>`}
                    </div>
                    <input
                        type="url"
                        inputmode="url"
                        aria-label="Manifest URL"
                        class="flex-1 bg-transparent border-none text-slate-100 placeholder-slate-500 focus:ring-0 h-full w-full min-w-0 px-1 py-3 text-[15px] font-mono"
                        placeholder="https://cdn.example.com/stream/manifest.mpd"
                        .value=${value}
                        @input=${this.handleInput}
                        @focus=${() => this.setState({ isFocused: true })}
                        @blur=${() => this.setState({ isFocused: false })}
                        @paste=${this.handlePaste}
                        @keydown=${this.handleKeyDown}
                        autocomplete="off"
                        spellcheck="false"
                    />

                    <div class="flex items-center gap-1 pr-1.5 pl-1 shrink-0">
                        <button
                            @click=${this.openFileDialog}
                            class="p-2.5 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-md transition-colors"
                            title="Open a local file (.mpd, .m3u8, .mp4)"
                            aria-label="Open a local file"
                        >
                            ${icons.folder}
                        </button>
                        <button
                            @click=${() => this.submit()}
                            class="rounded-md px-5 py-2.5 bg-emerald-400 text-slate-950 text-sm font-bold hover:bg-emerald-300 active:scale-[0.99] transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                            ?disabled=${!value.trim()}
                        >
                            ${this.mode === 'add'
                ? icons.plusCircle
                : icons.searchCode}
                            <span
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
                    accept=".mpd,.m3u8,.mp4,.webm,.mkv,.mov"
                    @change=${(e) => {
                        if (e.target.files?.[0])
                            this.processFile(e.target.files[0]);
                        e.target.value = '';
                    }}
                />
            </div>
            ${this.variant === 'hero'
                ? html`
                      <div
                          class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500 select-none"
                      >
                          <span
                              class="flex items-center gap-1.5"
                              title="Paste several URLs at once, separated by newlines"
                              >${icons.layers} Batch paste</span
                          >
                          <span
                              class="flex items-center gap-1.5"
                              title="Drop .mpd, .m3u8 or .mp4 files anywhere on this field"
                              >${icons.fileScan} Drag &amp; drop</span
                          >
                          <button
                              @click=${() => this._openExamples()}
                              class="flex items-center gap-1.5 text-emerald-300/90 hover:text-emerald-200 transition-colors font-medium"
                          >
                              ${icons.library} No URL? Open examples
                          </button>
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
