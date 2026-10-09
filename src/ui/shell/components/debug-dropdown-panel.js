import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { copyDebugInfoToClipboard } from '@/ui/services/debugService';
import { closeDropdown } from '@/ui/services/dropdownService';
import { html } from 'lit-html';


const toggleRow = (key, label, description, isChecked) => {
    const handleChange = (e) => {
        // Prevent the dropdown from closing when clicking the toggle row
        e.stopPropagation();
        uiActions.setDebugCopySelection(key, !isChecked);
    };

    return html`
        <div
            class="flex items-start justify-between p-3 rounded-lg bg-slate-800 hover:bg-slate-800 border border-transparent hover:border-slate-800 transition-colors cursor-pointer group"
            @click=${handleChange}
        >
            <div class="pr-4">
                <div
                    class="text-sm font-bold text-slate-100 group-hover:text-slate-100 transition-colors"
                >
                    ${label}
                </div>
                <div
                    class="text-[11px] text-slate-400 leading-tight mt-1 group-hover:text-slate-400 transition-colors"
                >
                    ${description}
                </div>
            </div>

            <div
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 mt-0.5 ${isChecked
            ? 'bg-blue-500'
            : 'bg-slate-800 border border-slate-800'}"
            >
                <span
                    class="inline-block h-3.5 w-3.5 transform rounded-full bg-slate-100 transition-transform shadow-sm ${isChecked
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
        <base-dropdown class="w-96 max-h-[80vh]">
            <!--Header -->
            <div
                slot="header"
                class="flex items-center gap-3 p-4 pb-3 border-b border-slate-800"
            >
                <div
                    class="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 shadow-inner border border-amber-500/20"
                >
                    ${icons.debug}
                </div>
                <div>
                    <h3
                        class="font-bold text-slate-100 text-sm"
                    >
                        State Diagnostics
                    </h3>
                    <p class="text-[11px] text-slate-400">
                        Select components to export for debugging.
                    </p>
                </div>
            </div>

            <!--Options List-->
            <div class="p-4 space-y-2">
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

            <!--Action Footer-->
        <div slot="footer" class="p-4 pt-3 border-t border-slate-800">
            <button
                    @click=${handleCopy}
            class="w-full bg-blue-500 hover:bg-[#60a5fa] text-slate-100 font-bold text-xs py-3 px-4 rounded-lg shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
            ${icons.clipboardCopy} Copy Debug Info
        </button>
            </div>
        </base-dropdown>
    `;
};
