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

            const indentationMatch = part.value.match(/^(\s*)/);
            const indentation = indentationMatch ? indentationMatch[1] : '';

            // --- ARCHITECTURAL FIX: Highlight first, then diff ---
            // 1. Apply syntax highlighting to the full original and new lines.
            const oldLineHighlighted = highlightFn(part.value.trim());
            const newLineHighlighted = highlightFn(nextPart.value.trim());

            // 2. Perform a word-level diff on the resulting HTML strings.
            const wordDiffs = diffWords(oldLineHighlighted, newLineHighlighted);
            let lineHtml = '';
            wordDiffs.forEach((wordPart) => {
                if (wordPart.added) {
                    lineHtml += `<ins class="bg-yellow-700/60 text-yellow-100 rounded-sm no-underline">${wordPart.value}</ins>`;
                } else if (!wordPart.removed) {
                    lineHtml += wordPart.value;
                }
            });
            // --- END FIX ---

            html += `<span>${indentation}${lineHtml}</span>\n`;
            i++; // Skip the next part since we've processed it
            continue;
        }

        // --- Standard Addition/Removal/Common Logic ---
        if (part.added) {
            changes.additions += part.count;
            const lines = part.value.trimEnd().split('\n');
            lines.forEach((line) => {
                const indentationMatch = line.match(/^(\s*)/);
                const indentation = indentationMatch ? indentationMatch[1] : '';
                const content = line.trim();
                // Separate indentation from the styled content
                html += `<span>${indentation}</span><span class="bg-green-900/40 text-green-200">${highlightFn(
                    content
                )}</span>\n`;
            });
        } else if (part.removed) {
            changes.removals += part.count;
            const lines = part.value.trimEnd().split('\n');
            lines.forEach((line) => {
                const indentationMatch = line.match(/^(\s*)/);
                const indentation = indentationMatch ? indentationMatch[1] : '';
                const content = line.trim();
                // Separate indentation from the styled content
                html += `<span>${indentation}</span><span class="bg-red-900/40 text-red-300 line-through">${highlightFn(
                    content
                )}</span>\n`;
            });
        } else {
            // Unchanged lines
            const lines = part.value.trimEnd().split('\n');
            lines.forEach((line) => {
                const indentationMatch = line.match(/^(\s*)/);
                const indentation = indentationMatch ? indentationMatch[1] : '';
                html += `<span>${indentation}${highlightFn(
                    line.trim()
                )}</span>\n`;
            });
        }
    }

    return { diffHtml: html.trimEnd(), changes };
}