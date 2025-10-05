(()=>{var Or=Object.create;var Ut=Object.defineProperty;var Xr=Object.getOwnPropertyDescriptor;var jr=Object.getOwnPropertyNames;var Gr=Object.getPrototypeOf,Wr=Object.prototype.hasOwnProperty;var de=(t,i)=>()=>(t&&(i=t(t=0)),i);var zi=(t,i)=>()=>(i||t((i={exports:{}}).exports,i),i.exports),qr=(t,i)=>{for(var e in i)Ut(t,e,{get:i[e],enumerable:!0})},Kr=(t,i,e,n)=>{if(i&&typeof i=="object"||typeof i=="function")for(let a of jr(i))!Wr.call(t,a)&&a!==e&&Ut(t,a,{get:()=>i[a],enumerable:!(n=Xr(i,a))||n.enumerable});return t};var Yr=(t,i,e)=>(e=t!=null?Or(Gr(t)):{},Kr(i||!t||!t.__esModule?Ut(e,"default",{value:t,enumerable:!0}):e,t));var Mt,x,H=de(()=>{Mt=class{constructor(){this.listeners={}}subscribe(i,e){return this.listeners[i]||(this.listeners[i]=[]),this.listeners[i].push(e),()=>{this.listeners[i]=this.listeners[i].filter(n=>n!==e)}}dispatch(i,e){this.listeners[i]&&this.listeners[i].forEach(n=>n(e))}},x=new Mt});function Yi(t,i){if(!Vt(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return Vi!==void 0?Vi.createHTML(i):i}function Ce(t,i,e=t,n){if(i===xe)return i;let a=n!==void 0?e._$Co?.[n]:e._$Cl,o=Oe(i)?void 0:i._$litDirective$;return a?.constructor!==o&&(a?._$AO?.(!1),o===void 0?a=void 0:(a=new o(t),a._$AT(t,e,n)),n!==void 0?(e._$Co??=[])[n]=a:e._$Cl=a),a!==void 0&&(i=Ce(t,a._$AS(t,i.values),a,n)),i}var Ht,it,Vi,Wi,ce,qi,Jr,he,Ne,Oe,Vt,Qr,kt,Ve,Ni,Oi,ue,Xi,ji,Ki,Nt,d,uc,gc,xe,L,Gi,ge,Zr,Xe,Rt,je,Ie,Lt,Bt,Ft,zt,el,F,E=de(()=>{Ht=globalThis,it=Ht.trustedTypes,Vi=it?it.createPolicy("lit-html",{createHTML:t=>t}):void 0,Wi="$lit$",ce=`lit$${Math.random().toFixed(9).slice(2)}$`,qi="?"+ce,Jr=`<${qi}>`,he=document,Ne=()=>he.createComment(""),Oe=t=>t===null||typeof t!="object"&&typeof t!="function",Vt=Array.isArray,Qr=t=>Vt(t)||typeof t?.[Symbol.iterator]=="function",kt=`[ 	
\f\r]`,Ve=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Ni=/-->/g,Oi=/>/g,ue=RegExp(`>|${kt}(?:([^\\s"'>=/]+)(${kt}*=${kt}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Xi=/'/g,ji=/"/g,Ki=/^(?:script|style|textarea|title)$/i,Nt=t=>(i,...e)=>({_$litType$:t,strings:i,values:e}),d=Nt(1),uc=Nt(2),gc=Nt(3),xe=Symbol.for("lit-noChange"),L=Symbol.for("lit-nothing"),Gi=new WeakMap,ge=he.createTreeWalker(he,129);Zr=(t,i)=>{let e=t.length-1,n=[],a,o=i===2?"<svg>":i===3?"<math>":"",s=Ve;for(let r=0;r<e;r++){let l=t[r],c,f,m=-1,u=0;for(;u<l.length&&(s.lastIndex=u,f=s.exec(l),f!==null);)u=s.lastIndex,s===Ve?f[1]==="!--"?s=Ni:f[1]!==void 0?s=Oi:f[2]!==void 0?(Ki.test(f[2])&&(a=RegExp("</"+f[2],"g")),s=ue):f[3]!==void 0&&(s=ue):s===ue?f[0]===">"?(s=a??Ve,m=-1):f[1]===void 0?m=-2:(m=s.lastIndex-f[2].length,c=f[1],s=f[3]===void 0?ue:f[3]==='"'?ji:Xi):s===ji||s===Xi?s=ue:s===Ni||s===Oi?s=Ve:(s=ue,a=void 0);let p=s===ue&&t[r+1].startsWith("/>")?" ":"";o+=s===Ve?l+Jr:m>=0?(n.push(c),l.slice(0,m)+Wi+l.slice(m)+ce+p):l+ce+(m===-2?r:p)}return[Yi(t,o+(t[e]||"<?>")+(i===2?"</svg>":i===3?"</math>":"")),n]},Xe=class t{constructor({strings:i,_$litType$:e},n){let a;this.parts=[];let o=0,s=0,r=i.length-1,l=this.parts,[c,f]=Zr(i,e);if(this.el=t.createElement(c,n),ge.currentNode=this.el.content,e===2||e===3){let m=this.el.content.firstChild;m.replaceWith(...m.childNodes)}for(;(a=ge.nextNode())!==null&&l.length<r;){if(a.nodeType===1){if(a.hasAttributes())for(let m of a.getAttributeNames())if(m.endsWith(Wi)){let u=f[s++],p=a.getAttribute(m).split(ce),h=/([.?@])?(.*)/.exec(u);l.push({type:1,index:o,name:h[2],strings:p,ctor:h[1]==="."?Lt:h[1]==="?"?Bt:h[1]==="@"?Ft:Ie}),a.removeAttribute(m)}else m.startsWith(ce)&&(l.push({type:6,index:o}),a.removeAttribute(m));if(Ki.test(a.tagName)){let m=a.textContent.split(ce),u=m.length-1;if(u>0){a.textContent=it?it.emptyScript:"";for(let p=0;p<u;p++)a.append(m[p],Ne()),ge.nextNode(),l.push({type:2,index:++o});a.append(m[u],Ne())}}}else if(a.nodeType===8)if(a.data===qi)l.push({type:2,index:o});else{let m=-1;for(;(m=a.data.indexOf(ce,m+1))!==-1;)l.push({type:7,index:o}),m+=ce.length-1}o++}}static createElement(i,e){let n=he.createElement("template");return n.innerHTML=i,n}};Rt=class{constructor(i,e){this._$AV=[],this._$AN=void 0,this._$AD=i,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(i){let{el:{content:e},parts:n}=this._$AD,a=(i?.creationScope??he).importNode(e,!0);ge.currentNode=a;let o=ge.nextNode(),s=0,r=0,l=n[0];for(;l!==void 0;){if(s===l.index){let c;l.type===2?c=new je(o,o.nextSibling,this,i):l.type===1?c=new l.ctor(o,l.name,l.strings,this,i):l.type===6&&(c=new zt(o,this,i)),this._$AV.push(c),l=n[++r]}s!==l?.index&&(o=ge.nextNode(),s++)}return ge.currentNode=he,a}p(i){let e=0;for(let n of this._$AV)n!==void 0&&(n.strings!==void 0?(n._$AI(i,n,e),e+=n.strings.length-2):n._$AI(i[e])),e++}},je=class t{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(i,e,n,a){this.type=2,this._$AH=L,this._$AN=void 0,this._$AA=i,this._$AB=e,this._$AM=n,this.options=a,this._$Cv=a?.isConnected??!0}get parentNode(){let i=this._$AA.parentNode,e=this._$AM;return e!==void 0&&i?.nodeType===11&&(i=e.parentNode),i}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(i,e=this){i=Ce(this,i,e),Oe(i)?i===L||i==null||i===""?(this._$AH!==L&&this._$AR(),this._$AH=L):i!==this._$AH&&i!==xe&&this._(i):i._$litType$!==void 0?this.$(i):i.nodeType!==void 0?this.T(i):Qr(i)?this.k(i):this._(i)}O(i){return this._$AA.parentNode.insertBefore(i,this._$AB)}T(i){this._$AH!==i&&(this._$AR(),this._$AH=this.O(i))}_(i){this._$AH!==L&&Oe(this._$AH)?this._$AA.nextSibling.data=i:this.T(he.createTextNode(i)),this._$AH=i}$(i){let{values:e,_$litType$:n}=i,a=typeof n=="number"?this._$AC(i):(n.el===void 0&&(n.el=Xe.createElement(Yi(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===a)this._$AH.p(e);else{let o=new Rt(a,this),s=o.u(this.options);o.p(e),this.T(s),this._$AH=o}}_$AC(i){let e=Gi.get(i.strings);return e===void 0&&Gi.set(i.strings,e=new Xe(i)),e}k(i){Vt(this._$AH)||(this._$AH=[],this._$AR());let e=this._$AH,n,a=0;for(let o of i)a===e.length?e.push(n=new t(this.O(Ne()),this.O(Ne()),this,this.options)):n=e[a],n._$AI(o),a++;a<e.length&&(this._$AR(n&&n._$AB.nextSibling,a),e.length=a)}_$AR(i=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);i!==this._$AB;){let n=i.nextSibling;i.remove(),i=n}}setConnected(i){this._$AM===void 0&&(this._$Cv=i,this._$AP?.(i))}},Ie=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(i,e,n,a,o){this.type=1,this._$AH=L,this._$AN=void 0,this.element=i,this.name=e,this._$AM=a,this.options=o,n.length>2||n[0]!==""||n[1]!==""?(this._$AH=Array(n.length-1).fill(new String),this.strings=n):this._$AH=L}_$AI(i,e=this,n,a){let o=this.strings,s=!1;if(o===void 0)i=Ce(this,i,e,0),s=!Oe(i)||i!==this._$AH&&i!==xe,s&&(this._$AH=i);else{let r=i,l,c;for(i=o[0],l=0;l<o.length-1;l++)c=Ce(this,r[n+l],e,l),c===xe&&(c=this._$AH[l]),s||=!Oe(c)||c!==this._$AH[l],c===L?i=L:i!==L&&(i+=(c??"")+o[l+1]),this._$AH[l]=c}s&&!a&&this.j(i)}j(i){i===L?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,i??"")}},Lt=class extends Ie{constructor(){super(...arguments),this.type=3}j(i){this.element[this.name]=i===L?void 0:i}},Bt=class extends Ie{constructor(){super(...arguments),this.type=4}j(i){this.element.toggleAttribute(this.name,!!i&&i!==L)}},Ft=class extends Ie{constructor(i,e,n,a,o){super(i,e,n,a,o),this.type=5}_$AI(i,e=this){if((i=Ce(this,i,e,0)??L)===xe)return;let n=this._$AH,a=i===L&&n!==L||i.capture!==n.capture||i.once!==n.once||i.passive!==n.passive,o=i!==L&&(n===L||a);a&&this.element.removeEventListener(this.name,this,n),o&&this.element.addEventListener(this.name,this,i),this._$AH=i}handleEvent(i){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,i):this._$AH.handleEvent(i)}},zt=class{constructor(i,e,n){this.element=i,this.type=6,this._$AN=void 0,this._$AM=e,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(i){Ce(this,i)}},el=Ht.litHtmlPolyfillSupport;el?.(Xe,je),(Ht.litHtmlVersions??=[]).push("3.3.1");F=(t,i,e)=>{let n=e?.renderBefore??i,a=n._$litPart$;if(a===void 0){let o=e?.renderBefore??null;n._$litPart$=a=new je(i.insertBefore(Ne(),o),o,void 0,e??{})}return a._$AI(t),a}});var Ji,Qi,Zi=de(()=>{Ji=t=>{let i,e=new Set,n=(c,f)=>{let m=typeof c=="function"?c(i):c;if(!Object.is(m,i)){let u=i;i=f??(typeof m!="object"||m===null)?m:Object.assign({},i,m),e.forEach(p=>p(i,u))}},a=()=>i,r={setState:n,getState:a,getInitialState:()=>l,subscribe:c=>(e.add(c),()=>e.delete(c))},l=i=t(n,a,r);return r},Qi=(t=>t?Ji(t):Ji)});var nt,en=de(()=>{nt=class t{constructor(i=100){if(i<1)throw new Error("LRUCache maxSize must be at least 1.");this.maxSize=i,this.cache=new Map}get(i){if(!this.cache.has(i))return;let e=this.cache.get(i);return this.cache.delete(i),this.cache.set(i,e),e}set(i,e){if(this.cache.has(i)&&this.cache.delete(i),this.cache.size>=this.maxSize){let n=this.cache.keys().next().value;this.cache.delete(n)}this.cache.set(i,e)}has(i){return this.cache.has(i)}forEach(i){this.cache.forEach(i)}clear(){this.cache.clear()}clone(){let i=new t(this.maxSize);return i.cache=new Map(this.cache),i}}});var tl,tn,z,_,I,D=de(()=>{Zi();en();H();tl=200,tn=()=>({streams:[],activeStreamId:null,activeSegmentUrl:null,streamIdCounter:1,streamInputIds:[0],segmentCache:new nt(tl),segmentsForCompare:[],decodedSamples:new Map,interactiveManifestCurrentPage:1,interactiveSegmentCurrentPage:1,viewState:"input",activeTab:"summary",modalState:{isModalOpen:!1,modalTitle:"",modalUrl:"",modalContentTemplate:null}}),z=Qi((t,i)=>({...tn(),startAnalysis:()=>t(tn()),completeAnalysis:e=>{let n=e.length>1?"comparison":"summary";t({streams:e,activeStreamId:e[0]?.id??null,viewState:"results",activeTab:n}),x.dispatch("state:analysis-complete",{streams:e})},setActiveStreamId:e=>t({activeStreamId:e}),setActiveSegmentUrl:e=>t({activeSegmentUrl:e,interactiveSegmentCurrentPage:1}),addStreamInputId:()=>{t(e=>({streamInputIds:[...e.streamInputIds,e.streamIdCounter],streamIdCounter:e.streamIdCounter+1}))},removeStreamInputId:e=>{t(n=>({streamInputIds:n.streamInputIds.filter(a=>a!==e)}))},resetStreamInputIds:()=>{i().startAnalysis()},setStreamInputsFromData:e=>{let n=[],a=0;for(let o=0;o<e.length;o++)n.push(a),a++;t({streamInputIds:n,streamIdCounter:a})},addSegmentToCompare:e=>{let{segmentsForCompare:n}=i();n.length<2&&!n.includes(e)&&(t({segmentsForCompare:[...n,e]}),x.dispatch("state:compare-list-changed",{count:i().segmentsForCompare.length}))},removeSegmentFromCompare:e=>{t(n=>({segmentsForCompare:n.segmentsForCompare.filter(a=>a!==e)})),x.dispatch("state:compare-list-changed",{count:i().segmentsForCompare.length})},clearSegmentsToCompare:()=>{t({segmentsForCompare:[]}),x.dispatch("state:compare-list-changed",{count:0})},updateStream:(e,n)=>{t(a=>({streams:a.streams.map(o=>o.id===e?{...o,...n}:o)})),n.hlsVariantState&&x.dispatch("state:stream-variant-changed",{streamId:e})},navigateManifestUpdate:(e,n)=>{t(a=>{let o=a.streams.findIndex(f=>f.id===e);if(o===-1)return{};let s=a.streams[o];if(s.manifestUpdates.length===0)return{};let r=s.activeManifestUpdateIndex+n;if(r=Math.max(0,Math.min(r,s.manifestUpdates.length-1)),r===s.activeManifestUpdateIndex)return{};let l=[...a.streams],c={...s,activeManifestUpdateIndex:r};return r===0&&(c.manifestUpdates[0].hasNewIssues=!1),l[o]=c,{streams:l}})},setInteractiveManifestPage:e=>t({interactiveManifestCurrentPage:e}),setInteractiveSegmentPage:e=>t({interactiveSegmentCurrentPage:e}),setViewState:e=>t({viewState:e}),setActiveTab:e=>t({activeTab:e}),setModalState:e=>{t(n=>({modalState:{...n.modalState,...e}}))}})),_=z,I={startAnalysis:()=>z.getState().startAnalysis(),completeAnalysis:t=>z.getState().completeAnalysis(t),setActiveStreamId:t=>z.getState().setActiveStreamId(t),setActiveSegmentUrl:t=>z.getState().setActiveSegmentUrl(t),addStreamInputId:()=>z.getState().addStreamInputId(),removeStreamInputId:t=>z.getState().removeStreamInputId(t),resetStreamInputIds:()=>z.getState().resetStreamInputIds(),setStreamInputsFromData:t=>z.getState().setStreamInputsFromData(t),addSegmentToCompare:t=>z.getState().addSegmentToCompare(t),removeSegmentFromCompare:t=>z.getState().removeSegmentFromCompare(t),clearSegmentsToCompare:()=>z.getState().clearSegmentsToCompare(),updateStream:(t,i)=>z.getState().updateStream(t,i),navigateManifestUpdate:(t,i)=>z.getState().navigateManifestUpdate(t,i),setInteractiveManifestPage:t=>z.getState().setInteractiveManifestPage(t),setInteractiveSegmentPage:t=>z.getState().setInteractiveSegmentPage(t),setViewState:t=>z.getState().setViewState(t),setActiveTab:t=>z.getState().setActiveTab(t),setModalState:t=>z.getState().setModalState(t)}});var In,En,lt,An=de(()=>{In={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},En=t=>(...i)=>({_$litDirective$:t,values:i}),lt=class{constructor(i){}get _$AU(){return this._$AM._$AU}_$AT(i,e,n){this._$Ct=i,this._$AM=e,this._$Ci=n}_$AS(i,e){return this.update(i,e)}update(i,e){return this.render(...e)}}});var Ke,M,pe=de(()=>{E();An();Ke=class extends lt{constructor(i){if(super(i),this.it=L,i.type!==In.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(i){if(i===L||i==null)return this._t=void 0,this.it=i;if(i===xe)return i;if(typeof i!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(i===this.it)return this._t;this.it=i;let e=[i];return e.raw=e,this._t={_$litType$:this.constructor.resultType,strings:e,values:[]}}};Ke.directiveName="unsafeHTML",Ke.resultType=1;M=En(Ke)});var Dn={};qr(Dn,{initializeManifestUpdates:()=>qt,manifestUpdatesTemplate:()=>Kt,navigateManifestUpdates:()=>Wt});function qt(t){ml=t}function Wt(t){let{activeStreamId:i}=_.getState();I.navigateManifestUpdate(i,t)}var ml,Kt,dt=de(()=>{E();pe();D();Kt=t=>{if(!t)return d`<p class="warn">No active stream to monitor.</p>`;if(t.manifest.type!=="dynamic")return d`<p class="info">
            This is a VOD/static manifest. No updates are expected.
        </p>`;let{manifestUpdates:i,activeManifestUpdateIndex:e}=t,n=i.length;if(n===0)return d`<div id="mpd-updates-content">
            <p class="info">Awaiting first manifest update...</p>
        </div>`;let a=n-e,o=i[e],s=o.diffHtml.split(`
`),r=e===i.length-1?"Initial Manifest loaded:":"Update received at:",l=d` <div class="text-sm text-gray-400 mb-2">
            ${r}
            <span class="font-semibold text-gray-200"
                >${o.timestamp}</span
            >
        </div>
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            ${s.map((c,f)=>d`
                    <div class="flex">
                        <span
                            class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-10"
                            >${f+1}</span
                        >
                        <span class="flex-grow whitespace-pre-wrap break-all"
                            >${M(c)}</span
                        >
                    </div>
                `)}
        </div>`;return d` <div id="mpd-updates-content">
        <div
            class="flex flex-col sm:flex-row justify-end items-center mb-4 space-y-2 sm:space-y-0"
        >
            <div class="flex items-center space-x-2">
                <button
                    id="prev-manifest-btn"
                    class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                    title="Previous Update (Right Arrow)"
                    ?disabled=${e>=n-1}
                    @click=${()=>Wt(1)}
                >
                    &lt;
                </button>
                <span
                    id="manifest-index-display"
                    class="text-gray-400 font-semibold w-16 text-center"
                    >${a}/${n}</span
                >
                <button
                    id="next-manifest-btn"
                    class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                    title="Next Update (Left Arrow)"
                    ?disabled=${e<=0}
                    @click=${()=>Wt(-1)}
                >
                    &gt;
                </button>
            </div>
        </div>
        <div id="current-manifest-update" class="manifest-update-entry">
            ${l}
        </div>
    </div>`}});var Es=zi((Le,gi)=>{"use strict";Object.defineProperty(Le,"__esModule",{value:!0});Le.ParsingError=void 0;var _e=class extends Error{constructor(i,e){super(i),this.cause=e}};Le.ParsingError=_e;var U;function vs(){return Ts(!1)||Fl()||Cs()||Bl()||hi()}function Ss(){return K(/\s*/),Ts(!0)||Cs()||Ll()||hi()}function Rl(){let t=hi(),i=[],e,n=Ss();for(;n;){if(n.node.type==="Element"){if(e)throw new Error("Found multiple root nodes");e=n.node}n.excluded||i.push(n.node),n=Ss()}if(!e)throw new _e("Failed to parse XML","Root Element not found");if(U.xml.length!==0)throw new _e("Failed to parse XML","Not Well-Formed XML");return{declaration:t?t.node:null,root:e,children:i}}function hi(){let t=K(/^<\?([\w-:.]+)\s*/);if(!t)return;let i={name:t[1],type:"ProcessingInstruction",content:""},e=U.xml.indexOf("?>");if(e>-1)i.content=U.xml.substring(0,e).trim(),U.xml=U.xml.slice(e);else throw new _e("Failed to parse XML","ProcessingInstruction closing tag not found");return K(/\?>/),{excluded:U.options.filter(i)===!1,node:i}}function Ts(t){let i=K(/^<([^?!</>\s]+)\s*/);if(!i)return;let e={type:"Element",name:i[1],attributes:{},children:[]},n=t?!1:U.options.filter(e)===!1;for(;!(Vl()||ui(">")||ui("?>")||ui("/>"));){let o=zl();if(o)e.attributes[o.name]=o.value;else return}if(K(/^\s*\/>/))return e.children=null,{excluded:n,node:e};K(/\??>/);let a=vs();for(;a;)a.excluded||e.children.push(a.node),a=vs();if(U.options.strictMode){let o=`</${e.name}>`;if(U.xml.startsWith(o))U.xml=U.xml.slice(o.length);else throw new _e("Failed to parse XML",`Closing tag not matching "${o}"`)}else K(/^<\/[\w-:.\u00C0-\u00FF]+\s*>/);return{excluded:n,node:e}}function Ll(){let t=K(/^<!DOCTYPE\s+\S+\s+SYSTEM[^>]*>/)||K(/^<!DOCTYPE\s+\S+\s+PUBLIC[^>]*>/)||K(/^<!DOCTYPE\s+\S+\s*\[[^\]]*]>/)||K(/^<!DOCTYPE\s+\S+\s*>/);if(t){let i={type:"DocumentType",content:t[0]};return{excluded:U.options.filter(i)===!1,node:i}}}function Bl(){if(U.xml.startsWith("<![CDATA[")){let t=U.xml.indexOf("]]>");if(t>-1){let i=t+3,e={type:"CDATA",content:U.xml.substring(0,i)};return U.xml=U.xml.slice(i),{excluded:U.options.filter(e)===!1,node:e}}}}function Cs(){let t=K(/^<!--[\s\S]*?-->/);if(t){let i={type:"Comment",content:t[0]};return{excluded:U.options.filter(i)===!1,node:i}}}function Fl(){let t=K(/^([^<]+)/);if(t){let i={type:"Text",content:t[1]};return{excluded:U.options.filter(i)===!1,node:i}}}function zl(){let t=K(/([^=]+)\s*=\s*("[^"]*"|'[^']*'|[^>\s]+)\s*/);if(t)return{name:t[1].trim(),value:Hl(t[2].trim())}}function Hl(t){return t.replace(/^['"]|['"]$/g,"")}function K(t){let i=U.xml.match(t);if(i)return U.xml=U.xml.slice(i[0].length),i}function Vl(){return U.xml.length===0}function ui(t){return U.xml.indexOf(t)===0}function Is(t,i={}){t=t.trim();let e=i.filter||(()=>!0);return U={xml:t,options:Object.assign(Object.assign({},i),{filter:e,strictMode:i.strictMode===!0})},Rl()}typeof gi<"u"&&typeof Le=="object"&&(gi.exports=Is);Le.default=Is});var $s=zi((Be,xi)=>{"use strict";var Nl=Be&&Be.__importDefault||function(t){return t&&t.__esModule?t:{default:t}};Object.defineProperty(Be,"__esModule",{value:!0});var Ol=Nl(Es());function bt(t){if(!t.options.indentation&&!t.options.lineSeparator)return;t.content+=t.options.lineSeparator;let i;for(i=0;i<t.level;i++)t.content+=t.options.indentation}function Xl(t){t.content=t.content.replace(/ +$/,"");let i;for(i=0;i<t.level;i++)t.content+=t.options.indentation}function ae(t,i){t.content+=i}function As(t,i,e){if(t.type==="Element")Wl(t,i,e);else if(t.type==="ProcessingInstruction")Ds(t,i);else if(typeof t.content=="string")jl(t.content,i,e);else throw new Error("Unknown node type: "+t.type)}function jl(t,i,e){if(!e){let n=t.trim();(i.options.lineSeparator||n.length===0)&&(t=n)}t.length>0&&(!e&&i.content.length>0&&bt(i),ae(i,t))}function Gl(t,i){let e="/"+t.join("/"),n=t[t.length-1];return i.includes(n)||i.includes(e)}function Wl(t,i,e){if(i.path.push(t.name),!e&&i.content.length>0&&bt(i),ae(i,"<"+t.name),ql(i,t.attributes),t.children===null||i.options.forceSelfClosingEmptyTag&&t.children.length===0){let n=i.options.whiteSpaceAtEndOfSelfclosingTag?" />":"/>";ae(i,n)}else if(t.children.length===0)ae(i,"></"+t.name+">");else{let n=t.children;ae(i,">"),i.level++;let a=t.attributes["xml:space"]==="preserve"||e,o=!1;if(!a&&i.options.ignoredPaths&&(o=Gl(i.path,i.options.ignoredPaths),a=o),!a&&i.options.collapseContent){let s=!1,r=!1,l=!1;n.forEach(function(c,f){c.type==="Text"?(c.content.includes(`
`)?(r=!0,c.content=c.content.trim()):(f===0||f===n.length-1)&&!e&&c.content.trim().length===0&&(c.content=""),(c.content.trim().length>0||n.length===1)&&(s=!0)):c.type==="CDATA"?s=!0:l=!0}),s&&(!l||!r)&&(a=!0)}n.forEach(function(s){As(s,i,e||a)}),i.level--,!e&&!a&&bt(i),o&&Xl(i),ae(i,"</"+t.name+">")}i.path.pop()}function ql(t,i){Object.keys(i).forEach(function(e){let n=i[e].replace(/"/g,"&quot;");ae(t," "+e+'="'+n+'"')})}function Ds(t,i){i.content.length>0&&bt(i),ae(i,"<?"+t.name),ae(i," "+t.content.trim()),ae(i,"?>")}function _t(t,i={}){i.indentation="indentation"in i?i.indentation:"    ",i.collapseContent=i.collapseContent===!0,i.lineSeparator="lineSeparator"in i?i.lineSeparator:`\r
`,i.whiteSpaceAtEndOfSelfclosingTag=i.whiteSpaceAtEndOfSelfclosingTag===!0,i.throwOnFailure=i.throwOnFailure!==!1;try{let e=(0,Ol.default)(t,{filter:i.filter,strictMode:i.strictMode}),n={content:"",level:0,options:i,path:[]};return e.declaration&&Ds(e.declaration,n),e.children.forEach(function(a){As(a,n,!1)}),i.lineSeparator?n.content.replace(/\r\n/g,`
`).replace(/\n/g,i.lineSeparator):n.content}catch(e){if(i.throwOnFailure)throw e;return t}}_t.minify=(t,i={})=>_t(t,Object.assign(Object.assign({},i),{indentation:"",lineSeparator:""}));typeof xi<"u"&&typeof Be=="object"&&(xi.exports=_t);Be.default=_t});function Hi(t){document.body.addEventListener("mouseover",i=>{let n=i.target.closest("[data-tooltip], [data-tooltip-html-b64]");if(!n){t.globalTooltip.style.visibility="hidden",t.globalTooltip.style.opacity="0";return}let a=n.dataset.tooltipHtmlB64,o="";try{if(a)o=atob(a);else{let c=n.dataset.tooltip||"",f=n.dataset.iso||"";if(!c)return;o=`${c}${f?`<span class="block mt-1 font-medium text-emerald-300">${f}</span>`:""}`}}catch(c){console.error("Failed to decode or process tooltip content:",c),o='<span class="text-red-400">Tooltip Error</span>'}if(!o.trim()){t.globalTooltip.style.visibility="hidden",t.globalTooltip.style.opacity="0";return}t.globalTooltip.innerHTML=o;let s=n.getBoundingClientRect(),r=t.globalTooltip.getBoundingClientRect(),l=s.left+s.width/2-r.width/2;l<10&&(l=10),l+r.width>window.innerWidth-10&&(l=window.innerWidth-r.width-10),t.globalTooltip.style.left=`${l}px`,t.globalTooltip.style.top=`${s.top-r.height-8}px`,t.globalTooltip.style.visibility="visible",t.globalTooltip.style.opacity="1"}),document.body.addEventListener("mouseout",i=>{let e=i.target,n=i.relatedTarget,a=e.closest("[data-tooltip], [data-tooltip-html-b64]");a&&!a.contains(n)&&(t.globalTooltip.style.visibility="hidden",t.globalTooltip.style.opacity="0")})}H();E();D();var nn=[{name:"[DASH-IF] Big Buck Bunny, onDemand",url:"https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd",protocol:"dash",type:"vod",source:"dashif.org"},{name:"[DASH-IF] SegmentBase, onDemand",url:"https://dash.akamaized.net/dash264/TestCases/1a/sony/SNE_DASH_SD_CASE1A_REVISED.mpd",protocol:"dash",type:"vod",source:"dashif.org"},{name:"[DASH-IF] Multi-period, 2 periods",url:"https://dash.akamaized.net/dash264/TestCases/5a/nomor/1.mpd",protocol:"dash",type:"vod",source:"dashif.org"},{name:"[DASH-IF] Envivio, SegmentTemplate/Number",url:"https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd",protocol:"dash",type:"vod",source:"dashif.org"},{name:"[Axinom] H.264, CMAF, Clear",url:"https://media.axprod.net/TestVectors/v7-Clear/Manifest.mpd",protocol:"dash",type:"vod",source:"Axinom"},{name:"[Axinom] Multi-key, Widevine/PlayReady DRM",url:"https://media.axprod.net/TestVectors/v7-MultiDRM-MultiKey/Manifest.mpd",protocol:"dash",type:"vod",source:"Axinom"},{name:"[DASH-IF] Live Sim (SegmentTemplate)",url:"https://livesim.dashif.org/livesim/testpic_2s/Manifest.mpd",protocol:"dash",type:"live",source:"dashif.org"},{name:"[DASH-IF] Live Sim (SegmentTimeline)",url:"https://livesim.dashif.org/livesim/segtimeline_1/testpic_2s/Manifest.mpd",protocol:"dash",type:"live",source:"dashif.org"},{name:"[DASH-IF] Live Sim (SCTE-35 Events)",url:"https://livesim.dashif.org/livesim/scte35_2/testpic_2s/Manifest.mpd",protocol:"dash",type:"live",source:"dashif.org"},{name:"[DASH-IF] Live Sim (Low-Latency Chunked)",url:"https://livesim.dashif.org/livesim-chunked/testpic_2s/Manifest.mpd",protocol:"dash",type:"live",source:"dashif.org"},{name:"[AWS] Live w/ Ad Breaks",url:"https://d2qohgpffhaffh.cloudfront.net/HLS/vanlife/withad/sdr_wide/master.mpd",protocol:"dash",type:"live",source:"AWS"},{name:"[Unified Streaming] Live w/ SCTE-35 markers",url:"https://demo.unified-streaming.com/k8s/live/scte35.isml/.mpd",protocol:"dash",type:"live",source:"Unified Streaming"},{name:"[HLS.js] Big Buck Bunny, Adaptive",url:"https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",protocol:"hls",type:"vod",source:"hls.js"},{name:"[HLS.js] Big Buck Bunny, 480p",url:"https://test-streams.mux.dev/x36xhzz/url_6/193039199_mp4_h264_aac_hq_7.m3u8",protocol:"hls",type:"vod",source:"hls.js"},{name:"[HLS.js] fMP4, Multiple Audio Tracks",url:"https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8",protocol:"hls",type:"vod",source:"hls.js"},{name:"[HLS.js] AES-128 Encrypted",url:"https://playertest.longtailvideo.com/adaptive/oceans_aes/oceans_aes.m3u8",protocol:"hls",type:"vod",source:"hls.js"},{name:"[HLS.js] AES-128 Encrypted, TS main with AAC",url:"https://playertest.longtailvideo.com/adaptive/aes-with-tracks/master.m3u8",protocol:"hls",type:"vod",source:"hls.js"},{name:"[HLS.js] Ad-insertion in Event Stream",url:"https://test-streams.mux.dev/dai-discontinuity-deltatre/manifest.m3u8",protocol:"hls",type:"vod",source:"hls.js"},{name:"[HLS.js] Subtitles/Captions",url:"https://playertest.longtailvideo.com/adaptive/captions/playlist.m3u8",protocol:"hls",type:"vod",source:"hls.js"},{name:"[HLS.js] ARTE China, ABR",url:"https://test-streams.mux.dev/test_001/stream.m3u8",protocol:"hls",type:"vod",source:"hls.js"},{name:"[HLS.js] MP3 VOD",url:"https://playertest.longtailvideo.com/adaptive/vod-with-mp3/manifest.m3u8",protocol:"hls",type:"vod",source:"hls.js"},{name:"[HLS.js] DK Turntable, PTS shifted",url:"https://test-streams.mux.dev/pts_shift/master.m3u8",protocol:"hls",type:"vod",source:"hls.js"},{name:"[Apple] Bip-Bop, Advanced HEVC+AVC",url:"https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8",protocol:"hls",type:"vod",source:"Apple"},{name:"[JW Player] FDR, CDN packaged",url:"https://cdn.jwplayer.com/manifests/pZxWPRg4.m3u8",protocol:"hls",type:"vod",source:"JW Player"},{name:"[Bitmovin] fMP4",url:"https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s-fmp4/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8",protocol:"hls",type:"vod",source:"Bitmovin"},{name:"[Shaka] Angel One, Widevine DRM (fMP4)",url:"https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine-hls/hls.m3u8",protocol:"hls",type:"vod",source:"Shaka"},{name:"[Wowza] Elephant's Dream, Alt Audio + VTT",url:"https://playertest.longtailvideo.com/adaptive/elephants_dream_v4/index.m3u8",protocol:"hls",type:"vod",source:"Wowza"},{name:"[Mux] Low-Latency HLS (fMP4)",url:"https://stream.mux.com/v69RSHhFelSm4701snP22dYz2jICy4E4FUyk02rW4gxRM.m3u8",protocol:"hls",type:"live",source:"Mux"},{name:"[Unified Streaming] Tears of Steel",url:"https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",protocol:"hls",type:"live",source:"Unified Streaming"}];H();var Ot;function an(t){Ot=t.toastContainer,x.subscribe("ui:show-status",W)}function W({message:t,type:i,duration:e=4e3}){if(!Ot)return;let n=document.createElement("div"),a={pass:"bg-green-600 border-green-500",fail:"bg-red-600 border-red-500",warn:"bg-yellow-600 border-yellow-500",info:"bg-blue-600 border-blue-500"};n.className=`p-4 rounded-lg border text-white shadow-lg transition-all duration-300 ease-in-out transform translate-x-full opacity-0 ${a[i]}`,n.textContent=t,Ot.appendChild(n),setTimeout(()=>{n.classList.remove("translate-x-full","opacity-0")},10),setTimeout(()=>{n.classList.add("opacity-0","translate-x-8"),n.addEventListener("transitionend",()=>n.remove())},e)}var Xt="stream-analyzer_history",jt="stream-analyzer_presets",rn="stream-analyzer_last-used",on=10,sn=50,ln=new Worker("/dist/worker.js",{type:"module"}),il=0,Ee=new Map;ln.onmessage=t=>{let{type:i,payload:e}=t.data;if(i==="manifest-metadata-result"){let{id:n,metadata:a,error:o}=e;if(Ee.has(n)){let{resolve:s,reject:r}=Ee.get(n);o?r(new Error(o)):s(a),Ee.delete(n)}}};function Gt(t){try{return JSON.parse(localStorage.getItem(t)||"[]")}catch(i){return console.error(`Error reading from localStorage key "${t}":`,i),[]}}function Ge(t,i){try{localStorage.setItem(t,JSON.stringify(i))}catch(e){console.error(`Error writing to localStorage key "${t}":`,e)}}var We=()=>Gt(Xt),Ae=()=>Gt(jt),dn=()=>Gt(rn),cn=t=>Ge(rn,t);function fn(t){if(!t||!t.originalUrl)return;let i=We();if(Ae().some(o=>o.url===t.originalUrl))return;let a=i.filter(o=>o.url!==t.originalUrl);a.unshift({name:t.name,url:t.originalUrl,protocol:t.protocol,type:t.manifest?.type==="dynamic"?"live":"vod"}),a.length>on&&(a.length=on),Ge(Xt,a)}function at({name:t,url:i,protocol:e,type:n}){let o=Ae().filter(s=>s.url!==i);o.unshift({name:t,url:i,protocol:e,type:n}),o.length>sn&&(o.length=sn),Ge(jt,o),W({message:`Preset "${t}" saved!`,type:"pass"})}function pn(t){let e=We().filter(n=>n.url!==t);Ge(Xt,e)}function mn(t){let e=Ae().filter(n=>n.url!==t);Ge(jt,e)}async function un(t){W({message:"Fetching stream metadata...",type:"info"});try{let i=await fetch(t);if(!i.ok)throw new Error(`HTTP ${i.status} fetching manifest`);let e=await i.text();return new Promise((n,a)=>{let o=il++;Ee.set(o,{resolve:n,reject:a}),ln.postMessage({type:"get-manifest-metadata",payload:{id:o,manifestString:e}}),setTimeout(()=>{Ee.has(o)&&(a(new Error("Metadata request timed out.")),Ee.delete(o))},5e3)})}catch(i){throw W({message:`Error: ${i.message}`,type:"fail"}),i}}var nl;function hn(t){nl=t}var ot=(t,i)=>t?d`<span
        class="text-xs font-semibold px-2 py-0.5 rounded-full ${i}"
        >${t.toUpperCase()}</span
    >`:"",al=t=>{let i=t.currentTarget,e=i.closest(".stream-input-group"),n=e.querySelector(".input-url");i.dataset.url&&(n.value=i.dataset.url,e.querySelector(".input-name").value=i.dataset.name||"",e.querySelector(".input-file").value="",n.dispatchEvent(new Event("input",{bubbles:!0})));let a=e.querySelector(".preset-dropdown");a&&a.classList.add("hidden")},xn=(t,i,e)=>{let n=t.protocol==="dash"?ot("DASH","bg-blue-800 text-blue-200"):t.protocol==="hls"?ot("HLS","bg-purple-800 text-purple-200"):"",a=t.type==="live"?ot("LIVE","bg-red-800 text-red-200"):t.type==="vod"?ot("VOD","bg-green-800 text-green-200"):"",o=s=>{if(s.preventDefault(),s.stopPropagation(),confirm(`Are you sure you want to delete "${t.name}"?`)){i?mn(t.url):pn(t.url);let r=s.target.closest(".stream-input-group");if(r){let l=We(),c=Ae(),f=parseInt(r.dataset.id,10),m=_.getState().streamInputIds.indexOf(parseInt(r.dataset.id,10))===0,u=yn(f,m,l,c),p=document.createElement("div");document.body.appendChild(p),F(u,p);let h=p.querySelector(".stream-input-group");r.parentElement.replaceChild(h,r),document.body.removeChild(p)}}};return d`<li
        class="group px-3 py-2 hover:bg-gray-700 cursor-pointer flex justify-between items-center"
        data-url="${t.url}"
        data-name="${t.name}"
        @click=${al}
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
        <div class="flex-shrink-0 flex items-center gap-2 ml-4">
            ${n} ${a}
            <button
                @click=${o}
                class="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-800 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete item"
            >
                <span class="text-xl">&times;</span>
            </button>
        </div>
    </li>`},gn=(t,i,e=!1,n)=>!i||i.length===0?"":d`<div>
        <h4
            class="font-bold text-gray-200 text-xs tracking-wider uppercase px-3 pt-3 pb-2 sticky top-0 bg-gray-900 z-10 border-b border-gray-800/50"
        >
            ${t}
        </h4>
        <ul class="divide-y divide-gray-700/50">
            ${i.map(a=>xn(a,e,n))}
        </ul>
    </div>`,ol=(t,i,e)=>!i||i.length===0?"":d`<div>
        <h5 class="font-medium text-gray-400 px-3 pt-2 pb-1">${t}</h5>
        <ul class="divide-y divide-gray-700/50">
            ${i.map(n=>xn(n,!1,e))}
        </ul>
    </div>`,sl=t=>{let i=t.target,e=i.closest(".stream-input-group");if(i.files[0]){e.querySelector(".input-url").value="";let n=e.querySelector(".preset-dropdown");n&&n.classList.add("hidden")}},rl=async t=>{let i=t.target,e=i.closest(".stream-input-group"),n=e.querySelector(".input-name"),a=e.querySelector(".input-url"),o=n.value.trim(),s=a.value.trim();if(!o||!s){W({message:"Please provide both a URL and a custom name to save a preset.",type:"warn"});return}i.disabled=!0,i.textContent="Saving...";try{let{protocol:r,type:l}=await un(s);at({name:o,url:s,protocol:r,type:l}),n.value="",i.textContent="Saved!"}catch(r){console.error("Failed to save preset:",r),i.textContent="Save as Preset",i.disabled=!1}},yn=(t,i,e,n)=>{let{streamInputIds:a}=_.getState(),o=new Set(n.map(h=>h.url)),s=nn.reduce((h,y)=>{let{protocol:b,type:C}=y;return h[b]||(h[b]={}),h[b][C]||(h[b][C]=[]),h[b][C].push(y),h},{dash:{},hls:{}}),r=h=>{let y=h.target.closest(".stream-input-group");if(y){let b=parseInt(y.dataset.id);I.removeStreamInputId(b)}},l=h=>{let y=h.target,C=y.closest(".stream-input-group").querySelector(".save-preset-btn"),S=y.value.trim();C.disabled=o.has(S)||S==="",C.textContent="Save as Preset"},c=(h,y)=>{let b=h.querySelector(".preset-dropdown");b&&b.classList.toggle("hidden",!y)},f=h=>{c(h.currentTarget.closest(".stream-input-group"),!0)},m,u=h=>{let y=h.currentTarget.closest(".stream-input-group");m=setTimeout(()=>{c(y,!1)},150)},p=()=>clearTimeout(m);return d`<div
        data-testid="stream-input-group"
        class="stream-input-group ${i?"":"border-t border-gray-700 pt-6 mt-6"}"
        data-id="${t}"
    >
        <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold text-gray-300">
                Stream ${a.indexOf(t)+1}
            </h3>
            ${i?"":d`<button
                      class="remove-stream-btn text-red-400 hover:text-red-600 font-bold text-sm"
                      @click=${r}
                  >
                      &times; Remove
                  </button>`}
        </div>
        <div class="space-y-4">
            <div
                class="relative"
                @focusin=${f}
                @focusout=${u}
            >
                <div class="flex flex-col md:flex-row items-center gap-4">
                    <input
                        type="url"
                        id="url-${t}"
                        class="input-url w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter Manifest URL or click to see presets..."
                        .value=${i&&e.length>0?e[0].url:""}
                        @input=${l}
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
                        @change=${sl}
                    />
                </div>
                <div
                    class="preset-dropdown hidden absolute top-full left-0 right-0 mt-2 z-30 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto"
                    @focusin=${p}
                >
                    ${gn("Saved",n,!0,n)}
                    ${gn("Recent",e,!1,n)}
                    <div>
                        <h4
                            class="font-bold text-gray-200 text-xs tracking-wider uppercase px-3 pt-3 pb-2 sticky top-0 bg-gray-900 z-10 border-b border-gray-800/50"
                        >
                            Examples
                        </h4>
                        <div class="p-2">
                            ${Object.entries(s).map(([h,y])=>d`
                                    <div class="mt-2">
                                        <h5
                                            class="font-semibold text-gray-300 text-sm px-3 py-2 bg-gray-900/50 rounded-t-md"
                                        >
                                            ${h.toUpperCase()}
                                        </h5>
                                        <div
                                            class="border border-t-0 border-gray-700/50 rounded-b-md"
                                        >
                                            ${Object.entries(y).map(([b,C])=>ol(`${b.charAt(0).toUpperCase()}${b.slice(1)}`,C,n))}
                                        </div>
                                    </div>
                                `)}
                        </div>
                    </div>
                </div>
            </div>
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
                    @click=${rl}
                    ?disabled=${o.has(i&&e.length>0?e[0].url:"")}
                >
                    Save as Preset
                </button>
            </div>
        </div>
    </div>`};function bn(){let{streamInputIds:t}=_.getState(),i=We(),e=Ae();return d`${t.map((n,a)=>yn(n,a===0,i,e))}`}function _n(){I.addStreamInputId()}E();E();D();H();function ll(t){let i=t.target,e=i.value;if(i.checked){if(_.getState().segmentsForCompare.length>=2){i.checked=!1;return}I.addSegmentToCompare(e)}else I.removeSegmentFromCompare(e)}var dl=t=>{if(!t)return d`<div
            class="flex-shrink-0 w-2.5 h-2.5 rounded-sm border border-gray-500 bg-gray-800"
            title="Status: Not Loaded"
        ></div>`;if(t.status===-1)return d`<div
            class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-gray-500 animate-pulse"
            title="Status: Pending"
        ></div>`;if(t.status!==200){let i=t.status===0?"Network Error":`HTTP ${t.status}`;return d`<div
            class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-red-500"
            title="Status: ${i}"
        ></div>`}return d`<div
        class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-green-500"
        title="Status: Loaded OK"
    ></div>`},cl=t=>t===null?"":t?d`<div
            class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-cyan-400"
            title="Fresh: Segment is in the latest playlist"
        ></div>`:d`<div
        class="flex-shrink-0 w-2.5 h-2.5 rounded-sm bg-gray-600"
        title="Stale: Segment is no longer in the latest playlist"
    ></div>`,fl=(t,i,e)=>{if(i.gap)return d`<span class="text-xs text-gray-500 italic font-semibold"
            >GAP Segment</span
        >`;let n=s=>{let r=s.currentTarget.dataset.url;x.dispatch("ui:request-segment-analysis",{url:r})},a=s=>{let r=s.currentTarget.dataset.url;I.setActiveSegmentUrl(r),document.querySelector('[data-tab="interactive-segment"]')?.click()},o=()=>{x.dispatch("segment:fetch",{url:i.resolvedUrl})};return t?t.status===-1?d`<button
            disabled
            class="text-xs bg-gray-600 px-2 py-1 rounded opacity-50 cursor-wait"
        >
            Loading...
        </button>`:t.status!==200?e!==!1?d`<button
                  @click=${o}
                  class="text-xs bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded"
              >
                  Reload
              </button>`:d`<span class="text-xs text-gray-500 italic"
                  >Stale Error</span
              >`:d`
        <button
            class="text-xs bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded"
            data-url="${i.resolvedUrl}"
            @click=${a}
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
    `:d`<button
            @click=${o}
            class="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
        >
            Load
        </button>`},st=(t,i)=>{let{segmentCache:e,segmentsForCompare:n}=_.getState(),a=e.get(t.resolvedUrl),o=n.includes(t.resolvedUrl),s="hover:bg-gray-800/80 transition-colors duration-200";t.gap&&(s="bg-gray-800/50 text-gray-600 italic");let r=t.type==="Media"&&!t.gap?d`${(t.time/t.timescale).toFixed(2)}s
              (+${(t.duration/t.timescale).toFixed(2)}s)`:"N/A",l=t.startTimeUTC?`data-start-time=${t.startTimeUTC}`:"",c=t.endTimeUTC?`data-end-time=${t.endTimeUTC}`:"";return d`
        <tr
            class="segment-row ${s}"
            data-url="${t.resolvedUrl}"
            ${l}
            ${c}
        >
            <td class="px-3 py-1.5">
                <input
                    type="checkbox"
                    class="bg-gray-700 border-gray-500 rounded focus:ring-blue-500 disabled:opacity-50"
                    .value=${t.resolvedUrl}
                    ?checked=${o}
                    ?disabled=${t.gap}
                    @change=${ll}
                />
            </td>
            <td class="px-3 py-1.5">
                <div class="flex items-center space-x-2">
                    ${t.gap?"":dl(a)}
                    ${cl(i)}
                    <div>
                        <span>${t.type==="Init"?"Init":"Media"}</span
                        ><span class="block text-xs text-gray-500"
                            >#${t.number}</span
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
                        class="font-mono ${t.gap?"":"text-cyan-400"} truncate"
                        title="${t.resolvedUrl}"
                        >${t.template||"GAP"}</span
                    >
                    <div class="flex items-center space-x-2 flex-shrink-0 ml-4">
                        ${fl(a,t,i)}
                    </div>
                </div>
            </td>
        </tr>
    `};H();var rt=null;function Sn(t,i){De(),rt=setInterval(()=>{if(!t||t.offsetParent===null){De();return}let n=Date.now(),a="bg-green-700/50",o="text-gray-500",s="opacity-50";t.querySelectorAll("tr.segment-row").forEach(l=>{let c=l,f=parseInt(c.dataset.startTime,10),m=parseInt(c.dataset.endTime,10);c.classList.remove(a,o,s),!(!f||!m)&&(n>=f&&n<m?c.classList.add(a):n>m+3e4&&c.classList.add(o,s))})},1e3)}function De(){rt&&(clearInterval(rt),rt=null)}var pl=(t,i)=>{if(t.manifest.type!=="dynamic"||i.length===0)return"";let e=i.reduce((r,l)=>r+l.duration/l.timescale,0);if(e<=0)return"";let n=e,a=t.manifest.summary.lowLatency?.partHoldBack,o,s;return a!=null?(o=a/e*100,s=`Live Edge (Target: ${a.toFixed(2)}s behind edge)`):(o=0,s="Live Edge"),d`<div
        class="absolute top-0 bottom-0 right-0 w-0.5 bg-red-500 rounded-full z-20"
        style="right: ${o}%;"
        title="${s}"
    >
        <div
            class="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-red-500 animate-ping"
        ></div>
    </div>`},vn=(t,i,e)=>{let n=t.hlsVariantState.get(e);if(!n)return d``;let{segments:a,error:o,isLoading:s,isExpanded:r,displayMode:l,isPolling:c,freshSegmentUrls:f}=n,m=0,u=0,p=(Array.isArray(a)?a:[]).map((v,w)=>{v.dateTime&&(m=new Date(v.dateTime).getTime(),u=0);let P=m+u*1e3,A=P+v.duration*1e3,B=u;return u+=v.duration,{repId:"hls-media",type:v.type||"Media",number:(t.manifest.mediaSequence||0)+w,resolvedUrl:v.resolvedUrl,template:v.uri,time:B*9e4,duration:v.duration*9e4,timescale:9e4,gap:v.gap||!1,startTimeUTC:P||0,endTimeUTC:A||0}}),h=l==="last10"?p.slice(-10):p,y=v=>{v.preventDefault(),x.dispatch("hls-explorer:toggle-variant",{streamId:t.id,variantUri:e})},b=v=>{v.stopPropagation(),x.dispatch("hls-explorer:toggle-polling",{streamId:t.id,variantUri:e})},C=v=>{v.stopPropagation(),x.dispatch("hls-explorer:set-display-mode",{streamId:t.id,variantUri:e,mode:l==="all"?"last10":"all"})},S;return s?S=d`<div class="p-4 text-center text-gray-400">
            Loading segments...
        </div>`:o?S=d`<div class="p-4 text-red-400">Error: ${o}</div>`:p.length===0&&r?S=d`<div class="p-4 text-center text-gray-400">
            No segments found in this playlist.
        </div>`:r&&(S=d` <div class="overflow-y-auto relative max-h-[70vh]">
            ${pl(t,h)}
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
                    ${h.map(v=>st(v,f.has(v.resolvedUrl)))}
                </tbody>
            </table>
        </div>`),d`
        <style>
            details > summary {
                list-style: none;
            }
            details > summary::-webkit-details-marker {
                display: none;
            }
            details[open] .chevron {
                transform: rotate(90deg);
            }
        </style>
        <details
            class="bg-gray-800 rounded-lg border border-gray-700"
            ?open=${r}
        >
            <summary
                @click=${y}
                class="flex items-center p-2 bg-gray-900/50 cursor-pointer list-none"
            >
                <div class="flex-grow font-semibold text-gray-200">
                    ${i.title}
                </div>
                <svg
                    class="chevron w-5 h-5 text-gray-400 transition-transform duration-200"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fill-rule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clip-rule="evenodd"
                    />
                </svg>
            </summary>
            ${r?d`
                      <div class="p-2 border-t border-gray-700">
                          <div class="flex items-center gap-4 p-2">
                              ${t.manifest.type==="dynamic"?d`
                                        <button
                                            @click=${b}
                                            class="text-xs px-3 py-1 rounded ${c?"bg-red-600 hover:bg-red-700":"bg-blue-600 hover:bg-blue-700"}"
                                        >
                                            ${c?"Stop Polling":"Start Polling"}
                                        </button>
                                    `:""}
                              <button
                                  @click=${C}
                                  class="text-xs px-3 py-1 rounded bg-gray-600 hover:bg-gray-700"
                              >
                                  Show
                                  ${l==="all"?"Last 10":"All"}
                              </button>
                          </div>
                          ${S}
                      </div>
                  `:""}
        </details>
    `};function Tn(t){if(t.manifest.isMaster){let i=(t.manifest.variants||[]).map((e,n)=>({...e,title:`Variant Stream ${n+1} (BW: ${(e.attributes.BANDWIDTH/1e3).toFixed(0)}k)`}));return d`<div class="space-y-1">
            ${i.map(e=>vn(t,e,e.resolvedUri))}
        </div>`}else{let i={title:"Media Playlist Segments",uri:null,resolvedUri:t.originalUrl};return vn(t,i,i.resolvedUri)}}D();H();var ee;function qe(t="Processing..."){!ee||!ee.globalLoader||!ee.loaderMessage||(ee.loaderMessage.textContent=t,ee.globalLoader.classList.remove("hidden"),ee.globalLoader.classList.add("flex"))}function fe(){!ee||!ee.globalLoader||(ee.globalLoader.classList.add("hidden"),ee.globalLoader.classList.remove("flex"))}function Cn(t){ee=t,x.subscribe("analysis:started",()=>qe("Analyzing streams...")),x.subscribe("analysis:complete",fe),x.subscribe("analysis:failed",fe),x.subscribe("analysis:error",fe),x.subscribe("segment:pending",()=>qe("Loading segment...")),x.subscribe("segment:loaded",fe),x.subscribe("hls:media-playlist-fetch-request",()=>qe("Fetching media playlist...")),x.subscribe("hls-media-playlist-fetched",fe),x.subscribe("hls-media-playlist-error",fe)}var Yt,Ye=null;function Pn(t){Yt=t,Yt.tabs.addEventListener("click",ul),_.subscribe((i,e)=>{i.activeTab!==e.activeTab&&$n(i.activeTab)}),$n(_.getState().activeTab)}function $n(t){let i=["border-blue-600","text-gray-100","bg-gray-700"],e=["border-transparent"];Yt.tabs.querySelectorAll("[data-tab]").forEach(n=>{n.dataset.tab===t?(n.classList.add(...i),n.classList.remove(...e)):(n.classList.remove(...i),n.classList.add(...e))})}async function ul(t){let e=t.target.closest("[data-tab]");e&&_.getState().activeTab!==e.dataset.tab&&(qe("Loading view..."),setTimeout(async()=>{Ye&&(document.removeEventListener("keydown",Ye),Ye=null),De();let n=e.dataset.tab;if(I.setActiveTab(n),n==="updates"){let{navigateManifestUpdates:a}=await Promise.resolve().then(()=>(dt(),Dn));Ye=o=>{o.key==="ArrowRight"&&a(1),o.key==="ArrowLeft"&&a(-1)},document.addEventListener("keydown",Ye)}},0))}E();D();D();function Jt({title:t,url:i,contentTemplate:e}){I.setModalState({isModalOpen:!0,modalTitle:t,modalUrl:i,modalContentTemplate:e})}function Qt(){I.setModalState({isModalOpen:!1,modalTitle:"",modalUrl:"",modalContentTemplate:null})}var Y;function wn(){if(!Y)return;let{modalState:t}=_.getState(),i=Y.segmentModal.querySelector("div");t.isModalOpen?(Y.modalTitle.textContent=t.modalTitle,Y.modalSegmentUrl.textContent=t.modalUrl,F(t.modalContentTemplate,Y.modalContentArea),Y.segmentModal.classList.remove("opacity-0","invisible"),Y.segmentModal.classList.add("opacity-100","visible"),i.classList.remove("scale-95"),i.classList.add("scale-100")):(Y.segmentModal.classList.add("opacity-0","invisible"),Y.segmentModal.classList.remove("opacity-100","visible"),i.classList.add("scale-95"),i.classList.remove("scale-100"))}function Un(t){Y=t,Y.closeModalBtn.addEventListener("click",Qt),Y.segmentModal.addEventListener("click",i=>{i.target===Y.segmentModal&&Qt()}),_.subscribe((i,e)=>{i.modalState!==e.modalState&&wn()}),wn()}H();D();var se=new Map,$e=null,Mn=new Worker("/dist/worker.js",{type:"module"});Mn.onmessage=t=>{let{type:i,payload:e}=t.data;if(i==="live-update-parsed"){let{streamId:n,newManifestObject:a,finalManifestString:o,oldRawManifest:s,complianceResults:r,serializedManifest:l}=e;x.dispatch("livestream:manifest-updated",{streamId:n,newManifestString:o,newManifestObject:a,oldManifestString:s,complianceResults:r,serializedManifest:l})}else i==="live-update-error"&&console.error(`[LiveStreamMonitor] Worker failed to parse update for stream ${e.streamId}:`,e.error)};async function kn(t){let i=_.getState().streams.find(e=>e.id===t);if(!i||!i.originalUrl){ei(t);return}try{let e=await fetch(i.originalUrl);if(!e.ok)return;let n=await e.text();if(n===i.rawManifest)return;Mn.postMessage({type:"parse-live-update",payload:{streamId:i.id,newManifestString:n,oldRawManifest:i.rawManifest,protocol:i.protocol,baseUrl:i.baseUrl,hlsDefinedVariables:i.hlsDefinedVariables,oldManifestObjectForDelta:i.manifest?.serializedManifest}})}catch(e){console.error(`[LiveStreamMonitor] Error fetching update for stream ${i.id}:`,e)}}function gl(t){if(!se.has(t.id)&&t.manifest?.type==="dynamic"&&t.originalUrl){let i=t.manifest.minimumUpdatePeriod||t.manifest.minBufferTime||2,e=Math.max(i*1e3,2e3),n=setInterval(()=>kn(t.id),e);se.set(t.id,n)}}function ei(t){se.has(t)&&(clearInterval(se.get(t)),se.delete(t))}function Zt(){let t=_.getState().streams.filter(i=>i.manifest?.type==="dynamic");t.forEach(i=>{let e=se.has(i.id);i.isPolling&&!e?gl(i):!i.isPolling&&e&&ei(i.id)});for(let i of se.keys())t.some(e=>e.id===i)||ei(i)}function Rn(){$e&&clearInterval($e),$e=setInterval(Zt,1e3),x.subscribe("state:stream-updated",Zt),x.subscribe("state:analysis-complete",Zt),x.subscribe("manifest:force-reload",({streamId:t})=>kn(t))}function Ln(){$e&&(clearInterval($e),$e=null);for(let t of se.values())clearInterval(t);se.clear()}E();H();D();E();E();var k="cursor-help border-b border-dotted border-blue-500/40 transition-colors hover:bg-blue-500/15 hover:border-solid";var g=class{constructor(i,e){this.box=i,this.view=e,this.offset=i.headerSize,this.stopped=!1}addIssue(i,e){this.box.issues||(this.box.issues=[]),this.box.issues.push({type:i,message:e})}checkBounds(i){return this.stopped?!1:this.offset+i>this.view.byteLength?(this.addIssue("error",`Read attempt for ${i} bytes at offset ${this.offset} would exceed box '${this.box.type}' size of ${this.view.byteLength}. The box is truncated.`),this.stopped=!0,!1):!0}readUint32(i){if(!this.checkBounds(4))return null;let e=this.view.getUint32(this.offset);return this.box.details[i]={value:e,offset:this.box.offset+this.offset,length:4},this.offset+=4,e}readBigUint64(i){if(!this.checkBounds(8))return null;let e=this.view.getBigUint64(this.offset);return this.box.details[i]={value:Number(e),offset:this.box.offset+this.offset,length:8},this.offset+=8,e}readBigInt64(i){if(!this.checkBounds(8))return null;let e=this.view.getBigInt64(this.offset);return this.box.details[i]={value:Number(e),offset:this.box.offset+this.offset,length:8},this.offset+=8,e}readUint8(i){if(!this.checkBounds(1))return null;let e=this.view.getUint8(this.offset);return this.box.details[i]={value:e,offset:this.box.offset+this.offset,length:1},this.offset+=1,e}readUint16(i){if(!this.checkBounds(2))return null;let e=this.view.getUint16(this.offset);return this.box.details[i]={value:e,offset:this.box.offset+this.offset,length:2},this.offset+=2,e}readInt16(i){if(!this.checkBounds(2))return null;let e=this.view.getInt16(this.offset);return this.box.details[i]={value:e,offset:this.box.offset+this.offset,length:2},this.offset+=2,e}readInt32(i){if(!this.checkBounds(4))return null;let e=this.view.getInt32(this.offset);return this.box.details[i]={value:e,offset:this.box.offset+this.offset,length:4},this.offset+=4,e}readString(i,e){if(!this.checkBounds(i))return null;let n=new Uint8Array(this.view.buffer,this.view.byteOffset+this.offset,i),a=String.fromCharCode(...n);return this.box.details[e]={value:a,offset:this.box.offset+this.offset,length:i},this.offset+=i,a}readNullTerminatedString(i){if(this.stopped)return null;let e=this.offset,n=e;for(;n<this.view.byteLength&&this.view.getUint8(n)!==0;)n++;let a=new Uint8Array(this.view.buffer,this.view.byteOffset+e,n-e),o=new TextDecoder("utf-8").decode(a),s=n-e+1;return this.box.details[i]={value:o,offset:this.box.offset+e,length:s},this.offset+=s,o}readVersionAndFlags(){if(!this.checkBounds(4))return{version:null,flags:null};let i=this.view.getUint32(this.offset),e=i>>24,n=i&16777215;return this.box.details.version={value:e,offset:this.box.offset+this.offset,length:1},this.box.details.flags={value:`0x${n.toString(16).padStart(6,"0")}`,offset:this.box.offset+this.offset,length:4},this.offset+=4,{version:e,flags:n}}readRemainingBytes(i){if(this.stopped)return;let e=this.view.byteLength-this.offset;e>0&&(this.box.details[i]={value:`... ${e} bytes of data ...`,offset:this.box.offset+this.offset,length:e},this.offset+=e)}skip(i,e="reserved"){this.checkBounds(i)&&(this.box.details[e]={value:`${i} bytes`,offset:this.box.offset+this.offset,length:i},this.offset+=i)}finalize(){if(this.stopped)return;let i=this.view.byteLength-this.offset;i>0&&this.addIssue("warn",`${i} extra unparsed bytes found at the end of box '${this.box.type}'.`)}};function ti(t,i){let e=new g(t,i);e.readString(4,"majorBrand"),e.readUint32("minorVersion");let n=[],a=[],o=e.offset;for(;e.offset<t.size&&!e.stopped;){let s=e.readString(4,`brand_${n.length}`);if(s===null)break;n.push(s),s.startsWith("cmf")&&a.push(s),delete t.details[`brand_${n.length-1}`]}n.length>0&&(t.details.compatibleBrands={value:n.join(", "),offset:t.offset+o,length:e.offset-o}),a.length>0&&(t.details.cmafBrands={value:a.join(", "),offset:0,length:0}),e.finalize()}var Bn={ftyp:{name:"File Type",text:"File Type Box: declares the major brand, minor version, and compatible brands for the file.",ref:"ISO/IEC 14496-12:2022, Section 4.3"},"ftyp@majorBrand":{text:"The major brand of the file, indicating its primary specification.",ref:"ISO/IEC 14496-12:2022, Section 4.3"},"ftyp@minorVersion":{text:"The minor version of the major brand.",ref:"ISO/IEC 14496-12:2022, Section 4.3"},"ftyp@compatibleBrands":{text:"Other brands that the file is compatible with.",ref:"ISO/IEC 14496-12:2022, Section 4.3"},"ftyp@cmafBrands":{text:"A list of CMAF-specific structural or media profile brands detected in this box.",ref:"ISO/IEC 23000-19:2020(E), Clause 7.2"},styp:{name:"Segment Type",text:"Declares the segment's brand and compatibility.",ref:"ISO/IEC 14496-12, 8.16.2"},"styp@majorBrand":{text:"The 'best use' specification for the segment.",ref:"ISO/IEC 14496-12, 4.3.3"},"styp@minorVersion":{text:"An informative integer for the minor version of the major brand.",ref:"ISO/IEC 14496-12, 4.3.3"},"styp@compatibleBrands":{text:"A list of other specifications to which the segment complies.",ref:"ISO/IEC 14496-12, 4.3.3"}};function Fn(t,i){let e=new g(t,i),{version:n}=e.readVersionAndFlags();n===1?(e.readBigUint64("creation_time"),e.readBigUint64("modification_time"),e.readUint32("timescale"),e.readBigUint64("duration")):(e.readUint32("creation_time"),e.readUint32("modification_time"),e.readUint32("timescale"),e.readUint32("duration")),e.readInt32("rate"),e.readInt16("volume"),e.skip(10,"reserved");let a=[];for(let o=0;o<9;o++)a.push(e.readInt32(`matrix_val_${o}`));t.details.matrix={value:`[${a.join(", ")}]`,offset:t.details.matrix_val_0.offset,length:36};for(let o=0;o<9;o++)delete t.details[`matrix_val_${o}`];e.skip(24,"pre_defined"),e.readUint32("next_track_ID")}var zn={mvhd:{name:"Movie Header",text:"Contains global information for the presentation (timescale, duration).",ref:"ISO/IEC 14496-12, 8.2.2"},"mvhd@version":{text:"Version of this box (0 or 1). Affects the size of time and duration fields.",ref:"ISO/IEC 14496-12, 8.2.2.3"},"mvhd@creation_time":{text:"The creation time of the presentation (in seconds since midnight, Jan. 1, 1904, UTC).",ref:"ISO/IEC 14496-12, 8.2.2.3"},"mvhd@modification_time":{text:"The most recent time the presentation was modified.",ref:"ISO/IEC 14496-12, 8.2.2.3"},"mvhd@timescale":{text:"The number of time units that pass in one second for the presentation.",ref:"ISO/IEC 14496-12, 8.2.2.3"},"mvhd@duration":{text:"The duration of the presentation in units of the timescale.",ref:"ISO/IEC 14496-12, 8.2.2.3"},"mvhd@rate":{text:"A fixed-point 16.16 number that specifies the preferred playback rate (1.0 is normal speed).",ref:"ISO/IEC 14496-12, 8.2.2.3"},"mvhd@volume":{text:"A fixed-point 8.8 number that specifies the preferred playback volume (1.0 is full volume).",ref:"ISO/IEC 14496-12, 8.2.2.3"},"mvhd@matrix":{text:"A transformation matrix for the video, mapping points from video coordinates to display coordinates.",ref:"ISO/IEC 14496-12, 8.2.2.3"},"mvhd@next_track_ID":{text:"A non-zero integer indicating a value for the track ID of the next track to be added to this presentation.",ref:"ISO/IEC 14496-12, 8.2.2.3"}};function Hn(t,i){let e=new g(t,i);e.readVersionAndFlags(),e.readUint32("sequence_number")}var Vn={mfhd:{name:"Movie Fragment Header",text:"Contains the sequence number of this fragment.",ref:"ISO/IEC 14496-12, 8.8.5"},"mfhd@sequence_number":{text:"The ordinal number of this fragment, in increasing order.",ref:"ISO/IEC 14496-12, 8.8.5.3"}};function Nn(t,i){let e=new g(t,i),{flags:n}=e.readVersionAndFlags();if(n===null){e.finalize();return}if(e.readUint32("track_ID"),n&1&&e.readBigUint64("base_data_offset"),n&2&&e.readUint32("sample_description_index"),n&8&&e.readUint32("default_sample_duration"),n&16&&e.readUint32("default_sample_size"),n&32){let a=e.readUint32("default_sample_flags_raw");a!==null&&(t.details.default_sample_flags={value:`0x${a.toString(16)}`,offset:t.details.default_sample_flags_raw.offset,length:4},delete t.details.default_sample_flags_raw)}e.finalize()}var On={tfhd:{name:"Track Fragment Header",text:"Declares defaults for a track fragment.",ref:"ISO/IEC 14496-12, 8.8.7"},"tfhd@track_ID":{text:"The unique identifier of the track for this fragment.",ref:"ISO/IEC 14496-12, 8.8.7.2"},"tfhd@flags":{text:"A bitfield indicating which optional fields are present.",ref:"ISO/IEC 14496-12, 8.8.7.2"},"tfhd@base_data_offset":{text:"The base offset for data within the current mdat.",ref:"ISO/IEC 14496-12, 8.8.7.2"},"tfhd@sample_description_index":{text:"The index of the sample description for this fragment.",ref:"ISO/IEC 14496-12, 8.8.7.2"},"tfhd@version":{text:"Version of this box (0 or 1). Affects the size of the decode time field.",ref:"ISO/IEC 14496-12, 8.8.7.2"},"tfhd@default_sample_duration":{text:"Default duration of samples in this track fragment.",ref:"ISO/IEC 14496-12, 8.8.7.2"},"tfhd@default_sample_size":{text:"Default size of samples in this track fragment.",ref:"ISO/IEC 14496-12, 8.8.7.2"},"tfhd@default_sample_flags":{text:"Default flags for samples in this track fragment.",ref:"ISO/IEC 14496-12, 8.8.7.2"}};function Xn(t,i){let e=new g(t,i),{version:n}=e.readVersionAndFlags();if(n===null){e.finalize();return}n===1?e.readBigUint64("baseMediaDecodeTime"):e.readUint32("baseMediaDecodeTime"),e.finalize()}var jn={tfdt:{name:"Track Fragment Decode Time",text:"Provides the absolute decode time for the first sample.",ref:"ISO/IEC 14496-12, 8.8.12"},"tfdt@version":{text:"Version of this box (0 or 1). Affects the size of the decode time field.",ref:"ISO/IEC 14496-12, 8.8.12.3"},"tfdt@baseMediaDecodeTime":{text:"The absolute decode time, in media timescale units, for the first sample in this fragment.",ref:"ISO/IEC 14496-12, 8.8.12.3"}};function Gn(t,i){let e=new g(t,i),{version:n,flags:a}=e.readVersionAndFlags();if(a===null){e.finalize();return}let o=e.readUint32("sample_count");t.samples=[],a&1&&e.readInt32("data_offset");let s=null;if(a&4){let r=e.readUint32("first_sample_flags_dword");r!==null&&(delete t.details.first_sample_flags_dword,s=r,t.details.first_sample_flags={value:`0x${s.toString(16)}`,offset:t.details.first_sample_flags_dword?.offset||e.box.offset+e.offset-4,length:4})}if(o!==null)for(let r=0;r<o&&!e.stopped;r++){let l={};a&256&&(l.duration=e.view.getUint32(e.offset),e.offset+=4),a&512&&(l.size=e.view.getUint32(e.offset),e.offset+=4),a&1024&&(l.flags=e.view.getUint32(e.offset),e.offset+=4),r===0&&s!==null&&(l.flags=s),a&2048&&(n===0?l.compositionTimeOffset=e.view.getUint32(e.offset):l.compositionTimeOffset=e.view.getInt32(e.offset),e.offset+=4),t.samples.push(l)}e.finalize()}var Wn={trun:{name:"Track Run",text:"Contains timing, size, and flags for a run of samples.",ref:"ISO/IEC 14496-12, 8.8.8"},"trun@version":{text:"Version of this box (0 or 1). Affects signed/unsigned composition time.",ref:"ISO/IEC 14496-12, 8.8.8.2"},"trun@flags":{text:"A bitfield indicating which optional per-sample fields are present.",ref:"ISO/IEC 14496-12, 8.8.8.2"},"trun@sample_count":{text:"The number of samples in this run.",ref:"ISO/IEC 14496-12, 8.8.8.3"},"trun@data_offset":{text:"An optional offset added to the base_data_offset.",ref:"ISO/IEC 14496-12, 8.8.8.3"},"trun@first_sample_flags":{text:"Flags for the first sample, overriding the default.",ref:"ISO/IEC 14496-12, 8.8.8.3"},"trun@sample_1_details":{text:"A summary of the per-sample data fields for the first sample in this run.",ref:"ISO/IEC 14496-12, 8.8.8.2"}};function qn(t,i){let e=new g(t,i),{version:n}=e.readVersionAndFlags();if(n===null){e.finalize();return}e.readUint32("reference_ID"),e.readUint32("timescale"),n===1?(e.readBigUint64("earliest_presentation_time"),e.readBigUint64("first_offset")):(e.readUint32("earliest_presentation_time"),e.readUint32("first_offset")),e.skip(2,"reserved");let a=e.readUint16("reference_count");if(a===null){e.finalize();return}for(let o=0;o<a;o++){let s=e.readUint32(`ref_${o+1}_type_and_size`);if(s===null)break;let r=s>>31&1,l=s&2147483647,c=t.details[`ref_${o+1}_type_and_size`]?.offset||0;delete t.details[`ref_${o+1}_type_and_size`],t.details[`reference_${o+1}_type`]={value:r===1?"sidx":"media",offset:c,length:4},t.details[`reference_${o+1}_size`]={value:l,offset:c,length:4},e.readUint32(`reference_${o+1}_duration`);let f=e.readUint32(`sap_info_dword_${o+1}`);f!==null&&(delete t.details[`sap_info_dword_${o+1}`],t.details[`reference_${o+1}_sap_info`]={value:`0x${f.toString(16)}`,offset:c+8,length:4})}e.finalize()}var Kn={sidx:{name:"Segment Index",text:"Provides a compact index of media stream chunks within a segment.",ref:"ISO/IEC 14496-12, 8.16.3"},"sidx@version":{text:"Version of this box (0 or 1). Affects the size of time and offset fields.",ref:"ISO/IEC 14496-12, 8.16.3.2"},"sidx@reference_ID":{text:"The stream ID for the reference stream (typically the track ID).",ref:"ISO/IEC 14496-12, 8.16.3.3"},"sidx@timescale":{text:"The timescale for time and duration fields in this box, in ticks per second.",ref:"ISO/IEC 14496-12, 8.16.3.3"},"sidx@earliest_presentation_time":{text:"The earliest presentation time of any access unit in the first subsegment.",ref:"ISO/IEC 14496-12, 8.16.3.3"},"sidx@first_offset":{text:"The byte offset from the end of this box to the first byte of the indexed material.",ref:"ISO/IEC 14496-12, 8.16.3.3"},"sidx@reference_count":{text:"The number of subsegment references that follow.",ref:"ISO/IEC 14496-12, 8.16.3.3"},"sidx@reference_1_type":{text:"The type of the first reference (0 = media, 1 = sidx box).",ref:"ISO/IEC 14496-12, 8.16.3.3"},"sidx@reference_1_size":{text:"The size in bytes of the referenced item.",ref:"ISO/IEC 14496-12, 8.16.3.3"},"sidx@reference_1_duration":{text:"The duration of the referenced subsegment in the timescale.",ref:"ISO/IEC 14496-12, 8.16.3.3"}};function Yn(t,i){let e=new g(t,i),{version:n,flags:a}=e.readVersionAndFlags();if(a!==null){delete t.details.flags;let f=t.details.version.offset+1;t.details.track_enabled={value:(a&1)===1,offset:f,length:3},t.details.track_in_movie={value:(a&2)===2,offset:f,length:3},t.details.track_in_preview={value:(a&4)===4,offset:f,length:3}}n===1?(e.readBigUint64("creation_time"),e.readBigUint64("modification_time")):(e.readUint32("creation_time"),e.readUint32("modification_time")),e.readUint32("track_ID"),e.skip(4,"reserved_1"),n===1?e.readBigUint64("duration"):e.readUint32("duration"),e.skip(8,"reserved_2"),e.readInt16("layer"),e.readInt16("alternate_group");let o=e.readInt16("volume_fixed_point");o!==null&&(t.details.volume={...t.details.volume_fixed_point,value:(o/256).toFixed(2)},delete t.details.volume_fixed_point),e.skip(2,"reserved_3");let s=[];for(let f=0;f<9;f++)s.push(e.readInt32(`matrix_val_${f}`));let r=t.details.matrix_val_0?.offset;if(r!==void 0){t.details.matrix={value:`[${s.join(", ")}]`,offset:r,length:36};for(let f=0;f<9;f++)delete t.details[`matrix_val_${f}`]}let l=e.readUint32("width_fixed_point");l!==null&&(t.details.width={...t.details.width_fixed_point,value:(l/65536).toFixed(2)},delete t.details.width_fixed_point);let c=e.readUint32("height_fixed_point");c!==null&&(t.details.height={...t.details.height_fixed_point,value:(c/65536).toFixed(2)},delete t.details.height_fixed_point)}var Jn={tkhd:{name:"Track Header",text:"Specifies characteristics of a single track.",ref:"ISO/IEC 14496-12, 8.3.2"},"tkhd@track_enabled":{text:"A flag indicating that the track is enabled. A disabled track is treated as if it were not present.",ref:"ISO/IEC 14496-12, 8.3.2.3"},"tkhd@track_in_movie":{text:"A flag indicating that the track is used in the presentation.",ref:"ISO/IEC 14496-12, 8.3.2.3"},"tkhd@track_in_preview":{text:"A flag indicating that the track is used when previewing the presentation.",ref:"ISO/IEC 14496-12, 8.3.2.3"},"tkhd@version":{text:"Version of this box (0 or 1). Affects the size of time and duration fields.",ref:"ISO/IEC 14496-12, 8.3.2.3"},"tkhd@creation_time":{text:"The creation time of this track (in seconds since midnight, Jan. 1, 1904, UTC).",ref:"ISO/IEC 14496-12, 8.3.2.3"},"tkhd@modification_time":{text:"The most recent time the track was modified.",ref:"ISO/IEC 14496-12, 8.3.2.3"},"tkhd@track_ID":{text:"A unique integer that identifies this track.",ref:"ISO/IEC 14496-12, 8.3.2.3"},"tkhd@duration":{text:"The duration of this track in the movie's timescale.",ref:"ISO/IEC 14496-12, 8.3.2.3"},"tkhd@layer":{text:"Specifies the front-to-back ordering of video tracks; tracks with lower numbers are closer to the viewer.",ref:"ISO/IEC 14496-12, 8.3.2.3"},"tkhd@alternate_group":{text:"An integer that specifies a group of tracks that are alternatives to each other.",ref:"ISO/IEC 14496-12, 8.3.2.3"},"tkhd@volume":{text:"For audio tracks, a fixed-point 8.8 number indicating the track's relative volume.",ref:"ISO/IEC 14496-12, 8.3.2.3"},"tkhd@matrix":{text:"A transformation matrix for the video in this track.",ref:"ISO/IEC 14496-12, 8.3.2.3"},"tkhd@width":{text:"The visual presentation width of the track as a fixed-point 16.16 number.",ref:"ISO/IEC 14496-12, 8.3.2.3"},"tkhd@height":{text:"The visual presentation height of the track as a fixed-point 16.16 number.",ref:"ISO/IEC 14496-12, 8.3.2.3"}};function Qn(t,i){let e=new g(t,i),{version:n}=e.readVersionAndFlags();if(n===null){e.finalize();return}n===1?(e.readBigUint64("creation_time"),e.readBigUint64("modification_time")):(e.readUint32("creation_time"),e.readUint32("modification_time")),e.readUint32("timescale"),n===1?e.readBigUint64("duration"):e.readUint32("duration");let a=e.readUint16("language_bits");if(a!==null){let o=String.fromCharCode((a>>10&31)+96,(a>>5&31)+96,(a&31)+96);t.details.language={value:o,offset:t.details.language_bits.offset,length:2},delete t.details.language_bits}e.skip(2,"pre-defined"),e.finalize()}var Zn={mdhd:{name:"Media Header",text:"Declares media information (timescale, language).",ref:"ISO/IEC 14496-12, 8.4.2"},"mdhd@version":{text:"Version of this box (0 or 1). Affects the size of time and duration fields.",ref:"ISO/IEC 14496-12, 8.4.2.3"},"mdhd@timescale":{text:"The number of time units that pass in one second for this track's media.",ref:"ISO/IEC 14496-12, 8.4.2.3"},"mdhd@duration":{text:"The duration of this track's media in units of its own timescale.",ref:"ISO/IEC 14496-12, 8.4.2.3"},"mdhd@language":{text:"The ISO-639-2/T language code for this media.",ref:"ISO/IEC 14496-12, 8.4.2.3"}};function ea(t,i){let e=new g(t,i);e.readVersionAndFlags(),e.skip(4,"pre_defined"),e.readString(4,"handler_type"),e.skip(12,"reserved"),e.readNullTerminatedString("name"),e.finalize()}var ta={hdlr:{name:"Handler Reference",text:"Declares the media type of the track (e.g., 'vide', 'soun').",ref:"ISO/IEC 14496-12, 8.4.3"},"hdlr@handler_type":{text:"A four-character code identifying the media type (e.g., 'vide', 'soun', 'hint').",ref:"ISO/IEC 14496-12, 8.4.3.3"},"hdlr@name":{text:"A human-readable name for the track type (for debugging and inspection purposes).",ref:"ISO/IEC 14496-12, 8.4.3.3"}};function ia(t,i){let e=new g(t,i);e.readVersionAndFlags(),e.readUint16("graphicsmode");let n=e.readUint16("opcolor_r"),a=e.readUint16("opcolor_g"),o=e.readUint16("opcolor_b");if(n!==null&&a!==null&&o!==null){let s=t.details.opcolor_r.offset;delete t.details.opcolor_r,delete t.details.opcolor_g,delete t.details.opcolor_b,t.details.opcolor={value:`R:${n}, G:${a}, B:${o}`,offset:s,length:6}}e.finalize()}var na={vmhd:{name:"Video Media Header",text:"Contains header information specific to video media.",ref:"ISO/IEC 14496-12, 8.4.5.2"},"vmhd@version":{text:"Version of this box, always 0.",ref:"ISO/IEC 14496-12, 8.4.5.2.2"},"vmhd@flags":{text:"A bitmask of flags, should have the low bit set to 1.",ref:"ISO/IEC 14496-12, 8.4.5.2"},"vmhd@graphicsmode":{text:"Specifies a composition mode for this video track.",ref:"ISO/IEC 14496-12, 8.4.5.2.2"},"vmhd@opcolor":{text:"A set of RGB color values available for use by graphics modes.",ref:"ISO/IEC 14496-12, 8.4.5.2.2"}};function aa(t,i){let e=new g(t,i);e.readVersionAndFlags(),e.readUint32("entry_count")}var oa={stsd:{name:"Sample Description",text:"Stores information for decoding samples (codec type, initialization data). Contains one or more Sample Entry boxes.",ref:"ISO/IEC 14496-12, 8.5.2"},"stsd@entry_count":{text:"The number of sample entries that follow.",ref:"ISO/IEC 14496-12, 8.5.2.3"},"stsd@version":{text:"Version of this box, always 0.",ref:"ISO/IEC 14496-12, 8.5.2.3"}};function sa(t,i){let e=new g(t,i);e.readVersionAndFlags();let n=e.readUint32("entry_count");if(n!==null&&n>0){for(let o=0;o<n&&!e.stopped;o++)o<10?(e.readUint32(`sample_count_${o+1}`),e.readUint32(`sample_delta_${o+1}`)):e.offset+=8;n>10&&(t.details["...more_entries"]={value:`${n-10} more entries not shown but parsed`,offset:0,length:0})}e.finalize()}var ra={stts:{name:"Decoding Time to Sample",text:"Maps decoding times to sample numbers.",ref:"ISO/IEC 14496-12, 8.6.1.2"},"stts@version":{text:"Version of this box, always 0.",ref:"ISO/IEC 14496-12, 8.6.1.2.3"},"stts@entry_count":{text:"The number of entries in the time-to-sample table.",ref:"ISO/IEC 14496-12, 8.6.1.2.3"},"stts@sample_count_1":{text:"The number of consecutive samples with the same delta for the first table entry.",ref:"ISO/IEC 14496-12, 8.6.1.2.3"},"stts@sample_delta_1":{text:"The delta (duration) for each sample in this run for the first table entry.",ref:"ISO/IEC 14496-12, 8.6.1.2.3"}};function la(t,i){let e=new g(t,i);e.readVersionAndFlags();let n=e.readUint32("entry_count");if(n!==null&&n>0){for(let o=0;o<n&&!e.stopped;o++)if(o<10){let s=`entry_${o+1}`;e.readUint32(`${s}_first_chunk`),e.readUint32(`${s}_samples_per_chunk`),e.readUint32(`${s}_sample_description_index`)}else e.offset+=12;n>10&&(t.details["...more_entries"]={value:`${n-10} more entries not shown but parsed`,offset:0,length:0})}e.finalize()}var da={stsc:{name:"Sample To Chunk",text:"Maps samples to chunks.",ref:"ISO/IEC 14496-12, 8.7.4"},"stsc@version":{text:"Version of this box, always 0.",ref:"ISO/IEC 14496-12, 8.7.4.3"},"stsc@entry_count":{text:"The number of entries in the sample-to-chunk table.",ref:"ISO/IEC 14496-12, 8.7.4.3"},"stsc@entry_1_first_chunk":{text:"The index of the first chunk in a run of chunks with the same properties.",ref:"ISO/IEC 14496-12, 8.7.4.3"},"stsc@entry_1_samples_per_chunk":{text:"The number of samples in each of these chunks.",ref:"ISO/IEC 14496-12, 8.7.4.3"},"stsc@entry_1_sample_description_index":{text:"The index of the sample description for the samples in this run.",ref:"ISO/IEC 14496-12, 8.7.4.3"}};function ca(t,i){let e=new g(t,i);e.readVersionAndFlags();let n=e.readUint32("sample_size"),a=e.readUint32("sample_count");if(n===0&&a!==null&&a>0){for(let s=0;s<a&&!e.stopped;s++)s<10?e.readUint32(`entry_size_${s+1}`):e.offset+=4;a>10&&(t.details["...more_entries"]={value:`${a-10} more entries not shown but parsed`,offset:0,length:0})}e.finalize()}var fa={stsz:{name:"Sample Size",text:"Specifies the size of each sample.",ref:"ISO/IEC 14496-12, 8.7.3"},"stsz@version":{text:"Version of this box, always 0.",ref:"ISO/IEC 14496-12, 8.7.3.2.2"},"stsz@sample_size":{text:"Default sample size. If 0, sizes are in the entry table.",ref:"ISO/IEC 14496-12, 8.7.3.2.2"},"stsz@sample_count":{text:"The total number of samples in the track.",ref:"ISO/IEC 14496-12, 8.7.3.2.2"},"stsz@entry_size_1":{text:"The size of the first sample in bytes (if sample_size is 0).",ref:"ISO/IEC 14496-12, 8.7.3.2.2"}};function pa(t,i){let e=new g(t,i);e.readVersionAndFlags();let n=e.readUint32("entry_count");if(n!==null&&n>0){for(let o=0;o<n&&!e.stopped;o++)o<10?e.readUint32(`chunk_offset_${o+1}`):e.offset+=4;n>10&&(t.details["...more_entries"]={value:`${n-10} more entries not shown but parsed`,offset:0,length:0})}e.finalize()}var ma={stco:{name:"Chunk Offset",text:"Specifies the offset of each chunk into the file.",ref:"ISO/IEC 14496-12, 8.7.5"},"stco@version":{text:"Version of this box, always 0.",ref:"ISO/IEC 14496-12, 8.7.5.3"},"stco@entry_count":{text:"The number of entries in the chunk offset table.",ref:"ISO/IEC 14496-12, 8.7.5.3"},"stco@chunk_offset_1":{text:"The file offset of the first chunk.",ref:"ISO/IEC 14496-12, 8.7.5.3"}};function ua(t,i){let e=new g(t,i),{version:n}=e.readVersionAndFlags();if(n===null){e.finalize();return}let a=e.readUint32("entry_count");if(a!==null&&a>0){let s=n===1?20:12;for(let r=0;r<a&&!e.stopped;r++)if(r<5){let l=`entry_${r+1}`;n===1?(e.readBigUint64(`${l}_segment_duration`),e.readBigInt64(`${l}_media_time`)):(e.readUint32(`${l}_segment_duration`),e.readInt32(`${l}_media_time`)),e.readInt16(`${l}_media_rate_integer`),e.readInt16(`${l}_media_rate_fraction`)}else e.offset+=s;a>5&&(t.details["...more_entries"]={value:`${a-5} more entries not shown but parsed`,offset:0,length:0})}e.finalize()}var ga={elst:{name:"Edit List",text:"Maps the media time-line to the presentation time-line.",ref:"ISO/IEC 14496-12, 8.6.6"},"elst@version":{text:"Version of this box (0 or 1). Affects the size of duration and time fields.",ref:"ISO/IEC 14496-12, 8.6.6.3"},"elst@entry_count":{text:"The number of entries in the edit list.",ref:"ISO/IEC 14496-12, 8.6.6.3"},"elst@entry_1_segment_duration":{text:"The duration of this edit segment in movie timescale units.",ref:"ISO/IEC 14496-12, 8.6.6.3"},"elst@entry_1_media_time":{text:"The starting time within the media of this edit segment. A value of -1 indicates an empty edit.",ref:"ISO/IEC 14496-12, 8.6.6.3"}};function ha(t,i){let e=new g(t,i);e.readVersionAndFlags(),e.readUint32("track_ID"),e.readUint32("default_sample_description_index"),e.readUint32("default_sample_duration"),e.readUint32("default_sample_size");let n=e.readUint32("default_sample_flags_raw");n!==null&&(t.details.default_sample_flags={value:`0x${n.toString(16)}`,offset:t.details.default_sample_flags_raw.offset,length:4},delete t.details.default_sample_flags_raw),e.finalize()}var xa={trex:{name:"Track Extends",text:"Sets default values for samples in fragments.",ref:"ISO/IEC 14496-12, 8.8.3"},"trex@track_ID":{text:"The track ID to which these defaults apply.",ref:"ISO/IEC 14496-12, 8.8.3.3"},"trex@default_sample_description_index":{text:"The default sample description index for samples in fragments.",ref:"ISO/IEC 14496-12, 8.8.3.3"},"trex@default_sample_duration":{text:"The default duration for samples in fragments.",ref:"ISO/IEC 14496-12, 8.8.3.3"},"trex@default_sample_size":{text:"The default size for samples in fragments.",ref:"ISO/IEC 14496-12, 8.8.3.3"},"trex@default_sample_flags":{text:"The default flags for samples in fragments.",ref:"ISO/IEC 14496-12, 8.8.3.3"}};var ya={moov:{name:"Movie",text:"Container for all metadata defining the presentation.",ref:"ISO/IEC 14496-12, 8.2.1"},trak:{name:"Track",text:"Container for a single track.",ref:"ISO/IEC 14496-12, 8.3.1"},meta:{name:"Metadata",text:"A container for metadata.",ref:"ISO/IEC 14496-12, 8.11.1"},mdia:{name:"Media",text:"Container for media data information.",ref:"ISO/IEC 14496-12, 8.4.1"},minf:{name:"Media Information",text:"Container for characteristic information of the media.",ref:"ISO/IEC 14496-12, 8.4.4"},dinf:{name:"Data Information",text:"Container for objects that declare where media data is located.",ref:"ISO/IEC 14496-12, 8.7.1"},stbl:{name:"Sample Table",text:"Contains all time and data indexing for samples.",ref:"ISO/IEC 14496-12, 8.5.1"},edts:{name:"Edit Box",text:"A container for an edit list.",ref:"ISO/IEC 14496-12, 8.6.5"},mvex:{name:"Movie Extends",text:"Signals that the movie may contain fragments.",ref:"ISO/IEC 14496-12, 8.8.1"},moof:{name:"Movie Fragment",text:"Container for all metadata for a single fragment.",ref:"ISO/IEC 14496-12, 8.8.4"},traf:{name:"Track Fragment",text:"Container for metadata for a single track's fragment.",ref:"ISO/IEC 14496-12, 8.8.6"},pssh:{name:"Protection System Specific Header",text:"Contains DRM initialization data.",ref:"ISO/IEC 23001-7"},mdat:{name:"Media Data",text:"Contains the actual audio/video sample data.",ref:"ISO/IEC 14496-12, 8.1.1"}};var ii=class{constructor(i){this.buffer=i,this.bytePosition=0,this.bitPosition=0}readBits(i){let e=0;for(let n=0;n<i;n++){let o=this.buffer[this.bytePosition]>>7-this.bitPosition&1;e=e<<1|o,this.bitPosition++,this.bitPosition===8&&(this.bitPosition=0,this.bytePosition++)}return e}readUE(){let i=0;for(;this.bytePosition<this.buffer.length&&this.readBits(1)===0;)i++;if(i===0)return 0;let e=this.readBits(i);return(1<<i)-1+e}};function ba(t){if(t.length<4)return null;let i=new ii(t);i.readBits(8);let e=i.readBits(8);i.readBits(16);let n=i.readBits(8);if(i.readUE(),e===100||e===110||e===122||e===244||e===44||e===83||e===86||e===118||e===128||e===138){let m=i.readUE();if(m===3&&i.readBits(1),i.readUE(),i.readUE(),i.readBits(1),i.readBits(1)){let p=m!==3?8:12;for(let h=0;h<p;h++)if(i.readBits(1))return{profile_idc:e,level_idc:n,error:"SPS with scaling matrix not fully parsed."}}}i.readUE();let a=i.readUE();if(a===0)i.readUE();else if(a===1){i.readBits(1),i.readUE(),i.readUE();let m=i.readUE();for(let u=0;u<m;u++)i.readUE()}i.readUE(),i.readBits(1);let o=i.readUE(),s=i.readUE(),r=i.readBits(1),l=(o+1)*16,c=(2-r)*(s+1)*16;if(r===0&&i.readBits(1),i.readBits(1),i.readBits(1)){let m=i.readUE(),u=i.readUE(),p=i.readUE(),h=i.readUE(),y=1,b=2-r,C=l-(m+u)*y;c=c-(p+h)*b}return{profile_idc:e,level_idc:n,resolution:`${l}x${c}`}}function _a(t,i){let e=new g(t,i);e.readUint8("configurationVersion");let n=e.readUint8("AVCProfileIndication");e.readUint8("profile_compatibility"),e.readUint8("AVCLevelIndication");let a=e.readUint8("length_size_byte");a!==null&&(delete t.details.length_size_byte,t.details.lengthSizeMinusOne={value:a&3,offset:t.offset+e.offset-1,length:.25},t.details.reserved_6_bits={value:a>>2&63,offset:t.offset+e.offset-1,length:.75});let o=e.readUint8("sps_count_byte");if(o!==null){delete t.details.sps_count_byte;let r=o&31;t.details.numOfSequenceParameterSets={value:r,offset:t.offset+e.offset-1,length:.625},t.details.reserved_3_bits={value:o>>5&7,offset:t.offset+e.offset-1,length:.375};for(let l=0;l<r;l++){let c=e.readUint16(`sps_${l+1}_length`);if(c===null)break;let f=e.offset;if(e.checkBounds(c)){let m=new Uint8Array(e.view.buffer,e.view.byteOffset+f,c),u=ba(m);u&&(t.details[`sps_${l+1}_decoded_profile`]={value:u.profile_idc,offset:0,length:0},t.details[`sps_${l+1}_decoded_level`]={value:u.level_idc,offset:0,length:0},t.details[`sps_${l+1}_decoded_resolution`]={value:u.resolution,offset:0,length:0}),e.skip(c,`sps_${l+1}_nal_unit`)}}}let s=e.readUint8("numOfPictureParameterSets");if(s!==null)for(let r=0;r<s;r++){let l=e.readUint16(`pps_${r+1}_length`);if(l===null)break;e.skip(l,`pps_${r+1}_nal_unit`)}e.offset<t.size&&(n===100||n===110||n===122||n===144)&&e.readRemainingBytes("profile_specific_extensions"),e.finalize()}var va={avcC:{name:"AVC Configuration",text:"Contains the decoder configuration information for an H.264/AVC video track, including SPS and PPS.",ref:"ISO/IEC 14496-15, 5.3.3.1.2"},"avcC@AVCProfileIndication":{text:"Specifies the profile to which the stream conforms (e.g., 66=Baseline, 77=Main, 100=High).",ref:"ISO/IEC 14496-10"},"avcC@AVCLevelIndication":{text:"Specifies the level to which the stream conforms.",ref:"ISO/IEC 14496-10"},"avcC@sps_1_decoded_resolution":{text:"The video resolution (width x height) decoded from the Sequence Parameter Set.",ref:"ISO/IEC 14496-10, 7.3.2.1.1"}};var hl={1:"AAC Main",2:"AAC LC",3:"AAC SSR",4:"AAC LTP",5:"SBR",6:"AAC Scalable"},xl={0:"96000 Hz",1:"88200 Hz",2:"64000 Hz",3:"48000 Hz",4:"44100 Hz",5:"32000 Hz",6:"24000 Hz",7:"22050 Hz",8:"16000 Hz",9:"12000 Hz",10:"11025 Hz",11:"8000 Hz",12:"7350 Hz"},yl=["Custom","Mono (Center)","Stereo (L, R)","3 (L, C, R)","4 (L, C, R, Sur)","5 (L, C, R, Ls, Rs)","5.1 (L, C, R, Ls, Rs, LFE)","7.1 (L, C, R, Ls, Rs, Lcs, Rcs, LFE)"];function ct(t,i){let e=t.offset,n=0,a,o=0;do{if(a=t.readUint8(`size_byte_${o}`),a===null)return null;n=n<<7|a&127,o++}while(a&128&&o<4);t.box.details[i]={value:n,offset:t.box.offset+e,length:o};for(let s=0;s<o;s++)delete t.box.details[`size_byte_${s}`];return n}function Sa(t,i){let e=new g(t,i);e.readVersionAndFlags();let n=e.readUint8("ES_Descriptor_tag");if(n!==3){e.addIssue("warn",`Expected ES_Descriptor tag (0x03), but found ${n}.`),e.finalize();return}let a=ct(e,"ES_Descriptor_size");if(a===null){e.finalize();return}let o=e.offset+a;if(e.readUint16("ES_ID"),e.readUint8("streamDependence_and_priority"),e.offset<o&&e.readUint8("DecoderConfigDescriptor_tag")===4){let r=ct(e,"DecoderConfigDescriptor_size"),l=e.offset+r;if(e.readUint8("objectTypeIndication"),e.readUint8("streamType_and_upStream"),e.skip(3,"bufferSizeDB"),e.readUint32("maxBitrate"),e.readUint32("avgBitrate"),e.offset<l&&e.readUint8("DecoderSpecificInfo_tag")===5){let f=ct(e,"DecoderSpecificInfo_size");if(f!==null&&f>=2){let m=e.offset,u=(e.readUint16("AudioSpecificConfig_bits")>>>0).toString(2).padStart(16,"0");delete t.details.AudioSpecificConfig_bits;let p=parseInt(u.substring(0,5),2),h=parseInt(u.substring(5,9),2),y=parseInt(u.substring(9,13),2);t.details.decoded_audio_object_type={value:`${hl[p]||"Unknown"} (${p})`,offset:e.box.offset+m,length:.625},t.details.decoded_sampling_frequency={value:`${xl[h]||"Unknown"} (${h})`,offset:e.box.offset+m+.625,length:.5},t.details.decoded_channel_configuration={value:`${yl[y]||"Unknown"} (${y})`,offset:e.box.offset+m+1.125,length:.5},e.skip(f-2,"decoder_specific_info_remains")}else f>0&&e.skip(f,"decoder_specific_info_data")}}if(e.offset<o&&e.readUint8("SLConfigDescriptor_tag")===6){let r=ct(e,"SLConfigDescriptor_size");r!==null&&(r===1?e.readUint8("predefined"):e.skip(r,"sl_config_data"))}e.finalize()}var Ta={esds:{name:"Elementary Stream Descriptor",text:"Contains information about the elementary stream, such as the audio object type for AAC.",ref:"ISO/IEC 14496-1, 7.2.6.5"},"esds@objectTypeIndication":{text:"Specifies the audio coding profile (e.g., 64 = AAC LC, 5 = SBR). The value 0x40 corresponds to 64.",ref:"ISO/IEC 14496-1, Table 5"},"esds@decoded_audio_object_type":{text:"The specific type of audio coding, decoded from the DecoderSpecificInfo. This is the definitive audio profile.",ref:"ISO/IEC 14496-3, 1.5.1.1"},"esds@decoded_sampling_frequency":{text:"The audio sampling frequency, decoded from the DecoderSpecificInfo.",ref:"ISO/IEC 14496-3, 1.5.1.1"},"esds@decoded_channel_configuration":{text:"The speaker channel layout, decoded from the DecoderSpecificInfo.",ref:"ISO/IEC 14496-3, 1.5.1.1"},SLConfigDescriptor_tag:{name:"Sync Layer Config Descriptor Tag",text:"Tag identifying the Sync Layer (SL) Configuration Descriptor, which contains configuration for the synchronization layer.",ref:"ISO/IEC 14496-1, 7.2.6.8"},"SLConfigDescriptor_tag@predefined":{name:"Predefined",text:"A predefined value for the SL packet header configuration. A value of 2 indicates that SL packets have a 1-byte header.",ref:"ISO/IEC 14496-1, 7.2.6.8"}};function Ca(t,i){let e=new g(t,i);e.readVersionAndFlags(),e.readInt16("balance"),e.skip(2,"reserved"),e.finalize()}var Ia={smhd:{name:"Sound Media Header",text:"Contains header information specific to sound media.",ref:"ISO/IEC 14496-12, 8.4.5.3"},"smhd@balance":{text:"A fixed-point 8.8 number that places mono audio tracks in a stereo space (0 = center).",ref:"ISO/IEC 14496-12, 8.4.5.3.2"},"smhd@version":{text:"Version of this box, always 0.",ref:"ISO/IEC 14496-12, 8.4.5.3.2"}};function Ea(t,i){let e=new g(t,i),{version:n}=e.readVersionAndFlags();if(n===null){e.finalize();return}let a=[];for(let r=0;r<16;r++){let l=e.readUint8(`system_id_byte_${r}`);if(l===null){e.finalize();return}a.push(l.toString(16).padStart(2,"0"))}let o=t.details.system_id_byte_0.offset;for(let r=0;r<16;r++)delete t.details[`system_id_byte_${r}`];if(t.details["System ID"]={value:a.join("-"),offset:o,length:16},n>0){let r=e.readUint32("Key ID Count");r!==null&&e.skip(r*16,"Key IDs")}let s=e.readUint32("Data Size");s!==null&&e.skip(s,"Data"),e.finalize()}var Aa={pssh:{name:"Protection System Specific Header",text:"Contains DRM initialization data.",ref:"ISO/IEC 23001-7"},"pssh@System ID":{text:"A 16-byte UUID that uniquely identifies the DRM system (e.g., Widevine, PlayReady).",ref:"ISO/IEC 23001-7, 5.1.2"},"pssh@Data Size":{text:"The size of the system-specific initialization data that follows.",ref:"ISO/IEC 23001-7, 5.1.2"},"pssh@version":{text:"Version of this box (0 or 1). Version 1 includes key IDs.",ref:"ISO/IEC 23001-7, 5.1.2"},"pssh@Key ID Count":{text:"The number of key IDs present in the box (only for version 1).",ref:"ISO/IEC 23001-7, 5.1.2"}};function Da(t,i){let e=new g(t,i),{version:n}=e.readVersionAndFlags();if(n===null){e.finalize();return}let a=e.readUint32("entry_count");if(a!==null&&a>0){for(let s=0;s<a&&!e.stopped;s++)if(s<10){let r=`entry_${s+1}`;e.readUint32(`${r}_sample_count`),n===1?e.readInt32(`${r}_sample_offset`):e.readUint32(`${r}_sample_offset`)}else e.offset+=8;a>10&&(t.details["...more_entries"]={value:`${a-10} more entries not shown but parsed`,offset:0,length:0})}e.finalize()}var $a={ctts:{name:"Composition Time to Sample",text:"Provides the offset between decoding time and composition time for each sample. Essential for B-frames.",ref:"ISO/IEC 14496-12, 8.6.1.3"},"ctts@version":{text:"Version of this box (0 or 1). Version 1 allows for signed sample offsets.",ref:"ISO/IEC 14496-12, 8.6.1.3.3"},"ctts@entry_count":{text:"The number of entries in the composition time-to-sample table.",ref:"ISO/IEC 14496-12, 8.6.1.3.3"},"ctts@entry_1_sample_count":{text:"The number of consecutive samples with the same composition offset.",ref:"ISO/IEC 14496-12, 8.6.1.3.3"},"ctts@entry_1_sample_offset":{text:"The composition time offset for this run of samples (CT = DT + offset).",ref:"ISO/IEC 14496-12, 8.6.1.3.3"}};function Pa(t,i){let e=new g(t,i);e.readVersionAndFlags(),e.skip(3,"reserved");let n=e.readUint8("field_size"),a=e.readUint32("sample_count");if(a!==null&&a>0){let o;if(n===4){let s=e.readUint8("entry_size_1_byte");s!==null&&(o=`(nibbles) ${s>>4&15}, ${s&15}`)}else n===8?o=e.readUint8("entry_size_1"):n===16&&(o=e.readUint16("entry_size_1"));o!==void 0&&(t.details.entry_size_1.value=o)}e.finalize()}var wa={stz2:{name:"Compact Sample Size",text:"A compact version of the Sample Size Box for smaller, varying sample sizes.",ref:"ISO/IEC 14496-12, 8.7.3.3"},"stz2@field_size":{text:"The size in bits of each entry in the sample size table (4, 8, or 16).",ref:"ISO/IEC 14496-12, 8.7.3.3.2"},"stz2@sample_count":{text:"The total number of samples in the track.",ref:"ISO/IEC 14496-12, 8.7.3.3.2"},"stz2@entry_size_1":{text:"The size of the first sample, with the size determined by field_size.",ref:"ISO/IEC 14496-12, 8.7.3.3.2"}};function Ua(t,i){let e=new g(t,i),{version:n}=e.readVersionAndFlags();if(n===null){e.finalize();return}e.readString(4,"grouping_type"),n===1&&e.readUint32("grouping_type_parameter");let a=e.readUint32("entry_count");a!==null&&a>0&&(e.readUint32("entry_1_sample_count"),e.readUint32("entry_1_group_description_index")),e.finalize()}var Ma={sbgp:{name:"Sample to Group",text:"Assigns samples to a specific group, described in the Sample Group Description Box (sgpd).",ref:"ISO/IEC 14496-12, 8.9.2"},"sbgp@grouping_type":{text:'A code indicating the criterion used to group the samples (e.g., "rap " for random access points).',ref:"ISO/IEC 14496-12, 8.9.2.3"},"sbgp@grouping_type_parameter":{text:"A parameter providing additional information for the grouping (only in version 1).",ref:"ISO/IEC 14496-12, 8.9.2.3"},"sbgp@entry_count":{text:"The number of entries mapping sample runs to group descriptions.",ref:"ISO/IEC 14496-12, 8.9.2.3"}};function ka(t,i){}function ye(t,i){let e=new g(t,i),n=[];for(;e.offset<t.size&&!e.stopped;){let a=e.readUint32(`track_ID_${n.length+1}`);if(a!==null)n.push(a);else break}t.details.track_IDs={value:n.join(", "),offset:t.offset+t.headerSize,length:t.size-t.headerSize},e.finalize()}var Ra={hint:ye,cdsc:ye,font:ye,hind:ye,vdep:ye,vplx:ye,subt:ye},La={tref:{name:"Track Reference",text:"A container box that defines references from this track to other tracks in the presentation.",ref:"ISO/IEC 14496-12, 8.3.3"},hint:{name:"Hint Track Reference",text:"Indicates that the referenced track(s) contain the original media for this hint track.",ref:"ISO/IEC 14496-12, 8.3.3.3"},cdsc:{name:"Content Description Reference",text:"Indicates that this track describes the referenced track (e.g., a timed metadata track).",ref:"ISO/IEC 14496-12, 8.3.3.3"},"hint@track_IDs":{text:"A list of track IDs that this track references.",ref:"ISO/IEC 14496-12, 8.3.3.2"}};function Ba(t,i){let e=new g(t,i),{version:n}=e.readVersionAndFlags();if(n===null){e.finalize();return}let a=e.readUint32("entry_count");if(a!==null&&a>0){e.readUint32("entry_1_sample_delta");let o=e.readUint16("entry_1_subsample_count");o!==null&&o>0&&(n===1?e.readUint32("subsample_1_size"):e.readUint16("subsample_1_size"))}e.finalize()}var Fa={subs:{name:"Sub-Sample Information",text:"Defines the size of sub-samples, often used in CENC to separate clear vs. encrypted parts of a sample.",ref:"ISO/IEC 14496-12, 8.7.7"},"subs@entry_count":{text:"The number of samples that have sub-sample information.",ref:"ISO/IEC 14496-12, 8.7.7.3"},"subs@entry_1_subsample_count":{text:"The number of sub-samples in the first sample.",ref:"ISO/IEC 14496-12, 8.7.7.3"},"subs@subsample_1_size":{text:"The size in bytes of the first sub-sample.",ref:"ISO/IEC 14496-12, 8.7.7.3"}};function za(t,i){let e=new g(t,i),{flags:n}=e.readVersionAndFlags();n!==null&&(n&1)!==0&&(e.readUint32("aux_info_type"),e.readUint32("aux_info_type_parameter"));let a=e.readUint8("default_sample_info_size"),o=e.readUint32("sample_count");if(a===0&&o!==null&&o>0){for(let r=0;r<o&&!e.stopped;r++)r<10?e.readUint8(`sample_info_size_${r+1}`):e.offset+=1;o>10&&(t.details["...more_entries"]={value:`${o-10} more entries not shown but parsed`,offset:0,length:0})}e.finalize()}var Ha={saiz:{name:"Sample Auxiliary Information Sizes",text:"Provides the size of auxiliary information for each sample, used for CENC encryption parameters.",ref:"ISO/IEC 14496-12, 8.7.8"},"saiz@default_sample_info_size":{text:"Default size of the auxiliary info. If 0, sizes are in the table.",ref:"ISO/IEC 14496-12, 8.7.8.3"},"saiz@sample_count":{text:"The number of samples for which size information is provided.",ref:"ISO/IEC 14496-12, 8.7.8.3"}};function Va(t,i){let e=new g(t,i),{version:n,flags:a}=e.readVersionAndFlags();if(n===null){e.finalize();return}(a&1)!==0&&e.skip(8,"aux_info_type_and_param");let o=e.readUint32("entry_count");o!==null&&o>0&&(n===1?e.readBigUint64("offset_1"):e.readUint32("offset_1")),e.finalize()}var Na={saio:{name:"Sample Auxiliary Information Offsets",text:"Provides the location of auxiliary information for samples, such as CENC Initialization Vectors.",ref:"ISO/IEC 14496-12, 8.7.9"},"saio@entry_count":{text:"The number of offset entries.",ref:"ISO/IEC 14496-12, 8.7.9.3"},"saio@offset_1":{text:"The offset of the auxiliary information for the first chunk or run.",ref:"ISO/IEC 14496-12, 8.7.9.3"}};function Oa(t,i){}var Xa={sinf:{name:"Protection Scheme Information",text:"A container for all information required to understand the encryption transform applied.",ref:"ISO/IEC 14496-12, 8.12.1"}};function ja(t,i){let e=new g(t,i);e.readString(4,"data_format"),e.finalize()}var Ga={frma:{name:"Original Format Box",text:"Stores the original, unencrypted four-character-code of the sample description.",ref:"ISO/IEC 14496-12, 8.12.2"},"frma@data_format":{text:'The original format of the sample entry (e.g., "avc1", "mp4a").',ref:"ISO/IEC 14496-12, 8.12.2.3"}};function Wa(t,i){let e=new g(t,i);e.readVersionAndFlags(),e.readString(4,"scheme_type");let n=e.readUint32("scheme_version_raw");n!==null&&(t.details.scheme_version={value:`0x${n.toString(16)}`,offset:t.details.scheme_version_raw.offset,length:4},delete t.details.scheme_version_raw),e.finalize()}var qa={schm:{name:"Scheme Type Box",text:'Identifies the protection scheme (e.g., "cenc" for Common Encryption).',ref:"ISO/IEC 14496-12, 8.12.5"},"schm@scheme_type":{text:"A four-character code identifying the protection scheme.",ref:"ISO/IEC 14496-12, 8.12.5.3"},"schm@scheme_version":{text:"The version of the scheme used to create the content.",ref:"ISO/IEC 14496-12, 8.12.5.3"}};function Ka(t,i){}var Ya={schi:{name:"Scheme Information Box",text:"A container for boxes with scheme-specific data needed by the protection system.",ref:"ISO/IEC 14496-12, 8.12.6"}};function Ja(t,i){let e=new g(t,i);e.readVersionAndFlags();let n=e.readUint32("entry_count");if(n!==null&&n>0){let a=[];for(let s=0;s<n&&!e.stopped;s++)if(s<10){let r=e.readUint32(`sample_number_entry_${s+1}`);r!==null&&(a.push(r),delete t.details[`sample_number_entry_${s+1}`])}else e.offset+=4;n>0&&(t.details.sample_numbers={value:a.join(", ")+(n>10?`... (${n-10} more entries not shown but parsed)`:""),offset:t.offset+e.offset,length:n*4})}e.finalize()}var Qa={stss:{name:"Sync Sample Box",text:"Provides a compact list of the sync samples (keyframes/random access points) in the track.",ref:"ISO/IEC 14496-12, 8.6.2"},"stss@entry_count":{text:"The number of sync samples in this track.",ref:"ISO/IEC 14496-12, 8.6.2.3"},"stss@sample_numbers":{text:"The sample numbers of the sync samples, in increasing order.",ref:"ISO/IEC 14496-12, 8.6.2.3"}};function Za(t,i){let e=new g(t,i),{version:n}=e.readVersionAndFlags();if(n===null){e.finalize();return}let a=e.readString(4,"grouping_type"),o=0;n===1&&(o=e.readUint32("default_length")),n>=2&&e.readUint32("default_sample_description_index");let s=e.readUint32("entry_count");if(s!==null)for(let r=0;r<s&&!e.stopped;r++){let l=o;if(n===1&&o===0){let m=e.readUint32(`entry_${r+1}_description_length`);if(m===null)break;l=m}let c=`entry_${r+1}`,f=e.offset;switch(a){case"roll":e.readInt16(`${c}_roll_distance`),n===0&&(l=2);break;default:n===0&&(e.addIssue("warn",`Cannot determine entry size for unknown grouping_type '${a}' with version 0. Parsing of this box may be incomplete.`),e.readRemainingBytes("unparsed_sgpd_entries"),r=s);break}l>0&&e.offset===f&&e.skip(l,`${c}_description_data`)}e.finalize()}var eo={sgpd:{name:"Sample Group Description",text:"Contains a sample group entry for each sample group, describing its properties.",ref:"ISO/IEC 14496-12, 8.9.3"},"sgpd@grouping_type":{text:"The type of grouping that these descriptions apply to. Must match the type in the `sbgp` box.",ref:"ISO/IEC 14496-12, 8.9.3.3"},"sgpd@entry_count":{text:"The number of sample group description entries that follow.",ref:"ISO/IEC 14496-12, 8.9.3.3"},"sgpd@entry_1_roll_distance":{text:'For "roll" groups, a signed integer indicating the number of samples (before or after) needed for a clean random access point.',ref:"ISO/IEC 14496-12, 10.1.1.3"}};function to(t,i){let e=new g(t,i),{version:n}=e.readVersionAndFlags();if(n===null){e.finalize();return}n===1?e.readBigUint64("fragment_duration"):e.readUint32("fragment_duration"),e.finalize()}var io={mehd:{name:"Movie Extends Header",text:"Provides the overall duration of a fragmented movie, including all fragments.",ref:"ISO/IEC 14496-12, 8.8.2"},"mehd@fragment_duration":{text:"The total duration of the movie in the movie's timescale, including all movie fragments.",ref:"ISO/IEC 14496-12, 8.8.2.3"}};function no(t,i){let e=new g(t,i);e.readVersionAndFlags();let n=t.size-e.offset;if(t.details.sample_count={value:n,offset:0,length:0},n>0){for(let o=0;o<n&&!e.stopped;o++){let s=`sample_${o+1}`;if(o<10){let r=e.readUint8(`${s}_flags_byte`);if(r===null)break;delete t.details[`${s}_flags_byte`],t.details[`${s}_is_leading`]={value:r>>6&3,offset:t.offset+e.offset-1,length:.25},t.details[`${s}_sample_depends_on`]={value:r>>4&3,offset:t.offset+e.offset-1,length:.25},t.details[`${s}_sample_is_depended_on`]={value:r>>2&3,offset:t.offset+e.offset-1,length:.25},t.details[`${s}_sample_has_redundancy`]={value:r&3,offset:t.offset+e.offset-1,length:.25}}else e.offset+=1}n>10&&(t.details["...more_entries"]={value:`${n-10} more entries not shown but parsed`,offset:0,length:0})}e.finalize()}var ao={sdtp:{name:"Independent and Disposable Samples",text:"Provides detailed dependency information for each sample in the track.",ref:"ISO/IEC 14496-12, 8.6.4"},"sdtp@sample_1_is_leading":{text:"Leading nature of the sample (0:unknown, 1:leading with dependency, 2:not leading, 3:leading without dependency).",ref:"ISO/IEC 14496-12, 8.6.4.3"},"sdtp@sample_1_sample_depends_on":{text:"Sample dependency (0:unknown, 1:depends on others (not I-frame), 2:does not depend on others (I-frame)).",ref:"ISO/IEC 14496-12, 8.6.4.3"},"sdtp@sample_1_sample_is_depended_on":{text:"Whether other samples depend on this one (0:unknown, 1:others may depend, 2:disposable).",ref:"ISO/IEC 14496-12, 8.6.4.3"},"sdtp@sample_1_sample_has_redundancy":{text:"Redundant coding (0:unknown, 1:has redundant coding, 2:no redundant coding).",ref:"ISO/IEC 14496-12, 8.6.4.3"}};function oo(t,i){}var so={mfra:{name:"Movie Fragment Random Access",text:"A container for random access information for movie fragments, often found at the end of the file.",ref:"ISO/IEC 14496-12, 8.8.9"}};function ro(t,i){let e=new g(t,i),{version:n}=e.readVersionAndFlags();if(n===null){e.finalize();return}e.readUint32("track_ID");let a=e.readUint32("length_sizes_raw");if(a!==null){let o=(a>>4&3)+1,s=(a>>2&3)+1,r=(a&3)+1;t.details.length_sizes={value:`traf=${o}, trun=${s}, sample=${r}`,offset:t.details.length_sizes_raw.offset,length:4},delete t.details.length_sizes_raw;let l=e.readUint32("number_of_entries");l!==null&&l>0&&(n===1?(e.readBigUint64("entry_1_time"),e.readBigUint64("entry_1_moof_offset")):(e.readUint32("entry_1_time"),e.readUint32("entry_1_moof_offset")),e.skip(o,"entry_1_traf_number"),e.skip(s,"entry_1_trun_number"),e.skip(r,"entry_1_sample_number"))}e.finalize()}var lo={tfra:{name:"Track Fragment Random Access",text:"Contains a table mapping sync sample times to their `moof` box locations for a single track.",ref:"ISO/IEC 14496-12, 8.8.10"},"tfra@track_ID":{text:"The ID of the track this table refers to.",ref:"ISO/IEC 14496-12, 8.8.10.3"},"tfra@number_of_entries":{text:"The number of random access entries in the table.",ref:"ISO/IEC 14496-12, 8.8.10.3"},"tfra@entry_1_time":{text:"The presentation time of the sync sample in the first entry.",ref:"ISO/IEC 14496-12, 8.8.10.3"},"tfra@entry_1_moof_offset":{text:"The file offset of the `moof` box containing the sync sample for the first entry.",ref:"ISO/IEC 14496-12, 8.8.10.3"}};function co(t,i){let e=new g(t,i);e.readVersionAndFlags(),e.readUint32("size"),e.finalize()}var fo={mfro:{name:"Movie Fragment Random Access Offset",text:"Contains the size of the enclosing `mfra` box to aid in locating it by scanning from the end of the file.",ref:"ISO/IEC 14496-12, 8.8.11"},"mfro@size":{text:"The size of the `mfra` box in bytes.",ref:"ISO/IEC 14496-12, 8.8.11.3"}};function po(t,i){let e=new g(t,i);e.readVersionAndFlags();let n=1;for(;e.offset<t.size&&!e.stopped;){if(n>5){t.details["...more_entries"]={value:"More entries not shown.",offset:0,length:0};break}let a=`entry_${n}`;e.readUint32(`${a}_rate`),e.readUint32(`${a}_initial_delay`),n++}e.finalize()}var mo={pdin:{name:"Progressive Download Info",text:"Contains pairs of download rates and suggested initial playback delays to aid progressive downloading.",ref:"ISO/IEC 14496-12, 8.1.3"},"pdin@entry_1_rate":{text:"The download rate in bytes/second for the first entry.",ref:"ISO/IEC 14496-12, 8.1.3.3"},"pdin@entry_1_initial_delay":{text:"The suggested initial playback delay in milliseconds for the first entry.",ref:"ISO/IEC 14496-12, 8.1.3.3"}};function uo(t,i){let e=new g(t,i);e.readVersionAndFlags();let n=e.readUint16("language_bits");if(n!==null){let a=String.fromCharCode((n>>10&31)+96,(n>>5&31)+96,(n&31)+96);t.details.language={value:a,offset:t.details.language_bits.offset,length:2},delete t.details.language_bits}e.readNullTerminatedString("notice"),e.finalize()}var go={cprt:{name:"Copyright Box",text:"Contains a copyright declaration for the track or presentation.",ref:"ISO/IEC 14496-12, 8.10.2"},"cprt@language":{text:"The ISO-639-2/T language code for the notice text.",ref:"ISO/IEC 14496-12, 8.10.2.3"},"cprt@notice":{text:"The copyright notice text.",ref:"ISO/IEC 14496-12, 8.10.2.3"}};function ho(t,i){let e=new g(t,i),{version:n}=e.readVersionAndFlags();if(n===null){e.finalize();return}n===1?(e.readBigUint64("compositionToDTSShift"),e.readBigUint64("leastDecodeToDisplayDelta"),e.readBigUint64("greatestDecodeToDisplayDelta"),e.readBigUint64("compositionStartTime"),e.readBigUint64("compositionEndTime")):(e.readUint32("compositionToDTSShift"),e.readUint32("leastDecodeToDisplayDelta"),e.readUint32("greatestDecodeToDisplayDelta"),e.readUint32("compositionStartTime"),e.readUint32("compositionEndTime")),e.finalize()}var xo={cslg:{name:"Composition to Decode",text:"Provides a mapping from the composition timeline to the decoding timeline.",ref:"ISO/IEC 14496-12, 8.6.1.4"},"cslg@compositionToDTSShift":{text:"A shift value that, when added to composition times, guarantees CTS >= DTS.",ref:"ISO/IEC 14496-12, 8.6.1.4.3"},"cslg@leastDecodeToDisplayDelta":{text:"The smallest composition time offset found in the track.",ref:"ISO/IEC 14496-12, 8.6.1.4.3"}};function yo(t,i){let e=new g(t,i);e.readVersionAndFlags();let n=(t.size-e.offset)/2;if(t.details.sample_count={value:n,offset:0,length:0},n>0){for(let o=0;o<n&&!e.stopped;o++)o<10?e.readUint16(`priority_${o+1}`):e.offset+=2;n>10&&(t.details["...more_entries"]={value:`${n-10} more entries not shown but parsed`,offset:0,length:0})}e.finalize()}var bo={stdp:{name:"Degradation Priority",text:"Contains the degradation priority for each sample in the track.",ref:"ISO/IEC 14496-12, 8.5.3"},"stdp@priority_1":{text:"The priority for the first sample. Lower values are typically more important.",ref:"ISO/IEC 14496-12, 8.5.3.3"}};function _o(t,i){let e=new g(t,i),{flags:n}=e.readVersionAndFlags();n!==null&&(n&1)===0&&e.readNullTerminatedString("location"),e.finalize()}function vo(t,i){let e=new g(t,i);e.readVersionAndFlags(),e.readNullTerminatedString("name"),e.readNullTerminatedString("location"),e.finalize()}var So={dref:{name:"Data Reference Box",text:"A container for data references (e.g., URLs) that declare the location of media data.",ref:"ISO/IEC 14496-12, 8.7.2"},"url ":{name:"Data Entry URL Box",text:"An entry in the Data Reference Box containing a URL.",ref:"ISO/IEC 14496-12, 8.7.2.1"},"url @location":{text:'The URL where the media data is located. If the "self-contained" flag is set, this field is absent.',ref:"ISO/IEC 14496-12, 8.7.2.3"},"urn ":{name:"Data Entry URN Box",text:"An entry in the Data Reference Box containing a URN.",ref:"ISO/IEC 14496-12, 8.7.2.1"}};function To(t,i){let e=new g(t,i);e.skip(6,"reserved_sample_entry"),e.readUint16("data_reference_index"),e.skip(2,"pre_defined_1"),e.skip(2,"reserved_2"),e.skip(12,"pre_defined_2"),e.readUint16("width"),e.readUint16("height");let n=e.readUint32("horizresolution_fixed_point");n!==null&&(t.details.horizresolution={...t.details.horizresolution_fixed_point,value:(n/65536).toFixed(2)+" dpi"},delete t.details.horizresolution_fixed_point);let a=e.readUint32("vertresolution_fixed_point");a!==null&&(t.details.vertresolution={...t.details.vertresolution_fixed_point,value:(a/65536).toFixed(2)+" dpi"},delete t.details.vertresolution_fixed_point),e.readUint32("reserved_3"),e.readUint16("frame_count");let o=e.offset;if(e.checkBounds(32)){let s=e.view.getUint8(e.offset),r=new Uint8Array(e.view.buffer,e.view.byteOffset+e.offset+1,s),l=new TextDecoder().decode(r);t.details.compressorname={value:l,offset:e.box.offset+o,length:32},e.offset+=32}e.readUint16("depth"),e.readInt16("pre_defined_3")}var Co={avc1:{name:"AVC Sample Entry",text:"Defines the coding type and initialization information for an H.264/AVC video track.",ref:"ISO/IEC 14496-12, 12.1.3"},"avc1@data_reference_index":{text:"Index to the Data Reference Box, indicating where the media data is stored.",ref:"ISO/IEC 14496-12, 8.5.2.2"},"avc1@width":{text:"The width of the video in pixels.",ref:"ISO/IEC 14496-12, 12.1.3.2"},"avc1@height":{text:"The height of the video in pixels.",ref:"ISO/IEC 14496-12, 12.1.3.2"},"avc1@horizresolution":{text:"Horizontal resolution of the image in pixels-per-inch (16.16 fixed point). Default is 72 dpi.",ref:"ISO/IEC 14496-12, 12.1.3.2"},"avc1@vertresolution":{text:"Vertical resolution of the image in pixels-per-inch (16.16 fixed point). Default is 72 dpi.",ref:"ISO/IEC 14496-12, 12.1.3.2"},"avc1@frame_count":{text:"The number of frames of compressed video stored in each sample. Typically 1.",ref:"ISO/IEC 14496-12, 12.1.3.2"},"avc1@compressorname":{text:"An informative name for the compressor used. A Pascal-style string within a 32-byte field.",ref:"ISO/IEC 14496-12, 12.1.3.2"},"avc1@depth":{text:"The color depth of the video. 0x0018 (24) is typical for color with no alpha.",ref:"ISO/IEC 14496-12, 12.1.3.2"}};function Io(t,i){let e=new g(t,i);e.skip(6,"reserved_sample_entry"),e.readUint16("data_reference_index"),e.skip(8,"reserved_audio_entry_1"),e.readUint16("channelcount"),e.readUint16("samplesize"),e.skip(2,"pre_defined"),e.skip(2,"reserved_audio_entry_2");let n=e.readUint32("samplerate_fixed_point");n!==null&&(t.details.samplerate={...t.details.samplerate_fixed_point,value:n>>16},delete t.details.samplerate_fixed_point)}var Eo={mp4a:{name:"MP4 Audio Sample Entry",text:"Defines the coding type and initialization information for an MPEG-4 audio track, typically AAC.",ref:"ISO/IEC 14496-12, 12.2.3"},"mp4a@data_reference_index":{text:"Index to the Data Reference Box, indicating where the media data is stored.",ref:"ISO/IEC 14496-12, 8.5.2.2"},"mp4a@channelcount":{text:"The number of audio channels (e.g., 2 for stereo).",ref:"ISO/IEC 14496-12, 12.2.3.2"},"mp4a@samplesize":{text:"The size of each audio sample in bits. Typically 16.",ref:"ISO/IEC 14496-12, 12.2.3.2"},"mp4a@samplerate":{text:"The sampling rate of the audio in samples per second (the integer part of a 16.16 fixed-point number).",ref:"ISO/IEC 14496-12, 12.2.3.2"}};function Ao(t,i){let e=new g(t,i);e.readUint32("bufferSizeDB"),e.readUint32("maxBitrate"),e.readUint32("avgBitrate"),e.finalize()}var Do={btrt:{name:"Bit Rate Box",text:"Provides bitrate information for the stream, found within a Sample Entry.",ref:"ISO/IEC 14496-12, 8.5.2.2"},"btrt@bufferSizeDB":{text:"The size of the decoding buffer for the elementary stream in bytes.",ref:"ISO/IEC 14496-12, 8.5.2.2"},"btrt@maxBitrate":{text:"The maximum rate in bits/second over any one-second window.",ref:"ISO/IEC 14496-12, 8.5.2.2"},"btrt@avgBitrate":{text:"The average rate in bits/second over the entire presentation.",ref:"ISO/IEC 14496-12, 8.5.2.2"}};function ni(t,i){let e=new g(t,i);e.readRemainingBytes("data"),e.finalize()}var $o={free:{name:"Free Space Box",text:"The contents of this box are irrelevant and may be ignored. It is used to reserve space.",ref:"ISO/IEC 14496-12, 8.1.2"},skip:{name:"Skip Box",text:"An alternative type for a free space box. The contents are irrelevant.",ref:"ISO/IEC 14496-12, 8.1.2"}};function bl(t,i){let e=t.offset,n=0,a,o=0;do{if(a=t.readUint8(`size_byte_${o}`),a===null)return null;n=n<<7|a&127,o++}while(a&128&&o<4);t.box.details[i]={value:n,offset:t.box.offset+e,length:o};for(let s=0;s<o;s++)delete t.box.details[`size_byte_${s}`];return n}function Po(t,i){let e=new g(t,i);e.readVersionAndFlags();let n=e.readUint8("InitialObjectDescriptor_tag");if(n!==2&&n!==3&&n!==16){e.addIssue("warn",`Expected IOD tag (0x02, 0x03, or 0x10), but found ${n}.`),e.readRemainingBytes("unknown_descriptor_data"),e.finalize();return}if(bl(e,"InitialObjectDescriptor_size")===null){e.finalize();return}e.readUint16("objectDescriptorID"),e.readUint8("ODProfileLevelIndication"),e.readUint8("sceneProfileLevelIndication"),e.readUint8("audioProfileLevelIndication"),e.readUint8("visualProfileLevelIndication"),e.readUint8("graphicsProfileLevelIndication"),e.readRemainingBytes("other_descriptors_data"),e.finalize()}var wo={iods:{name:"Initial Object Descriptor",text:"Contains the Initial Object Descriptor as defined in MPEG-4 Systems (ISO/IEC 14496-1). This descriptor is a container for the elementary stream descriptors and other information.",ref:"ISO/IEC 14496-14, 5.5"},"iods@objectDescriptorID":{text:"A 10-bit ID for this Object Descriptor. The top 6 bits are flags.",ref:"ISO/IEC 14496-1, 8.2.2"},"iods@ODProfileLevelIndication":{text:"Indicates the profile and level of the Object Descriptor stream.",ref:"ISO/IEC 14496-1, 8.2.2"}};function Uo(t,i){let e=new g(t,i);e.readVersionAndFlags(),e.readUint32("track_id")}var Mo={trep:{name:"Track Extension Properties",text:"A container box that documents characteristics of the track in subsequent movie fragments.",ref:"ISO/IEC 14496-12, 8.8.15"},"trep@track_id":{text:"The ID of the track for which these extension properties are provided.",ref:"ISO/IEC 14496-12, 8.8.15.3"}};function ko(t,i){let e=new g(t,i);e.readUint32("hSpacing"),e.readUint32("vSpacing"),e.finalize()}var Ro={pasp:{name:"Pixel Aspect Ratio Box",text:"Specifies the pixel aspect ratio of the video.",ref:"ISO/IEC 14496-12, 12.1.4"},"pasp@hSpacing":{text:"The horizontal spacing of a pixel.",ref:"ISO/IEC 14496-12, 12.1.4.1"},"pasp@vSpacing":{text:"The vertical spacing of a pixel.",ref:"ISO/IEC 14496-12, 12.1.4.1"}};function Lo(t,i){let e=new g(t,i),n=e.readString(4,"colour_type");if(n==="nclx"){e.readUint16("colour_primaries"),e.readUint16("transfer_characteristics"),e.readUint16("matrix_coefficients");let a=e.readUint8("full_range_flag_byte");a!==null&&(delete t.details.full_range_flag_byte,t.details.full_range_flag={value:a>>7&1,offset:e.box.offset+e.offset-1,length:.125})}else(n==="rICC"||n==="prof")&&e.readRemainingBytes("ICC_profile");e.finalize()}var Bo={colr:{name:"Colour Information Box",text:"Provides information about the colour representation of the video, such as primaries and transfer characteristics.",ref:"ISO/IEC 14496-12, 12.1.5"},"colr@colour_type":{text:'The type of color information provided (e.g., "nclx", "rICC", "prof").',ref:"ISO/IEC 14496-12, 12.1.5.3"}};function Fo(t,i){new g(t,i).readVersionAndFlags()}var zo={meta:{name:"Metadata Box",text:"A container for descriptive or annotative metadata.",ref:"ISO/IEC 14496-12, 8.11.1"}};function Ho(t,i){let e=new g(t,i);e.skip(6,"reserved_sample_entry"),e.readUint16("data_reference_index"),e.skip(16,"pre_defined_and_reserved"),e.readUint16("width"),e.readUint16("height"),e.readUint32("horizresolution"),e.readUint32("vertresolution"),e.readUint32("reserved_3"),e.readUint16("frame_count"),e.skip(32,"compressorname"),e.readUint16("depth"),e.readInt16("pre_defined_3")}var Vo={encv:{name:"Encrypted Video Sample Entry",text:"A sample entry wrapper indicating that the video stream is encrypted. It contains a Protection Scheme Information (`sinf`) box.",ref:"ISO/IEC 14496-12, 8.12"}};function No(t,i){let e=new g(t,i),{flags:n}=e.readVersionAndFlags();if(n===null){e.finalize();return}let a=e.readUint32("sample_count");if(t.samples=[],a!==null)for(let s=0;s<a&&!e.stopped;s++){let r={iv:null,subsamples:[]};if(e.checkBounds(8)){let l=new Uint8Array(e.view.buffer,e.view.byteOffset+e.offset,8);r.iv=l,e.offset+=8}else break;if((n&2)!==0&&e.checkBounds(2)){let l=e.view.getUint16(e.offset);r.subsample_count=l,e.offset+=2;for(let c=0;c<l;c++)if(e.checkBounds(6)){let f=e.view.getUint16(e.offset),m=e.view.getUint32(e.offset+2);r.subsamples.push({BytesOfClearData:f,BytesOfProtectedData:m}),e.offset+=6}else{e.stopped=!0;break}}t.samples.push(r)}e.finalize()}var Oo={senc:{name:"Sample Encryption Box",text:"Contains sample-specific encryption information, such as Initialization Vectors (IVs) and sub-sample encryption data for Common Encryption (CENC).",ref:"ISO/IEC 23001-7, 7.1"},"senc@sample_count":{text:"The number of samples described in this box.",ref:"ISO/IEC 23001-7, 7.1"},"senc@sample_1_iv":{text:"The Initialization Vector for the first sample. Its size is defined in the 'tenc' box (typically 8 or 16 bytes).",ref:"ISO/IEC 23001-7, 7.2"},"senc@sample_1_subsample_count":{text:"The number of subsamples (clear/encrypted pairs) in the first sample.",ref:"ISO/IEC 23001-7, 7.1"},"senc@sample_1_subsample_1_clear_bytes":{text:"The number of unencrypted bytes in the first subsample.",ref:"ISO/IEC 23001-7, 7.1"},"senc@sample_1_subsample_1_encrypted_bytes":{text:"The number of encrypted bytes in the first subsample.",ref:"ISO/IEC 23001-7, 7.1"}};function Xo(t,i){let e=new g(t,i);e.skip(6,"reserved_sample_entry"),e.readUint16("data_reference_index"),e.skip(8,"reserved_audio_entry_1"),e.readUint16("channelcount"),e.readUint16("samplesize"),e.skip(2,"pre_defined"),e.skip(2,"reserved_audio_entry_2");let n=e.readUint32("samplerate_fixed_point");n!==null&&(t.details.samplerate={...t.details.samplerate_fixed_point,value:n>>16},delete t.details.samplerate_fixed_point)}var jo={enca:{name:"Encrypted Audio Sample Entry",text:"A sample entry wrapper indicating that the audio stream is encrypted. It contains a Protection Scheme Information (`sinf`) box.",ref:"ISO/IEC 14496-12, 8.12"}};function Go(t,i){let e=new g(t,i),{version:n}=e.readVersionAndFlags();if(n===null){e.finalize();return}if(n===0){e.skip(2,"reserved_1");let a=e.readUint8("default_isProtected"),o=e.readUint8("default_Per_Sample_IV_Size"),s=[];for(let l=0;l<16;l++){let c=e.readUint8(`kid_byte_${l}`);if(c!==null)s.push(c.toString(16).padStart(2,"0"));else{e.finalize();return}}let r=t.details.kid_byte_0?.offset;if(r!==void 0){t.details.default_KID={value:s.join(""),offset:r,length:16};for(let l=0;l<16;l++)delete t.details[`kid_byte_${l}`]}if(a===1&&o===0){let l=e.readUint8("default_constant_IV_size");l!==null&&e.skip(l,"default_constant_IV")}}else if(n===1){e.skip(2,"reserved_1");let a=e.readUint8("packed_fields_1");a!==null&&(delete t.details.packed_fields_1,t.details.default_crypt_byte_block={value:a>>4&15,offset:e.box.offset+e.offset-1,length:.5},t.details.default_skip_byte_block={value:a&15,offset:e.box.offset+e.offset-1,length:.5}),e.readUint8("default_isProtected"),e.readUint8("default_Per_Sample_IV_Size");let o=[];for(let r=0;r<16;r++){let l=e.readUint8(`kid_byte_${r}`);if(l!==null)o.push(l.toString(16).padStart(2,"0"));else{e.finalize();return}}let s=t.details.kid_byte_0?.offset;if(s!==void 0){t.details.default_KID={value:o.join(""),offset:s,length:16};for(let r=0;r<16;r++)delete t.details[`kid_byte_${r}`]}}else e.addIssue("warn",`Unsupported tenc version ${n}.`),e.readRemainingBytes("unsupported_tenc_data");e.finalize()}var Wo={tenc:{name:"Track Encryption Box",text:"Contains default encryption parameters for samples in a track, as defined by the Common Encryption (CENC) specification.",ref:"ISO/IEC 23001-7, 8.1"},"tenc@default_isProtected":{text:"Indicates if samples are encrypted by default (1) or not (0).",ref:"ISO/IEC 23001-7, 8.1"},"tenc@default_Per_Sample_IV_Size":{text:"The size in bytes of the Initialization Vector (IV) for each sample. If 0, a constant IV is used.",ref:"ISO/IEC 23001-7, 8.1"},"tenc@default_KID":{text:"The default Key ID for the samples in this track.",ref:"ISO/IEC 23001-7, 8.1"},"tenc@default_crypt_byte_block":{text:"(Version 1) The number of encrypted blocks in a pattern.",ref:"ISO/IEC 23001-7 (First Edition)"},"tenc@default_skip_byte_block":{text:"(Version 1) The number of clear blocks in a pattern.",ref:"ISO/IEC 23001-7 (First Edition)"}};function qo(t,i){let e=new g(t,i);e.readVersionAndFlags(),e.readRemainingBytes("id3v2_data"),e.finalize()}var Ko={ID32:{name:"ID3v2 Metadata Box",text:"A box containing ID3 version 2 metadata tags. This is a common but non-standard box often found in files created by tools like FFmpeg, typically within a `udta` or `meta` box.",ref:"User-defined"}};function Yo(t,i){let e=new g(t,i),{version:n}=e.readVersionAndFlags();if(n===null){e.finalize();return}n===1?(e.readUint32("timescale"),e.readBigUint64("presentation_time")):(e.readUint32("timescale"),e.readUint32("presentation_time_delta")),e.readUint32("event_duration"),e.readUint32("id"),e.readNullTerminatedString("scheme_id_uri"),e.readNullTerminatedString("value");let a=t.size-e.offset;a>0&&e.skip(a,"message_data"),e.finalize()}var Jo={emsg:{name:"Event Message Box",text:"Contains an event message for in-band signaling, such as SCTE-35 ad markers.",ref:"ISO/IEC 23009-1, Clause 5.10.3.3"},"emsg@version":{text:"Version of this box (0 or 1). Version 1 uses a 64-bit absolute presentation_time.",ref:"ISO/IEC 23009-1, Clause 5.10.3.3.2"},"emsg@presentation_time":{text:"(Version 1) The absolute presentation time of the event on the media timeline, in timescale units.",ref:"ISO/IEC 23009-1, Clause 5.10.3.3.2"},"emsg@presentation_time_delta":{text:"(Version 0) The presentation time delta of the event relative to the earliest presentation time in the segment.",ref:"ISO/IEC 23009-1, Clause 5.10.3.3.2"},"emsg@timescale":{text:"The timescale for this event, in ticks per second.",ref:"ISO/IEC 23009-1, Clause 5.10.3.3.2"},"emsg@event_duration":{text:"The duration of the event in timescale units.",ref:"ISO/IEC 23009-1, Clause 5.10.3.3.2"},"emsg@id":{text:"A unique identifier for this event instance.",ref:"ISO/IEC 23009-1, Clause 5.10.3.3.2"},"emsg@scheme_id_uri":{text:'A URI identifying the scheme of the event message (e.g., "urn:scte:scte35:2014:xml+bin").',ref:"ISO/IEC 23009-1, Clause 5.10.3.3.2"},"emsg@value":{text:"A value that distinguishes this event stream from others with the same scheme.",ref:"ISO/IEC 23009-1, Clause 5.10.3.3.2"},"emsg@message_data":{text:"The payload of the event message, with syntax defined by the scheme.",ref:"ISO/IEC 23009-1, Clause 5.10.3.3.2"}};function _l(t,i){let e=new g(t,i);e.readNullTerminatedString("content_type"),e.offset<t.size&&e.readNullTerminatedString("content_encoding"),e.finalize()}function vl(t,i){let e=new g(t,i);e.skip(6,"reserved_sample_entry"),e.readUint16("data_reference_index"),e.readNullTerminatedString("namespace"),e.readNullTerminatedString("schema_location"),e.readNullTerminatedString("auxiliary_mime_types")}var Qo={stpp:vl,mime:_l},Zo={stpp:{name:"XML Subtitle Sample Entry",text:"Defines the coding for an XML-based subtitle track, such as TTML/IMSC1.",ref:"ISO/IEC 14496-12, 12.4.3"},"stpp@namespace":{text:"A URI defining the namespace of the XML schema for the subtitle format.",ref:"ISO/IEC 14496-12, 12.4.3.2"},"stpp@schema_location":{text:"The location of the schema for the namespace.",ref:"ISO/IEC 14496-12, 12.4.3.2"},"stpp@auxiliary_mime_types":{text:"A list of MIME types for auxiliary data (e.g., images) referenced by the XML.",ref:"ISO/IEC 14496-12, 12.4.3.2"},mime:{name:"MIME Type Box",text:"Stores the MIME type of the subtitle document, including any codecs parameters.",ref:"ISO/IEC 14496-30"},"mime@content_type":{text:'The MIME type string, e.g., "application/ttml+xml;codecs=im1t".',ref:"ISO/IEC 14496-30"}};var Ru={ftyp:ti,styp:ti,mvhd:Fn,mfhd:Hn,tfhd:Nn,tfdt:Xn,trun:Gn,sidx:qn,tkhd:Yn,mdhd:Qn,hdlr:ea,vmhd:ia,smhd:Ca,stsd:aa,stts:sa,ctts:Da,stsc:la,stsz:ca,stz2:Pa,stco:pa,elst:ua,trex:ha,pssh:Ea,avcC:_a,avc1:To,mp4a:Io,esds:Sa,btrt:Ao,sbgp:Ua,tref:ka,...Ra,subs:Ba,saiz:za,saio:Va,sinf:Oa,frma:ja,schm:Wa,schi:Ka,stss:Ja,sgpd:Za,mehd:to,sdtp:no,mfra:oo,tfra:ro,mfro:co,pdin:po,cprt:uo,cslg:ho,stdp:yo,"url ":_o,"urn ":vo,free:ni,skip:ni,iods:Po,trep:Uo,pasp:ko,colr:Lo,meta:Fo,encv:Ho,senc:No,enca:Xo,tenc:Go,ID32:qo,emsg:Yo,...Qo},Sl={...ya,...Bn,...ga,...ta,...zn,...Vn,...io,...On,...jn,...Wn,...Kn,...Jn,...Zn,...na,...Ia,...oa,...ra,...$a,...da,...fa,...wa,...ma,...Qa,...eo,...xa,...Aa,...va,...Co,...Eo,...Ta,...Do,...Ma,...La,...Fa,...Ha,...Na,...Xa,...Ga,...qa,...Ya,...ao,...so,...lo,...fo,...mo,...go,...xo,...bo,...So,...$o,...wo,...Mo,...Ro,...Bo,...zo,...Vo,...Oo,...jo,...Wo,...Ko,...Jo,...Zo};function Pe(){return Sl}D();var Tl=t=>{let i={pass:"text-green-400",fail:"text-red-400",warn:"text-yellow-400",info:"text-blue-400"},e={pass:"\u2713",fail:"\u2717",warn:"\u26A0\uFE0F",info:"\u2139"};return d`
        <tr class="hover:bg-gray-700/50">
            <td class="p-2 border border-gray-700 w-12 text-center">
                <span class="${i[t.status]} font-bold"
                    >${e[t.status]}</span
                >
            </td>
            <td class="p-2 border border-gray-700 text-gray-300">
                ${t.text}
            </td>
            <td class="p-2 border border-gray-700 text-gray-400 break-words">
                ${t.details}
            </td>
        </tr>
    `},Cl=t=>{let i=t.semanticData?.get("cmafValidation");return i?d`
        <div class="mt-4">
            <h4 class="text-md font-bold mb-2">CMAF Conformance</h4>
            <div
                class="bg-gray-900/50 rounded border border-gray-700/50 overflow-hidden"
            >
                <table class="w-full text-left text-xs table-auto">
                    <thead class="bg-gray-800/50">
                        <tr>
                            <th class="p-2 font-semibold text-gray-400">
                                Status
                            </th>
                            <th class="p-2 font-semibold text-gray-400">
                                Check
                            </th>
                            <th class="p-2 font-semibold text-gray-400">
                                Details
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-700/50">
                        ${i.map(Tl)}
                    </tbody>
                </table>
            </div>
        </div>
    `:d` <div class="text-sm text-gray-500 p-4 text-center">
            Running CMAF conformance checks...
        </div>`},es=t=>{let i=Pe(),e=i[t.type]||{},n=d`<div
        class="font-semibold font-mono p-2 bg-gray-900/50 rounded-t-md border-b border-gray-600 flex items-center gap-2"
    >
        ${t.issues&&t.issues.length>0?d`<svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 text-yellow-400 flex-shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  title="${t.issues.map(s=>`[${s.type}] ${s.message}`).join(`
`)}"
              >
                  <path
                      fill-rule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clip-rule="evenodd"
                  />
              </svg>`:""}
        <span
            class="text-emerald-300 ${e.text?k:""}"
            data-tooltip="${e.text||""}"
            data-iso="${e.ref||""}"
            >${t.type}</span
        >
        <span class="text-gray-500 text-xs"
            >${e.name?`(${e.name}) `:""}(${t.size}
            bytes)</span
        >
    </div>`,a=Object.keys(t.details).length>0?d`<div class="p-2">
                  <table class="text-xs border-collapse w-full table-auto">
                      <tbody>
                          ${Object.entries(t.details).map(([s,r])=>{let l=i[`${t.type}@${s}`];return d`<tr>
                                  <td
                                      class="border border-gray-700 p-2 text-gray-400 w-1/3 ${l?k:""}"
                                      data-tooltip="${l?.text||""}"
                                      data-iso="${l?.ref||""}"
                                  >
                                      ${s}
                                  </td>
                                  <td
                                      class="border border-gray-700 p-2 text-gray-200 font-mono break-all"
                                  >
                                      ${r.value}
                                  </td>
                              </tr>`})}
                      </tbody>
                  </table>
              </div>`:"",o=t.children.length>0?d`<div class="pl-4 mt-2 border-l-2 border-gray-600">
                  <ul class="list-none space-y-2">
                      ${t.children.map(s=>d`<li>${es(s)}</li>`)}
                  </ul>
              </div>`:"";return d`<div class="border border-gray-700 rounded-md bg-gray-800">
        ${n}
        <div class="space-y-2">${a}</div>
        ${o}
    </div>`},ts=t=>{let{streams:i,activeStreamId:e}=_.getState(),n=i.find(a=>a.id===e);return d`
        <div>
            ${n?Cl(n):""}
            <ul class="list-none p-0 space-y-2 mt-4">
                ${t.boxes.map(a=>d`<li>${es(a)}</li>`)}
            </ul>
        </div>
    `};E();var ft=(t,i)=>i==null?"":d`
        <div class="text-xs">
            <span class="block text-gray-400 mb-0.5">${t}</span>
            <span class="block font-semibold font-mono text-gray-200"
                >${i}</span
            >
        </div>
    `,is=t=>{let{summary:i,packets:e}=t.data,n=Object.keys(i.programMap)[0],a=n?i.programMap[n]:null,o=e.reduce((r,l)=>(r[l.pid]=(r[l.pid]||0)+1,r),{}),s={};return a&&(Object.assign(s,a.streams),s[i.pcrPid]=`${s[i.pcrPid]||"Unknown"} (PCR)`),s[0]="PAT",i.pmtPids.forEach(r=>s[r]="PMT"),d`
        <div
            class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 bg-gray-900 border border-gray-700 rounded p-3 mb-4"
        >
            ${ft("Total Packets",i.totalPackets)}
            ${ft("PCR PID",i.pcrPid||"N/A")}
            ${a?ft("Program #",a.programNumber):""}
            ${i.errors.length>0?ft("Errors",i.errors.join(", ")):""}
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
                    ${Object.entries(o).sort(([r],[l])=>parseInt(r,10)-parseInt(l,10)).map(([r,l])=>d`
                                <tr>
                                    <td class="p-2 font-mono">
                                        ${r}
                                        (0x${parseInt(r).toString(16).padStart(4,"0")})
                                    </td>
                                    <td class="p-2 font-mono">${l}</td>
                                    <td class="p-2">
                                        ${s[r]||"Unknown/Data"}
                                    </td>
                                </tr>
                            `)}
                </tbody>
            </table>
        </div>
    `};function Il(t,i){let e=[],n=new Set([...Object.keys(t),...Object.keys(i)]);for(let a of n){let o=t[a],s=i[a],r=JSON.stringify(o)!==JSON.stringify(s);e.push({key:a,val1:o!==void 0?o:"---",val2:s!==void 0?s:"---",isDifferent:r})}return e}var El=(t,i)=>{if(!t.data.summary||!i.data.summary)return d`<p class="fail">
            Cannot compare segments; summary data is missing.
        </p>`;let e=Il(t.data.summary,i.data.summary);return d`
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
            ${e.map(n=>d`
                    <div
                        class="p-2 border-b border-r border-gray-700 font-medium text-gray-400"
                    >
                        ${n.key}
                    </div>
                    <div
                        class="p-2 border-b border-r border-gray-700 font-mono ${n.isDifferent?"bg-red-900/50 text-red-300":""}"
                    >
                        ${n.val1}
                    </div>
                    <div
                        class="p-2 border-b border-r border-gray-700 font-mono ${n.isDifferent?"bg-red-900/50 text-red-300":""}"
                    >
                        ${n.val2}
                    </div>
                `)}
        </div>
    `};function ai(t,i=null){if(t?.error)return d`<p class="text-red-400 p-4">
            Segment could not be parsed:
            <span class="block font-mono bg-gray-900 p-2 mt-2 rounded"
                >${t.error}</span
            >
        </p>`;if(!t)return d`<p class="text-gray-400 p-4">
            Segment data not available or is currently loading.
        </p>`;if(i)return El(t,i);let e=t.format,a=e==="isobmff"||e==="ts"?d`<svg
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
          </svg>`:d`<svg
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
          </svg>`,o={isobmff:"ISO Base Media File Format",ts:"MPEG-2 Transport Stream"}[e]||"Unknown Format",s;switch(e){case"isobmff":s=ts(t.data);break;case"ts":s=is(t);break;default:s=d`<p class="fail">
                Analysis view for format '${e}' is not supported.
            </p>`;break}return d`
        <div
            class="flex items-center gap-2 mb-4 p-2 bg-gray-900/50 rounded-md border border-gray-700"
        >
            ${a}
            <span class="font-semibold text-gray-300"
                >Format: ${o}</span
            >
        </div>
        ${s}
    `}H();D();function ns(t){t&&I.updateStream(t.id,{isPolling:!t.isPolling})}function as(t){if(!t)return;if(!t.originalUrl){x.dispatch("ui:show-status",{message:"Cannot reload a manifest from a local file.",type:"warn",duration:4e3});return}let i=t.activeMediaPlaylistUrl||t.originalUrl;x.dispatch("ui:show-status",{message:`Reloading manifest for ${t.name}...`,type:"info",duration:2e3}),t.protocol==="hls"&&t.activeMediaPlaylistUrl?x.dispatch("hls:media-playlist-reload",{streamId:t.id,url:i}):x.dispatch("manifest:force-reload",{streamId:t.id})}var Al,Dl=()=>{let{streams:t,activeStreamId:i}=_.getState(),e=t.find(a=>a.id===i);if(!e||!e.originalUrl){x.dispatch("ui:show-status",{message:"Cannot save a stream loaded from a local file.",type:"warn"});return}let n=prompt("Enter a name for this preset:",e.name||new URL(e.originalUrl).hostname);n&&at({name:n,url:e.originalUrl,protocol:e.protocol,type:e.manifest.type==="dynamic"?"live":"vod"})},os=t=>{if(!t)return d``;let i=t.manifest?.type==="dynamic",e=t.isPolling,n=i?d`
              <button
                  @click=${()=>ns(t)}
                  class="font-bold text-sm py-2 px-4 rounded-md transition-colors text-white ${e?"bg-red-600 hover:bg-red-700":"bg-blue-600 hover:bg-blue-700"}"
              >
                  ${e?"Stop Polling":"Start Polling"}
              </button>
          `:"";return d`
        ${n}
        <button
            @click=${()=>as(t)}
            class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
        >
            Reload
        </button>
        <button
            @click=${Dl}
            class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
            title="Save the current stream URL as a preset"
        >
            Save Stream
        </button>
    `};function ss(t){Al=t,x.subscribe("ui:request-segment-analysis",({url:i})=>{let e=_.getState().segmentCache.get(i);Jt({title:"Segment Analysis",url:i,contentTemplate:ai(e?.parsedData)})}),x.subscribe("ui:request-segment-comparison",({urlA:i,urlB:e})=>{let{segmentCache:n}=_.getState(),a=n.get(i),o=n.get(e);Jt({title:"Segment Comparison",url:"Comparing Segment A vs. Segment B",contentTemplate:ai(a?.parsedData,o?.parsedData)})})}H();D();function rs(){x.subscribe("analysis:started",()=>{I.startAnalysis()}),x.subscribe("analysis:failed",()=>{I.startAnalysis()})}D();H();var ls=[{name:"Presentation Type",category:"Core Streaming",desc:"Defines if the stream is live (`dynamic`) or on-demand (`static`).",isoRef:"DASH: 5.3.1.2"},{name:"MPD Locations",category:"Core Streaming",desc:"Provides alternative URLs where the MPD can be fetched, enabling CDN redundancy.",isoRef:"DASH: 5.3.1.2"},{name:"Scoped Profiles",category:"Core Streaming",desc:"Declares profile conformance for specific Adaptation Sets or Representations, allowing for mixed-profile manifests.",isoRef:"DASH: 5.3.7.2"},{name:"Multi-Period",category:"Core Streaming",desc:"The presentation is split into multiple, independent periods. Commonly used for Server-Side Ad Insertion (SSAI).",isoRef:"DASH: 5.3.2"},{name:"Content Protection",category:"Core Streaming",desc:"Indicates that the content is encrypted using one or more schemes like CENC.",isoRef:"DASH: 5.8.4.1"},{name:"Client Authentication",category:"Core Streaming",desc:"Signals that client authentication is required to access the content, typically via an EssentialProperty descriptor.",isoRef:"DASH: 5.8.5.11"},{name:"Content Authorization",category:"Core Streaming",desc:"Signals that content authorization is required to access the content, often in conjunction with Client Authentication.",isoRef:"DASH: 5.8.5.11"},{name:"Segment Templates",category:"Timeline & Segment Management",desc:"Segment URLs are generated using a template, typically with $Number$ or $Time$ placeholders.",isoRef:"DASH: 5.3.9.4"},{name:"Segment Timeline",category:"Timeline & Segment Management",desc:"Provides explicit timing and duration for each segment via <S> elements, allowing for variable segment sizes.",isoRef:"DASH: 5.3.9.6"},{name:"Segment List",category:"Timeline & Segment Management",desc:"Segment URLs are listed explicitly in the manifest. Common for VOD content.",isoRef:"DASH: 5.3.9.3"},{name:"Representation Index",category:"Timeline & Segment Management",desc:"Provides an index for the entire Representation in a single segment, separate from media segments.",isoRef:"DASH: 5.3.9.2.2"},{name:"MPD Chaining",category:"Timeline & Segment Management",desc:"The manifest indicates that another MPD should be played after this one concludes, allowing for programmatic playlists of presentations.",isoRef:"DASH: 5.11"},{name:"Failover Content",category:"Timeline & Segment Management",desc:"Signals time ranges where content may be replaced by failover content (e.g., slate) due to encoding errors.",isoRef:"DASH: 5.3.9.7"},{name:"Low Latency Streaming",category:"Live & Dynamic",desc:"The manifest includes features for low-latency playback, such as chunked transfer hints or specific service descriptions.",isoRef:"DASH: Annex K.3.2"},{name:"Manifest Patch Updates",category:"Live & Dynamic",desc:"Allows efficient manifest updates by sending only the changed parts of the manifest.",isoRef:"DASH: 5.15"},{name:"MPD Events",category:"Live & Dynamic",desc:"The manifest contains one or more <EventStream> elements, allowing timed metadata to be communicated to the client via the MPD.",isoRef:"DASH: 5.10.2"},{name:"Inband Events",category:"Live & Dynamic",desc:'The manifest signals that event messages ("emsg" boxes) are present within the media segments themselves, allowing for tightly synchronized metadata.',isoRef:"DASH: 5.10.3"},{name:"Producer Reference Time",category:"Live & Dynamic",desc:"Provides a mapping between media timestamps and a wall-clock production time, enabling latency measurement and control.",isoRef:"DASH: 5.12"},{name:"UTC Timing Source",category:"Live & Dynamic",desc:"Provides a source for clients to synchronize their wall-clock time, crucial for live playback.",isoRef:"DASH: 5.8.4.11"},{name:"Leap Second Information",category:"Live & Dynamic",desc:"Provides information on leap seconds to ensure accurate time calculations across time zones and daylight saving changes.",isoRef:"DASH: 5.13"},{name:"Dependent Representations",category:"Advanced Content",desc:"Uses Representations that depend on others for decoding, enabling scalable video coding (SVC) or multi-view coding (MVC).",isoRef:"DASH: 5.3.5.2"},{name:"Associated Representations",category:"Advanced Content",desc:"Signals a relationship between representations, such as a video description track associated with a main video track.",isoRef:"DASH: 5.3.5.2"},{name:"Trick Modes",category:"Advanced Content",desc:"Provides special tracks (e.g. I-Frame only) to enable efficient fast-forward and rewind.",isoRef:"DASH: 5.3.6"},{name:"Adaptation Set Switching",category:"Client Guidance & Optimization",desc:"Signals that a client can seamlessly switch between Representations in different Adaptation Sets (e.g., for different codecs).",isoRef:"DASH: 5.3.3.5"},{name:"Service Description",category:"Client Guidance & Optimization",desc:"Provides guidance to the client on latency targets, playback rates, and quality/bandwidth constraints for the service.",isoRef:"DASH: Annex K"},{name:"Resync Points",category:"Client Guidance & Optimization",desc:"Signals the presence of resynchronization points within segments to allow for faster startup or recovery after a stall.",isoRef:"DASH: 5.3.13"},{name:"Initialization Sets",category:"Client Guidance & Optimization",desc:"Defines a common set of media properties that apply across multiple Periods, allowing a client to establish a decoding environment upfront.",isoRef:"DASH: 5.3.12"},{name:"Selection Priority",category:"Client Guidance & Optimization",desc:"Provides a numeric priority for Adaptation Sets to guide client selection logic, where higher numbers are preferred.",isoRef:"DASH: 5.3.7.2"},{name:"Adaptation Set Grouping",category:"Client Guidance & Optimization",desc:"Groups Adaptation Sets to signal that they are mutually exclusive (e.g., different camera angles).",isoRef:"DASH: 5.3.3.1"},{name:"Bitstream Switching",category:"Client Guidance & Optimization",desc:"Signals that a client can switch between Representations without re-initializing the media decoder, enabling faster, more efficient switching.",isoRef:"DASH: 5.3.3.2"},{name:"Segment Profiles",category:"Client Guidance & Optimization",desc:"Specifies profiles that media segments conform to, providing more granular compatibility information.",isoRef:"DASH: 5.3.7.2"},{name:"Media Stream Structure",category:"Client Guidance & Optimization",desc:"Signals that different Representations share a compatible internal structure, simplifying seamless switching.",isoRef:"DASH: 5.3.5.2"},{name:"Max SAP Period",category:"Client Guidance & Optimization",desc:"Specifies the maximum time between stream access points (SAPs), allowing clients to better manage seeking and buffering.",isoRef:"DASH: 5.3.7.2"},{name:"Starts with SAP",category:"Client Guidance & Optimization",desc:"Indicates that segments begin with a Stream Access Point (SAP), which greatly simplifies switching and seeking logic.",isoRef:"DASH: 5.3.7.2"},{name:"Max Playout Rate",category:"Client Guidance & Optimization",desc:"Indicates the maximum playback rate (for trick modes like fast-forward) that the stream supports.",isoRef:"DASH: 5.3.7.2"},{name:"Byte-Range URL Templating",category:"Client Guidance & Optimization",desc:"Provides a template on a BaseURL for clients in environments that do not support HTTP Range headers.",isoRef:"DASH: 5.6.2"},{name:"Essential Properties",category:"Client Guidance & Optimization",desc:"Signals properties that are essential for the client to process for a valid experience.",isoRef:"DASH: 5.8.4.8"},{name:"Supplemental Properties",category:"Client Guidance & Optimization",desc:"Signals supplemental properties that a client may use for optimization.",isoRef:"DASH: 5.8.4.9"},{name:"Metrics",category:"Client Guidance & Optimization",desc:"Signals a request for the client to collect and report playback metrics.",isoRef:"DASH: 5.9"},{name:"Role Descriptors",category:"Accessibility & Metadata",desc:"Uses Role Descriptors to provide alternative tracks for language, commentary, or camera angles.",isoRef:"DASH: 5.8.4.2"},{name:"Subtitles & Captions",category:"Accessibility & Metadata",desc:"Provides text-based tracks for subtitles, closed captions, or other timed text information.",isoRef:"DASH: 5.3.3"},{name:"Asset Identifier",category:"Accessibility & Metadata",desc:"Provides a common identifier for Periods that belong to the same content asset, useful for tracking content across ad breaks.",isoRef:"DASH: 5.8.4.10"},{name:"Subsets",category:"Accessibility & Metadata",desc:"Restricts the combination of Adaptation Sets that can be played simultaneously, for example to prevent incompatible audio and video tracks from being selected.",isoRef:"DASH: 5.3.8"},{name:"Preselections",category:"Accessibility & Metadata",desc:'Defines a complete "experience" by grouping a set of Adaptation Sets (e.g., video + main audio + commentary). Primarily for advanced audio like NGA.',isoRef:"DASH: 5.3.11"},{name:"Labels",category:"Accessibility & Metadata",desc:"Provides human-readable text labels for elements like Representations and Adaptation Sets, which can be used in UI selectors.",isoRef:"DASH: 5.3.10"},{name:"Quality Ranking",category:"Accessibility & Metadata",desc:"Provides a numeric ranking for Representations within an Adaptation Set to guide ABR logic, where lower numbers typically mean higher quality.",isoRef:"DASH: 5.3.5.2"},{name:"Coding Dependency",category:"Accessibility & Metadata",desc:"Signals whether a Representation contains inter-frame dependencies (e.g., P/B-frames) or is entirely self-contained (e.g., I-frame only).",isoRef:"DASH: 5.3.7.2"},{name:"Audio Channel Configuration",category:"Accessibility & Metadata",desc:"Describes the audio channel layout, such as stereo (2.0) or surround sound (5.1).",isoRef:"DASH: 5.8.4.7"},{name:"Scan Type",category:"Accessibility & Metadata",desc:"Indicates whether the video content is progressive or interlaced.",isoRef:"DASH: 5.3.7.2"},{name:"Tag attribute",category:"Accessibility & Metadata",desc:"A generic string attribute that can be used for application-specific logic, such as decoder selection.",isoRef:"DASH: 5.3.7.2"},{name:"Program Information",category:"Accessibility & Metadata",desc:"Provides descriptive metadata about the media presentation, such as title or source.",isoRef:"DASH: 5.7"},{name:"Frame Packing Descriptors",category:"Accessibility & Metadata",desc:"Provides information on 3D video frame packing arrangements.",isoRef:"DASH: 5.8.4.6"},{name:"Rating Descriptors",category:"Accessibility & Metadata",desc:"Provides content rating information (e.g., MPAA ratings).",isoRef:"DASH: 5.8.4.4"},{name:"Viewpoint Descriptors",category:"Accessibility & Metadata",desc:"Provides information on camera viewpoints for multi-view content.",isoRef:"DASH: 5.8.4.5"},{name:"Accessibility Descriptors",category:"Accessibility & Metadata",desc:"Provides information about accessibility features for the content, such as audio descriptions.",isoRef:"DASH: 5.8.4.3"}];var ds=[{name:"Presentation Type",category:"Core Streaming",desc:"Defines if the stream is live (`EVENT`) or on-demand (`VOD`).",isoRef:"HLS: 4.3.3.5"},{name:"Master Playlist",category:"Core Streaming",desc:"The manifest is an HLS master playlist that references multiple variant streams at different bitrates.",isoRef:"HLS: 4.3.4.2"},{name:"Discontinuity",category:"Core Streaming",desc:"The presentation contains discontinuity tags, commonly used for Server-Side Ad Insertion (SSAI).",isoRef:"HLS: 4.3.2.3"},{name:"Content Protection",category:"Core Streaming",desc:"Indicates that the content is encrypted using AES-128 or SAMPLE-AES.",isoRef:"HLS: 4.3.2.4"},{name:"Session Keys",category:"Core Streaming",desc:"Allows encryption keys to be specified in the Master Playlist via #EXT-X-SESSION-KEY, enabling clients to preload keys for faster startup.",isoRef:"HLS: 4.3.4.5"},{name:"Fragmented MP4 Segments",category:"Core Streaming",desc:"Content is structured using fMP4 segments instead of MPEG-2 Transport Stream (TS), indicated by #EXT-X-MAP.",isoRef:"HLS: 4.3.2.5"},{name:"Independent Segments",category:"Timeline & Segment Management",desc:"The playlist uses #EXT-X-INDEPENDENT-SEGMENTS, indicating that all media samples in a segment can be decoded without information from other segments.",isoRef:"HLS: 4.3.5.1"},{name:"Date Ranges / Timed Metadata",category:"Live & Dynamic",desc:"The manifest includes timed metadata via #EXT-X-DATERANGE, typically used for ad insertion signaling (SCTE-35).",isoRef:"HLS: 4.3.2.7"},{name:"Low-Latency HLS",category:"Live & Dynamic",desc:"Uses modern HLS features for reduced latency, such as Partial Segments (EXT-X-PART), Preload Hinting (EXT-X-PRELOAD-HINT), and Server Control.",isoRef:"HLS 2nd Ed: 4.4.3.7, 4.4.3.8, 4.4.4.9, 4.4.5.3"},{name:"Playlist Delta Updates",category:"Live & Dynamic",desc:"The server can provide partial playlist updates using the #EXT-X-SKIP tag, reducing download size for live streams.",isoRef:"HLS 2nd Ed: 4.4.5.2, 6.2.5.1"},{name:"Variable Substitution",category:"Live & Dynamic",desc:"Uses #EXT-X-DEFINE to create playlist variables, allowing for dynamic generation of URIs and attributes.",isoRef:"HLS 2nd Ed: 4.4.2.3"},{name:"Content Steering",category:"Live & Dynamic",desc:"Provides a mechanism for servers to steer clients to alternate servers for redundancy and load balancing.",isoRef:"HLS 2nd Ed: 4.4.6.6"},{name:"I-Frame Playlists",category:"Advanced Content",desc:"Provides special, I-Frame only playlists to enable efficient fast-forward and rewind.",isoRef:"HLS: 4.3.4.3"},{name:"Advanced Metadata & Rendition Selection",category:"Advanced Content",desc:"Utilizes advanced attributes (e.g., SCORE, VIDEO-RANGE, STABLE-VARIANT-ID) and semantic tags (e.g., Interstitials) to provide richer context for client ABR and UI logic.",isoRef:"HLS 2nd Ed: Appendices D, G"},{name:"Session Data",category:"Client Guidance & Optimization",desc:"The master playlist carries arbitrary session data using #EXT-X-SESSION-DATA, which can be used for things like analytics or custom configuration.",isoRef:"HLS: 4.3.4.4"},{name:"Start Offset",category:"Client Guidance & Optimization",desc:"The playlist uses #EXT-X-START to indicate a preferred starting point, for example to start playback closer to the live edge.",isoRef:"HLS: 4.3.5.2"},{name:"Alternative Renditions",category:"Accessibility & Metadata",desc:"Uses #EXT-X-MEDIA to provide alternative tracks for language, commentary, or camera angles.",isoRef:"HLS: 4.3.4.1"},{name:"Subtitles & Captions",category:"Accessibility & Metadata",desc:"Provides text-based tracks for subtitles or closed captions via #EXT-X-MEDIA.",isoRef:"HLS: 4.3.4.1"}];var $l={"urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed":"Widevine","urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95":"PlayReady","urn:uuid:f239e769-efa3-4850-9c16-a903c6932efb":"Adobe PrimeTime","urn:uuid:1077efec-c0b2-4d02-ace3-3c1e52e2fb4b":"ClearKey","urn:uuid:94ce86fb-07ff-4f43-adb8-93d2fa968ca2":"FairPlay","urn:mpeg:dash:mp4protection:2011":"MPEG Common Encryption (CENC)"};function cs(t){if(!t)return"Unknown Scheme";let i=t.toLowerCase();return $l[i]||`Unknown (${t})`}var T=(t,i)=>t?.[":@"]?.[i],J=(t,i)=>{if(!t||!t[i])return;let e=t[i];return Array.isArray(e)?e[0]:e},pt=(t,i)=>{if(!t||!t[i])return[];let e=t[i];return Array.isArray(e)?e:[e]},q=(t,i)=>{let e=[];if(!t||typeof t!="object")return e;for(let n in t){if(n===":@"||n==="#text")continue;let a=t[n];if(!a)continue;let o=Array.isArray(a)?a:[a];for(let s of o)n===i&&e.push(s),typeof s=="object"&&(e=e.concat(q(s,i)))}return e};function oi(t,i,e={}){let n=[];if(!t||typeof t!="object")return n;for(let a in t){if(a===":@"||a==="#text")continue;let o=t[a];if(!o)continue;let s=Array.isArray(o)?o:[o];for(let r of s){if(typeof r!="object")continue;let l={...e,parent:t};a==="Period"&&(l.period=r),a==="AdaptationSet"&&(l.adaptationSet=r),a===i&&n.push({element:r,context:l}),n.push(...oi(r,i,l))}}return n}function Pl(t,i){if(!i)return t;if(!t)return i;let e=JSON.parse(JSON.stringify(t));Object.assign(e[":@"]||(e[":@"]={}),i[":@"]);for(let n in i)n!==":@"&&(e[n]&&Array.isArray(e[n])&&Array.isArray(i[n])?e[n]=e[n].concat(i[n]):e[n]=i[n]);return e}function mt(t,i){let e=i.map(n=>J(n,t)).filter(Boolean);if(e.length!==0)return e.reduceRight((n,a)=>Pl(n,a))}var wl=t=>t?.["#text"]||null;function we(t,i,e,n,a){let o=t,s=[i,e,n,a];for(let r of s){if(!r)continue;let l=pt(r,"BaseURL");if(l.length>0){let c=wl(l[0]);if(c===null||c.trim()===""){o=t;continue}try{o=new URL(c.trim(),o).href}catch(f){console.warn(`Invalid URL part in BaseURL: "${c}"`,f)}}}return o}var ri=(t,i)=>q(t,i)[0],me=(t,i,e)=>n=>{let a=ri(n,t);return{used:!!a,details:a?i(a):e}},si=(t,i,e)=>n=>{let o=q(n,t).length;return o===0?{used:!1,details:""}:{used:!0,details:`${o} ${o===1?i:e} found.`}},Ul={"Presentation Type":t=>({used:!0,details:`<code>${T(t,"type")}</code>`}),"MPD Locations":si("Location","location","locations provided"),"Scoped Profiles":t=>{let i=q(t,"AdaptationSet"),e=q(t,"Representation"),n=i.filter(o=>T(o,"profiles")).length+e.filter(o=>T(o,"profiles")).length;return n===0?{used:!1,details:""}:{used:!0,details:`${n} ${n===1?"scoped profile":"scoped profiles"}`}},"Multi-Period":si("Period","Period","Periods"),"Content Protection":t=>{let i=q(t,"ContentProtection");return i.length>0?{used:!0,details:`Systems: <b>${[...new Set(i.map(n=>cs(T(n,"schemeIdUri"))))].join(", ")}</b>`}:{used:!1,details:"No encryption descriptors found."}},"Client Authentication":me("EssentialProperty",()=>"Signals requirement for client authentication.",""),"Content Authorization":me("SupplementalProperty",()=>"Signals requirement for content authorization.",""),"Segment Templates":me("SegmentTemplate",()=>"Uses templates for segment URL generation.",""),"Segment Timeline":me("SegmentTimeline",()=>"Provides explicit segment timing via <code>&lt;S&gt;</code> elements.",""),"Segment List":me("SegmentList",()=>"Provides an explicit list of segment URLs.",""),"Representation Index":si("RepresentationIndex","representation index","representation indices"),"Low Latency Streaming":t=>{if(T(t,"type")!=="dynamic")return{used:!1,details:"Not a dynamic (live) manifest."};let i=!!ri(t,"Latency"),n=q(t,"SegmentTemplate").some(a=>T(a,"availabilityTimeComplete")==="false");if(i||n){let a=[];return i&&a.push("<code>&lt;Latency&gt;</code> target defined."),n&&a.push("Chunked transfer hint present."),{used:!0,details:a.join(" ")}}return{used:!1,details:"No specific low-latency signals found."}},"Manifest Patch Updates":me("PatchLocation",t=>`Patch location: <code>${t["#text"]?.trim()}</code>`,"Uses full manifest reloads."),"UTC Timing Source":t=>{let i=q(t,"UTCTiming");return i.length>0?{used:!0,details:`Schemes: ${[...new Set(i.map(n=>`<code>${T(n,"schemeIdUri").split(":").pop()}</code>`))].join(", ")}`}:{used:!1,details:"No clock synchronization source provided."}},"Dependent Representations":t=>{let i=q(t,"Representation").filter(e=>T(e,"dependencyId"));return i.length>0?{used:!0,details:`${i.length} dependent Representations`}:{used:!1,details:""}},"Associated Representations":t=>{let i=q(t,"Representation").filter(e=>T(e,"associationId"));return i.length>0?{used:!0,details:`${i.length} associations`}:{used:!1,details:""}},"Trick Modes":t=>{let i=ri(t,"SubRepresentation"),e=q(t,"Role").some(n=>T(n,"value")==="trick");if(i||e){let n=[];return i&&n.push("<code>&lt;SubRepresentation&gt;</code>"),e&&n.push('<code>Role="trick"</code>'),{used:!0,details:`Detected via: ${n.join(", ")}`}}return{used:!1,details:"No explicit trick mode signals found."}},"Subtitles & Captions":t=>{let i=q(t,"AdaptationSet").filter(e=>T(e,"contentType")==="text"||T(e,"mimeType")?.startsWith("application"));if(i.length>0){let e=[...new Set(i.map(n=>T(n,"lang")).filter(Boolean))];return{used:!0,details:`Found ${i.length} track(s). ${e.length>0?`Languages: <b>${e.join(", ")}</b>`:""}`}}return{used:!1,details:"No text or application AdaptationSets found."}},"Role Descriptors":t=>{let i=q(t,"Role");return i.length>0?{used:!0,details:`Roles found: ${[...new Set(i.map(n=>`<code>${T(n,"value")}</code>`))].join(", ")}`}:{used:!1,details:"No roles specified."}},"MPD Events":me("EventStream",()=>"Uses <EventStream> for out-of-band event signaling.",""),"Inband Events":me("InbandEventStream",()=>"Uses <InbandEventStream> to signal events within segments.","")};function fs(t){let i={};if(!t)return{Error:{used:!0,details:"Serialized XML object was not found for feature analysis."}};for(let[e,n]of Object.entries(Ul))try{i[e]=n(t)}catch(a){console.error(`Error analyzing feature "${e}":`,a),i[e]={used:!1,details:"Analysis failed."}}return i}function ps(t){let i={},e=t.tags||[];i["Presentation Type"]={used:!0,details:t.type==="dynamic"?"<code>EVENT</code> or Live":"<code>VOD</code>"},i["Master Playlist"]={used:t.isMaster,details:t.isMaster?`${t.variants?.length||0} Variant Streams found.`:"Media Playlist."};let n=(t.segments||[]).some(p=>p.discontinuity);i.Discontinuity={used:n,details:n?"Contains #EXT-X-DISCONTINUITY tags.":"No discontinuities found."};let a=e.find(p=>p.name==="EXT-X-KEY");if(a&&a.value.METHOD!=="NONE"){let p=[...new Set(e.filter(h=>h.name==="EXT-X-KEY").map(h=>h.value.METHOD))];i["Content Protection"]={used:!0,details:`Methods: <b>${p.join(", ")}</b>`}}else i["Content Protection"]={used:!1,details:"No #EXT-X-KEY tags found."};let o=e.some(p=>p.name==="EXT-X-MAP");i["Fragmented MP4 Segments"]={used:o,details:o?"Uses #EXT-X-MAP, indicating fMP4 segments.":"Likely Transport Stream (TS) segments."},i["I-Frame Playlists"]={used:e.some(p=>p.name==="EXT-X-I-FRAME-STREAM-INF"),details:"Provides dedicated playlists for trick-play modes."};let s=e.filter(p=>p.name==="EXT-X-MEDIA");i["Alternative Renditions"]={used:s.length>0,details:s.length>0?`${s.length} #EXT-X-MEDIA tags found.`:"No separate audio/video/subtitle renditions declared."},i["Date Ranges / Timed Metadata"]={used:t.events.some(p=>p.type==="hls-daterange"),details:"Carries timed metadata, often used for ad insertion signaling."};let r=s.some(p=>p.value.TYPE==="SUBTITLES");i["Subtitles & Captions"]={used:r,details:r?"Contains #EXT-X-MEDIA tags with TYPE=SUBTITLES.":"No subtitle renditions declared."},i["Session Data"]={used:e.some(p=>p.name==="EXT-X-SESSION-DATA"),details:"Carries arbitrary session data in the master playlist."},i["Session Keys"]={used:e.some(p=>p.name==="EXT-X-SESSION-KEY"),details:"Allows pre-loading of encryption keys from the master playlist."},i["Independent Segments"]={used:e.some(p=>p.name==="EXT-X-INDEPENDENT-SEGMENTS"),details:"All segments are self-contained for decoding."},i["Start Offset"]={used:e.some(p=>p.name==="EXT-X-START"),details:"Specifies a preferred starting position in the playlist."};let l=[];t.partInf&&l.push("EXT-X-PART-INF"),(t.segments||[]).some(p=>(p.parts||[]).length>0)&&l.push("EXT-X-PART"),t.serverControl&&l.push("EXT-X-SERVER-CONTROL"),(t.preloadHints||[]).length>0&&l.push("EXT-X-PRELOAD-HINT"),(t.renditionReports||[]).length>0&&l.push("EXT-X-RENDITION-REPORT"),i["Low-Latency HLS"]={used:l.length>0,details:l.length>0?`Detected low-latency tags: <b>${l.join(", ")}</b>`:"Standard latency HLS."};let c=e.some(p=>p.name==="EXT-X-SKIP");i["Playlist Delta Updates"]={used:c,details:c?"Contains #EXT-X-SKIP tag, indicating a partial playlist update.":"No delta updates detected."};let f=e.some(p=>p.name==="EXT-X-DEFINE");i["Variable Substitution"]={used:f,details:f?"Uses #EXT-X-DEFINE for variable substitution.":"No variables defined."};let m=e.some(p=>p.name==="EXT-X-CONTENT-STEERING");i["Content Steering"]={used:m,details:m?"Provides client-side CDN steering information.":"No content steering information found."};let u=[];return(t.variants||[]).some(p=>p.attributes.SCORE)&&u.push("SCORE"),(t.variants||[]).some(p=>p.attributes["VIDEO-RANGE"])&&u.push("VIDEO-RANGE"),(t.variants||[]).some(p=>p.attributes["STABLE-VARIANT-ID"])&&u.push("STABLE-VARIANT-ID"),s.some(p=>p.value["STABLE-RENDITION-ID"])&&u.push("STABLE-RENDITION-ID"),t.events.some(p=>p.type==="hls-daterange"&&p.message.toLowerCase().includes("interstitial"))&&u.push("Interstitials"),i["Advanced Metadata & Rendition Selection"]={used:u.length>0,details:u.length>0?`Detected advanced attributes: <b>${u.join(", ")}</b>`:"Uses standard metadata."},i}function ms(t,i,e=null){return i==="dash"?fs(e):ps(t)}function us(t,i){return(i==="dash"?ls:ds).map(n=>{let a=t.get(n.name)||{used:!1,details:"Not detected in manifest."};return{...n,...a}})}var be=t=>{if(!t)return null;let i=t.match(/PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/);if(!i)return null;let e=parseFloat(i[1]||"0"),n=parseFloat(i[2]||"0"),a=parseFloat(i[3]||"0");return e*3600+n*60+a};function ut(t,i){let e={},n=T(t,"type")==="dynamic",a=n?new Date(T(t,"availabilityStartTime")).getTime():0;return oi(t,"Representation").forEach(({element:s,context:r})=>{let l=T(s,"id");if(!l)return;let{period:c,adaptationSet:f}=r;if(!c||!f)return;let m=T(c,"id");if(!m){console.warn("Skipping Representation in Period without an ID.",s);return}let u=`${m}-${l}`;e[u]=[];let p=[s,f,c],h=we(i,t,c,f,s),y=mt("SegmentTemplate",p),b=mt("SegmentList",p),C=mt("SegmentBase",p),S=T(y,"initialization");if(!S){let v=b||C,w=v?J(v,"Initialization"):null;w&&(S=T(w,"sourceURL"))}if(S){let v=S.replace(/\$RepresentationID\$/g,l);e[u].push({repId:l,type:"Init",number:0,resolvedUrl:new URL(v,h).href,template:v,time:-1,duration:0,timescale:parseInt(T(y||b,"timescale")||"1")})}if(y){let v=parseInt(T(y,"timescale")||"1"),w=T(y,"media"),P=J(y,"SegmentTimeline"),A=parseInt(T(y,"startNumber")||"1"),B=be(T(c,"start"))||0;if(w&&P){let V=A,j=0;pt(P,"S").forEach(G=>{let Q=T(G,"t")?parseInt(T(G,"t")):j,N=parseInt(T(G,"d")),oe=parseInt(T(G,"r")||"0");j=Q;for(let ne=0;ne<=oe;ne++){let Z=j,He=B+Z/v,Fi=N/v,Te=w.replace(/\$RepresentationID\$/g,l).replace(/\$Number(%0\d+d)?\$/g,(cc,wt)=>String(V).padStart(wt?parseInt(wt.substring(2,wt.length-1)):1,"0")).replace(/\$Time\$/g,String(Z));e[u].push({repId:l,type:"Media",number:V,resolvedUrl:new URL(Te,h).href,template:Te,time:Z,duration:N,timescale:v,startTimeUTC:a+He*1e3,endTimeUTC:a+(He+Fi)*1e3}),j+=N,V++}})}else if(w&&T(y,"duration")){let V=parseInt(T(y,"duration")),j=V/v,G=0,Q=A;if(n)G=10;else{let N=be(T(t,"mediaPresentationDuration"))||be(T(c,"duration"));if(!N||!j)return;G=Math.ceil(N/j)}for(let N=0;N<G;N++){let oe=Q+N,ne=(oe-A)*V,Z=B+ne/v,He=w.replace(/\$RepresentationID\$/g,l).replace(/\$Number(%0\d+d)?\$/g,(Fi,Te)=>String(oe).padStart(Te?parseInt(Te.substring(2,Te.length-1)):1,"0"));e[u].push({repId:l,type:"Media",number:oe,resolvedUrl:new URL(He,h).href,template:He,time:ne,duration:V,timescale:v,startTimeUTC:a+Z*1e3,endTimeUTC:a+(Z+j)*1e3})}}}else if(b){let v=parseInt(T(b,"timescale")||"1"),w=parseInt(T(b,"duration")),P=w/v,A=0,B=be(T(c,"start"))||0;pt(b,"SegmentURL").forEach((j,G)=>{let Q=T(j,"media");if(Q){let N=B+A/v;e[u].push({repId:l,type:"Media",number:G+1,resolvedUrl:new URL(Q,h).href,template:Q,time:A,duration:w,timescale:v,startTimeUTC:a+N*1e3,endTimeUTC:a+(N+P)*1e3}),A+=w}})}else if(C||J(s,"BaseURL")){let v=parseInt(T(f,"timescale")||"1"),w=be(T(t,"mediaPresentationDuration"))||be(T(c,"duration"))||0;e[u].push({repId:l,type:"Media",number:1,resolvedUrl:h,template:J(s,"BaseURL")?"BaseURL":"SegmentBase",time:0,duration:w*v,timescale:v,startTimeUTC:0,endTimeUTC:0})}}),e}var Ue=class{diff(i,e,n={}){let a;typeof n=="function"?(a=n,n={}):"callback"in n&&(a=n.callback);let o=this.castInput(i,n),s=this.castInput(e,n),r=this.removeEmpty(this.tokenize(o,n)),l=this.removeEmpty(this.tokenize(s,n));return this.diffWithOptionsObj(r,l,n,a)}diffWithOptionsObj(i,e,n,a){var o;let s=S=>{if(S=this.postProcess(S,n),a){setTimeout(function(){a(S)},0);return}else return S},r=e.length,l=i.length,c=1,f=r+l;n.maxEditLength!=null&&(f=Math.min(f,n.maxEditLength));let m=(o=n.timeout)!==null&&o!==void 0?o:1/0,u=Date.now()+m,p=[{oldPos:-1,lastComponent:void 0}],h=this.extractCommon(p[0],e,i,0,n);if(p[0].oldPos+1>=l&&h+1>=r)return s(this.buildValues(p[0].lastComponent,e,i));let y=-1/0,b=1/0,C=()=>{for(let S=Math.max(y,-c);S<=Math.min(b,c);S+=2){let v,w=p[S-1],P=p[S+1];w&&(p[S-1]=void 0);let A=!1;if(P){let V=P.oldPos-S;A=P&&0<=V&&V<r}let B=w&&w.oldPos+1<l;if(!A&&!B){p[S]=void 0;continue}if(!B||A&&w.oldPos<P.oldPos?v=this.addToPath(P,!0,!1,0,n):v=this.addToPath(w,!1,!0,1,n),h=this.extractCommon(v,e,i,S,n),v.oldPos+1>=l&&h+1>=r)return s(this.buildValues(v.lastComponent,e,i))||!0;p[S]=v,v.oldPos+1>=l&&(b=Math.min(b,S-1)),h+1>=r&&(y=Math.max(y,S+1))}c++};if(a)(function S(){setTimeout(function(){if(c>f||Date.now()>u)return a(void 0);C()||S()},0)})();else for(;c<=f&&Date.now()<=u;){let S=C();if(S)return S}}addToPath(i,e,n,a,o){let s=i.lastComponent;return s&&!o.oneChangePerToken&&s.added===e&&s.removed===n?{oldPos:i.oldPos+a,lastComponent:{count:s.count+1,added:e,removed:n,previousComponent:s.previousComponent}}:{oldPos:i.oldPos+a,lastComponent:{count:1,added:e,removed:n,previousComponent:s}}}extractCommon(i,e,n,a,o){let s=e.length,r=n.length,l=i.oldPos,c=l-a,f=0;for(;c+1<s&&l+1<r&&this.equals(n[l+1],e[c+1],o);)c++,l++,f++,o.oneChangePerToken&&(i.lastComponent={count:1,previousComponent:i.lastComponent,added:!1,removed:!1});return f&&!o.oneChangePerToken&&(i.lastComponent={count:f,previousComponent:i.lastComponent,added:!1,removed:!1}),i.oldPos=l,c}equals(i,e,n){return n.comparator?n.comparator(i,e):i===e||!!n.ignoreCase&&i.toLowerCase()===e.toLowerCase()}removeEmpty(i){let e=[];for(let n=0;n<i.length;n++)i[n]&&e.push(i[n]);return e}castInput(i,e){return i}tokenize(i,e){return Array.from(i)}join(i){return i.join("")}postProcess(i,e){return i}get useLongestToken(){return!1}buildValues(i,e,n){let a=[],o;for(;i;)a.push(i),o=i.previousComponent,delete i.previousComponent,i=o;a.reverse();let s=a.length,r=0,l=0,c=0;for(;r<s;r++){let f=a[r];if(f.removed)f.value=this.join(n.slice(c,c+f.count)),c+=f.count;else{if(!f.added&&this.useLongestToken){let m=e.slice(l,l+f.count);m=m.map(function(u,p){let h=n[c+p];return h.length>u.length?h:u}),f.value=this.join(m)}else f.value=this.join(e.slice(l,l+f.count));l+=f.count,f.added||(c+=f.count)}}return a}};function li(t,i){let e;for(e=0;e<t.length&&e<i.length;e++)if(t[e]!=i[e])return t.slice(0,e);return t.slice(0,e)}function di(t,i){let e;if(!t||!i||t[t.length-1]!=i[i.length-1])return"";for(e=0;e<t.length&&e<i.length;e++)if(t[t.length-(e+1)]!=i[i.length-(e+1)])return t.slice(-e);return t.slice(-e)}function gt(t,i,e){if(t.slice(0,i.length)!=i)throw Error(`string ${JSON.stringify(t)} doesn't start with prefix ${JSON.stringify(i)}; this is a bug`);return e+t.slice(i.length)}function ht(t,i,e){if(!i)return t+e;if(t.slice(-i.length)!=i)throw Error(`string ${JSON.stringify(t)} doesn't end with suffix ${JSON.stringify(i)}; this is a bug`);return t.slice(0,-i.length)+e}function Me(t,i){return gt(t,i,"")}function Je(t,i){return ht(t,i,"")}function ci(t,i){return i.slice(0,Ml(t,i))}function Ml(t,i){let e=0;t.length>i.length&&(e=t.length-i.length);let n=i.length;t.length<i.length&&(n=t.length);let a=Array(n),o=0;a[0]=0;for(let s=1;s<n;s++){for(i[s]==i[o]?a[s]=a[o]:a[s]=o;o>0&&i[s]!=i[o];)o=a[o];i[s]==i[o]&&o++}o=0;for(let s=e;s<t.length;s++){for(;o>0&&t[s]!=i[o];)o=a[o];t[s]==i[o]&&o++}return o}function ke(t){let i;for(i=t.length-1;i>=0&&t[i].match(/\s/);i--);return t.substring(i+1)}function re(t){let i=t.match(/^\s*/);return i?i[0]:""}var xt="a-zA-Z0-9_\\u{C0}-\\u{FF}\\u{D8}-\\u{F6}\\u{F8}-\\u{2C6}\\u{2C8}-\\u{2D7}\\u{2DE}-\\u{2FF}\\u{1E00}-\\u{1EFF}",kl=new RegExp(`[${xt}]+|\\s+|[^${xt}]`,"ug"),fi=class extends Ue{equals(i,e,n){return n.ignoreCase&&(i=i.toLowerCase(),e=e.toLowerCase()),i.trim()===e.trim()}tokenize(i,e={}){let n;if(e.intlSegmenter){let s=e.intlSegmenter;if(s.resolvedOptions().granularity!="word")throw new Error('The segmenter passed must have a granularity of "word"');n=Array.from(s.segment(i),r=>r.segment)}else n=i.match(kl)||[];let a=[],o=null;return n.forEach(s=>{/\s/.test(s)?o==null?a.push(s):a.push(a.pop()+s):o!=null&&/\s/.test(o)?a[a.length-1]==o?a.push(a.pop()+s):a.push(o+s):a.push(s),o=s}),a}join(i){return i.map((e,n)=>n==0?e:e.replace(/^\s+/,"")).join("")}postProcess(i,e){if(!i||e.oneChangePerToken)return i;let n=null,a=null,o=null;return i.forEach(s=>{s.added?a=s:s.removed?o=s:((a||o)&&gs(n,o,a,s),n=s,a=null,o=null)}),(a||o)&&gs(n,o,a,null),i}},hs=new fi;function mi(t,i,e){return e?.ignoreWhitespace!=null&&!e.ignoreWhitespace?ys(t,i,e):hs.diff(t,i,e)}function gs(t,i,e,n){if(i&&e){let a=re(i.value),o=ke(i.value),s=re(e.value),r=ke(e.value);if(t){let l=li(a,s);t.value=ht(t.value,s,l),i.value=Me(i.value,l),e.value=Me(e.value,l)}if(n){let l=di(o,r);n.value=gt(n.value,r,l),i.value=Je(i.value,l),e.value=Je(e.value,l)}}else if(e){if(t){let a=re(e.value);e.value=e.value.substring(a.length)}if(n){let a=re(n.value);n.value=n.value.substring(a.length)}}else if(t&&n){let a=re(n.value),o=re(i.value),s=ke(i.value),r=li(a,o);i.value=Me(i.value,r);let l=di(Me(a,r),s);i.value=Je(i.value,l),n.value=gt(n.value,a,l),t.value=ht(t.value,a,a.slice(0,a.length-l.length))}else if(n){let a=re(n.value),o=ke(i.value),s=ci(o,a);i.value=Je(i.value,s)}else if(t){let a=ke(t.value),o=re(i.value),s=ci(a,o);i.value=Me(i.value,s)}}var pi=class extends Ue{tokenize(i){let e=new RegExp(`(\\r?\\n)|[${xt}]+|[^\\S\\n\\r]+|[^${xt}]`,"ug");return i.match(e)||[]}},xs=new pi;function ys(t,i,e){return xs.diff(t,i,e)}var bs=t=>t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");function Re(t){if(!t)return"";let i=bs(t),e=/(&lt;!--[\s\S]*?--&gt;)|(&lt;\?[\s\S]*?\?&gt;)|(&lt;\/?)([\w:-]+)|([\w:-]+=)|(&quot;)([^&quot;]*)(&quot;)/g;return i.replace(e,(n,a,o,s,r,l,c,f,m)=>a?`<span class="text-gray-500 italic">${a}</span>`:o?`<span class="text-gray-500">${o}</span>`:s?`${s}<span class="text-blue-300">${r}</span>`:l?`<span class="text-emerald-300">${l.slice(0,-1)}</span>=`:c?`${c}<span class="text-yellow-300">${f}</span>${m}`:n)}function yt(t){return t?t.split(`
`).map(i=>{let e=bs(i.trim());if(e.startsWith("#EXT")){let n=e.indexOf(":");if(n===-1)return`#<span class="text-purple-300">${e.substring(1)}</span>`;let a=e.substring(1,n),o=e.substring(n+1);return o=o.replace(/([A-Z0-9-]+)=/g,'<span class="text-emerald-300">$1</span>='),o=o.replace(/"([^"]*)"/g,'"<span class="text-yellow-300">$1</span>"'),`#<span class="text-purple-300">${a}</span>:${o}`}return e.startsWith("#")?`<span class="text-gray-500">${e}</span>`:`<span class="text-cyan-400">${e}</span>`}).join(`
`):""}function _s(t,i,e){let n=mi(t,i),a="",o=e==="dash"?Re:yt;return n.forEach(s=>{if(s.removed)return;let r=o(s.value);s.added?a+=`<span class="bg-emerald-500/40 text-green-50 rounded-sm font-medium">${r}</span>`:a+=r}),a}var yi=Yr($s());function Kl(t,i){if(!Array.isArray(i))return!1;if(!t)return i.some(n=>n.status==="fail"||n.status==="warn");let e=new Set(t.filter(n=>n.status==="fail"||n.status==="warn").map(n=>n.id));return i.some(n=>(n.status==="fail"||n.status==="warn")&&!e.has(n.id))}function Yl(t,i,e){t.rawManifest=i,t.manifest=e,t.featureAnalysis.manifestCount++}function Jl(t){let i=ms(t.manifest,t.protocol,t.manifest.serializedManifest);Object.entries(i).forEach(([e,n])=>{let a=t.featureAnalysis.results.get(e);n.used&&(!a||!a.used)?t.featureAnalysis.results.set(e,{used:!0,details:n.details}):a||t.featureAnalysis.results.set(e,{used:n.used,details:n.details})})}function Ql(t,i,e,n,a){let o=i,s=e;t.protocol==="dash"&&(o=(0,yi.default)(i,{indentation:"  ",lineSeparator:`
`}),s=(0,yi.default)(e,{indentation:"  ",lineSeparator:`
`}));let r=_s(o,s,t.protocol),l=t.manifestUpdates[0]?.complianceResults,c=Kl(l,n),f={timestamp:new Date().toLocaleTimeString(),diffHtml:r,rawManifest:e,complianceResults:n,hasNewIssues:c,serializedManifest:a};t.manifestUpdates.unshift(f),t.manifestUpdates.length>20&&t.manifestUpdates.pop()}function Zl(t){let i=ut(t.manifest.serializedManifest,t.baseUrl);Object.entries(i).forEach(([e,n])=>{let a=t.dashRepresentationState.get(e);if(a){let o=new Set(a.segments.map(s=>s.resolvedUrl));n.forEach(s=>{o.has(s.resolvedUrl)||a.segments.push(s)}),a.freshSegmentUrls=new Set(n.map(s=>s.resolvedUrl))}})}function ed(t){if(t.manifest.serializedManifest.isMaster)return;let i=t.hlsVariantState.get(t.originalUrl);if(i){let e=t.manifest.serializedManifest;i.segments=e.segments||[],i.freshSegmentUrls=new Set(i.segments.map(n=>n.resolvedUrl))}}function td(t){let{streamId:i,newManifestString:e,newManifestObject:n,oldManifestString:a,complianceResults:o,serializedManifest:s}=t,r=_.getState().streams.findIndex(f=>f.id===i);if(r===-1)return;let l=structuredClone(_.getState().streams[r]);if(l.protocol==="unknown")return;let c=l;Yl(l,e,n),Jl(c),Ql(c,a,e,o,s),c.protocol==="dash"?Zl(c):c.protocol==="hls"&&ed(c),_.setState(f=>({streams:f.streams.map((m,u)=>u===r?l:m)})),x.dispatch("stream:data-updated",{streamId:i})}function Ps(){x.subscribe("livestream:manifest-updated",td)}D();H();D();var Fe=new Map,bi=null;async function ws(t,i){if(!_.getState().streams.find(n=>n.id===t)){Us(t,i);return}x.dispatch("hls:media-playlist-fetch-request",{streamId:t,variantUri:i})}function id(t,i){let e=`${t.id}-${i}`;if(Fe.has(e))return;ws(t.id,i);let n=(t.manifest?.minBufferTime||2)*1e3,a=setInterval(()=>ws(t.id,i),n);Fe.set(e,a)}function Us(t,i){let e=`${t}-${i}`;Fe.has(e)&&(clearInterval(Fe.get(e)),Fe.delete(e))}function nd(){let t=_.getState().streams.filter(i=>i.protocol==="hls"&&i.manifest?.type==="dynamic");for(let i of t)for(let[e,n]of i.hlsVariantState.entries()){let a=`${i.id}-${e}`,o=n.isPolling&&n.isExpanded,s=Fe.has(a);o&&!s?id(i,e):!o&&s&&Us(i.id,e)}}function vt(t,i,e){let n=_.getState().streams.find(a=>a.id===t);if(n){let a=new Map(n.hlsVariantState),o=a.get(i);o&&(a.set(i,{...o,...e}),I.updateStream(t,{hlsVariantState:a}))}}function Ms(){bi&&clearInterval(bi),bi=setInterval(nd,1e3),x.subscribe("hls-explorer:toggle-variant",({streamId:t,variantUri:i})=>{let n=_.getState().streams.find(a=>a.id===t)?.hlsVariantState.get(i);if(n){let a=!n.isExpanded,o=a&&n.segments.length===0&&!n.error;vt(t,i,{isExpanded:a,isLoading:o}),o&&x.dispatch("hls:media-playlist-fetch-request",{streamId:t,variantUri:i})}}),x.subscribe("hls-explorer:toggle-polling",({streamId:t,variantUri:i})=>{let n=_.getState().streams.find(a=>a.id===t)?.hlsVariantState.get(i);n&&vt(t,i,{isPolling:!n.isPolling})}),x.subscribe("hls-explorer:set-display-mode",({streamId:t,variantUri:i,mode:e})=>{vt(t,i,{displayMode:e})}),x.subscribe("state:analysis-complete",({streams:t})=>{let i=t.find(e=>e.protocol==="hls"&&e.manifest?.isMaster);if(i){let e=i.hlsVariantState.keys().next().value;e&&(vt(i.id,e,{isLoading:!0}),x.dispatch("hls:media-playlist-fetch-request",{streamId:i.id,variantUri:e}))}})}dt();H();D();var O=(t,i)=>{for(let e of t){if(e.type===i)return e;if(e.children?.length>0){let n=O(e.children,i);if(n)return n}}return null},ks=[t=>{let i=O(t.boxes,"mvhd"),e=i?.details?.duration?.value===0;return{id:"CMAF-HEADER-MVHD-DUR",text:"Movie Header (mvhd) duration must be 0",isoRef:"Clause 7.5.1",status:e?"pass":"fail",details:e?"OK":`mvhd.duration was ${i?.details?.duration?.value}, expected 0.`}},t=>{let i=O(t.boxes,"tkhd"),e=i?.details?.duration?.value===0;return{id:"CMAF-HEADER-TKHD-DUR",text:"Track Header (tkhd) duration must be 0",isoRef:"Clause 7.5.4",status:e?"pass":"fail",details:e?"OK":`tkhd.duration was ${i?.details?.duration?.value}, expected 0.`}},t=>{let e=!!O(t.boxes,"mvex");return{id:"CMAF-HEADER-MVEX",text:"Movie Extends (mvex) box must be present",isoRef:"Clause 7.3.2.1",status:e?"pass":"fail",details:e?"OK":"mvex box not found in moov."}},t=>{let e=!!O(t.boxes,"trex");return{id:"CMAF-HEADER-TREX",text:"Track Extends (trex) box must be present",isoRef:"Clause 7.5.14",status:e?"pass":"fail",details:e?"OK":"trex box not found in mvex for the track."}},(t,i)=>{let n=O(i.boxes,"moof")?.children?.filter(o=>o.type==="traf").length,a=n===1;return{id:"CMAF-FRAG-MOOF-TRAF",text:"Movie Fragment (moof) must contain exactly one Track Fragment (traf)",isoRef:"Clause 7.3.2.3.b",status:a?"pass":"fail",details:a?"OK":`Found ${n} traf boxes, expected 1.`}},(t,i)=>{let n=O(i.boxes,"tfhd")?.details?.flags?.value,a=n?(parseInt(n,16)&1)!==0:!1,o=n?(parseInt(n,16)&131072)!==0:!1,s=!a&&o;return{id:"CMAF-FRAG-TFHD-FLAGS",text:"Track Fragment Header (tfhd) flags must be set for fragment-relative addressing",isoRef:"Clause 7.5.16",status:s?"pass":"fail",details:s?"OK":`base-data-offset-present=${a} (expected false), default-base-is-moof=${o} (expected true).`}},(t,i)=>{let a=!!O(i.boxes,"traf")?.children.find(o=>o.type==="tfdt");return{id:"CMAF-FRAG-TFDT",text:"Track Fragment (traf) must contain a Track Fragment Decode Time (tfdt) box",isoRef:"Clause 7.5.16",status:a?"pass":"fail",details:a?"OK":"tfdt box not found in traf."}},(t,i)=>{let n=O(i.boxes,"trun")?.details?.flags?.value,o=n?(parseInt(n,16)&1)!==0:!1;return{id:"CMAF-FRAG-TRUN-OFFSET",text:"Track Run (trun) must have data-offset-present flag set",isoRef:"Clause 7.5.17",status:o?"pass":"fail",details:o?"OK":"trun data-offset-present flag was not set to true."}},t=>{let i=O(t.boxes,"schm"),e=O(t.boxes,"tenc");if(!i||!e||!(i.details.scheme_type.value==="cenc"))return null;let a=e.details.default_Per_Sample_IV_Size?.value,o=a===8;return{id:"CMAF-CENC-IV-SIZE",text:"For 'cenc' scheme, default_Per_Sample_IV_Size must be 8",isoRef:"Clause 8.2.3.1",status:o?"pass":"fail",details:o?`OK: IV size is ${a}.`:`FAIL: default_Per_Sample_IV_Size was ${a}, but CMAF requires 8 for the 'cenc' scheme.`}},(t,i)=>{if(!O(t.boxes,"sinf"))return null;let n=O(i.boxes,"traf"),a=O(n?.children||[],"saio"),o=O(n?.children||[],"saiz"),s=!!a&&!!o;return{id:"CMAF-CENC-AUX-INFO",text:"Encrypted fragments must contain Sample Auxiliary Information boxes (saio, saiz)",isoRef:"Clause 8.2.2.1",status:s?"pass":"fail",details:s?"OK: Found both saio and saiz boxes in the track fragment.":`FAIL: Missing required auxiliary info boxes. Found saio: ${!!a}, Found saiz: ${!!o}.`}},(t,i)=>{let e=O(t.boxes,"schm"),n=O(i.boxes,"senc");if(!e||e.details.scheme_type.value!=="cenc"||!n||!n.samples)return null;let a=-1,o=-1;for(let r=0;r<n.samples.length;r++){let l=n.samples[r];if(l.subsamples&&l.subsamples.length>0){for(let c=0;c<l.subsamples.length;c++)if(l.subsamples[c].BytesOfProtectedData%16!==0){a=r,o=c;break}}if(a!==-1)break}let s=a===-1;return{id:"CMAF-CENC-SUBSAMPLE-ALIGNMENT",text:"For 'cenc' scheme, BytesOfProtectedData must be a multiple of 16",isoRef:"Clause 8.2.3.1",status:s?"pass":"warn",details:s?"OK: All subsamples have correctly aligned protected regions.":`FAIL: At least one subsample has a protected data size not a multiple of 16. First failure at sample ${a+1}, subsample ${o+1}.`}}];function _i(t,i,e=[],n=[]){let a=[];if(t.type!==i.type)return a.push(`Box types differ: ${t.type} vs ${i.type}`),{areEqual:!1,differences:a};!e.includes("size")&&t.size!==i.size&&a.push(`${t.type}.size: '${t.size} bytes' vs '${i.size} bytes'`);let o=new Set([...Object.keys(t.details),...Object.keys(i.details)]);for(let l of o){if(e.includes(l)||l==="size")continue;let c=t.details[l]?.value,f=i.details[l]?.value;JSON.stringify(c)!==JSON.stringify(f)&&a.push(`${t.type}.${l}: '${c}' vs '${f}'`)}let s=(t.children||[]).filter(l=>!n.includes(l.type)),r=(i.children||[]).filter(l=>!n.includes(l.type));if(s.length!==r.length)a.push(`Child box count differs in ${t.type}: ${s.length} vs ${r.length}`);else for(let l=0;l<s.length;l++){let c=_i(s[l],r[l],e,n);c.areEqual||a.push(...c.differences)}return{areEqual:a.length===0,differences:a}}var ve=(t,i)=>{for(let e of t){if(e.type===i)return e;if(e.children?.length>0){let n=ve(e.children,i);if(n)return n}}return null};function ad(t){let i=ve(t.boxes,"trak");if(!!!ve(t.boxes,"vmhd"))return null;let o=!ve(i.children,"elst");return{id:"CMAF-PROFILE-CMF2-ELST",text:"'cmf2' Profile: Video tracks must not contain an Edit List ('elst') box",isoRef:"Clause 7.7.2",status:o?"pass":"fail",details:o?"OK: No Edit List box found in video track.":"FAIL: An Edit List (`elst`) box was found, which is prohibited for video tracks under the `cmf2` profile."}}function od(t){let i=ve(t.boxes,"esds");if(!i)return{id:"CMAF-PROFILE-CAAC-ESDS",text:"'caac' Profile: An 'esds' box must be present in the sample entry",isoRef:"Clause 10.3.4.2.2",status:"fail",details:"FAIL: The AudioSampleEntry for an AAC track must contain an Elementary Stream Descriptor (esds) box."};let e=i.details?.decoded_audio_object_type?.value,n=i.details?.decoded_channel_configuration?.value,a=parseInt(n?.match(/\d+/)?.[0]||"0",10),o=e&&(e.includes("AAC LC")||e.includes("SBR")),s=a>0&&a<=2,r=[];o||r.push(`Invalid AudioObjectType: found ${e}. Expected AAC-LC or HE-AAC.`),s||r.push(`Invalid channel configuration: found ${a} channels, max is 2.`);let l=o&&s;return{id:"CMAF-PROFILE-CAAC-PARAMS",text:"'caac' Profile: Validate audio parameters (AOT, channels)",isoRef:"Clause 10.4",status:l?"pass":"fail",details:l?"OK: Audio parameters conform to AAC Core profile.":`FAIL: ${r.join(" ")}`}}function sd(t){let i=ve(t.boxes,"stpp");if(!i)return null;let e=ve(i.children,"mime");if(!e)return{id:"CMAF-PROFILE-IM1T-MIME",text:"'im1t' Profile: A 'mime' box must be present in the 'stpp' sample entry",isoRef:"Clause 11.3.2",status:"fail",details:"FAIL: The XMLSubtitleSampleEntry (`stpp`) for an IMSC1 track must contain a MIME Type (`mime`) box."};let n=e.details?.content_type?.value||"",a=n.includes("codecs=im1t");return{id:"CMAF-PROFILE-IM1T-CODEC",text:"'im1t' Profile: MIME type must declare 'im1t' codec",isoRef:"Clause 11.3.3",status:a?"pass":"fail",details:a?"OK: `codecs=im1t` found in MIME box.":`FAIL: Expected 'codecs=im1t' in MIME box, but found '${n}'.`}}function Rs(t,i){let e=[];if(t.includes("cmf2")){let n=ad(i);n&&e.push(n)}if(t.includes("caac")){let n=od(i);n&&e.push(n)}if(t.includes("im1t")){let n=sd(i);n&&e.push(n)}return e}var rd=[{box:"ftyp",ignore:[]},{box:"mvhd",ignore:["creation_time","modification_time"]},{box:"tkhd",ignore:["creation_time","modification_time","width","height"]},{box:"trex",ignore:[]},{box:"elst",ignore:[]},{box:"mdhd",ignore:["creation_time","modification_time"]},{box:"mehd",ignore:[]},{box:"hdlr",ignore:[]},{box:"vmhd",ignore:[]},{box:"smhd",ignore:[]},{box:"sthd",ignore:[]},{box:"dref",ignore:[]},{box:"stsd",ignore:["codingname"],childBoxesToIgnore:["avcC"]},{box:"pssh",ignore:[]},{box:"sinf",ignore:[]},{box:"tenc",ignore:[]}];function Si(t,i,e,n){let a=t.serializedManifest;if(!a)return null;let o=J(a,"SegmentTemplate")||J(i.serializedManifest,"SegmentTemplate")||J(e.serializedManifest,"SegmentTemplate");if(o&&T(o,"initialization"))return new URL(T(o,"initialization").replace(/\$RepresentationID\$/g,t.id),n).href;let s=J(a,"SegmentBase"),r=s?J(s,"Initialization"):null;if(r&&T(r,"sourceURL"))return new URL(T(r,"sourceURL"),n).href;let l=J(a,"BaseURL");return l&&l["#text"]?new URL(l["#text"],n).href:null}function Ls(t,i){let n=t?.boxes?.find(r=>r.type==="ftyp")?.details?.cmafBrands?.value?.split(", ")||[];if(!n.includes("cmfc"))return[{id:"CMAF-BRAND",text:"CMAF Brand Presence",status:"fail",details:`The structural brand "cmfc" was not found in the initialization segment's ftyp box. This is not a CMAF track.`}];let a={id:"CMAF-BRAND",text:"CMAF Brand Presence",status:"pass",details:`Structural brand "cmfc" found. Detected CMAF brands: ${n.join(", ")}`},o=ks.map(r=>r(t,i)).filter(Boolean),s=Rs(n,t);return[a,...o,...s]}var vi=(t,i)=>{for(let e of t){if(e.type===i)return e;if(e.children?.length>0){let n=vi(e.children,i);if(n)return n}}return null};async function Bs(t,i){let e=[],n=t.manifest.serializedManifest;for(let a of t.manifest.periods)for(let o of a.adaptationSets){let s=o.id||`${o.contentType}-${a.id}`;if(o.representations.length<=1){e.push({id:`SS-VALID-${s}`,text:`Switching Set: ${s}`,status:"pass",details:"OK (Single Representation)"});continue}try{let r=o.representations.map(u=>{let p=we(t.baseUrl,n,a.serializedManifest,o.serializedManifest,u.serializedManifest);return Si(u,o,a,p)}),l=await Promise.all(r.map(u=>u?i(u):Promise.resolve(null))),c=l[0]?.data;if(!c)throw new Error("Could not parse initialization segment for baseline representation.");let f=!0,m=[];for(let u=1;u<l.length;u++){let p=o.representations[u].id,h=l[u]?.data;if(!h){f=!1,m.push(`[Rep ${p}]: Failed to parse initialization segment.`);continue}for(let y of rd){let b=vi(c.boxes,y.box),C=vi(h.boxes,y.box);if(!b&&!C)continue;if(!b||!C){f=!1,m.push(`[Rep ${p}]: Box '${y.box}' presence mismatch.`);continue}let S=_i(b,C,y.ignore,y.childBoxesToIgnore);S.areEqual||(f=!1,m.push(...S.differences.map(v=>`[Rep ${p}] ${v}`)))}}f?e.push({id:`SS-VALID-${s}`,text:`Switching Set: ${s}`,status:"pass",details:"All tracks have compatible headers according to CMAF Table 11."}):e.push({id:`SS-VALID-${s}`,text:`Switching Set: ${s}`,status:"fail",details:`Inconsistencies found: ${m.join("; ")}`})}catch(r){e.push({id:`SS-VALID-${s}`,text:`Switching Set: ${s}`,status:"fail",details:`Error during validation: ${r.message}`})}}return e}D();H();var Ti=new Worker("/dist/worker.js",{type:"module"});Ti.onmessage=t=>{let{url:i,parsedData:e,error:n}=t.data,{segmentCache:a}=_.getState(),o=a.get(i);if(!o)return;let s={status:n?500:o.status,data:o.data,parsedData:e};a.set(i,s),_.setState({segmentCache:a.clone()}),x.dispatch("segment:loaded",{url:i,entry:s})};Ti.onerror=t=>{console.error("An error occurred in the parsing worker:",t)};async function Fs(t){let{segmentCache:i}=_.getState();try{let e={status:-1,data:null,parsedData:null};i.set(t,e),x.dispatch("segment:pending",{url:t});let n=await fetch(t,{method:"GET",cache:"no-store"}),a=n.ok?await n.arrayBuffer():null,o={status:n.status,data:a,parsedData:null};if(i.set(t,o),a)Ti.postMessage({type:"parse-segment",payload:{url:t,data:a}});else{let s={status:n.status,data:null,parsedData:{error:`HTTP ${n.status}`}};i.set(t,s),x.dispatch("segment:loaded",{url:t,entry:s})}}catch(e){console.error(`Failed to fetch segment ${t}:`,e);let n={status:0,data:null,parsedData:{error:e.message}};i.set(t,n),x.dispatch("segment:loaded",{url:t,entry:n})}}function St(t){let{segmentCache:i}=_.getState(),e=i.get(t);return e&&e.status!==-1&&e.parsedData?e.parsedData.error?Promise.reject(new Error(e.parsedData.error)):Promise.resolve(e.parsedData):new Promise((n,a)=>{let o=({url:r,entry:l})=>{r===t&&(s(),l.status!==200?a(new Error(`HTTP ${l.status} for ${t}`)):l.parsedData?.error?a(new Error(l.parsedData.error)):n(l.parsedData))},s=x.subscribe("segment:loaded",o);(!e||e.status!==-1)&&Fs(t)})}x.subscribe("segment:fetch",({url:t})=>Fs(t));async function ld(t){if(t.protocol==="dash")try{let i=t.manifest.serializedManifest,e=[],n=t.manifest?.periods[0],a=n?.adaptationSets[0],o=a?.representations[0];if(o&&a&&n){let l=we(t.baseUrl,i,n.serializedManifest,a.serializedManifest,o.serializedManifest),c=Si(o,a,n,l),f=t.dashRepresentationState.get(`${n.id}-${o.id}`)?.segments.find(m=>m.type==="Media")?.resolvedUrl;if(c&&f){let[m,u]=await Promise.all([St(c),St(f)]),p=Ls(m.data,u.data);e.push(...p)}}let s=await Bs(t,St);e.push(...s);let r=new Map(t.semanticData);r.set("cmafValidation",e),I.updateStream(t.id,{semanticData:r})}catch(i){console.error(`[CMAF Service] Error during validation: ${i.message}`);let e=new Map(t.semanticData);e.set("cmafValidation",[{id:"CMAF-META",text:"CMAF Conformance",status:"fail",details:`Validation failed to run: ${i.message}`}]),I.updateStream(t.id,{semanticData:e})}}function zs(){x.subscribe("state:analysis-complete",({streams:t})=>{t.forEach(ld)})}D();function dd(t){let i=(n,a)=>a instanceof Map?{__dataType:"Map",value:Array.from(a.entries())}:a instanceof Set?{__dataType:"Set",value:Array.from(a.values())}:n==="serializedManifest"?"[Circular/ParsedObject]":a,e={timestamp:new Date().toISOString(),appState:t};return JSON.stringify(e,i,2)}function Hs(){let t=_.getState();try{let i=dd(t);navigator.clipboard.writeText(i).then(()=>{W({message:"Debug info copied to clipboard!",type:"pass"})}).catch(e=>{console.error("Failed to copy debug info:",e),W({message:"Failed to copy debug info.",type:"fail"})})}catch(i){console.error("Error serializing debug state:",i),W({message:"Error creating debug info.",type:"fail"})}}D();function Vs(){let t=_.getState().streams;if(t.length===0)return;let i=new URL(window.location.origin+window.location.pathname);t.forEach(e=>{e.originalUrl&&i.searchParams.append("url",e.originalUrl)}),navigator.clipboard.writeText(i.href).then(()=>{W({message:"Shareable URL copied to clipboard!",type:"pass"})}).catch(e=>{console.error("Failed to copy URL: ",e),W({message:"Failed to copy URL to clipboard.",type:"fail"})})}E();D();E();E();var cd=t=>t?t.isValid?d`<div class="flex items-center gap-2">
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
        </div>`:d`<div class="flex items-start gap-2">
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
                ${t.errors.map(i=>d`<li>${i}</li>`)}
            </ul>
        </div>
    </div>`:d`<p class="text-xs text-gray-400">Not validated.</p>`,Ns=t=>{let i=t.steeringInfo,e=t.semanticData.get("steeringValidation");return i?d`
        <div>
            <h3 class="text-xl font-bold mb-4">Delivery & Steering</h3>
            <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <dl class="grid gap-x-4 gap-y-2 grid-cols-[auto_1fr]">
                    <dt
                        class="text-sm font-medium text-gray-400 ${k}"
                        data-tooltip="The URI of the Content Steering manifest."
                        data-iso="HLS: 4.4.6.6"
                    >
                        Steering Server URI
                    </dt>
                    <dd class="text-sm font-mono text-white break-all">
                        ${i.value["SERVER-URI"]}
                    </dd>

                    <dt
                        class="text-sm font-medium text-gray-400 ${k}"
                        data-tooltip="The initial Pathway to apply until the steering manifest is loaded."
                        data-iso="HLS: 4.4.6.6"
                    >
                        Default Pathway ID
                    </dt>
                    <dd class="text-sm font-mono text-white">
                        ${i.value["PATHWAY-ID"]||".(default)"}
                    </dd>

                    <dt
                        class="text-sm font-medium text-gray-400 ${k}"
                        data-tooltip="The result of fetching and validating the steering manifest against the HLS specification."
                        data-iso="HLS: 7.2"
                    >
                        Validation Status
                    </dt>
                    <dd>
                        ${cd(e)}
                    </dd>
                </dl>
            </div>
        </div>
    `:""};var $=(t,i,e,n,a="")=>{if(i==null||i===""||Array.isArray(i)&&i.length===0)return"";let o=`stat-card-${t.toLowerCase().replace(/[\s/]+/g,"-")}`;return d`
        <div
            data-testid="${o}"
            class="bg-gray-800 p-3 rounded-lg border border-gray-700 ${a}"
        >
            <dt
                class="text-xs font-medium text-gray-400 ${k}"
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
    `},Tt=(t,i)=>{if(!t||t.length===0)return"";let e,n,a=o=>typeof o=="string"&&o.includes("bps")?o:!o||isNaN(o)?"N/A":o>=1e6?`${(o/1e6).toFixed(2)} Mbps`:`${(o/1e3).toFixed(0)} kbps`;return i==="video"?(e=["ID","Bitrate","Resolution","Codecs","Scan Type","SAR"],n=t.map(o=>d`
                <tr>
                    <td class="p-2 font-mono">${o.id}</td>
                    <td class="p-2 font-mono">
                        ${o.bitrateRange||a(o.bandwidth)}
                    </td>
                    <td class="p-2 font-mono">
                        ${o.resolutions?.join(", ")||`${o.width}x${o.height}`}
                    </td>
                    <td class="p-2 font-mono">
                        ${o.codecs?.join?o.codecs.join(", "):o.codecs||"N/A"}
                    </td>
                    <td class="p-2 font-mono">${o.scanType||"N/A"}</td>
                    <td class="p-2 font-mono">${o.sar||"N/A"}</td>
                </tr>
            `)):i==="audio"?(e=["ID","Bitrate","Codecs","Channels","Sample Rate"],n=t.map(o=>d`
                <tr>
                    <td class="p-2 font-mono">${o.id}</td>
                    <td class="p-2 font-mono">
                        ${o.bitrateRange||a(o.bandwidth)}
                    </td>
                    <td class="p-2 font-mono">
                        ${o.codecs?.join?o.codecs.join(", "):o.codecs||"N/A"}
                    </td>
                    <td class="p-2 font-mono">
                        ${o.channels?.join(", ")||o.audioChannelConfigurations?.map(s=>s.value).join(", ")||"N/A"}
                    </td>
                    <td class="p-2 font-mono">
                        ${o.audioSamplingRate||"N/A"}
                    </td>
                </tr>
            `)):(e=["ID","Bitrate","Format"],n=t.map(o=>d`
                <tr>
                    <td class="p-2 font-mono">${o.id}</td>
                    <td class="p-2 font-mono">
                        ${o.bitrateRange||a(o.bandwidth)}
                    </td>
                    <td class="p-2 font-mono">
                        ${o.codecsOrMimeTypes?.join(", ")||o.codecs||o.mimeType||"N/A"}
                    </td>
                </tr>
            `)),d`
        <div
            class="bg-gray-900/50 rounded border border-gray-700/50 overflow-x-auto"
        >
            <table class="w-full text-left text-xs">
                <thead class="bg-gray-800/50">
                    <tr>
                        ${e.map(o=>d`<th
                                    class="p-2 font-semibold text-gray-400"
                                >
                                    ${o}
                                </th>`)}
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-700/50">
                    ${n}
                </tbody>
            </table>
        </div>
    `},Ci=(t,i)=>{let e=t.roles.map(a=>a.value).join(", "),n=`${i.charAt(0).toUpperCase()+i.slice(1)} AdaptationSet`;return d`
        <div class="space-y-2">
            <h5 class="font-semibold text-gray-300">
                ${n}:
                <span class="font-mono text-sm">${t.id||"N/A"}</span>
                ${t.lang?d` <span class="text-sm font-normal"
                          >(Lang: ${t.lang})</span
                      >`:""}
                ${e?d` <span class="text-sm font-normal"
                          >(Roles: ${e})</span
                      >`:""}
            </h5>
            <div class="pl-4">
                ${Tt(t.representations,i)}
            </div>
        </div>
    `},fd=(t,i)=>d`
    <details class="bg-gray-800 rounded-lg border border-gray-700" open>
        <summary
            class="font-bold text-lg p-3 cursor-pointer hover:bg-gray-700/50"
        >
            Period ${i+1}
            <span class="font-normal font-mono text-sm text-gray-400"
                >(ID: ${t.id||"N/A"}, Start: ${t.start}s, Duration:
                ${t.duration?t.duration+"s":"N/A"})</span
            >
        </summary>
        <div class="p-4 border-t border-gray-700 space-y-4">
            ${t.videoTracks.length>0?t.videoTracks.map(e=>Ci(e,"video")):d`<p class="text-xs text-gray-500">
                      No video Adaptation Sets in this period.
                  </p>`}
            ${t.audioTracks.length>0?t.audioTracks.map(e=>Ci(e,"audio")):""}
            ${t.textTracks.length>0?t.textTracks.map(e=>Ci(e,"text")):""}
        </div>
    </details>
`,pd=t=>t.dash?d`
            <h4 class="text-lg font-bold mb-3 mt-6">DASH Properties</h4>
            <dl
                class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
            >
                ${$("Min Buffer Time",`${t.dash.minBufferTime}s`,"Minimum client buffer time.","DASH: 5.3.1.2")}
                ${t.general.streamType.startsWith("Live")?d`
                          ${$("Update Period",`${t.dash.minimumUpdatePeriod}s`,"How often a client should check for a new manifest.","DASH: 5.3.1.2")}
                          ${$("Live Window (DVR)",`${t.dash.timeShiftBufferDepth}s`,"The duration of the seekable live window.","DASH: 5.3.1.2")}
                          ${$("Availability Start",t.dash.availabilityStartTime?.toLocaleString(),"The anchor time for the presentation.","DASH: 5.3.1.2")}
                          ${$("Publish Time",t.dash.publishTime?.toLocaleString(),"The time this manifest version was generated.","DASH: 5.3.1.2")}
                      `:""}
            </dl>
        `:t.hls?d`
            <h4 class="text-lg font-bold mb-3 mt-6">HLS Properties</h4>
            <dl
                class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
            >
                ${$("HLS Version",t.hls.version,"Indicates the compatibility version of the Playlist file.","HLS: 4.3.1.2")}
                ${$("Target Duration",t.hls.targetDuration?`${t.hls.targetDuration}s`:null,"The maximum Media Segment duration.","HLS: 4.3.3.1")}
                ${$("I-Frame Playlists",t.hls.iFramePlaylists,"Number of I-Frame only playlists for trick-play modes.","HLS: 4.3.4.3")}
                ${$("Media Playlists",t.content.mediaPlaylists,"Number of variant stream media playlists.","HLS: 4.3.4.2")}
            </dl>
        `:"",md=t=>{let{manifest:i,protocol:e}=t,n=i.summary,a=(e==="dash"?n.dash.profiles:n.hls.version)||"",o=e==="dash"?a.split(",").map(p=>p.trim()):[`Version ${a}`],s=["isoff","mp2t","isobmff","ts"],r=!0,l=o.map(p=>{let h=!1,y="This profile is not explicitly supported or its constraints are not validated by this tool.";return e==="dash"?(h=s.some(b=>p.toLowerCase().includes(b)),h&&(y="This is a standard MPEG-DASH profile based on a supported container format (ISOBMFF or MPEG-2 TS).",(p.toLowerCase().includes("hbbtv")||p.toLowerCase().includes("dash-if"))&&(h=!1,y="This is a known extension profile. While the base format is supported, HbbTV or DASH-IF specific rules are not validated."))):e==="hls"&&(h=n.general.segmentFormat==="ISOBMFF"||n.general.segmentFormat==="TS",y=`HLS support is determined by segment format. This stream uses ${n.general.segmentFormat} segments, which are fully supported for analysis.`),h||(r=!1),{profile:p,isSupported:h,explanation:y}});e==="hls"&&(r=l[0]?.isSupported??!1);let c=r?d`<svg
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
          </svg>`:d`<svg
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
          </svg>`;return d`
        <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <dt
                class="flex justify-between items-center text-sm font-medium text-gray-400 ${k}"
                data-tooltip="Indicates the set of features used in the manifest."
                data-iso="DASH: 8.1 / HLS: 4.3.1.2"
            >
                Declared Profiles / Version
                <div
                    class="flex items-center gap-2 ${k}"
                    data-tooltip="${r?"All declared profiles and formats are supported for analysis.":"One or more declared profiles have constraints that are not validated by this tool. Base stream analysis should still be accurate."}"
                >
                    ${c}
                    <span class="text-sm font-semibold ${r?"text-green-400":"text-yellow-400"}"
                        >${r?"Supported":"Partial/Unsupported"}</span
                    >
                </div>
            </dt>
            <dd class="text-base text-left font-mono text-white mt-2 space-y-2">
                ${l.map(p=>d` <div
                            class="flex items-center gap-2 text-xs p-1 bg-gray-900/50 rounded"
                        >
                            <span
                                class="flex-shrink-0 ${k}"
                                data-tooltip="${p.explanation}"
                            >
                                ${p.isSupported?d`<svg
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
                                      </svg>`:d`<svg
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
                                      </svg>`}
                            </span>
                            <span class="break-all">${p.profile}</span>
                        </div>`)}
            </dd>
        </div>
    `};function Os(t){let{manifest:i}=t;if(!i||!i.summary)return d`<p class="warn">No manifest summary data to display.</p>`;let e=i.summary,n=e.hls?.mediaPlaylistDetails,a=()=>t.protocol==="hls"?d`
                ${e.videoTracks.length>0?d`<div>
                          <h4 class="text-lg font-bold mb-2">Video Tracks</h4>
                          ${Tt(e.videoTracks,"video")}
                      </div>`:""}
                ${e.audioTracks.length>0?d`<div>
                          <h4 class="text-lg font-bold mb-2 mt-4">
                              Audio Renditions
                          </h4>
                          ${Tt(e.audioTracks,"audio")}
                      </div>`:""}
                ${e.textTracks.length>0?d`<div>
                          <h4 class="text-lg font-bold mb-2 mt-4">
                              Text Renditions
                          </h4>
                          ${Tt(e.textTracks,"text")}
                      </div>`:""}
            `:e.content.periods.length>0?d`
                  <div class="space-y-4">
                      ${e.content.periods.map((o,s)=>fd(o,s))}
                  </div>
              `:"";return d`
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
                            class="text-sm font-medium text-gray-400 ${k}"
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
                    ${$("Protocol",e.general.protocol,"The streaming protocol detected for this manifest.","N/A")}
                    ${$("Container Format",e.general.segmentFormat,"The container format used for media segments (e.g., ISOBMFF or MPEG-2 TS).","DASH: 5.3.7 / HLS: 4.3.2.5")}
                    ${$("Media Duration",e.general.duration?`${e.general.duration.toFixed(2)}s`:null,"The total duration of the content.","DASH: 5.3.1.2")}
                </dl>
                ${pd(e)}
            </div>
            <!-- Metadata Section -->
            <div>
                <h3 class="text-xl font-bold mb-4">Metadata & Delivery</h3>
                <dl
                    class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                >
                    ${$("Title",e.general.title,"The title of the program.","DASH: 5.3.4")}
                    ${$("Segmenting Strategy",e.general.segmenting,"The method used to define segment URLs and timing.","DASH: 5.3.9")}
                    ${md(t)}
                    ${$("Alt. Locations",e.general.locations.length,"Number of alternative manifest URLs provided.","DASH: 5.3.1.2")}
                </dl>
            </div>
            <!-- Low Latency Section -->
            ${e.lowLatency?.isLowLatency?d`
                      <div>
                          <h3 class="text-xl font-bold mb-4">
                              Low-Latency Status
                          </h3>
                          <dl
                              class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                          >
                              ${$("Target Latency",e.lowLatency.targetLatency?`${e.lowLatency.targetLatency}ms`:null,"The target latency for LL-DASH.","DASH: K.3.2")}
                              ${$("Part Target",e.lowLatency.partTargetDuration?`${e.lowLatency.partTargetDuration}s`:null,"Target duration for LL-HLS Partial Segments.","HLS 2nd Ed: 4.4.3.7")}
                              ${$("Part Hold Back",e.lowLatency.partHoldBack?`${e.lowLatency.partHoldBack}s`:null,"Server-recommended distance from the live edge for LL-HLS.","HLS 2nd Ed: 4.4.3.8")}
                              ${$("Can Block Reload",e.lowLatency.canBlockReload?"Yes":null,"Indicates server support for blocking playlist reload requests for LL-HLS.","HLS 2nd Ed: 4.4.3.8")}
                          </dl>
                      </div>
                  `:""}
            <!-- Content Section -->
            <div>
                <h3 class="text-xl font-bold mb-4">Content & Security</h3>
                <dl
                    class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                >
                    ${$("Total Periods",e.content.totalPeriods,"Number of distinct content periods. HLS is always 1.","DASH: 5.3.2")}
                    ${$("Total Video Tracks",e.content.totalVideoTracks,"Total number of distinct video tracks or variants across all periods.","DASH: 5.3.3 / HLS: 4.3.4.2")}
                    ${$("Total Audio Tracks",e.content.totalAudioTracks,"Total number of distinct audio tracks or renditions across all periods.","DASH: 5.3.3 / HLS: 4.3.4.1")}
                    ${$("Total Text Tracks",e.content.totalTextTracks,"Total number of distinct subtitle or text tracks across all periods.","DASH: 5.3.3 / HLS: 4.3.4.1")}
                    ${e.security?$("Encryption",e.security.isEncrypted?e.security.systems.join(", "):"No","Detected DRM Systems or encryption methods.","DASH: 5.8.4.1 / HLS: 4.3.2.4"):""}
                    ${e.security?.kids.length>0?$("Key IDs (KIDs)",e.security.kids.join(", "),"Key IDs found in the manifest.","ISO/IEC 23001-7"):""}
                </dl>
            </div>

            <!-- Media Playlist Details Section (HLS Only) -->
            ${n?d`
                      <div>
                          <h3 class="text-xl font-bold mb-4">
                              Media Playlist Details
                          </h3>
                          <dl
                              class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                          >
                              ${$("Segment Count",n.segmentCount,"Total number of media segments in this playlist.","HLS: 4.3.2.1")}
                              ${$("Avg. Segment Duration",n.averageSegmentDuration?.toFixed(2)+"s","The average duration of all segments.","HLS: 4.3.2.1")}
                              ${$("Discontinuities Present",n.hasDiscontinuity?"Yes":"No","Indicates if the playlist contains discontinuity tags, often used for ad insertion.","HLS: 4.3.2.3")}
                              ${$("I-Frame Only",n.isIFrameOnly?"Yes":"No","Indicates if all segments in this playlist are I-Frame only.","HLS: 4.3.3.6")}
                          </dl>
                      </div>
                  `:""}

            <!-- Hierarchical Track Details -->
            <div>
                <h3 class="text-xl font-bold mb-4">Stream Structure</h3>
                <div class="space-y-4">${a()}</div>
            </div>
            ${t.protocol==="hls"?Ns(t):""}
        </div>
    `}E();E();pe();var Xs={fail:"bg-red-900/60",warn:"bg-yellow-900/60",pass:"bg-green-900/50"},js=(t,i)=>{let e=t;if(i!=="all"&&(e=t.filter(a=>a.status===i)),e.length===0)return{b64TooltipHtml:""};let n=e.map((a,o)=>{let s={fail:"text-red-300",warn:"text-yellow-300",pass:"text-green-300",info:"text-blue-300"}[a.status];return`${o>0?'<hr class="border-gray-600 my-2">':""}<div class="text-left">
            <p class="font-bold ${s}">[${a.status.toUpperCase()}] ${a.text}</p>
            <p class="text-xs text-gray-300 mt-1">${a.details}</p>
            <p class="text-xs text-gray-500 font-mono mt-2">${a.isoRef}</p>
        </div>`}).join("");try{return{b64TooltipHtml:btoa(n)}}catch(a){return console.error("Failed to encode tooltip",a),{b64TooltipHtml:""}}},Ii=(t,i,e,n,a,o,s)=>{if(typeof i!="object"||i===null)return[];let r="  ".repeat(a),l=e.filter(P=>P.location.path===n),c=null,f="",m=`loc-path-${n.replace(/[\[\].]/g,"-")}`;if(l.length>0){let P={fail:0,warn:1,info:2,pass:3};c=l.reduce((A,B)=>!A||P[B.status]<P[A.status]?B:A),(s==="all"||s===c.status)&&(f=c?Xs[c.status]:""),l.forEach(A=>{A.location.startLine||(A.location.startLine=o.count)})}let u=i[":@"]||{},p=i["#text"]||null,h=Object.keys(i).filter(P=>P!==":@"&&P!=="#text"),y=h.length>0||p,b=Object.entries(u).map(([P,A])=>` ${P}="${A}"`).join(""),C=`<${t}${b}${y?"":" /"}>`,S=Re(C),v=[],{b64TooltipHtml:w}=js(l,s);if(v.push(d`<div class="flex">
            <span
                class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-12"
                >${o.count++}</span
            >
            <span
                id=${m}
                data-status=${c?.status}
                data-tooltip-html-b64=${w}
                class="compliance-highlight flex-grow whitespace-pre-wrap break-all ${f}"
                >${M(r)}${M(S)}</span
            >
        </div>`),y){p&&v.push(d`<div class="flex">
                    <span class="text-right text-gray-500 pr-4 select-none w-12"
                        >${o.count++}</span
                    >
                    <span class="flex-grow whitespace-pre-wrap break-all"
                        >${M(r+"  ")}<span class="text-gray-200"
                            >${p}</span
                        ></span
                    >
                </div>`),h.forEach(A=>{let B=i[A];Array.isArray(B)?B.forEach((V,j)=>{v.push(...Ii(A,V,e,`${n}.${A}[${j}]`,a+1,o,s))}):typeof B=="object"&&v.push(...Ii(A,B,e,`${n}.${A}[0]`,a+1,o,s))});let P=Re(`</${t}>`);v.push(d`<div class="flex">
                <span
                    class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-12"
                    >${o.count++}</span
                >
                <span class="flex-grow whitespace-pre-wrap break-all"
                    >${M(r)}${M(P)}</span
                >
            </div>`)}return v},Gs=(t,i,e,n,a)=>{if(i==="hls"){let l=t.split(`
`),c=new Map;return e.forEach(f=>{if(f.location.startLine)for(let m=f.location.startLine;m<=(f.location.endLine||f.location.startLine);m++)c.has(m)||c.set(m,[]),c.get(m).push(f)}),d`${l.map((f,m)=>{let u=m+1,p=c.get(u)||[],h=p.reduce((S,v)=>!S||v.status==="fail"||v.status==="warn"&&S.status!=="fail"?v:S,null),{b64TooltipHtml:y}=js(p,a),b=h&&(a==="all"||a===h.status)?Xs[h.status]:"",C=`loc-line-${u}`;return d`<div class="flex">
                <span class="text-right text-gray-500 pr-4 select-none w-12"
                    >${u}</span
                >
                <span
                    id=${C}
                    data-status=${h?.status}
                    data-tooltip-html-b64=${y}
                    class="compliance-highlight flex-grow whitespace-pre-wrap break-all ${b}"
                    >${M(yt(f))}</span
                >
            </div>`})}`}if(!n||typeof n!="object")return d`<div class="text-red-400">
            Error rendering DASH manifest object.
        </div>`;let o={count:1},s=t.match(/<\?xml.*?\?>/),r=Ii("MPD",n,e,"MPD[0]",0,o,a);return d`
        ${s?d`<div class="flex">
                  <span class="text-right text-gray-500 pr-4 select-none w-12"
                      >${o.count++}</span
                  >
                  <span class="flex-grow whitespace-pre-wrap break-all"
                      >${M(Re(s[0]))}</span
                  >
              </div>`:""}
        ${r}
    `};E();function ud(t){let e=t.currentTarget.dataset.locationId;document.querySelectorAll(".compliance-highlight").forEach(a=>a.classList.remove("bg-purple-500/30","outline","outline-1","outline-purple-400","-outline-offset-1"));let n=document.getElementById(e);n&&n.classList.add("bg-purple-500/30","outline","outline-1","outline-purple-400","-outline-offset-1")}function gd(){document.querySelectorAll(".compliance-highlight").forEach(t=>t.classList.remove("bg-purple-500/30","outline","outline-1","outline-purple-400","-outline-offset-1"))}function hd(t){let e=t.currentTarget.dataset.locationId,n=document.getElementById(e);n&&n.scrollIntoView({behavior:"smooth",block:"center"})}var xd=t=>{let i={fail:"border-red-500",warn:"border-yellow-500",pass:"border-green-500",info:"border-blue-500"},e=t.location.path?`loc-path-${t.location.path.replace(/[\[\].]/g,"-")}`:`loc-line-${t.location.startLine}`;return d`
        <div
            class="compliance-comment-card bg-gray-800 p-3 rounded-lg border-l-4 ${i[t.status]} status-${t.status} cursor-pointer hover:bg-gray-700/50"
            data-location-id="${e}"
            @mouseover=${ud}
            @mouseleave=${gd}
            @click=${hd}
        >
            <p class="font-semibold text-sm text-gray-200">
                ${t.location.startLine?d`<span class="text-xs text-gray-500 mr-2"
                          >L${t.location.startLine}</span
                      >`:""}
                ${t.text}
            </p>
            <p class="text-xs text-gray-400 mt-1">${t.details}</p>
            <p class="text-xs text-gray-500 font-mono mt-2">${t.isoRef}</p>
        </div>
    `},Ws=(t,i,e)=>{let n={pass:0,warn:0,fail:0,info:0,all:t.length};t.forEach(s=>n[s.status]=(n[s.status]||0)+1);let a=i==="all"?t:t.filter(s=>s.status===i),o=(s,r,l)=>d` <button
            class="px-3 py-1 rounded-full text-xs transition-colors duration-200 ${i===s?"bg-blue-600 text-white font-semibold":"bg-gray-700 text-gray-300"}"
            data-filter="${s}"
            @click=${()=>e(s)}
        >
            ${r} (${l})
        </button>`;return d`
        <!-- FIX: Filter bar is now a non-growing element -->
        <div
            class="compliance-filter-bar flex-shrink-0 flex items-center gap-2 mb-4 p-2 bg-gray-900/50 rounded-md sticky top-0 z-20 border-b border-gray-700"
        >
            ${o("all","All",n.all)}
            ${o("fail","Errors",n.fail)}
            ${o("warn","Warnings",n.warn)}
        </div>
        <!-- FIX: This list container now grows to fill space and scrolls independently -->
        <div class="space-y-2 flex-grow min-h-0 overflow-y-auto">
            ${a.map(xd)}
        </div>
    `};E();D();var qs=t=>{if(t.manifest.type!=="dynamic")return d``;let{manifestUpdates:i,activeManifestUpdateIndex:e}=t,n=i.length,a=i[0]?.hasNewIssues&&e>0;return d`
        <div class="flex items-center space-x-2">
            <button
                @click=${()=>I.navigateManifestUpdate(t.id,1)}
                ?disabled=${e>=n-1}
                class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                title="Previous Update (Right Arrow)"
            >
                &lt;
            </button>
            <span class="text-gray-400 font-semibold w-24 text-center"
                >Update
                ${n-e}/${n}</span
            >
            <button
                @click=${()=>I.navigateManifestUpdate(t.id,-1)}
                ?disabled=${e<=0}
                class="relative px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                title="Next Update (Left Arrow)"
            >
                &gt;
                ${a?d`<span class="absolute -top-1 -right-1 flex h-3 w-3">
                          <span
                              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
                          ></span>
                          <span
                              class="relative inline-flex rounded-full h-3 w-3 bg-red-500"
                          ></span>
                      </span>`:""}
            </button>
        </div>
    `};var Ct="all";function yd(t){t!==Ct&&(Ct=t,te())}function Ks(t){if(!t||!t.manifest)return d``;let{manifestUpdates:i,activeManifestUpdateIndex:e}=t,n=i[e];if(!n)return d`<p class="text-gray-400 p-4">
            Awaiting first manifest update with compliance data...
        </p>`;let{complianceResults:a,rawManifest:o,serializedManifest:s}=n;return d`
        <div
            class="flex flex-col sm:flex-row justify-between items-center mb-4 flex-shrink-0"
        >
            <h3 class="text-xl font-bold">Interactive Compliance Report</h3>
            ${qs(t)}
        </div>

        <div class="lg:grid lg:grid-cols-[1fr_450px] lg:gap-6 relative">
            <div
                class="compliance-manifest-view bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto mb-6 lg:mb-0"
            >
                ${Gs(o,t.protocol,a,s,Ct)}
            </div>
            <div class="lg:sticky lg:top-4 h-fit">
                <div class="flex flex-col max-h-[calc(100vh-12rem)]">
                    ${Ws(a,Ct,yd)}
                </div>
            </div>
        </div>
    `}E();E();var bd=(t,i,e=0)=>!t||t.length===0?"":t.map(n=>{let a=n.details,o=(a.presentation_time?.value||0)/(a.timescale?.value||1),s=(a.event_duration?.value||0)/(a.timescale?.value||1),r=(o-e)/i*100,l=s/i*100;return r<0||r>100?"":d`<div
            class="absolute top-0 h-full bg-yellow-500/50 border-l-2 border-yellow-400 z-10"
            style="left: ${r}%; width: ${Math.max(.2,l)}%;"
            title="Event: ${a.scheme_id_uri?.value}
ID: ${a.id?.value}
Time: ${o.toFixed(2)}s
Duration: ${s.toFixed(2)}s"
        ></div>`}),_d=t=>{if(t.length===0)return"";let i=[...t].sort((n,a)=>n.bandwidth-a.bandwidth),e=Math.max(...i.map(n=>n.bandwidth||0));return d`
        <div class="bg-gray-900 p-4 rounded-md mt-4">
            <div class="space-y-2">
                ${i.map(n=>{let a=(n.bandwidth||0)/e*100;return d` <div class="flex items-center">
                        <div
                            class="w-28 text-xs text-gray-400 font-mono flex-shrink-0"
                            title="Representation ID: ${n.id}"
                        >
                            ${n.resolution}
                        </div>
                        <div class="w-full bg-gray-700 rounded-full h-5">
                            <div
                                class="bg-blue-600 h-5 rounded-full text-xs font-medium text-blue-100 text-center p-0.5 leading-none"
                                style="width: ${a}%"
                            >
                                ${n.bandwidth?(n.bandwidth/1e3).toFixed(0)+" kbps":"N/A"}
                            </div>
                        </div>
                    </div>`})}
            </div>
        </div>
    `},vd=t=>{let{totalDuration:i,representations:e}=t;if(i===0)return d`<p class="text-gray-400 text-sm">
            Cannot render timeline: Total duration is zero or unknown.
        </p>`;let n=e.flatMap(a=>a.events||[]);return d`
        <div class="mt-8">
            <h4 class="text-lg font-bold">Switching Set: ${t.id}</h4>
            <div class="bg-gray-900 rounded-lg p-4 mt-2 relative">
                ${bd(n,i)}
                ${e.map(a=>d`
                        <div class="flex items-center mb-1">
                            <div
                                class="w-32 text-xs text-gray-400 font-mono flex-shrink-0 pr-2 text-right"
                                title="Representation ID: ${a.id}"
                            >
                                ${a.resolution}
                            </div>
                            <div
                                class="w-full h-8 bg-gray-700/50 rounded flex items-center relative"
                            >
                                ${a.fragments?a.fragments.map(o=>d`
                                              <div
                                                  class="h-full bg-gray-600 border-r border-gray-800"
                                                  style="width: ${o.duration/i*100}%;"
                                                  title="Start: ${o.startTime.toFixed(2)}s, Duration: ${o.duration.toFixed(2)}s"
                                              ></div>
                                          `):d`<div
                                          class="w-full h-full bg-red-900/50 text-red-300 text-xs flex items-center justify-center p-2"
                                      >
                                          ${a.error}
                                      </div>`}
                            </div>
                        </div>
                    `)}
            </div>
            <div class="text-xs text-gray-400 mt-2 flex justify-between">
                <span>0.00s</span>
                <span>Total Duration: ${i.toFixed(2)}s</span>
            </div>
            ${_d(e)}
        </div>
    `};function Ys(t){return t?t.length===0?d`<div class="text-center py-8 text-gray-400">
            No video switching sets with segment indexes found to build
            timeline.
        </div>`:d`
        <h3 class="text-xl font-bold mb-4">
            CMAF Timeline & Fragment Alignment
        </h3>
        ${t.map(vd)}
    `:d`<div class="text-center py-8 text-gray-400">
            Loading timeline data...
        </div>`}E();var Js=(t,i)=>!t||t.length===0?"":t.map(e=>{let n=e.startTime/i*100,a=e.duration/i*100,o=e.message.toLowerCase().includes("interstitial"),s=o?"bg-purple-500/60 border-l-4 border-purple-400":"bg-yellow-500/50 border-l-2 border-yellow-400",r=o?`Interstitial Ad: ${e.message}`:e.message;return d`<div
            class="absolute top-0 bottom-0 ${s}"
            style="left: ${n}%; width: ${a}%;"
            title="${r}
Start: ${e.startTime.toFixed(2)}s
Duration: ${e.duration.toFixed(2)}s"
        ></div>`}),Sd=t=>{let i=t.periods.flatMap(a=>a.adaptationSets).filter(a=>a.contentType==="video").flatMap(a=>a.representations).sort((a,o)=>a.bandwidth-o.bandwidth);if(i.length===0)return d``;let e=Math.max(...i.map(a=>a.bandwidth)),n=i.map(a=>{let o=a.bandwidth,s=o/e*100,r=a.width&&a.height?`${a.width}x${a.height}`:"Audio Only",l=a.codecs||"N/A";return d`
            <div class="flex items-center" title="Codecs: ${l}">
                <div class="w-28 text-xs text-gray-400 font-mono flex-shrink-0">
                    ${r}
                </div>
                <div class="w-full bg-gray-700 rounded-full h-5">
                    <div
                        class="bg-blue-600 h-5 rounded-full text-xs font-medium text-blue-100 text-center p-0.5 leading-none"
                        style="width: ${s}%"
                    >
                        ${(o/1e3).toFixed(0)} kbps
                    </div>
                </div>
            </div>
        `});return d`
        <div class="mt-6">
            <h4 class="text-lg font-bold">ABR Bitrate Ladder</h4>
            <div class="bg-gray-900 p-4 rounded-md mt-4 space-y-2">
                ${n}
            </div>
        </div>
    `},Td=t=>{let{periods:i}=t,e=i.flatMap(r=>r.adaptationSets),n=e.filter(r=>r.contentType==="video").reduce((r,l)=>r+l.representations.length,0),a=e.filter(r=>r.contentType==="audio").length,o=e.filter(r=>r.contentType==="text"||r.contentType==="application").length,s=(r,l)=>d`
        <div class="bg-gray-900 p-3 rounded-lg border border-gray-700">
            <dt class="text-sm font-medium text-gray-400">${r}</dt>
            <dd class="text-lg font-mono text-white mt-1">${l}</dd>
        </div>
    `;return d`
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            ${s("Variant Streams",n)}
            ${s("Audio Renditions",a)}
            ${s("Subtitle Renditions",o)}
        </div>
    `},Cd=t=>{let i=t.segments||[],e=t.duration;if(e===0||i.length===0)return d`<p class="info">
            No segments found or total duration is zero.
        </p>`;let n=i.map(o=>`${o.duration/e*100}%`).join(" "),a=i.map((o,s)=>{let r=o.discontinuity;return d`
            <div
                class="bg-gray-700 rounded h-10 border-r-2 ${r?"border-l-4 border-l-yellow-400":"border-gray-900"} last:border-r-0"
                title="Segment ${s+1}
Duration: ${o.duration.toFixed(3)}s ${r?`
(Discontinuity)`:""}"
            ></div>
        `});return d`
        <h3 class="text-xl font-bold mb-4">Timeline Visualization</h3>
        <div class="bg-gray-900 rounded-lg p-2 relative">
            <div
                class="grid grid-flow-col auto-cols-fr"
                style="grid-template-columns: ${n}"
            >
                ${a}
            </div>
            ${Js(t.events,e)}
        </div>
        <div class="text-xs text-gray-400 mt-2 text-right">
            Total Duration: ${e.toFixed(2)}s
        </div>
    `},Id=t=>{let i=t.segments||[],e=t.targetDuration||10,n=i.slice(-3*e),a=n.reduce((f,m)=>f+m.duration,0),o=t.serverControl?.["PART-HOLD-BACK"],s=o!=null&&a>0?100-o/a*100:null,r=t.preloadHints?.find(f=>f.TYPE==="PART"),l=r?.DURATION||0,c=l/a*100;return d`
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
                    <strong>${a.toFixed(2)}s</strong></span
                >
            </div>
            <div class="bg-gray-800 p-2 rounded relative">
                <div
                    class="grid grid-flow-col auto-cols-fr h-10"
                    style="grid-template-columns: ${n.map(f=>`${f.duration/a*100}%`).join(" ")}"
                >
                    ${n.map((f,m)=>d`<div
                                class="bg-gray-700/50 border-r border-gray-900 flex"
                                title="Segment Duration: ${f.duration.toFixed(2)}s"
                            >
                                ${f.parts.map(u=>d`
                                        <div
                                            class="h-full bg-blue-800/60 border-r border-gray-700"
                                            style="width: ${u.DURATION/f.duration*100}%"
                                            title="Partial Segment
Duration: ${u.DURATION.toFixed(3)}s
Independent: ${u.INDEPENDENT==="YES"?"Yes":"No"}"
                                        ></div>
                                    `)}
                            </div>`)}
                </div>
                ${Js(t.events,a)}
                ${r?d`
                          <div
                              class="absolute top-0 right-0 h-full bg-blue-500/20 border-l-2 border-dashed border-blue-400"
                              style="width: ${c}%; transform: translateX(100%);"
                              title="Preload Hint: ${r.URI}
Duration: ${l}s"
                          ></div>
                      `:""}
                ${s!==null?d`<div
                          class="absolute top-0 bottom-0 w-0.5 bg-cyan-400"
                          style="left: ${s}%;"
                          title="Server Recommended Playback Position (PART-HOLD-BACK: ${o}s)"
                      ></div>`:""}
                <div
                    class="absolute right-0 top-0 bottom-0 w-1 bg-red-500 rounded-full"
                    title="Approximate Live Edge"
                ></div>
            </div>
        </div>
    `};function Qs(t){return t.isMaster?d`
            <h3 class="text-xl font-bold mb-4">HLS Master Playlist</h3>
            <p class="text-sm text-gray-400 mb-4">
                A master playlist defines available variants but does not have a
                monolithic timeline.
            </p>
            ${Td(t)}
            ${Sd(t)}
        `:t.type==="dynamic"?Id(t):Cd(t)}D();async function Zs(t){if(!t||!t.manifest)return[];let i=ut(t.manifest.serializedManifest,t.baseUrl),e=t.manifest.periods.flatMap(n=>n.adaptationSets.filter(a=>a.contentType==="video").map(a=>{let o=a.representations.map(r=>{let l=`${n.id}-${r.id}`,f=(i[l]||[]).filter(p=>p.type==="Media");if(f.length===0)return{id:r.id,bandwidth:r.bandwidth,resolution:`${r.width}x${r.height}`,error:"No media segments could be parsed for this Representation.",fragments:[],events:[]};let m=f.map(p=>({startTime:p.time/p.timescale,duration:p.duration/p.timescale})),u=[];return _.getState().segmentCache.forEach(p=>{p.parsedData?.data?.events&&u.push(...p.parsedData.data.events)}),{id:r.id,bandwidth:r.bandwidth,resolution:`${r.width}x${r.height}`,fragments:m,events:u}}),s=t.manifest.duration??n.duration??(o[0]?.fragments?o[0].fragments.map(r=>r.duration).reduce((r,l)=>r+l,0):0);return{id:a.id||"video-set",totalDuration:s,representations:o}}));return Promise.resolve(e)}function Ei(t,i,e,n){return i==="hls"?Qs(t):n?d`<div class="text-center py-8 text-gray-400">
            Loading timeline data...
        </div>`:Ys(e)}function er(t,i){if(i.protocol==="hls"){F(Ei(i.manifest,i.protocol,null,!1),t);return}F(Ei(i.manifest,i.protocol,null,!0),t),Zs(i).then(e=>{F(Ei(i.manifest,i.protocol,e,!1),t)}).catch(e=>{console.error("Failed to create DASH timeline view model:",e);let n=d`<div
                class="text-red-400 p-4 text-center"
            >
                <p class="font-bold">Error loading timeline visualization.</p>
                <p class="text-sm font-mono mt-2">${e.message}</p>
            </div>`;F(n,t)})}E();pe();var Ed=t=>{let i=t.used?d`<span
              class="text-xs font-semibold px-2 py-1 bg-green-800 text-green-200 rounded-full"
              >Used</span
          >`:d`<span
              class="text-xs font-semibold px-2 py-1 bg-gray-600 text-gray-300 rounded-full"
              >Not Used</span
          >`;return d`
        <div
            class="grid grid-cols-[100px_1fr] items-center bg-gray-800 p-3 rounded-lg border border-gray-700"
        >
            <div class="text-center">${i}</div>
            <div>
                <p
                    class="font-medium ${k}"
                    data-tooltip="${t.desc}"
                    data-iso="${t.isoRef}"
                >
                    ${t.name}
                </p>
                <p class="text-xs text-gray-400 italic mt-1 font-mono">
                    ${M(t.details)}
                </p>
            </div>
        </div>
    `},Ad=(t,i)=>d`
    <div class="mt-8">
        <h4 class="text-lg font-semibold text-gray-300 mb-3">${t}</h4>
        <div class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(400px,1fr))]">
            ${i.map(e=>Ed(e))}
        </div>
    </div>
`;function tr(t){if(!t)return d`<p class="warn">No stream loaded to display.</p>`;let{results:i,manifestCount:e}=t.featureAnalysis,a=us(i,t.protocol).reduce((s,r)=>(s[r.category]||(s[r.category]=[]),s[r.category].push(r),s),{});return d`
        <h3 class="text-xl font-bold mb-2">Feature Usage Analysis</h3>
        ${(()=>{if(t.manifest?.type!=="dynamic")return d`
                <div
                    class="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center gap-4 mb-6"
                >
                    <div
                        class="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-6 w-6 text-gray-400"
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
                    </div>
                    <div>
                        <p class="font-semibold text-gray-200">
                            Static Manifest (VOD)
                        </p>
                        <p class="text-sm text-gray-400">
                            Feature analysis is based on the single, initial
                            manifest load.
                        </p>
                    </div>
                </div>
            `;let s=t.isPolling,r=s?"Polling Active":"Polling Paused",l=s?"text-cyan-400":"text-yellow-400",c=s?"bg-cyan-500":"bg-yellow-500";return d`
            <div
                class="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center gap-4 mb-6"
            >
                <div
                    class="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 relative"
                >
                    ${s?d`<div
                              class="absolute inset-0 rounded-full ${c} opacity-75 animate-ping"
                          ></div>`:""}
                    <div
                        class="absolute inset-1 rounded-full ${c} opacity-50"
                    ></div>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6 text-white relative"
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
                </div>
                <div class="flex-grow">
                    <p class="font-semibold text-gray-200">
                        Live Analysis:
                        <span class="font-bold ${l}"
                            >${r}</span
                        >
                    </p>
                    <p class="text-sm text-gray-400">
                        New features will be detected automatically as the
                        manifest updates.
                    </p>
                </div>
                <div class="text-right flex-shrink-0">
                    <div
                        class="text-xs text-gray-400 uppercase font-semibold tracking-wider"
                    >
                        Versions Analyzed
                    </div>
                    <div class="text-3xl font-bold text-white">
                        ${e}
                    </div>
                </div>
            </div>
        `})()}
        <p class="text-sm text-gray-500 mb-4">
            A breakdown of key features detected across all analyzed manifest
            versions.
        </p>
        ${Object.entries(a).map(([s,r])=>Ad(s,r))}
    `}E();D();E();pe();var Ai={MPD:{text:"The root element of the Media Presentation Description.",isoRef:"Clause 5.3.1.2"},"MPD@profiles":{text:"A comma-separated list of profiles the MPD conforms to. Essential for client compatibility.",isoRef:"Clause 8.1"},"MPD@type":{text:"Indicates if the presentation is static (VOD) or dynamic (live).",isoRef:"Clause 5.3.1.2, Table 3"},"MPD@minBufferTime":{text:"The minimum buffer time a client should maintain to ensure smooth playback.",isoRef:"Clause 5.3.1.2, Table 3"},"MPD@mediaPresentationDuration":{text:"The total duration of the on-demand content.",isoRef:"Clause 5.3.1.2, Table 3"},"MPD@availabilityStartTime":{text:"The anchor time for a dynamic presentation, defining the point from which all media times are calculated.",isoRef:"Clause 5.3.1.2, Table 3"},"MPD@publishTime":{text:"The time this version of the MPD was generated on the server.",isoRef:"Clause 5.3.1.2, Table 3"},"MPD@minimumUpdatePeriod":{text:"For dynamic MPDs, the minimum time a client should wait before requesting an updated MPD.",isoRef:"Clause 5.3.1.2, Table 3"},"MPD@timeShiftBufferDepth":{text:"The duration of the seekable live window (DVR) available to the client.",isoRef:"Clause 5.3.1.2, Table 3"},"MPD@suggestedPresentationDelay":{text:"A suggested delay from the live edge for players to begin presentation, helping to synchronize clients.",isoRef:"Clause 5.3.1.2, Table 3"},"MPD@maxSegmentDuration":{text:"The maximum duration of any Segment in this MPD. This attribute provides an upper bound for client buffer management.",isoRef:"Clause 5.3.1.2, Table 3"},"MPD@xmlns":{text:"XML Namespace. Defines the default namespace for elements in the document.",isoRef:"W3C XML Namespaces"},"MPD@xmlns:xsi":{text:"XML Namespace for XML Schema Instance. Used for attributes like schemaLocation.",isoRef:"W3C XML Schema Part 1"},"MPD@xsi:schemaLocation":{text:"XML Schema Location. Pairs a namespace URI with the location of its schema definition file (XSD).",isoRef:"W3C XML Schema Part 1"},"MPD@xmlns:cenc":{text:'XML Namespace for MPEG Common Encryption (CENC). This declares the "cenc" prefix for use on elements like <cenc:pssh>.',isoRef:"ISO/IEC 23001-7"},BaseURL:{text:"Specifies a base URL for resolving relative URLs within the MPD (e.g., for segments or initialization files).",isoRef:"Clause 5.6"},ProgramInformation:{text:"Provides descriptive metadata about the Media Presentation.",isoRef:"Clause 5.3.4"},"ProgramInformation@moreInformationURL":{text:"A URL pointing to a resource with more information about the program.",isoRef:"Clause 5.3.4.2, Table 7"},Title:{text:"A human-readable title for the Media Presentation.",isoRef:"Clause 5.3.4"},Source:{text:"Information about the source of the content, such as a broadcaster.",isoRef:"Clause 5.3.4"},Period:{text:"A Period represents a continuous segment of content. Multiple Periods can be used for things like ad insertion.",isoRef:"Clause 5.3.2"},"Period@id":{text:"A unique identifier for the Period. Mandatory for dynamic MPDs.",isoRef:"Clause 5.3.2.2, Table 4"},"Period@start":{text:"The start time of the Period on the Media Presentation Timeline.",isoRef:"Clause 5.3.2.2, Table 4"},"Period@duration":{text:"The duration of the Period.",isoRef:"Clause 5.3.2.2, Table 4"},AdaptationSet:{text:"A set of interchangeable encoded versions of one or several media components (e.g., all video bitrates, or all audio languages).",isoRef:"Clause 5.3.3"},"AdaptationSet@id":{text:"A unique identifier for the AdaptationSet within the Period.",isoRef:"Clause 5.3.3.2, Table 5"},"AdaptationSet@contentType":{text:'Specifies the media content type (e.g., "video", "audio").',isoRef:"Clause 5.3.3.2, Table 5"},"AdaptationSet@mimeType":{text:"The MIME type for all Representations in this set.",isoRef:"Clause 5.3.7.2, Table 14"},"AdaptationSet@lang":{text:'Specifies the language of the content, using RFC 5646 codes (e.g., "en", "es").',isoRef:"Clause 5.3.3.2, Table 5"},"AdaptationSet@segmentAlignment":{text:"If true, indicates that segments are aligned across Representations, simplifying seamless switching.",isoRef:"Clause 5.3.3.2, Table 5"},"AdaptationSet@subsegmentAlignment":{text:"If true, indicates that subsegments (e.g., CMAF chunks) are aligned across Representations, enabling low-latency switching.",isoRef:"Clause 5.3.3.2, Table 5"},"AdaptationSet@startWithSAP":{text:"Specifies if segments start with a Stream Access Point (SAP). A value of 1 (or higher) is typical, enabling easier stream switching and seeking.",isoRef:"Clause 5.3.3.2, Table 5"},"AdaptationSet@subsegmentStartsWithSAP":{text:"Specifies if subsegments start with a Stream Access Point (SAP), essential for low-latency streaming.",isoRef:"Clause 5.3.3.2, Table 5"},"AdaptationSet@minWidth":{text:"The minimum width of any video Representation in this set.",isoRef:"Clause 5.3.3.2, Table 5"},"AdaptationSet@maxWidth":{text:"The maximum width of any video Representation in this set.",isoRef:"Clause 5.3.3.2, Table 5"},"AdaptationSet@minHeight":{text:"The minimum height of any video Representation in this set.",isoRef:"Clause 5.3.3.2, Table 5"},"AdaptationSet@maxHeight":{text:"The maximum height of any video Representation in this set.",isoRef:"Clause 5.3.3.2, Table 5"},"AdaptationSet@maxFrameRate":{text:"The maximum frame rate of any video Representation in this set.",isoRef:"Clause 5.3.3.2, Table 5"},"AdaptationSet@width":{text:"The width of the video for all Representations in this set.",isoRef:"Clause 5.3.3.2, Table 5"},"AdaptationSet@height":{text:"The height of the video for all Representations in this set.",isoRef:"Clause 5.3.3.2, Table 5"},"AdaptationSet@frameRate":{text:"The frame rate of the video for all Representations in this set.",isoRef:"Clause 5.3.3.2, Table 5"},"AdaptationSet@par":{text:'The picture aspect ratio for the video content (e.g., "16:9").',isoRef:"Clause 5.3.3.2, Table 5"},Representation:{text:"A specific, deliverable encoded version of media content (e.g., video at a particular bitrate and resolution).",isoRef:"Clause 5.3.5"},"Representation@id":{text:"A unique identifier for the Representation within the Period.",isoRef:"Clause 5.3.5.2, Table 9"},"Representation@bandwidth":{text:"The required bandwidth in bits per second to stream this Representation.",isoRef:"Clause 5.3.5.2, Table 9"},"Representation@codecs":{text:"A string identifying the codec(s) used, as per RFC 6381.",isoRef:"Clause 5.3.7.2, Table 14"},"Representation@mimeType":{text:"The MIME type for this Representation, overriding any value set on the AdaptationSet.",isoRef:"Clause 5.3.7.2, Table 14"},"Representation@width":{text:"The width of the video in this Representation.",isoRef:"Clause 5.3.7.2, Table 14"},"Representation@height":{text:"The height of the video in this Representation.",isoRef:"Clause 5.3.7.2, Table 14"},"Representation@frameRate":{text:"The frame rate of the video.",isoRef:"Clause 5.3.7.2, Table 14"},"Representation@sar":{text:"The Sample Aspect Ratio of the video.",isoRef:"Clause 5.3.7.2, Table 14"},"Representation@audioSamplingRate":{text:"The sampling rate of the audio in samples per second.",isoRef:"Clause 5.3.7.2, Table 14"},"Representation@scanType":{text:'The scan type of the source video (e.g., "progressive", "interlaced").',isoRef:"Clause 5.3.7.2, Table 14"},SegmentTemplate:{text:"Defines a template for generating Segment URLs.",isoRef:"Clause 5.3.9.4"},"SegmentTemplate@timescale":{text:"The number of time units that pass in one second. Used for calculating segment durations and start times.",isoRef:"Clause 5.3.9.2.2, Table 16"},"SegmentTemplate@initialization":{text:"A template for the URL of the Initialization Segment.",isoRef:"Clause 5.3.9.4.2, Table 20"},"SegmentTemplate@presentationTimeOffset":{text:"Specifies an offset in timescale units that is subtracted from the media presentation time. This is used to align the segment's internal timeline with the Period timeline.",isoRef:"Clause 5.3.9.5.2, Table 21"},"SegmentTemplate@media":{text:"A template for the URLs of the Media Segments. Often contains $Time$ or $Number$.",isoRef:"Clause 5.3.9.4.2, Table 20"},"SegmentTemplate@duration":{text:"Specifies the constant duration of each segment in timescale units. Used with $Number$ substitution.",isoRef:"Clause 5.3.9.5.2, Table 21"},"SegmentTemplate@startNumber":{text:"The number of the first Media Segment in this Representation.",isoRef:"Clause 5.3.9.5.2, Table 21"},SegmentTimeline:{text:"Provides an explicit timeline for media segments, allowing for variable durations.",isoRef:"Clause 5.3.9.6"},S:{text:"A Segment Timeline entry. Defines a series of one or more contiguous segments.",isoRef:"Clause 5.3.9.6.2"},"S@t":{text:"The start time of the first segment in this series, in units of the @timescale.",isoRef:"Clause 5.3.9.6.2, Table 22"},"S@d":{text:"The duration of each segment in this series, in units of the @timescale.",isoRef:"Clause 5.3.9.6.2, Table 22"},"S@r":{text:'The repeat count. A value of "N" means there are N+1 segments in this series.',isoRef:"Clause 5.3.9.6.2, Table 22"},Accessibility:{text:"Specifies information about an accessibility scheme. This descriptor helps identify content features like audio descriptions or subtitles for the hard-of-hearing.",isoRef:"Clause 5.8.4.3"},"Accessibility@schemeIdUri":{text:"A URI that uniquely identifies the accessibility scheme. The format and meaning of the @value attribute are defined by this scheme.",isoRef:"Clause 5.8.2, Table 32"},"Accessibility@value":{text:"A value whose meaning is defined by the scheme identified in @schemeIdUri. For example, it could be a code for 'audio description'.",isoRef:"Clause 5.8.2, Table 32"},ContentProtection:{text:"Contains information about a DRM or encryption scheme used to protect the content.",isoRef:"Clause 5.8.4.1"},"ContentProtection@schemeIdUri":{text:"A URI that uniquely identifies the content protection scheme (e.g., the UUID for Widevine or PlayReady).",isoRef:"Clause 5.8.2, Table 32"},"ContentProtection@value":{text:'An optional string providing additional scheme-specific information. For CENC, this is "cenc".',isoRef:"Clause 5.8.2, Table 32"},"ContentProtection@cenc:default_KID":{text:"The default Key ID for the content. This is the primary identifier for the decryption key.",isoRef:"ISO/IEC 23001-7"},"cenc:pssh":{text:"Protection System Specific Header. Contains initialization data required by the DRM system (e.g., Widevine, PlayReady) to acquire a license.",isoRef:"ISO/IEC 23001-7"},AudioChannelConfiguration:{text:"Specifies the audio channel layout (e.g., stereo, 5.1 surround).",isoRef:"Clause 5.8.4.7"},"AudioChannelConfiguration@schemeIdUri":{text:"Identifies the scheme used to define the audio channel configuration.",isoRef:"Clause 5.8.2, Table 32"},"AudioChannelConfiguration@value":{text:'The value for the audio channel configuration according to the specified scheme (e.g., "2" for stereo).',isoRef:"Clause 5.8.2, Table 32"},Label:{text:"Provides a human-readable textual description for the element it is annotating (e.g., AdaptationSet, Representation).",isoRef:"Clause 5.3.10"},"Label@id":{text:"A unique identifier for this Label within the scope of the MPD.",isoRef:"Clause 5.3.10.3"},"Label@lang":{text:"Specifies the language of the label text, using RFC 5646 codes (e.g., 'en', 'es').",isoRef:"Clause 5.3.10.3"},Role:{text:'Describes the role or purpose of an AdaptationSet (e.g., "main", "alternate", "commentary").',isoRef:"Clause 5.8.4.2"},"Role@schemeIdUri":{text:"Identifies the scheme used for the Role descriptor.",isoRef:"Clause 5.8.2, Table 32"},"Role@value":{text:"The specific role value within the defined scheme.",isoRef:"Clause 5.8.2, Table 32"},UTCTiming:{text:"Provides a timing source for clients to synchronize their clocks, crucial for live playback.",isoRef:"Clause 5.8.4.11"},"UTCTiming@schemeIdUri":{text:'Identifies the scheme for the clock synchronization (e.g., "urn:mpeg:dash:utc:http-xsdate:2014").',isoRef:"Clause 5.8.2, Table 32"},"UTCTiming@value":{text:"The value for the clock synchronization, often a URL to a time server providing an ISO 8601 date.",isoRef:"Clause 5.8.2, Table 32"},SupplementalProperty:{text:"Specifies supplemental information that may be used by the client for optimized processing.",isoRef:"Clause 5.8.4.9"},"SupplementalProperty@schemeIdUri":{text:"Identifies the scheme for the supplemental property.",isoRef:"Clause 5.8.2, Table 32"},"SupplementalProperty@value":{text:"The value of the property. For AdaptationSet switching, this is a list of AdaptationSet IDs.",isoRef:"Clause 5.8.2, Table 32"}};D();var Dd=new URLSearchParams(window.location.search).has("debug");function X(t,...i){Dd&&console.log(`[DEBUG - ${t}]`,...i)}var Di=500,ir=(t,i)=>{let{interactiveManifestCurrentPage:e}=_.getState(),n=e+t;n>=1&&n<=i&&I.setInteractiveManifestPage(n)},Se=t=>t?t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):"",$i=t=>{let i=t.startsWith("/"),e=i?t.substring(1):t,n=Ai[e],[a,o]=e.includes(":")?e.split(":"):[null,e],s=a?`<span class="text-gray-400">${a}:</span>`:"",r="text-blue-300 rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700",l="",c="";return n?(l=k,c=`data-tooltip="${Se(n.text)}" data-iso="${Se(n.isoRef)}"`):(l="cursor-help bg-red-900/50 missing-tooltip-trigger",c=`data-tooltip="No definition for &lt;${e}&gt;"`),`&lt;${i?"/":""}<span class="${l}" ${c}>${s}<span class="${r}">${o}</span></span>`},$d=(t,i)=>{let e=`${t}@${i.name}`,n=Ai[e],a="text-emerald-300 rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700",o="text-yellow-300",s=["xmlns","xmlns:xsi","xsi:schemaLocation"].includes(i.name),r="",l="";return n?(r=k,l=`data-tooltip="${Se(n.text)}" data-iso="${Se(n.isoRef)}"`):s||(r="cursor-help bg-red-900/50 missing-tooltip-trigger",l=`data-tooltip="Tooltip definition missing for '${i.name}' on &lt;${t}&gt;"`),`<span class="${a} ${r}" ${l}>${i.name}</span>="<span class="${o}">${Se(i.value)}</span>"`},nr=(t,i=0)=>{if(!t||typeof t.nodeType>"u")return[];let e="  ".repeat(i);switch(t.nodeType){case Node.ELEMENT_NODE:{let n=t,a=Array.from(n.childNodes).filter(s=>s.nodeType===Node.ELEMENT_NODE||s.nodeType===Node.COMMENT_NODE||s.nodeType===Node.TEXT_NODE&&s.textContent.trim()),o=Array.from(n.attributes).map(s=>` ${$d(n.tagName,s)}`).join("");if(a.length>0){let s=`${e}${$i(n.tagName)}${o}&gt;`,r=a.flatMap(c=>nr(c,i+1)),l=`${e}${$i(`/${n.tagName}`)}&gt;`;return[s,...r,l]}else return[`${e}${$i(n.tagName)}${o} /&gt;`]}case Node.TEXT_NODE:return[`${e}<span class="text-gray-200">${Se(t.textContent.trim())}</span>`];case Node.COMMENT_NODE:return[`${e}<span class="text-gray-500 italic">&lt;!--${Se(t.textContent)}--&gt;</span>`];default:return[]}},ar=(t,i)=>{let e=t.manifestUpdates&&t.manifestUpdates.length>0,n=e?t.manifestUpdates[t.activeManifestUpdateIndex].rawManifest:t.rawManifest;X("DashRenderer","dashManifestTemplate called.","Stream has updates:",e,"Active update index:",t.activeManifestUpdateIndex,"Manifest string length:",n.length);let a,s=new DOMParser().parseFromString(n,"application/xml"),r=s.querySelector("parsererror");if(r)return X("DashRenderer","XML parsing failed.",r.textContent),console.error("XML Parsing Error:",r.textContent),d`<div class="text-red-400 p-4 font-mono">
            <p class="font-bold">Failed to parse manifest XML.</p>
            <pre class="mt-2 bg-gray-900 p-2 rounded">
${r.textContent}</pre
            >
        </div>`;if(a=s.querySelector("MPD"),!a)return X("DashRenderer","<MPD> element not found."),d`<div class="text-red-400 p-4">
            Error: &lt;MPD&gt; root element not found in the manifest.
        </div>`;let l=nr(a);X("DashRenderer",`Generated ${l.length} lines of HTML for manifest view.`);let c=Math.ceil(l.length/Di),f=(i-1)*Di,m=f+Di,u=l.slice(f,m),p=c>1?d` <div class="text-center text-sm text-gray-400 mt-4">
                  <button
                      @click=${()=>ir(-1,c)}
                      ?disabled=${i===1}
                      class="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-2"
                  >
                      &larr; Previous
                  </button>
                  <span
                      >Page ${i} of ${c} (Lines
                      ${f+1}-${Math.min(m,l.length)})</span
                  >
                  <button
                      @click=${()=>ir(1,c)}
                      ?disabled=${i===c}
                      class="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-2"
                  >
                      Next &rarr;
                  </button>
              </div>`:"";return d`
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            ${u.map((h,y)=>d`
                    <div class="flex">
                        <span
                            class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-12"
                            >${f+y+1}</span
                        >
                        <span class="flex-grow whitespace-pre-wrap break-all"
                            >${M(h)}</span
                        >
                    </div>
                `)}
        </div>
        ${p}
    `};E();pe();var ze={EXTM3U:{text:"Indicates that the file is an Extended M3U Playlist file. It MUST be the first line of every Media Playlist and every Master Playlist.",isoRef:"RFC 8216, Section 4.3.1.1"},"EXT-X-VERSION":{text:"Indicates the compatibility version of the Playlist file. It applies to the entire Playlist file.",isoRef:"RFC 8216, Section 4.3.1.2"},EXTINF:{text:"Specifies the duration of a Media Segment in seconds. It applies only to the Media Segment that follows it.",isoRef:"RFC 8216, Section 4.3.2.1"},"EXT-X-BYTERANGE":{text:"Indicates that a Media Segment is a sub-range of the resource identified by its URI.",isoRef:"RFC 8216, Section 4.3.2.2"},"EXT-X-DISCONTINUITY":{text:"Indicates a discontinuity between the Media Segment that follows it and the one that preceded it (e.g., format or timestamp change).",isoRef:"RFC 8216, Section 4.3.2.3"},"EXT-X-KEY":{text:"Specifies how to decrypt Media Segments. It applies to every Media Segment that appears after it until the next EXT-X-KEY tag.",isoRef:"RFC 8216, Section 4.3.2.4"},"EXT-X-KEY@METHOD":{text:"The encryption method. Valid values are NONE, AES-128, and SAMPLE-AES.",isoRef:"RFC 8216, Section 4.3.2.4"},"EXT-X-KEY@URI":{text:"The URI that specifies how to obtain the encryption key.",isoRef:"RFC 8216, Section 4.3.2.4"},"EXT-X-KEY@IV":{text:"A hexadecimal-sequence that specifies a 128-bit unsigned integer Initialization Vector.",isoRef:"RFC 8216, Section 4.3.2.4"},"EXT-X-KEY@KEYFORMAT":{text:"Specifies how the key is represented in the resource identified by the URI.",isoRef:"RFC 8216, Section 4.3.2.4"},"EXT-X-KEY@KEYFORMATVERSIONS":{text:"Indicates which version(s) of a KEYFORMAT this instance complies with.",isoRef:"RFC 8216, Section 4.3.2.4"},"EXT-X-MAP":{text:"Specifies how to obtain the Media Initialization Section required to parse the applicable Media Segments.",isoRef:"RFC 8216, Section 4.3.2.5"},"EXT-X-MAP@URI":{text:"The URI that identifies a resource containing the Media Initialization Section.",isoRef:"RFC 8216, Section 4.3.2.5"},"EXT-X-MAP@BYTERANGE":{text:"A byte range into the resource identified by the URI.",isoRef:"RFC 8216, Section 4.3.2.5"},"EXT-X-PROGRAM-DATE-TIME":{text:"Associates the first sample of a Media Segment with an absolute date and/or time.",isoRef:"RFC 8216, Section 4.3.2.6"},"EXT-X-DATERANGE":{text:"Associates a Date Range with a set of attribute/value pairs, often for carrying SCTE-35 ad signaling.",isoRef:"RFC 8216, Section 4.3.2.7"},"EXT-X-PART":{text:"Identifies a Partial Segment (a portion of a Media Segment). Used for low-latency streaming.",isoRef:"RFC 8216bis, Section 4.4.4.9"},"EXT-X-PART@URI":{text:"The URI for the Partial Segment resource. This attribute is REQUIRED.",isoRef:"RFC 8216bis, Section 4.4.4.9"},"EXT-X-PART@DURATION":{text:"The duration of the Partial Segment in seconds. This attribute is REQUIRED.",isoRef:"RFC 8216bis, Section 4.4.4.9"},"EXT-X-PART@INDEPENDENT":{text:"A value of YES indicates that the Partial Segment contains an I-frame or other independent frame.",isoRef:"RFC 8216bis, Section 4.4.4.9"},"EXT-X-TARGETDURATION":{text:"Specifies the maximum Media Segment duration in seconds. This tag is REQUIRED for all Media Playlists.",isoRef:"RFC 8216, Section 4.3.3.1"},"EXT-X-MEDIA-SEQUENCE":{text:"Indicates the Media Sequence Number of the first Media Segment that appears in a Playlist file.",isoRef:"RFC 8216, Section 4.3.3.2"},"EXT-X-DISCONTINUITY-SEQUENCE":{text:"Allows synchronization between different Renditions of the same Variant Stream.",isoRef:"RFC 8216, Section 4.3.3.3"},"EXT-X-ENDLIST":{text:"Indicates that no more Media Segments will be added to the Media Playlist file.",isoRef:"RFC 8216, Section 4.3.3.4"},"EXT-X-PLAYLIST-TYPE":{text:"Provides mutability information about the Media Playlist file. Can be EVENT or VOD.",isoRef:"RFC 8216, Section 4.3.3.5"},"EXT-X-I-FRAMES-ONLY":{text:"Indicates that each Media Segment in the Playlist describes a single I-frame.",isoRef:"RFC 8216, Section 4.3.3.6"},"EXT-X-PART-INF":{text:"Provides information about the Partial Segments in the Playlist. Required if the Playlist contains any EXT-X-PART tags.",isoRef:"RFC 8216bis, Section 4.4.3.7"},"EXT-X-PART-INF@PART-TARGET":{text:"The Part Target Duration, indicating the target duration of Partial Segments in seconds.",isoRef:"RFC 8216bis, Section 4.4.3.7"},"EXT-X-SERVER-CONTROL":{text:"Allows the Server to indicate support for Delivery Directives such as Blocking Playlist Reload and Playlist Delta Updates for low-latency streaming.",isoRef:"RFC 8216bis, Section 4.4.3.8"},"EXT-X-SERVER-CONTROL@CAN-BLOCK-RELOAD":{text:"A YES value indicates the server supports Blocking Playlist Reload, allowing clients to wait for updates instead of polling.",isoRef:"RFC 8216bis, Section 4.4.3.8"},"EXT-X-SERVER-CONTROL@PART-HOLD-BACK":{text:"The server-recommended minimum distance from the end of the Playlist at which clients should begin to play in Low-Latency Mode.",isoRef:"RFC 8216bis, Section 4.4.3.8"},"EXT-X-PRELOAD-HINT":{text:"Allows a server to suggest that a client preload a resource, such as the next Partial Segment or a Media Initialization Section.",isoRef:"RFC 8216bis, Section 4.4.5.3"},"EXT-X-PRELOAD-HINT@TYPE":{text:"Specifies the type of the hinted resource. Valid values are PART and MAP.",isoRef:"RFC 8216bis, Section 4.4.5.3"},"EXT-X-PRELOAD-HINT@URI":{text:"The URI of the resource to be preloaded. This attribute is REQUIRED.",isoRef:"RFC 8216bis, Section 4.4.5.3"},"EXT-X-RENDITION-REPORT":{text:"Carries information about an associated Rendition that is as up-to-date as the Playlist that contains it.",isoRef:"RFC 8216bis, Section 4.4.5.4"},"EXT-X-RENDITION-REPORT@URI":{text:"The URI for the Media Playlist of the specified Rendition. This attribute is REQUIRED.",isoRef:"RFC 8216bis, Section 4.4.5.4"},"EXT-X-MEDIA":{text:"Used to relate Media Playlists that contain alternative Renditions (e.g., audio, video, subtitles) of the same content.",isoRef:"RFC 8216, Section 4.3.4.1"},"EXT-X-MEDIA@TYPE":{text:"The type of the rendition. Valid strings are AUDIO, VIDEO, SUBTITLES, and CLOSED-CAPTIONS.",isoRef:"RFC 8216, Section 4.3.4.1"},"EXT-X-MEDIA@URI":{text:"A URI that identifies the Media Playlist file of the rendition.",isoRef:"RFC 8216, Section 4.3.4.1"},"EXT-X-MEDIA@GROUP-ID":{text:"A string that specifies the group to which the Rendition belongs.",isoRef:"RFC 8216, Section 4.3.4.1"},"EXT-X-MEDIA@LANGUAGE":{text:"Identifies the primary language used in the Rendition.",isoRef:"RFC 8216, Section 4.3.4.1"},"EXT-X-MEDIA@NAME":{text:"A human-readable description of the Rendition.",isoRef:"RFC 8216, Section 4.3.4.1"},"EXT-X-MEDIA@DEFAULT":{text:"If YES, the client SHOULD play this Rendition in the absence of other choices.",isoRef:"RFC 8216, Section 4.3.4.1"},"EXT-X-MEDIA@AUTOSELECT":{text:"If YES, the client MAY choose this Rendition due to matching the current playback environment.",isoRef:"RFC 8216, Section 4.3.4.1"},"EXT-X-MEDIA@CHANNELS":{text:"Specifies the number of independent audio channels.",isoRef:"RFC 8216, Section 4.3.4.1"},"EXT-X-STREAM-INF":{text:"Specifies a Variant Stream. The URI of the Media Playlist follows on the next line.",isoRef:"RFC 8216, Section 4.3.4.2"},"EXT-X-STREAM-INF@BANDWIDTH":{text:"The peak segment bit rate of the Variant Stream in bits per second.",isoRef:"RFC 8216, Section 4.3.4.2"},"EXT-X-STREAM-INF@AVERAGE-BANDWIDTH":{text:"The average segment bit rate of the Variant Stream in bits per second.",isoRef:"RFC 8216, Section 4.3.4.2"},"EXT-X-STREAM-INF@CODECS":{text:"A comma-separated list of formats specifying media sample types present in the Variant Stream.",isoRef:"RFC 8216, Section 4.3.4.2"},"EXT-X-STREAM-INF@RESOLUTION":{text:"The optimal pixel resolution at which to display all video in the Variant Stream.",isoRef:"RFC 8216, Section 4.3.4.2"},"EXT-X-STREAM-INF@FRAME-RATE":{text:"The maximum frame rate for all video in the Variant Stream.",isoRef:"RFC 8216, Section 4.3.4.2"},"EXT-X-STREAM-INF@NAME":{text:"A human-readable name for the variant stream. This is not part of the HLS specification but is a common extension used by many packagers.",isoRef:"Community Extension"},"EXT-X-STREAM-INF@AUDIO":{text:"The GROUP-ID of the audio renditions that should be used with this variant.",isoRef:"RFC 8216, Section 4.3.4.2"},"EXT-X-STREAM-INF@VIDEO":{text:"The GROUP-ID of the video renditions that should be used with this variant.",isoRef:"RFC 8216, Section 4.3.4.2"},"EXT-X-STREAM-INF@SUBTITLES":{text:"The GROUP-ID of the subtitle renditions that can be used with this variant.",isoRef:"RFC 8216, Section 4.3.4.2"},"EXT-X-STREAM-INF@CLOSED-CAPTIONS":{text:"The GROUP-ID of the closed-caption renditions that can be used. If the value is NONE, all other Variant Streams must also have this attribute with a value of NONE.",isoRef:"RFC 8216, Section 4.3.4.2"},"EXT-X-STREAM-INF@PROGRAM-ID":{text:"A deprecated attribute that uniquely identified a program within the scope of the Playlist. Removed in protocol version 6.",isoRef:"RFC 8216, Section 7"},"EXT-X-I-FRAME-STREAM-INF":{text:"Identifies a Media Playlist file containing the I-frames of a multimedia presentation, for use in trick-play modes.",isoRef:"RFC 8216, Section 4.3.4.3"},"EXT-X-SESSION-DATA":{text:"Allows arbitrary session data to be carried in a Master Playlist.",isoRef:"RFC 8216, Section 4.3.4.4"},"EXT-X-SESSION-KEY":{text:"Allows encryption keys from Media Playlists to be specified in a Master Playlist, enabling key preloading.",isoRef:"RFC 8216, Section 4.3.4.5"},"EXT-X-INDEPENDENT-SEGMENTS":{text:"Indicates that all media samples in a Media Segment can be decoded without information from other segments.",isoRef:"RFC 8216, Section 4.3.5.1"},"EXT-X-START":{text:"Indicates a preferred point at which to start playing a Playlist.",isoRef:"RFC 8216, Section 4.3.5.2"},"EXT-X-START@TIME-OFFSET":{text:"A time offset in seconds from the beginning of the Playlist (positive) or from the end (negative).",isoRef:"RFC 8216, Section 4.3.5.2"},"EXT-X-START@PRECISE":{text:"Whether clients should start playback precisely at the TIME-OFFSET (YES) or at the beginning of the segment (NO).",isoRef:"RFC 8216, Section 4.3.5.2"}};H();D();var Pi=500,or=(t,i)=>{let{interactiveManifestCurrentPage:e}=_.getState(),n=e+t;n>=1&&n<=i&&I.setInteractiveManifestPage(n)},ie=t=>t?t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):"",Pd=t=>{if(!t||t.size===0)return"";let i=Array.from(t.entries());return d`
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
                        ${i.map(([e,{value:n,source:a}])=>d`
                                <tr>
                                    <td class="p-2 font-mono text-cyan-400">
                                        ${e}
                                    </td>
                                    <td class="p-2 font-mono text-gray-400">
                                        ${a}
                                    </td>
                                    <td class="p-2 font-mono text-yellow-300">
                                        ${n}
                                    </td>
                                </tr>
                            `)}
                    </tbody>
                </table>
            </div>
        </div>
    `},wd=t=>{let i=t.mediaPlaylists.get("master");if(!i||!i.manifest.isMaster)return d``;let e=i.manifest.summary.videoTracks.map((o,s)=>({attributes:{BANDWIDTH:parseFloat(o.bitrateRange)*1e3},resolvedUri:t.manifest.rawElement?.variants[s]?.resolvedUri})),n=o=>{let s=o.target.closest("button");if(!s)return;let r=s.dataset.url;x.dispatch("hls:media-playlist-activate",{streamId:t.id,url:r})},a=(o,s,r)=>d`
        <button
            class="px-3 py-1.5 text-sm rounded-md transition-colors ${r?"bg-blue-600 text-white font-semibold":"bg-gray-900 hover:bg-gray-700"}"
            data-url="${s}"
        >
            ${o}
        </button>
    `;return d`
        <div
            class="mb-4 p-2 bg-gray-900/50 rounded-lg flex flex-wrap gap-2"
            @click=${n}
        >
            ${a("Master Playlist","master",!t.activeMediaPlaylistUrl)}
            ${t.manifest.summary.videoTracks.map((o,s)=>a(`Variant ${s+1} (${o.bitrateRange})`,t.mediaPlaylists.get("master")?.manifest.rawElement?.variants[s]?.resolvedUri,t.activeMediaPlaylistUrl===t.mediaPlaylists.get("master")?.manifest.rawElement?.variants[s]?.resolvedUri))}
        </div>
    `},wi=t=>{if(t=t.trim(),!t.startsWith("#EXT"))return`<span class="${t.startsWith("#")?"text-gray-500 italic":"text-cyan-400"}">${ie(t)}</span>`;let i="text-purple-300",e="text-emerald-300",n="text-yellow-300",a=`rounded-sm px-1 -mx-1 transition-colors hover:bg-slate-700 ${k}`,o=t.indexOf(":");if(o===-1){let m=t.substring(1),u=ze[m],p=u?`data-tooltip="${ie(u.text)}" data-iso="${ie(u.isoRef)}"`:"";return`#<span class="${i} ${u?a:""}" ${p}>${m}</span>`}let s=t.substring(1,o),r=t.substring(o+1),l=ze[s],c=l?`data-tooltip="${ie(l.text)}" data-iso="${ie(l.isoRef)}"`:"",f="";return r.includes("=")?f=(r.match(/("[^"]*")|[^,]+/g)||[]).map(u=>{let p=u.indexOf("=");if(p===-1)return ie(u);let h=u.substring(0,p),y=u.substring(p+1),b=`${s}@${h}`,C=ze[b],S="",v="";return C?(S=a,v=`data-tooltip="${ie(C.text)}" data-iso="${ie(C.ref)}"`):(S="cursor-help bg-red-900/50 missing-tooltip-trigger",v=`data-tooltip="Tooltip definition missing for '${h}' on tag #${s}"`),`<span class="${e} ${S}" ${v}>${ie(h)}</span>=<span class="${n}">${ie(y)}</span>`}).join('<span class="text-gray-400">,</span>'):f=`<span class="${n}">${ie(r)}</span>`,`#<span class="${i} ${l?a:""}" ${c}>${s}</span>:<span class="font-normal">${f}</span>`},sr=t=>{let i=ze[t.name]||{};return d` <div
        class="flex-grow whitespace-pre-wrap break-all bg-gray-900/50 p-2 rounded border-l-2 border-cyan-500"
    >
        <div
            class="font-semibold text-cyan-300 mb-1 ${k}"
            data-tooltip="${i.text}"
            data-iso="${i.isoRef}"
        >
            ${t.name}
        </div>
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 text-xs">
            ${Object.entries(t.value).map(([e,n])=>{let a=ze[`${t.name}@${e}`]||{};return d`
                    <dt
                        class="text-gray-400 ${k}"
                        data-tooltip="${a.text}"
                        data-iso="${a.ref}"
                    >
                        ${e}
                    </dt>
                    <dd class="text-gray-200 font-mono">${n}</dd>
                `})}
        </dl>
    </div>`},rr=(t,i)=>{X("HlsRenderer","hlsManifestTemplate called.","Stream:",t);let e=t.activeManifestForView||t.manifest,n=t.activeMediaPlaylistUrl?t.mediaPlaylists.get(t.activeMediaPlaylistUrl)?.rawManifest:t.rawManifest;X("HlsRenderer","Using manifest string of length:",n?.length,"Active media playlist URL:",t.activeMediaPlaylistUrl);let{renditionReports:a,preloadHints:o}=e,s=n?n.split(/\r?\n/):[],r=0,l=0,c=s.map(y=>{let b=y.trim();if(b.startsWith("#EXT-X-RENDITION-REPORT")){let C=a[r++];return C?sr({name:"EXT-X-RENDITION-REPORT",value:C}):d`${M(wi(y))}`}if(b.startsWith("#EXT-X-PRELOAD-HINT")){let C=o[l++];return C?sr({name:"EXT-X-PRELOAD-HINT",value:C}):d`${M(wi(y))}`}return d`${M(wi(y))}`});X("HlsRenderer",`Generated ${c.length} lines/templates for manifest view.`);let f=Math.ceil(c.length/Pi),m=(i-1)*Pi,u=m+Pi,p=c.slice(m,u),h=f>1?d` <div class="text-center text-sm text-gray-400 mt-4">
                  <button
                      @click=${()=>or(-1,f)}
                      ?disabled=${i===1}
                      class="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-2"
                  >
                      &larr; Previous
                  </button>
                  <span
                      >Page ${i} of ${f} (Lines
                      ${m+1}-${Math.min(u,c.length)})</span
                  >
                  <button
                      @click=${()=>or(1,f)}
                      ?disabled=${i===f}
                      class="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-2"
                  >
                      Next &rarr;
                  </button>
              </div>`:"";return d`
        ${wd(t)}
        ${Pd(t.hlsDefinedVariables)}
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            ${p.map((y,b)=>d`
                    <div class="flex">
                        <span
                            class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-10"
                            >${m+b+1}</span
                        >
                        <span class="flex-grow whitespace-pre-wrap break-all"
                            >${y}</span
                        >
                    </div>
                `)}
        </div>
        ${h}
    `};function lr(t){if(X("InteractiveManifest","getInteractiveManifestTemplate called.","Stream valid:",!!t,"Manifest valid:",!!t?.manifest),!t||!t.manifest)return X("InteractiveManifest","Render condition failed: No stream or manifest."),d`<p class="warn">No Manifest loaded to display.</p>`;let{interactiveManifestCurrentPage:i}=_.getState();return X("InteractiveManifest",`Dispatching to ${t.protocol.toUpperCase()} renderer.`),t.protocol==="hls"?rr(t,i):ar(t,i)}E();D();E();D();E();pe();function Ud(t,i,e,n,a){let o="",s="",r="",l=Math.ceil((e-i)/16);for(let c=0;c<l;c++){let f=i+c*16;o+=`<div class="text-gray-500 select-none text-right">${f.toString(16).padStart(8,"0").toUpperCase()}</div>`;let m="",u="";for(let p=0;p<16;p++){let h=f+p;if(h<e){let y=t[h],b=n.get(h),C=n.get(h-1),S="",v="",w="";if(b){let G=b.box?.type||b.packet?.type,Q=b.fieldName,N=Q,oe="";if(G){let ne=a[G],Z=a[`${G}@${Q}`];Z&&Z.text?(N=Z.text,oe=Z.ref||""):ne&&ne.text&&(Q==="Box Header"||Q==="TS Header")&&(N=ne.text,oe=ne.ref||"")}S=N,v=oe,C&&b.fieldName!==C.fieldName&&(b.box?.offset===C.box?.offset||b.packet?.offset===C.packet?.offset)&&h%16!==0&&(w="border-l-2 border-white/10")}let P=b?.color?.bg||"",A=b?.color?.style||"",B=y.toString(16).padStart(2,"0").toUpperCase(),V=`data-byte-offset="${h}" data-box-offset="${b?.box?.offset}" data-tooltip="${S}" data-iso="${v}"`;m+=`<span ${V} class="hex-byte relative ${P} ${w}" style="${A}">${B}</span>`;let j=y>=32&&y<=126?String.fromCharCode(y).replace("<","&lt;"):".";u+=`<span ${V} class="ascii-char relative ${P} ${w}" style="${A}">${j}</span>`}else m+="<span></span>",u+="<span></span>"}s+=`<div class="hex-row">${m}</div>`,r+=`<div class="ascii-row">${u}</div>`}return{offsets:o,hexes:s,asciis:r}}var It=(t,i,e,n,a,o)=>{let s=Math.ceil(t.byteLength/n),r=(e-1)*n,l=new Uint8Array(t),c=Math.min(r+n,l.length),{offsets:f,hexes:m,asciis:u}=Ud(l,r,c,i,o);return d`
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
                    <div class="text-gray-400 font-semibold text-right">
                        Offset
                    </div>
                    <div class="text-gray-400 font-semibold text-center">
                        Hexadecimal
                    </div>
                    <div class="text-gray-400 font-semibold text-center">
                        ASCII
                    </div>
                </div>
                <div
                    id="hex-grid-content"
                    class="grid grid-cols-[auto_1fr_auto] gap-x-4"
                >
                    <div class="pr-4 leading-loose">${M(f)}</div>
                    <div class="hex-content-grid leading-loose">
                        ${M(m)}
                    </div>
                    <div class="text-cyan-400 ascii-content-grid leading-loose">
                        ${M(u)}
                    </div>
                </div>
            </div>

            ${s>1?d`
                      <div
                          class="flex-shrink-0 text-center text-sm text-gray-500 py-2 border-t border-gray-700"
                      >
                          Showing bytes ${r} -
                          ${Math.min(r+n-1,t.byteLength-1)}
                          of ${t.byteLength}
                          (${(t.byteLength/1024).toFixed(2)} KB)
                          <button
                              @click=${()=>a(-1)}
                              ?disabled=${e===1}
                              class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1"
                          >
                              &lt;
                          </button>
                          Page ${e} of ${s}
                          <button
                              @click=${()=>a(1)}
                              ?disabled=${e===s}
                              class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1"
                          >
                              &gt;
                          </button>
                      </div>
                  `:""}
        </div>
    `};function Ui(t,i,e){if(!t||!t.bg)return{bg:"bg-gray-700",style:"--tw-bg-opacity: 0.5"};let n=[.1,.2,.3,.4],a=n[e%n.length];return{bg:t.bg.replace(/\/\d+/,""),style:`--tw-bg-opacity: ${a}`}}function dr(t){let i=new Map,e=n=>{if(n.children?.length>0)for(let s of n.children)e(s);let a=Ui(n.color,"Box Content",0);for(let s=n.offset+n.headerSize;s<n.offset+n.size;s++)i.has(s)||i.set(s,{box:n,fieldName:"Box Content",color:a});let o=Ui(n.color,"Box Header",1);for(let s=n.offset;s<n.offset+n.headerSize;s++)i.set(s,{box:n,fieldName:"Box Header",color:o});if(n.details){let s=2;for(let[r,l]of Object.entries(n.details))if(l.offset!==void 0&&l.length!==void 0&&l.length>0){let c=Ui(n.color,r,s++),f=Math.ceil(l.length);for(let m=l.offset;m<l.offset+f;m++)i.set(m,{box:n,fieldName:r,color:c})}}};if(t)for(let n of t)e(n);return i}var Qe=null,Mi=new Map,le=null,Ze=null,et=null;function Et(){return{itemForDisplay:le||Ze,fieldForDisplay:et}}function cr(t){Qe&&(document.removeEventListener("keydown",Qe),Qe=null);let i=Mi.get(t);i&&(t.removeEventListener("mouseover",i.delegatedMouseOver),t.removeEventListener("mouseout",i.delegatedMouseOut),t.removeEventListener("click",i.handleClick),Mi.delete(t))}function fr(t){let i=t.tabContents["interactive-segment"];i&&cr(i),le=null,Ze=null,et=null}function pr(t,i,e,n){let a=t.tabContents["interactive-segment"];if(!a||!i)return;cr(a);let o=(p,h)=>{Ze=p,et=h,te()},s=p=>{le&&le.offset===p?le=null:le=n(i,p),Ze=le,et=null,te()},r=p=>{let h=p.target.closest("[data-byte-offset]");if(!h)return;let y=parseInt(h.dataset.byteOffset,10),b=e.get(y);b&&o(b.box||b.packet,b.fieldName)},l=p=>{let h=p.target.closest("[data-field-name]");if(!h)return;let y=h.dataset.fieldName,b=parseInt(h.dataset.boxOffset||h.dataset.packetOffset,10);if(isNaN(b))return;let C=n(i,b);C&&o(C,y)},c=p=>{let h=p.target.closest("[data-box-offset], [data-group-start-offset]");if(!h)return;let y=parseInt(h.dataset.boxOffset||h.dataset.groupStartOffset,10);if(isNaN(y))return;let b=n(i,y),C=b?.type==="CMAF Chunk"?"Chunk":b?.type?"Box Header":"TS Header";b&&o(b,C)},f=p=>{p.target.closest(".segment-inspector-panel")?l(p):p.target.closest(".box-tree-area, .packet-list-area")?c(p):p.target.closest("#hex-grid-content")&&r(p)},m=p=>{let h=p.relatedTarget,y=p.currentTarget;h&&y.contains(h)||(Ze=null,et=null,te())},u=p=>{let h=p.target;h.closest("summary")&&p.preventDefault();let y=h.closest("[data-box-offset], [data-packet-offset], [data-group-start-offset]");if(y){let b=parseInt(y.dataset.boxOffset,10)??parseInt(y.dataset.packetOffset,10)??parseInt(y.dataset.groupStartOffset,10);isNaN(b)||s(b)}};a.addEventListener("mouseover",f),a.addEventListener("mouseout",m),a.addEventListener("click",u),Mi.set(a,{delegatedMouseOver:f,delegatedMouseOut:m,handleClick:u}),Qe=p=>{p.key==="Escape"&&le!==null&&s(le.offset)},document.addEventListener("keydown",Qe)}var mr=Pe(),ur=[{bg:"bg-red-800",border:"border-red-700"},{bg:"bg-yellow-800",border:"border-yellow-700"},{bg:"bg-green-800",border:"border-green-700"},{bg:"bg-blue-800",border:"border-blue-700"},{bg:"bg-indigo-800",border:"border-indigo-700"},{bg:"bg-purple-800",border:"border-purple-700"},{bg:"bg-pink-800",border:"border-pink-700"},{bg:"bg-teal-800",border:"border-teal-700"}],Md={bg:"bg-slate-700",border:"border-slate-600"};function ki(t,i){for(let e of t){if(i(e))return e;if(e.children?.length>0){let n=ki(e.children,i);if(n)return n}}return null}function gr(t,i){return!t||!t.boxes?null:ki(t.boxes,e=>e.offset===i)||null}function kd(t){let i={index:0},e=(n,a)=>{for(let o of n)o.isChunk?(o.color=Md,o.children?.length>0&&e(o.children,a)):(o.color=ur[a.index%ur.length],a.index++,o.children?.length>0&&e(o.children,a))};t&&e(t,i)}var Rd=(t,i)=>{if(!i||!i.boxes)return null;let e=ki(i.boxes,n=>n.type==="mdhd");return e?e.details?.timescale?.value:null};function Ld(t){let i=[],e=0;for(;e<t.length;){let n=t[e];if(n.type==="moof"&&t[e+1]?.type==="mdat"){let a=t[e+1];i.push({isChunk:!0,type:"CMAF Chunk",offset:n.offset,size:n.size+a.size,children:[n,a]}),e+=2}else i.push(n),e+=1}return i}var Bd=()=>d`...`,Fd=t=>{let{itemForDisplay:i,fieldForDisplay:e}=Et(),n=i;if(!n)return Bd();let a=mr[n.type]||{},o=n.issues&&n.issues.length>0?d`...`:"",s=Object.entries(n.details).map(([r,l])=>{let c=r===e?"bg-purple-900/50":"",f=mr[`${n.type}@${r}`],m=d``;if(r==="baseMediaDecodeTime"&&n.type==="tfdt"){let u=Rd(n,t);u&&(m=d`<span
                    class="text-xs text-cyan-400 block mt-1"
                    >(${(l.value/u).toFixed(3)} seconds)</span
                >`)}return d`
            <tr
                class="${c}"
                data-field-name="${r}"
                data-box-offset="${n.offset}"
            >
                <td
                    class="p-1 pr-2 text-xs text-gray-400 align-top"
                    title="${f?.text||""}"
                >
                    ${r}
                </td>
                <td class="p-1 text-xs font-mono text-white break-all">
                    ${l.value!==void 0?String(l.value):"N/A"}
                    ${m}
                </td>
            </tr>
        `});return d`
        <div class="p-3 border-b border-gray-700">
            <div class="font-bold text-base mb-1">
                ${n.type}
                <span class="text-sm text-gray-400">(${n.size} bytes)</span>
            </div>
            <div class="text-xs text-emerald-400 mb-2 font-mono">
                ${a.ref||""}
            </div>
            <p class="text-xs text-gray-300">
                ${a.text||"No description available."}
            </p>
        </div>
        ${o}
        <div class="overflow-y-auto">
            <table class="w-full table-fixed">
                <colgroup>
                    <col class="w-2/5" />
                    <col class="w-3/5" />
                </colgroup>
                <tbody>
                    ${s}
                </tbody>
            </table>
        </div>
    `};var zd=t=>{},Hd=t=>{};function hr(t,i,e,n){let{activeSegmentUrl:a,segmentCache:o}=_.getState(),s=o.get(a),r=s?.parsedData&&s.parsedData.format==="isobmff"?s.parsedData:null;if(!r)return d`<div class="text-yellow-400 p-4">
            Could not parse ISOBMFF data for this segment.
        </div>`;let l=Ld(r.data.boxes||[]);return kd(l),r.byteMap=dr(l),d`
        <div
            class="grid grid-cols-1 lg:grid-cols-[minmax(300px,25%)_1fr] gap-4"
        >
            <div class="sticky top-4 h-max">
                <div class="flex flex-col gap-4">
                    <div
                        class="segment-inspector-panel rounded-md bg-gray-900/90 border border-gray-700 transition-opacity duration-200 h-[24rem] overflow-hidden flex flex-col"
                    >
                        ${Fd(r.data)}
                    </div>
                    ${Hd(r.data.issues)}
                    ${zd(r.data.boxes)}
                </div>
            </div>
            <div>
                ${It(s.data,r.byteMap,t,i,e,n)}
            </div>
        </div>
    `}E();D();function xr(t){let i=new Map,e={header:{bg:"bg-blue-900/30"},af:{bg:"bg-yellow-900/30"},pcr:{bg:"bg-yellow-700/30"},pes:{bg:"bg-purple-900/30"},pts:{bg:"bg-purple-700/30"},dts:{bg:"bg-purple-600/30"},psi:{bg:"bg-green-900/30"},payload:{bg:"bg-gray-800/20"},stuffing:{bg:"bg-gray-700/20"},pointer:{bg:"bg-cyan-900/30"},null:{bg:"bg-gray-900/40"}};return!t||!t.data||!t.data.packets||t.data.packets.forEach(n=>{for(let o=0;o<4;o++)i.set(n.offset+o,{packet:n,fieldName:"TS Header",color:e.header});let a=n.offset+4;if(n.adaptationField){let o=n.adaptationField,s=n.fieldOffsets.adaptationField.offset,r=o.length.value+1;a=s+r;for(let l=0;l<r;l++)i.set(s+l,{packet:n,fieldName:"Adaptation Field",color:e.af});if(o.pcr)for(let l=0;l<o.pcr.length;l++)i.set(o.pcr.offset+l,{packet:n,fieldName:"PCR",color:e.pcr});if(o.stuffing_bytes)for(let l=0;l<o.stuffing_bytes.length;l++)i.set(o.stuffing_bytes.offset+l,{packet:n,fieldName:"Stuffing",color:e.stuffing})}if(n.fieldOffsets.pointerField){let{offset:o,length:s}=n.fieldOffsets.pointerField;for(let r=0;r<s;r++)i.set(o+r,{packet:n,fieldName:"Pointer Field & Stuffing",color:e.pointer});a=o+s}for(let o=a;o<n.offset+188;o++){if(i.has(o))continue;let s="Payload",r=e.payload;n.pid===8191?(s="Null Packet Payload",r=e.null):n.psi?(s=`PSI (${n.psi.type})`,r=e.psi):n.pes&&(s="PES Payload",r=e.payload),i.set(o,{packet:n,fieldName:s,color:r})}if(n.pes&&n.fieldOffsets.pesHeader){let{offset:o,length:s}=n.fieldOffsets.pesHeader;for(let r=0;r<s;r++)i.set(o+r,{packet:n,fieldName:"PES Header",color:e.pes});if(n.pes.pts)for(let r=0;r<n.pes.pts.length;r++)i.set(n.pes.pts.offset+r,{packet:n,fieldName:"PTS",color:e.pts});if(n.pes.dts)for(let r=0;r<n.pes.dts.length;r++)i.set(n.pes.dts.offset+r,{packet:n,fieldName:"DTS",color:e.dts})}}),i}function yr(t,i){if(!t?.data?.packets)return null;let e=t.data.packets.find(n=>n.offset===i);return e||t.data.packets.find(n=>n.offset>=i)||null}var At=(t,i,e)=>{},Vd=()=>{},Nd=()=>{let{itemForDisplay:t}=Et(),i=t;return i?d`
        <div class="p-3 border-b border-gray-700">
            <div class="font-bold text-base mb-1">
                Packet @${i.offset} (PID: ${i.pid})
            </div>
            <p class="text-xs text-gray-300">${i.payloadType}</p>
        </div>
        <div class="overflow-y-auto">
            <table class="w-full table-fixed">
                <colgroup>
                    <col class="w-2/5" />
                    <col class="w-3/5" />
                </colgroup>
                <tbody>
                    ${Object.entries(i.header).map(([e,n])=>At(i,`Header: ${e}`,n.value))}
                    ${i.adaptationField?Object.entries(i.adaptationField).map(([e,n])=>typeof n.value=="object"&&n.value!==null?Object.entries(n.value).map(([a,o])=>At(i,`AF.${e}.${a}`,o.value)):At(i,`AF: ${e}`,n.value)).flat():""}
                    ${i.pes?Object.entries(i.pes).map(([e,n])=>At(i,`PES: ${e}`,n.value)):""}
                </tbody>
            </table>
        </div>
    `:Vd()},Od=t=>{},Xd=(t,i)=>{};function br(t,i,e,n){let{activeSegmentUrl:a,segmentCache:o}=_.getState(),s=o.get(a),r=s?.parsedData&&s.parsedData.format==="ts"?s.parsedData:null;if(!r||!r.data)return d`<div class="text-yellow-400 p-4">
            Could not parse Transport Stream data for this segment.
        </div>`;r.byteMap=xr(r);let l=c=>{};return d`
        <div
            class="grid grid-cols-1 lg:grid-cols-[minmax(400px,35%)_1fr] gap-6"
        >
            <div class="sticky top-4 h-max flex flex-col gap-4">
                <div
                    class="segment-inspector-panel rounded-md bg-gray-900/90 border border-gray-700 transition-opacity duration-200 h-[24rem] overflow-hidden flex flex-col"
                >
                    ${Nd()}
                </div>
                ${Od(r.data.summary)}
                ${Xd(r.data.packets,l)}
            </div>
            <div>
                ${It(s.data,r.byteMap,t,i,e,n)}
            </div>
        </div>
    `}var _r={"AF@length":{text:"The total length of the adaptation field in bytes, not including this length byte itself.",ref:"Clause 2.4.3.5"},"AF@discontinuity_indicator":{text:"Set to 1 if a discontinuity is indicated for the current TS packet.",ref:"Clause 2.4.3.5"},"AF@random_access_indicator":{text:"Set to 1 if the stream may be randomly accessed at this point.",ref:"Clause 2.4.3.5"},"AF@pcr_flag":{text:"Set to 1 if the adaptation field contains a Program Clock Reference (PCR).",ref:"Clause 2.4.3.5"},"AF@pcr":{text:"Program Clock Reference. A timestamp used to synchronize the decoder's clock.",ref:"Clause 2.4.3.5"},"AF@af_descriptor_not_present_flag":{text:"If set to 0, signals the presence of one or more descriptors in the adaptation field extension.",ref:"Clause 2.4.3.4"}};var vr={PAT:{text:"Program Association Table. Lists all programs in a stream, mapping each to the PID of its Program Map Table (PMT).",ref:"Clause 2.4.4.4"},"PAT@network_pid":{text:"The PID for the Network Information Table (NIT).",ref:"Table 2-30"},"PAT@program_map_PID":{text:"The PID of the Transport Stream packets which shall contain the Program Map Table for this program.",ref:"Table 2-30"}};var Tr={PMT:{text:"Program Map Table. Lists all elementary streams (video, audio, etc.) that constitute a single program.",ref:"Clause 2.4.4.9"},"PMT@pcr_pid":{text:"The PID of the transport stream packets that carry the PCR fields valid for this program.",ref:"Table 2-33"},"PMT@stream_type":{text:"An 8-bit field specifying the type of the elementary stream.",ref:"Table 2-34"},"PMT@elementary_PID":{text:"The PID of the transport stream packets that carry the elementary stream data.",ref:"Table 2-33"}};var Cr={CAT:{text:"Conditional Access Table. Provides information on CA systems used in the multiplex.",ref:"Clause 2.4.4.7"}};var Ir={TSDT:{text:"Transport Stream Description Table. Contains descriptors that apply to the entire transport stream.",ref:"Clause 2.4.4.13"}};var Er={"Private Section":{text:"A section containing user-defined private data. The structure and meaning of this data is not defined by the MPEG-2 specification.",ref:"Clause 2.4.4.11"}};var Ar={"IPMP-CIT":{text:"IPMP Control Information Table. Contains information for Intellectual Property Management and Protection systems.",ref:"Clause 2.4.4.1, ISO/IEC 13818-11"}};var Dr={PES:{text:"Packetized Elementary Stream. Contains elementary stream data (e.g., video or audio frames) and timing information.",ref:"Clause 2.4.3.7"},"PES@packet_start_code_prefix":{text:"A unique 24-bit code (0x000001) that identifies the start of a PES packet.",ref:"Table 2-21"},"PES@stream_id":{text:"Identifies the type of elementary stream (e.g., 0xE0 for video).",ref:"Table 2-22"},"PES@pes_packet_length":{text:"The number of bytes in the PES packet following this field. A value of 0 is only allowed for video in a transport stream.",ref:"Clause 2.4.3.7"},"PES@pts_dts_flags":{text:"Indicates whether Presentation Time Stamp (PTS) and/or Decoding Time Stamp (DTS) are present.",ref:"Table 2-21"},"PES@pts":{text:"Presentation Time Stamp. Specifies the time at which a presentation unit is to be presented.",ref:"Clause 2.4.3.7"},"PES@dts":{text:"Decoding Time Stamp. Specifies the time at which a presentation unit is to be decoded.",ref:"Clause 2.4.3.7"},"PES@escr_flag":{text:"If set to 1, indicates the Elementary Stream Clock Reference (ESCR) field is present.",ref:"Clause 2.4.3.7"},"PES@ESCR":{text:"Elementary Stream Clock Reference. A time stamp from which decoders of PES streams may derive timing.",ref:"Clause 2.4.3.7"},"PES@es_rate_flag":{text:"If set to 1, indicates the ES_rate field is present.",ref:"Clause 2.4.3.7"},"PES@ES_rate":{text:"The rate at which the system target decoder receives bytes of the PES packet in a PES stream, in units of 50 bytes/second.",ref:"Clause 2.4.3.7"},"PES@dsm_trick_mode_flag":{text:"A 1-bit flag which when set to '1' indicates the presence of an 8-bit trick mode field.",ref:"Clause 2.4.3.7"},"PES@trick_mode_control":{text:"A 3-bit field that indicates which trick mode is applied to the associated video stream.",ref:"Clause 2.4.3.7, Table 2-24"},"PES@additional_copy_info_flag":{text:"If set to 1, indicates the additional_copy_info field is present.",ref:"Clause 2.4.3.7"},"PES@additional_copy_info":{text:"Private data relating to copyright information.",ref:"Clause 2.4.3.7"},"PES@pes_crc_flag":{text:"If set to 1, indicates the previous_PES_packet_CRC field is present.",ref:"Clause 2.4.3.7"},"PES@previous_PES_packet_CRC":{text:"A 16-bit CRC field calculated over the data bytes of the previous PES packet.",ref:"Clause 2.4.3.7"},"PES@pes_extension_flag":{text:"A 1-bit flag which when set to '1' indicates that an extension field exists in this PES packet header.",ref:"Clause 2.4.3.7"},"PES@pack_header_field_flag":{text:"If set to 1, indicates that a program stream pack header is stored in this PES packet header.",ref:"Clause 2.4.3.7"},"PES@program_packet_sequence_counter_flag":{text:"If set to 1, indicates the program_packet_sequence_counter and related fields are present.",ref:"Clause 2.4.3.7"},"PES@program_packet_sequence_counter":{text:"An optional 7-bit counter that increments with each successive PES packet of a program, allowing reconstruction of the original packet sequence.",ref:"Clause 2.4.3.7"},"PES@P_STD_buffer_flag":{text:"If set to 1, indicates the P-STD buffer scale and size fields are present.",ref:"Clause 2.4.3.7"},"PES@P_STD_buffer_size":{text:"Defines the size of the input buffer in the P-STD for this elementary stream.",ref:"Clause 2.4.3.7"},"PES@pes_extension_flag_2":{text:"A flag indicating the presence of further extension fields, like TREF or stream_id_extension.",ref:"Clause 2.4.3.7, Table 2-21"},"PES@PES_extension_field_length":{text:"The length in bytes of the data following this field in the PES extension.",ref:"Clause 2.4.3.7, Table 2-21"},"PES@stream_id_extension_flag":{text:"Indicates if the stream_id_extension field is present (flag=0) or if other extension flags are present (flag=1).",ref:"Clause 2.4.3.7, Table 2-21"},"PES@stream_id_extension":{text:"An extension to the stream_id field, allowing for more stream types to be identified.",ref:"Clause 2.4.3.7, Table 2-27"},"PES@tref_extension_flag":{text:"Indicates if the Timestamp Reference (TREF) field is present.",ref:"Clause 2.4.3.7, Table 2-21"},"PES@TREF":{text:"Timestamp Reference. Indicates the decoding time of a corresponding access unit in a reference elementary stream.",ref:"Clause 2.4.3.7"}};var $r={"DSM-CC Section/Packet":{text:"Digital Storage Media Command and Control. A protocol for controlling playback of stored or broadcast media, used in interactive TV and other applications.",ref:"Annex B & ISO/IEC 13818-6"},"DSM-CC Control":{text:"A DSM-CC control command message.",ref:"Table B.3"},"DSM-CC Ack":{text:"A DSM-CC acknowledgement message.",ref:"Table B.5"},"DSM-CC Control@command_id":{text:"Identifies the message as a control command (0x01).",ref:"Table B.2"},"DSM-CC Ack@command_id":{text:"Identifies the message as an acknowledgement (0x02).",ref:"Table B.2"},"DSM-CC Control@select_flag":{text:"When set to 1, specifies a bitstream selection operation.",ref:"Clause B.3.5"},"DSM-CC Control@retrieval_flag":{text:"When set to 1, specifies a playback (retrieval) action.",ref:"Clause B.3.5"},"DSM-CC Control@storage_flag":{text:"When set to 1, specifies a storage operation.",ref:"Clause B.3.5"},"DSM-CC Control@bitstream_id":{text:"A 32-bit identifier specifying which bitstream to select.",ref:"Clause B.3.5"},"DSM-CC Control@select_mode":{text:"Specifies the mode of operation (1=Storage, 2=Retrieval).",ref:"Table B.4"},"DSM-CC Control@jump_flag":{text:"When set to 1, specifies a jump to a new PTS.",ref:"Clause B.3.5"},"DSM-CC Control@play_flag":{text:"When set to 1, specifies to play the stream.",ref:"Clause B.3.5"},"DSM-CC Control@pause_mode":{text:"When set to 1, specifies to pause playback.",ref:"Clause B.3.5"},"DSM-CC Control@resume_mode":{text:"When set to 1, specifies to resume playback.",ref:"Clause B.3.5"},"DSM-CC Control@stop_mode":{text:"When set to 1, specifies to stop the current operation.",ref:"Clause B.3.5"},"DSM-CC Control@direction_indicator":{text:"Indicates playback direction (1=forward, 0=backward).",ref:"Clause B.3.5"},"DSM-CC Control@speed_mode":{text:"Specifies playback speed (1=normal, 0=fast).",ref:"Clause B.3.5"},"DSM-CC Control@record_flag":{text:"When set to 1, requests recording of the bitstream.",ref:"Clause B.3.5"},"DSM-CC Ack@select_ack":{text:"Acknowledges a select command.",ref:"Clause B.3.7"},"DSM-CC Ack@retrieval_ack":{text:"Acknowledges a retrieval command.",ref:"Clause B.3.7"},"DSM-CC Ack@storage_ack":{text:"Acknowledges a storage command.",ref:"Clause B.3.7"},"DSM-CC Ack@error_ack":{text:"Indicates a DSM error (e.g., End of File).",ref:"Clause B.3.7"},"DSM-CC Ack@cmd_status":{text:"Indicates if the command was accepted (1) or rejected (0).",ref:"Clause B.3.7"},"DSM-CC Control@infinite_time_flag":{text:"When set to 1, indicates an infinite time period for an operation.",ref:"Clause B.3.9"},"DSM-CC Ack@infinite_time_flag":{text:"When set to 1, indicates an infinite time period for an operation.",ref:"Clause B.3.9"},"DSM-CC Control@PTS":{text:"Specifies a relative duration for an operation, in 90kHz clock ticks.",ref:"Clause B.3.8"},"DSM-CC Ack@PTS":{text:"Reports the current operational PTS value, in 90kHz clock ticks.",ref:"Clause B.3.8"}};var Pr={Timeline_descriptor:{text:"Carries timing information to synchronize external data with the media timeline.",ref:"ISO/IEC 13818-1, Annex U.3.6"},"Timeline_descriptor@has_timestamp":{text:"Indicates if a media timestamp is present and its size (0: no, 1: 32-bit, 2: 64-bit).",ref:"Table U.8"},"Timeline_descriptor@has_ntp":{text:"If set to 1, indicates an NTP timestamp is present.",ref:"Table U.8"},"Timeline_descriptor@has_ptp":{text:"If set to 1, indicates a PTP timestamp is present.",ref:"Table U.8"},"Timeline_descriptor@has_timecode":{text:"Indicates if a frame timecode is present and its type.",ref:"Table U.8"},"Timeline_descriptor@force_reload":{text:"If set to 1, indicates that prior add-on descriptions may be obsolete and should be reloaded.",ref:"Table U.8"},"Timeline_descriptor@paused":{text:"If set to 1, indicates that the timeline identified by timeline_id is currently paused.",ref:"Table U.8"},"Timeline_descriptor@discontinuity":{text:"If set to 1, indicates that a discontinuity has occurred in the timeline.",ref:"Table U.8"},"Timeline_descriptor@timeline_id":{text:"Identifies the active timeline to which this timing information applies.",ref:"Table U.8"},"Timeline_descriptor@timescale":{text:"The number of time units that pass in one second for the media_timestamp.",ref:"Table U.8"},"Timeline_descriptor@media_timestamp":{text:"The media time in `timescale` units corresponding to the associated PTS value.",ref:"Table U.8"},"Timeline_descriptor@ntp_timestamp":{text:"A 64-bit NTP timestamp corresponding to the associated PTS value.",ref:"Table U.8"},"Timeline_descriptor@ptp_timestamp":{text:"An 80-bit PTP timestamp.",ref:"Table U.8"},"Timeline_descriptor@timecode_data":{text:"Timecode data structures.",ref:"Table U.8"}};var jd={content_labeling_descriptor:{text:"Assigns a label to content, which can be used by metadata to reference the associated content.",ref:"Clause 2.6.56"},metadata_pointer_descriptor:{text:"Points to a single metadata service and associates it with audiovisual content.",ref:"Clause 2.6.58"},metadata_descriptor:{text:"Specifies parameters of a metadata service carried in the stream, such as its format and decoder configuration.",ref:"Clause 2.6.60"},metadata_STD_descriptor:{text:"Defines parameters of the System Target Decoder (STD) model for processing the associated metadata stream.",ref:"Clause 2.6.62"}},Gd={HEVC_video_descriptor:{text:"Provides basic information for identifying coding parameters of an HEVC (H.265) video stream.",ref:"Clause 2.6.95"},"HEVC_video_descriptor@profile_idc":{text:"Indicates the profile to which the HEVC stream conforms.",ref:"Clause 2.6.96"},"HEVC_video_descriptor@level_idc":{text:"Indicates the level to which the HEVC stream conforms.",ref:"Clause 2.6.96"},"HEVC_video_descriptor@tier_flag":{text:"Indicates the tier (Main or High) of the HEVC stream.",ref:"Clause 2.6.96"},"HEVC_video_descriptor@temporal_layer_subset_flag":{text:"If set to 1, indicates that syntax elements describing a subset of temporal layers are included.",ref:"Clause 2.6.96"},HEVC_timing_and_HRD_descriptor:{text:"Provides timing and Hypothetical Reference Decoder (HRD) parameters for an HEVC stream. This is an Extension Descriptor.",ref:"Clause 2.6.97"},"HEVC_timing_and_HRD_descriptor@hrd_management_valid_flag":{text:"If set to 1, indicates that HRD management is active and Buffering Period/Picture Timing SEIs shall be present.",ref:"Clause 2.6.98"},HEVC_hierarchy_extension_descriptor:{text:"Provides information to identify components of layered HEVC streams (e.g., SHVC, MV-HEVC). This is an Extension Descriptor.",ref:"Clause 2.6.102"},"HEVC_hierarchy_extension_descriptor@extension_dimension_bits":{text:"A 16-bit field indicating the enhancement dimensions present (e.g., multi-view, spatial scalability).",ref:"Clause 2.6.103, Table 2-117"},"HEVC_hierarchy_extension_descriptor@hierarchy_layer_index":{text:"A unique index for this program element in the coding layer hierarchy.",ref:"Clause 2.6.103"},"HEVC_hierarchy_extension_descriptor@nuh_layer_id":{text:"Specifies the highest nuh_layer_id of the NAL units in the elementary stream associated with this descriptor.",ref:"Clause 2.6.103"},HEVC_operation_point_descriptor:{text:"Provides a method to indicate profile and level for one or more HEVC operation points (for layered video).",ref:"Clause 2.6.100"},Green_extension_descriptor:{text:"Contains static metadata related to energy-efficient media consumption (Green Metadata).",ref:"Clause 2.6.104 / ISO/IEC 23001-11"},MPEG_H_3dAudio_descriptor:{text:"Provides basic coding information for an MPEG-H 3D Audio stream.",ref:"Clause 2.6.106 / ISO/IEC 23008-3"},Quality_extension_descriptor:{text:"Describes quality metrics that are present in each Quality Access Unit for dynamic quality metadata.",ref:"Clause 2.6.119 / ISO/IEC 23001-10"},Virtual_segmentation_descriptor:{text:"Indicates that an elementary stream is virtually segmented, often used for ad insertion or cloud DVR.",ref:"Clause 2.6.120"},HEVC_tile_substream_descriptor:{text:"Assigns an ID to an HEVC tile substream, used for panoramic/Region-of-Interest streaming.",ref:"Clause 2.6.122"},HEVC_subregion_descriptor:{text:"Signals patterns of SubstreamIDs that belong to a subregion for HEVC tiled streaming.",ref:"Clause 2.6.125"}},Wd={...jd,...Pr,...Gd,CA_descriptor:{text:"Conditional Access Descriptor. Provides information about the CA system used for scrambling.",ref:"Clause 2.6.16"},"CA_descriptor@ca_system_ID":{text:"A 16-bit identifier for the Conditional Access system.",ref:"Clause 2.6.17"},"CA_descriptor@ca_PID":{text:"The PID of the transport stream packets that carry the EMM or ECM data for this CA system.",ref:"Clause 2.6.17"},video_stream_descriptor:{text:"Provides basic coding parameters of a video elementary stream.",ref:"Clause 2.6.2"},audio_stream_descriptor:{text:"Provides basic information which identifies the coding version of an audio elementary stream.",ref:"Clause 2.6.4"},AVC_video_descriptor:{text:"Provides basic information for identifying coding parameters of an AVC (H.264) video stream.",ref:"Clause 2.6.64"},AVC_timing_and_HRD_descriptor:{text:"Provides timing and Hypothetical Reference Decoder (HRD) parameters of the associated AVC video stream.",ref:"Clause 2.6.66"},"AVC_timing_and_HRD_descriptor@hrd_management_valid_flag":{text:"If set to 1, indicates that HRD management is active and Buffering Period/Picture Timing SEIs shall be present.",ref:"Clause 2.6.67"},"AVC_timing_and_HRD_descriptor@picture_and_timing_info_present":{text:"If set to 1, indicates that detailed timing information (90kHz flag, N, K, etc.) is present in the descriptor.",ref:"Clause 2.6.67"},"AVC_timing_and_HRD_descriptor@90kHz_flag":{text:"If set to 1, indicates the AVC time base is 90 kHz. If 0, N and K are used to define the time base.",ref:"Clause 2.6.67"},"AVC_timing_and_HRD_descriptor@fixed_frame_rate_flag":{text:"If set to 1, indicates that the coded frame rate is constant within the AVC stream.",ref:"Clause 2.6.67"},MPEG2_AAC_audio_descriptor:{text:"Provides basic information for identifying the coding parameters of an MPEG-2 AAC audio elementary stream.",ref:"Clause 2.6.68"},"MPEG2_AAC_audio_descriptor@MPEG_2_AAC_profile":{text:"Indicates the AAC profile (e.g., Main, LC, SSR) according to ISO/IEC 13818-7.",ref:"Clause 2.6.69"},"MPEG2_AAC_audio_descriptor@MPEG_2_AAC_channel_configuration":{text:"Indicates the number and configuration of audio channels (e.g., mono, stereo, 5.1).",ref:"Clause 2.6.69"},"MPEG2_AAC_audio_descriptor@MPEG_2_AAC_additional_information":{text:"Indicates whether features like Bandwidth Extension (SBR) are present.",ref:"Clause 2.6.69"},hierarchy_descriptor:{text:"Identifies program elements of hierarchically-coded video, audio, and private streams.",ref:"Clause 2.6.6"},registration_descriptor:{text:"Provides a method to uniquely and unambiguously identify formats of private data.",ref:"Clause 2.6.8"},"registration_descriptor@format_identifier":{text:'A 32-bit value obtained from a Registration Authority that identifies the private format. Often represented as a four-character code (e.g., "CUEI" for SCTE-35).',ref:"Clause 2.6.9"},ISO_639_language_descriptor:{text:"Specifies the language of an audio or text program element.",ref:"Clause 2.6.18"},"ISO_639_language_descriptor@language":{text:"A 3-character language code as specified by ISO 639-2.",ref:"Clause 2.6.19"},"ISO_639_language_descriptor@audio_type":{text:"Specifies the type of audio service (e.g., clean effects, hearing impaired).",ref:"Clause 2.6.19, Table 2-61"},data_stream_alignment_descriptor:{text:"Describes the type of alignment present in the elementary stream when the data_alignment_indicator in the PES header is set.",ref:"Clause 2.6.10"},"data_stream_alignment_descriptor@alignment_type":{text:"Indicates the syntax element on which the stream is aligned (e.g., Access Unit, GOP, Slice). The meaning is context-dependent based on the stream type.",ref:"Clause 2.6.11, Tables 2-53 to 2-56"},"MPEG-4_video_descriptor":{text:"Provides basic information for identifying the coding parameters of an MPEG-4 Visual elementary stream.",ref:"Clause 2.6.36"},"MPEG-4_video_descriptor@MPEG4_visual_profile_and_level":{text:"An 8-bit field identifying the profile and level of the MPEG-4 Visual stream.",ref:"Clause 2.6.37"},"MPEG-4_audio_descriptor":{text:"Provides basic information for identifying the coding parameters of an MPEG-4 audio stream.",ref:"Clause 2.6.38"},"MPEG-4_audio_descriptor@MPEG4_audio_profile_and_level":{text:"An 8-bit field identifying the profile and level of the MPEG-4 audio stream.",ref:"Clause 2.6.39, Table 2-72"},"MPEG-4_text_descriptor":{text:"Carries the TextConfig() structure for an ISO/IEC 14496-17 text stream.",ref:"Clause 2.6.70"},"AVC_video_descriptor@profile_idc":{text:"Indicates the profile to which the AVC stream conforms (e.g., 66=Baseline, 77=Main, 100=High).",ref:"Table 2-92 / H.264 Spec"},"AVC_video_descriptor@level_idc":{text:"Indicates the level to which the AVC stream conforms.",ref:"Table 2-92 / H.264 Spec"},"AVC_video_descriptor@constraint_set0_flag":{text:"A constraint flag for Baseline Profile.",ref:"Table 2-92 / H.264 Spec"},"AVC_video_descriptor@constraint_set1_flag":{text:"A constraint flag for Main Profile.",ref:"Table 2-92 / H.264 Spec"},"AVC_video_descriptor@constraint_set2_flag":{text:"A constraint flag for Extended Profile.",ref:"Table 2-92 / H.264 Spec"},"AVC_video_descriptor@AVC_still_present":{text:"If set to 1, indicates that the stream may include AVC still pictures.",ref:"Table 2-92"},"AVC_video_descriptor@AVC_24_hour_picture_flag":{text:"If set to 1, indicates the stream may contain pictures with a presentation time more than 24 hours in the future.",ref:"Table 2-92"},"hierarchy_descriptor@hierarchy_type":{text:"Defines the hierarchical relation between this layer and its embedded layer (e.g., Spatial, SNR, Temporal, MVC).",ref:"Clause 2.6.7, Table 2-50"},"hierarchy_descriptor@hierarchy_layer_index":{text:"A unique index for this program element in the coding layer hierarchy.",ref:"Clause 2.6.7"},"hierarchy_descriptor@hierarchy_embedded_layer_index":{text:"The index of the program element that this layer depends on for decoding.",ref:"Clause 2.6.7"},IBP_descriptor:{text:"Provides information on the GOP structure of an MPEG-2 video stream.",ref:"Clause 2.6.34"},"IBP_descriptor@closed_gop_flag":{text:"If set to 1, indicates that all GOPs are closed (i.e., can be decoded without reference to a previous GOP).",ref:"Clause 2.6.35"},"IBP_descriptor@identical_gop_flag":{text:"If set to 1, indicates that the GOP structure (sequence of I, P, B frames) is the same throughout the sequence.",ref:"Clause 2.6.35"},"IBP_descriptor@max_gop_length":{text:"Indicates the maximum number of pictures between any two consecutive I-pictures.",ref:"Clause 2.6.35"},maximum_bitrate_descriptor:{text:"Specifies the maximum bitrate of the program element or program.",ref:"Clause 2.6.26"},"maximum_bitrate_descriptor@maximum_bitrate":{text:"An upper bound of the bitrate in units of 50 bytes/second, including transport overhead.",ref:"Clause 2.6.27"},private_data_indicator_descriptor:{text:"Indicates the presence of a specific private data format.",ref:"Clause 2.6.28"},"private_data_indicator_descriptor@private_data_indicator":{text:"A 32-bit value whose meaning is privately defined, but should correspond to a registered format identifier.",ref:"Clause 2.6.29"},system_clock_descriptor:{text:"Conveys information about the system clock that was used to generate timestamps.",ref:"Clause 2.6.20"},"system_clock_descriptor@external_clock_reference_indicator":{text:"If set to 1, indicates the system clock was derived from an external frequency reference.",ref:"Clause 2.6.21"},"system_clock_descriptor@clock_accuracy_integer":{text:"The integer part of the clock accuracy value.",ref:"Clause 2.6.21"},"system_clock_descriptor@clock_accuracy_exponent":{text:"The exponent part of the clock accuracy value, used to calculate accuracy in parts-per-million.",ref:"Clause 2.6.21"},Extension_descriptor:{text:"Provides a mechanism to extend the descriptor range using an extended tag.",ref:"Clause 2.6.90"},"Extension_descriptor@extension_descriptor_tag":{text:"An 8-bit tag that identifies the nested descriptor.",ref:"Clause 2.6.91, Table 2-108"},"Extension_descriptor@nested_descriptor_name":{text:"The name of the descriptor identified by the extension tag.",ref:"Clause 2.6.91"},copyright_descriptor:{text:"Provides a method to enable audiovisual works identification.",ref:"Clause 2.6.24"},"copyright_descriptor@copyright_identifier":{text:"A 32-bit value obtained from a Registration Authority that identifies the work type (e.g., ISAN, ISBN).",ref:"Clause 2.6.25"},smoothing_buffer_descriptor:{text:"Conveys the size of a smoothing buffer and the associated leak rate for the program element.",ref:"Clause 2.6.30"},"smoothing_buffer_descriptor@sb_leak_rate":{text:"The value of the leak rate out of the smoothing buffer in units of 400 bits/s.",ref:"Clause 2.6.31"},"smoothing_buffer_descriptor@sb_size":{text:"The size of the smoothing buffer in units of 1 byte.",ref:"Clause 2.6.31"},multiplex_buffer_utilization_descriptor:{text:"Provides bounds on the occupancy of the STD multiplex buffer, intended for use by re-multiplexers.",ref:"Clause 2.6.22"},"multiplex_buffer_utilization_descriptor@bound_valid_flag":{text:"A flag indicating if the lower and upper bound fields are valid.",ref:"Clause 2.6.23"},"multiplex_buffer_utilization_descriptor@LTW_offset_lower_bound":{text:"The lowest value that any Legal Time Window (LTW) offset field would have in the stream.",ref:"Clause 2.6.23"},"multiplex_buffer_utilization_descriptor@LTW_offset_upper_bound":{text:"The largest value that any Legal Time Window (LTW) offset field would have in the stream.",ref:"Clause 2.6.23"},STD_descriptor:{text:"Applies only to the T-STD model for MPEG-2 video streams.",ref:"Clause 2.6.32"},"STD_descriptor@leak_valid_flag":{text:"If 1, the T-STD uses the leak method for buffer transfer. If 0, it uses the vbv_delay method.",ref:"Clause 2.6.33"},target_background_grid_descriptor:{text:"Describes a grid of unit pixels projected on to the display area for video windowing.",ref:"Clause 2.6.12"},"target_background_grid_descriptor@horizontal_size":{text:"The horizontal size of the target background grid in pixels.",ref:"Clause 2.6.13"},"target_background_grid_descriptor@vertical_size":{text:"The vertical size of the target background grid in pixels.",ref:"Clause 2.6.13"},"target_background_grid_descriptor@aspect_ratio_information":{text:"Specifies the sample or display aspect ratio of the target background grid.",ref:"Clause 2.6.13"},video_window_descriptor:{text:"Describes the window characteristics of the associated video elementary stream, relative to the target background grid.",ref:"Clause 2.6.14"},"video_window_descriptor@horizontal_offset":{text:"The horizontal position of the top left pixel of the video window on the target grid.",ref:"Clause 2.6.15"},"video_window_descriptor@vertical_offset":{text:"The vertical position of the top left pixel of the video window on the target grid.",ref:"Clause 2.6.15"},"video_window_descriptor@window_priority":{text:"Indicates the front-to-back ordering of overlapping windows (0=lowest, 15=highest).",ref:"Clause 2.6.15"},IOD_descriptor:{text:"Encapsulates the InitialObjectDescriptor, which is the entry point to an ISO/IEC 14496 (MPEG-4) scene.",ref:"Clause 2.6.40"},SL_descriptor:{text:"Associates an ISO/IEC 14496-1 ES_ID with an elementary stream carried in PES packets.",ref:"Clause 2.6.42"},"SL_descriptor@ES_ID":{text:"The 16-bit identifier of the ISO/IEC 14496-1 SL-packetized stream.",ref:"Clause 2.6.43"},FMC_descriptor:{text:"Associates FlexMux channels to the ES_ID values of the SL-packetized streams within a FlexMux stream.",ref:"Clause 2.6.44"},"FMC_descriptor@ES_ID":{text:"The ES_ID of an SL-packetized stream within the FlexMux.",ref:"Clause 2.6.45"},"FMC_descriptor@FlexMuxChannel":{text:"The FlexMux channel number used for this SL-packetized stream.",ref:"Clause 2.6.45"},SVC_extension_descriptor:{text:"Provides detailed information about an SVC (Scalable Video Coding) video sub-bitstream.",ref:"Clause 2.6.76"},MVC_extension_descriptor:{text:"Provides detailed information about an MVC (Multi-view Coding) video sub-bitstream.",ref:"Clause 2.6.78"},FlexMuxTiming_descriptor:{text:"Conveys timing information for an ISO/IEC 14496-1 FlexMux stream.",ref:"Clause 2.6.54"},multiplexBuffer_descriptor:{text:"Conveys the size of the multiplex buffer (MBn) and the leak rate (Rxn) from the transport buffer (TBn) for an ISO/IEC 14496 stream.",ref:"Clause 2.6.52"},MPEG2_stereoscopic_video_format_descriptor:{text:"Indicates the type of stereoscopic video format included in the user_data of an MPEG-2 video elementary stream.",ref:"Clause 2.6.84"},Stereoscopic_program_info_descriptor:{text:"Specifies the type of stereoscopic service, such as monoscopic, frame-compatible, or service-compatible.",ref:"Clause 2.6.86"},Stereoscopic_video_info_descriptor:{text:"Provides information for service-compatible stereoscopic 3D services that carry left and right views in separate video streams.",ref:"Clause 2.6.88"},Transport_profile_descriptor:{text:"Signals a profile value of the transport stream for the associated program, indicating specific constraints (e.g., for adaptive streaming).",ref:"Clause 2.6.93"},J2K_video_descriptor:{text:"Provides information for identifying and decoding a JPEG 2000 video elementary stream.",ref:"Clause 2.6.80"},"J2K_video_descriptor@profile_and_level":{text:"Specifies the profile and level of the JPEG 2000 video stream, corresponding to the Rsiz value in the codestream.",ref:"Clause 2.6.81"},"J2K_video_descriptor@extended_capability_flag":{text:"Indicates if the stream uses extended color specification and may have capabilities like stripes or blocks.",ref:"Clause 2.6.81"},"SEMANTIC-PTS-FREQ":{text:"Validates that the time interval between consecutive Presentation Time Stamps (PTS) for any single elementary stream does not exceed 0.7 seconds.",ref:"Clause 2.7.4"},"SEMANTIC-PTS-DISCONT":{text:"Validates that a Presentation Time Stamp (PTS) is present for the first access unit following a discontinuity.",ref:"Clause 2.7.5"},"SEMANTIC-TB-OVERFLOW":{text:"Validates that the Transport Buffer (TBn) in the T-STD model does not overflow for any elementary stream.",ref:"Clause 2.4.2.7"},"SEMANTIC-PCR-FREQ":{text:"Validates that the time interval between consecutive Program Clock References (PCRs) for a program does not exceed 0.1 seconds.",ref:"Clause 2.7.2"},"SEMANTIC-CC-ERROR":{text:"Checks for unexpected jumps in the continuity_counter for a PID, which indicates potential packet loss.",ref:"Clause 2.4.3.3"},MPEG4_audio_extension_descriptor:{text:"Carries additional audio profile/level indications and optionally the AudioSpecificConfig for an MPEG-4 audio stream.",ref:"Clause 2.6.72"},"MPEG4_audio_extension_descriptor@ASC_flag":{text:"If set to 1, indicates that the AudioSpecificConfig (ASC) data is present in this descriptor.",ref:"Clause 2.6.73"},"MPEG4_audio_extension_descriptor@num_of_loops":{text:"The number of audioProfileLevelIndication fields that follow.",ref:"Clause 2.6.73"},"MPEG4_audio_extension_descriptor@audioProfileLevelIndication":{text:"Indicates an audio profile and level to which the stream conforms.",ref:"Clause 2.6.73 / ISO/IEC 14496-3"},"MPEG4_audio_extension_descriptor@ASC_size":{text:"The size in bytes of the following AudioSpecificConfig data.",ref:"Clause 2.6.73"},"MPEG4_audio_extension_descriptor@audioSpecificConfig":{text:"The AudioSpecificConfig data, which provides detailed decoder configuration for MPEG-4 audio.",ref:"Clause 2.6.73 / ISO/IEC 14496-3"},Auxiliary_video_stream_descriptor:{text:"Specifies parameters for the decoding and interpretation of an auxiliary video stream (e.g., depth maps for 3D video).",ref:"Clause 2.6.74"},"Auxiliary_video_stream_descriptor@aux_video_codedstreamtype":{text:"Indicates the compression coding type of the auxiliary video stream (e.g., 0x1B for H.264/AVC).",ref:"Clause 2.6.75"},"Auxiliary_video_stream_descriptor@si_rbsp_data":{text:"The Supplemental Information Raw Byte Sequence Payload, containing detailed parameters for the auxiliary video as defined in ISO/IEC 23002-3.",ref:"Clause 2.6.75"},external_ES_ID_descriptor:{text:"Assigns an ES_ID to a program element, allowing non-MPEG-4 components to be referenced in an MPEG-4 scene.",ref:"Clause 2.6.46"},MuxCode_descriptor:{text:"Conveys MuxCodeTableEntry structures to configure the MuxCode mode of FlexMux.",ref:"Clause 2.6.48"},FmxBufferSize_descriptor:{text:"Conveys the size of the FlexMux buffer (FB) for each SL packetized stream multiplexed in a FlexMux stream.",ref:"Clause 2.6.50"},IPMP_descriptor:{text:"Provides information for Intellectual Property Management and Protection (IPMP) systems.",ref:"Clause 2.6, Tag 0x29 / ISO/IEC 13818-11"},MVC_operation_point_descriptor:{text:"Indicates profile and level for one or more operation points of an MVC (Multi-view Coding) bitstream.",ref:"Clause 2.6.82"}},wr={..._r,...Cr,...Wd,...$r,...Ar,...vr,...Tr,...Dr,...Er,...Ir};function Ur(){return wr}var Mr=null,Ri=1024,kr={...Pe(),...Ur()},Dt=!1;function qd(t,i){if(Dt)return;let e,n,a;if(i.parsedData?.format==="ts"){let o=i.parsedData;e=o.byteMap,n=yr,a=o}else if(i.parsedData?.format==="isobmff"){let o=i.parsedData;e=o.byteMap,n=gr,a=o.data}e&&n&&a&&(pr(t,a,e,n),Dt=!0)}function Rr(t){let{activeSegmentUrl:i,segmentCache:e,interactiveSegmentCurrentPage:n}=_.getState();if(i!==Mr&&(fr(t),Dt=!1,Mr=i),!i)return d`
            <div class="text-center py-12">
                <div class="text-gray-400 text-lg mb-4">
                    📄 Interactive Segment View
                </div>
                <p class="text-gray-500">
                    Select a segment from the "Segment Explorer" tab and click
                    "View Raw" to inspect its content here.
                </p>
            </div>
        `;let a=e.get(i);if(!a||a.status===-1)return d`
            <div class="text-center py-12">
                <div
                    class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
                ></div>
                <p class="text-gray-400">Loading and parsing segment data...</p>
            </div>
        `;if(a.status!==200||!a.data)return d`
            <div class="text-center py-12">
                <div class="text-red-400 text-lg mb-2">❌ Failed to Load</div>
                <p class="text-gray-400">
                    Failed to fetch segment. Status:
                    ${a.status||"Network Error"}.
                </p>
            </div>
        `;let o=r=>{let l=Math.ceil(a.data.byteLength/Ri),c=n+r;c>=1&&c<=l&&(Dt=!1,I.setInteractiveSegmentPage(c))},s;return a.parsedData?.format==="ts"?s=br(n,Ri,o,kr):a.parsedData?.format==="isobmff"?s=hr(n,Ri,o,kr):s=d`<div class="text-yellow-400 p-4">
            Interactive view not supported for this segment format.
        </div>`,setTimeout(()=>qd(t,a),0),d`
        <div class="mb-6">
            <div class="flex justify-between items-center mb-2">
                <h3 class="text-xl font-bold text-white">
                    🔍 Interactive Segment View
                </h3>
                <button
                    @click=${()=>document.querySelector('[data-tab="explorer"]')?.click()}
                    class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 text-sm"
                >
                    &larr; Back to Segment Explorer
                </button>
            </div>

            <p
                class="text-sm text-gray-400 mb-4 font-mono break-all bg-gray-800 p-2 rounded"
            >
                ${i}
            </p>
        </div>
        ${s}
    `}E();D();H();E();var Kd=(t,i,e,n)=>{let a=`${i.id}-${e.id}`,o=t.dashRepresentationState.get(a);if(!o)return d`<div class="text-red-400 p-2">
            State not found for Representation ${e.id} in Period
            ${i.id}.
        </div>`;let{segments:s,freshSegmentUrls:r}=o,l=10,c=n==="first"?s.slice(0,l):s.slice(-l),f=d` <div
        class="flex items-center p-2 bg-gray-900/50 border-b border-gray-700"
    >
        <div class="flex-grow flex items-center">
            <span class="font-semibold text-gray-200"
                >Representation: ${e.id}</span
            >
            <span class="ml-3 text-xs text-gray-400 font-mono"
                >(${(e.bandwidth/1e3).toFixed(0)} kbps)</span
            >
        </div>
    </div>`,m;return s.length===0?m=d`<div class="p-4 text-center text-gray-400 text-sm">
            No segments found for this representation.
        </div>`:m=d`<div class="overflow-y-auto max-h-[70vh]">
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
                    ${c.map(u=>{let p=r.has(u.resolvedUrl);return st(u,p)})}
                </tbody>
            </table>
        </div>`,d`<div class="bg-gray-800 rounded-lg border border-gray-700 mt-2">
        ${f} ${m}
    </div>`};function Lr(t,i){return!t.manifest||!t.manifest.periods?d`<p class="text-gray-400">
            No periods found in the manifest.
        </p>`:d`
        <div class="space-y-6">
            ${t.manifest.periods.map((e,n)=>d`
                    <div>
                        <h3
                            class="text-lg font-bold text-gray-300 border-b-2 border-gray-700 pb-1"
                        >
                            Period ${n+1}
                            <span class="text-sm font-mono text-gray-500"
                                >(ID: ${e.id||"N/A"}, Start:
                                ${e.start}s)</span
                            >
                        </h3>
                        <div class="space-y-4 mt-2">
                            ${e.adaptationSets.filter(a=>a.representations.length>0).map(a=>d`
                                        <div class="pl-4">
                                            <h4
                                                class="text-md font-semibold text-gray-400"
                                            >
                                                AdaptationSet
                                                (${a.contentType||"N/A"})
                                            </h4>
                                            ${a.representations.map(o=>Kd(t,e,o,i))}
                                        </div>
                                    `)}
                        </div>
                    </div>
                `)}
        </div>
    `}var Yd=null,Jd=null,tt="first";function Qd(){let{segmentsForCompare:t}=_.getState();t.length===2&&x.dispatch("ui:request-segment-comparison",{urlA:t[0],urlB:t[1]})}function Br(t){tt!==t&&(tt=t,te())}function Zd(){let{segmentsForCompare:t}=_.getState(),i=document.getElementById("segment-compare-btn");i&&(i.textContent=`Compare Selected (${t.length}/2)`,i.toggleAttribute("disabled",t.length!==2))}function ec(t){let i=t.manifest?.type==="dynamic",e=d`
        <div
            id="segment-explorer-controls"
            class="flex items-center flex-wrap gap-4"
        >
            ${t.protocol==="dash"?d`
                      <button
                          @click=${()=>Br("first")}
                          class="text-sm font-bold py-2 px-3 rounded-md transition-colors ${tt==="first"?"bg-blue-600 text-white":"bg-gray-600 hover:bg-gray-700 text-white"}"
                      >
                          First 10
                      </button>
                      ${i?d`<button
                                @click=${()=>Br("last")}
                                class="text-sm font-bold py-2 px-3 rounded-md transition-colors ${tt==="last"?"bg-blue-600 text-white":"bg-gray-600 hover:bg-gray-700 text-white"}"
                            >
                                Last 10
                            </button>`:""}
                  `:""}
            <button
                id="segment-compare-btn"
                @click=${Qd}
                class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Compare Selected (0/2)
            </button>
        </div>
    `,n;return t.protocol==="dash"?n=Lr(t,tt):n=Tn(t),setTimeout(Zd,0),d`
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
    `}function Fr(t,i){Yd=t,Jd=i.id,De(),i.manifest.type==="dynamic"&&i.protocol==="hls"&&Sn(t,i),F(ec(i),t)}E();var $t=t=>t??"N/A",Pt=t=>t&&t.length>0?t.map(i=>`<div>${i}</div>`).join(""):"N/A";function zr(t){let i=[{label:"Type",tooltip:"static (VOD) vs dynamic (live)",isoRef:"DASH: 5.3.1.2 / HLS: 4.3.3.5",values:t.map(n=>$t(n.manifest?.summary.general.streamType.startsWith("Live")?"dynamic":"static"))},{label:"Profiles / Version",tooltip:"Declared feature sets or HLS version.",isoRef:"DASH: 8.1 / HLS: 4.3.1.2",values:t.map(n=>$t(n.manifest?.summary.dash?.profiles||`Version ${n.manifest?.summary.hls?.version}`))},{label:"Min Buffer / Target Duration",tooltip:"Minimum client buffer time (DASH) or max segment duration (HLS).",isoRef:"DASH: 5.3.1.2 / HLS: 4.3.3.1",values:t.map(n=>{let a=n.manifest?.summary.dash?.minBufferTime??n.manifest?.summary.hls?.targetDuration;return a?`${a}s`:"N/A"})},{label:"Live Window",tooltip:"DVR window for live streams.",isoRef:"DASH: 5.3.1.2",values:t.map(n=>n.manifest?.summary.dash?.timeShiftBufferDepth?`${n.manifest.summary.dash.timeShiftBufferDepth}s`:"N/A")},{label:"Segment Format",tooltip:"The container format used for media segments (e.g., ISOBMFF or MPEG-2 TS).",isoRef:"DASH: 5.3.7 / HLS: 4.3.2.5",values:t.map(n=>$t(n.manifest?.summary.general.segmentFormat))},{label:"# of Periods",tooltip:"Number of content periods (DASH-specific).",isoRef:"DASH: 5.3.2",values:t.map(n=>n.protocol==="dash"?String(n.manifest?.summary.content.totalPeriods||0):"N/A")},{label:"Content Protection",tooltip:"Detected DRM systems.",isoRef:"DASH: 5.8.4.1 / HLS: 4.3.2.4",values:t.map(n=>{let a=n.manifest?.summary.security;return a?.isEncrypted?a.systems.join(", "):"No"})},{label:"# Video Quality Levels",tooltip:"Total number of video tracks or variants.",isoRef:"DASH: 5.3.5 / HLS: 4.3.4.2",values:t.map(n=>String(n.manifest?.summary.content.totalVideoTracks||0))},{label:"Video Bitrate Range",tooltip:"Min and Max bandwidth values for video.",isoRef:"DASH: 5.3.5.2 / HLS: 4.3.4.2",values:t.map(n=>n.manifest?.summary.videoTracks.length>0?n.manifest.summary.videoTracks[0].bitrateRange:"N/A")},{label:"Video Resolutions",tooltip:"List of unique video resolutions.",isoRef:"DASH: 5.3.7.2 / HLS: 4.3.4.2",values:t.map(n=>Pt([...new Set(n.manifest?.summary.videoTracks.flatMap(a=>a.resolutions))]))},{label:"Video Codecs",tooltip:"Unique video codecs found.",isoRef:"DASH: 5.3.7.2 / HLS: 4.3.4.2",values:t.map(n=>Pt([...new Set(n.manifest?.summary.videoTracks.flatMap(a=>a.codecs))]))},{label:"# Audio Tracks",tooltip:"Groups of audio tracks, often by language.",isoRef:"DASH: 5.3.3 / HLS: 4.3.4.1",values:t.map(n=>String(n.manifest?.summary.content.totalAudioTracks||0))},{label:"Audio Languages",tooltip:"Declared languages for audio tracks.",isoRef:"DASH: 5.3.3.2 / HLS: 4.3.4.1",values:t.map(n=>{let a=[...new Set(n.manifest?.summary.audioTracks.map(o=>o.lang).filter(Boolean))];return a.length>0?a.join(", "):"Not Specified"})},{label:"Audio Codecs",tooltip:"Unique audio codecs.",isoRef:"DASH: 5.3.7.2 / HLS: 4.3.4.2",values:t.map(n=>Pt([...new Set(n.manifest?.summary.audioTracks.flatMap(a=>a.codecs))]))},{label:"# of Text Tracks",tooltip:"Number of subtitle or caption tracks.",isoRef:"DASH: 5.3.3 / HLS: 4.3.4.1",values:t.map(n=>String(n.manifest?.summary.content.totalTextTracks||0))},{label:"Text Languages",tooltip:"Declared languages for subtitle/caption tracks.",isoRef:"DASH: 5.3.3.2 / HLS: 4.3.4.1",values:t.map(n=>{let a=[...new Set(n.manifest?.summary.textTracks.map(o=>o.lang).filter(Boolean))];return a.length>0?a.join(", "):"Not Specified"})},{label:"Text Formats",tooltip:"MIME types or codecs for text tracks.",isoRef:"DASH: 5.3.7.2",values:t.map(n=>Pt([...new Set(n.manifest?.summary.textTracks.flatMap(a=>a.codecsOrMimeTypes))]))},{label:"Video Range",tooltip:"Dynamic range of the video content (SDR, PQ, HLG).",isoRef:"HLS 2nd Ed: 4.4.6.2",values:t.map(n=>$t([...new Set(n.manifest?.summary.videoTracks.map(a=>a.videoRange).filter(Boolean))].join(", ")))}];return(n=>[{title:"Manifest Properties",points:n.slice(0,5)},{title:"Content Overview",points:n.slice(5,7)},{title:"Video Details",points:n.slice(7,11)},{title:"Audio Details",points:n.slice(11,14)},{title:"Accessibility & Metadata",points:n.slice(14,18)}])(i)}E();pe();var Hr=(t,i)=>{let{label:e,tooltip:n,isoRef:a,values:o}=t,s=`grid-template-columns: 200px repeat(${i}, 1fr);`;return d`
        <div
            class="grid border-t border-l border-gray-700"
            style="${s}"
        >
            <div
                class="font-medium text-gray-400 p-2 border-r border-gray-700 ${k}"
                data-tooltip="${n}"
                data-iso="${a}"
            >
                ${e}
            </div>
            ${o.map(r=>d`
                    <div
                        class="p-2 font-mono text-xs border-r border-gray-700 break-words"
                    >
                        ${M(r??"")}
                    </div>
                `)}
        </div>
    `};var tc=(t,i,e)=>d`
    <h3 class="text-xl font-bold mt-6 mb-2">${t}</h3>
    <div class="border-b border-gray-700">
        ${i.map(n=>Hr(n,e.length))}
    </div>
`;function Vr(t){if(t.length<2)return d``;let i=zr(t);return d`
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
            ${t.map(e=>d`<div
                        class="font-semibold text-gray-300 p-2 border-b border-r border-gray-700 truncate"
                        title="${e.name}"
                    >
                        ${e.name}
                    </div>`)}
        </div>

        <!-- Data Sections -->
        ${i.map(e=>tc(e.title,e.points,t))}
    `}dt();var R;function Nr(t){R=t}function ic(){let{streams:t,activeStreamId:i}=_.getState();if(t.length>1){R.contextSwitcherWrapper.classList.remove("hidden");let e=t.map(n=>d`<option value="${n.id}">
                    ${n.name} (${n.protocol.toUpperCase()})
                </option>`);F(e,R.contextSwitcher),R.contextSwitcher.value=String(i)}else R.contextSwitcherWrapper.classList.add("hidden")}function te(){if(!R)return;let t=_.getState(),{streams:i,activeStreamId:e,viewState:n,activeTab:a}=t,o=i.find(f=>f.id===e),s=n==="results"&&i.length>0;R.inputSection.classList.toggle("hidden",s),R.results.classList.toggle("hidden",!s),R.newAnalysisBtn.classList.toggle("hidden",!s),R.shareAnalysisBtn.classList.toggle("hidden",!s),R.copyDebugBtn.classList.toggle("hidden",!s),R.analyzeBtn.textContent=t.streamInputIds.length>1?"Analyze & Compare":"Analyze";let r=document.getElementById("global-stream-controls");if(r&&(r.classList.toggle("hidden",!s),F(os(o),r)),R.mainHeader.classList.toggle("justify-center",!s),R.mainHeader.classList.toggle("justify-between",s),R.headerTitleGroup.classList.toggle("text-center",!s),R.headerTitleGroup.classList.toggle("text-left",s),R.headerUrlDisplay.classList.toggle("hidden",!s),s){let f=i.map(m=>`<div class="truncate" title="${m.originalUrl}">${m.originalUrl}</div>`).join("");R.headerUrlDisplay.innerHTML=`<span class="font-bold text-gray-300 block mb-1">Analyzed Stream(s):</span>${f}`}else R.headerUrlDisplay.innerHTML="";let l=document.getElementById("tab-btn-comparison"),c=document.getElementById("tab-comparison");i.length<=1?(l?.classList.add("hidden"),c?.classList.add("hidden"),a==="comparison"&&I.setActiveTab("summary")):l?.classList.remove("hidden"),s?(ic(),F(d``,R.streamInputs),Object.entries(R.tabContents).forEach(([f,m])=>{if(!m)return;if(X("mainRenderer",`Processing tab: ${f}. Active tab: ${a}.`),f!==a){F(d``,m),m.classList.add("hidden");return}m.classList.remove("hidden"),X("mainRenderer",`Rendering active tab: ${f}. Stream available: ${!!o}`);let u=d``;if(f==="comparison"&&i.length>1)u=Vr(i);else if(o)switch(f){case"summary":u=Os(o);break;case"compliance":u=Ks(o);break;case"features":u=tr(o);break;case"interactive-manifest":u=lr(o);break;case"interactive-segment":u=Rr(R);break;case"updates":u=Kt(o);break}F(u,m),f==="timeline-visuals"&&o&&er(m,o),f==="explorer"&&o&&Fr(m,o)})):(F(bn(),R.streamInputs),Object.values(R.tabContents).forEach(f=>{f&&(F(d``,f),f.classList.add("hidden"))})),fe()}H();D();var Bi=new Worker("/dist/worker.js",{type:"module"}),Li=0;Bi.onmessage=t=>{let{type:i,payload:e}=t.data;switch(i){case"analysis-complete":{let n=e.streams;n.forEach(o=>{o.hlsVariantState=new Map(o.hlsVariantState||[]),o.dashRepresentationState=new Map(o.dashRepresentationState||[]),o.featureAnalysis&&(o.featureAnalysis.results=new Map(o.featureAnalysis.results||[])),o.semanticData=new Map(o.semanticData||[]),o.mediaPlaylists=new Map(o.mediaPlaylists||[])}),I.completeAnalysis(n);let a=performance.now();console.log(`[DEBUG] Total Analysis Pipeline (success): ${(a-Li).toFixed(2)}ms`);break}case"analysis-error":{x.dispatch("analysis:error",{message:e.message,error:e.error});break}case"analysis-failed":{x.dispatch("analysis:failed");let n=performance.now();console.log(`[DEBUG] Total Analysis Pipeline (failed): ${(n-Li).toFixed(2)}ms`);break}case"status-update":{x.dispatch("ui:show-status",{message:e.message,type:"info",duration:2e3});break}case"hls-media-playlist-fetched":{let{streamId:n,variantUri:a,segments:o,freshSegmentUrls:s}=e,r=_.getState().streams.find(l=>l.id===n);if(r){let l=new Map(r.hlsVariantState),c=l.get(a);c&&(l.set(a,{...c,segments:o,freshSegmentUrls:new Set(s),isLoading:!1,error:null}),I.updateStream(n,{hlsVariantState:l}))}break}case"hls-media-playlist-error":{let{streamId:n,variantUri:a,error:o}=e,s=_.getState().streams.find(r=>r.id===n);if(s){let r=new Map(s.hlsVariantState),l=r.get(a);l&&(r.set(a,{...l,isLoading:!1,error:o}),I.updateStream(n,{hlsVariantState:r}))}break}}};async function nc(t){Li=performance.now(),console.log("[DEBUG] Starting analysis pipeline..."),x.dispatch("analysis:started");let i=[];for(let e of t)try{self.postMessage({type:"status-update",payload:{message:`Fetching ${e.url||e.file.name}...`}});let n="";if(e.url){let a=await fetch(e.url);if(!a.ok){x.dispatch("analysis:error",{message:`HTTP Error ${a.status} for ${e.url}`});continue}n=await a.text()}else n=await e.file.text();i.push({...e,manifestString:n})}catch(n){x.dispatch("analysis:error",{message:`Failed to fetch or read input: ${n.message}`})}i.length>0?(console.log(`[DEBUG] Pre-processing complete. Dispatching ${i.length} stream(s) to worker.`),Bi.postMessage({type:"start-analysis",payload:{inputs:i}})):x.dispatch("analysis:failed")}function ac({streamId:t,variantUri:i}){let e=_.getState().streams.find(n=>n.id===t);e&&Bi.postMessage({type:"fetch-hls-media-playlist",payload:{streamId:t,variantUri:i,hlsDefinedVariables:e.hlsDefinedVariables}})}x.subscribe("analysis:request",({inputs:t})=>nc(t));x.subscribe("hls:media-playlist-fetch-request",({streamId:t,variantUri:i})=>ac({streamId:t,variantUri:i}));function oc(t){t.addStreamBtn.addEventListener("click",()=>{_n()}),t.analyzeBtn.addEventListener("click",()=>sc(t)),t.newAnalysisBtn.addEventListener("click",()=>{Ln(),I.startAnalysis()}),t.clearAllBtn.addEventListener("click",()=>{I.resetStreamInputIds()}),t.contextSwitcher.addEventListener("change",async i=>{let e=i.target;I.setActiveStreamId(parseInt(e.value,10))}),t.shareAnalysisBtn.addEventListener("click",Vs),t.copyDebugBtn.addEventListener("click",Hs)}function sc(t){let i=t.streamInputs.querySelectorAll(".stream-input-group"),e=Array.from(i).map(n=>{let a=parseInt(n.dataset.id),o=n.querySelector(".input-url"),s=n.querySelector(".input-file");return{id:a,url:o.value,file:s.files.length>0?s.files[0]:null}}).filter(n=>n.url||n.file);if(e.length>0){let n=e.filter(a=>a.url).map(a=>({url:a.url}));cn(n),x.dispatch("analysis:request",{inputs:e})}else x.dispatch("ui:show-status",{message:"Please provide a stream URL or file to analyze.",type:"warn"})}function rc(){x.subscribe("state:analysis-complete",({streams:t})=>{if(t.length>0){fn(t[0]);let i=t.length>1?"comparison":"summary";I.setActiveTab(i)}}),x.subscribe("analysis:error",({message:t,error:i})=>{x.dispatch("ui:show-status",{message:t,type:"fail",duration:8e3}),console.error("An analysis error occurred:",i)})}function lc(t){let i=dn();i&&i.length>0&&(I.setStreamInputsFromData(i),Promise.resolve().then(()=>{t.streamInputs.querySelectorAll(".stream-input-group").forEach((n,a)=>{let o=n.querySelector(".input-url");i[a]&&o&&(o.value=i[a].url||"")})}))}async function dc(){let t={mainHeader:document.getElementById("main-header"),headerTitleGroup:document.getElementById("header-title-group"),headerUrlDisplay:document.getElementById("header-url-display"),streamInputs:document.getElementById("stream-inputs"),addStreamBtn:document.getElementById("add-stream-btn"),analyzeBtn:document.getElementById("analyze-btn"),clearAllBtn:document.getElementById("clear-all-btn"),toastContainer:document.getElementById("toast-container"),results:document.getElementById("results"),inputSection:document.getElementById("input-section"),newAnalysisBtn:document.getElementById("new-analysis-btn"),shareAnalysisBtn:document.getElementById("share-analysis-btn"),copyDebugBtn:document.getElementById("copy-debug-btn"),tabs:document.getElementById("tabs"),contextSwitcherWrapper:document.getElementById("context-switcher-wrapper"),contextSwitcher:document.getElementById("context-switcher"),tabContents:{comparison:document.getElementById("tab-comparison"),summary:document.getElementById("tab-summary"),"timeline-visuals":document.getElementById("tab-timeline-visuals"),features:document.getElementById("tab-features"),compliance:document.getElementById("tab-compliance"),explorer:document.getElementById("tab-explorer"),"interactive-segment":document.getElementById("tab-interactive-segment"),"interactive-manifest":document.getElementById("tab-interactive-manifest"),updates:document.getElementById("tab-updates")},segmentModal:document.getElementById("segment-modal"),modalTitle:document.getElementById("modal-title"),modalSegmentUrl:document.getElementById("modal-segment-url"),modalContentArea:document.getElementById("modal-content-area"),closeModalBtn:document.getElementById("close-modal-btn"),globalTooltip:document.getElementById("global-tooltip"),globalLoader:document.getElementById("global-loader"),loaderMessage:document.getElementById("loader-message")};rc(),Nr(t),an(t),Cn(t),rs(),Ps(),hn(t),Pn(t),Un(t),ss(t),qt(t),Hi(t),Rn(),Ms(),zs(),oc(t),_.subscribe(te),te();let e=new URLSearchParams(window.location.search).getAll("url");if(e.length>0&&e[0]){let n=e.map((a,o)=>({id:o,url:a,file:null}));x.dispatch("analysis:request",{inputs:n})}else lc(t)}document.addEventListener("DOMContentLoaded",dc);})();
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
