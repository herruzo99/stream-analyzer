import { useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { html, render } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { getSmartTokenDetails, renderSmartToken } from './smart-tokens.js';

const detailTemplate = (item, isSelected) => {
    // --- Empty State ---
    if (!item) {
        return html`
            <div class="h-full flex flex-col bg-[#06090f]">
                <div class="shrink-0 px-4 py-3 border-b border-white/5">
                    <p class="mono text-[10px] text-slate-500">inspector</p>
                </div>
                <div class="p-4">
                    <p class="mono text-[11px] text-slate-600 leading-relaxed">
                        hover or select any element in the manifest to inspect it.
                    </p>
                </div>
            </div>
        `;
    }

    const handleClear = () => {
        useUiStore.getState().setInteractiveManifestSelectedItem(null);
    };

    // Raw value lives inline in the header now (space saver); click copies it.
    const handleCopyRaw = () => {
        if (attributeValue !== null && attributeValue !== undefined) {
            copyTextToClipboard(String(attributeValue), 'value copied');
        }
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

    // Global SMART kill-switch: when disabled, the sidebar shows raw
    // values + static descriptions only (no Smart Analysis section).
    const smartTagsEnabled = item.context?.smartTagsEnabled !== false;
    if (item.type === 'attribute' && smartTagsEnabled) {
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
            context.isSpdActive,
            {},
            true
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
    } else if (item.type === 'tag' && smartTagsEnabled) {
        const context = item.context || {};

        // Check if this tag has a smart badge (S, SegmentTimeline, Period)
        if (item.key === 'Period') {
            // Tag items carry NO value (attributes live in
            // context.allAttributes). Pass null so getDetails can't
            // stringify an attribute map into "[object Object]".
            smartDetails = getSmartTokenDetails(
                'Period',
                null,
                context.timescale,
                context.anchorTime,
                context.pto,
                context.allAttributes,
                context.spd,
                context.now,
                context.isSpdActive,
                false,
                { periodRollup: context.periodRollup || null }
            );
            // A Period tag with no computable rollup (SegmentBase/List
            // periods, or timelines the accumulator skipped) has no
            // Smart Analysis — fall back to nothing, never [object].
            if (
                smartDetails &&
                typeof smartDetails.parsedValue !== 'string' &&
                !smartDetails.tooltipHtml
            ) {
                smartDetails = null;
            }
        } else if (item.key === 'S') {
            smartDetails = getSmartTokenDetails(
                'S',
                context.allAttributes,
                context.timescale,
                context.anchorTime,
                context.pto,
                context.allAttributes,
                context.spd,
                context.now,
                context.isSpdActive,
                false,
                {
                    sSiblings: context.sSiblings || null,
                    sRunIndex: context.sRunIndex ?? 0,
                    periodStartSec: context.periodStartSec ?? null,
                }
            );
        } else if (item.key === 'SegmentTimeline') {
            smartDetails = getSmartTokenDetails(
                'SegmentTimeline',
                null,
                context.timescale,
                context.anchorTime,
                context.pto,
                context.allAttributes,
                context.spd,
                context.now,
                context.isSpdActive,
                false,
                { runs: context.runs || [] }
            );
        }
    }

    // --- Type Badge Logic ---
    const isTag = item.type === 'tag';
    const typeLabel = isTag ? 'element' : 'attribute';

    return html`
        <div class="h-full flex flex-col bg-[#06090f] min-h-0">
            <div class="shrink-0 px-4 py-3 border-b border-white/5">
                <div class="flex justify-between items-center">
                    <p class="mono text-[10px] text-slate-500">${typeLabel}</p>
                    ${isSelected
            ? html`
                              <button
                                  @click=${handleClear}
                                  class="p-1 rounded text-slate-500 hover:text-slate-100 hover:bg-white/5 transition-colors"
                                  title="Clear selection"
                                  aria-label="Clear selection"
                              >
                                  ${icons.x}
                              </button>
                          `
            : ''}
                </div>

                <div>
                    <div class="flex items-center gap-2.5 min-w-0">
                        <h2
                            class="text-[15px] font-medium text-slate-100 break-all leading-snug min-w-0"
                        >
                            ${title}
                        </h2>
                        ${smartToken
            ? html`<span class="shrink-0">${smartToken}</span>`
            : ''}
                    </div>
                        ${attributeValue
            ? html`<span
                                  @click=${handleCopyRaw}
                                  class="min-w-0 flex-1 truncate text-right mono text-[13px] text-slate-300 cursor-pointer hover:text-slate-100 transition-colors"
                                  >"${attributeValue}"</span
                              >`
            : ''}
                    </div>

                    ${subtitle
            ? html`
                              <p class="mono text-[11px] text-slate-600 mt-1">
                                  in &lt;${subtitle}&gt;
                              </p>
                          `
            : ''}
                    ${item.info?.text
            ? html`
                              <p class="text-[13px] text-slate-400 leading-relaxed mt-2">
                                  ${item.info.text}
                                  <span class="whitespace-nowrap mono text-[10px] text-slate-600"
                                      >· ${item.info?.isoRef || 'ISO/IEC 23009-1'}</span
                                  >
                              </p>
                          `
            : ''}
                </div>
            </div>

            <div class="p-4 space-y-4 overflow-y-auto grow min-h-0 custom-scrollbar">
                ${smartDetails &&
            (smartDetails.tooltipHtml ||
                smartDetails.parsedValue ||
                smartDetails.parentSmartDetails)
            ? html`
                          <div>
                              <h3 class="mono text-[10px] text-slate-500 mb-2">
                                  smart analysis
                              </h3>

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
                                                          class="bg-[#0b111c] rounded-md p-3 border border-white/5"
                                                      >
                                                          <p
                                                              class="mono text-[10px] text-slate-600 mb-1"
                                                          >
                                                              parsed value
                                                          </p>
                                                          <p
                                                              class="text-slate-100 mono text-[13px]"
                                                          >
                                                              ${smartDetails.parsedValue}
                                                          </p>
                                                      </div>
                                                  `}
                                        </div>
                                    `
                    : ''}

                              <!-- Parent Context Details (e.g. S Tag Aggregator) -->
                              ${smartDetails.parentSmartDetails
                    ? html`
                                        <div class="border-l border-white/10 pl-3">
                                            <p
                                                class="mono text-[10px] text-slate-600 mb-1"
                                            >
                                                parent context (${item.parentTag})
                                            </p>
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
                                                              class="bg-[#0b111c] rounded-md p-3 border border-white/5"
                                                          >
                                                              <p
                                                                  class="text-slate-100 mono text-[13px]"
                                                              >
                                                                  ${smartDetails
                                    .parentSmartDetails
                                    .parsedValue ||
                                smartDetails
                                    .parentSmartDetails
                                    .label}
                                                              </p>
                                                          </div>
                                                      `}
                                            </div>
                                        </div>
                                    `
                    : ''}
                          </div>
                      `
            : ''}

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
            <div class="flex flex-col h-full min-h-0 overflow-hidden bg-[#06090f]">
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
