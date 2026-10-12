import { useUiStore } from '@/state/uiStore';
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
        return html`<span
            class="font-mono text-slate-200 text-sm opacity-90"
            >${formattedA}</span
        >`;
    }

    return html`
        <div
            class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 font-mono text-xs"
        >
            <span
                class="text-red-400/40 line-through decoration-red-500/30 decoration-1 italic"
                >${formattedA}</span
            >
            <span
                class="hidden sm:inline text-slate-400 opacity-30 px-1"
                >${icons.arrowRight}</span
            >
            <span
                class="text-emerald-200 font-bold bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-400/25 /20"
            >
                ${formattedB}
            </span>
        </div>
    `;
};

const statRow = (label, valA, valB, icon, formatter, isSolid) => html`
    <div
        class="flex flex-col justify-between p-4 ${isSolid ? 'bg-white/5 border border-white/10' : 'bg-white/5 border border-white/10 hover:border-emerald-400/50'} rounded-md transition-all duration-300 group h-full relative overflow-hidden"
    >
        <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        <div
            class="flex items-center gap-2 text-slate-400 text-[10px] font-bold mb-3 opacity-60 group-hover:opacity-100 group-hover:text-emerald-200 transition-all relative z-10"
        >
            <span class="scale-90">${icon}</span> ${label}
        </div>
        <div class="mt-auto relative z-10">${diffValue(valA, valB, formatter)}</div>
    </div>
`;

export const diffOverviewTemplate = (segA, segB) => {
    if (!segA || !segB) return '';

    const { activeThemeId } = useUiStore.getState();
    const isSolid = activeThemeId === 'pro-compact';

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
            class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
        >
            ${statRow('Duration', durA, durB, icons.clock, timeFmt, isSolid)}
            ${statRow('File Size', sizeA, sizeB, icons.hardDrive, bytesFmt, isSolid)}
            ${statRow(
        'Avg Bitrate',
        bitrateA,
        bitrateB,
        icons.gauge,
        formatBitrate,
        isSolid
    )}
            ${statRow('Timescale', timescaleA, timescaleB, icons.timer, numFmt, isSolid)}
            ${statRow(`${countLabel} Count`, countA, countB, icons.box, numFmt, isSolid)}
        </div>
    `;
};
