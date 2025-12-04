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
                class="dropdown-panel bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-80 ring-1 ring-black/50 flex flex-col max-h-[60vh]"
            >
                <!-- Search Header -->
                <div
                    class="p-3 border-b border-slate-800 bg-slate-900 sticky top-0 z-10"
                >
                    <div class="relative">
                        <div
                            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none scale-75"
                        >
                            ${icons.search}
                        </div>
                        <input
                            type="text"
                            placeholder="Find property..."
                            class="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 pl-8 pr-3 text-xs text-white focus:border-blue-500 outline-none"
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
                                    class="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2"
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
                                                    ? 'bg-blue-600 text-white shadow-md'
                                                    : 'text-slate-300 hover:bg-white/10 hover:text-white'}"
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
                              class="p-4 text-center text-slate-500 text-xs italic"
                          >
                              No matching properties.
                          </div>`
                        : ''}

                    <!-- Custom Path Fallback -->
                    <div class="border-t border-white/10 pt-2">
                        <button
                            @click=${(e) => {
                                e.stopPropagation();
                                onSelect(null);
                                closeDropdown();
                            }}
                            class="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2 border border-transparent hover:border-slate-700"
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

const assertionRow = (assert, index, onUpdate, onRemove) => {
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
                class="h-9 flex items-center px-3 bg-slate-900/30 border border-slate-800 rounded-lg text-xs text-slate-500 italic select-none w-full"
            >
                Check presence only
            </div>
        `;
    } else if (dataType === 'boolean') {
        const isTrue = String(assert.value) === 'true';
        valueInput = html`
            <button
                @click=${() => onUpdate(index, { value: String(!isTrue) })}
                class="h-9 px-4 rounded-lg text-xs font-bold border transition-all w-full flex items-center justify-center gap-2 ${isTrue
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30'}"
            >
                ${isTrue ? icons.checkCircle : icons.xCircle}
                ${isTrue ? 'TRUE' : 'FALSE'}
            </button>
        `;
    } else if (dataType === 'number') {
        valueInput = html`
            <div class="relative flex items-center w-full">
                <input
                    type="number"
                    class="h-9 bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg py-1.5 pl-3 pr-8 text-xs text-cyan-300 font-mono w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                    .value=${assert.value}
                    @input=${(e) => onUpdate(index, { value: e.target.value })}
                    step="any"
                />
                ${propDef?.unit
                    ? html`<span
                          class="absolute right-3 text-[10px] text-slate-500 select-none font-bold"
                          >${propDef.unit}</span
                      >`
                    : ''}
            </div>
        `;
    } else {
        valueInput = html`
            <input
                type="text"
                class="h-9 bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg py-1.5 px-3 text-xs text-yellow-200 font-mono w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                .value=${assert.value}
                placeholder="Expected Value..."
                @input=${(e) => onUpdate(index, { value: e.target.value })}
            />
        `;
    }

    const categoryBadge = propDef
        ? html`<div class="p-1.5 rounded-md ${category.bg} ${category.color}">
              ${category.icon}
          </div>`
        : html`<div class="p-1.5 rounded-md bg-slate-800 text-slate-400">
              ${icons.code}
          </div>`;

    return html`
        <div
            class="flex gap-3 items-start p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl transition-all hover:shadow-md hover:border-slate-600 hover:bg-slate-800/60 group animate-fadeIn relative"
        >
            <!-- Remove Button (Absolute) -->
            <button
                @click=${() => onRemove(index)}
                class="absolute -top-2 -right-2 p-1 bg-slate-800 border border-slate-600 text-slate-400 hover:text-red-400 hover:border-red-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all scale-90 hover:scale-100 z-10"
                title="Remove Rule"
            >
                ${icons.xCircle}
            </button>

            <!-- Index & Icon -->
            <div class="flex flex-col items-center gap-2 mt-1">
                <span class="text-[9px] font-mono text-slate-600 select-none"
                    >#${index + 1}</span
                >
                ${categoryBadge}
            </div>

            <!-- Logic Flow -->
            <div class="flex flex-col gap-3 grow">
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
                        class="flex items-center justify-between w-full bg-slate-900 border border-slate-700 hover:border-blue-500/50 rounded-lg px-3 py-2 text-xs text-left transition-all shadow-sm group/btn"
                    >
                        <div class="flex flex-col min-w-0">
                            <span
                                class="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5 group-hover/btn:text-blue-400"
                                >Property</span
                            >
                            <span class="text-slate-200 font-medium truncate"
                                >${propDef
                                    ? propDef.label
                                    : assert.path || 'Select...'}</span
                            >
                        </div>
                        <span
                            class="text-slate-500 group-hover/btn:text-white scale-75 transition-colors"
                            >${icons.chevronDown}</span
                        >
                    </button>
                    ${!propDef
                        ? html`<input
                              type="text"
                              class="mt-2 w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] font-mono text-slate-400 focus:border-blue-500/50 outline-none"
                              .value=${assert.path}
                              @change=${(e) =>
                                  onUpdate(index, { path: e.target.value })}
                              placeholder="path.to.property"
                          />`
                        : ''}
                </div>

                <!-- Row 2: Condition (Operator + Value) -->
                <div class="flex items-center gap-2">
                    <div class="relative w-1/3 min-w-[110px]">
                        <select
                            class="w-full h-9 bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg px-3 text-xs text-slate-300 appearance-none cursor-pointer focus:border-blue-500 outline-none transition-colors"
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
                            class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none scale-75"
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

    const handleUpdateSuite = (field, value) => {
        testSuiteActions.updateSuite(suite.id, { [field]: value });
    };

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
        <div class="flex flex-col h-full bg-slate-950">
            <!-- Header -->
            <div class="p-6 border-b border-slate-800 bg-slate-900/50">
                <div class="flex justify-between items-start gap-6">
                    <div class="grow max-w-3xl space-y-3">
                        <div>
                            <label
                                class="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-widest"
                                >Suite Name</label
                            >
                            <input
                                type="text"
                                class="w-full bg-transparent text-2xl font-bold text-white placeholder-slate-700 focus:outline-none border-b border-transparent focus:border-blue-500 transition-all pb-1"
                                .value=${suite.name}
                                @change=${(e) =>
                                    handleUpdateSuite('name', e.target.value)}
                                placeholder="Untitled Suite"
                            />
                        </div>
                        <div>
                            <input
                                type="text"
                                class="w-full bg-transparent text-sm text-slate-400 placeholder-slate-600 focus:outline-none"
                                .value=${suite.description || ''}
                                @change=${(e) =>
                                    handleUpdateSuite(
                                        'description',
                                        e.target.value
                                    )}
                                placeholder="Add a description..."
                            />
                        </div>
                    </div>

                    <div class="flex flex-col items-end gap-2">
                        <span
                            class="bg-slate-800 text-slate-400 text-xs font-bold px-3 py-1 rounded-full border border-slate-700"
                        >
                            ${suite.assertions?.length || 0} Rules
                        </span>
                        <button
                            @click=${() =>
                                testSuiteActions.deleteSuite(suite.id)}
                            class="text-xs text-red-400 hover:text-red-300 underline decoration-red-400/30"
                        >
                            Delete Suite
                        </button>
                    </div>
                </div>
            </div>

            <!-- Editor Canvas -->
            <div class="grow overflow-y-auto custom-scrollbar p-6 bg-slate-950">
                ${(suite.assertions || []).length === 0
                    ? html`
                          <div
                              class="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20 text-slate-500"
                          >
                              <div
                                  class="p-4 bg-slate-800 rounded-full mb-4 shadow-lg"
                              >
                                  ${icons.beaker}
                              </div>
                              <h3 class="text-slate-300 font-bold mb-1">
                                  No Rules Yet
                              </h3>
                              <p class="text-xs opacity-70 mb-6">
                                  Add an assertion to start testing.
                              </p>
                              <button
                                  @click=${addAssertion}
                                  class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2"
                              >
                                  ${icons.plusCircle} Add First Rule
                              </button>
                          </div>
                      `
                    : html`
                          <div
                              class="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-7xl mx-auto"
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
                                  class="h-full min-h-[100px] border-2 border-dashed border-slate-800 rounded-xl text-slate-500 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-900/5 transition-all flex flex-col items-center justify-center gap-2 font-bold text-xs group"
                              >
                                  <div
                                      class="p-2 bg-slate-900 rounded-full group-hover:scale-110 transition-transform border border-slate-800"
                                  >
                                      ${icons.plusCircle}
                                  </div>
                                  Add New Rule
                              </button>
                          </div>
                      `}
            </div>
        </div>
    `;
};
