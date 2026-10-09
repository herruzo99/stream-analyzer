/**
 * fabMenuTemplate — mobile floating config menu for the comparison view.
 *
 * Reconstructed for the port (imported but never committed). Contract,
 * derived from the comparison view call site:
 *   fabMenuTemplate({ contextItems, permanentItems, isOpen, activeSubMenu,
 *     onToggle, onSubMenuChange, isSideMenuOpen, onSideToggle, sideItems })
 * Items: { id, label, icon (icon-name string), isActive?, onClick }.
 * Open/close state lives in uiStore (fabMenu, fabSideMenuOpen); this
 * template is purely presentational.
 */
import { html } from 'lit-html';
import * as icons from '@/ui/icons';

const iconFor = (name) => icons[name] || icons.wrench;

const menuItem = (item) => html`
    <button
        @click=${() => {
            item.onClick?.();
        }}
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${item.isActive
            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
            : 'text-slate-300 border border-transparent hover:bg-slate-800 hover:border-slate-700'}"
    >
        <span class="shrink-0">${iconFor(item.icon)}</span>
        <span class="grow text-left">${item.label}</span>
        ${item.isActive
            ? html`<span
                  class="w-1.5 h-1.5 rounded-full bg-blue-400"
              ></span>`
            : ''}
    </button>
`;

// Note: callers also pass activeSubMenu/onSubMenuChange (submenu
// selection state lives in uiStore and is read via isSideMenuOpen);
// extra props are accepted and ignored.
/**
 * @param {object} [opts]
 * @param {any[]} [opts.contextItems]
 * @param {any[]} [opts.permanentItems]
 * @param {boolean} [opts.isOpen]
 * @param {string|null} [opts.activeSubMenu] Accepted for call-site compatibility.
 * @param {Function|null} [opts.onToggle]
 * @param {Function|null} [opts.onSubMenuChange] Accepted for call-site compatibility.
 * @param {boolean} [opts.isSideMenuOpen]
 * @param {Function|null} [opts.onSideToggle]
 * @param {any[]} [opts.sideItems]
 */
export const fabMenuTemplate = ({
    contextItems = [],
    permanentItems = [],
    isOpen = false,
    onToggle = null,
    isSideMenuOpen = false,
    onSideToggle = null,
    sideItems = [],
} = {}) => html`
    <div class="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-2">
        ${isOpen
            ? html`
                  <div
                      class="w-64 rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-2 space-y-1 animate-scaleIn origin-bottom-right max-h-[60vh] overflow-y-auto custom-scrollbar"
                  >
                      ${contextItems.length > 0
                          ? html`
                                <div class="pb-1 mb-1 border-b border-slate-800">
                                    ${contextItems.map(menuItem)}
                                </div>
                            `
                          : ''}
                      ${permanentItems.map(menuItem)}
                      ${sideItems.length > 0
                          ? html`
                                <div class="pt-1 mt-1 border-t border-slate-800">
                                    <button
                                        @click=${() => onSideToggle?.()}
                                        class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
                                    >
                                        <span
                                            class="transition-transform ${isSideMenuOpen
                                                ? 'rotate-180'
                                                : ''}"
                                            >${icons.chevronDown}</span
                                        >
                                        Display options
                                    </button>
                                    ${isSideMenuOpen
                                        ? html`<div class="mt-1 space-y-1">
                                              ${sideItems.map(menuItem)}
                                          </div>`
                                        : ''}
                                </div>
                            `
                          : ''}
                  </div>
              `
            : ''}
        <button
            @click=${() => onToggle?.()}
            class="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-400 text-white shadow-[0_0_25px_rgba(59,130,246,0.45)] flex items-center justify-center transition-all active:scale-95"
            aria-label="Comparison options"
            title="Comparison options"
        >
            ${icons.slidersHorizontal}
        </button>
    </div>
`;
