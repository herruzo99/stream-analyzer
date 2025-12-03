import { useAnalysisStore } from '@/state/analysisStore';
import { useDecryptionStore } from '@/state/decryptionStore';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { useNetworkStore } from '@/state/networkStore';
import { usePlayerStore } from '@/state/playerStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { settingsActions } from '@/state/settingsStore';

const WARNING_THRESHOLD_BYTES = 500 * 1024 * 1024; // 500 MB
const CRITICAL_THRESHOLD_BYTES = 800 * 1024 * 1024; // 800 MB
const MONITOR_INTERVAL_MS = 5000;

export class MemoryService {
    constructor() {
        this.monitorInterval = null;
    }

    _detectBrowser() {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('firefox')) return 'Firefox';
        if (ua.includes('edg/')) return 'Edge';
        if (ua.includes('chrome')) return 'Chrome';
        if (ua.includes('safari')) return 'Safari';
        return 'Unknown Browser';
    }

    /**
     * estimates the size of a string or buffer in bytes.
     */
    _getSize(obj) {
        if (!obj) return 0;
        if (typeof obj === 'string') return obj.length * 2; // Approx 2 bytes per char in JS VM
        if (obj instanceof ArrayBuffer) return obj.byteLength;
        if (ArrayBuffer.isView(obj)) return obj.byteLength;
        if (typeof obj === 'number') return 8;
        if (typeof obj === 'boolean') return 4;
        return 0;
    }

    /**
     * Detailed footprint calculation for streams.
     */
    _calculateStreamFootprint(stream) {
        let rawSize = 0;
        let astSize = 0;
        let historySize = 0;
        let stateSize = 0;

        // 1. Main Manifests (Raw Text)
        rawSize += this._getSize(stream.rawManifest);
        rawSize += this._getSize(stream.patchedRawManifest);

        // 2. Parsed Manifests (AST Overhead)
        // Heuristic: Parsed objects are ~4x the size of raw text
        if (stream.rawManifest) astSize += stream.rawManifest.length * 4;

        // 3. Updates History
        if (stream.manifestUpdates) {
            stream.manifestUpdates.forEach((update) => {
                historySize += this._getSize(update.rawManifest);
                if (update.diffModel)
                    historySize += update.diffModel.length * 100;
                if (update.serializedManifest) {
                    const baseLen = update.rawManifest
                        ? update.rawManifest.length
                        : 5000;
                    historySize += baseLen * 4;
                }
            });
        }

        // 4. HLS Media Playlists
        if (stream.mediaPlaylists) {
            stream.mediaPlaylists.forEach((playlist) => {
                rawSize += this._getSize(playlist.rawManifest);
                if (playlist.rawManifest)
                    astSize += playlist.rawManifest.length * 4;

                if (playlist.updates) {
                    playlist.updates.forEach((update) => {
                        historySize += this._getSize(update.rawManifest);
                        if (update.diffModel)
                            historySize += update.diffModel.length * 100;
                        if (update.serializedManifest) {
                            const baseLen = update.rawManifest
                                ? update.rawManifest.length
                                : 5000;
                            historySize += baseLen * 4;
                        }
                    });
                }
            });
        }

        // 5. State Maps (Segments metadata)
        const calcState = (map) => {
            if (!map) return 0;
            let size = 0;
            map.forEach((state) => {
                if (state.segments) size += state.segments.length * 250; // Metadata overhead
            });
            return size;
        };

        stateSize += calcState(stream.dashRepresentationState);
        stateSize += calcState(stream.hlsVariantState);

        return { rawSize, astSize, historySize, stateSize };
    }

    startMonitoring() {
        if (this.monitorInterval) return;
        this._checkHealth();
        this.monitorInterval = setInterval(
            () => this._checkHealth(),
            MONITOR_INTERVAL_MS
        );
    }

    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
    }

    _checkHealth() {
        const stats = this.getStats();
        let status = 'nominal';
        let message = null;

        // 1. Browser Heap Check
        if (stats.browser) {
            const used = stats.browser.usedJSHeapSize;
            const limit = stats.browser.jsHeapSizeLimit;
            const ratio = used / limit;

            if (ratio > 0.85) {
                status = 'critical';
                message = 'Browser heap critically full (>85%).';
            } else if (ratio > 0.7) {
                status = 'warning';
                message = 'High memory usage detected (>70%).';
            }
        }

        // 2. App Data Check
        if (status === 'nominal') {
            const totalBytes = stats.app.totalBytes;
            if (totalBytes > CRITICAL_THRESHOLD_BYTES) {
                status = 'critical';
                message = 'Application data exceeds 800MB.';
            } else if (totalBytes > WARNING_THRESHOLD_BYTES) {
                status = 'warning';
                message = 'Application data exceeds 500MB.';
            }
        }

        settingsActions.setSystemHealth(status, message);
    }

    /**
     * Collects memory usage statistics from all application stores.
     */
    getStats() {
        // Fix TS2339: Cast window.performance to any to access non-standard 'memory' property
        const perfMemory = /** @type {any} */ (window.performance)?.memory;

        const browserStats = perfMemory
            ? {
                  usedJSHeapSize: perfMemory.usedJSHeapSize,
                  totalJSHeapSize: perfMemory.totalJSHeapSize,
                  jsHeapSizeLimit: perfMemory.jsHeapSizeLimit,
              }
            : null;

        // --- Breakdown Categories ---
        let breakdown = {
            mediaBuffers: 0, // Raw ArrayBuffers (Video/Audio)
            parsedStructs: 0, // Parsed Box Trees / Objects
            networkBodies: 0, // HTTP Response Bodies
            manifestRaw: 0, // Manifest Strings
            manifestAst: 0, // Manifest Objects
            historyDiffs: 0, // Updates & Diffs
            logs: 0, // Text logs
        };

        // 1. Segment Cache
        const segmentStore = useSegmentCacheStore.getState();
        let segmentCount = 0;
        let segmentBytes = 0;

        if (segmentStore.cache && segmentStore.cache.cache) {
            segmentStore.cache.cache.forEach((entry) => {
                segmentCount++;
                const rawSize = this._getSize(entry.data);
                breakdown.mediaBuffers += rawSize;
                segmentBytes += rawSize;

                if (entry.parsedData) {
                    // Heuristic: Parsed structure overhead
                    const structSize = entry.data ? rawSize * 0.5 : 50000;
                    breakdown.parsedStructs += structSize;
                    segmentBytes += structSize;
                }
            });
        }

        // 2. Network Store
        const networkStore = useNetworkStore.getState();
        let networkBytes = 0;
        networkStore.events.forEach((e) => {
            const metaSize = 500; // Event overhead
            let bodySize = 0;
            if (e.request?.body) bodySize += this._getSize(e.request.body);
            if (e.response?.body) bodySize += this._getSize(e.response.body);

            breakdown.networkBodies += bodySize;
            breakdown.logs += metaSize;
            networkBytes += metaSize + bodySize;
        });

        // 3. Manifests & Analysis
        const analysisStore = useAnalysisStore.getState();
        let manifestBytes = 0;
        analysisStore.streams.forEach((s) => {
            const footprint = this._calculateStreamFootprint(s);
            breakdown.manifestRaw += footprint.rawSize;
            breakdown.manifestAst += footprint.astSize;
            breakdown.historyDiffs += footprint.historySize;
            breakdown.parsedStructs += footprint.stateSize; // Segment metadata counts as struct

            manifestBytes +=
                footprint.rawSize +
                footprint.astSize +
                footprint.historySize +
                footprint.stateSize;
        });

        // 4. Logs
        const playerStore = usePlayerStore.getState();
        const multiPlayerStore = useMultiPlayerStore.getState();
        const logSize =
            (playerStore.eventLog.length + multiPlayerStore.eventLog.length) *
            500;
        breakdown.logs += logSize;

        const totalBytes =
            segmentBytes + networkBytes + manifestBytes + logSize;

        return {
            meta: {
                browserName: this._detectBrowser(),
            },
            browser: browserStats,
            app: {
                segments: { count: segmentCount, bytes: segmentBytes },
                network: {
                    count: networkStore.events.length,
                    bytes: networkBytes,
                },
                manifests: {
                    count: analysisStore.streams.length,
                    bytes: manifestBytes,
                },
                logs: { count: 0, bytes: logSize }, // Generic logs
                totalBytes,
                breakdown, // Granular breakdown
            },
        };
    }

    clearNetwork() {
        useNetworkStore.getState().clearEvents();
    }
    clearSegments() {
        useSegmentCacheStore.getState().clear();
    }
    clearDecryption() {
        useDecryptionStore.getState().clearCache();
    }

    flushAll() {
        this.clearNetwork();
        this.clearSegments();
        this.clearDecryption();
        usePlayerStore.getState().logEvent({
            timestamp: new Date().toLocaleTimeString(),
            type: 'lifecycle',
            details: 'Memory flushed by user.',
        });
        this._checkHealth();
    }
}

export const memoryService = new MemoryService();
