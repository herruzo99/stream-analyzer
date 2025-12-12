import { eventBus } from '@/application/event-bus';
import {
    findChildren,
    getAttr,
    getInheritedElement,
} from '@/infrastructure/parsing/utils/recursive-parser.js';
import { EVENTS } from '@/types/events';
import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';
import { timingInfoTemplate } from './timing-info.js';

const getSegmentStrategy = (rep, as, period) => {
    const hierarchy = [
        rep.serializedManifest,
        as.serializedManifest,
        period.serializedManifest,
    ];
    if (getInheritedElement('SegmentTemplate', hierarchy))
        return {
            label: 'Template',
            icon: icons.template,
            color: 'text-purple-400',
        };
    if (getInheritedElement('SegmentList', hierarchy))
        return { label: 'List', icon: icons.list, color: 'text-blue-400' };
    if (getInheritedElement('SegmentBase', hierarchy))
        return { label: 'Base', icon: icons.database, color: 'text-amber-400' };
    return { label: 'BaseURL', icon: icons.link, color: 'text-slate-400' };
};

export const representationCardTemplate = (rep, as, stream, period) => {
    const strategy = getSegmentStrategy(rep, as, period);
    const width = rep.width?.value;
    const height = rep.height?.value;
    const resLabel = width && height ? `${width}x${height}` : null;

    // Determine segment data context for timing info
    const hierarchy = [
        rep.serializedManifest,
        as.serializedManifest,
        period.serializedManifest,
    ];
    const templateEl = getInheritedElement('SegmentTemplate', hierarchy);
    const listEl = getInheritedElement('SegmentList', hierarchy);
    const baseEl = getInheritedElement('SegmentBase', hierarchy);
    const segmentData = templateEl
        ? { type: 'SegmentTemplate', element: templateEl }
        : listEl
          ? { type: 'SegmentList', element: listEl }
          : baseEl
            ? { type: 'SegmentBase', element: baseEl }
            : {
                  type: 'BaseURL',
                  element: findChildren(rep.serializedManifest, 'BaseURL')[0],
              };

    // Check for ProducerReferenceTime
    const prtEl = getInheritedElement('ProducerReferenceTime', hierarchy);
    const prtInfo = prtEl
        ? {
              id: getAttr(prtEl, 'id'),
              type: getAttr(prtEl, 'type'),
              wallClock: getAttr(prtEl, 'wallClockTime'),
              presentationTime: getAttr(prtEl, 'presentationTime'),
          }
        : null;

    const scanType = rep.scanType;
    const codingDependency = rep.codingDependency;
    const maxPlayoutRate = rep.maxPlayoutRate;

    const handleLaunchCalculator = (e) => {
        e.preventDefault();
        e.stopPropagation();
        eventBus.dispatch(EVENTS.UI.SHOW_DASH_TIMING_CALCULATOR, {
            streamId: stream.id,
            representationId: rep.id,
        });
    };

    return html`
        <details
            class="group bg-slate-900 border border-slate-700/50 rounded hover:border-blue-500/30 transition-colors"
        >
            <summary
                class="flex items-center justify-between p-2 cursor-pointer select-none"
            >
                <div class="flex items-center gap-2 min-w-0">
                    <span
                        class="text-slate-500 group-open:rotate-90 transition-transform scale-75"
                        >${icons.chevronRight}</span
                    >

                    <div class="flex flex-col min-w-0">
                        <div class="flex items-baseline gap-2">
                            <span
                                class="font-bold text-xs text-slate-200 truncate"
                                title="${rep.id}"
                                >${rep.id}</span
                            >
                            <span class="font-mono text-[10px] text-cyan-400"
                                >${formatBitrate(rep.bandwidth)}</span
                            >
                        </div>
                        <div
                            class="flex items-center gap-2 text-[10px] text-slate-500"
                        >
                            ${resLabel
                                ? html`<span>${resLabel}</span>
                                      <span class="text-slate-700">•</span>`
                                : ''}
                            <span
                                class="${strategy.color} flex items-center gap-1"
                            >
                                <span class="scale-75">${strategy.icon}</span>
                                ${strategy.label}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Codec & Flag Pills -->
                <div class="flex items-center gap-1 shrink-0">
                    ${templateEl
                        ? html`
                              <button
                                  @click=${handleLaunchCalculator}
                                  class="p-1 hover:bg-blue-500/20 text-slate-500 hover:text-blue-300 rounded transition-colors mr-1"
                                  title="Open Timing Calculator"
                              >
                                  ${icons.calculator}
                              </button>
                          `
                        : ''}
                    <div class="hidden xs:flex items-center gap-1">
                        ${scanType === 'interlaced'
                            ? html`<span
                                  class="text-[9px] bg-orange-900/30 text-orange-300 px-1.5 py-0.5 rounded border border-orange-500/30"
                                  >INTERLACED</span
                              >`
                            : ''}
                        ${codingDependency
                            ? html`<span
                                  class="text-[9px] bg-purple-900/30 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30"
                                  >DEPENDENT</span
                              >`
                            : ''}
                        ${rep.codecs.map(
                            (c) => html`
                                <span
                                    class="text-[9px] font-mono bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded"
                                    title="${c.value}"
                                    >${c.value.split('.')[0]}</span
                                >
                            `
                        )}
                    </div>
                </div>
            </summary>

            <div class="border-t border-slate-700/50 p-2 bg-slate-950/30">
                ${timingInfoTemplate(segmentData, stream)}
                ${maxPlayoutRate || codingDependency !== null
                    ? html`
                          <div
                              class="mt-3 pt-2 border-t border-slate-800 flex gap-4"
                          >
                              ${maxPlayoutRate
                                  ? html`
                                        <div class="text-[9px] flex gap-1">
                                            <span
                                                class="text-slate-500 font-bold"
                                                >Max Playout Rate:</span
                                            >
                                            <span
                                                class="text-slate-300 font-mono"
                                                >${maxPlayoutRate}x</span
                                            >
                                        </div>
                                    `
                                  : ''}
                              ${codingDependency !== null
                                  ? html`
                                        <div class="text-[9px] flex gap-1">
                                            <span
                                                class="text-slate-500 font-bold"
                                                >Coding Dependency:</span
                                            >
                                            <span
                                                class="text-slate-300 font-mono"
                                                >${codingDependency
                                                    ? 'Yes'
                                                    : 'No'}</span
                                            >
                                        </div>
                                    `
                                  : ''}
                          </div>
                      `
                    : ''}
                ${prtInfo
                    ? html`
                          <div class="mt-3 pt-2 border-t border-slate-800">
                              <h5
                                  class="text-[9px] font-bold text-slate-500 uppercase mb-1"
                              >
                                  Producer Ref Time (ID: ${prtInfo.id})
                              </h5>
                              <div
                                  class="text-[9px] font-mono text-slate-300 grid grid-cols-[auto_1fr] gap-x-2"
                              >
                                  <span class="text-slate-500">Type:</span>
                                  <span>${prtInfo.type}</span>
                                  <span class="text-slate-500">Wall:</span>
                                  <span
                                      class="truncate"
                                      title="${prtInfo.wallClock}"
                                      >${prtInfo.wallClock}</span
                                  >
                                  <span class="text-slate-500">Pres:</span>
                                  <span>${prtInfo.presentationTime}</span>
                              </div>
                          </div>
                      `
                    : ''}
            </div>
        </details>
    `;
};