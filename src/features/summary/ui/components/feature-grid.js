import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const getTypeStyles = (type) => {
    switch (type) {
        case 'video':
            return 'bg-blue-900/30 text-blue-300 border-blue-700/50';
        case 'audio':
            return 'bg-purple-900/30 text-purple-300 border-purple-700/50';
        case 'text':
            return 'bg-green-900/30 text-green-300 border-green-700/50';
        case 'quality':
            return 'bg-amber-900/30 text-amber-300 border-amber-700/50';
        case 'tech':
            return 'bg-slate-700/50 text-slate-300 border-slate-600';
        default:
            return 'bg-gray-800 text-gray-400';
    }
};

const getIcon = (type) => {
    switch (type) {
        case 'video':
            return icons.clapperboard;
        case 'audio':
            return icons.audioLines;
        case 'text':
            return icons.fileText;
        case 'quality':
            return icons.star;
        case 'tech':
            return icons.server;
        default:
            return icons.tag;
    }
};

const advancedSection = (title, items, renderer) => {
    if (!items || items.length === 0) return '';
    return html`
        <div class="mt-6 pt-4 border-t border-slate-700/50">
            <h4
                class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3"
            >
                ${title}
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${items.map(renderer)}
            </div>
        </div>
    `;
};

const variableCard = (v) => html`
    <div
        class="bg-slate-900/50 p-2 rounded border border-slate-800 flex justify-between items-center font-mono text-xs"
    >
        <span class="text-emerald-400 font-bold">{$${v.name}}</span>
        <span class="text-slate-300 truncate max-w-[150px]" title="${v.value}"
            >${v.value}</span
        >
    </div>
`;

const metricCard = (m) => html`
    <div class="bg-slate-900/50 p-2 rounded border border-slate-800 text-xs">
        <div class="font-bold text-slate-400 mb-1">Metrics (${m.metrics})</div>
        <div class="space-y-1">
            ${m.reporting.map(
                (r) => html`
                    <div class="flex justify-between gap-2">
                        <span
                            class="text-purple-300 truncate"
                            title="${r.schemeIdUri}"
                            >${r.schemeIdUri.split(':').pop()}</span
                        >
                        <span class="text-slate-500 truncate max-w-[100px]"
                            >${r.value}</span
                        >
                    </div>
                `
            )}
        </div>
    </div>
`;

const serviceDescCard = (sd) => {
    const items = [
        ...sd.latencies.map((l) => `Target: ${l.target}ms`),
        ...sd.operatingQuality.map(
            (q) => `Qual: ${q.min || 0}-${q.max || 'Max'}`
        ),
        ...sd.operatingBandwidth.map((b) => `BW: ${b.target || 'Auto'}bps`),
    ];

    return html`
        <div
            class="bg-slate-900/50 p-2 rounded border border-slate-800 text-xs"
        >
            <div class="font-bold text-blue-400 mb-1">
                Service Description ${sd.id ? `(${sd.id})` : ''}
            </div>
            <div class="text-slate-300 text-[10px]">
                ${items.join(' • ') || 'No constraints'}
            </div>
        </div>
    `;
};

const genericDescriptorCard = (d) => html`
    <div
        class="bg-slate-900/50 p-2 rounded border border-slate-800 text-xs flex justify-between"
    >
        <span class="text-slate-400 truncate mr-2" title="${d.schemeIdUri}"
            >${d.schemeIdUri.split(/[:/]/).pop()}</span
        >
        <span class="text-slate-200 font-mono truncate" title="${d.value}"
            >${d.value || '-'}</span
        >
    </div>
`;

const subsetCard = (s) => html`
    <div class="bg-slate-900/50 p-2 rounded border border-slate-800 text-xs">
        <span class="text-slate-400 font-bold mr-2">Subset:</span>
        <span class="text-slate-200">${s.contains.join(', ')}</span>
    </div>
`;

export const featureGridTemplate = (vm) => {
    const { features, advanced } = vm;
    const hasFeatures = features.length > 0;
    const hasAdvanced =
        advanced &&
        Object.values(advanced).some((arr) => arr && arr.length > 0);

    if (!hasFeatures && !hasAdvanced) {
        return html`<div class="text-slate-500 italic text-sm p-4">
            No special features detected.
        </div>`;
    }

    return html`
        <div>
            <div class="flex flex-wrap gap-2">
                ${features.map(
                    (feature) => html`
                        <div
                            class="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all hover:scale-105 cursor-default ${getTypeStyles(
                                feature.type
                            )}"
                        >
                            ${getIcon(feature.type)} ${feature.label}
                        </div>
                    `
                )}
            </div>

            ${advanced
                ? html`
                      ${advancedSection(
                          'Playlist Variables',
                          advanced.variables,
                          variableCard
                      )}
                      ${advancedSection(
                          'Reporting & Metrics',
                          advanced.metrics,
                          metricCard
                      )}
                      ${advancedSection(
                          'Service Descriptions',
                          advanced.serviceDescriptions,
                          serviceDescCard
                      )}
                      ${advancedSection(
                          'Ratings',
                          advanced.ratings,
                          genericDescriptorCard
                      )}
                      ${advancedSection(
                          'Viewpoints',
                          advanced.viewpoints,
                          genericDescriptorCard
                      )}
                      ${advancedSection(
                          'Subsets',
                          advanced.subsets,
                          subsetCard
                      )}
                      ${advancedSection(
                          'Content Popularity',
                          advanced.popularityRates,
                          (pr) => html`
                              <div
                                  class="bg-slate-900/50 p-2 rounded border border-slate-800 text-xs"
                              >
                                  <span class="text-purple-300"
                                      >${pr.source}:</span
                                  >
                                  ${pr.count} rates defined.
                              </div>
                          `
                      )}
                  `
                : ''}
        </div>
    `;
};
