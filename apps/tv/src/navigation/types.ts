export type RootStackParamList = {
  Welcome: undefined;
  Home: undefined;
  Lobby: { starter?: string } | undefined;
  Weaving: { storyId: string };
  Player: { storyId: string };
  Parents: undefined;
};
