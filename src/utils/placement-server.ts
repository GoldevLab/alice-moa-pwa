import { server$ } from '@builder.io/qwik-city';
import { Resend } from 'resend';
import { placementSections } from '~/data/placement-test';
import { isAudioDataUrl, transcribePlacementAudio } from '~/utils/placement-audio';
import {
  getNextTeensLevel,
  getTeensLevelByNumber,
  getTeensLevelTableForPrompt,
  inferTeensLevel,
  formatTeensLevel,
  TEENS_LEVELS,
} from '~/data/teens-levels';

export interface PlacementFeedbackResult {
  /** Texto de retroalimentación mostrado al estudiante. */
  feedback: string;
  /** Nivel Teens final (etiqueta completa, p. ej. "Teens 6 (B1)"). */
  level: string;
  /** Número de nivel Teens final (1–12). */
  teens: number;
  /** Transcripciones de las respuestas de audio (q_audio_*). */
  transcripts: Record<string, string>;
}

/**
 * Extrae el nivel Teens recomendado del texto de la IA, lo limita a ±1 nivel
 * respecto al puntaje automático y normaliza la primera línea para que el
 * badge mostrado y el feedback siempre coincidan.
 */
function resolveFinalLevel(
  text: string,
  autoTeens: number,
): { level: string; teens: number; normalizedText: string } {
  let teens = autoTeens;
  const match = text.match(/Teens\s*(\d{1,2})/i);
  if (match) {
    const parsed = Number.parseInt(match[1], 10);
    if (!Number.isNaN(parsed)) {
      const lowerBound = Math.max(autoTeens - 1, 1);
      const upperBound = Math.min(autoTeens + 1, 12);
      teens = Math.min(upperBound, Math.max(lowerBound, parsed));
    }
  }

  const levelObj = getTeensLevelByNumber(teens) ?? TEENS_LEVELS[0];
  const fullLabel = formatTeensLevel(levelObj);

  const firstLineRegex = /^.*Curso recomendado:.*$/im;
  const normalizedText = firstLineRegex.test(text)
    ? text.replace(firstLineRegex, `Curso recomendado: ${fullLabel}`)
    : `Curso recomendado: ${fullLabel}\n${text}`;

  return { level: fullLabel, teens, normalizedText };
}

export const serverGeneratePlacementFeedback = server$(async function (
  this: any,
  {
    answers,
    autoScore,
    maxScore,
    autoLevel,
  }: {
    answers: Record<string, string>;
    autoScore: number;
    maxScore: number;
    autoLevel: string;
  },
): Promise<PlacementFeedbackResult> {
  const autoTeensLevel = inferTeensLevel(autoScore, maxScore);
  const nextLevel = getNextTeensLevel(autoTeensLevel);
  const autoLevelLabel = formatTeensLevel(autoTeensLevel);
  const fallback = `Curso recomendado: ${autoLevelLabel}\nSegún tu puntaje (${autoScore}/${maxScore}), tu curso recomendado es ${autoLevelLabel}. ${
    nextLevel
      ? `Para avanzar, tu meta sería ${nextLevel.fullLabel}.`
      : '¡Estás en el nivel más alto de nuestro programa Teens!'
  } Nuestro equipo revisará tus respuestas abiertas para confirmar tu nivel.`;
  const openAIApiKey = this.env.get('OPENAI_API_KEY') || import.meta.env.OPENAI_API_KEY;

  const transcripts: Record<string, string> = {};
  for (const key of Object.keys(answers)) {
    if (key.startsWith('q_audio_')) {
      const payload = answers[key];
      if (isAudioDataUrl(payload)) {
        const text = await transcribePlacementAudio(payload, openAIApiKey);
        answers[key] = text;
        transcripts[key] = text;
      } else if (!payload) {
        answers[key] = '';
        transcripts[key] = '';
      } else {
        transcripts[key] = payload;
      }
    }
  }

  const fallbackResult: PlacementFeedbackResult = {
    feedback: fallback,
    level: autoLevelLabel,
    teens: autoTeensLevel.teens,
    transcripts,
  };

  if (!openAIApiKey) {
    console.warn('[PLACEMENT] Missing OPENAI_API_KEY, skipping AI feedback.');
    return fallbackResult;
  }

  try {
    const [{ ChatOpenAI }, { SystemMessage, HumanMessage }] = await Promise.all([
      import('@langchain/openai'),
      import('@langchain/core/messages'),
    ]);

    const llm = new ChatOpenAI({
      openAIApiKey,
      model: 'gpt-4o-mini',
      temperature: 0.2,
    });

    const digest = buildAnswerDigest(answers);
    const studentName = answers.q1_name?.trim() || 'el/la estudiante';
    const teensTable = getTeensLevelTableForPrompt();
    const userPrompt = `
Datos del estudiante:
- Nombre: ${studentName}
- Puntaje automático (preguntas cerradas): ${autoScore}/${maxScore}
- Curso Teens sugerido por puntaje: ${autoLevel}

Escala oficial MOA Academy (Teens → CEFR):
${teensTable}

Respuestas (resumidas):
${digest}

Tarea:
1. Confirma o ajusta el curso Teens recomendado (solo puedes elegir entre los 12 niveles de la tabla). Puedes subir o bajar máximo 1 nivel respecto al sugerido por puntaje si las respuestas abiertas, listening, writing o speaking lo justifican claramente.
2. En la PRIMERA línea escribe exactamente: "Curso recomendado: Teens X (CEFR)" usando el nivel final.
3. Explica en 2-3 oraciones en español por qué ese curso es el adecuado.
4. Menciona una fortaleza concreta y un área a mejorar para subir al siguiente Teens.
5. Cierra con un mensaje motivador breve dirigido al estudiante.
6. Si alguna respuesta abierta está claramente en español en lugar de inglés, menciónalo como área crítica a mejorar (las respuestas en español no son válidas en esta prueba).
`;

    const response = await llm.invoke([
      new SystemMessage(
        'Eres un evaluador académico de MOA Academy. Asignas cursos Teens (1–12) según la escala oficial. Sé claro, empático y específico. Siempre indica el curso Teens y su equivalencia CEFR.',
      ),
      new HumanMessage(userPrompt),
    ]);

    const content = Array.isArray(response.content)
      ? response.content.map((part: any) => part.text ?? '').join('\n')
      : (response.content as string);

    const rawText = content?.trim() || fallback;
    const { level, teens, normalizedText } = resolveFinalLevel(
      rawText,
      autoTeensLevel.teens,
    );

    return {
      feedback: normalizedText.slice(0, 1500),
      level,
      teens,
      transcripts,
    };
  } catch (error) {
    console.error('[PLACEMENT] AI feedback error:', error);
    return fallbackResult;
  }
});

export const sendPlacementResultNotification = server$(async function (
  this: any,
  {
    userId,
    userName,
    userEmail,
    autoScore,
    maxScore,
    level,
    feedback,
  }: {
    userId: string;
    userName: string;
    userEmail: string;
    autoScore: number;
    maxScore: number;
    level: string;
    feedback: string;
  },
) {
  const resendApiKey = this.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.warn('[PLACEMENT] Missing RESEND_API_KEY, skipping notification.');
    return;
  }

  const senderEmail = this.env.get('SENDER_EMAIL') || 'onboarding@resend.dev';
  const recipient = 'emoa.recepcion@gmail.com';
  const resend = new Resend(resendApiKey);

  const subject = `Placement Test · ${userName || userEmail} · ${level}`;
  const html = `
    <h2>Nuevo resultado del Placement Test</h2>
    <p><strong>ID de usuario:</strong> ${userId}</p>
    <p><strong>Nombre:</strong> ${userName}</p>
    <p><strong>Email:</strong> ${userEmail}</p>
    <p><strong>Puntaje automático:</strong> ${autoScore}/${maxScore}</p>
    <p><strong>Curso Teens recomendado:</strong> ${level}</p>
    <p><strong>Retroalimentación AI:</strong></p>
    <p>${(feedback || 'No se generó retroalimentación adicional.').replace(/\n/g, '<br/>')}</p>
  `;
  const text = `Nuevo resultado del Placement Test\nID de usuario: ${userId}\nNombre: ${userName}\nEmail: ${userEmail}\nPuntaje automático: ${autoScore}/${maxScore}\nCurso Teens recomendado: ${level}\nRetroalimentación AI: ${feedback || 'No disponible'}`;

  const { error } = await resend.emails.send({
    from: senderEmail,
    to: recipient,
    subject,
    html,
    text,
  });

  if (error) {
    console.error('[PLACEMENT] Failed to send notification:', error);
  }
});

export function buildAnswerDigest(answers: Record<string, string>): string {
  const sections = placementSections.map((section) => {
    const questionLines = section.questions
      .map((question) => {
        const promptSnippet =
          question.prompt.length > 90
            ? `${question.prompt.slice(0, 90).trim()}…`
            : question.prompt.trim();
        const rawAnswer = answers[question.id] ?? '';
        const formattedAnswer =
          question.type === 'audio' && isAudioDataUrl(rawAnswer)
            ? '[Audio grabado — pendiente de transcripción]'
            : truncateAnswer(rawAnswer);
        return `- ${promptSnippet}: ${formattedAnswer || 'Sin respuesta'}`;
      })
      .join('\n');

    return `${section.title}:\n${questionLines}`;
  });

  return sections.join('\n\n');
}

function truncateAnswer(value?: string, maxLength = 180): string {
  if (!value) return '';
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}…` : normalized;
}
