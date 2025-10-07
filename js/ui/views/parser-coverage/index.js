import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import {
    highlightDash,
    highlightHls,
} from '../../shared/syntax-highlighter.js';
import { copyTextToClipboard } from '../../../shared/utils/clipboard.js';

// --- Sidebar Logic ---

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

const findingCard = (finding) => {
    const isDrift = finding.status === 'drift';
    const borderColor = isDrift ? 'border-orange-500' : 'border-yellow-500';
    const textColor = isDrift ? 'text-orange-300' : 'text-yellow-300';
    const locationId = `cov-loc-${finding.pathOrLine.replace(/[.[\]@]/g, '-')}`;
    const typeText = isDrift
        ? `Schema Drift: ${finding.type}`
        : `Unparsed ${finding.type}`;

    return html`
        <div
            class="bg-gray-800 p-3 rounded-lg border-l-4 ${borderColor} cursor-pointer hover:bg-gray-700/50"
            data-location-id="${locationId}"
            @mouseover=${handleFindingHover}
            @mouseleave=${handleFindingLeave}
            @click=${handleFindingClick}
        >
            <p class="font-semibold text-sm text-gray-200">
                <span class="text-xs text-gray-500 mr-2"
                    >${finding.lineNumber
                        ? `L${finding.lineNumber}`
                        : 'PATH'}</span
                >
                ${typeText}:
                <span class="font-mono ${textColor}">${finding.name}</span>
            </p>
            <p class="text-xs text-gray-400 mt-1">${finding.details}</p>
        </div>
    `;
};

const sidebarTemplate = (coverageReport) => {
    if (!coverageReport || coverageReport.length === 0) {
        return html`<div
            class="p-4 text-center text-sm text-green-400 bg-gray-800 rounded-lg"
        >
            <p class="font-bold">🎉 Full Parser Coverage!</p>
            <p>No unparsed elements or parser drift were detected.</p>
        </div>`;
    }
    return html`
        <div
            class="flex-shrink-0 p-2 bg-gray-900/50 rounded-md border-b border-gray-700"
        >
            <h4 class="font-bold text-gray-300">
                Coverage Issues (${coverageReport.length})
            </h4>
        </div>
        <div class="space-y-2 flex-grow min-h-0 overflow-y-auto p-1">
            ${coverageReport.map(findingCard)}
        </div>
    `;
};

// --- Manifest Renderer Logic ---

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
                class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-12"
                >${lineCounter.count++}</span
            >
            <span class="flex-grow whitespace-pre-wrap break-all"
                >${unsafeHTML(indent)}${unsafeHTML(openingTagString)}</span
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
                <span class="text-right text-gray-500 pr-4 select-none w-12"
                    >${lineNumber}</span
                >
                <span
                    id=${locationId}
                    class="coverage-highlight flex-grow whitespace-pre-wrap break-all ${highlightClass}"
                    >${unsafeHTML(highlightHls(line))}</span
                >
            </div>`;
        })}`;
    }

    // DASH Rendering Logic
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

// --- Main Template ---

export function getParserCoverageTemplate(stream) {
    if (!stream || !stream.manifest) return html``;

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

    return html`
        <div class="mb-4 flex-shrink-0 flex justify-between items-center">
            <div>
                <h3 class="text-xl font-bold">Parser Coverage Analysis</h3>
                <p class="text-sm text-gray-400 mt-1">
                    Highlights elements not parsed from the manifest (unparsed)
                    and properties created by the parser but not in the schema
                    (drift).
                </p>
            </div>
            <button
                @click=${handleDebugCopy}
                class="bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-2 px-3 rounded-md transition-colors flex-shrink-0"
            >
                Copy Debug Report
            </button>
        </div>

        <div class="lg:grid lg:grid-cols-[1fr_450px] lg:gap-6 relative h-full">
            <div
                class="bg-slate-800 rounded-lg p-2 sm:p-4 font-mono text-sm leading-relaxed overflow-auto mb-6 lg:mb-0 h-full"
            >
                ${manifestViewTemplate(stream, stream.coverageReport)}
            </div>
            <div class="lg:sticky lg:top-4 h-fit">
                <div class="flex flex-col h-96 lg:max-h-[calc(100vh-12rem)]">
                    ${sidebarTemplate(stream.coverageReport)}
                </div>
            </div>
        </div>
    `;
}
