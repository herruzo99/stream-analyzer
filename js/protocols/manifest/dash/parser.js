import { adaptDashToIr } from './adapter.js';
import { XMLParser } from 'fast-xml-parser';

/**
 * Parses a DASH Manifest XML string and returns a protocol-agnostic Intermediate Representation.
 * This is the public entry point for the DASH manifest parsing module.
 * @param {string} xmlString The raw MPD XML.
 * @param {string} baseUrl The URL from which the MPD was fetched.
 * @returns {Promise<{manifest: import('../../../core/types.js').Manifest, serializedManifest: object, baseUrl: string}>}
 */
export async function parseManifest(xmlString, baseUrl) {
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
                // MPD Level
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
                // Period Level
                'EventStream',
                'AdaptationSet',
                'Subset',
                'EmptyAdaptationSet',
                'GroupLabel',
                'Preselection',
                // AdaptationSet & RepresentationBase Levels
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
                // Representation Level
                'SubRepresentation',
                'ExtendedBandwidth',
                'ModelPair',
                // ServiceDescription Level
                'Scope',
                'Latency',
                'PlaybackRate',
                'OperatingQuality',
                'OperatingBandwidth',
                // Segment Info
                'SegmentURL',
                'S',
                'FCS', // FailoverContent child
                // Event Info
                'Event',
                // Metrics Info
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

    const manifestIR = adaptDashToIr(serializedManifest, baseUrl);

    return {
        manifest: manifestIR,
        serializedManifest,
        baseUrl: baseUrl,
    };
}