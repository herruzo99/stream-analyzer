import { diffLines, diffWords } from 'diff';

/**
 * A sophisticated diffing engine that returns a structured data model.
 * It uses line-based comparison and then word-based comparison for modifications.
 * @param {string} oldManifest The original manifest string.
 * @param {string} newManifest The new manifest string.
 * @returns {{diffModel: import('@/types').DiffLine[], changes: {additions: number, removals: number, modifications: number}}}
 */
export function diffManifest(oldManifest, newManifest) {
    const changes = { additions: 0, removals: 0, modifications: 0 };
    /** @type {import('@/types').DiffLine[]} */
    const diffModel = [];
    const lineDiffs = diffLines(oldManifest, newManifest);

    for (let i = 0; i < lineDiffs.length; i++) {
        const part = lineDiffs[i];
        const nextPart = lineDiffs[i + 1];

        // --- ROBUST MODIFICATION DETECTION ---
        // Check for an 'added' block immediately following a 'removed' block
        // of the same line count. This indicates a block-level modification.
        if (part.removed && nextPart && nextPart.added && part.count === nextPart.count) {
            changes.modifications += part.count;

            const oldLines = part.value.trimEnd().split('\n');
            const newLines = nextPart.value.trimEnd().split('\n');

            for (let j = 0; j < oldLines.length; j++) {
                const oldLine = oldLines[j];
                const newLine = newLines[j];
                const indentation = oldLine.match(/^(\s*)/)?.[1] || '';

                // Perform word-level diff on the raw text.
                const wordDiffs = diffWords(oldLine.trim(), newLine.trim());

                /** @type {import('@/types').DiffWordPart[]} */
                const parts = wordDiffs.map(wordPart => ({
                    type: wordPart.added ? 'added' : wordPart.removed ? 'removed' : 'common',
                    value: wordPart.value,
                }));

                diffModel.push({
                    type: 'modified',
                    indentation,
                    content: '', // Not used for modified lines
                    parts,
                });
            }

            i++; // Skip the next 'added' part as we've processed it.
            continue;
        }
        // --- END ROBUST MODIFICATION DETECTION ---

        const lines = part.value.trimEnd().split('\n');
        lines.forEach((line) => {
            if (line.trim() === '') return;
            const indentation = line.match(/^(\s*)/)?.[1] || '';
            const content = line.trim();

            if (part.added) {
                changes.additions += 1;
                diffModel.push({ type: 'added', indentation, content });
            } else if (part.removed) {
                changes.removals += 1;
                diffModel.push({ type: 'removed', indentation, content });
            } else {
                diffModel.push({ type: 'common', indentation, content });
            }
        });
    }

    return { diffModel, changes };
}