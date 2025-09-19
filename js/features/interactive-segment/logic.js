/**
 * @typedef {object} HexRow
 * @property {string} offset - The 8-digit hex offset for the start of the row.
 * @property {string} hex - The space-separated hex representation of the bytes.
 * @property {string} ascii - The ASCII representation of the bytes.
 */

/**
 * Generates a view model for a hex/ASCII view from an ArrayBuffer.
 * @param {ArrayBuffer} buffer The segment data.
 * @returns {HexRow[]} An array of row objects for rendering.
 */
export function generateHexAsciiView(buffer) {
    if (!buffer) {
        return [];
    }

    const rows = [];
    const view = new Uint8Array(buffer);
    const bytesPerRow = 16;

    for (let i = 0; i < view.length; i += bytesPerRow) {
        const chunk = view.slice(i, i + bytesPerRow);

        const offset = i.toString(16).padStart(8, '0').toUpperCase();

        const hex = Array.from(chunk)
            .map((byte) => byte.toString(16).padStart(2, '0').toUpperCase())
            .join(' ');

        const ascii = Array.from(chunk)
            .map((byte) => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.'))
            .join('');

        rows.push({ offset, hex, ascii });
    }

    return rows;
}