import { describe, expect, it } from "vitest";
import { verdictForScore } from "../src/scoring/verdict.js";

describe("verdictForScore", () => {
  it.each([
    [100, "book", "10"],
    [85, "book", "10"],
    [84, "good", "2"],
    [70, "good", "2"],
    [69, "watch", "5"],
    [55, "watch", "5"],
    [54, "risky", "6"],
    [35, "risky", "6"],
    [34, "avoid", "11"],
    [0, "avoid", "11"],
  ])("score %i → %s (color %s)", (score, key, colorId) => {
    const v = verdictForScore(score);
    expect(v.key).toBe(key);
    expect(v.colorId).toBe(colorId);
  });
});
