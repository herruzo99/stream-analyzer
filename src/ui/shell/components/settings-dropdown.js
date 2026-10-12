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

    const openCookiePreferences = () => {
        closeDropdown();
        setTimeout(() => {
            if (window.CookieConsent) {
                window.CookieConsent.showPreferences();
            } else {
                console.warn('CookieConsent library is not initialized.');
            }
        }, 50);
    };

    const healthNote =
        systemHealth.status === 'critical'
            ? 'storage critical'
            : systemHealth.status === 'warning'
              ? 'storage filling up'
              : 'storage healthy';
    const healthClass =
        systemHealth.status === 'critical'
            ? 'text-red-300'
            : systemHealth.status === 'warning'
              ? 'text-amber-300'
              : 'text-slate-600';

    const rowClass =
        'w-full flex items-center gap-3 p-2.5 rounded-md transition-colors text-left hover:bg-white/5';

    return html`
        <div
            class="dropdown-panel bg-[#0b111c] border border-white/10 rounded-md w-80 overflow-hidden"
        >
            <div class="p-2 border-b border-white/5">
                <button @click=${openMemoryModal} class="${rowClass}">
                    <span class="text-slate-500">${icons.hardDrive}</span>
                    <span class="grow text-left">
                        <span
                            class="block text-[13px] font-medium text-slate-100"
                            >Memory and storage</span
                        >
                        <span class="mono block text-[10px] ${healthClass}"
                            >${healthNote}</span
                        >
                    </span>
                    <span class="text-slate-600"
                        >${icons.chevronRight}</span
                    >
                </button>
            </div>

            <div class="p-2 border-b border-white/5">
                <button @click=${openCookiePreferences} class="${rowClass}">
                    <span class="text-slate-500">${icons.cookie}</span>
                    <span class="grow text-left">
                        <span
                            class="block text-[13px] font-medium text-slate-100"
                            >Privacy and cookies</span
                        >
                        <span class="mono block text-[10px] text-slate-600"
                            >consent preferences</span
                        >
                    </span>
                    <span class="text-slate-600"
                        >${icons.chevronRight}</span
                    >
                </button>
            </div>

            <div class="p-0">${notificationSettingsPanelTemplate()}</div>

            <div class="px-4 py-2.5 border-t border-white/5 text-center">
                <span class="mono text-[10px] text-slate-600"
                    >Stream Analyzer v1.2.0</span
                >
            </div>
        </div>
    `;
};
