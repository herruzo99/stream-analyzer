export const THEMES = {
    'standard-dark': {
        name: 'Standard Dark',
        colors: {
            // Surface A: Main content area (darker)
            '--bg-surface-A-main': '#09090b', // zinc-950 (darker)
            '--bg-surface-A-elevated': '#18181b', // zinc-900

            // Surface B: Panels, sidebars (lighter than A)
            '--bg-surface-B-panel': 'rgba(24, 24, 27, 0.95)', // zinc-900/95
            '--bg-surface-B-panel-opaque': '#18181b', // zinc-900
            '--bg-surface-B-modal': 'rgba(24, 24, 27, 0.98)',

            // Text for Surface A (uses on-B colors = light text)
            '--text-on-B-primary': '#ffffff', // white
            '--text-on-B-secondary': '#a1a1aa', // zinc-400

            // Text for Surface B (uses on-A colors = lighter text)
            '--text-on-A-primary': '#ffffff', // white
            '--text-on-A-secondary': '#a1a1aa', // zinc-400

            // Borders
            '--border-on-A': 'rgba(255, 255, 255, 0.1)',
            '--border-on-B': 'rgba(255, 255, 255, 0.15)',

            // Universal (for accent backgrounds)
            '--text-on-accent': '#ffffff',
            '--border-on-accent': 'rgba(255, 255, 255, 0.1)',

            // Glass System (Surface B - pairs with --text-on-A)
            '--bg-glass-B-1': 'rgba(39, 39, 42, 0.10)',
            '--bg-glass-B-2': 'rgba(39, 39, 42, 0.30)',
            '--bg-glass-B-3': 'rgba(39, 39, 42, 0.40)',
            '--bg-glass-B-4': 'rgba(39, 39, 42, 0.50)',
            '--bg-glass-B-5': 'rgba(39, 39, 42, 0.60)',
            '--bg-glass-B-6': 'rgba(39, 39, 42, 0.85)', // Much more transparent

            // Glass System (Accent - Affinity Specific)
            // "on-A" = Designed to sit on Surface A (Main).
            // "on-B" = Designed to sit on Surface B (Panel).
            // In mixed themes (e.g. Eclipse), Surface A might be Dark while Surface B is Light.
            // These variables allow us to tune the accent glass color to ensure visibility on its specific background.
            '--bg-glass-accent-on-A-1': 'rgba(59, 130, 246, 0.10)',
            '--bg-glass-accent-on-A-2': 'rgba(59, 130, 246, 0.20)',
            '--bg-glass-accent-on-A-3': 'rgba(59, 130, 246, 0.30)',
            '--bg-glass-accent-on-B-1': 'rgba(59, 130, 246, 0.10)',
            '--bg-glass-accent-on-B-2': 'rgba(59, 130, 246, 0.20)',
            '--bg-glass-accent-on-B-3': 'rgba(59, 130, 246, 0.30)',

            // Accent colors (theme-agnostic)
            '--primary-accent': '#3b82f6', // blue-500
            '--primary-accent-hover': '#2563eb', // blue-600
            '--primary-accent-glow': 'rgba(59, 130, 246, 0.5)',
            '--secondary-accent': '#a855f7', // purple-500
            '--tertiary-accent': '#10b981', // emerald-500
            '--accent-gradient-from': '#3b82f6',
            '--accent-gradient-via': '#a855f7',
            '--accent-gradient-to': '#10b981',
            '--bg-ambient-accent-primary': '#3b82f6', // blue-500
            '--bg-ambient-accent-secondary': '#a855f7', // purple-500
            '--bg-ambient-accent-tertiary': '#10b981', // emerald-500

            // Status Colors (theme-agnostic)
            '--color-success': '#10b981', // emerald-500
            '--color-error': '#f43f5e', // rose-500
            '--color-warning': '#f59e0b', // amber-500
            '--color-info': '#06b6d4', // cyan-500

            // Chart Colors
            '--chart-1': '#3b82f6',
            '--chart-2': '#a855f7',
            '--chart-3': '#10b981',
            '--chart-4': '#f59e0b',
            '--chart-5': '#f43f5e',
            '--chart-6': '#06b6d4',
            '--chart-7': '#8b5cf6',
            '--chart-8': '#84cc16',
            '--chart-9': '#ec4899',
            '--chart-10': '#64748b',

            // Extended Chart Colors (11-31)
            '--chart-11': '#fb7185', // rose-400
            '--chart-12': '#22d3ee', // cyan-400
            '--chart-13': '#f472b6', // pink-400
            '--chart-14': '#9ca3af', // gray-400
            '--chart-15': '#a3e635', // lime-400
            '--chart-16': '#a78bfa', // violet-400
            '--chart-17': '#34d399', // emerald-400
            '--chart-18': '#60a5fa', // blue-400
            '--chart-19': '#fbbf24', // amber-400
            '--chart-20': '#c084fc', // purple-400
            '--chart-21': '#2dd4bf', // teal-400
            '--chart-22': '#fb923c', // orange-400
            '--chart-23': '#e11d48', // rose-600 (darker for contrast)
            '--chart-24': '#0891b2', // cyan-600
            '--chart-25': '#ef4444', // red-500
            '--chart-26': '#6366f1', // indigo-500
            '--chart-27': '#10b981', // green-500
            '--chart-28': '#3b82f6', // blue-500 (Input)
            '--chart-29': '#d946ef', // fuchsia-500 (Calc)
            '--chart-30': '#22c55e', // green-500 (Result)
            '--chart-31': '#eab308', // yellow-500 (Check)

            // Syntax Highlighting
            '--syntax-tag': '#c084fc',
            '--syntax-attr': '#34d399',
            '--syntax-string': '#fcd34d',
            '--syntax-number': '#7dd3fc',
            '--syntax-boolean': '#fb7185',
            '--syntax-comment': '#64748b',
            '--syntax-value': '#e4e4e7',
        },
    },
    'standard-light': {
        name: 'Standard Light',
        colors: {
            // Surface A: Main content area (lighter)
            '--bg-surface-A-main': '#ffffff', // white
            '--bg-surface-A-elevated': '#f8fafc', // slate-50

            // Surface B: Light panels (darker than A)
            '--bg-surface-B-panel': 'rgba(241, 245, 249, 0.95)', // slate-100/95
            '--bg-surface-B-panel-opaque': '#f1f5f9', // slate-100
            '--bg-surface-B-modal': 'rgba(241, 245, 249, 0.98)',

            // Text for Surface A (uses on-A colors = dark text)
            '--text-on-A-primary': '#020617', // slate-950
            '--text-on-A-secondary': '#475569', // slate-600

            // Text for Surface B (uses on-B colors = dark text for light sidebar)
            '--text-on-B-primary': '#020617', // slate-950
            '--text-on-B-secondary': '#475569', // slate-600

            // Borders
            '--border-on-A': 'rgba(0, 0, 0, 0.1)',
            '--border-on-B': 'rgba(0, 0, 0, 0.1)',

            // Universal (for accent backgrounds)
            '--text-on-accent': '#ffffff',
            '--border-on-accent': 'rgba(255, 255, 255, 0.1)',

            // Glass System (Surface B - pairs with --text-on-A)
            '--bg-glass-B-1': 'rgba(200, 200, 200, 0.10)',
            '--bg-glass-B-2': 'rgba(200, 200, 200, 0.30)',
            '--bg-glass-B-3': 'rgba(200, 200, 200, 0.40)',
            '--bg-glass-B-4': 'rgba(200, 200, 200, 0.50)',
            '--bg-glass-B-5': 'rgba(200, 200, 200, 0.60)',
            '--bg-glass-B-6': 'rgba(200, 200, 200, 0.70)',

            // Glass System (Accent - Affinity Specific)
            '--bg-glass-accent-on-A-1': 'rgba(37, 99, 235, 0.10)',
            '--bg-glass-accent-on-A-2': 'rgba(37, 99, 235, 0.20)',
            '--bg-glass-accent-on-A-3': 'rgba(37, 99, 235, 0.30)',
            '--bg-glass-accent-on-B-1': 'rgba(37, 99, 235, 0.10)',
            '--bg-glass-accent-on-B-2': 'rgba(37, 99, 235, 0.20)',
            '--bg-glass-accent-on-B-3': 'rgba(37, 99, 235, 0.30)',

            // Accent colors (theme-agnostic)
            '--primary-accent': '#2563eb', // blue-600
            '--primary-accent-hover': '#1d4ed8', // blue-700
            '--primary-accent-glow': 'rgba(37, 99, 235, 0.3)',
            '--secondary-accent': '#7c3aed', // violet-600
            '--tertiary-accent': '#059669', // emerald-600
            '--accent-gradient-from': '#2563eb',
            '--accent-gradient-via': '#7c3aed',
            '--accent-gradient-to': '#059669',
            '--bg-ambient-accent-primary': '#2563eb', // blue-600
            '--bg-ambient-accent-secondary': '#7c3aed', // violet-600
            '--bg-ambient-accent-tertiary': '#059669', // emerald-600

            // Status Colors (theme-agnostic)
            '--color-success': '#059669', // emerald-600
            '--color-error': '#e11d48', // rose-600
            '--color-warning': '#d97706', // amber-600
            '--color-info': '#0891b2', // cyan-600

            // Chart Colors
            '--chart-1': '#2563eb',
            '--chart-2': '#7c3aed',
            '--chart-3': '#059669',
            '--chart-4': '#d97706',
            '--chart-5': '#e11d48',
            '--chart-6': '#0891b2',
            '--chart-7': '#4f46e5',
            '--chart-8': '#65a30d',
            '--chart-9': '#db2777',
            '--chart-10': '#64748b',

            // Extended Chart Colors (11-31) - Darker for Light Theme
            '--chart-11': '#e11d48', // rose-600
            '--chart-12': '#0891b2', // cyan-600
            '--chart-13': '#db2777', // pink-600
            '--chart-14': '#4b5563', // gray-600
            '--chart-15': '#65a30d', // lime-600
            '--chart-16': '#7c3aed', // violet-600
            '--chart-17': '#059669', // emerald-600
            '--chart-18': '#2563eb', // blue-600
            '--chart-19': '#d97706', // amber-600
            '--chart-20': '#9333ea', // purple-600
            '--chart-21': '#0d9488', // teal-600
            '--chart-22': '#ea580c', // orange-600
            '--chart-23': '#be123c', // rose-700
            '--chart-24': '#0e7490', // cyan-700
            '--chart-25': '#b91c1c', // red-700
            '--chart-26': '#4338ca', // indigo-700
            '--chart-27': '#15803d', // green-700
            '--chart-28': '#1d4ed8', // blue-700
            '--chart-29': '#a21caf', // fuchsia-700
            '--chart-30': '#15803d', // green-700
            '--chart-31': '#854d0e', // yellow-800

            // Syntax Highlighting
            '--syntax-tag': '#7c3aed',
            '--syntax-attr': '#0891b2',
            '--syntax-string': '#059669',
            '--syntax-number': '#0284c7',
            '--syntax-boolean': '#be123c',
            '--syntax-comment': '#6b7280',
            '--syntax-value': '#111827',
        },
    },
    'solar-flare': {
        name: 'Solar Flare',
        colors: {
            // Surface A: Sun Surface (Light Warm)
            '--bg-surface-A-main': '#fff7ed', // orange-50
            '--bg-surface-A-elevated': '#ffedd5', // orange-100

            // Surface B: Deep Space (Dark)
            '--bg-surface-B-panel': 'rgba(12, 10, 9, 0.95)', // stone-950/95
            '--bg-surface-B-panel-opaque': '#0c0a09', // stone-950
            '--bg-surface-B-modal': 'rgba(12, 10, 9, 0.98)',

            // Text on Surface A (Light Background -> Dark Text)
            '--text-on-A-primary': '#431407', // orange-950
            '--text-on-A-secondary': '#9a3412', // orange-800

            // Text on Surface B (Dark Background -> Light Text)
            '--text-on-B-primary': '#fafaf9', // stone-50
            '--text-on-B-secondary': '#a8a29e', // stone-400

            // Borders
            '--border-on-A': 'rgba(234, 88, 12, 0.2)',
            '--border-on-B': 'rgba(255, 255, 255, 0.15)',

            // Universal
            '--text-on-accent': '#ffffff',
            '--border-on-accent': 'rgba(255, 255, 255, 0.2)',

            // Glass System (Surface B is Dark)
            '--bg-glass-B-1': 'rgba(12, 10, 9, 0.10)',
            '--bg-glass-B-2': 'rgba(12, 10, 9, 0.30)',
            '--bg-glass-B-3': 'rgba(12, 10, 9, 0.40)',
            '--bg-glass-B-4': 'rgba(12, 10, 9, 0.50)',
            '--bg-glass-B-5': 'rgba(12, 10, 9, 0.60)',
            '--bg-glass-B-6': 'rgba(12, 10, 9, 0.70)',

            // Glass System (Accent - Affinity Specific)
            '--bg-glass-accent-on-A-1': 'rgba(249, 115, 22, 0.10)',
            '--bg-glass-accent-on-A-2': 'rgba(249, 115, 22, 0.20)',
            '--bg-glass-accent-on-A-3': 'rgba(249, 115, 22, 0.30)',
            '--bg-glass-accent-on-B-1': 'rgba(249, 115, 22, 0.10)',
            '--bg-glass-accent-on-B-2': 'rgba(249, 115, 22, 0.20)',
            '--bg-glass-accent-on-B-3': 'rgba(249, 115, 22, 0.30)',

            // Accents
            '--primary-accent': '#f97316', // orange-500
            '--primary-accent-hover': '#ea580c', // orange-600
            '--primary-accent-glow': 'rgba(249, 115, 22, 0.4)',
            '--secondary-accent': '#d97706', // amber-600
            '--tertiary-accent': '#b45309', // amber-700
            '--accent-gradient-from': '#f97316',
            '--accent-gradient-via': '#d97706',
            '--accent-gradient-to': '#b45309',
            '--bg-ambient-accent-primary': '#f97316', // orange-500
            '--bg-ambient-accent-secondary': '#d97706', // amber-600
            '--bg-ambient-accent-tertiary': '#b45309', // amber-700

            // Status Colors
            '--color-success': '#15803d',
            '--color-error': '#c2410c',
            '--color-warning': '#b45309',
            '--color-info': '#0369a1',

            // Chart Colors
            '--chart-1': '#f97316',
            '--chart-2': '#d97706',
            '--chart-3': '#b45309',
            '--chart-4': '#f59e0b',
            '--chart-5': '#fbbf24',
            '--chart-6': '#ea580c',
            '--chart-7': '#c2410c',
            '--chart-8': '#fb923c',
            '--chart-9': '#fdba74',
            '--chart-10': '#78716c',

            // Extended Chart Colors (11-31)
            '--chart-11': '#fb7185',
            '--chart-12': '#22d3ee',
            '--chart-13': '#f472b6',
            '--chart-14': '#9ca3af',
            '--chart-15': '#a3e635',
            '--chart-16': '#a78bfa',
            '--chart-17': '#34d399',
            '--chart-18': '#60a5fa',
            '--chart-19': '#fbbf24',
            '--chart-20': '#c084fc',
            '--chart-21': '#2dd4bf',
            '--chart-22': '#fb923c',
            '--chart-23': '#e11d48',
            '--chart-24': '#0891b2',
            '--chart-25': '#ef4444',
            '--chart-26': '#6366f1',
            '--chart-27': '#10b981',
            '--chart-28': '#3b82f6', // Input
            '--chart-29': '#d946ef', // Calc
            '--chart-30': '#22c55e', // Result
            '--chart-31': '#eab308', // Check

            // Syntax Highlighting
            '--syntax-tag': '#c2410c',
            '--syntax-attr': '#b45309',
            '--syntax-string': '#15803d',
            '--syntax-number': '#0369a1',
            '--syntax-boolean': '#b91c1c',
            '--syntax-comment': '#78716c',
            '--syntax-value': '#431407',
        },
    },
    'oled-dark': {
        name: 'OLED Dark',
        colors: {
            // Surface A: Pure Black
            '--bg-surface-A-main': '#000000',
            '--bg-surface-A-elevated': '#000000',

            // Surface B: Pure Black (Relies on borders)
            '--bg-surface-B-panel': 'rgba(0, 0, 0, 0.95)',
            '--bg-surface-B-panel-opaque': '#000000',
            '--bg-surface-B-modal': 'rgba(0, 0, 0, 0.98)',

            // Text on Surface A
            '--text-on-A-primary': '#ffffff',
            '--text-on-A-secondary': '#a3a3a3', // neutral-400

            // Text on Surface B
            '--text-on-B-primary': '#ffffff',
            '--text-on-B-secondary': '#a3a3a3', // neutral-400

            // Borders (Critical for OLED separation)
            '--border-on-A': '#333333',
            '--border-on-B': '#333333',

            // Universal
            '--text-on-accent': '#000000',
            '--border-on-accent': 'rgba(255, 255, 255, 0.2)',

            // Glass System (OLED: No transparency, pure black)
            '--bg-glass-B-1': 'rgba(0, 0, 0, 0.10)',
            '--bg-glass-B-2': 'rgba(0, 0, 0, 0.30)',
            '--bg-glass-B-3': 'rgba(0, 0, 0, 0.40)',
            '--bg-glass-B-4': 'rgba(0, 0, 0, 0.50)',
            '--bg-glass-B-5': 'rgba(0, 0, 0, 0.60)',
            '--bg-glass-B-6': 'rgba(0, 0, 0, 0.70)',

            // Glass System (Accent - Affinity Specific - OLED: Pure Black)
            '--bg-glass-accent-on-A-1': '#000000',
            '--bg-glass-accent-on-A-2': '#000000',
            '--bg-glass-accent-on-A-3': '#000000',
            '--bg-glass-accent-on-B-1': '#000000',
            '--bg-glass-accent-on-B-2': '#000000',
            '--bg-glass-accent-on-B-3': '#000000',

            // Accents (Crisp Blue/White)
            '--primary-accent': '#3b82f6', // blue-500
            '--primary-accent-hover': '#2563eb', // blue-600
            '--primary-accent-glow': 'rgba(59, 130, 246, 0.5)',
            '--secondary-accent': '#e2e8f0', // slate-200
            '--tertiary-accent': '#9ca3af', // gray-400
            '--accent-gradient-from': '#3b82f6',
            '--accent-gradient-via': '#60a5fa',
            '--accent-gradient-to': '#e2e8f0', // slate-200
            '--bg-ambient-accent-primary': '#000000',
            '--bg-ambient-accent-secondary': '#000000',
            '--bg-ambient-accent-tertiary': '#000000',
            // Status Colors
            '--color-success': '#4ade80', // green-400
            '--color-error': '#f87171', // red-400
            '--color-warning': '#fbbf24', // amber-400
            '--color-info': '#38bdf8', // sky-400

            // Chart Colors
            '--chart-1': '#3b82f6',
            '--chart-2': '#e2e8f0', // slate-200
            '--chart-3': '#9ca3af',
            '--chart-4': '#60a5fa',
            '--chart-5': '#d1d5db',
            '--chart-6': '#2563eb',
            '--chart-7': '#f3f4f6',
            '--chart-8': '#1d4ed8',
            '--chart-9': '#e5e7eb',
            '--chart-10': '#4b5563',

            // Extended Chart Colors (11-31)
            '--chart-11': '#fb7185',
            '--chart-12': '#22d3ee',
            '--chart-13': '#f472b6',
            '--chart-14': '#9ca3af',
            '--chart-15': '#a3e635',
            '--chart-16': '#a78bfa',
            '--chart-17': '#34d399',
            '--chart-18': '#60a5fa',
            '--chart-19': '#fbbf24',
            '--chart-20': '#c084fc',
            '--chart-21': '#2dd4bf',
            '--chart-22': '#fb923c',
            '--chart-23': '#e11d48',
            '--chart-24': '#0891b2',
            '--chart-25': '#ef4444',
            '--chart-26': '#6366f1',
            '--chart-27': '#10b981',
            '--chart-28': '#3b82f6', // Input
            '--chart-29': '#d946ef', // Calc
            '--chart-30': '#22c55e', // Result
            '--chart-31': '#eab308', // Check

            // Syntax Highlighting
            '--syntax-tag': '#3b82f6',
            '--syntax-attr': '#60a5fa',
            '--syntax-string': '#4ade80',
            '--syntax-number': '#38bdf8',
            '--syntax-boolean': '#f87171',
            '--syntax-comment': '#6b7280',
            '--syntax-value': '#e2e8f0', // slate-200
        },
    },
    'obsidian-amber': {
        name: 'Obsidian & Amber',
        colors: {
            // Surface A: Deep Black/Brown
            '--bg-surface-A-main': '#0f0a0a', // very dark
            '--bg-surface-A-elevated': '#1c1917', // stone-900

            // Surface B: Dark Panels
            '--bg-surface-B-panel': 'rgba(28, 25, 23, 0.95)', // stone-900/95
            '--bg-surface-B-panel-opaque': '#1c1917', // stone-900
            '--bg-surface-B-modal': 'rgba(28, 25, 23, 0.98)',

            // Text on Surface A
            '--text-on-B-primary': '#fff7ed', // orange-50
            '--text-on-B-secondary': '#fdba74', // orange-300

            // Text on Surface B
            '--text-on-A-primary': '#fff7ed', // orange-50
            '--text-on-A-secondary': '#fdba74', // orange-300

            // Borders
            '--border-on-A': 'rgba(251, 146, 60, 0.15)',
            '--border-on-B': 'rgba(251, 146, 60, 0.2)',

            // Universal
            '--text-on-accent': '#ffffff',
            '--border-on-accent': 'rgba(255, 255, 255, 0.15)',

            // Glass System
            '--bg-glass-B-1': 'rgba(28, 25, 23, 0.10)',
            '--bg-glass-B-2': 'rgba(28, 25, 23, 0.30)',
            '--bg-glass-B-3': 'rgba(28, 25, 23, 0.40)',
            '--bg-glass-B-4': 'rgba(28, 25, 23, 0.50)',
            '--bg-glass-B-5': 'rgba(28, 25, 23, 0.60)',
            '--bg-glass-B-6': 'rgba(28, 25, 23, 0.70)',

            // Glass System (Accent - Affinity Specific)
            '--bg-glass-accent-on-A-1': 'rgba(249, 115, 22, 0.10)',
            '--bg-glass-accent-on-A-2': 'rgba(249, 115, 22, 0.20)',
            '--bg-glass-accent-on-A-3': 'rgba(249, 115, 22, 0.30)',
            '--bg-glass-accent-on-B-1': 'rgba(249, 115, 22, 0.10)',
            '--bg-glass-accent-on-B-2': 'rgba(249, 115, 22, 0.20)',
            '--bg-glass-accent-on-B-3': 'rgba(249, 115, 22, 0.30)',

            // Accents
            '--primary-accent': '#f97316', // orange-500
            '--primary-accent-hover': '#ea580c', // orange-600
            '--primary-accent-glow': 'rgba(249, 115, 22, 0.5)',
            '--secondary-accent': '#fb923c', // orange-400
            '--tertiary-accent': '#fdba74', // orange-300
            '--accent-gradient-from': '#f97316',
            '--accent-gradient-via': '#fb923c',
            '--accent-gradient-to': '#fdba74',
            '--bg-ambient-accent-primary': '#f97316', // orange-500
            '--bg-ambient-accent-secondary': '#fb923c', // orange-400
            '--bg-ambient-accent-tertiary': '#fdba74', // orange-300

            // Status Colors
            '--color-success': '#22c55e',
            '--color-error': '#ef4444',
            '--color-warning': '#f59e0b',
            '--color-info': '#3b82f6',

            // Chart Colors
            '--chart-1': '#f97316',
            '--chart-2': '#fb923c',
            '--chart-3': '#fdba74',
            '--chart-4': '#78716c',
            '--chart-5': '#d97706',
            '--chart-6': '#b91c1c',
            '--chart-7': '#a8a29e',
            '--chart-8': '#fbbf24',
            '--chart-9': '#c2410c',
            '--chart-10': '#44403c',

            // Extended Chart Colors (11-31)
            '--chart-11': '#fb7185',
            '--chart-12': '#22d3ee',
            '--chart-13': '#f472b6',
            '--chart-14': '#9ca3af',
            '--chart-15': '#a3e635',
            '--chart-16': '#a78bfa',
            '--chart-17': '#34d399',
            '--chart-18': '#60a5fa',
            '--chart-19': '#fbbf24',
            '--chart-20': '#c084fc',
            '--chart-21': '#2dd4bf',
            '--chart-22': '#fb923c',
            '--chart-23': '#e11d48',
            '--chart-24': '#0891b2',
            '--chart-25': '#ef4444',
            '--chart-26': '#6366f1',
            '--chart-27': '#10b981',
            '--chart-28': '#3b82f6', // Input
            '--chart-29': '#d946ef', // Calc
            '--chart-30': '#22c55e', // Result
            '--chart-31': '#eab308', // Check

            // Syntax Highlighting
            '--syntax-tag': '#fb923c',
            '--syntax-attr': '#fdba74',
            '--syntax-string': '#fca5a5',
            '--syntax-number': '#fcd34d',
            '--syntax-boolean': '#ef4444',
            '--syntax-comment': '#78716c',
            '--syntax-value': '#fff7ed',
        },
    },
    'light-executive': {
        name: 'Light Executive',
        colors: {
            // Surface A: Clean White/Slate
            '--bg-surface-A-main': '#f8fafc', // slate-50
            '--bg-surface-A-elevated': '#f1f5f9', // slate-100

            // Surface B: Very Light Blue/Slate Panels
            '--bg-surface-B-panel': 'rgba(241, 245, 249, 0.95)', // slate-100/95
            '--bg-surface-B-panel-opaque': '#f1f5f9', // slate-100
            '--bg-surface-B-modal': 'rgba(241, 245, 249, 0.98)',

            // Text on Surface A
            '--text-on-B-primary': '#0f172a', // slate-900
            '--text-on-B-secondary': '#475569', // slate-600

            // Text on Surface B
            '--text-on-A-primary': '#0f172a', // slate-900
            '--text-on-A-secondary': '#475569', // slate-600

            // Borders
            '--border-on-A': 'rgba(148, 163, 184, 0.2)',
            '--border-on-B': 'rgba(148, 163, 184, 0.2)',

            // Universal
            '--text-on-accent': '#ffffff',
            '--border-on-accent': 'rgba(255, 255, 255, 0.15)',

            // Glass System
            '--bg-glass-B-1': 'rgba(241, 245, 249, 0.10)',
            '--bg-glass-B-2': 'rgba(241, 245, 249, 0.30)',
            '--bg-glass-B-3': 'rgba(241, 245, 249, 0.40)',
            '--bg-glass-B-4': 'rgba(241, 245, 249, 0.50)',
            '--bg-glass-B-5': 'rgba(241, 245, 249, 0.60)',
            '--bg-glass-B-6': 'rgba(241, 245, 249, 0.70)',

            // Glass System (Accent - Affinity Specific)
            '--bg-glass-accent-on-A-1': 'rgba(2, 132, 199, 0.10)',
            '--bg-glass-accent-on-A-2': 'rgba(2, 132, 199, 0.20)',
            '--bg-glass-accent-on-A-3': 'rgba(2, 132, 199, 0.30)',
            '--bg-glass-accent-on-B-1': 'rgba(2, 132, 199, 0.10)',
            '--bg-glass-accent-on-B-2': 'rgba(2, 132, 199, 0.20)',
            '--bg-glass-accent-on-B-3': 'rgba(2, 132, 199, 0.30)',

            // Accents
            '--primary-accent': '#0284c7', // sky-600
            '--primary-accent-hover': '#0369a1', // sky-700
            '--primary-accent-glow': 'rgba(2, 132, 199, 0.3)',
            '--secondary-accent': '#0ea5e9', // sky-500
            '--tertiary-accent': '#38bdf8', // sky-400
            '--accent-gradient-from': '#0284c7',
            '--accent-gradient-via': '#0ea5e9',
            '--accent-gradient-to': '#38bdf8',
            '--bg-ambient-accent-primary': '#0284c7', // sky-600
            '--bg-ambient-accent-secondary': '#0ea5e9', // sky-500
            '--bg-ambient-accent-tertiary': '#38bdf8', // sky-400

            // Status Colors
            '--color-success': '#16a34a',
            '--color-error': '#dc2626',
            '--color-warning': '#ca8a04',
            '--color-info': '#0284c7',

            // Chart Colors
            '--chart-1': '#0284c7',
            '--chart-2': '#0ea5e9',
            '--chart-3': '#38bdf8',
            '--chart-4': '#0369a1',
            '--chart-5': '#0c4a6e',
            '--chart-6': '#7dd3fc',
            '--chart-7': '#bae6fd',
            '--chart-8': '#e0f2fe',
            '--chart-9': '#64748b',
            '--chart-10': '#94a3b8',

            // Extended Chart Colors (11-31)
            '--chart-11': '#e11d48',
            '--chart-12': '#0891b2',
            '--chart-13': '#db2777',
            '--chart-14': '#4b5563',
            '--chart-15': '#65a30d',
            '--chart-16': '#7c3aed',
            '--chart-17': '#059669',
            '--chart-18': '#2563eb',
            '--chart-19': '#d97706',
            '--chart-20': '#9333ea',
            '--chart-21': '#0d9488',
            '--chart-22': '#ea580c',
            '--chart-23': '#be123c',
            '--chart-24': '#0e7490',
            '--chart-25': '#b91c1c',
            '--chart-26': '#4338ca',
            '--chart-27': '#15803d',
            '--chart-28': '#1d4ed8', // Input
            '--chart-29': '#a21caf', // Calc
            '--chart-30': '#15803d', // Result
            '--chart-31': '#854d0e', // Check

            // Syntax Highlighting
            '--syntax-tag': '#0284c7',
            '--syntax-attr': '#0ea5e9',
            '--syntax-string': '#16a34a',
            '--syntax-number': '#ca8a04',
            '--syntax-boolean': '#dc2626',
            '--syntax-comment': '#94a3b8',
            '--syntax-value': '#0f172a',
        },
    },
    cyberpunk: {
        name: 'Cyberpunk',
        colors: {
            // Surface A: Deep Slate
            '--bg-surface-A-main': '#020617', // slate-950
            '--bg-surface-A-elevated': '#0f172a', // slate-900

            // Surface B: Dark Panels
            '--bg-surface-B-panel': 'rgba(15, 23, 42, 0.95)', // slate-900/95
            '--bg-surface-B-panel-opaque': '#0f172a', // slate-900
            '--bg-surface-B-modal': 'rgba(15, 23, 42, 0.98)',

            // Text on Surface A
            '--text-on-B-primary': '#ffffff', // white
            '--text-on-B-secondary': '#cbd5e1', // slate-300

            // Text on Surface B
            '--text-on-A-primary': '#ffffff', // white
            '--text-on-A-secondary': '#cbd5e1', // slate-300

            // Borders
            '--border-on-A': 'rgba(255, 255, 255, 0.15)',
            '--border-on-B': 'rgba(255, 255, 255, 0.2)',

            // Universal
            '--text-on-accent': '#ffffff',
            '--border-on-accent': 'rgba(255, 255, 255, 0.1)',

            // Glass System
            '--bg-glass-B-1': 'rgba(15, 23, 42, 0.10)',
            '--bg-glass-B-2': 'rgba(15, 23, 42, 0.30)',
            '--bg-glass-B-3': 'rgba(15, 23, 42, 0.40)',
            '--bg-glass-B-4': 'rgba(15, 23, 42, 0.50)',
            '--bg-glass-B-5': 'rgba(15, 23, 42, 0.60)',
            '--bg-glass-B-6': 'rgba(15, 23, 42, 0.70)',

            // Glass System (Accent - Affinity Specific)
            '--bg-glass-accent-on-A-1': 'rgba(59, 130, 246, 0.10)',
            '--bg-glass-accent-on-A-2': 'rgba(59, 130, 246, 0.20)',
            '--bg-glass-accent-on-A-3': 'rgba(59, 130, 246, 0.30)',
            '--bg-glass-accent-on-B-1': 'rgba(59, 130, 246, 0.10)',
            '--bg-glass-accent-on-B-2': 'rgba(59, 130, 246, 0.20)',
            '--bg-glass-accent-on-B-3': 'rgba(59, 130, 246, 0.30)',

            // Accents
            '--primary-accent': '#3b82f6', // blue-500
            '--primary-accent-hover': '#2563eb', // blue-600
            '--primary-accent-glow': 'rgba(59, 130, 246, 0.5)',
            '--secondary-accent': '#a855f7', // purple-500
            '--tertiary-accent': '#10b981', // emerald-500
            '--accent-gradient-from': '#60a5fa',
            '--accent-gradient-via': '#c084fc',
            '--accent-gradient-to': '#34d399',
            '--bg-ambient-accent-primary': '#3b82f6', // blue-500
            '--bg-ambient-accent-secondary': '#c084fc', // purple-400
            '--bg-ambient-accent-tertiary': '#34d399', // emerald-400

            // Status Colors
            '--color-success': '#4ade80',
            '--color-error': '#f87171',
            '--color-warning': '#fbbf24',
            '--color-info': '#60a5fa',

            // Chart Colors
            '--chart-1': '#3b82f6',
            '--chart-2': '#a855f7',
            '--chart-3': '#10b981',
            '--chart-4': '#f43f5e',
            '--chart-5': '#f59e0b',
            '--chart-6': '#06b6d4',
            '--chart-7': '#8b5cf6',
            '--chart-8': '#ec4899',
            '--chart-9': '#84cc16',
            '--chart-10': '#6366f1',

            // Extended Chart Colors (11-31) - Neon/Cyberpunk
            '--chart-11': '#fb7185',
            '--chart-12': '#22d3ee',
            '--chart-13': '#f472b6',
            '--chart-14': '#94a3b8',
            '--chart-15': '#a3e635',
            '--chart-16': '#a78bfa',
            '--chart-17': '#34d399',
            '--chart-18': '#60a5fa',
            '--chart-19': '#fbbf24',
            '--chart-20': '#c084fc',
            '--chart-21': '#2dd4bf',
            '--chart-22': '#fb923c',
            '--chart-23': '#f43f5e',
            '--chart-24': '#06b6d4',
            '--chart-25': '#ef4444',
            '--chart-26': '#8b5cf6',
            '--chart-27': '#10b981',
            '--chart-28': '#3b82f6',
            '--chart-29': '#d946ef',
            '--chart-30': '#22c55e',
            '--chart-31': '#eab308',

            // Syntax Highlighting
            '--syntax-tag': '#c084fc',
            '--syntax-attr': '#34d399',
            '--syntax-string': '#fcd34d',
            '--syntax-number': '#7dd3fc',
            '--syntax-boolean': '#fb7185',
            '--syntax-comment': '#64748b',
            '--syntax-value': '#e2e8f0',
        },
    },
    'neon-daydream': {
        name: 'Neon Daydream',
        colors: {
            // Surface A: Dark Violet/Black
            '--bg-surface-A-main': '#09090b', // zinc-950
            '--bg-surface-A-elevated': '#18181b', // zinc-900

            // Surface B: Dark Violet Panels
            '--bg-surface-B-panel': 'rgba(24, 24, 27, 0.95)', // zinc-900/95
            '--bg-surface-B-panel-opaque': '#18181b', // zinc-900
            '--bg-surface-B-modal': 'rgba(24, 24, 27, 0.98)',

            // Text on Surface A
            '--text-on-B-primary': '#fce7f3', // pink-100
            '--text-on-B-secondary': '#fbcfe8', // pink-200

            // Text on Surface B
            '--text-on-A-primary': '#fce7f3', // pink-100
            '--text-on-A-secondary': '#fbcfe8', // pink-200

            // Borders
            '--border-on-A': 'rgba(219, 39, 119, 0.2)',
            '--border-on-B': 'rgba(219, 39, 119, 0.25)',

            // Universal
            '--text-on-accent': '#ffffff',
            '--border-on-accent': 'rgba(255, 255, 255, 0.15)',

            // Glass System
            '--bg-glass-B-1': 'rgba(24, 24, 27, 0.10)',
            '--bg-glass-B-2': 'rgba(24, 24, 27, 0.30)',
            '--bg-glass-B-3': 'rgba(24, 24, 27, 0.40)',
            '--bg-glass-B-4': 'rgba(24, 24, 27, 0.50)',
            '--bg-glass-B-5': 'rgba(24, 24, 27, 0.60)',
            '--bg-glass-B-6': 'rgba(24, 24, 27, 0.70)',

            // Glass System (Accent - Affinity Specific)
            '--bg-glass-accent-on-A-1': 'rgba(219, 39, 119, 0.10)',
            '--bg-glass-accent-on-A-2': 'rgba(219, 39, 119, 0.20)',
            '--bg-glass-accent-on-A-3': 'rgba(219, 39, 119, 0.30)',
            '--bg-glass-accent-on-B-1': 'rgba(219, 39, 119, 0.10)',
            '--bg-glass-accent-on-B-2': 'rgba(219, 39, 119, 0.20)',
            '--bg-glass-accent-on-B-3': 'rgba(219, 39, 119, 0.30)',

            // Accents
            '--primary-accent': '#db2777', // pink-600
            '--primary-accent-hover': '#be185d', // pink-700
            '--primary-accent-glow': 'rgba(219, 39, 119, 0.5)',
            '--secondary-accent': '#9333ea', // purple-600
            '--tertiary-accent': '#7c3aed', // violet-600
            '--accent-gradient-from': '#db2777',
            '--accent-gradient-via': '#9333ea',
            '--accent-gradient-to': '#7c3aed',
            '--bg-ambient-accent-primary': '#db2777', // pink-600
            '--bg-ambient-accent-secondary': '#9333ea', // purple-600
            '--bg-ambient-accent-tertiary': '#7c3aed', // violet-600

            // Status Colors
            '--color-success': '#22c55e',
            '--color-error': '#e11d48',
            '--color-warning': '#f59e0b',
            '--color-info': '#3b82f6',

            // Chart Colors
            '--chart-1': '#db2777',
            '--chart-2': '#9333ea',
            '--chart-3': '#7c3aed',
            '--chart-4': '#4f46e5',
            '--chart-5': '#2563eb',
            '--chart-6': '#0ea5e9',
            '--chart-7': '#06b6d4',
            '--chart-8': '#0d9488',
            '--chart-9': '#10b981',
            '--chart-10': '#84cc16',

            // Extended Chart Colors (11-31)
            '--chart-11': '#fb7185',
            '--chart-12': '#22d3ee',
            '--chart-13': '#f472b6',
            '--chart-14': '#9ca3af',
            '--chart-15': '#a3e635',
            '--chart-16': '#a78bfa',
            '--chart-17': '#34d399',
            '--chart-18': '#60a5fa',
            '--chart-19': '#fbbf24',
            '--chart-20': '#c084fc',
            '--chart-21': '#2dd4bf',
            '--chart-22': '#fb923c',
            '--chart-23': '#e11d48',
            '--chart-24': '#0891b2',
            '--chart-25': '#ef4444',
            '--chart-26': '#6366f1',
            '--chart-27': '#10b981',
            '--chart-28': '#3b82f6', // Input
            '--chart-29': '#d946ef', // Calc
            '--chart-30': '#22c55e', // Result
            '--chart-31': '#eab308', // Check

            // Syntax Highlighting
            '--syntax-tag': '#db2777',
            '--syntax-attr': '#9333ea',
            '--syntax-string': '#0d9488',
            '--syntax-number': '#2563eb',
            '--syntax-boolean': '#e11d48',
            '--syntax-comment': '#a1a1aa',
            '--syntax-value': '#fce7f3',
        },
    },
    'midnight-mint': {
        name: 'Midnight Mint',
        colors: {
            // Surface A: Pure Black
            '--bg-surface-A-main': '#000000',
            '--bg-surface-A-elevated': '#0a0a0a',

            // Surface B: Very Dark Panels
            '--bg-surface-B-panel': 'rgba(10, 10, 10, 0.95)',
            '--bg-surface-B-panel-opaque': '#0a0a0a',
            '--bg-surface-B-modal': 'rgba(10, 10, 10, 0.98)',

            // Text on Surface A
            '--text-on-B-primary': '#ccfbf1', // teal-50
            '--text-on-B-secondary': '#5eead4', // teal-300

            // Text on Surface B
            '--text-on-A-primary': '#99f6e4', // teal-200
            '--text-on-A-secondary': '#2dd4bf', // teal-400

            // Borders
            '--border-on-A': 'rgba(45, 212, 191, 0.2)',
            '--border-on-B': 'rgba(45, 212, 191, 0.25)',

            // Universal
            '--text-on-accent': '#ffffff',
            '--border-on-accent': 'rgba(255, 255, 255, 0.1)',

            // Glass System
            '--bg-glass-B-1': 'rgba(10, 10, 10, 0.10)',
            '--bg-glass-B-2': 'rgba(10, 10, 10, 0.30)',
            '--bg-glass-B-3': 'rgba(10, 10, 10, 0.40)',
            '--bg-glass-B-4': 'rgba(10, 10, 10, 0.50)',
            '--bg-glass-B-5': 'rgba(10, 10, 10, 0.60)',
            '--bg-glass-B-6': 'rgba(10, 10, 10, 0.70)',

            // Glass System (Accent - Affinity Specific)
            '--bg-glass-accent-on-A-1': 'rgba(45, 212, 191, 0.10)',
            '--bg-glass-accent-on-A-2': 'rgba(45, 212, 191, 0.20)',
            '--bg-glass-accent-on-A-3': 'rgba(45, 212, 191, 0.30)',
            '--bg-glass-accent-on-B-1': 'rgba(45, 212, 191, 0.10)',
            '--bg-glass-accent-on-B-2': 'rgba(45, 212, 191, 0.20)',
            '--bg-glass-accent-on-B-3': 'rgba(45, 212, 191, 0.30)',

            // Accents
            '--primary-accent': '#2dd4bf', // teal-400
            '--primary-accent-hover': '#14b8a6', // teal-500
            '--primary-accent-glow': 'rgba(45, 212, 191, 0.4)',
            '--secondary-accent': '#0ea5e9', // sky-500
            '--tertiary-accent': '#6366f1', // indigo-500
            '--accent-gradient-from': '#2dd4bf',
            '--accent-gradient-via': '#0ea5e9',
            '--accent-gradient-to': '#6366f1',
            '--bg-ambient-accent-primary': '#2dd4bf', // teal-400
            '--bg-ambient-accent-secondary': '#0ea5e9', // sky-500
            '--bg-ambient-accent-tertiary': '#6366f1', // indigo-500

            // Status Colors
            '--color-success': '#4ade80',
            '--color-error': '#f87171',
            '--color-warning': '#facc15',
            '--color-info': '#38bdf8',

            // Chart Colors
            '--chart-1': '#2dd4bf',
            '--chart-2': '#0ea5e9',
            '--chart-3': '#6366f1',
            '--chart-4': '#a855f7',
            '--chart-5': '#d946ef',
            '--chart-6': '#f43f5e',
            '--chart-7': '#facc15',
            '--chart-8': '#a3e635',
            '--chart-9': '#4ade80',
            '--chart-10': '#94a3b8',

            // Extended Chart Colors (11-31)
            '--chart-11': '#fb7185',
            '--chart-12': '#22d3ee',
            '--chart-13': '#f472b6',
            '--chart-14': '#9ca3af',
            '--chart-15': '#a3e635',
            '--chart-16': '#a78bfa',
            '--chart-17': '#34d399',
            '--chart-18': '#60a5fa',
            '--chart-19': '#fbbf24',
            '--chart-20': '#c084fc',
            '--chart-21': '#2dd4bf',
            '--chart-22': '#fb923c',
            '--chart-23': '#e11d48',
            '--chart-24': '#0891b2',
            '--chart-25': '#ef4444',
            '--chart-26': '#6366f1',
            '--chart-27': '#10b981',
            '--chart-28': '#3b82f6', // Input
            '--chart-29': '#d946ef', // Calc
            '--chart-30': '#22c55e', // Result
            '--chart-31': '#eab308', // Check

            // Syntax Highlighting
            '--syntax-tag': '#2dd4bf',
            '--syntax-attr': '#0ea5e9',
            '--syntax-string': '#facc15',
            '--syntax-number': '#a3e635',
            '--syntax-boolean': '#f87171',
            '--syntax-comment': '#334155',
            '--syntax-value': '#ccfbf1',
        },
    },
    'arctic-night': {
        name: 'Arctic Night',
        colors: {
            // Surface A: Night Sky (Dark Blue/Slate)
            '--bg-surface-A-main': '#020617', // slate-950
            '--bg-surface-A-elevated': '#0f172a', // slate-900

            // Surface B: Moon/Ice (Light Blue/White)
            '--bg-surface-B-panel': 'rgba(241, 245, 249, 0.95)', // slate-100/95
            '--bg-surface-B-panel-opaque': '#f1f5f9', // slate-100
            '--bg-surface-B-modal': 'rgba(241, 245, 249, 0.98)',

            // Text on Surface A (Dark Background -> Light Text)
            '--text-on-A-primary': '#f8fafc', // slate-50
            '--text-on-A-secondary': '#cbd5e1', // slate-300

            // Text on Surface B (Light Background -> Dark Text)
            '--text-on-B-primary': '#0f172a', // slate-900
            '--text-on-B-secondary': '#475569', // slate-600

            // Borders
            '--border-on-A': 'rgba(255, 255, 255, 0.15)',
            '--border-on-B': 'rgba(15, 23, 42, 0.1)',

            // Universal
            '--text-on-accent': '#ffffff',
            '--border-on-accent': 'rgba(255, 255, 255, 0.15)',

            // Glass System (Surface B is Light)
            '--bg-glass-B-1': 'rgba(241, 245, 249, 0.10)',
            '--bg-glass-B-2': 'rgba(241, 245, 249, 0.30)',
            '--bg-glass-B-3': 'rgba(241, 245, 249, 0.40)',
            '--bg-glass-B-4': 'rgba(241, 245, 249, 0.50)',
            '--bg-glass-B-5': 'rgba(241, 245, 249, 0.60)',
            '--bg-glass-B-6': 'rgba(241, 245, 249, 0.70)',

            // Glass System (Accent - Affinity Specific)
            '--bg-glass-accent-on-A-1': 'rgba(14, 165, 233, 0.10)',
            '--bg-glass-accent-on-A-2': 'rgba(14, 165, 233, 0.20)',
            '--bg-glass-accent-on-A-3': 'rgba(14, 165, 233, 0.30)',
            '--bg-glass-accent-on-B-1': 'rgba(3, 105, 161, 0.10)', // Darker for light background
            '--bg-glass-accent-on-B-2': 'rgba(3, 105, 161, 0.20)',
            '--bg-glass-accent-on-B-3': 'rgba(3, 105, 161, 0.30)',

            // Accents
            '--primary-accent': '#0ea5e9', // sky-500
            '--primary-accent-hover': '#0284c7', // sky-600
            '--primary-accent-glow': 'rgba(14, 165, 233, 0.4)',
            '--secondary-accent': '#6366f1', // indigo-500
            '--tertiary-accent': '#8b5cf6', // violet-500
            '--accent-gradient-from': '#0ea5e9',
            '--accent-gradient-via': '#6366f1',
            '--accent-gradient-to': '#8b5cf6',
            '--bg-ambient-accent-primary': '#0ea5e9', // sky-500
            '--bg-ambient-accent-secondary': '#6366f1', // indigo-500
            '--bg-ambient-accent-tertiary': '#8b5cf6', // violet-500

            // Status Colors
            '--color-success': '#16a34a',
            '--color-error': '#dc2626',
            '--color-warning': '#ca8a04',
            '--color-info': '#0284c7',

            // Chart Colors
            '--chart-1': '#0ea5e9',
            '--chart-2': '#6366f1',
            '--chart-3': '#8b5cf6',
            '--chart-4': '#ec4899',
            '--chart-5': '#f43f5e',
            '--chart-6': '#f97316',
            '--chart-7': '#eab308',
            '--chart-8': '#84cc16',
            '--chart-9': '#10b981',
            '--chart-10': '#06b6d4',

            // Extended Chart Colors (11-31)
            '--chart-11': '#e11d48',
            '--chart-12': '#0891b2',
            '--chart-13': '#db2777',
            '--chart-14': '#4b5563',
            '--chart-15': '#65a30d',
            '--chart-16': '#7c3aed',
            '--chart-17': '#059669',
            '--chart-18': '#2563eb',
            '--chart-19': '#d97706',
            '--chart-20': '#9333ea',
            '--chart-21': '#0d9488',
            '--chart-22': '#ea580c',
            '--chart-23': '#be123c',
            '--chart-24': '#0e7490',
            '--chart-25': '#b91c1c',
            '--chart-26': '#4338ca',
            '--chart-27': '#15803d',
            '--chart-28': '#1d4ed8', // Input
            '--chart-29': '#a21caf', // Calc
            '--chart-30': '#15803d', // Result
            '--chart-31': '#854d0e', // Check

            // Syntax Highlighting
            '--syntax-tag': '#0ea5e9',
            '--syntax-attr': '#6366f1',
            '--syntax-string': '#059669',
            '--syntax-number': '#0891b2',
            '--syntax-boolean': '#dc2626',
            '--syntax-comment': '#64748b',
            '--syntax-value': '#f8fafc',
        },
    },
    'ink-parchment': {
        name: 'Ink & Parchment',
        colors: {
            // Surface A: Very Pale Cream/White
            '--bg-surface-A-main': '#fffbf0', // warm white
            '--bg-surface-A-elevated': '#fef3c7', // amber-50

            // Surface B: Pale Warm Panels
            '--bg-surface-B-panel': 'rgba(254, 243, 199, 0.95)', // amber-50/95
            '--bg-surface-B-panel-opaque': '#fef3c7', // amber-50
            '--bg-surface-B-modal': 'rgba(254, 243, 199, 0.98)',

            // Text on Surface A
            '--text-on-B-primary': '#451a03', // amber-950
            '--text-on-B-secondary': '#78350f', // amber-900

            // Text on Surface B
            '--text-on-A-primary': '#451a03', // amber-950
            '--text-on-A-secondary': '#78350f', // amber-900

            // Borders
            '--border-on-A': 'rgba(120, 53, 15, 0.15)',
            '--border-on-B': 'rgba(120, 53, 15, 0.2)',

            // Universal
            '--text-on-accent': '#ffffff',
            '--border-on-accent': 'rgba(255, 255, 255, 0.15)',

            // Glass System
            '--bg-glass-B-1': 'rgba(254, 243, 199, 0.10)',
            '--bg-glass-B-2': 'rgba(254, 243, 199, 0.30)',
            '--bg-glass-B-3': 'rgba(254, 243, 199, 0.40)',
            '--bg-glass-B-4': 'rgba(254, 243, 199, 0.50)',
            '--bg-glass-B-5': 'rgba(254, 243, 199, 0.60)',
            '--bg-glass-B-6': 'rgba(254, 243, 199, 0.70)',

            // Glass System (Accent - Affinity Specific)
            '--bg-glass-accent-on-A-1': 'rgba(120, 53, 15, 0.10)',
            '--bg-glass-accent-on-A-2': 'rgba(120, 53, 15, 0.20)',
            '--bg-glass-accent-on-A-3': 'rgba(120, 53, 15, 0.30)',
            '--bg-glass-accent-on-B-1': 'rgba(120, 53, 15, 0.10)',
            '--bg-glass-accent-on-B-2': 'rgba(120, 53, 15, 0.20)',
            '--bg-glass-accent-on-B-3': 'rgba(120, 53, 15, 0.30)',

            // Accents
            '--primary-accent': '#b45309', // amber-700
            '--primary-accent-hover': '#92400e', // amber-800
            '--primary-accent-glow': 'rgba(180, 83, 9, 0.3)',
            '--secondary-accent': '#d97706', // amber-600
            '--tertiary-accent': '#f59e0b', // amber-500
            '--accent-gradient-from': '#b45309',
            '--accent-gradient-via': '#d97706',
            '--accent-gradient-to': '#ffffff',
            '--bg-ambient-accent-primary': '#000000', // Invisible for OLED
            '--bg-ambient-accent-secondary': '#000000',
            '--bg-ambient-accent-tertiary': '#000000',

            // Status Colors
            '--color-success': '#15803d',
            '--color-error': '#b91c1c',
            '--color-warning': '#c2410c',
            '--color-info': '#0369a1',

            // Chart Colors
            '--chart-1': '#b45309',
            '--chart-2': '#d97706',
            '--chart-3': '#f59e0b',
            '--chart-4': '#ea580c',
            '--chart-5': '#c2410c',
            '--chart-6': '#9a3412',
            '--chart-7': '#7c2d12',
            '--chart-8': '#fbbf24',
            '--chart-9': '#78350f',
            '--chart-10': '#a8a29e',

            // Extended Chart Colors (11-31)
            '--chart-11': '#e11d48',
            '--chart-12': '#0891b2',
            '--chart-13': '#db2777',
            '--chart-14': '#4b5563',
            '--chart-15': '#65a30d',
            '--chart-16': '#7c3aed',
            '--chart-17': '#059669',
            '--chart-18': '#2563eb',
            '--chart-19': '#d97706',
            '--chart-20': '#9333ea',
            '--chart-21': '#0d9488',
            '--chart-22': '#ea580c',
            '--chart-23': '#be123c',
            '--chart-24': '#0e7490',
            '--chart-25': '#b91c1c',
            '--chart-26': '#4338ca',
            '--chart-27': '#15803d',
            '--chart-28': '#1d4ed8', // Input
            '--chart-29': '#a21caf', // Calc
            '--chart-30': '#15803d', // Result
            '--chart-31': '#854d0e', // Check

            // Syntax Highlighting
            '--syntax-tag': '#b45309',
            '--syntax-attr': '#d97706',
            '--syntax-string': '#15803d',
            '--syntax-number': '#0369a1',
            '--syntax-boolean': '#b91c1c',
            '--syntax-comment': '#a8a29e',
            '--syntax-value': '#451a03',
        },
    },
    eclipse: {
        name: 'Eclipse',
        colors: {
            // Surface A: Deep Charcoal (Moon/Sky)
            '--bg-surface-A-main': '#18181b', // zinc-950
            '--bg-surface-A-elevated': '#27272a', // zinc-800

            // Surface B: Bright Corona (Light Panels)
            '--bg-surface-B-panel': 'rgba(248, 250, 252, 0.95)', // slate-50/95
            '--bg-surface-B-panel-opaque': '#f8fafc', // slate-50
            '--bg-surface-B-modal': 'rgba(248, 250, 252, 0.98)',

            // Text on Surface A (Dark)
            '--text-on-A-primary': '#f8fafc', // slate-50
            '--text-on-A-secondary': '#94a3b8', // slate-400

            // Text on Surface B (Light)
            '--text-on-B-primary': '#0f172a', // slate-900
            '--text-on-B-secondary': '#475569', // slate-600

            // Borders
            '--border-on-A': 'rgba(255, 255, 255, 0.15)',
            '--border-on-B': 'rgba(15, 23, 42, 0.1)',

            // Universal
            '--text-on-accent': '#0f172a', // dark text on bright yellow
            '--border-on-accent': 'rgba(255, 255, 255, 0.2)',

            // Glass System (Surface B is Light)
            '--bg-glass-B-1': 'rgba(248, 250, 252, 0.10)',
            '--bg-glass-B-2': 'rgba(248, 250, 252, 0.30)',
            '--bg-glass-B-3': 'rgba(248, 250, 252, 0.40)',
            '--bg-glass-B-4': 'rgba(248, 250, 252, 0.50)',
            '--bg-glass-B-5': 'rgba(248, 250, 252, 0.60)',
            '--bg-glass-B-6': 'rgba(248, 250, 252, 0.70)',

            // Glass System (Accent - Affinity Specific)
            '--bg-glass-accent-on-A-1': 'rgba(250, 204, 21, 0.10)',
            '--bg-glass-accent-on-A-2': 'rgba(250, 204, 21, 0.20)',
            '--bg-glass-accent-on-A-3': 'rgba(250, 204, 21, 0.30)',
            '--bg-glass-accent-on-B-1': 'rgba(217, 119, 6, 0.10)', // amber-600 for visibility on light Surface B
            '--bg-glass-accent-on-B-2': 'rgba(217, 119, 6, 0.20)',
            '--bg-glass-accent-on-B-3': 'rgba(217, 119, 6, 0.30)',

            // Accents (Golden/Yellow)
            '--primary-accent': '#facc15', // yellow-400
            '--primary-accent-hover': '#eab308', // yellow-500
            '--primary-accent-glow': 'rgba(250, 204, 21, 0.5)',
            '--secondary-accent': '#fbbf24', // amber-400
            '--tertiary-accent': '#f59e0b', // amber-500
            '--accent-gradient-from': '#facc15',
            '--accent-gradient-via': '#fbbf24',
            '--accent-gradient-to': '#f59e0b',
            '--bg-ambient-accent-primary': '#facc15', // yellow-400
            '--bg-ambient-accent-secondary': '#fbbf24', // amber-400
            '--bg-ambient-accent-tertiary': '#f59e0b', // amber-500

            // Status Colors
            '--color-success': '#16a34a',
            '--color-error': '#dc2626',
            '--color-warning': '#ca8a04',
            '--color-info': '#0284c7',

            // Chart Colors
            '--chart-1': '#facc15',
            '--chart-2': '#fbbf24',
            '--chart-3': '#f59e0b',
            '--chart-4': '#d97706',
            '--chart-5': '#b45309',
            '--chart-6': '#f87171',
            '--chart-7': '#60a5fa',
            '--chart-8': '#c084fc',
            '--chart-9': '#4ade80',
            '--chart-10': '#94a3b8',

            // Extended Chart Colors (11-31)
            '--chart-11': '#e11d48',
            '--chart-12': '#0891b2',
            '--chart-13': '#db2777',
            '--chart-14': '#4b5563',
            '--chart-15': '#65a30d',
            '--chart-16': '#7c3aed',
            '--chart-17': '#059669',
            '--chart-18': '#2563eb',
            '--chart-19': '#d97706',
            '--chart-20': '#9333ea',
            '--chart-21': '#0d9488',
            '--chart-22': '#ea580c',
            '--chart-23': '#be123c',
            '--chart-24': '#0e7490',
            '--chart-25': '#b91c1c',
            '--chart-26': '#4338ca',
            '--chart-27': '#15803d',
            '--chart-28': '#1d4ed8', // Input
            '--chart-29': '#a21caf', // Calc
            '--chart-30': '#15803d', // Result
            '--chart-31': '#854d0e', // Check

            // Syntax Highlighting
            '--syntax-tag': '#facc15',
            '--syntax-attr': '#fbbf24',
            '--syntax-string': '#4ade80',
            '--syntax-number': '#60a5fa',
            '--syntax-boolean': '#f87171',
            '--syntax-comment': '#94a3b8',
            '--syntax-value': '#f8fafc',
        },
    },
    'storm-cloud': {
        name: 'Storm Cloud',
        colors: {
            // Surface A: Cloud White/Grey (Light)
            '--bg-surface-A-main': '#f1f5f9', // slate-100
            '--bg-surface-A-elevated': '#e2e8f0', // slate-200

            // Surface B: Thunder Blue/Grey (Dark Panels)
            '--bg-surface-B-panel': 'rgba(30, 41, 59, 0.95)', // slate-800/95
            '--bg-surface-B-panel-opaque': '#1e293b', // slate-800
            '--bg-surface-B-modal': 'rgba(30, 41, 59, 0.98)',

            // Text on Surface A (Light)
            '--text-on-A-primary': '#0f172a', // slate-900
            '--text-on-A-secondary': '#475569', // slate-600

            // Text on Surface B (Dark)
            '--text-on-B-primary': '#f8fafc', // slate-50
            '--text-on-B-secondary': '#94a3b8', // slate-400

            // Borders
            '--border-on-A': 'rgba(15, 23, 42, 0.1)',
            '--border-on-B': 'rgba(255, 255, 255, 0.15)',

            // Universal
            '--text-on-accent': '#ffffff',
            '--border-on-accent': 'rgba(255, 255, 255, 0.15)',

            // Glass System (Surface B is Dark)
            '--bg-glass-B-1': 'rgba(30, 41, 59, 0.10)',
            '--bg-glass-B-2': 'rgba(30, 41, 59, 0.30)',
            '--bg-glass-B-3': 'rgba(30, 41, 59, 0.40)',
            '--bg-glass-B-4': 'rgba(30, 41, 59, 0.50)',
            '--bg-glass-B-5': 'rgba(30, 41, 59, 0.60)',
            '--bg-glass-B-6': 'rgba(30, 41, 59, 0.70)',

            // Glass System (Accent - Affinity Specific)
            '--bg-glass-accent-on-A-1': 'rgba(3, 105, 161, 0.10)', // sky-700 for visibility on light Surface A
            '--bg-glass-accent-on-A-2': 'rgba(3, 105, 161, 0.20)',
            '--bg-glass-accent-on-A-3': 'rgba(3, 105, 161, 0.30)',
            '--bg-glass-accent-on-B-1': 'rgba(14, 165, 233, 0.10)',
            '--bg-glass-accent-on-B-2': 'rgba(14, 165, 233, 0.20)',
            '--bg-glass-accent-on-B-3': 'rgba(14, 165, 233, 0.30)',

            // Accents (Electric Blue)
            '--primary-accent': '#0ea5e9', // sky-500
            '--primary-accent-hover': '#0284c7', // sky-600
            '--primary-accent-glow': 'rgba(14, 165, 233, 0.5)',
            '--secondary-accent': '#38bdf8', // sky-400
            '--tertiary-accent': '#7dd3fc', // sky-300
            '--accent-gradient-from': '#0ea5e9',
            '--accent-gradient-via': '#38bdf8',
            '--accent-gradient-to': '#7dd3fc',
            '--bg-ambient-accent-primary': '#0ea5e9', // sky-500
            '--bg-ambient-accent-secondary': '#38bdf8', // sky-400
            '--bg-ambient-accent-tertiary': '#7dd3fc', // sky-300

            // Status Colors
            '--color-success': '#22c55e',
            '--color-error': '#ef4444',
            '--color-warning': '#eab308',
            '--color-info': '#0ea5e9',

            // Chart Colors
            '--chart-1': '#0ea5e9',
            '--chart-2': '#38bdf8',
            '--chart-3': '#7dd3fc',
            '--chart-4': '#6366f1',
            '--chart-5': '#8b5cf6',
            '--chart-6': '#f43f5e',
            '--chart-7': '#fbbf24',
            '--chart-8': '#a3e635',
            '--chart-9': '#4ade80',
            '--chart-10': '#94a3b8',

            // Extended Chart Colors (11-31)
            '--chart-11': '#fb7185',
            '--chart-12': '#22d3ee',
            '--chart-13': '#f472b6',
            '--chart-14': '#9ca3af',
            '--chart-15': '#a3e635',
            '--chart-16': '#a78bfa',
            '--chart-17': '#34d399',
            '--chart-18': '#60a5fa',
            '--chart-19': '#fbbf24',
            '--chart-20': '#c084fc',
            '--chart-21': '#2dd4bf',
            '--chart-22': '#fb923c',
            '--chart-23': '#e11d48',
            '--chart-24': '#0891b2',
            '--chart-25': '#ef4444',
            '--chart-26': '#6366f1',
            '--chart-27': '#10b981',
            '--chart-28': '#3b82f6', // Input
            '--chart-29': '#d946ef', // Calc
            '--chart-30': '#22c55e', // Result
            '--chart-31': '#eab308', // Check

            // Syntax Highlighting
            '--syntax-tag': '#0ea5e9',
            '--syntax-attr': '#38bdf8',
            '--syntax-string': '#22c55e',
            '--syntax-number': '#eab308',
            '--syntax-boolean': '#ef4444',
            '--syntax-comment': '#64748b',
            '--syntax-value': '#0f172a',
        },
    },
    'forest-whisper': {
        name: 'Forest Whisper',
        colors: {
            // Surface A: Deepest Forest Green
            '--bg-surface-A-main': '#022c22', // emerald-950 (darker)
            '--bg-surface-A-elevated': '#064e3b', // emerald-900

            // Surface B: Dark Green Panels (Lighter than A)
            '--bg-surface-B-panel': 'rgba(6, 78, 59, 0.95)', // emerald-900/95
            '--bg-surface-B-panel-opaque': '#064e3b', // emerald-900
            '--bg-surface-B-modal': 'rgba(6, 78, 59, 0.98)',

            // Text on Surface A
            '--text-on-B-primary': '#ecfdf5', // emerald-50
            '--text-on-B-secondary': '#6ee7b7', // emerald-300

            // Text on Surface B
            '--text-on-A-primary': '#ecfdf5', // emerald-50
            '--text-on-A-secondary': '#6ee7b7', // emerald-300

            // Borders
            '--border-on-A': 'rgba(16, 185, 129, 0.15)',
            '--border-on-B': 'rgba(16, 185, 129, 0.2)',

            // Universal
            '--text-on-accent': '#ffffff',
            '--border-on-accent': 'rgba(255, 255, 255, 0.15)',

            // Glass System
            '--bg-glass-B-1': 'rgba(6, 78, 59, 0.10)',
            '--bg-glass-B-2': 'rgba(6, 78, 59, 0.30)',
            '--bg-glass-B-3': 'rgba(6, 78, 59, 0.40)',
            '--bg-glass-B-4': 'rgba(6, 78, 59, 0.50)',
            '--bg-glass-B-5': 'rgba(6, 78, 59, 0.60)',
            '--bg-glass-B-6': 'rgba(6, 78, 59, 0.70)',

            // Glass System (Accent)
            '--bg-glass-accent-on-A-1': 'rgba(52, 211, 153, 0.10)',
            '--bg-glass-accent-on-A-2': 'rgba(52, 211, 153, 0.20)',
            '--bg-glass-accent-on-A-3': 'rgba(52, 211, 153, 0.30)',
            '--bg-glass-accent-on-B-1': 'rgba(52, 211, 153, 0.10)',
            '--bg-glass-accent-on-B-2': 'rgba(52, 211, 153, 0.20)',
            '--bg-glass-accent-on-B-3': 'rgba(52, 211, 153, 0.30)',

            // Accents
            '--primary-accent': '#10b981', // emerald-500
            '--primary-accent-hover': '#059669', // emerald-600
            '--primary-accent-glow': 'rgba(16, 185, 129, 0.5)',
            '--secondary-accent': '#84cc16', // lime-500
            '--tertiary-accent': '#22c55e', // green-500
            '--accent-gradient-from': '#10b981',
            '--accent-gradient-via': '#84cc16',
            '--accent-gradient-to': '#22c55e',
            '--bg-ambient-accent-primary': '#10b981', // emerald-500
            '--bg-ambient-accent-secondary': '#84cc16', // lime-500
            '--bg-ambient-accent-tertiary': '#22c55e', // green-500

            // Status Colors
            '--color-success': '#4ade80',
            '--color-error': '#f87171',
            '--color-warning': '#facc15',
            '--color-info': '#38bdf8',

            // Chart Colors
            '--chart-1': '#10b981',
            '--chart-2': '#84cc16',
            '--chart-3': '#22c55e',
            '--chart-4': '#facc15',
            '--chart-5': '#f87171',
            '--chart-6': '#38bdf8',
            '--chart-7': '#a3e635',
            '--chart-8': '#4ade80',
            '--chart-9': '#fbbf24',
            '--chart-10': '#60a5fa',

            // Extended Chart Colors (11-31)
            '--chart-11': '#fb7185',
            '--chart-12': '#22d3ee',
            '--chart-13': '#f472b6',
            '--chart-14': '#9ca3af',
            '--chart-15': '#a3e635',
            '--chart-16': '#a78bfa',
            '--chart-17': '#34d399',
            '--chart-18': '#60a5fa',
            '--chart-19': '#fbbf24',
            '--chart-20': '#c084fc',
            '--chart-21': '#2dd4bf',
            '--chart-22': '#fb923c',
            '--chart-23': '#e11d48',
            '--chart-24': '#0891b2',
            '--chart-25': '#ef4444',
            '--chart-26': '#6366f1',
            '--chart-27': '#10b981',
            '--chart-28': '#3b82f6', // Input
            '--chart-29': '#d946ef', // Calc
            '--chart-30': '#22c55e', // Result
            '--chart-31': '#eab308', // Check

            // Syntax Highlighting
            '--syntax-tag': '#10b981',
            '--syntax-attr': '#84cc16',
            '--syntax-string': '#facc15',
            '--syntax-number': '#38bdf8',
            '--syntax-boolean': '#f87171',
            '--syntax-comment': '#6ee7b7',
            '--syntax-value': '#ecfdf5',
        },
    },
    'crimson-tide': {
        name: 'Crimson Tide',
        colors: {
            // Surface A: Abyssal Red/Black
            '--bg-surface-A-main': '#2a0a0a', // very dark red
            '--bg-surface-A-elevated': '#450a0a', // red-950

            // Surface B: Dark Red Panels (Lighter than A)
            '--bg-surface-B-panel': 'rgba(69, 10, 10, 0.95)', // red-950/95
            '--bg-surface-B-panel-opaque': '#450a0a', // red-950
            '--bg-surface-B-modal': 'rgba(69, 10, 10, 0.98)',

            // Text on Surface A
            '--text-on-B-primary': '#fef2f2', // red-50
            '--text-on-B-secondary': '#fca5a5', // red-300

            // Text on Surface B
            '--text-on-A-primary': '#fef2f2', // red-50
            '--text-on-A-secondary': '#fca5a5', // red-300

            // Borders
            '--border-on-A': 'rgba(220, 38, 38, 0.2)',
            '--border-on-B': 'rgba(220, 38, 38, 0.25)',

            // Universal
            '--text-on-accent': '#ffffff',
            '--border-on-accent': 'rgba(255, 255, 255, 0.15)',

            // Glass System
            '--bg-glass-B-1': 'rgba(69, 10, 10, 0.10)',
            '--bg-glass-B-2': 'rgba(69, 10, 10, 0.30)',
            '--bg-glass-B-3': 'rgba(69, 10, 10, 0.40)',
            '--bg-glass-B-4': 'rgba(69, 10, 10, 0.50)',
            '--bg-glass-B-5': 'rgba(69, 10, 10, 0.60)',
            '--bg-glass-B-6': 'rgba(69, 10, 10, 0.70)',

            // Glass System (Accent)
            '--bg-glass-accent-on-A-1': 'rgba(239, 68, 68, 0.10)',
            '--bg-glass-accent-on-A-2': 'rgba(239, 68, 68, 0.20)',
            '--bg-glass-accent-on-A-3': 'rgba(239, 68, 68, 0.30)',
            '--bg-glass-accent-on-B-1': 'rgba(239, 68, 68, 0.10)',
            '--bg-glass-accent-on-B-2': 'rgba(239, 68, 68, 0.20)',
            '--bg-glass-accent-on-B-3': 'rgba(239, 68, 68, 0.30)',

            // Accents
            '--primary-accent': '#ef4444', // red-500
            '--primary-accent-hover': '#dc2626', // red-600
            '--primary-accent-glow': 'rgba(239, 68, 68, 0.5)',
            '--secondary-accent': '#f97316', // orange-500
            '--tertiary-accent': '#b91c1c', // red-700
            '--accent-gradient-from': '#ef4444',
            '--accent-gradient-via': '#f97316',
            '--accent-gradient-to': '#b91c1c',
            '--bg-ambient-accent-primary': '#ef4444', // red-500
            '--bg-ambient-accent-secondary': '#f97316', // orange-500
            '--bg-ambient-accent-tertiary': '#b91c1c', // red-700

            // Status Colors
            '--color-success': '#22c55e',
            '--color-error': '#991b1b', // dark red for error on red bg? maybe brighter
            '--color-warning': '#f59e0b',
            '--color-info': '#3b82f6',

            // Chart Colors
            '--chart-1': '#ef4444',
            '--chart-2': '#f97316',
            '--chart-3': '#b91c1c',
            '--chart-4': '#f59e0b',
            '--chart-5': '#fbbf24',
            '--chart-6': '#dc2626',
            '--chart-7': '#ea580c',
            '--chart-8': '#991b1b',
            '--chart-9': '#c2410c',
            '--chart-10': '#7f1d1d',

            // Extended Chart Colors (11-31)
            '--chart-11': '#fb7185',
            '--chart-12': '#22d3ee',
            '--chart-13': '#f472b6',
            '--chart-14': '#9ca3af',
            '--chart-15': '#a3e635',
            '--chart-16': '#a78bfa',
            '--chart-17': '#34d399',
            '--chart-18': '#60a5fa',
            '--chart-19': '#fbbf24',
            '--chart-20': '#c084fc',
            '--chart-21': '#2dd4bf',
            '--chart-22': '#fb923c',
            '--chart-23': '#e11d48',
            '--chart-24': '#0891b2',
            '--chart-25': '#ef4444',
            '--chart-26': '#6366f1',
            '--chart-27': '#10b981',
            '--chart-28': '#3b82f6', // Input
            '--chart-29': '#d946ef', // Calc
            '--chart-30': '#22c55e', // Result
            '--chart-31': '#eab308', // Check

            // Syntax Highlighting
            '--syntax-tag': '#ef4444',
            '--syntax-attr': '#f97316',
            '--syntax-string': '#fbbf24',
            '--syntax-number': '#3b82f6',
            '--syntax-boolean': '#991b1b',
            '--syntax-comment': '#fca5a5',
            '--syntax-value': '#fef2f2',
        },
    },
    'lavender-mist': {
        name: 'Lavender Mist',
        colors: {
            // Surface A: Pure White
            '--bg-surface-A-main': '#ffffff',
            '--bg-surface-A-elevated': '#faf5ff', // purple-50

            // Surface B: Pale Purple Panels (Darker than A)
            '--bg-surface-B-panel': 'rgba(243, 232, 255, 0.95)', // purple-100/95
            '--bg-surface-B-panel-opaque': '#f3e8ff', // purple-100
            '--bg-surface-B-modal': 'rgba(243, 232, 255, 0.98)',

            // Text on Surface A
            '--text-on-B-primary': '#3b0764', // purple-950
            '--text-on-B-secondary': '#6b21a8', // purple-800

            // Text on Surface B
            '--text-on-A-primary': '#3b0764', // purple-950
            '--text-on-A-secondary': '#6b21a8', // purple-800

            // Borders
            '--border-on-A': 'rgba(147, 51, 234, 0.15)',
            '--border-on-B': 'rgba(147, 51, 234, 0.2)',

            // Universal
            '--text-on-accent': '#ffffff',
            '--border-on-accent': 'rgba(255, 255, 255, 0.2)',

            // Glass System
            '--bg-glass-B-1': 'rgba(243, 232, 255, 0.10)',
            '--bg-glass-B-2': 'rgba(243, 232, 255, 0.20)',
            '--bg-glass-B-3': 'rgba(243, 232, 255, 0.30)',
            '--bg-glass-B-4': 'rgba(243, 232, 255, 0.60)',
            '--bg-glass-B-5': 'rgba(243, 232, 255, 0.80)',
            '--bg-glass-B-6': 'rgba(243, 232, 255, 0.90)',

            // Glass System (Accent)
            '--bg-glass-accent-on-A-1': 'rgba(168, 85, 247, 0.10)',
            '--bg-glass-accent-on-A-2': 'rgba(168, 85, 247, 0.20)',
            '--bg-glass-accent-on-A-3': 'rgba(168, 85, 247, 0.30)',
            '--bg-glass-accent-on-B-1': 'rgba(168, 85, 247, 0.10)',
            '--bg-glass-accent-on-B-2': 'rgba(168, 85, 247, 0.20)',
            '--bg-glass-accent-on-B-3': 'rgba(168, 85, 247, 0.30)',

            // Accents
            '--primary-accent': '#a855f7', // purple-500
            '--primary-accent-hover': '#9333ea', // purple-600
            '--primary-accent-glow': 'rgba(168, 85, 247, 0.4)',
            '--secondary-accent': '#d8b4fe', // purple-300
            '--tertiary-accent': '#c084fc', // purple-400
            '--accent-gradient-from': '#a855f7',
            '--accent-gradient-via': '#c084fc',
            '--accent-gradient-to': '#d8b4fe',
            '--bg-ambient-accent-primary': '#a855f7', // purple-500
            '--bg-ambient-accent-secondary': '#c084fc', // purple-400
            '--bg-ambient-accent-tertiary': '#d8b4fe', // purple-300

            // Status Colors
            '--color-success': '#22c55e',
            '--color-error': '#ef4444',
            '--color-warning': '#f59e0b',
            '--color-info': '#3b82f6',

            // Chart Colors
            '--chart-1': '#a855f7',
            '--chart-2': '#c084fc',
            '--chart-3': '#d8b4fe',
            '--chart-4': '#e879f9',
            '--chart-5': '#f472b6',
            '--chart-6': '#818cf8',
            '--chart-7': '#60a5fa',
            '--chart-8': '#34d399',
            '--chart-9': '#fbbf24',
            '--chart-10': '#94a3b8',

            // Extended Chart Colors (11-31)
            '--chart-11': '#e11d48',
            '--chart-12': '#0891b2',
            '--chart-13': '#db2777',
            '--chart-14': '#4b5563',
            '--chart-15': '#65a30d',
            '--chart-16': '#7c3aed',
            '--chart-17': '#059669',
            '--chart-18': '#2563eb',
            '--chart-19': '#d97706',
            '--chart-20': '#9333ea',
            '--chart-21': '#0d9488',
            '--chart-22': '#ea580c',
            '--chart-23': '#be123c',
            '--chart-24': '#0e7490',
            '--chart-25': '#b91c1c',
            '--chart-26': '#4338ca',
            '--chart-27': '#15803d',
            '--chart-28': '#1d4ed8', // Input
            '--chart-29': '#a21caf', // Calc
            '--chart-30': '#15803d', // Result
            '--chart-31': '#854d0e', // Check

            // Syntax Highlighting
            '--syntax-tag': '#a855f7',
            '--syntax-attr': '#c084fc',
            '--syntax-string': '#22c55e',
            '--syntax-number': '#3b82f6',
            '--syntax-boolean': '#ef4444',
            '--syntax-comment': '#9ca3af',
            '--syntax-value': '#3b0764',
        },
    },
};
