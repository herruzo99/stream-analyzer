import { icons, createElement } from 'lucide';

class IconComponent extends HTMLElement {
    static observedAttributes = ['name', 'class'];

    connectedCallback() {
        this.renderIcon();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.renderIcon();
        }
    }

    renderIcon() {
        // Clear any previous content
        while (this.firstChild) {
            this.removeChild(this.firstChild);
        }

        const name = this.getAttribute('name') || 'alert-triangle';
        const classes = this.getAttribute('class') || '';

        const iconKey = name
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');
        const iconKeyLower = iconKey.charAt(0).toLowerCase() + iconKey.slice(1);

        let iconNode = icons[iconKey] || icons[iconKeyLower] || icons[name];

        if (!iconNode) {
            console.warn(`[IconComponent] Lucide icon "${name}" not found.`);
            iconNode = icons['AlertTriangle'];
        }

        try {
            // Use lucide's built-in function to create the SVG element
            const svgElement = createElement(iconNode);

            // Add the classes passed to the custom element
            const existingClasses = svgElement.getAttribute('class') || '';
            svgElement.setAttribute(
                'class',
                `${existingClasses} ${classes}`.trim()
            );

            // If the icon wasn't found, add a class to color it red
            if (!icons[iconKey] && !icons[iconKeyLower] && !icons[name]) {
                svgElement.classList.add('text-red-500');
            }

            this.appendChild(svgElement);
        } catch (e) {
            console.error(`Failed to create icon "${name}":`, e);
            // Render a fallback error icon if creation fails
            const errorIcon = createElement(icons['AlertTriangle']);
            errorIcon.setAttribute(
                'class',
                `lucide lucide-alert-triangle text-red-500 ${classes}`
            );
            this.appendChild(errorIcon);
        }
    }
}

if (!customElements.get('icon-component')) {
    customElements.define('icon-component', IconComponent);
}
