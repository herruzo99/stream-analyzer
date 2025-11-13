import { html } from 'lit-html';
import { useUiStore, uiActions } from '@/state/uiStore';
import { copyDebugInfoToClipboard } from '@/ui/services/debugService';
import { closeDropdown } from '@/ui/services/dropdownService';
import * as icons from '@/ui/icons';

const checkboxRow = (key, label, description, isChecked) => {
    const handleChange = (e) => {
        uiActions.setDebugCopySelection(key, e.target.checked);
    };

    return html`
        <label
            class="flex items-start gap-3 p-2 rounded-md hover:bg-slate-700/50 cursor-pointer"
        >
            <input
                type="checkbox"
                .checked=${isChecked}
                @change=${handleChange}
                class="mt-1 h-4 w-4 rounded bg-slate-600 border-slate-500 text-blue-500 focus:ring-blue-600"
            />
            <div>
                <span class="font-semibold text-slate-200 text-sm"
                    >${label}</span
                >
                <p class="text-xs text-slate-400">${description}</p>
            </div>
        </label>
    `;
};

export const debugDropdownPanelTemplate = () => {
    const { debugCopySelections } = useUiStore.getState();

    const handleCopy = () => {
        copyDebugInfoToClipboard();
        closeDropdown();
    };

    return html`
        <div
            class="dropdown-panel bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-80 p-3 space-y-3"
        >
            <h4 class="font-bold text-slate-200 flex items-center gap-2">
                ${icons.debug} Copy Debug Info
            </h4>
            <div class="space-y-1">
                ${checkboxRow(
                    'analysisState',
                    'Analysis State',
                    'Includes stream structure, summaries, and compliance results.',
                    debugCopySelections.analysisState
                )}
                ${checkboxRow(
                    'uiState',
                    'UI State',
                    'Includes active tabs, filters, and other UI settings.',
                    debugCopySelections.uiState
                )}
                ${checkboxRow(
                    'rawManifests',
                    'Raw Manifests',
                    'Includes the full text of all loaded manifests (can be large).',
                    debugCopySelections.rawManifests
                )}
                ${checkboxRow(
                    'parsedSegments',
                    'Parsed Segments',
                    'Includes the parsed structure of the first 5 cached segments (for parser debugging).',
                    debugCopySelections.parsedSegments
                )}
            </div>
            <button
                @click=${handleCopy}
                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md text-sm"
            >
                Copy Selected Info
            </button>
        </div>
    `;
};