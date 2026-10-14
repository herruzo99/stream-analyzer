// MSF Catalog normalization (draft-ietf-moq-msf, Section 5).
// The catalog is a JSON object carried on the track named "catalog";
// this module maps it into the UI model and enforces the draft's
// independent/delta rules (first object of a group is independent;
// later objects in older groups are ignored).
// Pure — JSON in, model out.

export const CATALOG_TRACK_NAME = 'catalog';

export const PACKAGING = Object.freeze({
    LOC: 'loc',
    MEDIA_TIMELINE: 'mediatimeline',
    EVENT_TIMELINE: 'eventtimeline',
    MOQ_LOG: 'moqlog',
    MOQ_METRICS: 'moqmetrics',
});

/**
 * Normalize a parsed catalog JSON document.
 *
 * @param {object} doc parsed catalog JSON
 * @returns {{version:string|null, generatedAt:string|null, isComplete:boolean|null,
 *   tracks:Array<{namespace:string, name:string, packaging:string|null, role:string|null,
 *     isLive:boolean|null, targetLatencyMs:number|null, renderGroup:string|null,
 *     alternateGroup:string|null, codec:string|null, initData:string|null, width:number|null,
 *     height:number|null, framerate:number|null, bitrate:number|null, samplerate:number|null,
 *     channels:number|null, mimeType:string|null, lang:string|null, raw:object}>,
 *   publishTracks:number, warnings:string[]}}
 */
export function normalizeCatalog(doc) {
    const warnings = [];
    if (!doc || typeof doc !== 'object') {
        return { version: null, generatedAt: null, isComplete: null, tracks: [], publishTracks: 0, warnings: ['catalog payload was not a JSON object'] };
    }
    const tracks = [];
    for (const t of Array.isArray(doc.tracks) ? doc.tracks : []) {
        if (!t || typeof t !== 'object') { warnings.push('skipping non-object catalog track'); continue; }
        if (typeof t.name !== 'string' || t.name === '') { warnings.push('skipping catalog track without a name'); continue; }
        const selectionTags = t.selectionTags ?? null;
        tracks.push({
            namespace: typeof t.namespace === 'string' ? t.namespace : null,
            name: t.name,
            packaging: typeof t.packaging === 'string' ? t.packaging : null,
            role: typeof t.role === 'string' ? t.role : null,
            isLive: typeof t.isLive === 'boolean' ? t.isLive : null,
            targetLatencyMs: Number.isFinite(t.targetLatency) ? Number(t.targetLatency) : null,
            renderGroup: typeof t.renderGroup === 'string' ? t.renderGroup : null,
            alternateGroup: typeof t.alternateGroup === 'string' ? t.alternateGroup : null,
            codec: typeof t.codec === 'string' ? t.codec : null,
            initData: typeof t.initData === 'string' ? t.initData : null,
            width: Number.isFinite(t.width) ? Number(t.width) : null,
            height: Number.isFinite(t.height) ? Number(t.height) : null,
            framerate: Number.isFinite(t.framerate) ? Number(t.framerate) : null,
            bitrate: Number.isFinite(t.bitrate) ? Number(t.bitrate) : null,
            samplerate: Number.isFinite(t.samplerate) ? Number(t.samplerate) : null,
            channels: Number.isFinite(t.channels) ? Number(t.channels) : null,
            mimeType: typeof t.mimeType === 'string' ? t.mimeType : null,
            lang: typeof t.lang === 'string' ? t.lang : null,
            selectionTags,
            raw: t,
        });
    }
    if (doc.version === undefined) warnings.push('catalog missing MSF version');
    return {
        version: typeof doc.version === 'string' ? doc.version : null,
        generatedAt: typeof doc.generatedAt === 'string' ? doc.generatedAt : null,
        isComplete: typeof doc.isComplete === 'boolean' ? doc.isComplete : null,
        tracks,
        publishTracks: Array.isArray(doc.publishTracks) ? doc.publishTracks.length : 0,
        warnings,
    };
}

/**
 * MSF delta policy (Section 5): an incoming catalog object at objectId 0
 * of a group is independent; only objects at or after the largest seen
 * independent object should be applied.
 *
 * @param {{appliedGroup:number, appliedObject:number}} state
 * @param {{groupId:number, objectId:number}} obj
 * @returns {{kind:'independent'|'delta-apply'|'delta-stale', state:{appliedGroup:number, appliedObject:number}}}
 */
export function applyCatalogObject(state, obj) {
    const isIndependent = obj.objectId === 0;
    const isNewer =
        obj.groupId > state.appliedGroup ||
        (obj.groupId === state.appliedGroup && obj.objectId > state.appliedObject);
    if (isIndependent) {
        return { kind: 'independent', state: { appliedGroup: obj.groupId, appliedObject: obj.objectId } };
    }
    if (isNewer) {
        return { kind: 'delta-apply', state: { appliedGroup: obj.groupId, appliedObject: obj.objectId } };
    }
    return { kind: 'delta-stale', state };
}

/** Minimal per-track analysis the SRT Monitor can show for a catalog entry. */
export function summarizeTracks(model) {
    const videos = model.tracks.filter((t) => (t.mimeType ?? '').startsWith('video/') || (t.role ?? '') === 'video');
    const audios = model.tracks.filter((t) => (t.mimeType ?? '').startsWith('audio/') || (t.role ?? '') === 'audio');
    return {
        total: model.tracks.length,
        video: videos.length,
        audio: audios.length,
        liveTracks: model.tracks.filter((t) => t.isLive).length,
        maxBitrate: Math.max(0, ...videos.map((t) => t.bitrate ?? 0)),
        targetLatencies: model.tracks.map((t) => t.targetLatencyMs).filter((v) => v != null),
        warnings: model.warnings,
    };
}
