import { notificationService } from '@/application/services/notificationService';
import { useNotificationStore } from '@/state/notificationStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const NOTIFICATION_DESCRIPTIONS = {
    playerError: {
        label: 'Critical Errors',
        description: 'Get alerted when playback fails irrecoverably.',
        icon: icons.alertTriangle,
    },
    seekPollSuccess: {
        label: 'Poll Success',
        description: 'Notify when a conditional feature search completes.',
        icon: icons.locateFixed,
    },
    pollingDisabled: {
        label: 'Background Pause',
        description: 'Alert when polling stops due to inactivity.',
        icon: icons.moon,
    },
    qcAnalysisComplete: {
        label: 'QC Analysis Done',
        description: 'Notify when a signal quality scan finishes.',
        icon: icons.activity,
    },
};

const settingToggleTemplate = (type, settings) => {
    const info = NOTIFICATION_DESCRIPTIONS[type];
    const isEnabled = settings[type];

    const handleToggle = () => {
        useNotificationStore.getState().toggleSetting(type);
    };

    return html`
        <div
            class="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors cursor-pointer group"
            @click=${handleToggle}
        >
            <div class="flex items-center gap-3 pr-4">
                <div
                    class="p-2 rounded-lg bg-slate-700 text-slate-400 group-hover:text-white transition-colors"
                >
                    ${info.icon}
                </div>
                <div>
                    <div
                        class="font-bold text-sm text-slate-200 group-hover:text-white"
                    >
                        ${info.label}
                    </div>
                    <div
                        class="text-[10px] text-slate-500 leading-tight mt-0.5"
                    >
                        ${info.description}
                    </div>
                </div>
            </div>

            <div
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${isEnabled
                    ? 'bg-blue-600'
                    : 'bg-slate-700'}"
            >
                <span
                    class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${isEnabled
                        ? 'translate-x-4.5'
                        : 'translate-x-1'}"
                ></span>
            </div>
        </div>
    `;
};

const permissionBanner = (permission) => {
    if (permission === 'granted') return '';

    const isDenied = permission === 'denied';
    const bgClass = isDenied
        ? 'bg-red-900/20 border-red-900/50'
        : 'bg-blue-900/20 border-blue-900/50';
    const textClass = isDenied ? 'text-red-200' : 'text-blue-200';
    const icon = isDenied ? icons.xCircle : icons.informationCircle;
    const title = isDenied ? 'Notifications Blocked' : 'Enable Notifications';
    const desc = isDenied
        ? 'Please enable notifications in your browser settings to receive alerts.'
        : 'Allow notifications to receive real-time alerts for stream events.';

    return html`
        <div class="p-3 rounded-lg border ${bgClass} mb-4">
            <div
                class="flex items-center gap-2 font-bold text-xs ${textClass} mb-1"
            >
                ${icon} ${title}
            </div>
            <p class="text-[10px] opacity-80 mb-3 ${textClass}">${desc}</p>
            ${!isDenied
                ? html`
                      <button
                          @click=${() =>
                              notificationService.requestPermission()}
                          class="w-full py-1.5 px-3 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-lg shadow-blue-900/20"
                      >
                          Request Permission
                      </button>
                  `
                : ''}
        </div>
    `;
};

export const notificationSettingsPanelTemplate = () => {
    const { permission, settings } = useNotificationStore.getState();

    return html`
        <div
            class="dropdown-panel bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-80 p-4 ring-1 ring-black/50"
        >
            <div
                class="flex items-center gap-2 pb-3 mb-2 border-b border-white/5"
            >
                <div class="p-1.5 bg-blue-500/10 rounded text-blue-400">
                    ${icons.settings}
                </div>
                <h4 class="font-bold text-white text-sm tracking-wide">
                    Notification Preferences
                </h4>
            </div>

            ${permissionBanner(permission)}

            <div
                class="space-y-2 ${permission !== 'granted'
                    ? 'opacity-50 pointer-events-none grayscale'
                    : ''}"
            >
                ${Object.keys(settings).map((key) =>
                    settingToggleTemplate(key, settings)
                )}
            </div>
        </div>
    `;
};