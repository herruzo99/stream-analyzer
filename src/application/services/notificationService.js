import {
    notificationActions,
    useNotificationStore,
} from '@/state/notificationStore';
import { EVENTS } from '@/types/events';
import { eventBus } from '../event-bus';

class NotificationService {
    constructor() {
        this.isInitialized = false;
    }

    initialize() {
        if (this.isInitialized || !('Notification' in window)) {
            return;
        }

        notificationActions.loadSettings();

        // Set initial permission state from the browser API
        notificationActions.setPermission(Notification.permission);

        this.subscribeToEvents();
        this.isInitialized = true;
    }

    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('This browser does not support desktop notification');
            return;
        }

        const permission = await Notification.requestPermission();
        notificationActions.setPermission(permission);
    }

    sendNotification(type, title, options) {
        const { permission, settings } = useNotificationStore.getState();

        if (permission !== 'granted') {
            return;
        }

        if (!settings[type]) {
            return; // Notification type is disabled by the user
        }

        // Use a tag to prevent spamming notifications for the same event type.
        // A new notification with the same tag will replace the old one.
        new Notification(title, { ...options, tag: type });
    }

    subscribeToEvents() {
        eventBus.subscribe(
            EVENTS.NOTIFY.PLAYER_ERROR,
            ({ streamName, message }) => {
                this.sendNotification(
                    'playerError',
                    `Player Error: ${streamName}`,
                    {
                        body: `The player encountered a fatal error: ${message}`,
                    }
                );
            }
        );

        eventBus.subscribe(
            EVENTS.NOTIFY.SEEK_POLL_SUCCESS,
            ({ featureName, streamName }) => {
                this.sendNotification(
                    'seekPollSuccess',
                    'Conditional Poll Successful!',
                    {
                        body: `The feature "${featureName}" was found in the stream "${streamName}". Polling has stopped.`,
                    }
                );
            }
        );

        eventBus.subscribe(EVENTS.NOTIFY.POLLING_DISABLED, () => {
            this.sendNotification('pollingDisabled', 'Live Polling Paused', {
                body: 'Live stream monitoring has been paused due to inactivity in a background tab.',
            });
        });
    }
}

export const notificationService = new NotificationService();
