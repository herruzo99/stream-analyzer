import { useUiStore } from '@/state/uiStore';
import { html, render } from 'lit-html';

class AmbientBackground extends HTMLElement {
    constructor() {
        super();
        this.unsubscribe = null;
    }

    connectedCallback() {
        this.style.display = 'contents';
        this.unsubscribe = useUiStore.subscribe(() => this.render());
        this.render();
    }

    disconnectedCallback() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }

    render() {
        const { ambientBackground } = useUiStore.getState();

        if (!ambientBackground.enabled) {
            render(html``, this);
            return;
        }

        // We use a fixed generic implementation that uses CSS variables
        // This allows it to adapt to themes automatically (primary/secondary/tertiary accents)
        const template = html`
            <div class="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <!-- Blob 1: Top-Left (Primary) -->
                <div
                    class="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--bg-ambient-accent-primary)] opacity-30 blur-[150px] animate-pulse-slow will-change-transform"
                ></div>

                <!-- Blob 2: Bottom-Right (Secondary) -->
                <div
                    class="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--bg-ambient-accent-secondary)] opacity-30 blur-[150px] animate-pulse-slow will-change-transform"
                    style="animation-delay: 5s;"
                ></div>

                <!-- Blob 3: Top-Rightish (Tertiary) -->
                <div
                    class="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--bg-ambient-accent-tertiary)] opacity-30 blur-[150px] animate-pulse-slow will-change-transform"
                    style="animation-delay: 2.5s;"
                ></div>

                <!-- Grid Overlay (Subtle global texture) -->
                <div
                    class="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-[0.02] mix-blend-overlay"
                ></div>
            </div>
        `;

        render(template, this);
    }
}

customElements.define('ambient-background', AmbientBackground);
