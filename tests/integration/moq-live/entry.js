// Browser entry for the live MoQ interop harness. Bundled to an IIFE by
// tests/integration/moq-live/run.mjs; also loaded by tsc for type context.
export { connectMoq } from '@/infrastructure/moq/session.js';
export { normalizeCatalog, summarizeTracks } from '@/features/moq/domain/catalog.js';
export { deriveMoqSample } from '@/features/moq/domain/telemetry.js';
