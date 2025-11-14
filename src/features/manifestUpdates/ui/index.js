import { html, render } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import * as icons from '@/ui/icons';
import { highlightDash, highlightHls } from '@/ui/shared/syntax-highlighter';

let container = null;
let currentStreamId = null;
let analysisUnsubscribe = null;
let uiUnsubscribe = null;
let keyboardListener = null;

function navigate(direction) {
    if (currentStreamId !== null) {
        analysisActions.navigateManifestUpdate(currentStreamId, -direction);
    }
}

const changeIndicator = (changes, count, label, icon, colorClasses, isMerged = false) => {
    if (count === undefined) return '';

    if (isMerged && changes.additions === 0 && changes.removals === 0 && changes.modifications === 0) {
        if (label.toLowerCase().startsWith('add')) { // Only render this once to avoid duplicates
            return html`<span class="text-xs font-semibold flex items-center gap-1 text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">${icons.checkCircle}<span>No Change</span></span>`;
        }
        return '';
    }
    
    if (count === 0) return '';
    
    const baseClasses = "text-xs font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full";
    let finalClasses = `${baseClasses}`;
    let title = '';

    const bgClassMap = {
        'text-green-300': 'bg-diff-add',
        'text-red-300': 'bg-diff-remove',
        'text-yellow-300': 'bg-diff-mod',
    };
    const stripedBgClassMap = {
        'text-green-300': 'bg-diff-add-striped',
        'text-red-300': 'bg-diff-remove-striped',
        'text-yellow-300': 'bg-diff-mod-striped',
    };

    if (isMerged) {
        finalClasses += ` ${colorClasses} ${stripedBgClassMap[colorClasses]}`;
        title = "Change from the start of this 'no change' period";
    } else {
        finalClasses += ` ${colorClasses} ${bgClassMap[colorClasses]}`;
    }
    
    return html`<span class="${finalClasses}" title=${title}>
        ${icon}
        <span>${count} ${label}${count > 1 ? 's' : ''}</span>
    </span>`;
};

const renderDiffLine = (line, isMerged, protocol) => {
    const highlightFn = protocol === 'dash' ? highlightDash : highlightHls;
    const addClass = isMerged ? 'bg-diff-add-striped' : 'bg-diff-add';
    const removeClass = isMerged ? 'bg-diff-remove-striped' : 'bg-diff-remove';
    const modClass = isMerged ? 'bg-diff-mod-striped' : 'bg-diff-mod';

    let lineContent;
    switch (line.type) {
        case 'added':
            lineContent = html`<span>${line.indentation}</span><span class="${addClass} text-green-200">${unsafeHTML(highlightFn(line.content))}</span>`;
            break;
        case 'removed':
            lineContent = html`<span>${line.indentation}</span><span class="${removeClass} text-red-300 line-through">${unsafeHTML(highlightFn(line.content))}</span>`;
            break;
        case 'modified':
            const partsHtml = line.parts.map(part => {
                const highlightedValue = unsafeHTML(highlightFn(part.value));
                if (part.type === 'added') {
                    return html`<ins class="${modClass} text-yellow-100 rounded-sm no-underline">${highlightedValue}</ins>`;
                } else if (part.type === 'common') {
                    return html`${highlightedValue}`;
                }
                return ''; // Omit removed parts
            });
            lineContent = html`<span>${line.indentation}${partsHtml}</span>`;
            break;
        case 'common':
        default:
            lineContent = html`<span>${line.indentation}${unsafeHTML(highlightFn(line.content))}</span>`;
            break;
    }
    return html`<div class="diff-line ${line.type}">${lineContent}</div>`;
};


const detailsTemplate = (update, hideDeleted, protocol) => {
    if (!update)
        return html`<div class="text-center p-8 text-slate-500">
            Select an update from the timeline to view details.
        </div>`;

    const { rawManifest, timestamp, changes, endSequenceNumber, endTimestamp, diffModel } = update;

    const handleCopyClick = () =>
        copyTextToClipboard(
            rawManifest,
            'Manifest version copied to clipboard!'
        );
    
    const isMerged = !!endSequenceNumber;
    
    const diffContainerClasses = {
        'diff-container': true,
        'hide-deleted': hideDeleted,
    };

    const timeDisplay = endTimestamp
        ? html`${timestamp} &rarr; ${endTimestamp}`
        : timestamp;
    
    return html`
        <header
            class="p-3 border-b border-slate-700 flex justify-between items-center shrink-0"
        >
            <div>
                <h4 class="font-bold text-slate-200">Update Details</h4>
                <div class="text-xs text-slate-400 font-mono">${timeDisplay}</div>
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
            ${changeIndicator(changes, changes?.additions, 'Addition', icons.plusCircle, 'text-green-300', isMerged)}
            ${changeIndicator(changes, changes?.removals, 'Removal', icons.minusCircle, 'text-red-300', isMerged)}
            ${changeIndicator(changes, changes?.modifications, 'Modification', icons.updates, 'text-yellow-300', isMerged)}
        </div>
        <div
            class="grow overflow-auto font-mono text-sm leading-relaxed p-2 ${classMap(diffContainerClasses)}"
        >
            ${diffModel.map(line => renderDiffLine(line, isMerged, protocol))}
        </div>
    `;
};


const updateCardTemplate = (update, isActive, streamId, playlistId) => {
    const { timestamp, endTimestamp, changes, hasNewIssues, sequenceNumber, endSequenceNumber } = update;
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
        analysisActions.setActiveManifestUpdate(streamId, update.id);
    };

    const title = endSequenceNumber
        ? html`Update #${sequenceNumber} &rarr; #${endSequenceNumber}`
        : html`Update #${sequenceNumber}`;
    
    const timeDisplay = endTimestamp
        ? html`${timestamp} &rarr; ${endTimestamp}`
        : timestamp;

    const isMerged = !!endSequenceNumber;

    return html`
        <div
            class="block p-3 rounded-lg border-2 transition-all cursor-pointer ${classMap(
                cardClasses
            )}"
            @click=${handleClick}
        >
            <div class="flex justify-between items-center">
                <div class="font-bold text-slate-200">
                    ${title}
                </div>
                <div class="text-xs text-slate-400 font-mono">${timeDisplay}</div>
            </div>
            <div class="mt-2 flex items-center gap-3">
                ${changeIndicator(changes, changes.additions, 'add', icons.plusCircle, 'text-green-300', isMerged)}
                ${changeIndicator(changes, changes.removals, 'del', icons.minusCircle, 'text-red-300', isMerged)}
                ${changeIndicator(changes, changes.modifications, 'mod', icons.updates, 'text-yellow-300', isMerged)}
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

const sidebarTemplate = (updates, activeUpdateId, streamId, playlistId) => {
    return html`
        <div class="flex flex-col h-full">
            <header class="p-3 border-b border-slate-700 shrink-0">
                <h4 class="font-bold text-slate-200">Update Timeline</h4>
            </header>
            <div
                id="update-timeline"
                class="flex flex-col gap-2 overflow-y-auto p-2"
            >
                ${updates.map((update) =>
                    updateCardTemplate(
                        update,
                        update.id === activeUpdateId,
                        streamId,
                        playlistId
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

    const { manifestUpdatesHideDeleted } = useUiStore.getState();
    if (!stream) {
        manifestUpdatesView.unmount();
        return;
    }

    let mainContent;
    let headerText = 'Live Manifest Monitor';
    const contextualSidebar = document.getElementById('contextual-sidebar');

    // --- ARCHITECTURAL FIX: START ---
    // Correctly determine the active playlist context and its data.
    const activePlaylistKey =
        stream.activeMediaPlaylistId || (stream.protocol === 'hls' ? 'master' : null);

    let playlistData;
    if (stream.protocol === 'hls' && activePlaylistKey) {
        playlistData = stream.mediaPlaylists.get(activePlaylistKey);
        headerText +=
            activePlaylistKey === 'master'
                ? ' for Master Playlist'
                : ' for Media Playlist';
    } else {
        // For DASH, create a compatible object from the top-level stream data.
        playlistData = {
            updates: stream.manifestUpdates,
            activeUpdateId: stream.activeManifestUpdateId,
        };
        headerText += ' for MPD';
    }

    // Now, use `playlistData` as the single source of truth for rendering.
    const manifestUpdates = playlistData?.updates || [];
    const activeManifestUpdateId = playlistData?.activeUpdateId;
    // --- ARCHITECTURAL FIX: END ---

    if (stream.manifest.type !== 'dynamic') {
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
    } else if (manifestUpdates.length === 0) {
        mainContent = html`<div
            class="h-full flex items-center justify-center text-center text-slate-500"
        >
            <div>
                <div class="mx-auto">${icons.spinner}</div>
                <h3 class="mt-2 text-lg font-medium text-slate-300">
                    Awaiting first manifest update...
                </h3>
            </div>
        </div>`;
        if (contextualSidebar) render(html``, contextualSidebar);
    } else {
        const currentUpdate = manifestUpdates.find(u => u.id === activeManifestUpdateId);
        mainContent = html`<div
            class="bg-slate-800 rounded-lg border border-slate-700 flex flex-col h-full"
        >
            ${detailsTemplate(currentUpdate, manifestUpdatesHideDeleted, stream.protocol)}
        </div>`;

        if (contextualSidebar) {
            render(
                sidebarTemplate(
                    manifestUpdates,
                    activeManifestUpdateId,
                    stream.id,
                    stream.activeMediaPlaylistId
                ),
                contextualSidebar
            );
        }
    }

    const finalTemplate = html`
        <header
            class="shrink-0 mb-4 flex justify-between items-center flex-wrap gap-y-2"
        >
            <div>
                 <h3 class="text-xl text-white font-bold">${headerText}</h3>
                 <p class="text-sm text-slate-400 mt-1">
                    Use Up/Down arrow keys to navigate update history.
                </p>
            </div>
            <div class="flex items-center gap-2">
                <label for="hide-deleted-toggle" class="text-sm text-slate-400"
                    >Hide deleted lines</label
                >
                <button
                    @click=${() => uiActions.toggleManifestUpdatesHideDeleted()}
                    role="switch"
                    aria-checked="${manifestUpdatesHideDeleted}"
                    id="hide-deleted-toggle"
                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${manifestUpdatesHideDeleted
                        ? 'bg-blue-600'
                        : 'bg-slate-600'}"
                >
                    <span
                        class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${manifestUpdatesHideDeleted
                            ? 'translate-x-6'
                            : 'translate-x-1'}"
                    ></span>
                </button>
            </div>
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
        if (uiUnsubscribe) uiUnsubscribe();
        uiUnsubscribe = useUiStore.subscribe(renderManifestUpdates);

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
        if (uiUnsubscribe) uiUnsubscribe();
        uiUnsubscribe = null;
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