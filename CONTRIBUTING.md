# Contributing

Thanks for your interest in improving `tty-fold`. Issues and PRs are welcome.

## Getting started

```sh
pnpm install
pnpm build         # compile TypeScript to dist/
pnpm test          # vitest (watch); use `pnpm test --run` for a single pass
pnpm lint          # eslint
pnpm typecheck     # tsc --noEmit
pnpm bench         # token and speed benchmarks
```

Requires **Node 22+**.

## Project layout

- `src/parser.ts` — splits raw terminal output into text and escape sequences.
- `src/screen.ts` — the virtual screen the parser replays onto.
- `src/collapse.ts`, `src/tidier.ts` — collapsing and producing the final output.
- `src/stream.ts` — the streaming `Transform` (`createTidyStream`).
- `src/index.ts` — public API (`tidy`, `createTidyStream`).
- `__tests__/` — Vitest suites; `fixtures/` holds real captured output (`<name>.txt`) with its expected result (`<name>.expected.txt`).

## Tests

- Written with Vitest.
- Test descriptions start with **"should"** (e.g. `it('should keep the last progress frame', …)`).
- If output handling changes, add or update a fixture in `fixtures/`.
- The streaming output must match the one-shot `tidy()` however the input is split.
- Run `pnpm test --run` before pushing.

## Commits & releases

This repo uses **Conventional Commits** and [release-please](https://github.com/googleapis/release-please)
for automated releases. Your commit type drives the version bump:

- `feat:` → minor release
- `fix:` → patch release
- `docs:` / `chore:` / `test:` / `ci:` / `refactor:` → no release

Releases are published from CI with npm provenance — no manual `npm publish`.

## Pull requests

1. Branch off `main`.
2. Make your change with tests. Update the README or `examples/` if behaviour changed.
3. Ensure the full gate is green locally:
   `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test --run`.
4. Push and open a PR against `main`. CI runs the suite across Node 22/24/26; `ci-success` is the required check.

### Maintainer note: branch protection

Require only the `ci-success` status check on `main` (**Settings → Branches**). It aggregates the
whole Node matrix, so changing the matrix in `.github/workflows/ci.yml` never orphans a required check.
