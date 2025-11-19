import { createStore } from 'zustand/vanilla';
import { eventBus } from '@/application/event-bus';
import { EVENTS } from '@/types/events';

const SETTINGS_KEY = 'stream-analyzer_notification_settings';

/**
 * @typedef {'playerError' | 'seekPollSuccess' | 'pollingDisabled'} NotificationType
 */

/**
 * @typedef {object} NotificationSettings
 * @property {boolean} playerError
 * @property {boolean} seekPollSuccess
 * @property {boolean} pollingDisabled
 */

/**
 * @typedef {object} NotificationState
 * @property {'default' | 'granted' | 'denied'} permission
 * @property {NotificationSettings} settings
 */

/**
 * @typedef {object} NotificationActions
 * @property {(permission: 'default' | 'granted' | 'denied') => void} setPermission
 * @property {(type: NotificationType) => void} toggleSetting
 * @property {() => void} loadSettings
 */

/** @returns {NotificationSettings} */
const getDefaultSettings = () => ({
    playerError: true,
    seekPollSuccess: true,
    pollingDisabled: true,
});

/**
 * Loads notification settings from localStorage.
 * @returns {NotificationSettings}
 */
function loadSettingsFromStorage() {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            return { ...getDefaultSettings(), ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('Failed to load notification settings:', e);
    }
    return getDefaultSettings();
}

/**
 * Saves notification settings to localStorage.
 * @param {NotificationSettings} settings
 */
function saveSettingsToStorage(settings) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save notification settings:', e);
    }
}

/**
 * A store for managing notification state and user preferences.
 * @type {import('zustand/vanilla').StoreApi<NotificationState & NotificationActions>}
 */
export const useNotificationStore = createStore((set, get) => ({
    permission: 'default',
    settings: getDefaultSettings(),

    setPermission: (permission) => {
        set({ permission });
        eventBus.dispatch(EVENTS.NOTIFY.PERMISSION_CHANGED, { permission });
    },
    toggleSetting: (type) => {
        set((state) => {
            const newSettings = {
                ...state.settings,
                [type]: !state.settings[type],
            };
            saveSettingsToStorage(newSettings);
            return { settings: newSettings };
        });
    },
    loadSettings: () => {
        set({ settings: loadSettingsFromStorage() });
    },
}));

export const notificationActions = useNotificationStore.getState();
