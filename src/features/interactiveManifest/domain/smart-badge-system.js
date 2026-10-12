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
            : 'bg-white/5 text-slate-300 border border-slate-600';
    return pill(cls, verdict.label);
};

const prettyKey = (key) =>
    String(key)
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

// Legacy table-row builder. All getDetails branches now render
// insight cards instead; kept (not deleted) because timelineStrip
// and any third-party callers may still reference it.
// eslint-disable-next-line no-unused-vars
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
 * Relative AST offset for badge pills/panels ("T+23743h23m" style).
 *
 * Absolute wall-clock times ("14:19:03 UTC") are meaningless for
 * periods/segments anchored ~23743h after AST: the hour count dwarfs
 * the information. What the engineer wants is *position in the
 * presentation* — offset from AST — with the absolute time kept as
 * secondary detail (title attribute / panel row).
 *
 * @param {number} ms absolute wall-clock ms.
 * @param {number} astMs AST anchor ms (null/undefined = no relative base).
 * @returns {string} "T+<human>" when the base is known, else the
 *   absolute wallClock fallback so callers never render garbage.
 */
const relClock = (ms, astMs) => {
    if (
        astMs === null ||
        astMs === undefined ||
        !Number.isFinite(Number(ms)) ||
        !Number.isFinite(Number(astMs))
    ) {
        return `${wallClock(ms)} UTC`;
    }
    const offsetSec = Math.max(0, (Number(ms) - Number(astMs)) / 1000);
    return `T+${formatDurationPill(offsetSec)}`;
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
    // anchorTimeMs rides along so panels can render relative T+ offsets
    // next to absolute wall times (huge hour counts become positions).
    const base = { startMs: start, endMs: end, segCount: runSegs, segIndex, edgeMs: edge, nowMs: now, anchorTimeMs: anchor };
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

/**
 * S-run aggregates for the SegmentTimeline level.
 *
 * A single S tag only says "d ticks, repeat r" — the questions an
 * engineer actually asks at this level are all about the *run*: how
 * many segments does it expand to, how long does it cover, what
 * cadence does it establish, and where does the live edge sit inside
 * it. liveVerdict already answers the last one; this derives the rest
 * from the same inputs so pills and panel can never disagree.
 *
 * @returns {{ segCount: number, segDurSec: number|null, totalSec: number|null, openEnded: boolean } | null}
 */
const sRunAggregates = ({ dTicks, timescale, rCount }) => {
    const ts = Number(timescale);
    const d = dTicks === null || dTicks === undefined || dTicks === '' ? NaN : Number(dTicks);
    if (!Number.isFinite(ts) || ts <= 0) return null;
    if (!Number.isFinite(d) || d <= 0) return null;
    const r = rCount === null || rCount === undefined || rCount === '' ? 0 : Number(rCount);
    if (r < 0) {
        // r=-1: run continues to Period end (bound unknowable here).
        return { segCount: 1, segDurSec: d / ts, totalSec: null, openEnded: true };
    }
    const repeats = Number.isInteger(r) && r >= 0 ? r : 0;
    const segCount = repeats + 1;
    const segDurSec = d / ts;
    return { segCount, segDurSec, totalSec: segCount * segDurSec, openEnded: false };
};

/**
 * Previous-run-end comparison for an explicit-t re-anchor.
 *
 * The sidebar used to beg ("compare against the previous run end")
 * without doing it. Given the sibling S attribute maps + this run's
 * index, compute where the previous run ends (start tick + span, with
 * the same chaining semantics the timeline math uses: an explicit t
 * on ANY run re-anchors, otherwise runs chain contiguously) and judge
 * this run's explicit t against it:
 *
 *   delta 0            → seamless continuation (info, not a warn)
 *   delta > 0          → GAP of delta ticks (error: playhead stalls)
 *   delta < 0          → OVERLAP of -delta ticks (warn: double-covered
 *                        time confuses seeking)
 *
 * Uncomputable (first run, missing/invalid d, open-ended r=-1
 * previous run) returns { comparable: false } so callers fall back to
 * the generic "re-anchor point" warn instead of guessing.
 *
 * @returns {{ comparable: boolean, deltaTicks?: number, prevEndTick?: number, gapSec?: number, overlapSec?: number }}
 */
const prevRunComparison = ({ sSiblings, sRunIndex, timescale }) => {
    const no = { comparable: false };
    const ts = Number(timescale);
    if (!Number.isFinite(ts) || ts <= 0) return no;
    if (!Array.isArray(sSiblings) || sSiblings.length === 0) return no;
    const idx = Number(sRunIndex) || 0;
    // Run 0 is never "previous-comparable": nothing precedes it. Flag
    // it distinctly so callers render the first-run path (Period-base
    // check or neutral info) instead of the generic warn.
    if (idx <= 0) return { comparable: false, firstRun: true };
    if (idx >= sSiblings.length) return no;
    const cur = sSiblings[idx] || {};
    const curT = cur.t ?? cur.T ?? null;
    if (curT === null || curT === undefined || String(curT) === '') return no;
    const curStart = Number(curT);
    if (!Number.isFinite(curStart)) return no;
    // Chain runs [0..idx-1] with timeline semantics: explicit t on any
    // run re-anchors the chain cursor; otherwise the cursor advances by
    // the run span. r=-1 previous runs are unknowable → bail out.
    let cursor = null;
    for (let k = 0; k < idx; k++) {
        const a = sSiblings[k] || {};
        const d = parseFloat(a.d ?? a.D ?? '');
        if (!Number.isFinite(d) || d <= 0) return no;
        const rRaw = a.r ?? a.R ?? null;
        const r = rRaw === null ? 0 : parseInt(rRaw, 10);
        if (!Number.isNaN(r) && r < 0) return no;
        const segs = Number.isInteger(r) && r >= 0 ? r + 1 : 1;
        const aT = a.t ?? a.T ?? null;
        if (aT !== null && aT !== undefined && String(aT) !== '') {
            const aStart = Number(aT);
            if (!Number.isFinite(aStart)) return no;
            cursor = aStart + segs * d;
        } else if (cursor === null) {
            // First run(s) without explicit t chain from timeline origin
            // only if run 0 itself is t-less (starts at 0/PTO base).
            // Without a base the chain is unknowable.
            if (k === 0) cursor = segs * d;
            else cursor += segs * d;
        } else {
            cursor += segs * d;
        }
    }
    if (cursor === null || !Number.isFinite(cursor)) return no;
    const deltaTicks = curStart - cursor;
    const out = { comparable: true, deltaTicks, prevEndTick: cursor };
    if (deltaTicks > 0) out.gapSec = deltaTicks / ts;
    else if (deltaTicks < 0) out.overlapSec = -deltaTicks / ts;
    return out;
};

/**
 * Whole-SegmentTimeline aggregates.
 *
 * One S run says "this rhythm for N segments"; the timeline answers
 * "how much content is this template, in total". Sums segment counts
 * and tick coverage across runs (tick-based, so explicit-t re-anchoring
 * can't corrupt the total), detects cadence uniformity, and judges one
 * live-edge verdict over the union span [first run start, last run end].
 *
 * @returns {{ runCount, totalSegs, totalSec: number|null, knownSec, openEnded, uniformCadence, firstSegDurSec: number|null, workedText: string|null, verdict } | null}
 *   null when there are no usable runs (caller falls back to a plain label).
 */
const timelineAggregates = ({
    runs,
    timescale,
    tTicks,
    anchorTimeMs,
    nowMs,
    spd,
    isSpdActive,
    ptoTicks,
}) => {
    const ts = Number(timescale);
    if (!Number.isFinite(ts) || ts <= 0) return null;
    if (!Array.isArray(runs) || runs.length === 0) return null;
    // First-run explicit t is NOT a re-anchor warn: run 0 has no
    // previous run inside this timeline, so there is nothing to be
    // discontinuous against. Its t is checked against the Period start
    // offset instead (explicitT vs periodStartSec below).
    const parsed = runs.map((attrs, runIdx) => ({
        t: attrs?.t ?? attrs?.T ?? null,
        d: parseFloat(attrs?.d ?? attrs?.D ?? ''),
        rRaw: attrs?.r ?? attrs?.R ?? null,
        isFirst: runIdx === 0,
    }));
    const usable = parsed.filter((r) => Number.isFinite(r.d) && r.d > 0);
    if (usable.length === 0) return null;
    let totalSegs = 0;
    let knownTicks = 0;
    let openEnded = false;
    let uniformCadence = true;
    let firstSegDurSec = usable[0].d / ts;
    const workedParts = [];
    usable.forEach((run) => {
        const r = run.rRaw === null ? 0 : parseInt(run.rRaw, 10);
        if (!Number.isNaN(r) && r < 0) {
            openEnded = true;
            totalSegs += 1;
            knownTicks += run.d;
            workedParts.push(`${formatDurationPill(run.d / ts)} (open)`);
        } else {
            const segs = Number.isInteger(r) && r >= 0 ? r + 1 : 1;
            totalSegs += segs;
            knownTicks += segs * run.d;
            workedParts.push(`${segs}×${formatDurationPill(run.d / ts)}`);
        }
        if (run.d / ts !== firstSegDurSec) uniformCadence = false;
    });
    const totalSec = openEnded ? null : knownTicks / ts;
    const knownSec = knownTicks / ts;
    // Union span for the verdict: anchor at the first run's t (or the
    // shared tTicks), extend by the known tick coverage. Open tails
    // judge on the known span — the verdict degrades to ended/live on
    // what the manifest actually lists, never on imagined segments.
    const firstT = usable[0].t ?? tTicks ?? null;
    const verdict = liveVerdict({
        tTicks: firstT,
        dTicks: knownTicks > 0 ? knownTicks : null,
        timescale: ts,
        anchorTimeMs,
        nowMs,
        spd,
        isSpdActive,
        ptoTicks,
        rCount: 0,
    });
    return {
        runCount: runs.length,
        totalSegs,
        totalSec,
        knownSec,
        openEnded,
        uniformCadence,
        firstSegDurSec,
        workedText:
            workedParts.length > 0 ? workedParts.join(' + ') : null,
        verdict,
    };
};

/**
 * HLS playlist-level details (cross-line badges) — generated helper.
 *
 * Pure function of (shortKey, text, playlist, key): every branch below
 * compares the local value against playlist-wide facts. Returns null
 * when the key isn't a playlist-level badge or the needed facts are
 * absent — the caller then falls through to the generic branches.
 * Tag-qualified keys arrive as `tag@attr` in `key`; EXTINF arrives as
 * tag key `extinf` with the duration text.
 */
function hlsPlaylistDetails(shortKey, text, playlist, key, context = {}) {
    const num = parseFloat(text);
    const hasNum = Number.isFinite(num);
    const tagOf = String(key ?? '').includes('@')
        ? String(key).split('@')[0].toLowerCase()
        : String(key ?? '').toLowerCase();

    // EXT-X-TARGETDURATION: the ceiling every segment must fit under.
    // Insight-first: the compliance verdict leads (error card on
    // overrun = player may stall/refuse), then what the ceiling means
    // for buffering, then the playlist totals as fact chips.
    if (shortKey === 'ext-x-targetduration' && hasNum) {
        const over = playlist.extinfMax > num;
        const insights = [];
        if (playlist.extinfCount > 0 && over) {
            insights.push({
                severity: 'error',
                headline: `A ${formatDurationPill(playlist.extinfMax)} segment breaks the ${formatDurationPill(num)} ceiling`,
                body: 'RFC 8216 requires every EXTINF to be ≤ TARGETDURATION. Players size buffers and timeouts from this ceiling — an overrun segment can stall playback or be rejected outright.',
                facts: [`max EXTINF ${playlist.extinfMax}s`, `ceiling ${num}s`],
            });
        } else if (playlist.extinfCount > 0) {
            insights.push({
                headline: `Ceiling holds — longest segment is ${formatDurationPill(playlist.extinfMax)}`,
                body: 'Every listed segment fits under TARGETDURATION, so buffer sizing derived from this ceiling is safe.',
                facts: [`${playlist.extinfCount} segs`, `Σ ${formatDurationPill(playlist.extinfTotal)}`],
            });
        } else {
            insights.push({
                headline: 'Ceiling declared, no segments listed yet',
                body: 'Nothing to check against — segments appear on playlist updates for live streams.',
                facts: [`ceiling ${formatDurationPill(num)}`],
            });
        }
        return {
            label: 'Target Duration',
            parsedValue: `${formatDurationPill(num)}${over ? ' ⚠ overrun' : ''}`,
            tooltipHtml: analysisHtml({
                rowsHtml: '',
                workedText: `max(EXTINF) ≤ TARGETDURATION → ${over ? 'FAIL' : 'PASS'}`,
                verdict: null,
                timeline: null,
                insights,
            }),
        };
    }

    // EXTINF duration vs the playlist ceiling — the compliance question
    // asked on every segment line. Error card on breach; otherwise a
    // quiet confirmation with the headroom that remains.
    if (shortKey === 'extinf' && hasNum && num >= 0) {
        const ceil = playlist.targetDuration;
        const over = ceil !== null && ceil !== undefined && num > ceil;
        const insights =
            ceil === null || ceil === undefined
                ? [
                      {
                          headline: `${formatDurationPill(num)} segment, no ceiling to check against`,
                          body: 'No EXT-X-TARGETDURATION in this playlist, so compliance is unknowable here.',
                          facts: [`${num}s`],
                      },
                  ]
                : over
                  ? [
                        {
                            severity: 'error',
                            headline: `${formatDurationPill(num)} exceeds the ${formatDurationPill(ceil)} ceiling`,
                            body: 'This segment violates RFC 8216 §4.1 — players may refuse it and stall at this position.',
                            facts: [`over by ${formatDurationPill(num - ceil)}`, `ceiling ${ceil}s`],
                        },
                    ]
                  : [
                        {
                            headline: `${formatDurationPill(num)} fits under the ${formatDurationPill(ceil)} ceiling`,
                            body: `Compliant with ${formatDurationPill(ceil - num)} of headroom — safe for buffer math built on the ceiling.`,
                            facts: [`${num}s / ${ceil}s`],
                        },
                    ];
        return {
            label: 'Segment Duration',
            parsedValue: `${formatDurationPill(num)}${over ? ' ⚠ over target' : ''}`,
            tooltipHtml: analysisHtml({
                rowsHtml: '',
                workedText: null,
                verdict: null,
                timeline: null,
                insights,
            }),
        };
    }

    // PART-TARGET: the LL-HLS granularity promise. Insight: parts per
    // segment (how finely the player can start) + the INVALID error
    // when part ≥ segment (nonsense manifest).
    if (shortKey === 'part-target' && hasNum) {
        const seg = playlist.targetDuration;
        const ratio = seg ? num / seg : null;
        const bad = ratio !== null && ratio >= 1;
        return {
            label: 'Part Target',
            parsedValue: formatDurationPill(num),
            tooltipHtml: analysisHtml({
                rowsHtml: '',
                workedText: seg !== null && seg !== undefined ? `PART-TARGET / TARGETDURATION = ${formatDurationPill(num)} / ${formatDurationPill(seg)}` : null,
                verdict: null,
                timeline: null,
                insights: [
                    bad
                        ? {
                              severity: 'error',
                              headline: `Parts (${formatDurationPill(num)}) can't be as long as segments (${formatDurationPill(seg)})`,
                              body: 'PART-TARGET ≥ TARGETDURATION is a nonsense manifest — parts subdivide segments by definition. Players will ignore one of the two values.',
                              facts: [`part ${num}s`, `segment ${seg}s`],
                          }
                        : {
                              headline:
                                  ratio !== null
                                      ? `~${Math.max(1, Math.round(1 / ratio))} parts per segment — ${ratio > 0.5 ? 'coarse (slow startup tuning)' : 'fine-grained (good for low-latency tuning)'}`
                                      : `${formatDurationPill(num)} parts — segment target unknown`,
                              body:
                                  ratio !== null
                                      ? 'Smaller parts let the player start sooner after tune-in; more parts per segment means more requests. This ratio is the LL-HLS granularity dial.'
                                      : 'No TARGETDURATION in this playlist, so granularity is unknowable here.',
                              facts:
                                  ratio !== null
                                      ? [`${(ratio * 100).toFixed(0)}% of a segment`, `part ${formatDurationPill(num)}`]
                                      : [`part ${formatDurationPill(num)}`],
                          },
                ],
            }),
        };
    }

    // HOLD-BACK: the realtime latency budget in human terms. Insight:
    // convert the multiple into "you watch X behind realtime" + the
    // actual wall-clock the viewer sees (now − holdback), because a
    // bare "3.0×" means nothing at 3am. context.now carries the
    // playlist render clock (null = VOD/unknown → multiples only).
    if ((shortKey === 'hold-back' || shortKey === 'part-hold-back') && hasNum) {
        const isPart = shortKey === 'part-hold-back';
        const target = isPart ? playlist.partTarget : playlist.targetDuration;
        const mult = target ? num / target : null;
        const nowMs = context.now ?? null;
        const behindMs =
            Number.isFinite(nowMs) && nowMs !== null ? nowMs - num * 1000 : null;
        return {
            label: isPart ? 'Part Hold-Back' : 'Hold-Back',
            parsedValue:
                mult !== null
                    ? `${formatDurationPill(num)} (${mult.toFixed(1)}× target)`
                    : formatDurationPill(num),
            tooltipHtml: analysisHtml({
                rowsHtml: '',
                workedText:
                    mult !== null && target !== null && target !== undefined
                        ? `${formatDurationPill(num)} / ${formatDurationPill(target)} = ${mult.toFixed(1)}×`
                        : null,
                verdict: null,
                timeline: null,
                insights: [
                    {
                        headline:
                            behindMs !== null
                                ? `Viewers watch ${formatDurationPill(num)} behind realtime — as of ${humanDateTime(behindMs)}, not ${humanDateTime(nowMs)}`
                                : mult !== null
                                  ? `${mult.toFixed(1)}× the ${isPart ? 'part' : 'segment'} target behind live edge`
                                  : `${formatDurationPill(num)} behind live edge`,
                        body:
                            behindMs !== null
                                ? 'Hold-back is the latency budget: the player stays this far behind the edge to absorb jitter. Larger = safer, smaller = more live.'
                                : 'No render clock available, so this is the multiple only — open the playlist live to see the viewer wall-clock.',
                        facts:
                            behindMs !== null
                                ? [`behind ${formatDurationPill(num)}`, `viewer sees ${humanDateTime(behindMs)}`, `edge ${humanDateTime(nowMs)}`]
                                : mult !== null
                                  ? [`${mult.toFixed(1)}× target`]
                                  : [`${formatDurationPill(num)}`],
                    },
                ],
            }),
        };
    }

    // EXT-X-MEDIA-SEQUENCE: where this sliding window sits. Insight:
    // the window span (#first–#last · duration) is the DVR horizon an
    // engineer reads — the raw number alone says nothing.
    if (shortKey === 'ext-x-media-sequence' && hasNum) {
        const last =
            playlist.extinfCount > 0 ? num + playlist.extinfCount - 1 : num;
        return {
            label: 'Media Sequence',
            parsedValue: `#${num}`,
            tooltipHtml: analysisHtml({
                rowsHtml: '',
                workedText: null,
                verdict: null,
                timeline: null,
                insights: [
                    {
                        headline:
                            playlist.extinfCount > 0
                                ? `Window holds #${num}–#${last} (${formatDurationPill(playlist.extinfTotal)} of video)`
                                : `Window starts at #${num}, no segments listed`,
                        body:
                            playlist.extinfCount > 0
                                ? 'For live playlists this window slides forward on every refresh — anything before #first has fallen off the DVR edge.'
                                : 'Segments appear on playlist updates for live streams.',
                        facts:
                            playlist.extinfCount > 0
                                ? [`first #${num}`, `last #${last}`, `Σ ${formatDurationPill(playlist.extinfTotal)}`]
                                : [`first #${num}`],
                    },
                ],
            }),
        };
    }

    // Discontinuities: the chapter map. Per-tag panels used to repeat
    // the whole playlist break list (duplication the user flagged) —
    // now each level says its own thing: SEQUENCE owns the full map,
    // the bare tag owns only its own position + what a break means.
    if (shortKey === 'ext-x-discontinuity-sequence' && hasNum) {
        const groups = playlist.discontinuities;
        return {
            label: 'Discontinuity Sequence',
            parsedValue: groups.length > 0 ? `#${num} + ${groups.length} break${groups.length === 1 ? '' : 's'}` : `#${num}`,
            tooltipHtml: analysisHtml({
                rowsHtml: '',
                workedText: null,
                verdict: null,
                timeline: null,
                insights: [
                    groups.length > 0
                        ? {
                              headline: `${groups.length} timeline break${groups.length === 1 ? '' : 's'} — timestamps reset at each one`,
                              body: 'Usually ad splices or encoder resets. Players must re-anchor timestamps here; seeking across a break needs the new sequence, not wall math.',
                              facts: groups.map((d) => `seg ${d.atSegment}→seq ${d.sequence}`),
                          }
                        : {
                              headline: 'Continuous timeline — no breaks in this playlist',
                              body: 'Timestamps run straight through; any seek offset maps linearly.',
                              facts: [`base seq #${num}`],
                          },
                ],
            }),
        };
    }
    if (shortKey === 'ext-x-discontinuity') {
        // This tag's own position: find the nearest break at/after this
        // line is unknowable from text alone, so report the count + the
        // meaning, and let SEQUENCE own the map (no duplication).
        const n = playlist.discontinuities.length;
        return {
            label: 'Discontinuity',
            parsedValue: 'timeline break',
            tooltipHtml: analysisHtml({
                rowsHtml: '',
                workedText: null,
                verdict: null,
                timeline: null,
                insights: [
                    {
                        severity: n > 1 ? 'warn' : undefined,
                        headline:
                            n > 1
                                ? `One of ${n} breaks — timestamps reset here`
                                : 'Timestamps reset here',
                        body:
                            n > 1
                                ? 'Multiple breaks in one playlist usually means ad pods or unstable encoding — check the SEQUENCE panel for the full map.'
                                : 'Timestamps may reset after this tag — the player must re-anchor instead of continuing wall math.',
                        facts:
                            n > 1
                                ? [`${n} breaks total`, 'see SEQUENCE map']
                                : ['re-anchor required'],
                    },
                ],
            }),
        };
    }

    // EXT-X-ENDLIST: the stream is over — VOD verdict with realtime
    // framing. Insight: total runtime + what ENDLIST guarantees (no
    // more segments will ever arrive) vs live (window keeps sliding).
    if (shortKey === 'ext-x-endlist') {
        return {
            label: 'End List',
            parsedValue: 'VOD — playlist complete',
            tooltipHtml: analysisHtml({
                rowsHtml: '',
                workedText: null,
                verdict: null,
                timeline: null,
                insights: [
                    {
                        headline: `Finished stream — ${formatDurationPill(playlist.extinfTotal)} total, nothing more will arrive`,
                        body: playlist.playlistType
                            ? `Declared ${playlist.playlistType} and closed: safe to treat as seekable VOD.`
                            : 'ENDLIST present without PLAYLIST-TYPE — treat as static/VOD; the window is final.',
                        facts: [
                            `${playlist.extinfCount} segs`,
                            `Σ ${formatDurationPill(playlist.extinfTotal)}`,
                            'seekable',
                        ],
                    },
                ],
            }),
        };
    }

    // EXT-X-KEY METHOD: encryption posture + rotation scope. Error card
    // when mixed clear/encrypted methods appear (player must juggle
    // both paths — a real playback hazard), warn on rotation.
    if (shortKey === 'method' && tagOf === 'ext-x-key') {
        const methods = playlist.keyMethods.length > 0 ? playlist.keyMethods : [text];
        const encrypted = methods.some((m) => m && m.toUpperCase() !== 'NONE');
        const hasClear = methods.some((m) => m && m.toUpperCase() === 'NONE');
        const mixed = encrypted && hasClear;
        return {
            label: 'Encryption Method',
            parsedValue: encrypted ? `${methods.join(' + ')} 🔒` : 'clear (NONE)',
            tooltipHtml: analysisHtml({
                rowsHtml: '',
                workedText: null,
                verdict: null,
                timeline: null,
                insights: [
                    mixed
                        ? {
                              severity: 'error',
                              headline: 'Mixed clear + encrypted segments — key juggling required',
                              body: 'Some segments need a key fetch, others do not. Players must switch pipelines mid-stream; a missed transition stalls playback.',
                              facts: methods,
                          }
                        : methods.length > 1
                          ? {
                                severity: 'warn',
                                headline: `Key rotation in effect (${methods.join(' → ')})`,
                                body: 'Multiple METHODs across the playlist: the player must re-fetch keys at each rotation point. Watch for gaps at the switch.',
                                facts: methods,
                            }
                          : {
                                headline: encrypted
                                    ? `${methods[0]} throughout — key fetch required before the first segment`
                                    : 'Clear stream — no key needed',
                                body: encrypted
                                    ? 'Single method: fetch once, cache, and playback proceeds. Failure surfaces as a license error, not a stall.'
                                    : 'METHOD=NONE — playback needs no license round-trip.',
                                facts: encrypted ? [`${methods[0]}`, 'fetch once'] : ['NONE'],
                            },
                ],
            }),
        };
    }

    // EXT-X-DATERANGE ID: the cue as a realtime appointment. Insight:
    // human start time + what the cue does (ad pod vs metadata), not
    // raw offsets. context.now anchors playlist-time → wall-clock.
    if (shortKey === 'id' && tagOf === 'ext-x-daterange') {
        const cue = (playlist.dateranges || []).find((d) => d.id !== null && String(d.id) === String(text));
        if (!cue) return null;
        const nowMs = context.now ?? null;
        const wallStart =
            Number.isFinite(nowMs) && nowMs !== null && cue.startOffsetSec !== null
                ? nowMs - (playlist.extinfTotal - cue.startOffsetSec) * 1000
                : null;
        const isAd = /scte|ad|interstitial|dai/i.test(
            `${cue.className ?? ''} ${cue.scte35Cmd ?? ''}`
        );
        return {
            label: 'Daterange Cue',
            parsedValue: cue.durationSec !== null ? `${formatDurationPill(cue.durationSec)} cue` : 'cue (open)',
            tooltipHtml: analysisHtml({
                rowsHtml: '',
                workedText: null,
                verdict: null,
                timeline: null,
                insights: [
                    {
                        headline:
                            wallStart !== null
                                ? `${isAd ? 'Ad break' : 'Timed metadata'} at ${humanDateTime(wallStart)} (${formatDurationPill(cue.durationSec ?? cue.plannedDurationSec ?? 0)})`
                                : `${isAd ? 'Ad break' : 'Timed metadata'} — ${formatDurationPill(cue.durationSec ?? cue.plannedDurationSec ?? 0)} at playlist +${formatDurationPill(cue.startOffsetSec)}`,
                        body: isAd
                            ? 'Splice cue: expect a discontinuity + sequence bump at playout. Missed cues = ads over content or vice versa.'
                            : 'Metadata cue for the player app (not ad insertion) — safe to ignore for playback.',
                        facts: [
                            `id ${cue.id}`,
                            cue.className ?? 'no class',
                            cue.durationSec !== null ? formatDurationPill(cue.durationSec) : 'open duration',
                            ...(cue.scte35Cmd ? ['SCTE-35 attached'] : []),
                        ],
                    },
                ],
            }),
        };
    }

    // EXT-X-PROGRAM-DATE-TIME: the wall-clock anchor as a realtime
    // appointment. Insight: human time + age (how long ago in real
    // terms) + what the anchor does for seek/DVR math.
    if (shortKey === 'ext-x-program-date-time') {
        const t = Date.parse(text);
        const compact = Number.isFinite(t)
            ? new Date(t).toISOString().slice(0, 16).replace('T', ' ')
            : text;
        const ageMs =
            Number.isFinite(t) && Number.isFinite(context.now) && context.now !== null
                ? context.now - t
                : null;
        return {
            label: 'Program Date Time',
            parsedValue: compact,
            tooltipHtml: analysisHtml({
                rowsHtml: '',
                workedText: null,
                verdict: null,
                timeline: null,
                insights: [
                    {
                        headline: Number.isFinite(t)
                            ? `Anchored at ${humanDateTime(t)}${ageMs !== null && ageMs >= 0 ? ` (${humanAge(ageMs)} ago)` : ''}`
                            : `Unparseable timestamp: ${text}`,
                        body: 'Every segment after this tag maps to wall time through this anchor — seek and DVR math start here. A wrong anchor shifts the whole window.',
                        facts: Number.isFinite(t)
                            ? [humanDateTime(t), new Date(t).toISOString(), ...(ageMs !== null && ageMs >= 0 ? [`${humanAge(ageMs)} ago`] : [])]
                            : [text],
                    },
                ],
            }),
        };
    }

    return null;
}

/**
 * DASH Period rollup details (cross-tag badges) — generated helper.
 *
 * Pure function of (rollup): compares the Period's declared duration
 * against the MEDIA timeline coverage collected during the flatten
 * pass. Returns null when there is nothing to roll up (no timelines
 * seen) — the caller falls back to a plain label.
 *
 * One coverage per content type: video/audio AdaptationSets repeat
 * the SAME time span in different timescales — summing them would
 * double-count (the 19m-vs-4m false mismatch). The flatten pass dedups
 * identical shapes; here we take the MAX span across remaining
 * coverages (the media timeline length), not the sum.
 */
function periodRollupDetails(rollup, context = {}) {
    if (!rollup || !Array.isArray(rollup.coverages) || rollup.coverages.length === 0) {
        return null;
    }
    // Media span = longest single-timeline coverage (video and audio
    // describe the same time in different ticks — never sum them).
    let totalSec = 0;
    let totalSegs = 0;
    let open = false;
    for (const c of rollup.coverages) {
        const ts = Number(c.timescale);
        if (!Number.isFinite(ts) || ts <= 0) continue;
        const spanSec = c.ticks / ts;
        if (spanSec > totalSec) {
            totalSec = spanSec;
            totalSegs = c.segs;
        }
        if (c.open) open = true;
    }
    if (totalSegs === 0) return null;
    const declared = rollup.durationSec;
    // Live-aware mismatch, now-anchored. The old logic called ANY tail
    // Period of a dynamic manifest "pruned-live" — wrong: YOUR case is
    // a MID-manifest Period whose engine simply hadn't published its
    // full duration YET at this publishTime (36s listed of 4m declared,
    // live edge still approaching). Pruning only explains SHORTFALLS
    // (listed < declared) on a tail whose window already slid past.
    // Judged in order:
    //   1. No declared duration (open Period) → open verdict, no compare.
    //   2. OVERRUN (listed > declared) → ALWAYS error, live or not.
    //      DVR pruning only ever REMOVES listed coverage; nothing about
    //      live operation explains templates covering MORE than declared.
    //   3. SHORTFALL on the live tail → expected iff the publish clock
    //      says so: live edge (now) hasn't reached declared end yet
    //      (still publishing), or now is past it by more than the DVR
    //      window (pruned head). Otherwise (edge inside, window intact)
    //      a shortfall is a REAL gap → error.
    //   4. SHORTFALL mid-manifest/VOD → error.
    // Needs context.nowMs + context.astMs (wall clocks); without them
    // the tail shortfall degrades to neutral "live tail" info.
    const isLiveTail = !!rollup.isDynamic && !!rollup.isLastPeriod;
    const rawMismatch =
        declared !== null &&
        declared !== undefined &&
        Math.abs(declared - totalSec) > Math.max(1, declared * 0.02);
    const gapSec = declared !== null && declared !== undefined ? declared - totalSec : null;
    // Now-anchored tail judgment. Needs the publish clock (context
    // carries nowMs/astMs — thread from the badge call sites):
    //   periodStartWall + declared = declared end wall time.
    //   edgeAhead = declaredEnd is still in the future → publishing.
    //   prunedPast = now is beyond declaredEnd + DVR window → head gone.
    const nowMs = Number(context.nowMs);
    const astMs = Number(context.astMs);
    const startSec = Number(rollup.startSec);
    const hasClock =
        Number.isFinite(nowMs) && Number.isFinite(astMs) && Number.isFinite(startSec);
    const declaredEndMs = hasClock && declared !== null && declared !== undefined
        ? astMs + (startSec + declared) * 1000
        : null;
    const edgeAhead = declaredEndMs !== null && nowMs < declaredEndMs;
    const tsbMs = Number(rollup.tsbDepthSec) * 1000;
    const prunedPast =
        declaredEndMs !== null &&
        Number.isFinite(tsbMs) && tsbMs > 0 &&
        nowMs > declaredEndMs + tsbMs;
    // Overruns are ALWAYS errors (pruning only removes coverage, so an
    // overrun can never be a live artifact — the `gapSec < 0` arm of the
    // mismatch insight below handles them unconditionally).
    // Shortfalls on a live tail are expected IFF the clock says so —
    // otherwise they are real gaps, error severity kept.
    const tailExplained =
        isLiveTail &&
        gapSec !== null && gapSec > 0 &&
        (edgeAhead || prunedPast);
    const mismatch = rawMismatch && !(isLiveTail && gapSec !== null && gapSec > 0 && tailExplained);
    // Insight-first: the verdict (consistent / gap-or-overlap / open /
    // live-tail-explained) leads; the worked comparison stays as proof.
    // No raw rows — the timelines list their own coverage on their rows.
    return {
        label: 'Period Coverage',
        parsedValue:
            declared !== null && declared !== undefined
                ? `${formatDurationPill(totalSec)}${mismatch ? ' ⚠ mismatch' : ''} / ${formatDurationPill(declared)}`
                : `${formatDurationPill(totalSec)} · open`,
        mismatch,
        tooltipHtml: analysisHtml({
            rowsHtml: '',
            workedText:
                declared !== null && declared !== undefined
                    ? `Σ timelines ${mismatch ? '≠' : '='} Period@duration`
                    : null,
            verdict: null,
            timeline: null,
            insights: [
                mismatch
                    ? {
                          severity: 'error',
                          headline:
                              gapSec !== null && gapSec > 0
                                  ? `${formatDurationPill(gapSec)} of declared period has no template coverage — gap at the boundary?`
                                  : `${formatDurationPill(-gapSec) } of template overruns the declared period — overlap at the boundary?`,
                          body: 'Declared duration and summed SegmentTimeline coverage disagree beyond tolerance. Gaps stall the playhead (the whiteboard "after end" state); overlaps double-cover time and confuse seeking.',
                          facts: [
                              `declared ${formatDurationPill(declared)}`,
                              `covered ${formatDurationPill(totalSec)}`,
                              `${totalSegs} segs`,
                          ],
                      }
                    : rawMismatch && isLiveTail && gapSec !== null && gapSec > 0 && tailExplained
                      ? {
                            // Live tail shortfall EXPLAINED by the clock:
                            // still publishing (edge ahead of declared end)
                            // or pruned head (now past end + DVR window).
                            // Neutral severity: informative, not an error.
                            headline: `Live tail — ${formatDurationPill(totalSec)} listed of declared ${formatDurationPill(declared)} (${formatDurationPill(gapSec)} ${edgeAhead ? 'not yet published' : 'DVR-pruned'})`,
                            body: edgeAhead
                                ? 'The live edge has not reached this Period\u2019s declared end yet: the packager publishes the rest as time advances. Coverage grows with each manifest update.'
                                : 'The live edge moved past this Period plus the DVR window: the listed head fell off retention. What remains is the fetchable tail.',
                            facts: [
                                `listed ${formatDurationPill(totalSec)}`,
                                `declared ${formatDurationPill(declared)}`,
                                ...(rollup.tsbDepthSec ? [`DVR window ${formatDurationPill(rollup.tsbDepthSec)}`] : []),
                                `${totalSegs} segs`,
                            ],
                        }
                      : rawMismatch && isLiveTail && gapSec !== null && gapSec > 0
                        ? {
                              // Live tail shortfall the clock CANNOT explain
                              // (edge inside the window, retention intact) —
                              // keep the error: a real gap until proven
                              // otherwise. No clock at all degrades here too
                              // (honest: unjudgeable ≠ consistent).
                              severity: 'error',
                              headline: `${formatDurationPill(gapSec)} short of declared on the live tail — gap until proven otherwise`,
                              body: 'The live edge is inside the retention window, so neither still-publishing nor DVR pruning explains the shortfall. Treat as a boundary gap (playhead stalls) unless a manifest refresh fills it.',
                              facts: [
                                  `declared ${formatDurationPill(declared)}`,
                                  `covered ${formatDurationPill(totalSec)}`,
                                  `${totalSegs} segs`,
                              ],
                          }
                      : declared !== null && declared !== undefined
                        ? {
                              headline: `Fully covered — ${formatDurationPill(totalSec)} of declared ${formatDurationPill(declared)}`,
                              body: 'Every second the Period declares is backed by template coverage. Boundary handoffs should be seamless.',
                              facts: [`${totalSegs} segs`, `${rollup.coverages.length} timeline${rollup.coverages.length === 1 ? '' : 's'}`],
                          }
                        : {
                              headline: `Open period — ${formatDurationPill(totalSec)} listed so far${open ? ' plus an open tail' : ''}`,
                              body: 'No declared duration (live edge): coverage grows with each manifest update.',
                              facts: [`${totalSegs} segs so far`],
                          },
            ],
        }),
    };
}

/**
 * Variant-ladder rank for HLS BANDWIDTH / RESOLUTION / CODECS.
 *
 * The ladder (sorted peer bandwidths + pixel counts from the master
 * playlist variants) turns a bare number into a rank: "rung 2 of 4",
 * spacing gaps, codec outliers. Uncomputable (no ladder, unparseable
 * value) returns { rankable: false } so callers keep their local
 * insight instead of guessing.
 *
 * @returns {{ rankable: boolean, rank?: number, of?: number, spacingBelow?: number|null, spacingAbove?: number|null }}
 *   spacing = ratio to the adjacent rung (e.g. 2.0 = doubles).
 */
const ladderRank = ({ ladder, bw, px }) => {
    const no = { rankable: false };
    if (!Array.isArray(ladder) || ladder.length < 2) return no;
    const key = bw !== null && bw !== undefined ? 'bw' : px !== null && px !== undefined ? 'px' : null;
    if (!key) return no;
    const val = key === 'bw' ? Number(bw) : Number(px);
    if (!Number.isFinite(val) || val <= 0) return no;
    const vals = ladder
        .map((r) => (key === 'bw' ? r.bw : r.px))
        .filter((v) => Number.isFinite(v) && v > 0)
        .sort((a, b) => a - b);
    if (vals.length < 2) return no;
    // Nearest rung (tolerates rounding: exact match preferred).
    let best = 0;
    let bestDist = Infinity;
    vals.forEach((v, i) => {
        const dist = Math.abs(v - val) / Math.max(v, val);
        if (dist < bestDist) {
            bestDist = dist;
            best = i;
        }
    });
    if (bestDist > 0.05) return no; // not actually on the ladder
    const below = best > 0 ? val / vals[best - 1] : null;
    const above = best < vals.length - 1 ? vals[best + 1] / val : null;
    return { rankable: true, rank: best + 1, of: vals.length, spacingBelow: below, spacingAbove: above };
};

/** Greatest common divisor for aspect-ratio reduction (RESOLUTION pills). */
const gcd = (a, b) => {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b > 0) {
        const t = b;
        b = a % b;
        a = t;
    }
    return a || 1;
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
    // Relative position leads (T+23743h23m beats "14:19:03 UTC" for a
    // timeline anchored a day+ after AST); the absolute time stays in
    // the title attribute. verdict carries no AST field — recover it
    // from nowMs/edgeMs-agnostic startMs only when an anchor is known:
    // liveVerdict always sets anchorTimeMs on the verdict object below.
    const span =
        verdict.endMs === null
            ? relClock(verdict.startMs, verdict.anchorTimeMs ?? null)
            : `${relClock(verdict.startMs, verdict.anchorTimeMs ?? null)} → ${relClock(verdict.endMs, verdict.anchorTimeMs ?? null)}`;
    const segLine =
        verdict.kind === 'live' &&
        verdict.segCount > 1 &&
        verdict.segIndex
            ? `<div style="font-family:monospace;font-size:11px;opacity:.75">segment ${verdict.segIndex} of ${verdict.segCount}</div>`
            : '';
    return (
        `<div style="display:flex;align-items:center;gap:10px;margin:2px 0 8px;padding:7px 10px;border-radius:10px;` +
        `background:${theme.bg};border:1px solid ${theme.border}">` +
        `${verdictDot(verdict.kind)}<div>` +
        `<div style="font-weight:800;font-size:14px;letter-spacing:.04em;color:${theme.fg}">${escapeHtml(theme.label)}</div>` +
        `<div style="font-family:monospace;font-size:11px;opacity:.75" title="${escapeHtml(verdict.title)}">${escapeHtml(span)} UTC</div>` +
        segLine +
        `</div></div>`
    );
};

/**
 * Human wall time in real human hours: "Sat 14:19 UTC" for near
 * dates, "2026-10-11 14:19 UTC" beyond ~48h. Bare HH:MM:SS hides day
 * boundaries on multi-day live timelines — always include the day.
 */
const humanDateTime = (ms) => {
    try {
        const d = new Date(ms);
        if (Number.isNaN(d.getTime())) return '—';
        const now = Date.now();
        const sameWeek = Math.abs(now - ms) < 48 * 3600 * 1000;
        const iso = d.toISOString();
        if (sameWeek) {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return `${days[d.getUTCDay()]} ${iso.slice(11, 16)} UTC`;
        }
        return `${iso.slice(0, 16).replace('T', ' ')} UTC`;
    } catch {
        return '—';
    }
};

/**
 * Insight severity → card theme. Only two severities exist on purpose:
 * error (red, spec violation / will-fail playback) and warn (amber,
 * suspicious / degraded). Everything else is an insight (neutral).
 */
const SEVERITY_THEME = {
    error: {
        bg: 'rgba(239,68,68,.10)',
        border: 'rgba(239,68,68,.40)',
        fg: '#f87171',
        icon: '✕',
    },
    warn: {
        bg: 'rgba(245,158,11,.10)',
        border: 'rgba(245,158,11,.35)',
        fg: '#fbbf24',
        icon: '⚠',
    },
};

/**
 * Insight card: the reimagined Smart Analysis unit. Replaces the flat
 * detailRow tables with a headed card carrying one insight:
 *
 *   [icon] HEADLINE (fg-colored, bold)
 *          body prose (human explanation, not raw values)
 *          fact chips (mono, scannable numbers)
 *
 * @param {object} insight { headline, body?, facts?, severity? }
 *   severity 'error'|'warn' tints the card; omitted = neutral slate.
 */
const insightCard = (insight) => {
    if (!insight || !insight.headline) return '';
    const theme = SEVERITY_THEME[insight.severity] || {
        bg: 'rgba(148,163,184,.07)',
        border: 'rgba(148,163,184,.18)',
        fg: '#e2e8f0',
        icon: insight.icon || '◆',
    };
    const icon = SEVERITY_THEME[insight.severity]?.icon || insight.icon || '◆';
    const facts =
        Array.isArray(insight.facts) && insight.facts.length > 0
            ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">` +
              insight.facts
                  .map(
                      (f) =>
                          `<span style="font-family:monospace;font-size:10px;padding:2px 7px;border-radius:99px;background:rgba(2,6,23,.6);border:1px solid rgba(148,163,184,.2);color:#cbd5e1">${escapeHtml(f)}</span>`
                  )
                  .join('') +
              `</div>`
            : '';
    return (
        `<div style="display:flex;gap:9px;margin:2px 0 8px;padding:8px 11px;border-radius:10px;` +
        `background:${theme.bg};border:1px solid ${theme.border}">` +
        `<div style="font-size:13px;line-height:1.4;color:${theme.fg};flex-shrink:0">${escapeHtml(icon)}</div>` +
        `<div style="min-width:0">` +
        `<div style="font-weight:700;font-size:12px;color:${theme.fg};line-height:1.35">${escapeHtml(insight.headline)}</div>` +
        (insight.body
            ? `<div style="font-size:11px;line-height:1.5;color:#94a3b8;margin-top:2px">${escapeHtml(insight.body)}</div>`
            : '') +
        facts +
        `</div></div>`
    );
};

/**
 * Insight stack: renders the `insights` array of a SmartDetails object
 * as cards, ahead of (not instead of) the legacy hero/timeline/worked
 * blocks. Branches opt in by returning `insights: [...]`; legacy
 * `rowsHtml` keeps rendering underneath during the migration.
 */
const insightStack = (insights) => {
    if (!Array.isArray(insights) || insights.length === 0) return '';
    return insights.map(insightCard).join('');
};

/** Worked-calculation panel: substituted formula with its result. */
const workedPanel = (workedText) => {
    if (!workedText) return '';
    return (
        `<div style="margin:2px 0 8px;padding:7px 10px;border-radius:10px;` +
        `background:rgba(2,6,23,.55);border:1px solid rgba(148,163,184,.14)">` +
        `<div style="font-size:9px;text-transform:;letter-spacing:.12em;opacity:.55;margin-bottom:4px">Worked calculation</div>` +
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
    // Relative position leads; absolute wall time stays as the row
    // value's suffix so seek math remains checkable.
    const astBase = verdict.anchorTimeMs ?? null;
    const clock = (ms) =>
        astBase !== null
            ? `${relClock(ms, astBase)} · ${wallClock(ms)}`
            : `${wallClock(ms)} UTC`;
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
        `<div style="display:flex;justify-content:space-between;gap:1rem;padding:1px 0;">` +
        `<span style="opacity:.65">${escapeHtml(k)}</span>` +
        `<span style="font-family:monospace">${escapeHtml(v)}</span></div>`;
    return (
        `<div style="margin:2px 0 8px;padding:7px 10px;border-radius:10px;` +
        `background:rgba(2,6,23,.55);border:1px solid rgba(148,163,184,.14)">` +
        `<div style="font-size:9px;text-transform:;letter-spacing:.12em;opacity:.55;margin-bottom:6px">Timeline position</div>` +
        `<div title="${escapeHtml(`run ${clock(start)} → ${end !== null ? clock(end) : 'open-ended'}`)}" style="position:relative;height:14px;border-radius:7px;background:rgba(148,163,184,.12);overflow:hidden;margin-bottom:6px">` +
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
                ? `${clock(now)} (−SPD ${spdSec}s)`
                : `${clock(now)} (edge = now)`
        ) +
        `<div style="display:flex;align-items:center;gap:7px;margin-top:6px;padding-top:6px;border-top:1px solid rgba(148,163,184,.14);font-weight:700;font-size:12px;">` +
        `<span style="display:inline-block;width:7px;height:7px;border-radius:99px;background:${dot}"></span>` +
        `<span>${escapeHtml(status)}</span></div>` +
        `</div>`
    );
};

/** Compose hero + timeline + worked panel + detail rows for the sidebar/tooltips. */
/**
 * Composed Smart Analysis body. `insights` (new) render as cards first;
 * legacy blocks follow. Migration rule per branch: move the *meaning*
 * into insights, keep rowsHtml only for values the cards don't carry,
 * and never repeat what a parent panel shows (see suppressVerdictPanel
 * / parentSmartDetails in sidebar.js).
 */
const analysisHtml = ({ rowsHtml, workedText, verdict, timeline, insights }) =>
    `<div>${insightStack(insights)}${verdictHero(verdict)}${timeline ?? ''}${workedPanel(workedText)}<div>${rowsHtml}</div></div>`;

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
    // Slim child (d/t/r) panels when the S-aggregator parent panel renders
    // alongside: the parent already carries the run verdict + timeline.
    // Tree pills (renderBadge) are unaffected — only sidebar panels slim.
    const slimChildPanel = context.suppressVerdictPanel === true;

    // Period coverage panel: declared duration vs summed template
    // coverage (boundary gap/overlap detector). The rollup arrives via
    // context.periodRollup from the flatten pass (see renderer.js).
    // The wall clock (nowMs/anchorTime) anchors the live-tail judgment.
    if (shortKey === 'period') {
        const rollup = context.periodRollup ?? null;
        const details = rollup
            ? periodRollupDetails(rollup, { nowMs: context.now ?? null, astMs: context.anchorTime ?? null })
            : null;
        if (details) return details;
        // No timelines seen (e.g. SegmentBase/List periods): fall
        // through to the generic label below.
    }

    // SegmentTimeline aggregator: value carries the child S runs
    // (renderer.js passes them as `runs` in context). Answers the
    // timeline-level questions no single S can: total segments,
    // total coverage, cadence uniformity, and the whole-timeline
    // live-edge verdict.
    if (shortKey === 'segmenttimeline') {
        const runs = Array.isArray(context.runs) ? context.runs : null;
        const details = timelineAggregates({
            runs,
            timescale,
            tTicks: null,
            anchorTimeMs: context.anchorTime ?? null,
            nowMs: context.now ?? null,
            spd: context.spd,
            isSpdActive: context.isSpdActive,
            ptoTicks: context.pto ?? null,
        });
        if (!details) {
            return {
                label: 'Segment Timeline',
                parsedValue:
                    runs && runs.length > 0
                        ? `${runs.length} run${runs.length === 1 ? '' : 's'}`
                        : 'Empty timeline',
            };
        }
        // Insight-first: the verdict (where is this template *right
        // now*) leads; the composition (runs/cadence) follows as one
        // card; raw rows are gone (runs are listed on S rows already).
        const v = details.verdict;
        const insights = [];
        if (v && v.kind === 'live') {
            insights.push({
                headline: v.segCount > 1 && v.segIndex
                    ? `Live edge is inside segment ${v.segIndex} of ${details.totalSegs} — this template is on air now`
                    : 'Live edge is inside this template — on air now',
                body: 'The player fetches from this timeline at this instant. Anything before the edge is DVR, anything after is not yet published.',
                facts: [`edge seg ${v.segIndex ?? '—'}/${details.totalSegs}`, `Σ ${formatDurationPill(details.openEnded ? details.knownSec : details.totalSec)}`],
            });
        } else if (v && v.kind === 'future') {
            insights.push({
                headline: `This template starts ${v.label} — not yet published`,
                body: 'The whole timeline lies ahead of the live edge. Check the Period start: the template may belong to a future ad/content slot.',
                facts: [`starts ${v.label}`],
            });
        }
        insights.push(
            details.openEnded
                ? {
                      severity: 'warn',
                      headline: `Open-ended tail — ${details.totalSegs}+ segments and counting`,
                      body: 'r=-1 means the run continues to Period end: the true total is unknowable from this manifest. Coverage below is the listed minimum.',
                      facts: [`≥${details.totalSegs} segs`, `Σ ≥${formatDurationPill(details.knownSec)}`],
                  }
                : {
                      headline: `${details.totalSegs} segments in ${formatDurationPill(details.totalSec)}${details.runCount > 1 ? ` across ${details.runCount} runs` : ' in one run'}`,
                      body:
                          details.runCount > 1
                              ? details.uniformCadence
                                  ? 'Multiple S runs, one cadence — smooth playout, no re-anchoring inside the template.'
                                  : 'Cadence changes between runs (see Δ flags on the S rows) — each change is a potential splice or GOP switch.'
                              : 'Single run — the simplest template shape.',
                      facts:
                          details.runCount > 1
                              ? [`${details.runCount} runs`, `${details.totalSegs} segs`, `Σ ${formatDurationPill(details.totalSec)}`]
                              : [`${details.totalSegs} segs`, `Σ ${formatDurationPill(details.totalSec)}`],
                  }
        );
        return {
            label: 'Segment Timeline',
            parsedValue: details.openEnded
                ? `${details.totalSegs}+ segs · ${formatDurationPill(details.knownSec)} + open`
                : `${details.totalSegs} segs · ${formatDurationPill(details.totalSec)}`,
            tooltipHtml: analysisHtml({
                rowsHtml: '',
                workedText: details.workedText,
                verdict: details.verdict,
                timeline: timelineStrip({
                    verdict: details.verdict,
                    spd: context.spd,
                    isSpdActive: context.isSpdActive,
                    segDurMs: null,
                }),
                insights,
            }),
        };
    }

    // S-tag aggregator: the run as a realtime appointment. Raw ticks
    // (d/t/r rows) are gone — the tree already shows them, and the
    // parent duplicating them was the flagged duplication. What remains
    // is meaning: where the run sits in human time, whether it is live,
    // and the anchoring caveat (explicit t = discontinuity risk).
    if (shortKey === 's' && value && typeof value === 'object') {
        const attrs = value;
        const d = parseFloat(attrs.d ?? attrs.D ?? '');
        const rRaw = attrs.r ?? attrs.R ?? null;
        const t = attrs.t ?? attrs.T ?? null;
        const agg = sRunAggregates({
            dTicks: Number.isNaN(d) ? null : d,
            timescale,
            rCount: rRaw,
        });
        let parsedValue = `d=${attrs.d ?? attrs.D ?? '?'} r=${rRaw ?? '?'}`;
        let workedText = null;
        const parsedR = rRaw === null ? 0 : parseInt(rRaw, 10);
        const runR = !isNaN(parsedR) && parsedR >= 0 ? parsedR : 0;
        if (agg && !agg.openEnded) {
            parsedValue += ` ≈ ${formatDurationPill(agg.totalSec)} total`;
            workedText = `(${runR} + 1) × ${d} / ${timescale} = ${formatDurationPill(agg.totalSec)}`;
        } else if (agg?.openEnded) {
            parsedValue += ' · open run';
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
        const insights = [];
        // Re-anchor comparison runs OUTSIDE the verdict gate: it needs
        // only siblings + timescale (no wall clock), so the panel states
        // the verdict even for VOD / unknown-now contexts — same
        // prevRunComparison() as the tree pill, never disagreeing.
        // First run of a timeline (index 0) is NOT a warn: nothing
        // precedes it inside this timeline. Its t is checked against
        // the Period start offset instead (explicitT vs periodStartSec
        // below) — that comparison CAN be calculated, so we do it.
        if (t !== null && t !== undefined && String(t) !== '') {
            const runIdx = Number(context.sRunIndex) || 0;
            const hasSiblings = Array.isArray(context.sSiblings) && context.sSiblings.length > 0;
            const cmp = runIdx > 0 || hasSiblings
                ? prevRunComparison({
                      sSiblings: context.sSiblings ?? null,
                      sRunIndex: runIdx,
                      timescale,
                  })
                : { comparable: false, firstRun: true };
            void context.periodStartSec; // (kept threaded for future span checks; unused today)
            if (cmp.comparable && cmp.deltaTicks === 0) {
                insights.push({
                    headline: `Seamless continuation at t=${t} — previous run ends exactly here`,
                    body: 'The explicit anchor lands precisely on the previous run end: no gap, no overlap. Re-anchoring is harmless in this case.',
                    facts: [`t=${t}`, `prev end=${cmp.prevEndTick}`],
                });
            } else if (cmp.comparable && cmp.deltaTicks > 0) {
                insights.push({
                    severity: 'error',
                    headline: `Gap of ${formatDurationPill(cmp.gapSec)} — previous run ends at ${cmp.prevEndTick}, this run starts at ${t}`,
                    body: 'Uncovered ticks between runs: the playhead stalls here (the whiteboard "after end" state) until coverage resumes. Typical cause: ad splice or encoder reset with misaligned timelines.',
                    facts: [`gap ${formatDurationPill(cmp.gapSec)}`, `prev end=${cmp.prevEndTick}`, `t=${t}`],
                });
            } else if (cmp.comparable && cmp.deltaTicks < 0) {
                insights.push({
                    severity: 'warn',
                    headline: `Overlap of ${formatDurationPill(cmp.overlapSec)} — previous run ends at ${cmp.prevEndTick}, this run starts at ${t}`,
                    body: 'Double-covered ticks: two runs claim the same time. Seeking here is ambiguous and players may glitch or repeat content.',
                    facts: [`overlap ${formatDurationPill(cmp.overlapSec)}`, `prev end=${cmp.prevEndTick}`, `t=${t}`],
                });
            } else if (cmp.firstRun) {
                // Run 0 with explicit t: there is NOTHING to be
                // discontinuous against inside this timeline. The old code
                // compared t against the PTO as a "Period base" — wrong:
                // the PTO is a presentation offset, not the expected
                // first tick (your t=5683200 vs PTO=3072000 case proved
                // it: a 3m24s false "late" warn on a healthy timeline).
                // A first run is therefore ALWAYS neutral; the offset is
                // stated as position info, never as a warn.
                const tNum = Number(t);
                insights.push({
                    headline: `Timeline opens at t=${t} — first run, nothing precedes it`,
                    body: 'Run 0 has no previous run inside this timeline, so there is nothing to be discontinuous against. The explicit t sets the timeline origin; continuity is judged from run 1 onward.',
                    facts: [
                        `t=${t}`,
                        'first run',
                        ...(Number.isFinite(tNum) && timescale
                            ? [`${formatDurationPill(tNum / Number(timescale))} into timeline scale`]
                            : []),
                    ],
                });
            } else {
                insights.push({
                    severity: 'warn',
                    headline: 'Explicit start time — re-anchor point',
                    body: 'This run re-anchors the timeline instead of continuing the previous run. Sibling context is unavailable, so the previous run end could not be checked — inspect the neighboring S rows.',
                    facts: [`t=${t}`],
                });
            }
        }
        if (verdict && agg) {
            if (verdict.kind === 'live') {
                insights.push({
                    headline:
                        verdict.segCount > 1 && verdict.segIndex
                            ? `On air now — edge inside segment ${verdict.segIndex} of ${agg.segCount} as of ${humanDateTime(verdict.edgeMs)}`
                            : `On air now as of ${humanDateTime(verdict.edgeMs)}`,
                    body: 'The player fetches from this run at this instant. Segments before the edge are DVR, after it are unpublished.',
                    facts: [
                        `edge seg ${verdict.segIndex ?? '—'}/${agg.segCount}`,
                        `${humanDateTime(verdict.edgeMs)}`,
                        `run Σ ${formatDurationPill(agg.openEnded ? agg.segDurSec : agg.totalSec)}${agg.openEnded ? '/seg' : ''}`,
                    ],
                });
            } else if (verdict.kind === 'future') {
                insights.push({
                    headline: `Not yet published — starts ${verdict.label}`,
                    body: 'The whole run lies ahead of the live edge. If the playhead should be here, the manifest is behind.',
                    facts: [`starts ${verdict.label}`, `run Σ ${formatDurationPill(agg.openEnded ? agg.segDurSec : agg.totalSec)}${agg.openEnded ? '/seg' : ''}`],
                });
            } else {
                insights.push({
                    headline: agg.openEnded
                        ? `Open run, ${formatDurationPill(agg.segDurSec)} cadence — fetchable history (${verdict.label})`
                        : `${agg.segCount}×${formatDurationPill(agg.segDurSec)} run, fully in the past (${verdict.label})`,
                    body: agg.openEnded
                        ? 'r=-1: the run continues to Period end, so only the cadence is knowable — the total grows with each manifest update.'
                        : 'Ended run: every segment listed here is DVR (until it falls off the window).',
                    facts: agg.openEnded
                        ? [`${formatDurationPill(agg.segDurSec)}/seg`, verdict.label]
                        : [`${agg.segCount} segs`, `Σ ${formatDurationPill(agg.totalSec)}`],
                });
            }
        }
        return {
            label: 'S Span Aggregator',
            parsedValue,
            tooltipHtml: analysisHtml({
                rowsHtml: '',
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
                insights,
            }),
        };
    }

    // Repeat count: S-panel owns the run verdict + timeline (dedup
    // contract), so the r panel says only what r itself means — the
    // multiplier — plus the open-tail warn that only r can carry.
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
            return {
                label: 'Repeat Count',
                parsedValue:
                    typeof count === 'number'
                        ? `${count} × ${formatDurationPill(d / timescale)}`
                        : 'Repeat: Until End',
                tooltipHtml: analysisHtml({
                    rowsHtml: '',
                    workedText,
                    verdict: null,
                    timeline: null,
                    insights: [
                        r < 0
                            ? {
                                  severity: 'warn',
                                  headline: 'Open repeat — run continues to Period end',
                                  body: 'r=-1 has no knowable total: coverage grows with each manifest update. The S panel shows the listed minimum.',
                                  facts: [`${formatDurationPill(d / timescale)}/seg`, 'total unknowable'],
                              }
                            : {
                                  headline:
                                      r === 0
                                          ? `No repeat — single ${formatDurationPill(d / timescale)} segment`
                                          : `Repeats ${r}× — ${r + 1} segments of ${formatDurationPill(d / timescale)}`,
                                  body:
                                      r === 0
                                          ? 'One segment only. The run verdict lives on the S panel.'
                                          : 'The multiplier that turns one duration into a run. The run verdict lives on the S panel.',
                                  facts: [`${r + 1} segs`, `Σ ${formatDurationPill(((r + 1) * d) / timescale)}`],
                              },
                    ],
                }),
            };
        }
    }
    if (shortKey.includes('bandwidth') || shortKey.includes('bitrate')) {
        const num = parseInt(text, 10);
        if (!isNaN(num)) {
            // Ladder rank: with variant peers this becomes "rung k of
            // n" + spacing to neighbors (the ABR spacing question).
            // Without peers, the honest per-second-bytes fallback.
            const rank = ladderRank({
                ladder: Array.isArray(context.ladder) ? context.ladder : null,
                bw: num,
                px: null,
            });
            const spacingFacts = [];
            if (rank.rankable) {
                if (rank.spacingBelow !== null && rank.rank > 1) {
                    spacingFacts.push(
                        `${rank.spacingBelow.toFixed(1)}× above rung ${rank.rank - 1}${rank.spacingBelow > 2.5 ? ' — wide jump (quality cliff?)' : ''}`
                    );
                }
                if (rank.spacingAbove !== null && rank.rank < rank.of) {
                    spacingFacts.push(
                        `${rank.spacingAbove.toFixed(1)}× below rung ${rank.rank + 1}${rank.spacingAbove > 2.5 ? ' — wide jump (quality cliff?)' : ''}`
                    );
                }
            }
            return {
                label: 'Bitrate',
                parsedValue: rank.rankable
                    ? `${formatBitrate(num)} · rung ${rank.rank}/${rank.of}`
                    : formatBitrate(num),
                tooltipHtml: analysisHtml({
                    rowsHtml: '',
                    workedText: null,
                    verdict: null,
                    timeline: null,
                    insights: [
                        ...(rank.rankable
                            ? [
                                  {
                                      severity:
                                          rank.spacingBelow !== null && rank.spacingBelow > 3
                                              ? 'warn'
                                              : undefined,
                                      headline:
                                          rank.rank === rank.of
                                              ? `${formatBitrate(num)} — top rung (${rank.rank}/${rank.of}): the quality ceiling`
                                              : rank.rank === 1
                                                ? `${formatBitrate(num)} — bottom rung (${rank.rank}/${rank.of}): the survival quality`
                                                : `${formatBitrate(num)} — rung ${rank.rank} of ${rank.of}`,
                                      body:
                                          rank.spacingBelow !== null && rank.spacingBelow > 3
                                              ? 'Wide spacing below this rung: ABR drops here fall off a quality cliff. Consider an intermediate rung.'
                                              : 'Nominal rate the ABR algorithm budgets against — actual segment sizes vary (VBR).',
                                      facts: [`${formatBitrate(num)}`, `rung ${rank.rank}/${rank.of}`, ...spacingFacts],
                                  },
                              ]
                            : [
                                  {
                                      headline: `${formatBitrate(num)} ≈ ${formatBytes(num / 8)}/s of media`,
                                      body: 'Nominal rate the ABR algorithm budgets against — actual segment sizes vary (VBR). Compare with sibling Representations to read the ladder spacing.',
                                      facts: [formatBitrate(num), `${formatBytes(num / 8)}/s`],
                                  },
                              ]),
                    ],
                }),
            };
        }
    }
    if (shortKey.includes('range') && text.includes('-')) {
        const [start, end] = text.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
            const size = end - start + 1;
            return {
                label: 'Byte Range',
                parsedValue: `${formatBytes(size)} (${text})`,
                tooltipHtml: analysisHtml({
                    rowsHtml: '',
                    workedText: null,
                    verdict: null,
                    timeline: null,
                    insights: [
                        {
                            severity: size <= 0 ? 'error' : undefined,
                            headline:
                                size <= 0
                                    ? `Empty range ${text} — nothing to fetch`
                                    : `${formatBytes(size)} across bytes ${start}–${end}`,
                            body:
                                size <= 0
                                    ? 'End precedes start: the request is unsatisfiable (416) or yields zero bytes.'
                                    : 'Single-range fetch: one HTTP range request retrieves exactly this span. Adjacent ranges on sibling lines may merge into fewer requests.',
                            facts: [`${formatBytes(size)}`, `${start}–${end}`],
                        },
                    ],
                }),
            };
        }
    }
    // Fixed-cadence SegmentTemplate (no SegmentTimeline): duration is
    // ticks-per-segment and startNumber anchors numbering. Thin but
    // complete — flag the unconventional startNumber=0 (players handle
    // it, but tooling/tests often assume 1) as neutral info.
    if (
        (shortKey === 'startnumber' || shortKey === 'duration') &&
        timescale &&
        String(key ?? '').split('@')[0].toLowerCase() === 'segmenttemplate'
    ) {
        if (shortKey === 'startnumber') {
            const n = parseInt(text, 10);
            if (!Number.isNaN(n)) {
                return {
                    label: 'Start Number',
                    parsedValue: `#${n}`,
                    tooltipHtml: analysisHtml({
                        rowsHtml: '',
                        workedText: null,
                        verdict: null,
                        timeline: null,
                        insights: [
                            n === 0
                                ? {
                                      headline: 'Numbering starts at 0, not the conventional 1',
                                      body: 'Players handle it (first URL ends in 0.m4s), but packager tooling and ad-stitchers often assume 1-based numbering — verify segment URLs if splicing.',
                                      facts: ['first segment #0'],
                                  }
                                : {
                                      headline: `First segment is #${n}`,
                                      body: 'Numbering anchor for $Number$ templates: segment k lives at startNumber + k.',
                                      facts: [`#${n}`],
                                  },
                        ],
                    }),
                };
            }
        } else {
            const num = parseFloat(text);
            if (!Number.isNaN(num) && timescale > 0) {
                const seconds = num / timescale;
                return {
                    label: 'Segment Duration',
                    parsedValue: `${formatDurationPill(seconds)} fixed cadence`,
                    tooltipHtml: analysisHtml({
                        rowsHtml: '',
                        workedText: `${num} / ${timescale} = ${formatDurationPill(seconds)}`,
                        verdict: null,
                        timeline: null,
                        insights: [
                            {
                                headline: `Fixed ${formatDurationPill(seconds)} cadence — no timeline needed`,
                                body: 'Constant-duration template: segment k starts at (k − startNumber) × duration. Simpler than SegmentTimeline, but cannot express variable GOPs or splices.',
                                facts: [`${formatDurationPill(seconds)}/seg`, `${num} ticks`],
                            },
                        ],
                    }),
                };
            }
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
            // Dedup contract: the S panel owns run verdict + timeline,
            // so slimmed d/t children collapse to one insight line each
            // (their conversion + a pointer up), never a second hero.
            if (slimChildPanel && (shortKey === 'd' || shortKey === 't')) {
                return {
                    label: prettyKey(labelKey),
                    parsedValue: formatDurationPill(seconds),
                    tooltipHtml: analysisHtml({
                        rowsHtml: '',
                        workedText: `${num} / ${timescale} = ${formatDurationPill(seconds)}`,
                        verdict: null,
                        timeline: null,
                        insights: [
                            {
                                headline:
                                    shortKey === 'd'
                                        ? `Each segment lasts ${formatDurationPill(seconds)} — run verdict lives on the S panel`
                                        : `Run starts at tick ${num} — position verdict lives on the S panel`,
                                body: 'This attribute is one input to the run; the S panel judges the whole run so the two can never disagree.',
                                facts: [`${num} ticks`, `÷ ${timescale}`],
                            },
                        ],
                    }),
                };
            }
            let workedText = null;
            let verdict = null;
            let segDurMs = null;
            // Realtime insight: convert the tick position into the human
            // wall time it represents (the "when in real hours" ask).
            let whenInsight = null;
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
                        allAttributes['r'] ??
                        allAttributes['R'] ??
                        null,
                });
                const segDurRaw =
                    shortKey === 'd' ? num : parseFloat(siblingD);
                segDurMs =
                    !isNaN(segDurRaw) && timescale > 0
                        ? (segDurRaw / timescale) * 1000
                        : null;
                if (verdict && Number.isFinite(verdict.startMs)) {
                    whenInsight = {
                        headline: `In real time: ${humanDateTime(verdict.startMs)}${verdict.endMs !== null && Number.isFinite(verdict.endMs) ? ` → ${humanDateTime(verdict.endMs)}` : ''}`,
                        body: 'Tick position converted to the wall-clock window it represents — the human-hours view of this span.',
                        facts: [
                            relClock(verdict.startMs, verdict.anchorTimeMs ?? null),
                            ...(verdict.endMs !== null && Number.isFinite(verdict.endMs)
                                ? [relClock(verdict.endMs, verdict.anchorTimeMs ?? null)]
                                : []),
                        ],
                    };
                }
            }
            return {
                label: prettyKey(labelKey),
                parsedValue: formatDurationPill(seconds),
                tooltipHtml: analysisHtml({
                    rowsHtml: '',
                    workedText,
                    verdict,
                    timeline: timelineStrip({
                        verdict,
                        spd: context.spd,
                        isSpdActive: context.isSpdActive,
                        segDurMs,
                    }),
                    insights: whenInsight ? [whenInsight] : undefined,
                }),
            };
        }
    }
    // NOTE: the EXTINF fallback lived here; it now routes through
    // hlsPlaylistDetails with an empty playlist (see above) so the
    // panel shape is identical with/without playlist facts.
    // HLS RESOLUTION=W×H: the ladder-rung insight. Non-16:9 is the
    // warn case (letterboxing/pillarboxing or SAR trickery downstream).
    // With ladder context: rank among peers ("rung 2 of 4").
    if (shortKey === 'resolution') {
        const m = String(text).match(/^(\d+)x(\d+)$/);
        if (m) {
            const w = parseInt(m[1], 10);
            const h = parseInt(m[2], 10);
            const mp = ((w * h) / 1e6).toFixed(2);
            const g = gcd(w, h);
            const aspect = `${w / g}:${h / g}`;
            const odd = aspect !== '16:9' && aspect !== '4:3' && aspect !== '1:1';
            const rank = ladderRank({
                ladder: Array.isArray(context.ladder) ? context.ladder : null,
                bw: null,
                px: w * h,
            });
            return {
                label: 'Resolution',
                parsedValue: `${w}×${h} (${aspect})`,
                tooltipHtml: analysisHtml({
                    rowsHtml: '',
                    workedText: null,
                    verdict: null,
                    timeline: null,
                    insights: [
                        ...(rank.rankable
                            ? [
                                  {
                                      headline: `Rung ${rank.rank} of ${rank.of} by pixels — ${rank.rank === rank.of ? 'top rung (best quality)' : rank.rank === 1 ? 'bottom rung (fallback quality)' : 'mid-ladder'}`,
                                      body:
                                          rank.rank === rank.of
                                              ? 'Highest rung: the ABR ceiling. If the network sustains it, this is what plays.'
                                              : rank.rank === 1
                                                ? 'Lowest rung: the survival quality. If this stalls, nothing lower exists.'
                                                : 'Mid-ladder rung: the ABR workhorse zone.',
                                      facts: [`rung ${rank.rank}/${rank.of}`, `${mp} MP`, aspect],
                                  },
                              ]
                            : []),
                        {
                            severity: odd ? 'warn' : undefined,
                            headline: odd
                                ? `${w}×${h} is non-standard ${aspect} — expect letterbox, pillarbox, or SAR compensation`
                                : `${w}×${h} (${aspect}) — standard rung`,
                            body: odd
                                ? 'Unusual aspect usually means cropped content, anamorphic pixels, or a misconfigured encoder. Check sar/par nearby.'
                                : 'Fits the ladder cleanly; ABR switches between rungs without aspect flips.',
                            facts: [`${mp} MP`, aspect, `${w}×${h}`],
                        },
                    ],
                }),
            };
        }
    }
    // Period@start wall-clock anchoring sits BEFORE the generic PT
    // branch on purpose: the generic branch would shadow it with a
    // bare duration. Scoped to the Period tag (bare `start` elsewhere
    // — EXT-X-START, DATERANGE — must not inherit this panel).
    {
        const parentTag = String(
            (key ?? '').includes('@') ? String(key).split('@')[0] : ''
        ).toLowerCase();
        if (
            shortKey === 'start' &&
            parentTag === 'period' &&
            context.anchorTime !== null &&
            context.anchorTime !== undefined
        ) {
            const parsed = parseDuration(text);
            if (parsed) {
                const wall = Number(context.anchorTime) + parsed.total * 1000;
                // Insight-first: the realtime appointment leads (human
                // day+time); the T+ position and AST offset ride as fact
                // chips. No raw rows — the tree shows the PT string.
                return {
                    label: 'Period Start',
                    parsedValue: relClock(wall, context.anchorTime),
                    tooltipHtml: analysisHtml({
                        rowsHtml: '',
                        workedText: `AST + ${parsed.total}s`,
                        verdict: null,
                        timeline: null,
                        insights: [
                            {
                                headline: `Period begins ${humanDateTime(wall)} (${relClock(wall, context.anchorTime)} into the presentation)`,
                                body: 'Everything in this Period is anchored here: segment timelines, ad slots, and boundary handoffs all measure from this instant.',
                                facts: [humanDateTime(wall), relClock(wall, context.anchorTime), `AST+${formatDurationPill(parsed.total)}`],
                            },
                        ],
                    }),
                };
            }
        }
    }
    // ---- HLS playlist-level badges (need context.playlist) ----
    // These were impossible before the playlistContext upgrade: every
    // one compares the local value against playlist-wide facts from a
    // single scan (ceilings, relations, continuity, cue windows).
    // Placed before the legacy EXTINF branch so the ceiling-aware
    // panel wins whenever playlist facts exist. Also before the `r`
    // branch: HLS has no timescale, but attribute keys like
    // HOLD-BACK@... never collide — the real hazard is EXT-X-SERVER-
    // CONTROL attrs flowing through generic branches, handled inside
    // hlsPlaylistDetails by tagOf scoping.
    const playlist = context.playlist ?? null;
    if (playlist) {
        const hlsDetails = hlsPlaylistDetails(shortKey, text, playlist, key, context);
        if (hlsDetails) return hlsDetails;
    }
    // HLS EXTINF + PROGRAM-DATE-TIME evaluate WITHOUT playlist too
    // (their short keys never collide with DASH branches). Route them
    // to the same helper with an empty playlist so the panel shape is
    // identical, playlist-dependent rows reading 'unknown'.
    if (shortKey === 'extinf' || shortKey === 'ext-x-program-date-time') {
        const hlsDetails = hlsPlaylistDetails(shortKey, text, buildPlaylistContext(''), key, context);
        if (hlsDetails) return hlsDetails;
    }
    if (text.startsWith('PT')) {
        const parsed = parseDuration(text);
        if (parsed) {
            // Insight: what the duration governs depends on the key —
            // buffer floor, DVR window, poll cadence, or segment length.
            const role =
                shortKey.includes('minbuffertime')
                    ? 'Minimum buffer before playback may start — the startup contract. Larger values delay start but absorb more jitter.'
                    : shortKey.includes('timeshiftbufferdepth')
                      ? 'DVR window: how far behind the live edge content stays available. Older segments are implicitly deleted past this age.'
                      : shortKey.includes('minimumupdateperiod')
                        ? 'Manifest poll cadence: the client must wait at least this long between MPD refreshes. Lower = fresher timeline, higher server load.'
                        : shortKey.includes('suggestedpresentationdelay')
                          ? 'Recommended distance behind the live edge for stable playback — the latency-vs-safety dial. The timing calculator applies this as SPD.'
                          : shortKey.includes('media') && shortKey.includes('duration')
                            ? 'Total presentation length (VOD) or known event length (live with a planned end).'
                            : null;
            return {
                label: prettyKey(labelKey),
                parsedValue: formatDurationPill(parsed.total),
                tooltipHtml: analysisHtml({
                    rowsHtml: '',
                    workedText: `ISO 8601 ${text} = ${parsed.total}s`,
                    verdict: null,
                    timeline: null,
                    insights: role
                        ? [{ headline: `${formatDurationPill(parsed.total)} — ${prettyKey(labelKey)}`, body: role, facts: [`${parsed.total}s`] }]
                        : undefined,
                }),
            };
        }
    }
    if (shortKey === 'codecs') {
        // Insight: decode requirements per codec, not just the string.
        // Unknown/unsupported codes are the warn case (playback risk).
        // With ladder context: codec outliers (only rung with HEVC) +
        // mixed video codecs across rungs (ABR switches need decoder
        // re-init — a real switching hazard).
        const parts = text.split(',').map((c) => c.trim()).filter(Boolean);
        const known = {
            avc1: 'H.264/AVC — universal hardware decode',
            avc3: 'H.264/AVC — universal hardware decode',
            hev1: 'H.265/HEVC — needs HEVC hardware (check 4K devices)',
            hevc: 'H.265/HEVC — needs HEVC hardware (check 4K devices)',
            hvc1: 'H.265/HEVC — needs HEVC hardware (check 4K devices)',
            av01: 'AV1 — needs AV1 hardware (newer devices only)',
            vp09: 'VP9 — broad software decode, uneven hardware',
            mp4a: 'AAC audio — universal',
            ec_3: 'Dolby Digital+ — needs DD+ passthrough/decode',
            ac_4: 'Dolby AC-4 — needs AC-4 support (TVs mostly)',
        };
        const unknown = [...new Set(parts.map((c) => c.split('.')[0]))].filter(
            (c) => !known[c.toLowerCase()]
        );
        // Ladder codec consistency: video codec base (first part) must
        // match across rungs for seamless ABR; audio may differ.
        const ladder = Array.isArray(context.ladder) ? context.ladder : null;
        const thisVideo = (parts[0] || '').split('.')[0].toLowerCase();
        let ladderInsight = null;
        if (ladder && ladder.length > 1 && thisVideo) {
            const peers = ladder
                .map((r) => String(r.codecs || '').split(',')[0].trim().split('.')[0].toLowerCase())
                .filter(Boolean);
            const distinct = [...new Set(peers)];
            if (distinct.length > 1) {
                const sameCount = peers.filter((c) => c === thisVideo).length;
                ladderInsight = {
                    severity: 'warn',
                    headline: `Mixed video codecs across the ladder (${distinct.join(' vs ')}) — switches need decoder re-init`,
                    body: 'This rung uses ' + thisVideo + ' while ' + (peers.length - sameCount) + ' rung(s) use something else. ABR switches across codecs glitch or stall on strict players.',
                    facts: distinct,
                };
            } else if (peers.length > 1) {
                ladderInsight = {
                    headline: `Uniform ${thisVideo} across all ${peers.length} rungs — seamless switching`,
                    body: 'Every rung shares the video codec: ABR switches need no decoder re-init.',
                    facts: [thisVideo, `${peers.length} rungs`],
                };
            }
        }
        return {
            label: 'Codecs',
            parsedValue: text,
            tooltipHtml: analysisHtml({
                rowsHtml: '',
                workedText: null,
                verdict: null,
                timeline: null,
                insights: [
                    ...(unknown.length > 0
                        ? [
                              {
                                  severity: 'warn',
                                  headline: `Unrecognized codec${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}`,
                                  body: 'Not in the known hardware-decode table — verify player support before assuming playback works.',
                                  facts: unknown,
                              },
                          ]
                        : []),
                    ...(ladderInsight ? [ladderInsight] : []),
                    {
                        headline: `${parts.length} codec${parts.length === 1 ? '' : 's'} — decode requirements`,
                        body: parts
                            .map((c) => `${c}: ${known[c.split('.')[0].toLowerCase()] ?? 'unknown requirements'}`)
                            .join('. '),
                        facts: parts.slice(0, 4),
                    },
                ],
            }),
        };
    }
    // SegmentTemplate@media: addressing mode + substitution audit.
    // Insight: unexpanded tokens shift the failure (404 at fetch time,
    // not parse time) — flag tokens the calculator can't resolve.
    if (shortKey === 'media' && text.includes('$')) {
        const mode = text.includes('$Time$')
            ? 'time-addressed'
            : text.includes('$Number$')
              ? 'number-addressed'
              : 'template';
        const tokens = [...text.matchAll(/\$([A-Za-z]+)\$/g)].map((m) => m[0]);
        const known = ['$Time$', '$Number$', '$RepresentationID$', '$Bandwidth$'];
        const unknown = [...new Set(tokens)].filter((t) => !known.includes(t));
        return {
            label: 'Segment Template',
            parsedValue: mode,
            tooltipHtml: analysisHtml({
                rowsHtml: '',
                workedText: null,
                verdict: null,
                timeline: null,
                insights: [
                    ...(unknown.length > 0
                        ? [
                              {
                                  severity: 'error',
                                  headline: `Unknown token${unknown.length === 1 ? '' : 's'} ${unknown.join(', ')} will survive substitution`,
                                  body: 'Unresolved tokens ship verbatim into segment URLs → 404s at fetch time. Expected tokens: $Time$, $Number$, $RepresentationID$, $Bandwidth$.',
                                  facts: unknown,
                              },
                          ]
                        : []),
                    {
                        headline:
                            mode === 'time-addressed'
                                ? 'Time-addressed: seek by presentation time, robust to numbering restarts'
                                : 'Number-addressed: seek by sequence, fragile across Period restarts',
                        body:
                            mode === 'time-addressed'
                                ? 'Each URL carries its media time — seeking and DVR math work even when numbering restarts at Period boundaries.'
                                : 'URLs carry sequence numbers that restart per Period — cross-period seeks need the Period map, not arithmetic.',
                        facts: [mode === 'time-addressed' ? '$Time$' : '$Number$', ...tokens.slice(0, 3)],
                    },
                ],
            }),
        };
    }
    if (shortKey === 'frame-rate' || shortKey === 'framerate' || shortKey.includes('framerate')) {
        let fps = text;
        if (text.includes('/')) {
            const [n, d] = text.split('/');
            if (parseFloat(d) !== 0)
                fps = (parseFloat(n) / parseFloat(d)).toFixed(2);
        }
        const f = parseFloat(fps);
        // Insight: non-integer NTSC rates (30000/1001) vs integer +
        // the high-fps flag (>30 = 2× decode/bandwidth pressure).
        const ntsc = text.includes('/') && !Number.isInteger(f);
        const hfr = Number.isFinite(f) && f > 30;
        return {
            label: 'Frame Rate',
            parsedValue: `${fps} fps`,
            tooltipHtml: analysisHtml({
                rowsHtml: '',
                workedText: text.includes('/') ? `${text} = ${fps} fps` : null,
                verdict: null,
                timeline: null,
                insights: [
                    {
                        headline: ntsc
                            ? `${fps} fps NTSC — drop-frame timecode applies`
                            : hfr
                              ? `${fps} fps high-frame-rate — ~${(f / 30).toFixed(1)}× the decode/bandwidth pressure of 30fps`
                              : `${fps} fps standard rate`,
                        body: ntsc
                            ? 'Fractional NTSC rate: frame timestamps use drop-frame counting. Duration math must use the exact fraction, not 30.'
                            : hfr
                              ? 'HFR content: needs matching display + decoder headroom; ABR should budget accordingly.'
                              : 'Standard rate — no special handling.',
                        facts: [`${fps} fps`, ...(ntsc ? ['NTSC'] : []), ...(hfr ? ['HFR'] : [])],
                    },
                ],
            }),
        };
    }
    if (shortKey === 'sample-rate' || shortKey === 'audiosamplingrate') {
        // Insight: below 44.1k = quality flag; above 48k = hires.
        const sr = parseInt(text, 10);
        const low = Number.isFinite(sr) && sr < 44100;
        return {
            label: 'Sample Rate',
            parsedValue: `${text} Hz`,
            tooltipHtml: analysisHtml({
                rowsHtml: '',
                workedText: null,
                verdict: null,
                timeline: null,
                insights: [
                    {
                        severity: low ? 'warn' : undefined,
                        headline: low
                            ? `${text} Hz is below CD quality — expect audible loss on music`
                            : `${text} Hz ${sr >= 96000 ? '(hi-res)' : '(standard)'}`,
                        body: low
                            ? 'Sub-44.1k audio is usually voice-optimized or bandwidth-starved. Fine for speech, poor for music.'
                            : 'Covers the audible spectrum; resampling needs are minimal.',
                        facts: [`${text} Hz`],
                    },
                ],
            }),
        };
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

    // SegmentTimeline aggregate pills: the whole-template rollup no
    // single S can give — total segments, total coverage, cadence
    // uniformity — plus the union-span live-edge verdict. Rendered on
    // the <SegmentTimeline> tag itself (renderer.js passes child runs
    // as `runs` in context).
    if (shortKey === 'segmenttimeline') {
        const runs = Array.isArray(context.runs) ? context.runs : null;
        const details = timelineAggregates({
            runs,
            timescale,
            tTicks: null,
            anchorTimeMs: context.anchorTime ?? null,
            nowMs: context.now ?? null,
            spd: context.spd,
            isSpdActive: context.isSpdActive,
            ptoTicks: context.pto ?? null,
        });
        if (!details) return null;
        const pills = [];
        // 1. Headline rollup: total segments x total coverage.
        pills.push(
            details.openEnded
                ? pill(
                      'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
                      `${details.totalSegs}+ segs · Σ ${formatDurationPill(details.knownSec)}+`
                  )
                : pill(
                      'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
                      `${details.totalSegs} segs · Σ ${formatDurationPill(details.totalSec)}`
                  )
        );
        // 2. Cadence flag — only when runs disagree (the common,
        // uniform case needs no extra ink; S pills show the cadence).
        if (!details.uniformCadence) {
            pills.push(
                pill(
                    'bg-amber-500/20 text-amber-300 border border-amber-500/30',
                    'mixed cadence'
                )
            );
        }
        // 3. Union-span live-edge verdict for the whole timeline.
        const extra = verdictTreePill(details.verdict);
        if (extra) pills.push(extra);
        return pills.length === 1 ? pills[0] : pills;
    }

    // Period coverage pill: declared duration vs summed template
    // coverage (the boundary gap/overlap detector). Rendered on the
    // <Period> tag itself (renderer.js passes the flatten-pass rollup
    // as `periodRollup` in context). Same wall-clock anchoring as the
    // panel so pill and sidebar can never disagree.
    if (shortKey === 'period') {
        const rollup = context.periodRollup ?? null;
        const details = rollup
            ? periodRollupDetails(rollup, { nowMs: context.now ?? null, astMs: context.anchorTime ?? null })
            : null;
        if (!details) return null;
        return pill(
            details.mismatch
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
            `Σ ${details.parsedValue}${details.mismatch ? ' ⚠' : ''}`
        );
    }

    // S-tag aggregate pills (SegmentTimeline level): answer the run
    // questions the d/t/r pills can't — segment count, total coverage,
    // cadence — plus the live-edge verdict, plus the re-anchor warn.
    // Rendered on the <S> tag itself (renderer.js passes the attribute
    // map as `value`). The re-anchor warn lives HERE (not only in the
    // sidebar): an explicit t is a real timeline hazard and must warn
    // inline where the eye already is.
    if (shortKey === 's' && value && typeof value === 'object') {
        const attrs = value;
        const d = parseFloat(attrs.d ?? attrs.D ?? '');
        const rRaw = attrs.r ?? attrs.R ?? null;
        const t = attrs.t ?? attrs.T ?? null;
        const agg = sRunAggregates({ dTicks: d, timescale, rCount: rRaw });
        if (!agg) return null;
        const pills = [];
        // 0. Re-anchor verdict — FIRST pill so the hazard is unmissable.
        // With sibling context we judge the explicit t against the
        // previous run's end: seamless (neutral), gap (error — the
        // playhead stalls), overlap (warn — double-covered time).
        // Run 0 with explicit t is NOT warned: nothing precedes it, so
        // there is nothing to be discontinuous against. Its t is checked
        // against the Period timeline base instead (periodStartSec +
        // PTO); aligned = neutral anchor pill, offset = measured warn.
        // Only a LATER run with no computable comparison keeps the
        // generic warn.
        const hasExplicitT = t !== null && t !== undefined && String(t) !== '';
        if (hasExplicitT) {
            const runIdx = Number(context.sRunIndex) || 0;
            const hasSiblings = Array.isArray(context.sSiblings) && context.sSiblings.length > 0;
            const cmp = runIdx > 0 || hasSiblings
                ? prevRunComparison({
                      sSiblings: context.sSiblings ?? null,
                      sRunIndex: runIdx,
                      timescale,
                  })
                : { comparable: false, firstRun: true };
            void context; // (periodBaseTick removed: PTO is not a base)
            if (cmp.comparable && cmp.deltaTicks === 0) {
                pills.push(
                    pill(
                        'bg-teal-500/20 text-teal-300 border border-teal-500/30',
                        `✓ continues @${t}`
                    )
                );
            } else if (cmp.comparable && cmp.deltaTicks > 0) {
                pills.push(
                    pill(
                        'bg-red-500/20 text-red-300 border border-red-500/30',
                        `⚠ gap ${formatDurationPill(cmp.gapSec)} @${t}`
                    )
                );
            } else if (cmp.comparable && cmp.deltaTicks < 0) {
                pills.push(
                    pill(
                        'bg-amber-500/20 text-amber-300 border border-amber-500/30',
                        `⚠ overlap ${formatDurationPill(cmp.overlapSec)} @${t}`
                    )
                );
            } else if (cmp.firstRun) {
                // First run: NO pill. Nothing precedes it, and the PTO
                // is a presentation offset — not the expected first tick
                // — so any comparison against it is a false warn (the
                // t=5683200 vs PTO=3072000 "3m24s late" proved it).
                // The sidebar states the origin neutrally instead.
            } else {
                pills.push(
                    pill(
                        'bg-amber-500/20 text-amber-300 border border-amber-500/30',
                        `⚠ re-anchor t=${t}`
                    )
                );
            }
        }
        // 1. Run length — the headline aggregate (count x cadence).
        pills.push(
            agg.openEnded
                ? pill(
                      'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
                      `open run · ${formatDurationPill(agg.segDurSec)}/seg`
                  )
                : pill(
                      'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
                      `${agg.segCount}×${formatDurationPill(agg.segDurSec)}`
                  )
        );
        // 2. Total coverage — redundant for single-segment runs, where
        // the d pill already says it; the count pill above carries it.
        if (!agg.openEnded && agg.segCount > 1) {
            pills.push(
                pill(
                    'bg-teal-500/20 text-teal-300 border border-teal-500/30',
                    `Σ ${formatDurationPill(agg.totalSec)}`
                )
            );
        }
        // 3. Live-edge verdict for the whole run (not just first seg).
        const verdict = liveVerdict({
            tTicks: t ?? null,
            dTicks: Number.isNaN(d) ? null : d,
            timescale,
            anchorTimeMs: context.anchorTime ?? null,
            nowMs: context.now ?? null,
            spd: context.spd,
            isSpdActive: context.isSpdActive,
            ptoTicks: context.pto ?? null,
            rCount: rRaw,
        });
        const extra = verdictTreePill(verdict);
        if (extra) pills.push(extra);
        return pills.length === 1 ? pills[0] : pills;
    }

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
            // Ladder rank inline: "rung k/n" when peers are known.
            const rank = ladderRank({
                ladder: Array.isArray(context.ladder) ? context.ladder : null,
                bw: num,
                px: null,
            });
            return pill(
                'bg-emerald-500/10 text-emerald-200 border border-emerald-400/25',
                rank.rankable ? `${formatBitrate(num)} · ${rank.rank}/${rank.of}` : formatBitrate(num)
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

    // Fixed-cadence SegmentTemplate tree pills: duration as cadence +
    // startNumber anchor (mirrors the getDetails panels above).
    if (
        String(key ?? '').split('@')[0].toLowerCase() === 'segmenttemplate' &&
        timescale
    ) {
        if (shortKey === 'duration') {
            const num = parseFloat(text);
            if (!isNaN(num) && timescale > 0) {
                return pill(
                    'bg-teal-500/20 text-teal-300 border border-teal-500/30',
                    `${formatDurationPill(num / timescale)}/seg`
                );
            }
        }
        if (shortKey === 'startnumber') {
            const n = parseInt(text, 10);
            if (!Number.isNaN(n)) {
                return pill(
                    n === 0
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-white/5 text-slate-300 border border-slate-600',
                    `#${n}${n === 0 ? ' ⚠' : ''}`
                );
            }
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
            // Pure duration pill. The live-edge verdict used to hang off
            // `d` here, but it only ever saw the first segment's span
            // while reading as if it judged the run — now that the S
            // tag carries the run-wide verdict, `d` stays a plain
            // duration (the S details panel still covers verdict math).
            return pill(
                'bg-teal-500/20 text-teal-300 border border-teal-500/30',
                formatDurationPill(seconds)
            );
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

    // Period@start tree pill: relative position (T+23743h29m), never the
    // absolute hour. Mirrors the getDetails panel above; scoped to the
    // Period tag so other `start` keys keep their generic pills.
    if (
        shortKey === 'start' &&
        String(key ?? '').split('@')[0].toLowerCase() === 'period' &&
        context.anchorTime !== null &&
        context.anchorTime !== undefined
    ) {
        const parsed = parseDuration(text);
        if (parsed) {
            const wall = Number(context.anchorTime) + parsed.total * 1000;
            return pill(
                'bg-teal-500/20 text-teal-300 border border-teal-500/30',
                relClock(wall, context.anchorTime)
            );
        }
    }

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

    // SegmentTemplate@media mode pill (tree): time vs number addressing.
    if (shortKey === 'media' && text.includes('$')) {
        const mode = text.includes('$Time$') ? '$Time$' : '$Number$';
        return pill(
            'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
            mode
        );
    }
    if (shortKey === 'codecs') {
        const codecList = text.split(',').map((c) => c.trim().split('.')[0]);
        return html`<span class="ml-0.5 mr-1 inline-flex gap-1 align-middle"
            >${codecList.map(
                (c) =>
                    html`<span
                        class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/5 text-slate-300 border border-white/10 select-none whitespace-nowrap leading-none h-4"
                        >${c.toUpperCase()}</span
                    >`
            )}</span
        >`;
    }

    if (shortKey === 'width' || shortKey === 'height') {
        return pill('bg-transparent text-slate-500 border border-transparent', 'px');
    }

    // Hyphen-insensitive match: DASH uses FRAMERATE, HLS uses FRAME-RATE.
    if (
        shortKey.includes('framerate') ||
        shortKey.includes('frame-rate')
    ) {
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

    // Hyphen-insensitive match: DASH AUDIOSAMPLINGRATE, HLS SAMPLE-RATE.
    if (
        shortKey.includes('samplingrate') ||
        shortKey.includes('sample-rate')
    ) {
        return pill(
            'bg-pink-500/20 text-pink-300 border border-pink-500/30',
            `${text} Hz`
        );
    }

    // HLS RESOLUTION=W×H pill (tree): megapixels inline.
    if (shortKey === 'resolution') {
        const m = String(text).match(/^(\d+)x(\d+)$/);
        if (m) {
            const w = parseInt(m[1], 10);
            const h = parseInt(m[2], 10);
            return pill(
                'bg-emerald-500/10 text-emerald-200 border border-emerald-400/25',
                `${w}×${h} · ${((w * h) / 1e6).toFixed(1)}MP`
            );
        }
    }

    // HLS EXTINF tag-value pill (tree): duration + ceiling verdict.
    if (shortKey === 'extinf') {
        const num = parseFloat(text);
        if (!isNaN(num) && num >= 0) {
            const ceil = context.playlist?.targetDuration ?? null;
            const over = ceil !== null && num > ceil;
            return pill(
                over
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
                `${formatDurationPill(num)}${over ? ' ⚠' : ''}`
            );
        }
    }

    // HLS TARGETDURATION pill (tree): ceiling + overrun flag.
    if (shortKey === 'ext-x-targetduration') {
        const num = parseFloat(text);
        if (Number.isFinite(num)) {
            const over =
                (context.playlist?.extinfMax ?? 0) > num &&
                (context.playlist?.extinfCount ?? 0) > 0;
            return pill(
                over
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
                `⌛ ${formatDurationPill(num)}${over ? ' ⚠' : ''}`
            );
        }
    }

    // HLS MEDIA-SEQUENCE pill (tree): window position.
    if (shortKey === 'ext-x-media-sequence') {
        const num = parseInt(text, 10);
        if (Number.isFinite(num)) {
            return pill(
                'bg-white/5 text-slate-300 border border-slate-600',
                `#${num}`
            );
        }
    }

    // HLS discontinuity pills (tree): break count.
    if (shortKey === 'ext-x-discontinuity') {
        const n = context.playlist?.discontinuities?.length ?? 0;
        return pill(
            'bg-amber-500/20 text-amber-300 border border-amber-500/30',
            n > 0 ? `⚡ ${n} break${n === 1 ? '' : 's'}` : '⚡ break'
        );
    }

    // HLS ENDLIST pill (tree): VOD marker.
    if (shortKey === 'ext-x-endlist') {
        return pill(
            'bg-emerald-500/10 text-emerald-200 border border-emerald-400/25',
            '■ VOD'
        );
    }

    // HLS KEY METHOD pill (tree): encryption posture.
    if (shortKey === 'method' && String(key ?? '').split('@')[0].toLowerCase() === 'ext-x-key') {
        const methods = context.playlist?.keyMethods?.length
            ? context.playlist.keyMethods
            : [text];
        const encrypted = methods.some((m) => m && m.toUpperCase() !== 'NONE');
        return pill(
            encrypted
                ? 'bg-white/5 text-slate-300 border border-white/10'
                : 'bg-white/5 text-slate-300 border border-slate-600',
            encrypted ? `🔒 ${methods.join('+')}` : 'clear'
        );
    }

    // HLS PROGRAM-DATE-TIME pill (tree): compact date+time (day
    // included — a bare HH:MM:SS hides day boundaries on multi-day
    // live playlists). Full ISO lives in the sidebar panel.
    if (shortKey === 'ext-x-program-date-time') {
        const t = Date.parse(text);
        return pill(
            'bg-white/5 text-slate-300 border border-slate-600',
            Number.isFinite(t)
                ? new Date(t).toISOString().slice(0, 16).replace('T', ' ')
                : text.slice(0, 16)
        );
    }

    // HLS HOLD-BACK pills (tree): latency budget in target multiples.
    if (shortKey === 'hold-back' || shortKey === 'part-hold-back') {
        const num = parseFloat(text);
        if (Number.isFinite(num)) {
            const isPart = shortKey === 'part-hold-back';
            const target = isPart
                ? context.playlist?.partTarget
                : context.playlist?.targetDuration;
            const mult = target ? num / target : null;
            return pill(
                'bg-orange-500/20 text-orange-300 border border-orange-500/30',
                mult !== null ? `⏱ ${mult.toFixed(1)}×` : `⏱ ${formatDurationPill(num)}`
            );
        }
    }

    if (shortKey === 'par' || shortKey === 'sar') {
        const [w, h] = text.split(':').map(Number);
        if (!isNaN(w) && !isNaN(h)) {
            return pill(
                'bg-white/5 text-slate-300 border border-slate-600',
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

/**
 * Playlist-level context for HLS badges (the architectural upgrade).
 *
 * Single-attribute badges can only answer "what is this value"; the
 * rejected improvements all needed playlist-wide facts: TARGETDURATION
 * ceilings, PART-TARGET vs TARGETDURATION relations, HOLD-BACK as
 * multiples of the target, MEDIA-SEQUENCE continuity, ENDLIST presence
 * (VOD vs live), KEY rotation scopes, DATERANGE ad windows,
 * PROGRAM-DATE-TIME mapping, and discontinuity grouping.
 *
 * buildPlaylistContext() runs ONE linear scan over the raw playlist
 * text and returns a frozen summary object. The HLS renderer computes
 * it once per manifest string, threads it into every renderSmartToken
 * call as `extra.playlist`, and stamps it on hovered/selected items
 * as `context.playlist` — badges stay pure functions of
 * (key, value, context) and unit-testable with hand-built contexts.
 *
 * Cost: one O(lines) pass per manifest render; the renderer caches by
 * manifest string identity so scrolling/polling re-renders are free.
 *
 * @returns {object} frozen playlist summary (see fields below).
 */
export function buildPlaylistContext(manifestString) {
    const empty = {
        targetDuration: null,
        partTarget: null,
        holdBack: null,
        partHoldBack: null,
        canSkipUntil: null,
        canBlockReload: null,
        mediaSequence: 0,
        discontinuitySequence: 0,
        hasEndList: false,
        playlistType: null,
        version: null,
        extinfCount: 0,
        extinfTotal: 0,
        extinfMax: 0,
        partCount: 0,
        partTotal: 0,
        discontinuityCount: 0,
        keyMethods: [],
        daterangeCount: 0,
        hasProgramDateTime: false,
        mapUri: null,
        independentSegments: false,
        // Per-cue DATERANGE windows: { id, startOffsetSec, durationSec,
        // plannedDurationSec, className, endOffsetSec } — offsets in
        // playlist seconds from the first segment start (EXTINF sum).
        dateranges: [],
        // Discontinuity groups: [{ atSegment, sequence }] — segment
        // index (0-based EXTINF count) where each EXT-X-DISCONTINUITY
        // tag appeared, with the running discontinuity sequence.
        discontinuities: [],
    };
    if (!manifestString || typeof manifestString !== 'string') {
        return Object.freeze({ ...empty });
    }
    const ctx = { ...empty, keyMethods: [], dateranges: [], discontinuities: [] };
    const attrList = (s) => {
        const out = {};
        const re = /([A-Z0-9-]+)=((?:"[^"]*")|(?:[^",\s]+))/g;
        let m;
        while ((m = re.exec(s)) !== null) {
            out[m[1]] = m[2].replace(/^"|"$/g, '');
        }
        return out;
    };
    let playlistSec = 0; // running EXTINF sum = cue offset clock
    let segIndex = 0;
    let discSeq = 0;
    for (const rawLine of manifestString.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line.startsWith('#')) {
            continue; // URIs carry no playlist facts (badges map them)
        }
        if (line.startsWith('#EXTINF:')) {
            const dur = parseFloat(line.slice(8));
            if (Number.isFinite(dur) && dur >= 0) {
                ctx.extinfCount += 1;
                ctx.extinfTotal += dur;
                if (dur > ctx.extinfMax) ctx.extinfMax = dur;
                playlistSec += dur;
                segIndex += 1;
            }
            continue;
        }
        const colon = line.indexOf(':');
        const tag = colon === -1 ? line.slice(1) : line.slice(1, colon);
        const val = colon === -1 ? '' : line.slice(colon + 1);
        switch (tag) {
            case 'EXT-X-TARGETDURATION': {
                const n = parseInt(val, 10);
                if (Number.isFinite(n)) ctx.targetDuration = n;
                break;
            }
            case 'EXT-X-PART-INF': {
                const a = attrList(val);
                if (a['PART-TARGET'] !== undefined) {
                    const n = parseFloat(a['PART-TARGET']);
                    if (Number.isFinite(n)) ctx.partTarget = n;
                }
                break;
            }
            case 'EXT-X-SERVER-CONTROL': {
                const a = attrList(val);
                for (const k of ['HOLD-BACK', 'PART-HOLD-BACK', 'CAN-SKIP-UNTIL']) {
                    if (a[k] !== undefined) {
                        const n = parseFloat(a[k]);
                        if (Number.isFinite(n)) {
                            if (k === 'HOLD-BACK') ctx.holdBack = n;
                            else if (k === 'PART-HOLD-BACK') ctx.partHoldBack = n;
                            else ctx.canSkipUntil = n;
                        }
                    }
                }
                if (a['CAN-BLOCK-RELOAD'] !== undefined) {
                    ctx.canBlockReload = a['CAN-BLOCK-RELOAD'];
                }
                break;
            }
            case 'EXT-X-MEDIA-SEQUENCE': {
                const n = parseInt(val, 10);
                if (Number.isFinite(n)) ctx.mediaSequence = n;
                break;
            }
            case 'EXT-X-DISCONTINUITY-SEQUENCE': {
                const n = parseInt(val, 10);
                if (Number.isFinite(n)) {
                    ctx.discontinuitySequence = n;
                    discSeq = n;
                }
                break;
            }
            case 'EXT-X-DISCONTINUITY':
                ctx.discontinuities.push({ atSegment: segIndex, sequence: discSeq });
                discSeq += 1;
                ctx.discontinuityCount += 1;
                break;
            case 'EXT-X-ENDLIST':
                ctx.hasEndList = true;
                break;
            case 'EXT-X-PLAYLIST-TYPE':
                ctx.playlistType = val.trim();
                break;
            case 'EXT-X-VERSION': {
                const n = parseInt(val, 10);
                if (Number.isFinite(n)) ctx.version = n;
                break;
            }
            case 'EXT-X-INDEPENDENT-SEGMENTS':
                ctx.independentSegments = true;
                break;
            case 'EXT-X-PART': {
                const a = attrList(val);
                if (a.DURATION !== undefined) {
                    const n = parseFloat(a.DURATION);
                    if (Number.isFinite(n) && n >= 0) {
                        ctx.partCount += 1;
                        ctx.partTotal += n;
                    }
                }
                break;
            }
            case 'EXT-X-KEY': {
                const a = attrList(val);
                if (a.METHOD && !ctx.keyMethods.includes(a.METHOD)) {
                    ctx.keyMethods.push(a.METHOD);
                }
                break;
            }
            case 'EXT-X-MAP': {
                const a = attrList(val);
                if (a.URI) ctx.mapUri = a.URI;
                break;
            }
            case 'EXT-X-DATERANGE': {
                const a = attrList(val);
                ctx.daterangeCount += 1;
                const dur = a.DURATION !== undefined ? parseFloat(a.DURATION) : NaN;
                const planned = a['PLANNED-DURATION'] !== undefined ? parseFloat(a['PLANNED-DURATION']) : NaN;
                const startDate = a['START-DATE'] ? Date.parse(a['START-DATE']) : NaN;
                const endDate = a['END-DATE'] ? Date.parse(a['END-DATE']) : NaN;
                let startOffsetSec = playlistSec;
                let durationSec = Number.isFinite(dur) ? dur : null;
                if (Number.isFinite(startDate) && Number.isFinite(endDate)) {
                    durationSec = (endDate - startDate) / 1000;
                } else if (durationSec === null && Number.isFinite(planned)) {
                    durationSec = planned;
                }
                ctx.dateranges.push({
                    id: a.ID ?? null,
                    className: a.CLASS ?? null,
                    startOffsetSec,
                    durationSec,
                    plannedDurationSec: Number.isFinite(planned) ? planned : null,
                    endOffsetSec:
                        durationSec !== null ? startOffsetSec + durationSec : null,
                    scte35Cmd: a['SCTE35-CMD'] ?? null,
                });
                break;
            }
            case 'EXT-X-PROGRAM-DATE-TIME':
                ctx.hasProgramDateTime = true;
                break;
            default:
                break;
        }
    }
    return Object.freeze(ctx);
}

export const SmartBadgeService = { getDetails, renderBadge };
