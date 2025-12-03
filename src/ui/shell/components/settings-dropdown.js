import { eventBus } from '@/application/event-bus';
import { notificationSettingsPanelTemplate } from '@/features/notifications/ui/components/notification-settings-panel.js';
import { useSettingsStore } from '@/state/settingsStore';
import * as icons from '@/ui/icons';
import { closeDropdown } from '@/ui/services/dropdownService';
import { html } from 'lit-html';

export const settingsDropdownTemplate = () => {
    const { systemHealth } = useSettingsStore.getState();

    const openMemoryModal = () => {
        closeDropdown();
        eventBus.dispatch('ui:memory-modal:open');
    };

    // Dynamic styling for the memory button based on health
    let btnClass =
        'bg-blue-600 hover:bg-blue-500 text-white border-transparent';
    let iconClass = 'bg-white/10';
    let warningIcon = null;

    if (systemHealth.status === 'critical') {
        btnClass =
            'bg-red-600 hover:bg-red-500 text-white animate-pulse border-red-400';
        warningIcon = html`<span class="text-white ml-auto mr-2"
            >${icons.alertTriangle}</span
        >`;
    } else if (systemHealth.status === 'warning') {
        btnClass =
            'bg-amber-600 hover:bg-amber-500 text-white border-amber-400';
        warningIcon = html`<span class="text-white ml-auto mr-2"
            >${icons.info}</span
        >`;
    }

    return html`
        <div
            class="dropdown-panel bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-80 ring-1 ring-black/50 overflow-hidden"
        >
            <!-- Memory Management Link -->
            <div class="p-2 border-b border-white/5">
                <button
                    @click=${openMemoryModal}
                    class="w-full flex items-center p-3 rounded-lg transition-all shadow-lg shadow-black/20 group border ${btnClass}"
                >
                    <div class="p-1.5 rounded-md ${iconClass} mr-3">
                        ${icons.hardDrive}
                    </div>
                    <div class="text-left">
                        <div class="text-xs font-bold uppercase tracking-wider">
                            Memory & Storage
                        </div>
                        <div class="text-[10px] opacity-80">
                            Manage cache limits
                        </div>
                    </div>
                    ${warningIcon}
                    ${!warningIcon
                        ? html`<span
                              class="group-hover:translate-x-1 transition-transform ml-auto"
                              >${icons.chevronRight}</span
                          >`
                        : ''}
                </button>
            </div>

            <!-- Notification Settings Section -->
            <div class="p-0">${notificationSettingsPanelTemplate()}</div>

            <!-- Footer -->
            <div
                class="p-3 bg-slate-950/50 border-t border-white/5 text-center"
            >
                <div class="text-[10px] text-slate-600">
                    Stream Analyzer v1.0.0
                </div>
            </div>
        </div>
    `;
};
