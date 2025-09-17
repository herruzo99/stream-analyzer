import { diffWords } from 'diff';

/**
 * Escapes HTML characters in a string to prevent them from being interpreted as HTML.
 * @param {string} str The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Diffs two MPD XML strings and returns an HTML string showing only the new version,
 * with word-level additions highlighted inline. Removed text is not shown.
 * This implementation correctly achieves the requested visual style.
 * @param {string} oldMpd The original MPD string (must be pre-formatted).
 * @param {string} newMpd The new MPD string (must be pre-formatted).
 * @returns {string} An HTML string representing the new state with inline highlights.
 */
export function diffMpd(oldMpd, newMpd) {
    const changes = diffWords(oldMpd, newMpd);
    let html = '';

    changes.forEach(part => {
        // The key to the desired output: completely ignore any parts that were removed.
        if (part.removed) {
            return;
        }

        const escapedValue = escapeHtml(part.value);

        // Wrap only the added parts in a span for highlighting.
        // Common (unchanged) parts are appended as plain text.
        if (part.added) {
            html += `<span class="diff-added">${escapedValue}</span>`;
        } else {
            html += escapedValue;
        }
    });

    return html;
}