export const SOURCE_INPUT_LIMITS = Object.freeze({
    urlCharacters: 8192,
    batchEntries: 20,
    inlineTextBytes: 2 * 1024 * 1024,
    fileBytes: 512 * 1024 * 1024,
});

function validateHttpUrl(value) {
    if (value.length > SOURCE_INPUT_LIMITS.urlCharacters) {
        return { error: 'URL is too long (maximum 8,192 characters).' };
    }

    try {
        const url = new URL(value);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return { error: 'Use an HTTP or HTTPS media URL.' };
        }
        if (url.username || url.password) {
            return {
                error: 'Remove embedded credentials and configure authentication separately.',
            };
        }
        return { value: url.href };
    } catch {
        return { error: 'Enter a complete HTTP or HTTPS media URL.' };
    }
}

function inlineManifest(value) {
    const trimmed = value.trim();
    if (trimmed.startsWith('#EXTM3U')) {
        return { protocol: 'hls', extension: 'm3u8', value: trimmed };
    }
    if (/^<\?xml[\s\S]*?<MPD\b|^<MPD\b/i.test(trimmed)) {
        return { protocol: 'dash', extension: 'mpd', value: trimmed };
    }
    return null;
}

export function parseSourceInput(value) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) return { error: 'Enter a URL or paste a manifest.' };

    const manifest = inlineManifest(trimmed);
    if (manifest) {
        if (new TextEncoder().encode(manifest.value).byteLength > SOURCE_INPUT_LIMITS.inlineTextBytes) {
            return { error: 'Pasted manifest exceeds the 2 MiB input limit.' };
        }
        return { kind: 'text', manifest };
    }

    const tokens = trimmed.split(/[\n,\s]+/).filter(Boolean);
    if (tokens.length > 1) {
        if (tokens.length > SOURCE_INPUT_LIMITS.batchEntries) {
            return { error: 'Import at most 20 URLs at a time.' };
        }
        const urls = [];
        for (const token of tokens) {
            const result = validateHttpUrl(token);
            if (result.error) return result;
            urls.push(result.value);
        }
        return { kind: 'batch', urls };
    }

    const result = validateHttpUrl(trimmed);
    return result.error
        ? result
        : { kind: 'url', urls: [result.value] };
}

export function classifySourceFile(file) {
    if (!file || typeof file.name !== 'string') {
        return { error: 'Choose a local media or manifest file.' };
    }
    if (file.size > SOURCE_INPUT_LIMITS.fileBytes) {
        return { error: 'File exceeds the 512 MiB local input limit.' };
    }

    const extension = file.name.toLowerCase().split('.').pop();
    const analysisExtensions = new Set([
        'mpd',
        'm3u8',
        'mp4',
        'webm',
        'mkv',
        'mov',
    ]);
    return {
        kind: analysisExtensions.has(extension) ? 'stream' : 'segment',
        file,
    };
}
