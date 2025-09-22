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

  // js/core/state.js
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
    inputSection: (
      /** @type {HTMLDivElement} */
      document.getElementById("input-section")
    ),
    newAnalysisBtn: (
      /** @type {HTMLButtonElement} */
      document.getElementById("new-analysis-btn")
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

  // js/ui/tooltip.js
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

  // js/protocols/dash/adapter.js
  var parseDuration = (durationStr) => {
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
      minBufferTime: parseDuration(
        getAttr(manifestElement, "minBufferTime")
      ),
      publishTime: getAttr(manifestElement, "publishTime") ? new Date(getAttr(manifestElement, "publishTime")) : null,
      availabilityStartTime: getAttr(manifestElement, "availabilityStartTime") ? new Date(getAttr(manifestElement, "availabilityStartTime")) : null,
      timeShiftBufferDepth: parseDuration(
        getAttr(manifestElement, "timeShiftBufferDepth")
      ),
      minimumUpdatePeriod: parseDuration(
        getAttr(manifestElement, "minimumUpdatePeriod")
      ),
      duration: parseDuration(
        getAttr(manifestElement, "mediaPresentationDuration")
      ),
      periods: [],
      rawElement: manifestElement
      // Keep a reference for features not yet migrated
    };
    manifestElement.querySelectorAll("Period").forEach((periodEl) => {
      const periodIR = {
        id: getAttr(periodEl, "id"),
        start: parseDuration(getAttr(periodEl, "start")),
        duration: parseDuration(getAttr(periodEl, "duration")),
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
  async function parseManifest(xmlString, baseUrl) {
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
  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function diffManifest(oldManifest, newManifest) {
    const changes = diffWords(oldManifest, newManifest);
    let html = "";
    changes.forEach((part) => {
      if (part.removed) {
        return;
      }
      const escapedValue = escapeHtml(part.value);
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
    let originalManifestString = stream.rawManifest;
    manifestUpdateInterval = setInterval(async () => {
      try {
        const response = await fetch(stream.originalUrl);
        if (!response.ok) return;
        const newManifestString = await response.text();
        if (newManifestString !== originalManifestString) {
          const { manifest: newManifest } = await parseManifest(
            newManifestString,
            stream.baseUrl
          );
          const oldManifestForDiff = originalManifestString;
          stream.manifest = newManifest;
          stream.rawManifest = newManifestString;
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
          const diffHtml = diffManifest(
            formattedOldManifest,
            formattedNewManifest
          );
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

  // js/core/event-bus.js
  var EventBus = class {
    constructor() {
      this.listeners = {};
    }
    /**
     * Subscribes a callback to an event.
     * @param {string} eventName The name of the event to subscribe to.
     * @param {Function} callback The function to call when the event is dispatched.
     * @returns {() => void} A function to unsubscribe.
     */
    subscribe(eventName, callback) {
      if (!this.listeners[eventName]) {
        this.listeners[eventName] = [];
      }
      this.listeners[eventName].push(callback);
      return () => {
        this.listeners[eventName] = this.listeners[eventName].filter(
          (listener) => listener !== callback
        );
      };
    }
    /**
     * Dispatches an event, calling all subscribed callbacks.
     * @param {string} eventName The name of the event to dispatch.
     * @param {*} data The data to pass to the event listeners.
     */
    dispatch(eventName, data) {
      if (!this.listeners[eventName]) {
        return;
      }
      this.listeners[eventName].forEach((callback) => callback(data));
    }
  };
  var eventBus = new EventBus();

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

  // js/data/example-streams.js
  var exampleStreams = [
    // --- DASH VOD (Source: dashif.org) ---
    {
      name: "[DASH-IF] Big Buck Bunny, onDemand",
      url: "https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd",
      protocol: "dash",
      type: "vod",
      source: "dashif.org"
    },
    {
      name: "[DASH-IF] SegmentBase, onDemand",
      url: "https://dash.akamaized.net/dash264/TestCases/1a/sony/SNE_DASH_SD_CASE1A_REVISED.mpd",
      protocol: "dash",
      type: "vod",
      source: "dashif.org"
    },
    {
      name: "[DASH-IF] Multi-period, 2 periods",
      url: "https://dash.akamaized.net/dash264/TestCases/5a/nomor/1.mpd",
      protocol: "dash",
      type: "vod",
      source: "dashif.org"
    },
    {
      name: "[DASH-IF] Envivio, SegmentTemplate/Number",
      url: "https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd",
      protocol: "dash",
      type: "vod",
      source: "dashif.org"
    },
    {
      name: "[DASH-IF] VTT Subtitles",
      url: "https://dash.akamaized.net/dash264/TestCases/4b/qualcomm/2/TearsOfSteel_onDem5sec.mpd",
      protocol: "dash",
      type: "vod",
      source: "dashif.org"
    },
    {
      name: "[DASH-IF] Embedded CEA-608 Captions",
      url: "https://dash.akamaized.net/dash264/TestCases/3a/fraunhofer/count_2s/2013-08-15/stream.mpd",
      protocol: "dash",
      type: "vod",
      source: "dashif.org"
    },
    {
      name: "[Axinom] H.264, CMAF, Clear",
      url: "https://media.axprod.net/TestVectors/v7-Clear/Manifest.mpd",
      protocol: "dash",
      type: "vod",
      source: "Axinom"
    },
    {
      name: "[Axinom] Multi-key, Widevine/PlayReady DRM",
      url: "https://media.axprod.net/TestVectors/v7-MultiDRM-MultiKey/Manifest.mpd",
      protocol: "dash",
      type: "vod",
      source: "Axinom"
    },
    {
      name: "[BBC] On-demand Testcard, Multi-language",
      url: "http://rdmedia.bbc.co.uk/dash/ondemand/testcard/1/client_manifest-events.mpd",
      protocol: "dash",
      type: "vod",
      source: "BBC"
    },
    // --- DASH Live (Source: dashif.org) ---
    {
      name: "[DASH-IF] Live Sim (SegmentTemplate)",
      url: "https://livesim.dashif.org/livesim/testpic_2s/Manifest.mpd",
      protocol: "dash",
      type: "live",
      source: "dashif.org"
    },
    {
      name: "[DASH-IF] Live Sim (SegmentTimeline)",
      url: "https://livesim.dashif.org/livesim/segtimeline_1/testpic_2s/Manifest.mpd",
      protocol: "dash",
      type: "live",
      source: "dashif.org"
    },
    {
      name: "[DASH-IF] Live Sim (SCTE-35 Events)",
      url: "https://livesim.dashif.org/livesim/scte35_2/testpic_2s/Manifest.mpd",
      protocol: "dash",
      type: "live",
      source: "dashif.org"
    },
    {
      name: "[DASH-IF] Live Sim (Low-Latency Chunked)",
      url: "https://livesim.dashif.org/livesim-chunked/testpic_2s/Manifest.mpd",
      protocol: "dash",
      type: "live",
      source: "dashif.org"
    },
    {
      name: "[AWS] Live w/ Ad Breaks",
      url: "https://d2qohgpffhaffh.cloudfront.net/HLS/vanlife/withad/sdr_wide/master.mpd",
      protocol: "dash",
      type: "live",
      source: "AWS"
    },
    {
      name: "[Unified Streaming] Live w/ SCTE-35 markers",
      url: "https://demo.unified-streaming.com/k8s/live/scte35.isml/.mpd",
      protocol: "dash",
      type: "live",
      source: "Unified Streaming"
    },
    // --- HLS VOD ---
    {
      name: "[HLS.js] Big Buck Bunny, Adaptive",
      url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      protocol: "hls",
      type: "vod",
      source: "hls.js"
    },
    {
      name: "[HLS.js] Big Buck Bunny, 480p",
      url: "https://test-streams.mux.dev/x36xhzz/url_6/193039199_mp4_h264_aac_hq_7.m3u8",
      protocol: "hls",
      type: "vod",
      source: "hls.js"
    },
    {
      name: "[HLS.js] fMP4, Multiple Audio Tracks",
      url: "https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8",
      protocol: "hls",
      type: "vod",
      source: "hls.js"
    },
    {
      name: "[HLS.js] AES-128 Encrypted",
      url: "https://playertest.longtailvideo.com/adaptive/oceans_aes/oceans_aes.m3u8",
      protocol: "hls",
      type: "vod",
      source: "hls.js"
    },
    {
      name: "[HLS.js] AES-128 Encrypted, TS main with AAC",
      url: "https://playertest.longtailvideo.com/adaptive/aes-with-tracks/master.m3u8",
      protocol: "hls",
      type: "vod",
      source: "hls.js"
    },
    {
      name: "[HLS.js] Ad-insertion in Event Stream",
      url: "https://test-streams.mux.dev/dai-discontinuity-deltatre/manifest.m3u8",
      protocol: "hls",
      type: "vod",
      source: "hls.js"
    },
    {
      name: "[HLS.js] Subtitles/Captions",
      url: "https://playertest.longtailvideo.com/adaptive/captions/playlist.m3u8",
      protocol: "hls",
      type: "vod",
      source: "hls.js"
    },
    {
      name: "[HLS.js] ARTE China, ABR",
      url: "https://test-streams.mux.dev/test_001/stream.m3u8",
      protocol: "hls",
      type: "vod",
      source: "hls.js"
    },
    {
      name: "[HLS.js] MP3 VOD",
      url: "https://playertest.longtailvideo.com/adaptive/vod-with-mp3/manifest.m3u8",
      protocol: "hls",
      type: "vod",
      source: "hls.js"
    },
    {
      name: "[HLS.js] DK Turntable, PTS shifted",
      url: "https://test-streams.mux.dev/pts_shift/master.m3u8",
      protocol: "hls",
      type: "vod",
      source: "hls.js"
    },
    {
      name: "[Apple] Bip-Bop, Advanced HEVC+AVC",
      url: "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8",
      protocol: "hls",
      type: "vod",
      source: "Apple"
    },
    {
      name: "[JW Player] FDR, CDN packaged",
      url: "https://cdn.jwplayer.com/manifests/pZxWPRg4.m3u8",
      protocol: "hls",
      type: "vod",
      source: "JW Player"
    },
    {
      name: "[Bitmovin] fMP4",
      url: "https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s-fmp4/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8",
      protocol: "hls",
      type: "vod",
      source: "Bitmovin"
    },
    {
      name: "[Shaka] Angel One, Widevine DRM (fMP4)",
      url: "https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine-hls/hls.m3u8",
      protocol: "hls",
      type: "vod",
      source: "Shaka"
    },
    {
      name: "[Wowza] Elephant's Dream, Alt Audio + VTT",
      url: "https://playertest.longtailvideo.com/adaptive/elephants_dream_v4/index.m3u8",
      protocol: "hls",
      type: "vod",
      source: "Wowza"
    },
    // --- HLS Live ---
    {
      name: "[Mux] Low-Latency HLS (fMP4)",
      url: "https://stream.mux.com/v69RSHhFelSm4701snP22dYz2jICy4E4FUyk02rW4gxRM.m3u8",
      protocol: "hls",
      type: "live",
      source: "Mux"
    },
    {
      name: "[Unified Streaming] Tears of Steel",
      url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
      protocol: "hls",
      type: "live",
      source: "Unified Streaming"
    }
  ];

  // js/ui/stream-inputs.js
  var HISTORY_KEY = "dash_analyzer_history";
  var PRESETS_KEY = "dash_analyzer_presets";
  var MAX_PRESETS = 50;
  var getBadge = (text, colorClasses) => {
    if (!text) return "";
    return x`<span
        class="text-xs font-semibold px-2 py-0.5 rounded-full ${colorClasses}"
        >${text.toUpperCase()}</span
    >`;
  };
  var streamInputTemplate = (streamId, isFirstStream, history, presets) => {
    const validHistory = history.filter((item) => item.name && item.url);
    const validPresets = presets.filter((item) => item.name && item.url);
    const presetUrls = new Set(validPresets.map((p2) => p2.url));
    const groupedExamples = exampleStreams.reduce(
      (acc, stream) => {
        const { protocol, type } = stream;
        if (!acc[protocol]) acc[protocol] = { live: [], vod: [] };
        acc[protocol][type].push(stream);
        return acc;
      },
      { dash: { live: [], vod: [] }, hls: { live: [], vod: [] } }
    );
    const groupedPresets = validPresets.reduce(
      (acc, stream) => {
        const type = stream.type || "vod";
        if (!acc[type]) acc[type] = [];
        acc[type].push(stream);
        return acc;
      },
      { live: [], vod: [] }
    );
    const renderStreamListItem = (stream) => {
      const protocolBadge = stream.protocol === "dash" ? getBadge("DASH", "bg-blue-800 text-blue-200") : stream.protocol === "hls" ? getBadge("HLS", "bg-purple-800 text-purple-200") : "";
      const typeBadge = stream.type === "live" ? getBadge("LIVE", "bg-red-800 text-red-200") : stream.type === "vod" ? getBadge("VOD", "bg-green-800 text-green-200") : "";
      return x`<li
            class="px-3 py-2 hover:bg-gray-700 cursor-pointer flex justify-between items-center"
            data-url="${stream.url}"
            data-name="${stream.name}"
            @click=${handleDropdownItemClick}
        >
            <div class="flex flex-col min-w-0">
                <span
                    class="font-semibold text-gray-200 truncate"
                    title="${stream.name}"
                    >${stream.name}</span
                >
                <span
                    class="text-xs text-gray-400 font-mono truncate"
                    title="${stream.url}"
                    >${stream.url}</span
                >
            </div>
            <div class="flex-shrink-0 flex gap-2 ml-4">
                ${protocolBadge} ${typeBadge}
            </div>
        </li>`;
    };
    const renderCollapsibleSection = (title, items, isOpen = false) => {
      if (!items || items.length === 0) return "";
      return x`<details ?open=${isOpen}>
            <summary class="font-semibold text-gray-300 cursor-pointer">
                ${title}
            </summary>
            <div class="mt-2">
                <ul
                    class="divide-y divide-gray-700/50 max-h-60 overflow-y-auto"
                >
                    ${items.map(renderStreamListItem)}
                </ul>
            </div>
        </details>`;
    };
    const removeHandler = (e4) => {
      e4.target.closest(".stream-input-group").remove();
    };
    const handleUrlInput = (e4) => {
      const input = (
        /** @type {HTMLInputElement} */
        e4.target
      );
      const group = input.closest(".stream-input-group");
      const saveButton = (
        /** @type {HTMLButtonElement} */
        group.querySelector(".save-preset-btn")
      );
      const url = input.value.trim();
      saveButton.disabled = presetUrls.has(url) || url === "";
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
        <div class="space-y-4">
            <!-- URL and File Inputs -->
            <div class="flex flex-col md:flex-row items-center gap-4">
                <input
                    type="url"
                    id="url-${streamId}"
                    class="input-url w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Manifest URL (.mpd, .m3u8)..."
                    .value=${isFirstStream && validHistory.length > 0 ? validHistory[0].url : ""}
                    @input=${handleUrlInput}
                />
                <label
                    for="file-${streamId}"
                    class="block w-full md:w-auto cursor-pointer bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md text-center flex-shrink-0"
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

            <!-- Collapsible Tree View -->
            <div
                class="bg-gray-900/50 border border-gray-700 rounded-lg p-3 space-y-3"
            >
                ${validHistory.length > 0 ? x`<div>
                          <h4
                              class="font-semibold text-gray-300 px-3 py-2 bg-gray-700/50 rounded-md"
                          >
                              Recent
                          </h4>
                          <ul
                              class="divide-y divide-gray-700/50 max-h-48 overflow-y-auto mt-2"
                          >
                              ${validHistory.map(renderStreamListItem)}
                          </ul>
                      </div>` : ""}
                ${validPresets.length > 0 ? x`<details
                          class="pt-2 border-t border-gray-700"
                          open
                      >
                          <summary
                              class="font-semibold text-gray-300 cursor-pointer"
                          >
                              Saved
                          </summary>
                          <div class="mt-2 space-y-2">
                              ${renderCollapsibleSection(
      "Live",
      groupedPresets.live
    )}
                              ${renderCollapsibleSection(
      "VOD",
      groupedPresets.vod
    )}
                          </div>
                      </details>` : ""}

                <details class="pt-2 border-t border-gray-700">
                    <summary
                        class="font-semibold text-gray-300 cursor-pointer"
                    >
                        Examples
                    </summary>
                    <div class="mt-2 space-y-2">
                        <details>
                            <summary
                                class="font-semibold text-gray-300 cursor-pointer"
                            >
                                DASH
                            </summary>
                            <div class="mt-2 space-y-2">
                                ${renderCollapsibleSection(
      "Live",
      groupedExamples.dash.live
    )}
                                ${renderCollapsibleSection(
      "VOD",
      groupedExamples.dash.vod
    )}
                            </div>
                        </details>
                        <details>
                            <summary
                                class="font-semibold text-gray-300 cursor-pointer"
                            >
                                HLS
                            </summary>
                            <div class="mt-2 space-y-2">
                                ${renderCollapsibleSection(
      "Live",
      groupedExamples.hls.live
    )}
                                ${renderCollapsibleSection(
      "VOD",
      groupedExamples.hls.vod
    )}
                            </div>
                        </details>
                    </div>
                </details>
            </div>

            <!-- Save Preset Input -->
            <div
                class="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-gray-700"
            >
                <input
                    type="text"
                    id="name-${streamId}"
                    class="input-name w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600"
                    placeholder="Enter a custom name to save this URL"
                />
                <button
                    class="save-preset-btn w-full sm:w-auto flex-shrink-0 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    @click=${handleSavePreset}
                    ?disabled=${presetUrls.has(
      isFirstStream && validHistory.length > 0 ? validHistory[0].url : ""
    )}
                >
                    Save as Preset
                </button>
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
    if (fileInput.files[0]) {
      group.querySelector(".input-url").value = "";
    }
  };
  var handleDropdownItemClick = (e4) => {
    const item = (
      /** @type {HTMLElement} */
      e4.currentTarget
    );
    const group = item.closest(".stream-input-group");
    const urlInput = (
      /** @type {HTMLInputElement} */
      group.querySelector(".input-url")
    );
    if (item.dataset.url) {
      urlInput.value = item.dataset.url;
      group.querySelector(".input-name").value = item.dataset.name || "";
      group.querySelector(".input-file").value = "";
      urlInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };
  var handleSavePreset = (e4) => {
    const button = (
      /** @type {HTMLButtonElement} */
      e4.target
    );
    const group = button.closest(".stream-input-group");
    const nameInput = (
      /** @type {HTMLInputElement} */
      group.querySelector(".input-name")
    );
    const urlInput = (
      /** @type {HTMLInputElement} */
      group.querySelector(".input-url")
    );
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    if (!name || !url) {
      alert("Please provide both a URL and a custom name to save a preset.");
      return;
    }
    let presets = (
      /** @type {Array<object>} */
      JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]")
    );
    presets = presets.filter((item) => item.url !== url);
    const protocol = url.includes(".m3u8") ? "hls" : "dash";
    presets.unshift({ name, url, protocol, type: null });
    if (presets.length > MAX_PRESETS) {
      presets.length = MAX_PRESETS;
    }
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    nameInput.value = "";
    alert(`Preset "${name}" saved!`);
    dom.streamInputs.innerHTML = "";
    analysisState.streamIdCounter = 0;
    addStreamInput();
  };
  function addStreamInput() {
    const streamId = analysisState.streamIdCounter++;
    const isFirstStream = streamId === 0;
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    const presets = JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]");
    const container = document.createElement("div");
    B(
      streamInputTemplate(streamId, isFirstStream, history, presets),
      container
    );
    dom.streamInputs.appendChild(container.firstElementChild);
  }

  // js/features/segment-analysis/isobmff/parsers/ftyp.js
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

  // js/features/segment-analysis/isobmff/parsers/mvhd.js
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

  // js/features/segment-analysis/isobmff/parsers/mfhd.js
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

  // js/features/segment-analysis/isobmff/parsers/tfhd.js
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

  // js/features/segment-analysis/isobmff/parsers/tfdt.js
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

  // js/features/segment-analysis/isobmff/parsers/trun.js
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

  // js/features/segment-analysis/isobmff/parsers/sidx.js
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

  // js/features/segment-analysis/isobmff/parsers/tkhd.js
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

  // js/features/segment-analysis/isobmff/parsers/mdhd.js
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

  // js/features/segment-analysis/isobmff/parsers/hdlr.js
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

  // js/features/segment-analysis/isobmff/parsers/vmhd.js
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

  // js/features/segment-analysis/isobmff/parsers/stsd.js
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

  // js/features/segment-analysis/isobmff/parsers/stts.js
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

  // js/features/segment-analysis/isobmff/parsers/stsc.js
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

  // js/features/segment-analysis/isobmff/parsers/stsz.js
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

  // js/features/segment-analysis/isobmff/parsers/stco.js
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

  // js/features/segment-analysis/isobmff/parsers/elst.js
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

  // js/features/segment-analysis/isobmff/parsers/trex.js
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

  // js/features/segment-analysis/isobmff/parsers/groups/default.js
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

  // js/features/segment-analysis/isobmff/parsers/avcc.js
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

  // js/features/segment-analysis/isobmff/parsers/esds.js
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

  // js/features/segment-analysis/isobmff/parsers/smhd.js
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

  // js/features/segment-analysis/isobmff/parsers/pssh.js
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

  // js/features/segment-analysis/isobmff/index.js
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
      box.details["size"] = {
        value: `${actualSize} bytes`,
        offset: box.offset,
        length: sizeFieldLength
      };
      box.details["type"] = {
        value: type,
        offset: box.offset + 4,
        length: 4
      };
      parseBoxDetails(box, new DataView(buffer, offset, actualSize));
      const containerBoxes = [
        "moof",
        "traf",
        "moov",
        "trak",
        "mdia",
        "minf",
        "stbl",
        "mvex",
        "edts",
        "avc1",
        "mp4a"
        //'styp',
      ];
      if (containerBoxes.includes(type)) {
        let childrenParseOffset = box.contentOffset;
        if (type === "avc1") {
          childrenParseOffset += 78 - box.headerSize;
        } else if (type === "mp4a") {
          childrenParseOffset += 28 - box.headerSize;
        }
        const childrenBufferStart = offset + (childrenParseOffset - box.offset);
        const childrenBufferEnd = offset + actualSize;
        if (childrenBufferStart < childrenBufferEnd) {
          const childrenBuffer = buffer.slice(
            childrenBufferStart,
            childrenBufferEnd
          );
          if (childrenBuffer.byteLength > 0) {
            box.children = parseISOBMFF(
              childrenBuffer,
              childrenParseOffset
            );
          }
        }
      }
      if (type === "stsd") {
        const stsdPayloadHeaderLength = 8;
        const childrenStartOffset = box.contentOffset + stsdPayloadHeaderLength;
        const childrenBufferStart = offset + box.headerSize + stsdPayloadHeaderLength;
        const childrenBuffer = buffer.slice(
          childrenBufferStart,
          offset + actualSize
        );
        if (childrenBuffer.byteLength > 0) {
          box.children = parseISOBMFF(
            childrenBuffer,
            childrenStartOffset
          );
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

  // js/features/interactive-segment/logic.js
  function buildByteMapTs(parsedData) {
    const byteMap = /* @__PURE__ */ new Map();
    const colors = {
      header: { bg: "bg-blue-900/60" },
      af: { bg: "bg-yellow-800/60" },
      pcr: { bg: "bg-yellow-500/60" },
      pes: { bg: "bg-purple-800/60" },
      pts: { bg: "bg-purple-500/60" },
      dts: { bg: "bg-purple-400/60" },
      psi: { bg: "bg-green-800/60" },
      payload: { bg: "bg-gray-800/50" },
      stuffing: { bg: "bg-gray-700/50" },
      pointer: { bg: "bg-cyan-800/60" },
      null: { bg: "bg-gray-900/80" }
    };
    if (!parsedData || !parsedData.data || !parsedData.data.packets) return byteMap;
    parsedData.data.packets.forEach((packet) => {
      for (let i3 = 0; i3 < 4; i3++) {
        byteMap.set(packet.offset + i3, { packet, field: "TS Header", color: colors.header });
      }
      if (packet.adaptationField) {
        const af = packet.adaptationField;
        const afOffset = packet.fieldOffsets.adaptationField.offset;
        for (let i3 = 0; i3 < af.length.value + 1; i3++) {
          byteMap.set(afOffset + i3, { packet, field: "Adaptation Field", color: colors.af });
        }
        if (af.pcr) {
          for (let i3 = 0; i3 < af.pcr.length; i3++) {
            byteMap.set(af.pcr.offset + i3, { packet, field: "PCR", color: colors.pcr });
          }
        }
        if (af.stuffing_bytes) {
          for (let i3 = 0; i3 < af.stuffing_bytes.length; i3++) {
            byteMap.set(af.stuffing_bytes.offset + i3, { packet, field: "Stuffing", color: colors.stuffing });
          }
        }
      }
      if (packet.fieldOffsets.pointerField) {
        const { offset, length } = packet.fieldOffsets.pointerField;
        for (let i3 = 0; i3 < length; i3++) {
          byteMap.set(offset + i3, { packet, field: "Pointer Field & Stuffing", color: colors.pointer });
        }
      }
      if (packet.pid === 8191) {
        for (let i3 = 4; i3 < 188; i3++) byteMap.set(packet.offset + i3, { packet, field: "Null Packet Payload", color: colors.null });
      } else if (packet.psi) {
        const sectionOffset = packet.psi.header.section_syntax_indicator === 1 ? packet.offset + packet.fieldOffsets.pointerField.length + 8 : packet.offset + packet.fieldOffsets.pointerField.length + 3;
        for (let i3 = 0; i3 < packet.psi.header.section_length + 3; i3++) {
          byteMap.set(sectionOffset - 8 + i3, { packet, field: `PSI (${packet.psi.type})`, color: colors.psi });
        }
      } else if (packet.pes) {
        const pesOffset = packet.fieldOffsets.pesHeader.offset;
        for (let i3 = 0; i3 < packet.fieldOffsets.pesHeader.length; i3++) {
          byteMap.set(pesOffset + i3, { packet, field: "PES Header", color: colors.pes });
        }
        if (packet.pes.pts) {
          for (let i3 = 0; i3 < packet.pes.pts.length; i3++) {
            byteMap.set(packet.pes.pts.offset + i3, { packet, field: "PTS", color: colors.pts });
          }
        }
        if (packet.pes.dts) {
          for (let i3 = 0; i3 < packet.pes.dts.length; i3++) {
            byteMap.set(packet.pes.dts.offset + i3, { packet, field: "DTS", color: colors.dts });
          }
        }
        const payloadStart = pesOffset + packet.fieldOffsets.pesHeader.length;
        for (let i3 = payloadStart; i3 < packet.offset + 188; i3++) {
          byteMap.set(i3, { packet, field: "PES Payload", color: colors.payload });
        }
      }
    });
    return byteMap;
  }
  function buildByteMap(parsedData) {
    if (parsedData?.format === "ts") {
      return buildByteMapTs(parsedData);
    }
    const byteMap = /* @__PURE__ */ new Map();
    const boxColors = [
      { bg: "bg-red-500/20", border: "border-red-500" },
      { bg: "bg-yellow-500/20", border: "border-yellow-500" },
      { bg: "bg-green-500/20", border: "border-green-500" },
      { bg: "bg-blue-500/20", border: "border-blue-500" },
      { bg: "bg-indigo-500/20", border: "border-indigo-500" },
      { bg: "bg-purple-500/20", border: "border-purple-500" },
      { bg: "bg-pink-500/20", border: "border-pink-500" },
      { bg: "bg-teal-500/20", border: "border-teal-500" }
    ];
    const reservedColor = { bg: "bg-gray-700/50" };
    let colorIndex = 0;
    const traverse = (boxes) => {
      if (!boxes) return;
      for (const box of boxes) {
        const color = boxColors[colorIndex % boxColors.length];
        box.color = color;
        for (let i3 = box.offset; i3 < box.offset + box.size; i3++) {
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
        if (box.children?.length > 0) traverse(box.children);
        colorIndex++;
      }
    };
    if (Array.isArray(parsedData)) traverse(parsedData);
    return byteMap;
  }
  function generateHexAsciiView(buffer, parsedData = null, startOffset = 0, maxBytes = null) {
    if (!buffer) return [];
    const rows = [];
    const view = new Uint8Array(buffer);
    const bytesPerRow = 16;
    const endByte = maxBytes ? Math.min(startOffset + maxBytes, view.length) : view.length;
    if (!parsedData) {
      for (let i3 = startOffset; i3 < endByte; i3 += bytesPerRow) {
        const rowEndByte = Math.min(i3 + bytesPerRow, endByte);
        const rowBytes = view.slice(i3, rowEndByte);
        const offset = i3.toString(16).padStart(8, "0").toUpperCase();
        let hexHtml = "";
        let asciiHtml = "";
        rowBytes.forEach((byte) => {
          hexHtml += `<span class="inline-block w-7 text-center">${byte.toString(16).padStart(2, "0").toUpperCase()}</span>`;
          asciiHtml += `<span class="inline-block w-4 text-center">${byte >= 32 && byte <= 126 ? String.fromCharCode(byte).replace("<", "&lt;") : "."}</span>`;
        });
        rows.push({ offset, hex: hexHtml, ascii: asciiHtml });
      }
      return rows;
    }
    const byteMap = buildByteMap(parsedData);
    for (let i3 = startOffset; i3 < endByte; i3 += bytesPerRow) {
      const rowEndByte = Math.min(i3 + bytesPerRow, endByte);
      const rowBytes = view.slice(i3, rowEndByte);
      const offset = i3.toString(16).padStart(8, "0").toUpperCase();
      let hexHtml = "";
      let asciiHtml = "";
      const baseHexClass = "inline-block h-6 leading-6 w-7 text-center align-middle transition-colors duration-150";
      const baseAsciiClass2 = "inline-block h-6 leading-6 w-4 text-center align-middle transition-colors duration-150 tracking-tight";
      let currentFieldGroup = [];
      let currentAsciiGroup = [];
      let lastMapEntry = null;
      const flushGroup = () => {
        if (currentFieldGroup.length === 0) return;
        const entry = lastMapEntry || { box: {}, packet: {}, field: "Unmapped", color: {} };
        const { box, packet, field, color } = entry;
        const dataAttrs = `data-packet-offset="${packet?.offset}" data-box-offset="${box?.offset}" data-field-name="${field}"`;
        const groupClass = `${color ? color.bg : ""}`;
        hexHtml += `<span class="inline-block ${groupClass}" ${dataAttrs}>${currentFieldGroup.join("")}</span>`;
        asciiHtml += `<span class="inline-block ${groupClass}" ${dataAttrs}>${currentAsciiGroup.join("")}</span>`;
        currentFieldGroup = [];
        currentAsciiGroup = [];
      };
      rowBytes.forEach((byte, index) => {
        const byteOffset = i3 + index;
        const mapEntry = byteMap.get(byteOffset);
        if (lastMapEntry && (mapEntry?.packet !== lastMapEntry.packet || mapEntry?.box !== lastMapEntry.box || mapEntry?.field !== lastMapEntry.field)) {
          flushGroup();
        }
        const dataAttrs = `data-byte-offset="${byteOffset}"`;
        const hexByte = byte.toString(16).padStart(2, "0").toUpperCase();
        currentFieldGroup.push(`<span class="${baseHexClass}" ${dataAttrs}>${hexByte}</span>`);
        const asciiChar = byte >= 32 && byte <= 126 ? String.fromCharCode(byte).replace("<", "&lt;") : ".";
        currentAsciiGroup.push(`<span class="${baseAsciiClass2}" ${dataAttrs}>${asciiChar}</span>`);
        lastMapEntry = mapEntry;
      });
      flushGroup();
      rows.push({ offset, hex: hexHtml, ascii: asciiHtml });
    }
    return rows;
  }

  // js/features/interactive-segment/hex-view.js
  var hexViewTemplate = (buffer, parsedData, currentPage, bytesPerPage, onPageChange) => {
    const totalPages = Math.ceil(buffer.byteLength / bytesPerPage);
    const startOffset = (currentPage - 1) * bytesPerPage;
    const viewModel = generateHexAsciiView(buffer, parsedData, startOffset, bytesPerPage);
    return x`
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto hex-viewer-area h-full"
        >
            <div
                class="flex sticky top-0 bg-slate-800 pb-2 mb-2 border-b border-gray-600 z-10"
            >
                <div class="w-24 flex-shrink-0 text-gray-400 font-semibold">
                    Offset
                </div>
                <div class="text-gray-400 font-semibold">Hexadecimal</div>
                <div
                    class="w-64 flex-shrink-0 text-gray-400 font-semibold ml-4"
                >
                    ASCII
                </div>
            </div>

            ${viewModel.map(
      (row) => x`
                    <div
                        class="flex items-center hover:bg-slate-700/50"
                        data-row-offset="${parseInt(row.offset, 16)}"
                    >
                        <div
                            class="w-24 flex-shrink-0 text-gray-500 font-mono"
                        >
                            ${row.offset}
                        </div>
                        <div class="font-mono flex items-center">
                            ${o2(row.hex)}
                        </div>
                        <div
                            class="w-64 flex-shrink-0 text-cyan-400 font-mono tracking-wider ml-4 flex items-center"
                        >
                            ${o2(row.ascii)}
                        </div>
                    </div>
                `
    )}
        </div>

        ${totalPages > 1 ? x`
                  <div class="text-center text-sm text-gray-500 mt-2">
                      Showing bytes ${startOffset} -
                      ${Math.min(startOffset + bytesPerPage - 1, buffer.byteLength - 1)}
                      of ${buffer.byteLength} ($
                      {(buffer.byteLength / 1024).toFixed(2)} KB)
                      <button
                          @click=${() => onPageChange(-1)}
                          ?disabled=${currentPage === 1}
                          class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1"
                      >
                          &lt;
                      </button>
                      Page ${currentPage} of ${totalPages}
                      <button
                          @click=${() => onPageChange(1)}
                          ?disabled=${currentPage === totalPages}
                          class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1"
                      >
                          &gt;
                      </button>
                  </div>
              ` : ""}
    `;
  };

  // js/features/interactive-segment/isobmff-view.js
  var hexCurrentPage = 1;
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
    const inspector = dom.tabContents["interactive-segment"].querySelector(
      ".segment-inspector-panel"
    );
    if (!inspector) return;
    if (box) {
      B(
        createInspectorTemplate(box, highlightedField),
        /** @type {HTMLElement} */
        inspector
      );
      inspector.classList.remove("opacity-0");
      if (highlightedField) {
        const fieldRow = inspector.querySelector(
          `[data-field-name="${highlightedField}"]`
        );
        fieldRow?.scrollIntoView({ block: "nearest" });
      }
    } else {
      B(
        x``,
        /** @type {HTMLElement} */
        inspector
      );
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
      const target = (
        /** @type {HTMLElement} */
        e4.target.closest(
          "[data-byte-offset]"
        )
      );
      if (!target) return;
      const byteOffset = parseInt(target.dataset.byteOffset);
      const fieldEl = (
        /** @type {HTMLElement} */
        target.closest("[data-field-name]")
      );
      if (!fieldEl) return;
      const boxOffset = parseInt(fieldEl.dataset.boxOffset);
      const fieldName = fieldEl.dataset.fieldName;
      container.querySelectorAll(".is-field-highlighted, .is-char-highlighted").forEach(
        (el) => el.classList.remove(
          "is-field-highlighted",
          "is-char-highlighted"
        )
      );
      const charEl = container.querySelector(
        `[data-byte-offset="${byteOffset}"].${CSS.escape(
          baseAsciiClass.split(" ").join(".")
        )}`
      );
      if (charEl) charEl.classList.add("is-char-highlighted");
      if (boxOffset >= 0 && fieldName) {
        container.querySelectorAll(
          `[data-box-offset="${boxOffset}"][data-field-name="${fieldName}"]`
        ).forEach((el) => {
          el.classList.add("is-field-highlighted");
        });
        container.querySelectorAll(
          `[data-box-offset="${boxOffset}"][data-field-name="tree-view"]`
        ).forEach((el) => {
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
        container.querySelectorAll(
          ".is-field-highlighted, .is-char-highlighted"
        ).forEach(
          (el) => el.classList.remove(
            "is-field-highlighted",
            "is-char-highlighted"
          )
        );
      }
    };
    container.addEventListener("mouseover", handleHover);
    container.addEventListener("mouseout", handleMouseOut);
    container.addEventListener("click", (e4) => {
      const summary = (
        /** @type {HTMLElement} */
        e4.target.closest(
          "summary"
        )
      );
      if (summary) {
        e4.preventDefault();
      }
      const targetNode = (
        /** @type {HTMLElement} */
        e4.target.closest(
          "[data-box-offset]"
        )
      );
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
        const rowEl = hexView?.querySelector(
          `[data-row-offset="${targetRowOffset}"]`
        );
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
                <td
                    class="p-1 pr-2 text-xs text-gray-400 align-top"
                    title="${fieldInfo?.text || ""}"
                >
                    ${key}
                </td>
                <td class="p-1 text-xs font-mono text-white break-all">
                    ${field.value !== void 0 ? String(field.value) : "N/A"}
                </td>
            </tr>
        `;
    });
    return x`
        <div class="p-3 border-b border-gray-700">
            <div class="font-bold text-base mb-1">
                ${box.type}
                <span class="text-sm text-gray-400">(${box.size} bytes)</span>
            </div>
            <div class="text-xs text-emerald-400 mb-2 font-mono">
                ${boxInfo.ref || ""}
            </div>
            <p class="text-xs text-gray-300">
                ${boxInfo.text || "No description available."}
            </p>
        </div>
        <div class="overflow-y-auto">
            <table class="w-full table-fixed">
                <colgroup>
                    <col class="w-1/3" />
                    <col class="w-2/3" />
                </colgroup>
                <tbody>
                    ${fields}
                </tbody>
            </table>
        </div>
    `;
  };
  var baseAsciiClass = "inline-block h-6 leading-6 w-4 text-center align-middle transition-colors duration-150 tracking-tight cursor-pointer";
  var renderBoxNode = (box) => x`
    <details class="text-sm" open>
        <summary
            class="cursor-pointer p-1 rounded hover:bg-gray-700/50 flex items-center gap-2 border-l-4 ${box.color?.border || "border-transparent"}"
            data-box-offset="${box.offset}"
            data-field-name="tree-view"
        >
            <strong class="font-mono">${box.type}</strong>
            <span class="text-xs text-gray-500"
                >@${box.offset}, ${box.size}b</span
            >
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
        <div
            class="box-tree-area bg-gray-900/50 p-2 rounded max-h-[calc(100vh-30rem)] overflow-y-auto"
        >
            ${parsedData.map(renderBoxNode)}
        </div>
    </div>
`;
  function getInteractiveIsobmffTemplate() {
    const { activeSegmentUrl, segmentCache } = analysisState;
    const cachedSegment = segmentCache.get(activeSegmentUrl);
    parsedSegmentData = cachedSegment.parsedData && !cachedSegment.parsedData.error ? cachedSegment.parsedData : null;
    setTimeout(() => initializeSegmentViewInteractivity(), 0);
    const onPageChange = (offset) => {
      const totalPages = Math.ceil(cachedSegment.data.byteLength / BYTES_PER_PAGE);
      const newPage = hexCurrentPage + offset;
      if (newPage >= 1 && newPage <= totalPages) {
        hexCurrentPage = newPage;
        const newContent = getInteractiveIsobmffTemplate();
        B(newContent, dom.tabContents["interactive-segment"]);
      }
    };
    return x`
        <div class="grid grid-cols-1 lg:grid-cols-[minmax(300px,25%)_1fr] gap-4">
            <div class="sticky top-4 h-max">
                <div class="flex flex-col gap-4">
                    <div
                        class="segment-inspector-panel rounded-md bg-gray-900/90 border border-gray-700 transition-opacity duration-200 h-96 overflow-hidden flex flex-col"
                    >
                        <!-- Inspector content is rendered here by JS -->
                    </div>
                    ${parsedSegmentData ? treeViewTemplate(parsedSegmentData) : ""}
                </div>
            </div>

            <div class="overflow-auto">
                ${hexViewTemplate(cachedSegment.data, parsedSegmentData, hexCurrentPage, BYTES_PER_PAGE, onPageChange)}
            </div>
        </div>
    `;
  }

  // js/features/interactive-segment/ts-view.js
  var packetCurrentPage = 1;
  var hexCurrentPage2 = 1;
  var PACKETS_PER_PAGE = 50;
  var HEX_BYTES_PER_PAGE = 1024;
  var tsAnalysisData = null;
  var selectedPacketOffset = null;
  var keydownListener2 = null;
  function groupPackets(packets) {
    if (!packets || packets.length === 0) return [];
    const groups = [];
    let currentGroup = {
      type: packets[0].payloadType,
      pid: packets[0].pid,
      count: 1,
      startOffset: packets[0].offset,
      packets: [packets[0]]
    };
    for (let i3 = 1; i3 < packets.length; i3++) {
      const packet = packets[i3];
      if (packet.payloadType === currentGroup.type && packet.pid === currentGroup.pid) {
        currentGroup.count++;
        currentGroup.packets.push(packet);
      } else {
        groups.push(currentGroup);
        currentGroup = {
          type: packet.payloadType,
          pid: packet.pid,
          count: 1,
          startOffset: packet.offset,
          packets: [packet]
        };
      }
    }
    groups.push(currentGroup);
    return groups;
  }
  function applySelectionHighlight2() {
    const container = dom.tabContents["interactive-segment"];
    container.querySelectorAll(".is-highlighted").forEach((el) => el.classList.remove("is-highlighted"));
    if (selectedPacketOffset !== null) {
      container.querySelectorAll(`[data-packet-offset="${selectedPacketOffset}"]`).forEach((el) => {
        el.classList.add("is-highlighted");
      });
      container.querySelectorAll(`[data-group-start-offset="${selectedPacketOffset}"]`).forEach((el) => {
        el.classList.add("is-highlighted");
      });
    }
  }
  function updateInspectorPanel2(packet) {
    const container = dom.tabContents["interactive-segment"];
    const inspector = container.querySelector(".segment-inspector-panel");
    if (!inspector) return;
    if (packet) {
      B(inspectorPanelTemplate(packet), inspector);
      inspector.classList.remove("opacity-0");
    } else {
      B(x``, inspector);
      inspector.classList.add("opacity-0");
    }
  }
  function handlePacketListClick(e4) {
    const targetNode = e4.target.closest("[data-group-start-offset]");
    if (!targetNode) return;
    const targetOffset = parseInt(targetNode.dataset.groupStartOffset);
    if (selectedPacketOffset === targetOffset) {
      selectedPacketOffset = null;
    } else {
      selectedPacketOffset = targetOffset;
    }
    applySelectionHighlight2();
    const packet = tsAnalysisData.packets.find((p2) => p2.offset === selectedPacketOffset);
    updateInspectorPanel2(packet);
    if (packet) {
      const newHexPage = Math.floor(packet.offset / HEX_BYTES_PER_PAGE) + 1;
      if (newHexPage !== hexCurrentPage2) {
        hexCurrentPage2 = newHexPage;
        B(getInteractiveTsTemplate(), dom.tabContents["interactive-segment"]);
      }
      setTimeout(() => {
        const container = dom.tabContents["interactive-segment"];
        const hexView = container.querySelector(".hex-viewer-area");
        const rowEl = hexView?.querySelector(`[data-row-offset="${Math.floor(packet.offset / 16) * 16}"]`);
        rowEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
    }
  }
  function initializeInteractivity() {
    const container = dom.tabContents["interactive-segment"];
    if (keydownListener2) document.removeEventListener("keydown", keydownListener2);
    keydownListener2 = (e4) => {
      if (e4.key === "Escape" && selectedPacketOffset !== null) {
        selectedPacketOffset = null;
        applySelectionHighlight2();
        updateInspectorPanel2(null);
      }
    };
    document.addEventListener("keydown", keydownListener2);
    container.addEventListener("click", handlePacketListClick);
  }
  var inspectorDetailRow = (label, value) => {
    if (value === null || value === void 0) return "";
    return x`<tr><td class="p-1 pr-2 text-xs text-gray-400 align-top">${label}</td><td class="p-1 text-xs font-mono text-white break-all">${String(value)}</td></tr>`;
  };
  var inspectorPanelTemplate = (packet) => x`
    <div class="p-3 border-b border-gray-700">
        <div class="font-bold text-base mb-1">Packet @${packet.offset} (PID: ${packet.pid})</div>
        <p class="text-xs text-gray-300">${packet.payloadType}</p>
    </div>
    <div class="overflow-y-auto"><table class="w-full table-fixed">
        <colgroup><col class="w-1/2" /><col class="w-1/2" /></colgroup>
        <tbody>
            ${Object.entries(packet.header).map(([key, value]) => inspectorDetailRow(`Header: ${key}`, value.value))}
            ${packet.adaptationField ? Object.entries(packet.adaptationField).map(([key, value]) => {
    if (typeof value.value === "object" && value.value !== null) {
      return Object.entries(value.value).map(([subKey, subValue]) => inspectorDetailRow(`AF.${key}.${subKey}`, subValue.value));
    }
    return inspectorDetailRow(`AF: ${key}`, value.value);
  }).flat() : ""}
            ${packet.pes ? Object.entries(packet.pes).map(([key, value]) => inspectorDetailRow(`PES: ${key}`, value.value)) : ""}
        </tbody>
    </table></div>
`;
  var summaryTemplate = (summary) => {
    if (!summary || !summary.programMap) {
      return x`<p class="text-xs text-gray-400 p-2">No program summary available for this segment.</p>`;
    }
    const pmtPid = Object.keys(summary.programMap)[0];
    const program = pmtPid ? summary.programMap[pmtPid] : null;
    return x`<details class="mb-4" open><summary class="font-semibold text-gray-300 cursor-pointer">Stream Summary</summary>
        <div class="bg-gray-900 border border-gray-700 rounded p-3 mt-2 text-xs">
            ${inspectorDetailRow("Total Packets", summary.totalPackets)}
            ${inspectorDetailRow("PCR PID", summary.pcrPid)}
            ${program ? inspectorDetailRow("Program #", program.programNumber) : ""}
            <h5 class="font-semibold text-gray-400 mt-3 mb-1">
                Elementary Streams:
            </h5>
            ${program ? x`<table class="w-full text-left"><tbody>
                ${Object.entries(program.streams).map(([pid, type]) => x`<tr><td class="p-1 font-mono">${pid}</td><td class="p-1">${type}</td></tr>`)}
            </tbody></table>` : "PMT not found or parsed."}
        </div>
    </details>`;
  };
  var packetListTemplate = (packets, onPageChange) => {
    const packetGroups = groupPackets(packets);
    const totalPages = Math.ceil(packetGroups.length / PACKETS_PER_PAGE);
    const start = (packetCurrentPage - 1) * PACKETS_PER_PAGE;
    const end = start + PACKETS_PER_PAGE;
    const paginatedGroups = packetGroups.slice(start, end);
    return x`
        <h4 class="text-base font-bold text-gray-300 mb-2">Packet Groups</h4>
        <div class="bg-gray-900/50 p-2 rounded max-h-[calc(100vh-30rem)] overflow-y-auto">
            ${paginatedGroups.map((g2) => x`
                <div class="text-xs p-1 rounded hover:bg-gray-700/50 flex items-center gap-2 cursor-pointer border-l-4 border-transparent"
                     data-group-start-offset="${g2.startOffset}">
                    <strong class="font-mono w-48 flex-shrink-0">Packets @${g2.startOffset} (x${g2.count})</strong>
                    <span class="text-gray-400 truncate">PID ${g2.pid}: ${g2.type}</span>
                </div>`)}
        </div>
        ${totalPages > 1 ? x`<div class="text-center text-sm text-gray-500 mt-2">
            <button @click=${() => onPageChange(-1)} ?disabled=${packetCurrentPage === 1} class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1">&lt;</button>
            Page ${packetCurrentPage} of ${totalPages}
            <button @click=${() => onPageChange(1)} ?disabled=${packetCurrentPage === totalPages} class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1">&gt;</button>
        </div>` : ""}`;
  };
  function getInteractiveTsTemplate() {
    const { activeSegmentUrl, segmentCache } = analysisState;
    const cachedSegment = segmentCache.get(activeSegmentUrl);
    tsAnalysisData = cachedSegment?.parsedData?.data;
    const container = dom.tabContents["interactive-segment"];
    setTimeout(() => initializeInteractivity(), 0);
    const onHexPageChange = (offset) => {
      const totalPages = Math.ceil(cachedSegment.data.byteLength / HEX_BYTES_PER_PAGE);
      const newPage = hexCurrentPage2 + offset;
      if (newPage >= 1 && newPage <= totalPages) {
        hexCurrentPage2 = newPage;
        B(getInteractiveTsTemplate(), dom.tabContents["interactive-segment"]);
      }
    };
    const onPacketPageChange = (offset) => {
      const totalPages = Math.ceil(groupPackets(tsAnalysisData.packets).length / PACKETS_PER_PAGE);
      const newPage = packetCurrentPage + offset;
      if (newPage >= 1 && newPage <= totalPages) {
        packetCurrentPage = newPage;
        B(getInteractiveTsTemplate(), container);
      }
    };
    return x`
        <div class="grid grid-cols-1 lg:grid-cols-[minmax(400px,35%)_1fr] gap-6">
            <div class="sticky top-4 h-max flex flex-col gap-4">
                 <div class="segment-inspector-panel rounded-md bg-gray-900/90 border border-gray-700 transition-opacity duration-200 h-64 overflow-hidden flex flex-col"></div>
                ${tsAnalysisData ? x`
                    ${summaryTemplate(tsAnalysisData.summary)}
                    ${packetListTemplate(tsAnalysisData.packets, onPacketPageChange)}
                ` : x`<p class="text-yellow-400">Could not parse TS data.</p>`}
            </div>
            <div class="overflow-auto">
                ${hexViewTemplate(cachedSegment.data, cachedSegment.parsedData, hexCurrentPage2, HEX_BYTES_PER_PAGE, onHexPageChange)}
            </div>
        </div>
    `;
  }

  // js/features/interactive-segment/view.js
  function getInteractiveSegmentTemplate() {
    const { activeSegmentUrl, segmentCache } = analysisState;
    if (!activeSegmentUrl) {
      return x`
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
    }
    const cachedSegment = segmentCache.get(activeSegmentUrl);
    if (!cachedSegment || cachedSegment.status === -1) {
      return x`
            <div class="text-center py-12">
                <div
                    class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
                ></div>
                <p class="text-gray-400">Loading and parsing segment data...</p>
            </div>
        `;
    }
    if (cachedSegment.status !== 200 || !cachedSegment.data) {
      return x`
            <div class="text-center py-12">
                <div class="text-red-400 text-lg mb-2">❌ Failed to Load</div>
                <p class="text-gray-400">
                    Failed to fetch segment. Status:
                    ${cachedSegment.status || "Network Error"}.
                </p>
            </div>
        `;
    }
    let contentTemplate;
    if (cachedSegment.parsedData?.format === "ts") {
      contentTemplate = getInteractiveTsTemplate();
    } else {
      contentTemplate = getInteractiveIsobmffTemplate();
    }
    return x`
        <div class="mb-6">
            <h3 class="text-xl font-bold mb-2 text-white">
                🔍 Interactive Segment View
            </h3>
            <p
                class="text-sm text-gray-400 mb-4 font-mono break-all bg-gray-800 p-2 rounded"
            >
                ${activeSegmentUrl}
            </p>
        </div>
        ${contentTemplate}
    `;
  }

  // js/features/segment-analysis/ts/parsers/header.js
  function parseHeader(view, baseOffset) {
    const byte0 = view.getUint8(0);
    const byte1 = view.getUint8(1);
    const byte2 = view.getUint8(2);
    const byte3 = view.getUint8(3);
    const pid = (byte1 & 31) << 8 | byte2;
    return {
      sync_byte: { value: byte0, offset: baseOffset, length: 1 },
      transport_error_indicator: { value: byte1 >> 7 & 1, offset: baseOffset + 1, length: 0.125 },
      payload_unit_start_indicator: { value: byte1 >> 6 & 1, offset: baseOffset + 1, length: 0.125 },
      transport_priority: { value: byte1 >> 5 & 1, offset: baseOffset + 1, length: 0.125 },
      pid: { value: pid, offset: baseOffset + 1, length: 1.625 },
      transport_scrambling_control: { value: byte3 >> 6 & 3, offset: baseOffset + 3, length: 0.25 },
      adaptation_field_control: { value: byte3 >> 4 & 3, offset: baseOffset + 3, length: 0.25 },
      continuity_counter: { value: byte3 & 15, offset: baseOffset + 3, length: 0.5 }
    };
  }

  // js/features/segment-analysis/ts/parsers/adaptation-field.js
  function parsePcr(view) {
    const baseHigh = view.getUint32(0);
    const baseLow = view.getUint8(4) >> 7;
    const extension = view.getUint16(4) & 511;
    const base = BigInt(baseHigh) << 1n | BigInt(baseLow);
    return base * 300n + BigInt(extension);
  }
  function parseNextDts(view) {
    const high = (view.getUint8(0) & 14) >> 1;
    const mid = view.getUint16(1) & 32767;
    const low = view.getUint16(3) & 32767;
    return BigInt(high) << 30n | BigInt(mid) << 15n | BigInt(low);
  }
  function parseAdaptationField(view, baseOffset) {
    const length = view.getUint8(0);
    if (length === 0) return { length: { value: 0, offset: baseOffset, length: 1 } };
    if (length > view.byteLength - 1) return { length: { value: length, offset: baseOffset, length: 1 }, error: "Invalid length" };
    const flags = view.getUint8(1);
    const af = {
      length: { value: length, offset: baseOffset, length: 1 },
      discontinuity_indicator: { value: flags >> 7 & 1, offset: baseOffset + 1, length: 0.125 },
      random_access_indicator: { value: flags >> 6 & 1, offset: baseOffset + 1, length: 0.125 },
      elementary_stream_priority_indicator: { value: flags >> 5 & 1, offset: baseOffset + 1, length: 0.125 },
      pcr_flag: { value: flags >> 4 & 1, offset: baseOffset + 1, length: 0.125 },
      opcr_flag: { value: flags >> 3 & 1, offset: baseOffset + 1, length: 0.125 },
      splicing_point_flag: { value: flags >> 2 & 1, offset: baseOffset + 1, length: 0.125 },
      transport_private_data_flag: { value: flags >> 1 & 1, offset: baseOffset + 1, length: 0.125 },
      adaptation_field_extension_flag: { value: flags & 1, offset: baseOffset + 1, length: 0.125 }
    };
    let currentOffset = 2;
    if (af.pcr_flag.value) {
      if (currentOffset + 6 <= length + 1) {
        af.pcr = { value: parsePcr(new DataView(view.buffer, view.byteOffset + currentOffset)).toString(), offset: baseOffset + currentOffset, length: 6 };
        currentOffset += 6;
      }
    }
    if (af.opcr_flag.value) {
      if (currentOffset + 6 <= length + 1) {
        af.opcr = { value: parsePcr(new DataView(view.buffer, view.byteOffset + currentOffset)).toString(), offset: baseOffset + currentOffset, length: 6 };
        currentOffset += 6;
      }
    }
    if (af.splicing_point_flag.value) {
      if (currentOffset + 1 <= length + 1) {
        af.splice_countdown = { value: view.getInt8(currentOffset), offset: baseOffset + currentOffset, length: 1 };
        currentOffset += 1;
      }
    }
    if (af.transport_private_data_flag.value) {
      if (currentOffset + 1 <= length + 1) {
        const len = view.getUint8(currentOffset);
        af.private_data_length = { value: len, offset: baseOffset + currentOffset, length: 1 };
        currentOffset += 1 + len;
      }
    }
    if (af.adaptation_field_extension_flag.value) {
      if (currentOffset + 1 <= length + 1) {
        const ext_len = view.getUint8(currentOffset);
        const ext_flags = view.getUint8(currentOffset + 1);
        af.extension = {
          length: { value: ext_len, offset: baseOffset + currentOffset, length: 1 },
          ltw_flag: { value: ext_flags >> 7 & 1, offset: baseOffset + currentOffset + 1, length: 0.125 },
          piecewise_rate_flag: { value: ext_flags >> 6 & 1, offset: baseOffset + currentOffset + 1, length: 0.125 },
          seamless_splice_flag: { value: ext_flags >> 5 & 1, offset: baseOffset + currentOffset + 1, length: 0.125 }
        };
        let extOffset = currentOffset + 2;
        if (af.extension.ltw_flag.value && extOffset + 2 <= currentOffset + 1 + ext_len) {
          const ltw_word = view.getUint16(extOffset);
          af.extension.ltw_valid_flag = { value: ltw_word >> 15 & 1, offset: baseOffset + extOffset, length: 0.125 };
          af.extension.ltw_offset = { value: ltw_word & 32767, offset: baseOffset + extOffset, length: 1.875 };
          extOffset += 2;
        }
        if (af.extension.piecewise_rate_flag.value && extOffset + 3 <= currentOffset + 1 + ext_len) {
          const rate_dword = view.getUint32(extOffset - 1) & 1073741568;
          af.extension.piecewise_rate = { value: rate_dword >> 8, offset: baseOffset + extOffset, length: 3 };
          extOffset += 3;
        }
        if (af.extension.seamless_splice_flag.value && extOffset + 5 <= currentOffset + 1 + ext_len) {
          af.extension.splice_type = { value: view.getUint8(extOffset) >> 4, offset: baseOffset + extOffset, length: 0.5 };
          af.extension.DTS_next_AU = { value: parseNextDts(new DataView(view.buffer, view.byteOffset + extOffset)).toString(), offset: baseOffset + extOffset, length: 5 };
        }
        currentOffset += 1 + ext_len;
      }
    }
    const stuffingBytes = length + 1 - currentOffset;
    if (stuffingBytes > 0) {
      af.stuffing_bytes = { value: stuffingBytes, offset: baseOffset + currentOffset, length: stuffingBytes };
    }
    return af;
  }
  var adaptationFieldTooltipData = {
    pcr_flag: { text: "Program Clock Reference Flag. If set to 1, the adaptation field contains a PCR field.", ref: "Table 2-6" },
    opcr_flag: { text: "Original Program Clock Reference Flag. If set to 1, the adaptation field contains an OPCR field.", ref: "Table 2-6" },
    splicing_point_flag: { text: "If set to 1, a splice_countdown field is present, indicating an upcoming splice point.", ref: "Table 2-6" },
    transport_private_data_flag: { text: "If set to 1, the adaptation field contains private data.", ref: "Table 2-6" },
    adaptation_field_extension_flag: { text: "If set to 1, an adaptation field extension is present.", ref: "Table 2-6" },
    pcr: { text: "Program Clock Reference. A 42-bit timestamp used by the decoder to synchronize its internal clock.", ref: "Clause 2.4.3.5" },
    opcr: { text: "Original Program Clock Reference. A PCR from the original transport stream before re-multiplexing.", ref: "Clause 2.4.3.5" },
    splice_countdown: { text: "A signed 8-bit integer specifying the number of packets until a splice point.", ref: "Clause 2.4.3.5" },
    ltw_flag: { text: "Legal Time Window Flag. If set to 1, LTW information is present for re-multiplexing.", ref: "Clause 2.4.3.5" },
    piecewise_rate_flag: { text: "If set to 1, a piecewise_rate field is present.", ref: "Clause 2.4.3.5" },
    seamless_splice_flag: { text: "If set to 1, splice_type and DTS_next_AU fields are present for seamless splicing.", ref: "Clause 2.4.3.5" },
    "extension@DTS_next_AU": { text: "Decoding Time Stamp of the next access unit after a seamless splice point.", ref: "Clause 2.4.3.5" }
  };

  // js/features/segment-analysis/ts/parsers/psi-section.js
  var MPEG_CRC_TABLE = [
    0,
    79764919,
    159529838,
    222504665,
    319059676,
    398814059,
    445009330,
    507990021,
    638119352,
    583659535,
    797628118,
    726387553,
    890018660,
    835552979,
    1015980042,
    944750013,
    1276238704,
    1221641927,
    1167319070,
    1095957929,
    1595256236,
    1540665371,
    1452775106,
    1381403509,
    1780037320,
    1859660671,
    1671105958,
    1733955601,
    2031960084,
    2111593891,
    1889500026,
    1952343757,
    2552477408,
    2632100695,
    2443283854,
    2506133561,
    2334638140,
    2414271883,
    2191915858,
    2254759653,
    3190512472,
    3135915759,
    3081330742,
    3009969537,
    2905550212,
    2850959411,
    2762807018,
    2691435357,
    3560074640,
    3505614887,
    3719321342,
    3648080713,
    3342211916,
    3287746299,
    3467911202,
    3396681109,
    4063920168,
    4143685023,
    4223187782,
    4286162673,
    3779000052,
    3858754371,
    3904687514,
    3967668269,
    881225847,
    809987520,
    1023691545,
    969234094,
    662832811,
    591600412,
    771767749,
    717299826,
    311336399,
    374308984,
    453813921,
    533576470,
    25881363,
    88864420,
    134795389,
    214552010,
    2023205639,
    2086057648,
    1897238633,
    1976864222,
    1804852699,
    1867694188,
    1645340341,
    1724971778,
    1587496639,
    1516133128,
    1461550545,
    1406951526,
    1302016099,
    1230646740,
    1142491917,
    1087903418,
    2896545431,
    2892290848,
    2703752697,
    2783371342,
    3147935819,
    3210784252,
    2988673829,
    3068302994,
    2393844527,
    2322478744,
    2267877441,
    2213285366,
    2645282291,
    2573783108,
    2485909149,
    2431318826,
    3769900519,
    3832873040,
    3912640137,
    3992402750,
    4088425275,
    4151408268,
    4197601365,
    4277358050,
    3334271071,
    3263032808,
    3476998961,
    3422541446,
    3585640067,
    3514407732,
    3694837229,
    3640369242,
    1762451694,
    1842216281,
    1619975040,
    1682949687,
    2047383090,
    2127137669,
    1938468188,
    2001449195,
    1325665622,
    1271206113,
    1183200824,
    1111960463,
    1543535498,
    1489069629,
    1434599652,
    1363369299,
    622672798,
    568075817,
    748617968,
    677256519,
    907627842,
    853037301,
    1067152940,
    995781531,
    51762726,
    131386257,
    177728840,
    240578815,
    269590778,
    349224269,
    429104020,
    491947555,
    4046411278,
    4126034873,
    4172115296,
    4234965207,
    3794477266,
    3874110821,
    3953728444,
    4016571915,
    3609705398,
    3555108353,
    3735388376,
    3664026991,
    3290680682,
    3236090077,
    3449943556,
    3378572211,
    3174993278,
    3120533705,
    3032266256,
    2961025959,
    2923101090,
    2868635157,
    2813903052,
    2742672763,
    2604032198,
    2683796849,
    2461293480,
    2524268063,
    2284983834,
    2364738477,
    2175806836,
    2238787779,
    1569362073,
    1498123566,
    1409854455,
    1355396672,
    1317987909,
    1246755826,
    1192025387,
    1137557660,
    2072149281,
    2135122070,
    1912620623,
    1992383480,
    1753615357,
    1816598090,
    1627664531,
    1707420964,
    295390185,
    358241886,
    404320391,
    483945776,
    43990325,
    106832002,
    186451547,
    266083308,
    932423249,
    861060070,
    1041341759,
    986742920,
    613929101,
    542559546,
    756411363,
    701822548
  ];
  function calculateCRC32(view) {
    let crc = 4294967295;
    for (let i3 = 0; i3 < view.byteLength; i3++) {
      const byte = view.getUint8(i3);
      crc = crc << 8 ^ MPEG_CRC_TABLE[(crc >> 24 ^ byte) & 255];
    }
    return crc;
  }
  function parsePsiSection(view) {
    const table_id = view.getUint8(0);
    const section_syntax_indicator = view.getUint8(1) >> 7;
    const section_length = view.getUint16(1) & 4095;
    if (section_length > 1021 || view.byteLength < section_length + 3) {
      return { header: { table_id, error: "Invalid section length" }, payload: new DataView(new ArrayBuffer(0)), crc: 0, isValid: false };
    }
    const totalSectionLength = 3 + section_length;
    const dataForCrcView = new DataView(view.buffer, view.byteOffset, totalSectionLength - 4);
    const calculatedCrc = calculateCRC32(dataForCrcView);
    const header = {
      table_id: `0x${table_id.toString(16).padStart(2, "0")}`,
      section_syntax_indicator,
      section_length
    };
    let payloadOffset = 3;
    let crcOffset = 3 + section_length - 4;
    if (section_syntax_indicator === 1) {
      header.table_id_extension = view.getUint16(3);
      header.version_number = view.getUint8(5) >> 1 & 31;
      header.current_next_indicator = view.getUint8(5) & 1;
      header.section_number = view.getUint8(6);
      header.last_section_number = view.getUint8(7);
      payloadOffset = 8;
      crcOffset = 8 + (section_length - 9);
    }
    const payloadLength = crcOffset - payloadOffset;
    const payload = new DataView(view.buffer, view.byteOffset + payloadOffset, payloadLength);
    const readCrc = view.getUint32(crcOffset);
    const isValid = calculatedCrc === readCrc;
    return { header, payload, crc: `0x${readCrc.toString(16).padStart(8, "0")}`, isValid };
  }

  // js/features/segment-analysis/ts/parsers/pat.js
  function parsePatPayload(view, baseOffset) {
    const programs = [];
    for (let offset = 0; offset < view.byteLength; offset += 4) {
      const programNum = view.getUint16(offset);
      const pid = view.getUint16(offset + 2) & 8191;
      if (programNum === 0) {
        programs.push({ type: "network", pid: { value: pid, offset: baseOffset + offset + 2, length: 1.625 } });
      } else {
        programs.push({
          type: "program",
          program_number: { value: programNum, offset: baseOffset + offset, length: 2 },
          program_map_PID: { value: pid, offset: baseOffset + offset + 2, length: 1.625 }
        });
      }
    }
    return { type: "PAT", programs };
  }
  var patTooltipData = {
    PAT: {
      text: "Program Association Table. Lists all programs in a stream, mapping each to the PID of its Program Map Table (PMT).",
      ref: "Clause 2.4.4.4"
    },
    "PAT@network_pid": {
      text: "The PID for the Network Information Table (NIT).",
      ref: "Table 2-30"
    },
    "PAT@program_map_PID": {
      text: "The PID of the Transport Stream packets which shall contain the Program Map Table for this program.",
      ref: "Table 2-30"
    }
  };

  // js/features/segment-analysis/ts/parsers/descriptors.js
  function parseCaDescriptor(view, baseOffset) {
    const ca_system_ID = view.getUint16(0);
    const ca_PID = view.getUint16(2) & 8191;
    const privateDataBytes = [];
    for (let i3 = 4; i3 < view.byteLength; i3++) {
      privateDataBytes.push(view.getUint8(i3).toString(16).padStart(2, "0"));
    }
    return {
      ca_system_ID: { value: `0x${ca_system_ID.toString(16).padStart(4, "0")}`, offset: baseOffset, length: 2 },
      reserved: { value: view.getUint8(2) >> 5 & 7, offset: baseOffset + 2, length: 0.375 },
      ca_PID: { value: ca_PID, offset: baseOffset + 2, length: 1.625 },
      private_data: { value: privateDataBytes.length > 0 ? privateDataBytes.join(" ") : "none", offset: baseOffset + 4, length: privateDataBytes.length }
    };
  }
  function parseVideoStreamDescriptor(view, baseOffset) {
    const byte1 = view.getUint8(0);
    const details = {
      multiple_frame_rate_flag: { value: byte1 >> 7 & 1, offset: baseOffset, length: 0.125 },
      frame_rate_code: { value: byte1 >> 3 & 15, offset: baseOffset, length: 0.5 },
      MPEG_1_only_flag: { value: byte1 >> 2 & 1, offset: baseOffset, length: 0.125 },
      constrained_parameter_flag: { value: byte1 >> 1 & 1, offset: baseOffset, length: 0.125 },
      still_picture_flag: { value: byte1 & 1, offset: baseOffset, length: 0.125 }
    };
    if (details.MPEG_1_only_flag.value === 0) {
      const byte2 = view.getUint8(1);
      details.profile_and_level_indication = { value: byte2, offset: baseOffset + 1, length: 1 };
      const byte3 = view.getUint8(2);
      details.chroma_format = { value: byte3 >> 6 & 3, offset: baseOffset + 2, length: 0.25 };
      details.frame_rate_extension_flag = { value: byte3 >> 5 & 1, offset: baseOffset + 2, length: 0.125 };
    }
    return details;
  }
  function parseAudioStreamDescriptor(view, baseOffset) {
    const byte1 = view.getUint8(0);
    return {
      free_format_flag: { value: byte1 >> 7 & 1, offset: baseOffset, length: 0.125 },
      ID: { value: byte1 >> 6 & 1, offset: baseOffset, length: 0.125 },
      layer: { value: byte1 >> 4 & 3, offset: baseOffset, length: 0.25 },
      variable_rate_audio_indicator: { value: byte1 >> 3 & 1, offset: baseOffset, length: 0.125 }
    };
  }
  function parseAvcVideoDescriptor(view, baseOffset) {
    const byte1 = view.getUint8(1);
    const byte2 = view.getUint8(3);
    return {
      profile_idc: { value: view.getUint8(0), offset: baseOffset, length: 1 },
      constraint_set0_flag: { value: byte1 >> 7 & 1, offset: baseOffset + 1, length: 0.125 },
      constraint_set1_flag: { value: byte1 >> 6 & 1, offset: baseOffset + 1, length: 0.125 },
      constraint_set2_flag: { value: byte1 >> 5 & 1, offset: baseOffset + 1, length: 0.125 },
      constraint_set3_flag: { value: byte1 >> 4 & 1, offset: baseOffset + 1, length: 0.125 },
      constraint_set4_flag: { value: byte1 >> 3 & 1, offset: baseOffset + 1, length: 0.125 },
      constraint_set5_flag: { value: byte1 >> 2 & 1, offset: baseOffset + 1, length: 0.125 },
      AVC_compatible_flags: { value: byte1 & 3, offset: baseOffset + 1, length: 0.25 },
      level_idc: { value: view.getUint8(2), offset: baseOffset + 2, length: 1 },
      AVC_still_present: { value: byte2 >> 7 & 1, offset: baseOffset + 3, length: 0.125 },
      AVC_24_hour_picture_flag: { value: byte2 >> 6 & 1, offset: baseOffset + 3, length: 0.125 },
      Frame_Packing_SEI_not_present_flag: { value: byte2 >> 5 & 1, offset: baseOffset + 3, length: 0.125 }
    };
  }
  function parseDescriptors(view, baseOffset) {
    const descriptors = [];
    let offset = 0;
    while (offset < view.byteLength) {
      if (offset + 2 > view.byteLength) break;
      const descriptor_tag = view.getUint8(offset);
      const descriptor_length = view.getUint8(offset + 1);
      if (offset + 2 + descriptor_length > view.byteLength) break;
      const payloadView = new DataView(view.buffer, view.byteOffset + offset + 2, descriptor_length);
      const payloadOffset = baseOffset + offset + 2;
      let details;
      let name = "Unknown/Private Descriptor";
      switch (descriptor_tag) {
        case 2:
          name = "Video Stream Descriptor";
          details = parseVideoStreamDescriptor(payloadView, payloadOffset);
          break;
        case 3:
          name = "Audio Stream Descriptor";
          details = parseAudioStreamDescriptor(payloadView, payloadOffset);
          break;
        case 9:
          name = "Conditional Access Descriptor";
          details = parseCaDescriptor(payloadView, payloadOffset);
          break;
        case 40:
          name = "AVC Video Descriptor";
          details = parseAvcVideoDescriptor(payloadView, payloadOffset);
          break;
        default:
          details = { data: { value: `${descriptor_length} bytes`, offset: payloadOffset, length: descriptor_length } };
          break;
      }
      descriptors.push({
        tag: descriptor_tag,
        length: descriptor_length,
        name,
        details
      });
      offset += 2 + descriptor_length;
    }
    return descriptors;
  }
  var descriptorTooltipData = {
    CA_descriptor: {
      text: "Conditional Access Descriptor. Provides information about the CA system used for scrambling.",
      ref: "Clause 2.6.16"
    },
    "CA_descriptor@ca_system_ID": {
      text: "A 16-bit identifier for the Conditional Access system.",
      ref: "Clause 2.6.17"
    },
    "CA_descriptor@ca_PID": {
      text: "The PID of the transport stream packets that carry the EMM or ECM data for this CA system.",
      ref: "Clause 2.6.17"
    },
    video_stream_descriptor: {
      text: "Provides basic coding parameters of a video elementary stream.",
      ref: "Clause 2.6.2"
    },
    audio_stream_descriptor: {
      text: "Provides basic information which identifies the coding version of an audio elementary stream.",
      ref: "Clause 2.6.4"
    },
    AVC_video_descriptor: {
      text: "Provides basic information for identifying coding parameters of an AVC (H.264) video stream.",
      ref: "Clause 2.6.64"
    }
  };

  // js/features/segment-analysis/ts/parsers/pmt.js
  function parsePmtPayload(view, baseOffset) {
    const pcr_pid = view.getUint16(0) & 8191;
    const program_info_length = view.getUint16(2) & 4095;
    const programDescriptorsView = new DataView(view.buffer, view.byteOffset + 4, program_info_length);
    const program_descriptors = parseDescriptors(programDescriptorsView, baseOffset + 4);
    const streams = [];
    let streamInfoOffset = 4 + program_info_length;
    while (streamInfoOffset < view.byteLength) {
      if (streamInfoOffset + 5 > view.byteLength) break;
      const stream_type = view.getUint8(streamInfoOffset);
      const elementary_PID = view.getUint16(streamInfoOffset + 1) & 8191;
      const es_info_length = view.getUint16(streamInfoOffset + 3) & 4095;
      const descriptorsView = new DataView(view.buffer, view.byteOffset + streamInfoOffset + 5, es_info_length);
      const es_descriptors = parseDescriptors(descriptorsView, baseOffset + streamInfoOffset + 5);
      streams.push({
        stream_type: { value: `0x${stream_type.toString(16).padStart(2, "0")}`, offset: baseOffset + streamInfoOffset, length: 1 },
        elementary_PID: { value: elementary_PID, offset: baseOffset + streamInfoOffset + 1, length: 1.625 },
        es_info_length: { value: es_info_length, offset: baseOffset + streamInfoOffset + 3, length: 1.5 },
        es_descriptors
      });
      streamInfoOffset += 5 + es_info_length;
    }
    return { type: "PMT", pcr_pid: { value: pcr_pid, offset: baseOffset, length: 1.625 }, program_descriptors, streams };
  }
  var pmtTooltipData = {
    PMT: {
      text: "Program Map Table. Lists all elementary streams (video, audio, etc.) that constitute a single program.",
      ref: "Clause 2.4.4.9"
    },
    "PMT@pcr_pid": {
      text: "The PID of the transport stream packets that carry the PCR fields valid for this program.",
      ref: "Table 2-33"
    },
    "PMT@stream_type": {
      text: "An 8-bit field specifying the type of the elementary stream.",
      ref: "Table 2-34"
    },
    "PMT@elementary_PID": {
      text: "The PID of the transport stream packets that carry the elementary stream data.",
      ref: "Table 2-33"
    }
  };

  // js/features/segment-analysis/ts/parsers/cat.js
  function parseCatPayload(view, baseOffset) {
    return {
      type: "CAT",
      descriptors: parseDescriptors(view, baseOffset)
    };
  }
  var catTooltipData = {
    CAT: {
      text: "Conditional Access Table. Provides information on CA systems used in the multiplex.",
      ref: "Clause 2.4.4.7"
    }
  };

  // js/features/segment-analysis/ts/parsers/tsdt.js
  function parseTsdtPayload(view, baseOffset) {
    return {
      type: "TSDT",
      descriptors: parseDescriptors(view, baseOffset)
    };
  }
  var tsdtTooltipData = {
    TSDT: {
      text: "Transport Stream Description Table. Contains descriptors that apply to the entire transport stream.",
      ref: "Clause 2.4.4.13"
    }
  };

  // js/features/segment-analysis/ts/parsers/pes.js
  function parseTimestamp(view, offset) {
    const byte1 = view.getUint8(offset);
    const byte2 = view.getUint16(offset + 1);
    const byte3 = view.getUint16(offset + 3);
    const high = (byte1 & 14) >> 1;
    const mid = byte2 >> 1;
    const low = byte3 >> 1;
    return BigInt(high) << 30n | BigInt(mid) << 15n | BigInt(low);
  }
  function parsePesHeader(view, baseOffset) {
    if (view.byteLength < 6 || view.getUint32(0) >>> 8 !== 1) {
      return null;
    }
    const streamIdByte = view.getUint8(3);
    const pes = {
      packet_start_code_prefix: { value: "0x000001", offset: baseOffset, length: 3 },
      stream_id: { value: `0x${streamIdByte.toString(16).padStart(2, "0")}`, offset: baseOffset + 3, length: 1 },
      pes_packet_length: { value: view.getUint16(4), offset: baseOffset + 4, length: 2 }
    };
    if (streamIdByte === 188 || streamIdByte === 190 || streamIdByte === 191 || streamIdByte === 240 || streamIdByte === 241 || streamIdByte === 255 || streamIdByte === 242 || streamIdByte === 248) {
      return pes;
    }
    if (view.byteLength < 9) return pes;
    const flags1 = view.getUint8(6);
    const flags2 = view.getUint8(7);
    const ptsDtsFlags = flags2 >> 6;
    const pes_header_data_length = view.getUint8(8);
    pes.marker_bits = { value: flags1 >> 6 & 3, offset: baseOffset + 6, length: 0.25 };
    pes.scrambling_control = { value: flags1 >> 4 & 3, offset: baseOffset + 6, length: 0.25 };
    pes.priority = { value: flags1 >> 3 & 1, offset: baseOffset + 6, length: 0.125 };
    pes.data_alignment_indicator = { value: flags1 >> 2 & 1, offset: baseOffset + 6, length: 0.125 };
    pes.copyright = { value: flags1 >> 1 & 1, offset: baseOffset + 6, length: 0.125 };
    pes.original_or_copy = { value: flags1 & 1, offset: baseOffset + 6, length: 0.125 };
    pes.pts_dts_flags = { value: ptsDtsFlags, offset: baseOffset + 7, length: 0.25 };
    pes.escr_flag = { value: flags2 >> 5 & 1, offset: baseOffset + 7, length: 0.125 };
    pes.es_rate_flag = { value: flags2 >> 4 & 1, offset: baseOffset + 7, length: 0.125 };
    pes.dsm_trick_mode_flag = { value: flags2 >> 3 & 1, offset: baseOffset + 7, length: 0.125 };
    pes.additional_copy_info_flag = { value: flags2 >> 2 & 1, offset: baseOffset + 7, length: 0.125 };
    pes.pes_crc_flag = { value: flags2 >> 1 & 1, offset: baseOffset + 7, length: 0.125 };
    pes.pes_extension_flag = { value: flags2 & 1, offset: baseOffset + 7, length: 0.125 };
    pes.pes_header_data_length = { value: pes_header_data_length, offset: baseOffset + 8, length: 1 };
    let currentOffset = 9;
    if (ptsDtsFlags === 2) {
      if (currentOffset + 5 <= pes_header_data_length + 9) {
        pes.pts = { value: parseTimestamp(view, currentOffset).toString(), offset: baseOffset + currentOffset, length: 5 };
      }
    } else if (ptsDtsFlags === 3) {
      if (currentOffset + 10 <= pes_header_data_length + 9) {
        pes.pts = { value: parseTimestamp(view, currentOffset).toString(), offset: baseOffset + currentOffset, length: 5 };
        pes.dts = { value: parseTimestamp(view, currentOffset + 5).toString(), offset: baseOffset + currentOffset + 5, length: 5 };
      }
    }
    return pes;
  }
  var pesTooltipData = {
    PES: { text: "Packetized Elementary Stream. A data structure used to carry elementary stream data.", ref: "Clause 2.4.3.6" },
    "PES@stream_id": { text: "Identifies the type of the elementary stream (e.g., video, audio).", ref: "Table 2-22" },
    "PES@pes_packet_length": { text: "The length of the PES packet following this field. A value of 0 indicates an unbounded video stream.", ref: "Clause 2.4.3.7" },
    "PES@pts_dts_flags": { text: "Indicates the presence of PTS and/or DTS timestamps in the header.", ref: "Clause 2.4.3.7" },
    "PES@pts": { text: "Presentation Time Stamp. A 33-bit value indicating when the presentation unit should be displayed.", ref: "Clause 2.4.3.7" },
    "PES@dts": { text: "Decoding Time Stamp. A 33-bit value indicating when the access unit must be decoded.", ref: "Clause 2.4.3.7" }
  };

  // js/features/segment-analysis/ts/parsers/private-section.js
  var privateSectionTooltipData = {
    "Private Section": {
      text: "A container for privately defined data, such as a Network Information Table (NIT). The syntax is defined by the user.",
      ref: "Clause 2.4.4.11"
    }
  };

  // js/features/segment-analysis/ts/parsers/ts-parser-logic.js
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
    6: "Private Data (e.g., SCTE-35)"
  };
  function parseTsSegment(buffer) {
    const packets = [];
    const summary = { totalPackets: 0, errors: [], pmtPids: /* @__PURE__ */ new Set(), programMap: {}, pcrPid: null };
    const dataView = new DataView(buffer);
    for (let offset = 0; offset + TS_PACKET_SIZE <= buffer.byteLength; offset += TS_PACKET_SIZE) {
      if (dataView.getUint8(offset) !== SYNC_BYTE) continue;
      const header = parseHeader(new DataView(buffer, offset, 4), offset);
      if (header.pid.value === 0 && header.payload_unit_start_indicator.value) {
        let afLength = header.adaptation_field_control.value & 2 ? dataView.getUint8(offset + 4) + 1 : 0;
        let payloadOffset = 4 + afLength;
        if (payloadOffset >= TS_PACKET_SIZE) continue;
        const pointerField = dataView.getUint8(offset + payloadOffset);
        let sectionStart = offset + payloadOffset + 1 + pointerField;
        if (sectionStart < offset + TS_PACKET_SIZE) {
          const sectionView = new DataView(buffer, sectionStart);
          const { header: sectionHeader, payload } = parsePsiSection(sectionView);
          if (sectionHeader.table_id === "0x00") {
            const pat = parsePatPayload(payload, sectionStart + 8);
            pat.programs.forEach((p2) => {
              if (p2.type === "program") {
                const pmtPid = p2.program_map_PID.value;
                summary.pmtPids.add(pmtPid);
                if (!summary.programMap[pmtPid]) {
                  summary.programMap[pmtPid] = {
                    programNumber: p2.program_number.value,
                    streams: {}
                  };
                }
              }
            });
          }
        }
      }
    }
    for (let offset = 0; offset + TS_PACKET_SIZE <= buffer.byteLength; offset += TS_PACKET_SIZE) {
      if (dataView.getUint8(offset) !== SYNC_BYTE) continue;
      summary.totalPackets++;
      const packetView = new DataView(buffer, offset, TS_PACKET_SIZE);
      const header = parseHeader(packetView, offset);
      const pid = header.pid.value;
      const packet = {
        offset,
        pid,
        header,
        adaptationField: null,
        payloadType: "Data",
        pes: null,
        psi: null,
        fieldOffsets: { header: { offset, length: 4 } }
      };
      let payloadOffset = 4;
      if (header.adaptation_field_control.value & 2) {
        const afLength = dataView.getUint8(offset + payloadOffset);
        const afView = new DataView(buffer, offset + payloadOffset, afLength + 1);
        packet.adaptationField = parseAdaptationField(afView, offset + payloadOffset);
        packet.fieldOffsets.adaptationField = { offset: offset + payloadOffset, length: afLength + 1 };
        payloadOffset += afLength + 1;
      }
      if (header.adaptation_field_control.value & 1 && payloadOffset < TS_PACKET_SIZE) {
        let sectionStartOffset = payloadOffset;
        if (header.payload_unit_start_indicator.value) {
          const pointerField = dataView.getUint8(offset + payloadOffset);
          packet.fieldOffsets.pointerField = { offset: offset + payloadOffset, length: pointerField + 1 };
          sectionStartOffset += pointerField + 1;
        }
        const payloadView = new DataView(buffer, offset + sectionStartOffset, TS_PACKET_SIZE - sectionStartOffset);
        if (pid === 0) {
          const { header: sectionHeader, payload, isValid, crc } = parsePsiSection(payloadView);
          const pat = parsePatPayload(payload, offset + sectionStartOffset + 8);
          pat.isValid = isValid;
          pat.header = sectionHeader;
          pat.crc = crc;
          packet.psi = pat;
          packet.payloadType = "PSI (PAT)";
        } else if (pid === 1) {
          const { header: sectionHeader, payload, isValid, crc } = parsePsiSection(payloadView);
          const cat = parseCatPayload(payload, offset + sectionStartOffset + 8);
          cat.isValid = isValid;
          cat.header = sectionHeader;
          cat.crc = crc;
          packet.psi = cat;
          packet.payloadType = "PSI (CAT)";
        } else if (pid === 2) {
          const { header: sectionHeader, payload, isValid, crc } = parsePsiSection(payloadView);
          const tsdt = parseTsdtPayload(payload, offset + sectionStartOffset + 8);
          tsdt.isValid = isValid;
          tsdt.header = sectionHeader;
          tsdt.crc = crc;
          packet.psi = tsdt;
          packet.payloadType = "PSI (TSDT)";
        } else if (summary.pmtPids.has(pid)) {
          const { header: sectionHeader, payload, isValid, crc } = parsePsiSection(payloadView);
          const pmt = parsePmtPayload(payload, offset + sectionStartOffset + 8);
          pmt.programNumber = sectionHeader.table_id_extension;
          pmt.isValid = isValid;
          pmt.header = sectionHeader;
          pmt.crc = crc;
          packet.psi = pmt;
          packet.payloadType = "PSI (PMT)";
          if (summary.programMap[pid]) {
            summary.programMap[pid].programNumber = pmt.programNumber;
            summary.pcrPid = pmt.pcr_pid.value;
            pmt.streams.forEach((stream) => {
              const streamTypeHex = parseInt(stream.stream_type.value, 16);
              const streamTypeString = streamTypes[streamTypeHex] || `Unknown (${stream.stream_type.value})`;
              summary.programMap[pid].streams[stream.elementary_PID.value] = streamTypeString;
            });
          }
        } else if (header.payload_unit_start_indicator.value && payloadView.byteLength >= 6 && payloadView.getUint32(0) >>> 8 === 1) {
          packet.payloadType = "PES";
          packet.pes = parsePesHeader(payloadView, offset + sectionStartOffset);
          if (packet.pes) {
            const headerLength = 9 + (packet.pes.pes_header_data_length?.value || 0);
            packet.fieldOffsets.pesHeader = { offset: offset + sectionStartOffset, length: headerLength };
          }
        }
      }
      packets.push(packet);
    }
    const pidToStreamType = {};
    Object.values(summary.programMap).forEach((program) => {
      Object.entries(program.streams).forEach(([pid, type]) => {
        pidToStreamType[pid] = type;
      });
    });
    packets.forEach((packet) => {
      if (pidToStreamType[packet.pid] && packet.payloadType === "Data") {
        packet.payloadType = pidToStreamType[packet.pid];
      }
    });
    return { format: "ts", data: { summary, packets } };
  }

  // js/features/segment-analysis/ts/parsers/dsm-cc.js
  var dsmccTooltipData = {
    "DSM-CC Section/Packet": {
      text: "Digital Storage Media Command and Control. A protocol for controlling playback of stored or broadcast media.",
      ref: "Annex B"
    }
  };

  // js/features/segment-analysis/ts/parsers/ipmp.js
  var ipmpTooltipData = {
    "IPMP Control Information": {
      text: "Intellectual Property Management and Protection. Carries information related to digital rights management.",
      ref: "Table 2-31 / ISO/IEC 13818-11"
    }
  };

  // js/features/segment-analysis/ts/ts-parser.js
  var allTooltipData = {
    ...adaptationFieldTooltipData,
    ...catTooltipData,
    ...descriptorTooltipData,
    ...dsmccTooltipData,
    ...ipmpTooltipData,
    ...patTooltipData,
    ...pmtTooltipData,
    ...pesTooltipData,
    ...privateSectionTooltipData,
    ...tsdtTooltipData,
    "AVC_video_descriptor@profile_idc": { text: "Indicates the profile to which the AVC stream conforms (e.g., 66=Baseline, 77=Main, 100=High).", ref: "Table 2-92 / H.264 Spec" },
    "AVC_video_descriptor@level_idc": { text: "Indicates the level to which the AVC stream conforms.", ref: "Table 2-92 / H.264 Spec" },
    "AVC_video_descriptor@constraint_set0_flag": { text: "A constraint flag for Baseline Profile.", ref: "Table 2-92 / H.264 Spec" },
    "AVC_video_descriptor@constraint_set1_flag": { text: "A constraint flag for Main Profile.", ref: "Table 2-92 / H.264 Spec" },
    "AVC_video_descriptor@constraint_set2_flag": { text: "A constraint flag for Extended Profile.", ref: "Table 2-92 / H.264 Spec" },
    "AVC_video_descriptor@AVC_still_present": { text: "If set to 1, indicates that the stream may include AVC still pictures.", ref: "Table 2-92" },
    "AVC_video_descriptor@AVC_24_hour_picture_flag": { text: "If set to 1, indicates the stream may contain pictures with a presentation time more than 24 hours in the future.", ref: "Table 2-92" }
  };
  function parse(buffer) {
    return parseTsSegment(buffer);
  }

  // js/shared/constants.js
  var tooltipTriggerClasses = "cursor-help border-b border-dotted border-blue-500/40 transition-colors hover:bg-blue-500/15 hover:border-solid";

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
    const { summary, packets } = analysis.data;
    const pmtPid = Object.keys(summary.programMap)[0];
    const program = pmtPid ? summary.programMap[pmtPid] : null;
    const dataItem = (label, value) => x`
        <div class="text-xs">
            <span class="block text-gray-400 mb-0.5">${label}</span>
            <span class="block font-semibold font-mono text-gray-200"
                >${value}</span
            >
        </div>
    `;
    return x`
        <div
            class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 bg-gray-900 border border-gray-700 rounded p-3 mb-4"
        >
            ${dataItem("Type", "MPEG-2 Transport Stream")}
            ${dataItem("Total Packets", summary.totalPackets)}
            ${dataItem("PCR PID", summary.pcrPid || "N/A")}
            ${program ? dataItem("Program #", program.programNumber) : ""}
        </div>

        ${summary.errors.length > 0 ? x`<div
                  class="bg-red-900/50 border border-red-700 rounded p-3 mb-4 text-red-300 text-xs"
              >
                  <p class="font-bold mb-1">Parsing Errors:</p>
                  <ul class="list-disc pl-5">
                      ${summary.errors.map((e4) => x`<li>${e4}</li>`)}
                  </ul>
              </div>` : ""}
        ${program ? x` <div class="mb-4">
                  <h4 class="font-semibold text-gray-300 mb-2">
                      Elementary Streams (from PMT):
                  </h4>
                  <table class="w-full text-left text-xs border-collapse">
                      <thead class="text-left">
                          <tr>
                              <th
                                  class="p-2 border border-gray-700 bg-gray-900/50"
                              >
                                  PID
                              </th>
                              <th
                                  class="p-2 border border-gray-700 bg-gray-900/50"
                              >
                                  Stream Type
                              </th>
                              <th
                                  class="p-2 border border-gray-700 bg-gray-900/50"
                              >
                                  Packets
                              </th>
                          </tr>
                      </thead>
                      <tbody>
                          ${Object.entries(program.streams).map(
      ([pid, type]) => x`
                                  <tr>
                                      <td
                                          class="p-2 border border-gray-700 font-mono text-gray-400"
                                      >
                                          ${pid}
                                      </td>
                                      <td
                                          class="p-2 border border-gray-700 text-gray-200"
                                      >
                                          ${type}
                                      </td>
                                      <td
                                          class="p-2 border border-gray-700 text-gray-200"
                                      >
                                          ${summary.pids[pid]?.count || 0}
                                      </td>
                                  </tr>
                              `
    )}
                      </tbody>
                  </table>
              </div>` : ""}
    `;
  };
  var isoBoxTemplate = (box) => {
    const tooltipData2 = getTooltipData();
    const boxInfo = tooltipData2[box.type] || {};
    const headerTemplate = x` <div class="font-semibold font-mono">
        <span
            class="text-emerald-300 ${boxInfo.text ? tooltipTriggerClasses : ""}"
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
                                  class="border border-gray-700 p-2 text-gray-400 w-1/4 ${fieldTooltip ? tooltipTriggerClasses : ""}"
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
            ${dataItem(
        "Sequence #",
        mfhd.details.sequence_number?.value || "N/A"
      )}
            ${dataItem("Track ID", tfhd?.details.track_ID?.value || "N/A")}
            ${dataItem(
        "Base Decode Time",
        tfdt?.details.baseMediaDecodeTime?.value || "N/A"
      )}
            ${dataItem(
        "Sample Count",
        trun?.details.sample_count?.value || "N/A"
      )}
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
      B(
        x`<p class="fail">Segment buffer not available.</p>`,
        dom.modalContentArea
      );
      return;
    }
    const urlA = (
      /** @type {HTMLElement} */
      e4?.currentTarget?.dataset.url || analysisState.segmentsForCompare[0]
    );
    const cachedA = analysisState.segmentCache.get(urlA);
    try {
      if (cachedA?.parsedData?.format === "ts") {
        const analysisA = cachedA.parsedData;
        if (bufferB) {
          const urlB = analysisState.segmentsForCompare[1];
          const cachedB = analysisState.segmentCache.get(urlB);
          const analysisB = cachedB.parsedData;
          const diff = diffObjects(
            analysisA.data.summary,
            analysisB.data.summary
          );
          B(segmentCompareTemplate(diff), dom.modalContentArea);
        } else {
          B(tsAnalysisTemplate(analysisA), dom.modalContentArea);
        }
      } else {
        if (cachedA?.parsedData && !cachedA.parsedData.error) {
          B(
            isoAnalysisTemplate(cachedA.parsedData),
            dom.modalContentArea
          );
        } else {
          throw new Error(
            "Segment could not be parsed as ISOBMFF, or was not found in cache."
          );
        }
      }
    } catch (err) {
      console.error("Segment parsing error:", err);
      B(
        x`<p class="fail">
                Could not render segment analysis: ${err.message}.
            </p>`,
        dom.modalContentArea
      );
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
  function parseAllSegmentUrls2(parsedMediaPlaylist, startTime = 0) {
    if (!parsedMediaPlaylist || !parsedMediaPlaylist.segments) {
      return {};
    }
    const segments = [];
    const mediaSequence = parsedMediaPlaylist.mediaSequence || 0;
    let currentTime = startTime;
    const hlsTimescale = 9e4;
    if (parsedMediaPlaylist.map) {
      segments.push({
        repId: "hls-media",
        type: "Init",
        number: 0,
        resolvedUrl: new URL(
          parsedMediaPlaylist.map.URI,
          parsedMediaPlaylist.baseUrl
        ).href,
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
        timescale: hlsTimescale,
        dateTime: seg.dateTime
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

  // js/features/segment-explorer/segment-row.js
  function handleSegmentCheck(e4) {
    const checkbox = (
      /** @type {HTMLInputElement} */
      e4.target
    );
    const url = checkbox.value;
    if (checkbox.checked) {
      if (analysisState.segmentsForCompare.length >= 2) {
        checkbox.checked = false;
        return;
      }
      eventBus.dispatch("compare:add-segment", { url });
    } else {
      eventBus.dispatch("compare:remove-segment", { url });
    }
  }
  var getLoadStatusIcon = (cacheEntry) => {
    if (!cacheEntry)
      return x`<div
            class="flex-shrink-0 w-2.5 h-2.5 rounded-sm border border-gray-500 bg-gray-800"
            title="Status: Not Loaded"
        ></div>`;
    if (cacheEntry.status === -1)
      return x`<div
            class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-gray-500 animate-pulse"
            title="Status: Pending"
        ></div>`;
    if (cacheEntry.status !== 200) {
      const statusText = cacheEntry.status === 0 ? "Network Error" : `HTTP ${cacheEntry.status}`;
      return x`<div
            class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-red-500"
            title="Status: ${statusText}"
        ></div>`;
    }
    return x`<div
        class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-green-500"
        title="Status: Loaded OK"
    ></div>`;
  };
  var getFreshnessIcon = (isFresh) => {
    if (isFresh)
      return x`<div
            class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-cyan-400"
            title="Fresh: Segment is in the latest playlist"
        ></div>`;
    return x`<div
        class="flex-shrink-0 w-2.5 h-2.5 rounded-sm bg-gray-600"
        title="Stale: Segment is no longer in the latest playlist"
    ></div>`;
  };
  var getActions = (cacheEntry, seg, isFresh) => {
    const analyzeHandler = (e4) => {
      dom.modalTitle.textContent = "Segment Analysis";
      const url = (
        /** @type {HTMLElement} */
        e4.currentTarget.dataset.url
      );
      const cached = analysisState.segmentCache.get(url);
      dom.modalSegmentUrl.textContent = url;
      const modalPanel = dom.segmentModal.querySelector("div");
      dom.segmentModal.classList.remove("opacity-0", "invisible");
      dom.segmentModal.classList.add("opacity-100", "visible");
      modalPanel.classList.remove("scale-95");
      modalPanel.classList.add("scale-100");
      dispatchAndRenderSegmentAnalysis(e4, cached?.data);
    };
    const viewRawHandler = (e4) => {
      const url = (
        /** @type {HTMLElement} */
        e4.currentTarget.dataset.url
      );
      analysisState.activeSegmentUrl = url;
      document.querySelector('[data-tab="interactive-segment"]')?.click();
    };
    const loadHandler = () => {
      eventBus.dispatch("segment:fetch", { url: seg.resolvedUrl });
    };
    if (!cacheEntry) {
      return x`<button
            @click=${loadHandler}
            class="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
        >
            Load
        </button>`;
    }
    if (cacheEntry.status === -1) {
      return x`<button
            disabled
            class="text-xs bg-gray-600 px-2 py-1 rounded opacity-50 cursor-wait"
        >
            Loading...
        </button>`;
    }
    if (cacheEntry.status !== 200) {
      return isFresh ? x`<button
                  @click=${loadHandler}
                  class="text-xs bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded"
              >
                  Reload
              </button>` : x`<span class="text-xs text-gray-500 italic"
                  >Stale Error</span
              >`;
    }
    return x`
        <button
            class="text-xs bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded"
            data-url="${seg.resolvedUrl}"
            @click=${viewRawHandler}
        >
            View Raw
        </button>
        <button
            class="text-xs bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded"
            data-url="${seg.resolvedUrl}"
            @click=${analyzeHandler}
        >
            Analyze
        </button>
    `;
  };
  var segmentRowTemplate = (seg, isFresh, livenessState) => {
    const cacheEntry = analysisState.segmentCache.get(seg.resolvedUrl);
    const isChecked = analysisState.segmentsForCompare.includes(seg.resolvedUrl);
    let stateClasses = "hover:bg-gray-800/80";
    switch (livenessState) {
      case "current":
        stateClasses = "bg-green-700/50 hover:bg-green-700/70";
        break;
      case "live":
        stateClasses = "bg-blue-900/40 hover:bg-blue-900/60";
        break;
      case "stale":
        stateClasses = "bg-red-900/30 hover:bg-red-900/50";
        break;
    }
    return x`
        <tr class="segment-row ${stateClasses}" data-url="${seg.resolvedUrl}">
            <td class="px-3 py-1.5">
                <input
                    type="checkbox"
                    class="bg-gray-700 border-gray-500 rounded focus:ring-blue-500"
                    .value=${seg.resolvedUrl}
                    ?checked=${isChecked}
                    @change=${handleSegmentCheck}
                />
            </td>
            <td class="px-3 py-1.5">
                <div class="flex items-center space-x-2">
                    ${getLoadStatusIcon(cacheEntry)}
                    ${getFreshnessIcon(isFresh)}
                    <div>
                        <span>${seg.type === "Init" ? "Init" : "Media"}</span>
                        <span class="block text-xs text-gray-500"
                            >#${seg.number}</span
                        >
                    </div>
                </div>
            </td>
            <td class="px-3 py-1.5">
                <span class="text-xs font-mono"
                    >${seg.type === "Media" ? x`${(seg.time / seg.timescale).toFixed(
      2
    )}s (+${(seg.duration / seg.timescale).toFixed(
      2
    )}s)` : "N/A"}</span
                >
            </td>
            <td class="px-3 py-1.5">
                <div class="flex justify-between items-center">
                    <span
                        class="font-mono text-cyan-400 truncate"
                        title="${seg.resolvedUrl}"
                        >${seg.template}</span
                    >
                    <div
                        class="flex items-center space-x-2 flex-shrink-0 ml-4"
                    >
                        ${getActions(cacheEntry, seg, isFresh)}
                    </div>
                </div>
            </td>
        </tr>
    `;
  };

  // js/features/segment-explorer/dash-explorer-view.js
  var parseDuration2 = (durationStr) => {
    if (!durationStr) return 0;
    const match = durationStr.match(/PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/);
    if (!match) return 0;
    const hours = parseFloat(match[1] || "0");
    const minutes = parseFloat(match[2] || "0");
    const seconds = parseFloat(match[3] || "0");
    return hours * 3600 + minutes * 60 + seconds;
  };
  var getDashSegmentLivenessState = (segment, manifestElement) => {
    if (manifestElement.getAttribute("type") !== "dynamic") {
      return "default";
    }
    const publishTime = new Date(manifestElement.getAttribute("publishTime")).getTime();
    const suggestedPresentationDelay = parseDuration2(manifestElement.getAttribute("suggestedPresentationDelay") || "PT0S");
    if (!publishTime) {
      return "default";
    }
    const liveEdgeSeconds = publishTime / 1e3 - suggestedPresentationDelay;
    const segmentStartSeconds = segment.time / segment.timescale;
    const segmentEndSeconds = (segment.time + segment.duration) / segment.timescale;
    if (liveEdgeSeconds >= segmentStartSeconds && liveEdgeSeconds < segmentEndSeconds) {
      return "live";
    }
    return "default";
  };
  var dashSegmentTableTemplate = (rep, segmentsToRender, manifestElement) => {
    const repId = rep.getAttribute("id");
    const bandwidth = parseInt(rep.getAttribute("bandwidth"));
    return x`<div class="bg-gray-800 rounded-lg border border-gray-700">
        <div class="flex items-center p-2 bg-gray-900/50 border-b border-gray-700">
             <div class="flex-grow flex items-center">
                <span class="font-semibold text-gray-200">Representation: ${repId}</span>
                <span class="ml-3 text-xs text-gray-400 font-mono">(${(bandwidth / 1e3).toFixed(0)} kbps)</span>
             </div>
        </div>
        <div class="overflow-y-auto" style="max-height: calc(2.5rem * 15);">
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
                    ${segmentsToRender.map((seg) => segmentRowTemplate(seg, true, getDashSegmentLivenessState(seg, manifestElement)))}
                </tbody>
            </table>
        </div>
    </div>`;
  };
  function renderDashExplorer(stream, allSegmentsByRep2, pageSize, mode) {
    const contentArea = document.getElementById("segment-explorer-content");
    if (!contentArea) return;
    const segmentsToRenderByRep = {};
    Object.keys(allSegmentsByRep2).forEach((repId) => {
      const segments = allSegmentsByRep2[repId];
      segmentsToRenderByRep[repId] = mode === "first" ? segments.slice(0, pageSize) : segments.slice(-pageSize);
    });
    const tables = Array.from(
      /** @type {Element} */
      stream.manifest.rawElement.querySelectorAll("Representation")
    ).map((rep) => {
      const repId = rep.getAttribute("id");
      return dashSegmentTableTemplate(rep, segmentsToRenderByRep[repId] || [], stream.manifest.rawElement);
    });
    B(x`<div class="space-y-4">${tables}</div>`, contentArea);
  }

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
      duration: hlsParsed.segments.reduce(
        (sum, seg) => sum + seg.duration,
        0
      ),
      segmentFormat: hlsParsed.map ? "isobmff" : "ts",
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
          mimeType: hlsParsed.map ? "video/mp4" : "video/mp2t",
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
        contentType: "video",
        // Assume video content if not specified
        lang: null,
        mimeType: hlsParsed.map ? "video/mp4" : "video/mp2t",
        representations: [
          {
            id: "media-0-rep-0",
            codecs: null,
            // Not available at this level
            bandwidth: 0,
            // Not available at this level
            width: null,
            height: null
          }
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
  async function parseManifest2(manifestString, baseUrl) {
    const lines = manifestString.split(/\r?\n/);
    if (!lines[0] || lines[0].trim() !== "#EXTM3U") {
      if (manifestString.includes("#EXTINF:")) {
        lines.unshift("#EXTM3U");
      } else {
        throw new Error("Invalid HLS playlist. Must start with #EXTM3U.");
      }
    }
    const parsed = {
      isMaster: false,
      version: 1,
      tags: [],
      segments: [],
      variants: [],
      media: [],
      raw: manifestString,
      baseUrl,
      isLive: true
      // Default to live, will be changed by tags
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
            if (tagValue === "VOD") {
              parsed.isLive = false;
            }
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
              currentSegment.tags.push({
                name: tagName,
                value: tagValue
              });
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
    const manifest = adaptHlsToIr(parsed);
    return { manifest, baseUrl };
  }

  // js/features/segment-explorer/hls-explorer-view.js
  var LIVE_EDGE_OFFSET = 3;
  var POLL_INTERVAL_MS = 5e3;
  var HIGHLIGHT_INTERVAL_MS = 1e3;
  var variantPollers = /* @__PURE__ */ new Map();
  var expandedVariants = /* @__PURE__ */ new Set();
  var hlsSegmentCache = /* @__PURE__ */ new Map();
  var hlsLoadingVariants = /* @__PURE__ */ new Set();
  var hlsFreshSegments = /* @__PURE__ */ new Map();
  var currentStream = null;
  var pollingEnabled = /* @__PURE__ */ new Map();
  var displayMode = /* @__PURE__ */ new Map();
  var liveSegmentHighlighterInterval = null;
  var segmentLoadedUnsubscribe = null;
  function startLiveSegmentHighlighter() {
    stopLiveSegmentHighlighter();
    if (currentStream && currentStream.manifest.type === "dynamic") {
      liveSegmentHighlighterInterval = setInterval(
        () => renderHlsExplorer(),
        HIGHLIGHT_INTERVAL_MS
      );
    }
  }
  function stopLiveSegmentHighlighter() {
    if (liveSegmentHighlighterInterval) {
      clearInterval(liveSegmentHighlighterInterval);
      liveSegmentHighlighterInterval = null;
    }
  }
  function resetHlsState() {
    variantPollers.forEach(clearInterval);
    variantPollers.clear();
    stopLiveSegmentHighlighter();
    if (segmentLoadedUnsubscribe) {
      segmentLoadedUnsubscribe();
      segmentLoadedUnsubscribe = null;
    }
    expandedVariants.clear();
    hlsSegmentCache.clear();
    hlsLoadingVariants.clear();
    hlsFreshSegments.clear();
    pollingEnabled.clear();
    displayMode.clear();
    currentStream = null;
  }
  async function fetchAndRenderRange(variantUri, segments) {
    const segmentsToFetch = segments.filter(
      (s2) => !analysisState.segmentCache.has(s2.resolvedUrl)
    );
    segmentsToFetch.forEach(
      (s2) => eventBus.dispatch("segment:fetch", { url: s2.resolvedUrl })
    );
  }
  async function pollVariant(variantUri) {
    if (!pollingEnabled.get(variantUri)) return;
    try {
      const currentSegments = hlsSegmentCache.get(variantUri) || [];
      if (!Array.isArray(currentSegments)) {
        console.warn(
          `Polling skipped for ${variantUri}: cache contains non-array data (likely an error state).`
        );
        return;
      }
      const response = await fetch(variantUri);
      if (!response.ok) return;
      const rawManifest = await response.text();
      const { manifest } = await parseManifest2(rawManifest, variantUri);
      const lastSegment = currentSegments.length > 0 ? currentSegments[currentSegments.length - 1] : null;
      const startTime = lastSegment ? (lastSegment.time + lastSegment.duration) / lastSegment.timescale : 0;
      const latestParsed = parseAllSegmentUrls2(
        manifest.rawElement,
        startTime
      );
      const latestSegments = latestParsed["media-playlist"];
      const currentUrlSet = new Set(currentSegments.map((s2) => s2.resolvedUrl));
      const newSegments = latestSegments.filter(
        (s2) => !currentUrlSet.has(s2.resolvedUrl)
      );
      if (newSegments.length > 0) {
        hlsSegmentCache.set(variantUri, [
          ...currentSegments,
          ...newSegments
        ]);
      }
      hlsFreshSegments.set(
        variantUri,
        new Set(latestSegments.map((s2) => s2.resolvedUrl))
      );
      renderHlsExplorer();
    } catch (e4) {
      console.error(`[HLS-POLL] Failed to refresh variant ${variantUri}:`, e4);
    }
  }
  async function initializeVariant(variantUri, isRestart = false) {
    if (isRestart) {
      hlsSegmentCache.delete(variantUri);
      hlsFreshSegments.delete(variantUri);
    }
    displayMode.set(variantUri, "all");
    hlsLoadingVariants.add(variantUri);
    renderHlsExplorer();
    try {
      const response = await fetch(variantUri);
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      const rawManifest = await response.text();
      const { manifest } = await parseManifest2(rawManifest, variantUri);
      const segments = parseAllSegmentUrls2(manifest.rawElement)["media-playlist"];
      hlsSegmentCache.set(variantUri, segments);
      hlsLoadingVariants.delete(variantUri);
      renderHlsExplorer();
      await fetchAndRenderRange(variantUri, segments.slice(-10));
    } catch (err) {
      hlsSegmentCache.set(variantUri, { error: err.message });
      hlsLoadingVariants.delete(variantUri);
      renderHlsExplorer();
    }
  }
  function togglePolling(variantUri) {
    const isEnabled = !pollingEnabled.get(variantUri);
    pollingEnabled.set(variantUri, isEnabled);
    if (isEnabled) {
      pollVariant(variantUri);
    }
    renderHlsExplorer();
  }
  function toggleDisplayMode(variantUri) {
    const currentMode = displayMode.get(variantUri) || "all";
    displayMode.set(variantUri, currentMode === "all" ? "last10" : "all");
    renderHlsExplorer();
  }
  async function restartVariant(variantUri) {
    await initializeVariant(variantUri, true);
  }
  async function toggleVariant(variantUri) {
    if (expandedVariants.has(variantUri)) {
      expandedVariants.delete(variantUri);
      if (variantPollers.has(variantUri)) {
        clearInterval(variantPollers.get(variantUri));
        variantPollers.delete(variantUri);
      }
    } else {
      expandedVariants.add(variantUri);
      if (currentStream.manifest.type === "dynamic") {
        pollingEnabled.set(variantUri, true);
        const pollerId = setInterval(
          () => pollVariant(variantUri),
          POLL_INTERVAL_MS
        );
        variantPollers.set(variantUri, pollerId);
      }
      if (!hlsSegmentCache.has(variantUri)) {
        await initializeVariant(variantUri);
      }
    }
    renderHlsExplorer();
  }
  function findCurrentLiveSegmentIndex(segments) {
    if (!Array.isArray(segments) || segments.length === 0) return -1;
    const now = Date.now();
    for (let i3 = segments.length - 1; i3 >= 0; i3--) {
      const seg = segments[i3];
      if (seg.dateTime) {
        const segStartTime = new Date(seg.dateTime).getTime();
        const segDurationMs = seg.duration / seg.timescale * 1e3 * 90;
        if (now >= segStartTime && now < segStartTime + segDurationMs) {
          return i3;
        }
      }
    }
    return Math.max(0, segments.length - LIVE_EDGE_OFFSET);
  }
  var renderVariant = (variant, index) => {
    const variantUri = variant.uri ? variant.resolvedUri : currentStream.originalUrl;
    const isExpanded = expandedVariants.has(variantUri);
    const isLoading = hlsLoadingVariants.has(variantUri);
    const allSegments = hlsSegmentCache.get(variantUri) || [];
    const hasError = allSegments?.error;
    const freshUrlSet = hlsFreshSegments.get(variantUri) || /* @__PURE__ */ new Set();
    const isLive = currentStream.manifest.type === "dynamic";
    const currentMode = displayMode.get(variantUri) || "all";
    const sourceSegments = Array.isArray(allSegments) ? allSegments : [];
    const visibleSegments = currentMode === "last10" ? sourceSegments.slice(-10) : sourceSegments;
    const segmentsToRender = visibleSegments.slice().reverse();
    const currentLiveSegmentIndex = isLive ? findCurrentLiveSegmentIndex(sourceSegments) : -1;
    return x`
        <div class="bg-gray-800 rounded-lg border border-gray-700">
            <div
                class="flex items-center p-2 bg-gray-900/50 hover:bg-gray-700/70 border-b border-gray-700"
            >
                <div
                    @click=${() => toggleVariant(variantUri)}
                    class="flex-grow flex items-center cursor-pointer"
                >
                    <span
                        class="transform transition-transform ${isExpanded ? "rotate-90" : ""}"
                        >▶</span
                    >
                    <span class="ml-2 font-semibold text-gray-200"
                        >${variant.title}</span
                    >
                    ${variant.attributes ? x`<span
                              class="ml-3 text-xs text-gray-400 font-mono"
                          >
                              (BW:
                              ${(variant.attributes.BANDWIDTH / 1e3).toFixed(0)}
                              kbps, Res:
                              ${variant.attributes.RESOLUTION || "N/A"})
                          </span>` : ""}
                </div>
                <div
                    class="flex items-center justify-end space-x-2 flex-shrink-0"
                >
                    ${isLoading ? x`<div
                              class="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"
                          ></div>` : ""}
                    ${hasError ? x`<span class="text-xs text-red-400"
                              >Error: ${hasError}</span
                          >` : ""}
                    ${isLive ? x`
                              <button
                                  @click=${() => toggleDisplayMode(variantUri)}
                                  class="text-xs bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded"
                              >
                                  ${currentMode === "last10" ? "Show All" : "Show Last 10"}
                              </button>
                              <button
                                  @click=${() => togglePolling(variantUri)}
                                  class="text-xs px-2 py-1 rounded ${pollingEnabled.get(
      variantUri
    ) ? "bg-orange-600 hover:bg-orange-700" : "bg-gray-600 hover:bg-gray-700"}"
                              >
                                  ${pollingEnabled.get(variantUri) ? "Auto-Refresh: ON" : "Auto-Refresh: OFF"}
                              </button>
                              <button
                                  @click=${() => restartVariant(variantUri)}
                                  class="text-xs bg-cyan-600 hover:bg-cyan-700 px-2 py-1 rounded"
                                  title="Restart and fetch the latest playlist"
                              >
                                  Restart
                              </button>
                          ` : ""}
                </div>
            </div>
            ${isExpanded ? x`
                      <div
                          class="overflow-y-auto"
                          style="max-height: calc(2.8rem * 15);"
                      >
                          <table class="w-full text-left text-sm table-auto">
                              <thead class="sticky top-0 bg-gray-900 z-10">
                                  <tr>
                                      <th class="px-3 py-2 w-8"></th>
                                      <th class="px-3 py-2 w-[25%]">
                                          Status / Type
                                      </th>
                                      <th class="px-3 py-2 w-[20%]">
                                          Timing (s)
                                      </th>
                                      <th class="px-3 py-2 w-[55%]">
                                          URL & Actions
                                      </th>
                                  </tr>
                              </thead>
                              <tbody>
                                  ${segmentsToRender.map((seg) => {
      const originalIndex = sourceSegments.indexOf(seg);
      const isFresh = isLive ? freshUrlSet.has(seg.resolvedUrl) : true;
      let livenessState = "default";
      if (isLive) {
        if (originalIndex === currentLiveSegmentIndex) {
          livenessState = "current";
        } else if (!isFresh) {
          livenessState = "stale";
        }
      }
      return segmentRowTemplate(
        seg,
        isFresh,
        livenessState
      );
    })}
                              </tbody>
                          </table>
                      </div>
                  ` : ""}
        </div>
    `;
  };
  function renderHlsExplorer(stream) {
    if (stream) {
      resetHlsState();
      segmentLoadedUnsubscribe = eventBus.subscribe(
        "segment:loaded",
        () => renderHlsExplorer()
      );
    }
    currentStream = stream || currentStream;
    const contentArea = document.getElementById("segment-explorer-content");
    if (!contentArea || !currentStream) return;
    if (currentStream.manifest.rawElement.isMaster) {
      const variants = currentStream.manifest.rawElement.variants.map(
        (variant, index) => ({
          ...variant,
          title: `Variant Stream ${index + 1}`
        })
      ) || [];
      B(
        x`<div class="space-y-1">
                ${variants.map((v2, i3) => renderVariant(v2, i3))}
            </div>`,
        contentArea
      );
    } else {
      const mediaVariant = {
        title: "Media Playlist Segments",
        uri: null,
        resolvedUri: currentStream.originalUrl
      };
      if (!expandedVariants.has(mediaVariant.resolvedUri)) {
        toggleVariant(mediaVariant.resolvedUri);
      }
      B(renderVariant(mediaVariant, 0), contentArea);
    }
  }
  eventBus.subscribe("analysis:started", resetHlsState);

  // js/features/segment-explorer/view.js
  var SEGMENT_PAGE_SIZE = 10;
  var allSegmentsByRep = {};
  var currentContainer = null;
  var currentStream2 = null;
  var segmentLoadedUnsubscribe2 = null;
  function resetExplorerState() {
    allSegmentsByRep = {};
    currentStream2 = null;
    if (segmentLoadedUnsubscribe2) {
      segmentLoadedUnsubscribe2();
      segmentLoadedUnsubscribe2 = null;
    }
    if (currentContainer) {
      currentContainer.innerHTML = "";
    }
    currentContainer = null;
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
  function loadAndRenderDashSegmentRange(mode) {
    const contentArea = document.getElementById("segment-explorer-content");
    if (!contentArea) return;
    B(x`<p class="info">Fetching segment data...</p>`, contentArea);
    eventBus.dispatch("compare:clear");
    const segmentsToFetch = Object.values(allSegmentsByRep).flatMap(
      (segments) => mode === "first" ? segments.slice(0, SEGMENT_PAGE_SIZE) : segments.slice(-SEGMENT_PAGE_SIZE)
    );
    segmentsToFetch.forEach((seg) => {
      eventBus.dispatch("segment:fetch", { url: seg.resolvedUrl });
    });
    renderDashExplorer(
      currentStream2,
      allSegmentsByRep,
      SEGMENT_PAGE_SIZE,
      mode
    );
  }
  function initializeSegmentExplorer(container, stream) {
    if (currentStream2 && currentStream2.id === stream.id) {
      return;
    }
    resetExplorerState();
    currentContainer = container;
    currentStream2 = stream;
    allSegmentsByRep = stream.protocol === "dash" ? parseAllSegmentUrls3(stream) : {};
    const template = x`
        <div class="flex flex-wrap justify-between items-center mb-4 gap-4">
            <h3 class="text-xl font-bold">Segment Explorer</h3>
            <div
                id="segment-explorer-controls"
                class="flex items-center flex-wrap gap-4"
            >
                ${stream.protocol === "dash" ? x`
                          <button
                              @click=${() => loadAndRenderDashSegmentRange("first")}
                              class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition-colors"
                          >
                              First ${SEGMENT_PAGE_SIZE}
                          </button>
                          ${stream.manifest.type === "dynamic" ? x`<button
                                    @click=${() => loadAndRenderDashSegmentRange("last")}
                                    class="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-3 rounded-md transition-colors"
                                >
                                    Last ${SEGMENT_PAGE_SIZE}
                                </button>` : ""}
                      ` : ""}
                <button
                    id="segment-compare-btn"
                    @click=${handleCompareClick}
                    class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled
                >
                    Compare Selected (0/2)
                </button>
            </div>
        </div>
        <div id="segment-explorer-content" class="space-y-4"></div>
    `;
    B(template, container);
    if (stream.protocol === "dash") {
      segmentLoadedUnsubscribe2 = eventBus.subscribe("segment:loaded", () => {
        if (!currentStream2) return;
        const mode = "first";
        renderDashExplorer(
          currentStream2,
          allSegmentsByRep,
          SEGMENT_PAGE_SIZE,
          mode
        );
      });
      loadAndRenderDashSegmentRange("first");
    } else {
      renderHlsExplorer(stream);
    }
  }
  eventBus.subscribe("state:compare-list-changed", ({ count }) => {
    const compareButton = document.getElementById("segment-compare-btn");
    if (compareButton) {
      compareButton.textContent = `Compare Selected (${count}/2)`;
      compareButton.toggleAttribute("disabled", count !== 2);
    }
  });
  eventBus.subscribe("analysis:started", resetExplorerState);

  // js/features/manifest-updates/view.js
  var togglePollingBtn;
  var manifestUpdatesTemplate = (stream) => {
    if (analysisState.streams.length > 1) {
      return x`<p class="info">
            Manifest update polling is only supported when analyzing a single
            stream.
        </p>`;
    }
    if (!stream) {
      return x`<p class="warn">No active stream to monitor.</p>`;
    }
    if (stream.manifest.type !== "dynamic") {
      return x`<p class="info">
            This is a VOD/static manifest. No updates are expected.
        </p>`;
    }
    if (stream.protocol === "hls") {
      return x`<p class="info">
            Live manifest update diffing is currently only supported for DASH
            streams. For HLS, please observe segment changes in the Segment
            Explorer.
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
    let updatesContainer = (
      /** @type {HTMLDivElement} */
      dom.tabContents.updates.querySelector("#mpd-updates-content")
    );
    if (!updatesContainer) {
      const newContainer = document.createElement("div");
      newContainer.id = "mpd-updates-content";
      dom.tabContents.updates.appendChild(newContainer);
      updatesContainer = newContainer;
    }
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
    if (!stream || stream.manifest.type !== "dynamic" || stream.protocol === "hls" || analysisState.streams.length > 1) {
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
      ...new Set(
        audioSets.flatMap((as) => as.representations).map((r2) => r2.codecs)
      )
    ].filter(Boolean);
    const streamType = manifest.type === "dynamic" ? "Live / Dynamic" : "VOD / Static";
    const streamTypeColor = manifest.type === "dynamic" ? "text-red-400" : "text-blue-400";
    return x`
        <div class="space-y-8">
            <div>
                <h3 class="text-xl font-bold mb-4">Manifest Properties</h3>
                <dl
                    class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                    <div
                        class="bg-gray-800 p-4 rounded-lg border border-gray-700"
                    >
                        <dt
                            class="text-sm font-medium text-gray-400 ${tooltipTriggerClasses}"
                            data-tooltip="Indicates if the stream is live or on-demand."
                            data-iso="DASH: 5.3.1.2 / HLS: 4.3.3.5"
                        >
                            Stream Type
                        </dt>
                        <dd
                            class="text-lg font-semibold mt-1 break-words ${streamTypeColor}"
                        >
                            ${streamType}
                        </dd>
                    </div>
                    ${statCardTemplate(
      "Profiles / Version",
      manifest.profiles,
      "Indicates the set of features used in the manifest.",
      "DASH: 8.1 / HLS: 4.3.1.2"
    )}
                    ${statCardTemplate(
      "Segment Format",
      manifest.segmentFormat?.toUpperCase(),
      "The container format used for media segments (e.g., ISOBMFF or MPEG-2 TS).",
      "DASH: 5.3.7 / HLS: 4.3.2.5"
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
      bandwidths.length > 0 ? `${formatBitrate(
        Math.min(...bandwidths)
      )} - ${formatBitrate(
        Math.max(...bandwidths)
      )}` : "N/A",
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
      failDetails: (period) => `Period (start="${period.getAttribute(
        "start"
      )}") requires an @id in dynamic manifests.`
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
      failDetails: (rep) => `One or more IDs in @dependencyId="${rep.getAttribute(
        "dependencyId"
      )}" do not exist in this Period.`
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
        if (!profiles.includes(
          "urn:mpeg:dash:profile:isoff-on-demand:2011"
        ))
          return "skip";
        return mpd.getAttribute("type") === "static";
      },
      passDetails: "OK",
      failDetails: (mpd) => `Profile requires 'static', but found '${mpd.getAttribute(
        "type"
      )}'`
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
                    <div
                        class="w-28 text-xs text-gray-400 font-mono flex-shrink-0"
                    >
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
                </div>
            `;
    });
    return x`
        <div class="mt-6">
            <h4 class="text-lg font-bold">ABR Bitrate Ladder</h4>
            <div class="bg-gray-900 p-4 rounded-md mt-4 space-y-2">
                ${repTemplate}
            </div>
        </div>
    `;
  };
  var hlsTimelineTemplate = (manifest) => {
    const hlsManifest = manifest.rawElement;
    if (manifest.type === "dynamic") {
      return x`
            <h3 class="text-xl font-bold mb-4">Live Timeline Visualization</h3>
            <div class="bg-gray-900 rounded-lg p-4 text-center">
                <p class="text-gray-400">
                    This is a live HLS stream. Timeline visualization for live
                    HLS is represented by the continuously updating segment
                    list in the 'Segment Explorer' tab.
                </p>
            </div>
        `;
    }
    const segments = hlsManifest.segments || [];
    const totalDuration = segments.reduce((acc, seg) => acc + seg.duration, 0);
    if (totalDuration === 0)
      return x`<p class="info">
            No segments found or total duration is zero.
        </p>`;
    const gridTemplateColumns = segments.map((s2) => `${s2.duration / totalDuration * 100}%`).join(" ");
    const timelineSegments = segments.map((seg) => {
      return x`
            <div
                class="bg-gray-700 rounded h-10 border-r-2 border-gray-900 last:border-r-0"
                title="Duration: ${seg.duration.toFixed(3)}s"
            ></div>
        `;
    });
    return x`
        <h3 class="text-xl font-bold mb-4">Timeline Visualization</h3>
        <div class="bg-gray-900 rounded-lg p-2">
            <div
                class="grid grid-flow-col auto-cols-fr"
                style="grid-template-columns: ${gridTemplateColumns}"
            >
                ${timelineSegments}
            </div>
        </div>
        <div class="text-xs text-gray-400 mt-2 text-right">
            Total Duration: ${totalDuration.toFixed(2)}s
        </div>
    `;
  };
  var parseDuration3 = (durationStr) => {
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
      const start = startAttr ? parseDuration3(startAttr) : lastPeriodEnd;
      let duration = durationAttr ? parseDuration3(durationAttr) : null;
      if (duration !== null) {
        lastPeriodEnd = start + duration;
      } else if (i3 === periods.length - 1) {
        const mediaPresentationDuration = parseDuration3(
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
    const totalDuration = parseDuration3(dashElement.getAttribute("mediaPresentationDuration")) || lastPeriodEnd;
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
    const timeShiftBufferDepth = parseDuration3(
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
    const publishTime = new Date(
      dashElement.getAttribute("publishTime")
    ).getTime();
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
    if (protocol === "hls") {
      if (manifest.rawElement.isMaster) {
        return x`
                <h3 class="text-xl font-bold mb-4">HLS Master Playlist</h3>
                <p class="text-sm text-gray-400">
                    A master playlist defines available variants but does not
                    have a monolithic timeline.
                </p>
                ${hlsAbrLadderTemplate(manifest.rawElement)}
            `;
      }
      return x` ${hlsTimelineTemplate(manifest)} `;
    }
    const rawElement = manifest.rawElement;
    if (!rawElement || typeof rawElement.getAttribute !== "function") {
      return x`<p class="warn">
            Cannot display timeline for this manifest type.
        </p>`;
    }
    const isLive = rawElement.getAttribute("type") === "dynamic";
    const template = isLive ? liveTimelineTemplate(rawElement) : staticTimelineTemplate(rawElement);
    return x`${template}`;
  }

  // js/features/feature-analysis/data.js
  var dashFeatureDefinitions = [
    {
      name: "Presentation Type",
      category: "Core Streaming",
      desc: "Defines if the stream is live (`dynamic`) or on-demand (`static`).",
      isoRef: "DASH: 5.3.1.2"
    },
    {
      name: "Multi-Period",
      category: "Core Streaming",
      desc: "The presentation is split into multiple, independent periods. Commonly used for Server-Side Ad Insertion (SSAI).",
      isoRef: "DASH: 5.3.2"
    },
    {
      name: "Content Protection",
      category: "Core Streaming",
      desc: "Indicates that the content is encrypted using one or more schemes like CENC.",
      isoRef: "DASH: 5.8.4.1"
    },
    {
      name: "Segment Templates",
      category: "Timeline & Segment Management",
      desc: "Segment URLs are generated using a template, typically with $Number$ or $Time$ placeholders.",
      isoRef: "DASH: 5.3.9.4"
    },
    {
      name: "Segment Timeline",
      category: "Timeline & Segment Management",
      desc: "Provides explicit timing and duration for each segment via <S> elements, allowing for variable segment sizes.",
      isoRef: "DASH: 5.3.9.6"
    },
    {
      name: "Segment List",
      category: "Timeline & Segment Management",
      desc: "Segment URLs are listed explicitly in the manifest. Common for VOD content.",
      isoRef: "DASH: 5.3.9.3"
    },
    {
      name: "MPD Chaining",
      category: "Timeline & Segment Management",
      desc: "The manifest indicates that another MPD should be played after this one concludes, allowing for programmatic playlists of presentations.",
      isoRef: "DASH: 5.11"
    },
    {
      name: "Low Latency Streaming",
      category: "Live & Dynamic",
      desc: "The manifest includes features for low-latency playback, such as chunked transfer hints or specific service descriptions.",
      isoRef: "DASH: Annex K.3.2"
    },
    {
      name: "Manifest Patch Updates",
      category: "Live & Dynamic",
      desc: "Allows efficient manifest updates by sending only the changed parts of the manifest.",
      isoRef: "DASH: 5.15"
    },
    {
      name: "MPD Events",
      category: "Live & Dynamic",
      desc: "The manifest contains one or more <EventStream> elements, allowing timed metadata to be communicated to the client via the MPD.",
      isoRef: "DASH: 5.10.2"
    },
    {
      name: "Inband Events",
      category: "Live & Dynamic",
      desc: 'The manifest signals that event messages ("emsg" boxes) are present within the media segments themselves, allowing for tightly synchronized metadata.',
      isoRef: "DASH: 5.10.3"
    },
    {
      name: "Producer Reference Time",
      category: "Live & Dynamic",
      desc: "Provides a mapping between media timestamps and a wall-clock production time, enabling latency measurement and control.",
      isoRef: "DASH: 5.12"
    },
    {
      name: "UTC Timing Source",
      category: "Live & Dynamic",
      desc: "Provides a source for clients to synchronize their wall-clock time, crucial for live playback.",
      isoRef: "DASH: 5.8.4.11"
    },
    {
      name: "Dependent Representations",
      category: "Advanced Content",
      desc: "Uses Representations that depend on others for decoding, enabling scalable video coding (SVC) or multi-view coding (MVC).",
      isoRef: "DASH: 5.3.5.2"
    },
    {
      name: "Trick Modes",
      category: "Advanced Content",
      desc: "Provides special tracks (e.g. I-Frame only) to enable efficient fast-forward and rewind.",
      isoRef: "DASH: 5.3.6"
    },
    {
      name: "Service Description",
      category: "Client Guidance & Optimization",
      desc: "Provides guidance to the client on latency targets, playback rates, and quality/bandwidth constraints for the service.",
      isoRef: "DASH: Annex K"
    },
    {
      name: "Role Descriptors",
      category: "Accessibility & Metadata",
      desc: "Uses Role Descriptors to provide alternative tracks for language, commentary, or camera angles.",
      isoRef: "DASH: 5.8.4.2"
    },
    {
      name: "Subtitles & Captions",
      category: "Accessibility & Metadata",
      desc: "Provides text-based tracks for subtitles, closed captions, or other timed text information.",
      isoRef: "DASH: 5.3.3"
    }
  ];
  var hlsFeatureDefinitions = [
    {
      name: "Presentation Type",
      category: "Core Streaming",
      desc: "Defines if the stream is live (`EVENT`) or on-demand (`VOD`).",
      isoRef: "HLS: 4.3.3.5"
    },
    {
      name: "Master Playlist",
      category: "Core Streaming",
      desc: "The manifest is an HLS master playlist that references multiple variant streams at different bitrates.",
      isoRef: "HLS: 4.3.4.2"
    },
    {
      name: "Discontinuity",
      category: "Core Streaming",
      desc: "The presentation contains discontinuity tags, commonly used for Server-Side Ad Insertion (SSAI).",
      isoRef: "HLS: 4.3.2.3"
    },
    {
      name: "Content Protection",
      category: "Core Streaming",
      desc: "Indicates that the content is encrypted using AES-128 or SAMPLE-AES.",
      isoRef: "HLS: 4.3.2.4"
    },
    {
      name: "Session Keys",
      category: "Core Streaming",
      desc: "Allows encryption keys to be specified in the Master Playlist via #EXT-X-SESSION-KEY, enabling clients to preload keys for faster startup.",
      isoRef: "HLS: 4.3.4.5"
    },
    {
      name: "Fragmented MP4 Segments",
      category: "Core Streaming",
      desc: "Content is structured using fMP4 segments instead of MPEG-2 Transport Stream (TS), indicated by #EXT-X-MAP.",
      isoRef: "HLS: 4.3.2.5"
    },
    {
      name: "Independent Segments",
      category: "Timeline & Segment Management",
      desc: "The playlist uses #EXT-X-INDEPENDENT-SEGMENTS, indicating that all media samples in a segment can be decoded without information from other segments.",
      isoRef: "HLS: 4.3.5.1"
    },
    {
      name: "Date Ranges / Timed Metadata",
      category: "Live & Dynamic",
      desc: "The manifest includes timed metadata via #EXT-X-DATERANGE, typically used for ad insertion signaling (SCTE-35).",
      isoRef: "HLS: 4.3.2.7"
    },
    {
      name: "I-Frame Playlists",
      category: "Advanced Content",
      desc: "Provides special, I-Frame only playlists to enable efficient fast-forward and rewind.",
      isoRef: "HLS: 4.3.4.3"
    },
    {
      name: "Session Data",
      category: "Client Guidance & Optimization",
      desc: "The master playlist carries arbitrary session data using #EXT-X-SESSION-DATA, which can be used for things like analytics or custom configuration.",
      isoRef: "HLS: 4.3.4.4"
    },
    {
      name: "Start Offset",
      category: "Client Guidance & Optimization",
      desc: "The playlist uses #EXT-X-START to indicate a preferred starting point, for example to start playback closer to the live edge.",
      isoRef: "HLS: 4.3.5.2"
    },
    {
      name: "Alternative Renditions",
      category: "Accessibility & Metadata",
      desc: "Uses #EXT-X-MEDIA to provide alternative tracks for language, commentary, or camera angles.",
      isoRef: "HLS: 4.3.4.1"
    },
    {
      name: "Subtitles & Captions",
      category: "Accessibility & Metadata",
      desc: "Provides text-based tracks for subtitles or closed captions via #EXT-X-MEDIA.",
      isoRef: "HLS: 4.3.4.1"
    }
  ];

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
    const protection = Array.from(
      manifest.querySelectorAll("ContentProtection")
    );
    if (protection.length > 0) {
      const schemes = [
        ...new Set(
          protection.map(
            (cp) => getDrmSystemName(cp.getAttribute("schemeIdUri"))
          )
        )
      ];
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
      const hasLatency = !!manifest.querySelector(
        "ServiceDescription Latency"
      );
      const hasChunkHint = !!manifest.querySelector(
        'SegmentTemplate[availabilityTimeComplete="false"]'
      );
      if (hasLatency || hasChunkHint) {
        const details = [];
        if (hasLatency)
          details.push("<code>&lt;Latency&gt;</code> target defined.");
        if (hasChunkHint) details.push("Chunked transfer hint present.");
        results["Low Latency Streaming"] = {
          used: true,
          details: details.join(" ")
        };
      } else {
        results["Low Latency Streaming"] = {
          used: false,
          details: "No specific low-latency signals found."
        };
      }
    } else {
      results["Low Latency Streaming"] = {
        used: false,
        details: "Not a dynamic (live) manifest."
      };
    }
    const patchLocation = manifest.querySelector("PatchLocation");
    results["Manifest Patch Updates (DASH)"] = {
      used: !!patchLocation,
      details: patchLocation ? `Patch location: <code>${patchLocation.textContent.trim()}</code>` : "Uses full manifest reloads."
    };
    const utcTimings = Array.from(manifest.querySelectorAll("UTCTiming"));
    if (utcTimings.length > 0) {
      const schemes = [
        ...new Set(
          utcTimings.map(
            (el) => `<code>${el.getAttribute("schemeIdUri").split(":").pop()}</code>`
          )
        )
      ];
      results["UTC Timing Source (DASH)"] = {
        used: true,
        details: `Schemes: ${schemes.join(", ")}`
      };
    } else {
      results["UTC Timing Source (DASH)"] = {
        used: false,
        details: "No clock synchronization source provided."
      };
    }
    const dependentReps = manifest.querySelectorAll(
      "Representation[dependencyId]"
    );
    results["Dependent Representations (DASH)"] = {
      used: dependentReps.length > 0,
      details: dependentReps.length > 0 ? `${dependentReps.length} dependent Representation(s) found.` : "All Representations are self-contained."
    };
    const subRep = manifest.querySelector("SubRepresentation[maxPlayoutRate]");
    const trickRole = manifest.querySelector('AdaptationSet Role[value="trick"]');
    if (subRep || trickRole) {
      const details = [];
      if (subRep)
        details.push(
          "<code>&lt;SubRepresentation&gt;</code> with <code>@maxPlayoutRate</code>"
        );
      if (trickRole) details.push('<code>Role="trick"</code>');
      results["I-Frame Playlists / Trick Modes"] = {
        used: true,
        details: `Detected via: ${details.join(", ")}`
      };
    } else {
      results["I-Frame Playlists / Trick Modes"] = {
        used: false,
        details: "No explicit trick mode signals found."
      };
    }
    const textTracks = Array.from(
      manifest.querySelectorAll(
        'AdaptationSet[contentType="text"], AdaptationSet[mimeType^="application"]'
      )
    );
    if (textTracks.length > 0) {
      const languages = [
        ...new Set(
          textTracks.map((as) => as.getAttribute("lang")).filter(Boolean)
        )
      ];
      results["Subtitles & Captions"] = {
        used: true,
        details: `Found ${textTracks.length} track(s). ${languages.length > 0 ? `Languages: <b>${languages.join(", ")}</b>` : ""}`
      };
    } else {
      results["Subtitles & Captions"] = {
        used: false,
        details: "No text or application AdaptationSets found."
      };
    }
    const roles = Array.from(manifest.querySelectorAll("Role"));
    if (roles.length > 0) {
      const roleValues = [
        ...new Set(
          roles.map((role) => `<code>${role.getAttribute("value")}</code>`)
        )
      ];
      results["Alternative Renditions / Roles"] = {
        used: true,
        details: `Roles found: ${roleValues.join(", ")}`
      };
    } else {
      results["Alternative Renditions / Roles"] = {
        used: false,
        details: "No roles specified."
      };
    }
    results["MPD Events (DASH)"] = {
      used: !!manifest.querySelector("Period > EventStream"),
      details: "Uses <EventStream> for out-of-band event signaling."
    };
    results["Inband Events (DASH)"] = {
      used: !!manifest.querySelector("InbandEventStream"),
      details: "Uses <InbandEventStream> to signal events within segments."
    };
    const chaining = manifest.querySelector(
      'SupplementalProperty[schemeIdUri="urn:mpeg:dash:mpd-chaining:2016"]'
    );
    results["MPD Chaining (DASH)"] = {
      used: !!chaining,
      details: chaining ? `Chains to another MPD: <code>${chaining.getAttribute("value")}</code>` : "Standard presentation end."
    };
    results["Producer Reference Time (DASH)"] = {
      used: !!manifest.querySelector("ProducerReferenceTime"),
      details: "Provides wall-clock production time for latency control."
    };
    results["Service Description (DASH)"] = {
      used: !!manifest.querySelector("ServiceDescription"),
      details: "Provides client playback guidance (latency, etc.)."
    };
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
    const hasKey = hlsParsed.segments.some(
      (s2) => s2.key && s2.key.METHOD !== "NONE"
    );
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
      used: hlsParsed.tags.some(
        (t3) => t3.name === "EXT-X-I-FRAME-STREAM-INF"
      ),
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
    results["Session Data (HLS)"] = {
      used: hlsParsed.tags.some((t3) => t3.name === "EXT-X-SESSION-DATA"),
      details: "Carries arbitrary session data in the master playlist."
    };
    results["Session Keys (HLS)"] = {
      used: hlsParsed.tags.some((t3) => t3.name === "EXT-X-SESSION-KEY"),
      details: "Allows pre-loading of encryption keys from the master playlist."
    };
    results["Independent Segments (HLS)"] = {
      used: hlsParsed.tags.some((t3) => t3.name === "EXT-X-INDEPENDENT-SEGMENTS"),
      details: "All segments are self-contained for decoding."
    };
    results["Start Offset (HLS)"] = {
      used: hlsParsed.tags.some((t3) => t3.name === "EXT-X-START"),
      details: "Specifies a preferred starting position in the playlist."
    };
    return results;
  }

  // js/features/feature-analysis/logic.js
  function generateFeatureAnalysis(manifest, protocol) {
    if (protocol === "dash") {
      return analyzeDashFeatures(
        /** @type {Element} */
        manifest.rawElement
      );
    } else {
      return analyzeHlsFeatures(manifest.rawElement);
    }
  }
  function createFeatureViewModel(analysisResultsMap, protocol) {
    const definitions = protocol === "dash" ? dashFeatureDefinitions : hlsFeatureDefinitions;
    return definitions.map((def) => {
      const result = analysisResultsMap.get(def.name) || {
        used: false,
        details: "Not detected in manifest."
      };
      return {
        ...def,
        ...result
      };
    });
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
                <p class="text-xs text-gray-400 italic mt-1 font-mono">
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
            ${categoryFeatures.map((feature) => featureCardTemplate(feature))}
        </div>
    </div>
`;
  function getFeaturesAnalysisTemplate(stream) {
    if (!stream)
      return x`<p class="warn">No stream loaded to display.</p>`;
    const { results, manifestCount } = stream.featureAnalysis;
    const viewModel = createFeatureViewModel(results, stream.protocol);
    const groupedFeatures = viewModel.reduce((acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = [];
      }
      acc[feature.category].push(feature);
      return acc;
    }, {});
    const getStatusIndicator = () => {
      if (stream.manifest?.type !== "dynamic") {
        return x`
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
            `;
      }
      return x`
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
                        <b class="text-cyan-300 font-bold"
                            >${manifestCount}</b
                        >
                        manifest version(s). New features will be detected
                        automatically.
                    </p>
                </div>
            </div>
        `;
    };
    return x`
        <h3 class="text-xl font-bold mb-2">Feature Usage Analysis</h3>
        ${getStatusIndicator()}
        <p class="text-sm text-gray-500 mb-4">
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

  // js/features/interactive-manifest/dash-renderer.js
  var escapeHtml2 = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  var getTagHTML = (tagName) => {
    const isClosing = tagName.startsWith("/");
    const cleanTagName = isClosing ? tagName.substring(1) : tagName;
    const tagInfo = dashTooltipData[cleanTagName];
    const tagClass = "text-blue-300 rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700";
    const tooltipAttrs = tagInfo ? `data-tooltip="${escapeHtml2(tagInfo.text)}" data-iso="${escapeHtml2(
      tagInfo.isoRef
    )}"` : "";
    return `&lt;${isClosing ? "/" : ""}<span class="${tagClass} ${tagInfo ? tooltipTriggerClasses : ""}" ${tooltipAttrs}>${cleanTagName}</span>`;
  };
  var getAttributeHTML = (tagName, attr) => {
    const attrKey = `${tagName}@${attr.name}`;
    const attrInfo = dashTooltipData[attrKey];
    const nameClass = "text-emerald-300 rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700";
    const valueClass = "text-yellow-300";
    const tooltipAttrs = attrInfo ? `data-tooltip="${escapeHtml2(attrInfo.text)}" data-iso="${escapeHtml2(
      attrInfo.isoRef
    )}"` : "";
    return `<span class="${nameClass} ${attrInfo ? tooltipTriggerClasses : ""}" ${tooltipAttrs}>${attr.name}</span>=<span class="${valueClass}">"${escapeHtml2(attr.value)}"</span>`;
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
          const openingTag = `${indent}${getTagHTML(
            el.tagName
          )}${attrs}&gt;`;
          const childLines = childNodes.flatMap(
            (c2) => preformattedDash(c2, depth + 1)
          );
          const closingTag = `${indent}${getTagHTML(
            `/${el.tagName}`
          )}&gt;`;
          return [openingTag, ...childLines, closingTag];
        } else {
          return [`${indent}${getTagHTML(el.tagName)}${attrs} /&gt;`];
        }
      }
      case Node.TEXT_NODE: {
        return [
          `${indent}<span class="text-gray-200">${escapeHtml2(
            node.textContent.trim()
          )}</span>`
        ];
      }
      case Node.COMMENT_NODE: {
        return [
          `${indent}<span class="text-gray-500 italic">&lt;!--${escapeHtml2(
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
        </div>
    `;
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

  // js/features/interactive-manifest/hls-renderer.js
  var escapeHtml3 = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  var hlsSubNavTemplate = (stream) => {
    const masterPlaylist = stream.mediaPlaylists.get("master");
    if (!masterPlaylist || !masterPlaylist.manifest.rawElement.isMaster)
      return x``;
    const variants = masterPlaylist.manifest.rawElement.variants || [];
    const handleNavClick = (e4) => {
      const button = (
        /** @type {HTMLElement} */
        e4.target.closest("button")
      );
      if (!button) return;
      const url = button.dataset.url;
      eventBus.dispatch("hls:media-playlist-activate", {
        streamId: stream.id,
        url
      });
    };
    const navItem = (label, url, isActive) => x`
        <button
            class="px-3 py-1.5 text-sm rounded-md transition-colors ${isActive ? "bg-blue-600 text-white font-semibold" : "bg-gray-900 hover:bg-gray-700"}"
            data-url="${url}"
        >
            ${label}
        </button>
    `;
    return x`
        <div
            class="mb-4 p-2 bg-gray-900/50 rounded-lg flex flex-wrap gap-2"
            @click=${handleNavClick}
        >
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
      return `<span class="${isComment ? "text-gray-500 italic" : "text-cyan-400"}">${escapeHtml3(line)}</span>`;
    }
    const tagClass = "text-purple-300";
    const attributeClass = "text-emerald-300";
    const valueClass = "text-yellow-300";
    const tooltipClass = `rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700 ${tooltipTriggerClasses}`;
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      const tagName2 = line.substring(1);
      const tagInfo2 = hlsTooltipData[tagName2];
      const tooltipAttrs = tagInfo2 ? `data-tooltip="${escapeHtml3(
        tagInfo2.text
      )}" data-iso="${escapeHtml3(tagInfo2.isoRef)}"` : "";
      return `#<span class="${tagClass} ${tagInfo2 ? tooltipClass : ""}" ${tooltipAttrs}>${tagName2}</span>`;
    }
    const tagName = line.substring(1, separatorIndex);
    const tagValue = line.substring(separatorIndex + 1);
    const tagInfo = hlsTooltipData[tagName];
    const tagTooltipAttrs = tagInfo ? `data-tooltip="${escapeHtml3(tagInfo.text)}" data-iso="${escapeHtml3(
      tagInfo.isoRef
    )}"` : "";
    let valueHtml = "";
    if (tagValue.includes("=")) {
      const parts = tagValue.match(/("[^"]*")|[^,]+/g) || [];
      valueHtml = parts.map((part) => {
        const eqIndex = part.indexOf("=");
        if (eqIndex === -1) return escapeHtml3(part);
        const attr = part.substring(0, eqIndex);
        const val = part.substring(eqIndex + 1);
        const attrKey = `${tagName}@${attr}`;
        const attrInfo = hlsTooltipData[attrKey];
        const attrTooltipAttrs = attrInfo ? `data-tooltip="${escapeHtml3(
          attrInfo.text
        )}" data-iso="${escapeHtml3(attrInfo.isoRef)}"` : "";
        return `<span class="${attributeClass} ${attrInfo ? tooltipClass : ""}" ${attrTooltipAttrs}>${escapeHtml3(
          attr
        )}</span>=<span class="${valueClass}">${escapeHtml3(
          val
        )}</span>`;
      }).join('<span class="text-gray-400">,</span>');
    } else {
      valueHtml = `<span class="${valueClass}">${escapeHtml3(
        tagValue
      )}</span>`;
    }
    return `#<span class="${tagClass} ${tagInfo ? tooltipClass : ""}" ${tagTooltipAttrs}>${tagName}</span>:<span class="font-normal">${valueHtml}</span>`;
  };
  var hlsManifestTemplate = (stream) => {
    const manifestToDisplay = stream.activeManifestForView || stream.manifest;
    const manifestString = manifestToDisplay.rawElement.raw;
    const lines = manifestString ? manifestString.split(/\r?\n/) : [];
    return x`
        <h3 class="text-xl font-bold mb-2">Interactive Manifest</h3>
        ${hlsSubNavTemplate(stream)}
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

  // js/features/interactive-manifest/view.js
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
          return b2.length ? `${formatBitrate2(Math.min(...b2))} - ${formatBitrate2(
            Math.max(...b2)
          )}` : "N/A";
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
        <div
            class="font-semibold text-gray-400 p-2 border-r border-b border-gray-700"
        >
            Property
        </div>
        ${streams.map(
    (stream) => x`<div
                    class="font-semibold text-gray-400 p-2 border-r border-b border-gray-700"
                >
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
      (stream) => x`<div
                            class="p-2 font-mono text-sm border-r border-gray-700"
                        >
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

  // js/ui/rendering.js
  function populateContextSwitcher() {
    if (analysisState.streams.length > 1) {
      dom.contextSwitcherContainer.classList.remove("hidden");
      const optionsTemplate = analysisState.streams.map(
        (s2) => x`<option value="${s2.id}">
                    ${s2.name} (${s2.protocol.toUpperCase()})
                </option>`
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
    if (analysisState.streams.length === 1) {
      B(getGlobalSummaryTemplate(manifest), dom.tabContents.summary);
    }
    B(
      getComplianceReportTemplate(manifest, protocol),
      dom.tabContents.compliance
    );
    attachComplianceFilterListeners();
    B(
      getTimelineAndVisualsTemplate(manifest, protocol),
      dom.tabContents["timeline-visuals"]
    );
    B(getFeaturesAnalysisTemplate(stream), dom.tabContents.features);
    B(
      getInteractiveManifestTemplate(stream),
      dom.tabContents["interactive-manifest"]
    );
    B(
      getInteractiveSegmentTemplate(),
      dom.tabContents["interactive-segment"]
    );
    initializeSegmentExplorer(dom.tabContents.explorer, stream);
    renderManifestUpdates(streamId);
  }

  // js/ui/tabs.js
  var keyboardNavigationListener = null;
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
    stopManifestUpdatePolling();
    stopLiveSegmentHighlighter();
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
      startLiveSegmentHighlighter();
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

  // js/core/modal.js
  function initializeModal() {
    dom.closeModalBtn.addEventListener("click", () => {
      const modalContent = dom.segmentModal.querySelector("div");
      dom.segmentModal.classList.add("opacity-0", "invisible");
      dom.segmentModal.classList.remove("opacity-100", "visible");
      modalContent.classList.add("scale-95");
      modalContent.classList.remove("scale-100");
    });
  }

  // js/features/feature-analysis/poll.js
  var pollers = /* @__PURE__ */ new Map();
  async function pollForFeatures(stream) {
    if (!stream || !stream.originalUrl) {
      return;
    }
    try {
      const response = await fetch(stream.originalUrl);
      if (!response.ok) return;
      const newManifestString = await response.text();
      if (newManifestString === stream.rawManifest) {
        return;
      }
      let newManifest;
      if (stream.protocol === "dash") {
        const { manifest } = await parseManifest(
          newManifestString,
          stream.baseUrl
        );
        newManifest = manifest;
      } else {
        const { manifest } = await parseManifest2(
          newManifestString,
          stream.baseUrl
        );
        newManifest = manifest;
      }
      const newAnalysisResults = generateFeatureAnalysis(
        newManifest,
        stream.protocol
      );
      eventBus.dispatch("feature-analysis:updated", {
        streamId: stream.id,
        newAnalysisResults,
        newRawManifest: newManifestString
        // Pass this to update the stream object
      });
    } catch (e4) {
      console.error(
        `[FEATURE-POLL] Error fetching update for stream ${stream.id}:`,
        e4
      );
    }
  }
  function startFeaturePolling(stream) {
    if (pollers.has(stream.id)) {
      return;
    }
    if (stream.manifest?.type === "dynamic" && stream.originalUrl) {
      const updatePeriodSeconds = stream.manifest.minimumUpdatePeriod || stream.manifest.minBufferTime || 2;
      const pollInterval = Math.max(updatePeriodSeconds * 1e3, 2e3);
      const pollerId = setInterval(() => pollForFeatures(stream), pollInterval);
      pollers.set(stream.id, pollerId);
    }
  }
  function stopAllFeaturePolling() {
    for (const pollerId of pollers.values()) {
      clearInterval(pollerId);
    }
    pollers.clear();
  }

  // js/services/streamService.js
  var import_xml_formatter2 = __toESM(require_cjs2());
  async function analyzeStreams(inputs) {
    eventBus.dispatch("analysis:started");
    const promises = inputs.map(async (input) => {
      let manifestString = "", name = `Stream ${input.id + 1}`, originalUrl = "", baseUrl = "", protocol = "unknown";
      try {
        if (input.url) {
          originalUrl = input.url;
          name = new URL(originalUrl).hostname;
          baseUrl = new URL(originalUrl, window.location.href).href;
          if (originalUrl.toLowerCase().includes(".m3u8"))
            protocol = "hls";
          else protocol = "dash";
          eventBus.dispatch("ui:show-status", {
            message: `Fetching ${name}...`,
            type: "info"
          });
          const response = await fetch(originalUrl);
          if (!response.ok)
            throw new Error(`HTTP Error ${response.status}`);
          manifestString = await response.text();
        } else if (input.file) {
          const file = input.file;
          name = file.name;
          baseUrl = window.location.href;
          if (name.toLowerCase().includes(".m3u8")) protocol = "hls";
          else protocol = "dash";
          eventBus.dispatch("ui:show-status", {
            message: `Reading ${name}...`,
            type: "info"
          });
          manifestString = await file.text();
        } else {
          return null;
        }
        eventBus.dispatch("ui:show-status", {
          message: `Parsing (${protocol.toUpperCase()}) for ${name}...`,
          type: "info"
        });
        let parseResult;
        if (protocol === "hls") {
          parseResult = await parseManifest2(manifestString, baseUrl);
        } else {
          parseResult = await parseManifest(manifestString, baseUrl);
        }
        const { manifest, baseUrl: newBaseUrl } = parseResult;
        baseUrl = newBaseUrl;
        if (protocol === "hls" && manifest.rawElement.isMaster) {
          const firstVariant = manifest.rawElement.variants?.[0];
          if (firstVariant) {
            try {
              const variantResponse = await fetch(
                firstVariant.resolvedUri
              );
              if (variantResponse.ok) {
                const variantManifestStr = await variantResponse.text();
                const { manifest: variantManifest } = await parseManifest2(
                  variantManifestStr,
                  firstVariant.resolvedUri
                );
                manifest.type = variantManifest.type;
              }
            } catch (e4) {
              console.warn(
                "Could not fetch first variant for liveness check, relying on master playlist properties.",
                e4
              );
            }
          }
        }
        const rawInitialAnalysis = generateFeatureAnalysis(
          manifest,
          protocol
        );
        const featureAnalysisResults = /* @__PURE__ */ new Map();
        Object.entries(rawInitialAnalysis).forEach(([name2, result]) => {
          featureAnalysisResults.set(name2, {
            used: result.used,
            details: result.details
          });
        });
        const streamObject = {
          id: input.id,
          name,
          originalUrl,
          baseUrl,
          protocol,
          manifest,
          rawManifest: manifestString,
          mediaPlaylists: /* @__PURE__ */ new Map(),
          activeMediaPlaylistUrl: null,
          activeManifestForView: manifest,
          // Initially, the view shows the main manifest
          featureAnalysis: {
            results: featureAnalysisResults,
            manifestCount: 1
          }
        };
        if (protocol === "hls") {
          streamObject.mediaPlaylists.set("master", {
            manifest,
            rawManifest: manifestString,
            lastFetched: /* @__PURE__ */ new Date()
          });
        }
        return streamObject;
      } catch (error) {
        const errorMessage = `Failed to process stream ${input.id + 1} (${name}): ${error.message}`;
        eventBus.dispatch("analysis:error", {
          message: errorMessage,
          error
        });
        throw error;
      }
    });
    try {
      const results = (await Promise.all(promises)).filter(Boolean);
      if (results.length === 0) {
        eventBus.dispatch("analysis:failed");
        return;
      }
      results.sort((a2, b2) => a2.id - b2.id);
      const manifestUpdates = [];
      const activeStream = results[0];
      const isSingleDynamicStream = results.length === 1 && activeStream.manifest.type === "dynamic";
      if (isSingleDynamicStream) {
        const formattingOptions = {
          indentation: "  ",
          lineSeparator: "\n"
        };
        const formattedInitial = activeStream.protocol === "dash" ? (0, import_xml_formatter2.default)(activeStream.rawManifest, formattingOptions) : activeStream.rawManifest;
        const initialDiffHtml = diffManifest("", formattedInitial);
        manifestUpdates.push({
          timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
          diffHtml: initialDiffHtml
        });
      }
      eventBus.dispatch("state:analysis-complete", {
        streams: results,
        manifestUpdates,
        isPollingActive: isSingleDynamicStream
      });
    } catch (error) {
      console.error(
        "An unhandled error occurred during stream analysis:",
        error
      );
      eventBus.dispatch("analysis:failed");
    }
  }
  async function activateHlsMediaPlaylist({ streamId, url }) {
    const stream = analysisState.streams.find((s2) => s2.id === streamId);
    if (!stream) return;
    if (url === "master") {
      const master = stream.mediaPlaylists.get("master");
      if (master) {
        eventBus.dispatch("state:stream-updated", {
          streamId,
          updatedStreamData: {
            activeManifestForView: master.manifest,
            activeMediaPlaylistUrl: null
          }
        });
      }
      return;
    }
    if (stream.mediaPlaylists.has(url)) {
      const mediaPlaylist = stream.mediaPlaylists.get(url);
      eventBus.dispatch("state:stream-updated", {
        streamId,
        updatedStreamData: {
          activeManifestForView: mediaPlaylist.manifest,
          activeMediaPlaylistUrl: url
        }
      });
    } else {
      eventBus.dispatch("ui:show-status", {
        message: `Fetching HLS media playlist...`,
        type: "info"
      });
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const manifestString = await response.text();
        const { manifest } = await parseManifest2(manifestString, url);
        const newPlaylists = new Map(stream.mediaPlaylists);
        newPlaylists.set(url, {
          manifest,
          rawManifest: manifestString,
          lastFetched: /* @__PURE__ */ new Date()
        });
        eventBus.dispatch("state:stream-updated", {
          streamId,
          updatedStreamData: {
            mediaPlaylists: newPlaylists,
            activeManifestForView: manifest,
            activeMediaPlaylistUrl: url
          }
        });
        eventBus.dispatch("ui:show-status", {
          message: "Media playlist loaded.",
          type: "pass"
        });
      } catch (e4) {
        console.error("Failed to fetch or parse media playlist:", e4);
        eventBus.dispatch("ui:show-status", {
          message: `Failed to load media playlist: ${e4.message}`,
          type: "fail"
        });
      }
    }
  }
  eventBus.subscribe("analysis:request", ({ inputs }) => analyzeStreams(inputs));
  eventBus.subscribe("hls:media-playlist-activate", activateHlsMediaPlaylist);

  // js/services/segmentService.js
  async function fetchSegment(url) {
    if (analysisState.segmentCache.has(url) && analysisState.segmentCache.get(url).status !== -1) {
      eventBus.dispatch("segment:loaded", {
        url,
        entry: analysisState.segmentCache.get(url)
      });
      return;
    }
    try {
      const pendingEntry = { status: -1, data: null, parsedData: null };
      analysisState.segmentCache.set(url, pendingEntry);
      eventBus.dispatch("segment:pending", { url });
      const response = await fetch(url, { method: "GET", cache: "no-store" });
      const data = response.ok ? await response.arrayBuffer() : null;
      let parsedData = null;
      if (data) {
        try {
          if (url.toLowerCase().endsWith(".ts")) {
            parsedData = parse(data);
          } else {
            parsedData = parseISOBMFF(data);
          }
        } catch (e4) {
          console.error(`Failed to parse segment ${url}:`, e4);
          parsedData = { error: e4.message };
        }
      }
      const finalEntry = { status: response.status, data, parsedData };
      analysisState.segmentCache.set(url, finalEntry);
      eventBus.dispatch("segment:loaded", { url, entry: finalEntry });
    } catch (error) {
      console.error(`Failed to fetch segment ${url}:`, error);
      const errorEntry = {
        status: 0,
        data: null,
        parsedData: { error: error.message }
      };
      analysisState.segmentCache.set(url, errorEntry);
      eventBus.dispatch("segment:loaded", { url, entry: errorEntry });
    }
  }
  eventBus.subscribe("segment:fetch", ({ url }) => fetchSegment(url));

  // js/core/state-manager.js
  function initializeStateManager() {
    eventBus.subscribe(
      "state:analysis-complete",
      ({ streams, manifestUpdates, isPollingActive }) => {
        analysisState.streams = streams;
        analysisState.activeStreamId = streams[0]?.id ?? null;
        analysisState.manifestUpdates = manifestUpdates;
        analysisState.isPollingActive = isPollingActive;
      }
    );
    eventBus.subscribe("analysis:started", () => {
      analysisState.streams = [];
      analysisState.activeStreamId = null;
      analysisState.activeSegmentUrl = null;
      analysisState.manifestUpdates = [];
      analysisState.activeManifestUpdateIndex = 0;
      analysisState.segmentCache.clear();
      analysisState.segmentsForCompare = [];
      analysisState.isPollingActive = false;
      analysisState.streamIdCounter = 0;
    });
    eventBus.subscribe(
      "state:stream-updated",
      ({ streamId, updatedStreamData }) => {
        const streamIndex = analysisState.streams.findIndex(
          (s2) => s2.id === streamId
        );
        if (streamIndex !== -1) {
          analysisState.streams[streamIndex] = {
            ...analysisState.streams[streamIndex],
            ...updatedStreamData
          };
        }
      }
    );
    eventBus.subscribe("compare:add-segment", ({ url }) => {
      if (analysisState.segmentsForCompare.length < 2 && !analysisState.segmentsForCompare.includes(url)) {
        analysisState.segmentsForCompare.push(url);
        eventBus.dispatch("state:compare-list-changed", {
          count: analysisState.segmentsForCompare.length
        });
      }
    });
    eventBus.subscribe("compare:remove-segment", ({ url }) => {
      const index = analysisState.segmentsForCompare.indexOf(url);
      if (index > -1) {
        analysisState.segmentsForCompare.splice(index, 1);
        eventBus.dispatch("state:compare-list-changed", {
          count: analysisState.segmentsForCompare.length
        });
      }
    });
    eventBus.subscribe("compare:clear", () => {
      analysisState.segmentsForCompare = [];
      eventBus.dispatch("state:compare-list-changed", { count: 0 });
    });
    eventBus.subscribe(
      "feature-analysis:updated",
      ({ streamId, newAnalysisResults, newRawManifest }) => {
        const streamIndex = analysisState.streams.findIndex(
          (s2) => s2.id === streamId
        );
        if (streamIndex === -1) return;
        const stream = analysisState.streams[streamIndex];
        stream.featureAnalysis.manifestCount++;
        stream.rawManifest = newRawManifest;
        Object.entries(newAnalysisResults).forEach(([name, result]) => {
          const existing = stream.featureAnalysis.results.get(name);
          if (result.used && (!existing || !existing.used)) {
            stream.featureAnalysis.results.set(name, {
              used: true,
              details: result.details
            });
          } else if (!existing) {
            stream.featureAnalysis.results.set(name, {
              used: result.used,
              details: result.details
            });
          }
        });
        if (stream.id === analysisState.activeStreamId) {
          eventBus.dispatch("ui:rerender-features-tab");
        }
      }
    );
  }
  initializeStateManager();

  // js/core/app.js
  var HISTORY_KEY2 = "dash_analyzer_history";
  var PRESETS_KEY2 = "dash_analyzer_presets";
  var MAX_HISTORY_ITEMS = 10;
  dom.addStreamBtn.addEventListener("click", addStreamInput);
  dom.analyzeBtn.addEventListener("click", handleAnalysis);
  dom.tabs.addEventListener("click", handleTabClick);
  dom.newAnalysisBtn.addEventListener("click", () => {
    stopManifestUpdatePolling();
    stopAllFeaturePolling();
    eventBus.dispatch("analysis:started");
    dom.results.classList.add("hidden");
    dom.newAnalysisBtn.classList.add("hidden");
    dom.contextSwitcherContainer.classList.add("hidden");
    dom.inputSection.classList.remove("hidden");
    dom.status.textContent = "";
    dom.streamInputs.innerHTML = "";
    addStreamInput();
    Object.values(dom.tabContents).forEach((container) => {
      if (container) {
        B(x``, container);
      }
    });
    const firstTab = (
      /** @type {HTMLElement} */
      dom.tabs.querySelector('[data-tab="comparison"]')
    );
    const activeClasses = ["border-blue-600", "text-gray-100", "bg-gray-700"];
    const inactiveClasses = ["border-transparent"];
    dom.tabs.querySelectorAll("[data-tab]").forEach((t3) => {
      t3.classList.remove(...activeClasses);
      t3.classList.add(...inactiveClasses);
    });
    if (firstTab) {
      firstTab.classList.add(...activeClasses);
      firstTab.classList.remove(...inactiveClasses);
    }
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
    initializeModal();
  });
  function saveStreamToHistory(stream) {
    if (!stream || !stream.originalUrl) return;
    const presets = (
      /** @type {Array<object>} */
      JSON.parse(localStorage.getItem(PRESETS_KEY2) || "[]")
    );
    const isPreset = presets.some((p2) => p2.url === stream.originalUrl);
    if (isPreset) return;
    let history = (
      /** @type {Array<object>} */
      JSON.parse(localStorage.getItem(HISTORY_KEY2) || "[]")
    );
    history = history.filter((item) => item.url !== stream.originalUrl);
    history.unshift({
      name: stream.name,
      url: stream.originalUrl,
      protocol: stream.protocol,
      type: stream.manifest?.type === "dynamic" ? "live" : "vod"
    });
    if (history.length > MAX_HISTORY_ITEMS) {
      history.length = MAX_HISTORY_ITEMS;
    }
    localStorage.setItem(HISTORY_KEY2, JSON.stringify(history));
  }
  function handleAnalysis() {
    const inputGroups = dom.streamInputs.querySelectorAll(".stream-input-group");
    const inputs = Array.from(inputGroups).map((group) => {
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
      return {
        id,
        url: urlInput.value,
        file: fileInput.files.length > 0 ? fileInput.files[0] : null
      };
    }).filter((input) => input.url || input.file);
    if (inputs.length > 0) {
      eventBus.dispatch("analysis:request", { inputs });
    } else {
      showStatus("Please provide a stream URL or file to analyze.", "warn");
    }
  }
  eventBus.subscribe("state:analysis-complete", () => {
    const { streams } = analysisState;
    if (streams.length > 0) {
      saveStreamToHistory(streams[0]);
    }
    const defaultTab = streams.length > 1 ? "comparison" : "summary";
    populateContextSwitcher();
    renderAllTabs();
    showStatus(`Analysis Complete for ${streams.length} stream(s).`, "pass");
    dom.inputSection.classList.add("hidden");
    dom.results.classList.remove("hidden");
    dom.newAnalysisBtn.classList.remove("hidden");
    document.querySelector(`[data-tab="${defaultTab}"]`).click();
    analysisState.streams.forEach(startFeaturePolling);
  });
  eventBus.subscribe("state:stream-updated", () => {
    const stream = analysisState.streams.find(
      (s2) => s2.id === analysisState.activeStreamId
    );
    if (stream) {
      B(
        getInteractiveManifestTemplate(stream),
        dom.tabContents["interactive-manifest"]
      );
    }
  });
  eventBus.subscribe("ui:rerender-tabs", () => {
    renderAllTabs();
  });
  eventBus.subscribe("ui:rerender-features-tab", () => {
    const stream = analysisState.streams.find(
      (s2) => s2.id === analysisState.activeStreamId
    );
    if (stream) {
      B(getFeaturesAnalysisTemplate(stream), dom.tabContents["features"]);
    }
  });
  eventBus.subscribe("analysis:error", ({ message, error }) => {
    showStatus(message, "fail");
    console.error("An analysis error occurred:", error);
  });
  eventBus.subscribe("analysis:failed", () => {
    dom.results.classList.add("hidden");
  });
  eventBus.subscribe("ui:show-status", ({ message, type }) => {
    showStatus(message, type);
  });
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
