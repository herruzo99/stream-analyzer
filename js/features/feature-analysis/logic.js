import {
    dashFeatureDefinitions,
    hlsFeatureDefinitions,
} from './data.js';
import { analyzeDashFeatures } from '../../protocols/dash/feature-analyzer.js';
import { analyzeHlsFeatures } from '../../protocols/hls/feature-analyzer.js';

/**
 * Analyzes a manifest for feature usage.
 * This function acts as a controller, selecting the appropriate analyzer
 * based on the protocol and returning the raw results.
 * @param {import('../../core/state.js').Manifest} manifest
 * @param {'dash' | 'hls'} protocol
 * @returns {Record<string, import('../../protocols/dash/feature-analyzer.js').FeatureCheckResult>} A map of feature names to their analysis results.
 */
export function generateFeatureAnalysis(manifest, protocol) {
    if (protocol === 'dash') {
        return analyzeDashFeatures(/** @type {Element} */ (manifest.rawElement));
    } else {
        return analyzeHlsFeatures(manifest.rawElement);
    }
}

/**
 * Creates the view model by merging feature definitions with analysis results.
 * @param {Map<string, import('../../core/state.js').FeatureAnalysisResult>} analysisResultsMap
 * @param {'dash' | 'hls'} protocol
 * @returns {object[]} A list of feature objects ready for rendering.
 */
export function createFeatureViewModel(analysisResultsMap, protocol) {
    const definitions =
        protocol === 'dash' ? dashFeatureDefinitions : hlsFeatureDefinitions;

    return definitions.map((def) => {
        const result = analysisResultsMap.get(def.name) || {
            used: false,
            details: 'Not detected in manifest.',
        };
        return {
            ...def,
            ...result,
        };
    });
}