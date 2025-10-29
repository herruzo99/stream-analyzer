import { html, render } from 'lit-html';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';

export class EventLogComponent extends HTMLElement {
    constructor() {
        super();
        this.unsubscribe = null;
        this.filter = 'all';
        this.streamIdFilter = 'all';
    }

    connectedCallback() {
        this.render();
        this.unsubscribe = useMultiPlayerStore.subscribe(() => this.render());
    }

    disconnectedCallback() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }

    setFilter(newFilter) {
        this.filter = newFilter;
        this.render();
    }

    setStreamFilter(newStreamId) {
        this.streamIdFilter = newStreamId;
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
                class="px-2 py-1 text-xs font-semibold rounded-md transition-colors ${this
                    .filter === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}"
            >
                ${label}
            </button>
        `;

        const severityClasses = {
            critical: 'bg-red-800 text-red-200',
            warning: 'bg-yellow-800 text-yellow-200',
        };

        const template = html`
            <div
                class="bg-gray-800 rounded-lg border border-gray-700 flex flex-col h-full max-h-[calc(100vh-12rem)]"
            >
                <div class="p-3 border-b border-gray-700 shrink-0">
                    <h4 class="font-bold text-gray-200">QoE Event Log</h4>
                </div>
                <div
                    class="p-3 flex flex-wrap items-center gap-2 border-b border-gray-700 shrink-0"
                >
                    ${filterButton('All', 'all')}
                    ${filterButton('Critical', 'critical')}
                    ${filterButton('Warnings', 'warning')}
                    <div class="grow"></div>
                    <select
                        @change=${(e) => this.setStreamFilter(e.target.value)}
                        class="bg-gray-700 text-white rounded-md border-gray-600 p-1 text-xs"
                    >
                        <option value="all">All Streams</option>
                        ${Array.from(players.values()).map(
                            (p) =>
                                html`<option value=${p.streamId}>
                                    ${p.streamName}
                                </option>`
                        )}
                    </select>
                </div>
                <div class="grow overflow-y-auto">
                    ${filteredLog.length === 0
                        ? html`
                              <div
                                  class="text-center text-sm text-gray-500 p-8"
                              >
                                  No events to display.
                              </div>
                          `
                        : html`
                              <ul class="divide-y divide-gray-700/50 text-xs">
                                  ${filteredLog.map(
                                      (event) => html`
                                          <li class="p-3 hover:bg-gray-700/50">
                                              <div
                                                  class="flex justify-between items-start"
                                              >
                                                  <div
                                                      class="font-semibold text-gray-300 truncate"
                                                  >
                                                      ${event.streamName}
                                                  </div>
                                                  <div
                                                      class="font-mono text-gray-500 shrink-0 ml-2"
                                                  >
                                                      ${event.timestamp.toLocaleTimeString()}
                                                  </div>
                                              </div>
                                              <div
                                                  class="flex items-center gap-2 mt-1"
                                              >
                                                  <span
                                                      class="px-2 py-0.5 rounded-full font-semibold ${severityClasses[
                                                          event.severity
                                                      ]}"
                                                      >${event.type.toUpperCase()}</span
                                                  >
                                                  <span class="text-gray-400"
                                                      >${event.details}</span
                                                  >
                                              </div>
                                          </li>
                                      `
                                  )}
                              </ul>
                          `}
                </div>
            </div>
        `;
        render(template, this);
    }
}
