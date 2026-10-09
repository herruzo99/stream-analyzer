import { eventBus } from '@/application/event-bus';

let toastContainer;

/**
 * Initializes the toast manager by setting the container element.
 * @param {object} dom - The application's DOM context.
 */
export function initializeToastManager(dom) {
    toastContainer = dom.toastContainer;
    eventBus.subscribe('ui:show-status', showToast);
}

/**
 * Displays a transient toast notification.
 * @param {object} options
 * @param {string} options.message - The message to display.
 * @param {'info' | 'pass' | 'warn' | 'fail'} options.type - The message type.
 * @param {number} [options.duration=4000] - The duration in ms to show the toast.
 */
export function showToast({ message, type, duration = 4000 }) {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    const colors = {
        pass: 'bg-emerald-500 border-emerald-500',
        fail: 'bg-red-500 border-red-500',
        warn: 'bg-amber-500 border-amber-500',
        info: 'bg-blue-500 border-blue-500',
    };
    toast.className = `p-4 rounded-lg border text-slate-100 shadow-lg transition-all duration-300 ease-in-out transform translate-x-full opacity-0 ${colors[type]}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
    }, 10);

    // Set timer to animate out and remove
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-8');
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}
