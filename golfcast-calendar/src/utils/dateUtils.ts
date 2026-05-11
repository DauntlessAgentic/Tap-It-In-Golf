import { DateTime } from "luxon";
import type { DailyForecast, HourlyForecast } from "../weather/types.js";

export function localDateKey(iso: string, zone: string): string {
  return DateTime.fromISO(iso, { zone }).toFormat("yyyy-LL-dd");
}

export function hoursForDate(
  hourly: HourlyForecast[],
  date: string,
  zone: string,
): HourlyForecast[] {
  return hourly.filter((h) => localDateKey(h.time, zone) === date);
}

export function dailyByDate(
  daily: DailyForecast[],
): Map<string, DailyForecast> {
  return new Map(daily.map((d) => [d.date, d]));
}

export interface ClippedWindow {
  start: DateTime;
  end: DateTime;
  outsideDaylight: boolean;
}

export function clipWindowToDaylight(
  date: string,
  startHour: number,
  endHour: number,
  daily: DailyForecast,
  zone: string,
  options: { clipStart: boolean; clipEnd: boolean },
): ClippedWindow {
  const dayStart = DateTime.fromISO(date, { zone }).startOf("day");
  let start = dayStart.set({ hour: startHour });
  let end = dayStart.set({ hour: endHour });

  if (options.clipStart) {
    const sunrise = DateTime.fromISO(daily.sunrise, { zone });
    if (sunrise.isValid && sunrise > start) start = sunrise;
  }
  if (options.clipEnd) {
    const sunset = DateTime.fromISO(daily.sunset, { zone });
    if (sunset.isValid && sunset < end) end = sunset;
  }

  const outsideDaylight = end.diff(start, "minutes").minutes < 60;
  return { start, end, outsideDaylight };
}

export function hoursWithin(
  hourly: HourlyForecast[],
  start: DateTime,
  end: DateTime,
  zone: string,
): HourlyForecast[] {
  return hourly.filter((h) => {
    const dt = DateTime.fromISO(h.time, { zone });
    return dt >= start && dt < end;
  });
}

export function isDaylightHour(
  hour: HourlyForecast,
  daily: DailyForecast,
  zone: string,
): boolean {
  const dt = DateTime.fromISO(hour.time, { zone });
  const sunrise = DateTime.fromISO(daily.sunrise, { zone });
  const sunset = DateTime.fromISO(daily.sunset, { zone });
  return dt >= sunrise && dt < sunset;
}
