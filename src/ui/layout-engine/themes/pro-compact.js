export const proCompactTheme = {
    id: 'pro-compact',
    name: 'Pro Compact (Dense)',
    layoutConfig: {
        topBarSpansSubNav: true
    },
    css: `
        /* Variables specific to this theme */
        .shell-root, .theme-layer-overlay {
            /* Standard Hooks for Internal Views */
            --region-radius: 0px;
            --region-gap: 0px; /* Dense packaging */
            --region-padding: 16px;
            --region-shadow: none;
            --region-backdrop: none;
            --region-transition: none;
            
            /* Shell Defaults */
            --shell-gap: 0px;
            --shell-padding: 0px;
            --shell-radius: 0px;
            
            /* Transition Variables (Disabled) */
            --shell-transition: none; 
            --shell-transition-standard: none;
            --shell-transition-transform: none;
            --shell-transition-opacity: none;
            --shell-enter-transform: none;
            --shell-idle-transform: none;

            --shell-nav-width: 280px;

            /* Force Opaque Backgrounds for Glass Elements */
            --bg-surface-B-panel: var(--bg-surface-B-panel-opaque);
            --bg-glass-B-6: var(--bg-surface-B-panel-opaque);
            --bg-glass-B-5: var(--bg-surface-B-panel-opaque);
            --bg-glass-B-4: var(--bg-surface-B-panel-opaque);
            --bg-glass-B-3: var(--bg-surface-B-panel-opaque);
            --bg-glass-B-2: var(--bg-surface-B-panel-opaque);
            --bg-glass-B-1: var(--bg-surface-B-panel-opaque);
        }

        .shell-root {
            display: flex; /* Flexbox switch */
            flex-direction: row;
            gap: 0;
            padding: 0;
            background: var(--bg-app); /* Solid opaque background */
        }

        /* Common Pane Style - Solid, Sharper */
        .shell-pane {
            transition: none;
            border: none;
            box-shadow: none;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
            border-radius: 0;
            overflow: hidden;
            /* Flex safety */
            min-width: 0;
            min-height: 0;
        }

        /* Specific Slot Styles */
        .shell-slot-global-nav {
            background: var(--bg-surface-B-panel);
            border-right: 1px solid var(--border-on-B);
            z-index: 70;
        }

        .shell-slot-sub-nav {
            background: var(--bg-surface-B-panel-opaque);
            border-right: 1px solid var(--border-on-B);
            z-index: 60;
        }

        .shell-slot-top-bar {
            background: var(--bg-surface-A-elevated);
            border-bottom: 1px solid var(--border-on-A);
            z-index: 50;
            display: flex;
            align-items: center;
            padding: 0 1rem;
            flex-shrink: 0; /* Never shrink vertically */
        }

        .shell-slot-main {
            background: var(--bg-surface-A-main);
            z-index: 40;
            position: relative;
        }

        .shell-slot-bottom-bar {
            background: var(--bg-surface-B-panel);
            border-top: 1px solid var(--border-on-B);
            z-index: 50;
            padding: 0.5rem 1rem;
            flex-shrink: 0; /* Never shrink vertically */
        }

        .shell-slot-right-sidebar {
            background: var(--bg-surface-B-panel);
            border-left: 1px solid var(--border-on-B);
            z-index: 80;
        }
    `
};
