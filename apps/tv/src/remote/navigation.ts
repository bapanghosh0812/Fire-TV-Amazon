import { BackHandler, Platform } from 'react-native';
import { Directions, SpatialNavigation } from 'react-tv-space-navigation';
import { createNavigationContainerRef } from '@react-navigation/native';
import RemoteControl from './RemoteControl';
import { RemoteKey } from './keys';
import type { RootStackParamList } from '../navigation/types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const DIRECTIONS: Partial<Record<RemoteKey, Directions>> = {
  [RemoteKey.Up]: Directions.UP,
  [RemoteKey.Down]: Directions.DOWN,
  [RemoteKey.Left]: Directions.LEFT,
  [RemoteKey.Right]: Directions.RIGHT,
  [RemoteKey.Select]: Directions.ENTER,
};

let configured = false;

export function configureRemote() {
  if (configured) return;
  configured = true;

  SpatialNavigation.configureRemoteControl({
    remoteControlSubscriber: (callback) =>
      RemoteControl.addListener((key) => {
        const direction = DIRECTIONS[key];
        if (direction) callback(direction);
      }),
    remoteControlUnsubscriber: (listener) => RemoteControl.removeListener(listener),
  });

  RemoteControl.addListener((key) => {
    if (key !== RemoteKey.Back) return;
    for (let i = backStack.length - 1; i >= 0; i--) {
      if (backStack[i]()) return;
    }
    if (navigationRef.isReady() && navigationRef.canGoBack()) {
      navigationRef.goBack();
    } else if (Platform.OS === 'android') {
      BackHandler.exitApp();
    }
  });
}

// Screens can intercept Back (e.g. close a dialog before leaving the page).
// Handlers return true when they consumed the press.
type BackFn = () => boolean;
const backStack: BackFn[] = [];

export function pushBackHandler(fn: BackFn) {
  backStack.push(fn);
  return () => {
    const i = backStack.lastIndexOf(fn);
    if (i >= 0) backStack.splice(i, 1);
  };
}
