/**
 * Schemas and logic for analyzing manifest parser coverage.
 * This helps identify which tags and attributes are being ignored by the current implementation.
 */

// --- SCHEMA for Manifest-to-Parser analysis (Unparsed check) ---
const dashXmlSchema = {
    MPD: {
        attrs: [
            'id',
            'profiles',
            'type',
            'availabilityStartTime',
            'availabilityEndTime',
            'publishTime',
            'mediaPresentationDuration',
            'minimumUpdatePeriod',
            'minBufferTime',
            'timeShiftBufferDepth',
            'suggestedPresentationDelay',
            'maxSegmentDuration',
            'maxSubsegmentDuration',
            'xmlns',
            'xmlns:xsi',
            'schemaLocation',
            'xmlns:cenc',
        ],
        children: [
            'ProgramInformation',
            'BaseURL',
            'Location',
            'PatchLocation',
            'Period',
            'UTCTiming',
            'ServiceDescription',
            'InitializationSet',
            'Metrics',
        ],
    },
    Period: {
        attrs: ['id', 'start', 'duration', 'bitstreamSwitching'],
        children: [
            'AdaptationSet',
            'EventStream',
            'Subset',
            'AssetIdentifier',
            'ServiceDescription',
            'Preselection',
            'BaseURL',
        ],
    },
    AdaptationSet: {
        attrs: [
            'id',
            'group',
            'contentType',
            'lang',
            'mimeType',
            'codecs',
            'frameRate',
            'par',
            'width',
            'height',
            'minBandwidth',
            'maxBandwidth',
            'minWidth',
            'maxWidth',
            'minHeight',
            'maxHeight',
            'minFrameRate',
            'maxFrameRate',
            'selectionPriority',
            'segmentAlignment',
            'subsegmentAlignment',
            'startWithSAP',
            'subsegmentStartsWithSAP',
            'bitstreamSwitching',
            'initializationPrincipal',
            'profiles', // Common attribute
            'containerProfiles',
        ],
        children: [
            'Representation',
            'ContentProtection',
            'Role',
            'Accessibility',
            'Viewpoint',
            'Rating',
            'ContentComponent',
            'SegmentTemplate',
            'SegmentList',
            'SegmentBase',
            'BaseURL',
            'SupplementalProperty',
            'Label',
            'ProducerReferenceTime',
            'InbandEventStream',
        ],
    },
    Representation: {
        attrs: [
            'id',
            'bandwidth',
            'qualityRanking',
            'dependencyId',
            'associationId',
            'associationType',
            'mediaStreamStructureId',
            'codecs',
            'mimeType',
            'width',
            'height',
            'frameRate',
            'sar',
            'audioSamplingRate',
            'scanType',
            'startWithSAP',
        ],
        children: [
            'BaseURL',
            'SegmentBase',
            'SegmentList',
            'SegmentTemplate',
            'SubRepresentation',
            'ContentProtection',
            'EssentialProperty',
            'SupplementalProperty',
            'InbandEventStream',
            'AudioChannelConfiguration',
            'ProducerReferenceTime',
        ],
    },
    ServiceDescription: {
        attrs: ['id'],
        children: ['Latency', 'PlaybackRate'],
    },
    Latency: {
        attrs: ['min', 'max', 'target', 'referenceId'],
        children: [],
    },
    PlaybackRate: {
        attrs: ['min', 'max'],
        children: [],
    },
    ProducerReferenceTime: {
        attrs: ['id', 'type', 'wallClockTime', 'presentationTime'],
        children: ['UTCTiming'],
    },
    SegmentTemplate: {
        attrs: [
            'media',
            'initialization',
            'duration',
            'startNumber',
            'timescale',
            'availabilityTimeOffset',
            'availabilityTimeComplete',
            'presentationTimeOffset',
        ],
        children: ['SegmentTimeline'],
    },
    SegmentTimeline: {
        attrs: [],
        children: ['S'],
    },
    S: {
        attrs: ['t', 'n', 'd', 'r', 'k'],
        children: [],
    },
    // Add other elements as needed...
};

/**
 * Analyzes a serialized DASH manifest object against a schema of known parsed elements.
 * @param {object} serializedManifest The root MPD element from fast-xml-parser.
 * @returns {import('@/types.ts').CoverageFinding[]}
 */
export function analyzeDashCoverage(serializedManifest) {
    const findings = [];
    const walk = (node, schemaType, path) => {
        if (!node || typeof node !== 'object') return;
        const schema = dashXmlSchema[schemaType];
        if (!schema) {
            findings.push({
                pathOrLine: path,
                status: 'unparsed',
                type: 'element',
                name: schemaType,
                details:
                    'This element type is not defined in the parser schema.',
            });
            return;
        }

        // Check attributes
        const attrs = node[':@'] || {};
        for (const attrName in attrs) {
            if (!schema.attrs.includes(attrName)) {
                findings.push({
                    pathOrLine: path,
                    status: 'unparsed',
                    type: 'attribute',
                    name: attrName,
                    details: `Attribute @${attrName} on <${schemaType}> is not parsed.`,
                });
            }
        }

        // Check child elements
        const childCounts = {};
        for (const childName in node) {
            if (childName === ':@' || childName === '#text') continue;
            if (!schema.children.includes(childName)) {
                findings.push({
                    pathOrLine: `${path}.${childName}[0]`,
                    status: 'unparsed',
                    type: 'element',
                    name: childName,
                    details: `Child element <${childName}> inside <${schemaType}> is not parsed.`,
                });
            } else {
                const children = Array.isArray(node[childName])
                    ? node[childName]
                    : [node[childName]];
                children.forEach((childNode) => {
                    const currentIndex = childCounts[childName] || 0;
                    // Only walk into children that have their own schema definition.
                    if (dashXmlSchema[childName]) {
                        walk(
                            childNode,
                            childName,
                            `${path}.${childName}[${currentIndex}]`
                        );
                    }
                    childCounts[childName] = currentIndex + 1;
                });
            }
        }
    };

    walk(serializedManifest, 'MPD', 'MPD[0]');
    return findings;
}

// --- SCHEMA for Parser-to-IR analysis (Drift check) ---
const irSchema = {
    Representation: [
        'id',
        'codecs',
        'bandwidth',
        'width',
        'height',
        'frameRate',
        'sar',
        'audioSamplingRate',
        'mimeType',
        'profiles',
        'qualityRanking',
        'selectionPriority',
        'codingDependency',
        'scanType',
        'dependencyId',
        'associationId',
        'associationType',
        'segmentProfiles',
        'mediaStreamStructureId',
        'maximumSAPPeriod',
        'startWithSAP',
        'maxPlayoutRate',
        'tag',
        'eptDelta',
        'pdDelta',
        'representationIndex',
        'failoverContent',
        'audioChannelConfigurations',
        'framePackings',
        'ratings',
        'viewpoints',
        'accessibility',
        'labels',
        'groupLabels',
        'subRepresentations',
        'resyncs',
        'outputProtection',
        'extendedBandwidth',
        'videoRange',
        'stableVariantId',
        'pathwayId',
        'supplementalCodecs',
        'reqVideoLayout',
        'serializedManifest',
        'contentProtection',
        '__variantUri',
    ],
    AdaptationSet: [
        'id',
        'contentType',
        'lang',
        'mimeType',
        'profiles',
        'group',
        'bitstreamSwitching',
        'width',
        'height',
        'maxWidth',
        'maxHeight',
        'maxFrameRate',
        'representations',
        'contentProtection',
        'framePackings',
        'ratings',
        'viewpoints',
        'accessibility',
        'labels',
        'groupLabels',
        'roles',
        'contentComponents',
        'resyncs',
        'outputProtection',
        'stableRenditionId',
        'bitDepth',
        'sampleRate',
        'channels',
        'assocLanguage',
        'characteristics',
        'forced',
        'segmentAlignment',
        'serializedManifest',
        'subsegmentAlignment',
        'subsegmentStartsWithSAP',
        'sar',
        'maximumSAPPeriod',
        'audioSamplingRate',
        'audioChannelConfigurations',
    ],
    Period: [
        'id',
        'start',
        'duration',
        'bitstreamSwitching',
        'assetIdentifier',
        'adaptationSets',
        'subsets',
        'preselections',
        'serviceDescriptions',
        'eventStreams',
        'events',
        'serializedManifest',
        'supplementalProperties',
        'adAvails',
    ],
    Manifest: [
        'id',
        'type',
        'profiles',
        'minBufferTime',
        'publishTime',
        'availabilityStartTime',
        'timeShiftBufferDepth',
        'minimumUpdatePeriod',
        'duration',
        'maxSegmentDuration',
        'maxSubsegmentDuration',
        'programInformations',
        'metrics',
        'locations',
        'patchLocations',
        'serviceDescriptions',
        'initializationSets',
        'segmentFormat',
        'events',
        'periods',
        'serializedManifest',
        'summary',
        'serverControl',
        'hlsDefinedVariables',
        'tags',
        'isMaster',
        'variants',
        'segments',
        'preloadHints',
        'renditionReports',
        'partInf',
        'mediaSequence',
        'contentProtections',
        'adAvails',
    ],
};

/**
 * Analyzes a DASH or HLS Intermediate Representation (IR) object for properties
 * that are not declared in the canonical IR schema.
 * @param {import('@/types.ts').Manifest} manifestIR The parsed manifest IR.
 * @returns {import('@/types.ts').CoverageFinding[]}
 */
export function analyzeParserDrift(manifestIR) {
    const findings = [];
    const ignoreKeys = ['serializedManifest']; // These are containers and not part of the schema itself.

    const checkObject = (obj, schemaName, path) => {
        const schema = irSchema[schemaName];
        if (!schema) return;

        for (const key in obj) {
            if (ignoreKeys.includes(key)) continue;
            if (!schema.includes(key)) {
                findings.push({
                    pathOrLine: path,
                    status: 'drift',
                    type: 'property',
                    name: key,
                    details: `Property "${key}" exists on parsed ${schemaName} object but is not in the IR schema. This indicates parser drift.`,
                    lineNumber: obj.serializedManifest?.lineNumber,
                });
            }
        }
    };

    checkObject(manifestIR, 'Manifest', 'Manifest');
    manifestIR.periods.forEach((period, p_idx) => {
        const periodPath = `Manifest.periods[${p_idx}]`;
        checkObject(period, 'Period', periodPath);

        period.adaptationSets.forEach((as, as_idx) => {
            const asPath = `${periodPath}.adaptationSets[${as_idx}]`;
            checkObject(as, 'AdaptationSet', asPath);

            as.representations.forEach((rep, r_idx) => {
                const repPath = `${asPath}.representations[${r_idx}]`;
                checkObject(rep, 'Representation', repPath);
            });
        });
    });

    return findings;
}
