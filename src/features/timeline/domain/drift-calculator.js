/**
 * Calculates the drift from the live edge for a given stream.
 */
export class DriftCalculator {
    constructor() {
        this.history = new Map(); // streamId -> Array<{timestamp, drift}>
        this.maxHistory = 100;
    }

    /**
     * Calculates drift for a stream.
     * Drift = (Now - AvailabilityStartTime) - SegmentEndTime
     * Or simply: How far behind the "theoretical" live edge is the latest segment?
     *
     * @param {object} stream - The stream object.
     * @returns {number|null} Drift in seconds, or null if not applicable.
     */
    calculateDrift(stream) {
        if (!stream || stream.manifest?.type !== 'dynamic') return null;

        // Find the latest segment across all representations/variants
        let maxSegmentEndTime = 0;

        if (stream.protocol === 'dash') {
            for (const repState of stream.dashRepresentationState.values()) {
                if (repState.segments && repState.segments.length > 0) {
                    const lastSeg =
                        repState.segments[repState.segments.length - 1];
                    // DASH segments usually have absolute startTime if calculated correctly.
                    // availabilityStartTime is in manifest.
                    if (
                        lastSeg.startTime !== undefined &&
                        lastSeg.duration !== undefined
                    ) {
                        maxSegmentEndTime = Math.max(
                            maxSegmentEndTime,
                            lastSeg.startTime + lastSeg.duration
                        );
                    }
                }
            }
        } else if (stream.protocol === 'hls') {
            for (const variantState of stream.hlsVariantState.values()) {
                if (variantState.segments && variantState.segments.length > 0) {
                    const lastSeg =
                        variantState.segments[variantState.segments.length - 1];
                    // HLS segments might need programDateTime or similar.
                    // If programDateTime is available, we can compare to Date.now().
                    if (lastSeg.programDateTime) {
                        // Convert to seconds since epoch if needed, or keep as Date object comparison
                        // Let's assume we want drift in seconds.
                        const segEnd =
                            new Date(lastSeg.programDateTime).getTime() / 1000 +
                            lastSeg.duration;
                        maxSegmentEndTime = Math.max(maxSegmentEndTime, segEnd);
                    }
                }
            }
        }

        if (maxSegmentEndTime === 0) return null;

        // For DASH, maxSegmentEndTime is usually relative to AST.
        // So Live Edge = (Date.now() - AST) / 1000
        // Drift = Live Edge - maxSegmentEndTime

        let now = Date.now() / 1000;

        if (stream.protocol === 'dash') {
            const ast = stream.manifest.availabilityStartTime
                ? new Date(stream.manifest.availabilityStartTime).getTime() /
                  1000
                : 0;
            const theoreticalLiveEdge = now - ast;
            return Math.max(0, theoreticalLiveEdge - maxSegmentEndTime);
        } else {
            // HLS with Program Date Time
            // maxSegmentEndTime is absolute epoch seconds
            return Math.max(0, now - maxSegmentEndTime);
        }
    }

    update(stream) {
        const drift = this.calculateDrift(stream);
        if (drift !== null) {
            if (!this.history.has(stream.id)) {
                this.history.set(stream.id, []);
            }
            const streamHistory = this.history.get(stream.id);
            streamHistory.push({ timestamp: Date.now(), drift });
            if (streamHistory.length > this.maxHistory) {
                streamHistory.shift();
            }
        }
        return drift;
    }

    getHistory(streamId) {
        return this.history.get(streamId) || [];
    }
}

export const driftCalculator = new DriftCalculator();
