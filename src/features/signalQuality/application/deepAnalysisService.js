import { playerService } from '@/features/playerSimulation/application/playerService';
import { workerService } from '@/infrastructure/worker/workerService';
import { qualityActions } from '@/state/qualityStore';

class DeepAnalysisService {
    constructor() {
        this.abortController = null;
    }

    /**
     * Starts a Deep Scan on the current video element.
     * @param {number} durationSeconds - How long to scan.
     * @param {number} frameRate - Estimated frame rate (to calculate progress).
     */
    async startScan(durationSeconds, frameRate = 30) {
        const player = playerService.getPlayer();
        const videoEl = player?.getMediaElement();

        if (!videoEl || videoEl.paused) {
            alert('Please start playback before starting Deep Scan.');
            return;
        }

        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        const estimatedTotalFrames = Math.ceil(durationSeconds * frameRate);
        qualityActions.initDeepScan(estimatedTotalFrames);

        const startTime = Date.now();
        let framesProcessed = 0;

        const processFrame = async (now, metadata) => {
            if (signal.aborted) return;

            // Check time limit
            if ((Date.now() - startTime) / 1000 > durationSeconds) {
                this.stopScan();
                return;
            }

            try {
                // Capture High-Res Bitmap
                const bitmap = await createImageBitmap(videoEl);

                // Send to worker
                // We await the result to avoid flooding the worker memory,
                // effectively throttling capture to processing speed.
                const result = await workerService.postTask(
                    'analyze-frame-sequence',
                    {
                        frameBitmap: bitmap,
                        frameIndex: framesProcessed,
                        totalFrames: estimatedTotalFrames,
                        isLast: false,
                    }
                ).promise;

                qualityActions.updateDeepScanProgress({
                    ...result,
                    playheadTime: metadata.mediaTime,
                });

                framesProcessed++;

                // Schedule next frame
                if (!signal.aborted) {
                    videoEl.requestVideoFrameCallback(processFrame);
                }
            } catch (e) {
                console.error('Deep Scan Frame Error:', e);
                qualityActions.failDeepScan(e.message);
                this.stopScan();
            }
        };

        // Kickoff
        videoEl.requestVideoFrameCallback(processFrame);
    }

    stopScan() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        qualityActions.finishDeepScan();
    }
}

export const deepAnalysisService = new DeepAnalysisService();
