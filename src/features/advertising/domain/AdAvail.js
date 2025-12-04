/**
 * Represents a complete ad insertion opportunity (ad avail or ad break).
 */
export class AdAvail {
    /**
     * @param {object} params
     * @param {string} params.id - A unique ID for the avail.
     * @param {number} params.startTime - The presentation time (in seconds).
     * @param {number} params.duration - The total duration of the avail in seconds.
     * @param {object} params.scte35Signal - The parsed SCTE-35 object.
     * @param {object} [params.scte224Signal] - The parsed SCTE-224 object.
     * @param {string | null} params.adManifestUrl - The URL of the VAST/VMAP manifest.
     * @param {import('./AdCreative').AdCreative[]} params.creatives - Array of creatives.
     * @param {'SCTE35_INBAND' | 'SCTE35_DATERANGE' | 'SCTE224_ESNI' | 'ASSET_IDENTIFIER' | 'ENCRYPTION_TRANSITION' | 'STRUCTURAL_DISCONTINUITY' | 'UNKNOWN'} params.detectionMethod
     * @param {object} [params.vmapInfo] - Details if source was VMAP.
     */
    constructor({
        id,
        startTime,
        duration,
        scte35Signal,
        scte224Signal = null,
        adManifestUrl,
        creatives = [],
        detectionMethod = 'UNKNOWN',
        vmapInfo = null,
    }) {
        this.id = id;
        this.startTime = startTime;
        this.duration = duration;
        this.scte35Signal = scte35Signal;
        this.scte224Signal = scte224Signal;
        this.adManifestUrl = adManifestUrl;
        this.creatives = creatives;
        this.detectionMethod = detectionMethod;
        this.vmapInfo = vmapInfo; // { breakType: 'linear', timeOffset: 'start', ... }
    }
}
