import { html } from 'lit-html';
import { formatBitrate } from '@/ui/shared/format';

const statCardTemplate = (label, value, unit = '') => {
    return html`
        <div class="bg-gray-800 p-4 rounded-lg">
            <dt class="text-sm font-medium text-gray-400">${label}</dt>
            <dd class="mt-1 text-2xl font-semibold text-white">
                ${value}<span class="text-lg text-gray-400">${unit}</span>
            </dd>
        </div>
    `;
};

export const summaryCardsTemplate = (summary) => {
    const errorRate =
        summary.totalRequests > 0
            ? (summary.failedRequests / summary.totalRequests) * 100
            : 0;
    const errorRateColor =
        errorRate > 5
            ? 'text-red-400'
            : errorRate > 0
              ? 'text-yellow-400'
              : 'text-green-400';

    return html`
        <dl class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            ${statCardTemplate('Total Requests', summary.totalRequests)}
            <div class="bg-gray-800 p-4 rounded-lg">
                <dt class="text-sm font-medium text-gray-400">
                    Failed Requests
                </dt>
                <dd class="mt-1 text-2xl font-semibold ${errorRateColor}">
                    ${summary.failedRequests}
                    <span class="text-lg text-gray-400"
                        >(${errorRate.toFixed(1)}%)</span
                    >
                </dd>
            </div>
            ${statCardTemplate(
                'Avg. Throughput',
                formatBitrate(summary.avgThroughput)
            )}
            ${statCardTemplate('Avg. TTFB', summary.avgTtfb.toFixed(0), ' ms')}
            ${statCardTemplate(
                'Avg. Download',
                summary.avgDownload.toFixed(0),
                ' ms'
            )}
        </dl>
    `;
};
