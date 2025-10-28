export const throughputChartOptions = (data) => {
    if (!data || data.length === 0) {
        return {
            title: {
                text: 'No throughput data to display.',
                left: 'center',
                top: 'center',
                textStyle: {
                    color: '#6b7280'
                }
            }
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
        grid: { top: 30, bottom: 60, left: 60, right: 20 },
        xAxis: {
            type: 'value',
            name: 'Time (s)',
            nameTextStyle: { color: '#9ca3af' },
            axisLine: { lineStyle: { color: '#4b5563' } },
        },
        yAxis: {
            type: 'value',
            name: 'Throughput',
            nameTextStyle: { color: '#9ca3af' },
            axisLine: { lineStyle: { color: '#4b5563' } },
            axisLabel: {
                formatter: (value) => `${(value / 1000000).toFixed(1)} Mbps`,
            },
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
                name: 'Throughput',
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