import { testSuiteActions, useTestSuiteStore } from '@/state/testSuiteStore';
import { useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { testSuiteManagerTemplate } from './test-suite-manager.js';

const resultCard = (res, isGlass) => {
    const cardBase = "layout-card group flex items-center justify-between p-4 transition-all hover:border-[var(--color-success)]/30";
    const cardStyle = isGlass
        ? "bg-[var(--bg-glass-B-2)] border border-transparent backdrop-blur-md"
        : "bg-[var(--bg-surface-B-panel)] border border-[var(--border-on-B)]";

    const failCardBase = "layout-card relative overflow-hidden border-l-[6px] border-l-[var(--color-error)] mb-2 transition-all hover:bg-[var(--color-error)]/10";
    const failCardStyle = isGlass
        ? "bg-[var(--color-error)]/5 backdrop-blur-md"
        : "bg-[var(--bg-surface-B-panel)] border border-[var(--border-on-B)]"; // border-l already in base

    // PASS: Sleek, minimalist, horizontal
    if (res.passed) {
        return html`
            <div class="${cardBase} ${cardStyle}">
                <div class="flex items-center gap-4 text-[var(--color-success)]">
                     <div class="p-2 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] shadow-[0_0_10px_var(--color-success)]/20">
                        ${icons.check}
                    </div>
                    <div>
                        <h4 class="font-bold text-sm text-[var(--text-on-B-primary)]">
                            ${res.assertion.name}
                        </h4>
                        <div class="text-[10px] font-mono opacity-60 text-[var(--text-on-B-secondary)] mt-0.5">
                            ${res.assertion.path} ${res.assertion.operator} ${res.assertion.value}
                        </div>
                    </div>
                </div>
                 <div class="text-[10px] font-black uppercase tracking-widest text-[var(--color-success)]/50 group-hover:text-[var(--color-success)] transition-colors">
                    Pass
                </div>
            </div>
        `;
    }

    // FAIL: Bold, Vertical, "Terminal" Style
    return html`
        <div class="${failCardBase} ${failCardStyle}">
            <!-- Header -->
            <div class="flex items-start justify-between p-4 border-b border-[var(--color-error)]/10">
                 <div class="flex items-center gap-3">
                    <div class="text-[var(--color-error)] animate-pulse">
                        ${icons.alertTriangle}
                    </div>
                    <div>
                        <h4 class="font-black text-base text-[var(--color-error)] tracking-wide">
                            ${res.assertion.name}
                        </h4>
                         <div class="text-[11px] font-mono text-[var(--color-error)]/70 mt-1">
                            ${res.assertion.path}
                        </div>
                    </div>
                </div>
                <div class="px-3 py-1 rounded bg-[var(--color-error)] text-[var(--bg-surface-B-panel)] text-[10px] font-black uppercase tracking-widest ">
                    Failed
                </div>
            </div>

            <!-- Terminal Error Block -->
            <div class="p-4 font-mono text-xs bg-[var(--bg-surface-B-panel)]/50 text-[var(--text-on-B-primary)]">
                 <div class="flex items-center gap-2 text-[var(--color-error)]/80 mb-2 text-[10px] uppercase font-bold tracking-wider">
                    ${icons.info} Diagnostic Output
                </div>
                <div class="p-3 rounded border border-[var(--color-error)]/20 bg-black/40 text-[var(--color-error)] shadow-inner break-all leading-relaxed">
                     > ${res.details}
                </div>
            </div>
        </div>
    `;
};

// ... (layoutStyles can be removed if unused, or kept)

export const testRunnerTemplate = (stream) => {
    const { suites, activeSuiteId, lastRunResult } = useTestSuiteStore.getState();
    const { shell } = useUiStore.getState();
    const activeSuite = suites.find((s) => s.id === activeSuiteId);

    const isGlass = shell.config.activeThemeId.includes('glass');
    const metricCardStyle = isGlass
        ? "bg-[var(--bg-glass-B-3)] shadow-[var(--region-shadow)] backdrop-blur-md border border-[var(--border-on-B)]" // Keep border even in glass for metrics? No, user said "border must be gone".
        : "bg-[var(--bg-surface-B-panel)] border border-[var(--border-on-B)]";

    // Override for metrics in glass mode to match request "transparencies appear"
    // Actually, user said "border must be gone". 
    // Let's make glass style: bg-[var(--bg-glass-B-3)] border-transparent/none

    const finalMetricStyle = isGlass
        ? "bg-[var(--bg-glass-B-3)] shadow-[var(--region-shadow)] backdrop-blur-md border border-transparent"
        : "bg-[var(--bg-surface-B-panel)] border border-[var(--border-on-B)]";


    // Empty state - No suite selected
    if (!activeSuite) {
        const emptyStateStyle = isGlass
            ? "bg-[var(--bg-surface-B-panel)] backdrop-blur-sm" // Icon circle
            : "bg-[var(--bg-surface-B-panel)]";

        return html`
            <div class="flex flex-col items-center justify-center h-full text-[var(--text-on-A-secondary)] opacity-60">
                <div class="scale-150 mb-6 p-8 rounded-full border border-[var(--border-on-A)] shadow-2xl ${emptyStateStyle}">
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
        let gradeColor = 'var(--color-error)';
        if (passedPercentage === 100) { grade = 'A+'; gradeColor = 'var(--color-success)'; }
        else if (passedPercentage >= 90) { grade = 'A'; gradeColor = 'var(--color-success)'; }
        else if (passedPercentage >= 80) { grade = 'B'; gradeColor = 'var(--color-warning)'; }
        else if (passedPercentage >= 70) { grade = 'C'; gradeColor = 'var(--color-warning)'; }
        else if (passedPercentage >= 60) { grade = 'D'; gradeColor = 'var(--color-error)'; }

        return html`
            <div class="flex flex-col h-full relative z-10 p-6 overflow-hidden">
                
                <!-- Dashboard Header (Bold) -->
                <div class="shrink-0 mb-8 flex items-center justify-between">
                     <div class="flex items-center gap-6">
                        <!-- Grade Circle -->
                        <div class="relative w-16 h-16 flex items-center justify-center rounded-full border-4 shadow-[0_0_30px_rgba(0,0,0,0.3)] backdrop-blur-xl bg-[var(--bg-glass-B-6)]" style="border-color: ${gradeColor}; box-shadow: 0 0 20px ${gradeColor}40;">
                             <span class="text-2xl font-black tracking-tighter" style="color: ${gradeColor}">
                                 ${grade}
                            </span>
                        </div>

                        <div>
                            <h2 class="text-3xl font-black text-[var(--text-on-A-primary)] tracking-tight drop-shadow-lg">
                                Results
                            </h2>
                            <div class="text-xs font-bold uppercase tracking-widest text-[var(--text-on-A-secondary)] opacity-70">
                                ${activeSuite.name}
                            </div>
                        </div>
                     </div>
                     
                     <button
                        @click=${() => testSuiteActions.setLastRunResult(null)}
                         class="group flex items-center gap-3 text-xs font-bold text-[var(--text-on-A-secondary)] hover:text-[var(--text-on-A-primary)] transition-colors pr-6 pl-4 py-3 rounded-full hover:bg-[var(--bg-surface-B-panel)] border border-[var(--border-on-A)]/10 hover:border-[var(--border-on-A)]"
                    >
                        <span class="transform group-hover:-translate-x-1 transition-transform">${icons.arrowLeft}</span> 
                        <span>Back to Rules</span>
                    </button>
                </div>

                <!-- Metrics Grid -->
                <div class="grid grid-cols-3 gap-6 mb-8 shrink-0">
                    <!-- Passed Metric -->
                     <div 
                        class="layout-card relative overflow-hidden p-5 transition-all hover:border-[var(--color-success)]/30 group ${finalMetricStyle}"
                    >
                        <div class="absolute top-0 right-0 p-4 opacity-10 scale-150 group-hover:scale-125 transition-transform duration-500 text-[var(--color-success)]">
                            ${icons.checkCircle}
                        </div>
                        <div class="text-[10px] uppercase tracking-widest text-[var(--text-on-B-secondary)] font-bold mb-1">
                            Passing Rules
                        </div>
                        <div class="text-3xl font-black text-[var(--color-success)] drop-shadow-sm flex items-end gap-2">
                             ${lastRunResult.passedCount}
                             <span class="text-xs font-bold text-[var(--text-on-B-secondary)] mb-1 opacity-60">
                                / ${lastRunResult.totalCount}
                             </span>
                        </div>
                    </div>

                    <!-- Failed Metric -->
                    <div 
                        class="layout-card relative overflow-hidden p-5 transition-all hover:border-[var(--color-error)]/30 group ${finalMetricStyle}"
                    >
                         <div class="absolute top-0 right-0 p-4 opacity-10 scale-150 group-hover:scale-125 transition-transform duration-500 text-[var(--color-error)]">
                            ${icons.alertTriangle}
                        </div>
                        <div class="text-[10px] uppercase tracking-widest text-[var(--text-on-B-secondary)] font-bold mb-1">
                            Failing Rules
                        </div>
                        <div class="text-3xl font-black text-[var(--color-error)] drop-shadow-sm">
                             ${lastRunResult.totalCount - lastRunResult.passedCount}
                        </div>
                    </div>

                     <!-- Score Metric -->
                     <div 
                        class="layout-card relative overflow-hidden p-5 ${finalMetricStyle}"
                    >
                        <div class="text-[10px] uppercase tracking-widest text-[var(--text-on-B-secondary)] font-bold mb-1">
                            Success Rate
                        </div>
                        <div class="flex items-center gap-3">
                             <div class="text-3xl font-black text-[var(--text-on-B-primary)]">
                                ${passedPercentage}%
                            </div>
                            <!-- Mini Progress Bar -->
                            <div class="h-2 flex-grow bg-[var(--bg-surface-B-panel)] rounded-full overflow-hidden max-w-[100px]">
                                <div class="h-full bg-[var(--primary-accent)]" style="width: ${passedPercentage}%"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="h-px w-full bg-[var(--border-on-A)]/10 mb-6 shrink-0"></div>

                <!-- List Header -->
                <div class="flex justify-between items-center mb-4 px-1 shrink-0">
                     <h4 class="text-xs font-black text-[var(--text-on-A-secondary)] uppercase tracking-[0.2em] flex items-center gap-2">
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
            <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--primary-accent)]/5 rounded-full blur-[120px] pointer-events-none"></div>
             ${testSuiteManagerTemplate(activeSuite)}
        </div>
    `;
};
