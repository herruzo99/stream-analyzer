/**
 * Represents a single ad creative within an ad break.
 */
export class AdCreative {
    /**
     * @param {object} params
     * @param {string | null} params.id
     * @param {number} params.sequence
     * @param {number} params.duration
     * @param {string | null} params.mediaFileUrl
     * @param {Map<string, string[]>} params.trackingUrls
     */
    constructor({
        id,
        sequence,
        duration,
        mediaFileUrl,
        trackingUrls = new Map(),
    }) {
        this.id = id;
        this.sequence = sequence;
        this.duration = duration;
        this.mediaFileUrl = mediaFileUrl;
        this.trackingUrls = trackingUrls;
    }
}
