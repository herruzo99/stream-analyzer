import { formatDurationPill } from './badges/utils.js';

export class ManifestTimer extends HTMLElement {
    static get observedAttributes() {
        return ['target-time', 'prefix'];
    }

    constructor() {
        super();
        this._targetTime = null;
        this._prefix = '';
        this._isConnected = false;

        // Bind the tick handler once
        this._handleTick = this._handleTick.bind(this);
    }

    connectedCallback() {
        this._isConnected = true;
        this._targetTime = parseInt(
            this.getAttribute('target-time') || '0',
            10
        );
        this._prefix = this.getAttribute('prefix') || '';

        document.addEventListener('manifest-ticker-pulse', this._handleTick);

        // Initial update
        this._update(Date.now());
    }

    disconnectedCallback() {
        this._isConnected = false;
        document.removeEventListener('manifest-ticker-pulse', this._handleTick);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'target-time') {
            this._targetTime = parseInt(newValue, 10);
            if (this._isConnected) this._update(Date.now());
        } else if (name === 'prefix') {
            this._prefix = newValue;
            if (this._isConnected) this._update(Date.now());
        }
    }

    _handleTick(e) {
        if (!this._isConnected) return;
        this._update(e.detail.now);
    }

    _update(now) {
        if (!this._targetTime) return;

        const diffCheck = this._targetTime - now;
        const diffSec = diffCheck / 1000;
        const absDiffSec = Math.abs(diffSec);

        let text = '';

        // Format logic similar to SmartBadgeSystem
        if (this._prefix === 'Start') {
            // "Starts in X" or "Started X ago"
            const verb = diffCheck > 0 ? 'Starts' : 'Started';
            const preposition = diffCheck > 0 ? 'in' : 'ago';
            const timeStr = formatDurationPill(absDiffSec);

            // For future events (Starts in...), we want "Starts in 5.2s"
            // For past events (Started ...), we want "Started 5.2s ago"
            if (diffCheck > 0) {
                text = `${verb} in ${timeStr}`;
            } else {
                text = `${verb} ${timeStr} ${preposition}`;
            }
        } else {
            // Generic relative time

            text = `${diffCheck > 0 ? 'in ' : ''}${formatDurationPill(absDiffSec)}${diffCheck <= 0 ? ' ago' : ''}`;
        }

        // Only touch DOM if text changed
        if (this.textContent !== text) {
            this.textContent = text;
        }
    }
}

if (!customElements.get('manifest-timer')) {
    customElements.define('manifest-timer', ManifestTimer);
}
