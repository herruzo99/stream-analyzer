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

            this.ctx.fillStyle = `rgba(52, 211, 153, ${0.2 + percent * 0.8})`;
            this.ctx.fillRect(
                (width - barWidth) / 2,
                y,
                barWidth,
                barHeight - 1
            );
        }
    }

    render() {
        const meterBar = (id) => html`
            <div
                class="relative w-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800 h-full group"
            >
                <div
                    id="${id}"
                    class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500 opacity-90 transition-[height] duration-75 ease-linear"
                    style="height: 0%"
                ></div>
            </div>
        `;

        const template = html`
            <div
                class="h-full w-full flex flex-col bg-slate-950 border-r border-slate-800 items-center py-2 gap-2"
            >
                <div
                    class="text-slate-600 scale-75 pb-2 border-b border-slate-900"
                >
                    ${icons.volumeUp}
                </div>
                <div
                    class="grow flex flex-col items-center w-full min-h-0 gap-2"
                >
                    <div class="h-1/2 flex justify-center gap-1 w-full px-1">
                        ${meterBar('bar-l')} ${meterBar('bar-r')}
                    </div>
                    <div class="h-1/2 w-full px-1 relative opacity-60">
                        <canvas
                            id="audio-spectrum-canvas"
                            width="40"
                            height="150"
                            class="w-full h-full block"
                        ></canvas>
                    </div>
                </div>
                <div
                    class="w-8 h-8 relative border-t border-slate-800 mt-2 shrink-0"
                >
                    <div
                        class="absolute bottom-0 left-1/2 w-px h-full bg-slate-800"
                    ></div>
                    <div
                        id="phase-needle"
                        class="absolute bottom-0 left-1/2 w-0.5 h-full bg-slate-500 origin-bottom transition-transform duration-75"
                    ></div>
                    <div
                        class="absolute -bottom-1 left-0 right-0 text-center text-[7px] text-slate-700 font-mono"
                    >
                        PH
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
        const ro = new ResizeObserver(() => {
            if (canvas.isConnected) {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
            }
        });
        ro.observe(canvas);
    }

    toggleScope(key) {
        this._state[key] = !this._state[key];
        this.renderer.setMode(this._state);
        this.render();
    }

    render() {
        const { isRestricted, isDrmLocked } = this._state;

        // Styled as a horizontal pill button
        const btn = (active, icon, label, onClick, activeColor='bg-blue-600') => html`
            <button
                @click=${onClick}
                ?disabled=${isDrmLocked || isRestricted}
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${active
                    ? `${activeColor} text-white border-transparent shadow-md`
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200 hover:border-slate-700'} 
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
                    class="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center text-slate-400 p-4 text-center"
                >
                    <div class="text-amber-500 mb-2 scale-150">
                        ${icons.shield}
                    </div>
                    <h4 class="text-sm font-bold text-white mb-1">
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
                    class="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center text-slate-500 p-4"
                >
                    <div class="text-red-500 mb-2">${icons.lockClosed}</div>
                    <p class="text-xs font-bold">Signal Locked (CORS)</p>
                </div>
            `;
        }

        const template = html`
            <div
                class="flex flex-col h-full bg-slate-950 border-t border-slate-800 relative overflow-hidden"
            >
                ${overlay}

                <!-- Top Controls Toolbar -->
                <div
                    class="w-full shrink-0 bg-slate-950 border-b border-slate-800 flex items-center p-2 gap-2 z-10 overflow-x-auto custom-scrollbar"
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
                    
                    <div class="h-6 w-px bg-slate-800 mx-1 shrink-0"></div>

                    ${btn(
                        this._state.showBroadcastCompliance,
                        icons.shieldCheck,
                        'QC',
                        () => this.toggleScope('showBroadcastCompliance'),
                        'bg-red-600'
                    )}
                </div>

                <!-- Scope Canvas Area -->
                <div class="grow relative bg-black min-h-0">
                    <canvas
                        id="scope-canvas"
                        class="absolute inset-0 w-full h-full block"
                    ></canvas>
                </div>
            </div>
        `;
        render(template, this);
    }
}
customElements.define('signal-monitor-video', SignalMonitorVideo);