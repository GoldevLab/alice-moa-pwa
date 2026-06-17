import { component$ } from '@builder.io/qwik';
import type { PlacementQuestion } from '~/data/placement-test';
import { AudioRecorder, type RecordingState } from './AudioRecorder';
import { PlacementAudioPlayer } from './PlacementAudioPlayer';
import { questionIllustrations } from './question-illustrations';

interface QuestionFieldProps {
  question: PlacementQuestion;
  answers: Record<string, string>;
  recordingState: RecordingState;
}

export const QuestionField = component$(({ question, answers, recordingState }: QuestionFieldProps) => {
  const illustration = questionIllustrations[question.id];

  return (
    <div>
      <label
        class="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2"
        for={question.id}
      >
        {question.prompt}{' '}
        {question.required && <span class="text-red-500">*</span>}
      </label>

      {illustration && (
        <figure class="mb-3 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-900">
          <img
            src={illustration.src}
            alt={illustration.alt}
            class="w-full max-h-64 object-contain md:object-cover"
            loading="lazy"
          />
        </figure>
      )}

      {renderInput(question, answers, recordingState)}

      {question.helperText && (
        <p class="text-xs text-gray-500 mt-2">{question.helperText}</p>
      )}
    </div>
  );
});

function renderInput(
  question: PlacementQuestion,
  answers: Record<string, string>,
  recordingState: RecordingState,
) {
  switch (question.type) {
    case 'textarea': {
      const longTextIds = [
        'q20_vacation',
        'q45_language_article',
        'q46_language_article',
        'q50_perfect_city',
      ];
      const rows = longTextIds.includes(question.id) ? 8 : 4;
      return (
        <>
          {question.audioSrc && (
            <PlacementAudioPlayer
              src={question.audioSrc}
              label="Audio de comprensión auditiva"
            />
          )}
          <textarea
            id={question.id}
            name={question.id}
            required={question.required}
            rows={rows}
            class="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            value={answers[question.id] ?? ''}
            onInput$={(event) => {
              answers[question.id] = (event.target as HTMLTextAreaElement).value;
            }}
            placeholder={question.placeholder}
            preventdefault:paste
          />
        </>
      );
    }
    case 'audio':
      return (
        <AudioRecorder
          questionId={question.id}
          answers={answers}
          recordingState={recordingState}
        />
      );
    case 'radio':
      return (
        <div class="space-y-2">
          {question.options?.map((option, idx) => (
            <label
              key={option.value}
              class="flex items-center space-x-2 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <input
                type="radio"
                class="text-teal-600 focus:ring-teal-500"
                name={question.id}
                value={option.value}
                checked={answers[question.id] === option.value}
                required={question.required && idx === 0}
                onChange$={(event) => {
                  answers[question.id] = (event.target as HTMLInputElement).value;
                }}
              />
              <span class="text-sm text-gray-800 dark:text-gray-200">{option.label}</span>
            </label>
          ))}
        </div>
      );
    case 'select':
      return (
        <select
          id={question.id}
          name={question.id}
          required={question.required}
          value={answers[question.id] ?? ''}
          onChange$={(event) => {
            answers[question.id] = (event.target as HTMLSelectElement).value;
          }}
          class="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="">{question.placeholder ?? 'Select an option'}</option>
          {question.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    default: {
      const inputType = question.id === 'q1_email' ? 'email' : 'text';
      return (
        <input
          id={question.id}
          type={inputType}
          name={question.id}
          required={question.required}
          value={answers[question.id] ?? ''}
          onInput$={(event) => {
            answers[question.id] = (event.target as HTMLInputElement).value;
          }}
          placeholder={question.placeholder}
          class="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          preventdefault:paste={question.id !== 'q1_email'}
        />
      );
    }
  }
}
