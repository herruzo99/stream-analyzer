import { html, render } from 'lit-html';
import { resetApplicationState } from '@/application/use_cases/resetApplicationState';

let container = null;
let intervalId = null;
let memoryState = {
    isSupported: 'memory' in performance,
    usedJSHeapSize: 0,
    jsHeapSizeLimit: 0,
};

function updateMemoryUsage() {
    if (memoryState.isSupported) {
        const memoryInfo = /** @type {any} */ (performance).memory;
        memoryState.usedJSHeapSize = memoryInfo.usedJSHeapSize;
        memoryState.jsHeapSizeLimit = memoryInfo.jsHeapSizeLimit;
    }
    renderMemoryMonitor();
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${
        ['B', 'KB', 'MB', 'GB'][i]
    }`;
}

const handleClearCache = () => {
    if (
        confirm(
            'Are you sure you want to clear all cached data and reset the application? This will not affect your saved presets.'
        )
    ) {
        resetApplicationState();
    }
};

const memoryMonitorTemplate = () => {
    if (!memoryState.isSupported) {
        return html`<div class="text-xs text-gray-500">
            Memory API not supported.
        </div>`;
    }

    const usagePercentage =
        (memoryState.usedJSHeapSize / memoryState.jsHeapSizeLimit) * 100;

    return html`
        <div class="space-y-3">
            <div>
                <div class="flex justify-between items-baseline text-xs mb-1">
                    <span class="font-semibold text-gray-400"
                        >JS Heap Memory</span
                    >
                    <span class="font-mono text-gray-500"
                        >${formatBytes(
                            memoryState.usedJSHeapSize
                        )}
                        / ${formatBytes(memoryState.jsHeapSizeLimit)}</span
                    >
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2">
                    <div
                        class="bg-blue-500 h-2 rounded-full"
                        style="width: ${usagePercentage}%"
                    ></div>
                </div>
            </div>
            <button
                @click=${handleClearCache}
                class="w-full text-center text-xs bg-red-800 hover:bg-red-700 text-red-200 font-bold py-2 px-3 rounded-md transition-colors"
            >
                Clear Cache & Data
            </button>
        </div>
    `;
};

function renderMemoryMonitor() {
    if (container) {
        render(memoryMonitorTemplate(), container);
    }
}

export const memoryMonitorView = {
    mount(containerElement) {
        container = containerElement;
        updateMemoryUsage();
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(updateMemoryUsage, 2000);
    },
    unmount() {
        if (intervalId) clearInterval(intervalId);
        intervalId = null;
        if (container) render(html``, container);
        container = null;
    },
};