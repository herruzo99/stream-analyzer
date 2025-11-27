import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { highlightDash, highlightHls } from '@/ui/shared/syntax-highlighter';
import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';

const renderDiffRow = (line, isMerged, protocol) => {
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
              : 'text-amber-500';

    // Simplified content rendering with wrapping support
    const contentHtml =
        line.type === 'removed'
            ? html`<span
                  class="text-red-200/40 line-through decoration-red-500/30 select-none"
                  >${unsafeHTML(highlightFn(line.content))}</span
              >`
            : html`${unsafeHTML(highlightFn(line.indentation + line.content))}`;

    return html`
        <tr class="${rowClass} font-mono text-xs leading-6">
            <td
                class="w-8 text-right pr-3 select-none opacity-50 border-r border-slate-800/50 ${markerColor} align-top py-0.5"
            >
                ${marker}
            </td>
            <td
                class="pl-4 whitespace-pre-wrap break-all text-slate-300 w-full py-0.5"
            >
                ${contentHtml}
            </td>
        </tr>
    `;
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

    return html`
        <div
            class="flex flex-col h-full w-full bg-slate-950 border-l border-slate-800/50"
        >
            <!-- Control Bar -->
            ${showControls
                ? html`
                      <div
                          class="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0 z-10 shadow-sm"
                      >
                          <div
                              class="flex items-center gap-4 text-xs font-medium"
                          >
                              <div
                                  class="flex items-center gap-1.5 text-emerald-400 bg-emerald-900/10 px-2 py-1 rounded border border-emerald-900/20"
                              >
                                  ${icons.plusCircle} ${additions} Added
                              </div>
                              <div
                                  class="flex items-center gap-1.5 text-red-400 bg-red-900/10 px-2 py-1 rounded border border-red-900/20"
                              >
                                  ${icons.minusCircle} ${removals} Removed
                              </div>
                              <div
                                  class="flex items-center gap-1.5 text-amber-400 bg-amber-900/10 px-2 py-1 rounded border border-amber-900/20"
                              >
                                  ${icons.alertTriangle} ${modifications}
                                  Modified
                              </div>
                          </div>

                          <div class="flex items-center gap-4">
                              <label
                                  class="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors select-none"
                              >
                                  <input
                                      type="checkbox"
                                      .checked=${manifestUpdatesHideDeleted}
                                      @change=${() =>
                                          uiActions.toggleManifestUpdatesHideDeleted()}
                                      class="rounded bg-slate-800 border-slate-600 text-blue-500 focus:ring-0 w-4 h-4"
                                  />
                                  Hide Deleted
                              </label>
                              <div class="w-px h-4 bg-slate-700"></div>
                              <button
                                  @click=${() =>
                                      copyTextToClipboard(
                                          update.rawManifest,
                                          'Copied!'
                                      )}
                                  class="text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-slate-800 rounded"
                                  title="Copy Raw Manifest"
                              >
                                  ${icons.clipboardCopy}
                              </button>
                          </div>
                      </div>
                  `
                : ''}

            <!-- Code Surface -->
            <div
                class="grow overflow-auto custom-scrollbar bg-slate-950 relative"
            >
                <table class="w-full border-collapse relative">
                    <colgroup>
                        <col class="w-10" />
                        <!-- Gutter -->
                        <col />
                        <!-- Code -->
                    </colgroup>
                    <tbody class="font-mono text-xs">
                        ${lines.map((l) => renderDiffRow(l, false, protocol))}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};
