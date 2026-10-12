/**
 * Stable identity for a feature tile. Position-independent: two renders
 * of the same feature (grouped vs flat, filtered vs unfiltered) must
 * produce the same slug, or click-to-select can never match.
 */
export const featureSlug = (feature) =>
    `${feature?.category || 'uncategorized'}::${feature?.name || 'unnamed'}`;
