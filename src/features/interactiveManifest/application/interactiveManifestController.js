import { eventBus } from '@/application/event-bus';
import { uiActions, useUiStore } from '@/state/uiStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';
import { showToast } from '@/ui/components/toast';

export function initializeInteractiveManifestController() {
    eventBus.subscribe(
        'ui:interactive-manifest:page-changed',
        ({ newPage }) => {
            uiActions.setInteractiveManifestPage(newPage);
        }
    );

    eventBus.subscribe('ui:interactive-manifest:toggle-substitution', () => {
        uiActions.toggleInteractiveManifestSubstitution();
    });

    eventBus.subscribe('ui:interactive-manifest:item-hovered', ({ item }) => {
        uiActions.setInteractiveManifestHoveredItem(item);
    });

    eventBus.subscribe('ui:interactive-manifest:item-unhovered', () => {
        uiActions.setInteractiveManifestHoveredItem(null);
    });

    eventBus.subscribe('ui:interactive-manifest:item-clicked', ({ item }) => {
        const { interactiveManifestSelectedItem } = useUiStore.getState();
        if (
            interactiveManifestSelectedItem &&
            interactiveManifestSelectedItem.path === item.path
        ) {
            // Clicked the same item, so deselect it
            uiActions.setInteractiveManifestSelectedItem(null);
        } else {
            // Select the new item
            uiActions.setInteractiveManifestSelectedItem(item);
        }
    });

    eventBus.subscribe('ui:interactive-manifest:clear-selection', () => {
        uiActions.setInteractiveManifestSelectedItem(null);
    });

    eventBus.subscribe('ui:inspect-segment', ({ url, type, mimeType }) => {
        if (!url) return;

        const { activeStreamId } = useAnalysisStore.getState();
        if (!activeStreamId) return;

        // Use URL as uniqueId to match Segment Explorer expectations
        const uniqueId = url;

        // Infer format
        let format = 'unknown';
        if (mimeType) {
            if (mimeType.includes('mp4')) format = 'isobmff';
            else if (mimeType.includes('mpeg2')) format = 'ts';
        }
        if (format === 'unknown') {
            const { contentType } = inferMediaInfoFromExtension(url);
            // Simple fallback
            format = contentType === 'text' ? 'vtt' : 'isobmff';
        }

        const { set } = useSegmentCacheStore.getState();

        // Reset/Init cache entry to loading state
        set(uniqueId, { status: -1, data: null, parsedData: null });

        eventBus.dispatch('segment:fetch', {
            uniqueId: uniqueId,
            streamId: activeStreamId,
            format: format,
            context: {}, // Add init segment context if available?
        });

        showToast({ message: `Inspecting Segment...`, type: 'info' });

        // Also select it in the UI if possible?
        // uiActions.setInteractiveSegmentSelectedItem(...);
    });
}
