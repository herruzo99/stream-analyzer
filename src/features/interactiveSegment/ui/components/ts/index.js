import { html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { useUiStore } from '@/state/uiStore';
import { getTooltipData as getTsTooltipData } from '@/infrastructure/parsing/ts/index';
import * as icons from '@/ui/icons';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import '@/ui/components/virtualized-list';

const allTsTooltipData = getTsTooltipData();

export function findPacketByOffset(parsedData, offset) {
    if (!parsedData?.data?.packets) return null;
    let packet = parsedData.data.packets.find((p) => p.offset === offset);
    if (packet) return packet;
    return (
        parsedData.data.packets.find(
            (p) => offset > p.offset && offset < p.offset + 188
        ) || null
    );
}

const inspectorFieldTemplate = (packet, section, key, field) => {
    const { interactiveSegmentHighlightedItem } = useUiStore.getState();
    const isFieldHovered =
        interactiveSegmentHighlightedItem?.item?.offset === packet.offset &&
        interactiveSegmentHighlightedItem?.field === `${section}.${key}`;

    const tooltipKey = key.replace('.', '@');
    const tooltipInfo = allTsTooltipData[tooltipKey] || {};

    const renderValue = (val) => {
        if (typeof val === 'object' && val !== null) {
            return html`
                <dl>
                    ${Object.entries(val).map(
                        ([subKey, subValue]) => html`
                            <dt class="text-gray-500 pl-2">${subKey}</dt>
                            <dd class="text-white pl-4">${subValue.value}</dd>
                        `
                    )}
                </dl>
            `;
        }
        return String(val);
    };

    return html`
        <div
            class="py-2 px-3 border-b border-slate-700/50 ${isFieldHovered
                ? 'highlight-hover-field'
                : ''}"
            data-field-name="${section}.${key}"
            data-box-offset="${packet.offset}"
        >
            <div
                class="text-xs font-semibold text-slate-400 ${tooltipInfo.text
                    ? tooltipTriggerClasses
                    : ''}"
                data-tooltip="${tooltipInfo.text || ''}"
                data-iso="${tooltipInfo.ref || ''}"
            >
                ${key}
            </div>
            <div class="text-sm font-mono text-white mt-1 break-all">
                ${renderValue(field.value)}
            </div>
        </div>
    `;
};

const placeholderTemplate = () => {
    return html`
        <div
            class="flex flex-col h-full items-center justify-center text-center text-slate-500 p-6"
        >
            ${icons.searchCode}
            <p class="mt-2 font-semibold">Select a Packet</p>
            <p class="text-sm">
                Click a packet in the list to see its parsed header details.
            </p>
        </div>
    `;
};

const encryptedContentTemplate = (error) => html`
    <div
        class="p-3 text-sm text-yellow-200 bg-yellow-900/30 h-full flex flex-col justify-center items-center text-center"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8 text-yellow-400 mb-2"
            viewBox="0 0 20 20"
            fill="currentColor"
        >
            <path
                fill-rule="evenodd"
                d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002 2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                clip-rule="evenodd"
            />
        </svg>
        <h4 class="font-bold text-yellow-300">Encrypted Segment</h4>
        <p class="mt-1">${error}</p>
        <p class="mt-2 text-xs text-gray-400">
            Structural analysis is not possible, but you can still inspect the
            raw encrypted bytes in the hex view.
        </p>
    </div>
`;

export const inspectorPanelTemplate = (tsAnalysisData) => {
    const { summary } = tsAnalysisData.data;
    const encryptionError = summary.errors.find((e) => e.includes('encrypted'));
    if (encryptionError) {
        return encryptedContentTemplate(encryptionError);
    }

    const {
        interactiveSegmentSelectedItem,
        interactiveSegmentHighlightedItem,
    } = useUiStore.getState();
    const itemForDisplay =
        interactiveSegmentSelectedItem?.item ||
        interactiveSegmentHighlightedItem?.item;

    const packet = itemForDisplay;

    if (!packet) return placeholderTemplate();

    const renderDetailSection = (title, dataObject, prefix) => {
        if (!dataObject) return '';
        return html`
            <details class="group" open>
                <summary
                    class="list-none cursor-pointer p-3 bg-slate-800/50 border-b border-slate-700"
                >
                    <h5 class="font-semibold text-slate-300">${title}</h5>
                </summary>
                ${Object.entries(dataObject).map(([key, field]) =>
                    inspectorFieldTemplate(packet, prefix, key, field)
                )}
            </details>
        `;
    };

    return html`
        <div
            class="segment-inspector-panel flex flex-col h-full bg-slate-900 rounded-lg border border-slate-700"
        >
            <div class="p-3 border-b border-slate-700 shrink-0">
                <h4
                    class="font-bold text-lg text-white font-mono flex items-center gap-2"
                >
                    Packet @${packet.offset}
                    <span class="text-sm font-normal text-slate-400"
                        >(PID: ${packet.pid})</span
                    >
                </h4>
                <p class="text-sm text-slate-300 mt-1">${packet.payloadType}</p>
            </div>
            <div class="grow overflow-y-auto">
                ${renderDetailSection('TS Header', packet.header, 'Header')}
                ${renderDetailSection(
                    'Adaptation Field',
                    packet.adaptationField,
                    'AF'
                )}
                ${renderDetailSection('PES Header', packet.pes, 'PES')}
            </div>
        </div>
    `;
};

export const structureContentTemplate = (tsAnalysisData) => {
    const { summary, packets } = tsAnalysisData.data;
    const {
        interactiveSegmentSelectedItem,
        interactiveSegmentHighlightedItem,
    } = useUiStore.getState();

    const encryptionError = summary.errors.find((e) => e.includes('encrypted'));
    if (encryptionError) {
        return encryptedContentTemplate(encryptionError);
    }

    if (packets.length === 0) {
        return html`<div class="p-3 text-sm text-slate-500">
            No TS packets were parsed from this segment.
        </div>`;
    }

    const rowRenderer = (p, index) => {
        const isSelected =
            interactiveSegmentSelectedItem?.item?.offset === p.offset;
        const isHovered =
            interactiveSegmentHighlightedItem?.item?.offset === p.offset;
        const color = p.color || { bgClass: 'bg-slate-800' };

        const classes = {
            flex: true,
            'items-center': true,
            'gap-2': true,
            'p-1.5': true,
            rounded: true,
            'cursor-pointer': true,
            'highlight-select-box': isSelected,
            'highlight-hover-box': isHovered,
        };

        return html`
            <div class=${classMap(classes)} data-packet-offset=${p.offset}>
                <div
                    class="w-3 h-3 rounded-full shrink-0 ${color.bgClass}"
                ></div>
                <span class="font-mono text-slate-400"
                    >@${String(p.offset).padStart(5, '0')}</span
                >
                <span class="font-semibold text-slate-200 truncate"
                    >${p.payloadType}</span
                >
                <span class="ml-auto font-mono text-slate-500"
                    >PID: ${p.pid}</span
                >
            </div>
        `;
    };

    return html`
        <div
            class="structure-tree-panel rounded-md bg-slate-900 h-full flex flex-col border border-slate-700"
        >
            <h3 class="font-bold p-3 border-b border-slate-700 shrink-0">
                Packet List (${packets.length})
            </h3>
            <div class="p-2 overflow-y-auto grow text-xs">
                <virtualized-list
                    .items=${packets}
                    .rowTemplate=${rowRenderer}
                    .rowHeight=${32}
                    .itemId=${(item) => item.offset}
                ></virtualized-list>
            </div>
        </div>
    `;
};
