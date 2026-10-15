// ICY (Icecast/ShOUTcast) domain: response-header parsing, in-band metadata
// framing, and derived mount statistics. Pure functions and a state machine;
// the controller feeds them streamed bytes. See ai/icecast-integration-analysis.md.

const enc = new TextEncoder();

/** Content types public stations actually serve. */
const CODEC_BY_CONTENT_TYPE = {
    'audio/mpeg': { codec: 'mp3', label: 'MP3' },
    'audio/mp3': { codec: 'mp3', label: 'MP3' },
    'audio/aac': { codec: 'aac', label: 'AAC (ADTS)' },
    'audio/aacp': { codec: 'aac', label: 'AAC+ (ADTS)' },
    'application/ogg': { codec: 'ogg', label: 'Ogg (Vorbis/Opus)' },
    'audio/ogg': { codec: 'ogg', label: 'Ogg (Vorbis/Opus)' },
    'audio/flac': { codec: 'flac', label: 'FLAC' },
    'audio/x-flac': { codec: 'flac', label: 'FLAC' },
};

/**
 * Map a Content-Type header to a codec descriptor. Non-audio types are
 * reported as such so the UI can explain the failure instead of guessing.
 * @param {string|undefined} contentType
 */
export function icyCodecFromContentType(contentType) {
    if (!contentType) return { codec: 'unknown', label: 'unknown' };
    const base = contentType.split(';')[0].trim().toLowerCase();
    const hit = CODEC_BY_CONTENT_TYPE[base];
    if (hit) return hit;
    if (base.startsWith('text/html'))
        return { codec: 'not-audio', label: 'HTML (not a stream)' };
    return { codec: 'unknown', label: base || 'unknown' };
}

const toInt = (v) => {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
};

/**
 * Parse the listener-facing headers of an Icecast/SHOUTcast mount.
 *
 * @param {Record<string, string>|Map<string,string>} headers lowercase-keyed header bag
 * @returns {{
 *   name: string|null, genre: string|null, description: string|null,
 *   url: string|null, public: boolean, server: string|null,
 *   bitrateKbps: number|null, metaIntBytes: number, hasInbandMetadata: boolean,
 *   codec: string, codecLabel: string, contentType: string|null,
 *   corsExposesIcy: boolean, notice: string|null
 * }}
 */
export function parseIcyHeaders(headers) {
    const bag =
        headers instanceof Map ? Object.fromEntries(headers) : (headers ?? {});
    const get = (k) => (typeof bag[k] === 'string' ? bag[k].trim() : null);

    const contentType = get('content-type');
    const codec = icyCodecFromContentType(contentType ?? undefined);
    const metaIntBytes = toInt(get('icy-metaint')) ?? 0;
    const br = toInt(get('icy-br'));

    return {
        name: get('icy-name'),
        genre: get('icy-genre'),
        description: get('icy-description') ?? get('icy-description'),
        url: get('icy-url'),
        public: get('icy-pub') === '1',
        server: get('server'),
        bitrateKbps: br,
        metaIntBytes,
        hasInbandMetadata: metaIntBytes > 0,
        codec: codec.codec,
        codecLabel: codec.label,
        contentType,
        // Icecast exposes the ICY headers to browsers through
        // Access-Control-Expose-Headers (thisisdax does); many stations do not.
        corsExposesIcy: /icy-meta-?int/i.test(
            get('access-control-expose-headers') ?? ''
        ),
        notice: get('icy-notice1'),
    };
}

/**
 * Parse one ICY metadata block (L*16 bytes, NUL-padded) into its fields.
 * Values may escape single quotes either as '' or \'.
 *
 * @param {Uint8Array} bytes
 * @returns {{title: string|null, url: string|null, fields: Record<string,string>}}
 */
export function parseIcyMetadataBlock(bytes) {
    // Trim trailing NULs and whitespace, then decode.
    let end = bytes.length;
    while (
        end > 0 &&
        (bytes[end - 1] === 0 || bytes[end - 1] === 32 || bytes[end - 1] === 9)
    ) {
        end--;
    }
    const text = new TextDecoder().decode(bytes.subarray(0, end));
    /** @type {Record<string, string>} */
    const fields = {};
    let title = null;
    let url = null;

    let i = 0;
    while (i < text.length) {
        const eq = text.indexOf('=', i);
        if (eq === -1) break;
        const key = text.slice(i, eq).trim();
        if (!/^[A-Za-z0-9_-]+$/.test(key) || text[eq + 1] !== "'") {
            i = eq + 1;
            continue;
        }
        // Scan the value, treating '' as a literal quote.
        let j = eq + 2;
        let value = '';
        while (j < text.length) {
            if (text[j] === "'") {
                if (text[j + 1] === "'") {
                    value += "'";
                    j += 2;
                    continue;
                }
                j += 1; // closing quote
                break;
            }
            value += text[j];
            j += 1;
        }
        fields[key] = value;
        if (key === 'StreamTitle') title = value;
        if (key === 'StreamUrl') url = value;
        i = j;
        while (i < text.length && (text[i] === ';' || /\s/.test(text[i])))
            i += 1;
    }
    return { title, url, fields };
}

/**
 * In-band metadata framing state machine.
 *
 * The stream alternates: `metaint` audio bytes, a 1-byte length L, then
 * L*16 metadata bytes. L = 0 means "no update this window" — an event is only
 * produced for blocks that carry a title. Chunk boundaries may fall anywhere.
 */
export class IcyStreamParser {
    /** @param {number} metaint audio bytes between metadata blocks (0 = none) */
    constructor(metaint = 0) {
        this.metaint =
            Number.isFinite(metaint) && metaint > 0 ? Math.floor(metaint) : 0;
        // metaint 0 means the mount sends no in-band metadata: every byte of
        // the body is audio (Infinity keeps the audio branch consuming).
        this.audioRemaining = this.metaint > 0 ? this.metaint : Infinity;
        this.metaRemaining = 0;
        this.audioBytesTotal = 0;
        this.blocks = 0;
        this.events = [];
        this._metaBuf = [];
        this._metaCount = 0; // bytes buffered for the current block
        this.blockIndex = 0;
    }

    /**
     * Feed one chunk of body bytes.
     * @param {Uint8Array} chunk
     * @returns {{audioBytes: number, events: Array<{blockIndex:number, title:string|null, url:string|null, fields:Record<string,string>}>}}
     */
    push(chunk) {
        let off = 0;
        let audioThisChunk = 0;
        const events = [];

        while (off < chunk.length) {
            // Reading a metadata block?
            if (this.metaRemaining > 0) {
                const take = Math.min(this.metaRemaining, chunk.length - off);
                this._metaBuf.push(chunk.subarray(off, off + take));
                this._metaCount += take;
                this.metaRemaining -= take;
                off += take;
                if (this.metaRemaining === 0) {
                    const block = new Uint8Array(this._metaCount);
                    let at = 0;
                    for (const part of this._metaBuf) {
                        block.set(part, at);
                        at += part.length;
                    }
                    this._metaBuf = [];
                    this._metaCount = 0;
                    const meta = parseIcyMetadataBlock(block);
                    if (meta.title !== null) {
                        const event = {
                            blockIndex: this.blockIndex++,
                            title: meta.title,
                            url: meta.url,
                            fields: meta.fields,
                        };
                        this.events.push(event);
                        events.push(event);
                    }
                    this.audioRemaining = this.metaint;
                }
                continue;
            }

            // Reading audio up to the next length byte.
            if (this.audioRemaining > 0) {
                const take = Math.min(
                    this.audioRemaining === Infinity
                        ? chunk.length - off
                        : this.audioRemaining,
                    chunk.length - off
                );
                off += take;
                this.audioRemaining -= take;
                this.audioBytesTotal += take;
                audioThisChunk += take;
                continue;
            }

            // Audio window complete: read the length byte.
            const lenByte = chunk[off];
            off += 1;
            this.blocks += 1;
            this.metaRemaining = lenByte * 16;
            if (this.metaRemaining === 0) {
                // Empty block: the next window starts immediately.
                this.audioRemaining = this.metaint;
            }
        }

        return { audioBytes: audioThisChunk, events };
    }
}

/**
 * Combine mount headers with live measurements into the view model.
 *
 * @param {ReturnType<typeof parseIcyHeaders>} mount
 * @param {{bytesTotal: number, windowMs: number, events: Array<{title: string|null}>}} live
 */
export function summarizeMount(mount, live) {
    const bytes = Math.max(0, Number(live.bytesTotal) || 0);
    const ms = Math.max(1, Number(live.windowMs) || 1);
    const measuredKbps = (bytes * 8) / ms; // bytes*8 bits / ms = kbps
    const advertised = mount?.bitrateKbps ?? null;
    const events = live.events ?? [];
    return {
        measuredKbps: Math.round(measuredKbps * 100) / 100,
        advertisedKbps: advertised,
        efficiency:
            advertised && advertised > 0
                ? Math.round((measuredKbps / advertised) * 100) / 100
                : null,
        lastTitle: events.length ? events[events.length - 1].title : null,
        eventCount: events.length,
    };
}

// silence the unused encoder in builds that tree-shake it
void enc;
