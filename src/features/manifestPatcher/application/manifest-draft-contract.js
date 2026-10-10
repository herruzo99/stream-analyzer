import { redactNetworkUrl } from '@/features/networkAnalysis/application/network-contract.js';

export const MANIFEST_DRAFT_VERSION = 'sa-manifest-draft/1';
export const PATCH_RULE_VERSION = 'sa-patch-rule/1';
export const MANIFEST_SOURCE_VERSION = 'sa-manifest-source/1';
export const MANIFEST_RESULT_VERSION = 'sa-manifest-result/1';

export const MANIFEST_DRAFT_LIMITS = Object.freeze({
    rules: 64,
    sourceCharacters: 1_048_576,
    targetCharacters: 4_096,
    replacementCharacters: 8_192,
    outputCharacters: 1_048_576,
    previewCharacters: 24_000,
    errors: 64,
});

const SECRET_TEXT =
    /\b(authorization|bearer|credential|password|secret|token)\b\s*[:=]?\s*[^\s,;]+/gi;
const URL_TEXT = /https?:\/\/[^\s"'<>]+/gi;

function hashText(value) {
    let hash = 2166136261;
    for (const character of value) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

const stableId = (prefix, value) => `${prefix}-${hashText(String(value))}`;
const text = (value) => String(value ?? '');

function redactPreview(value) {
    return text(value)
        .replace(URL_TEXT, (url) => redactNetworkUrl(url))
        .replace(SECRET_TEXT, '$1=[redacted]')
        .slice(0, MANIFEST_DRAFT_LIMITS.previewCharacters);
}

function unavailable(reason) {
    return Object.freeze({
        contractVersion: MANIFEST_DRAFT_VERSION,
        ruleVersion: PATCH_RULE_VERSION,
        sourceVersion: MANIFEST_SOURCE_VERSION,
        resultVersion: MANIFEST_RESULT_VERSION,
        state: 'unavailable',
        reason,
        draftId: '',
        sourceId: '',
        sourceHash: '',
        resultId: '',
        protocol: '',
        totalRuleCount: 0,
        visibleRuleCount: 0,
        truncated: false,
        sourceUnchanged: true,
        hasChanges: false,
        rules: Object.freeze([]),
        errors: Object.freeze([]),
        preview: '',
        exportContent: '',
    });
}

/**
 * Creates a bounded immutable editor draft without mutating stream state.
 * @param {import('@/types').Stream | null | undefined} stream
 * @param {Array<{id?: string, type?: string, target?: string, replacement?: string, active?: boolean}>} [inputRules]
 */
export function createManifestDraft(
    stream,
    inputRules = stream?.patchRules ?? []
) {
    if (!stream) return unavailable('Select an active stream to edit.');

    const source = text(stream.rawManifest);
    if (!source)
        return unavailable('The selected stream has no source manifest.');

    const protocol = text(stream.protocol).toLowerCase();
    const errors = [];
    const sourceTooLarge =
        source.length > MANIFEST_DRAFT_LIMITS.sourceCharacters;
    if (sourceTooLarge)
        errors.push({
            errorId: 'source-too-large',
            ruleId: '',
            field: 'source',
            message: `Source exceeds ${MANIFEST_DRAFT_LIMITS.sourceCharacters} characters.`,
        });
    if (!['dash', 'hls'].includes(protocol))
        errors.push({
            errorId: 'unsupported-protocol',
            ruleId: '',
            field: 'source',
            message: 'Only DASH and HLS manifests can be patched.',
        });

    const rawRules = Array.isArray(inputRules) ? inputRules : [];
    if (!Array.isArray(inputRules))
        errors.push({
            errorId: 'rules-unavailable',
            ruleId: '',
            field: 'rules',
            message: 'Patch rules must be an ordered list.',
        });
    if (rawRules.length > MANIFEST_DRAFT_LIMITS.rules)
        errors.push({
            errorId: 'too-many-rules',
            ruleId: '',
            field: 'rules',
            message: `At most ${MANIFEST_DRAFT_LIMITS.rules} rules are allowed.`,
        });

    const projectedRules = rawRules
        .slice(0, MANIFEST_DRAFT_LIMITS.rules)
        .map((rule, index) => {
            const type = rule?.type === 'regex' ? 'regex' : 'string';
            const target = text(rule?.target);
            const replacement = text(rule?.replacement);
            const active = rule?.active !== false;
            const ruleId = stableId(
                'sa-patch-rule',
                `${index}:${type}:${target}:${replacement}:${active}:${PATCH_RULE_VERSION}`
            );

            if (!['string', 'regex'].includes(text(rule?.type)))
                errors.push({
                    errorId: `${ruleId}-type`,
                    ruleId,
                    field: 'type',
                    message: `Rule ${index + 1} has an unsupported type.`,
                });
            if (active && !target)
                errors.push({
                    errorId: `${ruleId}-target`,
                    ruleId,
                    field: 'target',
                    message: `Rule ${index + 1} needs a match value.`,
                });
            if (target.length > MANIFEST_DRAFT_LIMITS.targetCharacters)
                errors.push({
                    errorId: `${ruleId}-target-size`,
                    ruleId,
                    field: 'target',
                    message: `Rule ${index + 1} match value is too long.`,
                });
            if (
                replacement.length > MANIFEST_DRAFT_LIMITS.replacementCharacters
            )
                errors.push({
                    errorId: `${ruleId}-replacement-size`,
                    ruleId,
                    field: 'replacement',
                    message: `Rule ${index + 1} replacement is too long.`,
                });
            if (active && type === 'regex' && target) {
                try {
                    new RegExp(target, 'g');
                } catch (_error) {
                    errors.push({
                        errorId: `${ruleId}-regex`,
                        ruleId,
                        field: 'target',
                        message: `Rule ${index + 1} has an invalid regular expression.`,
                    });
                }
            }

            return Object.freeze({
                contractVersion: PATCH_RULE_VERSION,
                ruleId,
                index,
                type,
                target: target.slice(0, MANIFEST_DRAFT_LIMITS.targetCharacters),
                replacement: replacement.slice(
                    0,
                    MANIFEST_DRAFT_LIMITS.replacementCharacters
                ),
                active,
            });
        });

    const boundedErrors = errors
        .slice(0, MANIFEST_DRAFT_LIMITS.errors)
        .map((error) => Object.freeze(error));
    let patched = source;
    if (boundedErrors.length === 0) {
        for (const rule of projectedRules) {
            if (!rule.active) continue;
            if (rule.type === 'regex')
                patched = patched.replace(
                    new RegExp(rule.target, 'g'),
                    rule.replacement
                );
            else patched = patched.split(rule.target).join(rule.replacement);
            if (patched.length > MANIFEST_DRAFT_LIMITS.outputCharacters) {
                boundedErrors.push(
                    Object.freeze({
                        errorId: 'output-too-large',
                        ruleId: rule.ruleId,
                        field: 'replacement',
                        message: `Patched output exceeds ${MANIFEST_DRAFT_LIMITS.outputCharacters} characters.`,
                    })
                );
                patched = '';
                break;
            }
        }
    }

    const sourceId = stableId(
        'sa-manifest-source',
        `${stream.id ?? 'stream'}:${protocol}:${hashText(source)}:${MANIFEST_SOURCE_VERSION}`
    );
    const ruleSeed = projectedRules
        .map(({ ruleId, active }) => `${ruleId}:${active}`)
        .join('|');
    const state =
        boundedErrors.length > 0
            ? 'invalid'
            : projectedRules.length === 0
              ? 'empty'
              : 'valid';
    const resultId =
        state === 'invalid'
            ? ''
            : stableId(
                  'sa-manifest-result',
                  `${sourceId}:${hashText(patched)}:${MANIFEST_RESULT_VERSION}`
              );
    const draftId = stableId(
        'sa-manifest-draft',
        `${sourceId}:${ruleSeed}:${state}:${MANIFEST_DRAFT_VERSION}`
    );
    const truncated =
        sourceTooLarge ||
        rawRules.length > MANIFEST_DRAFT_LIMITS.rules ||
        boundedErrors.length < errors.length ||
        patched.length > MANIFEST_DRAFT_LIMITS.previewCharacters;

    return Object.freeze({
        contractVersion: MANIFEST_DRAFT_VERSION,
        ruleVersion: PATCH_RULE_VERSION,
        sourceVersion: MANIFEST_SOURCE_VERSION,
        resultVersion: MANIFEST_RESULT_VERSION,
        state,
        reason:
            state === 'invalid'
                ? 'Resolve every validation error before applying or exporting.'
                : state === 'empty'
                  ? 'Add a rule to produce a patched manifest.'
                  : '',
        draftId,
        sourceId,
        sourceHash: stableId('sa-manifest-hash', hashText(source)),
        resultId,
        protocol,
        totalRuleCount: rawRules.length,
        visibleRuleCount: projectedRules.length,
        truncated,
        sourceUnchanged: stream.rawManifest === source,
        hasChanges: state !== 'invalid' && patched !== source,
        rules: Object.freeze(projectedRules),
        errors: Object.freeze(boundedErrors),
        preview: state === 'invalid' ? '' : redactPreview(patched),
        exportContent: state === 'invalid' ? '' : patched,
    });
}
