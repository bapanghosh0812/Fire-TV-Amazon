import { useEffect, useRef } from 'react';
import * as FireTvVoice from '../../modules/fire-tv-voice';

interface Options {
  enabled: boolean;
  title: string;
  page: number;
  total: number;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onRestart: () => void;
}

/**
 * "Alexa, next" / "Alexa, pause" / "Alexa, restart" on Fire TV, through a
 * MediaSession the Fire OS voice service already understands.
 */
export function useAlexaVoice(o: Options) {
  const ref = useRef(o);
  ref.current = o;

  useEffect(() => {
    if (!o.enabled) return;
    FireTvVoice.activate({ title: o.title, subtitle: `Page ${o.page}`, playing: o.playing });
    const off = FireTvVoice.addCommandListener((command, positionMs) => {
      const h = ref.current;
      if (command === 'play') h.onPlay();
      else if (command === 'pause') h.onPause();
      else if (command === 'next') h.onNext();
      else if (command === 'previous') h.onPrevious();
      else if (command === 'seekTo' && positionMs <= 0) h.onRestart();
    });
    return () => {
      off();
      FireTvVoice.deactivate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.enabled, o.title]);

  useEffect(() => {
    if (!o.enabled) return;
    FireTvVoice.update({
      title: o.title,
      subtitle: `Page ${o.page} of ${o.total}`,
      playing: o.playing,
      canNext: true,
      canPrevious: o.page > 1,
    });
  }, [o.enabled, o.title, o.page, o.total, o.playing]);
}

export const alexaAvailable = FireTvVoice.isAvailable;
