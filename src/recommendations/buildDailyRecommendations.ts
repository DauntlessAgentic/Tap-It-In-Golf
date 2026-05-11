import { DateTime } from "luxon";
import {
  bestWindowHours,
  course,
  windows,
  type CourseConfig,
  type WindowDefinition,
} from "../config/golfcast.config.js";
import {
  scoreFromWindowSummary,
  scoreSingleHour,
} from "../scoring/golfWeatherScorer.js";
import { emojiForHourScore, verdictForScore } from "../scoring/verdict.js";
import {
  clipWindowToDaylight,
  dailyByDate,
  hoursForDate,
  hoursWithin,
} from "../utils/dateUtils.js";
import type { ForecastBundle, WindowSummary } from "../weather/types.js";
import { findBestWindow, selectDaylightHours } from "./findBestWindow.js";
import { summarizeWindow } from "./summarizeWindow.js";

export type WindowKey = "best" | "morning" | "midday" | "evening";

export interface RecommendationEvent {
  date: string;
  windowKey: WindowKey;
  windowLabel: "Best" | "AM" | "Mid" | "PM";
  windowLongLabel: "Daily Best" | "Morning" | "Midday" | "Evening";
  summary: WindowSummary;
  score: number;
  title: string;
  description: string;
  colorId: string;
  startIso: string;
  endIso: string;
  course: CourseConfig;
  fetchedAt: string;
}

export function buildRecommendations(
  forecast: ForecastBundle,
): RecommendationEvent[] {
  const zone = course.timeZone;
  const dailyMap = dailyByDate(forecast.daily);
  const events: RecommendationEvent[] = [];

  for (const daily of forecast.daily) {
    const date = daily.date;
    const dayHours = hoursForDate(forecast.hourly, date, zone);
    if (dayHours.length === 0) continue;

    for (const def of windows) {
      events.push(buildWindowEvent(date, def, dayHours, daily, forecast, zone));
    }

    const daylight = selectDaylightHours(dayHours, daily, zone);
    const best = findBestWindow(daylight, daily, zone, bestWindowHours);
    if (best) {
      const summary = summarizeWindow(
        best.start,
        best.end,
        best.hours,
        daily,
        false,
      );
      events.push(
        eventFromSummary(
          date,
          "best",
          "Best",
          "Daily Best",
          summary,
          forecast.fetchedAt,
        ),
      );
    }
  }

  return events;
}

function buildWindowEvent(
  date: string,
  def: WindowDefinition,
  dayHours: ReturnType<typeof hoursForDate>,
  daily: ReturnType<typeof dailyByDate> extends Map<string, infer V> ? V : never,
  forecast: ForecastBundle,
  zone: string,
): RecommendationEvent {
  const clip = clipWindowToDaylight(date, def.startHour, def.endHour, daily, zone, {
    clipStart: def.clipToSunrise,
    clipEnd: def.clipToSunset,
  });

  const hours = clip.outsideDaylight
    ? []
    : hoursWithin(dayHours, clip.start, clip.end, zone);

  const summary = summarizeWindow(
    clip.start,
    clip.end,
    hours,
    daily,
    clip.outsideDaylight,
  );

  return eventFromSummary(
    date,
    def.key,
    def.label,
    def.longLabel,
    summary,
    forecast.fetchedAt,
    clip.outsideDaylight,
  );
}

function eventFromSummary(
  date: string,
  windowKey: WindowKey,
  windowLabel: RecommendationEvent["windowLabel"],
  windowLongLabel: RecommendationEvent["windowLongLabel"],
  summary: WindowSummary,
  fetchedAt: string,
  outsideDaylight = false,
): RecommendationEvent {
  const score = outsideDaylight ? 0 : scoreFromWindowSummary(summary);
  const verdict = verdictForScore(score);

  return {
    date,
    windowKey,
    windowLabel,
    windowLongLabel,
    summary,
    score,
    title: buildTitle(windowLabel, verdict.emoji, summary, outsideDaylight),
    description: buildDescription(
      windowLongLabel,
      summary,
      score,
      verdict.label,
      verdict.emoji,
      fetchedAt,
      outsideDaylight,
    ),
    colorId: verdict.colorId,
    startIso: summary.startIso,
    endIso: summary.endIso,
    course,
    fetchedAt,
  };
}

function buildTitle(
  windowLabel: string,
  emoji: string,
  summary: WindowSummary,
  outsideDaylight: boolean,
): string {
  if (outsideDaylight) {
    return `⛳ ❌ ${windowLabel}: outside daylight`;
  }
  const tempRange = `${Math.round(summary.tempMinC)}–${Math.round(summary.tempMaxC)}°C`;
  const wind =
    summary.windGustMaxKmh > summary.windAvgKmh + 5
      ? `wind ${summary.windAvgKmh} g${summary.windGustMaxKmh}`
      : `wind ${summary.windAvgKmh}`;
  return `⛳ ${emoji} ${windowLabel}: ${tempRange} · rain ${summary.rainProbabilityPct}% · ${wind}`;
}

function buildDescription(
  windowLongLabel: string,
  summary: WindowSummary,
  score: number,
  verdictLabel: string,
  verdictEmoji: string,
  fetchedAt: string,
  outsideDaylight: boolean,
): string {
  const lines: string[] = [];
  lines.push(`GolfCast Score: ${score}/100 — ${verdictEmoji} ${verdictLabel}`);
  const startLocal = formatLocalRange(summary.startIso, summary.endIso);
  lines.push(`Window: ${windowLongLabel}${startLocal ? ` (${startLocal})` : ""}`);
  lines.push(`Location: ${course.shortName}, ${course.city.split("(")[0]?.trim() ?? course.city}`);
  lines.push("");

  if (outsideDaylight) {
    lines.push("Note: window is entirely outside daylight (no playable time).");
  } else {
    lines.push(`Temperature: ${Math.round(summary.tempMinC)}–${Math.round(summary.tempMaxC)}°C`);
    lines.push(`Rain probability: ${summary.rainProbabilityPct}%`);
    lines.push(`Expected precipitation: ${summary.precipitationMm} mm`);
    lines.push(`Thunderstorm probability: ${summary.thunderstormProbabilityPct}%`);
    lines.push(`Wind avg: ${summary.windAvgKmh} km/h`);
    lines.push(`Wind gust max: ${summary.windGustMaxKmh} km/h`);
    lines.push(`Frost delay risk: ${summary.frostDelayRisk ? "yes" : "no"}`);
    lines.push(`Conditions: ${summary.conditionSummary}`);
    lines.push("");
    lines.push("Hourly heatmap (window):");
    lines.push("  " + buildHeatmap(summary));
  }

  lines.push("");
  lines.push("Source: Open-Meteo");
  lines.push(`Generated: ${fetchedAt}`);
  return lines.join("\n");
}

function buildHeatmap(summary: WindowSummary): string {
  return summary.hours
    .map((h) => {
      const hourLabel = DateTime.fromISO(h.time, {
        zone: course.timeZone,
      }).toFormat("HH:mm");
      const score = scoreSingleHour(h);
      return `${hourLabel} ${emojiForHourScore(score)}`;
    })
    .join("  ");
}

function formatLocalRange(startIso: string, endIso: string): string {
  const start = DateTime.fromISO(startIso, { zone: course.timeZone });
  const end = DateTime.fromISO(endIso, { zone: course.timeZone });
  if (!start.isValid || !end.isValid) return "";
  return `${start.toFormat("HH:mm")}–${end.toFormat("HH:mm")} ${start.toFormat("ZZZZ")}`;
}
