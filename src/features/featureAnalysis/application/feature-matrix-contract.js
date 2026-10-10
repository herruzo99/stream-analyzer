import { dashFeatureDefinitions } from '@/infrastructure/parsing/dash/feature-definitions';
import { hlsFeatureDefinitions } from '@/infrastructure/parsing/hls/feature-definitions';

export const FEATURE_MATRIX_VERSION = 'sa-feature-matrix/1';
export const FEATURE_RESULT_VERSION = 'sa-feature-result/1';
export const FEATURE_SOURCE_VERSION = 'sa-feature-source/1';
export const FEATURE_MATRIX_LIMITS = Object.freeze({
    categories: 12,
    features: 96,
    name: 120,
    description: 640,
    reference: 160,
    details: 1024,
});
export const HLS_STANDARD_VERSIONS = Object.freeze(
    [...new Set(hlsFeatureDefinitions.map(({ version }) => version))].sort(
        (left, right) => left - right
    )
);

const record = (value) =>
    value && typeof value === 'object' && !Array.isArray(value) ? value : null;

const stableId = (prefix, seed) => {
    let hash = 2166136261;
    for (const character of seed) {
        hash ^= character.codePointAt(0) ?? 0;
        hash = Math.imul(hash, 16777619);
    }
    return `${prefix}-${(hash >>> 0).toString(16).padStart(8, '0')}`;
};

const boundedText = (value, limit, observation) => {
    const text = String(value ?? '');
    if (text.length <= limit) return text;
    observation.truncated = true;
    return text.slice(0, limit);
};

const unavailable = (reason) =>
    Object.freeze({
        contractVersion: FEATURE_MATRIX_VERSION,
        resultVersion: FEATURE_RESULT_VERSION,
        sourceVersion: FEATURE_SOURCE_VERSION,
        state: 'unavailable',
        reason,
    });

const error = (reason) =>
    Object.freeze({
        contractVersion: FEATURE_MATRIX_VERSION,
        resultVersion: FEATURE_RESULT_VERSION,
        sourceVersion: FEATURE_SOURCE_VERSION,
        state: 'error',
        reason,
    });

/**
 * Builds the bounded, immutable, application-owned Feature Matrix projection.
 * @param {import('@/types').Stream | null | undefined} stream
 * @param {unknown} selectedStandardVersion
 * @param {boolean} hideUnused
 */
export function createFeatureMatrix(
    stream,
    selectedStandardVersion,
    hideUnused = false
) {
    if (!stream)
        return unavailable('Analyze a stream to create a feature matrix.');

    const analysis = record(stream.featureAnalysis);
    if (!analysis || !(analysis.results instanceof Map))
        return error('Feature analysis results are unavailable or malformed.');

    const protocol = String(stream.protocol ?? '').toLowerCase();
    if (protocol !== 'hls' && protocol !== 'dash')
        return error(
            'The stream protocol is not supported by the feature matrix.'
        );

    const observation = { truncated: false, malformed: false };
    const requestedVersion = Number(selectedStandardVersion);
    const standardVersion =
        protocol === 'hls' && Number.isFinite(requestedVersion)
            ? Math.max(1, Math.floor(requestedVersion))
            : protocol === 'hls'
              ? Math.max(...HLS_STANDARD_VERSIONS)
              : null;
    if (protocol === 'hls' && !Number.isFinite(requestedVersion))
        observation.malformed = true;

    const definitions = (
        protocol === 'hls'
            ? hlsFeatureDefinitions.filter(
                  ({ version }) => version <= standardVersion
              )
            : dashFeatureDefinitions
    ).slice(0, FEATURE_MATRIX_LIMITS.features);
    const sourceDefinitions =
        protocol === 'hls'
            ? hlsFeatureDefinitions.filter(
                  ({ version }) => version <= standardVersion
              )
            : dashFeatureDefinitions;
    if (definitions.length < sourceDefinitions.length)
        observation.truncated = true;

    let weightedUsed = 0;
    let weightedTotal = 0;
    const projected = definitions.map((definition, index) => {
        const rawResult = analysis.results.get(definition.name);
        const result = rawResult === undefined ? null : record(rawResult);
        if (rawResult !== undefined && !result) observation.malformed = true;
        const used = result?.used === true;
        const complexity = Math.min(
            5,
            Math.max(1, Number(definition.complexityScore) || 1)
        );
        weightedTotal += complexity;
        if (used) weightedUsed += complexity;
        const name = boundedText(
            definition.name,
            FEATURE_MATRIX_LIMITS.name,
            observation
        );
        const category = boundedText(
            definition.category,
            FEATURE_MATRIX_LIMITS.name,
            observation
        );
        const details = boundedText(
            result?.details ?? 'Not detected in manifest.',
            FEATURE_MATRIX_LIMITS.details,
            observation
        );
        return Object.freeze({
            id: stableId(
                'sa-feature',
                `${protocol}:${standardVersion ?? 'all'}:${index}:${name}`
            ),
            name,
            category,
            description: boundedText(
                definition.desc,
                FEATURE_MATRIX_LIMITS.description,
                observation
            ),
            reference: boundedText(
                definition.isoRef,
                FEATURE_MATRIX_LIMITS.reference,
                observation
            ),
            complexity,
            used,
            details,
        });
    });

    const visibleFeatures = hideUnused
        ? projected.filter(({ used }) => used)
        : projected;
    const categories = [];
    for (const feature of visibleFeatures) {
        let category = categories.find(({ name }) => name === feature.category);
        if (!category) {
            if (categories.length >= FEATURE_MATRIX_LIMITS.categories) {
                observation.truncated = true;
                continue;
            }
            category = { name: feature.category, features: [] };
            categories.push(category);
        }
        category.features.push(feature);
    }
    const frozenCategories = Object.freeze(
        categories.map(({ name, features }, index) =>
            Object.freeze({
                id: stableId('sa-feature-category', `${index}:${name}`),
                name,
                activeCount: features.filter(({ used }) => used).length,
                totalCount: features.length,
                features: Object.freeze([...features]),
            })
        )
    );
    const score =
        weightedTotal > 0
            ? Math.round((weightedUsed / weightedTotal) * 100)
            : 0;
    const sourceIdentity = stableId(
        'sa-feature-source',
        `${stream.id}:${stream.activeManifestUpdateId ?? ''}:${protocol}:${standardVersion ?? 'all'}`
    );
    const resultSeed = projected
        .map(({ id, used, details }) => `${id}:${used}:${details}`)
        .join('|');
    const state =
        observation.truncated || observation.malformed ? 'partial' : 'complete';

    return Object.freeze({
        contractVersion: FEATURE_MATRIX_VERSION,
        resultVersion: FEATURE_RESULT_VERSION,
        sourceVersion: FEATURE_SOURCE_VERSION,
        matrixId: stableId(
            'sa-feature-matrix',
            `${sourceIdentity}:${hideUnused}:${FEATURE_MATRIX_VERSION}`
        ),
        resultId: stableId('sa-feature-result', resultSeed),
        sourceIdentity,
        deterministic: true,
        state,
        reason:
            state === 'partial'
                ? 'Some source values were malformed or exceeded matrix bounds.'
                : '',
        protocol,
        standardVersion,
        hideUnused,
        manifestCount: Math.max(0, Number(analysis.manifestCount) || 0),
        score,
        scoreLabel:
            score > 75 ? 'Advanced' : score > 40 ? 'Intermediate' : 'Basic',
        activeCount: projected.filter(({ used }) => used).length,
        totalCount: projected.length,
        visibleCount: visibleFeatures.length,
        truncated: observation.truncated,
        features: Object.freeze([...projected]),
        categories: frozenCategories,
    });
}
