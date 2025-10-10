export async function handleGetManifestMetadata({ manifestString }) {
    const trimmed = manifestString.trim();
    let protocol = 'unknown';
    let type = 'vod';

    if (trimmed.startsWith('#EXTM3U')) {
        protocol = 'hls';
        if (
            !trimmed.includes('#EXT-X-ENDLIST') &&
            !trimmed.includes('EXT-X-PLAYLIST-TYPE:VOD')
        ) {
            type = 'live';
        }
    } else if (trimmed.includes('<MPD')) {
        protocol = 'dash';
        if (/<MPD[^>]*type\s*=\s*["']dynamic["']/.test(trimmed)) {
            type = 'live';
        }
    } else {
        throw new Error('Could not determine manifest protocol.');
    }

    return { protocol, type };
}
