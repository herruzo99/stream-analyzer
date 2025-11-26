import { html } from 'lit-html';
import { useUiStore, uiActions } from '@/state/uiStore';
import { copyDebugInfoToClipboard } from '@/ui/services/debugService';
import { closeDropdown } from '@/ui/services/dropdownService';
import * as icons from '@/ui/icons';

const toggleRow = (key, label, description, isChecked) => {
    const handleChange = (e) => {
        // Prevent the dropdown from closing when clicking the toggle row
        e.stopPropagation();
        uiActions.setDebugCopySelection(key, !isChecked);
    };

    return html`
        <div
            class="flex items-start justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors cursor-pointer group"
            @click=${handleChange}
        >
            <div class="pr-4">
                <div
                    class="text-sm font-bold text-slate-200 group-hover:text-white transition-colors"
                >
                    ${label}
                </div>
                <div
                    class="text-[11px] text-slate-500 leading-tight mt-1 group-hover:text-slate-400 transition-colors"
                >
                    ${description}
                </div>
            </div>

            <div
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 mt-0.5 ${isChecked
                    ? 'bg-blue-600'
                    : 'bg-slate-700'}"
            >
                <span
                    class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${isChecked
                        ? 'translate-x-4.5'
                        : 'translate-x-1'}"
                ></span>
            </div>
        </div>
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
            class="dropdown-panel bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-96 p-4 ring-1 ring-black/50 flex flex-col gap-4"
        >
            <!-- Header -->
            <div class="flex items-center gap-3 pb-3 border-b border-white/5">
                <div
                    class="p-2.5 bg-yellow-500/10 rounded-xl text-yellow-400 shadow-inner border border-yellow-500/20"
                >
                    ${icons.debug}
                </div>
                <div>
                    <h3 class="font-bold text-white text-sm">
                        State Diagnostics
                    </h3>
                    <p class="text-[11px] text-slate-400">
                        Select components to export for debugging.
                    </p>
                </div>
            </div>

            <!-- Options List -->
            <div
                class="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1"
            >
                ${toggleRow(
                    'analysisState',
                    'Analysis State',
                    'Includes stream structure, summaries, manifests, and compliance results.',
                    debugCopySelections.analysisState
                )}
                ${toggleRow(
                    'uiState',
                    'Interface State',
                    'Includes active tabs, filters, view modes, and user settings.',
                    debugCopySelections.uiState
                )}
                ${toggleRow(
                    'rawManifests',
                    'Raw Manifests',
                    'Includes the full text content of all loaded manifests (Note: can be large).',
                    debugCopySelections.rawManifests
                )}
                ${toggleRow(
                    'parsedSegments',
                    'Parsed Segments',
                    'Includes the parsed structure of the first 5 cached segments (for parser debugging).',
                    debugCopySelections.parsedSegments
                )}
            </div>

            <!-- Action Footer -->
            <div class="pt-3 border-t border-white/5">
                <button
                    @click=${handleCopy}
                    class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 px-4 rounded-lg shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    ${icons.clipboardCopy} Copy Debug Info
                </button>
            </div>
        </div>
    `;
};
