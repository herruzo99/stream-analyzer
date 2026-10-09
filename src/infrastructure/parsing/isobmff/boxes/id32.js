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

    // The 'id32' box extends FullBox, so it has version (1 byte) and flags (3 bytes).
    // Immediately following that is a 16-bit language code (ISO-639-2/T).
    // The previous implementation incorrectly tried to extract language from flags.

    const langInt = p.readUint16('language');
    let langValue = 'und';

    if (langInt !== null) {
        const char1 = ((langInt >> 10) & 0x1f) + 0x60;
        const char2 = ((langInt >> 5) & 0x1f) + 0x60;
        const char3 = (langInt & 0x1f) + 0x60;
        langValue = String.fromCharCode(char1, char2, char3);

        // Update the detail to show the decoded string
        box.details['language'].value = langValue;
    }

    // Extract raw ID3 payload
    // The ID3 data starts immediately after the language field.
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
                let val = frame.value || frame.data || frame.owner;

                // Enhance value display for frames with descriptions
                if (frame.description) {
                    val = `[${frame.description}] ${val}`;
                }
                if (frame.language) {
                    val = `(${frame.language}) ${val}`;
                }

                box.details[`Frame ${idx + 1} (${frame.id})`] = {
                    value: val,
                    offset: box.offset + p.offset + frame.offset, // Correct absolute offset
                    length: frame.size + 10, // Include header (10 bytes)
                    internal: false, // Show in UI
                };

                // Special handling for PRIV owner - make it visible as a sub-field
                if (frame.owner) {
                    box.details[`Frame ${idx + 1} Owner`] = {
                        value: frame.owner,
                        offset: box.offset + p.offset + frame.offset + 10, // Start of content
                        length: frame.owner.length,
                        internal: false, // Show in UI now
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

    // p.readRemainingBytes('raw_id3_data'); // Removed as requested
    p.finalize();
}

export const id32Tooltip = {
    ID32: {
        name: 'ID3v2 Metadata Box',
        text: 'ID3v2 Box (`ID32`). Carries timed metadata in ID3v2 format. Commonly used for transporting timed metadata like SCTE-35 markers or program information in HLS/DASH streams.',
        ref: 'ISO/IEC 23001-18',
    },
    'ID32@language': {
        text: 'ISO-639-2/T language code for the metadata.',
        ref: 'ISO 639-2',
    },
};
