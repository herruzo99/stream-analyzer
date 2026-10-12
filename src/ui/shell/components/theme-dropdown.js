import { uiActions, useUiStore } from '@/state/uiStore';
import { closeDropdown } from '@/ui/services/dropdownService';
import { THEMES } from '@/ui/themes';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

import '@/ui/core/BaseDropdown.js';


export const themeDropdownTemplate = () => {
    const { theme: currentThemeId } = useUiStore.getState();

    // Determine the resolved system theme for highlighting
    let resolvedSystemTheme = null;
    if (currentThemeId === 'system') {
        const isDark = window.matchMedia(
            '(prefers-color-scheme: dark)'
        ).matches;
        resolvedSystemTheme = isDark ? 'standard-dark' : 'standard-light';
    }

    const themeCategories = [
        {
            title: 'Light & Clean',
            themes: ['light-executive', 'lavender-mist', 'ink-parchment'],
        },
        {
            title: 'Dark & Focused',
            themes: ['obsidian-amber', 'oled-dark'],
        },
        {
            title: 'Vibrant & Bold',
            themes: [
                'cyberpunk',
                'neon-daydream',
                'midnight-mint',
                'forest-whisper',
                'crimson-tide',
            ],
        },
        {
            title: 'Mixed Contrast',
            themes: ['arctic-night', 'solar-flare', 'eclipse', 'storm-cloud'],
        },
    ];

    const renderThemeButton = (id, label, subLabel = '') => {
        const theme = THEMES[id];
        if (!theme && id !== 'system') return '';

        const isActive = currentThemeId === id;
        const isSystemResolved = resolvedSystemTheme === id && id !== 'system';

        // Construct inline styles for the button to preview the theme
        let style = '';
        if (theme) {
            style = Object.entries(theme.colors)
                .map(([key, value]) => `${key}: ${value};`)
                .join(' ');
        }

        let borderClass =
            'border border-transparent hover:border-[var(--primary-accent)]/30 hover:scale-[1.02]';
        let bgClass = 'bg-[var(--bg-glass-B-5)]';
        let shadowClass = 'shadow-sm hover:shadow-md';

        if (isActive) {
            borderClass =
                'border-2 border-[var(--primary-accent)] shadow-[0_0_15px_var(--primary-accent-glow)]/20 scale-[1.02] ring-1 ring-[var(--primary-accent)]/20';
            bgClass = 'bg-[var(--bg-glass-B-5)]';
            shadowClass = 'shadow-lg';
        } else if (isSystemResolved) {
            borderClass = 'border border-[var(--primary-accent)]/50 shadow-sm';
        }

        return html`
            <button
                @click=${() => {
                uiActions.setTheme(id);
                closeDropdown();
            }}
                style="${style}"
                class="w-full flex flex-col gap-2 p-2 rounded-lg transition-all duration-300 group relative overflow-hidden
                       ${bgClass} ${shadowClass} ring-1 ring-transparent hover:ring-[var(--primary-accent)]/20
                       ${borderClass}"
            >
                <!-- Theme Preview Card -->
                <div
                    class="relative w-full h-10 rounded-md overflow-hidden border border-[var(--border-on-A)]/30 shadow-sm"
                >
                    <!-- Main background -->
                    <div
                        class="absolute inset-0 bg-[var(--bg-surface-A-main)]"
                    ></div>

                    <!-- Panel overlay (left side) -->
                    <div
                        class="absolute left-0 top-0 bottom-0 w-1/3 bg-[var(--bg-surface-B-panel-opaque)] border-r border-[var(--border-on-A)]/30 shadow-[2px_0_8px_rgba(0,0,0,0.1)] z-10"
                    ></div>

                    <!-- Text samples on panel (Surface B -> text-on-B) -->
                    <div class="absolute left-1 top-1 flex flex-col gap-0.5">
                        <div
                            class="w-3 h-0.5 bg-[var(--text-on-B-primary)] rounded-full opacity-90"
                        ></div>
                        <div
                            class="w-2 h-0.5 bg-[var(--text-on-B-secondary)] rounded-full opacity-70"
                        ></div>
                    </div>

                    <!-- Text samples on main area (Surface A -> text-on-A) -->
                    <div
                        class="absolute left-1/3 top-1 ml-1 flex flex-col gap-0.5"
                    >
                        <div
                            class="w-6 h-0.5 bg-[var(--text-on-A-primary)] rounded-full opacity-90"
                        ></div>
                        <div
                            class="w-4 h-0.5 bg-[var(--text-on-A-secondary)] rounded-full opacity-70"
                        ></div>
                    </div>

                    <!-- Accent colors at bottom -->
                    <div class="absolute bottom-1 right-1 flex gap-0.5">
                        <div
                            class="w-1.5 h-1.5 rounded-full bg-[var(--primary-accent)] shadow-sm"
                        ></div>
                        <div
                            class="w-1.5 h-1.5 rounded-full bg-[var(--secondary-accent)] shadow-sm"
                        ></div>
                    </div>

                    <!-- Active indicator -->
                    ${isActive
                ? html`
                              <div
                                  class="absolute top-1 right-1 w-1.5 h-1.5 bg-[var(--primary-accent)] rounded-full shadow-[0_0_8px_var(--primary-accent)]"
                              ></div>
                          `
                : ''}

                    <!-- Glass Shine -->
                    <div
                        class="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    ></div>
                </div>

                <!-- Theme name -->
                <span
                    class="text-[12px] font-bold leading-tight text-center px-1 truncate w-full transition-colors
                    ${isActive
                ? 'text-[var(--primary-accent)] drop-shadow-[0_0_5px_var(--primary-accent-glow)]'
                : 'text-[var(--text-on-B-primary)]'}"
                >
                    ${label || theme.name}
                </span>
            </button>
        `;
    };



    // ... (rest of imports)



    return html`
        <base-dropdown class="w-[700px] max-h-[85vh]">
            <!-- Visual Fidelity Section (Sticky Header) -->
            <div slot="header" class="px-5 pt-5 pb-4 border-b border-[var(--border-on-B)]/20 bg-[var(--bg-glass-B-6)]">
                <div class="flex items-center justify-between mb-3 px-1">
                    <span class="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-on-B-secondary)]/80">Visual Experience</span>
                </div>
                
                ${(() => {
            const activeLayout = useUiStore.getState().shell.config.activeThemeId || 'prism-glass';
            const isGlass = activeLayout === 'prism-glass';

            return html`
                <div class="relative bg-[var(--bg-surface-B-panel-opaque)] rounded-xl p-1 flex border border-[var(--border-on-B)] shadow-inner">
                    <!-- Sliding Background -->
                    <div 
                        class="absolute top-1 bottom-1 rounded-lg bg-[var(--bg-surface-A-main)] shadow-sm transition-all duration-300 ease-out border border-[var(--border-on-A)]/50"
                        style="left: ${isGlass ? '4px' : '50%'}; width: calc(50% - 4px);"
                    ></div>

                    <!-- Option: Glass (Immersive) -->
                    <button
                        @click=${() => {
                    uiActions.setShellTheme('prism-glass');
                    closeDropdown();
                }}
                        class="relative z-10 flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-colors duration-200 group focus:outline-none"
                    >
                        <span class="${isGlass ? 'text-[var(--primary-accent)]' : 'text-[var(--text-on-B-secondary)] group-hover:text-[var(--text-on-B-primary)]'} transition-colors duration-200">
                           ${icons.layers}
                        </span>
                        <div class="flex flex-col items-start">
                            <span class="text-xs font-bold leading-none ${isGlass ? 'text-[var(--text-on-A-primary)]' : 'text-[var(--text-on-B-secondary)] group-hover:text-[var(--text-on-B-primary)]'} transition-colors">Glass</span>
                        </div>
                    </button>

                    <!-- Option: Solid (Accessible) -->
                    <button
                        @click=${() => {
                    uiActions.setShellTheme('pro-compact');
                    closeDropdown();
                }}
                        class="relative z-10 flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-colors duration-200 group focus:outline-none"
                    >
                        <span class="${!isGlass ? 'text-[var(--primary-accent)]' : 'text-[var(--text-on-B-secondary)] group-hover:text-[var(--text-on-B-primary)]'} transition-colors duration-200">
                            ${icons.maximize}
                        </span>
                        <div class="flex flex-col items-start">
                             <span class="text-xs font-bold leading-none ${!isGlass ? 'text-[var(--text-on-A-primary)]' : 'text-[var(--text-on-B-secondary)] group-hover:text-[var(--text-on-B-primary)]'} transition-colors">Solid</span>
                        </div>
                    </button>
                </div>
                
                <!-- Helper Text -->
                <div class="mt-2 text-center">
                    <p class="text-[9px] text-[var(--text-on-B-secondary)] opacity-70">
                        ${isGlass ? 'Standard interface with transparency and motion effects.' : 'High-contrast opaque interface. Removes blur & transparency.'}
                    </p>
                </div>
            `;
        })()}
            </div>

            <div class="p-5 space-y-5">
                <div
                    class="px-1 pb-2 border-b border-[var(--border-on-B)]/20 flex justify-between items-center"
                >
                    <span
                        class="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-on-B-secondary)]/80"
                        >Color Theme</span
                    >
                </div>

                <!-- Top Row: System + Standard Themes -->
                <div class="grid grid-cols-3 gap-4">
                    <!-- System Preference -->
                    <button
                        @click=${() => {
            uiActions.setTheme('system');
            closeDropdown();
        }}
                        class="w-full flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 group relative overflow-hidden
                               ${currentThemeId === 'system'
            ? 'bg-[var(--bg-glass-B-4)] border-2 border-[var(--primary-accent)] shadow-[0_0_15px_var(--primary-accent-glow)]/20'
            : 'bg-[var(--bg-glass-B-2)] hover:bg-[var(--bg-glass-B-3)] border border-transparent hover:border-[var(--primary-accent)]/30'}"
                    >
                        <div
                            class="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--bg-surface-B-panel)] to-[var(--bg-surface-B-panel-opaque)] shadow-md shrink-0 border border-[var(--border-on-B)] flex items-center justify-center text-[var(--text-on-B-secondary)] group-hover:text-[var(--primary-accent)] transition-colors"
                        >
                            ${icons.monitor}
                        </div>
                        <div class="flex flex-col items-start relative z-10">
                            <span
                                class="text-xs font-bold leading-tight ${currentThemeId ===
            'system'
            ? 'text-[var(--primary-accent)]'
            : 'text-[var(--text-on-B-primary)]'}"
                                >System</span
                            >
                            <span
                                class="text-[9px] text-[var(--text-on-B-secondary)] opacity-80"
                                >Auto-detect</span
                            >
                        </div>
                        ${currentThemeId === 'system'
            ? html`
                                  <div
                                      class="absolute right-3 w-1.5 h-1.5 bg-[var(--primary-accent)] rounded-full shadow-[0_0_8px_var(--primary-accent)]"
                                  ></div>
                              `
            : ''}
                    </button>

                    <!-- Standard Light -->
                    ${renderThemeButton('standard-light', 'Standard Light')}

                    <!-- Standard Dark -->
                    ${renderThemeButton('standard-dark', 'Standard Dark')}
                </div>

                <!-- 4-Column Grid for Categories -->
                <div class="grid grid-cols-4 gap-4 items-start">
                    ${themeCategories.map(
                (category) => html`
                            <div class="flex flex-col gap-3">
                                <!-- Category Header -->
                                <div
                                    class="px-1 py-1 border-b border-[var(--border-on-B)]/30 mb-1"
                                >
                                    <span
                                        class="text-[9px] font-bold uppercase tracking-wider text-[var(--text-on-B-secondary)] opacity-70"
                                    >
                                        ${category.title}
                                    </span>
                                </div>

                                <!-- Themes in Category -->
                                <div class="space-y-2">
                                    ${category.themes.map((id) =>
                    renderThemeButton(id, THEMES[id]?.name)
                )}
                                </div>
                            </div>
                        `
            )}
                </div>
            </div>
        </base-dropdown>
    `;
};
