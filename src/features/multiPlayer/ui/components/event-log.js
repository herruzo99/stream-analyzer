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
                class="px-2 py-1 text-[10px] font-bold r rounded transition-colors border ${this .filter === type ? 'bg-emerald-500/10 text-white border-emerald-400/25' : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-100 hover:border-slate-100'}"
            >
                ${label}
            </button>
        `;

        const severityConfig = {
            critical: {
                bg: 'bg-red-500/20',
                text: 'text-red-400',
                border: 'border-red-500/30',
                icon: icons.alertTriangle,
            },
            warning: {
                bg: 'bg-amber-500/20',
                text: 'text-amber-400',
                border: 'border-amber-500/30',
                icon: icons.info,
            },
            info: {
                bg: 'bg-white/5',
                text: 'text-slate-400',
                border: 'border-white/10',
                icon: icons.activity,
            },
        };

        // Removed fixed max-h calculation. Uses h-full to fill parent.
        const template = html`
            <div
                class="flex flex-col h-full w-full bg-white/5"
            >
                <!-- Filter Toolbar -->
                <div
                    class="p-3 flex flex-wrap items-center gap-2 border-b border-white/10 bg-white/5 z-10 shrink-0"
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
                            class="bg-white/5 text-slate-100 rounded border border-white/10 py-1 pl-2 pr-6 text-xs font-medium appearance-none cursor-pointer hover:bg-white/10 hover:border-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400/25"
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
                            class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 scale-75"
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
                                  class="flex flex-col items-center justify-center h-full text-slate-400 gap-3 opacity-60"
                              >
                                  <div class="scale-150">${icons.inbox}</div>
                                  <p
                                      class="text-xs font-bold r"
                                  >
                                      No events found
                                  </p>
                              </div>
                          `
                : html`
                              <div class="divide-y divide-white/10">
                                  ${filteredLog.map((event) => {
                    const style =
                        severityConfig[event.severity] ||
                        severityConfig.info;

                    return html`
                                          <div
                                              class="p-3 hover:bg-white/10 transition-colors group"
                                          >
                                              <div
                                                  class="flex justify-between items-start mb-1.5"
                                              >
                                                  <div
                                                      class="flex items-center gap-2 min-w-0"
                                                  >
                                                      <span
                                                          class="font-bold text-xs text-slate-100 truncate max-w-[180px]"
                                                          title="${event.streamName}"
                                                      >
                                                          ${event.streamName}
                                                      </span>
                                                      <span
                                                          class="px-1.5 py-0.5 rounded text-[9px] font-bold border ${style.bg} ${style.text} ${style.border}"
                                                      >
                                                          ${event.type}
                                                      </span>
                                                  </div>
                                                  <span
                                                      class="font-mono text-[10px] text-slate-400 whitespace-nowrap ml-2"
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
