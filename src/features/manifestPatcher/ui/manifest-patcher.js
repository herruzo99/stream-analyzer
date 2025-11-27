import { diffViewerTemplate } from '@/features/manifestUpdates/ui/components/diff-viewer';
import { useAnalysisStore } from '@/state/analysisStore';
import * as icons from '@/ui/icons';
import { closeDropdown, toggleDropdown } from '@/ui/services/dropdownService';
import { closeModal } from '@/ui/services/modalService';
import { diffManifest } from '@/ui/shared/diff';
import { highlightDash, highlightHls } from '@/ui/shared/syntax-highlighter';
import { html, render } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { applyPatches } from '../domain/patchService';
import { PATCH_PRESETS } from '../domain/presets.js';
import { patchRuleCardTemplate } from './components/patch-rule-card.js';

class ManifestPatcher extends HTMLElement {
    constructor() {
        super();
        this._streamId = null;
        this.localRules = [];
        this.previewDiff = null;
        this.previewDebounce = null;
        this.activeTab = 'preview';
        this.unsubscribe = null;

        this.applyPreset = this.applyPreset.bind(this);
        this.renderPresetsMenu = this.renderPresetsMenu.bind(this);
    }

    set streamId(val) {
        if (this._streamId == val) return;
        this._streamId = val;
        this.initializeFromStore();
    }

    connectedCallback() {
        this.classList.add(
            'flex',
            'flex-col',
            'h-full',
            'w-full',
            'overflow-hidden'
        );
        this.initializeFromStore();
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
    }

    initializeFromStore() {
        const state = useAnalysisStore.getState();
        if (this._streamId !== null) {
            const stream = state.streams.find((s) => s.id == this._streamId);
            if (stream) {
                this.localRules = stream.patchRules
                    ? JSON.parse(JSON.stringify(stream.patchRules))
                    : [];
                this.originalManifest = stream.rawManifest || '';
                this.streamName = stream.name;
                this.protocol = stream.protocol;
                this.generatePreview(true);
            }
        }
    }

    generatePreview(sync = false) {
        if (!this.originalManifest) return;

        const runDiff = () => {
            const patched = applyPatches(
                this.originalManifest,
                this.localRules
            );
            const normalizedOriginal = this.originalManifest.replace(
                /\r\n/g,
                '\n'
            );
            const normalizedPatched = patched.replace(/\r\n/g, '\n');

            if (
                normalizedPatched === normalizedOriginal &&
                this.localRules.length === 0
            ) {
                const { diffModel } = diffManifest(
                    normalizedOriginal,
                    normalizedOriginal
                );
                this.previewDiff = {
                    diffModel,
                    changes: { additions: 0, removals: 0, modifications: 0 },
                    patchedContent: normalizedPatched,
                };
            } else {
                const { diffModel, changes } = diffManifest(
                    normalizedOriginal,
                    normalizedPatched
                );
                this.previewDiff = {
                    diffModel,
                    changes,
                    patchedContent: normalizedPatched,
                };
            }
            this.render();
        };

        if (sync) {
            runDiff();
        } else {
            if (this.previewDebounce) clearTimeout(this.previewDebounce);
            this.previewDebounce = setTimeout(runDiff, 50);
        }
    }

    addRule() {
        this.localRules = [
            ...this.localRules,
            {
                id: crypto.randomUUID(),
                type: 'string',
                target: '',
                replacement: '',
                active: true,
            },
        ];
        this.generatePreview();
    }

    updateRule(id, field, value) {
        this.localRules = this.localRules.map((r) =>
            r.id === id ? { ...r, [field]: value } : r
        );
        this.generatePreview();
    }

    removeRule(id) {
        this.localRules = this.localRules.filter((r) => r.id !== id);
        this.generatePreview();
    }

    moveRule(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= this.localRules.length) return;

        const rules = [...this.localRules];
        const [removed] = rules.splice(index, 1);
        rules.splice(newIndex, 0, removed);

        this.localRules = rules;
        this.generatePreview();
    }

    applyPreset(preset) {
        const newRules = preset.rules.map((r) => ({
            ...r,
            id: crypto.randomUUID(),
        }));
        this.localRules = [...this.localRules, ...newRules];
        this.generatePreview();
        closeDropdown();
    }

    async commitAndReload() {
        useAnalysisStore
            .getState()
            .updatePatchRules(this._streamId, this.localRules);
        await useAnalysisStore.getState().applyPatchesToStream(this._streamId);
        closeModal();
    }

    renderPresetsMenu() {
        return html`
            <div
                class="dropdown-panel bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-72 p-2 ring-1 ring-black/50 pointer-events-auto"
            >
                <div
                    class="px-3 py-2 border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1"
                >
                    Quick Actions
                </div>
                <div
                    class="space-y-1 max-h-64 overflow-y-auto custom-scrollbar"
                >
                    ${PATCH_PRESETS.map(
                        (p) => html`
                            <button
                                @click=${(e) => {
                                    e.stopPropagation();
                                    this.applyPreset(p);
                                }}
                                class="w-full text-left p-2.5 rounded-lg hover:bg-blue-600/20 hover:border-blue-500/30 border border-transparent transition-all group"
                            >
                                <div
                                    class="text-xs font-bold text-slate-200 group-hover:text-blue-200"
                                >
                                    ${p.label}
                                </div>
                                <div
                                    class="text-[10px] text-slate-500 group-hover:text-blue-300/70 leading-tight mt-0.5 line-clamp-2"
                                >
                                    ${p.description}
                                </div>
                            </button>
                        `
                    )}
                </div>
            </div>
        `;
    }

    render() {
        if (!this.originalManifest) {
            render(
                html`<div
                    class="flex items-center justify-center h-full text-slate-500"
                >
                    <div class="animate-spin mr-2">${icons.spinner}</div>
                    Loading...
                </div>`,
                this
            );
            return;
        }

        const diff = this.previewDiff || {
            diffModel: [],
            changes: { additions: 0, removals: 0, modifications: 0 },
            patchedContent: this.originalManifest,
        };
        const { additions, removals, modifications } = diff.changes;
        const hasChanges = additions > 0 || removals > 0 || modifications > 0;

        const leftPane = html`
            <div
                class="flex flex-col h-full border-r border-slate-800 bg-slate-900 w-full lg:w-[450px] shrink-0 min-h-0"
            >
                <div
                    class="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 shrink-0"
                >
                    <h3
                        class="font-bold text-slate-200 flex items-center gap-2 text-sm"
                    >
                        ${icons.slidersHorizontal} Rules
                        <span
                            class="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-xs font-mono"
                            >${this.localRules.length}</span
                        >
                    </h3>
                    <div class="flex gap-2">
                        <button
                            @click=${(e) =>
                                toggleDropdown(
                                    e.currentTarget,
                                    this.renderPresetsMenu,
                                    e
                                )}
                            class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-purple-400 transition-colors border border-transparent hover:border-slate-700/50"
                            title="Load Preset"
                        >
                            ${icons.library}
                        </button>
                        <button
                            @click=${() => this.addRule()}
                            class="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-blue-900/20 border border-blue-500"
                        >
                            ${icons.plusCircle} Add Rule
                        </button>
                    </div>
                </div>
                <div
                    class="grow overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950/30 min-h-0"
                >
                    ${this.localRules.length === 0
                        ? html`
                              <div
                                  class="flex flex-col items-center justify-center h-48 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl p-6 text-center"
                              >
                                  <div class="opacity-50 mb-3 scale-150">
                                      ${icons.code}
                                  </div>
                                  <p class="text-sm font-medium text-slate-300">
                                      No active patch rules
                                  </p>
                                  <p class="text-xs mt-1">
                                      Add a custom rule or load a preset to
                                      modify the manifest.
                                  </p>
                              </div>
                          `
                        : this.localRules.map((rule, i) =>
                              patchRuleCardTemplate({
                                  rule,
                                  index: i,
                                  totalCount: this.localRules.length,
                                  onUpdate: (id, f, v) =>
                                      this.updateRule(id, f, v),
                                  onRemove: (id) => this.removeRule(id),
                                  onMove: (idx, dir) => this.moveRule(idx, dir),
                              })
                          )}
                </div>
                <div
                    class="p-4 border-t border-slate-800 bg-slate-900 z-10 shrink-0"
                >
                    <button
                        @click=${() => this.commitAndReload()}
                        class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] border border-emerald-500"
                    >
                        ${icons.refresh} Apply & Reload Stream
                    </button>
                </div>
            </div>
        `;

        let contentArea;
        if (this.activeTab === 'preview') {
            // Pass the FULL diff object (including changes) to avoid the crash in diffViewerTemplate
            contentArea = diffViewerTemplate(
                {
                    diffModel: diff.diffModel,
                    changes: diff.changes,
                    endSequenceNumber: null,
                },
                this.protocol,
                { showControls: false }
            );
        } else {
            const contentToRender = diff.patchedContent;
            const highlightFn =
                this.protocol === 'dash' ? highlightDash : highlightHls;
            const highlightedHTML = highlightFn(contentToRender);
            contentArea = html`
                <div
                    class="absolute inset-0 bg-slate-950 overflow-auto custom-scrollbar"
                >
                    <pre
                        class="p-6 text-xs font-mono text-slate-400 whitespace-pre leading-tight w-full min-w-max"
                    >
${unsafeHTML(highlightedHTML)}</pre
                    >
                </div>
            `;
        }

        const rightPane = html`
            <div
                class="flex flex-col h-full min-w-0 bg-slate-950 relative min-h-0 grow"
            >
                <div
                    class="h-14 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900 shrink-0 z-20"
                >
                    <div class="flex items-center gap-4">
                        <h3 class="font-bold text-slate-200 text-sm">
                            Live Preview
                        </h3>
                        ${hasChanges
                            ? html`
                                  <div
                                      class="flex items-center gap-3 px-3 py-1 bg-slate-800 rounded-full border border-slate-700/50 text-[10px] font-mono select-none"
                                  >
                                      <span class="text-emerald-400 font-bold"
                                          >+${additions}</span
                                      >
                                      <span
                                          class="w-px h-3 bg-slate-700"
                                      ></span>
                                      <span class="text-red-400 font-bold"
                                          >-${removals}</span
                                      >
                                      <span
                                          class="w-px h-3 bg-slate-700"
                                      ></span>
                                      <span class="text-amber-400 font-bold"
                                          >~${modifications}</span
                                      >
                                  </div>
                              `
                            : html`
                                  <span
                                      class="text-[10px] font-bold text-slate-500 px-2 py-1 bg-slate-900 rounded border border-slate-800 uppercase tracking-wider"
                                      >No changes</span
                                  >
                              `}
                    </div>
                    <div
                        class="flex bg-slate-800 p-1 rounded-lg border border-slate-700/50"
                    >
                        <button
                            @click=${() => {
                                this.activeTab = 'preview';
                                this.render();
                            }}
                            class="px-4 py-1 rounded-md text-xs font-bold transition-all ${this
                                .activeTab === 'preview'
                                ? 'bg-slate-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'}"
                        >
                            Diff
                        </button>
                        <button
                            @click=${() => {
                                this.activeTab = 'raw';
                                this.render();
                            }}
                            class="px-4 py-1 rounded-md text-xs font-bold transition-all ${this
                                .activeTab === 'raw'
                                ? 'bg-slate-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'}"
                        >
                            Result
                        </button>
                    </div>
                </div>
                <div class="grow overflow-hidden relative w-full h-full">
                    ${contentArea}
                </div>
            </div>
        `;

        render(
            html`<div
                class="flex flex-col lg:flex-row h-full w-full bg-slate-950 overflow-hidden rounded-b-xl"
            >
                ${leftPane}${rightPane}
            </div>`,
            this
        );
    }
}

customElements.define('manifest-patcher', ManifestPatcher);
