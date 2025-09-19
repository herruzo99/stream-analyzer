import { featureDefinitions } from './data.js';
import { analyzeDashFeatures } from '../../protocols/dash/feature-analyzer.js';

/**
 * Analyzes a manifest for feature usage and produces a view model.
 * This function acts as a controller, selecting the appropriate analyzer
 * based on the protocol.
 * @param {import('../../state.js').Manifest} manifest
 * @returns {object[]} A list of feature objects ready for rendering.
 */
export function generateFeatureAnalysis(manifest) {
    // In the future, a protocol detection mechanism would go here.
    // For now, we assume DASH.
    const analysisResults = analyzeDashFeatures(manifest.rawElement);

    const viewModel = featureDefinitions.map((def) => {
        const result = analysisResults[def.name] || {
            used: false,
            details: 'Check not implemented.',
        };
        return {
            ...def,
            ...result,
        };
    });

    return viewModel;
}