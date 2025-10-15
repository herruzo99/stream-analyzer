import { html } from 'lit-html';
import { isoBoxTreeTemplate } from '@/ui/shared/isobmff-renderer';

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

const semanticCard = (title, box, fields, flags) => {
    if (!box) return '';

    const activeFlags = flags
        ? Object.entries(flags)
              .filter(([, value]) => value === true)
              .map(([key]) => key)
              .join(', ')
        : null;

    return html`
        <div class="bg-gray-900/50 border border-gray-700 rounded-lg">
            <h4
                class="text-sm font-semibold p-2 border-b border-gray-700 text-gray-300"
            >
                ${title}
            </h4>
            <dl class="grid grid-cols-[auto_1fr] gap-x-2 p-2 text-xs font-mono">
                ${fields.map((field) => {
                    const value = box.details[field.key]?.value;
                    return value !== undefined
                        ? html`
                              <dt class="text-gray-400">${field.label}:</dt>
                              <dd class="text-white break-all">${value}</dd>
                          `
                        : '';
                })}
                ${activeFlags
                    ? html`
                          <dt
                              class="text-gray-400 col-span-2 pt-1 mt-1 border-t border-gray-700"
                          >
                              Active Flags:
                          </dt>
                          <dd
                              class="text-white break-all col-span-2 text-green-400"
                          >
                              ${activeFlags}
                          </dd>
                      `
                    : ''}
            </dl>
        </div>
    `;
};

const semanticSummaryTemplate = (boxes) => {
    const isInitSegment = !!findBoxRecursive(boxes, (b) => b.type === 'moov');
    const isMediaSegment = !!findBoxRecursive(boxes, (b) => b.type === 'moof');

    if (isInitSegment) {
        const tkhd = findBoxRecursive(boxes, (b) => b.type === 'tkhd');
        const mdhd = findBoxRecursive(boxes, (b) => b.type === 'mdhd');
        const trex = findBoxRecursive(boxes, (b) => b.type === 'trex');
        const elst = findBoxRecursive(boxes, (b) => b.type === 'elst');

        return html`
            <h3 class="text-xl font-bold mb-4">
                Initialization Segment Summary
            </h3>
            <div
                class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(300px,1fr))] mb-6"
            >
                ${semanticCard(
                    'Track Header (tkhd)',
                    tkhd,
                    [
                        { key: 'track_ID', label: 'Track ID' },
                        { key: 'duration', label: 'Duration' },
                        { key: 'width', label: 'Width' },
                        { key: 'height', label: 'Height' },
                    ],
                    tkhd?.details.flags?.value
                )}
                ${semanticCard('Media Header (mdhd)', mdhd, [
                    { key: 'timescale', label: 'Timescale' },
                    { key: 'duration', label: 'Duration' },
                    { key: 'language', label: 'Language' },
                ])}
                ${semanticCard('Track Extends (trex)', trex, [
                    { key: 'track_ID', label: 'Track ID' },
                    {
                        key: 'default_sample_duration',
                        label: 'Default Duration',
                    },
                    { key: 'default_sample_size', label: 'Default Size' },
                ])}
                ${semanticCard('Edit List (elst)', elst, [
                    { key: 'entry_count', label: 'Entry Count' },
                    {
                        key: 'entry_1_media_time',
                        label: 'Media Time (Entry 1)',
                    },
                ])}
            </div>
        `;
    }

    if (isMediaSegment) {
        const mfhd = findBoxRecursive(boxes, (b) => b.type === 'mfhd');
        const tfhd = findBoxRecursive(boxes, (b) => b.type === 'tfhd');
        const tfdt = findBoxRecursive(boxes, (b) => b.type === 'tfdt');
        const trun = findBoxRecursive(boxes, (b) => b.type === 'trun');

        return html`
            <h3 class="text-xl font-bold mb-4">Media Segment Summary</h3>
            <div
                class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(300px,1fr))] mb-6"
            >
                ${semanticCard('Movie Fragment Header (mfhd)', mfhd, [
                    { key: 'sequence_number', label: 'Sequence Number' },
                ])}
                ${semanticCard(
                    'Track Fragment Header (tfhd)',
                    tfhd,
                    [
                        { key: 'track_ID', label: 'Track ID' },
                        { key: 'base_data_offset', label: 'Base Data Offset' },
                        {
                            key: 'default_sample_duration',
                            label: 'Default Duration',
                        },
                    ],
                    tfhd?.details.flags?.value
                )}
                ${semanticCard('Track Fragment Decode Time (tfdt)', tfdt, [
                    {
                        key: 'baseMediaDecodeTime',
                        label: 'Base Media Decode Time',
                    },
                ])}
                ${semanticCard(
                    'Track Run (trun)',
                    trun,
                    [
                        { key: 'sample_count', label: 'Sample Count' },
                        { key: 'data_offset', label: 'Data Offset' },
                    ],
                    trun?.details.flags?.value
                )}
            </div>
        `;
    }

    return html`<h3 class="text-xl font-bold mb-4">Semantic Summary</h3>
        <p class="text-sm text-gray-400">
            Could not identify segment type (Init or Media).
        </p>`;
};

const formatEncryptionInfo = (encryption) => {
    if (!encryption) return 'No';
    const iv = encryption.iv
        ? Array.from(encryption.iv)
              .map((b) => b.toString(16).padStart(2, '0'))
              .join('')
        : 'N/A';
    const subsampleText =
        encryption.subsamples && encryption.subsamples.length > 0
            ? encryption.subsamples
                  .map(
                      (s) =>
                          `[C:${s.BytesOfClearData},P:${s.BytesOfProtectedData}]`
                  )
                  .join(' ')
            : 'None';
    return html`IV: ${iv}<br />Subsamples: ${subsampleText}`;
};

const samplesTableTemplate = (samples) => {
    if (!samples || samples.length === 0) return '';

    const renderDependsOn = (value) => {
        switch (value) {
            case 'Does not depend on others (I-frame)':
                return html`<span class="text-green-400">${value}</span>`;
            case 'Depends on others':
                return html`<span class="text-yellow-400">${value}</span>`;
            default:
                return value;
        }
    };

    return html`
        <div
            class="mt-1 overflow-y-auto max-h-96 border border-gray-700 rounded-md"
        >
            <table class="w-full text-left text-xs">
                <thead class="bg-gray-800 sticky top-0">
                    <tr>
                        <th class="p-2">#</th>
                        <th class="p-2">Offset</th>
                        <th class="p-2">Size</th>
                        <th class="p-2">Depends On</th>
                        <th class="p-2">Priority</th>
                        <th class="p-2">Group</th>
                        <th class="p-2">Encryption</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-700">
                    ${samples.map(
                        (sample) => html`
                            <tr class="hover:bg-gray-700/50">
                                <td class="p-2">${sample.index}</td>
                                <td class="p-2 font-mono">${sample.offset}</td>
                                <td class="p-2 font-mono">${sample.size}</td>
                                <td class="p-2 font-mono">
                                    ${renderDependsOn(sample.dependsOn)}
                                </td>
                                <td class="p-2 font-mono">
                                    ${sample.degradationPriority ?? 'N/A'}
                                </td>
                                <td class="p-2 font-mono">
                                    ${sample.sampleGroup ?? 'N/A'}
                                </td>
                                <td class="p-2 font-mono">
                                    ${formatEncryptionInfo(sample.encryption)}
                                </td>
                            </tr>
                        `
                    )}
                </tbody>
            </table>
        </div>
    `;
};

export const isobmffAnalysisTemplate = (parsedData) => {
    const { data: isobmffData, samples } = parsedData;

    return html`
        <div class="space-y-8">
            <div>${semanticSummaryTemplate(isobmffData.boxes)}</div>

            ${samples && samples.length > 0
                ? html` <div>
                      <h3 class="text-xl font-bold mb-4">
                          Sample-level Analysis
                      </h3>
                      ${samplesTableTemplate(samples)}
                  </div>`
                : ''}

            <div>
                <h3 class="text-xl font-bold mb-4 mt-8">Full Box Tree</h3>
                <ul class="list-none p-0 space-y-2">
                    ${isobmffData.boxes.map(
                        (box) => html`<li>${isoBoxTreeTemplate(box)}</li>`
                    )}
                </ul>
            </div>
        </div>
    `;
};
