/**
 * Shared MPEG-TS payload-type color indices.
 *
 * Reconstructed for the port (referenced but never committed). Semantics
 * match the pre-port `parsingService`: indices address its Tailwind-stem
 * PALETTE (see `isobmff-colors.js` for why stems matter).
 */
const TS_PACKET_COLOR_INDICES = {
    'PSI (PAT)': 1,
    'PSI (PMT)': 3,
    'PSI (CAT)': 15,
    'PSI (TSDT)': 8,
    'PSI (Private Section)': 14,
    'PSI (IPMP)': 3,
    'PSI (NIT)': 5,
    'PSI (SDT)': 5,
    'PSI (EIT)': 5,
    PES: 11,
    'PES (DSM-CC)': 12,
    Data: 6,
    'Null Packet': 0,
    'H.264 Video': 10,
    'HEVC Video': 10,
    'AAC Audio': 13,
    'ID3 Metadata': 7,
};

/** Stable palette index for a TS payload type (0 = uncolored fallback). */
export const getPacketColorIndex = (payloadType) =>
    TS_PACKET_COLOR_INDICES[payloadType] ?? 0;
