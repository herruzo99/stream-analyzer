import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { useUiStore, uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { tooltipTriggerClasses } from '@/ui/shared/constants';

const flagsCellTemplate = (flags, isExpanded) => {
    if (!flags || typeof flags !== 'object') {
        return '---';
    }

    const activeFlags = Object.entries(flags)
        .filter(([, v]) => v)
        .map(([k]) => k.replace(/_/g, '-'));

    const summary = activeFlags.length > 0 ? activeFlags.join(', ') : 'none';

    if (!isExpanded) {
        return summary;
    }

    return html`
        <div class="text-xs">
            <div class="mb-2 truncate font-semibold">${summary}</div>
            <table
                class="w-full text-left bg-slate-900/50 rounded border border-slate-700/50"
            >
                <tbody>
                    ${Object.entries(flags).map(
                        ([key, value]) => html`
                            <tr class="border-t border-slate-700/50">
                                <td class="p-1.5 text-slate-400">
                                    ${key.replace(/_/g, '-')}
                                </td>
                                <td
                                    class="p-1.5 text-right font-semibold ${value
                                        ? 'text-green-400'
                                        : 'text-red-400'}"
                                >
                                    ${value}
                                </td>
                            </tr>
                        `
                    )}
                </tbody>
            </table>
        </div>
    `;
};

const isFlagsObject = (value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false;
    }
    // Heuristic: check for keys common in flag objects
    const flagKeys = [
        'data_offset_present', // trun
        'sample_duration_present', // trun
        'base_data_offset_present', // tfhd
        'track_enabled', // tkhd
        'self_contained', // url
    ];
    return flagKeys.some((key) => key in value);
};

const renderCell = (value, rowName, isExpanded) => {
    if (isFlagsObject(value)) {
        return flagsCellTemplate(value, isExpanded);
    }
    if (value === '---' || value === undefined || value === null) {
        return '---';
    }
    return unsafeHTML(String(value));
};

/**
 * Renders a single row in the comparison view.
 * @param {object} rowData - The data for the row.
 * @param {number} numColumns - The total number of segment columns.
 * @returns {import('lit-html').TemplateResult}
 */
export const comparisonRowTemplate = (rowData, numColumns) => {
    const { name, values, status, tooltip, isoRef } = rowData;
    const { expandedComparisonFlags } = useUiStore.getState();

    const containsFlags = values.some(isFlagsObject);
    const isFlagsExpanded = containsFlags && expandedComparisonFlags.has(name);

    const gridStyle = `grid-template-columns: 250px repeat(${numColumns}, minmax(300px, 1fr));`;

    const getCellClass = (value) => {
        if (value === '---') return 'bg-slate-800/50 text-slate-500 italic';
        if (status === 'different') return 'bg-amber-900/30';
        return '';
    };

    const getRowIcon = () => {
        switch (status) {
            case 'different':
                return html`<span
                    class="text-amber-400 shrink-0"
                    title="Different"
                    >${icons.updates}</span
                >`;
            case 'missing':
                return html`<span
                    class="text-red-400 shrink-0"
                    title="Missing"
                    >${icons.xCircle}</span
                >`;
            default:
                return html`<span
                    class="text-green-500/50 shrink-0"
                    title="Same"
                    >${icons.checkCircle}</span
                >`;
        }
    };

    const expanderButton = containsFlags
        ? html`
              <button
                  @click=${() => uiActions.toggleComparisonFlags(name)}
                  class="ml-2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors"
                  title="Toggle flag details"
              >
                  ${icons.binary}
                  <span>Flags</span>
              </button>
          `
        : '';

    return html`
        <div class="grid border-t border-slate-700" style="${gridStyle}">
            <div
                class="font-medium text-slate-300 p-3 border-r border-slate-700 flex items-start gap-2"
            >
                ${getRowIcon()}
                <div class="grow">
                    <span
                        class=${tooltip ? tooltipTriggerClasses : ''}
                        data-tooltip=${tooltip || ''}
                        data-iso=${isoRef || ''}
                        >${name}</span
                    >
                    ${expanderButton}
                </div>
            </div>
            ${values.map(
                (value) => html`
                    <div
                        class="p-3 font-mono text-xs border-r border-slate-700 wrap-break-word ${getCellClass(
                            value
                        )}"
                    >
                        ${renderCell(value, name, isFlagsExpanded)}
                    </div>
                `
            )}
        </div>
    `;
};