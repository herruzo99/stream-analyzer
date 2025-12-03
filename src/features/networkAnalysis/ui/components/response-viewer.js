import { formatBytes } from '@/features/interactiveManifest/ui/components/smart-tokens.js';
import { getSegmentAnalysisTemplate } from '@/features/segmentAnalysis/ui/index';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';
import { workerService } from '@/infrastructure/worker/workerService';
import { useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { openModalWithContent } from '@/ui/services/modalService';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { jsonViewerTemplate } from '@/ui/shared/json-viewer.js';
import { highlightDash, highlightHls } from '@/ui/shared/syntax-highlighter.js';
import { html, render } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import xmlFormatter from 'xml-formatter';

// Helper to decode binary buffer to text safely
const tryDecodeText = (buffer) => {
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch (_e) {
        return null; // Binary data
    }
};

// Helper to format hex dump
const renderHexDump = (buffer) => {
    const view = new Uint8Array(buffer);
    const rows = [];
    for (let i = 0; i < view.length; i += 16) {
        const slice = view.subarray(i, i + 16);
        const hex = Array.from(slice)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join(' ');
        const ascii = Array.from(slice)
            .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
            .join('');
        rows.push({ offset: i, hex, ascii });
    }

    // Virtualization is recommended for large files, but for this preview we limit to 4KB
    const limit = 4096;
    const isTruncated = view.length > limit;
    const displayRows = isTruncated ? rows.slice(0, limit / 16) : rows;

    return html`
        <div
            class="font-mono text-xs bg-slate-950 p-4 rounded-lg overflow-auto custom-scrollbar h-full border border-slate-800"
        >
            ${displayRows.map(
                (row) => html`
                    <div
                        class="flex gap-4 border-b border-slate-900/50 hover:bg-slate-900"
                    >
                        <span class="text-slate-500 select-none w-16 text-right"
                            >${row.offset.toString(16).padStart(6, '0')}</span
                        >
                        <span class="text-blue-300 w-96">${row.hex}</span>
                        <span
                            class="text-emerald-200/70 border-l border-slate-800 pl-4"
                            >${row.ascii}</span
                        >
                    </div>
                `
            )}
            ${isTruncated
                ? html`<div class="text-center text-slate-500 italic p-2">
                      Output truncated. Download to view full
                      ${formatBytes(view.length)} file.
                  </div>`
                : ''}
        </div>
    `;
};

class ResponseViewer extends HTMLElement {
    constructor() {
        super();
        this._event = null;
        this._viewMode = 'smart'; // 'smart' | 'raw'
        this._body = null;
        this._isLoading = false;
        this._error = null;
        this._cacheUnsubscribe = null;
    }

    static get observedAttributes() {
        return ['is-modal'];
    }

    set event(val) {
        if (this._event !== val) {
            this._event = val;
            this._body = val?.response?.body || null;
            this._isLoading = false;
            this._error = null;
            this.render();
        }
    }

    connectedCallback() {
        this.render();
        this._cacheUnsubscribe = useSegmentCacheStore.subscribe(() => {
            // Re-render if cache updates (e.g. analysis completes)
            if (this.isConnected && this._viewMode === 'smart') {
                this.render();
            }
        });
    }

    disconnectedCallback() {
        if (this._cacheUnsubscribe) this._cacheUnsubscribe();
    }

    attributeChangedCallback() {
        this.render();
    }

    /**
     * Attempts to retrieve the body content from application caches if missing from the event.
     */
    resolveBody() {
        if (this._body) return this._body;
        if (!this._event) return null;

        const { url, resourceType } = this._event;

        // 1. Check Segment Cache
        const cacheEntry = useSegmentCacheStore.getState().get(url);
        if (cacheEntry && cacheEntry.data) {
            return cacheEntry.data;
        }

        // 2. Check Manifest Stores
        if (resourceType === 'manifest') {
            const { streams } = useAnalysisStore.getState();
            // Check simple stream match
            const stream = streams.find(
                (s) =>
                    s.originalUrl === url ||
                    s.resolvedUrl === url ||
                    s.baseUrl === url
            );
            if (stream && stream.rawManifest) {
                return new TextEncoder().encode(stream.rawManifest).buffer;
            }

            // Check HLS Media Playlists (Variants)
            for (const s of streams) {
                if (s.protocol === 'hls') {
                    // HLS state maps URIs to state
                    for (const [
                        variantId,
                        state,
                    ] of s.mediaPlaylists.entries()) {
                        if (
                            state.rawManifest &&
                            s.hlsVariantState.get(variantId)?.uri === url
                        ) {
                            return new TextEncoder().encode(state.rawManifest)
                                .buffer;
                        }
                    }
                    // Check variant state directly for URIs
                    for (const state of s.hlsVariantState.values()) {
                        if (
                            state.uri === url ||
                            state.historicalUris.includes(url)
                        ) {
                            // We might not have the RAW text for every historical version,
                            // but if it matches the *current*, we have it.
                            const playlist =
                                s.mediaPlaylists.get(state.id) ||
                                Array.from(s.mediaPlaylists.values()).find(
                                    (p) =>
                                        p.rawManifest &&
                                        p.manifest.variants?.some(
                                            (v) => v.resolvedUri === url
                                        )
                                );
                            if (playlist)
                                return new TextEncoder().encode(
                                    playlist.rawManifest
                                ).buffer;
                        }
                    }
                }
            }
        }

        return null;
    }

    async refetchBody() {
        if (!this._event) return;
        this._isLoading = true;
        this.render();

        try {
            const response = await fetch(this._event.url, {
                headers: this._event.request.headers,
                method: 'GET',
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            this._body = await response.arrayBuffer();
        } catch (e) {
            this._error = e.message;
        } finally {
            this._isLoading = false;
            this.render();
        }
    }

    analyzeSegmentLocally() {
        if (!this._event) return;
        const { url, _streamId } = this._event;

        const { contentType } = inferMediaInfoFromExtension(url);
        const formatHint = contentType === 'text' ? 'vtt' : null;

        const bodyToAnalyze = this.resolveBody();
        if (!bodyToAnalyze) return;

        // Initialize cache entry
        useSegmentCacheStore.getState().set(url, {
            status: -1,
            data: bodyToAnalyze,
            parsedData: null,
        });

        // Force the analysis logic:
        workerService
            .postTask('parse-segment-structure', {
                data: bodyToAnalyze,
                url: url,
                formatHint: formatHint,
                context: {},
            })
            .then((parsedData) => {
                useSegmentCacheStore.getState().set(url, {
                    status: 200,
                    data: bodyToAnalyze,
                    parsedData: parsedData,
                });
                // Trigger full analysis
                if (['isobmff', 'ts'].includes(parsedData.format)) {
                    workerService
                        .postTask('full-segment-analysis', {
                            parsedData,
                            rawData: bodyToAnalyze,
                            context: {},
                        })
                        .then((fullAnalysis) => {
                            const entry = useSegmentCacheStore
                                .getState()
                                .get(url);
                            if (entry) {
                                const updated = {
                                    ...entry.parsedData,
                                    ...fullAnalysis,
                                    bitstreamAnalysisAttempted: true,
                                };
                                useSegmentCacheStore.getState().set(url, {
                                    ...entry,
                                    parsedData: updated,
                                });
                            }
                        });
                }
            });

        this.render();
    }

    handleDeepInspect() {
        if (!this._event) return;
        uiActions.navigateToInteractiveSegment(this._event.url);
    }

    handleGoToExplorer() {
        uiActions.setActiveTab('explorer');
    }

    handleDownload() {
        const body = this.resolveBody();
        if (!body) return;
        const blob = new Blob([body]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this._event.url.split('/').pop() || 'download.bin';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    handleCopy() {
        const body = this.resolveBody();
        if (!body) return;
        const text = tryDecodeText(body);
        if (text) {
            copyTextToClipboard(text, 'Response copied to clipboard');
        } else {
            copyTextToClipboard(
                '[Binary Data]',
                'Cannot copy binary data as text'
            );
        }
    }

    handleMaximize() {
        if (!this._event) return;

        const fileName =
            this._event.url.split('/').pop().split('?')[0] || 'Response';

        openModalWithContent({
            title: fileName,
            url: this._event.url,
            isFullWidth: true,
            content: {
                type: 'networkResponse',
                data: { event: this._event },
            },
        });
    }

    renderContent() {
        if (this._isLoading) {
            return html`
                <div
                    class="flex flex-col items-center justify-center p-10 text-slate-500 h-full"
                >
                    <div class="scale-125 mb-4 animate-spin">
                        ${icons.spinner}
                    </div>
                    <p>Fetching content...</p>
                </div>
            `;
        }

        if (this._error) {
            return html`
                <div
                    class="p-6 text-center text-red-400 bg-red-900/10 border border-red-900/50 rounded-lg h-full flex flex-col items-center justify-center"
                >
                    <div class="mb-2 text-lg">${icons.alertTriangle}</div>
                    <p class="font-bold">Failed to load body</p>
                    <p class="text-sm mt-1 opacity-80">${this._error}</p>
                </div>
            `;
        }

        const url = this._event.url;
        const contentType =
            this._event.response.contentType?.toLowerCase() || '';
        const resourceType = this._event.resourceType;

        // Resolve body from Event or Cache
        const resolvedBody = this.resolveBody();

        // --- Classification Logic ---
        const isManifest =
            resourceType === 'manifest' ||
            contentType.includes('application/dash+xml') ||
            contentType.includes('application/vnd.apple.mpegurl') ||
            contentType.includes('application/x-mpegurl') ||
            url.includes('.mpd') ||
            url.includes('.m3u8');

        // Only classify as segment if it is NOT a manifest
        const isSegment =
            !isManifest &&
            (['video', 'audio', 'init', 'text'].includes(resourceType) ||
                contentType.includes('mp4') ||
                url.endsWith('.ts') ||
                url.endsWith('.m4s'));

        const isModal = this.hasAttribute('is-modal');

        // --- Smart View: Segment Analysis ---
        if (this._viewMode === 'smart' && isSegment) {
            const cacheEntry = useSegmentCacheStore.getState().get(url);

            if (cacheEntry?.parsedData) {
                // If IN MODAL (Focus Mode), show full UI
                if (isModal) {
                    return html`
                        <div
                            class="h-full flex flex-col relative bg-slate-950 rounded-lg border border-slate-800 overflow-hidden"
                        >
                            <div class="absolute top-3 right-4 z-10 flex gap-2">
                                <button
                                    @click=${() => this.handleGoToExplorer()}
                                    class="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition-colors"
                                    title="Open Segment Explorer"
                                >
                                    ${icons.grid} Explorer
                                </button>
                                <button
                                    @click=${() => this.handleDeepInspect()}
                                    class="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg transition-all hover:scale-105"
                                >
                                    ${icons.binary} Deep Inspect
                                </button>
                            </div>
                            <div
                                class="grow min-h-0 overflow-y-auto custom-scrollbar pt-2"
                            >
                                ${getSegmentAnalysisTemplate(
                                    cacheEntry.parsedData,
                                    null,
                                    resourceType === 'init' ||
                                        url.includes('init'),
                                    url
                                )}
                            </div>
                        </div>
                    `;
                }
                // If NOT in modal (Small side panel), show Compact Card with Deep Inspect Button
                else {
                    return html`
                        <div
                            class="flex flex-col items-center justify-center p-6 text-slate-500 bg-slate-900/30 rounded-lg border border-slate-800 h-full text-center"
                        >
                            <div
                                class="mb-3 opacity-70 p-3 bg-slate-800 rounded-full"
                            >
                                ${icons.binary}
                            </div>
                            <p class="text-sm font-bold text-slate-300">
                                Segment Parsed
                            </p>
                            <p
                                class="text-xs mt-1 mb-4 opacity-70 max-w-[200px]"
                            >
                                Detailed structure analysis is available.
                            </p>
                            <div
                                class="flex flex-col gap-2 w-full max-w-[200px]"
                            >
                                <button
                                    @click=${() => this.handleMaximize()}
                                    class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2"
                                >
                                    ${icons.maximize} Focus View
                                </button>
                                <button
                                    @click=${() => this.handleDeepInspect()}
                                    class="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-lg border border-slate-700 transition-all flex items-center justify-center gap-2"
                                >
                                    ${icons.binary} Deep Inspect
                                </button>
                            </div>
                        </div>
                    `;
                }
            } else if (cacheEntry?.status === -1) {
                return html`
                    <div
                        class="flex flex-col items-center justify-center p-10 text-blue-400 h-full border border-slate-800 rounded-lg bg-slate-900/30"
                    >
                        <div class="scale-125 mb-4 animate-spin">
                            ${icons.spinner}
                        </div>
                        <p class="font-bold text-sm">
                            Analyzing Segment Structure...
                        </p>
                    </div>
                `;
            } else if (resolvedBody) {
                return html`
                    <div
                        class="flex flex-col items-center justify-center p-8 text-slate-500 bg-slate-900/30 rounded-lg border-2 border-dashed border-slate-800 h-full"
                    >
                        <div class="mb-3 opacity-50 scale-125">
                            ${icons.fileScan}
                        </div>
                        <p class="text-sm font-medium">
                            Segment Analysis Available
                        </p>
                        <p
                            class="text-xs mt-1 opacity-70 max-w-[240px] text-center"
                        >
                            Parse atoms, packets, and timing for this segment.
                        </p>
                        <button
                            @click=${() => this.analyzeSegmentLocally()}
                            class="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded transition-colors flex items-center gap-2 shadow-lg"
                        >
                            ${icons.play} Run Analysis
                        </button>
                    </div>
                `;
            }
        }

        if (!resolvedBody) {
            return html`
                <div
                    class="flex flex-col items-center justify-center p-8 text-slate-500 bg-slate-900/30 rounded-lg border-2 border-dashed border-slate-800 h-full"
                >
                    <div class="mb-3 opacity-50 scale-125">
                        ${icons.hardDrive}
                    </div>
                    <p class="text-sm font-medium">Body not in Memory</p>
                    <p
                        class="text-xs mt-1 opacity-70 max-w-[200px] text-center"
                    >
                        This payload was purged from cache or streamed without
                        capture.
                    </p>
                    <button
                        @click=${() => this.refetchBody()}
                        class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition-colors flex items-center gap-2 shadow-lg"
                    >
                        ${icons.download} Refetch
                    </button>
                </div>
            `;
        }

        // --- 1. Image Preview ---
        if (contentType.startsWith('image/')) {
            const blob = new Blob([resolvedBody], { type: contentType });
            const url = URL.createObjectURL(blob);
            return html`
                <div
                    class="flex items-center justify-center p-4 bg-checkerboard rounded-lg h-full bg-slate-900 border border-slate-800"
                >
                    <img
                        src="${url}"
                        class="max-w-full max-h-full object-contain shadow-lg rounded"
                    />
                </div>
            `;
        }

        // --- 2. JSON Viewer ---
        const text = tryDecodeText(resolvedBody);
        const looksLikeJson =
            text &&
            (text.trim().startsWith('{') || text.trim().startsWith('['));

        if (
            this._viewMode === 'smart' &&
            (contentType.includes('json') || looksLikeJson)
        ) {
            const json = JSON.parse(text);
            return html`<div
                class="h-full overflow-hidden flex flex-col bg-slate-950 rounded-lg border border-slate-800"
            >
                ${jsonViewerTemplate(json)}
            </div>`;
        }

        // --- 3. Manifest Viewer ---
        if (
            this._viewMode === 'smart' &&
            (isManifest ||
                resourceType === 'manifest' ||
                contentType.includes('xml') ||
                contentType.includes('mpegurl'))
        ) {
            if (text) {
                let formatted = text;
                let highlighted = '';

                if (contentType.includes('xml') || text.includes('<MPD')) {
                    formatted = xmlFormatter(text, {
                        indentation: '  ',
                        lineSeparator: '\n',
                    });
                    highlighted = highlightDash(formatted);
                } else {
                    // HLS
                    const lines = text.split('\n');
                    highlighted = lines.map((l) => highlightHls(l)).join('\n');
                }

                return html`
                    <div
                        class="bg-slate-950 p-4 rounded-lg overflow-auto custom-scrollbar text-xs font-mono leading-relaxed text-slate-300 h-full border border-slate-800"
                    >
                        <pre>${unsafeHTML(highlighted)}</pre>
                    </div>
                `;
            }
        }

        // --- 4. Raw Text Fallback ---
        if (text && this._viewMode === 'raw') {
            return html`
                <textarea
                    readonly
                    class="w-full h-full bg-slate-950 text-slate-300 font-mono text-xs p-4 rounded-lg border border-slate-800 outline-none resize-none custom-scrollbar"
                >
${text}</textarea
                >
            `;
        }

        // --- 5. Hex View (Binary or Default) ---
        return renderHexDump(resolvedBody);
    }

    render() {
        if (!this._event) return;

        const isModal = this.hasAttribute('is-modal');
        const resolvedBody = this.resolveBody();
        const sizeLabel = resolvedBody
            ? formatBytes(resolvedBody.byteLength)
            : 'Unknown Size';

        const template = html`
            <div class="flex flex-col h-full">
                <!-- Toolbar -->
                <div
                    class="flex justify-between items-center mb-3 pb-2 border-b border-slate-800/50 shrink-0"
                >
                    <div class="flex gap-1 bg-slate-800 p-0.5 rounded-lg">
                        <button
                            @click=${() => {
                                this._viewMode = 'smart';
                                this.render();
                            }}
                            class="px-3 py-1 text-xs font-bold rounded-md transition-colors ${this
                                ._viewMode === 'smart'
                                ? 'bg-blue-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'}"
                        >
                            Smart
                        </button>
                        <button
                            @click=${() => {
                                this._viewMode = 'raw';
                                this.render();
                            }}
                            class="px-3 py-1 text-xs font-bold rounded-md transition-colors ${this
                                ._viewMode === 'raw'
                                ? 'bg-blue-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'}"
                        >
                            Raw
                        </button>
                    </div>

                    <div class="flex items-center gap-2">
                        <span
                            class="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800"
                        >
                            ${sizeLabel}
                        </span>
                        <div class="h-4 w-px bg-slate-800 mx-1"></div>
                        <button
                            @click=${() => this.handleCopy()}
                            class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                            title="Copy"
                        >
                            ${icons.clipboardCopy}
                        </button>
                        <button
                            @click=${() => this.handleDownload()}
                            class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                            title="Download"
                        >
                            ${icons.download}
                        </button>
                        ${!isModal
                            ? html`
                                  <button
                                      @click=${() => this.handleMaximize()}
                                      class="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded transition-colors"
                                      title="Focus View"
                                  >
                                      ${icons.maximize}
                                  </button>
                              `
                            : ''}
                    </div>
                </div>

                <!-- Content Area -->
                <div class="grow min-h-0 relative h-full">
                    ${this.renderContent()}
                </div>
            </div>
        `;

        render(template, this);
    }
}

customElements.define('response-viewer', ResponseViewer);

export const responseViewerTemplate = (event) =>
    html`<response-viewer .event=${event}></response-viewer>`;
