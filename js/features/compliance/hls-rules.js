/**
 * @typedef {import('./dash-rules.js').CheckStatus} CheckStatus
 * @typedef {import('./dash-rules.js').Rule} Rule
 */

/** @type {Rule[]} */
export const rules = [
    // --- HLS Rules (Not Implemented) ---
    {
        id: 'HLS-1',
        text: 'Playlist must start with #EXTM3U',
        isoRef: 'RFC 8216, Section 4.3.1.1',
        severity: 'fail',
        scope: 'Playlist',
        category: 'HLS Structure',
        check: (manifest) => 'skip', // Not implemented
        passDetails: 'OK',
        failDetails: 'The playlist must begin with the #EXTM3U tag.',
    },
];