import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { CoverArt } from './CoverArt';

interface ArtProps {
  seed: string;
  uri?: string;
  palette?: string[];
  shape?: 'wide' | 'tall';
  style?: StyleProp<ViewStyle>;
}

/** A real illustration when we have one, generative art until then. */
export function StoryArt({ seed, uri, palette, shape = 'wide', style }: ArtProps) {
  return (
    <View style={[styles.fill, style]}>
      <CoverArt seed={seed} palette={palette} shape={shape} />
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={500} cachePolicy="memory-disk" />
      ) : null}
    </View>
  );
}

interface Layer extends ArtProps {
  key: string;
}

/** Full-bleed art that cross-fades whenever the story changes. */
export function CrossfadeArt(props: ArtProps) {
  const [layers, setLayers] = useState<Layer[]>([{ ...props, key: props.seed + (props.uri ?? '') }]);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const key = props.seed + (props.uri ?? '');
    setLayers((prev) => {
      if (prev[prev.length - 1]?.key === key) return prev;
      return [prev[prev.length - 1], { ...props, key }];
    });
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 650, useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => {
      if (finished) setLayers((prev) => prev.slice(-1));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.seed, props.uri]);

  return (
    <View style={[styles.fill, props.style]}>
      {layers.map((layer, i) => {
        const isTop = i === layers.length - 1 && layers.length > 1;
        return (
          <Animated.View key={layer.key} style={[StyleSheet.absoluteFill, isTop ? { opacity: fade } : null]}>
            <StoryArt seed={layer.seed} uri={layer.uri} palette={layer.palette} shape={layer.shape} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
});
