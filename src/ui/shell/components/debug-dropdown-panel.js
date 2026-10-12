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
        <button
            class="w-full flex items-start justify-between gap-3 p-2.5 rounded-md hover:bg-white/5 border border-transparent transition-colors text-left"
            @click=${handleChange}
            role="switch"
            aria-checked=${isChecked}
            aria-label="${label}"
        >
            <span class="pr-2">
                <span class="block text-[13px] font-medium text-slate-100">
                    ${label}
                </span>
                <span
                    class="block text-[11px] text-slate-500 leading-snug mt-0.5"
                >
                    ${description}
                </span>
            </span>

            <span
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 mt-0.5 ${isChecked
                    ? 'bg-emerald-400'
                    : 'bg-white/10'}"
            >
                <span
                    class="inline-block h-3.5 w-3.5 rounded-full bg-slate-950 transition-transform ${isChecked
                        ? 'translate-x-[18px]'
                        : 'translate-x-[3px]'}"
                ></span>
            </span>
        </button>
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
            <div
                slot="header"
                class="flex items-center gap-3 px-4 py-3 border-b border-white/5"
            >
                <span class="text-slate-500">${icons.debug}</span>
                <div>
                    <h3 class="font-medium text-slate-100 text-sm">
                        State diagnostics
                    </h3>
                    <p class="mono text-[10px] text-slate-600">
                        pick sections, copy to clipboard
                    </p>
                </div>
            </div>

            <div class="p-3">
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

        <div slot="footer" class="p-3 border-t border-white/5">
            <button
                @click=${handleCopy}
                class="w-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-[13px] py-2.5 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
            >
                ${icons.clipboardCopy} Copy debug info
            </button>
        </div>
        </base-dropdown>
    `;
};
