import { html, render } from 'lit-html';
import { renderChart, disposeChart } from '@/ui/shared/charts/chart-renderer';
import { formatBitrate } from '@/ui/shared/format';

const abrLadderChartOptions = (abrData) => {
    // 1. Get all unique categories (heights) from all streams and sort them numerically.
    const allHeights = [...new Set(abrData.flatMap((d) => d.tracks.map((t) => t.height)))].sort((a, b) => a - b);

    // 2. Create one series object per stream.
    const series = abrData.map((streamData) => {
        // Create a map for quick lookup of the track by its height for the current stream.
        const trackMap = new Map(streamData.tracks.map((t) => [t.height, t]));

        return {
            name: streamData.name,
            type: 'bar',
            barGap: 0, // Bars for different series will be adjacent.
            emphasis: {
                focus: 'series',
            },
            // 3. Generate data array by mapping over the canonical categories.
            data: allHeights.map((height) => {
                const track = trackMap.get(height);
                // If this stream has a track for this height, return a value object.
                // Otherwise, return null to create a gap. This is the correct format.
                return track
                    ? {
                          value: track.bandwidth,
                          // Store extra info for the tooltip
                          trackInfo: track,
                      }
                    : null;
            }),
        };
    });

    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow',
            },
            formatter: (params) => {
                const category = params[0].axisValue;
                let tooltipHtml = `<b>${category}</b><br/>`;
                params.forEach((param) => {
                    if (param.value) {
                        const { trackInfo } = param.data;
                        tooltipHtml += `${param.marker} ${param.seriesName}: ${formatBitrate(
                            param.value
                        )} (${trackInfo.width}x${trackInfo.height})<br/>`;
                    }
                });
                return tooltipHtml;
            },
        },
        legend: {
            data: abrData.map((d) => d.name),
            textStyle: { color: '#9ca3af' },
            bottom: 0,
            type: 'scroll',
        },
        grid: { top: '50', right: '20', bottom: '50', left: '80' },
        xAxis: {
            type: 'category',
            name: 'Resolution',
            nameLocation: 'middle',
            nameGap: 30,
            nameTextStyle: { color: '#9ca3af' },
            axisLine: { lineStyle: { color: '#4b5563' } },
            data: allHeights.map((h) => `${h}p`),
        },
        yAxis: {
            type: 'value',
            name: 'Bitrate',
            nameTextStyle: { color: '#9ca3af' },
            axisLine: { lineStyle: { color: '#4b5563' } },
            axisLabel: { formatter: (value) => formatBitrate(value) },
            splitLine: { lineStyle: { color: '#374151' } },
        },
        series,
    };
};

class AbrLadderChart extends HTMLElement {
    _data = null;
    chartContainer = null;

    constructor() {
        super();
        this.chartContainer = document.createElement('div');
        this.chartContainer.style.width = '100%';
        this.chartContainer.style.height = '100%';
    }

    set data(newData) {
        if (this._data === newData) return;
        this._data = newData;
        this.render();
    }

    get data() {
        return this._data;
    }

    connectedCallback() {
        this.appendChild(this.chartContainer);
        this.render();
    }

    disconnectedCallback() {
        if (this.chartContainer) {
            disposeChart(this.chartContainer);
        }
    }

    render() {
        if (!this.chartContainer) return;

        if (!this._data || this._data.length === 0 || this._data.every((d) => d.tracks.length === 0)) {
            render(
                html`<div class="flex items-center justify-center h-full text-center text-gray-500">
                    No comparable video tracks found.
                </div>`,
                this
            );
            return;
        }

        renderChart(this.chartContainer, abrLadderChartOptions(this._data));
    }
}

if (!customElements.get('abr-ladder-chart')) {
    customElements.define('abr-ladder-chart', AbrLadderChart);
}