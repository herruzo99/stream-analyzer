import { html } from 'lit-html';
import { tooltipTriggerClasses } from '@/ui/shared/constants';

export const statCardTemplate = ({
    label,
    value,
    tooltip,
    isoRef = null,
    isCode = true,
}) => {
    if (value === null || value === undefined || value === '') return '';
    const valueClass = isCode ? 'font-mono' : 'font-sans';
    return html`
        <div class="bg-gray-800 p-3 rounded-lg border border-gray-700">
            <dt
                class="text-xs font-medium text-gray-400 ${tooltipTriggerClasses}"
                data-tooltip="${tooltip}"
                data-iso="${isoRef || ''}"
            >
                ${label}
            </dt>
            <dd
                class="text-base text-left text-white mt-1 break-words ${valueClass}"
            >
                ${value}
            </dd>
        </div>
    `;
};

export const listCardTemplate = ({ label, items, tooltip, isoRef = null }) => {
    if (!items || items.length === 0) return '';
    return html`
        <div class="bg-gray-800 p-3 rounded-lg border border-gray-700">
            <dt
                class="text-xs font-medium text-gray-400 ${tooltipTriggerClasses}"
                data-tooltip="${tooltip}"
                data-iso="${isoRef || ''}"
            >
                ${label}
            </dt>
            <dd class="text-sm text-left font-mono text-white mt-2 space-y-1">
                ${items.map(
                    (item) =>
                        html`<div class="bg-gray-900/50 p-1 rounded">
                            ${item}
                        </div>`
                )}
            </dd>
        </div>
    `;
};

export const sectionTemplate = (title, content) => html`
    <div>
        <h3 class="text-xl font-bold mb-4">${title}</h3>
        <dl class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
            ${content}
        </dl>
    </div>
`;
