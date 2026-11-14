export interface CalculatedSpeechMetrics {
  speakingRateWpm: number;
  fillerWordCount: number;
  fillerBreakdown: Record<string, number>;
  pauseCount: number;
}

const COMMON_FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "you know",
  "so basically",
  "kind of",
  "sort of",
  "actually",
  "honestly",
];

export function calculateSpeechMetrics(
  transcript: string,
  durationSeconds: number
): CalculatedSpeechMetrics {
  const clean = transcript.toLowerCase();
  const words = clean.match(/\b[a-z']+\b/g) || [];
  const wordCount = words.length;

  const durationMin = Math.max(durationSeconds / 60, 0.1);
  const speakingRateWpm = Math.round(wordCount / durationMin);

  const fillerBreakdown: Record<string, number> = {};
  let fillerWordCount = 0;

  for (const filler of COMMON_FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler}\\b`, "gi");
    const matches = clean.match(regex);
    if (matches && matches.length > 0) {
      fillerBreakdown[filler] = matches.length;
      fillerWordCount += matches.length;
    }
  }

  // Heuristic pauses: approximate from ellipses, commas, dashes, and periods
  const pauseMatches = transcript.match(/(\.{3}|—|-{2}|,)/g) || [];
  const pauseCount = pauseMatches.length;

  return {
    speakingRateWpm,
    fillerWordCount,
    fillerBreakdown,
    pauseCount,
  };
}
