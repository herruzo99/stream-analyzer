export const bufferHealthChartOptions = (history, bufferingGoal) => {
    if (!history || history.length < 2) {
        return {};
    }

    const data = history.map((h) => [h.time, h.bufferHealth]);

    return {
        tooltip: {
            trigger: 'axis',
            formatter: (params) => {
                const time = params[0].value[0].toFixed(2);
                const buffer = params[0].value[1].toFixed(2);
                return `Time: ${time}s<br/>Buffer Health: ${buffer}s`;
            },
        },
        grid: { top: 30, bottom: 60, left: 50, right: 20 },
        xAxis: {
            type: 'value',
            name: 'Time (s)',
            nameTextStyle: { color: '#9ca3af' },
            axisLine: { lineStyle: { color: '#4b5563' } },
        },
        yAxis: {
            type: 'value',
            name: 'Buffer (s)',
            nameTextStyle: { color: '#9ca3af' },
            axisLine: { lineStyle: { color: '#4b5563' } },
            splitLine: { lineStyle: { color: '#374151' } },
        },
        dataZoom: [
            {
                type: 'slider',
                start: 0,
                end: 100,
                bottom: 10,
                height: 20,
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderColor: '#555',
                handleIcon:
                    'M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
                handleSize: '80%',
            },
        ],
        series: [
            {
                name: 'Buffer Health',
                type: 'line',
                smooth: true,
                showSymbol: false,
                data: data,
                lineStyle: { color: '#3b82f6' },
                markLine: {
                    silent: true,
                    data: [
                        {
                            yAxis: bufferingGoal,
                            name: 'Buffering Goal',
                            lineStyle: { color: '#22c55e', type: 'dashed' },
                            label: {
                                position: 'insideEndTop',
                                color: '#22c55e',
                            },
                        },
                    ],
                },
            },
        ],
    };
};
