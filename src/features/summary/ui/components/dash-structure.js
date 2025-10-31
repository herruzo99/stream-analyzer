import { html } from 'lit-html';
import { trackTableTemplate } from './shared.js';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import * as icons from '@/ui/icons';

const contentComponentsTemplate = (as) => {
    if (!as.contentComponents || as.contentComponents.length <= 1) {
        return '';
    }

    return html`
        <div class="mt-2 p-2 bg-slate-900/50 rounded-md">
            <h6
                class="text-xs font-semibold text-slate-400 ${tooltipTriggerClasses}"
                data-tooltip="This AdaptationSet contains multiple multiplexed media components. All Representations below apply to each of these components."
                data-iso="DASH: 5.3.4"
            >
                Multiplexed Components (${as.contentComponents.length})
            </h6>
            <div class="mt-1 space-y-1">
                ${as.contentComponents.map(
                    (comp) => html`
                        <div
                            class="text-xs font-mono text-slate-300 bg-slate-800/50 p-1 rounded"
                        >
                            <strong>ID:</strong> ${comp.id || 'N/A'} |
                            <strong>Lang:</strong> ${comp.lang || 'N/A'} |
                            <strong>Roles:</strong> ${comp.roles
                                .map((r) => r.value)
                                .join(', ') || 'N/A'}
                        </div>
                    `
                )}
            </div>
        </div>
    `;
};

const advancedPropertiesTemplate = (as) => {
    const failover = as.representations[0]?.failoverContent;
    const resyncs = as.resyncs || as.representations[0]?.resyncs;
    const switchingProperty = (
        as.serializedManifest.SupplementalProperty || []
    ).find(
        (p) =>
            p[':@'].schemeIdUri ===
            'urn:mpeg:dash:adaptation-set-switching:2016'
    );

    if (!failover && (!resyncs || resyncs.length === 0) && !switchingProperty)
        return '';

    return html`
        <div class="mt-2 p-2 bg-slate-900/50 rounded-md">
            <h6 class="text-xs font-semibold text-slate-400">
                Advanced Properties
            </h6>
            <dl
                class="grid grid-cols-[auto_1fr] gap-x-2 text-xs font-mono mt-1"
            >
                ${failover
                    ? html`
                          <dt class="text-slate-500">Failover:</dt>
                          <dd class="text-slate-300">
                              ${failover.valid ? 'Valid' : 'Not Valid'}
                          </dd>
                      `
                    : ''}
                ${resyncs && resyncs.length > 0
                    ? html`
                          <dt class="text-slate-500">Resync:</dt>
                          <dd class="text-slate-300">
                              Type ${resyncs[0].type}
                              ${resyncs[0].dT ? `| dT=${resyncs[0].dT}` : ''}
                          </dd>
                      `
                    : ''}
                ${switchingProperty
                    ? html`
                          <dt class="text-slate-500">Switching:</dt>
                          <dd class="text-slate-300">
                              &#8660; ${switchingProperty[':@'].value}
                          </dd>
                      `
                    : ''}
            </dl>
        </div>
    `;
};

const propertyItemTemplate = ({ isEnabled, icon, label, tooltip, isoRef }) => {
    const stateClasses = isEnabled ? 'text-green-300' : 'text-slate-500';
    return html`
        <div
            class="flex items-center gap-1.5 ${tooltipTriggerClasses} ${stateClasses}"
            data-tooltip="${tooltip}"
            data-iso="${isoRef}"
        >
            ${icon}
            <span class="font-semibold">${label}</span>
        </div>
    `;
};

const adaptationSetPropertiesTemplate = (as) => {
    const properties = [
        {
            isEnabled: as.segmentAlignment,
            icon: icons.aligned,
            label: 'Aligned',
            tooltip:
                'Segment Alignment: Aligned segments simplify ABR switching.',
            isoRef: 'DASH: 5.3.3.2',
        },
        {
            isEnabled: as.bitstreamSwitching,
            icon: icons.seamless,
            label: 'Seamless',
            tooltip:
                'Bitstream Switching: Allows concatenation of segments from different Representations without decoder re-initialization.',
            isoRef: 'DASH: 5.3.3.2',
        },
        as.outputProtection
            ? {
                  isEnabled: true,
                  icon: html`<span class="text-red-300">${icons.hdcp}</span>`,
                  label: 'HDCP',
                  tooltip: `Output Protection Required: ${as.outputProtection.value || as.outputProtection.schemeIdUri}`,
                  isoRef: 'DASH: 5.8.4.12',
              }
            : null,
    ].filter(Boolean);

    return html`
        <div
            class="flex items-center gap-4 text-xs bg-slate-800/50 border border-slate-700 rounded-md px-3 py-1"
        >
            ${properties.map((prop) => propertyItemTemplate(prop))}
        </div>
    `;
};

const adaptationSetTemplate = (as, type) => {
    return html`
        <div class="space-y-2">
            <h5
                class="font-semibold text-slate-200 flex items-center justify-between flex-wrap gap-y-2"
            >
                <div class="flex items-center gap-2">
                    <span
                        >${type.charAt(0).toUpperCase() + type.slice(1)}
                        AdaptationSet:</span
                    >
                    <span class="font-mono text-sm">${as.id || 'N/A'}</span>
                    ${as.group !== null
                        ? html`<span
                              class="text-xs font-mono bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full"
                              >Group: ${as.group}</span
                          >`
                        : ''}
                </div>
                <div class="mt-1 sm:mt-0">
                    ${adaptationSetPropertiesTemplate(as)}
                </div>
            </h5>
            <div class="pl-4">
                ${trackTableTemplate(as.representations, type)}
                ${contentComponentsTemplate(as)}
                ${advancedPropertiesTemplate(as)}
            </div>
        </div>
    `;
};

const subsetTemplate = (period) => {
    if (!period.subsets || period.subsets.length === 0) return '';
    return html`
        <div class="mt-4">
            <h5 class="font-semibold text-slate-200">Subsets</h5>
            <div class="text-xs font-mono text-slate-400 pl-4">
                ${period.subsets.map(
                    (s) =>
                        html`<div>
                            <strong>${s.id || 'default'}:</strong> contains
                            [${s.contains.join(', ')}]
                        </div>`
                )}
            </div>
        </div>
    `;
};

const preselectionsTemplate = (period) => {
    if (!period.preselections || period.preselections.length === 0) return '';
    return html`
        <div class="mt-4">
            <h5
                class="font-semibold text-slate-200 ${tooltipTriggerClasses}"
                data-tooltip="A Preselection defines a curated set of Adaptation Sets that form a specific, complete user experience (e.g., for immersive audio)."
                data-iso="DASH: 5.3.11"
            >
                Preselections
            </h5>
            <div class="pl-4 space-y-2 mt-1">
                ${period.preselections.map(
                    (p) => html`
                        <div
                            class="text-xs font-mono text-slate-400 bg-slate-900/50 p-2 rounded"
                        >
                            <div class="text-slate-200">
                                <strong>ID:</strong> ${p.id} |
                                <strong>Lang:</strong> ${p.lang || 'N/A'} |
                                <strong>Roles:</strong> ${p.roles
                                    .map((r) => r.value)
                                    .join(', ') || 'N/A'}
                            </div>
                            <div class="mt-1">
                                <strong>Components:</strong>
                                [${p.preselectionComponents.join(', ')}]
                            </div>
                        </div>
                    `
                )}
            </div>
        </div>
    `;
};

const periodTemplate = (period, index) => html`
    <details
        class="bg-slate-900 rounded-lg border border-slate-700 details-animated"
        open
    >
        <summary
            class="font-bold text-lg p-3 cursor-pointer hover:bg-slate-700/50 text-slate-100"
        >
            Period: ${period.id || `(index ${index})`}
            <span class="font-normal font-mono text-sm text-slate-400"
                >(Start: ${period.start}s, Duration:
                ${period.duration ? period.duration + 's' : 'N/A'})</span
            >
        </summary>
        <div class="p-4 border-t border-slate-700 space-y-4">
            ${period.videoTracks.length > 0
                ? period.videoTracks.map((as) =>
                      adaptationSetTemplate(as, 'video')
                  )
                : html`<p class="text-xs text-slate-500">
                      No video Adaptation Sets in this period.
                  </p>`}
            ${period.audioTracks.length > 0
                ? period.audioTracks.map((as) =>
                      adaptationSetTemplate(as, 'audio')
                  )
                : ''}
            ${period.textTracks.length > 0
                ? period.textTracks.map((as) =>
                      adaptationSetTemplate(as, 'text')
                  )
                : ''}
            ${subsetTemplate(period)} ${preselectionsTemplate(period)}
        </div>
    </details>
`;

export const dashStructureTemplate = (summary) => {
    return summary.content.periods.length > 0
        ? html`
              <div>
                  <h3 class="text-xl font-bold mb-4 text-slate-100">Stream Structure</h3>
                  <div class="space-y-4">
                      ${summary.content.periods.map((p, i) =>
                          periodTemplate(p, i)
                      )}
                  </div>
              </div>
          `
        : '';
};