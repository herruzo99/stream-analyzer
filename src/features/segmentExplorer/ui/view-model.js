import { SegmentExplorerEngine } from '../domain/segment-explorer-engine.js';

// Singleton instance of the engine to maintain cache across renders
const engine = new SegmentExplorerEngine();

export function createSegmentExplorerViewModel(stream, uiState) {
    if (
        stream?.protocol === 'local' ||
        stream?.manifest?.profiles === 'local-file'
    ) {
        const stateSegments =
            stream.dashRepresentationState instanceof Map
                ? Array.from(stream.dashRepresentationState.values()).flatMap(
                      (state) => state.segments ?? []
                  )
                : [];
        return {
            tracks: [
                {
                    id: 'local-rep',
                    label: 'Local files',
                    bandwidth: 0,
                    segments:
                        Array.isArray(stream.segments) &&
                        stream.segments.length > 0
                            ? stream.segments
                            : stateSegments,
                },
            ],
            timeBounds: { min: 0, max: 0 },
            isLive: false,
        };
    }
    return engine.process(stream, uiState.segmentExplorerActiveTab);
}
