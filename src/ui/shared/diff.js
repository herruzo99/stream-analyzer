import { diffWords } from 'diff';
import {
    highlightDash,
    highlightHls,
} from '@/ui/shared/syntax-highlighter';

/**
 * Diffs two pre-formatted manifest strings and returns an HTML string showing the new version,
 * with word-level additions highlighted and syntax highlighting applied.
 * @param {string} oldManifest The original manifest string.
 * @param {string} newManifest The new manifest string.
 * @param {'dash' | 'hls' | 'unknown'} protocol The protocol of the manifest.
 * @returns {string} An HTML string representing the new state with highlights.
 */
export function diffManifest(oldManifest, newManifest, protocol) {
    const changes = diffWords(oldManifest, newManifest);
    let html = '';

    const highlightFn = protocol === 'dash' ? highlightDash : highlightHls;

    changes.forEach((part) => {
        if (part.removed) {
            return; // Skip removed parts entirely
        }

        const highlightedValue = highlightFn(part.value);

        if (part.added) {
            html += `<span class="bg-emerald-500/40 text-green-50 rounded-sm font-medium">${highlightedValue}</span>`;
        } else {
            html += highlightedValue;
        }
    });

    return html;
}
