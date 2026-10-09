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
    black: 'text-slate-100 bg-slate-800 border-slate-800',
    freeze: 'text-blue-400 bg-blue-500/10 border-blue-500',
    silence:
        'text-purple-300 bg-slate-700 border-purple-500',
    clipping:
        'text-red-400 bg-red-500/10 border-red-500',
    illegal:
        'text-amber-400 bg-amber-500/10 border-amber-500',
    blocky: 'text-amber-400 bg-amber-500/10 border-amber-500',
    flat: 'text-teal-300 bg-slate-700 border-teal-500',
    banding:
        'text-teal-300 bg-slate-700 border-teal-500',
    letterbox:
        'text-emerald-400 bg-emerald-500/10 border-emerald-500',
    default:
        'text-blue-400 bg-slate-700 border-blue-500',
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
        <div class="grid grid-cols-2 gap-2 mb-3 bg-slate-800 p-2 rounded border border-slate-800/50">
            <div>
                <div class="text-[9px] font-bold text-slate-400 uppercase">Min / Max</div>
                <div class="text-xs font-mono text-slate-100">
                    ${metricData.min?.toFixed(1) || '-'} / ${metricData.max?.toFixed(1) || '-'}
                </div>
            </div>
            <div>
                <div class="text-[9px] font-bold text-slate-400 uppercase">1% Low</div>
                <div class="text-xs font-mono text-slate-100">${metricData.p1Low?.toFixed(1) || '-'}</div>
            </div>
            <div>
                <div class="text-[9px] font-bold text-slate-400 uppercase">Variance</div>
                <div class="text-xs font-mono text-slate-100">${metricData.variance?.toFixed(2) || '-'}</div>
            </div>
             <div>
                <div class="text-[9px] font-bold text-slate-400 uppercase">Std Dev</div>
                <div class="text-xs font-mono text-slate-100">${metricData.stdDev?.toFixed(2) || '-'}</div>
            </div>
        </div>
    `
        : '';

    const content = `
        <div class="text-left min-w-[240px] max-w-[280px] p-2 bg-slate-800 border border-slate-800 rounded-lg shadow-2xl backdrop-blur-3xl">
            <div class="flex justify-between items-start mb-2 border-b border-slate-800/50 pb-2">
                <div>
                    <div class="font-bold text-blue-400 text-xs uppercase tracking-wider">${def.title}</div>
                    <div class="text-[10px] text-slate-400 font-mono mt-0.5">METRIC</div>
                </div>
                <div class="text-right">
                    <span class="text-xl font-mono font-bold text-slate-100">${value}</span>
                    ${unit ? `<span class="text-[10px] text-slate-400 font-bold ml-1">${unit}</span>` : ''}
                </div>
            </div>
            
            ${statsHtml}

            <div class="space-y-3">
                <div>
                    <div class="text-[9px] font-bold text-slate-400 uppercase mb-0.5">What is it?</div>
                    <div class="text-xs text-slate-100 leading-relaxed">${def.what}</div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <div class="bg-slate-800 p-1.5 rounded border border-slate-800/50">
                        <div class="text-[9px] font-bold text-emerald-400 uppercase mb-0.5">Limits</div>
                        <div class="text-[10px] text-slate-100 leading-tight">${def.limits}</div>
                    </div>
                    <div class="bg-slate-800 p-1.5 rounded border border-slate-800/50">
                        <div class="text-[9px] font-bold text-amber-400 uppercase mb-0.5">Impact</div>
                        <div class="text-[10px] text-slate-100 leading-tight">${def.impact}</div>
                    </div>
                </div>

                ${def.technical
            ? `
                <div>
                    <div class="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Technical</div>
                    <div class="text-[10px] text-slate-400 italic leading-relaxed">${def.technical}</div>
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
        <div class="text-left min-w-[260px] max-w-[300px] p-2 bg-slate-800 border border-slate-800 rounded-lg shadow-2xl backdrop-blur-3xl">
            <div class="flex justify-between items-start mb-2 border-b border-slate-800/50 pb-2">
                <div>
                    <div class="font-bold text-red-400 text-xs uppercase tracking-wider">${def.title}</div>
                    <div class="text-[10px] text-slate-400 font-mono mt-0.5">ANOMALY DETECTED</div>
                </div>
                <div class="text-right bg-red-500/10 px-2 py-1 rounded border border-red-500">
                    <div class="text-xs font-mono font-bold text-red-400">${issue.value}</div>
                </div>
            </div>

            <div class="space-y-3">
                <div class="flex gap-2 text-[10px] font-mono text-slate-400 bg-slate-800 p-1.5 rounded border border-slate-800/50">
                    <div>
                        <span class="text-slate-400 uppercase font-bold mr-1">Start:</span>
                        <span class="text-slate-100">${issue.startTime.toFixed(3)}s</span>
                    </div>
                    <div class="w-px bg-slate-800/50"></div>
                    <div>
                        <span class="text-slate-400 uppercase font-bold mr-1">Dur:</span>
                        <span class="text-slate-100">${issue.duration.toFixed(3)}s</span>
                    </div>
                </div>

                <div>
                    <div class="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Description</div>
                    <div class="text-xs text-slate-100 leading-relaxed">${def.what}</div>
                </div>

                <div class="grid grid-cols-1 gap-2">
                    <div class="bg-slate-800 p-2 rounded border border-slate-800/50 flex gap-2 items-start">
                        <div class="mt-0.5 text-amber-400">⚠️</div>
                        <div>
                            <div class="text-[9px] font-bold text-amber-400 uppercase mb-0.5">Impact</div>
                            <div class="text-[10px] text-slate-100 leading-tight">${def.impact}</div>
                        </div>
                    </div>
                    
                    <div class="bg-slate-800 p-2 rounded border border-slate-800/50 flex gap-2 items-start">
                        <div class="mt-0.5 text-blue-400">💡</div>
                        <div>
                            <div class="text-[9px] font-bold text-blue-400 uppercase mb-0.5">Suggestion</div>
                            <div class="text-[10px] text-slate-100 leading-tight">${def.suggestion}</div>
                        </div>
                    </div>
                </div>

                <div class="text-[10px] text-slate-400 border-t border-slate-800/50 pt-2 mt-1">
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
        this._activeTab = 'overview'; // Default to overview tab
        this._sceneMinStars = 2; // Default to 2 stars to hide possible false positives
        /** @type {HTMLElement | null} */
        this.chartContainer = null;
        this.resizeObserver = null;
    }

    _getDvrWindow(stream) {
        if (!stream || stream.manifest?.type !== 'dynamic') return null;

        const stateMap =
            stream.protocol === 'dash'
                ? stream.dashRepresentationState
                : stream.hlsVariantState;

        if (!stateMap) return null;

        let minStart = Infinity;
        let maxEnd = -Infinity;

        for (const state of stateMap.values()) {
            if (state.segments && state.segments.length > 0) {
                const segments = state.segments.filter(
                    (s) => s.type === 'Media'
                );
                if (segments.length === 0) continue;

                segments.forEach((s) => {
                    const timescale = s.timescale || 1;
                    const start = (s.periodStart || 0) + s.time / timescale;
                    const end = start + s.duration / timescale;
                    if (start < minStart) minStart = start;
                    if (end > maxEnd) maxEnd = end;
                });
            }
        }

        if (minStart === Infinity) return null;
        return { start: minStart, end: maxEnd };
    }

    _isPlaybackAvailable(absoluteTimestamp, dvrWindow) {
        if (!dvrWindow) return true; // Not live or no info
        // Allow a small buffer (e.g. 1s) for precision issues
        return (
            absoluteTimestamp >= dvrWindow.start - 1 &&
            absoluteTimestamp <= dvrWindow.end + 1
        );
    }

    _calculatePlaybackTime(relativeTimestamp, stream, mediaStartTime) {
        // For VOD, it's just mediaStartTime + relativeTimestamp
        if (!stream || stream.manifest?.type !== 'dynamic') {
            return mediaStartTime + relativeTimestamp;
        }

        // For Live, we need to be careful.
        // mediaStartTime is the absolute timestamp when analysis started.
        // relativeTimestamp is the offset from analysis start.
        // So absoluteTimestamp is simply mediaStartTime + relativeTimestamp.
        // The player (Shaka/HLS) typically expects an absolute timestamp for live streams
        // if the manifest has a timeline (which DASH/HLS do).

        return mediaStartTime + relativeTimestamp;
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
                splitLine: { lineStyle: { color: '#1e293b' } },
                splitArea: { show: false },
                axisLine: { lineStyle: { color: '#1e293b' } },
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
                            lineStyle: {
                                color: '#3b82f6',
                                width: 2,
                            },
                            areaStyle: {
                                color: '#3b82f6',
                                opacity: 0.2,
                            },
                            itemStyle: { color: '#3b82f6' },
                        },
                    ],
                },
            ],
            tooltip: {
                trigger: 'item',
                confine: true,
                backgroundColor: '#1e293b',
                borderColor: '#1e293b',
                textStyle: { color: '#f1f5f9' },
                formatter: () => {
                    return `
                        <div class="font-bold text-blue-400 border-b border-slate-800/50 mb-1 pb-1">Metric Values (Avg)</div>
                        <div class="grid grid-cols-[1fr,auto] gap-x-4 text-xs font-mono text-slate-100">
                            <span>Luminance:</span> <span class="text-slate-100">${metrics.luma?.avg?.toFixed(1) || '0.0'}</span>
                            <span>Sharpness:</span> <span class="text-slate-100">${metrics.sharpness?.avg?.toFixed(1) || '0.0'}</span>
                            <span>Audio Lvl:</span> <span class="text-slate-100">${metrics.audioLevel?.avg?.toFixed(1) || '-inf'} dB</span>
                            <span>Contrast:</span> <span class="text-slate-100">${metrics.contrastStdDev?.avg?.toFixed(1) || '0.0'}</span>
                            <span>Blockiness:</span> <span class="text-slate-100">${metrics.blockiness?.avg?.toFixed(1) || '0.0'}</span>
                            <span>Quality:</span> <span class="text-slate-100">${metrics.predictedQuality?.avg?.toFixed(1) || '0.0'}</span>
                            <span>Banding:</span> <span class="text-slate-100">${metrics.banding?.avg?.toFixed(1) || '0.0'}</span>
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

    handlePlayIssue(e, issue, offset = 0) {
        e.stopPropagation();
        if (this._data && this._data.streamId !== undefined) {
            analysisActions.setActiveStreamId(this._data.streamId);
        }

        const { jobs, selectedJobId } = useQualityStore.getState();
        const { streams } = useAnalysisStore.getState();
        const selectedJob = jobs.get(selectedJobId);
        const stream = streams.find((s) => s.id === selectedJob?.streamId);
        const mediaStartTime = selectedJob?.mediaStartTime || 0;

        const targetTime = this._calculatePlaybackTime(
            issue.startTime + offset,
            stream,
            mediaStartTime
        );

        uiActions.requestPlayerPlayback({
            startTime: targetTime,
            autoPlay: true,
        });
    }

    handlePlayScene(e, sceneChange, offset = 0) {
        e.stopPropagation();
        if (this._data && this._data.streamId !== undefined) {
            analysisActions.setActiveStreamId(this._data.streamId);
        }

        const { jobs, selectedJobId } = useQualityStore.getState();
        const { streams } = useAnalysisStore.getState();
        const selectedJob = jobs.get(selectedJobId);
        const stream = streams.find((s) => s.id === selectedJob?.streamId);
        const mediaStartTime = selectedJob?.mediaStartTime || 0;

        const targetTime = this._calculatePlaybackTime(
            sceneChange.timestamp + offset,
            stream,
            mediaStartTime
        );

        uiActions.requestPlayerPlayback({
            startTime: targetTime,
            autoPlay: true,
        });
    }

    renderTimelineTracks(
        issues,
        duration,
        isLive,
        mediaStartTime = 0,
        dvrWindow = null,
        stream = null
    ) {
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
                    class="h-24 flex items-center justify-center text-slate-400 text-xs italic"
                >
                    No timeline events detected.
                </div>
            `;
        }

        // Cursor logic: If live, only allowed if we can't determine availability?
        // Actually, for the timeline itself, we can always hover.
        // The click restriction is per-item.
        const cursorClass = 'cursor-pointer';

        return html`
            <div
                class="flex flex-col relative w-full select-none"
                @mousemove=${(e) => this.handleTimelineMouseMove(e, duration)}
                @mouseleave=${() => this.handleTimelineMouseLeave()}
            >
                <!-- Time Cursor -->
                <div
                    id="timeline-cursor"
                    class="absolute top-0 bottom-0 w-px bg-blue-500 z-40 pointer-events-none hidden shadow-[0_0_10px_#3b82f6]"
                >
                    <div
                        class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-blue-500 text-slate-100 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shadow-sm"
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
                            class="flex items-stretch border-b border-slate-800 hover:bg-slate-700 transition-colors group/track min-h-[36px]"
                        >
                            <div
                                class="w-24 shrink-0 flex items-center px-4 border-r border-slate-800"
                            >
                                <span
                                    class="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover/track:text-slate-100 transition-colors"
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
                    ? 'opacity-100 z-30 scale-y-125 shadow-lg shadow-black/50 ring-2 ring-blue-500'
                    : 'opacity-80 z-10 hover:opacity-100 hover:z-20 hover:scale-y-110';

                const classes = `${baseClass} ${colorClass} ${activeClass} ${tooltipTriggerClasses}`;
                const tooltipB64 =
                    createIssueTooltip(issue);

                const absoluteTime =
                    this._calculatePlaybackTime(
                        issue.startTime,
                        stream,
                        mediaStartTime
                    );
                const isAvailable =
                    this._isPlaybackAvailable(
                        absoluteTime,
                        dvrWindow
                    );

                // Disable click if live and out of window
                const clickHandler = isAvailable
                    ? (e) => this.handlePlayIssue(e, issue)
                    : null;

                const availabilityClass = isAvailable
                    ? ''
                    : 'opacity-50 cursor-not-allowed saturate-0';

                return html`
                                        <div
                                            class="${classes} ${availabilityClass}"
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
                    class="flex h-6 border-t border-slate-800 text-[9px] text-slate-400 font-mono relative mt-1"
                >
                    <div
                        class="w-24 shrink-0 border-r border-slate-800 bg-slate-800"
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

    renderAnalysisStatusBar() {
        const activeLayers = this._data?.activeLayers;
        if (!activeLayers) return '';

        const activeSet = new Set(activeLayers);

        const LAYERS = [
            { id: 'black_screen', label: 'Black Screen' },
            { id: 'freeze_frame', label: 'Freeze' },
            { id: 'silence', label: 'Silence' },
            { id: 'audio_clipping', label: 'Clipping' },
            { id: 'scene_change', label: 'Scene Changes' },
            { id: 'metric_audio_level', label: 'Audio Levels' },
        ];

        return html`
            <div
                class="flex flex-wrap gap-2 mb-6 px-4 py-3 bg-slate-800 border border-slate-800/50 rounded-xl items-center shadow-sm"
            >
                <span
                    class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1"
                >
                    ${icons.layers} Analysis Scope:
                </span>
                ${LAYERS.map((layer) => {
            const isActive = activeSet.has(layer.id);
            const statusClass = isActive
                ? 'bg-blue-500 text-slate-100 border-blue-500 shadow-[0_0_10px_#3b82f6]'
                : 'bg-slate-800 text-slate-400 border-slate-800 opacity-60 grayscale';

            return html`
                        <div
                            class="px-2.5 py-1 rounded-md text-[10px] font-bold border ${statusClass} flex items-center gap-1.5 transition-all"
                        >
                            ${isActive ? icons.checkCircle : icons.circle}
                            ${layer.label}
                        </div>
                    `;
        })}
            </div>
        `;
    }

    renderStatCard(
        label,
        metricData,
        unit,
        icon,
        color = 'text-slate-100',
        isInverse = false
    ) {
        const { highlightedQcMetric } = useUiStore.getState();
        const isHighlighted = highlightedQcMetric === label;

        const activeClass = isHighlighted
            ? 'ring-2 ring-blue-500 bg-slate-700 shadow-lg shadow-[0_0_10px_#3b82f6] scale-[1.02]'
            : 'hover:bg-slate-800 hover:border-slate-600 bg-slate-800';

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
        const displayColor = isNA ? 'text-slate-400' : color;
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
                class="border border-slate-800/50 p-4 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 ${activeClass} ${opacityClass} ${tooltipTriggerClasses}"
                data-tooltip-html-b64="${tooltipB64}"
            >
                <div>
                    <div
                        class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1"
                    >
                        ${label}
                    </div>
                    <div
                        class="text-2xl font-mono font-black ${displayColor} tracking-tight"
                    >
                        ${displayValue}<span
                            class="text-sm text-slate-400 ml-1 font-bold"
                            >${unitLabel}</span
                        >
                    </div>
                </div>
                <div class="text-slate-400 scale-125">
                    ${icon}
                </div>
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

    renderTabButton(tabId, label, icon, count = null) {
        const isActive = this._activeTab === tabId;
        const activeClass = isActive
            ? 'bg-blue-500 text-slate-100 shadow-lg shadow-[#3b82f6]'
            : 'bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800';

        return html`
            <button
                @click=${() => {
                this._activeTab = tabId;
                this.render();
            }}
                class="${activeClass} px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-slate-800/50"
            >
                ${icon} ${label}
                ${count !== null
                ? html`
                          <span
                              class="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-200 text-[9px] font-black min-w-[18px] text-center border border-slate-700/50 shadow-inner"
                          >
                              ${count}
                          </span>
                      `
                : ''}
            </button>
        `;
    }

    renderSceneChangesTab() {
        const { jobs, selectedJobId } = useQualityStore.getState();
        const selectedJob = jobs.get(selectedJobId);
        const sceneChangesRaw = selectedJob?.sceneChanges || [];
        const scanDuration = selectedJob?.config?.scanDuration || 30;

        // Apply Stars Filter
        const sceneChanges = sceneChangesRaw.filter((sc) => {
            const stars = Math.ceil(sc.confidence / 20);
            return stars >= this._sceneMinStars;
        });

        // Get Stream and DVR Window
        const { streams } = useAnalysisStore.getState();
        const stream = streams.find((s) => s.id === selectedJob?.streamId); // Assuming job has streamId, which it does in render()
        // Wait, render() has streamId in this._data. But here we rely on selectedJob.
        // Let's use this._data.streamId if available, or selectedJob keys.
        // Actually, render() passes nothing to this method.
        // We can get streamId from selectedJob keys if we iterate, but selectedJobId is the streamId.
        const streamId = selectedJobId;
        const streamObj = streams.find((s) => s.id === streamId);
        const dvrWindow = this._getDvrWindow(streamObj);
        const mediaStartTime = selectedJob?.mediaStartTime || 0;

        if (!selectedJob) {
            return html`
                <div class="p-12 text-center text-slate-400">
                    No job selected
                </div>
            `;
        }

        return html`
            <div class="space-y-6">
                <!--Header Stats-->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                        class="bg-slate-800 border border-slate-800/50 rounded-xl p-4"
                    >
                        <div
                            class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1"
                        >
                            Total Scenes
                        </div>
                        <div
                            class="text-3xl font-black text-blue-400"
                        >
                            ${sceneChanges.length}
                        </div>
                    </div>
                    <div
                        class="bg-slate-800 border border-slate-800/50 rounded-xl p-4"
                    >
                        <div
                            class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1"
                        >
                            Avg Scene Length
                        </div>
                        <div
                            class="text-3xl font-black text-slate-100"
                        >
                            ${sceneChanges.length > 0
                ? (
                    scanDuration /
                    (sceneChanges.length + 1)
                ).toFixed(1)
                : '0.0'}s
                        </div>
                    </div>
                    <div
                        class="bg-slate-800 border border-slate-800/50 rounded-xl p-4"
                    >
                        <div
                            class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1"
                        >
                            Scene Density
                        </div>
                        <div
                            class="text-3xl font-black text-purple-300"
                        >
                            ${sceneChanges.length > 0
                ? (
                    (sceneChanges.length / scanDuration) *
                    60
                ).toFixed(1)
                : '0.0'}/min
                        </div>
                    </div>
                </div>

                <!--Timeline Visualization-->
                ${sceneChanges.length > 0
                ? html`
                          <div
                              class="bg-slate-800 border border-slate-800/50 rounded-xl p-6"
                          >
                              <h3
                                  class="text-xs font-bold text-slate-100 uppercase tracking-widest mb-4 flex items-center gap-2"
                              >
                                  ${icons.timeline} Scene Change Timeline
                              </h3>
                              <div
                                  class="relative h-20 bg-slate-800 rounded-lg overflow-hidden"
                              >
                                  <!-- Timeline axis -->
                                  <div
                                      class="absolute bottom-0 left-0 right-0 h-px bg-slate-800"
                                  ></div>

                                  <!-- Scene markers -->
                                  ${sceneChanges.map((sc) => {
                    const x =
                        (sc.timestamp / scanDuration) * 100;
                    const height = (sc.confidence / 100) * 60;
                    return html`
                                          <div
                                              class="absolute bottom-0 w-1 hover:w-2 transition-all cursor-pointer group"
                                              style="left: ${x}%; height: ${height}px; background: linear-gradient(to top, #3b82f6, #a855f7);"
                                              title="${sc.timestamp.toFixed(
                        2
                    )}s - ${sc.type} (${sc.confidence}%)"
                                              @click=${(e) =>
                            this.handlePlayScene(e, sc)}
                                          >
                                              <div
                                                  class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                              >
                                                  <div
                                                      class="bg-slate-800 backdrop-blur-md border border-slate-800 rounded px-2 py-1 text-[9px] font-mono text-slate-100 whitespace-nowrap shadow-lg"
                                                  >
                                                      ${sc.timestamp.toFixed(
                                2
                            )}s
                                                  </div>
                                              </div>
                                          </div>
                                      `;
                })}

                                  <!-- Time labels -->
                                  <div
                                      class="absolute bottom-0 left-2 text-[9px] text-slate-400 font-mono py-1"
                                  >
                                      0s
                                  </div>
                                  <div
                                      class="absolute bottom-0 right-2 text-[9px] text-slate-400 font-mono py-1"
                                  >
                                      ${scanDuration}s
                                  </div>
                              </div>
                          </div>
                      `
                : ''}

                <!--Scene Changes List-->
                <div
                    class="bg-slate-800 border border-slate-800/50 rounded-xl overflow-hidden"
                >
                    <div
                        class="px-6 py-4 bg-slate-800 border-b border-slate-800/50 flex justify-between items-center"
                    >
                        <div class="flex items-center gap-[0.75rem]">
                            <h3
                                class="text-xs font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2"
                            >
                                ${icons.film} Scene Changes
                                (${sceneChanges.length})
                            </h3>

                            <!-- Stars of Certainty Filter -->
                            <div
                                class="flex items-center gap-2 bg-slate-800 px-2 py-1 rounded-lg border border-slate-800/50"
                            >
                                <span
                                    class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-1"
                                >Stars of Certainty:</span>
                                <div class="flex gap-1">
                                    ${[1, 2, 3, 4, 5].map((star) => {
                    const isActive =
                        this._sceneMinStars === star;
                    return html`
                                            <button
                                                @click=${() => {
                            this._sceneMinStars = star;
                            this.render();
                        }}
                                                class="px-2 py-0.5 rounded text-[10px] font-bold transition-all ${isActive
                            ? 'bg-blue-500 text-slate-100 shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800'}"
                                            >
                                                ${star}+
                                            </button>
                                        `;
                })}
                                </div>
                            </div>
                        </div>
                        ${sceneChanges.length > 0
                ? html`
                                  <button
                                      class="px-3 py-1.5 bg-purple-500 hover:bg-purple-500 text-slate-400 text-[10px] font-bold rounded transition-all flex items-center gap-1.5"
                                      @click=${() =>
                        this.exportSceneChangeCSV(
                            sceneChanges
                        )}
                                  >
                                      ${icons.download} Export CSV
                                  </button>
                              `
                : ''}
                    </div>

                    <div class="p-6">
                        ${sceneChanges.length === 0
                ? html`
                                  <div
                                      class="text-center py-16 text-slate-400"
                                  >
                                      <div class="text-6xl mb-4 opacity-20">
                                          ${icons.film}
                                      </div>
                                      <div class="text-sm font-medium">
                                          No scene changes detected
                                      </div>
                                      <div class="text-xs mt-2">
                                          Enable "Scene Change Detection" in QC
                                          Configuration
                                      </div>
                                  </div>
                              `
                : html`
                                  <div
                                      class="grid grid-cols-1 md:grid-cols-2 gap-[0.75rem]"
                                  >
                                      ${sceneChanges.map((sc, idx) =>
                    this.renderSceneChangeCard(
                        sc,
                        idx,
                        dvrWindow,
                        mediaStartTime,
                        stream
                    )
                )}
                                  </div>
                              `}
                    </div>
                </div>
            </div>
        `;
    }

    renderSceneChangeCard(sceneChange, idx, dvrWindow, mediaStartTime, stream) {
        const absoluteTime = this._calculatePlaybackTime(
            sceneChange.timestamp,
            stream,
            mediaStartTime
        );
        const absoluteTimePre = this._calculatePlaybackTime(
            sceneChange.timestamp - 2,
            stream,
            mediaStartTime
        );

        const isAvailable = this._isPlaybackAvailable(absoluteTime, dvrWindow);
        const isAvailablePre = this._isPlaybackAvailable(
            absoluteTimePre,
            dvrWindow
        );

        const typeColors = {
            cut: 'text-red-400 bg-red-500/10 border-red-500',
            fade: 'text-amber-400 bg-amber-500/10 border-amber-500',
            dissolve:
                'text-blue-400 bg-blue-500/10 border-blue-500',
        };
        const typeColor = typeColors[sceneChange.type] || typeColors.cut;

        return html`
            <div
                class="bg-slate-800 border border-slate-800/50 rounded-xl overflow-hidden hover:shadow-lg hover:shadow-[#3b82f6]/50 hover:bg-slate-800 transition-all group"
            >
                <!--Header -->
                <div
                    class="p-3 bg-slate-800 border-b border-slate-800/50 flex justify-between items-center"
                >
                    <div class="flex items-center gap-3">
                        <button
                            @click=${(e) =>
                isAvailablePre &&
                this.handlePlayScene(e, sceneChange, -2)}
                            class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all mr-2 ${isAvailablePre
                ? 'bg-slate-800 hover:bg-slate-800 text-slate-100 hover:scale-110 cursor-pointer border border-slate-800/50'
                : 'bg-slate-800 text-slate-400 opacity-50 cursor-not-allowed border border-slate-800/50'}"
                            title="${isAvailablePre
                ? 'Play 2s before'
                : 'Content outside DVR window'}"
                            ?disabled=${!isAvailablePre}
                        >
                            <span class="text-[9px] font-bold">-2s</span>
                        </button>
                        <button
                            @click=${(e) =>
                isAvailable && this.handlePlayScene(e, sceneChange)}
                            class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all ${isAvailable
                ? 'bg-blue-500 hover:bg-[#60a5fa] text-slate-100 hover:scale-110 cursor-pointer'
                : 'bg-slate-800 text-slate-400 opacity-50 cursor-not-allowed'}"
                            title="${isAvailable
                ? 'Play from this scene'
                : 'Content outside DVR window'}"
                            ?disabled=${!isAvailable}
                        >
                            ${icons.play}
                        </button>
                        <div>
                            <div
                                class="text-lg font-black font-mono text-slate-100"
                            >
                                ${sceneChange.timestamp.toFixed(2)}s
                            </div>
                            <div
                                class="text-[9px] text-slate-400 uppercase tracking-wider"
                            >
                                Change #${idx + 1}
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                        <span
                            class="px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${typeColor}"
                        >
                            ${sceneChange.type}
                        </span>
                        <div
                            class="text-[9px] text-slate-400"
                        >
                            ${'★'.repeat(Math.ceil(sceneChange.confidence / 20))}
                        </div>
                    </div>
                </div>

                <!--Frame Comparison-->
                <div class="p-3">
                    <div class="grid grid-cols-2 gap-2">
                        <!-- Before Frame -->
                        <div class="relative group/frame">
                            <div
                                class="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1"
                            >
                                Before
                            </div>
                            <img
                                src="${sceneChange.prevFrameB64}"
                                class="w-full h-auto rounded border border-slate-800/50 hover:scale-105 transition-transform cursor-pointer"
                                alt="Before"
                                @click=${() =>
                this.openImageModal(
                    sceneChange.prevFrameB64,
                    `Before ${sceneChange.timestamp}s`
                )}
                            />
                            <div
                                class="text-[8px] text-slate-400 mt-1"
                            >
                                Luma:
                                ${sceneChange.metadata.prevLuma.toFixed(1)}
                            </div>
                        </div>

                        <!-- After Frame -->
                        <div class="relative group/frame">
                            <div
                                class="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1"
                            >
                                After
                            </div>
                            <img
                                src="${sceneChange.nextFrameB64}"
                                class="w-full h-auto rounded border border-slate-800/50 hover:scale-105 transition-transform cursor-pointer"
                                alt="After"
                                @click=${() =>
                this.openImageModal(
                    sceneChange.nextFrameB64,
                    `After ${sceneChange.timestamp}s`
                )}
                            />
                            <div
                                class="text-[8px] text-slate-400 mt-1"
                            >
                                Luma:
                                ${sceneChange.metadata.nextLuma.toFixed(1)}
                            </div>
                        </div>
                    </div>

                    <!-- Metadata -->
                    <div
                        class="mt-3 pt-3 border-t border-slate-800/50 flex justify-between items-center text-[9px]"
                    >
                        <div class="text-slate-400">
                            Δ Score:
                            <span
                                class="font-mono text-slate-100"
                            >${(sceneChange.deltaScore * 100).toFixed(1)}%</span>
                        </div>
                        ${sceneChange.metadata.colorShift
                ? html`<span
                                  class="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500 text-[8px] font-bold uppercase"
                                  >Color Shift</span
                              >`
                : ''}
                    </div>
                </div>
            </div>
        `;
    }

    openImageModal(imageSrc, title) {
        // Simple modal for enlarged image view
        const modal = document.createElement('div');
        modal.className =
            'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="relative max-w-4xl max-h-[90vh] p-4">
                <div class="text-sm font-bold text-white mb-2 text-center">${title}</div>
                <img src="${imageSrc}" class="max-w-full max-h-full rounded-lg shadow-2xl" />
                <button class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold">
                    ×
                </button>
            </div>
        `;
        modal.onclick = (e) => {
            const target = e.target;
            if (
                target === modal ||
                (target instanceof HTMLElement && target.tagName === 'BUTTON')
            ) {
                document.body.removeChild(modal);
            }
        };
        document.body.appendChild(modal);
    }

    exportSceneChangeCSV(sceneChanges) {
        const headers = [
            'Index',
            'Timestamp (s)',
            'Type',
            'Confidence (%)',
            'Delta Score',
            'Prev Luma',
            'Next Luma',
            'Color Shift',
        ];
        const rows = sceneChanges.map((sc, idx) => [
            idx + 1,
            sc.timestamp.toFixed(3),
            sc.type,
            sc.confidence,
            (sc.deltaScore * 100).toFixed(2),
            sc.metadata.prevLuma.toFixed(1),
            sc.metadata.nextLuma.toFixed(1),
            sc.metadata.colorShift ? 'Yes' : 'No',
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
            `scene_changes_${new Date().toISOString()}.csv`
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
        const dvrWindow = this._getDvrWindow(stream);

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
                      class="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500 font-bold flex items-center gap-1"
                  >
                      ${icons.clapperboard} ${videoLabel}
                  </span>
              `
            : '';
        const audioBadge = audioLabel
            ? html`
                  <span
                      class="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-purple-300 border border-purple-500 font-bold uppercase flex items-center gap-1"
                  >
                      ${icons.audioLines} ${audioLabel}
                  </span>
              `
            : '';

        const debugStatsBadge = this._data?.debugStats
            ? html`
                  <div
                      class="flex items-center gap-3 px-2 py-1 rounded bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-400"
                  >
                      <span title="Initial Video Timestamp"
                          >Init:
                          <span class="text-slate-100"
                              >${this._data.debugStats.initialVideoTimestamp?.toFixed(
                3
            )}s</span
                          ></span
                      >
                      <span class="w-px h-3 bg-slate-800"></span>
                      <span title="Final Video Timestamp"
                          >End:
                          <span class="text-slate-100"
                              >${this._data.debugStats.finalVideoTimestamp?.toFixed(
                3
            )}s</span
                          ></span
                      >
                      <span class="w-px h-3 bg-slate-800"></span>
                      <span title="Analysis Duration"
                          >Dur:
                          <span class="text-slate-100"
                              >${this._data.debugStats.analysisDuration?.toFixed(
                2
            )}s</span
                          ></span
                      >
                      <span class="w-px h-3 bg-slate-800"></span>
                      <span title="Processing Speed"
                          >Speed:
                          <span class="text-slate-100"
                              >${this._data.debugStats.processingSpeed?.toFixed(
                1
            )}x</span
                          ></span
                      >
                  </div>
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

        const template = html`
            <div
                class="h-full flex flex-col bg-transparent text-slate-100 overflow-hidden"
            >
                <!-- Header -->
                <div class="shrink-0 p-6 flex justify-between items-center">
                    <div
                        class="bg-slate-800 backdrop-filter backdrop-blur-xl border border-slate-800 rounded-xl p-4 flex-grow mr-6 shadow-sm group hover:border-blue-500/30 transition-colors"
                    >
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="flex items-center gap-3">
                                    <h1
                                        class="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2 group-hover:text-blue-400 transition-colors"
                                    >
                                        ${icons.shieldCheck} Report Details
                                    </h1>
                                    <div class="flex items-center gap-3">
                                        ${videoBadge} ${audioBadge} ${debugStatsBadge}
                                    </div>
                                </div>
                                <p
                                    class="text-xs text-slate-400 font-mono mt-1"
                                >
                                    Status: ${selectedJob?.status || 'Complete'}
                                </p>
                            </div>
                            <div class="flex items-center gap-3">
                                <button
                                    @click=${() => this.downloadCSV()}
                                    class="px-4 py-2 bg-blue-500 hover:bg-[#60a5fa] text-slate-100 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-[0_0_15px_#3b82f6]/50"
                                >
                                    ${icons.download} Metrics
                                </button>
                                <button
                                    @click=${() => this.downloadIssuesCSV()}
                                    class="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/50 text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                                >
                                    ${icons.alertTriangle} Issues
                                </button>
                                <button
                                    @click=${onReset}
                                    class="px-4 py-2 bg-slate-800 hover:bg-slate-800 text-slate-100 text-xs font-bold rounded-lg border border-slate-800 transition-all flex items-center gap-2"
                                >
                                    ${icons.arrowLeft} Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tab Navigation -->
                <div class="shrink-0 px-6 pb-2 flex items-center gap-3">
                    ${this.renderTabButton(
            'overview',
            'Overview',
            icons.barChart,
            issues?.length || 0
        )}
                    ${(() => {
                const sceneChanges = selectedJob?.sceneChanges || [];
                const filteredCount = sceneChanges.filter(
                    (sc) =>
                        Math.ceil(sc.confidence / 20) >=
                        this._sceneMinStars
                ).length;
                return this.renderTabButton(
                    'scenes',
                    'Scene Changes',
                    icons.film,
                    filteredCount
                );
            })()}
                </div>

                <div
                    class="grow overflow-y-auto custom-scrollbar p-6 pt-2 space-y-[0.75rem]"
                >
                    ${this._activeTab === 'overview'
                ? this.renderOverviewTab(
                    issues,
                    scanDuration,
                    isLive,
                    selectedJob,
                    metrics,
                    score,
                    scoreColor,
                    highlightedQcMetric,
                    highlightedTimeRange,
                    highlightedIssueId,
                    videoBadge,
                    audioBadge,
                    dvrWindow,
                    stream
                )
                : ''}
                    ${this._activeTab === 'scenes'
                ? this.renderSceneChangesTab()
                : ''}
                </div>
            </div>
        `;
        render(template, this);
    }

    renderOverviewTab(
        issues,
        scanDuration,
        isLive,
        selectedJob,
        metrics,
        score,
        scoreColor,
        highlightedQcMetric,
        highlightedTimeRange,
        highlightedIssueId,
        videoBadge,
        audioBadge,
        dvrWindow,
        stream
    ) {
        const isIdHoverActive = !!highlightedIssueId;
        const isTimeHoverActive = !!highlightedTimeRange;
        const targetTypes =
            !isIdHoverActive && !isTimeHoverActive && highlightedQcMetric
                ? METRIC_TO_ISSUE_MAP[highlightedQcMetric] || [
                    highlightedQcMetric,
                ]
                : [];

        return html`
            <!--Top Stats Grid-->
            ${this.renderAnalysisStatusBar()}
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-[0.75rem] h-[280px]">
                <!-- ECharts Radar & Score -->
                <div
                    class="bg-slate-800 backdrop-blur-2xl border border-slate-800/50 rounded-xl p-4 flex relative overflow-hidden group shadow-md"
                >
                    <div
                        class="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-inset ring-white/5"
                    ></div>
                    <div class="absolute top-4 left-4 z-10 pointer-events-none">
                        <div
                            class="text-xs font-bold text-slate-400 uppercase tracking-wider"
                        >
                            Quality Score
                        </div>
                        <div
                            class="text-5xl font-black ${scoreColor} mt-1 drop-shadow-[0_0_15px_rgba(0,0,0,0.3)]"
                        >
                            ${score}
                        </div>
                    </div>
                    <!-- Chart container -->
                    <div id="qc-radar-chart" class="w-full h-full"></div>
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
                : 'text-purple-300'
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
                : 'text-slate-100',
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
                ? 'text-teal-300'
                : 'text-slate-100'
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

            <!--Swimlane Timeline-->
            <div
                class="bg-slate-800 backdrop-blur-2xl border border-slate-800/50 rounded-xl overflow-hidden shadow-md"
            >
                <div
                    class="px-4 py-3 bg-slate-800 border-b border-slate-800/50 flex justify-between items-center"
                >
                    <h3
                        class="text-xs font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2"
                    >
                        ${icons.history} Issue Timeline
                    </h3>
                    <span
                        class="text-[10px] text-slate-400 font-mono"
                        >0s - ${scanDuration}s</span
                    >
                </div>
                <div class="bg-slate-800">
                    ${this.renderTimelineTracks(
            issues,
            scanDuration,
            isLive,
            selectedJob?.mediaStartTime || 0,
            dvrWindow,
            stream
        )}
                </div>
            </div>

            <!--Issues Table-->
            <div
                class="bg-slate-800 backdrop-blur-2xl border border-slate-800/50 rounded-xl overflow-hidden flex flex-col min-h-[300px] shadow-md"
            >
                <div
                    class="grid grid-cols-[80px_120px_1fr_100px_80px] gap-4 px-6 py-3 bg-slate-800 border-b border-slate-800/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10"
                >
                    <div>Time</div>
                    <div>Type</div>
                    <div>Value / Details</div>
                    <div class="text-right">Duration</div>
                    <div class="text-right">Action</div>
                </div>
                <div
                    class="divide-y divide-slate-800/30 bg-slate-800"
                >
                    ${issues.length === 0
                ? html`<div
                              class="p-12 text-center text-slate-400 italic opacity-60"
                          >
                              No anomalies detected. Stream is clean.
                          </div>`
                : issues.map((issue, idx) => {
                    const tooltipB64 = createIssueTooltip(issue);

                    let isHighlighted = false;
                    if (isIdHoverActive) {
                        if (issue.id === highlightedIssueId)
                            isHighlighted = true;
                    } else if (isTimeHoverActive) {
                        const { start, end } = highlightedTimeRange;
                        const iStart = issue.startTime;
                        const iEnd = issue.startTime + issue.duration;
                        if (iEnd >= start && iStart <= end) {
                            isHighlighted = true;
                        }
                    } else {
                        if (targetTypes.includes(issue.type))
                            isHighlighted = true;
                        if (highlightedQcMetric === issue.type)
                            isHighlighted = true;
                    }

                    const highlightClass = isHighlighted
                        ? 'bg-slate-700 ring-1 ring-blue-500 z-10 relative shadow-md'
                        : 'hover:bg-slate-800 bg-transparent';

                    const onRowEnter = () => {
                        this.handleMouseEnterIssue(issue.id);
                        let metricKey = issue.type;
                        for (const [key, types] of Object.entries(
                            METRIC_TO_ISSUE_MAP
                        )) {
                            if (types.includes(issue.type)) {
                                metricKey = key;
                                break;
                            }
                        }
                        this.handleMouseEnterMetric(metricKey);
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
                                              class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-slate-800 border-slate-800 text-red-400"
                                          >
                                              ${issue.type}
                                          </span>
                                      </div>
                                      <div
                                          class="font-mono text-slate-100 truncate pr-4"
                                      >
                                          ${issue.value}
                                      </div>
                                      <div
                                          class="text-right font-mono text-slate-400"
                                      >
                                          ${issue.duration.toFixed(3)}s
                                      </div>
                                      <div
                                          class="text-right flex items-center justify-end gap-2"
                                      >
                                          ${(() => {
                            const absoluteTime =
                                this._calculatePlaybackTime(
                                    issue.startTime,
                                    stream,
                                    selectedJob?.mediaStartTime ||
                                    0
                                );
                            const absoluteTimePre =
                                this._calculatePlaybackTime(
                                    issue.startTime - 2,
                                    stream,
                                    selectedJob?.mediaStartTime ||
                                    0
                                );

                            const isAvailable =
                                this._isPlaybackAvailable(
                                    absoluteTime,
                                    dvrWindow
                                );
                            const isAvailablePre =
                                this._isPlaybackAvailable(
                                    absoluteTimePre,
                                    dvrWindow
                                );

                            return html`
                                                  <button
                                                      @click=${(e) =>
                                    isAvailablePre &&
                                    this.handlePlayIssue(
                                        e,
                                        issue,
                                        -2
                                    )}
                                                      class="p-1.5 rounded transition-colors ${isAvailablePre
                                    ? 'bg-slate-800 hover:bg-slate-800 text-slate-100 opacity-0 group-hover:opacity-100 cursor-pointer border border-slate-800'
                                    : 'bg-slate-800 text-slate-400 opacity-50 cursor-not-allowed border border-slate-800'}"
                                                      title="${isAvailablePre
                                    ? 'Play 2s before'
                                    : 'Content outside DVR window'}"
                                                      ?disabled=${!isAvailablePre}
                                                  >
                                                      <span
                                                          class="text-[9px] font-bold"
                                                          >-2s</span
                                                      >
                                                  </button>
                                                  <button
                                                      @click=${(e) =>
                                    isAvailable &&
                                    this.handlePlayIssue(
                                        e,
                                        issue
                                    )}
                                                      class="p-1.5 rounded transition-colors ${isAvailable
                                    ? 'bg-blue-500 hover:bg-[#60a5fa] text-slate-100 opacity-0 group-hover:opacity-100 cursor-pointer'
                                    : 'bg-slate-800 text-slate-400 opacity-50 cursor-not-allowed'}"
                                                      title="${isAvailable
                                    ? 'Play at this time'
                                    : 'Content outside DVR window'}"
                                                      ?disabled=${!isAvailable}
                                                  >
                                                      ${icons.play}
                                                  </button>
                                              `;
                        })()}
                                      </div>
                                  </div>
                              `;
                })}
                </div>
            </div>
        `;
    }
}
customElements.define('qc-results-viewer', QcResultsViewer);
export const qcResultsTemplate = (data) =>
    html`<qc-results-viewer .data=${data}></qc-results-viewer>`;
