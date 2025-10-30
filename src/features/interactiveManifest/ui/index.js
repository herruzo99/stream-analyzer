import { html, render } from 'lit-html';
import { useUiStore } from '@/state/uiStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { dashManifestTemplate } from './components/dash/renderer.js';
import { hlsManifestTemplate } from './components/hls/renderer.js';
import { debugLog } from '@/shared/utils/debug';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { isDebugMode } from '@/shared/utils/env';
import { generateMissingTooltipsReport } from '@/features/parserCoverage/domain/tooltip-coverage-analyzer';

let container = null;
let currentStreamId = null;
let uiUnsubscribe = null;
let analysisUnsubscribe = null;

function renderInteractiveManifest() {
    if (!container || currentStreamId === null) return;

    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === currentStreamId);
    if (!stream || !stream.manifest) {
        render(
            html`<p class="warn">No Manifest loaded to display.</p>`,
            container
        );
        return;
    }

    const { interactiveManifestCurrentPage } = useUiStore.getState();

    const handleCopyClick = () => {
        let manifestToCopy = stream.rawManifest;
        if (stream.protocol === 'hls' && stream.activeMediaPlaylistUrl) {
            const mediaPlaylist = stream.mediaPlaylists.get(
                stream.activeMediaPlaylistUrl
            );
            if (mediaPlaylist) {
                manifestToCopy = mediaPlaylist.rawManifest;
            }
        }
        copyTextToClipboard(manifestToCopy, 'Manifest copied to clipboard!');
    };

    const handleDebugCopy = () => {
        let manifestToCopy = stream.rawManifest;
        if (stream.protocol === 'hls' && stream.activeMediaPlaylistUrl) {
            const mediaPlaylist = stream.mediaPlaylists.get(
                stream.activeMediaPlaylistUrl
            );
            if (mediaPlaylist) {
                manifestToCopy = mediaPlaylist.rawManifest;
            }
        }

        const report = generateMissingTooltipsReport(stream);
        const missingCount =
            report === 'No missing tooltips found.'
                ? 0
                : report.split('\n').length;

        const debugString = `--- MANIFEST ---\n${manifestToCopy}\n\n--- MISSING TOOLTIPS (${missingCount}) ---\n${report}`;
        copyTextToClipboard(debugString, 'Debug report copied to clipboard!');
    };

    const headerTemplate = html`
        <div class="flex justify-between items-center mb-2">
            <h3 class="text-xl font-bold">Interactive Manifest</h3>
            <div class="flex items-center gap-2">
                <button
                    @click=${handleCopyClick}
                    class="bg-gray-600 hover:bg-gray-700 text-white font-bold text-xs py-1 px-3 rounded-md transition-colors"
                >
                    Copy Manifest
                </button>
                ${isDebugMode
                    ? html`<button
                          @click=${handleDebugCopy}
                          class="bg-yellow-600 hover:bg-yellow-700 text-black font-bold text-xs py-1 px-3 rounded-md transition-colors"
                      >
                          Copy Debug Report
                      </button>`
                    : ''}
            </div>
        </div>
    `;

    let contentTemplate;
    if (stream.protocol === 'hls') {
        contentTemplate = hlsManifestTemplate(
            stream,
            interactiveManifestCurrentPage
        );
    } else {
        contentTemplate = dashManifestTemplate(
            stream,
            interactiveManifestCurrentPage
        );
    }

    render(html`${headerTemplate} ${contentTemplate}`, container);
}

export const interactiveManifestView = {
    mount(containerElement, { stream }) {
        container = containerElement;
        currentStreamId = stream.id;

        if (uiUnsubscribe) uiUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();

        uiUnsubscribe = useUiStore.subscribe(renderInteractiveManifest);
        analysisUnsubscribe = useAnalysisStore.subscribe(
            renderInteractiveManifest
        );

        renderInteractiveManifest();
    },
    unmount() {
        if (uiUnsubscribe) uiUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();
        uiUnsubscribe = null;
        analysisUnsubscribe = null;
        if (container) render(html``, container);
        container = null;
        currentStreamId = null;
    },
};