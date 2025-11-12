import { html } from 'lit-html';
import { useNotificationStore } from '@/state/notificationStore';
import { notificationService } from '@/application/services/notificationService';
import * as icons from '@/ui/icons';

const NOTIFICATION_DESCRIPTIONS = {
    playerError: {
        label: 'Player Errors',
        description:
            'Get a notification when a player crashes and cannot recover.',
    },
    seekPollSuccess: {
        label: 'Conditional Poll Success',
        description:
            'Get a notification when a "Seek to Feature" poll finds the target feature.',
    },
    pollingDisabled: {
        label: 'Background Inactivity',
        description:
            'Get a notification when live stream polling is paused due to inactivity.',
    },
};

const settingToggleTemplate = (type, settings) => {
    const info = NOTIFICATION_DESCRIPTIONS[type];
    const isEnabled = settings[type];

    const handleToggle = () => {
        useNotificationStore.getState().toggleSetting(type);
    };

    return html`
        <div class="flex items-center justify-between gap-4">
            <div>
                <p class="font-semibold text-slate-200 text-sm">${info.label}</p>
                <p class="text-xs text-slate-400">${info.description}</p>
            </div>
            <button
                @click=${handleToggle}
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${isEnabled
                    ? 'bg-blue-600'
                    : 'bg-slate-600'}"
            >
                <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled
                        ? 'translate-x-6'
                        : 'translate-x-1'}"
                ></span>
            </button>
        </div>
    `;
};

export const notificationSettingsPanelTemplate = () => {
    const { permission, settings } = useNotificationStore.getState();

    let content;

    if (permission === 'denied') {
        content = html`
            <div class="text-center p-4 bg-red-900/30 rounded-md">
                <p class="font-semibold text-red-300">
                    Notifications Blocked
                </p>
                <p class="text-xs text-slate-300 mt-1">
                    You have blocked notifications for this site. You must enable
                    them in your browser settings to receive alerts.
                </p>
            </div>
        `;
    } else if (permission === 'default') {
        content = html`
            <div class="text-center p-4 bg-slate-700/50 rounded-md">
                <p class="font-semibold text-slate-200">
                    Enable Notifications
                </p>
                <p class="text-xs text-slate-400 mt-1">
                    Allow notifications to receive alerts for important stream
                    events.
                </p>
                <button
                    @click=${() => notificationService.requestPermission()}
                    class="mt-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md text-sm"
                >
                    Enable
                </button>
            </div>
        `;
    } else {
        content = html`
            <div class="space-y-4">
                ${Object.keys(settings).map((key) =>
                    settingToggleTemplate(key, settings)
                )}
            </div>
        `;
    }

    return html`
        <div
            class="dropdown-panel bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-80 p-3 space-y-3"
        >
            <h4 class="font-bold text-slate-200 flex items-center gap-2">
                ${icons.settings} Notification Settings
            </h4>
            ${content}
        </div>
    `;
};