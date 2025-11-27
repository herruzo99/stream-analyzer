import * as icons from '@/ui/icons';
import { closeDropdown } from '@/ui/services/dropdownService';
import { html } from 'lit-html';

/**
 * A generic, styled dropdown for selecting options with descriptions.
 * @param {Array<{id: any, label: string, description?: string}>} options
 * @param {any} activeId
 * @param {(option: any, event: Event) => void} onSelect
 */
export const formattedOptionsDropdownTemplate = (
    options,
    activeId,
    onSelect
) => {
    const handleSelect = (option, event) => {
        onSelect(option, event);
        closeDropdown();
    };

    return html`
        <div
            class="dropdown-panel bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-80 p-2 space-y-1 ring-1 ring-black/50 max-h-[60vh] overflow-y-auto custom-scrollbar"
        >
            ${options.map((option) => {
                const isActive = option.id === activeId;
                return html`
                    <button
                        @click=${(e) => handleSelect(option, e)}
                        class="group w-full text-left p-3 rounded-lg transition-all duration-200 border ${isActive
                            ? 'bg-blue-600 border-blue-500 shadow-md shadow-blue-900/20'
                            : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'}"
                    >
                        <div class="flex items-start gap-3">
                            <div
                                class="shrink-0 mt-0.5 ${isActive
                                    ? 'text-white'
                                    : 'text-slate-500 group-hover:text-slate-400'}"
                            >
                                ${isActive ? icons.radio : icons.circle}
                            </div>
                            <div>
                                <div
                                    class="font-bold text-sm ${isActive
                                        ? 'text-white'
                                        : 'text-slate-200'}"
                                >
                                    ${option.label}
                                </div>
                                ${option.description
                                    ? html`
                                          <div
                                              class="text-xs mt-1 leading-relaxed ${isActive
                                                  ? 'text-blue-100'
                                                  : 'text-slate-400'}"
                                          >
                                              ${option.description}
                                          </div>
                                      `
                                    : ''}
                            </div>
                        </div>
                    </button>
                `;
            })}
        </div>
    `;
};
