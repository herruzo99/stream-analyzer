# Deterministic Migration Fixture Corpus

These fixtures are synthetic, authored for this repository, and dedicated to
the public domain under CC0-1.0. They contain no credentials, private URLs,
tracking identifiers, or copyrighted media payload.

`manifest.json` is the machine-readable inventory and integrity contract.
Every checked-in fixture has a SHA-256 digest, expected classification, and
the test layers allowed to consume it. Generated scenarios declare their
deterministic construction instead of a file hash.

Rules:

- Never replace a fixture in place without updating its digest and dependent
  evidence.
- Add a new fixture ID when expected behavior changes materially.
- Do not use live internet URLs in deterministic suites.
- Media-looking URLs use the reserved `.invalid` domain or relative paths.
- Large inputs are generated from a fixed seed/count to avoid bloating Git.
- Browser fixtures must be served from an isolated local origin.
- Sensitive-data scanning is mandatory before a fixture is committed.

The corpus establishes Phase 0 infrastructure. It does not claim complete
feature coverage; Phase 1 must map every accepted feature to fixtures or an
explicit environment-dependent test.
