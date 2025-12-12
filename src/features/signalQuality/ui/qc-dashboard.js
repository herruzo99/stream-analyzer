import { useAnalysisStore } from '@/state/analysisStore';
import { qualityActions, useQualityStore } from '@/state/qualityStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { headlessAnalysisService } from '../application/headlessAnalysisService.js';
import { qcConfigTemplate } from './components/qc-config.js';
import { qcResultsTemplate } from './components/qc-results-viewer.js';
import './components/qc-stream-card.js';

let container = null;

class QcDashboard extends HTMLElement {
    constructor() {
        super();
        this.unsubQuality = null;
        this.unsubAnalysis = null;

        // Local view state
        this._isConfiguring = false;
    }

    connectedCallback() {
        this.classList.add('block', 'h-full', 'w-full', 'bg-slate-950', 'relative', 'overflow-hidden');
        this.render();
        this.unsubQuality = useQualityStore.subscribe(() => this.render());
        this.unsubAnalysis = useAnalysisStore.subscribe(() => this.render());
    }

    disconnectedCallback() {
        if (this.unsubQuality) this.unsubQuality();
        if (this.unsubAnalysis) this.unsubAnalysis();
    }

    handleStartBatch(streamIds, trackSelections) {
        const { streams } = useAnalysisStore.getState();
        const config = useQualityStore.getState();

        const targets = streams.filter(s => streamIds.includes(s.id));

        // Ensure audio track selection defaults to first available if missing
        targets.forEach(stream => {
            let selection = trackSelections.get(stream.id);
            if (!selection) {
                selection = { videoTrackId: null, audioTrackId: null };
                trackSelections.set(stream.id, selection);
            }

            // Resolve composite video track ID for DASH
            if (selection.videoTrackId && stream.dashRepresentationState) {
                // Find a key in the state map that ends with the selected ID
                // The keys are typically "PeriodID-RepID"
                for (const key of stream.dashRepresentationState.keys()) {
                    if (key === selection.videoTrackId || key.endsWith(`${selection.videoTrackId}`)) {
                        selection.videoTrackId = key;
                        break;
                    }
                }
            }

            if (!selection.audioTrackId) {
                const audioTracks = stream.manifest?.summary?.audioTracks || [];
                if (audioTracks.length > 0) {
                    selection.audioTrackId = audioTracks[0].id;
                }
            }
        });

        headlessAnalysisService.startBatchAnalysis(targets, {
            scanDuration: config.scanDuration,
            scanStartOffset: config.scanStartOffset,
            activeLayers: config.activeLayers,
            scanSpeed: config.scanSpeed
        }, trackSelections);

        // Switch back to grid view
        this._isConfiguring = false;
        this.render();
    }

    handleStopSingle(streamId) {
        headlessAnalysisService.stopAnalysis(streamId);
    }

    render() {
        const { streams } = useAnalysisStore.getState();
        const { jobs, selectedJobId, scanDuration, scanStartOffset, activeLayers, scanSpeed } = useQualityStore.getState();
        const activeJobCount = jobs.size;

        // 1. Detail View (Drilldown) - Highest Priority
        if (selectedJobId !== null) {
            const job = jobs.get(selectedJobId);
            if (!job) {
                qualityActions.setSelectedJobId(null);
                return;
            }

            const content = qcResultsTemplate({
                streamId: selectedJobId, // PASSING STREAM ID HERE
                issues: job.issues,
                scanDuration: scanDuration,
                onReset: () => qualityActions.setSelectedJobId(null)
            });

            render(content, this);
            return;
        }

        // 2. Configuration View (Explicitly requested or No Jobs)
        if (this._isConfiguring || activeJobCount === 0) {
            const validStreams = streams.filter(s => s.originalUrl || s.patchedManifestUrl);

            if (validStreams.length === 0) {
                render(html`
                    <div class="h-full flex flex-col items-center justify-center">
                        <div class="text-slate-600 mb-4 scale-150">${icons.inbox}</div>
                        <p class="text-slate-500">No streams available for analysis.</p>
                    </div>
                `, this);
                return;
            }

            const configContent = qcConfigTemplate({
                activeLayers,
                scanDuration,
                scanStartOffset,
                scanSpeed,
                streams: validStreams,
                streamDuration: validStreams[0]?.manifest?.duration || 600,
                // Only show cancel if we have existing jobs to go back to
                onCancel: activeJobCount > 0 ? () => { this._isConfiguring = false; this.render(); } : null,
                onStart: (selectedIds, trackSelections) => this.handleStartBatch(selectedIds, trackSelections)
            });

            render(configContent, this);
            return;
        }

        // 3. Dashboard Grid View (Monitoring Active Jobs)
        const template = html`
            <div class="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
                <div class="flex justify-between items-center mb-6 shrink-0">
                    <h2 class="text-2xl font-black text-white flex items-center gap-3">
                        ${icons.activity} Signal Monitor
                        <span class="text-sm font-normal text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">${activeJobCount} Active</span>
                    </h2>
                    <div class="flex gap-2">
                         <button @click=${() => { this._isConfiguring = true; this.render(); }} class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg flex items-center gap-2">
                            ${icons.plusCircle} Add Analysis
                         </button>
                         <div class="w-px h-8 bg-slate-800 mx-1"></div>
                         <button @click=${() => { headlessAnalysisService.stopAll(); qualityActions.resetAll(); }} class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors border border-slate-700">
                            Reset All
                         </button>
                         <button @click=${() => headlessAnalysisService.stopAll()} class="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 text-xs font-bold rounded-lg transition-colors border border-red-900/30">
                            Stop All
                         </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                    ${Array.from(jobs.entries()).map(([id, job]) => {
            const stream = streams.find(s => s.id === id);
            if (!stream) return '';
            return html`
                            <qc-stream-card 
                                .data=${{
                    job,
                    stream,
                    onClick: () => qualityActions.setSelectedJobId(id),
                    onStop: () => this.handleStopSingle(id)
                }}
                            ></qc-stream-card>
                        `;
        })}
                </div>
            </div>
        `;
        render(template, this);
    }
}
customElements.define('qc-dashboard', QcDashboard);

export const qcDashboardView = {
    mount(containerElement) {
        container = containerElement;
        render(html`<qc-dashboard></qc-dashboard>`, container);
    },
    unmount() {
        if (container) {
            render(html``, container);
            container = null;
        }
    }
};