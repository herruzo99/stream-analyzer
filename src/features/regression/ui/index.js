import { useAnalysisStore } from '@/state/analysisStore';
import { useTestSuiteStore } from '@/state/testSuiteStore';
import { html, render } from 'lit-html';
import { testRunnerTemplate } from './components/test-runner.js';
import './components/test-suite-manager.js';

let container = null;
let currentStreamId = null;
let analysisUnsubscribe = null;
let testSuiteUnsubscribe = null;

function renderRegressionView() {
    if (!container) return;

    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === currentStreamId);

    if (!stream || !stream.manifest) {
        render(
            html`<div class="text-slate-500 p-8 text-center">
                No stream loaded.
            </div>`,
            container
        );
        return;
    }

    const template = html`
        <div class="h-full flex flex-col animate-fadeIn">
            ${testRunnerTemplate(stream)}
        </div>
    `;

    render(template, container);
}

export const regressionView = {
    mount(containerElement, { stream }) {
        container = containerElement;
        currentStreamId = stream.id;

        if (analysisUnsubscribe) analysisUnsubscribe();
        if (testSuiteUnsubscribe) testSuiteUnsubscribe();

        analysisUnsubscribe = useAnalysisStore.subscribe(renderRegressionView);
        testSuiteUnsubscribe =
            useTestSuiteStore.subscribe(renderRegressionView);

        renderRegressionView();
    },
    unmount() {
        if (analysisUnsubscribe) analysisUnsubscribe();
        if (testSuiteUnsubscribe) testSuiteUnsubscribe();

        analysisUnsubscribe = null;
        testSuiteUnsubscribe = null;
        container = null;
        currentStreamId = null;
    },
};