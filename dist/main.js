(() => {
    var Rc = Object.create;
    var Bt = Object.defineProperty;
    var Mc = Object.getOwnPropertyDescriptor;
    var Lc = Object.getOwnPropertyNames;
    var Bc = Object.getPrototypeOf,
        Hc = Object.prototype.hasOwnProperty;
    var f = (t, i) => () => (t && (i = t((t = 0))), i);
    var sn = (t, i) => () => (
            i || t((i = { exports: {} }).exports, i),
            i.exports
        ),
        Ht = (t, i) => {
            for (var e in i) Bt(t, e, { get: i[e], enumerable: !0 });
        },
        zc = (t, i, e, n) => {
            if ((i && typeof i == 'object') || typeof i == 'function')
                for (let o of Lc(i))
                    !Hc.call(t, o) &&
                        o !== e &&
                        Bt(t, o, {
                            get: () => i[o],
                            enumerable: !(n = Mc(i, o)) || n.enumerable,
                        });
            return t;
        };
    var Fc = (t, i, e) => (
        (e = t != null ? Rc(Bc(t)) : {}),
        zc(
            i || !t || !t.__esModule
                ? Bt(e, 'default', { value: t, enumerable: !0 })
                : e,
            t
        )
    );
    function rn() {
        ((u.mainHeader = document.getElementById('main-header')),
            (u.headerTitleGroup =
                document.getElementById('header-title-group')),
            (u.headerUrlDisplay =
                document.getElementById('header-url-display')),
            (u.streamInputs = document.getElementById('stream-inputs')),
            (u.addStreamBtn = document.getElementById('add-stream-btn')),
            (u.analyzeBtn = document.getElementById('analyze-btn')),
            (u.toastContainer = document.getElementById('toast-container')),
            (u.results = document.getElementById('results')),
            (u.inputSection = document.getElementById('input-section')),
            (u.newAnalysisBtn = document.getElementById('new-analysis-btn')),
            (u.shareAnalysisBtn =
                document.getElementById('share-analysis-btn')),
            (u.copyDebugBtn = document.getElementById('copy-debug-btn')),
            (u.tabs = document.getElementById('tabs')),
            (u.contextSwitcherWrapper = document.getElementById(
                'context-switcher-wrapper'
            )),
            (u.contextSwitcher = document.getElementById('context-switcher')),
            (u.tabContents = {
                comparison: document.getElementById('tab-comparison'),
                summary: document.getElementById('tab-summary'),
                'timeline-visuals': document.getElementById(
                    'tab-timeline-visuals'
                ),
                features: document.getElementById('tab-features'),
                compliance: document.getElementById('tab-compliance'),
                explorer: document.getElementById('tab-explorer'),
                'interactive-segment': document.getElementById(
                    'tab-interactive-segment'
                ),
                'interactive-manifest': document.getElementById(
                    'tab-interactive-manifest'
                ),
                updates: document.getElementById('tab-updates'),
            }),
            (u.segmentModal = document.getElementById('segment-modal')),
            (u.modalTitle = document.getElementById('modal-title')),
            (u.modalSegmentUrl = document.getElementById('modal-segment-url')),
            (u.modalContentArea =
                document.getElementById('modal-content-area')),
            (u.closeModalBtn = document.getElementById('close-modal-btn')),
            (u.globalTooltip = document.getElementById('global-tooltip')));
    }
    var u,
        Y = f(() => {
            u = {};
        });
    var zt,
        y,
        K = f(() => {
            ((zt = class {
                constructor() {
                    this.listeners = {};
                }
                subscribe(i, e) {
                    return (
                        this.listeners[i] || (this.listeners[i] = []),
                        this.listeners[i].push(e),
                        () => {
                            this.listeners[i] = this.listeners[i].filter(
                                (n) => n !== e
                            );
                        }
                    );
                }
                dispatch(i, e) {
                    this.listeners[i] && this.listeners[i].forEach((n) => n(e));
                }
            }),
                (y = new zt()));
        });
    function yn(t, i) {
        if (!Wt(t) || !t.hasOwnProperty('raw'))
            throw Error('invalid template strings array');
        return dn !== void 0 ? dn.createHTML(i) : i;
    }
    function ve(t, i, e = t, n) {
        if (i === me) return i;
        let o = n !== void 0 ? e._$Co?.[n] : e._$Cl,
            a = Fe(i) ? void 0 : i._$litDirective$;
        return (
            o?.constructor !== a &&
                (o?._$AO?.(!1),
                a === void 0 ? (o = void 0) : ((o = new a(t)), o._$AT(t, e, n)),
                n !== void 0 ? ((e._$Co ??= [])[n] = o) : (e._$Cl = o)),
            o !== void 0 && (i = ve(t, o._$AS(t, i.values), o, n)),
            i
        );
    }
    var Gt,
        tt,
        dn,
        gn,
        se,
        hn,
        Vc,
        pe,
        ze,
        Fe,
        Wt,
        Nc,
        Ft,
        He,
        cn,
        fn,
        ce,
        pn,
        mn,
        xn,
        qt,
        d,
        Gp,
        Wp,
        me,
        O,
        un,
        fe,
        Oc,
        Ve,
        Vt,
        Ne,
        Se,
        Nt,
        Ot,
        Xt,
        jt,
        Xc,
        P,
        L = f(() => {
            ((Gt = globalThis),
                (tt = Gt.trustedTypes),
                (dn = tt
                    ? tt.createPolicy('lit-html', { createHTML: (t) => t })
                    : void 0),
                (gn = '$lit$'),
                (se = `lit$${Math.random().toFixed(9).slice(2)}$`),
                (hn = '?' + se),
                (Vc = `<${hn}>`),
                (pe = document),
                (ze = () => pe.createComment('')),
                (Fe = (t) =>
                    t === null ||
                    (typeof t != 'object' && typeof t != 'function')),
                (Wt = Array.isArray),
                (Nc = (t) =>
                    Wt(t) || typeof t?.[Symbol.iterator] == 'function'),
                (Ft = `[ 	
\f\r]`),
                (He = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g),
                (cn = /-->/g),
                (fn = />/g),
                (ce = RegExp(
                    `>|${Ft}(?:([^\\s"'>=/]+)(${Ft}*=${Ft}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,
                    'g'
                )),
                (pn = /'/g),
                (mn = /"/g),
                (xn = /^(?:script|style|textarea|title)$/i),
                (qt =
                    (t) =>
                    (i, ...e) => ({ _$litType$: t, strings: i, values: e })),
                (d = qt(1)),
                (Gp = qt(2)),
                (Wp = qt(3)),
                (me = Symbol.for('lit-noChange')),
                (O = Symbol.for('lit-nothing')),
                (un = new WeakMap()),
                (fe = pe.createTreeWalker(pe, 129)));
            ((Oc = (t, i) => {
                let e = t.length - 1,
                    n = [],
                    o,
                    a = i === 2 ? '<svg>' : i === 3 ? '<math>' : '',
                    s = He;
                for (let r = 0; r < e; r++) {
                    let l = t[r],
                        c,
                        p,
                        g = -1,
                        x = 0;
                    for (
                        ;
                        x < l.length &&
                        ((s.lastIndex = x), (p = s.exec(l)), p !== null);

                    )
                        ((x = s.lastIndex),
                            s === He
                                ? p[1] === '!--'
                                    ? (s = cn)
                                    : p[1] !== void 0
                                      ? (s = fn)
                                      : p[2] !== void 0
                                        ? (xn.test(p[2]) &&
                                              (o = RegExp('</' + p[2], 'g')),
                                          (s = ce))
                                        : p[3] !== void 0 && (s = ce)
                                : s === ce
                                  ? p[0] === '>'
                                      ? ((s = o ?? He), (g = -1))
                                      : p[1] === void 0
                                        ? (g = -2)
                                        : ((g = s.lastIndex - p[2].length),
                                          (c = p[1]),
                                          (s =
                                              p[3] === void 0
                                                  ? ce
                                                  : p[3] === '"'
                                                    ? mn
                                                    : pn))
                                  : s === mn || s === pn
                                    ? (s = ce)
                                    : s === cn || s === fn
                                      ? (s = He)
                                      : ((s = ce), (o = void 0)));
                    let m = s === ce && t[r + 1].startsWith('/>') ? ' ' : '';
                    a +=
                        s === He
                            ? l + Vc
                            : g >= 0
                              ? (n.push(c),
                                l.slice(0, g) + gn + l.slice(g) + se + m)
                              : l + se + (g === -2 ? r : m);
                }
                return [
                    yn(
                        t,
                        a +
                            (t[e] || '<?>') +
                            (i === 2 ? '</svg>' : i === 3 ? '</math>' : '')
                    ),
                    n,
                ];
            }),
                (Ve = class t {
                    constructor({ strings: i, _$litType$: e }, n) {
                        let o;
                        this.parts = [];
                        let a = 0,
                            s = 0,
                            r = i.length - 1,
                            l = this.parts,
                            [c, p] = Oc(i, e);
                        if (
                            ((this.el = t.createElement(c, n)),
                            (fe.currentNode = this.el.content),
                            e === 2 || e === 3)
                        ) {
                            let g = this.el.content.firstChild;
                            g.replaceWith(...g.childNodes);
                        }
                        for (; (o = fe.nextNode()) !== null && l.length < r; ) {
                            if (o.nodeType === 1) {
                                if (o.hasAttributes())
                                    for (let g of o.getAttributeNames())
                                        if (g.endsWith(gn)) {
                                            let x = p[s++],
                                                m = o.getAttribute(g).split(se),
                                                _ = /([.?@])?(.*)/.exec(x);
                                            (l.push({
                                                type: 1,
                                                index: a,
                                                name: _[2],
                                                strings: m,
                                                ctor:
                                                    _[1] === '.'
                                                        ? Nt
                                                        : _[1] === '?'
                                                          ? Ot
                                                          : _[1] === '@'
                                                            ? Xt
                                                            : Se,
                                            }),
                                                o.removeAttribute(g));
                                        } else
                                            g.startsWith(se) &&
                                                (l.push({ type: 6, index: a }),
                                                o.removeAttribute(g));
                                if (xn.test(o.tagName)) {
                                    let g = o.textContent.split(se),
                                        x = g.length - 1;
                                    if (x > 0) {
                                        o.textContent = tt
                                            ? tt.emptyScript
                                            : '';
                                        for (let m = 0; m < x; m++)
                                            (o.append(g[m], ze()),
                                                fe.nextNode(),
                                                l.push({
                                                    type: 2,
                                                    index: ++a,
                                                }));
                                        o.append(g[x], ze());
                                    }
                                }
                            } else if (o.nodeType === 8)
                                if (o.data === hn)
                                    l.push({ type: 2, index: a });
                                else {
                                    let g = -1;
                                    for (
                                        ;
                                        (g = o.data.indexOf(se, g + 1)) !== -1;

                                    )
                                        (l.push({ type: 7, index: a }),
                                            (g += se.length - 1));
                                }
                            a++;
                        }
                    }
                    static createElement(i, e) {
                        let n = pe.createElement('template');
                        return ((n.innerHTML = i), n);
                    }
                }));
            ((Vt = class {
                constructor(i, e) {
                    ((this._$AV = []),
                        (this._$AN = void 0),
                        (this._$AD = i),
                        (this._$AM = e));
                }
                get parentNode() {
                    return this._$AM.parentNode;
                }
                get _$AU() {
                    return this._$AM._$AU;
                }
                u(i) {
                    let {
                            el: { content: e },
                            parts: n,
                        } = this._$AD,
                        o = (i?.creationScope ?? pe).importNode(e, !0);
                    fe.currentNode = o;
                    let a = fe.nextNode(),
                        s = 0,
                        r = 0,
                        l = n[0];
                    for (; l !== void 0; ) {
                        if (s === l.index) {
                            let c;
                            (l.type === 2
                                ? (c = new Ne(a, a.nextSibling, this, i))
                                : l.type === 1
                                  ? (c = new l.ctor(
                                        a,
                                        l.name,
                                        l.strings,
                                        this,
                                        i
                                    ))
                                  : l.type === 6 && (c = new jt(a, this, i)),
                                this._$AV.push(c),
                                (l = n[++r]));
                        }
                        s !== l?.index && ((a = fe.nextNode()), s++);
                    }
                    return ((fe.currentNode = pe), o);
                }
                p(i) {
                    let e = 0;
                    for (let n of this._$AV)
                        (n !== void 0 &&
                            (n.strings !== void 0
                                ? (n._$AI(i, n, e), (e += n.strings.length - 2))
                                : n._$AI(i[e])),
                            e++);
                }
            }),
                (Ne = class t {
                    get _$AU() {
                        return this._$AM?._$AU ?? this._$Cv;
                    }
                    constructor(i, e, n, o) {
                        ((this.type = 2),
                            (this._$AH = O),
                            (this._$AN = void 0),
                            (this._$AA = i),
                            (this._$AB = e),
                            (this._$AM = n),
                            (this.options = o),
                            (this._$Cv = o?.isConnected ?? !0));
                    }
                    get parentNode() {
                        let i = this._$AA.parentNode,
                            e = this._$AM;
                        return (
                            e !== void 0 &&
                                i?.nodeType === 11 &&
                                (i = e.parentNode),
                            i
                        );
                    }
                    get startNode() {
                        return this._$AA;
                    }
                    get endNode() {
                        return this._$AB;
                    }
                    _$AI(i, e = this) {
                        ((i = ve(this, i, e)),
                            Fe(i)
                                ? i === O || i == null || i === ''
                                    ? (this._$AH !== O && this._$AR(),
                                      (this._$AH = O))
                                    : i !== this._$AH && i !== me && this._(i)
                                : i._$litType$ !== void 0
                                  ? this.$(i)
                                  : i.nodeType !== void 0
                                    ? this.T(i)
                                    : Nc(i)
                                      ? this.k(i)
                                      : this._(i));
                    }
                    O(i) {
                        return this._$AA.parentNode.insertBefore(i, this._$AB);
                    }
                    T(i) {
                        this._$AH !== i &&
                            (this._$AR(), (this._$AH = this.O(i)));
                    }
                    _(i) {
                        (this._$AH !== O && Fe(this._$AH)
                            ? (this._$AA.nextSibling.data = i)
                            : this.T(pe.createTextNode(i)),
                            (this._$AH = i));
                    }
                    $(i) {
                        let { values: e, _$litType$: n } = i,
                            o =
                                typeof n == 'number'
                                    ? this._$AC(i)
                                    : (n.el === void 0 &&
                                          (n.el = Ve.createElement(
                                              yn(n.h, n.h[0]),
                                              this.options
                                          )),
                                      n);
                        if (this._$AH?._$AD === o) this._$AH.p(e);
                        else {
                            let a = new Vt(o, this),
                                s = a.u(this.options);
                            (a.p(e), this.T(s), (this._$AH = a));
                        }
                    }
                    _$AC(i) {
                        let e = un.get(i.strings);
                        return (
                            e === void 0 && un.set(i.strings, (e = new Ve(i))),
                            e
                        );
                    }
                    k(i) {
                        Wt(this._$AH) || ((this._$AH = []), this._$AR());
                        let e = this._$AH,
                            n,
                            o = 0;
                        for (let a of i)
                            (o === e.length
                                ? e.push(
                                      (n = new t(
                                          this.O(ze()),
                                          this.O(ze()),
                                          this,
                                          this.options
                                      ))
                                  )
                                : (n = e[o]),
                                n._$AI(a),
                                o++);
                        o < e.length &&
                            (this._$AR(n && n._$AB.nextSibling, o),
                            (e.length = o));
                    }
                    _$AR(i = this._$AA.nextSibling, e) {
                        for (this._$AP?.(!1, !0, e); i !== this._$AB; ) {
                            let n = i.nextSibling;
                            (i.remove(), (i = n));
                        }
                    }
                    setConnected(i) {
                        this._$AM === void 0 &&
                            ((this._$Cv = i), this._$AP?.(i));
                    }
                }),
                (Se = class {
                    get tagName() {
                        return this.element.tagName;
                    }
                    get _$AU() {
                        return this._$AM._$AU;
                    }
                    constructor(i, e, n, o, a) {
                        ((this.type = 1),
                            (this._$AH = O),
                            (this._$AN = void 0),
                            (this.element = i),
                            (this.name = e),
                            (this._$AM = o),
                            (this.options = a),
                            n.length > 2 || n[0] !== '' || n[1] !== ''
                                ? ((this._$AH = Array(n.length - 1).fill(
                                      new String()
                                  )),
                                  (this.strings = n))
                                : (this._$AH = O));
                    }
                    _$AI(i, e = this, n, o) {
                        let a = this.strings,
                            s = !1;
                        if (a === void 0)
                            ((i = ve(this, i, e, 0)),
                                (s = !Fe(i) || (i !== this._$AH && i !== me)),
                                s && (this._$AH = i));
                        else {
                            let r = i,
                                l,
                                c;
                            for (i = a[0], l = 0; l < a.length - 1; l++)
                                ((c = ve(this, r[n + l], e, l)),
                                    c === me && (c = this._$AH[l]),
                                    (s ||= !Fe(c) || c !== this._$AH[l]),
                                    c === O
                                        ? (i = O)
                                        : i !== O &&
                                          (i += (c ?? '') + a[l + 1]),
                                    (this._$AH[l] = c));
                        }
                        s && !o && this.j(i);
                    }
                    j(i) {
                        i === O
                            ? this.element.removeAttribute(this.name)
                            : this.element.setAttribute(this.name, i ?? '');
                    }
                }),
                (Nt = class extends Se {
                    constructor() {
                        (super(...arguments), (this.type = 3));
                    }
                    j(i) {
                        this.element[this.name] = i === O ? void 0 : i;
                    }
                }),
                (Ot = class extends Se {
                    constructor() {
                        (super(...arguments), (this.type = 4));
                    }
                    j(i) {
                        this.element.toggleAttribute(this.name, !!i && i !== O);
                    }
                }),
                (Xt = class extends Se {
                    constructor(i, e, n, o, a) {
                        (super(i, e, n, o, a), (this.type = 5));
                    }
                    _$AI(i, e = this) {
                        if ((i = ve(this, i, e, 0) ?? O) === me) return;
                        let n = this._$AH,
                            o =
                                (i === O && n !== O) ||
                                i.capture !== n.capture ||
                                i.once !== n.once ||
                                i.passive !== n.passive,
                            a = i !== O && (n === O || o);
                        (o &&
                            this.element.removeEventListener(
                                this.name,
                                this,
                                n
                            ),
                            a &&
                                this.element.addEventListener(
                                    this.name,
                                    this,
                                    i
                                ),
                            (this._$AH = i));
                    }
                    handleEvent(i) {
                        typeof this._$AH == 'function'
                            ? this._$AH.call(
                                  this.options?.host ?? this.element,
                                  i
                              )
                            : this._$AH.handleEvent(i);
                    }
                }),
                (jt = class {
                    constructor(i, e, n) {
                        ((this.element = i),
                            (this.type = 6),
                            (this._$AN = void 0),
                            (this._$AM = e),
                            (this.options = n));
                    }
                    get _$AU() {
                        return this._$AM._$AU;
                    }
                    _$AI(i) {
                        ve(this, i);
                    }
                }),
                (Xc = Gt.litHtmlPolyfillSupport));
            (Xc?.(Ve, Ne), (Gt.litHtmlVersions ??= []).push('3.3.1'));
            P = (t, i, e) => {
                let n = e?.renderBefore ?? i,
                    o = n._$litPart$;
                if (o === void 0) {
                    let a = e?.renderBefore ?? null;
                    n._$litPart$ = o = new Ne(
                        i.insertBefore(ze(), a),
                        a,
                        void 0,
                        e ?? {}
                    );
                }
                return (o._$AI(t), o);
            };
        });
    var _n,
        bn,
        vn = f(() => {
            ((_n = (t) => {
                let i,
                    e = new Set(),
                    n = (c, p) => {
                        let g = typeof c == 'function' ? c(i) : c;
                        if (!Object.is(g, i)) {
                            let x = i;
                            ((i =
                                (p ?? (typeof g != 'object' || g === null))
                                    ? g
                                    : Object.assign({}, i, g)),
                                e.forEach((m) => m(i, x)));
                        }
                    },
                    o = () => i,
                    r = {
                        setState: n,
                        getState: o,
                        getInitialState: () => l,
                        subscribe: (c) => (e.add(c), () => e.delete(c)),
                    },
                    l = (i = t(n, o, r));
                return r;
            }),
                (bn = (t) => (t ? _n(t) : _n)));
        });
    var it,
        Sn = f(() => {
            it = class {
                constructor(i = 100) {
                    if (i < 1)
                        throw new Error('LRUCache maxSize must be at least 1.');
                    ((this.maxSize = i), (this.cache = new Map()));
                }
                get(i) {
                    if (!this.cache.has(i)) return;
                    let e = this.cache.get(i);
                    return (this.cache.delete(i), this.cache.set(i, e), e);
                }
                set(i, e) {
                    if (
                        (this.cache.has(i) && this.cache.delete(i),
                        this.cache.size >= this.maxSize)
                    ) {
                        let n = this.cache.keys().next().value;
                        this.cache.delete(n);
                    }
                    this.cache.set(i, e);
                }
                has(i) {
                    return this.cache.has(i);
                }
                forEach(i) {
                    this.cache.forEach(i);
                }
                clear() {
                    this.cache.clear();
                }
            };
        });
    var jc,
        Tn,
        ie,
        S,
        G,
        j = f(() => {
            vn();
            Sn();
            K();
            ((jc = 200),
                (Tn = () => ({
                    streams: [],
                    activeStreamId: null,
                    activeSegmentUrl: null,
                    streamIdCounter: 0,
                    segmentCache: new it(jc),
                    segmentsForCompare: [],
                    decodedSamples: new Map(),
                    activeByteMap: new Map(),
                })),
                (ie = bn((t, i) => ({
                    ...Tn(),
                    startAnalysis: () => t(Tn()),
                    completeAnalysis: (e) => {
                        (t({ streams: e, activeStreamId: e[0]?.id ?? null }),
                            y.dispatch('state:analysis-complete', {
                                streams: e,
                            }));
                    },
                    setActiveStreamId: (e) => t({ activeStreamId: e }),
                    setActiveSegmentUrl: (e) => t({ activeSegmentUrl: e }),
                    addSegmentToCompare: (e) => {
                        let { segmentsForCompare: n } = i();
                        n.length < 2 &&
                            !n.includes(e) &&
                            (t({ segmentsForCompare: [...n, e] }),
                            y.dispatch('state:compare-list-changed', {
                                count: i().segmentsForCompare.length,
                            }));
                    },
                    removeSegmentFromCompare: (e) => {
                        (t((n) => ({
                            segmentsForCompare: n.segmentsForCompare.filter(
                                (o) => o !== e
                            ),
                        })),
                            y.dispatch('state:compare-list-changed', {
                                count: i().segmentsForCompare.length,
                            }));
                    },
                    clearSegmentsToCompare: () => {
                        (t({ segmentsForCompare: [] }),
                            y.dispatch('state:compare-list-changed', {
                                count: 0,
                            }));
                    },
                    updateStream: (e, n) => {
                        t((o) => ({
                            streams: o.streams.map((a) =>
                                a.id === e ? { ...a, ...n } : a
                            ),
                        }));
                    },
                    navigateManifestUpdate: (e, n) => {
                        t((o) => {
                            let a = o.streams.findIndex((p) => p.id === e);
                            if (a === -1) return {};
                            let s = o.streams[a];
                            if (s.manifestUpdates.length === 0) return {};
                            let r = s.activeManifestUpdateIndex + n;
                            if (
                                ((r = Math.max(
                                    0,
                                    Math.min(r, s.manifestUpdates.length - 1)
                                )),
                                r === s.activeManifestUpdateIndex)
                            )
                                return {};
                            let l = [...o.streams],
                                c = { ...s, activeManifestUpdateIndex: r };
                            return (
                                r === 0 &&
                                    (c.manifestUpdates[0].hasNewIssues = !1),
                                (l[a] = c),
                                { streams: l }
                            );
                        });
                    },
                }))),
                (S = ie),
                (G = {
                    startAnalysis: () => ie.getState().startAnalysis(),
                    completeAnalysis: (t) => ie.getState().completeAnalysis(t),
                    setActiveStreamId: (t) =>
                        ie.getState().setActiveStreamId(t),
                    setActiveSegmentUrl: (t) =>
                        ie.getState().setActiveSegmentUrl(t),
                    addSegmentToCompare: (t) =>
                        ie.getState().addSegmentToCompare(t),
                    removeSegmentFromCompare: (t) =>
                        ie.getState().removeSegmentFromCompare(t),
                    clearSegmentsToCompare: () =>
                        ie.getState().clearSegmentsToCompare(),
                    updateStream: (t, i) => ie.getState().updateStream(t, i),
                    navigateManifestUpdate: (t, i) =>
                        ie.getState().navigateManifestUpdate(t, i),
                }));
        });
    var h,
        T = f(() => {
            h = class {
                constructor(i, e) {
                    ((this.box = i),
                        (this.view = e),
                        (this.offset = i.headerSize),
                        (this.stopped = !1));
                }
                addIssue(i, e) {
                    (this.box.issues || (this.box.issues = []),
                        this.box.issues.push({ type: i, message: e }));
                }
                checkBounds(i) {
                    return this.stopped
                        ? !1
                        : this.offset + i > this.view.byteLength
                          ? (this.addIssue(
                                'error',
                                `Read attempt for ${i} bytes at offset ${this.offset} would exceed box '${this.box.type}' size of ${this.view.byteLength}. The box is truncated.`
                            ),
                            (this.stopped = !0),
                            !1)
                          : !0;
                }
                readUint32(i) {
                    if (!this.checkBounds(4)) return null;
                    let e = this.view.getUint32(this.offset);
                    return (
                        (this.box.details[i] = {
                            value: e,
                            offset: this.box.offset + this.offset,
                            length: 4,
                        }),
                        (this.offset += 4),
                        e
                    );
                }
                readBigUint64(i) {
                    if (!this.checkBounds(8)) return null;
                    let e = this.view.getBigUint64(this.offset);
                    return (
                        (this.box.details[i] = {
                            value: Number(e),
                            offset: this.box.offset + this.offset,
                            length: 8,
                        }),
                        (this.offset += 8),
                        e
                    );
                }
                readBigInt64(i) {
                    if (!this.checkBounds(8)) return null;
                    let e = this.view.getBigInt64(this.offset);
                    return (
                        (this.box.details[i] = {
                            value: Number(e),
                            offset: this.box.offset + this.offset,
                            length: 8,
                        }),
                        (this.offset += 8),
                        e
                    );
                }
                readUint8(i) {
                    if (!this.checkBounds(1)) return null;
                    let e = this.view.getUint8(this.offset);
                    return (
                        (this.box.details[i] = {
                            value: e,
                            offset: this.box.offset + this.offset,
                            length: 1,
                        }),
                        (this.offset += 1),
                        e
                    );
                }
                readUint16(i) {
                    if (!this.checkBounds(2)) return null;
                    let e = this.view.getUint16(this.offset);
                    return (
                        (this.box.details[i] = {
                            value: e,
                            offset: this.box.offset + this.offset,
                            length: 2,
                        }),
                        (this.offset += 2),
                        e
                    );
                }
                readInt16(i) {
                    if (!this.checkBounds(2)) return null;
                    let e = this.view.getInt16(this.offset);
                    return (
                        (this.box.details[i] = {
                            value: e,
                            offset: this.box.offset + this.offset,
                            length: 2,
                        }),
                        (this.offset += 2),
                        e
                    );
                }
                readInt32(i) {
                    if (!this.checkBounds(4)) return null;
                    let e = this.view.getInt32(this.offset);
                    return (
                        (this.box.details[i] = {
                            value: e,
                            offset: this.box.offset + this.offset,
                            length: 4,
                        }),
                        (this.offset += 4),
                        e
                    );
                }
                readString(i, e) {
                    if (!this.checkBounds(i)) return null;
                    let n = new Uint8Array(
                            this.view.buffer,
                            this.view.byteOffset + this.offset,
                            i
                        ),
                        o = String.fromCharCode(...n);
                    return (
                        (this.box.details[e] = {
                            value: o,
                            offset: this.box.offset + this.offset,
                            length: i,
                        }),
                        (this.offset += i),
                        o
                    );
                }
                readNullTerminatedString(i) {
                    if (this.stopped) return null;
                    let e = this.offset,
                        n = e;
                    for (
                        ;
                        n < this.view.byteLength && this.view.getUint8(n) !== 0;

                    )
                        n++;
                    let o = new Uint8Array(
                            this.view.buffer,
                            this.view.byteOffset + e,
                            n - e
                        ),
                        a = new TextDecoder('utf-8').decode(o),
                        s = n - e + 1;
                    return (
                        (this.box.details[i] = {
                            value: a,
                            offset: this.box.offset + e,
                            length: s,
                        }),
                        (this.offset += s),
                        a
                    );
                }
                readVersionAndFlags() {
                    if (!this.checkBounds(4))
                        return { version: null, flags: null };
                    let i = this.view.getUint32(this.offset),
                        e = i >> 24,
                        n = i & 16777215;
                    return (
                        (this.box.details.version = {
                            value: e,
                            offset: this.box.offset + this.offset,
                            length: 1,
                        }),
                        (this.box.details.flags = {
                            value: `0x${n.toString(16).padStart(6, '0')}`,
                            offset: this.box.offset + this.offset,
                            length: 4,
                        }),
                        (this.offset += 4),
                        { version: e, flags: n }
                    );
                }
                readRemainingBytes(i) {
                    if (this.stopped) return;
                    let e = this.view.byteLength - this.offset;
                    e > 0 &&
                        ((this.box.details[i] = {
                            value: `... ${e} bytes of data ...`,
                            offset: this.box.offset + this.offset,
                            length: e,
                        }),
                        (this.offset += e));
                }
                skip(i, e = 'reserved') {
                    this.checkBounds(i) &&
                        ((this.box.details[e] = {
                            value: `${i} bytes`,
                            offset: this.box.offset + this.offset,
                            length: i,
                        }),
                        (this.offset += i));
                }
                finalize() {
                    if (this.stopped) return;
                    let i = this.view.byteLength - this.offset;
                    i > 0 &&
                        this.addIssue(
                            'warn',
                            `${i} extra unparsed bytes found at the end of box '${this.box.type}'.`
                        );
                }
            };
        });
    function Jt(t, i) {
        let e = new h(t, i);
        (e.readString(4, 'majorBrand'), e.readUint32('minorVersion'));
        let n = [],
            o = [],
            a = e.offset;
        for (; e.offset < t.size && !e.stopped; ) {
            let s = e.readString(4, `brand_${n.length}`);
            if (s === null) break;
            (n.push(s),
                s.startsWith('cmf') && o.push(s),
                delete t.details[`brand_${n.length - 1}`]);
        }
        (n.length > 0 &&
            (t.details.compatibleBrands = {
                value: n.join(', '),
                offset: t.offset + a,
                length: e.offset - a,
            }),
            o.length > 0 &&
                (t.details.cmafBrands = {
                    value: o.join(', '),
                    offset: 0,
                    length: 0,
                }),
            e.finalize());
    }
    var Dn,
        $n = f(() => {
            T();
            Dn = {
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
        });
    function Pn(t, i) {
        let e = new h(t, i),
            { version: n } = e.readVersionAndFlags();
        (n === 1
            ? (e.readBigUint64('creation_time'),
              e.readBigUint64('modification_time'),
              e.readUint32('timescale'),
              e.readBigUint64('duration'))
            : (e.readUint32('creation_time'),
              e.readUint32('modification_time'),
              e.readUint32('timescale'),
              e.readUint32('duration')),
            e.readInt32('rate'),
            e.readInt16('volume'),
            e.skip(10, 'reserved'));
        let o = [];
        for (let a = 0; a < 9; a++) o.push(e.readInt32(`matrix_val_${a}`));
        t.details.matrix = {
            value: `[${o.join(', ')}]`,
            offset: t.details.matrix_val_0.offset,
            length: 36,
        };
        for (let a = 0; a < 9; a++) delete t.details[`matrix_val_${a}`];
        (e.skip(24, 'pre_defined'), e.readUint32('next_track_ID'));
    }
    var wn,
        Un = f(() => {
            T();
            wn = {
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
        });
    function kn(t, i) {
        let e = new h(t, i);
        (e.readVersionAndFlags(), e.readUint32('sequence_number'));
    }
    var Rn,
        Mn = f(() => {
            T();
            Rn = {
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
        });
    function Ln(t, i) {
        let e = new h(t, i),
            { flags: n } = e.readVersionAndFlags();
        if (n === null) {
            e.finalize();
            return;
        }
        if (
            (e.readUint32('track_ID'),
            n & 1 && e.readBigUint64('base_data_offset'),
            n & 2 && e.readUint32('sample_description_index'),
            n & 8 && e.readUint32('default_sample_duration'),
            n & 16 && e.readUint32('default_sample_size'),
            n & 32)
        ) {
            let o = e.readUint32('default_sample_flags_raw');
            o !== null &&
                ((t.details.default_sample_flags = {
                    value: `0x${o.toString(16)}`,
                    offset: t.details.default_sample_flags_raw.offset,
                    length: 4,
                }),
                delete t.details.default_sample_flags_raw);
        }
        e.finalize();
    }
    var Bn,
        Hn = f(() => {
            T();
            Bn = {
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
        });
    function zn(t, i) {
        let e = new h(t, i),
            { version: n } = e.readVersionAndFlags();
        if (n === null) {
            e.finalize();
            return;
        }
        (n === 1
            ? e.readBigUint64('baseMediaDecodeTime')
            : e.readUint32('baseMediaDecodeTime'),
            e.finalize());
    }
    var Fn,
        Vn = f(() => {
            T();
            Fn = {
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
        });
    function Nn(t, i) {
        let e = new h(t, i),
            { version: n, flags: o } = e.readVersionAndFlags();
        if (o === null) {
            e.finalize();
            return;
        }
        let a = e.readUint32('sample_count');
        ((t.samples = []), o & 1 && e.readInt32('data_offset'));
        let s = null;
        if (o & 4) {
            let r = e.readUint32('first_sample_flags_dword');
            r !== null &&
                (delete t.details.first_sample_flags_dword,
                (s = r),
                (t.details.first_sample_flags = {
                    value: `0x${s.toString(16)}`,
                    offset:
                        t.details.first_sample_flags_dword?.offset ||
                        e.box.offset + e.offset - 4,
                    length: 4,
                }));
        }
        if (a !== null)
            for (let r = 0; r < a && !e.stopped; r++) {
                let l = {};
                (o & 256 &&
                    ((l.duration = e.view.getUint32(e.offset)),
                    (e.offset += 4)),
                    o & 512 &&
                        ((l.size = e.view.getUint32(e.offset)),
                        (e.offset += 4)),
                    o & 1024 &&
                        ((l.flags = e.view.getUint32(e.offset)),
                        (e.offset += 4)),
                    r === 0 && s !== null && (l.flags = s),
                    o & 2048 &&
                        (n === 0
                            ? (l.compositionTimeOffset = e.view.getUint32(
                                  e.offset
                              ))
                            : (l.compositionTimeOffset = e.view.getInt32(
                                  e.offset
                              )),
                        (e.offset += 4)),
                    t.samples.push(l));
            }
        e.finalize();
    }
    var On,
        Xn = f(() => {
            T();
            On = {
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
        });
    function jn(t, i) {
        let e = new h(t, i),
            { version: n } = e.readVersionAndFlags();
        if (n === null) {
            e.finalize();
            return;
        }
        (e.readUint32('reference_ID'),
            e.readUint32('timescale'),
            n === 1
                ? (e.readBigUint64('earliest_presentation_time'),
                  e.readBigUint64('first_offset'))
                : (e.readUint32('earliest_presentation_time'),
                  e.readUint32('first_offset')),
            e.skip(2, 'reserved'));
        let o = e.readUint16('reference_count');
        if (o === null) {
            e.finalize();
            return;
        }
        for (let a = 0; a < o; a++) {
            let s = e.readUint32(`ref_${a + 1}_type_and_size`);
            if (s === null) break;
            let r = (s >> 31) & 1,
                l = s & 2147483647,
                c = t.details[`ref_${a + 1}_type_and_size`]?.offset || 0;
            (delete t.details[`ref_${a + 1}_type_and_size`],
                (t.details[`reference_${a + 1}_type`] = {
                    value: r === 1 ? 'sidx' : 'media',
                    offset: c,
                    length: 4,
                }),
                (t.details[`reference_${a + 1}_size`] = {
                    value: l,
                    offset: c,
                    length: 4,
                }),
                e.readUint32(`reference_${a + 1}_duration`));
            let p = e.readUint32(`sap_info_dword_${a + 1}`);
            p !== null &&
                (delete t.details[`sap_info_dword_${a + 1}`],
                (t.details[`reference_${a + 1}_sap_info`] = {
                    value: `0x${p.toString(16)}`,
                    offset: c + 8,
                    length: 4,
                }));
        }
        e.finalize();
    }
    var Gn,
        Wn = f(() => {
            T();
            Gn = {
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
        });
    function qn(t, i) {
        let e = new h(t, i),
            { version: n, flags: o } = e.readVersionAndFlags();
        if (o !== null) {
            delete t.details.flags;
            let p = t.details.version.offset + 1;
            ((t.details.track_enabled = {
                value: (o & 1) === 1,
                offset: p,
                length: 3,
            }),
                (t.details.track_in_movie = {
                    value: (o & 2) === 2,
                    offset: p,
                    length: 3,
                }),
                (t.details.track_in_preview = {
                    value: (o & 4) === 4,
                    offset: p,
                    length: 3,
                }));
        }
        (n === 1
            ? (e.readBigUint64('creation_time'),
              e.readBigUint64('modification_time'))
            : (e.readUint32('creation_time'),
              e.readUint32('modification_time')),
            e.readUint32('track_ID'),
            e.skip(4, 'reserved_1'),
            n === 1 ? e.readBigUint64('duration') : e.readUint32('duration'),
            e.skip(8, 'reserved_2'),
            e.readInt16('layer'),
            e.readInt16('alternate_group'));
        let a = e.readInt16('volume_fixed_point');
        (a !== null &&
            ((t.details.volume = {
                ...t.details.volume_fixed_point,
                value: (a / 256).toFixed(2),
            }),
            delete t.details.volume_fixed_point),
            e.skip(2, 'reserved_3'));
        let s = [];
        for (let p = 0; p < 9; p++) s.push(e.readInt32(`matrix_val_${p}`));
        let r = t.details.matrix_val_0?.offset;
        if (r !== void 0) {
            t.details.matrix = {
                value: `[${s.join(', ')}]`,
                offset: r,
                length: 36,
            };
            for (let p = 0; p < 9; p++) delete t.details[`matrix_val_${p}`];
        }
        let l = e.readUint32('width_fixed_point');
        l !== null &&
            ((t.details.width = {
                ...t.details.width_fixed_point,
                value: (l / 65536).toFixed(2),
            }),
            delete t.details.width_fixed_point);
        let c = e.readUint32('height_fixed_point');
        c !== null &&
            ((t.details.height = {
                ...t.details.height_fixed_point,
                value: (c / 65536).toFixed(2),
            }),
            delete t.details.height_fixed_point);
    }
    var Yn,
        Kn = f(() => {
            T();
            Yn = {
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
        });
    function Jn(t, i) {
        let e = new h(t, i),
            { version: n } = e.readVersionAndFlags();
        if (n === null) {
            e.finalize();
            return;
        }
        (n === 1
            ? (e.readBigUint64('creation_time'),
              e.readBigUint64('modification_time'))
            : (e.readUint32('creation_time'),
              e.readUint32('modification_time')),
            e.readUint32('timescale'),
            n === 1 ? e.readBigUint64('duration') : e.readUint32('duration'));
        let o = e.readUint16('language_bits');
        if (o !== null) {
            let a = String.fromCharCode(
                ((o >> 10) & 31) + 96,
                ((o >> 5) & 31) + 96,
                (o & 31) + 96
            );
            ((t.details.language = {
                value: a,
                offset: t.details.language_bits.offset,
                length: 2,
            }),
                delete t.details.language_bits);
        }
        (e.skip(2, 'pre-defined'), e.finalize());
    }
    var Qn,
        Zn = f(() => {
            T();
            Qn = {
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
        });
    function eo(t, i) {
        let e = new h(t, i);
        (e.readVersionAndFlags(),
            e.skip(4, 'pre_defined'),
            e.readString(4, 'handler_type'),
            e.skip(12, 'reserved'),
            e.readNullTerminatedString('name'),
            e.finalize());
    }
    var to,
        io = f(() => {
            T();
            to = {
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
        });
    function no(t, i) {
        let e = new h(t, i);
        (e.readVersionAndFlags(), e.readUint16('graphicsmode'));
        let n = e.readUint16('opcolor_r'),
            o = e.readUint16('opcolor_g'),
            a = e.readUint16('opcolor_b');
        if (n !== null && o !== null && a !== null) {
            let s = t.details.opcolor_r.offset;
            (delete t.details.opcolor_r,
                delete t.details.opcolor_g,
                delete t.details.opcolor_b,
                (t.details.opcolor = {
                    value: `R:${n}, G:${o}, B:${a}`,
                    offset: s,
                    length: 6,
                }));
        }
        e.finalize();
    }
    var oo,
        ao = f(() => {
            T();
            oo = {
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
        });
    function so(t, i) {
        let e = new h(t, i);
        (e.readVersionAndFlags(), e.readUint32('entry_count'));
    }
    var ro,
        lo = f(() => {
            T();
            ro = {
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
        });
    function co(t, i) {
        let e = new h(t, i);
        e.readVersionAndFlags();
        let n = e.readUint32('entry_count');
        if (n !== null && n > 0) {
            for (let a = 0; a < n && !e.stopped; a++)
                a < 10
                    ? (e.readUint32(`sample_count_${a + 1}`),
                      e.readUint32(`sample_delta_${a + 1}`))
                    : (e.offset += 8);
            n > 10 &&
                (t.details['...more_entries'] = {
                    value: `${n - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        e.finalize();
    }
    var fo,
        po = f(() => {
            T();
            fo = {
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
        });
    function mo(t, i) {
        let e = new h(t, i);
        e.readVersionAndFlags();
        let n = e.readUint32('entry_count');
        if (n !== null && n > 0) {
            for (let a = 0; a < n && !e.stopped; a++)
                if (a < 10) {
                    let s = `entry_${a + 1}`;
                    (e.readUint32(`${s}_first_chunk`),
                        e.readUint32(`${s}_samples_per_chunk`),
                        e.readUint32(`${s}_sample_description_index`));
                } else e.offset += 12;
            n > 10 &&
                (t.details['...more_entries'] = {
                    value: `${n - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        e.finalize();
    }
    var uo,
        go = f(() => {
            T();
            uo = {
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
        });
    function ho(t, i) {
        let e = new h(t, i);
        e.readVersionAndFlags();
        let n = e.readUint32('sample_size'),
            o = e.readUint32('sample_count');
        if (n === 0 && o !== null && o > 0) {
            for (let s = 0; s < o && !e.stopped; s++)
                s < 10 ? e.readUint32(`entry_size_${s + 1}`) : (e.offset += 4);
            o > 10 &&
                (t.details['...more_entries'] = {
                    value: `${o - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        e.finalize();
    }
    var xo,
        yo = f(() => {
            T();
            xo = {
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
        });
    function _o(t, i) {
        let e = new h(t, i);
        e.readVersionAndFlags();
        let n = e.readUint32('entry_count');
        if (n !== null && n > 0) {
            for (let a = 0; a < n && !e.stopped; a++)
                a < 10
                    ? e.readUint32(`chunk_offset_${a + 1}`)
                    : (e.offset += 4);
            n > 10 &&
                (t.details['...more_entries'] = {
                    value: `${n - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        e.finalize();
    }
    var bo,
        vo = f(() => {
            T();
            bo = {
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
        });
    function So(t, i) {
        let e = new h(t, i),
            { version: n } = e.readVersionAndFlags();
        if (n === null) {
            e.finalize();
            return;
        }
        let o = e.readUint32('entry_count');
        if (o !== null && o > 0) {
            let s = n === 1 ? 20 : 12;
            for (let r = 0; r < o && !e.stopped; r++)
                if (r < 5) {
                    let l = `entry_${r + 1}`;
                    (n === 1
                        ? (e.readBigUint64(`${l}_segment_duration`),
                          e.readBigInt64(`${l}_media_time`))
                        : (e.readUint32(`${l}_segment_duration`),
                          e.readInt32(`${l}_media_time`)),
                        e.readInt16(`${l}_media_rate_integer`),
                        e.readInt16(`${l}_media_rate_fraction`));
                } else e.offset += s;
            o > 5 &&
                (t.details['...more_entries'] = {
                    value: `${o - 5} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        e.finalize();
    }
    var To,
        Co = f(() => {
            T();
            To = {
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
        });
    function Io(t, i) {
        let e = new h(t, i);
        (e.readVersionAndFlags(),
            e.readUint32('track_ID'),
            e.readUint32('default_sample_description_index'),
            e.readUint32('default_sample_duration'),
            e.readUint32('default_sample_size'));
        let n = e.readUint32('default_sample_flags_raw');
        (n !== null &&
            ((t.details.default_sample_flags = {
                value: `0x${n.toString(16)}`,
                offset: t.details.default_sample_flags_raw.offset,
                length: 4,
            }),
            delete t.details.default_sample_flags_raw),
            e.finalize());
    }
    var Eo,
        Ao = f(() => {
            T();
            Eo = {
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
        });
    var Do,
        $o = f(() => {
            Do = {
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
        });
    function Po(t) {
        if (t.length < 4) return null;
        let i = new Qt(t);
        i.readBits(8);
        let e = i.readBits(8);
        i.readBits(16);
        let n = i.readBits(8);
        if (
            (i.readUE(),
            e === 100 ||
                e === 110 ||
                e === 122 ||
                e === 244 ||
                e === 44 ||
                e === 83 ||
                e === 86 ||
                e === 118 ||
                e === 128 ||
                e === 138)
        ) {
            let g = i.readUE();
            if (
                (g === 3 && i.readBits(1),
                i.readUE(),
                i.readUE(),
                i.readBits(1),
                i.readBits(1))
            ) {
                let m = g !== 3 ? 8 : 12;
                for (let _ = 0; _ < m; _++)
                    if (i.readBits(1))
                        return {
                            profile_idc: e,
                            level_idc: n,
                            error: 'SPS with scaling matrix not fully parsed.',
                        };
            }
        }
        i.readUE();
        let o = i.readUE();
        if (o === 0) i.readUE();
        else if (o === 1) {
            (i.readBits(1), i.readUE(), i.readUE());
            let g = i.readUE();
            for (let x = 0; x < g; x++) i.readUE();
        }
        (i.readUE(), i.readBits(1));
        let a = i.readUE(),
            s = i.readUE(),
            r = i.readBits(1),
            l = (a + 1) * 16,
            c = (2 - r) * (s + 1) * 16;
        if ((r === 0 && i.readBits(1), i.readBits(1), i.readBits(1))) {
            let g = i.readUE(),
                x = i.readUE(),
                m = i.readUE(),
                _ = i.readUE(),
                b = 1,
                C = 2 - r,
                A = l - (g + x) * b;
            c = c - (m + _) * C;
        }
        return { profile_idc: e, level_idc: n, resolution: `${l}x${c}` };
    }
    var Qt,
        wo = f(() => {
            Qt = class {
                constructor(i) {
                    ((this.buffer = i),
                        (this.bytePosition = 0),
                        (this.bitPosition = 0));
                }
                readBits(i) {
                    let e = 0;
                    for (let n = 0; n < i; n++) {
                        let a =
                            (this.buffer[this.bytePosition] >>
                                (7 - this.bitPosition)) &
                            1;
                        ((e = (e << 1) | a),
                            this.bitPosition++,
                            this.bitPosition === 8 &&
                                ((this.bitPosition = 0), this.bytePosition++));
                    }
                    return e;
                }
                readUE() {
                    let i = 0;
                    for (
                        ;
                        this.bytePosition < this.buffer.length &&
                        this.readBits(1) === 0;

                    )
                        i++;
                    if (i === 0) return 0;
                    let e = this.readBits(i);
                    return (1 << i) - 1 + e;
                }
            };
        });
    function Uo(t, i) {
        let e = new h(t, i);
        e.readUint8('configurationVersion');
        let n = e.readUint8('AVCProfileIndication');
        (e.readUint8('profile_compatibility'),
            e.readUint8('AVCLevelIndication'));
        let o = e.readUint8('length_size_byte');
        o !== null &&
            (delete t.details.length_size_byte,
            (t.details.lengthSizeMinusOne = {
                value: o & 3,
                offset: t.offset + e.offset - 1,
                length: 0.25,
            }),
            (t.details.reserved_6_bits = {
                value: (o >> 2) & 63,
                offset: t.offset + e.offset - 1,
                length: 0.75,
            }));
        let a = e.readUint8('sps_count_byte');
        if (a !== null) {
            delete t.details.sps_count_byte;
            let r = a & 31;
            ((t.details.numOfSequenceParameterSets = {
                value: r,
                offset: t.offset + e.offset - 1,
                length: 0.625,
            }),
                (t.details.reserved_3_bits = {
                    value: (a >> 5) & 7,
                    offset: t.offset + e.offset - 1,
                    length: 0.375,
                }));
            for (let l = 0; l < r; l++) {
                let c = e.readUint16(`sps_${l + 1}_length`);
                if (c === null) break;
                let p = e.offset;
                if (e.checkBounds(c)) {
                    let g = new Uint8Array(
                            e.view.buffer,
                            e.view.byteOffset + p,
                            c
                        ),
                        x = Po(g);
                    (x &&
                        ((t.details[`sps_${l + 1}_decoded_profile`] = {
                            value: x.profile_idc,
                            offset: 0,
                            length: 0,
                        }),
                        (t.details[`sps_${l + 1}_decoded_level`] = {
                            value: x.level_idc,
                            offset: 0,
                            length: 0,
                        }),
                        (t.details[`sps_${l + 1}_decoded_resolution`] = {
                            value: x.resolution,
                            offset: 0,
                            length: 0,
                        })),
                        e.skip(c, `sps_${l + 1}_nal_unit`));
                }
            }
        }
        let s = e.readUint8('numOfPictureParameterSets');
        if (s !== null)
            for (let r = 0; r < s; r++) {
                let l = e.readUint16(`pps_${r + 1}_length`);
                if (l === null) break;
                e.skip(l, `pps_${r + 1}_nal_unit`);
            }
        (e.offset < t.size &&
            (n === 100 || n === 110 || n === 122 || n === 144) &&
            e.readRemainingBytes('profile_specific_extensions'),
            e.finalize());
    }
    var ko,
        Ro = f(() => {
            T();
            wo();
            ko = {
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
        });
    function at(t, i) {
        let e = t.offset,
            n = 0,
            o,
            a = 0;
        do {
            if (((o = t.readUint8(`size_byte_${a}`)), o === null)) return null;
            ((n = (n << 7) | (o & 127)), a++);
        } while (o & 128 && a < 4);
        t.box.details[i] = { value: n, offset: t.box.offset + e, length: a };
        for (let s = 0; s < a; s++) delete t.box.details[`size_byte_${s}`];
        return n;
    }
    function Mo(t, i) {
        let e = new h(t, i);
        e.readVersionAndFlags();
        let n = e.readUint8('ES_Descriptor_tag');
        if (n !== 3) {
            (e.addIssue(
                'warn',
                `Expected ES_Descriptor tag (0x03), but found ${n}.`
            ),
                e.finalize());
            return;
        }
        let o = at(e, 'ES_Descriptor_size');
        if (o === null) {
            e.finalize();
            return;
        }
        let a = e.offset + o;
        if (
            (e.readUint16('ES_ID'),
            e.readUint8('streamDependence_and_priority'),
            e.offset < a && e.readUint8('DecoderConfigDescriptor_tag') === 4)
        ) {
            let r = at(e, 'DecoderConfigDescriptor_size'),
                l = e.offset + r;
            if (
                (e.readUint8('objectTypeIndication'),
                e.readUint8('streamType_and_upStream'),
                e.skip(3, 'bufferSizeDB'),
                e.readUint32('maxBitrate'),
                e.readUint32('avgBitrate'),
                e.offset < l && e.readUint8('DecoderSpecificInfo_tag') === 5)
            ) {
                let p = at(e, 'DecoderSpecificInfo_size');
                if (p !== null && p >= 2) {
                    let g = e.offset,
                        x = (e.readUint16('AudioSpecificConfig_bits') >>> 0)
                            .toString(2)
                            .padStart(16, '0');
                    delete t.details.AudioSpecificConfig_bits;
                    let m = parseInt(x.substring(0, 5), 2),
                        _ = parseInt(x.substring(5, 9), 2),
                        b = parseInt(x.substring(9, 13), 2);
                    ((t.details.decoded_audio_object_type = {
                        value: `${Qc[m] || 'Unknown'} (${m})`,
                        offset: e.box.offset + g,
                        length: 0.625,
                    }),
                        (t.details.decoded_sampling_frequency = {
                            value: `${Zc[_] || 'Unknown'} (${_})`,
                            offset: e.box.offset + g + 0.625,
                            length: 0.5,
                        }),
                        (t.details.decoded_channel_configuration = {
                            value: `${ef[b] || 'Unknown'} (${b})`,
                            offset: e.box.offset + g + 1.125,
                            length: 0.5,
                        }),
                        e.skip(p - 2, 'decoder_specific_info_remains'));
                } else p > 0 && e.skip(p, 'decoder_specific_info_data');
            }
        }
        if (e.offset < a && e.readUint8('SLConfigDescriptor_tag') === 6) {
            let r = at(e, 'SLConfigDescriptor_size');
            r !== null &&
                (r === 1
                    ? e.readUint8('predefined')
                    : e.skip(r, 'sl_config_data'));
        }
        e.finalize();
    }
    var Qc,
        Zc,
        ef,
        Lo,
        Bo = f(() => {
            T();
            ((Qc = {
                1: 'AAC Main',
                2: 'AAC LC',
                3: 'AAC SSR',
                4: 'AAC LTP',
                5: 'SBR',
                6: 'AAC Scalable',
            }),
                (Zc = {
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
                }),
                (ef = [
                    'Custom',
                    'Mono (Center)',
                    'Stereo (L, R)',
                    '3 (L, C, R)',
                    '4 (L, C, R, Sur)',
                    '5 (L, C, R, Ls, Rs)',
                    '5.1 (L, C, R, Ls, Rs, LFE)',
                    '7.1 (L, C, R, Ls, Rs, Lcs, Rcs, LFE)',
                ]));
            Lo = {
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
        });
    function Ho(t, i) {
        let e = new h(t, i);
        (e.readVersionAndFlags(),
            e.readInt16('balance'),
            e.skip(2, 'reserved'),
            e.finalize());
    }
    var zo,
        Fo = f(() => {
            T();
            zo = {
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
        });
    function Vo(t, i) {
        let e = new h(t, i),
            { version: n } = e.readVersionAndFlags();
        if (n === null) {
            e.finalize();
            return;
        }
        let o = [];
        for (let r = 0; r < 16; r++) {
            let l = e.readUint8(`system_id_byte_${r}`);
            if (l === null) {
                e.finalize();
                return;
            }
            o.push(l.toString(16).padStart(2, '0'));
        }
        let a = t.details.system_id_byte_0.offset;
        for (let r = 0; r < 16; r++) delete t.details[`system_id_byte_${r}`];
        if (
            ((t.details['System ID'] = {
                value: o.join('-'),
                offset: a,
                length: 16,
            }),
            n > 0)
        ) {
            let r = e.readUint32('Key ID Count');
            r !== null && e.skip(r * 16, 'Key IDs');
        }
        let s = e.readUint32('Data Size');
        (s !== null && e.skip(s, 'Data'), e.finalize());
    }
    var No,
        Oo = f(() => {
            T();
            No = {
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
        });
    function Xo(t, i) {
        let e = new h(t, i),
            { version: n } = e.readVersionAndFlags();
        if (n === null) {
            e.finalize();
            return;
        }
        let o = e.readUint32('entry_count');
        if (o !== null && o > 0) {
            for (let s = 0; s < o && !e.stopped; s++)
                if (s < 10) {
                    let r = `entry_${s + 1}`;
                    (e.readUint32(`${r}_sample_count`),
                        n === 1
                            ? e.readInt32(`${r}_sample_offset`)
                            : e.readUint32(`${r}_sample_offset`));
                } else e.offset += 8;
            o > 10 &&
                (t.details['...more_entries'] = {
                    value: `${o - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        e.finalize();
    }
    var jo,
        Go = f(() => {
            T();
            jo = {
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
        });
    function Wo(t, i) {
        let e = new h(t, i);
        (e.readVersionAndFlags(), e.skip(3, 'reserved'));
        let n = e.readUint8('field_size'),
            o = e.readUint32('sample_count');
        if (o !== null && o > 0) {
            let a;
            if (n === 4) {
                let s = e.readUint8('entry_size_1_byte');
                s !== null && (a = `(nibbles) ${(s >> 4) & 15}, ${s & 15}`);
            } else
                n === 8
                    ? (a = e.readUint8('entry_size_1'))
                    : n === 16 && (a = e.readUint16('entry_size_1'));
            a !== void 0 && (t.details.entry_size_1.value = a);
        }
        e.finalize();
    }
    var qo,
        Yo = f(() => {
            T();
            qo = {
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
        });
    function Ko(t, i) {
        let e = new h(t, i),
            { version: n } = e.readVersionAndFlags();
        if (n === null) {
            e.finalize();
            return;
        }
        (e.readString(4, 'grouping_type'),
            n === 1 && e.readUint32('grouping_type_parameter'));
        let o = e.readUint32('entry_count');
        (o !== null &&
            o > 0 &&
            (e.readUint32('entry_1_sample_count'),
            e.readUint32('entry_1_group_description_index')),
            e.finalize());
    }
    var Jo,
        Qo = f(() => {
            T();
            Jo = {
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
        });
    function Zo(t, i) {}
    function ge(t, i) {
        let e = new h(t, i),
            n = [];
        for (; e.offset < t.size && !e.stopped; ) {
            let o = e.readUint32(`track_ID_${n.length + 1}`);
            if (o !== null) n.push(o);
            else break;
        }
        ((t.details.track_IDs = {
            value: n.join(', '),
            offset: t.offset + t.headerSize,
            length: t.size - t.headerSize,
        }),
            e.finalize());
    }
    var ea,
        ta,
        ia = f(() => {
            T();
            ((ea = {
                hint: ge,
                cdsc: ge,
                font: ge,
                hind: ge,
                vdep: ge,
                vplx: ge,
                subt: ge,
            }),
                (ta = {
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
                }));
        });
    function na(t, i) {
        let e = new h(t, i),
            { version: n } = e.readVersionAndFlags();
        if (n === null) {
            e.finalize();
            return;
        }
        let o = e.readUint32('entry_count');
        if (o !== null && o > 0) {
            e.readUint32('entry_1_sample_delta');
            let a = e.readUint16('entry_1_subsample_count');
            a !== null &&
                a > 0 &&
                (n === 1
                    ? e.readUint32('subsample_1_size')
                    : e.readUint16('subsample_1_size'));
        }
        e.finalize();
    }
    var oa,
        aa = f(() => {
            T();
            oa = {
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
        });
    function sa(t, i) {
        let e = new h(t, i),
            { flags: n } = e.readVersionAndFlags();
        n !== null &&
            (n & 1) !== 0 &&
            (e.readUint32('aux_info_type'),
            e.readUint32('aux_info_type_parameter'));
        let o = e.readUint8('default_sample_info_size'),
            a = e.readUint32('sample_count');
        if (o === 0 && a !== null && a > 0) {
            for (let r = 0; r < a && !e.stopped; r++)
                r < 10
                    ? e.readUint8(`sample_info_size_${r + 1}`)
                    : (e.offset += 1);
            a > 10 &&
                (t.details['...more_entries'] = {
                    value: `${a - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        e.finalize();
    }
    var ra,
        la = f(() => {
            T();
            ra = {
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
        });
    function da(t, i) {
        let e = new h(t, i),
            { version: n, flags: o } = e.readVersionAndFlags();
        if (n === null) {
            e.finalize();
            return;
        }
        (o & 1) !== 0 && e.skip(8, 'aux_info_type_and_param');
        let a = e.readUint32('entry_count');
        (a !== null &&
            a > 0 &&
            (n === 1 ? e.readBigUint64('offset_1') : e.readUint32('offset_1')),
            e.finalize());
    }
    var ca,
        fa = f(() => {
            T();
            ca = {
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
        });
    function pa(t, i) {}
    var ma,
        ua = f(() => {
            ma = {
                sinf: {
                    name: 'Protection Scheme Information',
                    text: 'A container for all information required to understand the encryption transform applied.',
                    ref: 'ISO/IEC 14496-12, 8.12.1',
                },
            };
        });
    function ga(t, i) {
        let e = new h(t, i);
        (e.readString(4, 'data_format'), e.finalize());
    }
    var ha,
        xa = f(() => {
            T();
            ha = {
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
        });
    function ya(t, i) {
        let e = new h(t, i);
        (e.readVersionAndFlags(), e.readString(4, 'scheme_type'));
        let n = e.readUint32('scheme_version_raw');
        (n !== null &&
            ((t.details.scheme_version = {
                value: `0x${n.toString(16)}`,
                offset: t.details.scheme_version_raw.offset,
                length: 4,
            }),
            delete t.details.scheme_version_raw),
            e.finalize());
    }
    var _a,
        ba = f(() => {
            T();
            _a = {
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
        });
    function va(t, i) {}
    var Sa,
        Ta = f(() => {
            Sa = {
                schi: {
                    name: 'Scheme Information Box',
                    text: 'A container for boxes with scheme-specific data needed by the protection system.',
                    ref: 'ISO/IEC 14496-12, 8.12.6',
                },
            };
        });
    function Ca(t, i) {
        let e = new h(t, i);
        e.readVersionAndFlags();
        let n = e.readUint32('entry_count');
        if (n !== null && n > 0) {
            let o = [];
            for (let s = 0; s < n && !e.stopped; s++)
                if (s < 10) {
                    let r = e.readUint32(`sample_number_entry_${s + 1}`);
                    r !== null &&
                        (o.push(r),
                        delete t.details[`sample_number_entry_${s + 1}`]);
                } else e.offset += 4;
            n > 0 &&
                (t.details.sample_numbers = {
                    value:
                        o.join(', ') +
                        (n > 10
                            ? `... (${n - 10} more entries not shown but parsed)`
                            : ''),
                    offset: t.offset + e.offset,
                    length: n * 4,
                });
        }
        e.finalize();
    }
    var Ia,
        Ea = f(() => {
            T();
            Ia = {
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
        });
    function Aa(t, i) {
        let e = new h(t, i),
            { version: n } = e.readVersionAndFlags();
        if (n === null) {
            e.finalize();
            return;
        }
        let o = e.readString(4, 'grouping_type'),
            a = 0;
        (n === 1 && (a = e.readUint32('default_length')),
            n >= 2 && e.readUint32('default_sample_description_index'));
        let s = e.readUint32('entry_count');
        if (s !== null)
            for (let r = 0; r < s && !e.stopped; r++) {
                let l = a;
                if (n === 1 && a === 0) {
                    let g = e.readUint32(`entry_${r + 1}_description_length`);
                    if (g === null) break;
                    l = g;
                }
                let c = `entry_${r + 1}`,
                    p = e.offset;
                switch (o) {
                    case 'roll':
                        (e.readInt16(`${c}_roll_distance`), n === 0 && (l = 2));
                        break;
                    default:
                        n === 0 &&
                            (e.addIssue(
                                'warn',
                                `Cannot determine entry size for unknown grouping_type '${o}' with version 0. Parsing of this box may be incomplete.`
                            ),
                            e.readRemainingBytes('unparsed_sgpd_entries'),
                            (r = s));
                        break;
                }
                l > 0 && e.offset === p && e.skip(l, `${c}_description_data`);
            }
        e.finalize();
    }
    var Da,
        $a = f(() => {
            T();
            Da = {
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
        });
    function Pa(t, i) {
        let e = new h(t, i),
            { version: n } = e.readVersionAndFlags();
        if (n === null) {
            e.finalize();
            return;
        }
        (n === 1
            ? e.readBigUint64('fragment_duration')
            : e.readUint32('fragment_duration'),
            e.finalize());
    }
    var wa,
        Ua = f(() => {
            T();
            wa = {
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
        });
    function ka(t, i) {
        let e = new h(t, i);
        e.readVersionAndFlags();
        let n = t.size - e.offset;
        if (
            ((t.details.sample_count = { value: n, offset: 0, length: 0 }),
            n > 0)
        ) {
            for (let a = 0; a < n && !e.stopped; a++) {
                let s = `sample_${a + 1}`;
                if (a < 10) {
                    let r = e.readUint8(`${s}_flags_byte`);
                    if (r === null) break;
                    (delete t.details[`${s}_flags_byte`],
                        (t.details[`${s}_is_leading`] = {
                            value: (r >> 6) & 3,
                            offset: t.offset + e.offset - 1,
                            length: 0.25,
                        }),
                        (t.details[`${s}_sample_depends_on`] = {
                            value: (r >> 4) & 3,
                            offset: t.offset + e.offset - 1,
                            length: 0.25,
                        }),
                        (t.details[`${s}_sample_is_depended_on`] = {
                            value: (r >> 2) & 3,
                            offset: t.offset + e.offset - 1,
                            length: 0.25,
                        }),
                        (t.details[`${s}_sample_has_redundancy`] = {
                            value: r & 3,
                            offset: t.offset + e.offset - 1,
                            length: 0.25,
                        }));
                } else e.offset += 1;
            }
            n > 10 &&
                (t.details['...more_entries'] = {
                    value: `${n - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        e.finalize();
    }
    var Ra,
        Ma = f(() => {
            T();
            Ra = {
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
        });
    function La(t, i) {}
    var Ba,
        Ha = f(() => {
            Ba = {
                mfra: {
                    name: 'Movie Fragment Random Access',
                    text: 'A container for random access information for movie fragments, often found at the end of the file.',
                    ref: 'ISO/IEC 14496-12, 8.8.9',
                },
            };
        });
    function za(t, i) {
        let e = new h(t, i),
            { version: n } = e.readVersionAndFlags();
        if (n === null) {
            e.finalize();
            return;
        }
        e.readUint32('track_ID');
        let o = e.readUint32('length_sizes_raw');
        if (o !== null) {
            let a = ((o >> 4) & 3) + 1,
                s = ((o >> 2) & 3) + 1,
                r = (o & 3) + 1;
            ((t.details.length_sizes = {
                value: `traf=${a}, trun=${s}, sample=${r}`,
                offset: t.details.length_sizes_raw.offset,
                length: 4,
            }),
                delete t.details.length_sizes_raw);
            let l = e.readUint32('number_of_entries');
            l !== null &&
                l > 0 &&
                (n === 1
                    ? (e.readBigUint64('entry_1_time'),
                      e.readBigUint64('entry_1_moof_offset'))
                    : (e.readUint32('entry_1_time'),
                      e.readUint32('entry_1_moof_offset')),
                e.skip(a, 'entry_1_traf_number'),
                e.skip(s, 'entry_1_trun_number'),
                e.skip(r, 'entry_1_sample_number'));
        }
        e.finalize();
    }
    var Fa,
        Va = f(() => {
            T();
            Fa = {
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
        });
    function Na(t, i) {
        let e = new h(t, i);
        (e.readVersionAndFlags(), e.readUint32('size'), e.finalize());
    }
    var Oa,
        Xa = f(() => {
            T();
            Oa = {
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
        });
    function ja(t, i) {
        let e = new h(t, i);
        e.readVersionAndFlags();
        let n = 1;
        for (; e.offset < t.size && !e.stopped; ) {
            if (n > 5) {
                t.details['...more_entries'] = {
                    value: 'More entries not shown.',
                    offset: 0,
                    length: 0,
                };
                break;
            }
            let o = `entry_${n}`;
            (e.readUint32(`${o}_rate`),
                e.readUint32(`${o}_initial_delay`),
                n++);
        }
        e.finalize();
    }
    var Ga,
        Wa = f(() => {
            T();
            Ga = {
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
        });
    function qa(t, i) {
        let e = new h(t, i);
        e.readVersionAndFlags();
        let n = e.readUint16('language_bits');
        if (n !== null) {
            let o = String.fromCharCode(
                ((n >> 10) & 31) + 96,
                ((n >> 5) & 31) + 96,
                (n & 31) + 96
            );
            ((t.details.language = {
                value: o,
                offset: t.details.language_bits.offset,
                length: 2,
            }),
                delete t.details.language_bits);
        }
        (e.readNullTerminatedString('notice'), e.finalize());
    }
    var Ya,
        Ka = f(() => {
            T();
            Ya = {
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
        });
    function Ja(t, i) {
        let e = new h(t, i),
            { version: n } = e.readVersionAndFlags();
        if (n === null) {
            e.finalize();
            return;
        }
        (n === 1
            ? (e.readBigUint64('compositionToDTSShift'),
              e.readBigUint64('leastDecodeToDisplayDelta'),
              e.readBigUint64('greatestDecodeToDisplayDelta'),
              e.readBigUint64('compositionStartTime'),
              e.readBigUint64('compositionEndTime'))
            : (e.readUint32('compositionToDTSShift'),
              e.readUint32('leastDecodeToDisplayDelta'),
              e.readUint32('greatestDecodeToDisplayDelta'),
              e.readUint32('compositionStartTime'),
              e.readUint32('compositionEndTime')),
            e.finalize());
    }
    var Qa,
        Za = f(() => {
            T();
            Qa = {
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
        });
    function es(t, i) {
        let e = new h(t, i);
        e.readVersionAndFlags();
        let n = (t.size - e.offset) / 2;
        if (
            ((t.details.sample_count = { value: n, offset: 0, length: 0 }),
            n > 0)
        ) {
            for (let a = 0; a < n && !e.stopped; a++)
                a < 10 ? e.readUint16(`priority_${a + 1}`) : (e.offset += 2);
            n > 10 &&
                (t.details['...more_entries'] = {
                    value: `${n - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        e.finalize();
    }
    var ts,
        is = f(() => {
            T();
            ts = {
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
        });
    function ns(t, i) {
        let e = new h(t, i),
            { flags: n } = e.readVersionAndFlags();
        (n !== null && (n & 1) === 0 && e.readNullTerminatedString('location'),
            e.finalize());
    }
    function os(t, i) {
        let e = new h(t, i);
        (e.readVersionAndFlags(),
            e.readNullTerminatedString('name'),
            e.readNullTerminatedString('location'),
            e.finalize());
    }
    var as,
        ss = f(() => {
            T();
            as = {
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
        });
    function rs(t, i) {
        let e = new h(t, i);
        (e.skip(6, 'reserved_sample_entry'),
            e.readUint16('data_reference_index'),
            e.skip(2, 'pre_defined_1'),
            e.skip(2, 'reserved_2'),
            e.skip(12, 'pre_defined_2'),
            e.readUint16('width'),
            e.readUint16('height'));
        let n = e.readUint32('horizresolution_fixed_point');
        n !== null &&
            ((t.details.horizresolution = {
                ...t.details.horizresolution_fixed_point,
                value: (n / 65536).toFixed(2) + ' dpi',
            }),
            delete t.details.horizresolution_fixed_point);
        let o = e.readUint32('vertresolution_fixed_point');
        (o !== null &&
            ((t.details.vertresolution = {
                ...t.details.vertresolution_fixed_point,
                value: (o / 65536).toFixed(2) + ' dpi',
            }),
            delete t.details.vertresolution_fixed_point),
            e.readUint32('reserved_3'),
            e.readUint16('frame_count'));
        let a = e.offset;
        if (e.checkBounds(32)) {
            let s = e.view.getUint8(e.offset),
                r = new Uint8Array(
                    e.view.buffer,
                    e.view.byteOffset + e.offset + 1,
                    s
                ),
                l = new TextDecoder().decode(r);
            ((t.details.compressorname = {
                value: l,
                offset: e.box.offset + a,
                length: 32,
            }),
                (e.offset += 32));
        }
        (e.readUint16('depth'), e.readInt16('pre_defined_3'));
    }
    var ls,
        ds = f(() => {
            T();
            ls = {
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
        });
    function cs(t, i) {
        let e = new h(t, i);
        (e.skip(6, 'reserved_sample_entry'),
            e.readUint16('data_reference_index'),
            e.skip(8, 'reserved_audio_entry_1'),
            e.readUint16('channelcount'),
            e.readUint16('samplesize'),
            e.skip(2, 'pre_defined'),
            e.skip(2, 'reserved_audio_entry_2'));
        let n = e.readUint32('samplerate_fixed_point');
        n !== null &&
            ((t.details.samplerate = {
                ...t.details.samplerate_fixed_point,
                value: n >> 16,
            }),
            delete t.details.samplerate_fixed_point);
    }
    var fs,
        ps = f(() => {
            T();
            fs = {
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
        });
    function ms(t, i) {
        let e = new h(t, i);
        (e.readUint32('bufferSizeDB'),
            e.readUint32('maxBitrate'),
            e.readUint32('avgBitrate'),
            e.finalize());
    }
    var us,
        gs = f(() => {
            T();
            us = {
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
        });
    function Zt(t, i) {
        let e = new h(t, i);
        (e.readRemainingBytes('data'), e.finalize());
    }
    var hs,
        xs = f(() => {
            T();
            hs = {
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
        });
    function tf(t, i) {
        let e = t.offset,
            n = 0,
            o,
            a = 0;
        do {
            if (((o = t.readUint8(`size_byte_${a}`)), o === null)) return null;
            ((n = (n << 7) | (o & 127)), a++);
        } while (o & 128 && a < 4);
        t.box.details[i] = { value: n, offset: t.box.offset + e, length: a };
        for (let s = 0; s < a; s++) delete t.box.details[`size_byte_${s}`];
        return n;
    }
    function ys(t, i) {
        let e = new h(t, i);
        e.readVersionAndFlags();
        let n = e.readUint8('InitialObjectDescriptor_tag');
        if (n !== 2 && n !== 3 && n !== 16) {
            (e.addIssue(
                'warn',
                `Expected IOD tag (0x02, 0x03, or 0x10), but found ${n}.`
            ),
                e.readRemainingBytes('unknown_descriptor_data'),
                e.finalize());
            return;
        }
        if (tf(e, 'InitialObjectDescriptor_size') === null) {
            e.finalize();
            return;
        }
        (e.readUint16('objectDescriptorID'),
            e.readUint8('ODProfileLevelIndication'),
            e.readUint8('sceneProfileLevelIndication'),
            e.readUint8('audioProfileLevelIndication'),
            e.readUint8('visualProfileLevelIndication'),
            e.readUint8('graphicsProfileLevelIndication'),
            e.readRemainingBytes('other_descriptors_data'),
            e.finalize());
    }
    var _s,
        bs = f(() => {
            T();
            _s = {
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
        });
    function vs(t, i) {
        let e = new h(t, i);
        (e.readVersionAndFlags(), e.readUint32('track_id'));
    }
    var Ss,
        Ts = f(() => {
            T();
            Ss = {
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
        });
    function Cs(t, i) {
        let e = new h(t, i);
        (e.readUint32('hSpacing'), e.readUint32('vSpacing'), e.finalize());
    }
    var Is,
        Es = f(() => {
            T();
            Is = {
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
        });
    function As(t, i) {
        let e = new h(t, i),
            n = e.readString(4, 'colour_type');
        if (n === 'nclx') {
            (e.readUint16('colour_primaries'),
                e.readUint16('transfer_characteristics'),
                e.readUint16('matrix_coefficients'));
            let o = e.readUint8('full_range_flag_byte');
            o !== null &&
                (delete t.details.full_range_flag_byte,
                (t.details.full_range_flag = {
                    value: (o >> 7) & 1,
                    offset: e.box.offset + e.offset - 1,
                    length: 0.125,
                }));
        } else
            (n === 'rICC' || n === 'prof') &&
                e.readRemainingBytes('ICC_profile');
        e.finalize();
    }
    var Ds,
        $s = f(() => {
            T();
            Ds = {
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
        });
    function Ps(t, i) {
        new h(t, i).readVersionAndFlags();
    }
    var ws,
        Us = f(() => {
            T();
            ws = {
                meta: {
                    name: 'Metadata Box',
                    text: 'A container for descriptive or annotative metadata.',
                    ref: 'ISO/IEC 14496-12, 8.11.1',
                },
            };
        });
    function ks(t, i) {
        let e = new h(t, i);
        (e.skip(6, 'reserved_sample_entry'),
            e.readUint16('data_reference_index'),
            e.skip(16, 'pre_defined_and_reserved'),
            e.readUint16('width'),
            e.readUint16('height'),
            e.readUint32('horizresolution'),
            e.readUint32('vertresolution'),
            e.readUint32('reserved_3'),
            e.readUint16('frame_count'),
            e.skip(32, 'compressorname'),
            e.readUint16('depth'),
            e.readInt16('pre_defined_3'));
    }
    var Rs,
        Ms = f(() => {
            T();
            Rs = {
                encv: {
                    name: 'Encrypted Video Sample Entry',
                    text: 'A sample entry wrapper indicating that the video stream is encrypted. It contains a Protection Scheme Information (`sinf`) box.',
                    ref: 'ISO/IEC 14496-12, 8.12',
                },
            };
        });
    function Ls(t, i) {
        let e = new h(t, i),
            { flags: n } = e.readVersionAndFlags();
        if (n === null) {
            e.finalize();
            return;
        }
        let o = e.readUint32('sample_count');
        if (((t.samples = []), o !== null))
            for (let s = 0; s < o && !e.stopped; s++) {
                let r = { iv: null, subsamples: [] };
                if (e.checkBounds(8)) {
                    let l = new Uint8Array(
                        e.view.buffer,
                        e.view.byteOffset + e.offset,
                        8
                    );
                    ((r.iv = l), (e.offset += 8));
                } else break;
                if ((n & 2) !== 0 && e.checkBounds(2)) {
                    let l = e.view.getUint16(e.offset);
                    ((r.subsample_count = l), (e.offset += 2));
                    for (let c = 0; c < l; c++)
                        if (e.checkBounds(6)) {
                            let p = e.view.getUint16(e.offset),
                                g = e.view.getUint32(e.offset + 2);
                            (r.subsamples.push({
                                BytesOfClearData: p,
                                BytesOfProtectedData: g,
                            }),
                                (e.offset += 6));
                        } else {
                            e.stopped = !0;
                            break;
                        }
                }
                t.samples.push(r);
            }
        e.finalize();
    }
    var Bs,
        Hs = f(() => {
            T();
            Bs = {
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
        });
    function zs(t, i) {
        let e = new h(t, i);
        (e.skip(6, 'reserved_sample_entry'),
            e.readUint16('data_reference_index'),
            e.skip(8, 'reserved_audio_entry_1'),
            e.readUint16('channelcount'),
            e.readUint16('samplesize'),
            e.skip(2, 'pre_defined'),
            e.skip(2, 'reserved_audio_entry_2'));
        let n = e.readUint32('samplerate_fixed_point');
        n !== null &&
            ((t.details.samplerate = {
                ...t.details.samplerate_fixed_point,
                value: n >> 16,
            }),
            delete t.details.samplerate_fixed_point);
    }
    var Fs,
        Vs = f(() => {
            T();
            Fs = {
                enca: {
                    name: 'Encrypted Audio Sample Entry',
                    text: 'A sample entry wrapper indicating that the audio stream is encrypted. It contains a Protection Scheme Information (`sinf`) box.',
                    ref: 'ISO/IEC 14496-12, 8.12',
                },
            };
        });
    function Ns(t, i) {
        let e = new h(t, i),
            { version: n } = e.readVersionAndFlags();
        if (n === null) {
            e.finalize();
            return;
        }
        if (n === 0) {
            e.skip(2, 'reserved_1');
            let o = e.readUint8('default_isProtected'),
                a = e.readUint8('default_Per_Sample_IV_Size'),
                s = [];
            for (let l = 0; l < 16; l++) {
                let c = e.readUint8(`kid_byte_${l}`);
                if (c !== null) s.push(c.toString(16).padStart(2, '0'));
                else {
                    e.finalize();
                    return;
                }
            }
            let r = t.details.kid_byte_0?.offset;
            if (r !== void 0) {
                t.details.default_KID = {
                    value: s.join(''),
                    offset: r,
                    length: 16,
                };
                for (let l = 0; l < 16; l++) delete t.details[`kid_byte_${l}`];
            }
            if (o === 1 && a === 0) {
                let l = e.readUint8('default_constant_IV_size');
                l !== null && e.skip(l, 'default_constant_IV');
            }
        } else if (n === 1) {
            e.skip(2, 'reserved_1');
            let o = e.readUint8('packed_fields_1');
            (o !== null &&
                (delete t.details.packed_fields_1,
                (t.details.default_crypt_byte_block = {
                    value: (o >> 4) & 15,
                    offset: e.box.offset + e.offset - 1,
                    length: 0.5,
                }),
                (t.details.default_skip_byte_block = {
                    value: o & 15,
                    offset: e.box.offset + e.offset - 1,
                    length: 0.5,
                })),
                e.readUint8('default_isProtected'),
                e.readUint8('default_Per_Sample_IV_Size'));
            let a = [];
            for (let r = 0; r < 16; r++) {
                let l = e.readUint8(`kid_byte_${r}`);
                if (l !== null) a.push(l.toString(16).padStart(2, '0'));
                else {
                    e.finalize();
                    return;
                }
            }
            let s = t.details.kid_byte_0?.offset;
            if (s !== void 0) {
                t.details.default_KID = {
                    value: a.join(''),
                    offset: s,
                    length: 16,
                };
                for (let r = 0; r < 16; r++) delete t.details[`kid_byte_${r}`];
            }
        } else
            (e.addIssue('warn', `Unsupported tenc version ${n}.`),
                e.readRemainingBytes('unsupported_tenc_data'));
        e.finalize();
    }
    var Os,
        Xs = f(() => {
            T();
            Os = {
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
        });
    function js(t, i) {
        let e = new h(t, i);
        (e.readVersionAndFlags(),
            e.readRemainingBytes('id3v2_data'),
            e.finalize());
    }
    var Gs,
        Ws = f(() => {
            T();
            Gs = {
                ID32: {
                    name: 'ID3v2 Metadata Box',
                    text: 'A box containing ID3 version 2 metadata tags. This is a common but non-standard box often found in files created by tools like FFmpeg, typically within a `udta` or `meta` box.',
                    ref: 'User-defined',
                },
            };
        });
    function qs(t, i) {
        let e = new h(t, i),
            { version: n } = e.readVersionAndFlags();
        if (n === null) {
            e.finalize();
            return;
        }
        (n === 1
            ? (e.readUint32('timescale'), e.readBigUint64('presentation_time'))
            : (e.readUint32('timescale'),
              e.readUint32('presentation_time_delta')),
            e.readUint32('event_duration'),
            e.readUint32('id'),
            e.readNullTerminatedString('scheme_id_uri'),
            e.readNullTerminatedString('value'));
        let o = t.size - e.offset;
        (o > 0 && e.skip(o, 'message_data'), e.finalize());
    }
    var Ys,
        Ks = f(() => {
            T();
            Ys = {
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
        });
    function nf(t, i) {
        let e = new h(t, i);
        (e.readNullTerminatedString('content_type'),
            e.offset < t.size && e.readNullTerminatedString('content_encoding'),
            e.finalize());
    }
    function of(t, i) {
        let e = new h(t, i);
        (e.skip(6, 'reserved_sample_entry'),
            e.readUint16('data_reference_index'),
            e.readNullTerminatedString('namespace'),
            e.readNullTerminatedString('schema_location'),
            e.readNullTerminatedString('auxiliary_mime_types'));
    }
    var Js,
        Qs,
        Zs = f(() => {
            T();
            ((Js = { stpp: of, mime: nf }),
                (Qs = {
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
                }));
        });
    function Te() {
        return af;
    }
    var Ph,
        af,
        st = f(() => {
            $n();
            Un();
            Mn();
            Hn();
            Vn();
            Xn();
            Wn();
            Kn();
            Zn();
            io();
            ao();
            lo();
            po();
            go();
            yo();
            vo();
            Co();
            Ao();
            $o();
            Ro();
            Bo();
            Fo();
            Oo();
            Go();
            Yo();
            Qo();
            ia();
            aa();
            la();
            fa();
            ua();
            xa();
            ba();
            Ta();
            Ea();
            $a();
            Ua();
            Ma();
            Ha();
            Va();
            Xa();
            Wa();
            Ka();
            Za();
            is();
            ss();
            ds();
            ps();
            gs();
            xs();
            bs();
            Ts();
            Es();
            $s();
            Us();
            Ms();
            Hs();
            Vs();
            Xs();
            Ws();
            Ks();
            Zs();
            ((Ph = {
                ftyp: Jt,
                styp: Jt,
                mvhd: Pn,
                mfhd: kn,
                tfhd: Ln,
                tfdt: zn,
                trun: Nn,
                sidx: jn,
                tkhd: qn,
                mdhd: Jn,
                hdlr: eo,
                vmhd: no,
                smhd: Ho,
                stsd: so,
                stts: co,
                ctts: Xo,
                stsc: mo,
                stsz: ho,
                stz2: Wo,
                stco: _o,
                elst: So,
                trex: Io,
                pssh: Vo,
                avcC: Uo,
                avc1: rs,
                mp4a: cs,
                esds: Mo,
                btrt: ms,
                sbgp: Ko,
                tref: Zo,
                ...ea,
                subs: na,
                saiz: sa,
                saio: da,
                sinf: pa,
                frma: ga,
                schm: ya,
                schi: va,
                stss: Ca,
                sgpd: Aa,
                mehd: Pa,
                sdtp: ka,
                mfra: La,
                tfra: za,
                mfro: Na,
                pdin: ja,
                cprt: qa,
                cslg: Ja,
                stdp: es,
                'url ': ns,
                'urn ': os,
                free: Zt,
                skip: Zt,
                iods: ys,
                trep: vs,
                pasp: Cs,
                colr: As,
                meta: Ps,
                encv: ks,
                senc: Ls,
                enca: zs,
                tenc: Ns,
                ID32: js,
                emsg: qs,
                ...Js,
            }),
                (af = {
                    ...Do,
                    ...Dn,
                    ...To,
                    ...to,
                    ...wn,
                    ...Rn,
                    ...wa,
                    ...Bn,
                    ...Fn,
                    ...On,
                    ...Gn,
                    ...Yn,
                    ...Qn,
                    ...oo,
                    ...zo,
                    ...ro,
                    ...fo,
                    ...jo,
                    ...uo,
                    ...xo,
                    ...qo,
                    ...bo,
                    ...Ia,
                    ...Da,
                    ...Eo,
                    ...No,
                    ...ko,
                    ...ls,
                    ...fs,
                    ...Lo,
                    ...us,
                    ...Jo,
                    ...ta,
                    ...oa,
                    ...ra,
                    ...ca,
                    ...ma,
                    ...ha,
                    ..._a,
                    ...Sa,
                    ...Ra,
                    ...Ba,
                    ...Fa,
                    ...Oa,
                    ...Ga,
                    ...Ya,
                    ...Qa,
                    ...ts,
                    ...as,
                    ...hs,
                    ..._s,
                    ...Ss,
                    ...Is,
                    ...Ds,
                    ...ws,
                    ...Rs,
                    ...Bs,
                    ...Fs,
                    ...Os,
                    ...Gs,
                    ...Ys,
                    ...Qs,
                }));
        });
    var er,
        tr,
        rt,
        ir = f(() => {
            ((er = {
                ATTRIBUTE: 1,
                CHILD: 2,
                PROPERTY: 3,
                BOOLEAN_ATTRIBUTE: 4,
                EVENT: 5,
                ELEMENT: 6,
            }),
                (tr =
                    (t) =>
                    (...i) => ({ _$litDirective$: t, values: i })),
                (rt = class {
                    constructor(i) {}
                    get _$AU() {
                        return this._$AM._$AU;
                    }
                    _$AT(i, e, n) {
                        ((this._$Ct = i), (this._$AM = e), (this._$Ci = n));
                    }
                    _$AS(i, e) {
                        return this.update(i, e);
                    }
                    update(i, e) {
                        return this.render(...e);
                    }
                }));
        });
    var Xe,
        V,
        re = f(() => {
            L();
            ir();
            Xe = class extends rt {
                constructor(i) {
                    if ((super(i), (this.it = O), i.type !== er.CHILD))
                        throw Error(
                            this.constructor.directiveName +
                                '() can only be used in child bindings'
                        );
                }
                render(i) {
                    if (i === O || i == null)
                        return ((this._t = void 0), (this.it = i));
                    if (i === me) return i;
                    if (typeof i != 'string')
                        throw Error(
                            this.constructor.directiveName +
                                '() called with a non-string value'
                        );
                    if (i === this.it) return this._t;
                    this.it = i;
                    let e = [i];
                    return (
                        (e.raw = e),
                        (this._t = {
                            _$litType$: this.constructor.resultType,
                            strings: e,
                            values: [],
                        })
                    );
                }
            };
            ((Xe.directiveName = 'unsafeHTML'), (Xe.resultType = 1));
            V = tr(Xe);
        });
    function sf(t, i, e, n, o) {
        let a = '',
            s = '',
            r = '',
            l = Math.ceil((e - i) / 16);
        for (let c = 0; c < l; c++) {
            let p = i + c * 16;
            a += `<div class="text-gray-500 select-none text-right">${p.toString(16).padStart(8, '0').toUpperCase()}</div>`;
            let g = '',
                x = '';
            for (let m = 0; m < 16; m++) {
                let _ = p + m;
                if (_ < e) {
                    let b = t[_],
                        C = n.get(_),
                        A = n.get(_ - 1),
                        I = '',
                        $ = '',
                        w = '';
                    if (C) {
                        let D = C.box?.type || C.packet?.type,
                            B = C.fieldName,
                            N = B,
                            X = '';
                        if (D) {
                            let W = o[D],
                                q = o[`${D}@${B}`];
                            q && q.text
                                ? ((N = q.text), (X = q.ref || ''))
                                : W &&
                                  W.text &&
                                  (B === 'Box Header' || B === 'TS Header') &&
                                  ((N = W.text), (X = W.ref || ''));
                        }
                        ((I = N),
                            ($ = X),
                            A &&
                                C.fieldName !== A.fieldName &&
                                (C.box?.offset === A.box?.offset ||
                                    C.packet?.offset === A.packet?.offset) &&
                                _ % 16 !== 0 &&
                                (w = 'border-l-2 border-white/10'));
                    }
                    let M = C?.color?.bg || '',
                        U = C?.color?.style || '',
                        v = b.toString(16).padStart(2, '0').toUpperCase(),
                        E = `data-byte-offset="${_}" data-box-offset="${C?.box?.offset}" data-tooltip="${I}" data-iso="${$}"`;
                    g += `<span ${E} class="hex-byte relative ${M} ${w}" style="${U}">${v}</span>`;
                    let k =
                        b >= 32 && b <= 126
                            ? String.fromCharCode(b).replace('<', '&lt;')
                            : '.';
                    x += `<span ${E} class="ascii-char relative ${M} ${w}" style="${U}">${k}</span>`;
                } else ((g += '<span></span>'), (x += '<span></span>'));
            }
            ((s += `<div class="hex-row">${g}</div>`),
                (r += `<div class="ascii-row">${x}</div>`));
        }
        return { offsets: a, hexes: s, asciis: r };
    }
    var lt,
        ei = f(() => {
            L();
            re();
            lt = (t, i, e, n, o, a) => {
                let s = Math.ceil(t.byteLength / n),
                    r = (e - 1) * n,
                    l = new Uint8Array(t),
                    c = Math.min(r + n, l.length),
                    { offsets: p, hexes: g, asciis: x } = sf(l, r, c, i, a);
                return d`
        <style>
            .hex-row,
            .ascii-row {
                display: grid;
                grid-template-columns: repeat(16, minmax(0, 1fr));
            }
            .hex-byte,
            .ascii-char {
                text-align: center;
                padding: 0 0.125rem;
            }
        </style>
        <div
            class="bg-slate-800 rounded-lg font-mono text-sm leading-relaxed flex flex-col h-full"
        >
            <div class="flex-grow overflow-y-auto p-4">
                <div
                    class="grid grid-cols-[auto_1fr_auto] gap-x-4 sticky top-0 bg-slate-800 pb-2 mb-2 border-b border-gray-600 z-20"
                >
                    <div class="text-gray-400 font-semibold text-right">Offset</div>
                    <div class="text-gray-400 font-semibold text-center">
                        Hexadecimal
                    </div>
                    <div class="text-gray-400 font-semibold text-center">ASCII</div>
                </div>
                <div
                    id="hex-grid-content"
                    class="grid grid-cols-[auto_1fr_auto] gap-x-4"
                >
                    <div class="pr-4 leading-loose">${V(p)}</div>
                    <div class="hex-content-grid leading-loose">
                        ${V(g)}
                    </div>
                    <div class="text-cyan-400 ascii-content-grid leading-loose">
                        ${V(x)}
                    </div>
                </div>
            </div>
            
            ${
                s > 1
                    ? d`
                    <div class="flex-shrink-0 text-center text-sm text-gray-500 py-2 border-t border-gray-700">
                        Showing bytes ${r} -
                        ${Math.min(r + n - 1, t.byteLength - 1)}
                        of ${t.byteLength} (${(t.byteLength / 1024).toFixed(2)} KB)
                        <button
                            @click=${() => o(-1)}
                            ?disabled=${e === 1}
                            class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1"
                        >
                            &lt;
                        </button>
                        Page ${e} of ${s}
                        <button
                            @click=${() => o(1)}
                            ?disabled=${e === s}
                            class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1"
                        >
                            &gt;
                        </button>
                    </div>
                `
                    : ''
            }
        </div>
    `;
            };
        });
    function ti(t, i, e) {
        if (!t || !t.bg)
            return { bg: 'bg-gray-700', style: '--tw-bg-opacity: 0.5' };
        let n = [0.2, 0.35, 0.5, 0.65],
            o = n[e % n.length];
        return {
            bg: t.bg.replace(/\/\d+/, ''),
            style: `--tw-bg-opacity: ${o}`,
        };
    }
    function dt(t) {
        let i = new Map(),
            e = (n) => {
                if (n.children?.length > 0) for (let s of n.children) e(s);
                let o = ti(n.color, 'Box Content', 0);
                for (
                    let s = n.offset + n.headerSize;
                    s < n.offset + n.size;
                    s++
                )
                    i.has(s) ||
                        i.set(s, {
                            box: n,
                            fieldName: 'Box Content',
                            color: o,
                        });
                let a = ti(n.color, 'Box Header', 1);
                for (let s = n.offset; s < n.offset + n.headerSize; s++)
                    i.set(s, { box: n, fieldName: 'Box Header', color: a });
                if (n.details) {
                    let s = 2;
                    for (let [r, l] of Object.entries(n.details))
                        if (
                            l.offset !== void 0 &&
                            l.length !== void 0 &&
                            l.length > 0
                        ) {
                            let c = ti(n.color, r, s++),
                                p = Math.ceil(l.length);
                            for (let g = l.offset; g < l.offset + p; g++)
                                i.set(g, { box: n, fieldName: r, color: c });
                        }
                }
            };
        if (t) for (let n of t) e(n);
        return i;
    }
    var ii = f(() => {});
    function ct(t, i) {
        for (let e of t) {
            if (i(e)) return e;
            if (e.children?.length > 0) {
                let n = ct(e.children, i);
                if (n) return n;
            }
        }
        return null;
    }
    function ar(t, i) {
        return !t || !t.boxes
            ? null
            : ct(
                  t.boxes,
                  (n) =>
                      n.offset === i && (!n.children || n.children.length === 0)
              ) ||
                  ct(t.boxes, (n) => n.offset === i) ||
                  null;
    }
    function lf(t) {
        let i = { index: 0 },
            e = (n, o) => {
                for (let a of n)
                    a.isChunk
                        ? ((a.color = rf),
                          a.children?.length > 0 && e(a.children, o))
                        : ((a.color = or[o.index % or.length]),
                          o.index++,
                          a.children?.length > 0 && e(a.children, o));
            };
        t && e(t, i);
    }
    function sr(t) {
        let i = [],
            e = 0;
        for (; e < t.length; ) {
            let n = t[e];
            if (n.type === 'moof' && t[e + 1]?.type === 'mdat') {
                let o = t[e + 1];
                (i.push({
                    isChunk: !0,
                    type: 'CMAF Chunk',
                    offset: n.offset,
                    size: n.size + o.size,
                    children: [n, o],
                }),
                    (e += 2));
            } else (i.push(n), (e += 1));
        }
        return i;
    }
    function lr(t, i, e, n) {
        let { activeSegmentUrl: o, segmentCache: a } = S.getState(),
            s = a.get(o),
            r =
                s?.parsedData && s.parsedData.format === 'isobmff'
                    ? s.parsedData.data
                    : null;
        if (!r)
            return d`<div class="text-yellow-400 p-4">
            Could not parse ISOBMFF data for this segment.
        </div>`;
        let l = sr(r.boxes || []);
        lf(l);
        let c = dt(l);
        return (
            S.setState({ activeByteMap: c }),
            d`
        <div
            class="grid grid-cols-1 lg:grid-cols-[minmax(300px,25%)_1fr] gap-4"
        >
            <div class="sticky top-4 h-max">
                <div class="flex flex-col gap-4">
                    <div
                        class="segment-inspector-panel rounded-md bg-gray-900/90 border border-gray-700 transition-opacity duration-200 h-[24rem] overflow-hidden flex flex-col"
                    >
                        <!-- Inspector content is rendered here by interaction-logic.js -->
                    </div>
                    ${pf(r.issues)}
                    ${ff(r.boxes)}
                </div>
            </div>

            <div>
                ${lt(s.data, c, t, i, e, n)}
            </div>
        </div>
    `
        );
    }
    var nr,
        or,
        rf,
        df,
        cf,
        rr,
        ni,
        ff,
        pf,
        dr = f(() => {
            L();
            j();
            Y();
            st();
            ei();
            ii();
            ((nr = Te()),
                (or = [
                    { bg: 'bg-red-500', border: 'border-red-500' },
                    { bg: 'bg-yellow-500', border: 'border-yellow-500' },
                    { bg: 'bg-green-500', border: 'border-green-500' },
                    { bg: 'bg-blue-500', border: 'border-blue-500' },
                    { bg: 'bg-indigo-500', border: 'border-indigo-500' },
                    { bg: 'bg-purple-500', border: 'border-purple-500' },
                    { bg: 'bg-pink-500', border: 'border-pink-500' },
                    { bg: 'bg-teal-500', border: 'border-teal-500' },
                ]),
                (rf = { bg: 'bg-slate-600', border: 'border-slate-500' }));
            df = (t, i) => {
                if (!i || !i.boxes) return null;
                let e = ct(i.boxes, (n) => n.type === 'mdhd');
                return e ? e.details?.timescale?.value : null;
            };
            ((cf = () => d`
    <div
        class="p-4 text-center text-sm text-gray-500 h-full flex flex-col justify-center items-center"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-10 w-10 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
        </svg>
        <p class="font-semibold">Inspector Panel</p>
        <p>
            Select a box from the structure tree or hover over the hex view to
            see details here.
        </p>
    </div>
`),
                (rr = (t, i, e) => {
                    if (!t) return cf();
                    let n = nr[t.type] || {},
                        o =
                            t.issues && t.issues.length > 0
                                ? d`
                  <div class="p-2 bg-red-900/50 text-red-300 text-xs">
                      <div class="font-bold mb-1">Parsing Issues:</div>
                      <ul class="list-disc pl-5">
                          ${t.issues.map(
                              (s) => d`<li>
                                      [${s.type}] ${s.message}
                                  </li>`
                          )}
                      </ul>
                  </div>
              `
                                : '',
                        a = Object.entries(t.details).map(([s, r]) => {
                            let l = s === e ? 'bg-purple-900/50' : '',
                                c = nr[`${t.type}@${s}`],
                                p = d``;
                            if (
                                s === 'baseMediaDecodeTime' &&
                                t.type === 'tfdt'
                            ) {
                                let g = df(t, i);
                                g &&
                                    (p = d`<span
                    class="text-xs text-cyan-400 block mt-1"
                    >(${(r.value / g).toFixed(3)} seconds)</span
                >`);
                            }
                            return d`
            <tr
                class="${l}"
                data-field-name="${s}"
                data-box-offset="${t.offset}"
            >
                <td
                    class="p-1 pr-2 text-xs text-gray-400 align-top"
                    title="${c?.text || ''}"
                >
                    ${s}
                </td>
                <td class="p-1 text-xs font-mono text-white break-all">
                    ${r.value !== void 0 ? String(r.value) : 'N/A'}
                    ${p}
                </td>
            </tr>
        `;
                        });
                    return d`
        <div class="p-3 border-b border-gray-700">
            <div class="font-bold text-base mb-1">
                ${t.type}
                <span class="text-sm text-gray-400">(${t.size} bytes)</span>
            </div>
            <div class="text-xs text-emerald-400 mb-2 font-mono">
                ${n.ref || ''}
            </div>
            <p class="text-xs text-gray-300">
                ${n.text || 'No description available.'}
            </p>
        </div>
        ${o}
        <div class="overflow-y-auto">
            <table class="w-full table-fixed">
                <colgroup>
                    <col class="w-1/3" />
                    <col class="w-2/3" />
                </colgroup>
                <tbody>
                    ${a}
                </tbody>
            </table>
        </div>
    `;
                }),
                (ni = (t) =>
                    t.isChunk
                        ? d`
            <details class="text-sm" open>
                <summary
                    class="cursor-pointer p-1 rounded hover:bg-gray-700/50 flex items-center gap-2 border-l-4 ${t.color?.border}"
                    data-group-start-offset="${t.offset}"
                >
                    <strong class="font-mono text-gray-300">${t.type}</strong>
                    <span class="text-xs text-gray-500"
                        >@${t.offset}, ${t.size}b</span
                    >
                </summary>
                <div class="pl-4 border-l border-gray-700 ml-[7px]">
                    ${t.children.map(ni)}
                </div>
            </details>
        `
                        : d`
        <details class="text-sm" open>
            <summary
                class="cursor-pointer p-1 rounded hover:bg-gray-700/50 flex items-center gap-2 border-l-4 ${t.color?.border || 'border-transparent'}"
                data-box-offset="${t.offset}"
            >
                ${
                    t.issues && t.issues.length > 0
                        ? d`<span
                          class="text-yellow-400"
                          title="${t.issues.map(
                              (i) => `[${i.type}] ${i.message}`
                          ).join(`
`)}"
                          >⚠️</span
                      >`
                        : ''
                }
                <strong class="font-mono">${t.type}</strong>
                <span class="text-xs text-gray-500"
                    >@${t.offset}, ${t.size}b</span
                >
            </summary>
            ${
                t.children && t.children.length > 0
                    ? d`
                      <div class="pl-4 border-l border-gray-700 ml-[7px]">
                          ${t.children.map(ni)}
                      </div>
                  `
                    : ''
            }
        </details>
    `),
                (ff = (t) => {
                    let i = sr(t || []);
                    return d`
        <div>
            <h4 class="text-base font-bold text-gray-300 mb-2">
                Box Structure
            </h4>
            <div
                class="box-tree-area bg-gray-900/50 p-2 rounded max-h-[calc(100vh-30rem)] overflow-y-auto"
            >
                ${i.map(ni)}
            </div>
        </div>
    `;
                }),
                (pf = (t) =>
                    !t || t.length === 0
                        ? d``
                        : d`
        <div class="mb-4">
            <h4 class="text-base font-bold text-yellow-400 mb-2">
                Parsing Issues
            </h4>
            <div
                class="bg-yellow-900/50 border border-yellow-700 rounded p-3 text-xs space-y-2"
            >
            ${t.map(
                (i) => d`<div>
                        <strong class="text-yellow-300"
                            >[${i.type.toUpperCase()}]</strong
                        >
                        <span class="text-yellow-200"
                            >${i.message}</span
                        >
                    </div>`
            )}
            </div>
        </div>
    `));
        });
    function ft(t) {
        let i = new Map(),
            e = {
                header: { bg: 'bg-blue-900/60' },
                af: { bg: 'bg-yellow-800/60' },
                pcr: { bg: 'bg-yellow-500/60' },
                pes: { bg: 'bg-purple-800/60' },
                pts: { bg: 'bg-purple-500/60' },
                dts: { bg: 'bg-purple-400/60' },
                psi: { bg: 'bg-green-800/60' },
                payload: { bg: 'bg-gray-800/50' },
                stuffing: { bg: 'bg-gray-700/50' },
                pointer: { bg: 'bg-cyan-800/60' },
                null: { bg: 'bg-gray-900/80' },
            };
        return (
            !t ||
                !t.data ||
                !t.data.packets ||
                t.data.packets.forEach((n) => {
                    for (let a = 0; a < 4; a++)
                        i.set(n.offset + a, {
                            packet: n,
                            fieldName: 'TS Header',
                            color: e.header,
                        });
                    let o = n.offset + 4;
                    if (n.adaptationField) {
                        let a = n.adaptationField,
                            s = n.fieldOffsets.adaptationField.offset,
                            r = a.length.value + 1;
                        o = s + r;
                        for (let l = 0; l < r; l++)
                            i.set(s + l, {
                                packet: n,
                                fieldName: 'Adaptation Field',
                                color: e.af,
                            });
                        if (a.pcr)
                            for (let l = 0; l < a.pcr.length; l++)
                                i.set(a.pcr.offset + l, {
                                    packet: n,
                                    fieldName: 'PCR',
                                    color: e.pcr,
                                });
                        if (a.stuffing_bytes)
                            for (let l = 0; l < a.stuffing_bytes.length; l++)
                                i.set(a.stuffing_bytes.offset + l, {
                                    packet: n,
                                    fieldName: 'Stuffing',
                                    color: e.stuffing,
                                });
                    }
                    if (n.fieldOffsets.pointerField) {
                        let { offset: a, length: s } =
                            n.fieldOffsets.pointerField;
                        for (let r = 0; r < s; r++)
                            i.set(a + r, {
                                packet: n,
                                fieldName: 'Pointer Field & Stuffing',
                                color: e.pointer,
                            });
                        o = a + s;
                    }
                    for (let a = o; a < n.offset + 188; a++) {
                        if (i.has(a)) continue;
                        let s = 'Payload',
                            r = e.payload;
                        (n.pid === 8191
                            ? ((s = 'Null Packet Payload'), (r = e.null))
                            : n.psi
                              ? ((s = `PSI (${n.psi.type})`), (r = e.psi))
                              : n.pes && ((s = 'PES Payload'), (r = e.payload)),
                            i.set(a, { packet: n, fieldName: s, color: r }));
                    }
                    if (n.pes && n.fieldOffsets.pesHeader) {
                        let { offset: a, length: s } = n.fieldOffsets.pesHeader;
                        for (let r = 0; r < s; r++)
                            i.set(a + r, {
                                packet: n,
                                fieldName: 'PES Header',
                                color: e.pes,
                            });
                        if (n.pes.pts)
                            for (let r = 0; r < n.pes.pts.length; r++)
                                i.set(n.pes.pts.offset + r, {
                                    packet: n,
                                    fieldName: 'PTS',
                                    color: e.pts,
                                });
                        if (n.pes.dts)
                            for (let r = 0; r < n.pes.dts.length; r++)
                                i.set(n.pes.dts.offset + r, {
                                    packet: n,
                                    fieldName: 'DTS',
                                    color: e.dts,
                                });
                    }
                }),
            i
        );
    }
    var oi = f(() => {});
    var cr = f(() => {});
    var fr = f(() => {});
    var pr = f(() => {
        fr();
    });
    var mr,
        ai = f(() => {
            pr();
            mr = {
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
        });
    var ur = f(() => {});
    var gr,
        si = f(() => {
            gr = {
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
        });
    var hr = f(() => {});
    var xr = f(() => {});
    var yr = f(() => {});
    var _r = f(() => {});
    var br = f(() => {});
    var vr = f(() => {});
    var Sr = f(() => {});
    var Tr = f(() => {});
    var Cr = f(() => {});
    var Ir = f(() => {});
    var Er = f(() => {});
    var Ar = f(() => {});
    var Dr = f(() => {});
    var $r = f(() => {});
    var Pr = f(() => {});
    var wr = f(() => {});
    var Ur = f(() => {});
    var kr = f(() => {});
    var Rr = f(() => {});
    var Mr = f(() => {});
    var Lr = f(() => {});
    var Br = f(() => {});
    var Hr = f(() => {});
    var zr = f(() => {});
    var Fr = f(() => {});
    var Vr = f(() => {});
    var Nr = f(() => {});
    var Or = f(() => {});
    var Xr = f(() => {});
    var jr = f(() => {});
    var Gr = f(() => {
        Hr();
        zr();
        Fr();
        Vr();
        Nr();
        Or();
        Xr();
        jr();
    });
    var Wr = f(() => {});
    var qr = f(() => {});
    var Yr = f(() => {});
    var Kr = f(() => {});
    var Jr = f(() => {});
    var Qr = f(() => {});
    var Zr = f(() => {});
    var el = f(() => {});
    var tl = f(() => {});
    var il = f(() => {});
    var nl = f(() => {});
    var ol = f(() => {});
    var al = f(() => {});
    var sl = f(() => {});
    var rl = f(() => {});
    var ll = f(() => {});
    var dl = f(() => {});
    var cl = f(() => {});
    var fl = f(() => {});
    var pl = f(() => {});
    var ml = f(() => {});
    var ul = f(() => {});
    var gl = f(() => {});
    var hl = f(() => {});
    var xl = f(() => {});
    var pt = f(() => {
        hr();
        xr();
        yr();
        _r();
        br();
        vr();
        Sr();
        Tr();
        Cr();
        Ir();
        Er();
        Ar();
        Dr();
        $r();
        Pr();
        wr();
        Ur();
        kr();
        Rr();
        Mr();
        Lr();
        Br();
        Gr();
        Wr();
        qr();
        Yr();
        Kr();
        Jr();
        Qr();
        Zr();
        el();
        tl();
        il();
        nl();
        ol();
        al();
        sl();
        rl();
        ll();
        dl();
        cl();
        fl();
        pl();
        ml();
        ul();
        gl();
        hl();
        xl();
    });
    var _l,
        ri = f(() => {
            pt();
            _l = {
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
        });
    var bl,
        li = f(() => {
            pt();
            bl = {
                CAT: {
                    text: 'Conditional Access Table. Provides information on CA systems used in the multiplex.',
                    ref: 'Clause 2.4.4.7',
                },
            };
        });
    var vl,
        di = f(() => {
            pt();
            vl = {
                TSDT: {
                    text: 'Transport Stream Description Table. Contains descriptors that apply to the entire transport stream.',
                    ref: 'Clause 2.4.4.13',
                },
            };
        });
    var Sl,
        ci = f(() => {
            Sl = {
                'Private Section': {
                    text: 'A section containing user-defined private data. The structure and meaning of this data is not defined by the MPEG-2 specification.',
                    ref: 'Clause 2.4.4.11',
                },
            };
        });
    var Tl,
        fi = f(() => {
            Tl = {
                'IPMP-CIT': {
                    text: 'IPMP Control Information Table. Contains information for Intellectual Property Management and Protection systems.',
                    ref: 'Clause 2.4.4.1, ISO/IEC 13818-11',
                },
            };
        });
    var Cl = f(() => {});
    var Il,
        pi = f(() => {
            Cl();
            Il = {
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
        });
    var El,
        mi = f(() => {
            El = {
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
        });
    var Al = f(() => {
        cr();
        ai();
        ur();
        si();
        ri();
        li();
        di();
        ci();
        fi();
        pi();
        mi();
    });
    var Dl,
        $l = f(() => {
            Dl = {
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
        });
    var mf,
        uf,
        gf,
        Pl,
        wl = f(() => {
            ai();
            li();
            mi();
            fi();
            si();
            ri();
            pi();
            ci();
            di();
            $l();
            ((mf = {
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
            }),
                (uf = {
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
                    'HEVC_timing_and_HRD_descriptor@hrd_management_valid_flag':
                        {
                            text: 'If set to 1, indicates that HRD management is active and Buffering Period/Picture Timing SEIs shall be present.',
                            ref: 'Clause 2.6.98',
                        },
                    HEVC_hierarchy_extension_descriptor: {
                        text: 'Provides information to identify components of layered HEVC streams (e.g., SHVC, MV-HEVC). This is an Extension Descriptor.',
                        ref: 'Clause 2.6.102',
                    },
                    'HEVC_hierarchy_extension_descriptor@extension_dimension_bits':
                        {
                            text: 'A 16-bit field indicating the enhancement dimensions present (e.g., multi-view, spatial scalability).',
                            ref: 'Clause 2.6.103, Table 2-117',
                        },
                    'HEVC_hierarchy_extension_descriptor@hierarchy_layer_index':
                        {
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
                }),
                (gf = {
                    ...mf,
                    ...Dl,
                    ...uf,
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
                    'AVC_timing_and_HRD_descriptor@picture_and_timing_info_present':
                        {
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
                    'MPEG2_AAC_audio_descriptor@MPEG_2_AAC_channel_configuration':
                        {
                            text: 'Indicates the number and configuration of audio channels (e.g., mono, stereo, 5.1).',
                            ref: 'Clause 2.6.69',
                        },
                    'MPEG2_AAC_audio_descriptor@MPEG_2_AAC_additional_information':
                        {
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
                    'private_data_indicator_descriptor@private_data_indicator':
                        {
                            text: 'A 32-bit value whose meaning is privately defined, but should correspond to a registered format identifier.',
                            ref: 'Clause 2.6.29',
                        },
                    system_clock_descriptor: {
                        text: 'Conveys information about the system clock that was used to generate timestamps.',
                        ref: 'Clause 2.6.20',
                    },
                    'system_clock_descriptor@external_clock_reference_indicator':
                        {
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
                    'multiplex_buffer_utilization_descriptor@bound_valid_flag':
                        {
                            text: 'A flag indicating if the lower and upper bound fields are valid.',
                            ref: 'Clause 2.6.23',
                        },
                    'multiplex_buffer_utilization_descriptor@LTW_offset_lower_bound':
                        {
                            text: 'The lowest value that any Legal Time Window (LTW) offset field would have in the stream.',
                            ref: 'Clause 2.6.23',
                        },
                    'multiplex_buffer_utilization_descriptor@LTW_offset_upper_bound':
                        {
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
                    'target_background_grid_descriptor@aspect_ratio_information':
                        {
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
                    'MPEG4_audio_extension_descriptor@audioProfileLevelIndication':
                        {
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
                    'Auxiliary_video_stream_descriptor@aux_video_codedstreamtype':
                        {
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
                }),
                (Pl = {
                    ...mr,
                    ...bl,
                    ...gf,
                    ...El,
                    ...Tl,
                    ...gr,
                    ..._l,
                    ...Il,
                    ...Sl,
                    ...vl,
                }));
        });
    function Ul() {
        return Pl;
    }
    var ui = f(() => {
        Al();
        wl();
    });
    function kl(t, i) {
        if (!t?.data?.packets) return null;
        let e = t.data.packets.find((n) => n.offset === i);
        return (
            e || ((e = t.data.packets.find((n) => n.offset >= i)), e || null)
        );
    }
    function Rl(t) {
        if (!t || t.length === 0) return [];
        let i = [],
            e = {
                type: t[0].payloadType,
                pid: t[0].pid,
                count: 1,
                startOffset: t[0].offset,
                packets: [t[0]],
            };
        for (let n = 1; n < t.length; n++) {
            let o = t[n];
            o.payloadType === e.type && o.pid === e.pid
                ? (e.count++, e.packets.push(o))
                : (i.push(e),
                  (e = {
                      type: o.payloadType,
                      pid: o.pid,
                      count: 1,
                      startOffset: o.offset,
                      packets: [o],
                  }));
        }
        return (i.push(e), i);
    }
    function gi(t, i, e, n) {
        let { activeSegmentUrl: o, segmentCache: a } = S.getState(),
            s = a.get(o),
            r = s?.parsedData;
        if (!r || !r.data)
            return d`<div class="text-yellow-400 p-4">
            Could not parse Transport Stream data for this segment.
        </div>`;
        let l = ft(r),
            c = (p) => {
                let g = Math.ceil(Rl(r.data.packets).length / ut),
                    x = Ce + p;
                x >= 1 &&
                    x <= g &&
                    ((Ce = x),
                    P(gi(t, i, e, n), u.tabContents['interactive-segment']));
            };
        return d`
        <div
            class="grid grid-cols-1 lg:grid-cols-[minmax(400px,35%)_1fr] gap-6"
        >
            <div class="sticky top-4 h-max flex flex-col gap-4">
                <div
                    class="segment-inspector-panel rounded-md bg-gray-900/90 border border-gray-700 transition-opacity duration-200 h-[24rem] overflow-hidden flex flex-col"
                >
                    <!-- Inspector content is rendered here by interaction-logic.js -->
                </div>
                ${xf(r.data.summary)}
                ${yf(r.data.packets, c)}
            </div>
            <div>
                ${lt(s.data, l, t, i, e, n)}
            </div>
        </div>
    `;
    }
    var Ce,
        ut,
        mt,
        hf,
        Ml,
        xf,
        yf,
        Ll = f(() => {
            L();
            j();
            Y();
            ei();
            oi();
            ui();
            ((Ce = 1), (ut = 50));
            ((mt = (t, i, e) =>
                e == null
                    ? ''
                    : d`<tr data-field-name=${i} data-packet-offset=${t.offset}>
        <td class="p-1 pr-2 text-xs text-gray-400 align-top">${i}</td>
        <td class="p-1 text-xs font-mono text-white break-all">
            ${String(e)}
        </td>
    </tr>`),
                (hf = () => d`
    <div
        class="p-4 text-center text-sm text-gray-500 h-full flex flex-col justify-center items-center"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-10 w-10 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
        </svg>
        <p class="font-semibold">Inspector Panel</p>
        <p>
            Select a packet group from the list or hover over the hex view to
            see details here.
        </p>
    </div>
`),
                (Ml = (t, i, e) =>
                    t
                        ? d`
        <div class="p-3 border-b border-gray-700">
            <div class="font-bold text-base mb-1">
                Packet @${t.offset} (PID: ${t.pid})
            </div>
            <p class="text-xs text-gray-300">${t.payloadType}</p>
        </div>
        <div class="overflow-y-auto">
            <table class="w-full table-fixed">
                <colgroup>
                    <col class="w-1/2" />
                    <col class="w-1/2" />
                </colgroup>
                <tbody>
                    ${Object.entries(t.header).map(([n, o]) => mt(t, `Header: ${n}`, o.value))}
                    ${
                        t.adaptationField
                            ? Object.entries(t.adaptationField)
                                  .map(([n, o]) =>
                                      typeof o.value == 'object' &&
                                      o.value !== null
                                          ? Object.entries(o.value).map(
                                                ([a, s]) =>
                                                    mt(
                                                        t,
                                                        `AF.${n}.${a}`,
                                                        s.value
                                                    )
                                            )
                                          : mt(t, `AF: ${n}`, o.value)
                                  )
                                  .flat()
                            : ''
                    }
                    ${t.pes ? Object.entries(t.pes).map(([n, o]) => mt(t, `PES: ${n}`, o.value)) : ''}
                </tbody>
            </table>
        </div>
    `
                        : hf()),
                (xf = (t) => {
                    if (!t || !t.programMap)
                        return d`<p class="text-xs text-gray-400 p-2">
            No program summary available for this segment.
        </p>`;
                    let i = Object.keys(t.programMap)[0],
                        e = i ? t.programMap[i] : null,
                        n = (o, a) => d`
        <tr>
            <td class="p-1 pr-2 text-xs text-gray-400">${o}</td>
            <td class="p-1 text-xs font-mono text-white">${a}</td>
        </tr>
    `;
                    return d`<details class="mb-4" open>
        <summary class="font-semibold text-gray-300 cursor-pointer">
            Stream Summary
        </summary>
        <div
            class="bg-gray-900 border border-gray-700 rounded p-3 mt-2 text-xs"
        >
            <table class="w-full">
                <tbody>
                    ${n('Total Packets', t.totalPackets)}
                    ${n('PCR PID', t.pcrPid || 'N/A')}
                    ${e ? n('Program #', e.programNumber) : ''}
                </tbody>
            </table>
            <h5 class="font-semibold text-gray-400 mt-3 mb-1">
                Elementary Streams:
            </h5>
            ${
                e
                    ? d`<table class="w-full text-left">
                      <tbody>
                          ${Object.entries(e.streams).map(
                              ([o, a]) => d`<tr>
                                      <td class="p-1 font-mono">${o}</td>
                                      <td class="p-1">${a}</td>
                                  </tr>`
                          )}
                      </tbody>
                  </table>`
                    : 'PMT not found or parsed.'
            }
        </div>
    </details>`;
                }),
                (yf = (t, i) => {
                    let e = Rl(t),
                        n = Math.ceil(e.length / ut),
                        o = (Ce - 1) * ut,
                        a = o + ut,
                        s = e.slice(o, a);
                    return d` <h4 class="text-base font-bold text-gray-300 mb-2">
            Packet Groups
        </h4>
        <div
            class="bg-gray-900/50 p-2 rounded max-h-[calc(100vh-30rem)] overflow-y-auto packet-list-area"
        >
            ${s.map(
                (r) => d` <div
                        class="text-xs p-1 rounded hover:bg-gray-700/50 flex items-center gap-2 cursor-pointer border-l-4 border-transparent"
                        data-group-start-offset="${r.startOffset}"
                    >
                        <strong class="font-mono w-48 flex-shrink-0"
                            >Packets @${r.startOffset} (x${r.count})</strong
                        >
                        <span class="text-gray-400 truncate"
                            >PID ${r.pid}: ${r.type}</span
                        >
                    </div>`
            )}
        </div>
        ${
            n > 1
                ? d`<div class="text-center text-sm text-gray-500 mt-2">
                  <button
                      @click=${() => i(-1)}
                      ?disabled=${Ce === 1}
                      class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1"
                  >
                      &lt;
                  </button>
                  Page ${Ce} of ${n}
                  <button
                      @click=${() => i(1)}
                      ?disabled=${Ce === n}
                      class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1"
                  >
                      &gt;
                  </button>
              </div>`
                : ''
        }`;
                }));
        });
    function Bl(t) {
        je && (document.removeEventListener('keydown', je), (je = null));
        let i = hi.get(t);
        i &&
            (t.removeEventListener('mouseover', i.delegatedMouseOver),
            t.removeEventListener('mouseout', i.delegatedMouseOut),
            t.removeEventListener('click', i.handleClick),
            hi.delete(t));
    }
    function Hl() {
        let t = u.tabContents['interactive-segment'];
        t && Bl(t);
    }
    function xi(t, i, e, n, o, a) {
        let s = u.tabContents['interactive-segment'];
        if (!s || !t) return;
        Bl(s);
        let r = null,
            l = (v) => {
                let E = [
                        'border-t',
                        'border-b',
                        'border-l',
                        'border-r',
                        'border-t-2',
                        'border-b-2',
                        'border-l-2',
                        'border-r-2',
                        'border-purple-400',
                        'border-blue-400',
                        '-mt-px',
                        '-mb-px',
                        '-ml-px',
                        '-mr-px',
                    ],
                    k = v.map((D) => `.${D}`).join(', ');
                k &&
                    s
                        .querySelectorAll(k)
                        .forEach((D) => D.classList.remove(...v, ...E));
            },
            c = (v, E, k = 1) => {
                let D = s.querySelector('#hex-grid-content');
                if (!D) return;
                let B = k === 1 ? 'border' : `border-${k}`,
                    N = 'px';
                v.forEach((X) => {
                    if (X < o || X >= a) return;
                    D.querySelectorAll(`[data-byte-offset="${X}"]`)?.forEach(
                        (q) => {
                            let Be = !v.has(X - 16),
                                wc = !v.has(X + 16),
                                Uc = !v.has(X - 1) || X % 16 === 0,
                                kc = !v.has(X + 1) || (X + 1) % 16 === 0;
                            (Be &&
                                q.classList.add(`border-t-${B}`, `-mt-${N}`, E),
                                wc &&
                                    q.classList.add(
                                        `border-b-${B}`,
                                        `-mb-${N}`,
                                        E
                                    ),
                                Uc &&
                                    q.classList.add(
                                        `border-l-${B}`,
                                        `-ml-${N}`,
                                        E
                                    ),
                                kc &&
                                    q.classList.add(
                                        `border-r-${B}`,
                                        `-mr-${N}`,
                                        E
                                    ));
                        }
                    );
                });
            },
            p = (v, E) => {
                let k = s.querySelector('#hex-grid-content');
                k &&
                    E.forEach((D) => {
                        D >= o &&
                            D < a &&
                            k
                                .querySelectorAll(`[data-byte-offset="${D}"]`)
                                .forEach((N) => N.classList.add(v));
                    });
            },
            g = (v, E) => {
                let k = E.offset,
                    D = k + (E.size ?? 188),
                    B = new Set(),
                    N = Math.max(k, o),
                    X = Math.min(D, a);
                for (let W = N; W < X; W++) {
                    let q = i.get(W);
                    q && q.box && q.box.offset === E.offset && B.add(W);
                }
                return (p(v, B), B);
            },
            x = (v, E, k) => {
                let D = E.details?.[k];
                if (!D || D.offset === void 0 || D.length <= 0) return;
                let B = D.offset,
                    N = B + Math.ceil(D.length),
                    X = new Set(),
                    W = Math.max(B, o),
                    q = Math.min(N, a);
                for (let Be = W; Be < q; Be++) X.add(Be);
                (p(v, X), c(X, 'border-purple-400'));
            },
            m = (v, E) => {
                (l(['is-box-hover-highlighted', 'is-field-hover-highlighted']),
                    v &&
                        (g('is-box-hover-highlighted', v),
                        x('is-field-hover-highlighted', v, E)),
                    r === null && U(v, n, E));
            },
            _ = (v) => {
                let E = v.target.closest('[data-byte-offset]');
                if (!E) return;
                let k = parseInt(E.dataset.byteOffset),
                    D = i.get(k);
                D && m(D.box || D.packet, D.fieldName);
            },
            b = (v) => {
                let E = v.target.closest('[data-field-name]');
                if (!E) return;
                let k = E.dataset.fieldName,
                    D = parseInt(E.dataset.boxOffset || E.dataset.packetOffset);
                if (isNaN(D)) return;
                let B = e(t, D);
                B && m(B, k);
            },
            C = (v) => {
                let E = v.target.closest(
                    '[data-box-offset], [data-group-start-offset]'
                );
                if (!E) return;
                let k = parseInt(
                    E.dataset.boxOffset || E.dataset.groupStartOffset
                );
                if (isNaN(k)) return;
                let D = e(t, k),
                    B = D?.type ? 'Box Header' : 'TS Header';
                D && m(D, B);
            },
            A = (v) => {
                v.target.closest('.segment-inspector-panel')
                    ? b(v)
                    : v.target.closest('.box-tree-area, .packet-list-area')
                      ? C(v)
                      : v.target.closest('#hex-grid-content') && _(v);
            },
            I = () => {
                (l(['is-box-hover-highlighted', 'is-field-hover-highlighted']),
                    r === null && U(null, n));
            },
            $ = (v) => {
                let E = v.target;
                E.closest('summary') && v.preventDefault();
                let k = E.closest(
                    '[data-box-offset], [data-packet-offset], [data-group-start-offset]'
                );
                if (k) {
                    let D =
                        parseInt(k.dataset.boxOffset) ??
                        parseInt(k.dataset.packetOffset) ??
                        parseInt(k.dataset.groupStartOffset);
                    w(D);
                }
            };
        (s.addEventListener('mouseover', A),
            s.addEventListener('mouseout', I),
            s.addEventListener('click', $),
            hi.set(s, {
                delegatedMouseOver: A,
                delegatedMouseOut: I,
                handleClick: $,
            }),
            (je = (v) => {
                v.key === 'Escape' && r !== null && w(r);
            }),
            document.addEventListener('keydown', je));
        let w = (v) => {
            (r === v ? (r = null) : (r = v), M());
            let E = e(t, r);
            U(E, n);
        };
        function M() {
            if ((l(['is-highlighted']), r === null)) return;
            let v = e(t, r);
            if (!v) return;
            let E = g('is-highlighted', v);
            c(E, 'border-blue-400', 2);
        }
        function U(v, E, k = null) {
            let D = s.querySelector('.segment-inspector-panel');
            if (
                D &&
                (P(E(v, t, k), D),
                D.classList.remove('opacity-0'),
                D.querySelectorAll('.bg-purple-900\\/50').forEach((B) =>
                    B.classList.remove('bg-purple-900/50')
                ),
                v && k)
            ) {
                let B = D.querySelector(`[data-field-name="${k}"]`);
                B &&
                    (B.classList.add('bg-purple-900/50'),
                    B.scrollIntoView({ block: 'nearest' }));
            }
        }
        U(null, n);
    }
    var je,
        hi,
        zl = f(() => {
            Y();
            L();
            ((je = null), (hi = new Map()));
        });
    function We() {
        let { activeSegmentUrl: t, segmentCache: i } = S.getState();
        if ((t !== Fl && (Hl(), (Fl = t), (Ie = 1)), !t))
            return d`
            <div class="text-center py-12">
                <div class="text-gray-400 text-lg mb-4">
                    📄 Interactive Segment View
                </div>
                <p class="text-gray-500">
                    Select a segment from the "Segment Explorer" tab and click
                    "View Raw" to inspect its content here.
                </p>
            </div>
        `;
        let e = i.get(t);
        if (!e || e.status === -1)
            return d`
            <div class="text-center py-12">
                <div
                    class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
                ></div>
                <p class="text-gray-400">Loading and parsing segment data...</p>
            </div>
        `;
        if (e.status !== 200 || !e.data)
            return d`
            <div class="text-center py-12">
                <div class="text-red-400 text-lg mb-2">❌ Failed to Load</div>
                <p class="text-gray-400">
                    Failed to fetch segment. Status:
                    ${e.status || 'Network Error'}.
                </p>
            </div>
        `;
        let n = (r) => {
                let l = Math.ceil(e.data.byteLength / Ge),
                    c = Ie + r;
                c >= 1 &&
                    c <= l &&
                    ((Ie = c), P(We(), u.tabContents['interactive-segment']));
            },
            o = (Ie - 1) * Ge,
            a = Math.min(o + Ge, e.data.byteLength),
            s;
        return (
            e.parsedData?.format === 'ts'
                ? (s = gi(Ie, Ge, n, Vl))
                : (s = lr(Ie, Ge, n, Vl)),
            setTimeout(() => {
                if (e.parsedData?.format === 'ts') {
                    let r = ft(e.parsedData);
                    xi(e.parsedData, r, kl, Ml, o, a);
                } else if (e.parsedData?.format === 'isobmff') {
                    let r = e.parsedData.data.boxes || [],
                        l = dt(r);
                    xi(
                        e.parsedData.data,
                        l,
                        ar,
                        (c, p, g) => rr(c, p, g),
                        o,
                        a
                    );
                }
            }, 0),
            d`
        <div class="mb-6">
            <div class="flex justify-between items-center mb-2">
                <h3 class="text-xl font-bold text-white">
                    🔍 Interactive Segment View
                </h3>
                <button
                    @click=${() => document.querySelector('[data-tab="explorer"]')?.click()}
                    class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 text-sm"
                >
                    &larr; Back to Segment Explorer
                </button>
            </div>

            <p
                class="text-sm text-gray-400 mb-4 font-mono break-all bg-gray-800 p-2 rounded"
            >
                ${t}
            </p>
        </div>
        ${s}
    `
        );
    }
    var Fl,
        Ie,
        Ge,
        Vl,
        yi = f(() => {
            L();
            j();
            Y();
            dr();
            ii();
            Ll();
            oi();
            zl();
            st();
            ui();
            ((Fl = null), (Ie = 1), (Ge = 1024), (Vl = { ...Te(), ...Ul() }));
        });
    var Nl = {};
    Ht(Nl, {
        navigateManifestUpdates: () => Ee,
        renderManifestUpdates: () => Ae,
    });
    function Ee(t) {
        let { activeStreamId: i } = S.getState();
        (G.navigateManifestUpdate(i, t), Ae(i));
    }
    function Ae(t) {
        let i = u.tabContents.updates?.querySelector('#mpd-updates-content');
        if (u.tabContents.updates && !i) {
            let e = document.createElement('div');
            ((e.id = 'mpd-updates-content'),
                u.tabContents.updates.appendChild(e),
                (i = e));
        }
        if (i) {
            let e = S.getState().streams.find((n) => n.id === t);
            P(_f(e), i);
        }
    }
    var _f,
        gt = f(() => {
            L();
            re();
            j();
            Y();
            _f = (t) => {
                if (!t)
                    return d`<p class="warn">No active stream to monitor.</p>`;
                if (t.manifest.type !== 'dynamic')
                    return d`<p class="info">
            This is a VOD/static manifest. No updates are expected.
        </p>`;
                let { manifestUpdates: i, activeManifestUpdateIndex: e } = t,
                    n = i.length;
                if (n === 0)
                    return d`<p class="info">Awaiting first manifest update...</p>`;
                let o = n - e,
                    a = i[e],
                    s = a.diffHtml.split(`
`),
                    r =
                        e === i.length - 1
                            ? 'Initial Manifest loaded:'
                            : 'Update received at:',
                    l = d` <div class="text-sm text-gray-400 mb-2">
            ${r}
            <span class="font-semibold text-gray-200"
                >${a.timestamp}</span
            >
        </div>
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            ${s.map(
                (c, p) => d`
                    <div class="flex">
                        <span
                            class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-10"
                            >${p + 1}</span
                        >
                        <span class="flex-grow whitespace-pre-wrap break-all"
                            >${V(c)}</span
                        >
                    </div>
                `
            )}
        </div>`;
                return d` <div
            class="flex flex-col sm:flex-row justify-end items-center mb-4 space-y-2 sm:space-y-0"
        >
            <div class="flex items-center space-x-2">
                <button
                    id="prev-manifest-btn"
                    class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                    title="Previous Update (Right Arrow)"
                    ?disabled=${e >= n - 1}
                    @click=${() => Ee(1)}
                >
                    &lt;
                </button>
                <span
                    id="manifest-index-display"
                    class="text-gray-400 font-semibold w-16 text-center"
                    >${o}/${n}</span
                >
                <button
                    id="next-manifest-btn"
                    class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                    title="Next Update (Left Arrow)"
                    ?disabled=${e <= 0}
                    @click=${() => Ee(-1)}
                >
                    &gt;
                </button>
            </div>
        </div>
        <div id="current-manifest-update" class="manifest-update-entry">
            ${l}
        </div>`;
            };
        });
    var F,
        le = f(() => {
            F =
                'cursor-help border-b border-dotted border-blue-500/40 transition-colors hover:bg-blue-500/15 hover:border-solid';
        });
    var bf,
        Ol,
        Xl = f(() => {
            L();
            le();
            ((bf = (t) =>
                t
                    ? t.isValid
                        ? d`<div class="flex items-center gap-2">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
            <span class="text-xs text-green-300 font-semibold"
                >Validation Passed</span
            >
        </div>`
                        : d`<div class="flex items-start gap-2">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
        </svg>
        <div>
            <span class="text-xs text-red-300 font-semibold"
                >Validation Failed</span
            >
            <ul class="list-disc pl-4 mt-1 text-xs text-red-200">
                ${t.errors.map((i) => d`<li>${i}</li>`)}
            </ul>
        </div>
    </div>`
                    : d`<p class="text-xs text-gray-400">Not validated.</p>`),
                (Ol = (t) => {
                    let i = t.steeringInfo,
                        e = t.semanticData.get('steeringValidation');
                    return i
                        ? d`
        <div>
            <h3 class="text-xl font-bold mb-4">Delivery & Steering</h3>
            <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <dl class="grid gap-x-4 gap-y-2 grid-cols-[auto_1fr]">
                    <dt
                        class="text-sm font-medium text-gray-400 ${F}"
                        data-tooltip="The URI of the Content Steering manifest."
                        data-iso="HLS: 4.4.6.6"
                    >
                        Steering Server URI
                    </dt>
                    <dd class="text-sm font-mono text-white break-all">
                        ${i.value['SERVER-URI']}
                    </dd>

                    <dt
                        class="text-sm font-medium text-gray-400 ${F}"
                        data-tooltip="The initial Pathway to apply until the steering manifest is loaded."
                        data-iso="HLS: 4.4.6.6"
                    >
                        Default Pathway ID
                    </dt>
                    <dd class="text-sm font-mono text-white">
                        ${i.value['PATHWAY-ID'] || '.(default)'}
                    </dd>

                    <dt
                        class="text-sm font-medium text-gray-400 ${F}"
                        data-tooltip="The result of fetching and validating the steering manifest against the HLS specification."
                        data-iso="HLS: 7.2"
                    >
                        Validation Status
                    </dt>
                    <dd>
                        ${bf(e)}
                    </dd>
                </dl>
            </div>
        </div>
    `
                        : '';
                }));
        });
    function jl(t) {
        let { manifest: i } = t;
        if (!i || !i.summary)
            return d`<p class="warn">No manifest summary data to display.</p>`;
        let e = i.summary,
            n = e.hls?.mediaPlaylistDetails;
        return d`
        <div class="space-y-8">
            <!-- General Section -->
            <div>
                <h3 class="text-xl font-bold mb-4">General Properties</h3>
                <dl
                    class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                >
                    <div
                        class="bg-gray-800 p-4 rounded-lg border border-gray-700"
                    >
                        <dt
                            class="text-sm font-medium text-gray-400 ${F}"
                            data-tooltip="Indicates if the stream is live or on-demand."
                            data-iso="DASH: 5.3.1.2 / HLS: 4.3.3.5"
                        >
                            Stream Type
                        </dt>
                        <dd
                            class="text-lg font-semibold mt-1 break-words ${e.general.streamTypeColor}"
                        >
                            ${e.general.streamType}
                        </dd>
                    </div>
                    ${H('Protocol', e.general.protocol, 'The streaming protocol detected for this manifest.', 'N/A')}
                    ${H('Container Format', e.general.segmentFormat, 'The container format used for media segments (e.g., ISOBMFF or MPEG-2 TS).', 'DASH: 5.3.7 / HLS: 4.3.2.5')}
                    ${H('Media Duration', e.general.duration ? `${e.general.duration.toFixed(2)}s` : null, 'The total duration of the content.', 'DASH: 5.3.1.2')}
                </dl>
                ${vf(e)}
            </div>
            <!-- Metadata Section -->
            <div>
                <h3 class="text-xl font-bold mb-4">Metadata & Delivery</h3>
                <dl
                    class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                >
                    ${H('Title', e.general.title, 'The title of the program.', 'DASH: 5.3.4')}
                    ${H('Segmenting Strategy', e.general.segmenting, 'The method used to define segment URLs and timing.', 'DASH: 5.3.9')}
                    ${Sf(t)}
                    ${H('Alt. Locations', e.general.locations.length, 'Number of alternative manifest URLs provided.', 'DASH: 5.3.1.2')}
                </dl>
            </div>
            <!-- Low Latency Section -->
            ${
                e.lowLatency?.isLowLatency
                    ? d`
                      <div>
                          <h3 class="text-xl font-bold mb-4">
                              Low-Latency Status
                          </h3>
                          <dl
                              class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                          >
                              ${H('Target Latency', e.lowLatency.targetLatency ? `${e.lowLatency.targetLatency}ms` : null, 'The target latency for LL-DASH.', 'DASH: K.3.2')}
                              ${H('Part Target', e.lowLatency.partTargetDuration ? `${e.lowLatency.partTargetDuration}s` : null, 'Target duration for LL-HLS Partial Segments.', 'HLS 2nd Ed: 4.4.3.7')}
                              ${H('Part Hold Back', e.lowLatency.partHoldBack ? `${e.lowLatency.partHoldBack}s` : null, 'Server-recommended distance from the live edge for LL-HLS.', 'HLS 2nd Ed: 4.4.3.8')}
                              ${H('Can Block Reload', e.lowLatency.canBlockReload ? 'Yes' : null, 'Indicates server support for blocking playlist reload requests for LL-HLS.', 'HLS 2nd Ed: 4.4.3.8')}
                          </dl>
                      </div>
                  `
                    : ''
            }
            <!-- Content Section -->
            <div>
                <h3 class="text-xl font-bold mb-4">Content & Security</h3>
                <dl
                    class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                >
                    ${H('Video Tracks', e.content.videoTracks, 'Number of distinct video tracks or variants.', 'DASH: 5.3.3 / HLS: 4.3.4.2')}
                    ${H('Audio Tracks', e.content.audioTracks, 'Number of distinct audio tracks or renditions.', 'DASH: 5.3.3 / HLS: 4.3.4.1')}
                    ${H('Text Tracks', e.content.textTracks, 'Number of distinct subtitle or text tracks.', 'DASH: 5.3.3 / HLS: 4.3.4.1')}
                    ${e.security ? H('Encryption', e.security.isEncrypted ? e.security.systems.join(', ') : 'No', 'Detected DRM Systems or encryption methods.', 'DASH: 5.8.4.1 / HLS: 4.3.2.4') : ''}
                    ${e.security?.kids.length > 0 ? H('Key IDs (KIDs)', e.security.kids.join(', '), 'Key IDs found in the manifest.', 'ISO/IEC 23001-7') : ''}
                </dl>
            </div>

            <!-- Media Playlist Details Section (HLS Only) -->
            ${
                n
                    ? d`
                      <div>
                          <h3 class="text-xl font-bold mb-4">
                              Media Playlist Details
                          </h3>
                          <dl
                              class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                          >
                              ${H('Segment Count', n.segmentCount, 'Total number of media segments in this playlist.', 'HLS: 4.3.2.1')}
                              ${H('Avg. Segment Duration', n.averageSegmentDuration?.toFixed(2) + 's', 'The average duration of all segments.', 'HLS: 4.3.2.1')}
                              ${H('Discontinuities Present', n.hasDiscontinuity ? 'Yes' : 'No', 'Indicates if the playlist contains discontinuity tags, often used for ad insertion.', 'HLS: 4.3.2.3')}
                              ${H('I-Frame Only', n.isIFrameOnly ? 'Yes' : 'No', 'Indicates if all segments in this playlist are I-Frame only.', 'HLS: 4.3.3.6')}
                          </dl>
                      </div>
                  `
                    : ''
            }

            <!-- Track Details -->
            ${
                !n && e.videoTracks.length > 0
                    ? d`
                      <div>
                          <h3 class="text-xl font-bold mb-4">
                              Video Track Details
                          </h3>
                          <div class="space-y-4">
                              ${_i(e.videoTracks, 'video')}
                          </div>
                      </div>
                  `
                    : ''
            }
            ${
                !n && e.audioTracks.length > 0
                    ? d`
                      <div>
                          <h3 class="text-xl font-bold mb-4">
                              Audio Track Details
                          </h3>
                          <div class="space-y-4">
                              ${_i(e.audioTracks, 'audio')}
                          </div>
                      </div>
                  `
                    : ''
            }
            ${
                !n && e.textTracks.length > 0
                    ? d`
                      <div>
                          <h3 class="text-xl font-bold mb-4">
                              Text Track Details
                          </h3>
                          <div class="space-y-4">
                              ${_i(e.textTracks, 'text')}
                          </div>
                      </div>
                  `
                    : ''
            }
            ${t.protocol === 'hls' ? Ol(t) : ''}
        </div>
    `;
    }
    var H,
        _i,
        vf,
        Sf,
        Gl = f(() => {
            L();
            le();
            Xl();
            ((H = (t, i, e, n, o = '') => {
                if (
                    i == null ||
                    i === '' ||
                    (Array.isArray(i) && i.length === 0)
                )
                    return '';
                let a = `stat-card-${t.toLowerCase().replace(/[\s/]+/g, '-')}`;
                return d`
        <div
            data-testid="${a}"
            class="bg-gray-800 p-3 rounded-lg border border-gray-700 ${o}"
        >
            <dt
                class="text-xs font-medium text-gray-400 ${F}"
                data-tooltip="${e}"
                data-iso="${n}"
            >
                ${t}
            </dt>
            <dd
                class="text-base text-left font-mono text-white mt-1 break-words"
            >
                ${i}
            </dd>
        </div>
    `;
            }),
                (_i = (t, i) => {
                    if (!t || t.length === 0) return '';
                    let e, n;
                    return (
                        i === 'video'
                            ? ((e = [
                                  'ID',
                                  'Codecs',
                                  'Resolutions',
                                  'Bitrate',
                                  'Roles',
                              ]),
                              (n = t.map(
                                  (o) => d`
                <tr>
                    <td class="p-2 font-mono">${o.id}</td>
                    <td class="p-2 font-mono">${o.codecs.join(', ')}</td>
                    <td class="p-2 font-mono">
                        ${o.resolutions.join(', ')}
                    </td>
                    <td class="p-2 font-mono">${o.bitrateRange}</td>
                    <td class="p-2 font-mono">
                        ${o.roles.join(', ') || 'N/A'}
                    </td>
                </tr>
            `
                              )))
                            : i === 'audio'
                              ? ((e = [
                                    'ID',
                                    'Lang',
                                    'Codecs',
                                    'Channels',
                                    'Default',
                                    'Roles',
                                ]),
                                (n = t.map(
                                    (o) => d`
                <tr>
                    <td class="p-2 font-mono">${o.id}</td>
                    <td class="p-2 font-mono">${o.lang || 'N/A'}</td>
                    <td class="p-2 font-mono">${o.codecs.join(', ')}</td>
                    <td class="p-2 font-mono">${o.channels.join(', ')}</td>
                    <td class="p-2 font-mono">
                        ${o.isDefault ? 'Yes' : 'No'}
                    </td>
                    <td class="p-2 font-mono">
                        ${o.roles.join(', ') || 'N/A'}
                    </td>
                </tr>
            `
                                )))
                              : ((e = [
                                    'ID',
                                    'Lang',
                                    'Format',
                                    'Default',
                                    'Roles',
                                ]),
                                (n = t.map(
                                    (o) => d`
                <tr>
                    <td class="p-2 font-mono">${o.id}</td>
                    <td class="p-2 font-mono">${o.lang || 'N/A'}</td>
                    <td class="p-2 font-mono">
                        ${o.codecsOrMimeTypes.join(', ')}
                    </td>
                    <td class="p-2 font-mono">
                        ${o.isDefault ? 'Yes' : 'No'}
                    </td>
                    <td class="p-2 font-mono">
                        ${o.roles.join(', ') || 'N/A'}
                    </td>
                </tr>
            `
                                ))),
                        d`
        <div
            class="bg-gray-800/50 rounded-lg border border-gray-700 overflow-x-auto"
        >
            <table class="w-full text-left text-xs">
                <thead class="bg-gray-900/50">
                    <tr>
                        ${e.map(
                            (o) => d`<th
                                    class="p-2 font-semibold text-gray-300"
                                >
                                    ${o}
                                </th>`
                        )}
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-700">
                    ${n}
                </tbody>
            </table>
        </div>
    `
                    );
                }),
                (vf = (t) =>
                    t.dash
                        ? d`
            <h4 class="text-lg font-bold mb-3 mt-6">DASH Properties</h4>
            <dl
                class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
            >
                ${H('Min Buffer Time', `${t.dash.minBufferTime}s`, 'Minimum client buffer time.', 'DASH: 5.3.1.2')}
                ${
                    t.general.streamType.startsWith('Live')
                        ? d`
                          ${H('Update Period', `${t.dash.minimumUpdatePeriod}s`, 'How often a client should check for a new manifest.', 'DASH: 5.3.1.2')}
                          ${H('Live Window (DVR)', `${t.dash.timeShiftBufferDepth}s`, 'The duration of the seekable live window.', 'DASH: 5.3.1.2')}
                          ${H('Availability Start', t.dash.availabilityStartTime?.toLocaleString(), 'The anchor time for the presentation.', 'DASH: 5.3.1.2')}
                          ${H('Publish Time', t.dash.publishTime?.toLocaleString(), 'The time this manifest version was generated.', 'DASH: 5.3.1.2')}
                      `
                        : ''
                }
            </dl>
        `
                        : t.hls
                          ? d`
            <h4 class="text-lg font-bold mb-3 mt-6">HLS Properties</h4>
            <dl
                class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
            >
                ${H('HLS Version', t.hls.version, 'Indicates the compatibility version of the Playlist file.', 'HLS: 4.3.1.2')}
                ${H('Target Duration', `${t.hls.targetDuration}s`, 'The maximum Media Segment duration.', 'HLS: 4.3.3.1')}
                ${H('I-Frame Playlists', t.hls.iFramePlaylists, 'Number of I-Frame only playlists for trick-play modes.', 'HLS: 4.3.4.3')}
                ${H('Media Playlists', t.content.mediaPlaylists, 'Number of variant stream media playlists.', 'HLS: 4.3.4.2')}
            </dl>
        `
                          : ''),
                (Sf = (t) => {
                    let { manifest: i, protocol: e } = t,
                        n = i.summary,
                        o =
                            (e === 'dash' ? n.dash.profiles : n.hls.version) ||
                            '',
                        a =
                            e === 'dash'
                                ? o.split(',').map((m) => m.trim())
                                : [`Version ${o}`],
                        s = ['isoff', 'mp2t', 'isobmff', 'ts'],
                        r = !0,
                        l = a.map((m) => {
                            let _ = !1,
                                b =
                                    'This profile is not explicitly supported or its constraints are not validated by this tool.';
                            return (
                                e === 'dash'
                                    ? ((_ = s.some((C) =>
                                          m.toLowerCase().includes(C)
                                      )),
                                      _ &&
                                          ((b =
                                              'This is a standard MPEG-DASH profile based on a supported container format (ISOBMFF or MPEG-2 TS).'),
                                          (m.toLowerCase().includes('hbbtv') ||
                                              m
                                                  .toLowerCase()
                                                  .includes('dash-if')) &&
                                              ((_ = !1),
                                              (b =
                                                  'This is a known extension profile. While the base format is supported, HbbTV or DASH-IF specific rules are not validated.'))))
                                    : e === 'hls' &&
                                      ((_ =
                                          n.general.segmentFormat ===
                                              'ISOBMFF' ||
                                          n.general.segmentFormat === 'TS'),
                                      (b = `HLS support is determined by segment format. This stream uses ${n.general.segmentFormat} segments, which are fully supported for analysis.`)),
                                _ || (r = !1),
                                { profile: m, isSupported: _, explanation: b }
                            );
                        });
                    e === 'hls' && (r = l[0]?.isSupported ?? !1);
                    let c = r
                        ? d`<svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
          >
              <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
          </svg>`
                        : d`<svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
          >
              <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
          </svg>`;
                    return d`
        <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <dt
                class="flex justify-between items-center text-sm font-medium text-gray-400 ${F}"
                data-tooltip="Indicates the set of features used in the manifest."
                data-iso="DASH: 8.1 / HLS: 4.3.1.2"
            >
                Declared Profiles / Version
                <div
                    class="flex items-center gap-2 ${F}"
                    data-tooltip="${r ? 'All declared profiles and formats are supported for analysis.' : 'One or more declared profiles have constraints that are not validated by this tool. Base stream analysis should still be accurate.'}"
                >
                    ${c}
                    <span class="text-sm font-semibold ${r ? 'text-green-400' : 'text-yellow-400'}"
                        >${r ? 'Supported' : 'Partial/Unsupported'}</span
                    >
                </div>
            </dt>
            <dd class="text-base text-left font-mono text-white mt-2 space-y-2">
                ${l.map(
                    (m) => d` <div
                            class="flex items-center gap-2 text-xs p-1 bg-gray-900/50 rounded"
                        >
                            <span
                                class="flex-shrink-0 ${F}"
                                data-tooltip="${m.explanation}"
                            >
                                ${
                                    m.isSupported
                                        ? d`<svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          class="h-4 w-4 text-green-400"
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                      >
                                          <path
                                              fill-rule="evenodd"
                                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                              clip-rule="evenodd"
                                          />
                                      </svg>`
                                        : d`<svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          class="h-4 w-4 text-yellow-400"
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                      >
                                          <path
                                              fill-rule="evenodd"
                                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                              clip-rule="evenodd"
                                          />
                                      </svg>`
                                }
                            </span>
                            <span class="break-all">${m.profile}</span>
                        </div>`
                )}
            </dd>
        </div>
    `;
                }));
        });
    function De(t) {
        if (!t) return '';
        let i = Wl(t),
            e =
                /(&lt;!--[\s\S]*?--&gt;)|(&lt;\?[\s\S]*?\?&gt;)|(&lt;\/?)([\w:-]+)|([\w:-]+=)|(&quot;)([^&quot;]*)(&quot;)/g;
        return i.replace(e, (n, o, a, s, r, l, c, p, g) =>
            o
                ? `<span class="text-gray-500 italic">${o}</span>`
                : a
                  ? `<span class="text-gray-500">${a}</span>`
                  : s
                    ? `${s}<span class="text-blue-300">${r}</span>`
                    : l
                      ? `<span class="text-emerald-300">${l.slice(0, -1)}</span>=`
                      : c
                        ? `${c}<span class="text-yellow-300">${p}</span>${g}`
                        : n
        );
    }
    function ht(t) {
        return t
            ? t
                  .split(
                      `
`
                  )
                  .map((i) => {
                      let e = Wl(i.trim());
                      if (e.startsWith('#EXT')) {
                          let n = e.indexOf(':');
                          if (n === -1)
                              return `#<span class="text-purple-300">${e.substring(1)}</span>`;
                          let o = e.substring(1, n),
                              a = e.substring(n + 1);
                          return (
                              (a = a.replace(
                                  /([A-Z0-9-]+)=/g,
                                  '<span class="text-emerald-300">$1</span>='
                              )),
                              (a = a.replace(
                                  /"([^"]*)"/g,
                                  '"<span class="text-yellow-300">$1</span>"'
                              )),
                              `#<span class="text-purple-300">${o}</span>:${a}`
                          );
                      }
                      return e.startsWith('#')
                          ? `<span class="text-gray-500">${e}</span>`
                          : `<span class="text-cyan-400">${e}</span>`;
                  }).join(`
`)
            : '';
    }
    var Wl,
        bi = f(() => {
            Wl = (t) =>
                t
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
        });
    var ql,
        Yl,
        vi,
        Kl,
        Jl = f(() => {
            L();
            re();
            bi();
            ((ql = {
                fail: 'bg-red-900/60',
                warn: 'bg-yellow-900/60',
                pass: 'bg-green-900/50',
            }),
                (Yl = (t, i) => {
                    let e = t;
                    if (
                        (i !== 'all' && (e = t.filter((o) => o.status === i)),
                        e.length === 0)
                    )
                        return { b64TooltipHtml: '' };
                    let n = e
                        .map((o, a) => {
                            let s = {
                                fail: 'text-red-300',
                                warn: 'text-yellow-300',
                                pass: 'text-green-300',
                                info: 'text-blue-300',
                            }[o.status];
                            return `${a > 0 ? '<hr class="border-gray-600 my-2">' : ''}<div class="text-left">
            <p class="font-bold ${s}">[${o.status.toUpperCase()}] ${o.text}</p>
            <p class="text-xs text-gray-300 mt-1">${o.details}</p>
            <p class="text-xs text-gray-500 font-mono mt-2">${o.isoRef}</p>
        </div>`;
                        })
                        .join('');
                    try {
                        return { b64TooltipHtml: btoa(n) };
                    } catch (o) {
                        return (
                            console.error('Failed to encode tooltip', o),
                            { b64TooltipHtml: '' }
                        );
                    }
                }),
                (vi = (t, i, e, n, o, a, s) => {
                    if (typeof i != 'object' || i === null) return [];
                    let r = '  '.repeat(o),
                        l = e.filter((M) => M.location.path === n),
                        c = null,
                        p = '',
                        g = `loc-path-${n.replace(/[\[\].]/g, '-')}`;
                    if (l.length > 0) {
                        let M = { fail: 0, warn: 1, info: 2, pass: 3 };
                        ((c = l.reduce((U, v) =>
                            !U || M[v.status] < M[U.status] ? v : U
                        )),
                            (s === 'all' || s === c.status) &&
                                (p = c ? ql[c.status] : ''),
                            l.forEach((U) => {
                                U.location.startLine ||
                                    (U.location.startLine = a.count);
                            }));
                    }
                    let x = i[':@'] || {},
                        m = i['#text'] || null,
                        _ = Object.keys(i).filter(
                            (M) => M !== ':@' && M !== '#text'
                        ),
                        b = _.length > 0 || m,
                        C = Object.entries(x)
                            .map(([M, U]) => ` ${M}="${U}"`)
                            .join(''),
                        A = `<${t}${C}${b ? '' : ' /'}>`,
                        I = De(A),
                        $ = [],
                        { b64TooltipHtml: w } = Yl(l, s);
                    if (
                        ($.push(d`<div class="flex">
        <span class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-12">${a.count++}</span>
        <span id=${g} data-status=${c?.status} data-tooltip-html-b64=${w} class="compliance-highlight flex-grow whitespace-pre-wrap break-all ${p}">${V(r)}${V(I)}</span>
    </div>`),
                        b)
                    ) {
                        (m &&
                            $.push(d`<div class="flex">
                <span class="text-right text-gray-500 pr-4 select-none w-12">${a.count++}</span>
                <span class="flex-grow whitespace-pre-wrap break-all">${V(r + '  ')}<span class="text-gray-200">${m}</span></span>
            </div>`),
                            _.forEach((U) => {
                                let v = i[U];
                                Array.isArray(v)
                                    ? v.forEach((E, k) => {
                                          $.push(
                                              ...vi(
                                                  U,
                                                  E,
                                                  e,
                                                  `${n}.${U}[${k}]`,
                                                  o + 1,
                                                  a,
                                                  s
                                              )
                                          );
                                      })
                                    : typeof v == 'object' &&
                                      $.push(
                                          ...vi(
                                              U,
                                              v,
                                              e,
                                              `${n}.${U}[0]`,
                                              o + 1,
                                              a,
                                              s
                                          )
                                      );
                            }));
                        let M = De(`</${t}>`);
                        $.push(d`<div class="flex">
            <span class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-12">${a.count++}</span>
            <span class="flex-grow whitespace-pre-wrap break-all">${V(r)}${V(M)}</span>
        </div>`);
                    }
                    return $;
                }),
                (Kl = (t, i, e, n, o) => {
                    if (i === 'hls') {
                        let l = t.split(`
`),
                            c = new Map();
                        return (
                            e.forEach((p) => {
                                if (p.location.startLine)
                                    for (
                                        let g = p.location.startLine;
                                        g <=
                                        (p.location.endLine ||
                                            p.location.startLine);
                                        g++
                                    )
                                        (c.has(g) || c.set(g, []),
                                            c.get(g).push(p));
                            }),
                            d`${l.map((p, g) => {
                                let x = g + 1,
                                    m = c.get(x) || [],
                                    _ = m.reduce(
                                        (I, $) =>
                                            !I ||
                                            $.status === 'fail' ||
                                            ($.status === 'warn' &&
                                                I.status !== 'fail')
                                                ? $
                                                : I,
                                        null
                                    ),
                                    { b64TooltipHtml: b } = Yl(m, o),
                                    C =
                                        _ && (o === 'all' || o === _.status)
                                            ? ql[_.status]
                                            : '',
                                    A = `loc-line-${x}`;
                                return d`<div class="flex">
                <span class="text-right text-gray-500 pr-4 select-none w-12">${x}</span>
                <span id=${A} data-status=${_?.status} data-tooltip-html-b64=${b} class="compliance-highlight flex-grow whitespace-pre-wrap break-all ${C}">${V(ht(p))}</span>
            </div>`;
                            })}`
                        );
                    }
                    if (!n || typeof n != 'object')
                        return d`<div class="text-red-400">Error rendering DASH manifest object.</div>`;
                    let a = { count: 1 },
                        s = t.match(/<\?xml.*?\?>/),
                        r = vi('MPD', n, e, 'MPD[0]', 0, a, o);
                    return d`
        ${
            s
                ? d`<div class="flex">
            <span class="text-right text-gray-500 pr-4 select-none w-12">${a.count++}</span>
            <span class="flex-grow whitespace-pre-wrap break-all">${V(De(s[0]))}</span>
        </div>`
                : ''
        }
        ${r}
    `;
                }));
        });
    function Tf(t) {
        let e = t.currentTarget.dataset.locationId;
        document
            .querySelectorAll('.compliance-highlight')
            .forEach((o) =>
                o.classList.remove(
                    'bg-purple-500/30',
                    'outline',
                    'outline-1',
                    'outline-purple-400',
                    '-outline-offset-1'
                )
            );
        let n = document.getElementById(e);
        n &&
            n.classList.add(
                'bg-purple-500/30',
                'outline',
                'outline-1',
                'outline-purple-400',
                '-outline-offset-1'
            );
    }
    function Cf() {
        document
            .querySelectorAll('.compliance-highlight')
            .forEach((t) =>
                t.classList.remove(
                    'bg-purple-500/30',
                    'outline',
                    'outline-1',
                    'outline-purple-400',
                    '-outline-offset-1'
                )
            );
    }
    function If(t) {
        let e = t.currentTarget.dataset.locationId,
            n = document.getElementById(e);
        n && n.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    var Ef,
        Ql,
        Zl = f(() => {
            L();
            ((Ef = (t) => {
                let i = {
                        fail: 'border-red-500',
                        warn: 'border-yellow-500',
                        pass: 'border-green-500',
                        info: 'border-blue-500',
                    },
                    e = t.location.path
                        ? `loc-path-${t.location.path.replace(/[\[\].]/g, '-')}`
                        : `loc-line-${t.location.startLine}`;
                return d`
        <div
            class="compliance-comment-card bg-gray-800 p-3 rounded-lg border-l-4 ${i[t.status]} status-${t.status} cursor-pointer hover:bg-gray-700/50"
            data-location-id="${e}"
            @mouseover=${Tf}
            @mouseleave=${Cf}
            @click=${If}
        >
            <p class="font-semibold text-sm text-gray-200">
                ${t.location.startLine ? d`<span class="text-xs text-gray-500 mr-2">L${t.location.startLine}</span>` : ''}
                ${t.text}
            </p>
            <p class="text-xs text-gray-400 mt-1">${t.details}</p>
            <p class="text-xs text-gray-500 font-mono mt-2">${t.isoRef}</p>
        </div>
    `;
            }),
                (Ql = (t, i) => {
                    let e = {
                        pass: 0,
                        warn: 0,
                        fail: 0,
                        info: 0,
                        all: t.length,
                    };
                    t.forEach((a) => (e[a.status] = (e[a.status] || 0) + 1));
                    let n = i === 'all' ? t : t.filter((a) => a.status === i),
                        o = (a, s, r) => d` <button
        class="px-3 py-1 rounded-full text-xs transition-colors duration-200 ${i === a ? 'bg-blue-600 text-white font-semibold' : 'bg-gray-700 text-gray-300'}"
        data-filter="${a}"
    >
        ${s} (${r})
    </button>`;
                    return d`
        <!-- FIX: Filter bar is now a non-growing element -->
        <div
            class="compliance-filter-bar flex-shrink-0 flex items-center gap-2 mb-4 p-2 bg-gray-900/50 rounded-md sticky top-0 z-20 border-b border-gray-700"
        >
            ${o('all', 'All', e.all)}
            ${o('fail', 'Errors', e.fail)}
            ${o('warn', 'Warnings', e.warn)}
        </div>
        <!-- FIX: This list container now grows to fill space and scrolls independently -->
        <div class="space-y-2 flex-grow min-h-0 overflow-y-auto">
            ${n.map(Ef)}
        </div>
    `;
                }));
        });
    var ed,
        td = f(() => {
            L();
            j();
            ed = (t) => {
                if (t.manifest.type !== 'dynamic') return d``;
                let { manifestUpdates: i, activeManifestUpdateIndex: e } = t,
                    n = i.length,
                    o = i[0]?.hasNewIssues && e > 0;
                return d`
        <div class="flex items-center space-x-2">
            <button
                @click=${() => G.navigateManifestUpdate(t.id, 1)}
                ?disabled=${e >= n - 1}
                class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                title="Previous Update (Right Arrow)"
            >
                &lt;
            </button>
            <span class="text-gray-400 font-semibold w-24 text-center"
                >Update ${n - e}/${n}</span
            >
            <button
                @click=${() => G.navigateManifestUpdate(t.id, -1)}
                ?disabled=${e <= 0}
                class="relative px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                title="Next Update (Left Arrow)"
            >
                &gt;
                ${
                    o
                        ? d`<span class="absolute -top-1 -right-1 flex h-3 w-3">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>`
                        : ''
                }
            </button>
        </div>
    `;
            };
        });
    function Af(t) {
        if (Si) return;
        Si = !0;
        let i = t.querySelector('.compliance-filter-bar');
        i &&
            i.addEventListener('click', (e) => {
                let o = e.target.closest('[data-filter]');
                if (!o) return;
                let a = o.dataset.filter;
                if (a === qe) return;
                qe = a;
                let { streams: s, activeStreamId: r } = S.getState(),
                    l = s.find((c) => c.id === r);
                l && P(xt(l), t);
            });
    }
    function xt(t) {
        if (!t || !t.manifest) return d``;
        let { manifestUpdates: i, activeManifestUpdateIndex: e } = t,
            n = i[e];
        if (!n)
            return d`<p class="text-gray-400 p-4">
            Awaiting first manifest update with compliance data...
        </p>`;
        let { complianceResults: o, rawManifest: a, serializedManifest: s } = n;
        return (
            setTimeout(() => {
                let r = document.getElementById('tab-compliance');
                r && Af(r);
            }, 0),
            d`
        <div class="grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-6 h-full">
            <div class="flex flex-col min-h-0">
                <div
                    class="flex flex-col sm:flex-row justify-between items-center mb-4 flex-shrink-0"
                >
                    <h3 class="text-xl font-bold">
                        Interactive Compliance Report
                    </h3>
                    ${ed(t)}
                </div>
                <div
                    class="compliance-manifest-view bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-auto flex-grow"
                >
                    ${Kl(a, t.protocol, o, s, qe)}
                </div>
            </div>
            <!-- FIX: This is now a flex container that constrains the sidebar's height -->
            <div class="flex flex-col h-full min-h-0">
                ${Ql(o, qe)}
            </div>
        </div>
    `
        );
    }
    function id() {
        let { streams: t, activeStreamId: i } = S.getState(),
            e = t.find((o) => o.id === i),
            n = document.getElementById('tab-compliance');
        e && n && ((Si = !1), (qe = 'all'), P(xt(e), n));
    }
    var qe,
        Si,
        nd = f(() => {
            L();
            j();
            Jl();
            Zl();
            td();
            ((qe = 'all'), (Si = !1));
        });
    function od(t) {
        return t
            ? t.length === 0
                ? d`<div class="text-center py-8 text-gray-400">
            No video switching sets with segment indexes found to build
            timeline.
        </div>`
                : d`
        <h3 class="text-xl font-bold mb-4">
            CMAF Timeline & Fragment Alignment
        </h3>
        ${t.map(Pf)}
    `
            : d`<div class="text-center py-8 text-gray-400">
            Loading timeline data...
        </div>`;
    }
    var Df,
        $f,
        Pf,
        ad = f(() => {
            L();
            ((Df = (t, i, e = 0) =>
                !t || t.length === 0
                    ? ''
                    : t.map((n) => {
                          let o = n.details,
                              a =
                                  (o.presentation_time?.value || 0) /
                                  (o.timescale?.value || 1),
                              s =
                                  (o.event_duration?.value || 0) /
                                  (o.timescale?.value || 1),
                              r = ((a - e) / i) * 100,
                              l = (s / i) * 100;
                          return r < 0 || r > 100
                              ? ''
                              : d`<div
            class="absolute top-0 h-full bg-yellow-500/50 border-l-2 border-yellow-400 z-10"
            style="left: ${r}%; width: ${Math.max(0.2, l)}%;"
            title="Event: ${o.scheme_id_uri?.value}
ID: ${o.id?.value}
Time: ${a.toFixed(2)}s
Duration: ${s.toFixed(2)}s"
        ></div>`;
                      })),
                ($f = (t) => {
                    if (t.length === 0) return '';
                    let i = [...t].sort((n, o) => n.bandwidth - o.bandwidth),
                        e = Math.max(...i.map((n) => n.bandwidth || 0));
                    return d`
        <div class="bg-gray-900 p-4 rounded-md mt-4">
            <div class="space-y-2">
                ${i.map((n) => {
                    let o = ((n.bandwidth || 0) / e) * 100;
                    return d` <div class="flex items-center">
                        <div
                            class="w-28 text-xs text-gray-400 font-mono flex-shrink-0"
                            title="Representation ID: ${n.id}"
                        >
                            ${n.resolution}
                        </div>
                        <div class="w-full bg-gray-700 rounded-full h-5">
                            <div
                                class="bg-blue-600 h-5 rounded-full text-xs font-medium text-blue-100 text-center p-0.5 leading-none"
                                style="width: ${o}%"
                            >
                                ${n.bandwidth ? (n.bandwidth / 1e3).toFixed(0) + ' kbps' : 'N/A'}
                            </div>
                        </div>
                    </div>`;
                })}
            </div>
        </div>
    `;
                }),
                (Pf = (t) => {
                    let { totalDuration: i, representations: e } = t;
                    if (i === 0)
                        return d`<p class="text-gray-400 text-sm">
            Cannot render timeline: Total duration is zero or unknown.
        </p>`;
                    let n = e.flatMap((o) => o.events || []);
                    return d`
        <div class="mt-8">
            <h4 class="text-lg font-bold">Switching Set: ${t.id}</h4>
            <div class="bg-gray-900 rounded-lg p-4 mt-2 relative">
                ${Df(n, i)}
                ${e.map(
                    (o) => d`
                        <div class="flex items-center mb-1">
                            <div
                                class="w-32 text-xs text-gray-400 font-mono flex-shrink-0 pr-2 text-right"
                                title="Representation ID: ${o.id}"
                            >
                                ${o.resolution}
                            </div>
                            <div
                                class="w-full h-8 bg-gray-700/50 rounded flex items-center relative"
                            >
                                ${
                                    o.fragments
                                        ? o.fragments.map(
                                              (a) => d`
                                              <div
                                                  class="h-full bg-gray-600 border-r border-gray-800"
                                                  style="width: ${(a.duration / i) * 100}%;"
                                                  title="Start: ${a.startTime.toFixed(2)}s, Duration: ${a.duration.toFixed(2)}s"
                                              ></div>
                                          `
                                          )
                                        : d`<div
                                          class="w-full h-full bg-red-900/50 text-red-300 text-xs flex items-center justify-center p-2"
                                      >
                                          ${o.error}
                                      </div>`
                                }
                            </div>
                        </div>
                    `
                )}
            </div>
            <div class="text-xs text-gray-400 mt-2 flex justify-between">
                <span>0.00s</span>
                <span>Total Duration: ${i.toFixed(2)}s</span>
            </div>
            ${$f(e)}
        </div>
    `;
                }));
        });
    function rd(t) {
        return t.isMaster
            ? d`
            <h3 class="text-xl font-bold mb-4">HLS Master Playlist</h3>
            <p class="text-sm text-gray-400 mb-4">
                A master playlist defines available variants but does not have a
                monolithic timeline.
            </p>
            ${Uf(t)}
            ${wf(t)}
        `
            : t.type === 'dynamic'
              ? Rf(t)
              : kf(t);
    }
    var sd,
        wf,
        Uf,
        kf,
        Rf,
        ld = f(() => {
            L();
            ((sd = (t, i) =>
                !t || t.length === 0
                    ? ''
                    : t.map((e) => {
                          let n = (e.startTime / i) * 100,
                              o = (e.duration / i) * 100,
                              a = e.message
                                  .toLowerCase()
                                  .includes('interstitial'),
                              s = a
                                  ? 'bg-purple-500/60 border-l-4 border-purple-400'
                                  : 'bg-yellow-500/50 border-l-2 border-yellow-400',
                              r = a
                                  ? `Interstitial Ad: ${e.message}`
                                  : e.message;
                          return d`<div
            class="absolute top-0 bottom-0 ${s}"
            style="left: ${n}%; width: ${o}%;"
            title="${r}
Start: ${e.startTime.toFixed(2)}s
Duration: ${e.duration.toFixed(2)}s"
        ></div>`;
                      })),
                (wf = (t) => {
                    let i = t.periods
                        .flatMap((o) => o.adaptationSets)
                        .filter((o) => o.contentType === 'video')
                        .flatMap((o) => o.representations)
                        .sort((o, a) => o.bandwidth - a.bandwidth);
                    if (i.length === 0) return d``;
                    let e = Math.max(...i.map((o) => o.bandwidth)),
                        n = i.map((o) => {
                            let a = o.bandwidth,
                                s = (a / e) * 100,
                                r =
                                    o.width && o.height
                                        ? `${o.width}x${o.height}`
                                        : 'Audio Only',
                                l = o.codecs || 'N/A';
                            return d`
            <div class="flex items-center" title="Codecs: ${l}">
                <div class="w-28 text-xs text-gray-400 font-mono flex-shrink-0">
                    ${r}
                </div>
                <div class="w-full bg-gray-700 rounded-full h-5">
                    <div
                        class="bg-blue-600 h-5 rounded-full text-xs font-medium text-blue-100 text-center p-0.5 leading-none"
                        style="width: ${s}%"
                    >
                        ${(a / 1e3).toFixed(0)} kbps
                    </div>
                </div>
            </div>
        `;
                        });
                    return d`
        <div class="mt-6">
            <h4 class="text-lg font-bold">ABR Bitrate Ladder</h4>
            <div class="bg-gray-900 p-4 rounded-md mt-4 space-y-2">
                ${n}
            </div>
        </div>
    `;
                }),
                (Uf = (t) => {
                    let { periods: i } = t,
                        e = i.flatMap((r) => r.adaptationSets),
                        n = e
                            .filter((r) => r.contentType === 'video')
                            .reduce((r, l) => r + l.representations.length, 0),
                        o = e.filter((r) => r.contentType === 'audio').length,
                        a = e.filter(
                            (r) =>
                                r.contentType === 'text' ||
                                r.contentType === 'application'
                        ).length,
                        s = (r, l) => d`
        <div class="bg-gray-900 p-3 rounded-lg border border-gray-700">
            <dt class="text-sm font-medium text-gray-400">${r}</dt>
            <dd class="text-lg font-mono text-white mt-1">${l}</dd>
        </div>
    `;
                    return d`
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            ${s('Variant Streams', n)}
            ${s('Audio Renditions', o)}
            ${s('Subtitle Renditions', a)}
        </div>
    `;
                }),
                (kf = (t) => {
                    let i = t.segments || [],
                        e = t.duration;
                    if (e === 0 || i.length === 0)
                        return d`<p class="info">
            No segments found or total duration is zero.
        </p>`;
                    let n = i
                            .map((a) => `${(a.duration / e) * 100}%`)
                            .join(' '),
                        o = i.map((a, s) => {
                            let r = a.discontinuity;
                            return d`
            <div
                class="bg-gray-700 rounded h-10 border-r-2 ${r ? 'border-l-4 border-l-yellow-400' : 'border-gray-900'} last:border-r-0"
                title="Segment ${s + 1}
Duration: ${a.duration.toFixed(3)}s ${
                                r
                                    ? `
(Discontinuity)`
                                    : ''
                            }"
            ></div>
        `;
                        });
                    return d`
        <h3 class="text-xl font-bold mb-4">Timeline Visualization</h3>
        <div class="bg-gray-900 rounded-lg p-2 relative">
            <div
                class="grid grid-flow-col auto-cols-fr"
                style="grid-template-columns: ${n}"
            >
                ${o}
            </div>
            ${sd(t.events, e)}
        </div>
        <div class="text-xs text-gray-400 mt-2 text-right">
            Total Duration: ${e.toFixed(2)}s
        </div>
    `;
                }),
                (Rf = (t) => {
                    let i = t.segments || [],
                        e = t.targetDuration || 10,
                        n = i.slice(-3 * e),
                        o = n.reduce((p, g) => p + g.duration, 0),
                        a = t.serverControl?.['PART-HOLD-BACK'],
                        s = a != null && o > 0 ? 100 - (a / o) * 100 : null,
                        r = t.preloadHints?.find((p) => p.TYPE === 'PART'),
                        l = r?.DURATION || 0,
                        c = (l / o) * 100;
                    return d`
        <h3 class="text-xl font-bold mb-4">Live Timeline Visualization</h3>
        <div class="bg-gray-900 rounded-lg p-4 text-center">
            <div
                class="flex items-center justify-between text-sm text-gray-400 mb-2"
            >
                <span
                    >Segments in Playlist:
                    <strong>${i.length}</strong></span
                >
                <span
                    >Target Duration: <strong>${e}s</strong></span
                >
                <span
                    >Current Window Duration:
                    <strong>${o.toFixed(2)}s</strong></span
                >
            </div>
            <div class="bg-gray-800 p-2 rounded relative">
                <div
                    class="grid grid-flow-col auto-cols-fr h-10"
                    style="grid-template-columns: ${n.map((p) => `${(p.duration / o) * 100}%`).join(' ')}"
                >
                    ${n.map(
                        (p, g) => d`<div
                                class="bg-gray-700/50 border-r border-gray-900 flex"
                                title="Segment Duration: ${p.duration.toFixed(2)}s"
                            >
                                ${p.parts.map(
                                    (x) => d`
                                        <div
                                            class="h-full bg-blue-800/60 border-r border-gray-700"
                                            style="width: ${(x.DURATION / p.duration) * 100}%"
                                            title="Partial Segment
Duration: ${x.DURATION.toFixed(3)}s
Independent: ${x.INDEPENDENT === 'YES' ? 'Yes' : 'No'}"
                                        ></div>
                                    `
                                )}
                            </div>`
                    )}
                </div>
                ${sd(t.events, o)}
                ${
                    r
                        ? d`
                          <div
                              class="absolute top-0 right-0 h-full bg-blue-500/20 border-l-2 border-dashed border-blue-400"
                              style="width: ${c}%; transform: translateX(100%);"
                              title="Preload Hint: ${r.URI}
Duration: ${l}s"
                          ></div>
                      `
                        : ''
                }
                ${
                    s !== null
                        ? d`<div
                          class="absolute top-0 bottom-0 w-0.5 bg-cyan-400"
                          style="left: ${s}%;"
                          title="Server Recommended Playback Position (PART-HOLD-BACK: ${a}s)"
                      ></div>`
                        : ''
                }
                <div
                    class="absolute right-0 top-0 bottom-0 w-1 bg-red-500 rounded-full"
                    title="Approximate Live Edge"
                ></div>
            </div>
        </div>
    `;
                }));
        });
    var Ye,
        dd = f(() => {
            Ye = (t) => {
                if (!t) return null;
                let i = t.match(
                    /PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/
                );
                if (!i) return null;
                let e = parseFloat(i[1] || '0'),
                    n = parseFloat(i[2] || '0'),
                    o = parseFloat(i[3] || '0');
                return e * 3600 + n * 60 + o;
            };
        });
    function Ti(t, i, e = {}) {
        let n = [];
        if (!t || typeof t != 'object') return n;
        for (let o in t) {
            if (o === ':@' || o === '#text') continue;
            let a = t[o];
            if (!a) continue;
            let s = Array.isArray(a) ? a : [a];
            for (let r of s) {
                if (typeof r != 'object') continue;
                let l = { ...e, parent: t };
                (o === 'Period' && (l.period = r),
                    o === 'AdaptationSet' && (l.adaptationSet = r),
                    o === i && n.push({ element: r, context: l }),
                    n.push(...Ti(r, i, l)));
            }
        }
        return n;
    }
    function Mf(t, i) {
        if (!i) return t;
        if (!t) return i;
        let e = JSON.parse(JSON.stringify(t));
        Object.assign(e[':@'] || (e[':@'] = {}), i[':@']);
        for (let n in i)
            n !== ':@' &&
                (e[n] && Array.isArray(e[n]) && Array.isArray(i[n])
                    ? (e[n] = e[n].concat(i[n]))
                    : (e[n] = i[n]));
        return e;
    }
    function bt(t, i) {
        let e = i.map((n) => yt(n, t)).filter(Boolean);
        if (e.length !== 0) return e.reduceRight((n, o) => Mf(n, o));
    }
    function cd(t, i, e, n, o) {
        let a = t,
            s = [i, e, n, o];
        for (let r of s) {
            if (!r) continue;
            let l = _t(r, 'BaseURL');
            if (l.length > 0) {
                let c = Lf(l[0]);
                if (c === null || c.trim() === '') {
                    a = t;
                    continue;
                }
                try {
                    a = new URL(c.trim(), a).href;
                } catch (p) {
                    console.warn(`Invalid URL part in BaseURL: "${c}"`, p);
                }
            }
        }
        return a;
    }
    var R,
        yt,
        _t,
        J,
        Lf,
        vt = f(() => {
            ((R = (t, i) => t?.[':@']?.[i]),
                (yt = (t, i) => {
                    if (!t || !t[i]) return;
                    let e = t[i];
                    return Array.isArray(e) ? e[0] : e;
                }),
                (_t = (t, i) => {
                    if (!t || !t[i]) return [];
                    let e = t[i];
                    return Array.isArray(e) ? e : [e];
                }),
                (J = (t, i) => {
                    let e = [];
                    if (!t || typeof t != 'object') return e;
                    for (let n in t) {
                        if (n === ':@' || n === '#text') continue;
                        let o = t[n];
                        if (!o) continue;
                        let a = Array.isArray(o) ? o : [o];
                        for (let s of a)
                            (n === i && e.push(s),
                                typeof s == 'object' &&
                                    (e = e.concat(J(s, i))));
                    }
                    return e;
                }));
            Lf = (t) => t?.['#text'] || null;
        });
    function St(t, i) {
        let e = {},
            n = R(t, 'type') === 'dynamic';
        return (
            Ti(t, 'Representation').forEach(({ element: a, context: s }) => {
                let r = R(a, 'id');
                if (!r) return;
                e[r] = [];
                let { period: l, adaptationSet: c } = s;
                if (!l || !c) return;
                let p = [a, c, l],
                    g = cd(i, t, l, c, a),
                    x = bt('SegmentTemplate', p),
                    m = bt('SegmentList', p),
                    _ = bt('SegmentBase', p),
                    b = R(x, 'initialization');
                if (!b) {
                    let C = m || _,
                        A = C ? yt(C, 'Initialization') : null;
                    A && (b = R(A, 'sourceURL'));
                }
                if (b) {
                    let C = b.replace(/\$RepresentationID\$/g, r);
                    e[r].push({
                        repId: r,
                        type: 'Init',
                        number: 0,
                        resolvedUrl: new URL(C, g).href,
                        template: C,
                        time: -1,
                        duration: 0,
                        timescale: parseInt(R(x || m, 'timescale') || '1'),
                    });
                }
                if (x) {
                    let C = parseInt(R(x, 'timescale') || '1'),
                        A = R(x, 'media'),
                        I = yt(x, 'SegmentTimeline'),
                        $ = parseInt(R(x, 'startNumber') || '1');
                    if (A && I) {
                        let w = $,
                            M = 0;
                        _t(I, 'S').forEach((U) => {
                            let v = R(U, 't') ? parseInt(R(U, 't')) : M,
                                E = parseInt(R(U, 'd')),
                                k = parseInt(R(U, 'r') || '0');
                            M = v;
                            for (let D = 0; D <= k; D++) {
                                let B = M,
                                    N = A.replace(/\$RepresentationID\$/g, r)
                                        .replace(
                                            /\$Number(%0\d+d)?\$/g,
                                            (X, W) =>
                                                String(w).padStart(
                                                    W
                                                        ? parseInt(
                                                              W.substring(
                                                                  2,
                                                                  W.length - 1
                                                              )
                                                          )
                                                        : 1,
                                                    '0'
                                                )
                                        )
                                        .replace(/\$Time\$/g, String(B));
                                (e[r].push({
                                    repId: r,
                                    type: 'Media',
                                    number: w,
                                    resolvedUrl: new URL(N, g).href,
                                    template: N,
                                    time: B,
                                    duration: E,
                                    timescale: C,
                                }),
                                    (M += E),
                                    w++);
                            }
                        });
                    } else if (A && R(x, 'duration')) {
                        let w = parseInt(R(x, 'duration')),
                            M = w / C,
                            U = 0,
                            v = $;
                        if (n) U = 10;
                        else {
                            let E =
                                Ye(R(t, 'mediaPresentationDuration')) ||
                                Ye(R(l, 'duration'));
                            if (!E || !M) return;
                            U = Math.ceil(E / M);
                        }
                        for (let E = 0; E < U; E++) {
                            let k = v + E,
                                D = A.replace(
                                    /\$RepresentationID\$/g,
                                    r
                                ).replace(/\$Number(%0\d+d)?\$/g, (B, N) =>
                                    String(k).padStart(
                                        N
                                            ? parseInt(
                                                  N.substring(2, N.length - 1)
                                              )
                                            : 1,
                                        '0'
                                    )
                                );
                            e[r].push({
                                repId: r,
                                type: 'Media',
                                number: k,
                                resolvedUrl: new URL(D, g).href,
                                template: D,
                                time: (k - $) * w,
                                duration: w,
                                timescale: C,
                            });
                        }
                    }
                } else if (m) {
                    let C = parseInt(R(m, 'timescale') || '1'),
                        A = parseInt(R(m, 'duration')),
                        I = 0;
                    _t(m, 'SegmentURL').forEach((w, M) => {
                        let U = R(w, 'media');
                        U &&
                            (e[r].push({
                                repId: r,
                                type: 'Media',
                                number: M + 1,
                                resolvedUrl: new URL(U, g).href,
                                template: U,
                                time: I,
                                duration: A,
                                timescale: C,
                            }),
                            (I += A));
                    });
                } else if (_) {
                    let C =
                            Ye(R(t, 'mediaPresentationDuration')) ||
                            Ye(R(l, 'duration')) ||
                            0,
                        A = 1;
                    e[r].push({
                        repId: r,
                        type: 'Media',
                        number: 1,
                        resolvedUrl: g,
                        template: 'SegmentBase',
                        time: 0,
                        duration: C * A,
                        timescale: A,
                    });
                }
            }),
            e
        );
    }
    var Ci = f(() => {
        dd();
        vt();
        vt();
    });
    async function fd(t) {
        if (!t || !t.manifest) return [];
        let i = St(t.manifest.serializedManifest, t.baseUrl),
            e = t.manifest.periods.flatMap((n) =>
                n.adaptationSets
                    .filter((o) => o.contentType === 'video')
                    .map((o) => {
                        let a = o.representations.map((r) => {
                                let c = (i[r.id] || []).filter(
                                    (x) => x.type === 'Media'
                                );
                                if (c.length === 0)
                                    return {
                                        id: r.id,
                                        bandwidth: r.bandwidth,
                                        resolution: `${r.width}x${r.height}`,
                                        error: 'No media segments could be parsed for this Representation.',
                                        fragments: [],
                                        events: [],
                                    };
                                let p = c.map((x) => ({
                                        startTime: x.time / x.timescale,
                                        duration: x.duration / x.timescale,
                                    })),
                                    g = [];
                                return (
                                    S.getState().segmentCache.forEach((x) => {
                                        x.parsedData?.data?.events &&
                                            g.push(...x.parsedData.data.events);
                                    }),
                                    {
                                        id: r.id,
                                        bandwidth: r.bandwidth,
                                        resolution: `${r.width}x${r.height}`,
                                        fragments: p,
                                        events: g,
                                    }
                                );
                            }),
                            s = a[0]?.fragments
                                ? a[0].fragments
                                      .map((r) => r.duration)
                                      .reduce((r, l) => r + l, 0)
                                : 0;
                        return {
                            id: o.id || 'video-set',
                            totalDuration: s,
                            representations: a,
                        };
                    })
            );
        return Promise.resolve(e);
    }
    var pd = f(() => {
        j();
        Ci();
    });
    function Ii(t, i, e, n) {
        return i === 'hls'
            ? rd(t)
            : n
              ? d`<div class="text-center py-8 text-gray-400">
            Loading timeline data...
        </div>`
              : od(e);
    }
    function md(t, i) {
        if (i.protocol === 'hls') {
            P(Ii(i.manifest, i.protocol, null, !1), t);
            return;
        }
        (P(Ii(i.manifest, i.protocol, null, !0), t),
            fd(i)
                .then((e) => {
                    P(Ii(i.manifest, i.protocol, e, !1), t);
                })
                .catch((e) => {
                    console.error(
                        'Failed to create DASH timeline view model:',
                        e
                    );
                    let n = d`<div
                class="text-red-400 p-4 text-center"
            >
                <p class="font-bold">Error loading timeline visualization.</p>
                <p class="text-sm font-mono mt-2">${e.message}</p>
            </div>`;
                    P(n, t);
                }));
    }
    var ud = f(() => {
        L();
        ad();
        ld();
        pd();
    });
    var gd,
        hd = f(() => {
            gd = [
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
    var xd,
        yd = f(() => {
            xd = [
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
    function _d(t) {
        if (!t) return 'Unknown Scheme';
        let i = t.toLowerCase();
        return Bf[i] || `Unknown (${t})`;
    }
    var Bf,
        bd = f(() => {
            Bf = {
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
    function vd(t) {
        let i = {};
        if (!t)
            return {
                Error: {
                    used: !0,
                    details:
                        'Serialized XML object was not found for feature analysis.',
                },
            };
        for (let [e, n] of Object.entries(Hf))
            try {
                i[e] = n(t);
            } catch (o) {
                (console.error(`Error analyzing feature "${e}":`, o),
                    (i[e] = { used: !1, details: 'Analysis failed.' }));
            }
        return i;
    }
    var Ai,
        de,
        Ei,
        Hf,
        Sd = f(() => {
            bd();
            vt();
            ((Ai = (t, i) => J(t, i)[0]),
                (de = (t, i, e) => (n) => {
                    let o = Ai(n, t);
                    return { used: !!o, details: o ? i(o) : e };
                }),
                (Ei = (t, i, e) => (n) => {
                    let a = J(n, t).length;
                    return a === 0
                        ? { used: !1, details: '' }
                        : {
                              used: !0,
                              details: `${a} ${a === 1 ? i : e} found.`,
                          };
                }),
                (Hf = {
                    'Presentation Type': (t) => ({
                        used: !0,
                        details: `<code>${R(t, 'type')}</code>`,
                    }),
                    'MPD Locations': Ei(
                        'Location',
                        'location',
                        'locations provided'
                    ),
                    'Scoped Profiles': (t) => {
                        let i = J(t, 'AdaptationSet'),
                            e = J(t, 'Representation'),
                            n =
                                i.filter((a) => R(a, 'profiles')).length +
                                e.filter((a) => R(a, 'profiles')).length;
                        return n === 0
                            ? { used: !1, details: '' }
                            : {
                                  used: !0,
                                  details: `${n} ${n === 1 ? 'scoped profile' : 'scoped profiles'}`,
                              };
                    },
                    'Multi-Period': Ei('Period', 'Period', 'Periods'),
                    'Content Protection': (t) => {
                        let i = J(t, 'ContentProtection');
                        return i.length > 0
                            ? {
                                  used: !0,
                                  details: `Systems: <b>${[...new Set(i.map((n) => _d(R(n, 'schemeIdUri'))))].join(', ')}</b>`,
                              }
                            : {
                                  used: !1,
                                  details: 'No encryption descriptors found.',
                              };
                    },
                    'Client Authentication': de(
                        'EssentialProperty',
                        () => 'Signals requirement for client authentication.',
                        ''
                    ),
                    'Content Authorization': de(
                        'SupplementalProperty',
                        () => 'Signals requirement for content authorization.',
                        ''
                    ),
                    'Segment Templates': de(
                        'SegmentTemplate',
                        () => 'Uses templates for segment URL generation.',
                        ''
                    ),
                    'Segment Timeline': de(
                        'SegmentTimeline',
                        () =>
                            'Provides explicit segment timing via <code>&lt;S&gt;</code> elements.',
                        ''
                    ),
                    'Segment List': de(
                        'SegmentList',
                        () => 'Provides an explicit list of segment URLs.',
                        ''
                    ),
                    'Representation Index': Ei(
                        'RepresentationIndex',
                        'representation index',
                        'representation indices'
                    ),
                    'Low Latency Streaming': (t) => {
                        if (R(t, 'type') !== 'dynamic')
                            return {
                                used: !1,
                                details: 'Not a dynamic (live) manifest.',
                            };
                        let i = !!Ai(t, 'Latency'),
                            n = J(t, 'SegmentTemplate').some(
                                (o) =>
                                    R(o, 'availabilityTimeComplete') === 'false'
                            );
                        if (i || n) {
                            let o = [];
                            return (
                                i &&
                                    o.push(
                                        '<code>&lt;Latency&gt;</code> target defined.'
                                    ),
                                n && o.push('Chunked transfer hint present.'),
                                { used: !0, details: o.join(' ') }
                            );
                        }
                        return {
                            used: !1,
                            details: 'No specific low-latency signals found.',
                        };
                    },
                    'Manifest Patch Updates': de(
                        'PatchLocation',
                        (t) =>
                            `Patch location: <code>${t['#text']?.trim()}</code>`,
                        'Uses full manifest reloads.'
                    ),
                    'UTC Timing Source': (t) => {
                        let i = J(t, 'UTCTiming');
                        return i.length > 0
                            ? {
                                  used: !0,
                                  details: `Schemes: ${[...new Set(i.map((n) => `<code>${R(n, 'schemeIdUri').split(':').pop()}</code>`))].join(', ')}`,
                              }
                            : {
                                  used: !1,
                                  details:
                                      'No clock synchronization source provided.',
                              };
                    },
                    'Dependent Representations': (t) => {
                        let i = J(t, 'Representation').filter((e) =>
                            R(e, 'dependencyId')
                        );
                        return i.length > 0
                            ? {
                                  used: !0,
                                  details: `${i.length} dependent Representations`,
                              }
                            : { used: !1, details: '' };
                    },
                    'Associated Representations': (t) => {
                        let i = J(t, 'Representation').filter((e) =>
                            R(e, 'associationId')
                        );
                        return i.length > 0
                            ? { used: !0, details: `${i.length} associations` }
                            : { used: !1, details: '' };
                    },
                    'Trick Modes': (t) => {
                        let i = Ai(t, 'SubRepresentation'),
                            e = J(t, 'Role').some(
                                (n) => R(n, 'value') === 'trick'
                            );
                        if (i || e) {
                            let n = [];
                            return (
                                i &&
                                    n.push(
                                        '<code>&lt;SubRepresentation&gt;</code>'
                                    ),
                                e && n.push('<code>Role="trick"</code>'),
                                {
                                    used: !0,
                                    details: `Detected via: ${n.join(', ')}`,
                                }
                            );
                        }
                        return {
                            used: !1,
                            details: 'No explicit trick mode signals found.',
                        };
                    },
                    'Subtitles & Captions': (t) => {
                        let i = J(t, 'AdaptationSet').filter(
                            (e) =>
                                R(e, 'contentType') === 'text' ||
                                R(e, 'mimeType')?.startsWith('application')
                        );
                        if (i.length > 0) {
                            let e = [
                                ...new Set(
                                    i.map((n) => R(n, 'lang')).filter(Boolean)
                                ),
                            ];
                            return {
                                used: !0,
                                details: `Found ${i.length} track(s). ${e.length > 0 ? `Languages: <b>${e.join(', ')}</b>` : ''}`,
                            };
                        }
                        return {
                            used: !1,
                            details:
                                'No text or application AdaptationSets found.',
                        };
                    },
                    'Role Descriptors': (t) => {
                        let i = J(t, 'Role');
                        return i.length > 0
                            ? {
                                  used: !0,
                                  details: `Roles found: ${[...new Set(i.map((n) => `<code>${R(n, 'value')}</code>`))].join(', ')}`,
                              }
                            : { used: !1, details: 'No roles specified.' };
                    },
                    'MPD Events': de(
                        'EventStream',
                        () =>
                            'Uses <EventStream> for out-of-band event signaling.',
                        ''
                    ),
                    'Inband Events': de(
                        'InbandEventStream',
                        () =>
                            'Uses <InbandEventStream> to signal events within segments.',
                        ''
                    ),
                }));
        });
    function Td(t) {
        let i = {},
            e = t.tags || [];
        ((i['Presentation Type'] = {
            used: !0,
            details:
                t.type === 'dynamic'
                    ? '<code>EVENT</code> or Live'
                    : '<code>VOD</code>',
        }),
            (i['Master Playlist'] = {
                used: t.isMaster,
                details: t.isMaster
                    ? `${t.variants?.length || 0} Variant Streams found.`
                    : 'Media Playlist.',
            }));
        let n = (t.segments || []).some((m) => m.discontinuity);
        i.Discontinuity = {
            used: n,
            details: n
                ? 'Contains #EXT-X-DISCONTINUITY tags.'
                : 'No discontinuities found.',
        };
        let o = e.find((m) => m.name === 'EXT-X-KEY');
        if (o && o.value.METHOD !== 'NONE') {
            let m = [
                ...new Set(
                    e
                        .filter((_) => _.name === 'EXT-X-KEY')
                        .map((_) => _.value.METHOD)
                ),
            ];
            i['Content Protection'] = {
                used: !0,
                details: `Methods: <b>${m.join(', ')}</b>`,
            };
        } else
            i['Content Protection'] = {
                used: !1,
                details: 'No #EXT-X-KEY tags found.',
            };
        let a = e.some((m) => m.name === 'EXT-X-MAP');
        ((i['Fragmented MP4 Segments'] = {
            used: a,
            details: a
                ? 'Uses #EXT-X-MAP, indicating fMP4 segments.'
                : 'Likely Transport Stream (TS) segments.',
        }),
            (i['I-Frame Playlists'] = {
                used: e.some((m) => m.name === 'EXT-X-I-FRAME-STREAM-INF'),
                details: 'Provides dedicated playlists for trick-play modes.',
            }));
        let s = e.filter((m) => m.name === 'EXT-X-MEDIA');
        ((i['Alternative Renditions'] = {
            used: s.length > 0,
            details:
                s.length > 0
                    ? `${s.length} #EXT-X-MEDIA tags found.`
                    : 'No separate audio/video/subtitle renditions declared.',
        }),
            (i['Date Ranges / Timed Metadata'] = {
                used: t.events.some((m) => m.type === 'hls-daterange'),
                details:
                    'Carries timed metadata, often used for ad insertion signaling.',
            }));
        let r = s.some((m) => m.value.TYPE === 'SUBTITLES');
        ((i['Subtitles & Captions'] = {
            used: r,
            details: r
                ? 'Contains #EXT-X-MEDIA tags with TYPE=SUBTITLES.'
                : 'No subtitle renditions declared.',
        }),
            (i['Session Data'] = {
                used: e.some((m) => m.name === 'EXT-X-SESSION-DATA'),
                details:
                    'Carries arbitrary session data in the master playlist.',
            }),
            (i['Session Keys'] = {
                used: e.some((m) => m.name === 'EXT-X-SESSION-KEY'),
                details:
                    'Allows pre-loading of encryption keys from the master playlist.',
            }),
            (i['Independent Segments'] = {
                used: e.some((m) => m.name === 'EXT-X-INDEPENDENT-SEGMENTS'),
                details: 'All segments are self-contained for decoding.',
            }),
            (i['Start Offset'] = {
                used: e.some((m) => m.name === 'EXT-X-START'),
                details:
                    'Specifies a preferred starting position in the playlist.',
            }));
        let l = [];
        (t.partInf && l.push('EXT-X-PART-INF'),
            (t.segments || []).some((m) => (m.parts || []).length > 0) &&
                l.push('EXT-X-PART'),
            t.serverControl && l.push('EXT-X-SERVER-CONTROL'),
            (t.preloadHints || []).length > 0 && l.push('EXT-X-PRELOAD-HINT'),
            (t.renditionReports || []).length > 0 &&
                l.push('EXT-X-RENDITION-REPORT'),
            (i['Low-Latency HLS'] = {
                used: l.length > 0,
                details:
                    l.length > 0
                        ? `Detected low-latency tags: <b>${l.join(', ')}</b>`
                        : 'Standard latency HLS.',
            }));
        let c = e.some((m) => m.name === 'EXT-X-SKIP');
        i['Playlist Delta Updates'] = {
            used: c,
            details: c
                ? 'Contains #EXT-X-SKIP tag, indicating a partial playlist update.'
                : 'No delta updates detected.',
        };
        let p = e.some((m) => m.name === 'EXT-X-DEFINE');
        i['Variable Substitution'] = {
            used: p,
            details: p
                ? 'Uses #EXT-X-DEFINE for variable substitution.'
                : 'No variables defined.',
        };
        let g = e.some((m) => m.name === 'EXT-X-CONTENT-STEERING');
        i['Content Steering'] = {
            used: g,
            details: g
                ? 'Provides client-side CDN steering information.'
                : 'No content steering information found.',
        };
        let x = [];
        return (
            (t.variants || []).some((m) => m.attributes.SCORE) &&
                x.push('SCORE'),
            (t.variants || []).some((m) => m.attributes['VIDEO-RANGE']) &&
                x.push('VIDEO-RANGE'),
            (t.variants || []).some((m) => m.attributes['STABLE-VARIANT-ID']) &&
                x.push('STABLE-VARIANT-ID'),
            s.some((m) => m.value['STABLE-RENDITION-ID']) &&
                x.push('STABLE-RENDITION-ID'),
            t.events.some(
                (m) =>
                    m.type === 'hls-daterange' &&
                    m.message.toLowerCase().includes('interstitial')
            ) && x.push('Interstitials'),
            (i['Advanced Metadata & Rendition Selection'] = {
                used: x.length > 0,
                details:
                    x.length > 0
                        ? `Detected advanced attributes: <b>${x.join(', ')}</b>`
                        : 'Uses standard metadata.',
            }),
            i
        );
    }
    var Cd = f(() => {});
    function Id(t, i, e = null) {
        return i === 'dash' ? vd(e) : Td(t);
    }
    function Ed(t, i) {
        return (i === 'dash' ? gd : xd).map((n) => {
            let o = t.get(n.name) || {
                used: !1,
                details: 'Not detected in manifest.',
            };
            return { ...n, ...o };
        });
    }
    var Di = f(() => {
        hd();
        yd();
        Sd();
        Cd();
    });
    var Ad = {};
    Ht(Ad, { getFeaturesAnalysisTemplate: () => $i });
    function $i(t) {
        if (!t) return d`<p class="warn">No stream loaded to display.</p>`;
        let { results: i, manifestCount: e } = t.featureAnalysis,
            o = Ed(i, t.protocol).reduce(
                (s, r) => (
                    s[r.category] || (s[r.category] = []),
                    s[r.category].push(r),
                    s
                ),
                {}
            );
        return d`
        <h3 class="text-xl font-bold mb-2">Feature Usage Analysis</h3>
        ${
            t.manifest?.type !== 'dynamic'
                ? d`
                <div
                    class="bg-gray-900/50 border border-gray-700 rounded-lg p-3 flex items-center gap-3 mb-6"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6 text-gray-400 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                    <div>
                        <p class="font-semibold text-gray-200">
                            Static Manifest
                        </p>
                        <p class="text-xs text-gray-400">
                            Feature analysis is based on the initial manifest
                            load.
                        </p>
                    </div>
                </div>
            `
                : d`
            <div
                class="bg-gray-900/50 border border-gray-700 rounded-lg p-3 flex items-center gap-3 mb-6"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6 text-cyan-400 flex-shrink-0 animate-spin"
                    style="animation-duration: 3s;"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 4v5h5M20 20v-5h-5"
                    />
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 9a9 9 0 0114.65-5.65M20 15a9 9 0 01-14.65 5.65"
                    />
                </svg>
                <div>
                    <p class="font-semibold text-gray-200">
                        Live Analysis Active
                    </p>
                    <p class="text-xs text-gray-400">
                        Based on an analysis of
                        <b class="text-cyan-300 font-bold">${e}</b>
                        manifest version(s). New features will be detected
                        automatically.
                    </p>
                </div>
            </div>
        `
        }
        <p class="text-sm text-gray-500 mb-4">
            A breakdown of key features detected in the manifest and their
            implementation details.
        </p>
        ${Object.entries(o).map(([s, r]) => Ff(s, r))}
    `;
    }
    var zf,
        Ff,
        Pi = f(() => {
            L();
            re();
            le();
            Di();
            ((zf = (t) => {
                let i = t.used
                    ? d`<span
              class="text-xs font-semibold px-2 py-1 bg-green-800 text-green-200 rounded-full"
              >Used</span
          >`
                    : d`<span
              class="text-xs font-semibold px-2 py-1 bg-gray-600 text-gray-300 rounded-full"
              >Not Used</span
          >`;
                return d`
        <div
            class="grid grid-cols-[100px_1fr] items-center bg-gray-800 p-3 rounded-lg border border-gray-700"
        >
            <div class="text-center">${i}</div>
            <div>
                <p
                    class="font-medium ${F}"
                    data-tooltip="${t.desc}"
                    data-iso="${t.isoRef}"
                >
                    ${t.name}
                </p>
                <p class="text-xs text-gray-400 italic mt-1 font-mono">
                    ${V(t.details)}
                </p>
            </div>
        </div>
    `;
            }),
                (Ff = (t, i) => d`
    <div class="mt-8">
        <h4 class="text-lg font-semibold text-gray-300 mb-3">${t}</h4>
        <div class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(400px,1fr))]">
            ${i.map((e) => zf(e))}
        </div>
    </div>
`));
        });
    var wi,
        Dd = f(() => {
            wi = {
                MPD: {
                    text: 'The root element of the Media Presentation Description.',
                    isoRef: 'Clause 5.3.1.2',
                },
                'MPD@profiles': {
                    text: 'A comma-separated list of profiles the MPD conforms to. Essential for client compatibility.',
                    isoRef: 'Clause 8.1',
                },
                'MPD@type': {
                    text: 'Indicates if the presentation is static (VOD) or dynamic (live).',
                    isoRef: 'Clause 5.3.1.2, Table 3',
                },
                'MPD@minBufferTime': {
                    text: 'The minimum buffer time a client should maintain to ensure smooth playback.',
                    isoRef: 'Clause 5.3.1.2, Table 3',
                },
                'MPD@mediaPresentationDuration': {
                    text: 'The total duration of the on-demand content.',
                    isoRef: 'Clause 5.3.1.2, Table 3',
                },
                'MPD@availabilityStartTime': {
                    text: 'The anchor time for a dynamic presentation, defining the point from which all media times are calculated.',
                    isoRef: 'Clause 5.3.1.2, Table 3',
                },
                'MPD@publishTime': {
                    text: 'The time this version of the MPD was generated on the server.',
                    isoRef: 'Clause 5.3.1.2, Table 3',
                },
                'MPD@minimumUpdatePeriod': {
                    text: 'For dynamic MPDs, the minimum time a client should wait before requesting an updated MPD.',
                    isoRef: 'Clause 5.3.1.2, Table 3',
                },
                'MPD@timeShiftBufferDepth': {
                    text: 'The duration of the seekable live window (DVR) available to the client.',
                    isoRef: 'Clause 5.3.1.2, Table 3',
                },
                'MPD@suggestedPresentationDelay': {
                    text: 'A suggested delay from the live edge for players to begin presentation, helping to synchronize clients.',
                    isoRef: 'Clause 5.3.1.2, Table 3',
                },
                'MPD@maxSegmentDuration': {
                    text: 'The maximum duration of any Segment in this MPD. This attribute provides an upper bound for client buffer management.',
                    isoRef: 'Clause 5.3.1.2, Table 3',
                },
                'MPD@xmlns': {
                    text: 'XML Namespace. Defines the default namespace for elements in the document.',
                    isoRef: 'W3C XML Namespaces',
                },
                'MPD@xmlns:xsi': {
                    text: 'XML Namespace for XML Schema Instance. Used for attributes like schemaLocation.',
                    isoRef: 'W3C XML Schema Part 1',
                },
                'MPD@xsi:schemaLocation': {
                    text: 'XML Schema Location. Pairs a namespace URI with the location of its schema definition file (XSD).',
                    isoRef: 'W3C XML Schema Part 1',
                },
                'MPD@xmlns:cenc': {
                    text: 'XML Namespace for MPEG Common Encryption (CENC). This declares the "cenc" prefix for use on elements like <cenc:pssh>.',
                    isoRef: 'ISO/IEC 23001-7',
                },
                BaseURL: {
                    text: 'Specifies a base URL for resolving relative URLs within the MPD (e.g., for segments or initialization files).',
                    isoRef: 'Clause 5.6',
                },
                ProgramInformation: {
                    text: 'Provides descriptive metadata about the Media Presentation.',
                    isoRef: 'Clause 5.3.4',
                },
                'ProgramInformation@moreInformationURL': {
                    text: 'A URL pointing to a resource with more information about the program.',
                    isoRef: 'Clause 5.3.4.2, Table 7',
                },
                Title: {
                    text: 'A human-readable title for the Media Presentation.',
                    isoRef: 'Clause 5.3.4',
                },
                Source: {
                    text: 'Information about the source of the content, such as a broadcaster.',
                    isoRef: 'Clause 5.3.4',
                },
                Period: {
                    text: 'A Period represents a continuous segment of content. Multiple Periods can be used for things like ad insertion.',
                    isoRef: 'Clause 5.3.2',
                },
                'Period@id': {
                    text: 'A unique identifier for the Period. Mandatory for dynamic MPDs.',
                    isoRef: 'Clause 5.3.2.2, Table 4',
                },
                'Period@start': {
                    text: 'The start time of the Period on the Media Presentation Timeline.',
                    isoRef: 'Clause 5.3.2.2, Table 4',
                },
                'Period@duration': {
                    text: 'The duration of the Period.',
                    isoRef: 'Clause 5.3.2.2, Table 4',
                },
                AdaptationSet: {
                    text: 'A set of interchangeable encoded versions of one or several media components (e.g., all video bitrates, or all audio languages).',
                    isoRef: 'Clause 5.3.3',
                },
                'AdaptationSet@id': {
                    text: 'A unique identifier for the AdaptationSet within the Period.',
                    isoRef: 'Clause 5.3.3.2, Table 5',
                },
                'AdaptationSet@contentType': {
                    text: 'Specifies the media content type (e.g., "video", "audio").',
                    isoRef: 'Clause 5.3.3.2, Table 5',
                },
                'AdaptationSet@mimeType': {
                    text: 'The MIME type for all Representations in this set.',
                    isoRef: 'Clause 5.3.7.2, Table 14',
                },
                'AdaptationSet@lang': {
                    text: 'Specifies the language of the content, using RFC 5646 codes (e.g., "en", "es").',
                    isoRef: 'Clause 5.3.3.2, Table 5',
                },
                'AdaptationSet@segmentAlignment': {
                    text: 'If true, indicates that segments are aligned across Representations, simplifying seamless switching.',
                    isoRef: 'Clause 5.3.3.2, Table 5',
                },
                'AdaptationSet@subsegmentAlignment': {
                    text: 'If true, indicates that subsegments (e.g., CMAF chunks) are aligned across Representations, enabling low-latency switching.',
                    isoRef: 'Clause 5.3.3.2, Table 5',
                },
                'AdaptationSet@startWithSAP': {
                    text: 'Specifies if segments start with a Stream Access Point (SAP). A value of 1 (or higher) is typical, enabling easier stream switching and seeking.',
                    isoRef: 'Clause 5.3.3.2, Table 5',
                },
                'AdaptationSet@subsegmentStartsWithSAP': {
                    text: 'Specifies if subsegments start with a Stream Access Point (SAP), essential for low-latency streaming.',
                    isoRef: 'Clause 5.3.3.2, Table 5',
                },
                'AdaptationSet@minWidth': {
                    text: 'The minimum width of any video Representation in this set.',
                    isoRef: 'Clause 5.3.3.2, Table 5',
                },
                'AdaptationSet@maxWidth': {
                    text: 'The maximum width of any video Representation in this set.',
                    isoRef: 'Clause 5.3.3.2, Table 5',
                },
                'AdaptationSet@minHeight': {
                    text: 'The minimum height of any video Representation in this set.',
                    isoRef: 'Clause 5.3.3.2, Table 5',
                },
                'AdaptationSet@maxHeight': {
                    text: 'The maximum height of any video Representation in this set.',
                    isoRef: 'Clause 5.3.3.2, Table 5',
                },
                'AdaptationSet@maxFrameRate': {
                    text: 'The maximum frame rate of any video Representation in this set.',
                    isoRef: 'Clause 5.3.3.2, Table 5',
                },
                'AdaptationSet@width': {
                    text: 'The width of the video for all Representations in this set.',
                    isoRef: 'Clause 5.3.3.2, Table 5',
                },
                'AdaptationSet@height': {
                    text: 'The height of the video for all Representations in this set.',
                    isoRef: 'Clause 5.3.3.2, Table 5',
                },
                'AdaptationSet@frameRate': {
                    text: 'The frame rate of the video for all Representations in this set.',
                    isoRef: 'Clause 5.3.3.2, Table 5',
                },
                'AdaptationSet@par': {
                    text: 'The picture aspect ratio for the video content (e.g., "16:9").',
                    isoRef: 'Clause 5.3.3.2, Table 5',
                },
                Representation: {
                    text: 'A specific, deliverable encoded version of media content (e.g., video at a particular bitrate and resolution).',
                    isoRef: 'Clause 5.3.5',
                },
                'Representation@id': {
                    text: 'A unique identifier for the Representation within the Period.',
                    isoRef: 'Clause 5.3.5.2, Table 9',
                },
                'Representation@bandwidth': {
                    text: 'The required bandwidth in bits per second to stream this Representation.',
                    isoRef: 'Clause 5.3.5.2, Table 9',
                },
                'Representation@codecs': {
                    text: 'A string identifying the codec(s) used, as per RFC 6381.',
                    isoRef: 'Clause 5.3.7.2, Table 14',
                },
                'Representation@mimeType': {
                    text: 'The MIME type for this Representation, overriding any value set on the AdaptationSet.',
                    isoRef: 'Clause 5.3.7.2, Table 14',
                },
                'Representation@width': {
                    text: 'The width of the video in this Representation.',
                    isoRef: 'Clause 5.3.7.2, Table 14',
                },
                'Representation@height': {
                    text: 'The height of the video in this Representation.',
                    isoRef: 'Clause 5.3.7.2, Table 14',
                },
                'Representation@frameRate': {
                    text: 'The frame rate of the video.',
                    isoRef: 'Clause 5.3.7.2, Table 14',
                },
                'Representation@sar': {
                    text: 'The Sample Aspect Ratio of the video.',
                    isoRef: 'Clause 5.3.7.2, Table 14',
                },
                'Representation@audioSamplingRate': {
                    text: 'The sampling rate of the audio in samples per second.',
                    isoRef: 'Clause 5.3.7.2, Table 14',
                },
                'Representation@scanType': {
                    text: 'The scan type of the source video (e.g., "progressive", "interlaced").',
                    isoRef: 'Clause 5.3.7.2, Table 14',
                },
                SegmentTemplate: {
                    text: 'Defines a template for generating Segment URLs.',
                    isoRef: 'Clause 5.3.9.4',
                },
                'SegmentTemplate@timescale': {
                    text: 'The number of time units that pass in one second. Used for calculating segment durations and start times.',
                    isoRef: 'Clause 5.3.9.2.2, Table 16',
                },
                'SegmentTemplate@initialization': {
                    text: 'A template for the URL of the Initialization Segment.',
                    isoRef: 'Clause 5.3.9.4.2, Table 20',
                },
                'SegmentTemplate@presentationTimeOffset': {
                    text: "Specifies an offset in timescale units that is subtracted from the media presentation time. This is used to align the segment's internal timeline with the Period timeline.",
                    isoRef: 'Clause 5.3.9.5.2, Table 21',
                },
                'SegmentTemplate@media': {
                    text: 'A template for the URLs of the Media Segments. Often contains $Time$ or $Number$.',
                    isoRef: 'Clause 5.3.9.4.2, Table 20',
                },
                'SegmentTemplate@duration': {
                    text: 'Specifies the constant duration of each segment in timescale units. Used with $Number$ substitution.',
                    isoRef: 'Clause 5.3.9.5.2, Table 21',
                },
                'SegmentTemplate@startNumber': {
                    text: 'The number of the first Media Segment in this Representation.',
                    isoRef: 'Clause 5.3.9.5.2, Table 21',
                },
                SegmentTimeline: {
                    text: 'Provides an explicit timeline for media segments, allowing for variable durations.',
                    isoRef: 'Clause 5.3.9.6',
                },
                S: {
                    text: 'A Segment Timeline entry. Defines a series of one or more contiguous segments.',
                    isoRef: 'Clause 5.3.9.6.2',
                },
                'S@t': {
                    text: 'The start time of the first segment in this series, in units of the @timescale.',
                    isoRef: 'Clause 5.3.9.6.2, Table 22',
                },
                'S@d': {
                    text: 'The duration of each segment in this series, in units of the @timescale.',
                    isoRef: 'Clause 5.3.9.6.2, Table 22',
                },
                'S@r': {
                    text: 'The repeat count. A value of "N" means there are N+1 segments in this series.',
                    isoRef: 'Clause 5.3.9.6.2, Table 22',
                },
                Accessibility: {
                    text: 'Specifies information about an accessibility scheme. This descriptor helps identify content features like audio descriptions or subtitles for the hard-of-hearing.',
                    isoRef: 'Clause 5.8.4.3',
                },
                'Accessibility@schemeIdUri': {
                    text: 'A URI that uniquely identifies the accessibility scheme. The format and meaning of the @value attribute are defined by this scheme.',
                    isoRef: 'Clause 5.8.2, Table 32',
                },
                'Accessibility@value': {
                    text: "A value whose meaning is defined by the scheme identified in @schemeIdUri. For example, it could be a code for 'audio description'.",
                    isoRef: 'Clause 5.8.2, Table 32',
                },
                ContentProtection: {
                    text: 'Contains information about a DRM or encryption scheme used to protect the content.',
                    isoRef: 'Clause 5.8.4.1',
                },
                'ContentProtection@schemeIdUri': {
                    text: 'A URI that uniquely identifies the content protection scheme (e.g., the UUID for Widevine or PlayReady).',
                    isoRef: 'Clause 5.8.2, Table 32',
                },
                'ContentProtection@value': {
                    text: 'An optional string providing additional scheme-specific information. For CENC, this is "cenc".',
                    isoRef: 'Clause 5.8.2, Table 32',
                },
                'ContentProtection@cenc:default_KID': {
                    text: 'The default Key ID for the content. This is the primary identifier for the decryption key.',
                    isoRef: 'ISO/IEC 23001-7',
                },
                'cenc:pssh': {
                    text: 'Protection System Specific Header. Contains initialization data required by the DRM system (e.g., Widevine, PlayReady) to acquire a license.',
                    isoRef: 'ISO/IEC 23001-7',
                },
                AudioChannelConfiguration: {
                    text: 'Specifies the audio channel layout (e.g., stereo, 5.1 surround).',
                    isoRef: 'Clause 5.8.4.7',
                },
                'AudioChannelConfiguration@schemeIdUri': {
                    text: 'Identifies the scheme used to define the audio channel configuration.',
                    isoRef: 'Clause 5.8.2, Table 32',
                },
                'AudioChannelConfiguration@value': {
                    text: 'The value for the audio channel configuration according to the specified scheme (e.g., "2" for stereo).',
                    isoRef: 'Clause 5.8.2, Table 32',
                },
                Role: {
                    text: 'Describes the role or purpose of an AdaptationSet (e.g., "main", "alternate", "commentary").',
                    isoRef: 'Clause 5.8.4.2',
                },
                'Role@schemeIdUri': {
                    text: 'Identifies the scheme used for the Role descriptor.',
                    isoRef: 'Clause 5.8.2, Table 32',
                },
                'Role@value': {
                    text: 'The specific role value within the defined scheme.',
                    isoRef: 'Clause 5.8.2, Table 32',
                },
                UTCTiming: {
                    text: 'Provides a timing source for clients to synchronize their clocks, crucial for live playback.',
                    isoRef: 'Clause 5.8.4.11',
                },
                'UTCTiming@schemeIdUri': {
                    text: 'Identifies the scheme for the clock synchronization (e.g., "urn:mpeg:dash:utc:http-xsdate:2014").',
                    isoRef: 'Clause 5.8.2, Table 32',
                },
                'UTCTiming@value': {
                    text: 'The value for the clock synchronization, often a URL to a time server providing an ISO 8601 date.',
                    isoRef: 'Clause 5.8.2, Table 32',
                },
                SupplementalProperty: {
                    text: 'Specifies supplemental information that may be used by the client for optimized processing.',
                    isoRef: 'Clause 5.8.4.9',
                },
                'SupplementalProperty@schemeIdUri': {
                    text: 'Identifies the scheme for the supplemental property.',
                    isoRef: 'Clause 5.8.2, Table 32',
                },
                'SupplementalProperty@value': {
                    text: 'The value of the property. For AdaptationSet switching, this is a list of AdaptationSet IDs.',
                    isoRef: 'Clause 5.8.2, Table 32',
                },
            };
        });
    var he,
        Ui,
        $d,
        Pd,
        xe,
        ki,
        Vf,
        wd,
        Ri,
        Ud = f(() => {
            L();
            re();
            Dd();
            le();
            ((he = 1),
                (Ui = 500),
                ($d = null),
                (Pd = (t, i, e) => {
                    let n = he + t;
                    if (n >= 1 && n <= e) {
                        he = n;
                        let o = document.getElementById(
                            'tab-interactive-manifest'
                        );
                        P(Ri(i), o);
                    }
                }),
                (xe = (t) =>
                    t
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')),
                (ki = (t) => {
                    let i = t.startsWith('/'),
                        e = i ? t.substring(1) : t,
                        n = wi[e],
                        [o, a] = e.includes(':') ? e.split(':') : [null, e],
                        s = o ? `<span class="text-gray-400">${o}:</span>` : '',
                        r =
                            'text-blue-300 rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700',
                        l = n
                            ? `data-tooltip="${xe(n.text)}" data-iso="${xe(n.isoRef)}"`
                            : `data-tooltip="No definition for &lt;${e}&gt;"`;
                    return `&lt;${i ? '/' : ''}<span class="${F}" ${l}>${s}<span class="${r}">${a}</span></span>`;
                }),
                (Vf = (t, i) => {
                    let e = `${t}@${i.name}`,
                        n = wi[e],
                        o =
                            'text-emerald-300 rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700',
                        a = 'text-yellow-300',
                        s = [
                            'xmlns',
                            'xmlns:xsi',
                            'xsi:schemaLocation',
                        ].includes(i.name),
                        r = '',
                        l = '';
                    return (
                        n
                            ? ((r = F),
                              (l = `data-tooltip="${xe(n.text)}" data-iso="${xe(n.isoRef)}"`))
                            : s ||
                              ((r =
                                  'cursor-help bg-red-900/50 missing-tooltip-trigger'),
                              (l = `data-tooltip="Tooltip definition missing for '${i.name}' on &lt;${t}&gt;"`)),
                        `<span class="${o} ${r}" ${l}>${i.name}</span>="<span class="${a}">${xe(i.value)}</span>"`
                    );
                }),
                (wd = (t, i = 0) => {
                    if (!t || typeof t.nodeType > 'u') return [];
                    let e = '  '.repeat(i);
                    switch (t.nodeType) {
                        case Node.ELEMENT_NODE: {
                            let n = t,
                                o = Array.from(n.childNodes).filter(
                                    (s) =>
                                        s.nodeType === Node.ELEMENT_NODE ||
                                        s.nodeType === Node.COMMENT_NODE ||
                                        (s.nodeType === Node.TEXT_NODE &&
                                            s.textContent.trim())
                                ),
                                a = Array.from(n.attributes)
                                    .map((s) => ` ${Vf(n.tagName, s)}`)
                                    .join('');
                            if (o.length > 0) {
                                let s = `${e}${ki(n.tagName)}${a}&gt;`,
                                    r = o.flatMap((c) => wd(c, i + 1)),
                                    l = `${e}${ki(`/${n.tagName}`)}&gt;`;
                                return [s, ...r, l];
                            } else return [`${e}${ki(n.tagName)}${a} /&gt;`];
                        }
                        case Node.TEXT_NODE:
                            return [
                                `${e}<span class="text-gray-200">${xe(t.textContent.trim())}</span>`,
                            ];
                        case Node.COMMENT_NODE:
                            return [
                                `${e}<span class="text-gray-500 italic">&lt;!--${xe(t.textContent)}--&gt;</span>`,
                            ];
                        default:
                            return [];
                    }
                }),
                (Ri = (t) => {
                    let e =
                            t.manifestUpdates && t.manifestUpdates.length > 0
                                ? t.manifestUpdates[t.activeManifestUpdateIndex]
                                      .rawManifest
                                : t.rawManifest,
                        n,
                        a = new DOMParser().parseFromString(
                            e,
                            'application/xml'
                        ),
                        s = a.querySelector('parsererror');
                    if (s)
                        return (
                            console.error('XML Parsing Error:', s.textContent),
                            d`<div class="text-red-400 p-4 font-mono">
            <p class="font-bold">Failed to parse manifest XML.</p>
            <pre class="mt-2 bg-gray-900 p-2 rounded">
${s.textContent}</pre
            >
        </div>`
                        );
                    if (((n = a.querySelector('MPD')), !n))
                        return d`<div class="text-red-400 p-4">
            Error: &lt;MPD&gt; root element not found in the manifest.
        </div>`;
                    let r = wd(n),
                        l = Math.ceil(r.length / Ui);
                    e !== $d && ((he = 1), ($d = e));
                    let c = (he - 1) * Ui,
                        p = c + Ui,
                        g = r.slice(c, p),
                        x =
                            l > 1
                                ? d` <div class="text-center text-sm text-gray-400 mt-4">
                  <button
                      @click=${() => Pd(-1, t, l)}
                      ?disabled=${he === 1}
                      class="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-2"
                  >
                      &larr; Previous
                  </button>
                  <span
                      >Page ${he} of ${l} (Lines
                      ${c + 1}-${Math.min(p, r.length)})</span
                  >
                  <button
                      @click=${() => Pd(1, t, l)}
                      ?disabled=${he === l}
                      class="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-2"
                  >
                      Next &rarr;
                  </button>
              </div>`
                                : '';
                    return d`
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            ${g.map(
                (m, _) => d`
                    <div class="flex">
                        <span
                            class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-12"
                            >${c + _ + 1}</span
                        >
                        <span class="flex-grow whitespace-pre-wrap break-all"
                            >${V(m)}</span
                        >
                    </div>
                `
            )}
        </div>
        ${x}
    `;
                }));
        });
    var $e,
        kd = f(() => {
            $e = {
                EXTM3U: {
                    text: 'Indicates that the file is an Extended M3U Playlist file. It MUST be the first line of every Media Playlist and every Master Playlist.',
                    isoRef: 'RFC 8216, Section 4.3.1.1',
                },
                'EXT-X-VERSION': {
                    text: 'Indicates the compatibility version of the Playlist file. It applies to the entire Playlist file.',
                    isoRef: 'RFC 8216, Section 4.3.1.2',
                },
                EXTINF: {
                    text: 'Specifies the duration of a Media Segment in seconds. It applies only to the Media Segment that follows it.',
                    isoRef: 'RFC 8216, Section 4.3.2.1',
                },
                'EXT-X-BYTERANGE': {
                    text: 'Indicates that a Media Segment is a sub-range of the resource identified by its URI.',
                    isoRef: 'RFC 8216, Section 4.3.2.2',
                },
                'EXT-X-DISCONTINUITY': {
                    text: 'Indicates a discontinuity between the Media Segment that follows it and the one that preceded it (e.g., format or timestamp change).',
                    isoRef: 'RFC 8216, Section 4.3.2.3',
                },
                'EXT-X-KEY': {
                    text: 'Specifies how to decrypt Media Segments. It applies to every Media Segment that appears after it until the next EXT-X-KEY tag.',
                    isoRef: 'RFC 8216, Section 4.3.2.4',
                },
                'EXT-X-KEY@METHOD': {
                    text: 'The encryption method. Valid values are NONE, AES-128, and SAMPLE-AES.',
                    isoRef: 'RFC 8216, Section 4.3.2.4',
                },
                'EXT-X-KEY@URI': {
                    text: 'The URI that specifies how to obtain the encryption key.',
                    isoRef: 'RFC 8216, Section 4.3.2.4',
                },
                'EXT-X-KEY@IV': {
                    text: 'A hexadecimal-sequence that specifies a 128-bit unsigned integer Initialization Vector.',
                    isoRef: 'RFC 8216, Section 4.3.2.4',
                },
                'EXT-X-KEY@KEYFORMAT': {
                    text: 'Specifies how the key is represented in the resource identified by the URI.',
                    isoRef: 'RFC 8216, Section 4.3.2.4',
                },
                'EXT-X-KEY@KEYFORMATVERSIONS': {
                    text: 'Indicates which version(s) of a KEYFORMAT this instance complies with.',
                    isoRef: 'RFC 8216, Section 4.3.2.4',
                },
                'EXT-X-MAP': {
                    text: 'Specifies how to obtain the Media Initialization Section required to parse the applicable Media Segments.',
                    isoRef: 'RFC 8216, Section 4.3.2.5',
                },
                'EXT-X-MAP@URI': {
                    text: 'The URI that identifies a resource containing the Media Initialization Section.',
                    isoRef: 'RFC 8216, Section 4.3.2.5',
                },
                'EXT-X-MAP@BYTERANGE': {
                    text: 'A byte range into the resource identified by the URI.',
                    isoRef: 'RFC 8216, Section 4.3.2.5',
                },
                'EXT-X-PROGRAM-DATE-TIME': {
                    text: 'Associates the first sample of a Media Segment with an absolute date and/or time.',
                    isoRef: 'RFC 8216, Section 4.3.2.6',
                },
                'EXT-X-DATERANGE': {
                    text: 'Associates a Date Range with a set of attribute/value pairs, often for carrying SCTE-35 ad signaling.',
                    isoRef: 'RFC 8216, Section 4.3.2.7',
                },
                'EXT-X-PART': {
                    text: 'Identifies a Partial Segment (a portion of a Media Segment). Used for low-latency streaming.',
                    isoRef: 'RFC 8216bis, Section 4.4.4.9',
                },
                'EXT-X-PART@URI': {
                    text: 'The URI for the Partial Segment resource. This attribute is REQUIRED.',
                    isoRef: 'RFC 8216bis, Section 4.4.4.9',
                },
                'EXT-X-PART@DURATION': {
                    text: 'The duration of the Partial Segment in seconds. This attribute is REQUIRED.',
                    isoRef: 'RFC 8216bis, Section 4.4.4.9',
                },
                'EXT-X-PART@INDEPENDENT': {
                    text: 'A value of YES indicates that the Partial Segment contains an I-frame or other independent frame.',
                    isoRef: 'RFC 8216bis, Section 4.4.4.9',
                },
                'EXT-X-TARGETDURATION': {
                    text: 'Specifies the maximum Media Segment duration in seconds. This tag is REQUIRED for all Media Playlists.',
                    isoRef: 'RFC 8216, Section 4.3.3.1',
                },
                'EXT-X-MEDIA-SEQUENCE': {
                    text: 'Indicates the Media Sequence Number of the first Media Segment that appears in a Playlist file.',
                    isoRef: 'RFC 8216, Section 4.3.3.2',
                },
                'EXT-X-DISCONTINUITY-SEQUENCE': {
                    text: 'Allows synchronization between different Renditions of the same Variant Stream.',
                    isoRef: 'RFC 8216, Section 4.3.3.3',
                },
                'EXT-X-ENDLIST': {
                    text: 'Indicates that no more Media Segments will be added to the Media Playlist file.',
                    isoRef: 'RFC 8216, Section 4.3.3.4',
                },
                'EXT-X-PLAYLIST-TYPE': {
                    text: 'Provides mutability information about the Media Playlist file. Can be EVENT or VOD.',
                    isoRef: 'RFC 8216, Section 4.3.3.5',
                },
                'EXT-X-I-FRAMES-ONLY': {
                    text: 'Indicates that each Media Segment in the Playlist describes a single I-frame.',
                    isoRef: 'RFC 8216, Section 4.3.3.6',
                },
                'EXT-X-PART-INF': {
                    text: 'Provides information about the Partial Segments in the Playlist. Required if the Playlist contains any EXT-X-PART tags.',
                    isoRef: 'RFC 8216bis, Section 4.4.3.7',
                },
                'EXT-X-PART-INF@PART-TARGET': {
                    text: 'The Part Target Duration, indicating the target duration of Partial Segments in seconds.',
                    isoRef: 'RFC 8216bis, Section 4.4.3.7',
                },
                'EXT-X-SERVER-CONTROL': {
                    text: 'Allows the Server to indicate support for Delivery Directives such as Blocking Playlist Reload and Playlist Delta Updates for low-latency streaming.',
                    isoRef: 'RFC 8216bis, Section 4.4.3.8',
                },
                'EXT-X-SERVER-CONTROL@CAN-BLOCK-RELOAD': {
                    text: 'A YES value indicates the server supports Blocking Playlist Reload, allowing clients to wait for updates instead of polling.',
                    isoRef: 'RFC 8216bis, Section 4.4.3.8',
                },
                'EXT-X-SERVER-CONTROL@PART-HOLD-BACK': {
                    text: 'The server-recommended minimum distance from the end of the Playlist at which clients should begin to play in Low-Latency Mode.',
                    isoRef: 'RFC 8216bis, Section 4.4.3.8',
                },
                'EXT-X-PRELOAD-HINT': {
                    text: 'Allows a server to suggest that a client preload a resource, such as the next Partial Segment or a Media Initialization Section.',
                    isoRef: 'RFC 8216bis, Section 4.4.5.3',
                },
                'EXT-X-PRELOAD-HINT@TYPE': {
                    text: 'Specifies the type of the hinted resource. Valid values are PART and MAP.',
                    isoRef: 'RFC 8216bis, Section 4.4.5.3',
                },
                'EXT-X-PRELOAD-HINT@URI': {
                    text: 'The URI of the resource to be preloaded. This attribute is REQUIRED.',
                    isoRef: 'RFC 8216bis, Section 4.4.5.3',
                },
                'EXT-X-RENDITION-REPORT': {
                    text: 'Carries information about an associated Rendition that is as up-to-date as the Playlist that contains it.',
                    isoRef: 'RFC 8216bis, Section 4.4.5.4',
                },
                'EXT-X-RENDITION-REPORT@URI': {
                    text: 'The URI for the Media Playlist of the specified Rendition. This attribute is REQUIRED.',
                    isoRef: 'RFC 8216bis, Section 4.4.5.4',
                },
                'EXT-X-MEDIA': {
                    text: 'Used to relate Media Playlists that contain alternative Renditions (e.g., audio, video, subtitles) of the same content.',
                    isoRef: 'RFC 8216, Section 4.3.4.1',
                },
                'EXT-X-MEDIA@TYPE': {
                    text: 'The type of the rendition. Valid strings are AUDIO, VIDEO, SUBTITLES, and CLOSED-CAPTIONS.',
                    isoRef: 'RFC 8216, Section 4.3.4.1',
                },
                'EXT-X-MEDIA@URI': {
                    text: 'A URI that identifies the Media Playlist file of the rendition.',
                    isoRef: 'RFC 8216, Section 4.3.4.1',
                },
                'EXT-X-MEDIA@GROUP-ID': {
                    text: 'A string that specifies the group to which the Rendition belongs.',
                    isoRef: 'RFC 8216, Section 4.3.4.1',
                },
                'EXT-X-MEDIA@LANGUAGE': {
                    text: 'Identifies the primary language used in the Rendition.',
                    isoRef: 'RFC 8216, Section 4.3.4.1',
                },
                'EXT-X-MEDIA@NAME': {
                    text: 'A human-readable description of the Rendition.',
                    isoRef: 'RFC 8216, Section 4.3.4.1',
                },
                'EXT-X-MEDIA@DEFAULT': {
                    text: 'If YES, the client SHOULD play this Rendition in the absence of other choices.',
                    isoRef: 'RFC 8216, Section 4.3.4.1',
                },
                'EXT-X-MEDIA@AUTOSELECT': {
                    text: 'If YES, the client MAY choose this Rendition due to matching the current playback environment.',
                    isoRef: 'RFC 8216, Section 4.3.4.1',
                },
                'EXT-X-MEDIA@CHANNELS': {
                    text: 'Specifies the number of independent audio channels.',
                    isoRef: 'RFC 8216, Section 4.3.4.1',
                },
                'EXT-X-STREAM-INF': {
                    text: 'Specifies a Variant Stream. The URI of the Media Playlist follows on the next line.',
                    isoRef: 'RFC 8216, Section 4.3.4.2',
                },
                'EXT-X-STREAM-INF@BANDWIDTH': {
                    text: 'The peak segment bit rate of the Variant Stream in bits per second.',
                    isoRef: 'RFC 8216, Section 4.3.4.2',
                },
                'EXT-X-STREAM-INF@AVERAGE-BANDWIDTH': {
                    text: 'The average segment bit rate of the Variant Stream in bits per second.',
                    isoRef: 'RFC 8216, Section 4.3.4.2',
                },
                'EXT-X-STREAM-INF@CODECS': {
                    text: 'A comma-separated list of formats specifying media sample types present in the Variant Stream.',
                    isoRef: 'RFC 8216, Section 4.3.4.2',
                },
                'EXT-X-STREAM-INF@RESOLUTION': {
                    text: 'The optimal pixel resolution at which to display all video in the Variant Stream.',
                    isoRef: 'RFC 8216, Section 4.3.4.2',
                },
                'EXT-X-STREAM-INF@FRAME-RATE': {
                    text: 'The maximum frame rate for all video in the Variant Stream.',
                    isoRef: 'RFC 8216, Section 4.3.4.2',
                },
                'EXT-X-STREAM-INF@AUDIO': {
                    text: 'The GROUP-ID of the audio renditions that should be used with this variant.',
                    isoRef: 'RFC 8216, Section 4.3.4.2',
                },
                'EXT-X-STREAM-INF@VIDEO': {
                    text: 'The GROUP-ID of the video renditions that should be used with this variant.',
                    isoRef: 'RFC 8216, Section 4.3.4.2',
                },
                'EXT-X-STREAM-INF@SUBTITLES': {
                    text: 'The GROUP-ID of the subtitle renditions that can be used with this variant.',
                    isoRef: 'RFC 8216, Section 4.3.4.2',
                },
                'EXT-X-STREAM-INF@CLOSED-CAPTIONS': {
                    text: 'The GROUP-ID of the closed-caption renditions that can be used. If the value is NONE, all other Variant Streams must also have this attribute with a value of NONE.',
                    isoRef: 'RFC 8216, Section 4.3.4.2',
                },
                'EXT-X-STREAM-INF@PROGRAM-ID': {
                    text: 'A deprecated attribute that uniquely identified a program within the scope of the Playlist. Removed in protocol version 6.',
                    isoRef: 'RFC 8216, Section 7',
                },
                'EXT-X-I-FRAME-STREAM-INF': {
                    text: 'Identifies a Media Playlist file containing the I-frames of a multimedia presentation, for use in trick-play modes.',
                    isoRef: 'RFC 8216, Section 4.3.4.3',
                },
                'EXT-X-SESSION-DATA': {
                    text: 'Allows arbitrary session data to be carried in a Master Playlist.',
                    isoRef: 'RFC 8216, Section 4.3.4.4',
                },
                'EXT-X-SESSION-KEY': {
                    text: 'Allows encryption keys from Media Playlists to be specified in a Master Playlist, enabling key preloading.',
                    isoRef: 'RFC 8216, Section 4.3.4.5',
                },
                'EXT-X-INDEPENDENT-SEGMENTS': {
                    text: 'Indicates that all media samples in a Media Segment can be decoded without information from other segments.',
                    isoRef: 'RFC 8216, Section 4.3.5.1',
                },
                'EXT-X-START': {
                    text: 'Indicates a preferred point at which to start playing a Playlist.',
                    isoRef: 'RFC 8216, Section 4.3.5.2',
                },
                'EXT-X-START@TIME-OFFSET': {
                    text: 'A time offset in seconds from the beginning of the Playlist (positive) or from the end (negative).',
                    isoRef: 'RFC 8216, Section 4.3.5.2',
                },
                'EXT-X-START@PRECISE': {
                    text: 'Whether clients should start playback precisely at the TIME-OFFSET (YES) or at the beginning of the segment (NO).',
                    isoRef: 'RFC 8216, Section 4.3.5.2',
                },
            };
        });
    var ye,
        Mi,
        Rd,
        Md,
        ee,
        Nf,
        Of,
        Xf,
        Ld,
        Li,
        Bd = f(() => {
            L();
            re();
            kd();
            le();
            K();
            ((ye = 1),
                (Mi = 500),
                (Rd = null),
                (Md = (t, i, e) => {
                    let n = ye + t;
                    if (n >= 1 && n <= e) {
                        ye = n;
                        let o = document.getElementById(
                            'tab-interactive-manifest'
                        );
                        P(Li(i), o);
                    }
                }),
                (ee = (t) =>
                    t
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')),
                (Nf = (t) => {
                    if (!t || t.size === 0) return '';
                    let i = Array.from(t.entries());
                    return d`
        <div class="mb-4">
            <h4 class="text-md font-bold mb-2">Defined Variables</h4>
            <div
                class="bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden"
            >
                <table class="w-full text-left text-xs">
                    <thead class="bg-gray-900">
                        <tr>
                            <th class="p-2 font-semibold text-gray-300">
                                Variable Name
                            </th>
                            <th class="p-2 font-semibold text-gray-300">
                                Source
                            </th>
                            <th class="p-2 font-semibold text-gray-300">
                                Resolved Value
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-700">
                        ${i.map(
                            ([e, { value: n, source: o }]) => d`
                                <tr>
                                    <td class="p-2 font-mono text-cyan-400">
                                        ${e}
                                    </td>
                                    <td class="p-2 font-mono text-gray-400">
                                        ${o}
                                    </td>
                                    <td class="p-2 font-mono text-yellow-300">
                                        ${n}
                                    </td>
                                </tr>
                            `
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    `;
                }),
                (Of = (t) => {
                    let i = t.mediaPlaylists.get('master');
                    if (!i || !i.manifest.isMaster) return d``;
                    let e = i.manifest.summary.videoTracks.map((a, s) => ({
                            attributes: {
                                BANDWIDTH: parseFloat(a.bitrateRange) * 1e3,
                            },
                            resolvedUri:
                                t.manifest.rawElement?.variants[s]?.resolvedUri,
                        })),
                        n = (a) => {
                            let s = a.target.closest('button');
                            if (!s) return;
                            let r = s.dataset.url;
                            y.dispatch('hls:media-playlist-activate', {
                                streamId: t.id,
                                url: r,
                            });
                        },
                        o = (a, s, r) => d`
        <button
            class="px-3 py-1.5 text-sm rounded-md transition-colors ${r ? 'bg-blue-600 text-white font-semibold' : 'bg-gray-900 hover:bg-gray-700'}"
            data-url="${s}"
        >
            ${a}
        </button>
    `;
                    return d`
        <div
            class="mb-4 p-2 bg-gray-900/50 rounded-lg flex flex-wrap gap-2"
            @click=${n}
        >
            ${o('Master Playlist', 'master', !t.activeMediaPlaylistUrl)}
            ${t.manifest.summary.videoTracks.map((a, s) => o(`Variant ${s + 1} (${a.bitrateRange})`, t.mediaPlaylists.get('master')?.manifest.rawElement?.variants[s]?.resolvedUri, t.activeMediaPlaylistUrl === t.mediaPlaylists.get('master')?.manifest.rawElement?.variants[s]?.resolvedUri))}
        </div>
    `;
                }),
                (Xf = (t) => {
                    if (((t = t.trim()), !t.startsWith('#EXT')))
                        return `<span class="${t.startsWith('#') ? 'text-gray-500 italic' : 'text-cyan-400'}">${ee(t)}</span>`;
                    let i = 'text-purple-300',
                        e = 'text-emerald-300',
                        n = 'text-yellow-300',
                        o = `rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700 ${F}`,
                        a = t.indexOf(':');
                    if (a === -1) {
                        let g = t.substring(1),
                            x = $e[g],
                            m = x
                                ? `data-tooltip="${ee(x.text)}" data-iso="${ee(x.isoRef)}"`
                                : '';
                        return `#<span class="${i} ${x ? o : ''}" ${m}>${g}</span>`;
                    }
                    let s = t.substring(1, a),
                        r = t.substring(a + 1),
                        l = $e[s],
                        c = l
                            ? `data-tooltip="${ee(l.text)}" data-iso="${ee(l.isoRef)}"`
                            : '',
                        p = '';
                    return (
                        r.includes('=')
                            ? (p = (r.match(/("[^"]*")|[^,]+/g) || [])
                                  .map((x) => {
                                      let m = x.indexOf('=');
                                      if (m === -1) return ee(x);
                                      let _ = x.substring(0, m),
                                          b = x.substring(m + 1),
                                          C = `${s}@${_}`,
                                          A = $e[C],
                                          I = '',
                                          $ = '';
                                      return (
                                          A
                                              ? ((I = o),
                                                ($ = `data-tooltip="${ee(A.text)}" data-iso="${ee(A.isoRef)}"`))
                                              : ((I =
                                                    'cursor-help bg-red-900/50 missing-tooltip-trigger'),
                                                ($ = `data-tooltip="Tooltip definition missing for '${_}' on tag #${s}"`)),
                                          `<span class="${e} ${I}" ${$}>${ee(_)}</span>=<span class="${n}">${ee(b)}</span>`
                                      );
                                  })
                                  .join('<span class="text-gray-400">,</span>'))
                            : (p = `<span class="${n}">${ee(r)}</span>`),
                        `#<span class="${i} ${l ? o : ''}" ${c}>${s}</span>:<span class="font-normal">${p}</span>`
                    );
                }),
                (Ld = (t) => {
                    let i = $e[t.name] || {};
                    return d`
        <div class="flex">
            <span
                class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-10"
                >&nbsp;</span
            >
            <span
                class="flex-grow whitespace-pre-wrap break-all bg-gray-900/50 p-2 rounded border-l-2 border-cyan-500"
            >
                <div
                    class="font-semibold text-cyan-300 mb-1 ${F}"
                    data-tooltip="${i.text}"
                    data-iso="${i.isoRef}"
                >
                    ${t.name}
                </div>
                <dl class="grid grid-cols-[auto_1fr] gap-x-4 text-xs">
                    ${Object.entries(t.value).map(([e, n]) => {
                        let o = $e[`${t.name}@${e}`] || {};
                        return d`
                            <dt
                                class="text-gray-400 ${F}"
                                data-tooltip="${o.text}"
                                data-iso="${o.ref}"
                            >
                                ${e}
                            </dt>
                            <dd class="text-gray-200 font-mono">${n}</dd>
                        `;
                    })}
                </dl>
            </span>
        </div>
    `;
                }),
                (Li = (t) => {
                    let i = t.activeManifestForView || t.manifest,
                        e = t.activeMediaPlaylistUrl
                            ? t.mediaPlaylists.get(t.activeMediaPlaylistUrl)
                                  ?.rawManifest
                            : t.rawManifest;
                    e !== Rd && ((ye = 1), (Rd = e));
                    let { renditionReports: n, preloadHints: o } = i,
                        a = e ? e.split(/\r?\n/) : [],
                        s = [
                            'EXT-X-PRELOAD-HINT',
                            'EXT-X-RENDITION-REPORT',
                            'EXT-X-DEFINE',
                        ],
                        r = a
                            .map((m) => {
                                let _ = m.trim();
                                return s.some((b) => _.startsWith(`#${b}`))
                                    ? null
                                    : (b) => d`
                <div class="flex">
                    <span
                        class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-10"
                        >${b}</span
                    >
                    <span class="flex-grow whitespace-pre-wrap break-all"
                        >${V(Xf(m))}</span
                    >
                </div>
            `;
                            })
                            .filter(Boolean);
                    ((n || []).forEach((m) =>
                        r.push(() =>
                            Ld({ name: 'EXT-X-RENDITION-REPORT', value: m })
                        )
                    ),
                        (o || []).forEach((m) =>
                            r.push(() =>
                                Ld({ name: 'EXT-X-PRELOAD-HINT', value: m })
                            )
                        ));
                    let l = Math.ceil(r.length / Mi),
                        c = (ye - 1) * Mi,
                        p = c + Mi,
                        g = r.slice(c, p),
                        x =
                            l > 1
                                ? d` <div class="text-center text-sm text-gray-400 mt-4">
                  <button
                      @click=${() => Md(-1, t, l)}
                      ?disabled=${ye === 1}
                      class="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-2"
                  >
                      &larr; Previous
                  </button>
                  <span
                      >Page ${ye} of ${l} (Lines
                      ${c + 1}-${Math.min(p, r.length)})</span
                  >
                  <button
                      @click=${() => Md(1, t, l)}
                      ?disabled=${ye === l}
                      class="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-2"
                  >
                      Next &rarr;
                  </button>
              </div>`
                                : '';
                    return d`
        ${Of(t)}
        ${Nf(t.hlsDefinedVariables)}
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            ${g.map((m, _) => m(c + _ + 1))}
        </div>
        ${x}
    `;
                }));
        });
    function Hd(t) {
        return !t || !t.manifest
            ? d`<p class="warn">No Manifest loaded to display.</p>`
            : t.protocol === 'hls'
              ? Li(t)
              : Ri(t);
    }
    var zd = f(() => {
        L();
        Ud();
        Bd();
    });
    function jf(t) {
        let i = t.target,
            e = i.value;
        if (i.checked) {
            if (S.getState().segmentsForCompare.length >= 2) {
                i.checked = !1;
                return;
            }
            G.addSegmentToCompare(e);
        } else G.removeSegmentFromCompare(e);
    }
    var Gf,
        Wf,
        qf,
        Tt,
        Bi = f(() => {
            L();
            j();
            K();
            ((Gf = (t) => {
                if (!t)
                    return d`<div
            class="flex-shrink-0 w-2.5 h-2.5 rounded-sm border border-gray-500 bg-gray-800"
            title="Status: Not Loaded"
        ></div>`;
                if (t.status === -1)
                    return d`<div
            class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-gray-500 animate-pulse"
            title="Status: Pending"
        ></div>`;
                if (t.status !== 200) {
                    let i =
                        t.status === 0 ? 'Network Error' : `HTTP ${t.status}`;
                    return d`<div
            class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-red-500"
            title="Status: ${i}"
        ></div>`;
                }
                return d`<div
        class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-green-500"
        title="Status: Loaded OK"
    ></div>`;
            }),
                (Wf = (t) =>
                    t === null
                        ? ''
                        : t
                          ? d`<div
            class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-cyan-400"
            title="Fresh: Segment is in the latest playlist"
        ></div>`
                          : d`<div
        class="flex-shrink-0 w-2.5 h-2.5 rounded-sm bg-gray-600"
        title="Stale: Segment is no longer in the latest playlist"
    ></div>`),
                (qf = (t, i, e) => {
                    if (i.gap)
                        return d`<span class="text-xs text-gray-500 italic font-semibold"
            >GAP Segment</span
        >`;
                    let n = (s) => {
                            let r = s.currentTarget.dataset.url;
                            y.dispatch('ui:request-segment-analysis', {
                                url: r,
                            });
                        },
                        o = (s) => {
                            let r = s.currentTarget.dataset.url;
                            (G.setActiveSegmentUrl(r),
                                document
                                    .querySelector(
                                        '[data-tab="interactive-segment"]'
                                    )
                                    ?.click());
                        },
                        a = () => {
                            y.dispatch('segment:fetch', { url: i.resolvedUrl });
                        };
                    return t
                        ? t.status === -1
                            ? d`<button
            disabled
            class="text-xs bg-gray-600 px-2 py-1 rounded opacity-50 cursor-wait"
        >
            Loading...
        </button>`
                            : t.status !== 200
                              ? e !== !1
                                  ? d`<button
                  @click=${a}
                  class="text-xs bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded"
              >
                  Reload
              </button>`
                                  : d`<span class="text-xs text-gray-500 italic"
                  >Stale Error</span
              >`
                              : d`
        <button
            class="text-xs bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded"
            data-url="${i.resolvedUrl}"
            @click=${o}
        >
            View Raw
        </button>
        <button
            class="text-xs bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded"
            data-url="${i.resolvedUrl}"
            @click=${n}
        >
            Analyze
        </button>
    `
                        : d`<button
            @click=${a}
            class="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
        >
            Load
        </button>`;
                }),
                (Tt = (t, i, e) => {
                    let { segmentCache: n, segmentsForCompare: o } =
                            S.getState(),
                        a = n.get(t.resolvedUrl),
                        s = o.includes(t.resolvedUrl),
                        r = 'hover:bg-gray-800/80';
                    if (t.gap) r = 'bg-gray-800/50 text-gray-600 italic';
                    else
                        switch (e) {
                            case 'live':
                                r = 'bg-blue-900/40 hover:bg-blue-900/60';
                                break;
                            case 'stale':
                                r =
                                    'bg-red-900/30 hover:bg-red-900/50 text-gray-500';
                                break;
                        }
                    let l =
                        t.type === 'Media' && !t.gap
                            ? d`${(t.time / t.timescale).toFixed(2)}s
              (+${(t.duration / t.timescale).toFixed(2)}s)`
                            : 'N/A';
                    return d`
        <tr class="segment-row ${r}" data-url="${t.resolvedUrl}">
            <td class="px-3 py-1.5">
                <input
                    type="checkbox"
                    class="bg-gray-700 border-gray-500 rounded focus:ring-blue-500 disabled:opacity-50"
                    .value=${t.resolvedUrl}
                    ?checked=${s}
                    ?disabled=${t.gap}
                    @change=${jf}
                />
            </td>
            <td class="px-3 py-1.5">
                <div class="flex items-center space-x-2">
                    ${t.gap ? '' : Gf(a)}
                    ${Wf(i)}
                    <div>
                        <span>${t.type === 'Init' ? 'Init' : 'Media'}</span
                        ><span class="block text-xs text-gray-500"
                            >#${t.number}</span
                        >
                    </div>
                </div>
            </td>
            <td class="px-3 py-1.5">
                <span class="text-xs font-mono">${l}</span>
            </td>
            <td class="px-3 py-1.5">
                <div class="flex justify-between items-center">
                    <span
                        class="font-mono ${t.gap ? '' : 'text-cyan-400'} truncate"
                        title="${t.resolvedUrl}"
                        >${t.template || 'GAP'}</span
                    >
                    <div class="flex items-center space-x-2 flex-shrink-0 ml-4">
                        ${qf(a, t, i)}
                    </div>
                </div>
            </td>
        </tr>
    `;
                }));
        });
    function Fd(t, i) {
        let e = Array.from(t.dashRepresentationState.entries());
        return e.length === 0
            ? d`<p class="text-gray-400">
            No representations with segments found.
        </p>`
            : d`<div class="space-y-4">
        ${e.map(([n, o]) => Kf(t, n, o, i))}
    </div>`;
    }
    var Yf,
        Kf,
        Vd = f(() => {
            L();
            Bi();
            ((Yf = (t, i, e) => {
                if (!e) return 'stale';
                let n = t.manifest;
                if (n.type !== 'dynamic') return 'default';
                let o = Date.now(),
                    a = n.availabilityStartTime?.getTime();
                if (!a) return 'default';
                let s = (o - a) / 1e3,
                    r = i.time / i.timescale,
                    l = (i.time + i.duration) / i.timescale;
                return s >= r && s < l ? 'live' : 'default';
            }),
                (Kf = (t, i, e, n) => {
                    let { segments: o, freshSegmentUrls: a } = e,
                        s = 10,
                        r = n === 'first' ? o.slice(0, s) : o.slice(-s),
                        l =
                            t.manifest.periods[0]?.adaptationSets
                                .flatMap((c) => c.representations)
                                .find((c) => c.id === i)?.bandwidth || 0;
                    return d`<div class="bg-gray-800 rounded-lg border border-gray-700">
        <div
            class="flex items-center p-2 bg-gray-900/50 border-b border-gray-700"
        >
            <div class="flex-grow flex items-center">
                <span class="font-semibold text-gray-200"
                    >Representation: ${i}</span
                >
                <span class="ml-3 text-xs text-gray-400 font-mono"
                    >(${(l / 1e3).toFixed(0)} kbps)</span
                >
            </div>
        </div>
        <div class="overflow-y-auto max-h-[70vh]">
            <table class="w-full text-left text-sm table-auto">
                <thead class="sticky top-0 bg-gray-900 z-10">
                    <tr>
                        <th class="px-3 py-2 w-8"></th>
                        <th class="px-3 py-2 w-[25%]">Status / Type</th>
                        <th class="px-3 py-2 w-[20%]">Timing (s)</th>
                        <th class="px-3 py-2 w-[55%]">URL & Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${r.map((c) => {
                        let p = a.has(c.resolvedUrl);
                        return Tt(c, p, Yf(t, c, p));
                    })}
                </tbody>
            </table>
        </div>
    </div>`;
                }));
        });
    function Od(t) {
        (Pe(), t && (Ct = setInterval(t, 1e3)));
    }
    function Pe() {
        Ct && (clearInterval(Ct), (Ct = null));
    }
    function Jf(t, i, e) {
        if (!t || t.manifest.type !== 'dynamic' || !e) return 'default';
        if (!e.freshSegmentUrls.has(i.resolvedUrl)) return 'stale';
        let n = e.segments,
            o = Math.min(3, Math.floor(n.length / 2)),
            a = n.length - o,
            s = n.findIndex((r) => r.resolvedUrl === i.resolvedUrl);
        return s !== -1 && s >= a ? 'live' : 'default';
    }
    function Xd(t) {
        if (t.manifest.isMaster) {
            let i = (t.manifest.variants || []).map((e, n) => ({
                ...e,
                title: `Variant Stream ${n + 1} (BW: ${(e.attributes.BANDWIDTH / 1e3).toFixed(0)}k)`,
            }));
            return d`<div class="space-y-1">
            ${i.map((e) => Nd(t, e, e.resolvedUri))}
        </div>`;
        } else {
            let i = {
                title: 'Media Playlist Segments',
                uri: null,
                resolvedUri: t.originalUrl,
            };
            return Nd(t, i, i.resolvedUri);
        }
    }
    var Ct,
        Qf,
        Nd,
        Hi = f(() => {
            L();
            Bi();
            K();
            Ct = null;
            ((Qf = (t, i) => {
                if (t.manifest.type !== 'dynamic' || i.length === 0) return '';
                let e = i.reduce((r, l) => r + l.duration / l.timescale, 0);
                if (e <= 0) return '';
                let n = e,
                    o = t.manifest.summary.lowLatency?.partHoldBack,
                    a,
                    s;
                return (
                    o != null
                        ? ((a = (o / e) * 100),
                          (s = `Live Edge (Target: ${o.toFixed(2)}s behind edge)`))
                        : ((a = 0), (s = 'Live Edge')),
                    d`<div
        class="absolute top-0 bottom-0 right-0 w-0.5 bg-red-500 rounded-full z-20"
        style="right: ${a}%;"
        title="${s}"
    >
        <div
            class="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-red-500 animate-ping"
        ></div>
    </div>`
                );
            }),
                (Nd = (t, i, e) => {
                    let n = t.hlsVariantState.get(e);
                    if (!n) return d``;
                    let {
                            segments: o,
                            error: a,
                            isLoading: s,
                            isExpanded: r,
                            displayMode: l,
                            isPolling: c,
                            freshSegmentUrls: p,
                        } = n,
                        g = 9e4,
                        x = 0,
                        m = t.manifest?.mediaSequence || 0,
                        _ = (Array.isArray(o) ? o : []).map((w, M) => {
                            let U = {
                                repId: 'hls-media',
                                type: w.type || 'Media',
                                number: m + M,
                                resolvedUrl: w.resolvedUrl,
                                template: w.uri,
                                time: Math.round(x * g),
                                duration: Math.round(w.duration * g),
                                timescale: g,
                                gap: w.gap || !1,
                            };
                            return ((x += w.duration), U);
                        }),
                        b = l === 'last10' ? _.slice(-10) : _,
                        C = () =>
                            y.dispatch('hls-explorer:toggle-variant', {
                                streamId: t.id,
                                variantUri: e,
                            }),
                        A = (w) => {
                            (w.stopPropagation(),
                                y.dispatch('hls-explorer:toggle-polling', {
                                    streamId: t.id,
                                    variantUri: e,
                                }));
                        },
                        I = (w) => {
                            (w.stopPropagation(),
                                y.dispatch('hls-explorer:set-display-mode', {
                                    streamId: t.id,
                                    variantUri: e,
                                    mode: l === 'all' ? 'last10' : 'all',
                                }));
                        },
                        $;
                    return (
                        s
                            ? ($ = d`<div class="p-4 text-center text-gray-400">
            Loading segments...
        </div>`)
                            : a
                              ? ($ = d`<div class="p-4 text-red-400">Error: ${a}</div>`)
                              : _.length === 0
                                ? ($ = d`<div class="p-4 text-center text-gray-400">
            No segments found in this playlist.
        </div>`)
                                : ($ = d` <div
            class="overflow-y-auto relative max-h-[70vh]"
        >
            ${Qf(t, b)}
            <table class="w-full text-left text-sm table-auto">
                <thead class="sticky top-0 bg-gray-900 z-10">
                    <tr>
                        <th class="px-3 py-2 w-8"></th>
                        <th class="px-3 py-2 w-[25%]">Status / Type</th>
                        <th class="px-3 py-2 w-[20%]">Timing (s)</th>
                        <th class="px-3 py-2 w-[55%]">URL & Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${b.map((w) => Tt(w, p.has(w.resolvedUrl), Jf(t, w, n)))}
                </tbody>
            </table>
        </div>`),
                        d`
        <details
            class="bg-gray-800 rounded-lg border border-gray-700"
            ?open=${r}
        >
            <summary
                @click=${(w) => {
                    (w.preventDefault(), C());
                }}
                class="flex items-center p-2 bg-gray-900/50 cursor-pointer"
            >
                <div class="flex-grow font-semibold text-gray-200">
                    ${i.title}
                </div>
            </summary>
            ${
                r
                    ? d`
                      <div class="p-2 border-t border-gray-700">
                          <div class="flex items-center gap-4 p-2">
                              ${
                                  t.manifest.type === 'dynamic'
                                      ? d`
                                        <button
                                            @click=${A}
                                            class="text-xs px-3 py-1 rounded ${c ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}"
                                        >
                                            ${c ? 'Stop Polling' : 'Start Polling'}
                                        </button>
                                    `
                                      : ''
                              }
                              <button
                                  @click=${I}
                                  class="text-xs px-3 py-1 rounded bg-gray-600 hover:bg-gray-700"
                              >
                                  Show
                                  ${l === 'all' ? 'Last 10' : 'All'}
                              </button>
                          </div>
                          ${$}
                      </div>
                  `
                    : ''
            }
        </details>
    `
                    );
                }));
        });
    function Zf() {
        let { segmentsForCompare: t } = S.getState();
        t.length === 2 &&
            y.dispatch('ui:request-segment-comparison', {
                urlA: t[0],
                urlB: t[1],
            });
    }
    function jd(t) {
        if (It === t) return;
        It = t;
        let i = S.getState().streams.find((e) => e.id === _e);
        i && Z && Je(Z, i);
    }
    function Ke(t) {
        let i = t.manifest?.type === 'dynamic',
            e = d`
        <div
            id="segment-explorer-controls"
            class="flex items-center flex-wrap gap-4"
        >
            ${
                t.protocol === 'dash'
                    ? d`
                      <button
                          @click=${() => jd('first')}
                          class="text-sm bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-3 rounded-md transition-colors"
                      >
                          First 10
                      </button>
                      ${
                          i
                              ? d`<button
                                @click=${() => jd('last')}
                                class="text-sm bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-3 rounded-md transition-colors"
                            >
                                Last 10
                            </button>`
                              : ''
                      }
                  `
                    : ''
            }
            <button
                id="segment-compare-btn"
                @click=${Zf}
                class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled
            >
                Compare Selected (0/2)
            </button>
        </div>
    `,
            n;
        return (
            t.protocol === 'dash' ? (n = Fd(t, It)) : (n = Xd(t)),
            d`
        <div class="flex flex-wrap justify-between items-center mb-4 gap-4">
            <h3 class="text-xl font-bold">Segment Explorer</h3>
            ${e}
        </div>
        <div
            id="segment-explorer-content"
            data-testid="segment-explorer-content"
        >
            ${n}
        </div>
    `
        );
    }
    function Je(t, i) {
        ((Z = t),
            (_e = i.id),
            Pe(),
            i.protocol === 'hls' &&
                i.manifest.type === 'dynamic' &&
                Od(() => {
                    let n = S.getState().streams.find((o) => o.id === _e);
                    n && t.offsetParent !== null && P(Ke(n), t);
                }),
            P(Ke(i), t));
    }
    var Z,
        _e,
        It,
        zi = f(() => {
            L();
            j();
            K();
            Vd();
            Hi();
            ((Z = null), (_e = null), (It = 'first'));
            y.subscribe('state:compare-list-changed', ({ count: t }) => {
                let i = document.getElementById('segment-compare-btn');
                i &&
                    ((i.textContent = `Compare Selected (${t}/2)`),
                    i.toggleAttribute('disabled', t !== 2));
            });
            y.subscribe('analysis:started', () => {
                ((_e = null), (Z = null), (It = 'first'), Pe());
            });
            y.subscribe('stream:data-updated', ({ streamId: t }) => {
                if (t === _e && Z && Z.offsetParent !== null) {
                    let i = S.getState().streams.find((e) => e.id === t);
                    i && P(Ke(i), Z);
                }
            });
            y.subscribe('state:stream-variant-changed', ({ streamId: t }) => {
                if (t === _e && Z && Z.offsetParent !== null) {
                    let i = S.getState().streams.find((e) => e.id === t);
                    i && P(Ke(i), Z);
                }
            });
            y.subscribe('segment:loaded', () => {
                if (Z && Z.offsetParent !== null) {
                    let t = S.getState().streams.find((i) => i.id === _e);
                    t && P(Ke(t), Z);
                }
            });
        });
    function Gd(t) {
        let i = [
            {
                label: 'Type',
                tooltip: 'static (VOD) vs dynamic (live)',
                isoRef: 'DASH: 5.3.1.2 / HLS: 4.3.3.5',
                values: t.map((n) =>
                    Et(
                        n.manifest?.summary.general.streamType.startsWith(
                            'Live'
                        )
                            ? 'dynamic'
                            : 'static'
                    )
                ),
            },
            {
                label: 'Profiles / Version',
                tooltip: 'Declared feature sets or HLS version.',
                isoRef: 'DASH: 8.1 / HLS: 4.3.1.2',
                values: t.map((n) =>
                    Et(
                        n.manifest?.summary.dash?.profiles ||
                            `Version ${n.manifest?.summary.hls?.version}`
                    )
                ),
            },
            {
                label: 'Min Buffer / Target Duration',
                tooltip:
                    'Minimum client buffer time (DASH) or max segment duration (HLS).',
                isoRef: 'DASH: 5.3.1.2 / HLS: 4.3.3.1',
                values: t.map((n) => {
                    let o =
                        n.manifest?.summary.dash?.minBufferTime ??
                        n.manifest?.summary.hls?.targetDuration;
                    return o ? `${o}s` : 'N/A';
                }),
            },
            {
                label: 'Live Window',
                tooltip: 'DVR window for live streams.',
                isoRef: 'DASH: 5.3.1.2',
                values: t.map((n) =>
                    n.manifest?.summary.dash?.timeShiftBufferDepth
                        ? `${n.manifest.summary.dash.timeShiftBufferDepth}s`
                        : 'N/A'
                ),
            },
            {
                label: 'Segment Format',
                tooltip:
                    'The container format used for media segments (e.g., ISOBMFF or MPEG-2 TS).',
                isoRef: 'DASH: 5.3.7 / HLS: 4.3.2.5',
                values: t.map((n) =>
                    Et(n.manifest?.summary.general.segmentFormat)
                ),
            },
            {
                label: '# of Periods',
                tooltip: 'Number of content periods (DASH-specific).',
                isoRef: 'DASH: 5.3.2',
                values: t.map((n) =>
                    n.protocol === 'dash'
                        ? String(n.manifest?.summary.content.periods || 0)
                        : 'N/A'
                ),
            },
            {
                label: 'Content Protection',
                tooltip: 'Detected DRM systems.',
                isoRef: 'DASH: 5.8.4.1 / HLS: 4.3.2.4',
                values: t.map((n) => {
                    let o = n.manifest?.summary.security;
                    return o?.isEncrypted ? o.systems.join(', ') : 'No';
                }),
            },
            {
                label: '# Video Quality Levels',
                tooltip: 'Total number of video tracks or variants.',
                isoRef: 'DASH: 5.3.5 / HLS: 4.3.4.2',
                values: t.map((n) =>
                    String(n.manifest?.summary.content.videoTracks || 0)
                ),
            },
            {
                label: 'Video Bitrate Range',
                tooltip: 'Min and Max bandwidth values for video.',
                isoRef: 'DASH: 5.3.5.2 / HLS: 4.3.4.2',
                values: t.map((n) =>
                    n.manifest?.summary.videoTracks.length > 0
                        ? n.manifest.summary.videoTracks[0].bitrateRange
                        : 'N/A'
                ),
            },
            {
                label: 'Video Resolutions',
                tooltip: 'List of unique video resolutions.',
                isoRef: 'DASH: 5.3.7.2 / HLS: 4.3.4.2',
                values: t.map((n) =>
                    At([
                        ...new Set(
                            n.manifest?.summary.videoTracks.flatMap(
                                (o) => o.resolutions
                            )
                        ),
                    ])
                ),
            },
            {
                label: 'Video Codecs',
                tooltip: 'Unique video codecs found.',
                isoRef: 'DASH: 5.3.7.2 / HLS: 4.3.4.2',
                values: t.map((n) =>
                    At([
                        ...new Set(
                            n.manifest?.summary.videoTracks.flatMap(
                                (o) => o.codecs
                            )
                        ),
                    ])
                ),
            },
            {
                label: '# Audio Tracks',
                tooltip: 'Groups of audio tracks, often by language.',
                isoRef: 'DASH: 5.3.3 / HLS: 4.3.4.1',
                values: t.map((n) =>
                    String(n.manifest?.summary.content.audioTracks || 0)
                ),
            },
            {
                label: 'Audio Languages',
                tooltip: 'Declared languages for audio tracks.',
                isoRef: 'DASH: 5.3.3.2 / HLS: 4.3.4.1',
                values: t.map((n) => {
                    let o = [
                        ...new Set(
                            n.manifest?.summary.audioTracks
                                .map((a) => a.lang)
                                .filter(Boolean)
                        ),
                    ];
                    return o.length > 0 ? o.join(', ') : 'Not Specified';
                }),
            },
            {
                label: 'Audio Codecs',
                tooltip: 'Unique audio codecs.',
                isoRef: 'DASH: 5.3.7.2 / HLS: 4.3.4.2',
                values: t.map((n) =>
                    At([
                        ...new Set(
                            n.manifest?.summary.audioTracks.flatMap(
                                (o) => o.codecs
                            )
                        ),
                    ])
                ),
            },
            {
                label: '# of Text Tracks',
                tooltip: 'Number of subtitle or caption tracks.',
                isoRef: 'DASH: 5.3.3 / HLS: 4.3.4.1',
                values: t.map((n) =>
                    String(n.manifest?.summary.content.textTracks || 0)
                ),
            },
            {
                label: 'Text Languages',
                tooltip: 'Declared languages for subtitle/caption tracks.',
                isoRef: 'DASH: 5.3.3.2 / HLS: 4.3.4.1',
                values: t.map((n) => {
                    let o = [
                        ...new Set(
                            n.manifest?.summary.textTracks
                                .map((a) => a.lang)
                                .filter(Boolean)
                        ),
                    ];
                    return o.length > 0 ? o.join(', ') : 'Not Specified';
                }),
            },
            {
                label: 'Text Formats',
                tooltip: 'MIME types or codecs for text tracks.',
                isoRef: 'DASH: 5.3.7.2',
                values: t.map((n) =>
                    At([
                        ...new Set(
                            n.manifest?.summary.textTracks.flatMap(
                                (o) => o.codecsOrMimeTypes
                            )
                        ),
                    ])
                ),
            },
            {
                label: 'Video Range',
                tooltip: 'Dynamic range of the video content (SDR, PQ, HLG).',
                isoRef: 'HLS 2nd Ed: 4.4.6.2',
                values: t.map((n) =>
                    Et(
                        [
                            ...new Set(
                                n.manifest?.summary.videoTracks
                                    .map((o) => o.videoRange)
                                    .filter(Boolean)
                            ),
                        ].join(', ')
                    )
                ),
            },
        ];
        return ((n) => [
            { title: 'Manifest Properties', points: n.slice(0, 5) },
            { title: 'Content Overview', points: n.slice(5, 7) },
            { title: 'Video Details', points: n.slice(7, 11) },
            { title: 'Audio Details', points: n.slice(11, 14) },
            { title: 'Accessibility & Metadata', points: n.slice(14, 18) },
        ])(i);
    }
    var Et,
        At,
        Wd = f(() => {
            ((Et = (t) => t ?? 'N/A'),
                (At = (t) =>
                    t && t.length > 0
                        ? t.map((i) => `<div>${i}</div>`).join('')
                        : 'N/A'));
        });
    var qd,
        Yd = f(() => {
            L();
            re();
            le();
            qd = (t, i) => {
                let { label: e, tooltip: n, isoRef: o, values: a } = t,
                    s = `grid-template-columns: 200px repeat(${i}, 1fr);`;
                return d`
        <div
            class="grid border-t border-l border-gray-700"
            style="${s}"
        >
            <div
                class="font-medium text-gray-400 p-2 border-r border-gray-700 ${F}"
                data-tooltip="${n}"
                data-iso="${o}"
            >
                ${e}
            </div>
            ${a.map(
                (r) => d`
                    <div
                        class="p-2 font-mono text-xs border-r border-gray-700 break-words"
                    >
                        ${V(r ?? '')}
                    </div>
                `
            )}
        </div>
    `;
            };
        });
    function Kd() {
        let { streams: t } = S.getState();
        if (t.length < 2) return d``;
        let i = Gd(t);
        return d`
        <!-- Main Sticky Header -->
        <div
            class="grid bg-gray-900/50 sticky top-0 z-10"
            style="grid-template-columns: 200px repeat(${t.length}, 1fr);"
        >
            <div
                class="font-semibold text-gray-400 p-2 border-b border-r border-gray-700"
            >
                Property
            </div>
            ${t.map(
                (e) => d`<div
                        class="font-semibold text-gray-300 p-2 border-b border-r border-gray-700 truncate"
                        title="${e.name}"
                    >
                        ${e.name}
                    </div>`
            )}
        </div>

        <!-- Data Sections -->
        ${i.map((e) => ep(e.title, e.points, t))}
    `;
    }
    var ep,
        Jd = f(() => {
            L();
            j();
            Wd();
            Yd();
            ep = (t, i, e) => d`
    <h3 class="text-xl font-bold mt-6 mb-2">${t}</h3>
    <div class="border-b border-gray-700">
        ${i.map((n) => qd(n, e.length))}
    </div>
`;
        });
    var Qd = {};
    Ht(Qd, {
        populateContextSwitcher: () => Fi,
        renderAllTabs: () => Vi,
        renderSingleStreamTabs: () => Dt,
    });
    function Fi() {
        let { streams: t, activeStreamId: i } = S.getState();
        if (t.length > 1) {
            u.contextSwitcherWrapper.classList.remove('hidden');
            let e = t.map(
                (n) => d`<option value="${n.id}">
                    ${n.name} (${n.protocol.toUpperCase()})
                </option>`
            );
            (P(e, u.contextSwitcher), (u.contextSwitcher.value = String(i)));
        } else u.contextSwitcherWrapper.classList.add('hidden');
    }
    function Vi() {
        console.time('Render All Tabs');
        let { streams: t, activeStreamId: i } = S.getState(),
            e = t.length > 1;
        ((document.querySelector('[data-tab="comparison"]').style.display = e
            ? 'flex'
            : 'none'),
            e &&
                (console.time('Render Comparison Tab'),
                P(Kd(), u.tabContents.comparison),
                console.timeEnd('Render Comparison Tab')),
            Dt(i),
            console.timeEnd('Render All Tabs'));
    }
    function Dt(t) {
        let i = S.getState().streams.find((e) => e.id === t);
        i &&
            (console.time('Render Summary Tab'),
            P(jl(i), u.tabContents.summary),
            console.timeEnd('Render Summary Tab'),
            console.time('Render Compliance Tab'),
            P(xt(i), u.tabContents.compliance),
            id(),
            console.timeEnd('Render Compliance Tab'),
            console.time('Render Timeline Tab'),
            md(u.tabContents['timeline-visuals'], i),
            console.timeEnd('Render Timeline Tab'),
            console.time('Render Features Tab'),
            P($i(i), u.tabContents.features),
            console.timeEnd('Render Features Tab'),
            console.time('Render Interactive Manifest Tab'),
            P(Hd(i), u.tabContents['interactive-manifest']),
            console.timeEnd('Render Interactive Manifest Tab'),
            console.time('Render Interactive Segment Tab'),
            P(We(), u.tabContents['interactive-segment']),
            console.timeEnd('Render Interactive Segment Tab'),
            console.time('Render Segment Explorer Tab'),
            Je(u.tabContents.explorer, i),
            console.timeEnd('Render Segment Explorer Tab'),
            console.time('Render Manifest Updates Tab'),
            Ae(t),
            console.timeEnd('Render Manifest Updates Tab'));
    }
    var $t = f(() => {
        L();
        Y();
        j();
        Gl();
        nd();
        ud();
        Pi();
        zd();
        yi();
        zi();
        Jd();
        gt();
    });
    var Tc = sn((Me, Zi) => {
        'use strict';
        Object.defineProperty(Me, '__esModule', { value: !0 });
        Me.ParsingError = void 0;
        var be = class extends Error {
            constructor(i, e) {
                (super(i), (this.cause = e));
            }
        };
        Me.ParsingError = be;
        var z;
        function yc() {
            return bc(!1) || pp() || vc() || fp() || en();
        }
        function _c() {
            return (Q(/\s*/), bc(!0) || vc() || cp() || en());
        }
        function dp() {
            let t = en(),
                i = [],
                e,
                n = _c();
            for (; n; ) {
                if (n.node.type === 'Element') {
                    if (e) throw new Error('Found multiple root nodes');
                    e = n.node;
                }
                (n.excluded || i.push(n.node), (n = _c()));
            }
            if (!e)
                throw new be('Failed to parse XML', 'Root Element not found');
            if (z.xml.length !== 0)
                throw new be('Failed to parse XML', 'Not Well-Formed XML');
            return { declaration: t ? t.node : null, root: e, children: i };
        }
        function en() {
            let t = Q(/^<\?([\w-:.]+)\s*/);
            if (!t) return;
            let i = { name: t[1], type: 'ProcessingInstruction', content: '' },
                e = z.xml.indexOf('?>');
            if (e > -1)
                ((i.content = z.xml.substring(0, e).trim()),
                    (z.xml = z.xml.slice(e)));
            else
                throw new be(
                    'Failed to parse XML',
                    'ProcessingInstruction closing tag not found'
                );
            return (
                Q(/\?>/),
                { excluded: z.options.filter(i) === !1, node: i }
            );
        }
        function bc(t) {
            let i = Q(/^<([^?!</>\s]+)\s*/);
            if (!i) return;
            let e = {
                    type: 'Element',
                    name: i[1],
                    attributes: {},
                    children: [],
                },
                n = t ? !1 : z.options.filter(e) === !1;
            for (; !(gp() || Qi('>') || Qi('?>') || Qi('/>')); ) {
                let a = mp();
                if (a) e.attributes[a.name] = a.value;
                else return;
            }
            if (Q(/^\s*\/>/))
                return ((e.children = null), { excluded: n, node: e });
            Q(/\??>/);
            let o = yc();
            for (; o; ) (o.excluded || e.children.push(o.node), (o = yc()));
            if (z.options.strictMode) {
                let a = `</${e.name}>`;
                if (z.xml.startsWith(a)) z.xml = z.xml.slice(a.length);
                else
                    throw new be(
                        'Failed to parse XML',
                        `Closing tag not matching "${a}"`
                    );
            } else Q(/^<\/[\w-:.\u00C0-\u00FF]+\s*>/);
            return { excluded: n, node: e };
        }
        function cp() {
            let t =
                Q(/^<!DOCTYPE\s+\S+\s+SYSTEM[^>]*>/) ||
                Q(/^<!DOCTYPE\s+\S+\s+PUBLIC[^>]*>/) ||
                Q(/^<!DOCTYPE\s+\S+\s*\[[^\]]*]>/) ||
                Q(/^<!DOCTYPE\s+\S+\s*>/);
            if (t) {
                let i = { type: 'DocumentType', content: t[0] };
                return { excluded: z.options.filter(i) === !1, node: i };
            }
        }
        function fp() {
            if (z.xml.startsWith('<![CDATA[')) {
                let t = z.xml.indexOf(']]>');
                if (t > -1) {
                    let i = t + 3,
                        e = { type: 'CDATA', content: z.xml.substring(0, i) };
                    return (
                        (z.xml = z.xml.slice(i)),
                        { excluded: z.options.filter(e) === !1, node: e }
                    );
                }
            }
        }
        function vc() {
            let t = Q(/^<!--[\s\S]*?-->/);
            if (t) {
                let i = { type: 'Comment', content: t[0] };
                return { excluded: z.options.filter(i) === !1, node: i };
            }
        }
        function pp() {
            let t = Q(/^([^<]+)/);
            if (t) {
                let i = { type: 'Text', content: t[1] };
                return { excluded: z.options.filter(i) === !1, node: i };
            }
        }
        function mp() {
            let t = Q(/([^=]+)\s*=\s*("[^"]*"|'[^']*'|[^>\s]+)\s*/);
            if (t) return { name: t[1].trim(), value: up(t[2].trim()) };
        }
        function up(t) {
            return t.replace(/^['"]|['"]$/g, '');
        }
        function Q(t) {
            let i = z.xml.match(t);
            if (i) return ((z.xml = z.xml.slice(i[0].length)), i);
        }
        function gp() {
            return z.xml.length === 0;
        }
        function Qi(t) {
            return z.xml.indexOf(t) === 0;
        }
        function Sc(t, i = {}) {
            t = t.trim();
            let e = i.filter || (() => !0);
            return (
                (z = {
                    xml: t,
                    options: Object.assign(Object.assign({}, i), {
                        filter: e,
                        strictMode: i.strictMode === !0,
                    }),
                }),
                dp()
            );
        }
        typeof Zi < 'u' && typeof Me == 'object' && (Zi.exports = Sc);
        Me.default = Sc;
    });
    var Ec = sn((Le, tn) => {
        'use strict';
        var hp =
            (Le && Le.__importDefault) ||
            function (t) {
                return t && t.__esModule ? t : { default: t };
            };
        Object.defineProperty(Le, '__esModule', { value: !0 });
        var xp = hp(Tc());
        function Rt(t) {
            if (!t.options.indentation && !t.options.lineSeparator) return;
            t.content += t.options.lineSeparator;
            let i;
            for (i = 0; i < t.level; i++) t.content += t.options.indentation;
        }
        function yp(t) {
            t.content = t.content.replace(/ +$/, '');
            let i;
            for (i = 0; i < t.level; i++) t.content += t.options.indentation;
        }
        function ne(t, i) {
            t.content += i;
        }
        function Cc(t, i, e) {
            if (t.type === 'Element') vp(t, i, e);
            else if (t.type === 'ProcessingInstruction') Ic(t, i);
            else if (typeof t.content == 'string') _p(t.content, i, e);
            else throw new Error('Unknown node type: ' + t.type);
        }
        function _p(t, i, e) {
            if (!e) {
                let n = t.trim();
                (i.options.lineSeparator || n.length === 0) && (t = n);
            }
            t.length > 0 && (!e && i.content.length > 0 && Rt(i), ne(i, t));
        }
        function bp(t, i) {
            let e = '/' + t.join('/'),
                n = t[t.length - 1];
            return i.includes(n) || i.includes(e);
        }
        function vp(t, i, e) {
            if (
                (i.path.push(t.name),
                !e && i.content.length > 0 && Rt(i),
                ne(i, '<' + t.name),
                Sp(i, t.attributes),
                t.children === null ||
                    (i.options.forceSelfClosingEmptyTag &&
                        t.children.length === 0))
            ) {
                let n = i.options.whiteSpaceAtEndOfSelfclosingTag
                    ? ' />'
                    : '/>';
                ne(i, n);
            } else if (t.children.length === 0) ne(i, '></' + t.name + '>');
            else {
                let n = t.children;
                (ne(i, '>'), i.level++);
                let o = t.attributes['xml:space'] === 'preserve' || e,
                    a = !1;
                if (
                    (!o &&
                        i.options.ignoredPaths &&
                        ((a = bp(i.path, i.options.ignoredPaths)), (o = a)),
                    !o && i.options.collapseContent)
                ) {
                    let s = !1,
                        r = !1,
                        l = !1;
                    (n.forEach(function (c, p) {
                        c.type === 'Text'
                            ? (c.content.includes(`
`)
                                  ? ((r = !0), (c.content = c.content.trim()))
                                  : (p === 0 || p === n.length - 1) &&
                                    !e &&
                                    c.content.trim().length === 0 &&
                                    (c.content = ''),
                              (c.content.trim().length > 0 || n.length === 1) &&
                                  (s = !0))
                            : c.type === 'CDATA'
                              ? (s = !0)
                              : (l = !0);
                    }),
                        s && (!l || !r) && (o = !0));
                }
                (n.forEach(function (s) {
                    Cc(s, i, e || o);
                }),
                    i.level--,
                    !e && !o && Rt(i),
                    a && yp(i),
                    ne(i, '</' + t.name + '>'));
            }
            i.path.pop();
        }
        function Sp(t, i) {
            Object.keys(i).forEach(function (e) {
                let n = i[e].replace(/"/g, '&quot;');
                ne(t, ' ' + e + '="' + n + '"');
            });
        }
        function Ic(t, i) {
            (i.content.length > 0 && Rt(i),
                ne(i, '<?' + t.name),
                ne(i, ' ' + t.content.trim()),
                ne(i, '?>'));
        }
        function Mt(t, i = {}) {
            ((i.indentation = 'indentation' in i ? i.indentation : '    '),
                (i.collapseContent = i.collapseContent === !0),
                (i.lineSeparator =
                    'lineSeparator' in i
                        ? i.lineSeparator
                        : `\r
`),
                (i.whiteSpaceAtEndOfSelfclosingTag =
                    i.whiteSpaceAtEndOfSelfclosingTag === !0),
                (i.throwOnFailure = i.throwOnFailure !== !1));
            try {
                let e = (0, xp.default)(t, {
                        filter: i.filter,
                        strictMode: i.strictMode,
                    }),
                    n = { content: '', level: 0, options: i, path: [] };
                return (
                    e.declaration && Ic(e.declaration, n),
                    e.children.forEach(function (o) {
                        Cc(o, n, !1);
                    }),
                    i.lineSeparator
                        ? n.content
                              .replace(
                                  /\r\n/g,
                                  `
`
                              )
                              .replace(/\n/g, i.lineSeparator)
                        : n.content
                );
            } catch (e) {
                if (i.throwOnFailure) throw e;
                return t;
            }
        }
        Mt.minify = (t, i = {}) =>
            Mt(
                t,
                Object.assign(Object.assign({}, i), {
                    indentation: '',
                    lineSeparator: '',
                })
            );
        typeof tn < 'u' && typeof Le == 'object' && (tn.exports = Mt);
        Le.default = Mt;
    });
    Y();
    Y();
    function ln() {
        (document.body.addEventListener('mouseover', (t) => {
            let e = t.target.closest('[data-tooltip], [data-tooltip-html-b64]');
            if (!e) {
                ((u.globalTooltip.style.visibility = 'hidden'),
                    (u.globalTooltip.style.opacity = '0'));
                return;
            }
            let n = e.dataset.tooltipHtmlB64,
                o = '';
            try {
                if (n) o = atob(n);
                else {
                    let l = e.dataset.tooltip || '',
                        c = e.dataset.iso || '';
                    if (!l) return;
                    o = `${l}${c ? `<span class="block mt-1 font-medium text-emerald-300">${c}</span>` : ''}`;
                }
            } catch (l) {
                (console.error(
                    'Failed to decode or process tooltip content:',
                    l
                ),
                    (o = '<span class="text-red-400">Tooltip Error</span>'));
            }
            if (!o.trim()) {
                ((u.globalTooltip.style.visibility = 'hidden'),
                    (u.globalTooltip.style.opacity = '0'));
                return;
            }
            u.globalTooltip.innerHTML = o;
            let a = e.getBoundingClientRect(),
                s = u.globalTooltip.getBoundingClientRect(),
                r = a.left + a.width / 2 - s.width / 2;
            (r < 10 && (r = 10),
                r + s.width > window.innerWidth - 10 &&
                    (r = window.innerWidth - s.width - 10),
                (u.globalTooltip.style.left = `${r}px`),
                (u.globalTooltip.style.top = `${a.top - s.height - 8}px`),
                (u.globalTooltip.style.visibility = 'visible'),
                (u.globalTooltip.style.opacity = '1'));
        }),
            document.body.addEventListener('mouseout', (t) => {
                let i = t.target,
                    e = t.relatedTarget,
                    n = i.closest('[data-tooltip], [data-tooltip-html-b64]');
                n &&
                    !n.contains(e) &&
                    ((u.globalTooltip.style.visibility = 'hidden'),
                    (u.globalTooltip.style.opacity = '0'));
            }));
    }
    K();
    L();
    Y();
    j();
    var Cn = [
        {
            name: '[DASH-IF] Big Buck Bunny, onDemand',
            url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
            protocol: 'dash',
            type: 'vod',
            source: 'dashif.org',
        },
        {
            name: '[DASH-IF] SegmentBase, onDemand',
            url: 'https://dash.akamaized.net/dash264/TestCases/1a/sony/SNE_DASH_SD_CASE1A_REVISED.mpd',
            protocol: 'dash',
            type: 'vod',
            source: 'dashif.org',
        },
        {
            name: '[DASH-IF] Multi-period, 2 periods',
            url: 'https://dash.akamaized.net/dash264/TestCases/5a/nomor/1.mpd',
            protocol: 'dash',
            type: 'vod',
            source: 'dashif.org',
        },
        {
            name: '[DASH-IF] Envivio, SegmentTemplate/Number',
            url: 'https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd',
            protocol: 'dash',
            type: 'vod',
            source: 'dashif.org',
        },
        {
            name: '[Axinom] H.264, CMAF, Clear',
            url: 'https://media.axprod.net/TestVectors/v7-Clear/Manifest.mpd',
            protocol: 'dash',
            type: 'vod',
            source: 'Axinom',
        },
        {
            name: '[Axinom] Multi-key, Widevine/PlayReady DRM',
            url: 'https://media.axprod.net/TestVectors/v7-MultiDRM-MultiKey/Manifest.mpd',
            protocol: 'dash',
            type: 'vod',
            source: 'Axinom',
        },
        {
            name: '[DASH-IF] Live Sim (SegmentTemplate)',
            url: 'https://livesim.dashif.org/livesim/testpic_2s/Manifest.mpd',
            protocol: 'dash',
            type: 'live',
            source: 'dashif.org',
        },
        {
            name: '[DASH-IF] Live Sim (SegmentTimeline)',
            url: 'https://livesim.dashif.org/livesim/segtimeline_1/testpic_2s/Manifest.mpd',
            protocol: 'dash',
            type: 'live',
            source: 'dashif.org',
        },
        {
            name: '[DASH-IF] Live Sim (SCTE-35 Events)',
            url: 'https://livesim.dashif.org/livesim/scte35_2/testpic_2s/Manifest.mpd',
            protocol: 'dash',
            type: 'live',
            source: 'dashif.org',
        },
        {
            name: '[DASH-IF] Live Sim (Low-Latency Chunked)',
            url: 'https://livesim.dashif.org/livesim-chunked/testpic_2s/Manifest.mpd',
            protocol: 'dash',
            type: 'live',
            source: 'dashif.org',
        },
        {
            name: '[AWS] Live w/ Ad Breaks',
            url: 'https://d2qohgpffhaffh.cloudfront.net/HLS/vanlife/withad/sdr_wide/master.mpd',
            protocol: 'dash',
            type: 'live',
            source: 'AWS',
        },
        {
            name: '[Unified Streaming] Live w/ SCTE-35 markers',
            url: 'https://demo.unified-streaming.com/k8s/live/scte35.isml/.mpd',
            protocol: 'dash',
            type: 'live',
            source: 'Unified Streaming',
        },
        {
            name: '[HLS.js] Big Buck Bunny, Adaptive',
            url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            protocol: 'hls',
            type: 'vod',
            source: 'hls.js',
        },
        {
            name: '[HLS.js] Big Buck Bunny, 480p',
            url: 'https://test-streams.mux.dev/x36xhzz/url_6/193039199_mp4_h264_aac_hq_7.m3u8',
            protocol: 'hls',
            type: 'vod',
            source: 'hls.js',
        },
        {
            name: '[HLS.js] fMP4, Multiple Audio Tracks',
            url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8',
            protocol: 'hls',
            type: 'vod',
            source: 'hls.js',
        },
        {
            name: '[HLS.js] AES-128 Encrypted',
            url: 'https://playertest.longtailvideo.com/adaptive/oceans_aes/oceans_aes.m3u8',
            protocol: 'hls',
            type: 'vod',
            source: 'hls.js',
        },
        {
            name: '[HLS.js] AES-128 Encrypted, TS main with AAC',
            url: 'https://playertest.longtailvideo.com/adaptive/aes-with-tracks/master.m3u8',
            protocol: 'hls',
            type: 'vod',
            source: 'hls.js',
        },
        {
            name: '[HLS.js] Ad-insertion in Event Stream',
            url: 'https://test-streams.mux.dev/dai-discontinuity-deltatre/manifest.m3u8',
            protocol: 'hls',
            type: 'vod',
            source: 'hls.js',
        },
        {
            name: '[HLS.js] Subtitles/Captions',
            url: 'https://playertest.longtailvideo.com/adaptive/captions/playlist.m3u8',
            protocol: 'hls',
            type: 'vod',
            source: 'hls.js',
        },
        {
            name: '[HLS.js] ARTE China, ABR',
            url: 'https://test-streams.mux.dev/test_001/stream.m3u8',
            protocol: 'hls',
            type: 'vod',
            source: 'hls.js',
        },
        {
            name: '[HLS.js] MP3 VOD',
            url: 'https://playertest.longtailvideo.com/adaptive/vod-with-mp3/manifest.m3u8',
            protocol: 'hls',
            type: 'vod',
            source: 'hls.js',
        },
        {
            name: '[HLS.js] DK Turntable, PTS shifted',
            url: 'https://test-streams.mux.dev/pts_shift/master.m3u8',
            protocol: 'hls',
            type: 'vod',
            source: 'hls.js',
        },
        {
            name: '[Apple] Bip-Bop, Advanced HEVC+AVC',
            url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8',
            protocol: 'hls',
            type: 'vod',
            source: 'Apple',
        },
        {
            name: '[JW Player] FDR, CDN packaged',
            url: 'https://cdn.jwplayer.com/manifests/pZxWPRg4.m3u8',
            protocol: 'hls',
            type: 'vod',
            source: 'JW Player',
        },
        {
            name: '[Bitmovin] fMP4',
            url: 'https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s-fmp4/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8',
            protocol: 'hls',
            type: 'vod',
            source: 'Bitmovin',
        },
        {
            name: '[Shaka] Angel One, Widevine DRM (fMP4)',
            url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine-hls/hls.m3u8',
            protocol: 'hls',
            type: 'vod',
            source: 'Shaka',
        },
        {
            name: "[Wowza] Elephant's Dream, Alt Audio + VTT",
            url: 'https://playertest.longtailvideo.com/adaptive/elephants_dream_v4/index.m3u8',
            protocol: 'hls',
            type: 'vod',
            source: 'Wowza',
        },
        {
            name: '[Mux] Low-Latency HLS (fMP4)',
            url: 'https://stream.mux.com/v69RSHhFelSm4701snP22dYz2jICy4E4FUyk02rW4gxRM.m3u8',
            protocol: 'hls',
            type: 'live',
            source: 'Mux',
        },
        {
            name: '[Unified Streaming] Tears of Steel',
            url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
            protocol: 'hls',
            type: 'live',
            source: 'Unified Streaming',
        },
    ];
    var Gc = 'dash_analyzer_history',
        Yt = 'dash_analyzer_presets',
        In = 50,
        ue = [],
        nt = (t, i) =>
            t
                ? d`<span
        class="text-xs font-semibold px-2 py-0.5 rounded-full ${i}"
        >${t.toUpperCase()}</span
    >`
                : '',
        An = (t) => {
            let i =
                    t.protocol === 'dash'
                        ? nt('DASH', 'bg-blue-800 text-blue-200')
                        : t.protocol === 'hls'
                          ? nt('HLS', 'bg-purple-800 text-purple-200')
                          : '',
                e =
                    t.type === 'live'
                        ? nt('LIVE', 'bg-red-800 text-red-200')
                        : t.type === 'vod'
                          ? nt('VOD', 'bg-green-800 text-green-200')
                          : '';
            return d`<li
        class="px-3 py-2 hover:bg-gray-700 cursor-pointer flex justify-between items-center"
        data-url="${t.url}"
        data-name="${t.name}"
        @click=${Kc}
    >
        <div class="flex flex-col min-w-0">
            <span
                class="font-semibold text-gray-200 truncate"
                title="${t.name}"
                >${t.name}</span
            >
            <span
                class="text-xs text-gray-400 font-mono truncate"
                title="${t.url}"
                >${t.url}</span
            >
        </div>
        <div class="flex-shrink-0 flex gap-2 ml-4">
            ${i} ${e}
        </div>
    </li>`;
        },
        En = (t, i) =>
            !i || i.length === 0
                ? ''
                : d`<div>
        <h4
            class="font-bold text-gray-200 text-xs tracking-wider uppercase px-3 pt-3 pb-2 sticky top-0 bg-gray-900 z-10 border-b border-gray-800/50"
        >
            ${t}
        </h4>
        <ul class="divide-y divide-gray-700/50">
            ${i.map(An)}
        </ul>
    </div>`,
        Wc = (t, i) =>
            !i || i.length === 0
                ? ''
                : d`<div>
        <h5 class="font-medium text-gray-400 px-3 pt-2 pb-1">${t}</h5>
        <ul class="divide-y divide-gray-700/50">
            ${i.map(An)}
        </ul>
    </div>`,
        qc = (t, i, e, n) => {
            let o = e.filter((b) => b.name && b.url),
                a = n.filter((b) => b.name && b.url),
                s = new Set(a.map((b) => b.url)),
                r = Cn.reduce(
                    (b, C) => {
                        let { protocol: A, type: I } = C;
                        return (
                            b[A] || (b[A] = {}),
                            b[A][I] || (b[A][I] = []),
                            b[A][I].push(C),
                            b
                        );
                    },
                    { dash: {}, hls: {} }
                ),
                l = (b) => {
                    let C = b.target.closest('.stream-input-group');
                    if (C) {
                        let A = parseInt(C.dataset.id);
                        ((ue = ue.filter((I) => I !== A)), Oe());
                    }
                },
                c = (b) => {
                    let C = b.target,
                        I = C.closest('.stream-input-group').querySelector(
                            '.save-preset-btn'
                        ),
                        $ = C.value.trim();
                    I.disabled = s.has($) || $ === '';
                },
                p = (b, C) => {
                    let A = b.querySelector('.preset-dropdown');
                    A && A.classList.toggle('hidden', !C);
                },
                g = (b) => {
                    p(b.currentTarget.closest('.stream-input-group'), !0);
                },
                x,
                m = (b) => {
                    let C = b.currentTarget.closest('.stream-input-group');
                    x = setTimeout(() => {
                        p(C, !1);
                    }, 150);
                },
                _ = () => clearTimeout(x);
            return d` <div
        data-testid="stream-input-group"
        class="stream-input-group ${i ? '' : 'border-t border-gray-700 pt-6 mt-6'}"
        data-id="${t}"
    >
        <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold text-gray-300">
                Stream ${ue.indexOf(t) + 1}
            </h3>
            ${
                i
                    ? ''
                    : d`<button
                      class="remove-stream-btn text-red-400 hover:text-red-600 font-bold text-sm"
                      @click=${l}
                  >
                      &times; Remove
                  </button>`
            }
        </div>
        <div class="space-y-4">
            <!-- URL Input and Dropdown Container -->
            <div
                class="relative"
                @focusin=${g}
                @focusout=${m}
            >
                <div class="flex flex-col md:flex-row items-center gap-4">
                    <input
                        type="url"
                        id="url-${t}"
                        class="input-url w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter Manifest URL or click to see presets..."
                        .value=${i && o.length > 0 ? o[0].url : ''}
                        @input=${c}
                        autocomplete="off"
                    />
                    <label
                        for="file-${t}"
                        class="block w-full md:w-auto cursor-pointer bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md text-center flex-shrink-0"
                        >Upload File</label
                    >
                    <input
                        type="file"
                        id="file-${t}"
                        class="input-file hidden"
                        accept=".mpd, .xml, .m3u8"
                        @change=${Yc}
                    />
                </div>

                <!-- Dropdown Menu -->
                <div
                    class="preset-dropdown hidden absolute top-full left-0 right-0 mt-2 z-30 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto"
                    @focusin=${_}
                >
                    ${En('Recent', o)}
                    ${En('Saved', a)}
                    <div>
                        <h4
                            class="font-bold text-gray-200 text-xs tracking-wider uppercase px-3 pt-3 pb-2 sticky top-0 bg-gray-900 z-10 border-b border-gray-800/50"
                        >
                            Examples
                        </h4>
                        <div class="p-2">
                            ${Object.entries(r).map(
                                ([b, C]) => d`
                                    <div class="mt-2">
                                        <h5
                                            class="font-semibold text-gray-300 text-sm px-3 py-2 bg-gray-900/50 rounded-t-md"
                                        >
                                            ${b.toUpperCase()}
                                        </h5>
                                        <div
                                            class="border border-t-0 border-gray-700/50 rounded-b-md"
                                        >
                                            ${Object.entries(C).map(([A, I]) => Wc(`${A.charAt(0).toUpperCase()}${A.slice(1)}`, I))}
                                        </div>
                                    </div>
                                `
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Save Preset Input -->
            <div
                class="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-gray-700"
            >
                <input
                    type="text"
                    id="name-${t}"
                    class="input-name w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600"
                    placeholder="Enter a custom name to save this URL"
                />
                <button
                    class="save-preset-btn w-full sm:w-auto flex-shrink-0 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    @click=${Jc}
                    ?disabled=${s.has(i && o.length > 0 ? o[0].url : '')}
                >
                    Save as Preset
                </button>
            </div>
        </div>
    </div>`;
        },
        Yc = (t) => {
            let i = t.target,
                e = i.closest('.stream-input-group');
            if (i.files[0]) {
                e.querySelector('.input-url').value = '';
                let n = e.querySelector('.preset-dropdown');
                n && n.classList.add('hidden');
            }
        },
        Kc = (t) => {
            let i = t.currentTarget,
                e = i.closest('.stream-input-group'),
                n = e.querySelector('.input-url');
            i.dataset.url &&
                ((n.value = i.dataset.url),
                (e.querySelector('.input-name').value = i.dataset.name || ''),
                (e.querySelector('.input-file').value = ''),
                n.dispatchEvent(new Event('input', { bubbles: !0 })));
            let o = e.querySelector('.preset-dropdown');
            o && o.classList.add('hidden');
        },
        Jc = (t) => {
            let e = t.target.closest('.stream-input-group'),
                n = e.querySelector('.input-name'),
                o = e.querySelector('.input-url'),
                a = n.value.trim(),
                s = o.value.trim();
            if (!a || !s) {
                alert(
                    'Please provide both a URL and a custom name to save a preset.'
                );
                return;
            }
            let r = JSON.parse(localStorage.getItem(Yt) || '[]');
            r = r.filter((c) => c.url !== s);
            let l = s.includes('.m3u8') ? 'hls' : 'dash';
            (r.unshift({ name: a, url: s, protocol: l, type: null }),
                r.length > In && (r.length = In),
                localStorage.setItem(Yt, JSON.stringify(r)),
                (n.value = ''),
                alert(`Preset "${a}" saved!`),
                Oe());
        };
    function Kt() {
        let t = S.getState().streamIdCounter;
        (ue.push(t), S.setState({ streamIdCounter: t + 1 }));
    }
    function Oe() {
        let t = JSON.parse(localStorage.getItem(Gc) || '[]'),
            i = JSON.parse(localStorage.getItem(Yt) || '[]'),
            e = d`${ue.map((n, o) => qc(n, o === 0, t, i))}`;
        (P(e, u.streamInputs),
            (u.analyzeBtn.textContent =
                ue.length > 1 ? 'Analyze & Compare' : 'Analyze'));
    }
    function ot() {
        (S.setState({ streamIdCounter: 0 }), (ue = []), Kt(), Oe());
    }
    L();
    Y();
    j();
    yi();
    gt();
    $t();
    zi();
    Hi();
    var Qe = null;
    function Zd(t) {
        let e = t.target.closest('[data-tab]');
        if (!e) return;
        (Qe && (document.removeEventListener('keydown', Qe), (Qe = null)),
            Pe());
        let n = ['border-blue-600', 'text-gray-100', 'bg-gray-700'],
            o = ['border-transparent'];
        (u.tabs.querySelectorAll('[data-tab]').forEach((c) => {
            (c.classList.remove(...n), c.classList.add(...o));
        }),
            e.classList.add(...n),
            e.classList.remove(...o),
            Object.values(u.tabContents).forEach((c) => {
                c && c.classList.add('hidden');
            }));
        let a = e.dataset.tab,
            s = u.tabContents[a];
        s && s.classList.remove('hidden');
        let { activeStreamId: r, streams: l } = S.getState();
        if (
            (a === 'interactive-segment' &&
                P(We(), u.tabContents['interactive-segment']),
            a === 'interactive-manifest' && Dt(r),
            a === 'explorer')
        ) {
            let c = l.find((p) => p.id === r);
            c && Je(u.tabContents.explorer, c);
        }
        a === 'updates' &&
            ((Qe = (c) => {
                (c.key === 'ArrowRight' && Ee(1),
                    c.key === 'ArrowLeft' && Ee(-1));
            }),
            document.addEventListener('keydown', Qe),
            Ae(r));
    }
    Y();
    function ec() {
        u.closeModalBtn.addEventListener('click', () => {
            let t = u.segmentModal.querySelector('div');
            (u.segmentModal.classList.add('opacity-0', 'invisible'),
                u.segmentModal.classList.remove('opacity-100', 'visible'),
                t.classList.add('scale-95'),
                t.classList.remove('scale-100'));
        });
    }
    K();
    j();
    var oe = new Map(),
        we = null,
        tc = new Worker('/dist/worker.js', { type: 'module' });
    tc.onmessage = (t) => {
        let { type: i, payload: e } = t.data;
        if (i === 'live-update-parsed') {
            let {
                streamId: n,
                newManifestObject: o,
                finalManifestString: a,
                oldRawManifest: s,
                complianceResults: r,
            } = e;
            y.dispatch('livestream:manifest-updated', {
                streamId: n,
                newManifestString: a,
                newManifestObject: o,
                oldManifestString: s,
                complianceResults: r,
            });
        } else
            i === 'live-update-error' &&
                console.error(
                    `[LiveStreamMonitor] Worker failed to parse update for stream ${e.streamId}:`,
                    e.error
                );
    };
    async function ic(t) {
        let i = S.getState().streams.find((e) => e.id === t);
        if (!i || !i.originalUrl) {
            Oi(t);
            return;
        }
        try {
            let e = await fetch(i.originalUrl);
            if (!e.ok) return;
            let n = await e.text();
            if (n === i.rawManifest) {
                y.dispatch('ui:show-status', {
                    message: 'Manifest has not changed.',
                    type: 'info',
                    duration: 2e3,
                });
                return;
            }
            tc.postMessage({
                type: 'parse-live-update',
                payload: {
                    streamId: i.id,
                    newManifestString: n,
                    oldRawManifest: i.rawManifest,
                    protocol: i.protocol,
                    baseUrl: i.baseUrl,
                    hlsDefinedVariables: i.hlsDefinedVariables,
                    oldManifestObjectForDelta: i.manifest?.serializedManifest,
                },
            });
        } catch (e) {
            console.error(
                `[LiveStreamMonitor] Error fetching update for stream ${i.id}:`,
                e
            );
        }
    }
    function tp(t) {
        if (!oe.has(t.id) && t.manifest?.type === 'dynamic' && t.originalUrl) {
            let i =
                    t.manifest.minimumUpdatePeriod ||
                    t.manifest.minBufferTime ||
                    2,
                e = Math.max(i * 1e3, 2e3),
                n = setInterval(() => ic(t.id), e);
            oe.set(t.id, n);
        }
    }
    function Oi(t) {
        oe.has(t) && (clearInterval(oe.get(t)), oe.delete(t));
    }
    function Ni() {
        let t = S.getState().streams.filter(
            (i) => i.manifest?.type === 'dynamic'
        );
        t.forEach((i) => {
            let e = oe.has(i.id);
            i.isPolling && !e ? tp(i) : !i.isPolling && e && Oi(i.id);
        });
        for (let i of oe.keys()) t.some((e) => e.id === i) || Oi(i);
    }
    function nc() {
        (we && clearInterval(we),
            (we = setInterval(Ni, 1e3)),
            y.subscribe('state:stream-updated', Ni),
            y.subscribe('state:analysis-complete', Ni),
            y.subscribe('manifest:force-reload', ({ streamId: t }) => ic(t)));
    }
    function oc() {
        we && (clearInterval(we), (we = null));
        for (let t of oe.values()) clearInterval(t);
        oe.clear();
    }
    L();
    K();
    j();
    Y();
    L();
    L();
    le();
    st();
    var ac = (t) => {
            let i = Te(),
                e = i[t.type] || {},
                n = d`<div
        class="font-semibold font-mono p-2 bg-gray-900/50 rounded-t-md border-b border-gray-600 flex items-center gap-2"
    >
        ${
            t.issues && t.issues.length > 0
                ? d`<svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 text-yellow-400 flex-shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  title="${t.issues.map((r) => `[${r.type}] ${r.message}`)
                      .join(`
`)}"
              >
                  <path
                      fill-rule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clip-rule="evenodd"
                  />
              </svg>`
                : ''
        }
        <span
            class="text-emerald-300 ${e.text ? F : ''}"
            data-tooltip="${e.text || ''}"
            data-iso="${e.ref || ''}"
            >${t.type}</span
        >
        <span class="text-gray-500 text-xs"
            >${e.name ? `(${e.name}) ` : ''}(${t.size}
            bytes)</span
        >
    </div>`,
                o =
                    Object.keys(t.details).length > 0
                        ? d`<div class="p-2">
                  <table class="text-xs border-collapse w-full table-auto">
                      <tbody>
                          ${Object.entries(t.details).map(([r, l]) => {
                              let c = i[`${t.type}@${r}`];
                              return d`<tr>
                                  <td
                                      class="border border-gray-700 p-2 text-gray-400 w-1/3 ${c ? F : ''}"
                                      data-tooltip="${c?.text || ''}"
                                      data-iso="${c?.ref || ''}"
                                  >
                                      ${r}
                                  </td>
                                  <td
                                      class="border border-gray-700 p-2 text-gray-200 font-mono break-all"
                                  >
                                      ${l.value}
                                  </td>
                              </tr>`;
                          })}
                      </tbody>
                  </table>
              </div>`
                        : '',
                a =
                    t.samples && t.samples.length > 0
                        ? d`
                  <div class="p-2 text-xs border-t border-gray-700">
                      <h5 class="font-semibold text-gray-300 mb-1">
                          Sample Analysis (${t.samples.length} samples)
                      </h5>
                      <div
                          class="max-h-60 overflow-y-auto bg-gray-900/50 p-2 rounded"
                      >
                          ${t.samples.map(
                              (r, l) => d`
                                  <details class="mb-1">
                                      <summary
                                          class="cursor-pointer text-cyan-400"
                                      >
                                          Sample ${l + 1} (${r.size}
                                          bytes, Type:
                                          ${r.analysis?.frameType})
                                      </summary>
                                      <ul
                                          class="pl-4 list-disc list-inside mt-1"
                                      >
                                          ${r.analysis?.nalUnits.map(
                                              (c) => d`
                                                  <li
                                                      class="text-gray-300 font-mono"
                                                  >
                                                      ${c.type}: ${c.size}
                                                      bytes
                                                  </li>
                                              `
                                          )}
                                      </ul>
                                  </details>
                              `
                          )}
                      </div>
                  </div>
              `
                        : '',
                s =
                    t.children.length > 0
                        ? d`<div class="pl-4 mt-2 border-l-2 border-gray-600">
                  <ul class="list-none space-y-2">
                      ${t.children.map((r) => d`<li>${ac(r)}</li>`)}
                  </ul>
              </div>`
                        : '';
            return d`<div class="border border-gray-700 rounded-md bg-gray-800">
        ${n}
        <div class="space-y-2">${o} ${a}</div>
        ${s}
    </div>`;
        },
        sc = (t) => d`
    <div>
        <ul class="list-none p-0 space-y-2">
            ${t.boxes.map((i) => d`<li>${ac(i)}</li>`)}
        </ul>
    </div>
`;
    L();
    var Pt = (t, i) =>
            i == null
                ? ''
                : d`
        <div class="text-xs">
            <span class="block text-gray-400 mb-0.5">${t}</span>
            <span class="block font-semibold font-mono text-gray-200"
                >${i}</span
            >
        </div>
    `,
        rc = (t) => {
            let { summary: i, packets: e } = t.data,
                n = Object.keys(i.programMap)[0],
                o = n ? i.programMap[n] : null,
                a = e.reduce(
                    (r, l) => ((r[l.pid] = (r[l.pid] || 0) + 1), r),
                    {}
                ),
                s = {};
            return (
                o &&
                    (Object.assign(s, o.streams),
                    (s[i.pcrPid] = `${s[i.pcrPid] || 'Unknown'} (PCR)`)),
                (s[0] = 'PAT'),
                i.pmtPids.forEach((r) => (s[r] = 'PMT')),
                d`
        <div
            class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 bg-gray-900 border border-gray-700 rounded p-3 mb-4"
        >
            ${Pt('Total Packets', i.totalPackets)}
            ${Pt('PCR PID', i.pcrPid || 'N/A')}
            ${o ? Pt('Program #', o.programNumber) : ''}
            ${i.errors.length > 0 ? Pt('Errors', i.errors.join(', ')) : ''}
        </div>

        <h4 class="text-md font-bold mb-2 mt-4">PID Allocation</h4>
        <div
            class="bg-gray-800/50 rounded-lg border border-gray-700 overflow-x-auto"
        >
            <table class="w-full text-left text-xs">
                <thead class="bg-gray-900/50">
                    <tr>
                        <th class="p-2 font-semibold text-gray-300">PID</th>
                        <th class="p-2 font-semibold text-gray-300">
                            Packet Count
                        </th>
                        <th class="p-2 font-semibold text-gray-300">
                            Stream Type / Purpose
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-700">
                    ${Object.entries(a)
                        .sort(([r], [l]) => parseInt(r, 10) - parseInt(l, 10))
                        .map(
                            ([r, l]) => d`
                                <tr>
                                    <td class="p-2 font-mono">
                                        ${r}
                                        (0x${parseInt(r).toString(16).padStart(4, '0')})
                                    </td>
                                    <td class="p-2 font-mono">${l}</td>
                                    <td class="p-2">
                                        ${s[r] || 'Unknown/Data'}
                                    </td>
                                </tr>
                            `
                        )}
                </tbody>
            </table>
        </div>
    `
            );
        };
    function ip(t, i) {
        let e = [],
            n = new Set([...Object.keys(t), ...Object.keys(i)]);
        for (let o of n) {
            let a = t[o],
                s = i[o],
                r = JSON.stringify(a) !== JSON.stringify(s);
            e.push({
                key: o,
                val1: a !== void 0 ? a : '---',
                val2: s !== void 0 ? s : '---',
                isDifferent: r,
            });
        }
        return e;
    }
    var np = (t, i) => {
        if (!t.data.summary || !i.data.summary)
            return d`<p class="fail">
            Cannot compare segments; summary data is missing.
        </p>`;
        let e = ip(t.data.summary, i.data.summary);
        return d`
        <div class="grid grid-cols-[1fr_2fr_2fr] text-xs">
            <div
                class="font-semibold p-2 border-b border-r border-gray-700 bg-gray-900/50"
            >
                Property
            </div>
            <div
                class="font-semibold p-2 border-b border-r border-gray-700 bg-gray-900/50"
            >
                Segment A
            </div>
            <div
                class="font-semibold p-2 border-b border-r border-gray-700 bg-gray-900/50"
            >
                Segment B
            </div>
            ${e.map(
                (n) => d`
                    <div
                        class="p-2 border-b border-r border-gray-700 font-medium text-gray-400"
                    >
                        ${n.key}
                    </div>
                    <div
                        class="p-2 border-b border-r border-gray-700 font-mono ${n.isDifferent ? 'bg-red-900/50 text-red-300' : ''}"
                    >
                        ${n.val1}
                    </div>
                    <div
                        class="p-2 border-b border-r border-gray-700 font-mono ${n.isDifferent ? 'bg-red-900/50 text-red-300' : ''}"
                    >
                        ${n.val2}
                    </div>
                `
            )}
        </div>
    `;
    };
    function Xi(t, i = null) {
        if (t?.error)
            return d`<p class="text-red-400 p-4">
            Segment could not be parsed:
            <span class="block font-mono bg-gray-900 p-2 mt-2 rounded"
                >${t.error}</span
            >
        </p>`;
        if (!t)
            return d`<p class="text-gray-400 p-4">
            Segment data not available or is currently loading.
        </p>`;
        if (i) return np(t, i);
        let e = t.format,
            o =
                e === 'isobmff' || e === 'ts'
                    ? d`<svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
          >
              <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
          </svg>`
                    : d`<svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
          >
              <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
          </svg>`,
            a =
                {
                    isobmff: 'ISO Base Media File Format',
                    ts: 'MPEG-2 Transport Stream',
                }[e] || 'Unknown Format',
            s;
        switch (e) {
            case 'isobmff':
                s = sc(t.data);
                break;
            case 'ts':
                s = rc(t);
                break;
            default:
                s = d`<p class="fail">
                Analysis view for format '${e}' is not supported.
            </p>`;
                break;
        }
        return d`
        <div
            class="flex items-center gap-2 mb-4 p-2 bg-gray-900/50 rounded-md border border-gray-700"
        >
            ${o}
            <span class="font-semibold text-gray-300"
                >Format: ${a}</span
            >
        </div>
        ${s}
    `;
    }
    function lc() {
        let t = u.segmentModal.querySelector('div');
        (u.segmentModal.classList.remove('opacity-0', 'invisible'),
            u.segmentModal.classList.add('opacity-100', 'visible'),
            t.classList.remove('scale-95'),
            t.classList.add('scale-100'));
    }
    var op = (t) => {
            let i = t.activeMediaPlaylistUrl || t.originalUrl;
            if (!t || !i || !t.originalUrl) {
                y.dispatch('ui:show-status', {
                    message: 'Cannot reload a manifest from a local file.',
                    type: 'warn',
                    duration: 4e3,
                });
                return;
            }
            (y.dispatch('ui:show-status', {
                message: `Reloading manifest for ${t.name}...`,
                type: 'info',
                duration: 2e3,
            }),
                t.protocol === 'hls' && t.activeMediaPlaylistUrl
                    ? y.dispatch('hls:media-playlist-reload', {
                          streamId: t.id,
                          url: t.activeMediaPlaylistUrl,
                      })
                    : y.dispatch('manifest:force-reload', { streamId: t.id }));
        },
        ap = (t) => {
            t && G.updateStream(t.id, { isPolling: !t.isPolling });
        },
        sp = (t) => {
            if (!t) return d``;
            let i = t.manifest?.type === 'dynamic',
                e = t.isPolling,
                n = i
                    ? d`
              <button
                  @click=${() => ap(t)}
                  class="font-bold text-sm py-2 px-4 rounded-md transition-colors text-white ${e ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}"
              >
                  ${e ? 'Stop Polling' : 'Start Polling'}
              </button>
          `
                    : '';
            return d`
        ${n}
        <button
            @click=${() => op(t)}
            class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
        >
            Reload
        </button>
    `;
        };
    function dc() {
        let { streams: t, activeStreamId: i } = S.getState(),
            e = t.find((o) => o.id === i),
            n = document.getElementById('global-stream-controls');
        n && P(sp(e), n);
    }
    function cc() {
        let t = S.getState().streams,
            i = S.getState().activeStreamId;
        (S.subscribe(async (e) => {
            let n = e.streams.find((a) => a.id === e.activeStreamId),
                o = t.find((a) => a.id === i);
            if (e.activeStreamId !== i) {
                if (!u.results.classList.contains('hidden')) {
                    let { renderSingleStreamTabs: a } =
                        await Promise.resolve().then(() => ($t(), Qd));
                    a(e.activeStreamId);
                }
                dc();
            } else n?.isPolling !== o?.isPolling && dc();
            ((t = e.streams), (i = e.activeStreamId));
        }),
            y.subscribe('stream:data-updated', async ({ streamId: e }) => {
                if (e !== S.getState().activeStreamId) return;
                let n = u.tabs.querySelector('[data-tab="features"]');
                if (n && n.classList.contains('bg-gray-700')) {
                    let a = S.getState().streams.find((s) => s.id === e);
                    if (a) {
                        let { getFeaturesAnalysisTemplate: s } =
                            await Promise.resolve().then(() => (Pi(), Ad));
                        P(s(a), u.tabContents.features);
                    }
                }
                let o = u.tabs.querySelector('[data-tab="updates"]');
                if (o && o.classList.contains('bg-gray-700')) {
                    let { renderManifestUpdates: a } =
                        await Promise.resolve().then(() => (gt(), Nl));
                    a(e);
                }
            }),
            y.subscribe('ui:request-segment-analysis', ({ url: e }) => {
                ((u.modalTitle.textContent = 'Segment Analysis'),
                    (u.modalSegmentUrl.textContent = e));
                let n = S.getState().segmentCache.get(e);
                (lc(), P(Xi(n?.parsedData), u.modalContentArea));
            }),
            y.subscribe(
                'ui:request-segment-comparison',
                ({ urlA: e, urlB: n }) => {
                    let { segmentCache: o } = S.getState();
                    ((u.modalTitle.textContent = 'Segment Comparison'),
                        (u.modalSegmentUrl.textContent =
                            'Comparing Segment A vs. Segment B'));
                    let a = o.get(e),
                        s = o.get(n);
                    (lc(),
                        P(
                            Xi(a?.parsedData, s?.parsedData),
                            u.modalContentArea
                        ));
                }
            ));
    }
    Y();
    K();
    $t();
    Y();
    K();
    function te({ message: t, type: i, duration: e = 4e3 }) {
        if (!u.toastContainer) return;
        let n = document.createElement('div'),
            o = {
                pass: 'bg-green-600 border-green-500',
                fail: 'bg-red-600 border-red-500',
                warn: 'bg-yellow-600 border-yellow-500',
                info: 'bg-blue-600 border-blue-500',
            };
        ((n.className = `p-4 rounded-lg border text-white shadow-lg transition-all duration-300 ease-in-out transform translate-x-full opacity-0 ${o[i]}`),
            (n.textContent = t),
            u.toastContainer.appendChild(n),
            setTimeout(() => {
                n.classList.remove('translate-x-full', 'opacity-0');
            }, 10),
            setTimeout(() => {
                (n.classList.add('opacity-0', 'translate-x-8'),
                    n.addEventListener('transitionend', () => n.remove()));
            }, e));
    }
    function fc() {
        y.subscribe('ui:show-status', te);
    }
    var Ze = { INPUT: 'input', RESULTS: 'results' };
    function ji(t, i) {
        let e = document.getElementById('global-stream-controls');
        if (t === Ze.INPUT)
            (u.results.classList.add('hidden'),
                u.newAnalysisBtn.classList.add('hidden'),
                u.shareAnalysisBtn.classList.add('hidden'),
                u.copyDebugBtn.classList.add('hidden'),
                u.contextSwitcherWrapper.classList.add('hidden'),
                u.inputSection.classList.remove('hidden'),
                e && e.classList.add('hidden'),
                u.mainHeader.classList.add('justify-center'),
                u.mainHeader.classList.remove('justify-between'),
                u.headerTitleGroup.classList.add('text-center'),
                u.headerTitleGroup.classList.remove('text-left'),
                u.headerUrlDisplay.classList.add('hidden'),
                (u.headerUrlDisplay.innerHTML = ''),
                ot(),
                Object.values(u.tabContents).forEach((n) => {
                    n && (n.innerHTML = '');
                }));
        else if (t === Ze.RESULTS) {
            let { streams: n } = i;
            if (!n || n.length === 0) return;
            let o = n.length > 1 ? 'comparison' : 'summary';
            (Fi(),
                Vi(),
                te({
                    message: `Analysis Complete for ${n.length} stream(s).`,
                    type: 'pass',
                    duration: 5e3,
                }),
                u.inputSection.classList.add('hidden'),
                u.results.classList.remove('hidden'),
                u.newAnalysisBtn.classList.remove('hidden'),
                u.shareAnalysisBtn.classList.remove('hidden'),
                u.copyDebugBtn.classList.remove('hidden'),
                e && e.classList.remove('hidden'),
                u.mainHeader.classList.remove('justify-center'),
                u.mainHeader.classList.add('justify-between'),
                u.headerTitleGroup.classList.remove('text-center'),
                u.headerTitleGroup.classList.add('text-left'),
                u.headerUrlDisplay.classList.remove('hidden'));
            let a = n
                .map(
                    (s) =>
                        `<div class="truncate" title="${s.originalUrl}">${s.originalUrl}</div>`
                )
                .join('');
            ((u.headerUrlDisplay.innerHTML = `<span class="font-bold text-gray-300 block mb-1">Analyzed Stream(s):</span>${a}`),
                document.querySelector(`[data-tab="${o}"]`).click());
        }
    }
    function pc() {
        (y.subscribe('analysis:started', () => ji(Ze.INPUT)),
            y.subscribe('state:analysis-complete', (t) => ji(Ze.RESULTS, t)),
            y.subscribe('analysis:failed', () => ji(Ze.INPUT)));
    }
    j();
    K();
    Di();
    Ci();
    var Ue = class {
        diff(i, e, n = {}) {
            let o;
            typeof n == 'function'
                ? ((o = n), (n = {}))
                : 'callback' in n && (o = n.callback);
            let a = this.castInput(i, n),
                s = this.castInput(e, n),
                r = this.removeEmpty(this.tokenize(a, n)),
                l = this.removeEmpty(this.tokenize(s, n));
            return this.diffWithOptionsObj(r, l, n, o);
        }
        diffWithOptionsObj(i, e, n, o) {
            var a;
            let s = (I) => {
                    if (((I = this.postProcess(I, n)), o)) {
                        setTimeout(function () {
                            o(I);
                        }, 0);
                        return;
                    } else return I;
                },
                r = e.length,
                l = i.length,
                c = 1,
                p = r + l;
            n.maxEditLength != null && (p = Math.min(p, n.maxEditLength));
            let g = (a = n.timeout) !== null && a !== void 0 ? a : 1 / 0,
                x = Date.now() + g,
                m = [{ oldPos: -1, lastComponent: void 0 }],
                _ = this.extractCommon(m[0], e, i, 0, n);
            if (m[0].oldPos + 1 >= l && _ + 1 >= r)
                return s(this.buildValues(m[0].lastComponent, e, i));
            let b = -1 / 0,
                C = 1 / 0,
                A = () => {
                    for (let I = Math.max(b, -c); I <= Math.min(C, c); I += 2) {
                        let $,
                            w = m[I - 1],
                            M = m[I + 1];
                        w && (m[I - 1] = void 0);
                        let U = !1;
                        if (M) {
                            let E = M.oldPos - I;
                            U = M && 0 <= E && E < r;
                        }
                        let v = w && w.oldPos + 1 < l;
                        if (!U && !v) {
                            m[I] = void 0;
                            continue;
                        }
                        if (
                            (!v || (U && w.oldPos < M.oldPos)
                                ? ($ = this.addToPath(M, !0, !1, 0, n))
                                : ($ = this.addToPath(w, !1, !0, 1, n)),
                            (_ = this.extractCommon($, e, i, I, n)),
                            $.oldPos + 1 >= l && _ + 1 >= r)
                        )
                            return (
                                s(this.buildValues($.lastComponent, e, i)) || !0
                            );
                        ((m[I] = $),
                            $.oldPos + 1 >= l && (C = Math.min(C, I - 1)),
                            _ + 1 >= r && (b = Math.max(b, I + 1)));
                    }
                    c++;
                };
            if (o)
                (function I() {
                    setTimeout(function () {
                        if (c > p || Date.now() > x) return o(void 0);
                        A() || I();
                    }, 0);
                })();
            else
                for (; c <= p && Date.now() <= x; ) {
                    let I = A();
                    if (I) return I;
                }
        }
        addToPath(i, e, n, o, a) {
            let s = i.lastComponent;
            return s && !a.oneChangePerToken && s.added === e && s.removed === n
                ? {
                      oldPos: i.oldPos + o,
                      lastComponent: {
                          count: s.count + 1,
                          added: e,
                          removed: n,
                          previousComponent: s.previousComponent,
                      },
                  }
                : {
                      oldPos: i.oldPos + o,
                      lastComponent: {
                          count: 1,
                          added: e,
                          removed: n,
                          previousComponent: s,
                      },
                  };
        }
        extractCommon(i, e, n, o, a) {
            let s = e.length,
                r = n.length,
                l = i.oldPos,
                c = l - o,
                p = 0;
            for (
                ;
                c + 1 < s && l + 1 < r && this.equals(n[l + 1], e[c + 1], a);

            )
                (c++,
                    l++,
                    p++,
                    a.oneChangePerToken &&
                        (i.lastComponent = {
                            count: 1,
                            previousComponent: i.lastComponent,
                            added: !1,
                            removed: !1,
                        }));
            return (
                p &&
                    !a.oneChangePerToken &&
                    (i.lastComponent = {
                        count: p,
                        previousComponent: i.lastComponent,
                        added: !1,
                        removed: !1,
                    }),
                (i.oldPos = l),
                c
            );
        }
        equals(i, e, n) {
            return n.comparator
                ? n.comparator(i, e)
                : i === e ||
                      (!!n.ignoreCase && i.toLowerCase() === e.toLowerCase());
        }
        removeEmpty(i) {
            let e = [];
            for (let n = 0; n < i.length; n++) i[n] && e.push(i[n]);
            return e;
        }
        castInput(i, e) {
            return i;
        }
        tokenize(i, e) {
            return Array.from(i);
        }
        join(i) {
            return i.join('');
        }
        postProcess(i, e) {
            return i;
        }
        get useLongestToken() {
            return !1;
        }
        buildValues(i, e, n) {
            let o = [],
                a;
            for (; i; )
                (o.push(i),
                    (a = i.previousComponent),
                    delete i.previousComponent,
                    (i = a));
            o.reverse();
            let s = o.length,
                r = 0,
                l = 0,
                c = 0;
            for (; r < s; r++) {
                let p = o[r];
                if (p.removed)
                    ((p.value = this.join(n.slice(c, c + p.count))),
                        (c += p.count));
                else {
                    if (!p.added && this.useLongestToken) {
                        let g = e.slice(l, l + p.count);
                        ((g = g.map(function (x, m) {
                            let _ = n[c + m];
                            return _.length > x.length ? _ : x;
                        })),
                            (p.value = this.join(g)));
                    } else p.value = this.join(e.slice(l, l + p.count));
                    ((l += p.count), p.added || (c += p.count));
                }
            }
            return o;
        }
    };
    function Gi(t, i) {
        let e;
        for (e = 0; e < t.length && e < i.length; e++)
            if (t[e] != i[e]) return t.slice(0, e);
        return t.slice(0, e);
    }
    function Wi(t, i) {
        let e;
        if (!t || !i || t[t.length - 1] != i[i.length - 1]) return '';
        for (e = 0; e < t.length && e < i.length; e++)
            if (t[t.length - (e + 1)] != i[i.length - (e + 1)])
                return t.slice(-e);
        return t.slice(-e);
    }
    function wt(t, i, e) {
        if (t.slice(0, i.length) != i)
            throw Error(
                `string ${JSON.stringify(t)} doesn't start with prefix ${JSON.stringify(i)}; this is a bug`
            );
        return e + t.slice(i.length);
    }
    function Ut(t, i, e) {
        if (!i) return t + e;
        if (t.slice(-i.length) != i)
            throw Error(
                `string ${JSON.stringify(t)} doesn't end with suffix ${JSON.stringify(i)}; this is a bug`
            );
        return t.slice(0, -i.length) + e;
    }
    function ke(t, i) {
        return wt(t, i, '');
    }
    function et(t, i) {
        return Ut(t, i, '');
    }
    function qi(t, i) {
        return i.slice(0, rp(t, i));
    }
    function rp(t, i) {
        let e = 0;
        t.length > i.length && (e = t.length - i.length);
        let n = i.length;
        t.length < i.length && (n = t.length);
        let o = Array(n),
            a = 0;
        o[0] = 0;
        for (let s = 1; s < n; s++) {
            for (
                i[s] == i[a] ? (o[s] = o[a]) : (o[s] = a);
                a > 0 && i[s] != i[a];

            )
                a = o[a];
            i[s] == i[a] && a++;
        }
        a = 0;
        for (let s = e; s < t.length; s++) {
            for (; a > 0 && t[s] != i[a]; ) a = o[a];
            t[s] == i[a] && a++;
        }
        return a;
    }
    function Re(t) {
        let i;
        for (i = t.length - 1; i >= 0 && t[i].match(/\s/); i--);
        return t.substring(i + 1);
    }
    function ae(t) {
        let i = t.match(/^\s*/);
        return i ? i[0] : '';
    }
    var kt =
            'a-zA-Z0-9_\\u{C0}-\\u{FF}\\u{D8}-\\u{F6}\\u{F8}-\\u{2C6}\\u{2C8}-\\u{2D7}\\u{2DE}-\\u{2FF}\\u{1E00}-\\u{1EFF}',
        lp = new RegExp(`[${kt}]+|\\s+|[^${kt}]`, 'ug'),
        Yi = class extends Ue {
            equals(i, e, n) {
                return (
                    n.ignoreCase &&
                        ((i = i.toLowerCase()), (e = e.toLowerCase())),
                    i.trim() === e.trim()
                );
            }
            tokenize(i, e = {}) {
                let n;
                if (e.intlSegmenter) {
                    let s = e.intlSegmenter;
                    if (s.resolvedOptions().granularity != 'word')
                        throw new Error(
                            'The segmenter passed must have a granularity of "word"'
                        );
                    n = Array.from(s.segment(i), (r) => r.segment);
                } else n = i.match(lp) || [];
                let o = [],
                    a = null;
                return (
                    n.forEach((s) => {
                        (/\s/.test(s)
                            ? a == null
                                ? o.push(s)
                                : o.push(o.pop() + s)
                            : a != null && /\s/.test(a)
                              ? o[o.length - 1] == a
                                  ? o.push(o.pop() + s)
                                  : o.push(a + s)
                              : o.push(s),
                            (a = s));
                    }),
                    o
                );
            }
            join(i) {
                return i
                    .map((e, n) => (n == 0 ? e : e.replace(/^\s+/, '')))
                    .join('');
            }
            postProcess(i, e) {
                if (!i || e.oneChangePerToken) return i;
                let n = null,
                    o = null,
                    a = null;
                return (
                    i.forEach((s) => {
                        s.added
                            ? (o = s)
                            : s.removed
                              ? (a = s)
                              : ((o || a) && mc(n, a, o, s),
                                (n = s),
                                (o = null),
                                (a = null));
                    }),
                    (o || a) && mc(n, a, o, null),
                    i
                );
            }
        },
        uc = new Yi();
    function Ji(t, i, e) {
        return e?.ignoreWhitespace != null && !e.ignoreWhitespace
            ? hc(t, i, e)
            : uc.diff(t, i, e);
    }
    function mc(t, i, e, n) {
        if (i && e) {
            let o = ae(i.value),
                a = Re(i.value),
                s = ae(e.value),
                r = Re(e.value);
            if (t) {
                let l = Gi(o, s);
                ((t.value = Ut(t.value, s, l)),
                    (i.value = ke(i.value, l)),
                    (e.value = ke(e.value, l)));
            }
            if (n) {
                let l = Wi(a, r);
                ((n.value = wt(n.value, r, l)),
                    (i.value = et(i.value, l)),
                    (e.value = et(e.value, l)));
            }
        } else if (e) {
            if (t) {
                let o = ae(e.value);
                e.value = e.value.substring(o.length);
            }
            if (n) {
                let o = ae(n.value);
                n.value = n.value.substring(o.length);
            }
        } else if (t && n) {
            let o = ae(n.value),
                a = ae(i.value),
                s = Re(i.value),
                r = Gi(o, a);
            i.value = ke(i.value, r);
            let l = Wi(ke(o, r), s);
            ((i.value = et(i.value, l)),
                (n.value = wt(n.value, o, l)),
                (t.value = Ut(t.value, o, o.slice(0, o.length - l.length))));
        } else if (n) {
            let o = ae(n.value),
                a = Re(i.value),
                s = qi(a, o);
            i.value = et(i.value, s);
        } else if (t) {
            let o = Re(t.value),
                a = ae(i.value),
                s = qi(o, a);
            i.value = ke(i.value, s);
        }
    }
    var Ki = class extends Ue {
            tokenize(i) {
                let e = new RegExp(
                    `(\\r?\\n)|[${kt}]+|[^\\S\\n\\r]+|[^${kt}]`,
                    'ug'
                );
                return i.match(e) || [];
            }
        },
        gc = new Ki();
    function hc(t, i, e) {
        return gc.diff(t, i, e);
    }
    bi();
    function xc(t, i, e) {
        let n = Ji(t, i),
            o = '',
            a = e === 'dash' ? De : ht;
        return (
            n.forEach((s) => {
                if (s.removed) return;
                let r = a(s.value);
                s.added
                    ? (o += `<span class="bg-emerald-500/40 text-green-50 rounded-sm font-medium">${r}</span>`)
                    : (o += r);
            }),
            o
        );
    }
    var nn = Fc(Ec());
    function Tp(t, i) {
        if (!Array.isArray(i)) return !1;
        if (!t)
            return i.some((n) => n.status === 'fail' || n.status === 'warn');
        let e = new Set(
            t
                .filter((n) => n.status === 'fail' || n.status === 'warn')
                .map((n) => n.id)
        );
        return i.some(
            (n) => (n.status === 'fail' || n.status === 'warn') && !e.has(n.id)
        );
    }
    function Cp(t) {
        return {
            ...t,
            mediaPlaylists: new Map(t.mediaPlaylists),
            manifestUpdates: [...t.manifestUpdates],
            semanticData: new Map(t.semanticData),
            featureAnalysis: {
                ...t.featureAnalysis,
                results: new Map(t.featureAnalysis.results),
            },
            hlsVariantState: new Map(
                Array.from(t.hlsVariantState.entries()).map(([e, n]) => [
                    e,
                    { ...n },
                ])
            ),
            dashRepresentationState: new Map(
                Array.from(t.dashRepresentationState.entries()).map(
                    ([e, n]) => [
                        e,
                        {
                            ...n,
                            segments: [...n.segments],
                            freshSegmentUrls: new Set(n.freshSegmentUrls),
                        },
                    ]
                )
            ),
        };
    }
    function Ip(t, i, e) {
        ((t.rawManifest = i),
            (t.manifest = e),
            t.featureAnalysis.manifestCount++);
    }
    function Ep(t) {
        let i = Id(t.manifest, t.protocol, t.manifest.serializedManifest);
        Object.entries(i).forEach(([e, n]) => {
            let o = t.featureAnalysis.results.get(e);
            n.used && (!o || !o.used)
                ? t.featureAnalysis.results.set(e, {
                      used: !0,
                      details: n.details,
                  })
                : o ||
                  t.featureAnalysis.results.set(e, {
                      used: n.used,
                      details: n.details,
                  });
        });
    }
    function Ap(t, i, e, n, o) {
        let a = i,
            s = e;
        t.protocol === 'dash' &&
            ((a = (0, nn.default)(i, {
                indentation: '  ',
                lineSeparator: `
`,
            })),
            (s = (0, nn.default)(e, {
                indentation: '  ',
                lineSeparator: `
`,
            })));
        let r = xc(a, s, t.protocol),
            l = t.manifestUpdates[0]?.complianceResults,
            c = Tp(l, n),
            p = {
                timestamp: new Date().toLocaleTimeString(),
                diffHtml: r,
                complianceResults: n,
                hasNewIssues: c,
                serializedManifest: o,
            };
        (t.manifestUpdates.unshift(p),
            t.manifestUpdates.length > 20 && t.manifestUpdates.pop());
    }
    function Dp(t) {
        let i = St(t.manifest.serializedManifest, t.baseUrl);
        Object.entries(i).forEach(([e, n]) => {
            let o = t.dashRepresentationState.get(e);
            if (o) {
                let a = new Set(o.segments.map((s) => s.resolvedUrl));
                (n.forEach((s) => {
                    a.has(s.resolvedUrl) || o.segments.push(s);
                }),
                    (o.freshSegmentUrls = new Set(
                        n.map((s) => s.resolvedUrl)
                    )));
            }
        });
    }
    function $p(t) {
        if (t.manifest.serializedManifest.isMaster) return;
        let i = t.hlsVariantState.get(t.originalUrl);
        if (i) {
            let e = t.manifest.serializedManifest;
            ((i.segments = e.segments || []),
                (i.freshSegmentUrls = new Set(
                    i.segments.map((n) => n.resolvedUrl)
                )));
        }
    }
    function Pp(t) {
        let {
                streamId: i,
                newManifestString: e,
                newManifestObject: n,
                oldManifestString: o,
                complianceResults: a,
                serializedManifest: s,
            } = t,
            r = S.getState().streams.findIndex((g) => g.id === i);
        if (r === -1) return;
        let l = S.getState().streams,
            c = Cp(l[r]);
        if (c.protocol === 'unknown') return;
        let p = c;
        (Ip(c, e, n),
            Ep(p),
            Ap(p, o, e, a, s),
            p.protocol === 'dash' ? Dp(p) : p.protocol === 'hls' && $p(p),
            S.setState((g) => ({
                streams: g.streams.map((x, m) => (m === r ? c : x)),
            })),
            y.dispatch('stream:data-updated', { streamId: i }));
    }
    function Ac() {
        y.subscribe('livestream:manifest-updated', Pp);
    }
    j();
    K();
    j();
    var Lt = new Worker('/dist/worker.js', { type: 'module' }),
        on = 0;
    Lt.onmessage = (t) => {
        let { type: i, payload: e } = t.data;
        switch (i) {
            case 'analysis-complete': {
                let n = e.streams;
                G.completeAnalysis(n);
                let o = performance.now();
                console.log(
                    `[DEBUG] Total Analysis Pipeline (success): ${(o - on).toFixed(2)}ms`
                );
                break;
            }
            case 'analysis-error': {
                y.dispatch('analysis:error', {
                    message: e.message,
                    error: e.error,
                });
                break;
            }
            case 'analysis-failed': {
                y.dispatch('analysis:failed');
                let n = performance.now();
                console.log(
                    `[DEBUG] Total Analysis Pipeline (failed): ${(n - on).toFixed(2)}ms`
                );
                break;
            }
            case 'status-update': {
                y.dispatch('ui:show-status', {
                    message: e.message,
                    type: 'info',
                    duration: 2e3,
                });
                break;
            }
        }
    };
    async function wp(t) {
        ((on = performance.now()),
            console.log('[DEBUG] Starting analysis pipeline...'),
            y.dispatch('analysis:started'));
        let i = [];
        for (let e of t)
            try {
                self.postMessage({
                    type: 'status-update',
                    payload: { message: `Fetching ${e.url || e.file.name}...` },
                });
                let n = '';
                if (e.url) {
                    let o = await fetch(e.url);
                    if (!o.ok) {
                        y.dispatch('analysis:error', {
                            message: `HTTP Error ${o.status} for ${e.url}`,
                        });
                        continue;
                    }
                    n = await o.text();
                } else n = await e.file.text();
                i.push({ ...e, manifestString: n });
            } catch (n) {
                y.dispatch('analysis:error', {
                    message: `Failed to fetch or read input: ${n.message}`,
                });
            }
        i.length > 0
            ? (console.log(
                  `[DEBUG] Pre-processing complete. Dispatching ${i.length} stream(s) to worker.`
              ),
              Lt.postMessage({
                  type: 'start-analysis',
                  payload: { inputs: i },
              }))
            : y.dispatch('analysis:failed');
    }
    async function Dc({ streamId: t, url: i, isReload: e = !1 }) {
        let n = S.getState().streams.find((o) => o.id === t);
        if (n) {
            if (i === 'master') {
                let o = n.mediaPlaylists.get('master');
                o &&
                    G.updateStream(t, {
                        manifest: o.manifest,
                        activeMediaPlaylistUrl: null,
                    });
                return;
            }
            if (n.mediaPlaylists.has(i) && !e) {
                let o = n.mediaPlaylists.get(i);
                G.updateStream(t, {
                    manifest: o.manifest,
                    activeMediaPlaylistUrl: i,
                });
                return;
            }
            (y.dispatch('ui:show-status', {
                message: 'Fetching HLS media playlist...',
                type: 'info',
            }),
                Lt.postMessage({
                    type: 'fetch-hls-media-playlist',
                    payload: {
                        streamId: t,
                        url: i,
                        hlsDefinedVariables: n.hlsDefinedVariables,
                    },
                }));
        }
    }
    Lt.addEventListener('message', (t) => {
        let { type: i, payload: e } = t.data;
        if (i === 'hls-media-playlist-fetched') {
            let { streamId: n, url: o, manifest: a, rawManifest: s } = e,
                r = S.getState().streams.find((l) => l.id === n);
            if (r) {
                let l = new Map(r.mediaPlaylists);
                (l.set(o, {
                    manifest: a,
                    rawManifest: s,
                    lastFetched: new Date(),
                }),
                    G.updateStream(n, {
                        mediaPlaylists: l,
                        manifest: a,
                        activeMediaPlaylistUrl: o,
                    }),
                    y.dispatch('ui:show-status', {
                        message: 'Media playlist loaded.',
                        type: 'pass',
                    }));
            }
        } else
            i === 'hls-media-playlist-error' &&
                (console.error(
                    'Failed to fetch or parse media playlist in worker:',
                    e.error
                ),
                y.dispatch('ui:show-status', {
                    message: `Failed to load media playlist: ${e.error}`,
                    type: 'fail',
                }));
    });
    y.subscribe('analysis:request', ({ inputs: t }) => wp(t));
    y.subscribe('hls:media-playlist-activate', ({ streamId: t, url: i }) =>
        Dc({ streamId: t, url: i, isReload: !1 })
    );
    y.subscribe('hls:media-playlist-reload', ({ streamId: t, url: i }) =>
        Dc({ streamId: t, url: i, isReload: !0 })
    );
    j();
    K();
    var an = new Worker('/dist/worker.js', { type: 'module' });
    an.onmessage = (t) => {
        let { url: i, parsedData: e, error: n } = t.data,
            { segmentCache: o } = S.getState(),
            a = o.get(i);
        if (!a) return;
        let s = { status: n ? 500 : a.status, data: a.data, parsedData: e };
        (o.set(i, s), y.dispatch('segment:loaded', { url: i, entry: s }));
    };
    an.onerror = (t) => {
        console.error('An error occurred in the parsing worker:', t);
    };
    async function Up(t) {
        let { segmentCache: i } = S.getState();
        if (i.has(t) && i.get(t).status !== -1) {
            y.dispatch('segment:loaded', { url: t, entry: i.get(t) });
            return;
        }
        try {
            let e = { status: -1, data: null, parsedData: null };
            (i.set(t, e), y.dispatch('segment:pending', { url: t }));
            let n = await fetch(t, { method: 'GET', cache: 'no-store' }),
                o = n.ok ? await n.arrayBuffer() : null,
                a = { status: n.status, data: o, parsedData: null };
            if ((i.set(t, a), o))
                an.postMessage({
                    type: 'parse-segment',
                    payload: { url: t, data: o },
                });
            else {
                let s = {
                    status: n.status,
                    data: null,
                    parsedData: { error: `HTTP ${n.status}` },
                };
                (i.set(t, s),
                    y.dispatch('segment:loaded', { url: t, entry: s }));
            }
        } catch (e) {
            console.error(`Failed to fetch segment ${t}:`, e);
            let n = { status: 0, data: null, parsedData: { error: e.message } };
            (i.set(t, n), y.dispatch('segment:loaded', { url: t, entry: n }));
        }
    }
    y.subscribe('segment:fetch', ({ url: t }) => Up(t));
    var $c = 'dash_analyzer_history',
        kp = 'dash_analyzer_presets',
        Pc = 10;
    function Rp() {
        let t = S.getState().streams;
        if (t.length === 0) return;
        let i = new URL(window.location.origin + window.location.pathname);
        (t.forEach((e) => {
            e.originalUrl && i.searchParams.append('url', e.originalUrl);
        }),
            navigator.clipboard
                .writeText(i.href)
                .then(() => {
                    te({
                        message: 'Shareable URL copied to clipboard!',
                        type: 'pass',
                    });
                })
                .catch((e) => {
                    (console.error('Failed to copy URL: ', e),
                        te({
                            message: 'Failed to copy URL to clipboard.',
                            type: 'fail',
                        }));
                }));
    }
    function Mp() {
        let t = S.getState(),
            i = (e, n) =>
                n instanceof Map
                    ? { __dataType: 'Map', value: Array.from(n.entries()) }
                    : n instanceof Set
                      ? { __dataType: 'Set', value: Array.from(n.values()) }
                      : e === 'serializedManifest'
                        ? '[Circular/ParsedObject]'
                        : n;
        try {
            let e = { timestamp: new Date().toISOString(), appState: t },
                n = JSON.stringify(e, i, 2);
            navigator.clipboard
                .writeText(n)
                .then(() => {
                    te({
                        message: 'Debug info copied to clipboard!',
                        type: 'pass',
                    });
                })
                .catch((o) => {
                    (console.error('Failed to copy debug info:', o),
                        te({
                            message: 'Failed to copy debug info.',
                            type: 'fail',
                        }));
                });
        } catch (e) {
            (console.error('Error serializing debug state:', e),
                te({ message: 'Error creating debug info.', type: 'fail' }));
        }
    }
    function Lp() {
        (u.addStreamBtn.addEventListener('click', () => {
            (Kt(), Oe());
        }),
            u.analyzeBtn.addEventListener('click', Hp),
            u.tabs.addEventListener('click', Zd),
            u.newAnalysisBtn.addEventListener('click', () => {
                (oc(), y.dispatch('analysis:started'));
            }),
            u.contextSwitcher.addEventListener('change', async (t) => {
                let i = t.target;
                G.setActiveStreamId(parseInt(i.value, 10));
            }),
            u.shareAnalysisBtn.addEventListener('click', Rp),
            u.copyDebugBtn.addEventListener('click', Mp));
    }
    function Bp(t) {
        if (
            !t ||
            !t.originalUrl ||
            JSON.parse(localStorage.getItem(kp) || '[]').some(
                (o) => o.url === t.originalUrl
            )
        )
            return;
        let n = JSON.parse(localStorage.getItem($c) || '[]');
        ((n = n.filter((o) => o.url !== t.originalUrl)),
            n.unshift({
                name: t.name,
                url: t.originalUrl,
                protocol: t.protocol,
                type: t.manifest?.type === 'dynamic' ? 'live' : 'vod',
            }),
            n.length > Pc && (n.length = Pc),
            localStorage.setItem($c, JSON.stringify(n)));
    }
    function Hp() {
        let t = u.streamInputs.querySelectorAll('.stream-input-group'),
            i = Array.from(t)
                .map((e) => {
                    let n = parseInt(e.dataset.id),
                        o = e.querySelector('.input-url'),
                        a = e.querySelector('.input-file');
                    return {
                        id: n,
                        url: o.value,
                        file: a.files.length > 0 ? a.files[0] : null,
                    };
                })
                .filter((e) => e.url || e.file);
        i.length > 0
            ? y.dispatch('analysis:request', { inputs: i })
            : te({
                  message: 'Please provide a stream URL or file to analyze.',
                  type: 'warn',
              });
    }
    function zp() {
        (y.subscribe('state:analysis-complete', ({ streams: t }) => {
            t.length > 0 && Bp(t[0]);
        }),
            y.subscribe('analysis:error', ({ message: t, error: i }) => {
                (te({ message: t, type: 'fail', duration: 8e3 }),
                    console.error('An analysis error occurred:', i));
            }));
    }
    async function Fp() {
        (rn(), zp(), pc(), Ac(), fc());
        let i = new URLSearchParams(window.location.search).getAll('url');
        if ((Lp(), ln(), ec(), cc(), nc(), i.length > 0 && i[0])) {
            let e = i.map((n, o) => ({ id: o, url: n, file: null }));
            y.dispatch('analysis:request', { inputs: e });
        } else ot();
    }
    document.addEventListener('DOMContentLoaded', Fp);
})();
/*! Bundled license information:

lit-html/lit-html.js:
lit-html/directive.js:
lit-html/directives/unsafe-html.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
