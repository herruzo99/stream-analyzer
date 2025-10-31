import { html } from 'lit-html';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { eventBus } from '@/application/event-bus';
import { uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { saveWorkspace } from '@/infrastructure/persistence/streamStorage';

const workspaceCardTemplate = (input, isActive) => {
    const handleRemove = (e) => {
        e.stopPropagation();
        analysisActions.removeStreamInput(input.id);
    };

    const handleSetActive = () => {
        analysisActions.setActiveStreamInputId(input.id);
        uiActions.setStreamInputActiveMobileTab('inspector');
    };

    const urlPath = input.url ? (input.url.split('/').pop() || input.url) : 'No URL';


    return html`
        <div
            @click=${handleSetActive}
            class="animate-slideInUp bg-slate-800 rounded-lg border-2 p-4 cursor-pointer transition-colors hover:border-blue-400 ${isActive
                ? 'border-blue-500 ring-2 ring-blue-500/50'
                : 'border-slate-700'}"
            style="animation-delay: ${input.id * 50}ms;"
        >
            <div class="flex justify-between items-start">
                <div class="min-w-0">
                    <p class="font-bold text-white truncate" title=${input.name || 'Unnamed Stream'}>
                        ${input.name || `Stream ${input.id + 1}`}
                    </p>
                    <p class="text-xs text-slate-400 font-mono truncate" title=${input.url}>${urlPath}</p>
                </div>
                <button @click=${handleRemove} class="text-slate-500 hover:text-red-400 shrink-0 ml-2">${icons.xCircle}</button>
            </div>
        </div>
    `;
};

export const workspacePanelTemplate = () => {
    const { streamInputs, activeStreamInputId } = useAnalysisStore.getState();

    const handleFiles = (files) => {
        if (files.length > 0) {
            eventBus.dispatch('ui:segment-analysis-requested', { files: Array.from(files) });
        }
    };

    const handleUrlSubmit = (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const url = formData.get('url')?.toString().trim();

        if (url) {
            analysisActions.addStreamInputFromPreset({ url });
        }
        form.reset();
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        const urls = pastedText.split(/[\s,]+/).filter((u) => u.trim() !== '');

        if (urls.length === 0) return;

        if (urls.length === 1) {
            e.target.value = urls[0];
            analysisActions.addStreamInputFromPreset({ url: urls[0] });
        } else {
            urls.forEach((url) => analysisActions.addStreamInputFromPreset({ url }));
        }
    };

    const handleStreamAnalysis = () => {
        eventBus.dispatch('ui:stream-analysis-requested', { inputs: streamInputs });
    };

    const handleFilePicker = () => {
        const fileInput = document.getElementById('local-file-input');
        fileInput?.click();
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('dropzone-active');
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('dropzone-active');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('dropzone-active');
        const files = e.dataTransfer?.files;
        if (files) {
            handleFiles(files);
        }
    };

    const handleSaveWorkspace = () => {
        const name = prompt('Enter a name for this workspace:', 'My Workspace');
        if (name) {
            saveWorkspace({ name, inputs: streamInputs });
        }
    };

    const emptyStateTemplate = html`
        <div
            class="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6 border-2 border-dashed border-slate-700 rounded-lg"
        >
            ${icons.inbox}
            <p class="mt-4 font-semibold text-lg text-slate-400">Workspace is Empty</p>
            <p class="text-sm mt-1">Add streams by pasting a URL above or dragging files here.</p>
        </div>
    `;

    return html`
        <div
            class="flex flex-col h-full gap-6"
            @dragover=${handleDragOver}
            @dragleave=${handleDragLeave}
            @drop=${handleDrop}
        >
            <div>
                <h2 class="text-2xl font-bold text-white mb-2">Analysis Workspace</h2>
                <p class="text-slate-400">
                    Add remote streams via URL, or drag & drop local segment files to start an analysis.
                </p>
            </div>

            <form @submit=${handleUrlSubmit} class="relative flex gap-2">
                <div class="relative grow">
                    <input
                        type="url"
                        name="url"
                        class="w-full bg-slate-800 text-white rounded-md p-4 pl-12 text-lg border border-slate-700 focus:ring-2 focus:ring-blue-500"
                        placeholder="Paste one or more manifest URLs..."
                        @paste=${handlePaste}
                    />
                    <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">${icons.newAnalysis}</div>
                </div>
                <button
                    type="submit"
                    class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md transition duration-300"
                >
                    Add
                </button>
            </form>

            <div class="grow overflow-y-auto space-y-4 pr-2">
                ${streamInputs.length > 0
                    ? streamInputs.map((input) => workspaceCardTemplate(input, input.id === activeStreamInputId))
                    : emptyStateTemplate}
            </div>

            <div class="flex gap-4 pt-4 border-t border-slate-700">
                <input
                    type="file"
                    id="local-file-input"
                    multiple
                    class="hidden"
                    @change=${(e) => handleFiles(e.target.files)}
                />
                <button
                    @click=${handleFilePicker}
                    class="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-3 px-4 rounded-md transition duration-300 flex items-center justify-center gap-2"
                >
                    ${icons.fileScan}
                    Analyze Local Files
                </button>
                <button
                    @click=${handleStreamAnalysis}
                    class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 disabled:bg-slate-700/50 disabled:cursor-not-allowed"
                    ?disabled=${streamInputs.length === 0}
                >
                    ${streamInputs.length > 1 ? `Analyze & Compare (${streamInputs.length})` : 'Analyze Stream'}
                </button>
            </div>
            <div class="shrink-0">
                <button
                    @click=${handleSaveWorkspace}
                    class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-md disabled:bg-slate-600 disabled:opacity-50"
                    ?disabled=${streamInputs.length === 0}
                >
                    Save Workspace
                </button>
            </div>
        </div>
    `;
};