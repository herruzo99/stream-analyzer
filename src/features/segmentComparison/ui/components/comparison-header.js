/**
 * Comparison header: A/B segment selectors for the segment comparison view.
 *
 * Reconstructed for the port (imported but never committed). Contract,
 * derived from the index call site:
 *   comparisonHeaderTemplate({ availableSegments, segmentA, segmentB,
 *                              onSelectA, onSelectB })
 * Entries are `{ segment, label, repId }` (see ./view-model.js).
 */
import { html } from 'lit-html';

const selector = (id, entries, selected, onSelect, label) => html`
    <label class="flex flex-col gap-1 min-w-0">
        <span
            class="text-[10px] font-bold text-slate-400"
            >${label}</span
        >
        <select
            @change=${(e) => {
                const entry = entries.find(
                    (item) =>
                        item.segment.uniqueId === e.target.value
                );
                if (entry) onSelect(entry);
            }}
            class="w-full bg-white/5 border border-white/10 text-slate-100 text-xs rounded-md px-2 py-2 outline-none focus:border-emerald-400/25 font-mono"
        >
            ${entries.length === 0
                ? html`<option value="">No segments</option>`
                : entries.map(
                      (entry) => html`
                          <option
                              value="${entry.segment.uniqueId}"
                              ?selected=${selected?.segment?.uniqueId ===
                              entry.segment.uniqueId}
                              title="${entry.segment.uniqueId}"
                          >
                              ${entry.label}
                          </option>
                      `
                  )}
        </select>
    </label>
`;

export const comparisonHeaderTemplate = ({
    availableSegments = [],
    segmentA = null,
    segmentB = null,
    onSelectA = null,
    onSelectB = null,
} = {}) => html`
    <div class="flex items-end gap-3 flex-wrap">
        <div class="grow min-w-[180px]">
            ${selector(
                'segment-a',
                availableSegments,
                segmentA,
                onSelectA || (() => {}),
                'Segment A'
            )}
        </div>
        <div
            class="pb-2 text-[10px] font-bold text-slate-500 shrink-0"
        >
            vs
        </div>
        <div class="grow min-w-[180px]">
            ${selector(
                'segment-b',
                availableSegments,
                segmentB,
                onSelectB || (() => {}),
                'Segment B'
            )}
        </div>
    </div>
`;
