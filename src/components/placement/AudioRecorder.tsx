import { component$, useSignal, useStore, $ } from '@builder.io/qwik';
import { LuMic, LuRotateCcw } from '@qwikest/icons/lucide';
import { PlacementAudioPlayer } from './PlacementAudioPlayer';
import {
  blobToDataUrl,
  getSupportedRecordingMimeType,
  recordingFileExtension,
} from '~/utils/audio-media';

export interface RecordingState {
  busyCount: number;
}

interface AudioRecorderProps {
  questionId: string;
  answers: Record<string, string>;
  recordingState: RecordingState;
}

export const AudioRecorder = component$(
  ({ questionId, answers, recordingState }: AudioRecorderProps) => {
    const recording = useSignal(false);
    const processing = useSignal(false);
    const previewSrc = useSignal<string | null>(null);
    const mimeType = useSignal('audio/webm');
    const mediaRecorderRef = useStore<{ current: MediaRecorder | null }>({ current: null });
    const chunksRef = useStore<{ current: Blob[] }>({ current: [] });
    const streamRef = useStore<{ current: MediaStream | null }>({ current: null });
    const previewBlobUrl = useStore<{ current: string | null }>({ current: null });

    const beginProcessing = $(() => {
      processing.value = true;
      recordingState.busyCount += 1;
    });

    const endProcessing = $(() => {
      processing.value = false;
      recordingState.busyCount = Math.max(0, recordingState.busyCount - 1);
    });

    const revokePreviewUrl = $(() => {
      if (previewBlobUrl.current) {
        URL.revokeObjectURL(previewBlobUrl.current);
        previewBlobUrl.current = null;
      }
    });

    const startRecording = $(async () => {
      try {
        await revokePreviewUrl();
        previewSrc.value = null;
        answers[questionId] = '';

        const supportedMime = getSupportedRecordingMimeType();
        if (!supportedMime) {
          alert(
            'Tu navegador no soporta grabación de audio. Prueba con Chrome o Safari actualizado.',
          );
          return;
        }
        mimeType.value = supportedMime;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;

        const mediaRecorder = new window.MediaRecorder(stream, { mimeType: supportedMime });
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;

          await beginProcessing();
          try {
            const blob = new Blob(chunksRef.current, { type: supportedMime });
            await revokePreviewUrl();
            const url = URL.createObjectURL(blob);
            previewBlobUrl.current = url;
            previewSrc.value = url;
            answers[questionId] = await blobToDataUrl(blob);
          } catch (err) {
            console.error('[PLACEMENT] Could not encode recorded audio', err);
            answers[questionId] = '';
            alert('Grabamos el audio pero no pudimos guardarlo. Intenta grabar de nuevo.');
          } finally {
            await endProcessing();
          }
        };

        mediaRecorder.start(250);
        recording.value = true;
      } catch (err) {
        console.error('[PLACEMENT] Microphone access error', err);
        alert('No pudimos acceder al micrófono. Verifica los permisos del navegador.');
      }
    });

    const stopRecording = $(() => {
      recording.value = false;
      mediaRecorderRef.current?.stop();
    });

    const resetRecording = $(async () => {
      if (recording.value) {
        mediaRecorderRef.current?.stop();
        recording.value = false;
      }
      await revokePreviewUrl();
      previewSrc.value = null;
      answers[questionId] = '';
    });

    return (
      <div class="mb-2 space-y-2">
        <input type="hidden" name={questionId} value={answers[questionId] ?? ''} />

        <div class="flex flex-wrap gap-2">
          {!recording.value && !processing.value ? (
            <button
              type="button"
              class="px-4 py-2 rounded bg-teal-600 text-white flex items-center gap-2 hover:bg-teal-700 transition"
              onClick$={startRecording}
            >
              <LuMic class="w-5 h-5" aria-hidden="true" />
              Grabar respuesta
            </button>
          ) : recording.value ? (
            <button
              type="button"
              class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition"
              onClick$={stopRecording}
            >
              Detener grabación
            </button>
          ) : (
            <button
              type="button"
              disabled
              class="px-4 py-2 rounded bg-gray-400 text-white cursor-not-allowed"
            >
              Procesando grabación…
            </button>
          )}

          {previewSrc.value && !recording.value && !processing.value && (
            <button
              type="button"
              class="px-4 py-2 rounded bg-gray-200 text-gray-800 flex items-center gap-2 hover:bg-gray-300 transition"
              onClick$={resetRecording}
            >
              <LuRotateCcw class="w-4 h-4" aria-hidden="true" />
              Volver a grabar
            </button>
          )}
        </div>

        {previewSrc.value && !recording.value && !processing.value && (
          <PlacementAudioPlayer src={previewSrc.value} label="Tu grabación" />
        )}

        <p class="text-xs text-gray-500">
          Formato: {recordingFileExtension(mimeType.value).toUpperCase()} · compatible con móvil
        </p>
      </div>
    );
  },
);
