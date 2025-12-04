import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { highlightDash, highlightHls } from '@/ui/shared/syntax-highlighter';
import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';

const renderDiffWord = (part, highlightFn) => {
    // Apply syntax highlighting to the text content of the part.
    // unsafeHTML is required because highlightFn returns HTML string with color spans.
    const highlightedText = unsafeHTML(highlightFn(part.value));

    if (part.type === 'added') {
        return html`<span
            class="bg-emerald-900/60 text-emerald-300 font-bold px-0.5 rounded-sm"
            >${highlightedText}</span
        >`;
    } else if (part.type === 'removed') {
        return html`<span
            class="bg-red-900/60 text-red-300 line-through decoration-red-500/50 opacity-60 px-0.5 rounded-sm"
            >${highlightedText}</span
        >`;
    }
    // Common text
    return html`<span>${highlightedText}</span>`;
};

const renderDiffRow = (line, protocol, hideDeleted) => {
    const highlightFn = protocol === 'dash' ? highlightDash : highlightHls;
    const styles = {
        added: 'bg-emerald-900/20',
        removed: 'bg-red-900/10',
        modified: 'bg-amber-900/20',
        common: 'hover:bg-slate-800/40 transition-colors',
    };
    const rowClass = styles[line.type] || styles.common;
    const marker =
        line.type === 'added'
            ? '+'
            : line.type === 'removed'
              ? '-'
              : line.type === 'modified'
                ? '~'
                : '';
    const markerColor =
        line.type === 'added'
            ? 'text-emerald-500'
            : line.type === 'removed'
              ? 'text-red-500'
              : line.type === 'modified'
                ? 'text-amber-500'
                : 'text-slate-600';

    let contentHtml;

    if (line.type === 'modified' && line.parts) {
        const partsToRender = hideDeleted
            ? line.parts.filter((p) => p.type !== 'removed')
            : line.parts;

        // Added min-w-0 to ensure flex/grid child constraints apply
        contentHtml = html`<div
            class="whitespace-pre-wrap break-all font-mono text-slate-300 min-w-0"
        >
            ${line.indentation}${partsToRender.map((p) =>
                renderDiffWord(p, highlightFn)
            )}
        </div>`;
    } else if (line.type === 'removed') {
        if (hideDeleted) return html``;
        contentHtml = html`<span
            class="text-red-200/40 line-through decoration-red-500/30 select-none whitespace-pre-wrap break-all block min-w-0"
            >${unsafeHTML(highlightFn(line.indentation + line.content))}</span
        >`;
    } else {
        // Common or Added
        contentHtml = html`<div class="whitespace-pre-wrap break-all min-w-0">
            ${unsafeHTML(highlightFn(line.indentation + line.content))}
        </div>`;
    }

    // Table layout fixed requires width on cells to wrap correctly.
    // The second cell is given w-full to take available space, and min-w-0 to allow shrinking.
    return html`<tr class="${rowClass} font-mono text-xs leading-6 group">
        <td
            class="w-8 text-right pr-3 select-none opacity-50 border-r border-slate-800/50 ${markerColor} align-top py-0.5 font-bold shrink-0"
        >
            ${marker}
        </td>
        <td class="pl-4 py-0.5 align-top w-full min-w-0">${contentHtml}</td>
    </tr>`;
};

export const diffViewerTemplate = (
    update,
    protocol,
    options = { showControls: true }
) => {
    const { manifestUpdatesHideDeleted } = useUiStore.getState();
    const { showControls } = options;

    if (!update)
        return html`
            <div
                class="h-full flex flex-col items-center justify-center text-slate-500"
            >
                <div class="p-4 rounded-full bg-slate-800 mb-3">
                    ${icons.code}
                </div>
                <p class="text-sm font-medium">
                    Select an update to view changes
                </p>
            </div>
        `;

    const lines = manifestUpdatesHideDeleted
        ? update.diffModel.filter((l) => l.type !== 'removed')
        : update.diffModel;

    const { additions, removals, modifications } = update.changes;

    const toggleBtnClass = manifestUpdatesHideDeleted
        ? 'bg-slate-800 text-slate-200 border-slate-600 shadow-inner shadow-black/20'
        : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-200';

    const toggleIcon = manifestUpdatesHideDeleted ? icons.eyeOff : icons.eye;
    const toggleText = manifestUpdatesHideDeleted ? 'Hidden' : 'Show Deleted';

    return html`
        <div
            class="flex flex-col h-full w-full bg-slate-950 border-l border-slate-800/50 min-w-0"
        >
            <!-- Control Bar -->
            ${showControls
                ? html`
                      <div
                          class="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0 z-10 shadow-sm min-w-0"
                      >
                          <div
                              class="flex items-center gap-4 text-xs font-medium overflow-x-auto scrollbar-hide"
                          >
                              <div
                                  class="flex items-center gap-1.5 text-emerald-400 bg-emerald-900/10 px-2 py-1 rounded border border-emerald-900/20 shrink-0"
                              >
                                  ${icons.plusCircle} ${additions} Added
                              </div>
                              <div
                                  class="flex items-center gap-1.5 text-red-400 bg-red-900/10 px-2 py-1 rounded border border-red-900/20 shrink-0"
                              >
                                  ${icons.minusCircle} ${removals} Removed
                              </div>
                              <div
                                  class="flex items-center gap-1.5 text-amber-400 bg-amber-900/10 px-2 py-1 rounded border border-amber-900/20 shrink-0"
                              >
                                  ${icons.alertTriangle} ${modifications}
                                  Modified
                              </div>
                          </div>

                          <div class="flex items-center gap-3 shrink-0">
                              <button
                                  @click=${() =>
                                      uiActions.toggleManifestUpdatesHideDeleted()}
                                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${toggleBtnClass}"
                                  title="Toggle visibility of removed lines"
                              >
                                  ${toggleIcon}
                                  <span class="hidden sm:inline"
                                      >${toggleText}</span
                                  >
                              </button>

                              <div class="w-px h-4 bg-slate-800 mx-1"></div>

                              <button
                                  @click=${() =>
                                      copyTextToClipboard(
                                          update.rawManifest,
                                          'Copied!'
                                      )}
                                  class="text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-slate-800 rounded border border-transparent hover:border-slate-700"
                                  title="Copy Raw Manifest"
                              >
                                  ${icons.clipboardCopy}
                              </button>
                          </div>
                      </div>
                  `
                : ''}

            <!-- Code Surface -->
            <!-- table-fixed + w-full ensures wrapping works for long lines -->
            <div
                class="grow overflow-auto custom-scrollbar bg-slate-950 relative min-w-0"
            >
                <table class="w-full border-collapse relative table-fixed">
                    <colgroup>
                        <col class="w-10" />
                        <!-- Gutter -->
                        <col />
                        <!-- Code (Auto width) -->
                    </colgroup>
                    <tbody class="font-mono text-xs">
                        ${lines.map((l) =>
                            renderDiffRow(
                                l,
                                protocol,
                                manifestUpdatesHideDeleted
                            )
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};
