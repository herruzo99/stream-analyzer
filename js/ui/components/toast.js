import { dom } from '../../core/state.js';
import { eventBus } from '../../core/event-bus.js';

/**
 * Displays a transient toast notification.
 * @param {object} options
 * @param {string} options.message - The message to display.
 * @param {'info' | 'pass' | 'warn' | 'fail'} options.type - The message type.
 * @param {number} [options.duration=4000] - The duration in ms to show the toast.
 */
export function showToast({ message, type, duration = 4000 }) {
    if (!dom.toastContainer) return;

    const toast = document.createElement('div');
    const colors = {
        pass: 'bg-green-600 border-green-500',
        fail: 'bg-red-600 border-red-500',
        warn: 'bg-yellow-600 border-yellow-500',
        info: 'bg-blue-600 border-blue-500',
    };
    toast.className = `p-4 rounded-lg border text-white shadow-lg transition-all duration-300 ease-in-out transform translate-x-full opacity-0 ${colors[type]}`;
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);

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

/**
 * Initializes the toast manager by subscribing to the global status update event.
 */
export function initializeToastManager() {
    eventBus.subscribe('ui:show-status', showToast);
}