import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';

export const mediaPlaylistCardTemplate = (item, stream, type) => {
    const isVariant = !!item.attributes;

    let label, sublabel, bw, codecs, res;

    if (isVariant) {
        const attrs = item.attributes;
        bw = attrs.BANDWIDTH;
        res = attrs.RESOLUTION;
        codecs = attrs.CODECS;
        label = res || `Variant ${formatBitrate(bw)}`;
        sublabel = item.uri;
    } else {
        const val = item.value;
        label = val.NAME;
        sublabel = val.URI || '(In-Stream)';
        if (val.LANGUAGE) label += ` [${val.LANGUAGE}]`;
    }

    // Check for LL-HLS Features in the parsed manifest for this variant
    let preloadHints = [];
    let renditionReports = [];

    const variantId = item.stableId || item.id;
    let playlistData = null;

    if (isVariant && variantId) {
        playlistData = stream.mediaPlaylists.get(variantId);
    } else if (!isVariant && item.value.URI) {
        // Attempt reverse lookup if not a variant
    }

    if (playlistData) {
        preloadHints = playlistData.manifest.preloadHints || [];
        renditionReports = playlistData.manifest.renditionReports || [];
    }

    const preloadCount = preloadHints.length;
    const reportCount = renditionReports.length;

    const codecBadge = codecs
        ? html`
              <span
                  class="text-[9px] font-mono text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded truncate max-w-[80px]"
                  title="${codecs}"
              >
                  ${codecs.split(',')[0]}
              </span>
          `
        : '';

    const bwBadge = bw
        ? html`
              <span
                  class="text-[9px] font-mono text-blue-300 bg-blue-900/20 border border-blue-500/30 px-1.5 py-0.5 rounded"
              >
                  ${formatBitrate(bw)}
              </span>
          `
        : '';

    return html`
        <div
            class="group bg-slate-950 border border-slate-800 rounded p-3 hover:border-blue-500/40 hover:bg-slate-900 transition-all cursor-default relative overflow-hidden flex flex-col"
        >
            <div class="flex justify-between items-start mb-1">
                <div
                    class="font-semibold text-xs text-slate-200 truncate pr-2"
                    title="${label}"
                >
                    ${label}
                </div>
                <div class="flex gap-1 shrink-0">${bwBadge}</div>
            </div>

            <div
                class="text-[10px] font-mono text-slate-500 truncate mb-3"
                title="${sublabel}"
            >
                ${sublabel.split('/').pop().split('?')[0]}
            </div>

            <!-- LL-HLS Indicators & Details -->
            ${preloadCount > 0 || reportCount > 0
                ? html`
                      <div
                          class="flex flex-col gap-2 mb-2 border-t border-slate-800/50 pt-2"
                      >
                          <!-- Preload Hints -->
                          ${preloadCount > 0
                              ? html`
                                    <details class="group/hints">
                                        <summary
                                            class="list-none cursor-pointer flex items-center gap-2"
                                        >
                                            <span
                                                class="text-[9px] flex items-center gap-1 text-amber-400 bg-amber-900/20 px-1.5 rounded"
                                                title="Preload Hints"
                                            >
                                                ${icons.zap} ${preloadCount}
                                                Hint${preloadCount > 1
                                                    ? 's'
                                                    : ''}
                                            </span>
                                            <span
                                                class="text-slate-600 text-[9px] group-open/hints:rotate-180 transition-transform"
                                                >${icons.chevronDown}</span
                                            >
                                        </summary>
                                        <div class="mt-1 pl-1 space-y-1">
                                            ${preloadHints
                                                .slice(0, 3)
                                                .map(
                                                    (h) => html`
                                                        <div
                                                            class="text-[9px] font-mono text-slate-400 truncate"
                                                            title="${h.URI}"
                                                        >
                                                            ${h.TYPE}: ${h.URI}
                                                        </div>
                                                    `
                                                )}
                                            ${preloadCount > 3
                                                ? html`<div
                                                      class="text-[9px] text-slate-500 italic"
                                                  >
                                                      +${preloadCount - 3} more
                                                  </div>`
                                                : ''}
                                        </div>
                                    </details>
                                `
                              : ''}

                          <!-- Rendition Reports -->
                          ${reportCount > 0
                              ? html`
                                    <details class="group/reports">
                                        <summary
                                            class="list-none cursor-pointer flex items-center gap-2"
                                        >
                                            <span
                                                class="text-[9px] flex items-center gap-1 text-emerald-400 bg-emerald-900/20 px-1.5 rounded"
                                                title="Rendition Reports"
                                            >
                                                ${icons.fileText} ${reportCount}
                                                Rpt${reportCount > 1 ? 's' : ''}
                                            </span>
                                            <span
                                                class="text-slate-600 text-[9px] group-open/reports:rotate-180 transition-transform"
                                                >${icons.chevronDown}</span
                                            >
                                        </summary>
                                        <div class="mt-1 pl-1 space-y-1">
                                            ${renditionReports
                                                .slice(0, 3)
                                                .map(
                                                    (r) => html`
                                                        <div
                                                            class="text-[9px] font-mono text-slate-400 truncate"
                                                            title="${r.URI}"
                                                        >
                                                            MSN:${r['LAST-MSN']}
                                                            •
                                                            PART:${r[
                                                                'LAST-PART'
                                                            ]}
                                                        </div>
                                                    `
                                                )}
                                            ${reportCount > 3
                                                ? html`<div
                                                      class="text-[9px] text-slate-500 italic"
                                                  >
                                                      +${reportCount - 3} more
                                                  </div>`
                                                : ''}
                                        </div>
                                    </details>
                                `
                              : ''}
                      </div>
                  `
                : ''}

            <div
                class="flex items-center justify-between pt-2 border-t border-slate-800/50 mt-auto"
            >
                ${codecBadge}
                ${type === 'video' && res
                    ? html`<span class="text-[9px] font-bold text-slate-400"
                          >${res}</span
                      >`
                    : ''}

                <button
                    class="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-white"
                >
                    ${icons.clipboardCopy}
                </button>
            </div>
        </div>
    `;
};
