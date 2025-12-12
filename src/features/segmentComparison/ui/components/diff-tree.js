import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const formatFieldValue = (val) => {
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'object') {
        // If it's a small object (like flags), format nicely
        if (Object.keys(val).length < 4) {
            return Object.entries(val)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ');
        }
        return '{ ... }'; // Too big to inline
    }
    // Truncate long strings/hex dumps
    const str = String(val);
    return str.length > 50 ? str.substring(0, 47) + '...' : str;
};

// Recursive object flattener for deep comparison
const flattenObject = (obj, prefix = '') => {
    return Object.keys(obj).reduce((acc, k) => {
        const pre = prefix.length ? prefix + '.' : '';
        // Skip internal fields
        if (
            k.endsWith('_raw') ||
            k === 'header' ||
            k === 'offset' ||
            k === 'length'
        )
            return acc;

        if (
            typeof obj[k] === 'object' &&
            obj[k] !== null &&
            !Array.isArray(obj[k])
        ) {
            // Special case: value/offset/length wrapper from parser
            if ('value' in obj[k] && 'offset' in obj[k]) {
                acc[pre + k] = obj[k].value;
            } else {
                Object.assign(acc, flattenObject(obj[k], pre + k));
            }
        } else {
            acc[pre + k] = obj[k];
        }
        return acc;
    }, {});
};

/**
 * Renders the inline field comparison table for a modified box.
 * Now handles deep object comparison (e.g. flags).
 */
const renderFieldDiffs = (boxA, boxB) => {
    if (!boxA || !boxB) return null;

    // Handle non-object values (e.g. strings)
    if (typeof boxA !== 'object' || typeof boxB !== 'object') {
        if (boxA !== boxB) {
            return html`
                <div
                    class="bg-black/20 border-t border-slate-800/50 p-2 text-xs font-mono"
                >
                    <div class="grid grid-cols-2 gap-4">
                        <div class="text-red-200 bg-red-900/10 px-2 rounded">
                            ${String(boxA)}
                        </div>
                        <div
                            class="text-emerald-200 bg-emerald-900/10 px-2 rounded"
                        >
                            ${String(boxB)}
                        </div>
                    </div>
                </div>
            `;
        }
        return null;
    }

    // Flatten both objects to compare deeply
    const flatA = flattenObject(boxA.details || boxA);
    const flatB = flattenObject(boxB.details || boxB);

    const allKeys = new Set([...Object.keys(flatA), ...Object.keys(flatB)]);
    const differences = [];

    allKeys.forEach((key) => {
        const valA = flatA[key];
        const valB = flatB[key];

        if (valA === undefined && valB === undefined) return;

        // Strict equality check
        if (String(valA) !== String(valB)) {
            differences.push({ key, valA, valB });
        }
    });

    if (differences.length === 0)
        return html`
            <div
                class="px-4 py-2 text-xs italic text-slate-500 text-center border-t border-slate-800/50"
            >
                Structure modified but no field values changed.
            </div>
        `;

    return html`
        <div class="bg-black/20 border-t border-slate-800/50">
            <table class="w-full text-xs font-mono">
                <thead
                    class="text-slate-500 bg-slate-900/50 border-b border-slate-800/50"
                >
                    <tr>
                        <th class="px-4 py-1 text-left w-1/3">Field</th>
                        <th class="px-4 py-1 text-left w-1/3 text-red-300/70">
                            Reference
                        </th>
                        <th
                            class="px-4 py-1 text-left w-1/3 text-emerald-300/70"
                        >
                            Candidate
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/30">
                    ${differences.map(
                        (diff) => html`
                            <tr class="hover:bg-white/[0.02] transition-colors">
                                <td
                                    class="px-4 py-1.5 text-slate-400 font-semibold break-all opacity-80"
                                >
                                    ${diff.key}
                                </td>
                                <td
                                    class="px-4 py-1.5 text-red-200 break-all bg-red-900/5"
                                >
                                    ${formatFieldValue(diff.valA)}
                                </td>
                                <td
                                    class="px-4 py-1.5 text-emerald-200 break-all bg-emerald-900/5"
                                >
                                    ${formatFieldValue(diff.valB)}
                                </td>
                            </tr>
                        `
                    )}
                </tbody>
            </table>
        </div>
    `;
};

/**
 * Counts deep changes in a node tree to show bubbles on collapsed nodes.
 */
const countChanges = (node) => {
    if (node.status !== 'same') return 1;
    if (!node.children) return 0;
    return node.children.reduce((sum, child) => sum + countChanges(child), 0);
};

const renderDiffNode = (node, depth = 0) => {
    const { expandedComparisonFlags } = useUiStore.getState();

    // Unique ID: Path-like ID based on depth and types/offsets to ensure stability
    const offsetA = node.values[0]?.offset ?? 'x';
    const offsetB = node.values[1]?.offset ?? 'y';
    const nodeId = `${depth}-${node.type}-${offsetA}-${offsetB}`;

    const status = node.status;
    const isModified =
        status === 'modified' || status === 'added' || status === 'removed';

    // Auto-expand: Root, or if this node is modified, or if direct children are modified
    const hasModifiedChildren =
        node.children && node.children.some((c) => c.status !== 'same');
    const shouldAutoExpand = depth < 1 || isModified || hasModifiedChildren;

    const isExpanded =
        expandedComparisonFlags.has(nodeId) ||
        (shouldAutoExpand && !expandedComparisonFlags.has(`closed-${nodeId}`));

    const toggleExpand = (e) => {
        e.stopPropagation();
        uiActions.toggleComparisonFlags(nodeId);
    };

    const valA = node.values[0];
    const valB = node.values[1];
    const hasChildren = node.children && node.children.length > 0;

    // Expandable if it has children OR if it is a modified leaf node (to show field diffs)
    const isExpandable = hasChildren || (status === 'modified' && valA && valB);

    // Calculate change count for collapsed state
    const changesInside = !isExpanded && hasChildren ? countChanges(node) : 0;

    // Colors & Icons
    const styles = {
        same: 'text-slate-500 border-slate-800/50 hover:bg-slate-800/30 hover:text-slate-300',
        modified:
            'text-amber-200 border-amber-900/30 bg-amber-900/10 hover:bg-amber-900/20',
        added: 'text-emerald-200 border-emerald-900/30 bg-emerald-900/10 hover:bg-emerald-900/20',
        removed:
            'text-red-200 border-red-900/30 bg-red-900/10 hover:bg-red-900/20',
    };

    const rowClass = styles[status];
    const indent = depth * 24;

    const renderBoxMeta = (box) => {
        if (box === null || box === undefined)
            return html`<span class="text-slate-600 italic text-xs select-none"
                >Missing</span
            >`;

        // Handle non-object primitives (strings from TS comparator)
        if (typeof box !== 'object') {
            return html`<span
                class="text-slate-400 text-xs font-mono bg-black/20 px-2 py-0.5 rounded"
                >${String(box)}</span
            >`;
        }

        // Handle Box-like objects
        const sizeStr =
            typeof box.size === 'number'
                ? `${box.size.toLocaleString()} B`
                : '';
        const trackId = box.details?.track_ID?.value || box.trackId; // Support both structures

        return html`
            <div class="flex items-center gap-3 min-w-0">
                ${sizeStr
                    ? html`<span
                          class="font-mono text-[10px] opacity-60 shrink-0 bg-black/20 px-1.5 rounded"
                          >${sizeStr}</span
                      >`
                    : ''}
                ${trackId
                    ? html`<span
                          class="text-[10px] font-bold bg-blue-900/30 text-blue-300 px-1.5 rounded border border-blue-500/20"
                          >ID:${trackId}</span
                      >`
                    : ''}
            </div>
        `;
    };

    return html`
        <div class="group border-b border-slate-800/30 last:border-0">
            <div
                class="grid grid-cols-[1fr_40px_1fr] items-stretch ${rowClass} transition-colors cursor-pointer select-none"
                @click=${isExpandable ? toggleExpand : null}
            >
                <!-- Left (A) -->
                <div
                    class="p-2 pl-4 flex items-center gap-2 relative overflow-hidden"
                >
                    <div
                        style="width: ${indent}px"
                        class="shrink-0 border-r border-slate-700/30 h-full absolute left-0 top-0"
                    ></div>

                    <div
                        style="padding-left: ${indent}px"
                        class="flex items-center gap-2 grow min-w-0"
                    >
                        <div
                            class="w-4 shrink-0 flex items-center justify-center"
                        >
                            ${isExpandable
                                ? html`
                                      <span
                                          class="text-slate-500 scale-75 transition-transform duration-200 ${isExpanded
                                              ? 'rotate-90'
                                              : ''}"
                                      >
                                          ${icons.chevronRight}
                                      </span>
                                  `
                                : ''}
                        </div>

                        ${valA !== null
                            ? html`
                                  <div
                                      class="min-w-0 truncate flex items-center gap-2"
                                  >
                                      <span
                                          class="font-bold text-sm ${status ===
                                          'modified'
                                              ? 'text-amber-100'
                                              : ''}"
                                          >${node.type}</span
                                      >
                                      ${changesInside > 0
                                          ? html`
                                                <span
                                                    class="text-[9px] font-bold bg-amber-500 text-black px-1.5 rounded-full"
                                                    >${changesInside}</span
                                                >
                                            `
                                          : ''}
                                  </div>
                                  <div class="ml-auto">
                                      ${renderBoxMeta(valA)}
                                  </div>
                              `
                            : html`<span class="text-slate-600 italic text-xs"
                                  >Missing</span
                              >`}
                    </div>
                </div>

                <!-- Center Icon -->
                <div
                    class="flex items-center justify-center border-x border-white/5 bg-black/10"
                >
                    ${status === 'modified'
                        ? html`<span class="text-amber-500 scale-75"
                              >${icons.alertTriangle}</span
                          >`
                        : ''}
                    ${status === 'added'
                        ? html`<span class="text-emerald-500 scale-75"
                              >${icons.plusCircle}</span
                          >`
                        : ''}
                    ${status === 'removed'
                        ? html`<span class="text-red-500 scale-75"
                              >${icons.minusCircle}</span
                          >`
                        : ''}
                </div>

                <!-- Right (B) -->
                <div
                    class="p-2 pl-4 flex items-center gap-2 relative overflow-hidden"
                >
                    <div
                        style="width: ${indent}px"
                        class="shrink-0 border-r border-slate-700/30 h-full absolute left-0 top-0 opacity-50"
                    ></div>
                    <div
                        style="padding-left: ${indent}px"
                        class="flex items-center gap-2 grow min-w-0"
                    >
                        ${valB !== null
                            ? html`
                                  <div class="min-w-0 truncate">
                                      <span class="font-bold text-sm mr-2"
                                          >${node.type}</span
                                      >
                                  </div>
                                  <div class="ml-auto">
                                      ${renderBoxMeta(valB)}
                                  </div>
                              `
                            : html`<span class="text-slate-600 italic text-xs"
                                  >Missing</span
                              >`}
                    </div>
                </div>
            </div>

            <!-- Expanded Content -->
            ${isExpanded
                ? html`
                      <div class="animate-fadeIn">
                          <!-- If Modified & Leaf (or forced expansion): Show Field Diffs -->
                          ${status === 'modified'
                              ? renderFieldDiffs(valA, valB)
                              : ''}

                          <!-- Children -->
                          ${hasChildren
                              ? node.children.map((c) =>
                                    renderDiffNode(c, depth + 1)
                                )
                              : ''}
                      </div>
                  `
                : ''}
        </div>
    `;
};

export const diffTreeTemplate = (diffTree) => {
    if (!diffTree || diffTree.length === 0)
        return html`
            <div
                class="h-full flex flex-col items-center justify-center text-slate-500 p-12 border border-slate-800 rounded-xl bg-slate-900/30"
            >
                <div class="p-4 bg-slate-800 rounded-full mb-3 opacity-50">
                    ${icons.checkCircle}
                </div>
                <p class="font-medium">No structural differences found.</p>
                <p class="text-xs mt-1">
                    Hierarchy and essential fields are identical.
                </p>
            </div>
        `;

    return html`
        <div
            class="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg"
        >
            <div
                class="grid grid-cols-[1fr_40px_1fr] bg-slate-900 border-b border-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-500 py-2.5 select-none"
            >
                <div class="px-4 flex items-center gap-2">
                    Reference Structure
                    <span class="text-slate-600 text-[9px] font-normal"
                        >(Hierarchy)</span
                    >
                </div>
                <div class="text-center opacity-50">Vs</div>
                <div class="px-4">Candidate Structure</div>
            </div>
            <div class="grow overflow-y-auto custom-scrollbar bg-slate-900">
                ${diffTree.map((node) => renderDiffNode(node, 0))}
            </div>
        </div>
    `;
};
