(() => {
    var Jo = Object.create;
    var Ie = Object.defineProperty;
    var Zo = Object.getOwnPropertyDescriptor;
    var es = Object.getOwnPropertyNames;
    var ts = Object.getPrototypeOf,
        ns = Object.prototype.hasOwnProperty;
    var B = (e, t) => () => (e && (t = e((e = 0))), t);
    var Ze = (e, t) => () => (
            t || e((t = { exports: {} }).exports, t),
            t.exports
        ),
        et = (e, t) => {
            for (var n in t) Ie(e, n, { get: t[n], enumerable: !0 });
        },
        is = (e, t, n, i) => {
            if ((t && typeof t == 'object') || typeof t == 'function')
                for (let r of es(t))
                    !ns.call(e, r) &&
                        r !== n &&
                        Ie(e, r, {
                            get: () => t[r],
                            enumerable: !(i = Zo(t, r)) || i.enumerable,
                        });
            return e;
        };
    var rs = (e, t, n) => (
        (n = e != null ? Jo(ts(e)) : {}),
        is(
            t || !e || !e.__esModule
                ? Ie(n, 'default', { value: e, enumerable: !0 })
                : n,
            e
        )
    );
    function pe(e) {
        if (!e) return 'Unknown Scheme';
        let t = e.toLowerCase();
        return Is[t] || `Unknown (${e})`;
    }
    var Is,
        ke = B(() => {
            Is = {
                'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed': 'Widevine',
                'urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95': 'PlayReady',
                'urn:uuid:f239e769-efa3-4850-9c16-a903c6932efb':
                    'Adobe PrimeTime',
                'urn:uuid:1077efec-c0b2-4d02-ace3-3c1e52e2fb4b': 'ClearKey',
                'urn:uuid:94ce86fb-07ff-4f43-adb8-93d2fa968ca2': 'FairPlay',
                'urn:mpeg:dash:mp4protection:2011':
                    'MPEG Common Encryption (CENC)',
            };
        });
    var xo,
        yo = B(() => {
            xo = [
                {
                    name: 'Presentation Type',
                    category: 'Core Streaming',
                    desc: 'Defines if the stream is live (`dynamic`) or on-demand (`static`).',
                    isoRef: 'DASH: 5.3.1.2',
                },
                {
                    name: 'MPD Locations',
                    category: 'Core Streaming',
                    desc: 'Provides alternative URLs where the MPD can be fetched, enabling CDN redundancy.',
                    isoRef: 'DASH: 5.3.1.2',
                },
                {
                    name: 'Scoped Profiles',
                    category: 'Core Streaming',
                    desc: 'Declares profile conformance for specific Adaptation Sets or Representations, allowing for mixed-profile manifests.',
                    isoRef: 'DASH: 5.3.7.2',
                },
                {
                    name: 'Multi-Period',
                    category: 'Core Streaming',
                    desc: 'The presentation is split into multiple, independent periods. Commonly used for Server-Side Ad Insertion (SSAI).',
                    isoRef: 'DASH: 5.3.2',
                },
                {
                    name: 'Content Protection',
                    category: 'Core Streaming',
                    desc: 'Indicates that the content is encrypted using one or more schemes like CENC.',
                    isoRef: 'DASH: 5.8.4.1',
                },
                {
                    name: 'Client Authentication',
                    category: 'Core Streaming',
                    desc: 'Signals that client authentication is required to access the content, typically via an EssentialProperty descriptor.',
                    isoRef: 'DASH: 5.8.5.11',
                },
                {
                    name: 'Content Authorization',
                    category: 'Core Streaming',
                    desc: 'Signals that content authorization is required to access the content, often in conjunction with Client Authentication.',
                    isoRef: 'DASH: 5.8.5.11',
                },
                {
                    name: 'Segment Templates',
                    category: 'Timeline & Segment Management',
                    desc: 'Segment URLs are generated using a template, typically with $Number$ or $Time$ placeholders.',
                    isoRef: 'DASH: 5.3.9.4',
                },
                {
                    name: 'Segment Timeline',
                    category: 'Timeline & Segment Management',
                    desc: 'Provides explicit timing and duration for each segment via <S> elements, allowing for variable segment sizes.',
                    isoRef: 'DASH: 5.3.9.6',
                },
                {
                    name: 'Segment List',
                    category: 'Timeline & Segment Management',
                    desc: 'Segment URLs are listed explicitly in the manifest. Common for VOD content.',
                    isoRef: 'DASH: 5.3.9.3',
                },
                {
                    name: 'Representation Index',
                    category: 'Timeline & Segment Management',
                    desc: 'Provides an index for the entire Representation in a single segment, separate from media segments.',
                    isoRef: 'DASH: 5.3.9.2.2',
                },
                {
                    name: 'MPD Chaining',
                    category: 'Timeline & Segment Management',
                    desc: 'The manifest indicates that another MPD should be played after this one concludes, allowing for programmatic playlists of presentations.',
                    isoRef: 'DASH: 5.11',
                },
                {
                    name: 'Failover Content',
                    category: 'Timeline & Segment Management',
                    desc: 'Signals time ranges where content may be replaced by failover content (e.g., slate) due to encoding errors.',
                    isoRef: 'DASH: 5.3.9.7',
                },
                {
                    name: 'Low Latency Streaming',
                    category: 'Live & Dynamic',
                    desc: 'The manifest includes features for low-latency playback, such as chunked transfer hints or specific service descriptions.',
                    isoRef: 'DASH: Annex K.3.2',
                },
                {
                    name: 'Manifest Patch Updates',
                    category: 'Live & Dynamic',
                    desc: 'Allows efficient manifest updates by sending only the changed parts of the manifest.',
                    isoRef: 'DASH: 5.15',
                },
                {
                    name: 'MPD Events',
                    category: 'Live & Dynamic',
                    desc: 'The manifest contains one or more <EventStream> elements, allowing timed metadata to be communicated to the client via the MPD.',
                    isoRef: 'DASH: 5.10.2',
                },
                {
                    name: 'Inband Events',
                    category: 'Live & Dynamic',
                    desc: 'The manifest signals that event messages ("emsg" boxes) are present within the media segments themselves, allowing for tightly synchronized metadata.',
                    isoRef: 'DASH: 5.10.3',
                },
                {
                    name: 'Producer Reference Time',
                    category: 'Live & Dynamic',
                    desc: 'Provides a mapping between media timestamps and a wall-clock production time, enabling latency measurement and control.',
                    isoRef: 'DASH: 5.12',
                },
                {
                    name: 'UTC Timing Source',
                    category: 'Live & Dynamic',
                    desc: 'Provides a source for clients to synchronize their wall-clock time, crucial for live playback.',
                    isoRef: 'DASH: 5.8.4.11',
                },
                {
                    name: 'Leap Second Information',
                    category: 'Live & Dynamic',
                    desc: 'Provides information on leap seconds to ensure accurate time calculations across time zones and daylight saving changes.',
                    isoRef: 'DASH: 5.13',
                },
                {
                    name: 'Dependent Representations',
                    category: 'Advanced Content',
                    desc: 'Uses Representations that depend on others for decoding, enabling scalable video coding (SVC) or multi-view coding (MVC).',
                    isoRef: 'DASH: 5.3.5.2',
                },
                {
                    name: 'Associated Representations',
                    category: 'Advanced Content',
                    desc: 'Signals a relationship between representations, such as a video description track associated with a main video track.',
                    isoRef: 'DASH: 5.3.5.2',
                },
                {
                    name: 'Trick Modes',
                    category: 'Advanced Content',
                    desc: 'Provides special tracks (e.g. I-Frame only) to enable efficient fast-forward and rewind.',
                    isoRef: 'DASH: 5.3.6',
                },
                {
                    name: 'Adaptation Set Switching',
                    category: 'Client Guidance & Optimization',
                    desc: 'Signals that a client can seamlessly switch between Representations in different Adaptation Sets (e.g., for different codecs).',
                    isoRef: 'DASH: 5.3.3.5',
                },
                {
                    name: 'Service Description',
                    category: 'Client Guidance & Optimization',
                    desc: 'Provides guidance to the client on latency targets, playback rates, and quality/bandwidth constraints for the service.',
                    isoRef: 'DASH: Annex K',
                },
                {
                    name: 'Resync Points',
                    category: 'Client Guidance & Optimization',
                    desc: 'Signals the presence of resynchronization points within segments to allow for faster startup or recovery after a stall.',
                    isoRef: 'DASH: 5.3.13',
                },
                {
                    name: 'Initialization Sets',
                    category: 'Client Guidance & Optimization',
                    desc: 'Defines a common set of media properties that apply across multiple Periods, allowing a client to establish a decoding environment upfront.',
                    isoRef: 'DASH: 5.3.12',
                },
                {
                    name: 'Selection Priority',
                    category: 'Client Guidance & Optimization',
                    desc: 'Provides a numeric priority for Adaptation Sets to guide client selection logic, where higher numbers are preferred.',
                    isoRef: 'DASH: 5.3.7.2',
                },
                {
                    name: 'Adaptation Set Grouping',
                    category: 'Client Guidance & Optimization',
                    desc: 'Groups Adaptation Sets to signal that they are mutually exclusive (e.g., different camera angles).',
                    isoRef: 'DASH: 5.3.3.1',
                },
                {
                    name: 'Bitstream Switching',
                    category: 'Client Guidance & Optimization',
                    desc: 'Signals that a client can switch between Representations without re-initializing the media decoder, enabling faster, more efficient switching.',
                    isoRef: 'DASH: 5.3.3.2',
                },
                {
                    name: 'Segment Profiles',
                    category: 'Client Guidance & Optimization',
                    desc: 'Specifies profiles that media segments conform to, providing more granular compatibility information.',
                    isoRef: 'DASH: 5.3.7.2',
                },
                {
                    name: 'Media Stream Structure',
                    category: 'Client Guidance & Optimization',
                    desc: 'Signals that different Representations share a compatible internal structure, simplifying seamless switching.',
                    isoRef: 'DASH: 5.3.5.2',
                },
                {
                    name: 'Max SAP Period',
                    category: 'Client Guidance & Optimization',
                    desc: 'Specifies the maximum time between stream access points (SAPs), allowing clients to better manage seeking and buffering.',
                    isoRef: 'DASH: 5.3.7.2',
                },
                {
                    name: 'Starts with SAP',
                    category: 'Client Guidance & Optimization',
                    desc: 'Indicates that segments begin with a Stream Access Point (SAP), which greatly simplifies switching and seeking logic.',
                    isoRef: 'DASH: 5.3.7.2',
                },
                {
                    name: 'Max Playout Rate',
                    category: 'Client Guidance & Optimization',
                    desc: 'Indicates the maximum playback rate (for trick modes like fast-forward) that the stream supports.',
                    isoRef: 'DASH: 5.3.7.2',
                },
                {
                    name: 'Byte-Range URL Templating',
                    category: 'Client Guidance & Optimization',
                    desc: 'Provides a template on a BaseURL for clients in environments that do not support HTTP Range headers.',
                    isoRef: 'DASH: 5.6.2',
                },
                {
                    name: 'Essential Properties',
                    category: 'Client Guidance & Optimization',
                    desc: 'Signals properties that are essential for the client to process for a valid experience.',
                    isoRef: 'DASH: 5.8.4.8',
                },
                {
                    name: 'Supplemental Properties',
                    category: 'Client Guidance & Optimization',
                    desc: 'Signals supplemental properties that a client may use for optimization.',
                    isoRef: 'DASH: 5.8.4.9',
                },
                {
                    name: 'Metrics',
                    category: 'Client Guidance & Optimization',
                    desc: 'Signals a request for the client to collect and report playback metrics.',
                    isoRef: 'DASH: 5.9',
                },
                {
                    name: 'Role Descriptors',
                    category: 'Accessibility & Metadata',
                    desc: 'Uses Role Descriptors to provide alternative tracks for language, commentary, or camera angles.',
                    isoRef: 'DASH: 5.8.4.2',
                },
                {
                    name: 'Subtitles & Captions',
                    category: 'Accessibility & Metadata',
                    desc: 'Provides text-based tracks for subtitles, closed captions, or other timed text information.',
                    isoRef: 'DASH: 5.3.3',
                },
                {
                    name: 'Asset Identifier',
                    category: 'Accessibility & Metadata',
                    desc: 'Provides a common identifier for Periods that belong to the same content asset, useful for tracking content across ad breaks.',
                    isoRef: 'DASH: 5.8.4.10',
                },
                {
                    name: 'Subsets',
                    category: 'Accessibility & Metadata',
                    desc: 'Restricts the combination of Adaptation Sets that can be played simultaneously, for example to prevent incompatible audio and video tracks from being selected.',
                    isoRef: 'DASH: 5.3.8',
                },
                {
                    name: 'Preselections',
                    category: 'Accessibility & Metadata',
                    desc: 'Defines a complete "experience" by grouping a set of Adaptation Sets (e.g., video + main audio + commentary). Primarily for advanced audio like NGA.',
                    isoRef: 'DASH: 5.3.11',
                },
                {
                    name: 'Labels',
                    category: 'Accessibility & Metadata',
                    desc: 'Provides human-readable text labels for elements like Representations and Adaptation Sets, which can be used in UI selectors.',
                    isoRef: 'DASH: 5.3.10',
                },
                {
                    name: 'Quality Ranking',
                    category: 'Accessibility & Metadata',
                    desc: 'Provides a numeric ranking for Representations within an Adaptation Set to guide ABR logic, where lower numbers typically mean higher quality.',
                    isoRef: 'DASH: 5.3.5.2',
                },
                {
                    name: 'Coding Dependency',
                    category: 'Accessibility & Metadata',
                    desc: 'Signals whether a Representation contains inter-frame dependencies (e.g., P/B-frames) or is entirely self-contained (e.g., I-frame only).',
                    isoRef: 'DASH: 5.3.7.2',
                },
                {
                    name: 'Audio Channel Configuration',
                    category: 'Accessibility & Metadata',
                    desc: 'Describes the audio channel layout, such as stereo (2.0) or surround sound (5.1).',
                    isoRef: 'DASH: 5.8.4.7',
                },
                {
                    name: 'Scan Type',
                    category: 'Accessibility & Metadata',
                    desc: 'Indicates whether the video content is progressive or interlaced.',
                    isoRef: 'DASH: 5.3.7.2',
                },
                {
                    name: 'Tag attribute',
                    category: 'Accessibility & Metadata',
                    desc: 'A generic string attribute that can be used for application-specific logic, such as decoder selection.',
                    isoRef: 'DASH: 5.3.7.2',
                },
                {
                    name: 'Program Information',
                    category: 'Accessibility & Metadata',
                    desc: 'Provides descriptive metadata about the media presentation, such as title or source.',
                    isoRef: 'DASH: 5.7',
                },
                {
                    name: 'Frame Packing Descriptors',
                    category: 'Accessibility & Metadata',
                    desc: 'Provides information on 3D video frame packing arrangements.',
                    isoRef: 'DASH: 5.8.4.6',
                },
                {
                    name: 'Rating Descriptors',
                    category: 'Accessibility & Metadata',
                    desc: 'Provides content rating information (e.g., MPAA ratings).',
                    isoRef: 'DASH: 5.8.4.4',
                },
                {
                    name: 'Viewpoint Descriptors',
                    category: 'Accessibility & Metadata',
                    desc: 'Provides information on camera viewpoints for multi-view content.',
                    isoRef: 'DASH: 5.8.4.5',
                },
                {
                    name: 'Accessibility Descriptors',
                    category: 'Accessibility & Metadata',
                    desc: 'Provides information about accessibility features for the content, such as audio descriptions.',
                    isoRef: 'DASH: 5.8.4.3',
                },
            ];
        });
    var So,
        bo = B(() => {
            So = [
                {
                    name: 'Presentation Type',
                    category: 'Core Streaming',
                    desc: 'Defines if the stream is live (`EVENT`) or on-demand (`VOD`).',
                    isoRef: 'HLS: 4.3.3.5',
                },
                {
                    name: 'Master Playlist',
                    category: 'Core Streaming',
                    desc: 'The manifest is an HLS master playlist that references multiple variant streams at different bitrates.',
                    isoRef: 'HLS: 4.3.4.2',
                },
                {
                    name: 'Discontinuity',
                    category: 'Core Streaming',
                    desc: 'The presentation contains discontinuity tags, commonly used for Server-Side Ad Insertion (SSAI).',
                    isoRef: 'HLS: 4.3.2.3',
                },
                {
                    name: 'Content Protection',
                    category: 'Core Streaming',
                    desc: 'Indicates that the content is encrypted using AES-128 or SAMPLE-AES.',
                    isoRef: 'HLS: 4.3.2.4',
                },
                {
                    name: 'Session Keys',
                    category: 'Core Streaming',
                    desc: 'Allows encryption keys to be specified in the Master Playlist via #EXT-X-SESSION-KEY, enabling clients to preload keys for faster startup.',
                    isoRef: 'HLS: 4.3.4.5',
                },
                {
                    name: 'Fragmented MP4 Segments',
                    category: 'Core Streaming',
                    desc: 'Content is structured using fMP4 segments instead of MPEG-2 Transport Stream (TS), indicated by #EXT-X-MAP.',
                    isoRef: 'HLS: 4.3.2.5',
                },
                {
                    name: 'Independent Segments',
                    category: 'Timeline & Segment Management',
                    desc: 'The playlist uses #EXT-X-INDEPENDENT-SEGMENTS, indicating that all media samples in a segment can be decoded without information from other segments.',
                    isoRef: 'HLS: 4.3.5.1',
                },
                {
                    name: 'Date Ranges / Timed Metadata',
                    category: 'Live & Dynamic',
                    desc: 'The manifest includes timed metadata via #EXT-X-DATERANGE, typically used for ad insertion signaling (SCTE-35).',
                    isoRef: 'HLS: 4.3.2.7',
                },
                {
                    name: 'Low-Latency HLS',
                    category: 'Live & Dynamic',
                    desc: 'Uses modern HLS features for reduced latency, such as Partial Segments (EXT-X-PART), Preload Hinting (EXT-X-PRELOAD-HINT), and Server Control.',
                    isoRef: 'HLS 2nd Ed: 4.4.3.7, 4.4.3.8, 4.4.4.9, 4.4.5.3',
                },
                {
                    name: 'Playlist Delta Updates',
                    category: 'Live & Dynamic',
                    desc: 'The server can provide partial playlist updates using the #EXT-X-SKIP tag, reducing download size for live streams.',
                    isoRef: 'HLS 2nd Ed: 4.4.5.2, 6.2.5.1',
                },
                {
                    name: 'Variable Substitution',
                    category: 'Live & Dynamic',
                    desc: 'Uses #EXT-X-DEFINE to create playlist variables, allowing for dynamic generation of URIs and attributes.',
                    isoRef: 'HLS 2nd Ed: 4.4.2.3',
                },
                {
                    name: 'Content Steering',
                    category: 'Live & Dynamic',
                    desc: 'Provides a mechanism for servers to steer clients to alternate servers for redundancy and load balancing.',
                    isoRef: 'HLS 2nd Ed: 4.4.6.6',
                },
                {
                    name: 'I-Frame Playlists',
                    category: 'Advanced Content',
                    desc: 'Provides special, I-Frame only playlists to enable efficient fast-forward and rewind.',
                    isoRef: 'HLS: 4.3.4.3',
                },
                {
                    name: 'Advanced Metadata & Rendition Selection',
                    category: 'Advanced Content',
                    desc: 'Utilizes advanced attributes (e.g., SCORE, VIDEO-RANGE, STABLE-VARIANT-ID) and semantic tags (e.g., Interstitials) to provide richer context for client ABR and UI logic.',
                    isoRef: 'HLS 2nd Ed: Appendices D, G',
                },
                {
                    name: 'Session Data',
                    category: 'Client Guidance & Optimization',
                    desc: 'The master playlist carries arbitrary session data using #EXT-X-SESSION-DATA, which can be used for things like analytics or custom configuration.',
                    isoRef: 'HLS: 4.3.4.4',
                },
                {
                    name: 'Start Offset',
                    category: 'Client Guidance & Optimization',
                    desc: 'The playlist uses #EXT-X-START to indicate a preferred starting point, for example to start playback closer to the live edge.',
                    isoRef: 'HLS: 4.3.5.2',
                },
                {
                    name: 'Alternative Renditions',
                    category: 'Accessibility & Metadata',
                    desc: 'Uses #EXT-X-MEDIA to provide alternative tracks for language, commentary, or camera angles.',
                    isoRef: 'HLS: 4.3.4.1',
                },
                {
                    name: 'Subtitles & Captions',
                    category: 'Accessibility & Metadata',
                    desc: 'Provides text-based tracks for subtitles or closed captions via #EXT-X-MEDIA.',
                    isoRef: 'HLS: 4.3.4.1',
                },
            ];
        });
    function vo(e) {
        let t = {};
        if (!e)
            return {
                Error: {
                    used: !0,
                    details:
                        'Serialized XML object was not found for feature analysis.',
                },
            };
        for (let [n, i] of Object.entries(ga))
            try {
                t[n] = i(e);
            } catch (r) {
                (console.error(`Error analyzing feature "${n}":`, r),
                    (t[n] = { used: !1, details: 'Analysis failed.' }));
            }
        return t;
    }
    var F,
        _e,
        G,
        He,
        ga,
        Co = B(() => {
            ke();
            ((F = (e, t) => {
                if (!e) return [];
                let n = [];
                for (let i of e)
                    i.type === 'element' &&
                        (i.tagName === t && n.push(i),
                        i.children?.length > 0 &&
                            (n = n.concat(F(i.children, t))));
                return n;
            }),
                (_e = (e, t) => {
                    if (!e) return null;
                    for (let n of e)
                        if (n.type === 'element') {
                            if (n.tagName === t) return n;
                            if (n.children?.length > 0) {
                                let i = _e(n.children, t);
                                if (i) return i;
                            }
                        }
                    return null;
                }),
                (G = (e, t, n) => (i) => {
                    let r = _e(i.children, e);
                    return { used: !!r, details: r ? t(r) : n };
                }),
                (He = (e, t, n) => (i) => {
                    let o = F(i.children, e).length;
                    return o === 0
                        ? { used: !1, details: '' }
                        : {
                              used: !0,
                              details: `${o} ${o === 1 ? t : n} found.`,
                          };
                }),
                (ga = {
                    'Presentation Type': (e) => ({
                        used: !0,
                        details: `<code>${e.attributes.type}</code>`,
                    }),
                    'MPD Locations': He(
                        'Location',
                        'location',
                        'locations provided'
                    ),
                    'Scoped Profiles': (e) => {
                        let t = F(e.children, 'AdaptationSet'),
                            n = F(e.children, 'Representation'),
                            i =
                                t.filter((o) => o.attributes.profiles).length +
                                n.filter((o) => o.attributes.profiles).length;
                        return i === 0
                            ? { used: !1, details: '' }
                            : {
                                  used: !0,
                                  details: `${i} ${i === 1 ? 'scoped profile' : 'scoped profiles'}`,
                              };
                    },
                    'Multi-Period': He('Period', 'Period', 'Periods'),
                    'Content Protection': (e) => {
                        let t = F(e.children, 'ContentProtection');
                        return t.length > 0
                            ? {
                                  used: !0,
                                  details: `Systems: <b>${[...new Set(t.map((i) => pe(i.attributes.schemeIdUri)))].join(', ')}</b>`,
                              }
                            : {
                                  used: !1,
                                  details: 'No encryption descriptors found.',
                              };
                    },
                    'Client Authentication': G(
                        'EssentialProperty',
                        () => 'Signals requirement for client authentication.',
                        ''
                    ),
                    'Content Authorization': G(
                        'SupplementalProperty',
                        () => 'Signals requirement for content authorization.',
                        ''
                    ),
                    'Segment Templates': G(
                        'SegmentTemplate',
                        () => 'Uses templates for segment URL generation.',
                        ''
                    ),
                    'Segment Timeline': G(
                        'SegmentTimeline',
                        () =>
                            'Provides explicit segment timing via <code>&lt;S&gt;</code> elements.',
                        ''
                    ),
                    'Segment List': G(
                        'SegmentList',
                        () => 'Provides an explicit list of segment URLs.',
                        ''
                    ),
                    'Representation Index': He(
                        'RepresentationIndex',
                        'representation index',
                        'representation indices'
                    ),
                    'Low Latency Streaming': (e) => {
                        if (e.attributes.type !== 'dynamic')
                            return {
                                used: !1,
                                details: 'Not a dynamic (live) manifest.',
                            };
                        let t = !!_e(e.children, 'Latency'),
                            i = F(e.children, 'SegmentTemplate').some(
                                (r) =>
                                    r.attributes.availabilityTimeComplete ===
                                    'false'
                            );
                        if (t || i) {
                            let r = [];
                            return (
                                t &&
                                    r.push(
                                        '<code>&lt;Latency&gt;</code> target defined.'
                                    ),
                                i && r.push('Chunked transfer hint present.'),
                                { used: !0, details: r.join(' ') }
                            );
                        }
                        return {
                            used: !1,
                            details: 'No specific low-latency signals found.',
                        };
                    },
                    'Manifest Patch Updates': G(
                        'PatchLocation',
                        (e) =>
                            `Patch location: <code>${e.children[0]?.content.trim()}</code>`,
                        'Uses full manifest reloads.'
                    ),
                    'UTC Timing Source': (e) => {
                        let t = F(e.children, 'UTCTiming');
                        return t.length > 0
                            ? {
                                  used: !0,
                                  details: `Schemes: ${[...new Set(t.map((i) => `<code>${i.attributes.schemeIdUri.split(':').pop()}</code>`))].join(', ')}`,
                              }
                            : {
                                  used: !1,
                                  details:
                                      'No clock synchronization source provided.',
                              };
                    },
                    'Dependent Representations': (e) => {
                        let t = F(e.children, 'Representation').filter(
                            (n) => n.attributes.dependencyId
                        );
                        return t.length > 0
                            ? {
                                  used: !0,
                                  details: `${t.length} dependent Representations`,
                              }
                            : { used: !1, details: '' };
                    },
                    'Associated Representations': (e) => {
                        let t = F(e.children, 'Representation').filter(
                            (n) => n.attributes.associationId
                        );
                        return t.length > 0
                            ? { used: !0, details: `${t.length} associations` }
                            : { used: !1, details: '' };
                    },
                    'Trick Modes': (e) => {
                        let t = _e(e.children, 'SubRepresentation'),
                            n = F(e.children, 'Role').some(
                                (i) => i.attributes.value === 'trick'
                            );
                        if (t || n) {
                            let i = [];
                            return (
                                t &&
                                    i.push(
                                        '<code>&lt;SubRepresentation&gt;</code>'
                                    ),
                                n && i.push('<code>Role="trick"</code>'),
                                {
                                    used: !0,
                                    details: `Detected via: ${i.join(', ')}`,
                                }
                            );
                        }
                        return {
                            used: !1,
                            details: 'No explicit trick mode signals found.',
                        };
                    },
                    'Subtitles & Captions': (e) => {
                        let t = F(e.children, 'AdaptationSet').filter(
                            (n) =>
                                n.attributes.contentType === 'text' ||
                                n.attributes.mimeType?.startsWith('application')
                        );
                        if (t.length > 0) {
                            let n = [
                                ...new Set(
                                    t
                                        .map((i) => i.attributes.lang)
                                        .filter(Boolean)
                                ),
                            ];
                            return {
                                used: !0,
                                details: `Found ${t.length} track(s). ${n.length > 0 ? `Languages: <b>${n.join(', ')}</b>` : ''}`,
                            };
                        }
                        return {
                            used: !1,
                            details:
                                'No text or application AdaptationSets found.',
                        };
                    },
                    'Role Descriptors': (e) => {
                        let t = F(e.children, 'Role');
                        return t.length > 0
                            ? {
                                  used: !0,
                                  details: `Roles found: ${[...new Set(t.map((i) => `<code>${i.attributes.value}</code>`))].join(', ')}`,
                              }
                            : { used: !1, details: 'No roles specified.' };
                    },
                    'MPD Events': G(
                        'EventStream',
                        () =>
                            'Uses <EventStream> for out-of-band event signaling.',
                        ''
                    ),
                    'Inband Events': G(
                        'InbandEventStream',
                        () =>
                            'Uses <InbandEventStream> to signal events within segments.',
                        ''
                    ),
                }));
        });
    function Io(e) {
        let t = {},
            n = e.tags || [];
        ((t['Presentation Type'] = {
            used: !0,
            details:
                e.type === 'dynamic'
                    ? '<code>EVENT</code> or Live'
                    : '<code>VOD</code>',
        }),
            (t['Master Playlist'] = {
                used: e.isMaster,
                details: e.isMaster
                    ? `${e.variants?.length || 0} Variant Streams found.`
                    : 'Media Playlist.',
            }));
        let i = (e.segments || []).some((u) => u.discontinuity);
        t.Discontinuity = {
            used: i,
            details: i
                ? 'Contains #EXT-X-DISCONTINUITY tags.'
                : 'No discontinuities found.',
        };
        let r = n.find((u) => u.name === 'EXT-X-KEY');
        if (r && r.value.METHOD !== 'NONE') {
            let u = [
                ...new Set(
                    n
                        .filter((h) => h.name === 'EXT-X-KEY')
                        .map((h) => h.value.METHOD)
                ),
            ];
            t['Content Protection'] = {
                used: !0,
                details: `Methods: <b>${u.join(', ')}</b>`,
            };
        } else
            t['Content Protection'] = {
                used: !1,
                details: 'No #EXT-X-KEY tags found.',
            };
        let o = n.some((u) => u.name === 'EXT-X-MAP');
        ((t['Fragmented MP4 Segments'] = {
            used: o,
            details: o
                ? 'Uses #EXT-X-MAP, indicating fMP4 segments.'
                : 'Likely Transport Stream (TS) segments.',
        }),
            (t['I-Frame Playlists'] = {
                used: n.some((u) => u.name === 'EXT-X-I-FRAME-STREAM-INF'),
                details: 'Provides dedicated playlists for trick-play modes.',
            }));
        let l = n.filter((u) => u.name === 'EXT-X-MEDIA');
        ((t['Alternative Renditions'] = {
            used: l.length > 0,
            details:
                l.length > 0
                    ? `${l.length} #EXT-X-MEDIA tags found.`
                    : 'No separate audio/video/subtitle renditions declared.',
        }),
            (t['Date Ranges / Timed Metadata'] = {
                used: e.events.some((u) => u.type === 'hls-daterange'),
                details:
                    'Carries timed metadata, often used for ad insertion signaling.',
            }));
        let a = l.some((u) => u.value.TYPE === 'SUBTITLES');
        ((t['Subtitles & Captions'] = {
            used: a,
            details: a
                ? 'Contains #EXT-X-MEDIA tags with TYPE=SUBTITLES.'
                : 'No subtitle renditions declared.',
        }),
            (t['Session Data'] = {
                used: n.some((u) => u.name === 'EXT-X-SESSION-DATA'),
                details:
                    'Carries arbitrary session data in the master playlist.',
            }),
            (t['Session Keys'] = {
                used: n.some((u) => u.name === 'EXT-X-SESSION-KEY'),
                details:
                    'Allows pre-loading of encryption keys from the master playlist.',
            }),
            (t['Independent Segments'] = {
                used: n.some((u) => u.name === 'EXT-X-INDEPENDENT-SEGMENTS'),
                details: 'All segments are self-contained for decoding.',
            }),
            (t['Start Offset'] = {
                used: n.some((u) => u.name === 'EXT-X-START'),
                details:
                    'Specifies a preferred starting position in the playlist.',
            }));
        let s = [];
        (e.partInf && s.push('EXT-X-PART-INF'),
            (e.segments || []).some((u) => (u.parts || []).length > 0) &&
                s.push('EXT-X-PART'),
            e.serverControl && s.push('EXT-X-SERVER-CONTROL'),
            (e.preloadHints || []).length > 0 && s.push('EXT-X-PRELOAD-HINT'),
            (e.renditionReports || []).length > 0 &&
                s.push('EXT-X-RENDITION-REPORT'),
            (t['Low-Latency HLS'] = {
                used: s.length > 0,
                details:
                    s.length > 0
                        ? `Detected low-latency tags: <b>${s.join(', ')}</b>`
                        : 'Standard latency HLS.',
            }));
        let c = n.some((u) => u.name === 'EXT-X-SKIP');
        t['Playlist Delta Updates'] = {
            used: c,
            details: c
                ? 'Contains #EXT-X-SKIP tag, indicating a partial playlist update.'
                : 'No delta updates detected.',
        };
        let f = n.some((u) => u.name === 'EXT-X-DEFINE');
        t['Variable Substitution'] = {
            used: f,
            details: f
                ? 'Uses #EXT-X-DEFINE for variable substitution.'
                : 'No variables defined.',
        };
        let d = n.some((u) => u.name === 'EXT-X-CONTENT-STEERING');
        t['Content Steering'] = {
            used: d,
            details: d
                ? 'Provides client-side CDN steering information.'
                : 'No content steering information found.',
        };
        let p = [];
        return (
            (e.variants || []).some((u) => u.attributes.SCORE) &&
                p.push('SCORE'),
            (e.variants || []).some((u) => u.attributes['VIDEO-RANGE']) &&
                p.push('VIDEO-RANGE'),
            (e.variants || []).some((u) => u.attributes['STABLE-VARIANT-ID']) &&
                p.push('STABLE-VARIANT-ID'),
            l.some((u) => u.value['STABLE-RENDITION-ID']) &&
                p.push('STABLE-RENDITION-ID'),
            e.events.some(
                (u) =>
                    u.type === 'hls-daterange' &&
                    u.message.toLowerCase().includes('interstitial')
            ) && p.push('Interstitials'),
            (t['Advanced Metadata & Rendition Selection'] = {
                used: p.length > 0,
                details:
                    p.length > 0
                        ? `Detected advanced attributes: <b>${p.join(', ')}</b>`
                        : 'Uses standard metadata.',
            }),
            t
        );
    }
    var To = B(() => {});
    var Eo = {};
    et(Eo, {
        createFeatureViewModel: () => _a,
        generateFeatureAnalysis: () => ha,
    });
    function ha(e, t, n = null) {
        return t === 'dash' ? vo(n) : Io(e);
    }
    function _a(e, t) {
        return (t === 'dash' ? xo : So).map((i) => {
            let r = e.get(i.name) || {
                used: !1,
                details: 'Not detected in manifest.',
            };
            return { ...i, ...r };
        });
    }
    var Po = B(() => {
        yo();
        bo();
        Co();
        To();
    });
    var ee,
        Ao = B(() => {
            ee = class {
                diff(t, n, i = {}) {
                    let r;
                    typeof i == 'function'
                        ? ((r = i), (i = {}))
                        : 'callback' in i && (r = i.callback);
                    let o = this.castInput(t, i),
                        l = this.castInput(n, i),
                        a = this.removeEmpty(this.tokenize(o, i)),
                        s = this.removeEmpty(this.tokenize(l, i));
                    return this.diffWithOptionsObj(a, s, i, r);
                }
                diffWithOptionsObj(t, n, i, r) {
                    var o;
                    let l = (m) => {
                            if (((m = this.postProcess(m, i)), r)) {
                                setTimeout(function () {
                                    r(m);
                                }, 0);
                                return;
                            } else return m;
                        },
                        a = n.length,
                        s = t.length,
                        c = 1,
                        f = a + s;
                    i.maxEditLength != null &&
                        (f = Math.min(f, i.maxEditLength));
                    let d =
                            (o = i.timeout) !== null && o !== void 0
                                ? o
                                : 1 / 0,
                        p = Date.now() + d,
                        u = [{ oldPos: -1, lastComponent: void 0 }],
                        h = this.extractCommon(u[0], n, t, 0, i);
                    if (u[0].oldPos + 1 >= s && h + 1 >= a)
                        return l(this.buildValues(u[0].lastComponent, n, t));
                    let _ = -1 / 0,
                        x = 1 / 0,
                        S = () => {
                            for (
                                let m = Math.max(_, -c);
                                m <= Math.min(x, c);
                                m += 2
                            ) {
                                let b,
                                    v = u[m - 1],
                                    D = u[m + 1];
                                v && (u[m - 1] = void 0);
                                let P = !1;
                                if (D) {
                                    let $ = D.oldPos - m;
                                    P = D && 0 <= $ && $ < a;
                                }
                                let V = v && v.oldPos + 1 < s;
                                if (!P && !V) {
                                    u[m] = void 0;
                                    continue;
                                }
                                if (
                                    (!V || (P && v.oldPos < D.oldPos)
                                        ? (b = this.addToPath(D, !0, !1, 0, i))
                                        : (b = this.addToPath(v, !1, !0, 1, i)),
                                    (h = this.extractCommon(b, n, t, m, i)),
                                    b.oldPos + 1 >= s && h + 1 >= a)
                                )
                                    return (
                                        l(
                                            this.buildValues(
                                                b.lastComponent,
                                                n,
                                                t
                                            )
                                        ) || !0
                                    );
                                ((u[m] = b),
                                    b.oldPos + 1 >= s &&
                                        (x = Math.min(x, m - 1)),
                                    h + 1 >= a && (_ = Math.max(_, m + 1)));
                            }
                            c++;
                        };
                    if (r)
                        (function m() {
                            setTimeout(function () {
                                if (c > f || Date.now() > p) return r(void 0);
                                S() || m();
                            }, 0);
                        })();
                    else
                        for (; c <= f && Date.now() <= p; ) {
                            let m = S();
                            if (m) return m;
                        }
                }
                addToPath(t, n, i, r, o) {
                    let l = t.lastComponent;
                    return l &&
                        !o.oneChangePerToken &&
                        l.added === n &&
                        l.removed === i
                        ? {
                              oldPos: t.oldPos + r,
                              lastComponent: {
                                  count: l.count + 1,
                                  added: n,
                                  removed: i,
                                  previousComponent: l.previousComponent,
                              },
                          }
                        : {
                              oldPos: t.oldPos + r,
                              lastComponent: {
                                  count: 1,
                                  added: n,
                                  removed: i,
                                  previousComponent: l,
                              },
                          };
                }
                extractCommon(t, n, i, r, o) {
                    let l = n.length,
                        a = i.length,
                        s = t.oldPos,
                        c = s - r,
                        f = 0;
                    for (
                        ;
                        c + 1 < l &&
                        s + 1 < a &&
                        this.equals(i[s + 1], n[c + 1], o);

                    )
                        (c++,
                            s++,
                            f++,
                            o.oneChangePerToken &&
                                (t.lastComponent = {
                                    count: 1,
                                    previousComponent: t.lastComponent,
                                    added: !1,
                                    removed: !1,
                                }));
                    return (
                        f &&
                            !o.oneChangePerToken &&
                            (t.lastComponent = {
                                count: f,
                                previousComponent: t.lastComponent,
                                added: !1,
                                removed: !1,
                            }),
                        (t.oldPos = s),
                        c
                    );
                }
                equals(t, n, i) {
                    return i.comparator
                        ? i.comparator(t, n)
                        : t === n ||
                              (!!i.ignoreCase &&
                                  t.toLowerCase() === n.toLowerCase());
                }
                removeEmpty(t) {
                    let n = [];
                    for (let i = 0; i < t.length; i++) t[i] && n.push(t[i]);
                    return n;
                }
                castInput(t, n) {
                    return t;
                }
                tokenize(t, n) {
                    return Array.from(t);
                }
                join(t) {
                    return t.join('');
                }
                postProcess(t, n) {
                    return t;
                }
                get useLongestToken() {
                    return !1;
                }
                buildValues(t, n, i) {
                    let r = [],
                        o;
                    for (; t; )
                        (r.push(t),
                            (o = t.previousComponent),
                            delete t.previousComponent,
                            (t = o));
                    r.reverse();
                    let l = r.length,
                        a = 0,
                        s = 0,
                        c = 0;
                    for (; a < l; a++) {
                        let f = r[a];
                        if (f.removed)
                            ((f.value = this.join(i.slice(c, c + f.count))),
                                (c += f.count));
                        else {
                            if (!f.added && this.useLongestToken) {
                                let d = n.slice(s, s + f.count);
                                ((d = d.map(function (p, u) {
                                    let h = i[c + u];
                                    return h.length > p.length ? h : p;
                                })),
                                    (f.value = this.join(d)));
                            } else f.value = this.join(n.slice(s, s + f.count));
                            ((s += f.count), f.added || (c += f.count));
                        }
                    }
                    return r;
                }
            };
        });
    function Oe(e, t) {
        let n;
        for (n = 0; n < e.length && n < t.length; n++)
            if (e[n] != t[n]) return e.slice(0, n);
        return e.slice(0, n);
    }
    function Xe(e, t) {
        let n;
        if (!e || !t || e[e.length - 1] != t[t.length - 1]) return '';
        for (n = 0; n < e.length && n < t.length; n++)
            if (e[e.length - (n + 1)] != t[t.length - (n + 1)])
                return e.slice(-n);
        return e.slice(-n);
    }
    function xe(e, t, n) {
        if (e.slice(0, t.length) != t)
            throw Error(
                `string ${JSON.stringify(e)} doesn't start with prefix ${JSON.stringify(t)}; this is a bug`
            );
        return n + e.slice(t.length);
    }
    function ye(e, t, n) {
        if (!t) return e + n;
        if (e.slice(-t.length) != t)
            throw Error(
                `string ${JSON.stringify(e)} doesn't end with suffix ${JSON.stringify(t)}; this is a bug`
            );
        return e.slice(0, -t.length) + n;
    }
    function te(e, t) {
        return xe(e, t, '');
    }
    function le(e, t) {
        return ye(e, t, '');
    }
    function Ge(e, t) {
        return t.slice(0, xa(e, t));
    }
    function xa(e, t) {
        let n = 0;
        e.length > t.length && (n = e.length - t.length);
        let i = t.length;
        e.length < t.length && (i = e.length);
        let r = Array(i),
            o = 0;
        r[0] = 0;
        for (let l = 1; l < i; l++) {
            for (
                t[l] == t[o] ? (r[l] = r[o]) : (r[l] = o);
                o > 0 && t[l] != t[o];

            )
                o = r[o];
            t[l] == t[o] && o++;
        }
        o = 0;
        for (let l = n; l < e.length; l++) {
            for (; o > 0 && e[l] != t[o]; ) o = r[o];
            e[l] == t[o] && o++;
        }
        return o;
    }
    function ne(e) {
        let t;
        for (t = e.length - 1; t >= 0 && e[t].match(/\s/); t--);
        return e.substring(t + 1);
    }
    function O(e) {
        let t = e.match(/^\s*/);
        return t ? t[0] : '';
    }
    var Uo = B(() => {});
    function qe(e, t, n) {
        return n?.ignoreWhitespace != null && !n.ignoreWhitespace
            ? wo(e, t, n)
            : ko.diff(e, t, n);
    }
    function Do(e, t, n, i) {
        if (t && n) {
            let r = O(t.value),
                o = ne(t.value),
                l = O(n.value),
                a = ne(n.value);
            if (e) {
                let s = Oe(r, l);
                ((e.value = ye(e.value, l, s)),
                    (t.value = te(t.value, s)),
                    (n.value = te(n.value, s)));
            }
            if (i) {
                let s = Xe(o, a);
                ((i.value = xe(i.value, a, s)),
                    (t.value = le(t.value, s)),
                    (n.value = le(n.value, s)));
            }
        } else if (n) {
            if (e) {
                let r = O(n.value);
                n.value = n.value.substring(r.length);
            }
            if (i) {
                let r = O(i.value);
                i.value = i.value.substring(r.length);
            }
        } else if (e && i) {
            let r = O(i.value),
                o = O(t.value),
                l = ne(t.value),
                a = Oe(r, o);
            t.value = te(t.value, a);
            let s = Xe(te(r, a), l);
            ((t.value = le(t.value, s)),
                (i.value = xe(i.value, r, s)),
                (e.value = ye(e.value, r, r.slice(0, r.length - s.length))));
        } else if (i) {
            let r = O(i.value),
                o = ne(t.value),
                l = Ge(o, r);
            t.value = le(t.value, l);
        } else if (e) {
            let r = ne(e.value),
                o = O(t.value),
                l = Ge(r, o);
            t.value = te(t.value, l);
        }
    }
    function wo(e, t, n) {
        return Mo.diff(e, t, n);
    }
    var Se,
        ya,
        je,
        ko,
        We,
        Mo,
        Lo = B(() => {
            Ao();
            Uo();
            ((Se =
                'a-zA-Z0-9_\\u{C0}-\\u{FF}\\u{D8}-\\u{F6}\\u{F8}-\\u{2C6}\\u{2C8}-\\u{2D7}\\u{2DE}-\\u{2FF}\\u{1E00}-\\u{1EFF}'),
                (ya = new RegExp(`[${Se}]+|\\s+|[^${Se}]`, 'ug')),
                (je = class extends ee {
                    equals(t, n, i) {
                        return (
                            i.ignoreCase &&
                                ((t = t.toLowerCase()), (n = n.toLowerCase())),
                            t.trim() === n.trim()
                        );
                    }
                    tokenize(t, n = {}) {
                        let i;
                        if (n.intlSegmenter) {
                            let l = n.intlSegmenter;
                            if (l.resolvedOptions().granularity != 'word')
                                throw new Error(
                                    'The segmenter passed must have a granularity of "word"'
                                );
                            i = Array.from(l.segment(t), (a) => a.segment);
                        } else i = t.match(ya) || [];
                        let r = [],
                            o = null;
                        return (
                            i.forEach((l) => {
                                (/\s/.test(l)
                                    ? o == null
                                        ? r.push(l)
                                        : r.push(r.pop() + l)
                                    : o != null && /\s/.test(o)
                                      ? r[r.length - 1] == o
                                          ? r.push(r.pop() + l)
                                          : r.push(o + l)
                                      : r.push(l),
                                    (o = l));
                            }),
                            r
                        );
                    }
                    join(t) {
                        return t
                            .map((n, i) => (i == 0 ? n : n.replace(/^\s+/, '')))
                            .join('');
                    }
                    postProcess(t, n) {
                        if (!t || n.oneChangePerToken) return t;
                        let i = null,
                            r = null,
                            o = null;
                        return (
                            t.forEach((l) => {
                                l.added
                                    ? (r = l)
                                    : l.removed
                                      ? (o = l)
                                      : ((r || o) && Do(i, o, r, l),
                                        (i = l),
                                        (r = null),
                                        (o = null));
                            }),
                            (r || o) && Do(i, o, r, null),
                            t
                        );
                    }
                }),
                (ko = new je()));
            ((We = class extends ee {
                tokenize(t) {
                    let n = new RegExp(
                        `(\\r?\\n)|[${Se}]+|[^\\S\\n\\r]+|[^${Se}]`,
                        'ug'
                    );
                    return t.match(n) || [];
                }
            }),
                (Mo = new We()));
        });
    var Bo = B(() => {
        Lo();
    });
    function zo(e) {
        if (!e) return '';
        let t = Ro(e),
            n =
                /(&lt;!--[\s\S]*?--&gt;)|(&lt;\?[\s\S]*?\?&gt;)|(&lt;\/?)([\w:-]+)|([\w:-]+=)|(&quot;)([^&quot;]*)(\&quot;)/g;
        return t.replace(n, (i, r, o, l, a, s, c, f, d) =>
            r
                ? `<span class="text-gray-500 italic">${r}</span>`
                : o
                  ? `<span class="text-gray-500">${o}</span>`
                  : l
                    ? `${l}<span class="text-blue-300">${a}</span>`
                    : s
                      ? `<span class="text-emerald-300">${s.slice(0, -1)}</span>=`
                      : c
                        ? `${c}<span class="text-yellow-300">${f}</span>${d}`
                        : i
        );
    }
    function No(e) {
        return e
            ? e
                  .split(
                      `
`
                  )
                  .map((t) => {
                      let n = Ro(t.trim());
                      if (n.startsWith('#EXT')) {
                          let i = n.indexOf(':');
                          if (i === -1)
                              return `#<span class="text-purple-300">${n.substring(1)}</span>`;
                          let r = n.substring(1, i),
                              o = n.substring(i + 1);
                          return (
                              (o = o.replace(
                                  /([A-Z0-9-]+)=/g,
                                  '<span class="text-emerald-300">$1</span>='
                              )),
                              (o = o.replace(
                                  /"([^"]*)"/g,
                                  '"<span class="text-yellow-300">$1</span>"'
                              )),
                              `#<span class="text-purple-300">${r}</span>:${o}`
                          );
                      }
                      return n.startsWith('#')
                          ? `<span class="text-gray-500">${n}</span>`
                          : `<span class="text-cyan-400">${n}</span>`;
                  }).join(`
`)
            : '';
    }
    var Ro,
        Fo = B(() => {
            Ro = (e) =>
                e
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
        });
    var Vo = {};
    et(Vo, { diffManifest: () => Sa });
    function Sa(e, t, n) {
        let i = qe(e, t),
            r = '',
            o = n === 'dash' ? zo : No;
        return (
            i.forEach((l) => {
                if (l.removed) return;
                let a = o(l.value);
                l.added
                    ? (r += `<span class="bg-emerald-500/40 text-green-50 rounded-sm font-medium">${a}</span>`)
                    : (r += a);
            }),
            r
        );
    }
    var $o = B(() => {
        Bo();
        Fo();
    });
    var Wo = Ze((ie, Ke) => {
        'use strict';
        Object.defineProperty(ie, '__esModule', { value: !0 });
        ie.ParsingError = void 0;
        var Q = class extends Error {
            constructor(t, n) {
                (super(t), (this.cause = n));
            }
        };
        ie.ParsingError = Q;
        var C;
        function Ho() {
            return Xo(!1) || Ia() || Go() || Ca() || Qe();
        }
        function Oo() {
            return (M(/\s*/), Xo(!0) || Go() || va() || Qe());
        }
        function ba() {
            let e = Qe(),
                t = [],
                n,
                i = Oo();
            for (; i; ) {
                if (i.node.type === 'Element') {
                    if (n) throw new Error('Found multiple root nodes');
                    n = i.node;
                }
                (i.excluded || t.push(i.node), (i = Oo()));
            }
            if (!n)
                throw new Q('Failed to parse XML', 'Root Element not found');
            if (C.xml.length !== 0)
                throw new Q('Failed to parse XML', 'Not Well-Formed XML');
            return { declaration: e ? e.node : null, root: n, children: t };
        }
        function Qe() {
            let e = M(/^<\?([\w-:.]+)\s*/);
            if (!e) return;
            let t = { name: e[1], type: 'ProcessingInstruction', content: '' },
                n = C.xml.indexOf('?>');
            if (n > -1)
                ((t.content = C.xml.substring(0, n).trim()),
                    (C.xml = C.xml.slice(n)));
            else
                throw new Q(
                    'Failed to parse XML',
                    'ProcessingInstruction closing tag not found'
                );
            return (
                M(/\?>/),
                { excluded: C.options.filter(t) === !1, node: t }
            );
        }
        function Xo(e) {
            let t = M(/^<([^?!</>\s]+)\s*/);
            if (!t) return;
            let n = {
                    type: 'Element',
                    name: t[1],
                    attributes: {},
                    children: [],
                },
                i = e ? !1 : C.options.filter(n) === !1;
            for (; !(Pa() || Ye('>') || Ye('?>') || Ye('/>')); ) {
                let o = Ta();
                if (o) n.attributes[o.name] = o.value;
                else return;
            }
            if (M(/^\s*\/>/))
                return ((n.children = null), { excluded: i, node: n });
            M(/\??>/);
            let r = Ho();
            for (; r; ) (r.excluded || n.children.push(r.node), (r = Ho()));
            if (C.options.strictMode) {
                let o = `</${n.name}>`;
                if (C.xml.startsWith(o)) C.xml = C.xml.slice(o.length);
                else
                    throw new Q(
                        'Failed to parse XML',
                        `Closing tag not matching "${o}"`
                    );
            } else M(/^<\/[\w-:.\u00C0-\u00FF]+\s*>/);
            return { excluded: i, node: n };
        }
        function va() {
            let e =
                M(/^<!DOCTYPE\s+\S+\s+SYSTEM[^>]*>/) ||
                M(/^<!DOCTYPE\s+\S+\s+PUBLIC[^>]*>/) ||
                M(/^<!DOCTYPE\s+\S+\s*\[[^\]]*]>/) ||
                M(/^<!DOCTYPE\s+\S+\s*>/);
            if (e) {
                let t = { type: 'DocumentType', content: e[0] };
                return { excluded: C.options.filter(t) === !1, node: t };
            }
        }
        function Ca() {
            if (C.xml.startsWith('<![CDATA[')) {
                let e = C.xml.indexOf(']]>');
                if (e > -1) {
                    let t = e + 3,
                        n = { type: 'CDATA', content: C.xml.substring(0, t) };
                    return (
                        (C.xml = C.xml.slice(t)),
                        { excluded: C.options.filter(n) === !1, node: n }
                    );
                }
            }
        }
        function Go() {
            let e = M(/^<!--[\s\S]*?-->/);
            if (e) {
                let t = { type: 'Comment', content: e[0] };
                return { excluded: C.options.filter(t) === !1, node: t };
            }
        }
        function Ia() {
            let e = M(/^([^<]+)/);
            if (e) {
                let t = { type: 'Text', content: e[1] };
                return { excluded: C.options.filter(t) === !1, node: t };
            }
        }
        function Ta() {
            let e = M(/([^=]+)\s*=\s*("[^"]*"|'[^']*'|[^>\s]+)\s*/);
            if (e) return { name: e[1].trim(), value: Ea(e[2].trim()) };
        }
        function Ea(e) {
            return e.replace(/^['"]|['"]$/g, '');
        }
        function M(e) {
            let t = C.xml.match(e);
            if (t) return ((C.xml = C.xml.slice(t[0].length)), t);
        }
        function Pa() {
            return C.xml.length === 0;
        }
        function Ye(e) {
            return C.xml.indexOf(e) === 0;
        }
        function jo(e, t = {}) {
            e = e.trim();
            let n = t.filter || (() => !0);
            return (
                (C = {
                    xml: e,
                    options: Object.assign(Object.assign({}, t), {
                        filter: n,
                        strictMode: t.strictMode === !0,
                    }),
                }),
                ba()
            );
        }
        typeof Ke < 'u' && typeof ie == 'object' && (Ke.exports = jo);
        ie.default = jo;
    });
    var Ko = Ze((re, Je) => {
        'use strict';
        var Aa =
            (re && re.__importDefault) ||
            function (e) {
                return e && e.__esModule ? e : { default: e };
            };
        Object.defineProperty(re, '__esModule', { value: !0 });
        var Ua = Aa(Wo());
        function be(e) {
            if (!e.options.indentation && !e.options.lineSeparator) return;
            e.content += e.options.lineSeparator;
            let t;
            for (t = 0; t < e.level; t++) e.content += e.options.indentation;
        }
        function Da(e) {
            e.content = e.content.replace(/ +$/, '');
            let t;
            for (t = 0; t < e.level; t++) e.content += e.options.indentation;
        }
        function H(e, t) {
            e.content += t;
        }
        function qo(e, t, n) {
            if (e.type === 'Element') wa(e, t, n);
            else if (e.type === 'ProcessingInstruction') Yo(e, t);
            else if (typeof e.content == 'string') ka(e.content, t, n);
            else throw new Error('Unknown node type: ' + e.type);
        }
        function ka(e, t, n) {
            if (!n) {
                let i = e.trim();
                (t.options.lineSeparator || i.length === 0) && (e = i);
            }
            e.length > 0 && (!n && t.content.length > 0 && be(t), H(t, e));
        }
        function Ma(e, t) {
            let n = '/' + e.join('/'),
                i = e[e.length - 1];
            return t.includes(i) || t.includes(n);
        }
        function wa(e, t, n) {
            if (
                (t.path.push(e.name),
                !n && t.content.length > 0 && be(t),
                H(t, '<' + e.name),
                La(t, e.attributes),
                e.children === null ||
                    (t.options.forceSelfClosingEmptyTag &&
                        e.children.length === 0))
            ) {
                let i = t.options.whiteSpaceAtEndOfSelfclosingTag
                    ? ' />'
                    : '/>';
                H(t, i);
            } else if (e.children.length === 0) H(t, '></' + e.name + '>');
            else {
                let i = e.children;
                (H(t, '>'), t.level++);
                let r = e.attributes['xml:space'] === 'preserve' || n,
                    o = !1;
                if (
                    (!r &&
                        t.options.ignoredPaths &&
                        ((o = Ma(t.path, t.options.ignoredPaths)), (r = o)),
                    !r && t.options.collapseContent)
                ) {
                    let l = !1,
                        a = !1,
                        s = !1;
                    (i.forEach(function (c, f) {
                        c.type === 'Text'
                            ? (c.content.includes(`
`)
                                  ? ((a = !0), (c.content = c.content.trim()))
                                  : (f === 0 || f === i.length - 1) &&
                                    !n &&
                                    c.content.trim().length === 0 &&
                                    (c.content = ''),
                              (c.content.trim().length > 0 || i.length === 1) &&
                                  (l = !0))
                            : c.type === 'CDATA'
                              ? (l = !0)
                              : (s = !0);
                    }),
                        l && (!s || !a) && (r = !0));
                }
                (i.forEach(function (l) {
                    qo(l, t, n || r);
                }),
                    t.level--,
                    !n && !r && be(t),
                    o && Da(t),
                    H(t, '</' + e.name + '>'));
            }
            t.path.pop();
        }
        function La(e, t) {
            Object.keys(t).forEach(function (n) {
                let i = t[n].replace(/"/g, '&quot;');
                H(e, ' ' + n + '="' + i + '"');
            });
        }
        function Yo(e, t) {
            (t.content.length > 0 && be(t),
                H(t, '<?' + e.name),
                H(t, ' ' + e.content.trim()),
                H(t, '?>'));
        }
        function ve(e, t = {}) {
            ((t.indentation = 'indentation' in t ? t.indentation : '    '),
                (t.collapseContent = t.collapseContent === !0),
                (t.lineSeparator =
                    'lineSeparator' in t
                        ? t.lineSeparator
                        : `\r
`),
                (t.whiteSpaceAtEndOfSelfclosingTag =
                    t.whiteSpaceAtEndOfSelfclosingTag === !0),
                (t.throwOnFailure = t.throwOnFailure !== !1));
            try {
                let n = (0, Ua.default)(e, {
                        filter: t.filter,
                        strictMode: t.strictMode,
                    }),
                    i = { content: '', level: 0, options: t, path: [] };
                return (
                    n.declaration && Yo(n.declaration, i),
                    n.children.forEach(function (r) {
                        qo(r, i, !1);
                    }),
                    t.lineSeparator
                        ? i.content
                              .replace(
                                  /\r\n/g,
                                  `
`
                              )
                              .replace(/\n/g, t.lineSeparator)
                        : i.content
                );
            } catch (n) {
                if (t.throwOnFailure) throw n;
                return e;
            }
        }
        ve.minify = (e, t = {}) =>
            ve(
                e,
                Object.assign(Object.assign({}, t), {
                    indentation: '',
                    lineSeparator: '',
                })
            );
        typeof Je < 'u' && typeof re == 'object' && (Je.exports = ve);
        re.default = ve;
    });
    var g = class {
        constructor(t, n) {
            ((this.box = t),
                (this.view = n),
                (this.offset = t.headerSize),
                (this.stopped = !1));
        }
        addIssue(t, n) {
            (this.box.issues || (this.box.issues = []),
                this.box.issues.push({ type: t, message: n }));
        }
        checkBounds(t) {
            return this.stopped
                ? !1
                : this.offset + t > this.view.byteLength
                  ? (this.addIssue(
                        'error',
                        `Read attempt for ${t} bytes at offset ${this.offset} would exceed box '${this.box.type}' size of ${this.view.byteLength}. The box is truncated.`
                    ),
                    (this.stopped = !0),
                    !1)
                  : !0;
        }
        readUint32(t) {
            if (!this.checkBounds(4)) return null;
            let n = this.view.getUint32(this.offset);
            return (
                (this.box.details[t] = {
                    value: n,
                    offset: this.box.offset + this.offset,
                    length: 4,
                }),
                (this.offset += 4),
                n
            );
        }
        readBigUint64(t) {
            if (!this.checkBounds(8)) return null;
            let n = this.view.getBigUint64(this.offset);
            return (
                (this.box.details[t] = {
                    value: Number(n),
                    offset: this.box.offset + this.offset,
                    length: 8,
                }),
                (this.offset += 8),
                n
            );
        }
        readUint8(t) {
            if (!this.checkBounds(1)) return null;
            let n = this.view.getUint8(this.offset);
            return (
                (this.box.details[t] = {
                    value: n,
                    offset: this.box.offset + this.offset,
                    length: 1,
                }),
                (this.offset += 1),
                n
            );
        }
        readUint16(t) {
            if (!this.checkBounds(2)) return null;
            let n = this.view.getUint16(this.offset);
            return (
                (this.box.details[t] = {
                    value: n,
                    offset: this.box.offset + this.offset,
                    length: 2,
                }),
                (this.offset += 2),
                n
            );
        }
        readInt16(t) {
            if (!this.checkBounds(2)) return null;
            let n = this.view.getInt16(this.offset);
            return (
                (this.box.details[t] = {
                    value: n,
                    offset: this.box.offset + this.offset,
                    length: 2,
                }),
                (this.offset += 2),
                n
            );
        }
        readInt32(t) {
            if (!this.checkBounds(4)) return null;
            let n = this.view.getInt32(this.offset);
            return (
                (this.box.details[t] = {
                    value: n,
                    offset: this.box.offset + this.offset,
                    length: 4,
                }),
                (this.offset += 4),
                n
            );
        }
        readString(t, n) {
            if (!this.checkBounds(t)) return null;
            let i = new Uint8Array(
                    this.view.buffer,
                    this.view.byteOffset + this.offset,
                    t
                ),
                r = String.fromCharCode(...i);
            return (
                (this.box.details[n] = {
                    value: r,
                    offset: this.box.offset + this.offset,
                    length: t,
                }),
                (this.offset += t),
                r
            );
        }
        readNullTerminatedString(t) {
            if (this.stopped) return null;
            let n = this.offset,
                i = n;
            for (; i < this.view.byteLength && this.view.getUint8(i) !== 0; )
                i++;
            let r = new Uint8Array(
                    this.view.buffer,
                    this.view.byteOffset + n,
                    i - n
                ),
                o = new TextDecoder('utf-8').decode(r),
                l = i - n + 1;
            return (
                (this.box.details[t] = {
                    value: o,
                    offset: this.box.offset + n,
                    length: l,
                }),
                (this.offset += l),
                o
            );
        }
        readVersionAndFlags() {
            if (!this.checkBounds(4)) return { version: null, flags: null };
            let t = this.view.getUint32(this.offset),
                n = t >> 24,
                i = t & 16777215;
            return (
                (this.box.details.version = {
                    value: n,
                    offset: this.box.offset + this.offset,
                    length: 1,
                }),
                (this.box.details.flags = {
                    value: `0x${i.toString(16).padStart(6, '0')}`,
                    offset: this.box.offset + this.offset,
                    length: 4,
                }),
                (this.offset += 4),
                { version: n, flags: i }
            );
        }
        readRemainingBytes(t) {
            if (this.stopped) return;
            let n = this.view.byteLength - this.offset;
            n > 0 &&
                ((this.box.details[t] = {
                    value: `... ${n} bytes of data ...`,
                    offset: this.box.offset + this.offset,
                    length: n,
                }),
                (this.offset += n));
        }
        skip(t, n = 'reserved') {
            this.checkBounds(t) &&
                ((this.box.details[n] = {
                    value: `${t} bytes`,
                    offset: this.box.offset + this.offset,
                    length: t,
                }),
                (this.offset += t));
        }
        finalize() {
            if (this.stopped) return;
            let t = this.view.byteLength - this.offset;
            t > 0 &&
                this.addIssue(
                    'warn',
                    `${t} extra unparsed bytes found at the end of box '${this.box.type}'.`
                );
        }
    };
    function Te(e, t) {
        let n = new g(e, t);
        (n.readString(4, 'majorBrand'), n.readUint32('minorVersion'));
        let i = [],
            r = [],
            o = n.offset;
        for (; n.offset < e.size && !n.stopped; ) {
            let l = n.readString(4, `brand_${i.length}`);
            if (l === null) break;
            (i.push(l),
                l.startsWith('cmf') && r.push(l),
                delete e.details[`brand_${i.length - 1}`]);
        }
        (i.length > 0 &&
            (e.details.compatibleBrands = {
                value: i.join(', '),
                offset: e.offset + o,
                length: n.offset - o,
            }),
            r.length > 0 &&
                (e.details.cmafBrands = {
                    value: r.join(', '),
                    offset: 0,
                    length: 0,
                }),
            n.finalize());
    }
    var tt = {
        ftyp: {
            name: 'File Type',
            text: 'File Type Box: declares the major brand, minor version, and compatible brands for the file.',
            ref: 'ISO/IEC 14496-12:2022, Section 4.3',
        },
        'ftyp@majorBrand': {
            text: 'The major brand of the file, indicating its primary specification.',
            ref: 'ISO/IEC 14496-12:2022, Section 4.3',
        },
        'ftyp@minorVersion': {
            text: 'The minor version of the major brand.',
            ref: 'ISO/IEC 14496-12:2022, Section 4.3',
        },
        'ftyp@compatibleBrands': {
            text: 'Other brands that the file is compatible with.',
            ref: 'ISO/IEC 14496-12:2022, Section 4.3',
        },
        'ftyp@cmafBrands': {
            text: 'A list of CMAF-specific structural or media profile brands detected in this box.',
            ref: 'ISO/IEC 23000-19:2020(E), Clause 7.2',
        },
        styp: {
            name: 'Segment Type',
            text: "Declares the segment's brand and compatibility.",
            ref: 'ISO/IEC 14496-12, 8.16.2',
        },
        'styp@majorBrand': {
            text: "The 'best use' specification for the segment.",
            ref: 'ISO/IEC 14496-12, 4.3.3',
        },
        'styp@minorVersion': {
            text: 'An informative integer for the minor version of the major brand.',
            ref: 'ISO/IEC 14496-12, 4.3.3',
        },
        'styp@compatibleBrands': {
            text: 'A list of other specifications to which the segment complies.',
            ref: 'ISO/IEC 14496-12, 4.3.3',
        },
    };
    function nt(e, t) {
        let n = new g(e, t),
            { version: i } = n.readVersionAndFlags();
        (i === 1
            ? (n.readBigUint64('creation_time'),
              n.readBigUint64('modification_time'),
              n.readUint32('timescale'),
              n.readBigUint64('duration'))
            : (n.readUint32('creation_time'),
              n.readUint32('modification_time'),
              n.readUint32('timescale'),
              n.readUint32('duration')),
            n.readInt32('rate'),
            n.readInt16('volume'),
            n.skip(10, 'reserved'));
        let r = [];
        for (let o = 0; o < 9; o++) r.push(n.readInt32(`matrix_val_${o}`));
        e.details.matrix = {
            value: `[${r.join(', ')}]`,
            offset: e.details.matrix_val_0.offset,
            length: 36,
        };
        for (let o = 0; o < 9; o++) delete e.details[`matrix_val_${o}`];
        (n.skip(24, 'pre_defined'), n.readUint32('next_track_ID'));
    }
    var it = {
        mvhd: {
            name: 'Movie Header',
            text: 'Contains global information for the presentation (timescale, duration).',
            ref: 'ISO/IEC 14496-12, 8.2.2',
        },
        'mvhd@version': {
            text: 'Version of this box (0 or 1). Affects the size of time and duration fields.',
            ref: 'ISO/IEC 14496-12, 8.2.2.3',
        },
        'mvhd@creation_time': {
            text: 'The creation time of the presentation (in seconds since midnight, Jan. 1, 1904, UTC).',
            ref: 'ISO/IEC 14496-12, 8.2.2.3',
        },
        'mvhd@modification_time': {
            text: 'The most recent time the presentation was modified.',
            ref: 'ISO/IEC 14496-12, 8.2.2.3',
        },
        'mvhd@timescale': {
            text: 'The number of time units that pass in one second for the presentation.',
            ref: 'ISO/IEC 14496-12, 8.2.2.3',
        },
        'mvhd@duration': {
            text: 'The duration of the presentation in units of the timescale.',
            ref: 'ISO/IEC 14496-12, 8.2.2.3',
        },
        'mvhd@rate': {
            text: 'A fixed-point 16.16 number that specifies the preferred playback rate (1.0 is normal speed).',
            ref: 'ISO/IEC 14496-12, 8.2.2.3',
        },
        'mvhd@volume': {
            text: 'A fixed-point 8.8 number that specifies the preferred playback volume (1.0 is full volume).',
            ref: 'ISO/IEC 14496-12, 8.2.2.3',
        },
        'mvhd@matrix': {
            text: 'A transformation matrix for the video, mapping points from video coordinates to display coordinates.',
            ref: 'ISO/IEC 14496-12, 8.2.2.3',
        },
        'mvhd@next_track_ID': {
            text: 'A non-zero integer indicating a value for the track ID of the next track to be added to this presentation.',
            ref: 'ISO/IEC 14496-12, 8.2.2.3',
        },
    };
    function rt(e, t) {
        let n = new g(e, t);
        (n.readVersionAndFlags(), n.readUint32('sequence_number'));
    }
    var ot = {
        mfhd: {
            name: 'Movie Fragment Header',
            text: 'Contains the sequence number of this fragment.',
            ref: 'ISO/IEC 14496-12, 8.8.5',
        },
        'mfhd@sequence_number': {
            text: 'The ordinal number of this fragment, in increasing order.',
            ref: 'ISO/IEC 14496-12, 8.8.5.3',
        },
    };
    function st(e, t) {
        let n = new g(e, t),
            { flags: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        if (
            (n.readUint32('track_ID'),
            i & 1 && n.readBigUint64('base_data_offset'),
            i & 2 && n.readUint32('sample_description_index'),
            i & 8 && n.readUint32('default_sample_duration'),
            i & 16 && n.readUint32('default_sample_size'),
            i & 32)
        ) {
            let r = n.readUint32('default_sample_flags_raw');
            r !== null &&
                ((e.details.default_sample_flags = {
                    value: `0x${r.toString(16)}`,
                    offset: e.details.default_sample_flags_raw.offset,
                    length: 4,
                }),
                delete e.details.default_sample_flags_raw);
        }
        n.finalize();
    }
    var at = {
        tfhd: {
            name: 'Track Fragment Header',
            text: 'Declares defaults for a track fragment.',
            ref: 'ISO/IEC 14496-12, 8.8.7',
        },
        'tfhd@track_ID': {
            text: 'The unique identifier of the track for this fragment.',
            ref: 'ISO/IEC 14496-12, 8.8.7.2',
        },
        'tfhd@flags': {
            text: 'A bitfield indicating which optional fields are present.',
            ref: 'ISO/IEC 14496-12, 8.8.7.2',
        },
        'tfhd@base_data_offset': {
            text: 'The base offset for data within the current mdat.',
            ref: 'ISO/IEC 14496-12, 8.8.7.2',
        },
        'tfhd@sample_description_index': {
            text: 'The index of the sample description for this fragment.',
            ref: 'ISO/IEC 14496-12, 8.8.7.2',
        },
        'tfhd@version': {
            text: 'Version of this box (0 or 1). Affects the size of the decode time field.',
            ref: 'ISO/IEC 14496-12, 8.8.7.2',
        },
        'tfhd@default_sample_duration': {
            text: 'Default duration of samples in this track fragment.',
            ref: 'ISO/IEC 14496-12, 8.8.7.2',
        },
        'tfhd@default_sample_size': {
            text: 'Default size of samples in this track fragment.',
            ref: 'ISO/IEC 14496-12, 8.8.7.2',
        },
        'tfhd@default_sample_flags': {
            text: 'Default flags for samples in this track fragment.',
            ref: 'ISO/IEC 14496-12, 8.8.7.2',
        },
    };
    function lt(e, t) {
        let n = new g(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        (i === 1
            ? n.readBigUint64('baseMediaDecodeTime')
            : n.readUint32('baseMediaDecodeTime'),
            n.finalize());
    }
    var ft = {
        tfdt: {
            name: 'Track Fragment Decode Time',
            text: 'Provides the absolute decode time for the first sample.',
            ref: 'ISO/IEC 14496-12, 8.8.12',
        },
        'tfdt@version': {
            text: 'Version of this box (0 or 1). Affects the size of the decode time field.',
            ref: 'ISO/IEC 14496-12, 8.8.12.3',
        },
        'tfdt@baseMediaDecodeTime': {
            text: 'The absolute decode time, in media timescale units, for the first sample in this fragment.',
            ref: 'ISO/IEC 14496-12, 8.8.12.3',
        },
    };
    function ct(e, t) {
        let n = new g(e, t),
            { version: i, flags: r } = n.readVersionAndFlags();
        if (r === null) {
            n.finalize();
            return;
        }
        let o = n.readUint32('sample_count');
        ((e.samples = []), r & 1 && n.readInt32('data_offset'));
        let l = null;
        if (r & 4) {
            let a = n.readUint32('first_sample_flags_dword');
            a !== null &&
                (delete e.details.first_sample_flags_dword,
                (l = a),
                (e.details.first_sample_flags = {
                    value: `0x${l.toString(16)}`,
                    offset:
                        e.details.first_sample_flags_dword?.offset ||
                        n.box.offset + n.offset - 4,
                    length: 4,
                }));
        }
        if (o !== null)
            for (let a = 0; a < o && !n.stopped; a++) {
                let s = {};
                (r & 256 &&
                    ((s.duration = n.view.getUint32(n.offset)),
                    (n.offset += 4)),
                    r & 512 &&
                        ((s.size = n.view.getUint32(n.offset)),
                        (n.offset += 4)),
                    r & 1024 &&
                        ((s.flags = n.view.getUint32(n.offset)),
                        (n.offset += 4)),
                    a === 0 && l !== null && (s.flags = l),
                    r & 2048 &&
                        (i === 0
                            ? (s.compositionTimeOffset = n.view.getUint32(
                                  n.offset
                              ))
                            : (s.compositionTimeOffset = n.view.getInt32(
                                  n.offset
                              )),
                        (n.offset += 4)),
                    e.samples.push(s));
            }
        n.finalize();
    }
    var dt = {
        trun: {
            name: 'Track Run',
            text: 'Contains timing, size, and flags for a run of samples.',
            ref: 'ISO/IEC 14496-12, 8.8.8',
        },
        'trun@version': {
            text: 'Version of this box (0 or 1). Affects signed/unsigned composition time.',
            ref: 'ISO/IEC 14496-12, 8.8.8.2',
        },
        'trun@flags': {
            text: 'A bitfield indicating which optional per-sample fields are present.',
            ref: 'ISO/IEC 14496-12, 8.8.8.2',
        },
        'trun@sample_count': {
            text: 'The number of samples in this run.',
            ref: 'ISO/IEC 14496-12, 8.8.8.3',
        },
        'trun@data_offset': {
            text: 'An optional offset added to the base_data_offset.',
            ref: 'ISO/IEC 14496-12, 8.8.8.3',
        },
        'trun@first_sample_flags': {
            text: 'Flags for the first sample, overriding the default.',
            ref: 'ISO/IEC 14496-12, 8.8.8.3',
        },
        'trun@sample_1_details': {
            text: 'A summary of the per-sample data fields for the first sample in this run.',
            ref: 'ISO/IEC 14496-12, 8.8.8.2',
        },
    };
    function pt(e, t) {
        let n = new g(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        (n.readUint32('reference_ID'),
            n.readUint32('timescale'),
            i === 1
                ? (n.readBigUint64('earliest_presentation_time'),
                  n.readBigUint64('first_offset'))
                : (n.readUint32('earliest_presentation_time'),
                  n.readUint32('first_offset')),
            n.skip(2, 'reserved'));
        let r = n.readUint16('reference_count');
        if (r === null) {
            n.finalize();
            return;
        }
        for (let o = 0; o < r; o++) {
            let l = n.readUint32(`ref_${o + 1}_type_and_size`);
            if (l === null) break;
            let a = (l >> 31) & 1,
                s = l & 2147483647,
                c = e.details[`ref_${o + 1}_type_and_size`]?.offset || 0;
            (delete e.details[`ref_${o + 1}_type_and_size`],
                (e.details[`reference_${o + 1}_type`] = {
                    value: a === 1 ? 'sidx' : 'media',
                    offset: c,
                    length: 4,
                }),
                (e.details[`reference_${o + 1}_size`] = {
                    value: s,
                    offset: c,
                    length: 4,
                }),
                n.readUint32(`reference_${o + 1}_duration`));
            let f = n.readUint32(`sap_info_dword_${o + 1}`);
            f !== null &&
                (delete e.details[`sap_info_dword_${o + 1}`],
                (e.details[`reference_${o + 1}_sap_info`] = {
                    value: `0x${f.toString(16)}`,
                    offset: c + 8,
                    length: 4,
                }));
        }
        n.finalize();
    }
    var ut = {
        sidx: {
            name: 'Segment Index',
            text: 'Provides a compact index of media stream chunks within a segment.',
            ref: 'ISO/IEC 14496-12, 8.16.3',
        },
        'sidx@version': {
            text: 'Version of this box (0 or 1). Affects the size of time and offset fields.',
            ref: 'ISO/IEC 14496-12, 8.16.3.2',
        },
        'sidx@reference_ID': {
            text: 'The stream ID for the reference stream (typically the track ID).',
            ref: 'ISO/IEC 14496-12, 8.16.3.3',
        },
        'sidx@timescale': {
            text: 'The timescale for time and duration fields in this box, in ticks per second.',
            ref: 'ISO/IEC 14496-12, 8.16.3.3',
        },
        'sidx@earliest_presentation_time': {
            text: 'The earliest presentation time of any access unit in the first subsegment.',
            ref: 'ISO/IEC 14496-12, 8.16.3.3',
        },
        'sidx@first_offset': {
            text: 'The byte offset from the end of this box to the first byte of the indexed material.',
            ref: 'ISO/IEC 14496-12, 8.16.3.3',
        },
        'sidx@reference_count': {
            text: 'The number of subsegment references that follow.',
            ref: 'ISO/IEC 14496-12, 8.16.3.3',
        },
        'sidx@reference_1_type': {
            text: 'The type of the first reference (0 = media, 1 = sidx box).',
            ref: 'ISO/IEC 14496-12, 8.16.3.3',
        },
        'sidx@reference_1_size': {
            text: 'The size in bytes of the referenced item.',
            ref: 'ISO/IEC 14496-12, 8.16.3.3',
        },
        'sidx@reference_1_duration': {
            text: 'The duration of the referenced subsegment in the timescale.',
            ref: 'ISO/IEC 14496-12, 8.16.3.3',
        },
    };
    function mt(e, t) {
        let n = new g(e, t),
            { version: i, flags: r } = n.readVersionAndFlags();
        if (r !== null) {
            delete e.details.flags;
            let f = e.details.version.offset + 1;
            ((e.details.track_enabled = {
                value: (r & 1) === 1,
                offset: f,
                length: 3,
            }),
                (e.details.track_in_movie = {
                    value: (r & 2) === 2,
                    offset: f,
                    length: 3,
                }),
                (e.details.track_in_preview = {
                    value: (r & 4) === 4,
                    offset: f,
                    length: 3,
                }));
        }
        (i === 1
            ? (n.readBigUint64('creation_time'),
              n.readBigUint64('modification_time'))
            : (n.readUint32('creation_time'),
              n.readUint32('modification_time')),
            n.readUint32('track_ID'),
            n.skip(4, 'reserved_1'),
            i === 1 ? n.readBigUint64('duration') : n.readUint32('duration'),
            n.skip(8, 'reserved_2'),
            n.readInt16('layer'),
            n.readInt16('alternate_group'));
        let o = n.readInt16('volume_fixed_point');
        (o !== null &&
            ((e.details.volume = {
                ...e.details.volume_fixed_point,
                value: (o / 256).toFixed(2),
            }),
            delete e.details.volume_fixed_point),
            n.skip(2, 'reserved_3'));
        let l = [];
        for (let f = 0; f < 9; f++) l.push(n.readInt32(`matrix_val_${f}`));
        let a = e.details.matrix_val_0?.offset;
        if (a !== void 0) {
            e.details.matrix = {
                value: `[${l.join(', ')}]`,
                offset: a,
                length: 36,
            };
            for (let f = 0; f < 9; f++) delete e.details[`matrix_val_${f}`];
        }
        let s = n.readUint32('width_fixed_point');
        s !== null &&
            ((e.details.width = {
                ...e.details.width_fixed_point,
                value: (s / 65536).toFixed(2),
            }),
            delete e.details.width_fixed_point);
        let c = n.readUint32('height_fixed_point');
        c !== null &&
            ((e.details.height = {
                ...e.details.height_fixed_point,
                value: (c / 65536).toFixed(2),
            }),
            delete e.details.height_fixed_point);
    }
    var gt = {
        tkhd: {
            name: 'Track Header',
            text: 'Specifies characteristics of a single track.',
            ref: 'ISO/IEC 14496-12, 8.3.2',
        },
        'tkhd@track_enabled': {
            text: 'A flag indicating that the track is enabled. A disabled track is treated as if it were not present.',
            ref: 'ISO/IEC 14496-12, 8.3.2.3',
        },
        'tkhd@track_in_movie': {
            text: 'A flag indicating that the track is used in the presentation.',
            ref: 'ISO/IEC 14496-12, 8.3.2.3',
        },
        'tkhd@track_in_preview': {
            text: 'A flag indicating that the track is used when previewing the presentation.',
            ref: 'ISO/IEC 14496-12, 8.3.2.3',
        },
        'tkhd@version': {
            text: 'Version of this box (0 or 1). Affects the size of time and duration fields.',
            ref: 'ISO/IEC 14496-12, 8.3.2.3',
        },
        'tkhd@creation_time': {
            text: 'The creation time of this track (in seconds since midnight, Jan. 1, 1904, UTC).',
            ref: 'ISO/IEC 14496-12, 8.3.2.3',
        },
        'tkhd@modification_time': {
            text: 'The most recent time the track was modified.',
            ref: 'ISO/IEC 14496-12, 8.3.2.3',
        },
        'tkhd@track_ID': {
            text: 'A unique integer that identifies this track.',
            ref: 'ISO/IEC 14496-12, 8.3.2.3',
        },
        'tkhd@duration': {
            text: "The duration of this track in the movie's timescale.",
            ref: 'ISO/IEC 14496-12, 8.3.2.3',
        },
        'tkhd@layer': {
            text: 'Specifies the front-to-back ordering of video tracks; tracks with lower numbers are closer to the viewer.',
            ref: 'ISO/IEC 14496-12, 8.3.2.3',
        },
        'tkhd@alternate_group': {
            text: 'An integer that specifies a group of tracks that are alternatives to each other.',
            ref: 'ISO/IEC 14496-12, 8.3.2.3',
        },
        'tkhd@volume': {
            text: "For audio tracks, a fixed-point 8.8 number indicating the track's relative volume.",
            ref: 'ISO/IEC 14496-12, 8.3.2.3',
        },
        'tkhd@matrix': {
            text: 'A transformation matrix for the video in this track.',
            ref: 'ISO/IEC 14496-12, 8.3.2.3',
        },
        'tkhd@width': {
            text: 'The visual presentation width of the track as a fixed-point 16.16 number.',
            ref: 'ISO/IEC 14496-12, 8.3.2.3',
        },
        'tkhd@height': {
            text: 'The visual presentation height of the track as a fixed-point 16.16 number.',
            ref: 'ISO/IEC 14496-12, 8.3.2.3',
        },
    };
    function ht(e, t) {
        let n = new g(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        (i === 1
            ? (n.readBigUint64('creation_time'),
              n.readBigUint64('modification_time'))
            : (n.readUint32('creation_time'),
              n.readUint32('modification_time')),
            n.readUint32('timescale'),
            i === 1 ? n.readBigUint64('duration') : n.readUint32('duration'));
        let r = n.readUint16('language_bits');
        if (r !== null) {
            let o = String.fromCharCode(
                ((r >> 10) & 31) + 96,
                ((r >> 5) & 31) + 96,
                (r & 31) + 96
            );
            ((e.details.language = {
                value: o,
                offset: e.details.language_bits.offset,
                length: 2,
            }),
                delete e.details.language_bits);
        }
        (n.skip(2, 'pre-defined'), n.finalize());
    }
    var _t = {
        mdhd: {
            name: 'Media Header',
            text: 'Declares media information (timescale, language).',
            ref: 'ISO/IEC 14496-12, 8.4.2',
        },
        'mdhd@version': {
            text: 'Version of this box (0 or 1). Affects the size of time and duration fields.',
            ref: 'ISO/IEC 14496-12, 8.4.2.3',
        },
        'mdhd@timescale': {
            text: "The number of time units that pass in one second for this track's media.",
            ref: 'ISO/IEC 14496-12, 8.4.2.3',
        },
        'mdhd@duration': {
            text: "The duration of this track's media in units of its own timescale.",
            ref: 'ISO/IEC 14496-12, 8.4.2.3',
        },
        'mdhd@language': {
            text: 'The ISO-639-2/T language code for this media.',
            ref: 'ISO/IEC 14496-12, 8.4.2.3',
        },
    };
    function xt(e, t) {
        let n = new g(e, t);
        (n.readVersionAndFlags(),
            n.skip(4, 'pre_defined'),
            n.readString(4, 'handler_type'),
            n.skip(12, 'reserved'),
            n.readNullTerminatedString('name'),
            n.finalize());
    }
    var yt = {
        hdlr: {
            name: 'Handler Reference',
            text: "Declares the media type of the track (e.g., 'vide', 'soun').",
            ref: 'ISO/IEC 14496-12, 8.4.3',
        },
        'hdlr@handler_type': {
            text: "A four-character code identifying the media type (e.g., 'vide', 'soun', 'hint').",
            ref: 'ISO/IEC 14496-12, 8.4.3.3',
        },
        'hdlr@name': {
            text: 'A human-readable name for the track type (for debugging and inspection purposes).',
            ref: 'ISO/IEC 14496-12, 8.4.3.3',
        },
    };
    function St(e, t) {
        let n = new g(e, t);
        (n.readVersionAndFlags(), n.readUint16('graphicsmode'));
        let i = n.readUint16('opcolor_r'),
            r = n.readUint16('opcolor_g'),
            o = n.readUint16('opcolor_b');
        if (i !== null && r !== null && o !== null) {
            let l = e.details.opcolor_r.offset;
            (delete e.details.opcolor_r,
                delete e.details.opcolor_g,
                delete e.details.opcolor_b,
                (e.details.opcolor = {
                    value: `R:${i}, G:${r}, B:${o}`,
                    offset: l,
                    length: 6,
                }));
        }
        n.finalize();
    }
    var bt = {
        vmhd: {
            name: 'Video Media Header',
            text: 'Contains header information specific to video media.',
            ref: 'ISO/IEC 14496-12, 8.4.5.2',
        },
        'vmhd@version': {
            text: 'Version of this box, always 0.',
            ref: 'ISO/IEC 14496-12, 8.4.5.2.2',
        },
        'vmhd@flags': {
            text: 'A bitmask of flags, should have the low bit set to 1.',
            ref: 'ISO/IEC 14496-12, 8.4.5.2',
        },
        'vmhd@graphicsmode': {
            text: 'Specifies a composition mode for this video track.',
            ref: 'ISO/IEC 14496-12, 8.4.5.2.2',
        },
        'vmhd@opcolor': {
            text: 'A set of RGB color values available for use by graphics modes.',
            ref: 'ISO/IEC 14496-12, 8.4.5.2.2',
        },
    };
    function vt(e, t) {
        let n = new g(e, t);
        (n.readVersionAndFlags(), n.readUint32('entry_count'));
    }
    var Ct = {
        stsd: {
            name: 'Sample Description',
            text: 'Stores information for decoding samples (codec type, initialization data). Contains one or more Sample Entry boxes.',
            ref: 'ISO/IEC 14496-12, 8.5.2',
        },
        'stsd@entry_count': {
            text: 'The number of sample entries that follow.',
            ref: 'ISO/IEC 14496-12, 8.5.2.3',
        },
        'stsd@version': {
            text: 'Version of this box, always 0.',
            ref: 'ISO/IEC 14496-12, 8.5.2.3',
        },
    };
    function It(e, t) {
        let n = new g(e, t);
        n.readVersionAndFlags();
        let i = n.readUint32('entry_count');
        if (i !== null && i > 0) {
            for (let o = 0; o < i && !n.stopped; o++)
                o < 10
                    ? (n.readUint32(`sample_count_${o + 1}`),
                      n.readUint32(`sample_delta_${o + 1}`))
                    : (n.offset += 8);
            i > 10 &&
                (e.details['...more_entries'] = {
                    value: `${i - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        n.finalize();
    }
    var Tt = {
        stts: {
            name: 'Decoding Time to Sample',
            text: 'Maps decoding times to sample numbers.',
            ref: 'ISO/IEC 14496-12, 8.6.1.2',
        },
        'stts@version': {
            text: 'Version of this box, always 0.',
            ref: 'ISO/IEC 14496-12, 8.6.1.2.3',
        },
        'stts@entry_count': {
            text: 'The number of entries in the time-to-sample table.',
            ref: 'ISO/IEC 14496-12, 8.6.1.2.3',
        },
        'stts@sample_count_1': {
            text: 'The number of consecutive samples with the same delta for the first table entry.',
            ref: 'ISO/IEC 14496-12, 8.6.1.2.3',
        },
        'stts@sample_delta_1': {
            text: 'The delta (duration) for each sample in this run for the first table entry.',
            ref: 'ISO/IEC 14496-12, 8.6.1.2.3',
        },
    };
    function Et(e, t) {
        let n = new g(e, t);
        n.readVersionAndFlags();
        let i = n.readUint32('entry_count');
        if (i !== null && i > 0) {
            for (let o = 0; o < i && !n.stopped; o++)
                if (o < 10) {
                    let l = `entry_${o + 1}`;
                    (n.readUint32(`${l}_first_chunk`),
                        n.readUint32(`${l}_samples_per_chunk`),
                        n.readUint32(`${l}_sample_description_index`));
                } else n.offset += 12;
            i > 10 &&
                (e.details['...more_entries'] = {
                    value: `${i - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        n.finalize();
    }
    var Pt = {
        stsc: {
            name: 'Sample To Chunk',
            text: 'Maps samples to chunks.',
            ref: 'ISO/IEC 14496-12, 8.7.4',
        },
        'stsc@version': {
            text: 'Version of this box, always 0.',
            ref: 'ISO/IEC 14496-12, 8.7.4.3',
        },
        'stsc@entry_count': {
            text: 'The number of entries in the sample-to-chunk table.',
            ref: 'ISO/IEC 14496-12, 8.7.4.3',
        },
        'stsc@entry_1_first_chunk': {
            text: 'The index of the first chunk in a run of chunks with the same properties.',
            ref: 'ISO/IEC 14496-12, 8.7.4.3',
        },
        'stsc@entry_1_samples_per_chunk': {
            text: 'The number of samples in each of these chunks.',
            ref: 'ISO/IEC 14496-12, 8.7.4.3',
        },
        'stsc@entry_1_sample_description_index': {
            text: 'The index of the sample description for the samples in this run.',
            ref: 'ISO/IEC 14496-12, 8.7.4.3',
        },
    };
    function At(e, t) {
        let n = new g(e, t);
        n.readVersionAndFlags();
        let i = n.readUint32('sample_size'),
            r = n.readUint32('sample_count');
        if (i === 0 && r !== null && r > 0) {
            for (let l = 0; l < r && !n.stopped; l++)
                l < 10 ? n.readUint32(`entry_size_${l + 1}`) : (n.offset += 4);
            r > 10 &&
                (e.details['...more_entries'] = {
                    value: `${r - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        n.finalize();
    }
    var Ut = {
        stsz: {
            name: 'Sample Size',
            text: 'Specifies the size of each sample.',
            ref: 'ISO/IEC 14496-12, 8.7.3',
        },
        'stsz@version': {
            text: 'Version of this box, always 0.',
            ref: 'ISO/IEC 14496-12, 8.7.3.2.2',
        },
        'stsz@sample_size': {
            text: 'Default sample size. If 0, sizes are in the entry table.',
            ref: 'ISO/IEC 14496-12, 8.7.3.2.2',
        },
        'stsz@sample_count': {
            text: 'The total number of samples in the track.',
            ref: 'ISO/IEC 14496-12, 8.7.3.2.2',
        },
        'stsz@entry_size_1': {
            text: 'The size of the first sample in bytes (if sample_size is 0).',
            ref: 'ISO/IEC 14496-12, 8.7.3.2.2',
        },
    };
    function Dt(e, t) {
        let n = new g(e, t);
        n.readVersionAndFlags();
        let i = n.readUint32('entry_count');
        if (i !== null && i > 0) {
            for (let o = 0; o < i && !n.stopped; o++)
                o < 10
                    ? n.readUint32(`chunk_offset_${o + 1}`)
                    : (n.offset += 4);
            i > 10 &&
                (e.details['...more_entries'] = {
                    value: `${i - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        n.finalize();
    }
    var kt = {
        stco: {
            name: 'Chunk Offset',
            text: 'Specifies the offset of each chunk into the file.',
            ref: 'ISO/IEC 14496-12, 8.7.5',
        },
        'stco@version': {
            text: 'Version of this box, always 0.',
            ref: 'ISO/IEC 14496-12, 8.7.5.3',
        },
        'stco@entry_count': {
            text: 'The number of entries in the chunk offset table.',
            ref: 'ISO/IEC 14496-12, 8.7.5.3',
        },
        'stco@chunk_offset_1': {
            text: 'The file offset of the first chunk.',
            ref: 'ISO/IEC 14496-12, 8.7.5.3',
        },
    };
    function Mt(e, t) {
        let n = new g(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        let r = n.readUint32('entry_count');
        if (r !== null && r > 0) {
            let l = i === 1 ? 20 : 12;
            for (let a = 0; a < r && !n.stopped; a++)
                if (a < 5) {
                    let s = `entry_${a + 1}`;
                    (i === 1
                        ? (n.readBigUint64(`${s}_segment_duration`),
                          n.readBigInt64(`${s}_media_time`))
                        : (n.readUint32(`${s}_segment_duration`),
                          n.readInt32(`${s}_media_time`)),
                        n.readInt16(`${s}_media_rate_integer`),
                        n.readInt16(`${s}_media_rate_fraction`));
                } else n.offset += l;
            r > 5 &&
                (e.details['...more_entries'] = {
                    value: `${r - 5} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        n.finalize();
    }
    var wt = {
        elst: {
            name: 'Edit List',
            text: 'Maps the media time-line to the presentation time-line.',
            ref: 'ISO/IEC 14496-12, 8.6.6',
        },
        'elst@version': {
            text: 'Version of this box (0 or 1). Affects the size of duration and time fields.',
            ref: 'ISO/IEC 14496-12, 8.6.6.3',
        },
        'elst@entry_count': {
            text: 'The number of entries in the edit list.',
            ref: 'ISO/IEC 14496-12, 8.6.6.3',
        },
        'elst@entry_1_segment_duration': {
            text: 'The duration of this edit segment in movie timescale units.',
            ref: 'ISO/IEC 14496-12, 8.6.6.3',
        },
        'elst@entry_1_media_time': {
            text: 'The starting time within the media of this edit segment. A value of -1 indicates an empty edit.',
            ref: 'ISO/IEC 14496-12, 8.6.6.3',
        },
    };
    function Lt(e, t) {
        let n = new g(e, t);
        (n.readVersionAndFlags(),
            n.readUint32('track_ID'),
            n.readUint32('default_sample_description_index'),
            n.readUint32('default_sample_duration'),
            n.readUint32('default_sample_size'));
        let i = n.readUint32('default_sample_flags_raw');
        (i !== null &&
            ((e.details.default_sample_flags = {
                value: `0x${i.toString(16)}`,
                offset: e.details.default_sample_flags_raw.offset,
                length: 4,
            }),
            delete e.details.default_sample_flags_raw),
            n.finalize());
    }
    var Bt = {
        trex: {
            name: 'Track Extends',
            text: 'Sets default values for samples in fragments.',
            ref: 'ISO/IEC 14496-12, 8.8.3',
        },
        'trex@track_ID': {
            text: 'The track ID to which these defaults apply.',
            ref: 'ISO/IEC 14496-12, 8.8.3.3',
        },
        'trex@default_sample_description_index': {
            text: 'The default sample description index for samples in fragments.',
            ref: 'ISO/IEC 14496-12, 8.8.3.3',
        },
        'trex@default_sample_duration': {
            text: 'The default duration for samples in fragments.',
            ref: 'ISO/IEC 14496-12, 8.8.3.3',
        },
        'trex@default_sample_size': {
            text: 'The default size for samples in fragments.',
            ref: 'ISO/IEC 14496-12, 8.8.3.3',
        },
        'trex@default_sample_flags': {
            text: 'The default flags for samples in fragments.',
            ref: 'ISO/IEC 14496-12, 8.8.3.3',
        },
    };
    var Rt = {
        moov: {
            name: 'Movie',
            text: 'Container for all metadata defining the presentation.',
            ref: 'ISO/IEC 14496-12, 8.2.1',
        },
        trak: {
            name: 'Track',
            text: 'Container for a single track.',
            ref: 'ISO/IEC 14496-12, 8.3.1',
        },
        meta: {
            name: 'Metadata',
            text: 'A container for metadata.',
            ref: 'ISO/IEC 14496-12, 8.11.1',
        },
        mdia: {
            name: 'Media',
            text: 'Container for media data information.',
            ref: 'ISO/IEC 14496-12, 8.4.1',
        },
        minf: {
            name: 'Media Information',
            text: 'Container for characteristic information of the media.',
            ref: 'ISO/IEC 14496-12, 8.4.4',
        },
        dinf: {
            name: 'Data Information',
            text: 'Container for objects that declare where media data is located.',
            ref: 'ISO/IEC 14496-12, 8.7.1',
        },
        stbl: {
            name: 'Sample Table',
            text: 'Contains all time and data indexing for samples.',
            ref: 'ISO/IEC 14496-12, 8.5.1',
        },
        edts: {
            name: 'Edit Box',
            text: 'A container for an edit list.',
            ref: 'ISO/IEC 14496-12, 8.6.5',
        },
        mvex: {
            name: 'Movie Extends',
            text: 'Signals that the movie may contain fragments.',
            ref: 'ISO/IEC 14496-12, 8.8.1',
        },
        moof: {
            name: 'Movie Fragment',
            text: 'Container for all metadata for a single fragment.',
            ref: 'ISO/IEC 14496-12, 8.8.4',
        },
        traf: {
            name: 'Track Fragment',
            text: "Container for metadata for a single track's fragment.",
            ref: 'ISO/IEC 14496-12, 8.8.6',
        },
        pssh: {
            name: 'Protection System Specific Header',
            text: 'Contains DRM initialization data.',
            ref: 'ISO/IEC 23001-7',
        },
        mdat: {
            name: 'Media Data',
            text: 'Contains the actual audio/video sample data.',
            ref: 'ISO/IEC 14496-12, 8.1.1',
        },
    };
    var Ee = class {
        constructor(t) {
            ((this.buffer = t),
                (this.bytePosition = 0),
                (this.bitPosition = 0));
        }
        readBits(t) {
            let n = 0;
            for (let i = 0; i < t; i++) {
                let o =
                    (this.buffer[this.bytePosition] >> (7 - this.bitPosition)) &
                    1;
                ((n = (n << 1) | o),
                    this.bitPosition++,
                    this.bitPosition === 8 &&
                        ((this.bitPosition = 0), this.bytePosition++));
            }
            return n;
        }
        readUE() {
            let t = 0;
            for (
                ;
                this.bytePosition < this.buffer.length &&
                this.readBits(1) === 0;

            )
                t++;
            if (t === 0) return 0;
            let n = this.readBits(t);
            return (1 << t) - 1 + n;
        }
    };
    function zt(e) {
        if (e.length < 4) return null;
        let t = new Ee(e);
        t.readBits(8);
        let n = t.readBits(8);
        t.readBits(16);
        let i = t.readBits(8);
        if (
            (t.readUE(),
            n === 100 ||
                n === 110 ||
                n === 122 ||
                n === 244 ||
                n === 44 ||
                n === 83 ||
                n === 86 ||
                n === 118 ||
                n === 128 ||
                n === 138)
        ) {
            let d = t.readUE();
            if (
                (d === 3 && t.readBits(1),
                t.readUE(),
                t.readUE(),
                t.readBits(1),
                t.readBits(1))
            ) {
                let u = d !== 3 ? 8 : 12;
                for (let h = 0; h < u; h++)
                    if (t.readBits(1))
                        return {
                            profile_idc: n,
                            level_idc: i,
                            error: 'SPS with scaling matrix not fully parsed.',
                        };
            }
        }
        t.readUE();
        let r = t.readUE();
        if (r === 0) t.readUE();
        else if (r === 1) {
            (t.readBits(1), t.readUE(), t.readUE());
            let d = t.readUE();
            for (let p = 0; p < d; p++) t.readUE();
        }
        (t.readUE(), t.readBits(1));
        let o = t.readUE(),
            l = t.readUE(),
            a = t.readBits(1),
            s = (o + 1) * 16,
            c = (2 - a) * (l + 1) * 16;
        if ((a === 0 && t.readBits(1), t.readBits(1), t.readBits(1))) {
            let d = t.readUE(),
                p = t.readUE(),
                u = t.readUE(),
                h = t.readUE(),
                _ = 1,
                x = 2 - a,
                S = s - (d + p) * _;
            c = c - (u + h) * x;
        }
        return { profile_idc: n, level_idc: i, resolution: `${s}x${c}` };
    }
    function Nt(e, t) {
        let n = new g(e, t);
        n.readUint8('configurationVersion');
        let i = n.readUint8('AVCProfileIndication');
        (n.readUint8('profile_compatibility'),
            n.readUint8('AVCLevelIndication'));
        let r = n.readUint8('length_size_byte');
        r !== null &&
            (delete e.details.length_size_byte,
            (e.details.lengthSizeMinusOne = {
                value: r & 3,
                offset: e.offset + n.offset - 1,
                length: 0.25,
            }),
            (e.details.reserved_6_bits = {
                value: (r >> 2) & 63,
                offset: e.offset + n.offset - 1,
                length: 0.75,
            }));
        let o = n.readUint8('sps_count_byte');
        if (o !== null) {
            delete e.details.sps_count_byte;
            let a = o & 31;
            ((e.details.numOfSequenceParameterSets = {
                value: a,
                offset: e.offset + n.offset - 1,
                length: 0.625,
            }),
                (e.details.reserved_3_bits = {
                    value: (o >> 5) & 7,
                    offset: e.offset + n.offset - 1,
                    length: 0.375,
                }));
            for (let s = 0; s < a; s++) {
                let c = n.readUint16(`sps_${s + 1}_length`);
                if (c === null) break;
                let f = n.offset;
                if (n.checkBounds(c)) {
                    let d = new Uint8Array(
                            n.view.buffer,
                            n.view.byteOffset + f,
                            c
                        ),
                        p = zt(d);
                    (p &&
                        ((e.details[`sps_${s + 1}_decoded_profile`] = {
                            value: p.profile_idc,
                            offset: 0,
                            length: 0,
                        }),
                        (e.details[`sps_${s + 1}_decoded_level`] = {
                            value: p.level_idc,
                            offset: 0,
                            length: 0,
                        }),
                        (e.details[`sps_${s + 1}_decoded_resolution`] = {
                            value: p.resolution,
                            offset: 0,
                            length: 0,
                        })),
                        n.skip(c, `sps_${s + 1}_nal_unit`));
                }
            }
        }
        let l = n.readUint8('numOfPictureParameterSets');
        if (l !== null)
            for (let a = 0; a < l; a++) {
                let s = n.readUint16(`pps_${a + 1}_length`);
                if (s === null) break;
                n.skip(s, `pps_${a + 1}_nal_unit`);
            }
        (n.offset < e.size &&
            (i === 100 || i === 110 || i === 122 || i === 144) &&
            n.readRemainingBytes('profile_specific_extensions'),
            n.finalize());
    }
    var Ft = {
        avcC: {
            name: 'AVC Configuration',
            text: 'Contains the decoder configuration information for an H.264/AVC video track, including SPS and PPS.',
            ref: 'ISO/IEC 14496-15, 5.3.3.1.2',
        },
        'avcC@AVCProfileIndication': {
            text: 'Specifies the profile to which the stream conforms (e.g., 66=Baseline, 77=Main, 100=High).',
            ref: 'ISO/IEC 14496-10',
        },
        'avcC@AVCLevelIndication': {
            text: 'Specifies the level to which the stream conforms.',
            ref: 'ISO/IEC 14496-10',
        },
        'avcC@sps_1_decoded_resolution': {
            text: 'The video resolution (width x height) decoded from the Sequence Parameter Set.',
            ref: 'ISO/IEC 14496-10, 7.3.2.1.1',
        },
    };
    var os = {
            1: 'AAC Main',
            2: 'AAC LC',
            3: 'AAC SSR',
            4: 'AAC LTP',
            5: 'SBR',
            6: 'AAC Scalable',
        },
        ss = {
            0: '96000 Hz',
            1: '88200 Hz',
            2: '64000 Hz',
            3: '48000 Hz',
            4: '44100 Hz',
            5: '32000 Hz',
            6: '24000 Hz',
            7: '22050 Hz',
            8: '16000 Hz',
            9: '12000 Hz',
            10: '11025 Hz',
            11: '8000 Hz',
            12: '7350 Hz',
        },
        as = [
            'Custom',
            'Mono (Center)',
            'Stereo (L, R)',
            '3 (L, C, R)',
            '4 (L, C, R, Sur)',
            '5 (L, C, R, Ls, Rs)',
            '5.1 (L, C, R, Ls, Rs, LFE)',
            '7.1 (L, C, R, Ls, Rs, Lcs, Rcs, LFE)',
        ];
    function fe(e, t) {
        let n = e.offset,
            i = 0,
            r,
            o = 0;
        do {
            if (((r = e.readUint8(`size_byte_${o}`)), r === null)) return null;
            ((i = (i << 7) | (r & 127)), o++);
        } while (r & 128 && o < 4);
        e.box.details[t] = { value: i, offset: e.box.offset + n, length: o };
        for (let l = 0; l < o; l++) delete e.box.details[`size_byte_${l}`];
        return i;
    }
    function Vt(e, t) {
        let n = new g(e, t);
        n.readVersionAndFlags();
        let i = n.readUint8('ES_Descriptor_tag');
        if (i !== 3) {
            (n.addIssue(
                'warn',
                `Expected ES_Descriptor tag (0x03), but found ${i}.`
            ),
                n.finalize());
            return;
        }
        let r = fe(n, 'ES_Descriptor_size');
        if (r === null) {
            n.finalize();
            return;
        }
        let o = n.offset + r;
        if (
            (n.readUint16('ES_ID'),
            n.readUint8('streamDependence_and_priority'),
            n.offset < o && n.readUint8('DecoderConfigDescriptor_tag') === 4)
        ) {
            let a = fe(n, 'DecoderConfigDescriptor_size'),
                s = n.offset + a;
            if (
                (n.readUint8('objectTypeIndication'),
                n.readUint8('streamType_and_upStream'),
                n.skip(3, 'bufferSizeDB'),
                n.readUint32('maxBitrate'),
                n.readUint32('avgBitrate'),
                n.offset < s && n.readUint8('DecoderSpecificInfo_tag') === 5)
            ) {
                let f = fe(n, 'DecoderSpecificInfo_size');
                if (f !== null && f >= 2) {
                    let d = n.offset,
                        p = (n.readUint16('AudioSpecificConfig_bits') >>> 0)
                            .toString(2)
                            .padStart(16, '0');
                    delete e.details.AudioSpecificConfig_bits;
                    let u = parseInt(p.substring(0, 5), 2),
                        h = parseInt(p.substring(5, 9), 2),
                        _ = parseInt(p.substring(9, 13), 2);
                    ((e.details.decoded_audio_object_type = {
                        value: `${os[u] || 'Unknown'} (${u})`,
                        offset: n.box.offset + d,
                        length: 0.625,
                    }),
                        (e.details.decoded_sampling_frequency = {
                            value: `${ss[h] || 'Unknown'} (${h})`,
                            offset: n.box.offset + d + 0.625,
                            length: 0.5,
                        }),
                        (e.details.decoded_channel_configuration = {
                            value: `${as[_] || 'Unknown'} (${_})`,
                            offset: n.box.offset + d + 1.125,
                            length: 0.5,
                        }),
                        n.skip(f - 2, 'decoder_specific_info_remains'));
                } else f > 0 && n.skip(f, 'decoder_specific_info_data');
            }
        }
        if (n.offset < o && n.readUint8('SLConfigDescriptor_tag') === 6) {
            let a = fe(n, 'SLConfigDescriptor_size');
            a !== null &&
                (a === 1
                    ? n.readUint8('predefined')
                    : n.skip(a, 'sl_config_data'));
        }
        n.finalize();
    }
    var $t = {
        esds: {
            name: 'Elementary Stream Descriptor',
            text: 'Contains information about the elementary stream, such as the audio object type for AAC.',
            ref: 'ISO/IEC 14496-1, 7.2.6.5',
        },
        'esds@objectTypeIndication': {
            text: 'Specifies the audio coding profile (e.g., 64 = AAC LC, 5 = SBR). The value 0x40 corresponds to 64.',
            ref: 'ISO/IEC 14496-1, Table 5',
        },
        'esds@decoded_audio_object_type': {
            text: 'The specific type of audio coding, decoded from the DecoderSpecificInfo. This is the definitive audio profile.',
            ref: 'ISO/IEC 14496-3, 1.5.1.1',
        },
        'esds@decoded_sampling_frequency': {
            text: 'The audio sampling frequency, decoded from the DecoderSpecificInfo.',
            ref: 'ISO/IEC 14496-3, 1.5.1.1',
        },
        'esds@decoded_channel_configuration': {
            text: 'The speaker channel layout, decoded from the DecoderSpecificInfo.',
            ref: 'ISO/IEC 14496-3, 1.5.1.1',
        },
        SLConfigDescriptor_tag: {
            name: 'Sync Layer Config Descriptor Tag',
            text: 'Tag identifying the Sync Layer (SL) Configuration Descriptor, which contains configuration for the synchronization layer.',
            ref: 'ISO/IEC 14496-1, 7.2.6.8',
        },
        'SLConfigDescriptor_tag@predefined': {
            name: 'Predefined',
            text: 'A predefined value for the SL packet header configuration. A value of 2 indicates that SL packets have a 1-byte header.',
            ref: 'ISO/IEC 14496-1, 7.2.6.8',
        },
    };
    function Ht(e, t) {
        let n = new g(e, t);
        (n.readVersionAndFlags(),
            n.readInt16('balance'),
            n.skip(2, 'reserved'),
            n.finalize());
    }
    var Ot = {
        smhd: {
            name: 'Sound Media Header',
            text: 'Contains header information specific to sound media.',
            ref: 'ISO/IEC 14496-12, 8.4.5.3',
        },
        'smhd@balance': {
            text: 'A fixed-point 8.8 number that places mono audio tracks in a stereo space (0 = center).',
            ref: 'ISO/IEC 14496-12, 8.4.5.3.2',
        },
        'smhd@version': {
            text: 'Version of this box, always 0.',
            ref: 'ISO/IEC 14496-12, 8.4.5.3.2',
        },
    };
    function Xt(e, t) {
        let n = new g(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        let r = [];
        for (let a = 0; a < 16; a++) {
            let s = n.readUint8(`system_id_byte_${a}`);
            if (s === null) {
                n.finalize();
                return;
            }
            r.push(s.toString(16).padStart(2, '0'));
        }
        let o = e.details.system_id_byte_0.offset;
        for (let a = 0; a < 16; a++) delete e.details[`system_id_byte_${a}`];
        if (
            ((e.details['System ID'] = {
                value: r.join('-'),
                offset: o,
                length: 16,
            }),
            i > 0)
        ) {
            let a = n.readUint32('Key ID Count');
            a !== null && n.skip(a * 16, 'Key IDs');
        }
        let l = n.readUint32('Data Size');
        (l !== null && n.skip(l, 'Data'), n.finalize());
    }
    var Gt = {
        pssh: {
            name: 'Protection System Specific Header',
            text: 'Contains DRM initialization data.',
            ref: 'ISO/IEC 23001-7',
        },
        'pssh@System ID': {
            text: 'A 16-byte UUID that uniquely identifies the DRM system (e.g., Widevine, PlayReady).',
            ref: 'ISO/IEC 23001-7, 5.1.2',
        },
        'pssh@Data Size': {
            text: 'The size of the system-specific initialization data that follows.',
            ref: 'ISO/IEC 23001-7, 5.1.2',
        },
        'pssh@version': {
            text: 'Version of this box (0 or 1). Version 1 includes key IDs.',
            ref: 'ISO/IEC 23001-7, 5.1.2',
        },
        'pssh@Key ID Count': {
            text: 'The number of key IDs present in the box (only for version 1).',
            ref: 'ISO/IEC 23001-7, 5.1.2',
        },
    };
    function jt(e, t) {
        let n = new g(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        let r = n.readUint32('entry_count');
        if (r !== null && r > 0) {
            for (let l = 0; l < r && !n.stopped; l++)
                if (l < 10) {
                    let a = `entry_${l + 1}`;
                    (n.readUint32(`${a}_sample_count`),
                        i === 1
                            ? n.readInt32(`${a}_sample_offset`)
                            : n.readUint32(`${a}_sample_offset`));
                } else n.offset += 8;
            r > 10 &&
                (e.details['...more_entries'] = {
                    value: `${r - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        n.finalize();
    }
    var Wt = {
        ctts: {
            name: 'Composition Time to Sample',
            text: 'Provides the offset between decoding time and composition time for each sample. Essential for B-frames.',
            ref: 'ISO/IEC 14496-12, 8.6.1.3',
        },
        'ctts@version': {
            text: 'Version of this box (0 or 1). Version 1 allows for signed sample offsets.',
            ref: 'ISO/IEC 14496-12, 8.6.1.3.3',
        },
        'ctts@entry_count': {
            text: 'The number of entries in the composition time-to-sample table.',
            ref: 'ISO/IEC 14496-12, 8.6.1.3.3',
        },
        'ctts@entry_1_sample_count': {
            text: 'The number of consecutive samples with the same composition offset.',
            ref: 'ISO/IEC 14496-12, 8.6.1.3.3',
        },
        'ctts@entry_1_sample_offset': {
            text: 'The composition time offset for this run of samples (CT = DT + offset).',
            ref: 'ISO/IEC 14496-12, 8.6.1.3.3',
        },
    };
    function qt(e, t) {
        let n = new g(e, t);
        (n.readVersionAndFlags(), n.skip(3, 'reserved'));
        let i = n.readUint8('field_size'),
            r = n.readUint32('sample_count');
        if (r !== null && r > 0) {
            let o;
            if (i === 4) {
                let l = n.readUint8('entry_size_1_byte');
                l !== null && (o = `(nibbles) ${(l >> 4) & 15}, ${l & 15}`);
            } else
                i === 8
                    ? (o = n.readUint8('entry_size_1'))
                    : i === 16 && (o = n.readUint16('entry_size_1'));
            o !== void 0 && (e.details.entry_size_1.value = o);
        }
        n.finalize();
    }
    var Yt = {
        stz2: {
            name: 'Compact Sample Size',
            text: 'A compact version of the Sample Size Box for smaller, varying sample sizes.',
            ref: 'ISO/IEC 14496-12, 8.7.3.3',
        },
        'stz2@field_size': {
            text: 'The size in bits of each entry in the sample size table (4, 8, or 16).',
            ref: 'ISO/IEC 14496-12, 8.7.3.3.2',
        },
        'stz2@sample_count': {
            text: 'The total number of samples in the track.',
            ref: 'ISO/IEC 14496-12, 8.7.3.3.2',
        },
        'stz2@entry_size_1': {
            text: 'The size of the first sample, with the size determined by field_size.',
            ref: 'ISO/IEC 14496-12, 8.7.3.3.2',
        },
    };
    function Kt(e, t) {
        let n = new g(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        (n.readString(4, 'grouping_type'),
            i === 1 && n.readUint32('grouping_type_parameter'));
        let r = n.readUint32('entry_count');
        (r !== null &&
            r > 0 &&
            (n.readUint32('entry_1_sample_count'),
            n.readUint32('entry_1_group_description_index')),
            n.finalize());
    }
    var Qt = {
        sbgp: {
            name: 'Sample to Group',
            text: 'Assigns samples to a specific group, described in the Sample Group Description Box (sgpd).',
            ref: 'ISO/IEC 14496-12, 8.9.2',
        },
        'sbgp@grouping_type': {
            text: 'A code indicating the criterion used to group the samples (e.g., "rap " for random access points).',
            ref: 'ISO/IEC 14496-12, 8.9.2.3',
        },
        'sbgp@grouping_type_parameter': {
            text: 'A parameter providing additional information for the grouping (only in version 1).',
            ref: 'ISO/IEC 14496-12, 8.9.2.3',
        },
        'sbgp@entry_count': {
            text: 'The number of entries mapping sample runs to group descriptions.',
            ref: 'ISO/IEC 14496-12, 8.9.2.3',
        },
    };
    function Jt(e, t) {}
    function j(e, t) {
        let n = new g(e, t),
            i = [];
        for (; n.offset < e.size && !n.stopped; ) {
            let r = n.readUint32(`track_ID_${i.length + 1}`);
            if (r !== null) i.push(r);
            else break;
        }
        ((e.details.track_IDs = {
            value: i.join(', '),
            offset: e.offset + e.headerSize,
            length: e.size - e.headerSize,
        }),
            n.finalize());
    }
    var Zt = { hint: j, cdsc: j, font: j, hind: j, vdep: j, vplx: j, subt: j },
        en = {
            tref: {
                name: 'Track Reference',
                text: 'A container box that defines references from this track to other tracks in the presentation.',
                ref: 'ISO/IEC 14496-12, 8.3.3',
            },
            hint: {
                name: 'Hint Track Reference',
                text: 'Indicates that the referenced track(s) contain the original media for this hint track.',
                ref: 'ISO/IEC 14496-12, 8.3.3.3',
            },
            cdsc: {
                name: 'Content Description Reference',
                text: 'Indicates that this track describes the referenced track (e.g., a timed metadata track).',
                ref: 'ISO/IEC 14496-12, 8.3.3.3',
            },
            'hint@track_IDs': {
                text: 'A list of track IDs that this track references.',
                ref: 'ISO/IEC 14496-12, 8.3.3.2',
            },
        };
    function tn(e, t) {
        let n = new g(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        let r = n.readUint32('entry_count');
        if (r !== null && r > 0) {
            n.readUint32('entry_1_sample_delta');
            let o = n.readUint16('entry_1_subsample_count');
            o !== null &&
                o > 0 &&
                (i === 1
                    ? n.readUint32('subsample_1_size')
                    : n.readUint16('subsample_1_size'));
        }
        n.finalize();
    }
    var nn = {
        subs: {
            name: 'Sub-Sample Information',
            text: 'Defines the size of sub-samples, often used in CENC to separate clear vs. encrypted parts of a sample.',
            ref: 'ISO/IEC 14496-12, 8.7.7',
        },
        'subs@entry_count': {
            text: 'The number of samples that have sub-sample information.',
            ref: 'ISO/IEC 14496-12, 8.7.7.3',
        },
        'subs@entry_1_subsample_count': {
            text: 'The number of sub-samples in the first sample.',
            ref: 'ISO/IEC 14496-12, 8.7.7.3',
        },
        'subs@subsample_1_size': {
            text: 'The size in bytes of the first sub-sample.',
            ref: 'ISO/IEC 14496-12, 8.7.7.3',
        },
    };
    function rn(e, t) {
        let n = new g(e, t),
            { flags: i } = n.readVersionAndFlags();
        i !== null &&
            (i & 1) !== 0 &&
            (n.readUint32('aux_info_type'),
            n.readUint32('aux_info_type_parameter'));
        let r = n.readUint8('default_sample_info_size'),
            o = n.readUint32('sample_count');
        if (r === 0 && o !== null && o > 0) {
            for (let a = 0; a < o && !n.stopped; a++)
                a < 10
                    ? n.readUint8(`sample_info_size_${a + 1}`)
                    : (n.offset += 1);
            o > 10 &&
                (e.details['...more_entries'] = {
                    value: `${o - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        n.finalize();
    }
    var on = {
        saiz: {
            name: 'Sample Auxiliary Information Sizes',
            text: 'Provides the size of auxiliary information for each sample, used for CENC encryption parameters.',
            ref: 'ISO/IEC 14496-12, 8.7.8',
        },
        'saiz@default_sample_info_size': {
            text: 'Default size of the auxiliary info. If 0, sizes are in the table.',
            ref: 'ISO/IEC 14496-12, 8.7.8.3',
        },
        'saiz@sample_count': {
            text: 'The number of samples for which size information is provided.',
            ref: 'ISO/IEC 14496-12, 8.7.8.3',
        },
    };
    function sn(e, t) {
        let n = new g(e, t),
            { version: i, flags: r } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        (r & 1) !== 0 && n.skip(8, 'aux_info_type_and_param');
        let o = n.readUint32('entry_count');
        (o !== null &&
            o > 0 &&
            (i === 1 ? n.readBigUint64('offset_1') : n.readUint32('offset_1')),
            n.finalize());
    }
    var an = {
        saio: {
            name: 'Sample Auxiliary Information Offsets',
            text: 'Provides the location of auxiliary information for samples, such as CENC Initialization Vectors.',
            ref: 'ISO/IEC 14496-12, 8.7.9',
        },
        'saio@entry_count': {
            text: 'The number of offset entries.',
            ref: 'ISO/IEC 14496-12, 8.7.9.3',
        },
        'saio@offset_1': {
            text: 'The offset of the auxiliary information for the first chunk or run.',
            ref: 'ISO/IEC 14496-12, 8.7.9.3',
        },
    };
    function ln(e, t) {}
    var fn = {
        sinf: {
            name: 'Protection Scheme Information',
            text: 'A container for all information required to understand the encryption transform applied.',
            ref: 'ISO/IEC 14496-12, 8.12.1',
        },
    };
    function cn(e, t) {
        let n = new g(e, t);
        (n.readString(4, 'data_format'), n.finalize());
    }
    var dn = {
        frma: {
            name: 'Original Format Box',
            text: 'Stores the original, unencrypted four-character-code of the sample description.',
            ref: 'ISO/IEC 14496-12, 8.12.2',
        },
        'frma@data_format': {
            text: 'The original format of the sample entry (e.g., "avc1", "mp4a").',
            ref: 'ISO/IEC 14496-12, 8.12.2.3',
        },
    };
    function pn(e, t) {
        let n = new g(e, t);
        (n.readVersionAndFlags(), n.readString(4, 'scheme_type'));
        let i = n.readUint32('scheme_version_raw');
        (i !== null &&
            ((e.details.scheme_version = {
                value: `0x${i.toString(16)}`,
                offset: e.details.scheme_version_raw.offset,
                length: 4,
            }),
            delete e.details.scheme_version_raw),
            n.finalize());
    }
    var un = {
        schm: {
            name: 'Scheme Type Box',
            text: 'Identifies the protection scheme (e.g., "cenc" for Common Encryption).',
            ref: 'ISO/IEC 14496-12, 8.12.5',
        },
        'schm@scheme_type': {
            text: 'A four-character code identifying the protection scheme.',
            ref: 'ISO/IEC 14496-12, 8.12.5.3',
        },
        'schm@scheme_version': {
            text: 'The version of the scheme used to create the content.',
            ref: 'ISO/IEC 14496-12, 8.12.5.3',
        },
    };
    function mn(e, t) {}
    var gn = {
        schi: {
            name: 'Scheme Information Box',
            text: 'A container for boxes with scheme-specific data needed by the protection system.',
            ref: 'ISO/IEC 14496-12, 8.12.6',
        },
    };
    function hn(e, t) {
        let n = new g(e, t);
        n.readVersionAndFlags();
        let i = n.readUint32('entry_count');
        if (i !== null && i > 0) {
            let r = [];
            for (let l = 0; l < i && !n.stopped; l++)
                if (l < 10) {
                    let a = n.readUint32(`sample_number_entry_${l + 1}`);
                    a !== null &&
                        (r.push(a),
                        delete e.details[`sample_number_entry_${l + 1}`]);
                } else n.offset += 4;
            i > 0 &&
                (e.details.sample_numbers = {
                    value:
                        r.join(', ') +
                        (i > 10
                            ? `... (${i - 10} more entries not shown but parsed)`
                            : ''),
                    offset: e.offset + n.offset,
                    length: i * 4,
                });
        }
        n.finalize();
    }
    var _n = {
        stss: {
            name: 'Sync Sample Box',
            text: 'Provides a compact list of the sync samples (keyframes/random access points) in the track.',
            ref: 'ISO/IEC 14496-12, 8.6.2',
        },
        'stss@entry_count': {
            text: 'The number of sync samples in this track.',
            ref: 'ISO/IEC 14496-12, 8.6.2.3',
        },
        'stss@sample_numbers': {
            text: 'The sample numbers of the sync samples, in increasing order.',
            ref: 'ISO/IEC 14496-12, 8.6.2.3',
        },
    };
    function xn(e, t) {
        let n = new g(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        let r = n.readString(4, 'grouping_type'),
            o = 0;
        (i === 1 && (o = n.readUint32('default_length')),
            i >= 2 && n.readUint32('default_sample_description_index'));
        let l = n.readUint32('entry_count');
        if (l !== null)
            for (let a = 0; a < l && !n.stopped; a++) {
                let s = o;
                if (i === 1 && o === 0) {
                    let d = n.readUint32(`entry_${a + 1}_description_length`);
                    if (d === null) break;
                    s = d;
                }
                let c = `entry_${a + 1}`,
                    f = n.offset;
                switch (r) {
                    case 'roll':
                        (n.readInt16(`${c}_roll_distance`), i === 0 && (s = 2));
                        break;
                    default:
                        i === 0 &&
                            (n.addIssue(
                                'warn',
                                `Cannot determine entry size for unknown grouping_type '${r}' with version 0. Parsing of this box may be incomplete.`
                            ),
                            n.readRemainingBytes('unparsed_sgpd_entries'),
                            (a = l));
                        break;
                }
                s > 0 && n.offset === f && n.skip(s, `${c}_description_data`);
            }
        n.finalize();
    }
    var yn = {
        sgpd: {
            name: 'Sample Group Description',
            text: 'Contains a sample group entry for each sample group, describing its properties.',
            ref: 'ISO/IEC 14496-12, 8.9.3',
        },
        'sgpd@grouping_type': {
            text: 'The type of grouping that these descriptions apply to. Must match the type in the `sbgp` box.',
            ref: 'ISO/IEC 14496-12, 8.9.3.3',
        },
        'sgpd@entry_count': {
            text: 'The number of sample group description entries that follow.',
            ref: 'ISO/IEC 14496-12, 8.9.3.3',
        },
        'sgpd@entry_1_roll_distance': {
            text: 'For "roll" groups, a signed integer indicating the number of samples (before or after) needed for a clean random access point.',
            ref: 'ISO/IEC 14496-12, 10.1.1.3',
        },
    };
    function Sn(e, t) {
        let n = new g(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        (i === 1
            ? n.readBigUint64('fragment_duration')
            : n.readUint32('fragment_duration'),
            n.finalize());
    }
    var bn = {
        mehd: {
            name: 'Movie Extends Header',
            text: 'Provides the overall duration of a fragmented movie, including all fragments.',
            ref: 'ISO/IEC 14496-12, 8.8.2',
        },
        'mehd@fragment_duration': {
            text: "The total duration of the movie in the movie's timescale, including all movie fragments.",
            ref: 'ISO/IEC 14496-12, 8.8.2.3',
        },
    };
    function vn(e, t) {
        let n = new g(e, t);
        n.readVersionAndFlags();
        let i = e.size - n.offset;
        if (
            ((e.details.sample_count = { value: i, offset: 0, length: 0 }),
            i > 0)
        ) {
            for (let o = 0; o < i && !n.stopped; o++) {
                let l = `sample_${o + 1}`;
                if (o < 10) {
                    let a = n.readUint8(`${l}_flags_byte`);
                    if (a === null) break;
                    (delete e.details[`${l}_flags_byte`],
                        (e.details[`${l}_is_leading`] = {
                            value: (a >> 6) & 3,
                            offset: e.offset + n.offset - 1,
                            length: 0.25,
                        }),
                        (e.details[`${l}_sample_depends_on`] = {
                            value: (a >> 4) & 3,
                            offset: e.offset + n.offset - 1,
                            length: 0.25,
                        }),
                        (e.details[`${l}_sample_is_depended_on`] = {
                            value: (a >> 2) & 3,
                            offset: e.offset + n.offset - 1,
                            length: 0.25,
                        }),
                        (e.details[`${l}_sample_has_redundancy`] = {
                            value: a & 3,
                            offset: e.offset + n.offset - 1,
                            length: 0.25,
                        }));
                } else n.offset += 1;
            }
            i > 10 &&
                (e.details['...more_entries'] = {
                    value: `${i - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        n.finalize();
    }
    var Cn = {
        sdtp: {
            name: 'Independent and Disposable Samples',
            text: 'Provides detailed dependency information for each sample in the track.',
            ref: 'ISO/IEC 14496-12, 8.6.4',
        },
        'sdtp@sample_1_is_leading': {
            text: 'Leading nature of the sample (0:unknown, 1:leading with dependency, 2:not leading, 3:leading without dependency).',
            ref: 'ISO/IEC 14496-12, 8.6.4.3',
        },
        'sdtp@sample_1_sample_depends_on': {
            text: 'Sample dependency (0:unknown, 1:depends on others (not I-frame), 2:does not depend on others (I-frame)).',
            ref: 'ISO/IEC 14496-12, 8.6.4.3',
        },
        'sdtp@sample_1_sample_is_depended_on': {
            text: 'Whether other samples depend on this one (0:unknown, 1:others may depend, 2:disposable).',
            ref: 'ISO/IEC 14496-12, 8.6.4.3',
        },
        'sdtp@sample_1_sample_has_redundancy': {
            text: 'Redundant coding (0:unknown, 1:has redundant coding, 2:no redundant coding).',
            ref: 'ISO/IEC 14496-12, 8.6.4.3',
        },
    };
    function In(e, t) {}
    var Tn = {
        mfra: {
            name: 'Movie Fragment Random Access',
            text: 'A container for random access information for movie fragments, often found at the end of the file.',
            ref: 'ISO/IEC 14496-12, 8.8.9',
        },
    };
    function En(e, t) {
        let n = new g(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        n.readUint32('track_ID');
        let r = n.readUint32('length_sizes_raw');
        if (r !== null) {
            let o = ((r >> 4) & 3) + 1,
                l = ((r >> 2) & 3) + 1,
                a = (r & 3) + 1;
            ((e.details.length_sizes = {
                value: `traf=${o}, trun=${l}, sample=${a}`,
                offset: e.details.length_sizes_raw.offset,
                length: 4,
            }),
                delete e.details.length_sizes_raw);
            let s = n.readUint32('number_of_entries');
            s !== null &&
                s > 0 &&
                (i === 1
                    ? (n.readBigUint64('entry_1_time'),
                      n.readBigUint64('entry_1_moof_offset'))
                    : (n.readUint32('entry_1_time'),
                      n.readUint32('entry_1_moof_offset')),
                n.skip(o, 'entry_1_traf_number'),
                n.skip(l, 'entry_1_trun_number'),
                n.skip(a, 'entry_1_sample_number'));
        }
        n.finalize();
    }
    var Pn = {
        tfra: {
            name: 'Track Fragment Random Access',
            text: 'Contains a table mapping sync sample times to their `moof` box locations for a single track.',
            ref: 'ISO/IEC 14496-12, 8.8.10',
        },
        'tfra@track_ID': {
            text: 'The ID of the track this table refers to.',
            ref: 'ISO/IEC 14496-12, 8.8.10.3',
        },
        'tfra@number_of_entries': {
            text: 'The number of random access entries in the table.',
            ref: 'ISO/IEC 14496-12, 8.8.10.3',
        },
        'tfra@entry_1_time': {
            text: 'The presentation time of the sync sample in the first entry.',
            ref: 'ISO/IEC 14496-12, 8.8.10.3',
        },
        'tfra@entry_1_moof_offset': {
            text: 'The file offset of the `moof` box containing the sync sample for the first entry.',
            ref: 'ISO/IEC 14496-12, 8.8.10.3',
        },
    };
    function An(e, t) {
        let n = new g(e, t);
        (n.readVersionAndFlags(), n.readUint32('size'), n.finalize());
    }
    var Un = {
        mfro: {
            name: 'Movie Fragment Random Access Offset',
            text: 'Contains the size of the enclosing `mfra` box to aid in locating it by scanning from the end of the file.',
            ref: 'ISO/IEC 14496-12, 8.8.11',
        },
        'mfro@size': {
            text: 'The size of the `mfra` box in bytes.',
            ref: 'ISO/IEC 14496-12, 8.8.11.3',
        },
    };
    function Dn(e, t) {
        let n = new g(e, t);
        n.readVersionAndFlags();
        let i = 1;
        for (; n.offset < e.size && !n.stopped; ) {
            if (i > 5) {
                e.details['...more_entries'] = {
                    value: 'More entries not shown.',
                    offset: 0,
                    length: 0,
                };
                break;
            }
            let r = `entry_${i}`;
            (n.readUint32(`${r}_rate`),
                n.readUint32(`${r}_initial_delay`),
                i++);
        }
        n.finalize();
    }
    var kn = {
        pdin: {
            name: 'Progressive Download Info',
            text: 'Contains pairs of download rates and suggested initial playback delays to aid progressive downloading.',
            ref: 'ISO/IEC 14496-12, 8.1.3',
        },
        'pdin@entry_1_rate': {
            text: 'The download rate in bytes/second for the first entry.',
            ref: 'ISO/IEC 14496-12, 8.1.3.3',
        },
        'pdin@entry_1_initial_delay': {
            text: 'The suggested initial playback delay in milliseconds for the first entry.',
            ref: 'ISO/IEC 14496-12, 8.1.3.3',
        },
    };
    function Mn(e, t) {
        let n = new g(e, t);
        n.readVersionAndFlags();
        let i = n.readUint16('language_bits');
        if (i !== null) {
            let r = String.fromCharCode(
                ((i >> 10) & 31) + 96,
                ((i >> 5) & 31) + 96,
                (i & 31) + 96
            );
            ((e.details.language = {
                value: r,
                offset: e.details.language_bits.offset,
                length: 2,
            }),
                delete e.details.language_bits);
        }
        (n.readNullTerminatedString('notice'), n.finalize());
    }
    var wn = {
        cprt: {
            name: 'Copyright Box',
            text: 'Contains a copyright declaration for the track or presentation.',
            ref: 'ISO/IEC 14496-12, 8.10.2',
        },
        'cprt@language': {
            text: 'The ISO-639-2/T language code for the notice text.',
            ref: 'ISO/IEC 14496-12, 8.10.2.3',
        },
        'cprt@notice': {
            text: 'The copyright notice text.',
            ref: 'ISO/IEC 14496-12, 8.10.2.3',
        },
    };
    function Ln(e, t) {
        let n = new g(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        (i === 1
            ? (n.readBigUint64('compositionToDTSShift'),
              n.readBigUint64('leastDecodeToDisplayDelta'),
              n.readBigUint64('greatestDecodeToDisplayDelta'),
              n.readBigUint64('compositionStartTime'),
              n.readBigUint64('compositionEndTime'))
            : (n.readUint32('compositionToDTSShift'),
              n.readUint32('leastDecodeToDisplayDelta'),
              n.readUint32('greatestDecodeToDisplayDelta'),
              n.readUint32('compositionStartTime'),
              n.readUint32('compositionEndTime')),
            n.finalize());
    }
    var Bn = {
        cslg: {
            name: 'Composition to Decode',
            text: 'Provides a mapping from the composition timeline to the decoding timeline.',
            ref: 'ISO/IEC 14496-12, 8.6.1.4',
        },
        'cslg@compositionToDTSShift': {
            text: 'A shift value that, when added to composition times, guarantees CTS >= DTS.',
            ref: 'ISO/IEC 14496-12, 8.6.1.4.3',
        },
        'cslg@leastDecodeToDisplayDelta': {
            text: 'The smallest composition time offset found in the track.',
            ref: 'ISO/IEC 14496-12, 8.6.1.4.3',
        },
    };
    function Rn(e, t) {
        let n = new g(e, t);
        n.readVersionAndFlags();
        let i = (e.size - n.offset) / 2;
        if (
            ((e.details.sample_count = { value: i, offset: 0, length: 0 }),
            i > 0)
        ) {
            for (let o = 0; o < i && !n.stopped; o++)
                o < 10 ? n.readUint16(`priority_${o + 1}`) : (n.offset += 2);
            i > 10 &&
                (e.details['...more_entries'] = {
                    value: `${i - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        n.finalize();
    }
    var zn = {
        stdp: {
            name: 'Degradation Priority',
            text: 'Contains the degradation priority for each sample in the track.',
            ref: 'ISO/IEC 14496-12, 8.5.3',
        },
        'stdp@priority_1': {
            text: 'The priority for the first sample. Lower values are typically more important.',
            ref: 'ISO/IEC 14496-12, 8.5.3.3',
        },
    };
    function Nn(e, t) {
        let n = new g(e, t),
            { flags: i } = n.readVersionAndFlags();
        (i !== null && (i & 1) === 0 && n.readNullTerminatedString('location'),
            n.finalize());
    }
    function Fn(e, t) {
        let n = new g(e, t);
        (n.readVersionAndFlags(),
            n.readNullTerminatedString('name'),
            n.readNullTerminatedString('location'),
            n.finalize());
    }
    var Vn = {
        dref: {
            name: 'Data Reference Box',
            text: 'A container for data references (e.g., URLs) that declare the location of media data.',
            ref: 'ISO/IEC 14496-12, 8.7.2',
        },
        'url ': {
            name: 'Data Entry URL Box',
            text: 'An entry in the Data Reference Box containing a URL.',
            ref: 'ISO/IEC 14496-12, 8.7.2.1',
        },
        'url @location': {
            text: 'The URL where the media data is located. If the "self-contained" flag is set, this field is absent.',
            ref: 'ISO/IEC 14496-12, 8.7.2.3',
        },
        'urn ': {
            name: 'Data Entry URN Box',
            text: 'An entry in the Data Reference Box containing a URN.',
            ref: 'ISO/IEC 14496-12, 8.7.2.1',
        },
    };
    function $n(e, t) {
        let n = new g(e, t);
        (n.skip(6, 'reserved_sample_entry'),
            n.readUint16('data_reference_index'),
            n.skip(2, 'pre_defined_1'),
            n.skip(2, 'reserved_2'),
            n.skip(12, 'pre_defined_2'),
            n.readUint16('width'),
            n.readUint16('height'));
        let i = n.readUint32('horizresolution_fixed_point');
        i !== null &&
            ((e.details.horizresolution = {
                ...e.details.horizresolution_fixed_point,
                value: (i / 65536).toFixed(2) + ' dpi',
            }),
            delete e.details.horizresolution_fixed_point);
        let r = n.readUint32('vertresolution_fixed_point');
        (r !== null &&
            ((e.details.vertresolution = {
                ...e.details.vertresolution_fixed_point,
                value: (r / 65536).toFixed(2) + ' dpi',
            }),
            delete e.details.vertresolution_fixed_point),
            n.readUint32('reserved_3'),
            n.readUint16('frame_count'));
        let o = n.offset;
        if (n.checkBounds(32)) {
            let l = n.view.getUint8(n.offset),
                a = new Uint8Array(
                    n.view.buffer,
                    n.view.byteOffset + n.offset + 1,
                    l
                ),
                s = new TextDecoder().decode(a);
            ((e.details.compressorname = {
                value: s,
                offset: n.box.offset + o,
                length: 32,
            }),
                (n.offset += 32));
        }
        (n.readUint16('depth'), n.readInt16('pre_defined_3'));
    }
    var Hn = {
        avc1: {
            name: 'AVC Sample Entry',
            text: 'Defines the coding type and initialization information for an H.264/AVC video track.',
            ref: 'ISO/IEC 14496-12, 12.1.3',
        },
        'avc1@data_reference_index': {
            text: 'Index to the Data Reference Box, indicating where the media data is stored.',
            ref: 'ISO/IEC 14496-12, 8.5.2.2',
        },
        'avc1@width': {
            text: 'The width of the video in pixels.',
            ref: 'ISO/IEC 14496-12, 12.1.3.2',
        },
        'avc1@height': {
            text: 'The height of the video in pixels.',
            ref: 'ISO/IEC 14496-12, 12.1.3.2',
        },
        'avc1@horizresolution': {
            text: 'Horizontal resolution of the image in pixels-per-inch (16.16 fixed point). Default is 72 dpi.',
            ref: 'ISO/IEC 14496-12, 12.1.3.2',
        },
        'avc1@vertresolution': {
            text: 'Vertical resolution of the image in pixels-per-inch (16.16 fixed point). Default is 72 dpi.',
            ref: 'ISO/IEC 14496-12, 12.1.3.2',
        },
        'avc1@frame_count': {
            text: 'The number of frames of compressed video stored in each sample. Typically 1.',
            ref: 'ISO/IEC 14496-12, 12.1.3.2',
        },
        'avc1@compressorname': {
            text: 'An informative name for the compressor used. A Pascal-style string within a 32-byte field.',
            ref: 'ISO/IEC 14496-12, 12.1.3.2',
        },
        'avc1@depth': {
            text: 'The color depth of the video. 0x0018 (24) is typical for color with no alpha.',
            ref: 'ISO/IEC 14496-12, 12.1.3.2',
        },
    };
    function On(e, t) {
        let n = new g(e, t);
        (n.skip(6, 'reserved_sample_entry'),
            n.readUint16('data_reference_index'),
            n.skip(8, 'reserved_audio_entry_1'),
            n.readUint16('channelcount'),
            n.readUint16('samplesize'),
            n.skip(2, 'pre_defined'),
            n.skip(2, 'reserved_audio_entry_2'));
        let i = n.readUint32('samplerate_fixed_point');
        i !== null &&
            ((e.details.samplerate = {
                ...e.details.samplerate_fixed_point,
                value: i >> 16,
            }),
            delete e.details.samplerate_fixed_point);
    }
    var Xn = {
        mp4a: {
            name: 'MP4 Audio Sample Entry',
            text: 'Defines the coding type and initialization information for an MPEG-4 audio track, typically AAC.',
            ref: 'ISO/IEC 14496-12, 12.2.3',
        },
        'mp4a@data_reference_index': {
            text: 'Index to the Data Reference Box, indicating where the media data is stored.',
            ref: 'ISO/IEC 14496-12, 8.5.2.2',
        },
        'mp4a@channelcount': {
            text: 'The number of audio channels (e.g., 2 for stereo).',
            ref: 'ISO/IEC 14496-12, 12.2.3.2',
        },
        'mp4a@samplesize': {
            text: 'The size of each audio sample in bits. Typically 16.',
            ref: 'ISO/IEC 14496-12, 12.2.3.2',
        },
        'mp4a@samplerate': {
            text: 'The sampling rate of the audio in samples per second (the integer part of a 16.16 fixed-point number).',
            ref: 'ISO/IEC 14496-12, 12.2.3.2',
        },
    };
    function Gn(e, t) {
        let n = new g(e, t);
        (n.readUint32('bufferSizeDB'),
            n.readUint32('maxBitrate'),
            n.readUint32('avgBitrate'),
            n.finalize());
    }
    var jn = {
        btrt: {
            name: 'Bit Rate Box',
            text: 'Provides bitrate information for the stream, found within a Sample Entry.',
            ref: 'ISO/IEC 14496-12, 8.5.2.2',
        },
        'btrt@bufferSizeDB': {
            text: 'The size of the decoding buffer for the elementary stream in bytes.',
            ref: 'ISO/IEC 14496-12, 8.5.2.2',
        },
        'btrt@maxBitrate': {
            text: 'The maximum rate in bits/second over any one-second window.',
            ref: 'ISO/IEC 14496-12, 8.5.2.2',
        },
        'btrt@avgBitrate': {
            text: 'The average rate in bits/second over the entire presentation.',
            ref: 'ISO/IEC 14496-12, 8.5.2.2',
        },
    };
    function Pe(e, t) {
        let n = new g(e, t);
        (n.readRemainingBytes('data'), n.finalize());
    }
    var Wn = {
        free: {
            name: 'Free Space Box',
            text: 'The contents of this box are irrelevant and may be ignored. It is used to reserve space.',
            ref: 'ISO/IEC 14496-12, 8.1.2',
        },
        skip: {
            name: 'Skip Box',
            text: 'An alternative type for a free space box. The contents are irrelevant.',
            ref: 'ISO/IEC 14496-12, 8.1.2',
        },
    };
    function ls(e, t) {
        let n = e.offset,
            i = 0,
            r,
            o = 0;
        do {
            if (((r = e.readUint8(`size_byte_${o}`)), r === null)) return null;
            ((i = (i << 7) | (r & 127)), o++);
        } while (r & 128 && o < 4);
        e.box.details[t] = { value: i, offset: e.box.offset + n, length: o };
        for (let l = 0; l < o; l++) delete e.box.details[`size_byte_${l}`];
        return i;
    }
    function qn(e, t) {
        let n = new g(e, t);
        n.readVersionAndFlags();
        let i = n.readUint8('InitialObjectDescriptor_tag');
        if (i !== 2 && i !== 3) {
            (n.addIssue(
                'warn',
                `Expected InitialObjectDescriptor tag (0x02) or ES_Descriptor tag (0x03), but found ${i}.`
            ),
                n.readRemainingBytes('unknown_descriptor_data'),
                n.finalize());
            return;
        }
        if (ls(n, 'InitialObjectDescriptor_size') === null) {
            n.finalize();
            return;
        }
        let o = n.readUint16('objectDescriptorID'),
            l = n.readUint8('ODProfileLevelIndication'),
            a = n.readUint8('sceneProfileLevelIndication'),
            s = n.readUint8('audioProfileLevelIndication'),
            c = n.readUint8('visualProfileLevelIndication'),
            f = n.readUint8('graphicsProfileLevelIndication');
        (n.readRemainingBytes('other_descriptors_data'), n.finalize());
    }
    var Yn = {
        iods: {
            name: 'Initial Object Descriptor',
            text: 'Contains the Initial Object Descriptor as defined in MPEG-4 Systems (ISO/IEC 14496-1). This descriptor is a container for the elementary stream descriptors and other information.',
            ref: 'ISO/IEC 14496-14, 5.5',
        },
        'iods@objectDescriptorID': {
            text: 'A 10-bit ID for this Object Descriptor. The top 6 bits are flags.',
            ref: 'ISO/IEC 14496-1, 8.2.2',
        },
        'iods@ODProfileLevelIndication': {
            text: 'Indicates the profile and level of the Object Descriptor stream.',
            ref: 'ISO/IEC 14496-1, 8.2.2',
        },
    };
    function Kn(e, t) {
        let n = new g(e, t);
        (n.readVersionAndFlags(), n.readUint32('track_id'));
    }
    var Qn = {
        trep: {
            name: 'Track Extension Properties',
            text: 'A container box that documents characteristics of the track in subsequent movie fragments.',
            ref: 'ISO/IEC 14496-12, 8.8.15',
        },
        'trep@track_id': {
            text: 'The ID of the track for which these extension properties are provided.',
            ref: 'ISO/IEC 14496-12, 8.8.15.3',
        },
    };
    function Jn(e, t) {
        let n = new g(e, t);
        (n.readUint32('hSpacing'), n.readUint32('vSpacing'), n.finalize());
    }
    var Zn = {
        pasp: {
            name: 'Pixel Aspect Ratio Box',
            text: 'Specifies the pixel aspect ratio of the video.',
            ref: 'ISO/IEC 14496-12, 12.1.4',
        },
        'pasp@hSpacing': {
            text: 'The horizontal spacing of a pixel.',
            ref: 'ISO/IEC 14496-12, 12.1.4.1',
        },
        'pasp@vSpacing': {
            text: 'The vertical spacing of a pixel.',
            ref: 'ISO/IEC 14496-12, 12.1.4.1',
        },
    };
    function ei(e, t) {
        let n = new g(e, t),
            i = n.readString(4, 'colour_type');
        if (i === 'nclx') {
            (n.readUint16('colour_primaries'),
                n.readUint16('transfer_characteristics'),
                n.readUint16('matrix_coefficients'));
            let r = n.readUint8('full_range_flag_byte');
            r !== null &&
                (delete e.details.full_range_flag_byte,
                (e.details.full_range_flag = {
                    value: (r >> 7) & 1,
                    offset: n.box.offset + n.offset - 1,
                    length: 0.125,
                }));
        } else
            (i === 'rICC' || i === 'prof') &&
                n.readRemainingBytes('ICC_profile');
        n.finalize();
    }
    var ti = {
        colr: {
            name: 'Colour Information Box',
            text: 'Provides information about the colour representation of the video, such as primaries and transfer characteristics.',
            ref: 'ISO/IEC 14496-12, 12.1.5',
        },
        'colr@colour_type': {
            text: 'The type of color information provided (e.g., "nclx", "rICC", "prof").',
            ref: 'ISO/IEC 14496-12, 12.1.5.3',
        },
    };
    function ni(e, t) {
        new g(e, t).readVersionAndFlags();
    }
    var ii = {
        meta: {
            name: 'Metadata Box',
            text: 'A container for descriptive or annotative metadata.',
            ref: 'ISO/IEC 14496-12, 8.11.1',
        },
    };
    function ri(e, t) {
        let n = new g(e, t);
        (n.skip(6, 'reserved_sample_entry'),
            n.readUint16('data_reference_index'),
            n.skip(16, 'pre_defined_and_reserved'),
            n.readUint16('width'),
            n.readUint16('height'),
            n.readUint32('horizresolution'),
            n.readUint32('vertresolution'),
            n.readUint32('reserved_3'),
            n.readUint16('frame_count'),
            n.skip(32, 'compressorname'),
            n.readUint16('depth'),
            n.readInt16('pre_defined_3'));
    }
    var oi = {
        encv: {
            name: 'Encrypted Video Sample Entry',
            text: 'A sample entry wrapper indicating that the video stream is encrypted. It contains a Protection Scheme Information (`sinf`) box.',
            ref: 'ISO/IEC 14496-12, 8.12',
        },
    };
    function si(e, t) {
        let n = new g(e, t),
            { flags: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        let r = n.readUint32('sample_count');
        if (((e.samples = []), r !== null))
            for (let l = 0; l < r && !n.stopped; l++) {
                let a = { iv: null, subsamples: [] };
                if (n.checkBounds(8)) {
                    let s = new Uint8Array(
                        n.view.buffer,
                        n.view.byteOffset + n.offset,
                        8
                    );
                    ((a.iv = s), (n.offset += 8));
                } else break;
                if ((i & 2) !== 0 && n.checkBounds(2)) {
                    let s = n.view.getUint16(n.offset);
                    ((a.subsample_count = s), (n.offset += 2));
                    for (let c = 0; c < s; c++)
                        if (n.checkBounds(6)) {
                            let f = n.view.getUint16(n.offset),
                                d = n.view.getUint32(n.offset + 2);
                            (a.subsamples.push({
                                BytesOfClearData: f,
                                BytesOfProtectedData: d,
                            }),
                                (n.offset += 6));
                        } else {
                            n.stopped = !0;
                            break;
                        }
                }
                e.samples.push(a);
            }
        n.finalize();
    }
    var ai = {
        senc: {
            name: 'Sample Encryption Box',
            text: 'Contains sample-specific encryption information, such as Initialization Vectors (IVs) and sub-sample encryption data for Common Encryption (CENC).',
            ref: 'ISO/IEC 23001-7, 7.1',
        },
        'senc@sample_count': {
            text: 'The number of samples described in this box.',
            ref: 'ISO/IEC 23001-7, 7.1',
        },
        'senc@sample_1_iv': {
            text: "The Initialization Vector for the first sample. Its size is defined in the 'tenc' box (typically 8 or 16 bytes).",
            ref: 'ISO/IEC 23001-7, 7.2',
        },
        'senc@sample_1_subsample_count': {
            text: 'The number of subsamples (clear/encrypted pairs) in the first sample.',
            ref: 'ISO/IEC 23001-7, 7.1',
        },
        'senc@sample_1_subsample_1_clear_bytes': {
            text: 'The number of unencrypted bytes in the first subsample.',
            ref: 'ISO/IEC 23001-7, 7.1',
        },
        'senc@sample_1_subsample_1_encrypted_bytes': {
            text: 'The number of encrypted bytes in the first subsample.',
            ref: 'ISO/IEC 23001-7, 7.1',
        },
    };
    function li(e, t) {
        let n = new g(e, t);
        (n.skip(6, 'reserved_sample_entry'),
            n.readUint16('data_reference_index'),
            n.skip(8, 'reserved_audio_entry_1'),
            n.readUint16('channelcount'),
            n.readUint16('samplesize'),
            n.skip(2, 'pre_defined'),
            n.skip(2, 'reserved_audio_entry_2'));
        let i = n.readUint32('samplerate_fixed_point');
        i !== null &&
            ((e.details.samplerate = {
                ...e.details.samplerate_fixed_point,
                value: i >> 16,
            }),
            delete e.details.samplerate_fixed_point);
    }
    var fi = {
        enca: {
            name: 'Encrypted Audio Sample Entry',
            text: 'A sample entry wrapper indicating that the audio stream is encrypted. It contains a Protection Scheme Information (`sinf`) box.',
            ref: 'ISO/IEC 14496-12, 8.12',
        },
    };
    function ci(e, t) {
        let n = new g(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        if (i === 0) {
            n.skip(2, 'reserved_1');
            let r = n.readUint8('default_isProtected'),
                o = n.readUint8('default_Per_Sample_IV_Size'),
                l = [];
            for (let s = 0; s < 16; s++) {
                let c = n.readUint8(`kid_byte_${s}`);
                if (c !== null) l.push(c.toString(16).padStart(2, '0'));
                else {
                    n.finalize();
                    return;
                }
            }
            let a = e.details.kid_byte_0?.offset;
            if (a !== void 0) {
                e.details.default_KID = {
                    value: l.join(''),
                    offset: a,
                    length: 16,
                };
                for (let s = 0; s < 16; s++) delete e.details[`kid_byte_${s}`];
            }
            if (r === 1 && o === 0) {
                let s = n.readUint8('default_constant_IV_size');
                s !== null && n.skip(s, 'default_constant_IV');
            }
        } else if (i === 1) {
            n.skip(2, 'reserved_1');
            let r = n.readUint8('packed_fields_1');
            (r !== null &&
                (delete e.details.packed_fields_1,
                (e.details.default_crypt_byte_block = {
                    value: (r >> 4) & 15,
                    offset: n.box.offset + n.offset - 1,
                    length: 0.5,
                }),
                (e.details.default_skip_byte_block = {
                    value: r & 15,
                    offset: n.box.offset + n.offset - 1,
                    length: 0.5,
                })),
                n.readUint8('default_isProtected'),
                n.readUint8('default_Per_Sample_IV_Size'));
            let o = [];
            for (let a = 0; a < 16; a++) {
                let s = n.readUint8(`kid_byte_${a}`);
                if (s !== null) o.push(s.toString(16).padStart(2, '0'));
                else {
                    n.finalize();
                    return;
                }
            }
            let l = e.details.kid_byte_0?.offset;
            if (l !== void 0) {
                e.details.default_KID = {
                    value: o.join(''),
                    offset: l,
                    length: 16,
                };
                for (let a = 0; a < 16; a++) delete e.details[`kid_byte_${a}`];
            }
        } else
            (n.addIssue('warn', `Unsupported tenc version ${i}.`),
                n.readRemainingBytes('unsupported_tenc_data'));
        n.finalize();
    }
    var di = {
        tenc: {
            name: 'Track Encryption Box',
            text: 'Contains default encryption parameters for samples in a track, as defined by the Common Encryption (CENC) specification.',
            ref: 'ISO/IEC 23001-7, 8.1',
        },
        'tenc@default_isProtected': {
            text: 'Indicates if samples are encrypted by default (1) or not (0).',
            ref: 'ISO/IEC 23001-7, 8.1',
        },
        'tenc@default_Per_Sample_IV_Size': {
            text: 'The size in bytes of the Initialization Vector (IV) for each sample. If 0, a constant IV is used.',
            ref: 'ISO/IEC 23001-7, 8.1',
        },
        'tenc@default_KID': {
            text: 'The default Key ID for the samples in this track.',
            ref: 'ISO/IEC 23001-7, 8.1',
        },
        'tenc@default_crypt_byte_block': {
            text: '(Version 1) The number of encrypted blocks in a pattern.',
            ref: 'ISO/IEC 23001-7 (First Edition)',
        },
        'tenc@default_skip_byte_block': {
            text: '(Version 1) The number of clear blocks in a pattern.',
            ref: 'ISO/IEC 23001-7 (First Edition)',
        },
    };
    function pi(e, t) {
        let n = new g(e, t);
        (n.readVersionAndFlags(),
            n.readRemainingBytes('id3v2_data'),
            n.finalize());
    }
    var ui = {
        ID32: {
            name: 'ID3v2 Metadata Box',
            text: 'A box containing ID3 version 2 metadata tags. This is a common but non-standard box often found in files created by tools like FFmpeg, typically within a `udta` or `meta` box.',
            ref: 'User-defined',
        },
    };
    function mi(e, t) {
        let n = new g(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        (i === 1
            ? (n.readUint32('timescale'), n.readBigUint64('presentation_time'))
            : (n.readUint32('timescale'),
              n.readUint32('presentation_time_delta')),
            n.readUint32('event_duration'),
            n.readUint32('id'),
            n.readNullTerminatedString('scheme_id_uri'),
            n.readNullTerminatedString('value'));
        let r = e.size - n.offset;
        (r > 0 && n.skip(r, 'message_data'), n.finalize());
    }
    var gi = {
        emsg: {
            name: 'Event Message Box',
            text: 'Contains an event message for in-band signaling, such as SCTE-35 ad markers.',
            ref: 'ISO/IEC 23009-1, Clause 5.10.3.3',
        },
        'emsg@version': {
            text: 'Version of this box (0 or 1). Version 1 uses a 64-bit absolute presentation_time.',
            ref: 'ISO/IEC 23009-1, Clause 5.10.3.3.2',
        },
        'emsg@presentation_time': {
            text: '(Version 1) The absolute presentation time of the event on the media timeline, in timescale units.',
            ref: 'ISO/IEC 23009-1, Clause 5.10.3.3.2',
        },
        'emsg@presentation_time_delta': {
            text: '(Version 0) The presentation time delta of the event relative to the earliest presentation time in the segment.',
            ref: 'ISO/IEC 23009-1, Clause 5.10.3.3.2',
        },
        'emsg@timescale': {
            text: 'The timescale for this event, in ticks per second.',
            ref: 'ISO/IEC 23009-1, Clause 5.10.3.3.2',
        },
        'emsg@event_duration': {
            text: 'The duration of the event in timescale units.',
            ref: 'ISO/IEC 23009-1, Clause 5.10.3.3.2',
        },
        'emsg@id': {
            text: 'A unique identifier for this event instance.',
            ref: 'ISO/IEC 23009-1, Clause 5.10.3.3.2',
        },
        'emsg@scheme_id_uri': {
            text: 'A URI identifying the scheme of the event message (e.g., "urn:scte:scte35:2014:xml+bin").',
            ref: 'ISO/IEC 23009-1, Clause 5.10.3.3.2',
        },
        'emsg@value': {
            text: 'A value that distinguishes this event stream from others with the same scheme.',
            ref: 'ISO/IEC 23009-1, Clause 5.10.3.3.2',
        },
        'emsg@message_data': {
            text: 'The payload of the event message, with syntax defined by the scheme.',
            ref: 'ISO/IEC 23009-1, Clause 5.10.3.3.2',
        },
    };
    function fs(e, t) {
        let n = new g(e, t);
        (n.readNullTerminatedString('content_type'),
            n.offset < e.size && n.readNullTerminatedString('content_encoding'),
            n.finalize());
    }
    function cs(e, t) {
        let n = new g(e, t);
        (n.skip(6, 'reserved_sample_entry'),
            n.readUint16('data_reference_index'),
            n.readNullTerminatedString('namespace'),
            n.readNullTerminatedString('schema_location'),
            n.readNullTerminatedString('auxiliary_mime_types'));
    }
    var hi = { stpp: cs, mime: fs },
        _i = {
            stpp: {
                name: 'XML Subtitle Sample Entry',
                text: 'Defines the coding for an XML-based subtitle track, such as TTML/IMSC1.',
                ref: 'ISO/IEC 14496-12, 12.4.3',
            },
            'stpp@namespace': {
                text: 'A URI defining the namespace of the XML schema for the subtitle format.',
                ref: 'ISO/IEC 14496-12, 12.4.3.2',
            },
            'stpp@schema_location': {
                text: 'The location of the schema for the namespace.',
                ref: 'ISO/IEC 14496-12, 12.4.3.2',
            },
            'stpp@auxiliary_mime_types': {
                text: 'A list of MIME types for auxiliary data (e.g., images) referenced by the XML.',
                ref: 'ISO/IEC 14496-12, 12.4.3.2',
            },
            mime: {
                name: 'MIME Type Box',
                text: 'Stores the MIME type of the subtitle document, including any codecs parameters.',
                ref: 'ISO/IEC 14496-30',
            },
            'mime@content_type': {
                text: 'The MIME type string, e.g., "application/ttml+xml;codecs=im1t".',
                ref: 'ISO/IEC 14496-30',
            },
        };
    var xi = {
            ftyp: Te,
            styp: Te,
            mvhd: nt,
            mfhd: rt,
            tfhd: st,
            tfdt: lt,
            trun: ct,
            sidx: pt,
            tkhd: mt,
            mdhd: ht,
            hdlr: xt,
            vmhd: St,
            smhd: Ht,
            stsd: vt,
            stts: It,
            ctts: jt,
            stsc: Et,
            stsz: At,
            stz2: qt,
            stco: Dt,
            elst: Mt,
            trex: Lt,
            pssh: Xt,
            avcC: Nt,
            avc1: $n,
            mp4a: On,
            esds: Vt,
            btrt: Gn,
            sbgp: Kt,
            tref: Jt,
            ...Zt,
            subs: tn,
            saiz: rn,
            saio: sn,
            sinf: ln,
            frma: cn,
            schm: pn,
            schi: mn,
            stss: hn,
            sgpd: xn,
            mehd: Sn,
            sdtp: vn,
            mfra: In,
            tfra: En,
            mfro: An,
            pdin: Dn,
            cprt: Mn,
            cslg: Ln,
            stdp: Rn,
            'url ': Nn,
            'urn ': Fn,
            free: Pe,
            skip: Pe,
            iods: qn,
            trep: Kn,
            pasp: Jn,
            colr: ei,
            meta: ni,
            encv: ri,
            senc: si,
            enca: li,
            tenc: ci,
            ID32: pi,
            emsg: mi,
            ...hi,
        },
        fd = {
            ...Rt,
            ...tt,
            ...wt,
            ...yt,
            ...it,
            ...ot,
            ...bn,
            ...at,
            ...ft,
            ...dt,
            ...ut,
            ...gt,
            ..._t,
            ...bt,
            ...Ot,
            ...Ct,
            ...Tt,
            ...Wt,
            ...Pt,
            ...Ut,
            ...Yt,
            ...kt,
            ..._n,
            ...yn,
            ...Bt,
            ...Gt,
            ...Ft,
            ...Hn,
            ...Xn,
            ...$t,
            ...jn,
            ...Qt,
            ...en,
            ...nn,
            ...on,
            ...an,
            ...fn,
            ...dn,
            ...un,
            ...gn,
            ...Cn,
            ...Tn,
            ...Pn,
            ...Un,
            ...kn,
            ...wn,
            ...Bn,
            ...zn,
            ...Vn,
            ...Wn,
            ...Yn,
            ...Qn,
            ...Zn,
            ...ti,
            ...ii,
            ...oi,
            ...ai,
            ...fi,
            ...di,
            ...ui,
            ...gi,
            ..._i,
        };
    var yi = new Set([
        'moof',
        'traf',
        'moov',
        'trak',
        'mdia',
        'minf',
        'dinf',
        'dref',
        'stbl',
        'mvex',
        'edts',
        'avc1',
        'mp4a',
        'stsd',
        'sinf',
        'schi',
        'mfra',
        'tref',
        'udta',
        'encv',
        'meta',
        'trep',
        'enca',
    ]);
    function Ae(e, t = 0) {
        let n = { boxes: [], issues: [], events: [] },
            i = new DataView(e),
            r = 0;
        for (; r < i.byteLength; ) {
            if (r + 8 > i.byteLength) {
                let f = i.byteLength - r;
                f > 0 &&
                    n.issues.push({
                        type: 'warn',
                        message: `Trailing ${f} bytes at offset ${t + r} could not be parsed as a box.`,
                    });
                break;
            }
            let o = i.getUint32(r),
                l = String.fromCharCode(
                    i.getUint8(r + 4),
                    i.getUint8(r + 5),
                    i.getUint8(r + 6),
                    i.getUint8(r + 7)
                ),
                a = 8;
            if (o === 1) {
                if (r + 16 > i.byteLength) {
                    n.issues.push({
                        type: 'error',
                        message: `Incomplete largesize box header for type '${l}' at offset ${t + r}. Requires 16 bytes, found ${i.byteLength - r}.`,
                    });
                    break;
                }
                ((o = Number(i.getBigUint64(r + 8))), (a = 16));
            } else o === 0 && (o = i.byteLength - r);
            if (o < a || r + o > i.byteLength) {
                n.issues.push({
                    type: 'error',
                    message: `Invalid size ${o} for box '${l}' at offset ${t + r}. Box claims to extend beyond buffer limits.`,
                });
                break;
            }
            let s = {
                type: l,
                size: o,
                offset: t + r,
                contentOffset: t + r + a,
                headerSize: a,
                children: [],
                details: {},
                issues: [],
            };
            ((s.details.size = {
                value: `${o} bytes`,
                offset: s.offset,
                length: a > 8 ? 8 : 4,
            }),
                (s.details.type = {
                    value: l,
                    offset: s.offset + 4,
                    length: 4,
                }));
            let c = new DataView(e, r, o);
            if (
                (ds(s, c), l === 'emsg' && n.events.push(s), yi.has(l) && o > a)
            ) {
                let f = a,
                    d = s.contentOffset;
                if (
                    l === 'avc1' ||
                    l === 'mp4a' ||
                    l === 'encv' ||
                    l === 'enca'
                ) {
                    let p = l === 'avc1' || l === 'encv' ? 78 : 28;
                    ((f += p), (d += p));
                } else
                    l === 'stsd' || l === 'dref' || l === 'trep'
                        ? ((f += 8), (d += 8))
                        : l === 'meta' && ((f += 4), (d += 4));
                if (o > f) {
                    let p = e.slice(r + f, r + o);
                    if (p.byteLength > 0) {
                        let u = Ae(p, d);
                        ((s.children = u.boxes),
                            u.events.length > 0 && n.events.push(...u.events),
                            u.issues.length > 0 && s.issues.push(...u.issues));
                    }
                }
            }
            (l !== 'emsg' && n.boxes.push(s), (r += o));
        }
        return n;
    }
    function ds(e, t) {
        try {
            let n = xi[e.type];
            n
                ? n(e, t)
                : e.type === 'mdat'
                  ? (e.details.info = {
                        value: 'Contains raw media data for samples.',
                        offset: e.contentOffset,
                        length: e.size - e.headerSize,
                    })
                  : yi.has(e.type) ||
                    ((e.issues = e.issues || []),
                    e.issues.push({
                        type: 'warn',
                        message: `No parser implemented for box type '${e.type}'. Box content not parsed.`,
                    }));
        } catch (n) {
            ((e.issues = e.issues || []),
                e.issues.push({
                    type: 'error',
                    message: `Unhandled parser exception: ${n.message}`,
                }),
                console.error(`Error parsing ISOBMFF box "${e.type}":`, n));
        }
    }
    function Ue(e, t) {
        let n = e.getUint8(0),
            i = e.getUint8(1),
            r = e.getUint8(2),
            o = e.getUint8(3),
            l = ((i & 31) << 8) | r;
        return {
            sync_byte: { value: n, offset: t, length: 1 },
            transport_error_indicator: {
                value: (i >> 7) & 1,
                offset: t + 1,
                length: 0.125,
            },
            payload_unit_start_indicator: {
                value: (i >> 6) & 1,
                offset: t + 1,
                length: 0.125,
            },
            transport_priority: {
                value: (i >> 5) & 1,
                offset: t + 1,
                length: 0.125,
            },
            pid: { value: l, offset: t + 1, length: 1.625 },
            transport_scrambling_control: {
                value: (o >> 6) & 3,
                offset: t + 3,
                length: 0.25,
            },
            adaptation_field_control: {
                value: (o >> 4) & 3,
                offset: t + 3,
                length: 0.25,
            },
            continuity_counter: { value: o & 15, offset: t + 3, length: 0.5 },
        };
    }
    function ps(e, t) {
        let n = e.getUint32(t),
            i = e.getUint32(t + 4);
        return new Date(
            (n - 2208988800) * 1e3 + (i / 4294967296) * 1e3
        ).toISOString();
    }
    function Si(e, t) {
        let n = {},
            i = 0,
            r = e.getUint8(i),
            o = (r >> 6) & 3,
            l = (r >> 5) & 1,
            a = (r >> 4) & 1,
            s = (r >> 2) & 3,
            c = (r >> 1) & 1,
            f = r & 1;
        ((n.has_timestamp = { value: o, offset: t + i, length: 0.25 }),
            (n.has_ntp = { value: l, offset: t + i, length: 0.125 }),
            (n.has_ptp = { value: a, offset: t + i, length: 0.125 }),
            (n.has_timecode = { value: s, offset: t + i, length: 0.25 }),
            (n.force_reload = { value: c, offset: t + i, length: 0.125 }),
            (n.paused = { value: f, offset: t + i, length: 0.125 }),
            (i += 1));
        let d = e.getUint8(i);
        if (
            ((n.discontinuity = {
                value: (d >> 7) & 1,
                offset: t + i,
                length: 0.125,
            }),
            (i += 1),
            (n.timeline_id = {
                value: e.getUint8(i),
                offset: t + i,
                length: 1,
            }),
            (i += 1),
            o &&
                ((n.timescale = {
                    value: e.getUint32(i),
                    offset: t + i,
                    length: 4,
                }),
                (i += 4),
                o === 1
                    ? ((n.media_timestamp = {
                          value: e.getUint32(i),
                          offset: t + i,
                          length: 4,
                      }),
                      (i += 4))
                    : o === 2 &&
                      ((n.media_timestamp = {
                          value: e.getBigUint64(i).toString(),
                          offset: t + i,
                          length: 8,
                      }),
                      (i += 8))),
            l &&
                ((n.ntp_timestamp = {
                    value: ps(e, i),
                    offset: t + i,
                    length: 8,
                }),
                (i += 8)),
            a &&
                ((n.ptp_timestamp = {
                    value: 'PTP data present',
                    offset: t + i,
                    length: 10,
                }),
                (i += 10)),
            s)
        ) {
            let p = e.byteLength - i;
            n.timecode_data = {
                value: `Timecode data present (${p} bytes)`,
                offset: t + i,
                length: p,
            };
        }
        return n;
    }
    function bi(e, t) {
        let n = [],
            i = 0;
        for (; i < e.byteLength && !(i + 2 > e.byteLength); ) {
            let r = e.getUint8(i),
                o = e.getUint8(i + 1);
            if (i + 2 + o > e.byteLength) break;
            let l = new DataView(e.buffer, e.byteOffset + i + 2, o),
                a = t + i + 2,
                s,
                c = 'Unknown/Private AF Descriptor';
            switch (r) {
                case 4:
                    ((c = 'Timeline Descriptor'), (s = Si(l, a)));
                    break;
                case 5:
                    c = 'Location Descriptor';
                    break;
                case 6:
                    c = 'BaseURL Descriptor';
                    break;
                case 11:
                    c = 'Boundary Descriptor';
                    break;
                case 12:
                    c = 'Labeling Descriptor';
                    break;
            }
            (s || (s = { data: { value: `${o} bytes`, offset: a, length: o } }),
                n.push({ tag: r, length: o, name: c, details: s }),
                (i += 2 + o));
        }
        return n;
    }
    function vi(e) {
        let t = e.getUint8(0),
            n = e.getUint8(1),
            i = e.getUint8(2),
            r = e.getUint8(3),
            o = e.getUint8(4),
            l = e.getUint8(5),
            a =
                (BigInt(t) << 25n) |
                (BigInt(n) << 17n) |
                (BigInt(i) << 9n) |
                (BigInt(r) << 1n) |
                BigInt(o >> 7),
            s = ((BigInt(o) & 1n) << 8n) | BigInt(l);
        return a * 300n + s;
    }
    function us(e) {
        let t = (e.getUint8(0) & 14) >> 1,
            n = e.getUint16(1) & 32767,
            i = e.getUint16(3) & 32767;
        return (BigInt(t) << 30n) | (BigInt(n) << 15n) | BigInt(i);
    }
    function Ci(e, t) {
        let n = e.getUint8(0);
        if (n === 0) return { length: { value: 0, offset: t, length: 1 } };
        if (n > e.byteLength - 1)
            return {
                length: { value: n, offset: t, length: 1 },
                error: 'Invalid length',
            };
        let i = e.getUint8(1),
            r = {
                length: { value: n, offset: t, length: 1 },
                discontinuity_indicator: {
                    value: (i >> 7) & 1,
                    offset: t + 1,
                    length: 0.125,
                },
                random_access_indicator: {
                    value: (i >> 6) & 1,
                    offset: t + 1,
                    length: 0.125,
                },
                elementary_stream_priority_indicator: {
                    value: (i >> 5) & 1,
                    offset: t + 1,
                    length: 0.125,
                },
                pcr_flag: { value: (i >> 4) & 1, offset: t + 1, length: 0.125 },
                opcr_flag: {
                    value: (i >> 3) & 1,
                    offset: t + 1,
                    length: 0.125,
                },
                splicing_point_flag: {
                    value: (i >> 2) & 1,
                    offset: t + 1,
                    length: 0.125,
                },
                transport_private_data_flag: {
                    value: (i >> 1) & 1,
                    offset: t + 1,
                    length: 0.125,
                },
                adaptation_field_extension_flag: {
                    value: i & 1,
                    offset: t + 1,
                    length: 0.125,
                },
            },
            o = 2;
        if (
            (r.pcr_flag.value &&
                o + 6 <= n + 1 &&
                ((r.pcr = {
                    value: vi(
                        new DataView(e.buffer, e.byteOffset + o)
                    ).toString(),
                    offset: t + o,
                    length: 6,
                }),
                (o += 6)),
            r.opcr_flag.value &&
                o + 6 <= n + 1 &&
                ((r.opcr = {
                    value: vi(
                        new DataView(e.buffer, e.byteOffset + o)
                    ).toString(),
                    offset: t + o,
                    length: 6,
                }),
                (o += 6)),
            r.splicing_point_flag.value &&
                o + 1 <= n + 1 &&
                ((r.splice_countdown = {
                    value: e.getInt8(o),
                    offset: t + o,
                    length: 1,
                }),
                (o += 1)),
            r.transport_private_data_flag.value && o + 1 <= n + 1)
        ) {
            let a = e.getUint8(o);
            ((r.private_data_length = { value: a, offset: t + o, length: 1 }),
                (o += 1 + a));
        }
        if (r.adaptation_field_extension_flag.value && o + 1 <= n + 1) {
            let a = e.getUint8(o),
                s = e.getUint8(o + 1),
                c = (s >> 4) & 1;
            r.extension = {
                length: { value: a, offset: t + o, length: 1 },
                ltw_flag: {
                    value: (s >> 7) & 1,
                    offset: t + o + 1,
                    length: 0.125,
                },
                piecewise_rate_flag: {
                    value: (s >> 6) & 1,
                    offset: t + o + 1,
                    length: 0.125,
                },
                seamless_splice_flag: {
                    value: (s >> 5) & 1,
                    offset: t + o + 1,
                    length: 0.125,
                },
                af_descriptor_not_present_flag: {
                    value: c,
                    offset: t + o + 1,
                    length: 0.125,
                },
            };
            let f = o + 2;
            if (r.extension.ltw_flag.value && f + 2 <= o + 1 + a) {
                let p = e.getUint16(f);
                ((r.extension.ltw_valid_flag = {
                    value: (p >> 15) & 1,
                    offset: t + f,
                    length: 0.125,
                }),
                    (r.extension.ltw_offset = {
                        value: p & 32767,
                        offset: t + f,
                        length: 1.875,
                    }),
                    (f += 2));
            }
            if (r.extension.piecewise_rate_flag.value && f + 3 <= o + 1 + a) {
                let p = e.getUint32(f - 1) & 1073741568;
                ((r.extension.piecewise_rate = {
                    value: p >> 8,
                    offset: t + f,
                    length: 3,
                }),
                    (f += 3));
            }
            r.extension.seamless_splice_flag.value &&
                f + 5 <= o + 1 + a &&
                ((r.extension.splice_type = {
                    value: e.getUint8(f) >> 4,
                    offset: t + f,
                    length: 0.5,
                }),
                (r.extension.DTS_next_AU = {
                    value: us(
                        new DataView(e.buffer, e.byteOffset + f)
                    ).toString(),
                    offset: t + f,
                    length: 5,
                }),
                (f += 5));
            let d = o + 1 + a - f;
            if (d > 0)
                if (c === 0) {
                    let p = new DataView(e.buffer, e.byteOffset + f, d);
                    r.extension.af_descriptors = bi(p, t + f);
                } else
                    r.extension.reserved_bytes = {
                        value: `${d} reserved bytes`,
                        offset: t + f,
                        length: d,
                    };
            o += 1 + a;
        }
        let l = n + 1 - o;
        return (
            l > 0 &&
                (r.stuffing_bytes = { value: l, offset: t + o, length: l }),
            r
        );
    }
    var Ii = {
        'AF@length': {
            text: 'The total length of the adaptation field in bytes, not including this length byte itself.',
            ref: 'Clause 2.4.3.5',
        },
        'AF@discontinuity_indicator': {
            text: 'Set to 1 if a discontinuity is indicated for the current TS packet.',
            ref: 'Clause 2.4.3.5',
        },
        'AF@random_access_indicator': {
            text: 'Set to 1 if the stream may be randomly accessed at this point.',
            ref: 'Clause 2.4.3.5',
        },
        'AF@pcr_flag': {
            text: 'Set to 1 if the adaptation field contains a Program Clock Reference (PCR).',
            ref: 'Clause 2.4.3.5',
        },
        'AF@pcr': {
            text: "Program Clock Reference. A timestamp used to synchronize the decoder's clock.",
            ref: 'Clause 2.4.3.5',
        },
        'AF@af_descriptor_not_present_flag': {
            text: 'If set to 0, signals the presence of one or more descriptors in the adaptation field extension.',
            ref: 'Clause 2.4.3.4',
        },
    };
    var ms = [
        0, 79764919, 159529838, 222504665, 319059676, 398814059, 445009330,
        507990021, 638119352, 583659535, 797628118, 726387553, 890018660,
        835552979, 1015980042, 944750013, 1276238704, 1221641927, 1167319070,
        1095957929, 1595256236, 1540665371, 1452775106, 1381403509, 1780037320,
        1859660671, 1671105958, 1733955601, 2031960084, 2111593891, 1889500026,
        1952343757, 2552477408, 2632100695, 2443283854, 2506133561, 2334638140,
        2414271883, 2191915858, 2254759653, 3190512472, 3135915759, 3081330742,
        3009969537, 2905550212, 2850959411, 2762807018, 2691435357, 3560074640,
        3505614887, 3719321342, 3648080713, 3342211916, 3287746299, 3467911202,
        3396681109, 4063920168, 4143685023, 4223187782, 4286162673, 3779000052,
        3858754371, 3904687514, 3967668269, 881225847, 809987520, 1023691545,
        969234094, 662832811, 591600412, 771767749, 717299826, 311336399,
        374308984, 453813921, 533576470, 25881363, 88864420, 134795389,
        214552010, 2023205639, 2086057648, 1897238633, 1976864222, 1804852699,
        1867694188, 1645340341, 1724971778, 1587496639, 1516133128, 1461550545,
        1406951526, 1302016099, 1230646740, 1142491917, 1087903418, 2896545431,
        2892290848, 2703752697, 2783371342, 3147935819, 3210784252, 2988673829,
        3068302994, 2393844527, 2322478744, 2267877441, 2213285366, 2645282291,
        2573783108, 2485909149, 2431318826, 3769900519, 3832873040, 3912640137,
        3992402750, 4088425275, 4151408268, 4197601365, 4277358050, 3334271071,
        3263032808, 3476998961, 3422541446, 3585640067, 3514407732, 3694837229,
        3640369242, 1762451694, 1842216281, 1619975040, 1682949687, 2047383090,
        2127137669, 1938468188, 2001449195, 1325665622, 1271206113, 1183200824,
        1111960463, 1543535498, 1489069629, 1434599652, 1363369299, 622672798,
        568075817, 748617968, 677256519, 907627842, 853037301, 1067152940,
        995781531, 51762726, 131386257, 177728840, 240578815, 269590778,
        349224269, 429104020, 491947555, 4046411278, 4126034873, 4172115296,
        4234965207, 3794477266, 3874110821, 3953728444, 4016571915, 3609705398,
        3555108353, 3735388376, 3664026991, 3290680682, 3236090077, 3449943556,
        3378572211, 3174993278, 3120533705, 3032266256, 2961025959, 2923101090,
        2868635157, 2813903052, 2742672763, 2604032198, 2683796849, 2461293480,
        2524268063, 2284983834, 2364738477, 2175806836, 2238787779, 1569362073,
        1498123566, 1409854455, 1355396672, 1317987909, 1246755826, 1192025387,
        1137557660, 2072149281, 2135122070, 1912620623, 1992383480, 1753615357,
        1816598090, 1627664531, 1707420964, 295390185, 358241886, 404320391,
        483945776, 43990325, 106832002, 186451547, 266083308, 932423249,
        861060070, 1041341759, 986742920, 613929101, 542559546, 756411363,
        701822548,
    ];
    function gs(e) {
        let t = 4294967295;
        for (let n = 0; n < e.byteLength; n++) {
            let i = e.getUint8(n);
            t = (t << 8) ^ ms[((t >> 24) ^ i) & 255];
        }
        return t >>> 0;
    }
    function W(e) {
        if (e.byteLength < 3)
            return {
                header: { error: 'Section too short for header' },
                payload: new DataView(new ArrayBuffer(0)),
                isValid: !1,
            };
        let t = e.getUint8(0),
            n = e.getUint8(1) >> 7,
            i = e.getUint16(1) & 4095;
        if (n === 0) {
            if (3 + i > e.byteLength)
                return {
                    header: {
                        table_id: `0x${t.toString(16)}`,
                        error: 'Invalid short section length',
                        section_length: i,
                    },
                    payload: new DataView(new ArrayBuffer(0)),
                    crc: null,
                    isValid: !1,
                };
            let _ = new DataView(e.buffer, e.byteOffset + 3, i);
            return {
                header: {
                    table_id: `0x${t.toString(16).padStart(2, '0')}`,
                    section_syntax_indicator: n,
                    section_length: i,
                },
                payload: _,
                crc: null,
                isValid: !0,
            };
        }
        if (i > 1021)
            return {
                header: {
                    table_id: `0x${t.toString(16)}`,
                    error: 'Section length exceeds maximum (1021)',
                    section_length: i,
                },
                payload: new DataView(new ArrayBuffer(0)),
                crc: '0x00000000',
                isValid: !1,
            };
        let r = 3 + i;
        if (r > e.byteLength)
            return {
                header: {
                    table_id: `0x${t.toString(16)}`,
                    error: 'Section length extends beyond packet payload',
                    section_length: i,
                },
                payload: new DataView(new ArrayBuffer(0)),
                crc: '0x00000000',
                isValid: !1,
            };
        if (i < 9)
            return {
                header: {
                    table_id: `0x${t.toString(16)}`,
                    error: 'Section length too short for long format (must be >= 9)',
                    section_length: i,
                },
                payload: new DataView(new ArrayBuffer(0)),
                crc: '0x00000000',
                isValid: !1,
            };
        let o = new DataView(e.buffer, e.byteOffset, r - 4),
            l = gs(o),
            a = e.getUint32(r - 4),
            s = l === a,
            c = {
                table_id: `0x${t.toString(16).padStart(2, '0')}`,
                section_syntax_indicator: n,
                section_length: i,
                table_id_extension: e.getUint16(3),
                version_number: (e.getUint8(5) >> 1) & 31,
                current_next_indicator: e.getUint8(5) & 1,
                section_number: e.getUint8(6),
                last_section_number: e.getUint8(7),
            },
            f = 8,
            p = r - 4 - f,
            u = new DataView(e.buffer, e.byteOffset + f, p);
        return {
            header: c,
            payload: u,
            crc: `0x${a.toString(16).padStart(8, '0')}`,
            isValid: s,
        };
    }
    function De(e, t) {
        let n = [];
        for (let i = 0; i + 4 <= e.byteLength; i += 4) {
            let r = e.getUint16(i),
                o = e.getUint16(i + 2) & 8191;
            r === 0
                ? n.push({
                      type: 'network',
                      pid: { value: o, offset: t + i + 2, length: 1.625 },
                  })
                : n.push({
                      type: 'program',
                      program_number: { value: r, offset: t + i, length: 2 },
                      program_map_PID: {
                          value: o,
                          offset: t + i + 2,
                          length: 1.625,
                      },
                  });
        }
        return { type: 'PAT', programs: n };
    }
    var Ti = {
        PAT: {
            text: 'Program Association Table. Lists all programs in a stream, mapping each to the PID of its Program Map Table (PMT).',
            ref: 'Clause 2.4.4.4',
        },
        'PAT@network_pid': {
            text: 'The PID for the Network Information Table (NIT).',
            ref: 'Table 2-30',
        },
        'PAT@program_map_PID': {
            text: 'The PID of the Transport Stream packets which shall contain the Program Map Table for this program.',
            ref: 'Table 2-30',
        },
    };
    function Ei(e, t) {
        let n = e.getUint8(0),
            i = {
                multiple_frame_rate_flag: {
                    value: (n >> 7) & 1,
                    offset: t,
                    length: 0.125,
                },
                frame_rate_code: {
                    value: (n >> 3) & 15,
                    offset: t,
                    length: 0.5,
                },
                MPEG_1_only_flag: {
                    value: (n >> 2) & 1,
                    offset: t,
                    length: 0.125,
                },
                constrained_parameter_flag: {
                    value: (n >> 1) & 1,
                    offset: t,
                    length: 0.125,
                },
                still_picture_flag: { value: n & 1, offset: t, length: 0.125 },
            };
        if (i.MPEG_1_only_flag.value === 0) {
            let r = e.getUint8(1);
            i.profile_and_level_indication = {
                value: r,
                offset: t + 1,
                length: 1,
            };
            let o = e.getUint8(2);
            ((i.chroma_format = {
                value: (o >> 6) & 3,
                offset: t + 2,
                length: 0.25,
            }),
                (i.frame_rate_extension_flag = {
                    value: (o >> 5) & 1,
                    offset: t + 2,
                    length: 0.125,
                }));
        }
        return i;
    }
    function Pi(e, t) {
        let n = e.getUint8(0);
        return {
            free_format_flag: { value: (n >> 7) & 1, offset: t, length: 0.125 },
            ID: { value: (n >> 6) & 1, offset: t, length: 0.125 },
            layer: { value: (n >> 4) & 3, offset: t, length: 0.25 },
            variable_rate_audio_indicator: {
                value: (n >> 3) & 1,
                offset: t,
                length: 0.125,
            },
        };
    }
    function Ai(e, t) {
        let n = e.getUint8(0),
            i = n & 15,
            r = e.getUint8(1),
            o = e.getUint8(2),
            l = {
                1: 'Spatial Scalability',
                2: 'SNR Scalability',
                3: 'Temporal Scalability',
                4: 'Data partitioning',
                5: 'Extension bitstream',
                8: 'Combined Scalability',
                9: 'MVC/MVCD video sub-bitstream',
                15: 'Base layer',
            };
        return {
            no_view_scalability_flag: {
                value: (n >> 7) & 1,
                offset: t,
                length: 0.125,
            },
            no_temporal_scalability_flag: {
                value: (n >> 6) & 1,
                offset: t,
                length: 0.125,
            },
            no_spatial_scalability_flag: {
                value: (n >> 5) & 1,
                offset: t,
                length: 0.125,
            },
            no_quality_scalability_flag: {
                value: (n >> 4) & 1,
                offset: t,
                length: 0.125,
            },
            hierarchy_type: {
                value: `${l[i] || 'Reserved'} (${i})`,
                offset: t,
                length: 0.5,
            },
            hierarchy_layer_index: {
                value: r & 63,
                offset: t + 1,
                length: 0.75,
            },
            tref_present_flag: {
                value: (r >> 6) & 1,
                offset: t + 1,
                length: 0.125,
            },
            hierarchy_embedded_layer_index: {
                value: o & 63,
                offset: t + 2,
                length: 0.75,
            },
            hierarchy_channel: {
                value: e.getUint8(3) & 63,
                offset: t + 3,
                length: 0.75,
            },
        };
    }
    function Ui(e, t) {
        let n = e.getUint32(0),
            i = [];
        for (let o = 4; o < e.byteLength; o++)
            i.push(e.getUint8(o).toString(16).padStart(2, '0'));
        let r = String.fromCharCode(
            (n >> 24) & 255,
            (n >> 16) & 255,
            (n >> 8) & 255,
            n & 255
        );
        return {
            format_identifier: {
                value: `0x${n.toString(16).padStart(8, '0')} (${r})`,
                offset: t,
                length: 4,
            },
            additional_identification_info: {
                value: i.length > 0 ? i.join(' ') : 'none',
                offset: t + 4,
                length: i.length,
            },
        };
    }
    function Di(e, t, n) {
        let i = e.getUint8(0),
            r = `Unknown/Reserved (${i})`,
            o = {
                1: 'Slice, or video access unit',
                2: 'Video access unit',
                3: 'GOP, or SEQ',
                4: 'SEQ',
            },
            l = {
                1: 'AVC slice or AVC access unit',
                2: 'AVC access unit',
                3: 'SVC slice or SVC dependency representation',
                4: 'SVC dependency representation',
                5: 'MVC slice or MVC view-component subset',
                6: 'MVC view-component subset',
                7: 'MVCD slice or MVCD view-component subset',
                8: 'MVCD view-component subset',
            },
            a = {
                1: 'HEVC access unit',
                2: 'HEVC slice',
                3: 'HEVC access unit or slice',
                4: 'HEVC tile of slices',
            },
            s = { 1: 'Sync word' },
            c = [1, 2, 16],
            f = [27, 31, 32, 35, 38],
            d = [36, 37],
            p = [3, 4, 15, 17, 28];
        return (
            c.includes(n)
                ? (r = o[i] || r)
                : f.includes(n)
                  ? (r = l[i] || r)
                  : d.includes(n)
                    ? (r = a[i] || r)
                    : p.includes(n) && (r = s[i] || r),
            { alignment_type: { value: r, offset: t, length: 1 } }
        );
    }
    function ki(e, t) {
        let n = e.getUint16(0),
            i = e.getUint16(2);
        return {
            horizontal_size: { value: n >> 2, offset: t, length: 1.75 },
            vertical_size: {
                value: ((n & 3) << 12) | (i >> 4),
                offset: t + 1.75,
                length: 1.75,
            },
            aspect_ratio_information: {
                value: i & 15,
                offset: t + 3.5,
                length: 0.5,
            },
        };
    }
    function Mi(e, t) {
        let n = e.getUint16(0),
            i = e.getUint16(2);
        return {
            horizontal_offset: { value: n >> 2, offset: t, length: 1.75 },
            vertical_offset: {
                value: ((n & 3) << 12) | (i >> 4),
                offset: t + 1.75,
                length: 1.75,
            },
            window_priority: { value: i & 15, offset: t + 3.5, length: 0.5 },
        };
    }
    function wi(e, t) {
        let n = e.getUint16(0),
            i = e.getUint16(2) & 8191,
            r = [];
        for (let o = 4; o < e.byteLength; o++)
            r.push(e.getUint8(o).toString(16).padStart(2, '0'));
        return {
            ca_system_ID: {
                value: `0x${n.toString(16).padStart(4, '0')}`,
                offset: t,
                length: 2,
            },
            reserved: {
                value: (e.getUint8(2) >> 5) & 7,
                offset: t + 2,
                length: 0.375,
            },
            ca_PID: { value: i, offset: t + 2, length: 1.625 },
            private_data: {
                value: r.length > 0 ? r.join(' ') : 'none',
                offset: t + 4,
                length: r.length,
            },
        };
    }
    function Li(e, t) {
        let n = [];
        for (let i = 0; i < e.byteLength && !(i + 4 > e.byteLength); i += 4) {
            let r =
                    String.fromCharCode(e.getUint8(i)) +
                    String.fromCharCode(e.getUint8(i + 1)) +
                    String.fromCharCode(e.getUint8(i + 2)),
                o = e.getUint8(i + 3),
                l = {
                    0: 'Undefined',
                    1: 'Clean effects',
                    2: 'Hearing impaired',
                    3: 'Visual impaired commentary',
                };
            n.push({
                language: { value: r, offset: t + i, length: 3 },
                audio_type: {
                    value: l[o] || `User Private (0x${o.toString(16)})`,
                    offset: t + i + 3,
                    length: 1,
                },
            });
        }
        return { languages: n };
    }
    function Bi(e, t) {
        let n = e.getUint8(0);
        return {
            external_clock_reference_indicator: {
                value: (n >> 7) & 1,
                offset: t,
                length: 0.125,
            },
            clock_accuracy_integer: {
                value: (n >> 1) & 63,
                offset: t,
                length: 0.75,
            },
            clock_accuracy_exponent: {
                value: (e.getUint8(1) >> 5) & 7,
                offset: t + 1,
                length: 0.375,
            },
        };
    }
    function Ri(e, t) {
        let n = e.getUint16(0),
            i = e.getUint16(2);
        return {
            bound_valid_flag: {
                value: (n >> 15) & 1,
                offset: t,
                length: 0.125,
            },
            LTW_offset_lower_bound: {
                value: n & 32767,
                offset: t,
                length: 1.875,
            },
            LTW_offset_upper_bound: {
                value: i & 32767,
                offset: t + 2,
                length: 1.875,
            },
        };
    }
    function zi(e, t) {
        return {
            copyright_identifier: {
                value: `0x${e.getUint32(0).toString(16).padStart(8, '0')}`,
                offset: t,
                length: 4,
            },
        };
    }
    function Ni(e, t) {
        return {
            maximum_bitrate: {
                value: `${(((e.getUint32(0) & 4194303) * 50 * 8) / 1e6).toFixed(2)} Mbps`,
                offset: t,
                length: 4,
            },
        };
    }
    function Fi(e, t) {
        return {
            private_data_indicator: {
                value: `0x${e.getUint32(0).toString(16).padStart(8, '0')}`,
                offset: t,
                length: 4,
            },
        };
    }
    function Vi(e, t) {
        let n = new Uint8Array(e.buffer, e.byteOffset, e.byteLength),
            i = ((n[0] & 3) << 20) | (n[1] << 12) | (n[2] << 4) | (n[3] >> 4),
            r =
                ((n[3] & 3) << 20) |
                (n[4] << 12) |
                (n[5] << 4) |
                (e.getUint8(6) >> 4);
        return {
            sb_leak_rate: { value: `${i * 400} bps`, offset: t, length: 3 },
            sb_size: { value: `${r} bytes`, offset: t + 3, length: 3 },
        };
    }
    function $i(e, t) {
        return {
            leak_valid_flag: {
                value: e.getUint8(0) & 1,
                offset: t,
                length: 0.125,
            },
        };
    }
    function Hi(e, t) {
        let n = e.getUint16(0);
        return {
            closed_gop_flag: { value: (n >> 15) & 1, offset: t, length: 0.125 },
            identical_gop_flag: {
                value: (n >> 14) & 1,
                offset: t,
                length: 0.125,
            },
            max_gop_length: { value: n & 16383, offset: t, length: 1.75 },
        };
    }
    function Oi(e, t) {
        return {
            MPEG4_visual_profile_and_level: {
                value: `0x${e.getUint8(0).toString(16).padStart(2, '0')}`,
                offset: t,
                length: 1,
            },
        };
    }
    function Xi(e, t) {
        return {
            MPEG4_audio_profile_and_level: {
                value: `0x${e.getUint8(0).toString(16).padStart(2, '0')}`,
                offset: t,
                length: 1,
            },
        };
    }
    function Gi(e, t) {
        return {
            textConfig_data: {
                value: `${e.byteLength} bytes of TextConfig data`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function ji(e, t) {
        let n = e.getUint8(1),
            i = e.getUint8(3);
        return {
            profile_idc: { value: e.getUint8(0), offset: t, length: 1 },
            constraint_set0_flag: {
                value: (n >> 7) & 1,
                offset: t + 1,
                length: 0.125,
            },
            constraint_set1_flag: {
                value: (n >> 6) & 1,
                offset: t + 1,
                length: 0.125,
            },
            constraint_set2_flag: {
                value: (n >> 5) & 1,
                offset: t + 1,
                length: 0.125,
            },
            constraint_set3_flag: {
                value: (n >> 4) & 1,
                offset: t + 1,
                length: 0.125,
            },
            constraint_set4_flag: {
                value: (n >> 3) & 1,
                offset: t + 1,
                length: 0.125,
            },
            constraint_set5_flag: {
                value: (n >> 2) & 1,
                offset: t + 1,
                length: 0.125,
            },
            AVC_compatible_flags: { value: n & 3, offset: t + 1, length: 0.25 },
            level_idc: { value: e.getUint8(2), offset: t + 2, length: 1 },
            AVC_still_present: {
                value: (i >> 7) & 1,
                offset: t + 3,
                length: 0.125,
            },
            AVC_24_hour_picture_flag: {
                value: (i >> 6) & 1,
                offset: t + 3,
                length: 0.125,
            },
            Frame_Packing_SEI_not_present_flag: {
                value: (i >> 5) & 1,
                offset: t + 3,
                length: 0.125,
            },
        };
    }
    function Wi(e, t) {
        let n = {},
            i = 0,
            r = e.getUint8(i);
        ((n.profile_space = {
            value: (r >> 6) & 3,
            offset: t + i,
            length: 0.25,
        }),
            (n.tier_flag = {
                value: (r >> 5) & 1,
                offset: t + i,
                length: 0.125,
            }),
            (n.profile_idc = { value: r & 31, offset: t + i, length: 0.625 }),
            (i += 1),
            (n.profile_compatibility_indication = {
                value: `0x${e.getUint32(i).toString(16).padStart(8, '0')}`,
                offset: t + i,
                length: 4,
            }),
            (i += 4));
        let o = e.getUint8(i);
        if (
            ((n.progressive_source_flag = {
                value: (o >> 7) & 1,
                offset: t + i,
                length: 0.125,
            }),
            (n.interlaced_source_flag = {
                value: (o >> 6) & 1,
                offset: t + i,
                length: 0.125,
            }),
            (n.non_packed_constraint_flag = {
                value: (o >> 5) & 1,
                offset: t + i,
                length: 0.125,
            }),
            (n.frame_only_constraint_flag = {
                value: (o >> 4) & 1,
                offset: t + i,
                length: 0.125,
            }),
            (i += 1),
            (i += 6),
            (n.level_idc = { value: e.getUint8(i), offset: t + i, length: 1 }),
            (i += 1),
            i < e.byteLength)
        ) {
            let l = e.getUint8(i),
                a = (l >> 7) & 1;
            if (
                ((n.temporal_layer_subset_flag = {
                    value: a,
                    offset: t + i,
                    length: 0.125,
                }),
                (n.HEVC_still_present_flag = {
                    value: (l >> 6) & 1,
                    offset: t + i,
                    length: 0.125,
                }),
                (n.HEVC_24hr_picture_present_flag = {
                    value: (l >> 5) & 1,
                    offset: t + i,
                    length: 0.125,
                }),
                (n.sub_pic_hrd_params_not_present_flag = {
                    value: (l >> 4) & 1,
                    offset: t + i,
                    length: 0.125,
                }),
                (n.HDR_WCG_idc = { value: l & 3, offset: t + i, length: 0.25 }),
                (i += 1),
                a)
            ) {
                let s = e.getUint8(i);
                ((n.temporal_id_min = {
                    value: (s >> 5) & 7,
                    offset: t + i,
                    length: 0.375,
                }),
                    (n.temporal_id_max = {
                        value: s & 7,
                        offset: t + i,
                        length: 0.375,
                    }));
            }
        }
        return n;
    }
    function qi(e, t) {
        let n = {},
            i = 0;
        if (e.byteLength < 2) return n;
        let r = e.getUint8(i);
        ((n.hrd_management_valid_flag = {
            value: (r >> 7) & 1,
            offset: t + i,
            length: 0.125,
        }),
            (i += 1));
        let l = e.getUint8(i) & 1;
        if (
            ((n.picture_and_timing_info_present_flag = {
                value: l,
                offset: t + i,
                length: 0.125,
            }),
            (i += 1),
            l && e.byteLength > i)
        ) {
            let s = (e.getUint8(i) >> 7) & 1;
            ((n['90kHz_flag'] = { value: s, offset: t + i, length: 0.125 }),
                (i += 1),
                s === 0 &&
                    e.byteLength >= i + 8 &&
                    ((n.N = {
                        value: e.getUint32(i),
                        offset: t + i,
                        length: 4,
                    }),
                    (n.K = {
                        value: e.getUint32(i + 4),
                        offset: t + i + 4,
                        length: 4,
                    }),
                    (i += 8)),
                e.byteLength >= i + 4 &&
                    (n.num_units_in_tick = {
                        value: e.getUint32(i),
                        offset: t + i,
                        length: 4,
                    }));
        }
        return n;
    }
    function Yi(e, t) {
        let n = {},
            i = 0,
            r = e.getUint8(i);
        n.num_ptl = { value: r & 63, offset: t + i, length: 0.75 };
        let o = r & 63;
        ((i += 1), (n.profile_tier_level_infos = []));
        for (
            let a = 0;
            a < o && !(i + 12 > e.byteLength || i + 12 > e.byteLength);
            a++
        )
            (n.profile_tier_level_infos.push({
                value: `12 bytes of PTL data for index ${a}`,
                offset: t + i,
                length: 12,
            }),
                (i += 12));
        let l = e.getUint8(i);
        ((n.operation_points_count = { value: l, offset: t + i, length: 1 }),
            (i += 1),
            (n.operation_points = []));
        for (
            let a = 0;
            a < l && !(i + 2 > e.byteLength || i + 2 > e.byteLength);
            a++
        ) {
            let s = {};
            ((s.target_ols = {
                value: e.getUint8(i),
                offset: t + i,
                length: 1,
            }),
                (s.ES_count = {
                    value: e.getUint8(i + 1),
                    offset: t + i + 1,
                    length: 1,
                }));
            let c = s.ES_count.value;
            ((i += 2), (s.es_references = []));
            for (let p = 0; p < c && !(i + 1 > e.byteLength); p++) {
                let u = e.getUint8(i);
                if (i + 1 > e.byteLength) break;
                (s.es_references.push({
                    prepend_dependencies: {
                        value: (u >> 7) & 1,
                        offset: t + i,
                        length: 0.125,
                    },
                    ES_reference: {
                        value: u & 63,
                        offset: t + i,
                        length: 0.75,
                    },
                }),
                    (i += 1));
            }
            if (i + 1 > e.byteLength) break;
            s.numEsInOp = {
                value: e.getUint8(i) & 63,
                offset: t + i,
                length: 0.75,
            };
            let f = s.numEsInOp.value;
            ((i += 1), (s.layers = []));
            for (let p = 0; p < f && !(i + 1 > e.byteLength); p++) {
                let u = e.getUint8(i);
                if (i + 1 > e.byteLength) break;
                (s.layers.push({
                    necessary_layer_flag: {
                        value: (u >> 7) & 1,
                        offset: t + i,
                        length: 0.125,
                    },
                    output_layer_flag: {
                        value: (u >> 6) & 1,
                        offset: t + i,
                        length: 0.125,
                    },
                    ptl_ref_idx: { value: u & 63, offset: t + i, length: 0.75 },
                }),
                    (i += 1));
            }
            if (i + 1 > e.byteLength) break;
            let d = e.getUint8(i);
            if (
                ((s.avg_bit_rate_info_flag = {
                    value: (d >> 7) & 1,
                    offset: t + i,
                    length: 0.125,
                }),
                (s.max_bit_rate_info_flag = {
                    value: (d >> 6) & 1,
                    offset: t + i,
                    length: 0.125,
                }),
                (s.constant_frame_rate_info_idc = {
                    value: (d >> 4) & 3,
                    offset: t + i,
                    length: 0.25,
                }),
                (s.applicable_temporal_id = {
                    value: (d >> 1) & 7,
                    offset: t + i,
                    length: 0.375,
                }),
                (i += 1),
                s.constant_frame_rate_info_idc.value > 0)
            ) {
                if (i + 2 > e.byteLength || i + 2 > e.byteLength) break;
                ((s.frame_rate_indicator = {
                    value: e.getUint16(i) & 4095,
                    offset: t + i,
                    length: 1.5,
                }),
                    (i += 2));
            }
            if (s.avg_bit_rate_info_flag.value === 1) {
                if (i + 3 > e.byteLength || i + 3 > e.byteLength) break;
                ((s.avg_bit_rate = {
                    value: (e.getUint8(i) << 16) | e.getUint16(i + 1),
                    offset: t + i,
                    length: 3,
                }),
                    (i += 3));
            }
            if (s.max_bit_rate_info_flag.value === 1) {
                if (i + 3 > e.byteLength || i + 3 > e.byteLength) break;
                ((s.max_bit_rate = {
                    value: (e.getUint8(i) << 16) | e.getUint16(i + 1),
                    offset: t + i,
                    length: 3,
                }),
                    (i += 3));
            }
            n.operation_points.push(s);
        }
        return n;
    }
    function Ki(e, t) {
        let n = {},
            i = 0,
            o = (e.getUint8(i) >> 6) & 3;
        ((n.num_constant_backlight_voltage_time_intervals = {
            value: o,
            offset: t + i,
            length: 0.25,
        }),
            (i += 1),
            (n.intervals = []));
        for (
            let s = 0;
            s < o && !(i + 2 > e.byteLength || i + 2 > e.byteLength);
            s++
        )
            (n.intervals.push({
                constant_backlight_voltage_time_interval: {
                    value: e.getUint16(i),
                    offset: t + i,
                    length: 2,
                },
            }),
                (i += 2));
        let a = (e.getUint8(i) >> 6) & 3;
        ((n.num_max_variations = { value: a, offset: t + i, length: 0.25 }),
            (i += 1),
            (n.variations = []));
        for (
            let s = 0;
            s < a && !(i + 2 > e.byteLength || i + 2 > e.byteLength);
            s++
        )
            (n.variations.push({
                max_variation: {
                    value: e.getUint16(i),
                    offset: t + i,
                    length: 2,
                },
            }),
                (i += 2));
        return n;
    }
    function Qi(e, t) {
        let n = {},
            i = 0;
        ((n.mpegh3daProfileLevelIndication = {
            value: e.getUint8(i),
            offset: t + i,
            length: 1,
        }),
            (i += 1));
        let r = e.getUint16(i);
        return (
            (n.interactivityEnabled = {
                value: (r >> 15) & 1,
                offset: t + i,
                length: 0.125,
            }),
            (n.referenceChannelLayout = {
                value: r & 63,
                offset: t + i,
                length: 0.75,
            }),
            n
        );
    }
    function Ji(e, t) {
        return {
            mpegh3daConfig: {
                value: `${e.byteLength} bytes of config data`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function Zi(e, t) {
        return {
            scene_info: {
                value: `${e.byteLength} bytes of scene information`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function er(e, t) {
        return {
            text_label_info: {
                value: `${e.byteLength} bytes of text label information`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function tr(e, t) {
        return {
            multistream_info: {
                value: `${e.byteLength} bytes of multi-stream information`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function nr(e, t) {
        return {
            drc_loudness_info: {
                value: `${e.byteLength} bytes of DRC/Loudness information`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function ir(e, t) {
        return {
            command_data: {
                value: `${e.byteLength} bytes of command data`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function rr(e, t) {
        let n = {},
            i = 0;
        ((n.field_size_bytes = {
            value: e.getUint8(i),
            offset: t + i,
            length: 1,
        }),
            (i += 1));
        let r = e.getUint8(i);
        ((n.metric_count = { value: r, offset: t + i, length: 1 }),
            (i += 1),
            (n.metrics = []));
        for (
            let o = 0;
            o < r && !(i + 4 > e.byteLength || i + 4 > e.byteLength);
            o++
        ) {
            let l = e.getUint32(i);
            (n.metrics.push({
                metric_code: {
                    value: `0x${l.toString(16).padStart(8, '0')}`,
                    offset: t + i,
                    length: 4,
                },
            }),
                (i += 4));
        }
        return n;
    }
    function or(e, t) {
        let n = {},
            i = 0;
        if (e.byteLength < 1) return n;
        let r = e.getUint8(i),
            o = (r >> 5) & 7,
            l = (r >> 4) & 1;
        ((n.num_partitions = { value: o, offset: t + i, length: 0.375 }),
            (n.timescale_flag = { value: l, offset: t + i, length: 0.125 }),
            (i += 1));
        let a = -1;
        if (l) {
            let s = e.getUint32(i - 1);
            ((n.ticks_per_second = {
                value: (s >> 8) & 2097151,
                offset: t + i - 1,
                length: 2.625,
            }),
                (a = (e.getUint8(i + 2) >> 5) & 7),
                (n.maximum_duration_length_minus_1 = {
                    value: a,
                    offset: t + i + 2,
                    length: 0.375,
                }),
                (i += 3));
        }
        n.partitions = [];
        for (let s = 0; s < o && !(i + 2 > e.byteLength); s++) {
            let c = {},
                f = e.getUint8(i),
                d = e.getUint8(i + 1);
            if (
                ((c.explicit_boundary_flag = {
                    value: (f >> 7) & 1,
                    offset: t + i,
                    length: 0.125,
                }),
                (c.partition_id = {
                    value: (f >> 4) & 7,
                    offset: t + i,
                    length: 0.375,
                }),
                (c.SAP_type_max = {
                    value: d & 15,
                    offset: t + i + 1,
                    length: 0.5,
                }),
                (i += 2),
                c.explicit_boundary_flag.value === 0)
            ) {
                if (i + 2 > e.byteLength) break;
                ((c.boundary_PID = {
                    value: e.getUint16(i) & 8191,
                    offset: t + i,
                    length: 1.625,
                }),
                    (i += 2));
            } else {
                let p = a + 1;
                if (i + p > e.byteLength) break;
                ((c.maximum_duration = {
                    value: `${p} bytes of duration data`,
                    offset: t + i,
                    length: p,
                }),
                    (i += p));
            }
            n.partitions.push(c);
        }
        return n;
    }
    function sr(e, t) {
        let n = {},
            i = 0,
            r = e.getUint8(i),
            o = (r >> 7) & 1;
        if (
            ((n.ReferenceFlag = { value: o, offset: t + i, length: 0.125 }),
            (n.SubstreamID = { value: r & 127, offset: t + i, length: 0.875 }),
            (i += 1),
            e.byteLength > 1)
        )
            if (o === 1) {
                let l = e.getUint8(i);
                ((n.PreambleFlag = {
                    value: (l >> 7) & 1,
                    offset: t + i,
                    length: 0.125,
                }),
                    (n.PatternReference = {
                        value: l & 127,
                        offset: t + i,
                        length: 0.875,
                    }));
            } else
                for (n.additional_substreams = []; i < e.byteLength; ) {
                    let l = e.getUint8(i);
                    (n.additional_substreams.push({
                        Flag: {
                            value: (l >> 7) & 1,
                            offset: t + i,
                            length: 0.125,
                        },
                        AdditionalSubstreamID: {
                            value: l & 127,
                            offset: t + i,
                            length: 0.875,
                        },
                    }),
                        (i += 1));
                }
        return n;
    }
    function ar(e, t) {
        let n = {},
            i = 0,
            r = e.getUint8(i);
        ((n.SubstreamMarkingFlag = {
            value: (r >> 7) & 1,
            offset: t + i,
            length: 0.125,
        }),
            (n.SubstreamIDsPerLine = {
                value: r & 127,
                offset: t + i,
                length: 0.875,
            }),
            (i += 1),
            (n.TotalSubstreamIDs = {
                value: e.getUint8(i),
                offset: t + i,
                length: 1,
            }),
            (i += 1),
            (n.LevelFullPanorama = {
                value: e.getUint8(i),
                offset: t + i,
                length: 1,
            }),
            (i += 1));
        let o = e.byteLength - i;
        return (
            o > 0 &&
                (n.layout_data = {
                    value: `${o} bytes of layout data`,
                    offset: t + i,
                    length: o,
                }),
            n
        );
    }
    function lr(e, t) {
        let n = 'Extension Descriptor',
            i = e.getUint8(0),
            r = new DataView(e.buffer, e.byteOffset + 1, e.byteLength - 1),
            o = {
                extension_descriptor_tag: {
                    value: `0x${i.toString(16)}`,
                    offset: t,
                    length: 1,
                },
            };
        if (i === 2)
            ((n = 'Object Descriptor Update'),
                (o.ODUpdate_data = {
                    value: `${r.byteLength} bytes`,
                    offset: t + 1,
                    length: r.byteLength,
                }));
        else if (i === 3)
            ((n = 'HEVC Timing and HRD Descriptor'),
                Object.assign(o, qi(r, t + 1)));
        else if (i === 4)
            ((n = 'AF Extensions Descriptor'),
                (o.af_extensions_data = {
                    value: `${r.byteLength} bytes`,
                    offset: t + 1,
                    length: r.byteLength,
                }));
        else if (i === 5)
            ((n = 'HEVC Operation Point Descriptor'),
                Object.assign(o, Yi(r, t + 1)));
        else if (i === 6)
            ((n = 'HEVC Hierarchy Extension Descriptor'), Object.assign(o, {}));
        else if (i === 7)
            ((n = 'Green Extension Descriptor'),
                Object.assign(o, Ki(r, t + 1)));
        else if (i === 8)
            ((n = 'MPEG-H 3D Audio Descriptor'),
                Object.assign(o, Qi(r, t + 1)));
        else if (i === 9)
            ((n = 'MPEG-H 3D Audio Config Descriptor'),
                Object.assign(o, Ji(r, t + 1)));
        else if (i === 10)
            ((n = 'MPEG-H 3D Audio Scene Descriptor'),
                Object.assign(o, Zi(r, t + 1)));
        else if (i === 11)
            ((n = 'MPEG-H 3D Audio Text Label Descriptor'),
                Object.assign(o, er(r, t + 1)));
        else if (i === 12)
            ((n = 'MPEG-H 3D Audio Multi-stream Descriptor'),
                Object.assign(o, tr(r, t + 1)));
        else if (i === 13)
            ((n = 'MPEG-H 3D Audio DRC Loudness Descriptor'),
                Object.assign(o, nr(r, t + 1)));
        else if (i === 14)
            ((n = 'MPEG-H 3D Audio Command Descriptor'),
                Object.assign(o, ir(r, t + 1)));
        else if (i === 15)
            ((n = 'Quality Extension Descriptor'),
                Object.assign(o, rr(r, t + 1)));
        else if (i === 16)
            ((n = 'Virtual Segmentation Descriptor'),
                Object.assign(o, or(r, t + 1)));
        else if (i === 17)
            ((n = 'Timed Metadata Extension Descriptor'),
                (o.timed_metadata = {
                    value: `${r.byteLength} bytes`,
                    offset: t + 1,
                    length: r.byteLength,
                }));
        else if (i === 18)
            ((n = 'HEVC Tile Substream Descriptor'),
                Object.assign(o, sr(r, t + 1)));
        else if (i === 19)
            ((n = 'HEVC Subregion Descriptor'), Object.assign(o, ar(r, t + 1)));
        else {
            let l = e.byteLength - 1;
            l > 0 &&
                (o.reserved_data = {
                    value: `${l} bytes`,
                    offset: t + 1,
                    length: l,
                });
        }
        return { name: n, details: o };
    }
    function fr(e, t) {
        let n = e.getUint8(0),
            i = e.getUint8(1),
            r = e.byteLength - 2;
        return {
            Scope_of_IOD_label: {
                value: `0x${n.toString(16).padStart(2, '0')}`,
                offset: t,
                length: 1,
            },
            IOD_label: {
                value: `0x${i.toString(16).padStart(2, '0')}`,
                offset: t + 1,
                length: 1,
            },
            InitialObjectDescriptor: {
                value: `${r} bytes of InitialObjectDescriptor data`,
                offset: t + 2,
                length: r,
            },
        };
    }
    function cr(e, t) {
        return { ES_ID: { value: e.getUint16(0), offset: t, length: 2 } };
    }
    function dr(e, t) {
        let n = [];
        for (let i = 0; i < e.byteLength && !(i + 3 > e.byteLength); i += 3) {
            let r = e.getUint16(i),
                o = e.getUint8(i + 2);
            n.push({
                ES_ID: { value: r, offset: t + i, length: 2 },
                FlexMuxChannel: { value: o, offset: t + i + 2, length: 1 },
            });
        }
        return { entries: n };
    }
    function pr(e, t) {
        let n = e.getUint8(8),
            i = e.getUint8(9);
        return {
            width: { value: e.getUint16(0), offset: t, length: 2 },
            height: { value: e.getUint16(2), offset: t + 2, length: 2 },
            frame_rate: { value: e.getUint16(4), offset: t + 4, length: 2 },
            average_bitrate: {
                value: e.getUint16(6),
                offset: t + 6,
                length: 2,
            },
            maximum_bitrate: {
                value: e.getUint16(8),
                offset: t + 8,
                length: 2,
            },
            dependency_id: {
                value: (n >> 5) & 7,
                offset: t + 10,
                length: 0.375,
            },
            quality_id_start: {
                value: (n >> 1) & 15,
                offset: t + 10.5,
                length: 0.5,
            },
            quality_id_end: {
                value: ((n & 1) << 3) | (i >> 5),
                offset: t + 10.875,
                length: 0.5,
            },
            temporal_id_start: {
                value: (i >> 2) & 7,
                offset: t + 11.375,
                length: 0.375,
            },
            temporal_id_end: {
                value: ((i & 3) << 1) | (e.getUint8(10) >> 7),
                offset: t + 11.75,
                length: 0.375,
            },
            no_sei_nal_unit_present: {
                value: (e.getUint8(10) >> 6) & 1,
                offset: t + 12.125,
                length: 0.125,
            },
        };
    }
    function ur(e, t) {
        let n = e.getUint8(4);
        return {
            average_bit_rate: { value: e.getUint16(0), offset: t, length: 2 },
            maximum_bitrate: {
                value: e.getUint16(2),
                offset: t + 2,
                length: 2,
            },
            view_association_not_present: {
                value: (n >> 7) & 1,
                offset: t + 4,
                length: 0.125,
            },
            base_view_is_left_eyeview: {
                value: (n >> 6) & 1,
                offset: t + 4,
                length: 0.125,
            },
            view_order_index_min: {
                value: e.getUint16(5) >> 6,
                offset: t + 5,
                length: 1.25,
            },
            view_order_index_max: {
                value:
                    ((e.getUint16(6) & 64512) >> 6) |
                    ((e.getUint8(6) & 63) << 4),
                offset: t + 6,
                length: 1.25,
            },
            temporal_id_start: {
                value: (e.getUint8(8) >> 5) & 7,
                offset: t + 8,
                length: 0.375,
            },
            temporal_id_end: {
                value: (e.getUint8(8) >> 2) & 7,
                offset: t + 8,
                length: 0.375,
            },
            no_sei_nal_unit_present: {
                value: (e.getUint8(8) >> 1) & 1,
                offset: t + 8,
                length: 0.125,
            },
            no_prefix_nal_unit_present: {
                value: e.getUint8(8) & 1,
                offset: t + 8,
                length: 0.125,
            },
        };
    }
    function mr(e, t) {
        return {
            FCR_ES_ID: { value: e.getUint16(0), offset: t, length: 2 },
            FCRResolution: { value: e.getUint32(2), offset: t + 2, length: 4 },
            FCRLength: { value: e.getUint8(6), offset: t + 6, length: 1 },
            FmxRateLength: { value: e.getUint8(7), offset: t + 7, length: 1 },
        };
    }
    function gr(e, t) {
        return {
            MB_buffer_size: {
                value: e.getUint32(0) & 16777215,
                offset: t,
                length: 3,
            },
            TB_leak_rate: {
                value: e.getUint32(3) & 16777215,
                offset: t + 3,
                length: 3,
            },
        };
    }
    function hr(e, t) {
        let n = e.getUint8(0),
            i = (n >> 7) & 1,
            r = {
                stereo_video_arrangement_type_present: {
                    value: i,
                    offset: t,
                    length: 0.125,
                },
            };
        return (
            i &&
                (r.arrangement_type = {
                    value: n & 127,
                    offset: t,
                    length: 0.875,
                }),
            r
        );
    }
    function _r(e, t) {
        let i = e.getUint8(0) & 7;
        return {
            stereoscopic_service_type: {
                value:
                    {
                        1: '2D-only (monoscopic)',
                        2: 'Frame-compatible stereoscopic 3D',
                        3: 'Service-compatible stereoscopic 3D',
                    }[i] || `Reserved (${i})`,
                offset: t,
                length: 0.375,
            },
        };
    }
    function xr(e, t) {
        let i = e.getUint8(0) & 1,
            r = { base_video_flag: { value: i, offset: t, length: 0.125 } };
        if (i) {
            if (e.byteLength > 1) {
                let o = e.getUint8(1);
                r.leftview_flag = {
                    value: o & 1,
                    offset: t + 1,
                    length: 0.125,
                };
            }
        } else if (e.byteLength > 1) {
            let o = e.getUint8(1);
            ((r.usable_as_2D = {
                value: (o >> 7) & 1,
                offset: t + 1,
                length: 0.125,
            }),
                (r.horizontal_upsampling_factor = {
                    value: (o >> 3) & 15,
                    offset: t + 1,
                    length: 0.5,
                }),
                (r.vertical_upsampling_factor = {
                    value: ((o & 7) << 1) | (e.getUint8(2) >> 7),
                    offset: t + 1.625,
                    length: 0.5,
                }));
        }
        return r;
    }
    function yr(e, t) {
        let n = e.getUint8(0);
        return {
            transport_profile: {
                value:
                    { 1: 'Complete profile', 2: 'Adaptive profile' }[n] ||
                    `Reserved/User-Private (${n})`,
                offset: t,
                length: 1,
            },
        };
    }
    function Sr(e, t) {
        let n = e.getUint16(0),
            i = (n >> 15) & 1,
            r = n & 32767,
            o = {
                extended_capability_flag: {
                    value: i,
                    offset: t,
                    length: 0.125,
                },
                profile_and_level: {
                    value: `0x${r.toString(16).padStart(4, '0')}`,
                    offset: t,
                    length: 1.875,
                },
                horizontal_size: {
                    value: e.getUint32(2),
                    offset: t + 2,
                    length: 4,
                },
                vertical_size: {
                    value: e.getUint32(6),
                    offset: t + 6,
                    length: 4,
                },
                max_bit_rate: {
                    value: e.getUint32(10),
                    offset: t + 10,
                    length: 4,
                },
                max_buffer_size: {
                    value: e.getUint32(14),
                    offset: t + 14,
                    length: 4,
                },
                DEN_frame_rate: {
                    value: e.getUint16(18),
                    offset: t + 18,
                    length: 2,
                },
                NUM_frame_rate: {
                    value: e.getUint16(20),
                    offset: t + 20,
                    length: 2,
                },
            },
            l = 22;
        if (i) {
            let s = e.getUint8(l);
            ((o.stripe_flag = {
                value: (s >> 7) & 1,
                offset: t + l,
                length: 0.125,
            }),
                (o.block_flag = {
                    value: (s >> 6) & 1,
                    offset: t + l,
                    length: 0.125,
                }),
                (o.mdm_flag = {
                    value: (s >> 5) & 1,
                    offset: t + l,
                    length: 0.125,
                }),
                (l += 1));
        } else
            ((o.color_specification = {
                value: e.getUint8(l),
                offset: t + l,
                length: 1,
            }),
                (l += 1));
        let a = e.getUint8(l);
        if (
            ((o.still_mode = {
                value: (a >> 7) & 1,
                offset: t + l,
                length: 0.125,
            }),
            (o.interlaced_video = {
                value: (a >> 6) & 1,
                offset: t + l,
                length: 0.125,
            }),
            (l += 1),
            i)
        ) {
            ((o.colour_primaries = {
                value: e.getUint8(l),
                offset: t + l,
                length: 1,
            }),
                (l += 1),
                (o.transfer_characteristics = {
                    value: e.getUint8(l),
                    offset: t + l,
                    length: 1,
                }),
                (l += 1),
                (o.matrix_coefficients = {
                    value: e.getUint8(l),
                    offset: t + l,
                    length: 1,
                }),
                (l += 1));
            let s = e.getUint8(l);
            ((o.video_full_range_flag = {
                value: (s >> 7) & 1,
                offset: t + l,
                length: 0.125,
            }),
                (l += 1));
        }
        return o;
    }
    function br(e, t) {
        let n = e.getUint8(0),
            i = (n >> 7) & 1,
            r = n & 1,
            o = {
                hrd_management_valid_flag: {
                    value: i,
                    offset: t,
                    length: 0.125,
                },
                picture_and_timing_info_present: {
                    value: r,
                    offset: t,
                    length: 0.125,
                },
            },
            l = 1;
        if (r && e.byteLength > l) {
            let s = (e.getUint8(l) >> 7) & 1;
            ((o['90kHz_flag'] = { value: s, offset: t + l, length: 0.125 }),
                (l += 1),
                s === 0 &&
                    e.byteLength >= l + 8 &&
                    ((o.N = {
                        value: e.getUint32(l),
                        offset: t + l,
                        length: 4,
                    }),
                    (o.K = {
                        value: e.getUint32(l + 4),
                        offset: t + l + 4,
                        length: 4,
                    }),
                    (l += 8)),
                e.byteLength >= l + 4 &&
                    ((o.num_units_in_tick = {
                        value: e.getUint32(l),
                        offset: t + l,
                        length: 4,
                    }),
                    (l += 4)));
        }
        if (e.byteLength > l) {
            let a = e.getUint8(l);
            ((o.fixed_frame_rate_flag = {
                value: (a >> 7) & 1,
                offset: t + l,
                length: 0.125,
            }),
                (o.temporal_poc_flag = {
                    value: (a >> 6) & 1,
                    offset: t + l,
                    length: 0.125,
                }),
                (o.picture_to_display_conversion_flag = {
                    value: (a >> 5) & 1,
                    offset: t + l,
                    length: 0.125,
                }));
        }
        return o;
    }
    function vr(e, t) {
        let n = {},
            i = 0;
        ((n.metadata_application_format = {
            value: e.getUint16(i),
            offset: t + i,
            length: 2,
        }),
            (i += 2),
            n.metadata_application_format.value === 65535 &&
                ((n.metadata_application_format_identifier = {
                    value: e.getUint32(i),
                    offset: t + i,
                    length: 4,
                }),
                (i += 4)));
        let r = e.getUint8(i);
        if (
            ((n.content_reference_id_record_flag = {
                value: (r >> 7) & 1,
                offset: t + i,
                length: 0.125,
            }),
            (n.content_time_base_indicator = {
                value: (r >> 3) & 15,
                offset: t + i,
                length: 0.5,
            }),
            (i += 1),
            n.content_reference_id_record_flag.value)
        ) {
            let l = e.getUint8(i);
            ((n.content_reference_id_record_length = {
                value: l,
                offset: t + i,
                length: 1,
            }),
                (i += 1),
                (n.content_reference_id_record = {
                    value: `${l} bytes`,
                    offset: t + i,
                    length: l,
                }),
                (i += l));
        }
        if (
            n.content_time_base_indicator.value === 1 ||
            n.content_time_base_indicator.value === 2
        ) {
            let l = e.getUint8(i) & 1,
                a = e.getUint32(i + 1);
            ((n.content_time_base_value = {
                value: ((BigInt(l) << 32n) | BigInt(a)).toString(),
                offset: t + i,
                length: 5,
            }),
                (i += 5));
            let s = e.getUint8(i) & 1,
                c = e.getUint32(i + 1);
            ((n.metadata_time_base_value = {
                value: ((BigInt(s) << 32n) | BigInt(c)).toString(),
                offset: t + i,
                length: 5,
            }),
                (i += 5),
                n.content_time_base_indicator.value === 2 &&
                    ((n.contentId = {
                        value: e.getUint8(i) & 127,
                        offset: t + i,
                        length: 1,
                    }),
                    (i += 1)));
        }
        if (
            n.content_time_base_indicator.value >= 3 &&
            n.content_time_base_indicator.value <= 7
        ) {
            let l = e.getUint8(i);
            ((n.time_base_association_data_length = {
                value: l,
                offset: t + i,
                length: 1,
            }),
                (i += 1),
                (n.time_base_association_data = {
                    value: `${l} bytes`,
                    offset: t + i,
                    length: l,
                }),
                (i += l));
        }
        let o = e.byteLength - i;
        return (
            o > 0 &&
                (n.private_data = {
                    value: `${o} bytes`,
                    offset: t + i,
                    length: o,
                }),
            n
        );
    }
    function Cr(e, t) {
        let n = {},
            i = 0;
        ((n.metadata_application_format = {
            value: e.getUint16(i),
            offset: t + i,
            length: 2,
        }),
            (i += 2),
            n.metadata_application_format.value === 65535 &&
                ((n.metadata_application_format_identifier = {
                    value: e.getUint32(i),
                    offset: t + i,
                    length: 4,
                }),
                (i += 4)),
            (n.metadata_format = {
                value: e.getUint8(i),
                offset: t + i,
                length: 1,
            }),
            (i += 1),
            n.metadata_format.value === 255 &&
                ((n.metadata_format_identifier = {
                    value: e.getUint32(i),
                    offset: t + i,
                    length: 4,
                }),
                (i += 4)),
            (n.metadata_service_id = {
                value: e.getUint8(i),
                offset: t + i,
                length: 1,
            }),
            (i += 1));
        let r = e.getUint8(i);
        if (
            ((n.metadata_locator_record_flag = {
                value: (r >> 7) & 1,
                offset: t + i,
                length: 0.125,
            }),
            (n.MPEG_carriage_flags = {
                value: (r >> 5) & 3,
                offset: t + i,
                length: 0.25,
            }),
            (i += 1),
            n.metadata_locator_record_flag.value)
        ) {
            let l = e.getUint8(i);
            ((n.metadata_locator_record_length = {
                value: l,
                offset: t + i,
                length: 1,
            }),
                (i += 1),
                (n.metadata_locator_record = {
                    value: `${l} bytes`,
                    offset: t + i,
                    length: l,
                }),
                (i += l));
        }
        (n.MPEG_carriage_flags.value <= 2 &&
            ((n.program_number = {
                value: e.getUint16(i),
                offset: t + i,
                length: 2,
            }),
            (i += 2)),
            n.MPEG_carriage_flags.value === 1 &&
                ((n.transport_stream_location = {
                    value: e.getUint16(i),
                    offset: t + i,
                    length: 2,
                }),
                (i += 2),
                (n.transport_stream_id = {
                    value: e.getUint16(i),
                    offset: t + i,
                    length: 2,
                }),
                (i += 2)));
        let o = e.byteLength - i;
        return (
            o > 0 &&
                (n.private_data = {
                    value: `${o} bytes`,
                    offset: t + i,
                    length: o,
                }),
            n
        );
    }
    function Ir(e, t) {
        let n = {},
            i = 0;
        ((n.metadata_application_format = {
            value: e.getUint16(i),
            offset: t + i,
            length: 2,
        }),
            (i += 2),
            n.metadata_application_format.value === 65535 &&
                ((n.metadata_application_format_identifier = {
                    value: e.getUint32(i),
                    offset: t + i,
                    length: 4,
                }),
                (i += 4)),
            (n.metadata_format = {
                value: e.getUint8(i),
                offset: t + i,
                length: 1,
            }),
            (i += 1),
            n.metadata_format.value === 255 &&
                ((n.metadata_format_identifier = {
                    value: e.getUint32(i),
                    offset: t + i,
                    length: 4,
                }),
                (i += 4)),
            (n.metadata_service_id = {
                value: e.getUint8(i),
                offset: t + i,
                length: 1,
            }),
            (i += 1));
        let r = e.getUint8(i);
        if (
            ((n.decoder_config_flags = {
                value: (r >> 5) & 7,
                offset: t + i,
                length: 0.375,
            }),
            (n.DSM_CC_flag = {
                value: (r >> 4) & 1,
                offset: t + i,
                length: 0.125,
            }),
            (i += 1),
            n.DSM_CC_flag.value)
        ) {
            let a = e.getUint8(i);
            ((n.service_identification_length = {
                value: a,
                offset: t + i,
                length: 1,
            }),
                (i += 1),
                (n.service_identification_record = {
                    value: `${a} bytes`,
                    offset: t + i,
                    length: a,
                }),
                (i += a));
        }
        let o = n.decoder_config_flags.value;
        if (o === 1) {
            let a = e.getUint8(i);
            ((n.decoder_config_length = { value: a, offset: t + i, length: 1 }),
                (i += 1),
                (n.decoder_config = {
                    value: `${a} bytes`,
                    offset: t + i,
                    length: a,
                }),
                (i += a));
        } else if (o === 3) {
            let a = e.getUint8(i);
            ((n.dec_config_identification_record_length = {
                value: a,
                offset: t + i,
                length: 1,
            }),
                (i += 1),
                (n.dec_config_identification_record = {
                    value: `${a} bytes`,
                    offset: t + i,
                    length: a,
                }),
                (i += a));
        } else
            o === 4 &&
                ((n.decoder_config_metadata_service_id = {
                    value: e.getUint8(i),
                    offset: t + i,
                    length: 1,
                }),
                (i += 1));
        let l = e.byteLength - i;
        return (
            l > 0 &&
                (n.private_data = {
                    value: `${l} bytes`,
                    offset: t + i,
                    length: l,
                }),
            n
        );
    }
    function Tr(e, t) {
        let n = {},
            i = 0,
            r = e.getUint8(i),
            o = e.getUint8(i + 1),
            l = e.getUint8(i + 2);
        ((n.metadata_input_leak_rate = {
            value: ((r & 63) << 16) | (o << 8) | l,
            offset: t + i,
            length: 3,
        }),
            (i += 3));
        let a = e.getUint8(i),
            s = e.getUint8(i + 1),
            c = e.getUint8(i + 2);
        ((n.metadata_buffer_size = {
            value: ((a & 63) << 16) | (s << 8) | c,
            offset: t + i,
            length: 3,
        }),
            (i += 3));
        let f = e.getUint8(i),
            d = e.getUint8(i + 1),
            p = e.getUint8(i + 2);
        return (
            (n.metadata_output_leak_rate = {
                value: ((f & 63) << 16) | (d << 8) | p,
                offset: t + i,
                length: 3,
            }),
            n
        );
    }
    function Er(e, t) {
        let n = e.getUint8(0),
            i = e.getUint8(1),
            r = e.getUint8(2),
            o = {
                0: 'Main Profile',
                1: 'Low Complexity Profile (LC)',
                2: 'Scalable Sample Rate Profile (SSR)',
                3: 'Reserved',
            },
            l = {
                1: '1 channel (mono)',
                2: '2 channels (stereo)',
                3: '3 channels (front: C, L, R)',
                4: '4 channels (front: C, L, R; back: C)',
                5: '5 channels (front: C, L, R; back: L, R)',
                6: '5.1 channels (front: C, L, R; back: L, R; LFE)',
            },
            a = {
                0: 'AAC data according to ISO/IEC 13818-7',
                1: 'AAC data with Bandwidth Extension data present',
            };
        return {
            MPEG_2_AAC_profile: {
                value: `${o[n] || 'Reserved'} (${n})`,
                offset: t,
                length: 1,
            },
            MPEG_2_AAC_channel_configuration: {
                value: `${l[i] || 'Undefined'} (${i})`,
                offset: t + 1,
                length: 1,
            },
            MPEG_2_AAC_additional_information: {
                value: `${a[r] || 'Reserved'} (0x${r.toString(16).padStart(2, '0')})`,
                offset: t + 2,
                length: 1,
            },
        };
    }
    function Pr(e, t) {
        let n = {},
            i = 0,
            r = e.getUint8(i),
            o = (r >> 7) & 1,
            l = r & 15;
        ((n.ASC_flag = { value: o, offset: t + i, length: 0.125 }),
            (n.num_of_loops = { value: l, offset: t + i, length: 0.5 }),
            (i += 1));
        for (let a = 0; a < l && !(i >= e.byteLength); a++) {
            let s = e.getUint8(i);
            ((n[`audioProfileLevelIndication_${a + 1}`] = {
                value: `0x${s.toString(16).padStart(2, '0')}`,
                offset: t + i,
                length: 1,
            }),
                (i += 1));
        }
        if (o && i < e.byteLength) {
            let a = e.getUint8(i);
            ((n.ASC_size = { value: a, offset: t + i, length: 1 }),
                (i += 1),
                i + a <= e.byteLength &&
                    (n.audioSpecificConfig = {
                        value: `${a} bytes of AudioSpecificConfig data`,
                        offset: t + i,
                        length: a,
                    }));
        }
        return n;
    }
    function Ar(e, t) {
        let n = e.getUint8(0),
            i = e.byteLength - 1;
        return {
            aux_video_codedstreamtype: {
                value: `0x${n.toString(16).padStart(2, '0')}`,
                offset: t,
                length: 1,
            },
            si_rbsp_data: {
                value: `${i} bytes of Supplemental Information RBSP`,
                offset: t + 1,
                length: i,
            },
        };
    }
    function Ur(e, t) {
        return {
            External_ES_ID: { value: e.getUint16(0), offset: t, length: 2 },
        };
    }
    function Dr(e, t) {
        return {
            mux_code_table_entry_data: {
                value: `${e.byteLength} bytes of MuxCodeTableEntry data`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function kr(e, t) {
        return {
            fmx_buffer_size_data: {
                value: `${e.byteLength} bytes of FlexMux Buffer Size data`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function Mr(e, t) {
        return {
            ipmp_data: {
                value: `${e.byteLength} bytes of IPMP data`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function wr(e, t) {
        let n = {},
            i = 0;
        ((n.profile_idc = { value: e.getUint8(i), offset: t + i, length: 1 }),
            (i += 1));
        let r = e.getUint8(i);
        ((n.constraint_set0_flag = {
            value: (r >> 7) & 1,
            offset: t + i,
            length: 0.125,
        }),
            (n.constraint_set1_flag = {
                value: (r >> 6) & 1,
                offset: t + i,
                length: 0.125,
            }),
            (n.constraint_set2_flag = {
                value: (r >> 5) & 1,
                offset: t + i,
                length: 0.125,
            }),
            (n.constraint_set3_flag = {
                value: (r >> 4) & 1,
                offset: t + i,
                length: 0.125,
            }),
            (n.constraint_set4_flag = {
                value: (r >> 3) & 1,
                offset: t + i,
                length: 0.125,
            }),
            (n.constraint_set5_flag = {
                value: (r >> 2) & 1,
                offset: t + i,
                length: 0.125,
            }),
            (n.AVC_compatible_flags = {
                value: r & 3,
                offset: t + i,
                length: 0.25,
            }),
            (i += 1));
        let o = e.getUint8(i);
        ((n.level_count = { value: o, offset: t + i, length: 1 }),
            (i += 1),
            (n.levels = []));
        for (let l = 0; l < o && !(i + 2 > e.byteLength); l++) {
            let a = {
                level_idc: { value: e.getUint8(i), offset: t + i, length: 1 },
                operation_points: [],
            };
            i += 1;
            let s = e.getUint8(i);
            ((a.operation_points_count = {
                value: s,
                offset: t + i,
                length: 1,
            }),
                (i += 1));
            for (let c = 0; c < s && !(i + 3 > e.byteLength); c++) {
                let d = {
                    applicable_temporal_id: {
                        value: e.getUint8(i) & 7,
                        offset: t + i,
                        length: 0.375,
                    },
                    num_target_output_views: {
                        value: e.getUint8(i + 1),
                        offset: t + i + 1,
                        length: 1,
                    },
                    es_references: [],
                };
                i += 2;
                let p = e.getUint8(i);
                ((d.ES_count = { value: p, offset: t + i, length: 1 }),
                    (i += 1));
                for (let u = 0; u < p && !(i + 1 > e.byteLength); u++) {
                    let h = e.getUint8(i);
                    (d.es_references.push({
                        ES_reference: {
                            value: h & 63,
                            offset: t + i,
                            length: 0.75,
                        },
                    }),
                        (i += 1));
                }
                a.operation_points.push(d);
            }
            n.levels.push(a);
        }
        return n;
    }
    function q(e, t, n = null) {
        let i = [],
            r = 0,
            o = n ? parseInt(n, 16) : null;
        for (
            ;
            r < e.byteLength &&
            !(r + 2 > e.byteLength || r + 2 + a > e.byteLength);

        ) {
            let l = e.getUint8(r),
                a = e.getUint8(r + 1);
            if (r + 2 + a > e.byteLength) break;
            let s = new DataView(e.buffer, e.byteOffset + r + 2, a),
                c = t + r + 2,
                f,
                d = 'Unknown/Private Descriptor';
            switch (l) {
                case 2:
                    ((d = 'Video Stream Descriptor'), (f = Ei(s, c)));
                    break;
                case 3:
                    ((d = 'Audio Stream Descriptor'), (f = Pi(s, c)));
                    break;
                case 4:
                    ((d = 'Hierarchy Descriptor'), (f = Ai(s, c)));
                    break;
                case 5:
                    ((d = 'Registration Descriptor'), (f = Ui(s, c)));
                    break;
                case 6:
                    ((d = 'Data Stream Alignment Descriptor'),
                        (f = Di(s, c, o)));
                    break;
                case 7:
                    ((d = 'Target Background Grid Descriptor'), (f = ki(s, c)));
                    break;
                case 8:
                    ((d = 'Video Window Descriptor'), (f = Mi(s, c)));
                    break;
                case 9:
                    ((d = 'Conditional Access Descriptor'), (f = wi(s, c)));
                    break;
                case 10:
                    ((d = 'ISO 639 Language Descriptor'), (f = Li(s, c)));
                    break;
                case 11:
                    ((d = 'System Clock Descriptor'), (f = Bi(s, c)));
                    break;
                case 12:
                    ((d = 'Multiplex Buffer Utilization Descriptor'),
                        (f = Ri(s, c)));
                    break;
                case 13:
                    ((d = 'Copyright Descriptor'), (f = zi(s, c)));
                    break;
                case 14:
                    ((d = 'Maximum Bitrate Descriptor'), (f = Ni(s, c)));
                    break;
                case 15:
                    ((d = 'Private Data Indicator Descriptor'), (f = Fi(s, c)));
                    break;
                case 16:
                    ((d = 'Smoothing Buffer Descriptor'), (f = Vi(s, c)));
                    break;
                case 17:
                    ((d = 'STD Descriptor'), (f = $i(s, c)));
                    break;
                case 18:
                    ((d = 'IBP Descriptor'), (f = Hi(s, c)));
                    break;
                case 27:
                    ((d = 'MPEG-4 Video Descriptor'), (f = Oi(s, c)));
                    break;
                case 28:
                    ((d = 'MPEG-4 Audio Descriptor'), (f = Xi(s, c)));
                    break;
                case 29:
                    ((d = 'IOD Descriptor'), (f = fr(s, c)));
                    break;
                case 30:
                    ((d = 'SL Descriptor'), (f = cr(s, c)));
                    break;
                case 31:
                    ((d = 'FMC Descriptor'), (f = dr(s, c)));
                    break;
                case 32:
                    ((d = 'External ES_ID Descriptor'), (f = Ur(s, c)));
                    break;
                case 33:
                    ((d = 'MuxCode Descriptor'), (f = Dr(s, c)));
                    break;
                case 34:
                    ((d = 'FmxBufferSize Descriptor'), (f = kr(s, c)));
                    break;
                case 35:
                    ((d = 'MultiplexBuffer Descriptor'), (f = gr(s, c)));
                    break;
                case 36:
                    ((d = 'Content Labeling Descriptor'), (f = vr(s, c)));
                    break;
                case 37:
                    ((d = 'Metadata Pointer Descriptor'), (f = Cr(s, c)));
                    break;
                case 38:
                    ((d = 'Metadata Descriptor'), (f = Ir(s, c)));
                    break;
                case 39:
                    ((d = 'Metadata STD Descriptor'), (f = Tr(s, c)));
                    break;
                case 40:
                    ((d = 'AVC Video Descriptor'), (f = ji(s, c)));
                    break;
                case 41:
                    ((d = 'IPMP Descriptor'), (f = Mr(s, c)));
                    break;
                case 42:
                    ((d = 'AVC Timing and HRD Descriptor'), (f = br(s, c)));
                    break;
                case 43:
                    ((d = 'MPEG-2 AAC Audio Descriptor'), (f = Er(s, c)));
                    break;
                case 44:
                    ((d = 'FlexMuxTiming Descriptor'), (f = mr(s, c)));
                    break;
                case 45:
                    ((d = 'MPEG-4 Text Descriptor'), (f = Gi(s, c)));
                    break;
                case 46:
                    ((d = 'MPEG-4 Audio Extension Descriptor'), (f = Pr(s, c)));
                    break;
                case 47:
                    ((d = 'Auxiliary Video Stream Descriptor'), (f = Ar(s, c)));
                    break;
                case 48:
                    ((d = 'SVC Extension Descriptor'), (f = pr(s, c)));
                    break;
                case 49:
                    ((d = 'MVC Extension Descriptor'), (f = ur(s, c)));
                    break;
                case 50:
                    ((d = 'J2K Video Descriptor'), (f = Sr(s, c)));
                    break;
                case 51:
                    ((d = 'MVC Operation Point Descriptor'), (f = wr(s, c)));
                    break;
                case 52:
                    ((d = 'MPEG-2 Stereoscopic Video Format Descriptor'),
                        (f = hr(s, c)));
                    break;
                case 53:
                    ((d = 'Stereoscopic Program Info Descriptor'),
                        (f = _r(s, c)));
                    break;
                case 54:
                    ((d = 'Stereoscopic Video Info Descriptor'),
                        (f = xr(s, c)));
                    break;
                case 55:
                    ((d = 'Transport Profile Descriptor'), (f = yr(s, c)));
                    break;
                case 56:
                    ((d = 'HEVC Video Descriptor'), (f = Wi(s, c)));
                    break;
                case 99: {
                    ({ name: d, details: f } = lr(s, c));
                    break;
                }
                default:
                    f = { data: { value: `${a} bytes`, offset: c, length: a } };
                    break;
            }
            (i.push({ tag: l, length: a, name: d, details: f }), (r += 2 + a));
        }
        return i;
    }
    function Lr(e, t) {
        let n = e.getUint16(0) & 8191,
            i = e.getUint16(2) & 4095,
            r = new DataView(e.buffer, e.byteOffset + 4, i),
            o = q(r, t + 4),
            l = [],
            a = 4 + i;
        for (; a < e.byteLength && !(a + 5 > e.byteLength); ) {
            let s = e.getUint8(a),
                c = e.getUint16(a + 1) & 8191,
                f = e.getUint16(a + 3) & 4095,
                d = new DataView(e.buffer, e.byteOffset + a + 5, f),
                p = q(d, t + a + 5);
            (l.push({
                stream_type: {
                    value: `0x${s.toString(16).padStart(2, '0')}`,
                    offset: t + a,
                    length: 1,
                },
                elementary_PID: { value: c, offset: t + a + 1, length: 1.625 },
                es_info_length: { value: f, offset: t + a + 3, length: 1.5 },
                es_descriptors: p,
            }),
                (a += 5 + f));
        }
        return {
            type: 'PMT',
            pcr_pid: { value: n, offset: t, length: 1.625 },
            program_descriptors: o,
            streams: l,
        };
    }
    var Br = {
        PMT: {
            text: 'Program Map Table. Lists all elementary streams (video, audio, etc.) that constitute a single program.',
            ref: 'Clause 2.4.4.9',
        },
        'PMT@pcr_pid': {
            text: 'The PID of the transport stream packets that carry the PCR fields valid for this program.',
            ref: 'Table 2-33',
        },
        'PMT@stream_type': {
            text: 'An 8-bit field specifying the type of the elementary stream.',
            ref: 'Table 2-34',
        },
        'PMT@elementary_PID': {
            text: 'The PID of the transport stream packets that carry the elementary stream data.',
            ref: 'Table 2-33',
        },
    };
    function Rr(e, t) {
        return { type: 'CAT', descriptors: q(e, t) };
    }
    var zr = {
        CAT: {
            text: 'Conditional Access Table. Provides information on CA systems used in the multiplex.',
            ref: 'Clause 2.4.4.7',
        },
    };
    function Nr(e, t) {
        return { type: 'TSDT', descriptors: q(e, t) };
    }
    var Fr = {
        TSDT: {
            text: 'Transport Stream Description Table. Contains descriptors that apply to the entire transport stream.',
            ref: 'Clause 2.4.4.13',
        },
    };
    function Vr(e, t, n, i) {
        if (n === 0)
            return {
                type: 'Private Section (short)',
                private_data: {
                    value: `${e.byteLength} bytes of private data`,
                    offset: t,
                    length: e.byteLength,
                },
            };
        let r = e.getUint16(0),
            o = e.getUint8(2),
            l = (o >> 1) & 31,
            a = o & 1,
            s = e.getUint8(3),
            c = e.getUint8(4),
            f = 5,
            d = i - (f + 4),
            p = {
                value: `${d} bytes of private data`,
                offset: t + f,
                length: d,
            };
        return {
            type: 'Private Section (long)',
            table_id_extension: { value: r, offset: t, length: 2 },
            version_number: { value: l, offset: t + 2, length: 0.625 },
            current_next_indicator: { value: a, offset: t + 2, length: 0.125 },
            section_number: { value: s, offset: t + 3, length: 1 },
            last_section_number: { value: c, offset: t + 4, length: 1 },
            private_data: p,
        };
    }
    var $r = {
        'Private Section': {
            text: 'A section containing user-defined private data. The structure and meaning of this data is not defined by the MPEG-2 specification.',
            ref: 'Clause 2.4.4.11',
        },
    };
    function Hr(e, t) {
        return {
            type: 'IPMP-CIT',
            info: {
                value: 'IPMP Control Information Table present.',
                offset: t,
                length: e.byteLength,
            },
        };
    }
    var Or = {
        'IPMP-CIT': {
            text: 'IPMP Control Information Table. Contains information for Intellectual Property Management and Protection systems.',
            ref: 'Clause 2.4.4.1, ISO/IEC 13818-11',
        },
    };
    function hs(e) {
        let t = e.getUint8(0),
            n = e.getUint8(1),
            i = e.getUint8(2),
            r = e.getUint8(3),
            o = e.getUint8(4),
            l = e.getUint8(5),
            a = BigInt(t & 56) >> 3n,
            s =
                (BigInt(t & 3) << 13n) |
                (BigInt(n) << 5n) |
                (BigInt(i >> 3) & 0x1fn),
            c =
                (BigInt(i & 3) << 13n) |
                (BigInt(r) << 5n) |
                (BigInt(o >> 3) & 0x1fn),
            f = (a << 30n) | (s << 15n) | c,
            d = ((BigInt(o) & 0x03n) << 7n) | BigInt(l >> 1);
        return f * 300n + d;
    }
    function Xr(e, t) {
        let n = {},
            i = 0;
        ((n.pack_start_code = {
            value: `0x${e.getUint32(0).toString(16)}`,
            offset: t,
            length: 4,
        }),
            (i += 4));
        let r = new DataView(e.buffer, e.byteOffset + i, 6);
        ((n.system_clock_reference = {
            value: hs(r).toString(),
            offset: t + i,
            length: 6,
        }),
            (i += 6));
        let o =
            (e.getUint8(i) << 14) |
            (e.getUint8(i + 1) << 6) |
            (e.getUint8(i + 2) >> 2);
        ((n.program_mux_rate = { value: o, offset: t + i, length: 3 }),
            (i += 3));
        let l = e.getUint8(i - 1) & 7;
        return (
            (n.pack_stuffing_length = {
                value: l,
                offset: t + i - 1,
                length: 0.375,
            }),
            l > 0 &&
                (n.stuffing_bytes = {
                    value: `${l} bytes`,
                    offset: t + i,
                    length: l,
                }),
            n
        );
    }
    function ce(e, t) {
        let n = e.getUint8(t),
            i = e.getUint8(t + 1),
            r = e.getUint8(t + 2),
            o = e.getUint8(t + 3),
            l = e.getUint8(t + 4),
            a = BigInt((n & 14) >> 1),
            s = BigInt((i << 7) | (r >> 1)),
            c = BigInt((o << 7) | (l >> 1));
        return (a << 30n) | (s << 15n) | c;
    }
    function _s(e, t) {
        let n = e.getUint8(t),
            i = e.getUint8(t + 1),
            r = e.getUint8(t + 2),
            o = e.getUint8(t + 3),
            l = e.getUint8(t + 4),
            a = e.getUint8(t + 5),
            s = (n >> 3) & 7,
            c = ((n & 3) << 13) | (i << 5) | (r >> 3),
            f = ((r & 7) << 12) | (o << 4) | (l >> 4),
            d = (BigInt(high) << 30n) | (BigInt(c) << 15n) | BigInt(f),
            p = ((l & 15) << 5) | (a >> 3);
        return d * 300n + BigInt(p);
    }
    function Gr(e, t) {
        if (e.byteLength < 6 || e.getUint32(0) >>> 8 !== 1) return null;
        let n = e.getUint8(3),
            i = e.getUint16(4),
            r = {
                packet_start_code_prefix: {
                    value: '0x000001',
                    offset: t,
                    length: 3,
                },
                stream_id: {
                    value: `0x${n.toString(16).padStart(2, '0')}`,
                    offset: t + 3,
                    length: 1,
                },
                pes_packet_length: { value: i, offset: t + 4, length: 2 },
            };
        if (
            n === 188 ||
            n === 190 ||
            n === 191 ||
            n === 240 ||
            n === 241 ||
            n === 255 ||
            n === 242 ||
            n === 248
        )
            return { header: r, payloadOffset: 6 };
        if (e.byteLength < 9) return { header: r, payloadOffset: 6 };
        let l = e.getUint8(6),
            a = e.getUint8(7),
            s = e.getUint8(8),
            c = 9 + s,
            f = 9 + s;
        ((r.marker_bits_2 = {
            value: (l >> 6) & 3,
            offset: t + 6,
            length: 0.25,
        }),
            (r.scrambling_control = {
                value: (l >> 4) & 3,
                offset: t + 6,
                length: 0.25,
            }),
            (r.priority = {
                value: (l >> 3) & 1,
                offset: t + 6,
                length: 0.125,
            }),
            (r.data_alignment_indicator = {
                value: (l >> 2) & 1,
                offset: t + 6,
                length: 0.125,
            }),
            (r.copyright = {
                value: (l >> 1) & 1,
                offset: t + 6,
                length: 0.125,
            }),
            (r.original_or_copy = {
                value: l & 1,
                offset: t + 6,
                length: 0.125,
            }));
        let d = (a >> 6) & 3,
            p = (a >> 5) & 1,
            u = (a >> 4) & 1,
            h = (a >> 3) & 1,
            _ = (a >> 2) & 1,
            x = (a >> 1) & 1,
            S = a & 1;
        ((r.pts_dts_flags = { value: d, offset: t + 7, length: 0.25 }),
            (r.escr_flag = { value: p, offset: t + 7, length: 0.125 }),
            (r.es_rate_flag = { value: u, offset: t + 7, length: 0.125 }),
            (r.dsm_trick_mode_flag = {
                value: h,
                offset: t + 7,
                length: 0.125,
            }),
            (r.additional_copy_info_flag = {
                value: _,
                offset: t + 7,
                length: 0.125,
            }),
            (r.pes_crc_flag = { value: x, offset: t + 7, length: 0.125 }),
            (r.pes_extension_flag = { value: S, offset: t + 7, length: 0.125 }),
            (r.pes_header_data_length = {
                value: s,
                offset: t + 8,
                length: 1,
            }));
        let m = 9;
        if (
            (d === 2 && m + 5 <= f
                ? ((r.pts = {
                      value: ce(e, m).toString(),
                      offset: t + m,
                      length: 5,
                  }),
                  (m += 5))
                : d === 3 &&
                  m + 10 <= f &&
                  ((r.pts = {
                      value: ce(e, m).toString(),
                      offset: t + m,
                      length: 5,
                  }),
                  (r.dts = {
                      value: ce(e, m + 5).toString(),
                      offset: t + m + 5,
                      length: 5,
                  }),
                  (m += 10)),
            p &&
                m + 6 <= f &&
                ((r.ESCR = {
                    value: _s(e, m).toString(),
                    offset: t + m,
                    length: 6,
                }),
                (m += 6)),
            u && m + 3 <= f)
        ) {
            let b = e.getUint32(m - 1);
            ((r.ES_rate = {
                value: (b >> 1) & 4194303,
                offset: t + m,
                length: 3,
            }),
                (m += 3));
        }
        if (h && m + 1 <= f) {
            let b = e.getUint8(m),
                v = (b >> 5) & 7;
            switch (
                ((r.trick_mode_control = {
                    value: v,
                    offset: t + m,
                    length: 0.375,
                }),
                v)
            ) {
                case 0:
                case 3:
                    ((r.field_id = {
                        value: (b >> 3) & 3,
                        offset: t + m,
                        length: 0.25,
                    }),
                        (r.intra_slice_refresh = {
                            value: (b >> 2) & 1,
                            offset: t + m,
                            length: 0.125,
                        }),
                        (r.frequency_truncation = {
                            value: b & 3,
                            offset: t + m,
                            length: 0.25,
                        }));
                    break;
                case 1:
                case 4:
                    r.rep_cntrl = {
                        value: b & 31,
                        offset: t + m,
                        length: 0.625,
                    };
                    break;
                case 2:
                    r.field_id = {
                        value: (b >> 3) & 3,
                        offset: t + m,
                        length: 0.25,
                    };
                    break;
            }
            m += 1;
        }
        if (
            (_ &&
                m + 1 <= f &&
                ((r.additional_copy_info = {
                    value: e.getUint8(m) & 127,
                    offset: t + m,
                    length: 1,
                }),
                (m += 1)),
            x &&
                m + 2 <= f &&
                ((r.previous_PES_packet_CRC = {
                    value: e.getUint16(m),
                    offset: t + m,
                    length: 2,
                }),
                (m += 2)),
            S && m + 1 <= f)
        ) {
            let b = e.getUint8(m),
                v = (b >> 7) & 1,
                D = (b >> 6) & 1,
                P = (b >> 5) & 1,
                V = (b >> 4) & 1,
                $ = b & 1;
            if (
                ((r.PES_private_data_flag = {
                    value: v,
                    offset: t + m,
                    length: 0.125,
                }),
                (r.pack_header_field_flag = {
                    value: D,
                    offset: t + m,
                    length: 0.125,
                }),
                (r.program_packet_sequence_counter_flag = {
                    value: P,
                    offset: t + m,
                    length: 0.125,
                }),
                (r.P_STD_buffer_flag = {
                    value: V,
                    offset: t + m,
                    length: 0.125,
                }),
                (r.PES_extension_flag_2 = {
                    value: $,
                    offset: t + m,
                    length: 0.125,
                }),
                (m += 1),
                v &&
                    m + 16 <= f &&
                    ((r.PES_private_data = {
                        value: '128 bits of private data',
                        offset: t + m,
                        length: 16,
                    }),
                    (m += 16)),
                D && m + 1 <= f)
            ) {
                let E = e.getUint8(m);
                if (
                    ((r.pack_field_length = {
                        value: E,
                        offset: t + m,
                        length: 1,
                    }),
                    (m += 1),
                    m + E <= f)
                ) {
                    let A = new DataView(e.buffer, e.byteOffset + m, E);
                    ((r.pack_header = Xr(A, t + m)), (m += E));
                }
            }
            if (P && m + 2 <= f) {
                let E = e.getUint8(m),
                    A = e.getUint8(m + 1);
                ((r.program_packet_sequence_counter = {
                    value: E & 127,
                    offset: t + m,
                    length: 1,
                }),
                    (r.MPEG1_MPEG2_identifier = {
                        value: (A >> 6) & 1,
                        offset: t + m + 1,
                        length: 0.125,
                    }),
                    (r.original_stuff_length = {
                        value: A & 63,
                        offset: t + m + 1,
                        length: 0.75,
                    }),
                    (m += 2));
            }
            if (V && m + 2 <= f) {
                let E = e.getUint16(m);
                ((r.P_STD_buffer_scale = {
                    value: (E >> 13) & 1,
                    offset: t + m,
                    length: 0.125,
                }),
                    (r.P_STD_buffer_size = {
                        value: E & 8191,
                        offset: t + m,
                        length: 1.625,
                    }),
                    (m += 2));
            }
            if ($ && m + 1 <= f) {
                let E = e.getUint8(m) & 127;
                if (m + 1 + E <= f) {
                    let A = e.getUint8(m + 1),
                        Ce = (A >> 7) & 1;
                    if (
                        ((r.PES_extension_field_length = {
                            value: E,
                            offset: t + m,
                            length: 1,
                        }),
                        (r.stream_id_extension_flag = {
                            value: Ce,
                            offset: t + m + 1,
                            length: 0.125,
                        }),
                        Ce === 0)
                    )
                        r.stream_id_extension = {
                            value: A & 127,
                            offset: t + m + 1,
                            length: 0.875,
                        };
                    else {
                        let J = A & 1;
                        ((r.tref_extension_flag = {
                            value: J,
                            offset: t + m + 1,
                            length: 0.125,
                        }),
                            J === 0 &&
                                (r.TREF = {
                                    value: ce(e, m + 2).toString(),
                                    offset: t + m + 2,
                                    length: 5,
                                }));
                    }
                    m += 1 + E;
                }
            }
        }
        return { header: r, payloadOffset: c };
    }
    var jr = {
        PES: {
            text: 'Packetized Elementary Stream. Contains elementary stream data (e.g., video or audio frames) and timing information.',
            ref: 'Clause 2.4.3.7',
        },
        'PES@packet_start_code_prefix': {
            text: 'A unique 24-bit code (0x000001) that identifies the start of a PES packet.',
            ref: 'Table 2-21',
        },
        'PES@stream_id': {
            text: 'Identifies the type of elementary stream (e.g., 0xE0 for video).',
            ref: 'Table 2-22',
        },
        'PES@pes_packet_length': {
            text: 'The number of bytes in the PES packet following this field. A value of 0 is only allowed for video in a transport stream.',
            ref: 'Clause 2.4.3.7',
        },
        'PES@pts_dts_flags': {
            text: 'Indicates whether Presentation Time Stamp (PTS) and/or Decoding Time Stamp (DTS) are present.',
            ref: 'Table 2-21',
        },
        'PES@pts': {
            text: 'Presentation Time Stamp. Specifies the time at which a presentation unit is to be presented.',
            ref: 'Clause 2.4.3.7',
        },
        'PES@dts': {
            text: 'Decoding Time Stamp. Specifies the time at which a presentation unit is to be decoded.',
            ref: 'Clause 2.4.3.7',
        },
        'PES@escr_flag': {
            text: 'If set to 1, indicates the Elementary Stream Clock Reference (ESCR) field is present.',
            ref: 'Clause 2.4.3.7',
        },
        'PES@ESCR': {
            text: 'Elementary Stream Clock Reference. A time stamp from which decoders of PES streams may derive timing.',
            ref: 'Clause 2.4.3.7',
        },
        'PES@es_rate_flag': {
            text: 'If set to 1, indicates the ES_rate field is present.',
            ref: 'Clause 2.4.3.7',
        },
        'PES@ES_rate': {
            text: 'The rate at which the system target decoder receives bytes of the PES packet in a PES stream, in units of 50 bytes/second.',
            ref: 'Clause 2.4.3.7',
        },
        'PES@dsm_trick_mode_flag': {
            text: "A 1-bit flag which when set to '1' indicates the presence of an 8-bit trick mode field.",
            ref: 'Clause 2.4.3.7',
        },
        'PES@trick_mode_control': {
            text: 'A 3-bit field that indicates which trick mode is applied to the associated video stream.',
            ref: 'Clause 2.4.3.7, Table 2-24',
        },
        'PES@additional_copy_info_flag': {
            text: 'If set to 1, indicates the additional_copy_info field is present.',
            ref: 'Clause 2.4.3.7',
        },
        'PES@additional_copy_info': {
            text: 'Private data relating to copyright information.',
            ref: 'Clause 2.4.3.7',
        },
        'PES@pes_crc_flag': {
            text: 'If set to 1, indicates the previous_PES_packet_CRC field is present.',
            ref: 'Clause 2.4.3.7',
        },
        'PES@previous_PES_packet_CRC': {
            text: 'A 16-bit CRC field calculated over the data bytes of the previous PES packet.',
            ref: 'Clause 2.4.3.7',
        },
        'PES@pes_extension_flag': {
            text: "A 1-bit flag which when set to '1' indicates that an extension field exists in this PES packet header.",
            ref: 'Clause 2.4.3.7',
        },
        'PES@pack_header_field_flag': {
            text: 'If set to 1, indicates that a program stream pack header is stored in this PES packet header.',
            ref: 'Clause 2.4.3.7',
        },
        'PES@program_packet_sequence_counter_flag': {
            text: 'If set to 1, indicates the program_packet_sequence_counter and related fields are present.',
            ref: 'Clause 2.4.3.7',
        },
        'PES@program_packet_sequence_counter': {
            text: 'An optional 7-bit counter that increments with each successive PES packet of a program, allowing reconstruction of the original packet sequence.',
            ref: 'Clause 2.4.3.7',
        },
        'PES@P_STD_buffer_flag': {
            text: 'If set to 1, indicates the P-STD buffer scale and size fields are present.',
            ref: 'Clause 2.4.3.7',
        },
        'PES@P_STD_buffer_size': {
            text: 'Defines the size of the input buffer in the P-STD for this elementary stream.',
            ref: 'Clause 2.4.3.7',
        },
        'PES@pes_extension_flag_2': {
            text: 'A flag indicating the presence of further extension fields, like TREF or stream_id_extension.',
            ref: 'Clause 2.4.3.7, Table 2-21',
        },
        'PES@PES_extension_field_length': {
            text: 'The length in bytes of the data following this field in the PES extension.',
            ref: 'Clause 2.4.3.7, Table 2-21',
        },
        'PES@stream_id_extension_flag': {
            text: 'Indicates if the stream_id_extension field is present (flag=0) or if other extension flags are present (flag=1).',
            ref: 'Clause 2.4.3.7, Table 2-21',
        },
        'PES@stream_id_extension': {
            text: 'An extension to the stream_id field, allowing for more stream types to be identified.',
            ref: 'Clause 2.4.3.7, Table 2-27',
        },
        'PES@tref_extension_flag': {
            text: 'Indicates if the Timestamp Reference (TREF) field is present.',
            ref: 'Clause 2.4.3.7, Table 2-21',
        },
        'PES@TREF': {
            text: 'Timestamp Reference. Indicates the decoding time of a corresponding access unit in a reference elementary stream.',
            ref: 'Clause 2.4.3.7',
        },
    };
    function xs(e, t) {
        let n = e.getUint8(t),
            i = e.getUint8(t + 1),
            r = e.getUint8(t + 2),
            o = e.getUint8(t + 3),
            l = e.getUint8(t + 4),
            a = BigInt((n & 14) >> 1),
            s = BigInt((i << 7) | (r >> 1)),
            c = BigInt((o << 7) | (l >> 1));
        return (a << 30n) | (s << 15n) | c;
    }
    function de(e, t, n) {
        let r = t.getUint8(0) & 1;
        return (
            (e.infinite_time_flag = { value: r, offset: n, length: 0.125 }),
            r === 0
                ? t.byteLength < 6
                    ? 1
                    : ((e.PTS = {
                          value: xs(t, 1).toString(),
                          offset: n + 1,
                          length: 5,
                      }),
                      6)
                : 1
        );
    }
    function Wr(e, t) {
        if (e.byteLength < 1)
            return { type: 'DSM-CC', error: 'Payload too short.' };
        let n = e.getUint8(0),
            i = { command_id: { value: n, offset: t, length: 1 } },
            r = 1;
        if (n === 1) {
            if (e.byteLength < 3) return { type: 'DSM-CC Control', ...i };
            let o = e.getUint16(1),
                l = (o >> 15) & 1,
                a = (o >> 14) & 1,
                s = (o >> 13) & 1;
            if (
                ((i.select_flag = { value: l, offset: t + 1, length: 0.125 }),
                (i.retrieval_flag = { value: a, offset: t + 1, length: 0.125 }),
                (i.storage_flag = { value: s, offset: t + 1, length: 0.125 }),
                (r = 3),
                l)
            ) {
                if (e.byteLength < r + 5)
                    return { type: 'DSM-CC Control', ...i };
                let c = e.getUint16(r),
                    f = e.getUint16(r + 2),
                    d = e.getUint8(r + 4),
                    p = c >> 1,
                    u = ((c & 1) << 14) | (f >> 2),
                    h = f & 3,
                    _ = (BigInt(p) << 17n) | (BigInt(u) << 2n) | BigInt(h);
                ((i.bitstream_id = {
                    value: _.toString(),
                    offset: t + r,
                    length: 4.25,
                }),
                    (i.select_mode = {
                        value: (d >> 3) & 31,
                        offset: t + r + 4.25,
                        length: 0.625,
                    }),
                    (r += 5));
            }
            if (a) {
                if (e.byteLength < r + 2)
                    return { type: 'DSM-CC Control', ...i };
                let c = e.getUint16(r),
                    f = (c >> 15) & 1,
                    d = (c >> 14) & 1;
                if (
                    ((i.jump_flag = { value: f, offset: t + r, length: 0.125 }),
                    (i.play_flag = { value: d, offset: t + r, length: 0.125 }),
                    (i.pause_mode = {
                        value: (c >> 13) & 1,
                        offset: t + r,
                        length: 0.125,
                    }),
                    (i.resume_mode = {
                        value: (c >> 12) & 1,
                        offset: t + r,
                        length: 0.125,
                    }),
                    (i.stop_mode = {
                        value: (c >> 11) & 1,
                        offset: t + r,
                        length: 0.125,
                    }),
                    (r += 2),
                    f &&
                        ((i.direction_indicator = {
                            value: e.getUint8(r) & 1,
                            offset: t + r,
                            length: 0.125,
                        }),
                        (r += 1),
                        (r += de(
                            i,
                            new DataView(e.buffer, e.byteOffset + r),
                            t + r
                        ))),
                    d)
                ) {
                    let p = e.getUint8(r);
                    ((i.speed_mode = {
                        value: (p >> 7) & 1,
                        offset: t + r,
                        length: 0.125,
                    }),
                        (i.direction_indicator = {
                            value: (p >> 6) & 1,
                            offset: t + r,
                            length: 0.125,
                        }),
                        (r += 1),
                        (r += de(
                            i,
                            new DataView(e.buffer, e.byteOffset + r),
                            t + r
                        )));
                }
            }
            if (s) {
                if (e.byteLength < r + 2)
                    return { type: 'DSM-CC Control', ...i };
                let c = e.getUint8(r),
                    f = (c >> 1) & 1;
                ((i.record_flag = { value: f, offset: t + r, length: 0.125 }),
                    (i.stop_mode = {
                        value: c & 1,
                        offset: t + r,
                        length: 0.125,
                    }),
                    (r += 1),
                    f &&
                        (r += de(
                            i,
                            new DataView(e.buffer, e.byteOffset + r),
                            t + r
                        )));
            }
            return { type: 'DSM-CC Control', ...i };
        } else if (n === 2) {
            if (e.byteLength < 3) return { type: 'DSM-CC Ack', ...i };
            let o = e.getUint16(1),
                l = (o >> 14) & 1,
                a = (o >> 13) & 1,
                s = (o >> 0) & 1;
            return (
                (i.select_ack = {
                    value: (o >> 15) & 1,
                    offset: t + 1,
                    length: 0.125,
                }),
                (i.retrieval_ack = { value: l, offset: t + 1, length: 0.125 }),
                (i.storage_ack = { value: a, offset: t + 1, length: 0.125 }),
                (i.error_ack = {
                    value: (o >> 12) & 1,
                    offset: t + 1,
                    length: 0.125,
                }),
                (i.cmd_status = { value: s, offset: t + 2, length: 0.125 }),
                (r = 3),
                s === 1 &&
                    (l || a) &&
                    de(i, new DataView(e.buffer, e.byteOffset + r), t + r),
                { type: 'DSM-CC Ack', ...i }
            );
        }
        return { type: 'DSM-CC Unknown', ...i };
    }
    var qr = {
        'DSM-CC Section/Packet': {
            text: 'Digital Storage Media Command and Control. A protocol for controlling playback of stored or broadcast media, used in interactive TV and other applications.',
            ref: 'Annex B & ISO/IEC 13818-6',
        },
        'DSM-CC Control': {
            text: 'A DSM-CC control command message.',
            ref: 'Table B.3',
        },
        'DSM-CC Ack': {
            text: 'A DSM-CC acknowledgement message.',
            ref: 'Table B.5',
        },
        'DSM-CC Control@command_id': {
            text: 'Identifies the message as a control command (0x01).',
            ref: 'Table B.2',
        },
        'DSM-CC Ack@command_id': {
            text: 'Identifies the message as an acknowledgement (0x02).',
            ref: 'Table B.2',
        },
        'DSM-CC Control@select_flag': {
            text: 'When set to 1, specifies a bitstream selection operation.',
            ref: 'Clause B.3.5',
        },
        'DSM-CC Control@retrieval_flag': {
            text: 'When set to 1, specifies a playback (retrieval) action.',
            ref: 'Clause B.3.5',
        },
        'DSM-CC Control@storage_flag': {
            text: 'When set to 1, specifies a storage operation.',
            ref: 'Clause B.3.5',
        },
        'DSM-CC Control@bitstream_id': {
            text: 'A 32-bit identifier specifying which bitstream to select.',
            ref: 'Clause B.3.5',
        },
        'DSM-CC Control@select_mode': {
            text: 'Specifies the mode of operation (1=Storage, 2=Retrieval).',
            ref: 'Table B.4',
        },
        'DSM-CC Control@jump_flag': {
            text: 'When set to 1, specifies a jump to a new PTS.',
            ref: 'Clause B.3.5',
        },
        'DSM-CC Control@play_flag': {
            text: 'When set to 1, specifies to play the stream.',
            ref: 'Clause B.3.5',
        },
        'DSM-CC Control@pause_mode': {
            text: 'When set to 1, specifies to pause playback.',
            ref: 'Clause B.3.5',
        },
        'DSM-CC Control@resume_mode': {
            text: 'When set to 1, specifies to resume playback.',
            ref: 'Clause B.3.5',
        },
        'DSM-CC Control@stop_mode': {
            text: 'When set to 1, specifies to stop the current operation.',
            ref: 'Clause B.3.5',
        },
        'DSM-CC Control@direction_indicator': {
            text: 'Indicates playback direction (1=forward, 0=backward).',
            ref: 'Clause B.3.5',
        },
        'DSM-CC Control@speed_mode': {
            text: 'Specifies playback speed (1=normal, 0=fast).',
            ref: 'Clause B.3.5',
        },
        'DSM-CC Control@record_flag': {
            text: 'When set to 1, requests recording of the bitstream.',
            ref: 'Clause B.3.5',
        },
        'DSM-CC Ack@select_ack': {
            text: 'Acknowledges a select command.',
            ref: 'Clause B.3.7',
        },
        'DSM-CC Ack@retrieval_ack': {
            text: 'Acknowledges a retrieval command.',
            ref: 'Clause B.3.7',
        },
        'DSM-CC Ack@storage_ack': {
            text: 'Acknowledges a storage command.',
            ref: 'Clause B.3.7',
        },
        'DSM-CC Ack@error_ack': {
            text: 'Indicates a DSM error (e.g., End of File).',
            ref: 'Clause B.3.7',
        },
        'DSM-CC Ack@cmd_status': {
            text: 'Indicates if the command was accepted (1) or rejected (0).',
            ref: 'Clause B.3.7',
        },
        'DSM-CC Control@infinite_time_flag': {
            text: 'When set to 1, indicates an infinite time period for an operation.',
            ref: 'Clause B.3.9',
        },
        'DSM-CC Ack@infinite_time_flag': {
            text: 'When set to 1, indicates an infinite time period for an operation.',
            ref: 'Clause B.3.9',
        },
        'DSM-CC Control@PTS': {
            text: 'Specifies a relative duration for an operation, in 90kHz clock ticks.',
            ref: 'Clause B.3.8',
        },
        'DSM-CC Ack@PTS': {
            text: 'Reports the current operational PTS value, in 90kHz clock ticks.',
            ref: 'Clause B.3.8',
        },
    };
    var w = 188,
        Yr = 71,
        ys = {
            2: 'MPEG-2 Video',
            5: 'Private Section Data',
            8: 'DSM-CC Data',
            27: 'H.264/AVC Video',
            36: 'H.265/HEVC Video',
            3: 'MPEG-1 Audio',
            4: 'MPEG-2 Audio',
            15: 'AAC Audio (ADTS)',
            17: 'AAC Audio (LATM)',
            129: 'AC-3 Audio',
            135: 'E-AC-3 Audio',
            6: 'Private Data (in PES)',
        };
    function Kr(e) {
        let t = [],
            n = {
                totalPackets: 0,
                errors: [],
                pmtPids: new Set(),
                privateSectionPids: new Set(),
                dsmccPids: new Set(),
                programMap: {},
                pcrPid: null,
                pcrList: [],
                continuityCounters: {},
                tsdt: null,
                ipmp: null,
            },
            i = new DataView(e);
        for (let o = 0; o + w <= e.byteLength; o += w) {
            if (i.getUint8(o) !== Yr) continue;
            let l = Ue(new DataView(e, o, 4), o);
            if (l.pid.value === 0 && l.payload_unit_start_indicator.value) {
                let a =
                        l.adaptation_field_control.value & 2
                            ? i.getUint8(o + 4) + 1
                            : 0,
                    s = o + 4 + a;
                if (s >= o + w) continue;
                let c = i.getUint8(s),
                    f = s + 1 + c;
                if (f >= o + w) continue;
                let d = new DataView(e, f, o + w - f),
                    { header: p } = W(d);
                p.table_id === '0x00' &&
                    !p.error &&
                    De(new DataView(e, f + 8)).programs.forEach((h) => {
                        if (h.type === 'program') {
                            let _ = h.program_map_PID.value;
                            (n.pmtPids.add(_),
                                n.programMap[_] ||
                                    (n.programMap[_] = {
                                        programNumber: h.program_number.value,
                                        streams: {},
                                    }));
                        }
                    });
            }
        }
        for (let o = 0; o + w <= e.byteLength; o += w) {
            if (i.getUint8(o) !== Yr) continue;
            n.totalPackets++;
            let l = new DataView(e, o, w),
                a = Ue(l, o),
                s = a.pid.value,
                c = {
                    offset: o,
                    pid: s,
                    header: a,
                    adaptationField: null,
                    payloadType: 'Data',
                    pes: null,
                    psi: null,
                    fieldOffsets: { header: { offset: o, length: 4 } },
                };
            s !== 8191 &&
                (n.continuityCounters[s] || (n.continuityCounters[s] = []),
                n.continuityCounters[s].push({
                    cc: a.continuity_counter.value,
                    offset: o,
                    hasPayload: (a.adaptation_field_control.value & 1) !== 0,
                }));
            let f = 4;
            if (a.adaptation_field_control.value & 2) {
                let d = i.getUint8(o + f),
                    p = new DataView(e, o + f, d + 1);
                ((c.adaptationField = Ci(p, o + f)),
                    (c.fieldOffsets.adaptationField = {
                        offset: o + f,
                        length: d + 1,
                    }),
                    c.adaptationField.pcr &&
                        n.pcrList.push({
                            pcr: BigInt(c.adaptationField.pcr.value),
                            offset: o,
                        }),
                    (f += d + 1));
            }
            if (a.adaptation_field_control.value & 1 && f < w) {
                let d = f;
                if (a.payload_unit_start_indicator.value) {
                    let u = i.getUint8(o + f);
                    ((c.fieldOffsets.pointerField = {
                        offset: o + f,
                        length: u + 1,
                    }),
                        (d += u + 1));
                }
                if (d >= w) {
                    t.push(c);
                    continue;
                }
                let p = new DataView(e, o + d, w - d);
                if (s === 0 && a.payload_unit_start_indicator.value) {
                    let { header: u, payload: h, isValid: _, crc: x } = W(p),
                        S = De(h, o + d + (u.section_syntax_indicator ? 8 : 3));
                    ((S.isValid = _),
                        (S.header = u),
                        (S.crc = x),
                        (c.psi = S),
                        (c.payloadType = 'PSI (PAT)'));
                } else if (s === 1 && a.payload_unit_start_indicator.value) {
                    let { header: u, payload: h, isValid: _, crc: x } = W(p),
                        S = Rr(h, o + d + (u.section_syntax_indicator ? 8 : 3));
                    ((S.isValid = _),
                        (S.header = u),
                        (S.crc = x),
                        (c.psi = S),
                        (c.payloadType = 'PSI (CAT)'));
                } else if (s === 2 && a.payload_unit_start_indicator.value) {
                    let { header: u, payload: h, isValid: _, crc: x } = W(p),
                        S = Nr(h, o + d + (u.section_syntax_indicator ? 8 : 3));
                    ((S.isValid = _),
                        (S.header = u),
                        (S.crc = x),
                        (c.psi = S),
                        (c.payloadType = 'PSI (TSDT)'),
                        (n.tsdt = S));
                } else if (s === 3 && a.payload_unit_start_indicator.value) {
                    let { header: u, payload: h, isValid: _, crc: x } = W(p),
                        S = Hr(h, o + d + (u.section_syntax_indicator ? 8 : 3));
                    ((S.isValid = _),
                        (S.header = u),
                        (S.crc = x),
                        (c.psi = S),
                        (c.payloadType = 'PSI (IPMP-CIT)'),
                        (n.ipmp = S));
                } else if (
                    (n.pmtPids.has(s) || n.privateSectionPids.has(s)) &&
                    a.payload_unit_start_indicator.value
                ) {
                    let { header: u, payload: h, isValid: _, crc: x } = W(p),
                        S = parseInt(u.table_id, 16);
                    if (S === 2) {
                        let m = Lr(
                            h,
                            o + d + (u.section_syntax_indicator ? 8 : 3)
                        );
                        ((m.programNumber = u.table_id_extension),
                            (m.isValid = _),
                            (m.header = u),
                            (m.crc = x),
                            (c.psi = m),
                            (c.payloadType = 'PSI (PMT)'),
                            n.programMap[s] &&
                                ((n.programMap[s].programNumber =
                                    m.programNumber),
                                (n.pcrPid = m.pcr_pid.value),
                                m.streams.forEach((b) => {
                                    let v = parseInt(b.stream_type.value, 16),
                                        D =
                                            ys[v] ||
                                            `Unknown (${b.stream_type.value})`;
                                    ((n.programMap[s].streams[
                                        b.elementary_PID.value
                                    ] = D),
                                        v === 5 &&
                                            n.privateSectionPids.add(
                                                b.elementary_PID.value
                                            ),
                                        v === 8 &&
                                            n.dsmccPids.add(
                                                b.elementary_PID.value
                                            ));
                                })));
                    } else if (S >= 64 && S <= 254) {
                        let m = Vr(
                            h,
                            o + d + 3,
                            u.section_syntax_indicator,
                            u.section_length
                        );
                        ((m.isValid = _),
                            (m.header = u),
                            (m.crc = x),
                            (c.psi = m),
                            (c.payloadType = 'PSI (Private Section)'));
                    }
                } else if (
                    a.payload_unit_start_indicator.value &&
                    p.byteLength >= 6 &&
                    p.getUint32(0) >>> 8 === 1
                ) {
                    c.payloadType = 'PES';
                    let u = Gr(p, o + f);
                    if (u) {
                        c.pes = u.header;
                        let h = u.payloadOffset;
                        if (
                            ((c.fieldOffsets.pesHeader = {
                                offset: o + f,
                                length: h,
                            }),
                            parseInt(c.pes.stream_id.value, 16) === 242)
                        ) {
                            c.payloadType = 'PES (DSM-CC)';
                            let x = f + h;
                            if (o + x < o + w) {
                                let S = new DataView(e, o + x, o + w - (o + x));
                                c.pes.payload = Wr(S, o + x);
                            }
                        }
                    }
                }
            }
            t.push(c);
        }
        let r = {};
        return (
            Object.values(n.programMap).forEach((o) => {
                Object.entries(o.streams).forEach(([l, a]) => {
                    r[l] = a;
                });
            }),
            t.forEach((o) => {
                r[o.pid] && o.payloadType === 'Data'
                    ? (o.payloadType = r[o.pid])
                    : o.pid === 8191 && (o.payloadType = 'Null Packet');
            }),
            { format: 'ts', data: { summary: n, packets: t } }
        );
    }
    var Qr = {
        Timeline_descriptor: {
            text: 'Carries timing information to synchronize external data with the media timeline.',
            ref: 'ISO/IEC 13818-1, Annex U.3.6',
        },
        'Timeline_descriptor@has_timestamp': {
            text: 'Indicates if a media timestamp is present and its size (0: no, 1: 32-bit, 2: 64-bit).',
            ref: 'Table U.8',
        },
        'Timeline_descriptor@has_ntp': {
            text: 'If set to 1, indicates an NTP timestamp is present.',
            ref: 'Table U.8',
        },
        'Timeline_descriptor@has_ptp': {
            text: 'If set to 1, indicates a PTP timestamp is present.',
            ref: 'Table U.8',
        },
        'Timeline_descriptor@has_timecode': {
            text: 'Indicates if a frame timecode is present and its type.',
            ref: 'Table U.8',
        },
        'Timeline_descriptor@force_reload': {
            text: 'If set to 1, indicates that prior add-on descriptions may be obsolete and should be reloaded.',
            ref: 'Table U.8',
        },
        'Timeline_descriptor@paused': {
            text: 'If set to 1, indicates that the timeline identified by timeline_id is currently paused.',
            ref: 'Table U.8',
        },
        'Timeline_descriptor@discontinuity': {
            text: 'If set to 1, indicates that a discontinuity has occurred in the timeline.',
            ref: 'Table U.8',
        },
        'Timeline_descriptor@timeline_id': {
            text: 'Identifies the active timeline to which this timing information applies.',
            ref: 'Table U.8',
        },
        'Timeline_descriptor@timescale': {
            text: 'The number of time units that pass in one second for the media_timestamp.',
            ref: 'Table U.8',
        },
        'Timeline_descriptor@media_timestamp': {
            text: 'The media time in `timescale` units corresponding to the associated PTS value.',
            ref: 'Table U.8',
        },
        'Timeline_descriptor@ntp_timestamp': {
            text: 'A 64-bit NTP timestamp corresponding to the associated PTS value.',
            ref: 'Table U.8',
        },
        'Timeline_descriptor@ptp_timestamp': {
            text: 'An 80-bit PTP timestamp.',
            ref: 'Table U.8',
        },
        'Timeline_descriptor@timecode_data': {
            text: 'Timecode data structures.',
            ref: 'Table U.8',
        },
    };
    var Ss = {
            content_labeling_descriptor: {
                text: 'Assigns a label to content, which can be used by metadata to reference the associated content.',
                ref: 'Clause 2.6.56',
            },
            metadata_pointer_descriptor: {
                text: 'Points to a single metadata service and associates it with audiovisual content.',
                ref: 'Clause 2.6.58',
            },
            metadata_descriptor: {
                text: 'Specifies parameters of a metadata service carried in the stream, such as its format and decoder configuration.',
                ref: 'Clause 2.6.60',
            },
            metadata_STD_descriptor: {
                text: 'Defines parameters of the System Target Decoder (STD) model for processing the associated metadata stream.',
                ref: 'Clause 2.6.62',
            },
        },
        bs = {
            HEVC_video_descriptor: {
                text: 'Provides basic information for identifying coding parameters of an HEVC (H.265) video stream.',
                ref: 'Clause 2.6.95',
            },
            'HEVC_video_descriptor@profile_idc': {
                text: 'Indicates the profile to which the HEVC stream conforms.',
                ref: 'Clause 2.6.96',
            },
            'HEVC_video_descriptor@level_idc': {
                text: 'Indicates the level to which the HEVC stream conforms.',
                ref: 'Clause 2.6.96',
            },
            'HEVC_video_descriptor@tier_flag': {
                text: 'Indicates the tier (Main or High) of the HEVC stream.',
                ref: 'Clause 2.6.96',
            },
            'HEVC_video_descriptor@temporal_layer_subset_flag': {
                text: 'If set to 1, indicates that syntax elements describing a subset of temporal layers are included.',
                ref: 'Clause 2.6.96',
            },
            HEVC_timing_and_HRD_descriptor: {
                text: 'Provides timing and Hypothetical Reference Decoder (HRD) parameters for an HEVC stream. This is an Extension Descriptor.',
                ref: 'Clause 2.6.97',
            },
            'HEVC_timing_and_HRD_descriptor@hrd_management_valid_flag': {
                text: 'If set to 1, indicates that HRD management is active and Buffering Period/Picture Timing SEIs shall be present.',
                ref: 'Clause 2.6.98',
            },
            HEVC_hierarchy_extension_descriptor: {
                text: 'Provides information to identify components of layered HEVC streams (e.g., SHVC, MV-HEVC). This is an Extension Descriptor.',
                ref: 'Clause 2.6.102',
            },
            'HEVC_hierarchy_extension_descriptor@extension_dimension_bits': {
                text: 'A 16-bit field indicating the enhancement dimensions present (e.g., multi-view, spatial scalability).',
                ref: 'Clause 2.6.103, Table 2-117',
            },
            'HEVC_hierarchy_extension_descriptor@hierarchy_layer_index': {
                text: 'A unique index for this program element in the coding layer hierarchy.',
                ref: 'Clause 2.6.103',
            },
            'HEVC_hierarchy_extension_descriptor@nuh_layer_id': {
                text: 'Specifies the highest nuh_layer_id of the NAL units in the elementary stream associated with this descriptor.',
                ref: 'Clause 2.6.103',
            },
            HEVC_operation_point_descriptor: {
                text: 'Provides a method to indicate profile and level for one or more HEVC operation points (for layered video).',
                ref: 'Clause 2.6.100',
            },
            Green_extension_descriptor: {
                text: 'Contains static metadata related to energy-efficient media consumption (Green Metadata).',
                ref: 'Clause 2.6.104 / ISO/IEC 23001-11',
            },
            MPEG_H_3dAudio_descriptor: {
                text: 'Provides basic coding information for an MPEG-H 3D Audio stream.',
                ref: 'Clause 2.6.106 / ISO/IEC 23008-3',
            },
            Quality_extension_descriptor: {
                text: 'Describes quality metrics that are present in each Quality Access Unit for dynamic quality metadata.',
                ref: 'Clause 2.6.119 / ISO/IEC 23001-10',
            },
            Virtual_segmentation_descriptor: {
                text: 'Indicates that an elementary stream is virtually segmented, often used for ad insertion or cloud DVR.',
                ref: 'Clause 2.6.120',
            },
            HEVC_tile_substream_descriptor: {
                text: 'Assigns an ID to an HEVC tile substream, used for panoramic/Region-of-Interest streaming.',
                ref: 'Clause 2.6.122',
            },
            HEVC_subregion_descriptor: {
                text: 'Signals patterns of SubstreamIDs that belong to a subregion for HEVC tiled streaming.',
                ref: 'Clause 2.6.125',
            },
        },
        vs = {
            ...Ss,
            ...Qr,
            ...bs,
            CA_descriptor: {
                text: 'Conditional Access Descriptor. Provides information about the CA system used for scrambling.',
                ref: 'Clause 2.6.16',
            },
            'CA_descriptor@ca_system_ID': {
                text: 'A 16-bit identifier for the Conditional Access system.',
                ref: 'Clause 2.6.17',
            },
            'CA_descriptor@ca_PID': {
                text: 'The PID of the transport stream packets that carry the EMM or ECM data for this CA system.',
                ref: 'Clause 2.6.17',
            },
            video_stream_descriptor: {
                text: 'Provides basic coding parameters of a video elementary stream.',
                ref: 'Clause 2.6.2',
            },
            audio_stream_descriptor: {
                text: 'Provides basic information which identifies the coding version of an audio elementary stream.',
                ref: 'Clause 2.6.4',
            },
            AVC_video_descriptor: {
                text: 'Provides basic information for identifying coding parameters of an AVC (H.264) video stream.',
                ref: 'Clause 2.6.64',
            },
            AVC_timing_and_HRD_descriptor: {
                text: 'Provides timing and Hypothetical Reference Decoder (HRD) parameters of the associated AVC video stream.',
                ref: 'Clause 2.6.66',
            },
            'AVC_timing_and_HRD_descriptor@hrd_management_valid_flag': {
                text: 'If set to 1, indicates that HRD management is active and Buffering Period/Picture Timing SEIs shall be present.',
                ref: 'Clause 2.6.67',
            },
            'AVC_timing_and_HRD_descriptor@picture_and_timing_info_present': {
                text: 'If set to 1, indicates that detailed timing information (90kHz flag, N, K, etc.) is present in the descriptor.',
                ref: 'Clause 2.6.67',
            },
            'AVC_timing_and_HRD_descriptor@90kHz_flag': {
                text: 'If set to 1, indicates the AVC time base is 90 kHz. If 0, N and K are used to define the time base.',
                ref: 'Clause 2.6.67',
            },
            'AVC_timing_and_HRD_descriptor@fixed_frame_rate_flag': {
                text: 'If set to 1, indicates that the coded frame rate is constant within the AVC stream.',
                ref: 'Clause 2.6.67',
            },
            MPEG2_AAC_audio_descriptor: {
                text: 'Provides basic information for identifying the coding parameters of an MPEG-2 AAC audio elementary stream.',
                ref: 'Clause 2.6.68',
            },
            'MPEG2_AAC_audio_descriptor@MPEG_2_AAC_profile': {
                text: 'Indicates the AAC profile (e.g., Main, LC, SSR) according to ISO/IEC 13818-7.',
                ref: 'Clause 2.6.69',
            },
            'MPEG2_AAC_audio_descriptor@MPEG_2_AAC_channel_configuration': {
                text: 'Indicates the number and configuration of audio channels (e.g., mono, stereo, 5.1).',
                ref: 'Clause 2.6.69',
            },
            'MPEG2_AAC_audio_descriptor@MPEG_2_AAC_additional_information': {
                text: 'Indicates whether features like Bandwidth Extension (SBR) are present.',
                ref: 'Clause 2.6.69',
            },
            hierarchy_descriptor: {
                text: 'Identifies program elements of hierarchically-coded video, audio, and private streams.',
                ref: 'Clause 2.6.6',
            },
            registration_descriptor: {
                text: 'Provides a method to uniquely and unambiguously identify formats of private data.',
                ref: 'Clause 2.6.8',
            },
            'registration_descriptor@format_identifier': {
                text: 'A 32-bit value obtained from a Registration Authority that identifies the private format. Often represented as a four-character code (e.g., "CUEI" for SCTE-35).',
                ref: 'Clause 2.6.9',
            },
            ISO_639_language_descriptor: {
                text: 'Specifies the language of an audio or text program element.',
                ref: 'Clause 2.6.18',
            },
            'ISO_639_language_descriptor@language': {
                text: 'A 3-character language code as specified by ISO 639-2.',
                ref: 'Clause 2.6.19',
            },
            'ISO_639_language_descriptor@audio_type': {
                text: 'Specifies the type of audio service (e.g., clean effects, hearing impaired).',
                ref: 'Clause 2.6.19, Table 2-61',
            },
            data_stream_alignment_descriptor: {
                text: 'Describes the type of alignment present in the elementary stream when the data_alignment_indicator in the PES header is set.',
                ref: 'Clause 2.6.10',
            },
            'data_stream_alignment_descriptor@alignment_type': {
                text: 'Indicates the syntax element on which the stream is aligned (e.g., Access Unit, GOP, Slice). The meaning is context-dependent based on the stream type.',
                ref: 'Clause 2.6.11, Tables 2-53 to 2-56',
            },
            'MPEG-4_video_descriptor': {
                text: 'Provides basic information for identifying the coding parameters of an MPEG-4 Visual elementary stream.',
                ref: 'Clause 2.6.36',
            },
            'MPEG-4_video_descriptor@MPEG4_visual_profile_and_level': {
                text: 'An 8-bit field identifying the profile and level of the MPEG-4 Visual stream.',
                ref: 'Clause 2.6.37',
            },
            'MPEG-4_audio_descriptor': {
                text: 'Provides basic information for identifying the coding parameters of an MPEG-4 audio stream.',
                ref: 'Clause 2.6.38',
            },
            'MPEG-4_audio_descriptor@MPEG4_audio_profile_and_level': {
                text: 'An 8-bit field identifying the profile and level of the MPEG-4 audio stream.',
                ref: 'Clause 2.6.39, Table 2-72',
            },
            'MPEG-4_text_descriptor': {
                text: 'Carries the TextConfig() structure for an ISO/IEC 14496-17 text stream.',
                ref: 'Clause 2.6.70',
            },
            'AVC_video_descriptor@profile_idc': {
                text: 'Indicates the profile to which the AVC stream conforms (e.g., 66=Baseline, 77=Main, 100=High).',
                ref: 'Table 2-92 / H.264 Spec',
            },
            'AVC_video_descriptor@level_idc': {
                text: 'Indicates the level to which the AVC stream conforms.',
                ref: 'Table 2-92 / H.264 Spec',
            },
            'AVC_video_descriptor@constraint_set0_flag': {
                text: 'A constraint flag for Baseline Profile.',
                ref: 'Table 2-92 / H.264 Spec',
            },
            'AVC_video_descriptor@constraint_set1_flag': {
                text: 'A constraint flag for Main Profile.',
                ref: 'Table 2-92 / H.264 Spec',
            },
            'AVC_video_descriptor@constraint_set2_flag': {
                text: 'A constraint flag for Extended Profile.',
                ref: 'Table 2-92 / H.264 Spec',
            },
            'AVC_video_descriptor@AVC_still_present': {
                text: 'If set to 1, indicates that the stream may include AVC still pictures.',
                ref: 'Table 2-92',
            },
            'AVC_video_descriptor@AVC_24_hour_picture_flag': {
                text: 'If set to 1, indicates the stream may contain pictures with a presentation time more than 24 hours in the future.',
                ref: 'Table 2-92',
            },
            'hierarchy_descriptor@hierarchy_type': {
                text: 'Defines the hierarchical relation between this layer and its embedded layer (e.g., Spatial, SNR, Temporal, MVC).',
                ref: 'Clause 2.6.7, Table 2-50',
            },
            'hierarchy_descriptor@hierarchy_layer_index': {
                text: 'A unique index for this program element in the coding layer hierarchy.',
                ref: 'Clause 2.6.7',
            },
            'hierarchy_descriptor@hierarchy_embedded_layer_index': {
                text: 'The index of the program element that this layer depends on for decoding.',
                ref: 'Clause 2.6.7',
            },
            IBP_descriptor: {
                text: 'Provides information on the GOP structure of an MPEG-2 video stream.',
                ref: 'Clause 2.6.34',
            },
            'IBP_descriptor@closed_gop_flag': {
                text: 'If set to 1, indicates that all GOPs are closed (i.e., can be decoded without reference to a previous GOP).',
                ref: 'Clause 2.6.35',
            },
            'IBP_descriptor@identical_gop_flag': {
                text: 'If set to 1, indicates that the GOP structure (sequence of I, P, B frames) is the same throughout the sequence.',
                ref: 'Clause 2.6.35',
            },
            'IBP_descriptor@max_gop_length': {
                text: 'Indicates the maximum number of pictures between any two consecutive I-pictures.',
                ref: 'Clause 2.6.35',
            },
            maximum_bitrate_descriptor: {
                text: 'Specifies the maximum bitrate of the program element or program.',
                ref: 'Clause 2.6.26',
            },
            'maximum_bitrate_descriptor@maximum_bitrate': {
                text: 'An upper bound of the bitrate in units of 50 bytes/second, including transport overhead.',
                ref: 'Clause 2.6.27',
            },
            private_data_indicator_descriptor: {
                text: 'Indicates the presence of a specific private data format.',
                ref: 'Clause 2.6.28',
            },
            'private_data_indicator_descriptor@private_data_indicator': {
                text: 'A 32-bit value whose meaning is privately defined, but should correspond to a registered format identifier.',
                ref: 'Clause 2.6.29',
            },
            system_clock_descriptor: {
                text: 'Conveys information about the system clock that was used to generate timestamps.',
                ref: 'Clause 2.6.20',
            },
            'system_clock_descriptor@external_clock_reference_indicator': {
                text: 'If set to 1, indicates the system clock was derived from an external frequency reference.',
                ref: 'Clause 2.6.21',
            },
            'system_clock_descriptor@clock_accuracy_integer': {
                text: 'The integer part of the clock accuracy value.',
                ref: 'Clause 2.6.21',
            },
            'system_clock_descriptor@clock_accuracy_exponent': {
                text: 'The exponent part of the clock accuracy value, used to calculate accuracy in parts-per-million.',
                ref: 'Clause 2.6.21',
            },
            Extension_descriptor: {
                text: 'Provides a mechanism to extend the descriptor range using an extended tag.',
                ref: 'Clause 2.6.90',
            },
            'Extension_descriptor@extension_descriptor_tag': {
                text: 'An 8-bit tag that identifies the nested descriptor.',
                ref: 'Clause 2.6.91, Table 2-108',
            },
            'Extension_descriptor@nested_descriptor_name': {
                text: 'The name of the descriptor identified by the extension tag.',
                ref: 'Clause 2.6.91',
            },
            copyright_descriptor: {
                text: 'Provides a method to enable audiovisual works identification.',
                ref: 'Clause 2.6.24',
            },
            'copyright_descriptor@copyright_identifier': {
                text: 'A 32-bit value obtained from a Registration Authority that identifies the work type (e.g., ISAN, ISBN).',
                ref: 'Clause 2.6.25',
            },
            smoothing_buffer_descriptor: {
                text: 'Conveys the size of a smoothing buffer and the associated leak rate for the program element.',
                ref: 'Clause 2.6.30',
            },
            'smoothing_buffer_descriptor@sb_leak_rate': {
                text: 'The value of the leak rate out of the smoothing buffer in units of 400 bits/s.',
                ref: 'Clause 2.6.31',
            },
            'smoothing_buffer_descriptor@sb_size': {
                text: 'The size of the smoothing buffer in units of 1 byte.',
                ref: 'Clause 2.6.31',
            },
            multiplex_buffer_utilization_descriptor: {
                text: 'Provides bounds on the occupancy of the STD multiplex buffer, intended for use by re-multiplexers.',
                ref: 'Clause 2.6.22',
            },
            'multiplex_buffer_utilization_descriptor@bound_valid_flag': {
                text: 'A flag indicating if the lower and upper bound fields are valid.',
                ref: 'Clause 2.6.23',
            },
            'multiplex_buffer_utilization_descriptor@LTW_offset_lower_bound': {
                text: 'The lowest value that any Legal Time Window (LTW) offset field would have in the stream.',
                ref: 'Clause 2.6.23',
            },
            'multiplex_buffer_utilization_descriptor@LTW_offset_upper_bound': {
                text: 'The largest value that any Legal Time Window (LTW) offset field would have in the stream.',
                ref: 'Clause 2.6.23',
            },
            STD_descriptor: {
                text: 'Applies only to the T-STD model for MPEG-2 video streams.',
                ref: 'Clause 2.6.32',
            },
            'STD_descriptor@leak_valid_flag': {
                text: 'If 1, the T-STD uses the leak method for buffer transfer. If 0, it uses the vbv_delay method.',
                ref: 'Clause 2.6.33',
            },
            target_background_grid_descriptor: {
                text: 'Describes a grid of unit pixels projected on to the display area for video windowing.',
                ref: 'Clause 2.6.12',
            },
            'target_background_grid_descriptor@horizontal_size': {
                text: 'The horizontal size of the target background grid in pixels.',
                ref: 'Clause 2.6.13',
            },
            'target_background_grid_descriptor@vertical_size': {
                text: 'The vertical size of the target background grid in pixels.',
                ref: 'Clause 2.6.13',
            },
            'target_background_grid_descriptor@aspect_ratio_information': {
                text: 'Specifies the sample or display aspect ratio of the target background grid.',
                ref: 'Clause 2.6.13',
            },
            video_window_descriptor: {
                text: 'Describes the window characteristics of the associated video elementary stream, relative to the target background grid.',
                ref: 'Clause 2.6.14',
            },
            'video_window_descriptor@horizontal_offset': {
                text: 'The horizontal position of the top left pixel of the video window on the target grid.',
                ref: 'Clause 2.6.15',
            },
            'video_window_descriptor@vertical_offset': {
                text: 'The vertical position of the top left pixel of the video window on the target grid.',
                ref: 'Clause 2.6.15',
            },
            'video_window_descriptor@window_priority': {
                text: 'Indicates the front-to-back ordering of overlapping windows (0=lowest, 15=highest).',
                ref: 'Clause 2.6.15',
            },
            IOD_descriptor: {
                text: 'Encapsulates the InitialObjectDescriptor, which is the entry point to an ISO/IEC 14496 (MPEG-4) scene.',
                ref: 'Clause 2.6.40',
            },
            SL_descriptor: {
                text: 'Associates an ISO/IEC 14496-1 ES_ID with an elementary stream carried in PES packets.',
                ref: 'Clause 2.6.42',
            },
            'SL_descriptor@ES_ID': {
                text: 'The 16-bit identifier of the ISO/IEC 14496-1 SL-packetized stream.',
                ref: 'Clause 2.6.43',
            },
            FMC_descriptor: {
                text: 'Associates FlexMux channels to the ES_ID values of the SL-packetized streams within a FlexMux stream.',
                ref: 'Clause 2.6.44',
            },
            'FMC_descriptor@ES_ID': {
                text: 'The ES_ID of an SL-packetized stream within the FlexMux.',
                ref: 'Clause 2.6.45',
            },
            'FMC_descriptor@FlexMuxChannel': {
                text: 'The FlexMux channel number used for this SL-packetized stream.',
                ref: 'Clause 2.6.45',
            },
            SVC_extension_descriptor: {
                text: 'Provides detailed information about an SVC (Scalable Video Coding) video sub-bitstream.',
                ref: 'Clause 2.6.76',
            },
            MVC_extension_descriptor: {
                text: 'Provides detailed information about an MVC (Multi-view Coding) video sub-bitstream.',
                ref: 'Clause 2.6.78',
            },
            FlexMuxTiming_descriptor: {
                text: 'Conveys timing information for an ISO/IEC 14496-1 FlexMux stream.',
                ref: 'Clause 2.6.54',
            },
            multiplexBuffer_descriptor: {
                text: 'Conveys the size of the multiplex buffer (MBn) and the leak rate (Rxn) from the transport buffer (TBn) for an ISO/IEC 14496 stream.',
                ref: 'Clause 2.6.52',
            },
            MPEG2_stereoscopic_video_format_descriptor: {
                text: 'Indicates the type of stereoscopic video format included in the user_data of an MPEG-2 video elementary stream.',
                ref: 'Clause 2.6.84',
            },
            Stereoscopic_program_info_descriptor: {
                text: 'Specifies the type of stereoscopic service, such as monoscopic, frame-compatible, or service-compatible.',
                ref: 'Clause 2.6.86',
            },
            Stereoscopic_video_info_descriptor: {
                text: 'Provides information for service-compatible stereoscopic 3D services that carry left and right views in separate video streams.',
                ref: 'Clause 2.6.88',
            },
            Transport_profile_descriptor: {
                text: 'Signals a profile value of the transport stream for the associated program, indicating specific constraints (e.g., for adaptive streaming).',
                ref: 'Clause 2.6.93',
            },
            J2K_video_descriptor: {
                text: 'Provides information for identifying and decoding a JPEG 2000 video elementary stream.',
                ref: 'Clause 2.6.80',
            },
            'J2K_video_descriptor@profile_and_level': {
                text: 'Specifies the profile and level of the JPEG 2000 video stream, corresponding to the Rsiz value in the codestream.',
                ref: 'Clause 2.6.81',
            },
            'J2K_video_descriptor@extended_capability_flag': {
                text: 'Indicates if the stream uses extended color specification and may have capabilities like stripes or blocks.',
                ref: 'Clause 2.6.81',
            },
            'SEMANTIC-PTS-FREQ': {
                text: 'Validates that the time interval between consecutive Presentation Time Stamps (PTS) for any single elementary stream does not exceed 0.7 seconds.',
                ref: 'Clause 2.7.4',
            },
            'SEMANTIC-PTS-DISCONT': {
                text: 'Validates that a Presentation Time Stamp (PTS) is present for the first access unit following a discontinuity.',
                ref: 'Clause 2.7.5',
            },
            'SEMANTIC-TB-OVERFLOW': {
                text: 'Validates that the Transport Buffer (TBn) in the T-STD model does not overflow for any elementary stream.',
                ref: 'Clause 2.4.2.7',
            },
            'SEMANTIC-PCR-FREQ': {
                text: 'Validates that the time interval between consecutive Program Clock References (PCRs) for a program does not exceed 0.1 seconds.',
                ref: 'Clause 2.7.2',
            },
            'SEMANTIC-CC-ERROR': {
                text: 'Checks for unexpected jumps in the continuity_counter for a PID, which indicates potential packet loss.',
                ref: 'Clause 2.4.3.3',
            },
            MPEG4_audio_extension_descriptor: {
                text: 'Carries additional audio profile/level indications and optionally the AudioSpecificConfig for an MPEG-4 audio stream.',
                ref: 'Clause 2.6.72',
            },
            'MPEG4_audio_extension_descriptor@ASC_flag': {
                text: 'If set to 1, indicates that the AudioSpecificConfig (ASC) data is present in this descriptor.',
                ref: 'Clause 2.6.73',
            },
            'MPEG4_audio_extension_descriptor@num_of_loops': {
                text: 'The number of audioProfileLevelIndication fields that follow.',
                ref: 'Clause 2.6.73',
            },
            'MPEG4_audio_extension_descriptor@audioProfileLevelIndication': {
                text: 'Indicates an audio profile and level to which the stream conforms.',
                ref: 'Clause 2.6.73 / ISO/IEC 14496-3',
            },
            'MPEG4_audio_extension_descriptor@ASC_size': {
                text: 'The size in bytes of the following AudioSpecificConfig data.',
                ref: 'Clause 2.6.73',
            },
            'MPEG4_audio_extension_descriptor@audioSpecificConfig': {
                text: 'The AudioSpecificConfig data, which provides detailed decoder configuration for MPEG-4 audio.',
                ref: 'Clause 2.6.73 / ISO/IEC 14496-3',
            },
            Auxiliary_video_stream_descriptor: {
                text: 'Specifies parameters for the decoding and interpretation of an auxiliary video stream (e.g., depth maps for 3D video).',
                ref: 'Clause 2.6.74',
            },
            'Auxiliary_video_stream_descriptor@aux_video_codedstreamtype': {
                text: 'Indicates the compression coding type of the auxiliary video stream (e.g., 0x1B for H.264/AVC).',
                ref: 'Clause 2.6.75',
            },
            'Auxiliary_video_stream_descriptor@si_rbsp_data': {
                text: 'The Supplemental Information Raw Byte Sequence Payload, containing detailed parameters for the auxiliary video as defined in ISO/IEC 23002-3.',
                ref: 'Clause 2.6.75',
            },
            external_ES_ID_descriptor: {
                text: 'Assigns an ES_ID to a program element, allowing non-MPEG-4 components to be referenced in an MPEG-4 scene.',
                ref: 'Clause 2.6.46',
            },
            MuxCode_descriptor: {
                text: 'Conveys MuxCodeTableEntry structures to configure the MuxCode mode of FlexMux.',
                ref: 'Clause 2.6.48',
            },
            FmxBufferSize_descriptor: {
                text: 'Conveys the size of the FlexMux buffer (FB) for each SL packetized stream multiplexed in a FlexMux stream.',
                ref: 'Clause 2.6.50',
            },
            IPMP_descriptor: {
                text: 'Provides information for Intellectual Property Management and Protection (IPMP) systems.',
                ref: 'Clause 2.6, Tag 0x29 / ISO/IEC 13818-11',
            },
            MVC_operation_point_descriptor: {
                text: 'Indicates profile and level for one or more operation points of an MVC (Multi-view Coding) bitstream.',
                ref: 'Clause 2.6.82',
            },
        },
        Cs = {
            ...Ii,
            ...zr,
            ...vs,
            ...qr,
            ...Or,
            ...Ti,
            ...Br,
            ...jr,
            ...$r,
            ...Fr,
        };
    function Jr(e) {
        try {
            return Kr(e);
        } catch (t) {
            return (
                console.error('Error parsing TS segment:', t),
                {
                    format: 'ts',
                    error: t.message,
                    data: { summary: { errors: [t.message] }, packets: [] },
                }
            );
        }
    }
    ke();
    var k = (e) => {
        if (!e) return null;
        let t = e.match(
            /PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/
        );
        if (!t) return null;
        let n = parseFloat(t[1] || '0'),
            i = parseFloat(t[2] || '0'),
            r = parseFloat(t[3] || '0');
        return n * 3600 + i * 60 + r;
    };
    var y = (e, t) => e?.attributes?.[t],
        T = (e, t) => e?.children?.find((n) => n.tagName === t),
        R = (e, t) => e?.children?.filter((n) => n.tagName === t) || [];
    function Me(e, t, n = {}) {
        let i = [];
        if (!e || !e.children) return i;
        for (let r of e.children) {
            if (r.type !== 'element') continue;
            let o = { ...n, parent: e };
            (r.tagName === 'Period' && (o.period = r),
                r.tagName === 'AdaptationSet' && (o.adaptationSet = r),
                r.tagName === t && i.push({ element: r, context: o }),
                i.push(...Me(r, t, o)));
        }
        return i;
    }
    var z = (e, t) => {
        if (!e) return [];
        let n = [];
        for (let i of e)
            i.type === 'element' &&
                (i.tagName === t && n.push(i),
                i.children?.length > 0 && (n = n.concat(z(i.children, t))));
        return n;
    };
    var Zr = (e) =>
            !e || isNaN(e)
                ? 'N/A'
                : e >= 1e6
                  ? `${(e / 1e6).toFixed(2)} Mbps`
                  : `${(e / 1e3).toFixed(0)} kbps`,
        Ts = (e) => {
            if (!e) return 'unknown';
            if (z(e.children, 'SegmentList').length > 0) return 'SegmentList';
            let t = z(e.children, 'SegmentTemplate')[0];
            return t
                ? z(t.children, 'SegmentTimeline').length > 0
                    ? 'SegmentTemplate with SegmentTimeline'
                    : t.attributes.media?.includes('$Number$')
                      ? 'SegmentTemplate with $Number$'
                      : t.attributes.media?.includes('$Time$')
                        ? 'SegmentTemplate with $Time$'
                        : 'SegmentTemplate'
                : z(e.children, 'SegmentBase').length > 0
                  ? 'SegmentBase'
                  : 'BaseURL / Single Segment';
        };
    function eo(e, t) {
        let n = [],
            i = [],
            r = [],
            o = new Set(),
            l = new Set();
        for (let f of e.periods)
            for (let d of f.adaptationSets) {
                switch (d.contentType) {
                    case 'video':
                        n.push(d);
                        break;
                    case 'audio':
                        i.push(d);
                        break;
                    case 'text':
                    case 'application':
                        r.push(d);
                        break;
                }
                for (let p of d.contentProtection)
                    (o.add(p.system), p.defaultKid && l.add(p.defaultKid));
            }
        let a = z(t.children, 'ServiceDescription')[0],
            s = a ? z(a.children, 'Latency')[0] : null;
        return {
            general: {
                protocol: 'DASH',
                streamType:
                    e.type === 'dynamic' ? 'Live / Dynamic' : 'VOD / Static',
                streamTypeColor:
                    e.type === 'dynamic' ? 'text-red-400' : 'text-blue-400',
                duration: e.duration,
                segmentFormat: e.segmentFormat,
                title: e.programInformations[0]?.title || null,
                locations: e.locations,
                segmenting: Ts(t),
            },
            dash: {
                profiles: e.profiles,
                minBufferTime: e.minBufferTime,
                timeShiftBufferDepth: e.timeShiftBufferDepth,
                minimumUpdatePeriod: e.minimumUpdatePeriod,
                availabilityStartTime: e.availabilityStartTime,
                publishTime: e.publishTime,
            },
            hls: null,
            lowLatency: {
                isLowLatency: !!s,
                targetLatency: s ? parseInt(s.attributes.target, 10) : null,
                minLatency: s ? parseInt(s.attributes.min, 10) : null,
                maxLatency: s ? parseInt(s.attributes.max, 10) : null,
                partTargetDuration: null,
                partHoldBack: null,
                canBlockReload: !1,
            },
            content: {
                periods: e.periods.length,
                videoTracks: n.length,
                audioTracks: i.length,
                textTracks: r.length,
                mediaPlaylists: 0,
            },
            videoTracks: n.map((f) => {
                let d = f.representations
                    .map((p) => p.bandwidth)
                    .filter(Boolean);
                return {
                    id: f.id || 'N/A',
                    profiles: f.profiles,
                    bitrateRange:
                        d.length > 0
                            ? `${Zr(Math.min(...d))} - ${Zr(Math.max(...d))}`
                            : 'N/A',
                    resolutions: [
                        ...new Set(
                            f.representations.map(
                                (p) => `${p.width}x${p.height}`
                            )
                        ),
                    ],
                    codecs: [
                        ...new Set(
                            f.representations
                                .map((p) => p.codecs)
                                .filter(Boolean)
                        ),
                    ],
                    scanType: f.representations[0]?.scanType || null,
                    videoRange: null,
                    roles: f.roles.map((p) => p.value).filter(Boolean),
                };
            }),
            audioTracks: i.map((f) => ({
                id: f.id || 'N/A',
                lang: f.lang,
                codecs: [
                    ...new Set(
                        f.representations.map((d) => d.codecs).filter(Boolean)
                    ),
                ],
                channels: [
                    ...new Set(
                        f.representations
                            .flatMap((d) => d.audioChannelConfigurations)
                            .map((d) => d.value)
                            .filter(Boolean)
                    ),
                ],
                isDefault: !1,
                isForced: !1,
                roles: f.roles.map((d) => d.value).filter(Boolean),
            })),
            textTracks: r.map((f) => ({
                id: f.id || 'N/A',
                lang: f.lang,
                codecsOrMimeTypes: [
                    ...new Set(
                        f.representations
                            .map((d) => d.codecs || d.mimeType)
                            .filter(Boolean)
                    ),
                ],
                isDefault: !1,
                isForced: !1,
                roles: f.roles.map((d) => d.value).filter(Boolean),
            })),
            security: {
                isEncrypted: o.size > 0,
                systems: Array.from(o),
                kids: Array.from(l),
            },
        };
    }
    var ue = (e) => T(e, '#text')?.content || e?.children?.[0]?.content || null;
    function to(e) {
        let t = !!z(e.children, 'SegmentTimeline').length > 0,
            n = !!z(e.children, 'SegmentTemplate').length > 0,
            i = !!z(e.children, 'SegmentList').length > 0,
            r = t || n || i ? 'isobmff' : 'unknown',
            o = {
                id: y(e, 'id'),
                type: y(e, 'type'),
                profiles: y(e, 'profiles'),
                minBufferTime: k(y(e, 'minBufferTime')),
                publishTime: y(e, 'publishTime')
                    ? new Date(y(e, 'publishTime'))
                    : null,
                availabilityStartTime: y(e, 'availabilityStartTime')
                    ? new Date(y(e, 'availabilityStartTime'))
                    : null,
                timeShiftBufferDepth: k(y(e, 'timeShiftBufferDepth')),
                minimumUpdatePeriod: k(y(e, 'minimumUpdatePeriod')),
                duration: k(y(e, 'mediaPresentationDuration')),
                maxSegmentDuration: k(y(e, 'maxSegmentDuration')),
                maxSubsegmentDuration: k(y(e, 'maxSubsegmentDuration')),
                programInformations: R(e, 'ProgramInformation').map((l) => ({
                    title: ue(T(l, 'Title')),
                    source: ue(T(l, 'Source')),
                    copyright: ue(T(l, 'Copyright')),
                    lang: y(l, 'lang'),
                    moreInformationURL: y(l, 'moreInformationURL'),
                })),
                locations: R(e, 'Location').map(ue),
                periods: R(e, 'Period').map(Es),
                segmentFormat: r,
                rawElement: e,
                metrics: [],
                events: [],
                summary: null,
                serverControl: null,
            };
        return (
            (o.events = o.periods.flatMap((l) => l.events)),
            (o.summary = eo(o, e)),
            { manifestIR: o, manifestElement: e }
        );
    }
    function Es(e) {
        let t = {
                id: y(e, 'id'),
                start: k(y(e, 'start')),
                duration: k(y(e, 'duration')),
                bitstreamSwitching: y(e, 'bitstreamSwitching') === 'true',
                adaptationSets: [],
                eventStreams: [],
                events: [],
                rawElement: e,
            },
            n = R(e, 'AdaptationSet');
        return ((t.adaptationSets = n.map((i) => Ps(i, t))), t);
    }
    function Ps(e, t) {
        let n = {
                id: y(e, 'id'),
                contentType:
                    y(e, 'contentType') || y(e, 'mimeType')?.split('/')[0],
                lang: y(e, 'lang'),
                mimeType: y(e, 'mimeType'),
                representations: [],
                contentProtection: [],
                roles: R(e, 'Role').map((o) => ({ value: y(o, 'value') })),
                rawElement: e,
                period: t,
            },
            i = R(e, 'Representation');
        n.representations = i.map((o) => As(o, n));
        let r = R(e, 'ContentProtection');
        return (
            (n.contentProtection = r.map((o) => ({
                schemeIdUri: y(o, 'schemeIdUri'),
                system: pe(y(o, 'schemeIdUri')),
                defaultKid: y(o, 'cenc:default_KID'),
            }))),
            n
        );
    }
    function As(e, t) {
        return {
            id: y(e, 'id'),
            bandwidth: parseInt(y(e, 'bandwidth'), 10),
            width: parseInt(y(e, 'width') || t.maxWidth, 10),
            height: parseInt(y(e, 'height') || t.maxHeight, 10),
            codecs: y(e, 'codecs') || t.codecs,
            mimeType: y(e, 'mimeType') || t.mimeType,
            audioChannelConfigurations: R(e, 'AudioChannelConfiguration').map(
                (n) => ({ value: y(n, 'value') })
            ),
            roles: t.roles,
            rawElement: e,
        };
    }
    async function no(e, t) {
        let n = (a, s) => a?.children?.find((c) => c.tagName === s),
            i = (a) => a?.children?.[0]?.content || null,
            r = n(e, 'BaseURL');
        r && i(r) && (t = new URL(i(r), t).href);
        let { manifestIR: o, manifestElement: l } = to(e);
        return { manifest: o, serializedManifest: l, baseUrl: t };
    }
    function io(e, t) {
        return no(e, t);
    }
    var Us = (e) =>
        !e || isNaN(e)
            ? 'N/A'
            : e >= 1e6
              ? `${(e / 1e6).toFixed(2)} Mbps`
              : `${(e / 1e3).toFixed(0)} kbps`;
    function ro(e) {
        let { rawElement: t } = e,
            n = t.isMaster,
            i = [],
            r = [],
            o = [],
            l = new Set(),
            a = new Set(),
            s = null;
        if (n) {
            (t.variants.forEach((p, u) => {
                let h = p.attributes.CODECS || '';
                (h.includes('avc1') ||
                    h.includes('hvc1') ||
                    p.attributes.RESOLUTION) &&
                    i.push({
                        id: p.attributes['STABLE-VARIANT-ID'] || `variant_${u}`,
                        profiles: null,
                        bitrateRange: Us(p.attributes.BANDWIDTH),
                        resolutions: p.attributes.RESOLUTION
                            ? [p.attributes.RESOLUTION]
                            : [],
                        codecs: [h],
                        scanType: null,
                        videoRange: p.attributes['VIDEO-RANGE'] || null,
                        roles: [],
                    });
            }),
                t.media.forEach((p, u) => {
                    let h =
                        p['STABLE-RENDITION-ID'] ||
                        `${p.TYPE.toLowerCase()}_${u}`;
                    p.TYPE === 'AUDIO'
                        ? r.push({
                              id: h,
                              lang: p.LANGUAGE,
                              codecs: [],
                              channels: p.CHANNELS ? [p.CHANNELS] : [],
                              isDefault: p.DEFAULT === 'YES',
                              isForced: p.FORCED === 'YES',
                              roles: [],
                          })
                        : (p.TYPE === 'SUBTITLES' ||
                              p.TYPE === 'CLOSED-CAPTIONS') &&
                          o.push({
                              id: h,
                              lang: p.LANGUAGE,
                              codecsOrMimeTypes: [],
                              isDefault: p.DEFAULT === 'YES',
                              isForced: p.FORCED === 'YES',
                              roles: [],
                          });
                }));
            let d = t.tags.find((p) => p.name === 'EXT-X-SESSION-KEY');
            if (
                d &&
                d.value.METHOD !== 'NONE' &&
                (l.add(d.value.METHOD),
                d.value.KEYFORMAT ===
                    'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed' &&
                    d.value.URI)
            )
                try {
                    let u = atob(d.value.URI.split(',')[1]).slice(32, 48);
                    a.add(
                        Array.from(u)
                            .map((h) =>
                                h.charCodeAt(0).toString(16).padStart(2, '0')
                            )
                            .join('')
                    );
                } catch {}
        } else {
            let d = t.segments.find((h) => h.key)?.key;
            d && d.METHOD !== 'NONE' && l.add(d.METHOD);
            let p = t.segments.length,
                u = t.segments.reduce((h, _) => h + _.duration, 0);
            s = {
                segmentCount: p,
                averageSegmentDuration: p > 0 ? u / p : 0,
                hasDiscontinuity: t.segments.some((h) => h.discontinuity),
                isIFrameOnly: t.tags.some(
                    (h) => h.name === 'EXT-X-I-FRAMES-ONLY'
                ),
            };
        }
        let c = t.tags.filter(
            (d) => d.name === 'EXT-X-I-FRAME-STREAM-INF'
        ).length;
        return {
            general: {
                protocol: 'HLS',
                streamType:
                    e.type === 'dynamic' ? 'Live / Dynamic' : 'VOD / Static',
                streamTypeColor:
                    e.type === 'dynamic' ? 'text-red-400' : 'text-blue-400',
                duration: e.duration,
                segmentFormat: e.segmentFormat.toUpperCase(),
                title: null,
                locations: [],
                segmenting: 'Segment List',
            },
            dash: null,
            hls: {
                version: t.version,
                targetDuration: t.targetDuration,
                iFramePlaylists: c,
                mediaPlaylistDetails: s,
            },
            lowLatency: {
                isLowLatency: !!t.partInf,
                partTargetDuration: t.partInf?.['PART-TARGET'] || null,
                partHoldBack: e.serverControl?.['PART-HOLD-BACK'] || null,
                canBlockReload: e.serverControl?.['CAN-BLOCK-RELOAD'] === 'YES',
                targetLatency: null,
                minLatency: null,
                maxLatency: null,
            },
            content: {
                periods: 1,
                videoTracks: i.length,
                audioTracks: r.length,
                textTracks: o.length,
                mediaPlaylists: n ? t.variants.length : 1,
            },
            videoTracks: i,
            audioTracks: r,
            textTracks: o,
            security: {
                isEncrypted: l.size > 0,
                systems: Array.from(l),
                kids: Array.from(a),
            },
        };
    }
    function oo(e) {
        let t = {
                id: null,
                type: e.isLive ? 'dynamic' : 'static',
                profiles: `HLS v${e.version}`,
                minBufferTime: e.targetDuration || null,
                publishTime: null,
                availabilityStartTime: null,
                timeShiftBufferDepth: null,
                minimumUpdatePeriod: e.isLive ? e.targetDuration : null,
                duration: e.isMaster
                    ? null
                    : e.segments.reduce((l, a) => l + a.duration, 0),
                maxSegmentDuration: null,
                maxSubsegmentDuration: null,
                programInformations: [],
                metrics: [],
                locations: [],
                segmentFormat: e.map ? 'isobmff' : 'ts',
                periods: [],
                events: [],
                rawElement: e,
                summary: null,
                serverControl: e.serverControl || null,
                tags: e.tags || [],
                isMaster: e.isMaster,
                variants: e.variants || [],
                segments: e.segments || [],
                preloadHints: e.preloadHints || [],
                renditionReports: e.renditionReports || [],
                partInf: e.partInf || null,
            },
            n = e.tags.filter((l) => l.name === 'EXT-X-DATERANGE'),
            i = 0,
            r = new Map();
        for (let l of e.segments)
            (l.dateTime && r.set(new Date(l.dateTime).getTime(), i),
                (i += l.duration));
        for (let l of n) {
            let a = new Date(l.value['START-DATE']).getTime(),
                s = parseFloat(l.value.DURATION),
                c = Array.from(r.keys())
                    .filter((f) => f <= a)
                    .pop();
            if (c) {
                let f = (a - c) / 1e3,
                    d = l.value.CLASS === 'com.apple.hls.interstitial';
                t.events.push({
                    startTime: r.get(c) + f,
                    duration: s,
                    message: d
                        ? `Interstitial: ${l.value.ID || 'N/A'}`
                        : `Date Range: ${l.value.ID || 'N/A'}`,
                    messageData: d ? l.value : null,
                    type: 'hls-daterange',
                });
            }
        }
        let o = {
            id: 'hls-period-0',
            start: 0,
            duration: t.duration,
            bitstreamSwitching: null,
            assetIdentifier: null,
            subsets: [],
            adaptationSets: [],
            eventStreams: [],
            events: [],
        };
        if (e.isMaster) {
            let l = e.media.reduce((a, s) => {
                let c = s['GROUP-ID'],
                    f = s.TYPE.toLowerCase();
                return (
                    a[f] || (a[f] = {}),
                    a[f][c] || (a[f][c] = []),
                    a[f][c].push(s),
                    a
                );
            }, {});
            (Object.entries(l).forEach(([a, s]) => {
                Object.entries(s).forEach(([c, f], d) => {
                    f.forEach((p, u) => {
                        let h = a === 'subtitles' ? 'text' : a;
                        o.adaptationSets.push({
                            id:
                                p['STABLE-RENDITION-ID'] ||
                                `${a}-rendition-${c}-${u}`,
                            contentType: h,
                            lang: p.LANGUAGE,
                            mimeType: h === 'text' ? 'text/vtt' : 'video/mp2t',
                            representations: [],
                            contentProtection: [],
                            roles: [],
                        });
                    });
                });
            }),
                e.variants.forEach((a, s) => {
                    let c = a.attributes.CODECS || '',
                        f =
                            c.includes('avc1') ||
                            c.includes('hev1') ||
                            c.includes('hvc1'),
                        d = !!a.attributes.RESOLUTION,
                        p = f || d,
                        u = c.includes('mp4a') && !a.attributes.AUDIO;
                    if (p) {
                        let h = a.attributes.RESOLUTION,
                            _ = {
                                id:
                                    a.attributes['STABLE-VARIANT-ID'] ||
                                    `video-variant-${s}-rep-0`,
                                codecs: c,
                                bandwidth: a.attributes.BANDWIDTH,
                                width: h
                                    ? parseInt(String(h).split('x')[0], 10)
                                    : null,
                                height: h
                                    ? parseInt(String(h).split('x')[1], 10)
                                    : null,
                                qualityRanking: a.attributes.SCORE,
                                videoRange: a.attributes['VIDEO-RANGE'],
                            },
                            x = {
                                id: `video-variant-${s}`,
                                contentType: 'video',
                                lang: null,
                                mimeType: 'video/mp2t',
                                representations: [_],
                                contentProtection: [],
                                roles: [],
                            };
                        o.adaptationSets.push(x);
                    }
                    if (u) {
                        let h = {
                            id: `audio-muxed-${s}`,
                            contentType: 'audio',
                            lang: null,
                            mimeType: 'audio/mp4',
                            representations: [
                                {
                                    id: `audio-muxed-${s}-rep-0`,
                                    codecs: c
                                        .split(',')
                                        .find((_) => _.startsWith('mp4a')),
                                    bandwidth: a.attributes.BANDWIDTH,
                                    width: null,
                                    height: null,
                                },
                            ],
                            contentProtection: [],
                            roles: [],
                        };
                        o.adaptationSets.push(h);
                    }
                }));
        } else {
            let l = {
                    id: 'media-0',
                    contentType: 'video',
                    lang: null,
                    mimeType: e.map ? 'video/mp4' : 'video/mp2t',
                    representations: [
                        {
                            id: 'media-0-rep-0',
                            codecs: null,
                            bandwidth: 0,
                            width: null,
                            height: null,
                        },
                    ],
                    contentProtection: [],
                    roles: [],
                },
                a = e.segments.find((s) => s.key)?.key;
            (a &&
                a.METHOD !== 'NONE' &&
                l.contentProtection.push({
                    schemeIdUri: a.KEYFORMAT || 'identity',
                    system: a.METHOD,
                }),
                o.adaptationSets.push(l));
        }
        return (t.periods.push(o), (t.summary = ro(t)), t);
    }
    function N(e) {
        let t = {};
        return (
            (e.match(/("[^"]*")|[^,]+/g) || []).forEach((i) => {
                let r = i.indexOf('=');
                if (r === -1) return;
                let o = i.substring(0, r),
                    l = i.substring(r + 1).replace(/"/g, ''),
                    a = /^-?\d+(\.\d+)?$/.test(l) ? parseFloat(l) : l;
                t[o] = a;
            }),
            t
        );
    }
    function Ds(e, t, n = new Map()) {
        let i = new Map(n),
            r = new URL(t).searchParams;
        return (
            e.forEach((l) => {
                if (l.startsWith('#EXT-X-DEFINE:')) {
                    let a = N(l.substring(14));
                    if (a.NAME && a.VALUE !== void 0)
                        i.set(String(a.NAME), {
                            value: String(a.VALUE),
                            source: 'VALUE',
                        });
                    else if (a.QUERYPARAM) {
                        let s = String(a.QUERYPARAM),
                            c = r.get(s);
                        c !== null &&
                            i.set(s, { value: c, source: `QUERYPARAM (${s})` });
                    } else if (a.IMPORT) {
                        let s = String(a.IMPORT);
                        n.has(s) &&
                            i.set(s, {
                                value: n.get(s).value,
                                source: `IMPORT (${s})`,
                            });
                    }
                }
            }),
            i.size === 0
                ? { substitutedLines: e, definedVariables: i }
                : {
                      substitutedLines: e.map((l) =>
                          l.replace(/{\$[a-zA-Z0-9_-]+}/g, (a) => {
                              let s = a.substring(2, a.length - 1);
                              return i.has(s) ? i.get(s).value : a;
                          })
                      ),
                      definedVariables: i,
                  }
        );
    }
    async function so(e, t, n) {
        let i = e,
            r = e.split(/\r?\n/);
        if (!r[0] || r[0].trim() !== '#EXTM3U')
            if (e.includes('#EXTINF:'))
                (r.unshift('#EXTM3U'),
                    (i = r.join(`
`)));
            else
                throw new Error(
                    'Invalid HLS playlist. Must start with #EXTM3U.'
                );
        let { substitutedLines: o, definedVariables: l } = Ds(r, t, n),
            a = {
                isMaster: !1,
                version: 1,
                tags: [],
                segments: [],
                variants: [],
                media: [],
                raw: i,
                baseUrl: t,
                isLive: !0,
                preloadHints: [],
                renditionReports: [],
            },
            s = null,
            c = null,
            f = null;
        for (let p = 1; p < o.length; p++) {
            let u = o[p].trim();
            if (u)
                if (u.startsWith('#EXT')) {
                    let h = u.indexOf(':'),
                        _,
                        x;
                    switch (
                        (h === -1
                            ? ((_ = u.substring(1)), (x = null))
                            : ((_ = u.substring(1, h)),
                              (x = u.substring(h + 1))),
                        _)
                    ) {
                        case 'EXT-X-STREAM-INF': {
                            a.isMaster = !0;
                            let S = N(x),
                                m = o[++p].trim();
                            a.variants.push({
                                attributes: S,
                                uri: m,
                                resolvedUri: new URL(m, t).href,
                            });
                            break;
                        }
                        case 'EXT-X-MEDIA':
                            ((a.isMaster = !0), a.media.push(N(x)));
                            break;
                        case 'EXT-X-I-FRAME-STREAM-INF':
                            ((a.isMaster = !0),
                                a.tags.push({ name: _, value: N(x) }));
                            break;
                        case 'EXTINF': {
                            let [S, m] = x.split(','),
                                b = parseFloat(S);
                            (isNaN(b) && (b = 0),
                                (s = {
                                    duration: b,
                                    title: m || '',
                                    tags: [],
                                    key: c,
                                    parts: [],
                                    bitrate: f,
                                    gap: !1,
                                    type: 'Media',
                                }));
                            break;
                        }
                        case 'EXT-X-GAP':
                            s &&
                                ((s.gap = !0),
                                (s.uri = null),
                                (s.resolvedUrl = null),
                                a.segments.push(s),
                                (s = null));
                            break;
                        case 'EXT-X-BITRATE':
                            f = parseInt(x, 10);
                            break;
                        case 'EXT-X-BYTERANGE':
                            s && (s.byteRange = x);
                            break;
                        case 'EXT-X-DISCONTINUITY':
                            s && (s.discontinuity = !0);
                            break;
                        case 'EXT-X-KEY': {
                            let S = N(x);
                            ((c = S),
                                S.METHOD === 'NONE' && (c = null),
                                a.tags.push({ name: _, value: S }));
                            break;
                        }
                        case 'EXT-X-MAP':
                            a.map = N(x);
                            break;
                        case 'EXT-X-PROGRAM-DATE-TIME':
                            s && (s.dateTime = x);
                            break;
                        case 'EXT-X-TARGETDURATION':
                            a.targetDuration = parseInt(x, 10);
                            break;
                        case 'EXT-X-MEDIA-SEQUENCE':
                            a.mediaSequence = parseInt(x, 10);
                            break;
                        case 'EXT-X-PLAYLIST-TYPE':
                            ((a.playlistType = x),
                                x === 'VOD' && (a.isLive = !1));
                            break;
                        case 'EXT-X-ENDLIST':
                            ((a.isLive = !1),
                                a.tags.push({ name: _, value: null }));
                            break;
                        case 'EXT-X-VERSION':
                            ((a.version = parseInt(x, 10)),
                                a.tags.push({ name: _, value: a.version }));
                            break;
                        case 'EXT-X-PART-INF':
                            ((a.partInf = N(x)),
                                a.tags.push({ name: _, value: a.partInf }));
                            break;
                        case 'EXT-X-SERVER-CONTROL':
                            ((a.serverControl = N(x)),
                                a.tags.push({
                                    name: _,
                                    value: a.serverControl,
                                }));
                            break;
                        case 'EXT-X-PART':
                            if (s) {
                                let S = N(x);
                                s.parts.push({
                                    ...S,
                                    resolvedUri: new URL(String(S.URI), t).href,
                                });
                            }
                            break;
                        case 'EXT-X-PRELOAD-HINT':
                            (a.preloadHints.push(N(x)),
                                a.tags.push({
                                    name: _,
                                    value: a.preloadHints.at(-1),
                                }));
                            break;
                        case 'EXT-X-RENDITION-REPORT':
                            (a.renditionReports.push(N(x)),
                                a.tags.push({
                                    name: _,
                                    value: a.renditionReports.at(-1),
                                }));
                            break;
                        case 'EXT-X-DEFINE':
                        case 'EXT-X-SKIP':
                        case 'EXT-X-CONTENT-STEERING':
                        case 'EXT-X-DATERANGE':
                        case 'EXT-X-SESSION-DATA':
                            a.tags.push({ name: _, value: N(x) });
                            break;
                        default:
                            s
                                ? s.tags.push({ name: _, value: x })
                                : a.tags.push({ name: _, value: x });
                            break;
                    }
                } else
                    u.startsWith('#') ||
                        (s &&
                            ((s.uri = u),
                            (s.resolvedUrl = new URL(u, t).href),
                            a.segments.push(s),
                            (s = null)));
        }
        return { manifest: oo(a), definedVariables: l, baseUrl: t };
    }
    function we(e, t) {
        return so(e, t);
    }
    var ao =
            ':A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD',
        ks = ao + '\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040',
        Ms = '[' + ao + '][' + ks + ']*',
        ws = new RegExp('^' + Ms + '$');
    function me(e, t) {
        let n = [],
            i = t.exec(e);
        for (; i; ) {
            let r = [];
            r.startIndex = t.lastIndex - i[0].length;
            let o = i.length;
            for (let l = 0; l < o; l++) r.push(i[l]);
            (n.push(r), (i = t.exec(e)));
        }
        return n;
    }
    var oe = function (e) {
        let t = ws.exec(e);
        return !(t === null || typeof t > 'u');
    };
    function lo(e) {
        return typeof e < 'u';
    }
    var Ls = { allowBooleanAttributes: !1, unpairedTags: [] };
    function mo(e, t) {
        t = Object.assign({}, Ls, t);
        let n = [],
            i = !1,
            r = !1;
        e[0] === '\uFEFF' && (e = e.substr(1));
        for (let o = 0; o < e.length; o++)
            if (e[o] === '<' && e[o + 1] === '?') {
                if (((o += 2), (o = co(e, o)), o.err)) return o;
            } else if (e[o] === '<') {
                let l = o;
                if ((o++, e[o] === '!')) {
                    o = po(e, o);
                    continue;
                } else {
                    let a = !1;
                    e[o] === '/' && ((a = !0), o++);
                    let s = '';
                    for (
                        ;
                        o < e.length &&
                        e[o] !== '>' &&
                        e[o] !== ' ' &&
                        e[o] !== '	' &&
                        e[o] !==
                            `
` &&
                        e[o] !== '\r';
                        o++
                    )
                        s += e[o];
                    if (
                        ((s = s.trim()),
                        s[s.length - 1] === '/' &&
                            ((s = s.substring(0, s.length - 1)), o--),
                        !Hs(s))
                    ) {
                        let d;
                        return (
                            s.trim().length === 0
                                ? (d = "Invalid space after '<'.")
                                : (d = "Tag '" + s + "' is an invalid name."),
                            I('InvalidTag', d, U(e, o))
                        );
                    }
                    let c = zs(e, o);
                    if (c === !1)
                        return I(
                            'InvalidAttr',
                            "Attributes for '" + s + "' have open quote.",
                            U(e, o)
                        );
                    let f = c.value;
                    if (((o = c.index), f[f.length - 1] === '/')) {
                        let d = o - f.length;
                        f = f.substring(0, f.length - 1);
                        let p = uo(f, t);
                        if (p === !0) i = !0;
                        else
                            return I(
                                p.err.code,
                                p.err.msg,
                                U(e, d + p.err.line)
                            );
                    } else if (a)
                        if (c.tagClosed) {
                            if (f.trim().length > 0)
                                return I(
                                    'InvalidTag',
                                    "Closing tag '" +
                                        s +
                                        "' can't have attributes or invalid starting.",
                                    U(e, l)
                                );
                            if (n.length === 0)
                                return I(
                                    'InvalidTag',
                                    "Closing tag '" +
                                        s +
                                        "' has not been opened.",
                                    U(e, l)
                                );
                            {
                                let d = n.pop();
                                if (s !== d.tagName) {
                                    let p = U(e, d.tagStartPos);
                                    return I(
                                        'InvalidTag',
                                        "Expected closing tag '" +
                                            d.tagName +
                                            "' (opened in line " +
                                            p.line +
                                            ', col ' +
                                            p.col +
                                            ") instead of closing tag '" +
                                            s +
                                            "'.",
                                        U(e, l)
                                    );
                                }
                                n.length == 0 && (r = !0);
                            }
                        } else
                            return I(
                                'InvalidTag',
                                "Closing tag '" +
                                    s +
                                    "' doesn't have proper closing.",
                                U(e, o)
                            );
                    else {
                        let d = uo(f, t);
                        if (d !== !0)
                            return I(
                                d.err.code,
                                d.err.msg,
                                U(e, o - f.length + d.err.line)
                            );
                        if (r === !0)
                            return I(
                                'InvalidXml',
                                'Multiple possible root nodes found.',
                                U(e, o)
                            );
                        (t.unpairedTags.indexOf(s) !== -1 ||
                            n.push({ tagName: s, tagStartPos: l }),
                            (i = !0));
                    }
                    for (o++; o < e.length; o++)
                        if (e[o] === '<')
                            if (e[o + 1] === '!') {
                                (o++, (o = po(e, o)));
                                continue;
                            } else if (e[o + 1] === '?') {
                                if (((o = co(e, ++o)), o.err)) return o;
                            } else break;
                        else if (e[o] === '&') {
                            let d = Vs(e, o);
                            if (d == -1)
                                return I(
                                    'InvalidChar',
                                    "char '&' is not expected.",
                                    U(e, o)
                                );
                            o = d;
                        } else if (r === !0 && !fo(e[o]))
                            return I(
                                'InvalidXml',
                                'Extra text at the end',
                                U(e, o)
                            );
                    e[o] === '<' && o--;
                }
            } else {
                if (fo(e[o])) continue;
                return I(
                    'InvalidChar',
                    "char '" + e[o] + "' is not expected.",
                    U(e, o)
                );
            }
        if (i) {
            if (n.length == 1)
                return I(
                    'InvalidTag',
                    "Unclosed tag '" + n[0].tagName + "'.",
                    U(e, n[0].tagStartPos)
                );
            if (n.length > 0)
                return I(
                    'InvalidXml',
                    "Invalid '" +
                        JSON.stringify(
                            n.map((o) => o.tagName),
                            null,
                            4
                        ).replace(/\r?\n/g, '') +
                        "' found.",
                    { line: 1, col: 1 }
                );
        } else return I('InvalidXml', 'Start tag expected.', 1);
        return !0;
    }
    function fo(e) {
        return (
            e === ' ' ||
            e === '	' ||
            e ===
                `
` ||
            e === '\r'
        );
    }
    function co(e, t) {
        let n = t;
        for (; t < e.length; t++)
            if (e[t] == '?' || e[t] == ' ') {
                let i = e.substr(n, t - n);
                if (t > 5 && i === 'xml')
                    return I(
                        'InvalidXml',
                        'XML declaration allowed only at the start of the document.',
                        U(e, t)
                    );
                if (e[t] == '?' && e[t + 1] == '>') {
                    t++;
                    break;
                } else continue;
            }
        return t;
    }
    function po(e, t) {
        if (e.length > t + 5 && e[t + 1] === '-' && e[t + 2] === '-') {
            for (t += 3; t < e.length; t++)
                if (e[t] === '-' && e[t + 1] === '-' && e[t + 2] === '>') {
                    t += 2;
                    break;
                }
        } else if (
            e.length > t + 8 &&
            e[t + 1] === 'D' &&
            e[t + 2] === 'O' &&
            e[t + 3] === 'C' &&
            e[t + 4] === 'T' &&
            e[t + 5] === 'Y' &&
            e[t + 6] === 'P' &&
            e[t + 7] === 'E'
        ) {
            let n = 1;
            for (t += 8; t < e.length; t++)
                if (e[t] === '<') n++;
                else if (e[t] === '>' && (n--, n === 0)) break;
        } else if (
            e.length > t + 9 &&
            e[t + 1] === '[' &&
            e[t + 2] === 'C' &&
            e[t + 3] === 'D' &&
            e[t + 4] === 'A' &&
            e[t + 5] === 'T' &&
            e[t + 6] === 'A' &&
            e[t + 7] === '['
        ) {
            for (t += 8; t < e.length; t++)
                if (e[t] === ']' && e[t + 1] === ']' && e[t + 2] === '>') {
                    t += 2;
                    break;
                }
        }
        return t;
    }
    var Bs = '"',
        Rs = "'";
    function zs(e, t) {
        let n = '',
            i = '',
            r = !1;
        for (; t < e.length; t++) {
            if (e[t] === Bs || e[t] === Rs)
                i === '' ? (i = e[t]) : i !== e[t] || (i = '');
            else if (e[t] === '>' && i === '') {
                r = !0;
                break;
            }
            n += e[t];
        }
        return i !== '' ? !1 : { value: n, index: t, tagClosed: r };
    }
    var Ns = new RegExp(
        `(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['"])(([\\s\\S])*?)\\5)?`,
        'g'
    );
    function uo(e, t) {
        let n = me(e, Ns),
            i = {};
        for (let r = 0; r < n.length; r++) {
            if (n[r][1].length === 0)
                return I(
                    'InvalidAttr',
                    "Attribute '" + n[r][2] + "' has no space in starting.",
                    se(n[r])
                );
            if (n[r][3] !== void 0 && n[r][4] === void 0)
                return I(
                    'InvalidAttr',
                    "Attribute '" + n[r][2] + "' is without value.",
                    se(n[r])
                );
            if (n[r][3] === void 0 && !t.allowBooleanAttributes)
                return I(
                    'InvalidAttr',
                    "boolean attribute '" + n[r][2] + "' is not allowed.",
                    se(n[r])
                );
            let o = n[r][2];
            if (!$s(o))
                return I(
                    'InvalidAttr',
                    "Attribute '" + o + "' is an invalid name.",
                    se(n[r])
                );
            if (!i.hasOwnProperty(o)) i[o] = 1;
            else
                return I(
                    'InvalidAttr',
                    "Attribute '" + o + "' is repeated.",
                    se(n[r])
                );
        }
        return !0;
    }
    function Fs(e, t) {
        let n = /\d/;
        for (e[t] === 'x' && (t++, (n = /[\da-fA-F]/)); t < e.length; t++) {
            if (e[t] === ';') return t;
            if (!e[t].match(n)) break;
        }
        return -1;
    }
    function Vs(e, t) {
        if ((t++, e[t] === ';')) return -1;
        if (e[t] === '#') return (t++, Fs(e, t));
        let n = 0;
        for (; t < e.length; t++, n++)
            if (!(e[t].match(/\w/) && n < 20)) {
                if (e[t] === ';') break;
                return -1;
            }
        return t;
    }
    function I(e, t, n) {
        return { err: { code: e, msg: t, line: n.line || n, col: n.col } };
    }
    function $s(e) {
        return oe(e);
    }
    function Hs(e) {
        return oe(e);
    }
    function U(e, t) {
        let n = e.substring(0, t).split(/\r?\n/);
        return { line: n.length, col: n[n.length - 1].length + 1 };
    }
    function se(e) {
        return e.startIndex + e[1].length;
    }
    var Os = {
            preserveOrder: !1,
            attributeNamePrefix: '@_',
            attributesGroupName: !1,
            textNodeName: '#text',
            ignoreAttributes: !0,
            removeNSPrefix: !1,
            allowBooleanAttributes: !1,
            parseTagValue: !0,
            parseAttributeValue: !1,
            trimValues: !0,
            cdataPropName: !1,
            numberParseOptions: { hex: !0, leadingZeros: !0, eNotation: !0 },
            tagValueProcessor: function (e, t) {
                return t;
            },
            attributeValueProcessor: function (e, t) {
                return t;
            },
            stopNodes: [],
            alwaysCreateTextNode: !1,
            isArray: () => !1,
            commentPropName: !1,
            unpairedTags: [],
            processEntities: !0,
            htmlEntities: !1,
            ignoreDeclaration: !1,
            ignorePiTags: !1,
            transformTagName: !1,
            transformAttributeName: !1,
            updateTag: function (e, t, n) {
                return e;
            },
            captureMetaData: !1,
        },
        go = function (e) {
            return Object.assign({}, Os, e);
        };
    var ge;
    typeof Symbol != 'function'
        ? (ge = '@@xmlMetadata')
        : (ge = Symbol('XML Node Metadata'));
    var L = class {
        constructor(t) {
            ((this.tagname = t), (this.child = []), (this[':@'] = {}));
        }
        add(t, n) {
            (t === '__proto__' && (t = '#__proto__'),
                this.child.push({ [t]: n }));
        }
        addChild(t, n) {
            (t.tagname === '__proto__' && (t.tagname = '#__proto__'),
                t[':@'] && Object.keys(t[':@']).length > 0
                    ? this.child.push({ [t.tagname]: t.child, ':@': t[':@'] })
                    : this.child.push({ [t.tagname]: t.child }),
                n !== void 0 &&
                    (this.child[this.child.length - 1][ge] = {
                        startIndex: n,
                    }));
        }
        static getMetaDataSymbol() {
            return ge;
        }
    };
    function Le(e, t) {
        let n = {};
        if (
            e[t + 3] === 'O' &&
            e[t + 4] === 'C' &&
            e[t + 5] === 'T' &&
            e[t + 6] === 'Y' &&
            e[t + 7] === 'P' &&
            e[t + 8] === 'E'
        ) {
            t = t + 9;
            let i = 1,
                r = !1,
                o = !1,
                l = '';
            for (; t < e.length; t++)
                if (e[t] === '<' && !o) {
                    if (r && Y(e, '!ENTITY', t)) {
                        t += 7;
                        let a, s;
                        (([a, s, t] = Xs(e, t + 1)),
                            s.indexOf('&') === -1 &&
                                (n[a] = {
                                    regx: RegExp(`&${a};`, 'g'),
                                    val: s,
                                }));
                    } else if (r && Y(e, '!ELEMENT', t)) {
                        t += 8;
                        let { index: a } = js(e, t + 1);
                        t = a;
                    } else if (r && Y(e, '!ATTLIST', t)) t += 8;
                    else if (r && Y(e, '!NOTATION', t)) {
                        t += 9;
                        let { index: a } = Gs(e, t + 1);
                        t = a;
                    } else if (Y(e, '!--', t)) o = !0;
                    else throw new Error('Invalid DOCTYPE');
                    (i++, (l = ''));
                } else if (e[t] === '>') {
                    if (
                        (o
                            ? e[t - 1] === '-' &&
                              e[t - 2] === '-' &&
                              ((o = !1), i--)
                            : i--,
                        i === 0)
                    )
                        break;
                } else e[t] === '[' ? (r = !0) : (l += e[t]);
            if (i !== 0) throw new Error('Unclosed DOCTYPE');
        } else throw new Error('Invalid Tag instead of DOCTYPE');
        return { entities: n, i: t };
    }
    var X = (e, t) => {
        for (; t < e.length && /\s/.test(e[t]); ) t++;
        return t;
    };
    function Xs(e, t) {
        t = X(e, t);
        let n = '';
        for (
            ;
            t < e.length && !/\s/.test(e[t]) && e[t] !== '"' && e[t] !== "'";

        )
            ((n += e[t]), t++);
        if (
            (Be(n),
            (t = X(e, t)),
            e.substring(t, t + 6).toUpperCase() === 'SYSTEM')
        )
            throw new Error('External entities are not supported');
        if (e[t] === '%')
            throw new Error('Parameter entities are not supported');
        let i = '';
        return (([t, i] = he(e, t, 'entity')), t--, [n, i, t]);
    }
    function Gs(e, t) {
        t = X(e, t);
        let n = '';
        for (; t < e.length && !/\s/.test(e[t]); ) ((n += e[t]), t++);
        (Be(n), (t = X(e, t)));
        let i = e.substring(t, t + 6).toUpperCase();
        if (i !== 'SYSTEM' && i !== 'PUBLIC')
            throw new Error(`Expected SYSTEM or PUBLIC, found "${i}"`);
        ((t += i.length), (t = X(e, t)));
        let r = null,
            o = null;
        if (i === 'PUBLIC')
            (([t, r] = he(e, t, 'publicIdentifier')),
                (t = X(e, t)),
                (e[t] === '"' || e[t] === "'") &&
                    ([t, o] = he(e, t, 'systemIdentifier')));
        else if (
            i === 'SYSTEM' &&
            (([t, o] = he(e, t, 'systemIdentifier')), !o)
        )
            throw new Error(
                'Missing mandatory system identifier for SYSTEM notation'
            );
        return {
            notationName: n,
            publicIdentifier: r,
            systemIdentifier: o,
            index: --t,
        };
    }
    function he(e, t, n) {
        let i = '',
            r = e[t];
        if (r !== '"' && r !== "'")
            throw new Error(`Expected quoted string, found "${r}"`);
        for (t++; t < e.length && e[t] !== r; ) ((i += e[t]), t++);
        if (e[t] !== r) throw new Error(`Unterminated ${n} value`);
        return (t++, [t, i]);
    }
    function js(e, t) {
        t = X(e, t);
        let n = '';
        for (; t < e.length && !/\s/.test(e[t]); ) ((n += e[t]), t++);
        if (!Be(n)) throw new Error(`Invalid element name: "${n}"`);
        t = X(e, t);
        let i = '';
        if (e[t] === 'E' && Y(e, 'MPTY', t)) t += 4;
        else if (e[t] === 'A' && Y(e, 'NY', t)) t += 2;
        else if (e[t] === '(') {
            for (t++; t < e.length && e[t] !== ')'; ) ((i += e[t]), t++);
            if (e[t] !== ')') throw new Error('Unterminated content model');
        } else throw new Error(`Invalid Element Expression, found "${e[t]}"`);
        return { elementName: n, contentModel: i.trim(), index: t };
    }
    function Y(e, t, n) {
        for (let i = 0; i < t.length; i++) if (t[i] !== e[n + i + 1]) return !1;
        return !0;
    }
    function Be(e) {
        if (oe(e)) return e;
        throw new Error(`Invalid entity name ${e}`);
    }
    var Ws = /^[-+]?0x[a-fA-F0-9]+$/,
        qs = /^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/,
        Ys = { hex: !0, leadingZeros: !0, decimalPoint: '.', eNotation: !0 };
    function Re(e, t = {}) {
        if (((t = Object.assign({}, Ys, t)), !e || typeof e != 'string'))
            return e;
        let n = e.trim();
        if (t.skipLike !== void 0 && t.skipLike.test(n)) return e;
        if (e === '0') return 0;
        if (t.hex && Ws.test(n)) return Zs(n, 16);
        if (n.search(/.+[eE].+/) !== -1) return Qs(e, n, t);
        {
            let i = qs.exec(n);
            if (i) {
                let r = i[1] || '',
                    o = i[2],
                    l = Js(i[3]),
                    a = r ? e[o.length + 1] === '.' : e[o.length] === '.';
                if (!t.leadingZeros && (o.length > 1 || (o.length === 1 && !a)))
                    return e;
                {
                    let s = Number(n),
                        c = String(s);
                    if (s === 0) return s;
                    if (c.search(/[eE]/) !== -1) return t.eNotation ? s : e;
                    if (n.indexOf('.') !== -1)
                        return c === '0' || c === l || c === `${r}${l}` ? s : e;
                    let f = o ? l : n;
                    return o
                        ? f === c || r + f === c
                            ? s
                            : e
                        : f === c || f === r + c
                          ? s
                          : e;
                }
            } else return e;
        }
    }
    var Ks = /^([-+])?(0*)(\d*(\.\d*)?[eE][-\+]?\d+)$/;
    function Qs(e, t, n) {
        if (!n.eNotation) return e;
        let i = t.match(Ks);
        if (i) {
            let r = i[1] || '',
                o = i[3].indexOf('e') === -1 ? 'E' : 'e',
                l = i[2],
                a = r ? e[l.length + 1] === o : e[l.length] === o;
            return l.length > 1 && a
                ? e
                : l.length === 1 && (i[3].startsWith(`.${o}`) || i[3][0] === o)
                  ? Number(t)
                  : n.leadingZeros && !a
                    ? ((t = (i[1] || '') + i[3]), Number(t))
                    : e;
        } else return e;
    }
    function Js(e) {
        return (
            e &&
                e.indexOf('.') !== -1 &&
                ((e = e.replace(/0+$/, '')),
                e === '.'
                    ? (e = '0')
                    : e[0] === '.'
                      ? (e = '0' + e)
                      : e[e.length - 1] === '.' &&
                        (e = e.substring(0, e.length - 1))),
            e
        );
    }
    function Zs(e, t) {
        if (parseInt) return parseInt(e, t);
        if (Number.parseInt) return Number.parseInt(e, t);
        if (window && window.parseInt) return window.parseInt(e, t);
        throw new Error(
            'parseInt, Number.parseInt, window.parseInt are not supported'
        );
    }
    function ze(e) {
        return typeof e == 'function'
            ? e
            : Array.isArray(e)
              ? (t) => {
                    for (let n of e)
                        if (
                            (typeof n == 'string' && t === n) ||
                            (n instanceof RegExp && n.test(t))
                        )
                            return !0;
                }
              : () => !1;
    }
    var ae = class {
        constructor(t) {
            ((this.options = t),
                (this.currentNode = null),
                (this.tagsNodeStack = []),
                (this.docTypeEntities = {}),
                (this.lastEntities = {
                    apos: { regex: /&(apos|#39|#x27);/g, val: "'" },
                    gt: { regex: /&(gt|#62|#x3E);/g, val: '>' },
                    lt: { regex: /&(lt|#60|#x3C);/g, val: '<' },
                    quot: { regex: /&(quot|#34|#x22);/g, val: '"' },
                }),
                (this.ampEntity = { regex: /&(amp|#38|#x26);/g, val: '&' }),
                (this.htmlEntities = {
                    space: { regex: /&(nbsp|#160);/g, val: ' ' },
                    cent: { regex: /&(cent|#162);/g, val: '\xA2' },
                    pound: { regex: /&(pound|#163);/g, val: '\xA3' },
                    yen: { regex: /&(yen|#165);/g, val: '\xA5' },
                    euro: { regex: /&(euro|#8364);/g, val: '\u20AC' },
                    copyright: { regex: /&(copy|#169);/g, val: '\xA9' },
                    reg: { regex: /&(reg|#174);/g, val: '\xAE' },
                    inr: { regex: /&(inr|#8377);/g, val: '\u20B9' },
                    num_dec: {
                        regex: /&#([0-9]{1,7});/g,
                        val: (n, i) =>
                            String.fromCodePoint(Number.parseInt(i, 10)),
                    },
                    num_hex: {
                        regex: /&#x([0-9a-fA-F]{1,6});/g,
                        val: (n, i) =>
                            String.fromCodePoint(Number.parseInt(i, 16)),
                    },
                }),
                (this.addExternalEntities = ea),
                (this.parseXml = oa),
                (this.parseTextData = ta),
                (this.resolveNameSpace = na),
                (this.buildAttributesMap = ra),
                (this.isItStopNode = fa),
                (this.replaceEntitiesValue = aa),
                (this.readStopNodeData = da),
                (this.saveTextToParentTag = la),
                (this.addChild = sa),
                (this.ignoreAttributesFn = ze(this.options.ignoreAttributes)));
        }
    };
    function ea(e) {
        let t = Object.keys(e);
        for (let n = 0; n < t.length; n++) {
            let i = t[n];
            this.lastEntities[i] = {
                regex: new RegExp('&' + i + ';', 'g'),
                val: e[i],
            };
        }
    }
    function ta(e, t, n, i, r, o, l) {
        if (
            e !== void 0 &&
            (this.options.trimValues && !i && (e = e.trim()), e.length > 0)
        ) {
            l || (e = this.replaceEntitiesValue(e));
            let a = this.options.tagValueProcessor(t, e, n, r, o);
            return a == null
                ? e
                : typeof a != typeof e || a !== e
                  ? a
                  : this.options.trimValues
                    ? Fe(
                          e,
                          this.options.parseTagValue,
                          this.options.numberParseOptions
                      )
                    : e.trim() === e
                      ? Fe(
                            e,
                            this.options.parseTagValue,
                            this.options.numberParseOptions
                        )
                      : e;
        }
    }
    function na(e) {
        if (this.options.removeNSPrefix) {
            let t = e.split(':'),
                n = e.charAt(0) === '/' ? '/' : '';
            if (t[0] === 'xmlns') return '';
            t.length === 2 && (e = n + t[1]);
        }
        return e;
    }
    var ia = new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`, 'gm');
    function ra(e, t, n) {
        if (this.options.ignoreAttributes !== !0 && typeof e == 'string') {
            let i = me(e, ia),
                r = i.length,
                o = {};
            for (let l = 0; l < r; l++) {
                let a = this.resolveNameSpace(i[l][1]);
                if (this.ignoreAttributesFn(a, t)) continue;
                let s = i[l][4],
                    c = this.options.attributeNamePrefix + a;
                if (a.length)
                    if (
                        (this.options.transformAttributeName &&
                            (c = this.options.transformAttributeName(c)),
                        c === '__proto__' && (c = '#__proto__'),
                        s !== void 0)
                    ) {
                        (this.options.trimValues && (s = s.trim()),
                            (s = this.replaceEntitiesValue(s)));
                        let f = this.options.attributeValueProcessor(a, s, t);
                        f == null
                            ? (o[c] = s)
                            : typeof f != typeof s || f !== s
                              ? (o[c] = f)
                              : (o[c] = Fe(
                                    s,
                                    this.options.parseAttributeValue,
                                    this.options.numberParseOptions
                                ));
                    } else this.options.allowBooleanAttributes && (o[c] = !0);
            }
            if (!Object.keys(o).length) return;
            if (this.options.attributesGroupName) {
                let l = {};
                return ((l[this.options.attributesGroupName] = o), l);
            }
            return o;
        }
    }
    var oa = function (e) {
        e = e.replace(
            /\r\n?/g,
            `
`
        );
        let t = new L('!xml'),
            n = t,
            i = '',
            r = '';
        for (let o = 0; o < e.length; o++)
            if (e[o] === '<')
                if (e[o + 1] === '/') {
                    let a = K(e, '>', o, 'Closing Tag is not closed.'),
                        s = e.substring(o + 2, a).trim();
                    if (this.options.removeNSPrefix) {
                        let d = s.indexOf(':');
                        d !== -1 && (s = s.substr(d + 1));
                    }
                    (this.options.transformTagName &&
                        (s = this.options.transformTagName(s)),
                        n && (i = this.saveTextToParentTag(i, n, r)));
                    let c = r.substring(r.lastIndexOf('.') + 1);
                    if (s && this.options.unpairedTags.indexOf(s) !== -1)
                        throw new Error(
                            `Unpaired tag can not be used as closing tag: </${s}>`
                        );
                    let f = 0;
                    (c && this.options.unpairedTags.indexOf(c) !== -1
                        ? ((f = r.lastIndexOf('.', r.lastIndexOf('.') - 1)),
                          this.tagsNodeStack.pop())
                        : (f = r.lastIndexOf('.')),
                        (r = r.substring(0, f)),
                        (n = this.tagsNodeStack.pop()),
                        (i = ''),
                        (o = a));
                } else if (e[o + 1] === '?') {
                    let a = Ne(e, o, !1, '?>');
                    if (!a) throw new Error('Pi Tag is not closed.');
                    if (
                        ((i = this.saveTextToParentTag(i, n, r)),
                        !(
                            (this.options.ignoreDeclaration &&
                                a.tagName === '?xml') ||
                            this.options.ignorePiTags
                        ))
                    ) {
                        let s = new L(a.tagName);
                        (s.add(this.options.textNodeName, ''),
                            a.tagName !== a.tagExp &&
                                a.attrExpPresent &&
                                (s[':@'] = this.buildAttributesMap(
                                    a.tagExp,
                                    r,
                                    a.tagName
                                )),
                            this.addChild(n, s, r, o));
                    }
                    o = a.closeIndex + 1;
                } else if (e.substr(o + 1, 3) === '!--') {
                    let a = K(e, '-->', o + 4, 'Comment is not closed.');
                    if (this.options.commentPropName) {
                        let s = e.substring(o + 4, a - 2);
                        ((i = this.saveTextToParentTag(i, n, r)),
                            n.add(this.options.commentPropName, [
                                { [this.options.textNodeName]: s },
                            ]));
                    }
                    o = a;
                } else if (e.substr(o + 1, 2) === '!D') {
                    let a = Le(e, o);
                    ((this.docTypeEntities = a.entities), (o = a.i));
                } else if (e.substr(o + 1, 2) === '![') {
                    let a = K(e, ']]>', o, 'CDATA is not closed.') - 2,
                        s = e.substring(o + 9, a);
                    i = this.saveTextToParentTag(i, n, r);
                    let c = this.parseTextData(s, n.tagname, r, !0, !1, !0, !0);
                    (c == null && (c = ''),
                        this.options.cdataPropName
                            ? n.add(this.options.cdataPropName, [
                                  { [this.options.textNodeName]: s },
                              ])
                            : n.add(this.options.textNodeName, c),
                        (o = a + 2));
                } else {
                    let a = Ne(e, o, this.options.removeNSPrefix),
                        s = a.tagName,
                        c = a.rawTagName,
                        f = a.tagExp,
                        d = a.attrExpPresent,
                        p = a.closeIndex;
                    (this.options.transformTagName &&
                        (s = this.options.transformTagName(s)),
                        n &&
                            i &&
                            n.tagname !== '!xml' &&
                            (i = this.saveTextToParentTag(i, n, r, !1)));
                    let u = n;
                    (u &&
                        this.options.unpairedTags.indexOf(u.tagname) !== -1 &&
                        ((n = this.tagsNodeStack.pop()),
                        (r = r.substring(0, r.lastIndexOf('.')))),
                        s !== t.tagname && (r += r ? '.' + s : s));
                    let h = o;
                    if (this.isItStopNode(this.options.stopNodes, r, s)) {
                        let _ = '';
                        if (f.length > 0 && f.lastIndexOf('/') === f.length - 1)
                            (s[s.length - 1] === '/'
                                ? ((s = s.substr(0, s.length - 1)),
                                  (r = r.substr(0, r.length - 1)),
                                  (f = s))
                                : (f = f.substr(0, f.length - 1)),
                                (o = a.closeIndex));
                        else if (this.options.unpairedTags.indexOf(s) !== -1)
                            o = a.closeIndex;
                        else {
                            let S = this.readStopNodeData(e, c, p + 1);
                            if (!S) throw new Error(`Unexpected end of ${c}`);
                            ((o = S.i), (_ = S.tagContent));
                        }
                        let x = new L(s);
                        (s !== f &&
                            d &&
                            (x[':@'] = this.buildAttributesMap(f, r, s)),
                            _ &&
                                (_ = this.parseTextData(
                                    _,
                                    s,
                                    r,
                                    !0,
                                    d,
                                    !0,
                                    !0
                                )),
                            (r = r.substr(0, r.lastIndexOf('.'))),
                            x.add(this.options.textNodeName, _),
                            this.addChild(n, x, r, h));
                    } else {
                        if (
                            f.length > 0 &&
                            f.lastIndexOf('/') === f.length - 1
                        ) {
                            (s[s.length - 1] === '/'
                                ? ((s = s.substr(0, s.length - 1)),
                                  (r = r.substr(0, r.length - 1)),
                                  (f = s))
                                : (f = f.substr(0, f.length - 1)),
                                this.options.transformTagName &&
                                    (s = this.options.transformTagName(s)));
                            let _ = new L(s);
                            (s !== f &&
                                d &&
                                (_[':@'] = this.buildAttributesMap(f, r, s)),
                                this.addChild(n, _, r, h),
                                (r = r.substr(0, r.lastIndexOf('.'))));
                        } else {
                            let _ = new L(s);
                            (this.tagsNodeStack.push(n),
                                s !== f &&
                                    d &&
                                    (_[':@'] = this.buildAttributesMap(
                                        f,
                                        r,
                                        s
                                    )),
                                this.addChild(n, _, r, h),
                                (n = _));
                        }
                        ((i = ''), (o = p));
                    }
                }
            else i += e[o];
        return t.child;
    };
    function sa(e, t, n, i) {
        this.options.captureMetaData || (i = void 0);
        let r = this.options.updateTag(t.tagname, n, t[':@']);
        r === !1 || (typeof r == 'string' && (t.tagname = r), e.addChild(t, i));
    }
    var aa = function (e) {
        if (this.options.processEntities) {
            for (let t in this.docTypeEntities) {
                let n = this.docTypeEntities[t];
                e = e.replace(n.regx, n.val);
            }
            for (let t in this.lastEntities) {
                let n = this.lastEntities[t];
                e = e.replace(n.regex, n.val);
            }
            if (this.options.htmlEntities)
                for (let t in this.htmlEntities) {
                    let n = this.htmlEntities[t];
                    e = e.replace(n.regex, n.val);
                }
            e = e.replace(this.ampEntity.regex, this.ampEntity.val);
        }
        return e;
    };
    function la(e, t, n, i) {
        return (
            e &&
                (i === void 0 && (i = t.child.length === 0),
                (e = this.parseTextData(
                    e,
                    t.tagname,
                    n,
                    !1,
                    t[':@'] ? Object.keys(t[':@']).length !== 0 : !1,
                    i
                )),
                e !== void 0 && e !== '' && t.add(this.options.textNodeName, e),
                (e = '')),
            e
        );
    }
    function fa(e, t, n) {
        let i = '*.' + n;
        for (let r in e) {
            let o = e[r];
            if (i === o || t === o) return !0;
        }
        return !1;
    }
    function ca(e, t, n = '>') {
        let i,
            r = '';
        for (let o = t; o < e.length; o++) {
            let l = e[o];
            if (i) l === i && (i = '');
            else if (l === '"' || l === "'") i = l;
            else if (l === n[0])
                if (n[1]) {
                    if (e[o + 1] === n[1]) return { data: r, index: o };
                } else return { data: r, index: o };
            else l === '	' && (l = ' ');
            r += l;
        }
    }
    function K(e, t, n, i) {
        let r = e.indexOf(t, n);
        if (r === -1) throw new Error(i);
        return r + t.length - 1;
    }
    function Ne(e, t, n, i = '>') {
        let r = ca(e, t + 1, i);
        if (!r) return;
        let o = r.data,
            l = r.index,
            a = o.search(/\s/),
            s = o,
            c = !0;
        a !== -1 &&
            ((s = o.substring(0, a)), (o = o.substring(a + 1).trimStart()));
        let f = s;
        if (n) {
            let d = s.indexOf(':');
            d !== -1 &&
                ((s = s.substr(d + 1)), (c = s !== r.data.substr(d + 1)));
        }
        return {
            tagName: s,
            tagExp: o,
            closeIndex: l,
            attrExpPresent: c,
            rawTagName: f,
        };
    }
    function da(e, t, n) {
        let i = n,
            r = 1;
        for (; n < e.length; n++)
            if (e[n] === '<')
                if (e[n + 1] === '/') {
                    let o = K(e, '>', n, `${t} is not closed`);
                    if (e.substring(n + 2, o).trim() === t && (r--, r === 0))
                        return { tagContent: e.substring(i, n), i: o };
                    n = o;
                } else if (e[n + 1] === '?')
                    n = K(e, '?>', n + 1, 'StopNode is not closed.');
                else if (e.substr(n + 1, 3) === '!--')
                    n = K(e, '-->', n + 3, 'StopNode is not closed.');
                else if (e.substr(n + 1, 2) === '![')
                    n = K(e, ']]>', n, 'StopNode is not closed.') - 2;
                else {
                    let o = Ne(e, n, '>');
                    o &&
                        ((o && o.tagName) === t &&
                            o.tagExp[o.tagExp.length - 1] !== '/' &&
                            r++,
                        (n = o.closeIndex));
                }
    }
    function Fe(e, t, n) {
        if (t && typeof e == 'string') {
            let i = e.trim();
            return i === 'true' ? !0 : i === 'false' ? !1 : Re(e, n);
        } else return lo(e) ? e : '';
    }
    var Ve = L.getMetaDataSymbol();
    function $e(e, t) {
        return ho(e, t);
    }
    function ho(e, t, n) {
        let i,
            r = {};
        for (let o = 0; o < e.length; o++) {
            let l = e[o],
                a = pa(l),
                s = '';
            if (
                (n === void 0 ? (s = a) : (s = n + '.' + a),
                a === t.textNodeName)
            )
                i === void 0 ? (i = l[a]) : (i += '' + l[a]);
            else {
                if (a === void 0) continue;
                if (l[a]) {
                    let c = ho(l[a], t, s),
                        f = ma(c, t);
                    (l[Ve] !== void 0 && (c[Ve] = l[Ve]),
                        l[':@']
                            ? ua(c, l[':@'], s, t)
                            : Object.keys(c).length === 1 &&
                                c[t.textNodeName] !== void 0 &&
                                !t.alwaysCreateTextNode
                              ? (c = c[t.textNodeName])
                              : Object.keys(c).length === 0 &&
                                (t.alwaysCreateTextNode
                                    ? (c[t.textNodeName] = '')
                                    : (c = '')),
                        r[a] !== void 0 && r.hasOwnProperty(a)
                            ? (Array.isArray(r[a]) || (r[a] = [r[a]]),
                              r[a].push(c))
                            : t.isArray(a, s, f)
                              ? (r[a] = [c])
                              : (r[a] = c));
                }
            }
        }
        return (
            typeof i == 'string'
                ? i.length > 0 && (r[t.textNodeName] = i)
                : i !== void 0 && (r[t.textNodeName] = i),
            r
        );
    }
    function pa(e) {
        let t = Object.keys(e);
        for (let n = 0; n < t.length; n++) {
            let i = t[n];
            if (i !== ':@') return i;
        }
    }
    function ua(e, t, n, i) {
        if (t) {
            let r = Object.keys(t),
                o = r.length;
            for (let l = 0; l < o; l++) {
                let a = r[l];
                i.isArray(a, n + '.' + a, !0, !0)
                    ? (e[a] = [t[a]])
                    : (e[a] = t[a]);
            }
        }
    }
    function ma(e, t) {
        let { textNodeName: n } = t,
            i = Object.keys(e).length;
        return !!(
            i === 0 ||
            (i === 1 && (e[n] || typeof e[n] == 'boolean' || e[n] === 0))
        );
    }
    var Z = class {
        constructor(t) {
            ((this.externalEntities = {}), (this.options = go(t)));
        }
        parse(t, n) {
            if (typeof t != 'string')
                if (t.toString) t = t.toString();
                else
                    throw new Error(
                        'XML data is accepted in String or Bytes[] form.'
                    );
            if (n) {
                n === !0 && (n = {});
                let o = mo(t, n);
                if (o !== !0)
                    throw Error(`${o.err.msg}:${o.err.line}:${o.err.col}`);
            }
            let i = new ae(this.options);
            i.addExternalEntities(this.externalEntities);
            let r = i.parseXml(t);
            return this.options.preserveOrder || r === void 0
                ? r
                : $e(r, this.options);
        }
        addEntity(t, n) {
            if (n.indexOf('&') !== -1)
                throw new Error("Entity value can't have '&'");
            if (t.indexOf('&') !== -1 || t.indexOf(';') !== -1)
                throw new Error(
                    "An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'"
                );
            if (n === '&')
                throw new Error("An entity with value '&' is not permitted");
            this.externalEntities[t] = n;
        }
        static getMetaDataSymbol() {
            return L.getMetaDataSymbol();
        }
    };
    function _o(e, t) {
        let n = {},
            i = y(e, 'type') === 'dynamic';
        return (
            Me(e, 'Representation').forEach(({ element: o, context: l }) => {
                let a = y(o, 'id');
                if (!a) return;
                n[a] = [];
                let { period: s, adaptationSet: c } = l;
                if (!s || !c) return;
                let f =
                        T(o, 'SegmentTemplate') ||
                        T(c, 'SegmentTemplate') ||
                        T(s, 'SegmentTemplate'),
                    d =
                        T(o, 'SegmentList') ||
                        T(c, 'SegmentList') ||
                        T(s, 'SegmentList'),
                    p =
                        T(o, 'SegmentBase') ||
                        T(c, 'SegmentBase') ||
                        T(s, 'SegmentBase'),
                    u = f ? y(f, 'initialization') : null;
                if (!u) {
                    let h = d || p,
                        _ = h ? T(h, 'Initialization') : null;
                    _ && (u = y(_, 'sourceURL'));
                }
                if (u) {
                    let h = u.replace(/\$RepresentationID\$/g, a);
                    n[a].push({
                        repId: a,
                        type: 'Init',
                        number: 0,
                        resolvedUrl: new URL(h, t).href,
                        template: h,
                        time: -1,
                        duration: 0,
                        timescale: parseInt(y(f || d, 'timescale') || '1'),
                    });
                }
                if (f) {
                    let h = parseInt(y(f, 'timescale') || '1'),
                        _ = y(f, 'media'),
                        x = T(f, 'SegmentTimeline'),
                        S = parseInt(y(f, 'startNumber') || '1');
                    if (_ && x) {
                        let m = S,
                            b = 0;
                        R(x, 'S').forEach((v) => {
                            let D = y(v, 't') ? parseInt(y(v, 't')) : b,
                                P = parseInt(y(v, 'd')),
                                V = parseInt(y(v, 'r') || '0');
                            b = D;
                            for (let $ = 0; $ <= V; $++) {
                                let E = b,
                                    A = _.replace(/\$RepresentationID\$/g, a)
                                        .replace(
                                            /\$Number(%0\d+d)?\$/g,
                                            (Ce, J) =>
                                                String(m).padStart(
                                                    J
                                                        ? parseInt(
                                                              J.substring(
                                                                  2,
                                                                  J.length - 1
                                                              )
                                                          )
                                                        : 1,
                                                    '0'
                                                )
                                        )
                                        .replace(/\$Time\$/g, String(E));
                                (n[a].push({
                                    repId: a,
                                    type: 'Media',
                                    number: m,
                                    resolvedUrl: new URL(A, t).href,
                                    template: A,
                                    time: E,
                                    duration: P,
                                    timescale: h,
                                }),
                                    (b += P),
                                    m++);
                            }
                        });
                    } else if (_ && y(f, 'duration')) {
                        let m = parseInt(y(f, 'duration')),
                            b = m / h,
                            v = 0,
                            D = S;
                        if (!i) {
                            let P =
                                k(y(e, 'mediaPresentationDuration')) ||
                                k(y(s, 'duration'));
                            if (!P || !b) return;
                            v = Math.ceil(P / b);
                        }
                        for (let P = 0; P < v; P++) {
                            let V = D + P,
                                $ = _.replace(
                                    /\$RepresentationID\$/g,
                                    a
                                ).replace(/\$Number(%0\d+d)?\$/g, (E, A) =>
                                    String(V).padStart(
                                        A
                                            ? parseInt(
                                                  A.substring(2, A.length - 1)
                                              )
                                            : 1,
                                        '0'
                                    )
                                );
                            n[a].push({
                                repId: a,
                                type: 'Media',
                                number: V,
                                resolvedUrl: new URL($, t).href,
                                template: $,
                                time: (V - S) * m,
                                duration: m,
                                timescale: h,
                            });
                        }
                    }
                } else if (d) {
                    let h = parseInt(y(d, 'timescale') || '1'),
                        _ = parseInt(y(d, 'duration')),
                        x = 0;
                    R(d, 'SegmentURL').forEach((m, b) => {
                        let v = y(m, 'media');
                        v &&
                            (n[a].push({
                                repId: a,
                                type: 'Media',
                                number: b + 1,
                                resolvedUrl: new URL(v, t).href,
                                template: v,
                                time: x,
                                duration: _,
                                timescale: h,
                            }),
                            (x += _));
                    });
                } else if (p) {
                    let h =
                            k(y(e, 'mediaPresentationDuration')) ||
                            k(y(s, 'duration')) ||
                            0,
                        _ =
                            T(s, 'AdaptationSet')?.representations?.[0]
                                ?.timescale || 1;
                    n[a].push({
                        repId: a,
                        type: 'Media',
                        number: 1,
                        resolvedUrl: t,
                        template: 'SegmentBase',
                        time: 0,
                        duration: h * _,
                        timescale: _,
                    });
                }
            }),
            n
        );
    }
    function Qo(e, t) {
        if (!e) return null;
        let n = e[':@'] || {},
            i = [];
        for (let r in e) {
            if (r === ':@' || r === '#text') continue;
            (Array.isArray(e[r]) ? e[r] : [e[r]]).forEach((l) => {
                typeof l == 'object' && i.push(Qo(l, r));
            });
        }
        return (
            e['#text'] !== void 0 &&
                i.push({ type: 'text', content: e['#text'] }),
            { type: 'element', tagName: t, attributes: n, children: i }
        );
    }
    async function Ba(e) {
        let t = e.manifestString.trim();
        (t.startsWith('#EXTM3U')
            ? (e.protocol = 'hls')
            : t.includes('<MPD')
              ? (e.protocol = 'dash')
              : (e.protocol = (e.url || e.file.name)
                    .toLowerCase()
                    .includes('.m3u8')
                    ? 'hls'
                    : 'dash'),
            self.postMessage({
                type: 'status-update',
                payload: {
                    message: `Parsing (${e.protocol.toUpperCase()})...`,
                },
            }));
        let n,
            i,
            r = e.url;
        if (e.protocol === 'hls') {
            let {
                manifest: p,
                definedVariables: u,
                baseUrl: h,
            } = await we(e.manifestString, e.url);
            ((n = p),
                (n.hlsDefinedVariables = u),
                (r = h),
                (n.rawElement = null));
        } else {
            let u = new Z({
                    ignoreAttributes: !1,
                    attributeNamePrefix: '',
                    attributesGroupName: ':@',
                    textNodeName: '#text',
                    allowBooleanAttributes: !0,
                    removeNSPrefix: !0,
                }).parse(e.manifestString),
                h = Object.keys(u).find((m) => m.toUpperCase() === 'MPD');
            if (!h)
                throw new Error(
                    'Could not find MPD root element in the manifest.'
                );
            i = Qo(u[h], 'MPD');
            let {
                manifest: _,
                serializedManifest: x,
                baseUrl: S,
            } = await io(i, e.url);
            ((n = _), (i = x), (r = S));
        }
        let { generateFeatureAnalysis: o } = await Promise.resolve().then(
                () => (Po(), Eo)
            ),
            l = o(n, e.protocol, i),
            a = new Map(Object.entries(l)),
            { diffManifest: s } = await Promise.resolve().then(
                () => ($o(), Vo)
            ),
            c = (await Promise.resolve().then(() => rs(Ko()))).default,
            f = null;
        e.protocol === 'hls' &&
            n.isMaster &&
            (f =
                (n.tags || []).find(
                    (p) => p.name === 'EXT-X-CONTENT-STEERING'
                ) || null);
        let d = {
            id: e.id,
            name: e.url ? new URL(e.url).hostname : e.file.name,
            originalUrl: e.url,
            baseUrl: r,
            protocol: e.protocol,
            isPolling: n.type === 'dynamic',
            manifest: n,
            rawManifest: e.manifestString,
            steeringInfo: f,
            manifestUpdates: [],
            activeManifestUpdateIndex: 0,
            mediaPlaylists: new Map(),
            activeMediaPlaylistUrl: null,
            activeManifestForView: n,
            featureAnalysis: { results: a, manifestCount: 1 },
            hlsVariantState: new Map(),
            dashRepresentationState: new Map(),
            semanticData: new Map(),
        };
        if (e.protocol === 'hls')
            n.isMaster
                ? (n.variants || []).forEach((p) => {
                      d.hlsVariantState.has(p.resolvedUri) ||
                          d.hlsVariantState.set(p.resolvedUri, {
                              segments: [],
                              freshSegmentUrls: new Set(),
                              isLoading: !1,
                              isPolling: n.type === 'dynamic',
                              isExpanded: !1,
                              displayMode: 'last10',
                              error: null,
                          });
                  })
                : d.hlsVariantState.set(d.originalUrl, {
                      segments: n.segments || [],
                      freshSegmentUrls: new Set(
                          (n.segments || []).map((p) => p.resolvedUrl)
                      ),
                      isLoading: !1,
                      isPolling: n.type === 'dynamic',
                      isExpanded: !0,
                      displayMode: 'last10',
                      error: null,
                  });
        else if (e.protocol === 'dash') {
            let p = _o(i, d.baseUrl);
            Object.entries(p).forEach(([u, h]) => {
                d.dashRepresentationState.set(u, {
                    segments: h,
                    freshSegmentUrls: new Set(h.map((_) => _.resolvedUrl)),
                });
            });
        }
        if (d.manifest.type === 'dynamic') {
            let p = d.rawManifest;
            d.protocol === 'dash' &&
                (p = c(d.rawManifest, {
                    indentation: '  ',
                    lineSeparator: `
`,
                }));
            let u = s('', p, d.protocol);
            d.manifestUpdates.push({
                timestamp: new Date().toLocaleTimeString(),
                diffHtml: u,
                rawManifest: d.rawManifest,
            });
        }
        return d;
    }
    async function Ra(e) {
        try {
            let t = await Promise.all(e.map(Ba));
            self.postMessage({
                type: 'analysis-complete',
                payload: { streams: t.filter(Boolean) },
            });
        } catch (t) {
            self.postMessage({
                type: 'analysis-error',
                payload: {
                    message: t.message,
                    error: { message: t.message, stack: t.stack },
                },
            });
        }
    }
    async function za({ streamId: e, url: t, hlsDefinedVariables: n }) {
        try {
            let i = await fetch(t);
            if (!i.ok) throw new Error(`HTTP error ${i.status}`);
            let r = await i.text(),
                { manifest: o } = await we(r, t, n);
            ((o.rawElement = null),
                o.summary && (o.summary.stream = null),
                self.postMessage({
                    type: 'hls-media-playlist-fetched',
                    payload: {
                        streamId: e,
                        url: t,
                        manifest: o,
                        rawManifest: r,
                    },
                }));
        } catch (i) {
            self.postMessage({
                type: 'hls-media-playlist-error',
                payload: { streamId: e, url: t, error: i.message },
            });
        }
    }
    self.onmessage = async (e) => {
        let { type: t, payload: n } = e.data;
        switch (t) {
            case 'start-analysis':
                await Ra(n.inputs);
                break;
            case 'fetch-hls-media-playlist':
                await za(n);
                break;
            case 'parse-segment': {
                let { url: i, data: r } = n,
                    o = null;
                try {
                    if (
                        (r.byteLength > 188 &&
                            new DataView(r).getUint8(0) === 71 &&
                            new DataView(r).getUint8(188) === 71) ||
                        i.toLowerCase().endsWith('.ts')
                    )
                        o = Jr(r);
                    else {
                        let { boxes: a, issues: s, events: c } = Ae(r);
                        o = {
                            format: 'isobmff',
                            data: { boxes: a, issues: s, events: c },
                        };
                    }
                    self.postMessage({ url: i, parsedData: o, error: null });
                } catch (l) {
                    self.postMessage({
                        url: i,
                        parsedData: { error: l.message },
                        error: l.message,
                    });
                }
                break;
            }
        }
    };
})();
