import { html, render } from 'lit-html';
import * as icons from '@/ui/icons';

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
        const { totalScore, label, summary, categories } = this._data;

        // Colors
        let scoreColor = '#f1f5f9';
        if (totalScore >= 90) scoreColor = '#10b981';
        else if (totalScore >= 70) scoreColor = '#f59e0b';
        else scoreColor = '#ef4444';

        // Reusable card wrapper with "Cyberpunk/Tech" styling
        const renderTechCard = (content, classes = '') => html`
            <div class="layout-card rounded-xl p-5 relative overflow-hidden group border border-slate-800 ${classes}">
                <!-- Tech Lines Decoration -->
                <div class="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[var(--sidebar-accent,#3b82f6)]/10 rounded-tr-[0.75rem] pointer-events-none"></div>
                <div class="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-slate-400/10 rounded-bl-[0.75rem] pointer-events-none"></div>

                <div class="relative z-10 font-sans">
                    ${content}
                </div>
            </div>
        `;

        const template = html`
                ${renderTechCard(html`
                    <div class="flex flex-col gap-6">
                        
                        <!-- 1. Top Section: Score & Protocol -->
                        <div class="flex items-center justify-between">
                            <!-- Condition (Left) -->
                            <div>
                                <div class="text-[10px] font-mono text-slate-400 mb-1 opacity-60 uppercase">CONDITION</div>
                                <div class="text-2xl font-black tracking-tighter" style="color: ${scoreColor}">
                                    ${label}
                                </div>
                            </div>

                            <!-- Score (Right) -->
                            <div class="flex flex-col items-end">
                                <div class="text-[10px] font-mono text-slate-400 mb-1 opacity-60 uppercase">SCORE</div>
                                <div class="flex items-baseline gap-1">
                                    <span class="text-4xl font-black text-slate-100 tracking-tighter">
                                        ${totalScore}
                                    </span>
                                    <span class="text-xs font-bold text-slate-400 opacity-60">/100</span>
                                </div>
                            </div>
                        </div>

                        <!-- 2. Middle Section: Critical & Warnings -->
                        <div class="grid grid-cols-2 gap-2">
                            <!-- Critical -->
                            <div class="p-2 rounded bg-slate-900/30 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
                                <span class="text-2xl font-black mb-1 z-10" style="color: ${summary.errors > 0 ? '#ef4444' : '#f1f5f9'}">
                                    ${summary.errors}
                                </span>
                                <div class="flex items-center gap-2 opacity-80 z-10">
                                    <span class="text-red-400 scale-75">${icons.xCircle}</span>
                                    <span class="text-[9px] font-mono text-slate-400 uppercase">Critical</span>
                                </div>
                            </div>

                            <!-- Warnings -->
                            <div class="p-2 rounded bg-slate-900/30 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
                                <span class="text-2xl font-black mb-1 z-10" style="color: ${summary.warnings > 0 ? '#f59e0b' : '#f1f5f9'}">
                                    ${summary.warnings}
                                </span>
                                <div class="flex items-center gap-2 opacity-80 z-10">
                                    <span class="text-amber-400 scale-75">${icons.alertTriangle}</span>
                                    <span class="text-[9px] font-mono text-slate-400 uppercase">Warnings</span>
                                </div>
                            </div>
                        </div>

                        <!-- 3. Bottom Section: Category Analysis -->
                         <div class="flex flex-col gap-4 pt-4 border-t border-slate-800/50">
                            <div class="flex items-center justify-between">
                                <div class="text-[10px] font-mono text-slate-400 opacity-60 uppercase">
                                    Category Analysis
                                </div>
                                <div class="text-[10px] font-bold text-slate-100 bg-slate-900/50 px-2 py-0.5 rounded-full border border-white/5">
                                    ${categories.length} ZONES
                                </div>
                            </div>
                            
                            <div class="flex flex-col gap-3">
                                ${categories.map(cat => {
            let barColor = '#94a3b8';
            if (cat.score >= 90) barColor = '#10b981';
            else if (cat.score >= 70) barColor = '#f59e0b';
            else barColor = '#ef4444';

            return html`
                                        <div class="flex flex-col gap-1.5 group/cat">
                                            <div class="flex items-center justify-between">
                                                <span class="text-xs font-bold text-slate-100 tracking-wide group-hover/cat:text-white transition-colors">${cat.name}</span>
                                                <span class="text-xs font-mono font-bold" style="color: ${barColor}">${cat.score}%</span>
                                            </div>
                                            <div class="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                                                <div 
                                                    class="h-full rounded-full transition-all duration-500 relative"
                                                    style="width: ${cat.score}%; background: ${barColor}"
                                                >
                                                     <div class="absolute right-0 top-0 bottom-0 w-2 bg-white/20"></div>
                                                </div>
                                            </div>
                                        </div>
                                    `;
        })}
                            </div>
                        </div>

                    </div>
                `)}
        `;

        render(template, this);
    }
}

customElements.define('compliance-scorecard', ComplianceScorecard);
