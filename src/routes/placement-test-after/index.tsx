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
import { LatestAttemptBanner } from '~/components/placement/LatestAttemptBanner';
import {
  PLACEMENT_AFTER_EXTRA_FIELDS,
  StudentInfoStep,
  type StudentInfoStore,
} from '~/components/placement/StudentInfoStep';

export const usePlacementLoader = routeLoader$(async (requestEvent) => {
  return loadPlacementPageData(requestEvent, 'placement_after');
});

export const useSubmitPlacementTest = routeAction$(async (data, requestEvent) => {
  try {
    return await submitPlacementAttempt(requestEvent, data as Record<string, string | undefined>, {
      source: 'placement_after',
      extraFields: [...PLACEMENT_AFTER_EXTRA_FIELDS],
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
  const step = useSignal<'info' | 'test'>('info');

  const studentInfo = useStore<StudentInfoStore>({
    rep_name: '',
    rep_phone: '',
    institution: '',
    student_grade: '',
    student_age: '',
    student_sex: '',
    student_name: loader.value.user.name || '',
  });

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

  const handleInfoContinue = $(() => {
    answers['q1_name'] = studentInfo.student_name;
    answers['q3_birthdate'] = `Edad: ${studentInfo.student_age}`;
    step.value = 'test';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const hiddenFields = PLACEMENT_AFTER_EXTRA_FIELDS.reduce(
    (acc, field) => {
      acc[field] = studentInfo[field];
      return acc;
    },
    {} as Record<string, string>,
  );

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
          {step.value === 'info' ? (
            <p class="text-gray-600 dark:text-gray-300 max-w-3xl">
              Por favor completa la siguiente información antes de iniciar la prueba.
            </p>
          ) : (
            <p class="text-gray-600 dark:text-gray-300 max-w-3xl">
              Completa la prueba para conocer tu curso Teens recomendado (Teens 1–12).
              Guarda suficiente tiempo (30-40 minutos) y responde sin traductores.
            </p>
          )}
        </header>

        {step.value === 'info' && !actionResult?.success && (
          <>
            <LatestAttemptBanner attempt={latestAttempt.value} />
            <StudentInfoStep studentInfo={studentInfo} onContinue$={handleInfoContinue} />
          </>
        )}

        {step.value === 'test' && (
          <PlacementTestForm
            submitAction={submitAction}
            answers={answers}
            latestAttempt={latestAttempt}
            actionResult={actionResult}
            hiddenFields={hiddenFields}
            showBackButton={true}
            onBack$={$(() => {
              step.value = 'info';
              window.scrollTo({ top: 0, behavior: 'smooth' });
            })}
          />
        )}
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
