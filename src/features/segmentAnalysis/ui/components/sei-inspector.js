import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';

const renderHdrInfo = (msg) => {
    const data = msg.data;
    if (!data) return html``;

    if (msg.payloadType === 137 && data.primaries) {
        // Mastering Display
        return html`
            <div class="grid grid-cols-3 gap-2 text-xs font-mono mt-2">
                <div class="bg-slate-800/50 p-2 rounded">
                    <span class="text-red-400 block mb-1">Red</span
                    >${data.primaries[2].x.toFixed(4)},
                    ${data.primaries[2].y.toFixed(4)}
                </div>
                <div class="bg-slate-800/50 p-2 rounded">
                    <span class="text-green-400 block mb-1">Green</span
                    >${data.primaries[0].x.toFixed(4)},
                    ${data.primaries[0].y.toFixed(4)}
                </div>
                <div class="bg-slate-800/50 p-2 rounded">
                    <span class="text-blue-400 block mb-1">Blue</span
                    >${data.primaries[1].x.toFixed(4)},
                    ${data.primaries[1].y.toFixed(4)}
                </div>
            </div>
            <div class="flex gap-4 mt-2 text-xs">
                <span><strong>Min:</strong> ${data.minLuminance}</span
                ><span><strong>Max:</strong> ${data.maxLuminance}</span>
            </div>
        `;
    }

    if (msg.payloadType === 144 && data.maxCLL !== undefined) {
        // Content Light Level
        return html`
            <div
                class="flex gap-4 mt-2 text-sm font-mono bg-slate-800/50 p-2 rounded"
            >
                <span class="text-yellow-300">MaxCLL: ${data.maxCLL}</span>
                <span class="text-orange-300">MaxFALL: ${data.maxFALL}</span>
            </div>
        `;
    }
    return html``;
};

const renderTimingInfo = (msg) => {
    if (!msg.data) return html``;
    // Buffering Period or Pic Timing
    return html`
        <div
            class="bg-slate-900/50 p-2 rounded mt-2 border border-slate-700/50 grid grid-cols-2 gap-2 text-xs font-mono"
        >
            ${Object.entries(msg.data).map(
                ([k, v]) => html`
                    <div>
                        <span class="text-slate-500">${k}:</span>
                        <span class="text-blue-300">${v}</span>
                    </div>
                `
            )}
        </div>
    `;
};

const renderCeaInfo = (msg) => {
    if (!msg.data || !msg.data.ceaData) return html``;
    const cea = msg.data.ceaData;
    const captions = cea.captions || [];

    return html`
        <div class="bg-black/20 p-2 rounded mt-2 border border-slate-700/50">
            <div class="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>${cea.type}</span>
                <span>Count: ${cea.ccCount}</span>
            </div>
            <div class="space-y-1 font-mono text-xs">
                ${captions.length === 0
                    ? html`<span class="text-slate-600 italic"
                          >No valid data pairs</span
                      >`
                    : ''}
                ${captions.map(
                    (cc) => html`
                        <div class="flex gap-2">
                            <span class="text-slate-500 w-16"
                                >[${cc.raw
                                    .map((b) => b.toString(16).padStart(2, '0'))
                                    .join(' ')}]</span
                            >
                            <span
                                class="${cc.type.includes('608')
                                    ? 'text-emerald-400'
                                    : 'text-blue-400'}"
                                >${cc.data}</span
                            >
                        </div>
                    `
                )}
            </div>
        </div>
    `;
};

const renderUnregisteredInfo = (msg) => {
    if (!msg.data) return html``;
    const { uuid, payloadText, payloadHex, payloadSize } = msg.data;

    return html`
        <div
            class="bg-slate-950/50 p-3 rounded mt-2 border border-slate-700/50"
        >
            <div
                class="flex items-center gap-2 mb-2 border-b border-slate-800 pb-1"
            >
                <span class="text-[10px] font-bold text-slate-500 uppercase"
                    >UUID</span
                >
                <span class="font-mono text-xs text-purple-300 select-all"
                    >${uuid}</span
                >
            </div>

            ${payloadText
                ? html`
                      <div
                          class="text-[10px] font-bold text-slate-500 uppercase mb-1"
                      >
                          ASCII Content
                      </div>
                      <div
                          class="font-mono text-xs text-slate-300 whitespace-pre-wrap break-all bg-black/20 p-2 rounded border border-slate-800"
                      >
                          ${payloadText}
                      </div>
                  `
                : html`
                      <div
                          class="text-[10px] font-bold text-slate-500 uppercase mb-1"
                      >
                          Binary Content (${payloadSize} bytes)
                      </div>
                      <div
                          class="font-mono text-xs text-blue-300 whitespace-pre-wrap break-all bg-black/20 p-2 rounded border border-slate-800"
                      >
                          ${payloadHex}
                      </div>
                  `}
        </div>
    `;
};

// New: Fallback for unparsed raw data
const renderGenericHex = (msg) => {
    if (!msg.raw)
        return html`<div
            class="text-[10px] text-slate-600 font-mono mt-1 italic"
        >
            No payload captured.
        </div>`;

    const hex = Array.from(msg.raw)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

    return html`
        <div class="mt-2">
            <div class="text-[10px] font-bold text-slate-500 uppercase mb-1">
                Raw Payload (${msg.payloadSize} bytes)
            </div>
            <div
                class="font-mono text-xs text-slate-400 bg-black/20 p-2 rounded border border-slate-700/50 break-all whitespace-pre-wrap leading-relaxed"
            >
                ${hex}
            </div>
        </div>
    `;
};

export class SeiInspector extends HTMLElement {
    constructor() {
        super();
        this._data = null;
    }

    set data(messages) {
        this._data = messages;
        this.render();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        if (!this._data || this._data.length === 0) {
            render(
                html`
                    <div
                        class="flex flex-col items-center justify-center h-64 text-slate-500"
                    >
                        <div class="p-4 bg-slate-800/50 rounded-full mb-3">
                            ${icons.fileText}
                        </div>
                        <p>No SEI messages detected.</p>
                    </div>
                `,
                this
            );
            return;
        }

        const grouped = this._data.reduce((acc, msg) => {
            const type = msg.typeName;
            if (!acc[type]) acc[type] = [];
            acc[type].push(msg);
            return acc;
        }, {});

        const template = html`
            <div class="p-4 space-y-6 animate-fadeIn">
                ${Object.entries(grouped).map(
                    ([type, messages]) => html`
                        <section>
                            <h4
                                class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"
                            >
                                <span
                                    class="w-2 h-2 rounded-full bg-blue-500"
                                ></span>
                                ${type}
                                <span class="text-slate-600"
                                    >(${messages.length})</span
                                >
                            </h4>

                            <div class="space-y-2">
                                ${messages.map(
                                    (msg, idx) => html`
                                        <div
                                            class="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 hover:bg-slate-800 transition-colors"
                                        >
                                            <div
                                                class="flex justify-between items-center text-xs mb-1"
                                            >
                                                <span
                                                    class="font-bold text-slate-300"
                                                    >Frame
                                                    #${msg.sampleIndex !==
                                                    undefined
                                                        ? msg.sampleIndex
                                                        : '-'}</span
                                                >
                                                <span
                                                    class="font-mono text-slate-500"
                                                    >Size:
                                                    ${msg.payloadSize}b</span
                                                >
                                            </div>

                                            ${msg.payloadType === 0 ||
                                            msg.payloadType === 1
                                                ? renderTimingInfo(msg)
                                                : ''}
                                            ${renderHdrInfo(msg)}
                                            ${msg.typeName ===
                                            'user_data_registered_itu_t_t35'
                                                ? renderCeaInfo(msg)
                                                : ''}
                                            ${msg.typeName ===
                                            'user_data_unregistered'
                                                ? renderUnregisteredInfo(msg)
                                                : ''}

                                            <!-- Fallback for known types that lack specific parsing logic (like buffering_period) if data is null -->
                                            ${!msg.data ||
                                            (msg.data &&
                                                !msg.data.ceaData &&
                                                !msg.data.primaries &&
                                                !msg.data.maxCLL &&
                                                !msg.data.cpb_removal_delay &&
                                                !msg.data.hrd_params_present &&
                                                msg.typeName !==
                                                    'user_data_unregistered')
                                                ? renderGenericHex(msg)
                                                : ''}
                                        </div>
                                    `
                                )}
                            </div>
                        </section>
                    `
                )}
            </div>
        `;

        render(template, this);
    }
}

customElements.define('sei-inspector', SeiInspector);
export const seiInspectorTemplate = (seiMessages) =>
    html`<sei-inspector .data=${seiMessages}></sei-inspector>`;
