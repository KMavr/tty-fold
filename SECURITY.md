# Security Policy

## Supported versions

`tty-fold` is pre-1.0. Only the latest published release receives security fixes.

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Report privately through GitHub:
[Report a vulnerability](https://github.com/KMavr/tty-fold/security/advisories/new).

Include the affected version, what you did, and what you expected versus what happened. You can
expect an acknowledgement within a few days. Confirmed issues are fixed in a new release and
credited in the advisory unless you prefer otherwise.

## Scope

`tty-fold` is a pure text transformer with zero runtime dependencies. It does not read files, run
code, or use the network. Reports about crashes, pathological input that causes excessive CPU or
memory use, or the release pipeline are in scope.

Every release is published from CI with
[npm provenance](https://docs.npmjs.com/generating-provenance-statements) attestations.
