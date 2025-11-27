import { playerService } from '@/features/playerSimulation/application/playerService';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { AudioAnalyzer } from '../domain/audio-analyzer.js';
import { VideoScopeRenderer } from '../domain/video-scope-renderer.js';

// --- COMPONENT 1: Audio Monitor (Slim Vertical) ---
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
        };
    }

    connectedCallback() {
        this.style.display = 'block';
        this.style.height = '100%';
        this.render();
        requestAnimationFrame(() => this.init());
    }

    disconnectedCallback() {
        this.analyzer.detach();
    }

    init() {
        const videoEl = playerService.getPlayer()?.getMediaElement();
        if (!videoEl) return;

        // Simple check, though audio analyzer handles CORS internally with silence fallback
        if (videoEl.crossOrigin !== 'anonymous') {
            /* Handle restriction if needed */
        }

        this.analyzer.attach(videoEl, (data) => {
            this._state = data;
            this.updateMeters();
        });
    }

    updateMeters() {
        const lBar = /** @type {HTMLElement} */ (this.querySelector('#bar-l'));
        const rBar = /** @type {HTMLElement} */ (this.querySelector('#bar-r'));
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

    render() {
        // Slim bars for sidebar
        const meterBar = (id) => html`
            <div
                class="relative w-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 h-full group"
            >
                <div
                    id="${id}"
                    class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500 opacity-90 transition-[height] duration-75 ease-linear"
                    style="height: 0%"
                ></div>
                <!-- Tick Marks Overlay -->
                <div
                    class="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20"
                >
                    ${[...Array(12)].map(
                        () => html`<div class="w-full h-px bg-slate-950"></div>`
                    )}
                </div>
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
                    class="grow flex justify-center gap-1.5 h-full w-full px-1"
                >
                    ${meterBar('bar-l')} ${meterBar('bar-r')}
                </div>

                <div class="w-8 h-8 relative border-t border-slate-800 mt-2">
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

// --- COMPONENT 2: Video Monitor (Horizontal Bottom Panel) ---
class SignalMonitorVideo extends HTMLElement {
    constructor() {
        super();
        this.renderer = new VideoScopeRenderer();
        this._state = {
            isRestricted: false,
            showWaveform: true,
            showVectorscope: true,
            showParade: true,
            showHistogram: true,
        };
        this.toggleScope = this.toggleScope.bind(this);
    }

    connectedCallback() {
        this.style.display = 'block';
        this.style.height = '100%';
        this.style.width = '100%';
        this.render();
        requestAnimationFrame(() => this.init());
    }

    disconnectedCallback() {
        this.renderer.detach();
    }

    init() {
        const videoEl = playerService.getPlayer()?.getMediaElement();
        if (!videoEl) return;

        if (videoEl.crossOrigin !== 'anonymous') {
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
        const { isRestricted } = this._state;
        const btn = (active, icon, label, onClick) => html`
            <button
                @click=${onClick}
                class="flex flex-col items-center justify-center w-full p-2 rounded gap-1 transition-all ${active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-500 hover:bg-slate-800'}"
            >
                <span class="scale-75">${icon}</span>
                <span class="text-[9px] font-bold uppercase tracking-wider"
                    >${label}</span
                >
            </button>
        `;

        const template = html`
            <div
                class="flex h-full bg-slate-950 border-t border-slate-800 relative overflow-hidden"
            >
                ${isRestricted
                    ? html`
                          <div
                              class="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center text-slate-500 p-4"
                          >
                              <div class="text-red-500 mb-2">
                                  ${icons.lockClosed}
                              </div>
                              <p class="text-xs">Signal Locked (CORS)</p>
                          </div>
                      `
                    : ''}

                <!-- Left Controls Toolbar -->
                <div
                    class="w-16 shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col p-2 gap-2 z-10 overflow-y-auto custom-scrollbar"
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
                </div>

                <!-- Scope Canvas Area -->
                <div class="grow relative bg-black">
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
