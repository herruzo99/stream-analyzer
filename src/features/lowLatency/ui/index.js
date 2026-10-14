// Low-Latency view (protocol plan item 2): part-level analysis surface over
// the IR the HLS/DASH parsers already produce. Registered under the
// 'low-latency' route key.
import { html, render } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore.js';
import { analyzeLowLatency } from '@/features/lowLatency/domain/llAnalysis.js';
import * as icons from '@/ui/icons.js';

let container = null;
let unsub = null;
let selectedVariantByStream = new Map(); // streamId -> variant id

const SEVERITY_CLASS = {
    error: 'bg-red-600',
    warn: 'bg-amber-500',
    info: 'bg-slate-600',
};

function hlsVariants(stream) {
    const playlists = stream?.mediaPlaylists;
    if (!playlists) return [];
    return [...playlists.entries()].map(([id, ir]) => ({
        id,
        ir: ir?.manifest ?? ir,
    }));
}

function hlsPrettyVariant(id) {
    if (!id) return 'variant';
    const m = /(\d+)x(\d+)/.exec(String(id));
    if (m) return `${m[1]}×${m[2]}`;
    const bw = /(\d{3,7})/.exec(String(id));
    return bw ? `${Math.round(Number(bw[1]) / 1000)} kbps` : String(id);
}

function issueList(issues) {
    if (!issues?.length) return html``;
    return html`
        <ul class="space-y-1">
            ${issues.map(
                (i) => html`
                    <li class="flex gap-2 text-xs">
                        <span
                            class="px-1.5 rounded ${SEVERITY_CLASS[
                                i.severity
                            ] ?? 'bg-slate-600'} text-white shrink-0"
                            >${i.severity}</span
                        >
                        <span class="text-slate-300">${i.message}</span>
                    </li>
                `
            )}
        </ul>
    `;
}

function hlsPanel(stream) {
    const variants = hlsVariants(stream);
    if (variants.length === 0) return html``;
    const selected =
        selectedVariantByStream.get(stream.id) ?? variants[0]?.id ?? null;
    const active = variants.find((v) => v.id === selected) ?? variants[0];
    const analysis = analyzeLowLatency({ type: 'hls', manifest: active.ir });

    if (!analysis.isLowLatency) {
        return html`
            <section
                class="rounded-lg border border-slate-700 bg-slate-800/60 p-4"
            >
                <h3 class="text-sm font-semibold mb-2">
                    ${hlsPrettyVariant(active.id)} — not low latency
                </h3>
                <p class="text-xs text-slate-500">
                    No EXT-X-PART / EXT-X-PART-INF / LL EXT-X-SERVER-CONTROL on
                    this variant: it plays as regular HLS (segment-granularity
                    switching only).
                </p>
            </section>
        `;
    }

    const tl = analysis.timeline;
    const acc = analysis.accounting;
    const sc = tl.serverControl;
    const rows = tl.segments.slice(-24).map((seg) => {
        const bars = seg.parts.map(
            (p) => html`
                <span
                    class="inline-block h-3 ${p.independent
                        ? 'bg-emerald-500'
                        : 'bg-sky-700'} rounded-sm"
                    style="width:${Math.max(
                        4,
                        Math.round((p.durationSec ?? 0.001) * 180)
                    )}px"
                    title="${p.uri} — ${p.durationSec ?? '?'}s ${p.independent
                        ? '(independent)'
                        : ''}"
                ></span>
            `
        );
        return html`
            <tr class="border-t border-slate-700">
                <td class="py-1 pr-3 text-xs font-mono text-slate-400">
                    ${seg.index}
                </td>
                <td class="py-1 pr-3 text-xs font-mono text-slate-400">
                    ${seg.durationSec ?? '—'}s
                </td>
                <td class="py-1">
                    <div class="flex items-end gap-0.5">${bars}</div>
                </td>
                <td class="py-1 pl-3 text-xs font-mono text-slate-400">
                    ${seg.partCount}
                </td>
            </tr>
        `;
    });

    return html`
        <section
            class="rounded-lg border border-slate-700 bg-slate-800/60 p-4 space-y-4"
        >
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold">
                    ${hlsPrettyVariant(active.id)} — LL-HLS
                    <span class="text-emerald-400 text-xs font-normal ml-2"
                        >${acc.partTargetMs ?? acc.defaultPartTargetMs} ms
                        PART-TARGET</span
                    >
                </h3>
                ${variants.length > 1
                    ? html`<select
                          class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                          @change=${(e) => {
                              selectedVariantByStream.set(
                                  stream.id,
                                  e.target.value
                              );
                              renderView();
                          }}
                      >
                          ${variants.map(
                              (v) => html`
                                  <option
                                      value="${v.id}"
                                      ?selected=${v.id === active.id}
                                  >
                                      ${hlsPrettyVariant(v.id)}
                                  </option>
                              `
                          )}
                      </select>`
                    : html``}
            </div>

            <div class="grid grid-cols-3 gap-4 text-xs">
                <div>
                    <p class="text-slate-500">Server control</p>
                    <p class="font-mono">
                        block-reload: ${sc.canBlockReload ? 'yes' : 'no'} ·
                        skip-until: ${sc.canSkipUntil ?? '—'}s · part-hold-back:
                        ${sc.partHoldBack ?? '—'}s
                    </p>
                </div>
                <div>
                    <p class="text-slate-500">Playlist bounds</p>
                    <p class="font-mono">
                        ${tl.totals.parts} parts over ${tl.totals.segments}
                        segments (${acc.avgPartsPerSegment}/seg) · min bound
                        ${acc.playlistMinBoundSec ?? '—'}s
                    </p>
                </div>
                <div>
                    <p class="text-slate-500">Preload hints</p>
                    <p class="font-mono">${tl.preloadHints.length}</p>
                </div>
            </div>

            <div>
                <p class="text-xs text-slate-500 mb-1">
                    Part timeline (newest last; green = INDEPENDENT=YES)
                </p>
                <table class="w-full">
                    <thead class="text-xs text-slate-500 text-left">
                        <tr>
                            <th>#</th>
                            <th>EXTINF</th>
                            <th>parts</th>
                            <th>n</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>

            <div>
                <p class="text-xs text-slate-500 mb-1">Checks</p>
                ${issueList(analysis.issues)}
                ${analysis.issues.length === 0
                    ? html`<p class="text-xs text-emerald-400">
                          All playlist-level LL checks pass.
                      </p>`
                    : html``}
            </div>
            <p class="text-xs text-slate-600">${acc.note}</p>
        </section>
    `;
}

function dashPanel(stream) {
    const periods = stream?.manifest?.periods ?? [];
    const analysis = analyzeLowLatency({ type: 'dash', periods });
    if (!analysis.isLowLatency) {
        return html`
            <section
                class="rounded-lg border border-slate-700 bg-slate-800/60 p-4"
            >
                <h3 class="text-sm font-semibold mb-2">
                    DASH — not low latency
                </h3>
                <p class="text-xs text-slate-500">
                    No ServiceDescription/Latency found: regular DASH delivery
                    profile.
                </p>
            </section>
        `;
    }
    const rows = analysis.view.targets.map(
        (t) => html`
            <tr class="border-t border-slate-700 text-xs">
                <td class="py-1 pr-3 font-mono text-slate-400">
                    ${t.periodId ?? '—'}
                </td>
                <td class="py-1 pr-3 text-slate-300 break-all">
                    ${t.scope.join(', ') || '—'}
                </td>
                <td class="py-1 pr-3 font-mono">${t.minMs ?? '—'}</td>
                <td class="py-1 pr-3 font-mono text-emerald-300">
                    ${t.targetMs ?? '—'}
                </td>
                <td class="py-1 pr-3 font-mono">${t.maxMs ?? '—'}</td>
                <td class="py-1 font-mono text-slate-400">
                    ${t.referenceId ?? '—'}
                </td>
            </tr>
        `
    );
    return html`
        <section
            class="rounded-lg border border-slate-700 bg-slate-800/60 p-4 space-y-3"
        >
            <h3 class="text-sm font-semibold">DASH — LL latency targets</h3>
            <table class="w-full text-left">
                <thead class="text-xs text-slate-500">
                    <tr>
                        <th>period</th>
                        <th>scope</th>
                        <th>min (ms)</th>
                        <th>target (ms)</th>
                        <th>max (ms)</th>
                        <th>ref</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            ${analysis.view.playbackRates.length > 0
                ? html`<p class="text-xs text-slate-400">
                      Playback rates:
                      ${analysis.view.playbackRates
                          .map((r) => `${r.min}–${r.max}`)
                          .join(', ')}
                  </p>`
                : html``}
            <div>
                <p class="text-xs text-slate-500 mb-1">Checks</p>
                ${issueList(analysis.issues)}
            </div>
        </section>
    `;
}

function renderView() {
    if (!container) return;
    const { streams } = useAnalysisStore.getState();
    render(
        html`
            <div class="p-6 space-y-4 max-w-5xl">
                <header>
                    <h1 class="text-lg font-semibold flex items-center gap-2">
                        ${icons.activity} Low-Latency Analysis
                    </h1>
                    <p class="text-xs text-slate-500 mt-1">
                        Part-level HLS (EXT-X-PART / EXT-X-PART-INF) and
                        ServiceDescription latency analysis for DASH —
                        playlist-declared bounds and LL conformance.
                    </p>
                </header>
                ${streams.length === 0
                    ? html`<p class="text-sm text-slate-400">
                          Analyze a stream first; this view shows its
                          low-latency structure.
                      </p>`
                    : streams.map(
                          (stream) => html`
                              <section class="space-y-3">
                                  <h2
                                      class="text-sm font-semibold text-slate-200"
                                  >
                                      ${stream.name ?? stream.id}
                                  </h2>
                                  ${stream.mediaPlaylists?.size
                                      ? hlsPanel(stream)
                                      : html``}
                                  ${stream.manifest?.periods?.length
                                      ? dashPanel(stream)
                                      : html``}
                              </section>
                          `
                      )}
            </div>
        `,
        container
    );
}

export const lowLatencyView = {
    mount(containerElement) {
        container = containerElement;
        if (unsub) unsub();
        unsub = useAnalysisStore.subscribe(renderView);
        renderView();
    },
    unmount() {
        if (unsub) unsub();
        unsub = null;
        selectedVariantByStream = new Map();
        if (container) render(html``, container);
        container = null;
    },
};
