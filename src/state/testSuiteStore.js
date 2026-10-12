import { showToast } from '@/ui/components/toast';
import { createStore } from 'zustand/vanilla';
import { randomId } from '@/shared/utils/random.js';

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
    // Live run state: idle | running. Progress 0..1 while running.
    runState: 'idle',
    runProgress: 0,

    addSuite: (suite) => {
        set((state) => {
            const newSuites = [
                ...state.suites,
                { ...suite, id: randomId() },
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
                id: randomId(),
                name: `${suiteData.name} (Imported)`,
                assertions: suiteData.assertions.map((a) => ({
                    ...a,
                    id: randomId(),
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
            const removingActive = state.activeSuiteId === id;
            const last = state.lastRunResult;
            const lastSuiteId = last?.suiteId ?? last?.suite?.id;
            return {
                suites: newSuites,
                activeSuiteId: removingActive ? null : state.activeSuiteId,
                lastRunResult: lastSuiteId === id ? null : last,
            };
        });
    },

    exportSuite: (id) => {
        const suite = get().suites.find((s) => s.id === id);
        if (!suite) {
            showToast({ message: 'Suite not found.', type: 'fail' });
            return;
        }
        try {
            const blob = new Blob([JSON.stringify(suite, null, 2)], {
                type: 'application/json;charset=utf-8',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${suite.name || 'suite'}.regression.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            showToast({
                message: `Exported “${suite.name}”.`,
                type: 'pass',
            });
        } catch {
            showToast({ message: 'Export failed.', type: 'fail' });
        }
    },

    // Switching suites keeps prior results: the runner shows results
    // only when they belong to the active suite.
    setActiveSuiteId: (id) => set({ activeSuiteId: id }),

    setLastRunResult: (result) => set({ lastRunResult: result }),

    setRunState: (runState, runProgress = 0) =>
        set({ runState, runProgress }),

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
