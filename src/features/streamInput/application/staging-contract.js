import {
    classifyEffectiveSourceReadiness,
    createEffectiveSourceFingerprint,
    deriveEffectiveSourceConfiguration,
    projectPersistableEffectiveSource,
} from './effective-source-configuration.js';

export const STAGING_DRAFT_VERSION = 1;

function hashRevision(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

export function createStagingRevision(streamInputs) {
    const revisionSource = streamInputs.map((input) => ({
        id: input.id,
        url: input.url ?? null,
        name: input.name ?? null,
        auth: input.auth ?? null,
        drmAuth: input.drmAuth ?? null,
        tier0: input.tier0 ?? null,
        isTier0AnalysisLoading: input.isTier0AnalysisLoading === true,
    }));
    return `v${STAGING_DRAFT_VERSION}-${hashRevision(JSON.stringify(revisionSource))}`;
}

function sourceConfigurationSnapshot(input) {
    return {
        id: input.id,
        ...projectPersistableEffectiveSource(input),
    };
}

function createSourceConfigurationRevision(input) {
    return hashRevision(JSON.stringify(sourceConfigurationSnapshot(input)));
}

/**
 * Revision of user-controlled staging configuration only. Tier-0/preflight
 * observations are deliberately excluded so background detection never marks
 * a saved draft as edited.
 */
export function createStagingConfigurationRevision(streamInputs) {
    return `v${STAGING_DRAFT_VERSION}-${hashRevision(
        JSON.stringify(streamInputs.map(sourceConfigurationSnapshot))
    )}`;
}

export function createStagingBaseline(streamInputs) {
    return Object.freeze({
        revision: createStagingConfigurationRevision(streamInputs),
        sourceRevisions: Object.freeze(
            Object.fromEntries(
                streamInputs.map((input) => [
                    String(input.id),
                    createSourceConfigurationRevision(input),
                ])
            )
        ),
    });
}

export function classifyStagedSource(input) {
    return classifyEffectiveSourceReadiness(input);
}

export function projectStagingState({
    streamInputs,
    activeStreamInputId,
    loadedWorkspaceName,
    activeMobilePage = 'queue',
    workflow = null,
    selectedSourceIds = new Set(),
    queueFilter = '',
    baseline = null,
}) {
    const bulkSelection = new Set(selectedSourceIds);
    const fingerprints = streamInputs.map(createEffectiveSourceFingerprint);
    const duplicateGroups = new Map();
    fingerprints.forEach((fingerprint, index) => {
        const group = duplicateGroups.get(fingerprint) ?? [];
        group.push(index);
        duplicateGroups.set(fingerprint, group);
    });
    const sources = streamInputs.map((input, index) => {
        const effective = deriveEffectiveSourceConfiguration(input);
        const duplicateIndices = duplicateGroups.get(fingerprints[index]);
        return {
            input,
            effective,
            index,
            position: index + 1,
            selected: input.id === activeStreamInputId,
            bulkSelected: bulkSelection.has(input.id),
            status: effective.readiness,
            isDuplicate: duplicateIndices.length > 1,
            duplicateOf:
                duplicateIndices[0] === index
                    ? null
                    : streamInputs[duplicateIndices[0]].id,
            duplicateCount: duplicateIndices.length,
            changed:
                baseline !== null &&
                baseline.sourceRevisions?.[String(input.id)] !==
                    createSourceConfigurationRevision(input),
        };
    });
    const loadingCount = sources.filter(
        ({ status }) => status.state === 'loading'
    ).length;
    const blockedCount = sources.filter(
        ({ status }) => status.state === 'blocked'
    ).length;
    const analyzableInputs = sources
        .filter(({ status }) => status.state === 'ready')
        .map(({ input }) => input);
    const blockingReasons = [];
    const duplicateSourceCount = sources.filter(
        ({ duplicateOf }) => duplicateOf !== null
    ).length;
    const normalizedFilter = String(queueFilter).trim().toLowerCase();
    const visibleSources = normalizedFilter
        ? sources.filter(({ input, effective }) =>
              [
                  input.name,
                  input.url,
                  effective.detection.protocol,
                  effective.detection.presentation,
              ].some((value) =>
                  String(value ?? '')
                      .toLowerCase()
                      .includes(normalizedFilter)
              )
          )
        : sources;
    if (sources.length === 0) blockingReasons.push('Add at least one source.');
    if (loadingCount > 0) {
        blockingReasons.push(
            `Wait for ${loadingCount} source ${loadingCount === 1 ? 'check' : 'checks'}.`
        );
    }
    if (sources.length > 0 && analyzableInputs.length === 0) {
        blockingReasons.push('Repair or remove every blocked source.');
    }

    const configurationRevision =
        createStagingConfigurationRevision(streamInputs);
    return Object.freeze({
        version: STAGING_DRAFT_VERSION,
        revision: createStagingRevision(streamInputs),
        configurationRevision,
        baseline,
        draftChanged:
            baseline !== null && baseline.revision !== configurationRevision,
        loadedWorkspaceName: loadedWorkspaceName ?? null,
        activeMobilePage:
            activeMobilePage === 'configure' ? 'configure' : 'queue',
        workflow,
        sources,
        visibleSources,
        queueFilter: String(queueFilter),
        selectedSourceIds: Object.freeze(
            sources
                .filter(({ bulkSelected }) => bulkSelected)
                .map(({ input }) => input.id)
        ),
        loadingCount,
        blockedCount,
        duplicateSourceCount,
        duplicateGroupCount: [...duplicateGroups.values()].filter(
            (group) => group.length > 1
        ).length,
        analyzableInputs,
        blockingReasons,
        canAnalyze: blockingReasons.length === 0,
    });
}

export function moveStagedSource(streamInputs, sourceId, direction) {
    const fromIndex = streamInputs.findIndex((input) => input.id === sourceId);
    const toIndex = fromIndex + direction;
    if (
        fromIndex < 0 ||
        ![-1, 1].includes(direction) ||
        toIndex < 0 ||
        toIndex >= streamInputs.length
    ) {
        return streamInputs;
    }
    const reordered = [...streamInputs];
    const [source] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, source);
    return reordered;
}

export function selectAfterStagedSourceRemoval(
    streamInputs,
    removedSourceId,
    activeSourceId
) {
    if (activeSourceId !== removedSourceId) return activeSourceId;
    const removedIndex = streamInputs.findIndex(
        (input) => input.id === removedSourceId
    );
    if (removedIndex < 0) return activeSourceId;
    const remaining = streamInputs.filter(
        (input) => input.id !== removedSourceId
    );
    if (remaining.length === 0) return null;
    return remaining[Math.min(removedIndex, remaining.length - 1)].id;
}

export function selectAfterStagedSourcesRemoval(
    streamInputs,
    removedSourceIds,
    activeSourceId
) {
    const removing = new Set(removedSourceIds);
    if (!removing.has(activeSourceId)) return activeSourceId;
    const activeIndex = streamInputs.findIndex(
        (input) => input.id === activeSourceId
    );
    const remaining = streamInputs.filter((input) => !removing.has(input.id));
    if (activeIndex < 0 || remaining.length === 0) return null;
    const remainingBeforeActive = streamInputs
        .slice(0, activeIndex)
        .filter((input) => !removing.has(input.id)).length;
    return remaining[Math.min(remainingBeforeActive, remaining.length - 1)].id;
}

export function hasStagingConflict(expectedRevision, streamInputs) {
    return expectedRevision !== createStagingRevision(streamInputs);
}
