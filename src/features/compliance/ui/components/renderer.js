import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import {
    highlightDash,
    highlightHls,
} from '@/ui/shared/syntax-highlighter.js';

const highlightColors = {
    fail: 'bg-red-900/60',
    warn: 'bg-yellow-900/60',
    pass: 'bg-green-900/50',
};

const formatTooltipContent = (results, filter) => {
    let filteredResults = results;
    if (filter !== 'all') {
        filteredResults = results.filter((r) => r.status === filter);
    }

    if (filteredResults.length === 0) {
        return { b64TooltipHtml: '' };
    }

    const tooltipHtml = filteredResults
        .map((r, index) => {
            const statusClass = {
                fail: 'text-red-300',
                warn: 'text-yellow-300',
                pass: 'text-green-300',
                info: 'text-blue-300',
            }[r.status];
            const hr = index > 0 ? '<hr class="border-gray-600 my-2">' : '';
            return `${hr}<div class="text-left">
            <p class="font-bold ${statusClass}">[${r.status.toUpperCase()}] ${
                r.text
            }</p>
            <p class="text-xs text-gray-300 mt-1">${r.details}</p>
            <p class="text-xs text-gray-500 font-mono mt-2">${r.isoRef}</p>
        </div>`;
        })
        .join('');

    try {
        return { b64TooltipHtml: btoa(tooltipHtml) };
    } catch (e) {
        console.error('Failed to encode tooltip', e);
        return { b64TooltipHtml: '' };
    }
};

const renderDashNode = (
    tagName,
    node,
    complianceResults,
    path,
    depth,
    lineCounter,
    activeFilter
) => {
    if (typeof node !== 'object' || node === null) {
        return [];
    }

    const indent = '  '.repeat(depth);

    const resultsForPath = complianceResults.filter(
        (r) => r.location.path === path
    );
    let highestSeverityResult = null;
    let highlightClass = '';
    const elementId = `loc-path-${path.replace(/[[].]/g, '-')}`;

    if (resultsForPath.length > 0) {
        const severityOrder = { fail: 0, warn: 1, info: 2, pass: 3 };
        highestSeverityResult = resultsForPath.reduce((acc, r) => {
            if (!acc || severityOrder[r.status] < severityOrder[acc.status]) {
                return r;
            }
            return acc;
        });

        if (
            activeFilter === 'all' ||
            activeFilter === highestSeverityResult.status
        ) {
            highlightClass = highestSeverityResult
                ? highlightColors[highestSeverityResult.status]
                : '';
        }

        resultsForPath.forEach((r) => {
            if (!r.location.startLine) {
                r.location.startLine = lineCounter.count;
            }
        });
    }

    const attributes = node[':@'] || {};
    const textContent = node['#text'] || null;
    const childKeys = Object.keys(node).filter(
        (key) => key !== ':@' && key !== '#text'
    );
    const hasChildren = childKeys.length > 0 || textContent;

    const attrsString = Object.entries(attributes)
        .map(([key, value]) => ` ${key}="${value}"`)
        .join('');
    const openingTagString = `<${tagName}${attrsString}${
        !hasChildren ? ' /' : ''
    }>`;
    const highlightedOpeningTag = highlightDash(openingTagString);

    const templates = [];

    const { b64TooltipHtml } = formatTooltipContent(
        resultsForPath,
        activeFilter
    );

    templates.push(
        html`<div class="flex">
            <span
                class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-12"
                >${lineCounter.count++}</span
            >
            <span
                id=${elementId}
                data-status=${highestSeverityResult?.status}
                data-tooltip-html-b64=${b64TooltipHtml}
                class="compliance-highlight flex-grow whitespace-pre-wrap break-all ${highlightClass}"
                >${unsafeHTML(indent)}${unsafeHTML(highlightedOpeningTag)}</span
            >
        </div>`
    );

    if (hasChildren) {
        if (textContent) {
            templates.push(
                html`<div class="flex">
                    <span class="text-right text-gray-500 pr-4 select-none w-12"
                        >${lineCounter.count++}</span
                    >
                    <span class="flex-grow whitespace-pre-wrap break-all"
                        >${unsafeHTML(indent + '  ')}<span class="text-gray-200"
                            >${textContent}</span
                        ></span
                    >
                </div>`
            );
        }

        childKeys.forEach((childTagName) => {
            const childValue = node[childTagName];
            if (Array.isArray(childValue)) {
                childValue.forEach((item, index) => {
                    templates.push(
                        ...renderDashNode(
                            childTagName,
                            item,
                            complianceResults,
                            `${path}.${childTagName}[${index}]`,
                            depth + 1,
                            lineCounter,
                            activeFilter
                        )
                    );
                });
            } else if (typeof childValue === 'object') {
                templates.push(
                    ...renderDashNode(
                        childTagName,
                        childValue,
                        complianceResults,
                        `${path}.${childTagName}[0]`,
                        depth + 1,
                        lineCounter,
                        activeFilter
                    )
                );
            }
        });

        const closingTagHtml = highlightDash(`</${tagName}>`);
        templates.push(
            html`<div class="flex">
                <span
                    class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-12"
                    >${lineCounter.count++}</span
                >
                <span class="flex-grow whitespace-pre-wrap break-all"
                    >${unsafeHTML(indent)}${unsafeHTML(closingTagHtml)}</span
                >
            </div>`
        );
    }

    return templates;
};

export const manifestViewTemplate = (
    rawManifest,
    protocol,
    results,
    serializedManifest,
    activeFilter
) => {
    if (protocol === 'hls') {
        const lines = rawManifest.split('\n');
        const lineResults = new Map();
        results.forEach((result) => {
            if (result.location.startLine) {
                for (
                    let i = result.location.startLine;
                    i <= (result.location.endLine || result.location.startLine);
                    i++
                ) {
                    if (!lineResults.has(i)) lineResults.set(i, []);
                    lineResults.get(i).push(result);
                }
            }
        });
        return html`${lines.map((line, index) => {
            const lineNumber = index + 1;
            const resultsForLine = lineResults.get(lineNumber) || [];
            const highestSeverityResult = resultsForLine.reduce((acc, r) => {
                if (!acc) return r;
                if (r.status === 'fail') return r;
                if (r.status === 'warn' && acc.status !== 'fail') return r;
                return acc;
            }, null);

            const { b64TooltipHtml } = formatTooltipContent(
                resultsForLine,
                activeFilter
            );

            const highlightClass =
                highestSeverityResult &&
                (activeFilter === 'all' ||
                    activeFilter === highestSeverityResult.status)
                    ? highlightColors[highestSeverityResult.status]
                    : '';

            const locationId = `loc-line-${lineNumber}`;

            return html`<div class="flex">
                <span class="text-right text-gray-500 pr-4 select-none w-12"
                    >${lineNumber}</span
                >
                <span
                    id=${locationId}
                    data-status=${highestSeverityResult?.status}
                    data-tooltip-html-b64=${b64TooltipHtml}
                    class="compliance-highlight flex-grow whitespace-pre-wrap break-all ${highlightClass}"
                    >${unsafeHTML(highlightHls(line))}</span
                >
            </div>`;
        })}`;
    }

    // DASH Rendering Logic
    if (!serializedManifest || typeof serializedManifest !== 'object') {
        return html`<div class="text-red-400">
            Error rendering DASH manifest object.
        </div>`;
    }

    const lineCounter = { count: 1 };
    const xmlDeclaration = rawManifest.match(/<\?xml.*?\?>/);

    const templates = renderDashNode(
        'MPD',
        serializedManifest,
        results,
        'MPD[0]',
        0,
        lineCounter,
        activeFilter
    );

    return html`
        ${xmlDeclaration
            ? html`<div class="flex">
                  <span class="text-right text-gray-500 pr-4 select-none w-12"
                      >${lineCounter.count++}</span
                  >
                  <span class="flex-grow whitespace-pre-wrap break-all"
                      >${unsafeHTML(highlightDash(xmlDeclaration[0]))}</span
                  >
              </div>`
            : ''}
        ${templates}
    `;
};
