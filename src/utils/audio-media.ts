const MEDIA_PATH_PATTERN = /\.(?:mp3|mp4|webm|m4a|aac|wav|ogg)(?:\?|$)/i;

/** MIME types supported for recording, prioritizing iOS Safari (audio/mp4). */
const RECORDING_MIME_CANDIDATES = [
  'audio/mp4',
  'audio/aac',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
] as const;

export function isMediaAssetPath(pathname: string): boolean {
  return MEDIA_PATH_PATTERN.test(pathname);
}

export function resolvePublicAssetUrl(src: string): string {
  if (!src || src.startsWith('blob:') || src.startsWith('data:') || /^https?:\/\//i.test(src)) {
    return src;
  }
  const normalized = src.startsWith('/') ? src : `/${src}`;
  if (typeof window === 'undefined') return normalized;
  return new URL(normalized, window.location.origin).href;
}

export function getSupportedRecordingMimeType(): string | undefined {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return undefined;
  }
  for (const type of RECORDING_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return undefined;
}

export function recordingFileExtension(mimeType: string): string {
  if (mimeType.includes('mp4') || mimeType.includes('aac')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
}

export function isPlayableAudioSource(value?: string | null): boolean {
  if (!value) return false;
  return (
    value.startsWith('blob:') ||
    value.startsWith('data:audio/') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    /\.(?:mp3|mp4|webm|m4a|aac|wav|ogg)(?:\?|$)/i.test(value)
  );
}

/**
 * Fetches media as a blob URL so iOS Safari can play it without HTTP range issues
 * from service worker caches. Falls back to Cache Storage when offline (PWA).
 */
export async function fetchMediaAsBlobUrl(src: string): Promise<string> {
  const resolved = resolvePublicAssetUrl(src);

  let response: Response | undefined;
  try {
    response = await fetch(resolved, { cache: 'no-store', credentials: 'same-origin' });
  } catch {
    response = undefined;
  }

  if (!response?.ok && typeof caches !== 'undefined') {
    const cached = await caches.match(resolved);
    if (cached) response = cached;
  }

  if (!response?.ok) {
    throw new Error(`No se pudo cargar el audio (${response?.status ?? 'sin conexión'})`);
  }

  const blob = await response.blob();
  if (!blob.size) {
    throw new Error('El archivo de audio está vacío');
  }
  return URL.createObjectURL(blob);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el audio'));
    reader.readAsDataURL(blob);
  });
}
