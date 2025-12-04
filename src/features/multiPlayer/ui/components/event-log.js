import { eventBus } from '@/application/event-bus';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';

class EventLogComponent extends HTMLElement {
    constructor() {
        super();
        this.unsubscribeStore = null;
        this.unsubscribeEventBus = null;
        this.filter = 'all';
        this.streamIdFilter = 'all';
    }

    connectedCallback() {
        this.classList.add('block', 'h-full', 'w-full');
        this.render();
        this.unsubscribeStore = useMultiPlayerStore.subscribe(() =>
            this.render()
        );
        this.unsubscribeEventBus = eventBus.subscribe(
            'ui:multi-player:filter-log-to-stream',
            ({ streamId }) => {
                this.setStreamFilter(streamId);
            }
        );
    }

    disconnectedCallback() {
        if (this.unsubscribeStore) this.unsubscribeStore();
        if (this.unsubscribeEventBus) this.unsubscribeEventBus();
    }

    setFilter(newFilter) {
        this.filter = newFilter;
        this.render();
    }

    setStreamFilter(newStreamId) {
        this.streamIdFilter = String(newStreamId);
        this.render();
    }

    render() {
        const { eventLog, players } = useMultiPlayerStore.getState();

        let filteredLog = eventLog;

        if (this.filter !== 'all') {
            filteredLog = filteredLog.filter((e) => e.severity === this.filter);
        }

        if (this.streamIdFilter !== 'all') {
            filteredLog = filteredLog.filter(
                (e) => e.streamId === parseInt(this.streamIdFilter, 10)
            );
        }

        const filterButton = (label, type) => html`
            <button
                @click=${() => this.setFilter(type)}
                class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors border ${this
                    .filter === type
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'}"
            >
                ${label}
            </button>
        `;

        const severityConfig = {
            critical: {
                bg: 'bg-red-900/20',
                text: 'text-red-300',
                border: 'border-red-500/30',
                icon: icons.alertTriangle,
            },
            warning: {
                bg: 'bg-amber-900/20',
                text: 'text-amber-300',
                border: 'border-amber-500/30',
                icon: icons.info,
            },
            info: {
                bg: 'bg-slate-800/30',
                text: 'text-slate-400',
                border: 'border-slate-700/30',
                icon: icons.activity,
            },
        };

        // Removed fixed max-h calculation. Uses h-full to fill parent.
        const template = html`
            <div class="flex flex-col h-full w-full bg-slate-900">
                <!-- Filter Toolbar -->
                <div
                    class="p-3 flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900/95 backdrop-blur z-10 shrink-0"
                >
                    ${filterButton('All', 'all')}
                    ${filterButton('Critical', 'critical')}
                    ${filterButton('Warn', 'warning')}

                    <div class="grow"></div>

                    <div class="relative">
                        <select
                            @change=${(e) =>
                                this.setStreamFilter(e.target.value)}
                            .value=${this.streamIdFilter}
                            class="bg-slate-800 text-slate-300 rounded border border-slate-700 py-1 pl-2 pr-6 text-xs font-medium appearance-none cursor-pointer hover:bg-slate-700 hover:border-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="all">All Streams</option>
                            ${Array.from(players.values()).map(
                                (p) =>
                                    html`<option value=${p.streamId}>
                                        ${p.streamName}
                                    </option>`
                            )}
                        </select>
                        <div
                            class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 scale-75"
                        >
                            ${icons.chevronDown}
                        </div>
                    </div>
                </div>

                <!-- Log List -->
                <div class="grow overflow-y-auto custom-scrollbar">
                    ${filteredLog.length === 0
                        ? html`
                              <div
                                  class="flex flex-col items-center justify-center h-full text-slate-500 gap-3 opacity-60"
                              >
                                  <div class="scale-150">${icons.inbox}</div>
                                  <p
                                      class="text-xs font-bold uppercase tracking-wider"
                                  >
                                      No events found
                                  </p>
                              </div>
                          `
                        : html`
                              <div class="divide-y divide-slate-800/50">
                                  ${filteredLog.map((event) => {
                                      const style =
                                          severityConfig[event.severity] ||
                                          severityConfig.info;

                                      return html`
                                          <div
                                              class="p-3 hover:bg-white/[0.02] transition-colors group"
                                          >
                                              <div
                                                  class="flex justify-between items-start mb-1.5"
                                              >
                                                  <div
                                                      class="flex items-center gap-2 min-w-0"
                                                  >
                                                      <span
                                                          class="font-bold text-xs text-white truncate max-w-[180px]"
                                                          title="${event.streamName}"
                                                      >
                                                          ${event.streamName}
                                                      </span>
                                                      <span
                                                          class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${style.bg} ${style.text} ${style.border}"
                                                      >
                                                          ${event.type}
                                                      </span>
                                                  </div>
                                                  <span
                                                      class="font-mono text-[10px] text-slate-500 whitespace-nowrap ml-2"
                                                  >
                                                      ${event.timestamp.toLocaleTimeString()}
                                                  </span>
                                              </div>
                                              <div
                                                  class="flex gap-2 items-start"
                                              >
                                                  <span
                                                      class="${style.text} scale-75 mt-0.5 opacity-80"
                                                      >${style.icon}</span
                                                  >
                                                  <p
                                                      class="text-xs text-slate-400 font-mono leading-relaxed break-words"
                                                  >
                                                      ${event.details}
                                                  </p>
                                              </div>
                                          </div>
                                      `;
                                  })}
                              </div>
                          `}
                </div>
            </div>
        `;
        render(template, this);
    }
}

if (!customElements.get('event-log-component')) {
    customElements.define('event-log-component', EventLogComponent);
}
