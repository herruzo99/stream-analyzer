import { html, render } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { debugLog } from '@/shared/utils/debug';
import * as icons from '@/ui/icons';

let container = null;
let currentStreamId = null;
let analysisUnsubscribe = null;
let keyboardListener = null;

function navigate(direction) {
    if (currentStreamId !== null) {
        // Direction is inverted: Up arrow (-1) moves to a newer update (lower index).
        analysisActions.navigateManifestUpdate(currentStreamId, -direction);
    }
}

const changeIndicator = (count, label, icon, colorClasses) => {
    if (count === undefined || count === 0) return '';
    return html`<span
        class="text-xs font-semibold flex items-center gap-1 ${colorClasses}"
    >
        ${icon}
        <span>${count} ${label}${count > 1 ? 's' : ''}</span>
    </span>`;
};

const updateCardTemplate = (update, isActive) => {
    const { timestamp, changes, hasNewIssues, sequenceNumber } = update;
    const cardClasses = {
        'bg-slate-800': !isActive,
        'border-slate-700': !isActive,
        'hover:border-blue-400': !isActive,
        'bg-blue-900/50': isActive,
        'border-blue-500': isActive,
        'ring-2': isActive,
        'ring-blue-500/30': isActive,
    };

    const handleClick = () => {
        analysisActions.setActiveManifestUpdate(currentStreamId, update.id);
    };

    return html`
        <div
            class="block p-3 rounded-lg border-2 transition-all cursor-pointer ${classMap(
                cardClasses
            )}"
            @click=${handleClick}
        >
            <div class="flex justify-between items-center">
                <div class="font-bold text-slate-200">
                    Update #${sequenceNumber}
                </div>
                <div class="text-xs text-slate-400 font-mono">${timestamp}</div>
            </div>
            <div class="mt-2 flex items-center gap-3">
                ${changeIndicator(
                    changes.additions,
                    'addition',
                    icons.plusCircle,
                    'text-green-400'
                )}
                ${changeIndicator(
                    changes.removals,
                    'removal',
                    icons.minusCircle,
                    'text-red-400'
                )}
                ${changeIndicator(
                    changes.modifications,
                    'modification',
                    icons.updates,
                    'text-yellow-400'
                )}
                ${hasNewIssues
                    ? html`<span
                          class="text-xs font-semibold text-red-400 animate-pulse"
                          >New Issues!</span
                      >`
                    : ''}
            </div>
        </div>
    `;
};

const detailsTemplate = (update) => {
    if (!update)
        return html`<div class="text-center p-8 text-slate-500">
            Select an update from the timeline to view details.
        </div>`;

    const { diffHtml, rawManifest, timestamp, changes } = update;
    const lines = diffHtml.split('\n');

    const handleCopyClick = () =>
        copyTextToClipboard(
            rawManifest,
            'Manifest version copied to clipboard!'
        );

    return html`
        <header
            class="p-3 border-b border-slate-700 flex justify-between items-center shrink-0"
        >
            <div>
                <h4 class="font-bold text-slate-200">Update Details</h4>
                <div class="text-xs text-slate-400 font-mono">${timestamp}</div>
            </div>
            <button
                @click=${handleCopyClick}
                class="bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs py-1.5 px-3 rounded-md transition-colors flex items-center gap-2"
            >
                ${icons.clipboardCopy} Copy Raw
            </button>
        </header>
        <div
            class="p-3 flex items-center gap-4 text-sm border-b border-slate-700 shrink-0"
        >
            <span class="font-semibold text-slate-400">Changes:</span>
            ${changeIndicator(
                changes.additions,
                'Addition',
                icons.plusCircle,
                'text-green-300'
            )}
            ${changeIndicator(
                changes.removals,
                'Removal',
                icons.minusCircle,
                'text-red-300'
            )}
            ${changeIndicator(
                changes.modifications,
                'Modification',
                icons.updates,
                'text-yellow-300'
            )}
        </div>
        <div class="grow overflow-auto font-mono text-sm leading-relaxed p-2">
            ${lines.map(
                (line, i) => html`
                    <div class="flex">
                        <span
                            class="text-right text-slate-500 pr-4 select-none shrink-0 w-10"
                            >${i + 1}</span
                        >
                        <span class="grow whitespace-pre-wrap break-all"
                            >${unsafeHTML(line)}</span
                        >
                    </div>
                `
            )}
        </div>
    `;
};

const sidebarTemplate = (manifestUpdates, activeManifestUpdateId) => {
    return html`
        <div class="flex flex-col h-full">
            <header class="p-3 border-b border-slate-700 shrink-0">
                <h4 class="font-bold text-slate-200">Update Timeline</h4>
            </header>
            <div
                id="update-timeline"
                class="flex flex-col gap-2 overflow-y-auto p-2"
            >
                ${manifestUpdates.map((update) =>
                    updateCardTemplate(
                        update,
                        update.id === activeManifestUpdateId
                    )
                )}
            </div>
        </div>
    `;
};

function renderManifestUpdates() {
    if (!container || currentStreamId === null) return;

    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === currentStreamId);

    if (!stream) {
        manifestUpdatesView.unmount();
        return;
    }

    let mainContent;
    const contextualSidebar = document.getElementById('contextual-sidebar');

    if (stream.protocol === 'hls' && stream.activeMediaPlaylistUrl) {
        mainContent = html`<div
            class="bg-yellow-900/30 border border-yellow-700 text-yellow-200 text-sm p-4 rounded-lg m-4"
        >
            <p class="font-bold">Displaying Media Playlist</p>
            <p>
                Live manifest updates are only tracked for the Master Playlist.
                Select "Master Playlist" from the context menu to see the live
                monitor.
            </p>
        </div>`;
        if (contextualSidebar) render(html``, contextualSidebar);
    } else if (stream.manifest.type !== 'dynamic') {
        mainContent = html`<div
            class="h-full flex items-center justify-center text-center text-slate-500"
        >
            <div>
                ${icons.fileText}
                <h3 class="mt-2 text-lg font-medium text-slate-300">
                    Static Manifest
                </h3>
                <p class="mt-1 text-sm">
                    This is a VOD stream and is not expected to have updates.
                </p>
            </div>
        </div>`;
        if (contextualSidebar) render(html``, contextualSidebar);
    } else {
        const { manifestUpdates, activeManifestUpdateId } = stream;

        if (manifestUpdates.length === 0) {
            mainContent = html`<div
                class="h-full flex items-center justify-center text-center text-slate-500"
            >
                <div>
                    <div class="animate-spin mx-auto">${icons.spinner}</div>
                    <h3 class="mt-2 text-lg font-medium text-slate-300">
                        Awaiting first manifest update...
                    </h3>
                </div>
            </div>`;
            if (contextualSidebar) render(html``, contextualSidebar);
        } else {
            const currentUpdate = manifestUpdates.find(
                (u) => u.id === activeManifestUpdateId
            );

            mainContent = html`
                <div
                    class="bg-slate-800 rounded-lg border border-slate-700 flex flex-col h-full"
                >
                    ${detailsTemplate(currentUpdate)}
                </div>
            `;

            if (contextualSidebar) {
                render(
                    sidebarTemplate(manifestUpdates, activeManifestUpdateId),
                    contextualSidebar
                );
            }
        }
    }

    const finalTemplate = html`
        <header class="shrink-0 mb-4">
            <h3 class="text-xl font-bold text-white">Live Manifest Monitor</h3>
            <p class="text-sm text-slate-400 mt-1">
                Showing real-time updates for the
                ${stream.protocol === 'dash' ? 'MPD' : 'Master Playlist'}. Use
                Up/Down arrow keys to navigate.
            </p>
        </header>
        <div class="grow min-h-0">${mainContent}</div>
    `;

    render(finalTemplate, container);
}

export const manifestUpdatesView = {
    hasContextualSidebar: true,
    mount(containerElement, { stream }) {
        container = containerElement;
        currentStreamId = stream.id;

        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = useAnalysisStore.subscribe(renderManifestUpdates);

        keyboardListener = (event) => {
            if (event.key === 'ArrowUp') navigate(1);
            if (event.key === 'ArrowDown') navigate(-1);
        };
        document.addEventListener('keydown', keyboardListener);

        renderManifestUpdates();
    },

    unmount() {
        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = null;
        if (keyboardListener) {
            document.removeEventListener('keydown', keyboardListener);
            keyboardListener = null;
        }
        if (container) {
            render(html``, container);
        }
        const contextualSidebar = document.getElementById('contextual-sidebar');
        if (contextualSidebar) {
            render(html``, contextualSidebar);
        }
        container = null;
        currentStreamId = null;
    },
};
