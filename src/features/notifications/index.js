import { notificationService } from '@/application/services/notificationService';

export function initializeNotificationFeature() {
    notificationService.initialize();
}