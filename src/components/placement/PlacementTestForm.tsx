import { component$, useStore, $, type Signal } from '@builder.io/qwik';
import { Form, type ActionStore } from '@builder.io/qwik-city';
import { placementSections } from '~/data/placement-test';
import { QuestionField } from '~/components/placement/QuestionField';
import { LatestAttemptBanner } from '~/components/placement/LatestAttemptBanner';
import { TeensLevelResult, TeensLevelScale } from '~/components/placement/TeensLevelResult';
import type { RecordingState } from '~/components/placement/AudioRecorder';
import type { PlacementAttemptSummary } from '~/utils/placement-actions';
import {
  formatEnglishRequiredError,
  isValidEnglishAnswer,
  questionRequiresEnglish,
} from '~/utils/placement-english';

interface PlacementActionResult {
  success?: boolean;
  error?: string;
  autoScore?: number;
  maxAutoScore?: number;
  level?: string;
  feedback?: string;
}

interface PlacementTestFormProps {
  submitAction: ActionStore<any, any>;
  answers: Record<string, string>;
  latestAttempt: Signal<PlacementAttemptSummary | null>;
  actionResult?: PlacementActionResult;
  hiddenFields?: Record<string, string>;
  showBackButton?: boolean;
  onBack$?: () => void;
}

export const PlacementTestForm = component$(
  ({
    submitAction,
    answers,
    latestAttempt,
    actionResult,
    hiddenFields,
    showBackButton,
    onBack$,
  }: PlacementTestFormProps) => {
    const recordingState = useStore<RecordingState>({ busyCount: 0 });

    const handleSubmit = $((event: SubmitEvent) => {
      if (recordingState.busyCount > 0) {
        event.preventDefault();
        alert('Espera a que termine de procesarse la grabación de audio antes de enviar.');
        return;
      }

      const nonEnglishPrompts: string[] = [];
      for (const section of placementSections) {
        for (const question of section.questions) {
          if (!questionRequiresEnglish(question) || question.type === 'audio') continue;
          const value = answers[question.id]?.trim();
          if (!value) continue;
          if (!isValidEnglishAnswer(value)) {
            nonEnglishPrompts.push(question.prompt);
          }
        }
      }

      if (nonEnglishPrompts.length > 0) {
        event.preventDefault();
        alert(formatEnglishRequiredError(nonEnglishPrompts));
      }
    });

    return (
      <>
        <LatestAttemptBanner attempt={latestAttempt.value} />

        {actionResult?.error && (
          <div class="mb-6 rounded-xl border border-red-200 bg-red-50/80 text-red-700 p-4">
            {actionResult.error}
          </div>
        )}

        {actionResult?.success ? (
          <TeensLevelResult
            level={actionResult.level ?? 'Pendiente'}
            autoScore={actionResult.autoScore ?? 0}
            maxAutoScore={actionResult.maxAutoScore ?? 0}
            feedback={actionResult.feedback}
          />
        ) : (
          <Form
            action={submitAction}
            class="space-y-10"
            onSubmit$={handleSubmit}
          >
            <TeensLevelScale />

            {hiddenFields &&
              Object.entries(hiddenFields).map(([field, value]) => (
                <input key={field} type="hidden" name={field} value={value} />
              ))}

            {placementSections.map((section) => (
              <section
                key={section.id}
                class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 shadow-sm"
              >
                <div class="border-b border-gray-100 dark:border-gray-700 px-6 py-4">
                  <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                    {section.title}
                  </h2>
                  {section.description && (
                    <p class="text-gray-500 dark:text-gray-400 mt-1 whitespace-pre-line">
                      {section.description}
                    </p>
                  )}
                </div>
                <div class="px-6 py-6 space-y-6">
                  {section.questions.map((question) => (
                    <QuestionField
                      key={question.id}
                      question={question}
                      answers={answers}
                      recordingState={recordingState}
                    />
                  ))}
                </div>
              </section>
            ))}

            <div class="flex justify-end gap-4">
              {showBackButton && onBack$ && (
                <button
                  type="button"
                  onClick$={onBack$}
                  class="px-6 py-3 rounded-xl text-gray-600 bg-gray-200 hover:bg-gray-300 font-semibold"
                >
                  Atrás
                </button>
              )}
              <button
                type="submit"
                disabled={submitAction.isRunning || recordingState.busyCount > 0}
                class={`inline-flex items-center px-6 py-3 rounded-xl text-white font-semibold shadow-lg transition ${
                  submitAction.isRunning || recordingState.busyCount > 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-700 focus:ring-4 focus:ring-teal-300'
                }`}
              >
                {submitAction.isRunning
                  ? 'Enviando...'
                  : recordingState.busyCount > 0
                    ? 'Procesando audio…'
                    : 'Enviar prueba'}
              </button>
            </div>
          </Form>
        )}
      </>
    );
  },
);
