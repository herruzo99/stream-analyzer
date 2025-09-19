import { diffWords } from 'diff';

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Diffs two pre-formatted MPD XML strings and returns an HTML string showing only the new version,
 * with word-level additions highlighted inline.
 * @param {string} oldMpd The original MPD string (pre-formatted).
 * @param {string} newMpd The new MPD string (pre-formatted).
 * @returns {string} An HTML string representing the new state with highlights.
 */
export function diffMpd(oldMpd, newMpd) {
    const changes = diffWords(oldMpd, newMpd);
    let html = '';

    changes.forEach((part) => {
        if (part.removed) {
            return; // Skip removed parts entirely
        }

        const escapedValue = escapeHtml(part.value);

        if (part.added) {
            html += `<span class="bg-emerald-500/40 text-green-50 rounded-sm font-medium">${escapedValue}</span>`;
        } else {
            html += escapedValue;
        }
    });

    return html;
}