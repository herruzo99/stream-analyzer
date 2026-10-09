import { testSuiteActions } from '@/state/testSuiteStore';
import * as icons from '@/ui/icons';
import { closeDropdown, toggleDropdown } from '@/ui/services/dropdownService';
import { html } from 'lit-html';
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
                class="dropdown-panel bg-slate-800 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl w-80 ring-1 ring-black/50 flex flex-col max-h-[60vh]"
            >
                <!-- Search Header -->
                <div
                    class="p-3 border-b border-slate-800 bg-slate-800 sticky top-0 z-10"
                >
                    <div class="relative">
                        <div
                            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none scale-75"
                        >
                            ${icons.search}
                        </div>
                        <input
                            type="text"
                            placeholder="Find property..."
                            class="w-full bg-slate-800 border border-slate-800 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-100 focus:border-blue-500 outline-none"
                            @input=${(e) => {
                searchTerm = e.target.value;
                updateDropdown();
            }}
                            autofocus
                        />
                    </div>
                </div>

                <!-- Scrollable List -->
                <div class="overflow-y-auto custom-scrollbar p-2 space-y-3">
                    ${categoryKeys.map((catKey) => {
                const cat = PROPERTY_CATEGORIES[catKey];
                return html`
                            <div>
                                <div
                                    class="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2"
                                >
                                    <span class="${cat.color} scale-75"
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
                                                class="w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between group ${currentPath ===
                            p.path
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}"
                                            >
                                                <span class="truncate"
                                                    >${p.label}</span
                                                >
                                                ${currentPath === p.path
                            ? html`<span
                                                          class="scale-75"
                                                          >${icons.checkCircle}</span
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
                              class="p-4 text-center text-slate-400 text-xs italic"
                          >
                              No matching properties.
                          </div>`
                : ''}

                    <!-- Custom Path Fallback -->
                    <div class="border-t border-slate-800 pt-2">
                        <button
                            @click=${(e) => {
                e.stopPropagation();
                onSelect(null);
                closeDropdown();
            }}
                            class="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors flex items-center gap-2 border border-transparent hover:border-slate-800"
                        >
                            ${icons.code} Use Custom JSON Path
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

const assertionRow = (assert, index, onUpdate, onRemove, isGlass) => {
    const propDef = TESTABLE_PROPERTIES.find((p) => p.path === assert.path);
    const dataType = propDef ? propDef.type : 'string';
    const operators = OPERATORS_BY_TYPE[dataType] || OPERATORS_BY_TYPE.string;
    const category = propDef
        ? PROPERTY_CATEGORIES[propDef.category]
        : PROPERTY_CATEGORIES.general;

    const handlePropSelect = (p) => {
        if (p) {
            const newType = p.type;
            const defaultOp = OPERATORS_BY_TYPE[newType][0].value;
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
    let valueInput;
    if (assert.operator === 'exists') {
        valueInput = html`
            <div
                class="h-10 flex items-center px-4 bg-slate-800 border border-slate-800 rounded-lg text-xs text-slate-400 italic select-none w-full"
            >
                Check presence only
            </div>
        `;
    } else if (dataType === 'boolean') {
        const isTrue = String(assert.value) === 'true';
        valueInput = html`
            <button
                @click=${() => onUpdate(index, { value: String(!isTrue) })}
                class="h-10 px-4 rounded-lg text-xs font-bold border transition-all w-full flex items-center justify-center gap-2 ${isTrue
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30 shadow-[0_0_10px_#10b981]'
                : 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30 shadow-[0_0_10px_#ef4444]'}"
            >
                ${isTrue ? icons.checkCircle : icons.xCircle}
                ${isTrue ? 'TRUE' : 'FALSE'}
            </button>
        `;
    } else if (dataType === 'number') {
        valueInput = html`
            <div class="relative flex items-center w-full group/input">
                <input
                    type="number"
                    class="h-10 bg-slate-800 border border-slate-800 hover:border-blue-500/50 rounded-lg py-1.5 pl-4 pr-10 text-xs text-slate-100 font-mono w-full focus:border-blue-500 focus:bg-blue-500/5 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    .value=${assert.value}
                    @input=${(e) => onUpdate(index, { value: e.target.value })}
                    step="any"
                />
                ${propDef?.unit
                ? html`<span
                          class="absolute right-3 text-[10px] text-slate-400 select-none font-bold group-focus-within/input:text-blue-400 transition-colors"
                          >${propDef.unit}</span
                      >`
                : ''}
            </div>
        `;
    } else {
        valueInput = html`
            <input
                type="text"
                class="h-10 bg-slate-800 border border-slate-800 hover:border-blue-500/50 rounded-lg py-1.5 px-4 text-xs text-slate-100 font-mono w-full focus:border-blue-500 focus:bg-blue-500/5 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-400/50"
                .value=${assert.value}
                placeholder="Expected Value..."
                @input=${(e) => onUpdate(index, { value: e.target.value })}
            />
        `;
    }

    // Row Styling Condition
    const rowBase = "layout-card flex flex-col transition-all hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:border-slate-800 hover:bg-slate-800 group animate-fadeIn relative";
    const rowStyle = isGlass
        ? "" // Glass: Let default flow, no border/bg overrides
        : "bg-slate-800 border border-slate-800";

    return html`
        <div class="${rowBase} ${rowStyle}">
            
            <!-- Header: Index, Category, Remove -->
            <div class="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-800/30">
                <div class="flex items-center gap-3">
                    <span class="text-[10px] font-mono text-slate-400 opacity-50 select-none">
                        #${String(index + 1).padStart(2, '0')}
                    </span>
                    
                    <!-- Small Category Badge -->
                    <div class="flex items-center gap-2 pl-2 border-l border-slate-800">
                        <span class="${category.color} scale-75">${category.icon}</span>
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider opacity-80">
                            ${category.label}
                        </span>
                    </div>
                </div>

                <button
                    @click=${() => onRemove(index)}
                    class="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                    title="Remove Rule"
                >
                    ${icons.xCircle}
                </button>
            </div>

            <!-- Body: Controls -->
            <div class="p-3 flex flex-col gap-3">
                
                <!-- Row 1: Property Selector -->
                <div class="relative w-full">
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
                        class="flex items-center justify-between w-full bg-slate-800 border border-slate-800 hover:border-blue-500/50 rounded-lg px-3 py-2 text-xs text-left transition-all shadow-inner group/btn hover:bg-slate-800"
                    >
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="text-slate-400 scale-75">${icons.search}</span>
                            <span class="text-slate-100 font-bold truncate">
                                ${propDef ? propDef.label : assert.path || 'Select Property...'}
                            </span>
                        </div>
                        <span class="text-slate-400 group-hover/btn:text-slate-100 scale-75 transition-colors">
                            ${icons.chevronDown}
                        </span>
                    </button>
                    ${!propDef
            ? html`<input
                              type="text"
                              class="mt-2 w-full bg-slate-800 border border-slate-800 rounded-lg px-3 py-2 text-[10px] font-mono text-slate-400 focus:border-blue-500/50 outline-none transition-colors"
                              .value=${assert.path}
                              @change=${(e) =>
                    onUpdate(index, { path: e.target.value })}
                              placeholder="path.to.property"
                          />`
            : ''}
                </div>

                <!-- Row 2: Condition -->
                <div class="flex items-center gap-2">
                    <div class="relative w-1/3 min-w-[120px]">
                        <select
                            class="w-full h-10 bg-slate-800 border border-slate-800 hover:border-slate-800 rounded-lg px-3 text-xs text-slate-100 appearance-none cursor-pointer focus:border-blue-500 outline-none transition-colors font-medium"
                            .value=${assert.operator}
                            @change=${(e) =>
            onUpdate(index, { operator: e.target.value })}
                        >
                            ${operators.map(
                (op) =>
                    html`<option value=${op.value}>
                                        ${op.label}
                                    </option>`
            )}
                        </select>
                        <div
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none scale-75"
                        >
                            ${icons.chevronDown}
                        </div>
                    </div>

                    <div class="grow">${valueInput}</div>
                </div>
            </div>
        </div>
    `;
};

export const testSuiteManagerTemplate = (suite) => {
    if (!suite) return html``;

    // Port: no themes in 1.2.0; solid styling throughout.
    const isGlass = false;
    const gridGap = isGlass ? 'gap-4' : 'gap-2';

    const emptyStateStyle = isGlass
        ? "bg-slate-800 border-2 border-dashed border-slate-700"
        : "bg-slate-800 border-2 border-dashed border-slate-700";

    const updateAssertion = (index, updates) => {
        const newAssertions = [...suite.assertions];
        newAssertions[index] = { ...newAssertions[index], ...updates };
        testSuiteActions.updateSuite(suite.id, { assertions: newAssertions });
    };

    const addAssertion = () => {
        const newAssertion = {
            id: crypto.randomUUID(),
            name: 'New Rule',
            path: '',
            operator: 'equals',
            value: '',
        };
        testSuiteActions.updateSuite(suite.id, {
            assertions: [...(suite.assertions || []), newAssertion],
        });
    };

    const removeAssertion = (index) => {
        const newAssertions = suite.assertions.filter((_, i) => i !== index);
        testSuiteActions.updateSuite(suite.id, { assertions: newAssertions });
    };

    return html`
        <div class="flex flex-col h-full bg-transparent">
            <!-- Editor Canvas -->
            <div class="h-full overflow-y-auto custom-scrollbar p-4">
                ${(suite.assertions || []).length === 0
            ? html`
                          <div
                              class="layout-card flex flex-col items-center justify-center h-full min-h-[400px] rounded-xl text-slate-400 group hover:border-blue-500/30 hover:bg-slate-800 transition-all ${emptyStateStyle}"
                          >
                              <div
                                  class="p-6 bg-slate-800 rounded-full mb-6 shadow-2xl group-hover:scale-110 transition-transform duration-500"
                              >
                                  ${icons.beaker}
                              </div>
                              <h3
                                  class="text-slate-200 font-bold mb-2 text-lg"
                              >
                                  No Rules Yet
                              </h3>
                              <p
                                  class="text-xs opacity-60 mb-8 max-w-xs text-center leading-relaxed"
                              >
                                  Add an assertion to start testing your stream
                                  properties against specific criteria.
                              </p>
                              <button
                                  @click=${addAssertion}
                                  class="px-8 py-3 bg-blue-500 hover:bg-[#60a5fa] text-white text-sm font-bold rounded-xl shadow-[0_0_20px_#3b82f6] hover:shadow-[0_0_30px_#3b82f6] transition-all flex items-center gap-3 hover:-translate-y-1"
                              >
                                  ${icons.plusCircle} Add First Rule
                              </button>
                          </div>
                      `
            : html`
                          <div
                              class="grid grid-cols-1 xl:grid-cols-2 ${gridGap} max-w-[1600px] mx-auto pb-10"
                          >
                              ${suite.assertions.map((assert, i) =>
                assertionRow(
                    assert,
                    i,
                    updateAssertion,
                    removeAssertion,
                    isGlass
                )
            )}

                              <button
                                  @click=${addAssertion}
                                  class="h-full min-h-[140px] border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/[0.02] transition-all flex flex-col items-center justify-center gap-3 font-bold text-xs group"
                              >
                                  <div
                                      class="p-3 bg-slate-800 rounded-full group-hover:scale-110 transition-transform border border-slate-800 group-hover:border-blue-500/20 group-hover:bg-blue-500/10"
                                  >
                                      ${icons.plusCircle}
                                  </div>
                                  <span class="uppercase tracking-widest"
                                      >Add New Rule</span
                                  >
                              </button>
                          </div>
                      `}
            </div>
        </div>
    `;
};
