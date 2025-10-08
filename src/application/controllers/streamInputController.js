import { eventBus } from '@/application/event-bus.js';
import { analysisActions } from '@/state/analysisStore.js';

export function initializeStreamInputController() {
    eventBus.subscribe('ui:stream-input:populate-from-preset', (payload) => {
        // This is a more complex interaction that requires direct DOM manipulation for now
        // to avoid re-rendering the whole input list and losing focus.
        // A future refactor could move the input values into a store.
        const { id, url, name } = payload;
        const group = document.querySelector(`[data-id="${id}"]`);
        if (group) {
            const urlInput = /** @type {HTMLInputElement | null} */ (
                group.querySelector('.input-url')
            );
            const nameInput = /** @type {HTMLInputElement | null} */ (
                group.querySelector('.input-name')
            );
            const fileInput = /** @type {HTMLInputElement | null} */ (
                group.querySelector('.input-file')
            );

            if (urlInput) urlInput.value = url;
            if (nameInput) nameInput.value = name;
            if (fileInput) fileInput.value = '';

            urlInput.dispatchEvent(new Event('input', { bubbles: true }));

            const dropdown = group.querySelector('.preset-dropdown');
            if (dropdown) dropdown.classList.add('hidden');
        }
    });

    eventBus.subscribe('ui:stream-input:remove-requested', ({ id }) => {
        analysisActions.removeStreamInputId(id);
    });
}