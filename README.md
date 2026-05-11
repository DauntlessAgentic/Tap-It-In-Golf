# GolfCast Calendar (v0)

Pulls Ottawa hourly weather, scores golf playability for the next 7 days at **The Meadows Golf and Country Club** (Carlsbad Springs), and writes emoji-coded events into a dedicated Google Calendar — so "when should I tee off this week?" is answered before you open a single weather app.

This is v0. It is intentionally single-course, single-user, single-provider.

## What it does

For each of the next 7 days, it writes **4 events** to a calendar named `⛳ GolfCast`:

1. **Daily best window** — the highest-scoring contiguous 4-hour block of daylight
2. **Morning** — 07:00–11:00 (clipped to sunrise)
3. **Midday** — 11:00–15:00
4. **Evening** — 15:00–sunset (capped at 19:00)

Each event gets:
- a verdict emoji (✅ 🙂 ⚠️ 🌧️ ❌) based on a 0–100 playability score
- a Google Calendar `colorId` matched to the verdict
- `transparency: transparent` so it doesn't block your time
- a description with temperature range, rain %, precipitation, thunderstorm %, wind/gusts, frost-delay flag, conditions, and an hourly heatmap
- `extendedProperties.private` for idempotent upserts — re-running never duplicates

## Prerequisites

- Node.js ≥ 20
- A Google account with Calendar enabled
- A Google Cloud project with an OAuth 2.0 client (see below)

## Setup

```bash
npm install
cp .env.example .env
```

### 1. Create a Google Cloud OAuth client

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create (or pick) a project.
3. Enable the **Google Calendar API** under *APIs & Services → Library*.
4. *APIs & Services → OAuth consent screen*: choose **External**, fill in the basics, and add yourself as a **Test user** while the app stays in *Testing* mode (you don't need to publish for personal use).
5. *APIs & Services → Credentials → Create credentials → OAuth client ID*:
   - Application type: **Web application** (or Desktop — Web is recommended because the bootstrap script uses an HTTP redirect).
   - Authorized redirect URI: `http://localhost:3000/oauth/callback` (or whatever you put in `.env`).
6. Copy the client ID and client secret into `.env`.

### 2. Bootstrap a refresh token

```bash
npm run auth:google
```

This:
1. Spins up a one-shot HTTP server on the redirect port.
2. Prints a Google consent URL.
3. Open it in a browser, approve the `calendar` scope.
4. You'll be redirected back; the script exchanges the `code` for a refresh token.
5. Copy the printed `GOOGLE_REFRESH_TOKEN=…` into your `.env`.

If Google returns no `refresh_token`, revoke prior consent at [myaccount.google.com/permissions](https://myaccount.google.com/permissions) and retry — Google only returns a refresh token on the *first* consent.

### 3. Sync

```bash
npm run sync:golfcast
```

On first run it auto-creates the `⛳ GolfCast` calendar. On subsequent runs it upserts the same 28 events (no duplicates).

## How to try it (5-line snippet)

```bash
npm install && cp .env.example .env
# fill in GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env
npm run auth:google              # paste GOOGLE_REFRESH_TOKEN back into .env
npm run sync:golfcast            # creates 28 events for the next 7 days
# open Google Calendar → ⛳ GolfCast appears with green/yellow/red blocks
```

## Scripts

| Script                  | What                                  |
| ----------------------- | ------------------------------------- |
| `npm run dev`           | Run the entry point (defaults to sync) |
| `npm run sync:golfcast` | Pull weather, build events, upsert    |
| `npm run auth:google`   | One-shot OAuth refresh-token bootstrap |
| `npm run test`          | Vitest suite                          |
| `npm run typecheck`     | `tsc --noEmit`                        |

## Scoring

Start at 100, apply penalties:

| Factor                      | Penalty                              |
| --------------------------- | ------------------------------------ |
| Rain probability            | `pct × 0.4`                          |
| Precipitation               | `mm × 8`                             |
| Thunderstorm probability    | `pct × 1.5` (lightning closes courses) |
| Wind avg above 25 km/h      | `(avg − 25) × 1.5`                   |
| Gusts above 40 km/h         | `(gust − 40) × 2`                    |
| Temp below 8 °C             | `(8 − tempMin) × 3`                  |
| Temp above 30 °C            | `(tempMax − 30) × 3`                 |
| Frost delay flag            | −25                                  |
| Severe code (75+ snow, 95+) | floored at 20                        |

| Score   | Verdict       | Color   |
| ------- | ------------- | ------- |
| 85–100  | ✅ Book it    | green   |
| 70–84   | 🙂 Good       | sage    |
| 55–69   | ⚠️ Watch      | yellow  |
| 35–54   | 🌧️ Risky      | orange  |
| 0–34    | ❌ Avoid      | red     |

## Scheduling

You probably want this to run on its own. Three options:

### cron (Linux/macOS)

```cron
# every morning at 5:30 AM local
30 5 * * * cd /path/to/repo && /usr/local/bin/npm run sync:golfcast >> /tmp/golfcast.log 2>&1
```

### launchd (macOS)

`~/Library/LaunchAgents/com.golfcast.sync.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key><string>com.golfcast.sync</string>
    <key>ProgramArguments</key>
    <array>
      <string>/usr/local/bin/npm</string>
      <string>run</string>
      <string>sync:golfcast</string>
    </array>
    <key>WorkingDirectory</key><string>/path/to/repo</string>
    <key>StartCalendarInterval</key>
    <dict><key>Hour</key><integer>5</integer><key>Minute</key><integer>30</integer></dict>
  </dict>
</plist>
```

Then `launchctl load ~/Library/LaunchAgents/com.golfcast.sync.plist`.

### GitHub Actions (zero-infra)

`.github/workflows/golfcast.yml`:
```yaml
name: golfcast-sync
on:
  schedule:
    - cron: "30 9 * * *"   # 09:30 UTC = ~05:30 ET
  workflow_dispatch:
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: npm run sync:golfcast
        env:
          GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
          GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET }}
          GOOGLE_REDIRECT_URI: ${{ secrets.GOOGLE_REDIRECT_URI }}
          GOOGLE_REFRESH_TOKEN: ${{ secrets.GOOGLE_REFRESH_TOKEN }}
```

Add the four `GOOGLE_*` values as repository secrets.

## What's deferred (explicitly out of scope for v0)

- Tee-time booking
- Friend coordination / availability matching
- Multi-course or multi-user support
- Multi-provider weather abstraction (single concrete `openMeteoProvider.ts`)
- Web UI / SaaS app

## Project layout

```
src/
  index.ts                                # CLI entry
  config/golfcast.config.ts               # course, windows, calendar name
  weather/openMeteoProvider.ts
  weather/types.ts
  scoring/golfWeatherScorer.ts            # pure functions
  scoring/verdict.ts                      # score → emoji + label + colorId
  calendar/googleCalendarClient.ts        # OAuth client, calendar lookup/create
  calendar/calendarSync.ts                # upsert loop
  recommendations/buildDailyRecommendations.ts
  recommendations/findBestWindow.ts
  recommendations/summarizeWindow.ts
  utils/dateUtils.ts                      # luxon helpers, sunrise/sunset clipping
  auth/bootstrapOAuth.ts                  # `npm run auth:google`
tests/
  golfWeatherScorer.test.ts
  findBestWindow.test.ts
  verdict.test.ts
```

## Source

Weather: [Open-Meteo](https://open-meteo.com/) (no API key required).
