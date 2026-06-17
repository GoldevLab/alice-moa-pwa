export interface TeensLevel {
  teens: number;
  cefr: string;
  /** Etiqueta corta: "Teens 6" */
  label: string;
  /** Etiqueta completa: "Teens 6 (B1)" */
  fullLabel: string;
}

export const TEENS_LEVELS: readonly TeensLevel[] = [
  { teens: 1, cefr: 'A1', label: 'Teens 1', fullLabel: 'Teens 1 (A1)' },
  { teens: 2, cefr: 'A1.2', label: 'Teens 2', fullLabel: 'Teens 2 (A1.2)' },
  { teens: 3, cefr: 'A1.3', label: 'Teens 3', fullLabel: 'Teens 3 (A1.3)' },
  { teens: 4, cefr: 'A2', label: 'Teens 4', fullLabel: 'Teens 4 (A2)' },
  { teens: 5, cefr: 'A2.1', label: 'Teens 5', fullLabel: 'Teens 5 (A2.1)' },
  { teens: 6, cefr: 'B1', label: 'Teens 6', fullLabel: 'Teens 6 (B1)' },
  { teens: 7, cefr: 'B1.2', label: 'Teens 7', fullLabel: 'Teens 7 (B1.2)' },
  { teens: 8, cefr: 'B1.3', label: 'Teens 8', fullLabel: 'Teens 8 (B1.3)' },
  { teens: 9, cefr: 'B2', label: 'Teens 9', fullLabel: 'Teens 9 (B2)' },
  { teens: 10, cefr: 'B2.1', label: 'Teens 10', fullLabel: 'Teens 10 (B2.1)' },
  { teens: 11, cefr: 'B2.2', label: 'Teens 11', fullLabel: 'Teens 11 (B2.2)' },
  { teens: 12, cefr: 'C1', label: 'Teens 12', fullLabel: 'Teens 12 (C1)' },
] as const;

/**
 * Umbrales mínimos de aciertos sobre 31 preguntas auto-calificadas.
 * Orden descendente: el primero que cumpla el estudiante es su nivel.
 */
const SCORE_THRESHOLDS: { minScoreOf31: number; teens: number }[] = [
  { minScoreOf31: 28, teens: 12 },
  { minScoreOf31: 26, teens: 11 },
  { minScoreOf31: 24, teens: 10 },
  { minScoreOf31: 21, teens: 9 },
  { minScoreOf31: 18, teens: 8 },
  { minScoreOf31: 16, teens: 7 },
  { minScoreOf31: 13, teens: 6 },
  { minScoreOf31: 10, teens: 5 },
  { minScoreOf31: 7, teens: 4 },
  { minScoreOf31: 4, teens: 3 },
  { minScoreOf31: 2, teens: 2 },
  { minScoreOf31: 0, teens: 1 },
];

const teensByNumber = new Map(TEENS_LEVELS.map((level) => [level.teens, level]));

export function getTeensLevelByNumber(teens: number): TeensLevel | undefined {
  return teensByNumber.get(teens);
}

export function inferTeensLevel(score: number, max: number): TeensLevel {
  if (max <= 0) {
    return TEENS_LEVELS[0];
  }

  const scaledScore = Math.round((score / max) * 31);

  for (const threshold of SCORE_THRESHOLDS) {
    if (scaledScore >= threshold.minScoreOf31) {
      return teensByNumber.get(threshold.teens) ?? TEENS_LEVELS[0];
    }
  }

  return TEENS_LEVELS[0];
}

export function formatTeensLevel(level: TeensLevel): string {
  return level.fullLabel;
}

export function getNextTeensLevel(level: TeensLevel): TeensLevel | null {
  return teensByNumber.get(level.teens + 1) ?? null;
}

export function getTeensLevelTableForPrompt(): string {
  return TEENS_LEVELS.map((l) => `- ${l.fullLabel}`).join('\n');
}

export const PENDING_REVIEW_LEVEL = 'Pendiente de revisión';
