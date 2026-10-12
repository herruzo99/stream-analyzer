import { html } from 'lit-html';

export const SchemeBadge = {
    id: 'scheme',

    isApplicable(key) {
        return key.toLowerCase() === 'schemeiduri';
    },

    getDetails(key, value, context) {
        let label = 'Scheme';
        let title = 'Scheme URI';
        let parsedValue = value;

        // Check for common schemes
        if (value.includes('role')) {
            label = 'Role';
            const roleValue = context.allAttributes['value'];
            if (roleValue) parsedValue = `Role: ${roleValue}`;
        } else if (value.includes('accessibility')) {
            label = 'Accessibility';
            const accValue = context.allAttributes['value'];
            if (accValue) parsedValue = `Accessibility: ${accValue}`;
        } else if (value.includes('audio_channel_configuration')) {
            label = 'Audio Config';
            const chValue = context.allAttributes['value'];
            if (chValue) parsedValue = `Channels: ${chValue}`;
        } else if (value.includes('AudioPurposeCS')) {
            label = 'Audio Purpose';
        }

        return {
            raw: value,
            title,
            label,
            parsedValue,
        };
    },

    renderBadge(key, value, context) {
        const details = this.getDetails(key, value, context);
        return html`<span
            class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-B-2)] text-[var(--text-on-B-secondary)] border border-[var(--border-on-B)] inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4"
            title="${details.raw}"
            >${details.label}</span
        >`;
    },
};
