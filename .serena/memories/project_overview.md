# toggl-flex-time Project Overview

## Purpose
A CLI tool for calculating flex time balance by integrating with the Toggl Track API. It tracks how many hours ahead or behind schedule you are based on your configured work hours.

## Tech Stack
- **Runtime**: Bun (v1.3.4+)
- **Language**: TypeScript (ES2022+)
- **API**: Toggl Track REST API
- **No external dependencies** except `@types/bun` for development

## Features
- Fetches time entries from Toggl Track
- Calculates required vs actual work hours
- Accounts for weekends and Danish public holidays
- Supports custom holidays via config
- Caches API responses for performance
- Multiple output modes: summary, weekly breakdown, trend charts
- JSON output support for programmatic use

## Configuration
Uses `config.json` in the project root (see `config.json.example`):
- `togglApiToken`: Toggl API token
- `workspaceId`: Toggl workspace ID
- `hoursPerWeek`: Expected weekly hours (default: 35)
- `hoursPerDay`: Expected daily hours (default: 7)
- `customHolidays`: Array of additional holiday dates (YYYY-MM-DD)

## Entry Points
- Main CLI: `src/index.ts`
- Can be run directly: `bun run src/index.ts`
- Via npm script: `bun run flex`
