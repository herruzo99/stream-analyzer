/**
 * Represents a complete ad insertion opportunity (ad avail or ad break).
 */
export class AdAvail {
    /**
     * @param {object} params
     * @param {string} params.id - A unique ID for the avail, often from the SCTE-35 signal.
     * @param {number} params.startTime - The presentation time (in seconds) where the avail begins.
     * @param {number} params.duration - The total duration of the avail in seconds.
     * @param {object} params.scte35Signal - The parsed SCTE-35 object that signaled this avail.
     * @param {string | null} params.adManifestUrl - The URL of the VAST/VMAP manifest for this avail.
     * @param {import('./AdCreative').AdCreative[]} params.creatives - An array of ad creatives to be played in this avail.
     */
    constructor({
        id,
        startTime,
        duration,
        scte35Signal,
        adManifestUrl,
        creatives = [],
    }) {
        this.id = id;
        this.startTime = startTime;
        this.duration = duration;
        this.scte35Signal = scte35Signal;
        this.adManifestUrl = adManifestUrl;
        this.creatives = creatives;
    }
}