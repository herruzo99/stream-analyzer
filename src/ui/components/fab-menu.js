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
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-bold transition-all ${item.isActive ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-400/25' : 'text-slate-300 border border-transparent hover:bg-white/5 hover:border-white/10'}"
    >
        <span class="shrink-0">${iconFor(item.icon)}</span>
        <span class="grow text-left">${item.label}</span>
        ${item.isActive
            ? html`<span
                  class="w-1.5 h-1.5 rounded-full bg-emerald-500/10"
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
                      class="w-64 rounded-md border border-white/10 bg-white/5 p-2 space-y-1 animate-scaleIn origin-bottom-right max-h-[60vh] overflow-y-auto custom-scrollbar"
                  >
                      ${contextItems.length > 0
                          ? html`
                                <div class="pb-1 mb-1 border-b border-white/10">
                                    ${contextItems.map(menuItem)}
                                </div>
                            `
                          : ''}
                      ${permanentItems.map(menuItem)}
                      ${sideItems.length > 0
                          ? html`
                                <div class="pt-1 mt-1 border-t border-white/10">
                                    <button
                                        @click=${() => onSideToggle?.()}
                                        class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[10px] font-bold text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
                                    >
                                        <span
                                            class="transition-transform ${isSideMenuOpen ? 'rotate-180' : ''}"
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
            class="w-12 h-12 rounded-full bg-emerald-500/10 hover:bg-emerald-500/10 text-white flex items-center justify-center transition-all active:scale-95"
            aria-label="Comparison options"
            title="Comparison options"
        >
            ${icons.slidersHorizontal}
        </button>
    </div>
`;
