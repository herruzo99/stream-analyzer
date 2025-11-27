import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { trackTableTemplate } from './shared.js';

// For this specific component, we can use a simplified local tab state approach
// or leverage the existing store if we add a key. Let's use a custom element to hold local state
// to avoid polluting the global store with view-specific ephemeral state.

class SummaryTracksPanel extends HTMLElement {
    constructor() {
        super();
        this.activeTab = 'video';
        this._vm = null;
    }

    set vm(val) {
        this._vm = val;
        this.render();
    }

    render() {
        if (!this._vm) return;

        const tabs = [
            {
                key: 'video',
                label: 'Video',
                count: this._vm.videoTracks.length,
                icon: icons.clapperboard,
            },
            {
                key: 'audio',
                label: 'Audio',
                count: this._vm.audioTracks.length,
                icon: icons.audioLines,
            },
            {
                key: 'text',
                label: 'Text',
                count: this._vm.textTracks.length,
                icon: icons.fileText,
            },
        ];

        const setActive = (key) => {
            this.activeTab = key;
            this.render();
        };

        let content;
        if (this.activeTab === 'video')
            content = trackTableTemplate(this._vm.videoTracks, 'video');
        else if (this.activeTab === 'audio')
            content = trackTableTemplate(this._vm.audioTracks, 'audio');
        else content = trackTableTemplate(this._vm.textTracks, 'text');

        const template = html`
            <div class="flex flex-col">
                <div
                    class="flex border-b border-slate-700/50 bg-slate-900/30 px-4"
                >
                    ${tabs.map(
                        (tab) => html`
                            <button
                                @click=${() => setActive(tab.key)}
                                class="flex items-center gap-2 py-3 px-4 border-b-2 transition-colors text-sm font-semibold ${this
                                    .activeTab === tab.key
                                    ? 'border-blue-500 text-white'
                                    : 'border-transparent text-slate-400 hover:text-slate-200'}"
                            >
                                ${tab.icon} ${tab.label}
                                <span
                                    class="bg-slate-800 text-slate-500 px-1.5 rounded-full text-[10px]"
                                    >${tab.count}</span
                                >
                            </button>
                        `
                    )}
                </div>
                <div class="p-4">${content}</div>
            </div>
        `;

        render(template, this);
    }
}

customElements.define('summary-tracks-panel', SummaryTracksPanel);

export const tracksPanelTemplate = (vm) =>
    html`<summary-tracks-panel .vm=${vm}></summary-tracks-panel>`;
