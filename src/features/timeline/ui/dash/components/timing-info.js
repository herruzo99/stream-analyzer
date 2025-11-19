import { html } from 'lit-html';

/**
 * Renders a single, compact metric for the timing grid.
 * @param {object} metric - The metric object to render.
 * @returns {import('lit-html').TemplateResult | string}
 */
const metricTemplate = (metric) => {
    if (
        metric.value === 'N/A' ||
        metric.value === null ||
        metric.value === undefined
    )
        return '';
    return html`
        <div
            class="flex items-baseline justify-between gap-2 bg-slate-950/50 px-2 py-1 rounded border border-slate-700/50"
        >
            <dt
                class="text-xs text-slate-400 font-semibold truncate"
                title=${metric.name}
            >
                ${metric.name}
            </dt>
            <dd
                class="text-xs font-mono text-white truncate"
                title=${String(metric.value)}
            >
                ${metric.value}
            </dd>
        </div>
    `;
};

const segmentTemplateMetrics = (segmentInfo) => {
    const metrics = [
        { name: 'Timescale', value: segmentInfo.timescale },
        { name: 'Duration (units)', value: segmentInfo.duration },
        { name: 'Duration (sec)', value: segmentInfo.calculatedDuration },
        { name: 'Start Number', value: segmentInfo.startNumber },
        { name: 'Pres. Time Offset', value: segmentInfo.pto },
        { name: 'Avail. Time Offset', value: segmentInfo.ato },
        {
            name: 'Uses Timeline',
            value: segmentInfo.usesTimeline ? 'Yes' : 'No',
        },
    ];

    return html`
        <dl class="grid gap-2 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
            ${metrics.map(metricTemplate)}
        </dl>
    `;
};

const segmentListMetrics = (segmentInfo) => {
    const metrics = [
        { name: 'Timescale', value: segmentInfo.timescale },
        { name: 'Duration (units)', value: segmentInfo.duration },
        { name: 'Total Segments', value: segmentInfo.segmentURLs?.length || 0 },
        {
            name: 'Init URL',
            value: segmentInfo.initialization?.url || 'N/A',
        },
        {
            name: 'Init Range',
            value: segmentInfo.initialization?.range || 'N/A',
        },
    ];

    return html`
        <dl class="grid gap-2 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            ${metrics.map(metricTemplate)}
        </dl>
    `;
};

const segmentBaseMetrics = (segmentInfo) => {
    const metrics = [
        { name: 'Timescale', value: segmentInfo.timescale },
        {
            name: 'Inferred Duration',
            value: segmentInfo.inferredDuration
                ? `${segmentInfo.inferredDuration.toFixed(3)}s`
                : 'N/A',
        },
        { name: 'Index Range', value: segmentInfo.indexRange || 'N/A' },
        {
            name: 'Init Range',
            value: segmentInfo.initialization?.range || 'N/A',
        },
    ];

    return html`
        <dl class="grid gap-2 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            ${metrics.map(metricTemplate)}
        </dl>
    `;
};

const baseUrlMetrics = (segmentInfo) => {
    const metrics = [
        {
            name: 'Inferred Duration',
            value: segmentInfo.inferredDuration
                ? `${segmentInfo.inferredDuration.toFixed(3)}s`
                : 'N/A',
        },
    ];
    return html`
        <dl class="grid gap-2 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            ${metrics.map(metricTemplate)}
        </dl>
    `;
};

export const timingInfoTemplate = (segmentInfo) => {
    switch (segmentInfo.type) {
        case 'SegmentTemplate':
            return segmentTemplateMetrics(segmentInfo);
        case 'SegmentList':
            return segmentListMetrics(segmentInfo);
        case 'SegmentBase':
            return segmentBaseMetrics(segmentInfo);
        case 'BaseURL':
            return baseUrlMetrics(segmentInfo);
        case 'unknown':
        default:
            return html``;
    }
};
