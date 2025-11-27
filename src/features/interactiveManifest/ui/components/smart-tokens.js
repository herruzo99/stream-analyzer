import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';

const parseDuration = (str) => {
    if (!str || typeof str !== 'string') return null;
    // ISO 8601 regex (e.g., PT1H30M, PT30S)
    const match = str.match(
        /PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/
    );
    if (match) {
        const h = parseFloat(match[1] || '0');
        const m = parseFloat(match[2] || '0');
        const s = parseFloat(match[3] || '0');
        const total = h * 3600 + m * 60 + s;
        if (total === 0 && !str.includes('0')) return null;
        return { total };
    }
    return null;
};

const formatDurationPill = (totalSeconds) => {
    if (totalSeconds < 0.001 && totalSeconds > 0) return '<1ms';
    if (totalSeconds < 1) return `${(totalSeconds * 1000).toFixed(0)}ms`;
    if (totalSeconds < 60) return `${parseFloat(totalSeconds.toFixed(3))}s`;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
};

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Renders a "Smart Token" for specific attribute types.
 * @param {string} key The attribute key.
 * @param {string} value The raw value.
 * @param {number | null} [contextTimescale=null] The active timescale.
 * @param {Record<string, string>} [allAttributes={}] Sibling attributes for context-aware calculations.
 * @returns {import('lit-html').TemplateResult | null}
 */
export const renderSmartToken = (
    key,
    value,
    contextTimescale = null,
    allAttributes = {}
) => {
    const lowerKey = key.toLowerCase();

    // 0. Explicitly ignore 'timescale' itself
    if (lowerKey === 'timescale') return null;

    // 1. DASH Segment Timeline Repeats ('r')
    // Formula: Total Duration = (r + 1) * d / timescale
    if (lowerKey === 'r' && contextTimescale) {
        const dVal = allAttributes['d'] || allAttributes['D'];
        if (dVal) {
            const r = parseInt(value, 10);
            const d = parseFloat(dVal);
            if (!isNaN(r) && !isNaN(d)) {
                const count = r < 0 ? 'Until End' : r + 1; // r=-1 in DASH means indefinite
                if (typeof count === 'number') {
                    const totalSeconds = (count * d) / contextTimescale;
                    return html`<span
                        class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4"
                        title="${count} segments × ${(
                            d / contextTimescale
                        ).toFixed(3)}s"
                        >Total: ${formatDurationPill(totalSeconds)}</span
                    >`;
                } else {
                    return html`<span
                        class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4"
                        >Repeat: Until End</span
                    >`;
                }
            }
        }
    }

    // 2. Bitrate / Bandwidth
    if (lowerKey.includes('bandwidth') || lowerKey.includes('bitrate')) {
        const num = parseInt(value, 10);
        if (!isNaN(num)) {
            return html`<span
                class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4"
                >${formatBitrate(num)}</span
            >`;
        }
    }

    // 3. Byte Ranges (start-end)
    if (lowerKey.includes('range') && value.includes('-')) {
        const [start, end] = value.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
            const size = end - start + 1;
            return html`<span
                class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-500/20 text-gray-300 border border-gray-500/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4"
                >${formatBytes(size)}</span
            >`;
        }
    }

    // 4. Timescale-based Fields (DASH)
    const isScaledTimeField = [
        'd',
        't',
        'duration',
        'presentationtimeoffset',
        'availabilitytimeoffset',
    ].includes(lowerKey);
    if (contextTimescale && isScaledTimeField) {
        const num = parseFloat(value);
        if (!isNaN(num) && contextTimescale > 0) {
            const seconds = num / contextTimescale;
            return html`<span
                class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4"
                title="Raw: ${value} / Scale: ${contextTimescale}"
                >${formatDurationPill(seconds)}</span
            >`;
        }
    }

    // 5. Duration / Time (General)
    const isGeneralTimeField = [
        'duration',
        'time',
        'period',
        'delay',
        'maxsegmentduration',
        'targetduration',
        'elapsed',
    ].some((term) => lowerKey.includes(term));
    const isTimestamp =
        lowerKey.includes('timestamp') ||
        lowerKey.includes('publish') ||
        lowerKey.includes('availability') ||
        lowerKey.includes('program-date');

    // ISO 8601 Duration (PT..)
    if (value.startsWith('PT')) {
        const parsed = parseDuration(value);
        if (parsed) {
            return html`<span
                class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4"
                >${formatDurationPill(parsed.total)}</span
            >`;
        }
    }

    // Explicit seconds (HLS logic or DASH without timescale context)
    if (
        isGeneralTimeField &&
        !isTimestamp &&
        !contextTimescale &&
        /^\d+(\.\d+)?$/.test(value)
    ) {
        const num = parseFloat(value);
        if (!isNaN(num)) {
            return html`<span
                class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4"
                >${formatDurationPill(num)}</span
            >`;
        }
    }

    // 6. Codecs
    if (lowerKey === 'codecs') {
        const codecList = value.split(',').map((c) => c.trim().split('.')[0]);
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

    // 7. Resolution
    if (lowerKey === 'width' || lowerKey === 'height') {
        return html`<span
            class="ml-0.5 mr-1 text-[10px] text-slate-500 select-none align-middle"
            >px</span
        >`;
    }

    // 8. Frame Rate
    if (lowerKey.includes('framerate')) {
        let fps = value;
        if (value.includes('/')) {
            const [n, d] = value.split('/');
            const num = parseFloat(n);
            const den = parseFloat(d);
            if (den !== 0) fps = (num / den).toFixed(2);
        }
        return html`<span
            class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4"
            >${fps} fps</span
        >`;
    }

    // 9. Sampling Rate
    if (lowerKey.includes('samplingrate')) {
        return html`<span
            class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4"
            >${value} Hz</span
        >`;
    }

    // 10. Aspect Ratio
    if (lowerKey === 'sar' || lowerKey === 'par') {
        const [w, h] = value.split(':').map(Number);
        if (!isNaN(w) && !isNaN(h)) {
            return html`<span
                class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300 border border-slate-600 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4"
                >${(w / h).toFixed(2)}:1</span
            >`;
        }
    }

    return null;
};
