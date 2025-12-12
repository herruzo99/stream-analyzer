import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm';
import { appLog } from '@/shared/utils/debug';
import { parseDuration } from '@/shared/utils/time';
import { parseScte35 } from '../scte35/parser.js';
import { isCodecSupported } from '../utils/codec-support.js';
import { inferMediaInfoFromExtension } from '../utils/media-types.js';
import {
    findChildren,
    findChildrenRecursive,
    getAttr,
    linkParents,
    mergeElements,
} from '../utils/recursive-parser.js';

const isVideoCodec = (codecString) => {
    if (!codecString) return false;
    const lowerCodec = codecString.toLowerCase();
    const videoPrefixes = [
        'avc1',
        'avc3',
        'hvc1',
        'hev1',
        'mp4v',
        'dvh1',
        'dvhe',
        'av01',
        'vp09',
    ];
    return videoPrefixes.some((prefix) => lowerCodec.startsWith(prefix));
};

/**
 * Infers a user-friendly format name for DASH text tracks.
 * @param {string} mimeType - The mimeType from the AdaptationSet.
 * @param {string} codecs - The codecs string from the AdaptationSet/Representation.
 * @returns {string} The format name.
 */
function inferDashTextFormat(mimeType, codecs) {
    const codecStr = (codecs || '').toLowerCase();
    const mimeStr = (mimeType || '').toLowerCase();

    if (codecStr.includes('im1t')) return 'IMSC1 Text';
    if (codecStr.includes('im1i')) return 'IMSC1 Image';
    if (codecStr.includes('stpp.ebutt.tt-d')) return 'EBU-TT-D';
    if (codecStr.includes('wvtt')) return 'WebVTT';
    if (codecStr.includes('stpp')) return 'TTML';

    if (mimeStr.includes('ttml+xml')) return 'TTML';
    if (mimeStr.includes('vtt')) return 'WebVTT';

    return 'Unknown Text';
}

const isAudioCodec = (codecString) => {
    if (!codecString) return false;
    const lowerCodec = codecString.toLowerCase();
    const audioPrefixes = ['mp4a', 'ac-3', 'ec-3', 'opus', 'flac'];
    return audioPrefixes.some((prefix) => lowerCodec.startsWith(prefix));
};

function sortVideoRepresentations(a, b) {
    const heightA = a.height?.value || 0;
    const heightB = b.height?.value || 0;
    if (heightA !== heightB) return heightB - heightA;
    const widthA = a.width?.value || 0;
    const widthB = b.width?.value || 0;
    if (widthA !== widthB) return widthB - widthA;
    return (b.bandwidth || 0) - (a.bandwidth || 0);
}

function sortAudioRepresentations(a, b) {
    return (b.bandwidth || 0) - (a.bandwidth || 0);
}

const contentTypeOrder = ['video', 'audio', 'text', 'application'];
function sortAdaptationSets(a, b) {
    const indexA = contentTypeOrder.indexOf(a.contentType);
    const indexB = contentTypeOrder.indexOf(b.contentType);
    if (indexA !== indexB)
        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    if (a.contentType === 'audio' || a.contentType === 'text') {
        const langA = a.lang || '';
        const langB = b.lang || '';
        if (langA.localeCompare(langB) !== 0) return langA.localeCompare(langB);
    }
    const idA = a.id || '';
    const idB = b.id || '';
    return idA.localeCompare(idB);
}

function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map((item) => deepClone(item));
    if (obj instanceof Object) {
        const copy = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key))
                copy[key] = deepClone(obj[key]);
        }
        return copy;
    }
    throw new Error("Unable to copy obj! Its type isn't supported.");
}

const parseGenericDescriptor = (el) => ({
    schemeIdUri: getAttr(el, 'schemeIdUri'),
    value: getAttr(el, 'value'),
    id: getAttr(el, 'id'),
});

const parseLabel = (el) => ({
    id: getAttr(el, 'id'),
    lang: getAttr(el, 'lang'),
    text: getText(el),
});

const parseResync = (el) => ({
    type: parseInt(getAttr(el, 'type') || '0', 10),
    dT: getAttr(el, 'dT') ? parseInt(getAttr(el, 'dT'), 10) : null,
    dImax: getAttr(el, 'dImax') ? parseFloat(getAttr(el, 'dImax')) : null,
    dImin: getAttr(el, 'dImin') ? parseFloat(getAttr(el, 'dImin')) : null,
    marker: getAttr(el, 'marker') === 'true',
});

const parseOutputProtection = (el) => {
    const opEl = findChildren(el, 'OutputProtection')[0];
    if (!opEl) return null;
    return {
        schemeIdUri: getAttr(opEl, 'schemeIdUri'),
        value: getAttr(opEl, 'value'),
        robustness: getAttr(opEl, 'robustness'),
    };
};

const parseExtendedBandwidth = (el) => {
    const ebEl = findChildren(el, 'ExtendedBandwidth')[0];
    if (!ebEl) return null;
    return {
        vbr: getAttr(ebEl, 'vbr') === 'true',
        modelPairs: findChildren(ebEl, 'ModelPair').map((mpEl) => ({
            bufferTime: parseDuration(getAttr(mpEl, 'bufferTime')),
            bandwidth: parseInt(getAttr(mpEl, 'bandwidth'), 10),
        })),
    };
};

function parseFailoverContent(mergedEl) {
    const segmentBaseEl = findChildren(mergedEl, 'SegmentBase')[0];
    if (!segmentBaseEl) return null;
    const failoverEl = findChildren(segmentBaseEl, 'FailoverContent')[0];
    if (!failoverEl) return null;
    return {
        valid: getAttr(failoverEl, 'valid') !== 'false',
        fcs: findChildren(failoverEl, 'FCS').map((fcsEl) => ({
            t: parseInt(getAttr(fcsEl, 't'), 10),
            d: getAttr(fcsEl, 'd') ? parseInt(getAttr(fcsEl, 'd'), 10) : null,
        })),
    };
}

const parseSwitching = (el) => {
    const switchingEls = findChildren(el, 'Switching');
    if (!switchingEls.length) return null;
    return switchingEls.map((s) => ({
        interval: parseInt(getAttr(s, 'interval'), 10),
        type: getAttr(s, 'type') || 'media',
    }));
};

const parseRandomAccess = (el) => {
    const raEls = findChildren(el, 'RandomAccess');
    if (!raEls.length) return null;
    return raEls.map((r) => ({
        interval: parseInt(getAttr(r, 'interval'), 10),
        type: getAttr(r, 'type') || 'closed',
        minBufferTime: parseDuration(getAttr(r, 'minBufferTime')),
        bandwidth: parseInt(getAttr(r, 'bandwidth'), 10),
    }));
};

function parseSubRepresentation(subRepEl, parentMergedEl) {
    const mergedEl = mergeElements(parentMergedEl, subRepEl);
    const subRepIR = {
        level: getAttr(subRepEl, 'level')
            ? parseInt(getAttr(subRepEl, 'level'), 10)
            : null,
        dependencyLevel: getAttr(subRepEl, 'dependencyLevel'),
        bandwidth: getAttr(subRepEl, 'bandwidth')
            ? parseInt(getAttr(subRepEl, 'bandwidth'), 10)
            : null,
        contentComponent: getAttr(subRepEl, 'contentComponent')?.split(' '),
        codecs: { value: getAttr(mergedEl, 'codecs'), source: 'manifest' },
        mimeType: getAttr(mergedEl, 'mimeType'),
        profiles: getAttr(mergedEl, 'profiles'),
        width: {
            value: getAttr(mergedEl, 'width')
                ? parseInt(getAttr(mergedEl, 'width'), 10)
                : null,
            source: 'manifest',
        },
        height: {
            value: getAttr(mergedEl, 'height')
                ? parseInt(getAttr(mergedEl, 'height'), 10)
                : null,
            source: 'manifest',
        },
        serializedManifest: subRepEl,
    };
    return subRepIR;
}

function parseRepresentation(repEl, parentMergedEl, contentType) {
    const mergedRepEl = mergeElements(parentMergedEl, repEl);
    const codecString = getAttr(mergedRepEl, 'codecs') || '';
    const allCodecs = codecString
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

    const videoCodecs = allCodecs.filter(isVideoCodec);
    const audioCodecs = allCodecs.filter(isAudioCodec);
    const lang = getAttr(mergedRepEl, 'lang') || null;

    const labels = findChildren(mergedRepEl, 'Label').map(parseLabel);
    const label = labels.length > 0 ? labels[0].text : null;
    const format =
        videoCodecs.length > 0
            ? videoCodecs[0].split('.')[0].toUpperCase()
            : audioCodecs.length > 0
              ? audioCodecs[0].split('.')[0].toUpperCase()
              : null;

    let primaryCodecs = videoCodecs;
    if (contentType === 'audio') {
        primaryCodecs = audioCodecs;
    } else if (contentType === 'text' || contentType === 'application') {
        primaryCodecs = allCodecs;
    }

    if (primaryCodecs.length === 0 && allCodecs.length > 0) {
        if (contentType !== 'video' || videoCodecs.length === 0) {
            primaryCodecs = allCodecs;
        }
    }

    const repIR = {
        id: getAttr(repEl, 'id'),
        label: label,
        format: format,
        bandwidth: parseInt(getAttr(repEl, 'bandwidth'), 10),
        qualityRanking: getAttr(repEl, 'qualityRanking')
            ? parseInt(getAttr(repEl, 'qualityRanking'), 10)
            : null,
        dependencyId: getAttr(repEl, 'dependencyId'),
        associationId: getAttr(repEl, 'associationId'),
        associationType: getAttr(repEl, 'associationType'),
        codecs: primaryCodecs.map((c) => ({
            value: c,
            source: 'manifest',
            supported: isCodecSupported(c),
        })),
        muxedAudio: {
            codecs: audioCodecs.map((c) => ({
                value: c,
                source: 'manifest',
                supported: isCodecSupported(c),
            })),
            channels: null,
            lang: lang,
        },
        mimeType: getAttr(mergedRepEl, 'mimeType'),
        profiles: getAttr(mergedRepEl, 'profiles'),
        width: {
            value: getAttr(mergedRepEl, 'width')
                ? parseInt(getAttr(mergedRepEl, 'width'), 10)
                : null,
            source: 'manifest',
        },
        height: {
            value: getAttr(mergedRepEl, 'height')
                ? parseInt(getAttr(mergedRepEl, 'height'), 10)
                : null,
            source: 'manifest',
        },
        frameRate: getAttr(mergedRepEl, 'frameRate'),
        sar: getAttr(mergedRepEl, 'sar'),
        audioSamplingRate: getAttr(mergedRepEl, 'audioSamplingRate'),
        scanType: getAttr(mergedRepEl, 'scanType'),
        startWithSAP: getAttr(mergedRepEl, 'startWithSAP')
            ? parseInt(getAttr(mergedRepEl, 'startWithSAP'), 10)
            : null,
        selectionPriority: getAttr(mergedRepEl, 'selectionPriority')
            ? parseInt(getAttr(mergedRepEl, 'selectionPriority'), 10)
            : 0,
        tag: getAttr(mergedRepEl, 'tag'),
        lang: lang,
        mediaStreamStructureId: getAttr(mergedRepEl, 'mediaStreamStructureId'),
        maximumSAPPeriod: getAttr(mergedRepEl, 'maximumSAPPeriod')
            ? parseFloat(getAttr(mergedRepEl, 'maximumSAPPeriod'))
            : null,
        maxPlayoutRate: getAttr(mergedRepEl, 'maxPlayoutRate')
            ? parseFloat(getAttr(mergedRepEl, 'maxPlayoutRate'))
            : null,
        codingDependency:
            getAttr(mergedRepEl, 'codingDependency') === 'true'
                ? true
                : getAttr(mergedRepEl, 'codingDependency') === 'false'
                  ? false
                  : null,
        eptDelta: null,
        pdDelta: null,
        representationIndex: null,
        failoverContent: parseFailoverContent(mergedRepEl),
        contentProtection: findChildren(mergedRepEl, 'ContentProtection').map(
            (cpEl) => {
                const psshNode = findChildren(cpEl, 'pssh')[0];
                const psshData = psshNode ? getText(psshNode) : null;
                const schemeIdUri = getAttr(cpEl, 'schemeIdUri');
                return {
                    schemeIdUri: schemeIdUri,
                    system: getDrmSystemName(schemeIdUri),
                    defaultKid: getAttr(cpEl, 'default_KID'),
                    robustness: getAttr(cpEl, 'robustness'),
                    refId: getAttr(cpEl, 'refId'),
                    ref: getAttr(cpEl, 'ref'),
                    pssh: psshData
                        ? [
                              {
                                  systemId: schemeIdUri,
                                  kids: [],
                                  data: psshData,
                              },
                          ]
                        : [],
                };
            }
        ),
        audioChannelConfigurations: findChildren(
            mergedRepEl,
            'AudioChannelConfiguration'
        ).map(parseGenericDescriptor),
        framePackings: findChildren(mergedRepEl, 'FramePacking').map(
            parseGenericDescriptor
        ),
        ratings: findChildren(mergedRepEl, 'Rating').map(
            parseGenericDescriptor
        ),
        viewpoints: findChildren(mergedRepEl, 'Viewpoint').map(
            parseGenericDescriptor
        ),
        accessibility: findChildren(mergedRepEl, 'Accessibility').map(
            parseGenericDescriptor
        ),
        roles: findChildren(mergedRepEl, 'Role').map(parseGenericDescriptor),
        labels: findChildren(mergedRepEl, 'Label').map(parseLabel),
        groupLabels: findChildren(mergedRepEl, 'GroupLabel').map(parseLabel),
        subRepresentations: findChildren(repEl, 'SubRepresentation').map(
            (subRepEl) => parseSubRepresentation(subRepEl, mergedRepEl)
        ),
        resyncs: findChildren(mergedRepEl, 'Resync').map(parseResync),
        outputProtection: parseOutputProtection(mergedRepEl),
        extendedBandwidth: parseExtendedBandwidth(mergedRepEl),
        switching: parseSwitching(mergedRepEl),
        randomAccess: parseRandomAccess(mergedRepEl),
        videoRange: undefined,
        stableVariantId: null,
        pathwayId: null,
        supplementalCodecs: null,
        reqVideoLayout: null,
        serializedManifest: repEl,
        segmentProfiles: getAttr(mergedRepEl, 'segmentProfiles'),
    };

    if (!repIR.muxedAudio.codecs) {
        repIR.muxedAudio.codecs = [];
    }

    return repIR;
}

function parseContentComponent(ccEl, parentEl) {
    const mergedEl = mergeElements(parentEl, ccEl);
    return {
        id: getAttr(ccEl, 'id'),
        lang: getAttr(mergedEl, 'lang'),
        contentType: getAttr(mergedEl, 'contentType'),
        par: getAttr(mergedEl, 'par'),
        tag: getAttr(mergedEl, 'tag'),
        accessibility: findChildren(mergedEl, 'Accessibility').map(
            parseGenericDescriptor
        ),
        roles: findChildren(mergedEl, 'Role').map(parseGenericDescriptor),
        ratings: findChildren(mergedEl, 'Rating').map(parseGenericDescriptor),
        viewpoints: findChildren(mergedEl, 'Viewpoint').map(
            parseGenericDescriptor
        ),
        serializedManifest: ccEl,
    };
}

function parseAdaptationSet(asEl, parentMergedEl) {
    const mergedAsEl = mergeElements(parentMergedEl, asEl);
    const contentComponentEls = findChildren(asEl, 'ContentComponent');

    let contentType =
        getAttr(asEl, 'contentType') ||
        getAttr(asEl, 'mimeType')?.split('/')[0];

    if (!contentType) {
        const firstRep = findChildren(asEl, 'Representation')[0];
        if (firstRep) {
            contentType = getAttr(firstRep, 'mimeType')?.split('/')[0];
        }
    }

    const labels = findChildren(asEl, 'Label').map(parseLabel);
    const attributeLabel = getAttr(asEl, 'label');
    if (labels.length === 0 && attributeLabel) {
        labels.push({ id: null, lang: null, text: attributeLabel });
    }

    let contentComponents;
    if (contentComponentEls.length > 0) {
        contentComponents = contentComponentEls.map((ccEl) =>
            parseContentComponent(ccEl, asEl)
        );
    } else {
        contentComponents = [
            {
                id: null,
                lang: getAttr(asEl, 'lang'),
                contentType: contentType,
                par: getAttr(asEl, 'par'),
                tag: getAttr(asEl, 'tag'),
                accessibility: findChildren(asEl, 'Accessibility').map(
                    parseGenericDescriptor
                ),
                roles: findChildren(asEl, 'Role').map(parseGenericDescriptor),
                ratings: findChildren(asEl, 'Rating').map(
                    parseGenericDescriptor
                ),
                viewpoints: findChildren(asEl, 'Viewpoint').map(
                    parseGenericDescriptor
                ),
                serializedManifest: asEl,
            },
        ];
    }

    const minW = getAttr(asEl, 'minWidth');
    const maxW = getAttr(asEl, 'maxWidth');
    const minH = getAttr(asEl, 'minHeight');
    const maxH = getAttr(asEl, 'maxHeight');

    const representations = findChildren(asEl, 'Representation').map((repEl) =>
        parseRepresentation(repEl, mergedAsEl, contentType)
    );

    if (contentType === 'video') {
        representations.sort(sortVideoRepresentations);
    } else if (contentType === 'audio') {
        representations.sort(sortAudioRepresentations);
    }

    let format = null;
    if (contentType === 'text' || contentType === 'application') {
        format = inferDashTextFormat(
            getAttr(mergedAsEl, 'mimeType'),
            getAttr(mergedAsEl, 'codecs')
        );
    }

    const asIR = {
        id: getAttr(asEl, 'id'),
        format: format,
        group: getAttr(asEl, 'group')
            ? parseInt(getAttr(asEl, 'group'), 10)
            : null,
        lang: getAttr(asEl, 'lang'),
        contentType: contentType,
        bitstreamSwitching:
            getAttr(asEl, 'bitstreamSwitching') === 'true' ? true : null,
        segmentAlignment: getAttr(mergedAsEl, 'segmentAlignment') === 'true',
        subsegmentAlignment:
            getAttr(mergedAsEl, 'subsegmentAlignment') === 'true',
        subsegmentStartsWithSAP: getAttr(mergedAsEl, 'subsegmentStartsWithSAP')
            ? parseInt(getAttr(mergedAsEl, 'subsegmentStartsWithSAP'), 10)
            : null,
        width: minW && minW === maxW ? parseInt(minW, 10) : null,
        height: minH && minH === maxH ? parseInt(minH, 10) : null,
        maxWidth: maxW ? parseInt(maxW, 10) : null,
        maxHeight: maxH ? parseInt(maxH, 10) : null,
        maxFrameRate: getAttr(asEl, 'maxFrameRate'),
        sar: getAttr(mergedAsEl, 'sar'),
        maximumSAPPeriod: getAttr(mergedAsEl, 'maximumSAPPeriod')
            ? parseFloat(getAttr(mergedAsEl, 'maximumSAPPeriod'))
            : null,
        audioSamplingRate: getAttr(asEl, 'audioSamplingRate')
            ? parseInt(getAttr(asEl, 'audioSamplingRate'), 10)
            : null,
        mimeType: getAttr(mergedAsEl, 'mimeType'),
        profiles: getAttr(mergedAsEl, 'profiles'),
        representations: representations,
        contentProtection: findChildren(mergedAsEl, 'ContentProtection').map(
            (cpEl) => {
                const psshNode = findChildren(cpEl, 'pssh')[0];
                const psshData = psshNode ? getText(psshNode) : null;
                const schemeIdUri = getAttr(cpEl, 'schemeIdUri');
                return {
                    schemeIdUri: schemeIdUri,
                    system: getDrmSystemName(schemeIdUri),
                    defaultKid: getAttr(cpEl, 'default_KID'),
                    robustness: getAttr(cpEl, 'robustness'),
                    refId: getAttr(cpEl, 'refId'),
                    ref: getAttr(cpEl, 'ref'),
                    pssh: psshData
                        ? [
                              {
                                  systemId: schemeIdUri,
                                  kids: [],
                                  data: psshData,
                              },
                          ]
                        : [],
                };
            }
        ),
        inbandEventStreams: findChildren(mergedAsEl, 'InbandEventStream').map(
            parseGenericDescriptor
        ),
        audioChannelConfigurations: findChildren(
            mergedAsEl,
            'AudioChannelConfiguration'
        ).map(parseGenericDescriptor),
        framePackings: findChildren(mergedAsEl, 'FramePacking').map(
            parseGenericDescriptor
        ),
        ratings: findChildren(mergedAsEl, 'Rating').map(parseGenericDescriptor),
        viewpoints: findChildren(mergedAsEl, 'Viewpoint').map(
            parseGenericDescriptor
        ),
        accessibility: findChildren(mergedAsEl, 'Accessibility').map(
            parseGenericDescriptor
        ),
        labels: labels,
        groupLabels: findChildren(mergedAsEl, 'GroupLabel').map(parseLabel),
        roles: findChildren(mergedAsEl, 'Role').map(parseGenericDescriptor),
        contentComponents: contentComponents,
        resyncs: findChildren(mergedAsEl, 'Resync').map(parseResync),
        outputProtection: parseOutputProtection(mergedAsEl),
        stableRenditionId: null,
        bitDepth: null,
        sampleRate: null,
        channels: null,
        assocLanguage: null,
        characteristics: null,
        forced: false,
        serializedManifest: asEl,
        switching: parseSwitching(mergedAsEl),
    };
    return asIR;
}

function parsePreselection(preselectionEl, parentMergedEl) {
    const mergedEl = mergeElements(parentMergedEl, preselectionEl);
    return {
        id: getAttr(preselectionEl, 'id') || '1',
        preselectionComponents:
            getAttr(preselectionEl, 'preselectionComponents')?.split(' ') || [],
        lang: getAttr(preselectionEl, 'lang'),
        order: getAttr(preselectionEl, 'order') || 'undefined',
        accessibility: findChildren(mergedEl, 'Accessibility').map(
            parseGenericDescriptor
        ),
        roles: findChildren(mergedEl, 'Role').map(parseGenericDescriptor),
        ratings: findChildren(mergedEl, 'Rating').map(parseGenericDescriptor),
        viewpoints: findChildren(mergedEl, 'Viewpoint').map(
            parseGenericDescriptor
        ),
        serializedManifest: preselectionEl,
    };
}

const parseServiceDescription = (sdEl) => ({
    id: getAttr(sdEl, 'id'),
    scopes: findChildren(sdEl, 'Scope').map(parseGenericDescriptor),
    latencies: findChildren(sdEl, 'Latency').map((el) => ({
        min: getAttr(el, 'min') ? parseInt(getAttr(el, 'min'), 10) : null,
        max: getAttr(el, 'max') ? parseInt(getAttr(el, 'max'), 10) : null,
        target: getAttr(el, 'target')
            ? parseInt(getAttr(el, 'target'), 10)
            : null,
        referenceId: getAttr(el, 'referenceId')
            ? parseInt(getAttr(el, 'referenceId'), 10)
            : null,
    })),
    playbackRates: findChildren(sdEl, 'PlaybackRate').map((el) => ({
        min: getAttr(el, 'min') ? parseFloat(getAttr(el, 'min')) : null,
        max: getAttr(el, 'max') ? parseFloat(getAttr(el, 'max')) : null,
    })),
    serializedManifest: sdEl,
});

const parseContentPopularityRate = (el) => ({
    source: getAttr(el, 'source'),
    source_description: getAttr(el, 'source_description'),
    rates: findChildren(el, 'PR').map((pr) => ({
        rate: parseInt(getAttr(pr, 'rate'), 10),
        popularity: parseInt(getAttr(pr, 'popularity'), 10),
    })),
});

const getText = (el) => el?.['#text'] || null;

function parsePeriod(periodEl, parentMergedEl, previousPeriod = null) {
    const mergedPeriodEl = mergeElements(parentMergedEl, periodEl);
    const assetIdentifierEl = findChildren(periodEl, 'AssetIdentifier')[0];
    const subsets = findChildren(periodEl, 'Subset');
    const eventStreams = findChildren(periodEl, 'EventStream');
    const periodId = getAttr(periodEl, 'id');

    let periodStart = parseDuration(getAttr(periodEl, 'start'));
    if (periodStart === null) {
        if (previousPeriod && previousPeriod.duration !== null) {
            periodStart = previousPeriod.start + previousPeriod.duration;
        } else {
            periodStart = 0;
        }
    }
    const periodDuration = parseDuration(getAttr(periodEl, 'duration'));

    const allEvents = [];
    const adAvails = [];

    const eventStreamIRs = eventStreams.map((esEl) => {
        const schemeIdUri = getAttr(esEl, 'schemeIdUri');
        const timescale = parseInt(getAttr(esEl, 'timescale') || '1', 10);
        const presentationTimeOffset = parseInt(
            getAttr(esEl, 'presentationTimeOffset') || '0',
            10
        );

        const events = findChildren(esEl, 'Event').map((eEl) => {
            const presentationTime = parseInt(
                getAttr(eEl, 'presentationTime') || '0',
                10
            );
            const duration = parseInt(getAttr(eEl, 'duration') || '0', 10);
            const startTime =
                periodStart +
                (presentationTime - presentationTimeOffset) / timescale;
            const eventDuration = duration / timescale;
            const messageData = getAttr(eEl, 'messageData');

            const event = {
                startTime,
                duration: eventDuration,
                message: getText(eEl) || messageData,
                messageData: messageData,
                type: 'dash-event',
                cue: null,
            };

            if (messageData && schemeIdUri?.toLowerCase().includes('scte35')) {
                try {
                    const binaryData = Uint8Array.from(atob(messageData), (c) =>
                        c.charCodeAt(0)
                    );
                    event.scte35 = parseScte35(binaryData);
                } catch (e) {
                    console.error(
                        'Failed to parse SCTE-35 from DASH Event:',
                        e
                    );
                }
            }
            return event;
        });
        allEvents.push(...events);
        return {
            schemeIdUri: schemeIdUri,
            value: getAttr(esEl, 'value'),
            timescale,
            presentationTimeOffset,
            events: [],
        };
    });

    const rawAdaptationSets = findChildren(periodEl, 'AdaptationSet');
    const adaptationSets = rawAdaptationSets.map((asEl) =>
        parseAdaptationSet(asEl, mergedPeriodEl)
    );
    adaptationSets.sort(sortAdaptationSets);

    // FIX: Looser check for SCTE-35 detection
    const hasScte35 = adaptationSets.some((as) =>
        (as.inbandEventStreams || []).some((ies) => {
            const uri = (ies.schemeIdUri || '').toLowerCase();
            return uri.includes('scte35');
        })
    );

    if (hasScte35) {
        appLog(
            'DashAdapter',
            'info',
            'SCTE-35 Inband Event Stream detected. Adding placeholder.'
        );
        adAvails.push({
            id: 'unconfirmed-inband-scte35',
            startTime: -1,
            duration: -1,
            scte35Signal: { error: 'Unconfirmed In-band Signal' },
            adManifestUrl: null,
            creatives: [],
            detectionMethod: 'SCTE35_INBAND',
        });
    }

    const periodIR = {
        id: periodId,
        start: periodStart,
        duration: periodDuration,
        bitstreamSwitching: getAttr(periodEl, 'bitstreamSwitching') === 'true',
        assetIdentifier: assetIdentifierEl
            ? {
                  schemeIdUri: getAttr(assetIdentifierEl, 'schemeIdUri'),
                  value: getAttr(assetIdentifierEl, 'value'),
              }
            : null,
        subsets: subsets.map((s) => ({
            contains: (getAttr(s, 'contains') || '').split(' '),
            id: getAttr(s, 'id'),
        })),
        adaptationSets: adaptationSets,
        preselections: findChildren(periodEl, 'Preselection').map((pEl) =>
            parsePreselection(pEl, mergedPeriodEl)
        ),
        serviceDescriptions: findChildren(periodEl, 'ServiceDescription').map(
            parseServiceDescription
        ),
        eventStreams: eventStreamIRs,
        events: allEvents,
        adAvails: adAvails,
        supplementalProperties: findChildren(
            periodEl,
            'SupplementalProperty'
        ).map(parseGenericDescriptor),
        serializedManifest: periodEl,
    };
    return periodIR;
}

export async function adaptDashToIr(manifestElement, baseUrl, context) {
    const manifestCopy = deepClone(manifestElement);
    linkParents(manifestCopy);

    const adaptationSets = findChildrenRecursive(manifestCopy, 'AdaptationSet');
    const hasTsMimeType = adaptationSets.some(
        (as) => getAttr(as, 'mimeType') === 'video/mp2t'
    );

    let segmentFormat = 'isobmff';
    if (hasTsMimeType) {
        segmentFormat = 'ts';
    } else {
        const template = findChildrenRecursive(
            manifestCopy,
            'SegmentTemplate'
        )[0];
        if (template) {
            const mediaUrl = getAttr(template, 'media');
            if (mediaUrl) {
                const { contentType } = inferMediaInfoFromExtension(mediaUrl);
                if (contentType === 'video') {
                    const extensionBasedFormat =
                        inferMediaInfoFromExtension(mediaUrl).contentType ===
                        'video'
                            ? 'isobmff'
                            : 'ts';
                    if (extensionBasedFormat === 'ts') segmentFormat = 'ts';
                }
            }
        }
    }

    const manifestIR = {
        id: getAttr(manifestCopy, 'id'),
        type: getAttr(manifestCopy, 'type'),
        profiles: getAttr(manifestCopy, 'profiles'),
        minBufferTime: parseDuration(getAttr(manifestCopy, 'minBufferTime')),
        publishTime: getAttr(manifestCopy, 'publishTime')
            ? new Date(getAttr(manifestCopy, 'publishTime'))
            : null,
        availabilityStartTime: getAttr(manifestCopy, 'availabilityStartTime')
            ? new Date(getAttr(manifestCopy, 'availabilityStartTime'))
            : null,
        availabilityEndTime: getAttr(manifestCopy, 'availabilityEndTime')
            ? new Date(getAttr(manifestCopy, 'availabilityEndTime'))
            : null,
        timeShiftBufferDepth: parseDuration(
            getAttr(manifestCopy, 'timeShiftBufferDepth')
        ),
        minimumUpdatePeriod: parseDuration(
            getAttr(manifestCopy, 'minimumUpdatePeriod')
        ),
        duration: parseDuration(
            getAttr(manifestCopy, 'mediaPresentationDuration')
        ),
        maxSegmentDuration: parseDuration(
            getAttr(manifestCopy, 'maxSegmentDuration')
        ),
        maxSubsegmentDuration: parseDuration(
            getAttr(manifestCopy, 'maxSubsegmentDuration')
        ),
        suggestedPresentationDelay: parseDuration(
            getAttr(manifestCopy, 'suggestedPresentationDelay')
        ),
        programInformations: findChildren(
            manifestCopy,
            'ProgramInformation'
        ).map((el) => ({
            title: getText(findChildren(el, 'Title')[0]),
            source: getText(findChildren(el, 'Source')[0]),
            copyright: getText(findChildren(el, 'Copyright')[0]),
            lang: getAttr(el, 'lang'),
            moreInformationURL: getAttr(el, 'moreInformationURL'),
        })),
        locations: findChildren(manifestCopy, 'Location').map(getText),
        patchLocations: findChildren(manifestCopy, 'PatchLocation').map(
            getText
        ),
        serviceDescriptions: findChildren(
            manifestCopy,
            'ServiceDescription'
        ).map(parseServiceDescription),
        contentPopularityRates: findChildren(
            manifestCopy,
            'ContentPopularityRate'
        ).map(parseContentPopularityRate),
        initializationSets: findChildren(manifestCopy, 'InitializationSet').map(
            (el) => ({
                id: getAttr(el, 'id'),
                inAllPeriods: getAttr(el, 'inAllPeriods') !== 'false',
                contentType: getAttr(el, 'contentType'),
                initialization: getAttr(el, 'initialization'),
                codecs: getAttr(el, 'codecs'),
                serializedManifest: el,
            })
        ),
        periods: [],
        segmentFormat: segmentFormat,
        contentProtections: findChildren(manifestCopy, 'ContentProtection').map(
            (cpEl) => {
                const psshNode = findChildren(cpEl, 'cenc:pssh')[0];
                const psshData = psshNode ? getText(psshNode) : null;
                const schemeIdUri = getAttr(cpEl, 'schemeIdUri');
                return {
                    schemeIdUri: schemeIdUri,
                    system: getDrmSystemName(schemeIdUri),
                    defaultKid: getAttr(cpEl, 'cenc:default_KID'),
                    robustness: getAttr(cpEl, 'robustness'),
                    refId: getAttr(cpEl, 'refId'),
                    ref: getAttr(cpEl, 'ref'),
                    pssh: psshData
                        ? [
                              {
                                  systemId: schemeIdUri,
                                  kids: [],
                                  data: psshData,
                              },
                          ]
                        : [],
                };
            }
        ),
        serializedManifest: manifestElement,
        metrics: [],
        events: [],
        adAvails: context?.oldAdAvails ? [...context.oldAdAvails] : [],
        summary: null,
        serverControl: null,
    };

    let previousPeriod = null;
    manifestIR.periods = findChildren(manifestCopy, 'Period').map((p) => {
        const periodIR = parsePeriod(p, manifestCopy, previousPeriod);
        previousPeriod = periodIR;
        return periodIR;
    });

    manifestIR.events.push(...manifestIR.periods.flatMap((p) => p.events));
    for (const period of manifestIR.periods) {
        if (period.adAvails) {
            for (const newAvail of period.adAvails) {
                if (!manifestIR.adAvails.some((a) => a.id === newAvail.id)) {
                    manifestIR.adAvails.push(newAvail);
                }
            }
        }
    }
    return manifestIR;
}
