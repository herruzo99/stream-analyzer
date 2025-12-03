/**
 * Checks for gaps and overlaps between segments in a timeline.
 */
export const gapOverlapRule = {
    id: 'SEG-GAP-OVERLAP',
    text: 'Segment Continuity Check',
    severity: 'warn',
    scope: 'Representation', // We'll reuse this scope for both protocols conceptually
    profiles: ['common'],
    isoRef: 'N/A',
    category: 'Timeline Integrity',
    failDetails: (element, context) => {
        return context.gapOverlapIssues || 'Issues found in segment timeline.';
    },
    passDetails: 'Segment timeline is continuous.',
    check: (element, context) => {
        let segments = [];

        if (context.protocol === 'dash') {
            // DASH: Look up segments in segmentsByCompositeKey
            // element is the Representation object from serializedManifest
            // We need to construct the key.
            // The key format in analysisHandler is `${period.id ?? periodIndex}-${rep.id}`
            // context.periodIndex and context.periodId should be available if we pass them?
            // engine.js iterates Period -> AdaptationSet -> Representation.
            // But engine.js doesn't pass periodIndex to Representation check currently?
            // We might need to rely on `element.id` if unique, or pass more context.

            // Actually, let's look at engine.js again.
            // It passes `periodContext` which has `period`.
            // But we need the composite key used in analysisHandler.

            if (context.segmentsByCompositeKey) {
                // Try to find the matching segments.
                // This is tricky without exact key match.
                // Let's assume we can find it by Rep ID for now, or we need to improve engine.js to pass the key.

                // Alternative: Iterate all keys and find the one ending with this Rep ID?
                // Risky if Rep IDs are not unique across periods.

                // If periodId is missing, we might need periodIndex.
                // engine.js: findChildren(mpd, 'Period').forEach((period, periodIndex) => ...
                // It passes `period` to context.

                // Let's try to construct the key if we have enough info.
                // But `segmentsByCompositeKey` keys are created in `segment-parser.js`.
                // Let's check `segment-parser.js` later if needed.

                // For now, let's assume we can get segments.
                const key = Object.keys(context.segmentsByCompositeKey).find(
                    (k) => k.endsWith(`-${element.id}`)
                );
                if (key) {
                    segments =
                        context.segmentsByCompositeKey[key]?.segments || [];
                }
            }
        } else if (context.protocol === 'hls') {
            // HLS: element is a Variant (from engine.js iteration)
            // context.mediaPlaylists is a Map<variantId, { manifest: { segments: [] } }>
            if (context.mediaPlaylists) {
                // element.id is the variant ID in HLS IR (usually)
                // In engine.js: (manifestIR.variants || []).forEach((variant, index) => ...
                // The variant object in IR might not have the ID used in the map?
                // In analysisHandler: `mediaPlaylists.set(variantId, ...)`
                // And `variantId` comes from `rep.id`.

                // Let's assume element.id matches.
                const playlistData = context.mediaPlaylists.get(element.id);
                if (playlistData) {
                    segments = playlistData.manifest.segments || [];
                }
            }
        }

        if (!segments || segments.length === 0) return 'skip';

        const issues = [];
        const TOLERANCE = 0.1; // 100ms

        for (let i = 1; i < segments.length; i++) {
            const prev = segments[i - 1];
            const curr = segments[i];

            // HLS segments might not have absolute start/end times if not calculated?
            // But our parsers usually calculate them.

            const expectedStart = prev.startTime + prev.duration;
            const actualStart = curr.startTime;
            const diff = actualStart - expectedStart;

            if (diff > TOLERANCE) {
                issues.push(
                    `Gap of ${diff.toFixed(3)}s at segment ${curr.uniqueId} (Time: ${actualStart.toFixed(2)})`
                );
            } else if (diff < -TOLERANCE) {
                issues.push(
                    `Overlap of ${Math.abs(diff).toFixed(3)}s at segment ${curr.uniqueId} (Time: ${actualStart.toFixed(2)})`
                );
            }

            if (issues.length > 5) {
                issues.push('...and more');
                break;
            }
        }

        if (issues.length > 0) {
            context.gapOverlapIssues = issues.join('; ');
            return false;
        }

        return true;
    },
};
