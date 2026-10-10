import { notificationTargetService } from './application/notification-target-service.js';

export function initializeNotificationFeature() {
    notificationTargetService.initialize();
}
