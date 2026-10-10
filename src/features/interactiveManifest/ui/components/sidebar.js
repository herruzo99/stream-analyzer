import { useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { styleMap } from 'lit-html/directives/style-map.js';
import { getSmartTokenDetails, renderSmartToken } from './smart-tokens.js';

// Semantic Layout Styles for Manual Injection (since not using LitElement styles)
const layoutCardStyles = {

    borderRadius: '0.75rem',
    boxShadow: '0 8px 30px rgb(0 0 0 / 0.35)',
    backdropFilter: 'blur(12px)',
};

const detailTemplate = (item, isSelected) => {
    // --- Empty State ---
    if (!item) {
        return html`
            <div
                class="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center relative overflow-hidden"
            >
                <!-- Ambient Background -->
                <div
                    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none animate-pulse-slow"
                ></div>

                <div class="relative z-10 flex flex-col items-center">
                    <div
                        class="p-6 rounded-full bg-slate-800 border border-slate-800/30 mb-6 shadow-[0_0_30px_#3b82f6/10]"
                    >
                        <div class="text-blue-400 scale-150">
                            ${icons.activity}
                        </div>
                    </div>
                    <div
                        class="text-lg font-bold uppercase tracking-widest text-slate-100 mb-2"
                    >
                        Awaiting Selection
                    </div>
                    <div
                        class="text-xs opacity-60 max-w-[200px] leading-relaxed"
                    >
                        Hover over any element in the manifest to inspect its
                        properties and analyze its behavior.
                    </div>
                </div>
            </div>
        `;
    }

    const handleClear = () => {
        useUiStore.getState().setInteractiveManifestSelectedItem(null);
    };

    let title = item.key || item.tagName;
    let subtitle = item.parentTag;

    // Restore "Awesome UI" by splitting Tag@Attr
    if (item.key && item.key.includes('@')) {
        const parts = item.key.split('@');
        subtitle = parts[0]; // Tag Name
        title = parts[1]; // Attribute Name
    }
    const attributeValue = item.value;

    let smartToken = null;
    /** @type {import('../../domain/smart-badge-system.js').SmartDetails | null} */
    let smartDetails = null;

    if (item.type === 'attribute') {
        const context = item.context || {};
        smartToken = renderSmartToken(
            item.key,
            item.value,
            context.timescale,
            context.allAttributes,
            context.anchorTime,
            context.pto,
            context.spd,
            context.now,
            context.isSpdActive
        );
        // Resolve the S-aggregator parent first: when it renders alongside
        // as PARENT CONTEXT, the child d/t/r panel slims down to its own
        // math + rows (no duplicate verdict hero / timeline strip).
        let parentDetails = null;
        if (item.parentTag === 'S') {
            parentDetails = getSmartTokenDetails(
                'S',
                context.allAttributes, // Pass all attributes as value for aggregator
                context.timescale,
                context.anchorTime,
                context.pto,
                context.allAttributes,
                context.spd,
                context.now,
                context.isSpdActive
            );
        }
        const suppressChildVerdict = !!(parentDetails && parentDetails.label);

        smartDetails = getSmartTokenDetails(
            item.key,
            item.value,
            context.timescale,
            context.anchorTime,
            context.pto,
            context.allAttributes,
            context.spd,
            context.now,
            context.isSpdActive,
            suppressChildVerdict
        );

        // If parent has details, merge or append them.
        if (suppressChildVerdict) {
            // We'll attach it to a new property to render it explicitly
            smartDetails = smartDetails || { label: '' };
            // @ts-ignore
            smartDetails.parentSmartDetails = parentDetails;
        }
    } else if (item.type === 'tag') {
        const context = item.context || {};

        // Check if this tag has a smart badge (e.g. 'S')
        if (item.key === 'S') {
            smartDetails = getSmartTokenDetails(
                'S',
                context.allAttributes,
                context.timescale,
                context.anchorTime,
                context.pto,
                context.allAttributes,
                context.spd,
                context.now,
                context.isSpdActive
            );
        }
    }

    // --- Type Badge Logic ---
    const isTag = item.type === 'tag';
    const typeLabel = isTag ? 'Element' : 'Attribute';
    const typeColorClass = isTag
        ? 'text-purple-300 bg-purple-500/10 border-purple-500/20'
        : 'text-blue-400 bg-blue-500/10 border-blue-500/20';

    return html`
        <div
            class="h-full flex flex-col relative overflow-hidden"
        >
            <!-- Ambient Background (Local to card) -->
            <div
                class="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none -mr-32 -mt-32"
            ></div>

            <!-- Header -->
            <div
                class="relative z-10 p-5 border-b border-slate-800/30 backdrop-blur-xl shrink-0"
            >
                <div class="flex justify-between items-start mb-3">
                    <span
                        class="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${typeColorClass} shadow-[0_0_15px_rgba(0,0,0,0.2)]"
                    >
                        ${typeLabel}
                    </span>
                    ${isSelected
            ? html`
                              <button
                                  @click=${handleClear}
                                  class="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
                                  title="Clear Selection"
                              >
                                  ${icons.xCircle}
                              </button>
                          `
            : ''}
                </div>

                <div class="space-y-1">
                    <div class="flex items-center gap-3">
                        <h2
                            class="text-2xl font-black text-slate-100 tracking-tight break-all leading-none drop-shadow-sm"
                        >
                            ${title}
                        </h2>
                        ${smartToken
            ? html`<div
                                  class="scale-110 origin-left drop-shadow-lg"
                              >
                                  ${smartToken}
                              </div>`
            : ''}
                    </div>

                    ${subtitle
            ? html`
                              <div
                                  class="flex items-center gap-2 text-sm text-slate-400 font-medium"
                              >
                                  <span class="opacity-50">parent</span>
                                  <div
                                      class="flex items-center gap-1 text-purple-300"
                                  >
                                      <span class="opacity-50">&lt;</span>
                                      <span class="font-mono font-bold"
                                          >${subtitle}</span
                                      >
                                      <span class="opacity-50">&gt;</span>
                                  </div>
                              </div>
                          `
            : ''}
                </div>
            </div>

            <!-- Scrollable Content -->
            <div
                class="relative z-10 p-5 space-y-5 overflow-y-auto grow min-h-0 custom-scrollbar"
            >
                <!-- 1. Raw Value Section -->
                ${attributeValue
            ? html`
                          <div class="animate-fadeIn delay-75">
                              <div class="flex items-center gap-2 mb-2">
                                  <span
                                      class="text-slate-400"
                                      >${icons.code}</span
                                  >
                                  <h3
                                      class="text-xs font-bold text-slate-400 uppercase tracking-widest"
                                  >
                                      Raw Value
                                  </h3>
                              </div>
                              <div
                                  class="group relative bg-slate-800 rounded-xl border border-slate-800/50 overflow-hidden transition-all hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(0,0,0,0.2)]"
                              >
                                  <div
                                      class="p-3 font-mono text-sm text-slate-100 break-all leading-relaxed"
                                  >
                                      "${attributeValue}"
                                  </div>
                                  <!-- Copy Hint -->
                                  <div
                                      class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                      <span
                                          class="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-800"
                                      >
                                          Select to Copy
                                      </span>
                                  </div>
                              </div>
                          </div>
                      `
            : ''}

                <!-- 2. Smart Analysis Section (If available) -->
                ${smartDetails &&
            (smartDetails.tooltipHtml ||
                smartDetails.parsedValue ||
                smartDetails.parentSmartDetails)
            ? html`
                          <div class="animate-fadeIn">
                              <div class="flex items-center gap-2 mb-2">
                                  <span class="text-teal-300"
                                      >${icons.cpu}</span
                                  >
                                  <h3
                                      class="text-xs font-bold text-slate-400 uppercase tracking-widest"
                                  >
                                      Smart Analysis
                                  </h3>
                              </div>

                              <!-- Current Item Details -->
                              ${smartDetails.tooltipHtml ||
                    smartDetails.parsedValue
                    ? html`
                                        <div
                                            class="sidebar-tooltip-content mb-3"
                                        >
                                            ${smartDetails.tooltipHtml
                            ? unsafeHTML(
                                smartDetails.tooltipHtml
                            )
                            : html`
                                                      <div
                                                          class="bg-slate-800 rounded-xl p-3 border border-slate-800/50 shadow-sm"
                                                      >
                                                          <div
                                                              class="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1"
                                                          >
                                                              Parsed Value
                                                          </div>
                                                          <div
                                                              class="text-blue-400 font-mono text-lg font-bold tracking-tight"
                                                          >
                                                              ${smartDetails.parsedValue}
                                                          </div>
                                                      </div>
                                                  `}
                                        </div>
                                    `
                    : ''}

                              <!-- Parent Context Details (e.g. S Tag Aggregator) -->
                              ${smartDetails.parentSmartDetails
                    ? html`
                                        <div class="relative">
                                            <div
                                                class="absolute -left-3 top-0 bottom-0 w-0.5 bg-slate-800/30"
                                            ></div>
                                            <div
                                                class="mb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400 opacity-70 pl-2"
                                            >
                                                Parent Context
                                                (${item.parentTag})
                                            </div>
                                            <div
                                                class="sidebar-tooltip-content pl-2"
                                            >
                                                ${smartDetails
                            .parentSmartDetails
                            .tooltipHtml
                            ? unsafeHTML(
                                smartDetails
                                    .parentSmartDetails
                                    .tooltipHtml
                            )
                            : html`
                                                          <div
                                                              class="bg-slate-800 rounded-xl p-3 border border-slate-800/50 shadow-sm"
                                                          >
                                                              <div
                                                                  class="text-blue-400 font-mono text-sm font-bold"
                                                              >
                                                                  ${smartDetails
                                    .parentSmartDetails
                                    .parsedValue ||
                                smartDetails
                                    .parentSmartDetails
                                    .label}
                                                              </div>
                                                          </div>
                                                      `}
                                            </div>
                                        </div>
                                    `
                    : ''}
                          </div>
                      `
            : ''}

                <!-- 3. Documentation Section -->
                <div class="animate-fadeIn delay-100">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-slate-400"
                            >${icons.book}</span
                        >
                        <h3
                            class="text-xs font-bold text-slate-400 uppercase tracking-widest"
                        >
                            Documentation
                        </h3>
                    </div>

                    <div
                        class="bg-slate-800/50 rounded-2xl p-4 border border-slate-800/50 space-y-3"
                    >
                        <p
                            class="text-sm text-slate-100 leading-relaxed opacity-90"
                        >
                            ${item.info?.text ||
        'No description available for this element.'}
                        </p>

                        <div
                            class="pt-3 border-t border-slate-800/30 flex items-center justify-between"
                        >
                            <span
                                class="text-[10px] font-bold uppercase tracking-wider text-slate-400 opacity-70"
                            >
                                Specification
                            </span>
                            <div
                                class="flex items-center gap-2 text-blue-400"
                            >
                                <span
                                    class="text-[10px] font-mono font-bold bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20"
                                >
                                    ${item.info?.isoRef || 'ISO/IEC 23009-1'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

export class InteractiveManifestSidebar extends HTMLElement {
    constructor() {
        super();
        this._now = null;
        this._isSpdActive = true; // Default
    }

    set now(value) {
        this._now = value;
        this.render();
    }

    set isSpdActive(value) {
        this._isSpdActive = value;
        this.render();
    }

    connectedCallback() {
        this.style.display = 'flex';
        this.style.flexDirection = 'column';
        this.style.height = '100%';
        this.style.overflow = 'hidden';

        this.render();
        this.unsubscribe = useUiStore.subscribe(() => this.render());
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
    }

    render() {
        const {
            interactiveManifestHoveredItem,
            interactiveManifestSelectedItem,
        } = useUiStore.getState();
        const itemToDisplay =
            interactiveManifestSelectedItem || interactiveManifestHoveredItem;
        const isSelected = !!interactiveManifestSelectedItem;

        // Inject 'now' and 'isSpdActive' into item context if it exists.
        // `.now` is the live-only raw clock from the index (null on VOD),
        // so freshness badges stay off unless the stream is live.
        if (itemToDisplay && itemToDisplay.context) {
            itemToDisplay.context.now = this._now;
            itemToDisplay.context.isSpdActive = this._isSpdActive;
        }

        const template = html`
            <div
                class="flex flex-col h-full overflow-hidden"
                style=${styleMap({
            ...layoutCardStyles,
            // Use a slightly heavier glass for the sidebar
            background: '#1e293b',
            // Ensure full height
            height: '100%',
        })}
            >
                ${detailTemplate(itemToDisplay, isSelected)}
            </div>
        `;
        render(template, this);
    }
}

customElements.define(
    'interactive-manifest-sidebar',
    InteractiveManifestSidebar
);
