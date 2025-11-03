import { diffLines, diffWords } from 'diff';
import { highlightDash, highlightHls } from '@/ui/shared/syntax-highlighter';

/**
 * A sophisticated diffing engine that uses line-based comparison and then
 * word-based comparison to highlight specific changes within modified lines.
 * @param {string} oldManifest The original manifest string.
 * @param {string} newManifest The new manifest string.
 * @param {'dash' | 'hls' | 'unknown'} protocol The protocol of the manifest.
 * @returns {{diffHtml: string, changes: {additions: number, removals: number, modifications: number}}}
 */
export function diffManifest(oldManifest, newManifest, protocol) {
    const changes = { additions: 0, removals: 0, modifications: 0 };
    const lineDiffs = diffLines(oldManifest, newManifest);
    let html = '';

    const highlightFn = protocol === 'dash' ? highlightDash : highlightHls;

    for (let i = 0; i < lineDiffs.length; i++) {
        const part = lineDiffs[i];
        const nextPart = lineDiffs[i + 1];

        // --- Modification Detection Logic (Word-level Diff) ---
        if (part.removed && nextPart && nextPart.added) {
            changes.modifications += 1;

            // --- ARCHITECTURAL FIX: Preserve Indentation ---
            // 1. Capture the leading whitespace from the original (removed) line.
            const indentationMatch = part.value.match(/^(\s*)/);
            const indentation = indentationMatch ? indentationMatch[1] : '';
            // --- END FIX ---

            const wordDiffs = diffWords(
                part.value.trim(),
                nextPart.value.trim()
            );

            let lineHtml = '';
            wordDiffs.forEach((wordPart) => {
                const highlightedValue = highlightFn(wordPart.value);
                if (wordPart.added) {
                    lineHtml += `<ins class="bg-yellow-700/60 text-yellow-100 rounded-sm px-1 no-underline">${highlightedValue}</ins>`;
                } else if (!wordPart.removed) {
                    lineHtml += highlightedValue;
                }
            });
            // --- ARCHITECTURAL FIX: Prepend the preserved indentation ---
            html += `<span>${indentation}${lineHtml}</span>\n`;
            // --- END FIX ---
            i++; // Skip the next part since we've processed it
            continue;
        }

        // --- Standard Addition/Removal/Common Logic ---
        if (part.added) {
            changes.additions += part.count;
            const lines = part.value.trimEnd().split('\n');
            lines.forEach((line) => {
                html += `<span class="bg-green-900/40 text-green-200">${highlightFn(
                    line
                )}</span>\n`;
            });
        } else if (part.removed) {
            changes.removals += part.count;
            // Do not render removed lines, as per user requirement.
        } else {
            // Unchanged lines
            const lines = part.value.trimEnd().split('\n');
            lines.forEach((line) => {
                html += `<span>${highlightFn(line)}</span>\n`;
            });
        }
    }

    return { diffHtml: html.trimEnd(), changes };
}