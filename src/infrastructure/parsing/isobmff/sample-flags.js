export const IS_LEADING_MAP = {
    0: 'Unknown',
    1: 'Leading with dependency (not decodable)',
    2: 'Not a leading sample',
    3: 'Leading with no dependency (decodable)',
};

export const SAMPLE_DEPENDS_ON_MAP = [
    'Unknown',
    'Depends on others (not an I-picture)',
    'Does not depend on others (I-picture)',
    'Reserved',
];
export const SAMPLE_IS_DEPENDED_ON_MAP = [
    'Unknown',
    'Others may depend on this sample',
    'No other sample depends on this one (disposable)',
    'Reserved',
];
export const SAMPLE_HAS_REDUNDANCY_MAP = [
    'Unknown',
    'Has redundant coding',
    'No redundant coding',
    'Reserved',
];

/**
 * Decodes a 32-bit sample flags integer into a structured object with numeric values.
 * This is a more robust implementation that avoids string-based logic.
 * @param {number} flagsInt - The raw 32-bit integer for the flags.
 * @returns {object} A structured object with decoded flag properties.
 */
export function decodeSampleFlags(flagsInt) {
    const is_leading = (flagsInt >> 26) & 0x03;
    const sample_depends_on = (flagsInt >> 24) & 0x03;
    const sample_is_depended_on = (flagsInt >> 22) & 0x03;
    const sample_has_redundancy = (flagsInt >> 20) & 0x03;
    const sample_padding_value = (flagsInt >> 17) & 0x07;
    const sample_is_non_sync_sample = ((flagsInt >> 16) & 0x01) === 1;
    const sample_degradation_priority = flagsInt & 0xffff;

    // Architectural Refinement: Return numeric values directly.
    // The rendering logic is now responsible for converting these to human-readable strings.
    // This makes the parser more robust and decouples it from the UI.
    return {
        is_leading,
        sample_depends_on,
        sample_is_depended_on,
        sample_has_redundancy,
        sample_padding_value,
        sample_is_non_sync_sample,
        sample_degradation_priority,
    };
}
