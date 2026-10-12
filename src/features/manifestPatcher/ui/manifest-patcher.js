import { diffViewerTemplate } from '@/features/manifestUpdates/ui/components/diff-viewer';
// import { multiPlayerService } from '@/features/multiPlayer/application/multiPlayerService';
import { useAnalysisStore } from '@/state/analysisStore';
// import { useMultiPlayerStore } from '@/state/multiPlayerStore';
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
import { randomId } from '@/shared/utils/random.js';

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
                id: randomId(),
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
        // Render UI immediately to reflect toggle state
        this.render();
        // Debounce the heavy diff calculation
        this.generatePreview(false);
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
            id: randomId(),
        }));
        this.localRules = [...this.localRules, ...newRules];
        this.generatePreview();
        closeDropdown();
    }

    async commit() {
        useAnalysisStore
            .getState()
            .updatePatchRules(this._streamId, this.localRules);
        await useAnalysisStore.getState().applyPatchesToStream(this._streamId);

        closeModal();
    }

    renderPresetsMenu() {
        return html`
            <div
                class="dropdown-panel bg-white/5 border border-white/10 rounded-md w-72 p-2 ring-1 pointer-events-auto"
            >
                <div
                    class="px-3 py-2 border-b border-white/10 text-[10px] font-bold text-slate-400 mb-1"
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
                                class="w-full text-left p-2.5 rounded-md hover:bg-emerald-500/10 hover:border-emerald-400/50 border border-transparent transition-all group"
                            >
                                <div
                                    class="text-xs font-bold text-slate-200 group-hover:text-emerald-200"
                                >
                                    ${p.label}
                                </div>
                                <div
                                    class="text-[10px] text-slate-400 group-hover:text-emerald-200/70 leading-tight mt-0.5 line-clamp-2"
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
                    class="flex items-center justify-center h-full text-slate-400"
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
                class="flex flex-col h-full border-r border-white/10 bg-white/5 w-full lg:w-[450px] shrink-0 min-h-0"
            >
                <div
                    class="p-4 border-b border-white/10 flex items-center justify-between bg-transparent shrink-0"
                >
                    <h3
                        class="font-bold text-slate-200 flex items-center gap-2 text-sm"
                    >
                        ${icons.slidersHorizontal} Rules
                        <span
                            class="bg-white/5 text-slate-400 px-2 py-0.5 rounded-full text-xs font-mono"
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
                            class="p-2 hover:bg-white/5 rounded-md text-slate-400 hover:text-slate-300 transition-colors border border-transparent hover:border-white/10"
                            title="Load Preset"
                        >
                            ${icons.library}
                        </button>
                        <button
                            @click=${() => this.addRule()}
                            class="flex items-center gap-2 bg-emerald-500/10 hover:bg-[#60a5fa] text-white px-3 py-1.5 rounded-md text-xs font-bold transition-colors"
                        >
                            ${icons.plusCircle} Add Rule
                        </button>
                    </div>
                </div>
                <div
                    class="grow overflow-y-auto p-4 space-y-4 custom-scrollbar bg-transparent min-h-0"
                >
                    ${this.localRules.length === 0
                ? html`
                              <div
                                  class="flex flex-col items-center justify-center h-48 text-slate-400 border-2 border-dashed border-white/10 rounded-md p-6 text-center"
                              >
                                  <div class="opacity-50 mb-3 scale-150">
                                      ${icons.code}
                                  </div>
                                  <p
                                      class="text-sm font-medium text-slate-200"
                                  >
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
                    class="p-4 border-t border-white/10 bg-white/5 z-10 shrink-0"
                >
                    <button
                        @click=${() => this.commit()}
                        class="w-full py-3 bg-emerald-500 hover:bg-emerald-500/80 text-white font-bold rounded-md transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        ${icons.refresh} Apply Patches
                    </button>
                </div>
            </div>
        `;

        let contentArea;
        if (this.activeTab === 'preview') {
            contentArea = diffViewerTemplate(
                {
                    diffModel: diff.diffModel,
                    changes: diff.changes,
                    endSequenceNumber: null,
                },
                this.protocol,
                { showControls: false, showHideDeletedControl: false }
            );
        } else {
            const contentToRender = diff.patchedContent;
            const highlightFn =
                this.protocol === 'dash' ? highlightDash : highlightHls;
            const highlightedHTML = highlightFn(contentToRender);

            // Added whitespace-pre-wrap to handle long lines in raw view
            // prettier-ignore
            contentArea = html`<div
                class="absolute inset-0 bg-white/5 overflow-auto custom-scrollbar"
            ><pre
                    class="p-6 text-xs font-mono text-slate-400 whitespace-pre-wrap break-all leading-tight w-full"
                >${unsafeHTML(highlightedHTML)}</pre></div>`;
        }

        const rightPane = html`
            <div
                class="flex flex-col h-full min-w-0 bg-white/5 relative min-h-0 grow"
            >
                <div
                    class="h-14 flex items-center justify-between px-6 border-b border-white/10 bg-white/5 shrink-0 z-20"
                >
                    <div class="flex items-center gap-4">
                        <h3 class="font-bold text-slate-100 text-sm">
                            Live Preview
                        </h3>
                        ${hasChanges
                ? html`
                                      <div
                                          class="flex items-center gap-3 px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] font-mono select-none"
                                      >
                                          <span
                                              class="text-emerald-400 font-bold"
                                              >+${additions}</span
                                          >
                                          <span
                                              class="w-px h-3 bg-white/5"
                                          ></span>
                                          <span
                                              class="text-red-400 font-bold"
                                              >-${removals}</span
                                          >
                                          <span
                                              class="w-px h-3 bg-white/5"
                                          ></span>
                                          <span
                                              class="text-amber-400 font-bold"
                                              >~${modifications}</span
                                          >
                                      </div>
                                  `
                : html`
                                      <span
                                          class="text-[10px] font-bold text-slate-400 px-2 py-1 bg-white/5 rounded border border-white/10 r"
                                          >No changes</span
                                      >
                                  `
            }
                    </div>
                    </div>
                    <div
                        class="flex bg-white/5 p-1 rounded-md border border-white/10"
                    >
                        <button
                            @click=${() => {
                this.activeTab = 'preview';
                this.render();
            }}
                            class="px-4 py-1 rounded-md text-xs font-bold transition-all ${this.activeTab === 'preview' ? 'bg-white/5 text-slate-100 ' : 'text-slate-400 hover:text-slate-100' }"
                        >
                            Diff
                        </button>
                        <button
                            @click=${() => {
                this.activeTab = 'raw';
                this.render();
            }}
                            class="px-4 py-1 rounded-md text-xs font-bold transition-all ${this.activeTab === 'raw' ? 'bg-white/5 text-slate-100 ' : 'text-slate-400 hover:text-slate-100' }"
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
                class="flex flex-col lg:flex-row h-full w-full bg-white/5 overflow-hidden rounded-b-xl"
            >
                ${leftPane}${rightPane}
            </div>`,
            this
        );
    }
}

customElements.define('manifest-patcher', ManifestPatcher);
