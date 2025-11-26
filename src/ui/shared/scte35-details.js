import { html } from 'lit-html';

const labelVal = (label, value) => html`
    <div
        class="flex justify-between py-1 border-b border-slate-700/50 last:border-0"
    >
        <span class="text-slate-500 font-medium">${label}</span>
        <span class="text-slate-200 font-mono text-right">${value}</span>
    </div>
`;

export const scte35DetailsTemplate = (scte35) => {
    if (!scte35 || scte35.error) {
        return html`<div
            class="p-4 text-red-400 bg-red-900/10 rounded-lg border border-red-500/30 text-center"
        >
            Parsing Failed: ${scte35?.error || 'Unknown Error'}
        </div>`;
    }

    const cmd = scte35.splice_command;
    const descriptors = scte35.descriptors || [];

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
                ${labelVal('Tier', `0x${scte35.tier.toString(16)}`)}
                ${labelVal('CW Index', scte35.cw_index)}
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
                ${cmd.break_duration
                    ? labelVal(
                          'Duration',
                          `${(cmd.break_duration.duration / 90000).toFixed(2)}s`
                      )
                    : ''}
                ${cmd.splice_time?.pts_time
                    ? labelVal('Splice Time', cmd.splice_time.pts_time)
                    : ''}
                ${cmd.unique_program_id
                    ? labelVal('Program ID', cmd.unique_program_id)
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
