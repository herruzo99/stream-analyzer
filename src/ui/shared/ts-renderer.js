import { uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

// --- Generic Helpers ---

const renderValue = (val, customColor = null) => {
    if (val === null || val === undefined)
        return html`<span class="text-slate-600 italic">null</span>`;

    // Handle the { value, offset, length } structure from parsers
    if (typeof val === 'object' && val !== null && 'value' in val) {
        const colorClass = customColor || 'text-cyan-300';
        return html`<span
            class="font-mono ${colorClass} break-all"
            title="Offset: ${val.offset}"
            >${val.value}</span
        >`;
    }

    if (typeof val === 'boolean')
        return val
            ? html`<span class="text-green-400">Yes</span>`
            : html`<span class="text-slate-500">No</span>`;

    const colorClass = customColor || 'text-slate-200';
    return html`<span class="font-mono ${colorClass} break-all"
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
                details: { [k]: v }, // Synthesize a details object for the Hex View to target
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

const renderDeepObject = (obj, parentPacket = null) => {
    if (!obj || typeof obj !== 'object') return renderValue(obj);

    return Object.entries(obj).map(([k, v]) => {
        if (v && typeof v === 'object' && 'value' in v && 'offset' in v) {
            return kv(k, v, null, parentPacket);
        }

        if (Array.isArray(v)) {
            return html`
                <div class="mt-2 border-l-2 border-slate-700 pl-2 ml-1">
                    <span
                        class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block select-none"
                        >${k}</span
                    >
                    ${v.map(
                        (item) =>
                            html`<div class="mb-2 last:mb-0">
                                ${renderDeepObject(item, parentPacket)}
                            </div>`
                    )}
                </div>
            `;
        }

        if (v && typeof v === 'object') {
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

const sectionHeader = (title, icon = icons.info) => html`
    <h4
        class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2 mt-4 first:mt-0 border-b border-slate-800 pb-1 select-none"
    >
        <span class="scale-75 text-blue-500">${icon}</span> ${title}
    </h4>
`;

// --- TS Specific Component Renderers ---

const renderDescriptor = (d, parentPacket) => html`
    <div
        class="bg-slate-800/40 rounded border border-slate-700/50 p-2 mb-2 last:mb-0"
    >
        <div
            class="flex justify-between items-center mb-2 border-b border-slate-700/50 pb-1"
        >
            <span class="text-xs font-bold text-slate-300">${d.name}</span>
            <span
                class="text-[9px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded"
                >Tag: 0x${d.tag.toString(16).toUpperCase()}</span
            >
        </div>
        <div class="space-y-0.5">
            ${d.details
                ? renderDeepObject(d.details, parentPacket)
                : html`<div class="text-slate-600 italic text-[10px]">
                      No details parsed
                  </div>`}
        </div>
    </div>
`;

const renderPatDetails = (pat, parentPacket) => html`
    ${sectionHeader('PAT Programs', icons.list)}
    <div
        class="bg-slate-800/40 rounded border border-slate-800 overflow-hidden"
    >
        <table class="w-full text-xs text-left">
            <thead
                class="bg-slate-900/80 text-slate-500 font-bold uppercase text-[10px]"
            >
                <tr>
                    <th class="px-3 py-2">Type</th>
                    <th class="px-3 py-2">ID</th>
                    <th class="px-3 py-2 text-right">PID</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/50">
                ${pat.programs.map(
                    (p) => html`
                        <tr class="hover:bg-white/[0.02] transition-colors">
                            <td class="px-3 py-1.5 text-slate-400 font-medium">
                                ${p.type}
                            </td>
                            <td class="px-3 py-1.5 text-slate-300 font-mono">
                                ${p.program_number
                                    ? renderValue(p.program_number)
                                    : '-'}
                            </td>
                            <td
                                class="px-3 py-1.5 text-right font-mono text-yellow-400"
                            >
                                ${p.program_map_PID
                                    ? renderValue(p.program_map_PID)
                                    : p.pid
                                      ? renderValue(p.pid)
                                      : '-'}
                            </td>
                        </tr>
                    `
                )}
            </tbody>
        </table>
    </div>
`;

const renderPmtDetails = (pmt, parentPacket) => html`
    ${sectionHeader('Program Info', icons.info)}
    <div class="bg-slate-800/30 rounded p-2 border border-slate-800 mb-4">
        ${kv('PCR PID', pmt.pcr_pid, 'text-yellow-400 font-bold', parentPacket)}
        ${pmt.program_descriptors && pmt.program_descriptors.length > 0
            ? html`
                  <div class="mt-3">
                      <span
                          class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block"
                          >Program Descriptors</span
                      >
                      ${pmt.program_descriptors.map((d) =>
                          renderDescriptor(d, parentPacket)
                      )}
                  </div>
              `
            : ''}
    </div>
    ${sectionHeader('Elementary Streams', icons.layers)}
    <div class="space-y-3">
        ${pmt.streams.map(
            (s) => html`
                <div
                    class="bg-slate-800/40 rounded border border-slate-800 hover:border-slate-600 transition-colors overflow-hidden"
                >
                    <div
                        class="flex justify-between items-center p-2 bg-slate-900/30 border-b border-slate-800/50"
                    >
                        <span
                            class="text-xs font-bold text-white flex items-center gap-2"
                            >PID
                            ${renderValue(s.elementary_PID, 'text-white')}</span
                        >
                        <span
                            class="text-[10px] bg-blue-900/20 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono"
                            >${renderValue(
                                s.stream_type,
                                'text-blue-300'
                            )}</span
                        >
                    </div>
                    <div class="p-2">
                        ${s.es_descriptors && s.es_descriptors.length > 0
                            ? html`<div class="space-y-1">
                                  ${s.es_descriptors.map((d) =>
                                      renderDescriptor(d, parentPacket)
                                  )}
                              </div>`
                            : html`<div
                                  class="text-slate-600 italic text-[10px] text-center py-1"
                              >
                                  No descriptors
                              </div>`}
                    </div>
                </div>
            `
        )}
    </div>
`;

const renderPesDetails = (pes, parentPacket) => html`
    ${sectionHeader('PES Header', icons.fileText)}
    <div class="bg-slate-800/30 rounded p-2 border border-slate-800 mb-2">
        ${kv('Stream ID', pes.stream_id, null, parentPacket)}
        ${kv('Packet Length', pes.pes_packet_length, null, parentPacket)}
        ${pes.scrambling_control
            ? kv('Scrambling', pes.scrambling_control, null, parentPacket)
            : ''}
    </div>
    ${pes.pts || pes.dts
        ? html`
              ${sectionHeader('Timing', icons.clock)}
              <div class="bg-slate-800/30 rounded p-2 border border-slate-800">
                  ${pes.pts
                      ? kv(
                            'PTS',
                            pes.pts,
                            'text-purple-300 font-bold',
                            parentPacket
                        )
                      : ''}
                  ${pes.dts
                      ? kv('DTS', pes.dts, 'text-blue-300', parentPacket)
                      : ''}
              </div>
          `
        : ''}
    ${pes.PES_extension_flag?.value
        ? html`
              ${sectionHeader('Extensions', icons.puzzle)}
              <div
                  class="bg-slate-800/30 rounded p-2 border border-slate-800 space-y-2"
              >
                  ${renderDeepObject(pes, parentPacket)}
              </div>
          `
        : ''}
`;

const renderAdaptationField = (af, parentPacket) => html`
    ${sectionHeader('Adaptation Field', icons.settings)}
    <div class="bg-slate-800/30 rounded p-2 border border-slate-800">
        ${kv('Length', af.length, null, parentPacket)}
        ${af.discontinuity_indicator?.value
            ? html`<div
                  class="bg-yellow-900/20 border border-yellow-500/30 p-1 rounded text-yellow-200 text-xs font-bold mt-1 text-center"
              >
                  ⚠️ Discontinuity Indicator
              </div>`
            : ''}
        ${af.random_access_indicator?.value
            ? html`<div
                  class="bg-green-900/20 border border-green-500/30 p-1 rounded text-green-300 text-xs font-bold mt-1 text-center"
              >
                  ✓ Random Access
              </div>`
            : ''}
        ${af.pcr
            ? html`
                  <div class="mt-2 pt-2 border-t border-slate-700/50">
                      ${kv(
                          'PCR',
                          af.pcr,
                          'text-cyan-400 font-bold text-sm',
                          parentPacket
                      )}
                      ${af.opcr ? kv('OPCR', af.opcr, null, parentPacket) : ''}
                      ${af.splice_countdown
                          ? kv(
                                'Splice Countdown',
                                af.splice_countdown,
                                null,
                                parentPacket
                            )
                          : ''}
                  </div>
              `
            : ''}
        ${af.extension
            ? html`
                  <div class="mt-3">
                      <span
                          class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1"
                          >Extension</span
                      >
                      ${renderDeepObject(af.extension, parentPacket)}
                  </div>
              `
            : ''}
    </div>
`;

/**
 * Main renderer for the TS Packet Inspector panel.
 */
export const tsInspectorDetailsTemplate = (packet) => {
    if (!packet)
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
                    Select a packet
                </p>
                <p class="text-xs text-slate-500 mt-2 max-w-[200px]">
                    Click on a row in the packet list to view details.
                </p>
            </div>
        `;

    const af = packet.adaptationField;
    const psi = packet.psi;
    const pes = packet.pes;

    // Resolve payload type visualization color
    let payloadColor = 'bg-slate-800 text-slate-400 border-slate-700';
    if (packet.payloadType.includes('PAT'))
        payloadColor = 'bg-red-900/20 text-red-300 border-red-500/30';
    else if (packet.payloadType.includes('PMT'))
        payloadColor = 'bg-yellow-900/20 text-yellow-300 border-yellow-500/30';
    else if (packet.payloadType.includes('Video'))
        payloadColor = 'bg-blue-900/20 text-blue-300 border-blue-500/30';
    else if (packet.payloadType.includes('Audio'))
        payloadColor = 'bg-purple-900/20 text-purple-300 border-purple-500/30';

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
                        >${packet.payloadType}</span
                    >
                </div>
                <div class="flex gap-2 text-xs font-mono">
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
                ${af ? renderAdaptationField(af, packet) : ''}
                ${psi
                    ? html`<div class="animate-fadeIn">
                          ${psi.type === 'PAT'
                              ? renderPatDetails(psi, packet)
                              : ''}
                          ${psi.type === 'PMT'
                              ? renderPmtDetails(psi, packet)
                              : ''}
                          ${!['PAT', 'PMT'].includes(psi.type)
                              ? html`${sectionHeader(
                                        `Generic PSI (${psi.type || 'Unknown'})`,
                                        icons.box
                                    )}
                                    <div class="space-y-2">
                                        ${renderDeepObject(psi, packet)}
                                    </div>`
                              : ''}
                      </div>`
                    : ''}
                ${pes
                    ? html`<div class="animate-fadeIn">
                          ${renderPesDetails(pes, packet)}
                      </div>`
                    : ''}
                ${!psi && !pes && !af
                    ? html`
                          <div
                              class="p-4 text-center text-xs text-slate-500 italic border-2 border-dashed border-slate-800 rounded-lg"
                          >
                              No structured payload parsed.
                              ${packet.payloadType === 'Data'
                                  ? html`<div class="mt-1">
                                        Raw stream data.
                                    </div>`
                                  : ''}
                          </div>
                      `
                    : ''}
            </div>
        </div>
    `;
};
