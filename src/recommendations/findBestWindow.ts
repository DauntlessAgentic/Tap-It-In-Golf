import { DateTime } from "luxon";
import type { DailyForecast, HourlyForecast } from "../weather/types.js";
import { isDaylightHour } from "../utils/dateUtils.js";
import { summarizeWindow } from "./summarizeWindow.js";
import { scoreFromWindowSummary } from "../scoring/golfWeatherScorer.js";

export interface BestWindowResult {
  startHourIndex: number;
  start: DateTime;
  end: DateTime;
  hours: HourlyForecast[];
  score: number;
}

export function findBestWindow(
  daylightHours: HourlyForecast[],
  daily: DailyForecast,
  zone: string,
  windowSize: number,
): BestWindowResult | null {
  if (daylightHours.length < windowSize) return null;

  let best: BestWindowResult | null = null;

  for (let i = 0; i <= daylightHours.length - windowSize; i++) {
    const slice = daylightHours.slice(i, i + windowSize);
    if (!isContiguous(slice, zone)) continue;

    const start = DateTime.fromISO(slice[0]!.time, { zone });
    const end = DateTime.fromISO(slice[slice.length - 1]!.time, {
      zone,
    }).plus({ hours: 1 });

    const summary = summarizeWindow(start, end, slice, daily, false);
    const score = scoreFromWindowSummary(summary);

    if (!best || score > best.score) {
      best = { startHourIndex: i, start, end, hours: slice, score };
    }
  }

  return best;
}

export function selectDaylightHours(
  hours: HourlyForecast[],
  daily: DailyForecast,
  zone: string,
): HourlyForecast[] {
  return hours.filter((h) => isDaylightHour(h, daily, zone));
}

function isContiguous(hours: HourlyForecast[], zone: string): boolean {
  for (let i = 1; i < hours.length; i++) {
    const prev = DateTime.fromISO(hours[i - 1]!.time, { zone });
    const curr = DateTime.fromISO(hours[i]!.time, { zone });
    const diffMin = curr.diff(prev, "minutes").minutes;
    if (Math.round(diffMin) !== 60) return false;
  }
  return true;
}
