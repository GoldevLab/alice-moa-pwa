import type { PlacementQuestion } from '~/data/placement-test';

export const ENGLISH_ANSWER_HINT =
  'Answer in English only. Spanish answers will not be accepted. / Responde solo en inglés.';

const SPANISH_CHARS = /[áéíóúñ¿¡]/i;

const SPANISH_STOPWORDS =
  /\b(el|la|los|las|un|una|unos|unas|de|del|al|que|por|para|con|sin|sobre|entre|desde|hasta|pero|porque|cuando|donde|cómo|como|muy|también|tambien|está|esta|están|estan|estoy|estamos|soy|somos|es|son|fui|fue|fuimos|había|habia|tengo|tiene|tenemos|puedo|puede|podemos|quiero|quiere|quieren|me|te|se|nos|les|mi|tu|su|mis|tus|sus|este|esta|estos|estas|eso|esa|aquí|aqui|allí|alli|ahora|siempre|nunca|más|mas|menos|bueno|buena|cosa|cosas|gente|persona|día|dia|año|ano|vez|algo|nada|todo|todos|mucho|mucha|poco|bien|mal|hola|gracias|inglés|ingles|alemán|aleman|francés|frances|español|espanol|favorito|favorita|libro|ciudad|vacaciones|viaje|familia|trabajo|escuela|estudio|aprendo|aprendí|aprendi|hablo|habla|gusta|gustan|creo|pienso|voy|vamos|iba|sería|seria|habría|habria|además|ademas|aunque|entonces|mientras|después|despues|antes|quizás|quizas|tal vez|según|segun|durante|después|despues|también|tambien|por qué|porque|qué|que)\b/gi;

/** Preguntas de datos personales: no exigen inglés. */
export function questionRequiresEnglish(question: PlacementQuestion): boolean {
  if (question.type === 'radio' || question.type === 'select') return false;
  if (question.section === 'Personal Information') return false;
  return question.type === 'audio' || question.type === 'textarea' || question.type === 'text';
}

/**
 * Heurística local de respaldo cuando la validación con IA no está disponible.
 */
export function isLikelySpanish(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return false;

  const spanishCharHits = (normalized.match(SPANISH_CHARS) || []).length;
  if (spanishCharHits >= 1) return true;

  const words = normalized
    .toLowerCase()
    .split(/[^a-záéíóúñü]+/i)
    .filter((word) => word.length > 1);
  if (words.length === 0) return false;

  const stopwordHits = (normalized.match(SPANISH_STOPWORDS) || []).length;
  if (stopwordHits >= 2) return true;
  if (words.length <= 4 && stopwordHits >= 1) return true;
  if (stopwordHits / words.length >= 0.2) return true;

  return false;
}

export function isValidEnglishAnswer(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return true;
  return !isLikelySpanish(normalized);
}

export function formatEnglishRequiredError(prompts: string[]): string {
  const preview = prompts.slice(0, 4).join('; ');
  const suffix = prompts.length > 4 ? ` (+${prompts.length - 4} más)` : '';
  return `Esta prueba evalúa tu nivel de inglés. Las siguientes respuestas deben estar en inglés: ${preview}${suffix}.`;
}
