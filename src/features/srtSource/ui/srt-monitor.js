// SRT Monitor view: local-helper status, session list with live telemetry,
// SRT rule issues, and the upgrade/run-once prompts. Registered under the
// 'srt' route key. Pure lit-html rendering over the srtStore.
import { html, render } from 'lit-html';
import { eventBus } from '@/application/event-bus.js';
import { appLog } from '@/shared/utils/debug';
import {
    refreshSrtStatus,
    saveHelperToken,
    startSrtSession,
    stopSrtSession,
} from '@/features/srtSource/application/srtController.js';
import { srtStore } from '@/state/srtStore.js';
import { deriveSignals } from '@/features/srtSource/domain/telemetry.js';
import * as icons from '@/ui/icons';
import { EVENTS } from '@/types/events.js';

let container = null;
let unsub = null;
let tokenDraft = '';

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
    return html`
        <section
            class="rounded-lg border border-slate-700 bg-slate-800/60 p-4 space-y-3"
        >
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold flex items-center gap-2">
                    ${icons.network}
                    ${s.mode === 'push' ? 'Listener' : 'Caller'}
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
                    <dd class="font-mono">${s.segments}</dd>
                </div>
                <div>
                    <dt class="text-slate-500">rtt</dt>
                    <dd class="font-mono">${fmt(sig.avgRtt)} ms</dd>
                </div>
                <div>
                    <dt class="text-slate-500">recv rate</dt>
                    <dd class="font-mono">
                        ${fmt(
                            sig.lossRatio * 0 + (series.at(-1)?.mbpsRecv ?? 0)
                        )}
                        Mbps
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
            <div class="flex gap-2">
                <button
                    class="px-3 py-1 rounded bg-sky-700 hover:bg-sky-600 text-xs"
                    @click=${() =>
                        eventBus.dispatch(EVENTS.UI.STREAM_ANALYSIS_REQUESTED, {
                            inputs: [
                                {
                                    url: `http://127.0.0.1:7231/sessions/${id}/playlist.m3u8`,
                                    name: `SRT ${s.streamId ?? s.id}`,
                                    auth: { mode: 'none' },
                                    drmAuth: { mode: 'none' },
                                    srt: { sessionId: id, url: s.url },
                                },
                            ],
                        })}
                >
                    Analyze in workspace
                </button>
                <button
                    class="px-3 py-1 rounded bg-rose-800 hover:bg-rose-700 text-xs"
                    @click=${() => stopSrtSession(id)}
                >
                    Stop
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

function newSessionForm() {
    let draft = '';
    return html`
        <section class="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
            <h3 class="text-sm font-semibold mb-2">Start session</h3>
            <div class="flex gap-2">
                <input
                    class="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono"
                    placeholder="srt://host:port?streamid=live/abc&passphrase=…"
                    @input=${(e) => {
                        draft = e.target.value;
                    }}
                />
                <button
                    class="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-xs"
                    @click=${() => startSrtSession(draft.trim())}
                >
                    Connect
                </button>
            </div>
        </section>
    `;
}

function renderView() {
    if (!container) return;
    const state = srtStore.getState();
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
                ${helperCard(state)} ${newSessionForm()}
                ${Object.keys(state.sessions).map((id) =>
                    sessionCard(state, id)
                )}
                ${issuesCard(state)}
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
