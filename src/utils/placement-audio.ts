const AUDIO_DATA_URL_PREFIX = 'data:audio/';

function decodeBase64DataUrl(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function isAudioDataUrl(value: string | undefined): boolean {
  return Boolean(value?.startsWith(AUDIO_DATA_URL_PREFIX));
}

export async function transcribePlacementAudio(
  audioPayload: string,
  openaiApiKey: string,
): Promise<string> {
  if (!openaiApiKey || !audioPayload) return '';

  try {
    let audioBytes: Uint8Array;
    let mimeType = 'audio/webm';

    if (audioPayload.startsWith(AUDIO_DATA_URL_PREFIX)) {
      const header = audioPayload.slice(0, audioPayload.indexOf(','));
      const match = header.match(/^data:([^;]+)/);
      if (match?.[1]) mimeType = match[1];
      audioBytes = decodeBase64DataUrl(audioPayload);
    } else {
      console.warn('[PLACEMENT] Unsupported audio payload format, skipping transcription');
      return '';
    }

    const formData = new FormData();
    const extension = mimeType.includes('mp4') || mimeType.includes('aac')
      ? 'm4a'
      : mimeType.includes('webm')
        ? 'webm'
        : mimeType.includes('ogg')
          ? 'ogg'
          : 'wav';
    formData.append('file', new Blob([audioBytes], { type: mimeType }), `audio.${extension}`);
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    formData.append(
      'prompt',
      'The speaker is answering an English placement test. Transcribe in English.',
    );

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiApiKey}` },
      body: formData,
    });

    if (!resp.ok) {
      console.error('[PLACEMENT] Whisper API error', resp.status, await resp.text());
      return '';
    }

    const result = await resp.json();
    return result.text || '';
  } catch (err) {
    console.error('[PLACEMENT] Whisper transcription error', err);
    return '';
  }
}
