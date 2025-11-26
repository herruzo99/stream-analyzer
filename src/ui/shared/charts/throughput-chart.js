export const throughputChartOptions = (data) => {
    if (!data || data.length === 0) {
        return {
            title: {
                text: 'No throughput data to display.',
                left: 'center',
                top: 'center',
                textStyle: {
                    color: '#6b7280',
                },
            },
        };
    }

    const chartData = data.map((d) => [d.time, d.throughput]);

    return {
        tooltip: {
            trigger: 'axis',
            formatter: (params) => {
                const time = params[0].value[0].toFixed(2);
                const throughput = (params[0].value[1] / 1000000).toFixed(2);
                return `Time: ${time}s<br/>Throughput: ${throughput} Mbps`;
            },
        },
        grid: { top: 30, bottom: 0, left: 60, right: 20 },
        xAxis: {
            type: 'value',
            name: 'Time (s)',
            nameTextStyle: { color: '#9ca3af' },
            axisLine: { lineStyle: { color: '#4b5563' } },
        },
        yAxis: {
            type: 'value',
            nameTextStyle: { color: '#9ca3af' },
            axisLine: { lineStyle: { color: '#4b5563' } },
            axisLabel: {
                formatter: (value) => `${(value / 1000000).toFixed(1)} Mbps`,
            },
            splitLine: { lineStyle: { color: '#374151' } },
        },
        series: [
            {
                type: 'line',
                smooth: true,
                showSymbol: false,
                data: chartData,
                lineStyle: { color: '#2563EB' },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            {
                                offset: 0,
                                color: 'rgba(37, 99, 235, 0.5)',
                            },
                            {
                                offset: 1,
                                color: 'rgba(37, 99, 235, 0)',
                            },
                        ],
                    },
                },
            },
        ],
    };
};
