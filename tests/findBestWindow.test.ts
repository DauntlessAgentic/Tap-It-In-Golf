import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import {
  findBestWindow,
  selectDaylightHours,
} from "../src/recommendations/findBestWindow.js";
import type { DailyForecast, HourlyForecast } from "../src/weather/types.js";

const ZONE = "America/Toronto";

function makeHour(
  dayIso: string,
  hour: number,
  overrides: Partial<HourlyForecast> = {},
): HourlyForecast {
  return {
    time: DateTime.fromISO(dayIso, { zone: ZONE }).set({ hour }).toISO()!,
    temperatureC: 20,
    rainProbabilityPct: 0,
    precipitationMm: 0,
    thunderstormProbabilityPct: 0,
    windSpeedKmh: 10,
    windGustKmh: 15,
    weatherCode: 1,
    ...overrides,
  };
}

function makeDaily(date: string): DailyForecast {
  const day = DateTime.fromISO(date, { zone: ZONE });
  return {
    date,
    sunrise: day.set({ hour: 6 }).toISO()!,
    sunset: day.set({ hour: 20 }).toISO()!,
    tempMinC: 14,
    tempMaxC: 26,
  };
}

describe("findBestWindow", () => {
  const date = "2026-06-15";
  const daily = makeDaily(date);

  it("returns null when daylight has fewer than window-size hours", () => {
    const hours = [makeHour(date, 7), makeHour(date, 8)];
    expect(findBestWindow(hours, daily, ZONE, 4)).toBeNull();
  });

  it("picks the highest-scoring contiguous 4-hour block", () => {
    const hours: HourlyForecast[] = [];
    for (let h = 6; h < 20; h++) {
      const isAfternoonStorm = h >= 14 && h < 18;
      hours.push(
        makeHour(date, h, {
          rainProbabilityPct: isAfternoonStorm ? 90 : 5,
          thunderstormProbabilityPct: isAfternoonStorm ? 60 : 0,
          weatherCode: isAfternoonStorm ? 95 : 1,
        }),
      );
    }
    const result = findBestWindow(hours, daily, ZONE, 4);
    expect(result).not.toBeNull();
    expect(result!.score).toBeGreaterThanOrEqual(90);
    expect(result!.start.hour).toBeLessThan(14);
  });

  it("only considers contiguous blocks", () => {
    const hours: HourlyForecast[] = [
      makeHour(date, 7),
      makeHour(date, 8),
      makeHour(date, 12),
      makeHour(date, 13),
      makeHour(date, 14),
      makeHour(date, 15),
    ];
    const result = findBestWindow(hours, daily, ZONE, 4);
    expect(result).not.toBeNull();
    expect(result!.start.hour).toBe(12);
    expect(result!.end.hour).toBe(16);
  });
});

describe("selectDaylightHours", () => {
  it("excludes hours before sunrise and after sunset", () => {
    const date = "2026-06-15";
    const daily = makeDaily(date);
    const hours = [
      makeHour(date, 4),
      makeHour(date, 6),
      makeHour(date, 12),
      makeHour(date, 19),
      makeHour(date, 21),
    ];
    const out = selectDaylightHours(hours, daily, ZONE);
    const localHours = out.map((h) =>
      DateTime.fromISO(h.time, { zone: ZONE }).hour,
    );
    expect(localHours).toEqual([6, 12, 19]);
  });
});
