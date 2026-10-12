import { html } from 'lit-html';

export const MimeTypeBadge = {
    id: 'mimetype',

    isApplicable(key) {
        const lowerKey = key.toLowerCase();
        return lowerKey === 'mimetype' || lowerKey === 'contenttype';
    },

    getDetails(key, value) {
        let label = value;
        let icon = '';

        if (value.includes('video')) {
            label = 'Video';
            icon = '🎬';
        } else if (value.includes('audio')) {
            label = 'Audio';
            icon = '🔊';
        } else if (value.includes('text') || value.includes('subtitles')) {
            label = 'Text';
            icon = '📝';
        } else if (value.includes('application')) {
            label = 'App';
            icon = '📦';
        }

        // Add subtype if available (e.g., "mp4")
        if (value.includes('/')) {
            const subtype = value.split('/')[1];
            label += ` (${subtype.toUpperCase()})`;
        }

        return {
            raw: value,
            title: 'Content Type',
            label: `${icon} ${label}`,
            parsedValue: label,
        };
    },

    renderBadge(key, value) {
        const details = this.getDetails(key, value);
        return html`<span
            class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-B-2)] text-[var(--text-on-B-primary)] border border-[var(--border-on-B)] inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4"
            title="${details.raw}"
            >${details.label}</span
        >`;
    },
};
