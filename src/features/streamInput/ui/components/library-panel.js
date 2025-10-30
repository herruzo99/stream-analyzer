import { html } from 'lit-html';
import { analysisActions } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { getHistory, getPresets, deleteWorkspace } from '@/infrastructure/persistence/streamStorage';
import { exampleStreams } from '@/data/example-streams';
import * as icons from '@/ui/icons';

const getBadge = (text, colorClasses) => {
    if (!text) return '';
    return html`<span class="text-xs font-semibold px-2 py-0.5 rounded-full ${colorClasses}">${text.toUpperCase()}</span>`;
};

const renderStreamListItem = (stream) => {
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

    return html`
        <li class="group p-3 hover:bg-gray-700/50 flex justify-between items-center">
            <div class="flex flex-col min-w-0">
                <span class="font-semibold text-gray-200 truncate" title="${stream.name}">${stream.name}</span>
                <span class="text-xs text-gray-400 font-mono truncate" title="${stream.url}">${stream.url}</span>
                <div class="shrink-0 flex items-center gap-2 mt-2">
                    ${protocolBadge} ${typeBadge}
                </div>
            </div>
            <div class="shrink-0 flex items-center gap-2 ml-4">
                <button
                    @click=${handleAdd}
                    class="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 bg-gray-900/50 hover:bg-blue-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                    title="Add to Workspace"
                >
                    ${icons.plusCircle}
                </button>
            </div>
        </li>
    `;
};

const renderWorkspaceListItem = (workspace) => {
    const handleLoad = (e) => {
        e.stopPropagation();
        analysisActions.setStreamInputs(workspace.inputs);
        uiActions.setStreamInputActiveMobileTab('workspace');
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete the "${workspace.name}" workspace?`)) {
            deleteWorkspace(workspace.name);
        }
    };

    return html`
        <li class="group p-3 hover:bg-gray-700/50 flex justify-between items-center">
            <div class="flex flex-col min-w-0">
                <span class="font-semibold text-gray-200 truncate" title="${workspace.name}">${workspace.name}</span>
                <span class="text-xs text-gray-400 mt-1">${workspace.inputs.length} stream(s)</span>
            </div>
            <div class="shrink-0 flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    @click=${handleLoad}
                    class="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 bg-gray-900/50 hover:bg-blue-600 hover:text-white"
                    title="Load Workspace"
                >
                    ${icons.play}
                </button>
                <button
                    @click=${handleDelete}
                    class="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 bg-gray-900/50 hover:bg-red-600 hover:text-white"
                    title="Delete Workspace"
                >
                    ${icons.xCircle}
                </button>
            </div>
        </li>
    `;
};

const renderListSection = (items, itemTemplate) => {
    if (items.length === 0) {
        return html`<p class="text-center text-sm text-gray-500 p-8">No items found.</p>`;
    }
    return html`<ul class="divide-y divide-gray-700/50">${items.map((item) => itemTemplate(item))}</ul>`;
};

const renderExampleSection = (searchTerm) => {
    const filteredExamples = exampleStreams.filter(
        (s) =>
            s.name.toLowerCase().includes(searchTerm) ||
            s.url.toLowerCase().includes(searchTerm) ||
            s.protocol.toLowerCase().includes(searchTerm)
    );
    const grouped = filteredExamples.reduce((acc, stream) => {
        const key = `${stream.protocol.toUpperCase()} - ${stream.type.toUpperCase()}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(stream);
        return acc;
    }, {});

    if (Object.keys(grouped).length === 0) {
        return html`<p class="text-center text-sm text-gray-500 p-8">No examples match your search.</p>`;
    }

    return html`
        <div class="space-y-4">
            ${Object.entries(grouped).map(
                ([groupName, items]) => html`
                    <div>
                        <h4
                            class="font-bold text-gray-400 text-sm tracking-wider uppercase px-3 pt-3 pb-2 sticky top-0 bg-gray-800 z-10"
                        >
                            ${groupName}
                        </h4>
                        <ul class="divide-y divide-gray-700/50">${items.map((item) => renderStreamListItem(item))}</ul>
                    </div>
                `
            )}
        </div>
    `;
};

export const libraryPanelTemplate = () => {
    const { streamLibraryActiveTab, streamLibrarySearchTerm, workspaces } = useUiStore.getState();
    const lowerSearch = streamLibrarySearchTerm.toLowerCase();

    let content;
    if (streamLibraryActiveTab === 'workspaces') {
        const filteredWorkspaces = workspaces.filter((w) => w.name.toLowerCase().includes(lowerSearch));
        content = renderListSection(filteredWorkspaces, renderWorkspaceListItem);
    } else if (streamLibraryActiveTab === 'presets') {
        const presets = getPresets().filter(
            (s) => s.name.toLowerCase().includes(lowerSearch) || s.url.toLowerCase().includes(lowerSearch)
        );
        content = renderListSection(presets, renderStreamListItem);
    } else if (streamLibraryActiveTab === 'history') {
        const history = getHistory().filter(
            (s) => s.name.toLowerCase().includes(lowerSearch) || s.url.toLowerCase().includes(lowerSearch)
        );
        content = renderListSection(history, renderStreamListItem);
    } else {
        content = renderExampleSection(lowerSearch);
    }

    const tabButton = (key, label, count) => html`
        <button
            @click=${() => uiActions.setStreamLibraryTab(key)}
            class="px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${streamLibraryActiveTab === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'}"
        >
            ${label} ${count !== undefined ? html`(${count})` : ''}
        </button>
    `;

    return html`
        <div class="flex flex-col h-full bg-gray-800 rounded-lg border border-gray-700">
            <div class="p-3 border-b border-gray-700 space-y-3 shrink-0">
                <h3 class="text-lg font-bold text-white">Stream Library</h3>
                <input
                    type="search"
                    placeholder="Search library..."
                    .value=${streamLibrarySearchTerm}
                    @input=${(e) => uiActions.setStreamLibrarySearchTerm(e.target.value)}
                    class="w-full bg-gray-900 text-white rounded-md p-2 border border-gray-600 focus:ring-1 focus:ring-blue-500"
                />
                <div class="flex items-center gap-2 flex-wrap">
                    ${tabButton('workspaces', 'Workspaces', workspaces.length)} ${tabButton('presets', 'Presets')}
                    ${tabButton('history', 'History')} ${tabButton('examples', 'Examples')}
                </div>
            </div>
            <div class="grow overflow-y-auto">${content}</div>
        </div>
    `;
};