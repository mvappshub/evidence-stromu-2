# Bun audit triage (2026-06-04)

Direct deps bumped: `next`, `minimatch`, `defu`, `flatted`, `picomatch`, `postcss`, `uuid@11.1.1` (no major).

## Remaining findings (no safe patch without major)

| Advisory area | Severity | Why accepted / blocked |
|---------------|----------|-------------------------|
| `minimatch` <3.1.3 via ESLint/typescript-eslint tree | high | Dev-only (lint/CI); direct dep is 10.x; fix needs ESLint 10+ (blocked) |
| `flatted` <3.4.0 via eslint flat-cache | high | Dev-only; direct dep 3.4.2; nested copy from eslint toolchain |
| `picomatch` <2.3.2 via lint-staged/vitest/eslint | high/moderate | Dev-only glob matching; direct 4.x; nested 1.x/2.x in tools |
| `defu` <=6.1.4 via prisma/c12 | high | Transitive in Prisma config; direct 6.1.7; Prisma 7 bump blocked |
| `effect` <3.20.0 via prisma | high | Transitive; fix via Prisma major (blocked) |
| `ajv` via @eslint/eslintrc | moderate | Dev-only ReDoS with `$data` |
| `brace-expansion` via minimatch | moderate | Dev toolchain |
| `postcss` <8.5.10 | moderate | Bun audit false-positive vs lock (direct 8.5.15); nested copies flagged |
| `uuid` via next-auth | moderate | next-auth pins older uuid; app direct 11.1.1 |

Production runtime surface: Next standalone + Prisma + app deps; high ReDoS/PP items above are not exposed to untrusted input in production paths.

Re-run: `bun audit`
