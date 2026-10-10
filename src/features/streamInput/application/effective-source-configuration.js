import { redactSourceUrl } from './source-privacy-contract.js';

export const EFFECTIVE_SOURCE_CONFIGURATION_VERSION = 1;

function canonicalValue(value) {
    if (Array.isArray(value)) return value.map(canonicalValue);
    if (
        !value ||
        typeof value !== 'object' ||
        isFile(value) ||
        isArrayBuffer(value)
    ) {
        return value;
    }
    return Object.keys(value)
        .sort()
        .reduce((result, key) => {
            result[key] = canonicalValue(value[key]);
            return result;
        }, {});
}

const DRM_SYSTEM_LABELS = Object.freeze({
    'com.widevine.alpha': 'Widevine',
    'com.microsoft.playready': 'PlayReady',
    'com.apple.fps': 'FairPlay',
});

const emptyAuth = () => ({ headers: [], queryParams: [] });
const emptyDrmAuth = () => ({
    licenseServerUrl: null,
    serverCertificate: null,
    headers: [],
    queryParams: [],
});

function normalizeEntries(entries) {
    if (!Array.isArray(entries)) return [];
    return entries.map((entry) => ({ ...entry }));
}

function normalizeAuth(auth) {
    const source = auth && typeof auth === 'object' ? auth : emptyAuth();
    return {
        ...source,
        headers: normalizeEntries(source.headers),
        queryParams: normalizeEntries(source.queryParams),
    };
}

function cloneDictionary(value) {
    if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        isArrayBuffer(value) ||
        isFile(value)
    ) {
        return value ?? null;
    }
    return { ...value };
}

function normalizeDrmAuth(drmAuth) {
    const source =
        drmAuth && typeof drmAuth === 'object' ? drmAuth : emptyDrmAuth();
    return {
        ...source,
        licenseServerUrl: cloneDictionary(source.licenseServerUrl),
        serverCertificate: cloneDictionary(source.serverCertificate),
        headers: normalizeEntries(source.headers),
        queryParams: normalizeEntries(source.queryParams),
    };
}

function normalizedDetectedDrm(input) {
    const detected = input.detectedDrm ?? input.tier0?.detectedDrm ?? [];
    return Object.freeze([
        ...new Set(Array.isArray(detected) ? detected.filter(Boolean) : []),
    ]);
}

function configuredDrmSystems(drmAuth) {
    const keys = new Set();
    for (const value of [drmAuth.licenseServerUrl, drmAuth.serverCertificate]) {
        if (!value) continue;
        if (
            typeof value === 'object' &&
            !isArrayBuffer(value) &&
            !isFile(value)
        ) {
            for (const [key, configuredValue] of Object.entries(value)) {
                if (configuredValue) keys.add(key);
            }
        } else {
            keys.add('default');
        }
    }
    return Object.freeze(
        [...keys].map((keySystem) =>
            Object.freeze({
                keySystem,
                label: DRM_SYSTEM_LABELS[keySystem] ?? keySystem,
            })
        )
    );
}

function responseLabel(input, tier0) {
    if (input.isTier0AnalysisLoading) return 'Checking';
    if (tier0.status) return `HTTP ${tier0.status}`;
    return input.file ? 'Local file' : 'Not checked';
}

export function classifyEffectiveSourceReadiness(input) {
    if (input.isTier0AnalysisLoading) {
        return { state: 'loading', label: 'Checking source' };
    }
    if (input.tier0?.status === 0) {
        return { state: 'blocked', label: 'Network check failed' };
    }
    if (input.tier0?.status >= 400) {
        return {
            state: 'blocked',
            label: `HTTP ${input.tier0.status}`,
        };
    }
    return { state: 'ready', label: 'Ready' };
}

/**
 * Build the sole normalized interpretation of an editable staged source.
 * Detection is observational; request/content-protection fields are configured
 * policy. Consumers must not substitute one for the other.
 *
 * @param {import('@/types').StreamInput | Record<string, any>} input
 */
export function deriveEffectiveSourceConfiguration(input) {
    if (!input || typeof input !== 'object') {
        throw new TypeError('A source input is required.');
    }

    const auth = normalizeAuth(input.auth);
    const drmAuth = normalizeDrmAuth(input.drmAuth);
    const detectedDrm = normalizedDetectedDrm(input);
    const configuredSystems = configuredDrmSystems(drmAuth);
    const readiness = Object.freeze(classifyEffectiveSourceReadiness(input));
    const tier0 = input.tier0 ?? {};
    const normalizedInput = Object.freeze({
        ...input,
        url: input.url || null,
        name: input.name || null,
        file: input.file || null,
        auth,
        drmAuth,
        detectedDrm,
    });

    const detection = Object.freeze({
        status: readiness.state,
        statusLabel: readiness.label,
        protocol: tier0.protocol || null,
        presentation: tier0.type || null,
        responseStatus: Number.isFinite(tier0.status) ? tier0.status : null,
        responseLabel: responseLabel(input, tier0),
        encrypted: tier0.isEncrypted === true,
        lowLatency: tier0.isLowLatency === true,
        server: tier0.server || null,
        duration: Number.isFinite(tier0.duration) ? tier0.duration : null,
        drmSystems: detectedDrm,
    });
    const requestPolicy = Object.freeze({
        headers: Object.freeze(auth.headers),
        queryParams: Object.freeze(auth.queryParams),
        headerCount: auth.headers.length,
        queryParamCount: auth.queryParams.length,
    });
    const contentProtection = Object.freeze({
        detectedSystems: detectedDrm,
        configuredSystems,
        detectedSystemCount: detectedDrm.length,
        configuredSystemCount: configuredSystems.length,
        licenseHeaders: Object.freeze(drmAuth.headers),
        licenseQueryParams: Object.freeze(drmAuth.queryParams),
        licenseHeaderCount: drmAuth.headers.length,
        licenseQueryParamCount: drmAuth.queryParams.length,
        licenseServerUrl: drmAuth.licenseServerUrl,
        serverCertificate: drmAuth.serverCertificate,
    });

    return Object.freeze({
        version: EFFECTIVE_SOURCE_CONFIGURATION_VERSION,
        id: input.id,
        identity: Object.freeze({
            id: input.id,
            name: normalizedInput.name,
            url: normalizedInput.url,
            fileName: normalizedInput.file?.name || null,
        }),
        input: normalizedInput,
        readiness,
        detection,
        requestPolicy,
        contentProtection,
        review: Object.freeze({
            readiness: readiness.state,
            requestHeaderCount: requestPolicy.headerCount,
            requestQueryParamCount: requestPolicy.queryParamCount,
            detectedDrmSystemCount: contentProtection.detectedSystemCount,
            configuredDrmSystemCount: contentProtection.configuredSystemCount,
            licenseHeaderCount: contentProtection.licenseHeaderCount,
            licenseQueryParamCount: contentProtection.licenseQueryParamCount,
        }),
    });
}

/**
 * Convert one effective source into the worker transport shape without mutating
 * the draft, including asynchronous certificate file materialization.
 *
 * @param {ReturnType<typeof deriveEffectiveSourceConfiguration> | Record<string, any>} source
 * @param {{isDebug?: boolean}} [options]
 */
export async function createEffectiveWorkerInput(source, options = {}) {
    const effective =
        source?.version === EFFECTIVE_SOURCE_CONFIGURATION_VERSION &&
        source?.input
            ? source
            : deriveEffectiveSourceConfiguration(source);
    const input = effective.input;
    const workerInput = {
        ...input,
        effectiveSourceVersion: EFFECTIVE_SOURCE_CONFIGURATION_VERSION,
        auth: {
            ...input.auth,
            headers: input.auth.headers.map((entry) => ({ ...entry })),
            queryParams: input.auth.queryParams.map((entry) => ({ ...entry })),
        },
        drmAuth: {
            ...input.drmAuth,
            headers: input.drmAuth.headers.map((entry) => ({ ...entry })),
            queryParams: input.drmAuth.queryParams.map((entry) => ({
                ...entry,
            })),
            licenseServerUrl: cloneDictionary(input.drmAuth.licenseServerUrl),
            serverCertificate: await materializeCertificate(
                input.drmAuth.serverCertificate
            ),
        },
        isDebug: options.isDebug === true,
    };
    return workerInput;
}

/**
 * @param {Array<ReturnType<typeof deriveEffectiveSourceConfiguration> | Record<string, any>>} sources
 * @param {{isDebug?: boolean}} [options]
 */
export function createEffectiveWorkerInputs(sources, options = {}) {
    return Promise.all(
        sources.map((source) => createEffectiveWorkerInput(source, options))
    );
}

/**
 * Project the configuration persisted locally before adapter-specific file
 * handling or privacy policy is applied.
 */
export function projectPersistableEffectiveSource(source) {
    const effective =
        source?.version === EFFECTIVE_SOURCE_CONFIGURATION_VERSION &&
        source?.input
            ? source
            : deriveEffectiveSourceConfiguration(source);
    const { input } = effective;
    return {
        effectiveSourceVersion: EFFECTIVE_SOURCE_CONFIGURATION_VERSION,
        url: input.url,
        name: input.name,
        auth: normalizeAuth(input.auth),
        drmAuth: normalizeDrmAuth(input.drmAuth),
    };
}

export function createEffectiveSourceFingerprint(source) {
    const persistable = projectPersistableEffectiveSource(source);
    const withoutTransientIds = (entries) =>
        entries.map(({ id: _id, ...entry }) => entry);
    return JSON.stringify(
        canonicalValue({
            url: persistable.url,
            auth: {
                ...persistable.auth,
                headers: withoutTransientIds(persistable.auth.headers),
                queryParams: withoutTransientIds(persistable.auth.queryParams),
            },
            drmAuth: {
                ...persistable.drmAuth,
                headers: withoutTransientIds(persistable.drmAuth.headers),
                queryParams: withoutTransientIds(
                    persistable.drmAuth.queryParams
                ),
            },
        })
    );
}

/**
 * Canonical, adapter-independent configuration used by invariant tests and
 * technical Review rendering. Detection is deliberately excluded because it is
 * observed evidence, not executable request policy.
 */
export function projectEffectiveConfigurationSnapshot(source) {
    const effective =
        source?.version === EFFECTIVE_SOURCE_CONFIGURATION_VERSION &&
        source?.input
            ? source
            : deriveEffectiveSourceConfiguration(source);
    return Object.freeze({
        version: EFFECTIVE_SOURCE_CONFIGURATION_VERSION,
        identity: Object.freeze({
            name: effective.identity.name,
            url: effective.identity.url,
            fileName: effective.identity.fileName,
        }),
        request: Object.freeze({
            headers: Object.freeze(
                effective.requestPolicy.headers.map((entry) => ({ ...entry }))
            ),
            queryParams: Object.freeze(
                effective.requestPolicy.queryParams.map((entry) => ({
                    ...entry,
                }))
            ),
        }),
        protection: Object.freeze({
            licenseServerUrl: cloneDictionary(
                effective.contentProtection.licenseServerUrl
            ),
            serverCertificate: cloneDictionary(
                effective.contentProtection.serverCertificate
            ),
            headers: Object.freeze(
                effective.contentProtection.licenseHeaders.map((entry) => ({
                    ...entry,
                }))
            ),
            queryParams: Object.freeze(
                effective.contentProtection.licenseQueryParams.map((entry) => ({
                    ...entry,
                }))
            ),
        }),
    });
}

export function projectPrivacyRedactedConfigurationSnapshot(source) {
    const snapshot = projectEffectiveConfigurationSnapshot(source);
    const redacted = snapshot.identity.url
        ? redactSourceUrl(snapshot.identity.url)
        : { url: null };
    return Object.freeze({
        version: snapshot.version,
        identity: Object.freeze({
            ...snapshot.identity,
            url: redacted.url,
        }),
        request: Object.freeze({
            headers: Object.freeze([]),
            queryParams: Object.freeze([]),
        }),
        protection: Object.freeze({
            licenseServerUrl: null,
            serverCertificate: null,
            headers: Object.freeze([]),
            queryParams: Object.freeze([]),
        }),
    });
}

/**
 * Project the intentionally privacy-redacted subset allowed in share URLs.
 */
export function projectShareableEffectiveSource(source) {
    const effective =
        source?.version === EFFECTIVE_SOURCE_CONFIGURATION_VERSION &&
        source?.input
            ? source
            : deriveEffectiveSourceConfiguration(source);
    if (!effective.identity.url) return null;
    const redacted = redactSourceUrl(effective.identity.url);
    return Object.freeze({
        version: EFFECTIVE_SOURCE_CONFIGURATION_VERSION,
        url: redacted.url,
        name: effective.identity.name,
        privacy: Object.freeze({
            status: redacted.redactedFields.length ? 'redacted' : 'public',
            fields: redacted.redactedFields,
        }),
    });
}

async function materializeCertificate(value) {
    if (isFile(value)) return value.arrayBuffer();
    if (
        !value ||
        typeof value !== 'object' ||
        isArrayBuffer(value) ||
        ArrayBuffer.isView(value)
    ) {
        return value ?? null;
    }

    const materialized = {};
    for (const [key, certificate] of Object.entries(value)) {
        materialized[key] = isFile(certificate)
            ? await certificate.arrayBuffer()
            : certificate;
    }
    return materialized;
}

function isFile(value) {
    return typeof File !== 'undefined' && value instanceof File;
}

function isArrayBuffer(value) {
    return typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer;
}
