import { DateTime } from "luxon";
import type {
  DailyForecast,
  HourlyForecast,
  WindowSummary,
} from "../weather/types.js";

const WEATHER_CODE_LABELS: Record<number, string> = {
  0: "clear",
  1: "mainly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "fog",
  48: "rime fog",
  51: "light drizzle",
  53: "drizzle",
  55: "heavy drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  66: "freezing rain",
  67: "freezing rain",
  71: "light snow",
  73: "snow",
  75: "heavy snow",
  77: "snow grains",
  80: "rain showers",
  81: "rain showers",
  82: "violent rain showers",
  85: "snow showers",
  86: "heavy snow showers",
  95: "thunderstorm",
  96: "thunderstorm with hail",
  99: "thunderstorm with hail",
};

export function describeConditions(hours: HourlyForecast[]): string {
  if (hours.length === 0) return "no data";
  const counts = new Map<number, number>();
  for (const h of hours) {
    counts.set(h.weatherCode, (counts.get(h.weatherCode) ?? 0) + 1);
  }
  let topCode = hours[0]!.weatherCode;
  let topCount = -1;
  for (const [code, count] of counts) {
    if (count > topCount) {
      topCode = code;
      topCount = count;
    }
  }
  return WEATHER_CODE_LABELS[topCode] ?? `code ${topCode}`;
}

export function summarizeWindow(
  start: DateTime,
  end: DateTime,
  hours: HourlyForecast[],
  daily: DailyForecast,
  outsideDaylight: boolean,
): WindowSummary {
  if (hours.length === 0 || outsideDaylight) {
    return {
      startIso: start.toISO() ?? "",
      endIso: end.toISO() ?? "",
      tempMinC: 0,
      tempMaxC: 0,
      rainProbabilityPct: 0,
      precipitationMm: 0,
      thunderstormProbabilityPct: 0,
      windAvgKmh: 0,
      windGustMaxKmh: 0,
      conditionSummary: outsideDaylight ? "outside daylight" : "no data",
      frostDelayRisk: false,
      outsideDaylight,
      hours,
    };
  }

  const temps = hours.map((h) => h.temperatureC);
  const tempMinC = Math.min(...temps);
  const tempMaxC = Math.max(...temps);
  const rainProbabilityPct = Math.max(...hours.map((h) => h.rainProbabilityPct));
  const precipitationMm = hours.reduce((s, h) => s + h.precipitationMm, 0);
  const thunderstormProbabilityPct = Math.max(
    ...hours.map((h) => h.thunderstormProbabilityPct),
  );
  const windAvgKmh =
    hours.reduce((s, h) => s + h.windSpeedKmh, 0) / hours.length;
  const windGustMaxKmh = Math.max(...hours.map((h) => h.windGustKmh));

  const startsBefore9 = start.hour < 9;
  const frostDelayRisk = daily.tempMinC < 2 && startsBefore9;

  return {
    startIso: start.toISO() ?? "",
    endIso: end.toISO() ?? "",
    tempMinC,
    tempMaxC,
    rainProbabilityPct,
    precipitationMm: round1(precipitationMm),
    thunderstormProbabilityPct,
    windAvgKmh: Math.round(windAvgKmh),
    windGustMaxKmh: Math.round(windGustMaxKmh),
    conditionSummary: describeConditions(hours),
    frostDelayRisk,
    outsideDaylight: false,
    hours,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
