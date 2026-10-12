const css = (strings, ...values) => {
    return strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');
};

/**
 * Common layout styles that consume the Shell's CSS variables.
 * Import this in your Lit components and add to the `static styles` array.
 */
export const layoutStyles = css`
    :host {
        display: block;
    }

    /* 
     * The Standard "Card" or "Region" container.
     * Automatically adapts to Glass (Prism) or Solid (Pro) modes.
     */
    .layout-card {
        border-radius: var(--region-radius);
        backdrop-filter: var(--region-backdrop);
        -webkit-backdrop-filter: var(--region-backdrop);
        box-shadow: var(--region-shadow);
        transition: var(--region-transition);
        
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    /* Headers within layout cards */
    .layout-header {
        padding: var(--region-padding);
        background: rgba(255, 255, 255, 0.02);
        display: flex;
        align-items: center;
        gap: var(--region-gap);
    }

    /* Content body */
    .layout-body {
        padding: var(--region-padding);
        gap: var(--region-gap);
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow-y: auto;
    }

    /* Action bar / Footer */
    .layout-footer {
        padding: calc(var(--region-padding) * 0.75);
        background: rgba(0, 0, 0, 0.1);
    }
`;
