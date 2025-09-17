export function parseMpd(xmlString, baseUrl) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('Invalid XML. Check console for details.');
    }
    const mpd = xmlDoc.querySelector('MPD');
    if (!mpd) {
        throw new Error('No <MPD> element found in the document.');
    }

    const mpdBaseElement = mpd.querySelector('BaseURL');
    if (mpdBaseElement && mpdBaseElement.textContent) {
        baseUrl = new URL(
            mpdBaseElement.textContent,
            baseUrl || window.location.href
        ).href;
    }

    return { mpd, baseUrl };
}
