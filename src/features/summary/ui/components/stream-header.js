import { html } from 'lit-html';
import * as icons from '@/ui/icons';
import { copyTextToClipboard } from '@/ui/shared/clipboard';

export const streamHeaderTemplate = (stream) => {
    if (!stream) return '';

    return html`
        <div class="mb-8 pb-4 border-b border-slate-700">
            <h2
                class="text-2xl font-bold text-white truncate"
                title=${stream.name}
            >
                ${stream.name}
            </h2>
            ${stream.originalUrl
                ? html`
                      <div class="flex items-center gap-2 mt-1">
                          <p
                              class="text-sm text-slate-400 font-mono truncate"
                              title=${stream.originalUrl}
                          >
                              ${stream.originalUrl}
                          </p>
                          <button
                              @click=${() =>
                                  copyTextToClipboard(
                                      stream.originalUrl,
                                      'URL Copied!'
                                  )}
                              class="text-slate-500 hover:text-white shrink-0"
                          >
                              ${icons.clipboardCopy}
                          </button>
                      </div>
                  `
                : ''}
        </div>
    `;
};
