# Toggl Flex Time Calculator

<background>
You are building a Bun TypeScript CLI tool that calculates flex time from Toggl Track.
The user works 35 hours/week. Hours worked beyond this accumulate as flex time.
Danish holidays and custom holidays reduce the required hours (7 hours per holiday).
Calculation runs from January 1st of current year through today, including partial current week.
</background>

<setup>
1. Check if package.json exists, if not run 'bun init' to initialize the project
2. Research Toggl Track API v9 documentation for fetching time entries (use WebSearch or WebFetch)
3. Find a reliable source for Danish public holidays (API or static list for 2024-2026)
</setup>

<tasks>
1. Create config.json.example with structure:
   - togglApiToken: string (Toggl API token)
   - workspaceId: number (Toggl workspace ID)
   - hoursPerWeek: number (default 35)
   - hoursPerDay: number (default 7)
   - customHolidays: array of date strings (YYYY-MM-DD format)

2. Create src/config.ts that loads and validates config.json, with TypeScript types

3. Create src/holidays.ts with:
   - Function to calculate Danish public holidays for a given year (Easter-based holidays need calculation)
   - Function to merge with custom holidays from config
   - Holidays to include: New Years Day, Maundy Thursday, Good Friday, Easter Sunday, Easter Monday, Great Prayer Day (until 2023), Ascension Day, Whit Sunday, Whit Monday, Christmas Day, Second Christmas Day

4. Create src/toggl.ts with:
   - Function to fetch time entries from Toggl API v9 for a date range
   - Use Basic Auth with API token
   - Return array of entries with date and duration

5. Create src/calculator.ts with:
   - Function to calculate required hours for a date range (accounting for holidays and weekends)
   - Function to sum actual hours worked from Toggl entries
   - Function to calculate flex balance (actual - required)
   - Handle partial current week by pro-rating required hours based on workdays passed

6. Create src/index.ts as main entry point:
   - Load config
   - Fetch Toggl entries from Jan 1st to today
   - Calculate flex balance
   - Display colored output: green for positive flex, red for negative
   - Show: total required hours, total worked hours, flex balance

7. Add bin field to package.json and a flex script to run with bun run flex
</tasks>

<testing>
1. Run bun run src/index.ts with a valid config.json
2. Verify holidays are correctly identified for the current year
3. Verify the flex calculation matches manual calculation for a known week
4. Test that colored output displays correctly (positive green, negative red)
</testing>

<tracking>
After completing each task, update activity.md with:
- Task number and name
- Status (completed)
- Brief summary of what was done
- Any notes or decisions made
</tracking>

Stop after completing each task.
Do not ask the user questions
Output <promise>COMPLETE</promise> when all tasks are done.
