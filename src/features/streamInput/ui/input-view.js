import { html, render } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { useUiStore, uiActions } from '@/state/uiStore';
import { libraryPanelTemplate } from '@/features/streamInput/ui/components/library-panel';
import { workspacePanelTemplate } from '@/features/streamInput/ui/components/workspace-panel';
import { inspectorPanelTemplate } from '@/features/streamInput/ui/components/inspector-panel';
import * as appIcons from '@/ui/icons';
import { openModalWithContent } from '@/ui/services/modalService';

const mobileTabButton = (key, label, icon) => {
    const { streamInputActiveMobileTab } = useUiStore.getState();
    const isActive = streamInputActiveMobileTab === key;
    return html`
        <button
            @click=${() => uiActions.setStreamInputActiveMobileTab(key)}
            class="flex-1 flex flex-col items-center justify-center p-2 transition-colors ${isActive
                ? 'text-blue-400'
                : 'text-slate-500 hover:text-slate-300'}"
        >
            ${icon}
            <span class="text-xs font-semibold mt-1">${label}</span>
        </button>
    `;
};

export const inputViewTemplate = () => {
    const { streamInputActiveMobileTab } = useUiStore.getState();

    const aboutClickHandler = (e) => {
        e.preventDefault();
        openModalWithContent({
            title: '',
            url: '',
            content: { type: 'about', data: {} },
        });
    };

    const mobileViewClasses = {
        'lg:hidden': true,
        'flex flex-col': true,
        'h-full': true,
        'w-full': true,
    };

    return html`
        <div class="w-full h-full flex flex-col p-4 sm:p-6 lg:p-8">
            <header class="flex items-start justify-between gap-4 mb-6 shrink-0">
                <div>
                    <h1 class="text-3xl sm:text-4xl font-bold text-white">Stream Analyzer</h1>
                    <p class="text-slate-400 mt-2 text-sm sm:text-base">
                        An advanced, in-browser tool for analyzing DASH & HLS streams.
                    </p>
                </div>
                <button
                    @click=${aboutClickHandler}
                    title="About this application"
                    class="text-slate-500 hover:text-white transition-colors shrink-0"
                >
                    ${appIcons.informationCircle}
                </button>
            </header>

            <!-- Desktop 3-Panel Layout -->
            <div
                class="grow hidden lg:grid lg:grid-cols-[25%_1.5rem_auto_1.5rem_30%] min-h-0"
            >
                <div class="flex flex-col min-h-0 animate-slideInUp" style="animation-delay: 100ms;">
                    ${libraryPanelTemplate()}
                </div>
                <div></div>
                <div class="flex flex-col min-h-0 animate-slideInUp">
                    ${workspacePanelTemplate()}
                </div>
                <div></div>
                <div
                    class="flex flex-col min-h-0 bg-slate-900 rounded-lg border border-slate-700 animate-slideInUp"
                    style="animation-delay: 200ms;"
                >
                    ${inspectorPanelTemplate()}
                </div>
            </div>

            <!-- Mobile Tabbed Layout -->
            <div class=${classMap(mobileViewClasses)}>
                <div class="grow min-h-0 overflow-y-auto mb-16">
                    ${streamInputActiveMobileTab === 'library'
                        ? libraryPanelTemplate()
                        : streamInputActiveMobileTab === 'workspace'
                          ? workspacePanelTemplate()
                          : inspectorPanelTemplate()}
                </div>
                <div
                    class="fixed bottom-0 left-0 right-0 h-16 bg-slate-800/80 backdrop-blur-sm border-t border-slate-700 flex items-stretch z-10"
                >
                    ${mobileTabButton('library', 'Library', appIcons.library)}
                    ${mobileTabButton('workspace', 'Workspace', appIcons.clipboardList)}
                    ${mobileTabButton('inspector', 'Inspector', appIcons.slidersHorizontal)}
                </div>
            </div>
        </div>
    `;
};