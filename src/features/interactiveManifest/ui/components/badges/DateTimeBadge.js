import { html } from 'lit-html';
import { toBase64, formatDurationPill } from './utils.js';

export const DateTimeBadge = {
    id: 'datetime',

    isApplicable(key, value) {
        const lowerKey = key.toLowerCase();
        const dateKeys = [
            'program-date-time',
            'availabilitystarttime',
            'publishTime',
        ];

        if (dateKeys.some((k) => lowerKey.includes(k.toLowerCase()))) {
            return true;
        }

        // Check if value is a valid ISO date string
        if (
            typeof value === 'string' &&
            !isNaN(Date.parse(value)) &&
            value.length > 10 &&
            (value.includes('T') || value.includes('Z'))
        ) {
            return true;
        }

        return false;
    },

    getDetails(key, value) {
        const date = new Date(value);
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const diffSec = diff / 1000;

        let relativeTime;
        if (diff > 0) {
            relativeTime = `in ${formatDurationPill(diffSec)}`;
        } else {
            relativeTime = `${formatDurationPill(Math.abs(diffSec))} ago`;
        }

        return {
            raw: value,
            title: key,
            absoluteStart: date,
            relativeTime,
            label: relativeTime,
            parsedValue: date.toLocaleString(),
        };
    },

    renderBadge(key, value) {
        const details = this.getDetails(key, value);
        if (!details.absoluteStart) return null;

        const tooltipHtml = this.generateTooltipHtml(details);
        const tooltipB64 = toBase64(tooltipHtml);

        return html`<span
            class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-accent-1)] text-[var(--color-info)] border border-[var(--color-info)]/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4 cursor-help"
            data-tooltip-html-b64="${tooltipB64}"
            >${details.label}</span
        >`;
    },

    generateTooltipHtml(details) {
        const rows = [];
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // 1. Header
        rows.push(`
            <div class="flex items-center justify-between mb-3 pb-2 border-b-2 border-[var(--primary-accent)]/20">
                <span class="font-bold text-sm text-[var(--text-on-B-primary)] tracking-tight">${details.title}</span>
            </div>
        `);

        // 2. Hero Section: Human Time
        let relativeClass = 'text-[var(--primary-accent)]';
        let relativeBg = 'bg-[var(--bg-glass-B-5)]';
        let borderClass = 'border-[var(--border-on-B)]';
        let glowClass = 'shadow-lg shadow-black/20';

        rows.push(`
            <div class="${relativeBg} rounded-xl p-4 border ${borderClass} mb-3 backdrop-blur-md ${glowClass} relative overflow-hidden group">
                <!-- Background Gradient Hint -->
                <div class="absolute top-0 right-0 w-32 h-32 bg-[var(--primary-accent)]/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                
                <div class="relative z-10">
                    <div class="flex justify-between items-start mb-1">
                        <span class="text-[10px] font-bold uppercase tracking-widest text-[var(--text-on-B-secondary)] opacity-80">Time</span>
                        <span class="${relativeClass} text-lg font-black tracking-tight leading-none">${details.relativeTime}</span>
                    </div>
                    
                    <div class="text-center py-2">
                        <span class="font-mono text-[var(--text-on-B-primary)] text-3xl font-bold tracking-tighter drop-shadow-sm">
                            ${details.absoluteStart.toLocaleTimeString([], { hour12: false })}
                        </span>
                        <div class="flex justify-center items-center gap-2 mt-1">
                            <span class="font-mono text-[var(--text-on-B-secondary)] text-[10px] uppercase tracking-wider opacity-70">
                                ${details.absoluteStart.toLocaleDateString()}
                            </span>
                            <span class="w-1 h-1 rounded-full bg-[var(--text-on-B-secondary)] opacity-30"></span>
                            <span class="font-mono text-[var(--text-on-B-secondary)] text-[10px] tracking-tight opacity-50">
                                ${timeZone}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `);

        // 4. Footer ISO
        rows.push(`
            <div class="text-[9px] font-mono text-[var(--text-on-B-secondary)] opacity-40 text-center break-all leading-tight mb-2 select-all">
                ${details.absoluteStart.toISOString()}
            </div>
        `);

        return `<div class="min-w-[240px] font-sans p-1">${rows.join('')}</div>`;
    },
};
