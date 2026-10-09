import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const getTypeStyles = (type) => {
    switch (type) {
        case 'video':
            return 'bg-slate-700 text-blue-400 border-blue-500/30 shadow-[0_0_10px_-3px_#3b82f6]';
        case 'audio':
            return 'bg-slate-800 text-purple-300 border-purple-500/30 shadow-[0_0_10px_-3px_#a855f7]/20';
        case 'text':
            return 'bg-slate-800 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_-3px_#10b981]/20';
        case 'quality':
            return 'bg-slate-800 text-amber-400 border-amber-500/30 shadow-[0_0_10px_-3px_#f59e0b]/20';
        case 'tech':
            return 'bg-slate-800 text-slate-400 border-slate-800';
        default:
            return 'bg-slate-800 text-slate-400';
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
        <div class="mt-8 pt-6 border-t border-slate-800/30">
            <h4
                class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"
            >
                <div
                    class="w-1 h-1 rounded-full bg-slate-400"
                ></div>
                ${title}
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${items.map(renderer)}
            </div>
        </div>
    `;
};

const cardBase =
    'bg-slate-900/20 p-3 rounded-xl border border-slate-800/50 hover:bg-slate-900/40 hover:border-blue-500/30 transition-all duration-200 group';

const variableCard = (v) => html`
    <div
        class="${cardBase} flex justify-between items-center font-mono text-xs"
    >
        <span
            class="text-emerald-400 font-bold group-hover:text-emerald-400/80 transition-colors"
            >{$${v.name}}</span
        >
        <span
            class="text-slate-400 truncate max-w-[150px] opacity-80 group-hover:opacity-100"
            title="${v.value}"
            >${v.value}</span
        >
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
        <div class="${cardBase} text-xs">
            <div
                class="font-bold text-blue-400 mb-1 flex items-center gap-2"
            >
                Service Description ${sd.id ? `(${sd.id})` : ''}
            </div>
            <div
                class="text-slate-400 text-[10px] opacity-80 group-hover:opacity-100"
            >
                ${items.join(' • ') || 'No constraints'}
            </div>
        </div>
    `;
};

const genericDescriptorCard = (d) => html`
    <div class="${cardBase} text-xs flex justify-between items-center">
        <span
            class="text-slate-400 truncate mr-2 font-medium"
            title="${d.schemeIdUri}"
            >${d.schemeIdUri.split(/[:/]/).pop()}</span
        >
        <span
            class="text-slate-200 font-mono truncate bg-slate-800 px-2 py-0.5 rounded text-[10px]"
            title="${d.value}"
            >${d.value || '-'}</span
        >
    </div>
`;

const subsetCard = (s) => html`
    <div class="${cardBase} text-xs">
        <span
            class="text-slate-400 font-bold mr-2 uppercase tracking-wider text-[10px]"
            >Subset:</span
        >
        <span class="text-slate-100 font-medium"
            >${s.contains.join(', ')}</span
        >
    </div>
`;

export const featureGridTemplate = (vm) => {
    const { features, advanced } = vm;
    const hasFeatures = features.length > 0;
    const hasAdvanced =
        advanced &&
        Object.values(advanced).some((arr) => arr && arr.length > 0);

    if (!hasFeatures && !hasAdvanced) {
        return html`<div
            class="text-slate-400 italic text-sm p-4 text-center opacity-50"
        >
            No special features detected.
        </div>`;
    }

    return html`
        <div>
            <div class="flex flex-wrap gap-3">
                ${features.map(
        (feature) => html`
                        <div
                            class="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all hover:scale-105 cursor-default shadow-sm ${getTypeStyles(
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
                (m) => html`
                  <div class="grid grid-cols-2 lg:grid-cols-2 gap-4">
                      ${features.map((feature) => {
                    const isActive = feature.status === 'active';
                    const isWarn = feature.status === 'warn';


                    return html`
                              <div
                                  class="relative p-4 rounded-xl border transition-all duration-300 group
                        ${isActive
                            ? 'bg-blue-500/5 border-blue-500/20 shadow-[0_4px_20px_-10px_#3b82f6]'
                            : isWarn
                                ? 'bg-amber-500/5 border-amber-500/20'
                                : 'bg-slate-900/20 border-slate-800 opacity-60 hover:opacity-100 hover:bg-slate-800'}"
                              >
                                  <div
                                      class="flex items-start justify-between mb-2"
                                  >
                                      <div
                                          class="p-2 rounded-lg ${isActive
                            ? 'bg-blue-500 text-slate-100 shadow-lg shadow-blue-500/20'
                            : isWarn
                                ? 'bg-amber-500 text-slate-100'
                                : 'bg-slate-900 text-slate-400 border border-slate-800'}"
                                      >
                                          ${feature.icon}
                                      </div>
                                      <div
                                          class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${isActive
                            ? 'text-blue-400 border-blue-500/30 bg-blue-500/10'
                            : isWarn
                                ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                                : 'text-slate-400 border-slate-800 bg-slate-900/30'}"
                                      >
                                          ${isActive
                            ? 'Active'
                            : isWarn
                                ? 'Check'
                                : 'N/A'}
                                      </div>
                                  </div>

                                  <h4
                                      class="text-sm font-bold ${isActive
                            ? 'text-slate-100'
                            : 'text-slate-400'}"
                                  >
                                      ${feature.label}
                                  </h4>
                                  <p
                                      class="text-xs text-slate-400 mt-1 leading-snug"
                                  >
                                      ${feature.desc}
                                  </p>
                              </div>
                          `;
                })}
                  </div>
              `
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
                              <div class="${cardBase} text-xs">
                                  <span
                                      class="text-purple-300 font-bold"
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

