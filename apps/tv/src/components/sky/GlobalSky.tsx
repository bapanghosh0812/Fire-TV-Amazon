import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { SkyPhase } from './phases';
import { useSkyPhase, useSkyState, type Scrim } from './skyState';
import { VectorSky } from './VectorSky';
import { useSettings } from '../../state/settings';

const native = Platform.OS !== 'web';

// Seamless 24-second loops rendered from Storyloom's own sky shader (tools/sky). Bundled, so they
// play instantly and offline; the hardware video decoder keeps the TV cool while they run.
const VIDEOS: Record<SkyPhase, number> = {
  sunrise: require('../../../assets/sky/sunrise.mp4'),
  day: require('../../../assets/sky/day.mp4'),
  sunset: require('../../../assets/sky/sunset.mp4'),
  night: require('../../../assets/sky/night.mp4'),
};
const POSTERS: Record<SkyPhase, number> = {
  sunrise: require('../../../assets/sky/sunrise.jpg'),
  day: require('../../../assets/sky/day.jpg'),
  sunset: require('../../../assets/sky/sunset.jpg'),
  night: require('../../../assets/sky/night.jpg'),
};

// Eye comfort: bright skies are gently dimmed so a dark room never feels glaring.
const COMFORT: Record<'auto' | 'off' | 'strong', Record<SkyPhase, number>> = {
  off: { sunrise: 0, day: 0, sunset: 0, night: 0 },
  auto: { sunrise: 0.12, day: 0.2, sunset: 0.12, night: 0.04 },
  strong: { sunrise: 0.3, day: 0.38, sunset: 0.3, night: 0.18 },
};

const MotionSky = memo(function MotionSky({ phase, playing }: { phase: SkyPhase; playing: boolean }) {
  const player = useVideoPlayer(VIDEOS[phase], (p) => {
    p.loop = true;
    p.muted = true;
    try {
      p.audioMixingMode = 'mixWithOthers';
    } catch {}
  });
  const [ready, setReady] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') setReady(true);
    });
    if (player.status === 'readyToPlay') setReady(true);
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    try {
      if (playing) player.play();
      else player.pause();
    } catch {}
  }, [playing, player]);

  useEffect(() => {
    if (ready) Animated.timing(fade, { toValue: 1, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: native }).start();
  }, [ready, fade]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Image source={POSTERS[phase]} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          allowsPictureInPicture={false}
          surfaceType="textureView"
        />
      </Animated.View>
    </View>
  );
});

function SkyLayer({ phase, playing }: { phase: SkyPhase; playing: boolean }) {
  const style = useSettings((s) => s.skyStyle);
  const quality = useSettings((s) => s.quality);
  const reduceMotion = useSettings((s) => s.reduceMotion);
  if (style === 'illustrated') return <VectorSky phase={phase} />;
  if (style === 'calm' || reduceMotion || quality === 'saver') {
    return <Image source={POSTERS[phase]} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />;
  }
  return <MotionSky phase={phase} playing={playing} />;
}

/** One layer that fades in over the previous sky, then tells the parent it's done. */
function Crossfade({ children, onDone, instant }: { children: React.ReactNode; onDone: () => void; instant: boolean }) {
  const v = useRef(new Animated.Value(instant ? 1 : 0)).current;
  useEffect(() => {
    if (instant) return onDone();
    Animated.timing(v, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.quad), useNativeDriver: native }).start(() => onDone());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Animated.View style={[StyleSheet.absoluteFill, { opacity: v }]}>{children}</Animated.View>;
}

const SCRIMS: Scrim[] = ['left', 'center', 'top', 'bottom'];

function ScrimStack({ active }: { active: Scrim }) {
  const values = useRef(Object.fromEntries(SCRIMS.map((k) => [k, new Animated.Value(k === active ? 1 : 0)]))).current as Record<string, Animated.Value>;
  useEffect(() => {
    Animated.parallel(
      SCRIMS.map((k) => Animated.timing(values[k], { toValue: k === active ? 1 : 0, duration: 450, useNativeDriver: native })),
    ).start();
  }, [active, values]);
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: values.left }]} pointerEvents="none">
        <LinearGradient
          colors={['rgba(4,6,24,0.86)', 'rgba(4,6,24,0.55)', 'rgba(4,6,24,0)']}
          locations={[0, 0.42, 0.74]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient colors={['rgba(4,6,24,0)', 'rgba(4,6,24,0.8)']} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: values.center, backgroundColor: 'rgba(4,6,24,0.46)' }]} pointerEvents="none" />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: values.top }]} pointerEvents="none">
        <LinearGradient colors={['rgba(4,6,24,0.78)', 'rgba(4,6,24,0.35)', 'rgba(4,6,24,0.6)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: values.bottom }]} pointerEvents="none">
        <LinearGradient colors={['rgba(4,6,24,0)', 'rgba(4,6,24,0.9)']} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </>
  );
}

/**
 * The cinematic sky that lives behind every screen: sunrise, day, sunset and night
 * follow the real sun for the family's time zone and cross-fade slowly as it moves.
 * Screens choose how much to dim it with `useSky('left' | 'center' | ...)`.
 */
export function GlobalSky() {
  const phase = useSkyPhase();
  const scrim = useSkyState((s) => s.scrim);
  const hidden = useSkyState((s) => s.hidden);
  const comfort = useSettings((s) => s.comfortDim);
  const [layers, setLayers] = useState([{ phase, id: 0 }]);

  useEffect(() => {
    setLayers((l) => (l[l.length - 1].phase === phase ? l : [...l.slice(-1), { phase, id: l[l.length - 1].id + 1 }]));
  }, [phase]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {layers.map((layer, i) => (
        <Crossfade key={layer.id} instant={i === 0} onDone={() => setLayers((l) => l.filter((x) => x.id >= layer.id))}>
          <SkyLayer phase={layer.phase} playing={!hidden} />
        </Crossfade>
      ))}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(3,4,16,${COMFORT[comfort][phase]})` }]} />
      {/* A soft cinematic shade at the top keeps the clock and profile crisp in daylight. */}
      <LinearGradient colors={['rgba(4,6,24,0.5)', 'rgba(4,6,24,0)']} locations={[0, 0.22]} style={StyleSheet.absoluteFill} />
      <ScrimStack active={scrim} />
    </View>
  );
}
