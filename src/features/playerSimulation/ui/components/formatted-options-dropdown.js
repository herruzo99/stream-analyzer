import { html } from 'lit-html';
import { closeDropdown } from '@/ui/services/dropdownService';
import { tooltipTriggerClasses } from '@/ui/shared/constants';

/**
 * Renders a single option card within the dropdown.
 * @param {object} params
 * @param {string} params.label - Primary text.
 * @param {string} [params.description] - Secondary text.
 * @param {boolean} params.isActive - Visual active state.
 * @param {Function} params.onClick - Click handler.
 */
const optionCardTemplate = ({ label, description, isActive, onClick }) => {
    const activeClasses = 'bg-blue-800 border-blue-600 ring-2 ring-blue-500';
    const baseClasses =
        'bg-gray-900/50 p-3 rounded-lg border border-gray-700 cursor-pointer transition-all duration-150 ease-in-out text-left w-full';
    const hoverClasses = 'hover:bg-gray-700 hover:border-gray-500';

    return html`
        <button
            class="${baseClasses} ${hoverClasses} ${isActive
                ? activeClasses
                : ''}"
            @click=${(e) => onClick(e)}
            data-tooltip=${description || ''}
        >
            <div class="flex justify-between items-center">
                <span
                    class="font-semibold text-gray-200 truncate ${description
                        ? tooltipTriggerClasses
                        : ''}"
                    >${label}</span
                >
                ${isActive
                    ? html`<span
                          class="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white shrink-0 ml-2"
                          >ACTIVE</span
                      >`
                    : ''}
            </div>
            ${description
                ? html`<div
                      class="text-xs text-gray-400 mt-1 whitespace-normal"
                  >
                      ${description}
                  </div>`
                : ''}
        </button>
    `;
};

/**
 * A generic dropdown panel for selecting from a list of formatted options.
 * @param {Array<{id: string|number, label: string, description?: string}>} options - The list of options to display.
 * @param {string|number|null} activeId - The ID of the currently active option.
 * @param {(option: object, event: MouseEvent) => void} onSelect - Callback function when an option is selected.
 * @returns {import('lit-html').TemplateResult}
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
            class="dropdown-panel bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-80 p-2 space-y-2 max-h-[60vh] overflow-y-auto"
        >
            ${options.map((option) =>
                optionCardTemplate({
                    label: option.label,
                    description: option.description,
                    isActive: option.id === activeId,
                    onClick: (e) => handleSelect(option, e),
                })
            )}
        </div>
    `;
};