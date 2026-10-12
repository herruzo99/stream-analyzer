import { useAnalysisStore } from '@/state/analysisStore';
import { useQualityStore } from '@/state/qualityStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { getShellNavigationGroups } from '../navigation-contract.js';

class SidebarNav extends HTMLElement {
    constructor() {
        super();
        this._updatePending = false;
        this.unsubs = [];
    }

    connectedCallback() {
        // The contract reads all three stores; subscribe to all three so
        // badges/counts (streams, QC jobs, ad avails) stay fresh.
        this.unsubs.push(useUiStore.subscribe(() => this._enqueueRender()));
        this.unsubs.push(
            useAnalysisStore.subscribe(() => this._enqueueRender())
        );
        this.unsubs.push(
            useQualityStore.subscribe(() => this._enqueueRender())
        );
        this._enqueueRender();
    }

    disconnectedCallback() {
        this.unsubs.forEach((unsub) => unsub());
        this.unsubs = [];
    }

    _enqueueRender() {
        if (this._updatePending) return;
        this._updatePending = true;
        Promise.resolve().then(() => {
            this._updatePending = false;
            this.render();
        });
    }

    _statusLabel(item) {
        if (item.badge) return String(item.badge);
        if (item.hasError) return 'issues found';
        if (item.hasWarning) return 'needs review';
        return '';
    }

    renderNavItem(item, activeTab, isCompact, isDisabled) {
        const isActive = activeTab === item.key && !isDisabled;
        const status = this._statusLabel(item);
        const hint = isDisabled
            ? (item.unavailableReason || `${item.label} is unavailable here`)
            : status
              ? `${item.label} — ${status}`
              : item.label;

        const go = (e) => {
            e.preventDefault();
            if (isDisabled) return;
            uiActions.setActiveTab(item.key);
            if (window.innerWidth < 1280) {
                uiActions.setActiveSidebar(null);
            }
        };

        // Dots are reserved for needs-attention states. Live updates get
        // a neutral dot; everything informational uses text, not color.
        const dotClass = item.hasError
            ? 'bg-red-500'
            : item.hasWarning
              ? 'bg-amber-400'
              : 'bg-slate-500';

        if (isCompact) {
            return html`
                <button
                    @click=${go}
                    ?disabled=${isDisabled}
                    title=${hint}
                    aria-label=${hint}
                    aria-current=${isActive ? 'page' : 'false'}
                    class="relative w-full flex items-center justify-center py-2 rounded-md border transition-colors ${isActive
                        ? 'bg-transparent border-emerald-500/30 text-emerald-200'
                        : isDisabled
                          ? 'bg-transparent border-transparent text-slate-700 cursor-not-allowed'
                          : 'bg-transparent border-transparent text-slate-500 hover:text-slate-200 hover:bg-white/5'}"
                >
                    ${item.icon}
                    ${status || item.hasError || item.hasWarning
                        ? html`<span
                              class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${dotClass}"
                          ></span>`
                        : ''}
                </button>
            `;
        }

        return html`
            <button
                @click=${go}
                ?disabled=${isDisabled}
                title=${hint}
                aria-label=${hint}
                aria-current=${isActive ? 'page' : 'false'}
                class="group relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md border text-left transition-colors ${isActive
                    ? 'bg-transparent border-emerald-500/30 text-slate-100'
                    : isDisabled
                      ? 'bg-transparent border-transparent text-slate-700 cursor-not-allowed'
                      : 'bg-transparent border-transparent text-slate-400 hover:text-slate-100 hover:bg-white/5'}"
            >
                ${isActive
                    ? html`<span
                          class="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-emerald-400"
                      ></span>`
                    : ''}
                ${!isCompact &&
                typeof item.progress === 'number' &&
                item.progress > 0
                    ? html`<span
                          class="absolute bottom-0 left-2 right-2 h-px bg-white/5 overflow-hidden rounded-full"
                          ><span
                              class="block h-full bg-emerald-400 transition-all"
                              style="width: ${Math.min(100, Math.max(0, item.progress))}%"
                          ></span
                      ></span>`
                    : ''}
                <span
                    class="shrink-0 ${isActive ? 'text-emerald-300' : ''}"
                    >${item.icon}</span
                >
                <span class="truncate grow text-[13px] font-medium"
                    >${item.label}</span
                >
                ${status
                    ? html`<span
                          class="mono shrink-0 text-[10px] ${item.hasError
                              ? 'text-red-300'
                              : item.hasWarning
                                ? 'text-amber-300'
                                : 'text-slate-500'}"
                          >${status}</span
                      >`
                    : item.hasError || item.hasWarning
                      ? html`<span
                            class="shrink-0 w-1.5 h-1.5 rounded-full ${dotClass}"
                        ></span>`
                      : ''}
            </button>
        `;
    }

    render() {
        const { activeTab, isGlobalNavCompact } = useUiStore.getState();
        const groups = getShellNavigationGroups();

        const template = html`
            <div class="px-3 pb-6 flex flex-col gap-5">
                ${groups.map((group) => {
                    const items = group.items.filter(
                        (i) => i.visible || i.unavailableReason
                    );
                    if (items.length === 0) return '';

                    return html`
                        <div class="flex flex-col gap-0.5">
                            ${!isGlobalNavCompact
                                ? html`
                                      <p
                                          class="mono px-2.5 mb-1 text-[10px] text-slate-600 select-none"
                                      >
                                          ${group.title.toLowerCase()}
                                      </p>
                                  `
                                : html`<div
                                      class="h-px bg-white/5 mx-2 mb-1"
                                  ></div>`}
                            <nav
                                class="flex flex-col gap-px"
                                aria-label=${group.title}
                            >
                                ${items.map((item) =>
                                    this.renderNavItem(
                                        item,
                                        activeTab,
                                        isGlobalNavCompact,
                                        !item.visible
                                    )
                                )}
                            </nav>
                        </div>
                    `;
                })}
                <button
                    @click=${() => uiActions.toggleGlobalNavCompact()}
                    class="mt-1 flex items-center gap-2 px-2.5 py-2 rounded-md text-slate-600 hover:text-slate-200 hover:bg-white/5 transition-colors mono text-[11px]"
                    title="${isGlobalNavCompact ? 'Expand navigation' : 'Collapse navigation'}"
                    aria-label="${isGlobalNavCompact ? 'Expand navigation' : 'Collapse navigation'}"
                >
                    ${icons.sidebar}
                    ${!isGlobalNavCompact
                        ? html`<span>collapse</span>`
                        : ''}
                </button>
            </div>
        `;

        render(template, this);
    }
}

customElements.define('sidebar-nav', SidebarNav);
