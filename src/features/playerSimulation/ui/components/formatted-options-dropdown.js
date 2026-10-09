import '@/ui/core/BaseDropdown.js';
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
        <base-dropdown class="w-80 max-h-[60vh]">
            <div class="p-2 space-y-1">
                ${options.map((option) => {
        const isActive = option.id === activeId;
        return html`
                        <button
                            @click=${(e) => handleSelect(option, e)}
                            class="group w-full text-left p-3 rounded-lg transition-all duration-200 border ${isActive
                ? 'bg-blue-500 border-blue-500 shadow-md shadow-[#3b82f6]'
                : 'bg-transparent border-transparent hover:bg-slate-800 hover:border-slate-800'}"
                        >
                            <div class="flex items-start gap-3">
                                <div
                                    class="shrink-0 mt-0.5 ${isActive
                ? 'text-slate-100'
                : 'text-slate-400 group-hover:text-slate-400'}"
                                >
                                    ${isActive ? icons.radio : icons.circle}
                                </div>
                                <div>
                                    <div
                                        class="font-bold text-sm ${isActive
                ? 'text-slate-100'
                : 'text-slate-100'}"
                                    >
                                        ${option.label}
                                    </div>
                                    ${option.description
                ? html`
                                              <div
                                                  class="text-xs mt-1 leading-relaxed ${isActive
                        ? 'text-slate-100'
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
        </base-dropdown>
    `;
};
