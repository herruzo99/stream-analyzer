// A model for the Transport Stream System Target Decoder (T-STD)
// as specified in ISO/IEC 13818-1, Clause 2.4.2.

/**
 * Calculates the leak rate (Rxn) for a given stream type.
 * @param {string | null} streamTypeHexString - The stream_type from the PMT.
 * @returns {number} The leak rate in bits per second.
 */
function getRxn(streamTypeHexString) {
    if (!streamTypeHexString) return 2000000; // Default for unknown/other
    const streamType = parseInt(streamTypeHexString, 16);

    switch (streamType) {
        case 0x01: // MPEG-1 Video
        case 0x02: // MPEG-2 Video
            // This would require profile/level parsing from video headers.
            // Using a conservative high value for now. Rmax * 1.2
            return 80000000 * 1.2;
        case 0x03: // MPEG-1 Audio
        case 0x04: // MPEG-2 Audio
            return 2000000;
        case 0x0f: // AAC Audio (ADTS)
            // A more complex calculation based on channels is needed.
            // Using a conservative value for up to 8 channels.
            return 5529600;
        case 0x1b: // H.264/AVC Video
            // MaxBR[level] * 1200
            return 62500000 * 1.2; // Level 5.1
        case 0x24: // H.265/HEVC Video
            // BrNalFactor × MaxBR[tier, level]
            return 160000000 * 1.2; // Main Tier, Level 5.1
        default:
            return 2000000; // Default system data rate
    }
}

/**
 * Initializes a T-STD model for a program.
 * @param {object} program - A program object from the parsed PAT/PMT.
 * @returns {object} The initialized T-STD model.
 */
export function createTstdModel(program) {
    const model = {
        transport_rate: 20000000, // Default/initial rate, will be updated dynamically
        buffers: {},
    };

    Object.keys(program.streams).forEach((pid) => {
        const streamType = program.streams[pid];
        model.buffers[pid] = {
            TBn: { size: 512, fullness: 0 }, // Transport Buffer, 512 bytes
            Rxn: getRxn(streamType), // Leak rate from TBn in bps
        };
    });

    return model;
}
