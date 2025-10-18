import { html } from 'lit-html';
import { useUiStore } from '@/state/uiStore';
import { dashManifestTemplate } from './components/dash/renderer.js';
import { hlsManifestTemplate } from './components/hls/renderer.js';
import { debugLog } from '@/shared/utils/debug';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { dashTooltipData } from './components/dash/tooltip-data.js';
import { hlsTooltipData } from './components/hls/tooltip-data.js';
import { isDebugMode } from '@/shared/utils/env';

// --- New Functions for Debug Report ---

/**
 * Recursively walks a parsed DASH manifest object to find missing tooltip definitions.
 * @param {object} serializedManifest The root MPD element from fast-xml-parser.
 * @returns {{type: string, name: string}[]}
 */
function findDashMissingTooltips(serializedManifest) {
    const missing = [];
    const seen = new Set(); // To avoid duplicate reports for the same key

    const walk = (node, tagName) => {
        if (!node || typeof node !== 'object') return;

        // Check element tooltip
        if (!dashTooltipData[tagName] && !seen.has(tagName)) {
            missing.push({ type: 'Element', name: tagName });
            seen.add(tagName);
        }

        // Check attributes
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

        // Recurse into children
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

    walk(serializedManifest, 'MPD');
    return missing;
}

/**
 * Walks a parsed HLS manifest object to find missing tooltip definitions.
 * @param {object} serializedManifest The parsed HLS object from the hls-parser.
 * @returns {{type: string, name: string}[]}
 */
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

    // Check generic tags from the `tags` array
    (serializedManifest.tags || []).forEach((tag) => {
        const tagName = tag.name;
        if (!hlsTooltipData[tagName] && !seen.has(tagName)) {
            missing.push({ type: 'Tag', name: tagName });
            seen.add(tagName);
        }
        checkAttributes(tagName, tag.value);
    });

    // Check EXT-X-MEDIA tags from the `media` array
    (serializedManifest.media || []).forEach((mediaTag) => {
        // The tag name is constant here.
        checkAttributes('EXT-X-MEDIA', mediaTag);
    });

    // check EXT-X-STREAM-INF attributes which are stored under variants
    (serializedManifest.variants || []).forEach((variant) => {
        checkAttributes('EXT-X-STREAM-INF', variant.attributes);
    });

    return missing;
}

/**
 * Gathers manifest and missing tooltip data and copies it to the clipboard.
 * @param {import('@/types.ts').Stream} stream
 */
const handleDebugCopy = (stream) => {
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

/**
 * Dispatches to the correct manifest renderer based on stream protocol.
 * @param {import('@/types.ts').Stream} stream
 * @returns {import('lit-html').TemplateResult}
 */
export function getInteractiveManifestTemplate(stream) {
    debugLog(
        'InteractiveManifest',
        'getInteractiveManifestTemplate called.',
        'Stream valid:',
        !!stream,
        'Manifest valid:',
        !!stream?.manifest
    );

    if (!stream || !stream.manifest) {
        debugLog(
            'InteractiveManifest',
            'Render condition failed: No stream or manifest.'
        );
        return html`<p class="warn">No Manifest loaded to display.</p>`;
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

    const handleDebugCopyClick = () => {
        handleDebugCopy(stream);
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
                          @click=${handleDebugCopyClick}
                          class="bg-yellow-600 hover:bg-yellow-700 text-black font-bold text-xs py-1 px-3 rounded-md transition-colors"
                      >
                          Copy Debug Report
                      </button>`
                    : ''}
            </div>
        </div>
    `;

    debugLog(
        'InteractiveManifest',
        `Dispatching to ${stream.protocol.toUpperCase()} renderer.`
    );

    let contentTemplate;
    if (stream.protocol === 'hls') {
        contentTemplate = hlsManifestTemplate(
            stream,
            interactiveManifestCurrentPage
        );
    } else {
        // Default to DASH
        contentTemplate = dashManifestTemplate(
            stream,
            interactiveManifestCurrentPage
        );
    }

    return html`${headerTemplate} ${contentTemplate}`;
}