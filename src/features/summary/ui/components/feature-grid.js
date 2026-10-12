import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const getTypeStyles = () =>
    'bg-white/[0.02] text-slate-300 border-white/10';

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
        <div class="mt-6 pt-4 border-t border-white/5">
            <h4 class="mono text-[11px] font-medium text-slate-500 mb-2.5">
                ${String(title).toLowerCase()}
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${items.map(renderer)}
            </div>
        </div>
    `;
};

const cardBase =
    'bg-white/[0.02] p-3 rounded-md border border-white/5';

const variableCard = (v) => html`
    <div class="${cardBase} flex justify-between items-center gap-2 font-mono text-xs">
        <span class="text-emerald-300 shrink-0">{$${v.name}}</span>
        <span class="text-slate-500 truncate" title="${v.value}">
            ${v.value}
        </span>
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
            <div class="font-medium text-slate-200 mb-1">
                Service description ${sd.id ? `(${sd.id})` : ''}
            </div>
            <div class="mono text-[10px] text-slate-500">
                ${items.join(' · ') || 'No constraints'}
            </div>
        </div>
    `;
};

const safeSchemeTail = (uri) => {
    if (typeof uri !== 'string' || !uri) return 'descriptor';
    return uri.split(/[:/]/).filter(Boolean).pop() || 'descriptor';
};

const genericDescriptorCard = (d) => html`
    <div class="${cardBase} text-xs flex justify-between items-center gap-2">
        <span class="text-slate-400 truncate" title="${d.schemeIdUri}"
            >${safeSchemeTail(d.schemeIdUri)}</span
        >
        <span
            class="text-slate-200 font-mono truncate bg-black/30 px-2 py-0.5 rounded text-[10px]"
            title="${d.value}"
            >${d.value || '-'}</span
        >
    </div>
`;

const subsetCard = (s) => html`
    <div class="${cardBase} text-xs">
        <span class="mono text-[10px] text-slate-500 mr-2">subset:</span>
        <span class="text-slate-100 font-medium"
            >${(s.contains || []).join(', ')}</span
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
        return html`<p
            class="mono text-slate-600 text-[11px] p-3 text-center"
        >
            No special features detected.
        </p>`;
    }

    return html`
        <div>
            <div class="flex flex-wrap gap-1.5">
                ${features.map(
                    (feature) => html`
                        <span
                            class="mono inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] cursor-default ${getTypeStyles()}"
                        >
                            ${getIcon(feature.type)}
                            ${String(feature.label).toLowerCase()}
                        </span>
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
                (m) => {
                    const ranges = (m.ranges || [])
                        .map((r) => `${r.starttime ?? '?'} +${r.duration ?? '?'}`)
                        .join(', ');
                    const reporting = (m.reporting || [])
                        .map((r) => r.schemeIdUri?.split(/[:/]/).pop() || r.value || 'report')
                        .join(', ');
                    return html`
                              <div class="rounded-md border border-white/5 bg-white/[0.02] p-3 text-xs">
                                  <div class="font-medium text-slate-100 mb-1">
                                      ${m.metrics || 'Metrics'}
                                  </div>
                                  ${ranges
                            ? html`<div class="mono text-[10px] text-slate-500">
                                            ranges: ${ranges}
                                        </div>`
                            : ''}
                                  ${reporting
                            ? html`<div class="mono text-[10px] text-slate-500 mt-0.5">
                                            reporting: ${reporting}
                                        </div>`
                            : ''}
                              </div>
                          `;
                }
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
                                  <span class="text-slate-200 font-medium"
                                      >${pr.source}:</span
                                  >
                                  <span class="mono text-[10px] text-slate-500">
                                      ${pr.count} rate${pr.count === 1 ? '' : 's'}
                                  </span>
                              </div>
                          `
            )}
    `
            : ''}
        </div>
    `;
};

