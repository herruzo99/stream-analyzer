import { html } from 'lit-html';
import { statCardTemplate } from '@/features/summary/ui/components/shared';
import { connectedTabBar } from '@/ui/components/tabs';
import { useUiStore, uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { getTooltipData as getTsTooltipData } from '@/infrastructure/parsing/ts/index';
import { tooltipTriggerClasses } from '@/ui/shared/constants';

const tsTooltipData = getTsTooltipData();

const descriptorTableTemplate = (descriptors) => {
    if (!descriptors || descriptors.length === 0) {
        return html`<p class="text-xs text-slate-500 italic px-2">
            No descriptors present.
        </p>`;
    }
    return html`
        <div
            class="bg-slate-900/50 rounded border border-slate-700/50 overflow-hidden"
        >
            <table class="w-full text-left text-xs table-auto border-collapse">
                <thead class="bg-slate-800/50">
                    <tr>
                        <th class="p-2 font-semibold text-slate-400 w-1/3">
                            Descriptor Name (Tag)
                        </th>
                        <th class="p-2 font-semibold text-slate-400">Details</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-700/50">
                    ${descriptors.map((desc) => {
                        const tooltipKey = desc.name.replace(/ /g, '_');
                        const tooltipInfo = tsTooltipData[tooltipKey] || {};
                        return html`
                            <tr class="hover:bg-slate-700/50">
                                <td
                                    class="p-2 font-medium text-slate-300 align-top ${tooltipTriggerClasses}"
                                    data-tooltip="${tooltipInfo.text ||
                                    'No description available'}"
                                    data-iso="${tooltipInfo.ref || ''}"
                                >
                                    ${desc.name}
                                    <span class="text-slate-500"
                                        >(0x${desc.tag
                                            .toString(16)
                                            .padStart(2, '0')})</span
                                    >
                                </td>
                                <td class="p-2 font-mono">
                                    <dl
                                        class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1"
                                    >
                                        ${Object.entries(desc.details).map(
                                            ([key, field]) => {
                                                const fieldTooltipKey = `${tooltipKey}@${key}`;
                                                const fieldTooltipInfo =
                                                    tsTooltipData[
                                                        fieldTooltipKey
                                                    ] || {};
                                                return html`
                                                    <dt
                                                        class="text-slate-400 ${fieldTooltipInfo.text
                                                            ? tooltipTriggerClasses
                                                            : ''}"
                                                        data-tooltip="${fieldTooltipInfo.text ||
                                                        ''}"
                                                        data-iso="${fieldTooltipInfo.ref ||
                                                        ''}"
                                                    >
                                                        ${key}:
                                                    </dt>
                                                    <dd
                                                        class="text-white break-all"
                                                    >
                                                        ${field.value}
                                                    </dd>
                                                `;
                                            }
                                        )}
                                    </dl>
                                </td>
                            </tr>
                        `;
                    })}
                </tbody>
            </table>
        </div>
    `;
};

const programStructureTemplate = (analysis) => {
    const { summary, packets } = analysis.data;
    const pmtPid = [...summary.pmtPids][0];
    const program = pmtPid ? summary.programMap[pmtPid] : null;

    const pmtPacket = packets.find((p) => p.pid === pmtPid && p.psi);
    if (!pmtPacket) {
        return html`<p class="text-sm text-slate-400">
            No PMT packet found in this segment.
        </p>`;
    }

    return html`
        <div class="space-y-6">
            <div>
                <h4 class="text-md font-semibold mb-2 text-slate-300">
                    Program Descriptors
                </h4>
                ${descriptorTableTemplate(pmtPacket.psi.program_descriptors)}
            </div>
            <div>
                <h4 class="text-md font-semibold mb-2 text-slate-300">
                    Elementary Streams
                </h4>
                <div class="space-y-4">
                    ${pmtPacket.psi.streams.map(
                        (stream) => html`
                            <div
                                class="border border-slate-700 rounded-lg p-3 bg-slate-800/50"
                            >
                                <div
                                    class="flex items-baseline gap-4 font-mono text-sm mb-3"
                                >
                                    <span
                                        >PID:
                                        <strong class="text-white"
                                            >${stream.elementary_PID
                                                .value}</strong
                                        ></span
                                    >
                                    <span
                                        >Stream Type:
                                        <strong class="text-white"
                                            >${stream.stream_type
                                                .value}</strong
                                        ></span
                                    >
                                </div>
                                ${descriptorTableTemplate(stream.es_descriptors)}
                            </div>
                        `
                    )}
                </div>
            </div>
        </div>
    `;
};

const semanticResultsTemplate = (results) => {
    if (!results || results.length === 0) {
        return html`<div
            class="text-center p-8 text-green-400 font-semibold"
        >
            ${icons.checkCircle} No semantic issues found.
        </div>`;
    }
    const statusClasses = { fail: 'text-red-400', warn: 'text-yellow-400' };
    const icon = { fail: '✗', warn: '⚠️' };
    return html`
        <div
            class="bg-slate-900/50 rounded border border-slate-700/50 overflow-hidden"
        >
            <table class="w-full text-left text-xs table-auto">
                <thead class="bg-slate-800/50">
                    <tr>
                        <th class="p-2 font-semibold text-slate-400 w-24">
                            Status
                        </th>
                        <th class="p-2 font-semibold text-slate-400">Check</th>
                        <th class="p-2 font-semibold text-slate-400">Details</th>
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
    `;
};

export const tsAnalysisTemplate = (analysis) => {
    const { summary } = analysis.data;
    const { segmentAnalysisActiveTab } = useUiStore.getState();

    if (summary.errors.length > 0 && summary.errors[0].includes('encrypted')) {
        return html`...`; // Existing encrypted template is fine
    }

    const tabs = [
        { key: 'structure', label: 'Program Structure' },
        { key: 'semantic', label: 'Semantic Analysis' },
    ];

    let content;
    if (segmentAnalysisActiveTab === 'semantic') {
        content = semanticResultsTemplate(summary.semanticResults);
    } else {
        content = programStructureTemplate(analysis);
    }

    const pmtPid = [...summary.pmtPids][0];
    const program = pmtPid ? summary.programMap[pmtPid] : null;

    const summaryCards = [
        statCardTemplate({
            label: 'Total Packets',
            value: summary.totalPackets,
            icon: icons.box,
        }),
        statCardTemplate({
            label: 'PCR PID',
            value: summary.pcrPid || 'N/A',
            icon: icons.clock,
        }),
        statCardTemplate({
            label: 'Program #',
            value: program?.programNumber,
            icon: icons.film,
        }),
        statCardTemplate({
            label: 'Semantic Issues',
            value: summary.semanticResults.length,
            icon: icons.debug,
            iconBgClass:
                summary.semanticResults.length > 0
                    ? 'bg-yellow-900/30 text-yellow-300'
                    : 'bg-green-900/30 text-green-300',
        }),
    ];

    return html`
        <div class="space-y-6">
            <div
                class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]"
            >
                ${summaryCards}
            </div>

            ${connectedTabBar(
                tabs,
                segmentAnalysisActiveTab,
                (tab) =>
                    uiActions.setSegmentAnalysisActiveTab(
                        /** @type {'structure' | 'semantic'} */ (tab)
                    )
            )}
            <div class="bg-slate-900 p-4 rounded-b-lg">${content}</div>
        </div>
    `;
};