/**
 * SmartBadgeService — manifest inspector badges + details.
 *
 * Reconstructed for the port: the trunk line only ever kept the badge
 * *rendering* inline in `smart-tokens.js` (pre-Heux implementation, used
 * here as the behavior reference). `renderBadge` ports that logic behind
 * the service signature; `getDetails` derives the structured
 * `{ label, tooltipHtml, parsedValue }` shape the inspector sidebar
 * renders (see `sidebar.js`: `tooltipHtml` is injected via `unsafeHTML`,
 * so it must be a plain HTML string).
 */
import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';
import {
    formatBytes,
    formatDurationPill,
    parseDuration,
} from '../ui/components/badges/utils.js';

/** Escape user-controlled text embedded in tooltip HTML strings. */
const escapeHtml = (value) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

// No native `title` here on purpose: every pill already feeds the custom
// Smart Analysis tooltip/panel, and a browser tooltip would double up.
const pill = (cls, text) => html`<span
    class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${cls} inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4"
    >${text}</span
>`;

const verdictTreePill = (verdict) => {
    if (!verdict) return null;
    if (verdict.kind === 'live') {
        return html`<span
            class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 inline-flex items-center gap-1 select-none whitespace-nowrap align-middle leading-none h-4"
            ><span class="relative flex h-1.5 w-1.5"
                ><span
                    class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
                ></span
                ><span
                    class="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"
                ></span></span
            >LIVE</span
        >`;
    }
    const cls =
        verdict.kind === 'future'
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            : 'bg-slate-700/60 text-slate-300 border border-slate-600';
    return pill(cls, verdict.label);
};

const prettyKey = (key) =>
    String(key)
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

const detailRow = (label, value) =>
    `<div style="display:flex;justify-content:space-between;gap:1rem;padding:2px 0;">` +
    `<span style="opacity:.65">${escapeHtml(label)}</span>` +
    `<span style="font-family:monospace">${escapeHtml(value)}</span></div>`;

/** Humanize a millisecond age for live-edge badges ("5s ago" style). */
const humanAge = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 48) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
};

/** Normalize an SPD value (seconds number, numeric string, or {total}). */
const spdSeconds = (spd) => {
    if (spd === null || spd === undefined) return 0;
    const raw = typeof spd === 'object' ? spd.total : spd;
    const num = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
    return Number.isFinite(num) && num > 0 ? num : 0;
};

const wallClock = (ms) => {
    try {
        return new Date(ms).toISOString().slice(11, 23);
    } catch {
        return '—';
    }
};

/**
 * Live-edge verdict for a segment span. The SPD offset is applied here,
 * from the raw wall clock (see the manifest ticker comment in
 * `interactiveManifest/ui/index.js`): edge = now - SPD when active.
 * Timeline ticks carrying the PTO base are wall-mapped as (t - pto);
 * anything else keeps raw ticks (matches the calculator's own
 * SegmentTimeline lookup convention).
 * @returns {number} the PTO offset to subtract, or 0.
 */
const effectivePto = (t, d, ptoTicks) => {
    const pto = Number(ptoTicks);
    if (!Number.isFinite(pto) || pto <= 0 || !Number.isFinite(t)) return 0;
    const tol = Number.isFinite(d) && d > 0 ? d : 0;
    return t >= pto - tol ? pto : 0;
};

/**
 * Repeat count for run-aware verdicts. rCount >= 0 extends the judged span
 * to the whole (r+1)-segment run; r=-1 (repeat to period end) and invalid
 * values fall back to the first segment (the run end is unknowable here).
 * @returns {{ kind: 'live'|'ago'|'future', label: string, title: string, startMs: number, endMs: number|null, segCount: number, segIndex: number|null, edgeMs: number, nowMs: number } | null}
 */
const liveVerdict = ({
    tTicks,
    dTicks,
    timescale,
    anchorTimeMs,
    nowMs,
    spd,
    isSpdActive,
    ptoTicks = 0,
    rCount = 0,
}) => {
    // Null clocks (VOD / unknown) must yield no verdict: Number(null)
    // is 0, which would otherwise fake a 1970 edge and label every span
    // decades stale or future.
    if (nowMs === null || nowMs === undefined) return null;
    if (anchorTimeMs === null || anchorTimeMs === undefined) return null;
    const ts = Number(timescale);
    const anchor = Number(anchorTimeMs);
    const now = Number(nowMs);
    if (!Number.isFinite(ts) || ts <= 0) return null;
    if (!Number.isFinite(anchor) || !Number.isFinite(now)) return null;
    const t =
        tTicks === null || tTicks === undefined || tTicks === ''
            ? 0
            : Number(tTicks);
    const d =
        dTicks === null || dTicks === undefined || dTicks === ''
            ? null
            : Number(dTicks);
    if (Number.isNaN(t)) return null;
    if (d !== null && (!Number.isFinite(d) || d < 0)) return null;
    const edge = now - (isSpdActive ? spdSeconds(spd) * 1000 : 0);
    const start = anchor + ((t - effectivePto(t, d, ptoTicks)) / ts) * 1000;
    const repeats = Number(rCount);
    const runSegs =
        d !== null && Number.isInteger(repeats) && repeats > 0
            ? repeats + 1
            : 1;
    const segMs = d === null ? null : (d / ts) * 1000;
    const end = segMs === null ? null : start + runSegs * segMs;
    const span = `${wallClock(start)}${end === null ? '' : ' → ' + wallClock(end)} UTC`;
    const runNote = runSegs > 1 ? `run of ${runSegs} segments ` : 'span ';
    const segIndex =
        end !== null && segMs > 0 && edge >= start && edge <= end
            ? Math.min(runSegs, Math.floor((edge - start) / segMs) + 1)
            : null;
    const base = { startMs: start, endMs: end, segCount: runSegs, segIndex, edgeMs: edge, nowMs: now };
    if (end !== null && edge >= start && edge <= end) {
        return {
            kind: 'live',
            label: 'LIVE',
            title:
                runSegs > 1
                    ? `Live edge inside run (segment ${segIndex} of ${runSegs}, ${span})`
                    : `Live edge inside span (${span})`,
            ...base,
        };
    }
    if (end !== null && edge > end) {
        return {
            kind: 'ago',
            label: `${humanAge(edge - end)} ago`,
            title: `${runSegs > 1 ? `Run of ${runSegs} segments ended` : 'Span ended'} ${span}; live edge ${humanAge(edge - end)} past its end`,
            ...base,
        };
    }
    if (start > edge) {
        return {
            kind: 'future',
            label: `in ${humanAge(start - edge)}`,
            title: `${runSegs > 1 ? `Run of ${runSegs} segments starts` : 'Span starts'} ${span}; available ${humanAge(start - edge)} after the edge`,
            ...base,
        };
    }
    return {
        kind: 'ago',
        label: `started ${humanAge(edge - start)} ago`,
        title: `${runNote}started ${span}`,
        ...base,
    };
};

/** Verdict dot colors for the details panel (inline styles survive unsafeHTML). */
const verdictDot = (kind) => {
    const color =
        kind === 'live' ? '#ef4444' : kind === 'future' ? '#f59e0b' : '#94a3b8';
    return `<span style="display:inline-block;width:7px;height:7px;border-radius:99px;background:${color};margin-right:6px"></span>`;
};

/** Hero verdict banner: the live/age status, prominent instead of tabular. */
const verdictHero = (verdict) => {
    if (!verdict) return '';
    const theme =
        verdict.kind === 'live'
            ? {
                  bg: 'rgba(239,68,68,.10)',
                  border: 'rgba(239,68,68,.35)',
                  fg: '#f87171',
                  label: 'LIVE',
              }
            : verdict.kind === 'future'
              ? {
                    bg: 'rgba(245,158,11,.10)',
                    border: 'rgba(245,158,11,.30)',
                    fg: '#fbbf24',
                    label: verdict.label,
                }
              : {
                    bg: 'rgba(148,163,184,.10)',
                    border: 'rgba(148,163,184,.25)',
                    fg: '#cbd5e1',
                    label: verdict.label,
                };
    const span =
        verdict.endMs === null
            ? wallClock(verdict.startMs)
            : `${wallClock(verdict.startMs)} → ${wallClock(verdict.endMs)}`;
    const segLine =
        verdict.kind === 'live' &&
        verdict.segCount > 1 &&
        verdict.segIndex
            ? `<div style="font-family:monospace;font-size:11px;opacity:.75">segment ${verdict.segIndex} of ${verdict.segCount}</div>`
            : '';
    return (
        `<div style="display:flex;align-items:center;gap:10px;margin:2px 0 10px;padding:9px 12px;border-radius:10px;` +
        `background:${theme.bg};border:1px solid ${theme.border}">` +
        `${verdictDot(verdict.kind)}<div>` +
        `<div style="font-weight:800;font-size:14px;letter-spacing:.04em;color:${theme.fg}">${escapeHtml(theme.label)}</div>` +
        `<div style="font-family:monospace;font-size:11px;opacity:.75" title="${escapeHtml(verdict.title)}">${escapeHtml(span)} UTC</div>` +
        segLine +
        `</div></div>`
    );
};

/** Worked-calculation panel: substituted formula with its result. */
const workedPanel = (workedText) => {
    if (!workedText) return '';
    return (
        `<div style="margin:2px 0 10px;padding:9px 12px;border-radius:10px;` +
        `background:rgba(2,6,23,.55);border:1px solid rgba(148,163,184,.14)">` +
        `<div style="font-size:9px;text-transform:uppercase;letter-spacing:.12em;opacity:.55;margin-bottom:6px">Worked calculation</div>` +
        `<div style="font-family:monospace;font-size:13px;color:#e2e8f0">${escapeHtml(workedText)}</div></div>`
    );
};

/**
 * Timeline-position strip: run span on a wall-clock bar with live-edge
 * and now markers, plus Start / End / Edge / Now rows and a status line.
 * All inline styles so it survives unsafeHTML injection; every value is
 * numeric and formatted here, titles escaped.
 */
const timelineStrip = ({ verdict, spd, isSpdActive, segDurMs }) => {
    if (!verdict || !Number.isFinite(verdict.startMs)) return '';
    const start = verdict.startMs;
    const end =
        verdict.endMs !== null && Number.isFinite(verdict.endMs)
            ? verdict.endMs
            : null;
    const edge = verdict.edgeMs;
    const now = verdict.nowMs;
    if (![edge, now].every(Number.isFinite)) return '';
    const pts = end !== null ? [start, end, edge, now] : [start, edge, now];
    let lo = Math.min(...pts);
    let hi = Math.max(...pts);
    const pad = Math.max((hi - lo) * 0.08, 1000);
    lo -= pad;
    hi += pad;
    if (!(hi > lo)) {
        lo -= 1000;
        hi += 1000;
    }
    const pct = (x) =>
        Math.min(100, Math.max(0, ((x - lo) / (hi - lo)) * 100));
    const runColor =
        verdict.kind === 'live'
            ? 'rgba(239,68,68,.55)'
            : verdict.kind === 'future'
              ? 'rgba(245,158,11,.55)'
              : 'rgba(148,163,184,.45)';
    const runLeft = pct(start);
    const runRight = end !== null ? pct(end) : runLeft;
    const runWidth = Math.max(runRight - runLeft, 1.5);
    const n = verdict.segCount > 1 ? verdict.segCount : 1;
    let ticks = '';
    if (
        n > 1 &&
        n <= 64 &&
        Number.isFinite(segDurMs) &&
        segDurMs > 0
    ) {
        for (let i = 1; i < n; i++) {
            const x = pct(start + i * segDurMs).toFixed(2);
            ticks += `<span style="position:absolute;top:0;bottom:0;left:${x}%;width:1px;background:rgba(2,6,23,.65)"></span>`;
        }
    }
    const edgeX = pct(edge).toFixed(2);
    const nowX = pct(now).toFixed(2);
    const clock = (ms) => `${wallClock(ms)} UTC`;
    const spdSec = spdSeconds(spd);
    const dot =
        verdict.kind === 'live'
            ? '#ef4444'
            : verdict.kind === 'future'
              ? '#f59e0b'
              : '#94a3b8';
    let status;
    if (verdict.kind === 'live') {
        status =
            n > 1 && verdict.segIndex
                ? `LIVE — edge inside segment ${verdict.segIndex} of ${n}`
                : 'LIVE — edge inside span';
    } else if (verdict.kind === 'future') {
        status = `PENDING — ${escapeHtml(verdict.label)}`;
    } else {
        status = `ENDED — ${escapeHtml(verdict.label)}`;
    }
    const row = (k, v) =>
        `<div style="display:flex;justify-content:space-between;gap:1rem;padding:2px 0;">` +
        `<span style="opacity:.65">${escapeHtml(k)}</span>` +
        `<span style="font-family:monospace">${escapeHtml(v)}</span></div>`;
    return (
        `<div style="margin:2px 0 10px;padding:9px 12px;border-radius:10px;` +
        `background:rgba(2,6,23,.55);border:1px solid rgba(148,163,184,.14)">` +
        `<div style="font-size:9px;text-transform:uppercase;letter-spacing:.12em;opacity:.55;margin-bottom:8px">Timeline position</div>` +
        `<div title="${escapeHtml(`run ${clock(start)} → ${end !== null ? clock(end) : 'open-ended'}`)}" style="position:relative;height:14px;border-radius:7px;background:rgba(148,163,184,.12);overflow:hidden;margin-bottom:8px">` +
        `<span style="position:absolute;top:0;bottom:0;left:${runLeft.toFixed(2)}%;width:${runWidth.toFixed(2)}%;background:${runColor}"></span>` +
        ticks +
        `<span title="${escapeHtml(`live edge ${clock(edge)}`)}" style="position:absolute;top:-2px;bottom:-2px;left:${edgeX}%;width:2px;background:#f8fafc"></span>` +
        `<span title="${escapeHtml(`now ${clock(now)}`)}" style="position:absolute;top:4px;left:calc(${nowX}% - 3px);width:6px;height:6px;border-radius:99px;background:#38bdf8"></span>` +
        `</div>` +
        row('Start', clock(start)) +
        row(
            end !== null
                ? n > 1
                    ? `End (run, ${n} segs)`
                    : 'End'
                : 'End',
            end !== null ? clock(end) : 'open-ended'
        ) +
        row('Live edge', clock(edge)) +
        row(
            'Now',
            spdSec > 0 && isSpdActive
                ? `${clock(now)} (edge = now − SPD ${spdSec}s)`
                : `${clock(now)} (edge = now)`
        ) +
        `<div style="display:flex;align-items:center;gap:7px;margin-top:7px;padding-top:7px;border-top:1px solid rgba(148,163,184,.14);font-weight:700;font-size:12px;">` +
        `<span style="display:inline-block;width:7px;height:7px;border-radius:99px;background:${dot}"></span>` +
        `<span>${escapeHtml(status)}</span></div>` +
        `</div>`
    );
};

/** Compose hero + timeline + worked panel + detail rows for the sidebar/tooltips. */
const analysisHtml = ({ rowsHtml, workedText, verdict, timeline }) =>
    `<div>${verdictHero(verdict)}${timeline ?? ''}${workedPanel(workedText)}<div>${rowsHtml}</div></div>`;

/**
 * @param {string} key Attribute/tag name.
 * @param {*} value Raw value (string, or the attribute map for aggregators).
 * @param {object} [context]
 */
function getDetails(key, value, context = {}) {
    // Renderers pass tag-qualified keys (e.g. 'S@d'); match on the bare
    // attribute name so timescale/repeat/codec rules keep working.
    const lowerKey = String(key ?? '').toLowerCase();
    const shortKey = lowerKey.includes('@')
        ? lowerKey.split('@').pop()
        : lowerKey;
    const labelKey = shortKey || lowerKey;
    const timescale = context.timescale ?? null;
    const allAttributes = context.allAttributes ?? {};
    const text = value === null || value === undefined ? '' : String(value);

    // S-tag aggregator (SegmentTimeline spans): value carries the attributes.
    if (shortKey === 's' && value && typeof value === 'object') {
        const attrs = value;
        const d = parseFloat(attrs.d ?? attrs.D ?? '');
        const rRaw = attrs.r ?? attrs.R ?? null;
        const t = attrs.t ?? attrs.T ?? null;
        const rows = [
            detailRow('d (duration ticks)', String(attrs.d ?? attrs.D ?? '—')),
            detailRow('t (start time)', String(t ?? '—')),
            detailRow('r (repeat)', String(rRaw ?? '—')),
        ];
        let parsedValue = `d=${attrs.d ?? attrs.D ?? '?'} r=${rRaw ?? '?'}`;
        let workedText = null;
        const parsedR = rRaw === null ? 0 : parseInt(rRaw, 10);
        const runR = !isNaN(parsedR) && parsedR >= 0 ? parsedR : 0;
        if (!isNaN(d) && timescale && timescale > 0) {
            if (!isNaN(parsedR) && parsedR >= 0) {
                const total = ((parsedR + 1) * d) / timescale;
                parsedValue += ` ≈ ${formatDurationPill(total)} total`;
                workedText = `(${parsedR} + 1) × ${d} / ${timescale} = ${formatDurationPill(total)}`;
            }
        }
        const verdict = liveVerdict({
            tTicks: t ?? null,
            dTicks: Number.isNaN(d) ? null : d,
            timescale,
            anchorTimeMs: context.anchorTime ?? null,
            nowMs: context.now ?? null,
            spd: context.spd,
            isSpdActive: context.isSpdActive,
            ptoTicks: context.pto ?? null,
            rCount: runR,
        });
        return {
            label: 'S Span Aggregator',
            parsedValue,
            tooltipHtml: analysisHtml({
                rowsHtml: rows.join(''),
                workedText,
                verdict,
                timeline: timelineStrip({
                    verdict,
                    spd: context.spd,
                    isSpdActive: context.isSpdActive,
                    segDurMs:
                        !isNaN(d) && timescale > 0
                            ? (d / timescale) * 1000
                            : null,
                }),
            }),
        };
    }

    // Duration pills / timescale math mirror renderBadge below.
    if (shortKey === 'r' && timescale) {
        const dVal = allAttributes['d'] || allAttributes['D'];
        const r = parseInt(text, 10);
        const d = parseFloat(dVal);
        if (!isNaN(r) && !isNaN(d)) {
            const count = r < 0 ? 'Until End' : r + 1;
            const workedText =
                typeof count === 'number'
                    ? `(${r} + 1) × ${d} / ${timescale} = ${formatDurationPill(((r + 1) * d) / timescale)}`
                    : null;
            const verdict = liveVerdict({
                tTicks: allAttributes['t'] ?? allAttributes['T'] ?? null,
                dTicks: d,
                timescale,
                anchorTimeMs: context.anchorTime ?? null,
                nowMs: context.now ?? null,
                spd: context.spd,
                isSpdActive: context.isSpdActive,
                ptoTicks: context.pto ?? null,
                rCount: r,
            });
            return {
                label: 'Repeat Count',
                parsedValue:
                    typeof count === 'number'
                        ? `${count} × ${formatDurationPill(d / timescale)}`
                        : 'Repeat: Until End',
                tooltipHtml: analysisHtml({
                    rowsHtml:
                        `${detailRow('Formula', '(r + 1) × d / timescale')}` +
                        `${detailRow('Raw r', text)}${detailRow('d', String(dVal))}` +
                        `${detailRow('Timescale', String(timescale))}`,
                    workedText,
                    verdict,
                    timeline: timelineStrip({
                        verdict,
                        spd: context.spd,
                        isSpdActive: context.isSpdActive,
                        segDurMs: (d / timescale) * 1000,
                    }),
                }),
            };
        }
    }
    if (shortKey.includes('bandwidth') || shortKey.includes('bitrate')) {
        const num = parseInt(text, 10);
        if (!isNaN(num)) {
            return { label: 'Bitrate', parsedValue: formatBitrate(num) };
        }
    }
    if (shortKey.includes('range') && text.includes('-')) {
        const [start, end] = text.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
            return {
                label: 'Byte Range',
                parsedValue: `${formatBytes(end - start + 1)} (${text})`,
            };
        }
    }
    const scaledFields = [
        'd',
        't',
        'duration',
        'presentationtimeoffset',
        'availabilitytimeoffset',
    ];
    if (timescale && scaledFields.includes(shortKey)) {
        const num = parseFloat(text);
        if (!isNaN(num) && timescale > 0) {
            const seconds = num / timescale;
            let workedText = null;
            let verdict = null;
            let segDurMs = null;
            if (shortKey === 'd' || shortKey === 't') {
                const siblingT =
                    shortKey === 'd'
                        ? (allAttributes['t'] ?? allAttributes['T'] ?? null)
                        : num;
                const siblingD =
                    shortKey === 'd'
                        ? num
                        : (allAttributes['d'] ?? allAttributes['D'] ?? null);
                workedText =
                    shortKey === 'd'
                        ? `${num} / ${timescale} = ${formatDurationPill(seconds)}`
                        : (() => {
                              const ptoEff = effectivePto(
                                  num,
                                  siblingD,
                                  context.pto
                              );
                              return ptoEff > 0
                                  ? `wall = anchor + (${num} − ${ptoEff}) / ${timescale}`
                                  : `wall = anchor + ${num} / ${timescale}`;
                          })();
                verdict = liveVerdict({
                    tTicks: siblingT,
                    dTicks: siblingD,
                    timescale,
                    anchorTimeMs: context.anchorTime ?? null,
                    nowMs: context.now ?? null,
                    spd: context.spd,
                    isSpdActive: context.isSpdActive,
                    ptoTicks: context.pto ?? null,
                    rCount:
                        allAttributes['r'] ?? allAttributes['R'] ?? null,
                });
                const segDurRaw =
                    shortKey === 'd' ? num : parseFloat(siblingD);
                segDurMs =
                    !isNaN(segDurRaw) && timescale > 0
                        ? (segDurRaw / timescale) * 1000
                        : null;
            }
            return {
                label: prettyKey(labelKey),
                parsedValue: formatDurationPill(seconds),
                tooltipHtml: analysisHtml({
                    rowsHtml:
                        `${detailRow('Raw ticks', text)}` +
                        `${detailRow('Timescale', String(timescale))}`,
                    workedText,
                    verdict,
                    timeline: timelineStrip({
                        verdict,
                        spd: context.spd,
                        isSpdActive: context.isSpdActive,
                        segDurMs,
                    }),
                }),
            };
        }
    }
    if (text.startsWith('PT')) {
        const parsed = parseDuration(text);
        if (parsed) {
            return {
                label: prettyKey(labelKey),
                parsedValue: formatDurationPill(parsed.total),
            };
        }
    }
    if (shortKey === 'codecs') {
        return { label: 'Codecs', parsedValue: text };
    }
    if (shortKey.includes('framerate')) {
        let fps = text;
        if (text.includes('/')) {
            const [n, d] = text.split('/');
            if (parseFloat(d) !== 0) fps = (parseFloat(n) / parseFloat(d)).toFixed(2);
        }
        return { label: 'Frame Rate', parsedValue: `${fps} fps` };
    }

    return {
        label: prettyKey(labelKey) || 'Value',
        parsedValue: text.length > 160 ? `${text.slice(0, 159)}…` : text,
    };
}

/**
 * Rendered badge pill (lit-html). Ported from the pre-Heux inline
 * implementation; class names preserved so existing styles apply.
 */
function renderBadge(key, value, context = {}) {
    // See getDetails: renderers pass tag-qualified keys ('S@d').
    const lowerKey = String(key ?? '').toLowerCase();
    const shortKey = lowerKey.includes('@')
        ? lowerKey.split('@').pop()
        : lowerKey;
    const text = value === null || value === undefined ? '' : String(value);
    const timescale = context.timescale ?? null;
    const allAttributes = context.allAttributes ?? {};

    if (shortKey === 'timescale') return null;

    if (shortKey === 'r' && timescale) {
        const dVal = allAttributes['d'] || allAttributes['D'];
        if (dVal) {
            const r = parseInt(text, 10);
            const d = parseFloat(dVal);
            if (!isNaN(r) && !isNaN(d)) {
                const count = r < 0 ? 'Until End' : r + 1;
                if (typeof count === 'number') {
                    const totalSeconds = (count * d) / timescale;
                    return pill(
                        'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
                        `Total: ${formatDurationPill(totalSeconds)}`
                    );
                }
                return pill(
                    'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
                    'Repeat: Until End'
                );
            }
        }
    }

    if (shortKey.includes('bandwidth') || shortKey.includes('bitrate')) {
        const num = parseInt(text, 10);
        if (!isNaN(num)) {
            return pill(
                'bg-blue-500/20 text-blue-300 border border-blue-500/30',
                formatBitrate(num)
            );
        }
    }

    if (shortKey.includes('range') && text.includes('-')) {
        const [start, end] = text.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
            const size = end - start + 1;
            return pill(
                'bg-gray-500/20 text-gray-300 border border-gray-500/30',
                formatBytes(size)
            );
        }
    }

    const isScaledTimeField = [
        'd',
        't',
        'duration',
        'presentationtimeoffset',
        'availabilitytimeoffset',
    ].includes(shortKey);
    if (timescale && isScaledTimeField) {
        const num = parseFloat(text);
        if (!isNaN(num) && timescale > 0) {
            const seconds = num / timescale;
            const main = pill(
                'bg-teal-500/20 text-teal-300 border border-teal-500/30',
                formatDurationPill(seconds)
            );
            // Live-edge verdict only on the duration pill (the t pill
            // shares the same span; the details panel covers both).
            if (shortKey !== 'd') return main;
            const verdict = liveVerdict({
                tTicks: allAttributes['t'] ?? allAttributes['T'] ?? null,
                dTicks: num,
                timescale,
                anchorTimeMs: context.anchorTime ?? null,
                nowMs: context.now ?? null,
                spd: context.spd,
                isSpdActive: context.isSpdActive,
                ptoTicks: context.pto ?? null,
                rCount:
                    allAttributes['r'] ?? allAttributes['R'] ?? null,
            });
            const extra = verdictTreePill(verdict);
            return extra ? [main, extra] : main;
        }
    }

    const isGeneralTimeField = [
        'duration',
        'time',
        'period',
        'delay',
        'maxsegmentduration',
        'targetduration',
        'elapsed',
    ].some((term) => shortKey.includes(term));
    const isTimestamp =
        shortKey.includes('timestamp') ||
        shortKey.includes('publish') ||
        shortKey.includes('availability') ||
        shortKey.includes('program-date');

    if (text.startsWith('PT')) {
        const parsed = parseDuration(text);
        if (parsed) {
            return pill(
                'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
                formatDurationPill(parsed.total)
            );
        }
    }

    if (
        isGeneralTimeField &&
        !isTimestamp &&
        !timescale &&
        /^\d+(\.\d+)?$/.test(text)
    ) {
        const num = parseFloat(text);
        if (!isNaN(num)) {
            return pill(
                'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
                formatDurationPill(num)
            );
        }
    }

    if (shortKey === 'codecs') {
        const codecList = text.split(',').map((c) => c.trim().split('.')[0]);
        return html`<span class="ml-0.5 mr-1 inline-flex gap-1 align-middle"
            >${codecList.map(
                (c) =>
                    html`<span
                        class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 select-none whitespace-nowrap leading-none h-4"
                        >${c.toUpperCase()}</span
                    >`
            )}</span
        >`;
    }

    if (shortKey === 'width' || shortKey === 'height') {
        return pill('bg-transparent text-slate-500 border border-transparent', 'px');
    }

    if (shortKey.includes('framerate')) {
        let fps = text;
        if (text.includes('/')) {
            const [n, d] = text.split('/');
            const num = parseFloat(n);
            const den = parseFloat(d);
            if (den !== 0) fps = (num / den).toFixed(2);
        }
        return pill(
            'bg-orange-500/20 text-orange-300 border border-orange-500/30',
            `${fps} fps`
        );
    }

    if (shortKey.includes('samplingrate')) {
        return pill(
            'bg-pink-500/20 text-pink-300 border border-pink-500/30',
            `${text} Hz`
        );
    }

    if (shortKey === 'par' || shortKey === 'sar') {
        const [w, h] = text.split(':').map(Number);
        if (!isNaN(w) && !isNaN(h)) {
            return pill(
                'bg-slate-700 text-slate-300 border border-slate-600',
                `${(w / h).toFixed(2)}:1`
            );
        }
    }

    return null;
}

/**
 * Structured inspector details rendered by `sidebar.js`.
 * @typedef {object} SmartDetails
 * @property {string} label
 * @property {string} [tooltipHtml] HTML string (injected via unsafeHTML).
 * @property {string} [parsedValue]
 * @property {SmartDetails} [parentSmartDetails] Aggregator context (S tags).
 */

export const SmartBadgeService = { getDetails, renderBadge };
