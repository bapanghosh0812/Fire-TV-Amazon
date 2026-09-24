import React, { useEffect } from 'react';
import { LogBox, StatusBar, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Fraunces_500Medium_Italic,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import { Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { configureRemote, navigationRef } from './remote/navigation';
import { HomeScreen } from './screens/HomeScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { WeavingScreen } from './screens/WeavingScreen';
import { PlayerScreen } from './screens/PlayerScreen';
import { ParentsScreen } from './screens/ParentsScreen';
import { Toast } from './components/Toast';
import { colors } from './theme/tokens';
import { isOfflineDemo } from './services/config';
import { useSettings } from './state/settings';
import type { RootStackParamList } from './navigation/types';

configureRemote();
SplashScreen.preventAutoHideAsync().catch(() => {});

if (__DEV__) {
  // Same stack as Amazon's multi-TV sample (legacy architecture on Fire OS), so this notice is expected.
  LogBox.ignoreLogs([/findNodeHandle is deprecated/, /findHostInstance_DEPRECATED/, /Legacy Architecture/]);
}

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.night, card: colors.night },
};

export default function App() {
  const [loaded, error] = useFonts({
    Fraunces_500Medium_Italic,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Nunito_500Medium,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  useEffect(() => {
    useSettings.getState().hydrate();
    if (!isOfflineDemo) {
      import('./services/cloud')
        .then((cloud) => cloud.syncBookshelf())
        .catch((e) => console.warn('bookshelf sync failed', e));
    }
  }, []);

  const hydrated = useSettings((s) => s.hydrated);
  const onboarded = useSettings((s) => s.onboarded);

  if ((!loaded && !error) || !hydrated) return <View style={{ flex: 1, backgroundColor: colors.night }} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <StatusBar hidden />
      <NavigationContainer ref={navigationRef} theme={theme}>
        <Stack.Navigator
          initialRouteName={onboarded ? 'Home' : 'Welcome'}
          screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.night } }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Lobby" component={LobbyScreen} />
          <Stack.Screen name="Weaving" component={WeavingScreen} />
          <Stack.Screen name="Player" component={PlayerScreen} />
          <Stack.Screen name="Parents" component={ParentsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <Toast />
    </View>
  );
}
