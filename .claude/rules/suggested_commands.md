---
description: Build, test, and run commands for the project
globs: "**/*.ts,**/*.tsx"
---

## Run

```sh
bun run src/index.ts              # Summary view
bun run src/index.ts --weekly     # Weekly breakdown
bun run src/index.ts --trend      # Trend chart
bun run src/index.ts --web        # Web dashboard
bun run src/index.ts --json       # JSON output
```

## Test

```sh
bun test                          # Run all tests
bun test tests/calculator.test.ts # Run a specific test file
```

## Web Dashboard (React + Vite)

```sh
cd web && bun install && bunx vite dev  # Dev server
bun run build:web                       # Build + embed into CLI
```

## Compile

```sh
bun run compile:mac               # macOS binary
bun run compile:win               # Windows binary
```
