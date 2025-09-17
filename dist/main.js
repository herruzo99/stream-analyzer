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
        const m = matchDeclaration ? match(/^<\?(xml(-stylesheet)?)\s*/) : match(/^<\?([\w-:.]+)\s*/);
        if (!m)
          return;
        const node = {
          name: m[1],
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
        const m = match(/^<([^?!</>\s]+)\s*/);
        if (!m)
          return;
        const node = {
          type: "Element",
          name: m[1],
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
        const m = match(/^<!DOCTYPE\s+\S+\s+SYSTEM[^>]*>/) || match(/^<!DOCTYPE\s+\S+\s+PUBLIC[^>]*>/) || match(/^<!DOCTYPE\s+\S+\s*\[[^\]]*]>/) || match(/^<!DOCTYPE\s+\S+\s*>/);
        if (m) {
          const node = {
            type: "DocumentType",
            content: m[0]
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
        const m = match(/^<!--[\s\S]*?-->/);
        if (m) {
          const node = {
            type: "Comment",
            content: m[0]
          };
          return {
            excluded: parsingState.options.filter(node) === false,
            node
          };
        }
      }
      function text() {
        const m = match(/^([^<]+)/);
        if (m) {
          const node = {
            type: "Text",
            content: m[1]
          };
          return {
            excluded: parsingState.options.filter(node) === false,
            node
          };
        }
      }
      function attribute() {
        const m = match(/([^=]+)\s*=\s*("[^"]*"|'[^']*'|[^>\s]+)\s*/);
        if (m) {
          return {
            name: m[1].trim(),
            value: stripQuotes(m[2].trim())
          };
        }
      }
      function stripQuotes(val) {
        return val.replace(/^['"]|['"]$/g, "");
      }
      function match(re) {
        const m = parsingState.xml.match(re);
        if (m) {
          parsingState.xml = parsingState.xml.slice(m[0].length);
          return m;
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
        let i;
        for (i = 0; i < state.level; i++) {
          state.content += state.options.indentation;
        }
      }
      function indent(state) {
        state.content = state.content.replace(/ +$/, "");
        let i;
        for (i = 0; i < state.level; i++) {
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
    segmentFreshnessChecker: null,
    streamIdCounter: 0,
    mpdUpdates: [],
    activeMpdUpdateIndex: 0,
    isPollingActive: false,
    segmentCache: /* @__PURE__ */ new Map()
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
      "interactive-mpd": (
        /** @type {HTMLDivElement} */
        document.getElementById("tab-interactive-mpd")
      ),
      explorer: (
        /** @type {HTMLDivElement} */
        document.getElementById("tab-explorer")
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

  // js/helpers/drm-helper.js
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

  // js/views/summary.js
  var createRow = (label, value, tooltipText, isoRef) => {
    if (value === null || value === void 0 || value === "") return "";
    return `<div class="py-2 flex justify-between border-b border-gray-700 items-center flex-wrap">
                <dt class="text-sm font-medium text-gray-400">${label}${createInfoTooltip(tooltipText, isoRef)}</dt>
                <dd class="text-sm text-right font-mono text-white">${value}</dd>
            </div>`;
  };
  var formatBitrate = (bps) => {
    if (bps >= 1e6) return `${(bps / 1e6).toFixed(2)} Mbps`;
    return `${(bps / 1e3).toFixed(0)} kbps`;
  };
  function getGlobalSummaryHTML(mpd, isComparison = false) {
    if (isComparison) {
      const streams = analysisState.streams;
      const headers = streams.map((s) => `<th data-label="Stream">${s.name}</th>`).join("");
      const getRow = (label, accessor) => {
        let cells = streams.map((s) => `<td data-label="${s.name}">${accessor(s.mpd)}</td>`).join("");
        return `<tr><td data-label="Property" class="prop-col">${label}</td>${cells}</tr>`;
      };
      const getDrmSystems = (m) => {
        const schemes = [...new Set(Array.from(m.querySelectorAll("ContentProtection")).map((cp) => getDrmSystemName(cp.getAttribute("schemeIdUri"))))];
        return schemes.length > 0 ? `Yes (${schemes.join(", ")})` : "No";
      };
      return `<h3 class="text-xl font-bold mb-4">Global Summary Comparison</h3>
                <div class="overflow-x-auto">
                   <table class="comparison-table w-full">
                        <thead><tr><th class="prop-col">Property</th>${headers}</tr></thead>
                        <tbody>
                            ${getRow("Presentation Type", (m) => m.getAttribute("type"))}
                            ${getRow("Profiles", (m) => (m.getAttribute("profiles") || "").replace(/urn:mpeg:dash:profile:/g, " ").trim())}
                            ${getRow("Live Window", (m) => m.getAttribute("type") === "dynamic" ? m.getAttribute("timeShiftBufferDepth") || "N/A" : "N/A")}
                            ${getRow("# of Periods", (m) => m.querySelectorAll("Period").length)}
                            ${getRow("Content Protection", getDrmSystems)}
                        </tbody>
                   </table>
                </div>`;
    }
    if (!mpd) return "<p>No MPD data to display.</p>";
    let html = '<h3 class="text-xl font-bold mb-4">Manifest Properties</h3><dl>';
    const getAttr = (el, attr, defaultVal = "N/A") => el.getAttribute(attr) || defaultVal;
    html += createRow("Presentation Type", getAttr(mpd, "type"), "Defines if the stream is live (`dynamic`) or on-demand (`static`).", "Clause 5.3.1.2, Table 3");
    html += createRow("Profiles", getAttr(mpd, "profiles").replace(/urn:mpeg:dash:profile:/g, " "), "Indicates the set of features used in the manifest.", "Clause 8.1");
    html += createRow("Min Buffer Time", getAttr(mpd, "minBufferTime"), "The minimum buffer time a client should maintain to ensure smooth playback.", "Clause 5.3.1.2, Table 3");
    if (getAttr(mpd, "type") === "dynamic") {
      html += createRow("Publish Time", new Date(getAttr(mpd, "publishTime")).toLocaleString(), "The time this version of the MPD was generated on the server.", "Clause 5.3.1.2, Table 3");
      html += createRow("Availability Start Time", new Date(getAttr(mpd, "availabilityStartTime")).toLocaleString(), "The anchor time for all media segments in the presentation.", "Clause 5.3.1.2, Table 3");
      html += createRow("Update Period", getAttr(mpd, "minimumUpdatePeriod"), "How often a client should check for a new version of the MPD.", "Clause 5.3.1.2, Table 3");
      html += createRow("Time Shift Buffer Depth", getAttr(mpd, "timeShiftBufferDepth"), "The duration of the seekable live window available to the client.", "Clause 5.3.1.2, Table 3");
      html += createRow("Suggested Presentation Delay", getAttr(mpd, "suggestedPresentationDelay"), "A suggested delay from the live edge for players to begin presentation.", "Clause 5.3.1.2, Table 3");
    } else {
      html += createRow("Media Duration", getAttr(mpd, "mediaPresentationDuration"), "The total duration of the on-demand content.", "Clause 5.3.1.2, Table 3");
    }
    html += "</dl>";
    html += '<h3 class="text-xl font-bold mt-6 mb-4">Content Overview</h3>';
    const videoSets = Array.from(mpd.querySelectorAll('AdaptationSet[contentType="video"], AdaptationSet[mimeType^="video"]'));
    const audioSets = Array.from(mpd.querySelectorAll('AdaptationSet[contentType="audio"], AdaptationSet[mimeType^="audio"]'));
    const textSets = Array.from(mpd.querySelectorAll('AdaptationSet[contentType="text"], AdaptationSet[contentType="application"], AdaptationSet[mimeType^="text"], AdaptationSet[mimeType^="application"]'));
    const protectionSchemes = [...new Set(Array.from(mpd.querySelectorAll("ContentProtection")).map((cp) => getDrmSystemName(cp.getAttribute("schemeIdUri"))))];
    const protectionText = protectionSchemes.length > 0 ? `Yes (${protectionSchemes.join(", ")})` : "No";
    const protectionTooltip = protectionSchemes.length > 0 ? `DRM Systems Detected: ${protectionSchemes.join(", ")}` : "No encryption descriptors were found.";
    html += "<dl>";
    html += createRow("Periods", mpd.querySelectorAll("Period").length, "A Period represents a segment of content.", "Clause 5.3.2");
    html += createRow("Video Tracks", videoSets.length, "Number of distinct video Adaptation Sets.", "Clause 5.3.3");
    html += createRow("Audio Tracks", audioSets.length, "Number of distinct audio Adaptation Sets.", "Clause 5.3.3");
    html += createRow("Subtitle/Text Tracks", textSets.length, "Number of distinct subtitle or text Adaptation Sets.", "Clause 5.3.3");
    html += createRow("Content Protection", protectionText, protectionTooltip, "Clause 5.8.4.1");
    html += "</dl>";
    if (videoSets.length > 0) {
      html += '<h3 class="text-xl font-bold mt-6 mb-4">Video Details</h3><dl>';
      const allVideoReps = videoSets.flatMap((as) => Array.from(as.querySelectorAll("Representation")));
      const bandwidths = allVideoReps.map((r) => parseInt(r.getAttribute("bandwidth"))).filter(Boolean);
      const resolutions = [...new Set(allVideoReps.map((r) => {
        const as = r.closest("AdaptationSet");
        const width = r.getAttribute("width") || as.getAttribute("width");
        const height = r.getAttribute("height") || as.getAttribute("height");
        return `${width}x${height}`;
      }))];
      const codecs = [...new Set(allVideoReps.map((r) => r.getAttribute("codecs") || r.closest("AdaptationSet").getAttribute("codecs")))].filter(Boolean);
      if (bandwidths.length > 0) {
        html += createRow("Bitrate Range", `${formatBitrate(Math.min(...bandwidths))} - ${formatBitrate(Math.max(...bandwidths))}`, "The minimum and maximum bitrates available for video.", "Clause 5.3.5.2, Table 9");
      }
      html += createRow("Resolutions", resolutions.join(", "), "Unique video resolutions available.", "Clause 5.3.7.2, Table 14");
      html += createRow("Video Codecs", codecs.join(", "), "Unique video codecs declared in the manifest.", "Clause 5.3.7.2, Table 14");
      html += "</dl>";
    }
    if (audioSets.length > 0) {
      html += '<h3 class="text-xl font-bold mt-6 mb-4">Audio Details</h3><dl>';
      const languages = [...new Set(audioSets.map((as) => as.getAttribute("lang")))].filter(Boolean);
      const allAudioReps = audioSets.flatMap((as) => Array.from(as.querySelectorAll("Representation")));
      const codecs = [...new Set(allAudioReps.map((r) => r.getAttribute("codecs") || r.closest("AdaptationSet").getAttribute("codecs")))].filter(Boolean);
      const channelConfigs = [...new Set(audioSets.map((as) => as.querySelector("AudioChannelConfiguration")?.getAttribute("value")))].filter(Boolean);
      html += createRow("Languages", languages.join(", ") || "Not Specified", "Languages declared for audio tracks.", "Clause 5.3.3.2, Table 5");
      html += createRow("Audio Codecs", codecs.join(", "), "Unique audio codecs declared in the manifest.", "Clause 5.3.7.2, Table 14");
      if (channelConfigs.length > 0) {
        html += createRow("Channel Configurations", channelConfigs.map((c) => `${c} channels`).join(", "), "Audio channel layouts (e.g., 2 for stereo, 6 for 5.1).", "Clause 5.8.5.4");
      }
      html += "</dl>";
    }
    html += `<div class="dev-watermark">Summary v2.1</div>`;
    return html;
  }

  // js/api/compliance.js
  function runChecks(mpdToCheck) {
    let checks = [];
    const check = (text, condition, details, failDetails, isoRef) => {
      if (condition === "skip") return;
      const status = condition ? "pass" : "fail";
      checks.push({ text, status, details: status === "pass" ? details : failDetails, isoRef });
    };
    const checkWarn = (text, condition, details, warnDetails, isoRef) => {
      if (condition === "skip") return;
      const status = condition ? "pass" : "warn";
      checks.push({ text, status, details: status === "pass" ? details : warnDetails, isoRef });
    };
    check("MPD root element exists", !!mpdToCheck, "OK", "MPD could not be parsed.", "Clause 5.3.1.2");
    if (!mpdToCheck) return checks;
    check("MPD@profiles is present and not empty", mpdToCheck.hasAttribute("profiles") && mpdToCheck.getAttribute("profiles") !== "", "OK", "This attribute is mandatory.", "Clause 5.3.1.2, Table 3");
    check("MPD@minBufferTime is present", mpdToCheck.hasAttribute("minBufferTime"), "OK", "This attribute is mandatory.", "Clause 5.3.1.2, Table 3");
    const isDynamic = mpdToCheck.getAttribute("type") === "dynamic";
    if (isDynamic) {
      check("Dynamic MPD has @availabilityStartTime", mpdToCheck.hasAttribute("availabilityStartTime"), "OK", "Required for dynamic MPDs.", "Clause 5.3.1.2, Table 3");
      check("Dynamic MPD has @publishTime", mpdToCheck.hasAttribute("publishTime"), "OK", "Required for dynamic MPDs.", "Clause 5.3.1.2, Table 3");
      checkWarn("Dynamic MPD has @minimumUpdatePeriod", mpdToCheck.hasAttribute("minimumUpdatePeriod"), "OK", "Recommended for dynamic MPDs to signal updates.", "Clause 5.3.1.2, Table 3");
    } else {
      const hasMediaPresentationDuration = mpdToCheck.hasAttribute("mediaPresentationDuration");
      const lastPeriod = mpdToCheck.querySelector("Period:last-of-type");
      const lastPeriodHasDuration = lastPeriod ? lastPeriod.hasAttribute("duration") : false;
      check("Static MPD must have a defined duration", hasMediaPresentationDuration || lastPeriodHasDuration, "OK", "Static MPDs must have @mediaPresentationDuration or the last Period must have a @duration.", "Clause 5.3.1.2, Table 3");
      check("Static MPD does not have @minimumUpdatePeriod", !mpdToCheck.hasAttribute("minimumUpdatePeriod"), "OK", "Should not be present for static MPDs.", "Clause 5.3.1.2, Table 3");
      check("Static MPD does not have @timeShiftBufferDepth", !mpdToCheck.hasAttribute("timeShiftBufferDepth"), "OK", "Should not be present for static MPDs.", "Clause 5.3.1.2, Table 3");
      check("Static MPD does not have @suggestedPresentationDelay", !mpdToCheck.hasAttribute("suggestedPresentationDelay"), "OK", "Should not be present for static MPDs.", "Clause 5.3.1.2, Table 3");
    }
    const periods = mpdToCheck.querySelectorAll("Period");
    if (periods.length === 0) {
      checks.push({ text: "MPD contains no Period elements", status: "fail", details: "At least one Period element is required.", isoRef: "Clause 5.3.1.2" });
    }
    periods.forEach((period, i) => {
      const periodIdForLogs = period.getAttribute("id") || `(index ${i})`;
      if (isDynamic) {
        check(`Dynamic Period "${periodIdForLogs}" has @id`, period.hasAttribute("id"), "OK", "In dynamic MPDs, all Periods shall have an id.", "Clause 5.3.2.2, Table 4");
      }
      const periodDuration = period.getAttribute("duration");
      if (period.querySelectorAll("AdaptationSet").length === 0 && periodDuration !== "PT0S" && periodDuration !== "0") {
        checkWarn(`Period "${periodIdForLogs}" contains at least one AdaptationSet`, false, "", "A Period should contain at least one AdaptationSet unless its duration is 0.", "Clause 5.3.2.2, Table 4");
      }
      if (period.hasAttribute("xlink:href")) {
        checkWarn(`Period "${periodIdForLogs}" uses xlink:href`, false, "", "This tool does not currently support resolving remote Period elements via xlink. The analysis of this Period will be incomplete.", "Clause 5.5");
      }
      const allRepIdsInPeriod = Array.from(period.querySelectorAll("Representation")).map((r) => r.getAttribute("id")).filter(Boolean);
      if (new Set(allRepIdsInPeriod).size < allRepIdsInPeriod.length) {
        checks.push({ text: `Representation @id is not unique within Period "${periodIdForLogs}"`, status: "fail", details: "All Representations in a Period must have a unique id.", isoRef: "Clause 5.3.5.2, Table 9" });
      }
      const asIds = /* @__PURE__ */ new Set();
      period.querySelectorAll("AdaptationSet").forEach((as, asIndex) => {
        const asId = as.getAttribute("id");
        if (asId) {
          if (asIds.has(asId)) {
            checks.push({ text: `AdaptationSet @id "${asId}" is not unique within Period "${periodIdForLogs}"`, status: "fail", details: "AdaptationSet IDs must be unique within a Period.", isoRef: "Clause 5.3.3.2, Table 5" });
          }
          asIds.add(asId);
        }
        const asIdForLogs = asId || `(index ${asIndex})`;
        const reps = as.querySelectorAll("Representation");
        checkWarn(`AdaptationSet "${asIdForLogs}" has @contentType or @mimeType`, as.hasAttribute("contentType") || as.hasAttribute("mimeType"), "OK", "Recommended for track identification.", "Clause 5.3.3.2, Table 5");
        if (reps.length > 1) {
          checkWarn(`AdaptationSet "${asIdForLogs}" with multiple Representations uses Segment Alignment`, as.getAttribute("segmentAlignment") === "true", "OK", "Recommended for seamless ABR switching.", "Clause 5.3.3.2, Table 5");
        }
        reps.forEach((rep) => {
          const repId = rep.getAttribute("id");
          if (!repId) {
            checks.push({ text: `Representation in AdaptationSet "${asIdForLogs}" is missing @id`, status: "fail", details: "Representation @id is mandatory.", isoRef: "Clause 5.3.5.2, Table 9" });
          }
          check(`Representation "${repId || "with missing id"}" has @bandwidth`, rep.hasAttribute("bandwidth"), "OK", "Representation @bandwidth is mandatory.", "Clause 5.3.5.2, Table 9");
          const mimeType = rep.getAttribute("mimeType") || as.getAttribute("mimeType");
          check(`Representation "${repId || "with missing id"}" has an effective @mimeType`, !!mimeType, "OK", "Representation @mimeType is mandatory and must be present on the Representation or inherited from the AdaptationSet.", "Clause 5.3.7.2, Table 14");
          const minBandwidth = as.getAttribute("minBandwidth");
          if (minBandwidth) {
            const repBw = parseInt(rep.getAttribute("bandwidth"));
            if (repBw < parseInt(minBandwidth)) {
              checkWarn(`Representation ${rep.getAttribute("id")} violates AdaptationSet@minBandwidth`, false, "", `Rep bandwidth ${repBw} is less than minBandwidth ${minBandwidth}`, "Clause 5.3.3.2, Table 5");
            }
          }
          const dependencyId = rep.getAttribute("dependencyId");
          if (dependencyId) {
            const allRepIdsSet = new Set(allRepIdsInPeriod);
            const dependencies = dependencyId.split(" ");
            dependencies.forEach((depId) => {
              if (!allRepIdsSet.has(depId)) {
                checkWarn(`Representation "${repId}" has an invalid @dependencyId`, false, "", `The referenced Representation ID "${depId}" does not exist in this Period.`, "Clause 5.3.5.2, Table 9");
              }
            });
          }
          const segmentBase = rep.querySelector("SegmentBase");
          const segmentList = rep.querySelector("SegmentList");
          const segmentTemplate = rep.querySelector("SegmentTemplate");
          const segmentInfoElements = [segmentBase, segmentList, segmentTemplate].filter((el) => el && el.parentElement === rep);
          if (segmentInfoElements.length > 1) {
            checks.push({ text: `Representation "${repId}" has multiple segment information types`, status: "fail", details: "A Representation can only contain one of SegmentBase, SegmentList, or SegmentTemplate directly.", isoRef: "Clause 5.3.9.1" });
          }
          if (segmentList) {
            const segmentURLs = segmentList.querySelectorAll("SegmentURL");
            if (segmentURLs.length === 0 && periodDuration !== "PT0S") {
              checks.push({ text: `SegmentList for Rep "${repId}" is empty`, status: "fail", details: "A SegmentList should contain at least one SegmentURL unless the Period duration is 0.", isoRef: "Clause 5.3.9.3.2, Table 19" });
            }
          }
          if (segmentBase && !segmentList && !segmentTemplate) {
            const hasBaseURL = rep.querySelector("BaseURL") || as.querySelector("BaseURL") || period.querySelector("BaseURL");
            if (!hasBaseURL) {
              checkWarn(`Representation "${repId}" with SegmentBase has no BaseURL`, false, "", "Representations with only SegmentBase should have a BaseURL to define the segment location.", "Clause 5.3.9.2.1");
            }
          }
          const effectiveSegmentTemplate = segmentTemplate || as.querySelector("SegmentTemplate") || period.querySelector("SegmentTemplate");
          if (effectiveSegmentTemplate) {
            const mediaUrl = effectiveSegmentTemplate.getAttribute("media");
            if (!mediaUrl) {
              checks.push({ text: `SegmentTemplate for Rep "${repId}" is missing @media attribute`, status: "fail", details: "The @media attribute is mandatory for SegmentTemplate.", isoRef: "Clause 5.3.9.4.2, Table 20" });
            }
            const hasDuration = effectiveSegmentTemplate.hasAttribute("duration");
            const hasTimeline = !!effectiveSegmentTemplate.querySelector("SegmentTimeline");
            if (mediaUrl && mediaUrl.includes("$Number$")) {
              check(`SegmentTemplate for Rep "${repId}" with $Number$ has @duration or SegmentTimeline`, hasDuration || hasTimeline, "OK", "When using $Number$, either @duration must be specified or a SegmentTimeline must be present.", "Clause 5.3.9.5.3");
            }
            if (mediaUrl && mediaUrl.includes("$Time$")) {
              check(`SegmentTemplate for Rep "${repId}" with $Time$ has SegmentTimeline`, hasTimeline, "OK", "When using $Time$, a SegmentTimeline must be present.", "Clause 5.3.9.4.4, Table 21");
            }
            checkWarn(`SegmentTemplate for Rep "${repId}" has @initialization`, effectiveSegmentTemplate.hasAttribute("initialization"), "OK", "An @initialization attribute is recommended for SegmentTemplate.", "Clause 5.3.9.4.2, Table 20");
          }
        });
      });
    });
    const profiles = (mpdToCheck.getAttribute("profiles") || "").toLowerCase();
    if (profiles.includes("urn:mpeg:dash:profile:isoff-on-demand:2011")) {
      checks.push({ text: "ISO BMFF On-Demand Profile Checks", status: "info", details: "Running checks for urn:mpeg:dash:profile:isoff-on-demand:2011", isoRef: "Clause 8.3" });
      check('On-Demand profile requires MPD@type="static"', mpdToCheck.getAttribute("type") === "static", "OK", `Profile requires 'static', but found '${mpdToCheck.getAttribute("type")}'`, "Clause 8.3.2");
      mpdToCheck.querySelectorAll("Representation").forEach((rep) => {
        const hasSingleSegment = !rep.querySelector("SegmentTemplate") && !rep.querySelector("SegmentList");
        check(`On-Demand profile Representation "${rep.getAttribute("id")}" should be a single segment`, hasSingleSegment, "OK", "Each Representation should be a single self-initializing segment.", "Clause 8.3.3");
      });
    }
    if (profiles.includes("urn:mpeg:dash:profile:isoff-live:2011")) {
      checks.push({ text: "ISO BMFF Live Profile Checks", status: "info", details: "Running checks for urn:mpeg:dash:profile:isoff-live:2011", isoRef: "Clause 8.4" });
      mpdToCheck.querySelectorAll("AdaptationSet").forEach((as) => {
        if (as.querySelectorAll("Representation").length > 1) {
          check("Live profile requires AdaptationSet@segmentAlignment for ABR", as.getAttribute("segmentAlignment") === "true", "OK", "segmentAlignment must be true for AdaptationSets with multiple Representations.", "Clause 8.4.2");
        }
      });
      mpdToCheck.querySelectorAll("Representation").forEach((rep) => {
        const hasTemplate = rep.querySelector("SegmentTemplate") || rep.closest("AdaptationSet").querySelector("SegmentTemplate") || rep.closest("Period").querySelector("SegmentTemplate");
        check(`Live profile requires SegmentTemplate for Representation "${rep.getAttribute("id")}"`, !!hasTemplate, "OK", "SegmentTemplate must be used in this profile.", "Clause 8.4.2");
      });
    }
    if (profiles.includes("urn:mpeg:dash:profile:cmaf:2019")) {
      checks.push({ text: "DASH-CMAF Profile Checks", status: "info", details: "Running checks for urn:mpeg:dash:profile:cmaf:2019", isoRef: "Clause 8.12" });
      mpdToCheck.querySelectorAll("AdaptationSet").forEach((as) => {
        const mimeType = as.getAttribute("mimeType");
        if (mimeType === "video/mp4" || mimeType === "audio/mp4") {
          const containerProfiles = as.getAttribute("containerProfiles") || "";
          if (!containerProfiles.includes("cmfc") && !containerProfiles.includes("cmf2")) {
            checks.push({ text: `CMAF profile requires 'cmfc' or 'cmf2' in @containerProfiles`, status: "fail", details: `AdaptationSet "${as.getAttribute("id")}" is missing a CMAF structural brand.`, isoRef: "Clause 8.12.4.3" });
          }
        }
        const segmentAlignment = as.getAttribute("segmentAlignment") === "true";
        const subsegmentAlignment = as.getAttribute("subsegmentAlignment") === "true";
        if (!segmentAlignment && !subsegmentAlignment) {
          checkWarn(`CMAF profile recommends segment or subsegment alignment`, false, "", `AdaptationSet "${as.getAttribute("id")}" has neither @segmentAlignment nor @subsegmentAlignment set to true.`, "Clause 8.12.4.3");
        }
      });
    }
    if (profiles.includes("urn:mpeg:dash:profile:isoff-main:2011")) {
      checks.push({ text: "ISO BMFF Main Profile Checks", status: "info", details: "Running checks for urn:mpeg:dash:profile:isoff-main:2011", isoRef: "Clause 8.5" });
      if (mpdToCheck.querySelector("Subset")) {
        checkWarn("Main profile clients may ignore Subset elements", true, "This MPD contains Subset elements, which may be ignored by a client supporting only the Main profile.", "Clause 8.5.2");
      }
      if (mpdToCheck.querySelector("[*|href]")) {
        checkWarn("Main profile clients may ignore xlink:href attributes", true, "This MPD contains xlink:href attributes, which may be ignored by a client supporting only the Main profile.", "Clause 8.5.2");
      }
    }
    return checks;
  }

  // js/views/compliance-report.js
  function generateReportSectionHTML(title, items) {
    if (items.length === 0) return "";
    const icons = {
      pass: "\u2714",
      fail: "\u2716",
      warn: "\u26A0",
      info: "\u2139"
    };
    const cardsHtml = items.map((item) => `
        <div class="compliance-card ${item.status}">
            <div class="compliance-card-header">
                <span class="status-indicator ${item.status}">${icons[item.status]}</span>
                <h5 class="compliance-card-title">${item.text}</h5>
            </div>
            <p class="compliance-card-desc">
                ${item.details}
                ${createInfoTooltip(item.details, item.isoRef)}
            </p>
        </div>
    `).join("");
    return `
        <div class="mb-8">
            <h4 class="text-lg font-semibold text-gray-300 mb-3 pb-2 border-b border-gray-700">${title}</h4>
            <div class="compliance-grid">
                ${cardsHtml}
            </div>
        </div>
    `;
  }
  function getComplianceReportHTML(mpd, isComparison = false) {
    if (isComparison) {
      let html2 = '<div class="space-y-8">';
      analysisState.streams.forEach((stream) => {
        const checks2 = runChecks(stream.mpd);
        const groupedChecks2 = groupChecks(checks2);
        html2 += `<div class="bg-gray-900 p-4 rounded-md">
                        <h3 class="text-xl font-bold mb-4">${stream.name}</h3>`;
        for (const [group, items] of Object.entries(groupedChecks2)) {
          html2 += generateReportSectionHTML(group, items);
        }
        html2 += `</div>`;
      });
      html2 += "</div>";
      return html2;
    }
    const checks = runChecks(mpd);
    const groupedChecks = groupChecks(checks);
    let html = `<h3 class="text-xl font-bold mb-4">Compliance & Best Practices Report</h3>`;
    for (const [group, items] of Object.entries(groupedChecks)) {
      html += generateReportSectionHTML(group, items);
    }
    html += `<div class="dev-watermark">Compliance v3.0</div>`;
    return html;
  }
  function groupChecks(checks) {
    const groups = {
      "Manifest Structure": [],
      "Live Stream Properties": [],
      "Segment & Timing Info": [],
      "Profile Conformance": [],
      "General Best Practices": []
    };
    checks.forEach((check) => {
      const text = check.text.toLowerCase();
      if (text.includes("profile")) groups["Profile Conformance"].push(check);
      else if (text.includes("segment") || text.includes("timeline")) groups["Segment & Timing Info"].push(check);
      else if (text.includes("dynamic") || text.includes("live") || text.includes("publish") || text.includes("update")) groups["Live Stream Properties"].push(check);
      else if (text.includes("mpd") || text.includes("period") || text.includes("adaptationset") || text.includes("representation")) groups["Manifest Structure"].push(check);
      else groups["General Best Practices"].push(check);
    });
    Object.keys(groups).forEach((key) => {
      if (groups[key].length === 0) delete groups[key];
    });
    return groups;
  }

  // js/views/timeline-visuals.js
  var parseDuration = (durationStr) => {
    if (!durationStr) return null;
    const match = durationStr.match(/PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/);
    if (!match) return null;
    const hours = parseFloat(match[1] || 0);
    const minutes = parseFloat(match[2] || 0);
    const seconds = parseFloat(match[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
  };
  function getTimelineAndVisualsHTML(mpd) {
    const isLive = mpd.getAttribute("type") === "dynamic";
    if (isLive) {
      return generateLiveTimelineHTML(mpd);
    } else {
      return generateStaticTimelineHTML(mpd);
    }
  }
  function generateStaticTimelineHTML(mpd) {
    const periods = Array.from(mpd.querySelectorAll("Period"));
    if (periods.length === 0) return '<p class="info">No Period elements found.</p>';
    let lastPeriodEnd = 0;
    const periodData = periods.map((p, i) => {
      const startAttr = p.getAttribute("start");
      const durationAttr = p.getAttribute("duration");
      const start = startAttr ? parseDuration(startAttr) : lastPeriodEnd;
      let duration = durationAttr ? parseDuration(durationAttr) : null;
      if (duration !== null) lastPeriodEnd = start + duration;
      else if (i === periods.length - 1) {
        const mediaPresentationDuration = parseDuration(mpd.getAttribute("mediaPresentationDuration"));
        if (mediaPresentationDuration) {
          duration = mediaPresentationDuration - start;
          lastPeriodEnd = mediaPresentationDuration;
        }
      }
      return { id: p.getAttribute("id") || `(index ${i + 1})`, start, duration, element: p };
    });
    const totalDuration = parseDuration(mpd.getAttribute("mediaPresentationDuration")) || lastPeriodEnd;
    if (totalDuration === 0) return '<div class="analysis-summary warn">Could not determine total duration.</div>';
    const timelineHtml = periodData.map((p) => {
      const startPercentage = p.start / totalDuration * 100;
      const endPercentage = p.duration ? (p.start + p.duration) / totalDuration * 100 : 100;
      const gridColumn = `${startPercentage}% / ${endPercentage}%`;
      const adaptationSets = Array.from(p.element.querySelectorAll("AdaptationSet"));
      const adaptationSetHtml = adaptationSets.map((as) => {
        const langText = as.getAttribute("lang") ? ` (${as.getAttribute("lang")})` : "";
        const contentType = as.getAttribute("contentType") || as.getAttribute("mimeType")?.split("/")[0] || "unknown";
        return `<div class="timeline-adaptation-set ${contentType}" title="AdaptationSet ID: ${as.getAttribute("id") || "N/A"}">${contentType}${langText}</div>`;
      }).join("");
      return `<div class="timeline-period" style="grid-column: ${startPercentage + 1} / span ${Math.round(endPercentage - startPercentage)}" title="Period ID: ${p.id}">
                    <div class="timeline-period-title">Period ${p.id}</div>
                    <div class="space-y-1">${adaptationSetHtml}</div>
                </div>`;
    }).join("");
    const gridTemplateColumns = periodData.map((p) => `${p.duration / totalDuration * 100}%`).join(" ");
    const abrLaddersHtml = periodData.map((p) => `<div class="mt-6">
            <h4 class="text-lg font-bold">ABR Bitrate Ladder for Period: ${p.id}</h4>
            ${generateAbrLadderHTML(p.element)}
        </div>`).join("");
    return `
        <h3 class="text-xl font-bold mb-4">Timeline Visualization</h3>
        <div class="timeline-container-static">
            <div class="timeline-grid" style="grid-template-columns: ${gridTemplateColumns}">${timelineHtml}</div>
        </div>
        <div class="text-xs text-gray-400 mt-2 text-right">Total Duration: ${totalDuration.toFixed(2)}s</div>
        ${abrLaddersHtml}
        <div class="dev-watermark">Timeline & Visuals v3.0</div>`;
  }
  function generateLiveTimelineHTML(mpd) {
    const period = mpd.querySelector("Period");
    if (!period) return '<p class="info">No Period element found.</p>';
    const timeShiftBufferDepth = parseDuration(mpd.getAttribute("timeShiftBufferDepth"));
    if (!timeShiftBufferDepth) return '<p class="info">No @timeShiftBufferDepth found.</p>';
    const adaptationSets = Array.from(period.querySelectorAll("AdaptationSet"));
    const adaptationSetHtml = adaptationSets.map((as) => {
      const langText = as.getAttribute("lang") ? ` (${as.getAttribute("lang")})` : "";
      const contentType = as.getAttribute("contentType") || as.getAttribute("mimeType")?.split("/")[0] || "unknown";
      return `<div class="timeline-adaptation-set ${contentType}" title="AdaptationSet ID: ${as.getAttribute("id") || "N/A"}">${contentType}${langText}</div>`;
    }).join("");
    const abrLaddersHtml = `<div class="mt-6">
            <h4 class="text-lg font-bold">ABR Bitrate Ladder for Period: ${period.getAttribute("id") || "0"}</h4>
            ${generateAbrLadderHTML(period)}
        </div>`;
    const publishTime = new Date(mpd.getAttribute("publishTime")).getTime();
    const availabilityStartTime = new Date(mpd.getAttribute("availabilityStartTime")).getTime();
    const liveEdge = (publishTime - availabilityStartTime) / 1e3;
    const dvrStart = liveEdge - timeShiftBufferDepth;
    const availableMediaHtml = `<div class="timeline-period" style="grid-column: 1 / -1;">
                                    <div class="timeline-period-title">Available Media</div>
                                    <div class="space-y-1">${adaptationSetHtml}</div>
                                </div>`;
    return `
        <h3 class="text-xl font-bold mb-4">Live Timeline Visualization</h3>
        <div class="timeline-container-live" title="DVR Window: ${timeShiftBufferDepth.toFixed(2)}s">
            <div class="timeline-grid">${availableMediaHtml}</div>
            <div class="timeline-live-edge" title="Live Edge"></div>
        </div>
        <div class="text-xs text-gray-400 mt-2 flex justify-between">
            <span>Start of DVR Window (${dvrStart.toFixed(2)}s)</span>
            <span>Live Edge (${liveEdge.toFixed(2)}s)</span>
        </div>
        ${abrLaddersHtml}
        <div class="dev-watermark">Timeline & Visuals v3.0</div>`;
  }
  function generateAbrLadderHTML(period) {
    const videoSets = Array.from(period.querySelectorAll('AdaptationSet[contentType="video"], AdaptationSet[mimeType^="video"]'));
    if (videoSets.length === 0) return '<p class="text-sm text-gray-500 mt-4">No video Adaptation Sets in this Period.</p>';
    return videoSets.map((as) => {
      const reps = Array.from(as.querySelectorAll("Representation")).sort((a, b) => parseInt(a.getAttribute("bandwidth")) - parseInt(b.getAttribute("bandwidth")));
      if (reps.length === 0) return "";
      const maxBw = Math.max(...reps.map((r) => parseInt(r.getAttribute("bandwidth"))));
      const repHtml = reps.map((rep) => {
        const bw = parseInt(rep.getAttribute("bandwidth"));
        const widthPercentage = bw / maxBw * 100;
        const width = rep.getAttribute("width") || as.getAttribute("width");
        const height = rep.getAttribute("height") || as.getAttribute("height");
        const resolutionText = `${width || "N/A"}x${height || "N/A"}`;
        return `<div class="flex items-center">
                        <div class="w-28 text-xs text-gray-400 font-mono flex-shrink-0">${resolutionText}</div>
                        <div class="w-full bg-gray-700 rounded-full h-5">
                            <div class="bg-blue-600 h-5 rounded-full text-xs font-medium text-blue-100 text-center p-0.5 leading-none" style="width: ${widthPercentage}%">${(bw / 1e3).toFixed(0)} kbps</div>
                        </div>
                     </div>`;
      }).join("");
      return `<div class="bg-gray-900 p-4 rounded-md mt-4">
                    <p class="text-sm text-gray-400 mb-4">Video Adaptation Set: ${as.getAttribute("id") || "N/A"}</p>
                    <div class="space-y-2">${repHtml}</div>
                </div>`;
    }).join("");
  }

  // js/views/features.js
  function getFeaturesAnalysisHTML(mpd) {
    const features = [
      { name: "Dynamic (Live) Stream", check: (m) => m.getAttribute("type") === "dynamic", desc: "Content is a live stream, and the MPD is expected to be updated periodically.", isoRef: "Clause 5.3.1.2, Table 3" },
      { name: "Multi-Period Content", check: (m) => m.querySelectorAll("Period").length > 1, desc: "The presentation is split into multiple periods, often used for ad insertion or chaptering.", isoRef: "Clause 5.3.2" },
      { name: "Segment Template", check: (m) => !!m.querySelector("SegmentTemplate"), desc: "Segment URLs are generated using a template, typically with $Number$ or $Time$ placeholders.", isoRef: "Clause 5.3.9.4" },
      { name: "Segment Timeline", check: (m) => !!m.querySelector("SegmentTimeline"), desc: "Provides explicit timing and duration for each segment, allowing for variable segment sizes.", isoRef: "Clause 5.3.9.6" },
      { name: "Segment List", check: (m) => !!m.querySelector("SegmentList"), desc: "Provides an explicit list of URLs for each media segment.", isoRef: "Clause 5.3.9.3" },
      { name: "Content Protection (DRM)", check: (m) => !!m.querySelector("ContentProtection"), desc: "Indicates that the content is encrypted. Contains information about the DRM or encryption scheme.", isoRef: "Clause 5.8.4.1" },
      { name: "Remote Elements (XLink)", check: (m) => !!m.querySelector("[*|href]"), desc: "Parts of the MPD are located in a separate file and linked into the main manifest.", isoRef: "Clause 5.5" },
      { name: "Subsets", check: (m) => !!m.querySelector("Subset"), desc: "Restricts the combination of Adaptation Sets that can be played simultaneously.", isoRef: "Clause 5.3.8" },
      { name: "Preselection", check: (m) => !!m.querySelector("Preselection"), desc: "Defines a default or recommended combination of tracks for a specific experience.", isoRef: "Clause 5.3.11" },
      { name: "CMAF Profile", check: (m) => (m.getAttribute("profiles") || "").includes("cmaf"), desc: "The stream declares compatibility with the Common Media Application Format (CMAF).", isoRef: "Clause 8.12" },
      { name: "Inband Event Stream", check: (m) => m.querySelectorAll("InbandEventStream").length > 0, desc: "Events are embedded within the media segments themselves.", isoRef: "Clause 5.10.3" },
      { name: "MPD Event Stream", check: (m) => m.querySelectorAll("EventStream").length > 0, desc: "Events are defined directly within the MPD.", isoRef: "Clause 5.10.2" },
      { name: "Low Latency (Service Desc.)", check: (m) => !!m.querySelector("ServiceDescription Latency"), desc: "The manifest includes descriptors to help players achieve a low-latency playback target.", isoRef: "Annex K.3.2" },
      { name: "MPD Patching", check: (m) => !!m.querySelector("PatchLocation"), desc: "Allows for updating the MPD by sending only the changed parts, reducing bandwidth.", isoRef: "Clause 5.15" }
    ];
    const cardsHtml = features.map((f) => {
      const isUsed = f.check(mpd);
      return `
            <div class="feature-card ${isUsed ? "is-used" : ""}">
                <div class="feature-card-header">
                    <span class="status-indicator ${isUsed ? "pass" : "fail"}">${isUsed ? "\u2714" : "\u2716"}</span>
                    <h5 class="feature-card-title">${f.name}</h5>
                </div>
                <p class="feature-card-desc">
                    ${f.desc}
                    ${createInfoTooltip(f.desc, f.isoRef)}
                </p>
            </div>
        `;
    }).join("");
    return `<h3 class="text-xl font-bold mb-4">Feature Usage Analysis</h3>
            <div class="features-grid">${cardsHtml}</div>`;
  }

  // js/helpers/tooltip-data.js
  var mpdTooltipData = {
    // MPD Level
    "MPD": { text: "The root element of the Media Presentation Description.", isoRef: "Clause 5.3.1.2" },
    "MPD@profiles": { text: "A comma-separated list of profiles the MPD conforms to. Essential for client compatibility.", isoRef: "Clause 8.1" },
    "MPD@type": { text: "Indicates if the presentation is static (VOD) or dynamic (live).", isoRef: "Clause 5.3.1.2, Table 3" },
    "MPD@minBufferTime": { text: "The minimum buffer time a client should maintain to ensure smooth playback.", isoRef: "Clause 5.3.1.2, Table 3" },
    "MPD@mediaPresentationDuration": { text: "The total duration of the on-demand content.", isoRef: "Clause 5.3.1.2, Table 3" },
    "MPD@availabilityStartTime": { text: "The anchor time for a dynamic presentation, defining the point from which all media times are calculated.", isoRef: "Clause 5.3.1.2, Table 3" },
    "MPD@publishTime": { text: "The time this version of the MPD was generated on the server.", isoRef: "Clause 5.3.1.2, Table 3" },
    "MPD@minimumUpdatePeriod": { text: "For dynamic MPDs, the minimum time a client should wait before requesting an updated MPD.", isoRef: "Clause 5.3.1.2, Table 3" },
    "MPD@timeShiftBufferDepth": { text: "The duration of the seekable live window (DVR) available to the client.", isoRef: "Clause 5.3.1.2, Table 3" },
    "MPD@suggestedPresentationDelay": { text: "A suggested delay from the live edge for players to begin presentation, helping to synchronize clients.", isoRef: "Clause 5.3.1.2, Table 3" },
    // Period Level
    "Period": { text: "A Period represents a continuous segment of content. Multiple Periods can be used for things like ad insertion.", isoRef: "Clause 5.3.2" },
    "Period@id": { text: "A unique identifier for the Period. Mandatory for dynamic MPDs.", isoRef: "Clause 5.3.2.2, Table 4" },
    "Period@start": { text: "The start time of the Period on the Media Presentation Timeline.", isoRef: "Clause 5.3.2.2, Table 4" },
    "Period@duration": { text: "The duration of the Period.", isoRef: "Clause 5.3.2.2, Table 4" },
    // AdaptationSet Level
    "AdaptationSet": { text: "A set of interchangeable encoded versions of one or several media components (e.g., all video bitrates, or all audio languages).", isoRef: "Clause 5.3.3" },
    "AdaptationSet@id": { text: "A unique identifier for the AdaptationSet within the Period.", isoRef: "Clause 5.3.3.2, Table 5" },
    "AdaptationSet@contentType": { text: 'Specifies the media content type (e.g., "video", "audio").', isoRef: "Clause 5.3.3.2, Table 5" },
    "AdaptationSet@mimeType": { text: "The MIME type for all Representations in this set.", isoRef: "Clause 5.3.7.2, Table 14" },
    "AdaptationSet@lang": { text: 'Specifies the language of the content, using RFC 5646 codes (e.g., "en", "es").', isoRef: "Clause 5.3.3.2, Table 5" },
    "AdaptationSet@segmentAlignment": { text: "If true, indicates that segments are aligned across Representations, simplifying seamless switching.", isoRef: "Clause 5.3.3.2, Table 5" },
    "AdaptationSet@maxWidth": { text: "The maximum width of any video Representation in this set.", isoRef: "Clause 5.3.3.2, Table 5" },
    "AdaptationSet@maxHeight": { text: "The maximum height of any video Representation in this set.", isoRef: "Clause 5.3.3.2, Table 5" },
    "AdaptationSet@par": { text: 'The picture aspect ratio for the video content (e.g., "16:9").', isoRef: "Clause 5.3.3.2, Table 5" },
    // Representation Level
    "Representation": { text: "A specific, deliverable encoded version of media content (e.g., video at a particular bitrate and resolution).", isoRef: "Clause 5.3.5" },
    "Representation@id": { text: "A unique identifier for the Representation within the Period.", isoRef: "Clause 5.3.5.2, Table 9" },
    "Representation@bandwidth": { text: "The required bandwidth in bits per second to stream this Representation.", isoRef: "Clause 5.3.5.2, Table 9" },
    "Representation@codecs": { text: "A string identifying the codec(s) used, as per RFC 6381.", isoRef: "Clause 5.3.7.2, Table 14" },
    "Representation@width": { text: "The width of the video in this Representation.", isoRef: "Clause 5.3.7.2, Table 14" },
    "Representation@height": { text: "The height of the video in this Representation.", isoRef: "Clause 5.3.7.2, Table 14" },
    "Representation@frameRate": { text: "The frame rate of the video.", isoRef: "Clause 5.3.7.2, Table 14" },
    "Representation@sar": { text: "The Sample Aspect Ratio of the video.", isoRef: "Clause 5.3.7.2, Table 14" },
    "Representation@audioSamplingRate": { text: "The sampling rate of the audio in samples per second.", isoRef: "Clause 5.3.7.2, Table 14" },
    // Segment Info Level
    "SegmentTemplate": { text: "Defines a template for generating Segment URLs.", isoRef: "Clause 5.3.9.4" },
    "SegmentTemplate@timescale": { text: "The number of time units that pass in one second. Used for calculating segment durations and start times.", isoRef: "Clause 5.3.9.2.2, Table 16" },
    "SegmentTemplate@initialization": { text: "A template for the URL of the Initialization Segment.", isoRef: "Clause 5.3.9.4.2, Table 20" },
    "SegmentTemplate@media": { text: "A template for the URLs of the Media Segments. Often contains $Time$ or $Number$.", isoRef: "Clause 5.3.9.4.2, Table 20" },
    "SegmentTimeline": { text: "Provides an explicit timeline for media segments, allowing for variable durations.", isoRef: "Clause 5.3.9.6" },
    "S": { text: "A Segment Timeline entry. Defines a series of one or more contiguous segments.", isoRef: "Clause 5.3.9.6.2" },
    "S@t": { text: "The start time of the first segment in this series, in units of the @timescale.", isoRef: "Clause 5.3.9.6.2, Table 22" },
    "S@d": { text: "The duration of each segment in this series, in units of the @timescale.", isoRef: "Clause 5.3.9.6.2, Table 22" },
    "S@r": { text: 'The repeat count. A value of "N" means there are N+1 segments in this series.', isoRef: "Clause 5.3.9.6.2, Table 22" },
    // Descriptors
    "ContentProtection": { text: "Contains information about a DRM or encryption scheme used to protect the content.", isoRef: "Clause 5.8.4.1" },
    "ContentProtection@schemeIdUri": { text: "A URI that uniquely identifies the content protection scheme (e.g., the UUID for Widevine or PlayReady).", isoRef: "Clause 5.8.2, Table 32" },
    "ContentProtection@value": { text: "An optional string providing additional scheme-specific information.", isoRef: "Clause 5.8.2, Table 32" },
    "AudioChannelConfiguration": { text: "Specifies the audio channel layout (e.g., stereo, 5.1 surround).", isoRef: "Clause 5.8.4.7" },
    "Role": { text: 'Describes the role or purpose of an AdaptationSet (e.g., "main", "alternate", "commentary").', isoRef: "Clause 5.8.4.2" },
    "Role@schemeIdUri": { text: "Identifies the scheme used for the Role descriptor.", isoRef: "Clause 5.8.2, Table 32" },
    "Role@value": { text: "The specific role value within the defined scheme.", isoRef: "Clause 5.8.2, Table 32" }
  };

  // js/views/interactive-mpd.js
  function getInteractiveMpdHTML(mpd) {
    if (!mpd) {
      return '<p class="warn">No MPD loaded to display.</p>';
    }
    const html = buildHtmlFromNode(mpd, 0);
    return `<div class="interactive-mpd-container"><pre><code>${html}</code></pre></div>`;
  }
  function buildHtmlFromNode(node, depth) {
    const indent = "  ".repeat(depth);
    let html = "";
    switch (node.nodeType) {
      case Node.ELEMENT_NODE:
        const el = (
          /** @type {Element} */
          node
        );
        const tagName = el.tagName;
        const tagInfo = mpdTooltipData[tagName];
        const tagHtml = tagInfo ? `<span class="interactive-xml-tag" data-tooltip="${escapeHtml(tagInfo.text)}" data-iso="${escapeHtml(tagInfo.isoRef)}">&lt;${tagName}</span>` : `<span class="interactive-xml-tag">&lt;${tagName}</span>`;
        html += `${indent}${tagHtml}`;
        for (const attr of Array.from(el.attributes)) {
          const attrKey = `${tagName}@${attr.name}`;
          const attrInfo = mpdTooltipData[attrKey];
          const attrNameHtml = attrInfo ? `<span class="interactive-xml-attr-name" data-tooltip="${escapeHtml(attrInfo.text)}" data-iso="${escapeHtml(attrInfo.isoRef)}">${attr.name}</span>` : `<span class="interactive-xml-attr-name">${attr.name}</span>`;
          html += ` ${attrNameHtml}=<span class="interactive-xml-attr-value">"${escapeHtml(attr.value)}"</span>`;
        }
        const hasChildElements = Array.from(el.childNodes).some((n) => n.nodeType === Node.ELEMENT_NODE);
        if (hasChildElements) {
          html += `&gt;
`;
          for (const child of Array.from(el.childNodes)) {
            html += buildHtmlFromNode(child, depth + 1);
          }
          html += `${indent}&lt;/${tagName}&gt;
`;
        } else if (el.childNodes.length > 0 && el.textContent.trim()) {
          html += `&gt;${escapeHtml(el.textContent.trim())}&lt;/${tagName}&gt;
`;
        } else {
          html += ` /&gt;
`;
        }
        break;
      case Node.COMMENT_NODE:
        html += `${indent}<span class="interactive-xml-comment">&lt;!--${escapeHtml(node.textContent)}--&gt;</span>
`;
        break;
      // Text nodes with only whitespace are ignored to create a "pretty-print" effect
      case Node.TEXT_NODE:
        if (node.textContent.trim()) {
          html += `${indent}${escapeHtml(node.textContent.trim())}
`;
        }
        break;
    }
    return html;
  }
  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // js/api/segment-parser.js
  var tooltipData = {
    "ftyp": { text: "File Type Box: Identifies the file type, brand, and compatibility. It must be the first box in the file.", ref: "ISO/IEC 14496-12, 4.3" },
    "moov": { text: "Movie Box: A container for all the metadata about the movie, including information about the tracks, timing, and structure.", ref: "ISO/IEC 14496-12, 8.1.1" },
    "mvhd": { text: "Movie Header Box: Specifies the overall timescale and duration for the entire presentation.", ref: "ISO/IEC 14496-12, 8.2.2" },
    "trak": { text: "Track Box: A container for a single track of the presentation. A presentation may have multiple tracks (e.g., one for video, one for audio).", ref: "ISO/IEC 14496-12, 8.3.1" },
    "tkhd": { text: "Track Header Box: Specifies the duration and other characteristics of a single track.", ref: "ISO/IEC 14496-12, 8.3.2" },
    "mdia": { text: "Media Box: A container for all the objects that declare information about the media data within a track.", ref: "ISO/IEC 14496-12, 8.4.1" },
    "mdhd": { text: "Media Header Box: Specifies the timescale and duration for the media in a track.", ref: "ISO/IEC 14496-12, 8.4.2" },
    "hdlr": { text: "Handler Reference Box: Declares the media type of the track (e.g., 'vide' for video, 'soun' for audio).", ref: "ISO/IEC 14496-12, 8.4.3" },
    "minf": { text: "Media Information Box: A container for all the objects that declare characteristic information of the media in the track.", ref: "ISO/IEC 14496-12, 8.4.4" },
    "vmhd": { text: "Video Media Header Box: Contains header information specific to the video media in a track.", ref: "ISO/IEC 14496-12, 8.4.5.2" },
    "smhd": { text: "Sound Media Header Box: Contains header information specific to the audio media in a track.", ref: "ISO/IEC 14496-12, 8.4.5.3" },
    "dinf": { text: "Data Information Box: A container for objects that declare where the media data is located.", ref: "ISO/IEC 14496-12, 8.7.1" },
    "dref": { text: "Data Reference Box: Contains a table of data references that declare the location(s) of the media data.", ref: "ISO/IEC 14496-12, 8.7.2" },
    "stbl": { text: "Sample Table Box: A container for all the time and data indexing of the media samples in a track.", ref: "ISO/IEC 14496-12, 8.5.1" },
    "stsd": { text: "Sample Description Box: Contains a list of sample entries, which describe the format of the samples.", ref: "ISO/IEC 14496-12, 8.5.2" },
    "stts": { text: "Time-to-Sample Box: Stores duration information for the media's samples.", ref: "ISO/IEC 14496-12, 8.6.1.2" },
    "stsc": { text: "Sample-to-Chunk Box: Defines the mapping of samples to chunks within the media data.", ref: "ISO/IEC 14496-12, 8.7.4" },
    "stsz": { text: "Sample Size Box: Specifies the size of each sample.", ref: "ISO/IEC 14496-12, 8.7.3" },
    "stco": { text: "Chunk Offset Box: Identifies the location of each chunk of data in the media file.", ref: "ISO/IEC 14496-12, 8.7.5" },
    "co64": { text: "64-bit Chunk Offset Box: A 64-bit version of the Chunk Offset Box for large files.", ref: "ISO/IEC 14496-12, 8.7.5" },
    "edts": { text: "Edit Box: Maps the media time to the presentation time, allowing for edits and offsets.", ref: "ISO/IEC 14496-12, 8.6.5" },
    "elst": { text: "Edit List Box: Contains a list of edits that define the presentation timeline.", ref: "ISO/IEC 14496-12, 8.6.6" },
    "mvex": { text: "Movie Extends Box: Signals that the movie may contain movie fragments, as is typical in DASH.", ref: "ISO/IEC 14496-12, 8.8.1" },
    "trex": { text: "Track Extends Box: Sets default values for the samples and duration for a track's fragments.", ref: "ISO/IEC 14496-12, 8.8.2" },
    "meta": { text: "Meta Box: A container for metadata, which can be at the movie or track level.", ref: "ISO/IEC 14496-12, 8.11.1" },
    "styp": { text: "Segment Type Box: Declares the format and brands of this segment. Essential for compatibility checks (e.g., CMAF).", ref: "ISO/IEC 14496-12, 8.16.2" },
    "sidx": { text: "Segment Index Box: Provides a timeline and byte-range index for the subsegments within this media segment. Crucial for seeking.", ref: "ISO/IEC 14496-12, 8.16.3" },
    "moof": { text: "Movie Fragment Box: A container for a single fragment of the media, containing metadata for the samples within.", ref: "ISO/IEC 14496-12, 8.8.7" },
    "mfhd": { text: "Movie Fragment Header Box: Contains a sequence number for this fragment, allowing a client to detect missing fragments.", ref: "ISO/IEC 14496-12, 8.8.8" },
    "traf": { text: "Track Fragment Box: Container for a single track's fragment metadata.", ref: "ISO/IEC 14496-12, 8.8.7" },
    "tfhd": { text: "Track Fragment Header Box: Contains the ID of the track for this fragment.", ref: "ISO/IEC 14496-12, 8.8.7" },
    "tfdt": { text: "Track Fragment Decode Time Box: Provides the absolute decode time for the first sample in this fragment.", ref: "ISO/IEC 14496-12, 8.8.12" },
    "trun": { text: "Track Run Box: Contains information about a continuous run of samples within a fragment, like their duration and size.", ref: "ISO/IEC 14496-12, 8.8.8" },
    "pssh": { text: "Protection System Specific Header Box: Contains information needed by a Content Decryption Module to decrypt the media.", ref: "ISO/IEC 23001-7" },
    "mdat": { text: "Media Data Box: Contains the actual audio/video sample data for the preceding 'moof' box.", ref: "ISO/IEC 14496-12, 8.1.1" },
    "avcC": { text: "AVC Configuration Box: Contains the decoder configuration information for an AVC (H.264) video track.", ref: "ISO/IEC 14496-15" },
    "hvcC": { text: "HEVC Configuration Box: Contains the decoder configuration information for an HEVC (H.265) video track.", ref: "ISO/IEC 14496-15" },
    "esds": { text: "Elementary Stream Descriptor Box: Contains information about the audio stream, such as its type and decoder-specific configuration.", ref: "ISO/IEC 14496-14" }
  };
  async function handleSegmentAnalysisClick(e, cachedBuffer) {
    const target = (
      /** @type {HTMLElement} */
      e.target
    );
    const segmentNumber = parseInt(target.dataset.number);
    const activeStream = analysisState.streams.find((s) => s.id === analysisState.activeStreamId);
    const rep = activeStream.mpd.querySelector(`Representation[id="${target.dataset.repid}"]`);
    let expectedStartTime = null;
    if (rep && !isNaN(segmentNumber)) {
      const template = rep.querySelector("SegmentTemplate") || rep.closest("AdaptationSet").querySelector("SegmentTemplate") || rep.closest("Period").querySelector("SegmentTemplate");
      if (template) {
        const timescale = parseInt(template.getAttribute("timescale"));
        const timeline = template.querySelector("SegmentTimeline");
        if (timeline) {
          let currentNum = parseInt(template.getAttribute("startNumber") || "1");
          let currentTime = 0;
          for (const s of Array.from(timeline.querySelectorAll("S"))) {
            const t = s.hasAttribute("t") ? parseInt(s.getAttribute("t")) : currentTime;
            const d = parseInt(s.getAttribute("d"));
            const r = parseInt(s.getAttribute("r") || "0");
            for (let i = 0; i <= r; i++) {
              if (currentNum === segmentNumber) {
                expectedStartTime = (t + i * d) / timescale;
                break;
              }
              currentNum++;
            }
            if (expectedStartTime !== null) break;
            currentTime = t + (r + 1) * d;
          }
        }
      }
    }
    processBuffer(cachedBuffer, expectedStartTime);
  }
  function processBuffer(buffer, expectedStartTime) {
    try {
      const boxes = parseISOBMFF(buffer);
      let analysisHtml = renderSegmentAnalysisSummary(boxes, expectedStartTime);
      analysisHtml += renderBoxes(boxes);
      dom.modalContentArea.innerHTML = analysisHtml;
    } catch (err) {
      dom.modalContentArea.innerHTML = `<p class="fail">Could not parse segment buffer: ${err.message}.</p>`;
    }
  }
  function renderSegmentAnalysisSummary(boxes, expectedStartTime) {
    const sidx = boxes.find((b) => b.type === "sidx");
    const moov = boxes.find((b) => b.type === "moov");
    let summaryHtml = "";
    const activeStream = analysisState.streams.find((s) => s.id === analysisState.activeStreamId);
    if (activeStream) {
      const profiles = activeStream.mpd.getAttribute("profiles") || "";
      if (profiles.includes("cmaf")) {
        if (!sidx && !moov) {
          summaryHtml += `<div class="analysis-summary fail">CMAF Compliance Fail: Segment does not contain a Segment Index ('sidx') box, which is required for CMAF tracks.</div>`;
        }
      }
    }
    if (!sidx) {
      if (moov) {
        summaryHtml += `<div class="analysis-summary info">This appears to be an Initialization Segment. It contains metadata but no media samples, so timing analysis is not applicable.</div>`;
      } else {
        summaryHtml += `<div class="analysis-summary warn">Could not find Segment Index ('sidx') box. Detailed segment timing analysis is not available.</div>`;
      }
      return summaryHtml;
    }
    const actualStartTime = parseFloat(sidx.details["EPT (seconds)"]);
    let driftInfo = "";
    if (expectedStartTime !== null && !isNaN(actualStartTime)) {
      const drift = (actualStartTime - expectedStartTime) * 1e3;
      const driftClass = Math.abs(drift) > 50 ? "warn" : "pass";
      const driftDetails = "Drift is the difference between the MPD-declared start time and the actual start time in the segment. High drift can cause playback issues.";
      driftInfo = `<div><span class="key">Timeline Drift ${createInfoTooltip(driftDetails, "Clause 7.2.1")}:</span> <span class="value ${driftClass}">${drift.toFixed(0)} ms</span></div>`;
    }
    summaryHtml += `<div class="analysis-summary">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 text-sm">
                    <div><span class="key">Actual Start Time:</span> <span class="value">${actualStartTime.toFixed(3)} s</span></div>
                    <div><span class="key">Segment Duration:</span> <span class="value">${sidx.details["Total Duration (seconds)"]} s</span></div>
                    <div><span class="key">Expected MPD Start Time:</span> <span class="value">${expectedStartTime ? expectedStartTime.toFixed(3) + " s" : "N/A"}</span></div>
                    ${driftInfo}
                </div>
            </div>`;
    return summaryHtml;
  }
  function renderBoxes(boxes, level = 0) {
    let html = `<ul class="${level > 0 ? "pl-4" : ""}">`;
    for (const box of boxes) {
      const tooltip = tooltipData[box.type];
      const tooltipHtml = tooltip ? createInfoTooltip(tooltip.text, tooltip.ref) : "";
      html += `<li class="my-1"><p><span class="font-bold text-green-400">${box.type}</span> <span class="text-gray-500">(Size: ${box.size})</span>${tooltipHtml}</p>`;
      if (Object.keys(box.details).length > 0) {
        html += `<div class="box-details">
`;
        for (const [key, value] of Object.entries(box.details)) {
          html += `<div><span class="key">${key}:</span> <span class="value">${value}</span></div>`;
        }
        html += `</div>`;
      }
      if (box.children.length > 0) html += renderBoxes(box.children, level + 1);
      html += `</li>`;
    }
    html += "</ul>";
    return html;
  }
  function parseISOBMFF(buffer) {
    const boxes = [];
    const dataView = new DataView(buffer);
    let offset = 0;
    while (offset < buffer.byteLength) {
      if (offset + 8 > buffer.byteLength) break;
      let size = dataView.getUint32(offset);
      const type = String.fromCharCode.apply(null, new Uint8Array(buffer, offset + 4, 4));
      let headerSize = 8;
      if (size === 1) {
        if (offset + 16 > buffer.byteLength) break;
        size = Number(dataView.getBigUint64(offset + 8));
        headerSize = 16;
      }
      if (size === 0 || offset + size > buffer.byteLength) break;
      const box = { type, size, offset, children: [], details: {} };
      parseBoxDetails(box, new DataView(buffer, offset, size));
      if (["moof", "traf", "mvex", "moov", "trak", "mdia", "minf", "stbl", "edts", "dinf", "stsd", "meta"].includes(type)) {
        box.children = parseISOBMFF(buffer.slice(offset + headerSize, offset + size));
      }
      boxes.push(box);
      offset += size;
    }
    return boxes;
  }
  function parseBoxDetails(box, view) {
    try {
      const getString = (start, len) => String.fromCharCode.apply(null, new Uint8Array(view.buffer, view.byteOffset + start, len));
      const version = view.getUint8(8);
      switch (box.type) {
        case "styp": {
          box.details["Major Brand"] = getString(8, 4);
          let compatibleBrands = [];
          for (let i = 16; i < box.size; i += 4) {
            compatibleBrands.push(getString(i, 4));
          }
          box.details["Compatible Brands"] = compatibleBrands.join(", ");
          break;
        }
        case "sidx": {
          box.details["Version"] = version;
          box.details["Reference ID"] = view.getUint32(12);
          const timescale = view.getUint32(16);
          box.details["Timescale"] = timescale;
          const ept = version === 0 ? view.getUint32(20) : Number(view.getBigUint64(20));
          box.details["Earliest Presentation Time"] = ept;
          box.details["EPT (seconds)"] = (ept / timescale).toFixed(3);
          const referenceCount = view.getUint16(30);
          box.details["Reference Count"] = referenceCount;
          let totalDuration = 0;
          let loopOffset = 32;
          for (let i = 0; i < referenceCount; i++) {
            totalDuration += view.getUint32(loopOffset + 4);
            loopOffset += 12;
          }
          box.details["Total Duration (timescale)"] = totalDuration;
          box.details["Total Duration (seconds)"] = (totalDuration / timescale).toFixed(3);
          break;
        }
        case "mvhd": {
          const version2 = view.getUint8(8);
          const timescale = view.getUint32(version2 === 1 ? 28 : 20);
          const duration = version2 === 1 ? Number(view.getBigUint64(32)) : view.getUint32(24);
          box.details["Timescale"] = timescale;
          box.details["Duration"] = `${duration} (${(duration / timescale).toFixed(2)}s)`;
          break;
        }
        case "tkhd": {
          const version2 = view.getUint8(8);
          const trackId = view.getUint32(version2 === 1 ? 28 : 20);
          const duration = version2 === 1 ? Number(view.getBigUint64(36)) : view.getUint32(24);
          box.details["Track ID"] = trackId;
          box.details["Duration"] = duration;
          break;
        }
        case "mdhd": {
          const version2 = view.getUint8(8);
          const timescale = view.getUint32(version2 === 1 ? 28 : 20);
          const duration = version2 === 1 ? Number(view.getBigUint64(32)) : view.getUint32(24);
          const lang = view.getUint16(version2 === 1 ? 36 : 28);
          const langChars = [
            lang >> 10 & 31,
            lang >> 5 & 31,
            lang & 31
          ].map((x) => String.fromCharCode(x + 96));
          box.details["Timescale"] = timescale;
          box.details["Duration"] = `${duration} (${(duration / timescale).toFixed(2)}s)`;
          box.details["Language"] = langChars.join("");
          break;
        }
        case "hdlr": {
          const handlerType = getString(16, 4);
          box.details["Handler Type"] = handlerType;
          break;
        }
        case "vmhd": {
          box.details["Graphics Mode"] = view.getUint16(12);
          break;
        }
        case "smhd": {
          box.details["Balance"] = view.getInt16(12) / 256;
          break;
        }
        case "dref": {
          const entryCount = view.getUint32(12);
          box.details["Entry Count"] = entryCount;
          break;
        }
        case "elst": {
          const entryCount = view.getUint32(12);
          box.details["Entry Count"] = entryCount;
          if (entryCount > 0 && entryCount < 10) {
            let entries = [];
            for (let i = 0; i < entryCount; i++) {
              const offset = 16 + i * (version === 1 ? 20 : 12);
              const segmentDuration = version === 1 ? Number(view.getBigUint64(offset)) : view.getUint32(offset);
              const mediaTime = version === 1 ? Number(view.getBigInt64(offset + 8)) : view.getInt32(offset + 4);
              const mediaRate = view.getInt16(offset + (version === 1 ? 16 : 8));
              entries.push(`Duration: ${segmentDuration}, Time: ${mediaTime}, Rate: ${mediaRate >> 16}`);
            }
            box.details["Entries"] = `<ul>${entries.map((e) => `<li>${e}</li>`).join("")}</ul>`;
          }
          break;
        }
        case "stsd": {
          box.details["Entry Count"] = view.getUint32(12);
          break;
        }
        case "stts": {
          const entryCount = view.getUint32(12);
          box.details["Entry Count"] = entryCount;
          if (entryCount > 0 && entryCount < 10) {
            let entries = [];
            for (let i = 0; i < entryCount; i++) {
              const sampleCount = view.getUint32(16 + i * 8);
              const sampleDelta = view.getUint32(20 + i * 8);
              entries.push(`${sampleCount} sample(s) with duration ${sampleDelta}`);
            }
            box.details["Entries"] = `<ul>${entries.map((e) => `<li>${e}</li>`).join("")}</ul>`;
          }
          break;
        }
        case "stsc": {
          const entryCount = view.getUint32(12);
          box.details["Entry Count"] = entryCount;
          break;
        }
        case "stsz": {
          const sampleSize = view.getUint32(12);
          const sampleCount = view.getUint32(16);
          box.details["Sample Size"] = sampleSize === 0 ? "Variable" : sampleSize;
          box.details["Sample Count"] = sampleCount;
          break;
        }
        case "stco":
        case "co64": {
          const entryCount = view.getUint32(12);
          box.details["Entry Count"] = entryCount;
          break;
        }
        case "trex": {
          box.details["Track ID"] = view.getUint32(12);
          box.details["Default Sample Description Index"] = view.getUint32(16);
          box.details["Default Sample Duration"] = view.getUint32(20);
          box.details["Default Sample Size"] = view.getUint32(24);
          break;
        }
        case "avcC": {
          box.details["Configuration Version"] = view.getUint8(8);
          box.details["AVC Profile"] = view.getUint8(9);
          box.details["Profile Compatibility"] = view.getUint8(10);
          box.details["AVC Level"] = view.getUint8(11);
          break;
        }
        case "esds": {
          let offset = 12;
          while (offset < box.size) {
            const tag = view.getUint8(offset++);
            let size = 0;
            let sizeByte = view.getUint8(offset++);
            while (sizeByte & 128) {
              size = size << 7 | sizeByte & 127;
              sizeByte = view.getUint8(offset++);
            }
            size = size << 7 | sizeByte & 127;
            if (tag === 3) {
              offset += 2;
            } else if (tag === 4) {
              box.details["Object Type Indication"] = view.getUint8(offset);
              box.details["Stream Type"] = view.getUint8(offset + 1);
              offset += 13;
            } else if (tag === 5) {
              box.details["Decoder Specific Info"] = `(${size} bytes)`;
              offset += size;
            } else {
              offset += size;
            }
          }
          break;
        }
        case "mfhd": {
          box.details["Sequence Number"] = view.getUint32(12);
          break;
        }
        case "tfhd": {
          box.details["Track ID"] = view.getUint32(12);
          break;
        }
        case "tfdt": {
          const time = version === 1 ? Number(view.getBigUint64(12)) : view.getUint32(12);
          box.details["Base Media Decode Time"] = time;
          break;
        }
        case "trun": {
          box.details["Version"] = version;
          box.details["Sample Count"] = view.getUint32(12);
          break;
        }
        case "pssh": {
          const systemIdMap = {
            "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed": "Widevine",
            "9a04f079-9840-4286-ab92-e65be0885f95": "PlayReady",
            "94ce86fb-07ff-4f43-adb8-93d2fa968ca2": "FairPlay"
          };
          const formatUUID = (buffer, offset) => {
            const bytes = new Uint8Array(buffer, offset, 16);
            const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
            return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
          };
          const systemIdUUID = formatUUID(view.buffer, view.byteOffset + 12);
          box.details["System ID"] = `${systemIdMap[systemIdUUID] || "Unknown"} (${systemIdUUID})`;
          let dataOffset = 28;
          if (version > 0) {
            const kidCount = view.getUint32(28);
            box.details["KID Count"] = kidCount;
            dataOffset = 32;
            let kids = [];
            for (let i = 0; i < kidCount; i++) {
              const kidUUID = formatUUID(view.buffer, view.byteOffset + dataOffset);
              kids.push(kidUUID);
              dataOffset += 16;
            }
            box.details["KIDs"] = kids.join(", ");
          }
          const dataSize = view.getUint32(dataOffset);
          box.details["Data Size"] = dataSize;
          if (dataSize > 0) {
            box.details["Data"] = `(${dataSize} bytes of system-specific data)`;
          }
          break;
        }
      }
    } catch (e) {
      box.details["Parsing Error"] = e.message;
    }
  }

  // js/views/segment-explorer.js
  var SEGMENT_PAGE_SIZE = 10;
  var segmentFreshnessInterval = null;
  function initializeSegmentExplorer(container, mpd, baseUrl) {
    const isDynamic = mpd.getAttribute("type") === "dynamic";
    let initialButtons = `
        <button id="load-first-segments-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition-colors">
            Load First ${SEGMENT_PAGE_SIZE} Segments
        </button>
    `;
    if (isDynamic) {
      initialButtons += `
            <button id="load-last-segments-btn" class="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-3 rounded-md transition-colors ml-2">
                Load Last ${SEGMENT_PAGE_SIZE} Segments
            </button>
        `;
    }
    container.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold">Segment Explorer</h3>
            <div id="segment-explorer-controls" class="flex items-center gap-2">${initialButtons}</div>
        </div>
        <div id="segment-explorer-content" class="space-y-4">
            <p class="text-gray-400">Click a button above to load and check an initial set of segments.</p>
        </div>
    `;
    container.querySelector("#load-first-segments-btn")?.addEventListener("click", () => {
      loadAndCheckSegments(container, mpd, baseUrl, isDynamic, "first");
    });
    if (isDynamic) {
      container.querySelector("#load-last-segments-btn")?.addEventListener("click", () => {
        loadAndCheckSegments(container, mpd, baseUrl, isDynamic, "last");
      });
    }
  }
  async function loadAndCheckSegments(container, mpd, baseUrl, isDynamic, mode) {
    const contentArea = container.querySelector("#segment-explorer-content");
    const controlsArea = container.querySelector("#segment-explorer-controls");
    controlsArea.innerHTML = `<button class="bg-gray-600 text-white font-bold py-2 px-3 rounded-md" disabled>Loading & Fetching...</button>`;
    contentArea.innerHTML = `<p class="info">Parsing MPD and fetching segments...</p>`;
    analysisState.segmentCache.clear();
    stopSegmentFreshnessChecker();
    const allSegmentsByRep = parseAllSegmentUrls(mpd, baseUrl);
    if (Object.keys(allSegmentsByRep).length === 0) {
      contentArea.innerHTML = '<p class="warn">Could not find any segments to load.</p>';
      return;
    }
    const segmentsToFetch = mode === "all" ? Object.values(allSegmentsByRep).flat() : Object.values(allSegmentsByRep).flatMap(
      (segments) => mode === "first" ? segments.slice(0, SEGMENT_PAGE_SIZE) : segments.slice(-SEGMENT_PAGE_SIZE)
    );
    await Promise.all(segmentsToFetch.map((seg) => fetchSegment(seg.resolvedUrl)));
    contentArea.innerHTML = renderAllSegmentTables(allSegmentsByRep, mode);
    attachSegmentExplorerListeners(container, mpd, baseUrl, isDynamic, allSegmentsByRep);
    if (isDynamic) {
      startSegmentFreshnessChecker();
    }
    const refreshButtons = `
        <button id="refresh-first-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition-colors">Refresh First ${SEGMENT_PAGE_SIZE}</button>
        ${isDynamic ? `<button id="refresh-last-btn" class="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-3 rounded-md transition-colors">Refresh Last ${SEGMENT_PAGE_SIZE}</button>` : ""}
        <button id="load-all-btn" class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-md transition-colors">Load All Segments</button>
    `;
    controlsArea.innerHTML = refreshButtons;
    controlsArea.querySelector("#refresh-first-btn")?.addEventListener("click", () => loadAndCheckSegments(container, mpd, baseUrl, isDynamic, "first"));
    controlsArea.querySelector("#refresh-last-btn")?.addEventListener("click", () => loadAndCheckSegments(container, mpd, baseUrl, isDynamic, "last"));
    controlsArea.querySelector("#load-all-btn")?.addEventListener("click", () => loadAndCheckSegments(container, mpd, baseUrl, isDynamic, "all"));
  }
  async function fetchSegment(url) {
    try {
      const response = await fetch(url, { method: "GET", cache: "no-store" });
      const data = response.ok ? await response.arrayBuffer() : null;
      analysisState.segmentCache.set(url, { status: response.status, data });
    } catch (error) {
      analysisState.segmentCache.set(url, { status: 0, data: null });
    }
  }
  function renderAllSegmentTables(allSegmentsByRep, mode) {
    let html = "";
    const mpd = analysisState.streams.find((s) => s.id === analysisState.activeStreamId).mpd;
    mpd.querySelectorAll("Representation").forEach((rep) => {
      const repId = rep.getAttribute("id");
      const repSegments = allSegmentsByRep[repId] || [];
      const segmentsToRender = mode === "all" ? repSegments : mode === "first" ? repSegments.slice(0, SEGMENT_PAGE_SIZE) : repSegments.slice(-SEGMENT_PAGE_SIZE);
      const initialSegmentsHtml = renderSegmentRows(segmentsToRender);
      let paginationButtonHtml = "";
      if (mode === "first" && repSegments.length > SEGMENT_PAGE_SIZE) {
        paginationButtonHtml = `<tr class="load-more-row"><td colspan="3" class="text-center py-2"><button class="load-more-btn text-blue-400 hover:text-blue-600" data-repid="${repId}" data-offset="${SEGMENT_PAGE_SIZE}">Load More (${repSegments.length - SEGMENT_PAGE_SIZE} remaining)</button></td></tr>`;
      } else if (mode === "last" && repSegments.length > SEGMENT_PAGE_SIZE) {
        paginationButtonHtml = `<tr class="load-previous-row"><td colspan="3" class="text-center py-2"><button class="load-previous-btn text-blue-400 hover:text-blue-600" data-repid="${repId}" data-offset="${repSegments.length - SEGMENT_PAGE_SIZE}">Load Previous</button></td></tr>`;
      }
      html += `<details class="bg-gray-900 p-3 rounded" open>
                    <summary class="font-semibold cursor-pointer">Representation: ${repId} (${(parseInt(rep.getAttribute("bandwidth")) / 1e3).toFixed(0)} kbps)</summary>
                    <div class="mt-2 pl-4 max-h-96 overflow-y-auto">
                        <table class="w-full text-left text-sm">
                            <thead class="sticky top-0 bg-gray-900 z-10"><tr>
                                <th class="py-2 w-1/4">Type / Status</th>
                                <th class="py-2 w-1/2">URL / Template</th>
                                <th class="py-2 w-1/4 text-right pr-4">Actions</th>
                            </tr></thead>
                            <tbody data-repid="${repId}">${initialSegmentsHtml}${paginationButtonHtml}</tbody>
                        </table>
                    </div>
                 </details>`;
    });
    return html;
  }
  function renderSegmentRows(segments) {
    return segments.map((seg) => {
      const cacheEntry = analysisState.segmentCache.get(seg.resolvedUrl);
      let statusHtml = "";
      if (cacheEntry && cacheEntry.status !== 200) {
        const statusText = cacheEntry.status === 0 ? "ERR" : cacheEntry.status;
        statusHtml = `<span class="segment-status-indicator status-fail" title="Status: ${statusText}"></span><span class="text-xs text-red-400 ml-1">[${statusText}]</span>`;
      }
      const typeLabel = seg.type === "Init" ? "Init" : `Media #${seg.number}`;
      return `<tr class="border-t border-gray-700 segment-row" data-url="${seg.resolvedUrl}" data-time="${seg.time}">
                    <td class="py-2 status-cell">${statusHtml}${typeLabel}</td>
                    <td class="font-mono text-cyan-400 truncate py-2" title="${seg.resolvedUrl}">${seg.template}</td>
                    <td class="py-2 text-right">
                        <button class="view-details-btn text-xs bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded" data-url="${seg.resolvedUrl}" data-repid="${seg.repId}" data-number="${seg.number}">Analyze</button>
                    </td>
                 </tr>`;
    }).join("");
  }
  function parseAllSegmentUrls(mpd, baseUrl) {
    const segmentsByRep = {};
    mpd.querySelectorAll("Representation").forEach((rep) => {
      const repId = rep.getAttribute("id");
      segmentsByRep[repId] = [];
      const as = rep.closest("AdaptationSet");
      const period = rep.closest("Period");
      const template = rep.querySelector("SegmentTemplate") || as.querySelector("SegmentTemplate") || period.querySelector("SegmentTemplate");
      if (!template) return;
      const initTemplate = template.getAttribute("initialization");
      if (initTemplate) {
        const url = initTemplate.replace(/\$RepresentationID\$/g, repId);
        segmentsByRep[repId].push({ repId, type: "Init", number: 0, resolvedUrl: new URL(url, baseUrl).href, template: url, time: -1 });
      }
      const mediaTemplate = template.getAttribute("media");
      const timeline = template.querySelector("SegmentTimeline");
      if (mediaTemplate && timeline) {
        let segmentNumber = parseInt(template.getAttribute("startNumber") || "1");
        let currentTime = 0;
        timeline.querySelectorAll("S").forEach((s) => {
          const t = s.hasAttribute("t") ? parseInt(s.getAttribute("t")) : currentTime;
          const d = parseInt(s.getAttribute("d"));
          const r = parseInt(s.getAttribute("r") || "0");
          for (let i = 0; i <= r; i++) {
            const segTime = t + i * d;
            const url = mediaTemplate.replace(/\$RepresentationID\$/g, repId).replace(/\$Number(%0\d+d)?\$/g, (match, padding) => {
              const width = padding ? parseInt(padding.substring(2, padding.length - 1)) : 1;
              return String(segmentNumber).padStart(width, "0");
            }).replace(/\$Time\$/g, String(segTime));
            segmentsByRep[repId].push({ repId, type: "Media", number: segmentNumber, resolvedUrl: new URL(url, baseUrl).href, template: url, time: segTime });
            segmentNumber++;
          }
          currentTime = t + (r + 1) * d;
        });
      }
    });
    return segmentsByRep;
  }
  async function handleLoadMoreSegments(e, allSegmentsByRep) {
    const btn = (
      /** @type {HTMLButtonElement} */
      e.target
    );
    btn.textContent = "Loading...";
    btn.disabled = true;
    const repId = btn.dataset.repid;
    const offset = parseInt(btn.dataset.offset);
    const segmentsToFetch = allSegmentsByRep[repId].slice(offset, offset + SEGMENT_PAGE_SIZE);
    await Promise.all(segmentsToFetch.map((seg) => fetchSegment(seg.resolvedUrl)));
    const newRowsHtml = renderSegmentRows(segmentsToFetch);
    const tableBody = document.querySelector(`tbody[data-repid="${repId}"]`);
    const loadMoreRow = tableBody.querySelector(".load-more-row");
    if (loadMoreRow) {
      loadMoreRow.insertAdjacentHTML("beforebegin", newRowsHtml);
    }
    const newOffset = offset + SEGMENT_PAGE_SIZE;
    if (newOffset < allSegmentsByRep[repId].length) {
      btn.textContent = `Load More (${allSegmentsByRep[repId].length - newOffset} remaining)`;
      btn.dataset.offset = String(newOffset);
      btn.disabled = false;
    } else {
      loadMoreRow.remove();
    }
  }
  async function handleLoadPreviousSegments(e, allSegmentsByRep) {
    const btn = (
      /** @type {HTMLButtonElement} */
      e.target
    );
    btn.textContent = "Loading...";
    btn.disabled = true;
    const repId = btn.dataset.repid;
    const offset = parseInt(btn.dataset.offset);
    const start = Math.max(0, offset - SEGMENT_PAGE_SIZE);
    const end = offset;
    const segmentsToFetch = allSegmentsByRep[repId].slice(start, end);
    await Promise.all(segmentsToFetch.map((seg) => fetchSegment(seg.resolvedUrl)));
    const newRowsHtml = renderSegmentRows(segmentsToFetch);
    const tableBody = document.querySelector(`tbody[data-repid="${repId}"]`);
    const loadPreviousRow = tableBody.querySelector(".load-previous-row");
    if (loadPreviousRow) {
      tableBody.querySelector("tr:first-child").insertAdjacentHTML("afterend", newRowsHtml);
    }
    const newOffset = start;
    if (newOffset > 0) {
      btn.textContent = `Load Previous`;
      btn.dataset.offset = String(newOffset);
      btn.disabled = false;
    } else {
      loadPreviousRow.remove();
    }
  }
  function attachSegmentExplorerListeners(container, mpd, baseUrl, isDynamic, allSegmentsByRep) {
    const refreshBtn = container.querySelector("#refresh-segments-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => loadAndCheckSegments(container, mpd, baseUrl, isDynamic, "first"));
    }
    container.querySelectorAll(".view-details-btn:not([data-listener-attached])").forEach((btn) => {
      btn.setAttribute("data-listener-attached", "true");
      btn.addEventListener("click", async (e) => {
        const target = (
          /** @type {HTMLElement} */
          e.target
        );
        const url = target.dataset.url;
        const cacheEntry = analysisState.segmentCache.get(url);
        dom.modalSegmentUrl.textContent = url;
        dom.segmentModal.classList.add("modal-overlay-visible");
        if (cacheEntry && cacheEntry.data) {
          dom.modalContentArea.innerHTML = '<p class="info">Parsing segment from local cache...</p>';
          await handleSegmentAnalysisClick(e, cacheEntry.data);
        } else {
          dom.modalContentArea.innerHTML = `<p class="fail">Segment data not in cache. Status: ${cacheEntry?.status || "N/A"}.</p>`;
        }
      });
    });
    container.querySelectorAll(".load-more-btn:not([data-listener-attached])").forEach((btn) => {
      btn.setAttribute("data-listener-attached", "true");
      btn.addEventListener("click", (e) => handleLoadMoreSegments(e, allSegmentsByRep));
    });
    container.querySelectorAll(".load-previous-btn:not([data-listener-attached])").forEach((btn) => {
      btn.setAttribute("data-listener-attached", "true");
      btn.addEventListener("click", (e) => handleLoadPreviousSegments(e, allSegmentsByRep));
    });
  }
  function updateSegmentFreshness() {
    const activeStream = analysisState.streams.find((s) => s.id === analysisState.activeStreamId);
    if (!activeStream || activeStream.mpd.getAttribute("type") !== "dynamic") return;
    const timeShiftBufferDepth = parseDuration2(activeStream.mpd.getAttribute("timeShiftBufferDepth"));
    const availabilityStartTime = new Date(activeStream.mpd.getAttribute("availabilityStartTime")).getTime();
    if (!timeShiftBufferDepth || !availabilityStartTime) return;
    const now = Date.now();
    const liveEdgeTime = (now - availabilityStartTime) / 1e3;
    const dvrStartTime = liveEdgeTime - timeShiftBufferDepth;
    document.querySelectorAll("#segment-explorer-content .segment-row").forEach((row) => {
      const rowEl = (
        /** @type {HTMLTableRowElement} */
        row
      );
      if (rowEl.dataset.time === "-1") return;
      const template = rowEl.closest("details")?.querySelector("tbody[data-repid]")?.closest("details")?.querySelector("SegmentTemplate");
      if (!template) return;
      const timescale = parseInt(template.getAttribute("timescale") || "1");
      const segmentTime = parseInt(rowEl.dataset.time) / timescale;
      const statusCell = (
        /** @type {HTMLTableCellElement} */
        rowEl.querySelector(".status-cell")
      );
      let isStale = segmentTime < dvrStartTime || segmentTime > liveEdgeTime + 2;
      let staleIndicator = statusCell.querySelector(".stale-segment-indicator");
      if (isStale) {
        if (!staleIndicator) {
          const typeLabel = statusCell.innerText;
          statusCell.innerHTML = `<div class="stale-segment-indicator tooltip" title="This segment is outside the current DVR window (${dvrStartTime.toFixed(1)}s - ${liveEdgeTime.toFixed(1)}s)."></div>${typeLabel}`;
        }
      } else {
        if (staleIndicator) {
          const typeLabel = statusCell.innerText;
          const cacheEntry = analysisState.segmentCache.get(rowEl.dataset.url);
          let statusHtml = "";
          if (cacheEntry && cacheEntry.status !== 200) {
            const statusText = cacheEntry.status === 0 ? "ERR" : cacheEntry.status;
            statusHtml = `<span class="segment-status-indicator status-fail" title="Status: ${statusText}"></span><span class="text-xs text-red-400 ml-1">[${statusText}]</span>`;
          }
          statusCell.innerHTML = `${statusHtml}${typeLabel}`;
        }
      }
    });
  }
  function startSegmentFreshnessChecker() {
    stopSegmentFreshnessChecker();
    const activeStream = analysisState.streams.find((s) => s.id === analysisState.activeStreamId);
    if (activeStream && activeStream.mpd.getAttribute("type") === "dynamic") {
      updateSegmentFreshness();
      segmentFreshnessInterval = setInterval(updateSegmentFreshness, 2e3);
      analysisState.segmentFreshnessChecker = segmentFreshnessInterval;
    }
  }
  function stopSegmentFreshnessChecker() {
    if (segmentFreshnessInterval) {
      clearInterval(segmentFreshnessInterval);
      segmentFreshnessInterval = null;
      analysisState.segmentFreshnessChecker = null;
    }
  }
  var parseDuration2 = (durationStr) => {
    if (!durationStr) return 0;
    const match = durationStr.match(/PT(?:(\d+\.?\d*)S)?/);
    return match ? parseFloat(match[1] || 0) : 0;
  };

  // js/views/compare.js
  var formatBitrate2 = (bps) => {
    if (!bps || isNaN(bps)) return "N/A";
    if (bps >= 1e6) return `${(bps / 1e6).toFixed(2)} Mbps`;
    return `${(bps / 1e3).toFixed(0)} kbps`;
  };
  function renderComparisonTab() {
    const streams = analysisState.streams;
    if (streams.length < 2) {
      dom.tabContents.comparison.innerHTML = "";
      return;
    }
    const sections = {
      "Manifest Properties": [
        { label: "Type", tooltip: "static vs dynamic", iso: "Clause 5.3.1.2", accessor: (mpd) => mpd.getAttribute("type") },
        { label: "Profiles", tooltip: "Declared feature sets", iso: "Clause 8.1", accessor: (mpd) => (mpd.getAttribute("profiles") || "").replace(/urn:mpeg:dash:profile:/g, " ").trim() },
        { label: "Min Buffer Time", tooltip: "Minimum client buffer time.", iso: "Clause 5.3.1.2", accessor: (mpd) => mpd.getAttribute("minBufferTime") || "N/A" },
        { label: "Live Window", tooltip: "DVR window for live streams.", iso: "Clause 5.3.1.2", accessor: (mpd) => mpd.getAttribute("timeShiftBufferDepth") || "N/A" }
      ],
      "Content Overview": [
        { label: "# of Periods", tooltip: "Number of content periods.", iso: "Clause 5.3.2", accessor: (mpd) => mpd.querySelectorAll("Period").length },
        { label: "Content Protection", tooltip: "Detected DRM systems.", iso: "Clause 5.8.4.1", accessor: (mpd) => {
          const schemes = [...new Set(Array.from(mpd.querySelectorAll("ContentProtection")).map((cp) => getDrmSystemName(cp.getAttribute("schemeIdUri"))))];
          return schemes.length > 0 ? schemes.join(", ") : "No";
        } }
      ],
      "Video Details": [
        { label: "# Video Reps", tooltip: "Total number of video quality levels.", iso: "Clause 5.3.5", accessor: (mpd) => mpd.querySelectorAll('AdaptationSet[contentType="video"] Representation, AdaptationSet[mimeType^="video"] Representation').length },
        { label: "Video Bitrates", tooltip: "Min and Max bandwidth values for video.", iso: "Table 9", accessor: (mpd) => {
          const b = Array.from(mpd.querySelectorAll('AdaptationSet[contentType="video"] Representation, AdaptationSet[mimeType^="video"] Representation')).map((r) => parseInt(r.getAttribute("bandwidth")));
          return b.length ? `${formatBitrate2(Math.min(...b))} - ${formatBitrate2(Math.max(...b))}` : "N/A";
        } },
        { label: "Video Resolutions", tooltip: "List of unique video resolutions.", iso: "Table 14", accessor: (mpd) => {
          const res = [...new Set(Array.from(mpd.querySelectorAll('AdaptationSet[contentType="video"] Representation, AdaptationSet[mimeType^="video"] Representation')).map((r) => {
            const as = r.closest("AdaptationSet");
            const width = r.getAttribute("width") || as.getAttribute("width");
            const height = r.getAttribute("height") || as.getAttribute("height");
            return `${width}x${height}`;
          }))];
          return res.join("<br>") || "N/A";
        } },
        { label: "Video Codecs", tooltip: "Unique video codecs.", iso: "Table 14", accessor: (mpd) => {
          const codecs = [...new Set(Array.from(mpd.querySelectorAll('AdaptationSet[contentType="video"] Representation, AdaptationSet[mimeType^="video"] Representation')).map((r) => r.getAttribute("codecs") || r.closest("AdaptationSet").getAttribute("codecs")))];
          return codecs.filter(Boolean).join("<br>") || "N/A";
        } }
      ],
      "Audio Details": [
        { label: "# Audio Tracks", tooltip: "Groups of audio tracks, often by language.", iso: "Clause 5.3.3", accessor: (mpd) => mpd.querySelectorAll('AdaptationSet[contentType="audio"], AdaptationSet[mimeType^="audio"]').length },
        { label: "Audio Languages", tooltip: "Declared languages for audio tracks.", iso: "Table 5", accessor: (mpd) => {
          const langs = [...new Set(Array.from(mpd.querySelectorAll('AdaptationSet[contentType="audio"], AdaptationSet[mimeType^="audio"]')).map((as) => as.getAttribute("lang")))];
          return langs.filter(Boolean).join(", ") || "N/A";
        } },
        { label: "Audio Codecs", tooltip: "Unique audio codecs.", iso: "Table 14", accessor: (mpd) => {
          const codecs = [...new Set(Array.from(mpd.querySelectorAll('AdaptationSet[contentType="audio"] Representation, AdaptationSet[mimeType^="audio"] Representation')).map((r) => r.getAttribute("codecs") || r.closest("AdaptationSet").getAttribute("codecs")))];
          return codecs.filter(Boolean).join("<br>") || "N/A";
        } }
      ]
    };
    let html = "";
    for (const sectionTitle in sections) {
      html += `<h3 class="text-xl font-bold mt-6 mb-2">${sectionTitle}</h3><div class="grid comparison-grid-container" style="grid-template-columns: 200px repeat(${streams.length}, 1fr);">`;
      html += `<div class="font-semibold text-gray-400 p-2 border-b border-gray-700">Property</div>`;
      streams.forEach((stream) => {
        html += `<div class="font-semibold text-gray-400 p-2 border-b border-gray-700">${stream.name}</div>`;
      });
      sections[sectionTitle].forEach((item) => {
        html += `<div class="prop-col p-2 border-b border-gray-700">${item.label}${createInfoTooltip(item.tooltip, item.iso)}</div>`;
        streams.forEach((stream) => {
          html += `<div class="p-2 border-b border-gray-700 font-mono text-sm">${item.accessor(stream.mpd)}</div>`;
        });
      });
      html += "</div>";
    }
    html += `<div class="dev-watermark">Comparison v4.0</div>`;
    dom.tabContents.comparison.innerHTML = html;
  }

  // js/api/dash-parser.js
  function parseMpd(xmlString, baseUrl) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      throw new Error("Invalid XML. Check console for details.");
    }
    const mpd = xmlDoc.querySelector("MPD");
    if (!mpd) {
      throw new Error("No <MPD> element found in the document.");
    }
    const mpdBaseElement = mpd.querySelector("BaseURL");
    if (mpdBaseElement && mpdBaseElement.textContent) {
      baseUrl = new URL(
        mpdBaseElement.textContent,
        baseUrl || window.location.href
      ).href;
    }
    return { mpd, baseUrl };
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
      for (let i = 0; i < array.length; i++) {
        if (array[i]) {
          ret.push(array[i]);
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
            value = value.map(function(value2, i) {
              const oldValue = oldTokens[oldPos + i];
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
    let i;
    for (i = 0; i < str1.length && i < str2.length; i++) {
      if (str1[i] != str2[i]) {
        return str1.slice(0, i);
      }
    }
    return str1.slice(0, i);
  }
  function longestCommonSuffix(str1, str2) {
    let i;
    if (!str1 || !str2 || str1[str1.length - 1] != str2[str2.length - 1]) {
      return "";
    }
    for (i = 0; i < str1.length && i < str2.length; i++) {
      if (str1[str1.length - (i + 1)] != str2[str2.length - (i + 1)]) {
        return str1.slice(-i);
      }
    }
    return str1.slice(-i);
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
  function overlapCount(a, b) {
    let startA = 0;
    if (a.length > b.length) {
      startA = a.length - b.length;
    }
    let endB = b.length;
    if (a.length < b.length) {
      endB = a.length;
    }
    const map = Array(endB);
    let k = 0;
    map[0] = 0;
    for (let j = 1; j < endB; j++) {
      if (b[j] == b[k]) {
        map[j] = map[k];
      } else {
        map[j] = k;
      }
      while (k > 0 && b[j] != b[k]) {
        k = map[k];
      }
      if (b[j] == b[k]) {
        k++;
      }
    }
    k = 0;
    for (let i = startA; i < a.length; i++) {
      while (k > 0 && a[i] != b[k]) {
        k = map[k];
      }
      if (a[i] == b[k]) {
        k++;
      }
    }
    return k;
  }
  function trailingWs(string) {
    let i;
    for (i = string.length - 1; i >= 0; i--) {
      if (!string[i].match(/\s/)) {
        break;
      }
    }
    return string.substring(i + 1);
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
      return tokens.map((token, i) => {
        if (i == 0) {
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

  // js/api/mpd-diff.js
  function escapeHtml2(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function diffMpd(oldMpd, newMpd) {
    const changes = diffWords(oldMpd, newMpd);
    let html = "";
    changes.forEach((part) => {
      if (part.removed) {
        return;
      }
      const escapedValue = escapeHtml2(part.value);
      if (part.added) {
        html += `<span class="diff-added">${escapedValue}</span>`;
      } else {
        html += escapedValue;
      }
    });
    return html;
  }

  // js/mpd-poll.js
  var import_xml_formatter = __toESM(require_cjs2());
  var mpdUpdateInterval = null;
  function startMpdUpdatePolling(stream) {
    if (mpdUpdateInterval) {
      clearInterval(mpdUpdateInterval);
    }
    const updatePeriodAttr = stream.mpd.getAttribute("minimumUpdatePeriod");
    if (!updatePeriodAttr) return;
    const updatePeriod = parseDuration3(updatePeriodAttr) * 1e3;
    const pollInterval = Math.max(updatePeriod, 2e3);
    let originalMpdString = new XMLSerializer().serializeToString(stream.mpd);
    mpdUpdateInterval = setInterval(async () => {
      try {
        const response = await fetch(stream.originalUrl);
        if (!response.ok) return;
        const newMpdString = await response.text();
        if (newMpdString !== originalMpdString) {
          const { mpd: newMpd } = parseMpd(newMpdString, stream.baseUrl);
          const oldMpdForDiff = originalMpdString;
          stream.mpd = newMpd;
          originalMpdString = newMpdString;
          const formattingOptions = { indentation: "  ", lineSeparator: "\n" };
          const formattedOldMpd = (0, import_xml_formatter.default)(oldMpdForDiff, formattingOptions);
          const formattedNewMpd = (0, import_xml_formatter.default)(newMpdString, formattingOptions);
          const diffHtml = diffMpd(formattedOldMpd, formattedNewMpd);
          analysisState.mpdUpdates.unshift({
            timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
            diffHtml
          });
          if (analysisState.mpdUpdates.length > 20) {
            analysisState.mpdUpdates.pop();
          }
          const activeTab = document.querySelector(".tab-active");
          if (activeTab && ["summary", "timeline-visuals", "features", "compliance", "explorer", "updates"].includes(
            /** @type {HTMLElement} */
            activeTab.dataset.tab
          )) {
            renderSingleStreamTabs(stream.id);
          }
        }
      } catch (e) {
        console.error("[MPD-POLL] Error fetching update:", e);
      }
    }, pollInterval);
  }
  function stopMpdUpdatePolling() {
    if (mpdUpdateInterval) {
      clearInterval(mpdUpdateInterval);
      mpdUpdateInterval = null;
    }
  }
  function parseDuration3(durationStr) {
    if (!durationStr) return 0;
    const match = durationStr.match(/PT(?:(\d+\.?\d*)H)?(?:(\d+\.?\d*)M)?(?:(\d+\.?\d*)S)?/);
    if (!match) return 0;
    const hours = parseFloat(match[1] || "0");
    const minutes = parseFloat(match[2] || "0");
    const seconds = parseFloat(match[3] || "0");
    return hours * 3600 + minutes * 60 + seconds;
  }

  // js/views/mpd-updates.js
  var import_xml_formatter2 = __toESM(require_cjs2());
  var togglePollingBtn;
  var prevMpdBtn;
  var nextMpdBtn;
  var mpdIndexDisplay;
  var currentMpdUpdateContainer;
  function renderMpdUpdates(streamId) {
    const updatesContainer = dom.tabContents.updates.querySelector("#mpd-updates-content");
    if (!updatesContainer) return;
    const stream = analysisState.streams.find((s) => s.id === streamId);
    let content = "";
    if (analysisState.streams.length > 1) {
      content = '<p class="warn">MPD update polling is only supported when analyzing a single stream.</p>';
    } else if (!stream || stream.mpd.getAttribute("type") !== "dynamic") {
      content = '<p class="info">This is a static MPD. No updates are expected.</p>';
    } else {
      content = `
            <div class="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-2 sm:space-y-0">
                <button id="toggle-polling-btn" class="px-4 py-2 rounded-md font-bold transition duration-300 w-full sm:w-auto text-white">
                    <!-- Text/State will be set by updatePollingButton -->
                </button>
                <div class="flex items-center space-x-2">
                    <button id="prev-mpd-btn" class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50" title="Previous Update (Right Arrow)">&lt;</button>
                    <span id="mpd-index-display" class="text-gray-400 font-semibold w-16 text-center">1/1</span>
                    <button id="next-mpd-btn" class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50" title="Next Update (Left Arrow)">&gt;</button>
                </div>
            </div>
            <div id="current-mpd-update" class="mpd-update-entry"></div>
        `;
    }
    updatesContainer.innerHTML = content;
    if (stream && stream.mpd.getAttribute("type") === "dynamic" && analysisState.streams.length === 1) {
      togglePollingBtn = document.getElementById("toggle-polling-btn");
      prevMpdBtn = document.getElementById("prev-mpd-btn");
      nextMpdBtn = document.getElementById("next-mpd-btn");
      mpdIndexDisplay = document.getElementById("mpd-index-display");
      currentMpdUpdateContainer = document.getElementById("current-mpd-update");
      togglePollingBtn.addEventListener("click", togglePollingState);
      prevMpdBtn.addEventListener("click", () => navigateMpdUpdates(1));
      nextMpdBtn.addEventListener("click", () => navigateMpdUpdates(-1));
      updateMpdDisplay();
      updatePollingButton();
    }
  }
  function updateMpdDisplay() {
    const { mpdUpdates, activeMpdUpdateIndex } = analysisState;
    if (!currentMpdUpdateContainer) return;
    if (analysisState.mpdUpdates.length === 0) {
      const initialMpdString = new XMLSerializer().serializeToString(analysisState.streams[0].mpd);
      const formattedInitialMpd = (0, import_xml_formatter2.default)(initialMpdString, { indentation: "  ", lineSeparator: "\n" });
      currentMpdUpdateContainer.innerHTML = `<div class="text-sm text-gray-400 mb-2">Initial MPD loaded:</div><div class="diff-container"><span>${escapeHtml3(formattedInitialMpd)}</span></div>`;
      mpdIndexDisplay.textContent = "1/1";
      prevMpdBtn.disabled = true;
      nextMpdBtn.disabled = true;
      return;
    }
    const currentUpdate = mpdUpdates[activeMpdUpdateIndex];
    currentMpdUpdateContainer.innerHTML = `
        <div class="text-sm text-gray-400 mb-2">Update received at: <span class="font-semibold text-gray-200">${currentUpdate.timestamp}</span></div>
        <div class="diff-container">${currentUpdate.diffHtml}</div>
    `;
    mpdIndexDisplay.textContent = `${mpdUpdates.length - activeMpdUpdateIndex}/${mpdUpdates.length}`;
    prevMpdBtn.disabled = activeMpdUpdateIndex >= mpdUpdates.length - 1;
    nextMpdBtn.disabled = activeMpdUpdateIndex <= 0;
  }
  function togglePollingState() {
    analysisState.isPollingActive = !analysisState.isPollingActive;
    if (analysisState.isPollingActive) {
      const stream = analysisState.streams.find((s) => s.id === analysisState.activeStreamId);
      if (stream && stream.mpd.getAttribute("type") === "dynamic") {
        startMpdUpdatePolling(stream);
      }
    } else {
      stopMpdUpdatePolling();
    }
    updatePollingButton();
  }
  function updatePollingButton() {
    if (togglePollingBtn) {
      const stream = analysisState.streams[0];
      if (!stream || stream.mpd.getAttribute("type") !== "dynamic" || analysisState.streams.length > 1) {
        togglePollingBtn.style.display = "none";
        return;
      }
      togglePollingBtn.style.display = "block";
      togglePollingBtn.textContent = analysisState.isPollingActive ? "Stop Polling" : "Start Polling";
      togglePollingBtn.classList.toggle("bg-red-600", !analysisState.isPollingActive);
      togglePollingBtn.classList.toggle("hover:bg-red-700", !analysisState.isPollingActive);
      togglePollingBtn.classList.toggle("bg-blue-600", analysisState.isPollingActive);
      togglePollingBtn.classList.toggle("hover:bg-blue-700", analysisState.isPollingActive);
    }
  }
  function navigateMpdUpdates(direction) {
    const { mpdUpdates } = analysisState;
    if (mpdUpdates.length === 0) return;
    let newIndex = analysisState.activeMpdUpdateIndex + direction;
    if (newIndex < 0) {
      newIndex = 0;
    } else if (newIndex >= mpdUpdates.length) {
      newIndex = mpdUpdates.length - 1;
    }
    if (newIndex !== analysisState.activeMpdUpdateIndex) {
      analysisState.activeMpdUpdateIndex = newIndex;
      updateMpdDisplay();
    }
  }
  function escapeHtml3(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // js/helpers/stream-examples.js
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
      name: "Shaka Packager: Sintel (Clear, On-Demand)",
      url: "https://storage.googleapis.com/shaka-demo-assets/sintel/dash.mpd"
    },
    {
      name: "Shaka Packager: Angel One (Widevine)",
      url: "https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd"
    },
    {
      name: "Bitmovin: Art of Motion (On-Demand)",
      url: "https://bitmovin-a.akamaihd.net/content/MI201109210084_1/mpds/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.mpd"
    },
    {
      name: "Microsoft: Azure Media Services (Smooth to DASH)",
      url: "https://amssamples.streaming.mediaservices.windows.net/683f7e47-bd83-4427-b0a3-26a6c4547782/BigBuckBunny.ism/manifest(format=mpd-time-csf)"
    }
  ];

  // js/ui.js
  var keyboardNavigationListener = null;
  function addStreamInput() {
    const streamId = analysisState.streamIdCounter++;
    const isFirstStream = streamId === 0;
    const historyKey = "dash_analyzer_history";
    const urlHistory = JSON.parse(localStorage.getItem(historyKey) || "[]");
    const exampleOptions = exampleStreams.map((stream) => `<option value="${stream.url}">${stream.name}</option>`).join("");
    const historyOptions = urlHistory.map((url) => `<option value="${url}">${new URL(url).hostname}</option>`).join("");
    const inputHtml = `
        <div class="stream-input-group ${streamId > 0 ? "border-t border-gray-700 pt-4 mt-4" : ""}" data-id="${streamId}">
            <div class="flex items-center justify-between mb-2">
                 <h3 class="text-lg font-semibold text-gray-300">Stream ${streamId + 1}</h3>
                 ${streamId > 0 ? '<button class="remove-stream-btn text-red-400 hover:text-red-600 font-bold text-lg">&times; Remove</button>' : ""}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div class="md:col-span-8">
                    <input type="url" id="url-${streamId}" class="input-url w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-blue-500" placeholder="Enter MPD URL...">
                </div>
                <div class="md:col-span-4 flex items-center gap-4">
                    <span class="text-gray-500 md:hidden">OR</span>
                    <label for="file-${streamId}" class="block w-full cursor-pointer bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md text-center">Upload File</label>
                    <input type="file" id="file-${streamId}" class="input-file hidden" accept=".mpd, .xml">
                </div>
            </div>
            <div class="flex items-center gap-4 mt-2">
                <select class="examples-dropdown w-full md:w-1/2 bg-gray-700 text-white rounded-md border-gray-600 p-2">
                    <option value="">-- Select from Examples --</option>
                    ${exampleOptions}
                    ${historyOptions.length > 0 ? `<optgroup label="History">${historyOptions}</optgroup>` : ""}
                </select>
                <p class="file-name-display text-xs text-gray-500 h-4 flex-grow"></p>
            </div>
        </div>`;
    dom.streamInputs.insertAdjacentHTML("beforeend", inputHtml);
    const newGroup = dom.streamInputs.querySelector(`[data-id="${streamId}"]`);
    const urlInput = (
      /** @type {HTMLInputElement} */
      newGroup.querySelector(".input-url")
    );
    const fileInput = (
      /** @type {HTMLInputElement} */
      newGroup.querySelector(".input-file")
    );
    const examplesDropdown = (
      /** @type {HTMLSelectElement} */
      newGroup.querySelector(".examples-dropdown")
    );
    if (isFirstStream && urlHistory.length > 0) {
      urlInput.value = urlHistory[0];
    }
    examplesDropdown.addEventListener("change", () => {
      if (examplesDropdown.value) {
        urlInput.value = examplesDropdown.value;
        fileInput.value = "";
        newGroup.querySelector(".file-name-display").textContent = "";
      }
    });
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (file) {
        newGroup.querySelector(".file-name-display").textContent = `Selected: ${file.name}`;
        urlInput.value = "";
        examplesDropdown.value = "";
      }
    });
    const removeBtn = newGroup.querySelector(".remove-stream-btn");
    if (removeBtn) removeBtn.addEventListener("click", () => newGroup.remove());
  }
  function handleTabClick(e) {
    const target = (
      /** @type {HTMLElement} */
      e.target
    );
    if (!target.classList.contains("tab") || target.offsetParent === null) return;
    stopSegmentFreshnessChecker();
    stopMpdUpdatePolling();
    if (keyboardNavigationListener) {
      document.removeEventListener("keydown", keyboardNavigationListener);
      keyboardNavigationListener = null;
    }
    dom.tabs.querySelectorAll(".tab").forEach((t) => t.classList.remove("tab-active"));
    target.classList.add("tab-active");
    Object.values(dom.tabContents).forEach((c) => {
      if (c) c.classList.remove("tab-content-active");
    });
    const activeTabContent = dom.tabContents[target.dataset.tab];
    if (activeTabContent) activeTabContent.classList.add("tab-content-active");
    if (target.dataset.tab === "explorer") {
      startSegmentFreshnessChecker();
    } else if (target.dataset.tab === "updates") {
      if (analysisState.streams.length === 1 && analysisState.streams[0].mpd.getAttribute("type") === "dynamic") {
        analysisState.isPollingActive = true;
        startMpdUpdatePolling(analysisState.streams[0]);
      }
      keyboardNavigationListener = (event) => {
        if (event.key === "ArrowLeft") navigateMpdUpdates(1);
        if (event.key === "ArrowRight") navigateMpdUpdates(-1);
      };
      document.addEventListener("keydown", keyboardNavigationListener);
    }
    updatePollingButton();
  }
  function populateContextSwitcher() {
    if (analysisState.streams.length > 1) {
      dom.contextSwitcherContainer.classList.remove("hidden");
      dom.contextSwitcher.innerHTML = analysisState.streams.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
      dom.contextSwitcher.value = String(analysisState.activeStreamId);
    } else {
      dom.contextSwitcherContainer.classList.add("hidden");
    }
  }
  function renderAllTabs() {
    const hasMultipleStreams = analysisState.streams.length > 1;
    document.querySelector('.tab[data-tab="comparison"]').style.display = hasMultipleStreams ? "block" : "none";
    document.querySelector('.tab[data-tab="summary"]').style.display = hasMultipleStreams ? "none" : "block";
    if (hasMultipleStreams) {
      renderComparisonTab();
    }
    renderSingleStreamTabs(analysisState.activeStreamId);
  }
  function renderSingleStreamTabs(streamId) {
    const stream = analysisState.streams.find((s) => s.id === streamId);
    if (!stream) return;
    const { mpd, baseUrl } = stream;
    if (analysisState.streams.length === 1 && dom.tabContents.summary) {
      dom.tabContents.summary.innerHTML = getGlobalSummaryHTML(mpd, false);
    }
    dom.tabContents.compliance.innerHTML = getComplianceReportHTML(mpd, false);
    dom.tabContents["timeline-visuals"].innerHTML = getTimelineAndVisualsHTML(mpd);
    dom.tabContents.features.innerHTML = getFeaturesAnalysisHTML(mpd);
    dom.tabContents["interactive-mpd"].innerHTML = getInteractiveMpdHTML(mpd);
    initializeSegmentExplorer(dom.tabContents.explorer, mpd, baseUrl);
    renderMpdUpdates(streamId);
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
  function createInfoTooltip(text, isoRef) {
    return `<span class="tooltip info-icon" data-tooltip="${text}" data-iso="${isoRef}">[?]</span>`;
  }

  // js/tooltip.js
  function setupGlobalTooltipListener() {
    document.body.addEventListener("mouseover", (e) => {
      const target = (
        /** @type {HTMLElement} */
        e.target
      );
      const tooltipTrigger = target.closest("[data-tooltip]");
      if (!tooltipTrigger) {
        dom.globalTooltip.style.visibility = "hidden";
        dom.globalTooltip.style.opacity = "0";
        return;
      }
      const text = tooltipTrigger.dataset.tooltip || "";
      const isoRef = tooltipTrigger.dataset.iso || "";
      if (!text) return;
      const tooltipContent = `${text}${isoRef ? `<span class="iso-ref">${isoRef}</span>` : ""}`;
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
    document.body.addEventListener("mouseout", (e) => {
      const target = (
        /** @type {HTMLElement} */
        e.target
      );
      const relatedTarget = (
        /** @type {HTMLElement} */
        e.relatedTarget
      );
      const tooltipTrigger = target.closest("[data-tooltip]");
      if (tooltipTrigger && !tooltipTrigger.contains(relatedTarget)) {
        dom.globalTooltip.style.visibility = "hidden";
        dom.globalTooltip.style.opacity = "0";
      }
    });
  }

  // js/main.js
  var HISTORY_KEY = "dash_analyzer_history";
  var MAX_HISTORY_ITEMS = 10;
  dom.addStreamBtn.addEventListener("click", addStreamInput);
  dom.analyzeBtn.addEventListener("click", handleAnalysis);
  dom.tabs.addEventListener("click", handleTabClick);
  dom.closeModalBtn.addEventListener(
    "click",
    () => dom.segmentModal.classList.remove("modal-overlay-visible")
  );
  dom.contextSwitcher.addEventListener("change", (e) => {
    const target = (
      /** @type {HTMLSelectElement} */
      e.target
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
    stopMpdUpdatePolling();
    showStatus("Starting analysis...", "info");
    analysisState.streams = [];
    const inputGroups = dom.streamInputs.querySelectorAll(".stream-input-group");
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
      let xmlString = "";
      let name = `Stream ${id + 1}`;
      let originalUrl = "";
      let baseUrl = "";
      try {
        if (urlInput.value) {
          originalUrl = urlInput.value;
          name = new URL(originalUrl).hostname;
          baseUrl = new URL(originalUrl, window.location.href).href;
          showStatus(`Fetching ${name}...`, "info");
          const response = await fetch(originalUrl);
          if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
          xmlString = await response.text();
          saveUrlToHistory(originalUrl);
        } else if (fileInput.files.length > 0) {
          const file = fileInput.files[0];
          name = file.name;
          baseUrl = window.location.href;
          showStatus(`Reading ${name}...`, "info");
          xmlString = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(
              /** @type {string} */
              e.target.result
            );
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
          });
        } else {
          return null;
        }
        const { mpd, baseUrl: newBaseUrl } = parseMpd(xmlString, baseUrl);
        baseUrl = newBaseUrl;
        return { id, name, originalUrl, baseUrl, mpd };
      } catch (error) {
        showStatus(`Failed to process stream ${id + 1} (${name}): ${error.message}`, "fail");
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
      analysisState.streams.sort((a, b) => a.id - b.id);
      analysisState.activeStreamId = analysisState.streams[0].id;
      const defaultTab = analysisState.streams.length > 1 ? "comparison" : "summary";
      populateContextSwitcher();
      renderAllTabs();
      showStatus(`Analysis Complete for ${analysisState.streams.length} stream(s).`, "pass");
      dom.results.classList.remove("hidden");
      document.querySelector(`.tab[data-tab="${defaultTab}"]`).click();
    } catch (error) {
      console.error("Analysis failed:", error);
      dom.results.classList.add("hidden");
    }
  }
})();
