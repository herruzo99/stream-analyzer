import * as icons from '@/ui/icons';
import { closeModal } from '@/ui/services/modalService';
import { html, render } from 'lit-html';
import { calculateDashSegment } from '../../../domain/dash-timing.js';

class DashTimingCalculator extends HTMLElement {
    constructor() {
        super();
        this._data = null;
        this.nowOverride = null;
    }

    set data(val) {
        this._data = val;
        this.render();
    }

    connectedCallback() {
        this.render();
        this.rafId = requestAnimationFrame(this.tick.bind(this));
    }

    disconnectedCallback() {
        cancelAnimationFrame(this.rafId);
    }

    tick() {
        if (!this.nowOverride) {
            this.render();
        }
        this.rafId = requestAnimationFrame(this.tick.bind(this));
    }

    render() {
        if (!this._data) return;

        const {
            ast,
            periodStart,
            timescale,
            duration,
            startNumber,
            pto,
            mediaTemplate,
        } = this._data;
        const now = this.nowOverride || Date.now();

        const result = calculateDashSegment({
            now,
            availabilityStartTime: ast,
            periodStart,
            timescale,
            duration,
            startNumber,
            pto,
        });

        // Generate URL preview
        let urlPreview = mediaTemplate || '';
        if (result && !result.error) {
            urlPreview = urlPreview
                .replace('$Number$', result.segmentIndex)
                .replace('$Time$', result.presentationTime);
            // Handle formatted number like $Number%06d$
            const numFormatMatch = urlPreview.match(/\$Number(%0(\d+)d)\$/);
            if (numFormatMatch) {
                const pad = parseInt(numFormatMatch[2]);
                urlPreview = urlPreview.replace(
                    numFormatMatch[0],
                    String(result.segmentIndex).padStart(pad, '0')
                );
            }
        }

        const handleTimeChange = (e) => {
            const date = new Date(e.target.value);
            if (!isNaN(date.getTime())) {
                this.nowOverride = date.getTime();
            } else {
                this.nowOverride = null;
            }
            this.render();
        };

        const resetTime = () => {
            this.nowOverride = null;
            this.render();
        };

        const template = html`
            <div
                class="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden"
            >
                <div class="p-6 border-b border-slate-800 bg-slate-900/50">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h2
                                class="text-xl font-bold text-white flex items-center gap-2"
                            >
                                ${icons.calculator} DASH Timing Calculator
                            </h2>
                            <p class="text-sm text-slate-400 mt-1">
                                Debug segment generation logic based on
                                wall-clock time.
                            </p>
                        </div>
                        <button
                            @click=${closeModal}
                            class="text-slate-500 hover:text-white transition-colors"
                        >
                            ${icons.xCircle}
                        </button>
                    </div>

                    <div
                        class="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 flex items-end gap-4"
                    >
                        <div class="grow">
                            <label
                                class="block text-[10px] font-bold uppercase text-slate-500 mb-1"
                                >Target Time (UTC)</label
                            >
                            <input
                                type="datetime-local"
                                step="0.001"
                                .value=${this.nowOverride
                                    ? new Date(
                                          this.nowOverride -
                                              new Date().getTimezoneOffset() *
                                                  60000
                                      )
                                          .toISOString()
                                          .slice(0, 23)
                                    : ''}
                                @input=${handleTimeChange}
                                class="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                            />
                        </div>
                        <button
                            @click=${resetTime}
                            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded transition-colors border border-slate-600"
                        >
                            Sync to Now
                        </button>
                    </div>
                </div>

                <div class="p-6 grid grid-cols-2 gap-8 min-h-0 overflow-y-auto">
                    <!-- Inputs / Constants -->
                    <div class="space-y-4">
                        <h3
                            class="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-slate-800 pb-2"
                        >
                            Stream Parameters
                        </h3>
                        <div class="grid grid-cols-1 gap-2">
                            ${this.paramRow(
                                'Availability Start Time',
                                new Date(ast).toISOString()
                            )}
                            ${this.paramRow('Period Start', `${periodStart}s`)}
                            ${this.paramRow('Timescale', timescale)}
                            ${this.paramRow('Duration (Ticks)', duration)}
                            ${this.paramRow('Start Number', startNumber)}
                            ${this.paramRow('PTO', pto)}
                        </div>
                    </div>

                    <!-- Results -->
                    <div class="space-y-4">
                        <h3
                            class="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2"
                        >
                            Calculated Values
                        </h3>
                        ${result.error
                            ? html`<div class="text-red-400 font-mono text-sm">
                                  ${result.error}
                              </div>`
                            : html`
                                  <div
                                      class="p-4 bg-emerald-900/10 border border-emerald-500/20 rounded-lg"
                                  >
                                      <div
                                          class="text-[10px] text-emerald-500 uppercase font-bold mb-1"
                                      >
                                          Calculated Segment Number
                                      </div>
                                      <div
                                          class="text-3xl font-mono text-white font-bold"
                                      >
                                          ${result.segmentIndex}
                                      </div>
                                  </div>

                                  <div class="space-y-2 font-mono text-xs">
                                      <div
                                          class="flex justify-between border-b border-slate-800 pb-1"
                                      >
                                          <span class="text-slate-500"
                                              >$Time$ Value</span
                                          >
                                          <span class="text-slate-200"
                                              >${result.presentationTime}</span
                                          >
                                      </div>
                                      <div
                                          class="flex justify-between border-b border-slate-800 pb-1"
                                      >
                                          <span class="text-slate-500"
                                              >Seg Start (Wall)</span
                                          >
                                          <span class="text-slate-200"
                                              >${new Date(
                                                  result.segmentStartWallMs
                                              ).toLocaleTimeString()}</span
                                          >
                                      </div>
                                      <div
                                          class="flex justify-between border-b border-slate-800 pb-1"
                                      >
                                          <span class="text-slate-500"
                                              >Seg End (Wall)</span
                                          >
                                          <span class="text-slate-200"
                                              >${new Date(
                                                  result.segmentEndWallMs
                                              ).toLocaleTimeString()}</span
                                          >
                                      </div>
                                      <div
                                          class="flex justify-between border-b border-slate-800 pb-1"
                                      >
                                          <span class="text-slate-500"
                                              >Availability</span
                                          >
                                          <span
                                              class="${result.isAvailable
                                                  ? 'text-green-400'
                                                  : 'text-amber-400'} font-bold"
                                              >${result.isAvailable
                                                  ? 'AVAILABLE'
                                                  : 'FUTURE'}</span
                                          >
                                      </div>
                                  </div>

                                  <div class="mt-4">
                                      <div
                                          class="text-[10px] text-slate-500 uppercase font-bold mb-1"
                                      >
                                          URL Preview
                                      </div>
                                      <div
                                          class="p-2 bg-black/30 rounded border border-slate-700 text-xs font-mono text-blue-300 break-all"
                                      >
                                          ${urlPreview}
                                      </div>
                                  </div>
                              `}
                    </div>
                </div>
            </div>
        `;

        render(template, this);
    }

    paramRow(label, value) {
        return html`
            <div
                class="flex justify-between items-center py-1 border-b border-slate-800/50"
            >
                <span class="text-slate-500 text-xs">${label}</span>
                <span class="text-slate-300 font-mono text-xs">${value}</span>
            </div>
        `;
    }
}

customElements.define('dash-timing-calculator-modal', DashTimingCalculator);

export const dashTimingCalculatorTemplate = (data) =>
    html`<dash-timing-calculator-modal
        .data=${data}
    ></dash-timing-calculator-modal>`;
