import { component$ } from '@builder.io/qwik';

interface TeensLevelResultProps {
  level: string;
  autoScore: number;
  maxAutoScore: number;
  feedback?: string;
}

export const TeensLevelResult = component$(
  ({ level, autoScore, maxAutoScore, feedback }: TeensLevelResultProps) => {
    return (
      <div class="mb-6 space-y-4">
        <div class="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 dark:border-emerald-800 p-6 shadow-sm">
          <p class="text-sm uppercase tracking-widest text-emerald-700 dark:text-emerald-300 font-semibold mb-2">
            Resultado de tu evaluación
          </p>
          <p class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {level}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Puntaje en preguntas auto-calificadas:{' '}
            <span class="font-semibold">
              {autoScore}/{maxAutoScore}
            </span>
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300 mt-3">
            Este es el curso Teens que te recomendamos según tu desempeño. Nuestro equipo
            revisará tus respuestas abiertas (writing, speaking, listening) para confirmar o
            ajustar tu nivel.
          </p>
        </div>

        {feedback && (
          <div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-2">
              Retroalimentación personalizada
            </h3>
            <p class="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line">{feedback}</p>
          </div>
        )}
      </div>
    );
  },
);

export const TeensLevelScale = component$(() => {
  return (
    <details class="mb-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 p-4 text-sm">
      <summary class="cursor-pointer font-semibold text-gray-800 dark:text-gray-200">
        Ver escala de cursos Teens
      </summary>
      <ul class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1 text-gray-600 dark:text-gray-400">
        <li>Teens 1 → A1</li>
        <li>Teens 2 → A1.2</li>
        <li>Teens 3 → A1.3</li>
        <li>Teens 4 → A2</li>
        <li>Teens 5 → A2.1</li>
        <li>Teens 6 → B1</li>
        <li>Teens 7 → B1.2</li>
        <li>Teens 8 → B1.3</li>
        <li>Teens 9 → B2</li>
        <li>Teens 10 → B2.1</li>
        <li>Teens 11 → B2.2</li>
        <li>Teens 12 → C1</li>
      </ul>
    </details>
  );
});
