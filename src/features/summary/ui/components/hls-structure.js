import { html } from 'lit-html';
import { trackTableTemplate } from './shared.js';

const adaptationSetTemplate = (as, type) => html`
    <div class="space-y-2">
        <h5 class="font-semibold text-slate-200">
            ${type.charAt(0).toUpperCase() + type.slice(1)} Renditions:
            <span class="font-mono text-sm"
                >${as.lang ? `(lang: ${as.lang})` : ''}</span
            >
        </h5>
        <div class="pl-4">${trackTableTemplate(as.representations, type)}</div>
    </div>
`;

const periodTemplate = (period, index) => {
    const videoAdaptationSets = period.adaptationSets.filter(
        (as) => as.contentType === 'video'
    );
    const audioAdaptationSets = period.adaptationSets.filter(
        (as) => as.contentType === 'audio'
    );
    const textAdaptationSets = period.adaptationSets.filter(
        (as) => as.contentType === 'text' || as.contentType === 'subtitles'
    );

    return html`
        <div class="p-4 border-t border-slate-700 space-y-4">
            ${videoAdaptationSets.length > 0
                ? videoAdaptationSets.map((as) =>
                      adaptationSetTemplate(as, 'video')
                  )
                : html`<p class="text-xs text-slate-500">
                      No video renditions in this period.
                  </p>`}
            ${audioAdaptationSets.length > 0
                ? audioAdaptationSets.map((as) =>
                      adaptationSetTemplate(as, 'audio')
                  )
                : ''}
            ${textAdaptationSets.length > 0
                ? textAdaptationSets.map((as) =>
                      adaptationSetTemplate(as, 'text')
                  )
                : ''}
        </div>
    `;
};

export const hlsStructureTemplate = (summary) => {
    const periods = summary.content.periods;
    if (!periods || periods.length === 0) {
        return html`<div>
            <h3 class="text-xl font-bold mb-4 text-slate-100">
                Stream Structure
            </h3>
            <p class="text-xs text-slate-500">
                No periods or tracks found to display structure.
            </p>
        </div>`;
    }

    return html`
        <div>
            <h3 class="text-xl font-bold mb-4 text-slate-100">
                Stream Structure
            </h3>
            <div
                class="bg-slate-900 rounded-lg border border-slate-700 divide-y divide-slate-700"
            >
                ${periods.map((p, i) => periodTemplate(p, i))}
            </div>
        </div>
    `;
};
