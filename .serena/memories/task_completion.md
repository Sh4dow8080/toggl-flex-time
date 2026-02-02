# Task Completion Checklist

When a task is completed, verify the following:

## Required Checks

1. **Type Check**
   ```bash
   bunx tsc
   ```
   Ensure no TypeScript errors.

2. **Run the Application**
   ```bash
   bun run src/index.ts
   ```
   Verify the application runs without runtime errors.

3. **Test Different Modes** (if relevant)
   ```bash
   bun run src/index.ts --weekly
   bun run src/index.ts --trend
   bun run src/index.ts --json
   ```

## Code Quality Checks

- [ ] New functions have JSDoc comments
- [ ] Types are explicitly declared
- [ ] No `any` types introduced
- [ ] Error messages are descriptive
- [ ] Code follows existing patterns in the codebase

## Before Committing

- [ ] Run `bunx tsc` - no errors
- [ ] Test the main functionality
- [ ] Review changes for unintended modifications
- [ ] Commit message is descriptive

## Notes

- There is no automated test suite yet
- There is no linter configured yet
- Type checking is the primary automated verification
