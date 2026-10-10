import { createStore } from 'zustand/vanilla';
import {
    getDefaultNotificationSettings,
    loadNotificationSettings,
    NOTIFICATION_TYPES,
    saveNotificationSettings,
} from './notification-contract.js';

/**
 * @typedef {ReturnType<typeof getDefaultNotificationSettings>} NotificationSettings
 * @typedef {'supported' | 'unsupported'} NotificationSupport
 * @typedef {'unsupported' | 'default' | 'granted' | 'denied' | 'error'} NotificationPermission
 * @typedef {'default' | 'loaded' | 'migrated' | 'recovered' | 'saved' | 'save-error'} NotificationPersistence
 */

/**
 * @type {import('zustand/vanilla').StoreApi<{
 * support: NotificationSupport,
 * permission: NotificationPermission,
 * persistence: NotificationPersistence,
 * settings: NotificationSettings,
 * setSupport: (support: NotificationSupport) => void,
 * setPermission: (permission: NotificationPermission) => void,
 * toggleSetting: (type: string) => void,
 * loadSettings: () => void
 * }>}
 */
export const notificationTargetStore = createStore(set => ({
    support: 'unsupported',
    permission: 'unsupported',
    persistence: 'default',
    settings: getDefaultNotificationSettings(),

    setSupport: support => set({ support }),
    setPermission: permission => set({ permission }),
    toggleSetting: type => {
        if (!NOTIFICATION_TYPES.includes(type)) return;
        set(state =>
            saveNotificationSettings(localStorage, {
                ...state.settings,
                [type]: !state.settings[type],
            })
        );
    },
    loadSettings: () => {
        const result = loadNotificationSettings(localStorage);
        if (result.persistence === 'migrated') {
            saveNotificationSettings(localStorage, result.settings);
        }
        set(result);
    },
}));

export const notificationTargetActions = notificationTargetStore.getState();
