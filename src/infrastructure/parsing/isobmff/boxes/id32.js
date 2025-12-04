import { parseId3Tag } from '../../metadata/id3-parser.js';
import { BoxParser } from '../utils.js';

/**
 * Parses the 'ID32' (ID3v2 Metadata) box.
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseId32(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();

    // Decode language code
    const flagsInt = parseInt(box.details.flags.value, 16);
    const langBits = flagsInt & 0x7fff;
    const char1 = ((langBits >> 10) & 0x1f) + 0x60;
    const char2 = ((langBits >> 5) & 0x1f) + 0x60;
    const char3 = (langBits & 0x1f) + 0x60;
    const langValue = String.fromCharCode(char1, char2, char3);

    box.details['language'] = {
        value: langValue,
        offset: box.details.flags.offset,
        length: 2,
    };

    // Extract raw ID3 payload
    const remainingBytes = box.size - p.offset;
    if (remainingBytes > 0) {
        const id3Data = new Uint8Array(
            p.view.buffer,
            p.view.byteOffset + p.offset,
            remainingBytes
        );

        // Perform deep parsing
        const parsedId3 = parseId3Tag(id3Data);

        if (!parsedId3.error) {
            // Add structured details to the box for the inspector
            box.details['ID3 Version'] = {
                value: parsedId3.version,
                offset: p.offset,
                length: 0,
            };

            // Inject frames as individual details for the UI
            parsedId3.frames.forEach((frame, idx) => {
                const val = frame.value || frame.data || frame.owner;
                box.details[`Frame ${idx + 1} (${frame.id})`] = {
                    value: val,
                    offset: p.offset, // Approximate mapping
                    length: frame.size,
                    internal: false, // Show in UI
                };

                // Special handling for PRIV owner
                if (frame.owner) {
                    box.details[`Frame ${idx + 1} Owner`] = {
                        value: frame.owner,
                        offset: p.offset,
                        length: 0,
                        internal: true, // Hide if redundant
                    };
                }
            });
        } else {
            box.details['Parse Error'] = {
                value: parsedId3.error,
                offset: p.offset,
                length: 0,
            };
        }
    }

    p.readRemainingBytes('raw_id3_data');
    p.finalize();
}

export const id32Tooltip = {
    ID32: {
        name: 'ID3v2 Metadata Box',
        text: 'ID3v2 Box (`ID32`). Carries timed metadata. Now fully parsed to show frames like TIT2 (Title), PRIV (Private Data/SCTE-35), and TXXX (User Text).',
        ref: 'ID3v2 Specification',
    },
    'ID32@language': {
        text: 'The language of the ID3 tag content, packed into the flags field.',
        ref: 'User-defined',
    },
};
