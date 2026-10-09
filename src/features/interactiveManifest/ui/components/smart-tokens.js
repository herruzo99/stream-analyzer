import { SmartBadgeService } from '../../domain/smart-badge-system.js';
export {
    formatDurationPill,
    formatBytes,
    parseDuration,
} from './badges/utils.js'; // Keep for legacy if needed, or remove if unused

/**
 * Calculates detailed time information for a token.
 * Delegates to the SmartBadgeService.
 */
export const getSmartTokenDetails = (
    key,
    value,
    contextTimescale = null,
    anchorTime = null,
    pto = null,
    allAttributes = {},
    spd = null,
    now = null,
    isSpdActive = false
) => {
    const context = {
        timescale: contextTimescale,
        anchorTime,
        pto,
        allAttributes,
        spd,
        now,
        isSpdActive,
    };

    return SmartBadgeService.getDetails(key, value, context);
};

/**
 * Renders a "Smart Token" for specific attribute types.
 * Delegates to the SmartBadgeService.
 */
export const renderSmartToken = (
    key,
    value,
    contextTimescale = null,
    allAttributes = {},
    anchorTime = null,
    pto = null,
    spd = null,
    now = null,
    isSpdActive = false
) => {
    const context = {
        timescale: contextTimescale,
        anchorTime,
        pto,
        spd,
        allAttributes,
        now,
        isSpdActive,
    };

    return SmartBadgeService.renderBadge(key, value, context);
};
