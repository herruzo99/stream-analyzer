// Low-latency stream analysis (protocol plan item 2).
//
// Pure functions over the IR the HLS and DASH parsers already produce:
//   - HLS: segments carry `parts[]` (EXT-X-PART), the playlist carries
//     `partInf` (EXT-X-PART-INF), `preloadHints` (EXT-X-PRELOAD-HINT) and
//     `serverControl` (EXT-X-SERVER-CONTROL).
//   - DASH: periods carry `serviceDescriptions[].latencies[]`
//     (ServiceDescription/Latency) and `playbackRates[]`.
//
// Everything here is DOM-free and heux-contract tested; the UI and the
// timeline feature consume these view models.

const DEFAULT_PART_TARGET_MS = 350; // RFC 8216bis RECOMMENDED when unspecified
const PART_TARGET_TOLERANCE = 0.25; // ±25% of PART-TARGET counts as conformant
const MIN_PARTS_PER_SEGMENT = 2; // below this a "part" listing is suspect

/** Wrap a playlist-relative part/segment URI to an absolute one if a base is known. */
function resolve(baseUrl, uri) {
    if (!uri || typeof uri !== 'string') return null;
    if (/^https?:\/\//i.test(uri)) return uri;
    if (!baseUrl) return uri;
    try {
        return new URL(uri, baseUrl).href;
    } catch {
        return uri;
    }
}

/**
 * Build the per-segment part timeline for an HLS media playlist.
 *
 * @param {object} manifest HLS IR (see parsing/hls/parser.js)
 * @returns {{
 *   protocol: 'hls', isLowLatency: boolean,
 *   partInf: object|null, partTargetMs: number|null, partTargetSource: string,
 *   serverControl: {canBlockReload:boolean, canSkipUntil:number|null, canSkipDateRanges:boolean, holdBack:number|null, partHoldBack:number|null},
 *   segments: Array<{index:number, uri:string|null, durationSec:number|null, parts:Array<{index:number, uri:string, durationSec:number|null, independent:boolean, lineNumber:number|null}>, partCount:number, partsTotalSec:number, firstLine:number|null}>,
 *   totals: {segments:number, parts:number, independentParts:number},
 *   preloadHints: Array<object>
 * }}
 *
 * @typedef {{id:string, severity:'info'|'warn'|'error', message:string}} LlIssue
 */
export function buildHlsPartTimeline(manifest) {
    const partInf = manifest?.partInf ?? null;
    const partTargetMs = partInf?.['PART-TARGET']
        ? Math.round(parseFloat(partInf['PART-TARGET']) * 1000)
        : null;
    const segments = Array.isArray(manifest?.segments) ? manifest.segments : [];

    const rows = segments.map((seg, index) => {
        const parts = (Array.isArray(seg.parts) ? seg.parts : []).map(
            (p, pi) => ({
                index: pi,
                uri: resolve(
                    manifest?.url ?? manifest?.baseUrl,
                    p.URI ?? p.resolvedUri
                ),
                durationSec: p.DURATION != null ? parseFloat(p.DURATION) : null,
                independent: String(p.INDEPENDENT).toLowerCase() === 'yes',
                lineNumber: p.lineNumber ?? null,
            })
        );
        const partsTotalSec = parts.reduce(
            (sum, p) => sum + (p.durationSec ?? 0),
            0
        );
        return {
            index,
            uri: resolve(manifest?.url ?? manifest?.baseUrl, seg.uri),
            durationSec: seg.duration != null ? parseFloat(seg.duration) : null,
            parts,
            partCount: parts.length,
            partsTotalSec: Math.round(partsTotalSec * 1000) / 1000,
            firstLine: parts[0]?.lineNumber ?? null,
        };
    });

    const withParts = rows.filter((r) => r.partCount > 0);
    return {
        protocol: 'hls',
        isLowLatency:
            !!partInf ||
            withParts.length > 0 ||
            isServerControlLl(manifest?.serverControl),
        partInf: partInf ?? null,
        partTargetMs,
        partTargetSource: partTargetMs != null ? 'EXT-X-PART-INF' : 'default',
        serverControl: normalizeServerControl(manifest?.serverControl),
        segments: rows,
        totals: {
            segments: rows.length,
            parts: rows.reduce((n, r) => n + r.partCount, 0),
            independentParts: rows.reduce(
                (n, r) => n + r.parts.filter((p) => p.independent).length,
                0
            ),
        },
        preloadHints: Array.isArray(manifest?.preloadHints)
            ? manifest.preloadHints
            : [],
    };
}

function isServerControlLl(sc) {
    if (!sc) return false;
    return (
        String(sc['CAN-BLOCK-RELOAD']).toLowerCase() === 'yes' ||
        parseFloat(sc['CAN-SKIP-UNTIL']) > 0 ||
        parseFloat(sc['PART-HOLD-BACK']) > 0
    );
}

function normalizeServerControl(sc) {
    return {
        canBlockReload:
            String(sc?.['CAN-BLOCK-RELOAD']).toLowerCase() === 'yes',
        canSkipUntil:
            sc?.['CAN-SKIP-UNTIL'] != null
                ? parseFloat(sc['CAN-SKIP-UNTIL'])
                : null,
        canSkipDateRanges:
            String(sc?.['CAN-SKIP-DATERANGES']).toLowerCase() === 'yes',
        holdBack:
            sc?.['HOLD-BACK'] != null ? parseFloat(sc['HOLD-BACK']) : null,
        partHoldBack:
            sc?.['PART-HOLD-BACK'] != null
                ? parseFloat(sc['PART-HOLD-BACK'])
                : null,
    };
}

/**
 * LL-HLS conformance and quality checks over the part timeline.
 *
 * @param {ReturnType<typeof buildHlsPartTimeline>} timeline
 * @returns {Array<{id:string, severity:'info'|'warn'|'error', message:string}>}
 */
export function hlsLlCompliance(timeline) {
    /** @type {LlIssue[]} */
    const issues = [];
    if (!timeline?.partInf && (timeline?.totals?.parts ?? 0) > 0) {
        issues.push({
            id: 'll-hls.part-inf-missing',
            severity: 'warn',
            message:
                'Playlist has EXT-X-PART lines but no EXT-X-PART-INF: PART-TARGET is undefined.',
        });
    }
    if (!timeline?.partInf && (timeline?.totals?.parts ?? 0) === 0) {
        return issues; // plain HLS — nothing LL to check
    }

    const target = timeline.partTargetMs;
    const sc = timeline.serverControl;
    if (target != null) {
        const off = timeline.segments
            .flatMap((s) => s.parts)
            .filter((p) => p.durationSec != null)
            .map((p) => Math.abs(p.durationSec * 1000 - target) / target)
            .filter((rel) => rel > PART_TARGET_TOLERANCE);
        if (off.length > 0) {
            issues.push({
                id: 'll-hls.part-target-drift',
                severity: off.length > 3 ? 'error' : 'warn',
                message: `${off.length} part duration(s) deviate more than ${PART_TARGET_TOLERANCE * 100}% from PART-TARGET (${target} ms).`,
            });
        }
    } else {
        issues.push({
            id: 'll-hls.part-target-unset',
            severity: 'warn',
            message: `PART-TARGET unset; the spec RECOMMENDS ${DEFAULT_PART_TARGET_MS} ms default behavior applies.`,
        });
    }

    if ((timeline.totals?.independentParts ?? 0) === 0 && target != null) {
        issues.push({
            id: 'll-hls.no-independent-parts',
            severity: 'warn',
            message:
                'No INDEPENDENT=YES parts: playback cannot resume on a part boundary.',
        });
    }

    if (!sc.canBlockReload && !sc.canSkipUntil) {
        issues.push({
            id: 'll-hls.server-control-ll',
            severity: 'info',
            message:
                'EXT-X-SERVER-CONTROL lacks CAN-BLOCK-RELOAD/CAN-SKIP-UNTIL; regular (non-blocking) playlist reload expected.',
        });
    }

    for (const row of timeline.segments) {
        if (
            row.partCount > 0 &&
            row.partCount < MIN_PARTS_PER_SEGMENT &&
            row.durationSec != null &&
            row.durationSec > (target ?? DEFAULT_PART_TARGET_MS) / 1000
        ) {
            issues.push({
                id: 'll-hls.few-parts',
                severity: 'info',
                message: `Segment ${row.index} lists ${row.partCount} part(s) for ${row.durationSec}s; fewer than ${MIN_PARTS_PER_SEGMENT} limits part-level accuracy.`,
            });
            break;
        }
    }

    // Part sum vs segment EXTINF mismatch (content mis-packaging).
    for (const row of timeline.segments) {
        if (row.durationSec == null || row.partCount === 0) continue;
        const rel = Math.abs(row.partsTotalSec - row.durationSec);
        if (rel > Math.max(0.05, row.durationSec * 0.02)) {
            issues.push({
                id: 'll-hls.part-sum-mismatch',
                severity: 'warn',
                message: `Segment ${row.index}: parts sum ${row.partsTotalSec}s vs EXTINF ${row.durationSec}s.`,
            });
        }
    }
    return issues;
}

/**
 * LL-DASH latency view from period ServiceDescription elements.
 *
 * @param {Array<object>} periods DASH IR periods
 * @returns {{protocol:'dash', isLowLatency:boolean, targets:Array<{periodId:string|null, scope:string[], targetMs:number|null, minMs:number|null, maxMs:number|null, referenceId:number|null}>, playbackRates:Array<object>}}
 */
export function buildDashLatencyView(periods) {
    const targets = [];
    const playbackRates = [];
    for (const period of Array.isArray(periods) ? periods : []) {
        for (const sd of period.serviceDescriptions ?? []) {
            const scope = (sd.scopes ?? []).map(
                (s) => s.schemeIdUri ?? 'unknown'
            );
            for (const rate of sd.playbackRates ?? [])
                playbackRates.push({ ...rate, scope });
            for (const lat of sd.latencies ?? []) {
                targets.push({
                    periodId: period.id ?? null,
                    scope,
                    targetMs: lat.target,
                    minMs: lat.min,
                    maxMs: lat.max,
                    referenceId: lat.referenceId,
                });
            }
        }
    }
    return {
        protocol: 'dash',
        isLowLatency: targets.some((t) => t.targetMs != null),
        targets,
        playbackRates,
    };
}

/**
 * LL-DASH latency conformance checks.
 *
 * @param {ReturnType<typeof buildDashLatencyView>} view
 * @returns {Array<{id:string, severity:'info'|'warn'|'error', message:string}>}
 */
export function dashLatencyCompliance(view) {
    /** @type {LlIssue[]} */
    const issues = [];
    if (!view?.targets?.length) {
        issues.push({
            id: 'll-dash.no-service-description',
            severity: 'info',
            message:
                'No ServiceDescription/Latency found: regular DASH latency profile assumed.',
        });
        return issues;
    }
    for (const t of view.targets) {
        if (t.minMs == null || t.maxMs == null) {
            issues.push({
                id: 'll-dash.latency-range-incomplete',
                severity: 'warn',
                message:
                    'Latency@min/max incomplete next to @target; clients cannot bound the range.',
            });
            continue;
        }
        if (t.minMs > t.targetMs || t.targetMs > t.maxMs) {
            issues.push({
                id: 'll-dash.latency-range-invalid',
                severity: 'error',
                message: `Latency target ${t.targetMs} outside [${t.minMs}, ${t.maxMs}] ms.`,
            });
        }
    }
    return issues;
}

/**
 * Documented latency accounting for the UI: what the playlist PROMISES
 * (part target, part count, server-control hold-back) and what it can prove.
 * Never fabricates the unpublished numbers (fetch time, segment URI latency).
 *
 * @param {ReturnType<typeof buildHlsPartTimeline>} timeline
 */
export function hlsLatencyAccounting(timeline) {
    const targetMs = timeline.partTargetMs;
    const avgParts =
        timeline.totals.segments > 0
            ? timeline.totals.parts / timeline.totals.segments
            : 0;
    return {
        partTargetMs: targetMs,
        defaultPartTargetMs: DEFAULT_PART_TARGET_MS,
        avgPartsPerSegment: Math.round(avgParts * 100) / 100,
        playlistMinBoundSec:
            targetMs != null && avgParts > 0
                ? Math.round(((targetMs * avgParts) / 1000) * 1000) / 1000
                : null, // one segment of parts, expressed in seconds
        serverControlHoldBackSec: timeline.serverControl.holdBack,
        partHoldBackSec: timeline.serverControl.partHoldBack,
        preloadHints: timeline.preloadHints.length,
        note: 'Playlist-declared bounds only; measured fetch/decode latency comes from the network analysis feature.',
    };
}

/**
 * Unified entry point: build the right view for a stream's manifest IR.
 *
 * @param {{type?:'hls'|'dash', manifest?:object, periods?:Array<object>}} stream
 */
export function analyzeLowLatency(stream) {
    if (
        stream?.type === 'hls' ||
        stream?.manifest?.partInf ||
        stream?.manifest?.segments
    ) {
        const timeline = buildHlsPartTimeline(stream.manifest ?? {});
        if (!timeline.isLowLatency) {
            return {
                protocol: 'hls',
                isLowLatency: false,
                issues: [],
                timeline,
            };
        }
        return {
            protocol: 'hls',
            isLowLatency: true,
            timeline,
            accounting: hlsLatencyAccounting(timeline),
            issues: hlsLlCompliance(timeline),
        };
    }
    if (stream?.type === 'dash' || stream?.periods) {
        const view = buildDashLatencyView(stream.periods ?? []);
        if (!view.isLowLatency) {
            return { protocol: 'dash', isLowLatency: false, issues: [], view };
        }
        return {
            protocol: 'dash',
            isLowLatency: true,
            view,
            issues: dashLatencyCompliance(view),
        };
    }
    return { protocol: null, isLowLatency: false, issues: [] };
}
