import { html } from 'lit-html';
import { trackTableTemplate } from './shared.js';

const adaptationSetTemplate = (as, type) => {
    const roles = as.roles.map((r) => r.value).join(', ');
    const title = `${
        type.charAt(0).toUpperCase() + type.slice(1)
    } AdaptationSet`;

    return html`
        <div class="space-y-2">
            <h5 class="font-semibold text-gray-300">
                ${title}:
                <span class="font-mono text-sm">${as.id || 'N/A'}</span>
                ${as.lang
                    ? html` <span class="text-sm font-normal"
                          >(Lang: ${as.lang})</span
                      >`
                    : ''}
                ${roles
                    ? html` <span class="text-sm font-normal"
                          >(Roles: ${roles})</span
                      >`
                    : ''}
            </h5>
            <div class="pl-4">
                ${trackTableTemplate(as.representations, type)}
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