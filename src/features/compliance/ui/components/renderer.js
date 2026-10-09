import { useUiStore } from '@/state/uiStore';
import { highlightDash, highlightHls } from '@/ui/shared/syntax-highlighter';
import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';

const highlightColors = {
    fail: 'background-color: color-mix(in srgb, #ef4444 30%, transparent)',
    warn: 'background-color: color-mix(in srgb, #f59e0b 30%, transparent)',
    pass: 'background-color: color-mix(in srgb, #10b981 30%, transparent)',
};

const formatTooltipContent = (results, filter) => {
    let filteredResults = results;
    if (filter !== 'all') {
        filteredResults = results.filter((r) => r.status === filter);
    }

    if (filteredResults.length === 0) {
        return { b64TooltipHtml: '' };
    }

    // Header with counts
    const counts = {
        fail: filteredResults.filter((r) => r.status === 'fail').length,
        warn: filteredResults.filter((r) => r.status === 'warn').length,
        pass: filteredResults.filter((r) => r.status === 'pass').length,
        info: filteredResults.filter((r) => r.status === 'info').length,
    };

    const header = `
        <div class="flex items-center gap-3 mb-3 pb-2 border-b border-slate-800">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Compliance Check</span>
            <div class="flex gap-2 ml-auto">
                ${counts.fail > 0 ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold border" style="background: color-mix(in srgb, #ef4444 20%, transparent); color: #ef4444; border-color: color-mix(in srgb, #ef4444 30%, transparent)">${counts.fail} ERR</span>` : ''}
                ${counts.warn > 0 ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold border" style="background: color-mix(in srgb, #f59e0b 20%, transparent); color: #f59e0b; border-color: color-mix(in srgb, #f59e0b 30%, transparent)">${counts.warn} WARN</span>` : ''}
            </div>
        </div>
    `;

    const rows = filteredResults
        .map((r, index) => {
            const statusConfig = {
                fail: {
                    colorValue: '#ef4444',
                    icon: '✕',
                },
                warn: {
                    colorValue: '#f59e0b',
                    icon: '⚠',
                },
                pass: {
                    colorValue: '#10b981',
                    icon: '✓',
                },
                info: {
                    colorValue: '#3b82f6',
                    icon: 'ℹ',
                },
            }[r.status];
            return `
            <div class="mb-2 last:mb-0 p-3 rounded-lg border backdrop-blur-md relative overflow-hidden group"
                style="background: color-mix(in srgb, ${statusConfig.colorValue} 10%, transparent); border-color: color-mix(in srgb, ${statusConfig.colorValue} 20%, transparent);">
                <div class="absolute inset-0 opacity-50 blur-xl" style="background: color-mix(in srgb, ${statusConfig.colorValue} 10%, transparent);"></div>
                <div class="relative z-10">
                    <div class="flex items-start gap-2">
                        <span class="font-mono font-bold text-lg leading-none mt-0.5 drop-shadow-md" style="color: ${statusConfig.colorValue}">${statusConfig.icon}</span>
                        <div class="min-w-0">
                            <p class="font-bold text-sm leading-tight mb-1" style="color: ${statusConfig.colorValue}">${r.text}</p>
                            <p class="text-xs leading-relaxed opacity-90" style="color: #94a3b8">${r.details}</p>
                            <div class="flex items-center gap-2 mt-2">
                                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                                    style="background: #1e293b; border-color: #1e293b; color: #94a3b8">${r.isoRef}</span>
                                <span class="text-[10px] font-bold uppercase tracking-wider opacity-70" style="color: ${statusConfig.colorValue}">${r.status}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `;
        })
        .join('');

    const tooltipHtml = `<div class="min-w-[300px] max-w-[400px] p-1" > ${header} <div class="space-y-2">${rows}</div></div > `;

    try {
        return {
            b64TooltipHtml: btoa(unescape(encodeURIComponent(tooltipHtml))),
        };
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
        ? 'background-color: color-mix(in srgb, #3b82f6 30%, transparent);'
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
                ? 'background-color: color-mix(in srgb, #3b82f6 30%, transparent);'
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
