import { html } from 'lit-html';
import { useUiStore, uiActions } from '@/state/uiStore';
import { createHlsTimelineViewModel } from './view-model.js';
import { metricPanelTemplate } from '../components/metric-panel.js';
import '../components/master-timeline.js';
import { connectedTabBar } from '@/ui/components/tabs.js';
import { hlsCascadeViewTemplate } from './components/cascade-view.js';
import * as icons from '@/ui/icons';

/**
 * Renders the complete timeline view for an HLS stream.
 * @param {import('@/types').Stream} stream
 * @param {number | null} playheadTime
 * @returns {import('lit-html').TemplateResult}
 */
export const hlsTimelineTemplate = (stream, playheadTime) => {
    const viewModel = createHlsTimelineViewModel(stream);
    const { timelineHoveredItem, timelineSelectedItem, timelineActiveTab } =
        useUiStore.getState();

    if (!viewModel) {
        return html`<p>Error generating timeline view model.</p>`;
    }

    const tabs = [{ key: 'overview', label: 'General' }];
    if (stream.manifest?.isMaster) {
        tabs.push({ key: 'cascade', label: 'Drilldown' });
    }

    const overviewTemplate = html`
        <div class="space-y-8 mt-4">
            <div>
                <h3 class="text-xl font-bold text-slate-100 mb-4">
                    Master Timeline
                </h3>

                <div
                    class="bg-blue-900/20 border border-blue-800/50 p-3 rounded-md mb-4 flex gap-3 text-sm text-blue-200"
                >
                    <span class="text-blue-400 mt-0.5 shrink-0"
                        >${icons.info}</span
                    >
                    <p>
                        To visualize dynamic data like
                        <strong>ABR switches</strong>,
                        <strong>Ad Breaks</strong>, and
                        <strong>In-band Events</strong>, ensure the
                        <button
                            class="text-blue-400 hover:underline font-semibold"
                            @click=${() =>
                                /** @type {HTMLElement} */ (
                                    document.querySelector(
                                        '[data-tab="player-simulation"]'
                                    )
                                )?.click()}
                        >
                            Player Simulation
                        </button>
                        is running or
                        <button
                            class="text-blue-400 hover:underline font-semibold"
                            @click=${() =>
                                /** @type {HTMLElement} */ (
                                    document.querySelector(
                                        '[data-testid="context-switcher"] button'
                                    )
                                )?.click()}
                        >
                            Active Segment Polling
                        </button>
                        is enabled.
                    </p>
                </div>

                <div
                    class="h-80 bg-slate-800/50 rounded-lg border border-slate-700 p-4 relative"
                >
                    <master-timeline-chart
                        .entities=${viewModel.timedEntities}
                        .totalVodDuration=${viewModel.totalDuration}
                        .initialTimeOffset=${viewModel.timeOffset}
                        .isLive=${viewModel.isLive}
                        .liveEdge=${viewModel.liveEdge}
                        .dvrWindow=${viewModel.dvrWindow}
                        .suggestedLivePoint=${viewModel.suggestedLivePoint}
                        .playheadTime=${playheadTime}
                    ></master-timeline-chart>
                </div>
            </div>
            <div>
                ${metricPanelTemplate(
                    viewModel,
                    timelineHoveredItem,
                    timelineSelectedItem
                )}
            </div>
        </div>
    `;

    // If it's a media playlist, force to overview tab.
    const activeTab = stream.manifest?.isMaster
        ? timelineActiveTab
        : 'overview';

    return html`
        <div class="flex flex-col h-full">
            ${connectedTabBar(tabs, activeTab, uiActions.setTimelineActiveTab)}
            ${activeTab === 'cascade'
                ? hlsCascadeViewTemplate(stream)
                : overviewTemplate}
        </div>
    `;
};
