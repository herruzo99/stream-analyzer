import { html } from 'lit-html';
import { analysisActions } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import {
    getHistory,
    getPresets,
    deleteWorkspace,
    deleteHistoryItem,
    deletePreset,
} from '@/infrastructure/persistence/streamStorage';
import { exampleStreams } from '@/data/example-streams';
import * as icons from '@/ui/icons';
import { connectedTabBar } from '@/ui/components/tabs';

const getBadge = (text, colorClasses) => {
    if (!text) return '';
    return html`<span
        class="text-xs font-semibold px-2 py-0.5 rounded-full ${colorClasses}"
        >${text.toUpperCase()}</span
    >`;
};

const renderStreamListItem = (stream, context) => {
    const protocolBadge =
        stream.protocol === 'dash'
            ? getBadge('DASH', 'bg-blue-800 text-blue-200')
            : stream.protocol === 'hls'
              ? getBadge('HLS', 'bg-purple-800 text-purple-200')
              : '';

    const typeBadge =
        stream.type === 'live'
            ? getBadge('LIVE', 'bg-red-800 text-red-200')
            : stream.type === 'vod'
              ? getBadge('VOD', 'bg-green-800 text-green-200')
              : '';

    const handleAdd = (e) => {
        e.stopPropagation();
        analysisActions.addStreamInputFromPreset(stream);
        uiActions.setStreamInputActiveMobileTab('workspace');
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete "${stream.name}"?`)) {
            if (context === 'history') {
                deleteHistoryItem(stream.url);
            } else if (context === 'presets') {
                deletePreset(stream.url);
            }
            // Trigger a re-render of the panel
            const currentTab = useUiStore.getState().streamLibraryActiveTab;
            uiActions.setStreamLibraryTab(currentTab);
        }
    };

    const canDelete = context === 'history' || context === 'presets';

    return html`
        <li
            @click=${handleAdd}
            class="group p-3 hover:bg-slate-700/50 flex justify-between items-center cursor-pointer"
        >
            <div class="flex flex-col min-w-0">
                <span
                    class="font-semibold text-slate-200 truncate"
                    title="${stream.name}"
                    >${stream.name}</span
                >
                <span
                    class="text-xs text-slate-400 font-mono truncate"
                    title="${stream.url}"
                    >${stream.url}</span
                >
                <div class="shrink-0 flex items-center gap-2 mt-2">
                    ${protocolBadge} ${typeBadge}
                </div>
            </div>
            <div class="shrink-0 flex items-center gap-2 ml-4">
                ${canDelete
                    ? html`<button
                          @click=${handleDelete}
                          class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 bg-slate-900/50 hover:bg-red-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete"
                      >
                          ${icons.xCircle}
                      </button>`
                    : ''}
            </div>
        </li>
    `;
};

const renderWorkspaceListItem = (workspace) => {
    const handleLoad = (e) => {
        e.stopPropagation();
        analysisActions.setStreamInputs(workspace.inputs);
        uiActions.setLoadedWorkspaceName(workspace.name);
        uiActions.setStreamInputActiveMobileTab('workspace');
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        if (
            confirm(
                `Are you sure you want to delete the "${workspace.name}" workspace?`
            )
        ) {
            deleteWorkspace(workspace.name);
        }
    };

    return html`
        <li
            @click=${handleLoad}
            class="group p-3 hover:bg-slate-700/50 flex justify-between items-center cursor-pointer"
        >
            <div class="flex flex-col min-w-0">
                <span
                    class="font-semibold text-slate-200 truncate"
                    title="${workspace.name}"
                    >${workspace.name}</span
                >
                <span class="text-xs text-slate-400 mt-1"
                    >${workspace.inputs.length} stream(s)</span
                >
            </div>
            <div
                class="shrink-0 flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <button
                    @click=${handleDelete}
                    class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 bg-slate-900/50 hover:bg-red-600 hover:text-white"
                    title="Delete Workspace"
                >
                    ${icons.xCircle}
                </button>
            </div>
        </li>
    `;
};

const renderListSection = (title, items, itemTemplate, context) => {
    if (items.length === 0) {
        return html`<p class="text-center text-sm text-slate-500 p-8">
            No items found.
        </p>`;
    }
    return html`
        <div>
            <h4
                class="font-bold text-slate-400 text-sm tracking-wider uppercase px-3 pt-3 pb-2 sticky top-0 bg-slate-900 z-10"
            >
                ${title} (${items.length})
            </h4>
            <ul class="divide-y divide-slate-700/50">
                ${items.map((item) => itemTemplate(item, context))}
            </ul>
        </div>
    `;
};

export const libraryPanelTemplate = () => {
    const { streamLibraryActiveTab, streamLibrarySearchTerm, workspaces } =
        useUiStore.getState();
    const lowerSearch = streamLibrarySearchTerm.toLowerCase();

    let content;

    if (streamLibrarySearchTerm) {
        // Global search view
        const filteredWorkspaces = workspaces.filter((w) =>
            w.name.toLowerCase().includes(lowerSearch)
        );
        const filteredPresets = getPresets().filter(
            (s) =>
                s.name.toLowerCase().includes(lowerSearch) ||
                s.url.toLowerCase().includes(lowerSearch)
        );
        const filteredHistory = getHistory().filter(
            (s) =>
                s.name.toLowerCase().includes(lowerSearch) ||
                s.url.toLowerCase().includes(lowerSearch)
        );
        const filteredExamples = exampleStreams.filter(
            (s) =>
                s.name.toLowerCase().includes(lowerSearch) ||
                s.url.toLowerCase().includes(lowerSearch) ||
                s.protocol.toLowerCase().includes(lowerSearch)
        );

        const totalResults =
            filteredWorkspaces.length +
            filteredPresets.length +
            filteredHistory.length +
            filteredExamples.length;

        if (totalResults === 0) {
            content = html`<p class="text-center text-sm text-slate-500 p-8">
                No items match your search.
            </p>`;
        } else {
            content = html`
                <div class="space-y-4">
                    ${renderListSection(
                        'Workspaces',
                        filteredWorkspaces,
                        renderWorkspaceListItem
                    )}
                    ${renderListSection(
                        'Presets',
                        filteredPresets,
                        renderStreamListItem,
                        'presets'
                    )}
                    ${renderListSection(
                        'History',
                        filteredHistory,
                        renderStreamListItem,
                        'history'
                    )}
                    ${renderListSection(
                        'Examples',
                        filteredExamples,
                        renderStreamListItem,
                        'examples'
                    )}
                </div>
            `;
        }
    } else {
        // Tabbed view
        if (streamLibraryActiveTab === 'workspaces') {
            content = renderListSection(
                'Workspaces',
                workspaces,
                renderWorkspaceListItem,
                'workspaces'
            );
        } else if (streamLibraryActiveTab === 'presets') {
            content = renderListSection(
                'Presets',
                getPresets(),
                renderStreamListItem,
                'presets'
            );
        } else if (streamLibraryActiveTab === 'history') {
            content = renderListSection(
                'History',
                getHistory(),
                renderStreamListItem,
                'history'
            );
        } else {
            content = renderListSection(
                'Examples',
                exampleStreams,
                renderStreamListItem,
                'examples'
            );
        }
    }

    const tabs = [
        { key: 'workspaces', label: 'Workspaces', count: workspaces.length },
        { key: 'presets', label: 'Presets' },
        { key: 'history', label: 'History' },
        { key: 'examples', label: 'Examples' },
    ];

    return html`
        <div
            class="flex flex-col h-full bg-slate-900 rounded-lg border border-slate-700"
        >
            <div class="p-3 space-y-3 shrink-0">
                <h3 class="text-lg font-bold text-white">Stream Library</h3>
                <input
                    type="search"
                    placeholder="Search library..."
                    .value=${streamLibrarySearchTerm}
                    @input=${(e) =>
                        uiActions.setStreamLibrarySearchTerm(e.target.value)}
                    class="w-full bg-slate-800 text-white rounded-md p-2 border border-slate-600 focus:ring-1 focus:ring-blue-500"
                />
                ${connectedTabBar(
                    tabs,
                    streamLibraryActiveTab,
                    uiActions.setStreamLibraryTab
                )}
            </div>
            <div class="grow overflow-y-auto">${content}</div>
        </div>
    `;
};