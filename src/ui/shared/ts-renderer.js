import { uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const renderValue = (val, customColor = null) => {
    if (val === null || val === undefined)
        return html`<span class="text-slate-400 italic">null</span>`;

    if (typeof val === 'object' && val !== null && 'value' in val) {
        const colorClass = customColor || 'text-blue-300';
        return html`<span
            class="font-mono ${colorClass} break-all select-all text-[11px]"
            title="Offset: ${val.offset}, Len: ${val.length}"
            >${val.value}</span
        >`;
    }

    if (typeof val === 'boolean')
        return val
            ? html`<span class="text-emerald-400 font-bold"
                  >Yes</span
              >`
            : html`<span class="text-slate-400">No</span>`;

    const colorClass = customColor || 'text-slate-100';
    return html`<span class="font-mono ${colorClass} break-all select-all text-[11px]"
        >${String(val)}</span
    >`;
};

const cardKV = (k, v, colorClass = null, parentPacket = null) => {
    // Extract value/offset if it's a parsed node
    let displayValue = v;
    let detailsCtx = null;

    // Check if v is the {value, offset, length} object
    if (v && typeof v === 'object' && 'value' in v) {
        displayValue = v;
        detailsCtx = v;
    } else {
        detailsCtx = { value: v };
    }

    const offset = detailsCtx && typeof detailsCtx === 'object' ? detailsCtx.offset : undefined;

    // Highlight interaction
    const handleMouseEnter = () => {
        if (parentPacket && typeof k === 'string' && offset !== undefined) {
            uiActions.setInteractiveSegmentHighlightedItem({ ...parentPacket, details: { [k]: v } }, k);
        }
    };
    const handleMouseLeave = () => uiActions.setInteractiveSegmentHighlightedItem(null, null);

    return html`
        <div 
            @mouseenter=${handleMouseEnter}
            @mouseleave=${handleMouseLeave}
            class="flex justified-between items-start py-1.5 px-3 border-b border-slate-800/50 last:border-0 hover:bg-slate-800 transition-colors group cursor-default"
        >
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide opacity-80 group-hover:opacity-100 group-hover:text-blue-300 transition-all shrink-0 mr-4 mt-0.5">
                ${k.replace(/_/g, ' ')}
            </span>
            <div class="grow text-right font-mono text-xs select-all break-all max-w-[70%]">
                ${renderValue(displayValue, colorClass)}
            </div>
        </div>
    `;
};

const _sectionHeader = (title, icon = icons.info) => html`
    <h4
        class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2 mt-6 first:mt-0 select-none"
    >
        <span class="scale-90 text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.3)]">${icon}</span> ${title}
    </h4>
`;

// Generic object renderer using the new card style
const renderDeepObject = (obj, parentPacket = null) => {
    if (!obj || typeof obj !== 'object') return renderValue(obj);

    return Object.entries(obj).map(([k, v]) => {
        // Leaf node with value/offset
        if (v && typeof v === 'object' && 'value' in v && 'offset' in v) {
            return cardKV(k, v, null, parentPacket);
        }

        // Array
        if (Array.isArray(v)) {
            if (v.length === 0) return '';
            return html`
                <div class="mt-4 first:mt-0">
                    <h5 class="text-[9px] font-bold text-blue-400/80 uppercase tracking-widest mb-2 pl-2 border-l border-blue-500/40">${k}</h5>
                    <div class="space-y-2 pl-2 border-l border-slate-800/30 ml-0.5">
                        ${v.map((item, i) => html`
                            <div class="bg-slate-800/30 rounded border border-slate-800/40 overflow-hidden group/item">
                                <div class="px-2 py-1 text-[9px] font-mono font-bold text-slate-400 bg-slate-800/50 border-b border-slate-800/30 flex justify-between items-center group-hover/item:text-blue-300 transition-colors">
                                    <span>#${i}</span>
                                </div>
                                <div>
                                    ${renderDeepObject(item, parentPacket)}
                                </div>
                            </div>
                        `)}
                    </div>
                </div>
             `;
        }

        // Nested Object
        if (v && typeof v === 'object') {
            if (k === 'fieldOffsets') return '';
            return html`
                <div class="mt-3 first:mt-0">
                    <h5 class="text-[9px] font-bold text-blue-400/80 uppercase tracking-widest mb-1.5 pl-2 border-l border-blue-500/40">${k}</h5>
                    <div class="bg-slate-800/20 rounded-lg border border-slate-800/30 overflow-hidden ring-1 ring-white/5 ml-1">
                        ${renderDeepObject(v, parentPacket)}
                    </div>
                </div>
             `;
        }

        return cardKV(k, v, null, parentPacket);
    });
};

// Full literal classes (Tailwind needs static class names; the old code
// built them from CSS variable names that were never defined).
const BADGE_TONES = {
    'text-muted': {
        bg: 'bg-slate-400/20',
        text: 'text-slate-400',
        border: 'border-slate-400/30',
    },
    'color-warning': {
        bg: 'bg-amber-500/20',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
    },
    'primary-500': {
        bg: 'bg-blue-500/20',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
    },
    'secondary-500': {
        bg: 'bg-purple-500/20',
        text: 'text-purple-400',
        border: 'border-purple-500/30',
    },
    'color-success': {
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
    },
    'color-error': {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        border: 'border-red-500/30',
    },
};

const badge = (label, colorVar = 'text-muted', filled = false) => {
    const tone = BADGE_TONES[colorVar] || BADGE_TONES['text-muted'];
    return html`
    <span
        class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${filled
        ? `${tone.bg} ${tone.text} ${tone.border}`
        : 'text-slate-400 border-slate-700 bg-slate-800'}"
    >
        ${label}
    </span>
`;
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
            ${cardKV('PCR PID', pmt.pcr_pid, 'text-emerald-400 font-bold', packet)}
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

const renderPsiContent = (packet) => {
    const type = packet.psi?.type;
    if (type === 'PMT') return renderPmtContent(packet.psi, packet);
    if (type === 'CAT') return renderCatContent(packet.psi, packet);
    if (type === 'TSDT') return renderTsdtContent(packet.psi, packet);
    return renderDeepObject(packet.psi, packet);
};

const renderHeaderTab = (packet) => html`
    <div class="mb-6 animate-fadeIn">
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            ${icons.fileText} <span class="opacity-80">Transport Header</span>
        </h3>
        <div class="bg-slate-800/40 rounded-xl border border-slate-800 shadow-sm overflow-hidden ring-1 ring-white/5">
            ${cardKV('Sync Byte', `0x${packet.header.sync_byte.value.toString(16)}`, 'text-slate-100', packet)}
            ${cardKV('Transport Error', packet.header.transport_error_indicator.value, packet.header.transport_error_indicator.value ? 'text-red-400' : 'text-slate-100', packet)}
            ${cardKV('Payload Start', packet.header.payload_unit_start_indicator.value, packet.header.payload_unit_start_indicator.value ? 'text-emerald-400' : 'text-slate-100', packet)}
            ${cardKV('Priority', packet.header.transport_priority.value, packet.header.transport_priority.value ? 'text-amber-400' : 'text-slate-100', packet)}
            ${cardKV('PID', packet.header.pid.value, 'text-blue-400 font-bold', packet)}
            ${cardKV('Scrambling', packet.header.transport_scrambling_control.value, 'text-slate-100', packet)}
            ${cardKV('Adaptation Control', packet.header.adaptation_field_control.value, 'text-slate-100', packet)}
            ${cardKV('Continuity Counter', packet.header.continuity_counter.value, 'text-slate-100', packet)}
        </div>
    </div>
`;

export const tsInspectorDetailsTemplate = (packet) => {
    if (!packet) {
        return html`
            <div class="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <div class="mb-6 p-6 bg-slate-800/40 backdrop-blur-xl rounded-full border border-slate-800 shadow-[0_0_30px_#3b82f6] ring-1 ring-white/10 group">
                    <div class="text-blue-400 scale-150 group-hover:scale-[1.6] transition-transform duration-500">${icons.searchCode}</div>
                </div>
                <p class="font-black text-lg text-slate-100 tracking-tight">Select a TS Packet</p>
            </div>
        `;
    }

    const pType = packet.payloadType || 'Unknown';
    // Determine badge style based on type
    let payloadBadgeColor = 'text-muted';
    if (pType.includes('PAT') || pType.includes('PMT')) payloadBadgeColor = 'color-warning'; // PSI tables
    else if (pType.includes('Video')) payloadBadgeColor = 'primary-500';
    else if (pType.includes('Audio')) payloadBadgeColor = 'secondary-500';

    return html`
        <div class="h-full flex flex-col bg-transparent overflow-hidden">
            <!-- Header Card -->
            <div class="shrink-0 p-5 bg-slate-800/60 backdrop-blur-md border-b border-slate-800 shadow-sm z-10">
                <div class="flex items-center justify-between mb-2">
                    <h2 class="text-xl font-black text-slate-100 font-mono tracking-tighter flex items-center gap-3">
                        TS Packet
                    </h2>
                    ${badge(pType, payloadBadgeColor, true)}
                </div>
                
                <div class="flex items-center gap-4 text-xs font-mono text-slate-400 mb-4 pl-0.5">
                    <span>Offset: <span class="text-slate-100 font-bold">${packet.offset}</span></span>
                    <span>PID: <span class="text-blue-400 font-bold">${packet.pid}</span></span>
                </div>

                <!-- Flags Row -->
                <div class="flex gap-2">
                    ${badge(`CC ${packet.header.continuity_counter.value}`, 'text-main')}
                    ${packet.header.payload_unit_start_indicator.value
            ? badge('PUSI', 'color-success', true)
            : badge('PUSI', 'text-muted')}
                    ${packet.header.transport_scrambling_control.value !== 0
            ? badge(`SCRAMBLE ${packet.header.transport_scrambling_control.value}`, 'color-error', true)
            : badge('SCRAMBLE 0', 'text-muted')}
                </div>
            </div>

            <!-- Content Scroll Area -->
            <div class="grow overflow-y-auto custom-scrollbar p-5">
                ${renderHeaderTab(packet)}

                ${packet.adaptationField ? html`
                    <div class="mb-6 animate-fadeIn">
                        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            ${icons.settings} <span class="opacity-80">Adaptation Field</span>
                        </h3>
                        <div class="bg-slate-800/40 rounded-xl border border-slate-800 shadow-sm overflow-hidden ring-1 ring-white/5">
                            ${cardKV('Length', packet.adaptationField.length, 'text-slate-100', packet)}
                            ${packet.adaptationField.discontinuity_indicator?.value ? cardKV('Discontinuity', 'YES', 'text-amber-400 font-bold', packet) : ''}
                            ${packet.adaptationField.random_access_indicator?.value ? cardKV('Random Access', 'YES', 'text-emerald-400 font-bold', packet) : ''}
                            ${packet.adaptationField.pcr ? cardKV('PCR', packet.adaptationField.pcr.value, 'text-blue-400 font-bold font-mono', packet) : ''}
                        </div>
                    </div>
                ` : ''}

                ${packet.psi || packet.pes || packet.videoDetails ? html`
                    <div class="animate-fadeIn">
                        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            ${icons.layers} <span class="opacity-80">Payload Data</span>
                        </h3>
                        <div class="bg-slate-800/40 rounded-xl border border-slate-800 shadow-sm overflow-hidden ring-1 ring-white/5 p-1">
                             ${packet.psi ? renderPsiContent(packet) : ''}
                             ${packet.pes ? renderDeepObject(packet.pes, packet) : ''}
                             ${packet.videoDetails ? renderDeepObject(packet.videoDetails, packet) : ''}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
};
