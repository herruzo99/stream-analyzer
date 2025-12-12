import { showToast } from '@/ui/components/toast';
import { createStore } from 'zustand/vanilla';

const STORAGE_KEY = 'stream-analyzer_test_suites';

const DEFAULT_SUITES = [
    {
        id: 'preset-production-ready',
        name: 'Production Readiness',
        description: 'Basic sanity checks for production streams.',
        assertions: [
            {
                id: '1',
                name: 'Is HTTPS',
                path: 'stream.originalUrl',
                operator: 'includes',
                value: 'https://',
            },
            {
                id: '2',
                name: 'Has Video',
                path: 'summary.content.totalVideoTracks',
                operator: 'gt',
                value: 0,
            },
            {
                id: '3',
                name: 'Has Audio',
                path: 'summary.content.totalAudioTracks',
                operator: 'gt',
                value: 0,
            },
            {
                id: '4',
                name: 'Not Empty',
                path: 'summary.content.totalPeriods',
                operator: 'gt',
                value: 0,
            },
        ],
    },
    {
        id: 'preset-uhd-requirements',
        name: '4K UHD Requirements',
        description: 'Validates high-fidelity stream properties.',
        assertions: [
            {
                id: '1',
                name: 'Video Codec HEVC',
                path: 'summary.videoTracks.codecs.value',
                operator: 'includes',
                value: 'hvc1',
            },
            {
                id: '2',
                name: 'Resolution 4K',
                path: 'summary.videoTracks.resolutions.value',
                operator: 'includes',
                value: '3840x2160',
            },
            {
                id: '3',
                name: 'Encrypted',
                path: 'security.isEncrypted',
                operator: 'equals',
                value: 'true',
            },
        ],
    },
    {
        id: 'preset-low-latency',
        name: 'Low Latency Check',
        description: 'Checks for LL-HLS or LL-DASH markers.',
        assertions: [
            {
                id: '1',
                name: 'LL Mode Signaled',
                path: 'summary.lowLatency.isLowLatency',
                operator: 'equals',
                value: 'true',
            },
            {
                id: '2',
                name: 'Chunked Transfer',
                path: 'manifest.serviceDescriptions',
                operator: 'exists',
                value: '',
            },
        ],
    },
];

function loadSuites() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [...DEFAULT_SUITES];
    } catch (_e) {
        return [...DEFAULT_SUITES];
    }
}

function saveSuites(suites) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(suites));
    } catch (e) {
        console.error('Failed to save test suites', e);
    }
}

export const useTestSuiteStore = createStore((set, get) => ({
    suites: loadSuites(),
    activeSuiteId: null,
    lastRunResult: null,

    addSuite: (suite) => {
        set((state) => {
            const newSuites = [
                ...state.suites,
                { ...suite, id: crypto.randomUUID() },
            ];
            saveSuites(newSuites);
            return {
                suites: newSuites,
                activeSuiteId: newSuites[newSuites.length - 1].id,
            };
        });
    },

    importSuite: (suiteData) => {
        // Basic Schema Validation
        if (
            !suiteData ||
            !suiteData.name ||
            !Array.isArray(suiteData.assertions)
        ) {
            showToast({ message: 'Invalid Test Suite JSON.', type: 'fail' });
            return;
        }

        set((state) => {
            // Regenerate IDs to avoid collisions with existing suites
            const importedSuite = {
                ...suiteData,
                id: crypto.randomUUID(),
                name: `${suiteData.name} (Imported)`,
                assertions: suiteData.assertions.map((a) => ({
                    ...a,
                    id: crypto.randomUUID(),
                })),
            };

            const newSuites = [...state.suites, importedSuite];
            saveSuites(newSuites);

            showToast({
                message: `Imported "${suiteData.name}"`,
                type: 'pass',
            });
            return { suites: newSuites, activeSuiteId: importedSuite.id };
        });
    },

    updateSuite: (id, updates) => {
        set((state) => {
            const newSuites = state.suites.map((s) =>
                s.id === id ? { ...s, ...updates } : s
            );
            saveSuites(newSuites);
            return { suites: newSuites };
        });
    },

    deleteSuite: (id) => {
        set((state) => {
            const newSuites = state.suites.filter((s) => s.id !== id);
            saveSuites(newSuites);
            return {
                suites: newSuites,
                activeSuiteId:
                    state.activeSuiteId === id ? null : state.activeSuiteId,
            };
        });
    },

    setActiveSuiteId: (id) => set({ activeSuiteId: id, lastRunResult: null }),

    setLastRunResult: (result) => set({ lastRunResult: result }),

    resetDefaults: () => {
        set({ suites: [...DEFAULT_SUITES] });
        saveSuites([...DEFAULT_SUITES]);
        showToast({
            message: 'Test suites reset to factory defaults.',
            type: 'info',
        });
    },
}));

export const testSuiteActions = useTestSuiteStore.getState();
