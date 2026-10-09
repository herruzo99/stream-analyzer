/**
 * <time-controller> — playhead scrub bar for the DASH timing calculator.
 *
 * Reconstructed for the port (the module was referenced but never
 * committed). Contract, derived from the calculator's usage:
 *   in:  `.data = { min, max, nowMs, isLive, isPlaying, isDynamic, spd }`
 *         (all times in wall-clock ms; `spd` = suggestedPresentationDelay,
 *         seconds, may be 0)
 *   out: `time-change` CustomEvent with `{ time, isLive, isPlaying }`
 *         (`time` = wall-clock ms the simulation should evaluate).
 *
 * While live or playing, simulation time advances in real time and the
 * element emits throttled `time-change` events so the parent re-renders
 * the "moving bar". User scrubbing, pause, resume, and go-live emit
 * immediately.
 */
import { html, render } from 'lit-html';

const TICK_HZ = 4;

class TimeController extends HTMLElement {
    constructor() {
        super();
        this._data = null;
        this._simTime = null;
        this._rafId = 0;
        this._lastTick = 0;
        this._lastWall = 0;
    }

    set data(value) {
        this._data = value || null;
        if (this._data && this._data.isLive) {
            this._simTime = null; // live edge follows Date.now()
        } else if (this._simTime === null && this._data) {
            this._simTime =
                typeof this._data.nowMs === 'number'
                    ? this._data.nowMs
                    : (this._data.min ?? 0);
        }
        this._syncLoop();
        this._render();
    }

    get data() {
        return this._data;
    }

    connectedCallback() {
        this._lastWall = performance.now();
        this._syncLoop();
        this._render();
    }

    disconnectedCallback() {
        this._stopLoop();
    }

    _active() {
        const d = this._data;
        return !!d && (!!d.isPlaying || !!d.isLive);
    }

    _syncLoop() {
        if (this.isConnected && this._active() && !this._rafId) {
            this._lastWall = performance.now();
            const loop = () => {
                this._rafId = 0;
                if (!this._active()) {
                    this._render();
                    return;
                }
                const wall = performance.now();
                const elapsed = wall - this._lastWall;
                this._lastWall = wall;
                const d = this._data;
                if (d && !d.isLive) {
                    this._simTime = Math.min(
                        (this._simTime ?? d.min ?? 0) + elapsed,
                        d.max ?? Number.MAX_SAFE_INTEGER
                    );
                }
                const now = performance.now();
                if (now - this._lastTick >= 1000 / TICK_HZ) {
                    this._lastTick = now;
                    this._emit();
                }
                this._render();
                this._rafId = requestAnimationFrame(loop);
            };
            this._rafId = requestAnimationFrame(loop);
        } else if (!this._active()) {
            this._stopLoop();
        }
    }

    _stopLoop() {
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = 0;
        }
    }

    _displayTime() {
        const d = this._data;
        if (!d) return 0;
        if (d.isLive) return Date.now();
        if (this._simTime !== null) return this._simTime;
        return typeof d.nowMs === 'number' ? d.nowMs : (d.min ?? 0);
    }

    _emit() {
        const d = this._data;
        if (!d) return;
        this.dispatchEvent(
            new CustomEvent('time-change', {
                detail: {
                    time: this._displayTime(),
                    isLive: !!d.isLive,
                    isPlaying: !!d.isPlaying || !!d.isLive,
                },
                bubbles: true,
                composed: true,
            })
        );
    }

    _onScrub(event) {
        const d = this._data;
        if (!d) return;
        this._simTime = Number(event.target.value);
        this._emit();
        this._render();
    }

    _onTogglePlay() {
        const d = this._data;
        if (!d) return;
        this._emitWith({ isPlaying: !d.isPlaying, isLive: false });
    }

    _onGoLive() {
        const d = this._data;
        if (!d || !d.isDynamic) return;
        this._simTime = null;
        this._emitWith({ isLive: true, isPlaying: true, time: null });
    }

    _onPauseLive() {
        const d = this._data;
        if (!d) return;
        this._simTime = this._displayTime();
        this._emitWith({ isLive: false, isPlaying: false });
    }

    _emitWith(patch) {
        const d = this._data;
        if (!d) return;
        this.dispatchEvent(
            new CustomEvent('time-change', {
                detail: {
                    time: patch.time !== undefined ? patch.time : this._displayTime(),
                    isLive: patch.isLive ?? !!d.isLive,
                    isPlaying: patch.isPlaying ?? !!d.isPlaying,
                },
                bubbles: true,
                composed: true,
            })
        );
    }

    _render() {
        const d = this._data;
        if (!d) {
            render(html``, this);
            return;
        }
        const min = d.min ?? 0;
        const max = Math.max(d.max ?? 0, min + 1);
        const shown = Math.min(Math.max(this._displayTime(), min), max);
        const fmt = (ms) => {
            try {
                return new Date(ms).toLocaleTimeString();
            } catch {
                return '—';
            }
        };
        render(
            html`
                <div class="flex flex-col gap-1.5">
                    <div class="flex items-center gap-2">
                        ${d.isDynamic
                            ? html`
                                  ${d.isLive
                                      ? html`<button
                                            type="button"
                                            @click=${() => this._onPauseLive()}
                                            class="px-2.5 py-1.5 rounded-lg font-bold text-[11px] bg-slate-800 text-red-400 border border-red-900/30 hover:bg-red-900/10"
                                            title="Pause the live edge"
                                        >
                                            ⏸ Pause
                                        </button>`
                                      : html`<button
                                            type="button"
                                            @click=${() => this._onGoLive()}
                                            class="px-2.5 py-1.5 rounded-lg font-bold text-[11px] bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500"
                                            title="Jump to the live edge"
                                        >
                                            ● Go Live
                                        </button>`}
                                  ${!d.isLive
                                      ? html`<button
                                            type="button"
                                            @click=${() => this._onTogglePlay()}
                                            class="px-2.5 py-1.5 rounded-lg font-bold text-[11px] bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
                                            title=${d.isPlaying
                                                ? 'Pause simulation'
                                                : 'Resume simulation'}
                                        >
                                            ${d.isPlaying ? '⏸' : '▶'}
                                        </button>`
                                      : ''}
                              `
                            : ''}
                        <input
                            type="range"
                            min=${min}
                            max=${max}
                            step="100"
                            .value=${String(shown)}
                            @input=${(e) => this._onScrub(e)}
                            class="grow accent-emerald-500"
                            aria-label="Simulation time scrubber"
                        />
                        <span class="font-mono text-[11px] text-slate-300 whitespace-nowrap"
                            >${fmt(shown)}</span
                        >
                    </div>
                    ${d.spd
                        ? html`<div
                              class="text-[10px] text-slate-500 font-mono"
                          >
                              SPD −${d.spd}s behind live edge
                          </div>`
                        : ''}
                </div>
            `,
            this
        );
    }
}

if (!customElements.get('time-controller')) {
    customElements.define('time-controller', TimeController);
}
