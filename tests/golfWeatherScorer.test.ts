import { describe, expect, it } from "vitest";
import { scoreGolfWindow } from "../src/scoring/golfWeatherScorer.js";

const baseline = {
  tempMinC: 18,
  tempMaxC: 24,
  rainProbabilityPct: 0,
  precipitationMm: 0,
  thunderstormProbabilityPct: 0,
  windAvgKmh: 10,
  windGustMaxKmh: 18,
  frostDelayRisk: false,
  weatherCodes: [1, 2, 1, 2],
};

describe("scoreGolfWindow", () => {
  it("perfect conditions score at the top", () => {
    expect(scoreGolfWindow(baseline)).toBe(100);
  });

  it("rain probability penalises 0.4 per percent", () => {
    expect(scoreGolfWindow({ ...baseline, rainProbabilityPct: 50 })).toBe(80);
  });

  it("precipitation amount penalises heavily", () => {
    expect(scoreGolfWindow({ ...baseline, precipitationMm: 5 })).toBe(60);
  });

  it("thunderstorm probability is weighted 1.5x", () => {
    expect(
      scoreGolfWindow({ ...baseline, thunderstormProbabilityPct: 40 }),
    ).toBe(40);
  });

  it("wind avg under 25 is free", () => {
    expect(scoreGolfWindow({ ...baseline, windAvgKmh: 24 })).toBe(100);
  });

  it("wind avg over 25 is penalised", () => {
    expect(scoreGolfWindow({ ...baseline, windAvgKmh: 35 })).toBe(85);
  });

  it("gusts over 40 km/h are penalised", () => {
    expect(scoreGolfWindow({ ...baseline, windGustMaxKmh: 50 })).toBe(80);
  });

  it("cold morning penalises", () => {
    expect(scoreGolfWindow({ ...baseline, tempMinC: 4 })).toBe(88);
  });

  it("hot afternoon penalises", () => {
    expect(scoreGolfWindow({ ...baseline, tempMaxC: 35 })).toBe(85);
  });

  it("frost delay drops 25", () => {
    expect(scoreGolfWindow({ ...baseline, frostDelayRisk: true })).toBe(75);
  });

  it("severe weather codes floor at 20", () => {
    expect(
      scoreGolfWindow({ ...baseline, weatherCodes: [95, 1, 2, 1] }),
    ).toBe(20);
    expect(
      scoreGolfWindow({ ...baseline, weatherCodes: [75, 1, 2, 1] }),
    ).toBe(20);
  });

  it("clamps to 0 with massive penalties", () => {
    expect(
      scoreGolfWindow({
        ...baseline,
        rainProbabilityPct: 100,
        precipitationMm: 50,
        thunderstormProbabilityPct: 100,
      }),
    ).toBe(0);
  });

  it("outsideDaylight forces zero", () => {
    expect(scoreGolfWindow({ ...baseline, outsideDaylight: true })).toBe(0);
  });
});
