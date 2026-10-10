import { redactSourceUrl } from './source-privacy-contract.js';

export const LIBRARY_SCHEMA_VERSION = 2;
export const LIBRARY_ENVELOPE_TYPE = 'stream-analyzer-library-collection';
export const WORKSPACE_EXPORT_TYPE = 'stream-analyzer-workspace';
export const LIBRARY_MAX_SERIALIZED_BYTES = 1024 * 1024;
export const LIBRARY_LIMITS = Object.freeze({
    history: 10,
    presets: 50,
    workspaces: 50,
    inputsPerWorkspace: 50,
    tombstones: 10,
    nameLength: 120,
    urlLength: 4096,
});

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function assertPlainRecord(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${label} must be an object.`);
    }
    for (const key of Object.keys(value)) {
        if (FORBIDDEN_KEYS.has(key)) {
            throw new Error(`${label} contains an unsafe key.`);
        }
    }
    return value;
}

function boundedText(value, label, limit, { required = false } = {}) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (required && !text) throw new Error(`${label} is required.`);
    if (text.length > limit)
        throw new Error(`${label} exceeds ${limit} characters.`);
    return text;
}

function sanitizeUrl(value, redactedFields) {
    const text = boundedText(value, 'Stream URL', LIBRARY_LIMITS.urlLength, {
        required: true,
    });
    const redacted = redactSourceUrl(text);
    redacted.redactedFields.forEach((field) => redactedFields.add(field));
    return redacted.url;
}

export function sanitizeLibraryInput(input) {
    const source = assertPlainRecord(input, 'Library input');
    const redactedFields = new Set();
    const sanitized = {};
    const allowed = [
        'name',
        'url',
        'originalUrl',
        'protocol',
        'type',
        'streamType',
        'effectiveSourceVersion',
    ];
    for (const key of allowed) {
        if (source[key] !== undefined) sanitized[key] = source[key];
    }
    sanitized.url = sanitizeUrl(
        source.url ?? source.originalUrl,
        redactedFields
    );
    if (sanitized.originalUrl) {
        sanitized.originalUrl = sanitizeUrl(
            sanitized.originalUrl,
            redactedFields
        );
    }
    if (sanitized.name !== undefined) {
        sanitized.name = boundedText(
            sanitized.name,
            'Stream name',
            LIBRARY_LIMITS.nameLength
        );
    }
    if (source.privacy !== undefined) {
        const privacy = assertPlainRecord(
            source.privacy,
            'Library input privacy'
        );
        if (privacy.status === 'redacted' && Array.isArray(privacy.fields)) {
            privacy.fields.slice(0, 20).forEach((field) => {
                redactedFields.add(
                    boundedText(field, 'Privacy field', 120, {
                        required: true,
                    })
                );
            });
        }
    }
    if (source.auth !== undefined) redactedFields.add('auth');
    if (source.drmAuth !== undefined) redactedFields.add('drmAuth');
    if (source.headers !== undefined) redactedFields.add('headers');
    if (source.cookies !== undefined) redactedFields.add('cookies');
    if (redactedFields.size) {
        sanitized.privacy = {
            status: 'redacted',
            fields: [...redactedFields].sort(),
        };
    }
    return sanitized;
}

function normalizeWorkspaceRecord(record) {
    const source = assertPlainRecord(record, 'Library record');
    const name = boundedText(
        source.name,
        'Workspace name',
        LIBRARY_LIMITS.nameLength,
        { required: true }
    );
    if (!Array.isArray(source.inputs)) {
        throw new Error('Workspace inputs must be an array.');
    }
    if (source.inputs.length > LIBRARY_LIMITS.inputsPerWorkspace) {
        throw new Error(
            `Workspace exceeds ${LIBRARY_LIMITS.inputsPerWorkspace} inputs.`
        );
    }
    const inputs = source.inputs.map(sanitizeLibraryInput);
    const redactedCount = inputs.filter(
        (input) => input.privacy?.status === 'redacted'
    ).length;
    return {
        name,
        inputs,
        ...(redactedCount
            ? { privacy: { status: 'redacted', inputCount: redactedCount } }
            : {}),
    };
}

export function normalizeLibraryRecord(kind, record) {
    if (kind === 'workspaces') return normalizeWorkspaceRecord(record);
    const source = assertPlainRecord(record, 'Library record');
    return sanitizeLibraryInput(source);
}

function capRecords(kind, records) {
    const limit = LIBRARY_LIMITS[kind];
    if (!limit) throw new Error(`Unknown library collection: ${kind}.`);
    return records.slice(0, limit);
}

export function createLibraryEnvelope(kind, records = [], tombstones = []) {
    if (!Array.isArray(records) || !Array.isArray(tombstones)) {
        throw new Error('Library records and tombstones must be arrays.');
    }
    const envelope = {
        version: LIBRARY_SCHEMA_VERSION,
        type: LIBRARY_ENVELOPE_TYPE,
        kind,
        records: capRecords(
            kind,
            records.map((item) => normalizeLibraryRecord(kind, item))
        ),
        tombstones: tombstones
            .slice(0, LIBRARY_LIMITS.tombstones)
            .map((item) => normalizeLibraryRecord(kind, item)),
    };
    const serialized = JSON.stringify(envelope);
    if (
        new TextEncoder().encode(serialized).byteLength >
        LIBRARY_MAX_SERIALIZED_BYTES
    ) {
        throw new Error('Library collection exceeds the 1 MiB storage limit.');
    }
    return envelope;
}

export function parseLibraryEnvelope(kind, raw) {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) {
        return {
            envelope: createLibraryEnvelope(kind, parsed),
            migrated: true,
        };
    }
    const source = assertPlainRecord(parsed, 'Library collection');
    if (source.version !== LIBRARY_SCHEMA_VERSION) {
        throw new Error(
            `Unsupported library schema version: ${String(source.version)}.`
        );
    }
    if (source.type !== LIBRARY_ENVELOPE_TYPE || source.kind !== kind) {
        throw new Error(
            'Library collection identity does not match its storage key.'
        );
    }
    return {
        envelope: createLibraryEnvelope(
            kind,
            source.records,
            source.tombstones
        ),
        migrated: false,
    };
}

export function softDeleteLibraryRecord(kind, envelope, predicate) {
    const current = createLibraryEnvelope(
        kind,
        envelope.records,
        envelope.tombstones
    );
    const index = current.records.findIndex(predicate);
    if (index < 0) return current;
    const [deleted] = current.records.splice(index, 1);
    current.tombstones.unshift(deleted);
    return createLibraryEnvelope(kind, current.records, current.tombstones);
}

export function restoreLastDeletedLibraryRecord(kind, envelope) {
    const current = createLibraryEnvelope(
        kind,
        envelope.records,
        envelope.tombstones
    );
    const restored = current.tombstones.shift();
    if (!restored) return current;
    return createLibraryEnvelope(
        kind,
        [restored, ...current.records],
        current.tombstones
    );
}

export function mergeWorkspaceInputs(currentInputs, incomingInputs) {
    const merged = [...currentInputs];
    const identities = new Set(merged.map((item) => item.url));
    for (const input of incomingInputs.map(sanitizeLibraryInput)) {
        if (!identities.has(input.url)) {
            identities.add(input.url);
            merged.push(input);
        }
    }
    if (merged.length > LIBRARY_LIMITS.inputsPerWorkspace) {
        throw new Error(
            `Merged workspace exceeds ${LIBRARY_LIMITS.inputsPerWorkspace} inputs.`
        );
    }
    return merged;
}

export function previewWorkspaceImport(text, existingNames = []) {
    if (
        new TextEncoder().encode(text).byteLength > LIBRARY_MAX_SERIALIZED_BYTES
    ) {
        throw new Error('Workspace import exceeds the 1 MiB limit.');
    }
    let imported;
    try {
        imported = JSON.parse(text);
    } catch {
        throw new Error('Workspace import is not valid JSON.');
    }
    const data =
        imported?.type === WORKSPACE_EXPORT_TYPE ? imported.data : imported;
    const workspace = normalizeWorkspaceRecord(data);
    let name = workspace.name;
    let counter = 1;
    while (existingNames.includes(name)) {
        name = `${workspace.name} (Imported ${counter})`;
        counter += 1;
    }
    workspace.name = name;
    return {
        version: LIBRARY_SCHEMA_VERSION,
        workspace,
        summary: {
            inputCount: workspace.inputs.length,
            redactedInputCount: workspace.privacy?.inputCount ?? 0,
            renamed: name !== data.name,
        },
    };
}

export function createWorkspaceExport(workspace) {
    return {
        version: LIBRARY_SCHEMA_VERSION,
        type: WORKSPACE_EXPORT_TYPE,
        data: normalizeWorkspaceRecord(workspace),
    };
}
