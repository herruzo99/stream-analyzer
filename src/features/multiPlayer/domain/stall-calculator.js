/**
 * A stateful calculator for tracking player stalls efficiently.
 * Instead of recalculating from the entire history on each update, it processes only new entries.
 */
export class StallCalculator {
    constructor() {
        this.totalStalls = 0;
        this.totalStallDurationMs = 0;
        this.lastProcessedIndex = -1;
        this.isCurrentlyStalled = false;
        this.stallStartTime = 0;
    }

    /**
     * Updates the stall metrics with the latest state history from Shaka Player.
     * @param {{state: string, timestamp: number}[]} stateHistory - The player's state history array.
     * @returns {{totalStalls: number, totalStallDuration: number}} The updated metrics.
     */
    update(stateHistory) {
        if (!stateHistory || stateHistory.length === 0) {
            return {
                totalStalls: this.totalStalls,
                totalStallDuration: this.totalStallDurationMs / 1000,
            };
        }

        // Find the index of the first 'playing' state to establish a baseline.
        // We only care about stalls that happen after playback has started.
        const firstPlayIndex = stateHistory.findIndex(
            (s) => s.state === 'playing'
        );
        if (firstPlayIndex === -1) {
            return { totalStalls: 0, totalStallDuration: 0 };
        }

        // If we haven't processed anything yet, start from after the first play event.
        if (this.lastProcessedIndex === -1) {
            this.lastProcessedIndex = firstPlayIndex;
        }

        for (
            let i = this.lastProcessedIndex + 1;
            i < stateHistory.length;
            i++
        ) {
            const currentState = stateHistory[i];
            const prevState = stateHistory[i - 1];

            const wasStalled = prevState.state === 'buffering';
            const isStalled = currentState.state === 'buffering';

            // New stall event detected (transitioned from non-buffering to buffering)
            if (isStalled && !wasStalled) {
                this.totalStalls++;
                this.isCurrentlyStalled = true;
                this.stallStartTime = prevState.timestamp;
            }

            // Stall ended (transitioned from buffering to non-buffering)
            if (!isStalled && wasStalled) {
                this.totalStallDurationMs +=
                    currentState.timestamp - this.stallStartTime;
                this.isCurrentlyStalled = false;
            }
        }

        this.lastProcessedIndex = stateHistory.length - 1;

        return {
            totalStalls: this.totalStalls,
            totalStallDuration: this.totalStallDurationMs / 1000,
        };
    }

    /**
     * Resets the calculator to its initial state.
     */
    reset() {
        this.totalStalls = 0;
        this.totalStallDurationMs = 0;
        this.lastProcessedIndex = -1;
        this.isCurrentlyStalled = false;
        this.stallStartTime = 0;
    }
}
