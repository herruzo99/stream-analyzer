import { html } from 'lit-html';

/**
 * Renders a dropdown to select the standard version for HLS compliance/feature analysis.
 * @param {object} options
 * @param {number} options.selectedVersion - The currently selected version number.
 * @param {Function} options.onVersionChange - The callback function to execute on change.
 * @returns {import('lit-html').TemplateResult}
 */
export const standardSelectorTemplate = ({
    selectedVersion,
    onVersionChange,
}) => {
    // HLS versions based on IETF RFCs and Apple's specifications
    const versions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    const versionLabels = {
        1: 'v1 (Baseline)',
        4: 'v4 (Media Groups, Byte Range)',
        7: 'v7 (RFC 8216)',
        8: 'v8 (Variable Sub, Bitrate Hint)',
        9: 'v9 (LL-HLS)',
        10: 'v10 (Stable IDs)',
        11: 'v11 (Content Steering)',
        12: 'v12 (RFC 8216bis)',
        13: 'v13 (WWDC25 Draft)',
    };

    const handleChange = (e) => {
        const newVersion = parseInt(e.target.value, 10);
        onVersionChange(newVersion);
    };

    return html`
        <div class="flex items-center gap-2">
            <label
                for="standard-version-selector"
                class="text-sm font-medium text-gray-400"
                >HLS Standard:</label
            >
            <select
                id="standard-version-selector"
                class="bg-gray-700 text-white rounded-md border-gray-600 p-2"
                @change=${handleChange}
                .value=${String(selectedVersion)}
            >
                ${versions.map(
                    (v) =>
                        html`<option value="${v}">
                            ${versionLabels[v] || `v${v}`}
                        </option>`
                )}
            </select>
        </div>
    `;
};
