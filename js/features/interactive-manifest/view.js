import { html, render } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { dashTooltipData } from './tooltip-data.js';
import { hlsTooltipData } from './hls-tooltip-data.js';
import { tooltipTriggerClasses } from '../../shared/constants.js';
import { analysisState } from '../../state.js';
import { showStatus, renderSingleStreamTabs } from '../../ui.js';
import { parseManifest } from '../../protocols/hls/parser.js';

const escapeHtml = (str) =>
    str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

// --- HLS UTILS ---
async function fetchAndActivateMediaPlaylist(stream, url) {
    showStatus(`Fetching HLS media playlist: ${url}`, 'info');

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const manifestString = await response.text();
        const { manifest } = await parseManifest(manifestString, url);

        stream.mediaPlaylists.set(url, {
            manifest,
            rawManifest: manifestString,
            lastFetched: new Date(),
        });
        stream.activeMediaPlaylistUrl = url;
        stream.manifest = manifest;
        stream.rawManifest = manifestString;

        // Re-render this tab to show the new content
        renderSingleStreamTabs(stream.id);
        showStatus('Media playlist loaded.', 'pass');
    } catch (e) {
        console.error('Failed to fetch or parse media playlist:', e);
        showStatus(`Failed to load media playlist: ${e.message}`, 'fail');
    }
}

// --- HLS RENDERER ---
const hlsSubNavTemplate = (stream) => {
    const masterPlaylist = stream.mediaPlaylists.get('master');
    if (!masterPlaylist) return html``;

    const variants = masterPlaylist.manifest.rawElement.variants || [];

    const handleNavClick = (e) => {
        const url = e.target.dataset.url;
        if (url === 'master') {
            const master = stream.mediaPlaylists.get('master');
            stream.manifest = master.manifest;
            stream.rawManifest = master.rawManifest;
            stream.activeMediaPlaylistUrl = null;
            renderSingleStreamTabs(stream.id);
            return;
        }

        if (stream.mediaPlaylists.has(url)) {
            const mediaPlaylist = stream.mediaPlaylists.get(url);
            stream.manifest = mediaPlaylist.manifest;
            stream.rawManifest = mediaPlaylist.rawManifest;
            stream.activeMediaPlaylistUrl = url;
            renderSingleStreamTabs(stream.id);
        } else {
            fetchAndActivateMediaPlaylist(stream, url);
        }
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
            ? `data-tooltip="${escapeHtml(tagInfo.text)}" data-iso="${escapeHtml(
                  tagInfo.isoRef
              )}"`
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
                )}</span>=<span class="${valueClass}">${escapeHtml(val)}</span>`;
            })
            .join('<span class="text-gray-400">,</span>');
    } else {
        valueHtml = `<span class="${valueClass}">${escapeHtml(tagValue)}</span>`;
    }

    return `#<span class="${tagClass} ${
        tagInfo ? tooltipClass : ''
    }" ${tagTooltipAttrs}>${tagName}</span>:<span class="font-normal">${valueHtml}</span>`;
};

const hlsManifestTemplate = (stream) => {
    const manifestString = stream.rawManifest;
    const isMaster = stream.mediaPlaylists.get('master')?.manifest.rawElement.isMaster;
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

// --- DASH (XML) Renderer ---
const getTagHTML = (tagName) => {
    const isClosing = tagName.startsWith('/');
    const cleanTagName = isClosing ? tagName.substring(1) : tagName;
    const tagInfo = dashTooltipData[cleanTagName];
    const tagClass =
        'text-blue-300 rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700';
    const tooltipAttrs = tagInfo
        ? `data-tooltip="${escapeHtml(tagInfo.text)}" data-iso="${escapeHtml(
              tagInfo.isoRef
          )}"`
        : '';
    return `&lt;${
        isClosing ? '/' : ''
    }<span class="${tagClass} ${
        tagInfo ? tooltipTriggerClasses : ''
    }" ${tooltipAttrs}>${cleanTagName}</span>`;
};

const getAttributeHTML = (tagName, attr) => {
    const attrKey = `${tagName}@${attr.name}`;
    const attrInfo = dashTooltipData[attrKey];
    const nameClass =
        'text-emerald-300 rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700';
    const valueClass = 'text-yellow-300';
    const tooltipAttrs = attrInfo
        ? `data-tooltip="${escapeHtml(attrInfo.text)}" data-iso="${escapeHtml(
              attrInfo.isoRef
          )}"`
        : '';
    return `<span class="${nameClass} ${
        attrInfo ? tooltipTriggerClasses : ''
    }" ${tooltipAttrs}>${
        attr.name
    }</span>=<span class="${valueClass}">"${escapeHtml(attr.value)}"</span>`;
};

const preformattedDash = (node, depth = 0) => {
    const indent = '  '.repeat(depth);
    switch (node.nodeType) {
        case Node.ELEMENT_NODE: {
            const el = /** @type {Element} */ (node);
            const childNodes = Array.from(el.childNodes).filter(
                (n) =>
                    n.nodeType === Node.ELEMENT_NODE ||
                    n.nodeType === Node.COMMENT_NODE ||
                    (n.nodeType === Node.TEXT_NODE && n.textContent.trim())
            );

            const attrs = Array.from(el.attributes)
                .map((a) => ` ${getAttributeHTML(el.tagName, a)}`)
                .join('');

            if (childNodes.length > 0) {
                const openingTag = `${indent}${getTagHTML(el.tagName)}${attrs}&gt;`;
                const childLines = childNodes.flatMap((c) =>
                    preformattedDash(c, depth + 1)
                );
                const closingTag = `${indent}${getTagHTML(`/${el.tagName}`)}&gt;`;
                return [openingTag, ...childLines, closingTag];
            } else {
                return [`${indent}${getTagHTML(el.tagName)}${attrs} /&gt;`];
            }
        }
        case Node.TEXT_NODE: {
            return [
                `${indent}<span class="text-gray-200">${escapeHtml(
                    node.textContent.trim()
                )}</span>`,
            ];
        }
        case Node.COMMENT_NODE: {
            return [
                `${indent}<span class="text-gray-500 italic">&lt;!--${escapeHtml(
                    node.textContent
                )}--&gt;</span>`,
            ];
        }
        default:
            return [];
    }
};

const dashManifestTemplate = (manifestElement) => {
    const lines = preformattedDash(manifestElement);
    return html`
        <h3 class="text-xl font-bold mb-2">Interactive Manifest</h3>
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
                        >${unsafeHTML(line)}</span
                    >
                </div>
            `
        )}
    </div>`;
};


// --- Dispatcher ---
export function getInteractiveManifestTemplate(stream) {
    if (!stream || !stream.manifest)
        return html`<p class="warn">No Manifest loaded to display.</p>`;

    if (stream.protocol === 'hls') {
        return hlsManifestTemplate(stream);
    }

    // Default to DASH
    return dashManifestTemplate(/** @type {Element} */ (stream.manifest.rawElement));
}