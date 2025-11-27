import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';

export const mediaPlaylistCardTemplate = (item, stream, type) => {
    const isVariant = !!item.attributes; // Differentiate Variant vs Media Tag

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
            class="group bg-slate-950 border border-slate-800 rounded p-3 hover:border-blue-500/40 hover:bg-slate-900 transition-all cursor-default relative overflow-hidden"
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

            <div
                class="flex items-center justify-between pt-2 border-t border-slate-800/50"
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
