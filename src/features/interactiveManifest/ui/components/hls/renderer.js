import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { hlsTooltipData } from './tooltip-data.js';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { eventBus } from '@/application/event-bus';
import { useUiStore, uiActions } from '@/state/uiStore';
import { debugLog } from '@/shared/utils/debug';

const linesPerPage = 500;

const onPageChange = (offset, totalPages) => {
    const { interactiveManifestCurrentPage } = useUiStore.getState();
    const newPage = interactiveManifestCurrentPage + offset;
    if (newPage >= 1 && newPage <= totalPages) {
        uiActions.setInteractiveManifestPage(newPage);
    }
};

const escapeHtml = (str) => {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};

const variableTableTemplate = (definedVariables) => {
    if (!definedVariables || definedVariables.size === 0) {
        return '';
    }
    const variables = Array.from(definedVariables.entries());

    return html`
        <div class="mb-4">
            <h4 class="text-md font-bold mb-2">Defined Variables</h4>
            <div
                class="bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden"
            >
                <table class="w-full text-left text-xs">
                    <thead class="bg-gray-900">
                        <tr>
                            <th class="p-2 font-semibold text-gray-300">
                                Variable Name
                            </th>
                            <th class="p-2 font-semibold text-gray-300">
                                Source
                            </th>
                            <th class="p-2 font-semibold text-gray-300">
                                Resolved Value
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-700">
                        ${variables.map(
                            ([name, { value, source }]) => html`
                                <tr>
                                    <td class="p-2 font-mono text-cyan-400">
                                        ${name}
                                    </td>
                                    <td class="p-2 font-mono text-gray-400">
                                        ${source}
                                    </td>
                                    <td class="p-2 font-mono text-yellow-300">
                                        ${value}
                                    </td>
                                </tr>
                            `
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

const getHlsLineHTML = (line) => {
    line = line.trim();
    if (!line.startsWith('#EXT')) {
        const isComment = line.startsWith('#');
        return `<span class="${
            isComment ? 'text-gray-500 italic' : 'text-cyan-400'
        }">${escapeHtml(line)}</span>`;
    }

    const tagClass = 'text-purple-300';
    const attributeClass = 'text-emerald-300';
    const valueClass = 'text-yellow-300';
    const tooltipClass = `rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700 ${tooltipTriggerClasses}`;

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
        const tagName = line.substring(1);
        const tagInfo = hlsTooltipData[tagName];
        const tooltipAttrs = tagInfo
            ? `data-tooltip="${escapeHtml(
                  tagInfo.text
              )}" data-iso="${escapeHtml(tagInfo.isoRef)}"`
            : '';
        return `#<span class="${tagClass} ${
            tagInfo ? tooltipClass : ''
        }" ${tooltipAttrs}>${tagName}</span>`;
    }

    const tagName = line.substring(1, separatorIndex);
    const tagValue = line.substring(separatorIndex + 1);
    const tagInfo = hlsTooltipData[tagName];
    const tagTooltipAttrs = tagInfo
        ? `data-tooltip="${escapeHtml(tagInfo.text)}" data-iso="${escapeHtml(
              tagInfo.isoRef
          )}"`
        : '';

    let valueHtml = '';
    if (tagValue.includes('=')) {
        const regex = /([A-Z0-9-]+)=("[^"]*"|[^,]+)/g;
        let match;
        const parts = [];

        while ((match = regex.exec(tagValue)) !== null) {
            const attr = match[1];
            let val = match[2];
            const isQuoted = val.startsWith('"') && val.endsWith('"');
            if (isQuoted) {
                val = val.substring(1, val.length - 1);
            }

            const attrKey = `${tagName}@${attr}`;
            const attrInfo = hlsTooltipData[attrKey];
            let dynamicClasses = '';
            let attrTooltipAttrs = '';

            if (attrInfo) {
                dynamicClasses = tooltipClass;
                attrTooltipAttrs = `data-tooltip="${escapeHtml(
                    attrInfo.text
                )}" data-iso="${escapeHtml(attrInfo.ref)}"`;
            } else {
                dynamicClasses =
                    'cursor-help bg-red-900/50 border-b border-dotted border-red-400/70!';
                attrTooltipAttrs = `data-tooltip="Tooltip definition missing for '${attr}' on tag #${tagName}"`;
            }

            parts.push(
                `<span class="${attributeClass} ${dynamicClasses}" ${attrTooltipAttrs}>${escapeHtml(
                    attr
                )}</span>=<span class="${valueClass}">${
                    isQuoted ? '&quot;' : ''
                }${escapeHtml(val)}${isQuoted ? '&quot;' : ''}</span>`
            );
        }
        valueHtml = parts.join('<span class="text-gray-400">,</span>');
    } else {
        valueHtml = `<span class="${valueClass}">${escapeHtml(tagValue)}</span>`;
    }

    return `#<span class="${tagClass} ${
        tagInfo ? tooltipClass : ''
    }" ${tagTooltipAttrs}>${tagName}</span>:<span class="font-normal">${valueHtml}</span>`;
};

const structuredTagTemplate = (tag) => {
    const tagInfo = hlsTooltipData[tag.name] || {};
    return html` <div
        class="grow whitespace-pre-wrap break-all bg-gray-900/50 p-2 rounded border-l-2 border-cyan-500"
    >
        <div
            class="font-semibold text-cyan-300 mb-1 ${tooltipTriggerClasses}"
            data-tooltip="${tagInfo.text}"
            data-iso="${tagInfo.isoRef}"
        >
            ${tag.name}
        </div>
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 text-xs">
            ${Object.entries(tag.value).map(([key, value]) => {
                const attrInfo = hlsTooltipData[`${tag.name}@${key}`] || {};
                return html`
                    <dt
                        class="text-gray-400 ${tooltipTriggerClasses}"
                        data-tooltip="${attrInfo.text}"
                        data-iso="${attrInfo.ref}"
                    >
                        ${key}
                    </dt>
                    <dd class="text-gray-200 font-mono">${value}</dd>
                `;
            })}
        </dl>
    </div>`;
};

export const hlsManifestTemplate = (stream, currentPage) => {
    debugLog('HlsRenderer', 'hlsManifestTemplate called.', 'Stream:', stream);

    let activeManifest;
    let rawManifestStringForToggle;
    const { interactiveManifestShowSubstituted: showSubstituted } =
        useUiStore.getState();

    if (stream.activeMediaPlaylistUrl) {
        const mediaPlaylist = stream.mediaPlaylists.get(
            stream.activeMediaPlaylistUrl
        );
        if (!mediaPlaylist) {
            return html`<div class="text-yellow-400 p-4">
                Loading rendition playlist...
            </div>`;
        }
        rawManifestStringForToggle = mediaPlaylist.rawManifest;
        activeManifest = mediaPlaylist.manifest;
    } else {
        rawManifestStringForToggle = stream.rawManifest;
        activeManifest = stream.manifest;
    }

    const manifestStringToDisplay = showSubstituted
        ? activeManifest.serializedManifest.raw
        : rawManifestStringForToggle;

    if (!manifestStringToDisplay || !activeManifest) {
        return html`<div class="text-yellow-400 p-4">
            Awaiting manifest content...
        </div>`;
    }

    const { renditionReports, preloadHints } = activeManifest;
    const allLines = manifestStringToDisplay.split(/\r?\n/);

    const totalPages = Math.ceil(allLines.length / linesPerPage);
    const startLineIndex = (currentPage - 1) * linesPerPage;
    const endLineIndex = startLineIndex + linesPerPage;
    const visibleLines = allLines.slice(startLineIndex, endLineIndex);

    let reportIndex = 0;
    let hintIndex = 0;

    const visibleLineTemplates = visibleLines.map((line) => {
        const trimmedLine = line.trim();
        if (
            renditionReports &&
            trimmedLine.startsWith('#EXT-X-RENDITION-REPORT')
        ) {
            const reportData = renditionReports[reportIndex++];
            return reportData
                ? structuredTagTemplate({
                      name: 'EXT-X-RENDITION-REPORT',
                      value: reportData,
                  })
                : html`${unsafeHTML(getHlsLineHTML(line))}`;
        }
        if (preloadHints && trimmedLine.startsWith('#EXT-X-PRELOAD-HINT')) {
            const hintData = preloadHints[hintIndex++];
            return hintData
                ? structuredTagTemplate({
                      name: 'EXT-X-PRELOAD-HINT',
                      value: hintData,
                  })
                : html`${unsafeHTML(getHlsLineHTML(line))}`;
        }
        return html`${unsafeHTML(getHlsLineHTML(line))}`;
    });

    const paginationControls =
        totalPages > 1
            ? html` <div class="text-center text-sm text-gray-400 mt-4">
                  <button
                      @click=${() => onPageChange(-1, totalPages)}
                      ?disabled=${currentPage === 1}
                      class="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-2"
                  >
                      &larr; Previous
                  </button>
                  <span
                      >Page ${currentPage} of ${totalPages} (Lines
                      ${startLineIndex + 1}-${Math.min(
                          endLineIndex,
                          allLines.length
                      )})</span
                  >
                  <button
                      @click=${() => onPageChange(1, totalPages)}
                      ?disabled=${currentPage === totalPages}
                      class="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-2"
                  >
                      Next &rarr;
                  </button>
              </div>`
            : '';

    const handleToggle = () => {
        uiActions.toggleInteractiveManifestSubstitution();
    };

    const variableControls =
        stream.hlsDefinedVariables && stream.hlsDefinedVariables.size > 0
            ? html`<div class="mb-2">
                  <button
                      @click=${handleToggle}
                      class="text-xs px-3 py-1 rounded ${showSubstituted
                          ? 'bg-blue-800 text-blue-200'
                          : 'bg-gray-700 text-gray-300'}"
                  >
                      ${showSubstituted ? 'Show Raw' : 'Show Substituted'}
                  </button>
              </div>`
            : '';

    return html`
        ${variableTableTemplate(stream.hlsDefinedVariables)} ${variableControls}
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            ${visibleLineTemplates.map(
                (template, i) => html`
                    <div class="flex">
                        <span
                            class="text-right text-gray-500 pr-4 select-none shrink-0 w-10"
                            >${startLineIndex + i + 1}</span
                        >
                        <span class="grow whitespace-pre-wrap break-all"
                            >${template}</span
                        >
                    </div>
                `
            )}
        </div>
        ${paginationControls}
    `;
};
