import { BoxParser } from '../utils.js';

/**
 * Parses the 'tenc' (Track Encryption) box.
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseTenc(box, view) {
    const p = new BoxParser(box, view);
    const { version } = p.readVersionAndFlags();

    if (version === null) {
        p.finalize();
        return;
    }

    if (version === 0) {
        // CENC v3+ structure (version 0)
        p.skip(2, 'reserved_1');
        const isProtected = p.readUint8('default_isProtected');
        const perSampleIVSize = p.readUint8('default_Per_Sample_IV_Size');

        const kidBytes = [];
        for (let i = 0; i < 16; i++) {
            const byte = p.readUint8(`kid_byte_${i}`);
            if (byte !== null) {
                kidBytes.push(byte.toString(16).padStart(2, '0'));
            } else {
                p.finalize();
                return;
            }
        }

        const kidOffset = box.details['kid_byte_0']?.offset;
        if (kidOffset !== undefined) {
            box.details['default_KID'] = {
                value: kidBytes.join(''),
                offset: kidOffset,
                length: 16,
            };
            for (let i = 0; i < 16; i++) delete box.details[`kid_byte_${i}`];
        }

        if (isProtected === 1 && perSampleIVSize === 0) {
            const constIVSize = p.readUint8('default_constant_IV_size');
            if (constIVSize !== null) {
                p.skip(constIVSize, 'default_constant_IV');
            }
        }
    } else if (version === 1) {
        // Legacy CENC v1 structure (version 1)
        p.skip(2, 'reserved_1');
        const packedFields1 = p.readUint8('packed_fields_1');
        if (packedFields1 !== null) {
            delete box.details['packed_fields_1'];
            box.details['default_crypt_byte_block'] = {
                value: (packedFields1 >> 4) & 0x0f,
                offset: p.box.offset + p.offset - 1,
                length: 0.5,
            };
            box.details['default_skip_byte_block'] = {
                value: packedFields1 & 0x0f,
                offset: p.box.offset + p.offset - 1,
                length: 0.5,
            };
        }
        p.readUint8('default_isProtected');
        p.readUint8('default_Per_Sample_IV_Size');

        const kidBytes = [];
        for (let i = 0; i < 16; i++) {
            const byte = p.readUint8(`kid_byte_${i}`);
            if (byte !== null) {
                kidBytes.push(byte.toString(16).padStart(2, '0'));
            } else {
                p.finalize();
                return;
            }
        }
        const kidOffset = box.details['kid_byte_0']?.offset;
        if (kidOffset !== undefined) {
            box.details['default_KID'] = {
                value: kidBytes.join(''),
                offset: kidOffset,
                length: 16,
            };
            for (let i = 0; i < 16; i++) delete box.details[`kid_byte_${i}`];
        }
    } else {
        p.addIssue('warn', `Unsupported tenc version ${version}.`);
        p.readRemainingBytes('unsupported_tenc_data');
    }

    p.finalize();
}

export const tencTooltip = {
    tenc: {
        name: 'Track Encryption Box',
        text: 'Track Encryption Box (`tenc`). Contains default encryption parameters for a track, as defined by the Common Encryption (CENC) specification. It specifies the default Key ID (KID) and Initialization Vector (IV) size.',
        ref: 'ISO/IEC 23001-7, 8.1',
    },
    'tenc@default_isProtected': {
        text: 'Indicates the default protection state. A value of 1 means samples are encrypted by default. A value of 0 means they are not, unless overridden by a sample group.',
        ref: 'ISO/IEC 23001-7, 8.1',
    },
    'tenc@default_Per_Sample_IV_Size': {
        text: 'The size in bytes of the Initialization Vector (IV) for each sample. Common values are 8 or 16. A value of 0 indicates that a constant IV is used.',
        ref: 'ISO/IEC 23001-7, 8.1',
    },
    'tenc@default_KID': {
        text: 'The default Key Identifier (KID) for the samples in this track. This UUID identifies the decryption key that should be requested from the license server.',
        ref: 'ISO/IEC 23001-7, 8.1',
    },
    'tenc@default_crypt_byte_block': {
        text: '(Legacy CENC v1) The number of encrypted blocks in a pattern for pattern encryption (e.g., "1:9" encryption).',
        ref: 'ISO/IEC 23001-7 (First Edition)',
    },
    'tenc@default_skip_byte_block': {
        text: '(Legacy CENC v1) The number of clear (skipped) blocks in a pattern for pattern encryption.',
        ref: 'ISO/IEC 23001-7 (First Edition)',
    },
};
