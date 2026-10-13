export class ManifestBadge extends HTMLElement {
    static get observedAttributes() {
        return ['start', 'end', 'spd', 'is-spd-active'];
    }

    constructor() {
        super();
        this._isConnected = false;
        this._handleTick = this._handleTick.bind(this);
    }

    connectedCallback() {
        this._isConnected = true;
        document.addEventListener('manifest-ticker-pulse', this._handleTick);
        this._update(Date.now()); // Initial fallback, usually overridden immediately
    }

    disconnectedCallback() {
        this._isConnected = false;
        document.removeEventListener('manifest-ticker-pulse', this._handleTick);
    }

    attributeChangedCallback() {
        if (this._isConnected) {
            this._update(Date.now());
        }
    }

    _handleTick(e) {
        if (!this._isConnected) return;
        this._update(e.detail.now);
    }

    _update(now) {
        const startStr = this.getAttribute('start');
        const endStr = this.getAttribute('end');

        if (!startStr) return;

        const start = parseInt(startStr, 10);
        const end = endStr ? parseInt(endStr, 10) : null;
        const epsilon = 100;

        let isLive = false;
        if (end) {
            if (now >= start - epsilon && now <= end + epsilon) {
                isLive = true;
            }
        } else {
            if (Math.abs(now - start) < epsilon) {
                isLive = true;
            }
        }

        // Apply Classes based on Live State
        // Base classes: ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4 cursor-help
        // Live: bg-[var(--bg-glass-accent-1)] text-[var(--color-error)] border border-[var(--color-error)]/50
        // Future: bg-[var(--bg-glass-accent-1)] text-[var(--primary-accent)] border border-[var(--primary-accent)]/30

        const baseClasses = 'ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center select-none whitespace-nowrap align-middle leading-none h-4 cursor-help transition-colors duration-200';
        const liveClasses = 'bg-[var(--bg-glass-accent-1)] text-[var(--color-error)] border border-[var(--color-error)]/50';
        const futureClasses = 'bg-[var(--bg-glass-accent-1)] text-[var(--primary-accent)] border border-[var(--primary-accent)]/30';

        this.className = `${baseClasses} ${isLive ? liveClasses : futureClasses}`;
    }
}

if (!customElements.get('manifest-badge')) {
    customElements.define('manifest-badge', ManifestBadge);
}
