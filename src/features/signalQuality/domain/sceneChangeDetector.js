/**
 * SceneChangeDetector — histogram-based shot boundary detection for the
 * headless QC pipeline.
 *
 * Reconstructed for the port (referenced but never committed). Contract,
 * derived from `headlessAnalysisService` usage:
 *   new SceneChangeDetector({ threshold, fadeThreshold, minSceneGap,
 *                             maxChanges, useHistogram })
 *   detect(cleanBitmap, frameData, relativeTimestamp) →
 *     { diffScore, isSceneChange, sceneData: { type, confidence, timestamp } }
 * `frameData` is RGBA bytes (ImageData-style); `cleanBitmap` is accepted
 * for signature compatibility (callers manage its lifetime).
 */
const HIST_BINS = 4; // per channel -> 64 bins
const HIST_SIZE = HIST_BINS * HIST_BINS * HIST_BINS;
const TARGET_SAMPLES = 3072;

export class SceneChangeDetector {
    constructor({
        threshold = 0.3,
        fadeThreshold = 0.15,
        minSceneGap = 0.5,
        maxChanges = 500,
        useHistogram = true,
    } = {}) {
        this.threshold = threshold;
        this.fadeThreshold = fadeThreshold;
        this.minSceneGap = minSceneGap;
        this.maxChanges = maxChanges;
        this.useHistogram = useHistogram;
        this._prevHistogram = null;
        this._prevMean = 0;
        this._lastChangeAt = -Infinity;
        this._changes = [];
    }

    reset() {
        this._prevHistogram = null;
        this._prevMean = 0;
        this._lastChangeAt = -Infinity;
        this._changes = [];
    }

    _sample(frameData) {
        // Strided sampling keeps per-frame cost flat regardless of resolution.
        const step = Math.max(
            1,
            Math.floor(frameData.length / 4 / TARGET_SAMPLES)
        );
        const histogram = new Float32Array(HIST_SIZE);
        let luminanceSum = 0;
        let count = 0;
        const shift = 8 - Math.log2(HIST_BINS);
        for (let i = 0; i < frameData.length; i += step * 4) {
            const r = frameData[i] >> shift;
            const g = frameData[i + 1] >> shift;
            const b = frameData[i + 2] >> shift;
            histogram[(r * HIST_BINS + g) * HIST_BINS + b] += 1;
            luminanceSum +=
                0.2126 * frameData[i] +
                0.7152 * frameData[i + 1] +
                0.0722 * frameData[i + 2];
            count += 1;
        }
        if (count > 0) {
            for (let i = 0; i < HIST_SIZE; i += 1) histogram[i] /= count;
        }
        return { histogram, mean: count > 0 ? luminanceSum / count : 0 };
    }

    async detect(_cleanBitmap, frameData, relativeTimestamp = 0) {
        if (!frameData || frameData.length < 4) {
            return { diffScore: 0, isSceneChange: false, sceneData: null };
        }
        const { histogram, mean } = this._sample(frameData);
        let diffScore = 0;
        let fadeScore = 0;
        if (this._prevHistogram) {
            if (this.useHistogram) {
                let distance = 0;
                for (let i = 0; i < HIST_SIZE; i += 1) {
                    distance += Math.abs(histogram[i] - this._prevHistogram[i]);
                }
                diffScore = distance / 2;
            } else {
                diffScore = Math.min(
                    1,
                    Math.abs(mean - this._prevMean) / 255
                );
            }
            // A global brightness glide with little structural change is a fade.
            const brightnessShift =
                Math.abs(mean - this._prevMean) / 255;
            if (brightnessShift >= this.fadeThreshold && diffScore < this.threshold) {
                fadeScore = brightnessShift;
            }
        }
        this._prevHistogram = histogram;
        this._prevMean = mean;

        const gapOk =
            relativeTimestamp - this._lastChangeAt >= this.minSceneGap;
        const isCut = diffScore >= this.threshold && gapOk;
        const isFade = fadeScore > 0 && gapOk;
        const isSceneChange = isCut || isFade;
        let sceneData = null;
        if (isSceneChange) {
            this._lastChangeAt = relativeTimestamp;
            const confidence = Math.round(
                Math.min(
                    99,
                    Math.max(1, (isCut ? diffScore : fadeScore) * 100)
                )
            );
            sceneData = {
                type: isCut ? 'cut' : 'fade',
                confidence,
                timestamp: relativeTimestamp,
                diffScore,
            };
            this._changes.push(sceneData);
            if (this._changes.length > this.maxChanges) {
                this._changes.splice(0, this._changes.length - this.maxChanges);
            }
        }
        return { diffScore, isSceneChange, sceneData };
    }
}
