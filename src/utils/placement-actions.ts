import type { RequestEventAction, RequestEventLoader } from '@builder.io/qwik-city';
import {
  placementSections,
  type PlacementAnswerMap,
  computePlacementScore,
} from '~/data/placement-test';
import { getUserId } from '~/utils/auth';
import { tursoClient } from '~/utils/turso';
import {
  ensurePlacementFeedbackColumn,
  ensureSourceColumn,
  formatPlacementError,
} from '~/utils/placement-db';
import {
  serverGeneratePlacementFeedback,
  sendPlacementResultNotification,
} from '~/utils/placement-server';

export interface PlacementAttemptSummary {
  id?: string | number;
  auto_score: number;
  max_auto_score: number;
  level: string;
  status: string;
  created_at: string;
}

export interface PlacementLoaderData {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  latestAttempt: PlacementAttemptSummary | null;
  existingAnswers: Record<string, string>;
}

export type PlacementSource = 'standard' | 'placement_after';

export async function loadPlacementPageData(
  requestEvent: RequestEventLoader,
  source: PlacementSource,
): Promise<PlacementLoaderData> {
  const userId = getUserId(requestEvent);
  if (!userId) {
    throw requestEvent.redirect(302, '/auth');
  }

  const client = tursoClient(requestEvent);
  await ensurePlacementFeedbackColumn(client);
  await ensureSourceColumn(client);

  const userResult = await client.execute({
    sql: 'SELECT id, email, name FROM users WHERE id = ? LIMIT 1',
    args: [userId],
  });

  if (userResult.rows.length === 0) {
    throw requestEvent.redirect(302, '/auth');
  }

  const userRow = userResult.rows[0] as any;

  const attemptSql =
    source === 'placement_after'
      ? `SELECT id, auto_score, max_auto_score, level, status, created_at, answers_json
         FROM placement_test_attempts
         WHERE user_id = ? AND source = 'placement_after'
         ORDER BY created_at DESC
         LIMIT 1`
      : `SELECT id, auto_score, max_auto_score, level, status, created_at, answers_json
         FROM placement_test_attempts
         WHERE user_id = ? AND (source IS NULL OR source != 'placement_after')
         ORDER BY created_at DESC
         LIMIT 1`;

  const attemptsResult = await client.execute({
    sql: attemptSql,
    args: [userId],
  });

  let latestAttempt: PlacementAttemptSummary | null = null;
  let existingAnswers: Record<string, string> = {};

  if (attemptsResult.rows.length > 0) {
    const attemptRow = attemptsResult.rows[0] as any;
    latestAttempt = {
      id: attemptRow.id,
      auto_score: Number(attemptRow.auto_score ?? 0),
      max_auto_score: Number(attemptRow.max_auto_score ?? 0),
      level: attemptRow.level ?? 'Pending review',
      status: attemptRow.status ?? 'submitted',
      created_at: attemptRow.created_at ?? new Date().toISOString(),
    };
    try {
      const parsed = JSON.parse(attemptRow.answers_json ?? '{}');
      if (parsed && typeof parsed === 'object') {
        existingAnswers = parsed;
      }
    } catch (error) {
      console.warn('[PLACEMENT] Could not parse stored answers', error);
    }
  }

  return {
    user: {
      id: String(userRow.id),
      email: userRow.email as string,
      name: (userRow.name as string) ?? null,
    },
    latestAttempt,
    existingAnswers,
  };
}

export async function submitPlacementAttempt(
  requestEvent: RequestEventAction,
  data: Record<string, string | undefined>,
  options: {
    source: PlacementSource;
    extraFields?: string[];
  },
) {
  const userId = getUserId(requestEvent);
  if (!userId) {
    throw requestEvent.redirect(302, '/auth');
  }

  const storedAnswers: Record<string, string> = {};
  const scoringAnswers: PlacementAnswerMap = {};
  const missingRequired: string[] = [];

  for (const section of placementSections) {
    for (const question of section.questions) {
      const rawValue = data[question.id];
      const normalizedValue = typeof rawValue === 'string' ? rawValue.trim() : '';

      storedAnswers[question.id] = normalizedValue;
      if (normalizedValue) {
        scoringAnswers[question.id] = normalizedValue;
      }

      if (question.required && !normalizedValue) {
        missingRequired.push(question.prompt);
      }
    }
  }

  for (const field of options.extraFields ?? []) {
    const val = data[field];
    if (typeof val === 'string' && val.trim()) {
      storedAnswers[field] = val.trim();
    }
  }

  if (missingRequired.length > 0) {
    const missingPreview = missingRequired.slice(0, 3).join(', ');
    return {
      success: false as const,
      error: `Faltan respuestas obligatorias (${missingPreview}${missingRequired.length > 3 ? ', ...' : ''}).`,
    };
  }

  const { total, max, level } = computePlacementScore(scoringAnswers);

  let feedback: string;
  let finalLevel = level;
  try {
    const result = await serverGeneratePlacementFeedback({
      answers: storedAnswers,
      autoScore: total,
      maxScore: max,
      autoLevel: level,
    });
    feedback = result.feedback;
    finalLevel = result.level || level;
    // Persistimos la transcripción del audio en vez del base64 crudo para
    // evitar inflar la fila y dejar las respuestas legibles para el revisor.
    for (const [key, text] of Object.entries(result.transcripts)) {
      if (typeof text === 'string') {
        storedAnswers[key] = text;
      }
    }
  } catch (error) {
    console.error('[PLACEMENT] Feedback generation failed', error);
    feedback = `Tu curso recomendado es ${level} (${total}/${max} puntos). Guardamos tu intento; el equipo revisará tus respuestas abiertas.`;
    // Si falla el feedback (y por ende la transcripción), no guardamos los
    // data-URL base64 de audio para no almacenar blobs enormes.
    for (const key of Object.keys(storedAnswers)) {
      if (key.startsWith('q_audio_') && storedAnswers[key]?.startsWith('data:audio/')) {
        storedAnswers[key] = '[Audio grabado — transcripción no disponible]';
      }
    }
  }

  const client = tursoClient(requestEvent);

  try {
    await ensurePlacementFeedbackColumn(client);
    await ensureSourceColumn(client);
  } catch (error) {
    return {
      success: false as const,
      error: formatPlacementError(
        error,
        'No pudimos preparar la base de datos. Intenta nuevamente en unos segundos.',
      ),
    };
  }

  const sourceValue = options.source === 'placement_after' ? 'placement_after' : null;

  try {
    if (sourceValue) {
      await client.execute({
        sql: `INSERT INTO placement_test_attempts
              (user_id, full_name, email, phone, country, date_of_birth, address, answers_json, auto_score, max_auto_score, level, status, feedback_summary, source)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          userId,
          storedAnswers.q1_name || null,
          storedAnswers.q1_email || null,
          storedAnswers.q1_phone || null,
          storedAnswers.q2_country || null,
          storedAnswers.q3_birthdate || null,
          storedAnswers.q4_address || null,
          JSON.stringify(storedAnswers),
          total,
          max,
          finalLevel,
          'submitted',
          feedback,
          sourceValue,
        ],
      });
    } else {
      await client.execute({
        sql: `INSERT INTO placement_test_attempts
              (user_id, full_name, email, phone, country, date_of_birth, address, answers_json, auto_score, max_auto_score, level, status, feedback_summary)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          userId,
          storedAnswers.q1_name || null,
          storedAnswers.q1_email || null,
          storedAnswers.q1_phone || null,
          storedAnswers.q2_country || null,
          storedAnswers.q3_birthdate || null,
          storedAnswers.q4_address || null,
          JSON.stringify(storedAnswers),
          total,
          max,
          finalLevel,
          'submitted',
          feedback,
        ],
      });
    }
  } catch (error) {
    return {
      success: false as const,
      error: formatPlacementError(
        error,
        'No pudimos guardar tu intento. Intenta nuevamente en unos segundos.',
      ),
    };
  }

  try {
    await sendPlacementResultNotification({
      userId,
      userName: storedAnswers.q1_name ?? 'Sin nombre',
      userEmail: storedAnswers.q1_email ?? 'Sin correo',
      autoScore: total,
      maxScore: max,
      level: finalLevel,
      feedback,
    });
  } catch (notifyError) {
    console.error('[PLACEMENT] Notification error', notifyError);
  }

  return {
    success: true as const,
    autoScore: total,
    maxAutoScore: max,
    level: finalLevel,
    feedback,
  };
}

export function buildInitialAnswers(
  loader: PlacementLoaderData,
): Record<string, string> {
  const initialAnswers: Record<string, string> = {};

  for (const section of placementSections) {
    for (const question of section.questions) {
      const stored = loader.existingAnswers?.[question.id];
      if (typeof stored === 'string' && stored.length > 0) {
        initialAnswers[question.id] = stored;
      } else if (question.id === 'q1_email') {
        initialAnswers[question.id] = loader.user.email ?? '';
      } else if (question.id === 'q1_name' && loader.user.name) {
        initialAnswers[question.id] = loader.user.name;
      } else {
        initialAnswers[question.id] = '';
      }
    }
  }

  return initialAnswers;
}

export { formatPlacementError };
