import { html, render } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import * as icons from '@/ui/icons';
import { highlightHls, highlightDash } from '@/ui/shared/syntax-highlighter';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';

export class ComplianceIssueList extends HTMLElement {
    constructor() {
        super();
        this._issues = [];
        this._stream = null;
        this._filter = 'all'; // all, fail, warn
        this._expandedId = null;
    }

    set data({ issues, stream }) {
        this._issues = issues;
        this._stream = stream;
        this.render();
    }

    get filteredIssues() {
        if (this._filter === 'all') return this._issues;
        return this._issues.filter((i) => i.status === this._filter);
    }

    toggleExpand(id) {
        this._expandedId = this._expandedId === id ? null : id;
        this.render();
    }

    setFilter(f) {
        this._filter = f;
        this.render();
    }

    getSnippet(issue) {
        if (!this._stream) return 'Source unavailable';

        const isHls = this._stream.protocol === 'hls';
        const raw = this._stream.rawManifest;

        if (isHls && issue.location.startLine) {
            const lines = raw.split('\n');
            const start = Math.max(0, issue.location.startLine - 2);
            const end = Math.min(lines.length, issue.location.endLine + 2);

            const snippetLines = lines.slice(start, end).map((line, idx) => {
                const lineNum = start + idx + 1;
                const isErrorLine =
                    lineNum >= issue.location.startLine &&
                    lineNum <= issue.location.endLine;
                const hl = highlightHls(line);
                return `<div class="flex"><span class="w-8 text-right text-slate-600 mr-2 select-none">${lineNum}</span><span class="${isErrorLine ? 'bg-red-900/30 w-full block' : ''}">${hl}</span></div>`;
            });
            return snippetLines.join('');
        }

        // DASH Snippet (simplified: just show message, as XML line mapping is complex without sourcemap)
        if (issue.location.path) {
            return `<div class="text-slate-400 italic">Path: ${issue.location.path}</div>`;
        }

        return 'Context unavailable';
    }

    render() {
        const counts = {
            fail: this._issues.filter((i) => i.status === 'fail').length,
            warn: this._issues.filter((i) => i.status === 'warn').length,
            all: this._issues.length,
        };

        const filterBtn = (type, label, count, color) => {
            const isActive = this._filter === type;
            return html`
                <button
                    @click=${() => this.setFilter(type)}
                    class="px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-2 border 
                    ${isActive
                        ? `bg-${color}-900/30 text-${color}-300 border-${color}-700`
                        : `bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700`}"
                >
                    ${label}
                    <span class="bg-slate-900 px-1.5 rounded text-[10px]"
                        >${count}</span
                    >
                </button>
            `;
        };

        const renderIssue = (issue) => {
            const isExpanded = this._expandedId === issue.id;
            const color =
                issue.status === 'fail'
                    ? 'red'
                    : issue.status === 'warn'
                      ? 'yellow'
                      : 'blue';
            const icon =
                issue.status === 'fail'
                    ? icons.xCircle
                    : issue.status === 'warn'
                      ? icons.alertTriangle
                      : icons.info;

            return html`
                <div
                    class="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden transition-all duration-200 ${isExpanded
                        ? `ring-1 ring-${color}-500/50`
                        : 'hover:border-slate-600'}"
                >
                    <div
                        @click=${() => this.toggleExpand(issue.id)}
                        class="p-4 cursor-pointer flex items-start gap-3"
                    >
                        <div class="shrink-0 text-${color}-500 mt-0.5">
                            ${icon}
                        </div>
                        <div class="grow min-w-0">
                            <div class="flex justify-between items-start gap-2">
                                <h4
                                    class="text-sm font-semibold text-slate-200 leading-tight"
                                >
                                    ${issue.text}
                                </h4>
                                <span
                                    class="shrink-0 text-[10px] font-mono text-slate-500 border border-slate-700 px-1.5 rounded"
                                    >${issue.id}</span
                                >
                            </div>
                            <p class="text-xs text-slate-400 mt-1 truncate">
                                ${issue.category} &bull; ${issue.isoRef}
                            </p>
                        </div>
                        <div
                            class="text-slate-500 transition-transform duration-200 ${isExpanded
                                ? 'rotate-180'
                                : ''}"
                        >
                            ${icons.chevronDown}
                        </div>
                    </div>

                    ${isExpanded
                        ? html`
                              <div
                                  class="border-t border-slate-700 bg-slate-900/30 p-4 animate-fadeIn"
                              >
                                  <div
                                      class="text-sm text-slate-300 mb-4 bg-slate-800 p-3 rounded border border-slate-700/50"
                                  >
                                      <strong
                                          class="text-${color}-400 block mb-1"
                                          >Details:</strong
                                      >
                                      ${issue.details}
                                  </div>

                                  <div
                                      class="bg-slate-950 rounded border border-slate-800 p-2 font-mono text-xs overflow-x-auto leading-relaxed"
                                  >
                                      ${unsafeHTML(this.getSnippet(issue))}
                                  </div>
                              </div>
                          `
                        : ''}
                </div>
            `;
        };

        const template = html`
            <div class="flex flex-col h-full">
                <div
                    class="flex items-center gap-2 mb-4 sticky top-0 bg-slate-900 z-10 pb-2"
                >
                    ${filterBtn('all', 'All Issues', counts.all, 'blue')}
                    ${filterBtn('fail', 'Errors', counts.fail, 'red')}
                    ${filterBtn('warn', 'Warnings', counts.warn, 'yellow')}
                </div>

                <div class="space-y-3 grow overflow-y-auto pr-2">
                    ${this.filteredIssues.length === 0
                        ? html`<div
                              class="text-center p-8 text-slate-500 italic"
                          >
                              No issues found matching filter.
                          </div>`
                        : this.filteredIssues.map(renderIssue)}
                </div>
            </div>
        `;

        render(template, this);
    }
}

customElements.define('compliance-issue-list', ComplianceIssueList);
