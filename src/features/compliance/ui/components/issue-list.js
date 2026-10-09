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
        this.className = "block h-full flex flex-col min-h-0 relative";

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

        if (isHls && issue.location && issue.location.startLine) {
            const lines = raw.split('\n');
            const start = Math.max(0, issue.location.startLine - 2);
            const end = Math.min(lines.length, (issue.location.endLine || issue.location.startLine) + 2);

            if (start >= lines.length) return 'Line number out of bounds';

            const snippetLines = lines.slice(start, end).map((line, idx) => {
                const lineNum = start + idx + 1;
                const isErrorLine =
                    lineNum >= issue.location.startLine &&
                    lineNum <= (issue.location.endLine || issue.location.startLine);

                const lineContent = highlightHls(line || '');
                // Using semantic error color with opacity for highlight
                const bgStyle = isErrorLine ? 'background: color-mix(in srgb, #ef4444 15%, transparent);' : '';

                return `
                    <div class="flex" style="${bgStyle}">
                        <span class="w-8 text-right mr-3 select-none opacity-40 font-mono text-[10px]" style="color: #94a3b8">${lineNum}</span>
                        <span class="font-mono text-[11px] whitespace-pre-wrap break-all" style="color: #f1f5f9">${lineContent}</span>
                    </div>
                `;
            });
            return snippetLines.join('');
        }

        if (issue.location && issue.location.path) {
            return `<div class="italic text-xs p-2 opacity-70" style="color: #94a3b8">Location: ${issue.location.path}</div>`;
        }

        return 'Context unavailable';
    }

    render() {
        if (!this._issues) return;

        const counts = {
            all: this._issues.length,
            fail: this._issues.filter(i => i.status === 'fail').length,
            warn: this._issues.filter(i => i.status === 'warn').length
        };

        const groups = this.groupedIssues;
        const sortedCategories = Object.keys(groups).sort();
        const hasIssues = Object.keys(groups).length > 0;

        // Button Styles Helper
        const getBtnClass = (type) => {
            const isActive = this._filter === type;
            const base = "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all duration-200 border";

            if (isActive) {
                if (type === 'fail') return `${base} border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)] bg-red-500/10`;
                if (type === 'warn') return `${base} border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(234,179,8,0.2)] bg-amber-500/10`;
                return `${base} border-blue-500 text-blue-400 shadow-[0_0_15px_#3b82f6] bg-blue-500/10`;
            }
            return `${base} border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-100`;
        };

        // Scrollbar style injection (scoped)
        const scrollbarStyles = `
            .custom-scroll::-webkit-scrollbar { width: 6px; }
            .custom-scroll::-webkit-scrollbar-track { background: transparent; }
            .custom-scroll::-webkit-scrollbar-thumb { background-color: #1e293b; border-radius: 99px; }
            .custom-scroll::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
        `;

        const template = html`
            <style>${scrollbarStyles}</style>

            <!-- Filters Bar -->
            <div class="p-3 border-b flex items-center justify-between shrink-0 glass-panel" 
                 style="border-bottom: 1px solid #1e293b; background: #1e293b;">
                
                <div class="flex items-center gap-2">
                    <button @click=${() => this.setFilter('all')} class="${getBtnClass('all')}">
                        All <span class="opacity-60 text-[10px] ml-0.5">(${counts.all})</span>
                    </button>
                    <button @click=${() => this.setFilter('fail')} class="${getBtnClass('fail')}">
                        Errors <span class="opacity-60 text-[10px] ml-0.5">(${counts.fail})</span>
                    </button>
                    <button @click=${() => this.setFilter('warn')} class="${getBtnClass('warn')}">
                        Warnings <span class="opacity-60 text-[10px] ml-0.5">(${counts.warn})</span>
                    </button>
                </div>
            </div>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto custom-scroll p-4 space-y-8">
                ${!hasIssues ? html`
                    <div class="h-full flex flex-col items-center justify-center opacity-30 gap-4 min-h-[200px]">
                        <div class="text-4xl" style="color: #94a3b8;">${icons.checkCircle}</div>
                        <div class="text-sm font-medium">No active findings</div>
                    </div>
                ` : sortedCategories.map(category => {
            const categoryIssues = groups[category];
            return html`
                        <div class="space-y-3">
                            <!-- Category Header -->
                            <div class="flex items-center gap-3 sticky top-0 z-10 py-2 backdrop-blur-xl -mx-2 px-2 rounded-lg"
                                 style="background: linear-gradient(to right, #1e293b, transparent);">
                                <div class="w-1 h-4 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>
                                <h3 class="text-xs font-bold uppercase tracking-widest text-slate-400">
                                    ${category}
                                </h3>
                                <div class="h-px bg-slate-800 flex-1 opacity-50"></div>
                            </div>

                            <!-- Issues Grid -->
                            <div class="grid grid-cols-1 gap-3">
                                ${categoryIssues.map((issue, idx) => {
                const uniqueKey = `${issue.id}-${idx}`;
                const isExpanded = this._expandedId === uniqueKey;

                // Status Config
                let statusColorRef = '#94a3b8';
                let statusIcon = icons.info;
                let borderColor = '#1e293b';

                if (issue.status === 'fail') {
                    statusColorRef = '#ef4444';
                    statusIcon = icons.xCircle;
                    borderColor = isExpanded ? '#ef4444' : '#1e293b';
                } else if (issue.status === 'warn') {
                    statusColorRef = '#f59e0b';
                    statusIcon = icons.alertTriangle;
                    borderColor = isExpanded ? '#f59e0b' : '#1e293b';
                } else if (issue.status === 'pass') {
                    statusColorRef = '#10b981';
                    statusIcon = icons.checkCircle;
                }

                return html`
                                        <div class="rounded-lg border transition-all duration-300 bg-slate-800 hover:brightness-110 overflow-hidden"
                                             style="border-color: ${borderColor}; ${isExpanded ? `box-shadow: 0 0 20px -10px ${statusColorRef};` : ''}">
                                            
                                            <!-- Row Header -->
                                            <div @click=${() => this.toggleExpand(uniqueKey)}
                                                 class="p-3 flex items-start gap-4 cursor-pointer group select-none">
                                                
                                                <!-- Icon -->
                                                <div class="mt-0.5 shrink-0 transition-transform group-hover:scale-110" style="color: ${statusColorRef}">
                                                    ${statusIcon}
                                                </div>

                                                <!-- Content -->
                                                <div class="flex-1 min-w-0">
                                                    <div class="text-sm font-bold leading-tight mb-1 text-slate-100 group-hover:text-blue-400 transition-colors">
                                                        ${issue.text}
                                                    </div>
                                                    <div class="flex items-center gap-3 text-[10px] font-mono text-slate-400 opacity-70">
                                                        <span>${issue.id}</span>
                                                        ${issue.isoRef ? html`<span class="px-1.5 h-4 flex items-center rounded bg-slate-900 border border-slate-800">${issue.isoRef}</span>` : ''}
                                                    </div>
                                                </div>

                                                <!-- Expand Chevron -->
                                                <div class="transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} text-slate-400 opacity-50">
                                                    ${icons.chevronDown}
                                                </div>
                                            </div>

                                            <!-- Expanded Details -->
                                            ${isExpanded ? html`
                                                <div class="border-t border-slate-800 bg-slate-900/50 animate-fadeIn">
                                                    <div class="p-4 space-y-4">
                                                        <div class="text-xs leading-relaxed text-slate-400">
                                                            ${issue.details}
                                                        </div>
                                                        
                                                        <div class="rounded bg-slate-900 border border-slate-800 p-3 overflow-x-auto">
                                                            ${unsafeHTML(this.getSnippet(issue))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ` : ''}
                                        </div>
                                    `;
            })}
                            </div>
                        </div>
                    `;
        })}
            </div>
        `;

        render(template, this);
    }
}

customElements.define('compliance-issue-list', ComplianceIssueList);
