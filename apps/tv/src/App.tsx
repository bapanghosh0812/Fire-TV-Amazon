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
import RemoteControl from './remote/RemoteControl';
import { HomeScreen } from './screens/HomeScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { WeavingScreen } from './screens/WeavingScreen';
import { PlayerScreen } from './screens/PlayerScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LanguageScreen } from './screens/LanguageScreen';
import { SignInScreen } from './screens/SignInScreen';
import { PhoneScreen } from './screens/PhoneScreen';
import { OtpScreen } from './screens/OtpScreen';
import { FamilyScreen } from './screens/FamilyScreen';
import { TermsScreen } from './screens/TermsScreen';
import { ProfilesScreen } from './screens/ProfilesScreen';
import { ExitDialog } from './components/ExitDialog';
import { useAccount } from './services/account';
import { initialRoute } from './navigation/onboarding';
import { Toast } from './components/Toast';
import { GlobalSky } from './components/sky/GlobalSky';
import { playMusic, preloadSounds } from './audio/director';
import { colors } from './theme/tokens';
import { isOfflineDemo } from './services/config';
import { useSettings } from './state/settings';
import type { RootStackParamList } from './navigation/types';

configureRemote();

// A media player released a moment before a timer reads it is harmless; never let it close the app.
const errorUtils = (globalThis as { ErrorUtils?: { getGlobalHandler: () => (e: Error, fatal?: boolean) => void; setGlobalHandler: (h: (e: Error, fatal?: boolean) => void) => void } }).ErrorUtils;
if (errorUtils) {
  const fallback = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, fatal) => {
    if (/already released|shared object/i.test(String(error?.message))) {
      console.warn('Ignored released media object', error?.message);
      return;
    }
    fallback(error, fatal);
  });
}
SplashScreen.preventAutoHideAsync().catch(() => {});

if (__DEV__) {
  // Same stack as Amazon's multi-TV sample (legacy architecture on Fire OS), so this notice is expected.
  LogBox.ignoreLogs([/findNodeHandle is deprecated/, /findHostInstance_DEPRECATED/, /Legacy Architecture/]);
}

const Stack = createNativeStackNavigator<RootStackParamList>();

// Screens are transparent: the cinematic sky lives once, behind the whole app.
const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: 'transparent', card: colors.night },
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
    preloadSounds();
    useSettings.getState().hydrate();
    useAccount.getState().load();
    if (!isOfflineDemo) {
      import('./services/cloud')
        .then((cloud) => cloud.syncBookshelf())
        .catch((e) => console.warn('bookshelf sync failed', e));
    }
  }, []);

  const hydrated = useSettings((s) => s.hydrated);
  const accountReady = useAccount((s) => s.ready);

  // A soft musical bed under the menus (the player swaps in music for each story).
  useEffect(() => {
    if (hydrated && (loaded || error)) playMusic('home');
  }, [hydrated, loaded, error]);

  if ((!loaded && !error) || !hydrated || !accountReady) return <View style={{ flex: 1, backgroundColor: colors.night }} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <StatusBar hidden />
      <GlobalSky />
      <NavigationContainer ref={navigationRef} theme={theme} onReady={() => setTimeout(() => RemoteControl.claimBack(), 300)}>
        <Stack.Navigator
          initialRouteName={initialRoute()}
          screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
        >
          <Stack.Screen name="Language" component={LanguageScreen} />
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="Phone" component={PhoneScreen} />
          <Stack.Screen name="Otp" component={OtpScreen} />
          <Stack.Screen name="Family" component={FamilyScreen} />
          <Stack.Screen name="Terms" component={TermsScreen} />
          <Stack.Screen name="Profiles" component={ProfilesScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Lobby" component={LobbyScreen} />
          <Stack.Screen name="Weaving" component={WeavingScreen} />
          <Stack.Screen name="Player" component={PlayerScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <Toast />
      <ExitDialog />
    </View>
  );
}
