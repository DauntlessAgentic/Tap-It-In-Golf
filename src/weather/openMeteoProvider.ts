import { DateTime } from "luxon";
import type { CourseConfig } from "../config/golfcast.config.js";
import type { DailyForecast, ForecastBundle, HourlyForecast } from "./types.js";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

interface OpenMeteoResponse {
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability?: number[];
    precipitation: number[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
    weather_code: number[];
  };
  daily: {
    time: string[];
    sunrise: string[];
    sunset: string[];
    temperature_2m_min: number[];
    temperature_2m_max: number[];
  };
}

export async function fetchForecast(
  course: CourseConfig,
  forecastDays: number,
): Promise<ForecastBundle> {
  const url = new URL(BASE_URL);
  url.searchParams.set("latitude", String(course.latitude));
  url.searchParams.set("longitude", String(course.longitude));
  url.searchParams.set("timezone", course.timeZone);
  url.searchParams.set("forecast_days", String(forecastDays));
  url.searchParams.set("windspeed_unit", "kmh");
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("precipitation_unit", "mm");
  url.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "precipitation_probability",
      "precipitation",
      "wind_speed_10m",
      "wind_gusts_10m",
      "weather_code",
    ].join(","),
  );
  url.searchParams.set(
    "daily",
    [
      "sunrise",
      "sunset",
      "temperature_2m_min",
      "temperature_2m_max",
    ].join(","),
  );

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Open-Meteo request failed: ${res.status} ${res.statusText} — ${body}`,
    );
  }
  const data = (await res.json()) as OpenMeteoResponse;
  return parseResponse(data, course.timeZone);
}

function parseResponse(
  data: OpenMeteoResponse,
  zone: string,
): ForecastBundle {
  const hourly: HourlyForecast[] = data.hourly.time.map((time, idx) => {
    const code = data.hourly.weather_code[idx] ?? 0;
    return {
      time: DateTime.fromISO(time, { zone }).toISO() ?? time,
      temperatureC: data.hourly.temperature_2m[idx] ?? 0,
      rainProbabilityPct: data.hourly.precipitation_probability?.[idx] ?? 0,
      precipitationMm: data.hourly.precipitation[idx] ?? 0,
      thunderstormProbabilityPct: thunderstormProbabilityFromCode(code),
      windSpeedKmh: data.hourly.wind_speed_10m[idx] ?? 0,
      windGustKmh: data.hourly.wind_gusts_10m[idx] ?? 0,
      weatherCode: code,
    };
  });

  const daily: DailyForecast[] = data.daily.time.map((date, idx) => ({
    date,
    sunrise: DateTime.fromISO(data.daily.sunrise[idx] ?? date, { zone }).toISO() ?? "",
    sunset: DateTime.fromISO(data.daily.sunset[idx] ?? date, { zone }).toISO() ?? "",
    tempMinC: data.daily.temperature_2m_min[idx] ?? 0,
    tempMaxC: data.daily.temperature_2m_max[idx] ?? 0,
  }));

  return {
    hourly,
    daily,
    fetchedAt: DateTime.utc().toISO() ?? new Date().toISOString(),
  };
}

function thunderstormProbabilityFromCode(code: number): number {
  if (code === 95) return 80;
  if (code === 96 || code === 99) return 95;
  return 0;
}
