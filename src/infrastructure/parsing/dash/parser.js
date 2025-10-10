import { adaptDashToIr } from './adapter.js';
import { XMLParser } from 'fast-xml-parser';

/**
 * Parses a DASH Manifest XML string and returns a protocol-agnostic Intermediate Representation.
 * This is the public entry point for the DASH manifest parsing module.
 * @param {string} xmlString The raw MPD XML.
 * @param {string} baseUrl The URL from which the MPD was fetched.
 * @param {object} [context]
 * @returns {Promise<{manifest: import('@/types.ts').Manifest, serializedManifest: object, baseUrl: string}>}
 */
export async function parseManifest(xmlString, baseUrl, context) {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        attributesGroupName: ':@',
        textNodeName: '#text',
        allowBooleanAttributes: true,
        removeNSPrefix: true,
        alwaysCreateTextNode: true,
        isArray: (tagName) => {
            return [
                'ProgramInformation',
                'BaseURL',
                'Location',
                'PatchLocation',
                'ServiceDescription',
                'InitializationSet',
                'InitializationGroup',
                'InitializationPresentation',
                'ContentProtection',
                'Period',
                'Metrics',
                'EssentialProperty',
                'SupplementalProperty',
                'UTCTiming',
                'EventStream',
                'AdaptationSet',
                'Subset',
                'EmptyAdaptationSet',
                'GroupLabel',
                'Preselection',
                'Accessibility',
                'Role',
                'Rating',
                'Viewpoint',
                'ContentComponent',
                'Representation',
                'FramePacking',
                'AudioChannelConfiguration',
                'InbandEventStream',
                'Switching',
                'RandomAccess',
                'Label',
                'ProducerReferenceTime',
                'ContentPopularityRate',
                'Resync',
                'OutputProtection',
                'SubRepresentation',
                'ExtendedBandwidth',
                'ModelPair',
                'Scope',
                'Latency',
                'PlaybackRate',
                'OperatingQuality',
                'OperatingBandwidth',
                'SegmentURL',
                'S',
                'FCS',
                'Event',
                'Reporting',
                'Range',
            ].includes(tagName);
        },
    });

    const jsonObj = parser.parse(xmlString);
    const mpdNodeKey = Object.keys(jsonObj).find(
        (key) => key.toUpperCase() === 'MPD'
    );
    if (!mpdNodeKey) {
        throw new Error('Could not find MPD root element in the manifest.');
    }
    const serializedManifest = jsonObj[mpdNodeKey];

    const manifestIR = await adaptDashToIr(
        serializedManifest,
        baseUrl,
        context
    );

    return {
        manifest: manifestIR,
        serializedManifest,
        baseUrl: baseUrl,
    };
}
