/**
 * High-Performance Video Scope Renderer.
 * Supports: Luma Waveform, Chroma Vectorscope, RGB Parade, RGB Histogram.
 */
export class VideoScopeRenderer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.rafId = null;
        this.videoEl = null;

        // Processing Resolution (Lower = Faster, Higher = More Detail)
        this.procW = 320;
        this.procH = 180;

        this.procCanvas = document.createElement('canvas');
        this.procCanvas.width = this.procW;
        this.procCanvas.height = this.procH;
        this.procCtx = this.procCanvas.getContext('2d', {
            willReadFrequently: true,
        });

        this.isActive = false;

        // Configuration Flags
        this.config = {
            showWaveform: true,
            showVectorscope: true,
            showParade: false,
            showHistogram: false,
        };
    }

    attach(videoElement, targetCanvas) {
        this.videoEl = videoElement;
        this.canvas = targetCanvas;
        this.ctx = this.canvas.getContext('2d');
        this.isActive = true;
        this._loop();
    }

    detach() {
        this.isActive = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.videoEl = null;
    }

    setMode(config) {
        this.config = { ...this.config, ...config };
    }

    _loop() {
        if (!this.isActive || !this.videoEl || !this.ctx) return;

        if (
            this.videoEl.paused ||
            this.videoEl.ended ||
            this.videoEl.readyState < 2
        ) {
            // console.log('[VideoScopeRenderer] Waiting...', { paused: this.videoEl.paused, readyState: this.videoEl.readyState });
            this.rafId = requestAnimationFrame(this._loop.bind(this));
            return;
        }

        try {
            this.procCtx.drawImage(this.videoEl, 0, 0, this.procW, this.procH);
            const frame = this.procCtx.getImageData(
                0,
                0,
                this.procW,
                this.procH
            );
            const data = frame.data;

            const outW = this.canvas.width;
            const outH = this.canvas.height;

            // Clear
            this.ctx.fillStyle = '#020617'; // Slate-950
            this.ctx.fillRect(0, 0, outW, outH);

            // --- Dynamic Grid Layout ---
            const activeScopes = [];
            if (this.config.showWaveform) activeScopes.push('waveform');
            if (this.config.showParade) activeScopes.push('parade');
            if (this.config.showVectorscope) activeScopes.push('vectorscope');
            if (this.config.showHistogram) activeScopes.push('histogram');

            if (activeScopes.length === 0) {
                this.rafId = requestAnimationFrame(this._loop.bind(this));
                return;
            }

            // Calculate Grid
            // 1 scope: 100% width
            // 2 scopes: 50% width each
            // 3-4 scopes: 2x2 grid

            let cols = activeScopes.length;
            let rows = 1;

            if (activeScopes.length > 2) {
                cols = 2;
                rows = 2;
            }

            const cellW = outW / cols;
            const cellH = outH / rows;

            activeScopes.forEach((scope, index) => {
                const col = index % cols;
                const row = Math.floor(index / cols);
                const x = col * cellW;
                const y = row * cellH;

                this.ctx.save();

                // Clip area
                this.ctx.beginPath();
                this.ctx.rect(x, y, cellW, cellH);
                this.ctx.clip();

                // Background for scope area
                this.ctx.fillStyle = '#000000';
                this.ctx.fillRect(x, y, cellW, cellH);

                if (scope === 'waveform')
                    this._renderWaveform(data, x, y, cellW, cellH);
                else if (scope === 'parade')
                    this._renderParade(data, x, y, cellW, cellH);
                else if (scope === 'vectorscope')
                    this._renderVectorscope(data, x, y, cellW, cellH);
                else if (scope === 'histogram')
                    this._renderHistogram(data, x, y, cellW, cellH);

                // Borders
                this.ctx.strokeStyle = '#334155';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(x, y, cellW, cellH);

                // Label
                this.ctx.fillStyle = '#64748b';
                this.ctx.font = 'bold 10px sans-serif';
                this.ctx.textBaseline = 'top';
                this.ctx.fillText(scope.toUpperCase(), x + 6, y + 6);

                this.ctx.restore();
            });
        } catch (e) {
            if (e.name === 'SecurityError') {
                this._renderError('DRM LOCKED / CORS ERROR');
            }
        }

        this.rafId = requestAnimationFrame(this._loop.bind(this));
    }

    _renderError(msg) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, w, h);
        this.ctx.fillStyle = '#ef4444';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(msg, w / 2, h / 2);
        this.isActive = false;
    }

    _renderWaveform(data, x, y, w, h) {
        // Graticule lines
        this.ctx.strokeStyle = '#334155';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        // 0, 25, 50, 75, 100 lines
        for (let i = 0; i <= 4; i++) {
            const ly = y + h - i * 0.25 * h;
            this.ctx.moveTo(x, ly);
            this.ctx.lineTo(x + w, ly);
        }
        this.ctx.stroke();

        const traceCvs = document.createElement('canvas');
        traceCvs.width = this.procW;
        traceCvs.height = 256;
        const traceCtx = traceCvs.getContext('2d');
        const traceImg = traceCtx.createImageData(this.procW, 256);
        const tData = traceImg.data;

        const step = 2;
        for (let col = 0; col < this.procW; col += 1) {
            for (let row = 0; row < this.procH; row += step) {
                const i = (row * this.procW + col) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const luma = Math.floor(0.2126 * r + 0.7152 * g + 0.0722 * b);
                const yPos = 255 - luma;

                const idx = (yPos * this.procW + col) * 4;

                // Additive Green
                const alpha = tData[idx + 3];
                if (alpha < 255) {
                    tData[idx] = 0;
                    tData[idx + 1] = 255;
                    tData[idx + 2] = 100;
                    tData[idx + 3] = Math.min(255, alpha + 50);
                }
            }
        }
        traceCtx.putImageData(traceImg, 0, 0);
        this.ctx.globalCompositeOperation = 'screen';
        this.ctx.drawImage(traceCvs, x, y, w, h);
        this.ctx.globalCompositeOperation = 'source-over';
    }

    _renderParade(data, x, y, w, h) {
        const subW = w / 3;
        const traceCvs = document.createElement('canvas');
        traceCvs.width = this.procW;
        traceCvs.height = 256;
        const traceCtx = traceCvs.getContext('2d');

        const drawChannel = (offsetIdx, colorArr) => {
            const img = traceCtx.createImageData(this.procW, 256);
            const d = img.data;
            for (let col = 0; col < this.procW; col += 1) {
                for (let row = 0; row < this.procH; row += 2) {
                    const i = (row * this.procW + col) * 4;
                    const val = data[i + offsetIdx];
                    const yPos = 255 - val;
                    const idx = (yPos * this.procW + col) * 4;
                    const alpha = d[idx + 3];
                    if (alpha < 255) {
                        d[idx] = colorArr[0];
                        d[idx + 1] = colorArr[1];
                        d[idx + 2] = colorArr[2];
                        d[idx + 3] = Math.min(255, alpha + 60);
                    }
                }
            }
            traceCtx.putImageData(img, 0, 0);
        };

        this.ctx.globalCompositeOperation = 'screen';
        // R
        drawChannel(0, [255, 0, 0]);
        this.ctx.drawImage(traceCvs, x, y, subW, h);
        // G
        drawChannel(1, [0, 255, 0]);
        this.ctx.drawImage(traceCvs, x + subW, y, subW, h);
        // B
        drawChannel(2, [50, 100, 255]);
        this.ctx.drawImage(traceCvs, x + subW * 2, y, subW, h);
        this.ctx.globalCompositeOperation = 'source-over';

        // Dividers
        this.ctx.strokeStyle = '#334155';
        this.ctx.beginPath();
        this.ctx.moveTo(x + subW, y);
        this.ctx.lineTo(x + subW, y + h);
        this.ctx.moveTo(x + subW * 2, y);
        this.ctx.lineTo(x + subW * 2, y + h);
        this.ctx.stroke();
    }

    _renderHistogram(data, x, y, w, h) {
        const binsR = new Uint32Array(256);
        const binsG = new Uint32Array(256);
        const binsB = new Uint32Array(256);
        let maxCount = 0;

        // Sample pixels
        for (let i = 0; i < data.length; i += 4) {
            binsR[data[i]]++;
            binsG[data[i + 1]]++;
            binsB[data[i + 2]]++;
        }

        // Find peak for normalization
        for (let i = 0; i < 256; i++) {
            maxCount = Math.max(maxCount, binsR[i], binsG[i], binsB[i]);
        }

        const scaleX = w / 256;
        this.ctx.globalCompositeOperation = 'screen';

        const drawBins = (bins, color) => {
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y + h);
            for (let i = 0; i < 256; i++) {
                const val = bins[i];
                const barH = (val / maxCount) * h * 0.9; // Scale to 90% height
                this.ctx.lineTo(x + i * scaleX, y + h - barH);
            }
            this.ctx.lineTo(x + w, y + h);
            this.ctx.fill();
        };

        drawBins(binsR, 'rgba(255, 0, 0, 0.5)');
        drawBins(binsG, 'rgba(0, 255, 0, 0.5)');
        drawBins(binsB, 'rgba(0, 100, 255, 0.5)');
        this.ctx.globalCompositeOperation = 'source-over';
    }

    _renderVectorscope(data, x, y, w, h) {
        const size = Math.min(w, h) - 10;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const radius = size / 2;

        // --- Graticule ---
        this.ctx.lineWidth = 1;

        // 1. Circle Outline
        this.ctx.strokeStyle = '#334155';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.stroke();

        // 2. Crosshairs
        this.ctx.strokeStyle = '#1e293b';
        this.ctx.beginPath();
        this.ctx.moveTo(cx - radius, cy);
        this.ctx.lineTo(cx + radius, cy);
        this.ctx.moveTo(cx, cy - radius);
        this.ctx.lineTo(cx, cy + radius);
        this.ctx.stroke();

        // 3. Skin Tone Line
        // In canvas coords, 0 is 3 o'clock.
        this.ctx.strokeStyle = 'rgba(255, 200, 200, 0.3)';
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy);
        // Adjust for canvas coordinate system (Y down)
        // Standard Vectorscope: Red is near top-left.
        // We'll map standard angle.
        // Let's just draw a line at -120 deg for now (upper left).
        this.ctx.lineTo(
            cx + Math.cos(-2.1) * radius,
            cy + Math.sin(-2.1) * radius
        );
        this.ctx.stroke();

        // 4. Target Boxes (R, G, B, C, M, Y)
        // Angles in degrees (approximate standard)
        const targets = [
            { l: 'R', a: -76, c: '#ef4444' },
            { l: 'M', a: -167, c: '#d946ef' },
            { l: 'B', a: 103, c: '#3b82f6' },
            { l: 'C', a: 13, c: '#06b6d4' },
            { l: 'G', a: -106, c: '#22c55e' },
            { l: 'Y', a: 167, c: '#eab308' },
        ];

        const targetDist = radius * 0.75;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = '10px monospace';

        targets.forEach((t) => {
            const rad = (t.a * Math.PI) / 180;
            // Flip Y for canvas
            const tx = cx + Math.cos(rad) * targetDist;
            const ty = cy - Math.sin(rad) * targetDist;

            this.ctx.strokeStyle = t.c;
            this.ctx.fillStyle = t.c;

            // Box
            this.ctx.strokeRect(tx - 4, ty - 4, 8, 8);

            // Label (pushed out)
            const lx = cx + Math.cos(rad) * (radius - 10);
            const ly = cy - Math.sin(rad) * (radius - 10);
            this.ctx.fillText(t.l, lx, ly);
        });

        // --- Trace ---
        const traceRes = 128;
        const traceCvs = document.createElement('canvas');
        traceCvs.width = traceRes;
        traceCvs.height = traceRes;
        const traceCtx = traceCvs.getContext('2d');
        const imgData = traceCtx.createImageData(traceRes, traceRes);
        const tData = imgData.data;

        // Dense sampling for better trace
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Pb/Pr calc
            const pb = -0.168736 * r - 0.331264 * g + 0.5 * b;
            const pr = 0.5 * r - 0.418688 * g - 0.081312 * b;

            // Map -128..128 to 0..128
            const x = Math.floor((pb / 255 + 0.5) * traceRes);
            const y = Math.floor((-pr / 255 + 0.5) * traceRes);

            if (x >= 0 && x < traceRes && y >= 0 && y < traceRes) {
                const idx = (y * traceRes + x) * 4;
                // Trace Color: Cyan/Greenish
                tData[idx] = 0;
                tData[idx + 1] = 255;
                tData[idx + 2] = 200;
                // Accumulate alpha
                const a = tData[idx + 3];
                if (a < 255) tData[idx + 3] = Math.min(255, a + 20);
            }
        }
        traceCtx.putImageData(imgData, 0, 0);

        this.ctx.globalCompositeOperation = 'screen';
        this.ctx.drawImage(traceCvs, cx - radius, cy - radius, size, size);
        this.ctx.globalCompositeOperation = 'source-over';
    }
}
