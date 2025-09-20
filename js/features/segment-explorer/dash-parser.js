/**
 * Parses all segment URLs from a DASH manifest element.
 * @param {Element} manifestElement The raw <MPD> element to parse.
 * @param {string} baseUrl The base URL for resolving relative segment paths.
 * @returns {Record<string, object[]>} A map of Representation IDs to their segment lists.
 */
export function parseAllSegmentUrls(manifestElement, baseUrl) {
    /** @type {Record<string, object[]>} */
    const segmentsByRep = {};
    manifestElement.querySelectorAll('Representation').forEach((rep) => {
        const repId = rep.getAttribute('id');
        segmentsByRep[repId] = [];
        const as = rep.closest('AdaptationSet');
        const period = rep.closest('Period');
        const template =
            rep.querySelector('SegmentTemplate') ||
            as.querySelector('SegmentTemplate') ||
            period.querySelector('SegmentTemplate');
        if (!template) return;

        const timescale = parseInt(template.getAttribute('timescale') || '1');

        const initTemplate = template.getAttribute('initialization');
        if (initTemplate) {
            const url = initTemplate.replace(/\$RepresentationID\$/g, repId);
            segmentsByRep[repId].push({
                repId,
                type: 'Init',
                number: 0,
                resolvedUrl: new URL(url, baseUrl).href,
                template: url,
                time: -1,
                duration: 0,
                timescale,
            });
        }

        const mediaTemplate = template.getAttribute('media');
        const timeline = template.querySelector('SegmentTimeline');
        if (mediaTemplate && timeline) {
            let segmentNumber = parseInt(
                template.getAttribute('startNumber') || '1'
            );
            let currentTime = 0;
            timeline.querySelectorAll('S').forEach((s) => {
                const t = s.hasAttribute('t')
                    ? parseInt(s.getAttribute('t'))
                    : currentTime;
                const d = parseInt(s.getAttribute('d'));
                const r = parseInt(s.getAttribute('r') || '0');
                for (let i = 0; i <= r; i++) {
                    const segTime = t + i * d;
                    const url = mediaTemplate
                        .replace(/\$RepresentationID\$/g, repId)
                        .replace(/\$Number(%0\d+d)?\$/g, (match, padding) => {
                            const width = padding
                                ? parseInt(
                                      padding.substring(2, padding.length - 1)
                                  )
                                : 1;
                            return String(segmentNumber).padStart(width, '0');
                        })
                        .replace(/\$Time\$/g, String(segTime));
                    segmentsByRep[repId].push({
                        repId,
                        type: 'Media',
                        number: segmentNumber,
                        resolvedUrl: new URL(url, baseUrl).href,
                        template: url,
                        time: segTime,
                        duration: d,
                        timescale,
                    });
                    segmentNumber++;
                }
                currentTime = t + (r + 1) * d;
            });
        }
    });
    return segmentsByRep;
}