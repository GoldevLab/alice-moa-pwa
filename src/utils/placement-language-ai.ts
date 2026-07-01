export interface EnglishValidationItem {
  questionId: string;
  prompt: string;
  answer: string;
}

type AiLanguageLabel = 'english' | 'spanish' | 'other';

interface AiLanguageResult {
  id: string;
  language: AiLanguageLabel;
}

function parseAiLanguageResults(content: unknown): AiLanguageResult[] {
  const text =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content.map((part: { text?: string }) => part.text ?? '').join('\n')
        : '';

  if (!text.trim()) return [];

  const parsed = JSON.parse(text) as { results?: AiLanguageResult[] };
  if (!Array.isArray(parsed.results)) return [];

  return parsed.results.filter(
    (row): row is AiLanguageResult =>
      typeof row?.id === 'string' &&
      (row.language === 'english' || row.language === 'spanish' || row.language === 'other'),
  );
}

/**
 * Usa gpt-4o-mini para detectar respuestas que no están en inglés.
 * Devuelve los questionId rechazados, o null si la IA no está disponible.
 */
export async function findNonEnglishAnswersWithAI(
  items: EnglishValidationItem[],
  openAIApiKey: string,
): Promise<string[] | null> {
  if (!openAIApiKey || items.length === 0) return null;

  try {
    const [{ ChatOpenAI }, { SystemMessage, HumanMessage }] = await Promise.all([
      import('@langchain/openai'),
      import('@langchain/core/messages'),
    ]);

    const llm = new ChatOpenAI({
      openAIApiKey,
      model: 'gpt-4o-mini',
      temperature: 0,
      modelKwargs: {
        response_format: { type: 'json_object' },
      },
    });

    const payload = items.map((item) => ({
      id: item.questionId,
      prompt: item.prompt.length > 140 ? `${item.prompt.slice(0, 140)}…` : item.prompt,
      answer: item.answer.length > 900 ? `${item.answer.slice(0, 900)}…` : item.answer,
    }));

    const response = await llm.invoke([
      new SystemMessage(
        `You review student answers for an English placement test at MOA Academy.
Every answer must be in English. Spanish answers are NOT valid and must be rejected.

For each answer, set "language" to:
- "english": acceptable (includes beginner English with mistakes, short factual answers like "English" or "German", or mostly English with a proper name in another language)
- "spanish": primarily Spanish or clearly not in English because it is written/spoken in Spanish
- "other": clearly in a language other than English (also invalid)

Respond ONLY with JSON: {"results":[{"id":"question_id","language":"english|spanish|other"}]}`,
      ),
      new HumanMessage(JSON.stringify({ answers: payload })),
    ]);

    const results = parseAiLanguageResults(response.content);
    if (results.length === 0) return null;

    const byId = new Map(results.map((row) => [row.id, row.language]));
    const rejected: string[] = [];

    for (const item of items) {
      const language = byId.get(item.questionId);
      if (!language) {
        console.warn('[PLACEMENT] AI language check missing result for', item.questionId);
        continue;
      }
      if (language !== 'english') {
        rejected.push(item.questionId);
      }
    }

    return rejected;
  } catch (error) {
    console.error('[PLACEMENT] AI language validation failed', error);
    return null;
  }
}
