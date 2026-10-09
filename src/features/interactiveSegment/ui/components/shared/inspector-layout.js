import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';

const mobileTabButton = (label, tabKey, icon) => {
    const { interactiveSegmentActiveTab } = useUiStore.getState();
    const isActive = interactiveSegmentActiveTab === tabKey;
    return html`
        <button
            @click=${() => uiActions.setInteractiveSegmentActiveTab(tabKey)}
            class="flex-1 flex flex-col items-center justify-center py-3 transition-all duration-200 border-t-2 ${isActive
                ? 'text-blue-400 border-[#3b82f6] bg-[#3b82f6]/5 shadow-[0_-5px_15px_#3b82f6/10]'
                : 'text-slate-400 border-transparent hover:text-slate-100 hover:bg-slate-800/50'}"
        >
            <span
                class="${isActive
                    ? 'scale-110 drop-shadow-[0_0_5px_#3b82f6/50]'
                    : ''} transition-transform duration-200"
                >${icon}</span
            >
            <span class="text-[10px] font-bold mt-1 uppercase tracking-wider"
                >${label}</span
            >
        </button>
    `;
};

export const inspectorLayoutTemplate = ({
    inspectorContent,
    structureContent,
    hexContent,
    toolbar = null,
}) => {
    const { interactiveSegmentActiveTab } = useUiStore.getState();

    const mobileViewClasses = (key) => ({
        'lg:hidden': true,
        hidden: interactiveSegmentActiveTab !== key,
        'h-full': true,
        'w-full': true,
        'animate-fadeIn': true,
    });

    return html`
        <div
            class="h-full w-full bg-slate-900 flex flex-col overflow-hidden relative"
        >
            <!-- Optional Toolbar -->
            ${toolbar
                ? html`<div
                      class="shrink-0 border-b border-slate-800 bg-slate-800/90 backdrop-blur-md z-20 relative shadow-sm"
                  >
                      ${toolbar}
                  </div>`
                : ''}

            <!-- Desktop Grid Layout -->
            <div
                class="hidden lg:grid lg:grid-cols-[300px_auto_1fr] grow min-h-0 divide-x divide-slate-700"
            >
                <!-- Left: Structure Tree (Surface B) -->
                <div
                    class="h-full min-h-0 flex flex-col bg-slate-800/30 backdrop-blur-sm overflow-y-auto relative"
                >
                    ${structureContent}
                </div>

                <!-- Center: Hex View (Surface A - The Workbench) -->
                <div
                    class="h-full min-h-0 min-w-[790px] flex flex-col bg-slate-900 relative z-10 shadow-2xl overflow-hidden"
                >
                    ${hexContent}
                </div>

                <!-- Right: Inspector (Surface B) -->
                <div
                    class="h-full min-h-0 flex flex-col bg-slate-800/50 backdrop-blur-md overflow-y-auto relative border-l border-slate-700"
                >
                    ${inspectorContent}
                </div>
            </div>

            <!-- Mobile Layout -->
            <div
                class="lg:hidden flex flex-col grow min-h-0 relative bg-slate-900"
            >
                <div class="grow min-h-0 relative">
                    <div class=${classMap(mobileViewClasses('structure'))}>
                        ${structureContent}
                    </div>
                    <div class=${classMap(mobileViewClasses('hex'))}>
                        ${hexContent}
                    </div>
                    <div class=${classMap(mobileViewClasses('inspector'))}>
                        ${inspectorContent}
                    </div>
                </div>

                <!-- Mobile Bottom Nav -->
                <div
                    class="shrink-0 bg-slate-800/95 backdrop-blur-xl border-t border-slate-800 flex items-stretch z-50 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.3)]"
                >
                    ${mobileTabButton(
                        'Structure',
                        'structure',
                        icons.folderTree
                    )}
                    ${mobileTabButton('Hex View', 'hex', icons.binary)}
                    ${mobileTabButton(
                        'Inspector',
                        'inspector',
                        icons.slidersHorizontal
                    )}
                </div>
            </div>
        </div>
    `;
};
