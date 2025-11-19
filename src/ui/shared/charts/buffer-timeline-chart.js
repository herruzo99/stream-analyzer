import { useAnalysisStore } from '@/state/analysisStore';
import { formatBitrate } from '../format';

export const bufferTimelineChartOptions = (videoEl, eventLog, abrHistory) => {
    if (!videoEl) {
        return {};
    }

    const { buffered, duration, currentTime, seekable } = videoEl;
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);

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

    if (!isFinite(displayDuration) || displayDuration <= 0) {
        return {};
    }

    const bufferData = [];
    for (let i = 0; i < buffered.length; i++) {
        bufferData.push({
            name: 'Buffered',
            value: [
                0,
                buffered.start(i),
                buffered.end(i),
                buffered.end(i) - buffered.start(i),
            ],
        });
    }

    const adAvailMarkAreas = (stream?.adAvails || []).map((avail) => [
        {
            name: `Ad Avail: ${avail.id}`,
            itemStyle: { color: 'rgba(168, 85, 247, 0.5)' },
            xAxis: avail.startTime,
        },
        { xAxis: avail.startTime + avail.duration },
    ]);

    const abrEvents = (abrHistory || []).map((entry) => ({
        time: entry.time,
        type: 'abr',
        tooltip: `<b>ABR Switch</b><br/>Time: ${entry.time.toFixed(
            2
        )}s<br/>Quality: ${entry.height}p @ ${formatBitrate(entry.bitrate)}`,
    }));

    const bufferingEvents = (eventLog || [])
        .filter((e) => e.type === 'buffering' && e.details.includes('started'))
        .map((event) => {
            const timeMatch = event.details.match(/at (\d+\.\d+)s/);
            const eventTime = timeMatch ? parseFloat(timeMatch[1]) : 0;
            if (eventTime === 0) return null;

            return {
                time: eventTime,
                type: 'buffering',
                tooltip: `<b>Rebuffering Event</b><br/>Time: ${eventTime.toFixed(
                    2
                )}s`,
            };
        })
        .filter(Boolean);

    const allEvents = [...abrEvents, ...bufferingEvents];

    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow',
            },
            formatter: (params) => {
                if (
                    !params ||
                    params.length === 0 ||
                    params[0].axisValue === undefined ||
                    typeof params[0].axisValue !== 'number'
                ) {
                    return '';
                }
                const hoverTime = params[0].axisValue;

                const timeRemaining = timeOffset + displayDuration - hoverTime;

                let bufferStart = 0,
                    bufferEnd = 0,
                    bufferRemaining = 0;
                for (let i = 0; i < buffered.length; i++) {
                    if (
                        hoverTime >= buffered.start(i) &&
                        hoverTime <= buffered.end(i)
                    ) {
                        bufferStart = buffered.start(i);
                        bufferEnd = buffered.end(i);
                        bufferRemaining = bufferEnd - hoverTime;
                        break;
                    }
                }

                return `
                    <div class="echarts-timeline-tooltip">
                        <b>Time:</b> ${hoverTime.toFixed(2)}s<br/>
                        <b>Remaining:</b> ${timeRemaining.toFixed(2)}s<br/>
                        <b>Buffer Ahead:</b> ${bufferRemaining.toFixed(2)}s<br/>
                        <span style="color: #9ca3af;">Buffer Range: ${bufferStart.toFixed(
                            2
                        )}s - ${bufferEnd.toFixed(2)}s</span>
                    </div>
                `;
            },
        },
        grid: { top: 0, bottom: 0, left: 0, right: 0 },
        xAxis: {
            min: timeOffset,
            max: timeOffset + displayDuration,
            show: false,
            type: 'value',
        },
        yAxis: { show: false, type: 'category', data: ['timeline'] },
        series: [
            {
                name: 'Timeline Background',
                type: 'custom',
                renderItem: (params, api) => ({
                    type: 'rect',
                    shape: {
                        x: api.coord([api.value(1), 0])[0],
                        y: api.coord([0, 0])[1] - api.size([0, 1])[1] * 0.4,
                        width:
                            api.coord([api.value(2), 0])[0] -
                            api.coord([api.value(1), 0])[0],
                        height: api.size([0, 1])[1] * 0.8,
                    },
                    style: { fill: '#0f172a' },
                }),
                data: [[0, timeOffset, timeOffset + displayDuration]],
                silent: true,
            },
            {
                name: 'Buffered',
                type: 'custom',
                renderItem: (params, api) => ({
                    type: 'rect',
                    shape: {
                        x: api.coord([api.value(1), 0])[0],
                        y: api.coord([0, 0])[1] - api.size([0, 1])[1] * 0.4,
                        width:
                            api.coord([api.value(2), 0])[0] -
                            api.coord([api.value(1), 0])[0],
                        height: api.size([0, 1])[1] * 0.8,
                    },
                    style: { fill: '#3b82f6' },
                }),
                data: bufferData,
                markArea: { data: adAvailMarkAreas, silent: true },
            },
            {
                name: 'Playhead',
                type: 'line',
                data: [],
                markLine: {
                    data: [{ xAxis: currentTime }],
                    symbol: 'none',
                    lineStyle: { color: '#f87171', width: 2 },
                    label: { show: false },
                    animation: false,
                    silent: true,
                },
            },
            {
                name: 'Events',
                type: 'custom',
                renderItem: (params, api) => {
                    const event = allEvents[params.dataIndex];
                    const pos = api.coord([event.time, 0]);
                    let symbol;
                    if (event.type === 'abr') {
                        symbol = {
                            type: 'path',
                            shape: {
                                path: 'M -6 -4 L 6 -4 L 0 6 z',
                                x: pos[0],
                                y: pos[1] + 4,
                            },
                            style: { fill: '#f59e0b' },
                        };
                    } else {
                        // buffering
                        symbol = {
                            type: 'circle',
                            shape: { cx: pos[0], cy: pos[1], r: 5 },
                            style: { fill: '#ef4444' },
                        };
                    }
                    return symbol;
                },
                data: allEvents,
                tooltip: {
                    position: 'top',
                    formatter: (params) =>
                        `<div class="echarts-timeline-tooltip">${allEvents[params.dataIndex].tooltip}</div>`,
                },
                z: 10,
            },
        ],
    };
};
