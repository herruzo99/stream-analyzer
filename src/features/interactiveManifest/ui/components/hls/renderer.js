import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { useUiStore, uiActions } from '@/state/uiStore';
import { eventBus } from '@/application/event-bus';
import '@/ui/components/virtualized-list';
import { isDebugMode } from '@/shared/utils/env';

const escapeHtml = (str) => {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};

const getInteractiveHlsLineHTML = (
    line,
    lineNumber,
    hoveredItem,
    selectedItem,
    missingTooltips
) => {
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

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
        const tagName = line.substring(1);
        const path = `L${lineNumber}`;
        const isHovered = hoveredItem && hoveredItem.path === path;
        const isSelected = selectedItem && selectedItem.path === path;
        const isMissing = isDebugMode && missingTooltips.has(tagName);
        let highlightClass = '';
        if (isSelected) highlightClass = 'bg-blue-900/80';
        else if (isHovered) highlightClass = 'bg-slate-700/80';
        else if (isMissing)
            highlightClass =
                'bg-red-900/50 underline decoration-red-400 decoration-dotted';

        return `#<span class="interactive-hls-token ${highlightClass}" data-type="tag" data-name="${tagName}" data-path="${path}">${tagName}</span>`;
    }

    const tagName = line.substring(1, separatorIndex);
    const tagPath = `L${lineNumber}`;
    const tagValue = line.substring(separatorIndex + 1);

    let valueHtml = '';
    if (tagValue.includes('=')) {
        const regex = /([A-Z0-9-]+)=("[^"]*"|[^,]+)/g;
        let match;
        const parts = [];
        let lastIndex = 0;

        while ((match = regex.exec(tagValue)) !== null) {
            if (match.index > lastIndex) {
                parts.push(
                    escapeHtml(tagValue.substring(lastIndex, match.index))
                );
            }
            const attr = match[1];
            const attrKey = `${tagName}@${attr}`;
            const attrPath = `${tagPath}@${attr}`;
            let val = match[2];
            const isQuoted = val.startsWith('"') && val.endsWith('"');
            if (isQuoted) val = val.substring(1, val.length - 1);

            const isHovered = hoveredItem && hoveredItem.path === attrPath;
            const isSelected = selectedItem && selectedItem.path === attrPath;
            const isMissing = isDebugMode && missingTooltips.has(attrKey);
            let highlightClass = '';
            if (isSelected) highlightClass = 'bg-blue-900/80';
            else if (isHovered) highlightClass = 'bg-slate-700/80';
            else if (isMissing)
                highlightClass =
                    'bg-red-900/50 underline decoration-red-400 decoration-dotted';

            parts.push(
                `<span class="interactive-hls-token ${attributeClass} ${highlightClass}" data-type="attribute" data-name="${attrKey}" data-path="${attrPath}">${escapeHtml(
                    attr
                )}</span>=<span class="${valueClass}">${
                    isQuoted ? '&quot;' : ''
                }${escapeHtml(val)}${isQuoted ? '&quot;' : ''}</span>`
            );
            lastIndex = regex.lastIndex;
        }
        if (lastIndex < tagValue.length) {
            parts.push(escapeHtml(tagValue.substring(lastIndex)));
        }
        valueHtml = parts.join('');
    } else {
        valueHtml = `<span class="${valueClass}">${escapeHtml(tagValue)}</span>`;
    }

    const isTagHovered = hoveredItem && hoveredItem.path === tagPath;
    const isTagSelected = selectedItem && selectedItem.path === tagPath;
    const isTagMissing = isDebugMode && missingTooltips.has(tagName);
    let tagHighlightClass = '';
    if (isTagSelected) tagHighlightClass = 'bg-blue-900/80';
    else if (isTagHovered) tagHighlightClass = 'bg-slate-700/80';
    else if (isTagMissing)
        tagHighlightClass =
            'bg-red-900/50 underline decoration-red-400 decoration-dotted';

    return `#<span class="interactive-hls-token ${tagClass} ${tagHighlightClass}" data-type="tag" data-name="${tagName}" data-path="${tagPath}">${tagName}</span>:<span class="font-normal">${valueHtml}</span>`;
};

export const hlsManifestTemplate = (
    stream,
    showSubstituted,
    hoveredItem,
    selectedItem,
    missingTooltips
) => {
    let activeManifest;
    let rawManifestStringForToggle;

    if (stream.activeMediaPlaylistUrl) {
        const mediaPlaylist = stream.mediaPlaylists.get(
            stream.activeMediaPlaylistUrl
        );
        if (!mediaPlaylist)
            return html`<div class="text-yellow-400 p-4">Loading...</div>`;
        rawManifestStringForToggle = mediaPlaylist.rawManifest;
        activeManifest = mediaPlaylist.manifest;
    } else {
        rawManifestStringForToggle = stream.rawManifest;
        activeManifest = stream.manifest;
    }

    const manifestStringToDisplay = showSubstituted
        ? activeManifest.serializedManifest.raw
        : rawManifestStringForToggle;

    if (!manifestStringToDisplay || !activeManifest)
        return html`<div class="text-yellow-400 p-4">Awaiting content...</div>`;

    const allLines = manifestStringToDisplay
        .split(/\r?\n/)
        .map((line, index) => ({
            id: `${index}-${line}`,
            lineNumber: index + 1,
            html: getInteractiveHlsLineHTML(
                line,
                index + 1,
                hoveredItem,
                selectedItem,
                missingTooltips
            ),
        }));

    const rowRenderer = (item) => html`
        <div class="flex">
            <span
                class="text-right text-gray-500 pr-4 select-none shrink-0 w-12"
                >${item.lineNumber}</span
            >
            <span class="grow whitespace-pre-wrap break-all"
                >${unsafeHTML(item.html)}</span
            >
        </div>
    `;

    const handleToggle = () =>
        eventBus.dispatch('ui:interactive-manifest:toggle-substitution');

    const variableControls =
        stream.hlsDefinedVariables && stream.hlsDefinedVariables.size > 0
            ? html`<div class="mb-4">
                  <button
                      @click=${handleToggle}
                      class="text-xs px-3 py-1.5 rounded-md font-semibold transition-colors ${showSubstituted
                          ? 'bg-blue-800 text-blue-200'
                          : 'bg-gray-700 text-gray-300'}"
                  >
                      ${showSubstituted
                          ? 'Show Raw Manifest'
                          : 'Show Substituted Values'}
                  </button>
              </div>`
            : '';

    return html`
        ${variableControls}
        <div
            class="bg-slate-800 rounded-lg p-2 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            <virtualized-list
                .items=${allLines}
                .rowTemplate=${rowRenderer}
                .rowHeight=${22}
                .itemId=${(item) => item.id}
                class="h-[75vh]"
            ></virtualized-list>
        </div>
    `;
};
