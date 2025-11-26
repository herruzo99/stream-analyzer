import { SegmentExplorerEngine } from '../domain/segment-explorer-engine.js';

// Singleton instance of the engine to maintain cache across renders
const engine = new SegmentExplorerEngine();

export function createSegmentExplorerViewModel(stream, uiState) {
    return engine.process(stream, uiState.segmentExplorerActiveTab);
}
