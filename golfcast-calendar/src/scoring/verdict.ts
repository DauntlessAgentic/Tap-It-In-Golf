export type VerdictKey = "book" | "good" | "watch" | "risky" | "avoid";

export interface Verdict {
  key: VerdictKey;
  emoji: string;
  label: string;
  colorId: string;
}

const VERDICTS: Verdict[] = [
  { key: "book", emoji: "✅", label: "Book it", colorId: "10" },
  { key: "good", emoji: "🙂", label: "Good", colorId: "2" },
  { key: "watch", emoji: "⚠️", label: "Watch", colorId: "5" },
  { key: "risky", emoji: "🌧️", label: "Risky", colorId: "6" },
  { key: "avoid", emoji: "❌", label: "Avoid", colorId: "11" },
];

export function verdictForScore(score: number): Verdict {
  if (score >= 85) return VERDICTS[0]!;
  if (score >= 70) return VERDICTS[1]!;
  if (score >= 55) return VERDICTS[2]!;
  if (score >= 35) return VERDICTS[3]!;
  return VERDICTS[4]!;
}

export function emojiForHourScore(score: number): string {
  return verdictForScore(score).emoji;
}
