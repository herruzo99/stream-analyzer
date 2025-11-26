import { html } from 'lit-html';
import { tooltipTriggerClasses } from '@/ui/shared/constants';

// A curated list of important headers and their descriptions.
const HEADER_DEFINITIONS = {
    // General
    date: 'The date and time at which the message was originated.',
    connection:
        'Controls whether the network connection stays open after the current transaction finishes.',
    'cache-control':
        'Directives for caching mechanisms in both requests and responses.',
    // Request
    accept: 'Informs the server about the types of data that can be sent back.',
    'accept-encoding':
        'The encoding algorithm, usually a compression algorithm, that can be used on the resource sent back.',
    'user-agent':
        'A characteristic string that lets the network protocol peers identify the application type, operating system, software vendor or software version of the requesting software user agent.',
    authorization:
        'Contains the credentials to authenticate a user agent with a server.',
    origin: 'Indicates the origin (scheme, hostname, and port) that caused the request.',
    range: 'Indicates the part of a document that the server should return.',
    // Response
    'content-type':
        'Indicates the original media type of the resource (prior to any content encoding applied for transfer).',
    'content-length': 'The size of the resource, in decimal number of bytes.',
    'content-encoding':
        'The encoding algorithm, usually a compression algorithm, applied to the resource.',
    'access-control-allow-origin':
        'Indicates whether the response can be shared with requesting code from the given origin.',
    server: 'Contains information about the software used by the origin server to handle the request.',
    etag: 'An identifier for a specific version of a resource. It lets caches be more efficient and save bandwidth.',
    'last-modified':
        'The date and time at which the origin server believes the resource was last modified.',
    'x-amz-cf-id':
        'An identifier for a request in Amazon CloudFront, useful for debugging.',
    'x-served-by':
        'Indicates the server or cache that handled the request (e.g., Fastly).',
};

const categorizeHeaders = (headers) => {
    const categories = {
        General: {},
        Caching: {},
        'Security & CORS': {},
        Content: {},
        'Custom & Debug': {},
        Other: {},
    };

    for (const [key, value] of Object.entries(headers)) {
        const lowerKey = key.toLowerCase();
        if (['date', 'connection'].includes(lowerKey))
            categories['General'][key] = value;
        else if (
            [
                'cache-control',
                'etag',
                'expires',
                'last-modified',
                'pragma',
            ].includes(lowerKey)
        )
            categories['Caching'][key] = value;
        else if (
            lowerKey.startsWith('access-control-') ||
            ['authorization', 'origin', 'strict-transport-security'].includes(
                lowerKey
            )
        )
            categories['Security & CORS'][key] = value;
        else if (lowerKey.startsWith('content-'))
            categories['Content'][key] = value;
        else if (lowerKey.startsWith('x-'))
            categories['Custom & Debug'][key] = value;
        else categories['Other'][key] = value;
    }
    return categories;
};

export const headerDetailsTemplate = (headers, flaggedKeys = new Set()) => {
    if (!headers || Object.keys(headers).length === 0) {
        return html`<p class="text-xs text-slate-500 italic p-2">
            No headers found.
        </p>`;
    }
    const categorized = categorizeHeaders(headers);

    return html`
        <div class="space-y-4">
            ${Object.entries(categorized).map(([category, headerGroup]) => {
                if (Object.keys(headerGroup).length === 0) return '';
                return html`
                    <div
                        class="bg-slate-900/50 rounded border border-slate-700/50 overflow-hidden"
                    >
                        <h5
                            class="font-semibold text-slate-400 p-2 bg-slate-800/50 text-xs"
                        >
                            ${category}
                        </h5>
                        <table class="w-full text-left text-xs table-auto">
                            <tbody class="divide-y divide-slate-700/50">
                                ${Object.entries(headerGroup).map(
                                    ([key, value]) => {
                                        const lowerKey = key.toLowerCase();
                                        const definition =
                                            HEADER_DEFINITIONS[lowerKey];
                                        const isFlagged =
                                            flaggedKeys.has(lowerKey);
                                        const rowClass = isFlagged
                                            ? 'bg-red-900/20'
                                            : 'hover:bg-slate-700/50';
                                        const textClass = isFlagged
                                            ? 'text-red-200'
                                            : 'text-slate-300';

                                        return html`
                                            <tr class="${rowClass}">
                                                <td
                                                    class="p-2 font-semibold ${textClass} align-top w-1/3 ${definition
                                                        ? tooltipTriggerClasses
                                                        : ''}"
                                                    data-tooltip=${definition ||
                                                    ''}
                                                >
                                                    ${key}
                                                </td>
                                                <td
                                                    class="p-2 font-mono ${textClass} break-all"
                                                >
                                                    ${value}
                                                </td>
                                            </tr>
                                        `;
                                    }
                                )}
                            </tbody>
                        </table>
                    </div>
                `;
            })}
        </div>
    `;
};
