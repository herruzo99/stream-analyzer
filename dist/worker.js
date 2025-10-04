(() => {
    var cs = Object.create;
    var we = Object.defineProperty;
    var ds = Object.getOwnPropertyDescriptor;
    var ps = Object.getOwnPropertyNames;
    var us = Object.getPrototypeOf,
        ms = Object.prototype.hasOwnProperty;
    var V = (e, t) => () => (e && (t = e((e = 0))), t);
    var gt = (e, t) => () => (
            t || e((t = { exports: {} }).exports, t),
            t.exports
        ),
        ht = (e, t) => {
            for (var n in t) we(e, n, { get: t[n], enumerable: !0 });
        },
        gs = (e, t, n, i) => {
            if ((t && typeof t == 'object') || typeof t == 'function')
                for (let r of ps(t))
                    !ms.call(e, r) &&
                        r !== n &&
                        we(e, r, {
                            get: () => t[r],
                            enumerable: !(i = ds(t, r)) || i.enumerable,
                        });
            return e;
        };
    var hs = (e, t, n) => (
        (n = e != null ? cs(us(e)) : {}),
        gs(
            t || !e || !e.__esModule
                ? we(n, 'default', { value: e, enumerable: !0 })
                : n,
            e
        )
    );
    function Ce(e) {
        if (!e) return 'Unknown Scheme';
        let t = e.toLowerCase();
        return Bs[t] || `Unknown (${e})`;
    }
    var Bs,
        Fe = V(() => {
            Bs = {
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
    function He(e, t, n = {}) {
        let i = [];
        if (!e || typeof e != 'object') return i;
        for (let r in e) {
            if (r === ':@' || r === '#text') continue;
            let a = e[r];
            if (!a) continue;
            let s = Array.isArray(a) ? a : [a];
            for (let l of s) {
                if (typeof l != 'object') continue;
                let o = { ...n, parent: e };
                (r === 'Period' && (o.period = l),
                    r === 'AdaptationSet' && (o.adaptationSet = l),
                    r === t && i.push({ element: l, context: o }),
                    i.push(...He(l, t, o)));
            }
        }
        return i;
    }
    function se(e, t) {
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
    function Z(e, t) {
        let n = t.map((i) => k(i, e)).filter(Boolean);
        if (n.length !== 0) return n.reduceRight((i, r) => se(i, r));
    }
    function ga(e, t, n, i, r) {
        let a = e,
            s = [t, n, i, r];
        for (let l of s) {
            if (!l) continue;
            let o = v(l, 'BaseURL');
            if (o.length > 0) {
                let c = Ns(o[0]);
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
    var m,
        k,
        v,
        C,
        Ns,
        j = V(() => {
            ((m = (e, t) => e?.[':@']?.[t]),
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
                (C = (e, t) => {
                    let n = [];
                    if (!e || typeof e != 'object') return n;
                    for (let i in e) {
                        if (i === ':@' || i === '#text') continue;
                        let r = e[i];
                        if (!r) continue;
                        let a = Array.isArray(r) ? r : [r];
                        for (let s of a)
                            (i === t && n.push(s),
                                typeof s == 'object' &&
                                    (n = n.concat(C(s, t))));
                    }
                    return n;
                }));
            Ns = (e) => e?.['#text'] || null;
        });
    var Ua,
        Ma = V(() => {
            Ua = [
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
    var Ra,
        La = V(() => {
            Ra = [
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
    function wa(e) {
        let t = {};
        if (!e)
            return {
                Error: {
                    used: !0,
                    details:
                        'Serialized XML object was not found for feature analysis.',
                },
            };
        for (let [n, i] of Object.entries(Uo))
            try {
                t[n] = i(e);
            } catch (r) {
                (console.error(`Error analyzing feature "${n}":`, r),
                    (t[n] = { used: !1, details: 'Analysis failed.' }));
            }
        return t;
    }
    var it,
        q,
        nt,
        Uo,
        Ba = V(() => {
            Fe();
            j();
            ((it = (e, t) => C(e, t)[0]),
                (q = (e, t, n) => (i) => {
                    let r = it(i, e);
                    return { used: !!r, details: r ? t(r) : n };
                }),
                (nt = (e, t, n) => (i) => {
                    let a = C(i, e).length;
                    return a === 0
                        ? { used: !1, details: '' }
                        : {
                              used: !0,
                              details: `${a} ${a === 1 ? t : n} found.`,
                          };
                }),
                (Uo = {
                    'Presentation Type': (e) => ({
                        used: !0,
                        details: `<code>${m(e, 'type')}</code>`,
                    }),
                    'MPD Locations': nt(
                        'Location',
                        'location',
                        'locations provided'
                    ),
                    'Scoped Profiles': (e) => {
                        let t = C(e, 'AdaptationSet'),
                            n = C(e, 'Representation'),
                            i =
                                t.filter((a) => m(a, 'profiles')).length +
                                n.filter((a) => m(a, 'profiles')).length;
                        return i === 0
                            ? { used: !1, details: '' }
                            : {
                                  used: !0,
                                  details: `${i} ${i === 1 ? 'scoped profile' : 'scoped profiles'}`,
                              };
                    },
                    'Multi-Period': nt('Period', 'Period', 'Periods'),
                    'Content Protection': (e) => {
                        let t = C(e, 'ContentProtection');
                        return t.length > 0
                            ? {
                                  used: !0,
                                  details: `Systems: <b>${[...new Set(t.map((i) => Ce(m(i, 'schemeIdUri'))))].join(', ')}</b>`,
                              }
                            : {
                                  used: !1,
                                  details: 'No encryption descriptors found.',
                              };
                    },
                    'Client Authentication': q(
                        'EssentialProperty',
                        () => 'Signals requirement for client authentication.',
                        ''
                    ),
                    'Content Authorization': q(
                        'SupplementalProperty',
                        () => 'Signals requirement for content authorization.',
                        ''
                    ),
                    'Segment Templates': q(
                        'SegmentTemplate',
                        () => 'Uses templates for segment URL generation.',
                        ''
                    ),
                    'Segment Timeline': q(
                        'SegmentTimeline',
                        () =>
                            'Provides explicit segment timing via <code>&lt;S&gt;</code> elements.',
                        ''
                    ),
                    'Segment List': q(
                        'SegmentList',
                        () => 'Provides an explicit list of segment URLs.',
                        ''
                    ),
                    'Representation Index': nt(
                        'RepresentationIndex',
                        'representation index',
                        'representation indices'
                    ),
                    'Low Latency Streaming': (e) => {
                        if (m(e, 'type') !== 'dynamic')
                            return {
                                used: !1,
                                details: 'Not a dynamic (live) manifest.',
                            };
                        let t = !!it(e, 'Latency'),
                            i = C(e, 'SegmentTemplate').some(
                                (r) =>
                                    m(r, 'availabilityTimeComplete') === 'false'
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
                    'Manifest Patch Updates': q(
                        'PatchLocation',
                        (e) =>
                            `Patch location: <code>${e['#text']?.trim()}</code>`,
                        'Uses full manifest reloads.'
                    ),
                    'UTC Timing Source': (e) => {
                        let t = C(e, 'UTCTiming');
                        return t.length > 0
                            ? {
                                  used: !0,
                                  details: `Schemes: ${[...new Set(t.map((i) => `<code>${m(i, 'schemeIdUri').split(':').pop()}</code>`))].join(', ')}`,
                              }
                            : {
                                  used: !1,
                                  details:
                                      'No clock synchronization source provided.',
                              };
                    },
                    'Dependent Representations': (e) => {
                        let t = C(e, 'Representation').filter((n) =>
                            m(n, 'dependencyId')
                        );
                        return t.length > 0
                            ? {
                                  used: !0,
                                  details: `${t.length} dependent Representations`,
                              }
                            : { used: !1, details: '' };
                    },
                    'Associated Representations': (e) => {
                        let t = C(e, 'Representation').filter((n) =>
                            m(n, 'associationId')
                        );
                        return t.length > 0
                            ? { used: !0, details: `${t.length} associations` }
                            : { used: !1, details: '' };
                    },
                    'Trick Modes': (e) => {
                        let t = it(e, 'SubRepresentation'),
                            n = C(e, 'Role').some(
                                (i) => m(i, 'value') === 'trick'
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
                        let t = C(e, 'AdaptationSet').filter(
                            (n) =>
                                m(n, 'contentType') === 'text' ||
                                m(n, 'mimeType')?.startsWith('application')
                        );
                        if (t.length > 0) {
                            let n = [
                                ...new Set(
                                    t.map((i) => m(i, 'lang')).filter(Boolean)
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
                        let t = C(e, 'Role');
                        return t.length > 0
                            ? {
                                  used: !0,
                                  details: `Roles found: ${[...new Set(t.map((i) => `<code>${m(i, 'value')}</code>`))].join(', ')}`,
                              }
                            : { used: !1, details: 'No roles specified.' };
                    },
                    'MPD Events': q(
                        'EventStream',
                        () =>
                            'Uses <EventStream> for out-of-band event signaling.',
                        ''
                    ),
                    'Inband Events': q(
                        'InbandEventStream',
                        () =>
                            'Uses <InbandEventStream> to signal events within segments.',
                        ''
                    ),
                }));
        });
    function Na(e) {
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
        let i = (e.segments || []).some((p) => p.discontinuity);
        t.Discontinuity = {
            used: i,
            details: i
                ? 'Contains #EXT-X-DISCONTINUITY tags.'
                : 'No discontinuities found.',
        };
        let r = n.find((p) => p.name === 'EXT-X-KEY');
        if (r && r.value.METHOD !== 'NONE') {
            let p = [
                ...new Set(
                    n
                        .filter((y) => y.name === 'EXT-X-KEY')
                        .map((y) => y.value.METHOD)
                ),
            ];
            t['Content Protection'] = {
                used: !0,
                details: `Methods: <b>${p.join(', ')}</b>`,
            };
        } else
            t['Content Protection'] = {
                used: !1,
                details: 'No #EXT-X-KEY tags found.',
            };
        let a = n.some((p) => p.name === 'EXT-X-MAP');
        ((t['Fragmented MP4 Segments'] = {
            used: a,
            details: a
                ? 'Uses #EXT-X-MAP, indicating fMP4 segments.'
                : 'Likely Transport Stream (TS) segments.',
        }),
            (t['I-Frame Playlists'] = {
                used: n.some((p) => p.name === 'EXT-X-I-FRAME-STREAM-INF'),
                details: 'Provides dedicated playlists for trick-play modes.',
            }));
        let s = n.filter((p) => p.name === 'EXT-X-MEDIA');
        ((t['Alternative Renditions'] = {
            used: s.length > 0,
            details:
                s.length > 0
                    ? `${s.length} #EXT-X-MEDIA tags found.`
                    : 'No separate audio/video/subtitle renditions declared.',
        }),
            (t['Date Ranges / Timed Metadata'] = {
                used: e.events.some((p) => p.type === 'hls-daterange'),
                details:
                    'Carries timed metadata, often used for ad insertion signaling.',
            }));
        let l = s.some((p) => p.value.TYPE === 'SUBTITLES');
        ((t['Subtitles & Captions'] = {
            used: l,
            details: l
                ? 'Contains #EXT-X-MEDIA tags with TYPE=SUBTITLES.'
                : 'No subtitle renditions declared.',
        }),
            (t['Session Data'] = {
                used: n.some((p) => p.name === 'EXT-X-SESSION-DATA'),
                details:
                    'Carries arbitrary session data in the master playlist.',
            }),
            (t['Session Keys'] = {
                used: n.some((p) => p.name === 'EXT-X-SESSION-KEY'),
                details:
                    'Allows pre-loading of encryption keys from the master playlist.',
            }),
            (t['Independent Segments'] = {
                used: n.some((p) => p.name === 'EXT-X-INDEPENDENT-SEGMENTS'),
                details: 'All segments are self-contained for decoding.',
            }),
            (t['Start Offset'] = {
                used: n.some((p) => p.name === 'EXT-X-START'),
                details:
                    'Specifies a preferred starting position in the playlist.',
            }));
        let o = [];
        (e.partInf && o.push('EXT-X-PART-INF'),
            (e.segments || []).some((p) => (p.parts || []).length > 0) &&
                o.push('EXT-X-PART'),
            e.serverControl && o.push('EXT-X-SERVER-CONTROL'),
            (e.preloadHints || []).length > 0 && o.push('EXT-X-PRELOAD-HINT'),
            (e.renditionReports || []).length > 0 &&
                o.push('EXT-X-RENDITION-REPORT'),
            (t['Low-Latency HLS'] = {
                used: o.length > 0,
                details:
                    o.length > 0
                        ? `Detected low-latency tags: <b>${o.join(', ')}</b>`
                        : 'Standard latency HLS.',
            }));
        let c = n.some((p) => p.name === 'EXT-X-SKIP');
        t['Playlist Delta Updates'] = {
            used: c,
            details: c
                ? 'Contains #EXT-X-SKIP tag, indicating a partial playlist update.'
                : 'No delta updates detected.',
        };
        let f = n.some((p) => p.name === 'EXT-X-DEFINE');
        t['Variable Substitution'] = {
            used: f,
            details: f
                ? 'Uses #EXT-X-DEFINE for variable substitution.'
                : 'No variables defined.',
        };
        let d = n.some((p) => p.name === 'EXT-X-CONTENT-STEERING');
        t['Content Steering'] = {
            used: d,
            details: d
                ? 'Provides client-side CDN steering information.'
                : 'No content steering information found.',
        };
        let u = [];
        return (
            (e.variants || []).some((p) => p.attributes.SCORE) &&
                u.push('SCORE'),
            (e.variants || []).some((p) => p.attributes['VIDEO-RANGE']) &&
                u.push('VIDEO-RANGE'),
            (e.variants || []).some((p) => p.attributes['STABLE-VARIANT-ID']) &&
                u.push('STABLE-VARIANT-ID'),
            s.some((p) => p.value['STABLE-RENDITION-ID']) &&
                u.push('STABLE-RENDITION-ID'),
            e.events.some(
                (p) =>
                    p.type === 'hls-daterange' &&
                    p.message.toLowerCase().includes('interstitial')
            ) && u.push('Interstitials'),
            (t['Advanced Metadata & Rendition Selection'] = {
                used: u.length > 0,
                details:
                    u.length > 0
                        ? `Detected advanced attributes: <b>${u.join(', ')}</b>`
                        : 'Uses standard metadata.',
            }),
            t
        );
    }
    var Va = V(() => {});
    var za = {};
    ht(za, {
        createFeatureViewModel: () => Ro,
        generateFeatureAnalysis: () => Mo,
    });
    function Mo(e, t, n = null) {
        return t === 'dash' ? wa(n) : Na(e);
    }
    function Ro(e, t) {
        return (t === 'dash' ? Ua : Ra).map((i) => {
            let r = e.get(i.name) || {
                used: !1,
                details: 'Not detected in manifest.',
            };
            return { ...i, ...r };
        });
    }
    var Oa = V(() => {
        Ma();
        La();
        Ba();
        Va();
    });
    var ce,
        $a = V(() => {
            ce = class {
                diff(t, n, i = {}) {
                    let r;
                    typeof i == 'function'
                        ? ((r = i), (i = {}))
                        : 'callback' in i && (r = i.callback);
                    let a = this.castInput(t, i),
                        s = this.castInput(n, i),
                        l = this.removeEmpty(this.tokenize(a, i)),
                        o = this.removeEmpty(this.tokenize(s, i));
                    return this.diffWithOptionsObj(l, o, i, r);
                }
                diffWithOptionsObj(t, n, i, r) {
                    var a;
                    let s = (g) => {
                            if (((g = this.postProcess(g, i)), r)) {
                                setTimeout(function () {
                                    r(g);
                                }, 0);
                                return;
                            } else return g;
                        },
                        l = n.length,
                        o = t.length,
                        c = 1,
                        f = l + o;
                    i.maxEditLength != null &&
                        (f = Math.min(f, i.maxEditLength));
                    let d =
                            (a = i.timeout) !== null && a !== void 0
                                ? a
                                : 1 / 0,
                        u = Date.now() + d,
                        p = [{ oldPos: -1, lastComponent: void 0 }],
                        y = this.extractCommon(p[0], n, t, 0, i);
                    if (p[0].oldPos + 1 >= o && y + 1 >= l)
                        return s(this.buildValues(p[0].lastComponent, n, t));
                    let _ = -1 / 0,
                        b = 1 / 0,
                        S = () => {
                            for (
                                let g = Math.max(_, -c);
                                g <= Math.min(b, c);
                                g += 2
                            ) {
                                let x,
                                    T = p[g - 1],
                                    I = p[g + 1];
                                T && (p[g - 1] = void 0);
                                let E = !1;
                                if (I) {
                                    let R = I.oldPos - g;
                                    E = I && 0 <= R && R < l;
                                }
                                let A = T && T.oldPos + 1 < o;
                                if (!E && !A) {
                                    p[g] = void 0;
                                    continue;
                                }
                                if (
                                    (!A || (E && T.oldPos < I.oldPos)
                                        ? (x = this.addToPath(I, !0, !1, 0, i))
                                        : (x = this.addToPath(T, !1, !0, 1, i)),
                                    (y = this.extractCommon(x, n, t, g, i)),
                                    x.oldPos + 1 >= o && y + 1 >= l)
                                )
                                    return (
                                        s(
                                            this.buildValues(
                                                x.lastComponent,
                                                n,
                                                t
                                            )
                                        ) || !0
                                    );
                                ((p[g] = x),
                                    x.oldPos + 1 >= o &&
                                        (b = Math.min(b, g - 1)),
                                    y + 1 >= l && (_ = Math.max(_, g + 1)));
                            }
                            c++;
                        };
                    if (r)
                        (function g() {
                            setTimeout(function () {
                                if (c > f || Date.now() > u) return r(void 0);
                                S() || g();
                            }, 0);
                        })();
                    else
                        for (; c <= f && Date.now() <= u; ) {
                            let g = S();
                            if (g) return g;
                        }
                }
                addToPath(t, n, i, r, a) {
                    let s = t.lastComponent;
                    return s &&
                        !a.oneChangePerToken &&
                        s.added === n &&
                        s.removed === i
                        ? {
                              oldPos: t.oldPos + r,
                              lastComponent: {
                                  count: s.count + 1,
                                  added: n,
                                  removed: i,
                                  previousComponent: s.previousComponent,
                              },
                          }
                        : {
                              oldPos: t.oldPos + r,
                              lastComponent: {
                                  count: 1,
                                  added: n,
                                  removed: i,
                                  previousComponent: s,
                              },
                          };
                }
                extractCommon(t, n, i, r, a) {
                    let s = n.length,
                        l = i.length,
                        o = t.oldPos,
                        c = o - r,
                        f = 0;
                    for (
                        ;
                        c + 1 < s &&
                        o + 1 < l &&
                        this.equals(i[o + 1], n[c + 1], a);

                    )
                        (c++,
                            o++,
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
                        (t.oldPos = o),
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
                    let s = r.length,
                        l = 0,
                        o = 0,
                        c = 0;
                    for (; l < s; l++) {
                        let f = r[l];
                        if (f.removed)
                            ((f.value = this.join(i.slice(c, c + f.count))),
                                (c += f.count));
                        else {
                            if (!f.added && this.useLongestToken) {
                                let d = n.slice(o, o + f.count);
                                ((d = d.map(function (u, p) {
                                    let y = i[c + p];
                                    return y.length > u.length ? y : u;
                                })),
                                    (f.value = this.join(d)));
                            } else f.value = this.join(n.slice(o, o + f.count));
                            ((o += f.count), f.added || (c += f.count));
                        }
                    }
                    return r;
                }
            };
        });
    function rt(e, t) {
        let n;
        for (n = 0; n < e.length && n < t.length; n++)
            if (e[n] != t[n]) return e.slice(0, n);
        return e.slice(0, n);
    }
    function at(e, t) {
        let n;
        if (!e || !t || e[e.length - 1] != t[t.length - 1]) return '';
        for (n = 0; n < e.length && n < t.length; n++)
            if (e[e.length - (n + 1)] != t[t.length - (n + 1)])
                return e.slice(-n);
        return e.slice(-n);
    }
    function Ae(e, t, n) {
        if (e.slice(0, t.length) != t)
            throw Error(
                `string ${JSON.stringify(e)} doesn't start with prefix ${JSON.stringify(t)}; this is a bug`
            );
        return n + e.slice(t.length);
    }
    function ke(e, t, n) {
        if (!t) return e + n;
        if (e.slice(-t.length) != t)
            throw Error(
                `string ${JSON.stringify(e)} doesn't end with suffix ${JSON.stringify(t)}; this is a bug`
            );
        return e.slice(0, -t.length) + n;
    }
    function de(e, t) {
        return Ae(e, t, '');
    }
    function be(e, t) {
        return ke(e, t, '');
    }
    function st(e, t) {
        return t.slice(0, Lo(e, t));
    }
    function Lo(e, t) {
        let n = 0;
        e.length > t.length && (n = e.length - t.length);
        let i = t.length;
        e.length < t.length && (i = e.length);
        let r = Array(i),
            a = 0;
        r[0] = 0;
        for (let s = 1; s < i; s++) {
            for (
                t[s] == t[a] ? (r[s] = r[a]) : (r[s] = a);
                a > 0 && t[s] != t[a];

            )
                a = r[a];
            t[s] == t[a] && a++;
        }
        a = 0;
        for (let s = n; s < e.length; s++) {
            for (; a > 0 && e[s] != t[a]; ) a = r[a];
            e[s] == t[a] && a++;
        }
        return a;
    }
    function pe(e) {
        let t;
        for (t = e.length - 1; t >= 0 && e[t].match(/\s/); t--);
        return e.substring(t + 1);
    }
    function G(e) {
        let t = e.match(/^\s*/);
        return t ? t[0] : '';
    }
    var Fa = V(() => {});
    function ft(e, t, n) {
        return n?.ignoreWhitespace != null && !n.ignoreWhitespace
            ? ja(e, t, n)
            : Xa.diff(e, t, n);
    }
    function Ha(e, t, n, i) {
        if (t && n) {
            let r = G(t.value),
                a = pe(t.value),
                s = G(n.value),
                l = pe(n.value);
            if (e) {
                let o = rt(r, s);
                ((e.value = ke(e.value, s, o)),
                    (t.value = de(t.value, o)),
                    (n.value = de(n.value, o)));
            }
            if (i) {
                let o = at(a, l);
                ((i.value = Ae(i.value, l, o)),
                    (t.value = be(t.value, o)),
                    (n.value = be(n.value, o)));
            }
        } else if (n) {
            if (e) {
                let r = G(n.value);
                n.value = n.value.substring(r.length);
            }
            if (i) {
                let r = G(i.value);
                i.value = i.value.substring(r.length);
            }
        } else if (e && i) {
            let r = G(i.value),
                a = G(t.value),
                s = pe(t.value),
                l = rt(r, a);
            t.value = de(t.value, l);
            let o = at(de(r, l), s);
            ((t.value = be(t.value, o)),
                (i.value = Ae(i.value, r, o)),
                (e.value = ke(e.value, r, r.slice(0, r.length - o.length))));
        } else if (i) {
            let r = G(i.value),
                a = pe(t.value),
                s = st(a, r);
            t.value = be(t.value, s);
        } else if (e) {
            let r = pe(e.value),
                a = G(t.value),
                s = st(r, a);
            t.value = de(t.value, s);
        }
    }
    function ja(e, t, n) {
        return Ga.diff(e, t, n);
    }
    var Ue,
        wo,
        ot,
        Xa,
        lt,
        Ga,
        Wa = V(() => {
            $a();
            Fa();
            ((Ue =
                'a-zA-Z0-9_\\u{C0}-\\u{FF}\\u{D8}-\\u{F6}\\u{F8}-\\u{2C6}\\u{2C8}-\\u{2D7}\\u{2DE}-\\u{2FF}\\u{1E00}-\\u{1EFF}'),
                (wo = new RegExp(`[${Ue}]+|\\s+|[^${Ue}]`, 'ug')),
                (ot = class extends ce {
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
                            let s = n.intlSegmenter;
                            if (s.resolvedOptions().granularity != 'word')
                                throw new Error(
                                    'The segmenter passed must have a granularity of "word"'
                                );
                            i = Array.from(s.segment(t), (l) => l.segment);
                        } else i = t.match(wo) || [];
                        let r = [],
                            a = null;
                        return (
                            i.forEach((s) => {
                                (/\s/.test(s)
                                    ? a == null
                                        ? r.push(s)
                                        : r.push(r.pop() + s)
                                    : a != null && /\s/.test(a)
                                      ? r[r.length - 1] == a
                                          ? r.push(r.pop() + s)
                                          : r.push(a + s)
                                      : r.push(s),
                                    (a = s));
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
                            t.forEach((s) => {
                                s.added
                                    ? (r = s)
                                    : s.removed
                                      ? (a = s)
                                      : ((r || a) && Ha(i, a, r, s),
                                        (i = s),
                                        (r = null),
                                        (a = null));
                            }),
                            (r || a) && Ha(i, a, r, null),
                            t
                        );
                    }
                }),
                (Xa = new ot()));
            ((lt = class extends ce {
                tokenize(t) {
                    let n = new RegExp(
                        `(\\r?\\n)|[${Ue}]+|[^\\S\\n\\r]+|[^${Ue}]`,
                        'ug'
                    );
                    return t.match(n) || [];
                }
            }),
                (Ga = new lt()));
        });
    var Ka = V(() => {
        Wa();
    });
    function Ya(e) {
        if (!e) return '';
        let t = qa(e),
            n =
                /(&lt;!--[\s\S]*?--&gt;)|(&lt;\?[\s\S]*?\?&gt;)|(&lt;\/?)([\w:-]+)|([\w:-]+=)|(&quot;)([^&quot;]*)(&quot;)/g;
        return t.replace(n, (i, r, a, s, l, o, c, f, d) =>
            r
                ? `<span class="text-gray-500 italic">${r}</span>`
                : a
                  ? `<span class="text-gray-500">${a}</span>`
                  : s
                    ? `${s}<span class="text-blue-300">${l}</span>`
                    : o
                      ? `<span class="text-emerald-300">${o.slice(0, -1)}</span>=`
                      : c
                        ? `${c}<span class="text-yellow-300">${f}</span>${d}`
                        : i
        );
    }
    function Qa(e) {
        return e
            ? e
                  .split(
                      `
`
                  )
                  .map((t) => {
                      let n = qa(t.trim());
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
    var qa,
        Ja = V(() => {
            qa = (e) =>
                e
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
        });
    var Za = {};
    ht(Za, { diffManifest: () => Bo });
    function Bo(e, t, n) {
        let i = ft(e, t),
            r = '',
            a = n === 'dash' ? Ya : Qa;
        return (
            i.forEach((s) => {
                if (s.removed) return;
                let l = a(s.value);
                s.added
                    ? (r += `<span class="bg-emerald-500/40 text-green-50 rounded-sm font-medium">${l}</span>`)
                    : (r += l);
            }),
            r
        );
    }
    var es = V(() => {
        Ka();
        Ja();
    });
    var ss = gt((ue, dt) => {
        'use strict';
        Object.defineProperty(ue, '__esModule', { value: !0 });
        ue.ParsingError = void 0;
        var ie = class extends Error {
            constructor(t, n) {
                (super(t), (this.cause = n));
            }
        };
        ue.ParsingError = ie;
        var D;
        function ts() {
            return is(!1) || Oo() || rs() || zo() || pt();
        }
        function ns() {
            return (N(/\s*/), is(!0) || rs() || Vo() || pt());
        }
        function No() {
            let e = pt(),
                t = [],
                n,
                i = ns();
            for (; i; ) {
                if (i.node.type === 'Element') {
                    if (n) throw new Error('Found multiple root nodes');
                    n = i.node;
                }
                (i.excluded || t.push(i.node), (i = ns()));
            }
            if (!n)
                throw new ie('Failed to parse XML', 'Root Element not found');
            if (D.xml.length !== 0)
                throw new ie('Failed to parse XML', 'Not Well-Formed XML');
            return { declaration: e ? e.node : null, root: n, children: t };
        }
        function pt() {
            let e = N(/^<\?([\w-:.]+)\s*/);
            if (!e) return;
            let t = { name: e[1], type: 'ProcessingInstruction', content: '' },
                n = D.xml.indexOf('?>');
            if (n > -1)
                ((t.content = D.xml.substring(0, n).trim()),
                    (D.xml = D.xml.slice(n)));
            else
                throw new ie(
                    'Failed to parse XML',
                    'ProcessingInstruction closing tag not found'
                );
            return (
                N(/\?>/),
                { excluded: D.options.filter(t) === !1, node: t }
            );
        }
        function is(e) {
            let t = N(/^<([^?!</>\s]+)\s*/);
            if (!t) return;
            let n = {
                    type: 'Element',
                    name: t[1],
                    attributes: {},
                    children: [],
                },
                i = e ? !1 : D.options.filter(n) === !1;
            for (; !(Ho() || ct('>') || ct('?>') || ct('/>')); ) {
                let a = $o();
                if (a) n.attributes[a.name] = a.value;
                else return;
            }
            if (N(/^\s*\/>/))
                return ((n.children = null), { excluded: i, node: n });
            N(/\??>/);
            let r = ts();
            for (; r; ) (r.excluded || n.children.push(r.node), (r = ts()));
            if (D.options.strictMode) {
                let a = `</${n.name}>`;
                if (D.xml.startsWith(a)) D.xml = D.xml.slice(a.length);
                else
                    throw new ie(
                        'Failed to parse XML',
                        `Closing tag not matching "${a}"`
                    );
            } else N(/^<\/[\w-:.\u00C0-\u00FF]+\s*>/);
            return { excluded: i, node: n };
        }
        function Vo() {
            let e =
                N(/^<!DOCTYPE\s+\S+\s+SYSTEM[^>]*>/) ||
                N(/^<!DOCTYPE\s+\S+\s+PUBLIC[^>]*>/) ||
                N(/^<!DOCTYPE\s+\S+\s*\[[^\]]*]>/) ||
                N(/^<!DOCTYPE\s+\S+\s*>/);
            if (e) {
                let t = { type: 'DocumentType', content: e[0] };
                return { excluded: D.options.filter(t) === !1, node: t };
            }
        }
        function zo() {
            if (D.xml.startsWith('<![CDATA[')) {
                let e = D.xml.indexOf(']]>');
                if (e > -1) {
                    let t = e + 3,
                        n = { type: 'CDATA', content: D.xml.substring(0, t) };
                    return (
                        (D.xml = D.xml.slice(t)),
                        { excluded: D.options.filter(n) === !1, node: n }
                    );
                }
            }
        }
        function rs() {
            let e = N(/^<!--[\s\S]*?-->/);
            if (e) {
                let t = { type: 'Comment', content: e[0] };
                return { excluded: D.options.filter(t) === !1, node: t };
            }
        }
        function Oo() {
            let e = N(/^([^<]+)/);
            if (e) {
                let t = { type: 'Text', content: e[1] };
                return { excluded: D.options.filter(t) === !1, node: t };
            }
        }
        function $o() {
            let e = N(/([^=]+)\s*=\s*("[^"]*"|'[^']*'|[^>\s]+)\s*/);
            if (e) return { name: e[1].trim(), value: Fo(e[2].trim()) };
        }
        function Fo(e) {
            return e.replace(/^['"]|['"]$/g, '');
        }
        function N(e) {
            let t = D.xml.match(e);
            if (t) return ((D.xml = D.xml.slice(t[0].length)), t);
        }
        function Ho() {
            return D.xml.length === 0;
        }
        function ct(e) {
            return D.xml.indexOf(e) === 0;
        }
        function as(e, t = {}) {
            e = e.trim();
            let n = t.filter || (() => !0);
            return (
                (D = {
                    xml: e,
                    options: Object.assign(Object.assign({}, t), {
                        filter: n,
                        strictMode: t.strictMode === !0,
                    }),
                }),
                No()
            );
        }
        typeof dt < 'u' && typeof ue == 'object' && (dt.exports = as);
        ue.default = as;
    });
    var fs = gt((me, ut) => {
        'use strict';
        var Xo =
            (me && me.__importDefault) ||
            function (e) {
                return e && e.__esModule ? e : { default: e };
            };
        Object.defineProperty(me, '__esModule', { value: !0 });
        var Go = Xo(ss());
        function Me(e) {
            if (!e.options.indentation && !e.options.lineSeparator) return;
            e.content += e.options.lineSeparator;
            let t;
            for (t = 0; t < e.level; t++) e.content += e.options.indentation;
        }
        function jo(e) {
            e.content = e.content.replace(/ +$/, '');
            let t;
            for (t = 0; t < e.level; t++) e.content += e.options.indentation;
        }
        function H(e, t) {
            e.content += t;
        }
        function os(e, t, n) {
            if (e.type === 'Element') qo(e, t, n);
            else if (e.type === 'ProcessingInstruction') ls(e, t);
            else if (typeof e.content == 'string') Wo(e.content, t, n);
            else throw new Error('Unknown node type: ' + e.type);
        }
        function Wo(e, t, n) {
            if (!n) {
                let i = e.trim();
                (t.options.lineSeparator || i.length === 0) && (e = i);
            }
            e.length > 0 && (!n && t.content.length > 0 && Me(t), H(t, e));
        }
        function Ko(e, t) {
            let n = '/' + e.join('/'),
                i = e[e.length - 1];
            return t.includes(i) || t.includes(n);
        }
        function qo(e, t, n) {
            if (
                (t.path.push(e.name),
                !n && t.content.length > 0 && Me(t),
                H(t, '<' + e.name),
                Yo(t, e.attributes),
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
                    a = !1;
                if (
                    (!r &&
                        t.options.ignoredPaths &&
                        ((a = Ko(t.path, t.options.ignoredPaths)), (r = a)),
                    !r && t.options.collapseContent)
                ) {
                    let s = !1,
                        l = !1,
                        o = !1;
                    (i.forEach(function (c, f) {
                        c.type === 'Text'
                            ? (c.content.includes(`
`)
                                  ? ((l = !0), (c.content = c.content.trim()))
                                  : (f === 0 || f === i.length - 1) &&
                                    !n &&
                                    c.content.trim().length === 0 &&
                                    (c.content = ''),
                              (c.content.trim().length > 0 || i.length === 1) &&
                                  (s = !0))
                            : c.type === 'CDATA'
                              ? (s = !0)
                              : (o = !0);
                    }),
                        s && (!o || !l) && (r = !0));
                }
                (i.forEach(function (s) {
                    os(s, t, n || r);
                }),
                    t.level--,
                    !n && !r && Me(t),
                    a && jo(t),
                    H(t, '</' + e.name + '>'));
            }
            t.path.pop();
        }
        function Yo(e, t) {
            Object.keys(t).forEach(function (n) {
                let i = t[n].replace(/"/g, '&quot;');
                H(e, ' ' + n + '="' + i + '"');
            });
        }
        function ls(e, t) {
            (t.content.length > 0 && Me(t),
                H(t, '<?' + e.name),
                H(t, ' ' + e.content.trim()),
                H(t, '?>'));
        }
        function Re(e, t = {}) {
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
                let n = (0, Go.default)(e, {
                        filter: t.filter,
                        strictMode: t.strictMode,
                    }),
                    i = { content: '', level: 0, options: t, path: [] };
                return (
                    n.declaration && ls(n.declaration, i),
                    n.children.forEach(function (r) {
                        os(r, i, !1);
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
        Re.minify = (e, t = {}) =>
            Re(
                e,
                Object.assign(Object.assign({}, t), {
                    indentation: '',
                    lineSeparator: '',
                })
            );
        typeof ut < 'u' && typeof me == 'object' && (ut.exports = Re);
        me.default = Re;
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
                s = i - n + 1;
            return (
                (this.box.details[t] = {
                    value: a,
                    offset: this.box.offset + n,
                    length: s,
                }),
                (this.offset += s),
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
    function Be(e, t) {
        let n = new h(e, t);
        (n.readString(4, 'majorBrand'), n.readUint32('minorVersion'));
        let i = [],
            r = [],
            a = n.offset;
        for (; n.offset < e.size && !n.stopped; ) {
            let s = n.readString(4, `brand_${i.length}`);
            if (s === null) break;
            (i.push(s),
                s.startsWith('cmf') && r.push(s),
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
    var _t = {
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
    function yt(e, t) {
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
    var xt = {
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
    function St(e, t) {
        let n = new h(e, t);
        (n.readVersionAndFlags(), n.readUint32('sequence_number'));
    }
    var bt = {
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
    function Tt(e, t) {
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
    var It = {
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
    function vt(e, t) {
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
    var Ct = {
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
    function Et(e, t) {
        let n = new h(e, t),
            { version: i, flags: r } = n.readVersionAndFlags();
        if (r === null) {
            n.finalize();
            return;
        }
        let a = n.readUint32('sample_count');
        ((e.samples = []), r & 1 && n.readInt32('data_offset'));
        let s = null;
        if (r & 4) {
            let l = n.readUint32('first_sample_flags_dword');
            l !== null &&
                (delete e.details.first_sample_flags_dword,
                (s = l),
                (e.details.first_sample_flags = {
                    value: `0x${s.toString(16)}`,
                    offset:
                        e.details.first_sample_flags_dword?.offset ||
                        n.box.offset + n.offset - 4,
                    length: 4,
                }));
        }
        if (a !== null)
            for (let l = 0; l < a && !n.stopped; l++) {
                let o = {};
                (r & 256 &&
                    ((o.duration = n.view.getUint32(n.offset)),
                    (n.offset += 4)),
                    r & 512 &&
                        ((o.size = n.view.getUint32(n.offset)),
                        (n.offset += 4)),
                    r & 1024 &&
                        ((o.flags = n.view.getUint32(n.offset)),
                        (n.offset += 4)),
                    l === 0 && s !== null && (o.flags = s),
                    r & 2048 &&
                        (i === 0
                            ? (o.compositionTimeOffset = n.view.getUint32(
                                  n.offset
                              ))
                            : (o.compositionTimeOffset = n.view.getInt32(
                                  n.offset
                              )),
                        (n.offset += 4)),
                    e.samples.push(o));
            }
        n.finalize();
    }
    var Pt = {
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
    function Dt(e, t) {
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
            let s = n.readUint32(`ref_${a + 1}_type_and_size`);
            if (s === null) break;
            let l = (s >> 31) & 1,
                o = s & 2147483647,
                c = e.details[`ref_${a + 1}_type_and_size`]?.offset || 0;
            (delete e.details[`ref_${a + 1}_type_and_size`],
                (e.details[`reference_${a + 1}_type`] = {
                    value: l === 1 ? 'sidx' : 'media',
                    offset: c,
                    length: 4,
                }),
                (e.details[`reference_${a + 1}_size`] = {
                    value: o,
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
    var At = {
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
    function kt(e, t) {
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
        let s = [];
        for (let f = 0; f < 9; f++) s.push(n.readInt32(`matrix_val_${f}`));
        let l = e.details.matrix_val_0?.offset;
        if (l !== void 0) {
            e.details.matrix = {
                value: `[${s.join(', ')}]`,
                offset: l,
                length: 36,
            };
            for (let f = 0; f < 9; f++) delete e.details[`matrix_val_${f}`];
        }
        let o = n.readUint32('width_fixed_point');
        o !== null &&
            ((e.details.width = {
                ...e.details.width_fixed_point,
                value: (o / 65536).toFixed(2),
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
    var Ut = {
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
    function Mt(e, t) {
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
    var Rt = {
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
    function Lt(e, t) {
        let n = new h(e, t);
        (n.readVersionAndFlags(),
            n.skip(4, 'pre_defined'),
            n.readString(4, 'handler_type'),
            n.skip(12, 'reserved'),
            n.readNullTerminatedString('name'),
            n.finalize());
    }
    var wt = {
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
    function Bt(e, t) {
        let n = new h(e, t);
        (n.readVersionAndFlags(), n.readUint16('graphicsmode'));
        let i = n.readUint16('opcolor_r'),
            r = n.readUint16('opcolor_g'),
            a = n.readUint16('opcolor_b');
        if (i !== null && r !== null && a !== null) {
            let s = e.details.opcolor_r.offset;
            (delete e.details.opcolor_r,
                delete e.details.opcolor_g,
                delete e.details.opcolor_b,
                (e.details.opcolor = {
                    value: `R:${i}, G:${r}, B:${a}`,
                    offset: s,
                    length: 6,
                }));
        }
        n.finalize();
    }
    var Nt = {
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
    function Vt(e, t) {
        let n = new h(e, t);
        (n.readVersionAndFlags(), n.readUint32('entry_count'));
    }
    var zt = {
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
    function Ot(e, t) {
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
    var $t = {
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
    function Ft(e, t) {
        let n = new h(e, t);
        n.readVersionAndFlags();
        let i = n.readUint32('entry_count');
        if (i !== null && i > 0) {
            for (let a = 0; a < i && !n.stopped; a++)
                if (a < 10) {
                    let s = `entry_${a + 1}`;
                    (n.readUint32(`${s}_first_chunk`),
                        n.readUint32(`${s}_samples_per_chunk`),
                        n.readUint32(`${s}_sample_description_index`));
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
    var Ht = {
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
    function Xt(e, t) {
        let n = new h(e, t);
        n.readVersionAndFlags();
        let i = n.readUint32('sample_size'),
            r = n.readUint32('sample_count');
        if (i === 0 && r !== null && r > 0) {
            for (let s = 0; s < r && !n.stopped; s++)
                s < 10 ? n.readUint32(`entry_size_${s + 1}`) : (n.offset += 4);
            r > 10 &&
                (e.details['...more_entries'] = {
                    value: `${r - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        n.finalize();
    }
    var Gt = {
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
    function jt(e, t) {
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
    var Wt = {
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
    function Kt(e, t) {
        let n = new h(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        let r = n.readUint32('entry_count');
        if (r !== null && r > 0) {
            let s = i === 1 ? 20 : 12;
            for (let l = 0; l < r && !n.stopped; l++)
                if (l < 5) {
                    let o = `entry_${l + 1}`;
                    (i === 1
                        ? (n.readBigUint64(`${o}_segment_duration`),
                          n.readBigInt64(`${o}_media_time`))
                        : (n.readUint32(`${o}_segment_duration`),
                          n.readInt32(`${o}_media_time`)),
                        n.readInt16(`${o}_media_rate_integer`),
                        n.readInt16(`${o}_media_rate_fraction`));
                } else n.offset += s;
            r > 5 &&
                (e.details['...more_entries'] = {
                    value: `${r - 5} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        n.finalize();
    }
    var qt = {
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
    function Yt(e, t) {
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
    var Qt = {
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
    var Jt = {
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
    var Ne = class {
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
    function Zt(e) {
        if (e.length < 4) return null;
        let t = new Ne(e);
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
                let p = d !== 3 ? 8 : 12;
                for (let y = 0; y < p; y++)
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
            for (let u = 0; u < d; u++) t.readUE();
        }
        (t.readUE(), t.readBits(1));
        let a = t.readUE(),
            s = t.readUE(),
            l = t.readBits(1),
            o = (a + 1) * 16,
            c = (2 - l) * (s + 1) * 16;
        if ((l === 0 && t.readBits(1), t.readBits(1), t.readBits(1))) {
            let d = t.readUE(),
                u = t.readUE(),
                p = t.readUE(),
                y = t.readUE(),
                _ = 1,
                b = 2 - l,
                S = o - (d + u) * _;
            c = c - (p + y) * b;
        }
        return { profile_idc: n, level_idc: i, resolution: `${o}x${c}` };
    }
    function en(e, t) {
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
            let l = a & 31;
            ((e.details.numOfSequenceParameterSets = {
                value: l,
                offset: e.offset + n.offset - 1,
                length: 0.625,
            }),
                (e.details.reserved_3_bits = {
                    value: (a >> 5) & 7,
                    offset: e.offset + n.offset - 1,
                    length: 0.375,
                }));
            for (let o = 0; o < l; o++) {
                let c = n.readUint16(`sps_${o + 1}_length`);
                if (c === null) break;
                let f = n.offset;
                if (n.checkBounds(c)) {
                    let d = new Uint8Array(
                            n.view.buffer,
                            n.view.byteOffset + f,
                            c
                        ),
                        u = Zt(d);
                    (u &&
                        ((e.details[`sps_${o + 1}_decoded_profile`] = {
                            value: u.profile_idc,
                            offset: 0,
                            length: 0,
                        }),
                        (e.details[`sps_${o + 1}_decoded_level`] = {
                            value: u.level_idc,
                            offset: 0,
                            length: 0,
                        }),
                        (e.details[`sps_${o + 1}_decoded_resolution`] = {
                            value: u.resolution,
                            offset: 0,
                            length: 0,
                        })),
                        n.skip(c, `sps_${o + 1}_nal_unit`));
                }
            }
        }
        let s = n.readUint8('numOfPictureParameterSets');
        if (s !== null)
            for (let l = 0; l < s; l++) {
                let o = n.readUint16(`pps_${l + 1}_length`);
                if (o === null) break;
                n.skip(o, `pps_${l + 1}_nal_unit`);
            }
        (n.offset < e.size &&
            (i === 100 || i === 110 || i === 122 || i === 144) &&
            n.readRemainingBytes('profile_specific_extensions'),
            n.finalize());
    }
    var tn = {
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
    var _s = {
            1: 'AAC Main',
            2: 'AAC LC',
            3: 'AAC SSR',
            4: 'AAC LTP',
            5: 'SBR',
            6: 'AAC Scalable',
        },
        ys = {
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
        xs = [
            'Custom',
            'Mono (Center)',
            'Stereo (L, R)',
            '3 (L, C, R)',
            '4 (L, C, R, Sur)',
            '5 (L, C, R, Ls, Rs)',
            '5.1 (L, C, R, Ls, Rs, LFE)',
            '7.1 (L, C, R, Ls, Rs, Lcs, Rcs, LFE)',
        ];
    function Te(e, t) {
        let n = e.offset,
            i = 0,
            r,
            a = 0;
        do {
            if (((r = e.readUint8(`size_byte_${a}`)), r === null)) return null;
            ((i = (i << 7) | (r & 127)), a++);
        } while (r & 128 && a < 4);
        e.box.details[t] = { value: i, offset: e.box.offset + n, length: a };
        for (let s = 0; s < a; s++) delete e.box.details[`size_byte_${s}`];
        return i;
    }
    function nn(e, t) {
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
        let r = Te(n, 'ES_Descriptor_size');
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
            let l = Te(n, 'DecoderConfigDescriptor_size'),
                o = n.offset + l;
            if (
                (n.readUint8('objectTypeIndication'),
                n.readUint8('streamType_and_upStream'),
                n.skip(3, 'bufferSizeDB'),
                n.readUint32('maxBitrate'),
                n.readUint32('avgBitrate'),
                n.offset < o && n.readUint8('DecoderSpecificInfo_tag') === 5)
            ) {
                let f = Te(n, 'DecoderSpecificInfo_size');
                if (f !== null && f >= 2) {
                    let d = n.offset,
                        u = (n.readUint16('AudioSpecificConfig_bits') >>> 0)
                            .toString(2)
                            .padStart(16, '0');
                    delete e.details.AudioSpecificConfig_bits;
                    let p = parseInt(u.substring(0, 5), 2),
                        y = parseInt(u.substring(5, 9), 2),
                        _ = parseInt(u.substring(9, 13), 2);
                    ((e.details.decoded_audio_object_type = {
                        value: `${_s[p] || 'Unknown'} (${p})`,
                        offset: n.box.offset + d,
                        length: 0.625,
                    }),
                        (e.details.decoded_sampling_frequency = {
                            value: `${ys[y] || 'Unknown'} (${y})`,
                            offset: n.box.offset + d + 0.625,
                            length: 0.5,
                        }),
                        (e.details.decoded_channel_configuration = {
                            value: `${xs[_] || 'Unknown'} (${_})`,
                            offset: n.box.offset + d + 1.125,
                            length: 0.5,
                        }),
                        n.skip(f - 2, 'decoder_specific_info_remains'));
                } else f > 0 && n.skip(f, 'decoder_specific_info_data');
            }
        }
        if (n.offset < a && n.readUint8('SLConfigDescriptor_tag') === 6) {
            let l = Te(n, 'SLConfigDescriptor_size');
            l !== null &&
                (l === 1
                    ? n.readUint8('predefined')
                    : n.skip(l, 'sl_config_data'));
        }
        n.finalize();
    }
    var rn = {
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
    function an(e, t) {
        let n = new h(e, t);
        (n.readVersionAndFlags(),
            n.readInt16('balance'),
            n.skip(2, 'reserved'),
            n.finalize());
    }
    var sn = {
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
    function on(e, t) {
        let n = new h(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        let r = [];
        for (let l = 0; l < 16; l++) {
            let o = n.readUint8(`system_id_byte_${l}`);
            if (o === null) {
                n.finalize();
                return;
            }
            r.push(o.toString(16).padStart(2, '0'));
        }
        let a = e.details.system_id_byte_0.offset;
        for (let l = 0; l < 16; l++) delete e.details[`system_id_byte_${l}`];
        if (
            ((e.details['System ID'] = {
                value: r.join('-'),
                offset: a,
                length: 16,
            }),
            i > 0)
        ) {
            let l = n.readUint32('Key ID Count');
            l !== null && n.skip(l * 16, 'Key IDs');
        }
        let s = n.readUint32('Data Size');
        (s !== null && n.skip(s, 'Data'), n.finalize());
    }
    var ln = {
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
    function fn(e, t) {
        let n = new h(e, t),
            { version: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        let r = n.readUint32('entry_count');
        if (r !== null && r > 0) {
            for (let s = 0; s < r && !n.stopped; s++)
                if (s < 10) {
                    let l = `entry_${s + 1}`;
                    (n.readUint32(`${l}_sample_count`),
                        i === 1
                            ? n.readInt32(`${l}_sample_offset`)
                            : n.readUint32(`${l}_sample_offset`));
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
    var cn = {
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
    function dn(e, t) {
        let n = new h(e, t);
        (n.readVersionAndFlags(), n.skip(3, 'reserved'));
        let i = n.readUint8('field_size'),
            r = n.readUint32('sample_count');
        if (r !== null && r > 0) {
            let a;
            if (i === 4) {
                let s = n.readUint8('entry_size_1_byte');
                s !== null && (a = `(nibbles) ${(s >> 4) & 15}, ${s & 15}`);
            } else
                i === 8
                    ? (a = n.readUint8('entry_size_1'))
                    : i === 16 && (a = n.readUint16('entry_size_1'));
            a !== void 0 && (e.details.entry_size_1.value = a);
        }
        n.finalize();
    }
    var pn = {
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
    function un(e, t) {
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
    var mn = {
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
    function gn(e, t) {}
    function Y(e, t) {
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
    var hn = { hint: Y, cdsc: Y, font: Y, hind: Y, vdep: Y, vplx: Y, subt: Y },
        _n = {
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
    function yn(e, t) {
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
    var xn = {
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
    function Sn(e, t) {
        let n = new h(e, t),
            { flags: i } = n.readVersionAndFlags();
        i !== null &&
            (i & 1) !== 0 &&
            (n.readUint32('aux_info_type'),
            n.readUint32('aux_info_type_parameter'));
        let r = n.readUint8('default_sample_info_size'),
            a = n.readUint32('sample_count');
        if (r === 0 && a !== null && a > 0) {
            for (let l = 0; l < a && !n.stopped; l++)
                l < 10
                    ? n.readUint8(`sample_info_size_${l + 1}`)
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
    var bn = {
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
    function Tn(e, t) {
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
    var In = {
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
    function vn(e, t) {}
    var Cn = {
        sinf: {
            name: 'Protection Scheme Information',
            text: 'A container for all information required to understand the encryption transform applied.',
            ref: 'ISO/IEC 14496-12, 8.12.1',
        },
    };
    function En(e, t) {
        let n = new h(e, t);
        (n.readString(4, 'data_format'), n.finalize());
    }
    var Pn = {
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
    function Dn(e, t) {
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
    var An = {
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
    function kn(e, t) {}
    var Un = {
        schi: {
            name: 'Scheme Information Box',
            text: 'A container for boxes with scheme-specific data needed by the protection system.',
            ref: 'ISO/IEC 14496-12, 8.12.6',
        },
    };
    function Mn(e, t) {
        let n = new h(e, t);
        n.readVersionAndFlags();
        let i = n.readUint32('entry_count');
        if (i !== null && i > 0) {
            let r = [];
            for (let s = 0; s < i && !n.stopped; s++)
                if (s < 10) {
                    let l = n.readUint32(`sample_number_entry_${s + 1}`);
                    l !== null &&
                        (r.push(l),
                        delete e.details[`sample_number_entry_${s + 1}`]);
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
    var Rn = {
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
    function Ln(e, t) {
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
        let s = n.readUint32('entry_count');
        if (s !== null)
            for (let l = 0; l < s && !n.stopped; l++) {
                let o = a;
                if (i === 1 && a === 0) {
                    let d = n.readUint32(`entry_${l + 1}_description_length`);
                    if (d === null) break;
                    o = d;
                }
                let c = `entry_${l + 1}`,
                    f = n.offset;
                switch (r) {
                    case 'roll':
                        (n.readInt16(`${c}_roll_distance`), i === 0 && (o = 2));
                        break;
                    default:
                        i === 0 &&
                            (n.addIssue(
                                'warn',
                                `Cannot determine entry size for unknown grouping_type '${r}' with version 0. Parsing of this box may be incomplete.`
                            ),
                            n.readRemainingBytes('unparsed_sgpd_entries'),
                            (l = s));
                        break;
                }
                o > 0 && n.offset === f && n.skip(o, `${c}_description_data`);
            }
        n.finalize();
    }
    var wn = {
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
    function Bn(e, t) {
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
    var Nn = {
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
    function Vn(e, t) {
        let n = new h(e, t);
        n.readVersionAndFlags();
        let i = e.size - n.offset;
        if (
            ((e.details.sample_count = { value: i, offset: 0, length: 0 }),
            i > 0)
        ) {
            for (let a = 0; a < i && !n.stopped; a++) {
                let s = `sample_${a + 1}`;
                if (a < 10) {
                    let l = n.readUint8(`${s}_flags_byte`);
                    if (l === null) break;
                    (delete e.details[`${s}_flags_byte`],
                        (e.details[`${s}_is_leading`] = {
                            value: (l >> 6) & 3,
                            offset: e.offset + n.offset - 1,
                            length: 0.25,
                        }),
                        (e.details[`${s}_sample_depends_on`] = {
                            value: (l >> 4) & 3,
                            offset: e.offset + n.offset - 1,
                            length: 0.25,
                        }),
                        (e.details[`${s}_sample_is_depended_on`] = {
                            value: (l >> 2) & 3,
                            offset: e.offset + n.offset - 1,
                            length: 0.25,
                        }),
                        (e.details[`${s}_sample_has_redundancy`] = {
                            value: l & 3,
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
    var zn = {
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
    function On(e, t) {}
    var $n = {
        mfra: {
            name: 'Movie Fragment Random Access',
            text: 'A container for random access information for movie fragments, often found at the end of the file.',
            ref: 'ISO/IEC 14496-12, 8.8.9',
        },
    };
    function Fn(e, t) {
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
                s = ((r >> 2) & 3) + 1,
                l = (r & 3) + 1;
            ((e.details.length_sizes = {
                value: `traf=${a}, trun=${s}, sample=${l}`,
                offset: e.details.length_sizes_raw.offset,
                length: 4,
            }),
                delete e.details.length_sizes_raw);
            let o = n.readUint32('number_of_entries');
            o !== null &&
                o > 0 &&
                (i === 1
                    ? (n.readBigUint64('entry_1_time'),
                      n.readBigUint64('entry_1_moof_offset'))
                    : (n.readUint32('entry_1_time'),
                      n.readUint32('entry_1_moof_offset')),
                n.skip(a, 'entry_1_traf_number'),
                n.skip(s, 'entry_1_trun_number'),
                n.skip(l, 'entry_1_sample_number'));
        }
        n.finalize();
    }
    var Hn = {
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
    function Xn(e, t) {
        let n = new h(e, t);
        (n.readVersionAndFlags(), n.readUint32('size'), n.finalize());
    }
    var Gn = {
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
    function jn(e, t) {
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
    var Wn = {
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
    function Kn(e, t) {
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
    var qn = {
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
    function Yn(e, t) {
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
    var Qn = {
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
    function Jn(e, t) {
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
    var Zn = {
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
    function ei(e, t) {
        let n = new h(e, t),
            { flags: i } = n.readVersionAndFlags();
        (i !== null && (i & 1) === 0 && n.readNullTerminatedString('location'),
            n.finalize());
    }
    function ti(e, t) {
        let n = new h(e, t);
        (n.readVersionAndFlags(),
            n.readNullTerminatedString('name'),
            n.readNullTerminatedString('location'),
            n.finalize());
    }
    var ni = {
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
    function ii(e, t) {
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
            let s = n.view.getUint8(n.offset),
                l = new Uint8Array(
                    n.view.buffer,
                    n.view.byteOffset + n.offset + 1,
                    s
                ),
                o = new TextDecoder().decode(l);
            ((e.details.compressorname = {
                value: o,
                offset: n.box.offset + a,
                length: 32,
            }),
                (n.offset += 32));
        }
        (n.readUint16('depth'), n.readInt16('pre_defined_3'));
    }
    var ri = {
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
    function ai(e, t) {
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
    var si = {
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
    function oi(e, t) {
        let n = new h(e, t);
        (n.readUint32('bufferSizeDB'),
            n.readUint32('maxBitrate'),
            n.readUint32('avgBitrate'),
            n.finalize());
    }
    var li = {
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
    function Ve(e, t) {
        let n = new h(e, t);
        (n.readRemainingBytes('data'), n.finalize());
    }
    var fi = {
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
    function Ss(e, t) {
        let n = e.offset,
            i = 0,
            r,
            a = 0;
        do {
            if (((r = e.readUint8(`size_byte_${a}`)), r === null)) return null;
            ((i = (i << 7) | (r & 127)), a++);
        } while (r & 128 && a < 4);
        e.box.details[t] = { value: i, offset: e.box.offset + n, length: a };
        for (let s = 0; s < a; s++) delete e.box.details[`size_byte_${s}`];
        return i;
    }
    function ci(e, t) {
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
        if (Ss(n, 'InitialObjectDescriptor_size') === null) {
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
    var di = {
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
    function pi(e, t) {
        let n = new h(e, t);
        (n.readVersionAndFlags(), n.readUint32('track_id'));
    }
    var ui = {
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
    function mi(e, t) {
        let n = new h(e, t);
        (n.readUint32('hSpacing'), n.readUint32('vSpacing'), n.finalize());
    }
    var gi = {
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
    function hi(e, t) {
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
    var _i = {
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
    function yi(e, t) {
        new h(e, t).readVersionAndFlags();
    }
    var xi = {
        meta: {
            name: 'Metadata Box',
            text: 'A container for descriptive or annotative metadata.',
            ref: 'ISO/IEC 14496-12, 8.11.1',
        },
    };
    function Si(e, t) {
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
    var bi = {
        encv: {
            name: 'Encrypted Video Sample Entry',
            text: 'A sample entry wrapper indicating that the video stream is encrypted. It contains a Protection Scheme Information (`sinf`) box.',
            ref: 'ISO/IEC 14496-12, 8.12',
        },
    };
    function Ti(e, t) {
        let n = new h(e, t),
            { flags: i } = n.readVersionAndFlags();
        if (i === null) {
            n.finalize();
            return;
        }
        let r = n.readUint32('sample_count');
        if (((e.samples = []), r !== null))
            for (let s = 0; s < r && !n.stopped; s++) {
                let l = { iv: null, subsamples: [] };
                if (n.checkBounds(8)) {
                    let o = new Uint8Array(
                        n.view.buffer,
                        n.view.byteOffset + n.offset,
                        8
                    );
                    ((l.iv = o), (n.offset += 8));
                } else break;
                if ((i & 2) !== 0 && n.checkBounds(2)) {
                    let o = n.view.getUint16(n.offset);
                    ((l.subsample_count = o), (n.offset += 2));
                    for (let c = 0; c < o; c++)
                        if (n.checkBounds(6)) {
                            let f = n.view.getUint16(n.offset),
                                d = n.view.getUint32(n.offset + 2);
                            (l.subsamples.push({
                                BytesOfClearData: f,
                                BytesOfProtectedData: d,
                            }),
                                (n.offset += 6));
                        } else {
                            n.stopped = !0;
                            break;
                        }
                }
                e.samples.push(l);
            }
        n.finalize();
    }
    var Ii = {
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
    function vi(e, t) {
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
    var Ci = {
        enca: {
            name: 'Encrypted Audio Sample Entry',
            text: 'A sample entry wrapper indicating that the audio stream is encrypted. It contains a Protection Scheme Information (`sinf`) box.',
            ref: 'ISO/IEC 14496-12, 8.12',
        },
    };
    function Ei(e, t) {
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
                s = [];
            for (let o = 0; o < 16; o++) {
                let c = n.readUint8(`kid_byte_${o}`);
                if (c !== null) s.push(c.toString(16).padStart(2, '0'));
                else {
                    n.finalize();
                    return;
                }
            }
            let l = e.details.kid_byte_0?.offset;
            if (l !== void 0) {
                e.details.default_KID = {
                    value: s.join(''),
                    offset: l,
                    length: 16,
                };
                for (let o = 0; o < 16; o++) delete e.details[`kid_byte_${o}`];
            }
            if (r === 1 && a === 0) {
                let o = n.readUint8('default_constant_IV_size');
                o !== null && n.skip(o, 'default_constant_IV');
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
            for (let l = 0; l < 16; l++) {
                let o = n.readUint8(`kid_byte_${l}`);
                if (o !== null) a.push(o.toString(16).padStart(2, '0'));
                else {
                    n.finalize();
                    return;
                }
            }
            let s = e.details.kid_byte_0?.offset;
            if (s !== void 0) {
                e.details.default_KID = {
                    value: a.join(''),
                    offset: s,
                    length: 16,
                };
                for (let l = 0; l < 16; l++) delete e.details[`kid_byte_${l}`];
            }
        } else
            (n.addIssue('warn', `Unsupported tenc version ${i}.`),
                n.readRemainingBytes('unsupported_tenc_data'));
        n.finalize();
    }
    var Pi = {
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
    function Di(e, t) {
        let n = new h(e, t);
        (n.readVersionAndFlags(),
            n.readRemainingBytes('id3v2_data'),
            n.finalize());
    }
    var Ai = {
        ID32: {
            name: 'ID3v2 Metadata Box',
            text: 'A box containing ID3 version 2 metadata tags. This is a common but non-standard box often found in files created by tools like FFmpeg, typically within a `udta` or `meta` box.',
            ref: 'User-defined',
        },
    };
    function ki(e, t) {
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
    var Ui = {
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
    function bs(e, t) {
        let n = new h(e, t);
        (n.readNullTerminatedString('content_type'),
            n.offset < e.size && n.readNullTerminatedString('content_encoding'),
            n.finalize());
    }
    function Ts(e, t) {
        let n = new h(e, t);
        (n.skip(6, 'reserved_sample_entry'),
            n.readUint16('data_reference_index'),
            n.readNullTerminatedString('namespace'),
            n.readNullTerminatedString('schema_location'),
            n.readNullTerminatedString('auxiliary_mime_types'));
    }
    var Mi = { stpp: Ts, mime: bs },
        Ri = {
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
    var Li = {
            ftyp: Be,
            styp: Be,
            mvhd: yt,
            mfhd: St,
            tfhd: Tt,
            tfdt: vt,
            trun: Et,
            sidx: Dt,
            tkhd: kt,
            mdhd: Mt,
            hdlr: Lt,
            vmhd: Bt,
            smhd: an,
            stsd: Vt,
            stts: Ot,
            ctts: fn,
            stsc: Ft,
            stsz: Xt,
            stz2: dn,
            stco: jt,
            elst: Kt,
            trex: Yt,
            pssh: on,
            avcC: en,
            avc1: ii,
            mp4a: ai,
            esds: nn,
            btrt: oi,
            sbgp: un,
            tref: gn,
            ...hn,
            subs: yn,
            saiz: Sn,
            saio: Tn,
            sinf: vn,
            frma: En,
            schm: Dn,
            schi: kn,
            stss: Mn,
            sgpd: Ln,
            mehd: Bn,
            sdtp: Vn,
            mfra: On,
            tfra: Fn,
            mfro: Xn,
            pdin: jn,
            cprt: Kn,
            cslg: Yn,
            stdp: Jn,
            'url ': ei,
            'urn ': ti,
            free: Ve,
            skip: Ve,
            iods: ci,
            trep: pi,
            pasp: mi,
            colr: hi,
            meta: yi,
            encv: Si,
            senc: Ti,
            enca: vi,
            tenc: Ei,
            ID32: Di,
            emsg: ki,
            ...Mi,
        },
        Ud = {
            ...Jt,
            ..._t,
            ...qt,
            ...wt,
            ...xt,
            ...bt,
            ...Nn,
            ...It,
            ...Ct,
            ...Pt,
            ...At,
            ...Ut,
            ...Rt,
            ...Nt,
            ...sn,
            ...zt,
            ...$t,
            ...cn,
            ...Ht,
            ...Gt,
            ...pn,
            ...Wt,
            ...Rn,
            ...wn,
            ...Qt,
            ...ln,
            ...tn,
            ...ri,
            ...si,
            ...rn,
            ...li,
            ...mn,
            ..._n,
            ...xn,
            ...bn,
            ...In,
            ...Cn,
            ...Pn,
            ...An,
            ...Un,
            ...zn,
            ...$n,
            ...Hn,
            ...Gn,
            ...Wn,
            ...qn,
            ...Qn,
            ...Zn,
            ...ni,
            ...fi,
            ...di,
            ...ui,
            ...gi,
            ..._i,
            ...xi,
            ...bi,
            ...Ii,
            ...Ci,
            ...Pi,
            ...Ai,
            ...Ui,
            ...Ri,
        };
    var wi = new Set([
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
    function ze(e, t = 0) {
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
                s = String.fromCharCode(
                    i.getUint8(r + 4),
                    i.getUint8(r + 5),
                    i.getUint8(r + 6),
                    i.getUint8(r + 7)
                ),
                l = 8;
            if (a === 1) {
                if (r + 16 > i.byteLength) {
                    n.issues.push({
                        type: 'error',
                        message: `Incomplete largesize box header for type '${s}' at offset ${t + r}. Requires 16 bytes, found ${i.byteLength - r}.`,
                    });
                    break;
                }
                ((a = Number(i.getBigUint64(r + 8))), (l = 16));
            } else a === 0 && (a = i.byteLength - r);
            if (a < l || r + a > i.byteLength) {
                n.issues.push({
                    type: 'error',
                    message: `Invalid size ${a} for box '${s}' at offset ${t + r}. Box claims to extend beyond buffer limits.`,
                });
                break;
            }
            let o = {
                type: s,
                size: a,
                offset: t + r,
                contentOffset: t + r + l,
                headerSize: l,
                children: [],
                details: {},
                issues: [],
            };
            ((o.details.size = {
                value: `${a} bytes`,
                offset: o.offset,
                length: l > 8 ? 8 : 4,
            }),
                (o.details.type = {
                    value: s,
                    offset: o.offset + 4,
                    length: 4,
                }));
            let c = new DataView(e, r, a);
            if (
                (Is(o, c), s === 'emsg' && n.events.push(o), wi.has(s) && a > l)
            ) {
                let f = l,
                    d = o.contentOffset;
                if (
                    s === 'avc1' ||
                    s === 'mp4a' ||
                    s === 'encv' ||
                    s === 'enca'
                ) {
                    let u = s === 'avc1' || s === 'encv' ? 78 : 28;
                    ((f += u), (d += u));
                } else
                    s === 'stsd' || s === 'dref' || s === 'trep'
                        ? ((f += 8), (d += 8))
                        : s === 'meta' && ((f += 4), (d += 4));
                if (a > f) {
                    let u = e.slice(r + f, r + a);
                    if (u.byteLength > 0) {
                        let p = ze(u, d);
                        ((o.children = p.boxes),
                            p.events.length > 0 && n.events.push(...p.events),
                            p.issues.length > 0 && o.issues.push(...p.issues));
                    }
                }
            }
            (s !== 'emsg' && n.boxes.push(o), (r += a));
        }
        return n;
    }
    function Is(e, t) {
        try {
            let n = Li[e.type];
            n
                ? n(e, t)
                : e.type === 'mdat'
                  ? (e.details.info = {
                        value: 'Contains raw media data for samples.',
                        offset: e.contentOffset,
                        length: e.size - e.headerSize,
                    })
                  : wi.has(e.type) ||
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
    function Oe(e, t) {
        let n = e.getUint8(0),
            i = e.getUint8(1),
            r = e.getUint8(2),
            a = e.getUint8(3),
            s = ((i & 31) << 8) | r;
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
            pid: { value: s, offset: t + 1, length: 1.625 },
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
    function vs(e, t) {
        let n = e.getUint32(t),
            i = e.getUint32(t + 4);
        return new Date(
            (n - 2208988800) * 1e3 + (i / 4294967296) * 1e3
        ).toISOString();
    }
    function Bi(e, t) {
        let n = {},
            i = 0,
            r = e.getUint8(i),
            a = (r >> 6) & 3,
            s = (r >> 5) & 1,
            l = (r >> 4) & 1,
            o = (r >> 2) & 3,
            c = (r >> 1) & 1,
            f = r & 1;
        ((n.has_timestamp = { value: a, offset: t + i, length: 0.25 }),
            (n.has_ntp = { value: s, offset: t + i, length: 0.125 }),
            (n.has_ptp = { value: l, offset: t + i, length: 0.125 }),
            (n.has_timecode = { value: o, offset: t + i, length: 0.25 }),
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
            s &&
                ((n.ntp_timestamp = {
                    value: vs(e, i),
                    offset: t + i,
                    length: 8,
                }),
                (i += 8)),
            l &&
                ((n.ptp_timestamp = {
                    value: 'PTP data present',
                    offset: t + i,
                    length: 10,
                }),
                (i += 10)),
            o)
        ) {
            let u = e.byteLength - i;
            n.timecode_data = {
                value: `Timecode data present (${u} bytes)`,
                offset: t + i,
                length: u,
            };
        }
        return n;
    }
    function Ni(e, t) {
        let n = [],
            i = 0;
        for (; i < e.byteLength && !(i + 2 > e.byteLength); ) {
            let r = e.getUint8(i),
                a = e.getUint8(i + 1);
            if (i + 2 + a > e.byteLength) break;
            let s = new DataView(e.buffer, e.byteOffset + i + 2, a),
                l = t + i + 2,
                o,
                c = 'Unknown/Private AF Descriptor';
            switch (r) {
                case 4:
                    ((c = 'Timeline Descriptor'), (o = Bi(s, l)));
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
            (o || (o = { data: { value: `${a} bytes`, offset: l, length: a } }),
                n.push({ tag: r, length: a, name: c, details: o }),
                (i += 2 + a));
        }
        return n;
    }
    function Vi(e) {
        let t = e.getUint8(0),
            n = e.getUint8(1),
            i = e.getUint8(2),
            r = e.getUint8(3),
            a = e.getUint8(4),
            s = e.getUint8(5),
            l =
                (BigInt(t) << 25n) |
                (BigInt(n) << 17n) |
                (BigInt(i) << 9n) |
                (BigInt(r) << 1n) |
                BigInt(a >> 7),
            o = ((BigInt(a) & 1n) << 8n) | BigInt(s);
        return l * 300n + o;
    }
    function Cs(e) {
        let t = (e.getUint8(0) & 14) >> 1,
            n = e.getUint16(1) & 32767,
            i = e.getUint16(3) & 32767;
        return (BigInt(t) << 30n) | (BigInt(n) << 15n) | BigInt(i);
    }
    function zi(e, t) {
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
                    value: Vi(
                        new DataView(e.buffer, e.byteOffset + a)
                    ).toString(),
                    offset: t + a,
                    length: 6,
                }),
                (a += 6)),
            r.opcr_flag.value &&
                a + 6 <= n + 1 &&
                ((r.opcr = {
                    value: Vi(
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
            let l = e.getUint8(a);
            ((r.private_data_length = { value: l, offset: t + a, length: 1 }),
                (a += 1 + l));
        }
        if (r.adaptation_field_extension_flag.value && a + 1 <= n + 1) {
            let l = e.getUint8(a),
                o = e.getUint8(a + 1),
                c = (o >> 4) & 1;
            r.extension = {
                length: { value: l, offset: t + a, length: 1 },
                ltw_flag: {
                    value: (o >> 7) & 1,
                    offset: t + a + 1,
                    length: 0.125,
                },
                piecewise_rate_flag: {
                    value: (o >> 6) & 1,
                    offset: t + a + 1,
                    length: 0.125,
                },
                seamless_splice_flag: {
                    value: (o >> 5) & 1,
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
            if (r.extension.ltw_flag.value && f + 2 <= a + 1 + l) {
                let u = e.getUint16(f);
                ((r.extension.ltw_valid_flag = {
                    value: (u >> 15) & 1,
                    offset: t + f,
                    length: 0.125,
                }),
                    (r.extension.ltw_offset = {
                        value: u & 32767,
                        offset: t + f,
                        length: 1.875,
                    }),
                    (f += 2));
            }
            if (r.extension.piecewise_rate_flag.value && f + 3 <= a + 1 + l) {
                let u = e.getUint32(f - 1) & 1073741568;
                ((r.extension.piecewise_rate = {
                    value: u >> 8,
                    offset: t + f,
                    length: 3,
                }),
                    (f += 3));
            }
            r.extension.seamless_splice_flag.value &&
                f + 5 <= a + 1 + l &&
                ((r.extension.splice_type = {
                    value: e.getUint8(f) >> 4,
                    offset: t + f,
                    length: 0.5,
                }),
                (r.extension.DTS_next_AU = {
                    value: Cs(
                        new DataView(e.buffer, e.byteOffset + f)
                    ).toString(),
                    offset: t + f,
                    length: 5,
                }),
                (f += 5));
            let d = a + 1 + l - f;
            if (d > 0)
                if (c === 0) {
                    let u = new DataView(e.buffer, e.byteOffset + f, d);
                    r.extension.af_descriptors = Ni(u, t + f);
                } else
                    r.extension.reserved_bytes = {
                        value: `${d} reserved bytes`,
                        offset: t + f,
                        length: d,
                    };
            a += 1 + l;
        }
        let s = n + 1 - a;
        return (
            s > 0 &&
                (r.stuffing_bytes = { value: s, offset: t + a, length: s }),
            r
        );
    }
    var Oi = {
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
    var Es = [
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
    function Ps(e) {
        let t = 4294967295;
        for (let n = 0; n < e.byteLength; n++) {
            let i = e.getUint8(n);
            t = (t << 8) ^ Es[((t >> 24) ^ i) & 255];
        }
        return t >>> 0;
    }
    function Q(e) {
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
        let a = new DataView(e.buffer, e.byteOffset, r - 4),
            s = Ps(a),
            l = e.getUint32(r - 4),
            o = s === l,
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
            u = r - 4 - f,
            p = new DataView(e.buffer, e.byteOffset + f, u);
        return {
            header: c,
            payload: p,
            crc: `0x${l.toString(16).padStart(8, '0')}`,
            isValid: o,
        };
    }
    function $e(e, t) {
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
    var $i = {
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
    function Fi(e, t) {
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
    function Hi(e, t) {
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
    function Xi(e, t) {
        let n = e.getUint8(0),
            i = n & 15,
            r = e.getUint8(1),
            a = e.getUint8(2),
            s = {
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
                value: `${s[i] || 'Reserved'} (${i})`,
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
    function Gi(e, t) {
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
    function ji(e, t, n) {
        let i = e.getUint8(0),
            r = `Unknown/Reserved (${i})`,
            a = {
                1: 'Slice, or video access unit',
                2: 'Video access unit',
                3: 'GOP, or SEQ',
                4: 'SEQ',
            },
            s = {
                1: 'AVC slice or AVC access unit',
                2: 'AVC access unit',
                3: 'SVC slice or SVC dependency representation',
                4: 'SVC dependency representation',
                5: 'MVC slice or MVC view-component subset',
                6: 'MVC view-component subset',
                7: 'MVCD slice or MVCD view-component subset',
                8: 'MVCD view-component subset',
            },
            l = {
                1: 'HEVC access unit',
                2: 'HEVC slice',
                3: 'HEVC access unit or slice',
                4: 'HEVC tile of slices',
            },
            o = { 1: 'Sync word' },
            c = [1, 2, 16],
            f = [27, 31, 32, 35, 38],
            d = [36, 37],
            u = [3, 4, 15, 17, 28];
        return (
            c.includes(n)
                ? (r = a[i] || r)
                : f.includes(n)
                  ? (r = s[i] || r)
                  : d.includes(n)
                    ? (r = l[i] || r)
                    : u.includes(n) && (r = o[i] || r),
            { alignment_type: { value: r, offset: t, length: 1 } }
        );
    }
    function Wi(e, t) {
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
    function Ki(e, t) {
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
    function qi(e, t) {
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
    function Yi(e, t) {
        let n = [];
        for (let i = 0; i < e.byteLength && !(i + 4 > e.byteLength); i += 4) {
            let r =
                    String.fromCharCode(e.getUint8(i)) +
                    String.fromCharCode(e.getUint8(i + 1)) +
                    String.fromCharCode(e.getUint8(i + 2)),
                a = e.getUint8(i + 3),
                s = {
                    0: 'Undefined',
                    1: 'Clean effects',
                    2: 'Hearing impaired',
                    3: 'Visual impaired commentary',
                };
            n.push({
                language: { value: r, offset: t + i, length: 3 },
                audio_type: {
                    value: s[a] || `User Private (0x${a.toString(16)})`,
                    offset: t + i + 3,
                    length: 1,
                },
            });
        }
        return { languages: n };
    }
    function Qi(e, t) {
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
    function Ji(e, t) {
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
    function Zi(e, t) {
        return {
            copyright_identifier: {
                value: `0x${e.getUint32(0).toString(16).padStart(8, '0')}`,
                offset: t,
                length: 4,
            },
        };
    }
    function er(e, t) {
        return {
            maximum_bitrate: {
                value: `${(((e.getUint32(0) & 4194303) * 50 * 8) / 1e6).toFixed(2)} Mbps`,
                offset: t,
                length: 4,
            },
        };
    }
    function tr(e, t) {
        return {
            private_data_indicator: {
                value: `0x${e.getUint32(0).toString(16).padStart(8, '0')}`,
                offset: t,
                length: 4,
            },
        };
    }
    function nr(e, t) {
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
    function ir(e, t) {
        return {
            leak_valid_flag: {
                value: e.getUint8(0) & 1,
                offset: t,
                length: 0.125,
            },
        };
    }
    function rr(e, t) {
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
    function ar(e, t) {
        return {
            MPEG4_visual_profile_and_level: {
                value: `0x${e.getUint8(0).toString(16).padStart(2, '0')}`,
                offset: t,
                length: 1,
            },
        };
    }
    function sr(e, t) {
        return {
            MPEG4_audio_profile_and_level: {
                value: `0x${e.getUint8(0).toString(16).padStart(2, '0')}`,
                offset: t,
                length: 1,
            },
        };
    }
    function or(e, t) {
        return {
            textConfig_data: {
                value: `${e.byteLength} bytes of TextConfig data`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function lr(e, t) {
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
    function fr(e, t) {
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
            let s = e.getUint8(i),
                l = (s >> 7) & 1;
            if (
                ((n.temporal_layer_subset_flag = {
                    value: l,
                    offset: t + i,
                    length: 0.125,
                }),
                (n.HEVC_still_present_flag = {
                    value: (s >> 6) & 1,
                    offset: t + i,
                    length: 0.125,
                }),
                (n.HEVC_24hr_picture_present_flag = {
                    value: (s >> 5) & 1,
                    offset: t + i,
                    length: 0.125,
                }),
                (n.sub_pic_hrd_params_not_present_flag = {
                    value: (s >> 4) & 1,
                    offset: t + i,
                    length: 0.125,
                }),
                (n.HDR_WCG_idc = { value: s & 3, offset: t + i, length: 0.25 }),
                (i += 1),
                l)
            ) {
                let o = e.getUint8(i);
                ((n.temporal_id_min = {
                    value: (o >> 5) & 7,
                    offset: t + i,
                    length: 0.375,
                }),
                    (n.temporal_id_max = {
                        value: o & 7,
                        offset: t + i,
                        length: 0.375,
                    }));
            }
        }
        return n;
    }
    function cr(e, t) {
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
        let s = e.getUint8(i) & 1;
        if (
            ((n.picture_and_timing_info_present_flag = {
                value: s,
                offset: t + i,
                length: 0.125,
            }),
            (i += 1),
            s && e.byteLength > i)
        ) {
            let o = (e.getUint8(i) >> 7) & 1;
            ((n['90kHz_flag'] = { value: o, offset: t + i, length: 0.125 }),
                (i += 1),
                o === 0 &&
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
    function dr(e, t) {
        let n = {},
            i = 0,
            r = e.getUint8(i);
        n.num_ptl = { value: r & 63, offset: t + i, length: 0.75 };
        let a = r & 63;
        ((i += 1), (n.profile_tier_level_infos = []));
        for (
            let l = 0;
            l < a && !(i + 12 > e.byteLength || i + 12 > e.byteLength);
            l++
        )
            (n.profile_tier_level_infos.push({
                value: `12 bytes of PTL data for index ${l}`,
                offset: t + i,
                length: 12,
            }),
                (i += 12));
        let s = e.getUint8(i);
        ((n.operation_points_count = { value: s, offset: t + i, length: 1 }),
            (i += 1),
            (n.operation_points = []));
        for (
            let l = 0;
            l < s && !(i + 2 > e.byteLength || i + 2 > e.byteLength);
            l++
        ) {
            let o = {};
            ((o.target_ols = {
                value: e.getUint8(i),
                offset: t + i,
                length: 1,
            }),
                (o.ES_count = {
                    value: e.getUint8(i + 1),
                    offset: t + i + 1,
                    length: 1,
                }));
            let c = o.ES_count.value;
            ((i += 2), (o.es_references = []));
            for (let u = 0; u < c && !(i + 1 > e.byteLength); u++) {
                let p = e.getUint8(i);
                if (i + 1 > e.byteLength) break;
                (o.es_references.push({
                    prepend_dependencies: {
                        value: (p >> 7) & 1,
                        offset: t + i,
                        length: 0.125,
                    },
                    ES_reference: {
                        value: p & 63,
                        offset: t + i,
                        length: 0.75,
                    },
                }),
                    (i += 1));
            }
            if (i + 1 > e.byteLength) break;
            o.numEsInOp = {
                value: e.getUint8(i) & 63,
                offset: t + i,
                length: 0.75,
            };
            let f = o.numEsInOp.value;
            ((i += 1), (o.layers = []));
            for (let u = 0; u < f && !(i + 1 > e.byteLength); u++) {
                let p = e.getUint8(i);
                if (i + 1 > e.byteLength) break;
                (o.layers.push({
                    necessary_layer_flag: {
                        value: (p >> 7) & 1,
                        offset: t + i,
                        length: 0.125,
                    },
                    output_layer_flag: {
                        value: (p >> 6) & 1,
                        offset: t + i,
                        length: 0.125,
                    },
                    ptl_ref_idx: { value: p & 63, offset: t + i, length: 0.75 },
                }),
                    (i += 1));
            }
            if (i + 1 > e.byteLength) break;
            let d = e.getUint8(i);
            if (
                ((o.avg_bit_rate_info_flag = {
                    value: (d >> 7) & 1,
                    offset: t + i,
                    length: 0.125,
                }),
                (o.max_bit_rate_info_flag = {
                    value: (d >> 6) & 1,
                    offset: t + i,
                    length: 0.125,
                }),
                (o.constant_frame_rate_info_idc = {
                    value: (d >> 4) & 3,
                    offset: t + i,
                    length: 0.25,
                }),
                (o.applicable_temporal_id = {
                    value: (d >> 1) & 7,
                    offset: t + i,
                    length: 0.375,
                }),
                (i += 1),
                o.constant_frame_rate_info_idc.value > 0)
            ) {
                if (i + 2 > e.byteLength || i + 2 > e.byteLength) break;
                ((o.frame_rate_indicator = {
                    value: e.getUint16(i) & 4095,
                    offset: t + i,
                    length: 1.5,
                }),
                    (i += 2));
            }
            if (o.avg_bit_rate_info_flag.value === 1) {
                if (i + 3 > e.byteLength || i + 3 > e.byteLength) break;
                ((o.avg_bit_rate = {
                    value: (e.getUint8(i) << 16) | e.getUint16(i + 1),
                    offset: t + i,
                    length: 3,
                }),
                    (i += 3));
            }
            if (o.max_bit_rate_info_flag.value === 1) {
                if (i + 3 > e.byteLength || i + 3 > e.byteLength) break;
                ((o.max_bit_rate = {
                    value: (e.getUint8(i) << 16) | e.getUint16(i + 1),
                    offset: t + i,
                    length: 3,
                }),
                    (i += 3));
            }
            n.operation_points.push(o);
        }
        return n;
    }
    function pr(e, t) {
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
            let o = 0;
            o < a && !(i + 2 > e.byteLength || i + 2 > e.byteLength);
            o++
        )
            (n.intervals.push({
                constant_backlight_voltage_time_interval: {
                    value: e.getUint16(i),
                    offset: t + i,
                    length: 2,
                },
            }),
                (i += 2));
        let l = (e.getUint8(i) >> 6) & 3;
        ((n.num_max_variations = { value: l, offset: t + i, length: 0.25 }),
            (i += 1),
            (n.variations = []));
        for (
            let o = 0;
            o < l && !(i + 2 > e.byteLength || i + 2 > e.byteLength);
            o++
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
    function ur(e, t) {
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
    function mr(e, t) {
        return {
            mpegh3daConfig: {
                value: `${e.byteLength} bytes of config data`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function gr(e, t) {
        return {
            scene_info: {
                value: `${e.byteLength} bytes of scene information`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function hr(e, t) {
        return {
            text_label_info: {
                value: `${e.byteLength} bytes of text label information`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function _r(e, t) {
        return {
            multistream_info: {
                value: `${e.byteLength} bytes of multi-stream information`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function yr(e, t) {
        return {
            drc_loudness_info: {
                value: `${e.byteLength} bytes of DRC/Loudness information`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function xr(e, t) {
        return {
            command_data: {
                value: `${e.byteLength} bytes of command data`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function Sr(e, t) {
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
            let s = e.getUint32(i);
            (n.metrics.push({
                metric_code: {
                    value: `0x${s.toString(16).padStart(8, '0')}`,
                    offset: t + i,
                    length: 4,
                },
            }),
                (i += 4));
        }
        return n;
    }
    function br(e, t) {
        let n = {},
            i = 0;
        if (e.byteLength < 1) return n;
        let r = e.getUint8(i),
            a = (r >> 5) & 7,
            s = (r >> 4) & 1;
        ((n.num_partitions = { value: a, offset: t + i, length: 0.375 }),
            (n.timescale_flag = { value: s, offset: t + i, length: 0.125 }),
            (i += 1));
        let l = -1;
        if (s) {
            let o = e.getUint32(i - 1);
            ((n.ticks_per_second = {
                value: (o >> 8) & 2097151,
                offset: t + i - 1,
                length: 2.625,
            }),
                (l = (e.getUint8(i + 2) >> 5) & 7),
                (n.maximum_duration_length_minus_1 = {
                    value: l,
                    offset: t + i + 2,
                    length: 0.375,
                }),
                (i += 3));
        }
        n.partitions = [];
        for (let o = 0; o < a && !(i + 2 > e.byteLength); o++) {
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
                let u = l + 1;
                if (i + u > e.byteLength) break;
                ((c.maximum_duration = {
                    value: `${u} bytes of duration data`,
                    offset: t + i,
                    length: u,
                }),
                    (i += u));
            }
            n.partitions.push(c);
        }
        return n;
    }
    function Tr(e, t) {
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
                let s = e.getUint8(i);
                ((n.PreambleFlag = {
                    value: (s >> 7) & 1,
                    offset: t + i,
                    length: 0.125,
                }),
                    (n.PatternReference = {
                        value: s & 127,
                        offset: t + i,
                        length: 0.875,
                    }));
            } else
                for (n.additional_substreams = []; i < e.byteLength; ) {
                    let s = e.getUint8(i);
                    (n.additional_substreams.push({
                        Flag: {
                            value: (s >> 7) & 1,
                            offset: t + i,
                            length: 0.125,
                        },
                        AdditionalSubstreamID: {
                            value: s & 127,
                            offset: t + i,
                            length: 0.875,
                        },
                    }),
                        (i += 1));
                }
        return n;
    }
    function Ir(e, t) {
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
    function vr(e, t) {
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
                Object.assign(a, cr(r, t + 1)));
        else if (i === 4)
            ((n = 'AF Extensions Descriptor'),
                (a.af_extensions_data = {
                    value: `${r.byteLength} bytes`,
                    offset: t + 1,
                    length: r.byteLength,
                }));
        else if (i === 5)
            ((n = 'HEVC Operation Point Descriptor'),
                Object.assign(a, dr(r, t + 1)));
        else if (i === 6)
            ((n = 'HEVC Hierarchy Extension Descriptor'), Object.assign(a, {}));
        else if (i === 7)
            ((n = 'Green Extension Descriptor'),
                Object.assign(a, pr(r, t + 1)));
        else if (i === 8)
            ((n = 'MPEG-H 3D Audio Descriptor'),
                Object.assign(a, ur(r, t + 1)));
        else if (i === 9)
            ((n = 'MPEG-H 3D Audio Config Descriptor'),
                Object.assign(a, mr(r, t + 1)));
        else if (i === 10)
            ((n = 'MPEG-H 3D Audio Scene Descriptor'),
                Object.assign(a, gr(r, t + 1)));
        else if (i === 11)
            ((n = 'MPEG-H 3D Audio Text Label Descriptor'),
                Object.assign(a, hr(r, t + 1)));
        else if (i === 12)
            ((n = 'MPEG-H 3D Audio Multi-stream Descriptor'),
                Object.assign(a, _r(r, t + 1)));
        else if (i === 13)
            ((n = 'MPEG-H 3D Audio DRC Loudness Descriptor'),
                Object.assign(a, yr(r, t + 1)));
        else if (i === 14)
            ((n = 'MPEG-H 3D Audio Command Descriptor'),
                Object.assign(a, xr(r, t + 1)));
        else if (i === 15)
            ((n = 'Quality Extension Descriptor'),
                Object.assign(a, Sr(r, t + 1)));
        else if (i === 16)
            ((n = 'Virtual Segmentation Descriptor'),
                Object.assign(a, br(r, t + 1)));
        else if (i === 17)
            ((n = 'Timed Metadata Extension Descriptor'),
                (a.timed_metadata = {
                    value: `${r.byteLength} bytes`,
                    offset: t + 1,
                    length: r.byteLength,
                }));
        else if (i === 18)
            ((n = 'HEVC Tile Substream Descriptor'),
                Object.assign(a, Tr(r, t + 1)));
        else if (i === 19)
            ((n = 'HEVC Subregion Descriptor'), Object.assign(a, Ir(r, t + 1)));
        else {
            let s = e.byteLength - 1;
            s > 0 &&
                (a.reserved_data = {
                    value: `${s} bytes`,
                    offset: t + 1,
                    length: s,
                });
        }
        return { name: n, details: a };
    }
    function Cr(e, t) {
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
    function Er(e, t) {
        return { ES_ID: { value: e.getUint16(0), offset: t, length: 2 } };
    }
    function Pr(e, t) {
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
    function Dr(e, t) {
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
    function Ar(e, t) {
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
    function kr(e, t) {
        return {
            FCR_ES_ID: { value: e.getUint16(0), offset: t, length: 2 },
            FCRResolution: { value: e.getUint32(2), offset: t + 2, length: 4 },
            FCRLength: { value: e.getUint8(6), offset: t + 6, length: 1 },
            FmxRateLength: { value: e.getUint8(7), offset: t + 7, length: 1 },
        };
    }
    function Ur(e, t) {
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
    function Mr(e, t) {
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
    function Rr(e, t) {
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
    function Lr(e, t) {
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
    function wr(e, t) {
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
    function Br(e, t) {
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
            s = 22;
        if (i) {
            let o = e.getUint8(s);
            ((a.stripe_flag = {
                value: (o >> 7) & 1,
                offset: t + s,
                length: 0.125,
            }),
                (a.block_flag = {
                    value: (o >> 6) & 1,
                    offset: t + s,
                    length: 0.125,
                }),
                (a.mdm_flag = {
                    value: (o >> 5) & 1,
                    offset: t + s,
                    length: 0.125,
                }),
                (s += 1));
        } else
            ((a.color_specification = {
                value: e.getUint8(s),
                offset: t + s,
                length: 1,
            }),
                (s += 1));
        let l = e.getUint8(s);
        if (
            ((a.still_mode = {
                value: (l >> 7) & 1,
                offset: t + s,
                length: 0.125,
            }),
            (a.interlaced_video = {
                value: (l >> 6) & 1,
                offset: t + s,
                length: 0.125,
            }),
            (s += 1),
            i)
        ) {
            ((a.colour_primaries = {
                value: e.getUint8(s),
                offset: t + s,
                length: 1,
            }),
                (s += 1),
                (a.transfer_characteristics = {
                    value: e.getUint8(s),
                    offset: t + s,
                    length: 1,
                }),
                (s += 1),
                (a.matrix_coefficients = {
                    value: e.getUint8(s),
                    offset: t + s,
                    length: 1,
                }),
                (s += 1));
            let o = e.getUint8(s);
            ((a.video_full_range_flag = {
                value: (o >> 7) & 1,
                offset: t + s,
                length: 0.125,
            }),
                (s += 1));
        }
        return a;
    }
    function Nr(e, t) {
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
            s = 1;
        if (r && e.byteLength > s) {
            let o = (e.getUint8(s) >> 7) & 1;
            ((a['90kHz_flag'] = { value: o, offset: t + s, length: 0.125 }),
                (s += 1),
                o === 0 &&
                    e.byteLength >= s + 8 &&
                    ((a.N = {
                        value: e.getUint32(s),
                        offset: t + s,
                        length: 4,
                    }),
                    (a.K = {
                        value: e.getUint32(s + 4),
                        offset: t + s + 4,
                        length: 4,
                    }),
                    (s += 8)),
                e.byteLength >= s + 4 &&
                    ((a.num_units_in_tick = {
                        value: e.getUint32(s),
                        offset: t + s,
                        length: 4,
                    }),
                    (s += 4)));
        }
        if (e.byteLength > s) {
            let l = e.getUint8(s);
            ((a.fixed_frame_rate_flag = {
                value: (l >> 7) & 1,
                offset: t + s,
                length: 0.125,
            }),
                (a.temporal_poc_flag = {
                    value: (l >> 6) & 1,
                    offset: t + s,
                    length: 0.125,
                }),
                (a.picture_to_display_conversion_flag = {
                    value: (l >> 5) & 1,
                    offset: t + s,
                    length: 0.125,
                }));
        }
        return a;
    }
    function Vr(e, t) {
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
            let s = e.getUint8(i);
            ((n.content_reference_id_record_length = {
                value: s,
                offset: t + i,
                length: 1,
            }),
                (i += 1),
                (n.content_reference_id_record = {
                    value: `${s} bytes`,
                    offset: t + i,
                    length: s,
                }),
                (i += s));
        }
        if (
            n.content_time_base_indicator.value === 1 ||
            n.content_time_base_indicator.value === 2
        ) {
            let s = e.getUint8(i) & 1,
                l = e.getUint32(i + 1);
            ((n.content_time_base_value = {
                value: ((BigInt(s) << 32n) | BigInt(l)).toString(),
                offset: t + i,
                length: 5,
            }),
                (i += 5));
            let o = e.getUint8(i) & 1,
                c = e.getUint32(i + 1);
            ((n.metadata_time_base_value = {
                value: ((BigInt(o) << 32n) | BigInt(c)).toString(),
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
            let s = e.getUint8(i);
            ((n.time_base_association_data_length = {
                value: s,
                offset: t + i,
                length: 1,
            }),
                (i += 1),
                (n.time_base_association_data = {
                    value: `${s} bytes`,
                    offset: t + i,
                    length: s,
                }),
                (i += s));
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
    function zr(e, t) {
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
            let s = e.getUint8(i);
            ((n.metadata_locator_record_length = {
                value: s,
                offset: t + i,
                length: 1,
            }),
                (i += 1),
                (n.metadata_locator_record = {
                    value: `${s} bytes`,
                    offset: t + i,
                    length: s,
                }),
                (i += s));
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
    function Or(e, t) {
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
            let l = e.getUint8(i);
            ((n.service_identification_length = {
                value: l,
                offset: t + i,
                length: 1,
            }),
                (i += 1),
                (n.service_identification_record = {
                    value: `${l} bytes`,
                    offset: t + i,
                    length: l,
                }),
                (i += l));
        }
        let a = n.decoder_config_flags.value;
        if (a === 1) {
            let l = e.getUint8(i);
            ((n.decoder_config_length = { value: l, offset: t + i, length: 1 }),
                (i += 1),
                (n.decoder_config = {
                    value: `${l} bytes`,
                    offset: t + i,
                    length: l,
                }),
                (i += l));
        } else if (a === 3) {
            let l = e.getUint8(i);
            ((n.dec_config_identification_record_length = {
                value: l,
                offset: t + i,
                length: 1,
            }),
                (i += 1),
                (n.dec_config_identification_record = {
                    value: `${l} bytes`,
                    offset: t + i,
                    length: l,
                }),
                (i += l));
        } else
            a === 4 &&
                ((n.decoder_config_metadata_service_id = {
                    value: e.getUint8(i),
                    offset: t + i,
                    length: 1,
                }),
                (i += 1));
        let s = e.byteLength - i;
        return (
            s > 0 &&
                (n.private_data = {
                    value: `${s} bytes`,
                    offset: t + i,
                    length: s,
                }),
            n
        );
    }
    function $r(e, t) {
        let n = {},
            i = 0,
            r = e.getUint8(i),
            a = e.getUint8(i + 1),
            s = e.getUint8(i + 2);
        ((n.metadata_input_leak_rate = {
            value: ((r & 63) << 16) | (a << 8) | s,
            offset: t + i,
            length: 3,
        }),
            (i += 3));
        let l = e.getUint8(i),
            o = e.getUint8(i + 1),
            c = e.getUint8(i + 2);
        ((n.metadata_buffer_size = {
            value: ((l & 63) << 16) | (o << 8) | c,
            offset: t + i,
            length: 3,
        }),
            (i += 3));
        let f = e.getUint8(i),
            d = e.getUint8(i + 1),
            u = e.getUint8(i + 2);
        return (
            (n.metadata_output_leak_rate = {
                value: ((f & 63) << 16) | (d << 8) | u,
                offset: t + i,
                length: 3,
            }),
            n
        );
    }
    function Fr(e, t) {
        let n = e.getUint8(0),
            i = e.getUint8(1),
            r = e.getUint8(2),
            a = {
                0: 'Main Profile',
                1: 'Low Complexity Profile (LC)',
                2: 'Scalable Sample Rate Profile (SSR)',
                3: 'Reserved',
            },
            s = {
                1: '1 channel (mono)',
                2: '2 channels (stereo)',
                3: '3 channels (front: C, L, R)',
                4: '4 channels (front: C, L, R; back: C)',
                5: '5 channels (front: C, L, R; back: L, R)',
                6: '5.1 channels (front: C, L, R; back: L, R; LFE)',
            },
            l = {
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
                value: `${s[i] || 'Undefined'} (${i})`,
                offset: t + 1,
                length: 1,
            },
            MPEG_2_AAC_additional_information: {
                value: `${l[r] || 'Reserved'} (0x${r.toString(16).padStart(2, '0')})`,
                offset: t + 2,
                length: 1,
            },
        };
    }
    function Hr(e, t) {
        let n = {},
            i = 0,
            r = e.getUint8(i),
            a = (r >> 7) & 1,
            s = r & 15;
        ((n.ASC_flag = { value: a, offset: t + i, length: 0.125 }),
            (n.num_of_loops = { value: s, offset: t + i, length: 0.5 }),
            (i += 1));
        for (let l = 0; l < s && !(i >= e.byteLength); l++) {
            let o = e.getUint8(i);
            ((n[`audioProfileLevelIndication_${l + 1}`] = {
                value: `0x${o.toString(16).padStart(2, '0')}`,
                offset: t + i,
                length: 1,
            }),
                (i += 1));
        }
        if (a && i < e.byteLength) {
            let l = e.getUint8(i);
            ((n.ASC_size = { value: l, offset: t + i, length: 1 }),
                (i += 1),
                i + l <= e.byteLength &&
                    (n.audioSpecificConfig = {
                        value: `${l} bytes of AudioSpecificConfig data`,
                        offset: t + i,
                        length: l,
                    }));
        }
        return n;
    }
    function Xr(e, t) {
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
    function Gr(e, t) {
        return {
            External_ES_ID: { value: e.getUint16(0), offset: t, length: 2 },
        };
    }
    function jr(e, t) {
        return {
            mux_code_table_entry_data: {
                value: `${e.byteLength} bytes of MuxCodeTableEntry data`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function Wr(e, t) {
        return {
            fmx_buffer_size_data: {
                value: `${e.byteLength} bytes of FlexMux Buffer Size data`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function Kr(e, t) {
        return {
            ipmp_data: {
                value: `${e.byteLength} bytes of IPMP data`,
                offset: t,
                length: e.byteLength,
            },
        };
    }
    function qr(e, t) {
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
        for (let s = 0; s < a && !(i + 2 > e.byteLength); s++) {
            let l = {
                level_idc: { value: e.getUint8(i), offset: t + i, length: 1 },
                operation_points: [],
            };
            i += 1;
            let o = e.getUint8(i);
            ((l.operation_points_count = {
                value: o,
                offset: t + i,
                length: 1,
            }),
                (i += 1));
            for (let c = 0; c < o && !(i + 3 > e.byteLength); c++) {
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
                let u = e.getUint8(i);
                ((d.ES_count = { value: u, offset: t + i, length: 1 }),
                    (i += 1));
                for (let p = 0; p < u && !(i + 1 > e.byteLength); p++) {
                    let y = e.getUint8(i);
                    (d.es_references.push({
                        ES_reference: {
                            value: y & 63,
                            offset: t + i,
                            length: 0.75,
                        },
                    }),
                        (i += 1));
                }
                l.operation_points.push(d);
            }
            n.levels.push(l);
        }
        return n;
    }
    function J(e, t, n = null) {
        let i = [],
            r = 0,
            a = n ? parseInt(n, 16) : null;
        for (; r < e.byteLength && !(r + 2 > e.byteLength); ) {
            let s = e.getUint8(r),
                l = e.getUint8(r + 1);
            if (r + 2 + l > e.byteLength) break;
            let o = new DataView(e.buffer, e.byteOffset + r + 2, l),
                c = t + r + 2,
                f,
                d = 'Unknown/Private Descriptor';
            switch (s) {
                case 2:
                    ((d = 'Video Stream Descriptor'), (f = Fi(o, c)));
                    break;
                case 3:
                    ((d = 'Audio Stream Descriptor'), (f = Hi(o, c)));
                    break;
                case 4:
                    ((d = 'Hierarchy Descriptor'), (f = Xi(o, c)));
                    break;
                case 5:
                    ((d = 'Registration Descriptor'), (f = Gi(o, c)));
                    break;
                case 6:
                    ((d = 'Data Stream Alignment Descriptor'),
                        (f = ji(o, c, a)));
                    break;
                case 7:
                    ((d = 'Target Background Grid Descriptor'), (f = Wi(o, c)));
                    break;
                case 8:
                    ((d = 'Video Window Descriptor'), (f = Ki(o, c)));
                    break;
                case 9:
                    ((d = 'Conditional Access Descriptor'), (f = qi(o, c)));
                    break;
                case 10:
                    ((d = 'ISO 639 Language Descriptor'), (f = Yi(o, c)));
                    break;
                case 11:
                    ((d = 'System Clock Descriptor'), (f = Qi(o, c)));
                    break;
                case 12:
                    ((d = 'Multiplex Buffer Utilization Descriptor'),
                        (f = Ji(o, c)));
                    break;
                case 13:
                    ((d = 'Copyright Descriptor'), (f = Zi(o, c)));
                    break;
                case 14:
                    ((d = 'Maximum Bitrate Descriptor'), (f = er(o, c)));
                    break;
                case 15:
                    ((d = 'Private Data Indicator Descriptor'), (f = tr(o, c)));
                    break;
                case 16:
                    ((d = 'Smoothing Buffer Descriptor'), (f = nr(o, c)));
                    break;
                case 17:
                    ((d = 'STD Descriptor'), (f = ir(o, c)));
                    break;
                case 18:
                    ((d = 'IBP Descriptor'), (f = rr(o, c)));
                    break;
                case 27:
                    ((d = 'MPEG-4 Video Descriptor'), (f = ar(o, c)));
                    break;
                case 28:
                    ((d = 'MPEG-4 Audio Descriptor'), (f = sr(o, c)));
                    break;
                case 29:
                    ((d = 'IOD Descriptor'), (f = Cr(o, c)));
                    break;
                case 30:
                    ((d = 'SL Descriptor'), (f = Er(o, c)));
                    break;
                case 31:
                    ((d = 'FMC Descriptor'), (f = Pr(o, c)));
                    break;
                case 32:
                    ((d = 'External ES_ID Descriptor'), (f = Gr(o, c)));
                    break;
                case 33:
                    ((d = 'MuxCode Descriptor'), (f = jr(o, c)));
                    break;
                case 34:
                    ((d = 'FmxBufferSize Descriptor'), (f = Wr(o, c)));
                    break;
                case 35:
                    ((d = 'MultiplexBuffer Descriptor'), (f = Ur(o, c)));
                    break;
                case 36:
                    ((d = 'Content Labeling Descriptor'), (f = Vr(o, c)));
                    break;
                case 37:
                    ((d = 'Metadata Pointer Descriptor'), (f = zr(o, c)));
                    break;
                case 38:
                    ((d = 'Metadata Descriptor'), (f = Or(o, c)));
                    break;
                case 39:
                    ((d = 'Metadata STD Descriptor'), (f = $r(o, c)));
                    break;
                case 40:
                    ((d = 'AVC Video Descriptor'), (f = lr(o, c)));
                    break;
                case 41:
                    ((d = 'IPMP Descriptor'), (f = Kr(o, c)));
                    break;
                case 42:
                    ((d = 'AVC Timing and HRD Descriptor'), (f = Nr(o, c)));
                    break;
                case 43:
                    ((d = 'MPEG-2 AAC Audio Descriptor'), (f = Fr(o, c)));
                    break;
                case 44:
                    ((d = 'FlexMuxTiming Descriptor'), (f = kr(o, c)));
                    break;
                case 45:
                    ((d = 'MPEG-4 Text Descriptor'), (f = or(o, c)));
                    break;
                case 46:
                    ((d = 'MPEG-4 Audio Extension Descriptor'), (f = Hr(o, c)));
                    break;
                case 47:
                    ((d = 'Auxiliary Video Stream Descriptor'), (f = Xr(o, c)));
                    break;
                case 48:
                    ((d = 'SVC Extension Descriptor'), (f = Dr(o, c)));
                    break;
                case 49:
                    ((d = 'MVC Extension Descriptor'), (f = Ar(o, c)));
                    break;
                case 50:
                    ((d = 'J2K Video Descriptor'), (f = Br(o, c)));
                    break;
                case 51:
                    ((d = 'MVC Operation Point Descriptor'), (f = qr(o, c)));
                    break;
                case 52:
                    ((d = 'MPEG-2 Stereoscopic Video Format Descriptor'),
                        (f = Mr(o, c)));
                    break;
                case 53:
                    ((d = 'Stereoscopic Program Info Descriptor'),
                        (f = Rr(o, c)));
                    break;
                case 54:
                    ((d = 'Stereoscopic Video Info Descriptor'),
                        (f = Lr(o, c)));
                    break;
                case 55:
                    ((d = 'Transport Profile Descriptor'), (f = wr(o, c)));
                    break;
                case 56:
                    ((d = 'HEVC Video Descriptor'), (f = fr(o, c)));
                    break;
                case 99: {
                    ({ name: d, details: f } = vr(o, c));
                    break;
                }
                default:
                    f = { data: { value: `${l} bytes`, offset: c, length: l } };
                    break;
            }
            (i.push({ tag: s, length: l, name: d, details: f }), (r += 2 + l));
        }
        return i;
    }
    function Yr(e, t) {
        let n = e.getUint16(0) & 8191,
            i = e.getUint16(2) & 4095,
            r = new DataView(e.buffer, e.byteOffset + 4, i),
            a = J(r, t + 4),
            s = [],
            l = 4 + i;
        for (; l < e.byteLength && !(l + 5 > e.byteLength); ) {
            let o = e.getUint8(l),
                c = e.getUint16(l + 1) & 8191,
                f = e.getUint16(l + 3) & 4095,
                d = new DataView(e.buffer, e.byteOffset + l + 5, f),
                u = J(d, t + l + 5);
            (s.push({
                stream_type: {
                    value: `0x${o.toString(16).padStart(2, '0')}`,
                    offset: t + l,
                    length: 1,
                },
                elementary_PID: { value: c, offset: t + l + 1, length: 1.625 },
                es_info_length: { value: f, offset: t + l + 3, length: 1.5 },
                es_descriptors: u,
            }),
                (l += 5 + f));
        }
        return {
            type: 'PMT',
            pcr_pid: { value: n, offset: t, length: 1.625 },
            program_descriptors: a,
            streams: s,
        };
    }
    var Qr = {
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
    function Jr(e, t) {
        return { type: 'CAT', descriptors: J(e, t) };
    }
    var Zr = {
        CAT: {
            text: 'Conditional Access Table. Provides information on CA systems used in the multiplex.',
            ref: 'Clause 2.4.4.7',
        },
    };
    function ea(e, t) {
        return { type: 'TSDT', descriptors: J(e, t) };
    }
    var ta = {
        TSDT: {
            text: 'Transport Stream Description Table. Contains descriptors that apply to the entire transport stream.',
            ref: 'Clause 2.4.4.13',
        },
    };
    function na(e, t, n, i) {
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
            s = (a >> 1) & 31,
            l = a & 1,
            o = e.getUint8(3),
            c = e.getUint8(4),
            f = 5,
            d = i - (f + 4),
            u = {
                value: `${d} bytes of private data`,
                offset: t + f,
                length: d,
            };
        return {
            type: 'Private Section (long)',
            table_id_extension: { value: r, offset: t, length: 2 },
            version_number: { value: s, offset: t + 2, length: 0.625 },
            current_next_indicator: { value: l, offset: t + 2, length: 0.125 },
            section_number: { value: o, offset: t + 3, length: 1 },
            last_section_number: { value: c, offset: t + 4, length: 1 },
            private_data: u,
        };
    }
    var ia = {
        'Private Section': {
            text: 'A section containing user-defined private data. The structure and meaning of this data is not defined by the MPEG-2 specification.',
            ref: 'Clause 2.4.4.11',
        },
    };
    function ra(e, t) {
        return {
            type: 'IPMP-CIT',
            info: {
                value: 'IPMP Control Information Table present.',
                offset: t,
                length: e.byteLength,
            },
        };
    }
    var aa = {
        'IPMP-CIT': {
            text: 'IPMP Control Information Table. Contains information for Intellectual Property Management and Protection systems.',
            ref: 'Clause 2.4.4.1, ISO/IEC 13818-11',
        },
    };
    function Ds(e) {
        let t = e.getUint8(0),
            n = e.getUint8(1),
            i = e.getUint8(2),
            r = e.getUint8(3),
            a = e.getUint8(4),
            s = e.getUint8(5),
            l = BigInt(t & 56) >> 3n,
            o =
                (BigInt(t & 3) << 13n) |
                (BigInt(n) << 5n) |
                (BigInt(i >> 3) & 0x1fn),
            c =
                (BigInt(i & 3) << 13n) |
                (BigInt(r) << 5n) |
                (BigInt(a >> 3) & 0x1fn),
            f = (l << 30n) | (o << 15n) | c,
            d = ((BigInt(a) & 0x03n) << 7n) | BigInt(s >> 1);
        return f * 300n + d;
    }
    function sa(e, t) {
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
            value: Ds(r).toString(),
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
        let s = e.getUint8(i - 1) & 7;
        return (
            (n.pack_stuffing_length = {
                value: s,
                offset: t + i - 1,
                length: 0.375,
            }),
            s > 0 &&
                (n.stuffing_bytes = {
                    value: `${s} bytes`,
                    offset: t + i,
                    length: s,
                }),
            n
        );
    }
    function Ie(e, t) {
        let n = e.getUint8(t),
            i = e.getUint8(t + 1),
            r = e.getUint8(t + 2),
            a = e.getUint8(t + 3),
            s = e.getUint8(t + 4),
            l = BigInt((n & 14) >> 1),
            o = BigInt((i << 7) | (r >> 1)),
            c = BigInt((a << 7) | (s >> 1));
        return (l << 30n) | (o << 15n) | c;
    }
    function As(e, t) {
        let n = e.getUint8(t),
            i = e.getUint8(t + 1),
            r = e.getUint8(t + 2),
            a = e.getUint8(t + 3),
            s = e.getUint8(t + 4),
            l = e.getUint8(t + 5),
            o = BigInt(n & 56) >> 3n,
            c =
                (BigInt(n & 3) << 13n) |
                (BigInt(i) << 5n) |
                (BigInt(r >> 3) & 0x1fn),
            f =
                (BigInt(r & 3) << 13n) |
                (BigInt(a) << 5n) |
                (BigInt(s >> 3) & 0x1fn),
            d = (o << 30n) | (c << 15n) | f,
            u = ((BigInt(s) & 0x03n) << 7n) | BigInt(l >> 1);
        return d * 300n + u;
    }
    function oa(e, t) {
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
        let s = e.getUint8(6),
            l = e.getUint8(7),
            o = e.getUint8(8),
            c = 9 + o,
            f = 9 + o;
        ((r.marker_bits_2 = {
            value: (s >> 6) & 3,
            offset: t + 6,
            length: 0.25,
        }),
            (r.scrambling_control = {
                value: (s >> 4) & 3,
                offset: t + 6,
                length: 0.25,
            }),
            (r.priority = {
                value: (s >> 3) & 1,
                offset: t + 6,
                length: 0.125,
            }),
            (r.data_alignment_indicator = {
                value: (s >> 2) & 1,
                offset: t + 6,
                length: 0.125,
            }),
            (r.copyright = {
                value: (s >> 1) & 1,
                offset: t + 6,
                length: 0.125,
            }),
            (r.original_or_copy = {
                value: s & 1,
                offset: t + 6,
                length: 0.125,
            }));
        let d = (l >> 6) & 3,
            u = (l >> 5) & 1,
            p = (l >> 4) & 1,
            y = (l >> 3) & 1,
            _ = (l >> 2) & 1,
            b = (l >> 1) & 1,
            S = l & 1;
        ((r.pts_dts_flags = { value: d, offset: t + 7, length: 0.25 }),
            (r.escr_flag = { value: u, offset: t + 7, length: 0.125 }),
            (r.es_rate_flag = { value: p, offset: t + 7, length: 0.125 }),
            (r.dsm_trick_mode_flag = {
                value: y,
                offset: t + 7,
                length: 0.125,
            }),
            (r.additional_copy_info_flag = {
                value: _,
                offset: t + 7,
                length: 0.125,
            }),
            (r.pes_crc_flag = { value: b, offset: t + 7, length: 0.125 }),
            (r.pes_extension_flag = { value: S, offset: t + 7, length: 0.125 }),
            (r.pes_header_data_length = {
                value: o,
                offset: t + 8,
                length: 1,
            }));
        let g = 9;
        if (
            (d === 2 && g + 5 <= f
                ? ((r.pts = {
                      value: Ie(e, g).toString(),
                      offset: t + g,
                      length: 5,
                  }),
                  (g += 5))
                : d === 3 &&
                  g + 10 <= f &&
                  ((r.pts = {
                      value: Ie(e, g).toString(),
                      offset: t + g,
                      length: 5,
                  }),
                  (r.dts = {
                      value: Ie(e, g + 5).toString(),
                      offset: t + g + 5,
                      length: 5,
                  }),
                  (g += 10)),
            u &&
                g + 6 <= f &&
                ((r.ESCR = {
                    value: As(e, g).toString(),
                    offset: t + g,
                    length: 6,
                }),
                (g += 6)),
            p && g + 3 <= f)
        ) {
            let x = e.getUint32(g - 1);
            ((r.ES_rate = {
                value: (x >> 1) & 4194303,
                offset: t + g,
                length: 3,
            }),
                (g += 3));
        }
        if (y && g + 1 <= f) {
            let x = e.getUint8(g),
                T = (x >> 5) & 7;
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
                        value: (x >> 3) & 3,
                        offset: t + g,
                        length: 0.25,
                    }),
                        (r.intra_slice_refresh = {
                            value: (x >> 2) & 1,
                            offset: t + g,
                            length: 0.125,
                        }),
                        (r.frequency_truncation = {
                            value: x & 3,
                            offset: t + g,
                            length: 0.25,
                        }));
                    break;
                case 1:
                case 4:
                    r.rep_cntrl = {
                        value: x & 31,
                        offset: t + g,
                        length: 0.625,
                    };
                    break;
                case 2:
                    r.field_id = {
                        value: (x >> 3) & 3,
                        offset: t + g,
                        length: 0.25,
                    };
                    break;
            }
            g += 1;
        }
        if (
            (_ &&
                g + 1 <= f &&
                ((r.additional_copy_info = {
                    value: e.getUint8(g) & 127,
                    offset: t + g,
                    length: 1,
                }),
                (g += 1)),
            b &&
                g + 2 <= f &&
                ((r.previous_PES_packet_CRC = {
                    value: e.getUint16(g),
                    offset: t + g,
                    length: 2,
                }),
                (g += 2)),
            S && g + 1 <= f)
        ) {
            let x = e.getUint8(g),
                T = (x >> 7) & 1,
                I = (x >> 6) & 1,
                E = (x >> 5) & 1,
                A = (x >> 4) & 1,
                R = x & 1;
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
                    value: E,
                    offset: t + g,
                    length: 0.125,
                }),
                (r.P_STD_buffer_flag = {
                    value: A,
                    offset: t + g,
                    length: 0.125,
                }),
                (r.PES_extension_flag_2 = {
                    value: R,
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
                let P = e.getUint8(g);
                if (
                    ((r.pack_field_length = {
                        value: P,
                        offset: t + g,
                        length: 1,
                    }),
                    (g += 1),
                    g + P <= f)
                ) {
                    let M = new DataView(e.buffer, e.byteOffset + g, P);
                    ((r.pack_header = sa(M, t + g)), (g += P));
                }
            }
            if (E && g + 2 <= f) {
                let P = e.getUint8(g),
                    M = e.getUint8(g + 1);
                ((r.program_packet_sequence_counter = {
                    value: P & 127,
                    offset: t + g,
                    length: 1,
                }),
                    (r.MPEG1_MPEG2_identifier = {
                        value: (M >> 6) & 1,
                        offset: t + g + 1,
                        length: 0.125,
                    }),
                    (r.original_stuff_length = {
                        value: M & 63,
                        offset: t + g + 1,
                        length: 0.75,
                    }),
                    (g += 2));
            }
            if (A && g + 2 <= f) {
                let P = e.getUint16(g);
                ((r.P_STD_buffer_scale = {
                    value: (P >> 13) & 1,
                    offset: t + g,
                    length: 0.125,
                }),
                    (r.P_STD_buffer_size = {
                        value: P & 8191,
                        offset: t + g,
                        length: 1.625,
                    }),
                    (g += 2));
            }
            if (R && g + 1 <= f) {
                let P = e.getUint8(g) & 127;
                if (g + 1 + P <= f) {
                    let M = e.getUint8(g + 1),
                        F = (M >> 7) & 1;
                    if (
                        ((r.PES_extension_field_length = {
                            value: P,
                            offset: t + g,
                            length: 1,
                        }),
                        (r.stream_id_extension_flag = {
                            value: F,
                            offset: t + g + 1,
                            length: 0.125,
                        }),
                        F === 0)
                    )
                        r.stream_id_extension = {
                            value: M & 127,
                            offset: t + g + 1,
                            length: 0.875,
                        };
                    else {
                        let L = M & 1;
                        ((r.tref_extension_flag = {
                            value: L,
                            offset: t + g + 1,
                            length: 0.125,
                        }),
                            L === 0 &&
                                (r.TREF = {
                                    value: Ie(e, g + 2).toString(),
                                    offset: t + g + 2,
                                    length: 5,
                                }));
                    }
                    g += 1 + P;
                }
            }
        }
        return { header: r, payloadOffset: c };
    }
    var la = {
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
    function ks(e, t) {
        let n = e.getUint8(t),
            i = e.getUint8(t + 1),
            r = e.getUint8(t + 2),
            a = e.getUint8(t + 3),
            s = e.getUint8(t + 4),
            l = BigInt((n & 14) >> 1),
            o = BigInt((i << 7) | (r >> 1)),
            c = BigInt((a << 7) | (s >> 1));
        return (l << 30n) | (o << 15n) | c;
    }
    function ve(e, t, n) {
        let r = t.getUint8(0) & 1;
        return (
            (e.infinite_time_flag = { value: r, offset: n, length: 0.125 }),
            r === 0
                ? t.byteLength < 6
                    ? 1
                    : ((e.PTS = {
                          value: ks(t, 1).toString(),
                          offset: n + 1,
                          length: 5,
                      }),
                      6)
                : 1
        );
    }
    function fa(e, t) {
        if (e.byteLength < 1)
            return { type: 'DSM-CC', error: 'Payload too short.' };
        let n = e.getUint8(0),
            i = { command_id: { value: n, offset: t, length: 1 } },
            r = 1;
        if (n === 1) {
            if (e.byteLength < 3) return { type: 'DSM-CC Control', ...i };
            let a = e.getUint16(1),
                s = (a >> 15) & 1,
                l = (a >> 14) & 1,
                o = (a >> 13) & 1;
            if (
                ((i.select_flag = { value: s, offset: t + 1, length: 0.125 }),
                (i.retrieval_flag = { value: l, offset: t + 1, length: 0.125 }),
                (i.storage_flag = { value: o, offset: t + 1, length: 0.125 }),
                (r = 3),
                s)
            ) {
                if (e.byteLength < r + 5)
                    return { type: 'DSM-CC Control', ...i };
                let c = e.getUint16(r),
                    f = e.getUint16(r + 2),
                    d = e.getUint8(r + 4),
                    u = c >> 1,
                    p = ((c & 1) << 14) | (f >> 2),
                    y = f & 3,
                    _ = (BigInt(u) << 17n) | (BigInt(p) << 2n) | BigInt(y);
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
            if (l) {
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
                        (r += ve(
                            i,
                            new DataView(e.buffer, e.byteOffset + r),
                            t + r
                        ))),
                    d)
                ) {
                    let u = e.getUint8(r);
                    ((i.speed_mode = {
                        value: (u >> 7) & 1,
                        offset: t + r,
                        length: 0.125,
                    }),
                        (i.direction_indicator = {
                            value: (u >> 6) & 1,
                            offset: t + r,
                            length: 0.125,
                        }),
                        (r += 1),
                        (r += ve(
                            i,
                            new DataView(e.buffer, e.byteOffset + r),
                            t + r
                        )));
                }
            }
            if (o) {
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
                        (r += ve(
                            i,
                            new DataView(e.buffer, e.byteOffset + r),
                            t + r
                        )));
            }
            return { type: 'DSM-CC Control', ...i };
        } else if (n === 2) {
            if (e.byteLength < 3) return { type: 'DSM-CC Ack', ...i };
            let a = e.getUint16(1),
                s = (a >> 14) & 1,
                l = (a >> 13) & 1,
                o = (a >> 0) & 1;
            return (
                (i.select_ack = {
                    value: (a >> 15) & 1,
                    offset: t + 1,
                    length: 0.125,
                }),
                (i.retrieval_ack = { value: s, offset: t + 1, length: 0.125 }),
                (i.storage_ack = { value: l, offset: t + 1, length: 0.125 }),
                (i.error_ack = {
                    value: (a >> 12) & 1,
                    offset: t + 1,
                    length: 0.125,
                }),
                (i.cmd_status = { value: o, offset: t + 2, length: 0.125 }),
                (r = 3),
                o === 1 &&
                    (s || l) &&
                    ve(i, new DataView(e.buffer, e.byteOffset + r), t + r),
                { type: 'DSM-CC Ack', ...i }
            );
        }
        return { type: 'DSM-CC Unknown', ...i };
    }
    var ca = {
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
        da = 71,
        Us = {
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
    function pa(e) {
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
            if (i.getUint8(a) !== da) continue;
            let s = Oe(new DataView(e, a, 4), a);
            if (s.pid.value === 0 && s.payload_unit_start_indicator.value) {
                let l =
                        s.adaptation_field_control.value & 2
                            ? i.getUint8(a + 4) + 1
                            : 0,
                    o = a + 4 + l;
                if (o >= a + z) continue;
                let c = i.getUint8(o),
                    f = o + 1 + c;
                if (f >= a + z) continue;
                let d = new DataView(e, f, a + z - f),
                    { header: u } = Q(d);
                if (u.table_id === '0x00' && !u.error) {
                    let p = new DataView(e, f + 8),
                        y = f + 8;
                    $e(p, y).programs.forEach((b) => {
                        if (b.type === 'program') {
                            let S = b.program_map_PID.value;
                            (n.pmtPids.add(S),
                                n.programMap[S] ||
                                    (n.programMap[S] = {
                                        programNumber: b.program_number.value,
                                        streams: {},
                                    }));
                        }
                    });
                }
            }
        }
        for (let a = 0; a + z <= e.byteLength; a += z) {
            if (i.getUint8(a) !== da) continue;
            n.totalPackets++;
            let s = new DataView(e, a, z),
                l = Oe(s, a),
                o = l.pid.value,
                c = {
                    offset: a,
                    pid: o,
                    header: l,
                    adaptationField: null,
                    payloadType: 'Data',
                    pes: null,
                    psi: null,
                    fieldOffsets: { header: { offset: a, length: 4 } },
                };
            o !== 8191 &&
                (n.continuityCounters[o] || (n.continuityCounters[o] = []),
                n.continuityCounters[o].push({
                    cc: l.continuity_counter.value,
                    offset: a,
                    hasPayload: (l.adaptation_field_control.value & 1) !== 0,
                }));
            let f = 4;
            if (l.adaptation_field_control.value & 2) {
                let d = i.getUint8(a + f),
                    u = new DataView(e, a + f, d + 1);
                ((c.adaptationField = zi(u, a + f)),
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
            if (l.adaptation_field_control.value & 1 && f < z) {
                let d = f;
                if (l.payload_unit_start_indicator.value) {
                    let p = i.getUint8(a + f);
                    ((c.fieldOffsets.pointerField = {
                        offset: a + f,
                        length: p + 1,
                    }),
                        (d += p + 1));
                }
                if (d >= z) {
                    t.push(c);
                    continue;
                }
                let u = new DataView(e, a + d, z - d);
                if (o === 0 && l.payload_unit_start_indicator.value) {
                    let { header: p, payload: y, isValid: _, crc: b } = Q(u),
                        S = $e(y, a + d + (p.section_syntax_indicator ? 8 : 3));
                    ((S.isValid = _),
                        (S.header = p),
                        (S.crc = b),
                        (c.psi = S),
                        (c.payloadType = 'PSI (PAT)'));
                } else if (o === 1 && l.payload_unit_start_indicator.value) {
                    let { header: p, payload: y, isValid: _, crc: b } = Q(u),
                        S = Jr(y, a + d + (p.section_syntax_indicator ? 8 : 3));
                    ((S.isValid = _),
                        (S.header = p),
                        (S.crc = b),
                        (c.psi = S),
                        (c.payloadType = 'PSI (CAT)'));
                } else if (o === 2 && l.payload_unit_start_indicator.value) {
                    let { header: p, payload: y, isValid: _, crc: b } = Q(u),
                        S = ea(y, a + d + (p.section_syntax_indicator ? 8 : 3));
                    ((S.isValid = _),
                        (S.header = p),
                        (S.crc = b),
                        (c.psi = S),
                        (c.payloadType = 'PSI (TSDT)'),
                        (n.tsdt = S));
                } else if (o === 3 && l.payload_unit_start_indicator.value) {
                    let { header: p, payload: y, isValid: _, crc: b } = Q(u),
                        S = ra(y, a + d + (p.section_syntax_indicator ? 8 : 3));
                    ((S.isValid = _),
                        (S.header = p),
                        (S.crc = b),
                        (c.psi = S),
                        (c.payloadType = 'PSI (IPMP-CIT)'),
                        (n.ipmp = S));
                } else if (
                    (n.pmtPids.has(o) || n.privateSectionPids.has(o)) &&
                    l.payload_unit_start_indicator.value
                ) {
                    let { header: p, payload: y, isValid: _, crc: b } = Q(u),
                        S = parseInt(p.table_id, 16);
                    if (S === 2) {
                        let g = Yr(
                            y,
                            a + d + (p.section_syntax_indicator ? 8 : 3)
                        );
                        ((g.programNumber = p.table_id_extension),
                            (g.isValid = _),
                            (g.header = p),
                            (g.crc = b),
                            (c.psi = g),
                            (c.payloadType = 'PSI (PMT)'),
                            n.programMap[o] &&
                                ((n.programMap[o].programNumber =
                                    g.programNumber),
                                (n.pcrPid = g.pcr_pid.value),
                                g.streams.forEach((x) => {
                                    let T = parseInt(x.stream_type.value, 16),
                                        I =
                                            Us[T] ||
                                            `Unknown (${x.stream_type.value})`;
                                    ((n.programMap[o].streams[
                                        x.elementary_PID.value
                                    ] = I),
                                        T === 5 &&
                                            n.privateSectionPids.add(
                                                x.elementary_PID.value
                                            ),
                                        T === 8 &&
                                            n.dsmccPids.add(
                                                x.elementary_PID.value
                                            ));
                                })));
                    } else if (S >= 64 && S <= 254) {
                        let g = na(
                            y,
                            a + d + 3,
                            p.section_syntax_indicator,
                            p.section_length
                        );
                        ((g.isValid = _),
                            (g.header = p),
                            (g.crc = b),
                            (c.psi = g),
                            (c.payloadType = 'PSI (Private Section)'));
                    }
                } else if (
                    l.payload_unit_start_indicator.value &&
                    u.byteLength >= 6 &&
                    u.getUint32(0) >>> 8 === 1
                ) {
                    c.payloadType = 'PES';
                    let p = oa(u, a + f);
                    if (p) {
                        c.pes = p.header;
                        let y = p.payloadOffset;
                        if (
                            ((c.fieldOffsets.pesHeader = {
                                offset: a + f,
                                length: y,
                            }),
                            parseInt(c.pes.stream_id.value, 16) === 242)
                        ) {
                            c.payloadType = 'PES (DSM-CC)';
                            let b = f + y;
                            if (a + b < a + z) {
                                let S = new DataView(e, a + b, a + z - (a + b));
                                c.pes.payload = fa(S, a + b);
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
                Object.entries(a.streams).forEach(([s, l]) => {
                    r[s] = l;
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
    var ua = {
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
    var Ms = {
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
        Rs = {
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
        Ls = {
            ...Ms,
            ...ua,
            ...Rs,
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
        ws = {
            ...Oi,
            ...Zr,
            ...Ls,
            ...ca,
            ...aa,
            ...$i,
            ...Qr,
            ...la,
            ...ia,
            ...ta,
        };
    function ma(e) {
        try {
            return pa(e);
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
    Fe();
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
    j();
    var ha = (e) =>
            !e || isNaN(e)
                ? 'N/A'
                : e >= 1e6
                  ? `${(e / 1e6).toFixed(2)} Mbps`
                  : `${(e / 1e3).toFixed(0)} kbps`,
        Vs = (e) => {
            if (!e) return 'unknown';
            if (C(e, 'SegmentList').length > 0) return 'SegmentList';
            let t = C(e, 'SegmentTemplate')[0];
            return t
                ? C(t, 'SegmentTimeline').length > 0
                    ? 'SegmentTemplate with SegmentTimeline'
                    : t[':@']?.media?.includes('$Number$')
                      ? 'SegmentTemplate with $Number$'
                      : t[':@']?.media?.includes('$Time$')
                        ? 'SegmentTemplate with $Time$'
                        : 'SegmentTemplate'
                : C(e, 'SegmentBase').length > 0
                  ? 'SegmentBase'
                  : C(e, 'BaseURL').length > 0
                    ? 'BaseURL / Single Segment'
                    : 'Unknown';
        };
    function _a(e, t) {
        let n = new Set(),
            i = new Set(),
            r = e.periods.map((d) => {
                let u = [],
                    p = [],
                    y = [];
                for (let b of d.adaptationSets) {
                    for (let S of b.contentProtection)
                        (n.add(S.system), S.defaultKid && i.add(S.defaultKid));
                    switch (b.contentType) {
                        case 'video':
                            u.push(b);
                            break;
                        case 'audio':
                            p.push(b);
                            break;
                        case 'text':
                        case 'application':
                            y.push(b);
                            break;
                    }
                }
                return {
                    id: d.id,
                    start: d.start,
                    duration: d.duration,
                    videoTracks: u,
                    audioTracks: p,
                    textTracks: y,
                };
            }),
            a = C(t, 'ServiceDescription')[0],
            s = a ? C(a, 'Latency')[0] : null,
            l = r
                .flatMap((d) => d.videoTracks)
                .map((d) => {
                    let u = d.representations
                        .map((p) => p.bandwidth)
                        .filter(Boolean);
                    return {
                        id: d.id || 'N/A',
                        profiles: d.profiles,
                        bitrateRange:
                            u.length > 0
                                ? `${ha(Math.min(...u))} - ${ha(Math.max(...u))}`
                                : 'N/A',
                        resolutions: [
                            ...new Set(
                                d.representations.map(
                                    (p) => `${p.width}x${p.height}`
                                )
                            ),
                        ],
                        codecs: [
                            ...new Set(
                                d.representations
                                    .map((p) => p.codecs)
                                    .filter(Boolean)
                            ),
                        ],
                        scanType: d.representations[0]?.scanType || null,
                        videoRange: null,
                        roles: d.roles.map((p) => p.value).filter(Boolean),
                    };
                }),
            o = r
                .flatMap((d) => d.audioTracks)
                .map((d) => ({
                    id: d.id || 'N/A',
                    lang: d.lang,
                    codecs: [
                        ...new Set(
                            d.representations
                                .map((u) => u.codecs)
                                .filter(Boolean)
                        ),
                    ],
                    channels: [
                        ...new Set(
                            d.representations
                                .flatMap((u) => u.audioChannelConfigurations)
                                .map((u) => u.value)
                                .filter(Boolean)
                        ),
                    ],
                    isDefault: d.roles.some((u) => u.value === 'main'),
                    isForced: !1,
                    roles: d.roles.map((u) => u.value).filter(Boolean),
                })),
            c = r
                .flatMap((d) => d.textTracks)
                .map((d) => ({
                    id: d.id || 'N/A',
                    lang: d.lang,
                    codecsOrMimeTypes: [
                        ...new Set(
                            d.representations
                                .map((u) => u.codecs || u.mimeType)
                                .filter(Boolean)
                        ),
                    ],
                    isDefault: d.roles.some((u) => u.value === 'main'),
                    isForced: d.roles.some((u) => u.value === 'forced'),
                    roles: d.roles.map((u) => u.value).filter(Boolean),
                }));
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
                segmenting: Vs(t),
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
                targetLatency: s ? parseInt(s[':@']?.target, 10) : null,
                minLatency: s ? parseInt(s[':@']?.min, 10) : null,
                maxLatency: s ? parseInt(s[':@']?.max, 10) : null,
                partTargetDuration: null,
                partHoldBack: null,
                canBlockReload: !1,
            },
            content: {
                totalPeriods: e.periods.length,
                totalVideoTracks: l.length,
                totalAudioTracks: o.length,
                totalTextTracks: c.length,
                mediaPlaylists: 0,
                periods: r,
            },
            videoTracks: l,
            audioTracks: o,
            textTracks: c,
            security: {
                isEncrypted: n.size > 0,
                systems: Array.from(n),
                kids: Array.from(i),
            },
        };
    }
    j();
    var W = (e) => e?.['#text'] || null;
    function Xe(e) {
        if (e === null || typeof e != 'object') return e;
        if (e instanceof Date) return new Date(e.getTime());
        if (Array.isArray(e)) return e.map((t) => Xe(t));
        if (e instanceof Object) {
            let t = {};
            for (let n in e)
                Object.prototype.hasOwnProperty.call(e, n) && (t[n] = Xe(e[n]));
            return t;
        }
        throw new Error("Unable to copy obj! Its type isn't supported.");
    }
    var X = (e) => ({
        schemeIdUri: m(e, 'schemeIdUri'),
        value: m(e, 'value'),
        id: m(e, 'id'),
    });
    function zs(e, t) {
        let n = se(t, e);
        return {
            level: m(e, 'level') ? parseInt(m(e, 'level'), 10) : null,
            dependencyLevel: m(e, 'dependencyLevel'),
            bandwidth: m(e, 'bandwidth')
                ? parseInt(m(e, 'bandwidth'), 10)
                : null,
            contentComponent: m(e, 'contentComponent')?.split(' '),
            codecs: m(n, 'codecs'),
            mimeType: m(n, 'mimeType'),
            profiles: m(n, 'profiles'),
            width: m(n, 'width') ? parseInt(m(n, 'width'), 10) : null,
            height: m(n, 'height') ? parseInt(m(n, 'height'), 10) : null,
            serializedManifest: e,
        };
    }
    function Os(e, t) {
        let n = se(t, e);
        return {
            id: m(e, 'id'),
            bandwidth: parseInt(m(e, 'bandwidth'), 10),
            qualityRanking: m(e, 'qualityRanking')
                ? parseInt(m(e, 'qualityRanking'), 10)
                : null,
            dependencyId: m(e, 'dependencyId'),
            associationId: m(e, 'associationId'),
            associationType: m(e, 'associationType'),
            codecs: m(n, 'codecs'),
            mimeType: m(n, 'mimeType'),
            profiles: m(n, 'profiles'),
            width: m(n, 'width') ? parseInt(m(n, 'width'), 10) : null,
            height: m(n, 'height') ? parseInt(m(n, 'height'), 10) : null,
            frameRate: m(n, 'frameRate'),
            sar: m(n, 'sar'),
            scanType: m(n, 'scanType'),
            segmentProfiles: m(n, 'segmentProfiles'),
            mediaStreamStructureId: m(n, 'mediaStreamStructureId'),
            maximumSAPPeriod: m(n, 'maximumSAPPeriod')
                ? parseFloat(m(n, 'maximumSAPPeriod'))
                : null,
            startWithSAP: m(n, 'startWithSAP')
                ? parseInt(m(n, 'startWithSAP'), 10)
                : null,
            maxPlayoutRate: m(n, 'maxPlayoutRate')
                ? parseFloat(m(n, 'maxPlayoutRate'))
                : null,
            codingDependency:
                m(n, 'codingDependency') === 'true'
                    ? !0
                    : m(n, 'codingDependency') === 'false'
                      ? !1
                      : null,
            selectionPriority: m(n, 'selectionPriority')
                ? parseInt(m(n, 'selectionPriority'), 10)
                : 0,
            tag: m(n, 'tag'),
            eptDelta: null,
            pdDelta: null,
            representationIndex: null,
            failoverContent: null,
            audioChannelConfigurations: v(n, 'AudioChannelConfiguration').map(
                (r) => ({
                    schemeIdUri: m(r, 'schemeIdUri'),
                    value: m(r, 'value'),
                })
            ),
            framePackings: v(n, 'FramePacking').map(X),
            ratings: v(n, 'Rating').map(X),
            viewpoints: v(n, 'Viewpoint').map(X),
            accessibility: v(n, 'Accessibility').map(X),
            labels: v(n, 'Label').map((r) => ({
                id: m(r, 'id'),
                lang: m(r, 'lang'),
                text: W(r),
            })),
            groupLabels: v(n, 'GroupLabel').map((r) => ({
                id: m(r, 'id'),
                lang: m(r, 'lang'),
                text: W(r),
            })),
            subRepresentations: v(e, 'SubRepresentation').map((r) => zs(r, n)),
            videoRange: void 0,
            serializedManifest: e,
        };
    }
    function $s(e, t) {
        let n = se(t, e);
        return {
            id: m(e, 'id'),
            group: m(e, 'group') ? parseInt(m(e, 'group'), 10) : null,
            lang: m(e, 'lang'),
            contentType: m(e, 'contentType') || m(e, 'mimeType')?.split('/')[0],
            bitstreamSwitching:
                m(e, 'bitstreamSwitching') === 'true' ? !0 : null,
            maxWidth: m(e, 'maxWidth') ? parseInt(m(e, 'maxWidth'), 10) : null,
            maxHeight: m(e, 'maxHeight')
                ? parseInt(m(e, 'maxHeight'), 10)
                : null,
            maxFrameRate: m(e, 'maxFrameRate'),
            mimeType: m(n, 'mimeType'),
            profiles: m(n, 'profiles'),
            representations: v(e, 'Representation').map((r) => Os(r, n)),
            contentProtection: v(n, 'ContentProtection').map((r) => ({
                schemeIdUri: m(r, 'schemeIdUri'),
                system: Ce(m(r, 'schemeIdUri')),
                defaultKid: m(r, 'cenc:default_KID'),
            })),
            framePackings: v(n, 'FramePacking').map(X),
            ratings: v(n, 'Rating').map(X),
            viewpoints: v(n, 'Viewpoint').map(X),
            accessibility: v(n, 'Accessibility').map(X),
            labels: v(n, 'Label').map((r) => ({
                id: m(r, 'id'),
                lang: m(r, 'lang'),
                text: W(r),
            })),
            groupLabels: v(n, 'GroupLabel').map((r) => ({
                id: m(r, 'id'),
                lang: m(r, 'lang'),
                text: W(r),
            })),
            roles: v(n, 'Role').map(X),
            serializedManifest: e,
        };
    }
    function Fs(e, t) {
        let n = se(t, e),
            i = k(e, 'AssetIdentifier'),
            r = v(e, 'Subset');
        return {
            id: m(e, 'id'),
            start: w(m(e, 'start')),
            duration: w(m(e, 'duration')),
            bitstreamSwitching: m(e, 'bitstreamSwitching') === 'true',
            assetIdentifier: i
                ? { schemeIdUri: m(i, 'schemeIdUri'), value: m(i, 'value') }
                : null,
            subsets: r.map((s) => ({
                contains: (m(s, 'contains') || '').split(' '),
                id: m(s, 'id'),
            })),
            adaptationSets: v(e, 'AdaptationSet').map((s) => $s(s, n)),
            eventStreams: [],
            events: [],
            serializedManifest: e,
        };
    }
    function ya(e, t) {
        let n = Xe(e),
            r = C(n, 'AdaptationSet').some(
                (l) => m(l, 'mimeType') === 'video/mp2t'
            ),
            a = 'unknown';
        r
            ? (a = 'ts')
            : (C(n, 'SegmentTimeline').length > 0 ||
                  C(n, 'SegmentTemplate').length > 0 ||
                  C(n, 'SegmentList').length > 0) &&
              (a = 'isobmff');
        let s = {
            id: m(n, 'id'),
            type: m(n, 'type'),
            profiles: m(n, 'profiles'),
            minBufferTime: w(m(n, 'minBufferTime')),
            publishTime: m(n, 'publishTime')
                ? new Date(m(n, 'publishTime'))
                : null,
            availabilityStartTime: m(n, 'availabilityStartTime')
                ? new Date(m(n, 'availabilityStartTime'))
                : null,
            timeShiftBufferDepth: w(m(n, 'timeShiftBufferDepth')),
            minimumUpdatePeriod: w(m(n, 'minimumUpdatePeriod')),
            duration: w(m(n, 'mediaPresentationDuration')),
            maxSegmentDuration: w(m(n, 'maxSegmentDuration')),
            maxSubsegmentDuration: w(m(n, 'maxSubsegmentDuration')),
            programInformations: v(n, 'ProgramInformation').map((l) => ({
                title: W(k(l, 'Title')),
                source: W(k(l, 'Source')),
                copyright: W(k(l, 'Copyright')),
                lang: m(l, 'lang'),
                moreInformationURL: m(l, 'moreInformationURL'),
            })),
            locations: v(n, 'Location').map(W),
            periods: v(n, 'Period').map((l) => Fs(l, n)),
            segmentFormat: a,
            serializedManifest: e,
            metrics: [],
            events: [],
            summary: null,
            serverControl: null,
        };
        return (
            (s.events = s.periods.flatMap((l) => l.events)),
            (s.summary = _a(s, n)),
            s
        );
    }
    var xa =
            ':A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD',
        Hs = xa + '\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040',
        Xs = '[' + xa + '][' + Hs + ']*',
        Gs = new RegExp('^' + Xs + '$');
    function Ee(e, t) {
        let n = [],
            i = t.exec(e);
        for (; i; ) {
            let r = [];
            r.startIndex = t.lastIndex - i[0].length;
            let a = i.length;
            for (let s = 0; s < a; s++) r.push(i[s]);
            (n.push(r), (i = t.exec(e)));
        }
        return n;
    }
    var ye = function (e) {
        let t = Gs.exec(e);
        return !(t === null || typeof t > 'u');
    };
    function Sa(e) {
        return typeof e < 'u';
    }
    var js = { allowBooleanAttributes: !1, unpairedTags: [] };
    function Ca(e, t) {
        t = Object.assign({}, js, t);
        let n = [],
            i = !1,
            r = !1;
        e[0] === '\uFEFF' && (e = e.substr(1));
        for (let a = 0; a < e.length; a++)
            if (e[a] === '<' && e[a + 1] === '?') {
                if (((a += 2), (a = Ta(e, a)), a.err)) return a;
            } else if (e[a] === '<') {
                let s = a;
                if ((a++, e[a] === '!')) {
                    a = Ia(e, a);
                    continue;
                } else {
                    let l = !1;
                    e[a] === '/' && ((l = !0), a++);
                    let o = '';
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
                        o += e[a];
                    if (
                        ((o = o.trim()),
                        o[o.length - 1] === '/' &&
                            ((o = o.substring(0, o.length - 1)), a--),
                        !eo(o))
                    ) {
                        let d;
                        return (
                            o.trim().length === 0
                                ? (d = "Invalid space after '<'.")
                                : (d = "Tag '" + o + "' is an invalid name."),
                            U('InvalidTag', d, B(e, a))
                        );
                    }
                    let c = qs(e, a);
                    if (c === !1)
                        return U(
                            'InvalidAttr',
                            "Attributes for '" + o + "' have open quote.",
                            B(e, a)
                        );
                    let f = c.value;
                    if (((a = c.index), f[f.length - 1] === '/')) {
                        let d = a - f.length;
                        f = f.substring(0, f.length - 1);
                        let u = va(f, t);
                        if (u === !0) i = !0;
                        else
                            return U(
                                u.err.code,
                                u.err.msg,
                                B(e, d + u.err.line)
                            );
                    } else if (l)
                        if (c.tagClosed) {
                            if (f.trim().length > 0)
                                return U(
                                    'InvalidTag',
                                    "Closing tag '" +
                                        o +
                                        "' can't have attributes or invalid starting.",
                                    B(e, s)
                                );
                            if (n.length === 0)
                                return U(
                                    'InvalidTag',
                                    "Closing tag '" +
                                        o +
                                        "' has not been opened.",
                                    B(e, s)
                                );
                            {
                                let d = n.pop();
                                if (o !== d.tagName) {
                                    let u = B(e, d.tagStartPos);
                                    return U(
                                        'InvalidTag',
                                        "Expected closing tag '" +
                                            d.tagName +
                                            "' (opened in line " +
                                            u.line +
                                            ', col ' +
                                            u.col +
                                            ") instead of closing tag '" +
                                            o +
                                            "'.",
                                        B(e, s)
                                    );
                                }
                                n.length == 0 && (r = !0);
                            }
                        } else
                            return U(
                                'InvalidTag',
                                "Closing tag '" +
                                    o +
                                    "' doesn't have proper closing.",
                                B(e, a)
                            );
                    else {
                        let d = va(f, t);
                        if (d !== !0)
                            return U(
                                d.err.code,
                                d.err.msg,
                                B(e, a - f.length + d.err.line)
                            );
                        if (r === !0)
                            return U(
                                'InvalidXml',
                                'Multiple possible root nodes found.',
                                B(e, a)
                            );
                        (t.unpairedTags.indexOf(o) !== -1 ||
                            n.push({ tagName: o, tagStartPos: s }),
                            (i = !0));
                    }
                    for (a++; a < e.length; a++)
                        if (e[a] === '<')
                            if (e[a + 1] === '!') {
                                (a++, (a = Ia(e, a)));
                                continue;
                            } else if (e[a + 1] === '?') {
                                if (((a = Ta(e, ++a)), a.err)) return a;
                            } else break;
                        else if (e[a] === '&') {
                            let d = Js(e, a);
                            if (d == -1)
                                return U(
                                    'InvalidChar',
                                    "char '&' is not expected.",
                                    B(e, a)
                                );
                            a = d;
                        } else if (r === !0 && !ba(e[a]))
                            return U(
                                'InvalidXml',
                                'Extra text at the end',
                                B(e, a)
                            );
                    e[a] === '<' && a--;
                }
            } else {
                if (ba(e[a])) continue;
                return U(
                    'InvalidChar',
                    "char '" + e[a] + "' is not expected.",
                    B(e, a)
                );
            }
        if (i) {
            if (n.length == 1)
                return U(
                    'InvalidTag',
                    "Unclosed tag '" + n[0].tagName + "'.",
                    B(e, n[0].tagStartPos)
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
    function ba(e) {
        return (
            e === ' ' ||
            e === '	' ||
            e ===
                `
` ||
            e === '\r'
        );
    }
    function Ta(e, t) {
        let n = t;
        for (; t < e.length; t++)
            if (e[t] == '?' || e[t] == ' ') {
                let i = e.substr(n, t - n);
                if (t > 5 && i === 'xml')
                    return U(
                        'InvalidXml',
                        'XML declaration allowed only at the start of the document.',
                        B(e, t)
                    );
                if (e[t] == '?' && e[t + 1] == '>') {
                    t++;
                    break;
                } else continue;
            }
        return t;
    }
    function Ia(e, t) {
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
    var Ws = '"',
        Ks = "'";
    function qs(e, t) {
        let n = '',
            i = '',
            r = !1;
        for (; t < e.length; t++) {
            if (e[t] === Ws || e[t] === Ks)
                i === '' ? (i = e[t]) : i !== e[t] || (i = '');
            else if (e[t] === '>' && i === '') {
                r = !0;
                break;
            }
            n += e[t];
        }
        return i !== '' ? !1 : { value: n, index: t, tagClosed: r };
    }
    var Ys = new RegExp(
        `(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['"])(([\\s\\S])*?)\\5)?`,
        'g'
    );
    function va(e, t) {
        let n = Ee(e, Ys),
            i = {};
        for (let r = 0; r < n.length; r++) {
            if (n[r][1].length === 0)
                return U(
                    'InvalidAttr',
                    "Attribute '" + n[r][2] + "' has no space in starting.",
                    xe(n[r])
                );
            if (n[r][3] !== void 0 && n[r][4] === void 0)
                return U(
                    'InvalidAttr',
                    "Attribute '" + n[r][2] + "' is without value.",
                    xe(n[r])
                );
            if (n[r][3] === void 0 && !t.allowBooleanAttributes)
                return U(
                    'InvalidAttr',
                    "boolean attribute '" + n[r][2] + "' is not allowed.",
                    xe(n[r])
                );
            let a = n[r][2];
            if (!Zs(a))
                return U(
                    'InvalidAttr',
                    "Attribute '" + a + "' is an invalid name.",
                    xe(n[r])
                );
            if (!i.hasOwnProperty(a)) i[a] = 1;
            else
                return U(
                    'InvalidAttr',
                    "Attribute '" + a + "' is repeated.",
                    xe(n[r])
                );
        }
        return !0;
    }
    function Qs(e, t) {
        let n = /\d/;
        for (e[t] === 'x' && (t++, (n = /[\da-fA-F]/)); t < e.length; t++) {
            if (e[t] === ';') return t;
            if (!e[t].match(n)) break;
        }
        return -1;
    }
    function Js(e, t) {
        if ((t++, e[t] === ';')) return -1;
        if (e[t] === '#') return (t++, Qs(e, t));
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
    function Zs(e) {
        return ye(e);
    }
    function eo(e) {
        return ye(e);
    }
    function B(e, t) {
        let n = e.substring(0, t).split(/\r?\n/);
        return { line: n.length, col: n[n.length - 1].length + 1 };
    }
    function xe(e) {
        return e.startIndex + e[1].length;
    }
    var to = {
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
        Ea = function (e) {
            return Object.assign({}, to, e);
        };
    var Pe;
    typeof Symbol != 'function'
        ? (Pe = '@@xmlMetadata')
        : (Pe = Symbol('XML Node Metadata'));
    var O = class {
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
                    (this.child[this.child.length - 1][Pe] = {
                        startIndex: n,
                    }));
        }
        static getMetaDataSymbol() {
            return Pe;
        }
    };
    function Ge(e, t) {
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
                s = '';
            for (; t < e.length; t++)
                if (e[t] === '<' && !a) {
                    if (r && ee(e, '!ENTITY', t)) {
                        t += 7;
                        let l, o;
                        (([l, o, t] = no(e, t + 1)),
                            o.indexOf('&') === -1 &&
                                (n[l] = {
                                    regx: RegExp(`&${l};`, 'g'),
                                    val: o,
                                }));
                    } else if (r && ee(e, '!ELEMENT', t)) {
                        t += 8;
                        let { index: l } = ro(e, t + 1);
                        t = l;
                    } else if (r && ee(e, '!ATTLIST', t)) t += 8;
                    else if (r && ee(e, '!NOTATION', t)) {
                        t += 9;
                        let { index: l } = io(e, t + 1);
                        t = l;
                    } else if (ee(e, '!--', t)) a = !0;
                    else throw new Error('Invalid DOCTYPE');
                    (i++, (s = ''));
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
                } else e[t] === '[' ? (r = !0) : (s += e[t]);
            if (i !== 0) throw new Error('Unclosed DOCTYPE');
        } else throw new Error('Invalid Tag instead of DOCTYPE');
        return { entities: n, i: t };
    }
    var K = (e, t) => {
        for (; t < e.length && /\s/.test(e[t]); ) t++;
        return t;
    };
    function no(e, t) {
        t = K(e, t);
        let n = '';
        for (
            ;
            t < e.length && !/\s/.test(e[t]) && e[t] !== '"' && e[t] !== "'";

        )
            ((n += e[t]), t++);
        if (
            (je(n),
            (t = K(e, t)),
            e.substring(t, t + 6).toUpperCase() === 'SYSTEM')
        )
            throw new Error('External entities are not supported');
        if (e[t] === '%')
            throw new Error('Parameter entities are not supported');
        let i = '';
        return (([t, i] = De(e, t, 'entity')), t--, [n, i, t]);
    }
    function io(e, t) {
        t = K(e, t);
        let n = '';
        for (; t < e.length && !/\s/.test(e[t]); ) ((n += e[t]), t++);
        (je(n), (t = K(e, t)));
        let i = e.substring(t, t + 6).toUpperCase();
        if (i !== 'SYSTEM' && i !== 'PUBLIC')
            throw new Error(`Expected SYSTEM or PUBLIC, found "${i}"`);
        ((t += i.length), (t = K(e, t)));
        let r = null,
            a = null;
        if (i === 'PUBLIC')
            (([t, r] = De(e, t, 'publicIdentifier')),
                (t = K(e, t)),
                (e[t] === '"' || e[t] === "'") &&
                    ([t, a] = De(e, t, 'systemIdentifier')));
        else if (
            i === 'SYSTEM' &&
            (([t, a] = De(e, t, 'systemIdentifier')), !a)
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
    function De(e, t, n) {
        let i = '',
            r = e[t];
        if (r !== '"' && r !== "'")
            throw new Error(`Expected quoted string, found "${r}"`);
        for (t++; t < e.length && e[t] !== r; ) ((i += e[t]), t++);
        if (e[t] !== r) throw new Error(`Unterminated ${n} value`);
        return (t++, [t, i]);
    }
    function ro(e, t) {
        t = K(e, t);
        let n = '';
        for (; t < e.length && !/\s/.test(e[t]); ) ((n += e[t]), t++);
        if (!je(n)) throw new Error(`Invalid element name: "${n}"`);
        t = K(e, t);
        let i = '';
        if (e[t] === 'E' && ee(e, 'MPTY', t)) t += 4;
        else if (e[t] === 'A' && ee(e, 'NY', t)) t += 2;
        else if (e[t] === '(') {
            for (t++; t < e.length && e[t] !== ')'; ) ((i += e[t]), t++);
            if (e[t] !== ')') throw new Error('Unterminated content model');
        } else throw new Error(`Invalid Element Expression, found "${e[t]}"`);
        return { elementName: n, contentModel: i.trim(), index: t };
    }
    function ee(e, t, n) {
        for (let i = 0; i < t.length; i++) if (t[i] !== e[n + i + 1]) return !1;
        return !0;
    }
    function je(e) {
        if (ye(e)) return e;
        throw new Error(`Invalid entity name ${e}`);
    }
    var ao = /^[-+]?0x[a-fA-F0-9]+$/,
        so = /^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/,
        oo = { hex: !0, leadingZeros: !0, decimalPoint: '.', eNotation: !0 };
    function We(e, t = {}) {
        if (((t = Object.assign({}, oo, t)), !e || typeof e != 'string'))
            return e;
        let n = e.trim();
        if (t.skipLike !== void 0 && t.skipLike.test(n)) return e;
        if (e === '0') return 0;
        if (t.hex && ao.test(n)) return po(n, 16);
        if (n.search(/.+[eE].+/) !== -1) return fo(e, n, t);
        {
            let i = so.exec(n);
            if (i) {
                let r = i[1] || '',
                    a = i[2],
                    s = co(i[3]),
                    l = r ? e[a.length + 1] === '.' : e[a.length] === '.';
                if (!t.leadingZeros && (a.length > 1 || (a.length === 1 && !l)))
                    return e;
                {
                    let o = Number(n),
                        c = String(o);
                    if (o === 0) return o;
                    if (c.search(/[eE]/) !== -1) return t.eNotation ? o : e;
                    if (n.indexOf('.') !== -1)
                        return c === '0' || c === s || c === `${r}${s}` ? o : e;
                    let f = a ? s : n;
                    return a
                        ? f === c || r + f === c
                            ? o
                            : e
                        : f === c || f === r + c
                          ? o
                          : e;
                }
            } else return e;
        }
    }
    var lo = /^([-+])?(0*)(\d*(\.\d*)?[eE][-\+]?\d+)$/;
    function fo(e, t, n) {
        if (!n.eNotation) return e;
        let i = t.match(lo);
        if (i) {
            let r = i[1] || '',
                a = i[3].indexOf('e') === -1 ? 'E' : 'e',
                s = i[2],
                l = r ? e[s.length + 1] === a : e[s.length] === a;
            return s.length > 1 && l
                ? e
                : s.length === 1 && (i[3].startsWith(`.${a}`) || i[3][0] === a)
                  ? Number(t)
                  : n.leadingZeros && !l
                    ? ((t = (i[1] || '') + i[3]), Number(t))
                    : e;
        } else return e;
    }
    function co(e) {
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
    function po(e, t) {
        if (parseInt) return parseInt(e, t);
        if (Number.parseInt) return Number.parseInt(e, t);
        if (window && window.parseInt) return window.parseInt(e, t);
        throw new Error(
            'parseInt, Number.parseInt, window.parseInt are not supported'
        );
    }
    function Ke(e) {
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
    var Se = class {
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
                (this.addExternalEntities = uo),
                (this.parseXml = yo),
                (this.parseTextData = mo),
                (this.resolveNameSpace = go),
                (this.buildAttributesMap = _o),
                (this.isItStopNode = To),
                (this.replaceEntitiesValue = So),
                (this.readStopNodeData = vo),
                (this.saveTextToParentTag = bo),
                (this.addChild = xo),
                (this.ignoreAttributesFn = Ke(this.options.ignoreAttributes)));
        }
    };
    function uo(e) {
        let t = Object.keys(e);
        for (let n = 0; n < t.length; n++) {
            let i = t[n];
            this.lastEntities[i] = {
                regex: new RegExp('&' + i + ';', 'g'),
                val: e[i],
            };
        }
    }
    function mo(e, t, n, i, r, a, s) {
        if (
            e !== void 0 &&
            (this.options.trimValues && !i && (e = e.trim()), e.length > 0)
        ) {
            s || (e = this.replaceEntitiesValue(e));
            let l = this.options.tagValueProcessor(t, e, n, r, a);
            return l == null
                ? e
                : typeof l != typeof e || l !== e
                  ? l
                  : this.options.trimValues
                    ? Ye(
                          e,
                          this.options.parseTagValue,
                          this.options.numberParseOptions
                      )
                    : e.trim() === e
                      ? Ye(
                            e,
                            this.options.parseTagValue,
                            this.options.numberParseOptions
                        )
                      : e;
        }
    }
    function go(e) {
        if (this.options.removeNSPrefix) {
            let t = e.split(':'),
                n = e.charAt(0) === '/' ? '/' : '';
            if (t[0] === 'xmlns') return '';
            t.length === 2 && (e = n + t[1]);
        }
        return e;
    }
    var ho = new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`, 'gm');
    function _o(e, t, n) {
        if (this.options.ignoreAttributes !== !0 && typeof e == 'string') {
            let i = Ee(e, ho),
                r = i.length,
                a = {};
            for (let s = 0; s < r; s++) {
                let l = this.resolveNameSpace(i[s][1]);
                if (this.ignoreAttributesFn(l, t)) continue;
                let o = i[s][4],
                    c = this.options.attributeNamePrefix + l;
                if (l.length)
                    if (
                        (this.options.transformAttributeName &&
                            (c = this.options.transformAttributeName(c)),
                        c === '__proto__' && (c = '#__proto__'),
                        o !== void 0)
                    ) {
                        (this.options.trimValues && (o = o.trim()),
                            (o = this.replaceEntitiesValue(o)));
                        let f = this.options.attributeValueProcessor(l, o, t);
                        f == null
                            ? (a[c] = o)
                            : typeof f != typeof o || f !== o
                              ? (a[c] = f)
                              : (a[c] = Ye(
                                    o,
                                    this.options.parseAttributeValue,
                                    this.options.numberParseOptions
                                ));
                    } else this.options.allowBooleanAttributes && (a[c] = !0);
            }
            if (!Object.keys(a).length) return;
            if (this.options.attributesGroupName) {
                let s = {};
                return ((s[this.options.attributesGroupName] = a), s);
            }
            return a;
        }
    }
    var yo = function (e) {
        e = e.replace(
            /\r\n?/g,
            `
`
        );
        let t = new O('!xml'),
            n = t,
            i = '',
            r = '';
        for (let a = 0; a < e.length; a++)
            if (e[a] === '<')
                if (e[a + 1] === '/') {
                    let l = te(e, '>', a, 'Closing Tag is not closed.'),
                        o = e.substring(a + 2, l).trim();
                    if (this.options.removeNSPrefix) {
                        let d = o.indexOf(':');
                        d !== -1 && (o = o.substr(d + 1));
                    }
                    (this.options.transformTagName &&
                        (o = this.options.transformTagName(o)),
                        n && (i = this.saveTextToParentTag(i, n, r)));
                    let c = r.substring(r.lastIndexOf('.') + 1);
                    if (o && this.options.unpairedTags.indexOf(o) !== -1)
                        throw new Error(
                            `Unpaired tag can not be used as closing tag: </${o}>`
                        );
                    let f = 0;
                    (c && this.options.unpairedTags.indexOf(c) !== -1
                        ? ((f = r.lastIndexOf('.', r.lastIndexOf('.') - 1)),
                          this.tagsNodeStack.pop())
                        : (f = r.lastIndexOf('.')),
                        (r = r.substring(0, f)),
                        (n = this.tagsNodeStack.pop()),
                        (i = ''),
                        (a = l));
                } else if (e[a + 1] === '?') {
                    let l = qe(e, a, !1, '?>');
                    if (!l) throw new Error('Pi Tag is not closed.');
                    if (
                        ((i = this.saveTextToParentTag(i, n, r)),
                        !(
                            (this.options.ignoreDeclaration &&
                                l.tagName === '?xml') ||
                            this.options.ignorePiTags
                        ))
                    ) {
                        let o = new O(l.tagName);
                        (o.add(this.options.textNodeName, ''),
                            l.tagName !== l.tagExp &&
                                l.attrExpPresent &&
                                (o[':@'] = this.buildAttributesMap(
                                    l.tagExp,
                                    r,
                                    l.tagName
                                )),
                            this.addChild(n, o, r, a));
                    }
                    a = l.closeIndex + 1;
                } else if (e.substr(a + 1, 3) === '!--') {
                    let l = te(e, '-->', a + 4, 'Comment is not closed.');
                    if (this.options.commentPropName) {
                        let o = e.substring(a + 4, l - 2);
                        ((i = this.saveTextToParentTag(i, n, r)),
                            n.add(this.options.commentPropName, [
                                { [this.options.textNodeName]: o },
                            ]));
                    }
                    a = l;
                } else if (e.substr(a + 1, 2) === '!D') {
                    let l = Ge(e, a);
                    ((this.docTypeEntities = l.entities), (a = l.i));
                } else if (e.substr(a + 1, 2) === '![') {
                    let l = te(e, ']]>', a, 'CDATA is not closed.') - 2,
                        o = e.substring(a + 9, l);
                    i = this.saveTextToParentTag(i, n, r);
                    let c = this.parseTextData(o, n.tagname, r, !0, !1, !0, !0);
                    (c == null && (c = ''),
                        this.options.cdataPropName
                            ? n.add(this.options.cdataPropName, [
                                  { [this.options.textNodeName]: o },
                              ])
                            : n.add(this.options.textNodeName, c),
                        (a = l + 2));
                } else {
                    let l = qe(e, a, this.options.removeNSPrefix),
                        o = l.tagName,
                        c = l.rawTagName,
                        f = l.tagExp,
                        d = l.attrExpPresent,
                        u = l.closeIndex;
                    (this.options.transformTagName &&
                        (o = this.options.transformTagName(o)),
                        n &&
                            i &&
                            n.tagname !== '!xml' &&
                            (i = this.saveTextToParentTag(i, n, r, !1)));
                    let p = n;
                    (p &&
                        this.options.unpairedTags.indexOf(p.tagname) !== -1 &&
                        ((n = this.tagsNodeStack.pop()),
                        (r = r.substring(0, r.lastIndexOf('.')))),
                        o !== t.tagname && (r += r ? '.' + o : o));
                    let y = a;
                    if (this.isItStopNode(this.options.stopNodes, r, o)) {
                        let _ = '';
                        if (f.length > 0 && f.lastIndexOf('/') === f.length - 1)
                            (o[o.length - 1] === '/'
                                ? ((o = o.substr(0, o.length - 1)),
                                  (r = r.substr(0, r.length - 1)),
                                  (f = o))
                                : (f = f.substr(0, f.length - 1)),
                                (a = l.closeIndex));
                        else if (this.options.unpairedTags.indexOf(o) !== -1)
                            a = l.closeIndex;
                        else {
                            let S = this.readStopNodeData(e, c, u + 1);
                            if (!S) throw new Error(`Unexpected end of ${c}`);
                            ((a = S.i), (_ = S.tagContent));
                        }
                        let b = new O(o);
                        (o !== f &&
                            d &&
                            (b[':@'] = this.buildAttributesMap(f, r, o)),
                            _ &&
                                (_ = this.parseTextData(
                                    _,
                                    o,
                                    r,
                                    !0,
                                    d,
                                    !0,
                                    !0
                                )),
                            (r = r.substr(0, r.lastIndexOf('.'))),
                            b.add(this.options.textNodeName, _),
                            this.addChild(n, b, r, y));
                    } else {
                        if (
                            f.length > 0 &&
                            f.lastIndexOf('/') === f.length - 1
                        ) {
                            (o[o.length - 1] === '/'
                                ? ((o = o.substr(0, o.length - 1)),
                                  (r = r.substr(0, r.length - 1)),
                                  (f = o))
                                : (f = f.substr(0, f.length - 1)),
                                this.options.transformTagName &&
                                    (o = this.options.transformTagName(o)));
                            let _ = new O(o);
                            (o !== f &&
                                d &&
                                (_[':@'] = this.buildAttributesMap(f, r, o)),
                                this.addChild(n, _, r, y),
                                (r = r.substr(0, r.lastIndexOf('.'))));
                        } else {
                            let _ = new O(o);
                            (this.tagsNodeStack.push(n),
                                o !== f &&
                                    d &&
                                    (_[':@'] = this.buildAttributesMap(
                                        f,
                                        r,
                                        o
                                    )),
                                this.addChild(n, _, r, y),
                                (n = _));
                        }
                        ((i = ''), (a = u));
                    }
                }
            else i += e[a];
        return t.child;
    };
    function xo(e, t, n, i) {
        this.options.captureMetaData || (i = void 0);
        let r = this.options.updateTag(t.tagname, n, t[':@']);
        r === !1 || (typeof r == 'string' && (t.tagname = r), e.addChild(t, i));
    }
    var So = function (e) {
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
    function bo(e, t, n, i) {
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
    function To(e, t, n) {
        let i = '*.' + n;
        for (let r in e) {
            let a = e[r];
            if (i === a || t === a) return !0;
        }
        return !1;
    }
    function Io(e, t, n = '>') {
        let i,
            r = '';
        for (let a = t; a < e.length; a++) {
            let s = e[a];
            if (i) s === i && (i = '');
            else if (s === '"' || s === "'") i = s;
            else if (s === n[0])
                if (n[1]) {
                    if (e[a + 1] === n[1]) return { data: r, index: a };
                } else return { data: r, index: a };
            else s === '	' && (s = ' ');
            r += s;
        }
    }
    function te(e, t, n, i) {
        let r = e.indexOf(t, n);
        if (r === -1) throw new Error(i);
        return r + t.length - 1;
    }
    function qe(e, t, n, i = '>') {
        let r = Io(e, t + 1, i);
        if (!r) return;
        let a = r.data,
            s = r.index,
            l = a.search(/\s/),
            o = a,
            c = !0;
        l !== -1 &&
            ((o = a.substring(0, l)), (a = a.substring(l + 1).trimStart()));
        let f = o;
        if (n) {
            let d = o.indexOf(':');
            d !== -1 &&
                ((o = o.substr(d + 1)), (c = o !== r.data.substr(d + 1)));
        }
        return {
            tagName: o,
            tagExp: a,
            closeIndex: s,
            attrExpPresent: c,
            rawTagName: f,
        };
    }
    function vo(e, t, n) {
        let i = n,
            r = 1;
        for (; n < e.length; n++)
            if (e[n] === '<')
                if (e[n + 1] === '/') {
                    let a = te(e, '>', n, `${t} is not closed`);
                    if (e.substring(n + 2, a).trim() === t && (r--, r === 0))
                        return { tagContent: e.substring(i, n), i: a };
                    n = a;
                } else if (e[n + 1] === '?')
                    n = te(e, '?>', n + 1, 'StopNode is not closed.');
                else if (e.substr(n + 1, 3) === '!--')
                    n = te(e, '-->', n + 3, 'StopNode is not closed.');
                else if (e.substr(n + 1, 2) === '![')
                    n = te(e, ']]>', n, 'StopNode is not closed.') - 2;
                else {
                    let a = qe(e, n, '>');
                    a &&
                        ((a && a.tagName) === t &&
                            a.tagExp[a.tagExp.length - 1] !== '/' &&
                            r++,
                        (n = a.closeIndex));
                }
    }
    function Ye(e, t, n) {
        if (t && typeof e == 'string') {
            let i = e.trim();
            return i === 'true' ? !0 : i === 'false' ? !1 : We(e, n);
        } else return Sa(e) ? e : '';
    }
    var Qe = O.getMetaDataSymbol();
    function Je(e, t) {
        return Pa(e, t);
    }
    function Pa(e, t, n) {
        let i,
            r = {};
        for (let a = 0; a < e.length; a++) {
            let s = e[a],
                l = Co(s),
                o = '';
            if (
                (n === void 0 ? (o = l) : (o = n + '.' + l),
                l === t.textNodeName)
            )
                i === void 0 ? (i = s[l]) : (i += '' + s[l]);
            else {
                if (l === void 0) continue;
                if (s[l]) {
                    let c = Pa(s[l], t, o),
                        f = Po(c, t);
                    (s[Qe] !== void 0 && (c[Qe] = s[Qe]),
                        s[':@']
                            ? Eo(c, s[':@'], o, t)
                            : Object.keys(c).length === 1 &&
                                c[t.textNodeName] !== void 0 &&
                                !t.alwaysCreateTextNode
                              ? (c = c[t.textNodeName])
                              : Object.keys(c).length === 0 &&
                                (t.alwaysCreateTextNode
                                    ? (c[t.textNodeName] = '')
                                    : (c = '')),
                        r[l] !== void 0 && r.hasOwnProperty(l)
                            ? (Array.isArray(r[l]) || (r[l] = [r[l]]),
                              r[l].push(c))
                            : t.isArray(l, o, f)
                              ? (r[l] = [c])
                              : (r[l] = c));
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
    function Co(e) {
        let t = Object.keys(e);
        for (let n = 0; n < t.length; n++) {
            let i = t[n];
            if (i !== ':@') return i;
        }
    }
    function Eo(e, t, n, i) {
        if (t) {
            let r = Object.keys(t),
                a = r.length;
            for (let s = 0; s < a; s++) {
                let l = r[s];
                i.isArray(l, n + '.' + l, !0, !0)
                    ? (e[l] = [t[l]])
                    : (e[l] = t[l]);
            }
        }
    }
    function Po(e, t) {
        let { textNodeName: n } = t,
            i = Object.keys(e).length;
        return !!(
            i === 0 ||
            (i === 1 && (e[n] || typeof e[n] == 'boolean' || e[n] === 0))
        );
    }
    var oe = class {
        constructor(t) {
            ((this.externalEntities = {}), (this.options = Ea(t)));
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
                let a = Ca(t, n);
                if (a !== !0)
                    throw Error(`${a.err.msg}:${a.err.line}:${a.err.col}`);
            }
            let i = new Se(this.options);
            i.addExternalEntities(this.externalEntities);
            let r = i.parseXml(t);
            return this.options.preserveOrder || r === void 0
                ? r
                : Je(r, this.options);
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
            return O.getMetaDataSymbol();
        }
    };
    async function Ze(e, t) {
        let i = new oe({
                ignoreAttributes: !1,
                attributeNamePrefix: '',
                attributesGroupName: ':@',
                textNodeName: '#text',
                allowBooleanAttributes: !0,
                removeNSPrefix: !0,
                alwaysCreateTextNode: !0,
                isArray: (l) =>
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
                    ].includes(l),
            }).parse(e),
            r = Object.keys(i).find((l) => l.toUpperCase() === 'MPD');
        if (!r)
            throw new Error('Could not find MPD root element in the manifest.');
        let a = i[r];
        return { manifest: ya(a, t), serializedManifest: a, baseUrl: t };
    }
    var Do = (e) =>
        !e || isNaN(e)
            ? 'N/A'
            : e >= 1e6
              ? `${(e / 1e6).toFixed(2)} Mbps`
              : `${(e / 1e3).toFixed(0)} kbps`;
    function Da(e) {
        let { serializedManifest: t } = e,
            n = t.isMaster,
            i = [],
            r = [],
            a = [],
            s = new Set(),
            l = new Set(),
            o = null;
        if (n) {
            ((t.variants || []).forEach((u, p) => {
                let y = u.attributes.CODECS || '',
                    _ = u.attributes.RESOLUTION;
                (y.includes('avc1') || y.includes('hvc1') || _) &&
                    i.push({
                        id: u.attributes['STABLE-VARIANT-ID'] || `variant_${p}`,
                        profiles: null,
                        bitrateRange: Do(u.attributes.BANDWIDTH),
                        resolutions: _ ? [_] : [],
                        codecs: [y],
                        scanType: null,
                        videoRange: u.attributes['VIDEO-RANGE'] || null,
                        roles: [],
                    });
            }),
                (t.media || []).forEach((u, p) => {
                    let y =
                        u['STABLE-RENDITION-ID'] ||
                        `${u.TYPE.toLowerCase()}_${p}`;
                    u.TYPE === 'AUDIO'
                        ? r.push({
                              id: y,
                              lang: u.LANGUAGE,
                              codecs: [],
                              channels: u.CHANNELS ? [u.CHANNELS] : [],
                              isDefault: u.DEFAULT === 'YES',
                              isForced: u.FORCED === 'YES',
                              roles: [],
                          })
                        : (u.TYPE === 'SUBTITLES' ||
                              u.TYPE === 'CLOSED-CAPTIONS') &&
                          a.push({
                              id: y,
                              lang: u.LANGUAGE,
                              codecsOrMimeTypes: [],
                              isDefault: u.DEFAULT === 'YES',
                              isForced: u.FORCED === 'YES',
                              roles: [],
                          });
                }));
            let d = t.tags.find((u) => u.name === 'EXT-X-SESSION-KEY');
            if (
                d &&
                d.value.METHOD !== 'NONE' &&
                (s.add(d.value.METHOD),
                d.value.KEYFORMAT ===
                    'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed' &&
                    d.value.URI)
            )
                try {
                    let p = atob(d.value.URI.split(',')[1]).slice(32, 48);
                    l.add(
                        Array.from(p)
                            .map((y) =>
                                y.charCodeAt(0).toString(16).padStart(2, '0')
                            )
                            .join('')
                    );
                } catch {}
        } else {
            let d = t.segments.find((y) => y.key)?.key;
            d && d.METHOD !== 'NONE' && s.add(d.METHOD);
            let u = t.segments.length,
                p = t.segments.reduce((y, _) => y + _.duration, 0);
            o = {
                segmentCount: u,
                averageSegmentDuration: u > 0 ? p / u : 0,
                hasDiscontinuity: t.segments.some((y) => y.discontinuity),
                isIFrameOnly: t.tags.some(
                    (y) => y.name === 'EXT-X-I-FRAMES-ONLY'
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
                mediaPlaylistDetails: o,
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
                totalPeriods: 1,
                totalVideoTracks: i.length,
                totalAudioTracks: r.length,
                totalTextTracks: a.length,
                mediaPlaylists: n ? (t.variants || []).length : 1,
                periods: [],
            },
            videoTracks: i,
            audioTracks: r,
            textTracks: a,
            security: {
                isEncrypted: s.size > 0,
                systems: Array.from(s),
                kids: Array.from(l),
            },
        };
    }
    function Aa(e) {
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
                    : e.segments.reduce((s, l) => s + l.duration, 0),
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
            n = e.tags.filter((s) => s.name === 'EXT-X-DATERANGE'),
            i = 0,
            r = new Map();
        for (let s of e.segments)
            (s.dateTime && r.set(new Date(s.dateTime).getTime(), i),
                (i += s.duration));
        for (let s of n) {
            let l = new Date(s.value['START-DATE']).getTime(),
                o = parseFloat(s.value.DURATION),
                c = Array.from(r.keys())
                    .filter((f) => f <= l)
                    .pop();
            if (c) {
                let f = (l - c) / 1e3,
                    d = s.value.CLASS === 'com.apple.hls.interstitial';
                t.events.push({
                    startTime: r.get(c) + f,
                    duration: o,
                    message: d
                        ? `Interstitial: ${s.value.ID || 'N/A'}`
                        : `Date Range: ${s.value.ID || 'N/A'}`,
                    messageData: d ? s.value : null,
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
            let s = e.media.reduce((l, o) => {
                let c = o['GROUP-ID'],
                    f = o.TYPE.toLowerCase();
                return (
                    l[f] || (l[f] = {}),
                    l[f][c] || (l[f][c] = []),
                    l[f][c].push(o),
                    l
                );
            }, {});
            (Object.entries(s).forEach(([l, o]) => {
                Object.entries(o).forEach(([c, f], d) => {
                    f.forEach((u, p) => {
                        let y = l === 'subtitles' ? 'text' : l,
                            _ = {
                                id:
                                    u['STABLE-RENDITION-ID'] ||
                                    `${l}-rendition-${c}-${p}`,
                                contentType: y,
                                lang: u.LANGUAGE,
                                mimeType:
                                    y === 'text' ? 'text/vtt' : 'video/mp2t',
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
                                serializedManifest: u,
                            };
                        a.adaptationSets.push(_);
                    });
                });
            }),
                e.variants.forEach((l, o) => {
                    let c = l.attributes.RESOLUTION,
                        f = {
                            id:
                                l.attributes['STABLE-VARIANT-ID'] ||
                                `variant-${o}-rep-0`,
                            codecs: l.attributes.CODECS || '',
                            bandwidth: l.attributes.BANDWIDTH,
                            width: c
                                ? parseInt(String(c).split('x')[0], 10)
                                : null,
                            height: c
                                ? parseInt(String(c).split('x')[1], 10)
                                : null,
                            frameRate: l.attributes['FRAME-RATE'] || null,
                            videoRange: l.attributes['VIDEO-RANGE'],
                            sar: null,
                            qualityRanking: l.attributes.SCORE,
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
                            serializedManifest: l,
                        },
                        d = {
                            id: `variant-${o}`,
                            contentType: 'video',
                            lang: null,
                            mimeType: 'video/mp2t',
                            representations: [f],
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
                            serializedManifest: l,
                        };
                    a.adaptationSets.push(d);
                }));
        } else {
            let s = {
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
                l = e.segments.find((o) => o.key)?.key;
            (l &&
                l.METHOD !== 'NONE' &&
                s.contentProtection.push({
                    schemeIdUri: l.KEYFORMAT || 'identity',
                    system: l.METHOD,
                    defaultKid: null,
                }),
                a.adaptationSets.push(s));
        }
        return (t.periods.push(a), (t.summary = Da(t)), t);
    }
    function $(e) {
        let t = {};
        return (
            (e.match(/("[^"]*")|[^,]+/g) || []).forEach((i) => {
                let r = i.indexOf('=');
                if (r === -1) return;
                let a = i.substring(0, r),
                    s = i.substring(r + 1).replace(/"/g, ''),
                    l = /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : s;
                t[a] = l;
            }),
            t
        );
    }
    function Ao(e, t, n = new Map()) {
        let i = new Map(n),
            r = new URL(t).searchParams;
        return (
            e.forEach((s) => {
                if (s.startsWith('#EXT-X-DEFINE:')) {
                    let l = $(s.substring(14));
                    if (l.NAME && l.VALUE !== void 0)
                        i.set(String(l.NAME), {
                            value: String(l.VALUE),
                            source: 'VALUE',
                        });
                    else if (l.QUERYPARAM) {
                        let o = String(l.QUERYPARAM),
                            c = r.get(o);
                        c !== null &&
                            i.set(o, { value: c, source: `QUERYPARAM (${o})` });
                    } else if (l.IMPORT) {
                        let o = String(l.IMPORT);
                        n.has(o) &&
                            i.set(o, {
                                value: n.get(o).value,
                                source: `IMPORT (${o})`,
                            });
                    }
                }
            }),
            i.size === 0
                ? { substitutedLines: e, definedVariables: i }
                : {
                      substitutedLines: e.map((s) =>
                          s.replace(/{\$[a-zA-Z0-9_-]+}/g, (l) => {
                              let o = l.substring(2, l.length - 1);
                              return i.has(o) ? i.get(o).value : l;
                          })
                      ),
                      definedVariables: i,
                  }
        );
    }
    async function le(e, t, n) {
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
        let { substitutedLines: a, definedVariables: s } = Ao(r, t, n),
            l = a.some((p) => p.startsWith('#EXT-X-STREAM-INF')),
            o = {
                isMaster: l,
                version: 1,
                tags: [],
                segments: [],
                variants: [],
                media: [],
                raw: i,
                baseUrl: t,
                isLive: !l,
                preloadHints: [],
                renditionReports: [],
            },
            c = null,
            f = null,
            d = null;
        for (let p = 1; p < a.length; p++) {
            let y = a[p].trim();
            if (y)
                if (y.startsWith('#EXT')) {
                    let _ = y.indexOf(':'),
                        b,
                        S;
                    switch (
                        (_ === -1
                            ? ((b = y.substring(1)), (S = null))
                            : ((b = y.substring(1, _)),
                              (S = y.substring(_ + 1))),
                        b)
                    ) {
                        case 'EXT-X-STREAM-INF': {
                            o.isMaster = !0;
                            let g = $(S),
                                x = a[++p].trim();
                            o.variants.push({
                                attributes: g,
                                uri: x,
                                resolvedUri: new URL(x, t).href,
                                lineNumber: p,
                            });
                            break;
                        }
                        case 'EXT-X-MEDIA':
                            ((o.isMaster = !0),
                                o.media.push({ ...$(S), lineNumber: p }));
                            break;
                        case 'EXT-X-I-FRAME-STREAM-INF':
                            ((o.isMaster = !0),
                                o.tags.push({
                                    name: b,
                                    value: $(S),
                                    lineNumber: p,
                                }));
                            break;
                        case 'EXTINF': {
                            let [g, x] = S.split(','),
                                T = parseFloat(g);
                            (isNaN(T) && (T = 0),
                                (c = {
                                    duration: T,
                                    title: x || '',
                                    tags: [],
                                    key: f,
                                    parts: [],
                                    bitrate: d,
                                    gap: !1,
                                    type: 'Media',
                                    extinfLineNumber: p,
                                }));
                            break;
                        }
                        case 'EXT-X-GAP':
                            c &&
                                ((c.gap = !0),
                                (c.uri = null),
                                (c.resolvedUrl = null),
                                o.segments.push(c),
                                (c = null));
                            break;
                        case 'EXT-X-BITRATE':
                            d = parseInt(S, 10);
                            break;
                        case 'EXT-X-BYTERANGE':
                            c &&
                                c.tags.push({
                                    name: b,
                                    value: S,
                                    lineNumber: p,
                                });
                            break;
                        case 'EXT-X-DISCONTINUITY':
                            c && (c.discontinuity = !0);
                            break;
                        case 'EXT-X-KEY': {
                            let g = $(S);
                            ((f = g),
                                g.METHOD === 'NONE' && (f = null),
                                o.tags.push({
                                    name: b,
                                    value: g,
                                    lineNumber: p,
                                }));
                            break;
                        }
                        case 'EXT-X-MAP':
                            o.map = { ...$(S), lineNumber: p };
                            break;
                        case 'EXT-X-PROGRAM-DATE-TIME':
                            c && (c.dateTime = S);
                            break;
                        case 'EXT-X-TARGETDURATION':
                            o.targetDuration = parseInt(S, 10);
                            break;
                        case 'EXT-X-MEDIA-SEQUENCE':
                            o.mediaSequence = parseInt(S, 10);
                            break;
                        case 'EXT-X-PLAYLIST-TYPE':
                            ((o.playlistType = S),
                                S === 'VOD'
                                    ? (o.isLive = !1)
                                    : S === 'EVENT' && (o.isLive = !0));
                            break;
                        case 'EXT-X-ENDLIST':
                            ((o.isLive = !1),
                                o.tags.push({
                                    name: b,
                                    value: null,
                                    lineNumber: p,
                                }));
                            break;
                        case 'EXT-X-VERSION':
                            ((o.version = parseInt(S, 10)),
                                o.tags.push({
                                    name: b,
                                    value: o.version,
                                    lineNumber: p,
                                }));
                            break;
                        case 'EXT-X-PART-INF':
                            ((o.partInf = $(S)),
                                o.tags.push({
                                    name: b,
                                    value: o.partInf,
                                    lineNumber: p,
                                }));
                            break;
                        case 'EXT-X-SERVER-CONTROL':
                            ((o.serverControl = $(S)),
                                o.tags.push({
                                    name: b,
                                    value: o.serverControl,
                                    lineNumber: p,
                                }));
                            break;
                        case 'EXT-X-PART':
                            if (c) {
                                let g = $(S);
                                c.parts.push({
                                    ...g,
                                    resolvedUri: new URL(String(g.URI), t).href,
                                    lineNumber: p,
                                });
                            }
                            break;
                        case 'EXT-X-PRELOAD-HINT':
                            (o.preloadHints.push({ ...$(S), lineNumber: p }),
                                o.tags.push({
                                    name: b,
                                    value: o.preloadHints.at(-1),
                                    lineNumber: p,
                                }));
                            break;
                        case 'EXT-X-RENDITION-REPORT':
                            (o.renditionReports.push({
                                ...$(S),
                                lineNumber: p,
                            }),
                                o.tags.push({
                                    name: b,
                                    value: o.renditionReports.at(-1),
                                    lineNumber: p,
                                }));
                            break;
                        case 'EXT-X-DEFINE':
                        case 'EXT-X-SKIP':
                        case 'EXT-X-CONTENT-STEERING':
                        case 'EXT-X-DATERANGE':
                        case 'EXT-X-SESSION-DATA':
                            o.tags.push({
                                name: b,
                                value: $(S),
                                lineNumber: p,
                            });
                            break;
                        default:
                            c
                                ? c.tags.push({
                                      name: b,
                                      value: S,
                                      lineNumber: p,
                                  })
                                : o.tags.push({
                                      name: b,
                                      value: S,
                                      lineNumber: p,
                                  });
                            break;
                    }
                } else
                    y.startsWith('#') ||
                        (c &&
                            ((c.uri = y),
                            (c.resolvedUrl = new URL(y, t).href),
                            (c.uriLineNumber = p),
                            o.segments.push(c),
                            (c = null)));
        }
        return { manifest: Aa(o), definedVariables: s, baseUrl: t };
    }
    j();
    j();
    function ka(e, t) {
        let n = {},
            i = m(e, 'type') === 'dynamic',
            r = i ? new Date(m(e, 'availabilityStartTime')).getTime() : 0;
        return (
            He(e, 'Representation').forEach(({ element: s, context: l }) => {
                let o = m(s, 'id');
                if (!o) return;
                let { period: c, adaptationSet: f } = l;
                if (!c || !f) return;
                let d = m(c, 'id');
                if (!d) {
                    console.warn(
                        'Skipping Representation in Period without an ID.',
                        s
                    );
                    return;
                }
                let u = `${d}-${o}`;
                n[u] = [];
                let p = [s, f, c],
                    y = ga(t, e, c, f, s),
                    _ = Z('SegmentTemplate', p),
                    b = Z('SegmentList', p),
                    S = Z('SegmentBase', p),
                    g = m(_, 'initialization');
                if (!g) {
                    let x = b || S,
                        T = x ? k(x, 'Initialization') : null;
                    T && (g = m(T, 'sourceURL'));
                }
                if (g) {
                    let x = g.replace(/\$RepresentationID\$/g, o);
                    n[u].push({
                        repId: o,
                        type: 'Init',
                        number: 0,
                        resolvedUrl: new URL(x, y).href,
                        template: x,
                        time: -1,
                        duration: 0,
                        timescale: parseInt(m(_ || b, 'timescale') || '1'),
                    });
                }
                if (_) {
                    let x = parseInt(m(_, 'timescale') || '1'),
                        T = m(_, 'media'),
                        I = k(_, 'SegmentTimeline'),
                        E = parseInt(m(_, 'startNumber') || '1'),
                        A = w(m(c, 'start')) || 0;
                    if (T && I) {
                        let R = E,
                            P = 0;
                        v(I, 'S').forEach((M) => {
                            let F = m(M, 't') ? parseInt(m(M, 't')) : P,
                                L = parseInt(m(M, 'd')),
                                ge = parseInt(m(M, 'r') || '0');
                            P = F;
                            for (let he = 0; he <= ge; he++) {
                                let re = P,
                                    _e = A + re / x,
                                    mt = L / x,
                                    ae = T.replace(/\$RepresentationID\$/g, o)
                                        .replace(
                                            /\$Number(%0\d+d)?\$/g,
                                            (al, Le) =>
                                                String(R).padStart(
                                                    Le
                                                        ? parseInt(
                                                              Le.substring(
                                                                  2,
                                                                  Le.length - 1
                                                              )
                                                          )
                                                        : 1,
                                                    '0'
                                                )
                                        )
                                        .replace(/\$Time\$/g, String(re));
                                (n[u].push({
                                    repId: o,
                                    type: 'Media',
                                    number: R,
                                    resolvedUrl: new URL(ae, y).href,
                                    template: ae,
                                    time: re,
                                    duration: L,
                                    timescale: x,
                                    startTimeUTC: r + _e * 1e3,
                                    endTimeUTC: r + (_e + mt) * 1e3,
                                }),
                                    (P += L),
                                    R++);
                            }
                        });
                    } else if (T && m(_, 'duration')) {
                        let R = parseInt(m(_, 'duration')),
                            P = R / x,
                            M = 0,
                            F = E;
                        if (i) M = 10;
                        else {
                            let L =
                                w(m(e, 'mediaPresentationDuration')) ||
                                w(m(c, 'duration'));
                            if (!L || !P) return;
                            M = Math.ceil(L / P);
                        }
                        for (let L = 0; L < M; L++) {
                            let ge = F + L,
                                he = (ge - E) * R,
                                re = A + he / x,
                                _e = T.replace(
                                    /\$RepresentationID\$/g,
                                    o
                                ).replace(/\$Number(%0\d+d)?\$/g, (mt, ae) =>
                                    String(ge).padStart(
                                        ae
                                            ? parseInt(
                                                  ae.substring(2, ae.length - 1)
                                              )
                                            : 1,
                                        '0'
                                    )
                                );
                            n[u].push({
                                repId: o,
                                type: 'Media',
                                number: ge,
                                resolvedUrl: new URL(_e, y).href,
                                template: _e,
                                time: he,
                                duration: R,
                                timescale: x,
                                startTimeUTC: r + re * 1e3,
                                endTimeUTC: r + (re + P) * 1e3,
                            });
                        }
                    }
                } else if (b) {
                    let x = parseInt(m(b, 'timescale') || '1'),
                        T = parseInt(m(b, 'duration')),
                        I = T / x,
                        E = 0,
                        A = w(m(c, 'start')) || 0;
                    v(b, 'SegmentURL').forEach((P, M) => {
                        let F = m(P, 'media');
                        if (F) {
                            let L = A + E / x;
                            (n[u].push({
                                repId: o,
                                type: 'Media',
                                number: M + 1,
                                resolvedUrl: new URL(F, y).href,
                                template: F,
                                time: E,
                                duration: T,
                                timescale: x,
                                startTimeUTC: r + L * 1e3,
                                endTimeUTC: r + (L + I) * 1e3,
                            }),
                                (E += T));
                        }
                    });
                } else if (S || k(s, 'BaseURL')) {
                    let x = parseInt(m(f, 'timescale') || '1'),
                        T =
                            w(m(e, 'mediaPresentationDuration')) ||
                            w(m(c, 'duration')) ||
                            0;
                    n[u].push({
                        repId: o,
                        type: 'Media',
                        number: 1,
                        resolvedUrl: y,
                        template: k(s, 'BaseURL') ? 'BaseURL' : 'SegmentBase',
                        time: 0,
                        duration: T * x,
                        timescale: x,
                        startTimeUTC: 0,
                        endTimeUTC: 0,
                    });
                }
            }),
            n
        );
    }
    j();
    var fe = [
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
                m(e, 'profiles') !== void 0 && m(e, 'profiles') !== '',
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
            check: (e) => m(e, 'minBufferTime') !== void 0,
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
                m(e, 'type') === 'static' || m(e, 'type') === 'dynamic',
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
                    ? m(e, 'id') !== void 0 && m(e, 'publishTime') !== void 0
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
                t ? m(e, 'availabilityStartTime') !== void 0 : 'skip',
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
                t ? m(e, 'publishTime') !== void 0 : 'skip',
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
                t ? m(e, 'minimumUpdatePeriod') !== void 0 : 'skip',
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
                let n = m(e, 'mediaPresentationDuration') !== void 0,
                    i = v(e, 'Period'),
                    r = i[i.length - 1],
                    a = r ? m(r, 'duration') !== void 0 : !1;
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
                t ? 'skip' : m(e, 'minimumUpdatePeriod') === void 0,
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
                t ? 'skip' : m(e, 'timeShiftBufferDepth') === void 0,
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
                t ? m(e, 'id') !== void 0 : 'skip',
            passDetails: 'OK',
            failDetails: (e) =>
                `Period (start="${m(e, 'start')}") requires an @id in dynamic manifests.`,
        },
        {
            id: 'PERIOD-2',
            text: 'Period contains at least one AdaptationSet',
            isoRef: 'Clause 5.3.2.2, Table 4',
            severity: 'warn',
            scope: 'Period',
            category: 'Manifest Structure',
            check: (e) => {
                let t = m(e, 'duration');
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
                    : t.every((n) => m(n, 'schemeIdUri'));
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
                m(e, 'contentType') !== void 0 || m(e, 'mimeType') !== void 0,
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
                    ? m(e, 'segmentAlignment') === 'true' ||
                      m(e, 'segmentAlignment') === 1
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
            check: (e) => m(e, 'id') !== void 0,
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
            check: (e) => m(e, 'bandwidth') !== void 0,
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
                m(e, 'mimeType') !== void 0 || m(t, 'mimeType') !== void 0,
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
                let n = m(e, 'dependencyId');
                return n ? n.split(' ').every((i) => t.has(i)) : 'skip';
            },
            passDetails: 'OK',
            failDetails: (e) =>
                `One or more IDs in @dependencyId="${m(e, 'dependencyId')}" do not exist in this Period.`,
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
                let r = Z('SegmentTemplate', [e, t, n]),
                    a = m(r, 'media');
                return !r || !a?.includes('$Number$')
                    ? 'skip'
                    : m(r, 'duration') !== void 0 || !!k(r, 'SegmentTimeline');
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
                let r = Z('SegmentTemplate', [e, t, n]);
                return !r || !m(r, 'media')?.includes('$Time$')
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
                    ? m(e, 'type') === 'static'
                    : 'skip',
            passDetails: 'OK',
            failDetails: (e) =>
                `Profile requires 'static', but found '${m(e, 'type')}'`,
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
                let n = m(e, 'mimeType');
                if (n !== 'video/mp4' && n !== 'audio/mp4') return 'skip';
                let i = m(e, 'containerProfiles') || '';
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
                return n ? m(n, 'target') !== void 0 : 'skip';
            },
            passDetails: 'OK',
            failDetails: 'The <Latency> element must have a @target attribute.',
        },
    ];
    var ne = [
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
    j();
    function et(e, t, n = {}) {
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
                u = f.type === 'dynamic',
                p = f.hls?.version || 1,
                y = f.hls?.targetDuration || null,
                _ = {
                    isLive: u,
                    version: p,
                    targetDuration: y,
                    hlsParsed: f,
                    ...n,
                },
                b = (g, x, T = '') => {
                    let I = g.check(x, _);
                    if (I !== 'skip') {
                        let E = I ? 'pass' : g.severity,
                            A = {
                                startLine:
                                    x.extinfLineNumber || x.lineNumber || 1,
                                endLine: x.uriLineNumber || x.lineNumber || 1,
                            };
                        d.push({
                            id: g.id,
                            text: `${g.text} ${T}`,
                            status: E,
                            details: I ? g.passDetails : g.failDetails,
                            isoRef: g.isoRef,
                            category: g.category,
                            location: A,
                        });
                    }
                },
                S = ['Playlist'];
            if (
                (f.isMaster
                    ? S.push('MasterPlaylist')
                    : S.push('MediaPlaylist'),
                ne.filter((g) => S.includes(g.scope)).forEach((g) => b(g, f)),
                f.isMaster ||
                    ((f.segments || []).forEach((g, x) => {
                        ne.filter((T) => T.scope === 'Segment').forEach((T) =>
                            b(T, g, `(Segment ${x + 1})`)
                        );
                    }),
                    (f.tags || [])
                        .filter((g) => g.name === 'EXT-X-KEY')
                        .forEach((g, x) => {
                            let T = { ...g.value, lineNumber: g.lineNumber };
                            ne.filter((I) => I.scope === 'Key').forEach((I) =>
                                b(I, T, `(Key ${x + 1}, Method: ${T.METHOD})`)
                            );
                        })),
                f.isMaster)
            ) {
                ((f.variants || []).forEach((x, T) => {
                    ne.filter((I) => I.scope === 'Variant').forEach((I) =>
                        b(
                            I,
                            x,
                            `(Variant Stream ${T + 1}, BW: ${x.attributes?.BANDWIDTH || 'N/A'})`
                        )
                    );
                }),
                    (f.tags || [])
                        .filter((x) => x.name === 'EXT-X-I-FRAME-STREAM-INF')
                        .forEach((x, T) => {
                            let I = { ...x.value, lineNumber: x.lineNumber };
                            ne.filter(
                                (E) => E.scope === 'IframeVariant'
                            ).forEach((E) =>
                                b(
                                    E,
                                    I,
                                    `(I-Frame Stream ${T + 1}, BW: ${I?.BANDWIDTH || 'N/A'})`
                                )
                            );
                        }));
                let g = {};
                ((f.tags.filter((x) => x.name === 'EXT-X-MEDIA') || []).forEach(
                    (x) => {
                        let T = x.value['GROUP-ID'],
                            I = x.value.TYPE;
                        (g[I] || (g[I] = {}),
                            g[I][T] || (g[I][T] = []),
                            g[I][T].push({
                                ...x.value,
                                lineNumber: x.lineNumber,
                            }));
                    }
                ),
                    Object.values(g).forEach((x) => {
                        Object.values(x).forEach((T, I) => {
                            ne.filter((E) => E.scope === 'MediaGroup').forEach(
                                (E) =>
                                    b(
                                        E,
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
            let f = fe.find((d) => d.id === 'MPD-1');
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
            s = m(i, 'type') === 'dynamic',
            l = (m(i, 'profiles') || '').toLowerCase(),
            o = { isDynamic: s, profiles: l },
            c = (f, d, u) => (typeof f == 'function' ? f(d, u) : f);
        return (
            fe
                .filter((f) => f.scope === 'MPD')
                .forEach((f) => {
                    let d = f.check(i, o);
                    if (d !== 'skip') {
                        let u = d ? 'pass' : f.severity;
                        a.push({
                            id: f.id,
                            text: f.text,
                            status: u,
                            details: c(d ? f.passDetails : f.failDetails, i, o),
                            isoRef: f.isoRef,
                            category: f.category,
                            location: { path: r },
                        });
                    }
                }),
            v(i, 'Period').forEach((f, d) => {
                let u = `${r}.Period[${d}]`,
                    p = new Set(
                        C(f, 'Representation')
                            .map((_) => m(_, 'id'))
                            .filter(Boolean)
                    ),
                    y = { ...o, allRepIdsInPeriod: p, period: f };
                (fe
                    .filter((_) => _.scope === 'Period')
                    .forEach((_) => {
                        let b = _.check(f, y);
                        if (b !== 'skip') {
                            let S = b ? 'pass' : _.severity;
                            a.push({
                                id: _.id,
                                text: `${_.text} (Period: ${m(f, 'id') || 'N/A'})`,
                                status: S,
                                details: c(
                                    b ? _.passDetails : _.failDetails,
                                    f,
                                    y
                                ),
                                isoRef: _.isoRef,
                                category: _.category,
                                location: { path: u },
                            });
                        }
                    }),
                    v(f, 'AdaptationSet').forEach((_, b) => {
                        let S = `${u}.AdaptationSet[${b}]`,
                            g = { ...y, adaptationSet: _ };
                        (fe
                            .filter((x) => x.scope === 'AdaptationSet')
                            .forEach((x) => {
                                let T = x.check(_, g);
                                if (T !== 'skip') {
                                    let I = T ? 'pass' : x.severity;
                                    a.push({
                                        id: x.id,
                                        text: `${x.text} (AdaptationSet: ${m(_, 'id') || 'N/A'})`,
                                        status: I,
                                        details: c(
                                            T ? x.passDetails : x.failDetails,
                                            _,
                                            g
                                        ),
                                        isoRef: x.isoRef,
                                        category: x.category,
                                        location: { path: S },
                                    });
                                }
                            }),
                            v(_, 'Representation').forEach((x, T) => {
                                let I = `${S}.Representation[${T}]`,
                                    E = { ...g, representation: x };
                                fe.filter(
                                    (A) => A.scope === 'Representation'
                                ).forEach((A) => {
                                    let R = A.check(x, E);
                                    if (R !== 'skip') {
                                        let P = R ? 'pass' : A.severity;
                                        a.push({
                                            id: A.id,
                                            text: `${A.text} (Representation: ${m(x, 'id') || 'N/A'})`,
                                            status: P,
                                            details: c(
                                                R
                                                    ? A.passDetails
                                                    : A.failDetails,
                                                x,
                                                E
                                            ),
                                            isoRef: A.isoRef,
                                            category: A.category,
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
    var tt = class {
            constructor() {
                this.listeners = {};
            }
            subscribe(t, n) {
                return (
                    this.listeners[t] || (this.listeners[t] = []),
                    this.listeners[t].push(n),
                    () => {
                        this.listeners[t] = this.listeners[t].filter(
                            (i) => i !== n
                        );
                    }
                );
            }
            dispatch(t, n) {
                this.listeners[t] && this.listeners[t].forEach((i) => i(n));
            }
        },
        ko = new tt();
    function Qo(e, t) {
        let n = t.tags.find((s) => s.name === 'EXT-X-SKIP');
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
            (r.tags = t.tags.filter((s) => s.name !== 'EXT-X-SKIP')),
            (r.targetDuration = t.targetDuration),
            (r.partInf = t.partInf),
            (r.serverControl = t.serverControl),
            (r.isLive = t.isLive),
            r
        );
    }
    function Jo(e) {
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
                        .map(([a, s]) => `${a}="${s}"`)
                        .join(',');
                    (t.push(`#EXT-X-KEY:${r}`), (n = i.key));
                }
                (i.dateTime && t.push(`#EXT-X-PROGRAM-DATE-TIME:${i.dateTime}`),
                    t.push(`#EXTINF:${i.duration.toFixed(5)},${i.title || ''}`),
                    i.uri && t.push(i.uri),
                    i.parts.forEach((r) => {
                        let a = Object.entries(r)
                            .map(([s, l]) => `${s}="${l}"`)
                            .join(',');
                        t.push(`#EXT-X-PART:${a}`);
                    }));
            }),
            e.isLive || t.push('#EXT-X-ENDLIST'),
            t.join(`
`)
        );
    }
    async function Zo(e) {
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
                definedVariables: b,
                baseUrl: S,
            } = await le(e.manifestString, e.url);
            ((n = _),
                (i = _.serializedManifest),
                (n.hlsDefinedVariables = b),
                (r = S));
        } else {
            let {
                manifest: _,
                serializedManifest: b,
                baseUrl: S,
            } = await Ze(e.manifestString, e.url);
            ((n = _), (i = b), (r = S));
        }
        let { generateFeatureAnalysis: a } = await Promise.resolve().then(
                () => (Oa(), za)
            ),
            s = a(n, e.protocol, i),
            l = new Map(Object.entries(s)),
            { diffManifest: o } = await Promise.resolve().then(
                () => (es(), Za)
            ),
            c = (await Promise.resolve().then(() => hs(fs()))).default,
            f = null;
        e.protocol === 'hls' &&
            n.isMaster &&
            (f =
                (n.tags || []).find(
                    (_) => _.name === 'EXT-X-CONTENT-STEERING'
                ) || null);
        let d = e.protocol === 'hls' ? n : i,
            u = et(d, e.protocol);
        n.serializedManifest = i;
        let p = {
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
            featureAnalysis: { results: l, manifestCount: 1 },
            hlsVariantState: new Map(),
            dashRepresentationState: new Map(),
            hlsDefinedVariables: n.hlsDefinedVariables,
            semanticData: new Map(),
        };
        if (e.protocol === 'hls')
            n.isMaster
                ? (n.variants || []).forEach((_, b) => {
                      p.hlsVariantState.has(_.resolvedUri) ||
                          p.hlsVariantState.set(_.resolvedUri, {
                              segments: [],
                              freshSegmentUrls: new Set(),
                              isLoading: !1,
                              isPolling: n.type === 'dynamic',
                              isExpanded: b === 0,
                              displayMode: 'last10',
                              error: null,
                          });
                  })
                : p.hlsVariantState.set(p.originalUrl, {
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
            let _ = ka(i, p.baseUrl);
            Object.entries(_).forEach(([b, S]) => {
                p.dashRepresentationState.set(b, {
                    segments: S,
                    freshSegmentUrls: new Set(S.map((g) => g.resolvedUrl)),
                });
            });
        }
        if (p.manifest.type === 'dynamic') {
            let _ = p.rawManifest;
            p.protocol === 'dash' &&
                (_ = c(p.rawManifest, {
                    indentation: '  ',
                    lineSeparator: `
`,
                }));
            let b = o('', _, p.protocol);
            p.manifestUpdates.push({
                timestamp: new Date().toLocaleTimeString(),
                diffHtml: b,
                rawManifest: p.rawManifest,
                complianceResults: u,
                hasNewIssues: !1,
                serializedManifest: i,
            });
        }
        let y = p;
        return (
            (y.hlsVariantState = Array.from(p.hlsVariantState.entries())),
            (y.dashRepresentationState = Array.from(
                p.dashRepresentationState.entries()
            )),
            (y.featureAnalysis.results = Array.from(
                p.featureAnalysis.results.entries()
            )),
            (y.semanticData = Array.from(p.semanticData.entries())),
            y
        );
    }
    async function el(e) {
        try {
            let t = await Promise.all(e.map(Zo));
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
    async function tl({ streamId: e, variantUri: t, hlsDefinedVariables: n }) {
        try {
            let i = await fetch(t);
            if (!i.ok) throw new Error(`HTTP error ${i.status}`);
            let r = await i.text(),
                { manifest: a } = await le(r, t, n),
                s = new Set((a.segments || []).map((l) => l.resolvedUrl));
            self.postMessage({
                type: 'hls-media-playlist-fetched',
                payload: {
                    streamId: e,
                    variantUri: t,
                    segments: a.segments,
                    freshSegmentUrls: s,
                },
            });
        } catch (i) {
            self.postMessage({
                type: 'hls-media-playlist-error',
                payload: { streamId: e, variantUri: t, error: i.message },
            });
        }
    }
    async function nl({
        streamId: e,
        newManifestString: t,
        oldRawManifest: n,
        protocol: i,
        baseUrl: r,
        hlsDefinedVariables: a,
        oldManifestObjectForDelta: s,
    }) {
        try {
            let l = t,
                o,
                c;
            if (i === 'dash') {
                let { manifest: u, serializedManifest: p } = await Ze(t, r);
                ((o = u), (c = p));
            } else if (t.includes('#EXT-X-SKIP')) {
                let { manifest: u } = await le(t, r, a),
                    p = Qo(s, u.serializedManifest);
                l = Jo(p);
                let { manifest: y } = await le(l, r, a);
                ((o = y), (c = p));
            } else {
                let { manifest: u } = await le(t, r, a);
                ((o = u), (c = u.serializedManifest));
            }
            let d = et(i === 'hls' ? o : c, i);
            ((o.serializedManifest = c),
                self.postMessage({
                    type: 'live-update-parsed',
                    payload: {
                        streamId: e,
                        newManifestObject: o,
                        finalManifestString: l,
                        oldRawManifest: n,
                        complianceResults: d,
                        serializedManifest: c,
                    },
                }));
        } catch (l) {
            self.postMessage({
                type: 'live-update-error',
                payload: { streamId: e, error: l.message },
            });
        }
    }
    async function il({ id: e, manifestString: t }) {
        try {
            let n = t.trim(),
                i = 'unknown',
                r = 'vod';
            if (n.startsWith('#EXTM3U'))
                ((i = 'hls'),
                    !n.includes('#EXT-X-ENDLIST') &&
                        !n.includes('EXT-X-PLAYLIST-TYPE:VOD') &&
                        (r = 'live'));
            else if (n.includes('<MPD'))
                ((i = 'dash'),
                    /<MPD[^>]*type\s*=\s*["']dynamic["']/.test(n) &&
                        (r = 'live'));
            else throw new Error('Could not determine manifest protocol.');
            self.postMessage({
                type: 'manifest-metadata-result',
                payload: { id: e, metadata: { protocol: i, type: r } },
            });
        } catch (n) {
            self.postMessage({
                type: 'manifest-metadata-result',
                payload: { id: e, error: n.message },
            });
        }
    }
    async function rl(e) {
        let { type: t, payload: n } = e.data;
        switch (t) {
            case 'start-analysis':
                await el(n.inputs);
                break;
            case 'fetch-hls-media-playlist':
                await tl(n);
                break;
            case 'parse-live-update':
                await nl(n);
                break;
            case 'get-manifest-metadata':
                await il(n);
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
                        a = ma(r);
                    else {
                        let { boxes: l, issues: o, events: c } = ze(r);
                        a = {
                            format: 'isobmff',
                            data: { boxes: l, issues: o, events: c },
                        };
                    }
                    self.postMessage({ url: i, parsedData: a, error: null });
                } catch (s) {
                    self.postMessage({
                        url: i,
                        parsedData: { error: s.message },
                        error: s.message,
                    });
                }
                break;
            }
        }
    }
    self.addEventListener('message', rl);
})();
