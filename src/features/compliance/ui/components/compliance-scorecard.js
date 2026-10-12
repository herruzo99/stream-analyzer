import { html, render } from 'lit-html';

export class ComplianceScorecard extends HTMLElement {
    /** @type {any} */
    __data = null;

    constructor() {
        super();
        this.style.display = 'block';
        this.style.width = '100%';
    }

    set _data(val) {
        this.__data = val;
        this.render();
    }

    get _data() {
        return this.__data;
    }

    render() {
        if (!this._data) return;
        const data = this._data || {};
        const totalScore =
            typeof data.totalScore === 'number' ? data.totalScore : null;
        const label = data.label || 'unknown';
        const summary = data.summary || { errors: 0, warnings: 0 };
        const categories = Array.isArray(data.categories)
            ? data.categories
            : [];
        const errors = summary.errors ?? 0;
        const warnings = summary.warnings ?? 0;

        const scoreClass =
            totalScore === null
                ? 'text-slate-500'
                : totalScore >= 90
                  ? 'text-emerald-300'
                  : totalScore >= 70
                    ? 'text-amber-300'
                    : 'text-red-300';

        const labelClass =
            label === 'FAIL'
                ? 'text-red-300 bg-red-500/10 border-red-400/25'
                : label === 'WARNING'
                  ? 'text-amber-300 bg-amber-500/10 border-amber-400/25'
                  : label === 'PASS'
                    ? 'text-emerald-200 bg-emerald-500/10 border-emerald-400/25'
                    : 'text-slate-500 bg-white/5 border-white/10';

        const template = html`
            <div
                class="rounded-md border border-white/5 bg-[#0b111c] p-4 flex flex-col gap-4"
            >
                <div class="flex items-center justify-between gap-3">
                    <div>
                        <p class="mono text-[10px] text-slate-600">
                            overall
                        </p>
                        <p class="text-xl tabular-nums ${scoreClass}">
                            ${totalScore === null ? '–' : totalScore}<span
                                class="mono text-[10px] text-slate-600"
                                >/100</span
                            >
                        </p>
                    </div>
                    <span
                        class="mono text-[10px] px-1.5 py-px rounded border ${labelClass}"
                        >${String(label).toLowerCase()}</span
                    >
                </div>

                <div class="grid grid-cols-2 gap-1.5">
                    <div
                        class="rounded border border-white/5 bg-white/[0.02] p-2.5 text-center"
                    >
                        <p
                            class="text-xl tabular-nums ${errors > 0 ? 'text-red-300' : 'text-slate-200'}"
                        >
                            ${errors}
                        </p>
                        <p class="mono text-[9px] text-slate-600">
                            critical
                        </p>
                    </div>
                    <div
                        class="rounded border border-white/5 bg-white/[0.02] p-2.5 text-center"
                    >
                        <p
                            class="text-xl tabular-nums ${warnings > 0 ? 'text-amber-300' : 'text-slate-200'}"
                        >
                            ${warnings}
                        </p>
                        <p class="mono text-[9px] text-slate-600">
                            warnings
                        </p>
                    </div>
                </div>

                ${categories.length > 0
                    ? html`<div class="flex flex-col gap-2.5">
                          <p class="mono text-[10px] text-slate-600">
                              by category
                          </p>
                          ${categories.map((cat) => {
                              const score =
                                  typeof cat.score === 'number'
                                      ? cat.score
                                      : null;
                              const barClass =
                                  score === null
                                      ? 'bg-white/10'
                                      : score >= 90
                                        ? 'bg-emerald-400'
                                        : score >= 70
                                          ? 'bg-amber-400'
                                          : 'bg-red-400';
                              return html`
                                  <div class="flex flex-col gap-1">
                                      <div
                                          class="flex items-center justify-between gap-2"
                                      >
                                          <span
                                              class="text-[13px] text-slate-200 truncate"
                                              title="${cat.name}"
                                              >${cat.name}</span
                                          >
                                          <span
                                              class="mono text-[10px] text-slate-500 tabular-nums shrink-0"
                                              >${score === null ? '–' : `${score}%`}</span
                                          >
                                      </div>
                                      <div
                                          class="w-full h-1 bg-white/5 rounded-full overflow-hidden"
                                      >
                                          <div
                                              class="h-full rounded-full ${barClass}"
                                              style="width: ${score === null ? 0 : Math.min(100, Math.max(0, score))}%"
                                          ></div>
                                      </div>
                                  </div>
                              `;
                          })}
                      </div>`
                    : html`<p class="mono text-[11px] text-slate-600">
                          No category breakdown for this update.
                      </p>`}
            </div>
        `;

        render(template, this);
    }
}

customElements.define('compliance-scorecard', ComplianceScorecard);
