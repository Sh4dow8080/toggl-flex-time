# Codebase Structure

## Directory Layout
```
toggl-flex-time/
├── src/
│   ├── index.ts      # Main entry point and CLI
│   ├── calculator.ts # Core flex time calculation logic
│   ├── toggl.ts      # Toggl API client
│   ├── config.ts     # Configuration loading/validation
│   ├── holidays.ts   # Danish holiday calculations (Easter-based)
│   ├── cache.ts      # API response caching
│   └── trend.ts      # Trend visualization charts
├── config.json       # User configuration (gitignored)
├── config.json.example
├── cache.json        # Cached API responses (gitignored)
├── package.json
├── tsconfig.json
└── CLAUDE.md         # Development instructions
```

## Module Responsibilities

### src/index.ts
- CLI argument parsing
- Output formatting (colored terminal, JSON)
- Weekly breakdown display
- Coordinates all other modules

### src/calculator.ts
- `calculateFlexTime()` - Main calculation function
- `countWorkdays()` - Counts working days excluding weekends/holidays
- `calculateRequiredHours()` - Required hours for a period
- `sumActualHours()` - Sum hours from Toggl entries

### src/toggl.ts
- `getTimeEntries()` - Fetches entries from Toggl API
- `SimplifiedEntry` interface - Normalized entry format
- Handles API authentication (Basic auth)

### src/config.ts
- `loadConfig()` - Loads and validates config.json
- `Config` interface - Configuration schema

### src/holidays.ts
- `getDanishHolidays()` - Calculates Danish public holidays
- `isHoliday()` - Checks if a date is a holiday
- `calculateEasterSunday()` - Easter date calculation

### src/cache.ts
- `loadCache()` / `saveCache()` - Cache persistence
- `calculateFetchRange()` - Determines what data to fetch
- `mergeEntries()` - Merges cached with new entries

### src/trend.ts
- `renderTrendChart()` - ASCII trend visualization
- `calculatePeriods()` - Weekly/monthly period aggregation
