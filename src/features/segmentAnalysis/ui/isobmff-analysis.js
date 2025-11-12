import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { statCardTemplate } from '@/features/summary/ui/components/shared';
import { cmafTrackRules } from '@/features/compliance/domain/cmaf/rules';
import { validateCmafProfiles } from '@/features/compliance/domain/cmaf/profile-validator';
import * as icons from '@/ui/icons';
import {
    isoBoxTreeTemplate,
    entriesTableTemplate,
} from '@/ui/shared/isobmff-renderer';
import { scte35DetailsTemplate } from '@/ui/shared/scte35-details';
import { highlightDash } from '@/ui/shared/syntax-highlighter';
import xmlFormatter from 'xml-formatter';

const findBoxRecursive = (boxes, predicateOrType) => {
    const predicate =
        typeof predicateOrType === 'function'
            ? predicateOrType
            : (box) => box.type === predicateOrType;

    if (!boxes) return null;
    for (const box of boxes) {
        if (predicate(box)) return box;
        if (box.children?.length > 0) {
            const found = findBoxRecursive(box.children, predicate);
            if (found) return found;
        }
    }
    return null;
};

// --- ARCHITECTURAL FIX: Use the correct utility to find ALL matching boxes ---
const findChildrenRecursive = (boxes, predicateOrType) => {
    const predicate =
        typeof predicateOrType === 'function'
            ? predicateOrType
            : (box) => box.type === predicateOrType;
    let results = [];
    if (!boxes) return results;
    for (const box of boxes) {
        if (predicate(box)) {
            results.push(box);
        }
        if (box.children?.length > 0) {
            results = results.concat(
                findChildrenRecursive(box.children, predicate)
            );
        }
    }
    return results;
};
// --- END FIX ---

const emsgPayloadTemplate = (box) => {
    let payloadContent;
    switch (box.messagePayloadType) {
        case 'xml':
            try {
                const formattedXml = xmlFormatter(box.messagePayload, {
                    indentation: '  ',
                    lineSeparator: '\n',
                });
                payloadContent = html`<pre
                    class="language-xml text-xs whitespace-pre-wrap"
                ><code>${unsafeHTML(highlightDash(formattedXml))}</code></pre>`;
            } catch (e) {
                payloadContent = html`<pre
                    class="language-xml text-xs whitespace-pre-wrap"
                ><code>${unsafeHTML(
                    highlightDash(box.messagePayload)
                )}</code></pre>`;
            }
            break;
        case 'scte35':
            payloadContent = scte35DetailsTemplate(box.messagePayload);
            break;
        default:
            const hex = Array.from(box.messagePayload)
                .map((b) => b.toString(16).padStart(2, '0'))
                .join(' ');
            payloadContent = html`<div
                class="font-mono text-xs text-slate-400 break-all"
            >
                ${hex}
            </div>`;
            break;
    }

    return html`
        <details
            class="bg-slate-900 rounded-lg border border-slate-700 details-animated"
            open
        >
            <summary
                class="font-bold p-3 cursor-pointer hover:bg-slate-700/50 text-slate-100"
            >
                emsg @ ${box.offset} (Scheme: ${box.details.scheme_id_uri
                    .value})
            </summary>
            <div class="p-4 border-t border-slate-700">
                ${payloadContent}
            </div>
        </details>
    `;
};

const cmafResultsTemplate = (results) => {
    if (!results || results.length === 0) return html``;

    const statusClasses = {
        pass: 'text-green-400',
        fail: 'text-red-400',
        warn: 'text-yellow-400',
        info: 'text-blue-400',
    };
    const icon = {
        pass: '✓',
        fail: '✗',
        warn: '⚠️',
        info: 'ℹ',
    };

    return html`
        <div>
            <h3 class="text-xl font-bold mb-4">CMAF Conformance</h3>
            <div
                class="bg-slate-900/50 rounded border border-slate-700/50 overflow-hidden"
            >
                <table class="w-full text-left text-xs table-auto">
                    <thead class="bg-slate-800/50">
                        <tr>
                            <th class="p-2 font-semibold text-slate-400 w-20">
                                Status
                            </th>
                            <th class="p-2 font-semibold text-slate-400">
                                Check
                            </th>
                            <th class="p-2 font-semibold text-slate-400">
                                Details
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-700/50">
                        ${results.map(
                            (result) => html`
                                <tr class="hover:bg-slate-700/50">
                                    <td class="p-2 text-center">
                                        <span
                                            class="${statusClasses[
                                                result.status
                                            ]} font-bold"
                                            >${icon[result.status]}
                                            ${result.status.toUpperCase()}</span
                                        >
                                    </td>
                                    <td
                                        class="p-2 text-slate-300"
                                        title="${result.isoRef}"
                                    >
                                        ${result.text}
                                    </td>
                                    <td
                                        class="p-2 text-slate-400 wrap-break-word"
                                    >
                                        ${result.details}
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

const iFrameInfoBanner = () => html`
    <div
        class="bg-yellow-900/30 border border-yellow-700 text-yellow-200 text-sm p-4 rounded-lg mb-6 flex items-start gap-3"
    >
        <div class="shrink-0 pt-0.5">${icons.informationCircle}</div>
        <div>
            <p class="font-bold">I-Frame Segment Analysis</p>
            <p>
                This segment is from an I-Frame only playlist. The 'mdat' box is
                intentionally a small byte-range pointing into a larger media
                segment file and is not a complete media box.
            </p>
        </div>
    </div>
`;

export const isobmffAnalysisTemplate = (parsedData, isIFrame = false) => {
    const { data: isobmffData } = parsedData;
    const { boxes } = isobmffData;

    const isInitSegment = !!findBoxRecursive(boxes, (b) => b.type === 'moov');
    const isMediaSegment = !!findBoxRecursive(boxes, (b) => b.type === 'moof');

    const ftyp = findBoxRecursive(boxes, 'ftyp');
    const cmafBrands = ftyp?.details?.cmafBrands?.value?.split(', ') || [];
    const isCmaf = cmafBrands.includes('cmfc');
    const emsgBoxes = findChildrenRecursive(boxes, (b) => b.type === 'emsg');

    let cmafResults = [];
    if (isCmaf) {
        const initDataForRules = isInitSegment
            ? isobmffData
            : { boxes: [], details: {} };
        const mediaDataForRules = isMediaSegment
            ? isobmffData
            : { boxes: [], details: {} };
        cmafTrackRules.forEach((rule) => {
            try {
                const result = rule(initDataForRules, mediaDataForRules);
                if (result) cmafResults.push(result);
            } catch (_e) {
                // Ignore errors from rules that don't apply
            }
        });
        if (isInitSegment) {
            cmafResults.push(
                ...validateCmafProfiles(cmafBrands, initDataForRules)
            );
        }
    }

    let segmentType = 'Unknown';
    if (isInitSegment) segmentType = 'Initialization Segment';
    if (isMediaSegment) segmentType = 'Media Segment';
    if (isIFrame) segmentType = 'I-Frame Segment';

    let boxForTable;
    if (isMediaSegment) {
        const trunBox = findBoxRecursive(boxes, (b) => b.type === 'trun');
        if (trunBox) {
            boxForTable = {
                ...trunBox,
                samples: parsedData.samples || trunBox.samples,
            };
        }
    } else {
        boxForTable = findBoxRecursive(
            boxes,
            (b) =>
                (b.samples && b.samples.length > 0) ||
                (b.entries && b.entries.length > 0)
        );
    }

    const summaryCards = [
        statCardTemplate({
            label: 'Segment Type',
            value: segmentType,
            icon: isInitSegment ? icons.integrators : icons.film,
            tooltip:
                'Indicates if the segment is an Initialization Segment (`moov`) or a Media Segment (`moof`/`mdat`).',
            isoRef: 'ISO/IEC 14496-12',
        }),
        statCardTemplate({
            label: 'Total Size',
            value: `${(isobmffData.size / 1024).toFixed(2)} KB`,
            icon: icons.box,
            tooltip: 'The total size of the segment in bytes.',
            isoRef: 'ISO/IEC 14496-12, 4.2',
        }),
        statCardTemplate({
            label: 'Sample Count',
            value: parsedData.samples?.length,
            icon: icons.rectangleHorizontal,
            tooltip:
                'The total number of media samples (e.g., video frames or audio chunks) contained within this segment.',
            isoRef: 'ISO/IEC 14496-12, 8.7.3',
        }),
        statCardTemplate({
            label: 'CMAF Compatible',
            value: isCmaf,
            icon: icons.shieldCheck,
            tooltip:
                "Indicates if the segment's `ftyp` or `styp` box contains the 'cmfc' structural brand, a requirement for CMAF compliance.",
            isoRef: 'ISO/IEC 23000-19:2020(E), 7.2',
        }),
    ];

    return html`
        <div class="space-y-8">
            ${isIFrame ? iFrameInfoBanner() : ''}
            <div>
                <h3 class="text-xl text-white font-bold mb-4">Summary</h3>
                <div
                    class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]"
                >
                    ${summaryCards}
                </div>
            </div>

            ${cmafResultsTemplate(cmafResults)}

            ${emsgBoxes && emsgBoxes.length > 0
                ? html`<div>
                      <h3 class="text-xl font-bold mb-4">
                          Event Message (\`emsg\`) Boxes
                      </h3>
                      <div class="space-y-4">
                          ${emsgBoxes.map(emsgPayloadTemplate)}
                      </div>
                  </div>`
                : ''}
            ${boxForTable ? entriesTableTemplate(boxForTable) : ''}

            <div>
                <h3 class="text-xl text-white font-bold mb-4">Box Structure</h3>
                <ul class="list-none p-0 space-y-2">
                    ${boxes.map(
                        (box) =>
                            html`<li>${isoBoxTreeTemplate(box, { isIFrame })}</li>`
                    )}
                </ul>
            </div>
        </div>
    `;
};