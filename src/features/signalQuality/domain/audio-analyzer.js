/**
 * Advanced Audio Analyzer providing Real-time RMS, Peak, Phase, and Frequency data.
 */
export class AudioAnalyzer {
    constructor() {
        this.audioCtx = null;
        this.sourceNode = null;
        this.splitterNode = null;
        this.analyserL = null;
        this.analyserR = null;
        this.dataArrayL = null;
        this.dataArrayR = null;
        this.fftArrayL = null;

        this.isInitialized = false;
        this.rafId = null;
        this.callback = null;

        // Config
        this.fftSize = 2048;
        this.smoothingConstant = 0.8;
    }

    attach(mediaElement, onUpdate) {
        if (this.isInitialized) return;

        try {
            const AudioContext =
                window.AudioContext ||
                /** @type {any} */ (window).webkitAudioContext;
            this.audioCtx = new AudioContext();

            if (this.audioCtx.state === 'suspended') {
                const resume = () => {
                    this.audioCtx?.resume();
                    document.removeEventListener('click', resume);
                    document.removeEventListener('keydown', resume);
                };
                document.addEventListener('click', resume);
                document.addEventListener('keydown', resume);
            }

            this.sourceNode =
                this.audioCtx.createMediaElementSource(mediaElement);
            this.splitterNode = this.audioCtx.createChannelSplitter(2);

            this.analyserL = this.audioCtx.createAnalyser();
            this.analyserR = this.audioCtx.createAnalyser();

            this.analyserL.fftSize = this.fftSize;
            this.analyserR.fftSize = this.fftSize;
            this.analyserL.smoothingTimeConstant = this.smoothingConstant;
            this.analyserR.smoothingTimeConstant = this.smoothingConstant;

            this.sourceNode.connect(this.splitterNode);
            this.splitterNode.connect(this.analyserL, 0);
            this.splitterNode.connect(this.analyserR, 1);
            this.sourceNode.connect(this.audioCtx.destination);

            this.dataArrayL = new Float32Array(this.analyserL.fftSize);
            this.dataArrayR = new Float32Array(this.analyserR.fftSize);
            this.fftArrayL = new Uint8Array(this.analyserL.frequencyBinCount);

            this.callback = onUpdate;
            this.isInitialized = true;
            this._loop();
        } catch (e) {
            console.warn(
                '[AudioAnalyzer] Attach failed (CORS or already connected):',
                e
            );
            // Fallback for UI
            if (onUpdate) onUpdate(this._getSilence());
        }
    }

    detach() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        try {
            this.sourceNode?.disconnect();
            this.audioCtx?.close();
        } catch (_e) {
            /* ignore */
        }

        this.sourceNode = null;
        this.audioCtx = null;
        this.isInitialized = false;
    }

    _getSilence() {
        return {
            lLevel: -100,
            rLevel: -100,
            lPeak: -100,
            rPeak: -100,
            phase: 0,
            spectrum: new Uint8Array(0),
        };
    }

    _loop() {
        if (!this.isInitialized) return;

        // Time Domain (Waveform/Levels)
        this.analyserL.getFloatTimeDomainData(this.dataArrayL);
        this.analyserR.getFloatTimeDomainData(this.dataArrayR);

        // Frequency Domain (Spectrum) - Just using Left channel for visualization mix
        this.analyserL.getByteFrequencyData(this.fftArrayL);

        const { rms: rmsL, peak: peakL } = this._calculateMetrics(
            this.dataArrayL
        );
        const { rms: rmsR, peak: peakR } = this._calculateMetrics(
            this.dataArrayR
        );
        const phase = this._calculatePhaseCorrelation(
            this.dataArrayL,
            this.dataArrayR
        );

        this.callback({
            lLevel: this._toDb(rmsL),
            rLevel: this._toDb(rmsR),
            lPeak: this._toDb(peakL),
            rPeak: this._toDb(peakR),
            phase,
            spectrum: this.fftArrayL, // 0-255 Uint8 array
        });

        this.rafId = requestAnimationFrame(this._loop.bind(this));
    }

    _toDb(val) {
        return val > 0 ? 20 * Math.log10(val) : -100;
    }

    _calculateMetrics(buffer) {
        let sum = 0;
        let peak = 0;
        for (let i = 0; i < buffer.length; i++) {
            const val = Math.abs(buffer[i]);
            sum += val * val;
            if (val > peak) peak = val;
        }
        return {
            rms: Math.sqrt(sum / buffer.length),
            peak,
        };
    }

    _calculatePhaseCorrelation(left, right) {
        let sumXY = 0;
        let sumX2 = 0;
        let sumY2 = 0;
        // Downsample for performance (every 4th sample)
        for (let i = 0; i < left.length; i += 4) {
            const x = left[i];
            const y = right[i];
            sumXY += x * y;
            sumX2 += x * x;
            sumY2 += y * y;
        }
        const denominator = Math.sqrt(sumX2 * sumY2);
        if (denominator === 0) return 0;
        return sumXY / denominator;
    }
}
