import { html } from 'lit-html';
import { isoBoxTreeTemplate } from '@/ui/shared/isobmff-renderer';

const findBoxRecursive = (boxes, predicateOrType) => {
    // This is the definitive fix. We check the type of the argument.
    // If it's a function, we use it as the predicate.
    // If it's a string, we create a new predicate to compare the box type.
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

const semanticCard = (title, box, fields) => {
    if (!box) return '';
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
            </dl>
        </div>
    `;
};

const semanticSummaryTemplate = (boxes) => {
    const isInitSegment = !!findBoxRecursive(boxes, 'moov');
    const isMediaSegment = !!findBoxRecursive(boxes, 'moof');

    if (isInitSegment) {
        const tkhd = findBoxRecursive(boxes, 'tkhd');
        const mdhd = findBoxRecursive(boxes, 'mdhd');
        const trex = findBoxRecursive(boxes, 'trex');
        const elst = findBoxRecursive(boxes, 'elst');

        return html`
            <h3 class="text-xl font-bold mb-4">
                Initialization Segment Summary
            </h3>
            <div
                class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(300px,1fr))] mb-6"
            >
                ${semanticCard('Track Header (tkhd)', tkhd, [
                    { key: 'track_ID', label: 'Track ID' },
                    { key: 'duration', label: 'Duration' },
                    { key: 'width', label: 'Width' },
                    { key: 'height', label: 'Height' },
                ])}
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
        const mfhd = findBoxRecursive(boxes, 'mfhd');
        const tfhd = findBoxRecursive(boxes, 'tfhd');
        const tfdt = findBoxRecursive(boxes, 'tfdt');
        const trun = findBoxRecursive(boxes, 'trun');

        return html`
            <h3 class="text-xl font-bold mb-4">Media Segment Summary</h3>
            <div
                class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(300px,1fr))] mb-6"
            >
                ${semanticCard('Movie Fragment Header (mfhd)', mfhd, [
                    { key: 'sequence_number', label: 'Sequence Number' },
                ])}
                ${semanticCard('Track Fragment Header (tfhd)', tfhd, [
                    { key: 'track_ID', label: 'Track ID' },
                    { key: 'flags', label: 'Flags' },
                    { key: 'base_data_offset', label: 'Base Data Offset' },
                    {
                        key: 'default_sample_duration',
                        label: 'Default Duration',
                    },
                ])}
                ${semanticCard('Track Fragment Decode Time (tfdt)', tfdt, [
                    {
                        key: 'baseMediaDecodeTime',
                        label: 'Base Media Decode Time',
                    },
                ])}
                ${semanticCard('Track Run (trun)', trun, [
                    { key: 'sample_count', label: 'Sample Count' },
                    { key: 'data_offset', label: 'Data Offset' },
                    { key: 'flags', label: 'Flags' },
                ])}
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
    const dependsOnMap = { 2: 'No (I-Frame)', 1: 'Yes', 0: 'Unknown' };

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
                                    ${dependsOnMap[sample.dependsOn] || 'N/A'}
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
