import { html, render } from 'lit-html';
import { showToast } from '@/ui/components/toast';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { eventBus } from '@/application/event-bus';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import {
    saveWorkspace,
    prepareForStorage,
} from '@/infrastructure/persistence/streamStorage';

const workspaceCardTemplate = (input, isActive) => {
    const handleRemove = (e) => {
        e.stopPropagation();
        analysisActions.removeStreamInput(input.id);
    };

    const handleSetActive = () => {
        analysisActions.setActiveStreamInputId(input.id);
        uiActions.setStreamInputActiveMobileTab('inspector');
    };

    const urlPath = input.url || 'No URL';

    return html`
        <div
            @click=${handleSetActive}
            class="animate-slideInUp bg-slate-800 rounded-lg border-2 p-4 cursor-pointer transition-colors hover:border-blue-400 ${isActive
            ? 'border-blue-500 ring-2 ring-blue-500/50'
            : 'border-slate-700'}"
            style="animation-delay: ${input.id * 50}ms;"
        >
            <div class="flex justify-between items-start gap-2">
                <div class="min-w-0">
                    <p
                        class="font-bold text-white truncate"
                        title=${input.name || 'Unnamed Stream'}
                    >
                        ${input.name || `Stream ${input.id + 1}`}
                    </p>
                    <p
                        class="text-xs text-slate-400 max-w-md font-mono truncate"
                        title=${input.url}
                    >
                        ${urlPath}
                    </p>
                </div>
                <button
                    @click=${handleRemove}
                    class="text-slate-500 hover:text-red-400 shrink-0 ml-2"
                >
                    ${icons.xCircle}
                </button>
            </div>
        </div>
    `;
};

class WorkspacePanelComponent extends HTMLElement {
    constructor() {
        super();
        this.analysisUnsubscribe = null;
        this.uiUnsubscribe = null;
    }

    connectedCallback() {
        this.renderComponent();
        this.analysisUnsubscribe = useAnalysisStore.subscribe(() =>
            this.renderComponent()
        );
        this.uiUnsubscribe = useUiStore.subscribe(() => this.renderComponent());
    }

    disconnectedCallback() {
        if (this.analysisUnsubscribe) this.analysisUnsubscribe();
        if (this.uiUnsubscribe) this.uiUnsubscribe();
    }

    renderComponent() {
        const { streamInputs, activeStreamInputId } =
            useAnalysisStore.getState();
        const { workspaces, loadedWorkspaceName } = useUiStore.getState();

        const handleFiles = (files) => {
            if (files.length > 0) {
                uiActions.setLoadedWorkspaceName(null);
                eventBus.dispatch('ui:segment-analysis-requested', {
                    files: Array.from(files),
                });
            }
        };

        const isValidUrl = (string) => {
            try {
                new URL(string);
                return true;
            } catch (_) {
                return false;
            }
        };

        const handleUrlSubmit = (e) => {
            e.preventDefault();
            const form = e.target;
            const formData = new FormData(form);
            const url = formData.get('url')?.toString().trim();

            if (url) {
                if (isValidUrl(url)) {
                    analysisActions.addStreamInputFromPreset({ url });
                    uiActions.setLoadedWorkspaceName(null);
                    form.reset();
                } else {
                    showToast({
                        message: 'Invalid URL format.',
                        type: 'fail',
                    });
                }
            }
        };

        const handlePaste = (e) => {
            e.preventDefault();
            const pastedText = e.clipboardData.getData('text');
            const rawItems = pastedText
                .split(/[\s,]+/)
                .filter((u) => u.trim() !== '');

            if (rawItems.length === 0) return;

            const validUrls = [];
            const invalidItems = [];

            rawItems.forEach((item) => {
                if (isValidUrl(item)) {
                    validUrls.push(item);
                } else {
                    invalidItems.push(item);
                }
            });

            if (validUrls.length > 0) {
                uiActions.setLoadedWorkspaceName(null);
                validUrls.forEach((url) =>
                    analysisActions.addStreamInputFromPreset({ url })
                );

                if (invalidItems.length === 0) {
                    // All valid, clear input (which is currently empty as we prevented default)
                    e.target.value = '';
                } else {
                    // Some invalid, keep them in input
                    e.target.value = invalidItems.join('\n');
                    showToast({
                        message: `Added ${validUrls.length} stream(s). ${invalidItems.length} invalid item(s) remained.`,
                        type: 'warn',
                    });
                }
            } else {
                // All invalid
                e.target.value = pastedText; // Keep original text
                showToast({
                    message: 'No valid URLs found in pasted text.',
                    type: 'fail',
                });
            }
        };

        const handleStreamAnalysis = () => {
            eventBus.dispatch('ui:stream-analysis-requested', {
                inputs: streamInputs,
            });
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
            const name = prompt(
                'Enter a name for this workspace:',
                'My Workspace'
            );
            if (name) {
                saveWorkspace({ name, inputs: streamInputs });
            }
        };

        const handleUpdateWorkspace = () => {
            if (loadedWorkspaceName) {
                saveWorkspace({
                    name: loadedWorkspaceName,
                    inputs: streamInputs,
                });
            }
        };

        const handleUnlinkWorkspace = () => {
            uiActions.setLoadedWorkspaceName(null);
        };

        let isWorkspaceModified = false;
        if (loadedWorkspaceName) {
            const savedWorkspace = workspaces.find(
                (w) => w.name === loadedWorkspaceName
            );
            if (savedWorkspace) {
                const currentInputsStr = JSON.stringify(
                    streamInputs.map(prepareForStorage)
                );
                const savedInputsStr = JSON.stringify(
                    savedWorkspace.inputs.map(prepareForStorage)
                );
                isWorkspaceModified = currentInputsStr !== savedInputsStr;
            }
        }

        const emptyStateTemplate = html`
            <div
                class="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6 border-2 border-dashed border-slate-700 rounded-lg"
            >
                ${icons.inbox}
                <p class="mt-4 font-semibold text-lg text-slate-400">
                    Workspace is Empty
                </p>
                <p class="text-sm mt-1">
                    Add streams by pasting a URL above or dragging files here.
                </p>
            </div>
        `;

        const template = html`
            <div
                class="flex flex-col gap-6 h-full"
                @dragover=${handleDragOver}
                @dragleave=${handleDragLeave}
                @drop=${handleDrop}
            >
                <div class="shrink-0">
                    <div class="flex justify-between items-center mb-2">
                        <div>
                            <h2 class="text-2xl font-bold text-white">
                                Analysis Workspace
                            </h2>
                            ${loadedWorkspaceName
                ? html`
                                      <div class="flex items-center gap-2 mt-1">
                                          <span class="text-sm text-slate-400"
                                              >Editing:</span
                                          >
                                          <span
                                              class="font-semibold text-teal-300"
                                              >${loadedWorkspaceName}</span
                                          >
                                          <button
                                              @click=${handleUnlinkWorkspace}
                                              title="Stop editing this workspace"
                                              class="text-slate-500 hover:text-white"
                                          >
                                              ${icons.unlink}
                                          </button>
                                      </div>
                                  `
                : ''}
                        </div>
                        <div class="flex items-center gap-2">
                            ${loadedWorkspaceName
                ? html`<button
                                      @click=${handleUpdateWorkspace}
                                      class="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-3 rounded-md text-sm disabled:bg-slate-600 disabled:opacity-50"
                                      ?disabled=${!isWorkspaceModified}
                                      title="Save changes to the '${loadedWorkspaceName}' workspace"
                                  >
                                      Update Workspace
                                  </button>`
                : ''}
                            <button
                                @click=${handleSaveWorkspace}
                                class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-md text-sm disabled:bg-slate-600 disabled:opacity-50"
                                ?disabled=${streamInputs.length === 0}
                                title="Save the current set of streams as a new workspace"
                            >
                                Save New Workspace
                            </button>
                        </div>
                    </div>
                    <p class="text-slate-400">
                        Add remote streams via URL, or drag & drop local segment
                        files to start an analysis.
                    </p>
                </div>

                <form
                    @submit=${handleUrlSubmit}
                    class="relative flex gap-2 shrink-0"
                >
                    <div class="relative grow">
                        <input
                            type="url"
                            name="url"
                            class="w-full bg-slate-800 text-white rounded-md p-4 pl-12 text-lg border border-slate-700 focus:ring-2 focus:ring-blue-500"
                            placeholder="Paste one or more manifest URLs..."
                            @paste=${handlePaste}
                        />
                        <div
                            class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        >
                            ${icons.newAnalysis}
                        </div>
                    </div>
                    <button
                        type="submit"
                        class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md transition duration-300"
                    >
                        Add
                    </button>
                </form>

                <div class="grow overflow-y-auto space-y-4 pr-2 min-h-0 ">
                    ${streamInputs.length > 0
                ? streamInputs.map((input) =>
                    workspaceCardTemplate(
                        input,
                        input.id === activeStreamInputId
                    )
                )
                : emptyStateTemplate}
                </div>

                <div class="flex gap-4 pt-4 border-t border-slate-700 shrink-0">
                    <input
                        type="file"
                        id="local-file-input"
                        multiple
                        class="hidden"
                        @change=${(e) => handleFiles(e.target.files)}
                    />
                    <button
                        @click=${handleFilePicker}
                        class="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-3 px-4 rounded-md transition duration-300 flex items-center justify-center gap-2"
                    >
                        ${icons.fileScan} Analyze Local Files
                    </button>
                    <button
                        @click=${analysisActions.clearAllStreamInputs}
                        class="flex-1 bg-red-800 hover:bg-red-700 text-red-100 font-bold py-3 px-4 rounded-md transition duration-300 flex items-center justify-center gap-2 disabled:bg-slate-700/50 disabled:cursor-not-allowed"
                        ?disabled=${streamInputs.length === 0}
                    >
                        ${icons.xCircle} Clear All
                    </button>
                    <button
                        @click=${handleStreamAnalysis}
                        class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 disabled:bg-slate-700/50 disabled:cursor-not-allowed"
                        ?disabled=${streamInputs.length === 0}
                    >
                        ${streamInputs.length > 1
                ? `Analyze & Compare (${streamInputs.length})`
                : 'Analyze Stream'}
                    </button>
                </div>
            </div>
        `;
        render(template, this);
    }
}

customElements.define('workspace-panel-component', WorkspacePanelComponent);

// Keep the old export for compatibility with input-view.js
export const workspacePanelTemplate = () =>
    html`<workspace-panel-component
        class="h-full block"
    ></workspace-panel-component>`;
