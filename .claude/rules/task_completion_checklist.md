---
description: Verify before marking work done
globs: "**/*.ts"
---

Before completing a task:

1. Run `bun test` and confirm all tests pass
2. If you changed calculator logic or holidays, verify the affected test file specifically
3. If you added a new module, check it's properly imported where needed
