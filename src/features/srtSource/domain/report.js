// Unified session report builder (capability plan Tier-3 #12).
//
// One document shape for every transport the analyzer speaks — DASH, HLS,
// SRT, WebRTC — so an engineer can file or diff sessions across protocols.
// Redaction is enforced: SRT URLs are redacted by the transport-specific
// helpers before anything reaches this builder.

import { deriveSignals } from './telemetry.js';
import { redactSrtUrl } from '../../../infrastructure/srt/urlContract.js';
import { analyzeTsChunk } from './tsAnalytics.js';
import { analyzeAvSync } from './avSync.js';
import { adviseLinkConfig, adviceToQuery } from './advisor.js';

/** @typedef {{kind: 'dash'|'hls'|'srt'|'webrtc'}} TransportKind */

const safe = (v) => (v == null ? null : v);

/**
 * Build a comparable session report.
 *
 * @param {object} input
 * @param {'dash'|'hls'|'srt'|'webrtc'} input.transport
 * @param {object} [input.session]      transport session (helper or peer)
 * @param {Array<object>} [input.series] telemetry series (SRT/WebRTC)
 * @param {object} [input.manifestSummary] DASH/HLS summary from the analysis store
 * @param {Array<{id:string,severity:string,message:string}>} [input.issues]
 * @param {{bytes: Uint8Array, durationMs: number}[]} [input.chunks] TS chunks for content analysis
 */
export function buildSessionReport(input) {
    const report = {
        schema: 1,
        kind: 'session-report',
        transport: input.transport,
        exportedAt: new Date().toISOString(),
        session: null,
        telemetry: null,
        streamContents: null,
        issues: input.issues ?? [],
    };

    if (input.session) {
        const s = input.session;
        report.session = {
            id: safe(s.id),
            mode: safe(s.mode),
            status: safe(s.status),
            url:
                input.transport === 'srt' && s.url
                    ? redactSrtUrl(s.url)
                    : safe(s.url),
            streamId: safe(s.streamId),
            peer: safe(s.peer),
            encrypted: Boolean(s.encrypted),
            startedAt: safe(s.startedAt),
        };
    }

    if (input.series?.length) {
        const sig = deriveSignals(input.series);
        report.telemetry = {
            samples: input.series.length,
            avgRttMs: Math.round(sig.avgRtt * 100) / 100,
            maxRttMs: Math.round(sig.maxRtt * 100) / 100,
            lastMbpsRecv: safe(input.series[input.series.length - 1].mbpsRecv),
            lossRatio: sig.lossRatio,
            retransRatioPercent: sig.retransRatio,
            dropRatioPercent: sig.dropRatio,
            lostPackets: sig.lostTotal,
        };
        if (input.transport === 'srt' || input.transport === 'webrtc') {
            report.advisor = adviseLinkConfig(input.series);
            report.advisorQuery = adviceToQuery(report.advisor);
        }
    }

    if (input.manifestSummary) {
        report.manifest = {
            type: safe(input.manifestSummary.type),
            duration: safe(input.manifestSummary.duration),
            profiles: safe(input.manifestSummary.profiles),
            isLive: safe(
                input.manifestSummary.isLive ??
                    input.manifestSummary.type === 'dynamic'
            ),
            adaptationSets:
                input.manifestSummary.adaptationSets?.length ?? null,
            languages: input.manifestSummary.languages ?? null,
        };
    }

    if (input.chunks?.length) {
        const combined = input.chunks.reduce(
            (acc, c) => acc + c.bytes.length,
            0
        );
        const merged = new Uint8Array(combined);
        let off = 0;
        for (const c of input.chunks) {
            merged.set(c.bytes, off);
            off += c.bytes.length;
        }
        const totalMs =
            input.chunks.reduce((s, c) => s + Number(c.durationMs ?? 0), 0) ||
            2000;
        const a = analyzeTsChunk(merged, { durationMs: totalMs });
        const av = analyzeAvSync(a, { first: a.pcr.first, last: a.pcr.last });
        report.streamContents = {
            packets: a.packets,
            pidCount: a.pidInventory.length,
            topPids: a.pidInventory.slice(0, 8).map((p) => ({
                pid: p.pidHex,
                role: p.role,
                mbps: p.mbps,
                ccErrors: p.ccErrors,
            })),
            gopAvgFrames: a.gop.avgGopFrames,
            keyframes: a.gop.keyframes,
            pcrIntervalMs: a.pcr.avgIntervalMs,
            ptsDiscontinuities: a.pts.discontinuities,
            avOffsetMs: av.offsetMs,
            avOffsetDirection: av.offsetDirection,
            drifts: av.drifts,
        };
    }

    return report;
}

/**
 * Render a compact Markdown rendering of a report (for tickets).
 * @param {ReturnType<typeof buildSessionReport>} report
 */
export function reportToMarkdown(report) {
    const lines = [`# Session report — ${report.transport}`, ''];
    if (report.session) {
        const s = report.session;
        lines.push(
            `- Session: ${s.id ?? '—'} (${s.mode ?? '—'}, ${s.status ?? '—'})`
        );
        lines.push(`- URL: ${s.url ?? '—'}`);
        lines.push(
            `- StreamID: ${s.streamId ?? '—'} · Encrypted: ${s.encrypted ? 'yes' : 'no'}`
        );
    }
    if (report.telemetry) {
        const t = report.telemetry;
        lines.push('', '## Telemetry');
        lines.push(
            `- Samples: ${t.samples}, avg RTT ${t.avgRttMs} ms (max ${t.maxRttMs} ms)`
        );
        lines.push(
            `- Last rate ${t.lastMbpsRecv} Mbps · loss ${(t.lossRatio * 100).toFixed(3)}% · retrans ${t.retransRatioPercent.toFixed(2)}% · drops ${t.dropRatioPercent.toFixed(2)}%`
        );
    }
    if (report.streamContents) {
        const c = report.streamContents;
        lines.push('', '## Stream contents');
        lines.push(
            `- ${c.packets} TS packets, ${c.pidCount} PIDs, GOP ${c.gopAvgFrames ?? '—'} frames, ${c.keyframes} keyframes`
        );
        lines.push(
            `- PCR interval ${c.pcrIntervalMs ?? '—'} ms · PTS discontinuities ${c.ptsDiscontinuities}`
        );
        if (c.avOffsetMs != null)
            lines.push(
                `- A/V offset ${c.avOffsetMs} ms (${c.avOffsetDirection})`
            );
        for (const p of c.topPids ?? [])
            lines.push(
                `  - ${p.pid} ${p.role ?? ''} ${p.mbps} Mbps, CC errors: ${p.ccErrors}`
            );
    }
    if (report.issues.length) {
        lines.push('', '## Issues');
        for (const i of report.issues)
            lines.push(`- [${i.severity}] ${i.message}`);
    }
    return lines.join('\n') + '\n';
}
