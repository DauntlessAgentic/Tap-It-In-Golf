import "dotenv/config";
import { calendarName, course, forecastDays } from "./config/golfcast.config.js";
import { fetchForecast } from "./weather/openMeteoProvider.js";
import { buildRecommendations } from "./recommendations/buildDailyRecommendations.js";
import {
  buildCalendarApi,
  buildOAuthClient,
  findOrCreateCalendar,
  readGoogleAuthEnv,
} from "./calendar/googleCalendarClient.js";
import { syncRecommendations } from "./calendar/calendarSync.js";

async function runSync(): Promise<void> {
  console.log(
    `→ Fetching ${forecastDays}-day forecast for ${course.shortName} (${course.latitude}, ${course.longitude})`,
  );
  const forecast = await fetchForecast(course, forecastDays);
  console.log(
    `  got ${forecast.hourly.length} hourly + ${forecast.daily.length} daily points`,
  );

  const events = buildRecommendations(forecast);
  console.log(`→ Built ${events.length} recommendation events`);

  const auth = buildOAuthClient(readGoogleAuthEnv());
  const api = buildCalendarApi(auth);
  const calendarId = await findOrCreateCalendar(
    api,
    calendarName,
    course.timeZone,
  );
  console.log(`→ Using calendar "${calendarName}" (id: ${calendarId})`);

  const result = await syncRecommendations(api, calendarId, events);
  console.log(
    `✓ Sync complete: ${result.inserted} inserted, ${result.updated} updated, ${result.skipped} skipped`,
  );
}

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? "sync";
  switch (cmd) {
    case "sync":
      await runSync();
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      console.error("Usage: tsx src/index.ts sync");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("✗", err.message ?? err);
  process.exit(1);
});
