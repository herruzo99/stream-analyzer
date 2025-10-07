import { BoxParser } from '../utils.js';

/**
 * Parses the 'schm' (Scheme Type) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseSchm(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();
    p.readString(4, 'scheme_type');

    const schemeVersion = p.readUint32('scheme_version_raw');
    if (schemeVersion !== null) {
        box.details['scheme_version'] = {
            value: `0x${schemeVersion.toString(16)}`,
            offset: box.details['scheme_version_raw'].offset,
            length: 4,
        };
        delete box.details['scheme_version_raw'];
    }
    p.finalize();
}

export const schmTooltip = {
    schm: {
        name: 'Scheme Type Box',
        text: 'Identifies the protection scheme (e.g., "cenc" for Common Encryption).',
        ref: 'ISO/IEC 14496-12, 8.12.5',
    },
    'schm@scheme_type': {
        text: 'A four-character code identifying the protection scheme.',
        ref: 'ISO/IEC 14496-12, 8.12.5.3',
    },
    'schm@scheme_version': {
        text: 'The version of the scheme used to create the content.',
        ref: 'ISO/IEC 14496-12, 8.12.5.3',
    },
};
