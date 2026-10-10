import {
    commitSettings,
    decodeSettingsRecord,
    SETTINGS_DEFAULTS,
    SETTINGS_PRESETS,
} from '@/features/settings/application/settings-contract.js';
import { createStore } from 'zustand/vanilla';

const SETTINGS_KEY = 'stream-analyzer_app_settings';
const DEFAULT_SETTINGS = SETTINGS_DEFAULTS;
const PRESETS = SETTINGS_PRESETS;

function readStoredSettings() {
    try {
        return localStorage.getItem(SETTINGS_KEY);
    } catch {
        return null;
    }
}

function initialSettingsState() {
    const decoded = decodeSettingsRecord(readStoredSettings());
    if (decoded.state === 'migrated') {
        const migrated = commitSettings(
            localStorage,
            SETTINGS_KEY,
            decoded.settings,
            decoded.settings
        );
        if (!migrated.ok) {
            return {
                ...decoded.settings,
                lastValidSettings: { ...decoded.settings },
                settingsStatus: {
                    state: 'save-failed',
                    message: migrated.error,
                },
                saveStatus: 'error',
                saveError: migrated.error,
            };
        }
    }
    return {
        ...decoded.settings,
        lastValidSettings: { ...decoded.settings },
        settingsStatus: {
            state: decoded.state,
            message:
                decoded.state === 'migrated'
                    ? 'Legacy settings migrated to version 1.'
                    : decoded.message,
        },
        saveStatus: 'idle',
        saveError: null,
    };
}

function currentSettings(state) {
    return Object.fromEntries(
        Object.keys(DEFAULT_SETTINGS).map((key) => [key, state[key]])
    );
}

function commitTargetSettings(set, state, next) {
    const current = currentSettings(state);
    const result = commitSettings(localStorage, SETTINGS_KEY, current, next);
    if (!result.ok) {
        return {
            saveStatus: 'error',
            saveError: result.error,
            settingsStatus: {
                state: 'save-failed',
                message: result.error,
            },
        };
    }
    return {
        ...result.settings,
        lastValidSettings: current,
        saveStatus: 'saved',
        saveError: null,
        settingsStatus: { state: 'ready', message: null },
    };
}

export const useSettingsStore = createStore((set) => ({
    ...initialSettingsState(),

    systemHealth: {
        status: 'nominal',
        message: null,
    },

    updateSetting: (key, value) => {
        if (!Object.hasOwn(DEFAULT_SETTINGS, key)) return;
        set((state) =>
            commitTargetSettings(set, state, {
                ...currentSettings(state),
                [key]: value,
            })
        );
    },

    applyPreset: (level) => {
        const preset = PRESETS[level];
        if (!preset) return;
        set((state) =>
            commitTargetSettings(set, state, {
                ...currentSettings(state),
                networkLogLimit: preset.networkLogLimit,
                segmentCacheLimit: preset.segmentCacheLimit,
            })
        );
    },

    setSystemHealth: (status, message = null) => {
        set({ systemHealth: { status, message } });
    },

    resetDefaults: () => {
        set((state) =>
            commitTargetSettings(set, state, { ...DEFAULT_SETTINGS })
        );
    },

    revertLastValid: () => {
        set((state) => {
            const current = currentSettings(state);
            const previous = state.lastValidSettings;
            const committed = commitTargetSettings(set, state, previous);
            return committed.saveStatus === 'saved'
                ? { ...committed, lastValidSettings: current }
                : committed;
        });
    },
}));

export const settingsActions = useSettingsStore.getState();
export const MEMORY_PRESETS = PRESETS;
