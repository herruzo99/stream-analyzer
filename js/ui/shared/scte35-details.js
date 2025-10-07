import { html } from 'lit-html';

const detailRow = (label, value) => {
    if (value === undefined || value === null) return '';
    return html`
        <dt class="text-gray-400 font-medium">${label}</dt>
        <dd class="text-white font-mono break-all">${value}</dd>
    `;
};

const commandDetailsTemplate = (command) => {
    if (!command) return '';
    switch (command.type) {
        case 'Splice Insert':
            return html`
                ${detailRow('Splice Event ID', command.splice_event_id)}
                ${detailRow(
                    'Out of Network',
                    command.out_of_network_indicator ? 'Yes' : 'No'
                )}
                ${detailRow(
                    'Program Splice',
                    command.program_splice_flag ? 'Yes' : 'No'
                )}
                ${detailRow(
                    'Immediate',
                    command.splice_immediate_flag ? 'Yes' : 'No'
                )}
                ${command.splice_time?.time_specified
                    ? detailRow(
                          'PTS Time',
                          `${command.splice_time.pts_time} (${
                              command.splice_time.pts_time / 90000
                          }s)`
                      )
                    : ''}
                ${command.break_duration?.auto_return
                    ? detailRow(
                          'Break Duration',
                          `${command.break_duration.duration} (${
                              command.break_duration.duration / 90000
                          }s)`
                      )
                    : ''}
                ${detailRow('Unique Program ID', command.unique_program_id)}
                ${detailRow('Avail Num', command.avail_num)}
                ${detailRow('Avails Expected', command.avails_expected)}
            `;
        case 'Time Signal':
            return html`
                ${command.splice_time?.time_specified
                    ? detailRow(
                          'PTS Time',
                          `${command.splice_time.pts_time} (${
                              command.splice_time.pts_time / 90000
                          }s)`
                      )
                    : detailRow('PTS Time', 'Not Specified')}
            `;
        default:
            return html`<p>Unsupported command type: ${command.type}</p>`;
    }
};

const descriptorDetailsTemplate = (descriptor) => {
    if (!descriptor) return '';
    return html`
        ${detailRow('Event ID', descriptor.segmentation_event_id)}
        ${detailRow('UPID Type', descriptor.segmentation_upid_type)}
        ${detailRow('UPID', descriptor.segmentation_upid)}
        ${detailRow('Type', descriptor.segmentation_type_id)}
        ${detailRow('Segment Num', descriptor.segment_num)}
        ${detailRow('Segments Expected', descriptor.segments_expected)}
        ${descriptor.segmentation_duration
            ? detailRow(
                  'Duration',
                  `${descriptor.segmentation_duration} (${
                      descriptor.segmentation_duration / 90000
                  }s)`
              )
            : ''}
    `;
};

export const scte35DetailsTemplate = (scte35) => {
    if (!scte35 || scte35.error) {
        return html`<p class="text-red-400">
            Failed to parse SCTE-35 message: ${scte35?.error || 'Unknown Error'}
        </p>`;
    }

    return html`
        <div class="space-y-4 text-xs">
            <div class="bg-gray-900 p-3 rounded-lg">
                <h4 class="font-bold text-gray-300 mb-2">
                    Splice Info Section
                </h4>
                <dl class="grid grid-cols-[auto_1fr] gap-x-4">
                    ${detailRow('Table ID', scte35.table_id)}
                    ${detailRow('Protocol Version', scte35.protocol_version)}
                    ${detailRow(
                        'PTS Adjustment',
                        `${scte35.pts_adjustment} (${
                            scte35.pts_adjustment / 90000
                        }s)`
                    )}
                    ${detailRow('CW Index', scte35.cw_index)}
                    ${detailRow('Tier', `0x${scte35.tier.toString(16)}`)}
                </dl>
            </div>

            <div class="bg-gray-900 p-3 rounded-lg">
                <h4 class="font-bold text-gray-300 mb-2">
                    ${scte35.splice_command?.type || 'Splice Command'}
                </h4>
                <dl class="grid grid-cols-[auto_1fr] gap-x-4">
                    ${commandDetailsTemplate(scte35.splice_command)}
                </dl>
            </div>

            ${(scte35.descriptors || []).map(
                (desc) => html`
                    <div class="bg-gray-900 p-3 rounded-lg">
                        <h4 class="font-bold text-gray-300 mb-2">
                            Segmentation Descriptor
                        </h4>
                        <dl class="grid grid-cols-[auto_1fr] gap-x-4">
                            ${descriptorDetailsTemplate(desc)}
                        </dl>
                    </div>
                `
            )}
        </div>
    `;
};
