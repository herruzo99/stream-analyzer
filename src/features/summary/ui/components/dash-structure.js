import { html } from 'lit-html';
import { trackTableTemplate } from './shared.js';
import { tooltipTriggerClasses } from '@/ui/shared/constants';

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
        <div class="mt-2 p-2 bg-gray-900/50 rounded-md">
            <h6 class="text-xs font-semibold text-gray-400">
                Advanced Properties
            </h6>
            <dl
                class="grid grid-cols-[auto_1fr] gap-x-2 text-xs font-mono mt-1"
            >
                ${failover
                    ? html`
                          <dt class="text-gray-500">Failover:</dt>
                          <dd class="text-gray-300">
                              ${failover.valid ? 'Valid' : 'Not Valid'}
                          </dd>
                      `
                    : ''}
                ${resyncs && resyncs.length > 0
                    ? html`
                          <dt class="text-gray-500">Resync:</dt>
                          <dd class="text-gray-300">
                              Type ${resyncs[0].type}
                              ${resyncs[0].dT ? `| dT=${resyncs[0].dT}` : ''}
                          </dd>
                      `
                    : ''}
                ${switchingProperty
                    ? html`
                          <dt class="text-gray-500">Switching:</dt>
                          <dd class="text-gray-300">
                              &#8660; ${switchingProperty[':@'].value}
                          </dd>
                      `
                    : ''}
            </dl>
        </div>
    `;
};

const adaptationSetTemplate = (as, type) => {
    const groupInfo =
        as.group !== null
            ? html`<span
                  class="ml-2 text-xs font-mono bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full ${tooltipTriggerClasses}"
                  data-tooltip="AdaptationSets with the same Group ID are mutually exclusive; a client should only play one at a time (e.g., different camera angles)."
                  data-iso="DASH: 5.3.3.1"
                  >Group: ${as.group}</span
              >`
            : '';

    return html`
        <div class="space-y-2">
            <h5 class="font-semibold text-gray-300 flex items-center">
                ${type.charAt(0).toUpperCase() + type.slice(1)} AdaptationSet:
                <span class="font-mono text-sm ml-2">${as.id || 'N/A'}</span>
                ${groupInfo}
            </h5>
            <div class="pl-4">
                ${trackTableTemplate(as.representations, type)}
                ${advancedPropertiesTemplate(as)}
            </div>
        </div>
    `;
};

const subsetTemplate = (period) => {
    if (!period.subsets || period.subsets.length === 0) return '';
    return html`
        <div class="mt-4">
            <h5 class="font-semibold text-gray-300">Subsets</h5>
            <div class="text-xs font-mono text-gray-400 pl-4">
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

const periodTemplate = (period, index) => html`
    <details class="bg-gray-800 rounded-lg border border-gray-700" open>
        <summary
            class="font-bold text-lg p-3 cursor-pointer hover:bg-gray-700/50"
        >
            Period: ${period.id || `(index ${index})`}
            <span class="font-normal font-mono text-sm text-gray-400"
                >(Start: ${period.start}s, Duration:
                ${period.duration ? period.duration + 's' : 'N/A'})</span
            >
        </summary>
        <div class="p-4 border-t border-gray-700 space-y-4">
            ${period.videoTracks.length > 0
                ? period.videoTracks.map((as) =>
                      adaptationSetTemplate(as, 'video')
                  )
                : html`<p class="text-xs text-gray-500">
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
            ${subsetTemplate(period)}
        </div>
    </details>
`;

export const dashStructureTemplate = (summary) => {
    return summary.content.periods.length > 0
        ? html`
              <div>
                  <h3 class="text-xl font-bold mb-4">Stream Structure</h3>
                  <div class="space-y-4">
                      ${summary.content.periods.map((p, i) =>
                          periodTemplate(p, i)
                      )}
                  </div>
              </div>
          `
        : '';
};