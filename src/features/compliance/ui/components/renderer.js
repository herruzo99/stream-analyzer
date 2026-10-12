import { useUiStore } from '@/state/uiStore';
import { highlightDash, highlightHls } from '@/ui/shared/syntax-highlighter';
import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';

// Flat severity tints shared by line highlights. Data-driven only:
// red/amber mark failing/warning lines, nothing decorative.
const highlightColors = {
    fail: 'background-color: rgba(239,68,68,0.12)',
    warn: 'background-color: rgba(245,158,11,0.12)',
    pass: 'background-color: rgba(16,185,129,0.08)',
};

const tooltipDot = (status) => {
    const color =
        status === 'fail'
            ? '#f87171'
            : status === 'warn'
              ? '#fbbf24'
              : status === 'pass'
                ? '#34d399'
                : '#64748b';
    return `<span style="display:inline-block;width:6px;height:6px;border-radius:9999px;background:${color};flex:none;margin-top:5px"></span>`;
};

const escapeTooltipText = (value) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

const formatTooltipContent = (results, filter) => {
    const list = Array.isArray(results) ? results : [];
    const filteredResults =
        filter !== 'all' ? list.filter((r) => r?.status === filter) : list;

    if (filteredResults.length === 0) {
        return { b64TooltipHtml: '' };
    }

    const rows = filteredResults
        .map((r) => {
            const status = r?.status || 'info';
            return `
            <div style="display:flex;gap:8px;padding:8px 10px;border:1px solid rgba(255,255,255,0.05);border-radius:6px;background:rgba(255,255,255,0.02);margin-bottom:4px">
                ${tooltipDot(status)}
                <div style="min-width:0">
                    <p style="margin:0;font-size:13px;color:#e2e8f0;line-height:1.4">${escapeTooltipText(r.text)}</p>
                    ${r.details ? `<p style="margin:2px 0 0;font-size:11px;color:#64748b;line-height:1.5">${escapeTooltipText(r.details)}</p>` : ''}
                    <p style="margin:4px 0 0;font-family:monospace;font-size:10px;color:#475569">${escapeTooltipText(r.isoRef || status)}</p>
                </div>
            </div>
            `;
        })
        .join('');

    const tooltipHtml = `<div style="min-width:280px;max-width:380px">${rows}</div>`;

    try {
        const bytes = new TextEncoder().encode(tooltipHtml);
        let binary = '';
        bytes.forEach((b) => {
            binary += String.fromCharCode(b);
        });
        return { b64TooltipHtml: btoa(binary) };
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
    activeFilter,
    highlightedCompliancePathId
) => {
    if (typeof node !== 'object' || node === null) {
        return [];
    }

    const indent = '  '.repeat(depth);

    const resultsForPath = complianceResults.filter(
        (r) => r.location.path === path
    );
    let highestSeverityResult = null;
    let highlightStyle = '';
    const elementId = `loc - path - ${path.replace(/[[].]/g, '-')} `;
    const isHoverHighlighted = highlightedCompliancePathId === elementId;
    const hoverHighlightStyle = isHoverHighlighted
        ? 'background-color: rgba(255,255,255,0.06);'
        : '';

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
            highlightStyle = highestSeverityResult
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
    const openingTagString = `< ${tagName}${attrsString}${!hasChildren ? ' /' : ''
        }> `;
    const highlightedOpeningTag = highlightDash(openingTagString);

    const templates = [];

    const { b64TooltipHtml } = formatTooltipContent(
        resultsForPath,
        activeFilter
    );

    // prettier-ignore
    templates.push(
        html`<div class="flex" >
            <span
                class="text-right pr-4 select-none shrink-0 w-12"
                style="color: #94a3b8"
                >${lineCounter.count++}</span
            >
            <span
                id=${elementId}
                data-status=${highestSeverityResult?.status}
                data-tooltip-html-b64=${b64TooltipHtml}
                class="compliance-highlight grow whitespace-pre-wrap break-all"
                style="color: #e2e8f0; ${highlightStyle} ${hoverHighlightStyle}"
                >${unsafeHTML(indent)}${unsafeHTML(highlightedOpeningTag)}</span
            >
        </div > `
    );

    if (hasChildren) {
        if (textContent) {
            // prettier-ignore
            templates.push(
                html`<div class="flex" >
                    <span class="text-right pr-4 select-none w-12"
                        style="color: #94a3b8"
                        >${lineCounter.count++}</span
                    >
                    <span class="grow whitespace-pre-wrap break-all"
                        >${unsafeHTML(indent + '  ')}<span style="color: #e2e8f0"
                            >${textContent}</span
                        ></span
                    >
                </div > `
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
                            `${path}.${childTagName} [${index}]`,
                            depth + 1,
                            lineCounter,
                            activeFilter,
                            highlightedCompliancePathId
                        )
                    );
                });
            } else if (typeof childValue === 'object') {
                templates.push(
                    ...renderDashNode(
                        childTagName,
                        childValue,
                        complianceResults,
                        `${path}.${childTagName} [0]`,
                        depth + 1,
                        lineCounter,
                        activeFilter,
                        highlightedCompliancePathId
                    )
                );
            }
        });

        const closingTagHtml = highlightDash(`</${tagName}> `);
        // prettier-ignore
        templates.push(
            html`<div class="flex" >
                <span
                    class="text-right pr-4 select-none shrink-0 w-12"
                    style="color: #94a3b8"
                    >${lineCounter.count++}</span
                >
                <span class="grow whitespace-pre-wrap break-all"
                    >${unsafeHTML(indent)}${unsafeHTML(closingTagHtml)}</span
                >
            </div > `
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
    const { highlightedCompliancePathId } = useUiStore.getState();

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

            const highlightStyle =
                highestSeverityResult &&
                    (activeFilter === 'all' ||
                        activeFilter === highestSeverityResult.status)
                    ? highlightColors[highestSeverityResult.status]
                    : '';

            const locationId = `loc-line-${lineNumber}`;
            const isHoverHighlighted =
                highlightedCompliancePathId === locationId;
            const hoverHighlightStyle = isHoverHighlighted
                ? 'background-color: rgba(255,255,255,0.06);'
                : '';

            // prettier-ignore
            return html`<div class="flex">
                <span class="text-right pr-4 select-none w-12"
                    style="color: #94a3b8"
                    >${lineNumber}</span
                >
                <span
                    id=${locationId}
                    data-status=${highestSeverityResult?.status}
                    data-tooltip-html-b64=${b64TooltipHtml}
                    class="compliance-highlight grow whitespace-pre-wrap break-all"
                    style="${highlightStyle} ${hoverHighlightStyle}"
                    >${unsafeHTML(highlightHls(line))}</span
                >
            </div>`;
        })
            } `;
    }

    // DASH Rendering Logic
    if (!serializedManifest || typeof serializedManifest !== 'object') {
        return html`<div style = "color: #ef4444" >
    Error rendering DASH manifest object.
        </div > `;
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
        activeFilter,
        highlightedCompliancePathId
    );

    return html`
        ${xmlDeclaration
            ? html`<div class="flex">
                  <span
                      class="text-right pr-4 select-none w-12"
                      style="color: #94a3b8"
                      >${lineCounter.count++}</span
                  >
                  <span
                      class="grow whitespace-pre-wrap break-all"
                      style="color: #e2e8f0"
                      >${unsafeHTML(highlightDash(xmlDeclaration[0]))}</span
                  >
              </div>`
            : ''
        }
        ${templates}
`;
};
