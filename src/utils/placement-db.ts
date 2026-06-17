import type { Client } from '@libsql/client';

export async function ensurePlacementFeedbackColumn(client: Client) {
  try {
    const info = await client.execute('PRAGMA table_info(placement_test_attempts)');
    const hasColumn = info.rows?.some((row: any) => row.name === 'feedback_summary');
    if (!hasColumn) {
      await client.execute('ALTER TABLE placement_test_attempts ADD COLUMN feedback_summary TEXT');
      console.log('[PLACEMENT] Added feedback_summary column to placement_test_attempts');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/duplicate column/i.test(message)) {
      console.warn('[PLACEMENT] Could not ensure feedback_summary column exists', error);
    }
  }
}

export async function ensureSourceColumn(client: Client) {
  try {
    const info = await client.execute('PRAGMA table_info(placement_test_attempts)');
    const hasColumn = info.rows?.some((row: any) => row.name === 'source');
    if (!hasColumn) {
      await client.execute('ALTER TABLE placement_test_attempts ADD COLUMN source TEXT');
      console.log('[PLACEMENT] Added source column to placement_test_attempts');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/duplicate column/i.test(message)) {
      console.warn('[PLACEMENT] Could not check/add source column', error);
    }
  }
}

export function formatPlacementError(error: unknown, fallbackMessage: string): string {
  const reference =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8).toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase();

  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Error desconocido';

  console.error(`[PLACEMENT][${reference}]`, errorMessage, error);
  return `${fallbackMessage} (Código de referencia: ${reference})`;
}
