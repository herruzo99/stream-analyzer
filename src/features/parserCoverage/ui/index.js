import { statCardTemplate } from '@/features/summary/ui/components/shared';
import { useAnalysisStore } from '@/state/analysisStore';
import * as icons from '@/ui/icons';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { highlightDash, highlightHls } from '@/ui/shared/syntax-highlighter';
import { html, render } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';

let container = null;
let currentStreamId = null;
let analysisUnsubscribe = null;

// --- Interaction Handlers ---

function handleFindingHover(e) {
    const card = /** @type {HTMLElement} */ (e.currentTarget);
    const locationId = card.dataset.locationId;
    document
        .querySelectorAll('.coverage-highlight')
        .forEach((el) => el.classList.remove('bg-purple-500/30'));
    const target = document.getElementById(locationId);
    if (target) {
        target.classList.add('bg-purple-500/30');
    }
}

function handleFindingLeave() {
    document
        .querySelectorAll('.coverage-highlight')
        .forEach((el) => el.classList.remove('bg-purple-500/30'));
}

function handleFindingClick(e) {
    const card = /** @type {HTMLElement} */ (e.currentTarget);
    const locationId = card.dataset.locationId;
    const target = document.getElementById(locationId);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// --- UI Templates ---

const findingCardTemplate = (finding) => {
    const isDrift = finding.status === 'drift';
    const borderColor = isDrift ? 'border-orange-500' : 'border-yellow-500';
    const textColor = isDrift ? 'text-orange-300' : 'text-yellow-300';
    const locationId = `cov-loc-${finding.pathOrLine.replace(/[.[\]@]/g, '-')}`;

    return html`
        <div
            class="bg-slate-800/50 p-3 rounded-lg border-l-4 ${borderColor} cursor-pointer hover:bg-slate-700/50 transition-colors"
            data-location-id="${locationId}"
            @mouseover=${handleFindingHover}
            @mouseleave=${handleFindingLeave}
            @click=${handleFindingClick}
        >
            <p
                class="font-semibold text-sm text-slate-200 flex items-center gap-2"
            >
                <span class="font-mono text-xs ${textColor}"
                    >${finding.name}</span
                >
            </p>
            <p class="text-xs text-slate-400 mt-1">${finding.details}</p>
        </div>
    `;
};

const renderDashNodeCoverage = (
    tagName,
    node,
    coverageReport,
    path,
    depth,
    lineCounter
) => {
    if (typeof node !== 'object' || node === null) {
        return [];
    }
    const indent = '  '.repeat(depth);
    const findingsForPath = coverageReport.filter((f) => f.pathOrLine === path);
    const elementId = `cov-loc-${path.replace(/[.[\]@]/g, '-')}`;

    let highlightClass = '';
    if (findingsForPath.some((f) => f.status === 'drift')) {
        highlightClass = 'bg-orange-900/60';
    } else if (
        findingsForPath.some(
            (f) => f.status === 'unparsed' && f.type === 'element'
        )
    ) {
        highlightClass = 'bg-yellow-900/60';
    }

    const attributes = node[':@'] || {};
    const textContent = node['#text'] || null;
    const childKeys = Object.keys(node).filter(
        (key) => key !== ':@' && key !== '#text'
    );
    const hasChildren = childKeys.length > 0 || textContent;

    const attrsString = Object.entries(attributes)
        .map(([key, value]) => {
            const attrFinding = findingsForPath.find(
                (f) => f.type === 'attribute' && f.name === key
            );
            const attrHighlight = attrFinding ? 'bg-yellow-900/60' : '';
            const highlightedKey = highlightDash(key);
            const highlightedValue = highlightDash(`"${value}"`);
            return ` <span class="${attrHighlight}">${highlightedKey}=${highlightedValue}</span>`;
        })
        .join('');

    const openingTagString = `<span class="coverage-highlight ${highlightClass}" id="${elementId}">${highlightDash(
        `<${tagName}`
    )}${attrsString}${!hasChildren ? ' /' : ''}${highlightDash('>')}</span>`;
    const templates = [];

    templates.push(
        html`<div class="flex">
            <span
                class="text-right text-slate-500 pr-4 select-none shrink-0 w-12"
                >${lineCounter.count++}</span
            >
            <span class="grow whitespace-pre-wrap break-all"
                >${unsafeHTML(indent)}${unsafeHTML(openingTagString)}</span
            >
        </div>`
    );

    if (hasChildren) {
        if (textContent) {
            templates.push(
                html`<div class="flex">
                    <span
                        class="text-right text-slate-500 pr-4 select-none w-12"
                        >${lineCounter.count++}</span
                    >
                    <span class="grow whitespace-pre-wrap break-all"
                        >${unsafeHTML(indent + '  ')}<span class="text-gray-200"
                            >${textContent}</span
                        ></span
                    >
                </div>`
            );
        }
        let childCounts = {};
        childKeys.forEach((childTagName) => {
            const children = Array.isArray(node[childTagName])
                ? node[childTagName]
                : [node[childTagName]];
            children.forEach((child) => {
                const index = childCounts[childTagName] || 0;
                templates.push(
                    ...renderDashNodeCoverage(
                        childTagName,
                        child,
                        coverageReport,
                        `${path}.${childTagName}[${index}]`,
                        depth + 1,
                        lineCounter
                    )
                );
                childCounts[childTagName] = index + 1;
            });
        });

        const closingTagHtml = highlightDash(`</${tagName}>`);
        templates.push(
            html`<div class="flex">
                <span
                    class="text-right text-slate-500 pr-4 select-none shrink-0 w-12"
                    >${lineCounter.count++}</span
                >
                <span class="grow whitespace-pre-wrap break-all"
                    >${unsafeHTML(indent)}${unsafeHTML(closingTagHtml)}</span
                >
            </div>`
        );
    }
    return templates;
};

const manifestViewTemplate = (stream, coverageReport) => {
    const { rawManifest, protocol, manifest } = stream;

    if (protocol === 'hls') {
        const lines = rawManifest.split('\n');
        const findingsByLine = (coverageReport || []).reduce((acc, finding) => {
            const lineNum = finding.lineNumber;
            if (lineNum) {
                if (!acc[lineNum]) acc[lineNum] = [];
                acc[lineNum].push(finding);
            }
            return acc;
        }, {});

        return html`${lines.map((line, index) => {
            const lineNumber = index + 1;
            const findings = findingsByLine[lineNumber] || [];
            const hasDrift = findings.some((f) => f.status === 'drift');
            const hasUnparsed = findings.some((f) => f.status === 'unparsed');

            let highlightClass = '';
            if (hasDrift) {
                highlightClass = 'bg-orange-900/60';
            } else if (hasUnparsed) {
                highlightClass = 'bg-yellow-900/60';
            }

            const locationId = `cov-loc-${lineNumber}`;

            return html`<div class="flex">
                <span class="text-right text-slate-500 pr-4 select-none w-12"
                    >${lineNumber}</span
                >
                <span
                    id=${locationId}
                    class="coverage-highlight grow whitespace-pre-wrap break-all ${highlightClass}"
                    >${unsafeHTML(highlightHls(line))}</span
                >
            </div>`;
        })}`;
    }

    const serializedManifest = manifest?.serializedManifest;
    if (!serializedManifest || typeof serializedManifest !== 'object') {
        return html`<div class="text-red-400">
            Error rendering DASH manifest object.
        </div>`;
    }

    const lineCounter = { count: 1 };
    const templates = renderDashNodeCoverage(
        'MPD',
        serializedManifest,
        coverageReport,
        'MPD[0]',
        0,
        lineCounter
    );

    return html`${templates}`;
};

function countManifestNodes(node) {
    if (!node || typeof node !== 'object') return 0;
    let count = 1;
    if (node[':@']) {
        count += Object.keys(node[':@']).length;
    }
    for (const key in node) {
        if (key === ':@' || key === '#text') continue;
        const children = Array.isArray(node[key]) ? node[key] : [node[key]];
        for (const child of children) {
            count += countManifestNodes(child);
        }
    }
    return count;
}

// --- Main Render Function ---

function renderParserCoverage() {
    if (!container || currentStreamId === null) return;

    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === currentStreamId);

    if (!stream || !stream.manifest) {
        render(html``, container);
        return;
    }

    const handleDebugCopy = () => {
        const report = stream.coverageReport || [];
        const issueText = report
            .map((finding) => {
                return `[${finding.status.toUpperCase()}] ${finding.type}: ${
                    finding.name
                }\nLocation: ${finding.pathOrLine}\nDetails: ${
                    finding.details
                }\n---`;
            })
            .join('\n\n');
        const debugString = `--- MANIFEST ---\n${stream.rawManifest}\n\n--- COVERAGE ISSUES (${report.length}) ---\n${issueText}`;
        copyTextToClipboard(debugString, 'Debug report copied to clipboard!');
    };

    const report = stream.coverageReport || [];
    const unparsedFindings = report.filter((f) => f.status === 'unparsed');
    const driftFindings = report.filter((f) => f.status === 'drift');

    let coveragePercentage = 100;
    if (stream.protocol === 'dash' && stream.manifest.serializedManifest) {
        const totalNodes = countManifestNodes(
            stream.manifest.serializedManifest
        );
        if (totalNodes > 0) {
            coveragePercentage =
                (1 - unparsedFindings.length / totalNodes) * 100;
        }
    }

    const statsSection = html`
        <div class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
            ${statCardTemplate({
                label: 'Parser Coverage',
                value: `${coveragePercentage.toFixed(1)}%`,
                icon: icons.shieldCheck,
                tooltip:
                    'Percentage of XML elements and attributes in the manifest that are recognized and processed by the parser.',
                iconBgClass:
                    coveragePercentage < 95
                        ? 'bg-yellow-900/30 text-yellow-300'
                        : 'bg-green-900/30 text-green-300',
            })}
            ${statCardTemplate({
                label: 'Unparsed Items',
                value: unparsedFindings.length,
                icon: icons.searchCode,
                tooltip:
                    'Elements or attributes present in the manifest but not defined in the parser schema.',
                iconBgClass:
                    unparsedFindings.length > 0
                        ? 'bg-yellow-900/30 text-yellow-300'
                        : 'bg-slate-800 text-slate-400',
            })}
            ${statCardTemplate({
                label: 'Schema Drift',
                value: driftFindings.length,
                icon: icons.debug,
                tooltip:
                    'Properties that exist on the internal data model but are not defined in the canonical schema, indicating a potential mismatch between the parser and the data model.',
                iconBgClass:
                    driftFindings.length > 0
                        ? 'bg-orange-900/30 text-orange-300'
                        : 'bg-slate-800 text-slate-400',
            })}
        </div>
    `;

    const mainTemplate = html`
        <div class="flex flex-col h-full">
            <header
                class="shrink-0 mb-4 flex justify-between items-center gap-4"
            >
                <div>
                    <h3 class="text-xl font-bold">Parser Coverage Analysis</h3>
                    <p class="text-sm text-slate-400 mt-1">
                        Highlights manifest elements not processed by the parser
                        (Unparsed) and internal schema inconsistencies (Drift).
                    </p>
                </div>
                <button
                    @click=${handleDebugCopy}
                    class="bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-2 px-3 rounded-md transition-colors shrink-0"
                >
                    Copy Debug Report
                </button>
            </header>

            ${statsSection}
            ${report.length === 0
                ? html`<div
                      class="mt-8 p-8 bg-slate-800 rounded-lg text-center text-green-400 border border-green-700/50"
                  >
                      <p class="font-bold text-lg">🎉 Full Parser Coverage!</p>
                      <p>No unparsed elements or parser drift were detected.</p>
                  </div>`
                : html`<div class="grid lg:grid-cols-2 gap-6 mt-6 grow min-h-0">
                      <div class="flex flex-col h-full min-h-0">
                          <h4 class="font-bold text-lg mb-2">Findings</h4>
                          <div class="grow overflow-y-auto space-y-4 pr-2">
                              ${unparsedFindings.length > 0
                                  ? html`<section>
                                        <h5
                                            class="font-semibold text-yellow-400 mb-2"
                                        >
                                            Unparsed Items
                                        </h5>
                                        <div class="space-y-2">
                                            ${unparsedFindings.map(
                                                findingCardTemplate
                                            )}
                                        </div>
                                    </section>`
                                  : ''}
                              ${driftFindings.length > 0
                                  ? html`<section>
                                        <h5
                                            class="font-semibold text-orange-400 mb-2"
                                        >
                                            Schema Drift
                                        </h5>
                                        <div class="space-y-2">
                                            ${driftFindings.map(
                                                findingCardTemplate
                                            )}
                                        </div>
                                    </section>`
                                  : ''}
                          </div>
                      </div>
                      <div class="flex flex-col h-full min-h-0">
                          <h4 class="font-bold text-lg mb-2">
                              Manifest Source
                          </h4>
                          <div
                              class="bg-slate-800 rounded-lg p-2 font-mono text-sm leading-relaxed overflow-auto grow"
                          >
                              ${manifestViewTemplate(stream, report)}
                          </div>
                      </div>
                  </div>`}
        </div>
    `;

    render(mainTemplate, container);
}

// --- View Lifecycle ---

export const parserCoverageView = {
    hasContextualSidebar: false,

    mount(containerElement, { stream }) {
        container = containerElement;
        currentStreamId = stream.id;

        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = useAnalysisStore.subscribe(renderParserCoverage);

        renderParserCoverage();
    },

    unmount() {
        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = null;
        if (container) render(html``, container);
        container = null;
        currentStreamId = null;
    },
};
