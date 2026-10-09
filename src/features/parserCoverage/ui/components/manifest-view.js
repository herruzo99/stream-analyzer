/**
 * Parser-coverage helpers: node counting + manifest source panel.
 *
 * Reconstructed for the port (imported but never committed).
 * `countManifestNodes` counts element nodes in a serialized manifest
 * (attributes/text skipped, matching the analyzer walk).
 * `manifestViewTemplate` shows the raw manifest with a findings count.
 */
import { html } from 'lit-html';

export const countManifestNodes = (node) => {
    if (!node || typeof node !== 'object') return 0;
    let count = 1;
    for (const key of Object.keys(node)) {
        if (key === ':@' || key === '#text') continue;
        const children = Array.isArray(node[key]) ? node[key] : [node[key]];
        for (const child of children) {
            count += countManifestNodes(child);
        }
    }
    return count;
};

export const manifestViewTemplate = (stream, report = []) => {
    const raw = stream?.rawManifest || '';
    return html`
        <div class="flex flex-col h-full min-h-0 gap-2">
            <div
                class="shrink-0 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400"
            >
                <span>Manifest source</span>
                <span
                    class="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300"
                    >${report.length} finding${report.length === 1
                        ? ''
                        : 's'}</span
                >
            </div>
            <pre
                class="grow min-h-0 overflow-auto custom-scrollbar font-mono text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap break-all m-0"
            >
${raw}</pre
            >
        </div>
    `;
};
