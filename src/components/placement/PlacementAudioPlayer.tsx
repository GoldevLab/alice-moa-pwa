import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { fetchMediaAsBlobUrl, resolvePublicAssetUrl } from '~/utils/audio-media';

interface PlacementAudioPlayerProps {
  src: string;
  class?: string;
  label?: string;
}

export const PlacementAudioPlayer = component$(
  ({ src, class: className, label }: PlacementAudioPlayerProps) => {
    const playbackSrc = useSignal<string>('');
    const status = useSignal<'loading' | 'ready' | 'error'>('loading');
    const errorMessage = useSignal('');

    useVisibleTask$(({ track, cleanup }) => {
      track(() => src);
      status.value = 'loading';
      errorMessage.value = '';
      playbackSrc.value = '';

      let revokedUrl: string | null = null;
      let cancelled = false;

      const load = async () => {
        try {
          if (src.startsWith('blob:') || src.startsWith('data:')) {
            playbackSrc.value = src;
            status.value = 'ready';
            return;
          }

          const blobUrl = await fetchMediaAsBlobUrl(src);
          if (cancelled) {
            URL.revokeObjectURL(blobUrl);
            return;
          }
          revokedUrl = blobUrl;
          playbackSrc.value = blobUrl;
          status.value = 'ready';
        } catch (error) {
          if (cancelled) return;
          console.error('[PLACEMENT] Audio load error', error);
          playbackSrc.value = resolvePublicAssetUrl(src);
          status.value = 'error';
          errorMessage.value =
            error instanceof Error ? error.message : 'No se pudo cargar el audio';
        }
      };

      void load();

      cleanup(() => {
        cancelled = true;
        if (revokedUrl) URL.revokeObjectURL(revokedUrl);
      });
    });

    return (
      <div class="mb-2">
        {status.value === 'loading' && (
          <p class="text-xs text-gray-500 mb-1" aria-live="polite">
            Cargando audio…
          </p>
        )}

        {status.value === 'error' && (
          <p class="text-xs text-amber-700 dark:text-amber-300 mb-1" aria-live="polite">
            {errorMessage.value}. Intentando reproducción directa…
          </p>
        )}

        {playbackSrc.value && (
          <audio
            controls
            preload="metadata"
            src={playbackSrc.value}
            class={className ?? 'w-full'}
            aria-label={label ?? 'Audio de la pregunta'}
          />
        )}
      </div>
    );
  },
);
