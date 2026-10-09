/**
 * <base-dropdown> — dropdown panel container.
 *
 * Reconstructed for the port (referenced but never committed). Usage
 * across menus shows a pure container: an optional `[slot="header"]`
 * plus scrollable body content. Open/close/positioning stay in
 * `dropdownService.toggleDropdown`, which renders these templates; this
 * element only owns the panel layout.
 *
 * Shadow slots are used so `slot="header"` actually distributes; content
 * keeps its document-level Tailwind classes.
 */
class BaseDropdown extends HTMLElement {
    constructor() {
        super();
        const root = this.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = [
            ':host{display:flex;flex-direction:column;min-height:0;overflow:hidden}',
            '.bd-head{display:block;flex:none}',
            '.bd-body{flex:1 1 auto;min-height:0;overflow-y:auto}',
            '.bd-body::slotted(*){min-width:0}',
        ].join('');
        const head = document.createElement('div');
        head.className = 'bd-head';
        const headSlot = document.createElement('slot');
        headSlot.name = 'header';
        head.appendChild(headSlot);
        const body = document.createElement('div');
        body.className = 'bd-body';
        const bodySlot = document.createElement('slot');
        body.appendChild(bodySlot);
        root.append(style, head, body);
    }
}

if (!customElements.get('base-dropdown')) {
    customElements.define('base-dropdown', BaseDropdown);
}
