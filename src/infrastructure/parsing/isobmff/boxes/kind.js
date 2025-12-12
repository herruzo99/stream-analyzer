import { BoxParser } from '../utils.js';

/**
 * Parses the 'kind' (Track Kind) box.
 * Defined in ISO/IEC 14496-12, 8.10.4.
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseKind(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();
    p.readNullTerminatedString('schemeURI');
    p.readNullTerminatedString('value');
    p.finalize();
}

export const kindTooltip = {
    kind: {
        name: 'Track Kind Box',
        text: 'Kind Box (`kind`). Used to label a track with a specific role or kind (e.g., "captions", "subtitle", "main") using a scheme URI and a value.',
        ref: 'ISO/IEC 14496-12, 8.10.4',
    },
    'kind@schemeURI': {
        text: 'A URI identifying the scheme of the kind (e.g., "urn:mpeg:dash:role:2011").',
        ref: 'ISO/IEC 14496-12, 8.10.4.3',
    },
    'kind@value': {
        text: 'The value for the role/kind defined by the scheme (e.g., "main", "commentary").',
        ref: 'ISO/IEC 14496-12, 8.10.4.3',
    },
};
