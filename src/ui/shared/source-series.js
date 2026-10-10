// because(domain-canvas): sanctioned N-source series palette. These literals
// never style product chrome directly — they feed ECharts series options and
// small series-swatch markers that must match their chart series. DOM badges
// for sources 0-2 must use the Heux primary/secondary/tertiary intents
// (see seriesIntent); only sources beyond three fall back to swatches, and
// success/warning/danger stay reserved for status meaning (AGENTS.md).
//
// Values are the hues already in use across src/ui/shared/charts/*
// (no color change — this module centralizes them so new views stop
// inventing per-file hex). Order is hue-distinctness for dark-theme
// readability, not assignment: existing factories keep current assignments
// until their roadmap-goal rewrite consumes this module.

export const SOURCE_SERIES_COLORS = Object.freeze([
    '#3b82f6', // blue — series 0
    '#f59e0b', // amber — series 1
    '#22c55e', // green — series 2
    '#ef4444', // red — series 3
    '#06b6d4', // cyan — series 4
    '#6366f1', // indigo — series 5
    '#38bdf8', // sky — series 6
    '#10b981', // emerald — series 7
]);

// Heux intents for DOM badges of the first three sources. Returns null past
// three — callers must render a series-color swatch, never a status intent.
export const SOURCE_SERIES_INTENTS = Object.freeze([
    'primary',
    'secondary',
    'tertiary',
]);

export function seriesColor(index) {
    return SOURCE_SERIES_COLORS[index % SOURCE_SERIES_COLORS.length];
}

export function seriesIntent(index) {
    return index < SOURCE_SERIES_INTENTS.length
        ? SOURCE_SERIES_INTENTS[index]
        : null;
}
