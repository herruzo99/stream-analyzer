import { html } from 'lit-html';

/**
 * Renders a single value in the JSON tree with syntax highlighting.
 */
const renderValue = (value) => {
    const type = typeof value;
    if (value === null) return html`<span class="text-rose-400">null</span>`;
    if (type === 'boolean')
        return html`<span class="text-purple-400"
            >${value ? 'true' : 'false'}</span
        >`;
    if (type === 'number')
        return html`<span class="text-amber-400">${value}</span>`;
    if (type === 'string') {
        // Detect URLs
        if (value.startsWith('http')) {
            return html`<span class="text-emerald-300">"${value}"</span>
                <a
                    href="${value}"
                    target="_blank"
                    class="ml-2 text-blue-400 hover:text-white text-[10px] no-underline"
                    >↗</a
                >`;
        }
        return html`<span class="text-emerald-300">"${value}"</span>`;
    }
    return html`<span class="text-slate-400">${String(value)}</span>`;
};

/**
 * Recursive function to render a JSON object/array as a collapsible tree.
 * @param {string | null} key - The key name (null if array item).
 * @param {any} value - The value to render.
 * @param {number} depth - Indentation level.
 * @param {boolean} isLast - Whether this is the last item in the parent.
 */
const renderNode = (key, value, depth, isLast) => {
    const isObject =
        value !== null && typeof value === 'object' && !Array.isArray(value);
    const isArray = Array.isArray(value);
    const indent = depth * 12;

    if (!isObject && !isArray) {
        return html`
            <div
                class="flex items-baseline font-mono text-xs hover:bg-white/[0.02] py-0.5 rounded pl-1"
                style="margin-left: ${indent}px"
            >
                ${key
                    ? html`<span class="text-blue-300 mr-1">"${key}":</span>`
                    : ''}
                ${renderValue(value)}${!isLast
                    ? html`<span class="text-slate-500">,</span>`
                    : ''}
            </div>
        `;
    }

    const isEmpty =
        (isArray && value.length === 0) ||
        (isObject && Object.keys(value).length === 0);
    const openChar = isArray ? '[' : '{';
    const closeChar = isArray ? ']' : '}';
    const itemCount = isArray ? value.length : Object.keys(value).length;

    if (isEmpty) {
        return html`
            <div
                class="font-mono text-xs text-slate-500 pl-1"
                style="margin-left: ${indent}px"
            >
                ${key ? html`<span class="text-blue-300">"${key}":</span>` : ''}
                ${openChar}${closeChar}${!isLast ? ',' : ''}
            </div>
        `;
    }

    return html`
        <details open class="group">
            <summary
                class="font-mono text-xs cursor-pointer hover:bg-white/[0.04] py-0.5 rounded select-none list-none flex items-center"
                style="margin-left: ${indent}px"
            >
                <span
                    class="inline-block w-3 h-3 mr-1 text-slate-500 transition-transform group-open:rotate-90"
                    >▶</span
                >
                ${key
                    ? html`<span class="text-blue-300 mr-1">"${key}":</span>`
                    : ''}
                <span class="text-slate-400">${openChar}</span>
                <span
                    class="ml-2 text-[10px] text-slate-600 bg-slate-800 px-1 rounded hidden group-open:none group-[&:not([open])]:inline-block"
                    >${itemCount} items...</span
                >
                <span
                    class="text-slate-400 hidden group-[&:not([open])]:inline-block"
                    >${closeChar}${!isLast ? ',' : ''}</span
                >
            </summary>
            <div class="flex flex-col">
                ${isArray
                    ? value.map((item, i) =>
                          renderNode(null, item, depth + 1, i === itemCount - 1)
                      )
                    : Object.entries(value).map(([k, v], i) =>
                          renderNode(k, v, depth + 1, i === itemCount - 1)
                      )}
            </div>
            <div
                class="font-mono text-xs text-slate-400"
                style="margin-left: ${indent + 16}px"
            >
                ${closeChar}${!isLast ? ',' : ''}
            </div>
        </details>
    `;
};

export const jsonViewerTemplate = (json) => {
    return html`
        <div class="p-4 bg-slate-950 rounded-lg overflow-auto custom-scrollbar">
            ${renderNode(null, json, 0, true)}
        </div>
    `;
};
