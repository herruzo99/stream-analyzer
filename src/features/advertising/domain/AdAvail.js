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
     * @param {'SCTE35_INBAND' | 'SCTE35_DATERANGE' | 'ASSET_IDENTIFIER' | 'ENCRYPTION_TRANSITION' | 'STRUCTURAL_DISCONTINUITY' | 'UNKNOWN'} params.detectionMethod - The method used to identify this ad avail.
     */
    constructor({
        id,
        startTime,
        duration,
        scte35Signal,
        adManifestUrl,
        creatives = [],
        detectionMethod = 'UNKNOWN',
    }) {
        this.id = id;
        this.startTime = startTime;
        this.duration = duration;
        this.scte35Signal = scte35Signal;
        this.adManifestUrl = adManifestUrl;
        this.creatives = creatives;
        this.detectionMethod = detectionMethod;
    }
}