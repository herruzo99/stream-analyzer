import { html, render } from 'lit-html';
import { useUiStore } from '@/state/uiStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { dashManifestTemplate } from './components/dash/renderer.js';
import { hlsManifestTemplate } from './components/hls/renderer.js';
import { debugLog } from '@/shared/utils/debug';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { dashTooltipData } from './components/dash/tooltip-data.js';
import { hlsTooltipData } from './components/hls/tooltip-data.js';
import { isDebugMode } from '@/shared/utils/env';

let container = null;
let currentStreamId = null;
let uiUnsubscribe = null;
let analysisUnsubscribe = null;

function findDashMissingTooltips(serializedManifest) {
    const missing = [];
    const seen = new Set();
    const walk = (node, tagName) => {
        if (!node || typeof node !== 'object') return;
        if (!dashTooltipData[tagName] && !seen.has(tagName)) {
            missing.push({ type: 'Element', name: tagName });
            seen.add(tagName);
        }
        const attrs = node[':@'] || {};
        for (const attrName in attrs) {
            const attrKey = `${tagName}@${attrName}`;
            const isIgnored = [
                'xmlns',
                'xmlns:xsi',
                'xsi:schemaLocation',
            ].includes(attrName);
            if (!dashTooltipData[attrKey] && !isIgnored && !seen.has(attrKey)) {
                missing.push({ type: 'Attribute', name: attrKey });
                seen.add(attrKey);
            }
        }
        for (const childName in node) {
            if (childName === ':@' || childName === '#text') continue;
            const children = Array.isArray(node[childName])
                ? node[childName]
                : [node[childName]];
            children.forEach((childNode) => {
                walk(childNode, childName);
            });
        }
    };
    if (serializedManifest) {
        walk(serializedManifest, 'MPD');
    }
    return missing;
}

function findHlsMissingTooltips(serializedManifest) {
    const missing = [];
    const seen = new Set();
    const checkAttributes = (tagName, attributesObject) => {
        if (attributesObject && typeof attributesObject === 'object') {
            for (const attrName in attributesObject) {
                const attrKey = `${tagName}@${attrName}`;
                if (!hlsTooltipData[attrKey] && !seen.has(attrKey)) {
                    missing.push({ type: 'Attribute', name: attrKey });
                    seen.add(attrKey);
                }
            }
        }
    };
    (serializedManifest.tags || []).forEach((tag) => {
        const tagName = tag.name;
        if (!hlsTooltipData[tagName] && !seen.has(tagName)) {
            missing.push({ type: 'Tag', name: tagName });
            seen.add(tagName);
        }
        checkAttributes(tagName, tag.value);
    });
    (serializedManifest.media || []).forEach((mediaTag) => {
        checkAttributes('EXT-X-MEDIA', mediaTag);
    });
    (serializedManifest.variants || []).forEach((variant) => {
        checkAttributes('EXT-X-STREAM-INF', variant.attributes);
    });
    return missing;
}

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
        let manifestObjectForAnalysis = stream.manifest.serializedManifest;

        if (stream.protocol === 'hls' && stream.activeMediaPlaylistUrl) {
            const mediaPlaylist = stream.mediaPlaylists.get(
                stream.activeMediaPlaylistUrl
            );
            if (mediaPlaylist) {
                manifestToCopy = mediaPlaylist.rawManifest;
                manifestObjectForAnalysis =
                    mediaPlaylist.manifest.serializedManifest;
            }
        }

        let missing = [];
        if (stream.protocol === 'dash') {
            missing = findDashMissingTooltips(manifestObjectForAnalysis);
        } else if (stream.protocol === 'hls') {
            missing = findHlsMissingTooltips(manifestObjectForAnalysis);
        }

        const report =
            missing.length > 0
                ? missing.map((m) => `[${m.type}] ${m.name}`).join('\n')
                : 'No missing tooltips found.';
        const debugString = `--- MANIFEST ---\n${manifestToCopy}\n\n--- MISSING TOOLTIPS (${missing.length}) ---\n${report}`;
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
