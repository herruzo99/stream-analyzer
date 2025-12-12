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
        
        // High-pass filter state for simple weighting
        this.filterState = { x1L: 0, x1R: 0, y1L: 0, y1R: 0 };
    }

    attach(mediaElement, onUpdate) {
        if (this.isInitialized) return;

        try {
            const AudioContext =
                window.AudioContext ||
                /** @type {any} */ (window).webkitAudioContext;
            
            // ARCHITECTURAL FIX: Check if AudioContext is allowed before creating
            // Actually, we must create it to check state, but we can handle the warning
            // by not logging it ourselves, though browser logs are inevitable.
            // We optimize by only creating it if mediaElement is playing or about to.
            
            this.audioCtx = new AudioContext();

            // Handle Autoplay Policy
            if (this.audioCtx.state === 'suspended') {
                // We attach a one-time listener to resume context on interaction
                const resumeContext = () => {
                    if (this.audioCtx && this.audioCtx.state === 'suspended') {
                        this.audioCtx.resume();
                    }
                    window.removeEventListener('click', resumeContext);
                    window.removeEventListener('keydown', resumeContext);
                };
                window.addEventListener('click', resumeContext);
                window.addEventListener('keydown', resumeContext);
                
                // Also try immediately (e.g. if already inside a click handler)
                this.audioCtx.resume().catch(() => {
                    // Expected if no user interaction yet
                    console.debug('[AudioAnalyzer] Context suspended. Waiting for interaction.');
                });
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
            // Provide silence callback so UI doesn't freeze
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

        // Safety check if context became invalid or closed
        if (!this.audioCtx || this.audioCtx.state === 'closed') {
             this.detach();
             return;
        }

        this.analyserL.getFloatTimeDomainData(this.dataArrayL);
        this.analyserR.getFloatTimeDomainData(this.dataArrayR);
        this.analyserL.getByteFrequencyData(this.fftArrayL);

        // Apply basic high-pass weighting (approximate K-weighting pre-filter)
        // to ignore DC offset and very low rumble
        this._applyWeighting(this.dataArrayL, 'L');
        this._applyWeighting(this.dataArrayR, 'R');

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

        if (this.callback) {
            this.callback({
                lLevel: this._toDb(rmsL),
                rLevel: this._toDb(rmsR),
                lPeak: this._toDb(peakL),
                rPeak: this._toDb(peakR),
                phase,
                spectrum: this.fftArrayL,
            });
        }

        this.rafId = requestAnimationFrame(this._loop.bind(this));
    }

    /**
     * Simple IIR High-pass filter (approx 100Hz cut) to remove DC bias/rumble
     * for better level metering.
     */
    _applyWeighting(buffer, channel) {
        const alpha = 0.9; 
        let prevX = channel === 'L' ? this.filterState.x1L : this.filterState.x1R;
        let prevY = channel === 'L' ? this.filterState.y1L : this.filterState.y1R;

        for(let i=0; i<buffer.length; i++) {
            const x = buffer[i];
            const y = alpha * (prevY + x - prevX);
            buffer[i] = y;
            prevX = x;
            prevY = y;
        }

        if (channel === 'L') {
            this.filterState.x1L = prevX;
            this.filterState.y1L = prevY;
        } else {
            this.filterState.x1R = prevX;
            this.filterState.y1R = prevY;
        }
    }

    _toDb(val) {
        return val > 0.00001 ? 20 * Math.log10(val) : -100;
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
        // Downsample stride 4
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