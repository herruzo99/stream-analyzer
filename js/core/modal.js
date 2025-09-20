import { dom } from '../core/state.js';

export function initializeModal() {
    dom.closeModalBtn.addEventListener('click', () => {
        const modalContent = dom.segmentModal.querySelector('div');
        dom.segmentModal.classList.add('opacity-0', 'invisible');
        dom.segmentModal.classList.remove('opacity-100', 'visible');
        modalContent.classList.add('scale-95');
        modalContent.classList.remove('scale-100');
    });
}