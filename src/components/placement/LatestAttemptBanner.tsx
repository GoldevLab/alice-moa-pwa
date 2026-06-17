import { component$ } from '@builder.io/qwik';
import type { PlacementAttemptSummary } from '~/utils/placement-actions';

export const LatestAttemptBanner = component$(
  ({ attempt }: { attempt: PlacementAttemptSummary | null }) => {
    if (!attempt) return null;

    return (
      <section class="mb-8 rounded-2xl border border-teal-200 bg-white/80 dark:bg-gray-800/80 p-6 shadow-sm">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p class="text-sm text-gray-500 uppercase tracking-widest">Último curso recomendado</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              <span class="text-teal-600">{attempt.level}</span>
            </p>
            <p class="text-sm text-gray-500 mt-1">
              {attempt.auto_score}/{attempt.max_auto_score} puntos · Estado: {attempt.status} ·{' '}
              {new Date(attempt.created_at).toLocaleString()}
            </p>
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-300">
            Puedes volver a intentar la prueba si sientes que tu puntaje no refleja tu nivel actual.
          </div>
        </div>
      </section>
    );
  },
);
