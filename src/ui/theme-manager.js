import { useUiStore } from '@/state/uiStore';
import { THEMES } from './themes.js';

class ThemeManager extends HTMLElement {
    constructor() {
        super();
        this.unsub = null;
    }

    connectedCallback() {
        this.unsub = useUiStore.subscribe((state) => {
            this.applyTheme(state.theme);
        });

        // Initial application
        const { theme } = useUiStore.getState();
        this.applyTheme(theme);
    }

    disconnectedCallback() {
        if (this.unsub) {
            this.unsub();
        }
    }

    applyTheme(themeId) {
        // Prevent redundant application
        if (this.currentThemeId === themeId) return;
        this.currentThemeId = themeId;

        // Clean up existing listener if any
        if (this.mediaQueryList) {
            this.mediaQueryList.removeEventListener(
                'change',
                this.handleSystemThemeChange
            );
            this.mediaQueryList = null;
        }

        let targetThemeId = themeId;

        if (themeId === 'system') {
            this.mediaQueryList = window.matchMedia(
                '(prefers-color-scheme: dark)'
            );
            // Bind the handler so we can remove it later
            this.handleSystemThemeChange = (e) => {
                const newThemeId = e.matches
                    ? 'standard-dark'
                    : 'standard-light';
                this._applyThemeProperties(newThemeId);
            };

            this.mediaQueryList.addEventListener(
                'change',
                this.handleSystemThemeChange
            );

            // Determine initial system theme
            targetThemeId = this.mediaQueryList.matches
                ? 'standard-dark'
                : 'standard-light';
        }

        this._applyThemeProperties(targetThemeId);
    }

    _applyThemeProperties(themeId) {
        const theme = THEMES[themeId] || THEMES['obsidian-amber'];
        const root = document.documentElement;

        // 1. Construct CSS String
        const cssRules = Object.entries(theme.colors)
            .map(([key, value]) => `${key}: ${value};`)
            .join('\n');

        const cssContent = `
            :root {
                ${cssRules}
            }
        `;

        // 2. Update/Create Style Tag
        let styleTag = document.getElementById('theme-styles');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'theme-styles';
            document.head.appendChild(styleTag);
        }
        styleTag.textContent = cssContent;

        // 3. Clean up inline styles (legacy cleanup)
        // Ensure inline styles don't override the style tag
        Object.keys(theme.colors).forEach(key => {
            if (root.style.getPropertyValue(key)) {
                root.style.removeProperty(key);
            }
        });

        // Also set a data-theme attribute for potential CSS selector usage
        root.setAttribute('data-theme', themeId);

        // Update favicon (static style)
        this.updateFavicon();
    }

    async updateFavicon() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // 1. Draw White Rounded Box Background
        ctx.beginPath();
        // roundRect(x, y, w, h, radii)
        ctx.roundRect(0, 0, 64, 64, 16); // 16px radius for 64px icon looks standard
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // 2. Prepare the icon (offscreen to tint it black)
        const img = new Image();
        img.src = '/icon.svg';

        await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
        });

        if (!img.complete || img.naturalWidth === 0) return;

        const offscreen = document.createElement('canvas');
        offscreen.width = 64;
        offscreen.height = 64;
        const offCtx = offscreen.getContext('2d');

        // Draw icon full width (touching edges)
        // Assuming square icon, or centering vertically if not
        offCtx.drawImage(img, 0, 0, 64, 64);

        // Tint to Black
        offCtx.globalCompositeOperation = 'source-in';
        offCtx.fillStyle = '#000000';
        offCtx.fillRect(0, 0, 64, 64);

        // 3. Draw tinted icon onto main canvas
        ctx.drawImage(offscreen, 0, 0);

        // Update favicon links
        /** @type {HTMLLinkElement} */
        const link =
            document.querySelector("link[rel*='icon']") ||
            document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = canvas.toDataURL();

        // Remove existing icons to force update
        document
            .querySelectorAll("link[rel*='icon']")
            .forEach((el) => el.remove());
        document.head.appendChild(link);
    }
}

customElements.define('theme-manager', ThemeManager);
