import { html, render } from 'lit-html';

import { buildBitstreamModel } from '@/features/interactiveSegment/application/bitstream-contract.js';
import { workerService } from '@/infrastructure/worker/workerService';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';

const tagName = 'local-segment-analysis-view';
const visibleRows = 512;

// because(shadow-dom): component renders in shadow DOM, which Tailwind
// utilities cannot penetrate; literals below mirror the slate palette.
const styles = `
    :host { display: block; min-width: 0; color: #e2e8f0; }
    .view { display: grid; gap: 1rem; padding: 1rem; box-sizing: border-box; }
    h2, p, dl { margin: 0; }
    .header, .tabs, .summary { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
    .header h2 { flex: 1 1 18rem; font-size: 1.1rem; }
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.3); }
    .status { padding: 0.75rem; border: 1px solid #334155; border-radius: 0.5rem; background: #0f172a; }
    .summary { align-items: stretch; }
    .summary div, .card { min-width: min(12rem, 100%); padding: 0.75rem; border: 1px solid #334155; border-radius: 0.5rem; background: #0f172a; box-sizing: border-box; }
    dt { color: #94a3b8; font-size: 0.875rem; }
    dd { margin: 0.25rem 0 0; overflow-wrap: anywhere; }
    table { width: 100%; border-collapse: collapse; }
    caption { text-align: left; padding-bottom: 0.5rem; }
    th, td { padding: 0.65rem; border-bottom: 1px solid #334155; text-align: left; vertical-align: top; }
    .mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; overflow-wrap: anywhere; }
    .cards { display: none; gap: 0.5rem; }
    .notice { color: #94a3b8; }
    .tab-btn { padding: 0.4rem 0.8rem; border-radius: 0.5rem; border: 1px solid #334155; background: #1e293b; color: #e2e8f0; cursor: pointer; }
    .tab-btn[data-active='true'] { background: #2563eb; border-color: #2563eb; color: #fff; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    @media (max-width: 48rem) {
        .view { padding: 0.75rem; }
        table { display: none; }
        .cards { display: grid; }
    }
`;

function text(value, fallback = 'Unknown') {
    return String(value ?? fallback)
        .replace(/[\r\n\t]+/g, ' ')
        .trim()
        .slice(0, 240);
}

class LocalSegmentAnalysisView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._data = null;
        this.activeTab = 'overview';
        this.analysisState = 'idle';
        this.analysisMessage = '';
        this.analysisTask = null;
        this.analysisGeneration = 0;
    }

    set data(value) {
        this._data = value;
        this.ensureDeepAnalysis();
        this._render();
    }

    get data() {
        return this._data;
    }

    connectedCallback() {
        this.ensureDeepAnalysis();
        this._render();
    }

    disconnectedCallback() {
        this.cancelDeepAnalysis();
    }

    cancelDeepAnalysis() {
        this.analysisGeneration += 1;
        this.analysisTask?.cancel();
        this.analysisTask = null;
        if (this.analysisState === 'analyzing')
            this.analysisState = 'cancelled';
    }

    ensureDeepAnalysis() {
        const parsedData = this._data?.parsedData;
        const uniqueId = this._data?.uniqueId;
        const entry = uniqueId
            ? useSegmentCacheStore.getState().get(uniqueId)
            : null;
        const supported = ['isobmff', 'ts'].includes(parsedData?.format);
        if (
            !this.isConnected ||
            !supported ||
            !entry?.data ||
            parsedData.bitstreamAnalysis ||
            parsedData.bitstreamAnalysisAttempted ||
            this.analysisTask
        ) {
            if (supported && parsedData?.bitstreamAnalysis)
                this.analysisState = 'ready';
            return;
        }

        const generation = ++this.analysisGeneration;
        this.analysisState = 'analyzing';
        this.analysisMessage = 'Building bounded deep analysis.';
        const task = workerService.postTask('full-segment-analysis', {
            parsedData,
            rawData: entry.data,
            context: {},
        });
        this.analysisTask = task;
        task.promise
            .then((result) => {
                if (
                    generation !== this.analysisGeneration ||
                    this.analysisTask !== task
                )
                    return;
                const updatedParsedData = Object.freeze({
                    ...parsedData,
                    ...result,
                    bitstreamAnalysisAttempted: true,
                });
                useSegmentCacheStore.getState().set(uniqueId, {
                    ...entry,
                    parsedData: updatedParsedData,
                });
                this._data = {
                    ...this._data,
                    parsedData: updatedParsedData,
                };
                this.analysisState = 'ready';
                this.analysisMessage = '';
                this._render();
            })
            .catch((error) => {
                if (
                    generation !== this.analysisGeneration ||
                    this.analysisTask !== task
                )
                    return;
                this.analysisState =
                    error?.name === 'AbortError' ? 'cancelled' : 'error';
                this.analysisMessage =
                    error?.name === 'AbortError'
                        ? 'Deep analysis cancelled.'
                        : 'Deep analysis could not be completed.';
                this._render();
            })
            .finally(() => {
                if (this.analysisTask === task) this.analysisTask = null;
            });
    }

    setTab(tab) {
        this.activeTab = tab;
        this._render();
    }

    get model() {
        const parsedData = this._data?.parsedData;
        const uniqueId = this._data?.uniqueId;
        const entry = uniqueId
            ? useSegmentCacheStore.getState().get(uniqueId)
            : { data: null, parsedData };
        return buildBitstreamModel(uniqueId, entry, {
            analysisState: this.analysisState,
        });
    }

    renderOverview(model) {
        const parsedData = this._data?.parsedData ?? {};
        const local = parsedData.localAnalysis ?? {};
        const issues = Array.isArray(parsedData.data?.issues)
            ? parsedData.data.issues.slice(0, 100)
            : [];
        return html`
            <dl class="summary">
                <div>
                    <dt>Format</dt>
                    <dd>${text(parsedData.format)}</dd>
                </div>
                <div>
                    <dt>Bytes</dt>
                    <dd>${model.byteLength}</dd>
                </div>
                <div>
                    <dt>Generation</dt>
                    <dd class="mono">${text(local.generationId)}</dd>
                </div>
                <div>
                    <dt>Projected nodes</dt>
                    <dd>${local.projectedNodes ?? 0}</dd>
                </div>
            </dl>
            ${local.truncated
                ? html`<p class="notice">Parser output was safely bounded.</p>`
                : null}
            ${issues.length
                ? html`<section aria-labelledby="local-analysis-issues">
                      <h3 id="local-analysis-issues">Issues</h3>
                      <ul>
                          ${issues.map(
                              (issue) =>
                                  html`<li>
                                      ${text(issue?.message ?? issue)}
                                  </li>`
                          )}
                      </ul>
                  </section>`
                : html`<p>No parser issues reported.</p>`}
        `;
    }

    renderRows(model, kind) {
        const rows = (
            kind === 'structure' ? model.structureRows : model.hexRows
        ).slice(0, visibleRows);
        return html`
            <p class="notice">
                Showing ${rows.length} of
                ${kind === 'structure'
                    ? model.structureRows.length
                    : model.hexRows.length}
                bounded rows.
            </p>
            <table>
                <caption>
                    ${kind === 'structure'
                        ? 'Segment structure'
                        : 'Segment bytes'}
                </caption>
                <thead>
                    <tr>
                        <th scope="col">Address</th>
                        <th scope="col">Value</th>
                        <th scope="col">Size</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(
                        (row) =>
                            html`<tr data-local-analysis-row=${row.id}>
                                <td class="mono">${row.label}</td>
                                <td class="mono">
                                    ${kind === 'hex' ? row.hex : row.kind}
                                </td>
                                <td>${row.size}</td>
                            </tr>`
                    )}
                </tbody>
            </table>
            <div
                class="cards"
                role="list"
                aria-label=${kind === 'structure'
                    ? 'Segment structure'
                    : 'Segment bytes'}
            >
                ${rows.map(
                    (row) =>
                        html`<article
                            class="card"
                            role="listitem"
                            data-local-analysis-card=${row.id}
                        >
                            <strong class="mono">${row.label}</strong>
                            <p class="mono">
                                ${kind === 'hex' ? row.hex : row.kind}
                            </p>
                            <p>${row.size} bytes</p>
                        </article>`
                )}
            </div>
        `;
    }

    _render() {
        if (!this.shadowRoot) return;
        const model = this.model;
        const body = !this._data?.parsedData
            ? html`<p
                  class="status"
                  data-local-segment-analysis-state="unavailable"
              >
                  Local segment analysis is unavailable.
              </p>`
            : html`<section
                  class="view"
                  data-local-segment-analysis-state=${this
                      .analysisState === 'error'
                      ? 'error'
                      : model.status}
              >
                  <header class="header">
                      <h2>Local segment analysis</h2>
                      <span class="badge"
                          >${text(this._data.parsedData.format)}</span
                      >
                  </header>
                  <p class="status" role="status" aria-live="polite">
                      ${this.analysisMessage ||
                      model.message ||
                      'Analysis ready.'}
                  </p>
                  <nav class="tabs" aria-label="Local segment inspection">
                      ${['overview', 'structure', 'hex'].map(
                          (tab) =>
                              html`<button
                                  class="tab-btn"
                                  data-active=${this.activeTab === tab
                                      ? 'true'
                                      : 'false'}
                                  aria-pressed=${this.activeTab === tab
                                      ? 'true'
                                      : 'false'}
                                  @click=${() => this.setTab(tab)}
                                  >${tab === 'hex'
                                      ? 'Raw / Hex'
                                      : `${tab[0].toUpperCase()}${tab.slice(
                                            1
                                        )}`}</button
                              >`
                      )}
                      ${this.analysisState === 'analyzing'
                          ? html`<button
                                class="tab-btn"
                                @click=${() => this.cancelDeepAnalysis()}
                                >Cancel</button
                            >`
                          : null}
                  </nav>
                  <div
                      tabindex="0"
                      aria-label=${`${this.activeTab} inspection`}
                  >
                      ${this.activeTab === 'overview'
                          ? this.renderOverview(model)
                          : this.renderRows(model, this.activeTab)}
                  </div>
              </section>`;
        render(html`<style>${styles}</style>${body}`, this.shadowRoot);
    }
}

if (!customElements.get(tagName))
    customElements.define(tagName, LocalSegmentAnalysisView);

export { LocalSegmentAnalysisView, tagName };
