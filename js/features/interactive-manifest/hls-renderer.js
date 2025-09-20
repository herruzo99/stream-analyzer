import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { hlsTooltipData } from './hls-tooltip-data.js';
import { tooltipTriggerClasses } from '../../shared/constants.js';
import { eventBus } from '../../core/event-bus.js';

const escapeHtml = (str) =>
    str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const hlsSubNavTemplate = (stream) => {
    const masterPlaylist = stream.mediaPlaylists.get('master');
    if (!masterPlaylist) return html``;

    const variants = masterPlaylist.manifest.rawElement.variants || [];

    const handleNavClick = (e) => {
        const url = (/** @type {HTMLElement} */ (e.target)).dataset.url;
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
            @click=${handleNavClick}
        >
            ${label}
        </button>
    `;

    return html`
        <div class="mb-4 p-2 bg-gray-900/50 rounded-lg flex flex-wrap gap-2">
            ${navItem(
                'Master Playlist',
                'master',
                !stream.activeMediaPlaylistUrl
            )}
            ${variants.map((v) =>
                navItem(
                    `Variant (BW: ${(
                        v.attributes.BANDWIDTH / 1000
                    ).toFixed(0)}k)`,
                    v.resolvedUri,
                    stream.activeMediaPlaylistUrl === v.resolvedUri
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
                const attrTooltipAttrs = attrInfo
                    ? `data-tooltip="${escapeHtml(
                          attrInfo.text
                      )}" data-iso="${escapeHtml(attrInfo.isoRef)}"`
                    : '';

                return `<span class="${attributeClass} ${
                    attrInfo ? tooltipClass : ''
                }" ${attrTooltipAttrs}>${escapeHtml(
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

export const hlsManifestTemplate = (stream) => {
    const manifestString = stream.rawManifest;
    const isMaster =
        stream.mediaPlaylists.get('master')?.manifest.rawElement.isMaster;
    const lines = manifestString.split(/\r?\n/);

    return html`
        <h3 class="text-xl font-bold mb-2">Interactive Manifest</h3>
        ${isMaster ? hlsSubNavTemplate(stream) : ''}
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            ${lines.map(
                (line, i) => html`
                    <div class="flex">
                        <span
                            class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-10"
                            >${i + 1}</span
                        >
                        <span class="flex-grow whitespace-pre-wrap break-all"
                            >${unsafeHTML(getHlsLineHTML(line))}</span
                        >
                    </div>
                `
            )}
        </div>
    `;
};