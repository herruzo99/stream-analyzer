import { featureDefinitions } from './data.js';
import { analyzeDashFeatures } from '../../protocols/dash/feature-analyzer.js';
import { analyzeHlsFeatures } from '../../protocols/hls/feature-analyzer.js';

/**
 * Analyzes a manifest for feature usage and produces a view model.
 * This function acts as a controller, selecting the appropriate analyzer
 * based on the protocol.
 * @param {import('../../state.js').Manifest} manifest
 * @param {'dash' | 'hls'} protocol
 * @returns {object[]} A list of feature objects ready for rendering.
 */
export function generateFeatureAnalysis(manifest, protocol) {
    let analysisResults = {};

    if (protocol === 'dash') {
        analysisResults = analyzeDashFeatures(
            /** @type {Element} */ (manifest.rawElement)
        );
    } else {
        analysisResults = analyzeHlsFeatures(manifest.rawElement);
    }

    const viewModel = featureDefinitions.map((def) => {
        const result = analysisResults[def.name] || {
            used: false,
            details: 'Check not applicable for this protocol.',
        };
        return {
            ...def,
            ...result,
        };
    });

    return viewModel;
}