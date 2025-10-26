import { html, render } from 'lit-html';
import { resetApplicationState } from '@/application/use_cases/resetApplicationState';
import { useMemoryStore } from '@/state/memoryStore';
import { toggleDropdown, closeDropdown } from '@/ui/services/dropdownService';
import * as icons from '@/ui/icons';

let container = null;
let memoryUnsubscribe = null;

function formatBytes(bytes) {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return 'N/A';
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${['B', 'KB', 'MB', 'GB'][i]}`;
}

const progressBarTemplate = ({ used, total, label }) => {
    const percentage = total > 0 ? (used / total) * 100 : 0;
    let colorClass = 'bg-blue-500';
    if (percentage > 85) {
        colorClass = 'bg-red-500';
    } else if (percentage > 65) {
        colorClass = 'bg-yellow-500';
    }

    return html`
        <div>
            <div class="flex justify-between items-baseline text-xs mb-1">
                <span class="font-semibold text-gray-400">${label}</span>
                <span class="font-mono text-gray-500"
                    >${formatBytes(used)} / ${formatBytes(total)}</span
                >
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2.5">
                <div
                    class="${colorClass} h-2.5 rounded-full"
                    style="width: ${percentage}%"
                ></div>
            </div>
        </div>
    `;
};

const appStateBreakdownTemplate = (appState) => html`
    <div
        class="text-xs text-gray-500 space-y-1 mt-2 pl-2 border-l border-gray-600"
    >
        <div class="flex justify-between">
            <span>Segment Cache Index:</span>
            <span>${formatBytes(appState.segmentCacheIndex)}</span>
        </div>
        <div class="flex justify-between">
            <span>Analysis State:</span>
            <span>${formatBytes(appState.analysis)}</span>
        </div>
        <div class="flex justify-between">
            <span>UI State:</span> <span>${formatBytes(appState.ui)}</span>
        </div>
        <div class="flex justify-between">
            <span>Network Log:</span>
            <span>${formatBytes(appState.network)}</span>
        </div>
        <div class="flex justify-between">
            <span>Player State:</span>
            <span>${formatBytes(appState.player)}</span>
        </div>
        <div class="flex justify-between">
            <span>Decryption Keys:</span>
            <span>${formatBytes(appState.decryption)}</span>
        </div>
    </div>
`;

const handleClearCache = () => {
    if (
        confirm(
            'Are you sure you want to clear all cached data and reset the application? This will not affect your saved presets.'
        )
    ) {
        resetApplicationState();
        closeDropdown();
    }
};

const memoryDropdownPanelTemplate = (report, isPerformanceApiSupported) => {
    if (!report) {
        return html`<div
            class="dropdown-panel bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-80 p-4 text-xs text-gray-500"
        >
            Calculating...
        </div>`;
    }

    return html`
        <div
            class="dropdown-panel bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-80 p-4 space-y-4"
        >
            ${isPerformanceApiSupported && report.jsHeap
                ? progressBarTemplate({
                      used: report.jsHeap.used,
                      total: report.jsHeap.limit,
                      label: 'JS Heap',
                  })
                : html`<div class="text-xs text-gray-500 italic">
                      Browser does not support JS Heap reporting.
                  </div>`}
            ${progressBarTemplate({
                used: report.segmentCache,
                total: 256 * 1024 * 1024, // Assume a reasonable "total" of 256MB for visualization
                label: 'Segment Cache',
            })}

            <div>
                ${progressBarTemplate({
                    used: report.appState.total,
                    total: 50 * 1024 * 1024, // Assume a reasonable "total" of 50MB for state
                    label: 'Application State',
                })}
                ${appStateBreakdownTemplate(report.appState)}
            </div>

            <button
                @click=${handleClearCache}
                class="w-full text-center text-xs bg-red-800 hover:bg-red-700 text-red-200 font-bold py-2 px-3 rounded-md transition-colors mt-2"
            >
                Clear All Cached Data
            </button>
        </div>
    `;
};

function renderMemoryMonitor() {
    if (!container) return;

    const { report, isPerformanceApiSupported } = useMemoryStore.getState();

    let summaryText = 'Calculating...';
    if (report) {
        if (isPerformanceApiSupported && report.jsHeap) {
            summaryText = `JS Heap: ${formatBytes(report.jsHeap.used)}`;
        } else {
            const totalAppMemory = report.segmentCache + report.appState.total;
            summaryText = `App Memory: ${formatBytes(totalAppMemory)}`;
        }
    }

    const triggerTemplate = html`
        <button
            @click=${(e) =>
                toggleDropdown(
                    e.currentTarget,
                    memoryDropdownPanelTemplate(
                        report,
                        isPerformanceApiSupported
                    )
                )}
            class="w-full flex items-center justify-between text-left text-xs text-gray-400 hover:bg-gray-700/50 p-2 rounded-md transition-colors"
        >
            <span class="font-mono">${summaryText}</span>
            <span class="text-gray-500">${icons.chevronDown}</span>
        </button>
    `;

    render(triggerTemplate, container);
}

export const memoryMonitorView = {
    mount(containerElement) {
        container = containerElement;
        if (memoryUnsubscribe) memoryUnsubscribe();
        memoryUnsubscribe = useMemoryStore.subscribe(renderMemoryMonitor);
        renderMemoryMonitor();
    },
    unmount() {
        if (memoryUnsubscribe) memoryUnsubscribe();
        memoryUnsubscribe = null;
        if (container) render(html``, container);
        container = null;
    },
};
