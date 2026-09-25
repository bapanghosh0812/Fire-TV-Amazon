import { TERMS_VERSION, useSettings } from '../state/settings';
import { useAccount } from '../services/account';
import { isOfflineDemo } from '../services/config';
import type { RootStackParamList } from './types';

type Route = keyof RootStackParamList;

/**
 * First-run journey: language → welcome → sign in (or explore the demo) → family → terms → who's watching.
 * Each screen asks "what's next?" so steps that are already done are skipped.
 */
export function nextOnboardingStep(): Route {
  const s = useSettings.getState();
  const a = useAccount.getState();
  if (!s.languageChosen) return 'Language';
  if (!a.user && !a.demo && !isOfflineDemo) return 'Welcome';
  if (a.user?.needsProfile) return 'Family';
  if (s.termsVersion !== TERMS_VERSION && (a.user ? a.user.needsTerms : true)) return 'Terms';
  if (!s.onboarded) useSettings.getState().update({ onboarded: true });
  return s.profiles.length > 1 ? 'Profiles' : 'Home';
}

/** Where the app opens on launch. */
export function initialRoute(): Route {
  const s = useSettings.getState();
  if (!s.onboarded) return s.languageChosen ? nextOnboardingStep() : 'Language';
  return s.profiles.length > 1 ? 'Profiles' : 'Home';
}

/** Moves to the next unfinished step; landing on Home clears the onboarding history. */
export function continueOnboarding() {
  // Imported lazily to avoid a cycle with the remote/navigation module.
  const { navigationRef } = require('../remote/navigation') as typeof import('../remote/navigation');
  const step = nextOnboardingStep();
  if (!navigationRef.isReady()) return;
  if (step === 'Home' || step === 'Profiles') navigationRef.reset({ index: 0, routes: [{ name: step }] });
  else navigationRef.navigate(step as never);
}
