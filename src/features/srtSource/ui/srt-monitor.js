// SRT Monitor view: local-helper status, session list with live telemetry,
// SRT rule issues, and the upgrade/run-once prompts. Registered under the
// 'srt' route key. Pure lit-html rendering over the srtStore.
import { html, render } from 'lit-html';
import { eventBus } from '@/application/event-bus.js';
import { showToast } from '@/ui/components/toast.js';
import { appLog } from '@/shared/utils/debug';
import {
    refreshSrtStatus,
    saveHelperToken,
    startSrtSession,
    stopAnySession,
} from '@/features/srtSource/application/srtController.js';
import {
    chunkUrl,
    getHelperToken,
    playlistUrl,
} from '@/infrastructure/helper/bridgeClient.js';
import {
    helperMetricsUrl,
    loadHandshakes,
    startWebTransportSession,
    startWebrtcSession,
    startWhipSession,
} from '@/features/srtSource/application/srtController.js';
import { analyzeTsChunk } from '@/features/srtSource/domain/tsAnalytics.js';
import { analyzeAvSync } from '@/features/srtSource/domain/avSync.js';
import {
    extractAdtsFrames,
    measureLoudnessFromTs,
} from '@/features/srtSource/domain/adts.js';
import {
    adviseLinkConfig,
    adviceToQuery,
} from '@/features/srtSource/domain/advisor.js';
import {
    latencyBudget,
    srtFixedLatency,
} from '@/features/srtSource/domain/latencyBudget.js';
import { compareTwo } from '@/features/srtSource/domain/failover.js';
import {
    buildSessionReport,
    reportToMarkdown,
} from '@/features/srtSource/domain/report.js';
import {
    downloadText,
    toCsv,
    toSummary,
} from '@/features/srtSource/application/srtExport.js';
import { srtStore } from '@/state/srtStore.js';
import { deriveSignals } from '@/features/srtSource/domain/telemetry.js';
import * as icons from '@/ui/icons';
import { EVENTS } from '@/types/events.js';

let container = null;
let unsub = null;
let tokenDraft = '';
/** @type {Record<string, any>} session id -> last stream-contents summary */
const contentsCache = {};

const STATE_COLORS = {
    'helper-missing': 'bg-red-600',
    outdated: 'bg-red-600',
    'update-available': 'bg-amber-500',
    'protocol-mismatch': 'bg-red-600',
    'app-stale': 'bg-amber-500',
    current: 'bg-emerald-600',
    ahead: 'bg-slate-500',
    'dev-build': 'bg-slate-500',
};

const STATUS_COLORS = {
    connected: 'bg-emerald-600',
    listening: 'bg-blue-600',
    connecting: 'bg-amber-500',
    stopped: 'bg-slate-500',
    stopping: 'bg-amber-500',
    error: 'bg-red-600',
};

const fmt = (v, digits = 1) =>
    Number.isFinite(Number(v)) ? Number(v).toFixed(digits) : '—';

function sparkline(samples, pick, width = 260, height = 44) {
    if (!samples?.length)
        return html`<div class="text-slate-500 text-xs">no samples yet</div>`;
    const pts = samples.slice(-120).map((s, i, arr) => {
        const v = Number(pick(s) ?? 0);
        const x = (i / Math.max(1, arr.length - 1)) * width;
        const max = Math.max(1, ...arr.map((a) => Number(pick(a) ?? 0)));
        const y = height - (v / max) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return html`<svg
        width="${width}"
        height="${height}"
        class="bg-slate-900 rounded"
    >
        <polyline
            points="${pts.join(' ')}"
            fill="none"
            stroke="#38bdf8"
            stroke-width="1.5"
        />
    </svg>`;
}

function helperCard(state) {
    const { helper, compatibility, probing } = state;
    const badge = STATE_COLORS[compatibility?.state] ?? 'bg-slate-500';
    const platform = helper?.version?.platform ?? compatibility?.state ?? '—';

    const tokenRow = html`
        <div class="flex gap-2 items-center mt-2">
            <input
                class="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono"
                placeholder="helper token (shown once at helper start)"
                .value=${tokenDraft}
                @input=${(e) => {
                    tokenDraft = e.target.value;
                }}
            />
            <button
                class="px-3 py-1 rounded bg-sky-700 hover:bg-sky-600 text-xs"
                @click=${() => saveHelperToken(tokenDraft.trim())}
            >
                Save
            </button>
        </div>
    `;

    const updateRow = compatibility?.update
        ? html`
              <div class="mt-3 flex items-center gap-3">
                  <a
                      class="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-xs"
                      href="${compatibility.update.url}"
                      >Download helper ${compatibility.update.version}</a
                  >
                  <span class="text-xs font-mono text-slate-400"
                      >sha256 ${compatibility.update.sha256.slice(0, 16)}…</span
                  >
              </div>
          `
        : html``;

    return html`
        <section class="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
            <div class="flex items-center justify-between">
                <h2 class="text-sm font-semibold flex items-center gap-2">
                    ${icons.radio} Local SRT helper
                </h2>
                <span class="text-xs px-2 py-0.5 rounded ${badge} text-white"
                    >${compatibility?.state ?? 'unknown'}</span
                >
            </div>
            <p class="text-xs text-slate-400 mt-1">
                ${compatibility?.reason ?? 'Probing localhost…'}
                ${probing ? '(checking)' : ''}
            </p>
            <dl class="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div>
                    <dt class="text-slate-500">helper</dt>
                    <dd class="font-mono">
                        ${helper.version?.version ?? 'not detected'}
                    </dd>
                </div>
                <div>
                    <dt class="text-slate-500">platform</dt>
                    <dd class="font-mono">${platform}</dd>
                </div>
            </dl>
            ${updateRow}
            ${helper.reachable && !helper.authorized ? tokenRow : html``}
            ${helper.reachable
                ? html`<p class="text-xs text-slate-500 mt-2">
                      Prometheus scrape target:
                      <a
                          class="underline"
                          href="${helperMetricsUrl()}"
                          target="_blank"
                          rel="noopener"
                          >/metrics</a
                      >
                  </p>`
                : html``}
            ${!helper.reachable
                ? html`<p class="text-xs text-amber-300 mt-2">
                      No helper on localhost: download and run
                      <code class="font-mono">stream-analyzer-helper</code> once
                      from <a class="underline" href="/helper/">/helper/</a> —
                      then reopen this panel.
                  </p>`
                : html``}
        </section>
    `;
}

function sessionCard(state, id) {
    const s = state.sessions[id];
    if (!s) return html``;
    const series = state.telemetry[id] ?? [];
    const sig = deriveSignals(series);
    const badge = STATUS_COLORS[s.status] ?? 'bg-slate-500';
    // SRT sessions are helper-backed (segments, façade, TS analysis);
    // WebRTC/WebTransport sessions exist only in this browser.
    const isNative =
        s.mode === 'webrtc' || s.mode === 'webtransport' || s.mode === 'whip';
    const title = isNative
        ? s.mode === 'webrtc'
            ? 'WebRTC (WHEP)'
            : s.mode === 'whip'
              ? 'WebRTC (WHIP publish)'
              : 'WebTransport'
        : s.mode === 'push'
          ? 'Listener'
          : 'Caller';
    const srtOnly = (tpl) => (isNative ? html`` : tpl);
    return html`
        <section
            class="rounded-lg border border-slate-700 bg-slate-800/60 p-4 space-y-3"
        >
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold flex items-center gap-2">
                    ${icons.network} ${title}
                </h3>
                <span class="text-xs px-2 py-0.5 rounded ${badge} text-white"
                    >${s.status}</span
                >
            </div>
            <p class="text-xs font-mono text-slate-400">${s.url}</p>
            <dl class="grid grid-cols-3 gap-2 text-xs">
                <div>
                    <dt class="text-slate-500">streamid</dt>
                    <dd class="font-mono">${s.streamId || '—'}</dd>
                </div>
                <div>
                    <dt class="text-slate-500">encrypted</dt>
                    <dd>${s.encrypted ? 'yes' : 'no'}</dd>
                </div>
                <div>
                    <dt class="text-slate-500">segments</dt>
                    <dd class="font-mono">
                        ${isNative ? '—' : (s.segments ?? '—')}
                    </dd>
                </div>
                <div>
                    <dt class="text-slate-500">rtt</dt>
                    <dd class="font-mono">${fmt(sig.avgRtt)} ms</dd>
                </div>
                <div>
                    <dt class="text-slate-500">recv rate</dt>
                    <dd class="font-mono">
                        ${fmt(series.at(-1)?.mbpsRecv ?? 0)} Mbps
                    </dd>
                </div>
                <div>
                    <dt class="text-slate-500">retrans</dt>
                    <dd class="font-mono">${fmt(sig.retransRatio, 2)} %</dd>
                </div>
            </dl>
            <div class="flex gap-3">
                <div>
                    <p class="text-xs text-slate-500 mb-1">RTT (ms)</p>
                    ${sparkline(series, (x) => x.rttMs)}
                </div>
                <div>
                    <p class="text-xs text-slate-500 mb-1">Recv (Mbps)</p>
                    ${sparkline(series, (x) => x.mbpsRecv)}
                </div>
            </div>
            <div class="text-xs text-slate-400" id="ts-contents-${id}">
                ${state.contents?.[id]
                    ? html`${state.contents[id].pids} PIDs · video
                      ${state.contents[id].video || '—'} · GOP
                      ${state.contents[id].gop ?? '—'} · CC errors
                      ${state.contents[id].ccErrors}`
                    : ''}
                ${state.contents?.[id]?.avOffsetMs != null
                    ? html`· A/V ${state.contents[id].avOffsetMs} ms
                      (${state.contents[id].avDirection})`
                    : ''}
                ${state.contents?.[id]?.loudness
                    ? html`<br /><span class="text-sky-300"
                              >loudness: ${state.contents[id].loudness}</span
                          >`
                    : ''}
            </div>
            <div class="flex flex-wrap gap-2">
                ${srtOnly(
                    html`<button
                        class="px-3 py-1 rounded bg-sky-700 hover:bg-sky-600 text-xs"
                        @click=${() =>
                            eventBus.dispatch(
                                EVENTS.UI.STREAM_ANALYSIS_REQUESTED,
                                {
                                    inputs: [
                                        {
                                            url: playlistUrl(id),
                                            name: `SRT ${s.streamId ?? s.id}`,
                                            auth: { mode: 'none' },
                                            drmAuth: { mode: 'none' },
                                            srt: { sessionId: id, url: s.url },
                                        },
                                    ],
                                }
                            )}
                    >
                        Analyze in workspace
                    </button>`
                )}
                <button
                    class="px-3 py-1 rounded bg-rose-800 hover:bg-rose-700 text-xs"
                    @click=${() => stopAnySession(id)}
                >
                    Stop
                </button>
                ${srtOnly(
                    html`<button
                        class="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs"
                        @click=${() => inspectContents(id)}
                    >
                        Inspect stream contents
                    </button>`
                )}
                ${srtOnly(
                    html`<button
                        class="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs"
                        @click=${() => measureLoudnessUI(id)}
                    >
                        Measure loudness
                    </button>`
                )}
                ${srtOnly(
                    html`<button
                        class="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs"
                        @click=${() => exportTelemetry(id)}
                    >
                        Export telemetry (CSV)
                    </button>`
                )}
                ${srtOnly(
                    html`<button
                        class="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs"
                        @click=${() => exportSummary(id)}
                    >
                        Export session summary
                    </button>`
                )}
                <button
                    class="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs"
                    @click=${() => sessionReport(id)}
                >
                    Export full report
                </button>
            </div>
        </section>
    `;
}

function issuesCard(state) {
    if (!state.issues.length) return html``;
    const rows = state.issues.map(
        (i) => html`
            <li class="flex gap-2 text-xs">
                <span
                    class="px-1.5 rounded ${i.severity === 'error'
                        ? 'bg-red-600'
                        : i.severity === 'warn'
                          ? 'bg-amber-500'
                          : 'bg-slate-600'} text-white"
                    >${i.severity}</span
                >
                <span class="text-slate-300">${i.message}</span>
            </li>
        `
    );
    return html`
        <section class="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
            <h3 class="text-sm font-semibold mb-2">SRT link issues</h3>
            <ul class="space-y-1">
                ${rows}
            </ul>
        </section>
    `;
}

let transportDraft = 'srt';

function newSessionForm() {
    let draft = '';
    return html`
        <section class="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
            <h3 class="text-sm font-semibold mb-2">Start session</h3>
            <div class="flex gap-2 items-center">
                <select
                    class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                    @change=${(e) => {
                        transportDraft = e.target.value;
                    }}
                >
                    <option value="srt">SRT (helper)</option>
                    <option value="webrtc">WebRTC (WHEP)</option>
                    <option value="webtransport">WebTransport</option>
                    <option value="whip">WebRTC WHIP (publish)</option>
                </select>
                <input
                    class="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono"
                    placeholder=${transportDraft === 'srt'
                        ? 'srt://host:port?streamid=live/abc&passphrase=…'
                        : transportDraft === 'webrtc'
                          ? 'http://host:8889/live/whep'
                          : transportDraft === 'whip'
                            ? 'http://host:8889/live/whip'
                            : 'https://host:4433/live'}
                    @input=${(e) => {
                        draft = e.target.value;
                    }}
                />
                <button
                    class="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-xs"
                    @click=${async () => {
                        const url = draft.trim();
                        let result;
                        try {
                            result =
                                transportDraft === 'srt'
                                    ? await startSrtSession(url)
                                    : transportDraft === 'webrtc'
                                      ? await startWebrtcSession(url)
                                      : transportDraft === 'whip'
                                        ? await startWhipSession(url)
                                        : await startWebTransportSession(url);
                        } catch (err) {
                            result = {
                                ok: false,
                                error: String(err?.message ?? err),
                            };
                        }
                        if (result && result.ok === false) {
                            showToast({
                                message: `Connect failed: ${result.error}`,
                                type: 'fail',
                            });
                        }
                    }}
                >
                    Connect
                </button>
            </div>
        </section>
    `;
}

/**
 * Measure EBU R128 loudness from the live façade: concatenates the last few
 * chunks (so there is enough audio for gated blocks), extracts ADTS frames
 * for the audio PIDs and decodes via WebAudio.
 */
async function measureLoudnessUI(id) {
    contentsCache[id] = {
        ...(contentsCache[id] ?? {}),
        loudness: 'measuring…',
    };
    renderView();
    try {
        const chunkIndex = latestChunkIndex(id);
        const buffers = [];
        for (let i = Math.max(0, chunkIndex - 2); i <= chunkIndex; i++) {
            const resp = await fetch(chunkUrl(id, i), {
                headers: getHelperToken()
                    ? { Authorization: `Bearer ${getHelperToken()}` }
                    : {},
            });
            if (resp.ok) buffers.push(new Uint8Array(await resp.arrayBuffer()));
        }
        if (buffers.length === 0) throw new Error('no chunks available');
        const merged = new Uint8Array(
            buffers.reduce((n, b) => n + b.length, 0)
        );
        let off = 0;
        for (const b of buffers) {
            merged.set(b, off);
            off += b.length;
        }
        const a = analyzeTsChunk(merged, { durationMs: 6000 });
        const audioPids = a.pidInventory
            .filter((p) => String(p.role).startsWith('audio'))
            .map((p) => p.pid);
        if (audioPids.length === 0) {
            contentsCache[id] = {
                ...(contentsCache[id] ?? {}),
                loudness: 'no audio PID found',
            };
            renderView();
            return;
        }
        const { frames } = extractAdtsFrames(merged, audioPids);
        if (frames.length === 0) {
            contentsCache[id] = {
                ...(contentsCache[id] ?? {}),
                loudness: 'no ADTS frames extracted',
            };
            renderView();
            return;
        }
        const result = await measureLoudnessFromTs(merged, audioPids);
        contentsCache[id] = {
            ...(contentsCache[id] ?? {}),
            loudness:
                result.integratedLufs == null
                    ? `no loudness (audio decode unavailable in this browser; ${frames.length} ADTS frames found)`
                    : `${result.integratedLufs} LUFS integrated · short-term max ${result.shortTermMaxLufs ?? '—'} · ${result.gatedBlocks} gated blocks`,
        };
    } catch (err) {
        contentsCache[id] = {
            ...(contentsCache[id] ?? {}),
            loudness: `failed: ${String(err?.message ?? err)}`,
        };
    }
    renderView();
}

async function inspectContents(id) {
    try {
        const resp = await fetch(chunkUrl(id, latestChunkIndex(id)), {
            headers: getHelperToken()
                ? { Authorization: `Bearer ${getHelperToken()}` }
                : {},
        });
        if (!resp.ok) throw new Error(`helper returned ${resp.status}`);
        const bytes = new Uint8Array(await resp.arrayBuffer());
        const a = analyzeTsChunk(bytes, { durationMs: 2000 });
        const video = a.pidInventory.find((p) =>
            String(p.role).startsWith('video')
        );
        const av = analyzeAvSync(a);
        contentsCache[id] = {
            pids: a.pidInventory.length,
            video: video ? `${video.mbps} Mbps` : '—',
            gop: a.gop.avgGopFrames ?? '—',
            ccErrors: a.ccErrorLedger.reduce((sum, c) => sum + c.errors, 0),
            avOffsetMs: av.offsetMs,
            avDirection: av.offsetDirection,
        };
    } catch (err) {
        contentsCache[id] = { error: String(err?.message ?? err) };
    }
    renderView();
}

function latestChunkIndex(id) {
    // Prefer the newest segment: ask the store's session summary; fallback 0.
    const session = srtStore.getState().sessions[id];
    return Math.max(0, (session?.segments ?? 1) - 1);
}

function exportTelemetry(id) {
    const series = srtStore.getState().telemetry[id] ?? [];
    downloadText(`srt-${id}-telemetry.csv`, toCsv(series), 'text/csv');
}

function exportSummary(id) {
    const state = srtStore.getState();
    const session = state.sessions[id] ?? {};
    const issues = (state.issues ?? []).filter((i) => i.sessionId === id);
    const doc = toSummary(session, state.telemetry[id] ?? [], issues);
    downloadText(
        `srt-${id}-summary.json`,
        JSON.stringify(doc, null, 2),
        'application/json'
    );
}

function alertsCard(state) {
    if (!state.alerts?.length) {
        return html`<section
            class="rounded-lg border border-slate-700 bg-slate-800/60 p-4"
        >
            <h3 class="text-sm font-semibold mb-2">Threshold alerts</h3>
            <p class="text-xs text-slate-500">
                None. Breaches fire once per excursion (defaults: RTT 80/250 ms,
                loss 1/5 %, retrans 5/15 %, min rate 1 Mbps).
            </p>
        </section>`;
    }
    const rows = state.alerts.slice(-40).map((a) => {
        const color =
            a.level === 'critical'
                ? 'bg-red-600'
                : a.level === 'warn'
                  ? 'bg-amber-500'
                  : 'bg-emerald-600';
        return html`<li class="flex gap-2 text-xs">
            <span class="px-1.5 rounded ${color} text-white">${a.level}</span>
            <span class="font-mono text-slate-500">${a.sessionId}</span>
            <span class="text-slate-300">${a.message}</span>
        </li>`;
    });
    return html`<section
        class="rounded-lg border border-slate-700 bg-slate-800/60 p-4"
    >
        <h3 class="text-sm font-semibold mb-2">Threshold alerts (recent)</h3>
        <ul class="space-y-1">
            ${rows.reverse()}
        </ul>
    </section>`;
}

function advisorCard(state, id) {
    const series = state.telemetry[id] ?? [];
    const session = state.sessions[id] ?? null;
    if (!series.length) return html``;
    const advice = adviseLinkConfig(series);
    const latest = series[series.length - 1];
    const budget = latencyBudget({
        rttMs: latest.rttMs,
        tsbpdMs: latest.msRcvTsbpd,
    });
    return html`
        <section
            class="rounded-lg border border-slate-700 bg-slate-800/60 p-4 space-y-3"
        >
            <h3 class="text-sm font-semibold">Link advisor & latency budget</h3>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-xs text-slate-500 mb-1">
                        Recommended SRT options
                    </p>
                    <div class="flex gap-2 items-center">
                        <code
                            class="text-xs font-mono text-emerald-300 bg-slate-900 rounded px-2 py-1"
                            >?${adviceToQuery(advice)}</code
                        >
                        <button
                            class="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs"
                            @click=${() =>
                                navigator.clipboard?.writeText(
                                    '?' + adviceToQuery(advice)
                                )}
                        >
                            Copy
                        </button>
                    </div>
                    <ul class="mt-2 space-y-1">
                        ${advice.rationale.map(
                            (r) =>
                                html`<li class="text-xs text-slate-400">
                                    ${r}
                                </li>`
                        )}
                    </ul>
                </div>
                <div>
                    <p class="text-xs text-slate-500 mb-1">Latency budget</p>
                    <table class="text-xs w-full">
                        ${budget.stages.map(
                            (stage) =>
                                html`<tr>
                                    <td class="text-slate-400 pr-2">
                                        ${stage.label}
                                    </td>
                                    <td class="font-mono text-right">
                                        ${stage.ms == null
                                            ? html`<span class="text-slate-600"
                                                  >unknown</span
                                              >`
                                            : `${stage.ms} ms`}
                                    </td>
                                </tr>`
                        )}
                    </table>
                    <p
                        class="text-xs mt-1 ${budget.unknown
                            ? 'text-slate-500'
                            : 'text-emerald-300'}"
                    >
                        ${budget.unknown
                            ? `Total unknown (${budget.unknown} stage(s) without data)`
                            : `Fixed SRT component: ${srtFixedLatency(latest.rttMs, latest.msRcvTsbpd)} ms · total budget ${budget.totalMs} ms`}
                    </p>
                    ${session?.mode
                        ? html`<p class="text-xs text-slate-500 mt-1">
                              ${session.mode} session
                          </p>`
                        : html``}
                </div>
            </div>
        </section>
    `;
}

const handshakeCache = {};

async function loadHandshakePanel(id) {
    const { handshakes } = await loadHandshakes(id);
    handshakeCache[id] = handshakes ?? [];
    renderView();
}

function handshakeCard(state, id) {
    const events = handshakeCache[id];
    if (!events) {
        return html`<section
            class="rounded-lg border border-slate-700 bg-slate-800/60 p-4"
        >
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold">Handshake ledger</h3>
                <button
                    class="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs"
                    @click=${() => loadHandshakePanel(id)}
                >
                    Load
                </button>
            </div>
        </section>`;
    }
    const rows = events.map(
        (ev) =>
            html`<li class="flex gap-2 text-xs font-mono">
                <span class="text-slate-500"
                    >${new Date(ev.t).toLocaleTimeString()}</span
                >
                <span
                    class="px-1.5 rounded ${ev.kind === 'connected'
                        ? 'bg-emerald-600'
                        : 'bg-rose-700'} text-white"
                    >${ev.kind}</span
                >
                <span class="text-slate-300">${ev.streamId ?? '—'}</span>
                <span class="text-slate-500">hs v${ev.hsVersion ?? '?'}</span>
                <span class="text-slate-500"
                    >${ev.encrypted ? 'encrypted' : 'plain'}</span
                >
                ${ev.rejectionName
                    ? html`<span class="text-rose-300"
                          >${ev.rejectionName}</span
                      >`
                    : html``}
                <span class="text-slate-500">${ev.note ?? ''}</span>
            </li>`
    );
    return html`<section
        class="rounded-lg border border-slate-700 bg-slate-800/60 p-4"
    >
        <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold">Handshake ledger</h3>
            <button
                class="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs"
                @click=${() => loadHandshakePanel(id)}
            >
                Refresh
            </button>
        </div>
        <ul class="space-y-1">
            ${rows.length
                ? rows
                : html`<li class="text-xs text-slate-500">no attempts yet</li>`}
        </ul>
    </section>`;
}

function failoverCard(state) {
    const ids = Object.keys(state.sessions).filter(
        (id) => (state.telemetry[id] ?? []).length > 1
    );
    if (ids.length < 2) {
        return html`<section
            class="rounded-lg border border-slate-700 bg-slate-800/60 p-4"
        >
            <h3 class="text-sm font-semibold mb-2">Failover comparison</h3>
            <p class="text-xs text-slate-500">
                Needs 2+ sessions with telemetry — start main and backup links
                to compare rate/RTT/loss deltas.
            </p>
        </section>`;
    }
    const seriesFor = (id) => ({
        id,
        start: Number(state.telemetry[id][0]?.t ?? 0),
        series: state.telemetry[id] ?? [],
    });
    const cmp = compareTwo(seriesFor(ids[0]), seriesFor(ids[1]));
    const rttA = cmp.rttDeltaMs;
    return html`<section
        class="rounded-lg border border-slate-700 bg-slate-800/60 p-4"
    >
        <h3 class="text-sm font-semibold mb-2">
            Failover comparison: ${ids[0]} vs ${ids[1]}
        </h3>
        <table class="text-xs w-full">
            <tr>
                <th></th>
                <th class="text-left font-mono">${ids[0]}</th>
                <th class="text-left font-mono">${ids[1]}</th>
            </tr>
            <tr>
                <td class="text-slate-400 pr-2">rate delta (Mbps)</td>
                <td class="font-mono">${cmp.rateDeltaMbps}</td>
                <td></td>
            </tr>
            <tr>
                <td class="text-slate-400 pr-2">rtt delta (ms)</td>
                <td class="font-mono">${rttA}</td>
                <td></td>
            </tr>
            <tr>
                <td class="text-slate-400 pr-2">loss delta (%)</td>
                <td class="font-mono">${cmp.lossDeltaPct}</td>
                <td></td>
            </tr>
            <tr>
                <td class="text-slate-400 pr-2">better</td>
                <td class="font-mono text-emerald-300">
                    ${cmp.betterRate ?? '—'}
                </td>
                <td class="font-mono text-emerald-300">
                    ${cmp.betterRtt ?? '—'}
                </td>
            </tr>
        </table>
        <p class="text-xs text-slate-500 mt-1">
            ${cmp.samples} aligned samples · A/V-aware picking: prefer lower
            loss first, then rate, then RTT.
        </p>
    </section>`;
}

function sessionReport(id) {
    const state = srtStore.getState();
    const session = state.sessions[id] ?? { id };
    const issues = (state.issues ?? []).filter((i) => i.sessionId === id);
    const report = buildSessionReport({
        transport:
            session.mode === 'webrtc'
                ? 'webrtc'
                : session.mode === 'webtransport'
                  ? 'webrtc'
                  : 'srt',
        session,
        series: state.telemetry[id] ?? [],
        issues,
    });
    downloadText(
        `srt-${id}-report.json`,
        JSON.stringify(report, null, 2),
        'application/json'
    );
    downloadText(
        `srt-${id}-report.md`,
        reportToMarkdown(report),
        'text/markdown'
    );
}

function renderView() {
    if (!container) return;
    const state = { ...srtStore.getState(), contents: contentsCache };
    render(
        html`
            <div class="p-6 space-y-4 max-w-5xl">
                <header class="flex items-center justify-between">
                    <h1 class="text-lg font-semibold flex items-center gap-2">
                        ${icons.radio} SRT Monitor
                    </h1>
                    <button
                        class="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs"
                        @click=${() => refreshSrtStatus()}
                    >
                        Re-probe
                    </button>
                </header>
                ${helperCard(state)} ${newSessionForm()} ${alertsCard(state)}
                ${Object.keys(state.sessions).map((id) =>
                    sessionCard(state, id)
                )}
                ${issuesCard(state)}
                ${state.focusedSessionId
                    ? advisorCard(state, state.focusedSessionId)
                    : html``}
                ${state.focusedSessionId
                    ? handshakeCard(state, state.focusedSessionId)
                    : html``}
                ${failoverCard(state)}
                <p class="text-xs text-slate-500">
                    SRT support: your helper owns the UDP sockets; this panel
                    shows normalized telemetry (RTT, loss, retransmissions,
                    drops, buffers) and the SRT rule family.
                </p>
            </div>
        `,
        container
    );
}

export const srtMonitorView = {
    mount(containerElement) {
        container = containerElement;
        if (unsub) unsub();
        unsub = srtStore.subscribe(renderView);
        refreshSrtStatus();
        renderView();
    },
    unmount() {
        if (unsub) unsub();
        unsub = null;
        if (container) render(html``, container);
        container = null;
    },
};

// Keep an appLog so the view is discoverable in debug traces.
appLog('srtMonitorView', 'info', 'SRT monitor view module loaded');
