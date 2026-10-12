
export class LayoutThemeRegistry {
    constructor() {
        this.themes = new Map();
        this.sheetCache = new Map(); // Cache for CSSStyleSheet objects: key -> CSSStyleSheet
    }

    register(theme) {
        if (!theme.id || !theme.css) {
            console.error('Invalid theme registration:', theme);
            return;
        }
        this.themes.set(theme.id, theme);
    }

    get(id) {
        return this.themes.get(id);
    }

    getAll() {
        return Array.from(this.themes.values());
    }

    /**
     * Returns a Constructible Stylesheet for the requested theme.
     * Caches the result to ensure reference equality (high performance).
     * 
     * @param {string} themeId 
     * @param {'global'|'shadow'} mode - 'shadow' will remap selectors to :host
     * @returns {CSSStyleSheet|null}
     */
    getThemeStyleSheet(themeId, mode = 'global') {
        const theme = this.get(themeId);
        if (!theme) return null;

        const cacheKey = `${themeId}:${mode}`;

        if (this.sheetCache.has(cacheKey)) {
            return this.sheetCache.get(cacheKey);
        }

        try {
            const sheet = new CSSStyleSheet();
            let cssContent = theme.css;

            if (mode === 'shadow') {
                // "State of the Art" Selector Mapping
                // Automatically allow the Host of the shadow root to act as the theme root
                cssContent = cssContent
                    .replaceAll('.theme-layer-overlay', ':host')
                    .replaceAll('.shell-root', ':host');
            }

            sheet.replaceSync(cssContent);
            this.sheetCache.set(cacheKey, sheet);
            return sheet;
        } catch (e) {
            console.error(`Failed to construct stylesheet for ${themeId}:`, e);
            return null;
        }
    }
    /**
     * Loads the global layout stylesheet (Tailwind) from /assets/main.css.
     * Use this to provide global styles to Shadow DOM components.
     * @returns {Promise<CSSStyleSheet>}
     */
    async loadGlobalStyles() {
        if (this.globalSheetPromise) return this.globalSheetPromise;

        this.globalSheetPromise = (async () => {
            try {
                const response = await fetch('/assets/main.css');
                if (!response.ok) throw new Error('Failed to load global styles');
                const text = await response.text();
                const sheet = new CSSStyleSheet();
                sheet.replaceSync(text);
                this.globalSheet = sheet;
                return sheet;
            } catch (e) {
                console.error('Failed to load global styles:', e);
                return new CSSStyleSheet(); // Return empty sheet on failure
            }
        })();

        return this.globalSheetPromise;
    }

    /**
     * Returns the cached global stylesheet if loaded.
     * @returns {CSSStyleSheet|null}
     */
    getGlobalStyleSheet() {
        return this.globalSheet || null;
    }
}

export const themeRegistry = new LayoutThemeRegistry();
