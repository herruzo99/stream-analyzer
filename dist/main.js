(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/xml-parser-xo/dist/cjs/index.js
  var require_cjs = __commonJS({
    "node_modules/xml-parser-xo/dist/cjs/index.js"(exports, module) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ParsingError = void 0;
      var ParsingError = class extends Error {
        constructor(message, cause) {
          super(message);
          this.cause = cause;
        }
      };
      exports.ParsingError = ParsingError;
      var parsingState;
      function nextChild() {
        return element(false) || text() || comment() || cdata() || processingInstruction(false);
      }
      function nextRootChild() {
        match(/\s*/);
        return element(true) || comment() || doctype() || processingInstruction(false);
      }
      function parseDocument() {
        const declaration = processingInstruction(true);
        const children = [];
        let documentRootNode;
        let child = nextRootChild();
        while (child) {
          if (child.node.type === "Element") {
            if (documentRootNode) {
              throw new Error("Found multiple root nodes");
            }
            documentRootNode = child.node;
          }
          if (!child.excluded) {
            children.push(child.node);
          }
          child = nextRootChild();
        }
        if (!documentRootNode) {
          throw new ParsingError("Failed to parse XML", "Root Element not found");
        }
        if (parsingState.xml.length !== 0) {
          throw new ParsingError("Failed to parse XML", "Not Well-Formed XML");
        }
        return {
          declaration: declaration ? declaration.node : null,
          root: documentRootNode,
          children
        };
      }
      function processingInstruction(matchDeclaration) {
        const m2 = matchDeclaration ? match(/^<\?(xml(-stylesheet)?)\s*/) : match(/^<\?([\w-:.]+)\s*/);
        if (!m2)
          return;
        const node = {
          name: m2[1],
          type: "ProcessingInstruction",
          attributes: {}
        };
        while (!(eos() || is("?>"))) {
          const attr = attribute();
          if (attr) {
            node.attributes[attr.name] = attr.value;
          } else {
            return;
          }
        }
        match(/\?>/);
        return {
          excluded: matchDeclaration ? false : parsingState.options.filter(node) === false,
          node
        };
      }
      function element(matchRoot) {
        const m2 = match(/^<([^?!</>\s]+)\s*/);
        if (!m2)
          return;
        const node = {
          type: "Element",
          name: m2[1],
          attributes: {},
          children: []
        };
        const excluded = matchRoot ? false : parsingState.options.filter(node) === false;
        while (!(eos() || is(">") || is("?>") || is("/>"))) {
          const attr = attribute();
          if (attr) {
            node.attributes[attr.name] = attr.value;
          } else {
            return;
          }
        }
        if (match(/^\s*\/>/)) {
          node.children = null;
          return {
            excluded,
            node
          };
        }
        match(/\??>/);
        let child = nextChild();
        while (child) {
          if (!child.excluded) {
            node.children.push(child.node);
          }
          child = nextChild();
        }
        if (parsingState.options.strictMode) {
          const closingTag = `</${node.name}>`;
          if (parsingState.xml.startsWith(closingTag)) {
            parsingState.xml = parsingState.xml.slice(closingTag.length);
          } else {
            throw new ParsingError("Failed to parse XML", `Closing tag not matching "${closingTag}"`);
          }
        } else {
          match(/^<\/[\w-:.\u00C0-\u00FF]+\s*>/);
        }
        return {
          excluded,
          node
        };
      }
      function doctype() {
        const m2 = match(/^<!DOCTYPE\s+\S+\s+SYSTEM[^>]*>/) || match(/^<!DOCTYPE\s+\S+\s+PUBLIC[^>]*>/) || match(/^<!DOCTYPE\s+\S+\s*\[[^\]]*]>/) || match(/^<!DOCTYPE\s+\S+\s*>/);
        if (m2) {
          const node = {
            type: "DocumentType",
            content: m2[0]
          };
          return {
            excluded: parsingState.options.filter(node) === false,
            node
          };
        }
      }
      function cdata() {
        if (parsingState.xml.startsWith("<![CDATA[")) {
          const endPositionStart = parsingState.xml.indexOf("]]>");
          if (endPositionStart > -1) {
            const endPositionFinish = endPositionStart + 3;
            const node = {
              type: "CDATA",
              content: parsingState.xml.substring(0, endPositionFinish)
            };
            parsingState.xml = parsingState.xml.slice(endPositionFinish);
            return {
              excluded: parsingState.options.filter(node) === false,
              node
            };
          }
        }
      }
      function comment() {
        const m2 = match(/^<!--[\s\S]*?-->/);
        if (m2) {
          const node = {
            type: "Comment",
            content: m2[0]
          };
          return {
            excluded: parsingState.options.filter(node) === false,
            node
          };
        }
      }
      function text() {
        const m2 = match(/^([^<]+)/);
        if (m2) {
          const node = {
            type: "Text",
            content: m2[1]
          };
          return {
            excluded: parsingState.options.filter(node) === false,
            node
          };
        }
      }
      function attribute() {
        const m2 = match(/([^=]+)\s*=\s*("[^"]*"|'[^']*'|[^>\s]+)\s*/);
        if (m2) {
          return {
            name: m2[1].trim(),
            value: stripQuotes(m2[2].trim())
          };
        }
      }
      function stripQuotes(val) {
        return val.replace(/^['"]|['"]$/g, "");
      }
      function match(re) {
        const m2 = parsingState.xml.match(re);
        if (m2) {
          parsingState.xml = parsingState.xml.slice(m2[0].length);
          return m2;
        }
      }
      function eos() {
        return 0 === parsingState.xml.length;
      }
      function is(prefix) {
        return 0 === parsingState.xml.indexOf(prefix);
      }
      function parseXml(xml, options = {}) {
        xml = xml.trim();
        const filter = options.filter || (() => true);
        parsingState = {
          xml,
          options: Object.assign(Object.assign({}, options), { filter, strictMode: options.strictMode === true })
        };
        return parseDocument();
      }
      if (typeof module !== "undefined" && typeof exports === "object") {
        module.exports = parseXml;
      }
      exports.default = parseXml;
    }
  });

  // node_modules/xml-formatter/dist/cjs/index.js
  var require_cjs2 = __commonJS({
    "node_modules/xml-formatter/dist/cjs/index.js"(exports, module) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      var xml_parser_xo_1 = __importDefault(require_cjs());
      function newLine(state) {
        if (!state.options.indentation && !state.options.lineSeparator)
          return;
        state.content += state.options.lineSeparator;
        let i3;
        for (i3 = 0; i3 < state.level; i3++) {
          state.content += state.options.indentation;
        }
      }
      function indent(state) {
        state.content = state.content.replace(/ +$/, "");
        let i3;
        for (i3 = 0; i3 < state.level; i3++) {
          state.content += state.options.indentation;
        }
      }
      function appendContent(state, content) {
        state.content += content;
      }
      function processNode(node, state, preserveSpace) {
        if (typeof node.content === "string") {
          processContent(node.content, state, preserveSpace);
        } else if (node.type === "Element") {
          processElementNode(node, state, preserveSpace);
        } else if (node.type === "ProcessingInstruction") {
          processProcessingIntruction(node, state);
        } else {
          throw new Error("Unknown node type: " + node.type);
        }
      }
      function processContent(content, state, preserveSpace) {
        if (!preserveSpace) {
          const trimmedContent = content.trim();
          if (state.options.lineSeparator) {
            content = trimmedContent;
          } else if (trimmedContent.length === 0) {
            content = trimmedContent;
          }
        }
        if (content.length > 0) {
          if (!preserveSpace && state.content.length > 0) {
            newLine(state);
          }
          appendContent(state, content);
        }
      }
      function isPathMatchingIgnoredPaths(path, ignoredPaths) {
        const fullPath = "/" + path.join("/");
        const pathLastPart = path[path.length - 1];
        return ignoredPaths.includes(pathLastPart) || ignoredPaths.includes(fullPath);
      }
      function processElementNode(node, state, preserveSpace) {
        state.path.push(node.name);
        if (!preserveSpace && state.content.length > 0) {
          newLine(state);
        }
        appendContent(state, "<" + node.name);
        processAttributes(state, node.attributes);
        if (node.children === null || state.options.forceSelfClosingEmptyTag && node.children.length === 0) {
          const selfClosingNodeClosingTag = state.options.whiteSpaceAtEndOfSelfclosingTag ? " />" : "/>";
          appendContent(state, selfClosingNodeClosingTag);
        } else if (node.children.length === 0) {
          appendContent(state, "></" + node.name + ">");
        } else {
          const nodeChildren = node.children;
          appendContent(state, ">");
          state.level++;
          let nodePreserveSpace = node.attributes["xml:space"] === "preserve" || preserveSpace;
          let ignoredPath = false;
          if (!nodePreserveSpace && state.options.ignoredPaths) {
            ignoredPath = isPathMatchingIgnoredPaths(state.path, state.options.ignoredPaths);
            nodePreserveSpace = ignoredPath;
          }
          if (!nodePreserveSpace && state.options.collapseContent) {
            let containsTextNodes = false;
            let containsTextNodesWithLineBreaks = false;
            let containsNonTextNodes = false;
            nodeChildren.forEach(function(child, index) {
              if (child.type === "Text") {
                if (child.content.includes("\n")) {
                  containsTextNodesWithLineBreaks = true;
                  child.content = child.content.trim();
                } else if ((index === 0 || index === nodeChildren.length - 1) && !preserveSpace) {
                  if (child.content.trim().length === 0) {
                    child.content = "";
                  }
                }
                if (child.content.trim().length > 0 || nodeChildren.length === 1) {
                  containsTextNodes = true;
                }
              } else if (child.type === "CDATA") {
                containsTextNodes = true;
              } else {
                containsNonTextNodes = true;
              }
            });
            if (containsTextNodes && (!containsNonTextNodes || !containsTextNodesWithLineBreaks)) {
              nodePreserveSpace = true;
            }
          }
          nodeChildren.forEach(function(child) {
            processNode(child, state, preserveSpace || nodePreserveSpace);
          });
          state.level--;
          if (!preserveSpace && !nodePreserveSpace) {
            newLine(state);
          }
          if (ignoredPath) {
            indent(state);
          }
          appendContent(state, "</" + node.name + ">");
        }
        state.path.pop();
      }
      function processAttributes(state, attributes) {
        Object.keys(attributes).forEach(function(attr) {
          const escaped = attributes[attr].replace(/"/g, "&quot;");
          appendContent(state, " " + attr + '="' + escaped + '"');
        });
      }
      function processProcessingIntruction(node, state) {
        if (state.content.length > 0) {
          newLine(state);
        }
        appendContent(state, "<?" + node.name);
        processAttributes(state, node.attributes);
        appendContent(state, "?>");
      }
      function formatXml(xml, options = {}) {
        options.indentation = "indentation" in options ? options.indentation : "    ";
        options.collapseContent = options.collapseContent === true;
        options.lineSeparator = "lineSeparator" in options ? options.lineSeparator : "\r\n";
        options.whiteSpaceAtEndOfSelfclosingTag = options.whiteSpaceAtEndOfSelfclosingTag === true;
        options.throwOnFailure = options.throwOnFailure !== false;
        try {
          const parsedXml = (0, xml_parser_xo_1.default)(xml, { filter: options.filter, strictMode: options.strictMode });
          const state = { content: "", level: 0, options, path: [] };
          if (parsedXml.declaration) {
            processProcessingIntruction(parsedXml.declaration, state);
          }
          parsedXml.children.forEach(function(child) {
            processNode(child, state, false);
          });
          if (!options.lineSeparator) {
            return state.content;
          }
          return state.content.replace(/\r\n/g, "\n").replace(/\n/g, options.lineSeparator);
        } catch (err) {
          if (options.throwOnFailure) {
            throw err;
          }
          return xml;
        }
      }
      formatXml.minify = (xml, options = {}) => {
        return formatXml(xml, Object.assign(Object.assign({}, options), { indentation: "", lineSeparator: "" }));
      };
      if (typeof module !== "undefined" && typeof exports === "object") {
        module.exports = formatXml;
      }
      exports.default = formatXml;
    }
  });

  // js/state.js
  var analysisState = {
    streams: [],
    activeStreamId: null,
    activeSegmentUrl: null,
    segmentFreshnessChecker: null,
    streamIdCounter: 0,
    manifestUpdates: [],
    activeManifestUpdateIndex: 0,
    isPollingActive: false,
    segmentCache: /* @__PURE__ */ new Map(),
    segmentsForCompare: []
  };
  var dom = {
    streamInputs: (
      /** @type {HTMLDivElement} */
      document.getElementById("stream-inputs")
    ),
    addStreamBtn: (
      /** @type {HTMLButtonElement} */
      document.getElementById("add-stream-btn")
    ),
    analyzeBtn: (
      /** @type {HTMLButtonElement} */
      document.getElementById("analyze-btn")
    ),
    status: (
      /** @type {HTMLDivElement} */
      document.getElementById("status")
    ),
    results: (
      /** @type {HTMLDivElement} */
      document.getElementById("results")
    ),
    tabs: (
      /** @type {HTMLElement} */
      document.getElementById("tabs")
    ),
    contextSwitcherContainer: (
      /** @type {HTMLDivElement} */
      document.getElementById("context-switcher-container")
    ),
    contextSwitcher: (
      /** @type {HTMLSelectElement} */
      document.getElementById("context-switcher")
    ),
    tabContents: {
      comparison: (
        /** @type {HTMLDivElement} */
        document.getElementById("tab-comparison")
      ),
      summary: (
        /** @type {HTMLDivElement} */
        document.getElementById("tab-summary")
      ),
      "timeline-visuals": (
        /** @type {HTMLDivElement} */
        document.getElementById("tab-timeline-visuals")
      ),
      features: (
        /** @type {HTMLDivElement} */
        document.getElementById("tab-features")
      ),
      compliance: (
        /** @type {HTMLDivElement} */
        document.getElementById("tab-compliance")
      ),
      explorer: (
        /** @type {HTMLDivElement} */
        document.getElementById("tab-explorer")
      ),
      "interactive-segment": (
        /** @type {HTMLDivElement} */
        document.getElementById("tab-interactive-segment")
      ),
      "interactive-manifest": (
        /** @type {HTMLDivElement} */
        document.getElementById("tab-interactive-manifest")
      ),
      updates: (
        /** @type {HTMLDivElement} */
        document.getElementById("tab-updates")
      )
    },
    segmentModal: (
      /** @type {HTMLDivElement} */
      document.getElementById("segment-modal")
    ),
    modalTitle: (
      /** @type {HTMLHeadingElement} */
      document.getElementById("modal-title")
    ),
    modalSegmentUrl: (
      /** @type {HTMLParagraphElement} */
      document.getElementById("modal-segment-url")
    ),
    modalContentArea: (
      /** @type {HTMLDivElement} */
      document.getElementById("modal-content-area")
    ),
    closeModalBtn: (
      /** @type {HTMLButtonElement} */
      document.getElementById("close-modal-btn")
    ),
    globalTooltip: (
      /** @type {HTMLDivElement} */
      document.getElementById("global-tooltip")
    )
  };

  // node_modules/lit-html/lit-html.js
  var t = globalThis;
  var i = t.trustedTypes;
  var s = i ? i.createPolicy("lit-html", { createHTML: (t3) => t3 }) : void 0;
  var e = "$lit$";
  var h = `lit$${Math.random().toFixed(9).slice(2)}$`;
  var o = "?" + h;
  var n = `<${o}>`;
  var r = document;
  var l = () => r.createComment("");
  var c = (t3) => null === t3 || "object" != typeof t3 && "function" != typeof t3;
  var a = Array.isArray;
  var u = (t3) => a(t3) || "function" == typeof t3?.[Symbol.iterator];
  var d = "[ 	\n\f\r]";
  var f = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
  var v = /-->/g;
  var _ = />/g;
  var m = RegExp(`>|${d}(?:([^\\s"'>=/]+)(${d}*=${d}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
  var p = /'/g;
  var g = /"/g;
  var $ = /^(?:script|style|textarea|title)$/i;
  var y = (t3) => (i3, ...s2) => ({ _$litType$: t3, strings: i3, values: s2 });
  var x = y(1);
  var b = y(2);
  var w = y(3);
  var T = Symbol.for("lit-noChange");
  var E = Symbol.for("lit-nothing");
  var A = /* @__PURE__ */ new WeakMap();
  var C = r.createTreeWalker(r, 129);
  function P(t3, i3) {
    if (!a(t3) || !t3.hasOwnProperty("raw")) throw Error("invalid template strings array");
    return void 0 !== s ? s.createHTML(i3) : i3;
  }
  var V = (t3, i3) => {
    const s2 = t3.length - 1, o3 = [];
    let r2, l2 = 2 === i3 ? "<svg>" : 3 === i3 ? "<math>" : "", c2 = f;
    for (let i4 = 0; i4 < s2; i4++) {
      const s3 = t3[i4];
      let a2, u2, d2 = -1, y2 = 0;
      for (; y2 < s3.length && (c2.lastIndex = y2, u2 = c2.exec(s3), null !== u2); ) y2 = c2.lastIndex, c2 === f ? "!--" === u2[1] ? c2 = v : void 0 !== u2[1] ? c2 = _ : void 0 !== u2[2] ? ($.test(u2[2]) && (r2 = RegExp("</" + u2[2], "g")), c2 = m) : void 0 !== u2[3] && (c2 = m) : c2 === m ? ">" === u2[0] ? (c2 = r2 ?? f, d2 = -1) : void 0 === u2[1] ? d2 = -2 : (d2 = c2.lastIndex - u2[2].length, a2 = u2[1], c2 = void 0 === u2[3] ? m : '"' === u2[3] ? g : p) : c2 === g || c2 === p ? c2 = m : c2 === v || c2 === _ ? c2 = f : (c2 = m, r2 = void 0);
      const x2 = c2 === m && t3[i4 + 1].startsWith("/>") ? " " : "";
      l2 += c2 === f ? s3 + n : d2 >= 0 ? (o3.push(a2), s3.slice(0, d2) + e + s3.slice(d2) + h + x2) : s3 + h + (-2 === d2 ? i4 : x2);
    }
    return [P(t3, l2 + (t3[s2] || "<?>") + (2 === i3 ? "</svg>" : 3 === i3 ? "</math>" : "")), o3];
  };
  var N = class _N {
    constructor({ strings: t3, _$litType$: s2 }, n2) {
      let r2;
      this.parts = [];
      let c2 = 0, a2 = 0;
      const u2 = t3.length - 1, d2 = this.parts, [f2, v2] = V(t3, s2);
      if (this.el = _N.createElement(f2, n2), C.currentNode = this.el.content, 2 === s2 || 3 === s2) {
        const t4 = this.el.content.firstChild;
        t4.replaceWith(...t4.childNodes);
      }
      for (; null !== (r2 = C.nextNode()) && d2.length < u2; ) {
        if (1 === r2.nodeType) {
          if (r2.hasAttributes()) for (const t4 of r2.getAttributeNames()) if (t4.endsWith(e)) {
            const i3 = v2[a2++], s3 = r2.getAttribute(t4).split(h), e4 = /([.?@])?(.*)/.exec(i3);
            d2.push({ type: 1, index: c2, name: e4[2], strings: s3, ctor: "." === e4[1] ? H : "?" === e4[1] ? I : "@" === e4[1] ? L : k }), r2.removeAttribute(t4);
          } else t4.startsWith(h) && (d2.push({ type: 6, index: c2 }), r2.removeAttribute(t4));
          if ($.test(r2.tagName)) {
            const t4 = r2.textContent.split(h), s3 = t4.length - 1;
            if (s3 > 0) {
              r2.textContent = i ? i.emptyScript : "";
              for (let i3 = 0; i3 < s3; i3++) r2.append(t4[i3], l()), C.nextNode(), d2.push({ type: 2, index: ++c2 });
              r2.append(t4[s3], l());
            }
          }
        } else if (8 === r2.nodeType) if (r2.data === o) d2.push({ type: 2, index: c2 });
        else {
          let t4 = -1;
          for (; -1 !== (t4 = r2.data.indexOf(h, t4 + 1)); ) d2.push({ type: 7, index: c2 }), t4 += h.length - 1;
        }
        c2++;
      }
    }
    static createElement(t3, i3) {
      const s2 = r.createElement("template");
      return s2.innerHTML = t3, s2;
    }
  };
  function S(t3, i3, s2 = t3, e4) {
    if (i3 === T) return i3;
    let h2 = void 0 !== e4 ? s2._$Co?.[e4] : s2._$Cl;
    const o3 = c(i3) ? void 0 : i3._$litDirective$;
    return h2?.constructor !== o3 && (h2?._$AO?.(false), void 0 === o3 ? h2 = void 0 : (h2 = new o3(t3), h2._$AT(t3, s2, e4)), void 0 !== e4 ? (s2._$Co ??= [])[e4] = h2 : s2._$Cl = h2), void 0 !== h2 && (i3 = S(t3, h2._$AS(t3, i3.values), h2, e4)), i3;
  }
  var M = class {
    constructor(t3, i3) {
      this._$AV = [], this._$AN = void 0, this._$AD = t3, this._$AM = i3;
    }
    get parentNode() {
      return this._$AM.parentNode;
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    u(t3) {
      const { el: { content: i3 }, parts: s2 } = this._$AD, e4 = (t3?.creationScope ?? r).importNode(i3, true);
      C.currentNode = e4;
      let h2 = C.nextNode(), o3 = 0, n2 = 0, l2 = s2[0];
      for (; void 0 !== l2; ) {
        if (o3 === l2.index) {
          let i4;
          2 === l2.type ? i4 = new R(h2, h2.nextSibling, this, t3) : 1 === l2.type ? i4 = new l2.ctor(h2, l2.name, l2.strings, this, t3) : 6 === l2.type && (i4 = new z(h2, this, t3)), this._$AV.push(i4), l2 = s2[++n2];
        }
        o3 !== l2?.index && (h2 = C.nextNode(), o3++);
      }
      return C.currentNode = r, e4;
    }
    p(t3) {
      let i3 = 0;
      for (const s2 of this._$AV) void 0 !== s2 && (void 0 !== s2.strings ? (s2._$AI(t3, s2, i3), i3 += s2.strings.length - 2) : s2._$AI(t3[i3])), i3++;
    }
  };
  var R = class _R {
    get _$AU() {
      return this._$AM?._$AU ?? this._$Cv;
    }
    constructor(t3, i3, s2, e4) {
      this.type = 2, this._$AH = E, this._$AN = void 0, this._$AA = t3, this._$AB = i3, this._$AM = s2, this.options = e4, this._$Cv = e4?.isConnected ?? true;
    }
    get parentNode() {
      let t3 = this._$AA.parentNode;
      const i3 = this._$AM;
      return void 0 !== i3 && 11 === t3?.nodeType && (t3 = i3.parentNode), t3;
    }
    get startNode() {
      return this._$AA;
    }
    get endNode() {
      return this._$AB;
    }
    _$AI(t3, i3 = this) {
      t3 = S(this, t3, i3), c(t3) ? t3 === E || null == t3 || "" === t3 ? (this._$AH !== E && this._$AR(), this._$AH = E) : t3 !== this._$AH && t3 !== T && this._(t3) : void 0 !== t3._$litType$ ? this.$(t3) : void 0 !== t3.nodeType ? this.T(t3) : u(t3) ? this.k(t3) : this._(t3);
    }
    O(t3) {
      return this._$AA.parentNode.insertBefore(t3, this._$AB);
    }
    T(t3) {
      this._$AH !== t3 && (this._$AR(), this._$AH = this.O(t3));
    }
    _(t3) {
      this._$AH !== E && c(this._$AH) ? this._$AA.nextSibling.data = t3 : this.T(r.createTextNode(t3)), this._$AH = t3;
    }
    $(t3) {
      const { values: i3, _$litType$: s2 } = t3, e4 = "number" == typeof s2 ? this._$AC(t3) : (void 0 === s2.el && (s2.el = N.createElement(P(s2.h, s2.h[0]), this.options)), s2);
      if (this._$AH?._$AD === e4) this._$AH.p(i3);
      else {
        const t4 = new M(e4, this), s3 = t4.u(this.options);
        t4.p(i3), this.T(s3), this._$AH = t4;
      }
    }
    _$AC(t3) {
      let i3 = A.get(t3.strings);
      return void 0 === i3 && A.set(t3.strings, i3 = new N(t3)), i3;
    }
    k(t3) {
      a(this._$AH) || (this._$AH = [], this._$AR());
      const i3 = this._$AH;
      let s2, e4 = 0;
      for (const h2 of t3) e4 === i3.length ? i3.push(s2 = new _R(this.O(l()), this.O(l()), this, this.options)) : s2 = i3[e4], s2._$AI(h2), e4++;
      e4 < i3.length && (this._$AR(s2 && s2._$AB.nextSibling, e4), i3.length = e4);
    }
    _$AR(t3 = this._$AA.nextSibling, i3) {
      for (this._$AP?.(false, true, i3); t3 !== this._$AB; ) {
        const i4 = t3.nextSibling;
        t3.remove(), t3 = i4;
      }
    }
    setConnected(t3) {
      void 0 === this._$AM && (this._$Cv = t3, this._$AP?.(t3));
    }
  };
  var k = class {
    get tagName() {
      return this.element.tagName;
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    constructor(t3, i3, s2, e4, h2) {
      this.type = 1, this._$AH = E, this._$AN = void 0, this.element = t3, this.name = i3, this._$AM = e4, this.options = h2, s2.length > 2 || "" !== s2[0] || "" !== s2[1] ? (this._$AH = Array(s2.length - 1).fill(new String()), this.strings = s2) : this._$AH = E;
    }
    _$AI(t3, i3 = this, s2, e4) {
      const h2 = this.strings;
      let o3 = false;
      if (void 0 === h2) t3 = S(this, t3, i3, 0), o3 = !c(t3) || t3 !== this._$AH && t3 !== T, o3 && (this._$AH = t3);
      else {
        const e5 = t3;
        let n2, r2;
        for (t3 = h2[0], n2 = 0; n2 < h2.length - 1; n2++) r2 = S(this, e5[s2 + n2], i3, n2), r2 === T && (r2 = this._$AH[n2]), o3 ||= !c(r2) || r2 !== this._$AH[n2], r2 === E ? t3 = E : t3 !== E && (t3 += (r2 ?? "") + h2[n2 + 1]), this._$AH[n2] = r2;
      }
      o3 && !e4 && this.j(t3);
    }
    j(t3) {
      t3 === E ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t3 ?? "");
    }
  };
  var H = class extends k {
    constructor() {
      super(...arguments), this.type = 3;
    }
    j(t3) {
      this.element[this.name] = t3 === E ? void 0 : t3;
    }
  };
  var I = class extends k {
    constructor() {
      super(...arguments), this.type = 4;
    }
    j(t3) {
      this.element.toggleAttribute(this.name, !!t3 && t3 !== E);
    }
  };
  var L = class extends k {
    constructor(t3, i3, s2, e4, h2) {
      super(t3, i3, s2, e4, h2), this.type = 5;
    }
    _$AI(t3, i3 = this) {
      if ((t3 = S(this, t3, i3, 0) ?? E) === T) return;
      const s2 = this._$AH, e4 = t3 === E && s2 !== E || t3.capture !== s2.capture || t3.once !== s2.once || t3.passive !== s2.passive, h2 = t3 !== E && (s2 === E || e4);
      e4 && this.element.removeEventListener(this.name, this, s2), h2 && this.element.addEventListener(this.name, this, t3), this._$AH = t3;
    }
    handleEvent(t3) {
      "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t3) : this._$AH.handleEvent(t3);
    }
  };
  var z = class {
    constructor(t3, i3, s2) {
      this.element = t3, this.type = 6, this._$AN = void 0, this._$AM = i3, this.options = s2;
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    _$AI(t3) {
      S(this, t3);
    }
  };
  var j = t.litHtmlPolyfillSupport;
  j?.(N, R), (t.litHtmlVersions ??= []).push("3.3.1");
  var B = (t3, i3, s2) => {
    const e4 = s2?.renderBefore ?? i3;
    let h2 = e4._$litPart$;
    if (void 0 === h2) {
      const t4 = s2?.renderBefore ?? null;
      e4._$litPart$ = h2 = new R(i3.insertBefore(l(), t4), t4, void 0, s2 ?? {});
    }
    return h2._$AI(t3), h2;
  };

  // js/shared/constants.js
  var tooltipTriggerClasses = "cursor-help border-b border-dotted border-blue-500/40 transition-colors hover:bg-blue-500/15 hover:border-solid";

  // js/features/summary/view.js
  var statCardTemplate = (label, value, tooltipText, isoRef) => {
    if (value === null || value === void 0 || value === "" || Array.isArray(value) && value.length === 0)
      return "";
    return x` <div
        class="bg-gray-800 p-4 rounded-lg border border-gray-700"
    >
        <dt
            class="text-sm font-medium text-gray-400 ${tooltipTriggerClasses}"
            data-tooltip="${tooltipText}"
            data-iso="${isoRef}"
        >
            ${label}
        </dt>
        <dd class="text-lg text-left font-mono text-white mt-1 break-words">
            ${value}
        </dd>
    </div>`;
  };
  var formatBitrate = (bps) => {
    if (!bps || isNaN(bps)) return "N/A";
    if (bps >= 1e6) return `${(bps / 1e6).toFixed(2)} Mbps`;
    return `${(bps / 1e3).toFixed(0)} kbps`;
  };
  function getGlobalSummaryTemplate(manifest) {
    if (!manifest) return x`<p class="warn">No manifest data to display.</p>`;
    const videoSets = manifest.periods.flatMap(
      (p2) => p2.adaptationSets.filter((as) => as.contentType === "video")
    );
    const audioSets = manifest.periods.flatMap(
      (p2) => p2.adaptationSets.filter((as) => as.contentType === "audio")
    );
    const textSets = manifest.periods.flatMap(
      (p2) => p2.adaptationSets.filter(
        (as) => as.contentType === "text" || as.contentType === "application"
      )
    );
    const protectionSchemes = [
      ...new Set(
        manifest.periods.flatMap((p2) => p2.adaptationSets).flatMap((as) => as.contentProtection).map((cp) => cp.system)
      )
    ];
    const protectionText = protectionSchemes.length > 0 ? `Yes (${protectionSchemes.join(", ")})` : "No";
    const allVideoReps = videoSets.flatMap((as) => as.representations);
    const bandwidths = allVideoReps.map((r2) => r2.bandwidth).filter(Boolean);
    const resolutions = [
      ...new Set(allVideoReps.map((r2) => `${r2.width}x${r2.height}`))
    ].filter((r2) => r2 !== "nullxnull");
    const videoCodecs = [
      ...new Set(allVideoReps.map((r2) => r2.codecs))
    ].filter(Boolean);
    const languages = [...new Set(audioSets.map((as) => as.lang))].filter(
      Boolean
    );
    const audioCodecs = [
      ...new Set(audioSets.flatMap((as) => as.representations).map((r2) => r2.codecs))
    ].filter(Boolean);
    return x`
        <div class="space-y-8">
            <div>
                <h3 class="text-xl font-bold mb-4">Manifest Properties</h3>
                <dl
                    class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                    ${statCardTemplate(
      "Presentation Type",
      manifest.type,
      "Defines if the stream is live (`dynamic`) or on-demand (`static`).",
      "DASH: 5.3.1.2 / HLS: 4.3.3.5"
    )}
                    ${statCardTemplate(
      "Profiles / Version",
      manifest.profiles,
      "Indicates the set of features used in the manifest.",
      "DASH: 8.1 / HLS: 4.3.1.2"
    )}
                    ${statCardTemplate(
      "Min Buffer Time / Target Duration",
      manifest.minBufferTime ? `${manifest.minBufferTime}s` : "N/A",
      "The minimum buffer a client should maintain (DASH) or the max segment duration (HLS).",
      "DASH: 5.3.1.2 / HLS: 4.3.3.1"
    )}
                    ${manifest.type === "dynamic" ? x`
                              ${statCardTemplate(
      "Publish Time",
      manifest.publishTime?.toLocaleString(),
      "The time this manifest version was generated.",
      "DASH: 5.3.1.2"
    )}
                              ${statCardTemplate(
      "Availability Start Time",
      manifest.availabilityStartTime?.toLocaleString(),
      "The anchor time for the presentation.",
      "DASH: 5.3.1.2"
    )}
                              ${statCardTemplate(
      "Update Period",
      manifest.minimumUpdatePeriod ? `${manifest.minimumUpdatePeriod}s` : "N/A",
      "How often a client should check for a new manifest.",
      "DASH: 5.3.1.2"
    )}
                              ${statCardTemplate(
      "Time Shift Buffer Depth",
      manifest.timeShiftBufferDepth ? `${manifest.timeShiftBufferDepth}s` : "N/A",
      "The duration of the seekable live window.",
      "DASH: 5.3.1.2"
    )}
                          ` : x`
                              ${statCardTemplate(
      "Media Duration",
      manifest.duration ? `${manifest.duration.toFixed(2)}s` : "N/A",
      "The total duration of the content.",
      "DASH: 5.3.1.2"
    )}
                          `}
                </dl>
            </div>

            <div>
                <h3 class="text-xl font-bold mb-4">Content Overview</h3>
                <dl
                    class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                    ${statCardTemplate(
      "Periods",
      manifest.periods.length,
      "A Period represents a segment of content (DASH). HLS is treated as a single period.",
      "DASH: 5.3.2"
    )}
                    ${statCardTemplate(
      "Video Tracks / Variants",
      videoSets.length,
      "Number of distinct video tracks or variants.",
      "DASH: 5.3.3 / HLS: 4.3.4.2"
    )}
                    ${statCardTemplate(
      "Audio Tracks / Renditions",
      audioSets.length,
      "Number of distinct audio tracks or renditions.",
      "DASH: 5.3.3 / HLS: 4.3.4.1"
    )}
                    ${statCardTemplate(
      "Subtitle/Text Tracks",
      textSets.length,
      "Number of distinct subtitle or text tracks.",
      "DASH: 5.3.3 / HLS: 4.3.4.1"
    )}
                    ${statCardTemplate(
      "Content Protection",
      protectionText,
      "Detected DRM Systems or encryption methods.",
      "DASH: 5.8.4.1 / HLS: 4.3.2.4"
    )}
                </dl>
            </div>

            ${videoSets.length > 0 ? x` <div>
                      <h3 class="text-xl font-bold mb-4">Video Details</h3>
                      <dl
                          class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                      >
                          ${statCardTemplate(
      "Bitrate Range",
      bandwidths.length > 0 ? `${formatBitrate(Math.min(...bandwidths))} - ${formatBitrate(Math.max(...bandwidths))}` : "N/A",
      "The minimum and maximum bitrates for video.",
      "DASH: 5.3.5.2 / HLS: 4.3.4.2"
    )}
                          ${statCardTemplate(
      "Resolutions",
      resolutions.join(", "),
      "Unique video resolutions available.",
      "DASH: 5.3.7.2 / HLS: 4.3.4.2"
    )}
                          ${statCardTemplate(
      "Video Codecs",
      videoCodecs.join(", "),
      "Unique video codecs declared.",
      "DASH: 5.3.7.2 / HLS: 4.3.4.2"
    )}
                      </dl>
                  </div>` : ""}
            ${audioSets.length > 0 ? x` <div>
                      <h3 class="text-xl font-bold mb-4">Audio Details</h3>
                      <dl
                          class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                      >
                          ${statCardTemplate(
      "Languages",
      languages.join(", ") || "Not Specified",
      "Languages declared for audio tracks.",
      "DASH: 5.3.3.2 / HLS: 4.3.4.1"
    )}
                          ${statCardTemplate(
      "Audio Codecs",
      audioCodecs.join(", "),
      "Unique audio codecs declared.",
      "DASH: 5.3.7.2 / HLS: 4.3.4.2"
    )}
                      </dl>
                  </div>` : ""}
        </div>
    `;
  }

  // js/features/compliance/dash-rules.js
  var rules = [
    // --- MPD Level Rules ---
    {
      id: "MPD-1",
      text: "MPD root element must exist",
      isoRef: "Clause 5.3.1.2",
      severity: "fail",
      scope: "MPD",
      category: "Manifest Structure",
      check: (mpd) => !!mpd,
      passDetails: "OK",
      failDetails: "The document could not be parsed or does not contain an MPD root element."
    },
    {
      id: "MPD-2",
      text: "MPD@profiles is mandatory",
      isoRef: "Clause 5.3.1.2, Table 3",
      severity: "fail",
      scope: "MPD",
      category: "Manifest Structure",
      check: (mpd) => mpd.hasAttribute("profiles") && mpd.getAttribute("profiles") !== "",
      passDetails: "OK",
      failDetails: "The @profiles attribute is mandatory and must not be empty."
    },
    {
      id: "MPD-3",
      text: "MPD@minBufferTime is mandatory",
      isoRef: "Clause 5.3.1.2, Table 3",
      severity: "fail",
      scope: "MPD",
      category: "Manifest Structure",
      check: (mpd) => mpd.hasAttribute("minBufferTime"),
      passDetails: "OK",
      failDetails: "The @minBufferTime attribute is mandatory."
    },
    // --- Dynamic (Live) MPD Rules ---
    {
      id: "LIVE-1",
      text: "Dynamic MPD has @availabilityStartTime",
      isoRef: "Clause 5.3.1.2, Table 3",
      severity: "fail",
      scope: "MPD",
      category: "Live Stream Properties",
      check: (mpd, { isDynamic }) => isDynamic ? mpd.hasAttribute("availabilityStartTime") : "skip",
      passDetails: "OK",
      failDetails: "Required for dynamic MPDs."
    },
    {
      id: "LIVE-2",
      text: "Dynamic MPD has @publishTime",
      isoRef: "Clause 5.3.1.2, Table 3",
      severity: "fail",
      scope: "MPD",
      category: "Live Stream Properties",
      check: (mpd, { isDynamic }) => isDynamic ? mpd.hasAttribute("publishTime") : "skip",
      passDetails: "OK",
      failDetails: "Required for dynamic MPDs."
    },
    {
      id: "LIVE-3",
      text: "Dynamic MPD has @minimumUpdatePeriod",
      isoRef: "Clause 5.3.1.2, Table 3",
      severity: "warn",
      scope: "MPD",
      category: "Live Stream Properties",
      check: (mpd, { isDynamic }) => isDynamic ? mpd.hasAttribute("minimumUpdatePeriod") : "skip",
      passDetails: "OK",
      failDetails: "Recommended for dynamic MPDs to signal update frequency."
    },
    // --- Static (VOD) MPD Rules ---
    {
      id: "STATIC-1",
      text: "Static MPD has a defined duration",
      isoRef: "Clause 5.3.1.2, Table 3",
      severity: "fail",
      scope: "MPD",
      category: "Manifest Structure",
      check: (mpd, { isDynamic }) => {
        if (isDynamic) return "skip";
        const hasMpdDuration = mpd.hasAttribute(
          "mediaPresentationDuration"
        );
        const lastPeriod = mpd.querySelector("Period:last-of-type");
        const lastPeriodHasDuration = lastPeriod ? lastPeriod.hasAttribute("duration") : false;
        return hasMpdDuration || lastPeriodHasDuration;
      },
      passDetails: "OK",
      failDetails: "Static MPDs must have @mediaPresentationDuration or the last Period must have a @duration."
    },
    {
      id: "STATIC-2",
      text: "Static MPD does not have @minimumUpdatePeriod",
      isoRef: "Clause 5.3.1.2, Table 3",
      severity: "fail",
      scope: "MPD",
      category: "Manifest Structure",
      check: (mpd, { isDynamic }) => isDynamic ? "skip" : !mpd.hasAttribute("minimumUpdatePeriod"),
      passDetails: "OK",
      failDetails: "Should not be present for static MPDs."
    },
    {
      id: "STATIC-3",
      text: "Static MPD does not have @timeShiftBufferDepth",
      isoRef: "Clause 5.3.1.2, Table 3",
      severity: "fail",
      scope: "MPD",
      category: "Manifest Structure",
      check: (mpd, { isDynamic }) => isDynamic ? "skip" : !mpd.hasAttribute("timeShiftBufferDepth"),
      passDetails: "OK",
      failDetails: "Should not be present for static MPDs."
    },
    // --- Period Rules ---
    {
      id: "PERIOD-1",
      text: "Dynamic Period has @id",
      isoRef: "Clause 5.3.2.2, Table 4",
      severity: "fail",
      scope: "Period",
      category: "Live Stream Properties",
      check: (period, { isDynamic }) => isDynamic ? period.hasAttribute("id") : "skip",
      passDetails: "OK",
      failDetails: (period) => `Period (start="${period.getAttribute("start")}") requires an @id in dynamic manifests.`
    },
    {
      id: "PERIOD-2",
      text: "Period contains at least one AdaptationSet",
      isoRef: "Clause 5.3.2.2, Table 4",
      severity: "warn",
      scope: "Period",
      category: "Manifest Structure",
      check: (period) => {
        const duration = period.getAttribute("duration");
        return period.querySelectorAll("AdaptationSet").length > 0 || duration === "PT0S" || duration === "0";
      },
      passDetails: "OK",
      failDetails: "A Period should contain at least one AdaptationSet unless its duration is 0."
    },
    // --- AdaptationSet Rules ---
    {
      id: "AS-1",
      text: "AdaptationSet has @contentType or @mimeType",
      isoRef: "Clause 5.3.3.2, Table 5",
      severity: "warn",
      scope: "AdaptationSet",
      category: "General Best Practices",
      check: (as) => as.hasAttribute("contentType") || as.hasAttribute("mimeType"),
      passDetails: "OK",
      failDetails: "Recommended for clear track identification."
    },
    {
      id: "AS-2",
      text: "AdaptationSet with multiple Representations uses Segment Alignment",
      isoRef: "Clause 5.3.3.2, Table 5",
      severity: "warn",
      scope: "AdaptationSet",
      category: "General Best Practices",
      check: (as) => as.querySelectorAll("Representation").length > 1 ? as.getAttribute("segmentAlignment") === "true" : "skip",
      passDetails: "OK",
      failDetails: "Recommended for seamless ABR switching."
    },
    // --- Representation Rules ---
    {
      id: "REP-1",
      text: "Representation has mandatory @id",
      isoRef: "Clause 5.3.5.2, Table 9",
      severity: "fail",
      scope: "Representation",
      category: "Manifest Structure",
      check: (rep) => rep.hasAttribute("id"),
      passDetails: "OK",
      failDetails: "Representation @id is mandatory."
    },
    {
      id: "REP-2",
      text: "Representation has mandatory @bandwidth",
      isoRef: "Clause 5.3.5.2, Table 9",
      severity: "fail",
      scope: "Representation",
      category: "Manifest Structure",
      check: (rep) => rep.hasAttribute("bandwidth"),
      passDetails: "OK",
      failDetails: "Representation @bandwidth is mandatory."
    },
    {
      id: "REP-3",
      text: "Representation has an effective @mimeType",
      isoRef: "Clause 5.3.7.2, Table 14",
      severity: "fail",
      scope: "Representation",
      category: "Manifest Structure",
      check: (rep) => rep.hasAttribute("mimeType") || rep.closest("AdaptationSet").hasAttribute("mimeType"),
      passDetails: "OK",
      failDetails: "Representation @mimeType must be present on the Representation or inherited from the AdaptationSet."
    },
    {
      id: "REP-4",
      text: "Representation @dependencyId is valid",
      isoRef: "Clause 5.3.5.2, Table 9",
      severity: "warn",
      scope: "Representation",
      category: "Manifest Structure",
      check: (rep, { allRepIdsInPeriod }) => {
        const dependencyId = rep.getAttribute("dependencyId");
        if (!dependencyId) return "skip";
        return dependencyId.split(" ").every((id) => allRepIdsInPeriod.has(id));
      },
      passDetails: "OK",
      failDetails: (rep) => `One or more IDs in @dependencyId="${rep.getAttribute("dependencyId")}" do not exist in this Period.`
    },
    // --- Segment Info Rules ---
    {
      id: "SEGMENT-1",
      text: "Representation has exactly one segment information type",
      isoRef: "Clause 5.3.9.1",
      severity: "fail",
      scope: "Representation",
      category: "Segment & Timing Info",
      check: (rep) => {
        const elements = [
          rep.querySelector(":scope > SegmentBase"),
          rep.querySelector(":scope > SegmentList"),
          rep.querySelector(":scope > SegmentTemplate")
        ];
        return elements.filter(Boolean).length <= 1;
      },
      passDetails: "OK",
      failDetails: "A Representation can only contain one of SegmentBase, SegmentList, or SegmentTemplate directly."
    },
    {
      id: "SEGMENT-2",
      text: "SegmentTemplate with $Number$ has duration info",
      isoRef: "Clause 5.3.9.5.3",
      severity: "fail",
      scope: "Representation",
      category: "Segment & Timing Info",
      check: (rep) => {
        const template = rep.querySelector("SegmentTemplate") || rep.closest("AdaptationSet").querySelector("SegmentTemplate") || rep.closest("Period").querySelector("SegmentTemplate");
        if (!template || !template.getAttribute("media")?.includes("$Number$"))
          return "skip";
        return template.hasAttribute("duration") || !!template.querySelector("SegmentTimeline");
      },
      passDetails: "OK",
      failDetails: "When using $Number$, either @duration must be specified or a SegmentTimeline must be present."
    },
    {
      id: "SEGMENT-3",
      text: "SegmentTemplate with $Time$ has SegmentTimeline",
      isoRef: "Clause 5.3.9.4.4, Table 21",
      severity: "fail",
      scope: "Representation",
      category: "Segment & Timing Info",
      check: (rep) => {
        const template = rep.querySelector("SegmentTemplate") || rep.closest("AdaptationSet").querySelector("SegmentTemplate") || rep.closest("Period").querySelector("SegmentTemplate");
        if (!template || !template.getAttribute("media")?.includes("$Time$"))
          return "skip";
        return !!template.querySelector("SegmentTimeline");
      },
      passDetails: "OK",
      failDetails: "When using $Time$, a SegmentTimeline must be present."
    },
    // --- Profile: ISO BMFF On-Demand ---
    {
      id: "PROFILE-ONDEMAND-1",
      text: 'On-Demand profile requires MPD@type="static"',
      isoRef: "Clause 8.3.2",
      severity: "fail",
      scope: "MPD",
      category: "Profile Conformance",
      check: (mpd, { profiles }) => {
        if (!profiles.includes("urn:mpeg:dash:profile:isoff-on-demand:2011"))
          return "skip";
        return mpd.getAttribute("type") === "static";
      },
      passDetails: "OK",
      failDetails: (mpd) => `Profile requires 'static', but found '${mpd.getAttribute("type")}'`
    },
    // --- Profile: ISO BMFF Live ---
    {
      id: "PROFILE-LIVE-1",
      text: "Live profile requires SegmentTemplate",
      isoRef: "Clause 8.4.2",
      severity: "fail",
      scope: "Representation",
      category: "Profile Conformance",
      check: (rep, { profiles }) => {
        if (!profiles.includes("urn:mpeg:dash:profile:isoff-live:2011"))
          return "skip";
        return !!(rep.querySelector("SegmentTemplate") || rep.closest("AdaptationSet").querySelector("SegmentTemplate") || rep.closest("Period").querySelector("SegmentTemplate"));
      },
      passDetails: "OK",
      failDetails: "SegmentTemplate must be used in this profile."
    },
    // --- Profile: DASH-CMAF ---
    {
      id: "PROFILE-CMAF-1",
      text: "CMAF profile requires 'cmfc' or 'cmf2' brand",
      isoRef: "Clause 8.12.4.3",
      severity: "fail",
      scope: "AdaptationSet",
      category: "Profile Conformance",
      check: (as, { profiles }) => {
        if (!profiles.includes("urn:mpeg:dash:profile:cmaf:2019"))
          return "skip";
        const mimeType = as.getAttribute("mimeType");
        if (mimeType !== "video/mp4" && mimeType !== "audio/mp4")
          return "skip";
        const containerProfiles = as.getAttribute("containerProfiles") || "";
        return containerProfiles.includes("cmfc") || containerProfiles.includes("cmf2");
      },
      passDetails: "OK",
      failDetails: "AdaptationSet is missing a CMAF structural brand in @containerProfiles."
    }
  ];

  // js/features/compliance/logic.js
  function runChecks(manifest, protocol) {
    if (protocol === "hls") {
      return [
        {
          text: "HLS Compliance Checks",
          status: "info",
          details: "HLS compliance checks are not yet implemented.",
          isoRef: "N/A",
          category: "HLS"
        }
      ];
    }
    const mpd = (
      /** @type {Element} */
      manifest
    );
    const rules3 = rules;
    if (!mpd || typeof mpd.getAttribute !== "function") {
      const rootCheck = rules3.find((r2) => r2.id === "MPD-1");
      return [
        {
          text: rootCheck.text,
          status: rootCheck.severity,
          details: rootCheck.failDetails,
          isoRef: rootCheck.isoRef,
          category: rootCheck.category
        }
      ];
    }
    const results = [];
    const isDynamic = mpd.getAttribute("type") === "dynamic";
    const profiles = (mpd.getAttribute("profiles") || "").toLowerCase();
    const context = { isDynamic, profiles };
    const getDetails = (detail, element, detailContext) => {
      return typeof detail === "function" ? detail(element, detailContext) : detail;
    };
    rules3.filter((rule) => rule.scope === "MPD").forEach((rule) => {
      const result = rule.check(mpd, context);
      if (result !== "skip") {
        const status = result ? "pass" : rule.severity;
        results.push({
          text: rule.text,
          status,
          details: getDetails(
            result ? rule.passDetails : rule.failDetails,
            mpd,
            context
          ),
          isoRef: rule.isoRef,
          category: rule.category
        });
      }
    });
    mpd.querySelectorAll("Period").forEach((period) => {
      const allRepIdsInPeriod = new Set(
        Array.from(period.querySelectorAll("Representation")).map((r2) => r2.getAttribute("id")).filter(Boolean)
      );
      const periodContext = { ...context, allRepIdsInPeriod };
      rules3.filter((rule) => rule.scope === "Period").forEach((rule) => {
        const result = rule.check(period, periodContext);
        if (result !== "skip") {
          const status = result ? "pass" : rule.severity;
          results.push({
            text: `${rule.text} (Period: ${period.getAttribute("id") || "N/A"})`,
            status,
            details: getDetails(
              result ? rule.passDetails : rule.failDetails,
              period,
              periodContext
            ),
            isoRef: rule.isoRef,
            category: rule.category
          });
        }
      });
      period.querySelectorAll("AdaptationSet").forEach((as) => {
        rules3.filter((rule) => rule.scope === "AdaptationSet").forEach((rule) => {
          const result = rule.check(as, periodContext);
          if (result !== "skip") {
            const status = result ? "pass" : rule.severity;
            results.push({
              text: `${rule.text} (AdaptationSet: ${as.getAttribute("id") || "N/A"})`,
              status,
              details: getDetails(
                result ? rule.passDetails : rule.failDetails,
                as,
                periodContext
              ),
              isoRef: rule.isoRef,
              category: rule.category
            });
          }
        });
        as.querySelectorAll("Representation").forEach((rep) => {
          rules3.filter((rule) => rule.scope === "Representation").forEach((rule) => {
            const result = rule.check(rep, periodContext);
            if (result !== "skip") {
              const status = result ? "pass" : rule.severity;
              results.push({
                text: `${rule.text} (Representation: ${rep.getAttribute("id") || "N/A"})`,
                status,
                details: getDetails(
                  result ? rule.passDetails : rule.failDetails,
                  rep,
                  periodContext
                ),
                isoRef: rule.isoRef,
                category: rule.category
              });
            }
          });
        });
      });
    });
    return results;
  }

  // js/features/compliance/view.js
  var activeFilter = "all";
  function attachComplianceFilterListeners() {
    const container = document.getElementById("tab-compliance");
    container.addEventListener("click", (e4) => {
      const button = (
        /** @type {HTMLElement} */
        e4.target.closest(
          "[data-filter]"
        )
      );
      if (!button) return;
      activeFilter = /** @type {HTMLElement} */
      button.dataset.filter;
      const allRows = container.querySelectorAll(
        ".compliance-card"
      );
      allRows.forEach((row) => {
        row.style.display = activeFilter === "all" || row.classList.contains(`status-${activeFilter}`) ? "grid" : "none";
      });
      container.querySelectorAll("[data-filter]").forEach((btn) => {
        const isActive = (
          /** @type {HTMLElement} */
          btn.dataset.filter === activeFilter
        );
        btn.classList.toggle("bg-blue-600", isActive);
        btn.classList.toggle("text-white", isActive);
        btn.classList.toggle("font-semibold", isActive);
        btn.classList.toggle("bg-gray-700", !isActive);
        btn.classList.toggle("text-gray-300", !isActive);
      });
    });
  }
  var complianceRowTemplate = (item) => {
    const icons = {
      pass: { icon: "\u2714", color: "text-green-400", title: "Passed" },
      fail: { icon: "\u2716", color: "text-red-400", title: "Error" },
      warn: { icon: "\u26A0", color: "text-yellow-400", title: "Warning" },
      info: { icon: "\u2139", color: "text-blue-400", title: "Info" }
    };
    const status = icons[item.status] || {
      icon: "?",
      color: "text-gray-400",
      title: "Unknown"
    };
    return x`
        <div
            class="compliance-card bg-gray-800 p-3 rounded-lg border border-gray-700 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] md:items-center gap-x-4 gap-y-2 status-${item.status}"
            style="display: ${activeFilter === "all" || activeFilter === item.status ? "grid" : "none"}"
        >
            <div class="flex items-center gap-2 md:w-20">
                 <span
                    class="${status.color} font-bold text-lg"
                    title="${status.title}"
                    >${status.icon}</span
                >
                 <span class="md:hidden font-semibold text-gray-300">${item.text}</span>
            </div>
            <div class="pl-6 md:pl-0">
                <p class="hidden md:block font-semibold text-gray-200">${item.text}</p>
                <p class="text-xs text-gray-400 mt-1">${item.details}</p>
            </div>
            <div class="text-left md:text-right text-xs text-gray-500 font-mono pl-6 md:pl-0">
                ${item.isoRef}
            </div>
        </div>
    `;
  };
  var categoryTemplate = (category, items) => x`
    <div class="mt-8">
        <h4 class="text-lg font-semibold text-gray-300 mb-3">${category}</h4>
        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            ${items.map((item) => complianceRowTemplate(item))}
        </div>
    </div>
`;
  var renderReportForChecks = (checks) => {
    const counts = { pass: 0, warn: 0, fail: 0, info: 0 };
    checks.forEach(
      (check) => counts[check.status] = (counts[check.status] || 0) + 1
    );
    const groupedChecks = groupChecks(checks);
    const filterButton = (filter, label, count) => {
      const isActive = activeFilter === filter;
      return x`<button
            class="px-3 py-1 rounded-full text-xs transition-colors duration-200 ${isActive ? "bg-blue-600 text-white font-semibold" : "bg-gray-700 text-gray-300"}"
            data-filter="${filter}"
        >
            ${label} (${count})
        </button>`;
    };
    return x`
        <h3 class="text-xl font-bold mb-2">
            Compliance & Best Practices Report
        </h3>
        <p class="text-sm text-gray-400 mb-4">
            An analysis of the manifest against industry standards and common
            best practices.
        </p>

        <div
            class="flex items-center gap-4 mb-4 p-2 bg-gray-900/50 rounded-md sticky top-0 z-20 border-b border-gray-700"
        >
            <span class="text-sm font-semibold">Filter by Status:</span>
            ${filterButton("all", "All", checks.length)}
            ${filterButton("fail", "Errors", counts.fail)}
            ${filterButton("warn", "Warnings", counts.warn)}
            ${filterButton("pass", "Passed", counts.pass)}
            ${counts.info > 0 ? filterButton("info", "Info", counts.info) : ""}
        </div>

        ${Object.entries(groupedChecks).map(
      ([category, items]) => categoryTemplate(category, items)
    )}

    `;
  };
  function getComplianceReportTemplate(manifest, protocol) {
    if (!manifest) return x``;
    const checks = runChecks(manifest.rawElement, protocol);
    activeFilter = "all";
    return renderReportForChecks(checks);
  }
  function groupChecks(checks) {
    const groups = {};
    checks.forEach((check) => {
      const category = check.category || "General Best Practices";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(check);
    });
    return groups;
  }

  // js/features/timeline-visuals/view.js
  var hlsAbrLadderTemplate = (hlsManifest) => {
    const variants = hlsManifest.variants || [];
    if (variants.length === 0) return x``;
    const maxBw = Math.max(...variants.map((v2) => v2.attributes.BANDWIDTH));
    const repTemplate = variants.sort((a2, b2) => a2.attributes.BANDWIDTH - b2.attributes.BANDWIDTH).map((variant) => {
      const bw = variant.attributes.BANDWIDTH;
      const widthPercentage = bw / maxBw * 100;
      const resolutionText = variant.attributes.RESOLUTION || "Audio Only";
      const codecs = variant.attributes.CODECS || "N/A";
      return x`
            <div class="flex items-center" title="Codecs: ${codecs}">
                <div class="w-28 text-xs text-gray-400 font-mono flex-shrink-0">${resolutionText}</div>
                <div class="w-full bg-gray-700 rounded-full h-5">
                    <div class="bg-blue-600 h-5 rounded-full text-xs font-medium text-blue-100 text-center p-0.5 leading-none" style="width: ${widthPercentage}%">
                        ${(bw / 1e3).toFixed(0)} kbps
                    </div>
                </div>
            </div>`;
    });
    return x`
        <div class="mt-6">
            <h4 class="text-lg font-bold">ABR Bitrate Ladder</h4>
            <div class="bg-gray-900 p-4 rounded-md mt-4 space-y-2">
                ${repTemplate}
            </div>
        </div>`;
  };
  var hlsTimelineTemplate = (hlsManifest) => {
    const segments = hlsManifest.segments || [];
    const totalDuration = segments.reduce((acc, seg) => acc + seg.duration, 0);
    if (totalDuration === 0) return x`<p class="info">No segments found or total duration is zero.</p>`;
    const gridTemplateColumns = segments.map((s2) => `${s2.duration / totalDuration * 100}%`).join(" ");
    const timelineSegments = segments.map((seg) => {
      return x`
            <div class="bg-gray-700 rounded h-10 border-r-2 border-gray-900 last:border-r-0" title="Duration: ${seg.duration.toFixed(3)}s">
            </div>
        `;
    });
    return x`
        <h3 class="text-xl font-bold mb-4">Timeline Visualization</h3>
        <div class="bg-gray-900 rounded-lg p-2">
            <div class="grid grid-flow-col auto-cols-fr" style="grid-template-columns: ${gridTemplateColumns}">
                ${timelineSegments}
            </div>
        </div>
        <div class="text-xs text-gray-400 mt-2 text-right">
            Total Duration: ${totalDuration.toFixed(2)}s
        </div>
    `;
  };
  var parseDuration = (durationStr) => {
    if (!durationStr) return null;
    const match = durationStr.match(
      /PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/
    );
    if (!match) return null;
    const hours = parseFloat(match[1] || 0);
    const minutes = parseFloat(match[2] || 0);
    const seconds = parseFloat(match[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
  };
  var dashAbrLadderTemplate = (period) => {
    const videoSets = Array.from(
      period.querySelectorAll(
        'AdaptationSet[contentType="video"], AdaptationSet[mimeType^="video"]'
      )
    );
    if (videoSets.length === 0)
      return x`<p class="text-sm text-gray-500 mt-4">
            No video Adaptation Sets in this Period.
        </p>`;
    return videoSets.map((as) => {
      const reps = Array.from(as.querySelectorAll("Representation")).sort(
        (a2, b2) => parseInt(a2.getAttribute("bandwidth")) - parseInt(b2.getAttribute("bandwidth"))
      );
      if (reps.length === 0) return "";
      const maxBw = Math.max(
        ...reps.map((r2) => parseInt(r2.getAttribute("bandwidth")))
      );
      const repTemplate = reps.map((rep) => {
        const bw = parseInt(rep.getAttribute("bandwidth"));
        const widthPercentage = bw / maxBw * 100;
        const width = rep.getAttribute("width") || as.getAttribute("width");
        const height = rep.getAttribute("height") || as.getAttribute("height");
        const resolutionText = `${width || "N/A"}x${height || "N/A"}`;
        return x` <div class="flex items-center">
                <div class="w-28 text-xs text-gray-400 font-mono flex-shrink-0">
                    ${resolutionText}
                </div>
                <div class="w-full bg-gray-700 rounded-full h-5">
                    <div
                        class="bg-blue-600 h-5 rounded-full text-xs font-medium text-blue-100 text-center p-0.5 leading-none"
                        style="width: ${widthPercentage}%"
                    >
                        ${(bw / 1e3).toFixed(0)} kbps
                    </div>
                </div>
            </div>`;
      });
      return x` <div class="bg-gray-900 p-4 rounded-md mt-4">
            <p class="text-sm text-gray-400 mb-4">
                Video Adaptation Set: ${as.getAttribute("id") || "N/A"}
            </p>
            <div class="space-y-2">${repTemplate}</div>
        </div>`;
    });
  };
  var staticTimelineTemplate = (dashElement) => {
    const periods = Array.from(dashElement.querySelectorAll("Period"));
    if (periods.length === 0)
      return x`<p class="info">No Period elements found.</p>`;
    let lastPeriodEnd = 0;
    const periodData = periods.map((p2, i3) => {
      const startAttr = p2.getAttribute("start");
      const durationAttr = p2.getAttribute("duration");
      const start = startAttr ? parseDuration(startAttr) : lastPeriodEnd;
      let duration = durationAttr ? parseDuration(durationAttr) : null;
      if (duration !== null) {
        lastPeriodEnd = start + duration;
      } else if (i3 === periods.length - 1) {
        const mediaPresentationDuration = parseDuration(
          dashElement.getAttribute("mediaPresentationDuration")
        );
        if (mediaPresentationDuration) {
          duration = mediaPresentationDuration - start;
          lastPeriodEnd = mediaPresentationDuration;
        }
      }
      return {
        id: p2.getAttribute("id") || `(index ${i3 + 1})`,
        start,
        duration,
        element: p2
      };
    });
    const totalDuration = parseDuration(dashElement.getAttribute("mediaPresentationDuration")) || lastPeriodEnd;
    if (totalDuration === 0)
      return x`<div class="analysis-summary warn">
            Could not determine total duration.
        </div>`;
    const gridTemplateColumns = periodData.map((p2) => `${p2.duration / totalDuration * 100}%`).join(" ");
    const adaptationSetClasses = (contentType) => {
      let borderColor = "border-yellow-500";
      if (contentType === "video") borderColor = "border-indigo-400";
      if (contentType === "audio") borderColor = "border-green-400";
      return `bg-slate-800/50 rounded p-1 px-2 mb-1 text-xs whitespace-nowrap overflow-hidden text-ellipsis border-l-4 ${borderColor} cursor-help`;
    };
    const timelinePeriods = periodData.map((p2) => {
      const adaptationSets = Array.from(
        p2.element.querySelectorAll("AdaptationSet")
      );
      const adaptationSetTemplates = adaptationSets.map((as) => {
        const langText = as.getAttribute("lang") ? ` (${as.getAttribute("lang")})` : "";
        const contentType = as.getAttribute("contentType") || as.getAttribute("mimeType")?.split("/")[0] || "unknown";
        return x`<div
                class="${adaptationSetClasses(contentType)}"
                title="AdaptationSet ID: ${as.getAttribute("id") || "N/A"}"
            >
                ${contentType}${langText}
            </div>`;
      });
      return x` <div
            class="bg-gray-700 rounded p-2 overflow-hidden border-r-2 border-gray-900 last:border-r-0"
            title="Period ID: ${p2.id}"
        >
            <div
                class="font-semibold text-sm text-gray-300 mb-2 whitespace-nowrap"
            >
                Period ${p2.id}
            </div>
            <div class="space-y-1">${adaptationSetTemplates}</div>
        </div>`;
    });
    const abrLadders = periodData.map(
      (p2) => x` <div class="mt-6">
                <h4 class="text-lg font-bold">
                    ABR Bitrate Ladder for Period: ${p2.id}
                </h4>
                ${dashAbrLadderTemplate(p2.element)}
            </div>`
    );
    return x` <h3 class="text-xl font-bold mb-4">Timeline Visualization</h3>
        <div class="bg-gray-900 rounded-lg p-2">
            <div
                class="grid grid-flow-col auto-cols-fr min-h-[80px]"
                style="grid-template-columns: ${gridTemplateColumns}"
            >
                ${timelinePeriods}
            </div>
        </div>
        <div class="text-xs text-gray-400 mt-2 text-right">
            Total Duration: ${totalDuration.toFixed(2)}s
        </div>
        ${abrLadders}`;
  };
  var liveTimelineTemplate = (dashElement) => {
    const period = dashElement.querySelector("Period");
    if (!period) return x`<p class="info">No Period element found.</p>`;
    const timeShiftBufferDepth = parseDuration(
      dashElement.getAttribute("timeShiftBufferDepth")
    );
    if (!timeShiftBufferDepth)
      return x`<p class="info">No @timeShiftBufferDepth found.</p>`;
    const adaptationSetClasses = (contentType) => {
      let borderColor = "border-yellow-500";
      if (contentType === "video") borderColor = "border-indigo-400";
      if (contentType === "audio") borderColor = "border-green-400";
      return `bg-slate-800/50 rounded p-1 px-2 mb-1 text-xs whitespace-nowrap overflow-hidden text-ellipsis border-l-4 ${borderColor} cursor-help`;
    };
    const adaptationSets = Array.from(period.querySelectorAll("AdaptationSet"));
    const adaptationSetTemplates = adaptationSets.map((as) => {
      const langText = as.getAttribute("lang") ? ` (${as.getAttribute("lang")})` : "";
      const contentType = as.getAttribute("contentType") || as.getAttribute("mimeType")?.split("/")[0] || "unknown";
      return x`<div
            class="${adaptationSetClasses(contentType)}"
            title="AdaptationSet ID: ${as.getAttribute("id") || "N/A"}"
        >
            ${contentType}${langText}
        </div>`;
    });
    const abrLadders = x` <div class="mt-6">
        <h4 class="text-lg font-bold">
            ABR Bitrate Ladder for Period: ${period.getAttribute("id") || "0"}
        </h4>
        ${dashAbrLadderTemplate(period)}
    </div>`;
    const publishTime = new Date(dashElement.getAttribute("publishTime")).getTime();
    const availabilityStartTime = new Date(
      dashElement.getAttribute("availabilityStartTime")
    ).getTime();
    const liveEdge = (publishTime - availabilityStartTime) / 1e3;
    const dvrStart = liveEdge - timeShiftBufferDepth;
    return x` <h3 class="text-xl font-bold mb-4">
            Live Timeline Visualization
        </h3>
        <div
            class="bg-gray-900 rounded-lg p-2 relative"
            title="DVR Window: ${timeShiftBufferDepth.toFixed(2)}s"
        >
            <div class="grid min-h-[80px]">
                <div class="bg-gray-700 rounded p-2 overflow-hidden col-span-full">
                    <div
                        class="font-semibold text-sm text-gray-300 mb-2 whitespace-nowrap"
                    >
                        Available Media
                    </div>
                    <div class="space-y-1">${adaptationSetTemplates}</div>
                </div>
            </div>
            <div
                class="absolute right-2 top-0 bottom-0 w-1 bg-red-500 rounded-full"
                title="Live Edge"
            ></div>
        </div>
        <div class="text-xs text-gray-400 mt-2 flex justify-between">
            <span>Start of DVR Window (${dvrStart.toFixed(2)}s)</span>
            <span>Live Edge (${liveEdge.toFixed(2)}s)</span>
        </div>
        ${abrLadders}`;
  };
  function getTimelineAndVisualsTemplate(manifest, protocol) {
    if (!manifest) return x``;
    const rawElement = manifest.rawElement;
    if (protocol === "hls") {
      if (rawElement.isMaster) {
        return x`
                <h3 class="text-xl font-bold mb-4">HLS Master Playlist</h3>
                <p class="text-sm text-gray-400">A master playlist defines available variants but does not have a monolithic timeline.</p>
                ${hlsAbrLadderTemplate(rawElement)}
            `;
      }
      return x`
            ${hlsTimelineTemplate(rawElement)}
        `;
    }
    if (!rawElement || typeof rawElement.getAttribute !== "function") {
      return x`<p class="warn">Cannot display timeline for this manifest type.</p>`;
    }
    const isLive = rawElement.getAttribute("type") === "dynamic";
    const template = isLive ? liveTimelineTemplate(rawElement) : staticTimelineTemplate(rawElement);
    return x`${template}`;
  }

  // node_modules/lit-html/directive.js
  var t2 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
  var e2 = (t3) => (...e4) => ({ _$litDirective$: t3, values: e4 });
  var i2 = class {
    constructor(t3) {
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    _$AT(t3, e4, i3) {
      this._$Ct = t3, this._$AM = e4, this._$Ci = i3;
    }
    _$AS(t3, e4) {
      return this.update(t3, e4);
    }
    update(t3, e4) {
      return this.render(...e4);
    }
  };

  // node_modules/lit-html/directives/unsafe-html.js
  var e3 = class extends i2 {
    constructor(i3) {
      if (super(i3), this.it = E, i3.type !== t2.CHILD) throw Error(this.constructor.directiveName + "() can only be used in child bindings");
    }
    render(r2) {
      if (r2 === E || null == r2) return this._t = void 0, this.it = r2;
      if (r2 === T) return r2;
      if ("string" != typeof r2) throw Error(this.constructor.directiveName + "() called with a non-string value");
      if (r2 === this.it) return this._t;
      this.it = r2;
      const s2 = [r2];
      return s2.raw = s2, this._t = { _$litType$: this.constructor.resultType, strings: s2, values: [] };
    }
  };
  e3.directiveName = "unsafeHTML", e3.resultType = 1;
  var o2 = e2(e3);

  // js/features/feature-analysis/data.js
  var featureDefinitions = [
    {
      name: "Presentation Type",
      category: "Core Streaming",
      desc: "Defines if the stream is live (`dynamic`/`EVENT`) or on-demand (`static`/`VOD`).",
      isoRef: "DASH: 5.3.1.2 / HLS: 4.3.3.5"
    },
    {
      name: "Master Playlist (HLS)",
      category: "Core Streaming",
      desc: "The manifest is an HLS master playlist that references multiple variant streams at different bitrates.",
      isoRef: "HLS: 4.3.4.2"
    },
    {
      name: "Multi-Period (DASH) / Discontinuity (HLS)",
      category: "Core Streaming",
      desc: "The presentation is split into multiple, independent periods (DASH) or contains discontinuity tags (HLS). Commonly used for Server-Side Ad Insertion (SSAI).",
      isoRef: "DASH: 5.3.2 / HLS: 4.3.2.3"
    },
    {
      name: "Content Protection",
      category: "Core Streaming",
      desc: "Indicates that the content is encrypted using one or more schemes like CENC (DASH) or AES-128/SAMPLE-AES (HLS).",
      isoRef: "DASH: 5.8.4.1 / HLS: 4.3.2.4"
    },
    {
      name: "Fragmented MP4 Segments",
      category: "Core Streaming",
      desc: "Content is structured using fMP4 segments instead of MPEG-2 Transport Stream (TS). Indicated by #EXT-X-MAP in HLS.",
      isoRef: "HLS: 4.3.2.5"
    },
    {
      name: "Segment Templates (DASH)",
      category: "Timeline & Segment Management",
      desc: "Segment URLs are generated using a template, typically with $Number$ or $Time$ placeholders. (DASH-specific).",
      isoRef: "DASH: 5.3.9.4"
    },
    {
      name: "Segment Timeline (DASH)",
      category: "Timeline & Segment Management",
      desc: "Provides explicit timing and duration for each segment via <S> elements, allowing for variable segment sizes. (DASH-specific).",
      isoRef: "DASH: 5.3.9.6"
    },
    {
      name: "Segment List (DASH)",
      category: "Timeline & Segment Management",
      desc: "Segment URLs are listed explicitly in the manifest. Common for VOD content. (DASH-specific).",
      isoRef: "DASH: 5.3.9.3"
    },
    {
      name: "Low Latency Streaming",
      category: "Live & Dynamic",
      desc: "The manifest includes features for low-latency playback. HLS low-latency is a separate specification from the DASH features shown here.",
      isoRef: "DASH: Annex K.3.2"
    },
    {
      name: "Manifest Patch Updates (DASH)",
      category: "Live & Dynamic",
      desc: "Allows efficient manifest updates by sending only the changed parts of the manifest. (DASH-specific).",
      isoRef: "DASH: 5.15"
    },
    {
      name: "Date Ranges / Timed Metadata",
      category: "Live & Dynamic",
      desc: "The manifest includes timed metadata, such as HLS #EXT-X-DATERANGE, typically used for ad insertion signaling (SCTE-35).",
      isoRef: "HLS: 4.3.2.7"
    },
    {
      name: "UTC Timing Source (DASH)",
      category: "Live & Dynamic",
      desc: "Provides a source for clients to synchronize their wall-clock time, crucial for live playback. (DASH-specific).",
      isoRef: "DASH: 5.8.4.11"
    },
    {
      name: "Dependent Representations (DASH)",
      category: "Advanced Content",
      desc: "Uses Representations that depend on others for decoding, enabling scalable video coding (SVC) or multi-view coding (MVC). (DASH-specific).",
      isoRef: "DASH: 5.3.5.2"
    },
    {
      name: "I-Frame Playlists / Trick Modes",
      category: "Advanced Content",
      desc: "Provides special, I-Frame only playlists or tracks to enable efficient fast-forward and rewind.",
      isoRef: "DASH: 5.3.6 / HLS: 4.3.4.3"
    },
    {
      name: "Alternative Renditions / Roles",
      category: "Accessibility & Metadata",
      desc: "Uses #EXT-X-MEDIA (HLS) or Role Descriptors (DASH) to provide alternative tracks for language, commentary, or camera angles.",
      isoRef: "DASH: 5.8.4.2 / HLS: 4.3.4.1"
    },
    {
      name: "Subtitles & Captions",
      category: "Accessibility & Metadata",
      desc: "Provides text-based tracks for subtitles, closed captions, or other timed text information.",
      isoRef: "DASH: 5.3.3 / HLS: 4.3.4.1"
    }
  ];

  // js/shared/utils/drm.js
  var knownDrmSchemes = {
    "urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed": "Widevine",
    "urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95": "PlayReady",
    "urn:uuid:f239e769-efa3-4850-9c16-a903c6932efb": "Adobe PrimeTime",
    "urn:uuid:1077efec-c0b2-4d02-ace3-3c1e52e2fb4b": "ClearKey",
    "urn:uuid:94ce86fb-07ff-4f43-adb8-93d2fa968ca2": "FairPlay",
    "urn:mpeg:dash:mp4protection:2011": "MPEG Common Encryption (CENC)"
  };
  function getDrmSystemName(schemeIdUri) {
    if (!schemeIdUri) return "Unknown Scheme";
    const lowerCaseUri = schemeIdUri.toLowerCase();
    return knownDrmSchemes[lowerCaseUri] || `Unknown (${schemeIdUri})`;
  }

  // js/protocols/dash/feature-analyzer.js
  function analyzeDashFeatures(manifest) {
    const results = {};
    results["Presentation Type"] = {
      used: true,
      details: `<code>${manifest.getAttribute("type")}</code>`
    };
    const periods = manifest.querySelectorAll("Period");
    results["Multi-Period (DASH) / Discontinuity (HLS)"] = {
      used: periods.length > 1,
      details: periods.length > 1 ? `${periods.length} Periods found.` : "Single Period manifest."
    };
    const protection = Array.from(manifest.querySelectorAll("ContentProtection"));
    if (protection.length > 0) {
      const schemes = [...new Set(protection.map((cp) => getDrmSystemName(cp.getAttribute("schemeIdUri"))))];
      results["Content Protection"] = {
        used: true,
        details: `Systems: <b>${schemes.join(", ")}</b>`
      };
    } else {
      results["Content Protection"] = {
        used: false,
        details: "No encryption descriptors found."
      };
    }
    results["Segment Templates (DASH)"] = {
      used: !!manifest.querySelector("SegmentTemplate"),
      details: "Uses templates for segment URL generation."
    };
    results["Segment Timeline (DASH)"] = {
      used: !!manifest.querySelector("SegmentTimeline"),
      details: "Provides explicit segment timing via <code>&lt;S&gt;</code> elements."
    };
    results["Segment List (DASH)"] = {
      used: !!manifest.querySelector("SegmentList"),
      details: "Provides an explicit list of segment URLs."
    };
    if (manifest.getAttribute("type") === "dynamic") {
      const hasLatency = !!manifest.querySelector("ServiceDescription Latency");
      const hasChunkHint = !!manifest.querySelector('SegmentTemplate[availabilityTimeComplete="false"]');
      if (hasLatency || hasChunkHint) {
        const details = [];
        if (hasLatency) details.push("<code>&lt;Latency&gt;</code> target defined.");
        if (hasChunkHint) details.push("Chunked transfer hint present.");
        results["Low Latency Streaming"] = { used: true, details: details.join(" ") };
      } else {
        results["Low Latency Streaming"] = { used: false, details: "No specific low-latency signals found." };
      }
    } else {
      results["Low Latency Streaming"] = { used: false, details: "Not a dynamic (live) manifest." };
    }
    const patchLocation = manifest.querySelector("PatchLocation");
    results["Manifest Patch Updates (DASH)"] = {
      used: !!patchLocation,
      details: patchLocation ? `Patch location: <code>${patchLocation.textContent.trim()}</code>` : "Uses full manifest reloads."
    };
    const utcTimings = Array.from(manifest.querySelectorAll("UTCTiming"));
    if (utcTimings.length > 0) {
      const schemes = [...new Set(utcTimings.map((el) => `<code>${el.getAttribute("schemeIdUri").split(":").pop()}</code>`))];
      results["UTC Timing Source (DASH)"] = { used: true, details: `Schemes: ${schemes.join(", ")}` };
    } else {
      results["UTC Timing Source (DASH)"] = { used: false, details: "No clock synchronization source provided." };
    }
    const dependentReps = manifest.querySelectorAll("Representation[dependencyId]");
    results["Dependent Representations (DASH)"] = {
      used: dependentReps.length > 0,
      details: dependentReps.length > 0 ? `${dependentReps.length} dependent Representation(s) found.` : "All Representations are self-contained."
    };
    const subRep = manifest.querySelector("SubRepresentation[maxPlayoutRate]");
    const trickRole = manifest.querySelector('AdaptationSet Role[value="trick"]');
    if (subRep || trickRole) {
      const details = [];
      if (subRep) details.push("<code>&lt;SubRepresentation&gt;</code> with <code>@maxPlayoutRate</code>");
      if (trickRole) details.push('<code>Role="trick"</code>');
      results["I-Frame Playlists / Trick Modes"] = { used: true, details: `Detected via: ${details.join(", ")}` };
    } else {
      results["I-Frame Playlists / Trick Modes"] = { used: false, details: "No explicit trick mode signals found." };
    }
    const textTracks = Array.from(manifest.querySelectorAll('AdaptationSet[contentType="text"], AdaptationSet[mimeType^="application"]'));
    if (textTracks.length > 0) {
      const languages = [...new Set(textTracks.map((as) => as.getAttribute("lang")).filter(Boolean))];
      results["Subtitles & Captions"] = {
        used: true,
        details: `Found ${textTracks.length} track(s). ${languages.length > 0 ? `Languages: <b>${languages.join(", ")}</b>` : ""}`
      };
    } else {
      results["Subtitles & Captions"] = { used: false, details: "No text or application AdaptationSets found." };
    }
    const roles = Array.from(manifest.querySelectorAll("Role"));
    if (roles.length > 0) {
      const roleValues = [...new Set(roles.map((role) => `<code>${role.getAttribute("value")}</code>`))];
      results["Alternative Renditions / Roles"] = { used: true, details: `Roles found: ${roleValues.join(", ")}` };
    } else {
      results["Alternative Renditions / Roles"] = { used: false, details: "No roles specified." };
    }
    return results;
  }

  // js/protocols/hls/feature-analyzer.js
  function analyzeHlsFeatures(hlsParsed) {
    const results = {};
    results["Presentation Type"] = {
      used: true,
      details: hlsParsed.isLive ? "<code>EVENT</code> or Live" : "<code>VOD</code>"
    };
    results["Master Playlist (HLS)"] = {
      used: hlsParsed.isMaster,
      details: hlsParsed.isMaster ? `${hlsParsed.variants.length} Variant Streams found.` : "Media Playlist."
    };
    const hasDiscontinuity = hlsParsed.segments.some((s2) => s2.discontinuity);
    results["Multi-Period (DASH) / Discontinuity (HLS)"] = {
      used: hasDiscontinuity,
      details: hasDiscontinuity ? "Contains #EXT-X-DISCONTINUITY tags." : "No discontinuities found."
    };
    const hasKey = hlsParsed.segments.some((s2) => s2.key && s2.key.METHOD !== "NONE");
    if (hasKey) {
      const methods = [
        ...new Set(
          hlsParsed.segments.filter((s2) => s2.key).map((s2) => s2.key.METHOD)
        )
      ];
      results["Content Protection"] = {
        used: true,
        details: `Methods: <b>${methods.join(", ")}</b>`
      };
    } else {
      results["Content Protection"] = {
        used: false,
        details: "No #EXT-X-KEY tags found."
      };
    }
    const hasFmp4 = hlsParsed.tags.some((t3) => t3.name === "EXT-X-MAP");
    results["Fragmented MP4 Segments"] = {
      used: hasFmp4,
      details: hasFmp4 ? "Uses #EXT-X-MAP, indicating fMP4 segments." : "Likely Transport Stream (TS) segments."
    };
    results["I-Frame Playlists / Trick Modes"] = {
      used: hlsParsed.tags.some((t3) => t3.name === "EXT-X-I-FRAME-STREAM-INF"),
      details: "Provides dedicated playlists for trick-play modes."
    };
    results["Alternative Renditions / Roles"] = {
      used: hlsParsed.media.length > 0,
      details: hlsParsed.media.length > 0 ? `${hlsParsed.media.length} #EXT-X-MEDIA tags found.` : "No separate audio/video/subtitle renditions declared."
    };
    results["Date Ranges / Timed Metadata"] = {
      used: hlsParsed.tags.some((t3) => t3.name === "EXT-X-DATERANGE"),
      details: "Carries timed metadata, often used for ad insertion signaling."
    };
    const hasSubtitles = hlsParsed.media.some((m2) => m2.TYPE === "SUBTITLES");
    results["Subtitles & Captions"] = {
      used: hasSubtitles,
      details: hasSubtitles ? "Contains #EXT-X-MEDIA tags with TYPE=SUBTITLES." : "No subtitle renditions declared."
    };
    return results;
  }

  // js/features/feature-analysis/logic.js
  function generateFeatureAnalysis(manifest, protocol) {
    let analysisResults = {};
    if (protocol === "dash") {
      analysisResults = analyzeDashFeatures(
        /** @type {Element} */
        manifest.rawElement
      );
    } else {
      analysisResults = analyzeHlsFeatures(manifest.rawElement);
    }
    const viewModel = featureDefinitions.map((def) => {
      const result = analysisResults[def.name] || {
        used: false,
        details: "Check not applicable for this protocol."
      };
      return {
        ...def,
        ...result
      };
    });
    return viewModel;
  }

  // js/features/feature-analysis/view.js
  var featureCardTemplate = (feature) => {
    const badge = feature.used ? x`<span
              class="text-xs font-semibold px-2 py-1 bg-green-800 text-green-200 rounded-full"
              >Used</span
          >` : x`<span
              class="text-xs font-semibold px-2 py-1 bg-gray-600 text-gray-300 rounded-full"
              >Not Used</span
          >`;
    return x`
        <div
            class="grid grid-cols-[100px_1fr] items-center bg-gray-800 p-3 rounded-lg border border-gray-700"
        >
            <div class="text-center">${badge}</div>
            <div>
                <p
                    class="font-medium ${tooltipTriggerClasses}"
                    data-tooltip="${feature.desc}"
                    data-iso="${feature.isoRef}"
                >
                    ${feature.name}
                </p>
                <p
                    class="text-xs text-gray-400 italic mt-1 font-mono"
                >
                    ${o2(feature.details)}
                </p>
            </div>
        </div>
    `;
  };
  var categoryTemplate2 = (category, categoryFeatures) => x`
    <div class="mt-8">
        <h4 class="text-lg font-semibold text-gray-300 mb-3">${category}</h4>
        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            ${categoryFeatures.map(
    (feature) => featureCardTemplate(feature)
  )}
        </div>
    </div>
`;
  function getFeaturesAnalysisTemplate(manifest, protocol) {
    if (!manifest) return x`<p class="warn">No manifest loaded to display.</p>`;
    const viewModel = generateFeatureAnalysis(manifest, protocol);
    const groupedFeatures = viewModel.reduce((acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = [];
      }
      acc[feature.category].push(feature);
      return acc;
    }, {});
    return x`
        <h3 class="text-xl font-bold mb-2">Feature Usage Analysis</h3>
        <p class="text-sm text-gray-400 mb-4">
            A breakdown of key features detected in the manifest and their
            implementation details.
        </p>
        ${Object.entries(groupedFeatures).map(
      ([category, features]) => categoryTemplate2(category, features)
    )}
    `;
  }

  // js/features/interactive-manifest/tooltip-data.js
  var dashTooltipData = {
    // MPD Level
    MPD: {
      text: "The root element of the Media Presentation Description.",
      isoRef: "Clause 5.3.1.2"
    },
    "MPD@profiles": {
      text: "A comma-separated list of profiles the MPD conforms to. Essential for client compatibility.",
      isoRef: "Clause 8.1"
    },
    "MPD@type": {
      text: "Indicates if the presentation is static (VOD) or dynamic (live).",
      isoRef: "Clause 5.3.1.2, Table 3"
    },
    "MPD@minBufferTime": {
      text: "The minimum buffer time a client should maintain to ensure smooth playback.",
      isoRef: "Clause 5.3.1.2, Table 3"
    },
    "MPD@mediaPresentationDuration": {
      text: "The total duration of the on-demand content.",
      isoRef: "Clause 5.3.1.2, Table 3"
    },
    "MPD@availabilityStartTime": {
      text: "The anchor time for a dynamic presentation, defining the point from which all media times are calculated.",
      isoRef: "Clause 5.3.1.2, Table 3"
    },
    "MPD@publishTime": {
      text: "The time this version of the MPD was generated on the server.",
      isoRef: "Clause 5.3.1.2, Table 3"
    },
    "MPD@minimumUpdatePeriod": {
      text: "For dynamic MPDs, the minimum time a client should wait before requesting an updated MPD.",
      isoRef: "Clause 5.3.1.2, Table 3"
    },
    "MPD@timeShiftBufferDepth": {
      text: "The duration of the seekable live window (DVR) available to the client.",
      isoRef: "Clause 5.3.1.2, Table 3"
    },
    "MPD@suggestedPresentationDelay": {
      text: "A suggested delay from the live edge for players to begin presentation, helping to synchronize clients.",
      isoRef: "Clause 5.3.1.2, Table 3"
    },
    // Period Level
    Period: {
      text: "A Period represents a continuous segment of content. Multiple Periods can be used for things like ad insertion.",
      isoRef: "Clause 5.3.2"
    },
    "Period@id": {
      text: "A unique identifier for the Period. Mandatory for dynamic MPDs.",
      isoRef: "Clause 5.3.2.2, Table 4"
    },
    "Period@start": {
      text: "The start time of the Period on the Media Presentation Timeline.",
      isoRef: "Clause 5.3.2.2, Table 4"
    },
    "Period@duration": {
      text: "The duration of the Period.",
      isoRef: "Clause 5.3.2.2, Table 4"
    },
    // AdaptationSet Level
    AdaptationSet: {
      text: "A set of interchangeable encoded versions of one or several media components (e.g., all video bitrates, or all audio languages).",
      isoRef: "Clause 5.3.3"
    },
    "AdaptationSet@id": {
      text: "A unique identifier for the AdaptationSet within the Period.",
      isoRef: "Clause 5.3.3.2, Table 5"
    },
    "AdaptationSet@contentType": {
      text: 'Specifies the media content type (e.g., "video", "audio").',
      isoRef: "Clause 5.3.3.2, Table 5"
    },
    "AdaptationSet@mimeType": {
      text: "The MIME type for all Representations in this set.",
      isoRef: "Clause 5.3.7.2, Table 14"
    },
    "AdaptationSet@lang": {
      text: 'Specifies the language of the content, using RFC 5646 codes (e.g., "en", "es").',
      isoRef: "Clause 5.3.3.2, Table 5"
    },
    "AdaptationSet@segmentAlignment": {
      text: "If true, indicates that segments are aligned across Representations, simplifying seamless switching.",
      isoRef: "Clause 5.3.3.2, Table 5"
    },
    "AdaptationSet@maxWidth": {
      text: "The maximum width of any video Representation in this set.",
      isoRef: "Clause 5.3.3.2, Table 5"
    },
    "AdaptationSet@maxHeight": {
      text: "The maximum height of any video Representation in this set.",
      isoRef: "Clause 5.3.3.2, Table 5"
    },
    "AdaptationSet@par": {
      text: 'The picture aspect ratio for the video content (e.g., "16:9").',
      isoRef: "Clause 5.3.3.2, Table 5"
    },
    // Representation Level
    Representation: {
      text: "A specific, deliverable encoded version of media content (e.g., video at a particular bitrate and resolution).",
      isoRef: "Clause 5.3.5"
    },
    "Representation@id": {
      text: "A unique identifier for the Representation within the Period.",
      isoRef: "Clause 5.3.5.2, Table 9"
    },
    "Representation@bandwidth": {
      text: "The required bandwidth in bits per second to stream this Representation.",
      isoRef: "Clause 5.3.5.2, Table 9"
    },
    "Representation@codecs": {
      text: "A string identifying the codec(s) used, as per RFC 6381.",
      isoRef: "Clause 5.3.7.2, Table 14"
    },
    "Representation@width": {
      text: "The width of the video in this Representation.",
      isoRef: "Clause 5.3.7.2, Table 14"
    },
    "Representation@height": {
      text: "The height of the video in this Representation.",
      isoRef: "Clause 5.3.7.2, Table 14"
    },
    "Representation@frameRate": {
      text: "The frame rate of the video.",
      isoRef: "Clause 5.3.7.2, Table 14"
    },
    "Representation@sar": {
      text: "The Sample Aspect Ratio of the video.",
      isoRef: "Clause 5.3.7.2, Table 14"
    },
    "Representation@audioSamplingRate": {
      text: "The sampling rate of the audio in samples per second.",
      isoRef: "Clause 5.3.7.2, Table 14"
    },
    // Segment Info Level
    SegmentTemplate: {
      text: "Defines a template for generating Segment URLs.",
      isoRef: "Clause 5.3.9.4"
    },
    "SegmentTemplate@timescale": {
      text: "The number of time units that pass in one second. Used for calculating segment durations and start times.",
      isoRef: "Clause 5.3.9.2.2, Table 16"
    },
    "SegmentTemplate@initialization": {
      text: "A template for the URL of the Initialization Segment.",
      isoRef: "Clause 5.3.9.4.2, Table 20"
    },
    "SegmentTemplate@media": {
      text: "A template for the URLs of the Media Segments. Often contains $Time$ or $Number$.",
      isoRef: "Clause 5.3.9.4.2, Table 20"
    },
    SegmentTimeline: {
      text: "Provides an explicit timeline for media segments, allowing for variable durations.",
      isoRef: "Clause 5.3.9.6"
    },
    S: {
      text: "A Segment Timeline entry. Defines a series of one or more contiguous segments.",
      isoRef: "Clause 5.3.9.6.2"
    },
    "S@t": {
      text: "The start time of the first segment in this series, in units of the @timescale.",
      isoRef: "Clause 5.3.9.6.2, Table 22"
    },
    "S@d": {
      text: "The duration of each segment in this series, in units of the @timescale.",
      isoRef: "Clause 5.3.9.6.2, Table 22"
    },
    "S@r": {
      text: 'The repeat count. A value of "N" means there are N+1 segments in this series.',
      isoRef: "Clause 5.3.9.6.2, Table 22"
    },
    // Descriptors
    ContentProtection: {
      text: "Contains information about a DRM or encryption scheme used to protect the content.",
      isoRef: "Clause 5.8.4.1"
    },
    "ContentProtection@schemeIdUri": {
      text: "A URI that uniquely identifies the content protection scheme (e.g., the UUID for Widevine or PlayReady).",
      isoRef: "Clause 5.8.2, Table 32"
    },
    "ContentProtection@value": {
      text: "An optional string providing additional scheme-specific information.",
      isoRef: "Clause 5.8.2, Table 32"
    },
    AudioChannelConfiguration: {
      text: "Specifies the audio channel layout (e.g., stereo, 5.1 surround).",
      isoRef: "Clause 5.8.4.7"
    },
    Role: {
      text: 'Describes the role or purpose of an AdaptationSet (e.g., "main", "alternate", "commentary").',
      isoRef: "Clause 5.8.4.2"
    },
    "Role@schemeIdUri": {
      text: "Identifies the scheme used for the Role descriptor.",
      isoRef: "Clause 5.8.2, Table 32"
    },
    "Role@value": {
      text: "The specific role value within the defined scheme.",
      isoRef: "Clause 5.8.2, Table 32"
    }
  };

  // js/features/interactive-manifest/hls-tooltip-data.js
  var hlsTooltipData = {
    // --- Basic Tags ---
    EXTM3U: {
      text: "Indicates that the file is an Extended M3U Playlist file. It MUST be the first line of every Media Playlist and every Master Playlist.",
      isoRef: "RFC 8216, Section 4.3.1.1"
    },
    "EXT-X-VERSION": {
      text: "Indicates the compatibility version of the Playlist file. It applies to the entire Playlist file.",
      isoRef: "RFC 8216, Section 4.3.1.2"
    },
    // --- Media Segment Tags ---
    EXTINF: {
      text: "Specifies the duration of a Media Segment in seconds. It applies only to the Media Segment that follows it.",
      isoRef: "RFC 8216, Section 4.3.2.1"
    },
    "EXT-X-BYTERANGE": {
      text: "Indicates that a Media Segment is a sub-range of the resource identified by its URI.",
      isoRef: "RFC 8216, Section 4.3.2.2"
    },
    "EXT-X-DISCONTINUITY": {
      text: "Indicates a discontinuity between the Media Segment that follows it and the one that preceded it (e.g., format or timestamp change).",
      isoRef: "RFC 8216, Section 4.3.2.3"
    },
    "EXT-X-KEY": {
      text: "Specifies how to decrypt Media Segments. It applies to every Media Segment that appears after it until the next EXT-X-KEY tag.",
      isoRef: "RFC 8216, Section 4.3.2.4"
    },
    "EXT-X-KEY@METHOD": { text: "The encryption method. Valid values are NONE, AES-128, and SAMPLE-AES.", isoRef: "RFC 8216, Section 4.3.2.4" },
    "EXT-X-KEY@URI": { text: "The URI that specifies how to obtain the encryption key.", isoRef: "RFC 8216, Section 4.3.2.4" },
    "EXT-X-KEY@IV": { text: "A hexadecimal-sequence that specifies a 128-bit unsigned integer Initialization Vector.", isoRef: "RFC 8216, Section 4.3.2.4" },
    "EXT-X-KEY@KEYFORMAT": { text: "Specifies how the key is represented in the resource identified by the URI.", isoRef: "RFC 8216, Section 4.3.2.4" },
    "EXT-X-KEY@KEYFORMATVERSIONS": { text: "Indicates which version(s) of a KEYFORMAT this instance complies with.", isoRef: "RFC 8216, Section 4.3.2.4" },
    "EXT-X-MAP": {
      text: "Specifies how to obtain the Media Initialization Section required to parse the applicable Media Segments.",
      isoRef: "RFC 8216, Section 4.3.2.5"
    },
    "EXT-X-MAP@URI": { text: "The URI that identifies a resource containing the Media Initialization Section.", isoRef: "RFC 8216, Section 4.3.2.5" },
    "EXT-X-MAP@BYTERANGE": { text: "A byte range into the resource identified by the URI.", isoRef: "RFC 8216, Section 4.3.2.5" },
    "EXT-X-PROGRAM-DATE-TIME": {
      text: "Associates the first sample of a Media Segment with an absolute date and/or time.",
      isoRef: "RFC 8216, Section 4.3.2.6"
    },
    "EXT-X-DATERANGE": {
      text: "Associates a Date Range with a set of attribute/value pairs, often for carrying SCTE-35 ad signaling.",
      isoRef: "RFC 8216, Section 4.3.2.7"
    },
    // --- Media Playlist Tags ---
    "EXT-X-TARGETDURATION": {
      text: "Specifies the maximum Media Segment duration in seconds. This tag is REQUIRED for all Media Playlists.",
      isoRef: "RFC 8216, Section 4.3.3.1"
    },
    "EXT-X-MEDIA-SEQUENCE": {
      text: "Indicates the Media Sequence Number of the first Media Segment that appears in a Playlist file.",
      isoRef: "RFC 8216, Section 4.3.3.2"
    },
    "EXT-X-DISCONTINUITY-SEQUENCE": {
      text: "Allows synchronization between different Renditions of the same Variant Stream.",
      isoRef: "RFC 8216, Section 4.3.3.3"
    },
    "EXT-X-ENDLIST": {
      text: "Indicates that no more Media Segments will be added to the Media Playlist file.",
      isoRef: "RFC 8216, Section 4.3.3.4"
    },
    "EXT-X-PLAYLIST-TYPE": {
      text: "Provides mutability information about the Media Playlist file. Can be EVENT or VOD.",
      isoRef: "RFC 8216, Section 4.3.3.5"
    },
    "EXT-X-I-FRAMES-ONLY": {
      text: "Indicates that each Media Segment in the Playlist describes a single I-frame.",
      isoRef: "RFC 8216, Section 4.3.3.6"
    },
    // --- Master Playlist Tags ---
    "EXT-X-MEDIA": {
      text: "Used to relate Media Playlists that contain alternative Renditions (e.g., audio, video, subtitles) of the same content.",
      isoRef: "RFC 8216, Section 4.3.4.1"
    },
    "EXT-X-MEDIA@TYPE": { text: "The type of the rendition. Valid strings are AUDIO, VIDEO, SUBTITLES, and CLOSED-CAPTIONS.", isoRef: "RFC 8216, Section 4.3.4.1" },
    "EXT-X-MEDIA@URI": { text: "A URI that identifies the Media Playlist file of the rendition.", isoRef: "RFC 8216, Section 4.3.4.1" },
    "EXT-X-MEDIA@GROUP-ID": { text: "A string that specifies the group to which the Rendition belongs.", isoRef: "RFC 8216, Section 4.3.4.1" },
    "EXT-X-MEDIA@LANGUAGE": { text: "Identifies the primary language used in the Rendition.", isoRef: "RFC 8216, Section 4.3.4.1" },
    "EXT-X-MEDIA@NAME": { text: "A human-readable description of the Rendition.", isoRef: "RFC 8216, Section 4.3.4.1" },
    "EXT-X-MEDIA@DEFAULT": { text: "If YES, the client SHOULD play this Rendition in the absence of other choices.", isoRef: "RFC 8216, Section 4.3.4.1" },
    "EXT-X-MEDIA@AUTOSELECT": { text: "If YES, the client MAY choose this Rendition due to matching the current playback environment.", isoRef: "RFC 8216, Section 4.3.4.1" },
    "EXT-X-MEDIA@CHANNELS": { text: "Specifies the number of independent audio channels.", isoRef: "RFC 8216, Section 4.3.4.1" },
    "EXT-X-STREAM-INF": {
      text: "Specifies a Variant Stream. The URI of the Media Playlist follows on the next line.",
      isoRef: "RFC 8216, Section 4.3.4.2"
    },
    "EXT-X-STREAM-INF@BANDWIDTH": { text: "The peak segment bit rate of the Variant Stream in bits per second.", isoRef: "RFC 8216, Section 4.3.4.2" },
    "EXT-X-STREAM-INF@AVERAGE-BANDWIDTH": { text: "The average segment bit rate of the Variant Stream in bits per second.", isoRef: "RFC 8216, Section 4.3.4.2" },
    "EXT-X-STREAM-INF@CODECS": { text: "A comma-separated list of formats specifying media sample types present in the Variant Stream.", isoRef: "RFC 8216, Section 4.3.4.2" },
    "EXT-X-STREAM-INF@RESOLUTION": { text: "The optimal pixel resolution at which to display all video in the Variant Stream.", isoRef: "RFC 8216, Section 4.3.4.2" },
    "EXT-X-STREAM-INF@FRAME-RATE": { text: "The maximum frame rate for all video in the Variant Stream.", isoRef: "RFC 8216, Section 4.3.4.2" },
    "EXT-X-STREAM-INF@AUDIO": { text: "The GROUP-ID of the audio renditions that should be used with this variant.", isoRef: "RFC 8216, Section 4.3.4.2" },
    "EXT-X-STREAM-INF@VIDEO": { text: "The GROUP-ID of the video renditions that should be used with this variant.", isoRef: "RFC 8216, Section 4.3.4.2" },
    "EXT-X-STREAM-INF@SUBTITLES": { text: "The GROUP-ID of the subtitle renditions that can be used with this variant.", isoRef: "RFC 8216, Section 4.3.4.2" },
    "EXT-X-I-FRAME-STREAM-INF": {
      text: "Identifies a Media Playlist file containing the I-frames of a multimedia presentation, for use in trick-play modes.",
      isoRef: "RFC 8216, Section 4.3.4.3"
    },
    "EXT-X-SESSION-DATA": {
      text: "Allows arbitrary session data to be carried in a Master Playlist.",
      isoRef: "RFC 8216, Section 4.3.4.4"
    },
    "EXT-X-SESSION-KEY": {
      text: "Allows encryption keys from Media Playlists to be specified in a Master Playlist, enabling key preloading.",
      isoRef: "RFC 8216, Section 4.3.4.5"
    },
    // --- Media or Master Playlist Tags ---
    "EXT-X-INDEPENDENT-SEGMENTS": {
      text: "Indicates that all media samples in a Media Segment can be decoded without information from other segments.",
      isoRef: "RFC 8216, Section 4.3.5.1"
    },
    "EXT-X-START": {
      text: "Indicates a preferred point at which to start playing a Playlist.",
      isoRef: "RFC 8216, Section 4.3.5.2"
    },
    "EXT-X-START@TIME-OFFSET": { text: "A time offset in seconds from the beginning of the Playlist (positive) or from the end (negative).", isoRef: "RFC 8216, Section 4.3.5.2" },
    "EXT-X-START@PRECISE": { text: "Whether clients should start playback precisely at the TIME-OFFSET (YES) or at the beginning of the segment (NO).", isoRef: "RFC 8216, Section 4.3.5.2" }
  };

  // js/protocols/hls/adapter.js
  function adaptHlsToIr(hlsParsed) {
    const manifestIR = {
      type: hlsParsed.isLive ? "dynamic" : "static",
      profiles: `HLS v${hlsParsed.version}`,
      minBufferTime: hlsParsed.targetDuration || 0,
      publishTime: null,
      availabilityStartTime: null,
      timeShiftBufferDepth: null,
      minimumUpdatePeriod: hlsParsed.isLive ? hlsParsed.targetDuration : null,
      duration: hlsParsed.segments.reduce((sum, seg) => sum + seg.duration, 0),
      periods: [],
      rawElement: hlsParsed
    };
    const periodIR = {
      id: "hls-period-0",
      start: 0,
      duration: manifestIR.duration,
      adaptationSets: []
    };
    if (hlsParsed.isMaster) {
      const mediaGroups = hlsParsed.media.reduce((acc, media) => {
        const groupId = media["GROUP-ID"];
        if (!acc[groupId]) {
          acc[groupId] = [];
        }
        acc[groupId].push(media);
        return acc;
      }, {});
      hlsParsed.variants.forEach((variant, index) => {
        const resolution = variant.attributes.RESOLUTION;
        const asIR = {
          id: `variant-${index}`,
          contentType: resolution ? "video" : "audio",
          lang: null,
          mimeType: resolution ? "video/mp2t" : "audio/mp2t",
          representations: [],
          contentProtection: []
          // Master playlists can have session keys
        };
        const repIR = {
          id: `variant-${index}-rep-0`,
          codecs: variant.attributes.CODECS,
          bandwidth: variant.attributes.BANDWIDTH,
          width: resolution ? parseInt(String(resolution).split("x")[0], 10) : null,
          height: resolution ? parseInt(String(resolution).split("x")[1], 10) : null
        };
        asIR.representations.push(repIR);
        periodIR.adaptationSets.push(asIR);
        const audioGroupId = variant.attributes.AUDIO;
        if (audioGroupId && mediaGroups[audioGroupId]) {
          mediaGroups[audioGroupId].forEach((media, mediaIndex) => {
            periodIR.adaptationSets.push({
              id: `audio-rendition-${audioGroupId}-${mediaIndex}`,
              contentType: "audio",
              lang: media.LANGUAGE,
              mimeType: "audio/mp2t",
              representations: [],
              // In IR, these are just AS-level properties
              contentProtection: []
            });
          });
        }
      });
    } else {
      const asIR = {
        id: "media-0",
        contentType: "unknown",
        // Cannot be determined from media playlist alone
        lang: null,
        mimeType: "video/mp2t",
        representations: [
          { id: "media-0-rep-0", codecs: null, bandwidth: 0, width: null, height: null }
        ],
        contentProtection: []
      };
      const keyTag = hlsParsed.segments.find((s2) => s2.key)?.key;
      if (keyTag && keyTag.METHOD !== "NONE") {
        asIR.contentProtection.push({
          schemeIdUri: keyTag.KEYFORMAT || "identity",
          system: keyTag.METHOD
        });
      }
      periodIR.adaptationSets.push(asIR);
    }
    manifestIR.periods.push(periodIR);
    return manifestIR;
  }

  // js/protocols/hls/parser.js
  function parseAttributeList(attrString) {
    const attributes = {};
    const parts = attrString.match(/("[^"]*")|[^,]+/g) || [];
    parts.forEach((part) => {
      const eqIndex = part.indexOf("=");
      if (eqIndex === -1) return;
      const key = part.substring(0, eqIndex);
      const value = part.substring(eqIndex + 1).replace(/"/g, "");
      const numValue = /^-?\d+(\.\d+)?$/.test(value) ? parseFloat(value) : value;
      attributes[key] = numValue;
    });
    return attributes;
  }
  async function parseManifest(manifestString, baseUrl) {
    const lines = manifestString.split(/\r?\n/);
    if (!lines[0] || lines[0].trim() !== "#EXTM3U") {
      throw new Error("Invalid HLS playlist. Must start with #EXTM3U.");
    }
    const parsed = {
      isMaster: false,
      version: 1,
      tags: [],
      segments: [],
      variants: [],
      media: [],
      raw: manifestString,
      baseUrl
    };
    let currentSegment = null;
    let currentKey = null;
    for (let i3 = 1; i3 < lines.length; i3++) {
      const line = lines[i3].trim();
      if (!line) continue;
      if (line.startsWith("#EXT")) {
        const separatorIndex = line.indexOf(":");
        let tagName, tagValue;
        if (separatorIndex === -1) {
          tagName = line.substring(1);
          tagValue = null;
        } else {
          tagName = line.substring(1, separatorIndex);
          tagValue = line.substring(separatorIndex + 1);
        }
        switch (tagName) {
          // Master Playlist Tags
          case "EXT-X-STREAM-INF":
            parsed.isMaster = true;
            const attributes = parseAttributeList(tagValue);
            const uri = lines[++i3].trim();
            parsed.variants.push({
              attributes,
              uri,
              resolvedUri: new URL(uri, baseUrl).href
            });
            break;
          case "EXT-X-MEDIA":
            parsed.isMaster = true;
            parsed.media.push(parseAttributeList(tagValue));
            break;
          case "EXT-X-I-FRAME-STREAM-INF":
            parsed.isMaster = true;
            parsed.tags.push({ name: tagName, value: tagValue });
            break;
          // Media Playlist Tags
          case "EXTINF":
            const [duration, title] = tagValue.split(",");
            currentSegment = {
              duration: parseFloat(duration),
              title: title || "",
              tags: [],
              key: currentKey
            };
            break;
          case "EXT-X-BYTERANGE":
            if (currentSegment) currentSegment.byteRange = tagValue;
            break;
          case "EXT-X-DISCONTINUITY":
            if (currentSegment) currentSegment.discontinuity = true;
            break;
          case "EXT-X-KEY":
            currentKey = parseAttributeList(tagValue);
            break;
          case "EXT-X-MAP":
            parsed.map = parseAttributeList(tagValue);
            break;
          case "EXT-X-PROGRAM-DATE-TIME":
            if (currentSegment) currentSegment.dateTime = tagValue;
            break;
          case "EXT-X-TARGETDURATION":
            parsed.targetDuration = parseInt(tagValue, 10);
            break;
          case "EXT-X-MEDIA-SEQUENCE":
            parsed.mediaSequence = parseInt(tagValue, 10);
            break;
          case "EXT-X-PLAYLIST-TYPE":
            parsed.playlistType = tagValue;
            break;
          case "EXT-X-ENDLIST":
            parsed.isLive = false;
            break;
          // Common Tags
          case "EXT-X-VERSION":
            parsed.version = parseInt(tagValue, 10);
            break;
          // Default for other tags
          default:
            if (currentSegment) {
              currentSegment.tags.push({ name: tagName, value: tagValue });
            } else {
              parsed.tags.push({ name: tagName, value: tagValue });
            }
            break;
        }
      } else if (!line.startsWith("#")) {
        if (currentSegment) {
          currentSegment.uri = line;
          currentSegment.resolvedUri = new URL(line, baseUrl).href;
          parsed.segments.push(currentSegment);
          currentSegment = null;
        }
      }
    }
    if (!parsed.isMaster && typeof parsed.isLive === "undefined") {
      parsed.isLive = true;
    }
    const manifest = adaptHlsToIr(parsed);
    return { manifest, baseUrl };
  }

  // js/features/interactive-manifest/view.js
  var escapeHtml = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  async function fetchAndActivateMediaPlaylist(stream, url) {
    showStatus(`Fetching HLS media playlist: ${url}`, "info");
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const manifestString = await response.text();
      const { manifest } = await parseManifest(manifestString, url);
      stream.mediaPlaylists.set(url, {
        manifest,
        rawManifest: manifestString,
        lastFetched: /* @__PURE__ */ new Date()
      });
      stream.activeMediaPlaylistUrl = url;
      stream.manifest = manifest;
      stream.rawManifest = manifestString;
      renderSingleStreamTabs(stream.id);
      showStatus("Media playlist loaded.", "pass");
    } catch (e4) {
      console.error("Failed to fetch or parse media playlist:", e4);
      showStatus(`Failed to load media playlist: ${e4.message}`, "fail");
    }
  }
  var hlsSubNavTemplate = (stream) => {
    const masterPlaylist = stream.mediaPlaylists.get("master");
    if (!masterPlaylist) return x``;
    const variants = masterPlaylist.manifest.rawElement.variants || [];
    const handleNavClick = (e4) => {
      const url = e4.target.dataset.url;
      if (url === "master") {
        const master = stream.mediaPlaylists.get("master");
        stream.manifest = master.manifest;
        stream.rawManifest = master.rawManifest;
        stream.activeMediaPlaylistUrl = null;
        renderSingleStreamTabs(stream.id);
        return;
      }
      if (stream.mediaPlaylists.has(url)) {
        const mediaPlaylist = stream.mediaPlaylists.get(url);
        stream.manifest = mediaPlaylist.manifest;
        stream.rawManifest = mediaPlaylist.rawManifest;
        stream.activeMediaPlaylistUrl = url;
        renderSingleStreamTabs(stream.id);
      } else {
        fetchAndActivateMediaPlaylist(stream, url);
      }
    };
    const navItem = (label, url, isActive) => x`
        <button
            class="px-3 py-1.5 text-sm rounded-md transition-colors ${isActive ? "bg-blue-600 text-white font-semibold" : "bg-gray-900 hover:bg-gray-700"}"
            data-url="${url}"
            @click=${handleNavClick}
        >
            ${label}
        </button>
    `;
    return x`
        <div class="mb-4 p-2 bg-gray-900/50 rounded-lg flex flex-wrap gap-2">
            ${navItem(
      "Master Playlist",
      "master",
      !stream.activeMediaPlaylistUrl
    )}
            ${variants.map(
      (v2) => navItem(
        `Variant (BW: ${(v2.attributes.BANDWIDTH / 1e3).toFixed(0)}k)`,
        v2.resolvedUri,
        stream.activeMediaPlaylistUrl === v2.resolvedUri
      )
    )}
        </div>
    `;
  };
  var getHlsLineHTML = (line) => {
    line = line.trim();
    if (!line.startsWith("#EXT")) {
      const isComment = line.startsWith("#");
      return `<span class="${isComment ? "text-gray-500 italic" : "text-cyan-400"}">${escapeHtml(line)}</span>`;
    }
    const tagClass = "text-purple-300";
    const attributeClass = "text-emerald-300";
    const valueClass = "text-yellow-300";
    const tooltipClass = `rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700 ${tooltipTriggerClasses}`;
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      const tagName2 = line.substring(1);
      const tagInfo2 = hlsTooltipData[tagName2];
      const tooltipAttrs = tagInfo2 ? `data-tooltip="${escapeHtml(tagInfo2.text)}" data-iso="${escapeHtml(
        tagInfo2.isoRef
      )}"` : "";
      return `#<span class="${tagClass} ${tagInfo2 ? tooltipClass : ""}" ${tooltipAttrs}>${tagName2}</span>`;
    }
    const tagName = line.substring(1, separatorIndex);
    const tagValue = line.substring(separatorIndex + 1);
    const tagInfo = hlsTooltipData[tagName];
    const tagTooltipAttrs = tagInfo ? `data-tooltip="${escapeHtml(tagInfo.text)}" data-iso="${escapeHtml(
      tagInfo.isoRef
    )}"` : "";
    let valueHtml = "";
    if (tagValue.includes("=")) {
      const parts = tagValue.match(/("[^"]*")|[^,]+/g) || [];
      valueHtml = parts.map((part) => {
        const eqIndex = part.indexOf("=");
        if (eqIndex === -1) return escapeHtml(part);
        const attr = part.substring(0, eqIndex);
        const val = part.substring(eqIndex + 1);
        const attrKey = `${tagName}@${attr}`;
        const attrInfo = hlsTooltipData[attrKey];
        const attrTooltipAttrs = attrInfo ? `data-tooltip="${escapeHtml(
          attrInfo.text
        )}" data-iso="${escapeHtml(attrInfo.isoRef)}"` : "";
        return `<span class="${attributeClass} ${attrInfo ? tooltipClass : ""}" ${attrTooltipAttrs}>${escapeHtml(
          attr
        )}</span>=<span class="${valueClass}">${escapeHtml(val)}</span>`;
      }).join('<span class="text-gray-400">,</span>');
    } else {
      valueHtml = `<span class="${valueClass}">${escapeHtml(tagValue)}</span>`;
    }
    return `#<span class="${tagClass} ${tagInfo ? tooltipClass : ""}" ${tagTooltipAttrs}>${tagName}</span>:<span class="font-normal">${valueHtml}</span>`;
  };
  var hlsManifestTemplate = (stream) => {
    const manifestString = stream.rawManifest;
    const isMaster = stream.mediaPlaylists.get("master")?.manifest.rawElement.isMaster;
    const lines = manifestString.split(/\r?\n/);
    return x`
        <h3 class="text-xl font-bold mb-2">Interactive Manifest</h3>
        ${isMaster ? hlsSubNavTemplate(stream) : ""}
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            ${lines.map(
      (line, i3) => x`
                    <div class="flex">
                        <span
                            class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-10"
                            >${i3 + 1}</span
                        >
                        <span class="flex-grow whitespace-pre-wrap break-all"
                            >${o2(getHlsLineHTML(line))}</span
                        >
                    </div>
                `
    )}
        </div>
    `;
  };
  var getTagHTML = (tagName) => {
    const isClosing = tagName.startsWith("/");
    const cleanTagName = isClosing ? tagName.substring(1) : tagName;
    const tagInfo = dashTooltipData[cleanTagName];
    const tagClass = "text-blue-300 rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700";
    const tooltipAttrs = tagInfo ? `data-tooltip="${escapeHtml(tagInfo.text)}" data-iso="${escapeHtml(
      tagInfo.isoRef
    )}"` : "";
    return `&lt;${isClosing ? "/" : ""}<span class="${tagClass} ${tagInfo ? tooltipTriggerClasses : ""}" ${tooltipAttrs}>${cleanTagName}</span>`;
  };
  var getAttributeHTML = (tagName, attr) => {
    const attrKey = `${tagName}@${attr.name}`;
    const attrInfo = dashTooltipData[attrKey];
    const nameClass = "text-emerald-300 rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700";
    const valueClass = "text-yellow-300";
    const tooltipAttrs = attrInfo ? `data-tooltip="${escapeHtml(attrInfo.text)}" data-iso="${escapeHtml(
      attrInfo.isoRef
    )}"` : "";
    return `<span class="${nameClass} ${attrInfo ? tooltipTriggerClasses : ""}" ${tooltipAttrs}>${attr.name}</span>=<span class="${valueClass}">"${escapeHtml(attr.value)}"</span>`;
  };
  var preformattedDash = (node, depth = 0) => {
    const indent = "  ".repeat(depth);
    switch (node.nodeType) {
      case Node.ELEMENT_NODE: {
        const el = (
          /** @type {Element} */
          node
        );
        const childNodes = Array.from(el.childNodes).filter(
          (n2) => n2.nodeType === Node.ELEMENT_NODE || n2.nodeType === Node.COMMENT_NODE || n2.nodeType === Node.TEXT_NODE && n2.textContent.trim()
        );
        const attrs = Array.from(el.attributes).map((a2) => ` ${getAttributeHTML(el.tagName, a2)}`).join("");
        if (childNodes.length > 0) {
          const openingTag = `${indent}${getTagHTML(el.tagName)}${attrs}&gt;`;
          const childLines = childNodes.flatMap(
            (c2) => preformattedDash(c2, depth + 1)
          );
          const closingTag = `${indent}${getTagHTML(`/${el.tagName}`)}&gt;`;
          return [openingTag, ...childLines, closingTag];
        } else {
          return [`${indent}${getTagHTML(el.tagName)}${attrs} /&gt;`];
        }
      }
      case Node.TEXT_NODE: {
        return [
          `${indent}<span class="text-gray-200">${escapeHtml(
            node.textContent.trim()
          )}</span>`
        ];
      }
      case Node.COMMENT_NODE: {
        return [
          `${indent}<span class="text-gray-500 italic">&lt;!--${escapeHtml(
            node.textContent
          )}--&gt;</span>`
        ];
      }
      default:
        return [];
    }
  };
  var dashManifestTemplate = (manifestElement) => {
    const lines = preformattedDash(manifestElement);
    return x`
        <h3 class="text-xl font-bold mb-2">Interactive Manifest</h3>
        <div
        class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
    >
        ${lines.map(
      (line, i3) => x`
                <div class="flex">
                    <span
                        class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-10"
                        >${i3 + 1}</span
                    >
                    <span class="flex-grow whitespace-pre-wrap break-all"
                        >${o2(line)}</span
                    >
                </div>
            `
    )}
    </div>`;
  };
  function getInteractiveManifestTemplate(stream) {
    if (!stream || !stream.manifest)
      return x`<p class="warn">No Manifest loaded to display.</p>`;
    if (stream.protocol === "hls") {
      return hlsManifestTemplate(stream);
    }
    return dashManifestTemplate(
      /** @type {Element} */
      stream.manifest.rawElement
    );
  }

  // js/features/interactive-segment/logic.js
  function buildByteMap(parsedData) {
    const byteMap = /* @__PURE__ */ new Map();
    const boxColors = [
      { bg: "bg-red-500/20", border: "border-red-500" },
      { bg: "bg-yellow-500/20", border: "border-yellow-500" },
      { bg: "bg-green-500/20", border: "border-green-500" },
      { bg: "bg-blue-500/20", border: "border-blue-500" },
      { bg: "bg-indigo-500/20", border: "border-indigo-500" },
      { bg: "bg-purple-500/20", border: "border-purple-500" },
      { bg: "bg-pink-500/20", border: "border-pink-500" },
      { bg: "bg-teal-500/20", border: "border-teal-500" },
      { bg: "bg-orange-500/20", border: "border-orange-500" },
      { bg: "bg-lime-500/20", border: "border-lime-500" },
      { bg: "bg-rose-500/20", border: "border-rose-500" }
    ];
    const reservedColor = { bg: "bg-gray-700/50" };
    let colorIndex = 0;
    const traverse = (boxes) => {
      if (!boxes) return;
      for (const box of boxes) {
        const color = boxColors[colorIndex % boxColors.length];
        box.color = color;
        const boxStart = box.offset;
        const boxEnd = box.offset + box.size;
        for (let i3 = boxStart; i3 < boxEnd; i3++) {
          byteMap.set(i3, { box, field: "Box Content", color });
        }
        if (box.details) {
          for (const [fieldName, fieldMeta] of Object.entries(box.details)) {
            if (fieldMeta.offset !== void 0 && fieldMeta.length !== void 0) {
              const fieldColor = fieldName.includes("reserved") || fieldName.includes("Padding") ? reservedColor : color;
              for (let i3 = fieldMeta.offset; i3 < fieldMeta.offset + fieldMeta.length; i3++) {
                byteMap.set(i3, { box, field: fieldName, color: fieldColor });
              }
            }
          }
        }
        if (box.children && box.children.length > 0) {
          traverse(box.children);
        }
        if (box.children && box.children.length > 0) {
          let lastChildEnd = box.contentOffset;
          if (box.children.length > 0) {
            const lastChild = box.children[box.children.length - 1];
            lastChildEnd = lastChild.offset + lastChild.size;
          }
          if (boxEnd > lastChildEnd) {
            for (let i3 = lastChildEnd; i3 < boxEnd; i3++) {
              byteMap.set(i3, { box, field: "Container Padding", color: reservedColor });
            }
          }
        }
        colorIndex++;
      }
    };
    if (parsedData && Array.isArray(parsedData)) {
      traverse(parsedData);
    }
    const maxOffset = parsedData.reduce((max, box) => Math.max(max, box.offset + box.size), 0);
    for (let i3 = 0; i3 < maxOffset; i3++) {
      if (!byteMap.has(i3)) {
        byteMap.set(i3, {
          box: { type: "UNKNOWN", offset: i3, size: 1 },
          field: "Unmapped Data",
          color: reservedColor
        });
      }
    }
    return byteMap;
  }
  function generateHexAsciiView(buffer, parsedData = null, startOffset = 0, maxBytes = null) {
    if (!buffer) return [];
    const rows = [];
    const view = new Uint8Array(buffer);
    const bytesPerRow = 16;
    const byteMap = parsedData ? buildByteMap(parsedData) : /* @__PURE__ */ new Map();
    const endByte = maxBytes ? Math.min(startOffset + maxBytes, view.length) : view.length;
    for (let i3 = startOffset; i3 < endByte; i3 += bytesPerRow) {
      const rowEndByte = Math.min(i3 + bytesPerRow, endByte);
      const rowBytes = view.slice(i3, rowEndByte);
      const offset = i3.toString(16).padStart(8, "0").toUpperCase();
      let hexHtml = "";
      let asciiHtml = "";
      const baseHexClass = "inline-block h-6 leading-6 w-7 text-center align-middle transition-colors duration-150 cursor-pointer";
      const baseAsciiClass2 = "inline-block h-6 leading-6 w-4 text-center align-middle transition-colors duration-150 tracking-tight cursor-pointer";
      const fieldDelimiterClass = "border-l border-gray-400/50";
      let currentFieldGroup = [];
      let currentAsciiGroup = [];
      let lastMapEntry = null;
      const flushGroup = () => {
        if (currentFieldGroup.length === 0 || !lastMapEntry) return;
        const { box, field, color } = lastMapEntry;
        const dataAttrs = `data-box-offset="${box.offset}" data-field-name="${field}"`;
        const groupClass = `${color ? color.bg : ""}`;
        hexHtml += `<span class="inline-block ${groupClass}" ${dataAttrs}>${currentFieldGroup.join("")}</span>`;
        asciiHtml += `<span class="inline-block ${groupClass}" ${dataAttrs}>${currentAsciiGroup.join("")}</span>`;
        currentFieldGroup = [];
        currentAsciiGroup = [];
      };
      rowBytes.forEach((byte, index) => {
        const byteOffset = i3 + index;
        const mapEntry = byteMap.get(byteOffset);
        if (lastMapEntry && (mapEntry?.box !== lastMapEntry.box || mapEntry?.field !== lastMapEntry.field)) {
          flushGroup();
        }
        let hexCssClass = baseHexClass;
        let asciiCssClass = baseAsciiClass2;
        if (lastMapEntry && mapEntry?.box === lastMapEntry.box && mapEntry?.field !== lastMapEntry.field) {
          hexCssClass += ` ${fieldDelimiterClass}`;
          asciiCssClass += ` ${fieldDelimiterClass}`;
        }
        const dataAttrs = `data-byte-offset="${byteOffset}"`;
        const hexByte = byte.toString(16).padStart(2, "0").toUpperCase();
        currentFieldGroup.push(`<span class="${hexCssClass}" ${dataAttrs}>${hexByte}</span>`);
        const asciiChar = byte >= 32 && byte <= 126 ? String.fromCharCode(byte).replace("<", "&lt;") : ".";
        currentAsciiGroup.push(`<span class="${asciiCssClass}" ${dataAttrs}>${asciiChar}</span>`);
        lastMapEntry = mapEntry;
      });
      flushGroup();
      const remaining = bytesPerRow - rowBytes.length;
      if (remaining > 0) {
        hexHtml += `<span class="inline-block h-6" style="width: ${remaining * 1.75}rem"></span>`;
        asciiHtml += `<span class="inline-block h-6" style="width: ${remaining * 1}rem"></span>`;
      }
      rows.push({ offset, hex: hexHtml, ascii: asciiHtml });
    }
    return rows;
  }

  // js/features/segment-analysis/isobmff-box-parsers/ftyp.js
  function parseFtypStyp(box, view) {
    let currentParseOffset = box.headerSize;
    const majorBrandBytes = new Uint8Array(view.buffer, view.byteOffset + currentParseOffset, 4);
    const majorBrand = String.fromCharCode(...majorBrandBytes);
    box.details["majorBrand"] = { value: majorBrand, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    const minorVersion = view.getUint32(currentParseOffset);
    box.details["minorVersion"] = { value: minorVersion, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    const compatibleBrands = [];
    let compatibleBrandsOffset = currentParseOffset;
    while (currentParseOffset < box.size) {
      if (currentParseOffset + 4 > box.size) break;
      const brandBytes = new Uint8Array(view.buffer, view.byteOffset + currentParseOffset, 4);
      compatibleBrands.push(String.fromCharCode(...brandBytes));
      currentParseOffset += 4;
    }
    if (compatibleBrands.length > 0) {
      box.details["compatibleBrands"] = { value: compatibleBrands.join(", "), offset: box.offset + compatibleBrandsOffset, length: currentParseOffset - compatibleBrandsOffset };
    }
  }
  var ftypStypTooltip = {
    ftyp: {
      name: "File Type",
      text: "File Type Box: declares the major brand, minor version, and compatible brands for the file.",
      ref: "ISO/IEC 14496-12:2022, Section 4.3"
    },
    "ftyp@majorBrand": {
      text: "The major brand of the file, indicating its primary specification.",
      ref: "ISO/IEC 14496-12:2022, Section 4.3"
    },
    "ftyp@minorVersion": {
      text: "The minor version of the major brand.",
      ref: "ISO/IEC 14496-12:2022, Section 4.3"
    },
    "ftyp@compatibleBrands": {
      text: "Other brands that the file is compatible with.",
      ref: "ISO/IEC 14496-12:2022, Section 4.3"
    },
    styp: {
      name: "Segment Type",
      text: "Declares the segment's brand and compatibility.",
      ref: "ISO/IEC 14496-12, 8.16.2"
    },
    "styp@majorBrand": {
      text: "The 'best use' specification for the segment.",
      ref: "ISO/IEC 14496-12, 4.3.3"
    },
    "styp@minorVersion": {
      text: "An informative integer for the minor version of the major brand.",
      ref: "ISO/IEC 14496-12, 4.3.3"
    },
    "styp@compatibleBrands": {
      text: "A list of other specifications to which the segment complies.",
      ref: "ISO/IEC 14496-12, 4.3.3"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/mvhd.js
  function parseMvhd(box, view) {
    let currentParseOffset = box.headerSize;
    const version = view.getUint8(currentParseOffset);
    box.details["version"] = { value: version, offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 4;
    if (version === 1) {
      box.details["creation_time"] = { value: new Date(Number(view.getBigUint64(currentParseOffset)) * 1e3 - 20828448e5).toISOString(), offset: box.offset + currentParseOffset, length: 8 };
      currentParseOffset += 8;
      box.details["modification_time"] = { value: new Date(Number(view.getBigUint64(currentParseOffset)) * 1e3 - 20828448e5).toISOString(), offset: box.offset + currentParseOffset, length: 8 };
      currentParseOffset += 8;
      box.details["timescale"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
      box.details["duration"] = { value: Number(view.getBigUint64(currentParseOffset)), offset: box.offset + currentParseOffset, length: 8 };
      currentParseOffset += 8;
    } else {
      box.details["creation_time"] = { value: new Date(view.getUint32(currentParseOffset) * 1e3 - 20828448e5).toISOString(), offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
      box.details["modification_time"] = { value: new Date(view.getUint32(currentParseOffset) * 1e3 - 20828448e5).toISOString(), offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
      box.details["timescale"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
      box.details["duration"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
    }
    box.details["rate"] = { value: `${view.getInt16(currentParseOffset)}.${view.getUint16(currentParseOffset + 2)}`, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    box.details["volume"] = { value: `${view.getInt8(currentParseOffset)}.${view.getUint8(currentParseOffset + 1)}`, offset: box.offset + currentParseOffset, length: 2 };
    currentParseOffset += 2;
    box.details["reserved"] = { value: "10 bytes", offset: box.offset + currentParseOffset, length: 10 };
    currentParseOffset += 10;
    const matrixValues = [];
    for (let i3 = 0; i3 < 9; i3++) {
      matrixValues.push(view.getInt32(currentParseOffset + i3 * 4));
    }
    box.details["matrix"] = { value: `[${matrixValues.join(", ")}]`, offset: box.offset + currentParseOffset, length: 36 };
    currentParseOffset += 36;
    box.details["pre_defined"] = { value: "24 bytes", offset: box.offset + currentParseOffset, length: 24 };
    currentParseOffset += 24;
    box.details["next_track_ID"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
  }
  var mvhdTooltip = {
    mvhd: {
      name: "Movie Header",
      text: "Contains global information for the presentation (timescale, duration).",
      ref: "ISO/IEC 14496-12, 8.2.2"
    },
    "mvhd@version": {
      text: "Version of this box (0 or 1). Affects the size of time and duration fields.",
      ref: "ISO/IEC 14496-12, 8.2.2.3"
    },
    "mvhd@creation_time": {
      text: "The creation time of the presentation (in seconds since midnight, Jan. 1, 1904, UTC).",
      ref: "ISO/IEC 14496-12, 8.2.2.3"
    },
    "mvhd@modification_time": {
      text: "The most recent time the presentation was modified.",
      ref: "ISO/IEC 14496-12, 8.2.2.3"
    },
    "mvhd@timescale": {
      text: "The number of time units that pass in one second for the presentation.",
      ref: "ISO/IEC 14496-12, 8.2.2.3"
    },
    "mvhd@duration": {
      text: "The duration of the presentation in units of the timescale.",
      ref: "ISO/IEC 14496-12, 8.2.2.3"
    },
    "mvhd@rate": {
      text: "A fixed-point 16.16 number that specifies the preferred playback rate (1.0 is normal speed).",
      ref: "ISO/IEC 14496-12, 8.2.2.3"
    },
    "mvhd@volume": {
      text: "A fixed-point 8.8 number that specifies the preferred playback volume (1.0 is full volume).",
      ref: "ISO/IEC 14496-12, 8.2.2.3"
    },
    "mvhd@matrix": {
      text: "A transformation matrix for the video, mapping points from video coordinates to display coordinates.",
      ref: "ISO/IEC 14496-12, 8.2.2.3"
    },
    "mvhd@next_track_ID": {
      text: "A non-zero integer indicating a value for the track ID of the next track to be added to this presentation.",
      ref: "ISO/IEC 14496-12, 8.2.2.3"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/mfhd.js
  function parseMfhd(box, view) {
    let currentParseOffset = box.headerSize;
    currentParseOffset += 4;
    box.details["sequence_number"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
  }
  var mfhdTooltip = {
    mfhd: {
      name: "Movie Fragment Header",
      text: "Contains the sequence number of this fragment.",
      ref: "ISO/IEC 14496-12, 8.8.5"
    },
    "mfhd@sequence_number": {
      text: "The ordinal number of this fragment, in increasing order.",
      ref: "ISO/IEC 14496-12, 8.8.5.3"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/tfhd.js
  function parseTfhd(box, view) {
    let currentParseOffset = box.headerSize;
    const flags = view.getUint32(currentParseOffset) & 16777215;
    box.details["version"] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    box.details["flags"] = { value: `0x${flags.toString(16).padStart(6, "0")}`, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    box.details["track_ID"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    if (flags & 1) {
      box.details["base_data_offset"] = { value: Number(view.getBigUint64(currentParseOffset)), offset: box.offset + currentParseOffset, length: 8 };
      currentParseOffset += 8;
    }
    if (flags & 2) {
      box.details["sample_description_index"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
    }
    if (flags & 8) {
      box.details["default_sample_duration"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
    }
    if (flags & 16) {
      box.details["default_sample_size"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
    }
    if (flags & 32) {
      box.details["default_sample_flags"] = { value: `0x${view.getUint32(currentParseOffset).toString(16)}`, offset: box.offset + currentParseOffset, length: 4 };
    }
  }
  var tfhdTooltip = {
    tfhd: {
      name: "Track Fragment Header",
      text: "Declares defaults for a track fragment.",
      ref: "ISO/IEC 14496-12, 8.8.7"
    },
    "tfhd@track_ID": {
      text: "The unique identifier of the track for this fragment.",
      ref: "ISO/IEC 14496-12, 8.8.7.2"
    },
    "tfhd@flags": {
      text: "A bitfield indicating which optional fields are present.",
      ref: "ISO/IEC 14496-12, 8.8.7.2"
    },
    "tfhd@base_data_offset": {
      text: "The base offset for data within the current mdat.",
      ref: "ISO/IEC 14496-12, 8.8.7.2"
    },
    "tfhd@sample_description_index": {
      text: "The index of the sample description for this fragment.",
      ref: "ISO/IEC 14496-12, 8.8.7.2"
    },
    "tfhd@version": {
      text: "Version of this box (0 or 1). Affects the size of the decode time field.",
      ref: "ISO/IEC 14496-12, 8.8.7.2"
    },
    "tfhd@default_sample_duration": {
      text: "Default duration of samples in this track fragment.",
      ref: "ISO/IEC 14496-12, 8.8.7.2"
    },
    "tfhd@default_sample_size": {
      text: "Default size of samples in this track fragment.",
      ref: "ISO/IEC 14496-12, 8.8.7.2"
    },
    "tfhd@default_sample_flags": {
      text: "Default flags for samples in this track fragment.",
      ref: "ISO/IEC 14496-12, 8.8.7.2"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/tfdt.js
  function parseTfdt(box, view) {
    let currentParseOffset = box.headerSize;
    const version = view.getUint8(currentParseOffset);
    box.details["version"] = { value: version, offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 4;
    if (version === 1) {
      box.details["baseMediaDecodeTime"] = { value: Number(view.getBigUint64(currentParseOffset)), offset: box.offset + currentParseOffset, length: 8 };
    } else {
      box.details["baseMediaDecodeTime"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    }
  }
  var tfdtTooltip = {
    tfdt: {
      name: "Track Fragment Decode Time",
      text: "Provides the absolute decode time for the first sample.",
      ref: "ISO/IEC 14496-12, 8.8.12"
    },
    "tfdt@version": {
      text: "Version of this box (0 or 1). Affects the size of the decode time field.",
      ref: "ISO/IEC 14496-12, 8.8.12.3"
    },
    "tfdt@baseMediaDecodeTime": {
      text: "The absolute decode time, in media timescale units, for the first sample in this fragment.",
      ref: "ISO/IEC 14496-12, 8.8.12.3"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/trun.js
  function parseTrun(box, view) {
    let currentParseOffset = box.headerSize;
    const version = view.getUint8(currentParseOffset);
    box.details["version"] = { value: version, offset: box.offset + currentParseOffset, length: 1 };
    const flags = view.getUint32(currentParseOffset) & 16777215;
    box.details["flags"] = { value: `0x${flags.toString(16).padStart(6, "0")}`, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    const sample_count = view.getUint32(currentParseOffset);
    box.details["sample_count"] = { value: sample_count, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    if (flags & 1) {
      box.details["data_offset"] = { value: view.getInt32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
    }
    if (flags & 4) {
      box.details["first_sample_flags"] = { value: `0x${view.getUint32(currentParseOffset).toString(16)}`, offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
    }
    if (sample_count > 0 && currentParseOffset < box.size) {
      let sample_details = "";
      const sample1DetailsStartOffset = currentParseOffset;
      if (flags & 256) {
        if (currentParseOffset + 4 > box.size) return;
        const duration = view.getUint32(currentParseOffset);
        sample_details += `Duration: ${duration}`;
        currentParseOffset += 4;
      }
      if (flags & 512) {
        if (currentParseOffset + 4 > box.size) return;
        const size = view.getUint32(currentParseOffset);
        sample_details += `${sample_details ? ", " : ""}Size: ${size}`;
        currentParseOffset += 4;
      }
      if (flags & 1024) {
        if (currentParseOffset + 4 > box.size) return;
        const sFlags = view.getUint32(currentParseOffset);
        sample_details += `${sample_details ? ", " : ""}Flags: 0x${sFlags.toString(16)}`;
        currentParseOffset += 4;
      }
      if (flags & 2048) {
        if (currentParseOffset + 4 > box.size) return;
        const compOffset = version === 0 ? view.getUint32(currentParseOffset) : view.getInt32(currentParseOffset);
        sample_details += `${sample_details ? ", " : ""}Comp. Offset: ${compOffset}`;
        currentParseOffset += 4;
      }
      if (sample_details) {
        box.details["sample_1_details"] = { value: sample_details, offset: box.offset + sample1DetailsStartOffset, length: currentParseOffset - sample1DetailsStartOffset };
      }
    }
  }
  var trunTooltip = {
    trun: {
      name: "Track Run",
      text: "Contains timing, size, and flags for a run of samples.",
      ref: "ISO/IEC 14496-12, 8.8.8"
    },
    "trun@version": {
      text: "Version of this box (0 or 1). Affects signed/unsigned composition time.",
      ref: "ISO/IEC 14496-12, 8.8.8.2"
    },
    "trun@flags": {
      text: "A bitfield indicating which optional per-sample fields are present.",
      ref: "ISO/IEC 14496-12, 8.8.8.2"
    },
    "trun@sample_count": {
      text: "The number of samples in this run.",
      ref: "ISO/IEC 14496-12, 8.8.8.3"
    },
    "trun@data_offset": {
      text: "An optional offset added to the base_data_offset.",
      ref: "ISO/IEC 14496-12, 8.8.8.3"
    },
    "trun@first_sample_flags": {
      text: "Flags for the first sample, overriding the default.",
      ref: "ISO/IEC 14496-12, 8.8.8.3"
    },
    "trun@sample_1_details": {
      text: "A summary of the per-sample data fields for the first sample in this run.",
      ref: "ISO/IEC 14496-12, 8.8.8.2"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/sidx.js
  function parseSidx(box, view) {
    let currentParseOffset = box.headerSize;
    const version = view.getUint8(currentParseOffset);
    box.details["version"] = { value: version, offset: box.offset + currentParseOffset, length: 1 };
    box.details["flags"] = { value: `0x${(view.getUint32(currentParseOffset) & 16777215).toString(16)}`, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    box.details["reference_ID"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    box.details["timescale"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    if (version === 1) {
      box.details["earliest_presentation_time"] = { value: Number(view.getBigUint64(currentParseOffset)), offset: box.offset + currentParseOffset, length: 8 };
      currentParseOffset += 8;
      box.details["first_offset"] = { value: Number(view.getBigUint64(currentParseOffset)), offset: box.offset + currentParseOffset, length: 8 };
      currentParseOffset += 8;
    } else {
      box.details["earliest_presentation_time"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
      box.details["first_offset"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
    }
    box.details["reserved"] = { value: "0", offset: box.offset + currentParseOffset, length: 2 };
    currentParseOffset += 2;
    const reference_count = view.getUint16(currentParseOffset);
    box.details["reference_count"] = { value: reference_count, offset: box.offset + currentParseOffset, length: 2 };
    currentParseOffset += 2;
    for (let i3 = 0; i3 < reference_count; i3++) {
      if (currentParseOffset + 12 > box.size) break;
      const ref_type_and_size = view.getUint32(currentParseOffset);
      box.details[`reference_${i3 + 1}_type`] = { value: ref_type_and_size >> 31 === 1 ? "sidx" : "media", offset: box.offset + currentParseOffset, length: 4 };
      box.details[`reference_${i3 + 1}_size`] = { value: ref_type_and_size & 2147483647, offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
      box.details[`reference_${i3 + 1}_duration`] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
      const sap_byte = view.getUint32(currentParseOffset);
      box.details[`reference_${i3 + 1}_sap_info`] = { value: `0x${sap_byte.toString(16)}`, offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
    }
  }
  var sidxTooltip = {
    sidx: {
      name: "Segment Index",
      text: "Provides a compact index of media stream chunks within a segment.",
      ref: "ISO/IEC 14496-12, 8.16.3"
    },
    "sidx@version": {
      text: "Version of this box (0 or 1). Affects the size of time and offset fields.",
      ref: "ISO/IEC 14496-12, 8.16.3.2"
    },
    "sidx@reference_ID": {
      text: "The stream ID for the reference stream (typically the track ID).",
      ref: "ISO/IEC 14496-12, 8.16.3.3"
    },
    "sidx@timescale": {
      text: "The timescale for time and duration fields in this box, in ticks per second.",
      ref: "ISO/IEC 14496-12, 8.16.3.3"
    },
    "sidx@earliest_presentation_time": {
      text: "The earliest presentation time of any access unit in the first subsegment.",
      ref: "ISO/IEC 14496-12, 8.16.3.3"
    },
    "sidx@first_offset": {
      text: "The byte offset from the end of this box to the first byte of the indexed material.",
      ref: "ISO/IEC 14496-12, 8.16.3.3"
    },
    "sidx@reference_count": {
      text: "The number of subsegment references that follow.",
      ref: "ISO/IEC 14496-12, 8.16.3.3"
    },
    "sidx@reference_type_1": {
      text: "The type of the first reference (0 = media, 1 = sidx box).",
      ref: "ISO/IEC 14496-12, 8.16.3.3"
    },
    "sidx@referenced_size_1": {
      text: "The size in bytes of the referenced item.",
      ref: "ISO/IEC 14496-12, 8.16.3.3"
    },
    "sidx@subsegment_duration_1": {
      text: "The duration of the referenced subsegment in the timescale.",
      ref: "ISO/IEC 14496-12, 8.16.3.3"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/tkhd.js
  function parseTkhd(box, view) {
    let currentParseOffset = box.headerSize;
    const version = view.getUint8(currentParseOffset);
    box.details["version"] = { value: version, offset: box.offset + currentParseOffset, length: 1 };
    const flags = view.getUint32(currentParseOffset) & 16777215;
    box.details["flags"] = { value: `0x${flags.toString(16).padStart(6, "0")}`, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    if (version === 1) {
      box.details["creation_time"] = { value: new Date(Number(view.getBigUint64(currentParseOffset)) * 1e3 - 20828448e5).toISOString(), offset: box.offset + currentParseOffset, length: 8 };
      currentParseOffset += 8;
      box.details["modification_time"] = { value: new Date(Number(view.getBigUint64(currentParseOffset)) * 1e3 - 20828448e5).toISOString(), offset: box.offset + currentParseOffset, length: 8 };
      currentParseOffset += 8;
    } else {
      box.details["creation_time"] = { value: new Date(view.getUint32(currentParseOffset) * 1e3 - 20828448e5).toISOString(), offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
      box.details["modification_time"] = { value: new Date(view.getUint32(currentParseOffset) * 1e3 - 20828448e5).toISOString(), offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
    }
    box.details["track_ID"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    box.details["reserved_1"] = { value: "4 bytes", offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    const durationLength = version === 1 ? 8 : 4;
    const duration = version === 1 ? Number(view.getBigUint64(currentParseOffset)) : view.getUint32(currentParseOffset);
    box.details["duration"] = { value: duration, offset: box.offset + currentParseOffset, length: durationLength };
    currentParseOffset += durationLength;
    box.details["reserved_2"] = { value: "8 bytes", offset: box.offset + currentParseOffset, length: 8 };
    currentParseOffset += 8;
    box.details["layer"] = { value: view.getInt16(currentParseOffset), offset: box.offset + currentParseOffset, length: 2 };
    currentParseOffset += 2;
    box.details["alternate_group"] = { value: view.getInt16(currentParseOffset), offset: box.offset + currentParseOffset, length: 2 };
    currentParseOffset += 2;
    box.details["volume"] = { value: `${view.getInt8(currentParseOffset)}.${view.getUint8(currentParseOffset + 1)}`, offset: box.offset + currentParseOffset, length: 2 };
    currentParseOffset += 2;
    box.details["reserved_3"] = { value: "2 bytes", offset: box.offset + currentParseOffset, length: 2 };
    currentParseOffset += 2;
    const matrixValues = [];
    for (let i3 = 0; i3 < 9; i3++) {
      matrixValues.push(view.getInt32(currentParseOffset + i3 * 4));
    }
    box.details["matrix"] = { value: `[${matrixValues.join(", ")}]`, offset: box.offset + currentParseOffset, length: 36 };
    currentParseOffset += 36;
    box.details["width"] = { value: `${view.getUint16(currentParseOffset)}.${view.getUint16(currentParseOffset + 2)}`, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    box.details["height"] = { value: `${view.getUint16(currentParseOffset)}.${view.getUint16(currentParseOffset + 2)}`, offset: box.offset + currentParseOffset, length: 4 };
  }
  var tkhdTooltip = {
    tkhd: {
      name: "Track Header",
      text: "Specifies characteristics of a single track.",
      ref: "ISO/IEC 14496-12, 8.3.2"
    },
    "tkhd@version": {
      text: "Version of this box (0 or 1). Affects the size of time and duration fields.",
      ref: "ISO/IEC 14496-12, 8.3.2.3"
    },
    "tkhd@flags": {
      text: "A bitmask of track properties (1=enabled, 2=in movie, 4=in preview).",
      ref: "ISO/IEC 14496-12, 8.3.2.3"
    },
    "tkhd@creation_time": {
      text: "The creation time of this track (in seconds since midnight, Jan. 1, 1904, UTC).",
      ref: "ISO/IEC 14496-12, 8.3.2.3"
    },
    "tkhd@modification_time": {
      text: "The most recent time the track was modified.",
      ref: "ISO/IEC 14496-12, 8.3.2.3"
    },
    "tkhd@track_ID": {
      text: "A unique integer that identifies this track.",
      ref: "ISO/IEC 14496-12, 8.3.2.3"
    },
    "tkhd@duration": {
      text: "The duration of this track in the movie's timescale.",
      ref: "ISO/IEC 14496-12, 8.3.2.3"
    },
    "tkhd@layer": {
      text: "Specifies the front-to-back ordering of video tracks; tracks with lower numbers are closer to the viewer.",
      ref: "ISO/IEC 14496-12, 8.3.2.3"
    },
    "tkhd@alternate_group": {
      text: "An integer that specifies a group of tracks that are alternatives to each other.",
      ref: "ISO/IEC 14496-12, 8.3.2.3"
    },
    "tkhd@volume": {
      text: "For audio tracks, a fixed-point 8.8 number indicating the track's relative volume.",
      ref: "ISO/IEC 14496-12, 8.3.2.3"
    },
    "tkhd@matrix": {
      text: "A transformation matrix for the video in this track.",
      ref: "ISO/IEC 14496-12, 8.3.2.3"
    },
    "tkhd@width": {
      text: "The visual presentation width of the track as a fixed-point 16.16 number.",
      ref: "ISO/IEC 14496-12, 8.3.2.3"
    },
    "tkhd@height": {
      text: "The visual presentation height of the track as a fixed-point 16.16 number.",
      ref: "ISO/IEC 14496-12, 8.3.2.3"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/mdhd.js
  function parseMdhd(box, view) {
    let currentParseOffset = box.headerSize;
    const version = view.getUint8(currentParseOffset);
    box.details["version"] = { value: version, offset: box.offset + currentParseOffset, length: 1 };
    box.details["flags"] = { value: `0x${(view.getUint32(currentParseOffset) & 16777215).toString(16)}`, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    const timeFieldLength = version === 1 ? 8 : 4;
    box.details["creation_time"] = { value: "...", offset: box.offset + currentParseOffset, length: timeFieldLength };
    currentParseOffset += timeFieldLength;
    box.details["modification_time"] = { value: "...", offset: box.offset + currentParseOffset, length: timeFieldLength };
    currentParseOffset += timeFieldLength;
    const timescale = view.getUint32(currentParseOffset);
    box.details["timescale"] = { value: timescale, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    const durationLength = version === 1 ? 8 : 4;
    const duration = version === 1 ? Number(view.getBigUint64(currentParseOffset)) : view.getUint32(currentParseOffset);
    box.details["duration"] = { value: duration, offset: box.offset + currentParseOffset, length: durationLength };
    currentParseOffset += durationLength;
    const langBits = view.getUint16(currentParseOffset);
    const langValue = String.fromCharCode((langBits >> 10 & 31) + 96, (langBits >> 5 & 31) + 96, (langBits & 31) + 96);
    box.details["language"] = { value: langValue, offset: box.offset + currentParseOffset, length: 2 };
    currentParseOffset += 2;
    box.details["pre-defined"] = { value: "0", offset: box.offset + currentParseOffset, length: 2 };
  }
  var mdhdTooltip = {
    mdhd: {
      name: "Media Header",
      text: "Declares media information (timescale, language).",
      ref: "ISO/IEC 14496-12, 8.4.2"
    },
    "mdhd@version": {
      text: "Version of this box (0 or 1). Affects the size of time and duration fields.",
      ref: "ISO/IEC 14496-12, 8.4.2.3"
    },
    "mdhd@timescale": {
      text: "The number of time units that pass in one second for this track's media.",
      ref: "ISO/IEC 14496-12, 8.4.2.3"
    },
    "mdhd@duration": {
      text: "The duration of this track's media in units of its own timescale.",
      ref: "ISO/IEC 14496-12, 8.4.2.3"
    },
    "mdhd@language": {
      text: "The ISO-639-2/T language code for this media.",
      ref: "ISO/IEC 14496-12, 8.4.2.3"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/hdlr.js
  function parseHdlr(box, view) {
    let currentParseOffset = box.headerSize;
    box.details["version"] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    box.details["flags"] = { value: `0x${(view.getUint32(currentParseOffset) & 16777215).toString(16)}`, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    box.details["pre_defined"] = { value: "0", offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    const handlerTypeBytes = new Uint8Array(view.buffer, view.byteOffset + currentParseOffset, 4);
    box.details["handler_type"] = { value: String.fromCharCode(...handlerTypeBytes), offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    box.details["reserved"] = { value: "12 bytes", offset: box.offset + currentParseOffset, length: 12 };
    currentParseOffset += 12;
    const nameLength = box.size - currentParseOffset;
    if (nameLength > 0) {
      const nameBytes = new Uint8Array(view.buffer, view.byteOffset + currentParseOffset, nameLength);
      const name = String.fromCharCode(...nameBytes).replace(/\0/g, "");
      box.details["name"] = { value: name, offset: box.offset + currentParseOffset, length: nameLength };
      currentParseOffset += nameLength;
    }
  }
  var hdlrTooltip = {
    hdlr: {
      name: "Handler Reference",
      text: "Declares the media type of the track (e.g., 'vide', 'soun').",
      ref: "ISO/IEC 14496-12, 8.4.3"
    },
    "hdlr@handler_type": {
      text: "A four-character code identifying the media type (e.g., 'vide', 'soun', 'hint').",
      ref: "ISO/IEC 14496-12, 8.4.3.3"
    },
    "hdlr@name": {
      text: "A human-readable name for the track type (for debugging).",
      ref: "ISO/IEC 14496-12, 8.4.3.3"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/vmhd.js
  function parseVmhd(box, view) {
    let currentParseOffset = box.headerSize;
    const flags = view.getUint32(currentParseOffset) & 16777215;
    box.details["version"] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    box.details["flags"] = { value: `0x${flags.toString(16).padStart(6, "0")}`, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    box.details["graphicsmode"] = { value: view.getUint16(currentParseOffset), offset: box.offset + currentParseOffset, length: 2 };
    currentParseOffset += 2;
    box.details["opcolor"] = { value: `R:${view.getUint16(currentParseOffset)}, G:${view.getUint16(currentParseOffset + 2)}, B:${view.getUint16(currentParseOffset + 4)}`, offset: box.offset + currentParseOffset, length: 6 };
  }
  var vmhdTooltip = {
    vmhd: {
      name: "Video Media Header",
      text: "Contains header information specific to video media.",
      ref: "ISO/IEC 14496-12, 8.4.5.2"
    },
    "vmhd@version": {
      text: "Version of this box, always 0.",
      ref: "ISO/IEC 14496-12, 8.4.5.2.2"
    },
    "vmhd@flags": {
      text: "A bitmask of flags, should have the low bit set to 1.",
      ref: "ISO/IEC 14496-12, 8.4.5.2"
    },
    "vmhd@graphicsmode": {
      text: "Specifies a composition mode for this video track.",
      ref: "ISO/IEC 14496-12, 8.4.5.2.2"
    },
    "vmhd@opcolor": {
      text: "A set of RGB color values available for use by graphics modes.",
      ref: "ISO/IEC 14496-12, 8.4.5.2.2"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/stsd.js
  function parseStsd(box, view) {
    let currentParseOffset = box.headerSize;
    box.details["version"] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 4;
    box.details["entry_count"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
  }
  var stsdTooltip = {
    stsd: {
      name: "Sample Description",
      text: "Stores information for decoding samples (codec type, initialization data). Contains one or more Sample Entry boxes.",
      ref: "ISO/IEC 14496-12, 8.5.2"
    },
    "stsd@entry_count": {
      text: "The number of sample entries that follow.",
      ref: "ISO/IEC 14496-12, 8.5.2.3"
    },
    "stsd@version": {
      text: "Version of this box, always 0.",
      ref: "ISO/IEC 14496-12, 8.5.2.3"
    }
    // Tooltips for common sample entries (avc1, mp4a) are handled via their own boxes now.
  };

  // js/features/segment-analysis/isobmff-box-parsers/stts.js
  function parseStts(box, view) {
    let currentParseOffset = box.headerSize;
    box.details["version"] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 4;
    const entryCount = view.getUint32(currentParseOffset);
    box.details["entry_count"] = { value: entryCount, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    if (entryCount > 0) {
      box.details["sample_count_1"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
      box.details["sample_delta_1"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    }
  }
  var sttsTooltip = {
    stts: {
      name: "Decoding Time to Sample",
      text: "Maps decoding times to sample numbers.",
      ref: "ISO/IEC 14496-12, 8.6.1.2"
    },
    "stts@version": {
      text: "Version of this box, always 0.",
      ref: "ISO/IEC 14496-12, 8.6.1.2.3"
    },
    "stts@entry_count": {
      text: "The number of entries in the time-to-sample table.",
      ref: "ISO/IEC 14496-12, 8.6.1.2.3"
    },
    "stts@sample_count_1": {
      text: "The number of consecutive samples with the same delta for the first table entry.",
      ref: "ISO/IEC 14496-12, 8.6.1.2.3"
    },
    "stts@sample_delta_1": {
      text: "The delta (duration) for each sample in this run for the first table entry.",
      ref: "ISO/IEC 14496-12, 8.6.1.2.3"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/stsc.js
  function parseStsc(box, view) {
    let currentParseOffset = box.headerSize;
    box.details["version"] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 4;
    const entryCount = view.getUint32(currentParseOffset);
    box.details["entry_count"] = { value: entryCount, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    if (entryCount > 0) {
      box.details["first_chunk_1"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
      box.details["samples_per_chunk_1"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
      box.details["sample_description_index_1"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    }
  }
  var stscTooltip = {
    stsc: {
      name: "Sample To Chunk",
      text: "Maps samples to chunks.",
      ref: "ISO/IEC 14496-12, 8.7.4"
    },
    "stsc@version": {
      text: "Version of this box, always 0.",
      ref: "ISO/IEC 14496-12, 8.7.4.3"
    },
    "stsc@entry_count": {
      text: "The number of entries in the sample-to-chunk table.",
      ref: "ISO/IEC 14496-12, 8.7.4.3"
    },
    "stsc@first_chunk_1": {
      text: "The index of the first chunk in a run of chunks with the same properties.",
      ref: "ISO/IEC 14496-12, 8.7.4.3"
    },
    "stsc@samples_per_chunk_1": {
      text: "The number of samples in each of these chunks.",
      ref: "ISO/IEC 14496-12, 8.7.4.3"
    },
    "stsc@sample_description_index_1": {
      text: "The index of the sample description for the samples in this run.",
      ref: "ISO/IEC 14496-12, 8.7.4.3"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/stsz.js
  function parseStsz(box, view) {
    let currentParseOffset = box.headerSize;
    box.details["version"] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 4;
    box.details["sample_size"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    box.details["sample_count"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
  }
  var stszTooltip = {
    stsz: {
      name: "Sample Size",
      text: "Specifies the size of each sample.",
      ref: "ISO/IEC 14496-12, 8.7.3"
    },
    "stsz@version": {
      text: "Version of this box, always 0.",
      ref: "ISO/IEC 14496-12, 8.7.3.2.2"
    },
    "stsz@sample_size": {
      text: "Default sample size. If 0, sizes are in the entry table.",
      ref: "ISO/IEC 14496-12, 8.7.3.2.2"
    },
    "stsz@sample_count": {
      text: "The total number of samples in the track.",
      ref: "ISO/IEC 14496-12, 8.7.3.2.2"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/stco.js
  function parseStco(box, view) {
    let currentParseOffset = box.headerSize;
    box.details["version"] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 4;
    const entryCount = view.getUint32(currentParseOffset);
    box.details["entry_count"] = { value: entryCount, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    if (entryCount > 0) {
      box.details["chunk_offset_1"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    }
  }
  var stcoTooltip = {
    stco: {
      name: "Chunk Offset",
      text: "Specifies the offset of each chunk into the file.",
      ref: "ISO/IEC 14496-12, 8.7.5"
    },
    "stco@version": {
      text: "Version of this box, always 0.",
      ref: "ISO/IEC 14496-12, 8.7.5.3"
    },
    "stco@entry_count": {
      text: "The number of entries in the chunk offset table.",
      ref: "ISO/IEC 14496-12, 8.7.5.3"
    },
    "stco@chunk_offset_1": {
      text: "The file offset of the first chunk.",
      ref: "ISO/IEC 14496-12, 8.7.5.3"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/elst.js
  function parseElst(box, view) {
    let currentParseOffset = box.headerSize;
    const version = view.getUint8(currentParseOffset);
    box.details["version"] = { value: version, offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 4;
    const entryCount = view.getUint32(currentParseOffset);
    box.details["entry_count"] = { value: entryCount, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    if (entryCount > 0) {
      if (version === 1) {
        box.details["segment_duration_1"] = { value: Number(view.getBigUint64(currentParseOffset)), offset: box.offset + currentParseOffset, length: 8 };
        currentParseOffset += 8;
        box.details["media_time_1"] = { value: Number(view.getBigInt64(currentParseOffset)), offset: box.offset + currentParseOffset, length: 8 };
        currentParseOffset += 8;
      } else {
        box.details["segment_duration_1"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
        box.details["media_time_1"] = { value: view.getInt32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
      }
    }
  }
  var elstTooltip = {
    elst: {
      name: "Edit List",
      text: "Maps the media time-line to the presentation time-line.",
      ref: "ISO/IEC 14496-12, 8.6.6"
    },
    "elst@version": {
      text: "Version of this box (0 or 1). Affects the size of duration and time fields.",
      ref: "ISO/IEC 14496-12, 8.6.6.3"
    },
    "elst@entry_count": {
      text: "The number of entries in the edit list.",
      ref: "ISO/IEC 14496-12, 8.6.6.3"
    },
    "elst@segment_duration_1": {
      text: "The duration of this edit segment in movie timescale units.",
      ref: "ISO/IEC 14496-12, 8.6.6.3"
    },
    "elst@media_time_1": {
      text: "The starting time within the media of this edit segment. A value of -1 indicates an empty edit.",
      ref: "ISO/IEC 14496-12, 8.6.6.3"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/trex.js
  function parseTrex(box, view) {
    let currentParseOffset = box.headerSize;
    currentParseOffset += 4;
    box.details["track_ID"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    box.details["default_sample_description_index"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    box.details["default_sample_duration"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    box.details["default_sample_size"] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
    box.details["default_sample_flags"] = { value: `0x${view.getUint32(currentParseOffset).toString(16)}`, offset: box.offset + currentParseOffset, length: 4 };
  }
  var trexTooltip = {
    trex: {
      name: "Track Extends",
      text: "Sets default values for samples in fragments.",
      ref: "ISO/IEC 14496-12, 8.8.3"
    },
    "trex@track_ID": {
      text: "The track ID to which these defaults apply.",
      ref: "ISO/IEC 14496-12, 8.8.3.3"
    },
    "trex@default_sample_description_index": {
      text: "The default sample description index for samples in fragments.",
      ref: "ISO/IEC 14496-12, 8.8.3.3"
    },
    "trex@default_sample_duration": {
      text: "The default duration for samples in fragments.",
      ref: "ISO/IEC 14496-12, 8.8.3.3"
    },
    "trex@default_sample_size": {
      text: "The default size for samples in fragments.",
      ref: "ISO/IEC 14496-12, 8.8.3.3"
    },
    "trex@default_sample_flags": {
      text: "The default flags for samples in fragments.",
      ref: "ISO/IEC 14496-12, 8.8.3.3"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/groups/default.js
  var groupTooltipData = {
    moov: {
      name: "Movie",
      text: "Container for all metadata defining the presentation.",
      ref: "ISO/IEC 14496-12, 8.2.1"
    },
    trak: {
      name: "Track",
      text: "Container for a single track.",
      ref: "ISO/IEC 14496-12, 8.3.1"
    },
    meta: {
      name: "Metadata",
      text: "A container for metadata.",
      ref: "ISO/IEC 14496-12, 8.11.1"
    },
    mdia: {
      name: "Media",
      text: "Container for media data information.",
      ref: "ISO/IEC 14496-12, 8.4.1"
    },
    minf: {
      name: "Media Information",
      text: "Container for characteristic information of the media.",
      ref: "ISO/IEC 14496-12, 8.4.4"
    },
    dinf: {
      name: "Data Information",
      text: "Container for objects that declare where media data is located.",
      ref: "ISO/IEC 14496-12, 8.7.1"
    },
    stbl: {
      name: "Sample Table",
      text: "Contains all time and data indexing for samples.",
      ref: "ISO/IEC 14496-12, 8.5.1"
    },
    edts: {
      name: "Edit Box",
      text: "A container for an edit list.",
      ref: "ISO/IEC 14496-12, 8.6.5"
    },
    mvex: {
      name: "Movie Extends",
      text: "Signals that the movie may contain fragments.",
      ref: "ISO/IEC 14496-12, 8.8.1"
    },
    moof: {
      name: "Movie Fragment",
      text: "Container for all metadata for a single fragment.",
      ref: "ISO/IEC 14496-12, 8.8.4"
    },
    traf: {
      name: "Track Fragment",
      text: "Container for metadata for a single track's fragment.",
      ref: "ISO/IEC 14496-12, 8.8.6"
    },
    pssh: {
      name: "Protection System Specific Header",
      text: "Contains DRM initialization data.",
      ref: "ISO/IEC 23001-7"
    },
    mdat: {
      name: "Media Data",
      text: "Contains the actual audio/video sample data.",
      ref: "ISO/IEC 14496-12, 8.1.1"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/avcc.js
  function parseAvcc(box, view) {
    let currentParseOffset = box.headerSize;
    box.details["configurationVersion"] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 1;
    box.details["AVCProfileIndication"] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 1;
    box.details["profile_compatibility"] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 1;
    box.details["AVCLevelIndication"] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 1;
    const spsByte = view.getUint8(currentParseOffset);
    box.details["lengthSizeMinusOne"] = { value: spsByte >> 5 & 3, offset: box.offset + currentParseOffset, length: 1 };
    box.details["reserved_1"] = { value: spsByte >> 5 & 7, offset: box.offset + currentParseOffset, length: 1 };
    const spsCount = spsByte & 31;
    box.details["numOfSequenceParameterSets"] = { value: spsCount, offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 1;
    for (let i3 = 0; i3 < spsCount; i3++) {
      const spsLength = view.getUint16(currentParseOffset);
      box.details[`sps_${i3 + 1}_length`] = { value: spsLength, offset: box.offset + currentParseOffset, length: 2 };
      currentParseOffset += 2;
      box.details[`sps_${i3 + 1}_nal_unit`] = { value: `... ${spsLength} bytes`, offset: box.offset + currentParseOffset, length: spsLength };
      currentParseOffset += spsLength;
    }
    const ppsCount = view.getUint8(currentParseOffset);
    box.details["numOfPictureParameterSets"] = { value: ppsCount, offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 1;
    for (let i3 = 0; i3 < ppsCount; i3++) {
      const ppsLength = view.getUint16(currentParseOffset);
      box.details[`pps_${i3 + 1}_length`] = { value: ppsLength, offset: box.offset + currentParseOffset, length: 2 };
      currentParseOffset += 2;
      box.details[`pps_${i3 + 1}_nal_unit`] = { value: `... ${ppsLength} bytes`, offset: box.offset + currentParseOffset, length: ppsLength };
      currentParseOffset += ppsLength;
    }
  }
  var avccTooltip = {
    avcC: {
      name: "AVC Configuration",
      text: "Contains the decoder configuration information for an H.264/AVC video track, including SPS and PPS.",
      ref: "ISO/IEC 14496-15, 5.3.3.1.2"
    },
    "avcC@AVCProfileIndication": {
      text: "Specifies the profile to which the stream conforms (e.g., 66=Baseline, 77=Main, 100=High).",
      ref: "ISO/IEC 14496-10"
    },
    "avcC@AVCLevelIndication": {
      text: "Specifies the level to which the stream conforms.",
      ref: "ISO/IEC 14496-10"
    },
    "avcC@configurationVersion": {
      text: "The version of the AVC profile and level indication.",
      ref: "ISO/IEC 14496-15, 5.3.3.1.2"
    },
    "avcC@profile_compatibility": {
      text: "Flags that indicate compatibility of the stream with AVC profiles.",
      ref: "ISO/IEC 14496-15, 5.3.3.1.2"
    },
    "avcC@numOfSequenceParameterSets": {
      text: "The number of Sequence Parameter Sets (SPS) in this configuration.",
      ref: "ISO/IEC 14496-15, 5.3.3.1.2"
    },
    "avcC@sps_1_length": {
      text: "The length in bytes of the first SPS NAL unit.",
      ref: "ISO/IEC 14496-15, 5.3.3.1.2"
    },
    "avcC@sps_1_nal_unit": {
      text: "The raw bytes of the first SPS NAL unit.",
      ref: "ISO/IEC 14496-15, 5.3.3.1.2"
    },
    "avcC@numOfPictureParameterSets": {
      text: "The number of Picture Parameter Sets (PPS) in this configuration.",
      ref: "ISO/IEC 14496-15, 5.3.3.1.2"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/esds.js
  function parseEsds(box, view) {
    let currentParseOffset = box.headerSize + 4;
    while (currentParseOffset < box.size) {
      if (view.getUint8(currentParseOffset) === 4) {
        box.details["decoderConfigDescriptorTag"] = { value: "0x04", offset: box.offset + currentParseOffset, length: 1 };
        if (currentParseOffset + 2 < box.size) {
          const audioObjectType = view.getUint8(currentParseOffset + 2) >> 3;
          box.details["audioObjectType"] = { value: audioObjectType, offset: box.offset + currentParseOffset + 2, length: 1 };
        }
        break;
      }
      currentParseOffset++;
    }
  }
  var esdsTooltip = {
    esds: {
      name: "Elementary Stream Descriptor",
      text: "Contains information about the elementary stream, such as the audio object type for AAC.",
      ref: "ISO/IEC 14496-1, 7.2.6.5"
    },
    "esds@audioObjectType": {
      text: "Specifies the audio coding profile (e.g., 2 = AAC LC, 5 = SBR).",
      ref: "ISO/IEC 14496-3, Table 1.17"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/smhd.js
  function parseSmhd(box, view) {
    let currentParseOffset = box.headerSize;
    box.details["version"] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 4;
    box.details["balance"] = { value: view.getInt16(currentParseOffset), offset: box.offset + currentParseOffset, length: 2 };
  }
  var smhdTooltip = {
    smhd: {
      name: "Sound Media Header",
      text: "Contains header information specific to sound media.",
      ref: "ISO/IEC 14496-12, 8.4.5.3"
    },
    "smhd@balance": {
      text: "A fixed-point 8.8 number that places mono audio tracks in a stereo space (0 = center).",
      ref: "ISO/IEC 14496-12, 8.4.5.3.2"
    },
    "smhd@version": {
      text: "Version of this box, always 0.",
      ref: "ISO/IEC 14496-12, 8.4.5.3.2"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/pssh.js
  function parsePssh(box, view) {
    let currentParseOffset = box.headerSize;
    const version = view.getUint8(currentParseOffset);
    box.details["version"] = { value: version, offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 4;
    const systemIdBytes = [];
    for (let i3 = 0; i3 < 16; i3++) {
      systemIdBytes.push(view.getUint8(currentParseOffset + i3).toString(16).padStart(2, "0"));
    }
    box.details["System ID"] = { value: systemIdBytes.join("-"), offset: box.offset + currentParseOffset, length: 16 };
    currentParseOffset += 16;
    if (version > 0) {
      const keyIdCount = view.getUint32(currentParseOffset);
      box.details["Key ID Count"] = { value: keyIdCount, offset: box.offset + currentParseOffset, length: 4 };
      currentParseOffset += 4;
      currentParseOffset += keyIdCount * 16;
    }
    const dataSize = view.getUint32(currentParseOffset);
    box.details["Data Size"] = { value: dataSize, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;
  }
  var psshTooltip = {
    pssh: {
      name: "Protection System Specific Header",
      text: "Contains DRM initialization data.",
      ref: "ISO/IEC 23001-7"
    },
    "pssh@System ID": {
      text: "A 16-byte UUID that uniquely identifies the DRM system (e.g., Widevine, PlayReady).",
      ref: "ISO/IEC 23001-7, 5.1.2"
    },
    "pssh@Data Size": {
      text: "The size of the system-specific initialization data that follows.",
      ref: "ISO/IEC 23001-7, 5.1.2"
    },
    "pssh@version": {
      text: "Version of this box (0 or 1). Version 1 includes key IDs.",
      ref: "ISO/IEC 23001-7, 5.1.2"
    },
    "pssh@Key ID Count": {
      text: "The number of key IDs present in the box (only for version 1).",
      ref: "ISO/IEC 23001-7, 5.1.2"
    }
  };

  // js/features/segment-analysis/isobmff-box-parsers/index.js
  var boxParsers = {
    ftyp: parseFtypStyp,
    // Use the unified parser
    styp: parseFtypStyp,
    // Use the unified parser
    mvhd: parseMvhd,
    mfhd: parseMfhd,
    tfhd: parseTfhd,
    tfdt: parseTfdt,
    trun: parseTrun,
    sidx: parseSidx,
    tkhd: parseTkhd,
    mdhd: parseMdhd,
    hdlr: parseHdlr,
    vmhd: parseVmhd,
    smhd: parseSmhd,
    stsd: parseStsd,
    stts: parseStts,
    stsc: parseStsc,
    stsz: parseStsz,
    stco: parseStco,
    elst: parseElst,
    trex: parseTrex,
    pssh: parsePssh,
    avcC: parseAvcc,
    esds: parseEsds
  };
  var tooltipData = {
    ...groupTooltipData,
    ...ftypStypTooltip,
    // Use the unified tooltip data
    ...elstTooltip,
    ...hdlrTooltip,
    ...mvhdTooltip,
    ...mfhdTooltip,
    ...tfhdTooltip,
    ...tfdtTooltip,
    ...trunTooltip,
    ...sidxTooltip,
    ...tkhdTooltip,
    ...mdhdTooltip,
    ...vmhdTooltip,
    ...smhdTooltip,
    ...stsdTooltip,
    ...sttsTooltip,
    ...stscTooltip,
    ...stszTooltip,
    ...stcoTooltip,
    ...trexTooltip,
    ...psshTooltip,
    ...avccTooltip,
    ...esdsTooltip
  };

  // js/features/segment-analysis/isobmff-parser.js
  var getTooltipData = () => tooltipData;
  function parseISOBMFF(buffer, baseOffset = 0) {
    const boxes = [];
    let offset = 0;
    const dataView = new DataView(buffer);
    while (offset < buffer.byteLength) {
      if (offset + 8 > buffer.byteLength) break;
      let size = dataView.getUint32(offset);
      const type = String.fromCharCode.apply(
        null,
        new Uint8Array(buffer, offset + 4, 4)
      );
      let headerSize = 8;
      let actualSize = size;
      let sizeFieldLength = 4;
      if (size === 1) {
        if (offset + 16 > buffer.byteLength) break;
        actualSize = Number(dataView.getBigUint64(offset + 8));
        headerSize = 16;
        sizeFieldLength = 12;
      } else if (size === 0) {
        actualSize = buffer.byteLength - offset;
      }
      if (offset + actualSize > buffer.byteLength || actualSize < headerSize) {
        break;
      }
      const box = {
        type,
        size: actualSize,
        offset: baseOffset + offset,
        contentOffset: baseOffset + offset + headerSize,
        // Content starts after the standard header
        headerSize,
        children: [],
        details: {}
      };
      box.details["size"] = { value: `${actualSize} bytes`, offset: box.offset, length: sizeFieldLength };
      box.details["type"] = { value: type, offset: box.offset + 4, length: 4 };
      parseBoxDetails(box, new DataView(buffer, offset, actualSize));
      const containerBoxes = ["moof", "traf", "moov", "trak", "mdia", "minf", "stbl", "mvex", "edts", "avc1", "mp4a", "styp"];
      if (containerBoxes.includes(type)) {
        let childrenParseOffset = box.contentOffset;
        if (type === "avc1" || type === "mp4a") {
          childrenParseOffset += 28;
        }
        const childrenBufferStart = offset + (childrenParseOffset - box.offset);
        const childrenBufferEnd = offset + actualSize;
        if (childrenBufferStart < childrenBufferEnd) {
          const childrenBuffer = buffer.slice(childrenBufferStart, childrenBufferEnd);
          if (childrenBuffer.byteLength > 0) {
            box.children = parseISOBMFF(childrenBuffer, childrenParseOffset);
          }
        }
      }
      if (type === "stsd") {
        const stsdHeaderLength = 16;
        const childrenBuffer = buffer.slice(offset + stsdHeaderLength, offset + actualSize);
        if (childrenBuffer.byteLength > 0) {
          box.children = parseISOBMFF(childrenBuffer, box.offset + stsdHeaderLength);
        }
      }
      boxes.push(box);
      offset += actualSize;
    }
    return boxes;
  }
  function parseBoxDetails(box, view) {
    try {
      const parser = boxParsers[box.type];
      if (parser) {
        parser(box, view);
      } else if (box.type === "mdat") {
        box.details["info"] = {
          value: "Contains raw media data for samples.",
          offset: box.contentOffset,
          length: box.size - box.headerSize
        };
      }
    } catch (e4) {
      console.error(`Error parsing ISOBMFF box "${box.type}":`, e4);
      box.details["Parsing Error"] = {
        value: e4.message,
        offset: box.offset,
        length: box.size
      };
    }
  }

  // js/features/interactive-segment/view.js
  var currentPage = 1;
  var BYTES_PER_PAGE = 1024;
  var parsedSegmentData = null;
  var boxTooltipData = getTooltipData();
  var selectedBoxOffset = null;
  var keydownListener = null;
  function findBoxByOffset(boxes, offset) {
    for (const box of boxes) {
      if (box.offset === offset) {
        return box;
      }
      if (box.children && box.children.length > 0) {
        const foundInChild = findBoxByOffset(box.children, offset);
        if (foundInChild) return foundInChild;
      }
    }
    return null;
  }
  function updateInspectorPanel(box, highlightedField = null) {
    const inspector = dom.tabContents["interactive-segment"].querySelector(".segment-inspector-panel");
    if (!inspector) return;
    if (box) {
      B(createInspectorTemplate(box, highlightedField), inspector);
      inspector.classList.remove("opacity-0");
      if (highlightedField) {
        const fieldRow = inspector.querySelector(`[data-field-name="${highlightedField}"]`);
        fieldRow?.scrollIntoView({ block: "nearest" });
      }
    } else {
      B(x``, inspector);
      inspector.classList.add("opacity-0");
    }
  }
  function applySelectionHighlight() {
    const container = dom.tabContents["interactive-segment"];
    container.querySelectorAll(".is-highlighted").forEach((el) => el.classList.remove("is-highlighted"));
    if (selectedBoxOffset !== null) {
      container.querySelectorAll(`[data-box-offset="${selectedBoxOffset}"]`).forEach((el) => {
        el.classList.add("is-highlighted");
      });
    }
  }
  function initializeSegmentViewInteractivity() {
    const container = dom.tabContents["interactive-segment"];
    if (!container || !parsedSegmentData) return;
    selectedBoxOffset = null;
    if (keydownListener) {
      document.removeEventListener("keydown", keydownListener);
    }
    keydownListener = (e4) => {
      if (e4.key === "Escape" && selectedBoxOffset !== null) {
        selectedBoxOffset = null;
        applySelectionHighlight();
        updateInspectorPanel(null);
      }
    };
    document.addEventListener("keydown", keydownListener);
    const handleHover = (e4) => {
      const target = e4.target.closest("[data-byte-offset]");
      if (!target) return;
      const byteOffset = parseInt(target.dataset.byteOffset);
      const fieldEl = target.closest("[data-field-name]");
      if (!fieldEl) return;
      const boxOffset = parseInt(fieldEl.dataset.boxOffset);
      const fieldName = fieldEl.dataset.fieldName;
      container.querySelectorAll(".is-field-highlighted, .is-char-highlighted").forEach(
        (el) => el.classList.remove("is-field-highlighted", "is-char-highlighted")
      );
      const charEl = container.querySelector(`[data-byte-offset="${byteOffset}"].${CSS.escape(baseAsciiClass.split(" ").join("."))}`);
      if (charEl) charEl.classList.add("is-char-highlighted");
      if (boxOffset >= 0 && fieldName) {
        container.querySelectorAll(`[data-box-offset="${boxOffset}"][data-field-name="${fieldName}"]`).forEach((el) => {
          el.classList.add("is-field-highlighted");
        });
        container.querySelectorAll(`[data-box-offset="${boxOffset}"][data-field-name="tree-view"]`).forEach((el) => {
          el.classList.add("is-field-highlighted");
        });
      }
      if (selectedBoxOffset === null) {
        const box = findBoxByOffset(parsedSegmentData, boxOffset);
        const isReserved = fieldName && (fieldName.includes("reserved") || fieldName.includes("Padding"));
        updateInspectorPanel(box, isReserved ? null : fieldName);
      }
    };
    const handleMouseOut = (e4) => {
      if (!e4.currentTarget.contains(e4.relatedTarget)) {
        container.querySelectorAll(".is-field-highlighted, .is-char-highlighted").forEach(
          (el) => el.classList.remove("is-field-highlighted", "is-char-highlighted")
        );
      }
    };
    container.addEventListener("mouseover", handleHover);
    container.addEventListener("mouseout", handleMouseOut);
    container.addEventListener("click", (e4) => {
      const summary = e4.target.closest("summary");
      if (summary) {
        e4.preventDefault();
      }
      const targetNode = e4.target.closest("[data-box-offset]");
      if (!targetNode) return;
      const targetOffset = parseInt(targetNode.dataset.boxOffset);
      if (selectedBoxOffset === targetOffset) {
        selectedBoxOffset = null;
        updateInspectorPanel(null);
      } else {
        selectedBoxOffset = targetOffset;
        const box = findBoxByOffset(parsedSegmentData, selectedBoxOffset);
        updateInspectorPanel(box);
      }
      applySelectionHighlight();
      if (targetNode.closest(".box-tree-area")) {
        const hexView = container.querySelector(".hex-viewer-area");
        const targetRowOffset = Math.floor(targetOffset / 16) * 16;
        const rowEl = hexView?.querySelector(`[data-row-offset="${targetRowOffset}"]`);
        rowEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
    if (parsedSegmentData.length > 0) {
      updateInspectorPanel(parsedSegmentData[0]);
    }
  }
  var createInspectorTemplate = (box, highlightedField) => {
    const boxInfo = boxTooltipData[box.type] || {};
    const fields = Object.entries(box.details).map(([key, field]) => {
      const highlightClass = key === highlightedField ? "bg-blue-900/50" : "";
      const fieldInfo = boxTooltipData[`${box.type}@${key}`];
      return x`
            <tr class="${highlightClass}" data-field-name="${key}">
                <td class="p-1 pr-2 text-xs text-gray-400 align-top" title="${fieldInfo?.text || ""}">${key}</td>
                <td class="p-1 text-xs font-mono text-white break-all">${field.value !== void 0 ? String(field.value) : "N/A"}</td>
            </tr>
        `;
    });
    return x`
        <div class="p-3 border-b border-gray-700">
            <div class="font-bold text-base mb-1">${box.type} <span class="text-sm text-gray-400">(${box.size} bytes)</span></div>
            <div class="text-xs text-emerald-400 mb-2 font-mono">${boxInfo.ref || ""}</div>
            <p class="text-xs text-gray-300">${boxInfo.text || "No description available."}</p>
        </div>
        <div class="overflow-y-auto">
            <table class="w-full table-fixed"><colgroup><col class="w-1/3"><col class="w-2/3"></colgroup><tbody>${fields}</tbody></table>
        </div>
    `;
  };
  var baseAsciiClass = "inline-block h-6 leading-6 w-4 text-center align-middle transition-colors duration-150 tracking-tight cursor-pointer";
  var renderBoxNode = (box) => x`
    <details class="text-sm" open>
        <summary class="cursor-pointer p-1 rounded hover:bg-gray-700/50 flex items-center gap-2 border-l-4 ${box.color?.border || "border-transparent"}"
                 data-box-offset="${box.offset}"
                 data-field-name="tree-view">
            <strong class="font-mono">${box.type}</strong>
            <span class="text-xs text-gray-500">@${box.offset}, ${box.size}b</span>
        </summary>
        ${box.children && box.children.length > 0 ? x`
            <div class="pl-4 border-l border-gray-700 ml-[7px]">
                ${box.children.map(renderBoxNode)}
            </div>
        ` : ""}
    </details>
`;
  var treeViewTemplate = (parsedData) => x`
    <div>
        <h4 class="text-base font-bold text-gray-300 mb-2">Box Structure</h4>
        <div class="box-tree-area bg-gray-900/50 p-2 rounded max-h-[calc(100vh-30rem)] overflow-y-auto">
            ${parsedData.map(renderBoxNode)}
        </div>
    </div>
`;
  var hexViewTemplate = (buffer, parsedData) => {
    const totalPages = Math.ceil(buffer.byteLength / BYTES_PER_PAGE);
    const startOffset = (currentPage - 1) * BYTES_PER_PAGE;
    const viewModel = generateHexAsciiView(buffer, parsedData, startOffset, BYTES_PER_PAGE);
    const changePage = (offset) => {
      const newPage = currentPage + offset;
      if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        B(getInteractiveSegmentTemplate(), dom.tabContents["interactive-segment"]);
      }
    };
    return x`
        <div class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto hex-viewer-area h-full">
            <div class="flex sticky top-0 bg-slate-800 pb-2 mb-2 border-b border-gray-600 z-10">
                <div class="w-24 flex-shrink-0 text-gray-400 font-semibold">Offset</div>
                <div class="text-gray-400 font-semibold">Hexadecimal</div>
                <div class="w-64 flex-shrink-0 text-gray-400 font-semibold ml-4">ASCII</div>
            </div>
            
            ${viewModel.map((row) => x`
                <div class="flex items-center hover:bg-slate-700/50" data-row-offset="${parseInt(row.offset, 16)}">
                    <div class="w-24 flex-shrink-0 text-gray-500 font-mono">${row.offset}</div>
                    <div class="font-mono flex items-center">${o2(row.hex)}</div>
                    <div class="w-64 flex-shrink-0 text-cyan-400 font-mono tracking-wider ml-4 flex items-center">${o2(row.ascii)}</div>
                </div>
            `)}
        </div>
        
        ${totalPages > 1 ? x`
            <div class="text-center text-sm text-gray-500 mt-2">
                Showing bytes ${startOffset} - ${Math.min(startOffset + BYTES_PER_PAGE - 1, buffer.byteLength - 1)}
                of ${buffer.byteLength} (${(buffer.byteLength / 1024).toFixed(2)} KB)
                <button @click=${() => changePage(-1)} ?disabled=${currentPage === 1} class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1">&lt;</button>
                Page ${currentPage} of ${totalPages}
                <button @click=${() => changePage(1)} ?disabled=${currentPage === totalPages} class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1">&gt;</button>
            </div>
        ` : ""}
    `;
  };
  function getInteractiveSegmentTemplate() {
    const { activeSegmentUrl, segmentCache } = analysisState;
    if (!activeSegmentUrl) {
      currentPage = 1;
      if (keydownListener) document.removeEventListener("keydown", keydownListener);
      return x`
            <div class="text-center py-12">
                <div class="text-gray-400 text-lg mb-4">📄 Interactive Segment View</div>
                <p class="text-gray-500">Select a segment from the "Segment Explorer" tab and click "View Raw" to inspect its content here.</p>
            </div>
        `;
    }
    const cachedSegment = segmentCache.get(activeSegmentUrl);
    if (!cachedSegment || cachedSegment.status === -1) {
      return x`
            <div class="text-center py-12">
                <div class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                <p class="text-gray-400">Loading and parsing segment data...</p>
            </div>
        `;
    }
    if (cachedSegment.status !== 200 || !cachedSegment.data) {
      return x`
            <div class="text-center py-12">
                <div class="text-red-400 text-lg mb-2">❌ Failed to Load</div>
                <p class="text-gray-400">Failed to fetch segment. Status: ${cachedSegment.status || "Network Error"}.</p>
            </div>
        `;
    }
    parsedSegmentData = cachedSegment.parsedData && !cachedSegment.parsedData.error ? cachedSegment.parsedData : null;
    setTimeout(() => initializeSegmentViewInteractivity(), 0);
    return x`
        <div class="mb-6">
            <h3 class="text-xl font-bold mb-2 text-white">🔍 Interactive Segment View</h3>
            <p class="text-sm text-gray-400 mb-4 font-mono break-all bg-gray-800 p-2 rounded">${activeSegmentUrl}</p>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-[minmax(300px,25%)_1fr] gap-4">
            <div class="sticky top-4 h-max">
                <div class="flex flex-col gap-4">
                <div class="segment-inspector-panel rounded-md bg-gray-900/90 border border-gray-700 transition-opacity duration-200 h-96 overflow-hidden flex flex-col">
                    <!-- Inspector content is rendered here by JS -->
                </div>
                ${parsedSegmentData ? treeViewTemplate(parsedSegmentData) : ""}
                </div>
            </div>

            <div class="overflow-auto">
                 ${hexViewTemplate(cachedSegment.data, parsedSegmentData)}
            </div>
        </div>
    `;
  }

  // js/features/segment-analysis/ts-parser.js
  var TS_PACKET_SIZE = 188;
  var SYNC_BYTE = 71;
  var streamTypes = {
    2: "MPEG-2 Video",
    27: "H.264/AVC Video",
    36: "H.265/HEVC Video",
    3: "MPEG-1 Audio",
    4: "MPEG-2 Audio",
    15: "AAC Audio (ADTS)",
    17: "AAC Audio (LATM)",
    129: "AC-3 Audio",
    135: "E-AC-3 Audio",
    6: "Private Data (e.g., Subtitles, SCTE-35)"
  };
  function parseTimestamp(view, offset) {
    const byte1 = view.getUint8(offset);
    const byte2 = view.getUint16(offset + 1);
    const byte3 = view.getUint16(offset + 3);
    const high = (byte1 & 14) >> 1;
    const mid = byte2 >> 1;
    const low = byte3 >> 1;
    return high * (1 << 30) + mid * (1 << 15) + low;
  }
  function parseTsSegment(buffer) {
    const analysis = {
      summary: {
        totalPackets: 0,
        patFound: false,
        pmtFound: false,
        errors: [],
        durationS: 0,
        ptsRange: { min: null, max: null }
      },
      pids: {}
    };
    const dataView = new DataView(buffer);
    let pmtPid = null;
    let programMap = {};
    for (let offset = 0; offset + TS_PACKET_SIZE <= buffer.byteLength; offset += TS_PACKET_SIZE) {
      if (dataView.getUint8(offset) !== SYNC_BYTE) {
        analysis.summary.errors.push(
          `Sync byte missing at offset ${offset}. Attempting to recover.`
        );
        let nextSync = -1;
        for (let i3 = offset + 1; i3 < offset + TS_PACKET_SIZE * 2 && i3 < buffer.byteLength; i3++) {
          if (dataView.getUint8(i3) === SYNC_BYTE) {
            nextSync = i3;
            break;
          }
        }
        if (nextSync !== -1) {
          offset = nextSync - TS_PACKET_SIZE;
          continue;
        } else {
          analysis.summary.errors.push(
            "Unrecoverable sync loss. Halting parse."
          );
          break;
        }
      }
      analysis.summary.totalPackets++;
      const header = dataView.getUint32(offset);
      const pid = header >> 8 & 8191;
      const payloadUnitStart = header >> 22 & 1;
      const adaptationFieldControl = header >> 20 & 3;
      const continuityCounter = header >> 24 & 15;
      if (!analysis.pids[pid]) {
        analysis.pids[pid] = {
          count: 0,
          streamType: "Unknown",
          continuityErrors: 0,
          lastContinuityCounter: null,
          pts: [],
          dts: []
        };
      }
      const pidData = analysis.pids[pid];
      pidData.count++;
      if (pidData.lastContinuityCounter !== null && adaptationFieldControl & 1) {
        const expectedCounter = (pidData.lastContinuityCounter + 1) % 16;
        if (continuityCounter !== expectedCounter) {
          pidData.continuityErrors++;
        }
      }
      pidData.lastContinuityCounter = continuityCounter;
      let payloadOffset = offset + 4;
      if (adaptationFieldControl & 2) {
        const adaptationFieldLength = dataView.getUint8(payloadOffset);
        payloadOffset += adaptationFieldLength + 1;
      }
      if (payloadUnitStart && adaptationFieldControl & 1 && payloadOffset < offset + TS_PACKET_SIZE) {
        if (pid === 0) {
          analysis.summary.patFound = true;
          const pointerField = dataView.getUint8(payloadOffset);
          const tableOffset = payloadOffset + pointerField + 1;
          if (tableOffset + 12 < offset + TS_PACKET_SIZE) {
            pmtPid = dataView.getUint16(tableOffset + 10) & 8191;
            pidData.streamType = "PAT";
          }
        } else if (pid === pmtPid) {
          analysis.summary.pmtFound = true;
          const pointerField = dataView.getUint8(payloadOffset);
          const tableOffset = payloadOffset + pointerField + 1;
          const sectionLength = dataView.getUint16(tableOffset + 1) & 4095;
          const programInfoLength = dataView.getUint16(tableOffset + 10) & 4095;
          let streamInfoOffset = tableOffset + 12 + programInfoLength;
          const endOfStreams = tableOffset + 3 + sectionLength - 4;
          pidData.streamType = `PMT`;
          while (streamInfoOffset < endOfStreams && streamInfoOffset + 5 <= offset + TS_PACKET_SIZE) {
            const streamType = dataView.getUint8(streamInfoOffset);
            const elementaryPid = dataView.getUint16(streamInfoOffset + 1) & 8191;
            const esInfoLength = dataView.getUint16(streamInfoOffset + 3) & 4095;
            programMap[elementaryPid] = streamTypes[streamType] || `Unknown (0x${streamType.toString(16)})`;
            streamInfoOffset += 5 + esInfoLength;
          }
        } else if (payloadOffset + 6 < offset + TS_PACKET_SIZE && dataView.getUint32(payloadOffset) >>> 8 === 1) {
          const ptsDtsFlags = dataView.getUint8(payloadOffset + 7) >> 6;
          let timestampOffset = payloadOffset + 9;
          if (ptsDtsFlags & 2) {
            const pts = parseTimestamp(dataView, timestampOffset);
            pidData.pts.push(pts);
            if (analysis.summary.ptsRange.min === null || pts < analysis.summary.ptsRange.min)
              analysis.summary.ptsRange.min = pts;
            if (analysis.summary.ptsRange.max === null || pts > analysis.summary.ptsRange.max)
              analysis.summary.ptsRange.max = pts;
            timestampOffset += 5;
          }
          if (ptsDtsFlags & 1) {
            const dts = parseTimestamp(dataView, timestampOffset);
            pidData.dts.push(dts);
          }
        }
      }
    }
    Object.entries(programMap).forEach(([pid, type]) => {
      if (analysis.pids[pid]) analysis.pids[pid].streamType = type;
    });
    if (analysis.summary.ptsRange.max !== null) {
      analysis.summary.durationS = parseFloat(
        ((analysis.summary.ptsRange.max - (analysis.summary.ptsRange.min || 0)) / 9e4).toFixed(3)
      );
    }
    return { format: "ts", data: analysis };
  }

  // js/features/segment-analysis/view.js
  function diffObjects(obj1, obj2) {
    const result = [];
    const allKeys = /* @__PURE__ */ new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
    for (const key of allKeys) {
      const val1 = obj1[key];
      const val2 = obj2[key];
      const isDifferent = JSON.stringify(val1) !== JSON.stringify(val2);
      result.push({
        key,
        val1: val1 !== void 0 ? val1 : "---",
        val2: val2 !== void 0 ? val2 : "---",
        isDifferent
      });
    }
    return result;
  }
  var segmentCompareTemplate = (diffData) => {
    return x`
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

            ${diffData.map(
      (item) => x`
                    <div
                        class="p-2 border-b border-r border-gray-700 font-medium text-gray-400"
                    >
                        ${item.key}
                    </div>
                    <div
                        class="p-2 border-b border-r border-gray-700 font-mono ${item.isDifferent ? "bg-red-900/50 text-red-300" : ""}"
                    >
                        ${item.key === "samples" ? x`<div class="bg-gray-900 p-2 rounded">
                                  <pre>${item.val1}</pre>
                              </div>` : item.val1}
                    </div>
                    <div
                        class="p-2 border-b border-r border-gray-700 font-mono ${item.isDifferent ? "bg-red-900/50 text-red-300" : ""}"
                    >
                         ${item.key === "samples" ? x`<div class="bg-gray-900 p-2 rounded">
                                  <pre>${item.val2}</pre>
                              </div>` : item.val2}
                    </div>
                `
    )}
        </div>
    `;
  };
  var tsAnalysisTemplate = (analysis) => {
    const sortedPids = Object.entries(analysis.pids).map(([pid, data]) => ({ pid: parseInt(pid), ...data })).sort((a2, b2) => a2.pid - b2.pid);
    const dataItem = (label, value, isBoolean = false) => x`
        <div class="text-xs">
            <span class="block text-gray-400 mb-0.5">${label}</span>
            <span
                class="block font-semibold font-mono ${isBoolean ? value ? "text-green-400" : "text-red-400" : "text-gray-200"}"
                >${isBoolean ? value ? "Yes" : "No" : value}</span
            >
        </div>
    `;
    return x`
        <div
            class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 bg-gray-900 border border-gray-700 rounded p-3 mb-4"
        >
            ${dataItem("Type", "MPEG-2 Transport Stream")}
            ${dataItem("Total Packets", analysis.summary.totalPackets)}
            ${dataItem("Est. Duration", `${analysis.summary.durationS}s`)}
            ${dataItem("PAT Found", analysis.summary.patFound, true)}
            ${dataItem("PMT Found", analysis.summary.pmtFound, true)}
        </div>

        ${analysis.summary.errors.length > 0 ? x`<div
                  class="bg-red-900/50 border border-red-700 rounded p-3 mb-4 text-red-300 text-xs"
              >
                  <p class="font-bold mb-1">Parsing Errors:</p>
                  <ul class="list-disc pl-5">
                      ${analysis.summary.errors.map((e4) => x`<li>${e4}</li>`)}
                  </ul>
              </div>` : ""}

        <div>
            <h4 class="font-semibold text-gray-300 mb-2">
                Packet Identifier (PID) Streams:
            </h4>
            <table class="w-full text-left text-xs border-collapse">
                <thead class="text-left">
                    <tr>
                        <th
                            class="p-2 border border-gray-700 bg-gray-900/50 w-1/6"
                        >
                            PID
                        </th>
                        <th
                            class="p-2 border border-gray-700 bg-gray-900/50 w-1/3"
                        >
                            Stream Type
                        </th>
                        <th
                            class="p-2 border border-gray-700 bg-gray-900/50 w-1/6"
                        >
                            Packets
                        </th>
                        <th
                            class="p-2 border border-gray-700 bg-gray-900/50 w-1/3"
                        >
                            Notes
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedPids.map(
      (pidInfo) => x`
                            <tr>
                                <td
                                    class="p-2 border border-gray-700 font-mono text-gray-400"
                                >
                                    0x${pidInfo.pid.toString(16).padStart(4, "0")}
                                    (${pidInfo.pid})
                                </td>
                                <td
                                    class="p-2 border border-gray-700 text-gray-200"
                                >
                                    ${pidInfo.streamType}
                                </td>
                                <td
                                    class="p-2 border border-gray-700 text-gray-200"
                                >
                                    ${pidInfo.count}
                                </td>
                                <td
                                    class="p-2 border border-gray-700 text-gray-200"
                                >
                                    ${pidInfo.continuityErrors > 0 ? x`<span class="text-yellow-400"
                                              >CC Errors:
                                              ${pidInfo.continuityErrors}</span
                                          >` : ""}
                                    ${pidInfo.pts.length > 0 ? x`<span
                                              >PTS Count:
                                              ${pidInfo.pts.length}</span
                                          >` : ""}
                                </td>
                            </tr>
                        `
    )}
                </tbody>
            </table>
        </div>
    `;
  };
  var isoBoxTemplate = (box) => {
    const tooltipData2 = getTooltipData();
    const boxInfo = tooltipData2[box.type] || {};
    const headerTemplate = x` <div class="font-semibold font-mono">
        <span
            class="text-emerald-300 ${boxInfo.text ? tooltipTriggerClasses2 : ""}"
            data-tooltip="${boxInfo.text || ""}"
            data-iso="${boxInfo.ref || ""}"
            >${box.type}</span
        >
        <span class="text-gray-500 text-xs"
            >${boxInfo.name ? `(${boxInfo.name}) ` : ""}(${box.size}
            bytes)</span
        >
    </div>`;
    const detailsTemplate = Object.keys(box.details).length > 0 ? x` <table
                  class="mt-2 text-xs border-collapse w-full table-auto"
              >
                  <tbody>
                      ${Object.entries(box.details).map(([key, field]) => {
      const fieldTooltip = tooltipData2[`${box.type}@${key}`];
      const valueTemplate = key === "samples" ? x`<div class="bg-gray-900 p-2 rounded">
                                        <pre>${field.value}</pre>
                                    </div>` : field.value;
      return x`<tr>
                              <td
                                  class="border border-gray-700 p-2 text-gray-400 w-1/4 ${fieldTooltip ? tooltipTriggerClasses2 : ""}"
                                  data-tooltip="${fieldTooltip?.text || ""}"
                                  data-iso="${fieldTooltip?.ref || ""}"
                              >
                                  ${key}
                              </td>
                              <td
                                  class="border border-gray-700 p-2 text-gray-200 font-mono break-all"
                              >
                                  ${valueTemplate}
                              </td>
                          </tr>`;
    })}
                  </tbody>
              </table>` : "";
    const childrenTemplate = box.children.length > 0 ? x`<ul class="list-none pl-6 mt-2 border-l border-gray-600">
                  ${box.children.map(
      (child) => x`<li class="mt-2">${isoBoxTemplate(child)}</li>`
    )}
              </ul>` : "";
    return x`${headerTemplate}${detailsTemplate}${childrenTemplate}`;
  };
  var essentialDataTemplate = (boxes) => {
    const moof = boxes.find((b2) => b2.type === "moof");
    const moov = boxes.find((b2) => b2.type === "moov");
    const dataItem = (label, value) => x`
        <div class="text-xs">
            <span class="block text-gray-400 mb-0.5">${label}</span>
            <span class="block text-gray-200 font-semibold font-mono"
                >${value}</span
            >
        </div>
    `;
    if (moof) {
      const mfhd = moof.children.find((b2) => b2.type === "mfhd");
      const traf = moof.children.find((b2) => b2.type === "traf");
      if (!mfhd || !traf) return x``;
      const tfhd = traf.children.find((b2) => b2.type === "tfhd");
      const tfdt = traf.children.find((b2) => b2.type === "tfdt");
      const trun = traf.children.find((b2) => b2.type === "trun");
      return x` <div
            class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 bg-gray-900 border border-gray-700 rounded p-3 mb-4"
        >
            ${dataItem("Type", "Media Segment")}
            ${dataItem("Sequence #", mfhd.details.sequence_number?.value || "N/A")}
            ${dataItem("Track ID", tfhd?.details.track_ID?.value || "N/A")}
            ${dataItem(
        "Base Decode Time",
        tfdt?.details.baseMediaDecodeTime?.value || "N/A"
      )}
            ${dataItem("Sample Count", trun?.details.sample_count?.value || "N/A")}
        </div>`;
    } else if (moov) {
      const mvhd = moov.children.find((b2) => b2.type === "mvhd");
      const traks = moov.children.filter((b2) => b2.type === "trak");
      return x` <div
            class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 bg-gray-900 border border-gray-700 rounded p-3 mb-4"
        >
            ${dataItem("Type", "Initialization Segment")}
            ${dataItem("Timescale", mvhd?.details.timescale?.value || "N/A")}
            ${dataItem("Duration", mvhd?.details.duration?.value || "N/A")}
            ${dataItem("Track Count", traks.length)}
        </div>`;
    }
    return x``;
  };
  var isoAnalysisTemplate = (boxes) => x`
    ${essentialDataTemplate(boxes)}
    <div>
        <ul class="list-none p-0">
            ${boxes.map((box) => x`<li>${isoBoxTemplate(box)}</li>`)}
        </ul>
    </div>
`;
  function dispatchAndRenderSegmentAnalysis(e4, buffer, bufferB = null) {
    if (!buffer) {
      B(x`<p class="fail">Segment buffer not available.</p>`, dom.modalContentArea);
      return;
    }
    const activeStream = analysisState.streams.find((s2) => s2.id === analysisState.activeStreamId);
    if (!activeStream) return;
    let segmentMimeType = "";
    if (activeStream.protocol === "hls") {
      segmentMimeType = activeStream.manifest.rawElement.map ? "video/mp4" : "video/mp2t";
    } else {
      const target = (
        /** @type {HTMLElement} */
        e4?.currentTarget
      );
      const repId = target?.dataset.repid;
      const rep = (
        /** @type {Element} */
        activeStream.manifest.rawElement.querySelector(`Representation[id="${repId}"]`)
      );
      const as = rep?.closest("AdaptationSet");
      segmentMimeType = rep?.getAttribute("mimeType") || as?.getAttribute("mimeType");
    }
    try {
      if (segmentMimeType === "video/mp2t") {
        const analysisA = parseTsSegment(buffer);
        if (bufferB) {
          const analysisB = parseTsSegment(bufferB);
          const diff = diffObjects(analysisA.data.summary, analysisB.data.summary);
          B(segmentCompareTemplate(diff), dom.modalContentArea);
        } else {
          B(tsAnalysisTemplate(analysisA.data), dom.modalContentArea);
        }
      } else {
        const url = (
          /** @type {HTMLElement} */
          (e4?.currentTarget).dataset.url
        );
        const cachedA = analysisState.segmentCache.get(url);
        if (cachedA?.parsedData && !cachedA.parsedData.error) {
          B(isoAnalysisTemplate(cachedA.parsedData), dom.modalContentArea);
        } else {
          throw new Error("Segment could not be parsed as ISOBMFF, or was not found in cache.");
        }
      }
    } catch (err) {
      console.error("Segment parsing error:", err);
      B(x`<p class="fail">Could not render segment analysis: ${err.message}.</p>`, dom.modalContentArea);
    }
  }

  // js/features/segment-explorer/dash-parser.js
  function parseAllSegmentUrls(manifestElement, baseUrl) {
    const segmentsByRep = {};
    manifestElement.querySelectorAll("Representation").forEach((rep) => {
      const repId = rep.getAttribute("id");
      segmentsByRep[repId] = [];
      const as = rep.closest("AdaptationSet");
      const period = rep.closest("Period");
      const template = rep.querySelector("SegmentTemplate") || as.querySelector("SegmentTemplate") || period.querySelector("SegmentTemplate");
      if (!template) return;
      const timescale = parseInt(template.getAttribute("timescale") || "1");
      const initTemplate = template.getAttribute("initialization");
      if (initTemplate) {
        const url = initTemplate.replace(/\$RepresentationID\$/g, repId);
        segmentsByRep[repId].push({
          repId,
          type: "Init",
          number: 0,
          resolvedUrl: new URL(url, baseUrl).href,
          template: url,
          time: -1,
          duration: 0,
          timescale
        });
      }
      const mediaTemplate = template.getAttribute("media");
      const timeline = template.querySelector("SegmentTimeline");
      if (mediaTemplate && timeline) {
        let segmentNumber = parseInt(
          template.getAttribute("startNumber") || "1"
        );
        let currentTime = 0;
        timeline.querySelectorAll("S").forEach((s2) => {
          const t3 = s2.hasAttribute("t") ? parseInt(s2.getAttribute("t")) : currentTime;
          const d2 = parseInt(s2.getAttribute("d"));
          const r2 = parseInt(s2.getAttribute("r") || "0");
          for (let i3 = 0; i3 <= r2; i3++) {
            const segTime = t3 + i3 * d2;
            const url = mediaTemplate.replace(/\$RepresentationID\$/g, repId).replace(/\$Number(%0\d+d)?\$/g, (match, padding) => {
              const width = padding ? parseInt(
                padding.substring(2, padding.length - 1)
              ) : 1;
              return String(segmentNumber).padStart(width, "0");
            }).replace(/\$Time\$/g, String(segTime));
            segmentsByRep[repId].push({
              repId,
              type: "Media",
              number: segmentNumber,
              resolvedUrl: new URL(url, baseUrl).href,
              template: url,
              time: segTime,
              duration: d2,
              timescale
            });
            segmentNumber++;
          }
          currentTime = t3 + (r2 + 1) * d2;
        });
      }
    });
    return segmentsByRep;
  }

  // js/features/segment-explorer/hls-parser.js
  function parseAllSegmentUrls2(parsedMediaPlaylist) {
    if (!parsedMediaPlaylist || !parsedMediaPlaylist.segments) {
      return {};
    }
    const segments = [];
    const mediaSequence = parsedMediaPlaylist.mediaSequence || 0;
    let currentTime = 0;
    const hlsTimescale = 9e4;
    if (parsedMediaPlaylist.map) {
      segments.push({
        repId: "hls-media",
        type: "Init",
        number: 0,
        resolvedUrl: new URL(parsedMediaPlaylist.map.URI, parsedMediaPlaylist.baseUrl).href,
        template: parsedMediaPlaylist.map.URI,
        time: -1,
        duration: 0,
        timescale: hlsTimescale
      });
    }
    parsedMediaPlaylist.segments.forEach((seg, index) => {
      segments.push({
        repId: "hls-media",
        type: "Media",
        number: mediaSequence + index,
        resolvedUrl: seg.resolvedUri,
        template: seg.uri,
        time: Math.round(currentTime * hlsTimescale),
        duration: Math.round(seg.duration * hlsTimescale),
        timescale: hlsTimescale
      });
      currentTime += seg.duration;
    });
    return {
      "media-playlist": segments
    };
  }

  // js/features/segment-explorer/parser.js
  function parseAllSegmentUrls3(stream) {
    if (stream.protocol === "hls") {
      return parseAllSegmentUrls2(stream.manifest.rawElement);
    }
    return parseAllSegmentUrls(stream.manifest.rawElement, stream.baseUrl);
  }

  // js/features/segment-explorer/api.js
  async function fetchSegment(url) {
    if (analysisState.segmentCache.has(url) && analysisState.segmentCache.get(url).status !== -1)
      return;
    try {
      analysisState.segmentCache.set(url, { status: -1, data: null, parsedData: null });
      const response = await fetch(url, { method: "GET", cache: "no-store" });
      const data = response.ok ? await response.arrayBuffer() : null;
      let parsedData = null;
      if (data) {
        try {
          parsedData = parseISOBMFF(data);
        } catch (e4) {
          console.error(`Failed to parse segment ${url}:`, e4);
          parsedData = { error: e4.message };
        }
      }
      analysisState.segmentCache.set(url, { status: response.status, data, parsedData });
    } catch (error) {
      console.error(`Failed to fetch segment ${url}:`, error);
      analysisState.segmentCache.set(url, { status: 0, data: null, parsedData: null });
    }
  }

  // js/features/segment-explorer/view.js
  var SEGMENT_PAGE_SIZE = 10;
  var HLS_PARTIAL_LOAD_COUNT = 10;
  var segmentFreshnessInterval = null;
  var allSegmentsByRep = {};
  var currentContainer = null;
  var currentStream = null;
  var expandedVariants = /* @__PURE__ */ new Set();
  var hlsSegmentCache = /* @__PURE__ */ new Map();
  var hlsLoadingVariants = /* @__PURE__ */ new Set();
  function handleSegmentCheck(e4) {
    const checkbox = (
      /** @type {HTMLInputElement} */
      e4.target
    );
    const url = checkbox.value;
    const { segmentsForCompare } = analysisState;
    if (checkbox.checked) {
      if (segmentsForCompare.length >= 2) {
        checkbox.checked = false;
        return;
      }
      if (!segmentsForCompare.includes(url)) {
        segmentsForCompare.push(url);
      }
    } else {
      const index = segmentsForCompare.indexOf(url);
      if (index > -1) {
        segmentsForCompare.splice(index, 1);
      }
    }
    const compareButton = currentContainer.querySelector("#segment-compare-btn");
    if (compareButton) {
      compareButton.textContent = `Compare Selected (${segmentsForCompare.length}/2)`;
      compareButton.toggleAttribute("disabled", segmentsForCompare.length !== 2);
    }
  }
  function handleCompareClick() {
    const { segmentsForCompare, segmentCache } = analysisState;
    if (segmentsForCompare.length !== 2) return;
    const [urlA, urlB] = segmentsForCompare;
    const segmentA = segmentCache.get(urlA);
    const segmentB = segmentCache.get(urlB);
    if (!segmentA?.data || !segmentB?.data) {
      alert("One or both selected segments have not been fetched successfully.");
      return;
    }
    dom.modalTitle.textContent = "Segment Comparison";
    dom.modalSegmentUrl.textContent = `Comparing Segment A vs. Segment B`;
    const modalContent = dom.segmentModal.querySelector("div");
    dom.segmentModal.classList.remove("opacity-0", "invisible");
    dom.segmentModal.classList.add("opacity-100", "visible");
    modalContent.classList.remove("scale-95");
    modalContent.classList.add("scale-100");
    dispatchAndRenderSegmentAnalysis(null, segmentA.data, segmentB.data);
  }
  async function loadHlsVariant(variantUri, limit = Infinity) {
    if (hlsSegmentCache.has(variantUri)) {
      expandedVariants.add(variantUri);
      renderHlsExplorer();
      return;
    }
    hlsLoadingVariants.add(variantUri);
    expandedVariants.add(variantUri);
    renderHlsExplorer();
    try {
      const response = await fetch(variantUri);
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      const rawManifest = await response.text();
      const { manifest } = await parseManifest(rawManifest, variantUri);
      const segments = parseAllSegmentUrls2(manifest.rawElement)["media-playlist"];
      hlsSegmentCache.set(variantUri, segments);
      hlsLoadingVariants.delete(variantUri);
      renderHlsExplorer();
      const segmentsToFetch = segments.slice(0, limit);
      segmentsToFetch.forEach((s2) => {
        fetchSegment(s2.resolvedUrl).then(() => {
          if (expandedVariants.has(variantUri)) {
            renderHlsExplorer();
          }
        });
      });
    } catch (err) {
      console.error(`Error loading HLS media playlist ${variantUri}:`, err);
      hlsSegmentCache.set(variantUri, { error: err.message });
      hlsLoadingVariants.delete(variantUri);
      renderHlsExplorer();
    }
  }
  var hlsRowTemplate = (rowData) => {
    switch (rowData.type) {
      case "variant":
        const isExpanded = expandedVariants.has(rowData.uri);
        const segments = hlsSegmentCache.get(rowData.uri);
        const isLoading = hlsLoadingVariants.has(rowData.uri);
        const hasError = segments?.error;
        const toggleExpand = (e4) => {
          if (e4.target.tagName === "BUTTON") return;
          if (isExpanded) {
            expandedVariants.delete(rowData.uri);
            renderHlsExplorer();
          } else {
            loadHlsVariant(rowData.uri, HLS_PARTIAL_LOAD_COUNT);
          }
        };
        return x`
                <details class="bg-gray-800 rounded-lg overflow-hidden border border-gray-700" ?open=${isExpanded}>
                    <summary @click=${toggleExpand} class="font-semibold cursor-pointer p-3 hover:bg-gray-700/70 transition-colors flex justify-between items-center list-none">
                        <div>
                            <span class="transform transition-transform inline-block ${isExpanded ? "rotate-90" : ""}">▶</span>
                            <span class="ml-2 font-semibold text-gray-200">Variant Stream ${rowData.index + 1}</span>
                            <span class="ml-3 text-xs text-gray-400 font-mono">(BW: ${rowData.bw} kbps, Res: ${rowData.res})</span>
                        </div>
                        ${hasError ? x`<span class="text-xs text-red-400">Error Loading Playlist</span>` : ""}
                    </summary>
                    <div class="p-4 border-t border-gray-600">
                        ${isLoading ? x`<div class="flex items-center justify-center p-4">
                                <div class="animate-spin inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                                <span class="ml-3 text-gray-400">Loading Media Playlist...</span>
                            </div>` : !Array.isArray(segments) ? x`
                                <div class="flex gap-4">
                                    <button @click=${() => loadHlsVariant(rowData.uri, HLS_PARTIAL_LOAD_COUNT)} class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">Load First ${HLS_PARTIAL_LOAD_COUNT} Segments</button>
                                    <button @click=${() => loadHlsVariant(rowData.uri)} class="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">Load All Segments</button>
                                </div>
                            ` : x`<table class="w-full text-left text-sm table-fixed">
                                <thead class="sticky top-0 bg-gray-800 z-10">
                                    <tr>
                                        <th class="py-2 pl-3 w-8"></th><th class="py-2 w-[15%]">Type / Status</th><th class="py-2 w-[20%]">Timing (s)</th><th class="py-2 w-[45%]">URL</th><th class="py-2 pr-3 w-[20%] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>${segments.map((s2) => segmentRowTemplate(s2))}</tbody>
                            </table>`}
                    </div>
                </details>`;
      default:
        return x``;
    }
  };
  var hlsMasterExplorerTemplate = () => {
    const variants = currentStream.manifest.rawElement.variants || [];
    const rows = variants.map((variant, index) => ({
      type: "variant",
      index,
      uri: variant.resolvedUri,
      bw: (variant.attributes.BANDWIDTH / 1e3).toFixed(0),
      res: variant.attributes.RESOLUTION || "N/A"
    }));
    return x`${rows.map(hlsRowTemplate)}`;
  };
  var segmentRowTemplate = (seg) => {
    const cacheEntry = analysisState.segmentCache.get(seg.resolvedUrl);
    let statusHtml;
    if (!cacheEntry || cacheEntry.status === -1) {
      statusHtml = x`<div class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-gray-500 animate-pulse" title="Status: Pending"></div>`;
    } else if (cacheEntry.status !== 200) {
      const statusText = cacheEntry.status === 0 ? "Network Error" : `HTTP ${cacheEntry.status}`;
      statusHtml = x`<div class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-red-500" title="Status: ${statusText}"></div><span class="text-xs text-red-400 ml-2">[${statusText}]</span>`;
    } else {
      statusHtml = x`<div class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-green-500" title="Status: OK (200)"></div>`;
    }
    const typeLabel = seg.type === "Init" ? "Init" : `Media #${seg.number}`;
    const canAnalyze = cacheEntry && cacheEntry.status === 200 && cacheEntry.data;
    const isChecked = analysisState.segmentsForCompare.includes(seg.resolvedUrl);
    const analyzeHandler = (e4) => {
      dom.modalTitle.textContent = "Segment Analysis";
      const url = (
        /** @type {HTMLElement} */
        e4.currentTarget.dataset.url
      );
      const cached = analysisState.segmentCache.get(url);
      dom.modalSegmentUrl.textContent = url;
      const modalContent = dom.segmentModal.querySelector("div");
      dom.segmentModal.classList.remove("opacity-0", "invisible");
      dom.segmentModal.classList.add("opacity-100", "visible");
      modalContent.classList.remove("scale-95");
      modalContent.classList.add("scale-100");
      dispatchAndRenderSegmentAnalysis(e4, cached?.data);
    };
    const viewRawHandler = (e4) => {
      const url = (
        /** @type {HTMLElement} */
        e4.currentTarget.dataset.url
      );
      analysisState.activeSegmentUrl = url;
      const targetTab = (
        /** @type {HTMLButtonElement} */
        document.querySelector('[data-tab="interactive-segment"]')
      );
      targetTab?.click();
    };
    const segmentTiming = seg.type === "Media" ? x`${(seg.time / seg.timescale).toFixed(2)}s (+${(seg.duration / seg.timescale).toFixed(2)}s)` : "N/A";
    return x`<tr class="border-t border-gray-700 segment-row" data-url="${seg.resolvedUrl}" data-time="${seg.time}">
        <td class="py-2 pl-3"><input type="checkbox" class="bg-gray-700 border-gray-500 rounded focus:ring-blue-500" .value=${seg.resolvedUrl} ?checked=${isChecked} @change=${handleSegmentCheck}/></td>
        <td class="py-2"><div class="flex items-center">${statusHtml}<span class="ml-2">${typeLabel}</span></div></td>
        <td class="py-2 text-xs font-mono">${segmentTiming}</td>
        <td class="py-2 font-mono text-cyan-400 truncate" title="${seg.resolvedUrl}">${seg.template}</td>
        <td class="py-2 pr-3 text-right">
            <div class="flex items-center justify-end space-x-2">
                <button class="view-raw-btn text-xs bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed" data-url="${seg.resolvedUrl}" ?disabled=${!canAnalyze} @click=${viewRawHandler}>View Raw</button>
                <button class="view-details-btn text-xs bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed" data-url="${seg.resolvedUrl}" data-repid="${seg.repId}" data-number="${seg.number}" ?disabled=${!canAnalyze} @click=${analyzeHandler}>Analyze</button>
            </div>
        </td>
    </tr>`;
  };
  async function loadAndRenderDashSegmentRange(mode) {
    const contentArea = document.getElementById("segment-explorer-content");
    B(x`<p class="info">Fetching segment data...</p>`, contentArea);
    analysisState.segmentCache.clear();
    analysisState.segmentsForCompare = [];
    stopSegmentFreshnessChecker();
    const segmentsToFetch = Object.values(allSegmentsByRep).flatMap(
      (segments) => mode === "first" ? segments.slice(0, SEGMENT_PAGE_SIZE) : segments.slice(-SEGMENT_PAGE_SIZE)
    );
    await Promise.all(segmentsToFetch.map((seg) => fetchSegment(seg.resolvedUrl)));
    const tables = Array.from(
      /** @type {Element} */
      currentStream.manifest.rawElement.querySelectorAll("Representation")
    ).map((rep) => {
      const repId = rep.getAttribute("id");
      const segments = allSegmentsByRep[repId] || [];
      const segmentsToRender = mode === "first" ? segments.slice(0, SEGMENT_PAGE_SIZE) : segments.slice(-SEGMENT_PAGE_SIZE);
      return dashSegmentTableTemplate(rep, segmentsToRender);
    });
    B(x`${tables}`, contentArea);
    if (currentStream.manifest.type === "dynamic") {
      startSegmentFreshnessChecker();
    }
  }
  var dashSegmentTableTemplate = (rep, segmentsToRender) => {
    const repId = rep.getAttribute("id");
    const bandwidth = parseInt(rep.getAttribute("bandwidth"));
    return x`<details class="bg-gray-800 rounded-lg overflow-hidden border border-gray-700" open>
        <summary class="font-semibold cursor-pointer p-3 hover:bg-gray-700/70 transition-colors flex justify-between items-center list-none">Representation: ${repId} (${(bandwidth / 1e3).toFixed(0)} kbps)</summary>
        <div class="max-h-96 overflow-y-auto">
            <table class="w-full text-left text-sm table-fixed">
                <thead class="sticky top-0 bg-gray-800 z-10">
                    <tr>
                        <th class="py-2 pl-3 w-8"></th><th class="py-2 w-[15%]">Type / Status</th><th class="py-2 w-[20%]">Timing (s)</th><th class="py-2 w-[45%]">URL</th><th class="py-2 pr-3 w-[20%] text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>${segmentsToRender.map((seg) => segmentRowTemplate(seg))}</tbody>
            </table>
        </div>
    </details>`;
  };
  function renderHlsExplorer() {
    const contentArea = document.getElementById("segment-explorer-content");
    if (contentArea) B(hlsMasterExplorerTemplate(), contentArea);
  }
  function initializeSegmentExplorer(container, stream) {
    currentContainer = container;
    currentStream = stream;
    analysisState.segmentsForCompare = [];
    allSegmentsByRep = stream.protocol === "dash" ? parseAllSegmentUrls3(stream) : {};
    expandedVariants.clear();
    hlsSegmentCache.clear();
    hlsLoadingVariants.clear();
    const isHlsMaster = stream.protocol === "hls" && stream.manifest?.rawElement?.isMaster;
    const template = x`
        <div class="flex flex-wrap justify-between items-center mb-4 gap-4">
            <h3 class="text-xl font-bold">Segment Explorer</h3>
            <div id="segment-explorer-controls" class="flex items-center flex-wrap gap-4">
                ${stream.protocol === "dash" ? x`
                    <button @click=${() => loadAndRenderDashSegmentRange("first")} class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition-colors">First ${SEGMENT_PAGE_SIZE}</button>
                    ${stream.manifest.type === "dynamic" ? x`<button @click=${() => loadAndRenderDashSegmentRange("last")} class="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-3 rounded-md transition-colors">Last ${SEGMENT_PAGE_SIZE}</button>` : ""}
                ` : ""}
                <button id="segment-compare-btn" @click=${handleCompareClick} class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                    Compare Selected (0/2)
                </button>
            </div>
        </div>
        <div id="segment-explorer-content" class="space-y-4"></div>
    `;
    B(template, container);
    const contentArea = document.getElementById("segment-explorer-content");
    if (stream.protocol === "dash") {
      loadAndRenderDashSegmentRange("first");
    } else {
      if (isHlsMaster) {
        renderHlsExplorer();
      } else {
        const segments = parseAllSegmentUrls3(stream)["media-playlist"] || [];
        segments.forEach((s2) => fetchSegment(s2.resolvedUrl).then(() => renderHlsExplorer()));
        const tableHtml = x`<div class="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <div class="max-h-96 overflow-y-auto">
                    <table class="w-full text-left text-sm table-fixed">
                         <thead class="sticky top-0 bg-gray-800 z-10">
                            <tr>
                                <th class="py-2 pl-3 w-8"></th><th class="py-2 w-[15%]">Type / Status</th><th class="py-2 w-[20%]">Timing (s)</th><th class="py-2 w-[45%]">URL</th><th class="py-2 pr-3 w-[20%] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>${segments.map((seg) => segmentRowTemplate(seg))}</tbody>
                    </table>
                </div>
            </div>`;
        B(tableHtml, contentArea);
      }
    }
  }
  function startSegmentFreshnessChecker() {
    stopSegmentFreshnessChecker();
    if (currentStream && currentStream.manifest.type === "dynamic" && currentStream.protocol === "dash") {
      segmentFreshnessInterval = setInterval(() => {
      }, 2e3);
    }
  }
  function stopSegmentFreshnessChecker() {
    if (segmentFreshnessInterval) {
      clearInterval(segmentFreshnessInterval);
      segmentFreshnessInterval = null;
    }
  }

  // js/features/comparison/view.js
  var formatBitrate2 = (bps) => {
    if (!bps || isNaN(bps)) return "N/A";
    if (bps >= 1e6) return `${(bps / 1e6).toFixed(2)} Mbps`;
    return `${(bps / 1e3).toFixed(0)} kbps`;
  };
  var sections = {
    "Manifest Properties": [
      {
        label: "Type",
        tooltip: "static vs dynamic",
        iso: "Clause 5.3.1.2",
        accessor: (manifest) => manifest.getAttribute("type")
      },
      {
        label: "Profiles",
        tooltip: "Declared feature sets",
        iso: "Clause 8.1",
        accessor: (manifest) => (manifest.getAttribute("profiles") || "").replace(/urn:mpeg:dash:profile:/g, " ").trim()
      },
      {
        label: "Min Buffer Time",
        tooltip: "Minimum client buffer time.",
        iso: "Clause 5.3.1.2",
        accessor: (manifest) => manifest.getAttribute("minBufferTime") || "N/A"
      },
      {
        label: "Live Window",
        tooltip: "DVR window for live streams.",
        iso: "Clause 5.3.1.2",
        accessor: (manifest) => manifest.getAttribute("timeShiftBufferDepth") || "N/A"
      }
    ],
    "Content Overview": [
      {
        label: "# of Periods",
        tooltip: "Number of content periods.",
        iso: "Clause 5.3.2",
        accessor: (manifest) => manifest.querySelectorAll("Period").length
      },
      {
        label: "Content Protection",
        tooltip: "Detected DRM systems.",
        iso: "Clause 5.8.4.1",
        accessor: (manifest) => {
          const schemes = [
            ...new Set(
              Array.from(
                manifest.querySelectorAll("ContentProtection")
              ).map(
                (cp) => getDrmSystemName(cp.getAttribute("schemeIdUri"))
              )
            )
          ];
          return schemes.length > 0 ? schemes.join(", ") : "No";
        }
      }
    ],
    "Video Details": [
      {
        label: "# Video Reps",
        tooltip: "Total number of video quality levels.",
        iso: "Clause 5.3.5",
        accessor: (manifest) => manifest.querySelectorAll(
          'AdaptationSet[contentType="video"] Representation, AdaptationSet[mimeType^="video"] Representation'
        ).length
      },
      {
        label: "Video Bitrates",
        tooltip: "Min and Max bandwidth values for video.",
        iso: "Table 9",
        accessor: (manifest) => {
          const b2 = Array.from(
            manifest.querySelectorAll(
              'AdaptationSet[contentType="video"] Representation, AdaptationSet[mimeType^="video"] Representation'
            )
          ).map((r2) => parseInt(r2.getAttribute("bandwidth")));
          return b2.length ? `${formatBitrate2(Math.min(...b2))} - ${formatBitrate2(Math.max(...b2))}` : "N/A";
        }
      },
      {
        label: "Video Resolutions",
        tooltip: "List of unique video resolutions.",
        iso: "Table 14",
        accessor: (manifest) => {
          const res = [
            ...new Set(
              Array.from(
                manifest.querySelectorAll(
                  'AdaptationSet[contentType="video"] Representation, AdaptationSet[mimeType^="video"] Representation'
                )
              ).map((r2) => {
                const as = r2.closest("AdaptationSet");
                const width = r2.getAttribute("width") || as.getAttribute("width");
                const height = r2.getAttribute("height") || as.getAttribute("height");
                return `${width}x${height}`;
              })
            )
          ];
          return res.map((r2) => x`<div>${r2}</div>`);
        }
      },
      {
        label: "Video Codecs",
        tooltip: "Unique video codecs.",
        iso: "Table 14",
        accessor: (manifest) => {
          const codecs = [
            ...new Set(
              Array.from(
                manifest.querySelectorAll(
                  'AdaptationSet[contentType="video"] Representation, AdaptationSet[mimeType^="video"] Representation'
                )
              ).map(
                (r2) => r2.getAttribute("codecs") || r2.closest("AdaptationSet").getAttribute("codecs")
              )
            )
          ];
          return codecs.filter(Boolean).map((c2) => x`<div>${c2}</div>`);
        }
      }
    ],
    "Audio Details": [
      {
        label: "# Audio Tracks",
        tooltip: "Groups of audio tracks, often by language.",
        iso: "Clause 5.3.3",
        accessor: (manifest) => manifest.querySelectorAll(
          'AdaptationSet[contentType="audio"], AdaptationSet[mimeType^="audio"]'
        ).length
      },
      {
        label: "Audio Languages",
        tooltip: "Declared languages for audio tracks.",
        iso: "Table 5",
        accessor: (manifest) => {
          const langs = [
            ...new Set(
              Array.from(
                manifest.querySelectorAll(
                  'AdaptationSet[contentType="audio"], AdaptationSet[mimeType^="audio"]'
                )
              ).map((as) => as.getAttribute("lang"))
            )
          ];
          return langs.filter(Boolean).join(", ") || "N/A";
        }
      },
      {
        label: "Audio Codecs",
        tooltip: "Unique audio codecs.",
        iso: "Table 14",
        accessor: (manifest) => {
          const codecs = [
            ...new Set(
              Array.from(
                manifest.querySelectorAll(
                  'AdaptationSet[contentType="audio"] Representation, AdaptationSet[mimeType^="audio"] Representation'
                )
              ).map(
                (r2) => r2.getAttribute("codecs") || r2.closest("AdaptationSet").getAttribute("codecs")
              )
            )
          ];
          return codecs.filter(Boolean).map((c2) => x`<div>${c2}</div>`);
        }
      }
    ]
  };
  var sectionTemplate = (title, items, streams) => x`
    <h3 class="text-xl font-bold mt-6 mb-2">${title}</h3>
    <div
        class="grid border-t border-l border-gray-700 divide-y divide-gray-700"
        style="grid-template-columns: 200px repeat(${streams.length}, 1fr);"
    >
        <!-- Header Row -->
        <div class="font-semibold text-gray-400 p-2 border-r border-b border-gray-700">Property</div>
        ${streams.map(
    (stream) => x`<div class="font-semibold text-gray-400 p-2 border-r border-b border-gray-700">
                    ${stream.name}
                </div>`
  )}

        <!-- Data Rows -->
        ${items.map(
    (item) => x`
                <div
                    class="font-medium text-gray-400 p-2 border-r border-gray-700 ${tooltipTriggerClasses}"
                    data-tooltip="${item.tooltip}"
                    data-iso="${item.iso}"
                >
                    ${item.label}
                </div>
                ${streams.map(
      (stream) => x`<div class="p-2 font-mono text-sm border-r border-gray-700">
                            ${item.accessor(
        /** @type {Element} */
        stream.manifest.rawElement
      )}
                        </div>`
    )}
            `
  )}
    </div>
`;
  function getComparisonTemplate() {
    const dashStreams = analysisState.streams.filter(
      (s2) => s2.protocol === "dash"
    );
    if (analysisState.streams.length < 2) {
      return x``;
    }
    if (dashStreams.length < 2) {
      return x`<div class="text-center p-8">
            <p class="text-lg text-gray-400">
                Comparison view currently only supports DASH streams.
            </p>
            <p class="text-sm text-gray-500 mt-2">
                Please select at least two DASH streams to compare.
            </p>
        </div>`;
    }
    return x`
        ${Object.entries(sections).map(
      ([title, items]) => sectionTemplate(title, items, dashStreams)
    )}
    `;
  }

  // js/protocols/dash/adapter.js
  var parseDuration2 = (durationStr) => {
    if (!durationStr) return null;
    const match = durationStr.match(
      /PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/
    );
    if (!match) return null;
    const hours = parseFloat(match[1] || "0");
    const minutes = parseFloat(match[2] || "0");
    const seconds = parseFloat(match[3] || "0");
    return hours * 3600 + minutes * 60 + seconds;
  };
  function adaptDashToIr(manifestElement) {
    const getAttr = (el, attr) => el.getAttribute(attr);
    const manifestIR = {
      type: getAttr(manifestElement, "type"),
      profiles: getAttr(manifestElement, "profiles"),
      minBufferTime: parseDuration2(getAttr(manifestElement, "minBufferTime")),
      publishTime: getAttr(manifestElement, "publishTime") ? new Date(getAttr(manifestElement, "publishTime")) : null,
      availabilityStartTime: getAttr(manifestElement, "availabilityStartTime") ? new Date(getAttr(manifestElement, "availabilityStartTime")) : null,
      timeShiftBufferDepth: parseDuration2(
        getAttr(manifestElement, "timeShiftBufferDepth")
      ),
      minimumUpdatePeriod: parseDuration2(
        getAttr(manifestElement, "minimumUpdatePeriod")
      ),
      duration: parseDuration2(
        getAttr(manifestElement, "mediaPresentationDuration")
      ),
      periods: [],
      rawElement: manifestElement
      // Keep a reference for features not yet migrated
    };
    manifestElement.querySelectorAll("Period").forEach((periodEl) => {
      const periodIR = {
        id: getAttr(periodEl, "id"),
        start: parseDuration2(getAttr(periodEl, "start")),
        duration: parseDuration2(getAttr(periodEl, "duration")),
        adaptationSets: []
      };
      periodEl.querySelectorAll("AdaptationSet").forEach((asEl) => {
        const asIR = {
          id: getAttr(asEl, "id"),
          contentType: getAttr(asEl, "contentType") || getAttr(asEl, "mimeType")?.split("/")[0],
          lang: getAttr(asEl, "lang"),
          mimeType: getAttr(asEl, "mimeType"),
          representations: [],
          contentProtection: []
        };
        asEl.querySelectorAll("ContentProtection").forEach((cpEl) => {
          asIR.contentProtection.push({
            schemeIdUri: getAttr(cpEl, "schemeIdUri"),
            system: getDrmSystemName(getAttr(cpEl, "schemeIdUri"))
          });
        });
        asEl.querySelectorAll("Representation").forEach((repEl) => {
          const repIR = {
            id: getAttr(repEl, "id"),
            codecs: getAttr(repEl, "codecs") || getAttr(asEl, "codecs"),
            bandwidth: parseInt(getAttr(repEl, "bandwidth"), 10),
            width: parseInt(getAttr(repEl, "width"), 10),
            height: parseInt(getAttr(repEl, "height"), 10)
          };
          asIR.representations.push(repIR);
        });
        periodIR.adaptationSets.push(asIR);
      });
      manifestIR.periods.push(periodIR);
    });
    return manifestIR;
  }

  // js/protocols/dash/parser.js
  async function resolveXlinks(rootElement, documentUrl, visitedUrls) {
    const XLINK_NS = "http://www.w3.org/1999/xlink";
    let linksToResolve = Array.from(
      rootElement.querySelectorAll(`[*|href]:not([data-xlink-resolved])`)
    );
    while (linksToResolve.length > 0) {
      const promises = linksToResolve.map(async (linkEl) => {
        linkEl.setAttribute("data-xlink-resolved", "true");
        const href = linkEl.getAttributeNS(XLINK_NS, "href");
        if (!href) return;
        const remoteUrl = new URL(href, documentUrl).href;
        if (visitedUrls.has(remoteUrl)) {
          console.warn(
            `Circular xlink reference detected and skipped: ${remoteUrl}`
          );
          return;
        }
        visitedUrls.add(remoteUrl);
        try {
          const response = await fetch(remoteUrl);
          if (!response.ok) {
            throw new Error(
              `HTTP Error ${response.status} fetching remote element`
            );
          }
          const fragmentString = await response.text();
          const fragmentDoc = new DOMParser().parseFromString(
            fragmentString,
            "application/xml"
          );
          if (fragmentDoc.querySelector("parsererror")) {
            throw new Error("Invalid XML in remote fragment");
          }
          const parent = linkEl.parentNode;
          const nodesToInsert = Array.from(
            fragmentDoc.documentElement.childNodes
          );
          if (nodesToInsert.length === 0 || nodesToInsert.length === 1 && nodesToInsert[0].nodeType !== Node.ELEMENT_NODE) {
            console.warn(
              `xlink:href to ${remoteUrl} resolved to an empty document. Keeping original element.`
            );
            linkEl.removeAttributeNS(XLINK_NS, "href");
          } else {
            for (const node of nodesToInsert) {
              const importedNode = rootElement.ownerDocument.importNode(node, true);
              parent.insertBefore(importedNode, linkEl);
            }
            parent.removeChild(linkEl);
          }
        } catch (error) {
          console.error(
            `Failed to resolve xlink:href="${href}": ${error.message}. Keeping original element.`
          );
          linkEl.removeAttributeNS(XLINK_NS, "href");
        }
      });
      await Promise.all(promises);
      linksToResolve = Array.from(
        rootElement.querySelectorAll(`[*|href]:not([data-xlink-resolved])`)
      );
    }
    rootElement.querySelectorAll("[data-xlink-resolved]").forEach((el) => el.removeAttribute("data-xlink-resolved"));
  }
  async function parseManifest2(xmlString, baseUrl) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");
    if (xmlDoc.querySelector("parsererror")) {
      throw new Error("Invalid XML. Check console for details.");
    }
    const manifestElement = xmlDoc.querySelector("MPD");
    if (!manifestElement) {
      throw new Error("No <MPD> element found in the document.");
    }
    await resolveXlinks(manifestElement, baseUrl, /* @__PURE__ */ new Set([baseUrl]));
    const manifestBaseElement = manifestElement.querySelector(":scope > BaseURL");
    if (manifestBaseElement && manifestBaseElement.textContent) {
      baseUrl = new URL(manifestBaseElement.textContent, baseUrl).href;
    }
    const manifest = adaptDashToIr(manifestElement);
    return { manifest, baseUrl };
  }

  // node_modules/diff/libesm/diff/base.js
  var Diff = class {
    diff(oldStr, newStr, options = {}) {
      let callback;
      if (typeof options === "function") {
        callback = options;
        options = {};
      } else if ("callback" in options) {
        callback = options.callback;
      }
      const oldString = this.castInput(oldStr, options);
      const newString = this.castInput(newStr, options);
      const oldTokens = this.removeEmpty(this.tokenize(oldString, options));
      const newTokens = this.removeEmpty(this.tokenize(newString, options));
      return this.diffWithOptionsObj(oldTokens, newTokens, options, callback);
    }
    diffWithOptionsObj(oldTokens, newTokens, options, callback) {
      var _a;
      const done = (value) => {
        value = this.postProcess(value, options);
        if (callback) {
          setTimeout(function() {
            callback(value);
          }, 0);
          return void 0;
        } else {
          return value;
        }
      };
      const newLen = newTokens.length, oldLen = oldTokens.length;
      let editLength = 1;
      let maxEditLength = newLen + oldLen;
      if (options.maxEditLength != null) {
        maxEditLength = Math.min(maxEditLength, options.maxEditLength);
      }
      const maxExecutionTime = (_a = options.timeout) !== null && _a !== void 0 ? _a : Infinity;
      const abortAfterTimestamp = Date.now() + maxExecutionTime;
      const bestPath = [{ oldPos: -1, lastComponent: void 0 }];
      let newPos = this.extractCommon(bestPath[0], newTokens, oldTokens, 0, options);
      if (bestPath[0].oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
        return done(this.buildValues(bestPath[0].lastComponent, newTokens, oldTokens));
      }
      let minDiagonalToConsider = -Infinity, maxDiagonalToConsider = Infinity;
      const execEditLength = () => {
        for (let diagonalPath = Math.max(minDiagonalToConsider, -editLength); diagonalPath <= Math.min(maxDiagonalToConsider, editLength); diagonalPath += 2) {
          let basePath;
          const removePath = bestPath[diagonalPath - 1], addPath = bestPath[diagonalPath + 1];
          if (removePath) {
            bestPath[diagonalPath - 1] = void 0;
          }
          let canAdd = false;
          if (addPath) {
            const addPathNewPos = addPath.oldPos - diagonalPath;
            canAdd = addPath && 0 <= addPathNewPos && addPathNewPos < newLen;
          }
          const canRemove = removePath && removePath.oldPos + 1 < oldLen;
          if (!canAdd && !canRemove) {
            bestPath[diagonalPath] = void 0;
            continue;
          }
          if (!canRemove || canAdd && removePath.oldPos < addPath.oldPos) {
            basePath = this.addToPath(addPath, true, false, 0, options);
          } else {
            basePath = this.addToPath(removePath, false, true, 1, options);
          }
          newPos = this.extractCommon(basePath, newTokens, oldTokens, diagonalPath, options);
          if (basePath.oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
            return done(this.buildValues(basePath.lastComponent, newTokens, oldTokens)) || true;
          } else {
            bestPath[diagonalPath] = basePath;
            if (basePath.oldPos + 1 >= oldLen) {
              maxDiagonalToConsider = Math.min(maxDiagonalToConsider, diagonalPath - 1);
            }
            if (newPos + 1 >= newLen) {
              minDiagonalToConsider = Math.max(minDiagonalToConsider, diagonalPath + 1);
            }
          }
        }
        editLength++;
      };
      if (callback) {
        (function exec() {
          setTimeout(function() {
            if (editLength > maxEditLength || Date.now() > abortAfterTimestamp) {
              return callback(void 0);
            }
            if (!execEditLength()) {
              exec();
            }
          }, 0);
        })();
      } else {
        while (editLength <= maxEditLength && Date.now() <= abortAfterTimestamp) {
          const ret = execEditLength();
          if (ret) {
            return ret;
          }
        }
      }
    }
    addToPath(path, added, removed, oldPosInc, options) {
      const last = path.lastComponent;
      if (last && !options.oneChangePerToken && last.added === added && last.removed === removed) {
        return {
          oldPos: path.oldPos + oldPosInc,
          lastComponent: { count: last.count + 1, added, removed, previousComponent: last.previousComponent }
        };
      } else {
        return {
          oldPos: path.oldPos + oldPosInc,
          lastComponent: { count: 1, added, removed, previousComponent: last }
        };
      }
    }
    extractCommon(basePath, newTokens, oldTokens, diagonalPath, options) {
      const newLen = newTokens.length, oldLen = oldTokens.length;
      let oldPos = basePath.oldPos, newPos = oldPos - diagonalPath, commonCount = 0;
      while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(oldTokens[oldPos + 1], newTokens[newPos + 1], options)) {
        newPos++;
        oldPos++;
        commonCount++;
        if (options.oneChangePerToken) {
          basePath.lastComponent = { count: 1, previousComponent: basePath.lastComponent, added: false, removed: false };
        }
      }
      if (commonCount && !options.oneChangePerToken) {
        basePath.lastComponent = { count: commonCount, previousComponent: basePath.lastComponent, added: false, removed: false };
      }
      basePath.oldPos = oldPos;
      return newPos;
    }
    equals(left, right, options) {
      if (options.comparator) {
        return options.comparator(left, right);
      } else {
        return left === right || !!options.ignoreCase && left.toLowerCase() === right.toLowerCase();
      }
    }
    removeEmpty(array) {
      const ret = [];
      for (let i3 = 0; i3 < array.length; i3++) {
        if (array[i3]) {
          ret.push(array[i3]);
        }
      }
      return ret;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    castInput(value, options) {
      return value;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tokenize(value, options) {
      return Array.from(value);
    }
    join(chars) {
      return chars.join("");
    }
    postProcess(changeObjects, options) {
      return changeObjects;
    }
    get useLongestToken() {
      return false;
    }
    buildValues(lastComponent, newTokens, oldTokens) {
      const components = [];
      let nextComponent;
      while (lastComponent) {
        components.push(lastComponent);
        nextComponent = lastComponent.previousComponent;
        delete lastComponent.previousComponent;
        lastComponent = nextComponent;
      }
      components.reverse();
      const componentLen = components.length;
      let componentPos = 0, newPos = 0, oldPos = 0;
      for (; componentPos < componentLen; componentPos++) {
        const component = components[componentPos];
        if (!component.removed) {
          if (!component.added && this.useLongestToken) {
            let value = newTokens.slice(newPos, newPos + component.count);
            value = value.map(function(value2, i3) {
              const oldValue = oldTokens[oldPos + i3];
              return oldValue.length > value2.length ? oldValue : value2;
            });
            component.value = this.join(value);
          } else {
            component.value = this.join(newTokens.slice(newPos, newPos + component.count));
          }
          newPos += component.count;
          if (!component.added) {
            oldPos += component.count;
          }
        } else {
          component.value = this.join(oldTokens.slice(oldPos, oldPos + component.count));
          oldPos += component.count;
        }
      }
      return components;
    }
  };

  // node_modules/diff/libesm/util/string.js
  function longestCommonPrefix(str1, str2) {
    let i3;
    for (i3 = 0; i3 < str1.length && i3 < str2.length; i3++) {
      if (str1[i3] != str2[i3]) {
        return str1.slice(0, i3);
      }
    }
    return str1.slice(0, i3);
  }
  function longestCommonSuffix(str1, str2) {
    let i3;
    if (!str1 || !str2 || str1[str1.length - 1] != str2[str2.length - 1]) {
      return "";
    }
    for (i3 = 0; i3 < str1.length && i3 < str2.length; i3++) {
      if (str1[str1.length - (i3 + 1)] != str2[str2.length - (i3 + 1)]) {
        return str1.slice(-i3);
      }
    }
    return str1.slice(-i3);
  }
  function replacePrefix(string, oldPrefix, newPrefix) {
    if (string.slice(0, oldPrefix.length) != oldPrefix) {
      throw Error(`string ${JSON.stringify(string)} doesn't start with prefix ${JSON.stringify(oldPrefix)}; this is a bug`);
    }
    return newPrefix + string.slice(oldPrefix.length);
  }
  function replaceSuffix(string, oldSuffix, newSuffix) {
    if (!oldSuffix) {
      return string + newSuffix;
    }
    if (string.slice(-oldSuffix.length) != oldSuffix) {
      throw Error(`string ${JSON.stringify(string)} doesn't end with suffix ${JSON.stringify(oldSuffix)}; this is a bug`);
    }
    return string.slice(0, -oldSuffix.length) + newSuffix;
  }
  function removePrefix(string, oldPrefix) {
    return replacePrefix(string, oldPrefix, "");
  }
  function removeSuffix(string, oldSuffix) {
    return replaceSuffix(string, oldSuffix, "");
  }
  function maximumOverlap(string1, string2) {
    return string2.slice(0, overlapCount(string1, string2));
  }
  function overlapCount(a2, b2) {
    let startA = 0;
    if (a2.length > b2.length) {
      startA = a2.length - b2.length;
    }
    let endB = b2.length;
    if (a2.length < b2.length) {
      endB = a2.length;
    }
    const map = Array(endB);
    let k2 = 0;
    map[0] = 0;
    for (let j2 = 1; j2 < endB; j2++) {
      if (b2[j2] == b2[k2]) {
        map[j2] = map[k2];
      } else {
        map[j2] = k2;
      }
      while (k2 > 0 && b2[j2] != b2[k2]) {
        k2 = map[k2];
      }
      if (b2[j2] == b2[k2]) {
        k2++;
      }
    }
    k2 = 0;
    for (let i3 = startA; i3 < a2.length; i3++) {
      while (k2 > 0 && a2[i3] != b2[k2]) {
        k2 = map[k2];
      }
      if (a2[i3] == b2[k2]) {
        k2++;
      }
    }
    return k2;
  }
  function trailingWs(string) {
    let i3;
    for (i3 = string.length - 1; i3 >= 0; i3--) {
      if (!string[i3].match(/\s/)) {
        break;
      }
    }
    return string.substring(i3 + 1);
  }
  function leadingWs(string) {
    const match = string.match(/^\s*/);
    return match ? match[0] : "";
  }

  // node_modules/diff/libesm/diff/word.js
  var extendedWordChars = "a-zA-Z0-9_\\u{C0}-\\u{FF}\\u{D8}-\\u{F6}\\u{F8}-\\u{2C6}\\u{2C8}-\\u{2D7}\\u{2DE}-\\u{2FF}\\u{1E00}-\\u{1EFF}";
  var tokenizeIncludingWhitespace = new RegExp(`[${extendedWordChars}]+|\\s+|[^${extendedWordChars}]`, "ug");
  var WordDiff = class extends Diff {
    equals(left, right, options) {
      if (options.ignoreCase) {
        left = left.toLowerCase();
        right = right.toLowerCase();
      }
      return left.trim() === right.trim();
    }
    tokenize(value, options = {}) {
      let parts;
      if (options.intlSegmenter) {
        const segmenter = options.intlSegmenter;
        if (segmenter.resolvedOptions().granularity != "word") {
          throw new Error('The segmenter passed must have a granularity of "word"');
        }
        parts = Array.from(segmenter.segment(value), (segment) => segment.segment);
      } else {
        parts = value.match(tokenizeIncludingWhitespace) || [];
      }
      const tokens = [];
      let prevPart = null;
      parts.forEach((part) => {
        if (/\s/.test(part)) {
          if (prevPart == null) {
            tokens.push(part);
          } else {
            tokens.push(tokens.pop() + part);
          }
        } else if (prevPart != null && /\s/.test(prevPart)) {
          if (tokens[tokens.length - 1] == prevPart) {
            tokens.push(tokens.pop() + part);
          } else {
            tokens.push(prevPart + part);
          }
        } else {
          tokens.push(part);
        }
        prevPart = part;
      });
      return tokens;
    }
    join(tokens) {
      return tokens.map((token, i3) => {
        if (i3 == 0) {
          return token;
        } else {
          return token.replace(/^\s+/, "");
        }
      }).join("");
    }
    postProcess(changes, options) {
      if (!changes || options.oneChangePerToken) {
        return changes;
      }
      let lastKeep = null;
      let insertion = null;
      let deletion = null;
      changes.forEach((change) => {
        if (change.added) {
          insertion = change;
        } else if (change.removed) {
          deletion = change;
        } else {
          if (insertion || deletion) {
            dedupeWhitespaceInChangeObjects(lastKeep, deletion, insertion, change);
          }
          lastKeep = change;
          insertion = null;
          deletion = null;
        }
      });
      if (insertion || deletion) {
        dedupeWhitespaceInChangeObjects(lastKeep, deletion, insertion, null);
      }
      return changes;
    }
  };
  var wordDiff = new WordDiff();
  function diffWords(oldStr, newStr, options) {
    if ((options === null || options === void 0 ? void 0 : options.ignoreWhitespace) != null && !options.ignoreWhitespace) {
      return diffWordsWithSpace(oldStr, newStr, options);
    }
    return wordDiff.diff(oldStr, newStr, options);
  }
  function dedupeWhitespaceInChangeObjects(startKeep, deletion, insertion, endKeep) {
    if (deletion && insertion) {
      const oldWsPrefix = leadingWs(deletion.value);
      const oldWsSuffix = trailingWs(deletion.value);
      const newWsPrefix = leadingWs(insertion.value);
      const newWsSuffix = trailingWs(insertion.value);
      if (startKeep) {
        const commonWsPrefix = longestCommonPrefix(oldWsPrefix, newWsPrefix);
        startKeep.value = replaceSuffix(startKeep.value, newWsPrefix, commonWsPrefix);
        deletion.value = removePrefix(deletion.value, commonWsPrefix);
        insertion.value = removePrefix(insertion.value, commonWsPrefix);
      }
      if (endKeep) {
        const commonWsSuffix = longestCommonSuffix(oldWsSuffix, newWsSuffix);
        endKeep.value = replacePrefix(endKeep.value, newWsSuffix, commonWsSuffix);
        deletion.value = removeSuffix(deletion.value, commonWsSuffix);
        insertion.value = removeSuffix(insertion.value, commonWsSuffix);
      }
    } else if (insertion) {
      if (startKeep) {
        const ws = leadingWs(insertion.value);
        insertion.value = insertion.value.substring(ws.length);
      }
      if (endKeep) {
        const ws = leadingWs(endKeep.value);
        endKeep.value = endKeep.value.substring(ws.length);
      }
    } else if (startKeep && endKeep) {
      const newWsFull = leadingWs(endKeep.value), delWsStart = leadingWs(deletion.value), delWsEnd = trailingWs(deletion.value);
      const newWsStart = longestCommonPrefix(newWsFull, delWsStart);
      deletion.value = removePrefix(deletion.value, newWsStart);
      const newWsEnd = longestCommonSuffix(removePrefix(newWsFull, newWsStart), delWsEnd);
      deletion.value = removeSuffix(deletion.value, newWsEnd);
      endKeep.value = replacePrefix(endKeep.value, newWsFull, newWsEnd);
      startKeep.value = replaceSuffix(startKeep.value, newWsFull, newWsFull.slice(0, newWsFull.length - newWsEnd.length));
    } else if (endKeep) {
      const endKeepWsPrefix = leadingWs(endKeep.value);
      const deletionWsSuffix = trailingWs(deletion.value);
      const overlap = maximumOverlap(deletionWsSuffix, endKeepWsPrefix);
      deletion.value = removeSuffix(deletion.value, overlap);
    } else if (startKeep) {
      const startKeepWsSuffix = trailingWs(startKeep.value);
      const deletionWsPrefix = leadingWs(deletion.value);
      const overlap = maximumOverlap(startKeepWsSuffix, deletionWsPrefix);
      deletion.value = removePrefix(deletion.value, overlap);
    }
  }
  var WordsWithSpaceDiff = class extends Diff {
    tokenize(value) {
      const regex = new RegExp(`(\\r?\\n)|[${extendedWordChars}]+|[^\\S\\n\\r]+|[^${extendedWordChars}]`, "ug");
      return value.match(regex) || [];
    }
  };
  var wordsWithSpaceDiff = new WordsWithSpaceDiff();
  function diffWordsWithSpace(oldStr, newStr, options) {
    return wordsWithSpaceDiff.diff(oldStr, newStr, options);
  }

  // js/features/manifest-updates/diff.js
  function escapeHtml2(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function diffManifest(oldManifest, newManifest) {
    const changes = diffWords(oldManifest, newManifest);
    let html = "";
    changes.forEach((part) => {
      if (part.removed) {
        return;
      }
      const escapedValue = escapeHtml2(part.value);
      if (part.added) {
        html += `<span class="bg-emerald-500/40 text-green-50 rounded-sm font-medium">${escapedValue}</span>`;
      } else {
        html += escapedValue;
      }
    });
    return html;
  }

  // js/features/manifest-updates/poll.js
  var import_xml_formatter = __toESM(require_cjs2());
  var manifestUpdateInterval = null;
  function startManifestUpdatePolling(stream, onUpdate) {
    if (manifestUpdateInterval) {
      clearInterval(manifestUpdateInterval);
    }
    const updatePeriodSeconds = stream.manifest.minimumUpdatePeriod;
    if (!updatePeriodSeconds) return;
    const updatePeriodMs = updatePeriodSeconds * 1e3;
    const pollInterval = Math.max(updatePeriodMs, 2e3);
    let originalManifestString = stream.rawXml;
    manifestUpdateInterval = setInterval(async () => {
      try {
        const response = await fetch(stream.originalUrl);
        if (!response.ok) return;
        const newManifestString = await response.text();
        if (newManifestString !== originalManifestString) {
          const { manifest: newManifest } = await parseManifest2(
            newManifestString,
            stream.baseUrl
          );
          const oldManifestForDiff = originalManifestString;
          stream.manifest = newManifest;
          stream.rawXml = newManifestString;
          originalManifestString = newManifestString;
          const formattingOptions = {
            indentation: "  ",
            lineSeparator: "\n"
          };
          const formattedOldManifest = (0, import_xml_formatter.default)(
            oldManifestForDiff,
            formattingOptions
          );
          const formattedNewManifest = (0, import_xml_formatter.default)(
            newManifestString,
            formattingOptions
          );
          const diffHtml = diffManifest(formattedOldManifest, formattedNewManifest);
          analysisState.manifestUpdates.unshift({
            timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
            diffHtml
          });
          if (analysisState.manifestUpdates.length > 20) {
            analysisState.manifestUpdates.pop();
          }
          if (onUpdate) {
            onUpdate();
          }
        }
      } catch (e4) {
        console.error("[MANIFEST-POLL] Error fetching update:", e4);
      }
    }, pollInterval);
  }
  function stopManifestUpdatePolling() {
    if (manifestUpdateInterval) {
      clearInterval(manifestUpdateInterval);
      manifestUpdateInterval = null;
    }
  }

  // js/features/manifest-updates/view.js
  var togglePollingBtn;
  var manifestUpdatesTemplate = (stream) => {
    if (analysisState.streams.length > 1) {
      return x`<p class="warn">
            Manifest update polling is only supported when analyzing a single stream.
        </p>`;
    }
    if (!stream || stream.manifest.type !== "dynamic") {
      return x`<p class="info">
            This is a static manifest. No updates are expected.
        </p>`;
    }
    const { manifestUpdates, activeManifestUpdateIndex } = analysisState;
    const updateCount = manifestUpdates.length;
    if (updateCount === 0) {
      return x`<p class="info">Awaiting first manifest update...</p>`;
    }
    const currentIndex = updateCount - activeManifestUpdateIndex;
    const currentUpdate = manifestUpdates[activeManifestUpdateIndex];
    const lines = currentUpdate.diffHtml.split("\n");
    const updateLabel = activeManifestUpdateIndex === manifestUpdates.length - 1 ? "Initial Manifest loaded:" : "Update received at:";
    const currentDisplay = x` <div class="text-sm text-gray-400 mb-2">
            ${updateLabel}
            <span class="font-semibold text-gray-200"
                >${currentUpdate.timestamp}</span
            >
        </div>
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            ${lines.map(
      (line, i3) => x`
                    <div class="flex">
                        <span
                            class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-10"
                            >${i3 + 1}</span
                        >
                        <span
                            class="flex-grow whitespace-pre-wrap break-all"
                            >${o2(line)}</span
                        >
                    </div>
                `
    )}
        </div>`;
    return x` <div
            class="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-2 sm:space-y-0"
        >
            <button
                id="toggle-polling-btn"
                class="px-4 py-2 rounded-md font-bold transition duration-300 w-full sm:w-auto text-white"
                @click=${togglePollingState}
            >
                <!-- Content set by updatePollingButton -->
            </button>
            <div class="flex items-center space-x-2">
                <button
                    id="prev-manifest-btn"
                    class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                    title="Previous Update (Right Arrow)"
                    ?disabled=${activeManifestUpdateIndex >= updateCount - 1}
                    @click=${() => navigateManifestUpdates(1)}
                >
                    &lt;
                </button>
                <span
                    id="manifest-index-display"
                    class="text-gray-400 font-semibold w-16 text-center"
                    >${currentIndex}/${updateCount}</span
                >
                <button
                    id="next-manifest-btn"
                    class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                    title="Next Update (Left Arrow)"
                    ?disabled=${activeManifestUpdateIndex <= 0}
                    @click=${() => navigateManifestUpdates(-1)}
                >
                    &gt;
                </button>
            </div>
        </div>
        <div id="current-manifest-update" class="manifest-update-entry">
            ${currentDisplay}
        </div>`;
  };
  function renderManifestUpdates(streamId) {
    const updatesContainer = (
      /** @type {HTMLDivElement} */
      dom.tabContents.updates.querySelector("#mpd-updates-content")
    );
    if (!updatesContainer) return;
    const stream = analysisState.streams.find((s2) => s2.id === streamId);
    B(manifestUpdatesTemplate(stream), updatesContainer);
    togglePollingBtn = document.getElementById("toggle-polling-btn");
    updatePollingButton();
  }
  function togglePollingState() {
    analysisState.isPollingActive = !analysisState.isPollingActive;
    if (analysisState.isPollingActive) {
      const stream = analysisState.streams.find(
        (s2) => s2.id === analysisState.activeStreamId
      );
      if (stream && stream.manifest.type === "dynamic") {
        const onUpdateCallback = () => renderManifestUpdates(stream.id);
        startManifestUpdatePolling(stream, onUpdateCallback);
      }
    } else {
      stopManifestUpdatePolling();
    }
    updatePollingButton();
  }
  function updatePollingButton() {
    if (!togglePollingBtn) return;
    const stream = analysisState.streams[0];
    if (!stream || stream.manifest.type !== "dynamic" || analysisState.streams.length > 1) {
      togglePollingBtn.style.display = "none";
      return;
    }
    togglePollingBtn.style.display = "block";
    togglePollingBtn.textContent = analysisState.isPollingActive ? "Stop Polling" : "Start Polling";
    togglePollingBtn.classList.toggle(
      "bg-red-600",
      analysisState.isPollingActive
    );
    togglePollingBtn.classList.toggle(
      "hover:bg-red-700",
      analysisState.isPollingActive
    );
    togglePollingBtn.classList.toggle(
      "bg-blue-600",
      !analysisState.isPollingActive
    );
    togglePollingBtn.classList.toggle(
      "hover:bg-blue-700",
      !analysisState.isPollingActive
    );
  }
  function navigateManifestUpdates(direction) {
    const { manifestUpdates } = analysisState;
    if (manifestUpdates.length === 0) return;
    let newIndex = analysisState.activeManifestUpdateIndex + direction;
    newIndex = Math.max(0, Math.min(newIndex, manifestUpdates.length - 1));
    if (newIndex !== analysisState.activeManifestUpdateIndex) {
      analysisState.activeManifestUpdateIndex = newIndex;
      renderManifestUpdates(analysisState.activeStreamId);
    }
  }

  // js/data/example-streams.js
  var exampleStreams = [
    {
      name: "DASH-IF: Big Buck Bunny (On-Demand)",
      url: "https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd"
    },
    {
      name: "DASH-IF: Live Simulcast",
      url: "https://livesim.dashif.org/livesim/scte35_2/testpic_2s/Manifest.mpd"
    },
    {
      name: "Bitmovin: Art of Motion (DASH)",
      url: "https://bitmovin-a.akamaihd.net/content/MI201109210084_1/mpds/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.mpd"
    },
    {
      name: "Apple: Bip-Bop (HLS, Master)",
      url: "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8"
    },
    {
      name: "Akamai: Sintel (HLS, fMP4)",
      url: "https://stream.akamaized.net/s/sintel/multi/multi.m3u8"
    },
    {
      name: "Unified Streaming: Tears of Steel (HLS, Live)",
      url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8"
    }
  ];

  // js/ui.js
  var keyboardNavigationListener = null;
  var tooltipTriggerClasses2 = "cursor-help border-b border-dotted border-blue-500/40 transition-colors hover:bg-blue-500/15 hover:border-solid";
  var streamInputTemplate = (streamId, isFirstStream, urlHistory, exampleStreams2) => {
    const exampleOptions = exampleStreams2.map(
      (stream) => x`<option value="${stream.url}">${stream.name}</option>`
    );
    const historyOptions = urlHistory.map((url) => {
      try {
        return x`<option value="${url}">
                ${new URL(url).hostname}
            </option>`;
      } catch (_e) {
        return x`<option value="${url}">${url}</option>`;
      }
    });
    const removeHandler = (e4) => {
      e4.target.closest(".stream-input-group").remove();
    };
    return x` <div
        class="stream-input-group ${streamId > 0 ? "border-t border-gray-700 pt-6 mt-6" : ""}"
        data-id="${streamId}"
    >
        <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold text-gray-300">
                Stream ${streamId + 1}
            </h3>
            ${streamId > 0 ? x`<button
                      class="remove-stream-btn text-red-400 hover:text-red-600 font-bold text-sm"
                      @click=${removeHandler}
                  >
                      &times; Remove
                  </button>` : ""}
        </div>
        <div class="space-y-3">
            <div class="flex flex-col sm:flex-row items-center gap-4">
                <input
                    type="url"
                    id="url-${streamId}"
                    class="input-url w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Manifest URL (.mpd, .m3u8)..."
                    .value=${isFirstStream && urlHistory.length > 0 ? urlHistory[0] : ""}
                />
                <span class="text-gray-500">OR</span>
                <label
                    for="file-${streamId}"
                    class="block w-full sm:w-auto cursor-pointer bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md text-center flex-shrink-0"
                    >Upload File</label
                >
                <input
                    type="file"
                    id="file-${streamId}"
                    class="input-file hidden"
                    accept=".mpd, .xml, .m3u8"
                    @change=${handleFileChange}
                />
            </div>
            <div class="flex flex-col sm:flex-row items-center gap-4">
                <select
                    class="examples-dropdown w-full bg-gray-700 text-white rounded-md border-gray-600 p-2 text-sm"
                    @change=${handleDropdownChange}
                >
                    <option value="">
                        -- Select from Examples or History --
                    </option>
                    <optgroup label="Examples">${exampleOptions}</optgroup>
                    ${historyOptions.length > 0 ? x`<optgroup label="History">
                              ${historyOptions}
                          </optgroup>` : ""}
                </select>
                <p
                    class="file-name-display text-xs text-gray-500 h-4 w-full sm:w-auto flex-shrink-0"
                ></p>
            </div>
        </div>
    </div>`;
  };
  var handleFileChange = (e4) => {
    const fileInput = (
      /** @type {HTMLInputElement} */
      e4.target
    );
    const group = fileInput.closest(".stream-input-group");
    const file = fileInput.files[0];
    if (file) {
      group.querySelector(".file-name-display").textContent = `Selected: ${file.name}`;
      group.querySelector(".input-url").value = "";
      group.querySelector(".examples-dropdown").value = "";
    }
  };
  var handleDropdownChange = (e4) => {
    const dropdown = (
      /** @type {HTMLSelectElement} */
      e4.target
    );
    const group = dropdown.closest(".stream-input-group");
    if (dropdown.value) {
      group.querySelector(".input-url").value = dropdown.value;
      group.querySelector(".input-file").value = "";
      group.querySelector(".file-name-display").textContent = "";
    }
  };
  function addStreamInput() {
    const streamId = analysisState.streamIdCounter++;
    const isFirstStream = streamId === 0;
    const urlHistory = JSON.parse(
      localStorage.getItem("dash_analyzer_history") || "[]"
    );
    const container = document.createElement("div");
    B(
      streamInputTemplate(
        streamId,
        isFirstStream,
        urlHistory,
        exampleStreams
      ),
      container
    );
    dom.streamInputs.appendChild(container.firstElementChild);
  }
  function handleTabClick(e4) {
    const target = (
      /** @type {HTMLElement} */
      e4.target
    );
    const targetTab = (
      /** @type {HTMLElement} */
      target.closest("[data-tab]")
    );
    if (!targetTab) return;
    stopSegmentFreshnessChecker();
    stopManifestUpdatePolling();
    if (keyboardNavigationListener) {
      document.removeEventListener("keydown", keyboardNavigationListener);
      keyboardNavigationListener = null;
    }
    const activeClasses = ["border-blue-600", "text-gray-100", "bg-gray-700"];
    const inactiveClasses = ["border-transparent"];
    dom.tabs.querySelectorAll("[data-tab]").forEach((t3) => {
      t3.classList.remove(...activeClasses);
      t3.classList.add(...inactiveClasses);
    });
    targetTab.classList.add(...activeClasses);
    targetTab.classList.remove(...inactiveClasses);
    Object.values(dom.tabContents).forEach((c2) => {
      if (c2) c2.classList.add("hidden");
    });
    const activeTabName = targetTab.dataset.tab;
    const activeTabContent = dom.tabContents[activeTabName];
    if (activeTabContent) activeTabContent.classList.remove("hidden");
    if (activeTabName === "interactive-segment") {
      B(
        getInteractiveSegmentTemplate(),
        dom.tabContents["interactive-segment"]
      );
    }
    if (activeTabName === "interactive-manifest") {
      renderSingleStreamTabs(analysisState.activeStreamId);
    }
    if (activeTabName === "explorer") {
      startSegmentFreshnessChecker();
    } else if (activeTabName === "updates") {
      if (analysisState.isPollingActive && analysisState.streams.length === 1 && analysisState.streams[0].manifest.type === "dynamic") {
        const stream = analysisState.streams[0];
        const onUpdateCallback = () => renderManifestUpdates(stream.id);
        startManifestUpdatePolling(stream, onUpdateCallback);
      }
      keyboardNavigationListener = (event) => {
        if (event.key === "ArrowLeft") navigateManifestUpdates(1);
        if (event.key === "ArrowRight") navigateManifestUpdates(-1);
      };
      document.addEventListener("keydown", keyboardNavigationListener);
    }
    updatePollingButton();
  }
  function populateContextSwitcher() {
    if (analysisState.streams.length > 1) {
      dom.contextSwitcherContainer.classList.remove("hidden");
      const optionsTemplate = analysisState.streams.map(
        (s2) => x`<option value="${s2.id}">${s2.name} (${s2.protocol.toUpperCase()})</option>`
      );
      B(optionsTemplate, dom.contextSwitcher);
      dom.contextSwitcher.value = String(analysisState.activeStreamId);
    } else {
      dom.contextSwitcherContainer.classList.add("hidden");
    }
  }
  function renderAllTabs() {
    const hasMultipleStreams = analysisState.streams.length > 1;
    document.querySelector('[data-tab="comparison"]').style.display = hasMultipleStreams ? "block" : "none";
    document.querySelector('[data-tab="summary"]').style.display = hasMultipleStreams ? "none" : "block";
    dom.tabContents["interactive-manifest"].innerHTML = "";
    if (hasMultipleStreams) {
      B(getComparisonTemplate(), dom.tabContents.comparison);
    }
    renderSingleStreamTabs(analysisState.activeStreamId);
  }
  function showStatus(message, type) {
    const colors = {
      info: "text-blue-400",
      pass: "text-green-400",
      warn: "text-yellow-400",
      fail: "text-red-400"
    };
    dom.status.textContent = message;
    dom.status.className = `text-center my-4 ${colors[type]}`;
  }
  function renderSingleStreamTabs(streamId) {
    const stream = analysisState.streams.find((s2) => s2.id === streamId);
    if (!stream) return;
    const { manifest, protocol } = stream;
    if (protocol === "hls" && !stream.mediaPlaylists.has("master")) {
      stream.mediaPlaylists.set("master", {
        manifest: stream.manifest,
        rawManifest: stream.rawManifest,
        lastFetched: /* @__PURE__ */ new Date()
      });
    }
    if (analysisState.streams.length === 1) {
      B(getGlobalSummaryTemplate(manifest), dom.tabContents.summary);
    }
    B(getComplianceReportTemplate(manifest, protocol), dom.tabContents.compliance);
    attachComplianceFilterListeners();
    B(getTimelineAndVisualsTemplate(manifest, protocol), dom.tabContents["timeline-visuals"]);
    B(getFeaturesAnalysisTemplate(manifest, protocol), dom.tabContents.features);
    B(getInteractiveManifestTemplate(stream), dom.tabContents["interactive-manifest"]);
    B(getInteractiveSegmentTemplate(), dom.tabContents["interactive-segment"]);
    initializeSegmentExplorer(dom.tabContents.explorer, stream);
    renderManifestUpdates(streamId);
  }

  // js/tooltip.js
  function setupGlobalTooltipListener() {
    document.body.addEventListener("mouseover", (e4) => {
      const target = (
        /** @type {HTMLElement} */
        e4.target
      );
      const tooltipTrigger = (
        /** @type {HTMLElement} */
        target.closest("[data-tooltip]")
      );
      if (!tooltipTrigger) {
        dom.globalTooltip.style.visibility = "hidden";
        dom.globalTooltip.style.opacity = "0";
        return;
      }
      const text = tooltipTrigger.dataset.tooltip || "";
      const isoRef = tooltipTrigger.dataset.iso || "";
      if (!text) return;
      const tooltipContent = `${text}${isoRef ? `<span class="block mt-1 font-medium text-emerald-300">${isoRef}</span>` : ""}`;
      dom.globalTooltip.innerHTML = tooltipContent;
      const targetRect = tooltipTrigger.getBoundingClientRect();
      const tooltipRect = dom.globalTooltip.getBoundingClientRect();
      let left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
      if (left < 10) left = 10;
      if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
      }
      dom.globalTooltip.style.left = `${left}px`;
      dom.globalTooltip.style.top = `${targetRect.top - tooltipRect.height - 8}px`;
      dom.globalTooltip.style.visibility = "visible";
      dom.globalTooltip.style.opacity = "1";
    });
    document.body.addEventListener("mouseout", (e4) => {
      const target = (
        /** @type {HTMLElement} */
        e4.target
      );
      const relatedTarget = (
        /** @type {HTMLElement} */
        e4.relatedTarget
      );
      const tooltipTrigger = target.closest("[data-tooltip]");
      if (tooltipTrigger && !tooltipTrigger.contains(relatedTarget)) {
        dom.globalTooltip.style.visibility = "hidden";
        dom.globalTooltip.style.opacity = "0";
      }
    });
  }

  // js/main.js
  var import_xml_formatter2 = __toESM(require_cjs2());
  var HISTORY_KEY = "dash_analyzer_history";
  var MAX_HISTORY_ITEMS = 10;
  dom.addStreamBtn.addEventListener("click", addStreamInput);
  dom.analyzeBtn.addEventListener("click", handleAnalysis);
  dom.tabs.addEventListener("click", handleTabClick);
  dom.closeModalBtn.addEventListener("click", () => {
    const modalContent = dom.segmentModal.querySelector("div");
    dom.segmentModal.classList.add("opacity-0", "invisible");
    dom.segmentModal.classList.remove("opacity-100", "visible");
    modalContent.classList.add("scale-95");
    modalContent.classList.remove("scale-100");
  });
  dom.contextSwitcher.addEventListener("change", (e4) => {
    const target = (
      /** @type {HTMLSelectElement} */
      e4.target
    );
    analysisState.activeStreamId = parseInt(target.value);
    renderAllTabs();
  });
  document.addEventListener("DOMContentLoaded", () => {
    addStreamInput();
    setupGlobalTooltipListener();
  });
  function saveUrlToHistory(url) {
    if (!url) return;
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    history = history.filter((item) => item !== url);
    history.unshift(url);
    if (history.length > MAX_HISTORY_ITEMS) {
      history.length = MAX_HISTORY_ITEMS;
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }
  async function handleAnalysis() {
    stopManifestUpdatePolling();
    showStatus("Starting analysis...", "info");
    analysisState.streams = [];
    analysisState.manifestUpdates = [];
    analysisState.activeManifestUpdateIndex = 0;
    const inputGroups = dom.streamInputs.querySelectorAll(
      ".stream-input-group"
    );
    const promises = Array.from(inputGroups).map(async (group) => {
      const id = parseInt(
        /** @type {HTMLElement} */
        group.dataset.id
      );
      const urlInput = (
        /** @type {HTMLInputElement} */
        group.querySelector(".input-url")
      );
      const fileInput = (
        /** @type {HTMLInputElement} */
        group.querySelector(".input-file")
      );
      let manifestString = "";
      let name = `Stream ${id + 1}`;
      let originalUrl = "";
      let baseUrl = "";
      let protocol = "unknown";
      try {
        if (urlInput.value) {
          originalUrl = urlInput.value;
          name = new URL(originalUrl).hostname;
          baseUrl = new URL(originalUrl, window.location.href).href;
          if (originalUrl.toLowerCase().includes(".m3u8")) {
            protocol = "hls";
          } else if (originalUrl.toLowerCase().includes(".mpd")) {
            protocol = "dash";
          } else {
            protocol = "dash";
          }
          showStatus(`Fetching ${name}...`, "info");
          const response = await fetch(originalUrl);
          if (!response.ok)
            throw new Error(`HTTP Error ${response.status}`);
          manifestString = await response.text();
          saveUrlToHistory(originalUrl);
        } else if (fileInput.files.length > 0) {
          const file = fileInput.files[0];
          name = file.name;
          baseUrl = window.location.href;
          if (name.toLowerCase().includes(".m3u8")) {
            protocol = "hls";
          } else {
            protocol = "dash";
          }
          showStatus(`Reading ${name}...`, "info");
          manifestString = await file.text();
        } else {
          return null;
        }
        showStatus(
          `Parsing (${protocol.toUpperCase()}) and resolving remote elements for ${name}...`,
          "info"
        );
        let parseResult;
        if (protocol === "hls") {
          parseResult = await parseManifest(manifestString, baseUrl);
        } else {
          parseResult = await parseManifest2(manifestString, baseUrl);
        }
        const { manifest, baseUrl: newBaseUrl } = parseResult;
        baseUrl = newBaseUrl;
        return {
          id,
          name,
          originalUrl,
          baseUrl,
          protocol,
          manifest,
          rawManifest: manifestString,
          mediaPlaylists: /* @__PURE__ */ new Map(),
          activeMediaPlaylistUrl: null
        };
      } catch (error) {
        showStatus(
          `Failed to process stream ${id + 1} (${name}): ${error.message}`,
          "fail"
        );
        console.error(`Error details for stream ${id + 1}:`, error);
        throw error;
      }
    });
    try {
      const results = await Promise.all(promises);
      analysisState.streams = results.filter(Boolean);
      if (analysisState.streams.length === 0) {
        showStatus("No valid streams to analyze.", "warn");
        return;
      }
      analysisState.streams.sort((a2, b2) => a2.id - b2.id);
      analysisState.activeStreamId = analysisState.streams[0].id;
      const activeStream = analysisState.streams[0];
      const isSingleDynamicStream = analysisState.streams.length === 1 && activeStream.manifest.type === "dynamic";
      analysisState.isPollingActive = isSingleDynamicStream;
      if (isSingleDynamicStream) {
        let initialDiffHtml;
        if (activeStream.protocol === "dash") {
          const formattingOptions = {
            indentation: "  ",
            lineSeparator: "\n"
          };
          const formattedInitial = (0, import_xml_formatter2.default)(
            activeStream.rawManifest,
            formattingOptions
          );
          initialDiffHtml = diffManifest("", formattedInitial);
        } else {
          initialDiffHtml = diffManifest("", activeStream.rawManifest);
        }
        analysisState.manifestUpdates.push({
          timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
          diffHtml: initialDiffHtml
        });
      }
      const defaultTab = analysisState.streams.length > 1 ? "comparison" : "summary";
      populateContextSwitcher();
      renderAllTabs();
      showStatus(
        `Analysis Complete for ${analysisState.streams.length} stream(s).`,
        "pass"
      );
      dom.results.classList.remove("hidden");
      document.querySelector(`[data-tab="${defaultTab}"]`).click();
    } catch (error) {
      console.error("A critical error occurred during analysis:", error);
      showStatus(
        `A critical error occurred: ${error.message}. Check console for details.`,
        "fail"
      );
      dom.results.classList.add("hidden");
    }
  }
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
