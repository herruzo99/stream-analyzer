export const SETTINGS_SCHEMA_VERSION = 1;

export const SETTINGS_DEFAULTS = Object.freeze({
    networkLogLimit: 500,
    segmentCacheLimit: 50,
    eventLogLimit: 200,
    enableHighFreqStats: true,
    preserveLogsOnReload: false,
});

export const SETTINGS_LIMITS = Object.freeze({
    networkLogLimit: Object.freeze({ min: 50, max: 2000 }),
    segmentCacheLimit: Object.freeze({ min: 10, max: 500 }),
    eventLogLimit: Object.freeze({ min: 50, max: 2000 }),
});

export const SETTINGS_PRESETS = Object.freeze({
    low: Object.freeze({
        networkLogLimit: 200,
        segmentCacheLimit: 20,
        label: 'Conservative',
    }),
    medium: Object.freeze({
        networkLogLimit: 500,
        segmentCacheLimit: 50,
        label: 'Balanced',
    }),
    high: Object.freeze({
        networkLogLimit: 1000,
        segmentCacheLimit: 200,
        label: 'Performance',
    }),
});

function copyDefaults() {
    return { ...SETTINGS_DEFAULTS };
}

export function validateSettings(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { error: 'Settings must be an object.' };
    }

    const settings = copyDefaults();
    for (const [key, limits] of Object.entries(SETTINGS_LIMITS)) {
        const candidate = value[key] ?? settings[key];
        if (
            !Number.isInteger(candidate) ||
            candidate < limits.min ||
            candidate > limits.max
        ) {
            return {
                error: `${key} must be an integer from ${limits.min} to ${limits.max}.`,
            };
        }
        settings[key] = candidate;
    }

    for (const key of ['enableHighFreqStats', 'preserveLogsOnReload']) {
        const candidate = value[key] ?? settings[key];
        if (typeof candidate !== 'boolean') {
            return { error: `${key} must be true or false.` };
        }
        settings[key] = candidate;
    }

    return { settings: Object.freeze(settings) };
}

export function decodeSettingsRecord(serialized) {
    if (serialized == null || serialized === '') {
        return {
            settings: Object.freeze(copyDefaults()),
            state: 'default',
            message: null,
        };
    }

    try {
        const parsed =
            typeof serialized === 'string'
                ? JSON.parse(serialized)
                : serialized;
        const isVersioned =
            parsed &&
            typeof parsed === 'object' &&
            Object.hasOwn(parsed, 'version');
        if (isVersioned && parsed.version !== SETTINGS_SCHEMA_VERSION) {
            return {
                settings: Object.freeze(copyDefaults()),
                state: 'recovered',
                message: 'Unsupported settings version. Defaults are active.',
            };
        }
        const result = validateSettings(isVersioned ? parsed.settings : parsed);
        if (result.error) {
            return {
                settings: Object.freeze(copyDefaults()),
                state: 'recovered',
                message: 'Stored settings were invalid. Defaults are active.',
            };
        }
        return {
            settings: result.settings,
            state: isVersioned ? 'loaded' : 'migrated',
            message: isVersioned
                ? null
                : 'Legacy settings are ready to migrate.',
        };
    } catch {
        return {
            settings: Object.freeze(copyDefaults()),
            state: 'recovered',
            message: 'Stored settings were unreadable. Defaults are active.',
        };
    }
}

export function encodeSettingsRecord(settings) {
    const result = validateSettings(settings);
    if (result.error) return result;
    return {
        serialized: JSON.stringify({
            version: SETTINGS_SCHEMA_VERSION,
            settings: result.settings,
        }),
        settings: result.settings,
    };
}

export function createSettingsUpdate(current, patch) {
    return validateSettings({ ...current, ...patch });
}

export function commitSettings(storage, key, current, next) {
    const encoded = encodeSettingsRecord(next);
    if (encoded.error) {
        return {
            ok: false,
            settings: Object.freeze({ ...current }),
            lastValidSettings: Object.freeze({ ...current }),
            error: encoded.error,
        };
    }
    try {
        storage.setItem(key, encoded.serialized);
        return {
            ok: true,
            settings: encoded.settings,
            lastValidSettings: encoded.settings,
            error: null,
        };
    } catch {
        return {
            ok: false,
            settings: Object.freeze({ ...current }),
            lastValidSettings: Object.freeze({ ...current }),
            error: 'Settings could not be saved. The last valid values remain active.',
        };
    }
}

export function projectHealthState(systemHealth, browserStats) {
    const status = ['nominal', 'warning', 'critical'].includes(
        systemHealth?.status
    )
        ? systemHealth.status
        : 'warning';
    return Object.freeze({
        status,
        message:
            systemHealth?.message ??
            (status === 'nominal' ? null : 'System health needs attention.'),
        browserMetricsAvailable: browserStats != null,
        browserMessage:
            browserStats == null
                ? 'Detailed browser heap metrics are unavailable.'
                : null,
    });
}
