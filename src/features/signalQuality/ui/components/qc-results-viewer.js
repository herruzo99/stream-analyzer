import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { useQualityStore } from '@/state/qualityStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { disposeChart, renderChart } from '@/ui/shared/charts/chart-renderer';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { html, render } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map.js';

// ... (previous constants unchanged) ...
const RADAR_METRICS = [
    {
        key: 'luma',
        label: 'Luminance',
        unit: 'Y',
        desc: 'Average brightness. Low values (<16) indicate black frames.',
    },
    {
        key: 'sharpness',
        label: 'Sharpness',
        unit: 'SI',
        desc: 'Edge frequency. Low values indicate blur or freeze.',
    },
    {
        key: 'audioLevel',
        label: 'Audio Lvl',
        unit: 'dB',
        desc: 'Normalized RMS. Low values (<-60dB) indicate silence.',
    },
    {
        key: 'contrastStdDev',
        label: 'Contrast',
        unit: 'σ',
        desc: 'Luma variance. Low values indicate washed-out video.',
    },
    {
        key: 'blockiness',
        label: 'Cleanliness',
        unit: 'Q',
        desc: 'Inverse blockiness score. Higher is cleaner.',
    },
    {
        key: 'predictedQuality',
        label: 'Quality',
        unit: '/100',
        desc: 'Predicted perceptual quality score (0-100).',
    },
    {
        key: 'banding',
        label: 'Banding',
        unit: 'Scr',
        desc: 'Banding artifact score. Lower is better.',
    },
];

const METRIC_TO_ISSUE_MAP = {
    Luminance: ['black', 'illegal'],
    'Avg Luma': ['black', 'illegal'],
    Sharpness: ['freeze', 'blur'],
    'Audio Lvl': ['silence', 'clipping'],
    'Audio Peak': ['clipping'],
    Contrast: ['flat'],
    Cleanliness: ['blocky', 'artifacts'],
    Blockiness: ['blocky'],
    Quality: ['banding', 'blocky', 'flat'],
    Banding: ['banding'],
};

const ISSUE_COLORS = {
    black: 'bg-slate-500 border-slate-400 text-slate-100',
    freeze: 'bg-cyan-600 border-cyan-400 text-cyan-100',
    silence: 'bg-purple-600 border-purple-400 text-purple-100',
    clipping: 'bg-red-600 border-red-400 text-red-100',
    illegal: 'bg-yellow-600 border-yellow-400 text-yellow-100',
    blocky: 'bg-orange-600 border-orange-400 text-orange-100',
    flat: 'bg-indigo-600 border-indigo-400 text-indigo-100',
    banding: 'bg-pink-600 border-pink-400 text-pink-100',
    letterbox: 'bg-emerald-600 border-emerald-400 text-emerald-100',
    default: 'bg-blue-600 border-blue-400 text-blue-100',
};

const safeBtoa = (str) =>
    btoa(
        encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) =>
            String.fromCharCode(parseInt(p1, 16))
        )
    );

const QC_TOOLTIP_DATA = {
    metrics: {
        'Avg Luma': {
            title: 'Average Luminance',
            what: 'Measures the average brightness of the video frame (Y-channel).',
            limits: 'Broadcast Safe: 16-235 (8-bit).',
            impact: 'Values < 16 indicate crushed blacks (loss of shadow detail). Values > 235 indicate clipped whites (loss of highlight detail).',
            technical: 'Based on BT.709 luma coefficients.',
        },
        'Audio Peak': {
            title: 'Audio Peak Level',
            what: 'The highest audio signal level detected in the frame window.',
            limits: 'Max: -0.1 dBFS (True Peak). Target: -23 LUFS (Integrated).',
            impact: 'Values > -0.1 dBFS cause digital clipping (distortion). Values < -60 dBFS indicate potential silence or audio loss.',
            technical: 'Measured in dB relative to Full Scale (dBFS).',
        },
        Sharpness: {
            title: 'Spatial Information (SI)',
            what: 'Measures the amount of edge energy or high-frequency detail in the image.',
            limits: 'No hard limit. Low values (< 5) indicate blur, black frames, or freeze.',
            impact: 'Sudden drops indicate loss of focus or stream freezing. Consistently low values suggest poor upscaling or heavy compression.',
            technical: 'Sobel-based edge detection on Luma channel.',
        },
        Cleanliness: {
            title: 'Compression Quality',
            what: 'Inverse of the Blockiness score. Higher is better.',
            limits: 'Target: > 90%. Visible Artifacts: < 60%.',
            impact: 'Low scores indicate visible macroblocking, pixelation, or compression artifacts, often due to insufficient bitrate.',
            technical: 'Detects 8x8 or 16x16 block boundaries.',
        },
        Contrast: {
            title: 'Contrast (Standard Deviation)',
            what: 'Measures the dynamic range or variance of luma values.',
            limits: 'Healthy: > 40. Washed Out: < 20.',
            impact: 'Low contrast indicates a "flat" or washed-out image, potentially due to incorrect gamma, log footage, or fog/smoke.',
            technical: 'Standard Deviation of Luma pixel values.',
        },
        Banding: {
            title: 'Banding Score',
            what: 'Detects "staircase" artifacts in smooth gradients.',
            limits: 'Visible: > 15. Severe: > 50.',
            impact: 'Visible bands in skies, walls, or smooth backgrounds. Caused by low bit-depth (8-bit) or heavy compression.',
            technical:
                'Gradient analysis detecting flat runs followed by small steps.',
        },
        Quality: {
            title: 'Predicted Quality (Pseudo-VMAF)',
            what: 'An estimated perceptual quality score (0-100) without a reference video.',
            limits: 'Excellent: 80-100. Poor: < 60.',
            impact: 'A holistic health score combining blockiness, blur, banding, and contrast. Correlates with viewer satisfaction.',
            technical: 'Weighted aggregate of no-reference metrics.',
        },
    },
    issues: {
        black: {
            title: 'Black Frame Detected',
            what: 'The video frame is nearly completely black.',
            trigger: 'Average Luminance < 16.',
            impact: 'May indicate signal loss, editing error, or intended fade-to-black. Check if duration > 2s.',
            suggestion:
                'Verify if this is a creative intent or a technical fault.',
        },
        freeze: {
            title: 'Video Freeze Detected',
            what: 'No significant motion detected between frames.',
            trigger: 'Temporal Difference ~ 0%.',
            impact: 'Indicates a stuck frame, encoder stall, or player buffer underrun.',
            suggestion: 'Check encoder logs or source feed stability.',
        },
        silence: {
            title: 'Audio Silence Detected',
            what: 'Audio level dropped below the noise floor.',
            trigger: 'RMS Level < -60 dBFS.',
            impact: 'Complete loss of audio. Critical error for broadcast.',
            suggestion: 'Check audio embedder or source routing.',
        },
        clipping: {
            title: 'Audio Clipping Detected',
            what: 'Audio signal exceeded the digital maximum.',
            trigger: 'Peak Level > -0.1 dBFS.',
            impact: 'Audible distortion (crackling/popping). Irreversible signal damage.',
            suggestion: 'Lower the source gain or check limiter settings.',
        },
        illegal: {
            title: 'Broadcast Illegal Levels',
            what: 'Luma or Chroma levels are outside safe broadcast limits.',
            trigger: 'Luma < 16 or > 235. Chroma > 240.',
            impact: 'May cause clamping or rejection by broadcast playout servers.',
            suggestion: 'Apply a legalizer or color correction.',
        },
        blocky: {
            title: 'Severe Blockiness',
            what: 'High density of compression artifacts detected.',
            trigger: 'Blockiness Score > 40.',
            impact: 'Image looks pixelated or "digital". Poor viewer experience.',
            suggestion:
                'Increase bitrate or check encoder complexity settings.',
        },
        flat: {
            title: 'Low Contrast / Flat',
            what: 'Image lacks dynamic range and looks washed out.',
            trigger: 'Contrast StdDev < 20.',
            impact: 'May indicate uncorrected Log footage or lighting issues.',
            suggestion: 'Check color grading pipeline or camera settings.',
        },
        banding: {
            title: 'Visible Banding',
            what: 'Distracting color bands visible in gradients.',
            trigger: 'Banding Score > 15.',
            impact: 'Low visual fidelity in smooth areas (sky, walls).',
            suggestion: 'Increase bitrate, use 10-bit encoding, or add dither.',
        },
        letterbox: {
            title: 'Letterbox / Pillarbox',
            what: 'Black bars detected at edges of the frame.',
            trigger: 'Active Picture Area < 100%.',
            impact: 'Aspect ratio mismatch (e.g., 4:3 content in 16:9 container).',
            suggestion: 'Verify aspect ratio settings.',
        },
    },
};

const createTooltipContent = (label, metricData, description, unit = '') => {
    const def = QC_TOOLTIP_DATA.metrics[label] || {
        title: label,
        what: description,
        limits: 'N/A',
        impact: 'N/A',
    };

    // Handle both old scalar values and new object structure
    const isObject = metricData && typeof metricData === 'object';
    const value = isObject
        ? metricData.avg?.toFixed(1) || 'N/A'
        : metricData?.toFixed(1) || 'N/A';

    const statsHtml = isObject
        ? `
        <div class="grid grid-cols-2 gap-2 mb-3 bg-slate-800/30 p-2 rounded border border-slate-700/30">
            <div>
                <div class="text-[9px] font-bold text-slate-500 uppercase">Min / Max</div>
                <div class="text-xs font-mono text-slate-200">
                    ${metricData.min?.toFixed(1) || '-'} / ${metricData.max?.toFixed(1) || '-'}
                </div>
            </div>
            <div>
                <div class="text-[9px] font-bold text-slate-500 uppercase">1% Low</div>
                <div class="text-xs font-mono text-slate-200">${metricData.p1Low?.toFixed(1) || '-'}</div>
            </div>
            <div>
                <div class="text-[9px] font-bold text-slate-500 uppercase">Variance</div>
                <div class="text-xs font-mono text-slate-200">${metricData.variance?.toFixed(2) || '-'}</div>
            </div>
             <div>
                <div class="text-[9px] font-bold text-slate-500 uppercase">Std Dev</div>
                <div class="text-xs font-mono text-slate-200">${metricData.stdDev?.toFixed(2) || '-'}</div>
            </div>
        </div>
    `
        : '';

    const content = `
        <div class="text-left min-w-[240px] max-w-[280px] p-1">
            <div class="flex justify-between items-start mb-2 border-b border-slate-700 pb-2">
                <div>
                    <div class="font-bold text-blue-300 text-xs uppercase tracking-wider">${def.title}</div>
                    <div class="text-[10px] text-slate-500 font-mono mt-0.5">METRIC</div>
                </div>
                <div class="text-right">
                    <span class="text-xl font-mono font-bold text-white">${value}</span>
                    ${unit ? `<span class="text-[10px] text-slate-400 font-bold ml-1">${unit}</span>` : ''}
                </div>
            </div>
            
            ${statsHtml}

            <div class="space-y-3">
                <div>
                    <div class="text-[9px] font-bold text-slate-500 uppercase mb-0.5">What is it?</div>
                    <div class="text-xs text-slate-300 leading-relaxed">${def.what}</div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <div class="bg-slate-800/50 p-1.5 rounded border border-slate-700/50">
                        <div class="text-[9px] font-bold text-emerald-400 uppercase mb-0.5">Limits</div>
                        <div class="text-[10px] text-slate-300 leading-tight">${def.limits}</div>
                    </div>
                    <div class="bg-slate-800/50 p-1.5 rounded border border-slate-700/50">
                        <div class="text-[9px] font-bold text-amber-400 uppercase mb-0.5">Impact</div>
                        <div class="text-[10px] text-slate-300 leading-tight">${def.impact}</div>
                    </div>
                </div>

                ${
                    def.technical
                        ? `
                <div>
                    <div class="text-[9px] font-bold text-slate-600 uppercase mb-0.5">Technical</div>
                    <div class="text-[10px] text-slate-500 italic leading-relaxed">${def.technical}</div>
                </div>
                `
                        : ''
                }
            </div>
        </div>
    `;
    return safeBtoa(content);
};

const createIssueTooltip = (issue) => {
    const def = QC_TOOLTIP_DATA.issues[issue.type] || {
        title: issue.type,
        what: 'Unknown anomaly.',
        trigger: 'N/A',
        impact: 'N/A',
        suggestion: 'Investigate manually.',
    };

    const content = `
        <div class="text-left min-w-[260px] max-w-[300px] p-1">
            <div class="flex justify-between items-start mb-2 border-b border-slate-700 pb-2">
                <div>
                    <div class="font-bold text-red-300 text-xs uppercase tracking-wider">${def.title}</div>
                    <div class="text-[10px] text-slate-500 font-mono mt-0.5">ANOMALY DETECTED</div>
                </div>
                <div class="text-right bg-red-900/30 px-2 py-1 rounded border border-red-500/20">
                    <div class="text-xs font-mono font-bold text-red-200">${issue.value}</div>
                </div>
            </div>

            <div class="space-y-3">
                <div class="flex gap-2 text-[10px] font-mono text-slate-400 bg-black/20 p-1.5 rounded">
                    <div>
                        <span class="text-slate-600 uppercase font-bold mr-1">Start:</span>
                        <span class="text-white">${issue.startTime.toFixed(3)}s</span>
                    </div>
                    <div class="w-px bg-slate-700"></div>
                    <div>
                        <span class="text-slate-600 uppercase font-bold mr-1">Dur:</span>
                        <span class="text-white">${issue.duration.toFixed(3)}s</span>
                    </div>
                </div>

                <div>
                    <div class="text-[9px] font-bold text-slate-500 uppercase mb-0.5">Description</div>
                    <div class="text-xs text-slate-300 leading-relaxed">${def.what}</div>
                </div>

                <div class="grid grid-cols-1 gap-2">
                    <div class="bg-slate-800/50 p-2 rounded border border-slate-700/50 flex gap-2 items-start">
                        <div class="mt-0.5 text-amber-500">⚠️</div>
                        <div>
                            <div class="text-[9px] font-bold text-amber-400 uppercase mb-0.5">Impact</div>
                            <div class="text-[10px] text-slate-300 leading-tight">${def.impact}</div>
                        </div>
                    </div>
                    
                    <div class="bg-slate-800/50 p-2 rounded border border-slate-700/50 flex gap-2 items-start">
                        <div class="mt-0.5 text-blue-500">💡</div>
                        <div>
                            <div class="text-[9px] font-bold text-blue-400 uppercase mb-0.5">Suggestion</div>
                            <div class="text-[10px] text-slate-300 leading-tight">${def.suggestion}</div>
                        </div>
                    </div>
                </div>

                <div class="text-[10px] text-slate-500 border-t border-slate-800 pt-2 mt-1">
                    <span class="font-bold uppercase text-[9px] mr-1">Trigger:</span> ${def.trigger}
                </div>
            </div>
        </div>
    `;
    return safeBtoa(content);
};

// function mergeAdjacentIssues(issues, gapThreshold = 0.2) {
//    if (issues.length === 0) return [];
//
//    const sorted = [...issues].sort((a, b) => a.startTime - b.startTime);
//    const merged = [];
//    let current = { ...sorted[0] };
//
//    for (let i = 1; i < sorted.length; i++) {
//        const next = sorted[i];
//        const prevEnd = current.startTime + current.duration;
//
//        if (next.startTime <= prevEnd + gapThreshold) {
//            const newEnd = Math.max(prevEnd, next.startTime + next.duration);
//            current.duration = newEnd - current.startTime;
//        } else {
//            merged.push(current);
//            current = { ...next };
//        }
//    }
//    merged.push(current);
//    return merged;
// }

class QcResultsViewer extends HTMLElement {
    constructor() {
        super();
        this._data = null;
        this._unsubscribe = null;
        this._hoverTime = null;
        /** @type {HTMLElement | null} */
        this.chartContainer = null;
        this.resizeObserver = null;
    }

    // ... (connectedCallback, disconnectedCallback, set data, updateChart same as before) ...
    connectedCallback() {
        this.classList.add('block', 'h-full', 'w-full', 'overflow-hidden');
        this.render();
        this._unsubscribe = useUiStore.subscribe(() => {
            this.render();
            this.updateChart();
        });

        this.resizeObserver = new ResizeObserver(() => {
            this.updateChart();
        });
    }

    set data(val) {
        this._data = val;
        this.render();
        requestAnimationFrame(() => this.updateChart());
    }

    disconnectedCallback() {
        if (this._unsubscribe) this._unsubscribe();
        if (this.chartContainer) {
            disposeChart(this.chartContainer);
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }

    updateChart() {
        this.chartContainer = /** @type {HTMLElement} */ (
            this.querySelector('#qc-radar-chart')
        );
        if (!this.chartContainer || !this._data) return;

        this.resizeObserver.observe(this.chartContainer);

        const { jobs, selectedJobId } = useQualityStore.getState();
        const selectedJob = jobs.get(selectedJobId);
        const metrics = selectedJob?.aggregateMetrics || {};

        const values = [
            Math.min(100, (metrics.luma?.avg || 0) / 2.55),
            Math.min(100, metrics.sharpness?.avg || 0),
            Math.min(100, Math.max(0, 100 + (metrics.audioLevel?.avg || -100))),
            Math.min(100, (metrics.contrastStdDev?.avg || 0) * 2),
            Math.max(0, 100 - (metrics.blockiness?.avg || 0)),
            Math.min(100, metrics.predictedQuality?.avg || 0),
            Math.max(0, 100 - (metrics.banding?.avg || 0)), // Inverse banding for radar (outer is better)
        ];

        const option = {
            backgroundColor: 'transparent',
            radar: {
                shape: 'circle',
                indicator: [
                    { name: 'Luminance', max: 100 },
                    { name: 'Sharpness', max: 100 },
                    { name: 'Audio Lvl', max: 100 },
                    { name: 'Contrast', max: 100 },
                    { name: 'Cleanliness', max: 100 },
                    { name: 'Quality', max: 100 },
                    { name: 'No Banding', max: 100 },
                ],
                axisName: {
                    color: '#94a3b8',
                    fontWeight: 'bold',
                    fontSize: 10,
                    padding: [3, 5],
                },
                splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
                splitArea: { show: false },
                axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
            },
            series: [
                {
                    type: 'radar',
                    data: [
                        {
                            value: values,
                            name: 'Signal Quality',
                            symbol: 'circle',
                            symbolSize: 6,
                            lineStyle: { color: '#3b82f6', width: 2 },
                            areaStyle: { color: 'rgba(59, 130, 246, 0.2)' },
                            itemStyle: { color: '#60a5fa' },
                        },
                    ],
                },
            ],
            tooltip: {
                trigger: 'item',
                confine: true,
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: '#334155',
                textStyle: { color: '#f8fafc' },
                formatter: () => {
                    return `
                        <div class="font-bold text-blue-300 border-b border-slate-600 mb-1 pb-1">Metric Values (Avg)</div>
                        <div class="grid grid-cols-[1fr,auto] gap-x-4 text-xs font-mono text-slate-300">
                            <span>Luminance:</span> <span class="text-white">${metrics.luma?.avg?.toFixed(1) || '0.0'}</span>
                            <span>Sharpness:</span> <span class="text-white">${metrics.sharpness?.avg?.toFixed(1) || '0.0'}</span>
                            <span>Audio Lvl:</span> <span class="text-white">${metrics.audioLevel?.avg?.toFixed(1) || '-inf'} dB</span>
                            <span>Contrast:</span> <span class="text-white">${metrics.contrastStdDev?.avg?.toFixed(1) || '0.0'}</span>
                            <span>Blockiness:</span> <span class="text-white">${metrics.blockiness?.avg?.toFixed(1) || '0.0'}</span>
                            <span>Quality:</span> <span class="text-white">${metrics.predictedQuality?.avg?.toFixed(1) || '0.0'}</span>
                            <span>Banding:</span> <span class="text-white">${metrics.banding?.avg?.toFixed(1) || '0.0'}</span>
                        </div>
                    `;
                },
            },
        };

        renderChart(this.chartContainer, option);
    }

    // ... [Interaction handlers unchanged] ...
    handleMouseEnterMetric(metricLabel) {
        uiActions.setHighlightedQcMetric(metricLabel);
    }

    handleMouseLeaveMetric() {
        uiActions.setHighlightedQcMetric(null);
    }

    handleMouseEnterTime(start, end) {
        uiActions.setHighlightedTimeRange({ start, end });
    }

    handleMouseLeaveTime() {
        uiActions.setHighlightedTimeRange(null);
    }

    handleMouseEnterIssue(id) {
        uiActions.setHighlightedIssueId(id);
    }

    handleMouseLeaveIssue() {
        uiActions.setHighlightedIssueId(null);
    }

    handleTimelineMouseMove(e, duration) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, x / rect.width));
        this._hoverTime = pct * duration;

        const cursor = /** @type {HTMLElement} */ (
            this.querySelector('#timeline-cursor')
        );
        const timeLabel = /** @type {HTMLElement} */ (
            this.querySelector('#timeline-time-label')
        );
        if (cursor && timeLabel) {
            cursor.style.left = `${pct * 100}%`;
            cursor.style.display = 'block';
            const { jobs, selectedJobId } = useQualityStore.getState();
            const selectedJob = jobs.get(selectedJobId);
            const startTime = selectedJob?.mediaStartTime || 0;
            timeLabel.textContent = `${(startTime + this._hoverTime).toFixed(2)}s`;
        }
    }

    handleTimelineMouseLeave() {
        this._hoverTime = null;
        const cursor = /** @type {HTMLElement} */ (
            this.querySelector('#timeline-cursor')
        );
        if (cursor) cursor.style.display = 'none';
    }

    handlePlayIssue(e, issue) {
        e.stopPropagation();
        if (this._data && this._data.streamId !== undefined) {
            analysisActions.setActiveStreamId(this._data.streamId);
        }
        uiActions.requestPlayerPlayback({
            startTime: issue.startTime,
            autoPlay: true,
        });
    }

    renderTimelineTracks(issues, duration, isLive, mediaStartTime = 0) {
        const { highlightedTimeRange, highlightedIssueId } =
            useUiStore.getState();

        const tracks = issues.reduce((acc, issue) => {
            if (!acc[issue.type]) acc[issue.type] = [];
            acc[issue.type].push(issue);
            return acc;
        }, {});

        const sortedTypes = Object.keys(tracks).sort();

        if (sortedTypes.length === 0) {
            return html`
                <div
                    class="h-24 flex items-center justify-center text-slate-600 text-xs italic"
                >
                    No timeline events detected.
                </div>
            `;
        }

        const cursorClass = isLive ? 'cursor-not-allowed' : 'cursor-pointer';

        return html`
            <div
                class="flex flex-col relative w-full select-none"
                @mousemove=${(e) => this.handleTimelineMouseMove(e, duration)}
                @mouseleave=${() => this.handleTimelineMouseLeave()}
            >
                <!-- Time Cursor -->
                <div
                    id="timeline-cursor"
                    class="absolute top-0 bottom-0 w-px bg-white z-40 pointer-events-none hidden shadow-[0_0_10px_white]"
                >
                    <div
                        class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shadow-sm"
                        id="timeline-time-label"
                    >
                        0.00s
                    </div>
                </div>

                <!-- Tracks Loop -->
                ${sortedTypes.map((type) => {
                    const rawIssues = tracks[type];
                    // MERGE ADJACENT BLOCKS FOR VISUAL SMOOTHNESS - REMOVED per user request
                    // const typeIssues = mergeAdjacentIssues(rawIssues, 0.2);
                    const typeIssues = rawIssues;
                    const colorClass =
                        ISSUE_COLORS[type] || ISSUE_COLORS.default;

                    return html`
                        <div
                            class="flex items-stretch border-b border-slate-800/50 hover:bg-white/[0.01] transition-colors group/track min-h-[36px]"
                        >
                            <div
                                class="w-24 shrink-0 flex items-center px-4 border-r border-slate-800/50"
                            >
                                <span
                                    class="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover/track:text-slate-200 transition-colors"
                                >
                                    ${type}
                                </span>
                            </div>

                            <div class="grow relative h-9">
                                ${typeIssues.map((issue) => {
                                    // Visual Clamping Logic to prevent overflow
                                    // Offset by mediaStartTime so that the timeline starts at 0 relative to the analysis window
                                    const relativeStart =
                                        issue.startTime - mediaStartTime;
                                    const effectiveStart = Math.min(
                                        relativeStart,
                                        duration
                                    );
                                    const effectiveEnd = Math.min(
                                        relativeStart + issue.duration,
                                        duration
                                    );

                                    let leftPct =
                                        (effectiveStart / duration) * 100;
                                    let widthPct =
                                        ((effectiveEnd - effectiveStart) /
                                            duration) *
                                        100;

                                    // Ensure minimum visibility without overflowing container
                                    const MIN_WIDTH_PCT = 0.2;
                                    if (widthPct < MIN_WIDTH_PCT) {
                                        widthPct = MIN_WIDTH_PCT;
                                        // Adjust left if we hit the right edge
                                        if (leftPct + widthPct > 100) {
                                            leftPct = 100 - widthPct;
                                        }
                                    }

                                    let isHighlighted =
                                        highlightedIssueId === issue.id;
                                    if (
                                        !isHighlighted &&
                                        highlightedTimeRange &&
                                        !highlightedIssueId
                                    ) {
                                        const { start, end } =
                                            highlightedTimeRange;
                                        const iStart = issue.startTime;
                                        const iEnd =
                                            issue.startTime + issue.duration;
                                        if (iEnd >= start && iStart <= end)
                                            isHighlighted = true;
                                    }

                                    const styles = styleMap({
                                        left: `${leftPct}%`,
                                        width: `${widthPct}%`,
                                    });

                                    const baseClass = `absolute top-1.5 bottom-1.5 rounded-md border ${cursorClass} transition-all duration-100`;
                                    const activeClass = isHighlighted
                                        ? 'opacity-100 z-30 scale-y-125 shadow-lg shadow-black/50 ring-2 ring-white'
                                        : 'opacity-80 z-10 hover:opacity-100 hover:z-20 hover:scale-y-110';

                                    const classes = `${baseClass} ${colorClass} ${activeClass} ${tooltipTriggerClasses}`;
                                    const tooltipB64 =
                                        createIssueTooltip(issue);

                                    // Disable click if live
                                    const clickHandler = isLive
                                        ? null
                                        : (e) => this.handlePlayIssue(e, issue);

                                    return html`
                                        <div
                                            class="${classes}"
                                            style="${styles}"
                                            data-tooltip-html-b64="${tooltipB64}"
                                            @mouseenter=${() => {
                                                this.handleMouseEnterIssue(
                                                    issue.id
                                                );
                                                this.handleMouseEnterMetric(
                                                    issue.type
                                                );
                                                this.handleMouseEnterTime(
                                                    issue.startTime,
                                                    issue.startTime +
                                                        issue.duration
                                                );
                                            }}
                                            @mouseleave=${() => {
                                                this.handleMouseLeaveIssue();
                                                this.handleMouseLeaveMetric();
                                                this.handleMouseLeaveTime();
                                            }}
                                            @click=${clickHandler}
                                        ></div>
                                    `;
                                })}
                            </div>
                        </div>
                    `;
                })}

                <!-- Ruler -->
                <div
                    class="flex h-6 border-t border-slate-800 text-[9px] text-slate-500 font-mono relative mt-1"
                >
                    <div
                        class="w-24 shrink-0 border-r border-slate-800 bg-slate-900/50"
                    ></div>
                    <div class="grow relative">
                        <span class="absolute left-1 top-1"
                            >${mediaStartTime.toFixed(0)}s</span
                        >
                        <span
                            class="absolute left-1/4 top-1 border-l border-slate-800 h-2 pl-1"
                            >${(mediaStartTime + duration * 0.25).toFixed(
                                0
                            )}s</span
                        >
                        <span
                            class="absolute left-1/2 top-1 border-l border-slate-800 h-2 pl-1"
                            >${(mediaStartTime + duration * 0.5).toFixed(
                                0
                            )}s</span
                        >
                        <span
                            class="absolute left-3/4 top-1 border-l border-slate-800 h-2 pl-1"
                            >${(mediaStartTime + duration * 0.75).toFixed(
                                0
                            )}s</span
                        >
                        <span class="absolute right-1 top-1"
                            >${(mediaStartTime + duration).toFixed(1)}s</span
                        >
                    </div>
                </div>
            </div>
        `;
    }

    renderStatCard(
        label,
        metricData,
        unit,
        icon,
        color = 'text-white',
        isInverse = false
    ) {
        const { highlightedQcMetric } = useUiStore.getState();
        const isHighlighted = highlightedQcMetric === label;

        const activeClass = isHighlighted
            ? 'ring-2 ring-blue-500 bg-blue-900/20 shadow-lg shadow-blue-900/10 scale-[1.02]'
            : 'hover:bg-slate-800/50 hover:border-slate-700 bg-slate-900/40';

        // Handle object vs scalar vs null
        const isObject = metricData && typeof metricData === 'object';
        let rawValue = isObject ? metricData.avg : metricData;

        // Special case for Cleanliness (Inverse Blockiness)
        if (isInverse && rawValue !== undefined && rawValue !== null) {
            rawValue = 100 - rawValue;
        }

        const isNA = rawValue === null || rawValue === undefined;
        const displayValue = isNA
            ? 'N/A'
            : typeof rawValue === 'number'
              ? rawValue.toFixed(1)
              : rawValue;
        const displayColor = isNA ? 'text-slate-500' : color;
        const opacityClass = isNA ? 'opacity-60 grayscale' : 'opacity-100';

        const metricDef = RADAR_METRICS.find((m) => m.label === label) || {
            desc: 'Performance metric',
            unit,
        };
        const unitLabel = unit || metricDef.unit;

        // Pass full metricData to tooltip creator
        const tooltipB64 = createTooltipContent(
            label,
            metricData,
            metricDef.desc,
            unitLabel
        );

        return html`
            <div
                @mouseenter=${() => this.handleMouseEnterMetric(label)}
                @mouseleave=${() => this.handleMouseLeaveMetric()}
                class="border border-slate-800 p-4 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 ${activeClass} ${opacityClass} ${tooltipTriggerClasses}"
                data-tooltip-html-b64="${tooltipB64}"
            >
                <div>
                    <div
                        class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1"
                    >
                        ${label}
                    </div>
                    <div
                        class="text-2xl font-mono font-black ${displayColor} tracking-tight"
                    >
                        ${displayValue}<span
                            class="text-sm text-slate-600 ml-1 font-bold"
                            >${unitLabel}</span
                        >
                    </div>
                </div>
                <div class="text-slate-700 scale-125">${icon}</div>
            </div>
        `;
    }

    downloadCSV() {
        if (!this._data) return;
        const { jobs, selectedJobId } = useQualityStore.getState();
        const selectedJob = jobs.get(selectedJobId);
        if (!selectedJob || !selectedJob.frameMetrics) return;

        const headers = [
            'Frame',
            'Segment',
            'Relative Time (s)',
            'Absolute Time (s)',
            'Luma',
            'Sharpness',
            'Audio Level (dB)',
            'Audio Peak (dB)',
            'Blockiness',
            'Contrast',
            'Quality',
            'Banding',
        ];
        const rows = selectedJob.frameMetrics.map((m) => [
            m.frameIndex ?? '',
            m.segment ?? '',
            m.timestamp?.toFixed(3) ?? '',
            m.actualTimestamp?.toFixed(3) ?? '',
            m.luma?.toFixed(2) ?? '',
            m.sharpness?.toFixed(2) ?? '',
            m.audioLevel?.toFixed(2) ?? '',
            m.peakAudioLevel?.toFixed(2) ?? '',
            m.blockiness?.toFixed(2) ?? '',
            m.contrastStdDev?.toFixed(2) ?? '',
            m.predictedQuality?.toFixed(2) ?? '',
            m.banding?.toFixed(2) ?? '',
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute(
            'download',
            `qc_analysis_${this._data.streamId}_${new Date().toISOString()}.csv`
        );
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    downloadIssuesCSV() {
        if (!this._data) return;
        const { issues } = this._data;
        if (!issues || issues.length === 0) return;

        const headers = [
            'ID',
            'Type',
            'Relative Start (s)',
            'Duration (s)',
            'Value',
            'Severity',
        ];
        const rows = issues.map((i) => [
            i.id,
            i.type,
            i.startTime.toFixed(3),
            i.duration.toFixed(3),
            i.value,
            i.severity || 'warning',
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute(
            'download',
            `qc_issues_${this._data.streamId}_${new Date().toISOString()}.csv`
        );
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    render() {
        if (!this._data) return;
        const { issues, scanDuration, onReset, streamId } = this._data;

        const { jobs, selectedJobId } = useQualityStore.getState();
        const { streams } = useAnalysisStore.getState();

        const selectedJob = jobs.get(selectedJobId);
        const metrics = selectedJob?.aggregateMetrics || {};

        // Resolve stream isLive status for this job
        const stream = streams.find((s) => s.id === streamId);
        const isLive = stream?.manifest?.type === 'dynamic';

        // --- Track Details Rendering ---
        const { trackDetails } = selectedJob || {};

        let videoLabel = trackDetails?.video;
        if (trackDetails?.video && stream) {
            const t = stream.manifest?.summary?.videoTracks.find(
                (vt) => vt.id === trackDetails.video
            );
            if (t)
                videoLabel =
                    t.label ||
                    t.resolutions?.[0]?.value ||
                    t.height ||
                    trackDetails.video;
        }

        let audioLabel = trackDetails?.audio;
        if (trackDetails?.audio && stream) {
            const t = stream.manifest?.summary?.audioTracks.find(
                (at) => at.id === trackDetails.audio
            );
            if (t)
                audioLabel =
                    t.label || t.lang?.toUpperCase() || trackDetails.audio;
        }

        const videoBadge = videoLabel
            ? html`
                  <span
                      class="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/20 text-blue-300 border border-blue-500/20 font-bold flex items-center gap-1"
                  >
                      ${icons.clapperboard} ${videoLabel}
                  </span>
              `
            : '';
        const audioBadge = audioLabel
            ? html`
                  <span
                      class="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/20 text-purple-300 border border-purple-500/20 font-bold uppercase flex items-center gap-1"
                  >
                      ${icons.audioLines} ${audioLabel}
                  </span>
              `
            : '';

        const {
            highlightedQcMetric,
            highlightedTimeRange,
            highlightedIssueId,
        } = useUiStore.getState();
        const score = Math.round(metrics.qualityScore?.avg || 0);
        const scoreColor =
            score > 80
                ? 'text-emerald-400'
                : score > 60
                  ? 'text-amber-400'
                  : 'text-red-400';

        const isIdHoverActive = !!highlightedIssueId;
        const isTimeHoverActive = !!highlightedTimeRange;
        const targetTypes =
            !isIdHoverActive && !isTimeHoverActive && highlightedQcMetric
                ? METRIC_TO_ISSUE_MAP[highlightedQcMetric] || [
                      highlightedQcMetric,
                  ]
                : [];

        const template = html`
            <div
                class="h-full flex flex-col bg-slate-950 text-slate-200 overflow-hidden"
            >
                <!-- Header -->
                <div
                    class="shrink-0 p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center"
                >
                    <div>
                        <div class="flex items-center gap-3">
                            <h1
                                class="text-2xl font-black text-white tracking-tight flex items-center gap-2"
                            >
                                ${icons.shieldCheck} Report Details
                            </h1>
                            <div class="flex items-center gap-2">
                                ${videoBadge} ${audioBadge}
                            </div>
                        </div>
                        <p class="text-xs text-slate-400 font-mono mt-1">
                            Status: ${selectedJob?.status || 'Complete'}
                        </p>
                    </div>
                    <div class="flex items-center gap-3">
                        <button
                            @click=${() => this.downloadCSV()}
                            class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
                        >
                            ${icons.download} Export Metrics
                        </button>
                        <button
                            @click=${() => this.downloadIssuesCSV()}
                            class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-red-900/20"
                        >
                            ${icons.alertTriangle} Export Issues
                        </button>
                        <button
                            @click=${onReset}
                            class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-slate-700 transition-all flex items-center gap-2"
                        >
                            ${icons.arrowLeft} Back to Grid
                        </button>
                    </div>
                </div>

                <div
                    class="grow overflow-y-auto custom-scrollbar p-6 space-y-6"
                >
                    <!-- Top Stats Grid -->
                    <div
                        class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[280px]"
                    >
                        <!-- ECharts Radar & Score -->
                        <div
                            class="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex relative overflow-hidden group"
                        >
                            <div
                                class="absolute top-4 left-4 z-10 pointer-events-none"
                            >
                                <div
                                    class="text-xs font-bold text-slate-500 uppercase tracking-wider"
                                >
                                    Quality Score
                                </div>
                                <div
                                    class="text-5xl font-black ${scoreColor} mt-1 drop-shadow-md"
                                >
                                    ${score}
                                </div>
                            </div>
                            <div
                                id="qc-radar-chart"
                                class="w-full h-full"
                            ></div>
                        </div>

                        <!-- Key Metrics -->
                        <div
                            class="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4"
                        >
                            ${this.renderStatCard(
                                'Avg Luma',
                                metrics.luma,
                                'Y',
                                icons.sun,
                                'text-blue-400'
                            )}
                            ${this.renderStatCard(
                                'Audio Peak',
                                metrics.peakAudioLevel,
                                'dB',
                                icons.volumeUp,
                                metrics.peakAudioLevel?.avg > -1
                                    ? 'text-red-400'
                                    : 'text-pink-400'
                            )}
                            ${this.renderStatCard(
                                'Sharpness',
                                metrics.sharpness,
                                '',
                                icons.camera
                            )}
                            ${this.renderStatCard(
                                'Cleanliness',
                                metrics.blockiness,
                                '%',
                                icons.grid,
                                metrics.blockiness?.avg > 20
                                    ? 'text-amber-400'
                                    : 'text-slate-300',
                                true
                            )}
                            ${this.renderStatCard(
                                'Contrast',
                                metrics.contrastStdDev,
                                'SD',
                                icons.activity
                            )}
                            ${this.renderStatCard(
                                'Banding',
                                metrics.banding,
                                'Scr',
                                icons.layers,
                                metrics.banding?.avg > 15
                                    ? 'text-pink-400'
                                    : 'text-slate-300'
                            )}
                            ${this.renderStatCard(
                                'Quality',
                                metrics.predictedQuality,
                                '/100',
                                icons.star,
                                score > 80
                                    ? 'text-emerald-400'
                                    : 'text-amber-400'
                            )}
                            ${this.renderStatCard(
                                'Issues',
                                issues.length,
                                '',
                                icons.alertTriangle,
                                issues.length > 0
                                    ? 'text-red-400'
                                    : 'text-emerald-400'
                            )}
                        </div>
                    </div>

                    <!-- Swimlane Timeline -->
                    <div
                        class="bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden"
                    >
                        <div
                            class="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center"
                        >
                            <h3
                                class="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2"
                            >
                                ${icons.history} Issue Timeline
                            </h3>
                            <span class="text-[10px] text-slate-500 font-mono"
                                >0s - ${scanDuration}s</span
                            >
                        </div>
                        <div class="bg-slate-950/50">
                            ${this.renderTimelineTracks(
                                issues,
                                scanDuration,
                                isLive,
                                selectedJob?.mediaStartTime || 0
                            )}
                        </div>
                    </div>

                    <!-- Issues Table -->
                    <div
                        class="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-[300px]"
                    >
                        <div
                            class="grid grid-cols-[80px_120px_1fr_100px_80px] gap-4 px-6 py-3 bg-slate-950 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10"
                        >
                            <div>Time</div>
                            <div>Type</div>
                            <div>Value / Details</div>
                            <div class="text-right">Duration</div>
                            <div class="text-right">Action</div>
                        </div>
                        <div
                            class="divide-y divide-slate-800/50 bg-slate-900/50"
                        >
                            ${issues.length === 0
                                ? html`<div
                                      class="p-12 text-center text-slate-500 italic"
                                  >
                                      No anomalies detected. Stream is clean.
                                  </div>`
                                : issues.map((issue, idx) => {
                                      const tooltipB64 =
                                          createIssueTooltip(issue);

                                      let isHighlighted = false;
                                      if (isIdHoverActive) {
                                          if (issue.id === highlightedIssueId)
                                              isHighlighted = true;
                                      } else if (isTimeHoverActive) {
                                          const { start, end } =
                                              highlightedTimeRange;
                                          const iStart = issue.startTime;
                                          const iEnd =
                                              issue.startTime + issue.duration;
                                          if (iEnd >= start && iStart <= end) {
                                              isHighlighted = true;
                                          }
                                      } else {
                                          if (targetTypes.includes(issue.type))
                                              isHighlighted = true;
                                          if (
                                              highlightedQcMetric === issue.type
                                          )
                                              isHighlighted = true;
                                      }

                                      const highlightClass = isHighlighted
                                          ? 'bg-blue-500/20 ring-1 ring-blue-500 z-10 relative shadow-md'
                                          : 'hover:bg-slate-800/50 bg-transparent';

                                      const onRowEnter = () => {
                                          this.handleMouseEnterIssue(issue.id);
                                          let metricKey = issue.type;
                                          for (const [
                                              key,
                                              types,
                                          ] of Object.entries(
                                              METRIC_TO_ISSUE_MAP
                                          )) {
                                              if (types.includes(issue.type)) {
                                                  metricKey = key;
                                                  break;
                                              }
                                          }
                                          this.handleMouseEnterMetric(
                                              metricKey
                                          );
                                          this.handleMouseEnterTime(
                                              issue.startTime,
                                              issue.startTime + issue.duration
                                          );
                                      };

                                      const onRowLeave = () => {
                                          this.handleMouseLeaveIssue();
                                          this.handleMouseLeaveMetric();
                                          this.handleMouseLeaveTime();
                                      };

                                      return html`
                                          <div
                                              id="issue-row-${idx}"
                                              @mouseenter=${onRowEnter}
                                              @mouseleave=${onRowLeave}
                                              class="grid grid-cols-[80px_120px_1fr_100px_80px] gap-4 px-6 py-3 text-xs transition-colors items-center group ${highlightClass} ${tooltipTriggerClasses}"
                                              data-tooltip-html-b64="${tooltipB64}"
                                          >
                                              <div
                                                  class="font-mono text-slate-400"
                                              >
                                                  ${issue.startTime.toFixed(2)}s
                                              </div>
                                              <div>
                                                  <span
                                                      class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-slate-800 border-slate-700 text-red-300"
                                                  >
                                                      ${issue.type}
                                                  </span>
                                              </div>
                                              <div
                                                  class="font-mono text-slate-300 truncate pr-4"
                                              >
                                                  ${issue.value}
                                              </div>
                                              <div
                                                  class="text-right font-mono text-slate-500"
                                              >
                                                  ${issue.duration.toFixed(3)}s
                                              </div>
                                              <div class="text-right">
                                                  ${isLive
                                                      ? html` <span
                                                            class="text-slate-600 text-[10px] cursor-not-allowed ${tooltipTriggerClasses}"
                                                            data-tooltip="Replay disabled for Live stream"
                                                        >
                                                            ${icons.play}
                                                        </span>`
                                                      : html` <button
                                                            @click=${(e) =>
                                                                this.handlePlayIssue(
                                                                    e,
                                                                    issue
                                                                )}
                                                            class="p-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Play at this time"
                                                        >
                                                            ${icons.play}
                                                        </button>`}
                                              </div>
                                          </div>
                                      `;
                                  })}
                        </div>
                    </div>
                </div>
            </div>
        `;
        render(template, this);
    }
}
customElements.define('qc-results-viewer', QcResultsViewer);
export const qcResultsTemplate = (data) =>
    html`<qc-results-viewer .data=${data}></qc-results-viewer>`;
