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
        const playlistData = stream.mediaPlaylists?.get(variantId);
        if (playlistData?.rawManifest) {
            return playlistData.rawManifest;
        }
    }
    return stream.rawManifest || '';
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
    if (!streamA || !streamB) {
        return html`<p
            class="mono text-[11px] text-slate-600 p-8 text-center"
        >
            Select two streams to diff their manifests.
        </p>`;
    }

    if (streamA.protocol !== streamB.protocol) {
        return html`<div
            class="rounded-md border border-amber-400/25 bg-amber-500/5 p-4 m-4 max-w-xl"
        >
            <p class="text-[13px] font-medium text-amber-200 mb-1">
                Cross-protocol diff (${streamA.protocol} vs
                ${streamB.protocol})
            </p>
            <p class="text-xs text-slate-400 leading-relaxed">
                These manifests have different structures, so most lines
                will show as changed. Compare like with like for a useful
                diff.
            </p>
        </div>`;
    }

    const protocol = streamA.protocol === 'hls' ? 'hls' : 'dash';

    const rawA = getManifestText(streamA, variantIdA);
    const rawB = getManifestText(streamB, variantIdB);

    if (!rawA || !rawB) {
        const missing = !rawA ? streamA.name : streamB.name;
        return html`<div class="p-8 text-center">
            <p class="text-[13px] text-slate-300 mb-1">
                Manifest text unavailable for “${missing}”.
            </p>
            <p class="mono text-[11px] text-slate-600">
                The stream analyzed without retrievable manifest text.
            </p>
        </div>`;
    }

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
        <div class="h-full w-full flex flex-col min-h-0">
            <p class="mono text-[10px] text-slate-600 px-4 py-2 border-b border-white/5 shrink-0">
                ${changes} change${changes === 1 ? '' : 's'} · ${streamA.name} → ${streamB.name}
            </p>
            <div class="grow min-h-0">
                ${diffViewerTemplate(syntheticUpdate, protocol, {
                    showControls: true,
                    showHideDeletedControl: false,
                })}
            </div>
        </div>
    `;
};
