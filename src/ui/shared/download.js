/**
 * Triggers a browser download for a given ArrayBuffer.
 * @param {ArrayBuffer} buffer The binary data to download.
 * @param {string} filename The desired filename for the downloaded file.
 */
export function downloadBuffer(buffer, filename) {
    const blob = new Blob([buffer]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}