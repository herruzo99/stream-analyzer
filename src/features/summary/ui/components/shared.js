import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { html } from 'lit-html';

import * as icons from '@/ui/icons';

const renderSourcedValue = (sourcedData) => {
    if (
        typeof sourcedData === 'object' &&
        sourcedData !== null &&
        'source' in sourcedData
    ) {
        return html`${sourcedData.value}${sourcedData.source === 'segment'
            ? html`<span
                  class="mono ml-1.5 text-[10px] text-slate-500 border border-white/10 rounded px-1 ${tooltipTriggerClasses}"
                  data-tooltip="This value was derived by inspecting a media segment, not from the manifest."
                  >seg</span
              >`
            : ''}`;
    }

    if (typeof sourcedData === 'boolean') {
        return sourcedData
            ? html`<span class="text-emerald-400 font-semibold"
                  >Yes</span
              >`
            : html`<span class="text-slate-400">No</span>`;
    }

    if (
        sourcedData === null ||
        sourcedData === undefined ||
        sourcedData === ''
    ) {
        return html`<span class="text-slate-400">N/A</span>`;
    }

    return sourcedData;
};

export const renderCodecInfo = (codecInfo) => {
    const supportedIcon = codecInfo.supported
        ? icons.checkCircle
        : icons.xCircleRed;
    const colorClass = codecInfo.supported
        ? 'text-emerald-400'
        : 'text-red-400';
    const tooltip = codecInfo.supported
        ? 'Codec is supported by internal parsers.'
        : 'Codec is not supported by internal parsers.';

    return html`<div class="flex items-center">
        ${renderSourcedValue(codecInfo)}${html`<span
            class="inline-block ml-2 shrink-0 ${colorClass} ${tooltipTriggerClasses}"
            data-tooltip=${tooltip}
            >${supportedIcon}</span
        >`}
    </div>`;
};

export const statCardTemplate = ({
    label,
    value,
    tooltip = '',
    isoRef = null,
    customClasses = '',
    icon = null,
    colorVar = null,
    iconBgClass = 'bg-white/5 text-slate-400',
}) => {
    if (colorVar) {
        iconBgClass = `bg-[var(${colorVar})]/10 text-[var(${colorVar})]`;
    }
    if (value === null || value === undefined) {
        return '';
    }

    return html`
        <div
            class="bg-white/5 p-3 rounded-md border border-white/10 flex items-center gap-4 ${customClasses}"
        >
            ${icon
                ? html`<div
                      class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconBgClass}"
                  >
                      ${icon}
                  </div>`
                : ''}
            <div class="grow">
                <dt
                    class="text-xs font-medium text-slate-400 ${tooltipTriggerClasses}"
                    data-tooltip="${tooltip}"
                    data-iso="${isoRef}"
                >
                    ${label}
                </dt>
                <dd
                    class="text-base text-left font-mono text-slate-200 mt-1 wrap-break-word"
                >
                    ${renderSourcedValue(value)}
                </dd>
            </div>
        </div>
    `;
};
