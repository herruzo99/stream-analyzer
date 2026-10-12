import { eventBus } from '@/application/event-bus';
import { EVENTS } from '@/types/events';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { highlightHls } from '@/ui/shared/syntax-highlighter';
import { html, render } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';

export class ComplianceIssueList extends HTMLElement {
    // FORCE LIGHT DOM to inherit global Tailwind styles
    createRenderRoot() {
        return this;
    }

    constructor() {
        super();
        this._issues = [];
        this._stream = null;
        this._filter = 'all'; // all, fail, warn
        this._expandedId = null;
        this._unsubscribe = null;
    }

    connectedCallback() {
        // Add component-level classes for layout
        this.className = 'block h-full flex flex-col min-h-0 relative';

        this._unsubscribe = useUiStore.subscribe(() => this.render());
        this.render();
    }

    disconnectedCallback() {
        if (this._unsubscribe) this._unsubscribe();
    }

    set data({ issues, stream }) {
        this._issues = Array.isArray(issues) ? issues : [];
        this._stream = stream;
        this.render();
    }

    get filteredIssues() {
        if (this._filter === 'all') return this._issues;
        return this._issues.filter((i) => i.status === this._filter);
    }

    get groupedIssues() {
        const groups = {};
        this.filteredIssues.forEach((issue) => {
            const cat = issue.category || 'General';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(issue);
        });
        return groups;
    }

    toggleExpand(id) {
        this._expandedId = this._expandedId === id ? null : id;
        this.render();
    }

    setFilter(f) {
        this._filter = f;
        this._expandedId = null;
        // Publish so the Source view highlights match the sidebar filter.
        eventBus.dispatch(EVENTS.UI.COMPLIANCE_FILTER_CHANGED, {
            filter: f,
        });
        this.render();
    }

    handleMouseEnter(category) {
        uiActions.setHighlightedComplianceCategory(category);
    }

    handleMouseLeave() {
        uiActions.setHighlightedComplianceCategory(null);
    }

    getSnippet(issue) {
        if (!this._stream) return 'Source unavailable';

        const isHls = this._stream.protocol === 'hls';
        const raw = this._stream.rawManifest;

        if (!raw) return 'No manifest content available';

        if (isHls && issue.location?.startLine) {
            const lines = raw.split('\n');
            const start = Math.max(0, issue.location.startLine - 2);
            const end = Math.min(
                lines.length,
                (issue.location.endLine || issue.location.startLine) + 2
            );

            if (start >= lines.length) return 'Line number out of bounds';

            const snippetLines = lines.slice(start, end).map((line, idx) => {
                const lineNum = start + idx + 1;
                const isErrorLine =
                    lineNum >= issue.location.startLine &&
                    lineNum <=
                        (issue.location.endLine || issue.location.startLine);

                const lineContent = highlightHls(line || '');
                const bgStyle = isErrorLine
                    ? 'background: rgba(239,68,68,0.08);'
                    : '';

                return `
                    <div class="flex" style="${bgStyle}">
                        <span class="w-8 text-right mr-3 select-none opacity-40 font-mono text-[10px]" style="color: #94a3b8">${lineNum}</span>
                        <span class="font-mono text-[11px] whitespace-pre-wrap break-all" style="color: #f1f5f9">${lineContent}</span>
                    </div>
                `;
            });
            return snippetLines.join('');
        }

        if (issue.location?.path) {
            return `<div class="mono text-[11px] text-slate-500">location: ${issue.location.path}</div>`;
        }

        return 'Context unavailable';
    }

    render() {
        if (!this._issues) return;

        const total = this._issues.length;
        const counts = {
            all: total,
            fail: this._issues.filter((i) => i.status === 'fail').length,
            warn: this._issues.filter((i) => i.status === 'warn').length,
        };

        const groups = this.groupedIssues;
        const sortedCategories = Object.keys(groups).sort();
        const hasIssues = sortedCategories.length > 0;
        const isFiltered = this._filter !== 'all';

        const filterBtn = (type, label) => {
            const isActive = this._filter === type;
            return html`
                <button
                    @click=${() => this.setFilter(type)}
                    aria-pressed=${isActive}
                    class="px-2.5 py-1.5 rounded-md mono text-[11px] border transition-colors flex items-center gap-1.5 ${isActive
                        ? type === 'fail'
                            ? 'bg-red-500/10 text-red-200 border-red-400/25'
                            : type === 'warn'
                              ? 'bg-amber-500/10 text-amber-200 border-amber-400/25'
                              : 'bg-white/10 text-slate-100 border-white/10'
                        : 'bg-transparent text-slate-500 border-transparent hover:text-slate-200 hover:bg-white/5'}"
                >
                    ${label}
                    <span class="text-slate-600">${counts[type]}</span>
                </button>
            `;
        };

        const statusIcon = (status) =>
            status === 'fail'
                ? html`<span class="text-red-300 shrink-0"
                      >${icons.xCircle}</span
                  >`
                : status === 'warn'
                  ? html`<span class="text-amber-300 shrink-0"
                        >${icons.alertTriangle}</span
                    >`
                  : status === 'pass'
                    ? html`<span class="text-emerald-300 shrink-0"
                          >${icons.checkCircle}</span
                      >`
                    : html`<span class="text-slate-500 shrink-0"
                          >${icons.info}</span
                      >`;

        const template = html`
            <div
                class="px-3 py-2 border-b border-white/5 flex items-center gap-1 shrink-0"
                role="group"
                aria-label="Filter by severity"
            >
                ${filterBtn('all', 'all')}
                ${filterBtn('fail', 'errors')}
                ${filterBtn('warn', 'warnings')}
            </div>

            <div class="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-0">
                ${!hasIssues
                    ? html`
                          <div class="py-10 px-4 text-center">
                              ${isFiltered
                                  ? html`
                                        <p
                                            class="text-[13px] text-slate-300 mb-1"
                                        >
                                            No ${this._filter === 'fail'
                                                ? 'errors'
                                                : 'warnings'}
                                            in this update.
                                        </p>
                                        <button
                                            @click=${() => this.setFilter('all')}
                                            class="mono text-[11px] text-emerald-300 hover:text-emerald-200 transition-colors"
                                        >
                                            show all ${total}
                                        </button>
                                    `
                                  : total === 0
                                    ? html`
                                          <p
                                              class="text-[13px] text-slate-300 mb-1"
                                          >
                                              No checks ran for this update.
                                          </p>
                                          <p
                                              class="mono text-[11px] text-slate-600"
                                          >
                                              results appear here after
                                              analysis
                                          </p>
                                      `
                                    : html`
                                          <p
                                              class="text-[13px] text-slate-300 mb-1"
                                          >
                                              All checks passed.
                                          </p>
                                          <p
                                              class="mono text-[11px] text-slate-600"
                                          >
                                              ${total} check${total === 1
                                                  ? ''
                                                  : 's'} · nothing to fix
                                          </p>
                                      `}
                          </div>
                      `
                    : sortedCategories.map(
                          (category) => html`
                              <div class="mb-1">
                                  <p
                                      class="mono sticky top-0 z-10 px-2.5 py-2 text-[10px] text-slate-600 bg-[#0b111c]"
                                      @mouseenter=${() =>
                                          this.handleMouseEnter(category)}
                                      @mouseleave=${() =>
                                          this.handleMouseLeave()}
                                  >
                                      ${String(category).toLowerCase()}
                                  </p>
                                  ${groups[category].map((issue, idx) => {
                                      const uniqueKey = `${issue.id}-${idx}`;
                                      const isExpanded =
                                          this._expandedId === uniqueKey;
                                      return html`
                                          <div
                                              class="rounded-md border transition-colors overflow-hidden mb-1 ${isExpanded
                                                  ? issue.status === 'fail'
                                                      ? 'border-red-400/40 bg-red-500/[0.04]'
                                                      : issue.status === 'warn'
                                                        ? 'border-amber-400/40 bg-amber-500/[0.04]'
                                                        : 'border-white/15 bg-white/[0.03]'
                                                  : 'border-white/5 bg-transparent hover:bg-white/[0.02]'}"
                                          >
                                              <button
                                                  @click=${() =>
                                                      this.toggleExpand(
                                                          uniqueKey
                                                      )}
                                                  aria-expanded=${isExpanded}
                                                  class="w-full px-2.5 py-2 flex items-start gap-2.5 text-left"
                                              >
                                                  ${statusIcon(issue.status)}
                                                  <span
                                                      class="grow min-w-0"
                                                  >
                                                      <span
                                                          class="block text-[13px] font-medium leading-snug text-slate-100"
                                                      >
                                                          ${issue.text}
                                                      </span>
                                                      <span
                                                          class="mono block text-[10px] text-slate-600 mt-0.5 truncate"
                                                      >
                                                          ${issue.id}${issue.isoRef
                                                              ? ` · ${issue.isoRef}`
                                                              : ''}
                                                      </span>
                                                  </span>
                                                  <span
                                                      class="text-slate-600 transition-transform shrink-0 mt-0.5 ${isExpanded
                                                          ? 'rotate-180'
                                                          : ''}"
                                                  >
                                                      ${icons.chevronDown}
                                                  </span>
                                              </button>

                                              ${isExpanded
                                                  ? html`
                                                        <div
                                                            class="border-t border-white/5 px-2.5 py-2.5"
                                                        >
                                                            ${issue.details
                                                                ? html`<p
                                                                      class="text-xs leading-relaxed text-slate-400 mb-2"
                                                                  >
                                                                      ${issue.details}
                                                                  </p>`
                                                                : ''}
                                                            <div
                                                                class="rounded bg-black/30 border border-white/5 p-2.5 overflow-x-auto"
                                                            >
                                                                ${unsafeHTML(
                                                                    this.getSnippet(
                                                                        issue
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    `
                                                  : ''}
                                          </div>
                                      `;
                                  })}
                              </div>
                          `
                      )}
            </div>
        `;

        render(template, this);
    }
}

customElements.define('compliance-issue-list', ComplianceIssueList);
