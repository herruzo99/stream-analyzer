import { html } from 'lit-html';
import { toBase64 } from './utils.js';

export const ProfileBadge = {
    id: 'profile',

    isApplicable(key) {
        return key.toLowerCase() === 'profiles';
    },

    getDetails(key, value) {
        const profiles = value.split(',').map((p) => p.trim());
        const simplifiedProfiles = profiles.map((p) => {
            if (p.includes('isoff-live:2011')) return 'ISO Live 2011';
            if (p.includes('isoff-live:2012')) return 'ISO Live 2012';
            if (p.includes('isoff-on-demand:2011')) return 'ISO On-Demand 2011';
            if (p.includes('dash-if-simple:2011')) return 'DASH-IF Simple';
            if (p.includes('hbbtv')) return 'HbbTV';
            return p.split(':').pop(); // Fallback to last part of URN
        });

        const label =
            simplifiedProfiles.slice(0, 2).join(', ') +
            (simplifiedProfiles.length > 2 ? '...' : '');

        return {
            raw: value,
            title: 'DASH Profiles',
            label,
            profiles,
            simplifiedProfiles,
        };
    },

    renderBadge(key, value) {
        const details = this.getDetails(key, value);
        const tooltipHtml = this.generateTooltipHtml(details);
        const tooltipB64 = toBase64(tooltipHtml);

        return html`<span
            class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-accent-1)] text-[var(--tertiary-accent)] border border-[var(--tertiary-accent)]/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4 cursor-help"
            data-tooltip-html-b64="${tooltipB64}"
            >${details.label}</span
        >`;
    },

    generateTooltipHtml(details) {
        const rows = [];

        // 1. Header
        rows.push(`
            <div class="flex items-center justify-between mb-3 pb-2 border-b-2 border-[var(--primary-accent)]/20">
                <span class="font-bold text-sm text-[var(--text-on-B-primary)] tracking-tight">${details.title}</span>
            </div>
        `);

        // 2. Profiles List
        rows.push(`
            <div class="bg-[var(--bg-glass-B-5)] rounded-xl p-4 border border-[var(--border-on-B)] mb-3 backdrop-blur-md shadow-lg shadow-black/20">
                <div class="flex flex-col gap-2">
                    ${details.profiles
                        .map(
                            (profile, index) => `
                        <div class="flex flex-col border-b border-[var(--border-on-B)]/10 last:border-0 pb-2 last:pb-0">
                            <span class="text-[var(--primary-accent)] font-bold text-xs">${details.simplifiedProfiles[index]}</span>
                            <span class="font-mono text-[var(--text-on-B-secondary)] text-[10px] break-all opacity-80">${profile}</span>
                        </div>
                    `
                        )
                        .join('')}
                </div>
            </div>
        `);

        return `<div class="min-w-[250px] font-sans p-1">${rows.join('')}</div>`;
    },
};
