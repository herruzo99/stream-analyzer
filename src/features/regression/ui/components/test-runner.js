import { testSuiteActions, useTestSuiteStore } from '@/state/testSuiteStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { testSuiteManagerTemplate } from './test-suite-manager.js';

const resultCard = (res, isGlass) => {
    const cardBase = "layout-card group flex items-center justify-between p-4 transition-all hover:border-emerald-500/30";
    const cardStyle = isGlass
        ? "bg-slate-800 border border-transparent backdrop-blur-md"
        : "bg-slate-800 border border-slate-800";

    const failCardBase = "layout-card relative overflow-hidden border-l-[6px] border-l-red-500 mb-2 transition-all hover:bg-red-500/10";
    const failCardStyle = isGlass
        ? "bg-red-500/5 backdrop-blur-md"
        : "bg-slate-800 border border-slate-800"; // border-l already in base

    // PASS: Sleek, minimalist, horizontal
    if (res.passed) {
        return html`
            <div class="${cardBase} ${cardStyle}">
                <div class="flex items-center gap-4 text-emerald-400">
                     <div class="p-2 rounded-full bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_#10b981]/20">
                        ${icons.check}
                    </div>
                    <div>
                        <h4 class="font-bold text-sm text-slate-100">
                            ${res.assertion.name}
                        </h4>
                        <div class="text-[10px] font-mono opacity-60 text-slate-400 mt-0.5">
                            ${res.assertion.path} ${res.assertion.operator} ${res.assertion.value}
                        </div>
                    </div>
                </div>
                 <div class="text-[10px] font-black uppercase tracking-widest text-emerald-400/50 group-hover:text-emerald-400 transition-colors">
                    Pass
                </div>
            </div>
        `;
    }

    // FAIL: Bold, Vertical, "Terminal" Style
    return html`
        <div class="${failCardBase} ${failCardStyle}">
            <!-- Header -->
            <div class="flex items-start justify-between p-4 border-b border-red-500/10">
                 <div class="flex items-center gap-3">
                    <div class="text-red-400 animate-pulse">
                        ${icons.alertTriangle}
                    </div>
                    <div>
                        <h4 class="font-black text-base text-red-400 tracking-wide">
                            ${res.assertion.name}
                        </h4>
                         <div class="text-[11px] font-mono text-red-400/70 mt-1">
                            ${res.assertion.path}
                        </div>
                    </div>
                </div>
                <div class="px-3 py-1 rounded bg-red-500 text-[#1e293b] text-[10px] font-black uppercase tracking-widest ">
                    Failed
                </div>
            </div>

            <!-- Terminal Error Block -->
            <div class="p-4 font-mono text-xs bg-slate-800/50 text-slate-100">
                 <div class="flex items-center gap-2 text-red-400/80 mb-2 text-[10px] uppercase font-bold tracking-wider">
                    ${icons.info} Diagnostic Output
                </div>
                <div class="p-3 rounded border border-red-500/20 bg-black/40 text-red-400 shadow-inner break-all leading-relaxed">
                     > ${res.details}
                </div>
            </div>
        </div>
    `;
};

// ... (layoutStyles can be removed if unused, or kept)

export const testRunnerTemplate = (stream) => {
    const { suites, activeSuiteId, lastRunResult } = useTestSuiteStore.getState();
    const activeSuite = suites.find((s) => s.id === activeSuiteId);

    // Port: no themes in 1.2.0; solid styling throughout.
    const isGlass = false;

    // Override for metrics in glass mode to match request "transparencies appear"
    // Actually, user said "border must be gone". 
    // Let's make glass style: bg-slate-800 border-transparent/none

    const finalMetricStyle = isGlass
        ? "bg-slate-800 shadow-[0_8px_30px_rgb(0_0_0_/_0.35)] backdrop-blur-md border border-transparent"
        : "bg-slate-800 border border-slate-800";


    // Empty state - No suite selected
    if (!activeSuite) {
        const emptyStateStyle = isGlass
            ? "bg-slate-800 backdrop-blur-sm" // Icon circle
            : "bg-slate-800";

        return html`
            <div class="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                <div class="scale-150 mb-6 p-8 rounded-full border border-slate-700 shadow-2xl ${emptyStateStyle}">
                    ${icons.beaker}
                </div>
                <p class="text-sm font-bold uppercase tracking-widest">
                    Select or create a test suite
                </p>
            </div>
        `;
    }

    // Results View
    if (lastRunResult && lastRunResult.suiteId === activeSuite.id) {
        const passedPercentage = Math.round(
            (lastRunResult.passedCount / lastRunResult.totalCount) * 100
        );

        // Grading System
        let grade = 'F';
        let gradeColor = '#ef4444';
        if (passedPercentage === 100) { grade = 'A+'; gradeColor = '#10b981'; }
        else if (passedPercentage >= 90) { grade = 'A'; gradeColor = '#10b981'; }
        else if (passedPercentage >= 80) { grade = 'B'; gradeColor = '#f59e0b'; }
        else if (passedPercentage >= 70) { grade = 'C'; gradeColor = '#f59e0b'; }
        else if (passedPercentage >= 60) { grade = 'D'; gradeColor = '#ef4444'; }

        return html`
            <div class="flex flex-col h-full relative z-10 p-6 overflow-hidden">
                
                <!-- Dashboard Header (Bold) -->
                <div class="shrink-0 mb-8 flex items-center justify-between">
                     <div class="flex items-center gap-6">
                        <!-- Grade Circle -->
                        <div class="relative w-16 h-16 flex items-center justify-center rounded-full border-4 shadow-[0_0_30px_rgba(0,0,0,0.3)] backdrop-blur-xl bg-slate-800" style="border-color: ${gradeColor}; box-shadow: 0 0 20px ${gradeColor}40;">
                             <span class="text-2xl font-black tracking-tighter" style="color: ${gradeColor}">
                                 ${grade}
                            </span>
                        </div>

                        <div>
                            <h2 class="text-3xl font-black text-slate-200 tracking-tight drop-shadow-lg">
                                Results
                            </h2>
                            <div class="text-xs font-bold uppercase tracking-widest text-slate-400 opacity-70">
                                ${activeSuite.name}
                            </div>
                        </div>
                     </div>
                     
                     <button
                        @click=${() => testSuiteActions.setLastRunResult(null)}
                         class="group flex items-center gap-3 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors pr-6 pl-4 py-3 rounded-full hover:bg-slate-800 border border-slate-700/10 hover:border-slate-700"
                    >
                        <span class="transform group-hover:-translate-x-1 transition-transform">${icons.arrowLeft}</span> 
                        <span>Back to Rules</span>
                    </button>
                </div>

                <!-- Metrics Grid -->
                <div class="grid grid-cols-3 gap-6 mb-8 shrink-0">
                    <!-- Passed Metric -->
                     <div 
                        class="layout-card relative overflow-hidden p-5 transition-all hover:border-emerald-500/30 group ${finalMetricStyle}"
                    >
                        <div class="absolute top-0 right-0 p-4 opacity-10 scale-150 group-hover:scale-125 transition-transform duration-500 text-emerald-400">
                            ${icons.checkCircle}
                        </div>
                        <div class="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">
                            Passing Rules
                        </div>
                        <div class="text-3xl font-black text-emerald-400 drop-shadow-sm flex items-end gap-2">
                             ${lastRunResult.passedCount}
                             <span class="text-xs font-bold text-slate-400 mb-1 opacity-60">
                                / ${lastRunResult.totalCount}
                             </span>
                        </div>
                    </div>

                    <!-- Failed Metric -->
                    <div 
                        class="layout-card relative overflow-hidden p-5 transition-all hover:border-red-500/30 group ${finalMetricStyle}"
                    >
                         <div class="absolute top-0 right-0 p-4 opacity-10 scale-150 group-hover:scale-125 transition-transform duration-500 text-red-400">
                            ${icons.alertTriangle}
                        </div>
                        <div class="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">
                            Failing Rules
                        </div>
                        <div class="text-3xl font-black text-red-400 drop-shadow-sm">
                             ${lastRunResult.totalCount - lastRunResult.passedCount}
                        </div>
                    </div>

                     <!-- Score Metric -->
                     <div 
                        class="layout-card relative overflow-hidden p-5 ${finalMetricStyle}"
                    >
                        <div class="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">
                            Success Rate
                        </div>
                        <div class="flex items-center gap-3">
                             <div class="text-3xl font-black text-slate-100">
                                ${passedPercentage}%
                            </div>
                            <!-- Mini Progress Bar -->
                            <div class="h-2 flex-grow bg-slate-800 rounded-full overflow-hidden max-w-[100px]">
                                <div class="h-full bg-blue-500" style="width: ${passedPercentage}%"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="h-px w-full bg-slate-700/10 mb-6 shrink-0"></div>

                <!-- List Header -->
                <div class="flex justify-between items-center mb-4 px-1 shrink-0">
                     <h4 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        ${icons.list} Detailed Breakdown
                    </h4>
                </div>

                <!-- Scrollable List -->
                <div class="grow overflow-y-auto custom-scrollbar space-y-3 pb-8 pr-2">
                    ${lastRunResult.results.map(r => resultCard(r, isGlass))}
                </div>
            </div>
        `;
    }

    // Default Editor View
    return html`
        <div class="h-full flex flex-col relative z-10 overflow-hidden">
             <!-- Background Ambient -->
            <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>
             ${testSuiteManagerTemplate(activeSuite)}
        </div>
    `;
};
