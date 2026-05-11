import type { HourlyForecast, WindowSummary } from "../weather/types.js";

export interface ScoreInputs {
  tempMinC: number;
  tempMaxC: number;
  rainProbabilityPct: number;
  precipitationMm: number;
  thunderstormProbabilityPct: number;
  windAvgKmh: number;
  windGustMaxKmh: number;
  frostDelayRisk: boolean;
  weatherCodes: number[];
  outsideDaylight?: boolean;
}

export function scoreGolfWindow(inputs: ScoreInputs): number {
  if (inputs.outsideDaylight) return 0;

  let score = 100;

  score -= inputs.rainProbabilityPct * 0.4;
  score -= inputs.precipitationMm * 8;
  score -= inputs.thunderstormProbabilityPct * 1.5;

  if (inputs.windAvgKmh > 25) {
    score -= (inputs.windAvgKmh - 25) * 1.5;
  }
  if (inputs.windGustMaxKmh > 40) {
    score -= (inputs.windGustMaxKmh - 40) * 2;
  }

  if (inputs.tempMinC < 8) {
    score -= (8 - inputs.tempMinC) * 3;
  }
  if (inputs.tempMaxC > 30) {
    score -= (inputs.tempMaxC - 30) * 3;
  }

  if (inputs.frostDelayRisk) {
    score -= 25;
  }

  const hasSevere = inputs.weatherCodes.some(
    (code) => code >= 75 && (code <= 77 || code >= 95),
  );

  let clamped = Math.max(0, Math.min(100, score));
  if (hasSevere) {
    clamped = Math.min(clamped, 20);
  }
  return Math.round(clamped);
}

export function scoreFromWindowSummary(summary: WindowSummary): number {
  return scoreGolfWindow({
    tempMinC: summary.tempMinC,
    tempMaxC: summary.tempMaxC,
    rainProbabilityPct: summary.rainProbabilityPct,
    precipitationMm: summary.precipitationMm,
    thunderstormProbabilityPct: summary.thunderstormProbabilityPct,
    windAvgKmh: summary.windAvgKmh,
    windGustMaxKmh: summary.windGustMaxKmh,
    frostDelayRisk: summary.frostDelayRisk,
    weatherCodes: summary.hours.map((h) => h.weatherCode),
    outsideDaylight: summary.outsideDaylight,
  });
}

export function scoreSingleHour(hour: HourlyForecast): number {
  return scoreGolfWindow({
    tempMinC: hour.temperatureC,
    tempMaxC: hour.temperatureC,
    rainProbabilityPct: hour.rainProbabilityPct,
    precipitationMm: hour.precipitationMm,
    thunderstormProbabilityPct: hour.thunderstormProbabilityPct,
    windAvgKmh: hour.windSpeedKmh,
    windGustMaxKmh: hour.windGustKmh,
    frostDelayRisk: false,
    weatherCodes: [hour.weatherCode],
  });
}
