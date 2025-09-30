(() => {
    var Ho = Object.create;
    var As = Object.defineProperty;
    var zo = Object.getOwnPropertyDescriptor;
    var Xo = Object.getOwnPropertyNames;
    var Vo = Object.getPrototypeOf,
        jo = Object.prototype.hasOwnProperty;
    var Rs = (e, s) => () => (
        s || e((s = { exports: {} }).exports, s),
        s.exports
    );
    var Go = (e, s, t, i) => {
        if ((s && typeof s == 'object') || typeof s == 'function')
            for (let n of Xo(s))
                !jo.call(e, n) &&
                    n !== t &&
                    As(e, n, {
                        get: () => s[n],
                        enumerable: !(i = zo(s, n)) || i.enumerable,
                    });
        return e;
    };
    var qo = (e, s, t) => (
        (t = e != null ? Ho(Vo(e)) : {}),
        Go(
            s || !e || !e.__esModule
                ? As(t, 'default', { value: e, enumerable: !0 })
                : t,
            e
        )
    );
    var ko = Rs(($e, Ts) => {
        'use strict';
        Object.defineProperty($e, '__esModule', { value: !0 });
        $e.ParsingError = void 0;
        var ge = class extends Error {
            constructor(s, t) {
                (super(s), (this.cause = t));
            }
        };
        $e.ParsingError = ge;
        var M;
        function $o() {
            return Do(!1) || Cl() || Po() || El() || Is();
        }
        function _o() {
            return (X(/\s*/), Do(!0) || Po() || Il() || Is());
        }
        function Tl() {
            let e = Is(),
                s = [],
                t,
                i = _o();
            for (; i; ) {
                if (i.node.type === 'Element') {
                    if (t) throw new Error('Found multiple root nodes');
                    t = i.node;
                }
                (i.excluded || s.push(i.node), (i = _o()));
            }
            if (!t)
                throw new ge('Failed to parse XML', 'Root Element not found');
            if (M.xml.length !== 0)
                throw new ge('Failed to parse XML', 'Not Well-Formed XML');
            return { declaration: e ? e.node : null, root: t, children: s };
        }
        function Is() {
            let e = X(/^<\?([\w-:.]+)\s*/);
            if (!e) return;
            let s = { name: e[1], type: 'ProcessingInstruction', content: '' },
                t = M.xml.indexOf('?>');
            if (t > -1)
                ((s.content = M.xml.substring(0, t).trim()),
                    (M.xml = M.xml.slice(t)));
            else
                throw new ge(
                    'Failed to parse XML',
                    'ProcessingInstruction closing tag not found'
                );
            return (
                X(/\?>/),
                { excluded: M.options.filter(s) === !1, node: s }
            );
        }
        function Do(e) {
            let s = X(/^<([^?!</>\s]+)\s*/);
            if (!s) return;
            let t = {
                    type: 'Element',
                    name: s[1],
                    attributes: {},
                    children: [],
                },
                i = e ? !1 : M.options.filter(t) === !1;
            for (; !(Rl() || Ss('>') || Ss('?>') || Ss('/>')); ) {
                let a = wl();
                if (a) t.attributes[a.name] = a.value;
                else return;
            }
            if (X(/^\s*\/>/))
                return ((t.children = null), { excluded: i, node: t });
            X(/\??>/);
            let n = $o();
            for (; n; ) (n.excluded || t.children.push(n.node), (n = $o()));
            if (M.options.strictMode) {
                let a = `</${t.name}>`;
                if (M.xml.startsWith(a)) M.xml = M.xml.slice(a.length);
                else
                    throw new ge(
                        'Failed to parse XML',
                        `Closing tag not matching "${a}"`
                    );
            } else X(/^<\/[\w-:.\u00C0-\u00FF]+\s*>/);
            return { excluded: i, node: t };
        }
        function Il() {
            let e =
                X(/^<!DOCTYPE\s+\S+\s+SYSTEM[^>]*>/) ||
                X(/^<!DOCTYPE\s+\S+\s+PUBLIC[^>]*>/) ||
                X(/^<!DOCTYPE\s+\S+\s*\[[^\]]*]>/) ||
                X(/^<!DOCTYPE\s+\S+\s*>/);
            if (e) {
                let s = { type: 'DocumentType', content: e[0] };
                return { excluded: M.options.filter(s) === !1, node: s };
            }
        }
        function El() {
            if (M.xml.startsWith('<![CDATA[')) {
                let e = M.xml.indexOf(']]>');
                if (e > -1) {
                    let s = e + 3,
                        t = { type: 'CDATA', content: M.xml.substring(0, s) };
                    return (
                        (M.xml = M.xml.slice(s)),
                        { excluded: M.options.filter(t) === !1, node: t }
                    );
                }
            }
        }
        function Po() {
            let e = X(/^<!--[\s\S]*?-->/);
            if (e) {
                let s = { type: 'Comment', content: e[0] };
                return { excluded: M.options.filter(s) === !1, node: s };
            }
        }
        function Cl() {
            let e = X(/^([^<]+)/);
            if (e) {
                let s = { type: 'Text', content: e[1] };
                return { excluded: M.options.filter(s) === !1, node: s };
            }
        }
        function wl() {
            let e = X(/([^=]+)\s*=\s*("[^"]*"|'[^']*'|[^>\s]+)\s*/);
            if (e) return { name: e[1].trim(), value: Al(e[2].trim()) };
        }
        function Al(e) {
            return e.replace(/^['"]|['"]$/g, '');
        }
        function X(e) {
            let s = M.xml.match(e);
            if (s) return ((M.xml = M.xml.slice(s[0].length)), s);
        }
        function Rl() {
            return M.xml.length === 0;
        }
        function Ss(e) {
            return M.xml.indexOf(e) === 0;
        }
        function Mo(e, s = {}) {
            e = e.trim();
            let t = s.filter || (() => !0);
            return (
                (M = {
                    xml: e,
                    options: Object.assign(Object.assign({}, s), {
                        filter: t,
                        strictMode: s.strictMode === !0,
                    }),
                }),
                Tl()
            );
        }
        typeof Ts < 'u' && typeof $e == 'object' && (Ts.exports = Mo);
        $e.default = Mo;
    });
    var Uo = Rs((_e, Es) => {
        'use strict';
        var $l =
            (_e && _e.__importDefault) ||
            function (e) {
                return e && e.__esModule ? e : { default: e };
            };
        Object.defineProperty(_e, '__esModule', { value: !0 });
        var _l = $l(ko());
        function wt(e) {
            if (!e.options.indentation && !e.options.lineSeparator) return;
            e.content += e.options.lineSeparator;
            let s;
            for (s = 0; s < e.level; s++) e.content += e.options.indentation;
        }
        function Dl(e) {
            e.content = e.content.replace(/ +$/, '');
            let s;
            for (s = 0; s < e.level; s++) e.content += e.options.indentation;
        }
        function Y(e, s) {
            e.content += s;
        }
        function Oo(e, s, t) {
            if (e.type === 'Element') kl(e, s, t);
            else if (e.type === 'ProcessingInstruction') Lo(e, s);
            else if (typeof e.content == 'string') Pl(e.content, s, t);
            else throw new Error('Unknown node type: ' + e.type);
        }
        function Pl(e, s, t) {
            if (!t) {
                let i = e.trim();
                (s.options.lineSeparator || i.length === 0) && (e = i);
            }
            e.length > 0 && (!t && s.content.length > 0 && wt(s), Y(s, e));
        }
        function Ml(e, s) {
            let t = '/' + e.join('/'),
                i = e[e.length - 1];
            return s.includes(i) || s.includes(t);
        }
        function kl(e, s, t) {
            if (
                (s.path.push(e.name),
                !t && s.content.length > 0 && wt(s),
                Y(s, '<' + e.name),
                Ol(s, e.attributes),
                e.children === null ||
                    (s.options.forceSelfClosingEmptyTag &&
                        e.children.length === 0))
            ) {
                let i = s.options.whiteSpaceAtEndOfSelfclosingTag
                    ? ' />'
                    : '/>';
                Y(s, i);
            } else if (e.children.length === 0) Y(s, '></' + e.name + '>');
            else {
                let i = e.children;
                (Y(s, '>'), s.level++);
                let n = e.attributes['xml:space'] === 'preserve' || t,
                    a = !1;
                if (
                    (!n &&
                        s.options.ignoredPaths &&
                        ((a = Ml(s.path, s.options.ignoredPaths)), (n = a)),
                    !n && s.options.collapseContent)
                ) {
                    let r = !1,
                        o = !1,
                        l = !1;
                    (i.forEach(function (d, f) {
                        d.type === 'Text'
                            ? (d.content.includes(`
`)
                                  ? ((o = !0), (d.content = d.content.trim()))
                                  : (f === 0 || f === i.length - 1) &&
                                    !t &&
                                    d.content.trim().length === 0 &&
                                    (d.content = ''),
                              (d.content.trim().length > 0 || i.length === 1) &&
                                  (r = !0))
                            : d.type === 'CDATA'
                              ? (r = !0)
                              : (l = !0);
                    }),
                        r && (!l || !o) && (n = !0));
                }
                (i.forEach(function (r) {
                    Oo(r, s, t || n);
                }),
                    s.level--,
                    !t && !n && wt(s),
                    a && Dl(s),
                    Y(s, '</' + e.name + '>'));
            }
            s.path.pop();
        }
        function Ol(e, s) {
            Object.keys(s).forEach(function (t) {
                let i = s[t].replace(/"/g, '&quot;');
                Y(e, ' ' + t + '="' + i + '"');
            });
        }
        function Lo(e, s) {
            (s.content.length > 0 && wt(s),
                Y(s, '<?' + e.name),
                Y(s, ' ' + e.content.trim()),
                Y(s, '?>'));
        }
        function At(e, s = {}) {
            ((s.indentation = 'indentation' in s ? s.indentation : '    '),
                (s.collapseContent = s.collapseContent === !0),
                (s.lineSeparator =
                    'lineSeparator' in s
                        ? s.lineSeparator
                        : `\r
`),
                (s.whiteSpaceAtEndOfSelfclosingTag =
                    s.whiteSpaceAtEndOfSelfclosingTag === !0),
                (s.throwOnFailure = s.throwOnFailure !== !1));
            try {
                let t = (0, _l.default)(e, {
                        filter: s.filter,
                        strictMode: s.strictMode,
                    }),
                    i = { content: '', level: 0, options: s, path: [] };
                return (
                    t.declaration && Lo(t.declaration, i),
                    t.children.forEach(function (n) {
                        Oo(n, i, !1);
                    }),
                    s.lineSeparator
                        ? i.content
                              .replace(
                                  /\r\n/g,
                                  `
`
                              )
                              .replace(/\n/g, s.lineSeparator)
                        : i.content
                );
            } catch (t) {
                if (s.throwOnFailure) throw t;
                return e;
            }
        }
        At.minify = (e, s = {}) =>
            At(
                e,
                Object.assign(Object.assign({}, s), {
                    indentation: '',
                    lineSeparator: '',
                })
            );
        typeof Es < 'u' && typeof _e == 'object' && (Es.exports = At);
        _e.default = At;
    });
    var b = {
            streams: [],
            activeStreamId: null,
            activeSegmentUrl: null,
            segmentFreshnessChecker: null,
            streamIdCounter: 0,
            segmentCache: new Map(),
            segmentsForCompare: [],
            decodedSamples: new Map(),
            activeByteMap: new Map(),
        },
        g = {};
    function $s() {
        ((g.mainHeader = document.getElementById('main-header')),
            (g.headerTitleGroup =
                document.getElementById('header-title-group')),
            (g.headerUrlDisplay =
                document.getElementById('header-url-display')),
            (g.streamInputs = document.getElementById('stream-inputs')),
            (g.addStreamBtn = document.getElementById('add-stream-btn')),
            (g.analyzeBtn = document.getElementById('analyze-btn')),
            (g.status = document.getElementById('status')),
            (g.toastContainer = document.getElementById('toast-container')),
            (g.results = document.getElementById('results')),
            (g.inputSection = document.getElementById('input-section')),
            (g.newAnalysisBtn = document.getElementById('new-analysis-btn')),
            (g.shareAnalysisBtn =
                document.getElementById('share-analysis-btn')),
            (g.tabs = document.getElementById('tabs')),
            (g.contextSwitcherWrapper = document.getElementById(
                'context-switcher-wrapper'
            )),
            (g.contextSwitcher = document.getElementById('context-switcher')),
            (g.tabContents = {
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
            (g.segmentModal = document.getElementById('segment-modal')),
            (g.modalTitle = document.getElementById('modal-title')),
            (g.modalSegmentUrl = document.getElementById('modal-segment-url')),
            (g.modalContentArea =
                document.getElementById('modal-content-area')),
            (g.closeModalBtn = document.getElementById('close-modal-btn')),
            (g.globalTooltip = document.getElementById('global-tooltip')));
    }
    function _s() {
        (document.body.addEventListener('mouseover', (e) => {
            let t = e.target.closest('[data-tooltip]');
            if (!t) {
                ((g.globalTooltip.style.visibility = 'hidden'),
                    (g.globalTooltip.style.opacity = '0'));
                return;
            }
            let i = t.dataset.tooltip || '',
                n = t.dataset.iso || '';
            if (!i) return;
            let a = `${i}${n ? `<span class="block mt-1 font-medium text-emerald-300">${n}</span>` : ''}`;
            g.globalTooltip.innerHTML = a;
            let r = t.getBoundingClientRect(),
                o = g.globalTooltip.getBoundingClientRect(),
                l = r.left + r.width / 2 - o.width / 2;
            (l < 10 && (l = 10),
                l + o.width > window.innerWidth - 10 &&
                    (l = window.innerWidth - o.width - 10),
                (g.globalTooltip.style.left = `${l}px`),
                (g.globalTooltip.style.top = `${r.top - o.height - 8}px`),
                (g.globalTooltip.style.visibility = 'visible'),
                (g.globalTooltip.style.opacity = '1'));
        }),
            document.body.addEventListener('mouseout', (e) => {
                let s = e.target,
                    t = e.relatedTarget,
                    i = s.closest('[data-tooltip]');
                i &&
                    !i.contains(t) &&
                    ((g.globalTooltip.style.visibility = 'hidden'),
                    (g.globalTooltip.style.opacity = '0'));
            }));
    }
    var $t = class {
            constructor() {
                this.listeners = {};
            }
            subscribe(s, t) {
                return (
                    this.listeners[s] || (this.listeners[s] = []),
                    this.listeners[s].push(t),
                    () => {
                        this.listeners[s] = this.listeners[s].filter(
                            (i) => i !== t
                        );
                    }
                );
            }
            dispatch(s, t) {
                this.listeners[s] && this.listeners[s].forEach((i) => i(t));
            }
        },
        T = new $t();
    var Lt = globalThis,
        We = Lt.trustedTypes,
        Ds = We
            ? We.createPolicy('lit-html', { createHTML: (e) => e })
            : void 0,
        Us = '$lit$',
        te = `lit$${Math.random().toFixed(9).slice(2)}$`,
        Fs = '?' + te,
        Ko = `<${Fs}>`,
        oe = document,
        Pe = () => oe.createComment(''),
        Me = (e) =>
            e === null || (typeof e != 'object' && typeof e != 'function'),
        Ut = Array.isArray,
        Wo = (e) => Ut(e) || typeof e?.[Symbol.iterator] == 'function',
        _t = `[ 	
\f\r]`,
        De = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,
        Ps = /-->/g,
        Ms = />/g,
        ne = RegExp(
            `>|${_t}(?:([^\\s"'>=/]+)(${_t}*=${_t}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,
            'g'
        ),
        ks = /'/g,
        Os = /"/g,
        Bs = /^(?:script|style|textarea|title)$/i,
        Ft =
            (e) =>
            (s, ...t) => ({ _$litType$: e, strings: s, values: t }),
        c = Ft(1),
        Yl = Ft(2),
        Jl = Ft(3),
        re = Symbol.for('lit-noChange'),
        O = Symbol.for('lit-nothing'),
        Ls = new WeakMap(),
        ae = oe.createTreeWalker(oe, 129);
    function Ns(e, s) {
        if (!Ut(e) || !e.hasOwnProperty('raw'))
            throw Error('invalid template strings array');
        return Ds !== void 0 ? Ds.createHTML(s) : s;
    }
    var Yo = (e, s) => {
            let t = e.length - 1,
                i = [],
                n,
                a = s === 2 ? '<svg>' : s === 3 ? '<math>' : '',
                r = De;
            for (let o = 0; o < t; o++) {
                let l = e[o],
                    d,
                    f,
                    m = -1,
                    p = 0;
                for (
                    ;
                    p < l.length &&
                    ((r.lastIndex = p), (f = r.exec(l)), f !== null);

                )
                    ((p = r.lastIndex),
                        r === De
                            ? f[1] === '!--'
                                ? (r = Ps)
                                : f[1] !== void 0
                                  ? (r = Ms)
                                  : f[2] !== void 0
                                    ? (Bs.test(f[2]) &&
                                          (n = RegExp('</' + f[2], 'g')),
                                      (r = ne))
                                    : f[3] !== void 0 && (r = ne)
                            : r === ne
                              ? f[0] === '>'
                                  ? ((r = n ?? De), (m = -1))
                                  : f[1] === void 0
                                    ? (m = -2)
                                    : ((m = r.lastIndex - f[2].length),
                                      (d = f[1]),
                                      (r =
                                          f[3] === void 0
                                              ? ne
                                              : f[3] === '"'
                                                ? Os
                                                : ks))
                              : r === Os || r === ks
                                ? (r = ne)
                                : r === Ps || r === Ms
                                  ? (r = De)
                                  : ((r = ne), (n = void 0)));
                let u = r === ne && e[o + 1].startsWith('/>') ? ' ' : '';
                a +=
                    r === De
                        ? l + Ko
                        : m >= 0
                          ? (i.push(d),
                            l.slice(0, m) + Us + l.slice(m) + te + u)
                          : l + te + (m === -2 ? o : u);
            }
            return [
                Ns(
                    e,
                    a +
                        (e[t] || '<?>') +
                        (s === 2 ? '</svg>' : s === 3 ? '</math>' : '')
                ),
                i,
            ];
        },
        ke = class e {
            constructor({ strings: s, _$litType$: t }, i) {
                let n;
                this.parts = [];
                let a = 0,
                    r = 0,
                    o = s.length - 1,
                    l = this.parts,
                    [d, f] = Yo(s, t);
                if (
                    ((this.el = e.createElement(d, i)),
                    (ae.currentNode = this.el.content),
                    t === 2 || t === 3)
                ) {
                    let m = this.el.content.firstChild;
                    m.replaceWith(...m.childNodes);
                }
                for (; (n = ae.nextNode()) !== null && l.length < o; ) {
                    if (n.nodeType === 1) {
                        if (n.hasAttributes())
                            for (let m of n.getAttributeNames())
                                if (m.endsWith(Us)) {
                                    let p = f[r++],
                                        u = n.getAttribute(m).split(te),
                                        h = /([.?@])?(.*)/.exec(p);
                                    (l.push({
                                        type: 1,
                                        index: a,
                                        name: h[2],
                                        strings: u,
                                        ctor:
                                            h[1] === '.'
                                                ? Pt
                                                : h[1] === '?'
                                                  ? Mt
                                                  : h[1] === '@'
                                                    ? kt
                                                    : xe,
                                    }),
                                        n.removeAttribute(m));
                                } else
                                    m.startsWith(te) &&
                                        (l.push({ type: 6, index: a }),
                                        n.removeAttribute(m));
                        if (Bs.test(n.tagName)) {
                            let m = n.textContent.split(te),
                                p = m.length - 1;
                            if (p > 0) {
                                n.textContent = We ? We.emptyScript : '';
                                for (let u = 0; u < p; u++)
                                    (n.append(m[u], Pe()),
                                        ae.nextNode(),
                                        l.push({ type: 2, index: ++a }));
                                n.append(m[p], Pe());
                            }
                        }
                    } else if (n.nodeType === 8)
                        if (n.data === Fs) l.push({ type: 2, index: a });
                        else {
                            let m = -1;
                            for (; (m = n.data.indexOf(te, m + 1)) !== -1; )
                                (l.push({ type: 7, index: a }),
                                    (m += te.length - 1));
                        }
                    a++;
                }
            }
            static createElement(s, t) {
                let i = oe.createElement('template');
                return ((i.innerHTML = s), i);
            }
        };
    function ye(e, s, t = e, i) {
        if (s === re) return s;
        let n = i !== void 0 ? t._$Co?.[i] : t._$Cl,
            a = Me(s) ? void 0 : s._$litDirective$;
        return (
            n?.constructor !== a &&
                (n?._$AO?.(!1),
                a === void 0 ? (n = void 0) : ((n = new a(e)), n._$AT(e, t, i)),
                i !== void 0 ? ((t._$Co ??= [])[i] = n) : (t._$Cl = n)),
            n !== void 0 && (s = ye(e, n._$AS(e, s.values), n, i)),
            s
        );
    }
    var Dt = class {
            constructor(s, t) {
                ((this._$AV = []),
                    (this._$AN = void 0),
                    (this._$AD = s),
                    (this._$AM = t));
            }
            get parentNode() {
                return this._$AM.parentNode;
            }
            get _$AU() {
                return this._$AM._$AU;
            }
            u(s) {
                let {
                        el: { content: t },
                        parts: i,
                    } = this._$AD,
                    n = (s?.creationScope ?? oe).importNode(t, !0);
                ae.currentNode = n;
                let a = ae.nextNode(),
                    r = 0,
                    o = 0,
                    l = i[0];
                for (; l !== void 0; ) {
                    if (r === l.index) {
                        let d;
                        (l.type === 2
                            ? (d = new Oe(a, a.nextSibling, this, s))
                            : l.type === 1
                              ? (d = new l.ctor(a, l.name, l.strings, this, s))
                              : l.type === 6 && (d = new Ot(a, this, s)),
                            this._$AV.push(d),
                            (l = i[++o]));
                    }
                    r !== l?.index && ((a = ae.nextNode()), r++);
                }
                return ((ae.currentNode = oe), n);
            }
            p(s) {
                let t = 0;
                for (let i of this._$AV)
                    (i !== void 0 &&
                        (i.strings !== void 0
                            ? (i._$AI(s, i, t), (t += i.strings.length - 2))
                            : i._$AI(s[t])),
                        t++);
            }
        },
        Oe = class e {
            get _$AU() {
                return this._$AM?._$AU ?? this._$Cv;
            }
            constructor(s, t, i, n) {
                ((this.type = 2),
                    (this._$AH = O),
                    (this._$AN = void 0),
                    (this._$AA = s),
                    (this._$AB = t),
                    (this._$AM = i),
                    (this.options = n),
                    (this._$Cv = n?.isConnected ?? !0));
            }
            get parentNode() {
                let s = this._$AA.parentNode,
                    t = this._$AM;
                return (
                    t !== void 0 && s?.nodeType === 11 && (s = t.parentNode),
                    s
                );
            }
            get startNode() {
                return this._$AA;
            }
            get endNode() {
                return this._$AB;
            }
            _$AI(s, t = this) {
                ((s = ye(this, s, t)),
                    Me(s)
                        ? s === O || s == null || s === ''
                            ? (this._$AH !== O && this._$AR(), (this._$AH = O))
                            : s !== this._$AH && s !== re && this._(s)
                        : s._$litType$ !== void 0
                          ? this.$(s)
                          : s.nodeType !== void 0
                            ? this.T(s)
                            : Wo(s)
                              ? this.k(s)
                              : this._(s));
            }
            O(s) {
                return this._$AA.parentNode.insertBefore(s, this._$AB);
            }
            T(s) {
                this._$AH !== s && (this._$AR(), (this._$AH = this.O(s)));
            }
            _(s) {
                (this._$AH !== O && Me(this._$AH)
                    ? (this._$AA.nextSibling.data = s)
                    : this.T(oe.createTextNode(s)),
                    (this._$AH = s));
            }
            $(s) {
                let { values: t, _$litType$: i } = s,
                    n =
                        typeof i == 'number'
                            ? this._$AC(s)
                            : (i.el === void 0 &&
                                  (i.el = ke.createElement(
                                      Ns(i.h, i.h[0]),
                                      this.options
                                  )),
                              i);
                if (this._$AH?._$AD === n) this._$AH.p(t);
                else {
                    let a = new Dt(n, this),
                        r = a.u(this.options);
                    (a.p(t), this.T(r), (this._$AH = a));
                }
            }
            _$AC(s) {
                let t = Ls.get(s.strings);
                return (t === void 0 && Ls.set(s.strings, (t = new ke(s))), t);
            }
            k(s) {
                Ut(this._$AH) || ((this._$AH = []), this._$AR());
                let t = this._$AH,
                    i,
                    n = 0;
                for (let a of s)
                    (n === t.length
                        ? t.push(
                              (i = new e(
                                  this.O(Pe()),
                                  this.O(Pe()),
                                  this,
                                  this.options
                              ))
                          )
                        : (i = t[n]),
                        i._$AI(a),
                        n++);
                n < t.length &&
                    (this._$AR(i && i._$AB.nextSibling, n), (t.length = n));
            }
            _$AR(s = this._$AA.nextSibling, t) {
                for (this._$AP?.(!1, !0, t); s !== this._$AB; ) {
                    let i = s.nextSibling;
                    (s.remove(), (s = i));
                }
            }
            setConnected(s) {
                this._$AM === void 0 && ((this._$Cv = s), this._$AP?.(s));
            }
        },
        xe = class {
            get tagName() {
                return this.element.tagName;
            }
            get _$AU() {
                return this._$AM._$AU;
            }
            constructor(s, t, i, n, a) {
                ((this.type = 1),
                    (this._$AH = O),
                    (this._$AN = void 0),
                    (this.element = s),
                    (this.name = t),
                    (this._$AM = n),
                    (this.options = a),
                    i.length > 2 || i[0] !== '' || i[1] !== ''
                        ? ((this._$AH = Array(i.length - 1).fill(new String())),
                          (this.strings = i))
                        : (this._$AH = O));
            }
            _$AI(s, t = this, i, n) {
                let a = this.strings,
                    r = !1;
                if (a === void 0)
                    ((s = ye(this, s, t, 0)),
                        (r = !Me(s) || (s !== this._$AH && s !== re)),
                        r && (this._$AH = s));
                else {
                    let o = s,
                        l,
                        d;
                    for (s = a[0], l = 0; l < a.length - 1; l++)
                        ((d = ye(this, o[i + l], t, l)),
                            d === re && (d = this._$AH[l]),
                            (r ||= !Me(d) || d !== this._$AH[l]),
                            d === O
                                ? (s = O)
                                : s !== O && (s += (d ?? '') + a[l + 1]),
                            (this._$AH[l] = d));
                }
                r && !n && this.j(s);
            }
            j(s) {
                s === O
                    ? this.element.removeAttribute(this.name)
                    : this.element.setAttribute(this.name, s ?? '');
            }
        },
        Pt = class extends xe {
            constructor() {
                (super(...arguments), (this.type = 3));
            }
            j(s) {
                this.element[this.name] = s === O ? void 0 : s;
            }
        },
        Mt = class extends xe {
            constructor() {
                (super(...arguments), (this.type = 4));
            }
            j(s) {
                this.element.toggleAttribute(this.name, !!s && s !== O);
            }
        },
        kt = class extends xe {
            constructor(s, t, i, n, a) {
                (super(s, t, i, n, a), (this.type = 5));
            }
            _$AI(s, t = this) {
                if ((s = ye(this, s, t, 0) ?? O) === re) return;
                let i = this._$AH,
                    n =
                        (s === O && i !== O) ||
                        s.capture !== i.capture ||
                        s.once !== i.once ||
                        s.passive !== i.passive,
                    a = s !== O && (i === O || n);
                (n && this.element.removeEventListener(this.name, this, i),
                    a && this.element.addEventListener(this.name, this, s),
                    (this._$AH = s));
            }
            handleEvent(s) {
                typeof this._$AH == 'function'
                    ? this._$AH.call(this.options?.host ?? this.element, s)
                    : this._$AH.handleEvent(s);
            }
        },
        Ot = class {
            constructor(s, t, i) {
                ((this.element = s),
                    (this.type = 6),
                    (this._$AN = void 0),
                    (this._$AM = t),
                    (this.options = i));
            }
            get _$AU() {
                return this._$AM._$AU;
            }
            _$AI(s) {
                ye(this, s);
            }
        };
    var Jo = Lt.litHtmlPolyfillSupport;
    (Jo?.(ke, Oe), (Lt.litHtmlVersions ??= []).push('3.3.1'));
    var R = (e, s, t) => {
        let i = t?.renderBefore ?? s,
            n = i._$litPart$;
        if (n === void 0) {
            let a = t?.renderBefore ?? null;
            i._$litPart$ = n = new Oe(
                s.insertBefore(Pe(), a),
                a,
                void 0,
                t ?? {}
            );
        }
        return (n._$AI(e), n);
    };
    var Hs = [
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
    var Qo = 'dash_analyzer_history',
        Bt = 'dash_analyzer_presets',
        zs = 50,
        le = [],
        Ye = (e, s) =>
            e
                ? c`<span
        class="text-xs font-semibold px-2 py-0.5 rounded-full ${s}"
        >${e.toUpperCase()}</span
    >`
                : '',
        Vs = (e) => {
            let s =
                    e.protocol === 'dash'
                        ? Ye('DASH', 'bg-blue-800 text-blue-200')
                        : e.protocol === 'hls'
                          ? Ye('HLS', 'bg-purple-800 text-purple-200')
                          : '',
                t =
                    e.type === 'live'
                        ? Ye('LIVE', 'bg-red-800 text-red-200')
                        : e.type === 'vod'
                          ? Ye('VOD', 'bg-green-800 text-green-200')
                          : '';
            return c`<li
        class="px-3 py-2 hover:bg-gray-700 cursor-pointer flex justify-between items-center"
        data-url="${e.url}"
        data-name="${e.name}"
        @click=${sr}
    >
        <div class="flex flex-col min-w-0">
            <span
                class="font-semibold text-gray-200 truncate"
                title="${e.name}"
                >${e.name}</span
            >
            <span
                class="text-xs text-gray-400 font-mono truncate"
                title="${e.url}"
                >${e.url}</span
            >
        </div>
        <div class="flex-shrink-0 flex gap-2 ml-4">
            ${s} ${t}
        </div>
    </li>`;
        },
        Xs = (e, s) =>
            !s || s.length === 0
                ? ''
                : c`<div>
        <h4
            class="font-bold text-gray-200 text-xs tracking-wider uppercase px-3 pt-3 pb-2 sticky top-0 bg-gray-900 z-10 border-b border-gray-800/50"
        >
            ${e}
        </h4>
        <ul class="divide-y divide-gray-700/50">
            ${s.map(Vs)}
        </ul>
    </div>`,
        Zo = (e, s) =>
            !s || s.length === 0
                ? ''
                : c`<div>
        <h5 class="font-medium text-gray-400 px-3 pt-2 pb-1">${e}</h5>
        <ul class="divide-y divide-gray-700/50">
            ${s.map(Vs)}
        </ul>
    </div>`,
        er = (e, s, t, i) => {
            let n = t.filter((x) => x.name && x.url),
                a = i.filter((x) => x.name && x.url),
                r = new Set(a.map((x) => x.url)),
                o = Hs.reduce(
                    (x, C) => {
                        let { protocol: E, type: y } = C;
                        return (
                            x[E] || (x[E] = {}),
                            x[E][y] || (x[E][y] = []),
                            x[E][y].push(C),
                            x
                        );
                    },
                    { dash: {}, hls: {} }
                ),
                l = (x) => {
                    let C = x.target.closest('.stream-input-group');
                    if (C) {
                        let E = parseInt(C.dataset.id);
                        ((le = le.filter((y) => y !== E)), Le());
                    }
                },
                d = (x) => {
                    let C = x.target,
                        y = C.closest('.stream-input-group').querySelector(
                            '.save-preset-btn'
                        ),
                        I = C.value.trim();
                    y.disabled = r.has(I) || I === '';
                },
                f = (x, C) => {
                    let E = x.querySelector('.preset-dropdown');
                    E && E.classList.toggle('hidden', !C);
                },
                m = (x) => {
                    f(x.currentTarget.closest('.stream-input-group'), !0);
                },
                p,
                u = (x) => {
                    let C = x.currentTarget.closest('.stream-input-group');
                    p = setTimeout(() => {
                        f(C, !1);
                    }, 150);
                },
                h = () => clearTimeout(p);
            return c` <div
        data-testid="stream-input-group"
        class="stream-input-group ${s ? '' : 'border-t border-gray-700 pt-6 mt-6'}"
        data-id="${e}"
    >
        <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold text-gray-300">
                Stream ${le.indexOf(e) + 1}
            </h3>
            ${
                s
                    ? ''
                    : c`<button
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
                @focusin=${m}
                @focusout=${u}
            >
                <div class="flex flex-col md:flex-row items-center gap-4">
                    <input
                        type="url"
                        id="url-${e}"
                        class="input-url w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter Manifest URL or click to see presets..."
                        .value=${s && n.length > 0 ? n[0].url : ''}
                        @input=${d}
                        autocomplete="off"
                    />
                    <label
                        for="file-${e}"
                        class="block w-full md:w-auto cursor-pointer bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md text-center flex-shrink-0"
                        >Upload File</label
                    >
                    <input
                        type="file"
                        id="file-${e}"
                        class="input-file hidden"
                        accept=".mpd, .xml, .m3u8"
                        @change=${tr}
                    />
                </div>

                <!-- Dropdown Menu -->
                <div
                    class="preset-dropdown hidden absolute top-full left-0 right-0 mt-2 z-30 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto"
                    @focusin=${h}
                >
                    ${Xs('Recent', n)}
                    ${Xs('Saved', a)}
                    <div>
                        <h4
                            class="font-bold text-gray-200 text-xs tracking-wider uppercase px-3 pt-3 pb-2 sticky top-0 bg-gray-900 z-10 border-b border-gray-800/50"
                        >
                            Examples
                        </h4>
                        <div class="p-2">
                            ${Object.entries(o).map(
                                ([x, C]) => c`
                                    <div class="mt-2">
                                        <h5
                                            class="font-semibold text-gray-300 text-sm px-3 py-2 bg-gray-900/50 rounded-t-md"
                                        >
                                            ${x.toUpperCase()}
                                        </h5>
                                        <div
                                            class="border border-t-0 border-gray-700/50 rounded-b-md"
                                        >
                                            ${Object.entries(C).map(([E, y]) => Zo(`${E.charAt(0).toUpperCase()}${E.slice(1)}`, y))}
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
                    id="name-${e}"
                    class="input-name w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600"
                    placeholder="Enter a custom name to save this URL"
                />
                <button
                    class="save-preset-btn w-full sm:w-auto flex-shrink-0 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    @click=${ir}
                    ?disabled=${r.has(s && n.length > 0 ? n[0].url : '')}
                >
                    Save as Preset
                </button>
            </div>
        </div>
    </div>`;
        },
        tr = (e) => {
            let s = e.target,
                t = s.closest('.stream-input-group');
            if (s.files[0]) {
                t.querySelector('.input-url').value = '';
                let i = t.querySelector('.preset-dropdown');
                i && i.classList.add('hidden');
            }
        },
        sr = (e) => {
            let s = e.currentTarget,
                t = s.closest('.stream-input-group'),
                i = t.querySelector('.input-url');
            s.dataset.url &&
                ((i.value = s.dataset.url),
                (t.querySelector('.input-name').value = s.dataset.name || ''),
                (t.querySelector('.input-file').value = ''),
                i.dispatchEvent(new Event('input', { bubbles: !0 })));
            let n = t.querySelector('.preset-dropdown');
            n && n.classList.add('hidden');
        },
        ir = (e) => {
            let t = e.target.closest('.stream-input-group'),
                i = t.querySelector('.input-name'),
                n = t.querySelector('.input-url'),
                a = i.value.trim(),
                r = n.value.trim();
            if (!a || !r) {
                alert(
                    'Please provide both a URL and a custom name to save a preset.'
                );
                return;
            }
            let o = JSON.parse(localStorage.getItem(Bt) || '[]');
            o = o.filter((d) => d.url !== r);
            let l = r.includes('.m3u8') ? 'hls' : 'dash';
            (o.unshift({ name: a, url: r, protocol: l, type: null }),
                o.length > zs && (o.length = zs),
                localStorage.setItem(Bt, JSON.stringify(o)),
                (i.value = ''),
                alert(`Preset "${a}" saved!`),
                Le());
        };
    function Nt() {
        le.push(b.streamIdCounter++);
    }
    function Le() {
        let e = JSON.parse(localStorage.getItem(Qo) || '[]'),
            s = JSON.parse(localStorage.getItem(Bt) || '[]'),
            t = c`${le.map((i, n) => er(i, n === 0, e, s))}`;
        (R(t, g.streamInputs),
            (g.analyzeBtn.textContent =
                le.length > 1 ? 'Analyze & Compare' : 'Analyze'));
    }
    function Je() {
        ((b.streamIdCounter = 0), (le = []), Nt(), Le());
    }
    var v = class {
        constructor(s, t) {
            ((this.box = s),
                (this.view = t),
                (this.offset = s.headerSize),
                (this.stopped = !1));
        }
        addIssue(s, t) {
            (this.box.issues || (this.box.issues = []),
                this.box.issues.push({ type: s, message: t }));
        }
        checkBounds(s) {
            return this.stopped
                ? !1
                : this.offset + s > this.view.byteLength
                  ? (this.addIssue(
                        'error',
                        `Read attempt for ${s} bytes at offset ${this.offset} would exceed box '${this.box.type}' size of ${this.view.byteLength}. The box is truncated.`
                    ),
                    (this.stopped = !0),
                    !1)
                  : !0;
        }
        readUint32(s) {
            if (!this.checkBounds(4)) return null;
            let t = this.view.getUint32(this.offset);
            return (
                (this.box.details[s] = {
                    value: t,
                    offset: this.box.offset + this.offset,
                    length: 4,
                }),
                (this.offset += 4),
                t
            );
        }
        readBigUint64(s) {
            if (!this.checkBounds(8)) return null;
            let t = this.view.getBigUint64(this.offset);
            return (
                (this.box.details[s] = {
                    value: Number(t),
                    offset: this.box.offset + this.offset,
                    length: 8,
                }),
                (this.offset += 8),
                t
            );
        }
        readUint8(s) {
            if (!this.checkBounds(1)) return null;
            let t = this.view.getUint8(this.offset);
            return (
                (this.box.details[s] = {
                    value: t,
                    offset: this.box.offset + this.offset,
                    length: 1,
                }),
                (this.offset += 1),
                t
            );
        }
        readUint16(s) {
            if (!this.checkBounds(2)) return null;
            let t = this.view.getUint16(this.offset);
            return (
                (this.box.details[s] = {
                    value: t,
                    offset: this.box.offset + this.offset,
                    length: 2,
                }),
                (this.offset += 2),
                t
            );
        }
        readInt16(s) {
            if (!this.checkBounds(2)) return null;
            let t = this.view.getInt16(this.offset);
            return (
                (this.box.details[s] = {
                    value: t,
                    offset: this.box.offset + this.offset,
                    length: 2,
                }),
                (this.offset += 2),
                t
            );
        }
        readInt32(s) {
            if (!this.checkBounds(4)) return null;
            let t = this.view.getInt32(this.offset);
            return (
                (this.box.details[s] = {
                    value: t,
                    offset: this.box.offset + this.offset,
                    length: 4,
                }),
                (this.offset += 4),
                t
            );
        }
        readString(s, t) {
            if (!this.checkBounds(s)) return null;
            let i = new Uint8Array(
                    this.view.buffer,
                    this.view.byteOffset + this.offset,
                    s
                ),
                n = String.fromCharCode(...i);
            return (
                (this.box.details[t] = {
                    value: n,
                    offset: this.box.offset + this.offset,
                    length: s,
                }),
                (this.offset += s),
                n
            );
        }
        readNullTerminatedString(s) {
            if (this.stopped) return null;
            let t = this.offset,
                i = t;
            for (; i < this.view.byteLength && this.view.getUint8(i) !== 0; )
                i++;
            let n = new Uint8Array(
                    this.view.buffer,
                    this.view.byteOffset + t,
                    i - t
                ),
                a = new TextDecoder('utf-8').decode(n),
                r = i - t + 1;
            return (
                (this.box.details[s] = {
                    value: a,
                    offset: this.box.offset + t,
                    length: r,
                }),
                (this.offset += r),
                a
            );
        }
        readVersionAndFlags() {
            if (!this.checkBounds(4)) return { version: null, flags: null };
            let s = this.view.getUint32(this.offset),
                t = s >> 24,
                i = s & 16777215;
            return (
                (this.box.details.version = {
                    value: t,
                    offset: this.box.offset + this.offset,
                    length: 1,
                }),
                (this.box.details.flags = {
                    value: `0x${i.toString(16).padStart(6, '0')}`,
                    offset: this.box.offset + this.offset,
                    length: 4,
                }),
                (this.offset += 4),
                { version: t, flags: i }
            );
        }
        readRemainingBytes(s) {
            if (this.stopped) return;
            let t = this.view.byteLength - this.offset;
            t > 0 &&
                ((this.box.details[s] = {
                    value: `... ${t} bytes of data ...`,
                    offset: this.box.offset + this.offset,
                    length: t,
                }),
                (this.offset += t));
        }
        skip(s, t = 'reserved') {
            this.checkBounds(s) &&
                ((this.box.details[t] = {
                    value: `${s} bytes`,
                    offset: this.box.offset + this.offset,
                    length: s,
                }),
                (this.offset += s));
        }
        finalize() {
            if (this.stopped) return;
            let s = this.view.byteLength - this.offset;
            s > 0 &&
                this.addIssue(
                    'warn',
                    `${s} extra unparsed bytes found at the end of box '${this.box.type}'.`
                );
        }
    };
    function Ht(e, s) {
        let t = new v(e, s);
        (t.readString(4, 'majorBrand'), t.readUint32('minorVersion'));
        let i = [],
            n = [],
            a = t.offset;
        for (; t.offset < e.size && !t.stopped; ) {
            let r = t.readString(4, `brand_${i.length}`);
            if (r === null) break;
            (i.push(r),
                r.startsWith('cmf') && n.push(r),
                delete e.details[`brand_${i.length - 1}`]);
        }
        (i.length > 0 &&
            (e.details.compatibleBrands = {
                value: i.join(', '),
                offset: e.offset + a,
                length: t.offset - a,
            }),
            n.length > 0 &&
                (e.details.cmafBrands = {
                    value: n.join(', '),
                    offset: 0,
                    length: 0,
                }),
            t.finalize());
    }
    var js = {
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
    function Gs(e, s) {
        let t = new v(e, s),
            { version: i } = t.readVersionAndFlags();
        (i === 1
            ? (t.readBigUint64('creation_time'),
              t.readBigUint64('modification_time'),
              t.readUint32('timescale'),
              t.readBigUint64('duration'))
            : (t.readUint32('creation_time'),
              t.readUint32('modification_time'),
              t.readUint32('timescale'),
              t.readUint32('duration')),
            t.readInt32('rate'),
            t.readInt16('volume'),
            t.skip(10, 'reserved'));
        let n = [];
        for (let a = 0; a < 9; a++) n.push(t.readInt32(`matrix_val_${a}`));
        e.details.matrix = {
            value: `[${n.join(', ')}]`,
            offset: e.details.matrix_val_0.offset,
            length: 36,
        };
        for (let a = 0; a < 9; a++) delete e.details[`matrix_val_${a}`];
        (t.skip(24, 'pre_defined'), t.readUint32('next_track_ID'));
    }
    var qs = {
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
    function Ks(e, s) {
        let t = new v(e, s);
        (t.readVersionAndFlags(), t.readUint32('sequence_number'));
    }
    var Ws = {
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
    function Ys(e, s) {
        let t = new v(e, s),
            { flags: i } = t.readVersionAndFlags();
        if (i === null) {
            t.finalize();
            return;
        }
        if (
            (t.readUint32('track_ID'),
            i & 1 && t.readBigUint64('base_data_offset'),
            i & 2 && t.readUint32('sample_description_index'),
            i & 8 && t.readUint32('default_sample_duration'),
            i & 16 && t.readUint32('default_sample_size'),
            i & 32)
        ) {
            let n = t.readUint32('default_sample_flags_raw');
            n !== null &&
                ((e.details.default_sample_flags = {
                    value: `0x${n.toString(16)}`,
                    offset: e.details.default_sample_flags_raw.offset,
                    length: 4,
                }),
                delete e.details.default_sample_flags_raw);
        }
        t.finalize();
    }
    var Js = {
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
    function Qs(e, s) {
        let t = new v(e, s),
            { version: i } = t.readVersionAndFlags();
        if (i === null) {
            t.finalize();
            return;
        }
        (i === 1
            ? t.readBigUint64('baseMediaDecodeTime')
            : t.readUint32('baseMediaDecodeTime'),
            t.finalize());
    }
    var Zs = {
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
    function ei(e, s) {
        let t = new v(e, s),
            { version: i, flags: n } = t.readVersionAndFlags();
        if (n === null) {
            t.finalize();
            return;
        }
        let a = t.readUint32('sample_count');
        ((e.samples = []), n & 1 && t.readInt32('data_offset'));
        let r = null;
        if (n & 4) {
            let o = t.readUint32('first_sample_flags_dword');
            o !== null &&
                (delete e.details.first_sample_flags_dword,
                (r = o),
                (e.details.first_sample_flags = {
                    value: `0x${r.toString(16)}`,
                    offset:
                        e.details.first_sample_flags_dword?.offset ||
                        t.box.offset + t.offset - 4,
                    length: 4,
                }));
        }
        if (a !== null)
            for (let o = 0; o < a && !t.stopped; o++) {
                let l = {};
                (n & 256 &&
                    ((l.duration = t.view.getUint32(t.offset)),
                    (t.offset += 4)),
                    n & 512 &&
                        ((l.size = t.view.getUint32(t.offset)),
                        (t.offset += 4)),
                    n & 1024 &&
                        ((l.flags = t.view.getUint32(t.offset)),
                        (t.offset += 4)),
                    o === 0 && r !== null && (l.flags = r),
                    n & 2048 &&
                        (i === 0
                            ? (l.compositionTimeOffset = t.view.getUint32(
                                  t.offset
                              ))
                            : (l.compositionTimeOffset = t.view.getInt32(
                                  t.offset
                              )),
                        (t.offset += 4)),
                    e.samples.push(l));
            }
        t.finalize();
    }
    var ti = {
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
    function si(e, s) {
        let t = new v(e, s),
            { version: i } = t.readVersionAndFlags();
        if (i === null) {
            t.finalize();
            return;
        }
        (t.readUint32('reference_ID'),
            t.readUint32('timescale'),
            i === 1
                ? (t.readBigUint64('earliest_presentation_time'),
                  t.readBigUint64('first_offset'))
                : (t.readUint32('earliest_presentation_time'),
                  t.readUint32('first_offset')),
            t.skip(2, 'reserved'));
        let n = t.readUint16('reference_count');
        if (n === null) {
            t.finalize();
            return;
        }
        for (let a = 0; a < n; a++) {
            let r = t.readUint32(`ref_${a + 1}_type_and_size`);
            if (r === null) break;
            let o = (r >> 31) & 1,
                l = r & 2147483647,
                d = e.details[`ref_${a + 1}_type_and_size`]?.offset || 0;
            (delete e.details[`ref_${a + 1}_type_and_size`],
                (e.details[`reference_${a + 1}_type`] = {
                    value: o === 1 ? 'sidx' : 'media',
                    offset: d,
                    length: 4,
                }),
                (e.details[`reference_${a + 1}_size`] = {
                    value: l,
                    offset: d,
                    length: 4,
                }),
                t.readUint32(`reference_${a + 1}_duration`));
            let f = t.readUint32(`sap_info_dword_${a + 1}`);
            f !== null &&
                (delete e.details[`sap_info_dword_${a + 1}`],
                (e.details[`reference_${a + 1}_sap_info`] = {
                    value: `0x${f.toString(16)}`,
                    offset: d + 8,
                    length: 4,
                }));
        }
        t.finalize();
    }
    var ii = {
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
    function ni(e, s) {
        let t = new v(e, s),
            { version: i, flags: n } = t.readVersionAndFlags();
        if (n !== null) {
            delete e.details.flags;
            let f = e.details.version.offset + 1;
            ((e.details.track_enabled = {
                value: (n & 1) === 1,
                offset: f,
                length: 3,
            }),
                (e.details.track_in_movie = {
                    value: (n & 2) === 2,
                    offset: f,
                    length: 3,
                }),
                (e.details.track_in_preview = {
                    value: (n & 4) === 4,
                    offset: f,
                    length: 3,
                }));
        }
        (i === 1
            ? (t.readBigUint64('creation_time'),
              t.readBigUint64('modification_time'))
            : (t.readUint32('creation_time'),
              t.readUint32('modification_time')),
            t.readUint32('track_ID'),
            t.skip(4, 'reserved_1'),
            i === 1 ? t.readBigUint64('duration') : t.readUint32('duration'),
            t.skip(8, 'reserved_2'),
            t.readInt16('layer'),
            t.readInt16('alternate_group'));
        let a = t.readInt16('volume_fixed_point');
        (a !== null &&
            ((e.details.volume = {
                ...e.details.volume_fixed_point,
                value: (a / 256).toFixed(2),
            }),
            delete e.details.volume_fixed_point),
            t.skip(2, 'reserved_3'));
        let r = [];
        for (let f = 0; f < 9; f++) r.push(t.readInt32(`matrix_val_${f}`));
        let o = e.details.matrix_val_0?.offset;
        if (o !== void 0) {
            e.details.matrix = {
                value: `[${r.join(', ')}]`,
                offset: o,
                length: 36,
            };
            for (let f = 0; f < 9; f++) delete e.details[`matrix_val_${f}`];
        }
        let l = t.readUint32('width_fixed_point');
        l !== null &&
            ((e.details.width = {
                ...e.details.width_fixed_point,
                value: (l / 65536).toFixed(2),
            }),
            delete e.details.width_fixed_point);
        let d = t.readUint32('height_fixed_point');
        d !== null &&
            ((e.details.height = {
                ...e.details.height_fixed_point,
                value: (d / 65536).toFixed(2),
            }),
            delete e.details.height_fixed_point);
    }
    var ai = {
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
    function oi(e, s) {
        let t = new v(e, s),
            { version: i } = t.readVersionAndFlags();
        if (i === null) {
            t.finalize();
            return;
        }
        (i === 1
            ? (t.readBigUint64('creation_time'),
              t.readBigUint64('modification_time'))
            : (t.readUint32('creation_time'),
              t.readUint32('modification_time')),
            t.readUint32('timescale'),
            i === 1 ? t.readBigUint64('duration') : t.readUint32('duration'));
        let n = t.readUint16('language_bits');
        if (n !== null) {
            let a = String.fromCharCode(
                ((n >> 10) & 31) + 96,
                ((n >> 5) & 31) + 96,
                (n & 31) + 96
            );
            ((e.details.language = {
                value: a,
                offset: e.details.language_bits.offset,
                length: 2,
            }),
                delete e.details.language_bits);
        }
        (t.skip(2, 'pre-defined'), t.finalize());
    }
    var ri = {
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
    function li(e, s) {
        let t = new v(e, s);
        (t.readVersionAndFlags(),
            t.skip(4, 'pre_defined'),
            t.readString(4, 'handler_type'),
            t.skip(12, 'reserved'),
            t.readNullTerminatedString('name'),
            t.finalize());
    }
    var di = {
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
    function ci(e, s) {
        let t = new v(e, s);
        (t.readVersionAndFlags(), t.readUint16('graphicsmode'));
        let i = t.readUint16('opcolor_r'),
            n = t.readUint16('opcolor_g'),
            a = t.readUint16('opcolor_b');
        if (i !== null && n !== null && a !== null) {
            let r = e.details.opcolor_r.offset;
            (delete e.details.opcolor_r,
                delete e.details.opcolor_g,
                delete e.details.opcolor_b,
                (e.details.opcolor = {
                    value: `R:${i}, G:${n}, B:${a}`,
                    offset: r,
                    length: 6,
                }));
        }
        t.finalize();
    }
    var fi = {
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
    function pi(e, s) {
        let t = new v(e, s);
        (t.readVersionAndFlags(), t.readUint32('entry_count'));
    }
    var mi = {
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
    function ui(e, s) {
        let t = new v(e, s);
        t.readVersionAndFlags();
        let i = t.readUint32('entry_count');
        if (i !== null && i > 0) {
            for (let a = 0; a < i && !t.stopped; a++)
                a < 10
                    ? (t.readUint32(`sample_count_${a + 1}`),
                      t.readUint32(`sample_delta_${a + 1}`))
                    : (t.offset += 8);
            i > 10 &&
                (e.details['...more_entries'] = {
                    value: `${i - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        t.finalize();
    }
    var hi = {
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
    function gi(e, s) {
        let t = new v(e, s);
        t.readVersionAndFlags();
        let i = t.readUint32('entry_count');
        if (i !== null && i > 0) {
            for (let a = 0; a < i && !t.stopped; a++)
                if (a < 10) {
                    let r = `entry_${a + 1}`;
                    (t.readUint32(`${r}_first_chunk`),
                        t.readUint32(`${r}_samples_per_chunk`),
                        t.readUint32(`${r}_sample_description_index`));
                } else t.offset += 12;
            i > 10 &&
                (e.details['...more_entries'] = {
                    value: `${i - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        t.finalize();
    }
    var yi = {
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
    function xi(e, s) {
        let t = new v(e, s);
        t.readVersionAndFlags();
        let i = t.readUint32('sample_size'),
            n = t.readUint32('sample_count');
        if (i === 0 && n !== null && n > 0) {
            for (let r = 0; r < n && !t.stopped; r++)
                r < 10 ? t.readUint32(`entry_size_${r + 1}`) : (t.offset += 4);
            n > 10 &&
                (e.details['...more_entries'] = {
                    value: `${n - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        t.finalize();
    }
    var vi = {
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
    function bi(e, s) {
        let t = new v(e, s);
        t.readVersionAndFlags();
        let i = t.readUint32('entry_count');
        if (i !== null && i > 0) {
            for (let a = 0; a < i && !t.stopped; a++)
                a < 10
                    ? t.readUint32(`chunk_offset_${a + 1}`)
                    : (t.offset += 4);
            i > 10 &&
                (e.details['...more_entries'] = {
                    value: `${i - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        t.finalize();
    }
    var Si = {
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
    function Ti(e, s) {
        let t = new v(e, s),
            { version: i } = t.readVersionAndFlags();
        if (i === null) {
            t.finalize();
            return;
        }
        let n = t.readUint32('entry_count');
        if (n !== null && n > 0) {
            let r = i === 1 ? 20 : 12;
            for (let o = 0; o < n && !t.stopped; o++)
                if (o < 5) {
                    let l = `entry_${o + 1}`;
                    (i === 1
                        ? (t.readBigUint64(`${l}_segment_duration`),
                          t.readBigInt64(`${l}_media_time`))
                        : (t.readUint32(`${l}_segment_duration`),
                          t.readInt32(`${l}_media_time`)),
                        t.readInt16(`${l}_media_rate_integer`),
                        t.readInt16(`${l}_media_rate_fraction`));
                } else t.offset += r;
            n > 5 &&
                (e.details['...more_entries'] = {
                    value: `${n - 5} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        t.finalize();
    }
    var Ii = {
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
    function Ei(e, s) {
        let t = new v(e, s);
        (t.readVersionAndFlags(),
            t.readUint32('track_ID'),
            t.readUint32('default_sample_description_index'),
            t.readUint32('default_sample_duration'),
            t.readUint32('default_sample_size'));
        let i = t.readUint32('default_sample_flags_raw');
        (i !== null &&
            ((e.details.default_sample_flags = {
                value: `0x${i.toString(16)}`,
                offset: e.details.default_sample_flags_raw.offset,
                length: 4,
            }),
            delete e.details.default_sample_flags_raw),
            t.finalize());
    }
    var Ci = {
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
    var wi = {
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
    var zt = class {
        constructor(s) {
            ((this.buffer = s),
                (this.bytePosition = 0),
                (this.bitPosition = 0));
        }
        readBits(s) {
            let t = 0;
            for (let i = 0; i < s; i++) {
                let a =
                    (this.buffer[this.bytePosition] >> (7 - this.bitPosition)) &
                    1;
                ((t = (t << 1) | a),
                    this.bitPosition++,
                    this.bitPosition === 8 &&
                        ((this.bitPosition = 0), this.bytePosition++));
            }
            return t;
        }
        readUE() {
            let s = 0;
            for (
                ;
                this.bytePosition < this.buffer.length &&
                this.readBits(1) === 0;

            )
                s++;
            if (s === 0) return 0;
            let t = this.readBits(s);
            return (1 << s) - 1 + t;
        }
    };
    function Ai(e) {
        if (e.length < 4) return null;
        let s = new zt(e);
        s.readBits(8);
        let t = s.readBits(8);
        s.readBits(16);
        let i = s.readBits(8);
        if (
            (s.readUE(),
            t === 100 ||
                t === 110 ||
                t === 122 ||
                t === 244 ||
                t === 44 ||
                t === 83 ||
                t === 86 ||
                t === 118 ||
                t === 128 ||
                t === 138)
        ) {
            let m = s.readUE();
            if (
                (m === 3 && s.readBits(1),
                s.readUE(),
                s.readUE(),
                s.readBits(1),
                s.readBits(1))
            ) {
                let u = m !== 3 ? 8 : 12;
                for (let h = 0; h < u; h++)
                    if (s.readBits(1))
                        return {
                            profile_idc: t,
                            level_idc: i,
                            error: 'SPS with scaling matrix not fully parsed.',
                        };
            }
        }
        s.readUE();
        let n = s.readUE();
        if (n === 0) s.readUE();
        else if (n === 1) {
            (s.readBits(1), s.readUE(), s.readUE());
            let m = s.readUE();
            for (let p = 0; p < m; p++) s.readUE();
        }
        (s.readUE(), s.readBits(1));
        let a = s.readUE(),
            r = s.readUE(),
            o = s.readBits(1),
            l = (a + 1) * 16,
            d = (2 - o) * (r + 1) * 16;
        if ((o === 0 && s.readBits(1), s.readBits(1), s.readBits(1))) {
            let m = s.readUE(),
                p = s.readUE(),
                u = s.readUE(),
                h = s.readUE(),
                x = 1,
                C = 2 - o,
                E = l - (m + p) * x;
            d = d - (u + h) * C;
        }
        return { profile_idc: t, level_idc: i, resolution: `${l}x${d}` };
    }
    function Ri(e, s) {
        let t = new v(e, s);
        t.readUint8('configurationVersion');
        let i = t.readUint8('AVCProfileIndication');
        (t.readUint8('profile_compatibility'),
            t.readUint8('AVCLevelIndication'));
        let n = t.readUint8('length_size_byte');
        n !== null &&
            (delete e.details.length_size_byte,
            (e.details.lengthSizeMinusOne = {
                value: n & 3,
                offset: e.offset + t.offset - 1,
                length: 0.25,
            }),
            (e.details.reserved_6_bits = {
                value: (n >> 2) & 63,
                offset: e.offset + t.offset - 1,
                length: 0.75,
            }));
        let a = t.readUint8('sps_count_byte');
        if (a !== null) {
            delete e.details.sps_count_byte;
            let o = a & 31;
            ((e.details.numOfSequenceParameterSets = {
                value: o,
                offset: e.offset + t.offset - 1,
                length: 0.625,
            }),
                (e.details.reserved_3_bits = {
                    value: (a >> 5) & 7,
                    offset: e.offset + t.offset - 1,
                    length: 0.375,
                }));
            for (let l = 0; l < o; l++) {
                let d = t.readUint16(`sps_${l + 1}_length`);
                if (d === null) break;
                let f = t.offset;
                if (t.checkBounds(d)) {
                    let m = new Uint8Array(
                            t.view.buffer,
                            t.view.byteOffset + f,
                            d
                        ),
                        p = Ai(m);
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
                        t.skip(d, `sps_${l + 1}_nal_unit`));
                }
            }
        }
        let r = t.readUint8('numOfPictureParameterSets');
        if (r !== null)
            for (let o = 0; o < r; o++) {
                let l = t.readUint16(`pps_${o + 1}_length`);
                if (l === null) break;
                t.skip(l, `pps_${o + 1}_nal_unit`);
            }
        (t.offset < e.size &&
            (i === 100 || i === 110 || i === 122 || i === 144) &&
            t.readRemainingBytes('profile_specific_extensions'),
            t.finalize());
    }
    var $i = {
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
    var nr = {
            1: 'AAC Main',
            2: 'AAC LC',
            3: 'AAC SSR',
            4: 'AAC LTP',
            5: 'SBR',
            6: 'AAC Scalable',
        },
        ar = {
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
        or = [
            'Custom',
            'Mono (Center)',
            'Stereo (L, R)',
            '3 (L, C, R)',
            '4 (L, C, R, Sur)',
            '5 (L, C, R, Ls, Rs)',
            '5.1 (L, C, R, Ls, Rs, LFE)',
            '7.1 (L, C, R, Ls, Rs, Lcs, Rcs, LFE)',
        ];
    function Qe(e, s) {
        let t = e.offset,
            i = 0,
            n,
            a = 0;
        do {
            if (((n = e.readUint8(`size_byte_${a}`)), n === null)) return null;
            ((i = (i << 7) | (n & 127)), a++);
        } while (n & 128 && a < 4);
        e.box.details[s] = { value: i, offset: e.box.offset + t, length: a };
        for (let r = 0; r < a; r++) delete e.box.details[`size_byte_${r}`];
        return i;
    }
    function _i(e, s) {
        let t = new v(e, s);
        t.readVersionAndFlags();
        let i = t.readUint8('ES_Descriptor_tag');
        if (i !== 3) {
            (t.addIssue(
                'warn',
                `Expected ES_Descriptor tag (0x03), but found ${i}.`
            ),
                t.finalize());
            return;
        }
        let n = Qe(t, 'ES_Descriptor_size');
        if (n === null) {
            t.finalize();
            return;
        }
        let a = t.offset + n;
        if (
            (t.readUint16('ES_ID'),
            t.readUint8('streamDependence_and_priority'),
            t.offset < a && t.readUint8('DecoderConfigDescriptor_tag') === 4)
        ) {
            let o = Qe(t, 'DecoderConfigDescriptor_size'),
                l = t.offset + o;
            if (
                (t.readUint8('objectTypeIndication'),
                t.readUint8('streamType_and_upStream'),
                t.skip(3, 'bufferSizeDB'),
                t.readUint32('maxBitrate'),
                t.readUint32('avgBitrate'),
                t.offset < l && t.readUint8('DecoderSpecificInfo_tag') === 5)
            ) {
                let f = Qe(t, 'DecoderSpecificInfo_size');
                if (f !== null && f >= 2) {
                    let m = t.offset,
                        p = (t.readUint16('AudioSpecificConfig_bits') >>> 0)
                            .toString(2)
                            .padStart(16, '0');
                    delete e.details.AudioSpecificConfig_bits;
                    let u = parseInt(p.substring(0, 5), 2),
                        h = parseInt(p.substring(5, 9), 2),
                        x = parseInt(p.substring(9, 13), 2);
                    ((e.details.decoded_audio_object_type = {
                        value: `${nr[u] || 'Unknown'} (${u})`,
                        offset: t.box.offset + m,
                        length: 0.625,
                    }),
                        (e.details.decoded_sampling_frequency = {
                            value: `${ar[h] || 'Unknown'} (${h})`,
                            offset: t.box.offset + m + 0.625,
                            length: 0.5,
                        }),
                        (e.details.decoded_channel_configuration = {
                            value: `${or[x] || 'Unknown'} (${x})`,
                            offset: t.box.offset + m + 1.125,
                            length: 0.5,
                        }),
                        t.skip(f - 2, 'decoder_specific_info_remains'));
                } else f > 0 && t.skip(f, 'decoder_specific_info_data');
            }
        }
        if (t.offset < a && t.readUint8('SLConfigDescriptor_tag') === 6) {
            let o = Qe(t, 'SLConfigDescriptor_size');
            o !== null &&
                (o === 1
                    ? t.readUint8('predefined')
                    : t.skip(o, 'sl_config_data'));
        }
        t.finalize();
    }
    var Di = {
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
    function Pi(e, s) {
        let t = new v(e, s);
        (t.readVersionAndFlags(),
            t.readInt16('balance'),
            t.skip(2, 'reserved'),
            t.finalize());
    }
    var Mi = {
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
    function ki(e, s) {
        let t = new v(e, s),
            { version: i } = t.readVersionAndFlags();
        if (i === null) {
            t.finalize();
            return;
        }
        let n = [];
        for (let o = 0; o < 16; o++) {
            let l = t.readUint8(`system_id_byte_${o}`);
            if (l === null) {
                t.finalize();
                return;
            }
            n.push(l.toString(16).padStart(2, '0'));
        }
        let a = e.details.system_id_byte_0.offset;
        for (let o = 0; o < 16; o++) delete e.details[`system_id_byte_${o}`];
        if (
            ((e.details['System ID'] = {
                value: n.join('-'),
                offset: a,
                length: 16,
            }),
            i > 0)
        ) {
            let o = t.readUint32('Key ID Count');
            o !== null && t.skip(o * 16, 'Key IDs');
        }
        let r = t.readUint32('Data Size');
        (r !== null && t.skip(r, 'Data'), t.finalize());
    }
    var Oi = {
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
    function Li(e, s) {
        let t = new v(e, s),
            { version: i } = t.readVersionAndFlags();
        if (i === null) {
            t.finalize();
            return;
        }
        let n = t.readUint32('entry_count');
        if (n !== null && n > 0) {
            for (let r = 0; r < n && !t.stopped; r++)
                if (r < 10) {
                    let o = `entry_${r + 1}`;
                    (t.readUint32(`${o}_sample_count`),
                        i === 1
                            ? t.readInt32(`${o}_sample_offset`)
                            : t.readUint32(`${o}_sample_offset`));
                } else t.offset += 8;
            n > 10 &&
                (e.details['...more_entries'] = {
                    value: `${n - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        t.finalize();
    }
    var Ui = {
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
    function Fi(e, s) {
        let t = new v(e, s);
        (t.readVersionAndFlags(), t.skip(3, 'reserved'));
        let i = t.readUint8('field_size'),
            n = t.readUint32('sample_count');
        if (n !== null && n > 0) {
            let a;
            if (i === 4) {
                let r = t.readUint8('entry_size_1_byte');
                r !== null && (a = `(nibbles) ${(r >> 4) & 15}, ${r & 15}`);
            } else
                i === 8
                    ? (a = t.readUint8('entry_size_1'))
                    : i === 16 && (a = t.readUint16('entry_size_1'));
            a !== void 0 && (e.details.entry_size_1.value = a);
        }
        t.finalize();
    }
    var Bi = {
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
    function Ni(e, s) {
        let t = new v(e, s),
            { version: i } = t.readVersionAndFlags();
        if (i === null) {
            t.finalize();
            return;
        }
        (t.readString(4, 'grouping_type'),
            i === 1 && t.readUint32('grouping_type_parameter'));
        let n = t.readUint32('entry_count');
        (n !== null &&
            n > 0 &&
            (t.readUint32('entry_1_sample_count'),
            t.readUint32('entry_1_group_description_index')),
            t.finalize());
    }
    var Hi = {
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
    function zi(e, s) {}
    function de(e, s) {
        let t = new v(e, s),
            i = [];
        for (; t.offset < e.size && !t.stopped; ) {
            let n = t.readUint32(`track_ID_${i.length + 1}`);
            if (n !== null) i.push(n);
            else break;
        }
        ((e.details.track_IDs = {
            value: i.join(', '),
            offset: e.offset + e.headerSize,
            length: e.size - e.headerSize,
        }),
            t.finalize());
    }
    var Xi = {
            hint: de,
            cdsc: de,
            font: de,
            hind: de,
            vdep: de,
            vplx: de,
            subt: de,
        },
        Vi = {
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
    function ji(e, s) {
        let t = new v(e, s),
            { version: i } = t.readVersionAndFlags();
        if (i === null) {
            t.finalize();
            return;
        }
        let n = t.readUint32('entry_count');
        if (n !== null && n > 0) {
            t.readUint32('entry_1_sample_delta');
            let a = t.readUint16('entry_1_subsample_count');
            a !== null &&
                a > 0 &&
                (i === 1
                    ? t.readUint32('subsample_1_size')
                    : t.readUint16('subsample_1_size'));
        }
        t.finalize();
    }
    var Gi = {
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
    function qi(e, s) {
        let t = new v(e, s),
            { flags: i } = t.readVersionAndFlags();
        i !== null &&
            (i & 1) !== 0 &&
            (t.readUint32('aux_info_type'),
            t.readUint32('aux_info_type_parameter'));
        let n = t.readUint8('default_sample_info_size'),
            a = t.readUint32('sample_count');
        if (n === 0 && a !== null && a > 0) {
            for (let o = 0; o < a && !t.stopped; o++)
                o < 10
                    ? t.readUint8(`sample_info_size_${o + 1}`)
                    : (t.offset += 1);
            a > 10 &&
                (e.details['...more_entries'] = {
                    value: `${a - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        t.finalize();
    }
    var Ki = {
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
    function Wi(e, s) {
        let t = new v(e, s),
            { version: i, flags: n } = t.readVersionAndFlags();
        if (i === null) {
            t.finalize();
            return;
        }
        (n & 1) !== 0 && t.skip(8, 'aux_info_type_and_param');
        let a = t.readUint32('entry_count');
        (a !== null &&
            a > 0 &&
            (i === 1 ? t.readBigUint64('offset_1') : t.readUint32('offset_1')),
            t.finalize());
    }
    var Yi = {
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
    function Ji(e, s) {}
    var Qi = {
        sinf: {
            name: 'Protection Scheme Information',
            text: 'A container for all information required to understand the encryption transform applied.',
            ref: 'ISO/IEC 14496-12, 8.12.1',
        },
    };
    function Zi(e, s) {
        let t = new v(e, s);
        (t.readString(4, 'data_format'), t.finalize());
    }
    var en = {
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
    function tn(e, s) {
        let t = new v(e, s);
        (t.readVersionAndFlags(), t.readString(4, 'scheme_type'));
        let i = t.readUint32('scheme_version_raw');
        (i !== null &&
            ((e.details.scheme_version = {
                value: `0x${i.toString(16)}`,
                offset: e.details.scheme_version_raw.offset,
                length: 4,
            }),
            delete e.details.scheme_version_raw),
            t.finalize());
    }
    var sn = {
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
    function nn(e, s) {}
    var an = {
        schi: {
            name: 'Scheme Information Box',
            text: 'A container for boxes with scheme-specific data needed by the protection system.',
            ref: 'ISO/IEC 14496-12, 8.12.6',
        },
    };
    function on(e, s) {
        let t = new v(e, s);
        t.readVersionAndFlags();
        let i = t.readUint32('entry_count');
        if (i !== null && i > 0) {
            let n = [];
            for (let r = 0; r < i && !t.stopped; r++)
                if (r < 10) {
                    let o = t.readUint32(`sample_number_entry_${r + 1}`);
                    o !== null &&
                        (n.push(o),
                        delete e.details[`sample_number_entry_${r + 1}`]);
                } else t.offset += 4;
            i > 0 &&
                (e.details.sample_numbers = {
                    value:
                        n.join(', ') +
                        (i > 10
                            ? `... (${i - 10} more entries not shown but parsed)`
                            : ''),
                    offset: e.offset + t.offset,
                    length: i * 4,
                });
        }
        t.finalize();
    }
    var rn = {
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
    function ln(e, s) {
        let t = new v(e, s),
            { version: i } = t.readVersionAndFlags();
        if (i === null) {
            t.finalize();
            return;
        }
        let n = t.readString(4, 'grouping_type'),
            a = 0;
        (i === 1 && (a = t.readUint32('default_length')),
            i >= 2 && t.readUint32('default_sample_description_index'));
        let r = t.readUint32('entry_count');
        if (r !== null)
            for (let o = 0; o < r && !t.stopped; o++) {
                let l = a;
                if (i === 1 && a === 0) {
                    let m = t.readUint32(`entry_${o + 1}_description_length`);
                    if (m === null) break;
                    l = m;
                }
                let d = `entry_${o + 1}`,
                    f = t.offset;
                switch (n) {
                    case 'roll':
                        (t.readInt16(`${d}_roll_distance`), i === 0 && (l = 2));
                        break;
                    default:
                        i === 0 &&
                            (t.addIssue(
                                'warn',
                                `Cannot determine entry size for unknown grouping_type '${n}' with version 0. Parsing of this box may be incomplete.`
                            ),
                            t.readRemainingBytes('unparsed_sgpd_entries'),
                            (o = r));
                        break;
                }
                l > 0 && t.offset === f && t.skip(l, `${d}_description_data`);
            }
        t.finalize();
    }
    var dn = {
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
    function cn(e, s) {
        let t = new v(e, s),
            { version: i } = t.readVersionAndFlags();
        if (i === null) {
            t.finalize();
            return;
        }
        (i === 1
            ? t.readBigUint64('fragment_duration')
            : t.readUint32('fragment_duration'),
            t.finalize());
    }
    var fn = {
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
    function pn(e, s) {
        let t = new v(e, s);
        t.readVersionAndFlags();
        let i = e.size - t.offset;
        if (
            ((e.details.sample_count = { value: i, offset: 0, length: 0 }),
            i > 0)
        ) {
            for (let a = 0; a < i && !t.stopped; a++) {
                let r = `sample_${a + 1}`;
                if (a < 10) {
                    let o = t.readUint8(`${r}_flags_byte`);
                    if (o === null) break;
                    (delete e.details[`${r}_flags_byte`],
                        (e.details[`${r}_is_leading`] = {
                            value: (o >> 6) & 3,
                            offset: e.offset + t.offset - 1,
                            length: 0.25,
                        }),
                        (e.details[`${r}_sample_depends_on`] = {
                            value: (o >> 4) & 3,
                            offset: e.offset + t.offset - 1,
                            length: 0.25,
                        }),
                        (e.details[`${r}_sample_is_depended_on`] = {
                            value: (o >> 2) & 3,
                            offset: e.offset + t.offset - 1,
                            length: 0.25,
                        }),
                        (e.details[`${r}_sample_has_redundancy`] = {
                            value: o & 3,
                            offset: e.offset + t.offset - 1,
                            length: 0.25,
                        }));
                } else t.offset += 1;
            }
            i > 10 &&
                (e.details['...more_entries'] = {
                    value: `${i - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        t.finalize();
    }
    var mn = {
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
    function un(e, s) {}
    var hn = {
        mfra: {
            name: 'Movie Fragment Random Access',
            text: 'A container for random access information for movie fragments, often found at the end of the file.',
            ref: 'ISO/IEC 14496-12, 8.8.9',
        },
    };
    function gn(e, s) {
        let t = new v(e, s),
            { version: i } = t.readVersionAndFlags();
        if (i === null) {
            t.finalize();
            return;
        }
        t.readUint32('track_ID');
        let n = t.readUint32('length_sizes_raw');
        if (n !== null) {
            let a = ((n >> 4) & 3) + 1,
                r = ((n >> 2) & 3) + 1,
                o = (n & 3) + 1;
            ((e.details.length_sizes = {
                value: `traf=${a}, trun=${r}, sample=${o}`,
                offset: e.details.length_sizes_raw.offset,
                length: 4,
            }),
                delete e.details.length_sizes_raw);
            let l = t.readUint32('number_of_entries');
            l !== null &&
                l > 0 &&
                (i === 1
                    ? (t.readBigUint64('entry_1_time'),
                      t.readBigUint64('entry_1_moof_offset'))
                    : (t.readUint32('entry_1_time'),
                      t.readUint32('entry_1_moof_offset')),
                t.skip(a, 'entry_1_traf_number'),
                t.skip(r, 'entry_1_trun_number'),
                t.skip(o, 'entry_1_sample_number'));
        }
        t.finalize();
    }
    var yn = {
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
    function xn(e, s) {
        let t = new v(e, s);
        (t.readVersionAndFlags(), t.readUint32('size'), t.finalize());
    }
    var vn = {
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
    function bn(e, s) {
        let t = new v(e, s);
        t.readVersionAndFlags();
        let i = 1;
        for (; t.offset < e.size && !t.stopped; ) {
            if (i > 5) {
                e.details['...more_entries'] = {
                    value: 'More entries not shown.',
                    offset: 0,
                    length: 0,
                };
                break;
            }
            let n = `entry_${i}`;
            (t.readUint32(`${n}_rate`),
                t.readUint32(`${n}_initial_delay`),
                i++);
        }
        t.finalize();
    }
    var Sn = {
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
    function Tn(e, s) {
        let t = new v(e, s);
        t.readVersionAndFlags();
        let i = t.readUint16('language_bits');
        if (i !== null) {
            let n = String.fromCharCode(
                ((i >> 10) & 31) + 96,
                ((i >> 5) & 31) + 96,
                (i & 31) + 96
            );
            ((e.details.language = {
                value: n,
                offset: e.details.language_bits.offset,
                length: 2,
            }),
                delete e.details.language_bits);
        }
        (t.readNullTerminatedString('notice'), t.finalize());
    }
    var In = {
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
    function En(e, s) {
        let t = new v(e, s),
            { version: i } = t.readVersionAndFlags();
        if (i === null) {
            t.finalize();
            return;
        }
        (i === 1
            ? (t.readBigUint64('compositionToDTSShift'),
              t.readBigUint64('leastDecodeToDisplayDelta'),
              t.readBigUint64('greatestDecodeToDisplayDelta'),
              t.readBigUint64('compositionStartTime'),
              t.readBigUint64('compositionEndTime'))
            : (t.readUint32('compositionToDTSShift'),
              t.readUint32('leastDecodeToDisplayDelta'),
              t.readUint32('greatestDecodeToDisplayDelta'),
              t.readUint32('compositionStartTime'),
              t.readUint32('compositionEndTime')),
            t.finalize());
    }
    var Cn = {
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
    function wn(e, s) {
        let t = new v(e, s);
        t.readVersionAndFlags();
        let i = (e.size - t.offset) / 2;
        if (
            ((e.details.sample_count = { value: i, offset: 0, length: 0 }),
            i > 0)
        ) {
            for (let a = 0; a < i && !t.stopped; a++)
                a < 10 ? t.readUint16(`priority_${a + 1}`) : (t.offset += 2);
            i > 10 &&
                (e.details['...more_entries'] = {
                    value: `${i - 10} more entries not shown but parsed`,
                    offset: 0,
                    length: 0,
                });
        }
        t.finalize();
    }
    var An = {
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
    function Rn(e, s) {
        let t = new v(e, s),
            { flags: i } = t.readVersionAndFlags();
        (i !== null && (i & 1) === 0 && t.readNullTerminatedString('location'),
            t.finalize());
    }
    function $n(e, s) {
        let t = new v(e, s);
        (t.readVersionAndFlags(),
            t.readNullTerminatedString('name'),
            t.readNullTerminatedString('location'),
            t.finalize());
    }
    var _n = {
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
    function Dn(e, s) {
        let t = new v(e, s);
        (t.skip(6, 'reserved_sample_entry'),
            t.readUint16('data_reference_index'),
            t.skip(2, 'pre_defined_1'),
            t.skip(2, 'reserved_2'),
            t.skip(12, 'pre_defined_2'),
            t.readUint16('width'),
            t.readUint16('height'));
        let i = t.readUint32('horizresolution_fixed_point');
        i !== null &&
            ((e.details.horizresolution = {
                ...e.details.horizresolution_fixed_point,
                value: (i / 65536).toFixed(2) + ' dpi',
            }),
            delete e.details.horizresolution_fixed_point);
        let n = t.readUint32('vertresolution_fixed_point');
        (n !== null &&
            ((e.details.vertresolution = {
                ...e.details.vertresolution_fixed_point,
                value: (n / 65536).toFixed(2) + ' dpi',
            }),
            delete e.details.vertresolution_fixed_point),
            t.readUint32('reserved_3'),
            t.readUint16('frame_count'));
        let a = t.offset;
        if (t.checkBounds(32)) {
            let r = t.view.getUint8(t.offset),
                o = new Uint8Array(
                    t.view.buffer,
                    t.view.byteOffset + t.offset + 1,
                    r
                ),
                l = new TextDecoder().decode(o);
            ((e.details.compressorname = {
                value: l,
                offset: t.box.offset + a,
                length: 32,
            }),
                (t.offset += 32));
        }
        (t.readUint16('depth'), t.readInt16('pre_defined_3'));
    }
    var Pn = {
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
    function Mn(e, s) {
        let t = new v(e, s);
        (t.skip(6, 'reserved_sample_entry'),
            t.readUint16('data_reference_index'),
            t.skip(8, 'reserved_audio_entry_1'),
            t.readUint16('channelcount'),
            t.readUint16('samplesize'),
            t.skip(2, 'pre_defined'),
            t.skip(2, 'reserved_audio_entry_2'));
        let i = t.readUint32('samplerate_fixed_point');
        i !== null &&
            ((e.details.samplerate = {
                ...e.details.samplerate_fixed_point,
                value: i >> 16,
            }),
            delete e.details.samplerate_fixed_point);
    }
    var kn = {
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
    function On(e, s) {
        let t = new v(e, s);
        (t.readUint32('bufferSizeDB'),
            t.readUint32('maxBitrate'),
            t.readUint32('avgBitrate'),
            t.finalize());
    }
    var Ln = {
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
    function Xt(e, s) {
        let t = new v(e, s);
        (t.readRemainingBytes('data'), t.finalize());
    }
    var Un = {
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
    function rr(e, s) {
        let t = e.offset,
            i = 0,
            n,
            a = 0;
        do {
            if (((n = e.readUint8(`size_byte_${a}`)), n === null)) return null;
            ((i = (i << 7) | (n & 127)), a++);
        } while (n & 128 && a < 4);
        e.box.details[s] = { value: i, offset: e.box.offset + t, length: a };
        for (let r = 0; r < a; r++) delete e.box.details[`size_byte_${r}`];
        return i;
    }
    function Fn(e, s) {
        let t = new v(e, s);
        t.readVersionAndFlags();
        let i = t.readUint8('InitialObjectDescriptor_tag');
        if (i !== 2 && i !== 3) {
            (t.addIssue(
                'warn',
                `Expected InitialObjectDescriptor tag (0x02) or ES_Descriptor tag (0x03), but found ${i}.`
            ),
                t.readRemainingBytes('unknown_descriptor_data'),
                t.finalize());
            return;
        }
        if (rr(t, 'InitialObjectDescriptor_size') === null) {
            t.finalize();
            return;
        }
        let a = t.readUint16('objectDescriptorID'),
            r = t.readUint8('ODProfileLevelIndication'),
            o = t.readUint8('sceneProfileLevelIndication'),
            l = t.readUint8('audioProfileLevelIndication'),
            d = t.readUint8('visualProfileLevelIndication'),
            f = t.readUint8('graphicsProfileLevelIndication');
        (t.readRemainingBytes('other_descriptors_data'), t.finalize());
    }
    var Bn = {
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
    function Nn(e, s) {
        let t = new v(e, s);
        (t.readVersionAndFlags(), t.readUint32('track_id'));
    }
    var Hn = {
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
    function zn(e, s) {
        let t = new v(e, s);
        (t.readUint32('hSpacing'), t.readUint32('vSpacing'), t.finalize());
    }
    var Xn = {
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
    function Vn(e, s) {
        let t = new v(e, s),
            i = t.readString(4, 'colour_type');
        if (i === 'nclx') {
            (t.readUint16('colour_primaries'),
                t.readUint16('transfer_characteristics'),
                t.readUint16('matrix_coefficients'));
            let n = t.readUint8('full_range_flag_byte');
            n !== null &&
                (delete e.details.full_range_flag_byte,
                (e.details.full_range_flag = {
                    value: (n >> 7) & 1,
                    offset: t.box.offset + t.offset - 1,
                    length: 0.125,
                }));
        } else
            (i === 'rICC' || i === 'prof') &&
                t.readRemainingBytes('ICC_profile');
        t.finalize();
    }
    var jn = {
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
    function Gn(e, s) {
        new v(e, s).readVersionAndFlags();
    }
    var qn = {
        meta: {
            name: 'Metadata Box',
            text: 'A container for descriptive or annotative metadata.',
            ref: 'ISO/IEC 14496-12, 8.11.1',
        },
    };
    function Kn(e, s) {
        let t = new v(e, s);
        (t.skip(6, 'reserved_sample_entry'),
            t.readUint16('data_reference_index'),
            t.skip(16, 'pre_defined_and_reserved'),
            t.readUint16('width'),
            t.readUint16('height'),
            t.readUint32('horizresolution'),
            t.readUint32('vertresolution'),
            t.readUint32('reserved_3'),
            t.readUint16('frame_count'),
            t.skip(32, 'compressorname'),
            t.readUint16('depth'),
            t.readInt16('pre_defined_3'));
    }
    var Wn = {
        encv: {
            name: 'Encrypted Video Sample Entry',
            text: 'A sample entry wrapper indicating that the video stream is encrypted. It contains a Protection Scheme Information (`sinf`) box.',
            ref: 'ISO/IEC 14496-12, 8.12',
        },
    };
    function Yn(e, s) {
        let t = new v(e, s),
            { flags: i } = t.readVersionAndFlags();
        if (i === null) {
            t.finalize();
            return;
        }
        let n = t.readUint32('sample_count');
        if (((e.samples = []), n !== null))
            for (let r = 0; r < n && !t.stopped; r++) {
                let o = { iv: null, subsamples: [] };
                if (t.checkBounds(8)) {
                    let l = new Uint8Array(
                        t.view.buffer,
                        t.view.byteOffset + t.offset,
                        8
                    );
                    ((o.iv = l), (t.offset += 8));
                } else break;
                if ((i & 2) !== 0 && t.checkBounds(2)) {
                    let l = t.view.getUint16(t.offset);
                    ((o.subsample_count = l), (t.offset += 2));
                    for (let d = 0; d < l; d++)
                        if (t.checkBounds(6)) {
                            let f = t.view.getUint16(t.offset),
                                m = t.view.getUint32(t.offset + 2);
                            (o.subsamples.push({
                                BytesOfClearData: f,
                                BytesOfProtectedData: m,
                            }),
                                (t.offset += 6));
                        } else {
                            t.stopped = !0;
                            break;
                        }
                }
                e.samples.push(o);
            }
        t.finalize();
    }
    var Jn = {
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
    function Qn(e, s) {
        let t = new v(e, s);
        (t.skip(6, 'reserved_sample_entry'),
            t.readUint16('data_reference_index'),
            t.skip(8, 'reserved_audio_entry_1'),
            t.readUint16('channelcount'),
            t.readUint16('samplesize'),
            t.skip(2, 'pre_defined'),
            t.skip(2, 'reserved_audio_entry_2'));
        let i = t.readUint32('samplerate_fixed_point');
        i !== null &&
            ((e.details.samplerate = {
                ...e.details.samplerate_fixed_point,
                value: i >> 16,
            }),
            delete e.details.samplerate_fixed_point);
    }
    var Zn = {
        enca: {
            name: 'Encrypted Audio Sample Entry',
            text: 'A sample entry wrapper indicating that the audio stream is encrypted. It contains a Protection Scheme Information (`sinf`) box.',
            ref: 'ISO/IEC 14496-12, 8.12',
        },
    };
    function ea(e, s) {
        let t = new v(e, s),
            { version: i } = t.readVersionAndFlags();
        if (i === null) {
            t.finalize();
            return;
        }
        if (i === 0) {
            t.skip(2, 'reserved_1');
            let n = t.readUint8('default_isProtected'),
                a = t.readUint8('default_Per_Sample_IV_Size'),
                r = [];
            for (let l = 0; l < 16; l++) {
                let d = t.readUint8(`kid_byte_${l}`);
                if (d !== null) r.push(d.toString(16).padStart(2, '0'));
                else {
                    t.finalize();
                    return;
                }
            }
            let o = e.details.kid_byte_0?.offset;
            if (o !== void 0) {
                e.details.default_KID = {
                    value: r.join(''),
                    offset: o,
                    length: 16,
                };
                for (let l = 0; l < 16; l++) delete e.details[`kid_byte_${l}`];
            }
            if (n === 1 && a === 0) {
                let l = t.readUint8('default_constant_IV_size');
                l !== null && t.skip(l, 'default_constant_IV');
            }
        } else if (i === 1) {
            t.skip(2, 'reserved_1');
            let n = t.readUint8('packed_fields_1');
            (n !== null &&
                (delete e.details.packed_fields_1,
                (e.details.default_crypt_byte_block = {
                    value: (n >> 4) & 15,
                    offset: t.box.offset + t.offset - 1,
                    length: 0.5,
                }),
                (e.details.default_skip_byte_block = {
                    value: n & 15,
                    offset: t.box.offset + t.offset - 1,
                    length: 0.5,
                })),
                t.readUint8('default_isProtected'),
                t.readUint8('default_Per_Sample_IV_Size'));
            let a = [];
            for (let o = 0; o < 16; o++) {
                let l = t.readUint8(`kid_byte_${o}`);
                if (l !== null) a.push(l.toString(16).padStart(2, '0'));
                else {
                    t.finalize();
                    return;
                }
            }
            let r = e.details.kid_byte_0?.offset;
            if (r !== void 0) {
                e.details.default_KID = {
                    value: a.join(''),
                    offset: r,
                    length: 16,
                };
                for (let o = 0; o < 16; o++) delete e.details[`kid_byte_${o}`];
            }
        } else
            (t.addIssue('warn', `Unsupported tenc version ${i}.`),
                t.readRemainingBytes('unsupported_tenc_data'));
        t.finalize();
    }
    var ta = {
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
    function sa(e, s) {
        let t = new v(e, s);
        (t.readVersionAndFlags(),
            t.readRemainingBytes('id3v2_data'),
            t.finalize());
    }
    var ia = {
        ID32: {
            name: 'ID3v2 Metadata Box',
            text: 'A box containing ID3 version 2 metadata tags. This is a common but non-standard box often found in files created by tools like FFmpeg, typically within a `udta` or `meta` box.',
            ref: 'User-defined',
        },
    };
    function na(e, s) {
        let t = new v(e, s),
            { version: i } = t.readVersionAndFlags();
        if (i === null) {
            t.finalize();
            return;
        }
        (i === 1
            ? (t.readUint32('timescale'), t.readBigUint64('presentation_time'))
            : (t.readUint32('timescale'),
              t.readUint32('presentation_time_delta')),
            t.readUint32('event_duration'),
            t.readUint32('id'),
            t.readNullTerminatedString('scheme_id_uri'),
            t.readNullTerminatedString('value'));
        let n = e.size - t.offset;
        (n > 0 && t.skip(n, 'message_data'), t.finalize());
    }
    var aa = {
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
    function lr(e, s) {
        let t = new v(e, s);
        (t.readNullTerminatedString('content_type'),
            t.offset < e.size && t.readNullTerminatedString('content_encoding'),
            t.finalize());
    }
    function dr(e, s) {
        let t = new v(e, s);
        (t.skip(6, 'reserved_sample_entry'),
            t.readUint16('data_reference_index'),
            t.readNullTerminatedString('namespace'),
            t.readNullTerminatedString('schema_location'),
            t.readNullTerminatedString('auxiliary_mime_types'));
    }
    var oa = { stpp: dr, mime: lr },
        ra = {
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
    var Rp = {
            ftyp: Ht,
            styp: Ht,
            mvhd: Gs,
            mfhd: Ks,
            tfhd: Ys,
            tfdt: Qs,
            trun: ei,
            sidx: si,
            tkhd: ni,
            mdhd: oi,
            hdlr: li,
            vmhd: ci,
            smhd: Pi,
            stsd: pi,
            stts: ui,
            ctts: Li,
            stsc: gi,
            stsz: xi,
            stz2: Fi,
            stco: bi,
            elst: Ti,
            trex: Ei,
            pssh: ki,
            avcC: Ri,
            avc1: Dn,
            mp4a: Mn,
            esds: _i,
            btrt: On,
            sbgp: Ni,
            tref: zi,
            ...Xi,
            subs: ji,
            saiz: qi,
            saio: Wi,
            sinf: Ji,
            frma: Zi,
            schm: tn,
            schi: nn,
            stss: on,
            sgpd: ln,
            mehd: cn,
            sdtp: pn,
            mfra: un,
            tfra: gn,
            mfro: xn,
            pdin: bn,
            cprt: Tn,
            cslg: En,
            stdp: wn,
            'url ': Rn,
            'urn ': $n,
            free: Xt,
            skip: Xt,
            iods: Fn,
            trep: Nn,
            pasp: zn,
            colr: Vn,
            meta: Gn,
            encv: Kn,
            senc: Yn,
            enca: Qn,
            tenc: ea,
            ID32: sa,
            emsg: na,
            ...oa,
        },
        cr = {
            ...wi,
            ...js,
            ...Ii,
            ...di,
            ...qs,
            ...Ws,
            ...fn,
            ...Js,
            ...Zs,
            ...ti,
            ...ii,
            ...ai,
            ...ri,
            ...fi,
            ...Mi,
            ...mi,
            ...hi,
            ...Ui,
            ...yi,
            ...vi,
            ...Bi,
            ...Si,
            ...rn,
            ...dn,
            ...Ci,
            ...Oi,
            ...$i,
            ...Pn,
            ...kn,
            ...Di,
            ...Ln,
            ...Hi,
            ...Vi,
            ...Gi,
            ...Ki,
            ...Yi,
            ...Qi,
            ...en,
            ...sn,
            ...an,
            ...mn,
            ...hn,
            ...yn,
            ...vn,
            ...Sn,
            ...In,
            ...Cn,
            ...An,
            ..._n,
            ...Un,
            ...Bn,
            ...Hn,
            ...Xn,
            ...jn,
            ...qn,
            ...Wn,
            ...Jn,
            ...Zn,
            ...ta,
            ...ia,
            ...aa,
            ...ra,
        };
    function Ze() {
        return cr;
    }
    var la = {
            ATTRIBUTE: 1,
            CHILD: 2,
            PROPERTY: 3,
            BOOLEAN_ATTRIBUTE: 4,
            EVENT: 5,
            ELEMENT: 6,
        },
        da =
            (e) =>
            (...s) => ({ _$litDirective$: e, values: s }),
        et = class {
            constructor(s) {}
            get _$AU() {
                return this._$AM._$AU;
            }
            _$AT(s, t, i) {
                ((this._$Ct = s), (this._$AM = t), (this._$Ci = i));
            }
            _$AS(s, t) {
                return this.update(s, t);
            }
            update(s, t) {
                return this.render(...t);
            }
        };
    var Ue = class extends et {
        constructor(s) {
            if ((super(s), (this.it = O), s.type !== la.CHILD))
                throw Error(
                    this.constructor.directiveName +
                        '() can only be used in child bindings'
                );
        }
        render(s) {
            if (s === O || s == null)
                return ((this._t = void 0), (this.it = s));
            if (s === re) return s;
            if (typeof s != 'string')
                throw Error(
                    this.constructor.directiveName +
                        '() called with a non-string value'
                );
            if (s === this.it) return this._t;
            this.it = s;
            let t = [s];
            return (
                (t.raw = t),
                (this._t = {
                    _$litType$: this.constructor.resultType,
                    strings: t,
                    values: [],
                })
            );
        }
    };
    ((Ue.directiveName = 'unsafeHTML'), (Ue.resultType = 1));
    var N = da(Ue);
    function fr(e, s, t, i) {
        let n = '',
            a = '',
            r = '',
            o = Math.ceil((t - s) / 16);
        for (let l = 0; l < o; l++) {
            let d = s + l * 16;
            n += `<div class="text-gray-500 select-none text-right">${d.toString(16).padStart(8, '0').toUpperCase()}</div>`;
            let f = '',
                m = '';
            for (let p = 0; p < 16; p++) {
                let u = d + p;
                if (u < t) {
                    let h = e[u],
                        x = i.get(u),
                        C = x?.color?.bg || '',
                        E = h.toString(16).padStart(2, '0').toUpperCase(),
                        y = `data-byte-offset="${u}" data-box-offset="${x?.box?.offset}"`;
                    f += `<span ${y} class="hex-byte relative ${C}">${E}</span>`;
                    let I =
                        h >= 32 && h <= 126
                            ? String.fromCharCode(h).replace('<', '&lt;')
                            : '.';
                    m += `<span ${y} class="ascii-char relative ${C}">${I}</span>`;
                } else ((f += '<span></span>'), (m += '<span></span>'));
            }
            ((a += `<div class="hex-row">${f}</div>`),
                (r += `<div class="ascii-row">${m}</div>`));
        }
        return { offsets: n, hexes: a, asciis: r };
    }
    var tt = (e, s, t, i, n) => {
        let a = Math.ceil(e.byteLength / i),
            r = (t - 1) * i,
            o = new Uint8Array(e),
            l = Math.min(r + i, o.length),
            { offsets: d, hexes: f, asciis: m } = fr(o, r, l, s);
        return c`
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
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto h-full"
        >
            <div
                class="grid grid-cols-[auto_1fr_auto] gap-x-4 sticky top-0 bg-slate-800 pb-2 mb-2 border-b border-gray-600 z-20"
            >
                <div class="text-gray-400 font-semibold text-right">Offset</div>
                <div class="text-gray-400 font-semibold text-center">
                    Hexadecimal
                </div>
                <div class="text-gray-400 font-semibold text-center">ASCII</div>
            </div>
            <div id="hex-grid-content" class="grid grid-cols-[auto_1fr_auto] gap-x-4">
                <div class="pr-4 leading-loose">${N(d)}</div>
                <div class="hex-content-grid leading-loose">
                    ${N(f)}
                </div>
                <div class="text-cyan-400 ascii-content-grid leading-loose">
                    ${N(m)}
                </div>
            </div>
        </div>
        ${
            a > 1
                ? c`
                  <div class="text-center text-sm text-gray-500 mt-4">
                      Showing bytes ${r} -
                      ${Math.min(r + i - 1, e.byteLength - 1)}
                      of ${e.byteLength} ($
                      {(buffer.byteLength / 1024).toFixed(2)} KB)
                      <button
                          @click=${() => n(-1)}
                          ?disabled=${t === 1}
                          class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1"
                      >
                          &lt;
                      </button>
                      Page ${t} of ${a}
                      <button
                          @click=${() => n(1)}
                          ?disabled=${t === a}
                          class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1"
                      >
                          &gt;
                      </button>
                  </div>
              `
                : ''
        }
    `;
    };
    function pr(e) {
        let s = 2166136261;
        for (let t = 0; t < e.length; t++)
            ((s ^= e.charCodeAt(t)), (s *= 16777619));
        return s >>> 0;
    }
    function Vt(e, s) {
        let i = (pr(s) % 5) * 5,
            a = e.bg.replace(/\/\d+/, `/${20 + i}`);
        return { ...e, bg: a };
    }
    function st(e) {
        let s = new Map(),
            t = { bg: 'bg-gray-700/50' },
            i = (n) => {
                if (n.isChunk) {
                    let l = Vt(n.color, 'Chunk');
                    for (let d = n.offset; d < n.offset + n.size; d++)
                        s.has(d) ||
                            s.set(d, {
                                box: n,
                                fieldName: 'CMAF Chunk',
                                color: l,
                            });
                    if (n.children?.length > 0) for (let d of n.children) i(d);
                    return;
                }
                if (n.children?.length > 0) for (let l of n.children) i(l);
                let a = n.offset + n.headerSize,
                    r = n.offset + n.size,
                    o = Vt(n.color, 'Box Content');
                for (let l = a; l < r; l++)
                    s.has(l) ||
                        s.set(l, {
                            box: n,
                            fieldName: 'Box Content',
                            color: o,
                        });
                if (n.details) {
                    for (let [l, d] of Object.entries(n.details))
                        if (
                            d.offset !== void 0 &&
                            d.length !== void 0 &&
                            d.length > 0
                        ) {
                            let f =
                                    l.includes('reserved') ||
                                    l.includes('Padding') ||
                                    l.includes('pre_defined')
                                        ? t
                                        : Vt(n.color, l),
                                m = Math.ceil(d.length);
                            for (let p = d.offset; p < d.offset + m; p++)
                                s.set(p, { box: n, fieldName: l, color: f });
                        }
                }
            };
        if (e) for (let n of e) i(n);
        return s;
    }
    var jt = 1,
        ca = 1024,
        fa = Ze(),
        pa = [
            { bg: 'bg-red-500/20', border: 'border-red-500' },
            { bg: 'bg-yellow-500/20', border: 'border-yellow-500' },
            { bg: 'bg-green-500/20', border: 'border-green-500' },
            { bg: 'bg-blue-500/20', border: 'border-blue-500' },
            { bg: 'bg-indigo-500/20', border: 'border-indigo-500' },
            { bg: 'bg-purple-500/20', border: 'border-purple-500' },
            { bg: 'bg-pink-500/20', border: 'border-pink-500' },
            { bg: 'bg-teal-500/20', border: 'border-teal-500' },
        ],
        mr = { bg: 'bg-slate-600/20', border: 'border-slate-500' };
    function it(e, s) {
        for (let t of e) {
            if (s(t)) return t;
            if (t.children?.length > 0) {
                let i = it(t.children, s);
                if (i) return i;
            }
        }
        return null;
    }
    function ma(e, s) {
        return !e || !e.boxes
            ? null
            : it(
                  e.boxes,
                  (i) =>
                      i.offset === s && (!i.children || i.children.length === 0)
              ) ||
                  it(e.boxes, (i) => i.offset === s) ||
                  null;
    }
    function ur(e) {
        let s = 0,
            t = (i) => {
                for (let n of i)
                    n.isChunk
                        ? ((n.color = mr), t(n.children))
                        : ((n.color = pa[s % pa.length]),
                          s++,
                          n.children?.length > 0 && t(n.children));
            };
        e && t(e);
    }
    var hr = (e, s) => {
        if (!s || !s.boxes) return null;
        let t = it(s.boxes, (i) => i.type === 'mdhd');
        return t ? t.details?.timescale?.value : null;
    };
    function ua(e) {
        let s = [],
            t = 0;
        for (; t < e.length; ) {
            let i = e[t];
            if (i.type === 'moof' && e[t + 1]?.type === 'mdat') {
                let n = e[t + 1];
                (s.push({
                    isChunk: !0,
                    type: 'CMAF Chunk',
                    offset: i.offset,
                    size: i.size + n.size,
                    children: [i, n],
                }),
                    (t += 2));
            } else (s.push(i), (t += 1));
        }
        return s;
    }
    var gr = () => c`
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
`,
        ha = (e, s, t) => {
            if (!e) return gr();
            let i = fa[e.type] || {},
                n =
                    e.issues && e.issues.length > 0
                        ? c`
                  <div class="p-2 bg-red-900/50 text-red-300 text-xs">
                      <div class="font-bold mb-1">Parsing Issues:</div>
                      <ul class="list-disc pl-5">
                          ${e.issues.map(
                              (r) => c`<li>
                                      [${r.type}] ${r.message}
                                  </li>`
                          )}
                      </ul>
                  </div>
              `
                        : '',
                a = Object.entries(e.details).map(([r, o]) => {
                    let l = r === t ? 'bg-purple-900/50' : '',
                        d = fa[`${e.type}@${r}`],
                        f = c``;
                    if (r === 'baseMediaDecodeTime' && e.type === 'tfdt') {
                        let m = hr(e, s);
                        m &&
                            (f = c`<span
                    class="text-xs text-cyan-400 block mt-1"
                    >(${(o.value / m).toFixed(3)} seconds)</span
                >`);
                    }
                    return c`
            <tr
                class="${l}"
                data-field-name="${r}"
                data-box-offset="${e.offset}"
            >
                <td
                    class="p-1 pr-2 text-xs text-gray-400 align-top"
                    title="${d?.text || ''}"
                >
                    ${r}
                </td>
                <td class="p-1 text-xs font-mono text-white break-all">
                    ${o.value !== void 0 ? String(o.value) : 'N/A'}
                    ${f}
                </td>
            </tr>
        `;
                });
            return c`
        <div class="p-3 border-b border-gray-700">
            <div class="font-bold text-base mb-1">
                ${e.type}
                <span class="text-sm text-gray-400">(${e.size} bytes)</span>
            </div>
            <div class="text-xs text-emerald-400 mb-2 font-mono">
                ${i.ref || ''}
            </div>
            <p class="text-xs text-gray-300">
                ${i.text || 'No description available.'}
            </p>
        </div>
        ${n}
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
        },
        Gt = (e) =>
            e.isChunk
                ? c`
            <details class="text-sm" open>
                <summary class="cursor-pointer p-1 rounded hover:bg-gray-700/50 flex items-center gap-2 border-l-4 ${e.color?.border}" data-group-start-offset="${e.offset}">
                     <strong class="font-mono text-gray-300">${e.type}</strong>
                     <span class="text-xs text-gray-500">@${e.offset}, ${e.size}b</span>
                </summary>
                <div class="pl-4 border-l border-gray-700 ml-[7px]">
                    ${e.children.map(Gt)}
                </div>
            </details>
        `
                : c`
    <details class="text-sm" open>
        <summary
            class="cursor-pointer p-1 rounded hover:bg-gray-700/50 flex items-center gap-2 border-l-4 ${e.color?.border || 'border-transparent'}"
            data-box-offset="${e.offset}"
        >
            ${
                e.issues && e.issues.length > 0
                    ? c`<span
                      class="text-yellow-400"
                      title="${e.issues.map((s) => `[${s.type}] ${s.message}`)
                          .join(`
`)}"
                      >⚠️</span
                  >`
                    : ''
            }
            <strong class="font-mono">${e.type}</strong>
            <span class="text-xs text-gray-500"
                >@${e.offset}, ${e.size}b</span
            >
        </summary>
        ${
            e.children && e.children.length > 0
                ? c`
                  <div class="pl-4 border-l border-gray-700 ml-[7px]">
                      ${e.children.map(Gt)}
                  </div>
              `
                : ''
        }
    </details>
`,
        yr = (e) => {
            let s = ua(e || []);
            return c`
    <div>
        <h4 class="text-base font-bold text-gray-300 mb-2">Box Structure</h4>
        <div
            class="box-tree-area bg-gray-900/50 p-2 rounded max-h-[calc(100vh-30rem)] overflow-y-auto"
        >
            ${s.map(Gt)}
        </div>
    </div>
`;
        },
        xr = (e) =>
            !e || e.length === 0
                ? c``
                : c`
        <div class="mb-4">
            <h4 class="text-base font-bold text-yellow-400 mb-2">
                Parsing Issues
            </h4>
            <div
                class="bg-yellow-900/50 border border-yellow-700 rounded p-3 text-xs space-y-2"
            >
                ${e.map(
                    (s) => c`<div>
                            <strong class="text-yellow-300"
                                >[${s.type.toUpperCase()}]</strong
                            >
                            <span class="text-yellow-200"
                                >${s.message}</span
                            >
                        </div>`
                )}
            </div>
        </div>
    `;
    function qt() {
        let { activeSegmentUrl: e, segmentCache: s } = b,
            t = s.get(e),
            i =
                t?.parsedData && t.parsedData.format === 'isobmff'
                    ? t.parsedData.data
                    : null;
        if (!i)
            return c`<div class="text-yellow-400 p-4">
            Could not parse ISOBMFF data for this segment.
        </div>`;
        let n = ua(i.boxes || []);
        ur(n);
        let a = st(n);
        b.activeByteMap = a;
        let r = (o) => {
            let l = Math.ceil(t.data.byteLength / ca),
                d = jt + o;
            d >= 1 &&
                d <= l &&
                ((jt = d), R(qt(), g.tabContents['interactive-segment']));
        };
        return c`
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
                    ${xr(i.issues)}
                    ${yr(i.boxes)}
                </div>
            </div>

            <div>
                ${tt(t.data, a, jt, ca, r)}
            </div>
        </div>
    `;
    }
    var Fe = null,
        Kt = new Map();
    function ga(e) {
        Fe && (document.removeEventListener('keydown', Fe), (Fe = null));
        let s = Kt.get(e);
        s &&
            (e.removeEventListener('mouseover', s.delegatedMouseOver),
            e.removeEventListener('mouseout', s.delegatedMouseOut),
            e.removeEventListener('click', s.handleClick),
            Kt.delete(e));
    }
    function ya() {
        let e = g.tabContents['interactive-segment'];
        e && ga(e);
    }
    function Wt(e, s, t, i) {
        let n = g.tabContents['interactive-segment'];
        if (!n || !e) return;
        ga(n);
        let a = null,
            r = (y) => {
                let I = [
                    'border-t',
                    'border-b',
                    'border-l',
                    'border-r',
                    'border-yellow-400',
                    'border-blue-400',
                    '-mt-px',
                    '-mb-px',
                    '-ml-px',
                    '-mr-px',
                ];
                n.querySelectorAll(`.${y}`).forEach((w) =>
                    w.classList.remove(y, ...I)
                );
            },
            o = (y, I) => {
                let w = n.querySelector('#hex-grid-content');
                if (!w || !I) return;
                let A = I.offset,
                    _ = I.size ?? 188,
                    P = A + _;
                (w.querySelectorAll('[data-byte-offset]').forEach((V) => {
                    let F = parseInt(V.dataset.byteOffset, 10);
                    if (F >= A && F < P) {
                        let W = s.get(F);
                        W &&
                            (W.box?.offset === A || W.packet?.offset === A) &&
                            V.classList.add(y);
                    }
                }),
                    n
                        .querySelector(
                            `[data-box-offset="${A}"], [data-group-start-offset="${A}"]`
                        )
                        ?.classList.add(y));
            },
            l = (y, I = ['border-yellow-400']) => {
                let w = n.querySelector('#hex-grid-content');
                w &&
                    y.forEach((A) => {
                        w.querySelectorAll(
                            `[data-byte-offset="${A}"]`
                        )?.forEach((P) => {
                            P.classList.add('is-field-boundary-highlighted');
                            let L = !y.has(A - 16),
                                V = !y.has(A + 16),
                                F = !y.has(A - 1) || A % 16 === 0,
                                W = !y.has(A + 1) || (A + 1) % 16 === 0;
                            (L && P.classList.add('border-t', '-mt-px', ...I),
                                V &&
                                    P.classList.add('border-b', '-mb-px', ...I),
                                F &&
                                    P.classList.add('border-l', '-ml-px', ...I),
                                W &&
                                    P.classList.add(
                                        'border-r',
                                        '-mr-px',
                                        ...I
                                    ));
                        });
                    });
            },
            d = (y) => {
                let I = y.target.closest('[data-byte-offset]');
                if (!I) return;
                let w = parseInt(I.dataset.byteOffset),
                    A = s.get(w);
                if (
                    (r('is-field-highlighted'),
                    r('is-field-boundary-highlighted'),
                    A)
                ) {
                    let _ = A.box || A.packet,
                        P = A.fieldName;
                    o('is-field-highlighted', _);
                    let L = _.details?.[P];
                    if (L && L.offset !== void 0 && L.length > 0) {
                        let V = Math.ceil(L.length),
                            F = new Set();
                        for (let W = L.offset; W < L.offset + V; W++) F.add(W);
                        l(F);
                    }
                    a === null && E(_, i, P);
                }
            },
            f = (y) => {
                let I = y.target.closest('[data-field-name]');
                if (!I) return;
                let w = I.dataset.fieldName,
                    A = parseInt(I.dataset.boxOffset || I.dataset.packetOffset);
                if (isNaN(A)) return;
                (r('is-inspector-hover-highlighted'),
                    r('is-field-boundary-highlighted'));
                let _ = t(e, A);
                if (!_) return;
                o('is-inspector-hover-highlighted', _);
                let P = _.details?.[w];
                if (P && P.offset !== void 0 && P.length > 0) {
                    let L = Math.ceil(P.length),
                        V = new Set();
                    for (let F = P.offset; F < P.offset + L; F++) V.add(F);
                    l(V);
                }
            },
            m = (y) => {
                r('is-field-highlighted');
                let I = y.target.closest(
                    '[data-box-offset], [data-group-start-offset]'
                );
                if (!I) return;
                let w = parseInt(
                    I.dataset.boxOffset || I.dataset.groupStartOffset
                );
                if (isNaN(w)) return;
                let A = t(e, w);
                if (A && (o('is-field-highlighted', A), a === null)) {
                    let _ = A.type ? 'Box Header' : 'TS Header';
                    E(A, i, _);
                }
            },
            p = (y) => {
                let I = y.target;
                I.closest('.segment-inspector-panel')
                    ? f(y)
                    : I.closest('.box-tree-area, .packet-list-area')
                      ? m(y)
                      : I.closest('#hex-grid-content') && d(y);
            },
            u = (y) => {
                let I = y.target,
                    w = y.relatedTarget;
                (I.closest('#hex-grid-content') &&
                    !w?.closest('#hex-grid-content') &&
                    (r('is-field-highlighted'),
                    r('is-field-boundary-highlighted'),
                    a === null && E(null, i)),
                    I.closest('.segment-inspector-panel') &&
                        !w?.closest('.segment-inspector-panel') &&
                        (r('is-inspector-hover-highlighted'),
                        r('is-field-boundary-highlighted')),
                    I.closest('.box-tree-area, .packet-list-area') &&
                        !w?.closest('.box-tree-area, .packet-list-area') &&
                        r('is-field-highlighted'));
            },
            h = (y) => {
                y.target.closest('summary') && y.preventDefault();
                let I = y.target.closest(
                    '[data-box-offset], [data-packet-offset], [data-group-start-offset]'
                );
                if (I) {
                    let w =
                        parseInt(I.dataset.boxOffset) ??
                        parseInt(I.dataset.packetOffset) ??
                        parseInt(I.dataset.groupStartOffset);
                    x(w);
                }
            };
        (n.addEventListener('mouseover', p),
            n.addEventListener('mouseout', u),
            n.addEventListener('click', h),
            Kt.set(n, {
                delegatedMouseOver: p,
                delegatedMouseOut: u,
                handleClick: h,
            }),
            (Fe = (y) => {
                y.key === 'Escape' && a !== null && x(a);
            }),
            document.addEventListener('keydown', Fe));
        let x = (y) => {
            (a === y ? (a = null) : (a = y), C());
            let I = t(e, a);
            E(I, i);
        };
        function C() {
            if ((r('is-highlighted'), a === null)) return;
            let y = t(e, a);
            y && o('is-highlighted', y);
        }
        function E(y, I, w = null) {
            let A = n.querySelector('.segment-inspector-panel');
            if (
                A &&
                (R(I(y, e, w), A),
                A.classList.remove('opacity-0'),
                A.querySelectorAll('.bg-purple-900\\/50').forEach((_) =>
                    _.classList.remove('bg-purple-900/50')
                ),
                y && w)
            ) {
                let _ = A.querySelector(`[data-field-name="${w}"]`);
                _ &&
                    (_.classList.add('bg-purple-900/50'),
                    _.scrollIntoView({ block: 'nearest' }));
            }
        }
        E(null, i);
    }
    function nt(e) {
        let s = new Map(),
            t = {
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
            !e ||
                !e.data ||
                !e.data.packets ||
                e.data.packets.forEach((i) => {
                    for (let a = 0; a < 4; a++)
                        s.set(i.offset + a, {
                            packet: i,
                            fieldName: 'TS Header',
                            color: t.header,
                        });
                    let n = i.offset + 4;
                    if (i.adaptationField) {
                        let a = i.adaptationField,
                            r = i.fieldOffsets.adaptationField.offset,
                            o = a.length.value + 1;
                        n = r + o;
                        for (let l = 0; l < o; l++)
                            s.set(r + l, {
                                packet: i,
                                fieldName: 'Adaptation Field',
                                color: t.af,
                            });
                        if (a.pcr)
                            for (let l = 0; l < a.pcr.length; l++)
                                s.set(a.pcr.offset + l, {
                                    packet: i,
                                    fieldName: 'PCR',
                                    color: t.pcr,
                                });
                        if (a.stuffing_bytes)
                            for (let l = 0; l < a.stuffing_bytes.length; l++)
                                s.set(a.stuffing_bytes.offset + l, {
                                    packet: i,
                                    fieldName: 'Stuffing',
                                    color: t.stuffing,
                                });
                    }
                    if (i.fieldOffsets.pointerField) {
                        let { offset: a, length: r } =
                            i.fieldOffsets.pointerField;
                        for (let o = 0; o < r; o++)
                            s.set(a + o, {
                                packet: i,
                                fieldName: 'Pointer Field & Stuffing',
                                color: t.pointer,
                            });
                        n = a + r;
                    }
                    for (let a = n; a < i.offset + 188; a++) {
                        if (s.has(a)) continue;
                        let r = 'Payload',
                            o = t.payload;
                        (i.pid === 8191
                            ? ((r = 'Null Packet Payload'), (o = t.null))
                            : i.psi
                              ? ((r = `PSI (${i.psi.type})`), (o = t.psi))
                              : i.pes && ((r = 'PES Payload'), (o = t.payload)),
                            s.set(a, { packet: i, fieldName: r, color: o }));
                    }
                    if (i.pes && i.fieldOffsets.pesHeader) {
                        let { offset: a, length: r } = i.fieldOffsets.pesHeader;
                        for (let o = 0; o < r; o++)
                            s.set(a + o, {
                                packet: i,
                                fieldName: 'PES Header',
                                color: t.pes,
                            });
                        if (i.pes.pts)
                            for (let o = 0; o < i.pes.pts.length; o++)
                                s.set(i.pes.pts.offset + o, {
                                    packet: i,
                                    fieldName: 'PTS',
                                    color: t.pts,
                                });
                        if (i.pes.dts)
                            for (let o = 0; o < i.pes.dts.length; o++)
                                s.set(i.pes.dts.offset + o, {
                                    packet: i,
                                    fieldName: 'DTS',
                                    color: t.dts,
                                });
                    }
                }),
            s
        );
    }
    var ve = 1,
        Yt = 1,
        ot = 50,
        xa = 1024;
    function va(e, s) {
        if (!e?.data?.packets) return null;
        let t = e.data.packets.find((i) => i.offset === s);
        return (
            t || ((t = e.data.packets.find((i) => i.offset >= s)), t || null)
        );
    }
    function ba(e) {
        if (!e || e.length === 0) return [];
        let s = [],
            t = {
                type: e[0].payloadType,
                pid: e[0].pid,
                count: 1,
                startOffset: e[0].offset,
                packets: [e[0]],
            };
        for (let i = 1; i < e.length; i++) {
            let n = e[i];
            n.payloadType === t.type && n.pid === t.pid
                ? (t.count++, t.packets.push(n))
                : (s.push(t),
                  (t = {
                      type: n.payloadType,
                      pid: n.pid,
                      count: 1,
                      startOffset: n.offset,
                      packets: [n],
                  }));
        }
        return (s.push(t), s);
    }
    var at = (e, s, t) =>
            t == null
                ? ''
                : c`<tr data-field-name=${s} data-packet-offset=${e.offset}>
        <td class="p-1 pr-2 text-xs text-gray-400 align-top">${s}</td>
        <td class="p-1 text-xs font-mono text-white break-all">
            ${String(t)}
        </td>
    </tr>`,
        vr = () => c`
    <div class="p-4 text-center text-sm text-gray-500 h-full flex flex-col justify-center items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p class="font-semibold">Inspector Panel</p>
        <p>Select a packet group from the list or hover over the hex view to see details here.</p>
    </div>
`,
        Sa = (e, s, t) =>
            e
                ? c`
        <div class="p-3 border-b border-gray-700">
            <div class="font-bold text-base mb-1">
                Packet @${e.offset} (PID: ${e.pid})
            </div>
            <p class="text-xs text-gray-300">${e.payloadType}</p>
        </div>
        <div class="overflow-y-auto">
            <table class="w-full table-fixed">
                <colgroup>
                    <col class="w-1/2" />
                    <col class="w-1/2" />
                </colgroup>
                <tbody>
                    ${Object.entries(e.header).map(([i, n]) => at(e, `Header: ${i}`, n.value))}
                    ${
                        e.adaptationField
                            ? Object.entries(e.adaptationField)
                                  .map(([i, n]) =>
                                      typeof n.value == 'object' &&
                                      n.value !== null
                                          ? Object.entries(n.value).map(
                                                ([a, r]) =>
                                                    at(
                                                        e,
                                                        `AF.${i}.${a}`,
                                                        r.value
                                                    )
                                            )
                                          : at(e, `AF: ${i}`, n.value)
                                  )
                                  .flat()
                            : ''
                    }
                    ${e.pes ? Object.entries(e.pes).map(([i, n]) => at(e, `PES: ${i}`, n.value)) : ''}
                </tbody>
            </table>
        </div>
    `
                : vr(),
        br = (e) => {
            if (!e || !e.programMap)
                return c`<p class="text-xs text-gray-400 p-2">
            No program summary available for this segment.
        </p>`;
            let s = Object.keys(e.programMap)[0],
                t = s ? e.programMap[s] : null,
                i = (n, a) => c`
        <tr>
            <td class="p-1 pr-2 text-xs text-gray-400">${n}</td>
            <td class="p-1 text-xs font-mono text-white">${a}</td>
        </tr>
    `;
            return c`<details class="mb-4" open>
        <summary class="font-semibold text-gray-300 cursor-pointer">
            Stream Summary
        </summary>
        <div
            class="bg-gray-900 border border-gray-700 rounded p-3 mt-2 text-xs"
        >
            <table class="w-full">
                <tbody>
                    ${i('Total Packets', e.totalPackets)}
                    ${i('PCR PID', e.pcrPid || 'N/A')}
                    ${t ? i('Program #', t.programNumber) : ''}
                </tbody>
            </table>
            <h5 class="font-semibold text-gray-400 mt-3 mb-1">
                Elementary Streams:
            </h5>
            ${
                t
                    ? c`<table class="w-full text-left">
                      <tbody>
                          ${Object.entries(t.streams).map(
                              ([n, a]) => c`<tr>
                                      <td class="p-1 font-mono">${n}</td>
                                      <td class="p-1">${a}</td>
                                  </tr>`
                          )}
                      </tbody>
                  </table>`
                    : 'PMT not found or parsed.'
            }
        </div>
    </details>`;
        },
        Sr = (e, s) => {
            let t = ba(e),
                i = Math.ceil(t.length / ot),
                n = (ve - 1) * ot,
                a = n + ot,
                r = t.slice(n, a);
            return c` <h4 class="text-base font-bold text-gray-300 mb-2">
            Packet Groups
        </h4>
        <div
            class="bg-gray-900/50 p-2 rounded max-h-[calc(100vh-30rem)] overflow-y-auto packet-list-area"
        >
            ${r.map(
                (o) => c` <div
                        class="text-xs p-1 rounded hover:bg-gray-700/50 flex items-center gap-2 cursor-pointer border-l-4 border-transparent"
                        data-group-start-offset="${o.startOffset}"
                    >
                        <strong class="font-mono w-48 flex-shrink-0"
                            >Packets @${o.startOffset} (x${o.count})</strong
                        >
                        <span class="text-gray-400 truncate"
                            >PID ${o.pid}: ${o.type}</span
                        >
                    </div>`
            )}
        </div>
        ${
            i > 1
                ? c`<div class="text-center text-sm text-gray-500 mt-2">
                  <button
                      @click=${() => s(-1)}
                      ?disabled=${ve === 1}
                      class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1"
                  >
                      &lt;
                  </button>
                  Page ${ve} of ${i}
                  <button
                      @click=${() => s(1)}
                      ?disabled=${ve === i}
                      class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1"
                  >
                      &gt;
                  </button>
              </div>`
                : ''
        }`;
        };
    function rt() {
        let { activeSegmentUrl: e, segmentCache: s } = b,
            t = s.get(e),
            i = t?.parsedData;
        if (!i || !i.data)
            return c`<div class="text-yellow-400 p-4">
            Could not parse Transport Stream data for this segment.
        </div>`;
        let n = nt(i),
            a = (o) => {
                let l = Math.ceil(t.data.byteLength / xa),
                    d = Yt + o;
                d >= 1 &&
                    d <= l &&
                    ((Yt = d), R(rt(), g.tabContents['interactive-segment']));
            },
            r = (o) => {
                let l = Math.ceil(ba(i.data.packets).length / ot),
                    d = ve + o;
                d >= 1 &&
                    d <= l &&
                    ((ve = d), R(rt(), g.tabContents['interactive-segment']));
            };
        return c`
        <div
            class="grid grid-cols-1 lg:grid-cols-[minmax(400px,35%)_1fr] gap-6"
        >
            <div class="sticky top-4 h-max flex flex-col gap-4">
                <div
                    class="segment-inspector-panel rounded-md bg-gray-900/90 border border-gray-700 transition-opacity duration-200 h-[24rem] overflow-hidden flex flex-col"
                >
                    <!-- Inspector content is rendered here by interaction-logic.js -->
                </div>
                ${br(i.data.summary)}
                ${Sr(i.data.packets, r)}
            </div>
            <div>
                ${tt(t.data, n, Yt, xa, a)}
            </div>
        </div>
    `;
    }
    var Ta = null;
    function lt() {
        let { activeSegmentUrl: e, segmentCache: s } = b;
        if ((e !== Ta && (ya(), (Ta = e)), !e))
            return c`
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
        let t = s.get(e);
        if (!t || t.status === -1)
            return c`
            <div class="text-center py-12">
                <div
                    class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
                ></div>
                <p class="text-gray-400">Loading and parsing segment data...</p>
            </div>
        `;
        if (t.status !== 200 || !t.data)
            return c`
            <div class="text-center py-12">
                <div class="text-red-400 text-lg mb-2">❌ Failed to Load</div>
                <p class="text-gray-400">
                    Failed to fetch segment. Status:
                    ${t.status || 'Network Error'}.
                </p>
            </div>
        `;
        let i;
        return (
            t.parsedData?.format === 'ts' ? (i = rt()) : (i = qt()),
            e &&
                setTimeout(() => {
                    if (t.parsedData?.format === 'ts') {
                        let n = nt(t.parsedData);
                        Wt(t.parsedData, n, va, Sa);
                    } else if (t.parsedData?.format === 'isobmff') {
                        let n = st(t.parsedData.data.boxes);
                        Wt(t.parsedData.data, n, ma, ha);
                    }
                }, 0),
            c`
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
                ${e}
            </p>
        </div>
        ${i}
    `
        );
    }
    var J,
        Tr = (e) => {
            if (!e) return c`<p class="warn">No active stream to monitor.</p>`;
            if (e.manifest.type !== 'dynamic')
                return c`<p class="info">
            This is a VOD/static manifest. No updates are expected.
        </p>`;
            let { manifestUpdates: s, activeManifestUpdateIndex: t } = e,
                i = s.length;
            if (i === 0)
                return c`<p class="info">Awaiting first manifest update...</p>`;
            let n = i - t,
                a = s[t],
                r = a.diffHtml.split(`
`),
                o =
                    t === s.length - 1
                        ? 'Initial Manifest loaded:'
                        : 'Update received at:',
                l = c` <div class="text-sm text-gray-400 mb-2">
            ${o}
            <span class="font-semibold text-gray-200"
                >${a.timestamp}</span
            >
        </div>
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            ${r.map(
                (d, f) => c`
                    <div class="flex">
                        <span
                            class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-10"
                            >${f + 1}</span
                        >
                        <span class="flex-grow whitespace-pre-wrap break-all"
                            >${N(d)}</span
                        >
                    </div>
                `
            )}
        </div>`;
            return c` <div
            class="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-2 sm:space-y-0"
        >
            <button
                id="toggle-polling-btn"
                class="px-4 py-2 rounded-md font-bold transition duration-300 w-full sm:w-auto text-white"
                @click=${Ir}
            >
                <!-- Content set by updatePollingButton -->
            </button>
            <div class="flex items-center space-x-2">
                <button
                    id="prev-manifest-btn"
                    class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                    title="Previous Update (Right Arrow)"
                    ?disabled=${t >= i - 1}
                    @click=${() => Be(1)}
                >
                    &lt;
                </button>
                <span
                    id="manifest-index-display"
                    class="text-gray-400 font-semibold w-16 text-center"
                    >${n}/${i}</span
                >
                <button
                    id="next-manifest-btn"
                    class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                    title="Next Update (Left Arrow)"
                    ?disabled=${t <= 0}
                    @click=${() => Be(-1)}
                >
                    &gt;
                </button>
            </div>
        </div>
        <div id="current-manifest-update" class="manifest-update-entry">
            ${l}
        </div>`;
        };
    function ce(e) {
        let s = g.tabContents.updates.querySelector('#mpd-updates-content');
        if (!s) {
            let i = document.createElement('div');
            ((i.id = 'mpd-updates-content'),
                g.tabContents.updates.appendChild(i),
                (s = i));
        }
        let t = b.streams.find((i) => i.id === e);
        (R(Tr(t), s),
            (J = document.getElementById('toggle-polling-btn')),
            dt());
    }
    function Ir() {
        let e = b.streams.find((s) => s.id === b.activeStreamId);
        (e && (e.isPolling = !e.isPolling), dt());
    }
    function dt() {
        if (!J) return;
        let e = b.streams.find((t) => t.id === b.activeStreamId);
        if (!e || e.manifest.type !== 'dynamic') {
            J.style.display = 'none';
            return;
        }
        let s = e.isPolling;
        ((J.style.display = 'block'),
            (J.textContent = s ? 'Stop Polling' : 'Start Polling'),
            J.classList.toggle('bg-red-600', s),
            J.classList.toggle('hover:bg-red-700', s),
            J.classList.toggle('bg-blue-600', !s),
            J.classList.toggle('hover:bg-blue-700', !s));
    }
    function Be(e) {
        let s = b.streams.find((i) => i.id === b.activeStreamId);
        if (!s || s.manifestUpdates.length === 0) return;
        let t = s.activeManifestUpdateIndex + e;
        ((t = Math.max(0, Math.min(t, s.manifestUpdates.length - 1))),
            t !== s.activeManifestUpdateIndex &&
                ((s.activeManifestUpdateIndex = t), ce(s.id)));
    }
    var k =
        'cursor-help border-b border-dotted border-blue-500/40 transition-colors hover:bg-blue-500/15 hover:border-solid';
    var Er = (e) =>
            e
                ? e.isValid
                    ? c`<div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-xs text-green-300 font-semibold">Validation Passed</span>
        </div>`
                    : c`<div class="flex items-start gap-2">
         <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
            <span class="text-xs text-red-300 font-semibold">Validation Failed</span>
            <ul class="list-disc pl-4 mt-1 text-xs text-red-200">
                ${e.errors.map((s) => c`<li>${s}</li>`)}
            </ul>
        </div>
    </div>`
                : c`<p class="text-xs text-gray-400">Not validated.</p>`,
        Ia = (e) => {
            let s = e.steeringInfo,
                t = e.semanticData.get('steeringValidation');
            return s
                ? c`
        <div>
            <h3 class="text-xl font-bold mb-4">Delivery & Steering</h3>
            <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <dl class="grid gap-x-4 gap-y-2 grid-cols-[auto_1fr]">
                    <dt class="text-sm font-medium text-gray-400 ${k}"
                        data-tooltip="The URI of the Content Steering manifest."
                        data-iso="HLS: 4.4.6.6">
                        Steering Server URI
                    </dt>
                    <dd class="text-sm font-mono text-white break-all">${s.value['SERVER-URI']}</dd>

                    <dt class="text-sm font-medium text-gray-400 ${k}"
                        data-tooltip="The initial Pathway to apply until the steering manifest is loaded."
                        data-iso="HLS: 4.4.6.6">
                        Default Pathway ID
                    </dt>
                    <dd class="text-sm font-mono text-white">${s.value['PATHWAY-ID'] || '.(default)'}</dd>

                    <dt class="text-sm font-medium text-gray-400 ${k}"
                        data-tooltip="The result of fetching and validating the steering manifest against the HLS specification."
                        data-iso="HLS: 7.2">
                        Validation Status
                    </dt>
                    <dd>${Er(t)}</dd>
                </dl>
            </div>
        </div>
    `
                : '';
        };
    var D = (e, s, t, i, n = '') => {
            if (s == null || s === '' || (Array.isArray(s) && s.length === 0))
                return '';
            let a = `stat-card-${e.toLowerCase().replace(/[\s/]+/g, '-')}`;
            return c`
        <div data-testid="${a}" class="bg-gray-800 p-3 rounded-lg border border-gray-700 ${n}">
            <dt class="text-xs font-medium text-gray-400 ${k}" data-tooltip="${t}" data-iso="${i}">
                ${e}
            </dt>
            <dd class="text-base text-left font-mono text-white mt-1 break-words">${s}</dd>
        </div>
    `;
        },
        Jt = (e, s) => {
            if (!e || e.length === 0) return '';
            let t, i;
            return (
                s === 'video'
                    ? ((t = [
                          'ID',
                          'Codecs',
                          'Resolutions',
                          'Bitrate',
                          'Roles',
                      ]),
                      (i = e.map(
                          (n) => c`
            <tr>
                <td class="p-2 font-mono">${n.id}</td>
                <td class="p-2 font-mono">${n.codecs.join(', ')}</td>
                <td class="p-2 font-mono">${n.resolutions.join(', ')}</td>
                <td class="p-2 font-mono">${n.bitrateRange}</td>
                <td class="p-2 font-mono">${n.roles.join(', ') || 'N/A'}</td>
            </tr>
        `
                      )))
                    : s === 'audio'
                      ? ((t = [
                            'ID',
                            'Lang',
                            'Codecs',
                            'Channels',
                            'Default',
                            'Roles',
                        ]),
                        (i = e.map(
                            (n) => c`
            <tr>
                <td class="p-2 font-mono">${n.id}</td>
                <td class="p-2 font-mono">${n.lang || 'N/A'}</td>
                <td class="p-2 font-mono">${n.codecs.join(', ')}</td>
                <td class="p-2 font-mono">${n.channels.join(', ')}</td>
                <td class="p-2 font-mono">${n.isDefault ? 'Yes' : 'No'}</td>
                <td class="p-2 font-mono">${n.roles.join(', ') || 'N/A'}</td>
            </tr>
        `
                        )))
                      : ((t = ['ID', 'Lang', 'Format', 'Default', 'Roles']),
                        (i = e.map(
                            (n) => c`
            <tr>
                <td class="p-2 font-mono">${n.id}</td>
                <td class="p-2 font-mono">${n.lang || 'N/A'}</td>
                <td class="p-2 font-mono">${n.codecsOrMimeTypes.join(', ')}</td>
                <td class="p-2 font-mono">${n.isDefault ? 'Yes' : 'No'}</td>
                <td class="p-2 font-mono">${n.roles.join(', ') || 'N/A'}</td>
            </tr>
        `
                        ))),
                c`
        <div class="bg-gray-800/50 rounded-lg border border-gray-700 overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-gray-900/50">
                    <tr>
                        ${t.map((n) => c`<th class="p-2 font-semibold text-gray-300">${n}</th>`)}
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-700">
                    ${i}
                </tbody>
            </table>
        </div>
    `
            );
        },
        Cr = (e) =>
            e.dash
                ? c`
            <h4 class="text-lg font-bold mb-3 mt-6">DASH Properties</h4>
            <dl class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                ${D('Min Buffer Time', `${e.dash.minBufferTime}s`, 'Minimum client buffer time.', 'DASH: 5.3.1.2')}
                ${
                    e.general.streamType.startsWith('Live')
                        ? c`
                    ${D('Update Period', `${e.dash.minimumUpdatePeriod}s`, 'How often a client should check for a new manifest.', 'DASH: 5.3.1.2')}
                    ${D('Live Window (DVR)', `${e.dash.timeShiftBufferDepth}s`, 'The duration of the seekable live window.', 'DASH: 5.3.1.2')}
                    ${D('Availability Start', e.dash.availabilityStartTime?.toLocaleString(), 'The anchor time for the presentation.', 'DASH: 5.3.1.2')}
                    ${D('Publish Time', e.dash.publishTime?.toLocaleString(), 'The time this manifest version was generated.', 'DASH: 5.3.1.2')}
                `
                        : ''
                }
            </dl>
        `
                : e.hls
                  ? c`
            <h4 class="text-lg font-bold mb-3 mt-6">HLS Properties</h4>
            <dl class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                ${D('HLS Version', e.hls.version, 'Indicates the compatibility version of the Playlist file.', 'HLS: 4.3.1.2')}
                ${D('Target Duration', `${e.hls.targetDuration}s`, 'The maximum Media Segment duration.', 'HLS: 4.3.3.1')}
                ${D('I-Frame Playlists', e.hls.iFramePlaylists, 'Number of I-Frame only playlists for trick-play modes.', 'HLS: 4.3.4.3')}
                ${D('Media Playlists', e.content.mediaPlaylists, 'Number of variant stream media playlists.', 'HLS: 4.3.4.2')}
            </dl>
        `
                  : '',
        wr = (e) => {
            let { manifest: s, protocol: t } = e,
                i = s.summary,
                n = (t === 'dash' ? i.dash.profiles : i.hls.version) || '',
                a =
                    t === 'dash'
                        ? n.split(',').map((u) => u.trim())
                        : [`Version ${n}`],
                r = ['isoff', 'mp2t', 'isobmff', 'ts'],
                o = !0,
                l = a.map((u) => {
                    let h = !1,
                        x =
                            'This profile is not explicitly supported or its constraints are not validated by this tool.';
                    return (
                        t === 'dash'
                            ? ((h = r.some((C) => u.toLowerCase().includes(C))),
                              h &&
                                  ((x =
                                      'This is a standard MPEG-DASH profile based on a supported container format (ISOBMFF or MPEG-2 TS).'),
                                  (u.toLowerCase().includes('hbbtv') ||
                                      u.toLowerCase().includes('dash-if')) &&
                                      ((h = !1),
                                      (x =
                                          'This is a known extension profile. While the base format is supported, HbbTV or DASH-IF specific rules are not validated.'))))
                            : t === 'hls' &&
                              ((h =
                                  i.general.segmentFormat === 'ISOBMFF' ||
                                  i.general.segmentFormat === 'TS'),
                              (x = `HLS support is determined by segment format. This stream uses ${i.general.segmentFormat} segments, which are fully supported for analysis.`)),
                        h || (o = !1),
                        { profile: u, isSupported: h, explanation: x }
                    );
                });
            t === 'hls' && (o = l[0]?.isSupported ?? !1);
            let d = o
                ? c`<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
                : c`<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
            return c`
        <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <dt class="flex justify-between items-center text-sm font-medium text-gray-400 ${k}" data-tooltip="Indicates the set of features used in the manifest." data-iso="DASH: 8.1 / HLS: 4.3.1.2">
                Declared Profiles / Version
                <div class="flex items-center gap-2 ${k}" data-tooltip="${o ? 'All declared profiles and formats are supported for analysis.' : 'One or more declared profiles have constraints that are not validated by this tool. Base stream analysis should still be accurate.'}">
                    ${d}
                    <span class="text-sm font-semibold ${o ? 'text-green-400' : 'text-yellow-400'}">${o ? 'Supported' : 'Partial/Unsupported'}</span>
                </div>
            </dt>
            <dd class="text-base text-left font-mono text-white mt-2 space-y-2">
                ${l.map(
                    (u) => c`
                    <div class="flex items-center gap-2 text-xs p-1 bg-gray-900/50 rounded">
                        <span class="flex-shrink-0 ${k}" data-tooltip="${u.explanation}">
                            ${u.isSupported ? c`<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>` : c`<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>`}
                        </span>
                        <span class="break-all">${u.profile}</span>
                    </div>`
                )}
            </dd>
        </div>
    `;
        };
    function Ea(e) {
        let { manifest: s } = e;
        if (!s || !s.summary)
            return c`<p class="warn">No manifest summary data to display.</p>`;
        let t = s.summary,
            i = t.hls?.mediaPlaylistDetails;
        return c`
        <div class="space-y-8">
            <!-- General Section -->
            <div>
                <h3 class="text-xl font-bold mb-4">General Properties</h3>
                <dl class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                    <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <dt class="text-sm font-medium text-gray-400 ${k}" data-tooltip="Indicates if the stream is live or on-demand." data-iso="DASH: 5.3.1.2 / HLS: 4.3.3.5">
                            Stream Type
                        </dt>
                        <dd class="text-lg font-semibold mt-1 break-words ${t.general.streamTypeColor}">${t.general.streamType}</dd>
                    </div>
                    ${D('Protocol', t.general.protocol, 'The streaming protocol detected for this manifest.', 'N/A')}
                    ${D('Container Format', t.general.segmentFormat, 'The container format used for media segments (e.g., ISOBMFF or MPEG-2 TS).', 'DASH: 5.3.7 / HLS: 4.3.2.5')}
                    ${D('Media Duration', t.general.duration ? `${t.general.duration.toFixed(2)}s` : null, 'The total duration of the content.', 'DASH: 5.3.1.2')}
                </dl>
                ${Cr(t)}
            </div>
            <!-- Metadata Section -->
            <div>
                <h3 class="text-xl font-bold mb-4">Metadata & Delivery</h3>
                <dl class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                    ${D('Title', t.general.title, 'The title of the program.', 'DASH: 5.3.4')}
                    ${D('Segmenting Strategy', t.general.segmenting, 'The method used to define segment URLs and timing.', 'DASH: 5.3.9')}
                    ${wr(e)}
                    ${D('Alt. Locations', t.general.locations.length, 'Number of alternative manifest URLs provided.', 'DASH: 5.3.1.2')}
                </dl>
            </div>
             <!-- Low Latency Section -->
            ${
                t.lowLatency?.isLowLatency
                    ? c`
                <div>
                    <h3 class="text-xl font-bold mb-4">Low-Latency Status</h3>
                    <dl class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                        ${D('Target Latency', t.lowLatency.targetLatency ? `${t.lowLatency.targetLatency}ms` : null, 'The target latency for LL-DASH.', 'DASH: K.3.2')}
                        ${D('Part Target', t.lowLatency.partTargetDuration ? `${t.lowLatency.partTargetDuration}s` : null, 'Target duration for LL-HLS Partial Segments.', 'HLS 2nd Ed: 4.4.3.7')}
                        ${D('Part Hold Back', t.lowLatency.partHoldBack ? `${t.lowLatency.partHoldBack}s` : null, 'Server-recommended distance from the live edge for LL-HLS.', 'HLS 2nd Ed: 4.4.3.8')}
                        ${D('Can Block Reload', t.lowLatency.canBlockReload ? 'Yes' : null, 'Indicates server support for blocking playlist reload requests for LL-HLS.', 'HLS 2nd Ed: 4.4.3.8')}
                    </dl>
                </div>
            `
                    : ''
            }
            <!-- Content Section -->
            <div>
                <h3 class="text-xl font-bold mb-4">Content & Security</h3>
                 <dl class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                    ${D('Video Tracks', t.content.videoTracks, 'Number of distinct video tracks or variants.', 'DASH: 5.3.3 / HLS: 4.3.4.2')}
                    ${D('Audio Tracks', t.content.audioTracks, 'Number of distinct audio tracks or renditions.', 'DASH: 5.3.3 / HLS: 4.3.4.1')}
                    ${D('Text Tracks', t.content.textTracks, 'Number of distinct subtitle or text tracks.', 'DASH: 5.3.3 / HLS: 4.3.4.1')}
                    ${t.security ? D('Encryption', t.security.isEncrypted ? t.security.systems.join(', ') : 'No', 'Detected DRM Systems or encryption methods.', 'DASH: 5.8.4.1 / HLS: 4.3.2.4') : ''}
                    ${t.security?.kids.length > 0 ? D('Key IDs (KIDs)', t.security.kids.join(', '), 'Key IDs found in the manifest.', 'ISO/IEC 23001-7') : ''}
                </dl>
            </div>

            <!-- Media Playlist Details Section (HLS Only) -->
            ${
                i
                    ? c`
                <div>
                    <h3 class="text-xl font-bold mb-4">Media Playlist Details</h3>
                    <dl class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                        ${D('Segment Count', i.segmentCount, 'Total number of media segments in this playlist.', 'HLS: 4.3.2.1')}
                        ${D('Avg. Segment Duration', i.averageSegmentDuration?.toFixed(2) + 's', 'The average duration of all segments.', 'HLS: 4.3.2.1')}
                        ${D('Discontinuities Present', i.hasDiscontinuity ? 'Yes' : 'No', 'Indicates if the playlist contains discontinuity tags, often used for ad insertion.', 'HLS: 4.3.2.3')}
                        ${D('I-Frame Only', i.isIFrameOnly ? 'Yes' : 'No', 'Indicates if all segments in this playlist are I-Frame only.', 'HLS: 4.3.3.6')}
                    </dl>
                </div>
            `
                    : ''
            }

            <!-- Track Details -->
            ${
                !i && t.videoTracks.length > 0
                    ? c`
                <div>
                    <h3 class="text-xl font-bold mb-4">Video Track Details</h3>
                    <div class="space-y-4">${Jt(t.videoTracks, 'video')}</div>
                </div>
            `
                    : ''
            }
            ${
                !i && t.audioTracks.length > 0
                    ? c`
                <div>
                    <h3 class="text-xl font-bold mb-4">Audio Track Details</h3>
                    <div class="space-y-4">${Jt(t.audioTracks, 'audio')}</div>
                </div>
            `
                    : ''
            }
            ${
                !i && t.textTracks.length > 0
                    ? c`
                <div>
                    <h3 class="text-xl font-bold mb-4">Text Track Details</h3>
                    <div class="space-y-4">${Jt(t.textTracks, 'text')}</div>
                </div>
            `
                    : ''
            }
             ${e.protocol === 'hls' ? Ia(e) : ''}
        </div>
    `;
    }
    var S = (e, s) => e?.attributes?.[s],
        $ = (e, s) => e?.children?.find((t) => t.tagName === s),
        U = (e, s) => e?.children?.filter((t) => t.tagName === s) || [];
    function Qt(e, s, t = {}) {
        let i = [];
        if (!e || !e.children) return i;
        for (let n of e.children) {
            if (n.type !== 'element') continue;
            let a = { ...t, parent: e };
            (n.tagName === 'Period' && (a.period = n),
                n.tagName === 'AdaptationSet' && (a.adaptationSet = n),
                n.tagName === s && i.push({ element: n, context: a }),
                i.push(...Qt(n, s, a)));
        }
        return i;
    }
    var H = (e, s) => {
        if (!e) return [];
        let t = [];
        for (let i of e)
            i.type === 'element' &&
                (i.tagName === s && t.push(i),
                i.children?.length > 0 && (t = t.concat(H(i.children, s))));
        return t;
    };
    var be = [
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
                S(e, 'profiles') !== void 0 && S(e, 'profiles') !== '',
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
            check: (e) => S(e, 'minBufferTime') !== void 0,
            passDetails: 'OK',
            failDetails: 'The @minBufferTime attribute is mandatory.',
        },
        {
            id: 'MPDPATCH-1',
            text: 'PatchLocation requires MPD@id and @publishTime',
            isoRef: 'Clause 5.15.2',
            severity: 'fail',
            scope: 'MPD',
            category: 'Live Stream Properties',
            check: (e) =>
                $(e, 'PatchLocation')
                    ? S(e, 'id') !== void 0 && S(e, 'publishTime') !== void 0
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
            check: (e, { isDynamic: s }) =>
                s ? S(e, 'availabilityStartTime') !== void 0 : 'skip',
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
            check: (e, { isDynamic: s }) =>
                s ? S(e, 'publishTime') !== void 0 : 'skip',
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
            check: (e, { isDynamic: s }) =>
                s ? S(e, 'minimumUpdatePeriod') !== void 0 : 'skip',
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
            check: (e, { isDynamic: s }) => {
                if (s) return 'skip';
                let t = S(e, 'mediaPresentationDuration') !== void 0,
                    i = U(e, 'Period'),
                    n = i[i.length - 1],
                    a = n ? S(n, 'duration') !== void 0 : !1;
                return t || a;
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
            check: (e, { isDynamic: s }) =>
                s ? 'skip' : S(e, 'minimumUpdatePeriod') === void 0,
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
            check: (e, { isDynamic: s }) =>
                s ? 'skip' : S(e, 'timeShiftBufferDepth') === void 0,
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
            check: (e, { isDynamic: s }) =>
                s ? S(e, 'id') !== void 0 : 'skip',
            passDetails: 'OK',
            failDetails: (e) =>
                `Period (start="${S(e, 'start')}") requires an @id in dynamic manifests.`,
        },
        {
            id: 'PERIOD-2',
            text: 'Period contains at least one AdaptationSet',
            isoRef: 'Clause 5.3.2.2, Table 4',
            severity: 'warn',
            scope: 'Period',
            category: 'Manifest Structure',
            check: (e) => {
                let s = S(e, 'duration');
                return (
                    U(e, 'AdaptationSet').length > 0 ||
                    s === 'PT0S' ||
                    s === '0'
                );
            },
            passDetails: 'OK',
            failDetails:
                'A Period should contain at least one AdaptationSet unless its duration is 0.',
        },
        {
            id: 'AS-1',
            text: 'AdaptationSet has @contentType or @mimeType',
            isoRef: 'Clause 5.3.3.2, Table 5',
            severity: 'warn',
            scope: 'AdaptationSet',
            category: 'General Best Practices',
            check: (e) =>
                S(e, 'contentType') !== void 0 || S(e, 'mimeType') !== void 0,
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
                U(e, 'Representation').length > 1
                    ? S(e, 'segmentAlignment') === 'true'
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
            check: (e) => S(e, 'id') !== void 0,
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
            check: (e) => S(e, 'bandwidth') !== void 0,
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
            check: (e, { adaptationSet: s }) =>
                S(e, 'mimeType') !== void 0 || S(s, 'mimeType') !== void 0,
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
            check: (e, { allRepIdsInPeriod: s }) => {
                let t = S(e, 'dependencyId');
                return t ? t.split(' ').every((i) => s.has(i)) : 'skip';
            },
            passDetails: 'OK',
            failDetails: (e) =>
                `One or more IDs in @dependencyId="${S(e, 'dependencyId')}" do not exist in this Period.`,
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
                    $(e, 'SegmentBase'),
                    $(e, 'SegmentList'),
                    $(e, 'SegmentTemplate'),
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
            check: (e, { adaptationSet: s, period: t }) => {
                let i =
                    $(e, 'SegmentTemplate') ||
                    $(s, 'SegmentTemplate') ||
                    $(t, 'SegmentTemplate');
                return !i || !S(i, 'media')?.includes('$Number$')
                    ? 'skip'
                    : S(i, 'duration') !== void 0 || !!$(i, 'SegmentTimeline');
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
            check: (e, { adaptationSet: s, period: t }) => {
                let i =
                    $(e, 'SegmentTemplate') ||
                    $(s, 'SegmentTemplate') ||
                    $(t, 'SegmentTemplate');
                return !i || !S(i, 'media')?.includes('$Time$')
                    ? 'skip'
                    : !!$(i, 'SegmentTimeline');
            },
            passDetails: 'OK',
            failDetails:
                'When using $Time$, a SegmentTimeline must be present.',
        },
        {
            id: 'PROFILE-ONDEMAND-1',
            text: 'On-Demand profile requires MPD@type="static"',
            isoRef: 'Clause 8.3.2',
            severity: 'fail',
            scope: 'MPD',
            category: 'Profile Conformance',
            check: (e, { profiles: s }) =>
                s.includes('urn:mpeg:dash:profile:isoff-on-demand:2011')
                    ? S(e, 'type') === 'static'
                    : 'skip',
            passDetails: 'OK',
            failDetails: (e) =>
                `Profile requires 'static', but found '${S(e, 'type')}'`,
        },
        {
            id: 'PROFILE-LIVE-1',
            text: 'Live profile requires SegmentTemplate',
            isoRef: 'Clause 8.4.2',
            severity: 'fail',
            scope: 'Representation',
            category: 'Profile Conformance',
            check: (e, { profiles: s, adaptationSet: t, period: i }) =>
                s.includes('urn:mpeg:dash:profile:isoff-live:2011')
                    ? !!(
                          $(e, 'SegmentTemplate') ||
                          $(t, 'SegmentTemplate') ||
                          $(i, 'SegmentTemplate')
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
            check: (e, { profiles: s }) => {
                if (!s.includes('urn:mpeg:dash:profile:cmaf:2019'))
                    return 'skip';
                let t = S(e, 'mimeType');
                if (t !== 'video/mp4' && t !== 'audio/mp4') return 'skip';
                let i = S(e, 'containerProfiles') || '';
                return i.includes('cmfc') || i.includes('cmf2');
            },
            passDetails: 'OK',
            failDetails:
                'AdaptationSet is missing a CMAF structural brand in @containerProfiles.',
        },
    ];
    var fe = [
        {
            id: 'HLS-1',
            text: 'Playlist must start with #EXTM3U',
            isoRef: 'RFC 8216bis, 4.3.1.1',
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
            isoRef: 'RFC 8216bis, 4.3.1.2',
            severity: 'fail',
            scope: 'Playlist',
            category: 'HLS Structure',
            check: (e) =>
                e.tags.filter((s) => s.name === 'EXT-X-VERSION').length <= 1,
            passDetails: 'OK',
            failDetails:
                'A playlist MUST NOT contain more than one EXT-X-VERSION tag.',
        },
        {
            id: 'HLS-5',
            text: 'Playlist must not mix Media and Master tags',
            isoRef: 'RFC 8216bis, 4.1 & 4.3.4',
            severity: 'fail',
            scope: 'Playlist',
            category: 'HLS Structure',
            check: (e) => !(e.isMaster && e.segments.length > 0),
            passDetails: 'OK',
            failDetails:
                'A playlist cannot be both a Media Playlist (with segments) and a Master Playlist (with variants).',
        },
        {
            id: 'HLS-MEDIA-1',
            text: 'Media Playlist must contain an EXT-X-TARGETDURATION tag',
            isoRef: 'RFC 8216bis, 4.3.3.1',
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
            id: 'HLS-MEDIA-4',
            text: 'EXT-X-PLAYLIST-TYPE: VOD implies EXT-X-ENDLIST must be present',
            isoRef: 'RFC 8216bis, 4.3.3.5',
            severity: 'fail',
            scope: 'MediaPlaylist',
            category: 'HLS Structure',
            check: (e) =>
                e.playlistType === 'VOD'
                    ? e.tags.some((s) => s.name === 'EXT-X-ENDLIST')
                    : 'skip',
            passDetails: 'OK',
            failDetails: 'A VOD playlist MUST contain the EXT-X-ENDLIST tag.',
        },
        {
            id: 'LL-HLS-1',
            text: 'LL-HLS requires EXT-X-PART-INF if PARTs are present',
            isoRef: 'RFC 8216bis, 4.4.3.7',
            severity: 'fail',
            scope: 'MediaPlaylist',
            category: 'Profile Conformance',
            check: (e) =>
                !e.segments.some((t) => t.parts && t.parts.length > 0) &&
                !e.preloadHints.some((t) => t.TYPE === 'PART')
                    ? 'skip'
                    : !!e.partInf,
            passDetails: 'OK, EXT-X-PART-INF is present as required.',
            failDetails:
                'The playlist contains PARTs or PART hints but is missing the required EXT-X-PART-INF tag.',
        },
        {
            id: 'LL-HLS-2',
            text: 'LL-HLS requires EXT-X-SERVER-CONTROL tag',
            isoRef: 'RFC 8216bis, B.1',
            severity: 'warn',
            scope: 'MediaPlaylist',
            category: 'Profile Conformance',
            check: (e) => (e.partInf ? !!e.serverControl : 'skip'),
            passDetails: 'OK, EXT-X-SERVER-CONTROL is present.',
            failDetails:
                'Low-Latency HLS playlists should contain an EXT-X-SERVER-CONTROL tag to enable client optimizations.',
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
                if (!e.partInf || !e.serverControl?.['PART-HOLD-BACK'])
                    return 'skip';
                let s = e.serverControl['PART-HOLD-BACK'],
                    t = e.partInf['PART-TARGET'];
                return s >= 2 * t;
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
                e.partInf ? e.segments.some((s) => s.dateTime) : 'skip',
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
                    : e.preloadHints.some((s) => s.TYPE === 'PART'),
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
            check: (e, s) => {
                let t = s.stream?.semanticData?.get(
                    'renditionReportValidation'
                );
                return !t || t.length === 0
                    ? 'skip'
                    : t.every((i) => i.isValid);
            },
            passDetails:
                'All Rendition Reports accurately reflect the state of their respective Media Playlists.',
            failDetails: (e, s) =>
                `One or more Rendition Reports are stale or incorrect. ${s.stream?.semanticData
                    ?.get('renditionReportValidation')
                    .filter((n) => !n.isValid)
                    .map((n) =>
                        n.error
                            ? `Report for ${n.uri}: ${n.error}`
                            : `Report for ${n.uri}: Reported MSN/Part ${n.reportedMsn}/${n.reportedPart}, Actual ${n.actualMsn}/${n.actualPart}`
                    )
                    .join('; ')}`,
        },
        {
            id: 'HLS-MASTER-1',
            text: 'Master Playlist must contain at least one EXT-X-STREAM-INF tag',
            isoRef: 'RFC 8216bis, 4.1',
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
            isoRef: 'RFC 8216bis, 4.3.4.2',
            severity: 'fail',
            scope: 'Variant',
            category: 'HLS Structure',
            check: (e) => e.attributes && e.attributes.BANDWIDTH !== void 0,
            passDetails: 'OK',
            failDetails:
                'Every EXT-X-STREAM-INF tag MUST include the BANDWIDTH attribute.',
        },
        {
            id: 'HLS-SEGMENT-1',
            text: 'Each Media Segment must be preceded by an EXTINF tag',
            isoRef: 'RFC 8216bis, 4.3.2.1',
            severity: 'fail',
            scope: 'Segment',
            category: 'HLS Structure',
            check: (e) => e.duration !== void 0,
            passDetails: 'OK',
            failDetails: 'The EXTINF tag is REQUIRED for each Media Segment.',
        },
        {
            id: 'HLS-SEGMENT-2',
            text: 'EXTINF duration must be less than or equal to the target duration (rounded integer)',
            isoRef: 'RFC 8216bis, 4.3.3.1',
            severity: 'fail',
            scope: 'Segment',
            category: 'Segment & Timing Info',
            check: (e, { targetDuration: s }) =>
                s === null ? 'skip' : Math.round(e.duration) <= s,
            passDetails: 'OK',
            failDetails:
                'Segment duration rounded to the nearest integer MUST be <= the target duration.',
        },
        {
            id: 'HLS-KEY-1',
            text: 'EXT-X-KEY must have a URI if method is not NONE',
            isoRef: 'RFC 8216bis, 4.3.2.4',
            severity: 'fail',
            scope: 'Key',
            category: 'Encryption',
            check: (e) => e.METHOD === 'NONE' || (e.METHOD !== 'NONE' && e.URI),
            passDetails: 'OK',
            failDetails:
                'The URI attribute is REQUIRED for EXT-X-KEY unless the METHOD is NONE.',
        },
    ];
    function Ca(e, s, t = {}) {
        if (s === 'hls') {
            let d = e;
            if (!d || typeof d.isMaster != 'boolean')
                return [
                    {
                        text: 'HLS Playlist must be a valid object',
                        status: 'fail',
                        details:
                            'The HLS parser did not return a valid object.',
                        isoRef: 'N/A',
                        category: 'HLS Structure',
                    },
                ];
            let f = [],
                m = d.type === 'dynamic',
                p = d.hls?.version || 1,
                u = d.hls?.targetDuration || null,
                h = {
                    isLive: m,
                    version: p,
                    targetDuration: u,
                    hlsParsed: d,
                    ...t,
                },
                x = (E, y, I = '') => {
                    let w = E.check(y, h);
                    if (w !== 'skip') {
                        let A = w ? 'pass' : E.severity;
                        f.push({
                            id: E.id,
                            text: `${E.text} ${I}`,
                            status: A,
                            details: w ? E.passDetails : E.failDetails,
                            isoRef: E.isoRef,
                            category: E.category,
                        });
                    }
                },
                C = ['Playlist'];
            if (
                (d.isMaster
                    ? C.push('MasterPlaylist')
                    : C.push('MediaPlaylist'),
                fe.filter((E) => C.includes(E.scope)).forEach((E) => x(E, d)),
                d.isMaster ||
                    ((d.segments || []).forEach((E, y) => {
                        fe.filter((I) => I.scope === 'Segment').forEach((I) =>
                            x(I, E, `(Segment ${y + 1})`)
                        );
                    }),
                    (d.tags || [])
                        .filter((E) => E.name === 'EXT-X-KEY')
                        .forEach((E, y) => {
                            let I = {
                                METHOD: E.value.METHOD,
                                URI: E.value.URI,
                                IV: E.value.IV,
                                KEYFORMAT: E.value.KEYFORMAT,
                                KEYFORMATVERSIONS: E.value.KEYFORMATVERSIONS,
                            };
                            fe.filter((w) => w.scope === 'Key').forEach((w) =>
                                x(w, I, `(Key ${y + 1}, Method: ${I.METHOD})`)
                            );
                        })),
                d.isMaster)
            ) {
                ((d.variants || []).forEach((y, I) => {
                    fe.filter((w) => w.scope === 'Variant').forEach((w) =>
                        x(
                            w,
                            y,
                            `(Variant Stream ${I + 1}, BW: ${y.attributes?.BANDWIDTH || 'N/A'})`
                        )
                    );
                }),
                    (d.tags || [])
                        .filter((y) => y.name === 'EXT-X-I-FRAME-STREAM-INF')
                        .forEach((y, I) => {
                            let w = y.value;
                            fe.filter(
                                (A) => A.scope === 'IframeVariant'
                            ).forEach((A) =>
                                x(
                                    A,
                                    w,
                                    `(I-Frame Stream ${I + 1}, BW: ${w?.BANDWIDTH || 'N/A'})`
                                )
                            );
                        }));
                let E = {};
                ((d.tags.filter((y) => y.name === 'EXT-X-MEDIA') || []).forEach(
                    (y) => {
                        let I = y.value['GROUP-ID'],
                            w = y.value.TYPE;
                        (E[w] || (E[w] = {}),
                            E[w][I] || (E[w][I] = []),
                            E[w][I].push(y.value));
                    }
                ),
                    Object.values(E).forEach((y) => {
                        Object.values(y).forEach((I, w) => {
                            fe.filter((A) => A.scope === 'MediaGroup').forEach(
                                (A) =>
                                    x(
                                        A,
                                        I,
                                        `(Media Group ${w + 1}, ID: ${I[0]?.['GROUP-ID'] || 'N/A'}, Type: ${I[0]?.TYPE || 'N/A'})`
                                    )
                            );
                        });
                    }));
            }
            return f;
        }
        let i = e;
        if (!i || typeof i.attributes != 'object') {
            let d = be.find((f) => f.id === 'MPD-1');
            return [
                {
                    text: d.text,
                    status: d.severity,
                    details: d.failDetails,
                    isoRef: d.isoRef,
                    category: d.category,
                },
            ];
        }
        let n = [],
            a = S(i, 'type') === 'dynamic',
            r = (S(i, 'profiles') || '').toLowerCase(),
            o = { isDynamic: a, profiles: r },
            l = (d, f, m) => (typeof d == 'function' ? d(f, m) : d);
        return (
            be
                .filter((d) => d.scope === 'MPD')
                .forEach((d) => {
                    let f = d.check(i, o);
                    if (f !== 'skip') {
                        let m = f ? 'pass' : d.severity;
                        n.push({
                            id: d.id,
                            text: d.text,
                            status: m,
                            details: l(f ? d.passDetails : d.failDetails, i, o),
                            isoRef: d.isoRef,
                            category: d.category,
                        });
                    }
                }),
            U(i, 'Period').forEach((d) => {
                let f = new Set(
                        H(d.children, 'Representation')
                            .map((p) => S(p, 'id'))
                            .filter(Boolean)
                    ),
                    m = { ...o, allRepIdsInPeriod: f, period: d };
                (be
                    .filter((p) => p.scope === 'Period')
                    .forEach((p) => {
                        let u = p.check(d, m);
                        if (u !== 'skip') {
                            let h = u ? 'pass' : p.severity;
                            n.push({
                                id: p.id,
                                text: `${p.text} (Period: ${S(d, 'id') || 'N/A'})`,
                                status: h,
                                details: l(
                                    u ? p.passDetails : p.failDetails,
                                    d,
                                    m
                                ),
                                isoRef: p.isoRef,
                                category: p.category,
                            });
                        }
                    }),
                    U(d, 'AdaptationSet').forEach((p) => {
                        let u = { ...m, adaptationSet: p };
                        (be
                            .filter((h) => h.scope === 'AdaptationSet')
                            .forEach((h) => {
                                let x = h.check(p, u);
                                if (x !== 'skip') {
                                    let C = x ? 'pass' : h.severity;
                                    n.push({
                                        id: h.id,
                                        text: `${h.text} (AdaptationSet: ${S(p, 'id') || 'N/A'})`,
                                        status: C,
                                        details: l(
                                            x ? h.passDetails : h.failDetails,
                                            p,
                                            u
                                        ),
                                        isoRef: h.isoRef,
                                        category: h.category,
                                    });
                                }
                            }),
                            U(p, 'Representation').forEach((h) => {
                                let x = { ...u, representation: h };
                                be.filter(
                                    (C) => C.scope === 'Representation'
                                ).forEach((C) => {
                                    let E = C.check(h, x);
                                    if (E !== 'skip') {
                                        let y = E ? 'pass' : C.severity;
                                        n.push({
                                            id: C.id,
                                            text: `${C.text} (Representation: ${S(h, 'id') || 'N/A'})`,
                                            status: y,
                                            details: l(
                                                E
                                                    ? C.passDetails
                                                    : C.failDetails,
                                                h,
                                                x
                                            ),
                                            isoRef: C.isoRef,
                                            category: C.category,
                                        });
                                    }
                                });
                            }));
                    }));
            }),
            n
        );
    }
    var B = (e, s) => {
            for (let t of e) {
                if (t.type === s) return t;
                if (t.children?.length > 0) {
                    let i = B(t.children, s);
                    if (i) return i;
                }
            }
            return null;
        },
        wa = [
            (e) => {
                let s = B(e.boxes, 'mvhd'),
                    t = s?.details?.duration?.value === 0;
                return {
                    id: 'CMAF-HEADER-MVHD-DUR',
                    text: 'Movie Header (mvhd) duration must be 0',
                    isoRef: 'Clause 7.5.1',
                    status: t ? 'pass' : 'fail',
                    details: t
                        ? 'OK'
                        : `mvhd.duration was ${s?.details?.duration?.value}, expected 0.`,
                };
            },
            (e) => {
                let s = B(e.boxes, 'tkhd'),
                    t = s?.details?.duration?.value === 0;
                return {
                    id: 'CMAF-HEADER-TKHD-DUR',
                    text: 'Track Header (tkhd) duration must be 0',
                    isoRef: 'Clause 7.5.4',
                    status: t ? 'pass' : 'fail',
                    details: t
                        ? 'OK'
                        : `tkhd.duration was ${s?.details?.duration?.value}, expected 0.`,
                };
            },
            (e) => {
                let t = !!B(e.boxes, 'mvex');
                return {
                    id: 'CMAF-HEADER-MVEX',
                    text: 'Movie Extends (mvex) box must be present',
                    isoRef: 'Clause 7.3.2.1',
                    status: t ? 'pass' : 'fail',
                    details: t ? 'OK' : 'mvex box not found in moov.',
                };
            },
            (e) => {
                let t = !!B(e.boxes, 'trex');
                return {
                    id: 'CMAF-HEADER-TREX',
                    text: 'Track Extends (trex) box must be present',
                    isoRef: 'Clause 7.5.14',
                    status: t ? 'pass' : 'fail',
                    details: t
                        ? 'OK'
                        : 'trex box not found in mvex for the track.',
                };
            },
            (e, s) => {
                let i = B(s.boxes, 'moof')?.children?.filter(
                        (a) => a.type === 'traf'
                    ).length,
                    n = i === 1;
                return {
                    id: 'CMAF-FRAG-MOOF-TRAF',
                    text: 'Movie Fragment (moof) must contain exactly one Track Fragment (traf)',
                    isoRef: 'Clause 7.3.2.3.b',
                    status: n ? 'pass' : 'fail',
                    details: n ? 'OK' : `Found ${i} traf boxes, expected 1.`,
                };
            },
            (e, s) => {
                let i = B(s.boxes, 'tfhd')?.details?.flags?.value,
                    n = i ? (parseInt(i, 16) & 1) !== 0 : !1,
                    a = i ? (parseInt(i, 16) & 131072) !== 0 : !1,
                    r = !n && a;
                return {
                    id: 'CMAF-FRAG-TFHD-FLAGS',
                    text: 'Track Fragment Header (tfhd) flags must be set for fragment-relative addressing',
                    isoRef: 'Clause 7.5.16',
                    status: r ? 'pass' : 'fail',
                    details: r
                        ? 'OK'
                        : `base-data-offset-present=${n} (expected false), default-base-is-moof=${a} (expected true).`,
                };
            },
            (e, s) => {
                let n = !!B(s.boxes, 'traf')?.children.find(
                    (a) => a.type === 'tfdt'
                );
                return {
                    id: 'CMAF-FRAG-TFDT',
                    text: 'Track Fragment (traf) must contain a Track Fragment Decode Time (tfdt) box',
                    isoRef: 'Clause 7.5.16',
                    status: n ? 'pass' : 'fail',
                    details: n ? 'OK' : 'tfdt box not found in traf.',
                };
            },
            (e, s) => {
                let i = B(s.boxes, 'trun')?.details?.flags?.value,
                    a = i ? (parseInt(i, 16) & 1) !== 0 : !1;
                return {
                    id: 'CMAF-FRAG-TRUN-OFFSET',
                    text: 'Track Run (trun) must have data-offset-present flag set',
                    isoRef: 'Clause 7.5.17',
                    status: a ? 'pass' : 'fail',
                    details: a
                        ? 'OK'
                        : 'trun data-offset-present flag was not set to true.',
                };
            },
            (e) => {
                let s = B(e.boxes, 'schm'),
                    t = B(e.boxes, 'tenc');
                if (!s || !t || !(s.details.scheme_type.value === 'cenc'))
                    return null;
                let n = t.details.default_Per_Sample_IV_Size?.value,
                    a = n === 8;
                return {
                    id: 'CMAF-CENC-IV-SIZE',
                    text: "For 'cenc' scheme, default_Per_Sample_IV_Size must be 8",
                    isoRef: 'Clause 8.2.3.1',
                    status: a ? 'pass' : 'fail',
                    details: a
                        ? `OK: IV size is ${n}.`
                        : `FAIL: default_Per_Sample_IV_Size was ${n}, but CMAF requires 8 for the 'cenc' scheme.`,
                };
            },
            (e, s) => {
                if (!B(e.boxes, 'sinf')) return null;
                let i = B(s.boxes, 'traf'),
                    n = B(i?.children || [], 'saio'),
                    a = B(i?.children || [], 'saiz'),
                    r = !!n && !!a;
                return {
                    id: 'CMAF-CENC-AUX-INFO',
                    text: 'Encrypted fragments must contain Sample Auxiliary Information boxes (saio, saiz)',
                    isoRef: 'Clause 8.2.2.1',
                    status: r ? 'pass' : 'fail',
                    details: r
                        ? 'OK: Found both saio and saiz boxes in the track fragment.'
                        : `FAIL: Missing required auxiliary info boxes. Found saio: ${!!n}, Found saiz: ${!!a}.`,
                };
            },
            (e, s) => {
                let t = B(e.boxes, 'schm'),
                    i = B(s.boxes, 'senc');
                if (
                    !t ||
                    t.details.scheme_type.value !== 'cenc' ||
                    !i ||
                    !i.samples
                )
                    return null;
                let n = -1,
                    a = -1;
                for (let o = 0; o < i.samples.length; o++) {
                    let l = i.samples[o];
                    if (l.subsamples && l.subsamples.length > 0) {
                        for (let d = 0; d < l.subsamples.length; d++)
                            if (
                                l.subsamples[d].BytesOfProtectedData % 16 !==
                                0
                            ) {
                                ((n = o), (a = d));
                                break;
                            }
                    }
                    if (n !== -1) break;
                }
                let r = n === -1;
                return {
                    id: 'CMAF-CENC-SUBSAMPLE-ALIGNMENT',
                    text: "For 'cenc' scheme, BytesOfProtectedData must be a multiple of 16",
                    isoRef: 'Clause 8.2.3.1',
                    status: r ? 'pass' : 'warn',
                    details: r
                        ? 'OK: All subsamples have correctly aligned protected regions.'
                        : `FAIL: At least one subsample has a protected data size not a multiple of 16. First failure at sample ${n + 1}, subsample ${a + 1}.`,
                };
            },
        ];
    function ct(e, s, t = [], i = []) {
        let n = [];
        if (e.type !== s.type)
            return (
                n.push(`Box types differ: ${e.type} vs ${s.type}`),
                { areEqual: !1, differences: n }
            );
        !t.includes('size') &&
            e.size !== s.size &&
            n.push(`${e.type}.size: '${e.size} bytes' vs '${s.size} bytes'`);
        let a = new Set([...Object.keys(e.details), ...Object.keys(s.details)]);
        for (let l of a) {
            if (t.includes(l) || l === 'size') continue;
            let d = e.details[l]?.value,
                f = s.details[l]?.value;
            JSON.stringify(d) !== JSON.stringify(f) &&
                n.push(`${e.type}.${l}: '${d}' vs '${f}'`);
        }
        let r = (e.children || []).filter((l) => !i.includes(l.type)),
            o = (s.children || []).filter((l) => !i.includes(l.type));
        if (r.length !== o.length)
            n.push(
                `Child box count differs in ${e.type}: ${r.length} vs ${o.length}`
            );
        else
            for (let l = 0; l < r.length; l++) {
                let d = ct(r[l], o[l], t, i);
                d.areEqual || n.push(...d.differences);
            }
        return { areEqual: n.length === 0, differences: n };
    }
    var z = (e) => {
        if (!e) return null;
        let s = e.match(
            /PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/
        );
        if (!s) return null;
        let t = parseFloat(s[1] || '0'),
            i = parseFloat(s[2] || '0'),
            n = parseFloat(s[3] || '0');
        return t * 3600 + i * 60 + n;
    };
    function Se(e, s) {
        let t = {},
            i = S(e, 'type') === 'dynamic';
        return (
            Qt(e, 'Representation').forEach(({ element: a, context: r }) => {
                let o = S(a, 'id');
                if (!o) return;
                t[o] = [];
                let { period: l, adaptationSet: d } = r;
                if (!l || !d) return;
                let f =
                        $(a, 'SegmentTemplate') ||
                        $(d, 'SegmentTemplate') ||
                        $(l, 'SegmentTemplate'),
                    m =
                        $(a, 'SegmentList') ||
                        $(d, 'SegmentList') ||
                        $(l, 'SegmentList'),
                    p =
                        $(a, 'SegmentBase') ||
                        $(d, 'SegmentBase') ||
                        $(l, 'SegmentBase'),
                    u = f ? S(f, 'initialization') : null;
                if (!u) {
                    let h = m || p,
                        x = h ? $(h, 'Initialization') : null;
                    x && (u = S(x, 'sourceURL'));
                }
                if (u) {
                    let h = u.replace(/\$RepresentationID\$/g, o);
                    t[o].push({
                        repId: o,
                        type: 'Init',
                        number: 0,
                        resolvedUrl: new URL(h, s).href,
                        template: h,
                        time: -1,
                        duration: 0,
                        timescale: parseInt(S(f || m, 'timescale') || '1'),
                    });
                }
                if (f) {
                    let h = parseInt(S(f, 'timescale') || '1'),
                        x = S(f, 'media'),
                        C = $(f, 'SegmentTimeline'),
                        E = parseInt(S(f, 'startNumber') || '1');
                    if (x && C) {
                        let y = E,
                            I = 0;
                        U(C, 'S').forEach((w) => {
                            let A = S(w, 't') ? parseInt(S(w, 't')) : I,
                                _ = parseInt(S(w, 'd')),
                                P = parseInt(S(w, 'r') || '0');
                            I = A;
                            for (let L = 0; L <= P; L++) {
                                let V = I,
                                    F = x
                                        .replace(/\$RepresentationID\$/g, o)
                                        .replace(
                                            /\$Number(%0\d+d)?\$/g,
                                            (W, Rt) =>
                                                String(y).padStart(
                                                    Rt
                                                        ? parseInt(
                                                              Rt.substring(
                                                                  2,
                                                                  Rt.length - 1
                                                              )
                                                          )
                                                        : 1,
                                                    '0'
                                                )
                                        )
                                        .replace(/\$Time\$/g, String(V));
                                (t[o].push({
                                    repId: o,
                                    type: 'Media',
                                    number: y,
                                    resolvedUrl: new URL(F, s).href,
                                    template: F,
                                    time: V,
                                    duration: _,
                                    timescale: h,
                                }),
                                    (I += _),
                                    y++);
                            }
                        });
                    } else if (x && S(f, 'duration')) {
                        let y = parseInt(S(f, 'duration')),
                            I = y / h,
                            w = 0,
                            A = E;
                        if (!i) {
                            let _ =
                                z(S(e, 'mediaPresentationDuration')) ||
                                z(S(l, 'duration'));
                            if (!_ || !I) return;
                            w = Math.ceil(_ / I);
                        }
                        for (let _ = 0; _ < w; _++) {
                            let P = A + _,
                                L = x
                                    .replace(/\$RepresentationID\$/g, o)
                                    .replace(/\$Number(%0\d+d)?\$/g, (V, F) =>
                                        String(P).padStart(
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
                            t[o].push({
                                repId: o,
                                type: 'Media',
                                number: P,
                                resolvedUrl: new URL(L, s).href,
                                template: L,
                                time: (P - E) * y,
                                duration: y,
                                timescale: h,
                            });
                        }
                    }
                } else if (m) {
                    let h = parseInt(S(m, 'timescale') || '1'),
                        x = parseInt(S(m, 'duration')),
                        C = 0;
                    U(m, 'SegmentURL').forEach((y, I) => {
                        let w = S(y, 'media');
                        w &&
                            (t[o].push({
                                repId: o,
                                type: 'Media',
                                number: I + 1,
                                resolvedUrl: new URL(w, s).href,
                                template: w,
                                time: C,
                                duration: x,
                                timescale: h,
                            }),
                            (C += x));
                    });
                } else if (p) {
                    let h =
                            z(S(e, 'mediaPresentationDuration')) ||
                            z(S(l, 'duration')) ||
                            0,
                        x =
                            $(l, 'AdaptationSet')?.representations?.[0]
                                ?.timescale || 1;
                    t[o].push({
                        repId: o,
                        type: 'Media',
                        number: 1,
                        resolvedUrl: s,
                        template: 'SegmentBase',
                        time: 0,
                        duration: h * x,
                        timescale: x,
                    });
                }
            }),
            t
        );
    }
    var pe = (e, s) => {
        for (let t of e) {
            if (t.type === s) return t;
            if (t.children?.length > 0) {
                let i = pe(t.children, s);
                if (i) return i;
            }
        }
        return null;
    };
    function Ar(e) {
        let s = pe(e.boxes, 'trak');
        if (!!!pe(e.boxes, 'vmhd')) return null;
        let a = !pe(s.children, 'elst');
        return {
            id: 'CMAF-PROFILE-CMF2-ELST',
            text: "'cmf2' Profile: Video tracks must not contain an Edit List ('elst') box",
            isoRef: 'Clause 7.7.2',
            status: a ? 'pass' : 'fail',
            details: a
                ? 'OK: No Edit List box found in video track.'
                : 'FAIL: An Edit List (`elst`) box was found, which is prohibited for video tracks under the `cmf2` profile.',
        };
    }
    function Rr(e) {
        let s = pe(e.boxes, 'esds');
        if (!s)
            return {
                id: 'CMAF-PROFILE-CAAC-ESDS',
                text: "'caac' Profile: An 'esds' box must be present in the sample entry",
                isoRef: 'Clause 10.3.4.2.2',
                status: 'fail',
                details:
                    'FAIL: The AudioSampleEntry for an AAC track must contain an Elementary Stream Descriptor (esds) box.',
            };
        let t = s.details?.decoded_audio_object_type?.value,
            i = s.details?.decoded_channel_configuration?.value,
            n = parseInt(i?.match(/\d+/)?.[0] || '0', 10),
            a = t && (t.includes('AAC LC') || t.includes('SBR')),
            r = n > 0 && n <= 2,
            o = [];
        (a ||
            o.push(
                `Invalid AudioObjectType: found ${t}. Expected AAC-LC or HE-AAC.`
            ),
            r ||
                o.push(
                    `Invalid channel configuration: found ${n} channels, max is 2.`
                ));
        let l = a && r;
        return {
            id: 'CMAF-PROFILE-CAAC-PARAMS',
            text: "'caac' Profile: Validate audio parameters (AOT, channels)",
            isoRef: 'Clause 10.4',
            status: l ? 'pass' : 'fail',
            details: l
                ? 'OK: Audio parameters conform to AAC Core profile.'
                : `FAIL: ${o.join(' ')}`,
        };
    }
    function $r(e) {
        let s = pe(e.boxes, 'stpp');
        if (!s) return null;
        let t = pe(s.children, 'mime');
        if (!t)
            return {
                id: 'CMAF-PROFILE-IM1T-MIME',
                text: "'im1t' Profile: A 'mime' box must be present in the 'stpp' sample entry",
                isoRef: 'Clause 11.3.2',
                status: 'fail',
                details:
                    'FAIL: The XMLSubtitleSampleEntry (`stpp`) for an IMSC1 track must contain a MIME Type (`mime`) box.',
            };
        let i = t.details?.content_type?.value || '',
            n = i.includes('codecs=im1t');
        return {
            id: 'CMAF-PROFILE-IM1T-CODEC',
            text: "'im1t' Profile: MIME type must declare 'im1t' codec",
            isoRef: 'Clause 11.3.3',
            status: n ? 'pass' : 'fail',
            details: n
                ? 'OK: `codecs=im1t` found in MIME box.'
                : `FAIL: Expected 'codecs=im1t' in MIME box, but found '${i}'.`,
        };
    }
    function Aa(e, s) {
        let t = [];
        if (e.includes('cmf2')) {
            let i = Ar(s);
            i && t.push(i);
        }
        if (e.includes('caac')) {
            let i = Rr(s);
            i && t.push(i);
        }
        if (e.includes('im1t')) {
            let i = $r(s);
            i && t.push(i);
        }
        return t;
    }
    var _r = [
        { box: 'ftyp', ignore: [] },
        { box: 'mvhd', ignore: ['creation_time', 'modification_time'] },
        {
            box: 'tkhd',
            ignore: ['creation_time', 'modification_time', 'width', 'height'],
        },
        { box: 'trex', ignore: [] },
        { box: 'elst', ignore: [] },
        { box: 'mdhd', ignore: ['creation_time', 'modification_time'] },
        { box: 'mehd', ignore: [] },
        { box: 'hdlr', ignore: [] },
        { box: 'vmhd', ignore: [] },
        { box: 'smhd', ignore: [] },
        { box: 'sthd', ignore: [] },
        { box: 'dref', ignore: [] },
        { box: 'stsd', ignore: ['codingname'], childBoxesToIgnore: ['avcC'] },
        { box: 'pssh', ignore: [] },
        { box: 'sinf', ignore: [] },
        { box: 'tenc', ignore: [] },
    ];
    function Zt(e) {
        let s = b.segmentCache.get(e);
        return s && s.status !== -1 && s.parsedData
            ? s.parsedData.error
                ? Promise.reject(new Error(s.parsedData.error))
                : Promise.resolve(s.parsedData)
            : new Promise((t, i) => {
                  let n = ({ url: r, entry: o }) => {
                          r === e &&
                              (a(),
                              o.status !== 200
                                  ? i(new Error(`HTTP ${o.status} for ${e}`))
                                  : o.parsedData?.error
                                    ? i(new Error(o.parsedData.error))
                                    : t(o.parsedData));
                      },
                      a = T.subscribe('segment:loaded', n);
                  (!s || s.status !== -1) &&
                      T.dispatch('segment:fetch', { url: e });
              });
    }
    function Ra(e, s, t, i) {
        let n = e.rawElement;
        if (!n) return null;
        let a =
            $(n, 'SegmentTemplate') ||
            $(s.rawElement, 'SegmentTemplate') ||
            $(t.rawElement, 'SegmentTemplate');
        if (a && S(a, 'initialization'))
            return new URL(
                S(a, 'initialization').replace(/\$RepresentationID\$/g, e.id),
                i
            ).href;
        let r = $(n, 'SegmentBase'),
            o = r ? $(r, 'Initialization') : null;
        if (o && S(o, 'sourceURL')) return new URL(S(o, 'sourceURL'), i).href;
        let l = $(n, 'BaseURL');
        return l ? new URL(l.children[0].content, i).href : null;
    }
    async function $a(e) {
        if (e.protocol !== 'dash')
            return [
                {
                    id: 'CMAF-META',
                    text: 'CMAF Conformance',
                    status: 'info',
                    details:
                        'CMAF validation is currently only supported for DASH manifests.',
                },
            ];
        let s = e.manifest?.periods[0],
            t = s?.adaptationSets[0],
            i = t?.representations[0];
        if (!i || !t || !s)
            return [
                {
                    id: 'CMAF-META',
                    text: 'CMAF Conformance',
                    status: 'fail',
                    details: 'No representations found to validate.',
                },
            ];
        let a = Se(e.manifest.rawElement, e.baseUrl)[i.id],
            r = Ra(i, t, s, e.baseUrl),
            o = a?.find((l) => l.type === 'Media');
        if (!r || !o?.resolvedUrl)
            return [
                {
                    id: 'CMAF-META',
                    text: 'CMAF Conformance',
                    status: 'fail',
                    details:
                        'Could not determine initialization or media segment URL for validation.',
                },
            ];
        try {
            let [l, d] = await Promise.all([Zt(r), Zt(o.resolvedUrl)]),
                m =
                    l?.data?.boxes
                        ?.find((x) => x.type === 'ftyp')
                        ?.details?.cmafBrands?.value?.split(', ') || [];
            if (!m.includes('cmfc'))
                return [
                    {
                        id: 'CMAF-BRAND',
                        text: 'CMAF Brand Presence',
                        status: 'fail',
                        details: `The structural brand "cmfc" was not found in the initialization segment's ftyp box. This is not a CMAF track.`,
                    },
                ];
            let p = {
                    id: 'CMAF-BRAND',
                    text: 'CMAF Brand Presence',
                    status: 'pass',
                    details: `Structural brand "cmfc" found. Detected CMAF brands: ${m.join(', ')}`,
                },
                u = wa.map((x) => x(l.data, d.data)),
                h = Aa(m, l.data);
            return [p, ...u, ...h].filter(Boolean);
        } catch (l) {
            return [
                {
                    id: 'CMAF-META',
                    text: 'CMAF Conformance',
                    status: 'fail',
                    details: `Failed to fetch or parse segments for validation: ${l.message}`,
                },
            ];
        }
    }
    var Ne = (e, s) => {
        for (let t of e) {
            if (t.type === s) return t;
            if (t.children?.length > 0) {
                let i = Ne(t.children, s);
                if (i) return i;
            }
        }
        return null;
    };
    async function _a(e) {
        let s = [];
        if (e.protocol !== 'dash') return s;
        for (let t of e.manifest.periods)
            for (let i of t.adaptationSets) {
                let n = i.id || `${i.contentType}-${t.id}`;
                if (i.representations.length <= 1) {
                    s.push({
                        id: `SS-VALID-${n}`,
                        text: `Switching Set: ${n}`,
                        status: 'pass',
                        details: 'OK (Single Representation)',
                    });
                    continue;
                }
                try {
                    let a = i.representations.map((p) =>
                            Ra(p, i, t, e.baseUrl)
                        ),
                        r = await Promise.all(
                            a.map((p) => (p ? Zt(p) : Promise.resolve(null)))
                        ),
                        o = r[0]?.data;
                    if (!o) {
                        s.push({
                            id: `SS-VALID-${n}`,
                            text: `Switching Set: ${n}`,
                            status: 'fail',
                            details:
                                'Could not parse initialization segment for baseline representation.',
                        });
                        continue;
                    }
                    let l = !0,
                        d = [];
                    for (let p = 1; p < r.length; p++) {
                        let u = i.representations[p].id,
                            h = r[p]?.data;
                        if (!h) {
                            ((l = !1),
                                d.push(
                                    `[Rep ${u}]: Failed to parse initialization segment.`
                                ));
                            continue;
                        }
                        for (let x of _r) {
                            let C = Ne(o.boxes, x.box),
                                E = Ne(h.boxes, x.box);
                            if (!C && !E) continue;
                            if (!C || !E) {
                                ((l = !1),
                                    d.push(
                                        `[Rep ${u}]: Box '${x.box}' presence mismatch.`
                                    ));
                                continue;
                            }
                            let y = ct(C, E, x.ignore, x.childBoxesToIgnore);
                            y.areEqual ||
                                ((l = !1),
                                d.push(
                                    ...y.differences.map(
                                        (I) => `[Rep ${u}] ${I}`
                                    )
                                ));
                        }
                    }
                    let f = Ne(o.boxes, 'avcC'),
                        m = !1;
                    for (let p = 1; p < r.length; p++) {
                        let u = r[p]?.data;
                        if (!u) continue;
                        let h = Ne(u.boxes, 'avcC');
                        if (f && h) {
                            if (!ct(f, h).areEqual) {
                                m = !0;
                                break;
                            }
                        } else if (f || h) {
                            m = !0;
                            break;
                        }
                    }
                    (l
                        ? s.push({
                              id: `SS-VALID-${n}`,
                              text: `Switching Set: ${n}`,
                              status: 'pass',
                              details:
                                  'All tracks have compatible headers according to CMAF Table 11.',
                          })
                        : s.push({
                              id: `SS-VALID-${n}`,
                              text: `Switching Set: ${n}`,
                              status: 'fail',
                              details: `Inconsistencies found: ${d.join('; ')}`,
                          }),
                        m &&
                            s.push({
                                id: `SS-AVCC-${n}`,
                                text: `Switching Set: ${n} (avcC)`,
                                status: 'warn',
                                details:
                                    'AVC Configuration (`avcC`) boxes differ across Representations. This is common due to resolution-specific SPS/PPS data but is a deviation from strict CMAF switching set rules.',
                            }));
                } catch (a) {
                    s.push({
                        id: `SS-VALID-${n}`,
                        text: `Switching Set: ${n}`,
                        status: 'fail',
                        details: `Error during validation: ${a.message}`,
                    });
                }
            }
        return s;
    }
    var se = 'all',
        Q = { isLoading: !1, results: [] },
        He = { isLoading: !1, results: [] };
    function Dr(e) {
        e.querySelectorAll('.compliance-card').forEach((t) => {
            t.style.display =
                se === 'all' || t.classList.contains(`status-${se}`)
                    ? 'grid'
                    : 'none';
        });
    }
    function ze() {
        let e = document.getElementById('tab-compliance');
        e &&
            e.addEventListener('click', (s) => {
                let t = s.target.closest('[data-filter]');
                t &&
                    ((se = t.dataset.filter),
                    Dr(e),
                    e.querySelectorAll('[data-filter]').forEach((i) => {
                        let n = i.dataset.filter === se;
                        (i.classList.toggle('bg-blue-600', n),
                            i.classList.toggle('text-white', n),
                            i.classList.toggle('font-semibold', n),
                            i.classList.toggle('bg-gray-700', !n),
                            i.classList.toggle('text-gray-300', !n));
                    }));
            });
    }
    async function Pa(e) {
        let s = document.getElementById('tab-compliance');
        if (!s) return;
        ((Q = { isLoading: !0, results: [] }),
            (He = { isLoading: !0, results: [] }),
            R(Xe(e), s),
            ze(),
            (Q = { isLoading: !1, results: await $a(e) }),
            R(Xe(e), s),
            ze(),
            (He = { isLoading: !1, results: await _a(e) }),
            R(Xe(e), s),
            ze());
    }
    var Ma = (e) => {
            let t = {
                pass: {
                    icon: '\u2714',
                    color: 'text-green-400',
                    title: 'Passed',
                },
                fail: { icon: '\u2716', color: 'text-red-400', title: 'Error' },
                warn: {
                    icon: '\u26A0',
                    color: 'text-yellow-400',
                    title: 'Warning',
                },
                info: { icon: '\u2139', color: 'text-blue-400', title: 'Info' },
            }[e.status] || {
                icon: '?',
                color: 'text-gray-400',
                title: 'Unknown',
            };
            return c`
        <div
            class="compliance-card bg-gray-800 p-3 rounded-lg border border-gray-700 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] md:items-center gap-x-4 gap-y-2 status-${e.status}"
            style="display: ${se === 'all' || se === e.status ? 'grid' : 'none'}"
        >
            <div class="flex items-center gap-2 md:w-20">
                <span
                    class="${t.color} font-bold text-lg"
                    title="${t.title}"
                    >${t.icon}</span
                >
                <span class="md:hidden font-semibold text-gray-300"
                    >${e.text}</span
                >
            </div>
            <div class="pl-6 md:pl-0">
                <p class="hidden md:block font-semibold text-gray-200">
                    ${e.text}
                </p>
                <p class="text-xs text-gray-400 mt-1">${e.details}</p>
            </div>
            <div
                class="text-left md:text-right text-xs text-gray-500 font-mono pl-6 md:pl-0"
            >
                ${e.isoRef}
            </div>
        </div>
    `;
        },
        Pr = (e, s) =>
            !s || s.length === 0
                ? ''
                : c`
        <div class="mt-8">
            <h4 class="text-lg font-semibold text-gray-300 mb-3">
                ${e}
            </h4>
            <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                ${s.map((t) => Ma(t))}
            </div>
        </div>
    `,
        Da = (e, s) => c`
        <div class="mt-8">
            <h4 class="text-lg font-semibold text-gray-300 mb-3">${e}</h4>
            <div class="grid grid-cols-1 gap-2">
                ${
                    s.isLoading
                        ? c`<div class="text-center p-4 text-gray-400">
                          Running CMAF validation...
                      </div>`
                        : ''
                }
                ${s.results.map((t) => Ma(t))}
            </div>
        </div>
    `,
        Mr = (e) => c`
        <div class="mt-8">
            <h4 class="text-lg font-semibold text-gray-300 mb-3">
                CMAF Conformance
            </h4>
            <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <p class="text-sm text-gray-400 mb-4">
                    Run in-depth validation against the CMAF specification. This
                    will fetch and parse the initialization segment and the
                    first media segment.
                </p>
                <button
                    @click=${() => {
                        Pa(e);
                    }}
                    class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                >
                    Run CMAF Validation
                </button>
            </div>
        </div>
    `,
        kr = (e, s) => {
            let t = { pass: 0, warn: 0, fail: 0, info: 0 };
            e.forEach((a) => (t[a.status] = (t[a.status] || 0) + 1));
            let i = Or(e),
                n = (a, r, o) => c`<button
            class="px-3 py-1 rounded-full text-xs transition-colors duration-200 ${se === a ? 'bg-blue-600 text-white font-semibold' : 'bg-gray-700 text-gray-300'}"
            data-filter="${a}"
        >
            ${r} (${o})
        </button>`;
            return c`
        <h3 class="text-xl font-bold mb-2">${s}</h3>
        <p class="text-sm text-gray-400 mb-4">
            An analysis of the manifest against industry standards and common
            best practices.
        </p>

        <div
            class="flex items-center gap-4 mb-4 p-2 bg-gray-900/50 rounded-md sticky top-0 z-20 border-b border-gray-700"
        >
            <span class="text-sm font-semibold">Filter by Status:</span>
            ${n('all', 'All', e.length)}
            ${n('fail', 'Errors', t.fail)}
            ${n('warn', 'Warnings', t.warn)}
            ${n('pass', 'Passed', t.pass)}
            ${t.info > 0 ? n('info', 'Info', t.info) : ''}
        </div>
        ${Object.entries(i).map(([a, r]) => Pr(a, r))}
    `;
        };
    function Xe(e) {
        if (!e || !e.manifest) return c``;
        let s = { stream: e },
            t = e.protocol === 'hls' ? e.manifest : e.manifest.rawElement,
            i = Ca(t, e.protocol, s);
        e.protocol === 'dash' &&
            !Q.isLoading &&
            Q.results.length === 0 &&
            setTimeout(() => {
                let a = b.streams.find((r) => r.id === e.id);
                a && document.querySelector('#tab-compliance button') && Pa(a);
            }, 100);
        let n = [...i];
        return (
            (se = 'all'),
            c`
        ${kr(n, 'Manifest Compliance Report')}
        ${e.protocol === 'dash' && Q.results.length === 0 && !Q.isLoading ? Mr(e) : ''}
        ${e.protocol === 'dash' && (Q.isLoading || Q.results.length > 0) ? Da('CMAF Track Conformance', Q) : ''}
        ${e.protocol === 'dash' && (He.isLoading || He.results.length > 0) ? Da('CMAF Switching Set Analysis', He) : ''}
    `
        );
    }
    function Or(e) {
        let s = {};
        e.forEach((n) => {
            let a = n.category || 'General Best Practices';
            (s[a] || (s[a] = []), s[a].push(n));
        });
        let t = {},
            i = [
                'HLS Structure',
                'Manifest Structure',
                'Semantic & Temporal Rules',
                'Live Stream Properties',
                'Segment & Timing Info',
                'Profile Conformance',
                'Encryption',
                'Interoperability',
                'General Best Practices',
            ];
        for (let n of i) s[n] && (t[n] = s[n]);
        for (let n in s) t[n] || (t[n] = s[n]);
        return t;
    }
    var Lr = (e, s, t = 0) =>
            !e || e.length === 0
                ? ''
                : e.map((i) => {
                      let n = i.details,
                          a =
                              (n.presentation_time?.value || 0) /
                              (n.timescale?.value || 1),
                          r =
                              (n.event_duration?.value || 0) /
                              (n.timescale?.value || 1),
                          o = ((a - t) / s) * 100,
                          l = (r / s) * 100;
                      return o < 0 || o > 100
                          ? ''
                          : c`<div
            class="absolute top-0 h-full bg-yellow-500/50 border-l-2 border-yellow-400 z-10"
            style="left: ${o}%; width: ${Math.max(0.2, l)}%;"
            title="Event: ${n.scheme_id_uri?.value}\nID: ${n.id?.value}\nTime: ${a.toFixed(2)}s\nDuration: ${r.toFixed(2)}s"
        ></div>`;
                  }),
        Ur = (e) => {
            if (e.length === 0) return '';
            let s = [...e].sort((i, n) => i.bandwidth - n.bandwidth),
                t = Math.max(...s.map((i) => i.bandwidth || 0));
            return c`
        <div class="bg-gray-900 p-4 rounded-md mt-4">
            <div class="space-y-2">
            ${s.map((i) => {
                let n = ((i.bandwidth || 0) / t) * 100;
                return c`
                <div class="flex items-center">
                    <div class="w-28 text-xs text-gray-400 font-mono flex-shrink-0" title="Representation ID: ${i.id}">
                        ${i.resolution}
                    </div>
                    <div class="w-full bg-gray-700 rounded-full h-5">
                        <div
                            class="bg-blue-600 h-5 rounded-full text-xs font-medium text-blue-100 text-center p-0.5 leading-none"
                            style="width: ${n}%"
                        >
                            ${i.bandwidth ? (i.bandwidth / 1e3).toFixed(0) + ' kbps' : 'N/A'}
                        </div>
                    </div>
                </div>`;
            })}
            </div>
        </div>
    `;
        },
        Fr = (e) => {
            let { totalDuration: s, representations: t } = e;
            if (s === 0)
                return c`<p class="text-gray-400 text-sm">Cannot render timeline: Total duration is zero or unknown.</p>`;
            let i = t.flatMap((n) => n.events || []);
            return c`
        <div class="mt-8">
             <h4 class="text-lg font-bold">Switching Set: ${e.id}</h4>
             <div class="bg-gray-900 rounded-lg p-4 mt-2 relative">
                ${Lr(i, s)}
                ${t.map(
                    (n) => c`
                    <div class="flex items-center mb-1">
                        <div class="w-32 text-xs text-gray-400 font-mono flex-shrink-0 pr-2 text-right" title="Representation ID: ${n.id}">${n.resolution}</div>
                        <div class="w-full h-8 bg-gray-700/50 rounded flex items-center relative">
                            ${
                                n.fragments
                                    ? n.fragments.map(
                                          (a) => c`
                                <div class="h-full bg-gray-600 border-r border-gray-800"
                                     style="width: ${(a.duration / s) * 100}%;"
                                     title="Start: ${a.startTime.toFixed(2)}s, Duration: ${a.duration.toFixed(2)}s">
                                </div>
                            `
                                      )
                                    : c`<div class="w-full h-full bg-red-900/50 text-red-300 text-xs flex items-center justify-center p-2">${n.error}</div>`
                            }
                        </div>
                    </div>
                `
                )}
             </div>
             <div class="text-xs text-gray-400 mt-2 flex justify-between">
                <span>0.00s</span>
                <span>Total Duration: ${s.toFixed(2)}s</span>
            </div>
            ${Ur(t)}
        </div>
    `;
        };
    function ka(e) {
        return e
            ? e.length === 0
                ? c`<div class="text-center py-8 text-gray-400">No video switching sets with segment indexes found to build timeline.</div>`
                : c`
        <h3 class="text-xl font-bold mb-4">CMAF Timeline & Fragment Alignment</h3>
        ${e.map(Fr)}
    `
            : c`<div class="text-center py-8 text-gray-400">Loading timeline data...</div>`;
    }
    var Oa = (e, s) =>
            !e || e.length === 0
                ? ''
                : e.map((t) => {
                      let i = (t.startTime / s) * 100,
                          n = (t.duration / s) * 100,
                          a = t.message.toLowerCase().includes('interstitial'),
                          r = a
                              ? 'bg-purple-500/60 border-l-4 border-purple-400'
                              : 'bg-yellow-500/50 border-l-2 border-yellow-400',
                          o = a ? `Interstitial Ad: ${t.message}` : t.message;
                      return c`<div
            class="absolute top-0 bottom-0 ${r}"
            style="left: ${i}%; width: ${n}%;"
            title="${o}
Start: ${t.startTime.toFixed(2)}s
Duration: ${t.duration.toFixed(2)}s"
        ></div>`;
                  }),
        Br = (e) => {
            let s = e.periods
                .flatMap((n) => n.adaptationSets)
                .filter((n) => n.contentType === 'video')
                .flatMap((n) => n.representations)
                .sort((n, a) => n.bandwidth - a.bandwidth);
            if (s.length === 0) return c``;
            let t = Math.max(...s.map((n) => n.bandwidth)),
                i = s.map((n) => {
                    let a = n.bandwidth,
                        r = (a / t) * 100,
                        o =
                            n.width && n.height
                                ? `${n.width}x${n.height}`
                                : 'Audio Only',
                        l = n.codecs || 'N/A';
                    return c`
            <div class="flex items-center" title="Codecs: ${l}">
                <div class="w-28 text-xs text-gray-400 font-mono flex-shrink-0">
                    ${o}
                </div>
                <div class="w-full bg-gray-700 rounded-full h-5">
                    <div
                        class="bg-blue-600 h-5 rounded-full text-xs font-medium text-blue-100 text-center p-0.5 leading-none"
                        style="width: ${r}%"
                    >
                        ${(a / 1e3).toFixed(0)} kbps
                    </div>
                </div>
            </div>
        `;
                });
            return c`
        <div class="mt-6">
            <h4 class="text-lg font-bold">ABR Bitrate Ladder</h4>
            <div class="bg-gray-900 p-4 rounded-md mt-4 space-y-2">
                ${i}
            </div>
        </div>
    `;
        },
        Nr = (e) => {
            let { periods: s } = e,
                t = s.flatMap((o) => o.adaptationSets),
                i = t
                    .filter((o) => o.contentType === 'video')
                    .reduce((o, l) => o + l.representations.length, 0),
                n = t.filter((o) => o.contentType === 'audio').length,
                a = t.filter(
                    (o) =>
                        o.contentType === 'text' ||
                        o.contentType === 'application'
                ).length,
                r = (o, l) => c`
        <div class="bg-gray-900 p-3 rounded-lg border border-gray-700">
            <dt class="text-sm font-medium text-gray-400">${o}</dt>
            <dd class="text-lg font-mono text-white mt-1">${l}</dd>
        </div>
    `;
            return c`
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            ${r('Variant Streams', i)}
            ${r('Audio Renditions', n)}
            ${r('Subtitle Renditions', a)}
        </div>
    `;
        },
        Hr = (e) => {
            let s = e.segments || [],
                t = e.duration;
            if (t === 0 || s.length === 0)
                return c`<p class="info">
            No segments found or total duration is zero.
        </p>`;
            let i = s.map((a) => `${(a.duration / t) * 100}%`).join(' '),
                n = s.map((a, r) => {
                    let o = a.discontinuity;
                    return c`
            <div
                class="bg-gray-700 rounded h-10 border-r-2 ${o ? 'border-l-4 border-l-yellow-400' : 'border-gray-900'} last:border-r-0"
                title="Segment ${r + 1}
Duration: ${a.duration.toFixed(3)}s ${
                        o
                            ? `
(Discontinuity)`
                            : ''
                    }"
            ></div>
        `;
                });
            return c`
        <h3 class="text-xl font-bold mb-4">Timeline Visualization</h3>
        <div class="bg-gray-900 rounded-lg p-2 relative">
            <div
                class="grid grid-flow-col auto-cols-fr"
                style="grid-template-columns: ${i}"
            >
                ${n}
            </div>
            ${Oa(e.events, t)}
        </div>
        <div class="text-xs text-gray-400 mt-2 text-right">
            Total Duration: ${t.toFixed(2)}s
        </div>
    `;
        },
        zr = (e) => {
            let s = e.segments || [],
                t = e.targetDuration || 10,
                i = s.slice(-3 * t),
                n = i.reduce((f, m) => f + m.duration, 0),
                a = e.serverControl?.['PART-HOLD-BACK'],
                r = a != null && n > 0 ? 100 - (a / n) * 100 : null,
                o = e.preloadHints?.find((f) => f.TYPE === 'PART'),
                l = o?.DURATION || 0,
                d = (l / n) * 100;
            return c`
        <h3 class="text-xl font-bold mb-4">Live Timeline Visualization</h3>
        <div class="bg-gray-900 rounded-lg p-4 text-center">
            <div
                class="flex items-center justify-between text-sm text-gray-400 mb-2"
            >
                <span
                    >Segments in Playlist:
                    <strong>${s.length}</strong></span
                >
                <span
                    >Target Duration: <strong>${t}s</strong></span
                >
                <span
                    >Current Window Duration:
                    <strong>${n.toFixed(2)}s</strong></span
                >
            </div>
            <div class="bg-gray-800 p-2 rounded relative">
                <div
                    class="grid grid-flow-col auto-cols-fr h-10"
                    style="grid-template-columns: ${i.map((f) => `${(f.duration / n) * 100}%`).join(' ')}"
                >
                    ${i.map(
                        (f, m) => c`<div
                                class="bg-gray-700/50 border-r border-gray-900 flex"
                                title="Segment Duration: ${f.duration.toFixed(2)}s"
                            >
                                ${f.parts.map(
                                    (p) => c`
                                        <div
                                            class="h-full bg-blue-800/60 border-r border-gray-700"
                                            style="width: ${(p.DURATION / f.duration) * 100}%"
                                            title="Partial Segment
Duration: ${p.DURATION.toFixed(3)}s
Independent: ${p.INDEPENDENT === 'YES' ? 'Yes' : 'No'}"
                                        ></div>
                                    `
                                )}
                            </div>`
                    )}
                </div>
                ${Oa(e.events, n)}
                ${
                    o
                        ? c`
                    <div class="absolute top-0 right-0 h-full bg-blue-500/20 border-l-2 border-dashed border-blue-400"
                         style="width: ${d}%; transform: translateX(100%);"
                         title="Preload Hint: ${o.URI}\nDuration: ${l}s">
                    </div>
                `
                        : ''
                }
                ${
                    r !== null
                        ? c`<div
                          class="absolute top-0 bottom-0 w-0.5 bg-cyan-400"
                          style="left: ${r}%;"
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
        };
    function La(e) {
        return e.isMaster
            ? c`
            <h3 class="text-xl font-bold mb-4">HLS Master Playlist</h3>
            <p class="text-sm text-gray-400 mb-4">
                A master playlist defines available variants but does not have a
                monolithic timeline.
            </p>
            ${Nr(e)}
            ${Br(e)}
        `
            : e.type === 'dynamic'
              ? zr(e)
              : Hr(e);
    }
    async function Ua(e) {
        if (!e || !e.manifest) return [];
        let s = Se(e.manifest.rawElement, e.baseUrl),
            t = e.manifest.periods.flatMap((i) =>
                i.adaptationSets
                    .filter((n) => n.contentType === 'video')
                    .map((n) => {
                        let a = n.representations.map((o) => {
                                let d = (s[o.id] || []).filter(
                                    (p) => p.type === 'Media'
                                );
                                if (d.length === 0)
                                    return {
                                        id: o.id,
                                        bandwidth: o.bandwidth,
                                        resolution: `${o.width}x${o.height}`,
                                        error: 'No media segments could be parsed for this Representation.',
                                        fragments: [],
                                        events: [],
                                    };
                                let f = d.map((p) => ({
                                        startTime: p.time / p.timescale,
                                        duration: p.duration / p.timescale,
                                    })),
                                    m = [];
                                return (
                                    b.segmentCache.forEach((p) => {
                                        p.parsedData?.data?.events &&
                                            m.push(...p.parsedData.data.events);
                                    }),
                                    {
                                        id: o.id,
                                        bandwidth: o.bandwidth,
                                        resolution: `${o.width}x${o.height}`,
                                        fragments: f,
                                        events: m,
                                    }
                                );
                            }),
                            r = a[0]?.fragments
                                ? a[0].fragments.reduce(
                                      (o, l) => o + l.duration,
                                      0
                                  )
                                : 0;
                        return {
                            id: n.id || 'video-set',
                            totalDuration: r,
                            representations: a,
                        };
                    })
            );
        return Promise.resolve(t);
    }
    function es(e, s, t, i) {
        return s === 'hls'
            ? La(e)
            : i
              ? c`<div class="text-center py-8 text-gray-400">
            Loading timeline data...
        </div>`
              : ka(t);
    }
    function Fa(e, s) {
        if (s.protocol === 'hls') {
            R(es(s.manifest, s.protocol), e);
            return;
        }
        (R(es(s.manifest, s.protocol, null, !0), e),
            Ua(s)
                .then((t) => {
                    R(es(s.manifest, s.protocol, t, !1), e);
                })
                .catch((t) => {
                    console.error(
                        'Failed to create DASH timeline view model:',
                        t
                    );
                    let i = c`<div
                class="text-red-400 p-4 text-center"
            >
                <p class="font-bold">Error loading timeline visualization.</p>
                <p class="text-sm font-mono mt-2">${t.message}</p>
            </div>`;
                    R(i, e);
                }));
    }
    var Ba = [
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
    var Na = [
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
    var Xr = {
        'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed': 'Widevine',
        'urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95': 'PlayReady',
        'urn:uuid:f239e769-efa3-4850-9c16-a903c6932efb': 'Adobe PrimeTime',
        'urn:uuid:1077efec-c0b2-4d02-ace3-3c1e52e2fb4b': 'ClearKey',
        'urn:uuid:94ce86fb-07ff-4f43-adb8-93d2fa968ca2': 'FairPlay',
        'urn:mpeg:dash:mp4protection:2011': 'MPEG Common Encryption (CENC)',
    };
    function ft(e) {
        if (!e) return 'Unknown Scheme';
        let s = e.toLowerCase();
        return Xr[s] || `Unknown (${e})`;
    }
    var G = (e, s) => {
            if (!e) return [];
            let t = [];
            for (let i of e)
                i.type === 'element' &&
                    (i.tagName === s && t.push(i),
                    i.children?.length > 0 && (t = t.concat(G(i.children, s))));
            return t;
        },
        pt = (e, s) => {
            if (!e) return null;
            for (let t of e)
                if (t.type === 'element') {
                    if (t.tagName === s) return t;
                    if (t.children?.length > 0) {
                        let i = pt(t.children, s);
                        if (i) return i;
                    }
                }
            return null;
        },
        ie = (e, s, t) => (i) => {
            let n = pt(i.children, e);
            return { used: !!n, details: n ? s(n) : t };
        },
        ts = (e, s, t) => (i) => {
            let a = G(i.children, e).length;
            return a === 0
                ? { used: !1, details: '' }
                : { used: !0, details: `${a} ${a === 1 ? s : t} found.` };
        },
        Vr = {
            'Presentation Type': (e) => ({
                used: !0,
                details: `<code>${e.attributes.type}</code>`,
            }),
            'MPD Locations': ts('Location', 'location', 'locations provided'),
            'Scoped Profiles': (e) => {
                let s = G(e.children, 'AdaptationSet'),
                    t = G(e.children, 'Representation'),
                    i =
                        s.filter((a) => a.attributes.profiles).length +
                        t.filter((a) => a.attributes.profiles).length;
                return i === 0
                    ? { used: !1, details: '' }
                    : {
                          used: !0,
                          details: `${i} ${i === 1 ? 'scoped profile' : 'scoped profiles'}`,
                      };
            },
            'Multi-Period': ts('Period', 'Period', 'Periods'),
            'Content Protection': (e) => {
                let s = G(e.children, 'ContentProtection');
                return s.length > 0
                    ? {
                          used: !0,
                          details: `Systems: <b>${[...new Set(s.map((i) => ft(i.attributes.schemeIdUri)))].join(', ')}</b>`,
                      }
                    : { used: !1, details: 'No encryption descriptors found.' };
            },
            'Client Authentication': ie(
                'EssentialProperty',
                () => 'Signals requirement for client authentication.',
                ''
            ),
            'Content Authorization': ie(
                'SupplementalProperty',
                () => 'Signals requirement for content authorization.',
                ''
            ),
            'Segment Templates': ie(
                'SegmentTemplate',
                () => 'Uses templates for segment URL generation.',
                ''
            ),
            'Segment Timeline': ie(
                'SegmentTimeline',
                () =>
                    'Provides explicit segment timing via <code>&lt;S&gt;</code> elements.',
                ''
            ),
            'Segment List': ie(
                'SegmentList',
                () => 'Provides an explicit list of segment URLs.',
                ''
            ),
            'Representation Index': ts(
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
                let s = !!pt(e.children, 'Latency'),
                    i = G(e.children, 'SegmentTemplate').some(
                        (n) => n.attributes.availabilityTimeComplete === 'false'
                    );
                if (s || i) {
                    let n = [];
                    return (
                        s &&
                            n.push(
                                '<code>&lt;Latency&gt;</code> target defined.'
                            ),
                        i && n.push('Chunked transfer hint present.'),
                        { used: !0, details: n.join(' ') }
                    );
                }
                return {
                    used: !1,
                    details: 'No specific low-latency signals found.',
                };
            },
            'Manifest Patch Updates': ie(
                'PatchLocation',
                (e) =>
                    `Patch location: <code>${e.children[0]?.content.trim()}</code>`,
                'Uses full manifest reloads.'
            ),
            'UTC Timing Source': (e) => {
                let s = G(e.children, 'UTCTiming');
                return s.length > 0
                    ? {
                          used: !0,
                          details: `Schemes: ${[...new Set(s.map((i) => `<code>${i.attributes.schemeIdUri.split(':').pop()}</code>`))].join(', ')}`,
                      }
                    : {
                          used: !1,
                          details: 'No clock synchronization source provided.',
                      };
            },
            'Dependent Representations': (e) => {
                let s = G(e.children, 'Representation').filter(
                    (t) => t.attributes.dependencyId
                );
                return s.length > 0
                    ? {
                          used: !0,
                          details: `${s.length} dependent Representations`,
                      }
                    : { used: !1, details: '' };
            },
            'Associated Representations': (e) => {
                let s = G(e.children, 'Representation').filter(
                    (t) => t.attributes.associationId
                );
                return s.length > 0
                    ? { used: !0, details: `${s.length} associations` }
                    : { used: !1, details: '' };
            },
            'Trick Modes': (e) => {
                let s = pt(e.children, 'SubRepresentation'),
                    t = G(e.children, 'Role').some(
                        (i) => i.attributes.value === 'trick'
                    );
                if (s || t) {
                    let i = [];
                    return (
                        s && i.push('<code>&lt;SubRepresentation&gt;</code>'),
                        t && i.push('<code>Role="trick"</code>'),
                        { used: !0, details: `Detected via: ${i.join(', ')}` }
                    );
                }
                return {
                    used: !1,
                    details: 'No explicit trick mode signals found.',
                };
            },
            'Subtitles & Captions': (e) => {
                let s = G(e.children, 'AdaptationSet').filter(
                    (t) =>
                        t.attributes.contentType === 'text' ||
                        t.attributes.mimeType?.startsWith('application')
                );
                if (s.length > 0) {
                    let t = [
                        ...new Set(
                            s.map((i) => i.attributes.lang).filter(Boolean)
                        ),
                    ];
                    return {
                        used: !0,
                        details: `Found ${s.length} track(s). ${t.length > 0 ? `Languages: <b>${t.join(', ')}</b>` : ''}`,
                    };
                }
                return {
                    used: !1,
                    details: 'No text or application AdaptationSets found.',
                };
            },
            'Role Descriptors': (e) => {
                let s = G(e.children, 'Role');
                return s.length > 0
                    ? {
                          used: !0,
                          details: `Roles found: ${[...new Set(s.map((i) => `<code>${i.attributes.value}</code>`))].join(', ')}`,
                      }
                    : { used: !1, details: 'No roles specified.' };
            },
            'MPD Events': ie(
                'EventStream',
                () => 'Uses <EventStream> for out-of-band event signaling.',
                ''
            ),
            'Inband Events': ie(
                'InbandEventStream',
                () =>
                    'Uses <InbandEventStream> to signal events within segments.',
                ''
            ),
        };
    function Ha(e) {
        let s = {};
        if (!e)
            return {
                Error: {
                    used: !0,
                    details:
                        'Serialized XML object was not found for feature analysis.',
                },
            };
        for (let [t, i] of Object.entries(Vr))
            try {
                s[t] = i(e);
            } catch (n) {
                (console.error(`Error analyzing feature "${t}":`, n),
                    (s[t] = { used: !1, details: 'Analysis failed.' }));
            }
        return s;
    }
    function za(e) {
        let s = {},
            t = e.tags || [];
        ((s['Presentation Type'] = {
            used: !0,
            details:
                e.type === 'dynamic'
                    ? '<code>EVENT</code> or Live'
                    : '<code>VOD</code>',
        }),
            (s['Master Playlist'] = {
                used: e.isMaster,
                details: e.isMaster
                    ? `${e.variants?.length || 0} Variant Streams found.`
                    : 'Media Playlist.',
            }));
        let i = (e.segments || []).some((u) => u.discontinuity);
        s.Discontinuity = {
            used: i,
            details: i
                ? 'Contains #EXT-X-DISCONTINUITY tags.'
                : 'No discontinuities found.',
        };
        let n = t.find((u) => u.name === 'EXT-X-KEY');
        if (n && n.value.METHOD !== 'NONE') {
            let u = [
                ...new Set(
                    t
                        .filter((h) => h.name === 'EXT-X-KEY')
                        .map((h) => h.value.METHOD)
                ),
            ];
            s['Content Protection'] = {
                used: !0,
                details: `Methods: <b>${u.join(', ')}</b>`,
            };
        } else
            s['Content Protection'] = {
                used: !1,
                details: 'No #EXT-X-KEY tags found.',
            };
        let a = t.some((u) => u.name === 'EXT-X-MAP');
        ((s['Fragmented MP4 Segments'] = {
            used: a,
            details: a
                ? 'Uses #EXT-X-MAP, indicating fMP4 segments.'
                : 'Likely Transport Stream (TS) segments.',
        }),
            (s['I-Frame Playlists'] = {
                used: t.some((u) => u.name === 'EXT-X-I-FRAME-STREAM-INF'),
                details: 'Provides dedicated playlists for trick-play modes.',
            }));
        let r = t.filter((u) => u.name === 'EXT-X-MEDIA');
        ((s['Alternative Renditions'] = {
            used: r.length > 0,
            details:
                r.length > 0
                    ? `${r.length} #EXT-X-MEDIA tags found.`
                    : 'No separate audio/video/subtitle renditions declared.',
        }),
            (s['Date Ranges / Timed Metadata'] = {
                used: e.events.some((u) => u.type === 'hls-daterange'),
                details:
                    'Carries timed metadata, often used for ad insertion signaling.',
            }));
        let o = r.some((u) => u.value.TYPE === 'SUBTITLES');
        ((s['Subtitles & Captions'] = {
            used: o,
            details: o
                ? 'Contains #EXT-X-MEDIA tags with TYPE=SUBTITLES.'
                : 'No subtitle renditions declared.',
        }),
            (s['Session Data'] = {
                used: t.some((u) => u.name === 'EXT-X-SESSION-DATA'),
                details:
                    'Carries arbitrary session data in the master playlist.',
            }),
            (s['Session Keys'] = {
                used: t.some((u) => u.name === 'EXT-X-SESSION-KEY'),
                details:
                    'Allows pre-loading of encryption keys from the master playlist.',
            }),
            (s['Independent Segments'] = {
                used: t.some((u) => u.name === 'EXT-X-INDEPENDENT-SEGMENTS'),
                details: 'All segments are self-contained for decoding.',
            }),
            (s['Start Offset'] = {
                used: t.some((u) => u.name === 'EXT-X-START'),
                details:
                    'Specifies a preferred starting position in the playlist.',
            }));
        let l = [];
        (e.partInf && l.push('EXT-X-PART-INF'),
            (e.segments || []).some((u) => (u.parts || []).length > 0) &&
                l.push('EXT-X-PART'),
            e.serverControl && l.push('EXT-X-SERVER-CONTROL'),
            (e.preloadHints || []).length > 0 && l.push('EXT-X-PRELOAD-HINT'),
            (e.renditionReports || []).length > 0 &&
                l.push('EXT-X-RENDITION-REPORT'),
            (s['Low-Latency HLS'] = {
                used: l.length > 0,
                details:
                    l.length > 0
                        ? `Detected low-latency tags: <b>${l.join(', ')}</b>`
                        : 'Standard latency HLS.',
            }));
        let d = t.some((u) => u.name === 'EXT-X-SKIP');
        s['Playlist Delta Updates'] = {
            used: d,
            details: d
                ? 'Contains #EXT-X-SKIP tag, indicating a partial playlist update.'
                : 'No delta updates detected.',
        };
        let f = t.some((u) => u.name === 'EXT-X-DEFINE');
        s['Variable Substitution'] = {
            used: f,
            details: f
                ? 'Uses #EXT-X-DEFINE for variable substitution.'
                : 'No variables defined.',
        };
        let m = t.some((u) => u.name === 'EXT-X-CONTENT-STEERING');
        s['Content Steering'] = {
            used: m,
            details: m
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
            r.some((u) => u.value['STABLE-RENDITION-ID']) &&
                p.push('STABLE-RENDITION-ID'),
            e.events.some(
                (u) =>
                    u.type === 'hls-daterange' &&
                    u.message.toLowerCase().includes('interstitial')
            ) && p.push('Interstitials'),
            (s['Advanced Metadata & Rendition Selection'] = {
                used: p.length > 0,
                details:
                    p.length > 0
                        ? `Detected advanced attributes: <b>${p.join(', ')}</b>`
                        : 'Uses standard metadata.',
            }),
            s
        );
    }
    function Xa(e, s, t = null) {
        return s === 'dash' ? Ha(t) : za(e);
    }
    function Va(e, s) {
        return (s === 'dash' ? Ba : Na).map((i) => {
            let n = e.get(i.name) || {
                used: !1,
                details: 'Not detected in manifest.',
            };
            return { ...i, ...n };
        });
    }
    var jr = (e) => {
            let s = e.used
                ? c`<span
              class="text-xs font-semibold px-2 py-1 bg-green-800 text-green-200 rounded-full"
              >Used</span
          >`
                : c`<span
              class="text-xs font-semibold px-2 py-1 bg-gray-600 text-gray-300 rounded-full"
              >Not Used</span
          >`;
            return c`
        <div
            class="grid grid-cols-[100px_1fr] items-center bg-gray-800 p-3 rounded-lg border border-gray-700"
        >
            <div class="text-center">${s}</div>
            <div>
                <p
                    class="font-medium ${k}"
                    data-tooltip="${e.desc}"
                    data-iso="${e.isoRef}"
                >
                    ${e.name}
                </p>
                <p class="text-xs text-gray-400 italic mt-1 font-mono">
                    ${N(e.details)}
                </p>
            </div>
        </div>
    `;
        },
        Gr = (e, s) => c`
    <div class="mt-8">
        <h4 class="text-lg font-semibold text-gray-300 mb-3">${e}</h4>
        <div class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(400px,1fr))]">
            ${s.map((t) => jr(t))}
        </div>
    </div>
`;
    function mt(e) {
        if (!e) return c`<p class="warn">No stream loaded to display.</p>`;
        let { results: s, manifestCount: t } = e.featureAnalysis,
            n = Va(s, e.protocol).reduce(
                (r, o) => (
                    r[o.category] || (r[o.category] = []),
                    r[o.category].push(o),
                    r
                ),
                {}
            );
        return c`
        <h3 class="text-xl font-bold mb-2">Feature Usage Analysis</h3>
        ${
            e.manifest?.type !== 'dynamic'
                ? c`
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
                : c`
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
                        <b class="text-cyan-300 font-bold">${t}</b>
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
        ${Object.entries(n).map(([r, o]) => Gr(r, o))}
    `;
    }
    var ss = {
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
    var me = 1,
        is = 500,
        ue = (e) =>
            e
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;'),
        ns = (e) => {
            let s = e.startsWith('/'),
                t = s ? e.substring(1) : e,
                i = ss[t],
                [n, a] = t.includes(':') ? t.split(':') : [null, t],
                r = n ? `<span class="text-gray-400">${n}:</span>` : '',
                o =
                    'text-blue-300 rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700',
                l = i
                    ? `data-tooltip="${ue(i.text)}" data-iso="${ue(i.isoRef)}"`
                    : '';
            return `&lt;${s ? '/' : ''}<span class="${i ? k : ''}" ${l}>${r}<span class="${o}">${a}</span></span>`;
        },
        qr = (e, s) => {
            let t = `${e}@${s.name}`,
                i = ss[t],
                n =
                    'text-emerald-300 rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700',
                a = 'text-yellow-300',
                r = ['xmlns', 'xmlns:xsi', 'xsi:schemaLocation'].includes(
                    s.name
                ),
                o = '',
                l = '';
            return (
                i
                    ? ((o = k),
                      (l = `data-tooltip="${ue(i.text)}" data-iso="${ue(i.isoRef)}"`))
                    : r ||
                      ((o =
                          'cursor-help bg-red-900/50 missing-tooltip-trigger'),
                      (l = `data-tooltip="Tooltip definition missing for '${s.name}' on <${e}>"`)),
                `<span class="${n} ${o}" ${l}>${s.name}</span>="<span class="${a}">${ue(s.value)}</span>"`
            );
        },
        ja = (e, s = 0) => {
            if (!e || typeof e.nodeType > 'u') return [];
            let t = '  '.repeat(s);
            switch (e.nodeType) {
                case Node.ELEMENT_NODE: {
                    let i = e,
                        n = Array.from(i.childNodes).filter(
                            (r) =>
                                r.nodeType === Node.ELEMENT_NODE ||
                                r.nodeType === Node.COMMENT_NODE ||
                                (r.nodeType === Node.TEXT_NODE &&
                                    r.textContent.trim())
                        ),
                        a = Array.from(i.attributes)
                            .map((r) => ` ${qr(i.tagName, r)}`)
                            .join('');
                    if (n.length > 0) {
                        let r = `${t}${ns(i.tagName)}${a}&gt;`,
                            o = n.flatMap((d) => ja(d, s + 1)),
                            l = `${t}${ns(`/${i.tagName}`)}&gt;`;
                        return [r, ...o, l];
                    } else return [`${t}${ns(i.tagName)}${a} /&gt;`];
                }
                case Node.TEXT_NODE:
                    return [
                        `${t}<span class="text-gray-200">${ue(e.textContent.trim())}</span>`,
                    ];
                case Node.COMMENT_NODE:
                    return [
                        `${t}<span class="text-gray-500 italic">&lt;!--${ue(e.textContent)}--&gt;</span>`,
                    ];
                default:
                    return [];
            }
        },
        Kr = (e) => {
            if (!e || !e.originalUrl) {
                T.dispatch('ui:show-status', {
                    message: 'Cannot reload a manifest from a local file.',
                    type: 'warn',
                    duration: 4e3,
                });
                return;
            }
            (T.dispatch('ui:show-status', {
                message: `Reloading manifest for ${e.name}...`,
                type: 'info',
                duration: 2e3,
            }),
                T.dispatch('manifest:force-reload', { streamId: e.id }));
        },
        as = (e) => {
            let t =
                    e.manifestUpdates && e.manifestUpdates.length > 0
                        ? e.manifestUpdates[e.activeManifestUpdateIndex]
                              .rawManifest
                        : e.rawManifest,
                i,
                a = new DOMParser().parseFromString(t, 'application/xml'),
                r = a.querySelector('parsererror');
            if (r)
                return (
                    console.error('XML Parsing Error:', r.textContent),
                    c`<div class="text-red-400 p-4 font-mono">
            <p class="font-bold">Failed to parse manifest XML.</p>
            <pre
                class="mt-2 bg-gray-900 p-2 rounded"
            >${r.textContent}</pre>
        </div>`
                );
            if (((i = a.querySelector('MPD')), !i))
                return c`<div class="text-red-400 p-4">
            Error: &lt;MPD&gt; root element not found in the manifest.
        </div>`;
            let o = ja(i),
                l = Math.ceil(o.length / is);
            i !== window.lastRenderedManifest &&
                ((me = 1), (window.lastRenderedManifest = i));
            let d = (h) => {
                    let x = me + h;
                    if (x >= 1 && x <= l) {
                        me = x;
                        let C = document.getElementById(
                            'tab-interactive-manifest'
                        );
                        R(as(e), C);
                    }
                },
                f = (me - 1) * is,
                m = f + is,
                p = o.slice(f, m),
                u =
                    l > 1
                        ? c` <div class="text-center text-sm text-gray-400 mt-4">
                  <button
                      @click=${() => d(-1)}
                      ?disabled=${me === 1}
                      class="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-2"
                  >
                      &larr; Previous
                  </button>
                  <span
                      >Page ${me} of ${l} (Lines
                      ${f + 1}-${Math.min(m, o.length)})</span
                  >
                  <button
                      @click=${() => d(1)}
                      ?disabled=${me === l}
                      class="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-2"
                  >
                      Next &rarr;
                  </button>
              </div>`
                        : '';
            return c`
        <div class="flex justify-between items-center mb-2">
            <h3 class="text-xl font-bold">Interactive Manifest</h3>
            <button
                @click=${() => Kr(e)}
                class="bg-gray-600 hover:bg-gray-700 text-white font-bold text-xs py-1 px-3 rounded-md transition-colors"
            >
                Reload
            </button>
        </div>
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            ${p.map(
                (h, x) => c`
                    <div class="flex">
                        <span
                            class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-12"
                            >${f + x + 1}</span
                        >
                        <span class="flex-grow whitespace-pre-wrap break-all"
                            >${N(h)}</span
                        >
                    </div>
                `
            )}
        </div>
        ${u}
    `;
        };
    var Te = {
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
    var K = (e) =>
            e
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;'),
        Wr = (e) => {
            if (!e || e.size === 0) return '';
            let s = Array.from(e.entries());
            return c`
        <div class="mb-4">
            <h4 class="text-md font-bold mb-2">Defined Variables</h4>
            <div class="bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden">
                <table class="w-full text-left text-xs">
                    <thead class="bg-gray-900">
                        <tr>
                            <th class="p-2 font-semibold text-gray-300">Variable Name</th>
                            <th class="p-2 font-semibold text-gray-300">Source</th>
                            <th class="p-2 font-semibold text-gray-300">Resolved Value</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-700">
                        ${s.map(
                            ([t, { value: i, source: n }]) => c`
                            <tr>
                                <td class="p-2 font-mono text-cyan-400">${t}</td>
                                <td class="p-2 font-mono text-gray-400">${n}</td>
                                <td class="p-2 font-mono text-yellow-300">${i}</td>
                            </tr>
                        `
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    `;
        },
        Yr = (e) => {
            let s = e.mediaPlaylists.get('master');
            if (!s || !s.manifest.isMaster) return c``;
            let t = s.manifest.summary.videoTracks.map((a, r) => ({
                    attributes: { BANDWIDTH: parseFloat(a.bitrateRange) * 1e3 },
                    resolvedUri:
                        e.manifest.rawElement?.variants[r]?.resolvedUri,
                })),
                i = (a) => {
                    let r = a.target.closest('button');
                    if (!r) return;
                    let o = r.dataset.url;
                    T.dispatch('hls:media-playlist-activate', {
                        streamId: e.id,
                        url: o,
                    });
                },
                n = (a, r, o) => c`
        <button
            class="px-3 py-1.5 text-sm rounded-md transition-colors ${o ? 'bg-blue-600 text-white font-semibold' : 'bg-gray-900 hover:bg-gray-700'}"
            data-url="${r}"
        >
            ${a}
        </button>
    `;
            return c`
        <div
            class="mb-4 p-2 bg-gray-900/50 rounded-lg flex flex-wrap gap-2"
            @click=${i}
        >
            ${n('Master Playlist', 'master', !e.activeMediaPlaylistUrl)}
            ${e.manifest.summary.videoTracks.map((a, r) => n(`Variant ${r + 1} (${a.bitrateRange})`, e.mediaPlaylists.get('master')?.manifest.rawElement?.variants[r]?.resolvedUri, e.activeMediaPlaylistUrl === e.mediaPlaylists.get('master')?.manifest.rawElement?.variants[r]?.resolvedUri))}
        </div>
    `;
        },
        Jr = (e) => {
            if (((e = e.trim()), !e.startsWith('#EXT')))
                return `<span class="${e.startsWith('#') ? 'text-gray-500 italic' : 'text-cyan-400'}">${K(e)}</span>`;
            let s = 'text-purple-300',
                t = 'text-emerald-300',
                i = 'text-yellow-300',
                n = `rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700 ${k}`,
                a = e.indexOf(':');
            if (a === -1) {
                let m = e.substring(1),
                    p = Te[m],
                    u = p
                        ? `data-tooltip="${K(p.text)}" data-iso="${K(p.isoRef)}"`
                        : '';
                return `#<span class="${s} ${p ? n : ''}" ${u}>${m}</span>`;
            }
            let r = e.substring(1, a),
                o = e.substring(a + 1),
                l = Te[r],
                d = l
                    ? `data-tooltip="${K(l.text)}" data-iso="${K(l.isoRef)}"`
                    : '',
                f = '';
            return (
                o.includes('=')
                    ? (f = (o.match(/("[^"]*")|[^,]+/g) || [])
                          .map((p) => {
                              let u = p.indexOf('=');
                              if (u === -1) return K(p);
                              let h = p.substring(0, u),
                                  x = p.substring(u + 1),
                                  C = `${r}@${h}`,
                                  E = Te[C],
                                  y = '',
                                  I = '';
                              return (
                                  E
                                      ? ((y = n),
                                        (I = `data-tooltip="${K(E.text)}" data-iso="${K(E.isoRef)}"`))
                                      : ((y =
                                            'cursor-help bg-red-900/50 missing-tooltip-trigger'),
                                        (I = `data-tooltip="Tooltip definition missing for '${h}' on tag #${r}"`)),
                                  `<span class="${t} ${y}" ${I}>${K(h)}</span>=<span class="${i}">${K(x)}</span>`
                              );
                          })
                          .join('<span class="text-gray-400">,</span>'))
                    : (f = `<span class="${i}">${K(o)}</span>`),
                `#<span class="${s} ${l ? n : ''}" ${d}>${r}</span>:<span class="font-normal">${f}</span>`
            );
        },
        Ga = (e) => {
            let s = Te[e.name] || {};
            return c`
    <div class="flex">
        <span class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-10">&nbsp;</span>
        <span class="flex-grow whitespace-pre-wrap break-all bg-gray-900/50 p-2 rounded border-l-2 border-cyan-500">
             <div class="font-semibold text-cyan-300 mb-1 ${k}" data-tooltip="${s.text}" data-iso="${s.isoRef}">${e.name}</div>
             <dl class="grid grid-cols-[auto_1fr] gap-x-4 text-xs">
                ${Object.entries(e.value).map(([t, i]) => {
                    let n = Te[`${e.name}@${t}`] || {};
                    return c`
                        <dt class="text-gray-400 ${k}" data-tooltip="${n.text}" data-iso="${n.ref}">${t}</dt>
                        <dd class="text-gray-200 font-mono">${i}</dd>
                    `;
                })}
             </dl>
        </span>
    </div>
    `;
        },
        Qr = (e) => {
            let s = e.activeMediaPlaylistUrl || e.originalUrl;
            if (!e || !s) {
                T.dispatch('ui:show-status', {
                    message: 'Cannot reload a manifest from a local file.',
                    type: 'warn',
                    duration: 4e3,
                });
                return;
            }
            (T.dispatch('ui:show-status', {
                message: `Reloading manifest for ${e.name}...`,
                type: 'info',
                duration: 2e3,
            }),
                e.activeMediaPlaylistUrl
                    ? T.dispatch('hls:media-playlist-reload', {
                          streamId: e.id,
                          url: e.activeMediaPlaylistUrl,
                      })
                    : T.dispatch('manifest:force-reload', { streamId: e.id }));
        },
        qa = (e) => {
            let s = e.activeManifestForView || e.manifest,
                t = e.activeMediaPlaylistUrl
                    ? e.mediaPlaylists.get(e.activeMediaPlaylistUrl)
                          ?.rawManifest
                    : e.rawManifest,
                { renditionReports: i, preloadHints: n } = s,
                a = t ? t.split(/\r?\n/) : [],
                r = [
                    'EXT-X-PRELOAD-HINT',
                    'EXT-X-RENDITION-REPORT',
                    'EXT-X-DEFINE',
                ],
                o = a
                    .map((l, d) => {
                        let f = l.trim();
                        return r.some((m) => f.startsWith(`#${m}`))
                            ? null
                            : c`
            <div class="flex">
                <span class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-10">${d + 1}</span>
                <span class="flex-grow whitespace-pre-wrap break-all">${N(Jr(l))}</span>
            </div>
        `;
                    })
                    .filter(Boolean);
            return (
                (i || []).forEach((l) =>
                    o.push(Ga({ name: 'EXT-X-RENDITION-REPORT', value: l }))
                ),
                (n || []).forEach((l) =>
                    o.push(Ga({ name: 'EXT-X-PRELOAD-HINT', value: l }))
                ),
                c`
        <div class="flex justify-between items-center mb-2">
            <h3 class="text-xl font-bold">Interactive Manifest</h3>
            <button
                @click=${() => Qr(e)}
                class="bg-gray-600 hover:bg-gray-700 text-white font-bold text-xs py-1 px-3 rounded-md transition-colors"
            >
                Reload
            </button>
        </div>
        ${Yr(e)}
        ${Wr(e.hlsDefinedVariables)}
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            ${o}
        </div>
    `
            );
        };
    function ut(e) {
        return !e || !e.manifest
            ? c`<p class="warn">No Manifest loaded to display.</p>`
            : e.protocol === 'hls'
              ? qa(e)
              : as(e);
    }
    function Zr(e) {
        let s = e.target,
            t = s.value;
        if (s.checked) {
            if (b.segmentsForCompare.length >= 2) {
                s.checked = !1;
                return;
            }
            T.dispatch('compare:add-segment', { url: t });
        } else T.dispatch('compare:remove-segment', { url: t });
    }
    var el = (e) => {
            if (!e)
                return c`<div
            class="flex-shrink-0 w-2.5 h-2.5 rounded-sm border border-gray-500 bg-gray-800"
            title="Status: Not Loaded"
        ></div>`;
            if (e.status === -1)
                return c`<div
            class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-gray-500 animate-pulse"
            title="Status: Pending"
        ></div>`;
            if (e.status !== 200) {
                let s = e.status === 0 ? 'Network Error' : `HTTP ${e.status}`;
                return c`<div
            class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-red-500"
            title="Status: ${s}"
        ></div>`;
            }
            return c`<div
        class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-green-500"
        title="Status: Loaded OK"
    ></div>`;
        },
        tl = (e) =>
            e === null
                ? ''
                : e
                  ? c`<div
            class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-cyan-400"
            title="Fresh: Segment is in the latest playlist"
        ></div>`
                  : c`<div
        class="flex-shrink-0 w-2.5 h-2.5 rounded-sm bg-gray-600"
        title="Stale: Segment is no longer in the latest playlist"
    ></div>`,
        sl = (e, s, t) => {
            if (s.gap)
                return c`<span class="text-xs text-gray-500 italic font-semibold"
            >GAP Segment</span
        >`;
            let i = (r) => {
                    let o = r.currentTarget.dataset.url;
                    T.dispatch('ui:request-segment-analysis', { url: o });
                },
                n = (r) => {
                    let o = r.currentTarget.dataset.url;
                    ((b.activeSegmentUrl = o),
                        document
                            .querySelector('[data-tab="interactive-segment"]')
                            ?.click());
                },
                a = () => {
                    T.dispatch('segment:fetch', { url: s.resolvedUrl });
                };
            return e
                ? e.status === -1
                    ? c`<button
            disabled
            class="text-xs bg-gray-600 px-2 py-1 rounded opacity-50 cursor-wait"
        >
            Loading...
        </button>`
                    : e.status !== 200
                      ? t !== !1
                          ? c`<button
                  @click=${a}
                  class="text-xs bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded"
              >
                  Reload
              </button>`
                          : c`<span class="text-xs text-gray-500 italic"
                  >Stale Error</span
              >`
                      : c`
        <button
            class="text-xs bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded"
            data-url="${s.resolvedUrl}"
            @click=${n}
        >
            View Raw
        </button>
        <button
            class="text-xs bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded"
            data-url="${s.resolvedUrl}"
            @click=${i}
        >
            Analyze
        </button>
    `
                : c`<button
            @click=${a}
            class="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
        >
            Load
        </button>`;
        },
        ht = (e, s, t) => {
            let i = b.segmentCache.get(e.resolvedUrl),
                n = b.segmentsForCompare.includes(e.resolvedUrl),
                a = 'hover:bg-gray-800/80';
            if (e.gap) a = 'bg-gray-800/50 text-gray-600 italic';
            else
                switch (t) {
                    case 'live':
                        a = 'bg-blue-900/40 hover:bg-blue-900/60';
                        break;
                    case 'stale':
                        a = 'bg-red-900/30 hover:bg-red-900/50 text-gray-500';
                        break;
                }
            let r =
                e.type === 'Media' && !e.gap
                    ? c`${(e.time / e.timescale).toFixed(2)}s
                  (+${(e.duration / e.timescale).toFixed(2)}s)`
                    : 'N/A';
            return c`
        <tr class="segment-row ${a}" data-url="${e.resolvedUrl}">
            <td class="px-3 py-1.5">
                <input
                    type="checkbox"
                    class="bg-gray-700 border-gray-500 rounded focus:ring-blue-500 disabled:opacity-50"
                    .value=${e.resolvedUrl}
                    ?checked=${n}
                    ?disabled=${e.gap}
                    @change=${Zr}
                />
            </td>
            <td class="px-3 py-1.5">
                <div class="flex items-center space-x-2">
                    ${e.gap ? '' : el(i)}
                    ${tl(s)}
                    <div>
                        <span>${e.type === 'Init' ? 'Init' : 'Media'}</span
                        ><span class="block text-xs text-gray-500"
                            >#${e.number}</span
                        >
                    </div>
                </div>
            </td>
            <td class="px-3 py-1.5">
                <span class="text-xs font-mono">${r}</span>
            </td>
            <td class="px-3 py-1.5">
                <div class="flex justify-between items-center">
                    <span
                        class="font-mono ${e.gap ? '' : 'text-cyan-400'} truncate"
                        title="${e.resolvedUrl}"
                        >${e.template || 'GAP'}</span
                    >
                    <div class="flex items-center space-x-2 flex-shrink-0 ml-4">
                        ${sl(i, e, s)}
                    </div>
                </div>
            </td>
        </tr>
    `;
        };
    var il = (e, s, t) => {
            if (!t) return 'stale';
            let i = e.manifest;
            if (i.type !== 'dynamic') return 'default';
            let n = Date.now(),
                a = i.availabilityStartTime?.getTime();
            if (!a) return 'default';
            let r = (n - a) / 1e3,
                o = s.time / s.timescale,
                l = (s.time + s.duration) / s.timescale;
            return r >= o && r < l ? 'live' : 'default';
        },
        nl = (e, s, t, i) => {
            let { segments: n, freshSegmentUrls: a } = t,
                r = 10,
                o = i === 'first' ? n.slice(0, r) : n.slice(-r),
                l =
                    e.manifest.periods[0]?.adaptationSets
                        .flatMap((d) => d.representations)
                        .find((d) => d.id === s)?.bandwidth || 0;
            return c`<div class="bg-gray-800 rounded-lg border border-gray-700">
        <div
            class="flex items-center p-2 bg-gray-900/50 border-b border-gray-700"
        >
            <div class="flex-grow flex items-center">
                <span class="font-semibold text-gray-200"
                    >Representation: ${s}</span
                >
                <span class="ml-3 text-xs text-gray-400 font-mono"
                    >(${(l / 1e3).toFixed(0)} kbps)</span
                >
            </div>
        </div>
        <div class="overflow-y-auto" style="max-height: calc(2.8rem * 15);">
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
                    ${o.map((d) => {
                        let f = a.has(d.resolvedUrl);
                        return ht(d, f, il(e, d, f));
                    })}
                </tbody>
            </table>
        </div>
    </div>`;
        };
    function Ka(e, s) {
        let t = Array.from(e.dashRepresentationState.entries());
        return t.length === 0
            ? c`<p class="text-gray-400">
            No representations with segments found.
        </p>`
            : c`<div class="space-y-4">
        ${t.map(([i, n]) => nl(e, i, n, s))}
    </div>`;
    }
    var gt = null;
    function Ya(e) {
        (Ie(), e && (gt = setInterval(e, 1e3)));
    }
    function Ie() {
        gt && (clearInterval(gt), (gt = null));
    }
    function al(e, s, t) {
        if (!e || e.manifest.type !== 'dynamic' || !t) return 'default';
        if (!t.freshSegmentUrls.has(s.resolvedUrl)) return 'stale';
        let i = t.segments,
            n = Math.min(3, Math.floor(i.length / 2)),
            a = i.length - n,
            r = i.findIndex((o) => o.resolvedUrl === s.resolvedUrl);
        return r !== -1 && r >= a ? 'live' : 'default';
    }
    var ol = (e, s) => {
            if (e.manifest.type !== 'dynamic' || s.length === 0) return '';
            let t = s.reduce((o, l) => o + l.duration / l.timescale, 0);
            if (t <= 0) return '';
            let i = t,
                n = e.manifest.summary.lowLatency?.partHoldBack,
                a,
                r;
            return (
                n != null
                    ? ((a = (n / t) * 100),
                      (r = `Live Edge (Target: ${n.toFixed(2)}s behind edge)`))
                    : ((a = 0), (r = 'Live Edge')),
                c`<div class="absolute top-0 bottom-0 right-0 w-0.5 bg-red-500 rounded-full z-20"
                     style="right: ${a}%;"
                     title="${r}">
        <div class="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-red-500 animate-ping"></div>
    </div>`
            );
        },
        Wa = (e, s, t) => {
            let i = e.hlsVariantState.get(t);
            if (!i) return c``;
            let {
                    segments: n,
                    error: a,
                    isLoading: r,
                    isExpanded: o,
                    displayMode: l,
                    isPolling: d,
                    freshSegmentUrls: f,
                } = i,
                m = 9e4,
                p = 0,
                u = e.manifest?.mediaSequence || 0,
                h = (Array.isArray(n) ? n : []).map((w, A) => {
                    let _ = {
                        repId: 'hls-media',
                        type: w.type || 'Media',
                        number: u + A,
                        resolvedUrl: w.resolvedUrl,
                        template: w.uri,
                        time: Math.round(p * m),
                        duration: Math.round(w.duration * m),
                        timescale: m,
                        gap: w.gap || !1,
                    };
                    return ((p += w.duration), _);
                }),
                x = l === 'last10' ? h.slice(-10) : h,
                C = () =>
                    T.dispatch('hls-explorer:toggle-variant', {
                        streamId: e.id,
                        variantUri: t,
                    }),
                E = (w) => {
                    (w.stopPropagation(),
                        T.dispatch('hls-explorer:toggle-polling', {
                            streamId: e.id,
                            variantUri: t,
                        }));
                },
                y = (w) => {
                    (w.stopPropagation(),
                        T.dispatch('hls-explorer:set-display-mode', {
                            streamId: e.id,
                            variantUri: t,
                            mode: l === 'all' ? 'last10' : 'all',
                        }));
                },
                I;
            return (
                r
                    ? (I = c`<div class="p-4 text-center text-gray-400">
            Loading segments...
        </div>`)
                    : a
                      ? (I = c`<div class="p-4 text-red-400">Error: ${a}</div>`)
                      : h.length === 0
                        ? (I = c`<div class="p-4 text-center text-gray-400">
            No segments found in this playlist.
        </div>`)
                        : (I = c` <div
            class="overflow-y-auto relative"
            style="max-height: calc(2.8rem * 15);"
        >
            ${ol(e, x)}
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
                    ${x.map((w) => ht(w, f.has(w.resolvedUrl), al(e, w, i)))}
                </tbody>
            </table>
        </div>`),
                c`
        <details
            class="bg-gray-800 rounded-lg border border-gray-700"
            ?open=${o}
        >
            <summary
                @click=${(w) => {
                    (w.preventDefault(), C());
                }}
                class="flex items-center p-2 bg-gray-900/50 cursor-pointer"
            >
                <div class="flex-grow font-semibold text-gray-200">
                    ${s.title}
                </div>
            </summary>
            ${
                o
                    ? c`
                      <div class="p-2 border-t border-gray-700">
                          <div class="flex items-center gap-4 p-2">
                              ${
                                  e.manifest.type === 'dynamic'
                                      ? c`
                                        <button
                                            @click=${E}
                                            class="text-xs px-3 py-1 rounded ${d ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}"
                                        >
                                            ${d ? 'Stop Polling' : 'Start Polling'}
                                        </button>
                                    `
                                      : ''
                              }
                              <button
                                  @click=${y}
                                  class="text-xs px-3 py-1 rounded bg-gray-600 hover:bg-gray-700"
                              >
                                  Show
                                  ${l === 'all' ? 'Last 10' : 'All'}
                              </button>
                          </div>
                          ${I}
                      </div>
                  `
                    : ''
            }
        </details>
    `
            );
        };
    function Ja(e) {
        if (e.manifest.isMaster) {
            let s = (e.manifest.variants || []).map((t, i) => ({
                ...t,
                title: `Variant Stream ${i + 1} (BW: ${(t.attributes.BANDWIDTH / 1e3).toFixed(0)}k)`,
            }));
            return c`<div class="space-y-1">
            ${s.map((t) => Wa(e, t, t.resolvedUri))}
        </div>`;
        } else {
            let s = {
                title: 'Media Playlist Segments',
                uri: null,
                resolvedUri: e.originalUrl,
            };
            return Wa(e, s, s.resolvedUri);
        }
    }
    var j = null,
        he = null,
        yt = 'first';
    function rl() {
        let { segmentsForCompare: e } = b;
        e.length === 2 &&
            T.dispatch('ui:request-segment-comparison', {
                urlA: e[0],
                urlB: e[1],
            });
    }
    function Qa(e) {
        if (yt === e) return;
        yt = e;
        let s = b.streams.find((t) => t.id === he);
        s && j && je(j, s);
    }
    function Ve(e) {
        let s = e.manifest?.type === 'dynamic',
            t = c`
        <div
            id="segment-explorer-controls"
            class="flex items-center flex-wrap gap-4"
        >
            ${
                e.protocol === 'dash'
                    ? c`
                      <button
                          @click=${() => Qa('first')}
                          class="text-sm bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-3 rounded-md transition-colors"
                      >
                          First 10
                      </button>
                      ${
                          s
                              ? c`<button
                                @click=${() => Qa('last')}
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
                @click=${rl}
                class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled
            >
                Compare Selected (0/2)
            </button>
        </div>
    `,
            i;
        return (
            e.protocol === 'dash' ? (i = Ka(e, yt)) : (i = Ja(e)),
            c`
        <div class="flex flex-wrap justify-between items-center mb-4 gap-4">
            <h3 class="text-xl font-bold">Segment Explorer</h3>
            ${t}
        </div>
        <div
            id="segment-explorer-content"
            data-testid="segment-explorer-content"
        >
            ${i}
        </div>
    `
        );
    }
    function je(e, s) {
        ((j = e),
            (he = s.id),
            Ie(),
            s.protocol === 'hls' &&
                s.manifest.type === 'dynamic' &&
                Ya(() => {
                    let i = b.streams.find((n) => n.id === he);
                    i && e.offsetParent !== null && R(Ve(i), e);
                }),
            R(Ve(s), e));
    }
    T.subscribe('state:compare-list-changed', ({ count: e }) => {
        let s = document.getElementById('segment-compare-btn');
        s &&
            ((s.textContent = `Compare Selected (${e}/2)`),
            s.toggleAttribute('disabled', e !== 2));
    });
    T.subscribe('analysis:started', () => {
        ((he = null), (j = null), (yt = 'first'), Ie());
    });
    T.subscribe('stream:data-updated', ({ streamId: e }) => {
        if (e === he && j && j.offsetParent !== null) {
            let s = b.streams.find((t) => t.id === e);
            s && R(Ve(s), j);
        }
    });
    T.subscribe('state:stream-variant-changed', ({ streamId: e }) => {
        if (e === he && j && j.offsetParent !== null) {
            let s = b.streams.find((t) => t.id === e);
            s && R(Ve(s), j);
        }
    });
    T.subscribe('segment:loaded', () => {
        if (j && j.offsetParent !== null) {
            let e = b.streams.find((s) => s.id === he);
            e && R(Ve(e), j);
        }
    });
    var xt = (e) => e ?? 'N/A',
        vt = (e) =>
            e && e.length > 0
                ? e.map((s) => `<div>${s}</div>`).join('')
                : 'N/A';
    function Za(e) {
        let s = [
            {
                label: 'Type',
                tooltip: 'static (VOD) vs dynamic (live)',
                isoRef: 'DASH: 5.3.1.2 / HLS: 4.3.3.5',
                values: e.map((i) =>
                    xt(
                        i.manifest?.summary.general.streamType.startsWith(
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
                values: e.map((i) =>
                    xt(
                        i.manifest?.summary.dash?.profiles ||
                            `Version ${i.manifest?.summary.hls?.version}`
                    )
                ),
            },
            {
                label: 'Min Buffer / Target Duration',
                tooltip:
                    'Minimum client buffer time (DASH) or max segment duration (HLS).',
                isoRef: 'DASH: 5.3.1.2 / HLS: 4.3.3.1',
                values: e.map((i) => {
                    let n =
                        i.manifest?.summary.dash?.minBufferTime ??
                        i.manifest?.summary.hls?.targetDuration;
                    return n ? `${n}s` : 'N/A';
                }),
            },
            {
                label: 'Live Window',
                tooltip: 'DVR window for live streams.',
                isoRef: 'DASH: 5.3.1.2',
                values: e.map((i) =>
                    i.manifest?.summary.dash?.timeShiftBufferDepth
                        ? `${i.manifest.summary.dash.timeShiftBufferDepth}s`
                        : 'N/A'
                ),
            },
            {
                label: 'Segment Format',
                tooltip:
                    'The container format used for media segments (e.g., ISOBMFF or MPEG-2 TS).',
                isoRef: 'DASH: 5.3.7 / HLS: 4.3.2.5',
                values: e.map((i) =>
                    xt(i.manifest?.summary.general.segmentFormat)
                ),
            },
            {
                label: '# of Periods',
                tooltip: 'Number of content periods (DASH-specific).',
                isoRef: 'DASH: 5.3.2',
                values: e.map((i) =>
                    i.protocol === 'dash'
                        ? String(i.manifest?.summary.content.periods || 0)
                        : 'N/A'
                ),
            },
            {
                label: 'Content Protection',
                tooltip: 'Detected DRM systems.',
                isoRef: 'DASH: 5.8.4.1 / HLS: 4.3.2.4',
                values: e.map((i) => {
                    let n = i.manifest?.summary.security;
                    return n?.isEncrypted ? n.systems.join(', ') : 'No';
                }),
            },
            {
                label: '# Video Quality Levels',
                tooltip: 'Total number of video tracks or variants.',
                isoRef: 'DASH: 5.3.5 / HLS: 4.3.4.2',
                values: e.map((i) =>
                    String(i.manifest?.summary.content.videoTracks || 0)
                ),
            },
            {
                label: 'Video Bitrate Range',
                tooltip: 'Min and Max bandwidth values for video.',
                isoRef: 'DASH: 5.3.5.2 / HLS: 4.3.4.2',
                values: e.map((i) =>
                    i.manifest?.summary.videoTracks.length > 0
                        ? i.manifest.summary.videoTracks[0].bitrateRange
                        : 'N/A'
                ),
            },
            {
                label: 'Video Resolutions',
                tooltip: 'List of unique video resolutions.',
                isoRef: 'DASH: 5.3.7.2 / HLS: 4.3.4.2',
                values: e.map((i) =>
                    vt([
                        ...new Set(
                            i.manifest?.summary.videoTracks.flatMap(
                                (n) => n.resolutions
                            )
                        ),
                    ])
                ),
            },
            {
                label: 'Video Codecs',
                tooltip: 'Unique video codecs found.',
                isoRef: 'DASH: 5.3.7.2 / HLS: 4.3.4.2',
                values: e.map((i) =>
                    vt([
                        ...new Set(
                            i.manifest?.summary.videoTracks.flatMap(
                                (n) => n.codecs
                            )
                        ),
                    ])
                ),
            },
            {
                label: '# Audio Tracks',
                tooltip: 'Groups of audio tracks, often by language.',
                isoRef: 'DASH: 5.3.3 / HLS: 4.3.4.1',
                values: e.map((i) =>
                    String(i.manifest?.summary.content.audioTracks || 0)
                ),
            },
            {
                label: 'Audio Languages',
                tooltip: 'Declared languages for audio tracks.',
                isoRef: 'DASH: 5.3.3.2 / HLS: 4.3.4.1',
                values: e.map((i) => {
                    let n = [
                        ...new Set(
                            i.manifest?.summary.audioTracks
                                .map((a) => a.lang)
                                .filter(Boolean)
                        ),
                    ];
                    return n.length > 0 ? n.join(', ') : 'Not Specified';
                }),
            },
            {
                label: 'Audio Codecs',
                tooltip: 'Unique audio codecs.',
                isoRef: 'DASH: 5.3.7.2 / HLS: 4.3.4.2',
                values: e.map((i) =>
                    vt([
                        ...new Set(
                            i.manifest?.summary.audioTracks.flatMap(
                                (n) => n.codecs
                            )
                        ),
                    ])
                ),
            },
            {
                label: '# of Text Tracks',
                tooltip: 'Number of subtitle or caption tracks.',
                isoRef: 'DASH: 5.3.3 / HLS: 4.3.4.1',
                values: e.map((i) =>
                    String(i.manifest?.summary.content.textTracks || 0)
                ),
            },
            {
                label: 'Text Languages',
                tooltip: 'Declared languages for subtitle/caption tracks.',
                isoRef: 'DASH: 5.3.3.2 / HLS: 4.3.4.1',
                values: e.map((i) => {
                    let n = [
                        ...new Set(
                            i.manifest?.summary.textTracks
                                .map((a) => a.lang)
                                .filter(Boolean)
                        ),
                    ];
                    return n.length > 0 ? n.join(', ') : 'Not Specified';
                }),
            },
            {
                label: 'Text Formats',
                tooltip: 'MIME types or codecs for text tracks.',
                isoRef: 'DASH: 5.3.7.2',
                values: e.map((i) =>
                    vt([
                        ...new Set(
                            i.manifest?.summary.textTracks.flatMap(
                                (n) => n.codecsOrMimeTypes
                            )
                        ),
                    ])
                ),
            },
            {
                label: 'Video Range',
                tooltip: 'Dynamic range of the video content (SDR, PQ, HLG).',
                isoRef: 'HLS 2nd Ed: 4.4.6.2',
                values: e.map((i) =>
                    xt(
                        [
                            ...new Set(
                                i.manifest?.summary.videoTracks
                                    .map((n) => n.videoRange)
                                    .filter(Boolean)
                            ),
                        ].join(', ')
                    )
                ),
            },
        ];
        return ((i) => [
            { title: 'Manifest Properties', points: i.slice(0, 5) },
            { title: 'Content Overview', points: i.slice(5, 7) },
            { title: 'Video Details', points: i.slice(7, 11) },
            { title: 'Audio Details', points: i.slice(11, 14) },
            { title: 'Accessibility & Metadata', points: i.slice(14, 18) },
        ])(s);
    }
    var eo = (e, s) => {
        let { label: t, tooltip: i, isoRef: n, values: a } = e,
            r = `grid-template-columns: 200px repeat(${s}, 1fr);`;
        return c`
        <div
            class="grid border-t border-l border-gray-700"
            style="${r}"
        >
            <div
                class="font-medium text-gray-400 p-2 border-r border-gray-700 ${k}"
                data-tooltip="${i}"
                data-iso="${n}"
            >
                ${t}
            </div>
            ${a.map(
                (o) => c`
                    <div
                        class="p-2 font-mono text-xs border-r border-gray-700 break-words"
                    >
                        ${N(o ?? '')}
                    </div>
                `
            )}
        </div>
    `;
    };
    var ll = (e, s, t) => c`
    <h3 class="text-xl font-bold mt-6 mb-2">${e}</h3>
    <div class="border-b border-gray-700">
        ${s.map((i) => eo(i, t.length))}
    </div>
`;
    function to() {
        let { streams: e } = b;
        if (e.length < 2) return c``;
        let s = Za(e);
        return c`
        <!-- Main Sticky Header -->
        <div
            class="grid bg-gray-900/50 sticky top-0 z-10"
            style="grid-template-columns: 200px repeat(${e.length}, 1fr);"
        >
            <div
                class="font-semibold text-gray-400 p-2 border-b border-r border-gray-700"
            >
                Property
            </div>
            ${e.map(
                (t) => c`<div
                        class="font-semibold text-gray-300 p-2 border-b border-r border-gray-700 truncate"
                        title="${t.name}"
                    >
                        ${t.name}
                    </div>`
            )}
        </div>

        <!-- Data Sections -->
        ${s.map((t) => ll(t.title, t.points, e))}
    `;
    }
    function so() {
        if (b.streams.length > 1) {
            g.contextSwitcherWrapper.classList.remove('hidden');
            let e = b.streams.map(
                (s) => c`<option value="${s.id}">
                    ${s.name} (${s.protocol.toUpperCase()})
                </option>`
            );
            (R(e, g.contextSwitcher),
                (g.contextSwitcher.value = String(b.activeStreamId)));
        } else g.contextSwitcherWrapper.classList.add('hidden');
    }
    function os() {
        console.time('Render All Tabs');
        let e = b.streams.length > 1;
        ((document.querySelector('[data-tab="comparison"]').style.display = e
            ? 'flex'
            : 'none'),
            e &&
                (console.time('Render Comparison Tab'),
                R(to(), g.tabContents.comparison),
                console.timeEnd('Render Comparison Tab')),
            rs(b.activeStreamId),
            console.timeEnd('Render All Tabs'));
    }
    function Ge(e, s, t = null) {
        if (t) {
            let i = document.createElement('div'),
                n = {
                    pass: 'bg-green-600 border-green-500',
                    fail: 'bg-red-600 border-red-500',
                    warn: 'bg-yellow-600 border-yellow-500',
                    info: 'bg-blue-600 border-blue-500',
                };
            ((i.className = `p-4 rounded-lg border text-white shadow-lg transition-all duration-300 ease-in-out transform translate-x-full opacity-0 ${n[s]}`),
                (i.textContent = e),
                g.toastContainer.appendChild(i),
                setTimeout(() => {
                    i.classList.remove('translate-x-full', 'opacity-0');
                }, 10),
                setTimeout(() => {
                    (i.classList.add('opacity-0', 'translate-x-8'),
                        i.addEventListener('transitionend', () => i.remove()));
                }, t));
        } else {
            let i = {
                info: 'text-blue-400',
                pass: 'text-green-400',
                warn: 'text-yellow-400',
                fail: 'text-red-400',
            };
            ((g.status.textContent = e),
                (g.status.className = `text-center my-4 ${i[s]}`));
        }
    }
    function rs(e) {
        let s = b.streams.find((t) => t.id === e);
        s &&
            (console.time('Render Summary Tab'),
            R(Ea(s), g.tabContents.summary),
            console.timeEnd('Render Summary Tab'),
            console.time('Render Compliance Tab'),
            R(Xe(s), g.tabContents.compliance),
            ze(),
            console.timeEnd('Render Compliance Tab'),
            console.time('Render Timeline Tab'),
            Fa(g.tabContents['timeline-visuals'], s),
            console.timeEnd('Render Timeline Tab'),
            console.time('Render Features Tab'),
            R(mt(s), g.tabContents.features),
            console.timeEnd('Render Features Tab'),
            console.time('Render Interactive Manifest Tab'),
            R(ut(s), g.tabContents['interactive-manifest']),
            console.timeEnd('Render Interactive Manifest Tab'),
            console.time('Render Interactive Segment Tab'),
            R(lt(), g.tabContents['interactive-segment']),
            console.timeEnd('Render Interactive Segment Tab'),
            console.time('Render Segment Explorer Tab'),
            je(g.tabContents.explorer, s),
            console.timeEnd('Render Segment Explorer Tab'),
            console.time('Render Manifest Updates Tab'),
            ce(e),
            console.timeEnd('Render Manifest Updates Tab'));
    }
    var qe = null;
    function io(e) {
        let t = e.target.closest('[data-tab]');
        if (!t) return;
        (qe && (document.removeEventListener('keydown', qe), (qe = null)),
            Ie());
        let i = ['border-blue-600', 'text-gray-100', 'bg-gray-700'],
            n = ['border-transparent'];
        (g.tabs.querySelectorAll('[data-tab]').forEach((o) => {
            (o.classList.remove(...i), o.classList.add(...n));
        }),
            t.classList.add(...i),
            t.classList.remove(...n),
            Object.values(g.tabContents).forEach((o) => {
                o && o.classList.add('hidden');
            }));
        let a = t.dataset.tab,
            r = g.tabContents[a];
        if (
            (r && r.classList.remove('hidden'),
            a === 'interactive-segment' &&
                R(lt(), g.tabContents['interactive-segment']),
            a === 'interactive-manifest' && rs(b.activeStreamId),
            a === 'explorer')
        ) {
            let o = b.streams.find((l) => l.id === b.activeStreamId);
            o && je(g.tabContents.explorer, o);
        }
        (a === 'updates' &&
            ((qe = (o) => {
                (o.key === 'ArrowLeft' && Be(1),
                    o.key === 'ArrowRight' && Be(-1));
            }),
            document.addEventListener('keydown', qe),
            ce(b.activeStreamId)),
            dt());
    }
    function no() {
        g.closeModalBtn.addEventListener('click', () => {
            let e = g.segmentModal.querySelector('div');
            (g.segmentModal.classList.add('opacity-0', 'invisible'),
                g.segmentModal.classList.remove('opacity-100', 'visible'),
                e.classList.add('scale-95'),
                e.classList.remove('scale-100'));
        });
    }
    var ao = (e) =>
            !e || isNaN(e)
                ? 'N/A'
                : e >= 1e6
                  ? `${(e / 1e6).toFixed(2)} Mbps`
                  : `${(e / 1e3).toFixed(0)} kbps`,
        dl = (e) => {
            if (!e) return 'unknown';
            if (H(e.children, 'SegmentList').length > 0) return 'SegmentList';
            let s = H(e.children, 'SegmentTemplate')[0];
            return s
                ? H(s.children, 'SegmentTimeline').length > 0
                    ? 'SegmentTemplate with SegmentTimeline'
                    : s.attributes.media?.includes('$Number$')
                      ? 'SegmentTemplate with $Number$'
                      : s.attributes.media?.includes('$Time$')
                        ? 'SegmentTemplate with $Time$'
                        : 'SegmentTemplate'
                : H(e.children, 'SegmentBase').length > 0
                  ? 'SegmentBase'
                  : 'BaseURL / Single Segment';
        };
    function oo(e, s) {
        let t = [],
            i = [],
            n = [],
            a = new Set(),
            r = new Set();
        for (let f of e.periods)
            for (let m of f.adaptationSets) {
                switch (m.contentType) {
                    case 'video':
                        t.push(m);
                        break;
                    case 'audio':
                        i.push(m);
                        break;
                    case 'text':
                    case 'application':
                        n.push(m);
                        break;
                }
                for (let p of m.contentProtection)
                    (a.add(p.system), p.defaultKid && r.add(p.defaultKid));
            }
        let o = H(s.children, 'ServiceDescription')[0],
            l = o ? H(o.children, 'Latency')[0] : null;
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
                segmenting: dl(s),
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
                targetLatency: l ? parseInt(l.attributes.target, 10) : null,
                minLatency: l ? parseInt(l.attributes.min, 10) : null,
                maxLatency: l ? parseInt(l.attributes.max, 10) : null,
                partTargetDuration: null,
                partHoldBack: null,
                canBlockReload: !1,
            },
            content: {
                periods: e.periods.length,
                videoTracks: t.length,
                audioTracks: i.length,
                textTracks: n.length,
                mediaPlaylists: 0,
            },
            videoTracks: t.map((f) => {
                let m = f.representations
                    .map((p) => p.bandwidth)
                    .filter(Boolean);
                return {
                    id: f.id || 'N/A',
                    profiles: f.profiles,
                    bitrateRange:
                        m.length > 0
                            ? `${ao(Math.min(...m))} - ${ao(Math.max(...m))}`
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
                        f.representations.map((m) => m.codecs).filter(Boolean)
                    ),
                ],
                channels: [
                    ...new Set(
                        f.representations
                            .flatMap((m) => m.audioChannelConfigurations)
                            .map((m) => m.value)
                            .filter(Boolean)
                    ),
                ],
                isDefault: !1,
                isForced: !1,
                roles: f.roles.map((m) => m.value).filter(Boolean),
            })),
            textTracks: n.map((f) => ({
                id: f.id || 'N/A',
                lang: f.lang,
                codecsOrMimeTypes: [
                    ...new Set(
                        f.representations
                            .map((m) => m.codecs || m.mimeType)
                            .filter(Boolean)
                    ),
                ],
                isDefault: !1,
                isForced: !1,
                roles: f.roles.map((m) => m.value).filter(Boolean),
            })),
            security: {
                isEncrypted: a.size > 0,
                systems: Array.from(a),
                kids: Array.from(r),
            },
        };
    }
    var bt = (e) => $(e, '#text')?.content || e?.children?.[0]?.content || null;
    function ro(e) {
        let s = !!H(e.children, 'SegmentTimeline').length > 0,
            t = !!H(e.children, 'SegmentTemplate').length > 0,
            i = !!H(e.children, 'SegmentList').length > 0,
            n = s || t || i ? 'isobmff' : 'unknown',
            a = {
                id: S(e, 'id'),
                type: S(e, 'type'),
                profiles: S(e, 'profiles'),
                minBufferTime: z(S(e, 'minBufferTime')),
                publishTime: S(e, 'publishTime')
                    ? new Date(S(e, 'publishTime'))
                    : null,
                availabilityStartTime: S(e, 'availabilityStartTime')
                    ? new Date(S(e, 'availabilityStartTime'))
                    : null,
                timeShiftBufferDepth: z(S(e, 'timeShiftBufferDepth')),
                minimumUpdatePeriod: z(S(e, 'minimumUpdatePeriod')),
                duration: z(S(e, 'mediaPresentationDuration')),
                maxSegmentDuration: z(S(e, 'maxSegmentDuration')),
                maxSubsegmentDuration: z(S(e, 'maxSubsegmentDuration')),
                programInformations: U(e, 'ProgramInformation').map((r) => ({
                    title: bt($(r, 'Title')),
                    source: bt($(r, 'Source')),
                    copyright: bt($(r, 'Copyright')),
                    lang: S(r, 'lang'),
                    moreInformationURL: S(r, 'moreInformationURL'),
                })),
                locations: U(e, 'Location').map(bt),
                periods: U(e, 'Period').map(cl),
                segmentFormat: n,
                rawElement: e,
                metrics: [],
                events: [],
                summary: null,
                serverControl: null,
            };
        return (
            (a.events = a.periods.flatMap((r) => r.events)),
            (a.summary = oo(a, e)),
            { manifestIR: a, manifestElement: e }
        );
    }
    function cl(e) {
        let s = {
                id: S(e, 'id'),
                start: z(S(e, 'start')),
                duration: z(S(e, 'duration')),
                bitstreamSwitching: S(e, 'bitstreamSwitching') === 'true',
                adaptationSets: [],
                eventStreams: [],
                events: [],
                rawElement: e,
            },
            t = U(e, 'AdaptationSet');
        return ((s.adaptationSets = t.map((i) => fl(i, s))), s);
    }
    function fl(e, s) {
        let t = {
                id: S(e, 'id'),
                contentType:
                    S(e, 'contentType') || S(e, 'mimeType')?.split('/')[0],
                lang: S(e, 'lang'),
                mimeType: S(e, 'mimeType'),
                representations: [],
                contentProtection: [],
                roles: U(e, 'Role').map((a) => ({ value: S(a, 'value') })),
                rawElement: e,
                period: s,
            },
            i = U(e, 'Representation');
        t.representations = i.map((a) => pl(a, t));
        let n = U(e, 'ContentProtection');
        return (
            (t.contentProtection = n.map((a) => ({
                schemeIdUri: S(a, 'schemeIdUri'),
                system: ft(S(a, 'schemeIdUri')),
                defaultKid: S(a, 'cenc:default_KID'),
            }))),
            t
        );
    }
    function pl(e, s) {
        return {
            id: S(e, 'id'),
            bandwidth: parseInt(S(e, 'bandwidth'), 10),
            width: parseInt(S(e, 'width') || s.maxWidth, 10),
            height: parseInt(S(e, 'height') || s.maxHeight, 10),
            codecs: S(e, 'codecs') || s.codecs,
            mimeType: S(e, 'mimeType') || s.mimeType,
            audioChannelConfigurations: U(e, 'AudioChannelConfiguration').map(
                (t) => ({ value: S(t, 'value') })
            ),
            roles: s.roles,
            rawElement: e,
        };
    }
    async function lo(e, s) {
        let t = (o, l) => o?.children?.find((d) => d.tagName === l),
            i = (o) => o?.children?.[0]?.content || null,
            n = t(e, 'BaseURL');
        n && i(n) && (s = new URL(i(n), s).href);
        let { manifestIR: a, manifestElement: r } = ro(e);
        return { manifest: a, serializedManifest: r, baseUrl: s };
    }
    var ml = (e) =>
        !e || isNaN(e)
            ? 'N/A'
            : e >= 1e6
              ? `${(e / 1e6).toFixed(2)} Mbps`
              : `${(e / 1e3).toFixed(0)} kbps`;
    function co(e) {
        let { rawElement: s } = e,
            t = s.isMaster,
            i = [],
            n = [],
            a = [],
            r = new Set(),
            o = new Set(),
            l = null;
        if (t) {
            (s.variants.forEach((p, u) => {
                let h = p.attributes.CODECS || '';
                (h.includes('avc1') ||
                    h.includes('hvc1') ||
                    p.attributes.RESOLUTION) &&
                    i.push({
                        id: p.attributes['STABLE-VARIANT-ID'] || `variant_${u}`,
                        profiles: null,
                        bitrateRange: ml(p.attributes.BANDWIDTH),
                        resolutions: p.attributes.RESOLUTION
                            ? [p.attributes.RESOLUTION]
                            : [],
                        codecs: [h],
                        scanType: null,
                        videoRange: p.attributes['VIDEO-RANGE'] || null,
                        roles: [],
                    });
            }),
                s.media.forEach((p, u) => {
                    let h =
                        p['STABLE-RENDITION-ID'] ||
                        `${p.TYPE.toLowerCase()}_${u}`;
                    p.TYPE === 'AUDIO'
                        ? n.push({
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
                          a.push({
                              id: h,
                              lang: p.LANGUAGE,
                              codecsOrMimeTypes: [],
                              isDefault: p.DEFAULT === 'YES',
                              isForced: p.FORCED === 'YES',
                              roles: [],
                          });
                }));
            let m = s.tags.find((p) => p.name === 'EXT-X-SESSION-KEY');
            if (
                m &&
                m.value.METHOD !== 'NONE' &&
                (r.add(m.value.METHOD),
                m.value.KEYFORMAT ===
                    'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed' &&
                    m.value.URI)
            )
                try {
                    let u = atob(m.value.URI.split(',')[1]).slice(32, 48);
                    o.add(
                        Array.from(u)
                            .map((h) =>
                                h.charCodeAt(0).toString(16).padStart(2, '0')
                            )
                            .join('')
                    );
                } catch {}
        } else {
            let m = s.segments.find((h) => h.key)?.key;
            m && m.METHOD !== 'NONE' && r.add(m.METHOD);
            let p = s.segments.length,
                u = s.segments.reduce((h, x) => h + x.duration, 0);
            l = {
                segmentCount: p,
                averageSegmentDuration: p > 0 ? u / p : 0,
                hasDiscontinuity: s.segments.some((h) => h.discontinuity),
                isIFrameOnly: s.tags.some(
                    (h) => h.name === 'EXT-X-I-FRAMES-ONLY'
                ),
            };
        }
        let d = s.tags.filter(
            (m) => m.name === 'EXT-X-I-FRAME-STREAM-INF'
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
                version: s.version,
                targetDuration: s.targetDuration,
                iFramePlaylists: d,
                mediaPlaylistDetails: l,
            },
            lowLatency: {
                isLowLatency: !!s.partInf,
                partTargetDuration: s.partInf?.['PART-TARGET'] || null,
                partHoldBack: e.serverControl?.['PART-HOLD-BACK'] || null,
                canBlockReload: e.serverControl?.['CAN-BLOCK-RELOAD'] === 'YES',
                targetLatency: null,
                minLatency: null,
                maxLatency: null,
            },
            content: {
                periods: 1,
                videoTracks: i.length,
                audioTracks: n.length,
                textTracks: a.length,
                mediaPlaylists: t ? s.variants.length : 1,
            },
            videoTracks: i,
            audioTracks: n,
            textTracks: a,
            security: {
                isEncrypted: r.size > 0,
                systems: Array.from(r),
                kids: Array.from(o),
            },
        };
    }
    function fo(e) {
        let s = {
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
                    : e.segments.reduce((r, o) => r + o.duration, 0),
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
            t = e.tags.filter((r) => r.name === 'EXT-X-DATERANGE'),
            i = 0,
            n = new Map();
        for (let r of e.segments)
            (r.dateTime && n.set(new Date(r.dateTime).getTime(), i),
                (i += r.duration));
        for (let r of t) {
            let o = new Date(r.value['START-DATE']).getTime(),
                l = parseFloat(r.value.DURATION),
                d = Array.from(n.keys())
                    .filter((f) => f <= o)
                    .pop();
            if (d) {
                let f = (o - d) / 1e3,
                    m = r.value.CLASS === 'com.apple.hls.interstitial';
                s.events.push({
                    startTime: n.get(d) + f,
                    duration: l,
                    message: m
                        ? `Interstitial: ${r.value.ID || 'N/A'}`
                        : `Date Range: ${r.value.ID || 'N/A'}`,
                    messageData: m ? r.value : null,
                    type: 'hls-daterange',
                });
            }
        }
        let a = {
            id: 'hls-period-0',
            start: 0,
            duration: s.duration,
            bitstreamSwitching: null,
            assetIdentifier: null,
            subsets: [],
            adaptationSets: [],
            eventStreams: [],
            events: [],
        };
        if (e.isMaster) {
            let r = e.media.reduce((o, l) => {
                let d = l['GROUP-ID'],
                    f = l.TYPE.toLowerCase();
                return (
                    o[f] || (o[f] = {}),
                    o[f][d] || (o[f][d] = []),
                    o[f][d].push(l),
                    o
                );
            }, {});
            (Object.entries(r).forEach(([o, l]) => {
                Object.entries(l).forEach(([d, f], m) => {
                    f.forEach((p, u) => {
                        let h = o === 'subtitles' ? 'text' : o;
                        a.adaptationSets.push({
                            id:
                                p['STABLE-RENDITION-ID'] ||
                                `${o}-rendition-${d}-${u}`,
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
                e.variants.forEach((o, l) => {
                    let d = o.attributes.CODECS || '',
                        f =
                            d.includes('avc1') ||
                            d.includes('hev1') ||
                            d.includes('hvc1'),
                        m = !!o.attributes.RESOLUTION,
                        p = f || m,
                        u = d.includes('mp4a') && !o.attributes.AUDIO;
                    if (p) {
                        let h = o.attributes.RESOLUTION,
                            x = {
                                id:
                                    o.attributes['STABLE-VARIANT-ID'] ||
                                    `video-variant-${l}-rep-0`,
                                codecs: d,
                                bandwidth: o.attributes.BANDWIDTH,
                                width: h
                                    ? parseInt(String(h).split('x')[0], 10)
                                    : null,
                                height: h
                                    ? parseInt(String(h).split('x')[1], 10)
                                    : null,
                                qualityRanking: o.attributes.SCORE,
                                videoRange: o.attributes['VIDEO-RANGE'],
                            },
                            C = {
                                id: `video-variant-${l}`,
                                contentType: 'video',
                                lang: null,
                                mimeType: 'video/mp2t',
                                representations: [x],
                                contentProtection: [],
                                roles: [],
                            };
                        a.adaptationSets.push(C);
                    }
                    if (u) {
                        let h = {
                            id: `audio-muxed-${l}`,
                            contentType: 'audio',
                            lang: null,
                            mimeType: 'audio/mp4',
                            representations: [
                                {
                                    id: `audio-muxed-${l}-rep-0`,
                                    codecs: d
                                        .split(',')
                                        .find((x) => x.startsWith('mp4a')),
                                    bandwidth: o.attributes.BANDWIDTH,
                                    width: null,
                                    height: null,
                                },
                            ],
                            contentProtection: [],
                            roles: [],
                        };
                        a.adaptationSets.push(h);
                    }
                }));
        } else {
            let r = {
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
                o = e.segments.find((l) => l.key)?.key;
            (o &&
                o.METHOD !== 'NONE' &&
                r.contentProtection.push({
                    schemeIdUri: o.KEYFORMAT || 'identity',
                    system: o.METHOD,
                }),
                a.adaptationSets.push(r));
        }
        return (s.periods.push(a), (s.summary = co(s)), s);
    }
    function q(e) {
        let s = {};
        return (
            (e.match(/("[^"]*")|[^,]+/g) || []).forEach((i) => {
                let n = i.indexOf('=');
                if (n === -1) return;
                let a = i.substring(0, n),
                    r = i.substring(n + 1).replace(/"/g, ''),
                    o = /^-?\d+(\.\d+)?$/.test(r) ? parseFloat(r) : r;
                s[a] = o;
            }),
            s
        );
    }
    function ul(e, s, t = new Map()) {
        let i = new Map(t),
            n = new URL(s).searchParams;
        return (
            e.forEach((r) => {
                if (r.startsWith('#EXT-X-DEFINE:')) {
                    let o = q(r.substring(14));
                    if (o.NAME && o.VALUE !== void 0)
                        i.set(String(o.NAME), {
                            value: String(o.VALUE),
                            source: 'VALUE',
                        });
                    else if (o.QUERYPARAM) {
                        let l = String(o.QUERYPARAM),
                            d = n.get(l);
                        d !== null &&
                            i.set(l, { value: d, source: `QUERYPARAM (${l})` });
                    } else if (o.IMPORT) {
                        let l = String(o.IMPORT);
                        t.has(l) &&
                            i.set(l, {
                                value: t.get(l).value,
                                source: `IMPORT (${l})`,
                            });
                    }
                }
            }),
            i.size === 0
                ? { substitutedLines: e, definedVariables: i }
                : {
                      substitutedLines: e.map((r) =>
                          r.replace(/{\$[a-zA-Z0-9_-]+}/g, (o) => {
                              let l = o.substring(2, o.length - 1);
                              return i.has(l) ? i.get(l).value : o;
                          })
                      ),
                      definedVariables: i,
                  }
        );
    }
    async function Ee(e, s, t) {
        let i = e,
            n = e.split(/\r?\n/);
        if (!n[0] || n[0].trim() !== '#EXTM3U')
            if (e.includes('#EXTINF:'))
                (n.unshift('#EXTM3U'),
                    (i = n.join(`
`)));
            else
                throw new Error(
                    'Invalid HLS playlist. Must start with #EXTM3U.'
                );
        let { substitutedLines: a, definedVariables: r } = ul(n, s, t),
            o = {
                isMaster: !1,
                version: 1,
                tags: [],
                segments: [],
                variants: [],
                media: [],
                raw: i,
                baseUrl: s,
                isLive: !0,
                preloadHints: [],
                renditionReports: [],
            },
            l = null,
            d = null,
            f = null;
        for (let p = 1; p < a.length; p++) {
            let u = a[p].trim();
            if (u)
                if (u.startsWith('#EXT')) {
                    let h = u.indexOf(':'),
                        x,
                        C;
                    switch (
                        (h === -1
                            ? ((x = u.substring(1)), (C = null))
                            : ((x = u.substring(1, h)),
                              (C = u.substring(h + 1))),
                        x)
                    ) {
                        case 'EXT-X-STREAM-INF': {
                            o.isMaster = !0;
                            let E = q(C),
                                y = a[++p].trim();
                            o.variants.push({
                                attributes: E,
                                uri: y,
                                resolvedUri: new URL(y, s).href,
                            });
                            break;
                        }
                        case 'EXT-X-MEDIA':
                            ((o.isMaster = !0), o.media.push(q(C)));
                            break;
                        case 'EXT-X-I-FRAME-STREAM-INF':
                            ((o.isMaster = !0),
                                o.tags.push({ name: x, value: q(C) }));
                            break;
                        case 'EXTINF': {
                            let [E, y] = C.split(','),
                                I = parseFloat(E);
                            (isNaN(I) && (I = 0),
                                (l = {
                                    duration: I,
                                    title: y || '',
                                    tags: [],
                                    key: d,
                                    parts: [],
                                    bitrate: f,
                                    gap: !1,
                                    type: 'Media',
                                }));
                            break;
                        }
                        case 'EXT-X-GAP':
                            l &&
                                ((l.gap = !0),
                                (l.uri = null),
                                (l.resolvedUrl = null),
                                o.segments.push(l),
                                (l = null));
                            break;
                        case 'EXT-X-BITRATE':
                            f = parseInt(C, 10);
                            break;
                        case 'EXT-X-BYTERANGE':
                            l && (l.byteRange = C);
                            break;
                        case 'EXT-X-DISCONTINUITY':
                            l && (l.discontinuity = !0);
                            break;
                        case 'EXT-X-KEY': {
                            let E = q(C);
                            ((d = E),
                                E.METHOD === 'NONE' && (d = null),
                                o.tags.push({ name: x, value: E }));
                            break;
                        }
                        case 'EXT-X-MAP':
                            o.map = q(C);
                            break;
                        case 'EXT-X-PROGRAM-DATE-TIME':
                            l && (l.dateTime = C);
                            break;
                        case 'EXT-X-TARGETDURATION':
                            o.targetDuration = parseInt(C, 10);
                            break;
                        case 'EXT-X-MEDIA-SEQUENCE':
                            o.mediaSequence = parseInt(C, 10);
                            break;
                        case 'EXT-X-PLAYLIST-TYPE':
                            ((o.playlistType = C),
                                C === 'VOD' && (o.isLive = !1));
                            break;
                        case 'EXT-X-ENDLIST':
                            ((o.isLive = !1),
                                o.tags.push({ name: x, value: null }));
                            break;
                        case 'EXT-X-VERSION':
                            ((o.version = parseInt(C, 10)),
                                o.tags.push({ name: x, value: o.version }));
                            break;
                        case 'EXT-X-PART-INF':
                            ((o.partInf = q(C)),
                                o.tags.push({ name: x, value: o.partInf }));
                            break;
                        case 'EXT-X-SERVER-CONTROL':
                            ((o.serverControl = q(C)),
                                o.tags.push({
                                    name: x,
                                    value: o.serverControl,
                                }));
                            break;
                        case 'EXT-X-PART':
                            if (l) {
                                let E = q(C);
                                l.parts.push({
                                    ...E,
                                    resolvedUri: new URL(String(E.URI), s).href,
                                });
                            }
                            break;
                        case 'EXT-X-PRELOAD-HINT':
                            (o.preloadHints.push(q(C)),
                                o.tags.push({
                                    name: x,
                                    value: o.preloadHints.at(-1),
                                }));
                            break;
                        case 'EXT-X-RENDITION-REPORT':
                            (o.renditionReports.push(q(C)),
                                o.tags.push({
                                    name: x,
                                    value: o.renditionReports.at(-1),
                                }));
                            break;
                        case 'EXT-X-DEFINE':
                        case 'EXT-X-SKIP':
                        case 'EXT-X-CONTENT-STEERING':
                        case 'EXT-X-DATERANGE':
                        case 'EXT-X-SESSION-DATA':
                            o.tags.push({ name: x, value: q(C) });
                            break;
                        default:
                            l
                                ? l.tags.push({ name: x, value: C })
                                : o.tags.push({ name: x, value: C });
                            break;
                    }
                } else
                    u.startsWith('#') ||
                        (l &&
                            ((l.uri = u),
                            (l.resolvedUrl = new URL(u, s).href),
                            o.segments.push(l),
                            (l = null)));
        }
        return { manifest: fo(o), definedVariables: r, baseUrl: s };
    }
    function po(e, s) {
        let t = s.tags.find((r) => r.name === 'EXT-X-SKIP');
        if (!t) return s;
        let i = t.value['SKIPPED-SEGMENTS'],
            n = JSON.parse(JSON.stringify(e));
        ((n.mediaSequence = s.mediaSequence),
            (n.discontinuitySequence = s.discontinuitySequence),
            (n.playlistType = s.playlistType));
        let a = n.segments.length;
        return (
            (n.segments = n.segments.slice(a - (a - i))),
            n.segments.push(...s.segments),
            (n.tags = s.tags.filter((r) => r.name !== 'EXT-X-SKIP')),
            (n.targetDuration = s.targetDuration),
            (n.partInf = s.partInf),
            (n.serverControl = s.serverControl),
            (n.isLive = s.isLive),
            n
        );
    }
    function ls(e) {
        let s = ['#EXTM3U'];
        if (
            (e.version > 1 && s.push(`#EXT-X-VERSION:${e.version}`),
            e.targetDuration &&
                s.push(`#EXT-X-TARGETDURATION:${e.targetDuration}`),
            e.mediaSequence &&
                s.push(`#EXT-X-MEDIA-SEQUENCE:${e.mediaSequence}`),
            e.partInf &&
                s.push(
                    `#EXT-X-PART-INF:PART-TARGET=${e.partInf['PART-TARGET']}`
                ),
            e.serverControl)
        ) {
            let i = Object.entries(e.serverControl)
                .map(([n, a]) => `${n}=${a}`)
                .join(',');
            s.push(`#EXT-X-SERVER-CONTROL:${i}`);
        }
        let t = null;
        return (
            e.segments.forEach((i) => {
                if (
                    (i.discontinuity && s.push('#EXT-X-DISCONTINUITY'),
                    i.key && JSON.stringify(i.key) !== JSON.stringify(t))
                ) {
                    let n = Object.entries(i.key)
                        .map(([a, r]) => `${a}="${r}"`)
                        .join(',');
                    (s.push(`#EXT-X-KEY:${n}`), (t = i.key));
                }
                (i.dateTime && s.push(`#EXT-X-PROGRAM-DATE-TIME:${i.dateTime}`),
                    s.push(`#EXTINF:${i.duration.toFixed(5)},${i.title || ''}`),
                    i.uri && s.push(i.uri),
                    i.parts.forEach((n) => {
                        let a = Object.entries(n)
                            .map(([r, o]) => `${r}="${o}"`)
                            .join(',');
                        s.push(`#EXT-X-PART:${a}`);
                    }));
            }),
            e.isLive || s.push('#EXT-X-ENDLIST'),
            s.join(`
`)
        );
    }
    var Z = new Map(),
        Ce = null;
    async function mo(e) {
        let s = b.streams.find((t) => t.id === e);
        if (!s || !s.originalUrl) {
            cs(e);
            return;
        }
        try {
            let t = await fetch(s.originalUrl);
            if (!t.ok) return;
            let i = await t.text();
            if (i === s.rawManifest) {
                T.dispatch('ui:show-status', {
                    message: 'Manifest has not changed.',
                    type: 'info',
                    duration: 2e3,
                });
                return;
            }
            let n = s.rawManifest,
                a = i,
                r;
            if (s.protocol === 'dash') {
                let { manifest: o } = await lo(i, s.baseUrl);
                r = o;
            } else if (i.includes('#EXT-X-SKIP')) {
                let { manifest: o } = await Ee(
                        i,
                        s.baseUrl,
                        s.hlsDefinedVariables
                    ),
                    l = po(s.manifest.rawElement, o.rawElement),
                    { manifest: d } = await Ee(
                        ls(l),
                        s.baseUrl,
                        s.hlsDefinedVariables
                    );
                ((r = d), (a = ls(l)));
            } else {
                let { manifest: o } = await Ee(
                    i,
                    s.baseUrl,
                    s.hlsDefinedVariables
                );
                r = o;
            }
            T.dispatch('livestream:manifest-updated', {
                streamId: s.id,
                newManifestString: a,
                newManifestObject: r,
                oldManifestString: n,
            });
        } catch (t) {
            console.error(
                `[LiveStreamMonitor] Error fetching update for stream ${s.id}:`,
                t
            );
        }
    }
    function hl(e) {
        if (!Z.has(e.id) && e.manifest?.type === 'dynamic' && e.originalUrl) {
            let s =
                    e.manifest.minimumUpdatePeriod ||
                    e.manifest.minBufferTime ||
                    2,
                t = Math.max(s * 1e3, 1e4),
                i = setInterval(() => mo(e.id), t);
            Z.set(e.id, i);
        }
    }
    function cs(e) {
        Z.has(e) && (clearInterval(Z.get(e)), Z.delete(e));
    }
    function ds() {
        let e = b.streams.filter((s) => s.manifest?.type === 'dynamic');
        e.forEach((s) => {
            let t = Z.has(s.id);
            s.isPolling && !t ? hl(s) : !s.isPolling && t && cs(s.id);
        });
        for (let s of Z.keys()) e.some((t) => t.id === s) || cs(s);
    }
    function uo() {
        (Ce && clearInterval(Ce),
            (Ce = setInterval(ds, 1e3)),
            T.subscribe('state:stream-updated', ds),
            T.subscribe('state:analysis-complete', ds),
            T.subscribe('manifest:force-reload', ({ streamId: e }) => mo(e)));
    }
    function ho() {
        Ce && (clearInterval(Ce), (Ce = null));
        for (let e of Z.values()) clearInterval(e);
        Z.clear();
    }
    var go = (e) => {
            let s = Ze(),
                t = s[e.type] || {},
                i = c`<div
        class="font-semibold font-mono p-2 bg-gray-900/50 rounded-t-md border-b border-gray-600 flex items-center gap-2"
    >
        ${
            e.issues && e.issues.length > 0
                ? c`<svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 text-yellow-400 flex-shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  title="${e.issues.map((o) => `[${o.type}] ${o.message}`)
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
            class="text-emerald-300 ${t.text ? k : ''}"
            data-tooltip="${t.text || ''}"
            data-iso="${t.ref || ''}"
            >${e.type}</span
        >
        <span class="text-gray-500 text-xs"
            >${t.name ? `(${t.name}) ` : ''}(${e.size}
            bytes)</span
        >
    </div>`,
                n =
                    Object.keys(e.details).length > 0
                        ? c`<div class="p-2">
                  <table
                      class="text-xs border-collapse w-full table-auto"
                  >
                      <tbody>
                          ${Object.entries(e.details).map(([o, l]) => {
                              let d = s[`${e.type}@${o}`];
                              return c`<tr>
                                  <td
                                      class="border border-gray-700 p-2 text-gray-400 w-1/3 ${d ? k : ''}"
                                      data-tooltip="${d?.text || ''}"
                                      data-iso="${d?.ref || ''}"
                                  >
                                      ${o}
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
                    e.samples && e.samples.length > 0
                        ? c`
                  <div class="p-2 text-xs border-t border-gray-700">
                      <h5 class="font-semibold text-gray-300 mb-1">
                          Sample Analysis (${e.samples.length} samples)
                      </h5>
                      <div
                          class="max-h-60 overflow-y-auto bg-gray-900/50 p-2 rounded"
                      >
                          ${e.samples.map(
                              (o, l) => c`
                                  <details class="mb-1">
                                      <summary
                                          class="cursor-pointer text-cyan-400"
                                      >
                                          Sample ${l + 1} (${o.size}
                                          bytes, Type:
                                          ${o.analysis?.frameType})
                                      </summary>
                                      <ul
                                          class="pl-4 list-disc list-inside mt-1"
                                      >
                                          ${o.analysis?.nalUnits.map(
                                              (d) => c`
                                                  <li
                                                      class="text-gray-300 font-mono"
                                                  >
                                                      ${d.type}: ${d.size}
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
                r =
                    e.children.length > 0
                        ? c`<div class="pl-4 mt-2 border-l-2 border-gray-600">
                  <ul class="list-none space-y-2">
                      ${e.children.map((o) => c`<li>${go(o)}</li>`)}
                  </ul>
              </div>`
                        : '';
            return c`<div class="border border-gray-700 rounded-md bg-gray-800">
        ${i}
        <div class="space-y-2">${n} ${a}</div>
        ${r}
    </div>`;
        },
        yo = (e) => c`
    <div>
        <ul class="list-none p-0 space-y-2">
            ${e.boxes.map((s) => c`<li>${go(s)}</li>`)}
        </ul>
    </div>
`;
    var St = (e, s) =>
            s == null
                ? ''
                : c`
        <div class="text-xs">
            <span class="block text-gray-400 mb-0.5">${e}</span>
            <span class="block font-semibold font-mono text-gray-200"
                >${s}</span
            >
        </div>
    `,
        xo = (e) => {
            let { summary: s, packets: t } = e.data,
                i = Object.keys(s.programMap)[0],
                n = i ? s.programMap[i] : null,
                a = t.reduce(
                    (o, l) => ((o[l.pid] = (o[l.pid] || 0) + 1), o),
                    {}
                ),
                r = {};
            return (
                n &&
                    (Object.assign(r, n.streams),
                    (r[s.pcrPid] = `${r[s.pcrPid] || 'Unknown'} (PCR)`)),
                (r[0] = 'PAT'),
                s.pmtPids.forEach((o) => (r[o] = 'PMT')),
                c`
        <div
            class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 bg-gray-900 border border-gray-700 rounded p-3 mb-4"
        >
            ${St('Total Packets', s.totalPackets)}
            ${St('PCR PID', s.pcrPid || 'N/A')}
            ${n ? St('Program #', n.programNumber) : ''}
            ${s.errors.length > 0 ? St('Errors', s.errors.join(', ')) : ''}
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
                        .sort(([o], [l]) => o - l)
                        .map(
                            ([o, l]) => c`
                                    <tr>
                                        <td class="p-2 font-mono">
                                            ${o} (0x${parseInt(o).toString(16).padStart(4, '0')})
                                        </td>
                                        <td class="p-2 font-mono">${l}</td>
                                        <td class="p-2">
                                            ${r[o] || 'Unknown/Data'}
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
    function gl(e, s) {
        let t = [],
            i = new Set([...Object.keys(e), ...Object.keys(s)]);
        for (let n of i) {
            let a = e[n],
                r = s[n],
                o = JSON.stringify(a) !== JSON.stringify(r);
            t.push({
                key: n,
                val1: a !== void 0 ? a : '---',
                val2: r !== void 0 ? r : '---',
                isDifferent: o,
            });
        }
        return t;
    }
    var yl = (e, s) => {
        if (!e.data.summary || !s.data.summary)
            return c`<p class="fail">Cannot compare segments; summary data is missing.</p>`;
        let t = gl(e.data.summary, s.data.summary);
        return c`
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
            ${t.map(
                (i) => c`
                    <div
                        class="p-2 border-b border-r border-gray-700 font-medium text-gray-400"
                    >
                        ${i.key}
                    </div>
                    <div
                        class="p-2 border-b border-r border-gray-700 font-mono ${i.isDifferent ? 'bg-red-900/50 text-red-300' : ''}"
                    >
                        ${i.val1}
                    </div>
                    <div
                        class="p-2 border-b border-r border-gray-700 font-mono ${i.isDifferent ? 'bg-red-900/50 text-red-300' : ''}"
                    >
                        ${i.val2}
                    </div>
                `
            )}
        </div>
    `;
    };
    function fs(e, s = null) {
        if (e?.error)
            return c`<p class="text-red-400 p-4">
            Segment could not be parsed:
            <span class="block font-mono bg-gray-900 p-2 mt-2 rounded">${e.error}</span>
        </p>`;
        if (!e)
            return c`<p class="text-gray-400 p-4">
            Segment data not available or is currently loading.
        </p>`;
        if (s) return yl(e, s);
        let t = e.format,
            n =
                t === 'isobmff' || t === 'ts'
                    ? c`<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>`
                    : c`<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>`,
            a =
                {
                    isobmff: 'ISO Base Media File Format',
                    ts: 'MPEG-2 Transport Stream',
                }[t] || 'Unknown Format',
            r;
        switch (t) {
            case 'isobmff':
                r = yo(e.data);
                break;
            case 'ts':
                r = xo(e);
                break;
            default:
                r = c`<p class="fail">
                Analysis view for format '${t}' is not supported.
            </p>`;
                break;
        }
        return c`
        <div
            class="flex items-center gap-2 mb-4 p-2 bg-gray-900/50 rounded-md border border-gray-700"
        >
            ${n}
            <span class="font-semibold text-gray-300"
                >Format: ${a}</span
            >
        </div>
        ${r}
    `;
    }
    function vo() {
        let e = g.segmentModal.querySelector('div');
        (g.segmentModal.classList.remove('opacity-0', 'invisible'),
            g.segmentModal.classList.add('opacity-100', 'visible'),
            e.classList.remove('scale-95'),
            e.classList.add('scale-100'));
    }
    function bo() {
        (T.subscribe('state:stream-updated', () => {
            let e = b.streams.find((s) => s.id === b.activeStreamId);
            e && R(ut(e), g.tabContents['interactive-manifest']);
        }),
            T.subscribe('stream:data-updated', ({ streamId: e }) => {
                if (e !== b.activeStreamId) return;
                let s = g.tabs.querySelector('[data-tab="features"]');
                if (s && s.classList.contains('bg-gray-700')) {
                    let i = b.streams.find((n) => n.id === e);
                    i && R(mt(i), g.tabContents.features);
                }
                let t = g.tabs.querySelector('[data-tab="updates"]');
                t && t.classList.contains('bg-gray-700') && ce(e);
            }),
            T.subscribe('ui:request-segment-analysis', ({ url: e }) => {
                ((g.modalTitle.textContent = 'Segment Analysis'),
                    (g.modalSegmentUrl.textContent = e));
                let s = b.segmentCache.get(e);
                (vo(), R(fs(s?.parsedData), g.modalContentArea));
            }),
            T.subscribe(
                'ui:request-segment-comparison',
                ({ urlA: e, urlB: s }) => {
                    ((g.modalTitle.textContent = 'Segment Comparison'),
                        (g.modalSegmentUrl.textContent =
                            'Comparing Segment A vs. Segment B'));
                    let t = b.segmentCache.get(e),
                        i = b.segmentCache.get(s);
                    (vo(),
                        R(
                            fs(t?.parsedData, i?.parsedData),
                            g.modalContentArea
                        ));
                }
            ),
            T.subscribe('analysis:started', () => {
                (g.results.classList.add('hidden'),
                    g.newAnalysisBtn.classList.add('hidden'),
                    g.shareAnalysisBtn.classList.add('hidden'),
                    g.contextSwitcherWrapper.classList.add('hidden'),
                    g.inputSection.classList.remove('hidden'),
                    (g.status.textContent = ''),
                    g.mainHeader.classList.add('justify-center'),
                    g.mainHeader.classList.remove('justify-between'),
                    g.headerTitleGroup.classList.add('text-center'),
                    g.headerTitleGroup.classList.remove('text-left'),
                    g.headerUrlDisplay.classList.add('hidden'),
                    (g.headerUrlDisplay.innerHTML = ''),
                    Je(),
                    Object.values(g.tabContents).forEach((i) => {
                        i && R(c``, i);
                    }));
                let e = g.tabs.querySelector('[data-tab="comparison"]'),
                    s = ['border-blue-600', 'text-gray-100', 'bg-gray-700'],
                    t = ['border-transparent'];
                (g.tabs.querySelectorAll('[data-tab]').forEach((i) => {
                    (i.classList.remove(...s), i.classList.add(...t));
                }),
                    e && (e.classList.add(...s), e.classList.remove(...t)));
            }));
    }
    var Tt = new Worker('/dist/worker.js', { type: 'module' }),
        ps = 0;
    Tt.onmessage = (e) => {
        let { type: s, payload: t } = e.data;
        switch (s) {
            case 'analysis-complete': {
                let n = t.streams;
                T.dispatch('state:analysis-complete', { streams: n });
                let a = performance.now();
                console.log(
                    `[DEBUG] Total Analysis Pipeline (success): ${(a - ps).toFixed(2)}ms`
                );
                break;
            }
            case 'analysis-error':
                T.dispatch('analysis:error', {
                    message: t.message,
                    error: t.error,
                });
                break;
            case 'analysis-failed':
                T.dispatch('analysis:failed');
                let i = performance.now();
                console.log(
                    `[DEBUG] Total Analysis Pipeline (failed): ${(i - ps).toFixed(2)}ms`
                );
                break;
            case 'status-update':
                T.dispatch('ui:show-status', {
                    message: t.message,
                    type: 'info',
                });
                break;
        }
    };
    async function xl(e) {
        ((ps = performance.now()),
            console.log('[DEBUG] Starting analysis pipeline...'),
            T.dispatch('analysis:started'));
        let s = [];
        for (let t of e)
            try {
                self.postMessage({
                    type: 'status-update',
                    payload: { message: `Fetching ${t.url || t.file.name}...` },
                });
                let i = '';
                if (t.url) {
                    let n = await fetch(t.url);
                    if (!n.ok) {
                        T.dispatch('analysis:error', {
                            message: `HTTP Error ${n.status} for ${t.url}`,
                        });
                        continue;
                    }
                    i = await n.text();
                } else i = await t.file.text();
                s.push({ ...t, manifestString: i });
            } catch (i) {
                T.dispatch('analysis:error', {
                    message: `Failed to fetch or read input: ${i.message}`,
                });
            }
        s.length > 0
            ? (console.log(
                  `[DEBUG] Pre-processing complete. Dispatching ${s.length} stream(s) to worker.`
              ),
              Tt.postMessage({
                  type: 'start-analysis',
                  payload: { inputs: s },
              }))
            : T.dispatch('analysis:failed');
    }
    async function So({ streamId: e, url: s, isReload: t = !1 }) {
        let i = b.streams.find((n) => n.id === e);
        if (i) {
            if (s === 'master') {
                let n = i.mediaPlaylists.get('master');
                n &&
                    T.dispatch('state:stream-updated', {
                        streamId: e,
                        updatedStreamData: {
                            activeManifestForView: n.manifest,
                            activeMediaPlaylistUrl: null,
                        },
                    });
                return;
            }
            if (i.mediaPlaylists.has(s) && !t) {
                let n = i.mediaPlaylists.get(s);
                T.dispatch('state:stream-updated', {
                    streamId: e,
                    updatedStreamData: {
                        activeManifestForView: n.manifest,
                        activeMediaPlaylistUrl: s,
                    },
                });
                return;
            }
            (T.dispatch('ui:show-status', {
                message: 'Fetching HLS media playlist...',
                type: 'info',
            }),
                Tt.postMessage({
                    type: 'fetch-hls-media-playlist',
                    payload: {
                        streamId: e,
                        url: s,
                        hlsDefinedVariables: i.hlsDefinedVariables,
                    },
                }));
        }
    }
    Tt.addEventListener('message', (e) => {
        let { type: s, payload: t } = e.data;
        if (s === 'hls-media-playlist-fetched') {
            let { streamId: i, url: n, manifest: a, rawManifest: r } = t,
                o = b.streams.find((l) => l.id === i);
            if (o) {
                let l = new Map(o.mediaPlaylists);
                (l.set(n, {
                    manifest: a,
                    rawManifest: r,
                    lastFetched: new Date(),
                }),
                    T.dispatch('state:stream-updated', {
                        streamId: i,
                        updatedStreamData: {
                            mediaPlaylists: l,
                            activeManifestForView: a,
                            activeMediaPlaylistUrl: n,
                        },
                    }),
                    T.dispatch('ui:show-status', {
                        message: 'Media playlist loaded.',
                        type: 'pass',
                    }));
            }
        } else
            s === 'hls-media-playlist-error' &&
                (console.error(
                    'Failed to fetch or parse media playlist in worker:',
                    t.error
                ),
                T.dispatch('ui:show-status', {
                    message: `Failed to load media playlist: ${t.error}`,
                    type: 'fail',
                }));
    });
    T.subscribe('analysis:request', ({ inputs: e }) => xl(e));
    T.subscribe('hls:media-playlist-activate', ({ streamId: e, url: s }) =>
        So({ streamId: e, url: s, isReload: !1 })
    );
    T.subscribe('hls:media-playlist-reload', ({ streamId: e, url: s }) =>
        So({ streamId: e, url: s, isReload: !0 })
    );
    var ms = new Worker('/dist/worker.js', { type: 'module' });
    ms.onmessage = (e) => {
        let { url: s, parsedData: t, error: i } = e.data,
            n = b.segmentCache.get(s);
        if (!n) return;
        let a = { status: i ? 500 : n.status, data: n.data, parsedData: t };
        (b.segmentCache.set(s, a),
            T.dispatch('segment:loaded', { url: s, entry: a }));
    };
    ms.onerror = (e) => {
        console.error('An error occurred in the parsing worker:', e);
    };
    async function vl(e) {
        if (b.segmentCache.has(e) && b.segmentCache.get(e).status !== -1) {
            T.dispatch('segment:loaded', {
                url: e,
                entry: b.segmentCache.get(e),
            });
            return;
        }
        try {
            let s = { status: -1, data: null, parsedData: null };
            (b.segmentCache.set(e, s),
                T.dispatch('segment:pending', { url: e }));
            let t = await fetch(e, { method: 'GET', cache: 'no-store' }),
                i = t.ok ? await t.arrayBuffer() : null,
                n = { status: t.status, data: i, parsedData: null };
            if ((b.segmentCache.set(e, n), i))
                ms.postMessage({
                    type: 'parse-segment',
                    payload: { url: e, data: i },
                });
            else {
                let a = {
                    status: t.status,
                    data: null,
                    parsedData: { error: `HTTP ${t.status}` },
                };
                (b.segmentCache.set(e, a),
                    T.dispatch('segment:loaded', { url: e, entry: a }));
            }
        } catch (s) {
            console.error(`Failed to fetch segment ${e}:`, s);
            let t = { status: 0, data: null, parsedData: { error: s.message } };
            (b.segmentCache.set(e, t),
                T.dispatch('segment:loaded', { url: e, entry: t }));
        }
    }
    T.subscribe('segment:fetch', ({ url: e }) => vl(e));
    var we = class {
        diff(s, t, i = {}) {
            let n;
            typeof i == 'function'
                ? ((n = i), (i = {}))
                : 'callback' in i && (n = i.callback);
            let a = this.castInput(s, i),
                r = this.castInput(t, i),
                o = this.removeEmpty(this.tokenize(a, i)),
                l = this.removeEmpty(this.tokenize(r, i));
            return this.diffWithOptionsObj(o, l, i, n);
        }
        diffWithOptionsObj(s, t, i, n) {
            var a;
            let r = (y) => {
                    if (((y = this.postProcess(y, i)), n)) {
                        setTimeout(function () {
                            n(y);
                        }, 0);
                        return;
                    } else return y;
                },
                o = t.length,
                l = s.length,
                d = 1,
                f = o + l;
            i.maxEditLength != null && (f = Math.min(f, i.maxEditLength));
            let m = (a = i.timeout) !== null && a !== void 0 ? a : 1 / 0,
                p = Date.now() + m,
                u = [{ oldPos: -1, lastComponent: void 0 }],
                h = this.extractCommon(u[0], t, s, 0, i);
            if (u[0].oldPos + 1 >= l && h + 1 >= o)
                return r(this.buildValues(u[0].lastComponent, t, s));
            let x = -1 / 0,
                C = 1 / 0,
                E = () => {
                    for (let y = Math.max(x, -d); y <= Math.min(C, d); y += 2) {
                        let I,
                            w = u[y - 1],
                            A = u[y + 1];
                        w && (u[y - 1] = void 0);
                        let _ = !1;
                        if (A) {
                            let L = A.oldPos - y;
                            _ = A && 0 <= L && L < o;
                        }
                        let P = w && w.oldPos + 1 < l;
                        if (!_ && !P) {
                            u[y] = void 0;
                            continue;
                        }
                        if (
                            (!P || (_ && w.oldPos < A.oldPos)
                                ? (I = this.addToPath(A, !0, !1, 0, i))
                                : (I = this.addToPath(w, !1, !0, 1, i)),
                            (h = this.extractCommon(I, t, s, y, i)),
                            I.oldPos + 1 >= l && h + 1 >= o)
                        )
                            return (
                                r(this.buildValues(I.lastComponent, t, s)) || !0
                            );
                        ((u[y] = I),
                            I.oldPos + 1 >= l && (C = Math.min(C, y - 1)),
                            h + 1 >= o && (x = Math.max(x, y + 1)));
                    }
                    d++;
                };
            if (n)
                (function y() {
                    setTimeout(function () {
                        if (d > f || Date.now() > p) return n(void 0);
                        E() || y();
                    }, 0);
                })();
            else
                for (; d <= f && Date.now() <= p; ) {
                    let y = E();
                    if (y) return y;
                }
        }
        addToPath(s, t, i, n, a) {
            let r = s.lastComponent;
            return r && !a.oneChangePerToken && r.added === t && r.removed === i
                ? {
                      oldPos: s.oldPos + n,
                      lastComponent: {
                          count: r.count + 1,
                          added: t,
                          removed: i,
                          previousComponent: r.previousComponent,
                      },
                  }
                : {
                      oldPos: s.oldPos + n,
                      lastComponent: {
                          count: 1,
                          added: t,
                          removed: i,
                          previousComponent: r,
                      },
                  };
        }
        extractCommon(s, t, i, n, a) {
            let r = t.length,
                o = i.length,
                l = s.oldPos,
                d = l - n,
                f = 0;
            for (
                ;
                d + 1 < r && l + 1 < o && this.equals(i[l + 1], t[d + 1], a);

            )
                (d++,
                    l++,
                    f++,
                    a.oneChangePerToken &&
                        (s.lastComponent = {
                            count: 1,
                            previousComponent: s.lastComponent,
                            added: !1,
                            removed: !1,
                        }));
            return (
                f &&
                    !a.oneChangePerToken &&
                    (s.lastComponent = {
                        count: f,
                        previousComponent: s.lastComponent,
                        added: !1,
                        removed: !1,
                    }),
                (s.oldPos = l),
                d
            );
        }
        equals(s, t, i) {
            return i.comparator
                ? i.comparator(s, t)
                : s === t ||
                      (!!i.ignoreCase && s.toLowerCase() === t.toLowerCase());
        }
        removeEmpty(s) {
            let t = [];
            for (let i = 0; i < s.length; i++) s[i] && t.push(s[i]);
            return t;
        }
        castInput(s, t) {
            return s;
        }
        tokenize(s, t) {
            return Array.from(s);
        }
        join(s) {
            return s.join('');
        }
        postProcess(s, t) {
            return s;
        }
        get useLongestToken() {
            return !1;
        }
        buildValues(s, t, i) {
            let n = [],
                a;
            for (; s; )
                (n.push(s),
                    (a = s.previousComponent),
                    delete s.previousComponent,
                    (s = a));
            n.reverse();
            let r = n.length,
                o = 0,
                l = 0,
                d = 0;
            for (; o < r; o++) {
                let f = n[o];
                if (f.removed)
                    ((f.value = this.join(i.slice(d, d + f.count))),
                        (d += f.count));
                else {
                    if (!f.added && this.useLongestToken) {
                        let m = t.slice(l, l + f.count);
                        ((m = m.map(function (p, u) {
                            let h = i[d + u];
                            return h.length > p.length ? h : p;
                        })),
                            (f.value = this.join(m)));
                    } else f.value = this.join(t.slice(l, l + f.count));
                    ((l += f.count), f.added || (d += f.count));
                }
            }
            return n;
        }
    };
    function us(e, s) {
        let t;
        for (t = 0; t < e.length && t < s.length; t++)
            if (e[t] != s[t]) return e.slice(0, t);
        return e.slice(0, t);
    }
    function hs(e, s) {
        let t;
        if (!e || !s || e[e.length - 1] != s[s.length - 1]) return '';
        for (t = 0; t < e.length && t < s.length; t++)
            if (e[e.length - (t + 1)] != s[s.length - (t + 1)])
                return e.slice(-t);
        return e.slice(-t);
    }
    function It(e, s, t) {
        if (e.slice(0, s.length) != s)
            throw Error(
                `string ${JSON.stringify(e)} doesn't start with prefix ${JSON.stringify(s)}; this is a bug`
            );
        return t + e.slice(s.length);
    }
    function Et(e, s, t) {
        if (!s) return e + t;
        if (e.slice(-s.length) != s)
            throw Error(
                `string ${JSON.stringify(e)} doesn't end with suffix ${JSON.stringify(s)}; this is a bug`
            );
        return e.slice(0, -s.length) + t;
    }
    function Ae(e, s) {
        return It(e, s, '');
    }
    function Ke(e, s) {
        return Et(e, s, '');
    }
    function gs(e, s) {
        return s.slice(0, bl(e, s));
    }
    function bl(e, s) {
        let t = 0;
        e.length > s.length && (t = e.length - s.length);
        let i = s.length;
        e.length < s.length && (i = e.length);
        let n = Array(i),
            a = 0;
        n[0] = 0;
        for (let r = 1; r < i; r++) {
            for (
                s[r] == s[a] ? (n[r] = n[a]) : (n[r] = a);
                a > 0 && s[r] != s[a];

            )
                a = n[a];
            s[r] == s[a] && a++;
        }
        a = 0;
        for (let r = t; r < e.length; r++) {
            for (; a > 0 && e[r] != s[a]; ) a = n[a];
            e[r] == s[a] && a++;
        }
        return a;
    }
    function Re(e) {
        let s;
        for (s = e.length - 1; s >= 0 && e[s].match(/\s/); s--);
        return e.substring(s + 1);
    }
    function ee(e) {
        let s = e.match(/^\s*/);
        return s ? s[0] : '';
    }
    var Ct =
            'a-zA-Z0-9_\\u{C0}-\\u{FF}\\u{D8}-\\u{F6}\\u{F8}-\\u{2C6}\\u{2C8}-\\u{2D7}\\u{2DE}-\\u{2FF}\\u{1E00}-\\u{1EFF}',
        Sl = new RegExp(`[${Ct}]+|\\s+|[^${Ct}]`, 'ug'),
        ys = class extends we {
            equals(s, t, i) {
                return (
                    i.ignoreCase &&
                        ((s = s.toLowerCase()), (t = t.toLowerCase())),
                    s.trim() === t.trim()
                );
            }
            tokenize(s, t = {}) {
                let i;
                if (t.intlSegmenter) {
                    let r = t.intlSegmenter;
                    if (r.resolvedOptions().granularity != 'word')
                        throw new Error(
                            'The segmenter passed must have a granularity of "word"'
                        );
                    i = Array.from(r.segment(s), (o) => o.segment);
                } else i = s.match(Sl) || [];
                let n = [],
                    a = null;
                return (
                    i.forEach((r) => {
                        (/\s/.test(r)
                            ? a == null
                                ? n.push(r)
                                : n.push(n.pop() + r)
                            : a != null && /\s/.test(a)
                              ? n[n.length - 1] == a
                                  ? n.push(n.pop() + r)
                                  : n.push(a + r)
                              : n.push(r),
                            (a = r));
                    }),
                    n
                );
            }
            join(s) {
                return s
                    .map((t, i) => (i == 0 ? t : t.replace(/^\s+/, '')))
                    .join('');
            }
            postProcess(s, t) {
                if (!s || t.oneChangePerToken) return s;
                let i = null,
                    n = null,
                    a = null;
                return (
                    s.forEach((r) => {
                        r.added
                            ? (n = r)
                            : r.removed
                              ? (a = r)
                              : ((n || a) && To(i, a, n, r),
                                (i = r),
                                (n = null),
                                (a = null));
                    }),
                    (n || a) && To(i, a, n, null),
                    s
                );
            }
        },
        Io = new ys();
    function vs(e, s, t) {
        return t?.ignoreWhitespace != null && !t.ignoreWhitespace
            ? Co(e, s, t)
            : Io.diff(e, s, t);
    }
    function To(e, s, t, i) {
        if (s && t) {
            let n = ee(s.value),
                a = Re(s.value),
                r = ee(t.value),
                o = Re(t.value);
            if (e) {
                let l = us(n, r);
                ((e.value = Et(e.value, r, l)),
                    (s.value = Ae(s.value, l)),
                    (t.value = Ae(t.value, l)));
            }
            if (i) {
                let l = hs(a, o);
                ((i.value = It(i.value, o, l)),
                    (s.value = Ke(s.value, l)),
                    (t.value = Ke(t.value, l)));
            }
        } else if (t) {
            if (e) {
                let n = ee(t.value);
                t.value = t.value.substring(n.length);
            }
            if (i) {
                let n = ee(i.value);
                i.value = i.value.substring(n.length);
            }
        } else if (e && i) {
            let n = ee(i.value),
                a = ee(s.value),
                r = Re(s.value),
                o = us(n, a);
            s.value = Ae(s.value, o);
            let l = hs(Ae(n, o), r);
            ((s.value = Ke(s.value, l)),
                (i.value = It(i.value, n, l)),
                (e.value = Et(e.value, n, n.slice(0, n.length - l.length))));
        } else if (i) {
            let n = ee(i.value),
                a = Re(s.value),
                r = gs(a, n);
            s.value = Ke(s.value, r);
        } else if (e) {
            let n = Re(e.value),
                a = ee(s.value),
                r = gs(n, a);
            s.value = Ae(s.value, r);
        }
    }
    var xs = class extends we {
            tokenize(s) {
                let t = new RegExp(
                    `(\\r?\\n)|[${Ct}]+|[^\\S\\n\\r]+|[^${Ct}]`,
                    'ug'
                );
                return s.match(t) || [];
            }
        },
        Eo = new xs();
    function Co(e, s, t) {
        return Eo.diff(e, s, t);
    }
    var wo = (e) =>
        e
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    function Ao(e) {
        if (!e) return '';
        let s = wo(e),
            t =
                /(&lt;!--[\s\S]*?--&gt;)|(&lt;\?[\s\S]*?\?&gt;)|(&lt;\/?)([\w:-]+)|([\w:-]+=)|(&quot;)([^&quot;]*)(\&quot;)/g;
        return s.replace(t, (i, n, a, r, o, l, d, f, m) =>
            n
                ? `<span class="text-gray-500 italic">${n}</span>`
                : a
                  ? `<span class="text-gray-500">${a}</span>`
                  : r
                    ? `${r}<span class="text-blue-300">${o}</span>`
                    : l
                      ? `<span class="text-emerald-300">${l.slice(0, -1)}</span>=`
                      : d
                        ? `${d}<span class="text-yellow-300">${f}</span>${m}`
                        : i
        );
    }
    function Ro(e) {
        return e
            ? e
                  .split(
                      `
`
                  )
                  .map((s) => {
                      let t = wo(s.trim());
                      if (t.startsWith('#EXT')) {
                          let i = t.indexOf(':');
                          if (i === -1)
                              return `#<span class="text-purple-300">${t.substring(1)}</span>`;
                          let n = t.substring(1, i),
                              a = t.substring(i + 1);
                          return (
                              (a = a.replace(
                                  /([A-Z0-9-]+)=/g,
                                  '<span class="text-emerald-300">$1</span>='
                              )),
                              (a = a.replace(
                                  /"([^"]*)"/g,
                                  '"<span class="text-yellow-300">$1</span>"'
                              )),
                              `#<span class="text-purple-300">${n}</span>:${a}`
                          );
                      }
                      return t.startsWith('#')
                          ? `<span class="text-gray-500">${t}</span>`
                          : `<span class="text-cyan-400">${t}</span>`;
                  }).join(`
`)
            : '';
    }
    function bs(e, s, t) {
        let i = vs(e, s),
            n = '',
            a = t === 'dash' ? Ao : Ro;
        return (
            i.forEach((r) => {
                if (r.removed) return;
                let o = a(r.value);
                r.added
                    ? (n += `<span class="bg-emerald-500/40 text-green-50 rounded-sm font-medium">${o}</span>`)
                    : (n += o);
            }),
            n
        );
    }
    var ws = qo(Uo());
    var Cs = new Map();
    async function Fo(e, s) {
        let t = b.streams.find((n) => n.id === e),
            i = t?.hlsVariantState.get(s);
        if (!t || !i) {
            Ll(e, s);
            return;
        }
        T.dispatch('hls-poller:variant-loading', {
            streamId: e,
            variantUri: s,
        });
        try {
            let n = await fetch(s);
            if (!n.ok) throw new Error(`HTTP ${n.status} fetching playlist`);
            let a = await n.text(),
                { manifest: r } = await Ee(a, s),
                o = new Set(r.rawElement.segments.map((l) => l.resolvedUrl));
            T.dispatch('hls-poller:variant-updated', {
                streamId: e,
                variantUri: s,
                segments: r.rawElement.segments,
                freshSegmentUrls: o,
            });
        } catch (n) {
            (console.error(
                `[HLSVariantPoller] Failed to fetch or parse playlist ${s}:`,
                n
            ),
                T.dispatch('hls-poller:variant-updated', {
                    streamId: e,
                    variantUri: s,
                    error: n.message,
                }));
        }
    }
    function Ll(e, s) {
        let t = `${e}-${s}`;
        Cs.has(t) && (clearInterval(Cs.get(t)), Cs.delete(t));
    }
    function Ul() {
        (T.subscribe('state:analysis-complete', ({ streams: e }) => {
            ((b.streams = e), (b.activeStreamId = e[0]?.id ?? null));
        }),
            T.subscribe('analysis:started', () => {
                ((b.streams = []),
                    (b.activeStreamId = null),
                    (b.activeSegmentUrl = null),
                    b.segmentCache.clear(),
                    (b.segmentsForCompare = []),
                    b.decodedSamples.clear(),
                    (b.streamIdCounter = 0));
            }),
            T.subscribe(
                'state:stream-updated',
                ({ streamId: e, updatedStreamData: s }) => {
                    let t = b.streams.findIndex((i) => i.id === e);
                    t !== -1 && (b.streams[t] = { ...b.streams[t], ...s });
                }
            ),
            T.subscribe('compare:add-segment', ({ url: e }) => {
                b.segmentsForCompare.length < 2 &&
                    !b.segmentsForCompare.includes(e) &&
                    (b.segmentsForCompare.push(e),
                    T.dispatch('state:compare-list-changed', {
                        count: b.segmentsForCompare.length,
                    }));
            }),
            T.subscribe('compare:remove-segment', ({ url: e }) => {
                let s = b.segmentsForCompare.indexOf(e);
                s > -1 &&
                    (b.segmentsForCompare.splice(s, 1),
                    T.dispatch('state:compare-list-changed', {
                        count: b.segmentsForCompare.length,
                    }));
            }),
            T.subscribe('compare:clear', () => {
                ((b.segmentsForCompare = []),
                    T.dispatch('state:compare-list-changed', { count: 0 }));
            }),
            T.subscribe(
                'livestream:manifest-updated',
                ({
                    streamId: e,
                    newManifestString: s,
                    newManifestObject: t,
                    oldManifestString: i,
                }) => {
                    let n = b.streams.findIndex((o) => o.id === e);
                    if (n === -1) return;
                    let a = b.streams[n];
                    if (a.protocol === 'unknown') return;
                    ((a.rawManifest = s), (a.manifest = t));
                    let r = Xa(t, a.protocol);
                    if (
                        (a.featureAnalysis.manifestCount++,
                        Object.entries(r).forEach(([o, l]) => {
                            let d = a.featureAnalysis.results.get(o);
                            l.used && (!d || !d.used)
                                ? a.featureAnalysis.results.set(o, {
                                      used: !0,
                                      details: l.details,
                                  })
                                : d ||
                                  a.featureAnalysis.results.set(o, {
                                      used: l.used,
                                      details: l.details,
                                  });
                        }),
                        a.protocol === 'dash')
                    ) {
                        let o = {
                                indentation: '  ',
                                lineSeparator: `
`,
                            },
                            l = (0, ws.default)(i, o),
                            d = (0, ws.default)(s, o),
                            f = bs(l, d, a.protocol),
                            m = {
                                timestamp: new Date().toLocaleTimeString(),
                                diffHtml: f,
                                rawManifest: s,
                            };
                        a.manifestUpdates.unshift(m);
                        let p = Se(t.rawElement, a.baseUrl);
                        Object.entries(p).forEach(([u, h]) => {
                            let x = a.dashRepresentationState.get(u);
                            if (x) {
                                let C = new Set(
                                    x.segments.map((E) => E.resolvedUrl)
                                );
                                (h.forEach((E) => {
                                    C.has(E.resolvedUrl) || x.segments.push(E);
                                }),
                                    (x.freshSegmentUrls = new Set(
                                        h.map((E) => E.resolvedUrl)
                                    )));
                            }
                        });
                    } else if (a.protocol === 'hls') {
                        let o = bs(i, s, a.protocol),
                            l = {
                                timestamp: new Date().toLocaleTimeString(),
                                diffHtml: o,
                                rawManifest: s,
                            };
                        a.manifestUpdates.unshift(l);
                    }
                    if (
                        (a.manifestUpdates.length > 20 &&
                            a.manifestUpdates.pop(),
                        a.protocol === 'hls' && !t.rawElement.isMaster)
                    ) {
                        let o = a.hlsVariantState.get(a.originalUrl);
                        if (o) {
                            let l = t.rawElement;
                            ((o.segments = l.segments || []),
                                (o.freshSegmentUrls = new Set(
                                    o.segments.map((d) => d.resolvedUrl)
                                )));
                        }
                    }
                    T.dispatch('stream:data-updated', { streamId: e });
                }
            ),
            T.subscribe(
                'hls-poller:variant-loading',
                ({ streamId: e, variantUri: s }) => {
                    let t = b.streams.find((n) => n.id === e);
                    if (!t) return;
                    let i = t.hlsVariantState.get(s);
                    i &&
                        ((i.isLoading = !0),
                        (i.error = null),
                        T.dispatch('state:stream-variant-changed', {
                            streamId: e,
                            variantUri: s,
                        }));
                }
            ),
            T.subscribe(
                'hls-poller:variant-updated',
                ({
                    streamId: e,
                    variantUri: s,
                    segments: t,
                    freshSegmentUrls: i,
                    error: n,
                }) => {
                    let a = b.streams.find((o) => o.id === e);
                    if (!a) return;
                    let r = a.hlsVariantState.get(s);
                    r &&
                        ((r.isLoading = !1),
                        (r.error = n || null),
                        n || ((r.segments = t), (r.freshSegmentUrls = i)),
                        T.dispatch('state:stream-variant-changed', {
                            streamId: e,
                            variantUri: s,
                        }));
                }
            ),
            T.subscribe(
                'hls-explorer:toggle-variant',
                ({ streamId: e, variantUri: s }) => {
                    let t = b.streams.find((n) => n.id === e);
                    if (!t) return;
                    let i = t.hlsVariantState.get(s);
                    if (i) {
                        let n = i.isExpanded;
                        ((i.isExpanded = !i.isExpanded),
                            i.isExpanded &&
                                !n &&
                                i.segments.length === 0 &&
                                Fo(e, s),
                            T.dispatch('state:stream-variant-changed', {
                                streamId: e,
                                variantUri: s,
                            }));
                    }
                }
            ),
            T.subscribe(
                'hls-explorer:toggle-polling',
                ({ streamId: e, variantUri: s }) => {
                    let t = b.streams.find((n) => n.id === e);
                    if (!t) return;
                    let i = t.hlsVariantState.get(s);
                    i &&
                        ((i.isPolling = !i.isPolling),
                        T.dispatch('state:stream-variant-changed', {
                            streamId: e,
                            variantUri: s,
                        }));
                }
            ),
            T.subscribe(
                'hls-explorer:set-display-mode',
                ({ streamId: e, variantUri: s, mode: t }) => {
                    let i = b.streams.find((a) => a.id === e);
                    if (!i) return;
                    let n = i.hlsVariantState.get(s);
                    n &&
                        ((n.displayMode = t),
                        T.dispatch('state:stream-variant-changed', {
                            streamId: e,
                            variantUri: s,
                        }));
                }
            ));
    }
    Ul();
    var Bo = 'dash_analyzer_history',
        Fl = 'dash_analyzer_presets',
        No = 10;
    function Bl() {
        let { streams: e } = b;
        if (e.length === 0) return;
        let s = new URL(window.location.origin + window.location.pathname);
        (e.forEach((t) => {
            t.originalUrl && s.searchParams.append('url', t.originalUrl);
        }),
            navigator.clipboard
                .writeText(s.href)
                .then(() => {
                    let t = g.shareAnalysisBtn.textContent;
                    ((g.shareAnalysisBtn.textContent = 'Copied!'),
                        setTimeout(() => {
                            g.shareAnalysisBtn.textContent = t;
                        }, 2e3));
                })
                .catch((t) => {
                    (console.error('Failed to copy URL: ', t),
                        alert('Failed to copy URL to clipboard.'));
                }));
    }
    function Nl() {
        (g.addStreamBtn.addEventListener('click', () => {
            (Nt(), Le());
        }),
            g.analyzeBtn.addEventListener('click', zl),
            g.tabs.addEventListener('click', io),
            g.newAnalysisBtn.addEventListener('click', () => {
                (ho(), T.dispatch('analysis:started'));
            }),
            g.contextSwitcher.addEventListener('change', (e) => {
                let s = e.target;
                ((b.activeStreamId = parseInt(s.value)), os());
            }),
            g.shareAnalysisBtn.addEventListener('click', Bl));
    }
    function Hl(e) {
        if (
            !e ||
            !e.originalUrl ||
            JSON.parse(localStorage.getItem(Fl) || '[]').some(
                (n) => n.url === e.originalUrl
            )
        )
            return;
        let i = JSON.parse(localStorage.getItem(Bo) || '[]');
        ((i = i.filter((n) => n.url !== e.originalUrl)),
            i.unshift({
                name: e.name,
                url: e.originalUrl,
                protocol: e.protocol,
                type: e.manifest?.type === 'dynamic' ? 'live' : 'vod',
            }),
            i.length > No && (i.length = No),
            localStorage.setItem(Bo, JSON.stringify(i)));
    }
    function zl() {
        let e = g.streamInputs.querySelectorAll('.stream-input-group'),
            s = Array.from(e)
                .map((t) => {
                    let i = parseInt(t.dataset.id),
                        n = t.querySelector('.input-url'),
                        a = t.querySelector('.input-file');
                    return {
                        id: i,
                        url: n.value,
                        file: a.files.length > 0 ? a.files[0] : null,
                    };
                })
                .filter((t) => t.url || t.file);
        s.length > 0
            ? T.dispatch('analysis:request', { inputs: s })
            : Ge('Please provide a stream URL or file to analyze.', 'warn');
    }
    function Xl() {
        (T.subscribe('state:analysis-complete', ({ streams: e }) => {
            e.length > 0 && Hl(e[0]);
            let s = e.length > 1 ? 'comparison' : 'summary';
            (so(),
                os(),
                Ge(`Analysis Complete for ${e.length} stream(s).`, 'pass', 5e3),
                (g.status.textContent = ''),
                g.inputSection.classList.add('hidden'),
                g.results.classList.remove('hidden'),
                g.newAnalysisBtn.classList.remove('hidden'),
                g.shareAnalysisBtn.classList.remove('hidden'),
                g.mainHeader.classList.remove('justify-center'),
                g.mainHeader.classList.add('justify-between'),
                g.headerTitleGroup.classList.remove('text-center'),
                g.headerTitleGroup.classList.add('text-left'),
                g.headerUrlDisplay.classList.remove('hidden'));
            let t = e
                .map(
                    (i) =>
                        `<div class="truncate" title="${i.originalUrl}">${i.originalUrl}</div>`
                )
                .join('');
            ((g.headerUrlDisplay.innerHTML = `<span class="font-bold text-gray-300 block mb-1">Analyzed Stream(s):</span>${t}`),
                document.querySelector(`[data-tab="${s}"]`).click());
        }),
            T.subscribe('analysis:error', ({ message: e, error: s }) => {
                (Ge(e, 'fail', 8e3),
                    console.error('An analysis error occurred:', s));
            }),
            T.subscribe('analysis:failed', () => {
                g.results.classList.add('hidden');
            }),
            T.subscribe('ui:show-status', ({ message: e, type: s }) => {
                Ge(e, s);
            }));
    }
    function Vl() {
        ($s(), Xl());
        let s = new URLSearchParams(window.location.search).getAll('url');
        if ((Nl(), _s(), no(), bo(), uo(), s.length > 0 && s[0])) {
            let t = s.map((i, n) => ({ id: n, url: i, file: null }));
            T.dispatch('analysis:request', { inputs: t });
        } else Je();
    }
    document.addEventListener('DOMContentLoaded', Vl);
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
