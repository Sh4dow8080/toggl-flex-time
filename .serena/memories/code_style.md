# Code Style and Conventions

## TypeScript Configuration
- Strict mode enabled
- ESNext target
- Bundler module resolution
- `noUncheckedIndexedAccess: true` - Array access returns T | undefined

## General Style
- **Functional approach**: No classes, only functions and interfaces
- **Named exports**: All exports are named, no default exports
- **Explicit types**: Function parameters and return types are explicitly typed
- **JSDoc comments**: Functions have JSDoc comments with `@param` and `@returns`

## Naming Conventions
- **Functions**: camelCase (e.g., `calculateFlexTime`, `getTimeEntries`)
- **Interfaces**: PascalCase (e.g., `SimplifiedEntry`, `FlexCalculationResult`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `CACHE_FILE`, `TOGGL_API_BASE`)
- **Files**: lowercase with hyphens (e.g., `flex-time.ts`) or single words

## Code Patterns
- Use `type` imports for type-only imports: `import type { Foo } from "./bar"`
- Date formatting: YYYY-MM-DD strings for date comparisons
- Error handling: throw descriptive errors, let them bubble up
- Async/await preferred over Promise chains

## File Organization
- Imports at top, grouped by external/internal
- Type/interface definitions before functions that use them
- Helper functions before the functions that call them
- Export public API functions

## Example Function Style
```typescript
/**
 * Calculate flex balance (actual - required).
 *
 * @param actualHours - Hours actually worked
 * @param requiredHours - Hours required
 * @returns Flex balance (positive = surplus, negative = deficit)
 */
export function calculateFlexBalance(
  actualHours: number,
  requiredHours: number
): number {
  return actualHours - requiredHours;
}
```
