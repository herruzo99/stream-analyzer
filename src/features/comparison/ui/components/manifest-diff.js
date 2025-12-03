import { diffViewerTemplate } from '@/features/manifestUpdates/ui/components/diff-viewer';
import { diffManifest } from '@/ui/shared/diff';
import { html } from 'lit-html';
import xmlFormatter from 'xml-formatter';

/**
 * Normalizes manifest content for comparison.
 * Formats XML for DASH to ensure diffs are structural rather than whitespace-based.
 * @param {string} content
 * @param {'dash' | 'hls'} protocol
 */
function normalizeManifest(content, protocol) {
    if (!content) return '';
    if (protocol === 'dash') {
        try {
            return xmlFormatter(content, {
                indentation: '  ',
                collapseContent: true,
                lineSeparator: '\n',
            });
        } catch (e) {
            console.warn('Failed to format DASH XML for diff:', e);
            return content;
        }
    }
    // For HLS, we normalize line endings and trim empty lines
    return content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .join('\n');
}

/**
 * Helper to resolve the raw manifest text for a stream, optionally targeting a variant.
 * @param {import('@/types').Stream} stream
 * @param {string | null} variantId
 * @returns {string}
 */
function getManifestText(stream, variantId) {
    if (stream.protocol === 'hls' && variantId && variantId !== 'master') {
        const playlistData = stream.mediaPlaylists.get(variantId);
        if (playlistData) {
            return playlistData.rawManifest;
        }
    }
    return stream.rawManifest;
}

/**
 * Renders the manifest diff view.
 * @param {import('@/types').Stream} streamA Reference Stream
 * @param {import('@/types').Stream} streamB Candidate Stream
 * @param {string | null} [variantIdA=null] Variant for Stream A
 * @param {string | null} [variantIdB=null] Variant for Stream B
 */
export const manifestDiffTemplate = (
    streamA,
    streamB,
    variantIdA = null,
    variantIdB = null
) => {
    if (!streamA || !streamB) return html``;

    const protocol = streamA.protocol === 'hls' ? 'hls' : 'dash';

    const rawA = getManifestText(streamA, variantIdA);
    const rawB = getManifestText(streamB, variantIdB);

    // Normalize both inputs
    const normA = normalizeManifest(rawA, protocol);
    const normB = normalizeManifest(rawB, protocol);

    // Calculate Diff
    const { diffModel, changes } = diffManifest(normA, normB);

    // Construct a synthetic update object compatible with diffViewerTemplate
    const syntheticUpdate = {
        diffModel,
        changes,
        rawManifest: rawB, // For clipboard copy
        id: 'comparison-diff',
        timestamp: new Date().toISOString(),
        sequenceNumber: 0,
        complianceResults: [],
        hasNewIssues: false,
        serializedManifest: {},
        meta: { label: 'Comparison' },
    };

    return html`
        <div class="h-full w-full flex flex-col">
            <div
                class="grow min-h-0 relative bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner"
            >
                ${diffViewerTemplate(syntheticUpdate, protocol, {
                    showControls: true,
                })}
            </div>
        </div>
    `;
};
