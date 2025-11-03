import { html } from 'lit-html';
import { statCardTemplate } from '@/features/summary/ui/components/shared';
import { useUiStore } from '@/state/uiStore';
import { cmafTrackRules } from '@/features/compliance/domain/cmaf/rules';
import { validateCmafProfiles } from '@/features/compliance/domain/cmaf/profile-validator';
import * as icons from '@/ui/icons';
import {
    isoBoxTreeTemplate,
    entriesTableTemplate,
} from '@/ui/shared/isobmff-renderer';

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

const cmafResultsTemplate = (results) => {
    if (!results || results.length === 0) return html``;

    const statusClasses = {
        pass: 'text-green-400',
        fail: 'text-red-400',
        warn: 'text-yellow-400',
        info: 'text-blue-400',
    };
    const icon = { pass: '✓', fail: '✗', warn: '⚠️', info: 'ℹ' };

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
                                    <td class="p-2 text-slate-400">
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

export const isobmffAnalysisTemplate = (parsedData) => {
    const { data: isobmffData } = parsedData;
    const { boxes } = isobmffData;

    const isInitSegment = !!findBoxRecursive(boxes, (b) => b.type === 'moov');
    const isMediaSegment = !!findBoxRecursive(boxes, (b) => b.type === 'moof');

    const ftyp = findBoxRecursive(boxes, 'ftyp');
    const cmafBrands = ftyp?.details?.cmafBrands?.value?.split(', ') || [];
    const isCmaf = cmafBrands.includes('cmfc');

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
            } catch (e) {}
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

    let boxForTable;
    if (isMediaSegment) {
        const trunBox = findBoxRecursive(boxes, (b) => b.type === 'trun');
        if (trunBox) {
            boxForTable = {
                ...trunBox,
                // CRITICAL FIX: The `trun` box's own `samples` array is a raw parse
                // without correct offsets or indices. The canonical, enriched `samples`
                // list lives at the top level of the parsed data structure. We must
                // substitute it here for the table renderer.
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
            <div>
                <h3 class="text-xl text-white font-bold mb-4">Summary</h3>
                <div
                    class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]"
                >
                    ${summaryCards}
                </div>
            </div>

            ${cmafResultsTemplate(cmafResults)}
            ${boxForTable ? entriesTableTemplate(boxForTable) : ''}

            <div>
                <h3 class="text-xl text-white font-bold mb-4">Box Structure</h3>
                <ul class="list-none p-0 space-y-2">
                    ${isobmffData.boxes.map(
                        (box) => html`<li>${isoBoxTreeTemplate(box)}</li>`
                    )}
                </ul>
            </div>
        </div>
    `;
};
