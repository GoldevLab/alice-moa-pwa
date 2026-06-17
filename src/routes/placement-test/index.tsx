import { component$, useSignal, useStore, useVisibleTask$, $ } from '@builder.io/qwik';
import { routeAction$, routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import {
  buildInitialAnswers,
  formatPlacementError,
  loadPlacementPageData,
  submitPlacementAttempt,
  type PlacementAttemptSummary,
} from '~/utils/placement-actions';
import { PlacementTestForm } from '~/components/placement/PlacementTestForm';

export const usePlacementLoader = routeLoader$(async (requestEvent) => {
  return loadPlacementPageData(requestEvent, 'standard');
});

export const useSubmitPlacementTest = routeAction$(async (data, requestEvent) => {
  try {
    return await submitPlacementAttempt(requestEvent, data as Record<string, string | undefined>, {
      source: 'standard',
    });
  } catch (error) {
    return {
      success: false,
      error: formatPlacementError(
        error,
        'Tuvimos un problema al enviar tu prueba. Intenta nuevamente o contáctanos para ayudarte.',
      ),
    };
  }
});

export default component$(() => {
  const loader = usePlacementLoader();
  const submitAction = useSubmitPlacementTest();
  const latestAttempt = useSignal<PlacementAttemptSummary | null>(loader.value.latestAttempt);
  const answers = useStore<Record<string, string>>(buildInitialAnswers(loader.value));
  const actionResult = submitAction.value;

  useVisibleTask$(({ track }) => {
    track(() => submitAction.value);
    const result = submitAction.value;
    if (result?.success) {
      latestAttempt.value = {
        auto_score: result.autoScore ?? 0,
        max_auto_score: result.maxAutoScore ?? 0,
        level: result.level ?? 'Pending review',
        status: 'submitted',
        created_at: new Date().toISOString(),
      };
    }
  });

  return (
    <div class="bg-gray-50 dark:bg-gray-900 py-10">
      <div class="container mx-auto px-4 max-w-6xl">
        <header class="mb-8">
          <p class="text-sm text-teal-600 uppercase tracking-widest font-semibold">
            English Assessment
          </p>
          <h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            EMOA Students&apos; Placement Test
          </h1>
          <p class="text-gray-600 dark:text-gray-300 max-w-3xl">
            Completa la prueba para conocer tu curso Teens recomendado (Teens 1–12).
            Guarda suficiente tiempo (30-40 minutos) y responde sin traductores.
          </p>
        </header>

        <PlacementTestForm
          submitAction={submitAction}
          answers={answers}
          latestAttempt={latestAttempt}
          actionResult={actionResult}
        />
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Placement Test | MOA Academy',
  meta: [
    {
      name: 'description',
      content:
        'Complete the EMOA placement test to evaluate your English skills across grammar, vocabulary, reading, and writing.',
    },
  ],
};
