import { useAnalysisStore } from '@/state/analysisStore';
import { getShellRoutes } from '@/ui/shell/navigation-contract';

export const GLOBAL_SEARCH_VERSION = 'sa-global-search/1';

const limits = Object.freeze({
    query: 128,
    items: 1200,
    results: 50,
    nodes: 2000,
    depth: 12,
    arrayItems: 500,
    text: 160,
});

/**
 * @param {unknown} value
 * @param {number} [max]
 */
function boundedText(value, max = limits.text) {
    return String(value ?? '')
        .replace(/[\r\n\t]+/g, ' ')
        .trim()
        .slice(0, max);
}

function containsSensitiveValue(key, value) {
    return /(?:authorization|credential|password|secret|token|cookie|license|signature|sig|key)/i.test(
        key
    ) || /(?:https?:\/\/[^\s/@]+:[^\s/@]+@|[?&](?:token|key|sig|signature|auth)=)/i.test(
        value
    );
}

function score(item, query) {
    const label = item.label.toLocaleLowerCase();
    const keywords = item.keywords.toLocaleLowerCase();
    if (label === query) return 400;
    if (label.startsWith(query)) return 300;
    if (label.split(/\s+/).some((part) => part.startsWith(query))) return 220;
    if (label.includes(query)) return 160;
    if (keywords.includes(query)) return 100;
    return 0;
}

function routeItems() {
    return getShellRoutes().map((route, index) => ({
        id: `route:${boundedText(route.key, 80)}`,
        category: 'Routes',
        kind: 'route',
        label: boundedText(route.label || route.key),
        description: boundedText(`${route.groupLabel} · ${route.key}`),
        keywords: boundedText(`${route.groupLabel} ${route.key} ${route.label}`),
        routeId: route.key,
        available: (route.available ?? route.visible) === true,
        order: index,
    }));
}

function manifestItems(stream) {
    const manifest = stream?.manifest;
    if (!manifest) return { items: [], truncated: false };
    const update = stream.manifestUpdates?.find(
        (candidate) => candidate.id === stream.activeManifestUpdateId
    );
    const root =
        update?.serializedManifest ??
        manifest.serializedManifest ??
        manifest.serializedManifest;
    if (!root || typeof root !== 'object') return { items: [], truncated: false };

    const items = [];
    const visited = new WeakSet();
    let nodes = 0;
    let truncated = false;

    function visit(node, path = 'manifest', depth = 0) {
        if (
            items.length >= limits.items ||
            nodes >= limits.nodes ||
            depth > limits.depth
        ) {
            truncated = true;
            return;
        }
        if (!node || typeof node !== 'object' || visited.has(node)) return;
        visited.add(node);
        nodes += 1;
        const entries = Object.entries(node).slice(0, limits.arrayItems);
        if (Object.keys(node).length > entries.length) truncated = true;
        for (const [rawKey, value] of entries) {
            if (items.length >= limits.items) {
                truncated = true;
                break;
            }
            const key = boundedText(rawKey, 80);
            if (['rawManifest', 'serializedManifest', 'parent'].includes(key))
                continue;
            const itemPath = boundedText(`${path}.${key}`, limits.text);
            if (value !== null && typeof value !== 'object') {
                const rawValue = boundedText(value);
                const redacted = containsSensitiveValue(key, rawValue);
                items.push({
                    id: `manifest:${items.length}:${itemPath}`,
                    category: 'Active manifest',
                    kind: 'manifest',
                    label: key,
                    description: redacted ? '[redacted]' : rawValue,
                    keywords: redacted ? key : boundedText(`${key} ${rawValue}`),
                    path: itemPath,
                    available: true,
                    order: items.length,
                });
            } else if (Array.isArray(value)) {
                value.slice(0, limits.arrayItems).forEach((child, index) =>
                    visit(child, `${itemPath}[${index}]`, depth + 1)
                );
                if (value.length > limits.arrayItems) truncated = true;
            } else {
                visit(value, itemPath, depth + 1);
            }
        }
    }

    visit(root);
    return { items, truncated };
}

export function createGlobalSearchIndex() {
    const { streams, activeStreamId, analysisStatus } =
        useAnalysisStore.getState();
    const activeStream = streams.find(({ id }) => id === activeStreamId);
    const routes = routeItems();
    const manifest = manifestItems(activeStream);
    const items = [...routes, ...manifest.items].slice(0, limits.items);
    return Object.freeze({
        version: GLOBAL_SEARCH_VERSION,
        state:
            analysisStatus === 'analyzing'
                ? 'partial'
                : activeStream
                  ? 'ready'
                  : 'routes-only',
        truncated: manifest.truncated || items.length >= limits.items,
        items: Object.freeze(items.map((item) => Object.freeze(item))),
    });
}

export function queryGlobalSearch(index, rawQuery) {
    const query = boundedText(rawQuery, limits.query).toLocaleLowerCase();
    if (query.length < 2) return [];
    return index.items
        .map((item) => ({ item, score: score(item, query) }))
        .filter(({ score: value }) => value > 0)
        .sort(
            (a, b) =>
                b.score - a.score ||
                a.item.category.localeCompare(b.item.category) ||
                a.item.order - b.item.order ||
                a.item.id.localeCompare(b.item.id)
        )
        .slice(0, limits.results)
        .map(({ item }) => item);
}
