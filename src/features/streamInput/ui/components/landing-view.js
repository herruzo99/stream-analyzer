import { eventBus } from '@/application/event-bus';
import { exampleStreams, routeExampleUrl } from '@/data/example-streams';
import {
    getLastUsedStreams,
    getPresets,
    getWorkspaces,
} from '@/infrastructure/persistence/streamStorage';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { inputView } from '../input-view.js';
import { uiActions, useUiStore } from '@/state/uiStore';
import { EVENTS } from '@/types/events';
import { showToast } from '@/ui/components/toast';
import * as icons from '@/ui/icons';
import { openModalWithContent } from '@/ui/services/modalService';
import { html, render } from 'lit-html';
import './smart-input.js';

function safeHostname(url) {
    if (typeof url !== 'string' || !url) return 'unknown host';
    try {
        const parsed = new URL(url);
        if (parsed.protocol === 'blob:') return 'local file';
        return parsed.hostname || 'unknown host';
    } catch {
        return url.length > 32 ? `${url.slice(0, 32)}…` : url;
    }
}

function detectProtocol(url) {
    if (typeof url !== 'string') return 'STREAM';
    if (url.includes('.m3u8')) return 'HLS';
    if (url.includes('.mpd')) return 'DASH';
    if (url.includes('.ism')) return 'MSS';
    return 'STREAM';
}

function protocolBadge(proto) {
    const base =
        'mono shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border';
    if (proto && proto !== 'STREAM')
        return `${base} text-emerald-200 bg-emerald-500/10 border-emerald-400/25`;
    return `${base} text-slate-400 bg-white/5 border-white/10`;
}

const FEATURED_URL_HINTS = ['x36xhzz', 'livesim2', 'clear_cmaf_1080p_h265'];

/**
 * Display label for an example entry: LL variants win over the base
 * protocol so the Low Latency group reads as LL-HLS/LL-DASH.
 * @param {{protocol:string, category?:string, url?:string}} ex
 */
function exampleLabel(ex) {
    const base =
        ex.protocol === 'dash'
            ? 'DASH'
            : ex.protocol === 'hls'
              ? 'HLS'
              : ex.protocol === 'srt'
                ? 'SRT'
                : 'STREAM';
    if (ex.category === 'Low Latency') {
        return base === 'HLS' ? 'LL-HLS' : base === 'DASH' ? 'LL-DASH' : base;
    }
    if (ex.protocol === 'srt') return 'SRT';
    return base;
}

class LandingViewComponent extends HTMLElement {
    constructor() {
        super();
        this.unsubs = [];
        this._lastSig = '';
        this._pending = false;
    }

    connectedCallback() {
        this._onBlurFlush = () => {
            if (!this._pending) return;
            // Focus may just be moving between controls inside the landing
            // (e.g. input -> Analyze button). Only flush once it truly leaves,
            // otherwise the forced re-render would replace the click target.
            requestAnimationFrame(() => {
                if (this.contains(document.activeElement)) return;
                this._pending = false;
                this._render(true);
            });
        };
        this.addEventListener('blur', this._onBlurFlush, true);
        this._render(true);

        this.unsubs.push(useUiStore.subscribe(() => this._render()));
        this.unsubs.push(useAnalysisStore.subscribe(() => this._render()));
    }

    disconnectedCallback() {
        this.unsubs.forEach((unsub) => unsub());
        this.unsubs = [];
        this.removeEventListener('blur', this._onBlurFlush, true);
    }

    _render(force = false) {
        if (!this.isConnected) return;

        // Never yank the input out from under someone typing.
        const active = document.activeElement;
        if (
            !force &&
            active &&
            this.contains(active) &&
            (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')
        ) {
            this._pending = true;
            return;
        }

        const history = getLastUsedStreams();
        const presets = getPresets();
        const workspaces = getWorkspaces();
        const { streamInputs } = useAnalysisStore.getState();
        const stagedCount = streamInputs.length;
        const stagedNames = streamInputs
            .slice(0, 3)
            .map((s) => s.name || safeHostname(s.url))
            .join(', ');

        // Signature covers everything rendered: top history rows (url+name),
        // library counts, preset/workspace identities, and the staged queue.
        const sig = [
            history
                .slice(0, 6)
                .map((s) => `${s?.url ?? ''}|${s?.name ?? ''}`)
                .join(';'),
            presets.map((p) => `${p?.url ?? ''}|${p?.name ?? ''}`).join(';'),
            workspaces.map((w) => w?.name ?? '').join(';'),
            exampleStreams.length,
            streamInputs.map((s) => `${s.id}:${s.url ?? ''}`).join(';'),
        ].join(' # ');
        if (!force && sig === this._lastSig) return;
        this._lastSig = sig;

        const styles = html`
            <style>
                .landing-root {
                    display: block !important;
                    width: 100%;
                    height: 100%;
                    position: relative;
                    overflow-y: auto;
                    padding: 0 !important;
                    gap: 0 !important;
                    background: #06090f;
                }

                landing-view-component {
                    display: block;
                    width: 100%;
                    height: 100%;
                }

                .console-title {
                    font-size: clamp(1.75rem, 1.2rem + 2.5vw, 2.75rem);
                    line-height: 1.1;
                    letter-spacing: -0.02em;
                    font-weight: 700;
                    color: #fff;
                    text-wrap: balance;
                }

                .mono {
                    font-family: 'Fira Code', Menlo, Monaco, monospace;
                }

                .panel {
                    background: #0b111c;
                    border: 1px solid #1a2636;
                    border-radius: 12px;
                }

                .landing-root a:focus-visible,
                .landing-root button:focus-visible,
                .landing-root input:focus-visible {
                    outline: 2px solid #4cc38a;
                    outline-offset: 2px;
                }

                .mount-fade {
                    animation: landing-rise 0.45s ease-out both;
                }

                @keyframes landing-rise {
                    from {
                        opacity: 0;
                        transform: translateY(8px);
                    }
                    to {
                        opacity: 1;
                        transform: none;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .mount-fade {
                        animation: none;
                    }
                }
            </style>
        `;

        const featured = FEATURED_URL_HINTS.map((hint) =>
            exampleStreams.find((s) => s.url.includes(hint))
        ).filter(Boolean);

        const latest =
            history.find(
                (s) => s && typeof s.url === 'string' && s.url.length > 0
            ) ?? null;
        const earlier = history.filter((s) => s && s !== latest).slice(0, 5);

        const template = html`
            ${styles}

            <div class="shell-root landing-root overflow-x-hidden">
                <div
                    class="mx-auto w-full max-w-6xl px-5 sm:px-8 pb-10 pt-4 sm:pt-6 mount-fade"
                >
                    <!-- Status bar -->
                    <div class="flex justify-between items-center py-2">
                        <div class="flex items-center gap-2.5">
                            <div
                                class="w-7 h-7 bg-emerald-400"
                                style="mask-image: url(/icon.png); mask-size: contain; mask-position: center; mask-repeat: no-repeat; -webkit-mask-image: url(/icon.png); -webkit-mask-size: contain; -webkit-mask-position: center; -webkit-mask-repeat: no-repeat;"
                            ></div>
                            <span
                                class="font-bold text-lg text-slate-100 tracking-tight"
                                >Stream Analyzer</span
                            >
                            <span
                                class="mono hidden sm:inline text-[11px] text-slate-500"
                                >ott debugger</span
                            >
                        </div>

                        <div class="flex gap-2">
                            <button
                                @click=${() => {
                                    openModalWithContent({
                                        title: '',
                                        url: '',
                                        content: {
                                            type: 'about',
                                            data: {},
                                        },
                                    });
                                }}
                                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs font-semibold text-slate-200 hover:border-white/25 hover:bg-white/10 transition-colors"
                            >
                                ${icons.info} About
                            </button>
                            <a
                                href="https://github.com/herruzo99/stream-analyzer"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs font-semibold text-slate-200 hover:border-white/25 hover:bg-white/10 transition-colors"
                            >
                                ${icons.github} GitHub
                            </a>
                        </div>
                    </div>

                    <!-- Masthead -->
                    <div class="mt-7 mb-6 max-w-2xl">
                        <p class="mono text-xs text-emerald-300">
                            $ inspect ./manifest.mpd
                        </p>
                        <h1 class="console-title mt-2">
                            Check a stream before it ships.
                        </h1>
                        <p
                            class="mt-3 text-slate-400 text-[15px] leading-relaxed"
                        >
                            Paste a DASH or HLS manifest. The analyzer parses it
                            locally and shows the ladder, compliance, and
                            segments.
                        </p>
                    </div>

                    <!-- Deck -->
                    <div class="grid gap-4 lg:grid-cols-12">
                        <!-- Input panel -->
                        <section
                            class="panel p-5 lg:col-span-7"
                            aria-label="Analyze a stream"
                        >
                            <div
                                class="flex items-baseline justify-between mb-3"
                            >
                                <h2
                                    class="text-sm font-semibold text-slate-200"
                                >
                                    Manifest URL
                                </h2>
                                <span class="mono text-[11px] text-slate-500"
                                    >https .mpd or .m3u8</span
                                >
                            </div>

                            <smart-input-component
                                variant="hero"
                            ></smart-input-component>

                            <div class="mt-4">
                                <p class="text-xs text-slate-500 mb-2">
                                    No URL handy? Try one of these:
                                </p>
                                <div class="flex flex-col gap-2">
                                    ${featured.map(
                                        (ex) => html`
                                            <button
                                                @click=${() =>
                                                    this._loadStream(ex)}
                                                class="group flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05] transition-colors text-left"
                                            >
                                                <span
                                                    class="${protocolBadge(
                                                        exampleLabel(ex)
                                                    )}"
                                                    >${exampleLabel(ex)}</span
                                                >
                                                <span class="min-w-0 grow">
                                                    <span
                                                        class="block text-sm font-semibold text-slate-200 truncate"
                                                        >${ex.name}</span
                                                    >
                                                    <span
                                                        class="mono block text-[11px] text-slate-500 truncate"
                                                        >${safeHostname(ex.url)}
                                                        · ${ex.type}</span
                                                    >
                                                </span>
                                                <span
                                                    class="shrink-0 text-xs font-bold text-emerald-300 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
                                                    >Analyze</span
                                                >
                                            </button>
                                        `
                                    )}
                                </div>
                            </div>
                        </section>

                        <!-- Session panel -->
                        <section
                            class="panel p-5 lg:col-span-5"
                            aria-label="Previous session"
                        >
                            ${latest
                                ? html`
                                      <h2
                                          class="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-3"
                                      >
                                          ${icons.history} Last session
                                      </h2>

                                      <div
                                          class="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 mb-3"
                                      >
                                          <div class="flex items-center gap-2">
                                              <span
                                                  class="${protocolBadge(
                                                      detectProtocol(latest.url)
                                                  )}"
                                                  >${detectProtocol(
                                                      latest.url
                                                  )}</span
                                              >
                                              <span
                                                  class="text-sm font-semibold text-slate-100 truncate"
                                                  >${latest.name ||
                                                  safeHostname(
                                                      latest.url
                                                  )}</span
                                              >
                                          </div>
                                          <p
                                              class="mono text-[11px] text-slate-500 truncate mt-1"
                                          >
                                              ${safeHostname(latest.url)}
                                          </p>
                                      </div>

                                      <div class="flex gap-2">
                                          <button
                                              @click=${() =>
                                                  this._continueLatest(true)}
                                              class="grow flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-400 text-slate-950 text-sm font-bold hover:bg-emerald-300 active:scale-[0.99] transition-colors"
                                          >
                                              ${icons.play} Analyze latest
                                          </button>
                                          <button
                                              @click=${() =>
                                                  this._continueLatest(false)}
                                              title="Load into staging without analyzing"
                                              class="px-4 py-2.5 rounded-lg border border-white/10 text-sm font-semibold text-slate-300 hover:border-white/25 hover:bg-white/5 transition-colors"
                                          >
                                              Stage
                                          </button>
                                          <button
                                              @click=${(e) =>
                                                  this._pasteFromClipboard(e)}
                                              title="Paste a URL from the clipboard"
                                              class="px-3 py-2.5 rounded-lg border border-white/10 text-slate-400 hover:text-slate-100 hover:border-white/25 transition-colors"
                                          >
                                              ${icons.clipboardCopy}
                                          </button>
                                      </div>

                                      ${earlier.length > 0
                                          ? html`
                                                <div
                                                    class="mt-4 pt-4 border-t border-white/5"
                                                >
                                                    <p
                                                        class="text-xs text-slate-500 mb-2"
                                                    >
                                                        Earlier
                                                    </p>
                                                    <div
                                                        class="flex flex-col gap-1"
                                                    >
                                                        ${earlier.map(
                                                            (s) => html`
                                                                <button
                                                                    @click=${() =>
                                                                        this._loadStream(
                                                                            s
                                                                        )}
                                                                    class="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors text-left"
                                                                >
                                                                    <span
                                                                        class="${protocolBadge(
                                                                            detectProtocol(
                                                                                s.url
                                                                            )
                                                                        )}"
                                                                        >${detectProtocol(
                                                                            s.url
                                                                        )}</span
                                                                    >
                                                                    <span
                                                                        class="min-w-0 grow text-[13px] font-medium text-slate-300 truncate"
                                                                        >${s.name ||
                                                                        safeHostname(
                                                                            s.url
                                                                        )}</span
                                                                    >
                                                                    <span
                                                                        class="mono shrink-0 text-[10px] text-slate-600 truncate max-w-[120px]"
                                                                        >${safeHostname(
                                                                            s.url
                                                                        )}</span
                                                                    >
                                                                </button>
                                                            `
                                                        )}
                                                    </div>
                                                </div>
                                            `
                                          : ''}
                                  `
                                : html`
                                      <h2
                                          class="text-sm font-semibold text-slate-200 mb-1"
                                      >
                                          No sessions yet
                                      </h2>
                                      <p
                                          class="text-[13px] text-slate-500 mb-4"
                                      >
                                          Paste a manifest to get a full
                                          readout:
                                      </p>
                                      <ul class="flex flex-col gap-2.5 mb-5">
                                          ${[
                                              'ABR ladder with every track listed',
                                              'Compliance checks for DASH-IF and HLS',
                                              'Segment and bitstream inspection',
                                          ].map(
                                              (point) => html`
                                                  <li
                                                      class="flex items-baseline gap-2.5 text-[13px] text-slate-300"
                                                  >
                                                      <span
                                                          aria-hidden="true"
                                                          class="mono text-slate-600"
                                                          >&gt;</span
                                                      >
                                                      ${point}
                                                  </li>
                                              `
                                          )}
                                      </ul>
                                      <button
                                          @click=${() =>
                                              this._openLibrary('examples')}
                                          class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-sm font-semibold text-slate-200 hover:border-white/25 hover:bg-white/5 transition-colors"
                                      >
                                          ${icons.library} Browse the example
                                          library
                                      </button>
                                  `}
                        </section>

                        ${stagedCount > 0
                            ? html`
                                  <button
                                      @click=${() => this._backToQueue()}
                                      class="lg:col-span-12 flex items-center gap-3 px-4 py-3 rounded-lg border border-emerald-400/25 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors text-left"
                                  >
                                      <span
                                          class="mono text-[11px] font-bold text-emerald-300 shrink-0"
                                          >queue (${stagedCount})</span
                                      >
                                      <span
                                          class="min-w-0 grow truncate text-[13px] text-slate-300"
                                          >${stagedNames}</span
                                      >
                                      <span
                                          class="shrink-0 mono text-[11px] text-emerald-300"
                                          >back to queue</span
                                      >
                                  </button>
                              `
                            : ''}
                        <!-- Library line -->
                        <nav
                            class="lg:col-span-12 mono text-[11px] text-slate-500 flex flex-wrap items-center gap-x-1.5 gap-y-1"
                            aria-label="Library"
                        >
                            <span class="text-slate-600">library —</span>
                            ${[
                                {
                                    tab: 'workspaces',
                                    label: 'workspaces',
                                    count: workspaces.length,
                                },
                                {
                                    tab: 'presets',
                                    label: 'presets',
                                    count: presets.length,
                                },
                                {
                                    tab: 'history',
                                    label: 'history',
                                    count: history.length,
                                },
                                {
                                    tab: 'examples',
                                    label: 'examples',
                                    count: exampleStreams.length,
                                },
                            ].map(
                                (cell, i) =>
                                    html`${i > 0
                                            ? html`<span class="text-slate-700"
                                                  >·</span
                                              >`
                                            : ''}<button
                                            @click=${() =>
                                                this._openLibrary(cell.tab)}
                                            class="hover:text-emerald-300 transition-colors"
                                        >
                                            ${cell.label} (${cell.count})
                                        </button>`
                            )}
                        </nav>
                    </div>

                    <p class="mono mt-6 text-[11px] text-slate-600">
                        Parses locally in your browser. Nothing uploads.
                    </p>
                </div>
            </div>
        `;

        render(template, this);
    }

    _openLibrary(tab) {
        uiActions.loadWorkspaces();
        uiActions.loadPresets();
        uiActions.loadHistory();
        uiActions.setStreamLibraryTab(tab);
        uiActions.setLibraryModalOpen(true);
    }

    _backToQueue() {
        inputView.showStaging();
    }

    _loadStream(stream) {
        if (!stream || typeof stream.url !== 'string') {
            showToast({
                message: 'That entry has no URL to analyze.',
                type: 'fail',
            });
            return;
        }
        const url = stream.url.trim();
        try {
            new URL(url);
        } catch {
            showToast({
                message:
                    'That URL did not parse. Paste a full https manifest URL instead.',
                type: 'fail',
            });
            return;
        }
        // New transport technologies route through their own pipelines
        // instead of the HTTP manifest flow.
        const route = routeExampleUrl(url);
        if (route.kind === 'srt') {
            eventBus.dispatch(EVENTS.UI.SRT_SESSION_REQUESTED, { url });
            showToast({
                message: `Connecting to the local SRT helper for ${url}`,
                type: 'info',
            });
            return;
        }
        if (route.kind === 'webrtc-pull' || route.kind === 'webrtc-push') {
            eventBus.dispatch(EVENTS.UI.SRT_SESSION_REQUESTED, { url });
            return;
        }

        analysisActions.setStreamInputs([{ ...stream, url }]);
        const { streamInputs } = useAnalysisStore.getState();
        eventBus.dispatch(EVENTS.UI.STREAM_ANALYSIS_REQUESTED, {
            inputs: streamInputs,
        });
    }

    _continueLatest(analyze = false) {
        const history = getLastUsedStreams() || [];
        const latest = history.find(
            (s) => s && typeof s.url === 'string' && s.url.length > 0
        );
        if (!latest) {
            showToast({
                message: 'No previous stream yet. Paste a manifest to start.',
                type: 'info',
            });
            return;
        }
        if (analyze) {
            this._loadStream(latest);
            return;
        }
        analysisActions.setStreamInputs([{ ...latest }]);
    }

    async _pasteFromClipboard(e) {
        e.stopPropagation();
        if (!navigator.clipboard?.readText) {
            showToast({
                message:
                    'The clipboard is unavailable here. Paste directly into the input.',
                type: 'warn',
            });
            return;
        }
        let text = '';
        try {
            text = ((await navigator.clipboard.readText()) || '').trim();
        } catch {
            showToast({
                message:
                    'Could not read the clipboard. Paste directly into the input.',
                type: 'warn',
            });
            return;
        }
        if (!text) {
            showToast({
                message: 'The clipboard is empty. Copy a manifest URL first.',
                type: 'info',
            });
            return;
        }
        let parsed;
        try {
            parsed = new URL(text);
        } catch {
            showToast({
                message:
                    'That clipboard text is not a URL. Copy a full https manifest URL.',
                type: 'fail',
            });
            return;
        }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            showToast({
                message:
                    'Only http and https URLs can be staged from the clipboard.',
                type: 'fail',
            });
            return;
        }
        analysisActions.addStreamInputFromPreset({ url: parsed.toString() });
        showToast({
            message: 'URL staged for review.',
            type: 'pass',
        });
    }
}

customElements.define('landing-view-component', LandingViewComponent);

export const landingViewTemplate = () =>
    html`<landing-view-component></landing-view-component>`;
