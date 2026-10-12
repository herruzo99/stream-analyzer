import { notificationService } from '@/application/services/notificationService';
import { useNotificationStore } from '@/state/notificationStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const NOTIFICATION_DESCRIPTIONS = {
    playerError: {
        label: 'Critical errors',
        description: 'Alert when playback fails irrecoverably.',
        icon: icons.alertTriangle,
    },
    seekPollSuccess: {
        label: 'Poll success',
        description: 'Notify when a conditional feature search completes.',
        icon: icons.locateFixed,
    },
    pollingDisabled: {
        label: 'Background pause',
        description: 'Alert when polling stops due to inactivity.',
        icon: icons.moon,
    },
    qcAnalysisComplete: {
        label: 'QC analysis done',
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
        <button
            class="w-full flex items-center justify-between gap-3 p-2.5 rounded-md hover:bg-white/5 border border-transparent transition-colors text-left"
            @click=${handleToggle}
            role="switch"
            aria-checked=${isEnabled}
            aria-label="${info.label}"
        >
            <span class="flex items-center gap-3 min-w-0">
                <span class="text-slate-500 shrink-0">${info.icon}</span>
                <span class="min-w-0">
                    <span
                        class="block text-[13px] font-medium text-slate-100"
                    >
                        ${info.label}
                    </span>
                    <span
                        class="block text-[11px] text-slate-500 leading-snug mt-0.5"
                    >
                        ${info.description}
                    </span>
                </span>
            </span>

            <span
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${isEnabled
                    ? 'bg-emerald-400'
                    : 'bg-white/10'}"
            >
                <span
                    class="inline-block h-3.5 w-3.5 rounded-full bg-slate-950 transition-transform ${isEnabled
                        ? 'translate-x-[18px]'
                        : 'translate-x-[2px]'}"
                ></span>
            </span>
        </button>
    `;
};

const permissionBanner = (permission) => {
    if (permission === 'granted') return '';

    const isDenied = permission === 'denied';
    const icon = isDenied ? icons.xCircle : icons.informationCircle;
    const title = isDenied ? 'Notifications blocked' : 'Enable notifications';
    const desc = isDenied
        ? 'Allow notifications in your browser settings to receive alerts.'
        : 'Allow notifications to receive real-time alerts for stream events.';

    return html`
        <div class="p-3 rounded-md border ${isDenied ? 'border-red-400/25 bg-red-500/5' : 'border-white/10 bg-white/[0.02]'} mb-2">
            <div class="flex items-center gap-2 text-[13px] font-medium ${isDenied ? 'text-red-200' : 'text-slate-100'} mb-1">
                ${icon} ${title}
            </div>
            <p class="text-[11px] text-slate-500 mb-3">${desc}</p>
            ${!isDenied
                ? html`
                      <button
                          @click=${() =>
                              notificationService.requestPermission()}
                          class="w-full py-2 px-3 rounded-md bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-[13px] font-bold transition-colors"
                      >
                          Request permission
                      </button>
                  `
                : ''}
        </div>
    `;
};

export const notificationSettingsPanelTemplate = () => {
    const { permission, settings } = useNotificationStore.getState();

    // Rendered inline inside the settings dropdown: no card chrome here,
    // just a section with rows.
    return html`
        <div class="px-2 py-2 border-t border-white/5">
            <p class="mono px-2.5 mb-1 text-[10px] text-slate-600">
                notifications
            </p>
            ${permissionBanner(permission)}
            <div
                class="${permission !== 'granted'
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
