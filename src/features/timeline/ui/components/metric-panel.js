import { html } from 'lit-html';
import { metricCardTemplate } from './metric-card.js';
import * as icons from '@/ui/icons';

const renderSection = (section, hoveredItem, selectedItem) => {
    if (!section || !section.metrics || section.metrics.length === 0) {
        return html``;
    }

    return html`
        <section class="space-y-4">
            <h3
                class="text-xl font-bold text-slate-100 flex items-center gap-2"
            >
                ${icons.timer} ${section.title}
            </h3>
            <p class="text-sm text-slate-400 -mt-3">${section.description}</p>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                ${section.metrics.map((metric) =>
                    metricCardTemplate(metric, hoveredItem, selectedItem)
                )}
            </div>
        </section>
    `;
};

/**
 * Renders the main panel with detailed timing information.
 * @param {object} viewModel - The timeline view model.
 * @param {import('@/types').TimedEntity | null} hoveredItem
 * @param {import('@/types').TimedEntity | null} selectedItem
 * @returns {import('lit-html').TemplateResult}
 */
export const metricPanelTemplate = (viewModel, hoveredItem, selectedItem) => {
    if (!viewModel) {
        return html``;
    }
    return html`
        <div class="space-y-8">
            ${renderSection(
                viewModel.explicitDurations,
                hoveredItem,
                selectedItem
            )}
            ${renderSection(
                viewModel.inferredTimings,
                hoveredItem,
                selectedItem
            )}
            ${renderSection(viewModel.syncAndEvents, hoveredItem, selectedItem)}
        </div>
    `;
};
