export const abrHistoryChartOptions = (history) => {
    if (!history || history.length < 2) {
        return {}; // Return empty config if no data
    }

    const data = history.map((h) => [h.time, h.bandwidth, h.bitrate]);

    return {
        tooltip: {
            trigger: 'axis',
            formatter: (params) => {
                if (!params || params.length === 0) {
                    return '';
                }
                const time = params[0].value[0].toFixed(2);
                let bandwidth = 'N/A';
                let bitrate = 'N/A';

                params.forEach((param) => {
                    if (param.seriesName === 'Est. Bandwidth') {
                        bandwidth = (param.value[1] / 1000000).toFixed(2);
                    } else if (param.seriesName === 'Video Bitrate') {
                        bitrate = (param.value[1] / 1000000).toFixed(2);
                    }
                });

                return `Time: ${time}s<br/>Est. Bandwidth: ${bandwidth} Mbps<br/>Video Bitrate: ${bitrate} Mbps`;
            },
        },
        legend: {
            data: ['Est. Bandwidth', 'Video Bitrate'],
            textStyle: { color: '#9ca3af' },
            top: 0,
        },
        grid: { top: 50, bottom: 60, left: 60, right: 20 },
        xAxis: {
            type: 'value',
            name: 'Time (s)',
            nameTextStyle: { color: '#9ca3af' },
            axisLine: { lineStyle: { color: '#4b5563' } },
        },
        yAxis: {
            type: 'value',
            name: 'Bitrate',
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
                name: 'Est. Bandwidth',
                type: 'line',
                smooth: true,
                showSymbol: false,
                data: data.map((d) => [d[0], d[1]]),
                lineStyle: { color: '#06b6d4' },
            },
            {
                name: 'Video Bitrate',
                type: 'line',
                step: 'start',
                showSymbol: false,
                data: data.map((d) => [d[0], d[2]]),
                lineStyle: { color: '#f59e0b' },
            },
        ],
    };
};
