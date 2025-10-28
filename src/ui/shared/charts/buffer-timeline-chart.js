import { usePlayerStore } from '@/state/playerStore';

export const bufferTimelineChartOptions = (videoEl, stream) => {
    if (!videoEl || !stream) {
        return {};
    }

    const { buffered, duration, currentTime, seekable } = videoEl;
    const { adAvails, events: manifestEvents } = stream.manifest;
    const { eventLog } =
        (typeof usePlayerStore !== 'undefined' &&
            usePlayerStore.getState()) ||
        {};

    let displayDuration = duration;
    let timeOffset = 0;

    if (
        (!isFinite(duration) || duration === 0) &&
        seekable &&
        seekable.length > 0
    ) {
        timeOffset = seekable.start(0);
        displayDuration = seekable.end(seekable.length - 1) - timeOffset;
    }

    if (!buffered || !isFinite(displayDuration) || displayDuration <= 0) {
        return {};
    }

    // --- Data Series ---
    const bufferData = [];
    for (let i = 0; i < buffered.length; i++) {
        bufferData.push({
            name: 'Buffered',
            value: [
                0, // All on the same y-axis category
                buffered.start(i),
                buffered.end(i),
                buffered.end(i) - buffered.start(i),
            ],
        });
    }

    // --- Markings ---
    const markAreas = [];
    const markLines = [
        {
            name: 'Playhead',
            xAxis: currentTime,
            lineStyle: { color: '#f87171', width: 2, type: 'solid' },
            label: { show: false },
        },
    ];

    (adAvails || []).forEach((avail) => {
        markAreas.push([
            {
                name: `Ad Avail: ${avail.id}`,
                itemStyle: { color: 'rgba(168, 85, 247, 0.5)' },
                xAxis: avail.startTime,
            },
            {
                xAxis: avail.startTime + avail.duration,
            },
        ]);
    });

    (eventLog || [])
        .filter((e) => e.type === 'buffering' && e.details.includes('started'))
        .forEach((event) => {
            const eventTime = parseFloat(
                event.details.match(/at (\d+\.\d+)s/)?.[1] || '0'
            );
            if (eventTime > 0) {
                markLines.push({
                    name: 'Buffering Event',
                    xAxis: eventTime,
                    lineStyle: { color: '#fbbf24', type: 'dotted', width: 2 },
                    label: { show: false },
                });
            }
        });

    return {
        tooltip: {
            trigger: 'item',
            // Tooltip is now handled by our global system via chart-renderer.js
            // This native formatter is a fallback.
            formatter: (params) => {
                if (
                    params.seriesName === 'Buffered' &&
                    Array.isArray(params.value)
                ) {
                    const [_, start, end, dur] = params.value;
                    return `<b>Buffered Range</b><br/>Start: ${start.toFixed(
                        2
                    )}s<br/>End: ${end.toFixed(
                        2
                    )}s<br/>Duration: ${dur.toFixed(2)}s`;
                }
                return '';
            },
        },
        grid: { top: 0, bottom: 0, left: 0, right: 0 },
        xAxis: {
            min: timeOffset,
            max: timeOffset + displayDuration,
            show: false,
            type: 'value',
        },
        yAxis: { show: false, type: 'category' },
        series: [
            {
                name: 'Buffered',
                type: 'custom',
                renderItem: (params, api) => {
                    const categoryIndex = api.value(0);
                    const start = api.coord([api.value(1), categoryIndex]);
                    const end = api.coord([api.value(2), categoryIndex]);
                    const height = api.size([0, 1])[1]; // Use full height
                    return {
                        type: 'rect',
                        shape: {
                            x: start[0],
                            y: api.coord([0, categoryIndex])[1] - height / 2,
                            width: end[0] - start[0],
                            height: height,
                        },
                        style: { fill: '#3b82f6' },
                    };
                },
                itemStyle: { opacity: 0.8 },
                encode: { x: [1, 2], y: 0 },
                data: bufferData,
                markArea: { data: markAreas, silent: false },
                markLine: {
                    data: markLines,
                    silent: false,
                    symbol: 'none',
                    animation: false,
                },
            },
        ],
    };
};