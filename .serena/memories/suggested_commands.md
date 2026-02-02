# Suggested Commands

## Running the Application
```bash
# Main entry point
bun run src/index.ts

# Via npm script
bun run flex

# With arguments (examples)
bun run src/index.ts --weekly      # Weekly breakdown
bun run src/index.ts --trend       # Trend chart
bun run src/index.ts --json        # JSON output
```

## Development Commands
```bash
# Install dependencies
bun install

# Type check (no emit)
bunx tsc

# Watch mode for development
bun --hot src/index.ts
```

## Build Commands
```bash
# Compile to Windows executable
bun run compile:win
# Output: ./flex.exe
```

## Utility Commands (Darwin/macOS)
```bash
# List files
ls -la

# Find files
find . -name "*.ts" -not -path "./node_modules/*"

# Search in files
grep -r "pattern" src/

# Git operations
git status
git diff
git add <file>
git commit -m "message"
```

## Testing
Note: No test framework is currently configured. If tests are added, use:
```bash
bun test
```
