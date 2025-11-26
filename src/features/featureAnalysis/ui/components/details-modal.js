import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import * as icons from '@/ui/icons';

export const featureDetailsModalTemplate = (feature, onClose) => {
    if (!feature) return '';

    // Simple HTML formatting for the details string which might contain raw text
    const formattedDetails = feature.details.replace(/\n/g, '<br/>');

    return html`
        <div
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        >
            <div
                class="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] animate-scaleIn"
            >
                <!-- Header -->
                <div
                    class="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-800/50"
                >
                    <div class="flex gap-4">
                        <div
                            class="p-3 bg-blue-500/10 rounded-xl text-blue-400"
                        >
                            ${icons.searchCode}
                        </div>
                        <div>
                            <h3 class="text-xl font-bold text-white">
                                ${feature.name}
                            </h3>
                            <div class="flex items-center gap-2 mt-1">
                                <span
                                    class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300 border border-slate-600 uppercase tracking-wider"
                                >
                                    ${feature.category}
                                </span>
                                <span class="text-xs font-mono text-slate-500"
                                    >${feature.isoRef}</span
                                >
                            </div>
                        </div>
                    </div>
                    <button
                        @click=${onClose}
                        class="text-slate-400 hover:text-white transition-colors"
                    >
                        ${icons.xCircle}
                    </button>
                </div>

                <!-- Content -->
                <div class="p-6 overflow-y-auto space-y-6">
                    <div>
                        <h4
                            class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
                        >
                            Description
                        </h4>
                        <p class="text-sm text-slate-300 leading-relaxed">
                            ${feature.desc}
                        </p>
                    </div>

                    <div
                        class="bg-slate-950 rounded-lg border border-slate-800 p-4"
                    >
                        <h4
                            class="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2"
                        >
                            ${icons.checkCircle} Detection Evidence
                        </h4>
                        <div
                            class="font-mono text-xs text-slate-300 break-words leading-relaxed"
                        >
                            ${unsafeHTML(formattedDetails)}
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div
                    class="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-end"
                >
                    <button
                        @click=${onClose}
                        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
};
