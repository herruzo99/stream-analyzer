import { createStore } from 'zustand/vanilla';

const SETTINGS_KEY = 'stream-analyzer_app_settings';

const DEFAULT_SETTINGS = {
    // Limits
    networkLogLimit: 500,
    segmentCacheLimit: 50, // Number of segments
    eventLogLimit: 200,

    // Toggles
    enableHighFreqStats: true,
    preserveLogsOnReload: false,
};

const PRESETS = {
    low: { networkLogLimit: 200, segmentCacheLimit: 20, label: 'Conservative' },
    medium: { networkLogLimit: 500, segmentCacheLimit: 50, label: 'Balanced' },
    high: {
        networkLogLimit: 1000,
        segmentCacheLimit: 200,
        label: 'Performance',
    },
};

function loadSettings() {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.warn('Failed to load settings:', e);
    }
    return DEFAULT_SETTINGS;
}

export const useSettingsStore = createStore((set, get) => ({
    ...loadSettings(),

    // Volatile state (not persisted)
    systemHealth: {
        status: 'nominal', // 'nominal' | 'warning' | 'critical'
        message: null,
    },

    updateSetting: (key, value) => {
        set((state) => {
            const newSettings = { ...state, [key]: value };
            // Persist to storage (excluding methods and volatile state)
            const toSave = {};
            Object.keys(DEFAULT_SETTINGS).forEach((k) => {
                toSave[k] = newSettings[k];
            });
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));
            return { [key]: value };
        });
    },

    applyPreset: (level) => {
        const preset = PRESETS[level];
        if (preset) {
            get().updateSetting('networkLogLimit', preset.networkLogLimit);
            get().updateSetting('segmentCacheLimit', preset.segmentCacheLimit);
        }
    },

    setSystemHealth: (status, message = null) => {
        set({ systemHealth: { status, message } });
    },

    resetDefaults: () => {
        set(DEFAULT_SETTINGS);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    },
}));

export const settingsActions = useSettingsStore.getState();
export const MEMORY_PRESETS = PRESETS;
