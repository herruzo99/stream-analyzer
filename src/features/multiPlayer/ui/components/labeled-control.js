import { html, render } from 'lit-html';

export class LabeledControlComponent extends HTMLElement {
    constructor() {
        super();
        this.label = '';
        this.description = '';
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['label', 'description'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this[name] = newValue;
            this.render();
        }
    }

    connectedCallback() {
        this.render();
    }

    render() {
        const template = html`
            <style>
                /* Manually including Tailwind classes needed for this component's shadow DOM */
                .flex {
                    display: flex;
                }
                .flex-col {
                    flex-direction: column;
                }
                .sm:flex-row {
                    @media (min-width: 640px) {
                        flex-direction: row;
                    }
                }
                .sm:items-center {
                    @media (min-width: 640px) {
                        align-items: center;
                    }
                }
                .sm:justify-between {
                    @media (min-width: 640px) {
                        justify-content: space-between;
                    }
                }
                .gap-2 {
                    gap: 0.5rem;
                }
                .font-semibold {
                    font-weight: 600;
                }
                .text-gray-200 {
                    color: rgb(229 231 235);
                }
                .text-xs {
                    font-size: 0.75rem;
                    line-height: 1rem;
                }
                .text-gray-400 {
                    color: rgb(156 163 175);
                }
                .mt-1 {
                    margin-top: 0.25rem;
                }
                .shrink-0 {
                    flex-shrink: 0;
                }
                ::slotted(select) {
                    /* It's better to style slotted elements from outside, but for simplicity we add some basics here */
                    width: 100%;
                }
            </style>
            <div
                class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
                <div>
                    <label class="font-semibold text-gray-200"
                        >${this.label}</label
                    >
                    ${this.description
                        ? html`<p class="text-xs text-gray-400 mt-1">
                              ${this.description}
                          </p>`
                        : ''}
                </div>
                <div class="shrink-0">
                    <slot></slot>
                </div>
            </div>
        `;
        render(template, this.shadowRoot);
    }
}

if (!customElements.get('labeled-control-component')) {
    customElements.define('labeled-control-component', LabeledControlComponent);
}
