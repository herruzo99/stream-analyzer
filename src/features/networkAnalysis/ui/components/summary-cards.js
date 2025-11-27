import { statCardTemplate } from '@/features/summary/ui/components/shared';
import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';

export const summaryCardsTemplate = (summary) => {
    const errorRate =
        summary.totalRequests > 0
            ? (summary.failedRequests / summary.totalRequests) * 100
            : 0;

    return html`
        <div class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
            ${statCardTemplate({
                label: 'Total Requests',
                value: summary.totalRequests,
                icon: icons.network,
                tooltip: 'The total number of network requests logged.',
            })}
            ${statCardTemplate({
                label: 'Failed Requests',
                value: html`${summary.failedRequests}
                    <span class="text-lg text-slate-400"
                        >(${errorRate.toFixed(1)}%)</span
                    >`,
                icon: icons.xCircle,
                iconBgClass:
                    summary.failedRequests > 0
                        ? 'bg-red-900/30 text-red-300'
                        : 'bg-slate-800 text-slate-400',
                tooltip:
                    'The number of requests that resulted in an HTTP 4xx or 5xx status code.',
            })}
            ${statCardTemplate({
                label: 'Avg. Throughput',
                value: formatBitrate(summary.avgThroughput),
                icon: icons.gauge,
                tooltip:
                    'The average throughput calculated across the duration of all logged requests.',
            })}
            ${statCardTemplate({
                label: 'Avg. Latency',
                value: `${summary.avgLatency.toFixed(0)} ms`,
                icon: icons.timer,
                tooltip:
                    'Average request latency: the total time from the start of the request to the receipt of the final byte.',
            })}
        </div>
    `;
};
