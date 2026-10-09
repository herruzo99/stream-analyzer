import { playerService } from '@/features/playerSimulation/application/playerService';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { AudioAnalyzer } from '../domain/audio-analyzer.js';
import { VideoScopeRenderer } from '../domain/video-scope-renderer.js';

class SignalMonitorAudio extends HTMLElement {
    constructor() {
        super();
        this.analyzer = new AudioAnalyzer();
        this._state = {
            lLevel: -100,
            rLevel: -100,
            lPeak: -100,
            rPeak: -100,
            phase: 0,
            spectrum: null,
        };
        this.canvas = null;
        this.ctx = null;
        this.attachRaf = null;
    }

    connectedCallback() {
        this.style.display = 'block';
        this.style.height = '100%';
        this.render();
        this.attemptAttach();
    }

    disconnectedCallback() {
        if (this.attachRaf) cancelAnimationFrame(this.attachRaf);
        this.analyzer.detach();
    }

    attemptAttach() {
        const player = playerService.getPlayer();
        const videoEl = player?.getMediaElement();

        if (!player || !videoEl) {
            this.attachRaf = requestAnimationFrame(() => this.attemptAttach());
            return;
        }

        this.init(videoEl);
    }

    init(videoEl) {
        this.canvas = /** @type {HTMLCanvasElement} */ (
            this.querySelector('#audio-spectrum-canvas')
        );
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
        }

        this.analyzer.attach(videoEl, (data) => {
            this._state = data;
            this.updateMeters();
            this.drawSpectrum();
        });
    }

    updateMeters() {
        const lBar = this.querySelector('#bar-l');
        const rBar = this.querySelector('#bar-r');
        const phaseNeedle = /** @type {HTMLElement} */ (
            this.querySelector('#phase-needle')
        );

        const setH = (el, db) => {
            if (el)
                el.style.height = `${Math.min(100, Math.max(0, ((db + 60) / 60) * 100))}%`;
        };

        setH(lBar, this._state.lLevel);
        setH(rBar, this._state.rLevel);

        if (phaseNeedle) {
            const deg = this._state.phase * 90;
            phaseNeedle.style.transform = `translateX(-50%) rotate(${deg}deg)`;
        }
    }

    drawSpectrum() {
        if (!this.ctx || !this.canvas || !this._state.spectrum) return;

        const width = this.canvas.width;
        const height = this.canvas.height;
        const buffer = this._state.spectrum;
        const bufferLength = buffer.length;

        this.ctx.clearRect(0, 0, width, height);

        const barHeight = height / 32;
        const step = Math.floor(bufferLength / 32);

        for (let i = 0; i < 32; i++) {
            const val = buffer[i * step];
            const percent = val / 255;
            const barWidth = percent * width;

            const y = height - i * barHeight;

            this.ctx.fillStyle = `rgba(20, 184, 166, ${0.2 + percent * 0.8})`;
            this.ctx.fillRect(
                (width - barWidth) / 2,
                y,
                barWidth,
                barHeight - 1
            );
        }
    }

    render() {
        // Compact Audio Monitor (Horizontal Layout)
        const meterBar = (id) => html`
            <div class="relative w-1.5 h-full bg-slate-800 rounded-full overflow-hidden border border-slate-800/30 group mx-0.5">
                <div id="${id}"
                    class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-500 via-amber-500 to-red-500 opacity-90 transition-[height] duration-75 ease-linear"
                    style="height: 0%"
                ></div>
            </div>
        `;

        const template = html`
            <div class="h-full w-full flex items-center bg-slate-800 px-3 gap-3 backdrop-blur-md">
                
                <!-- 1. Meters (L/R) -->
                <div class="h-12 flex items-end justify-center">
                    ${meterBar('bar-l')}
                    ${meterBar('bar-r')}
                </div>

                <!-- 2. Spectrum (Wide) -->
                <div class="grow h-12 relative opacity-60">
                    <canvas id="audio-spectrum-canvas" width="200" height="40" class="w-full h-full block"></canvas>
                    <!-- Label -->
                     <div class="absolute bottom-0 right-0 text-[8px] text-slate-400 font-mono pointer-events-none">SPECTRUM</div>
                </div>

                <!-- 3. Phase Correlation (Simple Horizontal Bar or Compact Needle) -->
                <div class="w-16 h-8 relative shrink-0 border-l border-slate-800/30 pl-3 ml-1">
                    <div class="w-full h-full relative overflow-hidden">
                        <!-- Scale -->
                        <div class="absolute bottom-0 left-1/2 w-px h-full bg-slate-800/30"></div>
                        <div class="absolute bottom-0 left-0 right-0 h-px bg-slate-800/30"></div>
                        
                        <!-- Needle -->
                        <div id="phase-needle"
                            class="absolute bottom-0 left-1/2 w-0.5 h-full bg-slate-400 origin-bottom transition-transform duration-75"
                            style="transform: translateX(-50%) rotate(0deg)"
                        ></div>
                    </div>
                     <div class="absolute -bottom-2 left-0 right-0 text-center text-[7px] text-slate-400 font-mono">
                        PHASE
                    </div>
                </div>
            </div>
        `;
        render(template, this);
    }
}
customElements.define('signal-monitor-audio', SignalMonitorAudio);

class SignalMonitorVideo extends HTMLElement {
    constructor() {
        super();
        this.renderer = new VideoScopeRenderer();
        this._state = {
            isRestricted: false,
            isDrmLocked: false,
            showWaveform: true,
            showVectorscope: true,
            showParade: false,
            showHistogram: false,
            showBroadcastCompliance: false,
        };
        this.attachRaf = null;
        this.toggleScope = this.toggleScope.bind(this);
    }

    connectedCallback() {
        this.style.display = 'block';
        this.style.height = '100%';
        this.style.width = '100%';
        this.render();
        this.attemptAttach();
    }

    disconnectedCallback() {
        if (this.attachRaf) cancelAnimationFrame(this.attachRaf);
        this.renderer.detach();
    }

    attemptAttach() {
        const player = playerService.getPlayer();
        const videoEl = player?.getMediaElement();

        if (!player || !videoEl) {
            this.attachRaf = requestAnimationFrame(() => this.attemptAttach());
            return;
        }
        this.init(videoEl);
    }

    init(videoEl) {
        if (videoEl.mediaKeys) {
            this._state.isDrmLocked = true;
            this.render();
            return;
        }
        if (videoEl.crossOrigin !== 'anonymous') {
            console.warn(
                '[SignalMonitorVideo] Video missing crossOrigin="anonymous"'
            );
            this._state.isRestricted = true;
            this.render();
            return;
        }

        const canvas = /** @type {HTMLCanvasElement} */ (
            this.querySelector('#scope-canvas')
        );
        if (canvas) {
            this.observeCanvas(canvas);
            this.renderer.attach(videoEl, canvas);
            this.renderer.setMode(this._state);
        } else {
            console.error('[SignalMonitorVideo] Canvas not found');
        }
    }

    observeCanvas(canvas) {
        // We use a ResizeObserver to detect container width changes
        // AND we must manually update height when scopes change.
        // We'll decouple the resize logic to a shared method.
        this.updateCanvasDimensions = () => {
            if (!canvas.isConnected) return;

            // 1. Get container width
            const width = canvas.parentElement.clientWidth;
            canvas.width = width;

            // 2. Calculate necessary height for "Non-Distorted" Stacking
            // User wants "Real Ratio". Most scopes (Vector) need Square.
            // Waveform/Parade can accept 16:9 or similar, but Square is safe for strict verticality.
            // Let's use a 4:3 (0.75) ratio per scope for a balanced look, or 1:1 if preferred.
            // 1:1 ensures Vector is perfect. 4:3 is better for Waveform.
            // Let's compromise: Vectorscope gets 1:1, others get 3:4 or 16:9?
            // For simplicity in the single-canvas renderer, we treat them uniformly for now,
            // or we'd need complex renderer logic. The renderer divides height by N.
            // So if we set TotalHeight = N * (Width * Ratio), each cell gets (Width * Ratio).

            const activeCount = [
                this._state.showWaveform,
                this._state.showVectorscope,
                this._state.showParade,
                this._state.showHistogram,
                this._state.showBroadcastCompliance
            ].filter(Boolean).length;

            // Use 56.25% (16:9) for scopes generally, or 100% (square) for Vector?
            // Vector needs height >= width to be a circle. If height < width, circle shrinks.
            // If we use square (ratio 1.0), it's taller but safe.
            // If activeCount is 0, height 0.
            const ratio = 0.75; // 4:3 aspect ratio per scope
            const effectiveCount = Math.max(1, activeCount);

            // Min height to avoid breakage
            canvas.height = Math.max(300, width * ratio * effectiveCount);
        };

        const ro = new ResizeObserver(() => this.updateCanvasDimensions());
        ro.observe(canvas.parentElement); // Observe PARENT to fit into it
    }

    toggleScope(key) {
        this._state[key] = !this._state[key];
        this.renderer.setMode(this._state);
        // Force re-calc of height immediately
        if (this.updateCanvasDimensions) this.updateCanvasDimensions();
        this.render();
    }

    render() {
        const { isRestricted, isDrmLocked } = this._state;

        // Styled as a horizontal pill button
        const btn = (
            active,
            icon,
            label,
            onClick,
            activeColor = 'bg-blue-500'
        ) => html`
            <button
                @click=${onClick}
                ?disabled=${isDrmLocked || isRestricted}
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${active
                ? `${activeColor} text-white border-transparent shadow-[0_0_10px_#3b82f6]`
                : 'bg-slate-800 border-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-100 hover:border-slate-800'} 
                       disabled:opacity-50 disabled:cursor-not-allowed text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
            >
                <span class="scale-90">${icon}</span>
                <span>${label}</span>
            </button>
        `;

        let overlay = null;
        if (isDrmLocked) {
            overlay = html`
                <div
                    class="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-slate-400 p-4 text-center"
                >
                    <div class="text-amber-400 mb-2 scale-150">
                        ${icons.shield}
                    </div>
                    <h4
                        class="text-sm font-bold text-slate-100 mb-1"
                    >
                        Signal Analysis Unavailable
                    </h4>
                    <p class="text-xs max-w-xs">
                        This stream is protected by DRM (EME). Browsers block
                        pixel access to protected video for security reasons.
                    </p>
                </div>
            `;
        } else if (isRestricted) {
            overlay = html`
                <div
                    class="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-slate-400 p-4"
                >
                    <div class="text-red-400 mb-2">
                        ${icons.lockClosed}
                    </div>
                    <p class="text-xs font-bold">Signal Locked (CORS)</p>
                </div>
            `;
        }

        const template = html`
            <div
                class="flex flex-col h-full bg-slate-800 border-t border-slate-800/50 relative overflow-hidden backdrop-blur-3xl"
            >
                ${overlay}

                <!-- Top Controls Toolbar -->
                <div
                    class="w-full shrink-0 bg-slate-800 border-b border-slate-800/50 flex items-center p-2 gap-2 z-10 overflow-x-auto custom-scrollbar backdrop-blur-xl"
                >
                    ${btn(
            this._state.showWaveform,
            icons.activity,
            'Wave',
            () => this.toggleScope('showWaveform')
        )}
                    ${btn(this._state.showParade, icons.barChart, 'RGB', () =>
            this.toggleScope('showParade')
        )}
                    ${btn(
            this._state.showVectorscope,
            icons.radar,
            'Vector',
            () => this.toggleScope('showVectorscope')
        )}
                    ${btn(
            this._state.showHistogram,
            icons.barChart,
            'Hist',
            () => this.toggleScope('showHistogram')
        )}

                    <div
                        class="h-6 w-px bg-slate-800/30 mx-1 shrink-0"
                    ></div>

                    ${btn(
            this._state.showBroadcastCompliance,
            icons.shieldCheck,
            'QC',
            () => this.toggleScope('showBroadcastCompliance'),
            'bg-red-500'
        )}
                </div>

                <!-- Scope Canvas Area -->
                <div class="grow relative bg-black/50 min-h-0 overflow-y-auto custom-scrollbar">
                    <!-- Canvas is no longer absolute inset-0 forced. It's block, width 100%, height controlled by JS -->
                    <canvas
                        id="scope-canvas"
                        class="block w-full bg-black"
                    ></canvas>
                </div>
            </div>
        `;
        render(template, this);
    }
}
customElements.define('signal-monitor-video', SignalMonitorVideo);
