const DEFAULT_PAGE_SIZE = 40;
const MAX_NODES = 500;
const MAX_DEPTH = 16;
const PREVIEW_LENGTH = 96;

function substituteToken(value) {
    return typeof value === 'string'
        ? value.replace(/\$([A-Za-z][A-Za-z0-9]*)\$/g, '[$1]')
        : value;
}

function boundedText(value, substituted) {
    const candidate = substituted ? substituteToken(value) : value;
    if (candidate === null) return 'null';
    if (candidate === undefined) return 'undefined';
    if (typeof candidate === 'object') {
        return Array.isArray(candidate)
            ? `Array(${candidate.length})`
            : `Object(${Object.keys(candidate).length})`;
    }
    const text = String(candidate).replace(/\s+/g, ' ').trim();
    return text.length > PREVIEW_LENGTH
        ? `${text.slice(0, PREVIEW_LENGTH - 1)}…`
        : text;
}

function hashText(value) {
    let hash = 2166136261;
    for (const character of value) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

function semanticIdentity(value) {
    if (!value || typeof value !== 'object') return null;
    const attributes = value[':@'];
    const candidate =
        attributes?.id ??
        attributes?.ID ??
        value.stableId ??
        value.id ??
        value.uri ??
        value.URI ??
        null;
    return candidate === null ? null : boundedText(candidate, false);
}

function flattenDash(manifest, substituted) {
    const rows = [];
    const ancestors = new WeakSet();
    let truncated = false;

    function visit(value, label, parentId, depth, siblingIndex = null) {
        if (rows.length >= MAX_NODES) {
            truncated = true;
            return;
        }
        const semanticId = semanticIdentity(value);
        const segment = semanticId
            ? `${label}[id=${encodeURIComponent(semanticId)}]`
            : siblingIndex === null
              ? label
              : `${label}[${siblingIndex}]`;
        const id = parentId ? `${parentId}/${segment}` : segment;
        rows.push(
            Object.freeze({
                id,
                path: id,
                label,
                depth,
                preview: boundedText(value, substituted),
            })
        );

        if (
            value === null ||
            typeof value !== 'object' ||
            depth >= MAX_DEPTH
        ) {
            if (depth >= MAX_DEPTH && value && typeof value === 'object') {
                truncated = true;
            }
            return;
        }
        if (ancestors.has(value)) {
            truncated = true;
            return;
        }

        ancestors.add(value);
        for (const [childLabel, childValue] of Object.entries(value)) {
            if (Array.isArray(childValue)) {
                childValue.forEach((item, index) =>
                    visit(item, childLabel, id, depth + 1, index)
                );
            } else {
                visit(childValue, childLabel, id, depth + 1);
            }
            if (rows.length >= MAX_NODES) break;
        }
        ancestors.delete(value);
    }

    visit(manifest, 'MPD', '', 1);
    return { rows, truncated };
}

function flattenHls(rawManifest, substituted) {
    const occurrences = new Map();
    const lines = rawManifest.split(/\r?\n/);
    const rows = [];
    for (const [index, line] of lines.entries()) {
        if (rows.length >= MAX_NODES) break;
        const normalized = line.trim();
        const fingerprint = hashText(normalized);
        const occurrence = occurrences.get(fingerprint) ?? 0;
        occurrences.set(fingerprint, occurrence + 1);
        rows.push(
            Object.freeze({
                id: `hls:${fingerprint}:${occurrence}`,
                path: `hls:${fingerprint}:${occurrence}`,
                label: `Line ${index + 1}`,
                depth: 1,
                preview: boundedText(line, substituted),
            })
        );
    }
    return { rows, truncated: lines.length > MAX_NODES };
}

function resolveHlsRaw(stream, substituted) {
    if (
        stream.activeMediaPlaylistId &&
        stream.activeMediaPlaylistId !== 'master'
    ) {
        const mediaPlaylist = stream.mediaPlaylists?.get?.(
            stream.activeMediaPlaylistId
        );
        if (!mediaPlaylist) return null;
        if (substituted) {
            return (
                mediaPlaylist.manifest?.serializedManifest?.substitutedRaw ??
                mediaPlaylist.rawManifest ??
                ''
            );
        }
        return mediaPlaylist.rawManifest ?? '';
    }
    return stream.patchedRawManifest ?? stream.rawManifest ?? '';
}

export function buildInteractiveManifestModel(
    stream,
    { query = '', page = 0, pageSize = DEFAULT_PAGE_SIZE, substituted = true } = {}
) {
    if (!stream) {
        return Object.freeze({
            status: 'empty',
            message: 'No active stream is available.',
            rows: Object.freeze([]),
            total: 0,
            page: 0,
            pageCount: 1,
            truncated: false,
        });
    }

    let flattened;
    if (stream.protocol === 'hls') {
        const rawManifest = resolveHlsRaw(stream, substituted);
        if (rawManifest === null) {
            return Object.freeze({
                status: 'error',
                message: 'The selected media playlist is unavailable.',
                rows: Object.freeze([]),
                total: 0,
                page: 0,
                pageCount: 1,
                truncated: false,
            });
        }
        if (!rawManifest.trim()) {
            return Object.freeze({
                status: 'empty',
                message: 'The active HLS manifest has no content.',
                rows: Object.freeze([]),
                total: 0,
                page: 0,
                pageCount: 1,
                truncated: false,
            });
        }
        flattened = flattenHls(rawManifest, substituted);
    } else {
        const manifest = stream.manifest?.serializedManifest;
        if (!manifest) {
            return Object.freeze({
                status: stream.rawManifest ? 'error' : 'empty',
                message: stream.rawManifest
                    ? 'The active manifest could not be parsed safely.'
                    : 'The active stream has no manifest content.',
                rows: Object.freeze([]),
                total: 0,
                page: 0,
                pageCount: 1,
                truncated: false,
            });
        }
        flattened = flattenDash(manifest, substituted);
    }

    const normalizedQuery = query.trim().toLocaleLowerCase();
    const matches = normalizedQuery
        ? flattened.rows.filter((row) =>
              `${row.id} ${row.label} ${row.preview}`
                  .toLocaleLowerCase()
                  .includes(normalizedQuery)
          )
        : flattened.rows;
    const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
    const safePage = Math.min(Math.max(0, page), pageCount - 1);
    const start = safePage * pageSize;

    return Object.freeze({
        status: 'ready',
        message: '',
        rows: Object.freeze(matches.slice(start, start + pageSize)),
        total: matches.length,
        page: safePage,
        pageCount,
        truncated: flattened.truncated,
    });
}
