Default to using Bun instead of Node.js. Bun automatically loads .env, so don't use dotenv.

## Architecture

- CLI: `src/` — Pure TypeScript, no framework. Manual `process.argv` parsing (no CLI library).
- Web dashboard: `web/` — React + Vite SPA, built and embedded into the CLI binary.
- Config: `config.json` (gitignored) — Toggl API token, workspace ID, hours/day, hours/week, custom holidays. See `config.json.example`.
- Tests: `tests/` — Bun's built-in test runner, no mocking libraries.

## Secrets

`config.json` contains a Toggl API token. Never commit it or log its contents.

## Key Patterns

- Config and cache files live in `~/.config/toggl-flex-time/` (macOS/Linux) or `%APPDATA%/toggl-flex-time/` (Windows), not the project root. See `src/paths.ts`.
- The web dashboard is a React/Vite app in `web/` that gets built into a single HTML file and embedded as a TypeScript string constant in `src/generated/dashboard-html.ts`. After changing web code, run `bun run build:web` to regenerate it.
- Toggl API auth is Basic auth with `base64(token:api_token)` where "api_token" is the literal password string.
- The `--include-today` toggle and web dashboard toggle only change the calculation end date — they don't refetch from Toggl. All entries are already in memory.
- Danish holidays in `src/holidays.ts`: Store Bededag (Great Prayer Day) was abolished after 2023 — the code has a `year <= 2023` guard.
- Custom holidays in config support year wildcards: `*-12-24` means every year, `2025-12-24` means that specific year only.
