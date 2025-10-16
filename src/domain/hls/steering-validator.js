import { fetchWithRetry } from '@/application/utils/fetch';

/**
 * @typedef {object} SteeringValidationResult
 * @property {boolean} isValid - Whether the steering manifest is structurally valid.
 * @property {string[]} errors - A list of validation error messages.
 * @property {object} steeringManifest - The fetched and parsed JSON manifest.
 */

/**
 * Fetches and validates an HLS Content Steering manifest.
 * @param {string} serverUri - The URI of the steering manifest.
 * @returns {Promise<SteeringValidationResult>} The result of the validation.
 */
export async function validateSteeringManifest(serverUri) {
    const result = {
        isValid: false,
        errors: [],
        steeringManifest: null,
    };

    try {
        const response = await fetchWithRetry(serverUri);
        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status} fetching steering manifest`
            );
        }
        const manifest = await response.json();
        result.steeringManifest = manifest;

        // Validation checks based on RFC 8216bis, Section 7.2
        if (typeof manifest.VERSION !== 'number' || manifest.VERSION < 1) {
            result.errors.push(
                'Steering manifest must have a VERSION attribute of at least 1.'
            );
        }

        if (typeof manifest.TTL !== 'number' || manifest.TTL < 0) {
            result.errors.push(
                'Steering manifest must have a non-negative TTL attribute.'
            );
        }

        if (!Array.isArray(manifest['PATHWAY-PRIORITY'])) {
            result.errors.push(
                'Steering manifest must have a PATHWAY-PRIORITY array.'
            );
        } else {
            if (
                manifest['PATHWAY-PRIORITY'].some(
                    (item) => typeof item !== 'string'
                )
            ) {
                result.errors.push(
                    'All items in PATHWAY-PRIORITY must be strings.'
                );
            }
        }

        if (manifest['PATHWAY-CLONES']) {
            if (!Array.isArray(manifest['PATHWAY-CLONES'])) {
                result.errors.push(
                    'PATHWAY-CLONES, if present, must be an array.'
                );
            } else {
                manifest['PATHWAY-CLONES'].forEach((clone, i) => {
                    if (
                        typeof clone['BASE-ID'] !== 'string' ||
                        typeof clone.ID !== 'string'
                    ) {
                        result.errors.push(
                            `Pathway clone at index ${i} is missing required BASE-ID or ID.`
                        );
                    }
                });
            }
        }

        result.isValid = result.errors.length === 0;
        return result;
    } catch (error) {
        result.errors.push(
            `Failed to fetch or parse steering manifest: ${error.message}`
        );
        return result;
    }
}