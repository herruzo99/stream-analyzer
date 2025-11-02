import { html, render } from 'lit-html';
import { useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { eventBus } from '@/application/event-bus';

const placeholderTemplate = () => html`
    <div
        class="flex flex-col h-full items-center justify-center text-center text-slate-500 p-6"
    >
        ${icons.searchCode}
        <p class="mt-2 font-semibold">Hover for Details</p>
        <p class="text-sm">
            Move your cursor over a tag or attribute in the manifest to see its
            definition here. Click to pin it.
        </p>
    </div>
`;

const detailTemplate = (item, isSelected) => {
    if (!item) return placeholderTemplate();

    const handleClear = (e) => {
        e.stopPropagation();
        eventBus.dispatch('ui:interactive-manifest:clear-selection');
    };

    let title, subtitle;
    if (item.type === 'attribute') {
        [subtitle, title] = item.name.split('@');
    } else {
        title = item.name;
    }

    return html`
        <div class="p-4 space-y-4 text-sm">
            <div>
                <div
                    class="flex justify-between items-start gap-4"
                >
                     <div class="font-mono text-lg text-white break-all">
                        ${title}
                        ${subtitle ? html`<span class="block text-sm text-slate-400">on &lt;${subtitle}&gt;</span>` : ''}
                    </div>
                    ${isSelected
                        ? html`<button
                              @click=${handleClear}
                              class="text-slate-400 hover:text-white shrink-0"
                              title="Deselect"
                          >
                              ${icons.xCircle}
                          </button>`
                        : ''}
                </div>
                <div class="text-xs text-emerald-400 font-mono mt-1">
                    ${item.info.isoRef || 'N/A'}
                </div>
            </div>
            <p class="text-slate-300 leading-relaxed">${item.info.text}</p>
        </div>
    `;
};

export class InteractiveManifestSidebar extends HTMLElement {
    constructor() {
        super();
        this.unsubscribe = null;
    }

    connectedCallback() {
        this.render();
        this.unsubscribe = useUiStore.subscribe(() => this.render());
    }

    disconnectedCallback() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
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
            <div class="flex flex-col h-full">
                <div class="p-3 border-b border-slate-700 shrink-0">
                    <h4 class="font-bold text-slate-200">
                        ${isSelected ? 'Selected' : 'Hovered'} Element Details
                    </h4>
                </div>
                <div class="grow overflow-y-auto">
                    ${detailTemplate(itemToDisplay, isSelected)}
                </div>
            </div>
        `;
        render(template, this);
    }
}

customElements.define(
    'interactive-manifest-sidebar',
    InteractiveManifestSidebar
);