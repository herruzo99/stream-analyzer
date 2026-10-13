// Export helpers for SRT sessions: JSONL telemetry series, CSV series, and a
// session summary document. Browser-safe (Blob download) and pure-string so
// the same functions feed tests and future CLI tooling.

import { deriveSignals } from '@/features/srtSource/domain/telemetry.js';
import { redactSrtUrl } from '@/infrastructure/srt/urlContract.js';

const isoStamp = (t) => new Date(Number(t) || Date.now()).toISOString();

/** JSONL: one normalized telemetry sample per line. */
export function toJsonl(series) {
    return (series ?? []).map((s) => JSON.stringify(s)).join('\n') + '\n';
}

/** CSV of the series' core columns. */
export function toCsv(series) {
    const head =
        't,rttMs,mbpsRecv,pktRecv,pktRecvLost,pktRetrans,pktRecvDrop,msRecvBuf,lossRate\n';
    const rows = (series ?? []).map((s) =>
        [
            isoStamp(s.t),
            s.rttMs,
            s.mbpsRecv,
            s.pktRecv,
            s.pktRecvLost,
            s.pktRetrans,
            s.pktRecvDrop,
            s.msRecvBuf,
            s.lossRate,
        ].join(',')
    );
    return head + rows.join('\n') + '\n';
}

/**
 * The full session summary document: config + derived signals + rule issues.
 * Redacted URLs only — never embeds credentials.
 */
export function toSummary(session, series, issues = []) {
    const sig = deriveSignals(series);
    return {
        kind: 'srt-session-summary',
        exportedAt: new Date().toISOString(),
        session: {
            id: session?.id,
            mode: session?.mode,
            status: session?.status,
            url: session?.url ? redactSrtUrl(session.url) : session?.url,
            streamId: session?.streamId ?? null,
            encrypted: Boolean(session?.encrypted),
            peer: session?.peer ?? null,
            startedAt: session?.startedAt ?? null,
        },
        signals: {
            avgRttMs: Math.round(sig.avgRtt * 100) / 100,
            maxRttMs: Math.round(sig.maxRtt * 100) / 100,
            lossRatio: sig.lossRatio,
            retransRatioPercent: sig.retransRatio,
            dropRatioPercent: sig.dropRatio,
            lostPackets: sig.lostTotal,
            samples: series?.length ?? 0,
        },
        issues,
    };
}

/** Trigger a browser download for generated content. */
export function downloadText(filename, text, mime = 'text/plain') {
    if (typeof document === 'undefined') return false;
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
}
