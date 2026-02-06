# toggl-flex-time

A CLI tool for calculating your flex time balance from [Toggl Track](https://track.toggl.com). Compares actual hours worked against required hours, accounting for weekends and Danish public holidays.

## Install

Download the latest binary for your platform from [Releases](https://github.com/Sh4dow8080/toggl-flex-time/releases/latest):

| Platform | File |
|---|---|
| macOS (x64) | `flex-darwin-x64` |
| Windows (x64) | `flex-windows-x64.exe` |

### macOS

```bash
# Download
curl -Lo flex https://github.com/Sh4dow8080/toggl-flex-time/releases/latest/download/flex-darwin-x64

# Make executable
chmod +x flex

# Move to a directory on your PATH (optional)
mv flex /usr/local/bin/flex
```

### Windows

Download `flex-windows-x64.exe` from the releases page and place it somewhere on your `PATH`, or run it directly.

## Setup

Create a `config.json` file in the same directory as the binary (or the project root if running from source):

```json
{
  "togglApiToken": "your_toggl_api_token_here",
  "workspaceId": 1234567,
  "hoursPerWeek": 35,
  "hoursPerDay": 7,
  "customHolidays": [
    "2024-12-24",
    "2024-12-31"
  ]
}
```

- **`togglApiToken`** — Your Toggl API token (find it at Profile Settings in Toggl Track)
- **`workspaceId`** — Your Toggl workspace ID (visible in the URL when logged in)
- **`hoursPerWeek`** — Your contracted weekly hours
- **`hoursPerDay`** — Your contracted daily hours
- **`customHolidays`** — Additional days off not covered by Danish public holidays (format: `YYYY-MM-DD`)

## Usage

```bash
flex                    # Show total flex balance
flex --weekly           # Show per-week breakdown
flex --trend            # Show weekly trend chart
flex --trend monthly    # Show monthly trend chart
flex --web              # Open interactive web dashboard
flex --json             # Output as JSON
flex --include-today    # Include today's hours in the calculation
flex --version          # Print version
flex --update           # Update to the latest release
```

Flags can be combined, e.g. `flex --weekly --json` or `flex --weekly --include-today`.

## Updating

The tool checks for updates automatically on each run. If a new version is available, you'll see a notice:

```
Update available: v1.0.0 → v1.1.0. Run with --update to install.
```

Run `flex --update` to download and install the latest version in-place.

## Development

Requires [Bun](https://bun.sh) v1.3.4+.

```bash
# Install dependencies
bun install

# Run from source
bun run src/index.ts

# Compile binaries
bun run compile:mac    # → flex-darwin-x64
bun run compile:win    # → flex-windows-x64.exe
```
