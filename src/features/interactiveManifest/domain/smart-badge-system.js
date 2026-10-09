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

const pill = (cls, title, text) => html`<span
    class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${cls} inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4"
    title=${title ?? ''}
    >${text}</span
>`;

const prettyKey = (key) =>
    String(key)
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

const detailRow = (label, value) =>
    `<div style="display:flex;justify-content:space-between;gap:1rem;padding:2px 0;">` +
    `<span style="opacity:.65">${escapeHtml(label)}</span>` +
    `<span style="font-family:monospace">${escapeHtml(value)}</span></div>`;

/**
 * @param {string} key Attribute/tag name.
 * @param {*} value Raw value (string, or the attribute map for aggregators).
 * @param {object} [context]
 */
function getDetails(key, value, context = {}) {
    const lowerKey = String(key ?? '').toLowerCase();
    const timescale = context.timescale ?? null;
    const allAttributes = context.allAttributes ?? {};
    const text = value === null || value === undefined ? '' : String(value);

    // S-tag aggregator (SegmentTimeline spans): value carries the attributes.
    if (lowerKey === 's' && value && typeof value === 'object') {
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
        if (!isNaN(d) && timescale && timescale > 0) {
            const r = rRaw === null ? 0 : parseInt(rRaw, 10);
            if (!isNaN(r) && r >= 0) {
                parsedValue += ` ≈ ${formatDurationPill(((r + 1) * d) / timescale)} total`;
            }
        }
        return {
            label: 'S Span Aggregator',
            parsedValue,
            tooltipHtml: `<div>${rows.join('')}</div>`,
        };
    }

    // Duration pills / timescale math mirror renderBadge below.
    if (lowerKey === 'r' && timescale) {
        const dVal = allAttributes['d'] || allAttributes['D'];
        const r = parseInt(text, 10);
        const d = parseFloat(dVal);
        if (!isNaN(r) && !isNaN(d)) {
            const count = r < 0 ? 'Until End' : r + 1;
            return {
                label: 'Repeat Count',
                parsedValue:
                    typeof count === 'number'
                        ? `${count} × ${formatDurationPill(d / timescale)}`
                        : 'Repeat: Until End',
                tooltipHtml:
                    `<div>${detailRow('Formula', '(r + 1) × d / timescale')}` +
                    `${detailRow('Raw r', text)}${detailRow('d', String(dVal))}` +
                    `${detailRow('Timescale', String(timescale))}</div>`,
            };
        }
    }
    if (lowerKey.includes('bandwidth') || lowerKey.includes('bitrate')) {
        const num = parseInt(text, 10);
        if (!isNaN(num)) {
            return { label: 'Bitrate', parsedValue: formatBitrate(num) };
        }
    }
    if (lowerKey.includes('range') && text.includes('-')) {
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
    if (timescale && scaledFields.includes(lowerKey)) {
        const num = parseFloat(text);
        if (!isNaN(num) && timescale > 0) {
            return {
                label: prettyKey(key),
                parsedValue: formatDurationPill(num / timescale),
                tooltipHtml:
                    `<div>${detailRow('Raw ticks', text)}` +
                    `${detailRow('Timescale', String(timescale))}</div>`,
            };
        }
    }
    if (text.startsWith('PT')) {
        const parsed = parseDuration(text);
        if (parsed) {
            return {
                label: prettyKey(key),
                parsedValue: formatDurationPill(parsed.total),
            };
        }
    }
    if (lowerKey === 'codecs') {
        return { label: 'Codecs', parsedValue: text };
    }
    if (lowerKey.includes('framerate')) {
        let fps = text;
        if (text.includes('/')) {
            const [n, d] = text.split('/');
            if (parseFloat(d) !== 0) fps = (parseFloat(n) / parseFloat(d)).toFixed(2);
        }
        return { label: 'Frame Rate', parsedValue: `${fps} fps` };
    }

    return {
        label: prettyKey(key) || 'Value',
        parsedValue: text.length > 160 ? `${text.slice(0, 159)}…` : text,
    };
}

/**
 * Rendered badge pill (lit-html). Ported from the pre-Heux inline
 * implementation; class names preserved so existing styles apply.
 */
function renderBadge(key, value, context = {}) {
    const lowerKey = String(key ?? '').toLowerCase();
    const text = value === null || value === undefined ? '' : String(value);
    const timescale = context.timescale ?? null;
    const allAttributes = context.allAttributes ?? {};

    if (lowerKey === 'timescale') return null;

    if (lowerKey === 'r' && timescale) {
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
                        `${count} segments × ${(d / timescale).toFixed(3)}s`,
                        `Total: ${formatDurationPill(totalSeconds)}`
                    );
                }
                return pill(
                    'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
                    'r=-1 repeats to period end',
                    'Repeat: Until End'
                );
            }
        }
    }

    if (lowerKey.includes('bandwidth') || lowerKey.includes('bitrate')) {
        const num = parseInt(text, 10);
        if (!isNaN(num)) {
            return pill(
                'bg-blue-500/20 text-blue-300 border border-blue-500/30',
                `${num} bps`,
                formatBitrate(num)
            );
        }
    }

    if (lowerKey.includes('range') && text.includes('-')) {
        const [start, end] = text.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
            const size = end - start + 1;
            return pill(
                'bg-gray-500/20 text-gray-300 border border-gray-500/30',
                `${text} = ${size} bytes`,
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
    ].includes(lowerKey);
    if (timescale && isScaledTimeField) {
        const num = parseFloat(text);
        if (!isNaN(num) && timescale > 0) {
            const seconds = num / timescale;
            return pill(
                'bg-teal-500/20 text-teal-300 border border-teal-500/30',
                `Raw: ${text} / Scale: ${timescale}`,
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
    ].some((term) => lowerKey.includes(term));
    const isTimestamp =
        lowerKey.includes('timestamp') ||
        lowerKey.includes('publish') ||
        lowerKey.includes('availability') ||
        lowerKey.includes('program-date');

    if (text.startsWith('PT')) {
        const parsed = parseDuration(text);
        if (parsed) {
            return pill(
                'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
                text,
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
                `${num}s explicit`,
                formatDurationPill(num)
            );
        }
    }

    if (lowerKey === 'codecs') {
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

    if (lowerKey === 'width' || lowerKey === 'height') {
        return pill('bg-transparent text-slate-500 border border-transparent', '', 'px');
    }

    if (lowerKey.includes('framerate')) {
        let fps = text;
        if (text.includes('/')) {
            const [n, d] = text.split('/');
            const num = parseFloat(n);
            const den = parseFloat(d);
            if (den !== 0) fps = (num / den).toFixed(2);
        }
        return pill(
            'bg-orange-500/20 text-orange-300 border border-orange-500/30',
            text,
            `${fps} fps`
        );
    }

    if (lowerKey.includes('samplingrate')) {
        return pill(
            'bg-pink-500/20 text-pink-300 border border-pink-500/30',
            text,
            `${text} Hz`
        );
    }

    if (lowerKey === 'sar' || lowerKey === 'par') {
        const [w, h] = text.split(':').map(Number);
        if (!isNaN(w) && !isNaN(h)) {
            return pill(
                'bg-slate-700 text-slate-300 border border-slate-600',
                text,
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
