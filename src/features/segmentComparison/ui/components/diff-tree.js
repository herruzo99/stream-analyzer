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
 */
const renderFieldDiffs = (boxA, boxB) => {
    if (!boxA || !boxB) return null;

    // Handle non-object values (e.g. strings)
    if (typeof boxA !== 'object' || typeof boxB !== 'object') {
        if (boxA !== boxB) {
            return html`
                <div
                    class="bg-[var(--bg-glass-B-1)] border-t border-[var(--border-on-A)]/10 p-3 text-xs font-mono"
                >
                    <div class="grid grid-cols-2 gap-6">
                        <div
                            class="text-[var(--color-error)] bg-[var(--color-error)]/5 px-3 py-1 rounded-lg border border-[var(--color-error)]/10"
                        >
                            ${String(boxA)}
                        </div>
                        <div
                            class="text-[var(--color-success)] bg-[var(--color-success)]/5 px-3 py-1 rounded-lg border border-[var(--color-success)]/10"
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
                class="px-4 py-3 text-xs italic text-[var(--text-on-A-secondary)] opacity-50 text-center border-t border-[var(--border-on-A)]/10"
            >
                Structure modified but no field values changed.
            </div>
        `;

    return html`
        <div
            class="bg-[var(--bg-glass-B-1)] border-t border-[var(--border-on-A)]/10 overflow-hidden"
        >
            <table class="w-full text-[11px] font-mono leading-relaxed">
                <thead
                    class="text-[var(--text-on-A-secondary)] bg-[var(--bg-glass-B-2)] border-b border-[var(--border-on-A)]/10"
                >
                    <tr>
                        <th
                            class="px-6 py-2 text-left w-1/3 font-black uppercase tracking-wider opacity-60"
                        >
                            Field
                        </th>
                        <th
                            class="px-6 py-2 text-left w-1/3 text-[var(--color-error)] opacity-80 uppercase tracking-widest font-black"
                        >
                            Reference
                        </th>
                        <th
                            class="px-6 py-2 text-left w-1/3 text-[var(--color-success)] opacity-80 uppercase tracking-widest font-black"
                        >
                            Candidate
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-[var(--border-on-A)]/5">
                    ${differences.map(
        (diff) => html`
                            <tr
                                class="hover:bg-[var(--primary-accent)]/[0.03] transition-colors group"
                            >
                                <td
                                    class="px-6 py-2 text-[var(--text-on-A-secondary)] font-bold break-all opacity-80 group-hover:opacity-100 group-hover:text-[var(--primary-accent)] transition-colors"
                                >
                                    ${diff.key}
                                </td>
                                <td
                                    class="px-6 py-2 text-[var(--color-error)] break-all bg-[var(--color-error)]/2 opacity-80 font-medium"
                                >
                                    ${formatFieldValue(diff.valA)}
                                </td>
                                <td
                                    class="px-6 py-2 text-[var(--color-success)] break-all bg-[var(--color-success)]/2 opacity-90 font-bold"
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
    const { expandedComparisonFlags, activeThemeId } = useUiStore.getState();
    const isSolid = activeThemeId === 'pro-compact';

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
        same: isSolid
            ? 'text-[var(--text-on-A-secondary)] border-[var(--border-on-A)] hover:bg-[var(--bg-surface-B-panel-hover)] hover:text-[var(--text-on-A-primary)] bg-[var(--bg-surface-B-panel)]'
            : 'text-[var(--text-on-A-secondary)] border-[var(--border-on-A)]/10 hover:bg-[var(--bg-glass-B-1)] hover:text-[var(--text-on-A-primary)]',
        modified: isSolid
            ? 'text-[var(--color-warning)] border-[var(--color-warning)] bg-[var(--color-warning)]/5 hover:bg-[var(--color-warning)]/10'
            : 'text-[var(--color-warning)] border-[var(--color-warning)]/20 bg-[var(--color-warning)]/5 hover:bg-[var(--color-warning)]/10 shadow-[inset_0_0_15px_var(--color-warning-glow)]/5',
        added: isSolid
            ? 'text-[var(--color-success)] border-[var(--color-success)] bg-[var(--color-success)]/5 hover:bg-[var(--color-success)]/10'
            : 'text-[var(--color-success)] border-[var(--color-success)]/20 bg-[var(--color-success)]/5 hover:bg-[var(--color-success)]/10 shadow-[inset_0_0_15px_var(--color-success-glow)]/5',
        removed: isSolid
            ? 'text-[var(--color-error)] border-[var(--color-error)] bg-[var(--color-error)]/5 hover:bg-[var(--color-error)]/10'
            : 'text-[var(--color-error)] border-[var(--color-error)]/20 bg-[var(--color-error)]/5 hover:bg-[var(--color-error)]/10 shadow-[inset_0_0_15px_var(--color-error-glow)]/5',
    };

    const rowClass = styles[status];
    const indent = depth * 24;

    const renderBoxMeta = (box) => {
        if (box === null || box === undefined)
            return html`<span
                class="text-[var(--text-on-A-secondary)] italic text-xs select-none opacity-40"
                >Missing</span
            >`;

        // Handle non-object primitives (strings from TS comparator)
        if (typeof box !== 'object') {
            return html`<span
                class="text-[var(--text-on-A-secondary)] text-[10px] font-mono bg-black/30 px-2 py-0.5 rounded border border-white/5"
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
                          class="font-mono text-[9px] font-black opacity-50 shrink-0 bg-black/40 px-2 py-0.5 rounded shadow-inner"
                          >${sizeStr}</span
                      >`
                : ''}
                ${trackId
                ? html`<span
                          class="text-[9px] font-black bg-[var(--primary-accent)]/10 text-[var(--primary-accent)] px-2 py-0.5 rounded border border-[var(--primary-accent)]/20 shadow-[0_0_8px_var(--primary-accent-glow)]/20 uppercase tracking-tighter"
                          >ID:${trackId}</span
                      >`
                : ''}
            </div>
        `;
    };

    return html`
        <div
            class="group border-b ${isSolid ? 'border-[var(--border-on-A)]' : 'border-[var(--border-on-A)]/5'} last:border-0 relative overflow-hidden"
        >
            <div
                class="grid grid-cols-[1fr_40px_1fr] items-stretch ${rowClass} transition-all duration-300 cursor-pointer select-none relative z-10"
                @click=${isExpandable ? toggleExpand : null}
            >
                <!-- Left (A) -->
                <div
                    class="p-2 pl-4 flex items-center gap-2 relative overflow-hidden min-h-[44px]"
                >
                    <div
                        style="width: ${indent}px"
                        class="shrink-0 border-r border-[var(--border-on-A)]/10 h-full absolute left-0 top-0 bg-gradient-to-r from-[var(--primary-accent)]/[0.02] to-transparent"
                    ></div>

                    <div
                        style="padding-left: ${indent}px"
                        class="flex items-center gap-3 grow min-w-0"
                    >
                        <div
                            class="w-4 shrink-0 flex items-center justify-center"
                        >
                            ${isExpandable
            ? html`
                                      <span
                                          class="text-[var(--text-on-A-secondary)] opacity-40 scale-90 transition-all duration-300 ${isExpanded
                    ? 'rotate-90 opacity-100 text-[var(--primary-accent)]'
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
                                          class="font-black text-xs uppercase tracking-widest ${status ===
                    'modified'
                    ? 'text-[var(--color-warning)]'
                    : ''}"
                                          >${node.type}</span
                                      >
                                      ${changesInside > 0
                    ? html`
                                                <span
                                                    class="text-[9px] font-black bg-[var(--color-warning)] text-black px-1.5 py-0.5 rounded-full shadow-[0_0_10px_var(--color-warning-glow)]"
                                                    >${changesInside}</span
                                                >
                                            `
                    : ''}
                                  </div>
                                  <div class="ml-auto">
                                      ${renderBoxMeta(valA)}
                                  </div>
                              `
            : html`<span
                                  class="text-[var(--text-on-A-secondary)] italic text-xs opacity-40"
                                  >Missing</span
                              >`}
                    </div>
                </div>

                <!-- Center Icon -->
                <div
                    class="flex items-center justify-center border-x border-white/5 bg-black/20"
                >
                    ${status === 'modified'
            ? html`<span
                              class="text-[var(--color-warning)] scale-90 drop-shadow-[0_0_8px_var(--color-warning-glow)]"
                              >${icons.alertTriangle}</span
                          >`
            : ''}
                    ${status === 'added'
            ? html`<span
                              class="text-[var(--color-success)] scale-90 drop-shadow-[0_0_8px_var(--color-success-glow)]"
                              >${icons.plusCircle}</span
                          >`
            : ''}
                    ${status === 'removed'
            ? html`<span
                              class="text-[var(--color-error)] scale-90 drop-shadow-[0_0_8px_var(--color-error-glow)]"
                              >${icons.minusCircle}</span
                          >`
            : ''}
                </div>

                <!-- Right (B) -->
                <div
                    class="p-2 pl-4 flex items-center gap-2 relative overflow-hidden min-h-[44px]"
                >
                    <div
                        style="width: ${indent}px"
                        class="shrink-0 border-r border-[var(--border-on-A)]/10 h-full absolute left-0 top-0 opacity-50 bg-gradient-to-r from-[var(--primary-accent)]/[0.02] to-transparent"
                    ></div>
                    <div
                        style="padding-left: ${indent}px"
                        class="flex items-center gap-3 grow min-w-0"
                    >
                        ${valB !== null
            ? html`
                                  <div class="min-w-0 truncate">
                                      <span
                                          class="font-black text-xs mr-2 uppercase tracking-widest"
                                          >${node.type}</span
                                      >
                                  </div>
                                  <div class="ml-auto">
                                      ${renderBoxMeta(valB)}
                                  </div>
                              `
            : html`<span
                                  class="text-[var(--text-on-A-secondary)] italic text-xs opacity-40"
                                  >Missing</span
                              >`}
                    </div>
                </div>
            </div>

            <!-- Expanded Content -->
            ${isExpanded
            ? html`
                      <div class="animate-fadeIn relative z-0">
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
           <div class="flex flex-col items-center justify-center h-full text-[var(--text-on-A-secondary)] relative overflow-hidden animate-fadeIn p-8">
                <!-- Ambient Glow -->
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[var(--color-success)]/5 rounded-full blur-[80px] animate-pulse-slow"></div>

                <div class="relative z-10 p-6 bg-[var(--bg-surface-A-elevated)]/40 rounded-full border border-[var(--border-on-A)]/20 shadow-2xl mb-4 backdrop-blur-xl group">
                    <div class="absolute inset-0 rounded-full bg-[var(--color-success)]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div class="relative z-10 text-[var(--color-success)] scale-125 drop-shadow-[0_0_8px_var(--color-success-glow)]">
                        ${icons.checkCircle}
                    </div>
                </div>

                <h3 class="relative z-10 text-xl font-bold text-[var(--text-on-A-primary)] tracking-tight">
                    Perfect Match
                </h3>
                <p class="relative z-10 text-sm mt-2 max-w-xs text-center opacity-70">
                    The structure and essential fields of the two segments are identical.
                </p>
            </div>
        `;

    return html`
        <div class="flex flex-col h-full bg-transparent overflow-hidden">
            <div class="grow overflow-x-auto custom-scrollbar">
                <div class="min-w-[700px] h-full flex flex-col">
                    <div
                        class="grid grid-cols-[1fr_40px_1fr] ${useUiStore.getState().activeThemeId === 'pro-compact' ? 'bg-[var(--bg-surface-B-panel)] border-b border-[var(--border-on-A)]' : 'bg-[var(--bg-glass-B-4)] backdrop-blur-3xl border-b border-[var(--border-on-A)]/10'} text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-on-A-secondary)] py-4 select-none sticky top-0 z-20 shadow-lg"
                    >
                        <div class="px-6 flex items-center gap-3">
                            <span class="opacity-40">${icons.server}</span>
                            Reference
                            <span
                                class="text-[var(--primary-accent)] opacity-40 text-[9px] font-black"
                                >(A)</span
                            >
                        </div>
                        <div class="text-center opacity-30 text-[9px] mt-0.5">
                            Vs
                        </div>
                        <div class="px-6 flex items-center gap-3">
                            Candidate
                            <span
                                class="text-[var(--secondary-accent)] opacity-40 text-[9px] font-black ml-auto"
                                >(B)</span
                            >
                        </div>
                    </div>
                    <div
                        class="grow overflow-y-auto custom-scrollbar bg-transparent"
                    >
                        ${diffTree.map((node) => renderDiffNode(node, 0))}
                    </div>
                </div>
            </div>
        </div>
    `;
};
