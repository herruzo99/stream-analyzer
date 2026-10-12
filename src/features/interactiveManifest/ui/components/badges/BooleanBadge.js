import { html } from 'lit-html';

export const BooleanBadge = {
    id: 'boolean',

    isApplicable(key, value) {
        const lowerKey = key.toLowerCase();
        const booleanKeys = [
            'subsegmentalignment',
            'subsegmentstartswithsap',
            'scantype',
            'segmentalignment',
            'bitstreamswitching',
        ];

        // Handle explicit boolean strings or numeric booleans (1/0) often found in manifests
        const isBoolValue =
            value === 'true' ||
            value === 'false' ||
            value === '1' ||
            value === '0';

        return (
            booleanKeys.some((k) => lowerKey === k) ||
            (booleanKeys.some((k) => lowerKey.includes(k)) && isBoolValue)
        );
    },

    getDetails(key, value) {
        let isTrue = value === 'true' || value === '1';
        let label = key;

        if (key.toLowerCase().includes('alignment')) label = 'Aligned';
        if (key.toLowerCase().includes('sap')) label = 'SAP Start';
        if (key.toLowerCase() === 'scantype') {
            label = value; // e.g., "progressive"
            isTrue = true; // Always show badge for scanType
        }

        return {
            raw: value,
            title: key,
            label,
            isTrue,
            parsedValue: isTrue ? 'Yes' : 'No',
        };
    },

    renderBadge(key, value) {
        const details = this.getDetails(key, value);

        // Only render if true or if it's a specific value like scanType
        if (!details.isTrue && key.toLowerCase() !== 'scantype') return null;

        return html`<span
            class="ml-0.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-glass-B-2)] text-[var(--color-success)] border border-[var(--color-success)]/30 inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4"
            title="${details.title}: ${details.raw}"
            >${details.label}</span
        >`;
    },
};
