import { delay, http, HttpResponse, passthrough } from 'msw';
import { setupWorker } from 'msw/browser';

import { appLog } from '@/shared/utils/debug';
import { secureRandom } from '@/shared/utils/random';
import { useAnalysisStore } from '@/state/analysisStore';
import { networkActions, useNetworkStore } from '@/state/networkStore';

const IGNORED_HOSTS = new Set([
    'fonts.gstatic.com',
    'fonts.googleapis.com',
    'cdn.jsdelivr.net',
    'js-de.sentry-cdn.com',
    'www.googletagmanager.com',
    'clarity.ms',
]);
const IGNORED_EXTENSIONS = new Set([
    '.js',
    '.css',
    '.png',
    '.svg',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.json',
]);

function shouldBypass(url) {
    if (url.origin === self.location.origin && url.protocol !== 'blob:')
        return true;
    if (IGNORED_HOSTS.has(url.hostname)) return true;
    const pathname = url.pathname.toLowerCase();
    for (const ext of IGNORED_EXTENSIONS)
        if (pathname.endsWith(ext)) return true;
    return false;
}

function classifyRequest(urlString, streams) {
    // 1. Exact Match via Auth Map (High Confidence)
    const { urlAuthMap } = useAnalysisStore.getState();
    if (urlAuthMap.has(urlString)) {
        const ctx = urlAuthMap.get(urlString);
        return { streamId: ctx.streamId, resourceType: 'video' };
    }

    for (const stream of streams) {
        if (stream.originalUrl === urlString || stream.baseUrl === urlString)
            return { streamId: stream.id, resourceType: 'manifest' };

        const licenseUrl = stream.drmAuth?.licenseServerUrl;
        if (licenseUrl) {
            const target =
                typeof licenseUrl === 'string'
                    ? licenseUrl
                    : Object.values(licenseUrl)[0];
            if (target && urlString.startsWith(target))
                return { streamId: stream.id, resourceType: 'license' };
        }

        const basePath = stream.baseUrl
            ? stream.baseUrl.substring(0, stream.baseUrl.lastIndexOf('/'))
            : '';
        if (basePath && urlString.startsWith(basePath)) {
            let type = 'video';
            // FIX: Prioritize manifest extensions inside the base path match to prevent misclassification as 'video'
            if (urlString.includes('.mpd') || urlString.includes('.m3u8'))
                type = 'manifest';
            else if (urlString.includes('.m4a') || urlString.includes('audio'))
                type = 'audio';
            else if (urlString.includes('.vtt') || urlString.includes('subs'))
                type = 'text';
            else if (urlString.includes('init')) type = 'init';
            else if (urlString.includes('.key')) type = 'key';

            return { streamId: stream.id, resourceType: type };
        }
    }

    // 3. Fallback (Pure URL Analysis)
    const lowerUrl = urlString.toLowerCase();
    if (
        lowerUrl.includes('.mpd') ||
        lowerUrl.includes('.m3u8') ||
        lowerUrl.includes('manifest')
    )
        return { streamId: null, resourceType: 'manifest' };
    if (
        lowerUrl.includes('license') ||
        lowerUrl.includes('widevine') ||
        lowerUrl.includes('playready')
    )
        return { streamId: null, resourceType: 'license' };
    if (
        lowerUrl.endsWith('.ts') ||
        lowerUrl.endsWith('.m4s') ||
        lowerUrl.includes('segment')
    )
        return { streamId: null, resourceType: 'video' };

    return { streamId: null, resourceType: 'other' };
}

function logIntervention(urlString, method, rule, headers, duration = 0) {
    const { streams } = useAnalysisStore.getState();
    const { streamId, resourceType } = classifyRequest(urlString, streams);
    const responseStatus =
        rule.action === 'block' ? rule.params.statusCode || 404 : 200;
    const statusText = rule.action === 'block' ? 'Blocked by Rule' : 'Delayed';

    networkActions.logEvent({
        id: crypto.randomUUID(),
        url: urlString,
        resourceType,
        streamId,
        request: { method, headers: headers || {}, body: null },
        response: {
            status: responseStatus,
            statusText,
            headers: { 'x-intervention-rule': rule.label },
            contentLength: 0,
            contentType: 'application/json',
            body: null,
        },
        timing: {
            startTime: performance.now(),
            endTime: performance.now() + duration,
            duration,
            breakdown: null,
        },
        auditStatus: 'warn',
        auditIssues: [
            {
                id: 'intervention',
                level: 'warn',
                message: `Request ${rule.action}ed by rule: "${rule.label}"`,
            },
        ],
    });
}

export async function initializeGlobalRequestInterceptor() {
    appLog(
        'GlobalRequestInterceptor',
        'info',
        'Initializing Intervention Engine...'
    );

    const handlers = [
        http.all('*', async ({ request }) => {
            const url = new URL(request.url);
            if (shouldBypass(url)) return undefined;
            if (
                url.hostname.includes('google') ||
                url.hostname.includes('jsdelivr')
            )
                return passthrough();

            const { interventionRules } = useNetworkStore.getState();
            const activeRules = interventionRules.filter((r) => r.enabled);

            if (activeRules.length > 0) {
                const { streams } = useAnalysisStore.getState();
                const { resourceType } = classifyRequest(request.url, streams);

                for (const rule of activeRules) {
                    if (
                        rule.resourceType !== 'all' &&
                        rule.resourceType !== resourceType
                    )
                        continue;

                    let match = false;
                    try {
                        const regex = new RegExp(rule.urlPattern, 'i');
                        match = regex.test(request.url);
                    } catch (_e) {
                        match = request.url.includes(rule.urlPattern);
                    }

                    if (!rule.urlPattern) match = true;

                    if (!match) continue;

                    const probability =
                        rule.params.probability !== undefined
                            ? rule.params.probability
                            : 100;
                    const roll = secureRandom() * 100;
                    if (roll > probability) continue;

                    appLog(
                        'Intervention',
                        'warn',
                        `Applying Rule: ${rule.label} to ${request.url}`
                    );

                    if (rule.action === 'block') {
                        const status = rule.params.statusCode || 404;
                        const headers = {};
                        request.headers.forEach((v, k) => (headers[k] = v));
                        logIntervention(
                            request.url,
                            request.method,
                            rule,
                            headers
                        );
                        return new HttpResponse(null, {
                            status,
                            statusText: `Blocked: ${rule.label}`,
                        });
                    }

                    if (rule.action === 'delay') {
                        const ms = rule.params.delayMs || 2000;
                        const headers = {};
                        request.headers.forEach((v, k) => (headers[k] = v));
                        logIntervention(
                            request.url,
                            request.method,
                            rule,
                            headers,
                            ms
                        );
                        await delay(ms);
                        break;
                    }
                }
            }
            return passthrough();
        }),
    ];

    const worker = setupWorker(...handlers);
    worker.events.on('response:bypass', async ({ response, request }) => {
        const urlString = request.url;
        try {
            if (shouldBypass(new URL(urlString))) return;
        } catch {
            return;
        }

        const { streams } = useAnalysisStore.getState();
        const { streamId, resourceType } = classifyRequest(urlString, streams);
        if (streamId === null && resourceType === 'other') return;

        const responseHeaders = {};
        response.headers.forEach((val, key) => {
            responseHeaders[key] = val;
        });

        networkActions.logEvent({
            id: crypto.randomUUID(),
            url: urlString,
            resourceType,
            streamId,
            request: { method: request.method, headers: {}, body: null },
            response: {
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders,
                contentLength:
                    Number(response.headers.get('content-length')) || 0,
                contentType: response.headers.get('content-type') || '',
                body: null,
            },
            timing: {
                startTime: performance.now(),
                endTime: performance.now(),
                duration: 0,
                breakdown: null,
            },
        });
    });

    try {
        await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
    } catch (e) {
        console.error('MSW Start Failed', e);
    }
}
