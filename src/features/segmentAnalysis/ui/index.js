import { html } from 'lit-html';
import { isobmffAnalysisTemplate } from './isobmff-analysis.js';
import { tsAnalysisTemplate } from './ts-analysis.js';
import { vttAnalysisTemplate } from './vtt-analysis.js';

// --- UTILITY ---
function diffObjects(obj1, obj2) {
    const result = [];
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
    for (const key of allKeys) {
        const val1 = obj1[key];
        const val2 = obj2[key];
        const isDifferent = JSON.stringify(val1) !== JSON.stringify(val2);
        result.push({
            key,
            val1: val1 !== undefined ? val1 : '---',
            val2: val2 !== undefined ? val2 : '---',
            isDifferent,
        });
    }
    return result;
}

// --- TEMPLATES (COMPARISON) ---
const segmentCompareTemplate = (analysisA, analysisB) => {
    // This comparison is high-level and format-agnostic, so it can remain here.
    // A more detailed comparison would require protocol-specific logic.
    if (!analysisA.data.summary || !analysisB.data.summary) {
        return html`<p class="fail">
            Cannot compare segments; summary data is missing.
        </p>`;
    }
    const diff = diffObjects(analysisA.data.summary, analysisB.data.summary);
    return html`
        <div class="grid grid-cols-[1fr_2fr_2fr] text-xs">
            <div
                class="font-semibold p-2 border-b border-r border-gray-700 bg-gray-900/50"
            >
                Property
            </div>
            <div
                class="font-semibold p-2 border-b border-r border-gray-700 bg-gray-900/50"
            >
                Segment A
            </div>
            <div
                class="font-semibold p-2 border-b border-r border-gray-700 bg-gray-900/50"
            >
                Segment B
            </div>
            ${diff.map(
                (item) => html`
                    <div
                        class="p-2 border-b border-r border-gray-700 font-medium text-gray-400"
                    >
                        ${item.key}
                    </div>
                    <div
                        class="p-2 border-b border-r border-gray-700 font-mono ${item.isDifferent
                            ? 'bg-red-900/50 text-red-300'
                            : ''}"
                    >
                        ${item.val1}
                    </div>
                    <div
                        class="p-2 border-b border-r border-gray-700 font-mono ${item.isDifferent
                            ? 'bg-red-900/50 text-red-300'
                            : ''}"
                    >
                        ${item.val2}
                    </div>
                `
            )}
        </div>
    `;
};

// --- DISPATCHER ---
export function getSegmentAnalysisTemplate(parsedData, parsedDataB = null) {
    if (parsedData?.error) {
        return html`<p class="text-red-400 p-4">
            Segment could not be parsed:
            <span class="block font-mono bg-gray-900 p-2 mt-2 rounded"
                >${parsedData.error}</span
            >
        </p>`;
    }

    if (!parsedData) {
        return html`<p class="text-gray-400 p-4">
            Segment data not available or is currently loading.
        </p>`;
    }

    if (parsedDataB) {
        return segmentCompareTemplate(parsedData, parsedDataB);
    }

    const format = parsedData.format;
    const isSupported =
        format === 'isobmff' ||
        format === 'ts' ||
        format === 'vtt' ||
        format === 'aac';

    const icon = isSupported
        ? html`<svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
          >
              <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
          </svg>`
        : html`<svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
          >
              <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
          </svg>`;

    const formatText =
        {
            isobmff: 'ISO Base Media File Format',
            ts: 'MPEG-2 Transport Stream',
            vtt: 'Web Video Text Tracks (WebVTT)',
            aac: 'Advanced Audio Coding (Raw)',
        }[format] || 'Unknown Format';

    let contentTemplate;
    switch (format) {
        case 'isobmff':
            contentTemplate = isobmffAnalysisTemplate(parsedData);
            break;
        case 'ts':
            contentTemplate = tsAnalysisTemplate(parsedData);
            break;
        case 'vtt':
            contentTemplate = vttAnalysisTemplate(parsedData.data);
            break;
        case 'aac':
            contentTemplate = html`<div
                class="bg-gray-900 p-4 rounded-lg text-center text-sm"
            >
                <p class="text-gray-300">
                    This segment is a raw AAC elementary stream.
                </p>
                <p class="text-gray-400 mt-2">
                    Deep structural analysis is not available for this format.
                    Use the "View Raw" button in the Segment Explorer to inspect
                    the segment's byte-level data.
                </p>
            </div>`;
            break;
        default:
            contentTemplate = html`<p class="fail">
                Analysis view for format '${format}' is not supported.
            </p>`;
            break;
    }

    return html`
        <div
            class="flex items-center gap-2 mb-4 p-2 bg-gray-900/50 rounded-md border border-gray-700"
        >
            ${icon}
            <span class="font-semibold text-gray-300"
                >Format: ${formatText}</span
            >
        </div>
        ${contentTemplate}
    `;
}
