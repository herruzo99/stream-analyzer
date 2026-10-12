import { testSuiteActions } from '@/state/testSuiteStore';
import * as icons from '@/ui/icons';
import { closeDropdown, toggleDropdown } from '@/ui/services/dropdownService';
import { html } from 'lit-html';
import { randomId } from '@/shared/utils/random.js';
import {
    OPERATORS_BY_TYPE,
    PROPERTY_CATEGORIES,
    TESTABLE_PROPERTIES,
} from '../../domain/test-properties.js';

// --- Searchable Property Dropdown ---
const propertyDropdownContent = (currentPath, onSelect) => {
    let searchTerm = '';

    const renderContent = () => {
        // Filter based on search
        const lowerSearch = searchTerm.toLowerCase();
        const filteredProps = TESTABLE_PROPERTIES.filter(
            (p) =>
                !searchTerm ||
                p.label.toLowerCase().includes(lowerSearch) ||
                p.keywords?.some((k) => k.includes(lowerSearch))
        );

        // Group by category
        const grouped = filteredProps.reduce((acc, prop) => {
            if (!acc[prop.category]) acc[prop.category] = [];
            acc[prop.category].push(prop);
            return acc;
        }, {});

        const categoryKeys = Object.keys(PROPERTY_CATEGORIES).filter(
            (k) => grouped[k] && grouped[k].length > 0
        );

        return html`
            <div
                class="dropdown-panel bg-[#0b111c] border border-white/10 rounded-md w-80 flex flex-col max-h-[60vh]"
            >
                <div
                    class="p-2.5 border-b border-white/5 bg-[#0b111c] sticky top-0 z-10"
                >
                    <div class="relative">
                        <span
                            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
                        >
                            ${icons.search}
                        </span>
                        <input
                            type="text"
                            placeholder="find property"
                            class="w-full bg-[#06090f] border border-white/10 rounded-md py-2 pl-8 pr-3 text-[13px] text-slate-100 focus:border-emerald-400/60 outline-none placeholder:text-slate-600"
                            @input=${(e) => {
                searchTerm = e.target.value;
                updateDropdown();
            }}
                            autofocus
                        />
                    </div>
                </div>

                <div class="overflow-y-auto custom-scrollbar p-2 space-y-3">
                    ${categoryKeys.map((catKey) => {
                const cat = PROPERTY_CATEGORIES[catKey];
                return html`
                            <div>
                                <div
                                    class="px-2 mb-1 mono text-[10px] text-slate-500 flex items-center gap-2"
                                >
                                    <span class="${cat.color}"
                                        >${cat.icon}</span
                                    >
                                    ${cat.label}
                                </div>
                                <div class="grid grid-cols-1 gap-0.5">
                                    ${grouped[catKey].map(
                    (p) => html`
                                            <button
                                                @click=${(e) => {
                            e.stopPropagation();
                            onSelect(p);
                            closeDropdown();
                        }}
                                                class="w-full text-left px-3 py-2 rounded-md text-[13px] transition-colors flex items-center justify-between ${currentPath ===
                            p.path
                            ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-400/25'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-100 border border-transparent'}"
                                            >
                                                <span class="truncate"
                                                    >${p.label}</span
                                                >
                                                ${currentPath === p.path
                            ? html`<span
                                                          >${icons.check}</span
                                                      >`
                            : ''}
                                            </button>
                                        `
                )}
                                </div>
                            </div>
                        `;
            })}
                    ${categoryKeys.length === 0
                ? html`<div
                              class="p-4 text-center mono text-[11px] text-slate-600"
                          >
                              no matching properties
                          </div>`
                : ''}

                    <div class="border-t border-white/5 pt-2">
                        <button
                            @click=${(e) => {
                e.stopPropagation();
                onSelect(null);
                closeDropdown();
            }}
                            class="w-full text-left px-3 py-2 rounded-md text-[13px] text-slate-400 hover:bg-white/5 hover:text-slate-100 transition-colors flex items-center gap-2"
                        >
                            ${icons.code} use custom path
                        </button>
                    </div>
                </div>
            </div>
        `;
    };

    // Self-updating render helper for the dropdown content
    const updateDropdown = () => {
        const container = document.getElementById(
            'property-dropdown-container'
        );
        if (container) {
            import('lit-html').then(({ render }) =>
                render(renderContent(), container)
            );
        }
    };

    return html`<div id="property-dropdown-container">${renderContent()}</div>`;
};

const assertionRow = (assert, index, onUpdate, onRemove) => {
    const propDef = TESTABLE_PROPERTIES.find((p) => p.path === assert.path);
    const dataType = propDef ? propDef.type : 'string';
    const operators =
        OPERATORS_BY_TYPE[dataType] || OPERATORS_BY_TYPE.string;
    const category = propDef
        ? PROPERTY_CATEGORIES[propDef.category]
        : PROPERTY_CATEGORIES.general;

    const handlePropSelect = (p) => {
        if (p) {
            const newType = p.type;
            const defaultOp = (OPERATORS_BY_TYPE[newType] || OPERATORS_BY_TYPE.string)[0].value;
            let defaultVal = '';
            if (newType === 'boolean') defaultVal = 'true';
            if (newType === 'number') defaultVal = '0';

            onUpdate(index, {
                path: p.path,
                name: p.label,
                operator: defaultOp,
                value: defaultVal,
            });
        } else {
            onUpdate(index, {
                path: '',
                name: 'Custom Rule',
                operator: 'exists',
                value: '',
            });
        }
    };

    // --- Type-Specific Inputs ---
    const fieldClass =
        'h-10 bg-[#06090f] border border-white/10 hover:border-white/25 rounded-md px-3.5 text-[13px] text-slate-100 font-mono w-full focus:border-emerald-400/60 outline-none transition-colors placeholder:text-slate-600';
    let valueInput;
    if (assert.operator === 'exists') {
        valueInput = html`
            <div
                class="h-10 flex items-center px-3.5 border border-white/5 rounded-md mono text-[11px] text-slate-600 select-none w-full"
            >
                checks presence only
            </div>
        `;
    } else if (dataType === 'boolean') {
        const isTrue = String(assert.value) === 'true';
        valueInput = html`
            <button
                @click=${() => onUpdate(index, { value: String(!isTrue) })}
                role="switch"
                aria-checked=${isTrue}
                aria-label="Expected value (currently ${isTrue ? 'true' : 'false'})"
                class="h-10 px-4 rounded-md mono text-[11px] border transition-colors w-full flex items-center justify-center gap-2 ${isTrue
                    ? 'bg-emerald-500/10 text-emerald-200 border-emerald-400/25'
                    : 'bg-white/[0.02] text-slate-400 border-white/10'}"
            >
                ${isTrue ? 'true' : 'false'}
            </button>
        `;
    } else if (dataType === 'number') {
        valueInput = html`
            <div class="relative flex items-center w-full">
                <input
                    type="number"
                    class="${fieldClass} pr-10"
                    .value=${assert.value}
                    @input=${(e) => onUpdate(index, { value: e.target.value })}
                    step="any"
                    aria-label="Expected numeric value"
                />
                ${propDef?.unit
                    ? html`<span
                          class="absolute right-3 mono text-[10px] text-slate-600 select-none"
                          >${propDef.unit}</span
                      >`
                    : ''}
            </div>
        `;
    } else {
        valueInput = html`
            <input
                type="text"
                class="${fieldClass}"
                .value=${assert.value}
                placeholder="expected value"
                aria-label="Expected value"
                @input=${(e) => onUpdate(index, { value: e.target.value })}
            />
        `;
    }

    return html`
        <div class="rounded-md border border-white/5 bg-[#0b111c] flex flex-col">
            <div class="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <div class="flex items-center gap-2.5 min-w-0">
                    <span class="mono text-[10px] text-slate-600 select-none">
                        ${String(index + 1).padStart(2, '0')}
                    </span>
                    <span class="mono text-[10px] text-slate-500 truncate">
                        ${String(category.label).toLowerCase()}
                    </span>
                </div>

                <button
                    @click=${() => onRemove(index)}
                    class="p-1.5 text-slate-600 hover:text-red-300 rounded transition-colors"
                    title="Remove rule"
                    aria-label="Remove rule ${index + 1}"
                >
                    ${icons.x}
                </button>
            </div>

            <div class="p-3 flex flex-col gap-2.5">
                <div class="w-full">
                    <button
                        @click=${(e) =>
                            toggleDropdown(
                                e.currentTarget,
                                () =>
                                    propertyDropdownContent(
                                        assert.path,
                                        handlePropSelect
                                    ),
                                e
                            )}
                        class="flex items-center justify-between w-full bg-[#06090f] border border-white/10 hover:border-white/25 rounded-md px-3 py-2.5 text-[13px] text-left transition-colors"
                    >
                        <span class="text-slate-100 font-medium truncate">
                            ${propDef ? propDef.label : assert.path || 'Select property'}
                        </span>
                        <span class="text-slate-500 shrink-0">
                            ${icons.chevronDown}
                        </span>
                    </button>
                    ${!propDef
                        ? html`<input
                              type="text"
                              class="mt-2 w-full bg-[#06090f] border border-white/10 rounded-md px-3 py-2.5 mono text-[11px] text-slate-300 focus:border-emerald-400/60 outline-none transition-colors"
                              .value=${assert.path}
                              @change=${(e) =>
                                onUpdate(index, { path: e.target.value })}
                              placeholder="manifest.summary.duration"
                              aria-label="Custom JSON path"
                          />`
                        : ''}
                </div>

                <div class="flex items-center gap-2">
                    <div class="relative w-1/3 min-w-[120px]">
                        <select
                            class="w-full h-10 bg-[#06090f] border border-white/10 rounded-md px-3 text-[13px] text-slate-100 appearance-none cursor-pointer hover:border-white/25 focus:border-emerald-400/60 outline-none transition-colors"
                            .value=${assert.operator}
                            @change=${(e) =>
                                onUpdate(index, { operator: e.target.value })}
                            aria-label="Comparison operator"
                        >
                            ${operators.map(
                                (op) =>
                                    html`<option value=${op.value}>
                                        ${op.label}
                                    </option>`
                            )}
                        </select>
                        <span
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                        >
                            ${icons.chevronDown}
                        </span>
                    </div>

                    <div class="grow min-w-0">${valueInput}</div>
                </div>
            </div>
        </div>
    `;
};

export const testSuiteManagerTemplate = (suite) => {
    if (!suite) return html``;

    const updateAssertion = (index, updates) => {
        const current = Array.isArray(suite.assertions)
            ? suite.assertions
            : [];
        const newAssertions = [...current];
        newAssertions[index] = { ...newAssertions[index], ...updates };
        testSuiteActions.updateSuite(suite.id, { assertions: newAssertions });
    };

    // New rules start valid: `exists` needs no value, so the rule can
    // run immediately instead of failing validation first.
    const addAssertion = () => {
        const newAssertion = {
            id: randomId(),
            name: 'New Rule',
            path: '',
            operator: 'exists',
            value: '',
        };
        testSuiteActions.updateSuite(suite.id, {
            assertions: [...(suite.assertions || []), newAssertion],
        });
    };

    const removeAssertion = (index) => {
        const current = Array.isArray(suite.assertions)
            ? suite.assertions
            : [];
        const newAssertions = current.filter((_, i) => i !== index);
        testSuiteActions.updateSuite(suite.id, { assertions: newAssertions });
    };

    return html`
        <div class="flex flex-col h-full">
            <div class="h-full overflow-y-auto custom-scrollbar p-4">
                ${(suite.assertions || []).length === 0
            ? html`
                          <div
                              class="flex flex-col items-center justify-center h-full min-h-[320px] text-center"
                          >
                              <p
                                  class="text-[15px] font-medium text-slate-200 mb-1"
                              >
                                  No rules yet.
                              </p>
                              <p
                                  class="mono text-[11px] text-slate-600 mb-5 max-w-xs leading-relaxed"
                              >
                                  Rules check stream properties — add one,
                                  then press Run in the header.
                              </p>
                              <button
                                  @click=${addAssertion}
                                  class="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-[13px] font-medium rounded-md transition-colors flex items-center gap-2"
                              >
                                  ${icons.plusCircle} Add first rule
                              </button>
                          </div>
                      `
            : html`
                          <div
                              class="grid grid-cols-1 xl:grid-cols-2 gap-2 max-w-[1600px] mx-auto pb-8"
                          >
                              ${suite.assertions.map((assert, i) =>
                assertionRow(
                    assert,
                    i,
                    updateAssertion,
                    removeAssertion
                )
            )}

                              <button
                                  @click=${addAssertion}
                                  class="min-h-[120px] border border-dashed border-white/10 hover:border-white/25 rounded-md text-slate-500 hover:text-slate-200 transition-colors flex flex-col items-center justify-center gap-2 mono text-[11px]"
                              >
                                  ${icons.plusCircle}
                                  <span>add rule</span>
                              </button>
                          </div>
                      `}
            </div>
        </div>
    `;
};
