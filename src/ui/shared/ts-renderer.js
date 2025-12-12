import { uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const renderValue = (val, customColor = null) => {
    if (val === null || val === undefined)
        return html`<span class="text-slate-600 italic">null</span>`;

    if (typeof val === 'object' && val !== null && 'value' in val) {
        const colorClass = customColor || 'text-cyan-300';
        return html`<span
            class="font-mono ${colorClass} break-all select-all"
            title="Offset: ${val.offset}, Len: ${val.length}"
            >${val.value}</span
        >`;
    }

    if (typeof val === 'boolean')
        return val
            ? html`<span class="text-green-400 font-bold">Yes</span>`
            : html`<span class="text-slate-500">No</span>`;

    const colorClass = customColor || 'text-slate-200';
    return html`<span class="font-mono ${colorClass} break-all select-all"
        >${String(val)}</span
    >`;
};

const kv = (k, v, color = null, parentPacket = null) => {
    const handleMouseEnter = () => {
        if (
            parentPacket &&
            v &&
            typeof v === 'object' &&
            v.offset !== undefined
        ) {
            const highlightItem = {
                ...parentPacket,
                details: { [k]: v },
            };
            uiActions.setInteractiveSegmentHighlightedItem(highlightItem, k);
        }
    };

    const handleMouseLeave = () => {
        uiActions.setInteractiveSegmentHighlightedItem(null, null);
    };

    return html`
        <div
            class="flex justify-between items-start py-1.5 border-b border-slate-800/50 last:border-0 text-[11px] group hover:bg-blue-900/20 px-2 -mx-2 rounded transition-colors cursor-crosshair"
            @mouseenter=${handleMouseEnter}
            @mouseleave=${handleMouseLeave}
        >
            <span
                class="text-slate-500 font-medium shrink-0 mr-2 group-hover:text-slate-300 transition-colors select-none"
                >${k.replace(/_/g, ' ')}</span
            >
            <div class="text-right">${renderValue(v, color)}</div>
        </div>
    `;
};

const sectionHeader = (title, icon = icons.info) => html`
    <h4
        class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2 mt-4 first:mt-0 border-b border-slate-800 pb-1 select-none"
    >
        <span class="scale-75 text-blue-500">${icon}</span> ${title}
    </h4>
`;

// Generic object renderer for fallback
const renderDeepObject = (obj, parentPacket = null) => {
    if (!obj || typeof obj !== 'object') return renderValue(obj);

    return Object.entries(obj).map(([k, v]) => {
        // Special case: value/offset/length wrapper from parser is a leaf node
        if (v && typeof v === 'object' && 'value' in v && 'offset' in v) {
            return kv(k, v, null, parentPacket);
        }

        if (Array.isArray(v)) {
            if (v.length === 0) return '';
            return html`
                <div class="mt-2 border-l-2 border-slate-700 pl-2 ml-1">
                    <span
                        class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block select-none"
                        >${k}</span
                    >
                    ${v.map(
                        (item, i) =>
                            html`<div class="mb-2 last:mb-0">
                                <div class="text-[9px] text-slate-600 mb-0.5">
                                    Item ${i}
                                </div>
                                ${renderDeepObject(item, parentPacket)}
                            </div>`
                    )}
                </div>
            `;
        }

        if (v && typeof v === 'object') {
            if (k === 'fieldOffsets') return '';

            return html`
                <div class="mt-1 border-l-2 border-slate-700 pl-2 ml-1">
                    <span
                        class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block select-none"
                        >${k}</span
                    >
                    ${renderDeepObject(v, parentPacket)}
                </div>
            `;
        }

        return kv(k, v, null, parentPacket);
    });
};

const renderDescriptor = (desc, parentPacket) => {
    return html`
        <div
            class="bg-slate-900 border border-slate-700/50 rounded-lg p-2.5 mb-2 last:mb-0"
        >
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-amber-200"
                    >${desc.name}</span
                >
                <span
                    class="text-[9px] font-mono text-slate-500 bg-black/20 px-1.5 rounded"
                    >Tag: 0x${desc.tag.toString(16).padStart(2, '0')}</span
                >
            </div>
            <div class="pl-1">
                ${renderDeepObject(desc.details, parentPacket)}
            </div>
        </div>
    `;
};

const renderPmtContent = (pmt, packet) => {
    return html`
        <div class="bg-slate-800/30 rounded p-2 border border-slate-800 mb-4">
            ${kv('PCR PID', pmt.pcr_pid, 'text-emerald-400 font-bold', packet)}
        </div>

        ${pmt.program_descriptors && pmt.program_descriptors.length > 0
            ? html`
                  <div class="mb-4">
                      <div
                          class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2"
                      >
                          Program Descriptors
                      </div>
                      ${pmt.program_descriptors.map((d) =>
                          renderDescriptor(d, packet)
                      )}
                  </div>
              `
            : ''}

        <div class="space-y-3">
            <div
                class="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
            >
                Elementary Streams (${pmt.streams.length})
            </div>
            ${pmt.streams.map((stream) => {
                const streamType = stream.stream_type.value;
                const pid = stream.elementary_PID.value;
                return html`
                    <div
                        class="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden"
                    >
                        <div
                            class="px-3 py-2 bg-slate-900/50 border-b border-slate-700/50 flex justify-between items-center"
                        >
                            <span class="text-xs font-bold text-blue-300"
                                >PID ${pid}</span
                            >
                            <span class="text-[10px] text-slate-400"
                                >Type: ${streamType}</span
                            >
                        </div>
                        <div class="p-2">
                            ${stream.es_descriptors &&
                            stream.es_descriptors.length > 0
                                ? stream.es_descriptors.map((d) =>
                                      renderDescriptor(d, packet)
                                  )
                                : html`<div
                                      class="text-[10px] text-slate-600 italic px-1"
                                  >
                                      No descriptors
                                  </div>`}
                        </div>
                    </div>
                `;
            })}
        </div>
    `;
};

const renderCatContent = (cat, packet) => {
    return html`
        <div class="space-y-3">
            ${cat.descriptors && cat.descriptors.length > 0
                ? cat.descriptors.map((d) => renderDescriptor(d, packet))
                : html`<div class="text-slate-500 italic text-xs">
                      No descriptors in CAT.
                  </div>`}
        </div>
    `;
};

const renderTsdtContent = (tsdt, packet) => {
    return html`
        <div class="space-y-3">
            ${tsdt.descriptors && tsdt.descriptors.length > 0
                ? tsdt.descriptors.map((d) => renderDescriptor(d, packet))
                : html`<div class="text-slate-500 italic text-xs">
                      No descriptors in TSDT.
                  </div>`}
        </div>
    `;
};

const renderHeaderTab = (packet) => html`
    <div class="space-y-4 p-4 animate-fadeIn">
        ${sectionHeader('Transport Header', icons.fileText)}
        <div class="bg-slate-800/30 rounded p-2 border border-slate-800">
            ${kv('Sync Byte', packet.header.sync_byte, null, packet)}
            ${kv(
                'Transport Error',
                packet.header.transport_error_indicator,
                packet.header.transport_error_indicator.value
                    ? 'text-red-400 font-bold'
                    : null,
                packet
            )}
            ${kv(
                'Payload Start',
                packet.header.payload_unit_start_indicator,
                'text-emerald-400 font-bold',
                packet
            )}
            ${kv(
                'Priority',
                packet.header.transport_priority,
                packet.header.transport_priority.value
                    ? 'text-amber-400 font-bold'
                    : null,
                packet
            )}
            ${kv('PID', packet.header.pid, 'text-blue-300 font-bold', packet)}
            ${kv(
                'Scrambling',
                packet.header.transport_scrambling_control,
                null,
                packet
            )}
            ${kv(
                'Adaptation Control',
                packet.header.adaptation_field_control,
                null,
                packet
            )}
            ${kv(
                'Continuity Counter',
                packet.header.continuity_counter,
                'text-white font-mono',
                packet
            )}
        </div>
    </div>
`;

const renderAdaptationTab = (packet) => {
    const af = packet.adaptationField;
    if (!af)
        return html`<div class="p-8 text-center text-slate-500 italic">
            No Adaptation Field present.
        </div>`;

    return html`
        <div class="space-y-4 p-4 animate-fadeIn">
            ${sectionHeader('Adaptation Field', icons.settings)}
            <div class="bg-slate-800/30 rounded p-2 border border-slate-800">
                ${kv('Length', af.length, null, packet)}
                ${af.discontinuity_indicator?.value
                    ? html`<div
                          class="bg-yellow-900/20 text-yellow-200 text-xs font-bold p-1 rounded text-center border border-yellow-500/30 my-1"
                      >
                          Discontinuity
                      </div>`
                    : ''}
                ${af.random_access_indicator?.value
                    ? html`<div
                          class="bg-green-900/20 text-green-200 text-xs font-bold p-1 rounded text-center border border-green-500/30 my-1"
                      >
                          Random Access
                      </div>`
                    : ''}
                ${kv('PCR Flag', af.pcr_flag, null, packet)}
                ${kv('OPCR Flag', af.opcr_flag, null, packet)}
                ${kv('Splicing Point', af.splicing_point_flag, null, packet)}
                ${kv(
                    'Private Data',
                    af.transport_private_data_flag,
                    null,
                    packet
                )}
                ${kv(
                    'Extension',
                    af.adaptation_field_extension_flag,
                    null,
                    packet
                )}
            </div>

            ${af.pcr
                ? html`
                      ${sectionHeader('Timing (PCR)', icons.clock)}
                      <div
                          class="bg-slate-800/30 rounded p-2 border border-slate-800"
                      >
                          <div class="text-center py-2">
                              <span
                                  class="text-2xl font-mono font-bold text-cyan-400 tracking-tight"
                                  >${af.pcr.value}</span
                              >
                              <div
                                  class="text-[9px] text-slate-500 uppercase tracking-widest mt-1"
                              >
                                  27MHz Clock
                              </div>
                          </div>
                      </div>
                  `
                : ''}
            ${af.extension
                ? html`
                      ${sectionHeader('Extension', icons.puzzle)}
                      <div
                          class="bg-slate-800/30 rounded p-2 border border-slate-800"
                      >
                          ${renderDeepObject(af.extension, packet)}
                      </div>
                  `
                : ''}
        </div>
    `;
};

const renderPayloadTab = (packet) => {
    if (packet.pes) {
        return html`
            <div class="space-y-4 p-4 animate-fadeIn">
                ${sectionHeader('PES Header', icons.layers)}
                <div
                    class="bg-slate-800/30 rounded p-2 border border-slate-800"
                >
                    ${kv(
                        'Stream ID',
                        packet.pes.stream_id,
                        'text-purple-300 font-bold',
                        packet
                    )}
                    ${kv(
                        'Packet Length',
                        packet.pes.pes_packet_length,
                        null,
                        packet
                    )}
                </div>

                ${packet.pes.pts || packet.pes.dts
                    ? html`
                          ${sectionHeader('Timestamps', icons.timer)}
                          <div class="grid grid-cols-1 gap-2">
                              ${packet.pes.pts
                                  ? html`
                                        <div
                                            class="bg-slate-800/40 p-2 rounded border border-slate-700/50"
                                        >
                                            <div
                                                class="text-[10px] text-slate-500 uppercase font-bold mb-1"
                                            >
                                                PTS
                                            </div>
                                            <div
                                                class="font-mono text-emerald-400 font-bold text-sm"
                                            >
                                                ${packet.pes.pts.value}
                                            </div>
                                        </div>
                                    `
                                  : ''}
                              ${packet.pes.dts
                                  ? html`
                                        <div
                                            class="bg-slate-800/40 p-2 rounded border border-slate-700/50"
                                        >
                                            <div
                                                class="text-[10px] text-slate-500 uppercase font-bold mb-1"
                                            >
                                                DTS
                                            </div>
                                            <div
                                                class="font-mono text-blue-400 font-bold text-sm"
                                            >
                                                ${packet.pes.dts.value}
                                            </div>
                                        </div>
                                    `
                                  : ''}
                          </div>
                      `
                    : ''}
                ${packet.pes.PES_extension_flag?.value
                    ? html`
                          ${sectionHeader('Extensions', icons.puzzle)}
                          <div
                              class="bg-slate-800/30 rounded p-2 border border-slate-800 space-y-2"
                          >
                              ${renderDeepObject(packet.pes, packet)}
                          </div>
                      `
                    : ''}
            </div>
        `;
    }

    if (packet.psi) {
        let specificContent;
        const type = packet.psi.type;

        if (type === 'PMT') {
            specificContent = renderPmtContent(packet.psi, packet);
        } else if (type === 'CAT') {
            specificContent = renderCatContent(packet.psi, packet);
        } else if (type === 'TSDT') {
            specificContent = renderTsdtContent(packet.psi, packet);
        } else {
            // Default generic fallback for PAT or unknown tables
            specificContent = html`
                <div
                    class="bg-slate-800/30 rounded p-2 border border-slate-800 text-xs"
                >
                    ${renderDeepObject(packet.psi, packet)}
                </div>
            `;
        }

        return html`
            <div class="p-4 animate-fadeIn">
                ${sectionHeader(`PSI Table (${packet.psi.type})`, icons.list)}
                ${specificContent}
            </div>
        `;
    }

    return html`
        <div class="p-8 text-center text-slate-500 italic">
            <div class="mb-2 scale-150 opacity-50">${icons.binary}</div>
            Raw Payload Data
        </div>
    `;
};

// --- Main Template ---

export const tsInspectorDetailsTemplate = (packet) => {
    if (!packet) {
        return html`
            <div
                class="h-full flex flex-col items-center justify-center text-center p-8 text-slate-600 bg-slate-950/30"
            >
                <div
                    class="mb-4 p-4 bg-slate-800/30 rounded-full border border-slate-800 shadow-inner"
                >
                    ${icons.searchCode}
                </div>
                <p class="font-medium text-sm text-slate-400">
                    Select a TS Packet
                </p>
                <p class="text-xs text-slate-500 mt-2 max-w-[200px]">
                    Click a row in the packet list to inspect headers and
                    payload.
                </p>
            </div>
        `;
    }

    const hasAf = !!packet.adaptationField;

    // Resolve payload type visualization color
    // SAFEGUARD: Ensure payloadType exists before calling includes
    const pType = packet.payloadType || 'Unknown';
    let payloadColor = 'bg-slate-800 text-slate-400 border-slate-700';
    if (pType.includes('PAT'))
        payloadColor = 'bg-red-900/20 text-red-300 border-red-500/30';
    else if (pType.includes('PMT'))
        payloadColor = 'bg-yellow-900/20 text-yellow-300 border-yellow-500/30';
    else if (pType.includes('Video'))
        payloadColor = 'bg-blue-900/20 text-blue-300 border-blue-500/30';
    else if (pType.includes('Audio'))
        payloadColor = 'bg-purple-900/20 text-purple-300 border-purple-500/30';
    else if (pType.includes('CAT'))
        payloadColor =
            'bg-fuchsia-900/20 text-fuchsia-300 border-fuchsia-500/30';

    return html`
        <div
            class="h-full flex flex-col bg-slate-900 border-l border-slate-800"
        >
            <!-- Header -->
            <div class="shrink-0 p-5 border-b border-slate-800 bg-slate-900/50">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h2 class="text-lg font-bold text-white font-mono">
                            TS Packet
                        </h2>
                        <div class="flex gap-2 mt-1">
                            <span class="font-mono text-xs text-slate-500"
                                >Offset:
                                <span class="text-slate-300"
                                    >${packet.offset}</span
                                ></span
                            >
                            <span class="font-mono text-xs text-slate-500"
                                >PID:
                                <span class="text-slate-300 font-bold"
                                    >${packet.pid}</span
                                ></span
                            >
                        </div>
                    </div>
                    <span
                        class="px-2 py-1 rounded text-[10px] font-bold uppercase border ${payloadColor}"
                        >${pType}</span
                    >
                </div>
                <div class="flex gap-2 text-xs font-mono flex-wrap">
                    <div
                        class="flex items-center gap-2 px-2 py-1 bg-slate-950 rounded border border-slate-800"
                    >
                        <span class="text-slate-500 uppercase font-bold"
                            >CC</span
                        >
                        <span class="text-slate-200"
                            >${packet.header.continuity_counter.value}</span
                        >
                    </div>
                    <div
                        class="flex items-center gap-2 px-2 py-1 bg-slate-900 rounded border border-slate-800"
                    >
                        <span class="text-slate-500 uppercase font-bold"
                            >PUSI</span
                        >
                        <span
                            class="${packet.header.payload_unit_start_indicator
                                .value
                                ? 'text-emerald-400'
                                : 'text-slate-500'}"
                            >${packet.header.payload_unit_start_indicator.value
                                ? 'YES'
                                : 'NO'}</span
                        >
                    </div>
                    <div
                        class="flex items-center gap-2 px-2 py-1 bg-slate-900 rounded border border-slate-800"
                    >
                        <span class="text-slate-500 uppercase font-bold"
                            >Scramble</span
                        >
                        <span class="text-slate-300"
                            >${packet.header.transport_scrambling_control
                                .value}</span
                        >
                    </div>
                </div>
            </div>

            <!-- Scrollable Content -->
            <div class="grow overflow-y-auto custom-scrollbar p-5 space-y-6">
                <!-- 1. Header Section -->
                ${renderHeaderTab(packet)}

                <!-- 2. Adaptation Field Section -->
                ${hasAf
                    ? html`<div class="border-t border-slate-800/50 pt-4">
                          ${renderAdaptationTab(packet)}
                      </div>`
                    : ''}

                <!-- 3. Payload Section -->
                <div class="border-t border-slate-800/50 pt-4">
                    ${renderPayloadTab(packet)}
                </div>
            </div>
        </div>
    `;
};
