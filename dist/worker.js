(() => {
    var is = Object.create;
    var ke = Object.defineProperty;
    var rs = Object.getOwnPropertyDescriptor;
    var as = Object.getOwnPropertyNames;
    var ss = Object.getPrototypeOf,
        os = Object.prototype.hasOwnProperty;
    var B = (e, t) => () => (e && (t = e((e = 0))), t);
    var lt = (e, t) => () => (
            t || e((t = { exports: {} }).exports, t),
            t.exports
        ),
        ft = (e, t) => {
            for (var n in t) ke(e, n, { get: t[n], enumerable: !0 });
        },
        ls = (e, t, n, i) => {
            if ((t && typeof t == 'object') || typeof t == 'function')
                for (let r of as(t))
                    !os.call(e, r) &&
                        r !== n &&
                        ke(e, r, {
                            get: () => t[r],
                            enumerable: !(i = rs(t, r)) || i.enumerable,
                        });
            return e;
        };
    var fs = (e, t, n) => (
        (n = e != null ? is(ss(e)) : {}),
        ls(
            t || !e || !e.__esModule
                ? ke(n, 'default', { value: e, enumerable: !0 })
                : n,
            e
        )
    );
    function Se(e) {
        if (!e) return 'Unknown Scheme';
        let t = e.toLowerCase();
        return As[t] || `Unknown (${e})`;
    }
    var As,
        Be = B(() => {
            As = {
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
    function ze(e, t, n = {}) {
        let i = [];
        if (!e || typeof e != 'object') return i;
        for (let r in e) {
            if (r === ':@' || r === '#text') continue;
            let a = e[r];
            if (!a) continue;
            let o = Array.isArray(a) ? a : [a];
            for (let s of o) {
                if (typeof s != 'object') continue;
                let l = { ...n, parent: e };
                (r === 'Period' && (l.period = s),
                    r === 'AdaptationSet' && (l.adaptationSet = s),
                    r === t && i.push({ element: s, context: l }),
                    i.push(...ze(s, t, l)));
            }
        }
        return i;
    }
    function re(e, t) {
        if (!t) return e;
        if (!e) return t;
        let n = JSON.parse(JSON.stringify(e));
        Object.assign(n[':@'] || (n[':@'] = {}), t[':@']);
        for (let i in t)
            i !== ':@' &&
                (n[i] && Array.isArray(n[i]) && Array.isArray(t[i])
                    ? (n[i] = n[i].concat(t[i]))
                    : (n[i] = t[i]));
        return n;
    }
    function J(e, t) {
        let n = t.map((i) => k(i, e)).filter(Boolean);
        if (n.length !== 0) return n.reduceRight((i, r) => re(i, r));
    }
    function la(e, t, n, i, r) {
        let a = e,
            o = [t, n, i, r];
        for (let s of o) {
            if (!s) continue;
            let l = v(s, 'BaseURL');
            if (l.length > 0) {
                let c = ks(l[0]);
                if (c === null || c.trim() === '') {
                    a = e;
                    continue;
                }
                try {
                    a = new URL(c.trim(), a).href;
                } catch (f) {
                    console.warn(`Invalid URL part in BaseURL: "${c}"`, f);
                }
            }
        }
        return a;
    }
    var u,
        k,
        v,
        E,
        ks,
        G = B(() => {
            ((u = (e, t) => e?.[':@']?.[t]),
                (k = (e, t) => {
                    if (!e || !e[t]) return;
                    let n = e[t];
                    return Array.isArray(n) ? n[0] : n;
                }),
                (v = (e, t) => {
                    if (!e || !e[t]) return [];
                    let n = e[t];
                    return Array.isArray(n) ? n : [n];
                }),
                (E = (e, t) => {
                    let n = [];
                    if (!e || typeof e != 'object') return n;
                    for (let i in e) {
                        if (i === ':@' || i === '#text') continue;
                        let r = e[i];
                        if (!r) continue;
                        let a = Array.isArray(r) ? r : [r];
                        for (let o of a)
                            (i === t && n.push(o),
                                typeof o == 'object' &&
                                    (n = n.concat(E(o, t))));
                    }
                    return n;
                }));
            ks = (e) => e?.['#text'] || null;
        });
    var va,
        Ca = B(() => {
            va = [
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
    var Ea,
        Pa = B(() => {
            Ea = [
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
    function Da(e) {
        let t = {};
        if (!e)
            return {
                Error: {
                    used: !0,
                    details:
                        'Serialized XML object was not found for feature analysis.',
                },
            };
        for (let [n, i] of Object.entries(Io))
            try {
                t[n] = i(e);
            } catch (r) {
                (console.error(`Error analyzing feature "${n}":`, r),
                    (t[n] = { used: !1, details: 'Analysis failed.' }));
            }
        return t;
    }
    var Qe,
        K,
        Ye,
        Io,
        Aa = B(() => {
            Be();
            G();
            ((Qe = (e, t) => E(e, t)[0]),
                (K = (e, t, n) => (i) => {
                    let r = Qe(i, e);
                    return { used: !!r, details: r ? t(r) : n };
                }),
                (Ye = (e, t, n) => (i) => {
                    let a = E(i, e).length;
                    return a === 0
                        ? { used: !1, details: '' }
                        : {
                              used: !0,
                              details: `${a} ${a === 1 ? t : n} found.`,
                          };
                }),
                (Io = {
                    'Presentation Type': (e) => ({
                        used: !0,
                        details: `<code>${u(e, 'type')}</code>`,
                    }),
                    'MPD Locations': Ye(
                        'Location',
                        'location',
                        'locations provided'
                    ),
                    'Scoped Profiles': (e) => {
                        let t = E(e, 'AdaptationSet'),
                            n = E(e, 'Representation'),
                            i =
                                t.filter((a) => u(a, 'profiles')).length +
                                n.filter((a) => u(a, 'profiles')).length;
                        return i === 0
                            ? { used: !1, details: '' }
                            : {
                                  used: !0,
                                  details: `${i} ${i === 1 ? 'scoped profile' : 'scoped profiles'}`,
                              };
                    },
                    'Multi-Period': Ye('Period', 'Period', 'Periods'),
                    'Content Protection': (e) => {
                        let t = E(e, 'ContentProtection');
                        return t.length > 0
                            ? {
                                  used: !0,
                                  details: `Systems: <b>${[...new Set(t.map((i) => Se(u(i, 'schemeIdUri'))))].join(', ')}</b>`,
                              }
                            : {
                                  used: !1,
                                  details: 'No encryption descriptors found.',
                              };
                    },
                    'Client Authentication': K(
                        'EssentialProperty',
                        () => 'Signals requirement for client authentication.',
                        ''
                    ),
                    'Content Authorization': K(
                        'SupplementalProperty',
                        () => 'Signals requirement for content authorization.',
                        ''
                    ),
                    'Segment Templates': K(
                        'SegmentTemplate',
                        () => 'Uses templates for segment URL generation.',
                        ''
                    ),
                    'Segment Timeline': K(
                        'SegmentTimeline',
                        () =>
                            'Provides explicit segment timing via <code>&lt;S&gt;</code> elements.',
                        ''
                    ),
                    'Segment List': K(
                        'SegmentList',
                        () => 'Provides an explicit list of segment URLs.',
                        ''
                    ),
                    'Representation Index': Ye(
                        'RepresentationIndex',
                        'representation index',
                        'representation indices'
                    ),
                    'Low Latency Streaming': (e) => {
                        if (u(e, 'type') !== 'dynamic')
                            return {
                                used: !1,
                                details: 'Not a dynamic (live) manifest.',
                            };
                        let t = !!Qe(e, 'Latency'),
                            i = E(e, 'SegmentTemplate').some(
                                (r) =>
                                    u(r, 'availabilityTimeComplete') === 'false'
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
                    'Manifest Patch Updates': K(
                        'PatchLocation',
                        (e) =>
                            `Patch location: <code>${e['#text']?.trim()}</code>`,
                        'Uses full manifest reloads.'
                    ),
                    'UTC Timing Source': (e) => {
                        let t = E(e, 'UTCTiming');
                        return t.length > 0
                            ? {
                                  used: !0,
                                  details: `Schemes: ${[...new Set(t.map((i) => `<code>${u(i, 'schemeIdUri').split(':').pop()}</code>`))].join(', ')}`,
                              }
                            : {
                                  used: !1,
                                  details:
                                      'No clock synchronization source provided.',
                              };
                    },
                    'Dependent Representations': (e) => {
                        let t = E(e, 'Representation').filter((n) =>
                            u(n, 'dependencyId')
                        );
                        return t.length > 0
                            ? {
                                  used: !0,
                                  details: `${t.length} dependent Representations`,
                              }
                            : { used: !1, details: '' };
                    },
                    'Associated Representations': (e) => {
                        let t = E(e, 'Representation').filter((n) =>
                            u(n, 'associationId')
                        );
                        return t.length > 0
                            ? { used: !0, details: `${t.length} associations` }
                            : { used: !1, details: '' };
                    },
                    'Trick Modes': (e) => {
                        let t = Qe(e, 'SubRepresentation'),
                            n = E(e, 'Role').some(
                                (i) => u(i, 'value') === 'trick'
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
                        let t = E(e, 'AdaptationSet').filter(
                            (n) =>
                                u(n, 'contentType') === 'text' ||
                                u(n, 'mimeType')?.startsWith('application')
                        );
                        if (t.length > 0) {
                            let n = [
                                ...new Set(
                                    t.map((i) => u(i, 'lang')).filter(Boolean)
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
                        let t = E(e, 'Role');
                        return t.length > 0
                            ? {
                                  used: !0,
                                  details: `Roles found: ${[...new Set(t.map((i) => `<code>${u(i, 'value')}</code>`))].join(', ')}`,
                              }
                            : { used: !1, details: 'No roles specified.' };
                    },
                    'MPD Events': K(
                        'EventStream',
                        () =>
                            'Uses <EventStream> for out-of-band event signaling.',
                        ''
                    ),
                    'Inband Events': K(
                        'InbandEventStream',
                        () =>
                            'Uses <InbandEventStream> to signal events within segments.',
                        ''
                    ),
                }));
        });
    function ka(e) {
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
        let i = (e.segments || []).some((m) => m.discontinuity);
        t.Discontinuity = {
            used: i,
            details: i
                ? 'Contains #EXT-X-DISCONTINUITY tags.'
                : 'No discontinuities found.',
        };
        let r = n.find((m) => m.name === 'EXT-X-KEY');
        if (r && r.value.METHOD !== 'NONE') {
            let m = [
                ...new Set(
                    n
                        .filter((_) => _.name === 'EXT-X-KEY')
                        .map((_) => _.value.METHOD)
                ),
            ];
            t['Content Protection'] = {
                used: !0,
                details: `Methods: <b>${m.join(', ')}</b>`,
            };
        } else
            t['Content Protection'] = {
                used: !1,
                details: 'No #EXT-X-KEY tags found.',
            };
        let a = n.some((m) => m.name === 'EXT-X-MAP');
        ((t['Fragmented MP4 Segments'] = {
            used: a,
            details: a
                ? 'Uses #EXT-X-MAP, indicating fMP4 segments.'
                : 'Likely Transport Stream (TS) segments.',
        }),
            (t['I-Frame Playlists'] = {
                used: n.some((m) => m.name === 'EXT-X-I-FRAME-STREAM-INF'),
                details: 'Provides dedicated playlists for trick-play modes.',
            }));
        let o = n.filter((m) => m.name === 'EXT-X-MEDIA');
        ((t['Alternative Renditions'] = {
            used: o.length > 0,
            details:
                o.length > 0
                    ? `${o.length} #EXT-X-MEDIA tags found.`
                    : 'No separate audio/video/subtitle renditions declared.',
        }),
            (t['Date Ranges / Timed Metadata'] = {
                used: e.events.some((m) => m.type === 'hls-daterange'),
                details:
                    'Carries timed metadata, often used for ad insertion signaling.',
            }));
        let s = o.some((m) => m.value.TYPE === 'SUBTITLES');
        ((t['Subtitles & Captions'] = {
            used: s,
            details: s
                ? 'Contains #EXT-X-MEDIA tags with TYPE=SUBTITLES.'
                : 'No subtitle renditions declared.',
        }),
            (t['Session Data'] = {
                used: n.some((m) => m.name === 'EXT-X-SESSION-DATA'),
                details:
                    'Carries arbitrary session data in the master playlist.',
            }),
            (t['Session Keys'] = {
                used: n.some((m) => m.name === 'EXT-X-SESSION-KEY'),
                details:
                    'Allows pre-loading of encryption keys from the master playlist.',
            }),
            (t['Independent Segments'] = {
                used: n.some((m) => m.name === 'EXT-X-INDEPENDENT-SEGMENTS'),
                details: 'All segments are self-contained for decoding.',
            }),
            (t['Start Offset'] = {
                used: n.some((m) => m.name === 'EXT-X-START'),
                details:
                    'Specifies a preferred starting position in the playlist.',
            }));
        let l = [];
        (e.partInf && l.push('EXT-X-PART-INF'),
            (e.segments || []).some((m) => (m.parts || []).length > 0) &&
                l.push('EXT-X-PART'),
            e.serverControl && l.push('EXT-X-SERVER-CONTROL'),
            (e.preloadHints || []).length > 0 && l.push('EXT-X-PRELOAD-HINT'),
            (e.renditionReports || []).length > 0 &&
                l.push('EXT-X-RENDITION-REPORT'),
            (t['Low-Latency HLS'] = {
                used: l.length > 0,
                details:
                    l.length > 0
                        ? `Detected low-latency tags: <b>${l.join(', ')}</b>`
                        : 'Standard latency HLS.',
            }));
        let c = n.some((m) => m.name === 'EXT-X-SKIP');
        t['Playlist Delta Updates'] = {
            used: c,
            details: c
                ? 'Contains #EXT-X-SKIP tag, indicating a partial playlist update.'
                : 'No delta updates detected.',
        };
        let f = n.some((m) => m.name === 'EXT-X-DEFINE');
        t['Variable Substitution'] = {
            used: f,
            details: f
                ? 'Uses #EXT-X-DEFINE for variable substitution.'
                : 'No variables defined.',
        };
        let d = n.some((m) => m.name === 'EXT-X-CONTENT-STEERING');
        t['Content Steering'] = {
            used: d,
            details: d
                ? 'Provides client-side CDN steering information.'
                : 'No content steering information found.',
        };
        let p = [];
        return (
            (e.variants || []).some((m) => m.attributes.SCORE) &&
                p.push('SCORE'),
            (e.variants || []).some((m) => m.attributes['VIDEO-RANGE']) &&
                p.push('VIDEO-RANGE'),
            (e.variants || []).some((m) => m.attributes['STABLE-VARIANT-ID']) &&
                p.push('STABLE-VARIANT-ID'),
            o.some((m) => m.value['STABLE-RENDITION-ID']) &&
                p.push('STABLE-RENDITION-ID'),
            e.events.some(
                (m) =>
                    m.type === 'hls-daterange' &&
                    m.message.toLowerCase().includes('interstitial')
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
    var Ua = B(() => {});
    var Ma = {};
    ft(Ma, {
        createFeatureViewModel: () => Co,
        generateFeatureAnalysis: () => vo,
    });
    function vo(e, t, n = null) {
        return t === 'dash' ? Da(n) : ka(e);
    }
    function Co(e, t) {
        return (t === 'dash' ? va : Ea).map((i) => {
            let r = e.get(i.name) || {
                used: !1,
                details: 'Not detected in manifest.',
            };
            return { ...i, ...r };
        });
    }
    var Ra = B(() => {
        Ca();
        Pa();
        Aa();
        Ua();
    });
    var le,
        La = B(() => {
            le = class {
                diff(t, n, i = {}) {
                    let r;
                    typeof i == 'function'
                        ? ((r = i), (i = {}))
                        : 'callback' in i && (r = i.callback);
                    let a = this.castInput(t, i),
                        o = this.castInput(n, i),
                        s = this.removeEmpty(this.tokenize(a, i)),
                        l = this.removeEmpty(this.tokenize(o, i));
                    return this.diffWithOptionsObj(s, l, i, r);
                }
                diffWithOptionsObj(t, n, i, r) {
                    var a;
                    let o = (g) => {
                            if (((g = this.postProcess(g, i)), r)) {
                                setTimeout(function () {
                                    r(g);
                                }, 0);
                                return;
                            } else return g;
                        },
                        s = n.length,
                        l = t.length,
                        c = 1,
                        f = s + l;
                    i.maxEditLength != null &&
                        (f = Math.min(f, i.maxEditLength));
                    let d =
                            (a = i.timeout) !== null && a !== void 0
                                ? a
                                : 1 / 0,
                        p = Date.now() + d,
                        m = [{ oldPos: -1, lastComponent: void 0 }],
                        _ = this.extractCommon(m[0], n, t, 0, i);
                    if (m[0].oldPos + 1 >= l && _ + 1 >= s)
                        return o(this.buildValues(m[0].lastComponent, n, t));
                    let x = -1 / 0,
                        y = 1 / 0,
                        b = () => {
                            for (
                                let g = Math.max(x, -c);
                                g <= Math.min(y, c);
                                g += 2
                            ) {
                                let S,
                                    T = m[g - 1],
                                    I = m[g + 1];
                                T && (m[g - 1] = void 0);
                                let C = !1;
                                if (I) {
                                    let M = I.oldPos - g;
                                    C = I && 0 <= M && M < s;
                                }
                                let D = T && T.oldPos + 1 < l;
                                if (!C && !D) {
                                    m[g] = void 0;
                                    continue;
                                }
                                if (
                                    (!D || (C && T.oldPos < I.oldPos)
                                        ? (S = this.addToPath(I, !0, !1, 0, i))
                                        : (S = this.addToPath(T, !1, !0, 1, i)),
                                    (_ = this.extractCommon(S, n, t, g, i)),
                                    S.oldPos + 1 >= l && _ + 1 >= s)
                                )
                                    return (
                                        o(
                                            this.buildValues(
                                                S.lastComponent,
                                                n,
                                                t
                                            )
                                        ) || !0
                                    );
                                ((m[g] = S),
                                    S.oldPos + 1 >= l &&
                                        (y = Math.min(y, g - 1)),
                                    _ + 1 >= s && (x = Math.max(x, g + 1)));
                            }
                            c++;
                        };
                    if (r)
                        (function g() {
                            setTimeout(function () {
                                if (c > f || Date.now() > p) return r(void 0);
                                b() || g();
                            }, 0);
                        })();
                    else
                        for (; c <= f && Date.now() <= p; ) {
                            let g = b();
                            if (g) return g;
                        }
                }
                addToPath(t, n, i, r, a) {
                    let o = t.lastComponent;
                    return o &&
                        !a.oneChangePerToken &&
                        o.added === n &&
                        o.removed === i
                        ? {
                              oldPos: t.oldPos + r,
                              lastComponent: {
                                  count: o.count + 1,
                                  added: n,
                                  removed: i,
                                  previousComponent: o.previousComponent,
                              },
                          }
                        : {
                              oldPos: t.oldPos + r,
                              lastComponent: {
                                  count: 1,
                                  added: n,
                                  removed: i,
                                  previousComponent: o,
                              },
                          };
                }
                extractCommon(t, n, i, r, a) {
                    let o = n.length,
                        s = i.length,
                        l = t.oldPos,
                        c = l - r,
                        f = 0;
                    for (
                        ;
                        c + 1 < o &&
                        l + 1 < s &&
                        this.equals(i[l + 1], n[c + 1], a);

                    )
                        (c++,
                            l++,
                            f++,
                            a.oneChangePerToken &&
                                (t.lastComponent = {
                                    count: 1,
                                    previousComponent: t.lastComponent,
                                    added: !1,
                                    removed: !1,
                                }));
                    return (
                        f &&
                            !a.oneChangePerToken &&
                            (t.lastComponent = {
                                count: f,
                                previousComponent: t.lastComponent,
                                added: !1,
                                removed: !1,
                            }),
                        (t.oldPos = l),
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
                        a;
                    for (; t; )
                        (r.push(t),
                            (a = t.previousComponent),
                            delete t.previousComponent,
                            (t = a));
                    r.reverse();
                    let o = r.length,
                        s = 0,
                        l = 0,
                        c = 0;
                    for (; s < o; s++) {
                        let f = r[s];
                        if (f.removed)
                            ((f.value = this.join(i.slice(c, c + f.count))),
                                (c += f.count));
                        else {
                            if (!f.added && this.useLongestToken) {
                                let d = n.slice(l, l + f.count);
                                ((d = d.map(function (p, m) {
                                    let _ = i[c + m];
                                    return _.length > p.length ? _ : p;
                                })),
                                    (f.value = this.join(d)));
                            } else f.value = this.join(n.slice(l, l + f.count));
                            ((l += f.count), f.added || (c += f.count));
                        }
                    }
                    return r;
                }
            };
        });
    function Je(e, t) {
        let n;
        for (n = 0; n < e.length && n < t.length; n++)
            if (e[n] != t[n]) return e.slice(0, n);
        return e.slice(0, n);
    }
    function Ze(e, t) {
        let n;
        if (!e || !t || e[e.length - 1] != t[t.length - 1]) return '';
        for (n = 0; n < e.length && n < t.length; n++)
            if (e[e.length - (n + 1)] != t[t.length - (n + 1)])
                return e.slice(-n);
        return e.slice(-n);
    }
    function ve(e, t, n) {
        if (e.slice(0, t.length) != t)
            throw Error(
                `string ${JSON.stringify(e)} doesn't start with prefix ${JSON.stringify(t)}; this is a bug`
            );
        return n + e.slice(t.length);
    }
    function Ce(e, t, n) {
        if (!t) return e + n;
        if (e.slice(-t.length) != t)
            throw Error(
                `string ${JSON.stringify(e)} doesn't end with suffix ${JSON.stringify(t)}; this is a bug`
            );
        return e.slice(0, -t.length) + n;
    }
    function fe(e, t) {
        return ve(e, t, '');
    }
    function he(e, t) {
        return Ce(e, t, '');
    }
    function et(e, t) {
        return t.slice(0, Eo(e, t));
    }
    function Eo(e, t) {
        let n = 0;
        e.length > t.length && (n = e.length - t.length);
        let i = t.length;
        e.length < t.length && (i = e.length);
        let r = Array(i),
            a = 0;
        r[0] = 0;
        for (let o = 1; o < i; o++) {
            for (
                t[o] == t[a] ? (r[o] = r[a]) : (r[o] = a);
                a > 0 && t[o] != t[a];

            )
                a = r[a];
            t[o] == t[a] && a++;
        }
        a = 0;
        for (let o = n; o < e.length; o++) {
            for (; a > 0 && e[o] != t[a]; ) a = r[a];
            e[o] == t[a] && a++;
        }
        return a;
    }
    function ce(e) {
        let t;
        for (t = e.length - 1; t >= 0 && e[t].match(/\s/); t--);
        return e.substring(t + 1);
    }
    function X(e) {
        let t = e.match(/^\s*/);
        return t ? t[0] : '';
    }
    var wa = B(() => {});
    function it(e, t, n) {
        return n?.ignoreWhitespace != null && !n.ignoreWhitespace
            ? Va(e, t, n)
            : Ba.diff(e, t, n);
    }
    function Na(e, t, n, i) {
        if (t && n) {
            let r = X(t.value),
                a = ce(t.value),
                o = X(n.value),
                s = ce(n.value);
            if (e) {
                let l = Je(r, o);
                ((e.value = Ce(e.value, o, l)),
                    (t.value = fe(t.value, l)),
                    (n.value = fe(n.value, l)));
            }
            if (i) {
                let l = Ze(a, s);
                ((i.value = ve(i.value, s, l)),
                    (t.value = he(t.value, l)),
                    (n.value = he(n.value, l)));
            }
        } else if (n) {
            if (e) {
                let r = X(n.value);
                n.value = n.value.substring(r.length);
            }
            if (i) {
                let r = X(i.value);
                i.value = i.value.substring(r.length);
            }
        } else if (e && i) {
            let r = X(i.value),
                a = X(t.value),
                o = ce(t.value),
                s = Je(r, a);
            t.value = fe(t.value, s);
            let l = Ze(fe(r, s), o);
            ((t.value = he(t.value, l)),
                (i.value = ve(i.value, r, l)),
                (e.value = Ce(e.value, r, r.slice(0, r.length - l.length))));
        } else if (i) {
            let r = X(i.value),
                a = ce(t.value),
                o = et(a, r);
            t.value = he(t.value, o);
        } else if (e) {
            let r = ce(e.value),
                a = X(t.value),
                o = et(r, a);
            t.value = fe(t.value, o);
        }
    }
    function Va(e, t, n) {
        return za.diff(e, t, n);
    }
    var Ee,
        Po,
        tt,
        Ba,
        nt,
        za,
        Oa = B(() => {
            La();
            wa();
            ((Ee =
                'a-zA-Z0-9_\\u{C0}-\\u{FF}\\u{D8}-\\u{F6}\\u{F8}-\\u{2C6}\\u{2C8}-\\u{2D7}\\u{2DE}-\\u{2FF}\\u{1E00}-\\u{1EFF}'),
                (Po = new RegExp(`[${Ee}]+|\\s+|[^${Ee}]`, 'ug')),
                (tt = class extends le {
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
                            let o = n.intlSegmenter;
                            if (o.resolvedOptions().granularity != 'word')
                                throw new Error(
                                    'The segmenter passed must have a granularity of "word"'
                                );
                            i = Array.from(o.segment(t), (s) => s.segment);
                        } else i = t.match(Po) || [];
                        let r = [],
                            a = null;
                        return (
                            i.forEach((o) => {
                                (/\s/.test(o)
                                    ? a == null
                                        ? r.push(o)
                                        : r.push(r.pop() + o)
                                    : a != null && /\s/.test(a)
                                      ? r[r.length - 1] == a
                                          ? r.push(r.pop() + o)
                                          : r.push(a + o)
                                      : r.push(o),
                                    (a = o));
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
                            a = null;
                        return (
                            t.forEach((o) => {
                                o.added
                                    ? (r = o)
                                    : o.removed
                                      ? (a = o)
                                      : ((r || a) && Na(i, a, r, o),
                                        (i = o),
                                        (r = null),
                                        (a = null));
                            }),
                            (r || a) && Na(i, a, r, null),
                            t
                        );
                    }
                }),
                (Ba = new tt()));
            ((nt = class extends le {
                tokenize(t) {
                    let n = new RegExp(
                        `(\\r?\\n)|[${Ee}]+|[^\\S\\n\\r]+|[^${Ee}]`,
                        'ug'
                    );
                    return t.match(n) || [];
                }
            }),
                (za = new nt()));
        });
    var $a = B(() => {
        Oa();
    });
    function Ha(e) {
        if (!e) return '';
        let t = Fa(e),
            n =
                /(&lt;!--[\s\S]*?--&gt;)|(&lt;\?[\s\S]*?\?&gt;)|(&lt;\/?)([\w:-]+)|([\w:-]+=)|(&quot;)([^&quot;]*)(&quot;)/g;
        return t.replace(n, (i, r, a, o, s, l, c, f, d) =>
            r
                ? `<span class="text-gray-500 italic">${r}</span>`
                : a
                  ? `<span class="text-gray-500">${a}</span>`
                  : o
                    ? `${o}<span class="text-blue-300">${s}</span>`
                    : l
                      ? `<span class="text-emerald-300">${l.slice(0, -1)}</span>=`
                      : c
                        ? `${c}<span class="text-yellow-300">${f}</span>${d}`
                        : i
        );
    }
    function Xa(e) {
        return e
            ? e
                  .split(
                      `
`
                  )
                  .map((t) => {
                      let n = Fa(t.trim());
                      if (n.startsWith('#EXT')) {
                          let i = n.indexOf(':');
                          if (i === -1)
                              return `#<span class="text-purple-300">${n.substring(1)}</span>`;
                          let r = n.substring(1, i),
                              a = n.substring(i + 1);
                          return (
                              (a = a.replace(
                                  /([A-Z0-9-]+)=/g,
                                  '<span class="text-emerald-300">$1</span>='
                              )),
                              (a = a.replace(
                                  /"([^"]*)"/g,
                                  '"<span class="text-yellow-300">$1</span>"'
                              )),
                              `#<span class="text-purple-300">${r}</span>:${a}`
                          );
                      }
                      return n.startsWith('#')
                          ? `<span class="text-gray-500">${n}</span>`
                          : `<span class="text-cyan-400">${n}</span>`;
                  }).join(`
`)
            : '';
    }
    var Fa,
        Ga = B(() => {
            Fa = (e) =>
                e
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
        });
    var ja = {};
    ft(ja, { diffManifest: () => Do });
    function Do(e, t, n) {
        let i = it(e, t),
            r = '',
            a = n === 'dash' ? Ha : Xa;
        return (
            i.forEach((o) => {
                if (o.removed) return;
                let s = a(o.value);
                o.added
                    ? (r += `<span class="bg-emerald-500/40 text-green-50 rounded-sm font-medium">${s}</span>`)
                    : (r += s);
            }),
            r
        );
    }
    var Wa = B(() => {
        $a();
        Ga();
    });
    var Za = lt((de, at) => {
        'use strict';
        Object.defineProperty(de, '__esModule', { value: !0 });
        de.ParsingError = void 0;
        var ne = class extends Error {
            constructor(t, n) {
                (super(t), (this.cause = n));
            }
        };
        de.ParsingError = ne;
        var P;
        function Ka() {
            return Ya(!1) || Mo() || Qa() || Uo() || st();
        }
        function qa() {
            return (N(/\s*/), Ya(!0) || Qa() || ko() || st());
        }
        function Ao() {
            let e = st(),
                t = [],
                n,
                i = qa();
            for (; i; ) {
                if (i.node.type === 'Element') {
                    if (n) throw new Error('Found multiple root nodes');
                    n = i.node;
                }
                (i.excluded || t.push(i.node), (i = qa()));
            }
            if (!n)
                throw new ne('Failed to parse XML', 'Root Element not found');
            if (P.xml.length !== 0)
                throw new ne('Failed to parse XML', 'Not Well-Formed XML');
            return { declaration: e ? e.node : null, root: n, children: t };
        }
        function st() {
            let e = N(/^<\?([\w-:.]+)\s*/);
            if (!e) return;
            let t = { name: e[1], type: 'ProcessingInstruction', content: '' },
                n = P.xml.indexOf('?>');
            if (n > -1)
                ((t.content = P.xml.substring(0, n).trim()),
                    (P.xml = P.xml.slice(n)));
            else
                throw new ne(
                    'Failed to parse XML',
                    'ProcessingInstruction closing tag not found'
                );
            return (
                N(/\?>/),
                { excluded: P.options.filter(t) === !1, node: t }
            );
        }
        function Ya(e) {
            let t = N(/^<([^?!</>\s]+)\s*/);
            if (!t) return;
            let n = {
                    type: 'Element',
                    name: t[1],
                    attributes: {},
                    children: [],
                },
                i = e ? !1 : P.options.filter(n) === !1;
            for (; !(wo() || rt('>') || rt('?>') || rt('/>')); ) {
                let a = Ro();
                if (a) n.attributes[a.name] = a.value;
                else return;
            }
            if (N(/^\s*\/>/))
                return ((n.children = null), { excluded: i, node: n });
            N(/\??>/);
            let r = Ka();
            for (; r; ) (r.excluded || n.children.push(r.node), (r = Ka()));
            if (P.options.strictMode) {
                let a = `</${n.name}>`;
                if (P.xml.startsWith(a)) P.xml = P.xml.slice(a.length);
                else
                    throw new ne(
                        'Failed to parse XML',
                        `Closing tag not matching "${a}"`
                    );
            } else N(/^<\/[\w-:.\u00C0-\u00FF]+\s*>/);
            return { excluded: i, node: n };
        }
        function ko() {
            let e =
                N(/^<!DOCTYPE\s+\S+\s+SYSTEM[^>]*>/) ||
                N(/^<!DOCTYPE\s+\S+\s+PUBLIC[^>]*>/) ||
                N(/^<!DOCTYPE\s+\S+\s*\[[^\]]*]>/) ||
                N(/^<!DOCTYPE\s+\S+\s*>/);
            if (e) {
                let t = { type: 'DocumentType', content: e[0] };
                return { excluded: P.options.filter(t) === !1, node: t };
            }
        }
        function Uo() {
            if (P.xml.startsWith('<![CDATA[')) {
                let e = P.xml.indexOf(']]>');
                if (e > -1) {
                    let t = e + 3,
                        n = { type: 'CDATA', content: P.xml.substring(0, t) };
                    return (
                        (P.xml = P.xml.slice(t)),
                        { excluded: P.options.filter(n) === !1, node: n }
                    );
                }
            }
        }
        function Qa() {
            let e = N(/^<!--[\s\S]*?-->/);
            if (e) {
                let t = { type: 'Comment', content: e[0] };
                return { excluded: P.options.filter(t) === !1, node: t };
            }
        }
        function Mo() {
            let e = N(/^([^<]+)/);
            if (e) {
                let t = { type: 'Text', content: e[1] };
                return { excluded: P.options.filter(t) === !1, node: t };
            }
        }
        function Ro() {
            let e = N(/([^=]+)\s*=\s*("[^"]*"|'[^']*'|[^>\s]+)\s*/);
            if (e) return { name: e[1].trim(), value: Lo(e[2].trim()) };
        }
        function Lo(e) {
            return e.replace(/^['"]|['"]$/g, '');
        }
        function N(e) {
            let t = P.xml.match(e);
            if (t) return ((P.xml = P.xml.slice(t[0].length)), t);
        }
        function wo() {
            return P.xml.length === 0;
        }
        function rt(e) {
            return P.xml.indexOf(e) === 0;
        }
        function Ja(e, t = {}) {
            e = e.trim();
            let n = t.filter || (() => !0);
            return (
                (P = {
                    xml: e,
                    options: Object.assign(Object.assign({}, t), {
                        filter: n,
                        strictMode: t.strictMode === !0,
                    }),
                }),
                Ao()
            );
        }
        typeof at < 'u' && typeof de == 'object' && (at.exports = Ja);
        de.default = Ja;
    });
    var ns = lt((pe, ot) => {
        'use strict';
        var No =
            (pe && pe.__importDefault) ||
            function (e) {
                return e && e.__esModule ? e : { default: e };
            };
        Object.defineProperty(pe, '__esModule', { value: !0 });
        var Bo = No(Za());
        function Pe(e) {
            if (!e.options.indentation && !e.options.lineSeparator) return;
            e.content += e.options.lineSeparator;
            let t;
            for (t = 0; t < e.level; t++) e.content += e.options.indentation;
        }
        function zo(e) {
            e.content = e.content.replace(/ +$/, '');
            let t;
            for (t = 0; t < e.level; t++) e.content += e.options.indentation;
        }
        function $(e, t) {
            e.content += t;
        }
        function es(e, t, n) {
            if (e.type === 'Element') $o(e, t, n);
            else if (e.type === 'ProcessingInstruction') ts(e, t);
            else if (typeof e.content == 'string') Vo(e.content, t, n);
            else throw new Error('Unknown node type: ' + e.type);
        }
        function Vo(e, t, n) {
            if (!n) {
                let i = e.trim();
                (t.options.lineSeparator || i.length === 0) && (e = i);
            }
            e.length > 0 && (!n && t.content.length > 0 && Pe(t), $(t, e));
        }
        function Oo(e, t) {
            let n = '/' + e.join('/'),
                i = e[e.length - 1];
            return t.includes(i) || t.includes(n);
        }
        function $o(e, t, n) {
            if (
                (t.path.push(e.name),
                !n && t.content.length > 0 && Pe(t),
                $(t, '<' + e.name),
                Fo(t, e.attributes),
                e.children === null ||
                    (t.options.forceSelfClosingEmptyTag &&
                        e.children.length === 0))
            ) {
                let i = t.options.whiteSpaceAtEndOfSelfclosingTag
                    ? ' />'
                    : '/>';
                $(t, i);
            } else if (e.children.length === 0) $(t, '></' + e.name + '>');
            else {
                let i = e.children;
                ($(t, '>'), t.level++);
                let r = e.attributes['xml:space'] === 'preserve' || n,
                    a = !1;
                if (
                    (!r &&
                        t.options.ignoredPaths &&
                        ((a = Oo(t.path, t.options.ignoredPaths)), (r = a)),
                    !r && t.options.collapseContent)
                ) {
                    let o = !1,
                        s = !1,
                        l = !1;
                    (i.forEach(function (c, f) {
                        c.type === 'Text'
                            ? (c.content.includes(`
`)
                                  ? ((s = !0), (c.content = c.content.trim()))
                                  : (f === 0 || f === i.length - 1) &&
                                    !n &&
                                    c.content.trim().length === 0 &&
                                    (c.content = ''),
                              (c.content.trim().length > 0 || i.length === 1) &&
                                  (o = !0))
                            : c.type === 'CDATA'
                              ? (o = !0)
                              : (l = !0);
                    }),
                        o && (!l || !s) && (r = !0));
                }
                (i.forEach(function (o) {
                    es(o, t, n || r);
                }),
                    t.level--,
                    !n && !r && Pe(t),
                    a && zo(t),
                    $(t, '</' + e.name + '>'));
            }
            t.path.pop();
        }
        function Fo(e, t) {
            Object.keys(t).forEach(function (n) {
                let i = t[n].replace(/"/g, '&quot;');
                $(e, ' ' + n + '="' + i + '"');
            });
        }
        function ts(e, t) {
            (t.content.length > 0 && Pe(t),
                $(t, '<?' + e.name),
                $(t, ' ' + e.content.trim()),
                $(t, '?>'));
        }
        function De(e, t = {}) {
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
                let n = (0, Bo.default)(e, {
                        filter: t.filter,
                        strictMode: t.strictMode,
                    }),
                    i = { content: '', level: 0, options: t, path: [] };
                return (
                    n.declaration && ts(n.declaration, i),
                    n.children.forEach(function (r) {
                        es(r, i, !1);
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
        De.minify = (e, t = {}) =>
            De(
                e,
                Object.assign(Object.assign({}, t), {
                    indentation: '',
                    lineSeparator: '',
                })
            );
        typeof ot < 'u' && typeof pe == 'object' && (ot.exports = De);
        pe.default = De;
    });
    var h = class {
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
        readBigInt64(t) {
            if (!this.checkBounds(8)) return null;
            let n = this.view.getBigInt64(this.offset);
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
                a = new TextDecoder('utf-8').decode(r),
                o = i - n + 1;
            return (
                (this.box.details[t] = {
                    value: a,
                    offset: this.box.offset + n,
                    length: o,
                }),
                (this.offset += o),
                a
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
    function Ue(e, t) {
        let n = new h(e, t);
        (n.readString(4, 'majorBrand'), n.readUint32('minorVersion'));
        let i = [],
            r = [],
            a = n.offset;
        for (; n.offset < e.size && !n.stopped; ) {
            let o = n.readString(4, `brand_${i.length}`);
            if (o === null) break;
            (i.push(o),
                o.startsWith('cmf') && r.push(o),
                delete e.details[`brand_${i.length - 1}`]);
        }
        (i.length > 0 &&
            (e.details.compatibleBrands = {
                value: i.join(', '),
                offset: e.offset + a,
                length: n.offset - a,
            }),
            r.length > 0 &&
                (e.details.cmafBrands = {
                    value: r.join(', '),
                    offset: 0,
                    length: 0,
                }),
            n.finalize());
    }
    var ct = {
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
    function dt(e, t) {
        let n = new h(e, t),
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
        for (let a = 0; a < 9; a++) r.push(n.readInt32(`matrix_val_${a}`));
        e.details.matrix = {
            value: `[${r.join(', ')}]`,
            offset: e.details.matrix_val_0.offset,
            length: 36,
        };
        for (let a = 0; a < 9; a++) delete e.details[`matrix_val_${a}`];
        (n.skip(24, 'pre_defined'), n.readUint32('next_track_ID'));
    }
    var pt = {
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
    function ut(e, t) {
        let n = new h(e, t);
        (n.readVersionAndFlags(), n.readUint32('sequence_number'));
    }
    var mt = {
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
    function gt(e, t) {
        let n = new h(e, t),
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
    var ht = {
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
    function _t(e, t) {
        let n = new h(e, t),
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
    var xt = {
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
    function yt(e, t) {
        let n = new h(e, t),
            { version: i, flags: r } = n.readVersionAndFlags();
        if (r === null) {
            n.finalize();
            return;
        }
        let a = n.readUint32('sample_count');
        ((e.samples = []), r & 1 && n.readInt32('data_offset'));
        let o = null;
        if (r & 4) {
            let s = n.readUint32('first_sample_flags_dword');
            s !== null &&
                (delete e.details.first_sample_flags_dword,
                (o = s),
                (e.details.first_sample_flags = {
                    value: `0x${o.toString(16)}`,
                    offset:
                        e.details.first_sample_flags_dword?.offset ||
                        n.box.offset + n.offset - 4,
                    length: 4,
                }));
        }
        if (a !== null)
            for (let s = 0; s < a && !n.stopped; s++) {
                let l = {};
                (r & 256 &&
                    ((l.duration = n.view.getUint32(n.offset)),
                    (n.offset += 4)),
                    r & 512 &&
                        ((l.size = n.view.getUint32(n.offset)),
                        (n.offset += 4)),
                    r & 1024 &&
                        ((l.flags = n.view.getUint32(n.offset)),
                        (n.offset += 4)),
                    s === 0 && o !== null && (l.flags = o),
                    r & 2048 &&
                        (i === 0
                            ? (l.compositionTimeOffset = n.view.getUint32(
                                  n.offset
                              ))
                            : (l.compositionTimeOffset = n.view.getInt32(
                                  n.offset
                              )),
                        (n.offset += 4)),
                    e.samples.push(l));
            }
        n.finalize();
    }
    var St = {
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
    function bt(e, t) {
        let n = new h(e, t),
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
        for (let a = 0; a < r; a++) {
            let o = n.readUint32(`ref_${a + 1}_type_and_size`);
            if (o === null) break;
            let s = (o >> 31) & 1,
                l = o & 2147483647,
                c = e.details[`ref_${a + 1}_type_and_size`]?.offset || 0;
            (delete e.details[`ref_${a + 1}_type_and_size`],
                (e.details[`reference_${a + 1}_type`] = {
                    value: s === 1 ? 'sidx' : 'media',
                    offset: c,
                    length: 4,
                }),
                (e.details[`reference_${a + 1}_size`] = {
                    value: l,
                    offset: c,
                    length: 4,
                }),
                n.readUint32(`reference_${a + 1}_duration`));
            let f = n.readUint32(`sap_info_dword_${a + 1}`);
            f !== null &&
                (delete e.details[`sap_info_dword_${a + 1}`],
                (e.details[`reference_${a + 1}_sap_info`] = {
                    value: `0x${f.toString(16)}`,
                    offset: c + 8,
                    length: 4,
                }));
        }
        n.finalize();
    }
    var Tt = {
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
    function It(e, t) {
        let n = new h(e, t),
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
        let a = n.readInt16('volume_fixed_point');
        (a !== null &&
            ((e.details.volume = {
                ...e.details.volume_fixed_point,
                value: (a / 256).toFixed(2),
            }),
            delete e.details.volume_fixed_point),
            n.skip(2, 'reserved_3'));
        let o = [];
        for (let f = 0; f < 9; f++) o.push(n.readInt32(`matrix_val_${f}`));
        let s = e.details.matrix_val_0?.offset;
        if (s !== void 0) {
            e.details.matrix = {
                value: `[${o.join(', ')}]`,
                offset: s,
                length: 36,
            };
            for (let f = 0; f < 9; f++) delete e.details[`matrix_val_${f}`];
        }
        let l = n.readUint32('width_fixed_point');
        l !== null &&
            ((e.details.width = {
                ...e.details.width_fixed_point,
                value: (l / 65536).toFixed(2),
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
    var vt = {
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
    function Ct(e, t) {
        let n = new h(e, t),
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
            let a = String.fromCharCode(
                ((r >> 10) & 31) + 96,
                ((r >> 5) & 31) + 96,
                (r & 31) + 96
            );
            ((e.details.language = {
                value: a,
                offset: e.details.language_bits.offset,
                length: 2,
            }),
                delete e.details.language_bits);
        }
        (n.skip(2, 'pre-defined'), n.finalize());
    }
    var Et = {
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
    function Pt(e, t) {
        let n = new h(e, t);
        (n.readVersionAndFlags(),
            n.skip(4, 'pre_defined'),
            n.readString(4, 'handler_type'),
            n.skip(12, 'reserved'),
            n.readNullTerminatedString('name'),
            n.finalize());
    }
    var Dt = {
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
    function At(e, t) {
        let n = new h(e, t);
        (n.readVersionAndFlags(), n.readUint16('graphicsmode'));
        let i = n.readUint16('opcolor_r'),
            r = n.readUint16('opcolor_g'),
            a = n.readUint16('opcolor_b');
        if (i !== null && r !== null && a !== null) {
            let o = e.details.opcolor_r.offset;
            (delete e.details.opcolor_r,
                delete e.details.opcolor_g,
                delete e.details.opcolor_b,
                (e.details.opcolor = {
                    value: `R:${i}, G:${r}, B:${a}`,
                    offset: o,
                    length: 6,
                }));
        }
        n.finalize();
    }
    var kt = {
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
    function Ut(e, t) {
        let n = new h(e, t);
        (n.readVersionAndFlags(), n.readUint32('entry_count'));
    }
    var Mt = {
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
    function Rt(e, t) {
        let n = new h(e, t);
        n.readVersionAndFlags();
        let i = n.readUint32('entry_count');
        if (i !== null && i > 0) {
            for (let a = 0; a < i && !n.stopped; a++)
                a < 10
                    ? (n.readUint32(`sample_count_${a + 1}`),
                      n.readUint32(`sample_delta_${a + 1}`))
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
    var Lt = {
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
    function wt(e, t) {
        let n = new h(e, t);
        n.readVersionAndFlags();
        let i = n.readUint32('entry_count');
        if (i !== null && i > 0) {
            for (let a = 0; a < i && !n.stopped; a++)
                if (a < 10) {
                    let o = `entry_${a + 1}`;
                    (n.readUint32(`${o}_first_chunk`),
                        n.readUint32(`${o}_samples_per_chunk`),
                        n.readUint32(`${o}_sample_description_index`));
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
    var Nt = {
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
    function Bt(e, t) {
        let n = new h(e, t);
        n.readVersionAndFlags();
        let i = n.readUint32('sample_size'),
            r = n.readUint32('sample_count');
        if (i === 0 && r !== null && r > 0) {
            for (let o = 0; o < r && !n.stopped; o++)
                o < 10 ? n.readUint32(`entry_size_${o + 1}`) : (n.offset += 4);
            r > 10 &&
                (e.details['...more_entries'] = {
                    value: `${r - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        n.finalize();
    }
    var zt = {
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
    function Vt(e, t) {
        let n = new h(e, t);
        n.readVersionAndFlags();
        let i = n.readUint32('entry_count');
        if (i !== null && i > 0) {
            for (let a = 0; a < i && !n.stopped; a++)
                a < 10
                    ? n.readUint32(`chunk_offset_${a + 1}`)
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
    var Ot = {
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
    function $t(e, t) {
        let n = new h(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        let r = n.readUint32('entry_count');
        if (r !== null && r > 0) {
            let o = i === 1 ? 20 : 12;
            for (let s = 0; s < r && !n.stopped; s++)
                if (s < 5) {
                    let l = `entry_${s + 1}`;
                    (i === 1
                        ? (n.readBigUint64(`${l}_segment_duration`),
                          n.readBigInt64(`${l}_media_time`))
                        : (n.readUint32(`${l}_segment_duration`),
                          n.readInt32(`${l}_media_time`)),
                        n.readInt16(`${l}_media_rate_integer`),
                        n.readInt16(`${l}_media_rate_fraction`));
                } else n.offset += o;
            r > 5 &&
                (e.details['...more_entries'] = {
                    value: `${r - 5} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        n.finalize();
    }
    var Ft = {
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
    function Ht(e, t) {
        let n = new h(e, t);
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
    var Xt = {
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
    var Gt = {
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
    var Me = class {
        constructor(t) {
            ((this.buffer = t),
                (this.bytePosition = 0),
                (this.bitPosition = 0));
        }
        readBits(t) {
            let n = 0;
            for (let i = 0; i < t; i++) {
                let a =
                    (this.buffer[this.bytePosition] >> (7 - this.bitPosition)) &
                    1;
                ((n = (n << 1) | a),
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
    function jt(e) {
        if (e.length < 4) return null;
        let t = new Me(e);
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
                let m = d !== 3 ? 8 : 12;
                for (let _ = 0; _ < m; _++)
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
        let a = t.readUE(),
            o = t.readUE(),
            s = t.readBits(1),
            l = (a + 1) * 16,
            c = (2 - s) * (o + 1) * 16;
        if ((s === 0 && t.readBits(1), t.readBits(1), t.readBits(1))) {
            let d = t.readUE(),
                p = t.readUE(),
                m = t.readUE(),
                _ = t.readUE(),
                x = 1,
                y = 2 - s,
                b = l - (d + p) * x;
            c = c - (m + _) * y;
        }
        return { profile_idc: n, level_idc: i, resolution: `${l}x${c}` };
    }
    function Wt(e, t) {
        let n = new h(e, t);
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
        let a = n.readUint8('sps_count_byte');
        if (a !== null) {
            delete e.details.sps_count_byte;
            let s = a & 31;
            ((e.details.numOfSequenceParameterSets = {
                value: s,
                offset: e.offset + n.offset - 1,
                length: 0.625,
            }),
                (e.details.reserved_3_bits = {
                    value: (a >> 5) & 7,
                    offset: e.offset + n.offset - 1,
                    length: 0.375,
                }));
            for (let l = 0; l < s; l++) {
                let c = n.readUint16(`sps_${l + 1}_length`);
                if (c === null) break;
                let f = n.offset;
                if (n.checkBounds(c)) {
                    let d = new Uint8Array(
                            n.view.buffer,
                            n.view.byteOffset + f,
                            c
                        ),
                        p = jt(d);
                    (p &&
                        ((e.details[`sps_${l + 1}_decoded_profile`] = {
                            value: p.profile_idc,
                            offset: 0,
                            length: 0,
                        }),
                        (e.details[`sps_${l + 1}_decoded_level`] = {
                            value: p.level_idc,
                            offset: 0,
                            length: 0,
                        }),
                        (e.details[`sps_${l + 1}_decoded_resolution`] = {
                            value: p.resolution,
                            offset: 0,
                            length: 0,
                        })),
                        n.skip(c, `sps_${l + 1}_nal_unit`));
                }
            }
        }
        let o = n.readUint8('numOfPictureParameterSets');
        if (o !== null)
            for (let s = 0; s < o; s++) {
                let l = n.readUint16(`pps_${s + 1}_length`);
                if (l === null) break;
                n.skip(l, `pps_${s + 1}_nal_unit`);
            }
        (n.offset < e.size &&
            (i === 100 || i === 110 || i === 122 || i === 144) &&
            n.readRemainingBytes('profile_specific_extensions'),
            n.finalize());
    }
    var Kt = {
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
    var cs = {
            1: 'AAC Main',
            2: 'AAC LC',
            3: 'AAC SSR',
            4: 'AAC LTP',
            5: 'SBR',
            6: 'AAC Scalable',
        },
        ds = {
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
        ps = [
            'Custom',
            'Mono (Center)',
            'Stereo (L, R)',
            '3 (L, C, R)',
            '4 (L, C, R, Sur)',
            '5 (L, C, R, Ls, Rs)',
            '5.1 (L, C, R, Ls, Rs, LFE)',
            '7.1 (L, C, R, Ls, Rs, Lcs, Rcs, LFE)',
        ];
    function _e(e, t) {
        let n = e.offset,
            i = 0,
            r,
            a = 0;
        do {
            if (((r = e.readUint8(`size_byte_${a}`)), r === null)) return null;
            ((i = (i << 7) | (r & 127)), a++);
        } while (r & 128 && a < 4);
        e.box.details[t] = { value: i, offset: e.box.offset + n, length: a };
        for (let o = 0; o < a; o++) delete e.box.details[`size_byte_${o}`];
        return i;
    }
    function qt(e, t) {
        let n = new h(e, t);
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
        let r = _e(n, 'ES_Descriptor_size');
        if (r === null) {
            n.finalize();
            return;
        }
        let a = n.offset + r;
        if (
            (n.readUint16('ES_ID'),
            n.readUint8('streamDependence_and_priority'),
            n.offset < a && n.readUint8('DecoderConfigDescriptor_tag') === 4)
        ) {
            let s = _e(n, 'DecoderConfigDescriptor_size'),
                l = n.offset + s;
            if (
                (n.readUint8('objectTypeIndication'),
                n.readUint8('streamType_and_upStream'),
                n.skip(3, 'bufferSizeDB'),
                n.readUint32('maxBitrate'),
                n.readUint32('avgBitrate'),
                n.offset < l && n.readUint8('DecoderSpecificInfo_tag') === 5)
            ) {
                let f = _e(n, 'DecoderSpecificInfo_size');
                if (f !== null && f >= 2) {
                    let d = n.offset,
                        p = (n.readUint16('AudioSpecificConfig_bits') >>> 0)
                            .toString(2)
                            .padStart(16, '0');
                    delete e.details.AudioSpecificConfig_bits;
                    let m = parseInt(p.substring(0, 5), 2),
                        _ = parseInt(p.substring(5, 9), 2),
                        x = parseInt(p.substring(9, 13), 2);
                    ((e.details.decoded_audio_object_type = {
                        value: `${cs[m] || 'Unknown'} (${m})`,
                        offset: n.box.offset + d,
                        length: 0.625,
                    }),
                        (e.details.decoded_sampling_frequency = {
                            value: `${ds[_] || 'Unknown'} (${_})`,
                            offset: n.box.offset + d + 0.625,
                            length: 0.5,
                        }),
                        (e.details.decoded_channel_configuration = {
                            value: `${ps[x] || 'Unknown'} (${x})`,
                            offset: n.box.offset + d + 1.125,
                            length: 0.5,
                        }),
                        n.skip(f - 2, 'decoder_specific_info_remains'));
                } else f > 0 && n.skip(f, 'decoder_specific_info_data');
            }
        }
        if (n.offset < a && n.readUint8('SLConfigDescriptor_tag') === 6) {
            let s = _e(n, 'SLConfigDescriptor_size');
            s !== null &&
                (s === 1
                    ? n.readUint8('predefined')
                    : n.skip(s, 'sl_config_data'));
        }
        n.finalize();
    }
    var Yt = {
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
    function Qt(e, t) {
        let n = new h(e, t);
        (n.readVersionAndFlags(),
            n.readInt16('balance'),
            n.skip(2, 'reserved'),
            n.finalize());
    }
    var Jt = {
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
    function Zt(e, t) {
        let n = new h(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        let r = [];
        for (let s = 0; s < 16; s++) {
            let l = n.readUint8(`system_id_byte_${s}`);
            if (l === null) {
                n.finalize();
                return;
            }
            r.push(l.toString(16).padStart(2, '0'));
        }
        let a = e.details.system_id_byte_0.offset;
        for (let s = 0; s < 16; s++) delete e.details[`system_id_byte_${s}`];
        if (
            ((e.details['System ID'] = {
                value: r.join('-'),
                offset: a,
                length: 16,
            }),
            i > 0)
        ) {
            let s = n.readUint32('Key ID Count');
            s !== null && n.skip(s * 16, 'Key IDs');
        }
        let o = n.readUint32('Data Size');
        (o !== null && n.skip(o, 'Data'), n.finalize());
    }
    var en = {
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
    function tn(e, t) {
        let n = new h(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        let r = n.readUint32('entry_count');
        if (r !== null && r > 0) {
            for (let o = 0; o < r && !n.stopped; o++)
                if (o < 10) {
                    let s = `entry_${o + 1}`;
                    (n.readUint32(`${s}_sample_count`),
                        i === 1
                            ? n.readInt32(`${s}_sample_offset`)
                            : n.readUint32(`${s}_sample_offset`));
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
    var nn = {
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
    function rn(e, t) {
        let n = new h(e, t);
        (n.readVersionAndFlags(), n.skip(3, 'reserved'));
        let i = n.readUint8('field_size'),
            r = n.readUint32('sample_count');
        if (r !== null && r > 0) {
            let a;
            if (i === 4) {
                let o = n.readUint8('entry_size_1_byte');
                o !== null && (a = `(nibbles) ${(o >> 4) & 15}, ${o & 15}`);
            } else
                i === 8
                    ? (a = n.readUint8('entry_size_1'))
                    : i === 16 && (a = n.readUint16('entry_size_1'));
            a !== void 0 && (e.details.entry_size_1.value = a);
        }
        n.finalize();
    }
    var an = {
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
    function sn(e, t) {
        let n = new h(e, t),
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
    var on = {
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
    function ln(e, t) {}
    function q(e, t) {
        let n = new h(e, t),
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
    var fn = { hint: q, cdsc: q, font: q, hind: q, vdep: q, vplx: q, subt: q },
        cn = {
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
    function dn(e, t) {
        let n = new h(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        let r = n.readUint32('entry_count');
        if (r !== null && r > 0) {
            n.readUint32('entry_1_sample_delta');
            let a = n.readUint16('entry_1_subsample_count');
            a !== null &&
                a > 0 &&
                (i === 1
                    ? n.readUint32('subsample_1_size')
                    : n.readUint16('subsample_1_size'));
        }
        n.finalize();
    }
    var pn = {
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
    function un(e, t) {
        let n = new h(e, t),
            { flags: i } = n.readVersionAndFlags();
        i !== null &&
            (i & 1) !== 0 &&
            (n.readUint32('aux_info_type'),
            n.readUint32('aux_info_type_parameter'));
        let r = n.readUint8('default_sample_info_size'),
            a = n.readUint32('sample_count');
        if (r === 0 && a !== null && a > 0) {
            for (let s = 0; s < a && !n.stopped; s++)
                s < 10
                    ? n.readUint8(`sample_info_size_${s + 1}`)
                    : (n.offset += 1);
            a > 10 &&
                (e.details['...more_entries'] = {
                    value: `${a - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        n.finalize();
    }
    var mn = {
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
    function gn(e, t) {
        let n = new h(e, t),
            { version: i, flags: r } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        (r & 1) !== 0 && n.skip(8, 'aux_info_type_and_param');
        let a = n.readUint32('entry_count');
        (a !== null &&
            a > 0 &&
            (i === 1 ? n.readBigUint64('offset_1') : n.readUint32('offset_1')),
            n.finalize());
    }
    var hn = {
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
    function _n(e, t) {}
    var xn = {
        sinf: {
            name: 'Protection Scheme Information',
            text: 'A container for all information required to understand the encryption transform applied.',
            ref: 'ISO/IEC 14496-12, 8.12.1',
        },
    };
    function yn(e, t) {
        let n = new h(e, t);
        (n.readString(4, 'data_format'), n.finalize());
    }
    var Sn = {
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
    function bn(e, t) {
        let n = new h(e, t);
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
    var Tn = {
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
    function In(e, t) {}
    var vn = {
        schi: {
            name: 'Scheme Information Box',
            text: 'A container for boxes with scheme-specific data needed by the protection system.',
            ref: 'ISO/IEC 14496-12, 8.12.6',
        },
    };
    function Cn(e, t) {
        let n = new h(e, t);
        n.readVersionAndFlags();
        let i = n.readUint32('entry_count');
        if (i !== null && i > 0) {
            let r = [];
            for (let o = 0; o < i && !n.stopped; o++)
                if (o < 10) {
                    let s = n.readUint32(`sample_number_entry_${o + 1}`);
                    s !== null &&
                        (r.push(s),
                        delete e.details[`sample_number_entry_${o + 1}`]);
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
    var En = {
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
    function Pn(e, t) {
        let n = new h(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        let r = n.readString(4, 'grouping_type'),
            a = 0;
        (i === 1 && (a = n.readUint32('default_length')),
            i >= 2 && n.readUint32('default_sample_description_index'));
        let o = n.readUint32('entry_count');
        if (o !== null)
            for (let s = 0; s < o && !n.stopped; s++) {
                let l = a;
                if (i === 1 && a === 0) {
                    let d = n.readUint32(`entry_${s + 1}_description_length`);
                    if (d === null) break;
                    l = d;
                }
                let c = `entry_${s + 1}`,
                    f = n.offset;
                switch (r) {
                    case 'roll':
                        (n.readInt16(`${c}_roll_distance`), i === 0 && (l = 2));
                        break;
                    default:
                        i === 0 &&
                            (n.addIssue(
                                'warn',
                                `Cannot determine entry size for unknown grouping_type '${r}' with version 0. Parsing of this box may be incomplete.`
                            ),
                            n.readRemainingBytes('unparsed_sgpd_entries'),
                            (s = o));
                        break;
                }
                l > 0 && n.offset === f && n.skip(l, `${c}_description_data`);
            }
        n.finalize();
    }
    var Dn = {
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
    function An(e, t) {
        let n = new h(e, t),
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
    var kn = {
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
    function Un(e, t) {
        let n = new h(e, t);
        n.readVersionAndFlags();
        let i = e.size - n.offset;
        if (
            ((e.details.sample_count = { value: i, offset: 0, length: 0 }),
            i > 0)
        ) {
            for (let a = 0; a < i && !n.stopped; a++) {
                let o = `sample_${a + 1}`;
                if (a < 10) {
                    let s = n.readUint8(`${o}_flags_byte`);
                    if (s === null) break;
                    (delete e.details[`${o}_flags_byte`],
                        (e.details[`${o}_is_leading`] = {
                            value: (s >> 6) & 3,
                            offset: e.offset + n.offset - 1,
                            length: 0.25,
                        }),
                        (e.details[`${o}_sample_depends_on`] = {
                            value: (s >> 4) & 3,
                            offset: e.offset + n.offset - 1,
                            length: 0.25,
                        }),
                        (e.details[`${o}_sample_is_depended_on`] = {
                            value: (s >> 2) & 3,
                            offset: e.offset + n.offset - 1,
                            length: 0.25,
                        }),
                        (e.details[`${o}_sample_has_redundancy`] = {
                            value: s & 3,
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
    var Mn = {
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
    function Rn(e, t) {}
    var Ln = {
        mfra: {
            name: 'Movie Fragment Random Access',
            text: 'A container for random access information for movie fragments, often found at the end of the file.',
            ref: 'ISO/IEC 14496-12, 8.8.9',
        },
    };
    function wn(e, t) {
        let n = new h(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        n.readUint32('track_ID');
        let r = n.readUint32('length_sizes_raw');
        if (r !== null) {
            let a = ((r >> 4) & 3) + 1,
                o = ((r >> 2) & 3) + 1,
                s = (r & 3) + 1;
            ((e.details.length_sizes = {
                value: `traf=${a}, trun=${o}, sample=${s}`,
                offset: e.details.length_sizes_raw.offset,
                length: 4,
            }),
                delete e.details.length_sizes_raw);
            let l = n.readUint32('number_of_entries');
            l !== null &&
                l > 0 &&
                (i === 1
                    ? (n.readBigUint64('entry_1_time'),
                      n.readBigUint64('entry_1_moof_offset'))
                    : (n.readUint32('entry_1_time'),
                      n.readUint32('entry_1_moof_offset')),
                n.skip(a, 'entry_1_traf_number'),
                n.skip(o, 'entry_1_trun_number'),
                n.skip(s, 'entry_1_sample_number'));
        }
        n.finalize();
    }
    var Nn = {
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
    function Bn(e, t) {
        let n = new h(e, t);
        (n.readVersionAndFlags(), n.readUint32('size'), n.finalize());
    }
    var zn = {
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
    function Vn(e, t) {
        let n = new h(e, t);
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
    var On = {
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
    function $n(e, t) {
        let n = new h(e, t);
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
    var Fn = {
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
    function Hn(e, t) {
        let n = new h(e, t),
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
    var Xn = {
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
    function Gn(e, t) {
        let n = new h(e, t);
        n.readVersionAndFlags();
        let i = (e.size - n.offset) / 2;
        if (
            ((e.details.sample_count = { value: i, offset: 0, length: 0 }),
            i > 0)
        ) {
            for (let a = 0; a < i && !n.stopped; a++)
                a < 10 ? n.readUint16(`priority_${a + 1}`) : (n.offset += 2);
            i > 10 &&
                (e.details['...more_entries'] = {
                    value: `${i - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        n.finalize();
    }
    var jn = {
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
    function Wn(e, t) {
        let n = new h(e, t),
            { flags: i } = n.readVersionAndFlags();
        (i !== null && (i & 1) === 0 && n.readNullTerminatedString('location'),
            n.finalize());
    }
    function Kn(e, t) {
        let n = new h(e, t);
        (n.readVersionAndFlags(),
            n.readNullTerminatedString('name'),
            n.readNullTerminatedString('location'),
            n.finalize());
    }
    var qn = {
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
    function Yn(e, t) {
        let n = new h(e, t);
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
        let a = n.offset;
        if (n.checkBounds(32)) {
            let o = n.view.getUint8(n.offset),
                s = new Uint8Array(
                    n.view.buffer,
                    n.view.byteOffset + n.offset + 1,
                    o
                ),
                l = new TextDecoder().decode(s);
            ((e.details.compressorname = {
                value: l,
                offset: n.box.offset + a,
                length: 32,
            }),
                (n.offset += 32));
        }
        (n.readUint16('depth'), n.readInt16('pre_defined_3'));
    }
    var Qn = {
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
    function Jn(e, t) {
        let n = new h(e, t);
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
    var Zn = {
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
    function ei(e, t) {
        let n = new h(e, t);
        (n.readUint32('bufferSizeDB'),
            n.readUint32('maxBitrate'),
            n.readUint32('avgBitrate'),
            n.finalize());
    }
    var ti = {
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
    function Re(e, t) {
        let n = new h(e, t);
        (n.readRemainingBytes('data'), n.finalize());
    }
    var ni = {
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
    function us(e, t) {
        let n = e.offset,
            i = 0,
            r,
            a = 0;
        do {
            if (((r = e.readUint8(`size_byte_${a}`)), r === null)) return null;
            ((i = (i << 7) | (r & 127)), a++);
        } while (r & 128 && a < 4);
        e.box.details[t] = { value: i, offset: e.box.offset + n, length: a };
        for (let o = 0; o < a; o++) delete e.box.details[`size_byte_${o}`];
        return i;
    }
    function ii(e, t) {
        let n = new h(e, t);
        n.readVersionAndFlags();
        let i = n.readUint8('InitialObjectDescriptor_tag');
        if (i !== 2 && i !== 3 && i !== 16) {
            (n.addIssue(
                'warn',
                `Expected IOD tag (0x02, 0x03, or 0x10), but found ${i}.`
            ),
                n.readRemainingBytes('unknown_descriptor_data'),
                n.finalize());
            return;
        }
        if (us(n, 'InitialObjectDescriptor_size') === null) {
            n.finalize();
            return;
        }
        (n.readUint16('objectDescriptorID'),
            n.readUint8('ODProfileLevelIndication'),
            n.readUint8('sceneProfileLevelIndication'),
            n.readUint8('audioProfileLevelIndication'),
            n.readUint8('visualProfileLevelIndication'),
            n.readUint8('graphicsProfileLevelIndication'),
            n.readRemainingBytes('other_descriptors_data'),
            n.finalize());
    }
    var ri = {
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
    function ai(e, t) {
        let n = new h(e, t);
        (n.readVersionAndFlags(), n.readUint32('track_id'));
    }
    var si = {
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
    function oi(e, t) {
        let n = new h(e, t);
        (n.readUint32('hSpacing'), n.readUint32('vSpacing'), n.finalize());
    }
    var li = {
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
    function fi(e, t) {
        let n = new h(e, t),
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
    var ci = {
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
    function di(e, t) {
        new h(e, t).readVersionAndFlags();
    }
    var pi = {
        meta: {
            name: 'Metadata Box',
            text: 'A container for descriptive or annotative metadata.',
            ref: 'ISO/IEC 14496-12, 8.11.1',
        },
    };
    function ui(e, t) {
        let n = new h(e, t);
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
    var mi = {
        encv: {
            name: 'Encrypted Video Sample Entry',
            text: 'A sample entry wrapper indicating that the video stream is encrypted. It contains a Protection Scheme Information (`sinf`) box.',
            ref: 'ISO/IEC 14496-12, 8.12',
        },
    };
    function gi(e, t) {
        let n = new h(e, t),
            { flags: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        let r = n.readUint32('sample_count');
        if (((e.samples = []), r !== null))
            for (let o = 0; o < r && !n.stopped; o++) {
                let s = { iv: null, subsamples: [] };
                if (n.checkBounds(8)) {
                    let l = new Uint8Array(
                        n.view.buffer,
                        n.view.byteOffset + n.offset,
                        8
                    );
                    ((s.iv = l), (n.offset += 8));
                } else break;
                if ((i & 2) !== 0 && n.checkBounds(2)) {
                    let l = n.view.getUint16(n.offset);
                    ((s.subsample_count = l), (n.offset += 2));
                    for (let c = 0; c < l; c++)
                        if (n.checkBounds(6)) {
                            let f = n.view.getUint16(n.offset),
                                d = n.view.getUint32(n.offset + 2);
                            (s.subsamples.push({
                                BytesOfClearData: f,
                                BytesOfProtectedData: d,
                            }),
                                (n.offset += 6));
                        } else {
                            n.stopped = !0;
                            break;
                        }
                }
                e.samples.push(s);
            }
        n.finalize();
    }
    var hi = {
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
    function _i(e, t) {
        let n = new h(e, t);
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
    var xi = {
        enca: {
            name: 'Encrypted Audio Sample Entry',
            text: 'A sample entry wrapper indicating that the audio stream is encrypted. It contains a Protection Scheme Information (`sinf`) box.',
            ref: 'ISO/IEC 14496-12, 8.12',
        },
    };
    function yi(e, t) {
        let n = new h(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        if (i === 0) {
            n.skip(2, 'reserved_1');
            let r = n.readUint8('default_isProtected'),
                a = n.readUint8('default_Per_Sample_IV_Size'),
                o = [];
            for (let l = 0; l < 16; l++) {
                let c = n.readUint8(`kid_byte_${l}`);
                if (c !== null) o.push(c.toString(16).padStart(2, '0'));
                else {
                    n.finalize();
                    return;
                }
            }
            let s = e.details.kid_byte_0?.offset;
            if (s !== void 0) {
                e.details.default_KID = {
                    value: o.join(''),
                    offset: s,
                    length: 16,
                };
                for (let l = 0; l < 16; l++) delete e.details[`kid_byte_${l}`];
            }
            if (r === 1 && a === 0) {
                let l = n.readUint8('default_constant_IV_size');
                l !== null && n.skip(l, 'default_constant_IV');
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
            let a = [];
            for (let s = 0; s < 16; s++) {
                let l = n.readUint8(`kid_byte_${s}`);
                if (l !== null) a.push(l.toString(16).padStart(2, '0'));
                else {
                    n.finalize();
                    return;
                }
            }
            let o = e.details.kid_byte_0?.offset;
            if (o !== void 0) {
                e.details.default_KID = {
                    value: a.join(''),
                    offset: o,
                    length: 16,
                };
                for (let s = 0; s < 16; s++) delete e.details[`kid_byte_${s}`];
            }
        } else
            (n.addIssue('warn', `Unsupported tenc version ${i}.`),
                n.readRemainingBytes('unsupported_tenc_data'));
        n.finalize();
    }
    var Si = {
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
    function bi(e, t) {
        let n = new h(e, t);
        (n.readVersionAndFlags(),
            n.readRemainingBytes('id3v2_data'),
            n.finalize());
    }
    var Ti = {
        ID32: {
            name: 'ID3v2 Metadata Box',
            text: 'A box containing ID3 version 2 metadata tags. This is a common but non-standard box often found in files created by tools like FFmpeg, typically within a `udta` or `meta` box.',
            ref: 'User-defined',
        },
    };
    function Ii(e, t) {
        let n = new h(e, t),
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
    var vi = {
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
    function ms(e, t) {
        let n = new h(e, t);
        (n.readNullTerminatedString('content_type'),
            n.offset < e.size && n.readNullTerminatedString('content_encoding'),
            n.finalize());
    }
    function gs(e, t) {
        let n = new h(e, t);
        (n.skip(6, 'reserved_sample_entry'),
            n.readUint16('data_reference_index'),
            n.readNullTerminatedString('namespace'),
            n.readNullTerminatedString('schema_location'),
            n.readNullTerminatedString('auxiliary_mime_types'));
    }
    var Ci = { stpp: gs, mime: ms },
        Ei = {
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
    var Pi = {
            ftyp: Ue,
            styp: Ue,
            mvhd: dt,
            mfhd: ut,
            tfhd: gt,
            tfdt: _t,
            trun: yt,
            sidx: bt,
            tkhd: It,
            mdhd: Ct,
            hdlr: Pt,
            vmhd: At,
            smhd: Qt,
            stsd: Ut,
            stts: Rt,
            ctts: tn,
            stsc: wt,
            stsz: Bt,
            stz2: rn,
            stco: Vt,
            elst: $t,
            trex: Ht,
            pssh: Zt,
            avcC: Wt,
            avc1: Yn,
            mp4a: Jn,
            esds: qt,
            btrt: ei,
            sbgp: sn,
            tref: ln,
            ...fn,
            subs: dn,
            saiz: un,
            saio: gn,
            sinf: _n,
            frma: yn,
            schm: bn,
            schi: In,
            stss: Cn,
            sgpd: Pn,
            mehd: An,
            sdtp: Un,
            mfra: Rn,
            tfra: wn,
            mfro: Bn,
            pdin: Vn,
            cprt: $n,
            cslg: Hn,
            stdp: Gn,
            'url ': Wn,
            'urn ': Kn,
            free: Re,
            skip: Re,
            iods: ii,
            trep: ai,
            pasp: oi,
            colr: fi,
            meta: di,
            encv: ui,
            senc: gi,
            enca: _i,
            tenc: yi,
            ID32: bi,
            emsg: Ii,
            ...Ci,
        },
        Td = {
            ...Gt,
            ...ct,
            ...Ft,
            ...Dt,
            ...pt,
            ...mt,
            ...kn,
            ...ht,
            ...xt,
            ...St,
            ...Tt,
            ...vt,
            ...Et,
            ...kt,
            ...Jt,
            ...Mt,
            ...Lt,
            ...nn,
            ...Nt,
            ...zt,
            ...an,
            ...Ot,
            ...En,
            ...Dn,
            ...Xt,
            ...en,
            ...Kt,
            ...Qn,
            ...Zn,
            ...Yt,
            ...ti,
            ...on,
            ...cn,
            ...pn,
            ...mn,
            ...hn,
            ...xn,
            ...Sn,
            ...Tn,
            ...vn,
            ...Mn,
            ...Ln,
            ...Nn,
            ...zn,
            ...On,
            ...Fn,
            ...Xn,
            ...jn,
            ...qn,
            ...ni,
            ...ri,
            ...si,
            ...li,
            ...ci,
            ...pi,
            ...mi,
            ...hi,
            ...xi,
            ...Si,
            ...Ti,
            ...vi,
            ...Ei,
        };
    var Di = new Set([
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
    function Le(e, t = 0) {
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
            let a = i.getUint32(r),
                o = String.fromCharCode(
                    i.getUint8(r + 4),
                    i.getUint8(r + 5),
                    i.getUint8(r + 6),
                    i.getUint8(r + 7)
                ),
                s = 8;
            if (a === 1) {
                if (r + 16 > i.byteLength) {
                    n.issues.push({
                        type: 'error',
                        message: `Incomplete largesize box header for type '${o}' at offset ${t + r}. Requires 16 bytes, found ${i.byteLength - r}.`,
                    });
                    break;
                }
                ((a = Number(i.getBigUint64(r + 8))), (s = 16));
            } else a === 0 && (a = i.byteLength - r);
            if (a < s || r + a > i.byteLength) {
                n.issues.push({
                    type: 'error',
                    message: `Invalid size ${a} for box '${o}' at offset ${t + r}. Box claims to extend beyond buffer limits.`,
                });
                break;
            }
            let l = {
                type: o,
                size: a,
                offset: t + r,
                contentOffset: t + r + s,
                headerSize: s,
                children: [],
                details: {},
                issues: [],
            };
            ((l.details.size = {
                value: `${a} bytes`,
                offset: l.offset,
                length: s > 8 ? 8 : 4,
            }),
                (l.details.type = {
                    value: o,
                    offset: l.offset + 4,
                    length: 4,
                }));
            let c = new DataView(e, r, a);
            if (
                (hs(l, c), o === 'emsg' && n.events.push(l), Di.has(o) && a > s)
            ) {
                let f = s,
                    d = l.contentOffset;
                if (
                    o === 'avc1' ||
                    o === 'mp4a' ||
                    o === 'encv' ||
                    o === 'enca'
                ) {
                    let p = o === 'avc1' || o === 'encv' ? 78 : 28;
                    ((f += p), (d += p));
                } else
                    o === 'stsd' || o === 'dref' || o === 'trep'
                        ? ((f += 8), (d += 8))
                        : o === 'meta' && ((f += 4), (d += 4));
                if (a > f) {
                    let p = e.slice(r + f, r + a);
                    if (p.byteLength > 0) {
                        let m = Le(p, d);
                        ((l.children = m.boxes),
                            m.events.length > 0 && n.events.push(...m.events),
                            m.issues.length > 0 && l.issues.push(...m.issues));
                    }
                }
            }
            (o !== 'emsg' && n.boxes.push(l), (r += a));
        }
        return n;
    }
    function hs(e, t) {
        try {
            let n = Pi[e.type];
            n
                ? n(e, t)
                : e.type === 'mdat'
                  ? (e.details.info = {
                        value: 'Contains raw media data for samples.',
                        offset: e.contentOffset,
                        length: e.size - e.headerSize,
                    })
                  : Di.has(e.type) ||
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
    function we(e, t) {
        let n = e.getUint8(0),
            i = e.getUint8(1),
            r = e.getUint8(2),
            a = e.getUint8(3),
            o = ((i & 31) << 8) | r;
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
            pid: { value: o, offset: t + 1, length: 1.625 },
            transport_scrambling_control: {
                value: (a >> 6) & 3,
                offset: t + 3,
                length: 0.25,
            },
            adaptation_field_control: {
                value: (a >> 4) & 3,
                offset: t + 3,
                length: 0.25,
            },
            continuity_counter: { value: a & 15, offset: t + 3, length: 0.5 },
        };
    }
    function _s(e, t) {
        let n = e.getUint32(t),
            i = e.getUint32(t + 4);
        return new Date(
            (n - 2208988800) * 1e3 + (i / 4294967296) * 1e3
        ).toISOString();
    }
    function Ai(e, t) {
        let n = {},
            i = 0,
            r = e.getUint8(i),
            a = (r >> 6) & 3,
            o = (r >> 5) & 1,
            s = (r >> 4) & 1,
            l = (r >> 2) & 3,
            c = (r >> 1) & 1,
            f = r & 1;
        ((n.has_timestamp = { value: a, offset: t + i, length: 0.25 }),
            (n.has_ntp = { value: o, offset: t + i, length: 0.125 }),
            (n.has_ptp = { value: s, offset: t + i, length: 0.125 }),
            (n.has_timecode = { value: l, offset: t + i, length: 0.25 }),
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
            a &&
                ((n.timescale = {
                    value: e.getUint32(i),
                    offset: t + i,
                    length: 4,
                }),
                (i += 4),
                a === 1
                    ? ((n.media_timestamp = {
                          value: e.getUint32(i),
                          offset: t + i,
                          length: 4,
                      }),
                      (i += 4))
                    : a === 2 &&
                      ((n.media_timestamp = {
                          value: e.getBigUint64(i).toString(),
                          offset: t + i,
                          length: 8,
                      }),
                      (i += 8))),
            o &&
                ((n.ntp_timestamp = {
                    value: _s(e, i),
                    offset: t + i,
                    length: 8,
                }),
                (i += 8)),
            s &&
                ((n.ptp_timestamp = {
                    value: 'PTP data present',
                    offset: t + i,
                    length: 10,
                }),
                (i += 10)),
            l)
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
    function ki(e, t) {
        let n = [],
            i = 0;
        for (; i < e.byteLength && !(i + 2 > e.byteLength); ) {
            let r = e.getUint8(i),
                a = e.getUint8(i + 1);
            if (i + 2 + a > e.byteLength) break;
            let o = new DataView(e.buffer, e.byteOffset + i + 2, a),
                s = t + i + 2,
                l,
                c = 'Unknown/Private AF Descriptor';
            switch (r) {
                case 4:
                    ((c = 'Timeline Descriptor'), (l = Ai(o, s)));
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
            (l || (l = { data: { value: `${a} bytes`, offset: s, length: a } }),
                n.push({ tag: r, length: a, name: c, details: l }),
                (i += 2 + a));
        }
        return n;
    }
    function Ui(e) {
        let t = e.getUint8(0),
            n = e.getUint8(1),
            i = e.getUint8(2),
            r = e.getUint8(3),
            a = e.getUint8(4),
            o = e.getUint8(5),
            s =
                (BigInt(t) << 25n) |
                (BigInt(n) << 17n) |
                (BigInt(i) << 9n) |
                (BigInt(r) << 1n) |
                BigInt(a >> 7),
            l = ((BigInt(a) & 1n) << 8n) | BigInt(o);
        return s * 300n + l;
    }
    function xs(e) {
        let t = (e.getUint8(0) & 14) >> 1,
            n = e.getUint16(1) & 32767,
            i = e.getUint16(3) & 32767;
        return (BigInt(t) << 30n) | (BigInt(n) << 15n) | BigInt(i);
    }
    function Mi(e, t) {
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
            a = 2;
        if (
            (r.pcr_flag.value &&
                a + 6 <= n + 1 &&
                ((r.pcr = {
                    value: Ui(
                        new DataView(e.buffer, e.byteOffset + a)
                    ).toString(),
                    offset: t + a,
                    length: 6,
                }),
                (a += 6)),
            r.opcr_flag.value &&
                a + 6 <= n + 1 &&
                ((r.opcr = {
                    value: Ui(
                        new DataView(e.buffer, e.byteOffset + a)
                    ).toString(),
                    offset: t + a,
                    length: 6,
                }),
                (a += 6)),
            r.splicing_point_flag.value &&
                a + 1 <= n + 1 &&
                ((r.splice_countdown = {
                    value: e.getInt8(a),
                    offset: t + a,
                    length: 1,
                }),
                (a += 1)),
            r.transport_private_data_flag.value && a + 1 <= n + 1)
        ) {
            let s = e.getUint8(a);
            ((r.private_data_length = { value: s, offset: t + a, length: 1 }),
                (a += 1 + s));
        }
        if (r.adaptation_field_extension_flag.value && a + 1 <= n + 1) {
            let s = e.getUint8(a),
                l = e.getUint8(a + 1),
                c = (l >> 4) & 1;
            r.extension = {
                length: { value: s, offset: t + a, length: 1 },
                ltw_flag: {
                    value: (l >> 7) & 1,
                    offset: t + a + 1,
                    length: 0.125,
                },
                piecewise_rate_flag: {
                    value: (l >> 6) & 1,
                    offset: t + a + 1,
                    length: 0.125,
                },
                seamless_splice_flag: {
                    value: (l >> 5) & 1,
                    offset: t + a + 1,
                    length: 0.125,
                },
                af_descriptor_not_present_flag: {
                    value: c,
                    offset: t + a + 1,
                    length: 0.125,
                },
            };
            let f = a + 2;
            if (r.extension.ltw_flag.value && f + 2 <= a + 1 + s) {
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
            if (r.extension.piecewise_rate_flag.value && f + 3 <= a + 1 + s) {
                let p = e.getUint32(f - 1) & 1073741568;
                ((r.extension.piecewise_rate = {
                    value: p >> 8,
                    offset: t + f,
                    length: 3,
                }),
                    (f += 3));
            }
            r.extension.seamless_splice_flag.value &&
                f + 5 <= a + 1 + s &&
                ((r.extension.splice_type = {
                    value: e.getUint8(f) >> 4,
                    offset: t + f,
                    length: 0.5,
                }),
                (r.extension.DTS_next_AU = {
                    value: xs(
                        new DataView(e.buffer, e.byteOffset + f)
                    ).toString(),
                    offset: t + f,
                    length: 5,
                }),
                (f += 5));
            let d = a + 1 + s - f;
            if (d > 0)
                if (c === 0) {
                    let p = new DataView(e.buffer, e.byteOffset + f, d);
                    r.extension.af_descriptors = ki(p, t + f);
                } else
                    r.extension.reserved_bytes = {
                        value: `${d} reserved bytes`,
                        offset: t + f,
                        length: d,
                    };
            a += 1 + s;
        }
        let o = n + 1 - a;
        return (
            o > 0 &&
                (r.stuffing_bytes = { value: o, offset: t + a, length: o }),
            r
        );
    }
    var Ri = {
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
    var ys = [
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
    function Ss(e) {
        let t = 4294967295;
        for (let n = 0; n < e.byteLength; n++) {
            let i = e.getUint8(n);
            t = (t << 8) ^ ys[((t >> 24) ^ i) & 255];
        }
        return t >>> 0;
    }
    function Y(e) {
        if (e.byteLength < 3)
            return {
                header: { error: 'Section too short for header' },
                payload: new DataView(new ArrayBuffer(0)),
                crc: 'N/A',
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
            let x = new DataView(e.buffer, e.byteOffset + 3, i);
            return {
                header: {
                    table_id: `0x${t.toString(16).padStart(2, '0')}`,
                    section_syntax_indicator: n,
                    section_length: i,
                },
                payload: x,
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
        let a = new DataView(e.buffer, e.byteOffset, r - 4),
            o = Ss(a),
            s = e.getUint32(r - 4),
            l = o === s,
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
            m = new DataView(e.buffer, e.byteOffset + f, p);
        return {
            header: c,
            payload: m,
            crc: `0x${s.toString(16).padStart(8, '0')}`,
            isValid: l,
        };
    }
    function Ne(e, t) {
        let n = [];
        for (let i = 0; i + 4 <= e.byteLength; i += 4) {
            let r = e.getUint16(i),
                a = e.getUint16(i + 2) & 8191;
            r === 0
                ? n.push({
                      type: 'network',
                      pid: { value: a, offset: t + i + 2, length: 1.625 },
                  })
                : n.push({
                      type: 'program',
                      program_number: { value: r, offset: t + i, length: 2 },
                      program_map_PID: {
                          value: a,
                          offset: t + i + 2,
                          length: 1.625,
                      },
                  });
        }
        return { type: 'PAT', programs: n };
    }
    var Li = {
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
    function wi(e, t) {
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
            let a = e.getUint8(2);
            ((i.chroma_format = {
                value: (a >> 6) & 3,
                offset: t + 2,
                length: 0.25,
            }),
                (i.frame_rate_extension_flag = {
                    value: (a >> 5) & 1,
                    offset: t + 2,
                    length: 0.125,
                }));
        }
        return i;
    }
    function Ni(e, t) {
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
    function Bi(e, t) {
        let n = e.getUint8(0),
            i = n & 15,
            r = e.getUint8(1),
            a = e.getUint8(2),
            o = {
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
                value: `${o[i] || 'Reserved'} (${i})`,
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
                value: a & 63,
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
    function zi(e, t) {
        let n = e.getUint32(0),
            i = [];
        for (let a = 4; a < e.byteLength; a++)
            i.push(e.getUint8(a).toString(16).padStart(2, '0'));
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
    function Vi(e, t, n) {
        let i = e.getUint8(0),
            r = `Unknown/Reserved (${i})`,
            a = {
                1: 'Slice, or video access unit',
                2: 'Video access unit',
                3: 'GOP, or SEQ',
                4: 'SEQ',
            },
            o = {
                1: 'AVC slice or AVC access unit',
                2: 'AVC access unit',
                3: 'SVC slice or SVC dependency representation',
                4: 'SVC dependency representation',
                5: 'MVC slice or MVC view-component subset',
                6: 'MVC view-component subset',
                7: 'MVCD slice or MVCD view-component subset',
                8: 'MVCD view-component subset',
            },
            s = {
                1: 'HEVC access unit',
                2: 'HEVC slice',
                3: 'HEVC access unit or slice',
                4: 'HEVC tile of slices',
            },
            l = { 1: 'Sync word' },
            c = [1, 2, 16],
            f = [27, 31, 32, 35, 38],
            d = [36, 37],
            p = [3, 4, 15, 17, 28];
        return (
            c.includes(n)
                ? (r = a[i] || r)
                : f.includes(n)
                  ? (r = o[i] || r)
                  : d.includes(n)
                    ? (r = s[i] || r)
                    : p.includes(n) && (r = l[i] || r),
            { alignment_type: { value: r, offset: t, length: 1 } }
        );
    }
    function Oi(e, t) {
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
    function $i(e, t) {
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
    function Fi(e, t) {
        let n = e.getUint16(0),
            i = e.getUint16(2) & 8191,
            r = [];
        for (let a = 4; a < e.byteLength; a++)
            r.push(e.getUint8(a).toString(16).padStart(2, '0'));
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
    function Hi(e, t) {
        let n = [];
        for (let i = 0; i < e.byteLength && !(i + 4 > e.byteLength); i += 4) {
            let r =
                    String.fromCharCode(e.getUint8(i)) +
                    String.fromCharCode(e.getUint8(i + 1)) +
                    String.fromCharCode(e.getUint8(i + 2)),
                a = e.getUint8(i + 3),
                o = {
                    0: 'Undefined',
                    1: 'Clean effects',
                    2: 'Hearing impaired',
                    3: 'Visual impaired commentary',
                };
            n.push({
                language: { value: r, offset: t + i, length: 3 },
                audio_type: {
                    value: o[a] || `User Private (0x${a.toString(16)})`,
                    offset: t + i + 3,
                    length: 1,
                },
            });
        }
        return { languages: n };
    }
    function Xi(e, t) {
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
    function Gi(e, t) {
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
    function ji(e, t) {
        return {
            copyright_identifier: {
                value: `0x${e.getUint32(0).toString(16).padStart(8, '0')}`,
                offset: t,
                length: 4,
            },
        };
    }
    function Wi(e, t) {
        return {
            maximum_bitrate: {
                value: `${(((e.getUint32(0) & 4194303) * 50 * 8) / 1e6).toFixed(2)} Mbps`,
                offset: t,
                length: 4,
            },
        };
    }
    function Ki(e, t) {
        return {
            private_data_indicator: {
                value: `0x${e.getUint32(0).toString(16).padStart(8, '0')}`,
                offset: t,
                length: 4,
            },
        };
    }
    function qi(e, t) {
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
    function Yi(e, t) {
        return {
            leak_valid_flag: {
                value: e.getUint8(0) & 1,
                offset: t,
                length: 0.125,
            },
        };
    }
    function Qi(e, t) {
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
    function Ji(e, t) {
        return {
            MPEG4_visual_profile_and_level: {
                value: `0x${e.getUint8(0).toString(16).padStart(2, '0')}`,
                offset: t,
                length: 1,
            },
        };
    }
    function Zi(e, t) {
        return {
            MPEG4_audio_profile_and_level: {
                value: `0x${e.getUint8(0).toString(16).padStart(2, '0')}`,
                offset: t,
                length: 1,
            },
        };
    }
    function er(e, t) {
        return {
            textConfig_data: {
                value: `${e.byteLength} bytes of TextConfig data`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function tr(e, t) {
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
    function nr(e, t) {
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
        let a = e.getUint8(i);
        if (
            ((n.progressive_source_flag = {
                value: (a >> 7) & 1,
                offset: t + i,
                length: 0.125,
            }),
            (n.interlaced_source_flag = {
                value: (a >> 6) & 1,
                offset: t + i,
                length: 0.125,
            }),
            (n.non_packed_constraint_flag = {
                value: (a >> 5) & 1,
                offset: t + i,
                length: 0.125,
            }),
            (n.frame_only_constraint_flag = {
                value: (a >> 4) & 1,
                offset: t + i,
                length: 0.125,
            }),
            (i += 1),
            (i += 6),
            (n.level_idc = { value: e.getUint8(i), offset: t + i, length: 1 }),
            (i += 1),
            i < e.byteLength)
        ) {
            let o = e.getUint8(i),
                s = (o >> 7) & 1;
            if (
                ((n.temporal_layer_subset_flag = {
                    value: s,
                    offset: t + i,
                    length: 0.125,
                }),
                (n.HEVC_still_present_flag = {
                    value: (o >> 6) & 1,
                    offset: t + i,
                    length: 0.125,
                }),
                (n.HEVC_24hr_picture_present_flag = {
                    value: (o >> 5) & 1,
                    offset: t + i,
                    length: 0.125,
                }),
                (n.sub_pic_hrd_params_not_present_flag = {
                    value: (o >> 4) & 1,
                    offset: t + i,
                    length: 0.125,
                }),
                (n.HDR_WCG_idc = { value: o & 3, offset: t + i, length: 0.25 }),
                (i += 1),
                s)
            ) {
                let l = e.getUint8(i);
                ((n.temporal_id_min = {
                    value: (l >> 5) & 7,
                    offset: t + i,
                    length: 0.375,
                }),
                    (n.temporal_id_max = {
                        value: l & 7,
                        offset: t + i,
                        length: 0.375,
                    }));
            }
        }
        return n;
    }
    function ir(e, t) {
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
        let o = e.getUint8(i) & 1;
        if (
            ((n.picture_and_timing_info_present_flag = {
                value: o,
                offset: t + i,
                length: 0.125,
            }),
            (i += 1),
            o && e.byteLength > i)
        ) {
            let l = (e.getUint8(i) >> 7) & 1;
            ((n['90kHz_flag'] = { value: l, offset: t + i, length: 0.125 }),
                (i += 1),
                l === 0 &&
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
    function rr(e, t) {
        let n = {},
            i = 0,
            r = e.getUint8(i);
        n.num_ptl = { value: r & 63, offset: t + i, length: 0.75 };
        let a = r & 63;
        ((i += 1), (n.profile_tier_level_infos = []));
        for (
            let s = 0;
            s < a && !(i + 12 > e.byteLength || i + 12 > e.byteLength);
            s++
        )
            (n.profile_tier_level_infos.push({
                value: `12 bytes of PTL data for index ${s}`,
                offset: t + i,
                length: 12,
            }),
                (i += 12));
        let o = e.getUint8(i);
        ((n.operation_points_count = { value: o, offset: t + i, length: 1 }),
            (i += 1),
            (n.operation_points = []));
        for (
            let s = 0;
            s < o && !(i + 2 > e.byteLength || i + 2 > e.byteLength);
            s++
        ) {
            let l = {};
            ((l.target_ols = {
                value: e.getUint8(i),
                offset: t + i,
                length: 1,
            }),
                (l.ES_count = {
                    value: e.getUint8(i + 1),
                    offset: t + i + 1,
                    length: 1,
                }));
            let c = l.ES_count.value;
            ((i += 2), (l.es_references = []));
            for (let p = 0; p < c && !(i + 1 > e.byteLength); p++) {
                let m = e.getUint8(i);
                if (i + 1 > e.byteLength) break;
                (l.es_references.push({
                    prepend_dependencies: {
                        value: (m >> 7) & 1,
                        offset: t + i,
                        length: 0.125,
                    },
                    ES_reference: {
                        value: m & 63,
                        offset: t + i,
                        length: 0.75,
                    },
                }),
                    (i += 1));
            }
            if (i + 1 > e.byteLength) break;
            l.numEsInOp = {
                value: e.getUint8(i) & 63,
                offset: t + i,
                length: 0.75,
            };
            let f = l.numEsInOp.value;
            ((i += 1), (l.layers = []));
            for (let p = 0; p < f && !(i + 1 > e.byteLength); p++) {
                let m = e.getUint8(i);
                if (i + 1 > e.byteLength) break;
                (l.layers.push({
                    necessary_layer_flag: {
                        value: (m >> 7) & 1,
                        offset: t + i,
                        length: 0.125,
                    },
                    output_layer_flag: {
                        value: (m >> 6) & 1,
                        offset: t + i,
                        length: 0.125,
                    },
                    ptl_ref_idx: { value: m & 63, offset: t + i, length: 0.75 },
                }),
                    (i += 1));
            }
            if (i + 1 > e.byteLength) break;
            let d = e.getUint8(i);
            if (
                ((l.avg_bit_rate_info_flag = {
                    value: (d >> 7) & 1,
                    offset: t + i,
                    length: 0.125,
                }),
                (l.max_bit_rate_info_flag = {
                    value: (d >> 6) & 1,
                    offset: t + i,
                    length: 0.125,
                }),
                (l.constant_frame_rate_info_idc = {
                    value: (d >> 4) & 3,
                    offset: t + i,
                    length: 0.25,
                }),
                (l.applicable_temporal_id = {
                    value: (d >> 1) & 7,
                    offset: t + i,
                    length: 0.375,
                }),
                (i += 1),
                l.constant_frame_rate_info_idc.value > 0)
            ) {
                if (i + 2 > e.byteLength || i + 2 > e.byteLength) break;
                ((l.frame_rate_indicator = {
                    value: e.getUint16(i) & 4095,
                    offset: t + i,
                    length: 1.5,
                }),
                    (i += 2));
            }
            if (l.avg_bit_rate_info_flag.value === 1) {
                if (i + 3 > e.byteLength || i + 3 > e.byteLength) break;
                ((l.avg_bit_rate = {
                    value: (e.getUint8(i) << 16) | e.getUint16(i + 1),
                    offset: t + i,
                    length: 3,
                }),
                    (i += 3));
            }
            if (l.max_bit_rate_info_flag.value === 1) {
                if (i + 3 > e.byteLength || i + 3 > e.byteLength) break;
                ((l.max_bit_rate = {
                    value: (e.getUint8(i) << 16) | e.getUint16(i + 1),
                    offset: t + i,
                    length: 3,
                }),
                    (i += 3));
            }
            n.operation_points.push(l);
        }
        return n;
    }
    function ar(e, t) {
        let n = {},
            i = 0,
            a = (e.getUint8(i) >> 6) & 3;
        ((n.num_constant_backlight_voltage_time_intervals = {
            value: a,
            offset: t + i,
            length: 0.25,
        }),
            (i += 1),
            (n.intervals = []));
        for (
            let l = 0;
            l < a && !(i + 2 > e.byteLength || i + 2 > e.byteLength);
            l++
        )
            (n.intervals.push({
                constant_backlight_voltage_time_interval: {
                    value: e.getUint16(i),
                    offset: t + i,
                    length: 2,
                },
            }),
                (i += 2));
        let s = (e.getUint8(i) >> 6) & 3;
        ((n.num_max_variations = { value: s, offset: t + i, length: 0.25 }),
            (i += 1),
            (n.variations = []));
        for (
            let l = 0;
            l < s && !(i + 2 > e.byteLength || i + 2 > e.byteLength);
            l++
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
    function sr(e, t) {
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
    function or(e, t) {
        return {
            mpegh3daConfig: {
                value: `${e.byteLength} bytes of config data`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function lr(e, t) {
        return {
            scene_info: {
                value: `${e.byteLength} bytes of scene information`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function fr(e, t) {
        return {
            text_label_info: {
                value: `${e.byteLength} bytes of text label information`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function cr(e, t) {
        return {
            multistream_info: {
                value: `${e.byteLength} bytes of multi-stream information`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function dr(e, t) {
        return {
            drc_loudness_info: {
                value: `${e.byteLength} bytes of DRC/Loudness information`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function pr(e, t) {
        return {
            command_data: {
                value: `${e.byteLength} bytes of command data`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function ur(e, t) {
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
            let a = 0;
            a < r && !(i + 4 > e.byteLength || i + 4 > e.byteLength);
            a++
        ) {
            let o = e.getUint32(i);
            (n.metrics.push({
                metric_code: {
                    value: `0x${o.toString(16).padStart(8, '0')}`,
                    offset: t + i,
                    length: 4,
                },
            }),
                (i += 4));
        }
        return n;
    }
    function mr(e, t) {
        let n = {},
            i = 0;
        if (e.byteLength < 1) return n;
        let r = e.getUint8(i),
            a = (r >> 5) & 7,
            o = (r >> 4) & 1;
        ((n.num_partitions = { value: a, offset: t + i, length: 0.375 }),
            (n.timescale_flag = { value: o, offset: t + i, length: 0.125 }),
            (i += 1));
        let s = -1;
        if (o) {
            let l = e.getUint32(i - 1);
            ((n.ticks_per_second = {
                value: (l >> 8) & 2097151,
                offset: t + i - 1,
                length: 2.625,
            }),
                (s = (e.getUint8(i + 2) >> 5) & 7),
                (n.maximum_duration_length_minus_1 = {
                    value: s,
                    offset: t + i + 2,
                    length: 0.375,
                }),
                (i += 3));
        }
        n.partitions = [];
        for (let l = 0; l < a && !(i + 2 > e.byteLength); l++) {
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
                let p = s + 1;
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
    function gr(e, t) {
        let n = {},
            i = 0,
            r = e.getUint8(i),
            a = (r >> 7) & 1;
        if (
            ((n.ReferenceFlag = { value: a, offset: t + i, length: 0.125 }),
            (n.SubstreamID = { value: r & 127, offset: t + i, length: 0.875 }),
            (i += 1),
            e.byteLength > 1)
        )
            if (a === 1) {
                let o = e.getUint8(i);
                ((n.PreambleFlag = {
                    value: (o >> 7) & 1,
                    offset: t + i,
                    length: 0.125,
                }),
                    (n.PatternReference = {
                        value: o & 127,
                        offset: t + i,
                        length: 0.875,
                    }));
            } else
                for (n.additional_substreams = []; i < e.byteLength; ) {
                    let o = e.getUint8(i);
                    (n.additional_substreams.push({
                        Flag: {
                            value: (o >> 7) & 1,
                            offset: t + i,
                            length: 0.125,
                        },
                        AdditionalSubstreamID: {
                            value: o & 127,
                            offset: t + i,
                            length: 0.875,
                        },
                    }),
                        (i += 1));
                }
        return n;
    }
    function hr(e, t) {
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
        let a = e.byteLength - i;
        return (
            a > 0 &&
                (n.layout_data = {
                    value: `${a} bytes of layout data`,
                    offset: t + i,
                    length: a,
                }),
            n
        );
    }
    function _r(e, t) {
        let n = 'Extension Descriptor',
            i = e.getUint8(0),
            r = new DataView(e.buffer, e.byteOffset + 1, e.byteLength - 1),
            a = {
                extension_descriptor_tag: {
                    value: `0x${i.toString(16)}`,
                    offset: t,
                    length: 1,
                },
            };
        if (i === 2)
            ((n = 'Object Descriptor Update'),
                (a.ODUpdate_data = {
                    value: `${r.byteLength} bytes`,
                    offset: t + 1,
                    length: r.byteLength,
                }));
        else if (i === 3)
            ((n = 'HEVC Timing and HRD Descriptor'),
                Object.assign(a, ir(r, t + 1)));
        else if (i === 4)
            ((n = 'AF Extensions Descriptor'),
                (a.af_extensions_data = {
                    value: `${r.byteLength} bytes`,
                    offset: t + 1,
                    length: r.byteLength,
                }));
        else if (i === 5)
            ((n = 'HEVC Operation Point Descriptor'),
                Object.assign(a, rr(r, t + 1)));
        else if (i === 6)
            ((n = 'HEVC Hierarchy Extension Descriptor'), Object.assign(a, {}));
        else if (i === 7)
            ((n = 'Green Extension Descriptor'),
                Object.assign(a, ar(r, t + 1)));
        else if (i === 8)
            ((n = 'MPEG-H 3D Audio Descriptor'),
                Object.assign(a, sr(r, t + 1)));
        else if (i === 9)
            ((n = 'MPEG-H 3D Audio Config Descriptor'),
                Object.assign(a, or(r, t + 1)));
        else if (i === 10)
            ((n = 'MPEG-H 3D Audio Scene Descriptor'),
                Object.assign(a, lr(r, t + 1)));
        else if (i === 11)
            ((n = 'MPEG-H 3D Audio Text Label Descriptor'),
                Object.assign(a, fr(r, t + 1)));
        else if (i === 12)
            ((n = 'MPEG-H 3D Audio Multi-stream Descriptor'),
                Object.assign(a, cr(r, t + 1)));
        else if (i === 13)
            ((n = 'MPEG-H 3D Audio DRC Loudness Descriptor'),
                Object.assign(a, dr(r, t + 1)));
        else if (i === 14)
            ((n = 'MPEG-H 3D Audio Command Descriptor'),
                Object.assign(a, pr(r, t + 1)));
        else if (i === 15)
            ((n = 'Quality Extension Descriptor'),
                Object.assign(a, ur(r, t + 1)));
        else if (i === 16)
            ((n = 'Virtual Segmentation Descriptor'),
                Object.assign(a, mr(r, t + 1)));
        else if (i === 17)
            ((n = 'Timed Metadata Extension Descriptor'),
                (a.timed_metadata = {
                    value: `${r.byteLength} bytes`,
                    offset: t + 1,
                    length: r.byteLength,
                }));
        else if (i === 18)
            ((n = 'HEVC Tile Substream Descriptor'),
                Object.assign(a, gr(r, t + 1)));
        else if (i === 19)
            ((n = 'HEVC Subregion Descriptor'), Object.assign(a, hr(r, t + 1)));
        else {
            let o = e.byteLength - 1;
            o > 0 &&
                (a.reserved_data = {
                    value: `${o} bytes`,
                    offset: t + 1,
                    length: o,
                });
        }
        return { name: n, details: a };
    }
    function xr(e, t) {
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
    function yr(e, t) {
        return { ES_ID: { value: e.getUint16(0), offset: t, length: 2 } };
    }
    function Sr(e, t) {
        let n = [];
        for (let i = 0; i < e.byteLength && !(i + 3 > e.byteLength); i += 3) {
            let r = e.getUint16(i),
                a = e.getUint8(i + 2);
            n.push({
                ES_ID: { value: r, offset: t + i, length: 2 },
                FlexMuxChannel: { value: a, offset: t + i + 2, length: 1 },
            });
        }
        return { entries: n };
    }
    function br(e, t) {
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
    function Tr(e, t) {
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
    function Ir(e, t) {
        return {
            FCR_ES_ID: { value: e.getUint16(0), offset: t, length: 2 },
            FCRResolution: { value: e.getUint32(2), offset: t + 2, length: 4 },
            FCRLength: { value: e.getUint8(6), offset: t + 6, length: 1 },
            FmxRateLength: { value: e.getUint8(7), offset: t + 7, length: 1 },
        };
    }
    function vr(e, t) {
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
    function Cr(e, t) {
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
    function Er(e, t) {
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
    function Pr(e, t) {
        let i = e.getUint8(0) & 1,
            r = { base_video_flag: { value: i, offset: t, length: 0.125 } };
        if (i) {
            if (e.byteLength > 1) {
                let a = e.getUint8(1);
                r.leftview_flag = {
                    value: a & 1,
                    offset: t + 1,
                    length: 0.125,
                };
            }
        } else if (e.byteLength > 1) {
            let a = e.getUint8(1);
            ((r.usable_as_2D = {
                value: (a >> 7) & 1,
                offset: t + 1,
                length: 0.125,
            }),
                (r.horizontal_upsampling_factor = {
                    value: (a >> 3) & 15,
                    offset: t + 1,
                    length: 0.5,
                }),
                (r.vertical_upsampling_factor = {
                    value: ((a & 7) << 1) | (e.getUint8(2) >> 7),
                    offset: t + 1.625,
                    length: 0.5,
                }));
        }
        return r;
    }
    function Dr(e, t) {
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
    function Ar(e, t) {
        let n = e.getUint16(0),
            i = (n >> 15) & 1,
            r = n & 32767,
            a = {
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
            o = 22;
        if (i) {
            let l = e.getUint8(o);
            ((a.stripe_flag = {
                value: (l >> 7) & 1,
                offset: t + o,
                length: 0.125,
            }),
                (a.block_flag = {
                    value: (l >> 6) & 1,
                    offset: t + o,
                    length: 0.125,
                }),
                (a.mdm_flag = {
                    value: (l >> 5) & 1,
                    offset: t + o,
                    length: 0.125,
                }),
                (o += 1));
        } else
            ((a.color_specification = {
                value: e.getUint8(o),
                offset: t + o,
                length: 1,
            }),
                (o += 1));
        let s = e.getUint8(o);
        if (
            ((a.still_mode = {
                value: (s >> 7) & 1,
                offset: t + o,
                length: 0.125,
            }),
            (a.interlaced_video = {
                value: (s >> 6) & 1,
                offset: t + o,
                length: 0.125,
            }),
            (o += 1),
            i)
        ) {
            ((a.colour_primaries = {
                value: e.getUint8(o),
                offset: t + o,
                length: 1,
            }),
                (o += 1),
                (a.transfer_characteristics = {
                    value: e.getUint8(o),
                    offset: t + o,
                    length: 1,
                }),
                (o += 1),
                (a.matrix_coefficients = {
                    value: e.getUint8(o),
                    offset: t + o,
                    length: 1,
                }),
                (o += 1));
            let l = e.getUint8(o);
            ((a.video_full_range_flag = {
                value: (l >> 7) & 1,
                offset: t + o,
                length: 0.125,
            }),
                (o += 1));
        }
        return a;
    }
    function kr(e, t) {
        let n = e.getUint8(0),
            i = (n >> 7) & 1,
            r = n & 1,
            a = {
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
            o = 1;
        if (r && e.byteLength > o) {
            let l = (e.getUint8(o) >> 7) & 1;
            ((a['90kHz_flag'] = { value: l, offset: t + o, length: 0.125 }),
                (o += 1),
                l === 0 &&
                    e.byteLength >= o + 8 &&
                    ((a.N = {
                        value: e.getUint32(o),
                        offset: t + o,
                        length: 4,
                    }),
                    (a.K = {
                        value: e.getUint32(o + 4),
                        offset: t + o + 4,
                        length: 4,
                    }),
                    (o += 8)),
                e.byteLength >= o + 4 &&
                    ((a.num_units_in_tick = {
                        value: e.getUint32(o),
                        offset: t + o,
                        length: 4,
                    }),
                    (o += 4)));
        }
        if (e.byteLength > o) {
            let s = e.getUint8(o);
            ((a.fixed_frame_rate_flag = {
                value: (s >> 7) & 1,
                offset: t + o,
                length: 0.125,
            }),
                (a.temporal_poc_flag = {
                    value: (s >> 6) & 1,
                    offset: t + o,
                    length: 0.125,
                }),
                (a.picture_to_display_conversion_flag = {
                    value: (s >> 5) & 1,
                    offset: t + o,
                    length: 0.125,
                }));
        }
        return a;
    }
    function Ur(e, t) {
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
            let o = e.getUint8(i);
            ((n.content_reference_id_record_length = {
                value: o,
                offset: t + i,
                length: 1,
            }),
                (i += 1),
                (n.content_reference_id_record = {
                    value: `${o} bytes`,
                    offset: t + i,
                    length: o,
                }),
                (i += o));
        }
        if (
            n.content_time_base_indicator.value === 1 ||
            n.content_time_base_indicator.value === 2
        ) {
            let o = e.getUint8(i) & 1,
                s = e.getUint32(i + 1);
            ((n.content_time_base_value = {
                value: ((BigInt(o) << 32n) | BigInt(s)).toString(),
                offset: t + i,
                length: 5,
            }),
                (i += 5));
            let l = e.getUint8(i) & 1,
                c = e.getUint32(i + 1);
            ((n.metadata_time_base_value = {
                value: ((BigInt(l) << 32n) | BigInt(c)).toString(),
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
            let o = e.getUint8(i);
            ((n.time_base_association_data_length = {
                value: o,
                offset: t + i,
                length: 1,
            }),
                (i += 1),
                (n.time_base_association_data = {
                    value: `${o} bytes`,
                    offset: t + i,
                    length: o,
                }),
                (i += o));
        }
        let a = e.byteLength - i;
        return (
            a > 0 &&
                (n.private_data = {
                    value: `${a} bytes`,
                    offset: t + i,
                    length: a,
                }),
            n
        );
    }
    function Mr(e, t) {
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
            let o = e.getUint8(i);
            ((n.metadata_locator_record_length = {
                value: o,
                offset: t + i,
                length: 1,
            }),
                (i += 1),
                (n.metadata_locator_record = {
                    value: `${o} bytes`,
                    offset: t + i,
                    length: o,
                }),
                (i += o));
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
        let a = e.byteLength - i;
        return (
            a > 0 &&
                (n.private_data = {
                    value: `${a} bytes`,
                    offset: t + i,
                    length: a,
                }),
            n
        );
    }
    function Rr(e, t) {
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
            let s = e.getUint8(i);
            ((n.service_identification_length = {
                value: s,
                offset: t + i,
                length: 1,
            }),
                (i += 1),
                (n.service_identification_record = {
                    value: `${s} bytes`,
                    offset: t + i,
                    length: s,
                }),
                (i += s));
        }
        let a = n.decoder_config_flags.value;
        if (a === 1) {
            let s = e.getUint8(i);
            ((n.decoder_config_length = { value: s, offset: t + i, length: 1 }),
                (i += 1),
                (n.decoder_config = {
                    value: `${s} bytes`,
                    offset: t + i,
                    length: s,
                }),
                (i += s));
        } else if (a === 3) {
            let s = e.getUint8(i);
            ((n.dec_config_identification_record_length = {
                value: s,
                offset: t + i,
                length: 1,
            }),
                (i += 1),
                (n.dec_config_identification_record = {
                    value: `${s} bytes`,
                    offset: t + i,
                    length: s,
                }),
                (i += s));
        } else
            a === 4 &&
                ((n.decoder_config_metadata_service_id = {
                    value: e.getUint8(i),
                    offset: t + i,
                    length: 1,
                }),
                (i += 1));
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
    function Lr(e, t) {
        let n = {},
            i = 0,
            r = e.getUint8(i),
            a = e.getUint8(i + 1),
            o = e.getUint8(i + 2);
        ((n.metadata_input_leak_rate = {
            value: ((r & 63) << 16) | (a << 8) | o,
            offset: t + i,
            length: 3,
        }),
            (i += 3));
        let s = e.getUint8(i),
            l = e.getUint8(i + 1),
            c = e.getUint8(i + 2);
        ((n.metadata_buffer_size = {
            value: ((s & 63) << 16) | (l << 8) | c,
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
    function wr(e, t) {
        let n = e.getUint8(0),
            i = e.getUint8(1),
            r = e.getUint8(2),
            a = {
                0: 'Main Profile',
                1: 'Low Complexity Profile (LC)',
                2: 'Scalable Sample Rate Profile (SSR)',
                3: 'Reserved',
            },
            o = {
                1: '1 channel (mono)',
                2: '2 channels (stereo)',
                3: '3 channels (front: C, L, R)',
                4: '4 channels (front: C, L, R; back: C)',
                5: '5 channels (front: C, L, R; back: L, R)',
                6: '5.1 channels (front: C, L, R; back: L, R; LFE)',
            },
            s = {
                0: 'AAC data according to ISO/IEC 13818-7',
                1: 'AAC data with Bandwidth Extension data present',
            };
        return {
            MPEG_2_AAC_profile: {
                value: `${a[n] || 'Reserved'} (${n})`,
                offset: t,
                length: 1,
            },
            MPEG_2_AAC_channel_configuration: {
                value: `${o[i] || 'Undefined'} (${i})`,
                offset: t + 1,
                length: 1,
            },
            MPEG_2_AAC_additional_information: {
                value: `${s[r] || 'Reserved'} (0x${r.toString(16).padStart(2, '0')})`,
                offset: t + 2,
                length: 1,
            },
        };
    }
    function Nr(e, t) {
        let n = {},
            i = 0,
            r = e.getUint8(i),
            a = (r >> 7) & 1,
            o = r & 15;
        ((n.ASC_flag = { value: a, offset: t + i, length: 0.125 }),
            (n.num_of_loops = { value: o, offset: t + i, length: 0.5 }),
            (i += 1));
        for (let s = 0; s < o && !(i >= e.byteLength); s++) {
            let l = e.getUint8(i);
            ((n[`audioProfileLevelIndication_${s + 1}`] = {
                value: `0x${l.toString(16).padStart(2, '0')}`,
                offset: t + i,
                length: 1,
            }),
                (i += 1));
        }
        if (a && i < e.byteLength) {
            let s = e.getUint8(i);
            ((n.ASC_size = { value: s, offset: t + i, length: 1 }),
                (i += 1),
                i + s <= e.byteLength &&
                    (n.audioSpecificConfig = {
                        value: `${s} bytes of AudioSpecificConfig data`,
                        offset: t + i,
                        length: s,
                    }));
        }
        return n;
    }
    function Br(e, t) {
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
    function zr(e, t) {
        return {
            External_ES_ID: { value: e.getUint16(0), offset: t, length: 2 },
        };
    }
    function Vr(e, t) {
        return {
            mux_code_table_entry_data: {
                value: `${e.byteLength} bytes of MuxCodeTableEntry data`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function Or(e, t) {
        return {
            fmx_buffer_size_data: {
                value: `${e.byteLength} bytes of FlexMux Buffer Size data`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function $r(e, t) {
        return {
            ipmp_data: {
                value: `${e.byteLength} bytes of IPMP data`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function Fr(e, t) {
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
        let a = e.getUint8(i);
        ((n.level_count = { value: a, offset: t + i, length: 1 }),
            (i += 1),
            (n.levels = []));
        for (let o = 0; o < a && !(i + 2 > e.byteLength); o++) {
            let s = {
                level_idc: { value: e.getUint8(i), offset: t + i, length: 1 },
                operation_points: [],
            };
            i += 1;
            let l = e.getUint8(i);
            ((s.operation_points_count = {
                value: l,
                offset: t + i,
                length: 1,
            }),
                (i += 1));
            for (let c = 0; c < l && !(i + 3 > e.byteLength); c++) {
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
                for (let m = 0; m < p && !(i + 1 > e.byteLength); m++) {
                    let _ = e.getUint8(i);
                    (d.es_references.push({
                        ES_reference: {
                            value: _ & 63,
                            offset: t + i,
                            length: 0.75,
                        },
                    }),
                        (i += 1));
                }
                s.operation_points.push(d);
            }
            n.levels.push(s);
        }
        return n;
    }
    function Q(e, t, n = null) {
        let i = [],
            r = 0,
            a = n ? parseInt(n, 16) : null;
        for (; r < e.byteLength && !(r + 2 > e.byteLength); ) {
            let o = e.getUint8(r),
                s = e.getUint8(r + 1);
            if (r + 2 + s > e.byteLength) break;
            let l = new DataView(e.buffer, e.byteOffset + r + 2, s),
                c = t + r + 2,
                f,
                d = 'Unknown/Private Descriptor';
            switch (o) {
                case 2:
                    ((d = 'Video Stream Descriptor'), (f = wi(l, c)));
                    break;
                case 3:
                    ((d = 'Audio Stream Descriptor'), (f = Ni(l, c)));
                    break;
                case 4:
                    ((d = 'Hierarchy Descriptor'), (f = Bi(l, c)));
                    break;
                case 5:
                    ((d = 'Registration Descriptor'), (f = zi(l, c)));
                    break;
                case 6:
                    ((d = 'Data Stream Alignment Descriptor'),
                        (f = Vi(l, c, a)));
                    break;
                case 7:
                    ((d = 'Target Background Grid Descriptor'), (f = Oi(l, c)));
                    break;
                case 8:
                    ((d = 'Video Window Descriptor'), (f = $i(l, c)));
                    break;
                case 9:
                    ((d = 'Conditional Access Descriptor'), (f = Fi(l, c)));
                    break;
                case 10:
                    ((d = 'ISO 639 Language Descriptor'), (f = Hi(l, c)));
                    break;
                case 11:
                    ((d = 'System Clock Descriptor'), (f = Xi(l, c)));
                    break;
                case 12:
                    ((d = 'Multiplex Buffer Utilization Descriptor'),
                        (f = Gi(l, c)));
                    break;
                case 13:
                    ((d = 'Copyright Descriptor'), (f = ji(l, c)));
                    break;
                case 14:
                    ((d = 'Maximum Bitrate Descriptor'), (f = Wi(l, c)));
                    break;
                case 15:
                    ((d = 'Private Data Indicator Descriptor'), (f = Ki(l, c)));
                    break;
                case 16:
                    ((d = 'Smoothing Buffer Descriptor'), (f = qi(l, c)));
                    break;
                case 17:
                    ((d = 'STD Descriptor'), (f = Yi(l, c)));
                    break;
                case 18:
                    ((d = 'IBP Descriptor'), (f = Qi(l, c)));
                    break;
                case 27:
                    ((d = 'MPEG-4 Video Descriptor'), (f = Ji(l, c)));
                    break;
                case 28:
                    ((d = 'MPEG-4 Audio Descriptor'), (f = Zi(l, c)));
                    break;
                case 29:
                    ((d = 'IOD Descriptor'), (f = xr(l, c)));
                    break;
                case 30:
                    ((d = 'SL Descriptor'), (f = yr(l, c)));
                    break;
                case 31:
                    ((d = 'FMC Descriptor'), (f = Sr(l, c)));
                    break;
                case 32:
                    ((d = 'External ES_ID Descriptor'), (f = zr(l, c)));
                    break;
                case 33:
                    ((d = 'MuxCode Descriptor'), (f = Vr(l, c)));
                    break;
                case 34:
                    ((d = 'FmxBufferSize Descriptor'), (f = Or(l, c)));
                    break;
                case 35:
                    ((d = 'MultiplexBuffer Descriptor'), (f = vr(l, c)));
                    break;
                case 36:
                    ((d = 'Content Labeling Descriptor'), (f = Ur(l, c)));
                    break;
                case 37:
                    ((d = 'Metadata Pointer Descriptor'), (f = Mr(l, c)));
                    break;
                case 38:
                    ((d = 'Metadata Descriptor'), (f = Rr(l, c)));
                    break;
                case 39:
                    ((d = 'Metadata STD Descriptor'), (f = Lr(l, c)));
                    break;
                case 40:
                    ((d = 'AVC Video Descriptor'), (f = tr(l, c)));
                    break;
                case 41:
                    ((d = 'IPMP Descriptor'), (f = $r(l, c)));
                    break;
                case 42:
                    ((d = 'AVC Timing and HRD Descriptor'), (f = kr(l, c)));
                    break;
                case 43:
                    ((d = 'MPEG-2 AAC Audio Descriptor'), (f = wr(l, c)));
                    break;
                case 44:
                    ((d = 'FlexMuxTiming Descriptor'), (f = Ir(l, c)));
                    break;
                case 45:
                    ((d = 'MPEG-4 Text Descriptor'), (f = er(l, c)));
                    break;
                case 46:
                    ((d = 'MPEG-4 Audio Extension Descriptor'), (f = Nr(l, c)));
                    break;
                case 47:
                    ((d = 'Auxiliary Video Stream Descriptor'), (f = Br(l, c)));
                    break;
                case 48:
                    ((d = 'SVC Extension Descriptor'), (f = br(l, c)));
                    break;
                case 49:
                    ((d = 'MVC Extension Descriptor'), (f = Tr(l, c)));
                    break;
                case 50:
                    ((d = 'J2K Video Descriptor'), (f = Ar(l, c)));
                    break;
                case 51:
                    ((d = 'MVC Operation Point Descriptor'), (f = Fr(l, c)));
                    break;
                case 52:
                    ((d = 'MPEG-2 Stereoscopic Video Format Descriptor'),
                        (f = Cr(l, c)));
                    break;
                case 53:
                    ((d = 'Stereoscopic Program Info Descriptor'),
                        (f = Er(l, c)));
                    break;
                case 54:
                    ((d = 'Stereoscopic Video Info Descriptor'),
                        (f = Pr(l, c)));
                    break;
                case 55:
                    ((d = 'Transport Profile Descriptor'), (f = Dr(l, c)));
                    break;
                case 56:
                    ((d = 'HEVC Video Descriptor'), (f = nr(l, c)));
                    break;
                case 99: {
                    ({ name: d, details: f } = _r(l, c));
                    break;
                }
                default:
                    f = { data: { value: `${s} bytes`, offset: c, length: s } };
                    break;
            }
            (i.push({ tag: o, length: s, name: d, details: f }), (r += 2 + s));
        }
        return i;
    }
    function Hr(e, t) {
        let n = e.getUint16(0) & 8191,
            i = e.getUint16(2) & 4095,
            r = new DataView(e.buffer, e.byteOffset + 4, i),
            a = Q(r, t + 4),
            o = [],
            s = 4 + i;
        for (; s < e.byteLength && !(s + 5 > e.byteLength); ) {
            let l = e.getUint8(s),
                c = e.getUint16(s + 1) & 8191,
                f = e.getUint16(s + 3) & 4095,
                d = new DataView(e.buffer, e.byteOffset + s + 5, f),
                p = Q(d, t + s + 5);
            (o.push({
                stream_type: {
                    value: `0x${l.toString(16).padStart(2, '0')}`,
                    offset: t + s,
                    length: 1,
                },
                elementary_PID: { value: c, offset: t + s + 1, length: 1.625 },
                es_info_length: { value: f, offset: t + s + 3, length: 1.5 },
                es_descriptors: p,
            }),
                (s += 5 + f));
        }
        return {
            type: 'PMT',
            pcr_pid: { value: n, offset: t, length: 1.625 },
            program_descriptors: a,
            streams: o,
        };
    }
    var Xr = {
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
    function Gr(e, t) {
        return { type: 'CAT', descriptors: Q(e, t) };
    }
    var jr = {
        CAT: {
            text: 'Conditional Access Table. Provides information on CA systems used in the multiplex.',
            ref: 'Clause 2.4.4.7',
        },
    };
    function Wr(e, t) {
        return { type: 'TSDT', descriptors: Q(e, t) };
    }
    var Kr = {
        TSDT: {
            text: 'Transport Stream Description Table. Contains descriptors that apply to the entire transport stream.',
            ref: 'Clause 2.4.4.13',
        },
    };
    function qr(e, t, n, i) {
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
            a = e.getUint8(2),
            o = (a >> 1) & 31,
            s = a & 1,
            l = e.getUint8(3),
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
            version_number: { value: o, offset: t + 2, length: 0.625 },
            current_next_indicator: { value: s, offset: t + 2, length: 0.125 },
            section_number: { value: l, offset: t + 3, length: 1 },
            last_section_number: { value: c, offset: t + 4, length: 1 },
            private_data: p,
        };
    }
    var Yr = {
        'Private Section': {
            text: 'A section containing user-defined private data. The structure and meaning of this data is not defined by the MPEG-2 specification.',
            ref: 'Clause 2.4.4.11',
        },
    };
    function Qr(e, t) {
        return {
            type: 'IPMP-CIT',
            info: {
                value: 'IPMP Control Information Table present.',
                offset: t,
                length: e.byteLength,
            },
        };
    }
    var Jr = {
        'IPMP-CIT': {
            text: 'IPMP Control Information Table. Contains information for Intellectual Property Management and Protection systems.',
            ref: 'Clause 2.4.4.1, ISO/IEC 13818-11',
        },
    };
    function bs(e) {
        let t = e.getUint8(0),
            n = e.getUint8(1),
            i = e.getUint8(2),
            r = e.getUint8(3),
            a = e.getUint8(4),
            o = e.getUint8(5),
            s = BigInt(t & 56) >> 3n,
            l =
                (BigInt(t & 3) << 13n) |
                (BigInt(n) << 5n) |
                (BigInt(i >> 3) & 0x1fn),
            c =
                (BigInt(i & 3) << 13n) |
                (BigInt(r) << 5n) |
                (BigInt(a >> 3) & 0x1fn),
            f = (s << 30n) | (l << 15n) | c,
            d = ((BigInt(a) & 0x03n) << 7n) | BigInt(o >> 1);
        return f * 300n + d;
    }
    function Zr(e, t) {
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
            value: bs(r).toString(),
            offset: t + i,
            length: 6,
        }),
            (i += 6));
        let a =
            (e.getUint8(i) << 14) |
            (e.getUint8(i + 1) << 6) |
            (e.getUint8(i + 2) >> 2);
        ((n.program_mux_rate = { value: a, offset: t + i, length: 3 }),
            (i += 3));
        let o = e.getUint8(i - 1) & 7;
        return (
            (n.pack_stuffing_length = {
                value: o,
                offset: t + i - 1,
                length: 0.375,
            }),
            o > 0 &&
                (n.stuffing_bytes = {
                    value: `${o} bytes`,
                    offset: t + i,
                    length: o,
                }),
            n
        );
    }
    function xe(e, t) {
        let n = e.getUint8(t),
            i = e.getUint8(t + 1),
            r = e.getUint8(t + 2),
            a = e.getUint8(t + 3),
            o = e.getUint8(t + 4),
            s = BigInt((n & 14) >> 1),
            l = BigInt((i << 7) | (r >> 1)),
            c = BigInt((a << 7) | (o >> 1));
        return (s << 30n) | (l << 15n) | c;
    }
    function Ts(e, t) {
        let n = e.getUint8(t),
            i = e.getUint8(t + 1),
            r = e.getUint8(t + 2),
            a = e.getUint8(t + 3),
            o = e.getUint8(t + 4),
            s = e.getUint8(t + 5),
            l = BigInt(n & 56) >> 3n,
            c =
                (BigInt(n & 3) << 13n) |
                (BigInt(i) << 5n) |
                (BigInt(r >> 3) & 0x1fn),
            f =
                (BigInt(r & 3) << 13n) |
                (BigInt(a) << 5n) |
                (BigInt(o >> 3) & 0x1fn),
            d = (l << 30n) | (c << 15n) | f,
            p = ((BigInt(o) & 0x03n) << 7n) | BigInt(s >> 1);
        return d * 300n + p;
    }
    function ea(e, t) {
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
        let o = e.getUint8(6),
            s = e.getUint8(7),
            l = e.getUint8(8),
            c = 9 + l,
            f = 9 + l;
        ((r.marker_bits_2 = {
            value: (o >> 6) & 3,
            offset: t + 6,
            length: 0.25,
        }),
            (r.scrambling_control = {
                value: (o >> 4) & 3,
                offset: t + 6,
                length: 0.25,
            }),
            (r.priority = {
                value: (o >> 3) & 1,
                offset: t + 6,
                length: 0.125,
            }),
            (r.data_alignment_indicator = {
                value: (o >> 2) & 1,
                offset: t + 6,
                length: 0.125,
            }),
            (r.copyright = {
                value: (o >> 1) & 1,
                offset: t + 6,
                length: 0.125,
            }),
            (r.original_or_copy = {
                value: o & 1,
                offset: t + 6,
                length: 0.125,
            }));
        let d = (s >> 6) & 3,
            p = (s >> 5) & 1,
            m = (s >> 4) & 1,
            _ = (s >> 3) & 1,
            x = (s >> 2) & 1,
            y = (s >> 1) & 1,
            b = s & 1;
        ((r.pts_dts_flags = { value: d, offset: t + 7, length: 0.25 }),
            (r.escr_flag = { value: p, offset: t + 7, length: 0.125 }),
            (r.es_rate_flag = { value: m, offset: t + 7, length: 0.125 }),
            (r.dsm_trick_mode_flag = {
                value: _,
                offset: t + 7,
                length: 0.125,
            }),
            (r.additional_copy_info_flag = {
                value: x,
                offset: t + 7,
                length: 0.125,
            }),
            (r.pes_crc_flag = { value: y, offset: t + 7, length: 0.125 }),
            (r.pes_extension_flag = { value: b, offset: t + 7, length: 0.125 }),
            (r.pes_header_data_length = {
                value: l,
                offset: t + 8,
                length: 1,
            }));
        let g = 9;
        if (
            (d === 2 && g + 5 <= f
                ? ((r.pts = {
                      value: xe(e, g).toString(),
                      offset: t + g,
                      length: 5,
                  }),
                  (g += 5))
                : d === 3 &&
                  g + 10 <= f &&
                  ((r.pts = {
                      value: xe(e, g).toString(),
                      offset: t + g,
                      length: 5,
                  }),
                  (r.dts = {
                      value: xe(e, g + 5).toString(),
                      offset: t + g + 5,
                      length: 5,
                  }),
                  (g += 10)),
            p &&
                g + 6 <= f &&
                ((r.ESCR = {
                    value: Ts(e, g).toString(),
                    offset: t + g,
                    length: 6,
                }),
                (g += 6)),
            m && g + 3 <= f)
        ) {
            let S = e.getUint32(g - 1);
            ((r.ES_rate = {
                value: (S >> 1) & 4194303,
                offset: t + g,
                length: 3,
            }),
                (g += 3));
        }
        if (_ && g + 1 <= f) {
            let S = e.getUint8(g),
                T = (S >> 5) & 7;
            switch (
                ((r.trick_mode_control = {
                    value: T,
                    offset: t + g,
                    length: 0.375,
                }),
                T)
            ) {
                case 0:
                case 3:
                    ((r.field_id = {
                        value: (S >> 3) & 3,
                        offset: t + g,
                        length: 0.25,
                    }),
                        (r.intra_slice_refresh = {
                            value: (S >> 2) & 1,
                            offset: t + g,
                            length: 0.125,
                        }),
                        (r.frequency_truncation = {
                            value: S & 3,
                            offset: t + g,
                            length: 0.25,
                        }));
                    break;
                case 1:
                case 4:
                    r.rep_cntrl = {
                        value: S & 31,
                        offset: t + g,
                        length: 0.625,
                    };
                    break;
                case 2:
                    r.field_id = {
                        value: (S >> 3) & 3,
                        offset: t + g,
                        length: 0.25,
                    };
                    break;
            }
            g += 1;
        }
        if (
            (x &&
                g + 1 <= f &&
                ((r.additional_copy_info = {
                    value: e.getUint8(g) & 127,
                    offset: t + g,
                    length: 1,
                }),
                (g += 1)),
            y &&
                g + 2 <= f &&
                ((r.previous_PES_packet_CRC = {
                    value: e.getUint16(g),
                    offset: t + g,
                    length: 2,
                }),
                (g += 2)),
            b && g + 1 <= f)
        ) {
            let S = e.getUint8(g),
                T = (S >> 7) & 1,
                I = (S >> 6) & 1,
                C = (S >> 5) & 1,
                D = (S >> 4) & 1,
                M = S & 1;
            if (
                ((r.PES_private_data_flag = {
                    value: T,
                    offset: t + g,
                    length: 0.125,
                }),
                (r.pack_header_field_flag = {
                    value: I,
                    offset: t + g,
                    length: 0.125,
                }),
                (r.program_packet_sequence_counter_flag = {
                    value: C,
                    offset: t + g,
                    length: 0.125,
                }),
                (r.P_STD_buffer_flag = {
                    value: D,
                    offset: t + g,
                    length: 0.125,
                }),
                (r.PES_extension_flag_2 = {
                    value: M,
                    offset: t + g,
                    length: 0.125,
                }),
                (g += 1),
                T &&
                    g + 16 <= f &&
                    ((r.PES_private_data = {
                        value: '128 bits of private data',
                        offset: t + g,
                        length: 16,
                    }),
                    (g += 16)),
                I && g + 1 <= f)
            ) {
                let A = e.getUint8(g);
                if (
                    ((r.pack_field_length = {
                        value: A,
                        offset: t + g,
                        length: 1,
                    }),
                    (g += 1),
                    g + A <= f)
                ) {
                    let L = new DataView(e.buffer, e.byteOffset + g, A);
                    ((r.pack_header = Zr(L, t + g)), (g += A));
                }
            }
            if (C && g + 2 <= f) {
                let A = e.getUint8(g),
                    L = e.getUint8(g + 1);
                ((r.program_packet_sequence_counter = {
                    value: A & 127,
                    offset: t + g,
                    length: 1,
                }),
                    (r.MPEG1_MPEG2_identifier = {
                        value: (L >> 6) & 1,
                        offset: t + g + 1,
                        length: 0.125,
                    }),
                    (r.original_stuff_length = {
                        value: L & 63,
                        offset: t + g + 1,
                        length: 0.75,
                    }),
                    (g += 2));
            }
            if (D && g + 2 <= f) {
                let A = e.getUint16(g);
                ((r.P_STD_buffer_scale = {
                    value: (A >> 13) & 1,
                    offset: t + g,
                    length: 0.125,
                }),
                    (r.P_STD_buffer_size = {
                        value: A & 8191,
                        offset: t + g,
                        length: 1.625,
                    }),
                    (g += 2));
            }
            if (M && g + 1 <= f) {
                let A = e.getUint8(g) & 127;
                if (g + 1 + A <= f) {
                    let L = e.getUint8(g + 1),
                        ie = (L >> 7) & 1;
                    if (
                        ((r.PES_extension_field_length = {
                            value: A,
                            offset: t + g,
                            length: 1,
                        }),
                        (r.stream_id_extension_flag = {
                            value: ie,
                            offset: t + g + 1,
                            length: 0.125,
                        }),
                        ie === 0)
                    )
                        r.stream_id_extension = {
                            value: L & 127,
                            offset: t + g + 1,
                            length: 0.875,
                        };
                    else {
                        let F = L & 1;
                        ((r.tref_extension_flag = {
                            value: F,
                            offset: t + g + 1,
                            length: 0.125,
                        }),
                            F === 0 &&
                                (r.TREF = {
                                    value: xe(e, g + 2).toString(),
                                    offset: t + g + 2,
                                    length: 5,
                                }));
                    }
                    g += 1 + A;
                }
            }
        }
        return { header: r, payloadOffset: c };
    }
    var ta = {
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
    function Is(e, t) {
        let n = e.getUint8(t),
            i = e.getUint8(t + 1),
            r = e.getUint8(t + 2),
            a = e.getUint8(t + 3),
            o = e.getUint8(t + 4),
            s = BigInt((n & 14) >> 1),
            l = BigInt((i << 7) | (r >> 1)),
            c = BigInt((a << 7) | (o >> 1));
        return (s << 30n) | (l << 15n) | c;
    }
    function ye(e, t, n) {
        let r = t.getUint8(0) & 1;
        return (
            (e.infinite_time_flag = { value: r, offset: n, length: 0.125 }),
            r === 0
                ? t.byteLength < 6
                    ? 1
                    : ((e.PTS = {
                          value: Is(t, 1).toString(),
                          offset: n + 1,
                          length: 5,
                      }),
                      6)
                : 1
        );
    }
    function na(e, t) {
        if (e.byteLength < 1)
            return { type: 'DSM-CC', error: 'Payload too short.' };
        let n = e.getUint8(0),
            i = { command_id: { value: n, offset: t, length: 1 } },
            r = 1;
        if (n === 1) {
            if (e.byteLength < 3) return { type: 'DSM-CC Control', ...i };
            let a = e.getUint16(1),
                o = (a >> 15) & 1,
                s = (a >> 14) & 1,
                l = (a >> 13) & 1;
            if (
                ((i.select_flag = { value: o, offset: t + 1, length: 0.125 }),
                (i.retrieval_flag = { value: s, offset: t + 1, length: 0.125 }),
                (i.storage_flag = { value: l, offset: t + 1, length: 0.125 }),
                (r = 3),
                o)
            ) {
                if (e.byteLength < r + 5)
                    return { type: 'DSM-CC Control', ...i };
                let c = e.getUint16(r),
                    f = e.getUint16(r + 2),
                    d = e.getUint8(r + 4),
                    p = c >> 1,
                    m = ((c & 1) << 14) | (f >> 2),
                    _ = f & 3,
                    x = (BigInt(p) << 17n) | (BigInt(m) << 2n) | BigInt(_);
                ((i.bitstream_id = {
                    value: x.toString(),
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
            if (s) {
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
                        (r += ye(
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
                        (r += ye(
                            i,
                            new DataView(e.buffer, e.byteOffset + r),
                            t + r
                        )));
                }
            }
            if (l) {
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
                        (r += ye(
                            i,
                            new DataView(e.buffer, e.byteOffset + r),
                            t + r
                        )));
            }
            return { type: 'DSM-CC Control', ...i };
        } else if (n === 2) {
            if (e.byteLength < 3) return { type: 'DSM-CC Ack', ...i };
            let a = e.getUint16(1),
                o = (a >> 14) & 1,
                s = (a >> 13) & 1,
                l = (a >> 0) & 1;
            return (
                (i.select_ack = {
                    value: (a >> 15) & 1,
                    offset: t + 1,
                    length: 0.125,
                }),
                (i.retrieval_ack = { value: o, offset: t + 1, length: 0.125 }),
                (i.storage_ack = { value: s, offset: t + 1, length: 0.125 }),
                (i.error_ack = {
                    value: (a >> 12) & 1,
                    offset: t + 1,
                    length: 0.125,
                }),
                (i.cmd_status = { value: l, offset: t + 2, length: 0.125 }),
                (r = 3),
                l === 1 &&
                    (o || s) &&
                    ye(i, new DataView(e.buffer, e.byteOffset + r), t + r),
                { type: 'DSM-CC Ack', ...i }
            );
        }
        return { type: 'DSM-CC Unknown', ...i };
    }
    var ia = {
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
    var z = 188,
        ra = 71,
        vs = {
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
    function aa(e) {
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
        for (let a = 0; a + z <= e.byteLength; a += z) {
            if (i.getUint8(a) !== ra) continue;
            let o = we(new DataView(e, a, 4), a);
            if (o.pid.value === 0 && o.payload_unit_start_indicator.value) {
                let s =
                        o.adaptation_field_control.value & 2
                            ? i.getUint8(a + 4) + 1
                            : 0,
                    l = a + 4 + s;
                if (l >= a + z) continue;
                let c = i.getUint8(l),
                    f = l + 1 + c;
                if (f >= a + z) continue;
                let d = new DataView(e, f, a + z - f),
                    { header: p } = Y(d);
                if (p.table_id === '0x00' && !p.error) {
                    let m = new DataView(e, f + 8),
                        _ = f + 8;
                    Ne(m, _).programs.forEach((y) => {
                        if (y.type === 'program') {
                            let b = y.program_map_PID.value;
                            (n.pmtPids.add(b),
                                n.programMap[b] ||
                                    (n.programMap[b] = {
                                        programNumber: y.program_number.value,
                                        streams: {},
                                    }));
                        }
                    });
                }
            }
        }
        for (let a = 0; a + z <= e.byteLength; a += z) {
            if (i.getUint8(a) !== ra) continue;
            n.totalPackets++;
            let o = new DataView(e, a, z),
                s = we(o, a),
                l = s.pid.value,
                c = {
                    offset: a,
                    pid: l,
                    header: s,
                    adaptationField: null,
                    payloadType: 'Data',
                    pes: null,
                    psi: null,
                    fieldOffsets: { header: { offset: a, length: 4 } },
                };
            l !== 8191 &&
                (n.continuityCounters[l] || (n.continuityCounters[l] = []),
                n.continuityCounters[l].push({
                    cc: s.continuity_counter.value,
                    offset: a,
                    hasPayload: (s.adaptation_field_control.value & 1) !== 0,
                }));
            let f = 4;
            if (s.adaptation_field_control.value & 2) {
                let d = i.getUint8(a + f),
                    p = new DataView(e, a + f, d + 1);
                ((c.adaptationField = Mi(p, a + f)),
                    (c.fieldOffsets.adaptationField = {
                        offset: a + f,
                        length: d + 1,
                    }),
                    c.adaptationField.pcr &&
                        n.pcrList.push({
                            pcr: BigInt(c.adaptationField.pcr.value),
                            offset: a,
                        }),
                    (f += d + 1));
            }
            if (s.adaptation_field_control.value & 1 && f < z) {
                let d = f;
                if (s.payload_unit_start_indicator.value) {
                    let m = i.getUint8(a + f);
                    ((c.fieldOffsets.pointerField = {
                        offset: a + f,
                        length: m + 1,
                    }),
                        (d += m + 1));
                }
                if (d >= z) {
                    t.push(c);
                    continue;
                }
                let p = new DataView(e, a + d, z - d);
                if (l === 0 && s.payload_unit_start_indicator.value) {
                    let { header: m, payload: _, isValid: x, crc: y } = Y(p),
                        b = Ne(_, a + d + (m.section_syntax_indicator ? 8 : 3));
                    ((b.isValid = x),
                        (b.header = m),
                        (b.crc = y),
                        (c.psi = b),
                        (c.payloadType = 'PSI (PAT)'));
                } else if (l === 1 && s.payload_unit_start_indicator.value) {
                    let { header: m, payload: _, isValid: x, crc: y } = Y(p),
                        b = Gr(_, a + d + (m.section_syntax_indicator ? 8 : 3));
                    ((b.isValid = x),
                        (b.header = m),
                        (b.crc = y),
                        (c.psi = b),
                        (c.payloadType = 'PSI (CAT)'));
                } else if (l === 2 && s.payload_unit_start_indicator.value) {
                    let { header: m, payload: _, isValid: x, crc: y } = Y(p),
                        b = Wr(_, a + d + (m.section_syntax_indicator ? 8 : 3));
                    ((b.isValid = x),
                        (b.header = m),
                        (b.crc = y),
                        (c.psi = b),
                        (c.payloadType = 'PSI (TSDT)'),
                        (n.tsdt = b));
                } else if (l === 3 && s.payload_unit_start_indicator.value) {
                    let { header: m, payload: _, isValid: x, crc: y } = Y(p),
                        b = Qr(_, a + d + (m.section_syntax_indicator ? 8 : 3));
                    ((b.isValid = x),
                        (b.header = m),
                        (b.crc = y),
                        (c.psi = b),
                        (c.payloadType = 'PSI (IPMP-CIT)'),
                        (n.ipmp = b));
                } else if (
                    (n.pmtPids.has(l) || n.privateSectionPids.has(l)) &&
                    s.payload_unit_start_indicator.value
                ) {
                    let { header: m, payload: _, isValid: x, crc: y } = Y(p),
                        b = parseInt(m.table_id, 16);
                    if (b === 2) {
                        let g = Hr(
                            _,
                            a + d + (m.section_syntax_indicator ? 8 : 3)
                        );
                        ((g.programNumber = m.table_id_extension),
                            (g.isValid = x),
                            (g.header = m),
                            (g.crc = y),
                            (c.psi = g),
                            (c.payloadType = 'PSI (PMT)'),
                            n.programMap[l] &&
                                ((n.programMap[l].programNumber =
                                    g.programNumber),
                                (n.pcrPid = g.pcr_pid.value),
                                g.streams.forEach((S) => {
                                    let T = parseInt(S.stream_type.value, 16),
                                        I =
                                            vs[T] ||
                                            `Unknown (${S.stream_type.value})`;
                                    ((n.programMap[l].streams[
                                        S.elementary_PID.value
                                    ] = I),
                                        T === 5 &&
                                            n.privateSectionPids.add(
                                                S.elementary_PID.value
                                            ),
                                        T === 8 &&
                                            n.dsmccPids.add(
                                                S.elementary_PID.value
                                            ));
                                })));
                    } else if (b >= 64 && b <= 254) {
                        let g = qr(
                            _,
                            a + d + 3,
                            m.section_syntax_indicator,
                            m.section_length
                        );
                        ((g.isValid = x),
                            (g.header = m),
                            (g.crc = y),
                            (c.psi = g),
                            (c.payloadType = 'PSI (Private Section)'));
                    }
                } else if (
                    s.payload_unit_start_indicator.value &&
                    p.byteLength >= 6 &&
                    p.getUint32(0) >>> 8 === 1
                ) {
                    c.payloadType = 'PES';
                    let m = ea(p, a + f);
                    if (m) {
                        c.pes = m.header;
                        let _ = m.payloadOffset;
                        if (
                            ((c.fieldOffsets.pesHeader = {
                                offset: a + f,
                                length: _,
                            }),
                            parseInt(c.pes.stream_id.value, 16) === 242)
                        ) {
                            c.payloadType = 'PES (DSM-CC)';
                            let y = f + _;
                            if (a + y < a + z) {
                                let b = new DataView(e, a + y, a + z - (a + y));
                                c.pes.payload = na(b, a + y);
                            }
                        }
                    }
                }
            }
            t.push(c);
        }
        let r = {};
        return (
            Object.values(n.programMap).forEach((a) => {
                Object.entries(a.streams).forEach(([o, s]) => {
                    r[o] = s;
                });
            }),
            t.forEach((a) => {
                r[a.pid] && a.payloadType === 'Data'
                    ? (a.payloadType = r[a.pid])
                    : a.pid === 8191 && (a.payloadType = 'Null Packet');
            }),
            { format: 'ts', data: { summary: n, packets: t } }
        );
    }
    var sa = {
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
    var Cs = {
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
        Es = {
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
        Ps = {
            ...Cs,
            ...sa,
            ...Es,
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
        Ds = {
            ...Ri,
            ...jr,
            ...Ps,
            ...ia,
            ...Jr,
            ...Li,
            ...Xr,
            ...ta,
            ...Yr,
            ...Kr,
        };
    function oa(e) {
        try {
            return aa(e);
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
    Be();
    var w = (e) => {
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
    G();
    var fa = (e) =>
            !e || isNaN(e)
                ? 'N/A'
                : e >= 1e6
                  ? `${(e / 1e6).toFixed(2)} Mbps`
                  : `${(e / 1e3).toFixed(0)} kbps`,
        Us = (e) => {
            if (!e) return 'unknown';
            if (E(e, 'SegmentList').length > 0) return 'SegmentList';
            let t = E(e, 'SegmentTemplate')[0];
            return t
                ? E(t, 'SegmentTimeline').length > 0
                    ? 'SegmentTemplate with SegmentTimeline'
                    : t[':@']?.media?.includes('$Number$')
                      ? 'SegmentTemplate with $Number$'
                      : t[':@']?.media?.includes('$Time$')
                        ? 'SegmentTemplate with $Time$'
                        : 'SegmentTemplate'
                : E(e, 'SegmentBase').length > 0
                  ? 'SegmentBase'
                  : 'BaseURL / Single Segment';
        };
    function ca(e, t) {
        let n = [],
            i = [],
            r = [],
            a = new Set(),
            o = new Set();
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
                    (a.add(p.system), p.defaultKid && o.add(p.defaultKid));
            }
        let s = E(t, 'ServiceDescription')[0],
            l = s ? E(s, 'Latency')[0] : null;
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
                segmenting: Us(t),
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
                isLowLatency: !!l,
                targetLatency: l ? parseInt(l[':@']?.target, 10) : null,
                minLatency: l ? parseInt(l[':@']?.min, 10) : null,
                maxLatency: l ? parseInt(l[':@']?.max, 10) : null,
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
                            ? `${fa(Math.min(...d))} - ${fa(Math.max(...d))}`
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
                isEncrypted: a.size > 0,
                systems: Array.from(a),
                kids: Array.from(o),
            },
        };
    }
    G();
    var j = (e) => e?.['#text'] || null;
    function Ve(e) {
        if (e === null || typeof e != 'object') return e;
        if (e instanceof Date) return new Date(e.getTime());
        if (Array.isArray(e)) return e.map((t) => Ve(t));
        if (e instanceof Object) {
            let t = {};
            for (let n in e)
                Object.prototype.hasOwnProperty.call(e, n) && (t[n] = Ve(e[n]));
            return t;
        }
        throw new Error("Unable to copy obj! Its type isn't supported.");
    }
    var H = (e) => ({
        schemeIdUri: u(e, 'schemeIdUri'),
        value: u(e, 'value'),
        id: u(e, 'id'),
    });
    function Ms(e, t) {
        let n = re(t, e);
        return {
            level: u(e, 'level') ? parseInt(u(e, 'level'), 10) : null,
            dependencyLevel: u(e, 'dependencyLevel'),
            bandwidth: u(e, 'bandwidth')
                ? parseInt(u(e, 'bandwidth'), 10)
                : null,
            contentComponent: u(e, 'contentComponent')?.split(' '),
            codecs: u(n, 'codecs'),
            mimeType: u(n, 'mimeType'),
            profiles: u(n, 'profiles'),
            width: u(n, 'width') ? parseInt(u(n, 'width'), 10) : null,
            height: u(n, 'height') ? parseInt(u(n, 'height'), 10) : null,
            serializedManifest: e,
        };
    }
    function Rs(e, t) {
        let n = re(t, e);
        return {
            id: u(e, 'id'),
            bandwidth: parseInt(u(e, 'bandwidth'), 10),
            qualityRanking: u(e, 'qualityRanking')
                ? parseInt(u(e, 'qualityRanking'), 10)
                : null,
            dependencyId: u(e, 'dependencyId'),
            associationId: u(e, 'associationId'),
            associationType: u(e, 'associationType'),
            codecs: u(n, 'codecs'),
            mimeType: u(n, 'mimeType'),
            profiles: u(n, 'profiles'),
            width: u(n, 'width') ? parseInt(u(n, 'width'), 10) : null,
            height: u(n, 'height') ? parseInt(u(n, 'height'), 10) : null,
            frameRate: u(n, 'frameRate'),
            sar: u(n, 'sar'),
            scanType: u(n, 'scanType'),
            segmentProfiles: u(n, 'segmentProfiles'),
            mediaStreamStructureId: u(n, 'mediaStreamStructureId'),
            maximumSAPPeriod: u(n, 'maximumSAPPeriod')
                ? parseFloat(u(n, 'maximumSAPPeriod'))
                : null,
            startWithSAP: u(n, 'startWithSAP')
                ? parseInt(u(n, 'startWithSAP'), 10)
                : null,
            maxPlayoutRate: u(n, 'maxPlayoutRate')
                ? parseFloat(u(n, 'maxPlayoutRate'))
                : null,
            codingDependency:
                u(n, 'codingDependency') === 'true'
                    ? !0
                    : u(n, 'codingDependency') === 'false'
                      ? !1
                      : null,
            selectionPriority: u(n, 'selectionPriority')
                ? parseInt(u(n, 'selectionPriority'), 10)
                : 0,
            tag: u(n, 'tag'),
            eptDelta: null,
            pdDelta: null,
            representationIndex: null,
            failoverContent: null,
            audioChannelConfigurations: v(n, 'AudioChannelConfiguration').map(
                (r) => ({
                    schemeIdUri: u(r, 'schemeIdUri'),
                    value: u(r, 'value'),
                })
            ),
            framePackings: v(n, 'FramePacking').map(H),
            ratings: v(n, 'Rating').map(H),
            viewpoints: v(n, 'Viewpoint').map(H),
            accessibility: v(n, 'Accessibility').map(H),
            labels: v(n, 'Label').map((r) => ({
                id: u(r, 'id'),
                lang: u(r, 'lang'),
                text: j(r),
            })),
            groupLabels: v(n, 'GroupLabel').map((r) => ({
                id: u(r, 'id'),
                lang: u(r, 'lang'),
                text: j(r),
            })),
            subRepresentations: v(e, 'SubRepresentation').map((r) => Ms(r, n)),
            videoRange: void 0,
            serializedManifest: e,
        };
    }
    function Ls(e, t) {
        let n = re(t, e);
        return {
            id: u(e, 'id'),
            group: u(e, 'group') ? parseInt(u(e, 'group'), 10) : null,
            lang: u(e, 'lang'),
            contentType: u(e, 'contentType') || u(e, 'mimeType')?.split('/')[0],
            bitstreamSwitching:
                u(e, 'bitstreamSwitching') === 'true' ? !0 : null,
            maxWidth: u(e, 'maxWidth') ? parseInt(u(e, 'maxWidth'), 10) : null,
            maxHeight: u(e, 'maxHeight')
                ? parseInt(u(e, 'maxHeight'), 10)
                : null,
            maxFrameRate: u(e, 'maxFrameRate'),
            mimeType: u(n, 'mimeType'),
            profiles: u(n, 'profiles'),
            representations: v(e, 'Representation').map((r) => Rs(r, n)),
            contentProtection: v(n, 'ContentProtection').map((r) => ({
                schemeIdUri: u(r, 'schemeIdUri'),
                system: Se(u(r, 'schemeIdUri')),
                defaultKid: u(r, 'cenc:default_KID'),
            })),
            framePackings: v(n, 'FramePacking').map(H),
            ratings: v(n, 'Rating').map(H),
            viewpoints: v(n, 'Viewpoint').map(H),
            accessibility: v(n, 'Accessibility').map(H),
            labels: v(n, 'Label').map((r) => ({
                id: u(r, 'id'),
                lang: u(r, 'lang'),
                text: j(r),
            })),
            groupLabels: v(n, 'GroupLabel').map((r) => ({
                id: u(r, 'id'),
                lang: u(r, 'lang'),
                text: j(r),
            })),
            roles: v(n, 'Role').map(H),
            serializedManifest: e,
        };
    }
    function ws(e, t) {
        let n = re(t, e),
            i = k(e, 'AssetIdentifier'),
            r = v(e, 'Subset');
        return {
            id: u(e, 'id'),
            start: w(u(e, 'start')),
            duration: w(u(e, 'duration')),
            bitstreamSwitching: u(e, 'bitstreamSwitching') === 'true',
            assetIdentifier: i
                ? { schemeIdUri: u(i, 'schemeIdUri'), value: u(i, 'value') }
                : null,
            subsets: r.map((o) => ({
                contains: (u(o, 'contains') || '').split(' '),
                id: u(o, 'id'),
            })),
            adaptationSets: v(e, 'AdaptationSet').map((o) => Ls(o, n)),
            eventStreams: [],
            events: [],
            serializedManifest: e,
        };
    }
    function da(e, t) {
        let n = Ve(e),
            r = E(n, 'AdaptationSet').some(
                (s) => u(s, 'mimeType') === 'video/mp2t'
            ),
            a = 'unknown';
        r
            ? (a = 'ts')
            : (E(n, 'SegmentTimeline').length > 0 ||
                  E(n, 'SegmentTemplate').length > 0 ||
                  E(n, 'SegmentList').length > 0) &&
              (a = 'isobmff');
        let o = {
            id: u(n, 'id'),
            type: u(n, 'type'),
            profiles: u(n, 'profiles'),
            minBufferTime: w(u(n, 'minBufferTime')),
            publishTime: u(n, 'publishTime')
                ? new Date(u(n, 'publishTime'))
                : null,
            availabilityStartTime: u(n, 'availabilityStartTime')
                ? new Date(u(n, 'availabilityStartTime'))
                : null,
            timeShiftBufferDepth: w(u(n, 'timeShiftBufferDepth')),
            minimumUpdatePeriod: w(u(n, 'minimumUpdatePeriod')),
            duration: w(u(n, 'mediaPresentationDuration')),
            maxSegmentDuration: w(u(n, 'maxSegmentDuration')),
            maxSubsegmentDuration: w(u(n, 'maxSubsegmentDuration')),
            programInformations: v(n, 'ProgramInformation').map((s) => ({
                title: j(k(s, 'Title')),
                source: j(k(s, 'Source')),
                copyright: j(k(s, 'Copyright')),
                lang: u(s, 'lang'),
                moreInformationURL: u(s, 'moreInformationURL'),
            })),
            locations: v(n, 'Location').map(j),
            periods: v(n, 'Period').map((s) => ws(s, n)),
            segmentFormat: a,
            serializedManifest: e,
            metrics: [],
            events: [],
            summary: null,
            serverControl: null,
        };
        return (
            (o.events = o.periods.flatMap((s) => s.events)),
            (o.summary = ca(o, n)),
            o
        );
    }
    var pa =
            ':A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD',
        Ns = pa + '\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040',
        Bs = '[' + pa + '][' + Ns + ']*',
        zs = new RegExp('^' + Bs + '$');
    function be(e, t) {
        let n = [],
            i = t.exec(e);
        for (; i; ) {
            let r = [];
            r.startIndex = t.lastIndex - i[0].length;
            let a = i.length;
            for (let o = 0; o < a; o++) r.push(i[o]);
            (n.push(r), (i = t.exec(e)));
        }
        return n;
    }
    var ue = function (e) {
        let t = zs.exec(e);
        return !(t === null || typeof t > 'u');
    };
    function ua(e) {
        return typeof e < 'u';
    }
    var Vs = { allowBooleanAttributes: !1, unpairedTags: [] };
    function xa(e, t) {
        t = Object.assign({}, Vs, t);
        let n = [],
            i = !1,
            r = !1;
        e[0] === '\uFEFF' && (e = e.substr(1));
        for (let a = 0; a < e.length; a++)
            if (e[a] === '<' && e[a + 1] === '?') {
                if (((a += 2), (a = ga(e, a)), a.err)) return a;
            } else if (e[a] === '<') {
                let o = a;
                if ((a++, e[a] === '!')) {
                    a = ha(e, a);
                    continue;
                } else {
                    let s = !1;
                    e[a] === '/' && ((s = !0), a++);
                    let l = '';
                    for (
                        ;
                        a < e.length &&
                        e[a] !== '>' &&
                        e[a] !== ' ' &&
                        e[a] !== '	' &&
                        e[a] !==
                            `
` &&
                        e[a] !== '\r';
                        a++
                    )
                        l += e[a];
                    if (
                        ((l = l.trim()),
                        l[l.length - 1] === '/' &&
                            ((l = l.substring(0, l.length - 1)), a--),
                        !Ws(l))
                    ) {
                        let d;
                        return (
                            l.trim().length === 0
                                ? (d = "Invalid space after '<'.")
                                : (d = "Tag '" + l + "' is an invalid name."),
                            U('InvalidTag', d, R(e, a))
                        );
                    }
                    let c = Fs(e, a);
                    if (c === !1)
                        return U(
                            'InvalidAttr',
                            "Attributes for '" + l + "' have open quote.",
                            R(e, a)
                        );
                    let f = c.value;
                    if (((a = c.index), f[f.length - 1] === '/')) {
                        let d = a - f.length;
                        f = f.substring(0, f.length - 1);
                        let p = _a(f, t);
                        if (p === !0) i = !0;
                        else
                            return U(
                                p.err.code,
                                p.err.msg,
                                R(e, d + p.err.line)
                            );
                    } else if (s)
                        if (c.tagClosed) {
                            if (f.trim().length > 0)
                                return U(
                                    'InvalidTag',
                                    "Closing tag '" +
                                        l +
                                        "' can't have attributes or invalid starting.",
                                    R(e, o)
                                );
                            if (n.length === 0)
                                return U(
                                    'InvalidTag',
                                    "Closing tag '" +
                                        l +
                                        "' has not been opened.",
                                    R(e, o)
                                );
                            {
                                let d = n.pop();
                                if (l !== d.tagName) {
                                    let p = R(e, d.tagStartPos);
                                    return U(
                                        'InvalidTag',
                                        "Expected closing tag '" +
                                            d.tagName +
                                            "' (opened in line " +
                                            p.line +
                                            ', col ' +
                                            p.col +
                                            ") instead of closing tag '" +
                                            l +
                                            "'.",
                                        R(e, o)
                                    );
                                }
                                n.length == 0 && (r = !0);
                            }
                        } else
                            return U(
                                'InvalidTag',
                                "Closing tag '" +
                                    l +
                                    "' doesn't have proper closing.",
                                R(e, a)
                            );
                    else {
                        let d = _a(f, t);
                        if (d !== !0)
                            return U(
                                d.err.code,
                                d.err.msg,
                                R(e, a - f.length + d.err.line)
                            );
                        if (r === !0)
                            return U(
                                'InvalidXml',
                                'Multiple possible root nodes found.',
                                R(e, a)
                            );
                        (t.unpairedTags.indexOf(l) !== -1 ||
                            n.push({ tagName: l, tagStartPos: o }),
                            (i = !0));
                    }
                    for (a++; a < e.length; a++)
                        if (e[a] === '<')
                            if (e[a + 1] === '!') {
                                (a++, (a = ha(e, a)));
                                continue;
                            } else if (e[a + 1] === '?') {
                                if (((a = ga(e, ++a)), a.err)) return a;
                            } else break;
                        else if (e[a] === '&') {
                            let d = Gs(e, a);
                            if (d == -1)
                                return U(
                                    'InvalidChar',
                                    "char '&' is not expected.",
                                    R(e, a)
                                );
                            a = d;
                        } else if (r === !0 && !ma(e[a]))
                            return U(
                                'InvalidXml',
                                'Extra text at the end',
                                R(e, a)
                            );
                    e[a] === '<' && a--;
                }
            } else {
                if (ma(e[a])) continue;
                return U(
                    'InvalidChar',
                    "char '" + e[a] + "' is not expected.",
                    R(e, a)
                );
            }
        if (i) {
            if (n.length == 1)
                return U(
                    'InvalidTag',
                    "Unclosed tag '" + n[0].tagName + "'.",
                    R(e, n[0].tagStartPos)
                );
            if (n.length > 0)
                return U(
                    'InvalidXml',
                    "Invalid '" +
                        JSON.stringify(
                            n.map((a) => a.tagName),
                            null,
                            4
                        ).replace(/\r?\n/g, '') +
                        "' found.",
                    { line: 1, col: 1 }
                );
        } else return U('InvalidXml', 'Start tag expected.', 1);
        return !0;
    }
    function ma(e) {
        return (
            e === ' ' ||
            e === '	' ||
            e ===
                `
` ||
            e === '\r'
        );
    }
    function ga(e, t) {
        let n = t;
        for (; t < e.length; t++)
            if (e[t] == '?' || e[t] == ' ') {
                let i = e.substr(n, t - n);
                if (t > 5 && i === 'xml')
                    return U(
                        'InvalidXml',
                        'XML declaration allowed only at the start of the document.',
                        R(e, t)
                    );
                if (e[t] == '?' && e[t + 1] == '>') {
                    t++;
                    break;
                } else continue;
            }
        return t;
    }
    function ha(e, t) {
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
    var Os = '"',
        $s = "'";
    function Fs(e, t) {
        let n = '',
            i = '',
            r = !1;
        for (; t < e.length; t++) {
            if (e[t] === Os || e[t] === $s)
                i === '' ? (i = e[t]) : i !== e[t] || (i = '');
            else if (e[t] === '>' && i === '') {
                r = !0;
                break;
            }
            n += e[t];
        }
        return i !== '' ? !1 : { value: n, index: t, tagClosed: r };
    }
    var Hs = new RegExp(
        `(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['"])(([\\s\\S])*?)\\5)?`,
        'g'
    );
    function _a(e, t) {
        let n = be(e, Hs),
            i = {};
        for (let r = 0; r < n.length; r++) {
            if (n[r][1].length === 0)
                return U(
                    'InvalidAttr',
                    "Attribute '" + n[r][2] + "' has no space in starting.",
                    me(n[r])
                );
            if (n[r][3] !== void 0 && n[r][4] === void 0)
                return U(
                    'InvalidAttr',
                    "Attribute '" + n[r][2] + "' is without value.",
                    me(n[r])
                );
            if (n[r][3] === void 0 && !t.allowBooleanAttributes)
                return U(
                    'InvalidAttr',
                    "boolean attribute '" + n[r][2] + "' is not allowed.",
                    me(n[r])
                );
            let a = n[r][2];
            if (!js(a))
                return U(
                    'InvalidAttr',
                    "Attribute '" + a + "' is an invalid name.",
                    me(n[r])
                );
            if (!i.hasOwnProperty(a)) i[a] = 1;
            else
                return U(
                    'InvalidAttr',
                    "Attribute '" + a + "' is repeated.",
                    me(n[r])
                );
        }
        return !0;
    }
    function Xs(e, t) {
        let n = /\d/;
        for (e[t] === 'x' && (t++, (n = /[\da-fA-F]/)); t < e.length; t++) {
            if (e[t] === ';') return t;
            if (!e[t].match(n)) break;
        }
        return -1;
    }
    function Gs(e, t) {
        if ((t++, e[t] === ';')) return -1;
        if (e[t] === '#') return (t++, Xs(e, t));
        let n = 0;
        for (; t < e.length; t++, n++)
            if (!(e[t].match(/\w/) && n < 20)) {
                if (e[t] === ';') break;
                return -1;
            }
        return t;
    }
    function U(e, t, n) {
        return { err: { code: e, msg: t, line: n.line || n, col: n.col } };
    }
    function js(e) {
        return ue(e);
    }
    function Ws(e) {
        return ue(e);
    }
    function R(e, t) {
        let n = e.substring(0, t).split(/\r?\n/);
        return { line: n.length, col: n[n.length - 1].length + 1 };
    }
    function me(e) {
        return e.startIndex + e[1].length;
    }
    var Ks = {
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
        ya = function (e) {
            return Object.assign({}, Ks, e);
        };
    var Te;
    typeof Symbol != 'function'
        ? (Te = '@@xmlMetadata')
        : (Te = Symbol('XML Node Metadata'));
    var V = class {
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
                    (this.child[this.child.length - 1][Te] = {
                        startIndex: n,
                    }));
        }
        static getMetaDataSymbol() {
            return Te;
        }
    };
    function Oe(e, t) {
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
                a = !1,
                o = '';
            for (; t < e.length; t++)
                if (e[t] === '<' && !a) {
                    if (r && Z(e, '!ENTITY', t)) {
                        t += 7;
                        let s, l;
                        (([s, l, t] = qs(e, t + 1)),
                            l.indexOf('&') === -1 &&
                                (n[s] = {
                                    regx: RegExp(`&${s};`, 'g'),
                                    val: l,
                                }));
                    } else if (r && Z(e, '!ELEMENT', t)) {
                        t += 8;
                        let { index: s } = Qs(e, t + 1);
                        t = s;
                    } else if (r && Z(e, '!ATTLIST', t)) t += 8;
                    else if (r && Z(e, '!NOTATION', t)) {
                        t += 9;
                        let { index: s } = Ys(e, t + 1);
                        t = s;
                    } else if (Z(e, '!--', t)) a = !0;
                    else throw new Error('Invalid DOCTYPE');
                    (i++, (o = ''));
                } else if (e[t] === '>') {
                    if (
                        (a
                            ? e[t - 1] === '-' &&
                              e[t - 2] === '-' &&
                              ((a = !1), i--)
                            : i--,
                        i === 0)
                    )
                        break;
                } else e[t] === '[' ? (r = !0) : (o += e[t]);
            if (i !== 0) throw new Error('Unclosed DOCTYPE');
        } else throw new Error('Invalid Tag instead of DOCTYPE');
        return { entities: n, i: t };
    }
    var W = (e, t) => {
        for (; t < e.length && /\s/.test(e[t]); ) t++;
        return t;
    };
    function qs(e, t) {
        t = W(e, t);
        let n = '';
        for (
            ;
            t < e.length && !/\s/.test(e[t]) && e[t] !== '"' && e[t] !== "'";

        )
            ((n += e[t]), t++);
        if (
            ($e(n),
            (t = W(e, t)),
            e.substring(t, t + 6).toUpperCase() === 'SYSTEM')
        )
            throw new Error('External entities are not supported');
        if (e[t] === '%')
            throw new Error('Parameter entities are not supported');
        let i = '';
        return (([t, i] = Ie(e, t, 'entity')), t--, [n, i, t]);
    }
    function Ys(e, t) {
        t = W(e, t);
        let n = '';
        for (; t < e.length && !/\s/.test(e[t]); ) ((n += e[t]), t++);
        ($e(n), (t = W(e, t)));
        let i = e.substring(t, t + 6).toUpperCase();
        if (i !== 'SYSTEM' && i !== 'PUBLIC')
            throw new Error(`Expected SYSTEM or PUBLIC, found "${i}"`);
        ((t += i.length), (t = W(e, t)));
        let r = null,
            a = null;
        if (i === 'PUBLIC')
            (([t, r] = Ie(e, t, 'publicIdentifier')),
                (t = W(e, t)),
                (e[t] === '"' || e[t] === "'") &&
                    ([t, a] = Ie(e, t, 'systemIdentifier')));
        else if (
            i === 'SYSTEM' &&
            (([t, a] = Ie(e, t, 'systemIdentifier')), !a)
        )
            throw new Error(
                'Missing mandatory system identifier for SYSTEM notation'
            );
        return {
            notationName: n,
            publicIdentifier: r,
            systemIdentifier: a,
            index: --t,
        };
    }
    function Ie(e, t, n) {
        let i = '',
            r = e[t];
        if (r !== '"' && r !== "'")
            throw new Error(`Expected quoted string, found "${r}"`);
        for (t++; t < e.length && e[t] !== r; ) ((i += e[t]), t++);
        if (e[t] !== r) throw new Error(`Unterminated ${n} value`);
        return (t++, [t, i]);
    }
    function Qs(e, t) {
        t = W(e, t);
        let n = '';
        for (; t < e.length && !/\s/.test(e[t]); ) ((n += e[t]), t++);
        if (!$e(n)) throw new Error(`Invalid element name: "${n}"`);
        t = W(e, t);
        let i = '';
        if (e[t] === 'E' && Z(e, 'MPTY', t)) t += 4;
        else if (e[t] === 'A' && Z(e, 'NY', t)) t += 2;
        else if (e[t] === '(') {
            for (t++; t < e.length && e[t] !== ')'; ) ((i += e[t]), t++);
            if (e[t] !== ')') throw new Error('Unterminated content model');
        } else throw new Error(`Invalid Element Expression, found "${e[t]}"`);
        return { elementName: n, contentModel: i.trim(), index: t };
    }
    function Z(e, t, n) {
        for (let i = 0; i < t.length; i++) if (t[i] !== e[n + i + 1]) return !1;
        return !0;
    }
    function $e(e) {
        if (ue(e)) return e;
        throw new Error(`Invalid entity name ${e}`);
    }
    var Js = /^[-+]?0x[a-fA-F0-9]+$/,
        Zs = /^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/,
        eo = { hex: !0, leadingZeros: !0, decimalPoint: '.', eNotation: !0 };
    function Fe(e, t = {}) {
        if (((t = Object.assign({}, eo, t)), !e || typeof e != 'string'))
            return e;
        let n = e.trim();
        if (t.skipLike !== void 0 && t.skipLike.test(n)) return e;
        if (e === '0') return 0;
        if (t.hex && Js.test(n)) return ro(n, 16);
        if (n.search(/.+[eE].+/) !== -1) return no(e, n, t);
        {
            let i = Zs.exec(n);
            if (i) {
                let r = i[1] || '',
                    a = i[2],
                    o = io(i[3]),
                    s = r ? e[a.length + 1] === '.' : e[a.length] === '.';
                if (!t.leadingZeros && (a.length > 1 || (a.length === 1 && !s)))
                    return e;
                {
                    let l = Number(n),
                        c = String(l);
                    if (l === 0) return l;
                    if (c.search(/[eE]/) !== -1) return t.eNotation ? l : e;
                    if (n.indexOf('.') !== -1)
                        return c === '0' || c === o || c === `${r}${o}` ? l : e;
                    let f = a ? o : n;
                    return a
                        ? f === c || r + f === c
                            ? l
                            : e
                        : f === c || f === r + c
                          ? l
                          : e;
                }
            } else return e;
        }
    }
    var to = /^([-+])?(0*)(\d*(\.\d*)?[eE][-\+]?\d+)$/;
    function no(e, t, n) {
        if (!n.eNotation) return e;
        let i = t.match(to);
        if (i) {
            let r = i[1] || '',
                a = i[3].indexOf('e') === -1 ? 'E' : 'e',
                o = i[2],
                s = r ? e[o.length + 1] === a : e[o.length] === a;
            return o.length > 1 && s
                ? e
                : o.length === 1 && (i[3].startsWith(`.${a}`) || i[3][0] === a)
                  ? Number(t)
                  : n.leadingZeros && !s
                    ? ((t = (i[1] || '') + i[3]), Number(t))
                    : e;
        } else return e;
    }
    function io(e) {
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
    function ro(e, t) {
        if (parseInt) return parseInt(e, t);
        if (Number.parseInt) return Number.parseInt(e, t);
        if (window && window.parseInt) return window.parseInt(e, t);
        throw new Error(
            'parseInt, Number.parseInt, window.parseInt are not supported'
        );
    }
    function He(e) {
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
    var ge = class {
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
                (this.addExternalEntities = ao),
                (this.parseXml = co),
                (this.parseTextData = so),
                (this.resolveNameSpace = oo),
                (this.buildAttributesMap = fo),
                (this.isItStopNode = go),
                (this.replaceEntitiesValue = uo),
                (this.readStopNodeData = _o),
                (this.saveTextToParentTag = mo),
                (this.addChild = po),
                (this.ignoreAttributesFn = He(this.options.ignoreAttributes)));
        }
    };
    function ao(e) {
        let t = Object.keys(e);
        for (let n = 0; n < t.length; n++) {
            let i = t[n];
            this.lastEntities[i] = {
                regex: new RegExp('&' + i + ';', 'g'),
                val: e[i],
            };
        }
    }
    function so(e, t, n, i, r, a, o) {
        if (
            e !== void 0 &&
            (this.options.trimValues && !i && (e = e.trim()), e.length > 0)
        ) {
            o || (e = this.replaceEntitiesValue(e));
            let s = this.options.tagValueProcessor(t, e, n, r, a);
            return s == null
                ? e
                : typeof s != typeof e || s !== e
                  ? s
                  : this.options.trimValues
                    ? Ge(
                          e,
                          this.options.parseTagValue,
                          this.options.numberParseOptions
                      )
                    : e.trim() === e
                      ? Ge(
                            e,
                            this.options.parseTagValue,
                            this.options.numberParseOptions
                        )
                      : e;
        }
    }
    function oo(e) {
        if (this.options.removeNSPrefix) {
            let t = e.split(':'),
                n = e.charAt(0) === '/' ? '/' : '';
            if (t[0] === 'xmlns') return '';
            t.length === 2 && (e = n + t[1]);
        }
        return e;
    }
    var lo = new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`, 'gm');
    function fo(e, t, n) {
        if (this.options.ignoreAttributes !== !0 && typeof e == 'string') {
            let i = be(e, lo),
                r = i.length,
                a = {};
            for (let o = 0; o < r; o++) {
                let s = this.resolveNameSpace(i[o][1]);
                if (this.ignoreAttributesFn(s, t)) continue;
                let l = i[o][4],
                    c = this.options.attributeNamePrefix + s;
                if (s.length)
                    if (
                        (this.options.transformAttributeName &&
                            (c = this.options.transformAttributeName(c)),
                        c === '__proto__' && (c = '#__proto__'),
                        l !== void 0)
                    ) {
                        (this.options.trimValues && (l = l.trim()),
                            (l = this.replaceEntitiesValue(l)));
                        let f = this.options.attributeValueProcessor(s, l, t);
                        f == null
                            ? (a[c] = l)
                            : typeof f != typeof l || f !== l
                              ? (a[c] = f)
                              : (a[c] = Ge(
                                    l,
                                    this.options.parseAttributeValue,
                                    this.options.numberParseOptions
                                ));
                    } else this.options.allowBooleanAttributes && (a[c] = !0);
            }
            if (!Object.keys(a).length) return;
            if (this.options.attributesGroupName) {
                let o = {};
                return ((o[this.options.attributesGroupName] = a), o);
            }
            return a;
        }
    }
    var co = function (e) {
        e = e.replace(
            /\r\n?/g,
            `
`
        );
        let t = new V('!xml'),
            n = t,
            i = '',
            r = '';
        for (let a = 0; a < e.length; a++)
            if (e[a] === '<')
                if (e[a + 1] === '/') {
                    let s = ee(e, '>', a, 'Closing Tag is not closed.'),
                        l = e.substring(a + 2, s).trim();
                    if (this.options.removeNSPrefix) {
                        let d = l.indexOf(':');
                        d !== -1 && (l = l.substr(d + 1));
                    }
                    (this.options.transformTagName &&
                        (l = this.options.transformTagName(l)),
                        n && (i = this.saveTextToParentTag(i, n, r)));
                    let c = r.substring(r.lastIndexOf('.') + 1);
                    if (l && this.options.unpairedTags.indexOf(l) !== -1)
                        throw new Error(
                            `Unpaired tag can not be used as closing tag: </${l}>`
                        );
                    let f = 0;
                    (c && this.options.unpairedTags.indexOf(c) !== -1
                        ? ((f = r.lastIndexOf('.', r.lastIndexOf('.') - 1)),
                          this.tagsNodeStack.pop())
                        : (f = r.lastIndexOf('.')),
                        (r = r.substring(0, f)),
                        (n = this.tagsNodeStack.pop()),
                        (i = ''),
                        (a = s));
                } else if (e[a + 1] === '?') {
                    let s = Xe(e, a, !1, '?>');
                    if (!s) throw new Error('Pi Tag is not closed.');
                    if (
                        ((i = this.saveTextToParentTag(i, n, r)),
                        !(
                            (this.options.ignoreDeclaration &&
                                s.tagName === '?xml') ||
                            this.options.ignorePiTags
                        ))
                    ) {
                        let l = new V(s.tagName);
                        (l.add(this.options.textNodeName, ''),
                            s.tagName !== s.tagExp &&
                                s.attrExpPresent &&
                                (l[':@'] = this.buildAttributesMap(
                                    s.tagExp,
                                    r,
                                    s.tagName
                                )),
                            this.addChild(n, l, r, a));
                    }
                    a = s.closeIndex + 1;
                } else if (e.substr(a + 1, 3) === '!--') {
                    let s = ee(e, '-->', a + 4, 'Comment is not closed.');
                    if (this.options.commentPropName) {
                        let l = e.substring(a + 4, s - 2);
                        ((i = this.saveTextToParentTag(i, n, r)),
                            n.add(this.options.commentPropName, [
                                { [this.options.textNodeName]: l },
                            ]));
                    }
                    a = s;
                } else if (e.substr(a + 1, 2) === '!D') {
                    let s = Oe(e, a);
                    ((this.docTypeEntities = s.entities), (a = s.i));
                } else if (e.substr(a + 1, 2) === '![') {
                    let s = ee(e, ']]>', a, 'CDATA is not closed.') - 2,
                        l = e.substring(a + 9, s);
                    i = this.saveTextToParentTag(i, n, r);
                    let c = this.parseTextData(l, n.tagname, r, !0, !1, !0, !0);
                    (c == null && (c = ''),
                        this.options.cdataPropName
                            ? n.add(this.options.cdataPropName, [
                                  { [this.options.textNodeName]: l },
                              ])
                            : n.add(this.options.textNodeName, c),
                        (a = s + 2));
                } else {
                    let s = Xe(e, a, this.options.removeNSPrefix),
                        l = s.tagName,
                        c = s.rawTagName,
                        f = s.tagExp,
                        d = s.attrExpPresent,
                        p = s.closeIndex;
                    (this.options.transformTagName &&
                        (l = this.options.transformTagName(l)),
                        n &&
                            i &&
                            n.tagname !== '!xml' &&
                            (i = this.saveTextToParentTag(i, n, r, !1)));
                    let m = n;
                    (m &&
                        this.options.unpairedTags.indexOf(m.tagname) !== -1 &&
                        ((n = this.tagsNodeStack.pop()),
                        (r = r.substring(0, r.lastIndexOf('.')))),
                        l !== t.tagname && (r += r ? '.' + l : l));
                    let _ = a;
                    if (this.isItStopNode(this.options.stopNodes, r, l)) {
                        let x = '';
                        if (f.length > 0 && f.lastIndexOf('/') === f.length - 1)
                            (l[l.length - 1] === '/'
                                ? ((l = l.substr(0, l.length - 1)),
                                  (r = r.substr(0, r.length - 1)),
                                  (f = l))
                                : (f = f.substr(0, f.length - 1)),
                                (a = s.closeIndex));
                        else if (this.options.unpairedTags.indexOf(l) !== -1)
                            a = s.closeIndex;
                        else {
                            let b = this.readStopNodeData(e, c, p + 1);
                            if (!b) throw new Error(`Unexpected end of ${c}`);
                            ((a = b.i), (x = b.tagContent));
                        }
                        let y = new V(l);
                        (l !== f &&
                            d &&
                            (y[':@'] = this.buildAttributesMap(f, r, l)),
                            x &&
                                (x = this.parseTextData(
                                    x,
                                    l,
                                    r,
                                    !0,
                                    d,
                                    !0,
                                    !0
                                )),
                            (r = r.substr(0, r.lastIndexOf('.'))),
                            y.add(this.options.textNodeName, x),
                            this.addChild(n, y, r, _));
                    } else {
                        if (
                            f.length > 0 &&
                            f.lastIndexOf('/') === f.length - 1
                        ) {
                            (l[l.length - 1] === '/'
                                ? ((l = l.substr(0, l.length - 1)),
                                  (r = r.substr(0, r.length - 1)),
                                  (f = l))
                                : (f = f.substr(0, f.length - 1)),
                                this.options.transformTagName &&
                                    (l = this.options.transformTagName(l)));
                            let x = new V(l);
                            (l !== f &&
                                d &&
                                (x[':@'] = this.buildAttributesMap(f, r, l)),
                                this.addChild(n, x, r, _),
                                (r = r.substr(0, r.lastIndexOf('.'))));
                        } else {
                            let x = new V(l);
                            (this.tagsNodeStack.push(n),
                                l !== f &&
                                    d &&
                                    (x[':@'] = this.buildAttributesMap(
                                        f,
                                        r,
                                        l
                                    )),
                                this.addChild(n, x, r, _),
                                (n = x));
                        }
                        ((i = ''), (a = p));
                    }
                }
            else i += e[a];
        return t.child;
    };
    function po(e, t, n, i) {
        this.options.captureMetaData || (i = void 0);
        let r = this.options.updateTag(t.tagname, n, t[':@']);
        r === !1 || (typeof r == 'string' && (t.tagname = r), e.addChild(t, i));
    }
    var uo = function (e) {
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
    function mo(e, t, n, i) {
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
    function go(e, t, n) {
        let i = '*.' + n;
        for (let r in e) {
            let a = e[r];
            if (i === a || t === a) return !0;
        }
        return !1;
    }
    function ho(e, t, n = '>') {
        let i,
            r = '';
        for (let a = t; a < e.length; a++) {
            let o = e[a];
            if (i) o === i && (i = '');
            else if (o === '"' || o === "'") i = o;
            else if (o === n[0])
                if (n[1]) {
                    if (e[a + 1] === n[1]) return { data: r, index: a };
                } else return { data: r, index: a };
            else o === '	' && (o = ' ');
            r += o;
        }
    }
    function ee(e, t, n, i) {
        let r = e.indexOf(t, n);
        if (r === -1) throw new Error(i);
        return r + t.length - 1;
    }
    function Xe(e, t, n, i = '>') {
        let r = ho(e, t + 1, i);
        if (!r) return;
        let a = r.data,
            o = r.index,
            s = a.search(/\s/),
            l = a,
            c = !0;
        s !== -1 &&
            ((l = a.substring(0, s)), (a = a.substring(s + 1).trimStart()));
        let f = l;
        if (n) {
            let d = l.indexOf(':');
            d !== -1 &&
                ((l = l.substr(d + 1)), (c = l !== r.data.substr(d + 1)));
        }
        return {
            tagName: l,
            tagExp: a,
            closeIndex: o,
            attrExpPresent: c,
            rawTagName: f,
        };
    }
    function _o(e, t, n) {
        let i = n,
            r = 1;
        for (; n < e.length; n++)
            if (e[n] === '<')
                if (e[n + 1] === '/') {
                    let a = ee(e, '>', n, `${t} is not closed`);
                    if (e.substring(n + 2, a).trim() === t && (r--, r === 0))
                        return { tagContent: e.substring(i, n), i: a };
                    n = a;
                } else if (e[n + 1] === '?')
                    n = ee(e, '?>', n + 1, 'StopNode is not closed.');
                else if (e.substr(n + 1, 3) === '!--')
                    n = ee(e, '-->', n + 3, 'StopNode is not closed.');
                else if (e.substr(n + 1, 2) === '![')
                    n = ee(e, ']]>', n, 'StopNode is not closed.') - 2;
                else {
                    let a = Xe(e, n, '>');
                    a &&
                        ((a && a.tagName) === t &&
                            a.tagExp[a.tagExp.length - 1] !== '/' &&
                            r++,
                        (n = a.closeIndex));
                }
    }
    function Ge(e, t, n) {
        if (t && typeof e == 'string') {
            let i = e.trim();
            return i === 'true' ? !0 : i === 'false' ? !1 : Fe(e, n);
        } else return ua(e) ? e : '';
    }
    var je = V.getMetaDataSymbol();
    function We(e, t) {
        return Sa(e, t);
    }
    function Sa(e, t, n) {
        let i,
            r = {};
        for (let a = 0; a < e.length; a++) {
            let o = e[a],
                s = xo(o),
                l = '';
            if (
                (n === void 0 ? (l = s) : (l = n + '.' + s),
                s === t.textNodeName)
            )
                i === void 0 ? (i = o[s]) : (i += '' + o[s]);
            else {
                if (s === void 0) continue;
                if (o[s]) {
                    let c = Sa(o[s], t, l),
                        f = So(c, t);
                    (o[je] !== void 0 && (c[je] = o[je]),
                        o[':@']
                            ? yo(c, o[':@'], l, t)
                            : Object.keys(c).length === 1 &&
                                c[t.textNodeName] !== void 0 &&
                                !t.alwaysCreateTextNode
                              ? (c = c[t.textNodeName])
                              : Object.keys(c).length === 0 &&
                                (t.alwaysCreateTextNode
                                    ? (c[t.textNodeName] = '')
                                    : (c = '')),
                        r[s] !== void 0 && r.hasOwnProperty(s)
                            ? (Array.isArray(r[s]) || (r[s] = [r[s]]),
                              r[s].push(c))
                            : t.isArray(s, l, f)
                              ? (r[s] = [c])
                              : (r[s] = c));
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
    function xo(e) {
        let t = Object.keys(e);
        for (let n = 0; n < t.length; n++) {
            let i = t[n];
            if (i !== ':@') return i;
        }
    }
    function yo(e, t, n, i) {
        if (t) {
            let r = Object.keys(t),
                a = r.length;
            for (let o = 0; o < a; o++) {
                let s = r[o];
                i.isArray(s, n + '.' + s, !0, !0)
                    ? (e[s] = [t[s]])
                    : (e[s] = t[s]);
            }
        }
    }
    function So(e, t) {
        let { textNodeName: n } = t,
            i = Object.keys(e).length;
        return !!(
            i === 0 ||
            (i === 1 && (e[n] || typeof e[n] == 'boolean' || e[n] === 0))
        );
    }
    var ae = class {
        constructor(t) {
            ((this.externalEntities = {}), (this.options = ya(t)));
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
                let a = xa(t, n);
                if (a !== !0)
                    throw Error(`${a.err.msg}:${a.err.line}:${a.err.col}`);
            }
            let i = new ge(this.options);
            i.addExternalEntities(this.externalEntities);
            let r = i.parseXml(t);
            return this.options.preserveOrder || r === void 0
                ? r
                : We(r, this.options);
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
            return V.getMetaDataSymbol();
        }
    };
    async function Ke(e, t) {
        let i = new ae({
                ignoreAttributes: !1,
                attributeNamePrefix: '',
                attributesGroupName: ':@',
                textNodeName: '#text',
                allowBooleanAttributes: !0,
                removeNSPrefix: !0,
                alwaysCreateTextNode: !0,
                isArray: (s) =>
                    [
                        'Period',
                        'AdaptationSet',
                        'Representation',
                        'S',
                        'ContentProtection',
                        'Role',
                        'Location',
                        'BaseURL',
                        'EventStream',
                        'SegmentURL',
                        'Subset',
                        'ProgramInformation',
                        'Metrics',
                    ].includes(s),
            }).parse(e),
            r = Object.keys(i).find((s) => s.toUpperCase() === 'MPD');
        if (!r)
            throw new Error('Could not find MPD root element in the manifest.');
        let a = i[r];
        return { manifest: da(a, t), serializedManifest: a, baseUrl: t };
    }
    var bo = (e) =>
        !e || isNaN(e)
            ? 'N/A'
            : e >= 1e6
              ? `${(e / 1e6).toFixed(2)} Mbps`
              : `${(e / 1e3).toFixed(0)} kbps`;
    function ba(e) {
        let { serializedManifest: t } = e,
            n = t.isMaster,
            i = [],
            r = [],
            a = [],
            o = new Set(),
            s = new Set(),
            l = null;
        if (n) {
            (t.variants.forEach((p, m) => {
                let _ = p.attributes.CODECS || '';
                (_.includes('avc1') ||
                    _.includes('hvc1') ||
                    p.attributes.RESOLUTION) &&
                    i.push({
                        id: p.attributes['STABLE-VARIANT-ID'] || `variant_${m}`,
                        profiles: null,
                        bitrateRange: bo(p.attributes.BANDWIDTH),
                        resolutions: p.attributes.RESOLUTION
                            ? [p.attributes.RESOLUTION]
                            : [],
                        codecs: [_],
                        scanType: null,
                        videoRange: p.attributes['VIDEO-RANGE'] || null,
                        roles: [],
                    });
            }),
                t.media.forEach((p, m) => {
                    let _ =
                        p['STABLE-RENDITION-ID'] ||
                        `${p.TYPE.toLowerCase()}_${m}`;
                    p.TYPE === 'AUDIO'
                        ? r.push({
                              id: _,
                              lang: p.LANGUAGE,
                              codecs: [],
                              channels: p.CHANNELS ? [p.CHANNELS] : [],
                              isDefault: p.DEFAULT === 'YES',
                              isForced: p.FORCED === 'YES',
                              roles: [],
                          })
                        : (p.TYPE === 'SUBTITLES' ||
                              p.TYPE === 'CLOSED-CAPTIONS') &&
                          a.push({
                              id: _,
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
                (o.add(d.value.METHOD),
                d.value.KEYFORMAT ===
                    'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed' &&
                    d.value.URI)
            )
                try {
                    let m = atob(d.value.URI.split(',')[1]).slice(32, 48);
                    s.add(
                        Array.from(m)
                            .map((_) =>
                                _.charCodeAt(0).toString(16).padStart(2, '0')
                            )
                            .join('')
                    );
                } catch {}
        } else {
            let d = t.segments.find((_) => _.key)?.key;
            d && d.METHOD !== 'NONE' && o.add(d.METHOD);
            let p = t.segments.length,
                m = t.segments.reduce((_, x) => _ + x.duration, 0);
            l = {
                segmentCount: p,
                averageSegmentDuration: p > 0 ? m / p : 0,
                hasDiscontinuity: t.segments.some((_) => _.discontinuity),
                isIFrameOnly: t.tags.some(
                    (_) => _.name === 'EXT-X-I-FRAMES-ONLY'
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
                mediaPlaylistDetails: l,
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
                textTracks: a.length,
                mediaPlaylists: n ? t.variants.length : 1,
            },
            videoTracks: i,
            audioTracks: r,
            textTracks: a,
            security: {
                isEncrypted: o.size > 0,
                systems: Array.from(o),
                kids: Array.from(s),
            },
        };
    }
    function Ta(e) {
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
                    : e.segments.reduce((o, s) => o + s.duration, 0),
                maxSegmentDuration: null,
                maxSubsegmentDuration: null,
                programInformations: [],
                metrics: [],
                locations: [],
                segmentFormat: e.map ? 'isobmff' : 'ts',
                periods: [],
                events: [],
                serializedManifest: e,
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
            n = e.tags.filter((o) => o.name === 'EXT-X-DATERANGE'),
            i = 0,
            r = new Map();
        for (let o of e.segments)
            (o.dateTime && r.set(new Date(o.dateTime).getTime(), i),
                (i += o.duration));
        for (let o of n) {
            let s = new Date(o.value['START-DATE']).getTime(),
                l = parseFloat(o.value.DURATION),
                c = Array.from(r.keys())
                    .filter((f) => f <= s)
                    .pop();
            if (c) {
                let f = (s - c) / 1e3,
                    d = o.value.CLASS === 'com.apple.hls.interstitial';
                t.events.push({
                    startTime: r.get(c) + f,
                    duration: l,
                    message: d
                        ? `Interstitial: ${o.value.ID || 'N/A'}`
                        : `Date Range: ${o.value.ID || 'N/A'}`,
                    messageData: d ? o.value : null,
                    type: 'hls-daterange',
                });
            }
        }
        let a = {
            id: 'hls-period-0',
            start: 0,
            duration: t.duration,
            bitstreamSwitching: null,
            assetIdentifier: null,
            subsets: [],
            adaptationSets: [],
            eventStreams: [],
            events: [],
            serializedManifest: e,
        };
        if (e.isMaster) {
            let o = e.media.reduce((s, l) => {
                let c = l['GROUP-ID'],
                    f = l.TYPE.toLowerCase();
                return (
                    s[f] || (s[f] = {}),
                    s[f][c] || (s[f][c] = []),
                    s[f][c].push(l),
                    s
                );
            }, {});
            (Object.entries(o).forEach(([s, l]) => {
                Object.entries(l).forEach(([c, f], d) => {
                    f.forEach((p, m) => {
                        let _ = s === 'subtitles' ? 'text' : s,
                            x = {
                                id:
                                    p['STABLE-RENDITION-ID'] ||
                                    `${s}-rendition-${c}-${m}`,
                                contentType: _,
                                lang: p.LANGUAGE,
                                mimeType:
                                    _ === 'text' ? 'text/vtt' : 'video/mp2t',
                                representations: [],
                                contentProtection: [],
                                roles: [],
                                profiles: null,
                                group: null,
                                bitstreamSwitching: null,
                                maxWidth: null,
                                maxHeight: null,
                                maxFrameRate: null,
                                framePackings: [],
                                ratings: [],
                                viewpoints: [],
                                accessibility: [],
                                labels: [],
                                groupLabels: [],
                                serializedManifest: p,
                            };
                        a.adaptationSets.push(x);
                    });
                });
            }),
                e.variants.forEach((s, l) => {
                    let c = s.attributes.CODECS || '',
                        f =
                            c.includes('avc1') ||
                            c.includes('hev1') ||
                            c.includes('hvc1'),
                        d = !!s.attributes.RESOLUTION,
                        p = f || d,
                        m = c.includes('mp4a') && !s.attributes.AUDIO;
                    if (p) {
                        let _ = s.attributes.RESOLUTION,
                            x = {
                                id:
                                    s.attributes['STABLE-VARIANT-ID'] ||
                                    `video-variant-${l}-rep-0`,
                                codecs: c,
                                bandwidth: s.attributes.BANDWIDTH,
                                width: _
                                    ? parseInt(String(_).split('x')[0], 10)
                                    : null,
                                height: _
                                    ? parseInt(String(_).split('x')[1], 10)
                                    : null,
                                frameRate: s.attributes['FRAME-RATE'] || null,
                                sar: null,
                                qualityRanking: s.attributes.SCORE,
                                videoRange: s.attributes['VIDEO-RANGE'],
                                mimeType: null,
                                profiles: null,
                                selectionPriority: null,
                                codingDependency: null,
                                scanType: null,
                                associationId: null,
                                associationType: null,
                                segmentProfiles: null,
                                mediaStreamStructureId: null,
                                maximumSAPPeriod: null,
                                startWithSAP: null,
                                maxPlayoutRate: null,
                                tag: null,
                                eptDelta: null,
                                pdDelta: null,
                                representationIndex: null,
                                failoverContent: null,
                                audioChannelConfigurations: [],
                                framePackings: [],
                                ratings: [],
                                viewpoints: [],
                                accessibility: [],
                                labels: [],
                                groupLabels: [],
                                subRepresentations: [],
                                dependencyId: null,
                                serializedManifest: s,
                            },
                            y = {
                                id: `video-variant-${l}`,
                                contentType: 'video',
                                lang: null,
                                mimeType: 'video/mp2t',
                                representations: [x],
                                contentProtection: [],
                                roles: [],
                                profiles: null,
                                group: null,
                                bitstreamSwitching: null,
                                maxWidth: null,
                                maxHeight: null,
                                maxFrameRate: null,
                                framePackings: [],
                                ratings: [],
                                viewpoints: [],
                                accessibility: [],
                                labels: [],
                                groupLabels: [],
                                serializedManifest: s,
                            };
                        a.adaptationSets.push(y);
                    }
                    if (m) {
                        let _ = {
                            id: `audio-muxed-${l}`,
                            contentType: 'audio',
                            lang: null,
                            mimeType: 'audio/mp4',
                            representations: [
                                {
                                    id: `audio-muxed-${l}-rep-0`,
                                    codecs: c
                                        .split(',')
                                        .find((x) => x.startsWith('mp4a')),
                                    bandwidth: s.attributes.BANDWIDTH,
                                    width: null,
                                    height: null,
                                    mimeType: null,
                                    profiles: null,
                                    qualityRanking: null,
                                    selectionPriority: null,
                                    codingDependency: null,
                                    scanType: null,
                                    associationId: null,
                                    associationType: null,
                                    segmentProfiles: null,
                                    mediaStreamStructureId: null,
                                    maximumSAPPeriod: null,
                                    startWithSAP: null,
                                    maxPlayoutRate: null,
                                    tag: null,
                                    eptDelta: null,
                                    pdDelta: null,
                                    representationIndex: null,
                                    failoverContent: null,
                                    audioChannelConfigurations: [],
                                    framePackings: [],
                                    ratings: [],
                                    viewpoints: [],
                                    accessibility: [],
                                    labels: [],
                                    groupLabels: [],
                                    videoRange: void 0,
                                    subRepresentations: [],
                                    dependencyId: null,
                                    frameRate: null,
                                    sar: null,
                                    serializedManifest: s,
                                },
                            ],
                            contentProtection: [],
                            roles: [],
                            profiles: null,
                            group: null,
                            bitstreamSwitching: null,
                            maxWidth: null,
                            maxHeight: null,
                            maxFrameRate: null,
                            framePackings: [],
                            ratings: [],
                            viewpoints: [],
                            accessibility: [],
                            labels: [],
                            groupLabels: [],
                            serializedManifest: s,
                        };
                        a.adaptationSets.push(_);
                    }
                }));
        } else {
            let o = {
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
                            mimeType: null,
                            profiles: null,
                            qualityRanking: null,
                            selectionPriority: null,
                            codingDependency: null,
                            scanType: null,
                            associationId: null,
                            associationType: null,
                            segmentProfiles: null,
                            mediaStreamStructureId: null,
                            maximumSAPPeriod: null,
                            startWithSAP: null,
                            maxPlayoutRate: null,
                            tag: null,
                            eptDelta: null,
                            pdDelta: null,
                            representationIndex: null,
                            failoverContent: null,
                            audioChannelConfigurations: [],
                            framePackings: [],
                            ratings: [],
                            viewpoints: [],
                            accessibility: [],
                            labels: [],
                            groupLabels: [],
                            videoRange: void 0,
                            subRepresentations: [],
                            dependencyId: null,
                            frameRate: null,
                            sar: null,
                            serializedManifest: e,
                        },
                    ],
                    contentProtection: [],
                    roles: [],
                    profiles: null,
                    group: null,
                    bitstreamSwitching: null,
                    maxWidth: null,
                    maxHeight: null,
                    maxFrameRate: null,
                    framePackings: [],
                    ratings: [],
                    viewpoints: [],
                    accessibility: [],
                    labels: [],
                    groupLabels: [],
                    serializedManifest: e,
                },
                s = e.segments.find((l) => l.key)?.key;
            (s &&
                s.METHOD !== 'NONE' &&
                o.contentProtection.push({
                    schemeIdUri: s.KEYFORMAT || 'identity',
                    system: s.METHOD,
                    defaultKid: null,
                }),
                a.adaptationSets.push(o));
        }
        return (t.periods.push(a), (t.summary = ba(t)), t);
    }
    function O(e) {
        let t = {};
        return (
            (e.match(/("[^"]*")|[^,]+/g) || []).forEach((i) => {
                let r = i.indexOf('=');
                if (r === -1) return;
                let a = i.substring(0, r),
                    o = i.substring(r + 1).replace(/"/g, ''),
                    s = /^-?\d+(\.\d+)?$/.test(o) ? parseFloat(o) : o;
                t[a] = s;
            }),
            t
        );
    }
    function To(e, t, n = new Map()) {
        let i = new Map(n),
            r = new URL(t).searchParams;
        return (
            e.forEach((o) => {
                if (o.startsWith('#EXT-X-DEFINE:')) {
                    let s = O(o.substring(14));
                    if (s.NAME && s.VALUE !== void 0)
                        i.set(String(s.NAME), {
                            value: String(s.VALUE),
                            source: 'VALUE',
                        });
                    else if (s.QUERYPARAM) {
                        let l = String(s.QUERYPARAM),
                            c = r.get(l);
                        c !== null &&
                            i.set(l, { value: c, source: `QUERYPARAM (${l})` });
                    } else if (s.IMPORT) {
                        let l = String(s.IMPORT);
                        n.has(l) &&
                            i.set(l, {
                                value: n.get(l).value,
                                source: `IMPORT (${l})`,
                            });
                    }
                }
            }),
            i.size === 0
                ? { substitutedLines: e, definedVariables: i }
                : {
                      substitutedLines: e.map((o) =>
                          o.replace(/{\$[a-zA-Z0-9_-]+}/g, (s) => {
                              let l = s.substring(2, s.length - 1);
                              return i.has(l) ? i.get(l).value : s;
                          })
                      ),
                      definedVariables: i,
                  }
        );
    }
    async function se(e, t, n) {
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
        let { substitutedLines: a, definedVariables: o } = To(r, t, n),
            s = {
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
            l = null,
            c = null,
            f = null;
        for (let p = 1; p < a.length; p++) {
            let m = a[p].trim();
            if (m)
                if (m.startsWith('#EXT')) {
                    let _ = m.indexOf(':'),
                        x,
                        y;
                    switch (
                        (_ === -1
                            ? ((x = m.substring(1)), (y = null))
                            : ((x = m.substring(1, _)),
                              (y = m.substring(_ + 1))),
                        x)
                    ) {
                        case 'EXT-X-STREAM-INF': {
                            s.isMaster = !0;
                            let b = O(y),
                                g = a[++p].trim();
                            s.variants.push({
                                attributes: b,
                                uri: g,
                                resolvedUri: new URL(g, t).href,
                                lineNumber: p,
                            });
                            break;
                        }
                        case 'EXT-X-MEDIA':
                            ((s.isMaster = !0),
                                s.media.push({ ...O(y), lineNumber: p }));
                            break;
                        case 'EXT-X-I-FRAME-STREAM-INF':
                            ((s.isMaster = !0),
                                s.tags.push({
                                    name: x,
                                    value: O(y),
                                    lineNumber: p,
                                }));
                            break;
                        case 'EXTINF': {
                            let [b, g] = y.split(','),
                                S = parseFloat(b);
                            (isNaN(S) && (S = 0),
                                (l = {
                                    duration: S,
                                    title: g || '',
                                    tags: [],
                                    key: c,
                                    parts: [],
                                    bitrate: f,
                                    gap: !1,
                                    type: 'Media',
                                    extinfLineNumber: p,
                                }));
                            break;
                        }
                        case 'EXT-X-GAP':
                            l &&
                                ((l.gap = !0),
                                (l.uri = null),
                                (l.resolvedUrl = null),
                                s.segments.push(l),
                                (l = null));
                            break;
                        case 'EXT-X-BITRATE':
                            f = parseInt(y, 10);
                            break;
                        case 'EXT-X-BYTERANGE':
                            l &&
                                l.tags.push({
                                    name: x,
                                    value: y,
                                    lineNumber: p,
                                });
                            break;
                        case 'EXT-X-DISCONTINUITY':
                            l && (l.discontinuity = !0);
                            break;
                        case 'EXT-X-KEY': {
                            let b = O(y);
                            ((c = b),
                                b.METHOD === 'NONE' && (c = null),
                                s.tags.push({
                                    name: x,
                                    value: b,
                                    lineNumber: p,
                                }));
                            break;
                        }
                        case 'EXT-X-MAP':
                            s.map = { ...O(y), lineNumber: p };
                            break;
                        case 'EXT-X-PROGRAM-DATE-TIME':
                            l && (l.dateTime = y);
                            break;
                        case 'EXT-X-TARGETDURATION':
                            s.targetDuration = parseInt(y, 10);
                            break;
                        case 'EXT-X-MEDIA-SEQUENCE':
                            s.mediaSequence = parseInt(y, 10);
                            break;
                        case 'EXT-X-PLAYLIST-TYPE':
                            ((s.playlistType = y),
                                y === 'VOD' && (s.isLive = !1));
                            break;
                        case 'EXT-X-ENDLIST':
                            ((s.isLive = !1),
                                s.tags.push({
                                    name: x,
                                    value: null,
                                    lineNumber: p,
                                }));
                            break;
                        case 'EXT-X-VERSION':
                            ((s.version = parseInt(y, 10)),
                                s.tags.push({
                                    name: x,
                                    value: s.version,
                                    lineNumber: p,
                                }));
                            break;
                        case 'EXT-X-PART-INF':
                            ((s.partInf = O(y)),
                                s.tags.push({
                                    name: x,
                                    value: s.partInf,
                                    lineNumber: p,
                                }));
                            break;
                        case 'EXT-X-SERVER-CONTROL':
                            ((s.serverControl = O(y)),
                                s.tags.push({
                                    name: x,
                                    value: s.serverControl,
                                    lineNumber: p,
                                }));
                            break;
                        case 'EXT-X-PART':
                            if (l) {
                                let b = O(y);
                                l.parts.push({
                                    ...b,
                                    resolvedUri: new URL(String(b.URI), t).href,
                                    lineNumber: p,
                                });
                            }
                            break;
                        case 'EXT-X-PRELOAD-HINT':
                            (s.preloadHints.push({ ...O(y), lineNumber: p }),
                                s.tags.push({
                                    name: x,
                                    value: s.preloadHints.at(-1),
                                    lineNumber: p,
                                }));
                            break;
                        case 'EXT-X-RENDITION-REPORT':
                            (s.renditionReports.push({
                                ...O(y),
                                lineNumber: p,
                            }),
                                s.tags.push({
                                    name: x,
                                    value: s.renditionReports.at(-1),
                                    lineNumber: p,
                                }));
                            break;
                        case 'EXT-X-DEFINE':
                        case 'EXT-X-SKIP':
                        case 'EXT-X-CONTENT-STEERING':
                        case 'EXT-X-DATERANGE':
                        case 'EXT-X-SESSION-DATA':
                            s.tags.push({
                                name: x,
                                value: O(y),
                                lineNumber: p,
                            });
                            break;
                        default:
                            l
                                ? l.tags.push({
                                      name: x,
                                      value: y,
                                      lineNumber: p,
                                  })
                                : s.tags.push({
                                      name: x,
                                      value: y,
                                      lineNumber: p,
                                  });
                            break;
                    }
                } else
                    m.startsWith('#') ||
                        (l &&
                            ((l.uri = m),
                            (l.resolvedUrl = new URL(m, t).href),
                            (l.uriLineNumber = p),
                            s.segments.push(l),
                            (l = null)));
        }
        return { manifest: Ta(s), definedVariables: o, baseUrl: t };
    }
    G();
    G();
    function Ia(e, t) {
        let n = {},
            i = u(e, 'type') === 'dynamic';
        return (
            ze(e, 'Representation').forEach(({ element: a, context: o }) => {
                let s = u(a, 'id');
                if (!s) return;
                n[s] = [];
                let { period: l, adaptationSet: c } = o;
                if (!l || !c) return;
                let f = [a, c, l],
                    d = la(t, e, l, c, a),
                    p = J('SegmentTemplate', f),
                    m = J('SegmentList', f),
                    _ = J('SegmentBase', f),
                    x = u(p, 'initialization');
                if (!x) {
                    let y = m || _,
                        b = y ? k(y, 'Initialization') : null;
                    b && (x = u(b, 'sourceURL'));
                }
                if (x) {
                    let y = x.replace(/\$RepresentationID\$/g, s);
                    n[s].push({
                        repId: s,
                        type: 'Init',
                        number: 0,
                        resolvedUrl: new URL(y, d).href,
                        template: y,
                        time: -1,
                        duration: 0,
                        timescale: parseInt(u(p || m, 'timescale') || '1'),
                    });
                }
                if (p) {
                    let y = parseInt(u(p, 'timescale') || '1'),
                        b = u(p, 'media'),
                        g = k(p, 'SegmentTimeline'),
                        S = parseInt(u(p, 'startNumber') || '1');
                    if (b && g) {
                        let T = S,
                            I = 0;
                        v(g, 'S').forEach((C) => {
                            let D = u(C, 't') ? parseInt(u(C, 't')) : I,
                                M = parseInt(u(C, 'd')),
                                A = parseInt(u(C, 'r') || '0');
                            I = D;
                            for (let L = 0; L <= A; L++) {
                                let ie = I,
                                    F = b
                                        .replace(/\$RepresentationID\$/g, s)
                                        .replace(
                                            /\$Number(%0\d+d)?\$/g,
                                            (Yo, Ae) =>
                                                String(T).padStart(
                                                    Ae
                                                        ? parseInt(
                                                              Ae.substring(
                                                                  2,
                                                                  Ae.length - 1
                                                              )
                                                          )
                                                        : 1,
                                                    '0'
                                                )
                                        )
                                        .replace(/\$Time\$/g, String(ie));
                                (n[s].push({
                                    repId: s,
                                    type: 'Media',
                                    number: T,
                                    resolvedUrl: new URL(F, d).href,
                                    template: F,
                                    time: ie,
                                    duration: M,
                                    timescale: y,
                                }),
                                    (I += M),
                                    T++);
                            }
                        });
                    } else if (b && u(p, 'duration')) {
                        let T = parseInt(u(p, 'duration')),
                            I = T / y,
                            C = 0,
                            D = S;
                        if (i) C = 10;
                        else {
                            let M =
                                w(u(e, 'mediaPresentationDuration')) ||
                                w(u(l, 'duration'));
                            if (!M || !I) return;
                            C = Math.ceil(M / I);
                        }
                        for (let M = 0; M < C; M++) {
                            let A = D + M,
                                L = b
                                    .replace(/\$RepresentationID\$/g, s)
                                    .replace(/\$Number(%0\d+d)?\$/g, (ie, F) =>
                                        String(A).padStart(
                                            F
                                                ? parseInt(
                                                      F.substring(
                                                          2,
                                                          F.length - 1
                                                      )
                                                  )
                                                : 1,
                                            '0'
                                        )
                                    );
                            n[s].push({
                                repId: s,
                                type: 'Media',
                                number: A,
                                resolvedUrl: new URL(L, d).href,
                                template: L,
                                time: (A - S) * T,
                                duration: T,
                                timescale: y,
                            });
                        }
                    }
                } else if (m) {
                    let y = parseInt(u(m, 'timescale') || '1'),
                        b = parseInt(u(m, 'duration')),
                        g = 0;
                    v(m, 'SegmentURL').forEach((T, I) => {
                        let C = u(T, 'media');
                        C &&
                            (n[s].push({
                                repId: s,
                                type: 'Media',
                                number: I + 1,
                                resolvedUrl: new URL(C, d).href,
                                template: C,
                                time: g,
                                duration: b,
                                timescale: y,
                            }),
                            (g += b));
                    });
                } else if (_) {
                    let y =
                            w(u(e, 'mediaPresentationDuration')) ||
                            w(u(l, 'duration')) ||
                            0,
                        b = 1;
                    n[s].push({
                        repId: s,
                        type: 'Media',
                        number: 1,
                        resolvedUrl: d,
                        template: 'SegmentBase',
                        time: 0,
                        duration: y * b,
                        timescale: b,
                    });
                }
            }),
            n
        );
    }
    G();
    var oe = [
        {
            id: 'MPD-1',
            text: 'MPD root element must exist',
            isoRef: 'Clause 5.3.1.2',
            severity: 'fail',
            scope: 'MPD',
            category: 'Manifest Structure',
            check: (e) => !!e,
            passDetails: 'OK',
            failDetails:
                'The document could not be parsed or does not contain an MPD root element.',
        },
        {
            id: 'MPD-2',
            text: 'MPD@profiles is mandatory',
            isoRef: 'Clause 5.3.1.2, Table 3',
            severity: 'fail',
            scope: 'MPD',
            category: 'Manifest Structure',
            check: (e) =>
                u(e, 'profiles') !== void 0 && u(e, 'profiles') !== '',
            passDetails: 'OK',
            failDetails:
                'The @profiles attribute is mandatory and must not be empty.',
        },
        {
            id: 'MPD-3',
            text: 'MPD@minBufferTime is mandatory',
            isoRef: 'Clause 5.3.1.2, Table 3',
            severity: 'fail',
            scope: 'MPD',
            category: 'Manifest Structure',
            check: (e) => u(e, 'minBufferTime') !== void 0,
            passDetails: 'OK',
            failDetails: 'The @minBufferTime attribute is mandatory.',
        },
        {
            id: 'MPD-4',
            text: 'MPD@type is mandatory',
            isoRef: 'Clause 5.3.1.2, Table 3',
            severity: 'fail',
            scope: 'MPD',
            category: 'Manifest Structure',
            check: (e) =>
                u(e, 'type') === 'static' || u(e, 'type') === 'dynamic',
            passDetails: 'OK',
            failDetails:
                'The @type attribute is mandatory and must be either "static" or "dynamic".',
        },
        {
            id: 'MPD-5',
            text: 'At most one BaseURL at the MPD level',
            isoRef: 'Clause 5.6',
            severity: 'fail',
            scope: 'MPD',
            category: 'Manifest Structure',
            check: (e) => v(e, 'BaseURL').length <= 1,
            passDetails: 'OK',
            failDetails:
                'The MPD element may contain at most one BaseURL element.',
        },
        {
            id: 'MPDPATCH-1',
            text: 'PatchLocation requires MPD@id and @publishTime',
            isoRef: 'Clause 5.15.2',
            severity: 'fail',
            scope: 'MPD',
            category: 'Live Stream Properties',
            check: (e) =>
                k(e, 'PatchLocation')
                    ? u(e, 'id') !== void 0 && u(e, 'publishTime') !== void 0
                    : 'skip',
            passDetails: 'OK',
            failDetails:
                'When <PatchLocation> is present, the <MPD> element must have both an @id and a @publishTime attribute.',
        },
        {
            id: 'LIVE-1',
            text: 'Dynamic MPD has @availabilityStartTime',
            isoRef: 'Clause 5.3.1.2, Table 3',
            severity: 'fail',
            scope: 'MPD',
            category: 'Live Stream Properties',
            check: (e, { isDynamic: t }) =>
                t ? u(e, 'availabilityStartTime') !== void 0 : 'skip',
            passDetails: 'OK',
            failDetails: 'Required for dynamic MPDs.',
        },
        {
            id: 'LIVE-2',
            text: 'Dynamic MPD has @publishTime',
            isoRef: 'Clause 5.3.1.2, Table 3',
            severity: 'fail',
            scope: 'MPD',
            category: 'Live Stream Properties',
            check: (e, { isDynamic: t }) =>
                t ? u(e, 'publishTime') !== void 0 : 'skip',
            passDetails: 'OK',
            failDetails: 'Required for dynamic MPDs.',
        },
        {
            id: 'LIVE-3',
            text: 'Dynamic MPD has @minimumUpdatePeriod',
            isoRef: 'Clause 5.3.1.2, Table 3',
            severity: 'warn',
            scope: 'MPD',
            category: 'Live Stream Properties',
            check: (e, { isDynamic: t }) =>
                t ? u(e, 'minimumUpdatePeriod') !== void 0 : 'skip',
            passDetails: 'OK',
            failDetails:
                'Recommended for dynamic MPDs to signal update frequency.',
        },
        {
            id: 'STATIC-1',
            text: 'Static MPD has a defined duration',
            isoRef: 'Clause 5.3.1.2, Table 3',
            severity: 'fail',
            scope: 'MPD',
            category: 'Manifest Structure',
            check: (e, { isDynamic: t }) => {
                if (t) return 'skip';
                let n = u(e, 'mediaPresentationDuration') !== void 0,
                    i = v(e, 'Period'),
                    r = i[i.length - 1],
                    a = r ? u(r, 'duration') !== void 0 : !1;
                return n || a;
            },
            passDetails: 'OK',
            failDetails:
                'Static MPDs must have @mediaPresentationDuration or the last Period must have a @duration.',
        },
        {
            id: 'STATIC-2',
            text: 'Static MPD does not have @minimumUpdatePeriod',
            isoRef: 'Clause 5.3.1.2, Table 3',
            severity: 'fail',
            scope: 'MPD',
            category: 'Manifest Structure',
            check: (e, { isDynamic: t }) =>
                t ? 'skip' : u(e, 'minimumUpdatePeriod') === void 0,
            passDetails: 'OK',
            failDetails: 'Should not be present for static MPDs.',
        },
        {
            id: 'STATIC-3',
            text: 'Static MPD does not have @timeShiftBufferDepth',
            isoRef: 'Clause 5.3.1.2, Table 3',
            severity: 'fail',
            scope: 'MPD',
            category: 'Manifest Structure',
            check: (e, { isDynamic: t }) =>
                t ? 'skip' : u(e, 'timeShiftBufferDepth') === void 0,
            passDetails: 'OK',
            failDetails: 'Should not be present for static MPDs.',
        },
        {
            id: 'PERIOD-1',
            text: 'Dynamic Period has @id',
            isoRef: 'Clause 5.3.2.2, Table 4',
            severity: 'fail',
            scope: 'Period',
            category: 'Live Stream Properties',
            check: (e, { isDynamic: t }) =>
                t ? u(e, 'id') !== void 0 : 'skip',
            passDetails: 'OK',
            failDetails: (e) =>
                `Period (start="${u(e, 'start')}") requires an @id in dynamic manifests.`,
        },
        {
            id: 'PERIOD-2',
            text: 'Period contains at least one AdaptationSet',
            isoRef: 'Clause 5.3.2.2, Table 4',
            severity: 'warn',
            scope: 'Period',
            category: 'Manifest Structure',
            check: (e) => {
                let t = u(e, 'duration');
                return (
                    v(e, 'AdaptationSet').length > 0 ||
                    t === 'PT0S' ||
                    t === '0'
                );
            },
            passDetails: 'OK',
            failDetails:
                'A Period should contain at least one AdaptationSet unless its duration is 0.',
        },
        {
            id: 'PERIOD-3',
            text: 'EventStream requires @schemeIdUri',
            isoRef: 'Clause 5.10.2, Table 24',
            severity: 'fail',
            scope: 'Period',
            category: 'Manifest Structure',
            check: (e) => {
                let t = v(e, 'EventStream');
                return t.length === 0
                    ? 'skip'
                    : t.every((n) => u(n, 'schemeIdUri'));
            },
            passDetails: 'OK',
            failDetails:
                'All EventStream elements must have a schemeIdUri attribute.',
        },
        {
            id: 'AS-1',
            text: 'AdaptationSet has @contentType or @mimeType',
            isoRef: 'Clause 5.3.3.2, Table 5',
            severity: 'warn',
            scope: 'AdaptationSet',
            category: 'General Best Practices',
            check: (e) =>
                u(e, 'contentType') !== void 0 || u(e, 'mimeType') !== void 0,
            passDetails: 'OK',
            failDetails: 'Recommended for clear track identification.',
        },
        {
            id: 'AS-2',
            text: 'AdaptationSet with multiple Representations uses Segment Alignment',
            isoRef: 'Clause 5.3.3.2, Table 5',
            severity: 'warn',
            scope: 'AdaptationSet',
            category: 'General Best Practices',
            check: (e) =>
                v(e, 'Representation').length > 1
                    ? u(e, 'segmentAlignment') === 'true' ||
                      u(e, 'segmentAlignment') === 1
                    : 'skip',
            passDetails: 'OK',
            failDetails: 'Recommended for seamless ABR switching.',
        },
        {
            id: 'REP-1',
            text: 'Representation has mandatory @id',
            isoRef: 'Clause 5.3.5.2, Table 9',
            severity: 'fail',
            scope: 'Representation',
            category: 'Manifest Structure',
            check: (e) => u(e, 'id') !== void 0,
            passDetails: 'OK',
            failDetails: 'Representation @id is mandatory.',
        },
        {
            id: 'REP-2',
            text: 'Representation has mandatory @bandwidth',
            isoRef: 'Clause 5.3.5.2, Table 9',
            severity: 'fail',
            scope: 'Representation',
            category: 'Manifest Structure',
            check: (e) => u(e, 'bandwidth') !== void 0,
            passDetails: 'OK',
            failDetails: 'Representation @bandwidth is mandatory.',
        },
        {
            id: 'REP-3',
            text: 'Representation has an effective @mimeType',
            isoRef: 'Clause 5.3.7.2, Table 14',
            severity: 'fail',
            scope: 'Representation',
            category: 'Manifest Structure',
            check: (e, { adaptationSet: t }) =>
                u(e, 'mimeType') !== void 0 || u(t, 'mimeType') !== void 0,
            passDetails: 'OK',
            failDetails:
                'Representation @mimeType must be present on the Representation or inherited from the AdaptationSet.',
        },
        {
            id: 'REP-4',
            text: 'Representation @dependencyId is valid',
            isoRef: 'Clause 5.3.5.2, Table 9',
            severity: 'warn',
            scope: 'Representation',
            category: 'Manifest Structure',
            check: (e, { allRepIdsInPeriod: t }) => {
                let n = u(e, 'dependencyId');
                return n ? n.split(' ').every((i) => t.has(i)) : 'skip';
            },
            passDetails: 'OK',
            failDetails: (e) =>
                `One or more IDs in @dependencyId="${u(e, 'dependencyId')}" do not exist in this Period.`,
        },
        {
            id: 'SEGMENT-1',
            text: 'Representation has exactly one segment information type',
            isoRef: 'Clause 5.3.9.1',
            severity: 'fail',
            scope: 'Representation',
            category: 'Segment & Timing Info',
            check: (e) =>
                [
                    k(e, 'SegmentBase'),
                    k(e, 'SegmentList'),
                    k(e, 'SegmentTemplate'),
                ].filter(Boolean).length <= 1,
            passDetails: 'OK',
            failDetails:
                'A Representation can only contain one of SegmentBase, SegmentList, or SegmentTemplate directly.',
        },
        {
            id: 'SEGMENT-2',
            text: 'SegmentTemplate with $Number$ has duration info',
            isoRef: 'Clause 5.3.9.5.3',
            severity: 'fail',
            scope: 'Representation',
            category: 'Segment & Timing Info',
            check: (e, { adaptationSet: t, period: n }) => {
                let r = J('SegmentTemplate', [e, t, n]),
                    a = u(r, 'media');
                return !r || !a?.includes('$Number$')
                    ? 'skip'
                    : u(r, 'duration') !== void 0 || !!k(r, 'SegmentTimeline');
            },
            passDetails: 'OK',
            failDetails:
                'When using $Number$, either @duration must be specified or a SegmentTimeline must be present.',
        },
        {
            id: 'SEGMENT-3',
            text: 'SegmentTemplate with $Time$ has SegmentTimeline',
            isoRef: 'Clause 5.3.9.4.4, Table 21',
            severity: 'fail',
            scope: 'Representation',
            category: 'Segment & Timing Info',
            check: (e, { adaptationSet: t, period: n }) => {
                let r = J('SegmentTemplate', [e, t, n]);
                return !r || !u(r, 'media')?.includes('$Time$')
                    ? 'skip'
                    : !!k(r, 'SegmentTimeline');
            },
            passDetails: 'OK',
            failDetails:
                'When using $Time$, a SegmentTimeline must be present within the SegmentTemplate.',
        },
        {
            id: 'PROFILE-ONDEMAND-1',
            text: 'On-Demand profile requires MPD@type="static"',
            isoRef: 'Clause 8.3.2',
            severity: 'fail',
            scope: 'MPD',
            category: 'Profile Conformance',
            check: (e, { profiles: t }) =>
                t.includes('urn:mpeg:dash:profile:isoff-on-demand:2011')
                    ? u(e, 'type') === 'static'
                    : 'skip',
            passDetails: 'OK',
            failDetails: (e) =>
                `Profile requires 'static', but found '${u(e, 'type')}'`,
        },
        {
            id: 'PROFILE-LIVE-1',
            text: 'Live profile requires SegmentTemplate',
            isoRef: 'Clause 8.4.2',
            severity: 'fail',
            scope: 'Representation',
            category: 'Profile Conformance',
            check: (e, { profiles: t, adaptationSet: n, period: i }) =>
                t.includes('urn:mpeg:dash:profile:isoff-live:2011')
                    ? !!(
                          k(e, 'SegmentTemplate') ||
                          k(n, 'SegmentTemplate') ||
                          k(i, 'SegmentTemplate')
                      )
                    : 'skip',
            passDetails: 'OK',
            failDetails: 'SegmentTemplate must be used in this profile.',
        },
        {
            id: 'PROFILE-CMAF-1',
            text: "CMAF profile requires 'cmfc' or 'cmf2' brand",
            isoRef: 'Clause 8.12.4.3',
            severity: 'fail',
            scope: 'AdaptationSet',
            category: 'Profile Conformance',
            check: (e, { profiles: t }) => {
                if (!t.includes('urn:mpeg:dash:profile:cmaf:2019'))
                    return 'skip';
                let n = u(e, 'mimeType');
                if (n !== 'video/mp4' && n !== 'audio/mp4') return 'skip';
                let i = u(e, 'containerProfiles') || '';
                return i.includes('cmfc') || i.includes('cmf2');
            },
            passDetails: 'OK',
            failDetails:
                'AdaptationSet is missing a CMAF structural brand in @containerProfiles.',
        },
        {
            id: 'LL-1',
            text: 'Latency element requires target attribute',
            isoRef: 'Annex K.3.2.2',
            severity: 'fail',
            scope: 'AdaptationSet',
            category: 'Live Stream Properties',
            check: (e) => {
                let t = k(e, 'ServiceDescription');
                if (!t) return 'skip';
                let n = k(t, 'Latency');
                return n ? u(n, 'target') !== void 0 : 'skip';
            },
            passDetails: 'OK',
            failDetails: 'The <Latency> element must have a @target attribute.',
        },
    ];
    var te = [
        {
            id: 'HLS-1',
            text: 'Playlist must start with #EXTM3U',
            isoRef: 'RFC 8216bis, 4.4.1.1',
            severity: 'fail',
            scope: 'Playlist',
            category: 'HLS Structure',
            check: (e) => e.raw && e.raw.trim().startsWith('#EXTM3U'),
            passDetails: 'OK',
            failDetails: 'The playlist must begin with the #EXTM3U tag.',
        },
        {
            id: 'HLS-2',
            text: 'Playlist must contain no more than one EXT-X-VERSION tag',
            isoRef: 'RFC 8216bis, 4.4.1.2',
            severity: 'fail',
            scope: 'Playlist',
            category: 'HLS Structure',
            check: (e) =>
                e.tags.filter((t) => t.name === 'EXT-X-VERSION').length <= 1,
            passDetails: 'OK',
            failDetails:
                'A playlist MUST NOT contain more than one EXT-X-VERSION tag.',
        },
        {
            id: 'HLS-5',
            text: 'Playlist must not mix Media and Master tags',
            isoRef: 'RFC 8216bis, 4.2 & 4.4.4',
            severity: 'fail',
            scope: 'Playlist',
            category: 'HLS Structure',
            check: (e) => !(e.isMaster && e.segments.length > 0),
            passDetails: 'OK',
            failDetails:
                'A playlist cannot be both a Media Playlist (with segments) and a Master Playlist (with variants).',
        },
        {
            id: 'HLS-VAR-1',
            text: 'EXT-X-DEFINE tag must contain NAME attribute',
            isoRef: 'RFC 8216bis, 4.4.2.3',
            severity: 'fail',
            scope: 'Playlist',
            category: 'HLS Structure',
            check: (e) => {
                let t = e.tags.filter((n) => n.name === 'EXT-X-DEFINE');
                return t.length === 0
                    ? 'skip'
                    : t.every((n) => n.value.NAME !== void 0);
            },
            passDetails: 'OK',
            failDetails: 'Every EXT-X-DEFINE tag MUST have a NAME attribute.',
        },
        {
            id: 'HLS-MEDIA-1',
            text: 'Media Playlist must contain an EXT-X-TARGETDURATION tag',
            isoRef: 'RFC 8216bis, 4.4.3.1',
            severity: 'fail',
            scope: 'MediaPlaylist',
            category: 'HLS Structure',
            check: (e) =>
                e.targetDuration !== void 0 && e.targetDuration !== null,
            passDetails: 'OK',
            failDetails:
                'The EXT-X-TARGETDURATION tag is REQUIRED for Media Playlists.',
        },
        {
            id: 'HLS-MEDIA-2',
            text: 'Live Media Playlist must not contain EXT-X-ENDLIST',
            isoRef: 'RFC 8216bis, 4.4.3.5',
            severity: 'fail',
            scope: 'MediaPlaylist',
            category: 'Live Stream Properties',
            check: (e, { isLive: t }) =>
                t ? !e.tags.some((n) => n.name === 'EXT-X-ENDLIST') : 'skip',
            passDetails: 'OK',
            failDetails:
                'A live Media Playlist MUST NOT contain the EXT-X-ENDLIST tag.',
        },
        {
            id: 'HLS-MEDIA-3',
            text: 'Live Media Playlist should have EXT-X-MEDIA-SEQUENCE',
            isoRef: 'RFC 8216bis, 4.4.3.2',
            severity: 'warn',
            scope: 'MediaPlaylist',
            category: 'Live Stream Properties',
            check: (e, { isLive: t }) =>
                t
                    ? e.tags.some((n) => n.name === 'EXT-X-MEDIA-SEQUENCE')
                    : 'skip',
            passDetails: 'OK',
            failDetails:
                'For live playlists, EXT-X-MEDIA-SEQUENCE is essential for clients to reload the playlist correctly.',
        },
        {
            id: 'HLS-MEDIA-4',
            text: 'VOD playlist implies EXT-X-ENDLIST must be present',
            isoRef: 'RFC 8216bis, 4.4.3.5',
            severity: 'fail',
            scope: 'MediaPlaylist',
            category: 'HLS Structure',
            check: (e) =>
                e.playlistType === 'VOD' || !e.isLive
                    ? e.tags.some((t) => t.name === 'EXT-X-ENDLIST')
                    : 'skip',
            passDetails: 'OK',
            failDetails:
                'A VOD or non-live playlist MUST contain the EXT-X-ENDLIST tag.',
        },
        {
            id: 'LL-HLS-1',
            text: 'LL-HLS requires EXT-X-PART-INF if PARTs are present',
            isoRef: 'RFC 8216bis, 4.4.3.7',
            severity: 'fail',
            scope: 'MediaPlaylist',
            category: 'Profile Conformance',
            check: (e) =>
                !e.segments.some((n) => n.parts && n.parts.length > 0) &&
                !e.preloadHints.some((n) => n.TYPE === 'PART')
                    ? 'skip'
                    : !!e.partInf,
            passDetails: 'OK, EXT-X-PART-INF is present as required.',
            failDetails:
                'The playlist contains PARTs or PART hints but is missing the required EXT-X-PART-INF tag.',
        },
        {
            id: 'LL-HLS-2',
            text: 'LL-HLS requires EXT-X-SERVER-CONTROL tag',
            isoRef: 'RFC 8216bis, 4.4.3.8',
            severity: 'fail',
            scope: 'MediaPlaylist',
            category: 'Profile Conformance',
            check: (e) => (e.partInf ? !!e.serverControl : 'skip'),
            passDetails: 'OK, EXT-X-SERVER-CONTROL is present.',
            failDetails:
                'Low-Latency HLS playlists MUST contain an EXT-X-SERVER-CONTROL tag to enable client optimizations.',
        },
        {
            id: 'LL-HLS-3',
            text: 'LL-HLS requires a PART-HOLD-BACK attribute',
            isoRef: 'RFC 8216bis, 4.4.3.8',
            severity: 'fail',
            scope: 'MediaPlaylist',
            category: 'Profile Conformance',
            check: (e) =>
                e.partInf
                    ? e.serverControl &&
                      e.serverControl['PART-HOLD-BACK'] !== void 0
                    : 'skip',
            passDetails: 'OK, PART-HOLD-BACK is specified.',
            failDetails:
                'Playlists containing PARTs must specify a PART-HOLD-BACK attribute in the EXT-X-SERVER-CONTROL tag.',
        },
        {
            id: 'LL-HLS-4',
            text: 'LL-HLS PART-HOLD-BACK must be >= 2x PART-TARGET',
            isoRef: 'RFC 8216bis, 4.4.3.8',
            severity: 'fail',
            scope: 'MediaPlaylist',
            category: 'Profile Conformance',
            check: (e) => {
                if (
                    !e.partInf?.['PART-TARGET'] ||
                    !e.serverControl?.['PART-HOLD-BACK']
                )
                    return 'skip';
                let t = e.serverControl['PART-HOLD-BACK'],
                    n = e.partInf['PART-TARGET'];
                return t >= 2 * n;
            },
            passDetails: 'OK, PART-HOLD-BACK is a valid duration.',
            failDetails: (e) =>
                `PART-HOLD-BACK (${e.serverControl['PART-HOLD-BACK']}s) must be at least twice the PART-TARGET (${e.partInf['PART-TARGET']}s).`,
        },
        {
            id: 'LL-HLS-5',
            text: 'LL-HLS requires EXT-X-PROGRAM-DATE-TIME tags',
            isoRef: 'RFC 8216bis, B.1',
            severity: 'fail',
            scope: 'MediaPlaylist',
            category: 'Profile Conformance',
            check: (e) =>
                e.partInf ? e.segments.some((t) => t.dateTime) : 'skip',
            passDetails: 'OK, at least one PDT tag is present.',
            failDetails:
                'The Low-Latency HLS profile requires EXT-X-PROGRAM-DATE-TIME tags for precise synchronization.',
        },
        {
            id: 'LL-HLS-6',
            text: 'LL-HLS requires EXT-X-PRELOAD-HINT for the next Partial Segment',
            isoRef: 'RFC 8216bis, B.1',
            severity: 'fail',
            scope: 'MediaPlaylist',
            category: 'Profile Conformance',
            check: (e) =>
                !e.partInf || !e.isLive
                    ? 'skip'
                    : e.preloadHints.some((t) => t.TYPE === 'PART'),
            passDetails: 'OK, a preload hint for a partial segment was found.',
            failDetails:
                'The Low-Latency HLS profile requires a preload hint for the next expected partial segment to reduce latency.',
        },
        {
            id: 'LL-HLS-7',
            text: 'LL-HLS requires EXT-X-RENDITION-REPORT tags in media playlists',
            isoRef: 'RFC 8216bis, B.1',
            severity: 'fail',
            scope: 'MediaPlaylist',
            category: 'Profile Conformance',
            check: (e) =>
                !e.partInf || !e.isLive
                    ? 'skip'
                    : e.renditionReports.length > 0,
            passDetails: 'OK, rendition reports are present.',
            failDetails:
                'The Low-Latency HLS profile requires rendition reports in each media playlist to avoid tune-in delays.',
        },
        {
            id: 'HLS-RENDITION-REPORT-VALID',
            text: 'Rendition Reports must be accurate',
            isoRef: 'RFC 8216bis, 4.4.5.4',
            severity: 'fail',
            scope: 'MasterPlaylist',
            category: 'Interoperability',
            check: (e, t) => {
                let n = t.stream?.semanticData?.get(
                    'renditionReportValidation'
                );
                return !n || n.length === 0
                    ? 'skip'
                    : n.every((i) => i.isValid);
            },
            passDetails:
                'All Rendition Reports accurately reflect the state of their respective Media Playlists.',
            failDetails: (e, t) =>
                `One or more Rendition Reports are stale or incorrect. ${t.stream?.semanticData
                    ?.get('renditionReportValidation')
                    .filter((r) => !r.isValid)
                    .map((r) =>
                        r.error
                            ? `Report for ${r.uri}: ${r.error}`
                            : `Report for ${r.uri}: Reported MSN/Part ${r.reportedMsn}/${r.reportedPart}, Actual ${r.actualMsn}/${r.actualPart}`
                    )
                    .join('; ')}`,
        },
        {
            id: 'HLS-MASTER-1',
            text: 'Master Playlist must contain at least one EXT-X-STREAM-INF tag',
            isoRef: 'RFC 8216bis, 4.2',
            severity: 'fail',
            scope: 'MasterPlaylist',
            category: 'HLS Structure',
            check: (e) => e.variants && e.variants.length > 0,
            passDetails: 'OK',
            failDetails:
                'A Master Playlist must list at least one Variant Stream.',
        },
        {
            id: 'HLS-VARIANT-1',
            text: 'EXT-X-STREAM-INF must have a BANDWIDTH attribute',
            isoRef: 'RFC 8216bis, 4.4.6.2',
            severity: 'fail',
            scope: 'Variant',
            category: 'HLS Structure',
            check: (e) => e.attributes && e.attributes.BANDWIDTH !== void 0,
            passDetails: 'OK',
            failDetails:
                'Every EXT-X-STREAM-INF tag MUST include the BANDWIDTH attribute.',
        },
        {
            id: 'HLS-VARIANT-2',
            text: 'EXT-X-STREAM-INF should have CODECS or RESOLUTION',
            isoRef: 'RFC 8216bis, 4.4.6.2',
            severity: 'warn',
            scope: 'Variant',
            category: 'Interoperability',
            check: (e) =>
                e.attributes.RESOLUTION !== void 0 ||
                e.attributes.CODECS !== void 0,
            passDetails: 'OK',
            failDetails:
                'At least one of RESOLUTION or CODECS should be present for a client to make an informed selection.',
        },
        {
            id: 'HLS-VARIANT-3',
            text: 'EXT-X-STREAM-INF must be followed by a URI',
            isoRef: 'RFC 8216bis, 4.4.6.2',
            severity: 'fail',
            scope: 'Variant',
            category: 'HLS Structure',
            check: (e) => e.uri && e.uri.trim() !== '',
            passDetails: 'OK',
            failDetails:
                'The EXT-X-STREAM-INF tag must be followed by the URI of its Media Playlist on the next line.',
        },
        {
            id: 'HLS-SEGMENT-1',
            text: 'Each Media Segment must be preceded by an EXTINF tag',
            isoRef: 'RFC 8216bis, 4.4.2.1',
            severity: 'fail',
            scope: 'Segment',
            category: 'HLS Structure',
            check: (e) => e.duration !== void 0,
            passDetails: 'OK',
            failDetails: 'The EXTINF tag is REQUIRED for each Media Segment.',
        },
        {
            id: 'HLS-SEGMENT-2',
            text: 'EXTINF duration must be <= target duration (integer)',
            isoRef: 'RFC 8216bis, 4.4.3.1',
            severity: 'fail',
            scope: 'Segment',
            category: 'Segment & Timing Info',
            check: (e, { targetDuration: t }) =>
                t === null ? 'skip' : Math.round(e.duration) <= t,
            passDetails: 'OK',
            failDetails: (e, { targetDuration: t }) =>
                `Segment duration (${e.duration}s) rounded to the nearest integer (${Math.round(e.duration)}s) MUST be <= the target duration (${t}s).`,
        },
        {
            id: 'HLS-SEGMENT-3',
            text: 'EXTINF duration should be <= target duration (float)',
            isoRef: 'RFC 8216bis, 4.4.3.1',
            severity: 'warn',
            scope: 'Segment',
            category: 'Segment & Timing Info',
            check: (e, { targetDuration: t }) =>
                t === null ? 'skip' : e.duration <= t,
            passDetails: 'OK',
            failDetails: (e, { targetDuration: t }) =>
                `Segment duration (${e.duration}s) is greater than the target duration (${t}s), which can cause playback issues.`,
        },
        {
            id: 'HLS-KEY-1',
            text: 'EXT-X-KEY must have a URI if method is not NONE',
            isoRef: 'RFC 8216bis, 4.4.2.4',
            severity: 'fail',
            scope: 'Key',
            category: 'Encryption',
            check: (e) => e.METHOD === 'NONE' || (e.METHOD !== 'NONE' && e.URI),
            passDetails: 'OK',
            failDetails:
                'The URI attribute is REQUIRED for EXT-X-KEY unless the METHOD is NONE.',
        },
    ];
    G();
    function qe(e, t, n = {}) {
        if (t === 'hls') {
            let f = e;
            if (!f || typeof f.isMaster != 'boolean')
                return [
                    {
                        text: 'HLS Playlist must be a valid object',
                        status: 'fail',
                        details:
                            'The HLS parser did not return a valid object.',
                        isoRef: 'N/A',
                        category: 'HLS Structure',
                        location: { startLine: 1, endLine: 1 },
                    },
                ];
            let d = [],
                p = f.type === 'dynamic',
                m = f.hls?.version || 1,
                _ = f.hls?.targetDuration || null,
                x = {
                    isLive: p,
                    version: m,
                    targetDuration: _,
                    hlsParsed: f,
                    ...n,
                },
                y = (g, S, T = '') => {
                    let I = g.check(S, x);
                    if (I !== 'skip') {
                        let C = I ? 'pass' : g.severity,
                            D = {
                                startLine:
                                    S.extinfLineNumber || S.lineNumber || 1,
                                endLine: S.uriLineNumber || S.lineNumber || 1,
                            };
                        d.push({
                            id: g.id,
                            text: `${g.text} ${T}`,
                            status: C,
                            details: I ? g.passDetails : g.failDetails,
                            isoRef: g.isoRef,
                            category: g.category,
                            location: D,
                        });
                    }
                },
                b = ['Playlist'];
            if (
                (f.isMaster
                    ? b.push('MasterPlaylist')
                    : b.push('MediaPlaylist'),
                te.filter((g) => b.includes(g.scope)).forEach((g) => y(g, f)),
                f.isMaster ||
                    ((f.segments || []).forEach((g, S) => {
                        te.filter((T) => T.scope === 'Segment').forEach((T) =>
                            y(T, g, `(Segment ${S + 1})`)
                        );
                    }),
                    (f.tags || [])
                        .filter((g) => g.name === 'EXT-X-KEY')
                        .forEach((g, S) => {
                            let T = { ...g.value, lineNumber: g.lineNumber };
                            te.filter((I) => I.scope === 'Key').forEach((I) =>
                                y(I, T, `(Key ${S + 1}, Method: ${T.METHOD})`)
                            );
                        })),
                f.isMaster)
            ) {
                ((f.variants || []).forEach((S, T) => {
                    te.filter((I) => I.scope === 'Variant').forEach((I) =>
                        y(
                            I,
                            S,
                            `(Variant Stream ${T + 1}, BW: ${S.attributes?.BANDWIDTH || 'N/A'})`
                        )
                    );
                }),
                    (f.tags || [])
                        .filter((S) => S.name === 'EXT-X-I-FRAME-STREAM-INF')
                        .forEach((S, T) => {
                            let I = { ...S.value, lineNumber: S.lineNumber };
                            te.filter(
                                (C) => C.scope === 'IframeVariant'
                            ).forEach((C) =>
                                y(
                                    C,
                                    I,
                                    `(I-Frame Stream ${T + 1}, BW: ${I?.BANDWIDTH || 'N/A'})`
                                )
                            );
                        }));
                let g = {};
                ((f.tags.filter((S) => S.name === 'EXT-X-MEDIA') || []).forEach(
                    (S) => {
                        let T = S.value['GROUP-ID'],
                            I = S.value.TYPE;
                        (g[I] || (g[I] = {}),
                            g[I][T] || (g[I][T] = []),
                            g[I][T].push({
                                ...S.value,
                                lineNumber: S.lineNumber,
                            }));
                    }
                ),
                    Object.values(g).forEach((S) => {
                        Object.values(S).forEach((T, I) => {
                            te.filter((C) => C.scope === 'MediaGroup').forEach(
                                (C) =>
                                    y(
                                        C,
                                        T,
                                        `(Media Group ${I + 1}, ID: ${T[0]?.['GROUP-ID'] || 'N/A'}, Type: ${T[0]?.TYPE || 'N/A'})`
                                    )
                            );
                        });
                    }));
            }
            return d;
        }
        let i = e,
            r = 'MPD[0]';
        if (!i || typeof i[':@'] != 'object') {
            let f = oe.find((d) => d.id === 'MPD-1');
            return [
                {
                    text: f.text,
                    status: f.severity,
                    details: f.failDetails,
                    isoRef: f.isoRef,
                    category: f.category,
                    location: { path: r },
                },
            ];
        }
        let a = [],
            o = u(i, 'type') === 'dynamic',
            s = (u(i, 'profiles') || '').toLowerCase(),
            l = { isDynamic: o, profiles: s },
            c = (f, d, p) => (typeof f == 'function' ? f(d, p) : f);
        return (
            oe
                .filter((f) => f.scope === 'MPD')
                .forEach((f) => {
                    let d = f.check(i, l);
                    if (d !== 'skip') {
                        let p = d ? 'pass' : f.severity;
                        a.push({
                            id: f.id,
                            text: f.text,
                            status: p,
                            details: c(d ? f.passDetails : f.failDetails, i, l),
                            isoRef: f.isoRef,
                            category: f.category,
                            location: { path: r },
                        });
                    }
                }),
            v(i, 'Period').forEach((f, d) => {
                let p = `${r}.Period[${d}]`,
                    m = new Set(
                        E(f, 'Representation')
                            .map((x) => u(x, 'id'))
                            .filter(Boolean)
                    ),
                    _ = { ...l, allRepIdsInPeriod: m, period: f };
                (oe
                    .filter((x) => x.scope === 'Period')
                    .forEach((x) => {
                        let y = x.check(f, _);
                        if (y !== 'skip') {
                            let b = y ? 'pass' : x.severity;
                            a.push({
                                id: x.id,
                                text: `${x.text} (Period: ${u(f, 'id') || 'N/A'})`,
                                status: b,
                                details: c(
                                    y ? x.passDetails : x.failDetails,
                                    f,
                                    _
                                ),
                                isoRef: x.isoRef,
                                category: x.category,
                                location: { path: p },
                            });
                        }
                    }),
                    v(f, 'AdaptationSet').forEach((x, y) => {
                        let b = `${p}.AdaptationSet[${y}]`,
                            g = { ..._, adaptationSet: x };
                        (oe
                            .filter((S) => S.scope === 'AdaptationSet')
                            .forEach((S) => {
                                let T = S.check(x, g);
                                if (T !== 'skip') {
                                    let I = T ? 'pass' : S.severity;
                                    a.push({
                                        id: S.id,
                                        text: `${S.text} (AdaptationSet: ${u(x, 'id') || 'N/A'})`,
                                        status: I,
                                        details: c(
                                            T ? S.passDetails : S.failDetails,
                                            x,
                                            g
                                        ),
                                        isoRef: S.isoRef,
                                        category: S.category,
                                        location: { path: b },
                                    });
                                }
                            }),
                            v(x, 'Representation').forEach((S, T) => {
                                let I = `${b}.Representation[${T}]`,
                                    C = { ...g, representation: S };
                                oe.filter(
                                    (D) => D.scope === 'Representation'
                                ).forEach((D) => {
                                    let M = D.check(S, C);
                                    if (M !== 'skip') {
                                        let A = M ? 'pass' : D.severity;
                                        a.push({
                                            id: D.id,
                                            text: `${D.text} (Representation: ${u(S, 'id') || 'N/A'})`,
                                            status: A,
                                            details: c(
                                                M
                                                    ? D.passDetails
                                                    : D.failDetails,
                                                S,
                                                C
                                            ),
                                            isoRef: D.isoRef,
                                            category: D.category,
                                            location: { path: I },
                                        });
                                    }
                                });
                            }));
                    }));
            }),
            a
        );
    }
    function Ho(e, t) {
        let n = t.tags.find((o) => o.name === 'EXT-X-SKIP');
        if (!n) return t;
        let i = n.value['SKIPPED-SEGMENTS'],
            r = JSON.parse(JSON.stringify(e));
        ((r.mediaSequence = t.mediaSequence),
            (r.discontinuitySequence = t.discontinuitySequence),
            (r.playlistType = t.playlistType));
        let a = r.segments.length;
        return (
            (r.segments = r.segments.slice(a - (a - i))),
            r.segments.push(...t.segments),
            (r.tags = t.tags.filter((o) => o.name !== 'EXT-X-SKIP')),
            (r.targetDuration = t.targetDuration),
            (r.partInf = t.partInf),
            (r.serverControl = t.serverControl),
            (r.isLive = t.isLive),
            r
        );
    }
    function Xo(e) {
        let t = ['#EXTM3U'];
        if (
            (e.version > 1 && t.push(`#EXT-X-VERSION:${e.version}`),
            e.targetDuration &&
                t.push(`#EXT-X-TARGETDURATION:${e.targetDuration}`),
            e.mediaSequence &&
                t.push(`#EXT-X-MEDIA-SEQUENCE:${e.mediaSequence}`),
            e.partInf &&
                t.push(
                    `#EXT-X-PART-INF:PART-TARGET=${e.partInf['PART-TARGET']}`
                ),
            e.serverControl)
        ) {
            let i = Object.entries(e.serverControl)
                .map(([r, a]) => `${r}=${a}`)
                .join(',');
            t.push(`#EXT-X-SERVER-CONTROL:${i}`);
        }
        let n = null;
        return (
            e.segments.forEach((i) => {
                if (
                    (i.discontinuity && t.push('#EXT-X-DISCONTINUITY'),
                    i.key && JSON.stringify(i.key) !== JSON.stringify(n))
                ) {
                    let r = Object.entries(i.key)
                        .map(([a, o]) => `${a}="${o}"`)
                        .join(',');
                    (t.push(`#EXT-X-KEY:${r}`), (n = i.key));
                }
                (i.dateTime && t.push(`#EXT-X-PROGRAM-DATE-TIME:${i.dateTime}`),
                    t.push(`#EXTINF:${i.duration.toFixed(5)},${i.title || ''}`),
                    i.uri && t.push(i.uri),
                    i.parts.forEach((r) => {
                        let a = Object.entries(r)
                            .map(([o, s]) => `${o}="${s}"`)
                            .join(',');
                        t.push(`#EXT-X-PART:${a}`);
                    }));
            }),
            e.isLive || t.push('#EXT-X-ENDLIST'),
            t.join(`
`)
        );
    }
    async function Go(e) {
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
                manifest: _,
                definedVariables: x,
                baseUrl: y,
            } = await se(e.manifestString, e.url);
            ((n = _),
                (i = _.serializedManifest),
                (n.hlsDefinedVariables = x),
                (r = y));
        } else {
            let {
                manifest: _,
                serializedManifest: x,
                baseUrl: y,
            } = await Ke(e.manifestString, e.url);
            ((n = _), (i = x), (r = y));
        }
        let { generateFeatureAnalysis: a } = await Promise.resolve().then(
                () => (Ra(), Ma)
            ),
            o = a(n, e.protocol, i),
            s = new Map(Object.entries(o)),
            { diffManifest: l } = await Promise.resolve().then(
                () => (Wa(), ja)
            ),
            c = (await Promise.resolve().then(() => fs(ns()))).default,
            f = null;
        e.protocol === 'hls' &&
            n.isMaster &&
            (f =
                (n.tags || []).find(
                    (_) => _.name === 'EXT-X-CONTENT-STEERING'
                ) || null);
        let d = e.protocol === 'hls' ? n : i,
            p = qe(d, e.protocol);
        n.serializedManifest = i;
        let m = {
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
            featureAnalysis: { results: s, manifestCount: 1 },
            hlsVariantState: new Map(),
            dashRepresentationState: new Map(),
            hlsDefinedVariables: n.hlsDefinedVariables,
            semanticData: new Map(),
        };
        if (e.protocol === 'hls')
            n.isMaster
                ? (n.variants || []).forEach((_) => {
                      m.hlsVariantState.has(_.resolvedUri) ||
                          m.hlsVariantState.set(_.resolvedUri, {
                              segments: [],
                              freshSegmentUrls: new Set(),
                              isLoading: !1,
                              isPolling: n.type === 'dynamic',
                              isExpanded: !1,
                              displayMode: 'last10',
                              error: null,
                          });
                  })
                : m.hlsVariantState.set(m.originalUrl, {
                      segments: n.segments || [],
                      freshSegmentUrls: new Set(
                          (n.segments || []).map((_) => _.resolvedUrl)
                      ),
                      isLoading: !1,
                      isPolling: n.type === 'dynamic',
                      isExpanded: !0,
                      displayMode: 'last10',
                      error: null,
                  });
        else if (e.protocol === 'dash') {
            let _ = Ia(i, m.baseUrl);
            Object.entries(_).forEach(([x, y]) => {
                m.dashRepresentationState.set(x, {
                    segments: y,
                    freshSegmentUrls: new Set(y.map((b) => b.resolvedUrl)),
                });
            });
        }
        if (m.manifest.type === 'dynamic') {
            let _ = m.rawManifest;
            m.protocol === 'dash' &&
                (_ = c(m.rawManifest, {
                    indentation: '  ',
                    lineSeparator: `
`,
                }));
            let x = l('', _, m.protocol);
            m.manifestUpdates.push({
                timestamp: new Date().toLocaleTimeString(),
                diffHtml: x,
                rawManifest: m.rawManifest,
                complianceResults: p,
                hasNewIssues: !1,
                serializedManifest: i,
            });
        }
        return m;
    }
    async function jo(e) {
        try {
            let t = await Promise.all(e.map(Go));
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
    async function Wo({ streamId: e, url: t, hlsDefinedVariables: n }) {
        try {
            let i = await fetch(t);
            if (!i.ok) throw new Error(`HTTP error ${i.status}`);
            let r = await i.text(),
                { manifest: a } = await se(r, t, n);
            ((a.serializedManifest = null),
                self.postMessage({
                    type: 'hls-media-playlist-fetched',
                    payload: {
                        streamId: e,
                        url: t,
                        manifest: a,
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
    async function Ko({
        streamId: e,
        newManifestString: t,
        oldRawManifest: n,
        protocol: i,
        baseUrl: r,
        hlsDefinedVariables: a,
        oldManifestObjectForDelta: o,
    }) {
        try {
            let s = t,
                l,
                c;
            if (i === 'dash') {
                let { manifest: p, serializedManifest: m } = await Ke(t, r);
                ((l = p), (c = m));
            } else if (t.includes('#EXT-X-SKIP')) {
                let { manifest: p } = await se(t, r, a),
                    m = Ho(o, p.serializedManifest);
                s = Xo(m);
                let { manifest: _ } = await se(s, r, a);
                ((l = _), (c = m));
            } else {
                let { manifest: p } = await se(t, r, a);
                ((l = p), (c = p.serializedManifest));
            }
            let d = qe(i === 'hls' ? l : c, i);
            ((l.serializedManifest = c),
                self.postMessage({
                    type: 'live-update-parsed',
                    payload: {
                        streamId: e,
                        newManifestObject: l,
                        finalManifestString: s,
                        oldRawManifest: n,
                        complianceResults: d,
                        serializedManifest: c,
                    },
                }));
        } catch (s) {
            self.postMessage({
                type: 'live-update-error',
                payload: { streamId: e, error: s.message },
            });
        }
    }
    async function qo(e) {
        let { type: t, payload: n } = e.data;
        switch (t) {
            case 'start-analysis':
                await jo(n.inputs);
                break;
            case 'fetch-hls-media-playlist':
                await Wo(n);
                break;
            case 'parse-live-update':
                await Ko(n);
                break;
            case 'parse-segment': {
                let { url: i, data: r } = n,
                    a = null;
                try {
                    if (
                        (r.byteLength > 188 &&
                            new DataView(r).getUint8(0) === 71 &&
                            new DataView(r).getUint8(188) === 71) ||
                        i.toLowerCase().endsWith('.ts')
                    )
                        a = oa(r);
                    else {
                        let { boxes: s, issues: l, events: c } = Le(r);
                        a = {
                            format: 'isobmff',
                            data: { boxes: s, issues: l, events: c },
                        };
                    }
                    self.postMessage({ url: i, parsedData: a, error: null });
                } catch (o) {
                    self.postMessage({
                        url: i,
                        parsedData: { error: o.message },
                        error: o.message,
                    });
                }
                break;
            }
        }
    }
    self.addEventListener('message', qo);
})();
