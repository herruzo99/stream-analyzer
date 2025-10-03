import { html, render } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { hlsTooltipData } from './tooltip-data.js';
import { tooltipTriggerClasses } from '../../../../../shared/constants.js';
import { eventBus } from '../../../../../core/event-bus.js';

// --- MODULE STATE FOR VIRTUALIZATION ---
let currentPage = 1;
const linesPerPage = 500;
let lastRenderedManifestString = null;

const onPageChange = (offset, stream, totalPages) => {
    const newPage = currentPage + offset;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        const container = document.getElementById('tab-interactive-manifest');
        render(hlsManifestTemplate(stream), container);
    }
};

const escapeHtml = (str) =>
    str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

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

const hlsSubNavTemplate = (stream) => {
    const masterPlaylist = stream.mediaPlaylists.get('master');
    if (!masterPlaylist || !masterPlaylist.manifest.isMaster) return html``;

    const _variants = masterPlaylist.manifest.summary.videoTracks.map(
        (vt, i) => ({
            // A bit of a hack to get variant info
            attributes: { BANDWIDTH: parseFloat(vt.bitrateRange) * 1000 },
            resolvedUri: stream.manifest.rawElement?.variants[i]?.resolvedUri, // This is still problematic
        })
    );

    const handleNavClick = (e) => {
        const button = /** @type {HTMLElement} */ (e.target).closest('button');
        if (!button) return;
        const url = button.dataset.url;
        eventBus.dispatch('hls:media-playlist-activate', {
            streamId: stream.id,
            url,
        });
    };

    const navItem = (label, url, isActive) => html`
        <button
            class="px-3 py-1.5 text-sm rounded-md transition-colors ${isActive
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-gray-900 hover:bg-gray-700'}"
            data-url="${url}"
        >
            ${label}
        </button>
    `;

    return html`
        <div
            class="mb-4 p-2 bg-gray-900/50 rounded-lg flex flex-wrap gap-2"
            @click=${handleNavClick}
        >
            ${navItem(
                'Master Playlist',
                'master',
                !stream.activeMediaPlaylistUrl
            )}
            ${stream.manifest.summary.videoTracks.map((vt, i) =>
                navItem(
                    `Variant ${i + 1} (${vt.bitrateRange})`,
                    stream.mediaPlaylists.get('master')?.manifest.rawElement
                        ?.variants[i]?.resolvedUri,
                    stream.activeMediaPlaylistUrl ===
                        stream.mediaPlaylists.get('master')?.manifest.rawElement
                            ?.variants[i]?.resolvedUri
                )
            )}
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
        const parts = tagValue.match(/("[^"]*")|[^,]+/g) || [];
        valueHtml = parts
            .map((part) => {
                const eqIndex = part.indexOf('=');
                if (eqIndex === -1) return escapeHtml(part);
                const attr = part.substring(0, eqIndex);
                const val = part.substring(eqIndex + 1);

                const attrKey = `${tagName}@${attr}`;
                const attrInfo = hlsTooltipData[attrKey];

                let dynamicClasses = '';
                let attrTooltipAttrs = '';

                if (attrInfo) {
                    dynamicClasses = tooltipClass;
                    attrTooltipAttrs = `data-tooltip="${escapeHtml(
                        attrInfo.text
                    )}" data-iso="${escapeHtml(attrInfo.isoRef)}"`;
                } else {
                    dynamicClasses =
                        'cursor-help bg-red-900/50 missing-tooltip-trigger';
                    attrTooltipAttrs = `data-tooltip="Tooltip definition missing for '${attr}' on tag #${tagName}"`;
                }

                return `<span class="${attributeClass} ${dynamicClasses}" ${attrTooltipAttrs}>${escapeHtml(
                    attr
                )}</span>=<span class="${valueClass}">${escapeHtml(
                    val
                )}</span>`;
            })
            .join('<span class="text-gray-400">,</span>');
    } else {
        valueHtml = `<span class="${valueClass}">${escapeHtml(
            tagValue
        )}</span>`;
    }

    return `#<span class="${tagClass} ${
        tagInfo ? tooltipClass : ''
    }" ${tagTooltipAttrs}>${tagName}</span>:<span class="font-normal">${valueHtml}</span>`;
};

const structuredTagTemplate = (tag) => {
    const tagInfo = hlsTooltipData[tag.name] || {};
    return html`
        <div class="flex">
            <span
                class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-10"
                >&nbsp;</span
            >
            <span
                class="flex-grow whitespace-pre-wrap break-all bg-gray-900/50 p-2 rounded border-l-2 border-cyan-500"
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
                        const attrInfo =
                            hlsTooltipData[`${tag.name}@${key}`] || {};
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
            </span>
        </div>
    `;
};

export const hlsManifestTemplate = (stream) => {
    const manifestToDisplay = stream.activeManifestForView || stream.manifest;
    const manifestString = stream.activeMediaPlaylistUrl
        ? stream.mediaPlaylists.get(stream.activeMediaPlaylistUrl)?.rawManifest
        : stream.rawManifest;

    if (manifestString !== lastRenderedManifestString) {
        currentPage = 1;
        lastRenderedManifestString = manifestString;
    }

    const { renditionReports, preloadHints } = manifestToDisplay;

    const lines = manifestString ? manifestString.split(/\r?\n/) : [];

    const specialTags = [
        'EXT-X-PRELOAD-HINT',
        'EXT-X-RENDITION-REPORT',
        'EXT-X-DEFINE',
    ];

    const allLineTemplates = lines
        .map((line) => {
            const trimmedLine = line.trim();
            if (specialTags.some((tag) => trimmedLine.startsWith(`#${tag}`))) {
                return null; // We'll render these separately
            }
            return (lineNumber) => html`
                <div class="flex">
                    <span
                        class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-10"
                        >${lineNumber}</span
                    >
                    <span class="flex-grow whitespace-pre-wrap break-all"
                        >${unsafeHTML(getHlsLineHTML(line))}</span
                    >
                </div>
            `;
        })
        .filter(Boolean);

    (renditionReports || []).forEach((report) =>
        allLineTemplates.push(() =>
            structuredTagTemplate({
                name: 'EXT-X-RENDITION-REPORT',
                value: report,
            })
        )
    );
    (preloadHints || []).forEach((hint) =>
        allLineTemplates.push(() =>
            structuredTagTemplate({ name: 'EXT-X-PRELOAD-HINT', value: hint })
        )
    );

    const totalPages = Math.ceil(allLineTemplates.length / linesPerPage);

    const startLine = (currentPage - 1) * linesPerPage;
    const endLine = startLine + linesPerPage;
    const visibleLineTemplates = allLineTemplates.slice(startLine, endLine);

    const paginationControls =
        totalPages > 1
            ? html` <div class="text-center text-sm text-gray-400 mt-4">
                  <button
                      @click=${() => onPageChange(-1, stream, totalPages)}
                      ?disabled=${currentPage === 1}
                      class="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-2"
                  >
                      &larr; Previous
                  </button>
                  <span
                      >Page ${currentPage} of ${totalPages} (Lines
                      ${startLine + 1}-${Math.min(
                          endLine,
                          allLineTemplates.length
                      )})</span
                  >
                  <button
                      @click=${() => onPageChange(1, stream, totalPages)}
                      ?disabled=${currentPage === totalPages}
                      class="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-2"
                  >
                      Next &rarr;
                  </button>
              </div>`
            : '';

    return html`
        ${hlsSubNavTemplate(stream)}
        ${variableTableTemplate(stream.hlsDefinedVariables)}
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            ${visibleLineTemplates.map((templateFn, i) =>
                templateFn(startLine + i + 1)
            )}
        </div>
        ${paginationControls}
    `;
};
