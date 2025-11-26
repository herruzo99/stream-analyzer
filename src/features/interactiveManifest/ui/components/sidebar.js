import { html, render } from 'lit-html';
import { useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { eventBus } from '@/application/event-bus';
import { renderSmartToken } from './smart-tokens.js';

const placeholderTemplate = () => html`
    <div
        class="flex flex-col h-full items-center justify-center text-center text-slate-500 p-8"
    >
        <div class="bg-slate-800/50 p-4 rounded-full mb-4 animate-pulse">
            ${icons.searchCode}
        </div>
        <p class="font-bold text-slate-300 text-lg">Inspector</p>
        <p class="text-sm mt-2 max-w-[200px]">
            Select any tag or attribute in the code view to see its definition
            and ISO standard reference.
        </p>
    </div>
`;

const detailTemplate = (item, isSelected) => {
    if (!item) return placeholderTemplate();

    const handleClear = (e) => {
        e.stopPropagation();
        eventBus.dispatch('ui:interactive-manifest:clear-selection');
    };

    let title, subtitle, attributeValue;
    if (item.type === 'attribute') {
        const parts = item.name.split('@');
        subtitle = parts[0];
        title = parts[1];

        // Try to parse the value from the element in the main view to pass it to smart token?
        // The item object from the store (hover/select) currently holds { type, name, info, path }.
        // It does NOT strictly hold the value. We need to find a way to get the value if we want the token here.
        // However, looking at renderer.js, 'handleInteraction' constructs the item.
        // It currently doesn't scrape the value.

        // UPDATE: To support smart tokens in sidebar, we need the value.
        // Since `handleInteraction` in index.js doesn't easily have access to the value without DOM scraping,
        // we can try to scrape it from the target element if it's available, OR we rely on the passed info.
        // Since we can't easily change index.js in this "Phase" without re-emitting it,
        // we will rely on a DOM lookup if the element is selected/hovered.

        // A cleaner way in this architecture: The sidebar doesn't know the value unless we passed it.
        // For now, we will attempt to find the DOM element to grab the value for the token.
        if (typeof document !== 'undefined') {
            const el = document.querySelector(`[data-path="${item.path}"]`);
            if (el) {
                // The renderer puts the value in a span with class text-amber-200
                const valSpan = el.querySelector('.text-amber-200');
                if (valSpan) {
                    attributeValue = valSpan.textContent.replace(/^"|"$/g, '');
                }
            }
        }
    } else {
        title = item.name;
    }

    const isoRef = item.info?.isoRef || 'Reference not available';
    const smartToken = attributeValue
        ? renderSmartToken(title, attributeValue)
        : null;

    return html`
        <div class="h-full flex flex-col animate-fadeIn bg-slate-900">
            <!-- Header -->
            <div
                class="p-6 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm shrink-0"
            >
                <div class="flex justify-between items-start mb-4">
                    <span
                        class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${item.type ===
                        'tag'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-emerald-500/20 text-emerald-300'}"
                    >
                        ${item.type}
                    </span>
                    ${isSelected
                        ? html`
                              <button
                                  @click=${handleClear}
                                  class="text-slate-500 hover:text-white transition-colors"
                              >
                                  ${icons.xCircle}
                              </button>
                          `
                        : ''}
                </div>

                <div class="flex items-center gap-3 mb-1">
                    <h2
                        class="text-2xl font-mono font-bold text-white break-all leading-tight"
                    >
                        ${title}
                    </h2>
                    ${smartToken
                        ? html`<div class="scale-125 origin-left">
                              ${smartToken}
                          </div>`
                        : ''}
                </div>

                ${subtitle
                    ? html`
                          <div
                              class="flex items-center gap-2 text-sm text-slate-400 mt-2"
                          >
                              <span>parent:</span>
                              <code
                                  class="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300 font-mono text-xs"
                                  >&lt;${subtitle}&gt;</code
                              >
                          </div>
                      `
                    : ''}
                ${attributeValue
                    ? html`
                          <div
                              class="mt-4 p-3 bg-slate-800/50 rounded border border-slate-700/50"
                          >
                              <span
                                  class="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1"
                                  >Value</span
                              >
                              <div
                                  class="font-mono text-amber-200 break-all text-sm"
                              >
                                  "${attributeValue}"
                              </div>
                          </div>
                      `
                    : ''}
            </div>

            <!-- Content -->
            <div class="p-6 space-y-6 overflow-y-auto grow min-h-0">
                <!-- Description -->
                <div>
                    <h4
                        class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
                    >
                        Description
                    </h4>
                    <p class="text-slate-300 leading-relaxed text-sm">
                        ${item.info?.text ||
                        'No description available for this element.'}
                    </p>
                </div>

                <!-- Reference -->
                <div
                    class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"
                >
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-blue-400">${icons.database}</span>
                        <h4
                            class="text-xs font-bold text-white uppercase tracking-wider"
                        >
                            Standard Reference
                        </h4>
                    </div>
                    <p class="font-mono text-xs text-blue-300">${isoRef}</p>
                </div>
            </div>
        </div>
    `;
};

export class InteractiveManifestSidebar extends HTMLElement {
    connectedCallback() {
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

        const template = html`
            <div
                class="h-full border-l border-slate-800 shadow-xl flex flex-col"
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
