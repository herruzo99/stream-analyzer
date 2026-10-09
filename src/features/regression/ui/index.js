import { BaseView } from '@/ui/core/BaseView';
import { useAnalysisStore } from '@/state/analysisStore';
import { useTestSuiteStore } from '@/state/testSuiteStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import { html, render } from 'lit-html';
import { testRunnerTemplate } from './components/test-runner.js';
import { suiteLibrarySidebarTemplate } from './components/suite-library-sidebar.js';
import { suiteHeaderTemplate } from './components/suite-header.js';
import './components/test-suite-manager.js';

class RegressionView extends BaseView {
    constructor() {
        super();
        this.hasContextualSidebar = false; // We use SubNav instead
    }

    onMount() {
        // Subscribe to stores
        // We need AnalysisStore for the current stream
        this.subscribe(useAnalysisStore, () => {
            this.updateShell();
            this.render();
        });

        // We need TestSuiteStore for the suites data
        this.subscribe(useTestSuiteStore, () => {
            this.updateShell();
            this.render();
        });

        // BaseView handles generic UI store changes safely (filtering out shell updates).
        // We do NOT need to subscribe manually here, as it causes infinite recursion 
        // if we update shell in render().

        // Set up the Shell Layout initially
        this.updateShell();
        this.render();
    }

    onUnmount() {
        // BaseView cleans up subscriptions and shell slots automatically... 
        // BUT we need to be explicit about SubNav and TopBar if the next view doesn't overwrite them immediately,
        // although MainRenderer handles slot clearing for standard views.
        // Good practice to clear them if we "own" them.
        uiActions.setShellSlot('subNav', null);
        uiActions.setShellSlot('topBar', null);
    }

    updateShell() {
        const { streams, activeStreamId } = useAnalysisStore.getState();
        const stream = streams.find((s) => s.id === activeStreamId);

        // 1. SubNav: Test Suite Library
        // We want a slightly wider nav than default to fit names
        this.setShellConfig({ subNavWidth: '320px' });
        this.setShellSlot('subNav', suiteLibrarySidebarTemplate());

        // 2. TopBar: Suite Header (Contextual Actions)
        this.setShellSlot('topBar', suiteHeaderTemplate(stream), { padding: false });

        // 3. Main Padding: We want "floating" feel, so keep padding ON (default)
        // But if we want the "Full Glass" background to be handled by the layout-card inside TestRunner,
        // we might actually want padding=true to give it breathing room from the shell edges.
        this.setMainPadding(true);
    }

    renderWithStream(stream) {
        // The Main Slot Content
        // We wrapp it in a div that fills height for the internal scroll
        return html`
            <div class="h-full w-full animate-fadeIn">
                ${testRunnerTemplate(stream)}
            </div>
        `;
    }

    render() {
        if (!this.container) return;

        const { streams, activeStreamId } = useAnalysisStore.getState();
        const stream = streams.find((s) => s.id === activeStreamId);

        // Re-inject shell slots on render to ensure reactivity
        // (Optimization: modify components to handle their own reactivity internally, 
        // but for now re-rendering the template is fine as lit-html is efficient)
        // this.updateShell(); // REMOVED to prevent infinite recursion loop/side effects. Handled in subscriptions.

        if (!stream || !stream.manifest) {
            render(
                html`
                    <div class="flex flex-col items-center justify-center h-full text-[var(--text-on-A-secondary)] animate-fadeIn">
                        <div class="p-6 rounded-full bg-[var(--bg-glass-B-3)] mb-4">
                             <!-- Simple Icon Placeholders if icons not avail in scope, but we imported them in components -->
                             <span class="text-4xl opacity-50">?</span>
                        </div>
                        <p class="text-lg font-medium">No stream loaded.</p>
                        <p class="text-sm opacity-70">Select a stream to begin regression testing.</p>
                    </div>
                `,
                this.container
            );
            return;
        }

        render(this.renderWithStream(stream), this.container);
    }
}

export const regressionView = new RegressionView();
