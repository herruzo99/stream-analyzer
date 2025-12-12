import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const labelVal = (label, value) => html`
    <div
        class="flex justify-between py-1 border-b border-slate-700/50 last:border-0"
    >
        <span class="text-slate-500 font-medium">${label}</span>
        <span
            class="text-slate-200 font-mono text-right truncate max-w-[150px]"
            title="${value}"
            >${value}</span
        >
    </div>
`;

export const scte35DetailsTemplate = (scte35) => {
    if (!scte35 || scte35.error) {
        const errorMsg = scte35?.error || 'Unknown Error';
        
        // --- Special Handling for Heuristic Detections ---
        // If the "error" is actually an informational message about structural detection
        // (which means no binary SCTE-35 payload existed to parse), show an Info box instead of Error.
        const isStructural = errorMsg.includes('Structurally detected') || errorMsg.includes('Signaled via EXT-X-CUE');
        
        const boxClass = isStructural 
            ? 'bg-blue-900/10 border-blue-500/30 text-blue-300'
            : 'bg-red-900/10 border-red-500/30 text-red-400';
            
        const icon = isStructural ? icons.info : icons.alertTriangle;
        const title = isStructural ? 'Inferred Ad Break' : 'Parsing Failed';

        return html`
            <div class="p-4 rounded-lg border text-center ${boxClass}">
                <div class="flex items-center justify-center gap-2 mb-2 font-bold text-sm">
                    <span class="scale-110">${icon}</span> ${title}
                </div>
                <div class="text-xs opacity-90">${errorMsg}</div>
                ${isStructural ? html`<div class="text-[10px] mt-2 opacity-70">This break was detected via playlist tags or discontinuities, not an in-band SCTE-35 binary packet.</div>` : ''}
            </div>
        `;
    }

    const cmd = scte35.splice_command;
    const descriptors = scte35.descriptors || [];
    const crcIcon = scte35.crc_valid ? icons.checkCircle : icons.xCircle;
    const crcColor = scte35.crc_valid ? 'text-green-400' : 'text-red-400';
    const crcValue = (scte35.crc_32 ?? 0).toString(16).padStart(8, '0');

    return html`
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
            <!-- Header Info -->
            <div
                class="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm"
            >
                <h4
                    class="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3"
                >
                    Splice Info Section
                </h4>
                ${labelVal('Command Type', scte35.splice_command_type)}
                ${labelVal('PTS Adjustment', scte35.pts_adjustment)}
                ${labelVal('Protocol Version', scte35.protocol_version)}

                <div
                    class="flex justify-between py-1 border-b border-slate-700/50 last:border-0"
                >
                    <span class="text-slate-500 font-medium">CRC32</span>
                    <span class="text-right flex items-center gap-2">
                        <span class="text-slate-400 font-mono"
                            >0x${crcValue}</span
                        >
                        <span
                            class="${crcColor}"
                            title="${scte35.crc_valid ? 'Valid' : 'Invalid'}"
                            >${crcIcon}</span
                        >
                    </span>
                </div>

                <div class="mt-3 pt-2 border-t border-slate-700/50">
                    <span
                        class="text-[10px] font-bold text-slate-500 uppercase mb-2 block"
                        >Encryption / SAP</span
                    >
                    ${labelVal(
                        'Encrypted',
                        scte35.encrypted_packet ? 'Yes' : 'No'
                    )}
                    ${scte35.encrypted_packet
                        ? labelVal('Algorithm', scte35.encryption_algorithm)
                        : ''}
                    ${labelVal('CW Index', scte35.cw_index)}
                    ${labelVal('Tier', `0x${(scte35.tier || 0).toString(16)}`)}
                </div>
            </div>

            <!-- Command Details -->
            <div
                class="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm"
            >
                <h4
                    class="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3"
                >
                    ${cmd.type}
                </h4>
                ${cmd.splice_event_id !== undefined
                    ? labelVal('Event ID', cmd.splice_event_id)
                    : ''}
                ${cmd.out_of_network_indicator !== undefined
                    ? labelVal(
                          'Out of Network',
                          cmd.out_of_network_indicator ? 'Yes' : 'No'
                      )
                    : ''}
                ${cmd.splice_immediate_flag !== undefined
                    ? labelVal(
                          'Splice Immediate',
                          cmd.splice_immediate_flag ? 'Yes' : 'No'
                      )
                    : ''}
                ${cmd.break_duration
                    ? labelVal(
                          'Duration',
                          `${(cmd.break_duration.duration / 90000).toFixed(2)}s`
                      )
                    : ''}
                ${cmd.break_duration
                    ? labelVal(
                          'Auto Return',
                          cmd.break_duration.auto_return ? 'Yes' : 'No'
                      )
                    : ''}
                ${cmd.splice_time?.pts_time
                    ? labelVal('Splice Time (PTS)', cmd.splice_time.pts_time)
                    : ''}
                ${cmd.unique_program_id
                    ? labelVal('Program ID', cmd.unique_program_id)
                    : ''}
                ${cmd.avail_num !== undefined &&
                cmd.avails_expected !== undefined
                    ? labelVal(
                          'Avail Index',
                          `${cmd.avail_num} / ${cmd.avails_expected}`
                      )
                    : ''}
            </div>

            <!-- Descriptors -->
            ${descriptors.length > 0
                ? html`
                      <div
                          class="col-span-1 lg:col-span-2 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm"
                      >
                          <h4
                              class="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3"
                          >
                              Descriptors (${descriptors.length})
                          </h4>
                          <div class="space-y-4">
                              ${descriptors.map(
                                  (d) => html`
                                      <div
                                          class="bg-slate-900/50 p-3 rounded border border-slate-700/50"
                                      >
                                          <div
                                              class="font-bold text-slate-300 mb-2"
                                          >
                                              ${d.segmentation_type_id ||
                                              'Unknown Type'}
                                          </div>
                                          <div
                                              class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1"
                                          >
                                              ${d.segmentation_event_id
                                                  ? labelVal(
                                                        'Event ID',
                                                        d.segmentation_event_id
                                                    )
                                                  : ''}
                                              ${d.segmentation_upid
                                                  ? labelVal(
                                                        'UPID',
                                                        d.segmentation_upid
                                                    )
                                                  : ''}
                                              ${d.segmentation_duration
                                                  ? labelVal(
                                                        'Duration',
                                                        `${(d.segmentation_duration / 90000).toFixed(2)}s`
                                                    )
                                                  : ''}
                                              ${labelVal(
                                                  'Segment',
                                                  `${d.segment_num} of ${d.segments_expected}`
                                              )}
                                          </div>
                                      </div>
                                  `
                              )}
                          </div>
                      </div>
                  `
                : ''}
        </div>
    `;
};