export const NOTIFICATION_SETTINGS_SCHEMA = 'sa-notification-settings/1';
export const NOTIFICATION_SETTINGS_KEY =
    'stream-analyzer_notification_settings';
export const NOTIFICATION_TYPES = Object.freeze([
    'playerError',
    'seekPollSuccess',
    'pollingDisabled',
    'qcAnalysisComplete',
]);

const DEFAULT_SETTINGS = Object.freeze(
    {
        playerError: true,
        seekPollSuccess: true,
        pollingDisabled: true,
        qcAnalysisComplete: true,
    }
);

/**
 * @typedef {object} NotificationSettings
 * @property {boolean} playerError
 * @property {boolean} seekPollSuccess
 * @property {boolean} pollingDisabled
 * @property {boolean} qcAnalysisComplete
 */

export const NOTIFICATION_LIMITS = Object.freeze({
    title: 96,
    body: 240,
    dedupeWindowMs: 5000,
});

/** @returns {NotificationSettings} */
export function getDefaultNotificationSettings() {
    return { ...DEFAULT_SETTINGS };
}

/** @returns {NotificationSettings} */
export function normalizeNotificationSettings(candidate) {
    const source =
        candidate && typeof candidate === 'object' ? candidate : Object.create(null);
    return {
        playerError:
            typeof source.playerError === 'boolean'
                ? source.playerError
                : DEFAULT_SETTINGS.playerError,
        seekPollSuccess:
            typeof source.seekPollSuccess === 'boolean'
                ? source.seekPollSuccess
                : DEFAULT_SETTINGS.seekPollSuccess,
        pollingDisabled:
            typeof source.pollingDisabled === 'boolean'
                ? source.pollingDisabled
                : DEFAULT_SETTINGS.pollingDisabled,
        qcAnalysisComplete:
            typeof source.qcAnalysisComplete === 'boolean'
                ? source.qcAnalysisComplete
                : DEFAULT_SETTINGS.qcAnalysisComplete,
    };
}

/**
 * @returns {{ settings: NotificationSettings, persistence: 'default' | 'loaded' | 'migrated' | 'recovered' }}
 */
export function loadNotificationSettings(storage) {
    try {
        const serialized = storage?.getItem(NOTIFICATION_SETTINGS_KEY);
        if (!serialized) {
            return {
                settings: getDefaultNotificationSettings(),
                persistence: 'default',
            };
        }

        const parsed = JSON.parse(serialized);
        const versioned = parsed?.schema === NOTIFICATION_SETTINGS_SCHEMA;
        const settings = normalizeNotificationSettings(
            versioned ? parsed.settings : parsed
        );
        return {
            settings,
            persistence: versioned ? 'loaded' : 'migrated',
        };
    } catch {
        return {
            settings: getDefaultNotificationSettings(),
            persistence: 'recovered',
        };
    }
}

/**
 * @returns {{ settings: NotificationSettings, persistence: 'saved' | 'save-error' }}
 */
export function saveNotificationSettings(storage, settings) {
    try {
        const normalized = normalizeNotificationSettings(settings);
        storage?.setItem(
            NOTIFICATION_SETTINGS_KEY,
            JSON.stringify({
                schema: NOTIFICATION_SETTINGS_SCHEMA,
                settings: normalized,
            })
        );
        return { settings: normalized, persistence: 'saved' };
    } catch {
        return {
            settings: normalizeNotificationSettings(settings),
            persistence: 'save-error',
        };
    }
}

function redactSensitiveText(value) {
    return String(value ?? '')
        .replace(/([?&](?:token|key|secret|password|signature|auth)=)[^&#\s]+/gi, '$1[redacted]')
        .replace(/\b(?:https?:\/\/)?(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)(?::\d+)?(?:\/[^\s]*)?/gi, '[private-url]')
        .replace(/\b(?:bearer\s+)[a-z0-9._~+/-]+=*/gi, 'Bearer [redacted]');
}

function boundedText(value, maximum) {
    const normalized = redactSensitiveText(value).replace(/\s+/g, ' ').trim();
    return normalized.length <= maximum
        ? normalized
        : `${normalized.slice(0, Math.max(0, maximum - 1))}…`;
}

export function createNotificationPayload(type, title, body) {
    if (!NOTIFICATION_TYPES.includes(type)) return null;
    return Object.freeze({
        type,
        title: boundedText(title, NOTIFICATION_LIMITS.title),
        body: boundedText(body, NOTIFICATION_LIMITS.body),
        tag: `stream-analyzer:${type}`,
    });
}
