export type LegalDoc = 'terms' | 'privacy' | 'children';

export type RootStackParamList = {
  Language: { fromSettings?: boolean } | undefined;
  Welcome: undefined;
  SignIn: undefined;
  Phone: undefined;
  Otp: { requestId: string; phone: string; full: string; resendIn: number };
  Family: { editing?: boolean } | undefined;
  Terms: { mode?: 'accept' | 'read'; doc?: LegalDoc } | undefined;
  Profiles: undefined;
  Home: undefined;
  Lobby: { starter?: string } | undefined;
  Weaving: { storyId: string };
  Player: { storyId: string };
  Settings: { section?: string } | undefined;
};
