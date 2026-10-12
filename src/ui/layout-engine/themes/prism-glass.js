

export const prismGlassTheme = {
    id: 'prism-glass',
    name: 'Prism of Light (Glass)',
    layoutConfig: {
        topBarSpansSubNav: true
    },
    css: `
        /* Variables specific to this theme */
        /* Variables specific to this theme */
        .shell-root, .theme-layer-overlay {
            --shell-gap: 12px;
            --shell-padding: 12px;
            --shell-radius: 2rem;
            --shell-nav-width: 280px;

            /* Transition Variables */
            --shell-curve: cubic-bezier(0.4, 0, 0.2, 1);
            --shell-transition-standard: all 0.4s var(--shell-curve);
            --shell-transition-transform: transform 0.4s var(--shell-curve);
            --shell-transition-opacity: opacity 0.4s var(--shell-curve);
            --shell-enter-transform: scale(0.99) translateY(4px);
            --shell-idle-transform: scale(1) translateY(0);
        }

        /* Root Grid Layout & Hooks */
        .shell-root, .theme-layer-overlay {
            --region-radius: 2rem;
            --region-gap: 24px; /* Double the shell gap as requested */
            --region-padding: 24px;
            /* Improved floating glass shadow, no hard borders, soft deep diffusion */
            --region-shadow: 0 20px 40px -4px rgba(0, 0, 0, 0.4);
            --region-backdrop: blur(24px);
            --region-transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            
            /* Shell Defaults */
            --shell-gap: 12px;
            --shell-padding: 12px;
            --shell-radius: 2rem;
            --shell-transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            --shell-nav-width: 280px;
        }

        .shell-root {
            display: flex;
            flex-direction: row;
            /* REMOVED GAP: We manage spacing via margins on children to allow full collapsing */
            gap: 0; 
            padding: var(--shell-padding);
            background: transparent;
        }

        /* Common Glass Pane Style */
        .shell-pane {
            /* Transition all layout properties for smooth resizing */
            transition: 
                width 0.4s var(--shell-curve), 
                height 0.4s var(--shell-curve), 
                flex-basis 0.4s var(--shell-curve), 
                margin 0.4s var(--shell-curve),
                padding 0.4s var(--shell-curve),
                var(--shell-transition-opacity),
                var(--shell-transition-transform);
            
            /* Softened borders and shadows */
            box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.2); 
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border-radius: var(--shell-radius);
            overflow: hidden;
            /* Essential for flex children to not explode */
            min-width: 0;
            min-height: 0;
        }

        /* Specific Slot Styles - REMOVED GRID AREAS */
        .shell-slot-global-nav {
            background: var(--bg-glass-B-4);
            z-index: 70;
            /* Fixed width usually, but controlled by inline style */
        }

        .shell-slot-sub-nav {
            background: var(--bg-glass-B-3);
            z-index: 60;
        }

        .shell-root .shell-slot-top-bar {
            background: var(--bg-glass-B-5);
            border-radius: 1.5rem;
            z-index: 50;
            display: flex;
            align-items: center;
            padding: 0 1.25rem; /* Horizontal padding only by default, vertical handled by specific view config if needed, but here we override generic padding */
            padding-left: 1.25rem !important;
            padding-right: 1.25rem !important;
            /* For Prism Glass, we want some vertical padding even if padded-slot is off, or specific if on. 
               Actually, let's just enforce a good default. */
            padding: 0.75rem 1.5rem !important; 
            flex-shrink: 0; /* Never shrink vertically */
        }

        .shell-slot-main {
            background: var(--bg-glass-B-2);
            border: none;
            z-index: 40;
            position: relative;
        }

        .shell-slot-bottom-bar {
            background: var(--bg-glass-B-4);
            border-radius: 1.5rem;
            z-index: 50;
            padding: 1rem;
            flex-shrink: 0; /* Never shrink vertically */
        }

        .shell-slot-right-sidebar {
            background: var(--bg-glass-B-5);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 80;
        }

        /* Mobile Adjustments */
        /* For mobile, the AppShell usually stacks or hides. 
           With Flexbox, we might need a media query if the JS doesn't handle it fully. 
           But usually uiStore handles 'compact' states. */
    `
};
