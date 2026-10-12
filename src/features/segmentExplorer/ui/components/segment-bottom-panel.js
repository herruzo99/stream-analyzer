import { eventBus } from '@/application/event-bus';
import { getSegmentAnalysisTemplate } from '@/features/segmentAnalysis/ui/index';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const propertyRow = (label, value, isCode = false) => html`
    <div class="flex items-start justify-between gap-3">
        <span class="mono text-[11px] text-slate-500 shrink-0">${label}</span>
        <span
            class="mono text-[11px] text-slate-200 text-right break-all ${isCode ? 'bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/5' : ''}"
        >
            ${value}
        </span>
    </div>
`;

const sectionTitle = (label) => html`
    <p class="mono text-[10px] text-slate-500 mb-2">${label}</p>
`;

export const segmentBottomPanelTemplate = (stream) => {
    const { segmentExplorerSelectedSegment, segmentExplorerActiveTab } =
        useUiStore.getState();
    const segment = segmentExplorerSelectedSegment;

    if (!segment) return null;

    const { get } = useSegmentCacheStore.getState();
    const cacheEntry = get(segment.uniqueId);
    const isLoaded = cacheEntry?.status === 200;
    const isLoading = cacheEntry?.status === -1;

    const close = () => uiActions.setSegmentExplorerSelectedSegment(null);

    const handleLoad = () => {
        const urlForInference = segment.resolvedUrl.startsWith('local://')
            ? segment.template
            : segment.resolvedUrl;

        const { contentType } = inferMediaInfoFromExtension(urlForInference);

        let formatHint =
            stream.manifest.segmentFormat === 'unknown'
                ? null
                : stream.manifest.segmentFormat;

        if (contentType === 'text') {
            const urlLower = urlForInference.toLowerCase();
            if (
                urlLower.endsWith('.ttml') ||
                urlLower.endsWith('.dfxp') ||
                urlLower.endsWith('.xml')
            ) {
                formatHint = 'ttml';
            } else {
                formatHint = 'vtt';
            }
        }

        useSegmentCacheStore.getState().set(segment.uniqueId, {
            status: -1,
            data: null,
            parsedData: null,
        });
        eventBus.dispatch('segment:fetch', {
            uniqueId: segment.uniqueId,
            streamId: stream.id,
            format: formatHint,
            context: { isIFrame: false },
        });
    };

    const handleDeepInspect = () =>
        uiActions.navigateToInteractiveSegment(segment.uniqueId);

    const fileName = segment.resolvedUrl
        ? segment.resolvedUrl.split('/').pop().split('?')[0]
        : 'unknown';
    const durationSec = segment.timescale
        ? segment.duration / segment.timescale
        : 0;
    const startSec = segment.timescale ? segment.time / segment.timescale : 0;

    const isCompareMode = segmentExplorerActiveTab === 'segment-comparison';

    let rightPaneContent;
    if (isLoading) {
        rightPaneContent = html`
            <div class="flex flex-col items-center justify-center h-full p-8 text-center">
                <p class="mono text-[11px] text-slate-500">
                    downloading segment…
                </p>
            </div>
        `;
    } else if (!isLoaded) {
        rightPaneContent = html`
            <div class="flex flex-col items-center justify-center h-full p-8 text-center">
                <p class="text-[15px] font-medium text-slate-200 mb-1">
                    Segment not loaded.
                </p>
                <p class="mono text-[11px] text-slate-600 mb-4 max-w-xs leading-relaxed">
                    Load it to inspect structure, compliance, and bitstream
                    details.
                </p>
                <button
                    @click=${handleLoad}
                    class="px-4 py-2 rounded-md bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-[13px] font-medium transition-colors flex items-center gap-2"
                >
                    ${icons.download} Load segment
                </button>
            </div>
        `;
    } else if (cacheEntry?.parsedData) {
        rightPaneContent = html`
            <div class="h-full overflow-hidden flex flex-col">
                <div class="grow min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                    ${getSegmentAnalysisTemplate(
                        cacheEntry.parsedData,
                        null,
                        false,
                        segment.uniqueId
                    )}
                </div>
            </div>
        `;
    } else {
        rightPaneContent = html`
            <div class="flex items-center justify-center h-full p-8 text-center">
                <p class="mono text-[11px] text-slate-600">
                    data loaded but parsing failed.
                </p>
            </div>
        `;
    }

    return html`
        <div class="h-full flex flex-col min-h-0">
            <div
                class="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/5 shrink-0"
            >
                <div class="min-w-0">
                    <p class="text-[13px] font-medium text-slate-100 truncate">
                        ${isCompareMode
                            ? 'Segment comparison'
                            : segment.type === 'Init'
                              ? 'Init segment'
                              : `Segment #${segment.number}`}
                    </p>
                    <p
                        class="mono text-[10px] text-slate-600 truncate"
                        title="${fileName}"
                    >
                        ${fileName}
                    </p>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    <button
                        @click=${close}
                        aria-label="Close segment details"
                        class="p-1.5 rounded-md text-slate-500 hover:text-slate-100 hover:bg-white/10 transition-colors"
                    >
                        ${icons.x}
                    </button>
                </div>
            </div>

            <div class="grow min-h-0 overflow-hidden">
                ${isCompareMode
                    ? getSegmentAnalysisTemplate(null, null, true)
                    : html`
                          <div class="h-full flex min-h-0">
                              <div
                                  class="w-72 shrink-0 border-r border-white/5 flex flex-col min-h-0"
                              >
                                  <div
                                      class="p-4 overflow-y-auto space-y-5 custom-scrollbar grow min-h-0"
                                  >
                                      ${isLoaded
                                          ? html`
                                                <button
                                                    @click=${handleDeepInspect}
                                                    class="w-full px-3 py-2 rounded-md border border-white/10 text-[12px] font-medium text-slate-400 hover:text-slate-100 hover:border-white/25 transition-colors flex items-center justify-center gap-1.5"
                                                >
                                                    ${icons.binary} Hex
                                                    inspector
                                                </button>
                                            `
                                          : ''}
                                      <div>
                                          ${sectionTitle('timing')}
                                          <div
                                              class="rounded-md border border-white/5 bg-[#06090f] p-3 space-y-2"
                                          >
                                              ${propertyRow(
                                                  'duration',
                                                  `${durationSec.toFixed(3)}s`
                                              )}
                                              ${propertyRow(
                                                  'pts start',
                                                  startSec.toFixed(3)
                                              )}
                                              ${propertyRow(
                                                  'timescale',
                                                  segment.timescale
                                              )}
                                              ${segment.startTimeUTC
                                                  ? propertyRow(
                                                        'utc',
                                                        new Date(
                                                            segment.startTimeUTC
                                                        ).toLocaleTimeString()
                                                    )
                                                  : ''}
                                          </div>
                                      </div>

                                      <div>
                                          ${sectionTitle('metadata')}
                                          <div
                                              class="rounded-md border border-white/5 bg-[#06090f] p-3 space-y-2"
                                          >
                                              ${propertyRow(
                                                  'rep id',
                                                  segment.repId,
                                                  true
                                              )}
                                              ${propertyRow(
                                                  'encrypted',
                                                  segment.encryptionInfo
                                                      ? 'yes'
                                                      : 'no'
                                              )}
                                              ${propertyRow(
                                                  'gap',
                                                  segment.gap ? 'yes' : 'no'
                                              )}
                                          </div>
                                      </div>

                                      ${segment.sidx
                                          ? html`
                                                <div>
                                                    ${sectionTitle('sidx index')}
                                                    <div
                                                        class="rounded-md border border-white/5 bg-[#06090f] p-3 space-y-2"
                                                    >
                                                        ${propertyRow(
                                                            'referenced size',
                                                            `${segment.sidx.referencedSize} bytes`
                                                        )}
                                                        ${propertyRow(
                                                            'subsegment dur',
                                                            segment.sidx
                                                                .subsegmentDuration
                                                        )}
                                                        ${propertyRow(
                                                            'starts w/ sap',
                                                            segment.sidx
                                                                .startsWithSap
                                                                ? 'yes'
                                                                : 'no'
                                                        )}
                                                        ${propertyRow(
                                                            'sap type',
                                                            segment.sidx
                                                                .sapType ||
                                                                'n/a'
                                                        )}
                                                        ${propertyRow(
                                                            'type',
                                                            segment.sidx
                                                                .referenceType
                                                        )}
                                                    </div>
                                                </div>
                                            `
                                          : ''}
                                  </div>
                              </div>

                              <div class="grow min-w-0">
                                  ${rightPaneContent}
                              </div>
                          </div>
                      `}
            </div>
        </div>
    `;
};
