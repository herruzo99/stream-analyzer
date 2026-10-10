import { workerService } from '@/infrastructure/worker/workerService';
import {
    createLibraryEnvelope,
    createWorkspaceExport,
    parseLibraryEnvelope,
    previewWorkspaceImport,
    restoreLastDeletedLibraryRecord,
    softDeleteLibraryRecord,
} from '@/features/streamInput/application/library-contract.js';
import {
    deriveEffectiveSourceConfiguration,
    projectPersistableEffectiveSource,
} from '@/features/streamInput/application/effective-source-configuration.js';

const HISTORY_KEY = 'stream-analyzer_history';
const PRESETS_KEY = 'stream-analyzer_presets';
const LAST_USED_KEY = 'stream-analyzer_last-used';
const WORKSPACES_KEY = 'stream-analyzer_workspaces';
const MAX_HISTORY_ITEMS = 10;
const MAX_PRESETS = 50;
const COLLECTION_KIND_BY_KEY = Object.freeze({
    [HISTORY_KEY]: 'history',
    [PRESETS_KEY]: 'presets',
    [WORKSPACES_KEY]: 'workspaces',
});

function recordQuarantine(key) {
    const reason = 'invalid-or-unsupported-library-data';
    try {
        localStorage.setItem(
            `${key}-quarantine`,
            JSON.stringify({ version: 1, status: 'quarantined', reason })
        );
        localStorage.removeItem(key);
    } catch (storageError) {
        console.error(
            '[Storage] Failed to quarantine invalid library metadata.',
            storageError
        );
    }
    console.warn(
        '[Storage] Invalid library data was quarantined without exposing its contents.'
    );
}

/**
 * A replacer for JSON.stringify that sorts object keys alphabetically.
 */
const sortedReplacer = (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.keys(value)
            .sort()
            .reduce((sorted, key) => {
                sorted[key] = value[key];
                return sorted;
            }, {});
    }
    return value;
};

export function canonicalStringify(obj) {
    return JSON.stringify(obj, sortedReplacer);
}

export function prepareForStorage(input) {
    // Deep clone to avoid mutation
    // Use structuredClone if available, else JSON fallback
    let storableInput;
    try {
        storableInput =
            typeof structuredClone === 'function'
                ? structuredClone(input)
                : JSON.parse(JSON.stringify(input));
    } catch (_e) {
        // Fallback for non-cloneable objects
        storableInput = JSON.parse(JSON.stringify(input));
    }

    delete storableInput.id;
    delete storableInput.detectedDrm;
    delete storableInput.isDrmInfoLoading;
    delete storableInput.file;

    if (storableInput.drmAuth?.serverCertificate instanceof File) {
        const file = /** @type {File} */ (
            storableInput.drmAuth.serverCertificate
        );
        storableInput.drmAuth.serverCertificate = {
            isFilePlaceholder: true,
            name: file.name,
            type: file.type,
        };
    } else if (
        typeof storableInput.drmAuth?.serverCertificate === 'object' &&
        storableInput.drmAuth.serverCertificate !== null
    ) {
        const certObject = storableInput.drmAuth.serverCertificate;
        for (const key in certObject) {
            if (certObject[key] instanceof File) {
                const file = /** @type {File} */ (certObject[key]);
                certObject[key] = {
                    isFilePlaceholder: true,
                    name: file.name,
                    type: file.type,
                };
            }
        }
    }
    return storableInput;
}

export function restoreFromStorage(storedInput) {
    if (storedInput.drmAuth?.serverCertificate?.isFilePlaceholder) {
        const { name, type } = storedInput.drmAuth.serverCertificate;
        storedInput.drmAuth.serverCertificate = new File([], name, { type });
    } else if (
        typeof storedInput.drmAuth?.serverCertificate === 'object' &&
        storedInput.drmAuth.serverCertificate !== null
    ) {
        const certObject = storedInput.drmAuth.serverCertificate;
        for (const key in certObject) {
            if (certObject[key]?.isFilePlaceholder) {
                const { name, type } = certObject[key];
                certObject[key] = new File([], name, { type });
            }
        }
    }
    return storedInput;
}

/**
 * Reads a list of items from localStorage safely.
 * Handles JSON parse errors or invalid data structures gracefully to prevent app crashes.
 * @param {string} key The localStorage key.
 * @returns {Array<object>}
 */
function getItems(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];

        const stored = JSON.parse(raw);
        const kind = COLLECTION_KIND_BY_KEY[key];
        if (kind) {
            const { envelope, migrated } = parseLibraryEnvelope(kind, stored);
            if (migrated)
                localStorage.setItem(key, canonicalStringify(envelope));
            return envelope.records.map(restoreFromStorage);
        }
        if (
            kind &&
            stored?.type === 'stream-analyzer-library-collection' &&
            Array.isArray(stored.records)
        ) {
            return stored.records.map(restoreFromStorage);
        }
        if (!Array.isArray(stored)) {
            console.warn(
                `[Storage] Data for key "${key}" is not an array. Resetting.`
            );
            localStorage.removeItem(key);
            return [];
        }

        return stored.map(restoreFromStorage);
    } catch (e) {
        if (COLLECTION_KIND_BY_KEY[key]) {
            recordQuarantine(key);
            return [];
        }
        console.error(
            `[Storage] Critical error reading key "${key}". Clearing corrupt data to allow boot.`,
            e
        );
        // Self-healing: Remove corrupt data so the app can start next time
        try {
            localStorage.removeItem(key);
        } catch (removeErr) {
            console.error(
                `[Storage] Failed to clear corrupt key "${key}"`,
                removeErr
            );
        }
        return [];
    }
}

function setItems(key, items) {
    try {
        const kind = COLLECTION_KIND_BY_KEY[key];
        if (kind) {
            let tombstones = [];
            const raw = localStorage.getItem(key);
            if (raw) {
                try {
                    tombstones = parseLibraryEnvelope(kind, raw).envelope
                        .tombstones;
                } catch {
                    tombstones = [];
                }
            }
            const envelope = createLibraryEnvelope(kind, items, tombstones);
            localStorage.setItem(key, canonicalStringify(envelope));
            return;
        }
        const storableItems = items.map(prepareForStorage);
        // Safety check: Don't store massive blobs.
        // 5MB is roughly the limit, check if we're pushing dangerous sizes
        const str = JSON.stringify(storableItems);
        if (str.length > 4 * 1024 * 1024) {
            throw new RangeError(
                `Data for "${key}" exceeds the 4MB persistence limit.`
            );
        }
        localStorage.setItem(key, str);
    } catch (e) {
        console.error(`Error writing to localStorage key "${key}":`, e);
        throw e;
    }
}

export const getHistory = () => getItems(HISTORY_KEY);
export const getPresets = () => getItems(PRESETS_KEY);
export const getLastUsedStreams = () => getItems(LAST_USED_KEY);
export const saveLastUsedStreams = (streams) =>
    setItems(LAST_USED_KEY, streams);
export const getWorkspaces = () => getItems(WORKSPACES_KEY);

export function saveToHistory(stream, streamInput = null) {
    const effective = deriveEffectiveSourceConfiguration(
        streamInput ?? {
            id: stream.id,
            url: stream.originalUrl,
            name: stream.name,
            auth: stream.auth,
            drmAuth: stream.drmAuth,
        }
    );
    const persistable = projectPersistableEffectiveSource(effective);
    const canonicalUrl = persistable.url;
    if (!canonicalUrl) return;

    const history = getHistory();
    const presets = getPresets();
    const isPreset = presets.some((p) => p.url === canonicalUrl);
    if (isPreset) return;

    // Filter duplicates
    const newHistory = history.filter((item) => item.url !== canonicalUrl);

    // Only save minimal data for history
    newHistory.unshift({
        ...persistable,
        name: stream.name,
        protocol: stream.protocol,
        type: stream.manifest?.type === 'dynamic' ? 'live' : 'vod',
    });

    if (newHistory.length > MAX_HISTORY_ITEMS) {
        newHistory.length = MAX_HISTORY_ITEMS;
    }
    setItems(HISTORY_KEY, newHistory);
}

export function savePreset(preset) {
    const presets = getPresets();
    const newPresets = presets.filter((item) => item.url !== preset.url);
    newPresets.unshift(preset);

    if (newPresets.length > MAX_PRESETS) {
        newPresets.length = MAX_PRESETS;
    }
    setItems(PRESETS_KEY, newPresets);
    return preset;
}

export function saveWorkspace(workspace) {
    const workspaces = getWorkspaces();
    const newWorkspaces = workspaces.filter((w) => w.name !== workspace.name);
    newWorkspaces.unshift(workspace);
    setItems(WORKSPACES_KEY, newWorkspaces);
    return workspace;
}

export function deleteHistoryItem(url) {
    const history = getHistory();
    const newHistory = history.filter((item) => item.url !== url);
    setItems(HISTORY_KEY, newHistory);
}

export function deletePreset(url) {
    const presets = getPresets();
    const newPresets = presets.filter((item) => item.url !== url);
    setItems(PRESETS_KEY, newPresets);
}

export function deleteWorkspace(name) {
    const raw = localStorage.getItem(WORKSPACES_KEY);
    const current = raw
        ? parseLibraryEnvelope('workspaces', raw).envelope
        : createLibraryEnvelope('workspaces');
    const next = softDeleteLibraryRecord(
        'workspaces',
        current,
        (workspace) => workspace.name === name
    );
    localStorage.setItem(WORKSPACES_KEY, canonicalStringify(next));
    return next;
}

export function exportWorkspace(workspaceName) {
    const workspaces = getWorkspaces();
    const workspace = workspaces.find((w) => w.name === workspaceName);

    if (!workspace) {
        throw new Error('Workspace not found for export.');
    }

    const exportData = createWorkspaceExport(workspace);

    const jsonString = canonicalStringify(exportData);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const filename = `${workspaceName.replace(/[^a-z0-9]/gi, '_')}_workspace.json`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return filename;
}

export async function importWorkspace(file) {
    const text = await file.text();
    const imported = JSON.parse(text);

    let workspaceData;
    if (
        imported.type === 'stream-analyzer-workspace' &&
        imported.data &&
        imported.data.name &&
        Array.isArray(imported.data.inputs)
    ) {
        workspaceData = imported.data;
    } else if (imported.name && Array.isArray(imported.inputs)) {
        workspaceData = imported;
    } else {
        throw new Error('Invalid workspace file format.');
    }

    const workspaces = getWorkspaces();
    let newName = workspaceData.name;
    let counter = 1;
    while (workspaces.some((w) => w.name === newName)) {
        newName = `${workspaceData.name} (Imported ${counter})`;
        counter++;
    }
    workspaceData.name = newName;

    saveWorkspace(workspaceData);
    return workspaceData;
}

export async function previewWorkspaceFile(file) {
    const text = await file.text();
    return previewWorkspaceImport(
        text,
        getWorkspaces().map(({ name }) => name)
    );
}

export function restoreLastDeletedWorkspace() {
    const raw = localStorage.getItem(WORKSPACES_KEY);
    if (!raw) return false;
    const current = parseLibraryEnvelope('workspaces', raw).envelope;
    if (current.tombstones.length === 0) return false;
    const next = restoreLastDeletedLibraryRecord('workspaces', current);
    localStorage.setItem(WORKSPACES_KEY, canonicalStringify(next));
    return true;
}

export function hasDeletedWorkspace() {
    try {
        const raw = localStorage.getItem(WORKSPACES_KEY);
        return raw
            ? parseLibraryEnvelope('workspaces', raw).envelope.tombstones
                  .length > 0
            : false;
    } catch {
        return false;
    }
}

export async function fetchStreamMetadata(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching manifest`);
    }
    const manifestString = await response.text();

    return await workerService.postTask('get-manifest-metadata', {
        manifestString,
    }).promise;
}
