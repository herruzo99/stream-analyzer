import { html, render } from 'lit-html';
import * as icons from '@/ui/icons';
import { eventBus } from '@/application/event-bus';
import { showToast } from '@/ui/components/toast';

const applyAction = (type, delta = 0, selectedCount) => {
    if (selectedCount === 0) {
        showToast({
            message: 'No players selected for this action.',
            type: 'warn',
        });
        return;
    }
    eventBus.dispatch('ui:multi-player:apply-to-selected', {
        action: { type, delta },
    });
};

const playbackControlsTemplate = ({ selectedCount }) => {
    const isDisabled = selectedCount === 0;

    const buttonClasses = `
        bg-gray-700/50 hover:bg-gray-600/50 text-white font-bold
        p-2 rounded-md transition-colors flex-1 flex items-center
        justify-center disabled:opacity-50 disabled:cursor-not-allowed
    `;
    const smallButtonClasses = `${buttonClasses} text-sm`;
    const primaryButtonClasses = `!bg-blue-600/80 hover:!bg-blue-700/80`;

    return html`
        <div
            class="bg-gray-800 p-3 rounded-lg border border-gray-700 space-y-3"
        >
            <h4 class="text-md font-bold text-gray-300">
                Selected Player Actions (${selectedCount})
            </h4>
            <div class="flex items-center justify-center gap-2">
                <button
                    @click=${() =>
                        applyAction('seek-frame-backward', 0, selectedCount)}
                    class=${smallButtonClasses}
                    title="Previous Frame"
                    .disabled=${isDisabled}
                >
                    ${icons.frameBackward}
                </button>
                <button
                    @click=${() => applyAction('seek', -10, selectedCount)}
                    class=${smallButtonClasses}
                    title="Rewind 10s"
                    .disabled=${isDisabled}
                >
                    -10s
                </button>
                <button
                    @click=${() => applyAction('pause', 0, selectedCount)}
                    class=${buttonClasses}
                    title="Pause"
                    .disabled=${isDisabled}
                >
                    ${icons.pause}
                </button>
                <button
                    @click=${() => applyAction('play', 0, selectedCount)}
                    class=${`${buttonClasses} ${primaryButtonClasses}`}
                    title="Play"
                    .disabled=${isDisabled}
                >
                    ${icons.play}
                </button>
                <button
                    @click=${() => applyAction('seek', 10, selectedCount)}
                    class=${smallButtonClasses}
                    title="Forward 10s"
                    .disabled=${isDisabled}
                >
                    +10s
                </button>
                <button
                    @click=${() =>
                        applyAction('seek-frame-forward', 0, selectedCount)}
                    class=${smallButtonClasses}
                    title="Next Frame"
                    .disabled=${isDisabled}
                >
                    ${icons.frameForward}
                </button>
            </div>
        </div>
    `;
};

export class PlaybackControlsComponent extends HTMLElement {
    constructor() {
        super();
        this._selectedCount = 0;
    }

    static get observedAttributes() {
        return ['selected-count'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'selected-count' && oldValue !== newValue) {
            this._selectedCount = parseInt(newValue, 10);
            this.render();
        }
    }

    connectedCallback() {
        this.render();
    }

    render() {
        render(
            playbackControlsTemplate({ selectedCount: this._selectedCount }),
            this
        );
    }
}

customElements.define('playback-controls', PlaybackControlsComponent);
