import { html } from 'lit-html';

export function handleCommentHover(e) {
    const card = /** @type {HTMLElement} */ (e.currentTarget);
    const locationId = card.dataset.locationId;
    document
        .querySelectorAll('.compliance-highlight')
        .forEach((el) =>
            el.classList.remove(
                'bg-purple-500/30',
                'outline',
                'outline-1',
                'outline-purple-400',
                '-outline-offset-1'
            )
        );
    const target = document.getElementById(locationId);
    if (target) {
        target.classList.add(
            'bg-purple-500/30',
            'outline',
            'outline-1',
            'outline-purple-400',
            '-outline-offset-1'
        );
    }
}

export function handleCommentLeave() {
    document
        .querySelectorAll('.compliance-highlight')
        .forEach((el) =>
            el.classList.remove(
                'bg-purple-500/30',
                'outline',
                'outline-1',
                'outline-purple-400',
                '-outline-offset-1'
            )
        );
}

export function handleCommentClick(e) {
    const card = /** @type {HTMLElement} */ (e.currentTarget);
    const locationId = card.dataset.locationId;
    const target = document.getElementById(locationId);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

const commentCard = (result) => {
    const statusClasses = {
        fail: 'border-red-500',
        warn: 'border-yellow-500',
        pass: 'border-green-500',
        info: 'border-blue-500',
    };

    const locationId = result.location.path
        ? `loc-path-${result.location.path.replace(/[\[\].]/g, '-')}`
        : `loc-line-${result.location.startLine}`;

    return html`
        <div
            class="compliance-comment-card bg-gray-800 p-3 rounded-lg border-l-4 ${statusClasses[
                result.status
            ]} status-${result.status} cursor-pointer hover:bg-gray-700/50"
            data-location-id="${locationId}"
            @mouseover=${handleCommentHover}
            @mouseleave=${handleCommentLeave}
            @click=${handleCommentClick}
        >
            <p class="font-semibold text-sm text-gray-200">
                ${result.location.startLine
                    ? html`<span class="text-xs text-gray-500 mr-2"
                          >L${result.location.startLine}</span
                      >`
                    : ''}
                ${result.text}
            </p>
            <p class="text-xs text-gray-400 mt-1">${result.details}</p>
            <p class="text-xs text-gray-500 font-mono mt-2">${result.isoRef}</p>
        </div>
    `;
};

export const sidebarTemplate = (
    complianceResults,
    activeFilter,
    onFilterClick
) => {
    const counts = {
        pass: 0,
        warn: 0,
        fail: 0,
        info: 0,
        all: complianceResults.length,
    };
    complianceResults.forEach(
        (r) => (counts[r.status] = (counts[r.status] || 0) + 1)
    );

    const filteredResults =
        activeFilter === 'all'
            ? complianceResults
            : complianceResults.filter((r) => r.status === activeFilter);

    const filterButton = (filter, label, count) =>
        html` <button
            class="px-3 py-1 rounded-full text-xs transition-colors duration-200 ${activeFilter ===
            filter
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-gray-700 text-gray-300'}"
            data-filter="${filter}"
            @click=${() => onFilterClick(filter)}
        >
            ${label} (${count})
        </button>`;

    return html`
        <!-- FIX: Filter bar is now a non-growing element -->
        <div
            class="compliance-filter-bar flex-shrink-0 flex items-center gap-2 mb-4 p-2 bg-gray-900/50 rounded-md sticky top-0 z-20 border-b border-gray-700"
        >
            ${filterButton('all', 'All', counts.all)}
            ${filterButton('fail', 'Errors', counts.fail)}
            ${filterButton('warn', 'Warnings', counts.warn)}
        </div>
        <!-- FIX: This list container now grows to fill space and scrolls independently -->
        <div class="space-y-2 flex-grow min-h-0 overflow-y-auto">
            ${filteredResults.map(commentCard)}
        </div>
    `;
};
