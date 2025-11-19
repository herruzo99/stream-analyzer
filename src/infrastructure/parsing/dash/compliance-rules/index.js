import {} from '../../utils/recursive-parser.js';
import { structureRules } from './structure.js';
import { liveRules } from './live.js';
import { segmentRules } from './segments.js';
import { profileRules } from './profiles.js';
import { bestPracticeRules } from './best-practices.js';

/**
 * @typedef {'error' | 'warn' | 'info' | 'pass' | 'fail'} CheckStatus
 */

/**
 * @typedef {'Manifest Structure' | 'Live Stream Properties' | 'Segment & Timing Info' | 'Profile Conformance' | 'General Best Practices' | 'HLS Structure' | 'Encryption' | 'Interoperability'} RuleCategory
 */

/**
 * @typedef {'MPD' | 'Period' | 'AdaptationSet' | 'Representation' | 'Playlist'} RuleScope
 */

/**
 * @typedef {object} Rule
 * @property {string} id - A unique identifier for the rule.
 * @property {string} text - The human-readable title of the check.
 * @property {string} isoRef - The reference to the ISO/IEC 23009-1:2022 standard clause.
 * @property {CheckStatus} severity - The status to assign if the check fails ('fail' or 'warn').
 * @property {RuleScope} scope - The MPD element level this rule applies to.
 * @property {string[]} profiles - An array of DASH profiles this rule applies to. 'common' for general applicability.
 * @property {(element: object, context: object) => boolean | 'skip'} check - The function that performs the validation. Returns `true` for pass, `false` for fail/warn, or `'skip'` if not applicable.
 * @property {string | ((element: object, context: object) => string)} passDetails - Details for a passing check.
 * @property {string | ((element: object, context: object) => string)} failDetails - Details for a failing or warning check.
 * @property {RuleCategory} category
 */

/** @type {Rule[]} */
export const rules = [
    ...structureRules,
    ...liveRules,
    ...segmentRules,
    ...profileRules,
    ...bestPracticeRules,
];
