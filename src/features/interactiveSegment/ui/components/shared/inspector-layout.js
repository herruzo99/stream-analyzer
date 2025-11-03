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
            class="flex-1 flex flex-col items-center justify-center p-2 transition-colors ${isActive
                ? 'text-blue-400 bg-slate-800'
                : 'text-slate-500 hover:text-slate-300'}"
        >
            ${icon}
            <span class="text-xs font-semibold mt-1">${label}</span>
        </button>
    `;
};

export const inspectorLayoutTemplate = ({
    inspectorContent,
    structureContent,
    hexContent,
}) => {
    const { interactiveSegmentActiveTab } = useUiStore.getState();

    const tabs = [
        { key: 'inspector', label: 'Inspector' },
        { key: 'hex', label: 'Hex View' },
    ];

    const mobileViewClasses = (key) => ({
        'lg:hidden': true,
        hidden: interactiveSegmentActiveTab !== key,
        'h-full': true,
        'w-full': true,
    });

    return html`
        <!-- Desktop Layout: Responsive 2-column and 3-column Grid -->
        <div
            class="hidden lg:grid lg:grid-cols-[minmax(320px,25%)_1fr] 2xl:grid-cols-[minmax(320px,20%)_35%_1fr] lg:gap-4 h-full"
        >
            <!-- Column 1: Structure Tree (Always visible on desktop) -->
            <div class="h-full min-h-0">${structureContent}</div>

            <!-- Column 2 (for 2XL): Inspector Panel -->
            <div class="hidden 2xl:flex flex-col h-full min-h-0">
                ${inspectorContent}
            </div>

            <!-- Column 3 (for 2XL): Hex View Panel -->
            <div class="hidden 2xl:flex flex-col h-full min-h-0">
                ${hexContent}
            </div>

            <!-- Tabbed container for LG screens (hidden on 2XL) -->
            <div class="flex flex-col h-full min-h-0 2xl:hidden">
                ${connectedTabBar(
                    tabs,
                    interactiveSegmentActiveTab,
                    uiActions.setInteractiveSegmentActiveTab
                )}
                <div
                    class="grow bg-slate-900 rounded-b-lg min-h-0 border-x border-b border-slate-700"
                >
                    <div
                        class="h-full ${interactiveSegmentActiveTab !==
                        'inspector'
                            ? 'hidden'
                            : ''}"
                    >
                        ${inspectorContent}
                    </div>
                    <div
                        class="h-full ${interactiveSegmentActiveTab !== 'hex'
                            ? 'hidden'
                            : ''}"
                    >
                        ${hexContent}
                    </div>
                </div>
            </div>
        </div>

        <!-- Mobile Layout: Fullscreen with Bottom Tabs -->
        <div class="lg:hidden flex flex-col h-full w-full">
            <div class="grow min-h-0 overflow-y-auto mb-16">
                <div class=${classMap(mobileViewClasses('structure'))}>
                    ${structureContent}
                </div>
                <div class=${classMap(mobileViewClasses('inspector'))}>
                    ${inspectorContent}
                </div>
                <div class=${classMap(mobileViewClasses('hex'))}>
                    ${hexContent}
                </div>
            </div>
            <div
                class="fixed bottom-0 left-0 right-0 h-16 bg-slate-800/80 backdrop-blur-sm border-t border-slate-700 flex items-stretch z-10"
            >
                ${mobileTabButton('Structure', 'structure', icons.folderTree)}
                ${mobileTabButton(
                    'Inspector',
                    'inspector',
                    icons.slidersHorizontal
                )}
                ${mobileTabButton('Hex View', 'hex', icons.binary)}
            </div>
        </div>
    `;
};
