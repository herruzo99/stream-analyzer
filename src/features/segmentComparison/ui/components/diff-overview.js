import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';

const diffValue = (valA, valB, formatter = (v) => v) => {
    // Loose equality check for numbers to handle minor float precision differences
    // and type mismatches (string vs number)
    const isDiff = valA != valB;
    const formattedA = formatter(valA);
    const formattedB = formatter(valB);

    if (!isDiff) {
        return html`<span class="font-mono text-slate-300 text-sm"
            >${formattedA}</span
        >`;
    }

    return html`
        <div
            class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 font-mono text-xs"
        >
            <span
                class="text-slate-500 line-through decoration-red-500/50 decoration-2 opacity-75"
                >${formattedA}</span
            >
            <span class="hidden sm:inline text-slate-600"
                >${icons.arrowRight}</span
            >
            <span
                class="text-amber-300 font-bold bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
            >
                ${formattedB}
            </span>
        </div>
    `;
};

const statRow = (label, valA, valB, icon, formatter) => html`
    <div
        class="flex flex-col justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors h-full"
    >
        <div
            class="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2"
        >
            ${icon} ${label}
        </div>
        <div class="mt-auto">${diffValue(valA, valB, formatter)}</div>
    </div>
`;

export const diffOverviewTemplate = (segA, segB) => {
    if (!segA || !segB) return '';

    // Helper to extract timescale-corrected duration
    // Handle cases where segment or timescale might be missing (e.g. init segments)
    const getDuration = (seg) => {
        if (!seg.segment?.duration || !seg.segment?.timescale) return 0;
        return seg.segment.duration / seg.segment.timescale;
    };

    // Calculate Bitrates
    const getBitrate = (seg) => {
        const dur = getDuration(seg);
        const size = seg.data?.size || 0;
        return dur > 0 ? Math.round((size * 8) / dur) : 0;
    };

    // Helper for formatting
    const timeFmt = (v) => `${v.toFixed(4)}s`;
    const bytesFmt = (v) =>
        v > 1024 * 1024
            ? `${(v / (1024 * 1024)).toFixed(2)} MB`
            : `${(v / 1024).toFixed(2)} KB`;
    const numFmt = (v) => (v ? v.toLocaleString() : '0');

    const durA = getDuration(segA);
    const durB = getDuration(segB);

    const sizeA = segA.data?.size || 0;
    const sizeB = segB.data?.size || 0;

    const bitrateA = getBitrate(segA);
    const bitrateB = getBitrate(segB);

    const timescaleA = segA.segment?.timescale || 0;
    const timescaleB = segB.segment?.timescale || 0;

    // Use boxes length if available (ISOBMFF), otherwise packets length (TS)
    const countA = segA.data?.boxes?.length ?? segA.data?.packets?.length ?? 0;
    const countB = segB.data?.boxes?.length ?? segB.data?.packets?.length ?? 0;
    const countLabel = segA.format === 'ts' ? 'Packets' : 'Boxes';

    return html`
        <div
            class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 animate-fadeIn"
        >
            ${statRow('Duration', durA, durB, icons.clock, timeFmt)}
            ${statRow('File Size', sizeA, sizeB, icons.hardDrive, bytesFmt)}
            ${statRow(
                'Avg Bitrate',
                bitrateA,
                bitrateB,
                icons.gauge,
                formatBitrate
            )}
            ${statRow('Timescale', timescaleA, timescaleB, icons.timer, numFmt)}
            ${statRow(`${countLabel} Count`, countA, countB, icons.box, numFmt)}
        </div>
    `;
};
