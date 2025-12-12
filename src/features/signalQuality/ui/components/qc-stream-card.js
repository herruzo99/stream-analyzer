import * as icons from '@/ui/icons';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { html, render } from 'lit-html';

const statusColors = {
    running: 'text-blue-400 border-blue-500/30 bg-blue-900/10',
    complete: 'text-emerald-400 border-emerald-500/30 bg-emerald-900/10',
    error: 'text-red-400 border-red-500/30 bg-red-900/10'
};

const METRIC_DEFINITIONS = {
    luma: { label: 'Luma', unit: 'Y', color: '#fbbf24', layerId: 'metric_luma' },
    audioLevel: { label: 'Audio', unit: 'dB', color: '#3b82f6', layerId: 'metric_audio_level' },
    temporalDiff: { label: 'Motion', unit: '%', color: '#f472b6', layerId: 'metric_motion' },
    sharpness: { label: 'Sharpness', unit: 'SI', color: '#10b981', layerId: 'metric_sharpness' },
    blockiness: { label: 'Blocky', unit: 'Q', color: '#f59e0b', layerId: 'artifacts' },
    contrastStdDev: { label: 'Contrast', unit: 'σ', color: '#8b5cf6', layerId: 'contrast_monitor' },
    banding: { label: 'Banding', unit: 'Scr', color: '#ec4899', layerId: 'banding' },
    predictedQuality: { label: 'Quality', unit: '/100', color: '#10b981', layerId: 'metric_predicted_quality' }
};

const METRIC_DEPENDENCIES = {
    'silence': 'audioLevel',
    'audio_clipping': 'audioLevel',
    'black_frame': 'luma',
    'broadcast_safe': 'luma',
    'freeze': 'temporalDiff'
};

const DEFAULT_METRICS = ['luma', 'audioLevel', 'temporalDiff'];

const getControlPoint = (current, previous, next, reverse) => {
    const p = previous || current;
    const n = next || current;
    const smoothing = 0.2;
    const lineX = n[0] - p[0];
    const lineY = n[1] - p[1];

    const length = Math.sqrt(Math.pow(lineX, 2) + Math.pow(lineY, 2));
    const angle = Math.atan2(lineY, lineX) + (reverse ? Math.PI : 0);

    const cpLength = length * smoothing;
    const x = current[0] + Math.cos(angle) * cpLength;
    const y = current[1] + Math.sin(angle) * cpLength;
    return [x, y];
};

const generateSvgPath = (points) => {
    return points.reduce((acc, point, i, a) => {
        if (i === 0) return `M ${point[0]},${point[1]}`;
        const [cpsX, cpsY] = getControlPoint(a[i - 1], a[i - 2], point, false);
        const [cpeX, cpeY] = getControlPoint(point, a[i - 1], a[i + 1], true);
        return `${acc} C ${cpsX},${cpsY} ${cpeX},${cpeY} ${point[0]},${point[1]}`;
    }, '');
};

const renderSparkline = (data, key, color, width = 100, height = 60) => {
    if (!data || data.length < 2) return html``;

    const values = data.map(d => d[key] || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = values.map((val, i) => {
        const x = (i / (values.length - 1)) * width;
        const normalizedVal = (val - min) / range;
        // Add some padding to avoid clipping at the very top/bottom
        const padding = height * 0.15;
        const drawHeight = height - (padding * 2);
        const y = height - padding - (normalizedVal * drawHeight);
        return [x, y];
    });

    const pathD = generateSvgPath(points);
    const fillPathD = `${pathD} L ${width},${height} L 0,${height} Z`;

    return html`
        <div class="absolute inset-0 z-0 opacity-20 pointer-events-none transition-opacity group-hover/metric:opacity-30">
            <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="overflow-visible">
                <defs>
                    <linearGradient id="grad-${key}" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="${color}" stop-opacity="0.6" />
                        <stop offset="100%" stop-color="${color}" stop-opacity="0" />
                    </linearGradient>
                </defs>
                <path d="${fillPathD}" fill="url(#grad-${key})" vector-effect="non-scaling-stroke" />
                <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        </div>
    `;
};

const MetricBox = (label, value, unit, history, key, color) => {
    let displayValue = value;
    if (typeof value === 'object' && value !== null) {
        // Handle aggregate metric object (avg, min, max, etc.)
        displayValue = value.avg !== undefined ? value.avg : value.val;
    }

    return html`
    <div class="relative flex flex-col bg-slate-800 hover:bg-slate-700/80 p-3 rounded-xl border border-slate-700/50 text-center overflow-hidden h-24 justify-between group/metric transition-all duration-200 shadow-sm">
        ${renderSparkline(history, key, color, 100, 60)}
        <div class="relative z-10 flex flex-col h-full justify-between">
            <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${label}</span>
                <div class="w-1.5 h-1.5 rounded-full shadow-sm" style="background-color: ${color}; box-shadow: 0 0 8px ${color}40;"></div>
            </div>
            <div class="flex items-baseline justify-start gap-1 mt-auto">
                <span class="text-2xl font-mono font-black text-slate-100 tracking-tighter leading-none drop-shadow-sm">
                    ${typeof displayValue === 'number' ? displayValue.toFixed(1) : '-'}
                </span>
                <span class="text-[10px] text-slate-400 font-bold">${unit}</span>
            </div>
        </div>
    </div>
`;
};

export class QcStreamCard extends HTMLElement {
    constructor() {
        super();
        this.job = null;
        this.stream = null;
        this.onClick = null;
        this.onStop = null;
        this.handleStop = this.handleStop.bind(this);
        this.handleViewReport = this.handleViewReport.bind(this);
    }

    set data({ job, stream, onClick, onStop }) {
        this.job = job;
        this.stream = stream;
        this.onClick = onClick;
        this.onStop = onStop;
        this.render();
    }

    connectedCallback() {
        this.render();
    }

    handleStop(e) {
        e.stopPropagation();
        if (this.onStop) this.onStop();
    }

    handleViewReport(e) {
        e.stopPropagation();
        if (this.onClick) this.onClick();
    }

    getMetricsToDisplay(config) {
        if (!config || !config.activeLayers) return DEFAULT_METRICS;
        const activeLayers = config.activeLayers;
        const metricsSet = new Set();
        Object.entries(METRIC_DEFINITIONS).forEach(([key, def]) => {
            if (activeLayers.includes(def.layerId)) {
                metricsSet.add(key);
            }
        });
        activeLayers.forEach(layerId => {
            if (METRIC_DEPENDENCIES[layerId]) {
                metricsSet.add(METRIC_DEPENDENCIES[layerId]);
            }
        });
        if (metricsSet.size === 0) return DEFAULT_METRICS;
        const priorityOrder = ['predictedQuality', 'audioLevel', 'luma', 'temporalDiff', 'sharpness', 'blockiness', 'contrastStdDev', 'banding'];
        return priorityOrder.filter(k => metricsSet.has(k));
    }

    render() {
        if (!this.job || !this.stream) return;

        const { status, progress, currentFrame, aggregateMetrics, issues, frameMetrics, config, trackDetails, statusMessage } = this.job;
        const lastMetrics = frameMetrics[frameMetrics.length - 1] || {};

        const displayMetrics = status === 'complete' ? aggregateMetrics : lastMetrics;
        const issueCount = issues.length;
        const recentIssues = issues.slice(-2).reverse();
        const statusClass = statusColors[status] || statusColors.running;
        const recentHistory = frameMetrics.slice(-30);
        const isComplete = status === 'complete';
        const isError = status === 'error';
        const isLive = this.stream.manifest?.type === 'dynamic';

        const metricsToShow = this.getMetricsToDisplay(config);

        // --- Track Detail Badges ---
        let videoLabel = trackDetails?.video;
        if (trackDetails?.video && this.stream) {
            const t = this.stream.manifest?.summary?.videoTracks.find(vt => vt.id === trackDetails.video);
            if (t) videoLabel = t.label || t.resolutions?.[0]?.value || t.height || trackDetails.video;
        }

        let audioLabel = trackDetails?.audio;
        if (trackDetails?.audio && this.stream) {
            const t = this.stream.manifest?.summary?.audioTracks.find(at => at.id === trackDetails.audio);
            if (t) audioLabel = t.label || t.lang?.toUpperCase() || trackDetails.audio;
        }

        const videoBadge = videoLabel ? html`
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/20 text-blue-300 border border-blue-500/20 font-bold" title="Video Track">
                ${icons.clapperboard} ${videoLabel}
            </span>
        ` : '';

        const audioBadge = audioLabel ? html`
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/20 text-purple-300 border border-purple-500/20 font-bold uppercase" title="Audio Track">
                ${icons.audioLines} ${audioLabel}
            </span>
        ` : '';

        const template = html`
            <div 
                @click=${this.onClick}
                class="bg-slate-900 border border-slate-700/60 rounded-2xl flex flex-col h-auto min-h-[360px] hover:border-blue-500/50 transition-all cursor-pointer group relative overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-blue-900/10"
            >
                <!-- Header Section -->
                <div class="p-5 pb-4 border-b border-slate-800/50 bg-slate-900/30 relative z-20 backdrop-blur-sm">
                    <div class="flex justify-between items-start mb-3">
                        <div class="min-w-0 mr-4">
                            <div class="flex items-center gap-2 mb-1.5">
                                <h4 class="font-bold text-white text-base truncate tracking-tight" title="${this.stream.name}">${this.stream.name}</h4>
                                ${isLive ? html`
                                    <span 
                                        class="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold flex items-center gap-1 ${tooltipTriggerClasses}"
                                        data-tooltip="Live Edge Analysis"
                                    >
                                        ${icons.activity} LIVE
                                    </span>
                                ` : ''}
                            </div>
                            
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border bg-slate-900/50 text-slate-500 border-slate-800">
                                    ${this.stream.protocol}
                                </span>
                                ${videoBadge}
                                ${audioBadge}
                            </div>
                        </div>

                        <div class="flex flex-col items-end gap-2">
                            <div class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1.5 ${statusClass} shadow-sm">
                                ${status === 'running' ? html`<span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>` : ''}
                                ${status}
                            </div>
                            ${status === 'running' ? html`
                                <button 
                                    @click=${this.handleStop}
                                    class="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-all opacity-0 group-hover:opacity-100"
                                    title="Stop Analysis"
                                >
                                    ${icons.stop}
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    ${!isComplete && !isError ? html`
                        <div class="mt-3">
                            <div class="flex justify-between text-[10px] text-slate-500 font-mono mb-1.5">
                                <span>Frame: <span class="text-slate-300">${currentFrame}</span> <span class="text-slate-600">/</span> ${this.job.totalFrames}</span>
                                <span class="text-blue-400 font-bold">${progress.toFixed(0)}%</span>
                            </div>
                            <div class="w-full h-1 bg-slate-800/50 rounded-full overflow-hidden">
                                <div class="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-300 ease-out" style="width: ${progress}%"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Body Section -->
                <div class="p-5 pt-4 flex flex-col grow min-h-0 relative z-10 bg-gradient-to-b from-slate-900 to-slate-900/95">
                    <!-- Metrics Grid -->
                    <div class="grid grid-cols-3 gap-3 mb-5">
                        ${metricsToShow.map(key => {
            const def = METRIC_DEFINITIONS[key];
            let history = recentHistory;
            if (key === 'audioLevel' && this.job.audioHistory && this.job.audioHistory.length > 0) {
                history = this.job.audioHistory.slice(-100);
            }
            return MetricBox(def.label, displayMetrics?.[key], def.unit, history, key, def.color);
        })}
                    </div>

                    <!-- Issues Section -->
                    <div class="grow min-h-0 flex flex-col justify-end">
                        <div class="flex justify-between items-end mb-3">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                Detected Issues
                                ${issueCount > 0 ? html`
                                    <span class="bg-red-500/20 text-red-300 border border-red-500/30 text-[9px] font-bold px-1.5 rounded-full">
                                        ${issueCount}
                                    </span>
                                ` : ''}
                            </span>
                        </div>
                        
                        <div class="space-y-2 relative min-h-[60px]">
                            ${recentIssues.length === 0 ? html`
                                <div class="flex items-center gap-2 text-[11px] text-slate-500 italic pl-1 py-2 opacity-80">
                                    ${icons.checkCircle} No anomalies detected yet.
                                </div>
                            ` : recentIssues.map((issue) => html`
                                <div class="flex items-center justify-between text-[10px] bg-slate-800/80 border border-slate-700/50 p-2.5 rounded-lg animate-slideInRight hover:border-red-500/30 transition-colors group/issue shadow-sm">
                                    <div class="flex items-center gap-2 min-w-0">
                                        <div class="w-1 h-1 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div>
                                        <span class="text-slate-200 font-medium uppercase whitespace-nowrap">${issue.type}</span>
                                        <span class="text-slate-400 truncate group-hover/issue:text-slate-300 transition-colors" title="${issue.value}">${issue.value}</span>
                                    </div>
                                    <span class="font-mono text-slate-500 whitespace-nowrap ml-2 bg-slate-900/50 px-1.5 rounded border border-slate-800">
                                        ${issue.startTime.toFixed(1)}s
                                    </span>
                                </div>
                            `)}
                        </div>
                    </div>
                </div>

                <!-- Footer Action -->
                ${isComplete || isError ? html`
                    <div class="p-1 bg-slate-900 border-t border-slate-800">
                        ${isComplete ? html`
                            <button 
                                @click=${this.handleViewReport}
                                class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wide transition-all py-3 rounded-lg shadow-lg shadow-blue-900/20 hover:shadow-blue-600/20"
                            >
                                ${icons.fileText} View Full Report
                            </button>
                        ` : html`
                            <div class="w-full flex items-center justify-between px-4 bg-red-950/30 border border-red-900/30 rounded-lg text-red-400 text-[10px] font-bold py-2.5">
                                <span class="flex items-center gap-2 truncate pr-2 min-w-0">
                                    ${icons.alertTriangle}
                                    <span class="truncate" title="${statusMessage}">${statusMessage || 'Analysis Failed'}</span>
                                </span>
                                ${progress > 0 ? html`
                                    <button 
                                        @click=${this.handleViewReport}
                                        class="px-3 py-1 bg-red-900/50 hover:bg-red-800/50 text-red-200 border border-red-800 rounded transition-colors whitespace-nowrap ml-2 text-[9px]"
                                    >
                                        View Partial
                                    </button>
                                ` : ''}
                            </div>
                        `}
                    </div>
                ` : ''}
            </div>
        `;
        render(template, this);
    }
}
customElements.define('qc-stream-card', QcStreamCard);