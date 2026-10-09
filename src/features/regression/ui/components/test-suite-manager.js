import { testSuiteActions } from '@/state/testSuiteStore';
import { useUiStore } from '@/state/uiStore';
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
                class="dropdown-panel bg-[var(--bg-glass-B-6)] backdrop-blur-xl border border-[var(--border-on-B)] rounded-xl shadow-2xl w-80 ring-1 ring-black/50 flex flex-col max-h-[60vh]"
            >
                <!-- Search Header -->
                <div
                    class="p-3 border-b border-[var(--border-on-B)] bg-[var(--bg-surface-B-panel)] sticky top-0 z-10"
                >
                    <div class="relative">
                        <div
                            class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-on-B-secondary)] pointer-events-none scale-75"
                        >
                            ${icons.search}
                        </div>
                        <input
                            type="text"
                            placeholder="Find property..."
                            class="w-full bg-[var(--bg-surface-B-panel-opaque)] border border-[var(--border-on-B)] rounded-lg py-1.5 pl-8 pr-3 text-xs text-[var(--text-on-B-primary)] focus:border-[var(--primary-accent)] outline-none"
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
                                    class="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-on-B-secondary)] flex items-center gap-2"
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
                            ? 'bg-[var(--primary-accent)] text-white shadow-md'
                            : 'text-[var(--text-on-B-secondary)] hover:bg-[var(--bg-surface-B-panel)] hover:text-[var(--text-on-B-primary)]'}"
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
                              class="p-4 text-center text-[var(--text-on-B-secondary)] text-xs italic"
                          >
                              No matching properties.
                          </div>`
                : ''}

                    <!-- Custom Path Fallback -->
                    <div class="border-t border-[var(--border-on-B)] pt-2">
                        <button
                            @click=${(e) => {
                e.stopPropagation();
                onSelect(null);
                closeDropdown();
            }}
                            class="w-full text-left px-3 py-2 rounded-lg text-xs text-[var(--text-on-B-secondary)] hover:bg-[var(--bg-surface-B-panel)] hover:text-[var(--text-on-B-primary)] transition-colors flex items-center gap-2 border border-transparent hover:border-[var(--border-on-B)]"
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
                class="h-10 flex items-center px-4 bg-[var(--bg-surface-B-panel)] border border-[var(--border-on-B)] rounded-lg text-xs text-[var(--text-on-B-secondary)] italic select-none w-full"
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
                ? 'bg-[var(--color-success)]/20 text-[var(--color-success)] border-[var(--color-success)]/40 hover:bg-[var(--color-success)]/30 shadow-[0_0_10px_var(--color-success)]'
                : 'bg-[var(--color-error)]/20 text-[var(--color-error)] border-[var(--color-error)]/40 hover:bg-[var(--color-error)]/30 shadow-[0_0_10px_var(--color-error)]'}"
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
                    class="h-10 bg-[var(--bg-surface-B-panel)] border border-[var(--border-on-B)] hover:border-[var(--primary-accent)]/50 rounded-lg py-1.5 pl-4 pr-10 text-xs text-[var(--text-on-B-primary)] font-mono w-full focus:border-[var(--primary-accent)] focus:bg-[var(--primary-accent)]/5 focus:ring-1 focus:ring-[var(--primary-accent)] outline-none transition-all"
                    .value=${assert.value}
                    @input=${(e) => onUpdate(index, { value: e.target.value })}
                    step="any"
                />
                ${propDef?.unit
                ? html`<span
                          class="absolute right-3 text-[10px] text-[var(--text-on-B-secondary)] select-none font-bold group-focus-within/input:text-[var(--primary-accent)] transition-colors"
                          >${propDef.unit}</span
                      >`
                : ''}
            </div>
        `;
    } else {
        valueInput = html`
            <input
                type="text"
                class="h-10 bg-[var(--bg-surface-B-panel)] border border-[var(--border-on-B)] hover:border-[var(--primary-accent)]/50 rounded-lg py-1.5 px-4 text-xs text-[var(--text-on-B-primary)] font-mono w-full focus:border-[var(--primary-accent)] focus:bg-[var(--primary-accent)]/5 focus:ring-1 focus:ring-[var(--primary-accent)] outline-none transition-all placeholder-[var(--text-on-B-secondary)]/50"
                .value=${assert.value}
                placeholder="Expected Value..."
                @input=${(e) => onUpdate(index, { value: e.target.value })}
            />
        `;
    }

    // Row Styling Condition
    const rowBase = "layout-card flex flex-col transition-all hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:border-[var(--border-on-B)] hover:bg-[var(--bg-glass-B-3)] group animate-fadeIn relative";
    const rowStyle = isGlass
        ? "" // Glass: Let default flow, no border/bg overrides
        : "bg-[var(--bg-surface-B-panel)] border border-[var(--border-on-B)]";

    return html`
        <div class="${rowBase} ${rowStyle}">
            
            <!-- Header: Index, Category, Remove -->
            <div class="flex items-center justify-between p-3 border-b border-[var(--border-on-B)] bg-[var(--bg-surface-B-panel)]/30">
                <div class="flex items-center gap-3">
                    <span class="text-[10px] font-mono text-[var(--text-on-B-secondary)] opacity-50 select-none">
                        #${String(index + 1).padStart(2, '0')}
                    </span>
                    
                    <!-- Small Category Badge -->
                    <div class="flex items-center gap-2 pl-2 border-l border-[var(--border-on-B)]">
                        <span class="${category.color} scale-75">${category.icon}</span>
                        <span class="text-[10px] font-bold text-[var(--text-on-B-secondary)] uppercase tracking-wider opacity-80">
                            ${category.label}
                        </span>
                    </div>
                </div>

                <button
                    @click=${() => onRemove(index)}
                    class="p-1.5 text-[var(--text-on-B-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded-md transition-colors"
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
                        class="flex items-center justify-between w-full bg-[var(--bg-surface-B-panel)] border border-[var(--border-on-B)] hover:border-[var(--primary-accent)]/50 rounded-lg px-3 py-2 text-xs text-left transition-all shadow-inner group/btn hover:bg-[var(--bg-surface-B-panel-opaque)]"
                    >
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="text-[var(--text-on-B-secondary)] scale-75">${icons.search}</span>
                            <span class="text-[var(--text-on-B-primary)] font-bold truncate">
                                ${propDef ? propDef.label : assert.path || 'Select Property...'}
                            </span>
                        </div>
                        <span class="text-[var(--text-on-B-secondary)] group-hover/btn:text-[var(--text-on-B-primary)] scale-75 transition-colors">
                            ${icons.chevronDown}
                        </span>
                    </button>
                    ${!propDef
            ? html`<input
                              type="text"
                              class="mt-2 w-full bg-[var(--bg-surface-B-panel)] border border-[var(--border-on-B)] rounded-lg px-3 py-2 text-[10px] font-mono text-[var(--text-on-B-secondary)] focus:border-[var(--primary-accent)]/50 outline-none transition-colors"
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
                            class="w-full h-10 bg-[var(--bg-surface-B-panel)] border border-[var(--border-on-B)] hover:border-[var(--border-on-B)] rounded-lg px-3 text-xs text-[var(--text-on-B-primary)] appearance-none cursor-pointer focus:border-[var(--primary-accent)] outline-none transition-colors font-medium"
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
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-on-B-secondary)] pointer-events-none scale-75"
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

    const { shell } = useUiStore.getState();

    // Theme Logic
    const isGlass = shell.config.activeThemeId.includes('glass');
    const gridGap = isGlass ? 'gap-4' : 'gap-2';

    const emptyStateStyle = isGlass
        ? "bg-[var(--bg-glass-B-2)] border-2 border-dashed border-[var(--border-on-A)]"
        : "bg-[var(--bg-surface-B-panel)] border-2 border-dashed border-[var(--border-on-A)]";

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
        <div class="flex flex-col h-full bg-transparent">
            <!-- Editor Canvas -->
            <div class="h-full overflow-y-auto custom-scrollbar p-4">
                ${(suite.assertions || []).length === 0
            ? html`
                          <div
                              class="layout-card flex flex-col items-center justify-center h-full min-h-[400px] rounded-[var(--region-radius)] text-[var(--text-on-A-secondary)] group hover:border-[var(--primary-accent)]/30 hover:bg-[var(--bg-glass-B-3)] transition-all ${emptyStateStyle}"
                          >
                              <div
                                  class="p-6 bg-[var(--bg-surface-B-panel)] rounded-full mb-6 shadow-2xl group-hover:scale-110 transition-transform duration-500"
                              >
                                  ${icons.beaker}
                              </div>
                              <h3
                                  class="text-[var(--text-on-A-primary)] font-bold mb-2 text-lg"
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
                                  class="px-8 py-3 bg-[var(--primary-accent)] hover:bg-[var(--primary-accent-hover)] text-white text-sm font-bold rounded-xl shadow-[0_0_20px_var(--primary-accent-glow)] hover:shadow-[0_0_30px_var(--primary-accent-glow)] transition-all flex items-center gap-3 hover:-translate-y-1"
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
                                  class="h-full min-h-[140px] border-2 border-dashed border-[var(--border-on-A)] rounded-[var(--region-radius)] text-[var(--text-on-A-secondary)] hover:text-[var(--primary-accent)] hover:border-[var(--primary-accent)]/30 hover:bg-[var(--primary-accent)]/[0.02] transition-all flex flex-col items-center justify-center gap-3 font-bold text-xs group"
                              >
                                  <div
                                      class="p-3 bg-[var(--bg-surface-B-panel)] rounded-full group-hover:scale-110 transition-transform border border-[var(--border-on-B)] group-hover:border-[var(--primary-accent)]/20 group-hover:bg-[var(--primary-accent)]/10"
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
