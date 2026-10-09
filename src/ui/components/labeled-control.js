import { html, render } from 'lit-html';

// Define static styles once
const componentStyles = new CSSStyleSheet();
componentStyles.replaceSync(`
    /* Manually including Tailwind classes needed for this component's shadow DOM */
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .sm\\:flex-row {
        @media (min-width: 640px) { flex-direction: row; }
    }
    .sm\\:items-center {
        @media (min-width: 640px) { align-items: center; }
    }
    .sm\\:justify-between {
        @media (min-width: 640px) { justify-content: space-between; }
    }
    .gap-2 { gap: 0.5rem; }
    .font-semibold { font-weight: 600; }
    .text-main { color: #f1f5f9; }
    .text-xs { font-size: 0.75rem; line-height: 1rem; }
    .text-muted { color: #94a3b8; }
    .mt-1 { margin-top: 0.25rem; }
    .shrink-0 { flex-shrink: 0; }
    ::slotted(select) { width: 100%; }
`);

export class LabeledControlComponent extends HTMLElement {
    constructor() {
        super();
        this.label = '';
        this.description = '';
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.adoptedStyleSheets = [componentStyles];
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
            <div
                class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
                <div>
                    <label class="font-semibold text-main">${this.label}</label>
                    ${this.description
                ? html`<p class="text-xs text-muted mt-1">
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
