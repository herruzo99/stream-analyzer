import { eventBus } from '@/application/event-bus.js';
import { useQualityStore } from '@/state/qualityStore';
import { EVENTS } from '@/types/events';
import {
    createNotificationPayload,
    NOTIFICATION_LIMITS,
} from './notification-contract.js';
import {
    notificationTargetActions,
    notificationTargetStore,
} from './notification-target-store.js';

function completedRunKeys(jobs) {
    return new Set(
        [...jobs.entries()]
            .filter(([, job]) => job.status === 'complete')
            .map(([streamId, job]) => `${streamId}:${job.runId ?? 'default'}`)
    );
}

class NotificationTargetService {
    constructor() {
        this.isInitialized = false;
        this.unsubscribers = [];
        this.recentNotifications = new Map();
        this.completedRuns = new Set();
    }

    initialize() {
        if (this.isInitialized) return;

        notificationTargetActions.loadSettings();
        const supported = 'Notification' in window;
        notificationTargetActions.setSupport(
            supported ? 'supported' : 'unsupported'
        );
        notificationTargetActions.setPermission(
            supported ? Notification.permission : 'unsupported'
        );
        this.completedRuns = completedRunKeys(useQualityStore.getState().jobs);
        this.subscribeToEvents();
        this.isInitialized = true;
    }

    dispose() {
        this.unsubscribers.splice(0).forEach(unsubscribe => unsubscribe());
        this.recentNotifications.clear();
        this.completedRuns.clear();
        this.isInitialized = false;
    }

    async requestPermission() {
        if (!('Notification' in window)) {
            notificationTargetActions.setSupport('unsupported');
            notificationTargetActions.setPermission('unsupported');
            return 'unsupported';
        }

        try {
            const permission = await Notification.requestPermission();
            notificationTargetActions.setPermission(permission);
            return permission;
        } catch {
            notificationTargetActions.setPermission('error');
            return 'error';
        }
    }

    sendNotification(type, title, options = {}) {
        const { support, permission, settings } =
            notificationTargetStore.getState();
        if (support !== 'supported' || permission !== 'granted') {
            return 'permission-gated';
        }
        if (!settings[type]) return 'preference-gated';

        const payload = createNotificationPayload(type, title, options.body);
        if (!payload) return 'unsupported-type';
        const now = Date.now();
        const dedupeKey = `${payload.type}:${payload.title}:${payload.body}`;
        const previous = this.recentNotifications.get(dedupeKey);
        if (previous && now - previous < NOTIFICATION_LIMITS.dedupeWindowMs) {
            return 'deduplicated';
        }

        try {
            new Notification(payload.title, {
                ...options,
                body: payload.body,
                tag: payload.tag,
            });
            this.recentNotifications.set(dedupeKey, now);
            for (const [key, timestamp] of this.recentNotifications) {
                if (now - timestamp >= NOTIFICATION_LIMITS.dedupeWindowMs) {
                    this.recentNotifications.delete(key);
                }
            }
            return 'sent';
        } catch {
            return 'delivery-error';
        }
    }

    subscribeToEvents() {
        this.unsubscribers.push(
            eventBus.subscribe(
                EVENTS.NOTIFY.PLAYER_ERROR,
                ({ streamName, message }) =>
                    this.sendNotification(
                        'playerError',
                        `Player error: ${streamName}`,
                        { body: `Playback failed: ${message}` }
                    )
            ),
            eventBus.subscribe(
                EVENTS.NOTIFY.SEEK_POLL_SUCCESS,
                ({ featureName, streamName }) =>
                    this.sendNotification(
                        'seekPollSuccess',
                        'Conditional poll successful',
                        {
                            body: `${featureName} was found in ${streamName}. Polling stopped.`,
                        }
                    )
            ),
            eventBus.subscribe(EVENTS.NOTIFY.POLLING_DISABLED, () =>
                this.sendNotification(
                    'pollingDisabled',
                    'Live polling paused',
                    { body: 'Background polling paused after inactivity.' }
                )
            ),
            useQualityStore.subscribe(state => {
                const next = completedRunKeys(state.jobs);
                for (const key of next) {
                    if (!this.completedRuns.has(key)) {
                        const streamId = key.slice(0, key.lastIndexOf(':'));
                        this.sendNotification(
                            'qcAnalysisComplete',
                            'Quality analysis complete',
                            { body: `Signal quality analysis finished for ${streamId}.` }
                        );
                    }
                }
                this.completedRuns = next;
            })
        );
    }
}

export const notificationTargetService = new NotificationTargetService();
