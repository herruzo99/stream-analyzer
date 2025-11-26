import { html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { useUiStore, uiActions } from '@/state/uiStore';
import { connectedTabBar } from '@/ui/components/tabs';
import * as icons from '@/ui/icons';

const mobileTabButton = (label, tabKey, icon) => {
    const { interactiveSegmentActiveTab } = useUiStore.getState();
    const isActive = interactiveSegmentActiveTab === tabKey;
    return html`
        <button
            @click=${() => uiActions.setInteractiveSegmentActiveTab(tabKey)}
            class="flex-1 flex flex-col items-center justify-center py-3 transition-all duration-200 border-t-2 ${isActive
                ? 'text-blue-400 border-blue-500 bg-blue-500/5'
                : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'}"
        >
            <span
                class="${isActive
                    ? 'scale-110'
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
        <div class="h-full w-full bg-slate-950 flex flex-col overflow-hidden">
            <!-- Optional Toolbar -->
            ${toolbar
                ? html`<div
                      class="shrink-0 border-b border-slate-800 bg-slate-900 z-20 relative"
                  >
                      ${toolbar}
                  </div>`
                : ''}

            <!-- Desktop Grid Layout -->
            <div
                class="hidden lg:grid lg:grid-cols-[minmax(250px,300px)_minmax(400px,1fr)_minmax(280px,320px)] 2xl:grid-cols-[minmax(300px,360px)_minmax(500px,1fr)_minmax(350px,400px)] grow min-h-0 divide-x divide-slate-800"
            >
                <!-- Left: Structure Tree -->
                <div
                    class="h-full min-h-0 flex flex-col bg-slate-900/30 overflow-hidden relative"
                >
                    ${structureContent}
                </div>

                <!-- Center: Hex View (The Workbench) -->
                <div
                    class="h-full min-h-0 flex flex-col bg-slate-950 relative z-10 shadow-2xl overflow-hidden"
                >
                    ${hexContent}
                </div>

                <!-- Right: Inspector (Details) -->
                <div
                    class="h-full min-h-0 flex flex-col bg-slate-900/50 overflow-hidden relative"
                >
                    ${inspectorContent}
                </div>
            </div>

            <!-- Mobile Layout -->
            <div class="lg:hidden flex flex-col grow min-h-0 relative">
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
                    class="shrink-0 bg-slate-900 border-t border-slate-800 flex items-stretch z-50 pb-safe"
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
